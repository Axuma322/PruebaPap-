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
  // Match the column-level grant; never fetch provider payloads.
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
    if (request.status === "sent") { return "Su certificado fue enviado al correo registrado."; }
    if (request.status === "sending") { return "Su solicitud está registrada y el envío está en proceso."; }
    return "Tu solicitud de certificado ya fue registrada. El certificado se enviará al correo indicado cuando se complete el envío.";
  }
  function paint() {
    var visible = context && context.user && context.ready && (context.demo || eligible(context));
    byId("certificateSummary").hidden = !visible;
    byId("certificateSummaryTitle").textContent = context && context.demo ? "Certificado · demostración" : "Ha completado PLANNE";
    byId("certificateSummaryStatus").textContent = loading ? "Consultando su solicitud…" : statusText();
    byId("certificateOpenButton").textContent = request ? "Consultar constancia" : (context && context.demo ? "Simular finalización y probar constancia" : "Solicitar constancia");
    byId("certificateForm").hidden = Boolean(request);
    byId("certificateSubmitButton").disabled = saving || loading;
    byId("certificateRegistered").hidden = !request;
    byId("certificateDemoNotice").hidden = !(context && context.demo);
    byId("certificateRequestStatus").textContent = statusText();
    byId("certificateCode").textContent = request ? "Código: " + request.certificate_code : "";
    byId("certificatePrintButton").hidden = !request;
    byId("certificateEmailButton").hidden = !request || request.demo || request.status === "sent";
    byId("certificateEmailButton").disabled = emailing;
    byId("certificateRefreshButton").hidden = !request || request.demo;
    byId("certificateRefreshButton").disabled = loading;
    byId("certificateDemoResetButton").hidden = !(context && context.demo);
  }
  function open() {
    if (!context || (!context.demo && !eligible(context))) { return; }
    pendingOpen = true;
    if (loading) { return; }
    if (!loaded && !context.demo) { load(); return; }
    pendingOpen = false;
    byId("certificateClosingMessage").textContent = config.closingMessage;
    byId("certificateTitle").textContent = context.demo ? "Felicitaciones por completar PLANNE · demostración" : "Felicitaciones por completar PLANNE";
    paint();
    if (!byId("certificateDialog").open) { byId("certificateDialog").showModal(); }
  }
  function reset() {
    generation += 1;
    context = null; request = null; loaded = false; loading = false;
    saving = false; emailing = false; autoShown = false; pendingOpen = false;
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
  async function sendEmail() {
    if (!request || request.demo || emailing || !context || context.demo || request.status === "sent") { return; }
    var token = generation;
    var requestId = request.id;
    emailing = true; paint();
    message("Su solicitud está guardada. Preparando el envío por correo…");
    try {
      var result = await window.supabaseClient.functions.invoke(config.emailFunction, { body: { request_id: requestId } });
      if (token !== generation) { return; }
      if (!result.error && result.data && result.data.status === "sending") {
        request.status = "sending";
        message("El envío está en proceso. Puede actualizar el estado en unos momentos.");
        return;
      }
      if (result.error || !result.data || result.data.status !== "sent") { throw new Error("Envío pendiente"); }
      request.status = "sent";
      message("Solicitud registrada. El certificado fue enviado al correo indicado.");
    } catch (error) {
      if (token !== generation) { return; }
      message("Su solicitud quedó registrada, pero no se pudo confirmar el envío. Puede consultar su constancia y reintentar el correo más tarde.");
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
    form.elements.email.setCustomValidity(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value) ? "" : "Introduzca un correo electrónico válido.");
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
      form.reset();
      message(statusText());
      if (!context.demo) { sendEmail(); }
    } catch (error) {
      if (token !== generation) { return; }
      message("No se pudo registrar la solicitud. Sus datos siguen en el formulario; revise la conexión e intente de nuevo.");
    } finally {
      if (token === generation) { saving = false; paint(); }
    }
  }
  function printCertificate() {
    if (!request) { return; }
    var popup = window.open("", "_blank");
    if (!popup) { message("Permita abrir una ventana para ver e imprimir su certificado."); return; }
    popup.opener = null;
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
    byId("certificateDemoResetButton").addEventListener("click", function () {
      if (!context || !context.demo) { return; }
      request = null;
      byId("certificateForm").reset();
      message("");
      open();
    });
    byId("certificatePrintButton").addEventListener("click", printCertificate);
  });
})();
