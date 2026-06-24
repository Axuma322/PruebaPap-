(function () {
  "use strict";

  var PREFIX = "neuroaprendizaje:";
  var USER_DATA_KEYS = [
    "diagnostic",
    "progress",
    "evaluations"
  ];
  var currentStorageUser = "";
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

  function normalizeStorageUser(usernameOrUserId) {
    var normalized = String(usernameOrUserId || "")
      .trim()
      .toLowerCase();

    if (normalized.normalize) {
      normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    return normalized.replace(/[^a-z0-9_-]/g, "");
  }

  window.appStorage = {
    setCurrentStorageUser: function (usernameOrUserId) {
      currentStorageUser = normalizeStorageUser(usernameOrUserId);
      return currentStorageUser;
    },

    getCurrentStorageUser: function () {
      return currentStorageUser;
    },

    getUserScopedKey: function (key) {
      if (!currentStorageUser) {
        return "";
      }

      return currentStorageUser + ":" + key;
    },

    saveUserData: function (key, value) {
      var scopedKey = this.getUserScopedKey(key);

      if (!scopedKey) {
        return false;
      }

      return write(scopedKey, value);
    },

    loadUserData: function (key, fallback) {
      var scopedKey = this.getUserScopedKey(key);

      if (!scopedKey) {
        return fallback;
      }

      return read(scopedKey, fallback);
    },

    removeUserData: function (key) {
      var scopedKey = this.getUserScopedKey(key);

      if (!scopedKey) {
        return false;
      }

      return remove(scopedKey);
    },

    clearCurrentUserData: function () {
      var self = this;

      USER_DATA_KEYS.forEach(function (key) {
        self.removeUserData(key);
      });
    },

    getDiagnosisResult: function () {
      return this.loadUserData("diagnostic", null);
    },

    saveDiagnosisResult: function (result) {
      // Temporal: luego migrar estos resultados a la tabla diagnostic_answers.
      return this.saveUserData("diagnostic", result);
    },

    getLearningProgress: function () {
      var savedProgress = this.loadUserData("progress", null);
      return savedProgress || getDefaultProgress();
    },

    saveLearningProgress: function (progress) {
      // Temporal: esta vista usa progreso local; luego sincronizar con la tabla progress.
      return this.saveUserData("progress", progress);
    },

    getEvaluationAttempts: function () {
      return this.loadUserData("evaluations", []);
    },

    addEvaluationAttempt: function (attempt) {
      var attempts = this.getEvaluationAttempts();
      attempts.unshift(attempt);
      this.saveUserData("evaluations", attempts);
      return attempts;
    },

    getForumComments: function () {
      return read("forum-comments", []);
    },

    saveForumComments: function (comments) {
      return write("forum-comments", comments);
    },

    addForumComment: function (comment) {
      // Foro temporal global: luego reemplazar por inserciones reales en la tabla forum_posts.
      var comments = this.getForumComments();
      comments.unshift(comment);
      this.saveForumComments(comments);
      return comments;
    },

    // Herramienta temporal de desarrollo: limpia solo datos locales del usuario activo.
    clearTestData: function () {
      this.clearCurrentUserData();
    }
  };
})();
