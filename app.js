(function () {
  "use strict";

  var data = window.APP_DATA;
  var storage = window.appStorage;
  var supabaseClient = window.supabaseClient;
  var authHelpers = window.supabaseAuthHelpers;
  var appState = {
    user: null,
    profile: null,
    remoteProgress: null
  };
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

  function getUserDisplayName() {
    var metadata = appState.user && appState.user.user_metadata;

    if (appState.profile) {
      return appState.profile.display_name || appState.profile.participant_code || "";
    }

    if (metadata) {
      return metadata.display_name || metadata.participant_code || "";
    }

    return "";
  }

  function clearAccessMessages() {
    byId("registerMessage").textContent = "";
    byId("loginMessage").textContent = "";
  }

  function setAccessMessage(id, message) {
    byId(id).textContent = message || "";
  }

  function formatAuthError(error) {
    var message = (error && error.message ? error.message : "").toLowerCase();

    if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
      return "Ya existe una cuenta con ese código de participante.";
    }

    if (message.includes("invalid login") || message.includes("invalid credentials")) {
      return "Código de participante o contraseña incorrectos.";
    }

    if (message.includes("password")) {
      return "Revisa la contraseña ingresada.";
    }

    if (message.includes("failed to fetch") || message.includes("network")) {
      return "No se pudo conectar con Supabase. Revisa la conexión e intenta de nuevo.";
    }

    return "Ocurrió un error de conexión o autenticación. Intenta nuevamente.";
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

  function updateSessionWidget() {
    var widget = byId("sessionWidget");
    var label = byId("sessionLabel");
    var displayName = getUserDisplayName();

    if (!appState.user) {
      widget.hidden = true;
      label.textContent = "";
      return;
    }

    label.textContent = "Sesión: " + (displayName || appState.user.email || "Usuario");
    widget.hidden = false;
  }

  function updateForumIdentity() {
    var identity = byId("forumIdentity");
    var displayName = getUserDisplayName();

    if (!identity) {
      return;
    }

    identity.textContent = "Publicando como: " + (displayName || "Participante");
  }

  function resetAuthState() {
    appState.user = null;
    appState.profile = null;
    appState.remoteProgress = null;
  }

  function isAuthReady() {
    return Boolean(supabaseClient && authHelpers);
  }

  function applySessionState(hasSession) {
    var accessScreen = byId("accessScreen");

    document.body.classList.remove("auth-pending");

    if (!hasSession) {
      accessScreen.hidden = false;
      document.body.classList.add("access-required");
      document.body.classList.remove("stage-page-active");
      updateSessionWidget();
      return;
    }

    accessScreen.hidden = true;
    document.body.classList.remove("access-required");
    updateSessionWidget();
    updateForumIdentity();
    renderLearningPath();
  }

  async function loadSupabaseUserState(user) {
    var profileResponse;
    var progressResponse;

    appState.user = user;

    profileResponse = await supabaseClient
      .from("profiles")
      .select("id, participant_code, display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResponse.error) {
      throw profileResponse.error;
    }

    progressResponse = await supabaseClient
      .from("progress")
      .select("user_id, diagnostic_completed, current_stage, completed_stages")
      .eq("user_id", user.id)
      .maybeSingle();

    if (progressResponse.error) {
      throw progressResponse.error;
    }

    appState.profile = profileResponse.data;
    appState.remoteProgress = progressResponse.data;
  }

  async function createInitialProfileAndProgress(user, participantCode, visibleName) {
    var profileInsert;
    var progressInsert;

    profileInsert = await supabaseClient.from("profiles").insert({
      id: user.id,
      participant_code: participantCode,
      display_name: visibleName
    });

    if (profileInsert.error) {
      throw profileInsert.error;
    }

    progressInsert = await supabaseClient.from("progress").insert({
      user_id: user.id,
      diagnostic_completed: false,
      current_stage: "A",
      completed_stages: []
    });

    if (progressInsert.error) {
      throw progressInsert.error;
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var rawParticipantCode = form.elements.participantCode.value;
    var participantCode = isAuthReady() ? authHelpers.normalizeParticipantCode(rawParticipantCode) : "";
    var visibleName = form.elements.visibleName.value.trim();
    var password = form.elements.password.value;
    var passwordConfirm = form.elements.passwordConfirm.value;
    var email = isAuthReady() ? authHelpers.participantCodeToEmail(rawParticipantCode) : "";
    var signUpResponse;

    if (!isAuthReady()) {
      setAccessMessage("registerMessage", "No se pudo inicializar Supabase. Revisa la conexión e intenta de nuevo.");
      return;
    }

    if (!participantCode || !visibleName || !password || !passwordConfirm) {
      setAccessMessage("registerMessage", "Completa todos los campos para continuar.");
      return;
    }

    if (password !== passwordConfirm) {
      setAccessMessage("registerMessage", "Las contraseñas no coinciden.");
      return;
    }

    try {
      setAccessMessage("registerMessage", "Creando cuenta...");
      signUpResponse = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            participant_code: participantCode,
            display_name: visibleName
          }
        }
      });

      if (signUpResponse.error) {
        setAccessMessage("registerMessage", formatAuthError(signUpResponse.error));
        return;
      }

      if (!signUpResponse.data || !signUpResponse.data.user) {
        setAccessMessage("registerMessage", "No se pudo completar el registro. Intenta nuevamente.");
        return;
      }

      if (
        Array.isArray(signUpResponse.data.user.identities)
        && signUpResponse.data.user.identities.length === 0
      ) {
        setAccessMessage("registerMessage", "Ya existe una cuenta con ese código de participante.");
        return;
      }

      if (!signUpResponse.data.session) {
        setAccessMessage(
          "registerMessage",
          "La cuenta fue creada, pero Supabase requiere confirmación por correo. Para este flujo con código de participante, desactiva la confirmación de email o usa correos reales."
        );
        return;
      }

      await createInitialProfileAndProgress(signUpResponse.data.user, participantCode, visibleName);
      await loadSupabaseUserState(signUpResponse.data.user);

      form.reset();
      setAccessMessage("registerMessage", "Registro exitoso.");
      applySessionState(true);
    } catch (error) {
      setAccessMessage("registerMessage", formatAuthError(error));
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var rawParticipantCode = form.elements.participantCode.value;
    var participantCode = isAuthReady() ? authHelpers.normalizeParticipantCode(rawParticipantCode) : "";
    var password = form.elements.password.value;
    var email = isAuthReady() ? authHelpers.participantCodeToEmail(rawParticipantCode) : "";
    var signInResponse;

    if (!isAuthReady()) {
      setAccessMessage("loginMessage", "No se pudo inicializar Supabase. Revisa la conexión e intenta de nuevo.");
      return;
    }

    if (!participantCode || !password) {
      setAccessMessage("loginMessage", "Completa los campos para iniciar sesión.");
      return;
    }

    try {
      setAccessMessage("loginMessage", "Iniciando sesión...");
      signInResponse = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (signInResponse.error) {
        setAccessMessage("loginMessage", formatAuthError(signInResponse.error));
        return;
      }

      if (!signInResponse.data || !signInResponse.data.user) {
        setAccessMessage("loginMessage", "No se pudo iniciar sesión. Intenta nuevamente.");
        return;
      }

      await loadSupabaseUserState(signInResponse.data.user);
      form.reset();
      setAccessMessage("loginMessage", "Inicio de sesión exitoso.");
      applySessionState(true);
    } catch (error) {
      setAccessMessage("loginMessage", formatAuthError(error));
    }
  }

  async function handleLogout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }

    storage.clearLegacyAccessData();
    resetAuthState();

    if (window.location.hash) {
      window.location.hash = "";
    }

    applySessionState(false);
  }

  async function restoreSupabaseSession() {
    var sessionResponse;

    if (!supabaseClient || !authHelpers) {
      setAccessMessage("loginMessage", "No se pudo inicializar Supabase.");
      applySessionState(false);
      return;
    }

    try {
      sessionResponse = await supabaseClient.auth.getSession();

      if (sessionResponse.error || !sessionResponse.data.session) {
        resetAuthState();
        applySessionState(false);
        return;
      }

      await loadSupabaseUserState(sessionResponse.data.session.user);
      applySessionState(true);
    } catch (error) {
      resetAuthState();
      setAccessMessage("loginMessage", "No se pudo revisar la sesión activa.");
      applySessionState(false);
    }
  }

  async function setupAccessGate() {
    byId("registerTab").addEventListener("click", function () {
      setAccessMode("register");
    });
    byId("loginTab").addEventListener("click", function () {
      setAccessMode("login");
    });
    byId("registerForm").addEventListener("submit", handleRegisterSubmit);
    byId("loginForm").addEventListener("submit", handleLoginSubmit);
    byId("logoutButton").addEventListener("click", handleLogout);
    setAccessMode("register");
    await restoreSupabaseSession();
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
    sideColumn.appendChild(createElement("p", "", "Participante: " + (getUserDisplayName() || "Participante")));
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

    // Temporal: luego guardar cada intento de mini evaluacion en la tabla quiz_attempts.
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
    var name = getUserDisplayName() || "Participante";
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
      resetButton.addEventListener("click", async function () {
        var confirmed = window.confirm(
          "Esta herramienta temporal borrará la sesión local de Supabase, diagnóstico, progreso y comentarios guardados en este navegador. ¿Deseas continuar?"
        );

        if (!confirmed) {
          return;
        }

        if (supabaseClient) {
          await supabaseClient.auth.signOut();
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
    setupAccessGate().catch(function () {
      resetAuthState();
      applySessionState(false);
      setAccessMessage("loginMessage", "No se pudo inicializar el acceso con Supabase.");
    });
    setupDevelopmentResetButton();
    window.addEventListener("hashchange", function () {
      if (appState.user) {
        renderLearningPath();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
