(function () {
  "use strict";

  var context = null;
  var request = null;
  var loaded = false;
  var loading = false;
  var saving = false;
  var emailing = false;
  var generation = 0;
  var autoShown = false;
  var pendingOpen = false;
  var verified = false;
  // Match the column-level grant; never fetch provider payloads or review notes.
  var requestColumns = "id,user_id,username,full_name,national_id,email,completion_date,certificate_code,status,certificate_sent_at,created_at,updated_at";
  var config = window.APP_DATA.certificate;

  function byId(id) { return document.getElementById(id); }
  function eligible(value) {
    return Boolean(value && value.user && value.ready && !value.demo
      && ["initial", "final"].every(function (type) {
        return value.diagnosticAttempts.some(function (attempt) { return attempt.attemptType === type; });
      }) && ["A", "B", "C", "D"].every(function (id) { return value.completedStages.includes(id); }));
  }
  function message(text) { byId("certificateMessage").textContent = text; }
  function statusText() {
    if (!request) { return "Complete sus datos para solicitar el certificado de finalización."; }
    if (request.demo) { return "Solicitud simulada. No se guardó ni se envió ningún correo."; }
    if (!verified) { return "Tu solicitud de certificado ya fue registrada. Está pendiente de verificación institucional antes de emitir el certificado."; }
    if (request.status === "sent") { return "Su certificado fue enviado al correo registrado."; }
    if (request.status === "sending") { return "Su solicitud está registrada y el envío está en proceso."; }
    return "Tu solicitud de certificado ya fue registrada. El certificado se enviará al correo indicado cuando se complete el envío.";
  }
  function paint() {
    var visible = context && context.user && context.ready && (context.demo || eligible(context));
    byId("certificateSummary").hidden = !visible;
    byId("certificateSummaryTitle").textContent = context && context.demo ? "Certificado · demostración" : "Ha completado PLANNE";
    byId("certificateSummaryStatus").textContent = loading ? "Consultando su solicitud…" : statusText();
    byId("certificateOpenButton").textContent = request ? "Consultar certificado" : (context && context.demo ? "Ver cierre de demostración" : "Solicitar certificado");
    byId("certificateForm").hidden = Boolean(request);
    byId("certificateSubmitButton").disabled = saving || loading;
    byId("certificateRegistered").hidden = !request;
    byId("certificateDemoNotice").hidden = !(context && context.demo);
    byId("certificateRequestStatus").textContent = statusText();
    byId("certificateCode").textContent = request ? "Código: " + request.certificate_code : "";
    byId("certificatePrintButton").hidden = !request || (!request.demo && !verified);
    byId("certificateEmailButton").hidden = !request || request.demo || !verified || request.status === "sent";
    byId("certificateEmailButton").disabled = emailing;
    byId("certificateRefreshButton").hidden = !request || request.demo;
    byId("certificateRefreshButton").disabled = loading;
  }
  function open() {
    if (!context || (!context.demo && !eligible(context))) { return; }
    pendingOpen = true;
    if (loading) { return; }
    if (!loaded && !context.demo) { load(); return; }
    pendingOpen = false;
    byId("certificateClosingMessage").textContent = config.closingMessage;
    byId("certificateTitle").textContent = context.demo ? "Cierre de PLANNE · demostración" : "Felicitaciones por completar PLANNE";
    paint();
    if (!byId("certificateDialog").open) { byId("certificateDialog").showModal(); }
  }
  function reset() {
    generation += 1;
    context = null; request = null; loaded = false; loading = false;
    saving = false; emailing = false; autoShown = false; pendingOpen = false;
    verified = false;
    if (byId("certificateDialog")) {
      byId("certificateDialog").close();
      byId("certificateForm").reset();
      message(""); paint();
    }
  }
  async function load() {
    if (!context || context.demo || loading) { return; }
    var token = generation;
    loading = true; paint();
    try {
      var response = await window.supabaseClient.from("certificate_requests").select(requestColumns)
        .eq("user_id", context.user.id).maybeSingle();
      if (token !== generation) { return; }
      if (response.error) { throw response.error; }
      request = response.data;
      verified = await verify(token);
      if (token !== generation) { return; }
      loaded = true;
    } catch (error) {
      if (token !== generation) { return; }
      // A missing optional backend must not interrupt login or learning modules.
      loaded = true;
      message("No se pudo consultar su solicitud. Puede intentar registrarla nuevamente; no se crearán solicitudes duplicadas.");
    } finally {
      if (token === generation) {
        loading = false; paint();
        if (pendingOpen || (!request && !autoShown)) { autoShown = true; open(); }
      }
    }
  }
  function update(value) {
    var identity = value && value.user ? value.user.id + ":" + Boolean(value.demo) : "";
    var previous = context && context.user ? context.user.id + ":" + Boolean(context.demo) : "";
    if (identity !== previous) { reset(); }
    context = value;
    paint();
    if (eligible(context) && !loaded && !loading) { load(); }
  }
  async function verify(token) {
    try {
      var result = await window.supabaseClient.rpc("certificate_verification_status");
      return token === generation && !result.error && result.data === true;
    } catch (error) {
      return false;
    }
  }
  async function sendEmail() {
    if (!request || request.demo || emailing || !context || context.demo || request.status === "sent") { return; }
    var token = generation;
    var requestId = request.id;
    emailing = true; paint();
    message("Su solicitud está guardada. Preparando el envío por correo…");
    try {
      verified = await verify(token);
      if (token !== generation) { return; }
      if (!verified) { message(statusText()); return; }
      var result = await window.supabaseClient.functions.invoke(config.emailFunction, { body: { request_id: requestId } });
      if (token !== generation) { return; }
      if (result.error || !result.data || result.data.status !== "sent") { throw new Error("Envío pendiente"); }
      request.status = "sent";
      message("Solicitud registrada. El certificado fue enviado al correo indicado.");
    } catch (error) {
      if (token !== generation) { return; }
      verified = false;
      message("Su solicitud quedó registrada. Actualice el estado para comprobar la verificación institucional y la disponibilidad del envío.");
    } finally {
      if (token === generation) { emailing = false; paint(); }
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (saving || request || !context || (!context.demo && !eligible(context))) { return; }
    var form = event.currentTarget;
    var fields = ["full_name", "national_id", "email"];
    fields.forEach(function (name) { form.elements[name].value = form.elements[name].value.trim(); });
    if (!form.reportValidity()) { message("Complete su nombre, cédula y un correo electrónico válido."); return; }
    var values = {};
    fields.forEach(function (name) { values[name] = form.elements[name].value; });
    var token = generation;
    saving = true; paint(); message("Registrando solicitud…");
    try {
      if (context.demo) {
        request = Object.assign(values, { demo: true, status: "demo", completion_date: new Date().toISOString(), certificate_code: "DEMO-SIN-VALIDEZ" });
      } else {
        var result = await window.supabaseClient.from("certificate_requests").insert(Object.assign(values, { user_id: context.user.id })).select(requestColumns).single();
        if (token !== generation) { return; }
        if (result.error && result.error.code === "23505") {
          var existing = await window.supabaseClient.from("certificate_requests").select(requestColumns).eq("user_id", context.user.id).single();
          if (token !== generation) { return; }
          if (existing.error || !existing.data) { throw new Error("No se pudo recuperar la solicitud"); }
          request = existing.data;
        } else {
          if (result.error || !result.data) { throw new Error("No se pudo registrar la solicitud"); }
          request = result.data;
        }
      }
      loaded = true;
      if (!context.demo) {
        verified = await verify(token);
        if (token !== generation) { return; }
      }
      form.reset();
      message(statusText());
      if (!context.demo && verified) { sendEmail(); }
    } catch (error) {
      if (token !== generation) { return; }
      message("No se pudo registrar la solicitud. Sus datos siguen en el formulario; revise la conexión e intente de nuevo.");
    } finally {
      if (token === generation) { saving = false; paint(); }
    }
  }
  async function printCertificate() {
    if (!request) { return; }
    var popup = window.open("", "_blank");
    if (!popup) { message("Permita abrir una ventana para ver e imprimir su certificado."); return; }
    popup.opener = null;
    if (!request.demo) {
      var token = generation;
      verified = await verify(token);
      if (token !== generation || !verified || !request) {
        popup.close();
        if (token === generation) { message(statusText()); paint(); }
        return;
      }
    }
    popup.document.open();
    popup.document.write(window.PLANNECertificateTemplate.render(request, config));
    popup.document.close();
  }
  window.PLANNECertificates = { update: update, reset: reset, isEligible: eligible };
  document.addEventListener("DOMContentLoaded", function () {
    byId("certificateOpenButton").addEventListener("click", open);
    byId("certificateCloseButton").addEventListener("click", function () { byId("certificateDialog").close(); });
    byId("certificateForm").addEventListener("submit", submit);
    byId("certificateEmailButton").addEventListener("click", sendEmail);
    byId("certificateRefreshButton").addEventListener("click", load);
    byId("certificatePrintButton").addEventListener("click", printCertificate);
  });
})();
