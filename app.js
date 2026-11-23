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
    micOn: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
    micOff: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
    camOn: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
    camOff: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="m2 2 20 20"/></svg>',
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

    // Чат и голос
    chatOpen: false,
    activeTab: "chat",
    unreadCount: 0,
    messages: [],
    replyTo: null,
    typingTimer: null,
    lastTypingSent: 0,
    voiceRecorder: null,
    voiceChunks: [],
    voiceTimerInt: null,
    voiceStartedAt: 0,

    // Тест-бот
    botEnabled: false,
    botSpeaking: false,
    botScreenTest: false,
    botRaf: null,
    botEchoRecording: false
  };

  /* -------------------- УТИЛИТЫ -------------------- */
  function uid(len = 6) {
    return Math.random().toString(36).slice(2, 2 + len);
  }

  function randomRoomName() {
    const words = ["nova", "cyber", "cosmos", "pulse", "vibe", "aurora", "pixel", "turbo"];
    const w = words[Math.floor(Math.random() * words.length)];
    return `zcall-${w}-${uid(4)}`;
  }

  function formatTime(ts = Date.now()) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatSec(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(Math.floor(sec % 60)).padStart(2, "0");
    return `${m}:${s}`;
  }

  function formatBytes(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
  }

  function displayNameOf(participant) {
    if (!participant) return "Участник";
    const id = participant.identity || "";
    const prof = state.profiles.get(id);
    if (prof?.name) return prof.name;
    if (participant.name) return participant.name;
    return id.includes("__") ? id.split("__")[0] : id;
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
      const gain = sfxCtx.createGain();
      osc.connect(gain);
      gain.connect(sfxCtx.destination);
      if (type === "join") {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now); osc.stop(now + 0.23);
      } else if (type === "leave") {
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.16);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.22);
      } else if (type === "chat") {
        osc.frequency.setValueAtTime(860, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.13);
      }
    } catch (_) {}
  }

  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem("zcall_theme", theme);
    document.body.setAttribute("data-theme", theme);
    document.querySelectorAll("[data-set-theme]").forEach((b) => {
      b.classList.toggle("active", b.dataset.setTheme === theme);
    });
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
    const camEncoding =
      state.quality === "4k" ? { maxBitrate: 10_000_000, maxFramerate: 60 }
        : state.quality === "720" ? { maxBitrate: 1_700_000, maxFramerate: 30 }
        : { maxBitrate: 4_500_000, maxFramerate: 60 };
    const screenEncoding =
      state.quality === "4k" ? { maxBitrate: 14_000_000, maxFramerate: 60 }
        : state.quality === "720" ? { maxBitrate: 2_500_000, maxFramerate: 30 }
        : { maxBitrate: 8_000_000, maxFramerate: 60 };
    const audioPreset =
      state.audioPreset === "stereo" ? LK.AudioPresets.musicHighQualityStereo
        : state.audioPreset === "speech" ? LK.AudioPresets.speech
        : LK.AudioPresets.musicHighQuality;
    return {
      audioPreset,
      forceStereo: state.audioPreset === "stereo",
      dtx: state.audioPreset === "speech",
      red: true,
      videoEncoding: camEncoding,
      screenShareEncoding: screenEncoding,
      simulcast: true,
      videoCodec: "vp9",
      backupCodec: { codec: "vp8" }
    };
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

  /* -------------------- ПРЕДВХОД (ЛОББИ) -------------------- */
  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === "audioinput");
    const cams = devices.filter((d) => d.kind === "videoinput");

    const fill = (sel, list, prefix, currentVal) => {
      if (!sel) return;
      sel.innerHTML = "";
      if (!list.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Устройства не найдены";
        sel.appendChild(opt);
        return;
      }
      list.forEach((d, idx) => {
        const opt = document.createElement("option");
        opt.value = d.deviceId;
        opt.textContent = d.label || `${prefix} #${idx + 1}`;
        sel.appendChild(opt);
      });
      if (currentVal && list.some((d) => d.deviceId === currentVal)) sel.value = currentVal;
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
    if (state.audioMeterCtx) {
      state.audioMeterCtx.close().catch(() => {});
      state.audioMeterCtx = null;
    }
    if (state.previewStream) {
      state.previewStream.getTracks().forEach((t) => t.stop());
      state.previewStream = null;
    }
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

    const first = (state.nick || "Z").trim()[0] || "Z";
    $("previewAvatar").textContent = first.toUpperCase();
  }

  async function startPreviewMedia() {
    stopPreviewMedia();
    if (!navigator.mediaDevices?.getUserMedia) {
      $("lobbyStatus").textContent = "Для камеры и микрофона нужен HTTPS.";
      updatePreviewVisuals();
      return;
    }
    try {
      const constraints = {
        audio: state.micEnabled ? (state.audioDeviceId ? { deviceId: { ideal: state.audioDeviceId } } : true) : false,
        video: state.camEnabled
          ? { ...(state.videoDeviceId ? { deviceId: { ideal: state.videoDeviceId } } : {}), width: { ideal: 1280 }, height: { ideal: 720 } }
          : false
      };
      if (!constraints.audio && !constraints.video) {
        updatePreviewVisuals();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.previewStream = stream;
      if (stream.getVideoTracks().length) $("previewVideo").srcObject = stream;
      if (stream.getAudioTracks().length) startMicMeter(stream);
      await loadDevices();
      $("lobbyStatus").textContent = "";
    } catch {
      if (state.camEnabled) {
        state.camEnabled = false;
        $("lobbyStatus").textContent = "Камера недоступна — можно войти с микрофоном или только в чат.";
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
        const pct = Math.min(100, Math.round(((sum / data.length) / 60) * 100));
        $("micMeterFill").style.width = `${pct}%`;
        state.audioMeterRaf = requestAnimationFrame(tick);
      };
      tick();
    } catch (_) {}
  }

  /* -------------------- ВХОД В КОМНАТУ -------------------- */
  async function fetchSandboxToken(roomName, identity) {
    const res = await fetch(SANDBOX_ENDPOINT, {
      method: "POST",
      headers: { "X-Sandbox-ID": state.sandboxId, "Content-Type": "application/json" },
      body: JSON.stringify({ room_name: roomName, participant_name: identity })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Сервер токенов вернул ${res.status}. Проверь Sandbox в LiveKit Cloud. ${txt}`);
    }
    const data = await res.json();
    return {
      serverUrl: data.serverUrl || data.server_url,
      token: data.participantToken || data.participant_token
    };
  }

  async function joinRoom({ chatOnly = false, botMode = false } = {}) {
    if (!LK) {
      alert("LiveKit SDK не загрузился. Проверь подключение к интернету.");
      return;
    }
    const rawNick = $("nickInput").value.trim() || "Гость";
    let roomName = $("roomInput").value.trim() || randomRoomName();
    if (botMode && !roomName.startsWith("zcall-test-")) {
      roomName = `zcall-test-${uid(5)}`;
    }

    state.nick = rawNick;
    state.roomName = roomName;
    localStorage.setItem("zcall_nick", rawNick);
    if (!botMode) window.location.hash = encodeURIComponent(roomName);

    if (chatOnly) {
      state.micEnabled = false;
      state.camEnabled = false;
    }
    state.botEnabled = botMode;
    state.botScreenTest = false;

    const safeSlug = rawNick.replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 14) || "user";
    state.localIdentity = `${safeSlug}__${uid(4)}`;

    $("joinBtn").disabled = true;
    $("joinChatOnlyBtn").disabled = true;
    $("joinBotBtn").disabled = true;
    $("lobbyStatus").textContent = "Подключение к серверу...";

    stopPreviewMedia();

    try {
      const { serverUrl, token } = await fetchSandboxToken(roomName, state.localIdentity);

      const room = new LK.Room({
        adaptiveStream: true,
        dynacast: true,
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
      $("roomTitleBadge").textContent = roomName;
      $("sandboxIdInput").value = state.sandboxId;
      syncRoomSettingsUI();

      // На ПК или в режиме «Только чат» / «Тест-бот» открываем чат сразу
      const shouldOpenChat = chatOnly || botMode || window.innerWidth >= 960;
      toggleChat(shouldOpenChat);
      switchSidebarTab("chat");

      if (!chatOnly) {
        try {
          if (state.micEnabled) await room.localParticipant.setMicrophoneEnabled(true, getAudioCaptureOpts());
        } catch {
          state.micEnabled = false;
          showToast("Не удалось включить микрофон");
        }
        try {
          if (state.camEnabled) await room.localParticipant.setCameraEnabled(true, getVideoCaptureOpts());
        } catch {
          state.camEnabled = false;
          showToast("Не удалось включить камеру");
        }
      }

      $("toggleBotBtn").classList.toggle("active", state.botEnabled);
      renderAllTiles();
      updateDockButtons();
      startCallTimers();
      broadcastProfile();
      playSfx("join");

      if (state.botEnabled) {
        startBotEngine(true);
      } else {
        showToast(`Подключено к ${roomName}`);
      }
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
          senderName: displayNameOf(sender) || (participantInfo?.identity || "").split("__")[0] || "Участник",
          text: "",
          voiceUrl: isVoice ? blobUrl : null,
          imageUrl: isImage ? blobUrl : null,
          fileUrl: !isImage && !isVoice ? blobUrl : null,
          fileName: fname,
          fileSize: info.size || blob.size,
          time: Date.now()
        });
      } catch (err) {
        console.error("File receive error:", err);
      }
    });

    room
      .on(RE.ParticipantConnected, (p) => {
        playSfx("join");
        showToast(`${displayNameOf(p)} вошёл в комнату`);
        setTimeout(() => broadcastProfile(), 400);
        renderAllTiles();
      })
      .on(RE.ParticipantDisconnected, (p) => {
        playSfx("leave");
        showToast(`${displayNameOf(p)} вышел из комнаты`);
        cleanupParticipantAudio(p.identity);
        if (state.pinnedIdentity === p.identity) state.pinnedIdentity = null;
        renderAllTiles();
      })
      .on(RE.TrackSubscribed, (track, pub, p) => {
        if (track.kind === LK.Track.Kind.Audio) attachRemoteAudio(track, pub, p);
        renderAllTiles();
      })
      .on(RE.TrackUnsubscribed, (track, pub, p) => {
        track.detach().forEach((el) => el.remove());
        if (track.kind === LK.Track.Kind.Audio) removeAudioEl(`${p.identity}_${pub.source}`);
        renderAllTiles();
      })
      .on(RE.LocalTrackPublished, () => renderAllTiles())
      .on(RE.LocalTrackUnpublished, () => renderAllTiles())
      .on(RE.TrackMuted, () => renderAllTiles())
      .on(RE.TrackUnmuted, () => renderAllTiles())
      .on(RE.ActiveSpeakersChanged, (speakers) => {
        const ids = new Set(speakers.map((s) => s.identity));
        document.querySelectorAll(".participant-tile").forEach((tile) => {
          if (tile.dataset.identity === "zcall-bot") {
            tile.classList.toggle("speaking", state.botSpeaking);
          } else {
            tile.classList.toggle("speaking", ids.has(tile.dataset.identity));
          }
        });
      })
      .on(RE.ConnectionQualityChanged, (quality, participant) => {
        if (participant.identity === state.localIdentity) {
          const dot = $("localNetQuality").querySelector(".status-dot");
          const txt = $("localNetQuality").querySelector("span:last-child");
          dot.className = "status-dot";
          if (quality === LK.ConnectionQuality.Excellent) { dot.classList.add("good"); txt.textContent = "Отлично"; }
          else if (quality === LK.ConnectionQuality.Good) { dot.classList.add("good"); txt.textContent = "Стабильно"; }
          else if (quality === LK.ConnectionQuality.Poor) { dot.classList.add("warn"); txt.textContent = "Слабая сеть"; }
          else { dot.classList.add("bad"); txt.textContent = "Обрыв"; }
        }
      })
      .on(RE.AudioPlaybackStatusChanged, () => {
        $("audioUnlockBanner").classList.toggle("hidden", room.canPlaybackAudio);
      })
      .on(RE.Reconnecting, () => $("reconnectBanner").classList.remove("hidden"))
      .on(RE.Reconnected, () => {
        $("reconnectBanner").classList.add("hidden");
        showToast("Связь восстановлена");
      })
      .on(RE.Disconnected, () => cleanupRoom())
      .on(RE.DataReceived, (payload, participant, _kind, topic) => {
        try {
          const msg = JSON.parse(decoder.decode(payload));
          handleIncomingData(topic, msg, participant);
        } catch (_) {}
      });
  }

  function getParticipantByIdentity(identity) {
    if (!state.room || !identity) return null;
    if (identity === state.localIdentity) return state.room.localParticipant;
    return state.room.remoteParticipants.get(identity) || null;
  }

  /* -------------------- ОБМЕН ДАННЫМИ -------------------- */
  async function sendData(topic, obj, reliable = true) {
    if (!state.room) return;
    try {
      await state.room.localParticipant.publishData(encoder.encode(JSON.stringify(obj)), { reliable, topic });
    } catch (_) {}
  }

  function broadcastProfile() {
    sendData("zcall-profile", { name: state.nick, filter: state.filter, handRaised: state.handRaised });
  }

  function handleIncomingData(topic, data, participant) {
    const id = participant?.identity;
    if (topic === "zcall-profile" && id) {
      state.profiles.set(id, {
        name: data.name || displayNameOf(participant),
        filter: data.filter || "none",
        handRaised: !!data.handRaised
      });
      if (data.handRaised) showToast(`${data.name || "Участник"} поднял(а) руку`);
      renderAllTiles();
    } else if (topic === "zcall-reaction") {
      spawnFloatingReaction(data.emoji, data.name || displayNameOf(participant));
    } else if (topic === "zcall-chat") {
      appendChatMessage({
        id: data.id,
        senderIdentity: id || data.senderIdentity,
        senderName: data.senderName || displayNameOf(participant),
        text: data.text,
        replyTo: data.replyTo || null,
        time: data.time || Date.now()
      });
    } else if (topic === "zcall-chat-react") {
      applyMessageReaction(data.msgId, data.emoji, id || data.senderIdentity);
    } else if (topic === "zcall-typing") {
      showRemoteTyping(data.name || displayNameOf(participant));
    }
  }

  /* -------------------- АУДИО ПОТОКИ -------------------- */
  function attachRemoteAudio(track, pub, participant) {
    const key = `${participant.identity}_${pub.source}`;
    removeAudioEl(key);
    const el = track.attach();
    el.autoplay = true;
    el.playsInline = true;
    el.style.display = "none";
    el.volume = Math.max(0, Math.min(1, (state.volumes.get(participant.identity) ?? 100) / 100));
    document.body.appendChild(el);
    state.audioEls.set(key, { el, identity: participant.identity });
    el.play().catch(() => {
      if (state.room && !state.room.canPlaybackAudio) $("audioUnlockBanner").classList.remove("hidden");
    });
  }

  function removeAudioEl(key) {
    const item = state.audioEls.get(key);
    if (item) {
      item.el.remove();
      state.audioEls.delete(key);
    }
  }

  function cleanupParticipantAudio(identity) {
    for (const [key, item] of state.audioEls.entries()) {
      if (item.identity === identity) {
        item.el.remove();
        state.audioEls.delete(key);
      }
    }
  }

  function setParticipantVolume(identity, volPercent) {
    state.volumes.set(identity, volPercent);
    for (const item of state.audioEls.values()) {
      if (item.identity === identity) item.el.volume = Math.max(0, Math.min(1, volPercent / 100));
    }
  }

  /* -------------------- ТЕСТ-БОТ (ПРОВЕРКА ЗВОНКА) -------------------- */
  function startBotEngine(runInitialReport = false) {
    state.botEnabled = true;
    $("toggleBotBtn").classList.add("active");
    renderAllTiles();

    if (runInitialReport) {
      const lp = state.room?.localParticipant;
      const camPub = lp?.getTrackPublication(LK.Track.Source.Camera);
      const camSet = camPub?.track?.mediaStreamTrack?.getSettings?.();
      const camInfo = state.camEnabled && camSet ? `${camSet.width}x${camSet.height} @ ${Math.round(camSet.frameRate || 30)} FPS` : "выключена";
      const micInfo = state.micEnabled ? "включён" : "выключен";

      setTimeout(() => {
        appendChatMessage({
          id: uid(8),
          senderIdentity: "zcall-bot",
          senderName: "Zcall Бот",
          text:
            `Диагностика комнаты "${state.roomName}" пройдена:\n` +
            `• Сервер LiveKit: Подключён (${state.sandboxId})\n` +
            `• Микрофон: ${micInfo}\n` +
            `• Камера: ${camInfo}\n\n` +
            `Нажми "Эхо 4с" на моей карточке, чтобы услышать свой микрофон, или напиши сюда любое сообщение (слова "фото", "голос", "экран" запускают тесты).`,
          time: Date.now()
        });
      }, 450);
    }
  }

  function stopBotEngine() {
    state.botEnabled = false;
    state.botScreenTest = false;
    state.botSpeaking = false;
    if (state.botRaf) cancelAnimationFrame(state.botRaf);
    state.botRaf = null;
    $("toggleBotBtn").classList.remove("active");
    renderAllTiles();
  }

  function mountBotCanvasLoop(canvas, isStage = false) {
    if (!canvas) return;
    canvas.width = isStage ? 1280 : 640;
    canvas.height = isStage ? 720 : 400;
    const ctx = canvas.getContext("2d");
    let t = 0;

    const draw = () => {
      if (!state.botEnabled || !document.body.contains(canvas)) return;
      t += 0.04;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#0b1020");
      grad.addColorStop(1, "#161d36");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Сетка/волны
      ctx.strokeStyle = isStage ? "rgba(88, 101, 242, 0.25)" : "rgba(88, 101, 242, 0.35)";
      ctx.lineWidth = isStage ? 2 : 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 24) {
          const amp = (state.botSpeaking ? 36 : 14) * (1 - i * 0.2);
          const y = h / 2 + Math.sin(x * 0.012 + t + i * 1.4) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Центральный круг
      const r = (isStage ? 70 : 42) + (state.botSpeaking ? Math.sin(t * 4) * 8 : 0);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = state.botSpeaking ? "rgba(34, 197, 94, 0.25)" : "rgba(88, 101, 242, 0.22)";
      ctx.fill();
      ctx.strokeStyle = state.botSpeaking ? "#22c55e" : "#5865f2";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#f3f5fa";
      ctx.textAlign = "center";
      ctx.font = `700 ${isStage ? 26 : 16}px Inter, sans-serif`;
      ctx.fillText(isStage ? "Тест демонстрации экрана · 1080p HQ" : "Zcall Тест-Бот", w / 2, h / 2 + (isStage ? 120 : 78));

      ctx.fillStyle = "#94a0b8";
      ctx.font = `500 ${isStage ? 16 : 12}px Inter, sans-serif`;
      ctx.fillText(
        isStage
          ? `Двойной клик — полный экран · LiveKit ${state.sandboxId}`
          : state.botEchoRecording
          ? "Слушаю ваш микрофон (4 сек)..."
          : state.botSpeaking
          ? "Воспроизведение вашего эхо..."
          : "Готов к проверке микрофона и чата",
        w / 2,
        h / 2 + (isStage ? 148 : 98)
      );

      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  async function runBotEchoTest() {
    if (state.botEchoRecording) return;
    let tempStream = null;
    let recStream = null;

    try {
      const existingTrack = state.room?.localParticipant?.getTrackPublication(LK.Track.Source.Microphone)?.track?.mediaStreamTrack;
      if (existingTrack && existingTrack.readyState === "live" && state.micEnabled) {
        recStream = new MediaStream([existingTrack.clone()]);
      } else {
        tempStream = await navigator.mediaDevices.getUserMedia({
          audio: state.audioDeviceId ? { deviceId: state.audioDeviceId } : true
        });
        recStream = tempStream;
      }

      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
      const recorder = mime ? new MediaRecorder(recStream, { mimeType: mime }) : new MediaRecorder(recStream);
      const chunks = [];

      state.botEchoRecording = true;
      showToast("Говорите в микрофон — запись 4 секунды...");
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

      recorder.onstop = () => {
        state.botEchoRecording = false;
        recStream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mime || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = Math.max(0, Math.min(1, (state.volumes.get("zcall-bot") ?? 100) / 100));
        state.botSpeaking = true;
        document.querySelector('.participant-tile[data-identity="zcall-bot"]')?.classList.add("speaking");
        showToast("Воспроизвожу ваш голос (эхо-тест)");
        audio.onended = () => {
          state.botSpeaking = false;
          document.querySelector('.participant-tile[data-identity="zcall-bot"]')?.classList.remove("speaking");
          URL.revokeObjectURL(url);
        };
        audio.play().catch(() => {
          state.botSpeaking = false;
          showToast("Браузер заблокировал воспроизведение — кликните по странице");
        });
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 4000);
    } catch {
      state.botEchoRecording = false;
      tempStream?.getTracks().forEach((t) => t.stop());
      showToast("Не удалось получить доступ к микрофону для эхо-теста");
    }
  }

  function makeTestImageBlob() {
    return new Promise((resolve) => {
      const c = document.createElement("canvas");
      c.width = 800;
      c.height = 450;
      const ctx = c.getContext("2d");
      const g = ctx.createLinearGradient(0, 0, 800, 450);
      g.addColorStop(0, "#1e1b4b");
      g.addColorStop(1, "#0f172a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 800, 450);
      ctx.strokeStyle = "#5865f2";
      ctx.lineWidth = 4;
      ctx.strokeRect(24, 24, 752, 402);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Zcall · Тестовое изображение", 400, 215);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "20px Inter, sans-serif";
      ctx.fillText(`Комната: ${state.roomName} · ${formatTime()}`, 400, 260);
      c.toBlob(resolve, "image/png");
    });
  }

  function makeTestVoiceWavBlob() {
    const sampleRate = 22050;
    const duration = 1.6;
    const len = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + len * 2);
    const view = new DataView(buffer);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + len * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const freq = t < 0.5 ? 523.25 : t < 1.0 ? 659.25 : 783.99;
      const env = Math.sin(Math.min(1, (t % 0.5) / 0.05) * Math.PI * 0.5) * Math.exp(-3 * (t % 0.5));
      view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * freq * t) * env * 12000, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  async function runBotChatTest() {
    const imgBlob = await makeTestImageBlob();
    if (imgBlob) {
      appendChatMessage({
        id: uid(8),
        senderIdentity: "zcall-bot",
        senderName: "Zcall Бот",
        text: "Проверка отправки изображений и просмотра (кликни по картинке):",
        imageUrl: URL.createObjectURL(imgBlob),
        fileName: "zcall-test.png",
        time: Date.now()
      });
    }
    const wavBlob = makeTestVoiceWavBlob();
    appendChatMessage({
      id: uid(8),
      senderIdentity: "zcall-bot",
      senderName: "Zcall Бот",
      text: "",
      voiceUrl: URL.createObjectURL(wavBlob),
      fileName: "zcall-voice-bot.wav",
      time: Date.now()
    });
  }

  function handleBotReplyToUser(userMsg) {
    if (!state.botEnabled) return;
    const low = (userMsg.text || "").toLowerCase();
    setTimeout(async () => {
      if (!state.botEnabled) return;
      applyMessageReaction(userMsg.id, "👍", "zcall-bot");
      if (low.includes("фото") || low.includes("картин")) {
        const blob = await makeTestImageBlob();
        appendChatMessage({
          id: uid(8),
          senderIdentity: "zcall-bot",
          senderName: "Zcall Бот",
          text: "Вот тестовая картинка:",
          imageUrl: URL.createObjectURL(blob),
          fileName: "zcall-test.png",
          replyTo: { id: userMsg.id, senderName: userMsg.senderName, preview: userMsg.text },
          time: Date.now()
        });
      } else if (low.includes("голос")) {
        appendChatMessage({
          id: uid(8),
          senderIdentity: "zcall-bot",
          senderName: "Zcall Бот",
          voiceUrl: URL.createObjectURL(makeTestVoiceWavBlob()),
          fileName: "zcall-voice-bot.wav",
          time: Date.now()
        });
      } else if (low.includes("экран")) {
        state.botScreenTest = !state.botScreenTest;
        renderAllTiles();
      } else {
        appendChatMessage({
          id: uid(8),
          senderIdentity: "zcall-bot",
          senderName: "Zcall Бот",
          text: `Сообщение получено: "${userMsg.text}". Всё работает стабильно!`,
          replyTo: { id: userMsg.id, senderName: userMsg.senderName, preview: userMsg.text },
          time: Date.now()
        });
      }
    }, 650);
  }

  /* -------------------- СЕТКА, СЦЕНА И УЧАСТНИКИ -------------------- */
  function renderAllTiles() {
    if (!state.room) return;
    const remotes = Array.from(state.room.remoteParticipants.values());
    const allReal = [state.room.localParticipant, ...remotes];
    const totalCount = allReal.length + (state.botEnabled ? 1 : 0);

    $("participantCountNum").textContent = String(totalCount);
    $("tabParticipantsCount").textContent = String(totalCount);

    let stageTrack = null;
    let stageOwner = null;
    let isScreenOnStage = false;
    let isBotStage = false;

    for (const p of allReal) {
      const screenPub = p.getTrackPublication(LK.Track.Source.ScreenShare);
      if (screenPub?.track && !screenPub.isMuted) {
        stageTrack = screenPub.track;
        stageOwner = p;
        isScreenOnStage = true;
        break;
      }
    }

    if (!stageTrack && state.botEnabled && state.botScreenTest) {
      isBotStage = true;
      isScreenOnStage = true;
    } else if (!stageTrack && state.pinnedIdentity) {
      const pinnedP = getParticipantByIdentity(state.pinnedIdentity);
      const camPub = pinnedP?.getTrackPublication(LK.Track.Source.Camera);
      if (camPub?.track && !camPub.isMuted) {
        stageTrack = camPub.track;
        stageOwner = pinnedP;
      }
    }

    const stageAndGrid = $("stageAndGrid");
    const stageWrapper = $("stageWrapper");
    const stageArea = $("stageVideoArea");

    if (isBotStage) {
      stageAndGrid.classList.add("has-stage");
      stageWrapper.classList.remove("hidden");
      $("stageTitle").textContent = "Тестовая демонстрация экрана";
      $("stagePresenterName").textContent = "· Zcall Бот";
      $("stageClosePinBtn").classList.add("hidden");
      stageArea.innerHTML = "";
      const c = document.createElement("canvas");
      c.ondblclick = () => toggleStageFullscreen();
      stageArea.appendChild(c);
      mountBotCanvasLoop(c, true);
    } else if (stageTrack && stageOwner) {
      stageAndGrid.classList.add("has-stage");
      stageWrapper.classList.remove("hidden");
      $("stageTitle").textContent = isScreenOnStage ? "Демонстрация экрана" : "Закреплено";
      $("stagePresenterName").textContent = `· ${displayNameOf(stageOwner)}`;
      $("stageClosePinBtn").classList.toggle("hidden", isScreenOnStage);
      stageArea.innerHTML = "";
      const vEl = stageTrack.attach();
      vEl.autoplay = true;
      vEl.playsInline = true;
      vEl.muted = stageOwner.identity === state.localIdentity;
      vEl.ondblclick = () => toggleStageFullscreen();
      stageArea.appendChild(vEl);
    } else {
      stageAndGrid.classList.remove("has-stage");
      stageWrapper.classList.add("hidden");
      stageArea.innerHTML = "";
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
        const videoEl = camPub.track.attach();
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        if (isLocal && state.mirrorSelf) videoEl.classList.add("mirrored");
        if (filter !== "none") videoEl.classList.add(`filter-${filter}`);
        tile.appendChild(videoEl);
      } else {
        const fb = document.createElement("div");
        fb.className = "tile-avatar-fallback";
        const av = document.createElement("div");
        av.className = "avatar-circle";
        av.textContent = (name[0] || "Z").toUpperCase();
        fb.appendChild(av);
        tile.appendChild(fb);
      }

      if (hand) {
        const topBadges = document.createElement("div");
        topBadges.className = "tile-top-badges";
        const hb = document.createElement("span");
        hb.className = "tile-pill hand-badge";
        hb.textContent = "Рука поднята";
        topBadges.appendChild(hb);
        tile.appendChild(topBadges);
      }

      const bar = document.createElement("div");
      bar.className = "tile-bottom-bar";

      const nameWrap = document.createElement("div");
      nameWrap.className = "tile-name-wrap";
      const micSpan = document.createElement("span");
      micSpan.innerHTML = isMicMuted ? SVG.micOff : SVG.micOn;
      const nameSpan = document.createElement("span");
      nameSpan.className = "tile-name";
      nameSpan.textContent = isLocal ? `${name} (Вы)` : name;
      nameWrap.append(micSpan, nameSpan);

      const actions = document.createElement("div");
      actions.className = "tile-actions";

      if (!isLocal) {
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "100";
        slider.value = String(state.volumes.get(p.identity) ?? 100);
        slider.className = "tile-vol-slider";
        slider.title = "Громкость";
        slider.oninput = (e) => setParticipantVolume(p.identity, Number(e.target.value));
        actions.appendChild(slider);
      }

      if (hasVideo) {
        const pinBtn = document.createElement("button");
        pinBtn.className = "tile-mini-btn";
        pinBtn.title = state.pinnedIdentity === p.identity ? "Открепить" : "Закрепить";
        pinBtn.innerHTML = SVG.pin;
        pinBtn.onclick = () => {
          state.pinnedIdentity = state.pinnedIdentity === p.identity ? null : p.identity;
          renderAllTiles();
        };
        actions.appendChild(pinBtn);
      }

      bar.append(nameWrap, actions);
      tile.appendChild(bar);
      grid.appendChild(tile);
    });

    // Карточка Тест-бота
    if (state.botEnabled) {
      const tile = document.createElement("div");
      tile.className = "participant-tile";
      tile.dataset.identity = "zcall-bot";
      if (state.botSpeaking) tile.classList.add("speaking");

      const canvas = document.createElement("canvas");
      canvas.className = "bot-canvas";
      tile.appendChild(canvas);
      mountBotCanvasLoop(canvas, false);

      const botControls = document.createElement("div");
      botControls.className = "bot-tile-controls";

      const echoBtn = document.createElement("button");
      echoBtn.className = "bot-action-chip";
      echoBtn.textContent = state.botEchoRecording ? "Идёт запись..." : "Эхо-тест 4с";
      echoBtn.onclick = runBotEchoTest;

      const scrBtn = document.createElement("button");
      scrBtn.className = "bot-action-chip";
      scrBtn.textContent = state.botScreenTest ? "Убрать экран" : "Тест экрана";
      scrBtn.onclick = () => { state.botScreenTest = !state.botScreenTest; renderAllTiles(); };

      const chatBtn = document.createElement("button");
      chatBtn.className = "bot-action-chip";
      chatBtn.textContent = "Тест чата";
      chatBtn.onclick = runBotChatTest;

      botControls.append(echoBtn, scrBtn, chatBtn);
      tile.appendChild(botControls);

      const bar = document.createElement("div");
      bar.className = "tile-bottom-bar";
      const nw = document.createElement("div");
      nw.className = "tile-name-wrap";
      const micSpan = document.createElement("span");
      micSpan.innerHTML = SVG.micOn;
      const ns = document.createElement("span");
      ns.className = "tile-name";
      ns.textContent = "Zcall Тест-Бот";
      nw.append(micSpan, ns);

      const acts = document.createElement("div");
      acts.className = "tile-actions";
      const slider = document.createElement("input");
      slider.type = "range"; slider.min = "0"; slider.max = "100";
      slider.value = String(state.volumes.get("zcall-bot") ?? 100);
      slider.className = "tile-vol-slider";
      slider.oninput = (e) => state.volumes.set("zcall-bot", Number(e.target.value));
      acts.appendChild(slider);
      bar.append(nw, acts);
      tile.appendChild(bar);

      grid.appendChild(tile);
    }

    renderParticipantsTab(allReal);
  }

  function renderParticipantsTab(allReal) {
    const list = $("participantsList");
    if (!list) return;
    list.innerHTML = "";

    const items = allReal.map((p) => {
      const isLocal = p.identity === state.localIdentity;
      const micPub = p.getTrackPublication(LK.Track.Source.Microphone);
      const camPub = p.getTrackPublication(LK.Track.Source.Camera);
      return {
        identity: p.identity,
        name: isLocal ? `${state.nick} (Вы)` : displayNameOf(p),
        role: isLocal ? "Вы" : "Участник",
        micOn: isLocal ? state.micEnabled : !!(micPub && !micPub.isMuted),
        camOn: isLocal ? state.camEnabled : !!(camPub && !camPub.isMuted),
        isLocal
      };
    });

    if (state.botEnabled) {
      items.push({ identity: "zcall-bot", name: "Zcall Тест-Бот", role: "Проверка связи", micOn: true, camOn: true, isLocal: false });
    }

    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "p-list-item";

      const left = document.createElement("div");
      left.className = "p-list-left";
      const av = document.createElement("div");
      av.className = "p-mini-av";
      av.textContent = (it.name[0] || "Z").toUpperCase();
      const info = document.createElement("div");
      const nm = document.createElement("div");
      nm.className = "p-list-name";
      nm.textContent = it.name;
      const rl = document.createElement("div");
      rl.className = "p-list-role";
      rl.textContent = it.role;
      info.append(nm, rl);
      left.append(av, info);

      const right = document.createElement("div");
      right.className = "p-list-right";
      const mIcon = document.createElement("span");
      mIcon.innerHTML = it.micOn ? SVG.micOn : SVG.micOff;
      const cIcon = document.createElement("span");
      cIcon.innerHTML = it.camOn ? SVG.camOn : SVG.camOff;
      right.append(mIcon, cIcon);

      row.append(left, right);
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
    if (!vid || !document.pictureInPictureEnabled) {
      showToast("PiP доступен для видеопотока экрана или камеры");
      return;
    }
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await vid.requestPictureInPicture();
    } catch (_) {}
  }

  /* -------------------- ПАНЕЛЬ ЗВОНКА -------------------- */
  function updateDockButtons() {
    $("micBtn").className = `dock-btn ${state.micEnabled ? "active" : "off"}`;
    $("micBtnIcon").innerHTML = state.micEnabled ? SVG.micOn : SVG.micOff;
    $("camBtn").className = `dock-btn ${state.camEnabled ? "active" : "off"}`;
    $("camBtnIcon").innerHTML = state.camEnabled ? SVG.camOn : SVG.camOff;
    $("screenBtn").className = `dock-btn ${state.screenSharing ? "highlight" : ""}`;
    $("handBtn").className = `dock-btn ${state.handRaised ? "highlight" : ""}`;
    $("chatToggleBtn").className = `dock-btn ${state.chatOpen ? "highlight" : ""}`;
  }

  async function toggleMic() {
    if (!state.room) return;
    const next = !state.micEnabled;
    try {
      await state.room.localParticipant.setMicrophoneEnabled(next, getAudioCaptureOpts());
      state.micEnabled = next;
      updateDockButtons();
      renderAllTiles();
    } catch {
      showToast("Нет доступа к микрофону");
    }
  }

  async function toggleCam() {
    if (!state.room) return;
    const next = !state.camEnabled;
    try {
      await state.room.localParticipant.setCameraEnabled(next, getVideoCaptureOpts());
      state.camEnabled = next;
      updateDockButtons();
      renderAllTiles();
    } catch {
      showToast("Нет доступа к камере");
    }
  }

  async function toggleScreenShare() {
    if (!state.room) return;
    if (!canScreenShare) {
      showToast("Этот мобильный браузер не разрешает отдавать свой экран, но чужой экран отобразится в 1080p.");
      return;
    }
    const next = !state.screenSharing;
    try {
      const pubDefaults = getPublishDefaults();
      await state.room.localParticipant.setScreenShareEnabled(
        next,
        getScreenCaptureOpts(),
        next ? {
          screenShareEncoding: pubDefaults.screenShareEncoding,
          degradationPreference: state.screenMode === "detail" ? "maintain-resolution" : "maintain-framerate",
          simulcast: true
        } : undefined
      );
      state.screenSharing = next;
      updateDockButtons();
      renderAllTiles();
    } catch (e) {
      state.screenSharing = false;
      updateDockButtons();
      if (e?.name !== "NotAllowedError") showToast("Не удалось запустить показ экрана");
    }
  }

  function toggleHand() {
    state.handRaised = !state.handRaised;
    updateDockButtons();
    broadcastProfile();
    renderAllTiles();
  }

  function spawnFloatingReaction(emoji, senderName) {
    const item = document.createElement("div");
    item.className = "floating-reaction";
    item.style.left = `${15 + Math.random() * 70}%`;
    const em = document.createElement("span");
    em.className = "emoji"; em.textContent = emoji;
    const sn = document.createElement("span");
    sn.className = "sender"; sn.textContent = senderName;
    item.append(em, sn);
    $("reactionsOverlay").appendChild(item);
    setTimeout(() => item.remove(), 2700);
  }

  /* -------------------- ЧАТ И ГОЛОСОВЫЕ СООБЩЕНИЯ -------------------- */
  function toggleChat(forceState) {
    state.chatOpen = typeof forceState === "boolean" ? forceState : !state.chatOpen;
    $("chatDrawer").classList.toggle("hidden", !state.chatOpen);
    if (state.chatOpen) {
      state.unreadCount = 0;
      $("chatBadge").classList.add("hidden");
      scrollChatBottom();
    }
    updateDockButtons();
  }

  function switchSidebarTab(tab) {
    state.activeTab = tab;
    $("tabChatBtn").classList.toggle("active", tab === "chat");
    $("tabParticipantsBtn").classList.toggle("active", tab === "participants");
    $("chatTabPanel").classList.toggle("hidden", tab !== "chat");
    $("participantsTabPanel").classList.toggle("hidden", tab !== "participants");
  }

  function scrollChatBottom() {
    const box = $("chatMessages");
    box.scrollTop = box.scrollHeight;
  }

  function appendChatMessage(msg) {
    const record = { ...msg, reactions: msg.reactions || {} };
    state.messages.push(record);
    renderSingleMessage(record);

    if (record.senderIdentity !== state.localIdentity) {
      playSfx("chat");
      if (!state.chatOpen) {
        state.unreadCount++;
        $("chatBadge").textContent = String(state.unreadCount);
        $("chatBadge").classList.remove("hidden");
      }
    }
    scrollChatBottom();
  }

  function renderTextWithLinks(container, text) {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    parts.forEach((part) => {
      if (/^https?:\/\/[^\s]+$/.test(part)) {
        const a = document.createElement("a");
        a.href = part;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = part;
        container.appendChild(a);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    });
  }

  function createVoicePlayerEl(url) {
    const wrap = document.createElement("div");
    wrap.className = "msg-voice-player";

    const audio = new Audio(url);
    const btn = document.createElement("button");
    btn.className = "voice-play-btn";
    btn.innerHTML = SVG.play;

    const track = document.createElement("div");
    track.className = "voice-track";
    const bg = document.createElement("div");
    bg.className = "voice-progress-bg";
    const fill = document.createElement("div");
    fill.className = "voice-progress-fill";
    bg.appendChild(fill);

    const dur = document.createElement("span");
    dur.className = "voice-duration";
    dur.textContent = "Голосовое";

    track.append(bg, dur);
    wrap.append(btn, track);

    audio.addEventListener("loadedmetadata", () => {
      if (isFinite(audio.duration)) dur.textContent = formatSec(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
        dur.textContent = formatSec(audio.currentTime);
      }
    });
    audio.addEventListener("ended", () => {
      btn.innerHTML = SVG.play;
      fill.style.width = "0%";
      if (isFinite(audio.duration)) dur.textContent = formatSec(audio.duration);
    });
    btn.onclick = () => {
      if (audio.paused) {
        audio.play().catch(() => {});
        btn.innerHTML = SVG.pause;
      } else {
        audio.pause();
        btn.innerHTML = SVG.play;
      }
    };
    return wrap;
  }

  function renderSingleMessage(msg) {
    const isSelf = msg.senderIdentity === state.localIdentity;
    const row = document.createElement("div");
    row.className = `msg-row ${isSelf ? "self" : ""}`;
    row.dataset.msgId = msg.id;

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    if (!isSelf) {
      const author = document.createElement("div");
      author.className = "msg-author";
      author.textContent = msg.senderName || "Участник";
      bubble.appendChild(author);
    }

    if (msg.replyTo) {
      const q = document.createElement("div");
      q.className = "msg-quote";
      const qa = document.createElement("strong"); qa.textContent = msg.replyTo.senderName;
      const qt = document.createElement("span"); qt.textContent = msg.replyTo.preview;
      q.append(qa, qt);
      bubble.appendChild(q);
    }

    if (msg.voiceUrl) {
      bubble.appendChild(createVoicePlayerEl(msg.voiceUrl));
    }

    if (msg.imageUrl) {
      const img = document.createElement("img");
      img.className = "msg-image";
      img.src = msg.imageUrl;
      img.alt = msg.fileName || "Изображение";
      img.onclick = () => openLightbox(msg.imageUrl, msg.fileName || "Изображение");
      bubble.appendChild(img);
    }

    if (msg.fileUrl) {
      const fc = document.createElement("div");
      fc.className = "msg-file-card";
      const meta = document.createElement("div");
      const fn = document.createElement("span"); fn.className = "msg-file-name"; fn.textContent = msg.fileName || "Файл";
      const fs = document.createElement("span"); fs.className = "msg-file-size"; fs.textContent = formatBytes(msg.fileSize);
      meta.append(fn, fs);

      const dl = document.createElement("a");
      dl.className = "ghost-btn small";
      dl.href = msg.fileUrl;
      dl.download = msg.fileName || "file";
      dl.innerHTML = SVG.download;
      fc.append(meta, dl);
      bubble.appendChild(fc);
    }

    if (msg.text) {
      const txt = document.createElement("div");
      txt.className = "msg-text";
      renderTextWithLinks(txt, msg.text);
      bubble.appendChild(txt);
    }

    const footer = document.createElement("div");
    footer.className = "msg-footer";
    const reactBox = document.createElement("div");
    reactBox.className = "msg-reactions";
    const timeEl = document.createElement("span");
    timeEl.className = "msg-time";
    timeEl.textContent = formatTime(msg.time);
    if (isSelf) {
      const chk = document.createElement("span");
      chk.innerHTML = SVG.checks;
      timeEl.appendChild(chk);
    }
    footer.append(reactBox, timeEl);
    bubble.appendChild(footer);

    const hoverBar = document.createElement("div");
    hoverBar.className = "msg-hover-actions";

    const replyBtn = document.createElement("button");
    replyBtn.innerHTML = `${SVG.reply}<span>Ответить</span>`;
    replyBtn.onclick = () => startReply(msg);
    hoverBar.appendChild(replyBtn);

    if (msg.text) {
      const copyBtn = document.createElement("button");
      copyBtn.innerHTML = `${SVG.copy}<span>Копировать</span>`;
      copyBtn.onclick = () => {
        navigator.clipboard?.writeText(msg.text).then(() => showToast("Текст скопирован"));
      };
      hoverBar.appendChild(copyBtn);
    }

    ["❤️", "👍", "🔥"].forEach((em) => {
      const rb = document.createElement("button");
      rb.textContent = em;
      rb.onclick = () => toggleChatReaction(msg.id, em);
      hoverBar.appendChild(rb);
    });

    row.append(bubble, hoverBar);
    $("chatMessages").appendChild(row);
  }

  function startReply(msg) {
    state.replyTo = {
      id: msg.id,
      senderName: msg.senderName,
      preview: msg.text || (msg.voiceUrl ? "Голосовое сообщение" : msg.imageUrl ? "Фотография" : msg.fileName || "Файл")
    };
    $("replyPreviewAuthor").textContent = `Ответ для ${msg.senderName}`;
    $("replyPreviewText").textContent = state.replyTo.preview;
    $("replyPreviewBar").classList.remove("hidden");
    $("chatInput").focus();
  }

  function cancelReply() {
    state.replyTo = null;
    $("replyPreviewBar").classList.add("hidden");
  }

  function toggleChatReaction(msgId, emoji) {
    applyMessageReaction(msgId, emoji, state.localIdentity);
    sendData("zcall-chat-react", { msgId, emoji });
  }

  function applyMessageReaction(msgId, emoji, userId) {
    const msg = state.messages.find((m) => m.id === msgId);
    if (!msg) return;
    if (!msg.reactions[emoji]) msg.reactions[emoji] = new Set();
    if (msg.reactions[emoji].has(userId)) {
      msg.reactions[emoji].delete(userId);
      if (msg.reactions[emoji].size === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].add(userId);
    }

    const row = $("chatMessages").querySelector(`.msg-row[data-msg-id="${CSS.escape(msgId)}"]`);
    if (!row) return;
    const box = row.querySelector(".msg-reactions");
    box.innerHTML = "";
    Object.entries(msg.reactions).forEach(([em, users]) => {
      const chip = document.createElement("button");
      chip.className = "msg-react-chip";
      chip.textContent = `${em} ${users.size}`;
      chip.onclick = () => toggleChatReaction(msgId, em);
      box.appendChild(chip);
    });
  }

  async function sendChatText() {
    const input = $("chatInput");
    const text = input.value.trim();
    if (!text || !state.room) return;

    const msg = {
      id: uid(9),
      senderIdentity: state.localIdentity,
      senderName: state.nick,
      text,
      replyTo: state.replyTo ? { ...state.replyTo } : null,
      time: Date.now()
    };

    input.value = "";
    input.style.height = "auto";
    cancelReply();
    appendChatMessage(msg);
    await sendData("zcall-chat", msg);
    handleBotReplyToUser(msg);
  }

  async function sendFiles(fileList, forceVoice = false) {
    if (!state.room || !fileList?.length) return;
    for (const file of fileList) {
      if (file.size > 25 * 1024 * 1024) {
        showToast(`Файл ${file.name} больше 25 МБ`);
        continue;
      }
      const localUrl = URL.createObjectURL(file);
      const isVoice = forceVoice || (file.name || "").startsWith("zcall-voice-");
      const isImg = !isVoice && (file.type || "").startsWith("image/");

      appendChatMessage({
        id: uid(9),
        senderIdentity: state.localIdentity,
        senderName: state.nick,
        text: "",
        voiceUrl: isVoice ? localUrl : null,
        imageUrl: isImg ? localUrl : null,
        fileUrl: !isImg && !isVoice ? localUrl : null,
        fileName: file.name || "file",
        fileSize: file.size,
        time: Date.now()
      });

      try {
        await state.room.localParticipant.sendFile(file, {
          topic: "zcall-file",
          mimeType: file.type || "application/octet-stream"
        });
      } catch {
        showToast(`Ошибка отправки ${file.name}`);
      }
    }
  }

  /* Запись голосовых сообщений в чат */
  async function startVoiceRecord() {
    if (state.voiceRecorder) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: state.audioDeviceId ? { deviceId: state.audioDeviceId } : true
      });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      state.voiceChunks = [];
      state.voiceRecorder = { rec, stream, mime, send: false };

      rec.ondataavailable = (e) => { if (e.data.size) state.voiceChunks.push(e.data); };
      rec.onstop = () => {
        const info = state.voiceRecorder;
        clearInterval(state.voiceTimerInt);
        info.stream.getTracks().forEach((t) => t.stop());
        $("voiceRecordingBar").classList.add("hidden");
        $("chatTextBar").classList.remove("hidden");

        if (info.send && state.voiceChunks.length) {
          const ext = (info.mime || "").includes("mp4") ? "m4a" : "webm";
          const blob = new Blob(state.voiceChunks, { type: info.mime || "audio/webm" });
          const file = new File([blob], `zcall-voice-${Date.now()}.${ext}`, { type: blob.type });
          sendFiles([file], true);
        }
        state.voiceRecorder = null;
      };

      rec.start();
      state.voiceStartedAt = Date.now();
      $("voiceRecTimer").textContent = "00:00";
      $("chatTextBar").classList.add("hidden");
      $("voiceRecordingBar").classList.remove("hidden");
      state.voiceTimerInt = setInterval(() => {
        $("voiceRecTimer").textContent = formatSec((Date.now() - state.voiceStartedAt) / 1000);
      }, 300);
    } catch {
      showToast("Нет доступа к микрофону для голосового сообщения");
    }
  }

  function finishVoiceRecord(shouldSend) {
    if (!state.voiceRecorder) return;
    state.voiceRecorder.send = shouldSend;
    if (state.voiceRecorder.rec.state !== "inactive") state.voiceRecorder.rec.stop();
  }

  function showRemoteTyping(name) {
    $("typingIndicator").textContent = `${name} печатает...`;
    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => {
      $("typingIndicator").textContent = "Чат комнаты · онлайн";
    }, 2200);
  }

  function openLightbox(url, caption) {
    $("lightboxImg").src = url;
    $("lightboxCaption").textContent = caption;
    $("lightboxDownload").href = url;
    $("lightboxDownload").download = caption;
    $("lightboxModal").classList.remove("hidden");
  }

  /* -------------------- ТАЙМЕР И ВЫХОД -------------------- */
  function startCallTimers() {
    state.callStartedAt = Date.now();
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      $("callTimer").textContent = formatSec((Date.now() - state.callStartedAt) / 1000);
    }, 1000);
    clearInterval(state.statsInterval);
    state.statsInterval = setInterval(updateRoomStats, 3000);
  }

  function updateRoomStats() {
    if (!state.room || $("settingsModal").classList.contains("hidden")) return;
    const lp = state.room.localParticipant;
    const lines = [
      `Комната: ${state.room.name}`,
      `Видео пресет: ${state.quality === "4k" ? "4K" : state.quality + "p"}`,
      `Аудио пресет: ${state.audioPreset}`
    ];
    const camSet = lp.getTrackPublication(LK.Track.Source.Camera)?.track?.mediaStreamTrack?.getSettings?.();
    if (camSet) lines.push(`Камера: ${camSet.width || "?"}x${camSet.height || "?"} @ ${Math.round(camSet.frameRate || 0)} FPS`);
    const scrSet = lp.getTrackPublication(LK.Track.Source.ScreenShare)?.track?.mediaStreamTrack?.getSettings?.();
    if (scrSet) lines.push(`Экран: ${scrSet.width || "?"}x${scrSet.height || "?"} @ ${Math.round(scrSet.frameRate || 0)} FPS`);
    $("statsBox").textContent = lines.join("\n");
  }

  function cleanupRoom() {
    clearInterval(state.timerInterval);
    clearInterval(state.statsInterval);
    stopBotEngine();
    finishVoiceRecord(false);
    for (const item of state.audioEls.values()) item.el.remove();
    state.audioEls.clear();
    state.profiles.clear();
    state.messages = [];
    state.room = null;
    state.screenSharing = false;
    state.handRaised = false;
    state.pinnedIdentity = null;

    $("chatMessages").innerHTML =
      '<div class="chat-system-msg">Текстовый чат, скриншоты (Ctrl+V), файлы и голосовые сообщения работают в реальном времени.</div>';
    $("roomView").classList.add("hidden");
    $("settingsModal").classList.add("hidden");
    $("lobbyView").classList.remove("hidden");
    $("joinBtn").disabled = false;
    $("joinChatOnlyBtn").disabled = false;
    $("joinBotBtn").disabled = false;
    $("lobbyStatus").textContent = "";
    startPreviewMedia();
  }

  async function leaveRoom() {
    if (state.room) await state.room.disconnect();
    else cleanupRoom();
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
    if (!state.room) return;
    if (state.camEnabled) {
      await state.room.localParticipant.setCameraEnabled(false);
      await state.room.localParticipant.setCameraEnabled(true, getVideoCaptureOpts());
    }
    if (state.micEnabled) {
      await state.room.localParticipant.setMicrophoneEnabled(false);
      await state.room.localParticipant.setMicrophoneEnabled(true, getAudioCaptureOpts());
    }
    renderAllTiles();
    showToast("Настройки качества применены");
  }

  /* -------------------- ИНИЦИАЛИЗАЦИЯ -------------------- */
  function init() {
    applyTheme(state.theme);

    const hashRoom = decodeURIComponent((window.location.hash || "").replace(/^#/, "")).trim();
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    state.roomName = hashRoom || queryRoom || randomRoomName();

    $("nickInput").value = state.nick;
    $("roomInput").value = state.roomName;
    $("lobbyQualitySelect").value = state.quality;
    $("lobbyAudioPresetSelect").value = state.audioPreset;

    updatePreviewVisuals();
    startPreviewMedia();

    document.querySelectorAll("[data-set-theme]").forEach((btn) => {
      btn.onclick = () => applyTheme(btn.dataset.setTheme);
    });

    $("nickInput").oninput = (e) => { state.nick = e.target.value; updatePreviewVisuals(); };
    $("genRoomBtn").onclick = () => {
      state.roomName = randomRoomName();
      $("roomInput").value = state.roomName;
      window.location.hash = encodeURIComponent(state.roomName);
    };
    $("copyLobbyLinkBtn").onclick = () => copyInviteLink($("roomInput").value);
    $("refreshDevicesBtn").onclick = () => startPreviewMedia();

    $("previewMicBtn").onclick = () => { state.micEnabled = !state.micEnabled; startPreviewMedia(); };
    $("previewCamBtn").onclick = () => { state.camEnabled = !state.camEnabled; startPreviewMedia(); };

    $("lobbyAudioSelect").onchange = (e) => { state.audioDeviceId = e.target.value; startPreviewMedia(); };
    $("lobbyVideoSelect").onchange = (e) => { state.videoDeviceId = e.target.value; startPreviewMedia(); };
    $("lobbyQualitySelect").onchange = (e) => { state.quality = e.target.value; localStorage.setItem("zcall_quality", state.quality); };
    $("lobbyAudioPresetSelect").onchange = (e) => { state.audioPreset = e.target.value; localStorage.setItem("zcall_audio_preset", state.audioPreset); };

    $("joinBtn").onclick = () => joinRoom({ chatOnly: false, botMode: false });
    $("joinChatOnlyBtn").onclick = () => joinRoom({ chatOnly: true, botMode: false });
    $("joinBotBtn").onclick = () => joinRoom({ chatOnly: false, botMode: true });
    $("roomInput").onkeydown = (e) => { if (e.key === "Enter") joinRoom(); };

    $("copyRoomLinkBtn").onclick = () => copyInviteLink(state.roomName);
    $("unlockAudioBtn").onclick = async () => {
      if (state.room) {
        await state.room.startAudio();
        $("audioUnlockBanner").classList.add("hidden");
      }
    };

    $("toggleBotBtn").onclick = () => {
      if (state.botEnabled) stopBotEngine();
      else startBotEngine(true);
    };

    $("micBtn").onclick = toggleMic;
    $("camBtn").onclick = toggleCam;
    $("screenBtn").onclick = toggleScreenShare;
    $("handBtn").onclick = toggleHand;
    $("leaveBtn").onclick = leaveRoom;
    $("chatToggleBtn").onclick = () => toggleChat();
    $("closeChatBtn").onclick = () => toggleChat(false);
    $("tabChatBtn").onclick = () => switchSidebarTab("chat");
    $("tabParticipantsBtn").onclick = () => switchSidebarTab("participants");

    $("stageFullscreenBtn").onclick = toggleStageFullscreen;
    $("stagePipBtn").onclick = toggleStagePiP;
    $("stageClosePinBtn").onclick = () => { state.pinnedIdentity = null; renderAllTiles(); };

    $("reactBtn").onclick = (e) => { e.stopPropagation(); $("reactionsPicker").classList.toggle("hidden"); };
    $("reactionsPicker").querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        const emoji = btn.dataset.emoji;
        $("reactionsPicker").classList.add("hidden");
        spawnFloatingReaction(emoji, state.nick);
        sendData("zcall-reaction", { emoji, name: state.nick });
      };
    });

    $("emojiToggleBtn").onclick = (e) => { e.stopPropagation(); $("emojiPopover").classList.toggle("hidden"); };
    $("emojiPopover").querySelectorAll("button").forEach((b) => {
      b.onclick = () => {
        $("chatInput").value += b.dataset.ins;
        $("emojiPopover").classList.add("hidden");
        $("chatInput").focus();
      };
    });

    document.addEventListener("click", () => {
      $("reactionsPicker").classList.add("hidden");
      $("emojiPopover").classList.add("hidden");
    });

    $("topSettingsBtn").onclick = () => {
      loadDevices();
      syncRoomSettingsUI();
      $("settingsModal").classList.remove("hidden");
      updateRoomStats();
    };
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
    $("saveSandboxBtn").onclick = () => {
      const val = $("sandboxIdInput").value.trim() || DEFAULT_SANDBOX_ID;
      state.sandboxId = val;
      localStorage.setItem("zcall_sandbox_id", val);
      showToast("Sandbox ID сохранён");
    };

    $("sendChatBtn").onclick = sendChatText;
    $("chatInput").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatText(); } };
    $("chatInput").oninput = (e) => {
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
      const now = Date.now();
      if (now - state.lastTypingSent > 1800) {
        state.lastTypingSent = now;
        sendData("zcall-typing", { name: state.nick }, false);
      }
    };
    $("attachFileBtn").onclick = () => $("chatFileInput").click();
    $("chatFileInput").onchange = (e) => { sendFiles(e.target.files); e.target.value = ""; };

    $("voiceRecBtn").onclick = startVoiceRecord;
    $("voiceCancelBtn").onclick = () => finishVoiceRecord(false);
    $("voiceSendBtn").onclick = () => finishVoiceRecord(true);

    $("chatInput").addEventListener("paste", (e) => {
      const files = [];
      for (const item of e.clipboardData?.items || []) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) { e.preventDefault(); sendFiles(files); }
    });

    const drawer = $("chatDrawer");
    drawer.addEventListener("dragover", (e) => { e.preventDefault(); $("chatDropOverlay").classList.remove("hidden"); });
    drawer.addEventListener("dragleave", () => $("chatDropOverlay").classList.add("hidden"));
    drawer.addEventListener("drop", (e) => {
      e.preventDefault();
      $("chatDropOverlay").classList.add("hidden");
      if (e.dataTransfer?.files?.length) sendFiles(e.dataTransfer.files);
    });

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