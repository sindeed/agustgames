const PROTOCOL_VERSION = 1;
const CONNECTION_LABEL = "ikea333-game-v1";
const ROOM_PREFIX = "ikea333-";
const ROOM_PATTERN = /^ikea333-[a-f0-9]{32}$/;
const PEERJS_URL = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
const MAX_GUEST_RECONNECT_ATTEMPTS = 4;
const GUEST_RECONNECT_BASE_DELAY_MS = 500;
const GUEST_CONNECTION_TIMEOUT_MS = 6000;

let peerLibraryPromise = null;

function randomRoomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return ROOM_PREFIX + [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function parseOnlineRoom(value, baseHref = location.href) {
  const source = String(value || "").trim();
  if (!source) return "";
  let candidate = source.toLowerCase();
  try {
    const url = new URL(source, baseHref);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    candidate = (hash.get("online") || hash.get("join") || candidate).toLowerCase();
  } catch {
    const hash = new URLSearchParams(source.replace(/^#/, ""));
    candidate = (hash.get("online") || hash.get("join") || candidate).toLowerCase();
  }
  return ROOM_PATTERN.test(candidate) ? candidate : "";
}

export function makeOnlineInviteUrl(roomId, baseHref = location.href) {
  if (!ROOM_PATTERN.test(String(roomId || "").toLowerCase())) return "";
  const url = new URL(baseHref);
  url.search = "";
  url.hash = new URLSearchParams({ online: String(roomId).toLowerCase() }).toString();
  return url.href;
}

export function shortOnlineRoomCode(roomId) {
  const normalized = String(roomId || "").toLowerCase();
  return ROOM_PATTERN.test(normalized) ? normalized.slice(-6).toUpperCase() : "";
}

async function loadPeerConstructor() {
  if (window.__IKEA333_PEER_CTOR__) return window.__IKEA333_PEER_CTOR__;
  if (window.Peer) return window.Peer;
  if (peerLibraryPromise) return peerLibraryPromise;
  peerLibraryPromise = new Promise((resolve, reject) => {
    let existing = document.querySelector(`script[src="${PEERJS_URL}"]`);
    if (existing && existing.dataset.ikea333PeerState !== "loading") {
      existing.remove();
      existing = null;
    }
    const script = existing || document.createElement("script");
    const cleanup = () => {
      script.removeEventListener("load", finish);
      script.removeEventListener("error", fail);
    };
    const rejectAndRemove = (error) => {
      cleanup();
      script.dataset.ikea333PeerState = "failed";
      script.remove();
      reject(error);
    };
    const finish = () => {
      if (!window.Peer) {
        rejectAndRemove(new Error("PeerJS laddades men kunde inte starta."));
        return;
      }
      cleanup();
      script.dataset.ikea333PeerState = "loaded";
      resolve(window.Peer);
    };
    const fail = () => rejectAndRemove(new Error("Onlinemotorn kunde inte laddas."));
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.src = PEERJS_URL;
      script.crossOrigin = "anonymous";
      script.dataset.ikea333PeerState = "loading";
      document.head.append(script);
    } else if (window.Peer) finish();
  }).catch((error) => {
    peerLibraryPromise = null;
    throw error;
  });
  return peerLibraryPromise;
}

function friendlyPeerError(error) {
  const type = error?.type || "";
  if (type === "peer-unavailable") return "Rummet finns inte längre. Be värden skapa en ny länk.";
  if (type === "unavailable-id") return "Rumskoden används redan. Försök skapa ett nytt rum.";
  if (type === "browser-incompatible") return "Den här webbläsaren stöder inte onlinespel.";
  if (["network", "server-error", "socket-error", "socket-closed"].includes(type)) {
    return "Onlineservern kunde inte nås. Kontrollera internet och försök igen.";
  }
  if (type === "webrtc") return "Direktanslutningen misslyckades. Prova ett annat nätverk.";
  return error?.message ? `Onlinefel: ${String(error.message).slice(0, 120)}` : "Onlinespelet kunde inte starta.";
}

export function createMultiplayerTransport({ onState, onMessage, onOpen, onClose } = {}) {
  let peer = null;
  let connection = null;
  let generation = 0;
  let intentionalClose = false;
  let terminalConnectionError = "";
  let reconnectBlocked = false;
  let peerReconnectTimer = 0;
  let guestReconnectTimer = 0;
  let guestConnectionTimer = 0;
  let guestReconnectAttempts = 0;
  let outgoingSequence = 0;
  const state = {
    role: "solo",
    status: "solo",
    transport: "peerjs",
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

  function clearPeerReconnectTimer() {
    if (peerReconnectTimer) window.clearTimeout(peerReconnectTimer);
    peerReconnectTimer = 0;
  }

  function clearGuestReconnectTimers() {
    if (guestReconnectTimer) window.clearTimeout(guestReconnectTimer);
    if (guestConnectionTimer) window.clearTimeout(guestConnectionTimer);
    guestReconnectTimer = 0;
    guestConnectionTimer = 0;
  }

  function destroyCurrent() {
    clearPeerReconnectTimer();
    clearGuestReconnectTimers();
    guestReconnectAttempts = 0;
    intentionalClose = true;
    try { connection?.close(); } catch { /* already closed */ }
    try { peer?.destroy(); } catch { /* already destroyed */ }
    connection = null;
    peer = null;
    intentionalClose = false;
  }

  function resetToSolo() {
    destroyCurrent();
    terminalConnectionError = "";
    reconnectBlocked = false;
    generation += 1;
    Object.assign(state, {
      role: "solo", status: "solo", roomId: "", inviteUrl: "",
      connected: false, playerCount: 1, reconnectAttempts: 0, lastError: ""
    });
    emit();
  }

  function rejectExtraConnection(extraConnection, message = "Rummet är fullt (2/2).", type = "room-full") {
    const reject = () => {
      try { extraConnection.send({ v: PROTOCOL_VERSION, type, seq: 0, payload: { message } }); } catch { /* peer left */ }
      // Låt avslagsmeddelandet hinna över WebRTC-kanalen innan den stängs.
      window.setTimeout(() => { try { extraConnection.close(); } catch { /* peer left */ } }, 750);
    };
    if (extraConnection.open) reject();
    else extraConnection.on("open", reject);
  }

  function receiveEnvelope(data) {
    if (!data || typeof data !== "object" || data.v !== PROTOCOL_VERSION || typeof data.type !== "string") return;
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(data.type)) return;
    if (data.type === "room-full") {
      terminalConnectionError = "Rummet är fullt (2/2).";
      reconnectBlocked = true;
      clearGuestReconnectTimers();
      setState({ status: "error", connected: false, playerCount: 1, lastError: terminalConnectionError });
      return;
    }
    if (data.type === "protocol-error") {
      terminalConnectionError = "Spelversionerna passar inte ihop. Ladda om båda spelen.";
      reconnectBlocked = true;
      clearGuestReconnectTimers();
      setState({ status: "error", connected: false, playerCount: 1, lastError: terminalConnectionError });
      return;
    }
    onMessage?.(data);
  }

  function attachConnection(nextConnection, token) {
    if (token !== generation) { nextConnection.close(); return; }
    if (nextConnection.label !== CONNECTION_LABEL || nextConnection.metadata?.protocol !== PROTOCOL_VERSION) {
      rejectExtraConnection(nextConnection, "Spelversionerna passar inte ihop.", "protocol-error");
      return;
    }
    if (connection && connection !== nextConnection) {
      const sameGuestReconnecting = state.role === "host" && connection.peer && connection.peer === nextConnection.peer;
      if (sameGuestReconnecting) {
        const staleConnection = connection;
        connection = null;
        try { staleConnection.close(); } catch { /* replaced by the guest's new data channel */ }
      } else {
        rejectExtraConnection(nextConnection);
        return;
      }
    }
    connection = nextConnection;
    terminalConnectionError = "";
    nextConnection.on("open", () => {
      if (token !== generation || connection !== nextConnection) return;
      clearGuestReconnectTimers();
      guestReconnectAttempts = 0;
      setState({ status: "connected", connected: true, playerCount: 2, lastError: "", reconnectAttempts: 0 });
      onOpen?.({ role: state.role, roomId: state.roomId });
    });
    nextConnection.on("data", receiveEnvelope);
    nextConnection.on("error", (error) => {
      if (token !== generation || intentionalClose) return;
      setState({ lastError: friendlyPeerError(error) });
    });
    nextConnection.on("close", () => {
      if (token !== generation || connection !== nextConnection) return;
      clearGuestReconnectTimers();
      connection = null;
      if (intentionalClose) return;
      const error = terminalConnectionError;
      if (state.role === "host" && peer && !peer.destroyed) {
        setState({ status: "waiting", connected: false, playerCount: 1, lastError: error });
      } else if (state.role === "guest" && peer && !peer.destroyed && !reconnectBlocked) {
        scheduleGuestReconnect(peer, token);
      } else {
        setState({ status: error ? "error" : "disconnected", connected: false, playerCount: 1, lastError: error || "Värden kopplades bort." });
      }
      onClose?.({ role: state.role, intentional: false });
    });
  }

  function openGuestConnection(nextPeer, token) {
    if (
      token !== generation || intentionalClose || state.role !== "guest" ||
      nextPeer !== peer || nextPeer.destroyed || nextPeer.disconnected || connection ||
      (guestReconnectAttempts >= MAX_GUEST_RECONNECT_ATTEMPTS && state.status === "disconnected")
    ) return false;
    try {
      const outgoing = nextPeer.connect(state.roomId, {
        label: CONNECTION_LABEL,
        metadata: { protocol: PROTOCOL_VERSION },
        serialization: "json",
        reliable: true
      });
      attachConnection(outgoing, token);
      guestConnectionTimer = window.setTimeout(() => {
        guestConnectionTimer = 0;
        if (token !== generation || connection !== outgoing || outgoing.open || intentionalClose) return;
        connection = null;
        try { outgoing.close(); } catch { /* retry with a fresh data channel */ }
        scheduleGuestReconnect(nextPeer, token);
      }, GUEST_CONNECTION_TIMEOUT_MS);
      return true;
    } catch (error) {
      terminalConnectionError = friendlyPeerError(error);
      scheduleGuestReconnect(nextPeer, token);
      return false;
    }
  }

  function scheduleGuestReconnect(nextPeer, token) {
    clearGuestReconnectTimers();
    if (
      token !== generation || intentionalClose || reconnectBlocked ||
      state.role !== "guest" || nextPeer !== peer || nextPeer.destroyed || connection
    ) return;
    if (guestReconnectAttempts >= MAX_GUEST_RECONNECT_ATTEMPTS) {
      setState({
        status: "disconnected", connected: false, playerCount: 1,
        reconnectAttempts: guestReconnectAttempts,
        lastError: `Det gick inte att återansluta till värden efter ${MAX_GUEST_RECONNECT_ATTEMPTS} försök.`
      });
      return;
    }
    guestReconnectAttempts += 1;
    const attempt = guestReconnectAttempts;
    const delay = GUEST_RECONNECT_BASE_DELAY_MS * (2 ** (attempt - 1));
    setState({
      status: "reconnecting", connected: false, playerCount: 1,
      reconnectAttempts: attempt,
      lastError: `Försöker återansluta till värden (${attempt}/${MAX_GUEST_RECONNECT_ATTEMPTS})…`
    });
    guestReconnectTimer = window.setTimeout(() => {
      guestReconnectTimer = 0;
      if (token !== generation || connection || intentionalClose || reconnectBlocked) return;
      if (nextPeer.destroyed) {
        setState({ status: "disconnected", lastError: "Onlineanslutningen stängdes." });
        return;
      }
      if (nextPeer.disconnected) {
        try { nextPeer.reconnect(); } catch { /* peer error reports the failure */ }
        scheduleGuestReconnect(nextPeer, token);
        return;
      }
      openGuestConnection(nextPeer, token);
    }, delay);
  }

  function bindPeerCommon(nextPeer, token) {
    nextPeer.on("disconnected", () => {
      if (token !== generation || intentionalClose || nextPeer.destroyed) return;
      if (state.role === "guest" && !connection && guestReconnectAttempts >= MAX_GUEST_RECONNECT_ATTEMPTS) return;
      const attempts = state.reconnectAttempts + 1;
      setState({ status: state.connected ? "connected" : "reconnecting", reconnectAttempts: attempts });
      clearPeerReconnectTimer();
      peerReconnectTimer = window.setTimeout(() => {
        if (token !== generation || nextPeer.destroyed || !nextPeer.disconnected) return;
        try { nextPeer.reconnect(); } catch { /* error event gives the message */ }
      }, Math.min(4000, 400 + attempts * 500));
    });
    nextPeer.on("error", (error) => {
      if (token !== generation || intentionalClose) return;
      const message = friendlyPeerError(error);
      terminalConnectionError = message;
      setState({ status: state.connected ? "connected" : "error", lastError: message });
    });
    nextPeer.on("close", () => {
      if (token !== generation || intentionalClose) return;
      setState({ status: "disconnected", connected: false, playerCount: 1, lastError: "Onlineanslutningen stängdes." });
      onClose?.({ role: state.role, intentional: false });
    });
  }

  async function host() {
    destroyCurrent();
    generation += 1;
    const token = generation;
    const roomId = randomRoomId();
    intentionalClose = false;
    terminalConnectionError = "";
    reconnectBlocked = false;
    setState({
      role: "host", status: "loading", roomId,
      inviteUrl: makeOnlineInviteUrl(roomId), connected: false,
      playerCount: 1, reconnectAttempts: 0, lastError: ""
    });
    try {
      const PeerCtor = await loadPeerConstructor();
      if (token !== generation) return snapshot();
      setState({ status: "creating" });
      const nextPeer = new PeerCtor(roomId, { debug: 0 });
      peer = nextPeer;
      bindPeerCommon(nextPeer, token);
      nextPeer.on("open", () => {
        if (token !== generation) return;
        setState({ status: connection?.open ? "connected" : "waiting", connected: Boolean(connection?.open), playerCount: connection?.open ? 2 : 1 });
      });
      nextPeer.on("connection", (incoming) => attachConnection(incoming, token));
    } catch (error) {
      if (token === generation) setState({ status: "error", lastError: friendlyPeerError(error) });
    }
    return snapshot();
  }

  async function join(value) {
    const roomId = parseOnlineRoom(value);
    if (!roomId) {
      setState({ status: "error", lastError: "Inbjudningslänken eller rumskoden är ogiltig." });
      return snapshot();
    }
    destroyCurrent();
    generation += 1;
    const token = generation;
    intentionalClose = false;
    terminalConnectionError = "";
    reconnectBlocked = false;
    guestReconnectAttempts = 0;
    setState({
      role: "guest", status: "loading", roomId,
      inviteUrl: makeOnlineInviteUrl(roomId), connected: false,
      playerCount: 1, reconnectAttempts: 0, lastError: ""
    });
    try {
      const PeerCtor = await loadPeerConstructor();
      if (token !== generation) return snapshot();
      setState({ status: "connecting" });
      const nextPeer = new PeerCtor(undefined, { debug: 0 });
      peer = nextPeer;
      bindPeerCommon(nextPeer, token);
      nextPeer.on("open", () => {
        if (
          token !== generation || connection || reconnectBlocked ||
          (guestReconnectAttempts >= MAX_GUEST_RECONNECT_ATTEMPTS && state.status === "disconnected")
        ) return;
        clearPeerReconnectTimer();
        clearGuestReconnectTimers();
        openGuestConnection(nextPeer, token);
      });
      nextPeer.on("connection", (incoming) => rejectExtraConnection(incoming, "Gästen kan inte ta emot fler spelare."));
    } catch (error) {
      if (token === generation) setState({ status: "error", lastError: friendlyPeerError(error) });
    }
    return snapshot();
  }

  function send(type, payload = {}) {
    if (!connection?.open || !/^[a-z][a-z0-9-]{0,31}$/.test(String(type))) return false;
    if ((connection.bufferSize || 0) > 512_000 && type === "pose") return false;
    try {
      outgoingSequence += 1;
      connection.send({ v: PROTOCOL_VERSION, type, seq: outgoingSequence, sentAt: Date.now(), payload });
      return true;
    } catch {
      return false;
    }
  }

  function leave() {
    const oldRole = state.role;
    resetToSolo();
    onClose?.({ role: oldRole, intentional: true });
  }

  function debugDropConnection() {
    if (!navigator.webdriver || !connection) return false;
    try {
      connection.close();
      return true;
    } catch {
      return false;
    }
  }

  window.addEventListener("pagehide", () => {
    intentionalClose = true;
    try { connection?.close(); } catch { /* page is closing */ }
    try { peer?.destroy(); } catch { /* page is closing */ }
  });

  emit();
  return { host, join, send, leave, state: snapshot, parseRoom: parseOnlineRoom, debugDropConnection };
}
