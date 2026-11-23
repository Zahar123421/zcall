(() => {
  const DEFAULT_SANDBOX_ID = "p_2qxku4v66yr";
  const SANDBOX_ENDPOINT = "https://cloud-api.livekit.io/api/sandbox/connection-details";
  const ACCOUNTS_KEY = "zcall_accounts_v1";
  const SESSION_KEY = "zcall_session_v1";

  const LK = window.LivekitClient;
  const $ = (id) => document.getElementById(id);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const canScreenShare = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  const SVG = {
    micOn: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
    micOff: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
    camOn: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
    camOff: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="m2 2 20 20"/></svg>',
    pin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>',
    reply: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
    copy: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    checks: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>'
  };

  const state = {
    sandboxId: localStorage.getItem("zcall_sandbox_id") || DEFAULT_SANDBOX_ID,
    theme: localStorage.getItem("zcall_theme") || "indigo",
    user: null, // { id, username, nick, email }
    roomName: "",
    savedRooms: JSON.parse(localStorage.getItem("zcall_rooms") || "[]"),

    inCall: false,
    micEnabled: true,
    camEnabled: false,
    mirrorSelf: localStorage.getItem("zcall_mirror") !== "false",
    uiSounds: localStorage.getItem("zcall_sounds") !== "false",
    cleanMic: localStorage.getItem("zcall_clean_mic") === "true",
    quality: localStorage.getItem("zcall_quality") || "1080",
    audioPreset: localStorage.getItem("zcall_audio_preset") || "hq",
    screenMode: localStorage.getItem("zcall_screen_mode") || "motion",
    filter: localStorage.getItem("zcall_filter") || "none",
    audioDeviceId: "",
    videoDeviceId: "",

    room: null,
    isConnecting: false,
    localIdentity: "",
    handRaised: false,
    screenSharing: false,
    pinnedIdentity: null,
    callStartedAt: 0,
    timerInterval: null,
    statsInterval: null,

    profiles: new Map(),
    audioEls: new Map(),
    volumes: new Map(),

    chatOpen: true,
    unreadCount: 0,
    messages: [],
    replyTo: null,
    typingTimer: null,
    lastTypingSent: 0,
    voiceRecorder: null,
    voiceChunks: [],
    voiceTimerInt: null,
    voiceStartedAt: 0,

    botEnabled: false,
    botSpeaking: false,
    botScreenTest: false,
    botEchoRecording: false
  };

  function uid(len = 6) { return Math.random().toString(36).slice(2, 2 + len); }

  function toAsciiId(str, fallback = "user") {
    const map = {
      а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
      к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
      х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
    };
    const tr = (str || "").toLowerCase().split("").map((c) => map[c] ?? c).join("");
    return tr.replace(/[^a-z0-9_-]/g, "").slice(0, 20) || fallback;
  }

  function randomRoomName() {
    const words = ["nova", "cyber", "cosmos", "pulse", "vibe", "aurora", "pixel", "turbo"];
    return `zcall-${words[Math.floor(Math.random() * words.length)]}-${uid(4)}`;
  }

  function formatTime(ts = Date.now()) { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function formatSec(sec) { return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; }
  function formatBytes(b) { return !b ? "" : b < 1024 ? `${b} Б` : b < 1048576 ? `${(b/1024).toFixed(1)} КБ` : `${(b/1048576).toFixed(2)} МБ`; }

  async function hashPass(str) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", encoder.encode(str));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return btoa(unescape(encodeURIComponent(str)));
    }
  }

  function getAccounts() {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); }
    catch { return []; }
  }
  function saveAccounts(list) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); }

  function showToast(msg) {
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    $("toastContainer").appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  let sfxCtx = null;
  function playSfx(type) {
    if (!state.uiSounds) return;
    try {
      sfxCtx = sfxCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (sfxCtx.state === "suspended") sfxCtx.resume();
      const now = sfxCtx.currentTime;
      const osc = sfxCtx.createOscillator(), g = sfxCtx.createGain();
      osc.connect(g); g.connect(sfxCtx.destination);
      if (type === "join") {
        osc.frequency.setValueAtTime(520, now); osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
        g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now); osc.stop(now + 0.23);
      } else if (type === "chat") {
        osc.frequency.setValueAtTime(860, now);
        g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.13);
      }
    } catch (_) {}
  }

  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem("zcall_theme", theme);
    document.body.setAttribute("data-theme", theme);
    document.querySelectorAll("[data-set-theme]").forEach((b) => b.classList.toggle("active", b.dataset.setTheme === theme));
    if ($("roomThemeSelect")) $("roomThemeSelect").value = theme;
  }

  function displayNameOf(p) {
    if (!p) return "Участник";
    const id = p.identity || "";
    const prof = state.profiles.get(id);
    if (prof?.name) return prof.name;
    if (p.name) return p.name;
    return id.includes("_") ? id.split("_")[0] : id;
  }

  function getInviteUrl(roomName) {
    const clean = (roomName || state.roomName || randomRoomName()).trim();
    const base = window.location.href.split("#")[0].split("?")[0];
    return `${base}#${encodeURIComponent(clean)}`;
  }

  async function copyInviteLink(roomName) {
    const url = getInviteUrl(roomName);
    try { await navigator.clipboard.writeText(url); showToast("Ссылка на комнату скопирована"); }
    catch { prompt("Скопируй ссылку для друга:", url); }
  }

  /* -------------------- РЕГИСТРАЦИЯ И ВХОД -------------------- */
  function showAuthTab(tab) {
    const isReg = tab === "reg";
    $("authTabReg").classList.toggle("active", isReg);
    $("authTabLogin").classList.toggle("active", !isReg);
    $("regForm").classList.toggle("hidden", !isReg);
    $("loginForm").classList.toggle("hidden", isReg);
    $("regError").textContent = "";
    $("loginError").textContent = "";
  }

  async function handleRegister(e) {
    e.preventDefault();
    const username = $("regUsername").value.trim().replace(/^@+/, "");
    const nick = $("regNick").value.trim();
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value;
    const errEl = $("regError");
    errEl.textContent = "";

    if (!username || !nick || !email || !password) {
      errEl.textContent = "Заполни все поля: юз, ник, почту и пароль.";
      return;
    }

    const accounts = getAccounts();
    const emailLower = email.toLowerCase();
    const userLower = username.toLowerCase();

    const emailTaken = accounts.some((a) => a.emailLower === emailLower);
    const userTaken = accounts.some((a) => a.usernameLower === userLower);

    if (emailTaken && userTaken) {
      errEl.textContent = "Такая почта и такой юз уже заняты! Придумай другие.";
      return;
    }
    if (emailTaken) {
      errEl.textContent = "Эта почта уже зарегистрирована! С ней нельзя создать второй аккаунт.";
      return;
    }
    if (userTaken) {
      errEl.textContent = `Юз @${username} уже занят! Выбери другой.`;
      return;
    }

    const passHash = await hashPass(password);
    const acc = {
      id: uid(8),
      username,
      usernameLower: userLower,
      nick,
      email,
      emailLower,
      passHash,
      createdAt: Date.now()
    };
    accounts.push(acc);
    saveAccounts(accounts);

    const session = { id: acc.id, username: acc.username, nick: acc.nick, email: acc.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    state.user = session;
    enterAppShell();
  }

  async function handleLogin(e) {
    e.preventDefault();
    const ident = $("loginIdentifier").value.trim().replace(/^@+/, "").toLowerCase();
    const password = $("loginPassword").value;
    const errEl = $("loginError");
    errEl.textContent = "";

    const passHash = await hashPass(password);
    const acc = getAccounts().find((a) => (a.usernameLower === ident || a.emailLower === ident) && a.passHash === passHash);
    if (!acc) {
      errEl.textContent = "Неверный юз/почта или пароль.";
      return;
    }

    const session = { id: acc.id, username: acc.username, nick: acc.nick, email: acc.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    state.user = session;
    enterAppShell();
  }

  async function logoutAccount() {
    await disconnectLiveKit();
    localStorage.removeItem(SESSION_KEY);
    state.user = null;
    $("appShell").classList.add("hidden");
    $("authView").classList.remove("hidden");
    showAuthTab("login");
  }

  function renderAccountsRegistry() {
    const box = $("accountsRegistryList");
    if (!box) return;
    const list = getAccounts();
    box.innerHTML = "";
    if (!list.length) {
      box.innerHTML = '<div class="acc-row">Пока нет аккаунтов</div>';
      return;
    }
    list.forEach((a) => {
      const row = document.createElement("div");
      row.className = "acc-row";
      row.textContent = `${a.nick} · @${a.username} · почта: ${a.email}`;
      box.appendChild(row);
    });
  }

  /* -------------------- ВХОД В ПРИЛОЖЕНИЕ И БЫСТРОЕ ПОДКЛЮЧЕНИЕ ЧАТА -------------------- */
  function saveRecentRoom(name) {
    if (!name || name.startsWith("zcall-test-")) return;
    state.savedRooms = [name, ...state.savedRooms.filter((r) => r !== name)].slice(0, 6);
    localStorage.setItem("zcall_rooms", JSON.stringify(state.savedRooms));
    renderRailRooms();
  }

  function renderRailRooms() {
    const box = $("serverRoomsRail");
    box.innerHTML = "";
    state.savedRooms.forEach((rName) => {
      const btn = document.createElement("button");
      btn.className = `rail-item ${state.roomName === rName ? "active" : ""}`;
      btn.title = rName;
      btn.textContent = rName.replace(/^zcall-/i, "").slice(0, 2).toUpperCase() || "ZC";
      btn.onclick = () => switchRoomFast(rName);
      box.appendChild(btn);
    });
  }

  function updateUserBarUI() {
    const nick = state.user?.nick || "Гость";
    const handle = state.user?.username ? `@${state.user.username}` : "В сети";
    $("userPanelName").textContent = nick;
    $("userPanelHandle").textContent = state.inCall ? "В звонке" : handle;
    $("userPanelAvatar").textContent = (nick[0] || "Z").toUpperCase();
    $("userPanelMicBtn").className = `mini-icon-btn ${state.micEnabled ? "" : "off"}`;
    $("userPanelMicBtn").innerHTML = state.micEnabled ? SVG.micOn : SVG.micOff;
    $("userPanelCamBtn").className = `mini-icon-btn ${state.camEnabled ? "" : "off"}`;
    $("userPanelCamBtn").innerHTML = state.camEnabled ? SVG.camOn : SVG.camOff;
  }

  function setConnStatus(kind, text) {
    const dot = $("connStatusPill").querySelector(".status-dot");
    const lbl = $("connStatusPill").querySelector("span:last-child");
    dot.className = `status-dot ${kind}`;
    lbl.textContent = text;
  }

  async function enterAppShell() {
    $("authView").classList.add("hidden");
    $("appShell").classList.remove("hidden");

    const hashRoom = decodeURIComponent((window.location.hash || "").replace(/^#/, "")).trim();
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    state.roomName = hashRoom || queryRoom || state.roomName || randomRoomName();

    $("roomInput").value = state.roomName;
    $("sidebarRoomName").textContent = state.roomName;
    $("roomTitleBadge").textContent = `общий-чат · ${state.roomName}`;
    $("sandboxIdInput").value = state.sandboxId;
    saveRecentRoom(state.roomName);
    updateUserBarUI();
    syncRoomSettingsUI();
    updateCallLayoutUI();

    // Подключаемся к чату мгновенно в фоне (0ms блокировки интерфейса!)
    await connectRoomChatOnly(state.roomName);
  }

  async function fetchSandboxTokenWithTimeout(roomName, identity) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const apiRoom = toAsciiId(roomName, "zcall-room");
      const res = await fetch(SANDBOX_ENDPOINT, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "X-Sandbox-ID": state.sandboxId, "Content-Type": "application/json" },
        body: JSON.stringify({ room_name: apiRoom, participant_name: identity })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data = await res.json();
      return { serverUrl: data.serverUrl || data.server_url, token: data.participantToken || data.participant_token };
    } finally {
      clearTimeout(timer);
    }
  }

  async function disconnectLiveKit() {
    clearInterval(state.timerInterval); clearInterval(state.statsInterval);
    stopBotEngine(); finishVoiceRecord(false);
    for (const it of state.audioEls.values()) it.el.remove();
    state.audioEls.clear(); state.profiles.clear();
    if (state.room) {
      const r = state.room; state.room = null;
      try { await r.disconnect(); } catch (_) {}
    }
    state.inCall = false; state.screenSharing = false; state.handRaised = false; state.pinnedIdentity = null;
  }

  async function connectRoomChatOnly(roomName) {
    if (!LK) { setConnStatus("bad", "SDK не загружен"); return; }
    if (state.isConnecting) return;
    state.isConnecting = true;
    setConnStatus("warn", "Подключение чата...");
    $("typingIndicator").textContent = "Подключение к комнате...";

    await disconnectLiveKit();
    state.roomName = roomName;
    window.location.hash = encodeURIComponent(roomName);
    $("sidebarRoomName").textContent = roomName;
    $("roomTitleBadge").textContent = `общий-чат · ${roomName}`;
    $("roomInput").value = roomName;

    const nick = state.user?.nick || "Гость";
    const uname = state.user?.username || "user";
    state.localIdentity = `${toAsciiId(uname, "user")}_${uid(5)}`;

    try {
      const { serverUrl, token } = await fetchSandboxTokenWithTimeout(roomName, state.localIdentity);
      const room = new LK.Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: getPublishDefaults()
      });
      state.room = room;
      setupRoomEvents(room);

      await Promise.race([
        room.connect(serverUrl, token, { autoSubscribe: true }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Таймаут подключения (10с)")), 10000))
      ]);

      state.profiles.set(state.localIdentity, {
        name: nick,
        username: uname,
        filter: state.filter,
        handRaised: false
      });

      setConnStatus("good", "Чат онлайн");
      $("typingIndicator").textContent = "Чат комнаты · онлайн";
      broadcastProfile();
      renderAllTiles();
    } catch (err) {
      console.error("Connect chat err:", err);
      setConnStatus("bad", "Ошибка связи (нажми сюда)");
      $("typingIndicator").textContent = `Ошибка: ${err.message}`;
    } finally {
      state.isConnecting = false;
    }
  }

  async function switchRoomFast(newRoom) {
    const clean = (newRoom || "").trim() || randomRoomName();
    state.messages = [];
    $("chatMessages").innerHTML = '<div class="chat-system-msg">Переход в комнату...</div>';
    saveRecentRoom(clean);
    await connectRoomChatOnly(clean);
    updateCallLayoutUI();
    showToast(`Открыта комната ${clean}`);
  }

  /* -------------------- НАЧАТЬ ЗВОНОК / ЗАВЕРШИТЬ ЗВОНОК -------------------- */
  function updateCallLayoutUI() {
    const inCall = state.inCall;
    $("startCallTopBtn").classList.toggle("hidden", inCall);
    $("endCallTopBtn").classList.toggle("hidden", !inCall);
    $("roomLiveStats").classList.toggle("hidden", !inCall);
    $("stageAndGrid").classList.toggle("hidden", !inCall);
    $("callDockBar").classList.toggle("hidden", !inCall);
    $("mainWorkspace").classList.toggle("chat-fullscreen", !inCall);
    $("closeChatBtn").classList.toggle("hidden", !inCall);

    $("navTextChannelBtn").classList.toggle("active", !inCall);
    $("navVoiceChannelBtn").classList.toggle("active", inCall);

    if (!inCall) {
      $("chatDrawer").classList.remove("hidden");
    } else {
      const showSideChat = window.innerWidth >= 900 ? true : state.chatOpen;
      $("chatDrawer").classList.toggle("hidden", !showSideChat);
    }
    updateDockButtons();
  }

  async function startCall({ withBot = false } = {}) {
    if (!state.room) {
      await connectRoomChatOnly(state.roomName);
      if (!state.room) { showToast("Сначала дождись подключения к серверу"); return; }
    }

    state.inCall = true;
    state.micEnabled = true;
    if (withBot) state.botEnabled = true;
    updateCallLayoutUI();
    startCallTimers();
    renderAllTiles();
    playSfx("join");

    if (withBot) startBotEngine(true);

    // Включаем микрофон и камеру параллельно БЕЗ блокировки экрана!
    const micPromise = Promise.race([
      state.room.localParticipant.setMicrophoneEnabled(true, getAudioCaptureOpts()),
      new Promise((_, rej) => setTimeout(() => rej(new Error("mic timeout")), 6000))
    ]).catch(() => { state.micEnabled = false; showToast("Микрофон не удалось включить"); });

    let camPromise = Promise.resolve();
    if (state.camEnabled) {
      camPromise = Promise.race([
        state.room.localParticipant.setCameraEnabled(true, getVideoCaptureOpts()),
        new Promise((_, rej) => setTimeout(() => rej(new Error("cam timeout")), 7000))
      ]).catch(() => { state.camEnabled = false; showToast("Камера не отвечает или занята"); });
    }

    await Promise.allSettled([micPromise, camPromise]);
    updateDockButtons();
    renderAllTiles();
    loadDevices();
  }

  async function endCall() {
    clearInterval(state.timerInterval);
    clearInterval(state.statsInterval);
    stopBotEngine();
    state.inCall = false;
    state.screenSharing = false;
    state.handRaised = false;
    state.pinnedIdentity = null;

    if (state.room) {
      await Promise.allSettled([
        state.room.localParticipant.setMicrophoneEnabled(false),
        state.room.localParticipant.setCameraEnabled(false),
        state.room.localParticipant.setScreenShareEnabled(false)
      ]);
    }
    updateCallLayoutUI();
    renderAllTiles();
  }

  /* -------------------- КАЧЕСТВО И СОБЫТИЯ LIVEKIT -------------------- */
  function getVideoCaptureOpts() {
    const dev = state.videoDeviceId ? { deviceId: state.videoDeviceId } : {};
    if (state.quality === "4k") return { ...dev, resolution: { width: 3840, height: 2160, frameRate: 30 } };
    if (state.quality === "720") return { ...dev, resolution: { width: 1280, height: 720, frameRate: 30 } };
    return { ...dev, resolution: { width: 1920, height: 1080, frameRate: 30 } };
  }

  function getAudioCaptureOpts() {
    const dev = state.audioDeviceId ? { deviceId: state.audioDeviceId } : {};
    if (state.cleanMic || state.audioPreset === "stereo") return { ...dev, autoGainControl: false, echoCancellation: true, noiseSuppression: false };
    return { ...dev, autoGainControl: true, echoCancellation: true, noiseSuppression: true };
  }

  function getPublishDefaults() {
    const camEncoding = state.quality === "4k" ? { maxBitrate: 10_000_000, maxFramerate: 60 }
      : state.quality === "720" ? { maxBitrate: 1_700_000, maxFramerate: 30 }
      : { maxBitrate: 4_500_000, maxFramerate: 60 };
    const screenEncoding = state.quality === "4k" ? { maxBitrate: 14_000_000, maxFramerate: 60 }
      : state.quality === "720" ? { maxBitrate: 2_500_000, maxFramerate: 30 }
      : { maxBitrate: 8_000_000, maxFramerate: 60 };
    const audioPreset = state.audioPreset === "stereo" ? LK.AudioPresets.musicHighQualityStereo
      : state.audioPreset === "speech" ? LK.AudioPresets.speech
      : LK.AudioPresets.musicHighQuality;
    return { audioPreset, forceStereo: state.audioPreset === "stereo", dtx: state.audioPreset === "speech", red: true, videoEncoding: camEncoding, screenShareEncoding: screenEncoding, simulcast: true, videoCodec: "vp9", backupCodec: { codec: "vp8" } };
  }

  function getScreenCaptureOpts() {
    const opts = { audio: true, contentHint: state.screenMode === "detail" ? "detail" : "motion" };
    if (!isSafari) {
      if (state.quality === "4k") opts.resolution = { width: 3840, height: 2160, frameRate: 60 };
      else if (state.quality === "720") opts.resolution = { width: 1280, height: 720, frameRate: 30 };
      else opts.resolution = { width: 1920, height: 1080, frameRate: 60 };
    }
    return opts;
  }

  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const fill = (sel, list, prefix, cur) => {
      if (!sel) return;
      sel.innerHTML = "";
      if (!list.length) { const o = document.createElement("option"); o.value = ""; o.textContent = "Нет устройств"; sel.appendChild(o); return; }
      list.forEach((d, i) => { const o = document.createElement("option"); o.value = d.deviceId; o.textContent = d.label || `${prefix} #${i + 1}`; sel.appendChild(o); });
      if (cur && list.some((d) => d.deviceId === cur)) sel.value = cur;
    };
    fill($("roomAudioSelect"), devices.filter((d) => d.kind === "audioinput"), "Микрофон", state.audioDeviceId);
    fill($("roomVideoSelect"), devices.filter((d) => d.kind === "videoinput"), "Камера", state.videoDeviceId);
  }

  function setupRoomEvents(room) {
    const RE = LK.RoomEvent;

    room.registerByteStreamHandler("zcall-file", async (reader, participantInfo) => {
      try {
        const info = reader.info || {};
        const result = await reader.readAll();
        const chunks = Array.isArray(result) ? result : [result];
        const mime = info.mimeType || "application/octet-stream";
        const blobUrl = URL.createObjectURL(new Blob(chunks, { type: mime }));
        const sender = getParticipantByIdentity(participantInfo?.identity);
        const fname = info.name || "file";
        const isVoice = fname.startsWith("zcall-voice-") || mime.startsWith("audio/");
        const isImage = !isVoice && mime.startsWith("image/");
        appendChatMessage({ id: info.id || uid(8), senderIdentity: participantInfo?.identity || "remote", senderName: displayNameOf(sender) || "Участник", voiceUrl: isVoice ? blobUrl : null, imageUrl: isImage ? blobUrl : null, fileUrl: !isImage && !isVoice ? blobUrl : null, fileName: fname, fileSize: info.size, time: Date.now() });
      } catch (e) { console.error(e); }
    });

    room
      .on(RE.ParticipantConnected, (p) => { showToast(`${displayNameOf(p)} в комнате`); setTimeout(broadcastProfile, 350); renderAllTiles(); })
      .on(RE.ParticipantDisconnected, (p) => { cleanupParticipantAudio(p.identity); if (state.pinnedIdentity === p.identity) state.pinnedIdentity = null; renderAllTiles(); })
      .on(RE.TrackSubscribed, (t, pub, p) => { if (t.kind === LK.Track.Kind.Audio) attachRemoteAudio(t, pub, p); renderAllTiles(); })
      .on(RE.TrackUnsubscribed, (t, pub, p) => { t.detach().forEach((el) => el.remove()); if (t.kind === LK.Track.Kind.Audio) removeAudioEl(`${p.identity}_${pub.source}`); renderAllTiles(); })
      .on(RE.LocalTrackPublished, () => renderAllTiles())
      .on(RE.LocalTrackUnpublished, () => renderAllTiles())
      .on(RE.TrackMuted, () => renderAllTiles())
      .on(RE.TrackUnmuted, () => renderAllTiles())
      .on(RE.ActiveSpeakersChanged, (speakers) => {
        const ids = new Set(speakers.map((s) => s.identity));
        document.querySelectorAll(".participant-tile").forEach((tile) => {
          tile.classList.toggle("speaking", tile.dataset.identity === "zcall-bot" ? state.botSpeaking : ids.has(tile.dataset.identity));
        });
      })
      .on(RE.AudioPlaybackStatusChanged, () => $("audioUnlockBanner").classList.toggle("hidden", room.canPlaybackAudio))
      .on(RE.Reconnecting, () => $("reconnectBanner").classList.remove("hidden"))
      .on(RE.Reconnected, () => $("reconnectBanner").classList.add("hidden"))
      .on(RE.DataReceived, (payload, participant, _kind, topic) => {
        try { handleIncomingData(topic, JSON.parse(decoder.decode(payload)), participant); } catch (_) {}
      });
  }

  function getParticipantByIdentity(id) {
    if (!state.room || !id) return null;
    return id === state.localIdentity ? state.room.localParticipant : state.room.remoteParticipants.get(id) || null;
  }

  async function sendData(topic, obj, reliable = true) {
    if (!state.room) return false;
    try { await state.room.localParticipant.publishData(encoder.encode(JSON.stringify(obj)), { reliable, topic }); return true; }
    catch { return false; }
  }

  function broadcastProfile() {
    sendData("zcall-profile", { name: state.user?.nick || "Гость", username: state.user?.username || "", filter: state.filter, handRaised: state.handRaised });
  }

  function handleIncomingData(topic, data, participant) {
    const id = participant?.identity;
    if (topic === "zcall-profile" && id) {
      state.profiles.set(id, { name: data.name || displayNameOf(participant), username: data.username || "", filter: data.filter || "none", handRaised: !!data.handRaised });
      renderAllTiles();
    } else if (topic === "zcall-reaction") {
      spawnFloatingReaction(data.emoji, data.name || displayNameOf(participant));
    } else if (topic === "zcall-chat") {
      appendChatMessage({ id: data.id, senderIdentity: id || data.senderIdentity, senderName: data.senderName || displayNameOf(participant), text: data.text, replyTo: data.replyTo || null, time: data.time || Date.now() });
    } else if (topic === "zcall-chat-react") {
      applyMessageReaction(data.msgId, data.emoji, id || data.senderIdentity);
    } else if (topic === "zcall-typing") {
      showRemoteTyping(data.name || displayNameOf(participant));
    }
  }

  function attachRemoteAudio(track, pub, participant) {
    const key = `${participant.identity}_${pub.source}`;
    removeAudioEl(key);
    const el = track.attach();
    el.autoplay = true; el.playsInline = true; el.style.display = "none";
    el.volume = Math.max(0, Math.min(1, (state.volumes.get(participant.identity) ?? 100) / 100));
    document.body.appendChild(el);
    state.audioEls.set(key, { el, identity: participant.identity });
    el.play().catch(() => { if (state.room && !state.room.canPlaybackAudio) $("audioUnlockBanner").classList.remove("hidden"); });
  }
  function removeAudioEl(key) { const it = state.audioEls.get(key); if (it) { it.el.remove(); state.audioEls.delete(key); } }
  function cleanupParticipantAudio(id) { for (const [k, it] of state.audioEls.entries()) if (it.identity === id) { it.el.remove(); state.audioEls.delete(k); } }
  function setParticipantVolume(id, v) { state.volumes.set(id, v); for (const it of state.audioEls.values()) if (it.identity === id) it.el.volume = Math.max(0, Math.min(1, v / 100)); }

  /* -------------------- ТЕСТ-БОТ -------------------- */
  function startBotEngine(report = false) {
    state.botEnabled = true;
    $("toggleBotBtn").classList.add("active");
    renderAllTiles();
    if (report) {
      setTimeout(() => {
        appendChatMessage({
          id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот",
          text: `Проверка звонка запущена!\n• Аккаунт: ${state.user?.nick} (@${state.user?.username})\n• Комната: ${state.roomName}\n• Связь: ${state.room ? "Подключён к LiveKit" : "Ожидание"}\n\nНажми «Эхо-тест 4с» на моей карточке, чтобы проверить свой микрофон, или напиши сюда (по словам «фото», «голос», «экран» сделаю тест).`,
          time: Date.now()
        });
      }, 300);
    }
  }

  function stopBotEngine() {
    state.botEnabled = false; state.botScreenTest = false; state.botSpeaking = false;
    $("toggleBotBtn").classList.remove("active");
    renderAllTiles();
  }

  function mountBotCanvasLoop(canvas, isStage = false) {
    if (!canvas) return;
    canvas.width = isStage ? 1280 : 640; canvas.height = isStage ? 720 : 400;
    const ctx = canvas.getContext("2d");
    let t = 0;
    const draw = () => {
      if (!state.botEnabled || !document.body.contains(canvas)) return;
      t += 0.04;
      const w = canvas.width, h = canvas.height;
      const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#0b1020"); g.addColorStop(1, "#161d36");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(88, 101, 242, 0.35)"; ctx.lineWidth = isStage ? 2 : 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 24) {
          const amp = (state.botSpeaking ? 36 : 14) * (1 - i * 0.2);
          const y = h / 2 + Math.sin(x * 0.012 + t + i * 1.4) * amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      const r = (isStage ? 70 : 42) + (state.botSpeaking ? Math.sin(t * 4) * 8 : 0);
      ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = state.botSpeaking ? "rgba(35, 165, 90, 0.25)" : "rgba(88, 101, 242, 0.22)";
      ctx.fill(); ctx.strokeStyle = state.botSpeaking ? "#23a55a" : "#5865f2"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#f2f4f8"; ctx.textAlign = "center"; ctx.font = `700 ${isStage ? 26 : 16}px Inter, sans-serif`;
      ctx.fillText(isStage ? "Тест экрана · 1080p HQ" : "Zcall Тест-Бот", w / 2, h / 2 + (isStage ? 120 : 78));
      ctx.fillStyle = "#949ba8"; ctx.font = `500 ${isStage ? 16 : 12}px Inter, sans-serif`;
      ctx.fillText(state.botEchoRecording ? "Записываю 4 сек..." : state.botSpeaking ? "Воспроизвожу эхо..." : "Готов к проверке", w / 2, h / 2 + (isStage ? 148 : 98));
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  async function runBotEchoTest() {
    if (state.botEchoRecording) return;
    let tempStream = null;
    try {
      const curTrack = state.room?.localParticipant?.getTrackPublication(LK.Track.Source.Microphone)?.track?.mediaStreamTrack;
      const recStream = (curTrack && curTrack.readyState === "live" && state.micEnabled)
        ? new MediaStream([curTrack.clone()])
        : (tempStream = await navigator.mediaDevices.getUserMedia({ audio: state.audioDeviceId ? { deviceId: state.audioDeviceId } : true }));

      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
      const recorder = mime ? new MediaRecorder(recStream, { mimeType: mime }) : new MediaRecorder(recStream);
      const chunks = [];
      state.botEchoRecording = true;
      showToast("Говорите — запись 4 секунды...");
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        state.botEchoRecording = false;
        recStream.getTracks().forEach((t) => t.stop());
        const url = URL.createObjectURL(new Blob(chunks, { type: mime || "audio/webm" }));
        const audio = new Audio(url);
        audio.volume = Math.max(0, Math.min(1, (state.volumes.get("zcall-bot") ?? 100) / 100));
        state.botSpeaking = true;
        document.querySelector('.participant-tile[data-identity="zcall-bot"]')?.classList.add("speaking");
        audio.onended = () => { state.botSpeaking = false; document.querySelector('.participant-tile[data-identity="zcall-bot"]')?.classList.remove("speaking"); URL.revokeObjectURL(url); };
        audio.play().catch(() => { state.botSpeaking = false; });
      };
      recorder.start();
      setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, 4000);
    } catch {
      state.botEchoRecording = false;
      tempStream?.getTracks().forEach((t) => t.stop());
      showToast("Нет доступа к микрофону");
    }
  }

  function makeTestImageBlob() {
    return new Promise((res) => {
      const c = document.createElement("canvas"); c.width = 800; c.height = 450;
      const ctx = c.getContext("2d");
      const g = ctx.createLinearGradient(0, 0, 800, 450); g.addColorStop(0, "#1e1b4b"); g.addColorStop(1, "#0f172a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 450);
      ctx.strokeStyle = "#5865f2"; ctx.lineWidth = 4; ctx.strokeRect(24, 24, 752, 402);
      ctx.fillStyle = "#fff"; ctx.font = "bold 34px Inter, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Zcall · Тестовая картинка", 400, 215);
      c.toBlob(res, "image/png");
    });
  }

  function makeTestVoiceWavBlob() {
    const sr = 22050, len = Math.floor(sr * 1.4), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); ws(8, "WAVE"); ws(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    ws(36, "data"); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      const t = i / sr, f = t < 0.45 ? 523.25 : t < 0.9 ? 659.25 : 783.99;
      v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * f * t) * Math.exp(-3 * (t % 0.45)) * 12000, true);
    }
    return new Blob([buf], { type: "audio/wav" });
  }

  async function runBotChatTest() {
    const img = await makeTestImageBlob();
    if (img) appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", text: "Тест фото:", imageUrl: URL.createObjectURL(img), fileName: "test.png", time: Date.now() });
    appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", voiceUrl: URL.createObjectURL(makeTestVoiceWavBlob()), fileName: "voice.wav", time: Date.now() });
  }

  function handleBotReplyToUser(userMsg) {
    if (!state.botEnabled) return;
    const low = (userMsg.text || "").toLowerCase();
    setTimeout(async () => {
      if (!state.botEnabled) return;
      applyMessageReaction(userMsg.id, "👍", "zcall-bot");
      if (low.includes("фото") || low.includes("картин")) {
        const blob = await makeTestImageBlob();
        appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", text: "Тестовое фото:", imageUrl: URL.createObjectURL(blob), fileName: "test.png", replyTo: { id: userMsg.id, senderName: userMsg.senderName, preview: userMsg.text }, time: Date.now() });
      } else if (low.includes("голос")) {
        appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", voiceUrl: URL.createObjectURL(makeTestVoiceWavBlob()), fileName: "voice.wav", time: Date.now() });
      } else if (low.includes("экран")) {
        state.botScreenTest = !state.botScreenTest; renderAllTiles();
      } else {
        appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", text: `Принял: "${userMsg.text}". Чат работает!`, replyTo: { id: userMsg.id, senderName: userMsg.senderName, preview: userMsg.text }, time: Date.now() });
      }
    }, 500);
  }

  /* -------------------- СЕТКА ЗВОНКА -------------------- */
  function renderAllTiles() {
    if (!state.room) return;
    const remotes = Array.from(state.room.remoteParticipants.values());
    const allReal = [state.room.localParticipant, ...remotes];
    const totalCount = allReal.length + (state.botEnabled ? 1 : 0);

    $("participantCountNum").textContent = String(totalCount);
    $("tabParticipantsCount").textContent = String(totalCount);
    $("sidebarVoiceBadge").textContent = String(state.inCall ? totalCount : 0);

    const tree = $("sidebarVoiceMembers");
    tree.innerHTML = "";
    if (state.inCall) {
      allReal.forEach((p) => {
        const row = document.createElement("div"); row.className = "tree-member";
        const dot = document.createElement("span"); dot.className = "tree-dot";
        const nm = document.createElement("span"); nm.textContent = p.identity === state.localIdentity ? (state.user?.nick || "Вы") : displayNameOf(p);
        row.append(dot, nm); tree.appendChild(row);
      });
      if (state.botEnabled) {
        const row = document.createElement("div"); row.className = "tree-member";
        row.innerHTML = '<span class="tree-dot"></span><span>Zcall Тест-Бот</span>';
        tree.appendChild(row);
      }
    }

    renderParticipantsTab(allReal);
    if (!state.inCall) return;

    let stageTrack = null, stageOwner = null, isScreenOnStage = false, isBotStage = false;
    for (const p of allReal) {
      const sp = p.getTrackPublication(LK.Track.Source.ScreenShare);
      if (sp?.track && !sp.isMuted) { stageTrack = sp.track; stageOwner = p; isScreenOnStage = true; break; }
    }
    if (!stageTrack && state.botEnabled && state.botScreenTest) { isBotStage = true; isScreenOnStage = true; }
    else if (!stageTrack && state.pinnedIdentity) {
      const pp = getParticipantByIdentity(state.pinnedIdentity);
      const cp = pp?.getTrackPublication(LK.Track.Source.Camera);
      if (cp?.track && !cp.isMuted) { stageTrack = cp.track; stageOwner = pp; }
    }

    const stageAndGrid = $("stageAndGrid"), stageWrapper = $("stageWrapper"), stageArea = $("stageVideoArea");
    if (isBotStage) {
      stageAndGrid.classList.add("has-stage"); stageWrapper.classList.remove("hidden");
      $("stageTitle").textContent = "Тест экрана"; $("stagePresenterName").textContent = "· Zcall Бот";
      $("stageClosePinBtn").classList.add("hidden"); stageArea.innerHTML = "";
      const c = document.createElement("canvas"); c.ondblclick = toggleStageFullscreen;
      stageArea.appendChild(c); mountBotCanvasLoop(c, true);
    } else if (stageTrack && stageOwner) {
      stageAndGrid.classList.add("has-stage"); stageWrapper.classList.remove("hidden");
      $("stageTitle").textContent = isScreenOnStage ? "Демонстрация экрана" : "Закреплено";
      $("stagePresenterName").textContent = `· ${displayNameOf(stageOwner)}`;
      $("stageClosePinBtn").classList.toggle("hidden", isScreenOnStage);
      stageArea.innerHTML = "";
      const vEl = stageTrack.attach(); vEl.autoplay = true; vEl.playsInline = true;
      vEl.muted = stageOwner.identity === state.localIdentity; vEl.ondblclick = toggleStageFullscreen;
      stageArea.appendChild(vEl);
    } else {
      stageAndGrid.classList.remove("has-stage"); stageWrapper.classList.add("hidden"); stageArea.innerHTML = "";
    }

    const grid = $("videoGrid");
    grid.innerHTML = "";
    allReal.forEach((p) => {
      const isLocal = p.identity === state.localIdentity;
      const prof = state.profiles.get(p.identity) || {};
      const name = isLocal ? (state.user?.nick || "Вы") : displayNameOf(p);
      const hand = isLocal ? state.handRaised : !!prof.handRaised;
      const filter = isLocal ? state.filter : prof.filter || "none";

      const tile = document.createElement("div"); tile.className = "participant-tile"; tile.dataset.identity = p.identity;
      if (p.isSpeaking) tile.classList.add("speaking");

      const camPub = p.getTrackPublication(LK.Track.Source.Camera);
      const micPub = p.getTrackPublication(LK.Track.Source.Microphone);
      const hasVideo = camPub?.track && !camPub.isMuted;
      const isMicMuted = isLocal ? !state.micEnabled : (!micPub || micPub.isMuted);

      if (hasVideo) {
        const v = camPub.track.attach(); v.autoplay = true; v.playsInline = true; v.muted = true;
        if (isLocal && state.mirrorSelf) v.classList.add("mirrored");
        if (filter !== "none") v.classList.add(`filter-${filter}`);
        tile.appendChild(v);
      } else {
        const av = document.createElement("div"); av.className = "avatar-circle"; av.textContent = (name[0] || "Z").toUpperCase();
        tile.appendChild(av);
      }

      if (hand) {
        const tb = document.createElement("div"); tb.className = "tile-top-badges";
        const hb = document.createElement("span"); hb.className = "tile-pill hand-badge"; hb.textContent = "Рука поднята";
        tb.appendChild(hb); tile.appendChild(tb);
      }

      const bar = document.createElement("div"); bar.className = "tile-bottom-bar";
      const nw = document.createElement("div"); nw.className = "tile-name-wrap";
      const ms = document.createElement("span"); ms.innerHTML = isMicMuted ? SVG.micOff : SVG.micOn;
      const ns = document.createElement("span"); ns.className = "tile-name"; ns.textContent = isLocal ? `${name} (Вы)` : name;
      nw.append(ms, ns);

      const acts = document.createElement("div"); acts.className = "tile-actions";
      if (!isLocal) {
        const sl = document.createElement("input"); sl.type = "range"; sl.min = "0"; sl.max = "100";
        sl.value = String(state.volumes.get(p.identity) ?? 100); sl.className = "tile-vol-slider";
        sl.oninput = (e) => setParticipantVolume(p.identity, Number(e.target.value));
        acts.appendChild(sl);
      }
      if (hasVideo) {
        const pb = document.createElement("button"); pb.className = "tile-mini-btn"; pb.innerHTML = SVG.pin;
        pb.onclick = () => { state.pinnedIdentity = state.pinnedIdentity === p.identity ? null : p.identity; renderAllTiles(); };
        acts.appendChild(pb);
      }
      bar.append(nw, acts); tile.appendChild(bar); grid.appendChild(tile);
    });

    if (state.botEnabled) {
      const tile = document.createElement("div"); tile.className = "participant-tile"; tile.dataset.identity = "zcall-bot";
      if (state.botSpeaking) tile.classList.add("speaking");
      const canvas = document.createElement("canvas"); canvas.className = "bot-canvas"; tile.appendChild(canvas);
      mountBotCanvasLoop(canvas, false);

      const bc = document.createElement("div"); bc.className = "bot-tile-controls";
      const eb = document.createElement("button"); eb.className = "bot-action-chip"; eb.textContent = state.botEchoRecording ? "Запись 4с..." : "Эхо-тест 4с"; eb.onclick = runBotEchoTest;
      const sb = document.createElement("button"); sb.className = "bot-action-chip"; sb.textContent = state.botScreenTest ? "Убрать экран" : "Тест экрана"; sb.onclick = () => { state.botScreenTest = !state.botScreenTest; renderAllTiles(); };
      const cb = document.createElement("button"); cb.className = "bot-action-chip"; cb.textContent = "Тест чата"; cb.onclick = runBotChatTest;
      bc.append(eb, sb, cb); tile.appendChild(bc);

      const bar = document.createElement("div"); bar.className = "tile-bottom-bar";
      const nw = document.createElement("div"); nw.className = "tile-name-wrap";
      nw.innerHTML = `${SVG.micOn}<span class="tile-name">Zcall Тест-Бот</span>`;
      const acts = document.createElement("div"); acts.className = "tile-actions";
      const sl = document.createElement("input"); sl.type = "range"; sl.min = "0"; sl.max = "100";
      sl.value = String(state.volumes.get("zcall-bot") ?? 100); sl.className = "tile-vol-slider";
      sl.oninput = (e) => state.volumes.set("zcall-bot", Number(e.target.value));
      acts.appendChild(sl); bar.append(nw, acts); tile.appendChild(bar); grid.appendChild(tile);
    }
  }

  function renderParticipantsTab(allReal) {
    const list = $("participantsList"); if (!list) return;
    list.innerHTML = "";
    const items = allReal.map((p) => {
      const isLocal = p.identity === state.localIdentity;
      const prof = state.profiles.get(p.identity) || {};
      const mp = p.getTrackPublication(LK.Track.Source.Microphone);
      const cp = p.getTrackPublication(LK.Track.Source.Camera);
      return {
        name: isLocal ? `${state.user?.nick || "Вы"} (Вы)` : displayNameOf(p),
        sub: isLocal ? `@${state.user?.username || ""}` : (prof.username ? `@${prof.username}` : "В комнате"),
        micOn: isLocal ? (state.inCall && state.micEnabled) : !!(mp && !mp.isMuted),
        camOn: isLocal ? (state.inCall && state.camEnabled) : !!(cp && !cp.isMuted)
      };
    });
    if (state.botEnabled) items.push({ name: "Zcall Тест-Бот", sub: "Проверка", micOn: true, camOn: true });
    items.forEach((it) => {
      const row = document.createElement("div"); row.className = "p-list-item";
      row.innerHTML = `<div class="p-list-left"><div class="p-mini-av">${(it.name[0] || "Z").toUpperCase()}</div><div><div class="p-list-name"></div><div class="p-list-role"></div></div></div><div class="p-list-right">${it.micOn ? SVG.micOn : SVG.micOff}${it.camOn ? SVG.camOn : SVG.camOff}</div>`;
      row.querySelector(".p-list-name").textContent = it.name;
      row.querySelector(".p-list-role").textContent = it.sub;
      list.appendChild(row);
    });
  }

  function toggleStageFullscreen() { const el = $("stageWrapper"); if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.().catch(() => {}); }
  async function toggleStagePiP() {
    const vid = $("stageVideoArea").querySelector("video");
    if (!vid || !document.pictureInPictureEnabled) { showToast("PiP доступен для видеопотока"); return; }
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await vid.requestPictureInPicture(); } catch (_) {}
  }

  function updateDockButtons() {
    $("micBtn").className = `dock-btn ${state.micEnabled ? "active" : "off"}`;
    $("micBtnIcon").innerHTML = state.micEnabled ? SVG.micOn : SVG.micOff;
    $("camBtn").className = `dock-btn ${state.camEnabled ? "active" : "off"}`;
    $("camBtnIcon").innerHTML = state.camEnabled ? SVG.camOn : SVG.camOff;
    $("screenBtn").className = `dock-btn ${state.screenSharing ? "highlight" : ""}`;
    $("handBtn").className = `dock-btn ${state.handRaised ? "highlight" : ""}`;
    $("chatToggleBtn").className = `dock-btn ${state.chatOpen ? "highlight" : ""}`;
    updateUserBarUI();
  }

  async function toggleMic() {
    if (!state.inCall) { state.micEnabled = !state.micEnabled; updateDockButtons(); return; }
    const next = !state.micEnabled;
    try { await state.room.localParticipant.setMicrophoneEnabled(next, getAudioCaptureOpts()); state.micEnabled = next; updateDockButtons(); renderAllTiles(); }
    catch { showToast("Нет доступа к микрофону"); }
  }

  async function toggleCam() {
    if (!state.inCall) { state.camEnabled = !state.camEnabled; updateDockButtons(); return; }
    const next = !state.camEnabled;
    try { await state.room.localParticipant.setCameraEnabled(next, getVideoCaptureOpts()); state.camEnabled = next; updateDockButtons(); renderAllTiles(); }
    catch { showToast("Нет доступа к камере"); }
  }

  async function toggleScreenShare() {
    if (!state.inCall || !state.room) return;
    if (!canScreenShare) { showToast("Этот браузер не разрешает отдавать свой экран."); return; }
    const next = !state.screenSharing;
    try {
      const pd = getPublishDefaults();
      await state.room.localParticipant.setScreenShareEnabled(next, getScreenCaptureOpts(), next ? { screenShareEncoding: pd.screenShareEncoding, degradationPreference: state.screenMode === "detail" ? "maintain-resolution" : "maintain-framerate", simulcast: true } : undefined);
      state.screenSharing = next; updateDockButtons(); renderAllTiles();
    } catch (e) { state.screenSharing = false; updateDockButtons(); if (e?.name !== "NotAllowedError") showToast("Не удалось показать экран"); }
  }

  function toggleHand() { state.handRaised = !state.handRaised; updateDockButtons(); broadcastProfile(); renderAllTiles(); }

  function spawnFloatingReaction(emoji, senderName) {
    const item = document.createElement("div"); item.className = "floating-reaction"; item.style.left = `${15 + Math.random() * 70}%`;
    const em = document.createElement("span"); em.className = "emoji"; em.textContent = emoji;
    const sn = document.createElement("span"); sn.className = "sender"; sn.textContent = senderName;
    item.append(em, sn); $("reactionsOverlay").appendChild(item);
    setTimeout(() => item.remove(), 2700);
  }

  /* -------------------- ЧАТ -------------------- */
  function toggleChat(forceState) {
    if (!state.inCall) { $("chatDrawer").classList.remove("hidden"); return; }
    state.chatOpen = typeof forceState === "boolean" ? forceState : !state.chatOpen;
    $("chatDrawer").classList.toggle("hidden", !state.chatOpen);
    if (state.chatOpen) { state.unreadCount = 0; $("chatBadge").classList.add("hidden"); $("chatMessages").scrollTop = $("chatMessages").scrollHeight; }
    updateDockButtons();
  }

  function switchSidebarTab(tab) {
    $("tabChatBtn").classList.toggle("active", tab === "chat");
    $("tabParticipantsBtn").classList.toggle("active", tab === "participants");
    $("chatTabPanel").classList.toggle("hidden", tab !== "chat");
    $("participantsTabPanel").classList.toggle("hidden", tab !== "participants");
  }

  function appendChatMessage(msg) {
    const rec = { ...msg, reactions: msg.reactions || {} };
    state.messages.push(rec);
    renderSingleMessage(rec);
    if (rec.senderIdentity !== state.localIdentity) {
      playSfx("chat");
      if (state.inCall && !state.chatOpen) {
        state.unreadCount++; $("chatBadge").textContent = String(state.unreadCount); $("chatBadge").classList.remove("hidden");
      }
    }
    $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  }

  function renderTextWithLinks(container, text) {
    text.split(/(https?:\/\/[^\s]+)/g).forEach((part) => {
      if (/^https?:\/\/[^\s]+$/.test(part)) {
        const a = document.createElement("a"); a.href = part; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = part;
        container.appendChild(a);
      } else container.appendChild(document.createTextNode(part));
    });
  }

  function createVoicePlayerEl(url) {
    const wrap = document.createElement("div"); wrap.className = "msg-voice-player";
    const audio = new Audio(url);
    const btn = document.createElement("button"); btn.className = "voice-play-btn"; btn.innerHTML = SVG.play;
    const track = document.createElement("div"); track.className = "voice-track";
    const bg = document.createElement("div"); bg.className = "voice-progress-bg";
    const fill = document.createElement("div"); fill.className = "voice-progress-fill"; bg.appendChild(fill);
    const dur = document.createElement("span"); dur.className = "voice-duration"; dur.textContent = "Голосовое";
    track.append(bg, dur); wrap.append(btn, track);
    audio.addEventListener("loadedmetadata", () => { if (isFinite(audio.duration)) dur.textContent = formatSec(audio.duration); });
    audio.addEventListener("timeupdate", () => { if (isFinite(audio.duration) && audio.duration > 0) { fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`; dur.textContent = formatSec(audio.currentTime); } });
    audio.addEventListener("ended", () => { btn.innerHTML = SVG.play; fill.style.width = "0%"; });
    btn.onclick = () => { if (audio.paused) { audio.play().catch(() => {}); btn.innerHTML = SVG.pause; } else { audio.pause(); btn.innerHTML = SVG.play; } };
    return wrap;
  }

  function renderSingleMessage(msg) {
    const isSelf = msg.senderIdentity === state.localIdentity;
    const row = document.createElement("div"); row.className = `msg-row ${isSelf ? "self" : ""}`; row.dataset.msgId = msg.id;
    const bubble = document.createElement("div"); bubble.className = "msg-bubble";
    if (!isSelf) { const a = document.createElement("div"); a.className = "msg-author"; a.textContent = msg.senderName || "Участник"; bubble.appendChild(a); }
    if (msg.replyTo) {
      const q = document.createElement("div"); q.className = "msg-quote";
      const qa = document.createElement("strong"); qa.textContent = msg.replyTo.senderName;
      const qt = document.createElement("span"); qt.textContent = msg.replyTo.preview;
      q.append(qa, qt); bubble.appendChild(q);
    }
    if (msg.voiceUrl) bubble.appendChild(createVoicePlayerEl(msg.voiceUrl));
    if (msg.imageUrl) { const img = document.createElement("img"); img.className = "msg-image"; img.src = msg.imageUrl; img.onclick = () => openLightbox(msg.imageUrl, msg.fileName || "Изображение"); bubble.appendChild(img); }
    if (msg.fileUrl) {
      const fc = document.createElement("div"); fc.className = "msg-file-card";
      const meta = document.createElement("div");
      const fn = document.createElement("span"); fn.className = "msg-file-name"; fn.textContent = msg.fileName || "Файл";
      const fs = document.createElement("span"); fs.className = "msg-file-size"; fs.textContent = formatBytes(msg.fileSize);
      meta.append(fn, fs);
      const dl = document.createElement("a"); dl.className = "ghost-btn"; dl.href = msg.fileUrl; dl.download = msg.fileName || "file"; dl.innerHTML = SVG.download;
      fc.append(meta, dl); bubble.appendChild(fc);
    }
    if (msg.text) { const txt = document.createElement("div"); txt.className = "msg-text"; renderTextWithLinks(txt, msg.text); bubble.appendChild(txt); }

    const footer = document.createElement("div"); footer.className = "msg-footer";
    const reactBox = document.createElement("div"); reactBox.className = "msg-reactions";
    const timeEl = document.createElement("span"); timeEl.className = "msg-time"; timeEl.textContent = formatTime(msg.time);
    if (isSelf) { const chk = document.createElement("span"); chk.innerHTML = SVG.checks; timeEl.appendChild(chk); }
    footer.append(reactBox, timeEl); bubble.appendChild(footer);

    const hb = document.createElement("div"); hb.className = "msg-hover-actions";
    const rb = document.createElement("button"); rb.innerHTML = `${SVG.reply}<span>Ответить</span>`; rb.onclick = () => startReply(msg); hb.appendChild(rb);
    if (msg.text) {
      const cb = document.createElement("button"); cb.innerHTML = `${SVG.copy}<span>Копировать</span>`;
      cb.onclick = () => navigator.clipboard?.writeText(msg.text).then(() => showToast("Скопировано"));
      hb.appendChild(cb);
    }
    ["❤️", "👍", "🔥"].forEach((em) => { const b = document.createElement("button"); b.textContent = em; b.onclick = () => toggleChatReaction(msg.id, em); hb.appendChild(b); });

    row.append(bubble, hb); $("chatMessages").appendChild(row);
  }

  function startReply(msg) {
    state.replyTo = { id: msg.id, senderName: msg.senderName, preview: msg.text || (msg.voiceUrl ? "Голосовое" : msg.imageUrl ? "Фото" : msg.fileName || "Файл") };
    $("replyPreviewAuthor").textContent = `Ответ для ${msg.senderName}`;
    $("replyPreviewText").textContent = state.replyTo.preview;
    $("replyPreviewBar").classList.remove("hidden"); $("chatInput").focus();
  }
  function cancelReply() { state.replyTo = null; $("replyPreviewBar").classList.add("hidden"); }

  function toggleChatReaction(msgId, emoji) { applyMessageReaction(msgId, emoji, state.localIdentity); sendData("zcall-chat-react", { msgId, emoji }); }
  function applyMessageReaction(msgId, emoji, userId) {
    const msg = state.messages.find((m) => m.id === msgId); if (!msg) return;
    if (!msg.reactions[emoji]) msg.reactions[emoji] = new Set();
    if (msg.reactions[emoji].has(userId)) { msg.reactions[emoji].delete(userId); if (!msg.reactions[emoji].size) delete msg.reactions[emoji]; }
    else msg.reactions[emoji].add(userId);
    const row = $("chatMessages").querySelector(`.msg-row[data-msg-id="${CSS.escape(msgId)}"]`); if (!row) return;
    const box = row.querySelector(".msg-reactions"); box.innerHTML = "";
    Object.entries(msg.reactions).forEach(([em, users]) => {
      const chip = document.createElement("button"); chip.className = "msg-react-chip"; chip.textContent = `${em} ${users.size}`;
      chip.onclick = () => toggleChatReaction(msgId, em); box.appendChild(chip);
    });
  }

  async function sendChatText() {
    const input = $("chatInput"), text = input.value.trim();
    if (!text) return;
    const msg = { id: uid(9), senderIdentity: state.localIdentity || "local", senderName: state.user?.nick || "Я", text, replyTo: state.replyTo ? { ...state.replyTo } : null, time: Date.now() };
    input.value = ""; input.style.height = "auto"; cancelReply();
    appendChatMessage(msg);
    if (state.room) await sendData("zcall-chat", msg);
    else showToast("Чат ещё подключается — подожди секунду и нажми на статус сверху, если не подключился");
    handleBotReplyToUser(msg);
  }

  async function sendFiles(fileList, forceVoice = false) {
    if (!fileList?.length) return;
    for (const file of fileList) {
      if (file.size > 25 * 1024 * 1024) { showToast(`Файл ${file.name} больше 25 МБ`); continue; }
      const url = URL.createObjectURL(file);
      const isVoice = forceVoice || (file.name || "").startsWith("zcall-voice-");
      const isImg = !isVoice && (file.type || "").startsWith("image/");
      appendChatMessage({ id: uid(9), senderIdentity: state.localIdentity || "local", senderName: state.user?.nick || "Я", voiceUrl: isVoice ? url : null, imageUrl: isImg ? url : null, fileUrl: !isImg && !isVoice ? url : null, fileName: file.name || "file", fileSize: file.size, time: Date.now() });
      if (state.room) {
        try { await state.room.localParticipant.sendFile(file, { topic: "zcall-file", mimeType: file.type || "application/octet-stream" }); }
        catch { showToast(`Ошибка отправки ${file.name}`); }
      }
    }
  }

  async function startVoiceRecord() {
    if (state.voiceRecorder) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: state.audioDeviceId ? { deviceId: state.audioDeviceId } : true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      state.voiceChunks = [];
      state.voiceRecorder = { rec, stream, mime, send: false };
      rec.ondataavailable = (e) => { if (e.data.size) state.voiceChunks.push(e.data); };
      rec.onstop = () => {
        const info = state.voiceRecorder; clearInterval(state.voiceTimerInt);
        info.stream.getTracks().forEach((t) => t.stop());
        $("voiceRecordingBar").classList.add("hidden"); $("chatTextBar").classList.remove("hidden");
        if (info.send && state.voiceChunks.length) {
          const ext = (info.mime || "").includes("mp4") ? "m4a" : "webm";
          const blob = new Blob(state.voiceChunks, { type: info.mime || "audio/webm" });
          sendFiles([new File([blob], `zcall-voice-${Date.now()}.${ext}`, { type: blob.type })], true);
        }
        state.voiceRecorder = null;
      };
      rec.start(); state.voiceStartedAt = Date.now();
      $("voiceRecTimer").textContent = "00:00";
      $("chatTextBar").classList.add("hidden"); $("voiceRecordingBar").classList.remove("hidden");
      state.voiceTimerInt = setInterval(() => { $("voiceRecTimer").textContent = formatSec((Date.now() - state.voiceStartedAt) / 1000); }, 300);
    } catch { showToast("Нет доступа к микрофону"); }
  }
  function finishVoiceRecord(send) { if (state.voiceRecorder) { state.voiceRecorder.send = send; if (state.voiceRecorder.rec.state !== "inactive") state.voiceRecorder.rec.stop(); } }

  function showRemoteTyping(name) {
    $("typingIndicator").textContent = `${name} печатает...`;
    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => { $("typingIndicator").textContent = "Чат комнаты · онлайн"; }, 2200);
  }
  function openLightbox(url, cap) {
    $("lightboxImg").src = url; $("lightboxCaption").textContent = cap;
    $("lightboxDownload").href = url; $("lightboxDownload").download = cap;
    $("lightboxModal").classList.remove("hidden");
  }

  function startCallTimers() {
    state.callStartedAt = Date.now();
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => { $("callTimer").textContent = formatSec((Date.now() - state.callStartedAt) / 1000); }, 1000);
    clearInterval(state.statsInterval);
    state.statsInterval = setInterval(updateRoomStats, 3000);
  }
  function updateRoomStats() {
    if (!state.room || $("settingsModal").classList.contains("hidden")) return;
    const lp = state.room.localParticipant;
    const lines = [`Комната: ${state.roomName}`, `Видео: ${state.quality === "4k" ? "4K" : state.quality + "p"}`, `Звук: ${state.audioPreset}`];
    const cs = lp.getTrackPublication(LK.Track.Source.Camera)?.track?.mediaStreamTrack?.getSettings?.();
    if (cs) lines.push(`Камера: ${cs.width || "?"}x${cs.height || "?"} @ ${Math.round(cs.frameRate || 0)} FPS`);
    $("statsBox").textContent = lines.join("\n");
  }

  function syncRoomSettingsUI() {
    $("roomQualitySelect").value = state.quality;
    $("roomAudioPresetSelect").value = state.audioPreset;
    $("roomScreenModeSelect").value = state.screenMode;
    $("roomFilterSelect").value = state.filter;
    $("roomThemeSelect").value = state.theme;
    $("cleanMicToggle").checked = state.cleanMic;
    $("mirrorSelfToggle").checked = state.mirrorSelf;
    $("uiSoundsToggle").checked = state.uiSounds;
  }

  async function applyQualityMidCall() {
    if (!state.inCall || !state.room) return;
    if (state.camEnabled) { await state.room.localParticipant.setCameraEnabled(false); await state.room.localParticipant.setCameraEnabled(true, getVideoCaptureOpts()); }
    if (state.micEnabled) { await state.room.localParticipant.setMicrophoneEnabled(false); await state.room.localParticipant.setMicrophoneEnabled(true, getAudioCaptureOpts()); }
    renderAllTiles();
  }

  /* -------------------- СТАРТ -------------------- */
  function init() {
    applyTheme(state.theme);

    const hashRoom = decodeURIComponent((window.location.hash || "").replace(/^#/, "")).trim();
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    if (hashRoom || queryRoom) state.roomName = hashRoom || queryRoom;

    $("authTabReg").onclick = () => showAuthTab("reg");
    $("authTabLogin").onclick = () => showAuthTab("login");
    $("regForm").onsubmit = handleRegister;
    $("loginForm").onsubmit = handleLogin;
    $("logoutAccountBtn").onclick = logoutAccount;

    document.querySelectorAll("[data-set-theme]").forEach((b) => b.onclick = () => applyTheme(b.dataset.setTheme));
    $("mobileMenuBtn").onclick = () => $("sidebarDrawer").classList.toggle("open");
    $("sidebarCloseBtn").onclick = () => $("sidebarDrawer").classList.remove("open");

    $("genRoomBtn").onclick = () => switchRoomFast(randomRoomName());
    $("newRoomRailBtn").onclick = () => switchRoomFast(randomRoomName());
    $("roomInput").onkeydown = (e) => { if (e.key === "Enter") switchRoomFast($("roomInput").value); };
    $("copySidebarInviteBtn").onclick = () => copyInviteLink(state.roomName);
    $("copyRoomLinkBtn").onclick = () => copyInviteLink(state.roomName);
    $("connStatusPill").onclick = () => { if (!state.room && !state.isConnecting) connectRoomChatOnly(state.roomName); };

    $("startCallTopBtn").onclick = () => startCall({ withBot: false });
    $("endCallTopBtn").onclick = endCall;
    $("navVoiceChannelBtn").onclick = () => { $("sidebarDrawer").classList.remove("open"); if (!state.inCall) startCall({ withBot: false }); };
    $("navTextChannelBtn").onclick = () => { $("sidebarDrawer").classList.remove("open"); toggleChat(true); };
    $("toggleBotBtn").onclick = () => { if (!state.inCall) startCall({ withBot: true }); else if (state.botEnabled) stopBotEngine(); else startBotEngine(true); };
    $("botRailBtn").onclick = $("toggleBotBtn").onclick;

    $("unlockAudioBtn").onclick = async () => { if (state.room) { await state.room.startAudio(); $("audioUnlockBanner").classList.add("hidden"); } };
    $("micBtn").onclick = toggleMic; $("userPanelMicBtn").onclick = toggleMic;
    $("camBtn").onclick = toggleCam; $("userPanelCamBtn").onclick = toggleCam;
    $("screenBtn").onclick = toggleScreenShare;
    $("handBtn").onclick = toggleHand; $("leaveBtn").onclick = endCall;
    $("chatToggleBtn").onclick = () => toggleChat(); $("closeChatBtn").onclick = () => toggleChat(false);
    $("tabChatBtn").onclick = () => switchSidebarTab("chat"); $("tabParticipantsBtn").onclick = () => switchSidebarTab("participants");
    $("stageFullscreenBtn").onclick = toggleStageFullscreen; $("stagePipBtn").onclick = toggleStagePiP;
    $("stageClosePinBtn").onclick = () => { state.pinnedIdentity = null; renderAllTiles(); };

    $("reactBtn").onclick = (e) => { e.stopPropagation(); $("reactionsPicker").classList.toggle("hidden"); };
    $("reactionsPicker").querySelectorAll("button").forEach((b) => {
      b.onclick = () => { const em = b.dataset.emoji; $("reactionsPicker").classList.add("hidden"); spawnFloatingReaction(em, state.user?.nick || "Я"); sendData("zcall-reaction", { emoji: em, name: state.user?.nick || "Я" }); };
    });
    $("emojiToggleBtn").onclick = (e) => { e.stopPropagation(); $("emojiPopover").classList.toggle("hidden"); };
    $("emojiPopover").querySelectorAll("button").forEach((b) => {
      b.onclick = () => { $("chatInput").value += b.dataset.ins; $("emojiPopover").classList.add("hidden"); $("chatInput").focus(); };
    });
    document.addEventListener("click", () => { $("reactionsPicker").classList.add("hidden"); $("emojiPopover").classList.add("hidden"); });

    const openSettings = () => { loadDevices(); syncRoomSettingsUI(); renderAccountsRegistry(); $("settingsModal").classList.remove("hidden"); updateRoomStats(); };
    $("topSettingsBtn").onclick = openSettings; $("userPanelSettingsBtn").onclick = openSettings;
    $("closeSettingsBtn").onclick = () => $("settingsModal").classList.add("hidden");
    $("settingsModal").onclick = (e) => { if (e.target === $("settingsModal")) $("settingsModal").classList.add("hidden"); };

    $("clearAccountsBtn").onclick = () => {
      localStorage.removeItem(ACCOUNTS_KEY);
      renderAccountsRegistry();
      showToast("База тестовых аккаунтов очищена");
    };

    $("lobbyQualitySelect").onchange = (e) => { state.quality = e.target.value; localStorage.setItem("zcall_quality", state.quality); applyQualityMidCall(); };
    $("lobbyAudioPresetSelect").onchange = (e) => { state.audioPreset = e.target.value; localStorage.setItem("zcall_audio_preset", state.audioPreset); applyQualityMidCall(); };
    $("roomAudioSelect").onchange = async (e) => { state.audioDeviceId = e.target.value; await state.room?.switchActiveDevice("audioinput", state.audioDeviceId); };
    $("roomVideoSelect").onchange = async (e) => { state.videoDeviceId = e.target.value; await state.room?.switchActiveDevice("videoinput", state.videoDeviceId); };
    $("roomQualitySelect").onchange = (e) => { state.quality = e.target.value; localStorage.setItem("zcall_quality", state.quality); applyQualityMidCall(); };
    $("roomAudioPresetSelect").onchange = (e) => { state.audioPreset = e.target.value; localStorage.setItem("zcall_audio_preset", state.audioPreset); applyQualityMidCall(); };
    $("roomScreenModeSelect").onchange = (e) => { state.screenMode = e.target.value; localStorage.setItem("zcall_screen_mode", state.screenMode); };
    $("roomFilterSelect").onchange = (e) => { state.filter = e.target.value; localStorage.setItem("zcall_filter", state.filter); broadcastProfile(); renderAllTiles(); };
    $("roomThemeSelect").onchange = (e) => applyTheme(e.target.value);
    $("cleanMicToggle").onchange = (e) => { state.cleanMic = e.target.checked; localStorage.setItem("zcall_clean_mic", String(state.cleanMic)); applyQualityMidCall(); };
    $("mirrorSelfToggle").onchange = (e) => { state.mirrorSelf = e.target.checked; localStorage.setItem("zcall_mirror", String(state.mirrorSelf)); renderAllTiles(); };
    $("uiSoundsToggle").onchange = (e) => { state.uiSounds = e.target.checked; localStorage.setItem("zcall_sounds", String(state.uiSounds)); };
    $("saveSandboxBtn").onclick = () => { const v = $("sandboxIdInput").value.trim() || DEFAULT_SANDBOX_ID; state.sandboxId = v; localStorage.setItem("zcall_sandbox_id", v); showToast("Sandbox ID сохранён"); };

    $("sendChatBtn").onclick = sendChatText;
    $("chatInput").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatText(); } };
    $("chatInput").oninput = (e) => {
      e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
      const now = Date.now(); if (now - state.lastTypingSent > 1800) { state.lastTypingSent = now; sendData("zcall-typing", { name: state.user?.nick || "Кто-то" }, false); }
    };
    $("attachFileBtn").onclick = () => $("chatFileInput").click();
    $("chatFileInput").onchange = (e) => { sendFiles(e.target.files); e.target.value = ""; };
    $("voiceRecBtn").onclick = startVoiceRecord;
    $("voiceCancelBtn").onclick = () => finishVoiceRecord(false);
    $("voiceSendBtn").onclick = () => finishVoiceRecord(true);

    $("chatInput").addEventListener("paste", (e) => {
      const files = [];
      for (const item of e.clipboardData?.items || []) if (item.kind === "file") { const f = item.getAsFile(); if (f) files.push(f); }
      if (files.length) { e.preventDefault(); sendFiles(files); }
    });

    const drawer = $("chatDrawer");
    drawer.addEventListener("dragover", (e) => { e.preventDefault(); $("chatDropOverlay").classList.remove("hidden"); });
    drawer.addEventListener("dragleave", () => $("chatDropOverlay").classList.add("hidden"));
    drawer.addEventListener("drop", (e) => { e.preventDefault(); $("chatDropOverlay").classList.add("hidden"); if (e.dataTransfer?.files?.length) sendFiles(e.dataTransfer.files); });

    $("cancelReplyBtn").onclick = cancelReply;
    $("closeLightboxBtn").onclick = () => $("lightboxModal").classList.add("hidden");
    $("lightboxModal").onclick = (e) => { if (e.target === $("lightboxModal")) $("lightboxModal").classList.add("hidden"); };

    // Автоматический вход, если уже зарегистрирован
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (saved?.username) { state.user = saved; enterAppShell(); }
    } catch (_) {}
  }

  window.addEventListener("DOMContentLoaded", init);
})();