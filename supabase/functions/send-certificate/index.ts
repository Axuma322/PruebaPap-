import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import "../_shared/certificate-pdf.js";

type Certificate = {
  id: string; user_id: string; username: string; full_name: string; national_id: string;
  email: string; completion_date: string; certificate_code: string; status: string;
  updated_at: string; email_first_attempt_at: string | null;
  email_payload: Record<string, unknown> | null; certificate_pdf_base64: string | null;
};
const pdf = (globalThis as unknown as {
  PLANNECertificatePDF: {
    render: (request: Certificate, config: Record<string,string>, library: unknown) => Promise<string>;
    emailMessage: (request: Certificate) => string;
  };
}).PLANNECertificatePDF;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
  const cors: Record<string,string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
  if (allowed.includes(origin)) cors["Access-Control-Allow-Origin"] = origin;
  const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {
    status, headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"},
  });
  if (origin && !allowed.includes(origin)) return json({error:"Origin not allowed"},403);
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
  if (req.method !== "POST") return json({error:"Method not allowed"},405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({error:"Certificate service unavailable"},503);
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({error:"Authentication required"},401);
  const admin = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

  try {
    const {data:auth,error:authError} = await admin.auth.getUser(token);
    if (authError || !auth.user) return json({error:"Invalid session"},401);
    const body = await req.json();
    const action = body.action || "send";
    if (!["send","download"].includes(action) || typeof body.request_id!=="string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.request_id)) {
      return json({error:"Invalid request"},400);
    }
    const {data,error} = await admin.from("certificate_requests").select("*")
      .eq("id",body.request_id).eq("user_id",auth.user.id).maybeSingle();
    if (error) return json({error:"Unable to read request"},503);
    if (!data || data.username.toLowerCase()==="demo") return json({error:"Request not found"},404);
    let certificate = data as Certificate;
    const {data:eligible,error:eligibilityError} = await admin.rpc("certificate_can_issue",{p_user_id:auth.user.id});
    if (eligibilityError) return json({error:"Completion check unavailable"},503);
    if (eligible!==true) return json({error:"Complete initial/final DNA and stages A-D"},403);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("CERTIFICATE_FROM");
    if (action==="send" && (!resendKey || !from)) return json({error:"Email delivery is not configured"},503);

    if (!certificate.certificate_pdf_base64) {
      const config = {
        institution:Deno.env.get("CERTIFICATE_INSTITUTION") || "Plataforma Digital de Neuroliderazgo Educativo",
        certificateText:Deno.env.get("CERTIFICATE_TEXT") || "ha completado el recorrido educativo participativo de PLANNE, que integra diagnóstico, neuroeducación, neuroliderazgo y mejora institucional.",
        signatureLabel:Deno.env.get("CERTIFICATE_SIGNATURE") || "Firma o responsable · pendiente de definir",
        certificateTitle:"Constancia de finalización", programName:"PLANNE",
      };
      let content: string;
      try { content=await pdf.render(certificate,config,{PDFDocument,StandardFonts,rgb}); }
      catch { return json({error:"Unable to generate certificate PDF; check text and supported characters"},422); }
      // Freeze exactly one PDF. A concurrent download/send must use the winner.
      const stored=await admin.from("certificate_requests").update({certificate_pdf_base64:content})
        .eq("id",certificate.id).is("certificate_pdf_base64",null).select("*").maybeSingle();
      if (stored.error) return json({error:"Unable to save certificate PDF"},503);
      if (stored.data) certificate=stored.data as Certificate;
      else {
        const current=await admin.from("certificate_requests").select("*")
          .eq("id",certificate.id).eq("user_id",auth.user.id).maybeSingle();
        if (current.error || !current.data?.certificate_pdf_base64) return json({error:"PDF generation in progress; retry"},503);
        certificate=current.data as Certificate;
      }
    }
    if (action==="download") return json({
      filename:"Certificado_PLANNE.pdf",content_type:"application/pdf",content_base64:certificate.certificate_pdf_base64,
    });
    if (certificate.status==="sent") return json({status:"sent"});
    if (certificate.email_first_attempt_at && Date.now()-Date.parse(certificate.email_first_attempt_at)>23*3600_000) {
      return json({error:"Delivery status reconciliation required before retry"},409);
    }
    if (certificate.status==="sending" && Date.now()-Date.parse(certificate.updated_at)<120_000) {
      return json({status:"sending"},202);
    }
    const payload=certificate.email_payload || {
      from,to:[certificate.email],subject:"Su constancia de finalización · PLANNE",
      html:pdf.emailMessage(certificate),
      attachments:[{filename:"Certificado_PLANNE.pdf",content:certificate.certificate_pdf_base64,content_type:"application/pdf"}],
    };
    const {data:claimed,error:claimError}=await admin.from("certificate_requests").update({
      status:"sending",email_first_attempt_at:certificate.email_first_attempt_at || new Date().toISOString(),email_payload:payload,
    }).eq("id",certificate.id).eq("updated_at",certificate.updated_at).select("id").maybeSingle();
    if (claimError) return json({error:"Unable to reserve delivery"},503);
    if (!claimed) return json({status:"sending"},202);
    try {
      const sent=await fetch("https://api.resend.com/emails",{
        method:"POST",signal:AbortSignal.timeout(20_000),
        headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json","Idempotency-Key":`planne-certificate/${certificate.id}`},
        body:JSON.stringify(payload),
      });
      if (!sent.ok) throw new Error("Provider rejected delivery");
      const delivery=await sent.json();
      if (!delivery.id) throw new Error("Missing provider receipt");
      const {error:updateError}=await admin.from("certificate_requests").update({
        status:"sent",certificate_sent_at:new Date().toISOString(),email_delivery_id:delivery.id,
      }).eq("id",certificate.id);
      if (updateError) return json({error:"Receipt reconciliation pending"},503);
      return json({status:"sent"});
    } catch {
      await admin.from("certificate_requests").update({status:"failed"}).eq("id",certificate.id);
      return json({error:"Email pending; retry later"},502);
    }
  } catch {
    return json({error:"Invalid request or temporarily unavailable service"},400);
  }
});
