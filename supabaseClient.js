(function () {
  "use strict";

  var SUPABASE_URL = "https://cbzckqmihqvinrmpoheq.supabase.co";
  // Clave publica para navegador.
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Mfb49L8ROtrNtOw7TFd0pw__ne-kUjR";
  // Supabase Auth requiere email; el usuario visible se convierte en un email tecnico interno.
  var USER_EMAIL_DOMAIN = "@usuarios.example.com";
  var MIN_USERNAME_LENGTH = 3;

  function normalizeUsername(rawUsername) {
    var normalized = String(rawUsername || "")
      .trim()
      .toLowerCase();

    if (normalized.normalize) {
      normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    return normalized
      .replace(/[^a-z0-9_-]/g, "");
  }

  function usernameToEmail(rawUsername) {
    var normalizedUsername = normalizeUsername(rawUsername);

    if (!normalizedUsername || normalizedUsername.length < MIN_USERNAME_LENGTH) {
      return "";
    }

    return normalizedUsername + USER_EMAIL_DOMAIN;
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
    minimumUsernameLength: MIN_USERNAME_LENGTH,
    normalizeUsername: normalizeUsername,
    usernameToEmail: usernameToEmail
  };
})();
