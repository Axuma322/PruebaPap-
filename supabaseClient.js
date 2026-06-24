(function () {
  "use strict";

  var SUPABASE_URL = "https://cbzckqmihqvinrmpoheq.supabase.co";
  // Clave publica para navegador. No usar nunca service_role en frontend.
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Mfb49L8ROtrNtOw7TFd0pw__ne-kUjR";
  // Supabase Auth requiere email; el codigo de participante se convierte en un email tecnico interno.
  var PARTICIPANT_EMAIL_DOMAIN = "@participantes.example.com";

  function normalizeParticipantCode(rawCode) {
    return String(rawCode || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
  }

  function participantCodeToEmail(rawCode) {
    var normalizedCode = normalizeParticipantCode(rawCode);

    if (!normalizedCode) {
      return "";
    }

    return normalizedCode + PARTICIPANT_EMAIL_DOMAIN;
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error("No se pudo cargar Supabase JS desde el CDN.");
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  window.supabaseAuthHelpers = {
    normalizeParticipantCode: normalizeParticipantCode,
    participantCodeToEmail: participantCodeToEmail
  };
})();
