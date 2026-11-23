const DEFAULT_SANDBOX_ID = "p_2qxku4v66yr";
  const SANDBOX_ENDPOINT = "https://cloud-api.livekit.io/api/sandbox/connection-details";

  const LK = window.LivekitClient;
  const $ = (id) => document.getElementById(id);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const canScreenShare = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  const state = {
    sandboxId: localStorage.getItem("zcall_sandbox_id") || DEFAULT_SANDBOX_ID,
    theme: localStorage.getItem("zcall_theme") || "discord",
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
    filter: localStorage.getItem("zcall_filter") || "cinematic",
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

    profiles: new Map(), // identity -> { name, filter, handRaised }
    audioEls: new Map(), // key -> { el, identity, source }
    volumes: new Map(),  // identity -> 0..100
    chatOpen: false,
    unreadCount: 0,
    messages: [],        // { id, senderIdentity, senderName, text, imageUrl, fileUrl, fileName, fileSize, replyTo, time, reactions: {emoji: Set} }
    replyTo: null,
    typingTimer: null,
    lastTypingSent: 0
  };

  /* -------------------- УТИЛИТЫ И ЗВУКИ -------------------- */
  function uid(len = 6) {
    return Math.random().toString(36).slice(2, 2 + len);
  }

  function randomRoomName() {
    const words = ["nova", "cyber", "cosmos", "pulse", "vibe", "aurora", "pixel", "turbo"];
    const w = words[Math.floor(Math.random() * words.length)];
    return `zcall-${w}-${uid(4)}`;
  }

  function formatTime(ts = Date.now()) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now); osc.stop(now + 0.23);
      } else if (type === "leave") {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.22);
      } else if (type === "chat") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.start(now); osc.stop(now + 0.14);
      } else if (type === "hand") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now); osc.stop(now + 0.24);
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
      showToast("🔗 Ссылка на комнату скопирована!");
    } catch {
      prompt("Скопируй ссылку для друга:", url);
    }
  }

  /* -------------------- КАЧЕСТВО И КОДЕКИ -------------------- */
  function getVideoCaptureOpts() {
    const dev = state.videoDeviceId ? { deviceId: state.videoDeviceId } : {};
    if (state.quality === "4k") {
      return { ...dev, resolution: { width: 3840, height: 2160, frameRate: 60 } };
    }
    if (state.quality === "720") {
      return { ...dev, resolution: { width: 1280, height: 720, frameRate: 30 } };
    }
    return { ...dev, resolution: { width: 1920, height: 1080, frameRate: 60 } };
  }

  function getAudioCaptureOpts() {
    const dev = state.audioDeviceId ? { deviceId: state.audioDeviceId } : {};
    if (state.cleanMic || state.audioPreset === "stereo") {
      return {
        ...dev,
        autoGainControl: false,
        echoCancellation: true,
        noiseSuppression: false
      };
    }
    return {
      ...dev,
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true
    };
  }

  function getPublishDefaults() {
    const camEncoding =
      state.quality === "4k"
        ? { maxBitrate: 10_000_000, maxFramerate: 60 }
        : state.quality === "720"
        ? { maxBitrate: 1_700_000, maxFramerate: 30 }
        : { maxBitrate: 4_500_000, maxFramerate: 60 };

    const screenEncoding =
      state.quality === "4k"
        ? { maxBitrate: 14_000_000, maxFramerate: 60 }
        : state.quality === "720"
        ? { maxBitrate: 2_500_000, maxFramerate: 30 }
        : { maxBitrate: 8_000_000, maxFramerate: 60 };

    const audioPreset =
      state.audioPreset === "stereo"
        ? LK.AudioPresets.musicHighQualityStereo
        : state.audioPreset === "speech"
        ? LK.AudioPresets.speech
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
    const opts = {
      audio: true,
      contentHint: state.screenMode === "detail" ? "detail" : "motion"
    };
    if (!isSafari) {
      if (state.quality === "4k") {
        opts.resolution = { width: 3840, height: 2160, frameRate: 60 };
      } else if (state.quality === "720") {
        opts.resolution = { width: 1280, height: 720, frameRate: 30 };
      } else {
        opts.resolution = { width: 1920, height: 1080, frameRate: 60 };
      }
    }
    return opts;
  }

  /* -------------------- GREEN ROOM (ПРЕДВХОД) -------------------- */
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
      if (currentVal && list.some((d) => d.deviceId === currentVal)) {
        sel.value = currentVal;
      }
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
    vid.classList.toggle("mirrored", state.mirrorSelf);
    vid.className = vid.className.replace(/\bfilter-\S+/g, "").trim();
    if (state.filter !== "none") vid.classList.add(`filter-${state.filter}`);
    if (state.mirrorSelf) vid.classList.add("mirrored");

    $("previewMirroredBadge").textContent = state.mirrorSelf ? "Зеркало ВКЛ" : "Зеркало ВЫКЛ";
    $("previewPlaceholder").classList.toggle("hidden", state.camEnabled && !!state.previewStream?.getVideoTracks().length);

    $("previewMicBtn").className = `circle-btn ${state.micEnabled ? "active" : "off"}`;
    $("previewCamBtn").className = `circle-btn ${state.camEnabled ? "active" : "off"}`;
    $("previewMirrorBtn").className = `circle-btn ${state.mirrorSelf ? "active" : ""}`;

    const first = (state.nick || "Z").trim()[0] || "Z";
    $("previewAvatar").textContent = first.toUpperCase();
  }

  async function startPreviewMedia() {
    stopPreviewMedia();
    if (!navigator.mediaDevices?.getUserMedia) {
      $("lobbyStatus").textContent = "⚠️ Нужен HTTPS (на GitHub Pages он включится автоматически).";
      updatePreviewVisuals();
      return;
    }
    try {
      const constraints = {
        audio: state.micEnabled ? (state.audioDeviceId ? { deviceId: { ideal: state.audioDeviceId } } : true) : false,
        video: state.camEnabled
          ? {
              ...(state.videoDeviceId ? { deviceId: { ideal: state.videoDeviceId } } : {}),
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          : false
      };
      if (!constraints.audio && !constraints.video) {
        updatePreviewVisuals();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.previewStream = stream;
      if (stream.getVideoTracks().length) {
        $("previewVideo").srcObject = stream;
      }
      if (stream.getAudioTracks().length) {
        startMicMeter(stream);
      }
      await loadDevices();
      $("lobbyStatus").textContent = "";
    } catch (err) {
      console.warn("Preview error:", err);
      if (state.camEnabled) {
        state.camEnabled = false;
        $("lobbyStatus").textContent = "Нет доступа к камере или она занята — можно войти только с микрофоном или как слушатель.";
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
        const avg = sum / data.length;
        const pct = Math.min(100, Math.round((avg / 65) * 100));
        $("micMeterFill").style.width = `${pct}%`;
        state.audioMeterRaf = requestAnimationFrame(tick);
      };
      tick();
    } catch (_) {}
  }

  /* -------------------- ПОДКЛЮЧЕНИЕ К LIVEKIT -------------------- */
  async function fetchSandboxToken(roomName, identity) {
    const res = await fetch(SANDBOX_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Sandbox-ID": state.sandboxId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        room_name: roomName,
        participant_name: identity
      })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Ошибка токена (${res.status}): ${txt || "проверь Sandbox ID"}`);
    }
    const data = await res.json();
    return {
      serverUrl: data.serverUrl || data.server_url,
      token: data.participantToken || data.participant_token,
      roomName: data.roomName || roomName
    };
  }

  async function joinRoom() {
    if (!LK) {
      alert("LiveKit SDK не загрузился. Проверь интернет.");
      return;
    }
    const rawNick = $("nickInput").value.trim() || "Друг";
    const roomName = $("roomInput").value.trim() || randomRoomName();
    state.nick = rawNick;
    state.roomName = roomName;
    localStorage.setItem("zcall_nick", rawNick);
    window.location.hash = encodeURIComponent(roomName);

    const safeSlug = rawNick.replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 14) || "user";
    state.localIdentity = `${safeSlug}__${uid(4)}`;

    $("joinBtn").disabled = true;
    $("lobbyStatus").textContent = "Подключаемся к серверам LiveKit...";

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

      state.profiles.set(state.localIdentity, {
        name: rawNick,
        filter: state.filter,
        handRaised: false
      });

      // Переключаем экран
      $("lobbyView").classList.add("hidden");
      $("roomView").classList.remove("hidden");
      $("roomTitleBadge").textContent = roomName;
      $("sandboxIdInput").value = state.sandboxId;
      syncRoomSettingsUI();

      // Запускаем микрофон и камеру по тумблерам предвхода
      try {
        if (state.micEnabled) await room.localParticipant.setMicrophoneEnabled(true, getAudioCaptureOpts());
      } catch (e) {
        state.micEnabled = false;
        showToast("⚠️ Не удалось включить микрофон");
      }
      try {
        if (state.camEnabled) await room.localParticipant.setCameraEnabled(true, getVideoCaptureOpts());
      } catch (e) {
        state.camEnabled = false;
        showToast("⚠️ Не удалось включить камеру");
      }

      if (!canScreenShare) {
        $("screenBtn").title = "Браузер на этом устройстве не разрешает отдавать экран (но ты видишь экраны друзей!)";
      }

      renderAllTiles();
      updateDockButtons();
      startCallTimers();
      broadcastProfile();
      playSfx("join");
      showToast(`🚀 Вы вошли в ${roomName}`);
    } catch (err) {
      console.error(err);
      $("lobbyStatus").textContent = `❌ ${err.message}`;
      $("joinBtn").disabled = false;
      startPreviewMedia();
    }
  }

  function setupRoomEvents(room) {
    const RE = LK.RoomEvent;

    // Приём файлов через Byte Streams (картинки / документы в WhatsApp-чате)
    room.registerByteStreamHandler("zcall-file", async (reader, participantInfo) => {
      try {
        const info = reader.info || {};
        const result = await reader.readAll();
        const chunks = Array.isArray(result) ? result : [result];
        const mime = info.mimeType || "application/octet-stream";
        const blob = new Blob(chunks, { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const sender = getParticipantByIdentity(participantInfo?.identity);
        const isImage = mime.startsWith("image/");

        appendChatMessage({
          id: info.id || uid(8),
          senderIdentity: participantInfo?.identity || "remote",
          senderName: displayNameOf(sender) || (participantInfo?.identity || "").split("__")[0] || "Друг",
          text: "",
          imageUrl: isImage ? blobUrl : null,
          fileUrl: !isImage ? blobUrl : null,
          fileName: info.name || "file",
          fileSize: info.size || blob.size,
          time: Date.now()
        });
      } catch (err) {
        console.error("ByteStream read error:", err);
      }
    });

    room
      .on(RE.ParticipantConnected, (participant) => {
        playSfx("join");
        showToast(`👋 ${displayNameOf(participant)} присоединился`);
        // Повторно отправим свой профиль и фильтр новому участнику
        setTimeout(() => broadcastProfile(), 400);
        renderAllTiles();
      })
      .on(RE.ParticipantDisconnected, (participant) => {
        playSfx("leave");
        showToast(`🚪 ${displayNameOf(participant)} вышел`);
        cleanupParticipantAudio(participant.identity);
        if (state.pinnedIdentity === participant.identity) state.pinnedIdentity = null;
        renderAllTiles();
      })
      .on(RE.TrackSubscribed, (track, pub, participant) => {
        if (track.kind === LK.Track.Kind.Audio) {
          attachRemoteAudio(track, pub, participant);
        }
        renderAllTiles();
      })
      .on(RE.TrackUnsubscribed, (track, pub, participant) => {
        track.detach().forEach((el) => el.remove());
        if (track.kind === LK.Track.Kind.Audio) {
          removeAudioEl(`${participant.identity}_${pub.source}`);
        }
        renderAllTiles();
      })
      .on(RE.LocalTrackPublished, () => renderAllTiles())
      .on(RE.LocalTrackUnpublished, () => renderAllTiles())
      .on(RE.TrackMuted, () => renderAllTiles())
      .on(RE.TrackUnmuted, () => renderAllTiles())
      .on(RE.ActiveSpeakersChanged, (speakers) => {
        const ids = new Set(speakers.map((s) => s.identity));
        document.querySelectorAll(".participant-tile").forEach((tile) => {
          tile.classList.toggle("speaking", ids.has(tile.dataset.identity));
        });
      })
      .on(RE.ConnectionQualityChanged, (quality, participant) => {
        if (participant.identity === state.localIdentity) {
          const map = {
            [LK.ConnectionQuality.Excellent]: "🟢 Топ связь",
            [LK.ConnectionQuality.Good]: "🟢 Стабильно",
            [LK.ConnectionQuality.Poor]: "🟡 Слабая сеть",
            [LK.ConnectionQuality.Lost]: "🔴 Обрыв"
          };
          $("localNetQuality").textContent = map[quality] || "🟢 Онлайн";
        }
        const badge = document.querySelector(`.participant-tile[data-identity="${CSS.escape(participant.identity)}"] .tile-net`);
        if (badge) {
          badge.textContent = quality === LK.ConnectionQuality.Poor ? "🟡" : quality === LK.ConnectionQuality.Lost ? "🔴" : "🟢";
        }
      })
      .on(RE.AudioPlaybackStatusChanged, () => {
        $("audioUnlockBanner").classList.toggle("hidden", room.canPlaybackAudio);
      })
      .on(RE.Reconnecting, () => $("reconnectBanner").classList.remove("hidden"))
      .on(RE.Reconnected, () => {
        $("reconnectBanner").classList.add("hidden");
        showToast("✅ Связь восстановлена");
      })
      .on(RE.Disconnected, () => {
        cleanupRoom();
      })
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

  /* -------------------- ДАННЫЕ (ЧАТ, ПРОФИЛЬ, РЕАКЦИИ, РУКА) -------------------- */
  async function sendData(topic, obj, reliable = true) {
    if (!state.room) return;
    try {
      await state.room.localParticipant.publishData(encoder.encode(JSON.stringify(obj)), {
        reliable,
        topic
      });
    } catch (e) {
      console.warn("publishData err:", e);
    }
  }

  function broadcastProfile() {
    sendData("zcall-profile", {
      name: state.nick,
      filter: state.filter,
      handRaised: state.handRaised
    });
  }

  function handleIncomingData(topic, data, participant) {
    const id = participant?.identity;
    if (topic === "zcall-profile" && id) {
      state.profiles.set(id, {
        name: data.name || displayNameOf(participant),
        filter: data.filter || "none",
        handRaised: !!data.handRaised
      });
      if (data.handRaised) {
        playSfx("hand");
        showToast(`✋ ${data.name || "Участник"} поднял(а) руку`);
      }
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

  /* -------------------- АУДИО ПОТОКИ И ГРОМКОСТЬ -------------------- */
  function attachRemoteAudio(track, pub, participant) {
    const key = `${participant.identity}_${pub.source}`;
    removeAudioEl(key);
    const el = track.attach();
    el.autoplay = true;
    el.playsInline = true;
    el.style.display = "none";
    const vol = state.volumes.get(participant.identity) ?? 100;
    el.volume = Math.max(0, Math.min(1, vol / 100));
    document.body.appendChild(el);
    state.audioEls.set(key, { el, identity: participant.identity, source: pub.source });
    el.play().catch(() => {
      if (state.room && !state.room.canPlaybackAudio) {
        $("audioUnlockBanner").classList.remove("hidden");
      }
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
      if (item.identity === identity) {
        item.el.volume = Math.max(0, Math.min(1, volPercent / 100));
      }
    }
  }

  /* -------------------- РЕНДЕР СЕТКИ И СЦЕНЫ (ZOOM + DISCORD) -------------------- */
  function renderAllTiles() {
    if (!state.room) return;
    const allParticipants = [state.room.localParticipant, ...Array.from(state.room.remoteParticipants.values())];
    $("participantCountBadge").textContent = `👥 ${allParticipants.length}`;

    // Определяем, есть ли активная демонстрация экрана или закрепленный участник
    let stageTrack = null;
    let stageOwner = null;
    let isScreenOnStage = false;

    for (const p of allParticipants) {
      const screenPub = p.getTrackPublication(LK.Track.Source.ScreenShare);
      if (screenPub && screenPub.track && !screenPub.isMuted) {
        stageTrack = screenPub.track;
        stageOwner = p;
        isScreenOnStage = true;
        break;
      }
    }

    if (!stageTrack && state.pinnedIdentity) {
      const pinnedP = getParticipantByIdentity(state.pinnedIdentity);
      if (pinnedP) {
        const camPub = pinnedP.getTrackPublication(LK.Track.Source.Camera);
        if (camPub?.track && !camPub.isMuted) {
          stageTrack = camPub.track;
          stageOwner = pinnedP;
        }
      }
    }

    const stageAndGrid = document.querySelector(".stage-and-grid");
    const stageWrapper = $("stageWrapper");
    const stageArea = $("stageVideoArea");

    if (stageTrack && stageOwner) {
      stageAndGrid.classList.add("has-stage");
      stageWrapper.classList.remove("hidden");
      $("stageTitle").textContent = isScreenOnStage ? "Демонстрация экрана" : "Закреплено";
      $("stagePresenterName").textContent = `• ${displayNameOf(stageOwner)}`;
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

    // Рендерим карточки участников
    const grid = $("videoGrid");
    grid.innerHTML = "";

    allParticipants.forEach((p) => {
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
        videoEl.muted = true; // Локальный звук или отдельный <audio>
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

      // Верхние бейджи (рука и качество сети)
      const topBadges = document.createElement("div");
      topBadges.className = "tile-top-badges";

      const leftGroup = document.createElement("div");
      if (hand) {
        const hb = document.createElement("span");
        hb.className = "tile-pill hand-badge";
        hb.textContent = "✋ Рука";
        leftGroup.appendChild(hb);
      }
      topBadges.appendChild(leftGroup);

      const netBadge = document.createElement("span");
      netBadge.className = "tile-pill tile-net";
      netBadge.textContent = "🟢";
      topBadges.appendChild(netBadge);
      tile.appendChild(topBadges);

      // Нижняя панель карточки (имя, мут, ползунок громкости, закрепить)
      const bar = document.createElement("div");
      bar.className = "tile-bottom-bar";

      const nameWrap = document.createElement("div");
      nameWrap.className = "tile-name-wrap";
      const muteIcon = document.createElement("span");
      muteIcon.textContent = isMicMuted ? "🔇" : "🎙";
      const nameSpan = document.createElement("span");
      nameSpan.className = "tile-name";
      nameSpan.textContent = isLocal ? `${name} (Вы)` : name;
      nameWrap.append(muteIcon, nameSpan);

      const actions = document.createElement("div");
      actions.className = "tile-actions";

      if (!isLocal) {
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "100";
        slider.value = String(state.volumes.get(p.identity) ?? 100);
        slider.className = "tile-vol-slider";
        slider.title = "Громкость участника";
        slider.oninput = (e) => setParticipantVolume(p.identity, Number(e.target.value));
        actions.appendChild(slider);
      }

      if (hasVideo) {
        const pinBtn = document.createElement("button");
        pinBtn.className = "tile-mini-btn";
        pinBtn.title = state.pinnedIdentity === p.identity ? "Открепить" : "Закрепить крупно";
        pinBtn.textContent = state.pinnedIdentity === p.identity ? "📍" : "📌";
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
  }

  function toggleStageFullscreen() {
    const el = $("stageWrapper");
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  async function toggleStagePiP() {
    const vid = $("stageVideoArea").querySelector("video");
    if (!vid || !document.pictureInPictureEnabled) {
      showToast("PiP не поддерживается для этого видео в твоём браузере");
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await vid.requestPictureInPicture();
      }
    } catch (_) {}
  }

  /* -------------------- УПРАВЛЕНИЕ МЕДИА В ЗВОНКЕ -------------------- */
  function updateDockButtons() {
    $("micBtn").className = `dock-btn ${state.micEnabled ? "active" : "off"}`;
    $("micBtn").querySelector(".dock-icon").textContent = state.micEnabled ? "🎤" : "🔇";

    $("camBtn").className = `dock-btn ${state.camEnabled ? "active" : "off"}`;
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
      showToast("❌ Нет доступа к микрофону");
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
      showToast("❌ Нет доступа к камере");
    }
  }

  async function toggleScreenShare() {
    if (!state.room) return;
    if (!canScreenShare) {
      showToast("📱 На этой версии мобильного браузера нельзя отдавать свой экран, но чужой экран будет виден в 1080p!");
      return;
    }
    const next = !state.screenSharing;
    try {
      const pubDefaults = getPublishDefaults();
      await state.room.localParticipant.setScreenShareEnabled(
        next,
        getScreenCaptureOpts(),
        next
          ? {
              screenShareEncoding: pubDefaults.screenShareEncoding,
              degradationPreference: state.screenMode === "detail" ? "maintain-resolution" : "maintain-framerate",
              simulcast: true
            }
          : undefined
      );
      state.screenSharing = next;
      updateDockButtons();
      renderAllTiles();
      if (next) showToast(`🖥 Демонстрация запущена (${state.quality === "4k" ? "4K" : state.quality + "p"} HQ)`);
    } catch (e) {
      state.screenSharing = false;
      updateDockButtons();
      if (e?.name !== "NotAllowedError") {
        showToast("⚠️ Не удалось запустить демонстрацию экрана");
      }
    }
  }

  function toggleHand() {
    state.handRaised = !state.handRaised;
    updateDockButtons();
    broadcastProfile();
    renderAllTiles();
    if (state.handRaised) playSfx("hand");
  }

  function spawnFloatingReaction(emoji, senderName) {
    const item = document.createElement("div");
    item.className = "floating-reaction";
    item.style.left = `${15 + Math.random() * 70}%`;

    const em = document.createElement("span");
    em.className = "emoji";
    em.textContent = emoji;
    const sn = document.createElement("span");
    sn.className = "sender";
    sn.textContent = senderName;

    item.append(em, sn);
    $("reactionsOverlay").appendChild(item);
    setTimeout(() => item.remove(), 2700);
  }

  /* -------------------- ЧАТ (WHATSAPP СТИЛЬ) -------------------- */
  function toggleChat(forceState) {
    state.chatOpen = typeof forceState === "boolean" ? forceState : !state.chatOpen;
    $("chatDrawer").classList.toggle("hidden", !state.chatOpen);
    if (state.chatOpen) {
      state.unreadCount = 0;
      $("chatBadge").classList.add("hidden");
      scrollChatBottom();
      $("chatInput").focus();
    }
    updateDockButtons();
  }

  function scrollChatBottom() {
    const box = $("chatMessages");
    box.scrollTop = box.scrollHeight;
  }

  function appendChatMessage(msg) {
    const record = {
      ...msg,
      reactions: msg.reactions || {}
    };
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
      author.textContent = msg.senderName || "Друг";
      bubble.appendChild(author);
    }

    if (msg.replyTo) {
      const q = document.createElement("div");
      q.className = "msg-quote";
      const qAuthor = document.createElement("strong");
      qAuthor.textContent = msg.replyTo.senderName;
      const qText = document.createElement("span");
      qText.textContent = msg.replyTo.preview;
      q.append(qAuthor, qText);
      bubble.appendChild(q);
    }

    if (msg.imageUrl) {
      const img = document.createElement("img");
      img.className = "msg-image";
      img.src = msg.imageUrl;
      img.alt = msg.fileName || "Фото";
      img.onclick = () => openLightbox(msg.imageUrl, msg.fileName || "Изображение");
      bubble.appendChild(img);
    }

    if (msg.fileUrl) {
      const fc = document.createElement("div");
      fc.className = "msg-file-card";
      const meta = document.createElement("div");
      meta.className = "msg-file-meta";
      const fn = document.createElement("span");
      fn.className = "msg-file-name";
      fn.textContent = `📄 ${msg.fileName || "Файл"}`;
      const fs = document.createElement("span");
      fs.className = "msg-file-size";
      fs.textContent = formatBytes(msg.fileSize);
      meta.append(fn, fs);

      const dl = document.createElement("a");
      dl.className = "ghost-btn small";
      dl.href = msg.fileUrl;
      dl.download = msg.fileName || "file";
      dl.textContent = "⬇";
      fc.append(meta, dl);
      bubble.appendChild(fc);
    }

    if (msg.text) {
      const txt = document.createElement("div");
      txt.className = "msg-text";
      txt.textContent = msg.text;
      bubble.appendChild(txt);
    }

    const footer = document.createElement("div");
    footer.className = "msg-footer";
    const reactBox = document.createElement("div");
    reactBox.className = "msg-reactions";
    const timeEl = document.createElement("span");
    timeEl.className = "msg-time";
    timeEl.textContent = formatTime(msg.time);
    footer.append(reactBox, timeEl);
    bubble.appendChild(footer);

    // Кнопки ответа и реакций
    const hoverBar = document.createElement("div");
    hoverBar.className = "msg-hover-actions";

    const replyBtn = document.createElement("button");
    replyBtn.textContent = "↩ Ответить";
    replyBtn.onclick = () => startReply(msg);

    const reactFast1 = document.createElement("button");
    reactFast1.textContent = "❤️";
    reactFast1.onclick = () => toggleChatReaction(msg.id, "❤️");

    const reactFast2 = document.createElement("button");
    reactFast2.textContent = "👍";
    reactFast2.onclick = () => toggleChatReaction(msg.id, "👍");

    const reactFast3 = document.createElement("button");
    reactFast3.textContent = "😂";
    reactFast3.onclick = () => toggleChatReaction(msg.id, "😂");

    hoverBar.append(replyBtn, reactFast1, reactFast2, reactFast3);

    row.append(bubble, hoverBar);
    $("chatMessages").appendChild(row);
  }

  function startReply(msg) {
    state.replyTo = {
      id: msg.id,
      senderName: msg.senderName,
      preview: msg.text || (msg.imageUrl ? "📷 Фото" : `📄 ${msg.fileName || "Файл"}`)
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
  }

  async function sendFiles(fileList) {
    if (!state.room || !fileList?.length) return;
    for (const file of fileList) {
      if (file.size > 25 * 1024 * 1024) {
        showToast(`⚠️ Файл ${file.name} больше 25 МБ — лучше скинуть ссылку`);
        continue;
      }
      const localUrl = URL.createObjectURL(file);
      const isImg = (file.type || "").startsWith("image/");
      const id = uid(9);
      appendChatMessage({
        id,
        senderIdentity: state.localIdentity,
        senderName: state.nick,
        text: "",
        imageUrl: isImg ? localUrl : null,
        fileUrl: !isImg ? localUrl : null,
        fileName: file.name || "image.png",
        fileSize: file.size,
        time: Date.now()
      });

      try {
        await state.room.localParticipant.sendFile(file, {
          topic: "zcall-file",
          mimeType: file.type || "application/octet-stream"
        });
      } catch (err) {
        console.error(err);
        showToast(`❌ Ошибка отправки ${file.name}`);
      }
    }
  }

  function showRemoteTyping(name) {
    $("typingIndicator").textContent = `${name} печатает...`;
    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => {
      $("typingIndicator").textContent = "онлайн";
    }, 2200);
  }

  function openLightbox(url, caption) {
    $("lightboxImg").src = url;
    $("lightboxCaption").textContent = caption;
    $("lightboxDownload").href = url;
    $("lightboxDownload").download = caption;
    $("lightboxModal").classList.remove("hidden");
  }

  /* -------------------- ТАЙМЕР, СТАТИСТИКА, ВЫХОД -------------------- */
  function startCallTimers() {
    state.callStartedAt = Date.now();
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - state.callStartedAt) / 1000);
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      $("callTimer").textContent = `${m}:${s}`;
    }, 1000);

    clearInterval(state.statsInterval);
    state.statsInterval = setInterval(updateRoomStats, 3000);
  }

  async function updateRoomStats() {
    if (!state.room || $("settingsModal").classList.contains("hidden")) return;
    try {
      const lp = state.room.localParticipant;
      const lines = [
        `Комната: ${state.room.name}`,
        `Участников: ${1 + state.room.remoteParticipants.size}`,
        `Качество пресет: ${state.quality === "4k" ? "4K Max" : state.quality + "p HQ"}`,
        `Звук пресет: ${state.audioPreset}`
      ];
      const camPub = lp.getTrackPublication(LK.Track.Source.Camera);
      if (camPub?.track) {
        const s = camPub.track.mediaStreamTrack?.getSettings?.();
        if (s) lines.push(`Камера отдает: ${s.width || "?"}x${s.height || "?"} @ ${Math.round(s.frameRate || 0)} FPS`);
      }
      const scrPub = lp.getTrackPublication(LK.Track.Source.ScreenShare);
      if (scrPub?.track) {
        const s = scrPub.track.mediaStreamTrack?.getSettings?.();
        if (s) lines.push(`Демка отдает: ${s.width || "?"}x${s.height || "?"} @ ${Math.round(s.frameRate || 0)} FPS`);
      }
      $("statsBox").textContent = lines.join("\n");
    } catch (_) {}
  }

  function cleanupRoom() {
    clearInterval(state.timerInterval);
    clearInterval(state.statsInterval);
    for (const item of state.audioEls.values()) item.el.remove();
    state.audioEls.clear();
    state.profiles.clear();
    state.messages = [];
    state.room = null;
    state.screenSharing = false;
    state.handRaised = false;
    state.pinnedIdentity = null;

    $("chatMessages").innerHTML =
      '<div class="chat-system-msg">🔒 Сообщения и файлы передаются напрямую участникам этой комнаты (Ctrl+V вставляет скриншот).</div>';
    $("roomView").classList.add("hidden");
    $("settingsModal").classList.add("hidden");
    $("lobbyView").classList.remove("hidden");
    $("joinBtn").disabled = false;
    $("lobbyStatus").textContent = "";
    startPreviewMedia();
  }

  async function leaveRoom() {
    if (state.room) {
      await state.room.disconnect();
    } else {
      cleanupRoom();
    }
  }

  /* -------------------- НАСТРОЙКИ НА ЛЕТУ -------------------- */
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
    showToast("✅ Настройки качества применены");
  }

  /* -------------------- ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ -------------------- */
  function init() {
    applyTheme(state.theme);

    // Считываем комнату из URL (#room или ?room=)
    const hashRoom = decodeURIComponent((window.location.hash || "").replace(/^#/, "")).trim();
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    state.roomName = hashRoom || queryRoom || randomRoomName();

    $("nickInput").value = state.nick;
    $("roomInput").value = state.roomName;
    $("lobbyQualitySelect").value = state.quality;
    $("lobbyAudioPresetSelect").value = state.audioPreset;
    $("lobbyFilterSelect").value = state.filter;

    updatePreviewVisuals();
    startPreviewMedia();

    // Темы в лобби
    document.querySelectorAll("[data-set-theme]").forEach((btn) => {
      btn.onclick = () => applyTheme(btn.dataset.setTheme);
    });

    // Предвход: кнопки управления
    $("nickInput").oninput = (e) => {
      state.nick = e.target.value;
      updatePreviewVisuals();
    };
    $("genRoomBtn").onclick = () => {
      state.roomName = randomRoomName();
      $("roomInput").value = state.roomName;
      window.location.hash = encodeURIComponent(state.roomName);
    };
    $("copyLobbyLinkBtn").onclick = () => copyInviteLink($("roomInput").value);
    $("refreshDevicesBtn").onclick = () => startPreviewMedia();

    $("previewMicBtn").onclick = () => {
      state.micEnabled = !state.micEnabled;
      startPreviewMedia();
    };
    $("previewCamBtn").onclick = () => {
      state.camEnabled = !state.camEnabled;
      startPreviewMedia();
    };
    $("previewMirrorBtn").onclick = () => {
      state.mirrorSelf = !state.mirrorSelf;
      localStorage.setItem("zcall_mirror", String(state.mirrorSelf));
      updatePreviewVisuals();
    };

    $("lobbyAudioSelect").onchange = (e) => {
      state.audioDeviceId = e.target.value;
      startPreviewMedia();
    };
    $("lobbyVideoSelect").onchange = (e) => {
      state.videoDeviceId = e.target.value;
      startPreviewMedia();
    };
    $("lobbyQualitySelect").onchange = (e) => {
      state.quality = e.target.value;
      localStorage.setItem("zcall_quality", state.quality);
    };
    $("lobbyAudioPresetSelect").onchange = (e) => {
      state.audioPreset = e.target.value;
      localStorage.setItem("zcall_audio_preset", state.audioPreset);
    };
    $("lobbyFilterSelect").onchange = (e) => {
      state.filter = e.target.value;
      localStorage.setItem("zcall_filter", state.filter);
      updatePreviewVisuals();
    };

    $("joinBtn").onclick = joinRoom;
    $("roomInput").onkeydown = (e) => { if (e.key === "Enter") joinRoom(); };

    // Кнопки комнаты
    $("copyRoomLinkBtn").onclick = () => copyInviteLink(state.roomName);
    $("unlockAudioBtn").onclick = async () => {
      if (state.room) {
        await state.room.startAudio();
        $("audioUnlockBanner").classList.add("hidden");
      }
    };

    $("micBtn").onclick = toggleMic;
    $("camBtn").onclick = toggleCam;
    $("screenBtn").onclick = toggleScreenShare;
    $("handBtn").onclick = toggleHand;
    $("leaveBtn").onclick = leaveRoom;
    $("chatToggleBtn").onclick = () => toggleChat();
    $("closeChatBtn").onclick = () => toggleChat(false);

    $("stageFullscreenBtn").onclick = toggleStageFullscreen;
    $("stagePipBtn").onclick = toggleStagePiP;
    $("stageClosePinBtn").onclick = () => { state.pinnedIdentity = null; renderAllTiles(); };

    // Пикер реакций
    $("reactBtn").onclick = (e) => {
      e.stopPropagation();
      $("reactionsPicker").classList.toggle("hidden");
    };
    $("reactionsPicker").querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        const emoji = btn.dataset.emoji;
        $("reactionsPicker").classList.add("hidden");
        spawnFloatingReaction(emoji, state.nick);
        sendData("zcall-reaction", { emoji, name: state.nick });
      };
    });
    document.addEventListener("click", () => $("reactionsPicker").classList.add("hidden"));

    // Настройки в комнате
    const openSettings = () => {
      loadDevices();
      syncRoomSettingsUI();
      $("settingsModal").classList.remove("hidden");
      updateRoomStats();
    };
    $("topSettingsBtn").onclick = openSettings;
    $("settingsBtn").onclick = openSettings;
    $("closeSettingsBtn").onclick = () => $("settingsModal").classList.add("hidden");
    $("settingsModal").onclick = (e) => {
      if (e.target === $("settingsModal")) $("settingsModal").classList.add("hidden");
    };

    $("roomAudioSelect").onchange = async (e) => {
      state.audioDeviceId = e.target.value;
      await state.room?.switchActiveDevice("audioinput", state.audioDeviceId);
    };
    $("roomVideoSelect").onchange = async (e) => {
      state.videoDeviceId = e.target.value;
      await state.room?.switchActiveDevice("videoinput", state.videoDeviceId);
    };
    $("roomQualitySelect").onchange = (e) => {
      state.quality = e.target.value;
      localStorage.setItem("zcall_quality", state.quality);
      applyQualityMidCall();
    };
    $("roomAudioPresetSelect").onchange = (e) => {
      state.audioPreset = e.target.value;
      localStorage.setItem("zcall_audio_preset", state.audioPreset);
      applyQualityMidCall();
    };
    $("roomScreenModeSelect").onchange = (e) => {
      state.screenMode = e.target.value;
      localStorage.setItem("zcall_screen_mode", state.screenMode);
    };
    $("roomFilterSelect").onchange = (e) => {
      state.filter = e.target.value;
      localStorage.setItem("zcall_filter", state.filter);
      broadcastProfile();
      renderAllTiles();
    };
    $("roomThemeSelect").onchange = (e) => applyTheme(e.target.value);
    $("cleanMicToggle").onchange = (e) => {
      state.cleanMic = e.target.checked;
      localStorage.setItem("zcall_clean_mic", String(state.cleanMic));
      applyQualityMidCall();
    };
    $("mirrorSelfToggle").onchange = (e) => {
      state.mirrorSelf = e.target.checked;
      localStorage.setItem("zcall_mirror", String(state.mirrorSelf));
      renderAllTiles();
    };
    $("uiSoundsToggle").onchange = (e) => {
      state.uiSounds = e.target.checked;
      localStorage.setItem("zcall_sounds", String(state.uiSounds));
    };
    $("saveSandboxBtn").onclick = () => {
      const val = $("sandboxIdInput").value.trim() || DEFAULT_SANDBOX_ID;
      state.sandboxId = val;
      localStorage.setItem("zcall_sandbox_id", val);
      showToast("💾 Sandbox ID сохранён (сработает при следующем входе)");
    };

    // Чат: ввод, Enter, Ctrl+V, файлы, Drag & Drop
    $("sendChatBtn").onclick = sendChatText;
    $("chatInput").onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatText();
      }
    };
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
    $("chatFileInput").onchange = (e) => {
      sendFiles(e.target.files);
      e.target.value = "";
    };

    $("chatInput").addEventListener("paste", (e) => {
      const files = [];
      for (const item of e.clipboardData?.items || []) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        sendFiles(files);
      }
    });

    const drawer = $("chatDrawer");
    drawer.addEventListener("dragover", (e) => {
      e.preventDefault();
      $("chatDropOverlay").classList.remove("hidden");
    });
    drawer.addEventListener("dragleave", () => $("chatDropOverlay").classList.add("hidden"));
    drawer.addEventListener("drop", (e) => {
      e.preventDefault();
      $("chatDropOverlay").classList.add("hidden");
      if (e.dataTransfer?.files?.length) sendFiles(e.dataTransfer.files);
    });

    $("cancelReplyBtn").onclick = cancelReply;

    // Просмотр картинок
    $("closeLightboxBtn").onclick = () => $("lightboxModal").classList.add("hidden");
    $("lightboxModal").onclick = (e) => {
      if (e.target === $("lightboxModal")) $("lightboxModal").classList.add("hidden");
    };

    // Горячие клавиши на ПК
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