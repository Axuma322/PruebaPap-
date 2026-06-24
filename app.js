(function () {
  "use strict";

  var data = window.APP_DATA;
  var storage = window.appStorage;
  var latestStageFeedback = null;
  var stageModalEscapeReady = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function empty(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (text) {
      element.textContent = text;
    }

    return element;
  }

  function formatDate(isoDate) {
    try {
      return new Date(isoDate).toLocaleString("es-CR", {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch (error) {
      return isoDate;
    }
  }

  function renderHero() {
    byId("heroKicker").textContent = data.hero.kicker;
    byId("heroTitle").textContent = data.hero.title;
    byId("heroSubtitle").textContent = data.hero.subtitle;
    byId("brainImage").src = data.settings.brainImage;
  }

  function renderInfoCards() {
    var container = byId("infoCards");
    empty(container);

    data.infoBoxes.forEach(function (box, index) {
      var card = createElement("article", "info-card");
      var button = createElement("button", "info-toggle");
      var textWrapper = document.createElement("div");
      var title = createElement("strong", "", box.title);
      var summary = createElement("span", "", box.summary);
      var symbol = createElement("span", "toggle-symbol", "+");
      var panel = createElement("div", "info-panel", box.content);
      var panelId = "info-panel-" + index;

      button.type = "button";
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", panelId);
      panel.id = panelId;
      panel.hidden = true;

      textWrapper.appendChild(title);
      textWrapper.appendChild(summary);
      button.appendChild(textWrapper);
      button.appendChild(symbol);
      card.appendChild(button);
      card.appendChild(panel);
      container.appendChild(card);

      button.addEventListener("click", function () {
        var isOpen = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isOpen));
        panel.hidden = isOpen;
        symbol.textContent = isOpen ? "+" : "-";
      });
    });
  }

  function getDiagnosisLabel(score) {
    if (score >= 85) {
      return data.diagnosis.resultLabels.high;
    }

    if (score >= 60) {
      return data.diagnosis.resultLabels.medium;
    }

    return data.diagnosis.resultLabels.low;
  }

  function renderDiagnosisResult(result) {
    var box = byId("diagnosisSavedResult");

    if (!result) {
      box.hidden = true;
      empty(box);
      return;
    }

    empty(box);
    box.hidden = false;
    box.appendChild(createElement("strong", "", "Resultado temporal: " + result.score + "%"));
    box.appendChild(createElement("span", "", result.label + " - " + formatDate(result.createdAt)));
  }

  function renderDiagnosisQuestions() {
    var list = byId("diagnosisQuestionList");
    empty(list);

    data.diagnosis.questions.forEach(function (question) {
      list.appendChild(createElement("li", "", question.text));
    });
  }

  function renderDiagnosisForm() {
    var form = byId("diagnosisForm");
    empty(form);

    data.diagnosis.questions.forEach(function (question) {
      var fieldset = createElement("fieldset", "form-question");
      var legend = createElement("legend", "", question.text);
      var options = createElement("div", "option-stack");

      fieldset.appendChild(legend);

      question.options.forEach(function (option) {
        var label = document.createElement("label");
        var input = document.createElement("input");
        var text = document.createElement("span");

        input.type = "radio";
        input.name = question.id;
        input.value = String(option.value);
        input.required = true;
        text.textContent = option.label;

        label.appendChild(input);
        label.appendChild(text);
        options.appendChild(label);
      });

      fieldset.appendChild(options);
      form.appendChild(fieldset);
    });

    form.appendChild(createElement("button", "primary-button", "Guardar resultado temporal"));
    form.hidden = false;
  }

  function handleDiagnosisSubmit(event) {
    event.preventDefault();

    var formData = new FormData(event.currentTarget);
    var answers = [];
    var totalScore = 0;

    data.diagnosis.questions.forEach(function (question) {
      var selectedValue = Number(formData.get(question.id));
      var selectedOption = question.options.find(function (option) {
        return option.value === selectedValue;
      });

      totalScore += selectedValue;
      answers.push({
        questionId: question.id,
        question: question.text,
        answer: selectedOption ? selectedOption.label : "",
        value: selectedValue
      });
    });

    var score = Math.round(totalScore / data.diagnosis.questions.length);
    var result = {
      score: score,
      label: getDiagnosisLabel(score),
      answers: answers,
      createdAt: new Date().toISOString()
    };

    storage.saveDiagnosisResult(result);
    renderDiagnosisResult(result);
    event.currentTarget.hidden = true;
    byId("startDiagnosisButton").textContent = "Repetir diagnóstico";
  }

  function renderDiagnosis() {
    byId("diagnosisTitle").textContent = data.diagnosis.title;
    byId("diagnosisDescription").textContent = data.diagnosis.description;
    renderDiagnosisQuestions();
    renderDiagnosisResult(storage.getDiagnosisResult());

    byId("startDiagnosisButton").addEventListener("click", renderDiagnosisForm);
    byId("diagnosisForm").addEventListener("submit", handleDiagnosisSubmit);
  }

  function normalizeProgress(progress) {
    var normalized = progress || {};

    normalized.unlockedStages = Array.isArray(normalized.unlockedStages)
      ? normalized.unlockedStages
      : ["A"];
    normalized.completedStages = Array.isArray(normalized.completedStages)
      ? normalized.completedStages
      : [];
    normalized.scores = normalized.scores || {};

    if (!normalized.unlockedStages.includes("A")) {
      normalized.unlockedStages.push("A");
    }

    return normalized;
  }

  function getNextStageId(stageId) {
    var stages = data.learningPath.stages;
    var currentIndex = stages.findIndex(function (stage) {
      return stage.id === stageId;
    });
    var nextStage = stages[currentIndex + 1];

    return nextStage ? nextStage.id : null;
  }

  function addUnique(list, value) {
    if (!list.includes(value)) {
      list.push(value);
    }
  }

  function buildFeedback(stageId) {
    if (!latestStageFeedback || latestStageFeedback.stageId !== stageId) {
      return null;
    }

    var box = createElement("div", "feedback-box");
    box.appendChild(createElement("strong", "", latestStageFeedback.title));
    box.appendChild(createElement("span", "", latestStageFeedback.message));
    return box;
  }

  function getStageStatus(stage, progress) {
    if (!progress.unlockedStages.includes(stage.id)) {
      return "Bloqueada";
    }

    if (progress.completedStages.includes(stage.id)) {
      return "Completada";
    }

    return "Disponible";
  }

  function getStageFullDescription(stage) {
    return stage.fullDescription || stage.description;
  }

  function ensureStageModal() {
    var backdrop = byId("stageModalBackdrop");

    if (!backdrop) {
      backdrop = createElement("div", "stage-modal-backdrop");
      backdrop.id = "stageModalBackdrop";
      backdrop.hidden = true;
      backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop) {
          closeStageModal();
        }
      });
      document.body.appendChild(backdrop);
    }

    if (!stageModalEscapeReady) {
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !backdrop.hidden) {
          closeStageModal();
        }
      });
      stageModalEscapeReady = true;
    }

    return backdrop;
  }

  function closeStageModal() {
    var backdrop = byId("stageModalBackdrop");

    if (!backdrop) {
      return;
    }

    backdrop.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function buildStageMaterials(stage) {
    var list = createElement("ul", "modal-material-list");

    stage.materials.forEach(function (material) {
      list.appendChild(createElement("li", "", material));
    });

    return list;
  }

  function buildModalEvaluationForm(stage) {
    var form = createElement("form", "evaluation-form");

    stage.evaluation.questions.forEach(function (question, questionIndex) {
      var fieldset = createElement("fieldset", "form-question");
      var legend = createElement("legend", "", question.text);
      var options = createElement("div", "option-stack");

      fieldset.appendChild(legend);

      question.options.forEach(function (option, optionIndex) {
        var label = document.createElement("label");
        var input = document.createElement("input");
        var text = document.createElement("span");

        input.type = "radio";
        input.name = stage.id + "-question-" + questionIndex;
        input.value = String(optionIndex);
        input.required = true;
        text.textContent = option.label;

        label.appendChild(input);
        label.appendChild(text);
        options.appendChild(label);
      });

      fieldset.appendChild(options);
      form.appendChild(fieldset);
    });

    form.appendChild(createElement("button", "primary-button", "Enviar mini evaluación"));
    form.addEventListener("submit", function (event) {
      handleEvaluationSubmit(event, stage);
    });

    return form;
  }

  function openStageModal(stage) {
    var backdrop = ensureStageModal();
    var progress = normalizeProgress(storage.getLearningProgress());
    var modal = createElement("section", "stage-modal");
    var header = createElement("header", "stage-modal-header");
    var headingGroup = document.createElement("div");
    var label = createElement("p", "module-number", "Subetapa " + stage.id);
    var title = createElement("h3", "", stage.title);
    var status = createElement("p", "stage-status", getStageStatus(stage, progress));
    var closeButton = createElement("button", "ghost-button modal-close-button", "Cerrar");
    var body = createElement("div", "stage-modal-body");
    var descriptionSection = createElement("section", "modal-section");
    var materialSection = createElement("section", "modal-section");
    var materialHeading = createElement("div", "modal-section-heading");
    var materialTitle = createElement("h4", "", "Materiales");
    var materialButton = createElement("button", "secondary-button", "Ver material");
    var materialPreview = createElement(
      "div",
      "material-preview",
      "Vista temporal del material seleccionado. Este espacio luego podrá conectarse a recursos reales o a una base de datos."
    );
    var evaluationSection = createElement("section", "modal-section");
    var feedback = buildFeedback(stage.id);

    empty(backdrop);
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "stageModalTitle");
    title.id = "stageModalTitle";
    closeButton.type = "button";
    materialButton.type = "button";
    materialPreview.hidden = true;

    closeButton.addEventListener("click", closeStageModal);
    materialButton.addEventListener("click", function () {
      materialPreview.hidden = !materialPreview.hidden;
      materialButton.textContent = materialPreview.hidden ? "Ver material" : "Ocultar material";
    });

    headingGroup.appendChild(label);
    headingGroup.appendChild(title);
    headingGroup.appendChild(status);
    header.appendChild(headingGroup);
    header.appendChild(closeButton);

    descriptionSection.appendChild(createElement("h4", "", "Descripción completa"));
    descriptionSection.appendChild(createElement("p", "", getStageFullDescription(stage)));

    materialHeading.appendChild(materialTitle);
    materialHeading.appendChild(materialButton);
    materialSection.appendChild(materialHeading);
    materialSection.appendChild(buildStageMaterials(stage));
    materialSection.appendChild(materialPreview);

    evaluationSection.appendChild(createElement("h4", "", "Mini evaluación"));

    if (feedback) {
      evaluationSection.appendChild(feedback);
    }

    evaluationSection.appendChild(buildModalEvaluationForm(stage));

    body.appendChild(descriptionSection);
    body.appendChild(materialSection);
    body.appendChild(evaluationSection);
    modal.appendChild(header);
    modal.appendChild(body);
    backdrop.appendChild(modal);
    backdrop.hidden = false;
    document.body.classList.add("modal-open");
    closeButton.focus();
  }

  function handleEvaluationSubmit(event, stage) {
    event.preventDefault();

    var formData = new FormData(event.currentTarget);
    var correctAnswers = 0;

    stage.evaluation.questions.forEach(function (question, questionIndex) {
      var selectedIndex = Number(formData.get(stage.id + "-question-" + questionIndex));
      var selectedOption = question.options[selectedIndex];

      if (selectedOption && selectedOption.correct) {
        correctAnswers += 1;
      }
    });

    var score = Math.round((correctAnswers / stage.evaluation.questions.length) * 100);
    var progress = normalizeProgress(storage.getLearningProgress());
    var minimumScore = data.settings.minimumScore;
    var nextStageId = getNextStageId(stage.id);

    progress.scores[stage.id] = score;

    if (score >= minimumScore) {
      addUnique(progress.completedStages, stage.id);

      if (nextStageId) {
        addUnique(progress.unlockedStages, nextStageId);
      }

      latestStageFeedback = {
        stageId: stage.id,
        title: "Mini evaluación aprobada",
        message: nextStageId
          ? "Obtuviste " + score + "%. Se desbloqueó la subetapa " + nextStageId + "."
          : "Obtuviste " + score + "%. Ruta completada en esta versión temporal."
      };
    } else {
      latestStageFeedback = {
        stageId: stage.id,
        title: "Mini evaluación pendiente",
        message: "Obtuviste " + score + "%. La nota mínima configurada es " + minimumScore + "%."
      };
    }

    storage.saveLearningProgress(progress);
    renderLearningPath();

    if (score >= minimumScore) {
      closeStageModal();
    } else {
      openStageModal(stage);
    }
  }

  function renderLearningPath() {
    var container = byId("stageGrid");
    var progress = normalizeProgress(storage.getLearningProgress());

    byId("learningTitle").textContent = data.learningPath.title;
    byId("learningDescription").textContent = data.learningPath.description;
    byId("minimumScoreNote").textContent = "Nota mínima configurable: " + data.settings.minimumScore + "%";
    empty(container);

    data.learningPath.stages.forEach(function (stage) {
      var isUnlocked = progress.unlockedStages.includes(stage.id);
      var isComplete = progress.completedStages.includes(stage.id);
      var card = createElement("article", "stage-card");
      var head = createElement("div", "stage-head");
      var letter = createElement("span", "stage-letter", stage.id);
      var titleGroup = document.createElement("div");
      var title = createElement("h3", "", stage.title);
      var status = createElement("p", "stage-status");
      var description = createElement("p", "", stage.description);
      var actions = createElement("div", "stage-actions");
      var enterButton = createElement("button", "primary-button", "Entrar a subetapa");

      if (!isUnlocked) {
        card.classList.add("is-locked");
      }

      if (isComplete) {
        card.classList.add("is-complete");
      }

      status.textContent = getStageStatus(stage, progress);

      enterButton.type = "button";
      enterButton.disabled = !isUnlocked;

      enterButton.addEventListener("click", function () {
        openStageModal(stage);
      });

      titleGroup.appendChild(title);
      titleGroup.appendChild(status);
      head.appendChild(letter);
      head.appendChild(titleGroup);
      actions.appendChild(enterButton);

      card.appendChild(head);
      card.appendChild(description);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function renderForumComments() {
    var container = byId("commentList");
    var comments = storage.getForumComments();
    empty(container);

    if (!comments.length) {
      container.appendChild(createElement("p", "empty-state", "Aún no hay comentarios guardados en esta versión."));
      return;
    }

    comments.forEach(function (comment) {
      var card = createElement("article", "comment-card");
      var header = document.createElement("header");
      var author = createElement("strong", "", comment.name);
      var time = document.createElement("time");
      var body = createElement("p", "", comment.comment);

      time.dateTime = comment.createdAt;
      time.textContent = formatDate(comment.createdAt);

      header.appendChild(author);
      header.appendChild(time);
      card.appendChild(header);
      card.appendChild(body);
      container.appendChild(card);
    });
  }

  function handleForumSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var name = form.elements.name.value.trim();
    var comment = form.elements.comment.value.trim();

    if (!name || !comment) {
      return;
    }

    storage.addForumComment({
      id: String(Date.now()),
      name: name,
      comment: comment,
      createdAt: new Date().toISOString()
    });

    form.reset();
    renderForumComments();
  }

  function renderForum() {
    byId("forumNotice").textContent = data.forum.notice;
    byId("forumForm").addEventListener("submit", handleForumSubmit);
    renderForumComments();
  }

  function setupDevelopmentResetButton() {
    var resetButton = byId("resetTestDataButton");

    if (!resetButton) {
      return;
    }

    // Herramienta temporal de desarrollo para pruebas locales.
    // Retirar antes de convertir esta vitrina en una versión de producción.
    resetButton.addEventListener("click", function () {
      var confirmed = window.confirm(
        "Esta herramienta temporal borrará diagnóstico, progreso y comentarios guardados en este navegador. ¿Deseas continuar?"
      );

      if (!confirmed) {
        return;
      }

      storage.clearTestData();
      window.location.reload();
    });
  }

  function init() {
    renderHero();
    renderInfoCards();
    renderDiagnosis();
    renderLearningPath();
    renderForum();
    setupDevelopmentResetButton();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
