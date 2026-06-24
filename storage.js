(function () {
  "use strict";

  var PREFIX = "tesis-neuroeducacion:";
  var RESET_KEYS = [
    "demo-session",
    "demo-participant",
    "diagnosis-result",
    "learning-progress",
    "forum-comments"
  ];
  var memoryStore = {};

  function hasLocalStorage() {
    try {
      var testKey = PREFIX + "test";
      window.localStorage.setItem(testKey, "ok");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  var localStorageAvailable = hasLocalStorage();

  function read(key, fallback) {
    var storageKey = PREFIX + key;

    try {
      var rawValue = localStorageAvailable
        ? window.localStorage.getItem(storageKey)
        : memoryStore[storageKey];

      if (!rawValue) {
        return fallback;
      }

      return JSON.parse(rawValue);
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    var storageKey = PREFIX + key;
    var serializedValue = JSON.stringify(value);

    try {
      if (localStorageAvailable) {
        window.localStorage.setItem(storageKey, serializedValue);
      } else {
        memoryStore[storageKey] = serializedValue;
      }

      return true;
    } catch (error) {
      memoryStore[storageKey] = serializedValue;
      localStorageAvailable = false;
      return false;
    }
  }

  function remove(key) {
    var storageKey = PREFIX + key;

    try {
      if (localStorageAvailable) {
        window.localStorage.removeItem(storageKey);
      }

      delete memoryStore[storageKey];
      return true;
    } catch (error) {
      delete memoryStore[storageKey];
      return false;
    }
  }

  function getDefaultProgress() {
    return {
      unlockedStages: ["A"],
      completedStages: [],
      scores: {}
    };
  }

  window.appStorage = {
    getDemoSession: function () {
      return read("demo-session", null);
    },

    getDemoParticipant: function () {
      return read("demo-participant", null);
    },

    getActiveDemoUser: function () {
      var session = this.getDemoSession();
      var participant = this.getDemoParticipant();

      if (!session || !session.active) {
        return null;
      }

      return {
        participantCode: session.participantCode,
        visibleName: participant && participant.participantCode === session.participantCode
          ? participant.visibleName
          : "",
        accessedAt: session.accessedAt
      };
    },

    // Demo temporal: luego se reemplazará por Supabase Auth.
    // Nunca guarda contraseña ni valida contraseña contra localStorage.
    createDemoAccount: function (participant) {
      var now = new Date().toISOString();

      write("demo-participant", {
        participantCode: participant.participantCode,
        visibleName: participant.visibleName
      });

      return write("demo-session", {
        active: true,
        participantCode: participant.participantCode,
        accessedAt: now
      });
    },

    // Demo temporal: permite entrada visual usando solo el código de participante.
    // Supabase Auth reemplazará esta lógica más adelante.
    startDemoSession: function (participantCode) {
      return write("demo-session", {
        active: true,
        participantCode: participantCode,
        accessedAt: new Date().toISOString()
      });
    },

    clearDemoSession: function () {
      return remove("demo-session");
    },

    getDiagnosisResult: function () {
      return read("diagnosis-result", null);
    },

    saveDiagnosisResult: function (result) {
      return write("diagnosis-result", result);
    },

    getLearningProgress: function () {
      var savedProgress = read("learning-progress", null);
      return savedProgress || getDefaultProgress();
    },

    saveLearningProgress: function (progress) {
      return write("learning-progress", progress);
    },

    getForumComments: function () {
      return read("forum-comments", []);
    },

    saveForumComments: function (comments) {
      return write("forum-comments", comments);
    },

    addForumComment: function (comment) {
      var comments = this.getForumComments();
      comments.unshift(comment);
      this.saveForumComments(comments);
      return comments;
    },

    // Herramienta temporal de desarrollo: limpia sesión demo y datos de prueba locales.
    clearTestData: function () {
      RESET_KEYS.forEach(remove);
    }
  };
})();
