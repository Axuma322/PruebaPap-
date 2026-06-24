(function () {
  "use strict";

  var PREFIX = "tesis-neuroeducacion:";
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

  function getDefaultProgress() {
    return {
      unlockedStages: ["A"],
      completedStages: [],
      scores: {}
    };
  }

  window.appStorage = {
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
    }
  };
})();
