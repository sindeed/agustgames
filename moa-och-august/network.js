const PROTOCOL_VERSION = 2;
const APP_ENVELOPE_VERSION = 1;
const ROOM_PREFIX = "moaaugust-v2-";
const ROOM_ID_PATTERN = /^moaaugust-v2-([a-f0-9]{32})$/i;
const SECRET_PATTERN = /^moaaugust-v2-([a-f0-9]{32})\.([A-Za-z0-9_-]{43})$/;
const TYPE_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
const SESSION_PATTERN = /^[a-f0-9]{32}$/;
const MESSAGE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const MQTT_URLS = [
  "wss://broker.hivemq.com:8884/mqtt",
  "wss://broker.emqx.io:8084/mqtt"
];
const MQTT_SCRIPT_URLS = [
  new URL("./vendor/mqtt.min.js", import.meta.url).href,
  "https://cdn.jsdelivr.net/npm/mqtt@5.15.2/dist/mqtt.min.js",
  "https://unpkg.com/mqtt@5.15.2/dist/mqtt.min.js"
];
const HEARTBEAT_MS = 5_000;
const PEER_TIMEOUT_MS = 20_000;
const JOIN_RETRY_MS = 3_000;
const MAX_WIRE_BYTES = 1_100_000;
const MAX_PLAINTEXT_BYTES = 800_000;
const MAX_PENDING_PUBLISHES = 12;
const FAST_TYPES = new Set(["pose", "world", "ping", "pong"]);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let mqttLibraryPromise = null;

function runtimeWindow() {
  return typeof window === "undefined" ? globalThis : window;
}

function randomBytes(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value || "")) throw new Error("Ogiltig nyckel.");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function defaultHref() {
  return globalThis.location?.href || "https://example.invalid/ikea-333/";
}

function parseRoomParts(value, baseHref = defaultHref()) {
  const source = String(value || "").trim();
  if (!source) return null;
  const direct = source.match(SECRET_PATTERN);
  if (direct) return { channelId: direct[1].toLowerCase(), keyText: direct[2] };
  let params;
  try {
    const url = new URL(source, baseHref);
    params = new URLSearchParams(url.hash.replace(/^#/, ""));
  } catch {
    params = new URLSearchParams(source.replace(/^#/, ""));
  }
  let roomId = String(params.get("online") || params.get("join") || "").trim();
  let keyText = String(params.get("key") || params.get("k") || "").trim();
  const packed = roomId.match(SECRET_PATTERN);
  if (packed) {
    roomId = `${ROOM_PREFIX}${packed[1]}`;
    keyText ||= packed[2];
  }
  const room = roomId.match(ROOM_ID_PATTERN);
  if (!room || !/^[A-Za-z0-9_-]{43}$/.test(keyText)) return null;
  try {
    if (base64UrlToBytes(keyText).length !== 32) return null;
  } catch {
    return null;
  }
  return { channelId: room[1].toLowerCase(), keyText };
}

export function parseOnlineRoom(value, baseHref = defaultHref()) {
  const parts = parseRoomParts(value, baseHref);
  return parts ? `${ROOM_PREFIX}${parts.channelId}.${parts.keyText}` : "";
}

function makeInviteUrl(channelId, keyText, baseHref = defaultHref()) {
  const url = new URL(baseHref);
  url.search = "";
  url.hash = new URLSearchParams({ online: `${ROOM_PREFIX}${channelId}`, key: keyText }).toString();
  return url.href;
}

export function shortOnlineRoomCode(roomId) {
  const value = String(roomId || "");
  const match = value.match(ROOM_ID_PATTERN) || value.match(SECRET_PATTERN);
  return match ? match[1].slice(-6).toUpperCase() : "";
}

async function loadMqttLibrary() {
  const scope = runtimeWindow();
  if (scope.__MOAAUGUST_MQTT__?.connect) return scope.__MOAAUGUST_MQTT__;
  if (scope.mqtt?.connect) return scope.mqtt;
  if (mqttLibraryPromise) return mqttLibraryPromise;
  mqttLibraryPromise = (async () => {
    let lastError = new Error("Onlinemotorn kunde inte laddas.");
    for (const source of MQTT_SCRIPT_URLS) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          const timer = setTimeout(() => {
            script.remove();
            reject(new Error("Onlinemotorn tog för lång tid att ladda."));
          }, 12_000);
          script.src = source;
          script.crossOrigin = "anonymous";
          script.dataset.moaaugustMqtt = "loading";
          script.addEventListener("load", () => {
            clearTimeout(timer);
            script.dataset.moaaugustMqtt = "loaded";
            resolve();
          }, { once: true });
          script.addEventListener("error", () => {
            clearTimeout(timer);
            script.remove();
            reject(new Error("En onlineserver kunde inte laddas."));
          }, { once: true });
          document.head.append(script);
        });
        if (scope.mqtt?.connect) return scope.mqtt;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  })().catch((error) => {
    mqttLibraryPromise = null;
    throw error;
  });
  return mqttLibraryPromise;
}

function topicsFor(channelId, role, localSession) {
  const base = `moaaugust/v2/${channelId}`;
  return {
    controlHost: `${base}/control/host`,
    controlGuest: `${base}/control/guest/${localSession}`,
    gameHost: `${base}/game/host`,
    gameGuest: `${base}/game/guest`,
    inbound: role === "host"
      ? [`${base}/control/host`, `${base}/game/guest`]
      : [`${base}/control/guest/${localSession}`, `${base}/game/host`]
  };
}

function friendlyError(error) {
  const message = String(error?.message || error || "").slice(0, 140);
  if (/not authorized|unauthorized/i.test(message)) return "Onlineservern nekade anslutningen. Försök igen.";
  if (/websocket|network|offline|closed|timeout/i.test(message)) return "Onlineservern kunde inte nås. Kontrollera internet och försök igen.";
  return message ? `Onlinefel: ${message}` : "Onlinespelet kunde inte starta.";
}

function payloadLimit(type) {
  if (type === "world" || type === "welcome") return 720_000;
  if (type === "pose") return 16_000;
  if (type === "ping" || type === "pong") return 4_000;
  if (["hello", "transition", "transition-request", "start-request", "reset-request"].includes(type)) return 16_000;
  if (type === "furniture") return 48_000;
  return 80_000;
}

function byteLength(value) {
  try { return encoder.encode(JSON.stringify(value)).byteLength; } catch { return Infinity; }
}

async function importRootKey(bytes) {
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function deriveSessionKey(rootBytes, channelId, hostSession, guestSession, hostNonce, guestNonce) {
  const material = await crypto.subtle.importKey("raw", rootBytes, "HKDF", false, ["deriveKey"]);
  const salt = new Uint8Array(hostNonce.length + guestNonce.length);
  salt.set(hostNonce, 0);
  salt.set(guestNonce, hostNonce.length);
  const info = encoder.encode(`moaaugust/v2/session/${channelId}/${hostSession}/${guestSession}`);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPacket(key, topic, channelId, inner) {
  const plaintext = encoder.encode(JSON.stringify(inner));
  if (plaintext.byteLength > MAX_PLAINTEXT_BYTES) throw new Error("Onlinemeddelandet är för stort.");
  const iv = randomBytes(12);
  const id = bytesToBase64Url(randomBytes(16));
  const additionalData = encoder.encode(`${PROTOCOL_VERSION}|${channelId}|${topic}|${id}`);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData, tagLength: 128 }, key, plaintext
  ));
  return JSON.stringify({ v: PROTOCOL_VERSION, id, iv: bytesToBase64Url(iv), ct: bytesToBase64Url(ciphertext) });
}

async function decryptPacket(key, topic, channelId, wire) {
  if (!key || typeof wire !== "string" || encoder.encode(wire).byteLength > MAX_WIRE_BYTES) return null;
  let packet;
  try { packet = JSON.parse(wire); } catch { return null; }
  if (packet?.v !== PROTOCOL_VERSION || !MESSAGE_ID_PATTERN.test(packet.id || "")) return null;
  if (!/^[A-Za-z0-9_-]{16}$/.test(packet.iv || "") || !/^[A-Za-z0-9_-]+$/.test(packet.ct || "")) return null;
  try {
    const iv = base64UrlToBytes(packet.iv);
    const ciphertext = base64UrlToBytes(packet.ct);
    if (iv.length !== 12 || ciphertext.length > MAX_WIRE_BYTES) return null;
    const additionalData = encoder.encode(`${PROTOCOL_VERSION}|${channelId}|${topic}|${packet.id}`);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData, tagLength: 128 }, key, ciphertext
    );
    if (plaintext.byteLength > MAX_PLAINTEXT_BYTES) return null;
    return { id: packet.id, inner: JSON.parse(decoder.decode(plaintext)) };
  } catch {
    return null;
  }
}

export function createMultiplayerTransport({ onState, onMessage, onOpen, onClose } = {}) {
  let generation = 0;
  let channelId = "";
  let keyText = "";
  let rootBytes = null;
  let rootKey = null;
  let sessionKey = null;
  let localSession = "";
  let peerSession = "";
  let localNonce = null;
  let peerNonce = null;
  let clients = new Map();
  let intentionalClose = false;
  let reconnectBlocked = false;
  let suspended = false;
  let heartbeatTimer = 0;
  let timeoutTimer = 0;
  let joinTimer = 0;
  let lastPeerAt = 0;
  let outgoingSequence = 0;
  let pendingPublishes = 0;
  let publishQueue = Promise.resolve();
  let seenIds = new Map();
  const receiveRates = new Map();
  const sendRates = new Map();
  const state = {
    role: "solo",
    status: "solo",
    transport: "encrypted-websocket-relay",
    roomId: "",
    inviteUrl: "",
    connected: false,
    playerCount: 1,
    maxPlayers: 2,
    reconnectAttempts: 0,
    lastError: ""
  };

  const snapshot = () => ({ ...state });
  const emit = () => onState?.(snapshot());
  const setState = (patch) => { Object.assign(state, patch); emit(); };
  const now = () => Date.now();

  function clearTimers() {
    clearInterval(heartbeatTimer);
    clearInterval(timeoutTimer);
    clearInterval(joinTimer);
    heartbeatTimer = timeoutTimer = joinTimer = 0;
  }

  function connectedRecords() {
    return [...clients.values()].filter((record) => record.connected && record.subscribed && !record.retired);
  }

  function closeRecords(records = [...clients.values()]) {
    for (const record of records) {
      record.retired = true;
      try { record.client.end(true); } catch { /* already closed */ }
    }
  }

  function closeClients() {
    const records = [...clients.values()];
    clients = new Map();
    closeRecords(records);
  }

  function rateAllowed(table, key, limit, windowMs = 1000) {
    const time = now();
    let bucket = table.get(key);
    if (!bucket || time - bucket.startedAt >= windowMs) {
      bucket = { startedAt: time, count: 0 };
      table.set(key, bucket);
    }
    bucket.count += 1;
    return bucket.count <= limit;
  }

  function rememberMessage(id) {
    if (seenIds.has(id)) return false;
    seenIds.set(id, now());
    if (seenIds.size > 4096) {
      const cutoff = now() - 120_000;
      for (const [key, timestamp] of seenIds) {
        if (timestamp < cutoff || seenIds.size > 3072) seenIds.delete(key);
        if (seenIds.size <= 3072) break;
      }
    }
    return true;
  }

  function isValidInner(inner, expectedRole, expectedSession, kind) {
    if (!inner || typeof inner !== "object" || inner.v !== PROTOCOL_VERSION) return false;
    if (inner.channel !== channelId || inner.kind !== kind || inner.role !== expectedRole) return false;
    if (!SESSION_PATTERN.test(inner.session || "") || (expectedSession && inner.session !== expectedSession)) return false;
    if (inner.target && inner.target !== localSession) return false;
    if (!Number.isSafeInteger(inner.seq) || inner.seq < 1 || inner.seq > Number.MAX_SAFE_INTEGER) return false;
    if (!Number.isFinite(inner.sentAt) || Math.abs(now() - inner.sentAt) > 24 * 60 * 60 * 1000) return false;
    return true;
  }

  function publishWire(topic, wire, qos, records = connectedRecords()) {
    if (!records.length) return false;
    for (const record of records) {
      try { record.client.publish(topic, wire, { qos, retain: false }); } catch { /* other broker may work */ }
    }
    return true;
  }

  function queueEncrypted(topic, inner, key, qos, records) {
    if (!key || (!records && !connectedRecords().length)) return false;
    const packetChannel = channelId;
    const packetRecords = records || connectedRecords();
    pendingPublishes += 1;
    publishQueue = publishQueue
      .then(async () => {
        const wire = await encryptPacket(key, topic, packetChannel, inner);
        publishWire(topic, wire, qos, packetRecords);
      })
      .catch((error) => {
        if (!intentionalClose && state.role !== "solo") setState({ lastError: friendlyError(error) });
      })
      .finally(() => { pendingPublishes = Math.max(0, pendingPublishes - 1); });
    return true;
  }

  function makeInner(kind, type, payload, target = peerSession) {
    outgoingSequence += 1;
    return {
      v: PROTOCOL_VERSION,
      channel: channelId,
      kind,
      role: state.role,
      session: localSession,
      target: target || "",
      type,
      seq: outgoingSequence,
      sentAt: now(),
      payload
    };
  }

  function sendControl(type, payload, targetSession, records) {
    const topicSet = topicsFor(channelId, state.role, localSession);
    const topic = state.role === "host" ? `${topicSet.controlHost.replace(/\/host$/, "")}/guest/${targetSession}` : topicSet.controlHost;
    return queueEncrypted(topic, makeInner("control", type, payload, targetSession), rootKey, 1, records);
  }

  function sendTransport(type, payload = {}) {
    if (!sessionKey || !peerSession) return false;
    const topicSet = topicsFor(channelId, state.role, localSession);
    const topic = state.role === "host" ? topicSet.gameHost : topicSet.gameGuest;
    return queueEncrypted(topic, makeInner("transport", type, payload), sessionKey, 1);
  }

  function markPeerAlive() {
    lastPeerAt = now();
  }

  function callOpenOnce() {
    const wasConnected = state.connected;
    markPeerAlive();
    setState({ status: "connected", connected: true, playerCount: 2, lastError: "", reconnectAttempts: 0 });
    if (!wasConnected) onOpen?.({ role: state.role, roomId: state.roomId });
  }

  function peerDisconnected(message) {
    if (!state.connected && state.status !== "connected") return;
    const oldRole = state.role;
    setState({ status: oldRole === "host" ? "waiting" : "reconnecting", connected: false, playerCount: 1, lastError: message });
    onClose?.({ role: oldRole, intentional: false });
    if (oldRole === "host") {
      peerSession = "";
      peerNonce = null;
      sessionKey = null;
    }
  }

  async function acceptGuest(inner) {
    const guestNonceText = String(inner.payload?.nonce || "");
    let guestNonce;
    try { guestNonce = base64UrlToBytes(guestNonceText); } catch { return; }
    if (guestNonce.length !== 16) return;
    if (peerSession && peerSession !== inner.session) {
      sendControl("room-full", { message: "Rummet är fullt (2/2)." }, inner.session);
      return;
    }
    if (!peerSession) {
      peerSession = inner.session;
      peerNonce = guestNonce;
      sessionKey = await deriveSessionKey(rootBytes, channelId, localSession, peerSession, localNonce, peerNonce);
    }
    sendControl("accepted", {
      hostSession: localSession,
      guestSession: peerSession,
      hostNonce: bytesToBase64Url(localNonce)
    }, peerSession);
    callOpenOnce();
  }

  async function acceptHost(inner) {
    if (inner.type === "room-full") {
      reconnectBlocked = true;
      setState({ status: "error", connected: false, playerCount: 1, lastError: "Rummet är fullt (2/2)." });
      return;
    }
    if (inner.type !== "accepted" || inner.payload?.guestSession !== localSession) return;
    const hostSession = String(inner.payload?.hostSession || "");
    if (!SESSION_PATTERN.test(hostSession)) return;
    let hostNonce;
    try { hostNonce = base64UrlToBytes(String(inner.payload?.hostNonce || "")); } catch { return; }
    if (hostNonce.length !== 16) return;
    peerSession = hostSession;
    peerNonce = hostNonce;
    sessionKey = await deriveSessionKey(rootBytes, channelId, peerSession, localSession, peerNonce, localNonce);
    callOpenOnce();
  }

  async function handleControl(topic, wire) {
    const decoded = await decryptPacket(rootKey, topic, channelId, wire);
    if (!decoded || !rememberMessage(decoded.id)) return;
    const inner = decoded.inner;
    const expectedRole = state.role === "host" ? "guest" : "host";
    if (!isValidInner(inner, expectedRole, "", "control")) return;
    if (byteLength(inner.payload) > 8_000) return;
    if (!rateAllowed(receiveRates, `control:${inner.session}`, 10, 10_000)) return;
    if (state.role === "host") {
      if (inner.type !== "join-request" || inner.target) return;
      await acceptGuest(inner);
    } else {
      if (inner.target !== localSession || !["accepted", "room-full"].includes(inner.type)) return;
      await acceptHost(inner);
    }
  }

  function validGameRate(inner) {
    const limits = inner.type === "pose" ? 45 : inner.type === "world" ? 12 : ["ping", "pong"].includes(inner.type) ? 12 : 30;
    return rateAllowed(receiveRates, `game:${inner.session}:${inner.type}`, limits);
  }

  async function handleGame(topic, wire) {
    const key = sessionKey;
    if (!key || !peerSession) return;
    const decoded = await decryptPacket(key, topic, channelId, wire);
    if (!decoded || !rememberMessage(decoded.id)) return;
    const inner = decoded.inner;
    const expectedRole = state.role === "host" ? "guest" : "host";
    if (!isValidInner(inner, expectedRole, peerSession, inner?.kind)) return;
    if (!validGameRate(inner)) return;
    markPeerAlive();
    if (!state.connected) callOpenOnce();
    if (inner.kind === "transport") {
      if (inner.type === "heartbeat") return;
      if (inner.type === "leave") {
        if (state.role === "host") peerDisconnected("Kompisen lämnade rummet.");
        else {
          reconnectBlocked = true;
          peerDisconnected("Värden lämnade rummet.");
          setState({ status: "disconnected", lastError: "Värden lämnade rummet." });
        }
      }
      return;
    }
    if (inner.kind !== "game" || !TYPE_PATTERN.test(inner.type || "")) return;
    if (byteLength(inner.payload) > payloadLimit(inner.type)) return;
    onMessage?.({
      v: APP_ENVELOPE_VERSION,
      type: inner.type,
      seq: inner.seq,
      sentAt: inner.sentAt,
      payload: inner.payload
    });
  }

  async function handleWire(topic, payload, token) {
    if (token !== generation || intentionalClose || suspended) return;
    const wire = typeof payload === "string"
      ? payload
      : payload instanceof Uint8Array
        ? decoder.decode(payload)
        : payload?.toString?.("utf8") || "";
    const topicSet = topicsFor(channelId, state.role, localSession);
    if (topic === topicSet.controlHost || topic === topicSet.controlGuest) await handleControl(topic, wire);
    else if (topic === topicSet.gameHost || topic === topicSet.gameGuest) await handleGame(topic, wire);
  }

  function publishJoinRequest() {
    if (state.role !== "guest" || reconnectBlocked || !rootKey || !connectedRecords().length) return;
    sendControl("join-request", { nonce: bytesToBase64Url(localNonce) }, "");
  }

  function startTimers(token) {
    clearTimers();
    heartbeatTimer = setInterval(() => {
      if (token !== generation || suspended || state.role === "solo") return;
      if (state.connected) sendTransport("heartbeat", { at: now() });
      else if (state.role === "guest") publishJoinRequest();
    }, HEARTBEAT_MS);
    timeoutTimer = setInterval(() => {
      if (token !== generation || suspended || !state.connected || !lastPeerAt) return;
      if (now() - lastPeerAt > PEER_TIMEOUT_MS) peerDisconnected("Kompisen svarar inte. Försöker återansluta…");
    }, 5_000);
    if (state.role === "guest") {
      joinTimer = setInterval(() => {
        if (token !== generation || suspended || state.connected || reconnectBlocked) return;
        publishJoinRequest();
      }, JOIN_RETRY_MS);
    }
  }

  function handleBrokerDown(record) {
    if (record.retired || suspended || intentionalClose || state.role === "solo") return;
    record.connected = false;
    record.subscribed = false;
    if (connectedRecords().length) return;
    const wasConnected = state.connected;
    setState({
      status: "reconnecting",
      connected: false,
      playerCount: 1,
      reconnectAttempts: state.reconnectAttempts + 1,
      lastError: "Anslutningen tappades. Försöker återansluta…"
    });
    if (wasConnected) onClose?.({ role: state.role, intentional: false });
  }

  function brokerReady(record) {
    if (state.role === "host") {
      if (!state.connected && peerSession && sessionKey) {
        callOpenOnce();
        sendTransport("heartbeat", { at: now(), resumed: true });
      } else if (!state.connected) {
        setState({ status: "waiting", lastError: "" });
      }
    } else if (!state.connected) {
      setState({ status: "connecting", lastError: "" });
      publishJoinRequest();
    }
  }

  async function connectBrokers(token) {
    try {
      const mqtt = await loadMqttLibrary();
      if (token !== generation || intentionalClose || suspended || state.role === "solo") return;
      for (let index = 0; index < MQTT_URLS.length; index += 1) {
        const url = MQTT_URLS[index];
        if (clients.has(url)) continue;
        const record = { url, client: null, connected: false, subscribed: false, retired: false };
        const client = mqtt.connect(url, {
          protocolVersion: 4,
          clean: true,
          keepalive: 20,
          connectTimeout: 12_000,
          reconnectPeriod: 3_000,
          resubscribe: true,
          clientId: `ma_${localSession.slice(0, 18)}_${index}_${bytesToHex(randomBytes(3))}`
        });
        record.client = client;
        clients.set(url, record);
        client.on("connect", () => {
          if (token !== generation || record.retired || suspended) return;
          record.connected = true;
          record.subscribed = false;
          const exactTopics = topicsFor(channelId, state.role, localSession).inbound;
          client.subscribe(exactTopics, { qos: 1 }, (error) => {
            if (token !== generation || record.retired || suspended) return;
            if (error) {
              record.subscribed = false;
              setState({ lastError: friendlyError(error) });
              return;
            }
            record.subscribed = true;
            brokerReady(record);
          });
        });
        client.on("message", (topic, payload) => { void handleWire(String(topic), payload, token); });
        client.on("reconnect", () => {
          if (token !== generation || record.retired || suspended) return;
          setState({ reconnectAttempts: state.reconnectAttempts + 1 });
        });
        client.on("offline", () => handleBrokerDown(record));
        client.on("close", () => handleBrokerDown(record));
        client.on("error", (error) => {
          if (token !== generation || record.retired || intentionalClose || suspended) return;
          if (!connectedRecords().length) setState({ lastError: friendlyError(error) });
        });
      }
    } catch (error) {
      if (token === generation && !intentionalClose) setState({ status: "error", lastError: friendlyError(error) });
    }
  }

  function resetStateToSolo() {
    clearTimers();
    closeClients();
    channelId = "";
    keyText = "";
    rootBytes = null;
    rootKey = null;
    sessionKey = null;
    localSession = "";
    peerSession = "";
    localNonce = peerNonce = null;
    reconnectBlocked = false;
    seenIds = new Map();
    receiveRates.clear();
    sendRates.clear();
    Object.assign(state, {
      role: "solo", status: "solo", roomId: "", inviteUrl: "",
      connected: false, playerCount: 1, reconnectAttempts: 0, lastError: ""
    });
    emit();
  }

  async function begin(role, parts) {
    intentionalClose = true;
    clearTimers();
    closeClients();
    generation += 1;
    const token = generation;
    intentionalClose = false;
    suspended = false;
    reconnectBlocked = false;
    channelId = parts.channelId;
    keyText = parts.keyText;
    rootBytes = base64UrlToBytes(keyText);
    rootKey = await importRootKey(rootBytes);
    localSession = bytesToHex(randomBytes(16));
    localNonce = randomBytes(16);
    peerSession = "";
    peerNonce = null;
    sessionKey = null;
    lastPeerAt = 0;
    outgoingSequence = 0;
    pendingPublishes = 0;
    seenIds = new Map();
    receiveRates.clear();
    sendRates.clear();
    setState({
      role,
      status: role === "host" ? "creating" : "connecting",
      roomId: `${ROOM_PREFIX}${channelId}`,
      inviteUrl: makeInviteUrl(channelId, keyText),
      connected: false,
      playerCount: 1,
      reconnectAttempts: 0,
      lastError: ""
    });
    startTimers(token);
    void connectBrokers(token);
    return snapshot();
  }

  async function host() {
    const parts = { channelId: bytesToHex(randomBytes(16)), keyText: bytesToBase64Url(randomBytes(32)) };
    try { return await begin("host", parts); }
    catch (error) {
      setState({ role: "host", status: "error", lastError: friendlyError(error) });
      return snapshot();
    }
  }

  async function join(value) {
    const parsed = parseOnlineRoom(value);
    const parts = parsed ? parseRoomParts(parsed) : null;
    if (!parts) {
      setState({ status: "error", lastError: "Inbjudningslänken är ogiltig. Be kompisen skicka en ny länk." });
      return snapshot();
    }
    try { return await begin("guest", parts); }
    catch (error) {
      setState({ role: "guest", status: "error", lastError: friendlyError(error) });
      return snapshot();
    }
  }

  function send(type, payload = {}) {
    type = String(type || "");
    if (!state.connected || !sessionKey || !TYPE_PATTERN.test(type)) return false;
    if (byteLength(payload) > payloadLimit(type)) return false;
    const limit = type === "pose" ? 45 : type === "world" ? 12 : ["ping", "pong"].includes(type) ? 12 : 30;
    if (!rateAllowed(sendRates, type, limit)) return false;
    if (FAST_TYPES.has(type) && pendingPublishes >= MAX_PENDING_PUBLISHES) return false;
    const topicSet = topicsFor(channelId, state.role, localSession);
    const topic = state.role === "host" ? topicSet.gameHost : topicSet.gameGuest;
    const qos = FAST_TYPES.has(type) ? 0 : 1;
    return queueEncrypted(topic, makeInner("game", type, payload), sessionKey, qos);
  }

  function leave() {
    const oldRole = state.role;
    const allOldRecords = [...clients.values()];
    const publishRecords = connectedRecords();
    clients = new Map();
    if (state.connected && sessionKey && peerSession && publishRecords.length) {
      const topicSet = topicsFor(channelId, state.role, localSession);
      const topic = state.role === "host" ? topicSet.gameHost : topicSet.gameGuest;
      const inner = makeInner("transport", "leave", {}, peerSession);
      void encryptPacket(sessionKey, topic, channelId, inner)
        .then((wire) => publishWire(topic, wire, 1, publishRecords))
        .finally(() => setTimeout(() => closeRecords(allOldRecords), 250));
    } else closeRecords(allOldRecords);
    generation += 1;
    intentionalClose = true;
    resetStateToSolo();
    intentionalClose = false;
    onClose?.({ role: oldRole, intentional: true });
  }

  function debugDropConnection() {
    if (!globalThis.navigator?.webdriver || state.role === "solo" || !clients.size) return false;
    const token = generation;
    const wasConnected = state.connected;
    closeClients();
    setState({
      status: "reconnecting", connected: false, playerCount: 1,
      reconnectAttempts: state.reconnectAttempts + 1,
      lastError: "Test: anslutningen tappades. Återansluter…"
    });
    if (wasConnected) onClose?.({ role: state.role, intentional: false });
    setTimeout(() => {
      if (token === generation && state.role !== "solo" && !suspended) void connectBrokers(token);
    }, 350);
    return true;
  }

  function suspendForPageHide() {
    if (state.role === "solo") return;
    suspended = true;
    intentionalClose = true;
    clearTimers();
    closeClients();
  }

  function resumeAfterPageShow() {
    if (!suspended || state.role === "solo") return;
    suspended = false;
    intentionalClose = false;
    setState({ status: "reconnecting", connected: false, playerCount: 1, lastError: "Återansluter…" });
    const token = generation;
    startTimers(token);
    void connectBrokers(token);
  }

  const scope = runtimeWindow();
  scope.addEventListener?.("pagehide", suspendForPageHide);
  scope.addEventListener?.("pageshow", resumeAfterPageShow);
  globalThis.document?.addEventListener?.("visibilitychange", () => {
    if (document.visibilityState !== "visible" || state.role === "solo" || suspended) return;
    if (!clients.size) void connectBrokers(generation);
    else if (state.role === "guest" && !state.connected) publishJoinRequest();
    else if (state.connected) sendTransport("heartbeat", { at: now(), resumed: true });
  });

  emit();
  return { host, join, send, leave, flush: () => publishQueue, state: snapshot, parseRoom: parseOnlineRoom, debugDropConnection };
}
