(function () {
  "use strict";

  var PREFIX = "tesis-neuroeducacion:";
  var RESET_KEYS = [
    // Claves heredadas de la pantalla de acceso demo anterior.
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
    clearLegacyAccessData: function () {
      remove("demo-session");
      return remove("demo-participant");
    },

    getDiagnosisResult: function () {
      return read("diagnosis-result", null);
    },

    saveDiagnosisResult: function (result) {
      // Temporal: luego migrar estos resultados a la tabla diagnostic_answers.
      return write("diagnosis-result", result);
    },

    getLearningProgress: function () {
      var savedProgress = read("learning-progress", null);
      return savedProgress || getDefaultProgress();
    },

    saveLearningProgress: function (progress) {
      // Temporal: esta vista usa progreso local; luego sincronizar con la tabla progress.
      return write("learning-progress", progress);
    },

    getForumComments: function () {
      return read("forum-comments", []);
    },

    saveForumComments: function (comments) {
      return write("forum-comments", comments);
    },

    addForumComment: function (comment) {
      // Temporal: luego reemplazar por inserciones reales en la tabla forum_posts.
      var comments = this.getForumComments();
      comments.unshift(comment);
      this.saveForumComments(comments);
      return comments;
    },

    // Herramienta temporal de desarrollo: limpia localStorage del prototipo.
    clearTestData: function () {
      try {
        if (localStorageAvailable) {
          window.localStorage.clear();
        }
      } catch (error) {
        RESET_KEYS.forEach(remove);
      }

      memoryStore = {};
    }
  };
})();
