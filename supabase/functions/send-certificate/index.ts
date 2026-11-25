import { createClient } from "npm:@supabase/supabase-js@2";
import "../_shared/certificate-template.js";

type Certificate = {
  id: string; user_id: string; username: string; full_name: string; national_id: string;
  email: string; completion_date: string; certificate_code: string; status: string;
  updated_at: string; email_first_attempt_at: string | null; email_payload: Record<string, unknown> | null;
};
const template = (globalThis as unknown as {
  PLANNECertificateTemplate: { render: (request: Certificate, config: Record<string, string>) => string };
}).PLANNECertificateTemplate;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
  const cors: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
  if (allowed.includes(origin)) cors["Access-Control-Allow-Origin"] = origin;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (origin && !allowed.includes(origin)) return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("CERTIFICATE_FROM");
  if (!url || !serviceKey || !resendKey || !from) return json({ error: "Email delivery is not configured" }, 503);

  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Authentication required" }, 401);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Invalid session" }, 401);

  try {
    const body = await req.json();
    if (typeof body.request_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.request_id)) {
      return json({ error: "Invalid request id" }, 400);
    }
    const { data, error } = await admin.from("certificate_requests").select("*")
      .eq("id", body.request_id).eq("user_id", auth.user.id).maybeSingle();
    if (error) return json({ error: "Unable to read request" }, 503);
    if (!data || data.username.toLowerCase() === "demo") return json({ error: "Request not found" }, 404);
    const certificate = data as Certificate;
    // Client-written passed flags are not issuance authority. Fail closed if
    // independent institutional verification is absent, unavailable or revoked.
    const { data: verified, error: verificationError } = await admin.rpc("certificate_completion_is_verified", { p_user_id: auth.user.id });
    if (verificationError) return json({ error: "Completion verification unavailable" }, 503);
    if (verified !== true) return json({ error: "Completion awaiting institutional verification" }, 403);
    if (certificate.status === "sent") return json({ status: "sent" });
    // Preserve the same provider payload/key across retries, including concurrent calls.
    // Resend retains idempotency keys for 24 hours. Never retry blindly beyond that window.
    if (certificate.email_first_attempt_at && Date.now() - Date.parse(certificate.email_first_attempt_at) > 23 * 3600_000) {
      return json({ error: "Delivery requires administrator reconciliation" }, 409);
    }
    if (certificate.status === "sending" && Date.now() - Date.parse(certificate.updated_at) < 120_000) {
      return json({ status: "sending" }, 202);
    }
    const config = {
      institution: Deno.env.get("CERTIFICATE_INSTITUTION") || "PLANNE · Neuroliderazgo educativo",
      certificateText: Deno.env.get("CERTIFICATE_TEXT") || "ha completado el recorrido formativo de la Plataforma Digital de Neuroliderazgo Educativo, que integra diagnóstico, neuroeducación, neuroliderazgo y mejora institucional.",
      signatureLabel: Deno.env.get("CERTIFICATE_SIGNATURE") || "Coordinación del programa PLANNE",
      programName: "PLANNE", certificateTitle: "Certificado de finalización",
    };
    const payload = certificate.email_payload || {
      from, to: [certificate.email], subject: "Su certificado de finalización · PLANNE",
      html: template.render(certificate, config),
    };
    const firstAttempt = certificate.email_first_attempt_at || new Date().toISOString();
    const { data: claimed, error: claimError } = await admin.from("certificate_requests")
      .update({ status: "sending", email_first_attempt_at: firstAttempt, email_payload: payload })
      .eq("id", certificate.id).eq("updated_at", certificate.updated_at).select("id").maybeSingle();
    if (claimError) return json({ error: "Unable to reserve delivery" }, 503);
    if (!claimed) return json({ status: "sending" }, 202);

    try {
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `planne-certificate/${certificate.id}` },
        body: JSON.stringify(payload),
      });
      if (!sent.ok) throw new Error("Provider rejected delivery");
      const delivery = await sent.json();
      if (!delivery.id) throw new Error("Missing provider receipt");
      const { error: updateError } = await admin.from("certificate_requests")
        .update({ status: "sent", certificate_sent_at: new Date().toISOString(), email_delivery_id: delivery.id })
        .eq("id", certificate.id);
      if (updateError) return json({ error: "Receipt reconciliation pending" }, 503);
      return json({ status: "sent" });
    } catch {
      await admin.from("certificate_requests").update({ status: "failed" }).eq("id", certificate.id);
      return json({ error: "Email pending; retry later" }, 502);
    }
  } catch {
    return json({ error: "Invalid request or temporarily unavailable service" }, 400);
  }
});
