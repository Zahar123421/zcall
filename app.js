(() => {
  const DEFAULT_SANDBOX_ID = "p_2qxku4v66yr";
  const SANDBOX_ENDPOINT = "https://cloud-api.livekit.io/api/sandbox/connection-details";

  const LK = window.LivekitClient;
  const $ = (id) => document.getElementById(id);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const canScreenShare = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  const SVG = {
    micOn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
    micOff: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
    camOn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
    camOff: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="m2 2 20 20"/></svg>',
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
    nick: localStorage.getItem("zcall_nick") || "",
    roomName: "",
    savedRooms: JSON.parse(localStorage.getItem("zcall_rooms") || "[]"),
    micEnabled: true,
    camEnabled: true,
    mirrorSelf: localStorage.getItem("zcall_mirror") !== "false",
    uiSounds: localStorage.getItem("zcall_sounds") !== "false",
    cleanMic: localStorage.getItem("zcall_clean_mic") === "true",
    quality: localStorage.getItem("zcall_quality") || "1080",
    audioPreset: localStorage.getItem("zcall_audio_preset") || "hq",
    screenMode: localStorage.getItem("zcall_screen_mode") || "motion",
    filter: localStorage.getItem("zcall_filter") || "none",
    audioDeviceId: "",
    videoDeviceId: "",

    previewStream: null,
    audioMeterCtx: null,
    audioMeterRaf: null,

    room: null,
    chatOnlyMode: false,
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

    chatOpen: false,
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
    const clean = tr.replace(/[^a-z0-9_-]/g, "").slice(0, 20);
    return clean || fallback;
  }

  function randomRoomName() {
    const words = ["nova", "cyber", "cosmos", "pulse", "vibe", "aurora", "pixel", "turbo"];
    return `zcall-${words[Math.floor(Math.random() * words.length)]}-${uid(4)}`;
  }

  function formatTime(ts = Date.now()) { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function formatSec(sec) { return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; }
  function formatBytes(b) { return !b ? "" : b < 1024 ? `${b} Б` : b < 1048576 ? `${(b/1024).toFixed(1)} КБ` : `${(b/1048576).toFixed(2)} МБ`; }

  function displayNameOf(p) {
    if (!p) return "Участник";
    const id = p.identity || "";
    const prof = state.profiles.get(id);
    if (prof?.name) return prof.name;
    if (p.name) return p.name;
    return id.includes("_") ? id.split("_")[0] : id;
  }

  function showToast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
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
      const osc = sfxCtx.createOscillator();
      const g = sfxCtx.createGain();
      osc.connect(g); g.connect(sfxCtx.destination);
      if (type === "join") {
        osc.frequency.setValueAtTime(520, now); osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
        g.gain.setValueAtTime(0.07, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now); osc.stop(now + 0.23);
      } else if (type === "leave") {
        osc.frequency.setValueAtTime(500, now); osc.frequency.exponentialRampToValueAtTime(300, now + 0.16);
        g.gain.setValueAtTime(0.07, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.22);
      } else if (type === "chat") {
        osc.frequency.setValueAtTime(860, now);
        g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
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

  function getInviteUrl(roomName) {
    const clean = (roomName || state.roomName || randomRoomName()).trim();
    const base = window.location.href.split("#")[0].split("?")[0];
    return `${base}#${encodeURIComponent(clean)}`;
  }

  async function copyInviteLink(roomName) {
    const url = getInviteUrl(roomName);
    try {
      await navigator.clipboard.writeText(url);
      showToast("Ссылка на комнату скопирована");
    } catch {
      prompt("Скопируй ссылку для друга:", url);
    }
  }

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
      btn.onclick = () => {
        if (state.room) {
          showToast("Сначала выйди из текущего звонка, чтобы сменить комнату");
          return;
        }
        state.roomName = rName;
        $("roomInput").value = rName;
        $("sidebarRoomName").textContent = rName;
        window.location.hash = encodeURIComponent(rName);
        renderRailRooms();
      };
      box.appendChild(btn);
    });
  }

  function updateUserBarUI() {
    const name = (state.nick || $("nickInput").value || "Гость").trim() || "Гость";
    $("userPanelName").textContent = name;
    $("userPanelAvatar").textContent = (name[0] || "Г").toUpperCase();
    $("previewAvatar").textContent = (name[0] || "Г").toUpperCase();
    $("userPanelStatus").textContent = state.room ? (state.chatOnlyMode ? "Только чат" : "В голосовом канале") : "В сети";

    $("userPanelMicBtn").className = `mini-icon-btn ${state.micEnabled ? "" : "off"}`;
    $("userPanelMicBtn").innerHTML = state.micEnabled ? SVG.micOn : SVG.micOff;
    $("userPanelCamBtn").className = `mini-icon-btn ${state.camEnabled ? "" : "off"}`;
    $("userPanelCamBtn").innerHTML = state.camEnabled ? SVG.camOn : SVG.camOff;
  }

  /* -------------------- КАЧЕСТВО И КОДЕКИ -------------------- */
  function getVideoCaptureOpts() {
    const dev = state.videoDeviceId ? { deviceId: state.videoDeviceId } : {};
    if (state.quality === "4k") return { ...dev, resolution: { width: 3840, height: 2160, frameRate: 60 } };
    if (state.quality === "720") return { ...dev, resolution: { width: 1280, height: 720, frameRate: 30 } };
    return { ...dev, resolution: { width: 1920, height: 1080, frameRate: 60 } };
  }

  function getAudioCaptureOpts() {
    const dev = state.audioDeviceId ? { deviceId: state.audioDeviceId } : {};
    if (state.cleanMic || state.audioPreset === "stereo") {
      return { ...dev, autoGainControl: false, echoCancellation: true, noiseSuppression: false };
    }
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

  /* -------------------- ПРЕДВХОД -------------------- */
  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === "audioinput");
    const cams = devices.filter((d) => d.kind === "videoinput");

    const fill = (sel, list, prefix, cur) => {
      if (!sel) return;
      sel.innerHTML = "";
      if (!list.length) {
        const opt = document.createElement("option");
        opt.value = ""; opt.textContent = "Нет устройств";
        sel.appendChild(opt); return;
      }
      list.forEach((d, i) => {
        const opt = document.createElement("option");
        opt.value = d.deviceId;
        opt.textContent = d.label || `${prefix} #${i + 1}`;
        sel.appendChild(opt);
      });
      if (cur && list.some((d) => d.deviceId === cur)) sel.value = cur;
    };

    fill($("lobbyAudioSelect"), mics, "Микрофон", state.audioDeviceId);
    fill($("roomAudioSelect"), mics, "Микрофон", state.audioDeviceId);
    fill($("lobbyVideoSelect"), cams, "Камера", state.videoDeviceId);
    fill($("roomVideoSelect"), cams, "Камера", state.videoDeviceId);
    if (!state.audioDeviceId && mics[0]) state.audioDeviceId = mics[0].deviceId;
    if (!state.videoDeviceId && cams[0]) state.videoDeviceId = cams[0].deviceId;
  }

  function stopPreviewMedia() {
    if (state.audioMeterRaf) cancelAnimationFrame(state.audioMeterRaf);
    state.audioMeterRaf = null;
    if (state.audioMeterCtx) { state.audioMeterCtx.close().catch(() => {}); state.audioMeterCtx = null; }
    if (state.previewStream) { state.previewStream.getTracks().forEach((t) => t.stop()); state.previewStream = null; }
    $("previewVideo").srcObject = null;
    $("micMeterFill").style.width = "0%";
  }

  function updatePreviewVisuals() {
    const vid = $("previewVideo");
    vid.className = "";
    if (state.mirrorSelf) vid.classList.add("mirrored");
    if (state.filter !== "none") vid.classList.add(`filter-${state.filter}`);
    $("previewPlaceholder").classList.toggle("hidden", state.camEnabled && !!state.previewStream?.getVideoTracks().length);
    $("previewMicBtn").className = `circle-btn ${state.micEnabled ? "active" : "off"}`;
    $("previewMicBtn").innerHTML = state.micEnabled ? SVG.micOn : SVG.micOff;
    $("previewCamBtn").className = `circle-btn ${state.camEnabled ? "active" : "off"}`;
    $("previewCamBtn").innerHTML = state.camEnabled ? SVG.camOn : SVG.camOff;
    updateUserBarUI();
  }

  async function startPreviewMedia() {
    stopPreviewMedia();
    if (!navigator.mediaDevices?.getUserMedia) {
      $("lobbyStatus").textContent = "Для камеры и микрофона нужен HTTPS (на GitHub Pages он работает автоматически).";
      updatePreviewVisuals();
      return;
    }
    try {
      const constraints = {
        audio: state.micEnabled ? (state.audioDeviceId ? { deviceId: { ideal: state.audioDeviceId } } : true) : false,
        video: state.camEnabled ? { ...(state.videoDeviceId ? { deviceId: { ideal: state.videoDeviceId } } : {}), width: { ideal: 1280 }, height: { ideal: 720 } } : false
      };
      if (!constraints.audio && !constraints.video) { updatePreviewVisuals(); return; }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.previewStream = stream;
      if (stream.getVideoTracks().length) $("previewVideo").srcObject = stream;
      if (stream.getAudioTracks().length) startMicMeter(stream);
      await loadDevices();
      $("lobbyStatus").textContent = "";
    } catch {
      if (state.camEnabled) {
        state.camEnabled = false;
        $("lobbyStatus").textContent = "Камера не найдена или занята — можно войти с микрофоном или только в чат.";
      }
    }
    updatePreviewVisuals();
  }

  function startMicMeter(stream) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      state.audioMeterCtx = ctx;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!state.audioMeterCtx) return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        $("micMeterFill").style.width = `${Math.min(100, Math.round(((sum / data.length) / 60) * 100))}%`;
        state.audioMeterRaf = requestAnimationFrame(tick);
      };
      tick();
    } catch (_) {}
  }

  /* -------------------- ВХОД В КОМНАТУ -------------------- */
  async function fetchSandboxToken(roomName, identity) {
    const apiRoom = toAsciiId(roomName, "zcall-room");
    const res = await fetch(SANDBOX_ENDPOINT, {
      method: "POST",
      headers: { "X-Sandbox-ID": state.sandboxId, "Content-Type": "application/json" },
      body: JSON.stringify({ room_name: apiRoom, participant_name: identity })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Сервер токенов вернул ${res.status}: ${txt}`);
    }
    const data = await res.json();
    return { serverUrl: data.serverUrl || data.server_url, token: data.participantToken || data.participant_token };
  }

  async function joinRoom({ chatOnly = false, botMode = false } = {}) {
    if (!LK) { alert("LiveKit SDK не загрузился."); return; }

    const rawNick = $("nickInput").value.trim() || "Гость";
    let roomName = $("roomInput").value.trim() || randomRoomName();
    if (botMode && !roomName.startsWith("zcall-test-")) roomName = `zcall-test-${uid(5)}`;

    state.nick = rawNick;
    state.roomName = roomName;
    state.chatOnlyMode = chatOnly;
    localStorage.setItem("zcall_nick", rawNick);
    if (!botMode) {
      window.location.hash = encodeURIComponent(roomName);
      saveRecentRoom(roomName);
    }

    if (chatOnly) { state.micEnabled = false; state.camEnabled = false; }
    state.botEnabled = botMode;
    state.botScreenTest = false;

    // Строго латинский ID для LiveKit Sandbox (решает ошибку 400 invalid name!)
    state.localIdentity = `${toAsciiId(rawNick, "user")}_${uid(5)}`;

    $("joinBtn").disabled = true;
    $("joinChatOnlyBtn").disabled = true;
    $("joinBotBtn").disabled = true;
    $("lobbyStatus").textContent = "Подключаемся к комнате...";

    stopPreviewMedia();

    try {
      const { serverUrl, token } = await fetchSandboxToken(roomName, state.localIdentity);
      const room = new LK.Room({
        adaptiveStream: true, dynacast: true,
        videoCaptureDefaults: getVideoCaptureOpts(),
        audioCaptureDefaults: getAudioCaptureOpts(),
        publishDefaults: getPublishDefaults()
      });

      state.room = room;
      setupRoomEvents(room);
      await room.connect(serverUrl, token, { autoSubscribe: true });

      state.profiles.set(state.localIdentity, { name: rawNick, filter: state.filter, handRaised: false });

      $("lobbyView").classList.add("hidden");
      $("roomView").classList.remove("hidden");
      $("roomView").classList.toggle("chat-only-mode", chatOnly);
      $("roomLiveStats").classList.remove("hidden");
      $("toggleBotBtn").classList.remove("hidden");
      $("sidebarRoomName").textContent = roomName;
      $("roomTitleBadge").textContent = chatOnly ? `общий-чат · ${roomName}` : `Голосовая · ${roomName}`;
      $("sandboxIdInput").value = state.sandboxId;
      syncRoomSettingsUI();
      updateUserBarUI();

      $("navTextChannelBtn").classList.toggle("active", chatOnly);
      $("navVoiceChannelBtn").classList.toggle("active", !chatOnly);

      toggleChat(chatOnly || botMode || window.innerWidth >= 960);
      switchSidebarTab("chat");

      if (!chatOnly) {
        try { if (state.micEnabled) await room.localParticipant.setMicrophoneEnabled(true, getAudioCaptureOpts()); }
        catch { state.micEnabled = false; showToast("Нет доступа к микрофону"); }
        try { if (state.camEnabled) await room.localParticipant.setCameraEnabled(true, getVideoCaptureOpts()); }
        catch { state.camEnabled = false; showToast("Нет доступа к камере"); }
      }

      $("toggleBotBtn").classList.toggle("active", state.botEnabled);
      renderAllTiles();
      updateDockButtons();
      startCallTimers();
      broadcastProfile();
      playSfx("join");

      if (state.botEnabled) startBotEngine(true);
      else showToast(`Вошли в ${roomName}`);
    } catch (err) {
      console.error(err);
      $("lobbyStatus").textContent = `Ошибка: ${err.message}`;
      $("joinBtn").disabled = false;
      $("joinChatOnlyBtn").disabled = false;
      $("joinBotBtn").disabled = false;
      startPreviewMedia();
    }
  }

  function setupRoomEvents(room) {
    const RE = LK.RoomEvent;

    room.registerByteStreamHandler("zcall-file", async (reader, participantInfo) => {
      try {
        const info = reader.info || {};
        const result = await reader.readAll();
        const chunks = Array.isArray(result) ? result : [result];
        const mime = info.mimeType || "application/octet-stream";
        const blob = new Blob(chunks, { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const sender = getParticipantByIdentity(participantInfo?.identity);
        const fname = info.name || "file";
        const isVoice = fname.startsWith("zcall-voice-") || mime.startsWith("audio/");
        const isImage = !isVoice && mime.startsWith("image/");

        appendChatMessage({
          id: info.id || uid(8),
          senderIdentity: participantInfo?.identity || "remote",
          senderName: displayNameOf(sender) || "Участник",
          text: "",
          voiceUrl: isVoice ? blobUrl : null,
          imageUrl: isImage ? blobUrl : null,
          fileUrl: !isImage && !isVoice ? blobUrl : null,
          fileName: fname, fileSize: info.size || blob.size, time: Date.now()
        });
      } catch (err) { console.error(err); }
    });

    room
      .on(RE.ParticipantConnected, (p) => {
        playSfx("join");
        showToast(`${displayNameOf(p)} зашёл`);
        setTimeout(() => broadcastProfile(), 400);
        renderAllTiles();
      })
      .on(RE.ParticipantDisconnected, (p) => {
        playSfx("leave");
        showToast(`${displayNameOf(p)} вышел`);
        cleanupParticipantAudio(p.identity);
        if (state.pinnedIdentity === p.identity) state.pinnedIdentity = null;
        renderAllTiles();
      })
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
      .on(RE.ConnectionQualityChanged, (quality, participant) => {
        if (participant.identity === state.localIdentity) {
          const dot = $("localNetQuality").querySelector(".status-dot");
          const txt = $("localNetQuality").querySelector("span:last-child");
          dot.className = "status-dot";
          if (quality === LK.ConnectionQuality.Excellent) { dot.classList.add("good"); txt.textContent = "Отлично"; }
          else if (quality === LK.ConnectionQuality.Good) { dot.classList.add("good"); txt.textContent = "Стабильно"; }
          else if (quality === LK.ConnectionQuality.Poor) { dot.classList.add("warn"); txt.textContent = "Слабая"; }
          else { dot.classList.add("bad"); txt.textContent = "Обрыв"; }
        }
      })
      .on(RE.AudioPlaybackStatusChanged, () => $("audioUnlockBanner").classList.toggle("hidden", room.canPlaybackAudio))
      .on(RE.Reconnecting, () => $("reconnectBanner").classList.remove("hidden"))
      .on(RE.Reconnected, () => { $("reconnectBanner").classList.add("hidden"); showToast("Связь восстановлена"); })
      .on(RE.Disconnected, () => cleanupRoom())
      .on(RE.DataReceived, (payload, participant, _kind, topic) => {
        try { handleIncomingData(topic, JSON.parse(decoder.decode(payload)), participant); } catch (_) {}
      });
  }

  function getParticipantByIdentity(id) {
    if (!state.room || !id) return null;
    return id === state.localIdentity ? state.room.localParticipant : state.room.remoteParticipants.get(id) || null;
  }

  async function sendData(topic, obj, reliable = true) {
    if (!state.room) return;
    try { await state.room.localParticipant.publishData(encoder.encode(JSON.stringify(obj)), { reliable, topic }); } catch (_) {}
  }

  function broadcastProfile() {
    sendData("zcall-profile", { name: state.nick, filter: state.filter, handRaised: state.handRaised });
  }

  function handleIncomingData(topic, data, participant) {
    const id = participant?.identity;
    if (topic === "zcall-profile" && id) {
      state.profiles.set(id, { name: data.name || displayNameOf(participant), filter: data.filter || "none", handRaised: !!data.handRaised });
      if (data.handRaised) showToast(`${data.name || "Участник"} поднял(а) руку`);
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
      const lp = state.room?.localParticipant;
      const cs = lp?.getTrackPublication(LK.Track.Source.Camera)?.track?.mediaStreamTrack?.getSettings?.();
      const camInfo = state.camEnabled && cs ? `${cs.width}x${cs.height} @ ${Math.round(cs.frameRate || 30)} FPS` : "выключена";
      setTimeout(() => {
        appendChatMessage({
          id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот",
          text: `Диагностика пройдена!\n• Сервер LiveKit: Подключён (${state.sandboxId})\n• Микрофон: ${state.micEnabled ? "включён" : "выключен"}\n• Камера: ${camInfo}\n\nНажми «Эхо-тест 4с» на моей карточке, чтобы услышать свой голос, или напиши сюда (по словам «фото», «голос», «экран» сделаю тест).`,
          time: Date.now()
        });
      }, 450);
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
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#0b1020"); g.addColorStop(1, "#161d36");
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
      ctx.fillText(isStage ? "Тест демонстрации экрана · 1080p HQ" : "Zcall Тест-Бот", w / 2, h / 2 + (isStage ? 120 : 78));
      ctx.fillStyle = "#949ba8"; ctx.font = `500 ${isStage ? 16 : 12}px Inter, sans-serif`;
      ctx.fillText(state.botEchoRecording ? "Идёт запись 4 сек..." : state.botSpeaking ? "Воспроизвожу ваш голос..." : "Готов к проверке микрофона и чата", w / 2, h / 2 + (isStage ? 148 : 98));
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
      showToast("Говорите в микрофон — запись 4 секунды...");
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        state.botEchoRecording = false;
        recStream.getTracks().forEach((t) => t.stop());
        const url = URL.createObjectURL(new Blob(chunks, { type: mime || "audio/webm" }));
        const audio = new Audio(url);
        audio.volume = Math.max(0, Math.min(1, (state.volumes.get("zcall-bot") ?? 100) / 100));
        state.botSpeaking = true;
        document.querySelector('.participant-tile[data-identity="zcall-bot"]')?.classList.add("speaking");
        showToast("Воспроизвожу ваш голос (эхо)");
        audio.onended = () => {
          state.botSpeaking = false;
          document.querySelector('.participant-tile[data-identity="zcall-bot"]')?.classList.remove("speaking");
          URL.revokeObjectURL(url);
        };
        audio.play().catch(() => { state.botSpeaking = false; });
      };
      recorder.start();
      setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, 4000);
    } catch {
      state.botEchoRecording = false;
      tempStream?.getTracks().forEach((t) => t.stop());
      showToast("Нет доступа к микрофону для эхо-теста");
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
      ctx.fillStyle = "#94a3b8"; ctx.font = "19px Inter, sans-serif";
      ctx.fillText(`${state.roomName} · ${formatTime()}`, 400, 258);
      c.toBlob(res, "image/png");
    });
  }

  function makeTestVoiceWavBlob() {
    const sr = 22050, len = Math.floor(sr * 1.5), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); ws(8, "WAVE"); ws(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    ws(36, "data"); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      const t = i / sr, f = t < 0.5 ? 523.25 : t < 1.0 ? 659.25 : 783.99;
      const env = Math.sin(Math.min(1, (t % 0.5) / 0.05) * Math.PI * 0.5) * Math.exp(-3 * (t % 0.5));
      v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * f * t) * env * 12000, true);
    }
    return new Blob([buf], { type: "audio/wav" });
  }

  async function runBotChatTest() {
    const img = await makeTestImageBlob();
    if (img) appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", text: "Тест фото в чате (нажми для увеличения):", imageUrl: URL.createObjectURL(img), fileName: "zcall-test.png", time: Date.now() });
    appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", voiceUrl: URL.createObjectURL(makeTestVoiceWavBlob()), fileName: "zcall-voice-bot.wav", time: Date.now() });
  }

  function handleBotReplyToUser(userMsg) {
    if (!state.botEnabled) return;
    const low = (userMsg.text || "").toLowerCase();
    setTimeout(async () => {
      if (!state.botEnabled) return;
      applyMessageReaction(userMsg.id, "👍", "zcall-bot");
      if (low.includes("фото") || low.includes("картин")) {
        const blob = await makeTestImageBlob();
        appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", text: "Вот тестовое фото:", imageUrl: URL.createObjectURL(blob), fileName: "zcall-test.png", replyTo: { id: userMsg.id, senderName: userMsg.senderName, preview: userMsg.text }, time: Date.now() });
      } else if (low.includes("голос")) {
        appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", voiceUrl: URL.createObjectURL(makeTestVoiceWavBlob()), fileName: "zcall-voice-bot.wav", time: Date.now() });
      } else if (low.includes("экран")) {
        state.botScreenTest = !state.botScreenTest; renderAllTiles();
      } else {
        appendChatMessage({ id: uid(8), senderIdentity: "zcall-bot", senderName: "Zcall Бот", text: `Принял: "${userMsg.text}". Чат работает отлично!`, replyTo: { id: userMsg.id, senderName: userMsg.senderName, preview: userMsg.text }, time: Date.now() });
      }
    }, 600);
  }

  /* -------------------- СЕТКА И КАРТОЧКИ -------------------- */
  function renderAllTiles() {
    if (!state.room) return;
    const remotes = Array.from(state.room.remoteParticipants.values());
    const allReal = [state.room.localParticipant, ...remotes];
    const totalCount = allReal.length + (state.botEnabled ? 1 : 0);

    $("participantCountNum").textContent = String(totalCount);
    $("tabParticipantsCount").textContent = String(totalCount);
    $("sidebarVoiceBadge").textContent = String(state.chatOnlyMode ? 0 : totalCount);

    // Боковое дерево голосового канала как в Discord
    const tree = $("sidebarVoiceMembers");
    tree.innerHTML = "";
    if (!state.chatOnlyMode) {
      allReal.forEach((p) => {
        const row = document.createElement("div"); row.className = "tree-member";
        const dot = document.createElement("span"); dot.className = "tree-dot";
        const nm = document.createElement("span"); nm.textContent = p.identity === state.localIdentity ? state.nick : displayNameOf(p);
        row.append(dot, nm); tree.appendChild(row);
      });
      if (state.botEnabled) {
        const row = document.createElement("div"); row.className = "tree-member";
        row.innerHTML = '<span class="tree-dot"></span><span>Zcall Тест-Бот</span>';
        tree.appendChild(row);
      }
    }

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
      const name = isLocal ? state.nick : displayNameOf(p);
      const hand = isLocal ? state.handRaised : !!prof.handRaised;
      const filter = isLocal ? state.filter : prof.filter || "none";

      const tile = document.createElement("div");
      tile.className = "participant-tile";
      tile.dataset.identity = p.identity;
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

    renderParticipantsTab(allReal);
  }

  function renderParticipantsTab(allReal) {
    const list = $("participantsList"); if (!list) return;
    list.innerHTML = "";
    const items = allReal.map((p) => {
      const isLocal = p.identity === state.localIdentity;
      const mp = p.getTrackPublication(LK.Track.Source.Microphone);
      const cp = p.getTrackPublication(LK.Track.Source.Camera);
      return { name: isLocal ? `${state.nick} (Вы)` : displayNameOf(p), role: isLocal ? "Вы" : "Участник", micOn: isLocal ? state.micEnabled : !!(mp && !mp.isMuted), camOn: isLocal ? state.camEnabled : !!(cp && !cp.isMuted) };
    });
    if (state.botEnabled) items.push({ name: "Zcall Тест-Бот", role: "Проверка", micOn: true, camOn: true });
    items.forEach((it) => {
      const row = document.createElement("div"); row.className = "p-list-item";
      row.innerHTML = `<div class="p-list-left"><div class="p-mini-av">${(it.name[0] || "Z").toUpperCase()}</div><div><div class="p-list-name"></div><div class="p-list-role"></div></div></div><div class="p-list-right">${it.micOn ? SVG.micOn : SVG.micOff}${it.camOn ? SVG.camOn : SVG.camOff}</div>`;
      row.querySelector(".p-list-name").textContent = it.name;
      row.querySelector(".p-list-role").textContent = it.role;
      list.appendChild(row);
    });
  }

  function toggleStageFullscreen() {
    const el = $("stageWrapper");
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }
  async function toggleStagePiP() {
    const vid = $("stageVideoArea").querySelector("video");
    if (!vid || !document.pictureInPictureEnabled) { showToast("PiP доступен для видеопотока"); return; }
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await vid.requestPictureInPicture(); } catch (_) {}
  }

  /* -------------------- УПРАВЛЕНИЕ В ЗВОНКЕ -------------------- */
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
    if (!state.room) { state.micEnabled = !state.micEnabled; startPreviewMedia(); return; }
    const next = !state.micEnabled;
    if (state.chatOnlyMode && next) { state.chatOnlyMode = false; $("roomView").classList.remove("chat-only-mode"); }
    try { await state.room.localParticipant.setMicrophoneEnabled(next, getAudioCaptureOpts()); state.micEnabled = next; updateDockButtons(); renderAllTiles(); }
    catch { showToast("Нет доступа к микрофону"); }
  }

  async function toggleCam() {
    if (!state.room) { state.camEnabled = !state.camEnabled; startPreviewMedia(); return; }
    const next = !state.camEnabled;
    if (state.chatOnlyMode && next) { state.chatOnlyMode = false; $("roomView").classList.remove("chat-only-mode"); }
    try { await state.room.localParticipant.setCameraEnabled(next, getVideoCaptureOpts()); state.camEnabled = next; updateDockButtons(); renderAllTiles(); }
    catch { showToast("Нет доступа к камере"); }
  }

  async function toggleScreenShare() {
    if (!state.room) return;
    if (!canScreenShare) { showToast("Этот мобильный браузер не разрешает отдавать свой экран, но чужой экран будет виден."); return; }
    const next = !state.screenSharing;
    if (state.chatOnlyMode && next) { state.chatOnlyMode = false; $("roomView").classList.remove("chat-only-mode"); }
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
      if (!state.chatOpen) {
        state.unreadCount++;
        $("chatBadge").textContent = String(state.unreadCount);
        $("chatBadge").classList.remove("hidden");
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

    if (!isSelf) {
      const a = document.createElement("div"); a.className = "msg-author"; a.textContent = msg.senderName || "Участник"; bubble.appendChild(a);
    }
    if (msg.replyTo) {
      const q = document.createElement("div"); q.className = "msg-quote";
      const qa = document.createElement("strong"); qa.textContent = msg.replyTo.senderName;
      const qt = document.createElement("span"); qt.textContent = msg.replyTo.preview;
      q.append(qa, qt); bubble.appendChild(q);
    }
    if (msg.voiceUrl) bubble.appendChild(createVoicePlayerEl(msg.voiceUrl));
    if (msg.imageUrl) {
      const img = document.createElement("img"); img.className = "msg-image"; img.src = msg.imageUrl; img.alt = msg.fileName || "Фото";
      img.onclick = () => openLightbox(msg.imageUrl, msg.fileName || "Изображение");
      bubble.appendChild(img);
    }
    if (msg.fileUrl) {
      const fc = document.createElement("div"); fc.className = "msg-file-card";
      const meta = document.createElement("div");
      const fn = document.createElement("span"); fn.className = "msg-file-name"; fn.textContent = msg.fileName || "Файл";
      const fs = document.createElement("span"); fs.className = "msg-file-size"; fs.textContent = formatBytes(msg.fileSize);
      meta.append(fn, fs);
      const dl = document.createElement("a"); dl.className = "ghost-btn"; dl.href = msg.fileUrl; dl.download = msg.fileName || "file"; dl.innerHTML = SVG.download;
      fc.append(meta, dl); bubble.appendChild(fc);
    }
    if (msg.text) {
      const txt = document.createElement("div"); txt.className = "msg-text"; renderTextWithLinks(txt, msg.text); bubble.appendChild(txt);
    }

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
    $("replyPreviewBar").classList.remove("hidden");
    $("chatInput").focus();
  }
  function cancelReply() { state.replyTo = null; $("replyPreviewBar").classList.add("hidden"); }

  function toggleChatReaction(msgId, emoji) {
    applyMessageReaction(msgId, emoji, state.localIdentity);
    sendData("zcall-chat-react", { msgId, emoji });
  }
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
    if (!text || !state.room) return;
    const msg = { id: uid(9), senderIdentity: state.localIdentity, senderName: state.nick, text, replyTo: state.replyTo ? { ...state.replyTo } : null, time: Date.now() };
    input.value = ""; input.style.height = "auto"; cancelReply();
    appendChatMessage(msg);
    await sendData("zcall-chat", msg);
    handleBotReplyToUser(msg);
  }

  async function sendFiles(fileList, forceVoice = false) {
    if (!state.room || !fileList?.length) return;
    for (const file of fileList) {
      if (file.size > 25 * 1024 * 1024) { showToast(`Файл ${file.name} больше 25 МБ`); continue; }
      const url = URL.createObjectURL(file);
      const isVoice = forceVoice || (file.name || "").startsWith("zcall-voice-");
      const isImg = !isVoice && (file.type || "").startsWith("image/");
      appendChatMessage({ id: uid(9), senderIdentity: state.localIdentity, senderName: state.nick, voiceUrl: isVoice ? url : null, imageUrl: isImg ? url : null, fileUrl: !isImg && !isVoice ? url : null, fileName: file.name || "file", fileSize: file.size, time: Date.now() });
      try { await state.room.localParticipant.sendFile(file, { topic: "zcall-file", mimeType: file.type || "application/octet-stream" }); }
      catch { showToast(`Ошибка отправки ${file.name}`); }
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

  /* -------------------- ТАЙМЕР И ВЫХОД -------------------- */
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
    const ss = lp.getTrackPublication(LK.Track.Source.ScreenShare)?.track?.mediaStreamTrack?.getSettings?.();
    if (ss) lines.push(`Экран: ${ss.width || "?"}x${ss.height || "?"} @ ${Math.round(ss.frameRate || 0)} FPS`);
    $("statsBox").textContent = lines.join("\n");
  }

  function cleanupRoom() {
    clearInterval(state.timerInterval); clearInterval(state.statsInterval);
    stopBotEngine(); finishVoiceRecord(false);
    for (const it of state.audioEls.values()) it.el.remove();
    state.audioEls.clear(); state.profiles.clear(); state.messages = [];
    state.room = null; state.screenSharing = false; state.handRaised = false; state.pinnedIdentity = null; state.chatOnlyMode = false;

    $("chatMessages").innerHTML = '<div class="chat-system-msg">Пишите сообщения, вставляйте скриншоты (Ctrl+V), отправляйте файлы и голосовые.</div>';
    $("roomView").classList.add("hidden");
    $("roomView").classList.remove("chat-only-mode");
    $("roomLiveStats").classList.add("hidden");
    $("toggleBotBtn").classList.add("hidden");
    $("lobbyView").classList.remove("hidden");
    $("roomTitleBadge").textContent = "общий-чат";
    $("sidebarVoiceBadge").textContent = "0";
    $("sidebarVoiceMembers").innerHTML = "";
    $("joinBtn").disabled = false; $("joinChatOnlyBtn").disabled = false; $("joinBotBtn").disabled = false;
    $("lobbyStatus").textContent = "";
    updateUserBarUI();
    startPreviewMedia();
  }
  async function leaveRoom() { if (state.room) await state.room.disconnect(); else cleanupRoom(); }

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
    if (!state.room) return;
    if (state.camEnabled) { await state.room.localParticipant.setCameraEnabled(false); await state.room.localParticipant.setCameraEnabled(true, getVideoCaptureOpts()); }
    if (state.micEnabled) { await state.room.localParticipant.setMicrophoneEnabled(false); await state.room.localParticipant.setMicrophoneEnabled(true, getAudioCaptureOpts()); }
    renderAllTiles();
    showToast("Настройки применены");
  }

  /* -------------------- СТАРТ -------------------- */
  function init() {
    applyTheme(state.theme);

    const hashRoom = decodeURIComponent((window.location.hash || "").replace(/^#/, "")).trim();
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    state.roomName = hashRoom || queryRoom || randomRoomName();

    $("nickInput").value = state.nick;
    $("roomInput").value = state.roomName;
    $("sidebarRoomName").textContent = state.roomName;
    $("lobbyQualitySelect").value = state.quality;
    $("lobbyAudioPresetSelect").value = state.audioPreset;

    renderRailRooms();
    updatePreviewVisuals();
    startPreviewMedia();

    document.querySelectorAll("[data-set-theme]").forEach((b) => b.onclick = () => applyTheme(b.dataset.setTheme));
    $("nickInput").oninput = (e) => { state.nick = e.target.value; updateUserBarUI(); };
    $("roomInput").oninput = (e) => { state.roomName = e.target.value; $("sidebarRoomName").textContent = e.target.value || "zcall"; };
    $("genRoomBtn").onclick = () => {
      state.roomName = randomRoomName();
      $("roomInput").value = state.roomName;
      $("sidebarRoomName").textContent = state.roomName;
      window.location.hash = encodeURIComponent(state.roomName);
    };
    $("newRoomRailBtn").onclick = $("genRoomBtn").onclick;
    $("copySidebarInviteBtn").onclick = () => copyInviteLink($("roomInput").value);
    $("copyRoomLinkBtn").onclick = () => copyInviteLink($("roomInput").value);
    $("botRailBtn").onclick = () => {
      if (!state.room) joinRoom({ chatOnly: false, botMode: true });
      else if (state.botEnabled) stopBotEngine();
      else startBotEngine(true);
    };

    $("mobileMenuBtn").onclick = () => $("sidebarDrawer").classList.toggle("open");
    $("sidebarCloseBtn").onclick = () => $("sidebarDrawer").classList.remove("open");

    $("previewMicBtn").onclick = () => { state.micEnabled = !state.micEnabled; startPreviewMedia(); };
    $("previewCamBtn").onclick = () => { state.camEnabled = !state.camEnabled; startPreviewMedia(); };
    $("userPanelMicBtn").onclick = toggleMic;
    $("userPanelCamBtn").onclick = toggleCam;
    $("userPanelSettingsBtn").onclick = () => { loadDevices(); syncRoomSettingsUI(); $("settingsModal").classList.remove("hidden"); updateRoomStats(); };

    $("lobbyAudioSelect").onchange = (e) => { state.audioDeviceId = e.target.value; startPreviewMedia(); };
    $("lobbyVideoSelect").onchange = (e) => { state.videoDeviceId = e.target.value; startPreviewMedia(); };
    $("lobbyQualitySelect").onchange = (e) => { state.quality = e.target.value; localStorage.setItem("zcall_quality", state.quality); };
    $("lobbyAudioPresetSelect").onchange = (e) => { state.audioPreset = e.target.value; localStorage.setItem("zcall_audio_preset", state.audioPreset); };

    $("joinBtn").onclick = () => joinRoom({ chatOnly: false, botMode: false });
    $("joinChatOnlyBtn").onclick = () => joinRoom({ chatOnly: true, botMode: false });
    $("joinBotBtn").onclick = () => joinRoom({ chatOnly: false, botMode: true });
    $("navTextChannelBtn").onclick = () => { $("sidebarDrawer").classList.remove("open"); if (!state.room) joinRoom({ chatOnly: true }); else toggleChat(true); };
    $("navVoiceChannelBtn").onclick = () => { $("sidebarDrawer").classList.remove("open"); if (!state.room) joinRoom({ chatOnly: false }); else if (state.chatOnlyMode) { state.chatOnlyMode = false; $("roomView").classList.remove("chat-only-mode"); } };

    $("unlockAudioBtn").onclick = async () => { if (state.room) { await state.room.startAudio(); $("audioUnlockBanner").classList.add("hidden"); } };
    $("toggleBotBtn").onclick = () => { if (state.botEnabled) stopBotEngine(); else startBotEngine(true); };

    $("micBtn").onclick = toggleMic; $("camBtn").onclick = toggleCam; $("screenBtn").onclick = toggleScreenShare;
    $("handBtn").onclick = toggleHand; $("leaveBtn").onclick = leaveRoom;
    $("chatToggleBtn").onclick = () => toggleChat(); $("closeChatBtn").onclick = () => toggleChat(false);
    $("tabChatBtn").onclick = () => switchSidebarTab("chat"); $("tabParticipantsBtn").onclick = () => switchSidebarTab("participants");

    $("stageFullscreenBtn").onclick = toggleStageFullscreen; $("stagePipBtn").onclick = toggleStagePiP;
    $("stageClosePinBtn").onclick = () => { state.pinnedIdentity = null; renderAllTiles(); };

    $("reactBtn").onclick = (e) => { e.stopPropagation(); $("reactionsPicker").classList.toggle("hidden"); };
    $("reactionsPicker").querySelectorAll("button").forEach((b) => {
      b.onclick = () => { const em = b.dataset.emoji; $("reactionsPicker").classList.add("hidden"); spawnFloatingReaction(em, state.nick); sendData("zcall-reaction", { emoji: em, name: state.nick }); };
    });

    $("emojiToggleBtn").onclick = (e) => { e.stopPropagation(); $("emojiPopover").classList.toggle("hidden"); };
    $("emojiPopover").querySelectorAll("button").forEach((b) => {
      b.onclick = () => { $("chatInput").value += b.dataset.ins; $("emojiPopover").classList.add("hidden"); $("chatInput").focus(); };
    });
    document.addEventListener("click", () => { $("reactionsPicker").classList.add("hidden"); $("emojiPopover").classList.add("hidden"); });

    $("topSettingsBtn").onclick = $("userPanelSettingsBtn").onclick;
    $("closeSettingsBtn").onclick = () => $("settingsModal").classList.add("hidden");
    $("settingsModal").onclick = (e) => { if (e.target === $("settingsModal")) $("settingsModal").classList.add("hidden"); };

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
      e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
      const now = Date.now(); if (now - state.lastTypingSent > 1800) { state.lastTypingSent = now; sendData("zcall-typing", { name: state.nick }, false); }
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

    document.addEventListener("keydown", (e) => {
      if (!state.room) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "KeyM") toggleMic();
      if (e.code === "KeyV") toggleCam();
      if (e.code === "KeyC") toggleChat();
    });
  }

  window.addEventListener("DOMContentLoaded", init);
})();