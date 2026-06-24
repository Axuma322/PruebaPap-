(function () {
  "use strict";

  var data = window.APP_DATA;
  var storage = window.appStorage;
  var latestStageFeedback = null;

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

    if (text !== undefined && text !== null) {
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

  function getDemoDisplayName(user) {
    if (!user) {
      return "";
    }

    return user.visibleName || user.participantCode;
  }

  function clearAccessMessages() {
    byId("registerMessage").textContent = "";
    byId("loginMessage").textContent = "";
  }

  function setAccessMode(mode) {
    var isRegister = mode === "register";

    byId("registerForm").hidden = !isRegister;
    byId("loginForm").hidden = isRegister;
    byId("registerTab").classList.toggle("is-active", isRegister);
    byId("loginTab").classList.toggle("is-active", !isRegister);
    byId("registerTab").setAttribute("aria-selected", String(isRegister));
    byId("loginTab").setAttribute("aria-selected", String(!isRegister));
    clearAccessMessages();
  }

  function updateSessionWidget(user) {
    var widget = byId("sessionWidget");
    var label = byId("sessionLabel");

    if (!user) {
      widget.hidden = true;
      label.textContent = "";
      return;
    }

    label.textContent = "Sesión demo: " + getDemoDisplayName(user);
    widget.hidden = false;
  }

  function updateForumIdentity() {
    var identity = byId("forumIdentity");
    var user = storage.getActiveDemoUser();

    if (!identity) {
      return;
    }

    identity.textContent = "Publicando como: " + (getDemoDisplayName(user) || "Participante demo");
  }

  function applySessionState() {
    var user = storage.getActiveDemoUser();
    var accessScreen = byId("accessScreen");

    document.body.classList.remove("auth-pending");

    if (!user) {
      accessScreen.hidden = false;
      document.body.classList.add("access-required");
      document.body.classList.remove("stage-page-active");
      updateSessionWidget(null);
      return;
    }

    accessScreen.hidden = true;
    document.body.classList.remove("access-required");
    updateSessionWidget(user);
    updateForumIdentity();
    renderLearningPath();
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var participantCode = form.elements.participantCode.value.trim();
    var visibleName = form.elements.visibleName.value.trim();
    var password = form.elements.password.value;
    var passwordConfirm = form.elements.passwordConfirm.value;

    if (!participantCode || !visibleName || !password || !passwordConfirm) {
      byId("registerMessage").textContent = "Completa todos los campos para continuar.";
      return;
    }

    if (password !== passwordConfirm) {
      byId("registerMessage").textContent = "Las contraseñas no coinciden.";
      return;
    }

    // Demo temporal: Supabase Auth reemplazará este flujo.
    // No se guarda la contraseña ni se crea autenticación real en localStorage.
    storage.createDemoAccount({
      participantCode: participantCode,
      visibleName: visibleName
    });

    form.reset();
    applySessionState();
  }

  function handleLoginSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var participantCode = form.elements.participantCode.value.trim();
    var password = form.elements.password.value;

    if (!participantCode || !password) {
      byId("loginMessage").textContent = "Completa los campos para entrar en modo demo.";
      return;
    }

    // Demo temporal: no valida ni guarda contraseña. Supabase Auth lo reemplazará.
    storage.startDemoSession(participantCode);
    form.reset();
    applySessionState();
  }

  function handleLogoutDemo() {
    storage.clearDemoSession();

    if (window.location.hash) {
      window.location.hash = "";
    }

    applySessionState();
  }

  function setupAccessGate() {
    byId("registerTab").addEventListener("click", function () {
      setAccessMode("register");
    });
    byId("loginTab").addEventListener("click", function () {
      setAccessMode("login");
    });
    byId("registerForm").addEventListener("submit", handleRegisterSubmit);
    byId("loginForm").addEventListener("submit", handleLoginSubmit);
    byId("logoutDemoButton").addEventListener("click", handleLogoutDemo);
    setAccessMode("register");
    applySessionState();
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

  function getStageQuiz(stage) {
    return stage.quiz || stage.evaluation || { questions: [] };
  }

  function getStageHash(stage) {
    return "#etapa-" + stage.id.toLowerCase();
  }

  function getSelectedStageFromHash() {
    var match = window.location.hash.match(/^#etapa-([a-z])$/i);

    if (!match) {
      return null;
    }

    return data.learningPath.stages.find(function (stage) {
      return stage.id.toLowerCase() === match[1].toLowerCase();
    }) || null;
  }

  function goToRouteMap() {
    if (window.location.hash === "#ruta") {
      renderLearningPath();
      return;
    }

    window.location.hash = "#ruta";
  }

  function goToStage(stage) {
    var targetHash = getStageHash(stage);

    if (window.location.hash === targetHash) {
      renderLearningPath();
      return;
    }

    window.location.hash = targetHash;
  }

  function buildStageMaterials(stage) {
    var list = createElement("ul", "stage-material-list");

    stage.materials.forEach(function (material) {
      list.appendChild(createElement("li", "", material));
    });

    return list;
  }

  function buildLearningResource(stage) {
    var resource = createElement("div", "learning-resource");
    resource.appendChild(createElement("strong", "", "Espacio para PDF, presentación o lectura"));
    resource.appendChild(createElement(
      "p",
      "",
      "Placeholder editable para insertar más adelante un PDF embebido, una presentación, una lectura o un recurso multimedia de la etapa " + stage.id + "."
    ));
    return resource;
  }

  function buildStageDetailSection(title, content) {
    var section = createElement("section", "stage-detail-section");
    section.appendChild(createElement("h3", "", title));

    if (typeof content === "string") {
      section.appendChild(createElement("p", "", content));
    } else {
      section.appendChild(content);
    }

    return section;
  }

  function buildStageQuizForm(stage) {
    var form = createElement("form", "evaluation-form");
    var quiz = getStageQuiz(stage);

    quiz.questions.forEach(function (question, questionIndex) {
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

  function renderStageDetail(container, stage, progress) {
    var detail = createElement("article", "stage-detail-view");
    var header = createElement("header", "stage-detail-header");
    var heading = document.createElement("div");
    var backButton = createElement("button", "ghost-button stage-back-button", "← Volver a la ruta");
    var label = createElement("p", "module-number", "Etapa " + stage.id);
    var title = createElement("h2", "", stage.title);
    var status = createElement("p", "stage-status", getStageStatus(stage, progress));
    var content = createElement("div", "stage-detail-content");
    var mainColumn = createElement("div", "stage-detail-main");
    var sideColumn = createElement("aside", "stage-detail-aside");
    var materialSection = createElement("section", "stage-detail-section");
    var evaluationSection = createElement("section", "stage-detail-section");
    var feedback = buildFeedback(stage.id);
    var activeUser = storage.getActiveDemoUser();

    backButton.type = "button";
    backButton.addEventListener("click", goToRouteMap);

    heading.appendChild(label);
    heading.appendChild(title);
    heading.appendChild(status);
    header.appendChild(backButton);
    header.appendChild(heading);

    materialSection.appendChild(createElement("h3", "", "Materiales"));
    materialSection.appendChild(buildStageMaterials(stage));

    evaluationSection.appendChild(createElement("h3", "", "Mini evaluación"));

    if (feedback) {
      evaluationSection.appendChild(feedback);
    }

    evaluationSection.appendChild(buildStageQuizForm(stage));

    mainColumn.appendChild(buildStageDetailSection("Descripción ampliada", getStageFullDescription(stage)));
    mainColumn.appendChild(buildStageDetailSection("Introducción", stage.intro || "Introducción placeholder pendiente de edición."));
    mainColumn.appendChild(materialSection);
    mainColumn.appendChild(buildStageDetailSection("Recurso de aprendizaje", buildLearningResource(stage)));
    mainColumn.appendChild(buildStageDetailSection("Actividad", stage.activity || "Actividad placeholder pendiente de edición."));
    mainColumn.appendChild(evaluationSection);

    sideColumn.appendChild(createElement("strong", "", "Resumen de avance"));
    sideColumn.appendChild(createElement("p", "", "Participante: " + (getDemoDisplayName(activeUser) || "Demo")));
    sideColumn.appendChild(createElement("p", "", "Nota mínima: " + data.settings.minimumScore + "%"));
    sideColumn.appendChild(createElement("p", "", "Estado actual: " + getStageStatus(stage, progress)));

    if (progress.scores[stage.id] !== undefined) {
      sideColumn.appendChild(createElement("p", "", "Último resultado: " + progress.scores[stage.id] + "%"));
    }

    content.appendChild(mainColumn);
    content.appendChild(sideColumn);
    detail.appendChild(header);
    detail.appendChild(content);
    container.appendChild(detail);
  }

  function handleEvaluationSubmit(event, stage) {
    event.preventDefault();

    var formData = new FormData(event.currentTarget);
    var quiz = getStageQuiz(stage);
    var correctAnswers = 0;

    quiz.questions.forEach(function (question, questionIndex) {
      var selectedIndex = Number(formData.get(stage.id + "-question-" + questionIndex));
      var selectedOption = question.options[selectedIndex];

      if (selectedOption && selectedOption.correct) {
        correctAnswers += 1;
      }
    });

    var score = quiz.questions.length
      ? Math.round((correctAnswers / quiz.questions.length) * 100)
      : 0;
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
          ? "Obtuviste " + score + "%. Se desbloqueó la etapa " + nextStageId + "."
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
  }

  function renderStageCard(container, stage, progress) {
    var isUnlocked = progress.unlockedStages.includes(stage.id);
    var isComplete = progress.completedStages.includes(stage.id);
    var card = createElement("article", "stage-card");
    var head = createElement("div", "stage-head");
    var letter = createElement("span", "stage-letter", stage.id);
    var titleGroup = document.createElement("div");
    var title = createElement("h3", "", stage.title);
    var status = createElement("p", "stage-status", getStageStatus(stage, progress));
    var description = createElement("p", "", stage.description);
    var actions = createElement("div", "stage-actions");
    var enterButton = createElement("button", "primary-button", "Entrar a etapa");

    if (!isUnlocked) {
      card.classList.add("is-locked");
    }

    if (isComplete) {
      card.classList.add("is-complete");
    }

    enterButton.type = "button";
    enterButton.disabled = !isUnlocked;
    enterButton.addEventListener("click", function () {
      goToStage(stage);
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
  }

  function renderLearningPath() {
    var routeSection = byId("ruta");
    var container = byId("stageGrid");
    var progress = normalizeProgress(storage.getLearningProgress());
    var selectedStage = getSelectedStageFromHash();
    var selectedStageIsUnlocked = selectedStage && progress.unlockedStages.includes(selectedStage.id);

    byId("learningTitle").textContent = data.learningPath.title;
    byId("learningDescription").textContent = data.learningPath.description;
    byId("minimumScoreNote").textContent = "Nota mínima configurable: " + data.settings.minimumScore + "%";
    empty(container);

    if (selectedStage && !selectedStageIsUnlocked) {
      selectedStage = null;
      window.location.hash = "#ruta";
    }

    document.body.classList.toggle("stage-page-active", Boolean(selectedStage));
    routeSection.classList.toggle("is-stage-view", Boolean(selectedStage));
    container.className = selectedStage ? "stage-detail-shell" : "stage-grid";

    if (selectedStage) {
      renderStageDetail(container, selectedStage, progress);
      routeSection.scrollIntoView({ block: "start" });
      return;
    }

    data.learningPath.stages.forEach(function (stage) {
      renderStageCard(container, stage, progress);
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
    var user = storage.getActiveDemoUser();
    var name = getDemoDisplayName(user) || "Participante demo";
    var comment = form.elements.comment.value.trim();

    if (!comment) {
      return;
    }

    storage.addForumComment({
      id: String(Date.now()),
      name: name,
      comment: comment,
      createdAt: new Date().toISOString()
    });

    form.reset();
    updateForumIdentity();
    renderForumComments();
  }

  function renderForum() {
    byId("forumNotice").textContent = data.forum.notice;
    byId("forumForm").addEventListener("submit", handleForumSubmit);
    updateForumIdentity();
    renderForumComments();
  }

  function setupDevelopmentResetButton() {
    var resetButtons = document.querySelectorAll("[data-reset-test]");

    if (!resetButtons.length) {
      return;
    }

    // Herramienta temporal de desarrollo para pruebas locales.
    // Retirar antes de convertir esta vitrina en una versión de producción.
    resetButtons.forEach(function (resetButton) {
      resetButton.addEventListener("click", function () {
        var confirmed = window.confirm(
          "Esta herramienta temporal borrará sesión demo, datos de participante, diagnóstico, progreso y comentarios guardados en este navegador. ¿Deseas continuar?"
        );

        if (!confirmed) {
          return;
        }

        storage.clearTestData();
        window.location.reload();
      });
    });
  }

  function init() {
    renderHero();
    renderInfoCards();
    renderDiagnosis();
    renderLearningPath();
    renderForum();
    setupAccessGate();
    setupDevelopmentResetButton();
    window.addEventListener("hashchange", function () {
      if (storage.getActiveDemoUser()) {
        renderLearningPath();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
