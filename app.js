(function () {
  "use strict";

  var data = window.APP_DATA;
  var storage = window.appStorage;
  var supabaseClient = window.supabaseClient;
  var authHelpers = window.supabaseAuthHelpers;
  var appState = {
    user: null,
    profile: null,
    remoteProgress: null,
    diagnosisResult: null,
    quizScores: {},
    quizAttemptsByStage: {},
    forumPosts: [],
    remoteDataLoaded: false,
    isSavingDiagnostic: false,
    savingQuizStages: {}
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

  function getCurrentUsername() {
    var metadata = appState.user && appState.user.user_metadata;

    if (appState.profile) {
      return appState.profile.username || "";
    }

    if (metadata) {
      return metadata.username || "";
    }

    if (appState.user && appState.user.email) {
      return appState.user.email.split("@")[0];
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
      return "Ya existe una cuenta con ese usuario.";
    }

    if (message.includes("invalid login") || message.includes("invalid credentials")) {
      return "Usuario o contraseña incorrectos.";
    }

    if (message.includes("password")) {
      return "Revisa la contraseña ingresada. Debe cumplir las reglas indicadas en el formulario.";
    }

    if (message.includes("email")) {
      return "El usuario no pudo convertirse en un email técnico válido. Usa solo letras, números, guion o guion bajo.";
    }

    if (message.includes("failed to fetch") || message.includes("network")) {
      return "No se pudo conectar con Supabase. Revisa la conexión e intenta de nuevo.";
    }

    return "No se pudo completar la operación. Revisa los datos e intenta nuevamente.";
  }

  function getUsernameValidationMessage(rawUsername, username) {
    if (!rawUsername.trim()) {
      return "Ingresa un usuario para continuar.";
    }

    if (!authHelpers.isUsernameFormatValid(rawUsername)) {
      return "El usuario solo puede usar letras, números, guion y guion bajo.";
    }

    if (!username || username.length < authHelpers.minimumUsernameLength) {
      return "El usuario debe tener al menos " + authHelpers.minimumUsernameLength + " caracteres.";
    }

    return "";
  }

  function getPasswordValidationMessage(password) {
    var missingRules = [];

    if (password.length < 8) {
      missingRules.push("mínimo 8 caracteres");
    }

    if (!/[A-Z]/.test(password)) {
      missingRules.push("una mayúscula");
    }

    if (!/[a-z]/.test(password)) {
      missingRules.push("una minúscula");
    }

    if (!/[0-9]/.test(password)) {
      missingRules.push("un número");
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      missingRules.push("un símbolo");
    }

    if (!missingRules.length) {
      return "";
    }

    return "La contraseña debe incluir " + missingRules.join(", ") + ".";
  }

  function setSyncNotice(message) {
    var notice = byId("syncNotice");

    if (!notice) {
      return;
    }

    notice.hidden = !message;
    notice.textContent = message || "";
  }

  function isDuplicateRecordError(error) {
    var message = (error && error.message ? error.message : "").toLowerCase();
    var details = (error && error.details ? error.details : "").toLowerCase();
    var code = error && error.code;

    return code === "23505"
      || message.includes("duplicate")
      || message.includes("unique")
      || details.includes("already exists")
      || details.includes("unique");
  }

  function getDefaultProgressRow() {
    return {
      user_id: appState.user ? appState.user.id : "",
      diagnostic_completed: false,
      current_stage: "A",
      completed_stages: []
    };
  }

  function normalizeProgressRow(row) {
    var normalized = row || getDefaultProgressRow();
    var completedStages = [];
    var currentStage = normalized.current_stage || "A";
    var firstPendingStage;

    if (Array.isArray(normalized.completed_stages)) {
      normalized.completed_stages.forEach(function (stageId) {
        addUnique(completedStages, stageId);
      });
    }

    firstPendingStage = data.learningPath.stages.find(function (stage) {
      return !completedStages.includes(stage.id);
    });

    if (completedStages.includes(currentStage) && firstPendingStage) {
      currentStage = firstPendingStage.id;
    }

    return {
      user_id: normalized.user_id || (appState.user ? appState.user.id : ""),
      diagnostic_completed: Boolean(normalized.diagnostic_completed),
      current_stage: currentStage,
      completed_stages: completedStages
    };
  }

  function remoteProgressToLearningProgress(row) {
    var progressRow = normalizeProgressRow(row);
    var unlockedStages = ["A"];
    var completedStages = progressRow.completed_stages.slice();

    completedStages.forEach(function (stageId) {
      addUnique(unlockedStages, stageId);
    });

    if (progressRow.current_stage) {
      addUnique(unlockedStages, progressRow.current_stage);
    }

    return normalizeProgress({
      unlockedStages: unlockedStages,
      completedStages: completedStages,
      scores: appState.quizScores || {}
    });
  }

  function getLearningProgressForRender() {
    if (appState.remoteProgress) {
      return remoteProgressToLearningProgress(appState.remoteProgress);
    }

    return normalizeProgress(storage.getLearningProgress());
  }

  function isDiagnosticCompleted() {
    return Boolean(
      (appState.remoteProgress && normalizeProgressRow(appState.remoteProgress).diagnostic_completed)
      || appState.diagnosisResult
    );
  }

  function getStageAttempt(stageId) {
    return appState.quizAttemptsByStage[stageId] || null;
  }

  function isStageCompleted(stageId, progress) {
    var currentProgress = progress || getLearningProgressForRender();
    return currentProgress.completedStages.includes(stageId);
  }

  async function saveRemoteProgress(fields) {
    var current = normalizeProgressRow(appState.remoteProgress);
    var payload;
    var response;

    if (!appState.user) {
      throw new Error("No hay usuario autenticado para guardar progreso.");
    }

    payload = {
      user_id: appState.user.id,
      diagnostic_completed: fields.diagnostic_completed !== undefined
        ? fields.diagnostic_completed
        : current.diagnostic_completed,
      current_stage: fields.current_stage || current.current_stage || "A",
      completed_stages: Array.isArray(fields.completed_stages)
        ? fields.completed_stages
        : current.completed_stages
    };

    response = await supabaseClient
      .from("progress")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id, diagnostic_completed, current_stage, completed_stages")
      .maybeSingle();

    if (response.error) {
      throw response.error;
    }

    appState.remoteProgress = normalizeProgressRow(response.data || payload);
    storage.saveLearningProgress(remoteProgressToLearningProgress(appState.remoteProgress));
    return appState.remoteProgress;
  }

  async function loadLatestDiagnosticAnswer() {
    var response = await supabaseClient
      .from("diagnostic_answers")
      .select("id, answers, score, created_at")
      .eq("user_id", appState.user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    var answerRow;

    if (response.error) {
      throw response.error;
    }

    answerRow = response.data && response.data[0];

    if (!answerRow) {
      appState.diagnosisResult = null;
      return null;
    }

    appState.diagnosisResult = {
      score: answerRow.score,
      label: getDiagnosisLabel(answerRow.score),
      answers: answerRow.answers || [],
      createdAt: answerRow.created_at || new Date().toISOString()
    };
    storage.saveDiagnosisResult(appState.diagnosisResult);
    return appState.diagnosisResult;
  }

  async function loadQuizAttempts() {
    var response = await supabaseClient
      .from("quiz_attempts")
      .select("id, stage_key, answers, score, passed, created_at")
      .eq("user_id", appState.user.id)
      .order("created_at", { ascending: false });

    if (response.error) {
      throw response.error;
    }

    appState.quizScores = {};
    appState.quizAttemptsByStage = {};

    (response.data || []).forEach(function (attempt) {
      if (attempt.stage_key && appState.quizScores[attempt.stage_key] === undefined) {
        appState.quizScores[attempt.stage_key] = attempt.score;
      }

      if (attempt.stage_key && !appState.quizAttemptsByStage[attempt.stage_key]) {
        appState.quizAttemptsByStage[attempt.stage_key] = attempt;
      }
    });

    return response.data || [];
  }

  async function loadForumPosts() {
    var response = await supabaseClient
      .from("forum_posts")
      .select("id, display_name, content, created_at")
      .order("created_at", { ascending: false })
      .limit(80);

    if (response.error) {
      throw response.error;
    }

    appState.forumPosts = response.data || [];
    return appState.forumPosts;
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
    var username = getCurrentUsername();

    if (!appState.user) {
      widget.hidden = true;
      label.textContent = "";
      return;
    }

    label.textContent = "Sesión: " + (username || "Usuario");
    widget.hidden = false;
  }

  function updateForumIdentity() {
    var identity = byId("forumIdentity");
    var username = getCurrentUsername();

    if (!identity) {
      return;
    }

    identity.textContent = "Publicando como: " + (username || "Usuario");
  }

  function resetAuthState() {
    appState.user = null;
    appState.profile = null;
    appState.remoteProgress = null;
    appState.diagnosisResult = null;
    appState.quizScores = {};
    appState.quizAttemptsByStage = {};
    appState.forumPosts = [];
    appState.remoteDataLoaded = false;
    appState.isSavingDiagnostic = false;
    appState.savingQuizStages = {};
    storage.setCurrentStorageUser("");
  }

  function isAuthReady() {
    return Boolean(supabaseClient && authHelpers);
  }

  function refreshDiagnosisForCurrentUser() {
    var result = appState.remoteDataLoaded
      ? appState.diagnosisResult
      : storage.getDiagnosisResult();
    var form = byId("diagnosisForm");
    var startButton = byId("startDiagnosisButton");

    if (form) {
      form.hidden = true;
    }

    if (isDiagnosticCompleted()) {
      if (result) {
        renderDiagnosisResult(result);
      } else {
        renderDiagnosisNotice("Diagnóstico ya completado", "Esta respuesta ya fue registrada.");
      }

      if (startButton) {
        startButton.textContent = "Diagnóstico ya completado";
        startButton.disabled = true;
      }

      return;
    }

    renderDiagnosisResult(result);

    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = result ? "Repetir diagnóstico" : "Iniciar diagnóstico";
    }
  }

  function refreshUserScopedContent() {
    latestStageFeedback = null;
    refreshDiagnosisForCurrentUser();
    renderLearningPath();
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
    renderForumComments();
    refreshUserScopedContent();
  }

  async function loadSupabaseUserState(user) {
    var profileResponse;
    var progressResponse;

    appState.user = user;

    profileResponse = await supabaseClient
      .from("profiles")
      .select("id, username")
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
    appState.remoteProgress = normalizeProgressRow(progressResponse.data || getDefaultProgressRow());
    storage.setCurrentStorageUser(getCurrentUsername() || user.id);

    if (!progressResponse.data) {
      await saveRemoteProgress(getDefaultProgressRow());
    } else {
      storage.saveLearningProgress(remoteProgressToLearningProgress(appState.remoteProgress));
    }

    await loadLatestDiagnosticAnswer();
    await loadQuizAttempts();
    storage.saveLearningProgress(remoteProgressToLearningProgress(appState.remoteProgress));
    await loadForumPosts();
    appState.remoteDataLoaded = true;
    setSyncNotice("");
  }

  async function createInitialProfileAndProgress(user, username) {
    var profileInsert;
    var progressInsert;

    profileInsert = await supabaseClient.from("profiles").insert({
      id: user.id,
      username: username,
      display_name: username
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
    var rawUsername = form.elements.username.value;
    var username = isAuthReady() ? authHelpers.normalizeUsername(rawUsername) : "";
    var password = form.elements.password.value;
    var passwordConfirm = form.elements.passwordConfirm.value;
    var email = isAuthReady() ? authHelpers.usernameToEmail(rawUsername) : "";
    var signUpResponse;
    var usernameValidationMessage;
    var passwordValidationMessage;

    if (!isAuthReady()) {
      setAccessMessage("registerMessage", "No se pudo inicializar Supabase. Revisa la conexión e intenta de nuevo.");
      return;
    }

    if (!rawUsername.trim() || !password || !passwordConfirm) {
      setAccessMessage("registerMessage", "Completa todos los campos para continuar.");
      return;
    }

    usernameValidationMessage = getUsernameValidationMessage(rawUsername, username);

    if (usernameValidationMessage) {
      setAccessMessage("registerMessage", usernameValidationMessage);
      return;
    }

    passwordValidationMessage = getPasswordValidationMessage(password);

    if (passwordValidationMessage) {
      setAccessMessage("registerMessage", passwordValidationMessage);
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
            username: username
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
        setAccessMessage("registerMessage", "Ya existe una cuenta con ese usuario.");
        return;
      }

      if (!signUpResponse.data.session) {
        setAccessMessage(
          "registerMessage",
          "La cuenta fue creada, pero Supabase requiere confirmación por correo. Para este flujo con usuario, desactiva la confirmación de email o usa correos reales."
        );
        return;
      }

      await createInitialProfileAndProgress(signUpResponse.data.user, username);
      await loadSupabaseUserState(signUpResponse.data.user);
      storage.clearCurrentUserData();

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
    var rawUsername = form.elements.username.value;
    var username = isAuthReady() ? authHelpers.normalizeUsername(rawUsername) : "";
    var password = form.elements.password.value;
    var email = isAuthReady() ? authHelpers.usernameToEmail(rawUsername) : "";
    var signInResponse;
    var usernameValidationMessage;

    if (!isAuthReady()) {
      setAccessMessage("loginMessage", "No se pudo inicializar Supabase. Revisa la conexión e intenta de nuevo.");
      return;
    }

    if (!rawUsername.trim() || !password) {
      setAccessMessage("loginMessage", "Completa los campos para iniciar sesión.");
      return;
    }

    usernameValidationMessage = getUsernameValidationMessage(rawUsername, username);

    if (usernameValidationMessage) {
      setAccessMessage("loginMessage", usernameValidationMessage);
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
    box.appendChild(createElement("strong", "", "Resultado sincronizado: " + result.score + "%"));
    box.appendChild(createElement("span", "", result.label + " - " + formatDate(result.createdAt)));
  }

  function renderDiagnosisNotice(title, message) {
    var box = byId("diagnosisSavedResult");

    empty(box);
    box.hidden = false;
    box.appendChild(createElement("strong", "", title));
    box.appendChild(createElement("span", "", message));
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

    if (isDiagnosticCompleted()) {
      renderDiagnosisNotice("Diagnóstico ya completado", "Esta respuesta ya fue registrada.");
      form.hidden = true;
      return;
    }

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

    form.appendChild(createElement("button", "primary-button", "Enviar diagnóstico"));
    form.hidden = false;
  }

  async function handleDiagnosisSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var submitButton = form.querySelector("button[type='submit'], button:not([type])");
    var originalButtonText = submitButton ? submitButton.textContent : "";
    var formData;
    var answers = [];
    var totalScore = 0;

    if (appState.isSavingDiagnostic) {
      return;
    }

    if (isDiagnosticCompleted()) {
      renderDiagnosisNotice("Diagnóstico ya completado", "Esta respuesta ya fue registrada.");
      form.hidden = true;
      return;
    }

    appState.isSavingDiagnostic = true;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Guardando...";
    }

    formData = new FormData(form);

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

    try {
      var diagnosisResponse = await supabaseClient.from("diagnostic_answers").insert({
        user_id: appState.user.id,
        answers: answers,
        score: score
      });

      if (diagnosisResponse.error) {
        throw diagnosisResponse.error;
      }
    } catch (error) {
      appState.isSavingDiagnostic = false;

      if (isDuplicateRecordError(error)) {
        try {
          await loadLatestDiagnosticAnswer();
          await saveRemoteProgress({ diagnostic_completed: true });
        } catch (syncError) {
          setSyncNotice("Esta respuesta ya fue registrada, pero no se pudo refrescar el progreso remoto.");
        }

        renderDiagnosisNotice("Diagnóstico ya completado", "Esta respuesta ya fue registrada.");
        form.hidden = true;
        byId("startDiagnosisButton").textContent = "Diagnóstico ya completado";
        byId("startDiagnosisButton").disabled = true;
        setSyncNotice("Esta respuesta ya fue registrada.");
        return;
      }

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }

      setSyncNotice("No se pudo guardar el diagnóstico en Supabase. Revisa la conexión e intenta nuevamente.");
      return;
    }

    try {
      await saveRemoteProgress({ diagnostic_completed: true });
      setSyncNotice("");
    } catch (error) {
      setSyncNotice("El diagnóstico fue registrado, pero no se pudo actualizar el progreso remoto. Revisa la conexión e intenta recargar.");
    }

    appState.diagnosisResult = result;
    storage.saveDiagnosisResult(result);
    appState.isSavingDiagnostic = false;
    renderDiagnosisResult(result);
    form.hidden = true;
    byId("startDiagnosisButton").textContent = "Diagnóstico ya completado";
    byId("startDiagnosisButton").disabled = true;
  }

  function renderDiagnosis() {
    byId("diagnosisTitle").textContent = data.diagnosis.title;
    byId("diagnosisDescription").textContent = data.diagnosis.description;
    renderDiagnosisQuestions();
    renderDiagnosisResult(appState.diagnosisResult || storage.getDiagnosisResult());

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

    return buildFeedbackBox(latestStageFeedback.title, latestStageFeedback.message);
  }

  function buildFeedbackBox(title, message) {
    var box = createElement("div", "feedback-box");
    box.appendChild(createElement("strong", "", title));
    box.appendChild(createElement("span", "", message));
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

    if (isStageCompleted(stage.id, progress)) {
      evaluationSection.appendChild(buildFeedbackBox(
        "Esta etapa ya fue completada",
        "La mini evaluación de esta etapa ya fue registrada."
      ));
    } else if (getStageAttempt(stage.id)) {
      evaluationSection.appendChild(buildFeedbackBox(
        "Esta respuesta ya fue registrada",
        "Ya existe un intento de mini evaluación para esta etapa."
      ));
    } else {
      evaluationSection.appendChild(buildStageQuizForm(stage));
    }

    mainColumn.appendChild(buildStageDetailSection("Descripción ampliada", getStageFullDescription(stage)));
    mainColumn.appendChild(buildStageDetailSection("Introducción", stage.intro || "Introducción placeholder pendiente de edición."));
    mainColumn.appendChild(materialSection);
    mainColumn.appendChild(buildStageDetailSection("Recurso de aprendizaje", buildLearningResource(stage)));
    mainColumn.appendChild(buildStageDetailSection("Actividad", stage.activity || "Actividad placeholder pendiente de edición."));
    mainColumn.appendChild(evaluationSection);

    sideColumn.appendChild(createElement("strong", "", "Resumen de avance"));
    sideColumn.appendChild(createElement("p", "", "Usuario: " + (getCurrentUsername() || "Usuario")));
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

  async function handleEvaluationSubmit(event, stage) {
    event.preventDefault();

    var form = event.currentTarget;
    var submitButton = form.querySelector("button[type='submit'], button:not([type])");
    var originalButtonText = submitButton ? submitButton.textContent : "";
    var progress = getLearningProgressForRender();
    var formData;
    var quiz = getStageQuiz(stage);
    var correctAnswers = 0;
    var selectedAnswers = [];

    if (appState.savingQuizStages[stage.id]) {
      return;
    }

    if (isStageCompleted(stage.id, progress)) {
      latestStageFeedback = {
        stageId: stage.id,
        title: "Esta etapa ya fue completada",
        message: "La mini evaluación de esta etapa ya fue registrada."
      };
      renderLearningPath();
      return;
    }

    if (getStageAttempt(stage.id)) {
      latestStageFeedback = {
        stageId: stage.id,
        title: "Esta respuesta ya fue registrada",
        message: "Ya existe un intento de mini evaluación para esta etapa."
      };
      renderLearningPath();
      return;
    }

    appState.savingQuizStages[stage.id] = true;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Guardando...";
    }

    formData = new FormData(form);

    quiz.questions.forEach(function (question, questionIndex) {
      var selectedIndex = Number(formData.get(stage.id + "-question-" + questionIndex));
      var selectedOption = question.options[selectedIndex];

      if (selectedOption && selectedOption.correct) {
        correctAnswers += 1;
      }

      selectedAnswers.push({
        question: question.text,
        answer: selectedOption ? selectedOption.label : "",
        correct: Boolean(selectedOption && selectedOption.correct)
      });
    });

    var score = quiz.questions.length
      ? Math.round((correctAnswers / quiz.questions.length) * 100)
      : 0;
    var minimumScore = data.settings.minimumScore;
    var nextStageId = getNextStageId(stage.id);
    var passed = score >= minimumScore;
    var attempt = {
      id: String(Date.now()),
      stageId: stage.id,
      stage_key: stage.id,
      score: score,
      passed: passed,
      answers: selectedAnswers,
      createdAt: new Date().toISOString()
    };

    try {
      var attemptResponse = await supabaseClient.from("quiz_attempts").insert({
        user_id: appState.user.id,
        stage_key: stage.id,
        answers: selectedAnswers,
        score: score,
        passed: passed
      });

      if (attemptResponse.error) {
        throw attemptResponse.error;
      }
    } catch (error) {
      appState.savingQuizStages[stage.id] = false;

      if (isDuplicateRecordError(error)) {
        try {
          await loadQuizAttempts();
        } catch (syncError) {
          setSyncNotice("Esta respuesta ya fue registrada, pero no se pudo refrescar la lista de intentos.");
        }

        latestStageFeedback = {
          stageId: stage.id,
          title: "Esta respuesta ya fue registrada",
          message: "Ya existe un intento de mini evaluación para esta etapa."
        };
        setSyncNotice("Esta respuesta ya fue registrada.");
        renderLearningPath();
        return;
      }

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }

      setSyncNotice("No se pudo guardar la mini evaluación en Supabase. Revisa la conexión e intenta nuevamente.");
      return;
    }

    appState.quizAttemptsByStage[stage.id] = attempt;
    appState.quizScores[stage.id] = score;
    progress.scores[stage.id] = score;
    storage.addEvaluationAttempt(attempt);

    if (passed) {
      addUnique(progress.completedStages, stage.id);

      if (nextStageId) {
        addUnique(progress.unlockedStages, nextStageId);
      }

      latestStageFeedback = {
        stageId: stage.id,
        title: "Mini evaluación aprobada",
        message: nextStageId
          ? "Obtuviste " + score + "%. Se desbloqueó la etapa " + nextStageId + "."
          : "Obtuviste " + score + "%. Ruta completada."
      };
    } else {
      latestStageFeedback = {
        stageId: stage.id,
        title: "Mini evaluación pendiente",
        message: "Obtuviste " + score + "%. La nota mínima configurada es " + minimumScore + "%."
      };
    }

    storage.saveLearningProgress(progress);

    try {
      if (passed) {
        await saveRemoteProgress({
          current_stage: nextStageId || stage.id,
          completed_stages: progress.completedStages
        });
      }

      setSyncNotice("");
    } catch (error) {
      setSyncNotice("La mini evaluación fue registrada, pero no se pudo actualizar el progreso remoto. Revisa la conexión e intenta recargar.");
    }

    appState.savingQuizStages[stage.id] = false;
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
    var progress = getLearningProgressForRender();
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
    var comments = appState.remoteDataLoaded
      ? appState.forumPosts
      : storage.getForumComments();
    empty(container);

    if (!comments.length) {
      container.appendChild(createElement("p", "empty-state", "Aún no hay publicaciones en el foro."));
      return;
    }

    comments.forEach(function (comment) {
      var card = createElement("article", "comment-card");
      var header = document.createElement("header");
      var author = createElement("strong", "", comment.display_name || comment.username || comment.name);
      var time = document.createElement("time");
      var body = createElement("p", "", comment.content || comment.comment);

      time.dateTime = comment.created_at || comment.createdAt;
      time.textContent = formatDate(comment.created_at || comment.createdAt);

      header.appendChild(author);
      header.appendChild(time);
      card.appendChild(header);
      card.appendChild(body);
      container.appendChild(card);
    });
  }

  async function handleForumSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var name = getCurrentUsername() || "Usuario";
    var comment = form.elements.comment.value.trim();

    if (!comment) {
      return;
    }

    try {
      var forumResponse = await supabaseClient.from("forum_posts").insert({
        user_id: appState.user.id,
        display_name: name,
        content: comment
      });

      if (forumResponse.error) {
        throw forumResponse.error;
      }

      await loadForumPosts();
      setSyncNotice("");
    } catch (error) {
      setSyncNotice("No se pudo publicar en el foro de Supabase. Intenta de nuevo cuando la conexión esté disponible.");
      return;
    }

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
          "Esta herramienta temporal borrará solo el diagnóstico, progreso y evaluaciones locales del usuario activo. El foro global temporal y otros usuarios no se borrarán. ¿Deseas continuar?"
        );

        if (!confirmed) {
          return;
        }

        try {
          storage.clearTestData();

          if (appState.user) {
            await saveRemoteProgress({
              diagnostic_completed: false,
              current_stage: "A",
              completed_stages: []
            });
          }

          if (supabaseClient) {
            await supabaseClient.auth.signOut();
          }
        } catch (error) {
          setSyncNotice("No se pudo reiniciar el progreso remoto en Supabase. Revisa la conexión e intenta nuevamente.");
          return;
        }

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
