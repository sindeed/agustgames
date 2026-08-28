import * as THREE from "./vendor/three.module.js";

(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const canvas = $("#game");
  const shell = $("#game-shell");
  if (!canvas || !shell) return;

  const ui = {
    menu: $("#menu-screen"),
    start: $("#start-btn"),
    hud: $("#hud"),
    healthValue: $("#health-value"),
    healthFill: $("#health-fill"),
    money: $("#money-value"),
    diamonds: $("#diamond-value"),
    phase: $("#phase-label"),
    clock: $("#clock-value"),
    weapon: $("#weapon-label"),
    followers: $("#followers-value"),
    prompt: $("#interaction-prompt"),
    toast: $("#toast"),
    map: $("#world-map"),
    mapGrid: $("#map-grid"),
    closeMap: $("#close-map-btn"),
    question: $("#question-dialog"),
    questionTitle: $("#question-title"),
    questionText: $("#question-text"),
    questionYes: $("#question-yes"),
    questionNo: $("#question-no"),
    questionBack: $("#question-back"),
    questionActions: $("#question-actions"),
    selection: $("#selection-dialog"),
    selectionTitle: $("#selection-title"),
    selectionCopy: $("#selection-copy"),
    selectionTotal: $("#selection-total"),
    selectionConfirm: $("#selection-confirm"),
    selectionCancel: $("#selection-cancel"),
    shop: $("#shop-dialog"),
    closeShop: $("#close-shop-btn"),
    sellDiamond: $("#sell-diamond-btn"),
    outcome: $("#outcome-dialog"),
    outcomeTitle: $("#outcome-title"),
    outcomeText: $("#outcome-text"),
    outcomeContinue: $("#outcome-continue"),
    pause: $("#pause-dialog"),
    pauseButton: $("#pause-btn"),
    resume: $("#resume-btn"),
    restart: $("#restart-btn"),
    fullscreen: $("#fullscreen-btn"),
    touch: $("#touch-controls"),
    joystick: $("#move-stick"),
    joystickKnob: $("#move-stick-knob"),
    attack: $("#attack-btn"),
    use: $("#use-btn"),
    switchWeapon: $("#switch-btn"),
  };

  const TAU = Math.PI * 2;
  const FIXED_STEP = 1 / 60;
  const DAY_SECONDS = 180;
  const NIGHT_SECONDS = 180;
  const PLAYER_RADIUS = 0.48;
  const EYE_HEIGHT = 1.62;
  const UNIT_TYPES = ["sword", "archer", "cavalry"];
  const UNIT_LABELS = {
    sword: "SVÄRD + SKÖLD",
    archer: "PILBÅGE",
    cavalry: "SPJUT + HÄST",
  };
  const UNIT_PRICES = { sword: 10, archer: 15, cavalry: 20 };
  const COMBAT_RANGES = Object.freeze({
    swordGuard: 2.15,
    cavalrySpear: 3.2,
    kingSword: 3.2,
    archerBow: 13.5,
    kingBow: 34,
    towerArcherBow: 100,
  });
  const MINER_PRICE = 15;
  const MAX_MINERS = 9;
  const MINE_PAYOUT_SECONDS = 30;
  const MINE_INCOME = Object.freeze([0, 3, 5, 10, 13, 15, 20, 23, 25, 30]);
  const MINE_DIAMOND_EVERY_PAYOUTS = 4;
  const CASTLE_GATE_WIDTH = 6;
  const REAR_DRAWBRIDGE = Object.freeze({ x: 0, z: -20.5, width: 6, length: 14 });
  const ENEMY_MINER_COUNTS = Object.freeze([0, 2, 5, 8, 1, 7, 4]);
  const MINE_WORKER_SPOTS = Object.freeze([
    [-1.8, -41.2], [1.8, -41], [-3.5, -38.8], [3.5, -38.6], [-1.6, -36.8],
    [1.7, -36.5], [-4.8, -34.8], [4.4, -32.8], [0, -33.5],
  ]);
  const MINE_GUARD_SPOTS = Object.freeze([
    [-10.5, -32.5], [10.5, -32.5], [-9, -36.5], [9, -36.5], [-11, -40.5], [11, -40.5],
  ]);
  const INITIAL_SEED = 741928;
  const KINGDOM_COLORS = [0x2f8fff, 0xd94a4a, 0x7e5ce4, 0xe5a72e, 0x31a56c, 0xd85aa8, 0x4f728c];
  const ABANDONED_MAX_GUARDS = 10;
  const ABANDONED_STATUE_HP = 200;
  const ABANDONED_STATUE_RESPAWN_SECONDS = 30;
  const ABANDONED_MONEY_ROOM_ID = "small-3";
  const ABANDONED_MONEY_PER_TAKE = 10;
  const ABANDONED_TREASURE_SECONDS = 30;
  const ABANDONED_GUARD_MONEY_PER_SECOND = 10;
  const ABANDONED_STATUE_ATTACK_SECONDS = 3;
  const ABANDONED_HEAL_SECONDS = 3;
  const TREASURE_FOUND_TEXT = "Skattkammaren är här borta!";
  const ABANDONED_CASTLE = Object.freeze({
    id: "abandoned-giant-castle",
    name: "ÖVERGIVNA JÄTTESLOTTET",
    ruler: null,
    inhabited: false,
    sizeEquivalentNormalCastles: 7,
    largeRooms: 7,
    smallRooms: 28,
    roomsTotal: 35,
    explorable: true,
    maxPlayerGuards: ABANDONED_MAX_GUARDS,
    statues: 35,
    statueHp: ABANDONED_STATUE_HP,
    statueRespawnSeconds: ABANDONED_STATUE_RESPAWN_SECONDS,
    infiniteMoneyRoomId: ABANDONED_MONEY_ROOM_ID,
    moneyPerTake: ABANDONED_MONEY_PER_TAKE,
    guardMoneyPerSecond: ABANDONED_GUARD_MONEY_PER_SECOND,
    treasureSecondsPerVisit: ABANDONED_TREASURE_SECONDS,
    statueAttackSeconds: ABANDONED_STATUE_ATTACK_SECONDS,
    labyrinth: true,
    rivalKing: true,
    attackable: false,
    stealthable: false,
    mineRaidable: false,
  });
  const ABANDONED_WINGS = Object.freeze([
    { z: -72, side: 1 },
    { z: -48, side: -1 },
    { z: -24, side: 1 },
    { z: 0, side: -1 },
    { z: 24, side: 1 },
    { z: 48, side: -1 },
    { z: 72, side: 1 },
  ]);
  const ABANDONED_ROOMS = Object.freeze(ABANDONED_WINGS.flatMap((wing, wingIndex) => {
    const hallNumber = wingIndex + 1;
    const hallId = `large-${hallNumber}`;
    const hallX = wing.side * 15;
    const firstSmallNumber = wingIndex * 4 + 1;
    const smallRooms = [
      { id: `small-${firstSmallNumber}`, name: `SMÅRUM ${firstSmallNumber}`, x: wing.side * 29, z: wing.z - 4, width: 8, depth: 7.6, position: "outerNorth" },
      { id: `small-${firstSmallNumber + 1}`, name: `SMÅRUM ${firstSmallNumber + 1}`, x: wing.side * 29, z: wing.z + 4, width: 8, depth: 7.6, position: "outerSouth" },
      { id: `small-${firstSmallNumber + 2}`, name: `SMÅRUM ${firstSmallNumber + 2}`, x: hallX, z: wing.z - 11.75, width: 8, depth: 7.5, position: "north" },
      { id: `small-${firstSmallNumber + 3}`, name: `SMÅRUM ${firstSmallNumber + 3}`, x: hallX, z: wing.z + 11.75, width: 8, depth: 7.5, position: "south" },
    ].map((room) => Object.freeze({ ...room, type: "small", wing: hallNumber, connectsTo: [hallId] }));
    const hall = Object.freeze({
      id: hallId,
      name: `STORA SALEN ${hallNumber}`,
      type: "large",
      wing: hallNumber,
      side: wing.side,
      x: hallX,
      z: wing.z,
      width: 20,
      depth: 16,
      connectsTo: ["main-corridor", ...smallRooms.map((room) => room.id)],
    });
    return [hall, ...smallRooms];
  }));
  const ABANDONED_DOORS = Object.freeze(ABANDONED_WINGS.flatMap((wing, wingIndex) => {
    const hallNumber = wingIndex + 1;
    const hallId = `large-${hallNumber}`;
    const firstSmallNumber = wingIndex * 4 + 1;
    const hallX = wing.side * 15;
    return [
      Object.freeze({ id: `door-corridor-${hallNumber}`, orientation: "vertical", x: wing.side * 5, z: wing.z, width: 3.4, connects: ["main-corridor", hallId] }),
      Object.freeze({ id: `door-small-${firstSmallNumber}`, orientation: "vertical", x: wing.side * 25, z: wing.z - 4, width: 2.8, connects: [hallId, `small-${firstSmallNumber}`] }),
      Object.freeze({ id: `door-small-${firstSmallNumber + 1}`, orientation: "vertical", x: wing.side * 25, z: wing.z + 4, width: 2.8, connects: [hallId, `small-${firstSmallNumber + 1}`] }),
      Object.freeze({ id: `door-small-${firstSmallNumber + 2}`, orientation: "horizontal", x: hallX, z: wing.z - 8, width: 2.8, connects: [hallId, `small-${firstSmallNumber + 2}`] }),
      Object.freeze({ id: `door-small-${firstSmallNumber + 3}`, orientation: "horizontal", x: hallX, z: wing.z + 8, width: 2.8, connects: [hallId, `small-${firstSmallNumber + 3}`] }),
    ];
  }));
  // Seven alternating stone barriers turn the long inner passage into a
  // serpentine labyrinth. Every barrier has one real, collider-free opening.
  const ABANDONED_MAZE_BARRIERS = Object.freeze([
    { id: "maze-1", z: 82, gapX: -3.45, gapWidth: 2.45 },
    { id: "maze-2", z: 60, gapX: 3.45, gapWidth: 2.45 },
    { id: "maze-3", z: 36, gapX: -3.45, gapWidth: 2.45 },
    { id: "maze-4", z: 12, gapX: 3.45, gapWidth: 2.45 },
    { id: "maze-5", z: -12, gapX: -3.45, gapWidth: 2.45 },
    { id: "maze-6", z: -36, gapX: 3.45, gapWidth: 2.45 },
    { id: "maze-7", z: -60, gapX: -3.45, gapWidth: 2.45 },
  ]);
  const touchDevice = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

  const makeKingdoms = () => Array.from({ length: 7 }, (_, index) => ({
    index,
    player: index === 0,
    towerArchers: index === 0 ? 0 : (index * 3 + 1) % 5,
    miners: ENEMY_MINER_COUNTS[index],
    money: 50,
    mineElapsed: 0,
    defeated: false,
  }));

  const state = {
    screen: "menu",
    scene: "home",
    paused: false,
    pausedModal: null,
    modal: null,
    time: 0,
    phase: "day",
    phaseElapsed: 0,
    day: 1,
    sleeping: 0,
    askedNight: false,
    aiAttackTriggered: false,
    aiAttackAt: 42,
    enemyWar: null,
    enemyWarTriggered: false,
    enemyWarAt: 28,
    money: 50,
    diamonds: 0,
    guards: { sword: 0, archer: 0, cavalry: 0 },
    miners: 0,
    mineElapsed: 0,
    minePayouts: 0,
    towerSlots: [false, false, false, false],
    quickStealth: { sword: 0, archer: 0, cavalry: 0 },
    quickStealthIds: [],
    weapon: "sword",
    player: {
      x: 0,
      y: 0,
      z: 9,
      yaw: 0,
      pitch: 0,
      hp: 100,
      alive: true,
      attackCooldown: 0,
      swing: 0,
      moving: 0,
      abandonedDamagedAt: null,
      abandonedHealSecondsRemaining: 0,
    },
    kingdoms: makeKingdoms(),
    units: [],
    loot: [],
    particles: [],
    battle: null,
    stealth: null,
    mineRaid: null,
    mineDefense: null,
    pendingMineDefense: null,
    loadNotice: "",
    nightMineRaidTriggered: false,
    nightMineRaidAt: 52,
    sleepRaidMessage: "",
    mineTransferId: 0,
    lastMineTransfer: null,
    selection: null,
    question: null,
    nearest: null,
    enteredEnemyCastle: false,
    abandonedCastleVisit: null,
    deterministicSeed: INITIAL_SEED,
  };

  const keys = Object.create(null);
  const joystick = { x: 0, y: 0, pointerId: null };
  const lookPointers = new Map();
  let toastTimer = 0;
  let lastTime = performance.now();
  let accumulator = 0;
  let manualMode = false;
  let manualRemainderMs = 0;
  let rafId = 0;
  let contextLost = false;
  let pausedBeforeContextLoss = false;
  let resetLookInput = () => { lookPointers.clear(); };
  let soundReady = false;
  let audioContext = null;

  function showRendererStartupError(error) {
    console.error("War of Kingdoms kunde inte starta WebGL-renderaren.", error);
    canvas.hidden = true;
    if (ui.start) {
      ui.start.disabled = true;
      ui.start.textContent = "3D-GRAFIKEN KUNDE INTE STARTA";
    }
    const host = ui.menu?.querySelector(".menu-card") || ui.menu || shell;
    const message = document.createElement("p");
    message.id = "graphics-startup-error";
    message.setAttribute("role", "alert");
    message.textContent = "3D-grafiken kunde inte starta på den här enheten. Ladda om sidan eller prova att stänga andra appar.";
    message.style.cssText = "margin:16px auto 0;max-width:34rem;padding:12px 14px;border:2px solid #ffe59a;border-radius:10px;background:#591f2b;color:#fff7df;font-weight:800;line-height:1.35";
    host?.append(message);
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: Boolean(navigator.webdriver),
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  } catch (error) {
    showRendererStartupError(error);
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x73c9f4);
  scene.fog = new THREE.Fog(0xaddff0, 48, 145);
  const camera = new THREE.PerspectiveCamera(73, 16 / 9, 0.035, 220);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const hemisphere = new THREE.HemisphereLight(0xc8efff, 0x405b34, 1.85);
  const sun = new THREE.DirectionalLight(0xffefd1, 2.65);
  sun.position.set(-28, 46, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(touchDevice ? 1024 : 1536, touchDevice ? 1024 : 1536);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 130;
  sun.shadow.bias = -0.00035;
  const fill = new THREE.DirectionalLight(0x78bfff, 0.55);
  fill.position.set(32, 20, 40);
  scene.add(hemisphere, sun, sun.target, fill);

  const worldRoot = new THREE.Group();
  const actorRoot = new THREE.Group();
  const effectRoot = new THREE.Group();
  scene.add(worldRoot, actorRoot, effectRoot);

  const colliders = [];
  const actorModels = new Map();
  const interactables = [];
  const homeGuardVisuals = [];
  const minerVisuals = [];
  const towerMarkers = [];
  let abandonedMoneyGroup = null;
  let abandonedWallSegmentsBuilt = 0;

  const textureCanvas = (base, fleck, lines = false) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const context = c.getContext("2d");
    context.fillStyle = base;
    context.fillRect(0, 0, 256, 256);
    let seed = 9341;
    for (let i = 0; i < 420; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = seed % 256;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const y = seed % 256;
      context.globalAlpha = 0.08 + ((seed >>> 8) % 12) / 100;
      context.fillStyle = fleck;
      context.fillRect(x, y, 1 + (seed % 3), 1 + ((seed >>> 3) % 3));
    }
    context.globalAlpha = 1;
    if (lines) {
      context.strokeStyle = "rgba(75,63,48,.24)";
      context.lineWidth = 2;
      for (let y = 0; y <= 256; y += 32) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(256, y); context.stroke();
      }
      for (let x = 0; x <= 256; x += 64) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 256); context.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(c);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const grassTexture = textureCanvas("#66ad54", "#315f2d");
  grassTexture.repeat.set(18, 18);
  const stoneTexture = textureCanvas("#aeb9bd", "#647278", true);
  stoneTexture.repeat.set(5, 3);
  const woodTexture = textureCanvas("#a8682d", "#5d321d", true);
  woodTexture.repeat.set(2, 7);
  const sandTexture = textureCanvas("#d9bc75", "#8f713c");
  sandTexture.repeat.set(10, 10);

  const materials = {
    grass: new THREE.MeshStandardMaterial({ map: grassTexture, color: 0x8bd56d, roughness: 0.96 }),
    stone: new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0xffffff, roughness: 0.86 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x748188, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xc17a37, roughness: 0.82 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x5e3521, roughness: 0.86 }),
    water: new THREE.MeshStandardMaterial({ color: 0x168fd4, roughness: 0.22, metalness: 0.05, transparent: true, opacity: 0.9 }),
    sand: new THREE.MeshStandardMaterial({ map: sandTexture, color: 0xeed68e, roughness: 0.95 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffcf3c, roughness: 0.28, metalness: 0.62 }),
    iron: new THREE.MeshStandardMaterial({ color: 0xb8c8d1, roughness: 0.33, metalness: 0.72 }),
    ironDark: new THREE.MeshStandardMaterial({ color: 0x263746, roughness: 0.48, metalness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc93e3e, roughness: 0.74 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2f8fff, roughness: 0.72 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xefb98e, roughness: 0.82 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x704125, roughness: 0.9 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x59636a, roughness: 0.96 }),
    rockDark: new THREE.MeshStandardMaterial({ color: 0x20292e, roughness: 1 }),
    gem: new THREE.MeshStandardMaterial({ color: 0x5cecff, emissive: 0x075f76, emissiveIntensity: 0.72, roughness: 0.18, metalness: 0.12 }),
    marker: new THREE.MeshStandardMaterial({ color: 0xffd93f, emissive: 0x5c3a00, emissiveIntensity: 0.5, roughness: 0.55 }),
  };
  const persistentMaterials = new Set(Object.values(materials));
  const persistentTextures = new Set([grassTexture, stoneTexture, woodTexture, sandTexture]);

  const addMesh = (geometry, material, parent = worldRoot, cast = true, receive = true) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  };

  const box = (x, y, z, w, h, d, material, parent = worldRoot, cast = true, receive = true) => {
    const mesh = addMesh(new THREE.BoxGeometry(w, h, d), material, parent, cast, receive);
    mesh.position.set(x, y, z);
    return mesh;
  };

  const cylinder = (x, y, z, radius, height, material, parent = worldRoot, sides = 12) => {
    const mesh = addMesh(new THREE.CylinderGeometry(radius, radius, height, sides), material, parent);
    mesh.position.set(x, y, z);
    return mesh;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const rounded = (value) => Math.round(value * 100) / 100;
  const seeded = () => {
    state.deterministicSeed = (state.deterministicSeed * 1664525 + 1013904223) >>> 0;
    return state.deterministicSeed / 4294967296;
  };
  const randomRange = (min, max) => min + (max - min) * seeded();
  const SAVE_KEY = "agust-games-war-of-kingdoms-v3";
  const PREVIOUS_SAVE_KEY = "agust-games-war-of-kingdoms-v2";
  const LEGACY_SAVE_KEY = "agust-games-war-of-kingdoms-v1";
  const SAVE_VERSION = 3;
  const LEGACY_FREE_GUARDS = { sword: 4, archer: 4, cavalry: 2 };

  function saveProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: SAVE_VERSION,
        money: state.money,
        diamonds: state.diamonds,
        guards: state.guards,
        towerSlots: state.towerSlots,
        miners: state.miners,
        mineElapsed: state.mineElapsed,
        minePayouts: state.minePayouts,
        kingdoms: state.kingdoms.map((kingdom) => ({
          miners: kingdom.miners,
          money: kingdom.money,
          mineElapsed: kingdom.mineElapsed,
        })),
        pendingMineDefense: state.pendingMineDefense,
      }));
    } catch { /* private browsing may block storage */ }
  }

  function normalizeTowerSlots() {
    let filled = state.towerSlots.filter(Boolean).length;
    for (let i = state.towerSlots.length - 1; i >= 0 && filled > state.guards.archer; i--) {
      if (state.towerSlots[i]) {
        state.towerSlots[i] = false;
        filled--;
      }
    }
  }

  function loadProgress() {
    try {
      let saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      let migratedOlderSave = false;
      let migrateFreeStartingGuards = false;
      if (!saved || typeof saved !== "object") {
        saved = JSON.parse(localStorage.getItem(PREVIOUS_SAVE_KEY) || "null");
        migratedOlderSave = Boolean(saved && typeof saved === "object");
      }
      if (!saved || typeof saved !== "object") {
        saved = JSON.parse(localStorage.getItem(LEGACY_SAVE_KEY) || "null");
        migrateFreeStartingGuards = Boolean(saved && typeof saved === "object");
        migratedOlderSave = migrateFreeStartingGuards;
      }
      if (!saved || typeof saved !== "object") return;
      if (Number.isFinite(saved.money)) state.money = Math.max(0, Math.floor(saved.money));
      if (Number.isFinite(saved.diamonds)) state.diamonds = Math.max(0, Math.floor(saved.diamonds));
      UNIT_TYPES.forEach((type) => {
        if (!Number.isFinite(saved.guards?.[type])) return;
        const savedCount = Math.max(0, Math.floor(saved.guards[type]));
        state.guards[type] = migrateFreeStartingGuards
          ? Math.max(0, savedCount - LEGACY_FREE_GUARDS[type])
          : savedCount;
      });
      if (Array.isArray(saved.towerSlots) && saved.towerSlots.length === 4) state.towerSlots = saved.towerSlots.map(Boolean);
      if (Number.isFinite(saved.miners)) state.miners = clamp(Math.floor(saved.miners), 0, MAX_MINERS);
      if (Number.isFinite(saved.mineElapsed)) state.mineElapsed = clamp(saved.mineElapsed, 0, MINE_PAYOUT_SECONDS);
      if (Number.isFinite(saved.minePayouts)) state.minePayouts = Math.max(0, Math.floor(saved.minePayouts));
      if (Array.isArray(saved.kingdoms)) {
        for (let index = 1; index < state.kingdoms.length; index++) {
          const savedKingdom = saved.kingdoms[index];
          if (!savedKingdom || typeof savedKingdom !== "object") continue;
          if (Number.isFinite(savedKingdom.miners)) state.kingdoms[index].miners = clamp(Math.floor(savedKingdom.miners), 1, MAX_MINERS);
          if (Number.isFinite(savedKingdom.money)) state.kingdoms[index].money = Math.max(0, Math.floor(savedKingdom.money));
          if (Number.isFinite(savedKingdom.mineElapsed)) state.kingdoms[index].mineElapsed = clamp(savedKingdom.mineElapsed, 0, MINE_PAYOUT_SECONDS);
        }
      }
      const pending = saved.pendingMineDefense;
      if (pending && Number.isInteger(pending.attacker) && state.kingdoms[pending.attacker] && !state.kingdoms[pending.attacker].player) {
        state.pendingMineDefense = null;
        const transfer = applyMineTransfer("incoming", pending.attacker, pending.requested);
        state.loadNotice = transfer?.transferred > 0
          ? `FIENDEKUNG ${pending.attacker} STAL ${transfer.transferred} ${transfer.transferred === 1 ? "MINER" : "MINERS"} NÄR GRUVFÖRSVARET AVBRÖTS`
          : `DET AVBRUTNA GRUVFÖRSVARET KOSTADE INGA MINERS`;
      }
      normalizeTowerSlots();
      if (migratedOlderSave) saveProgress();
    } catch { /* an invalid old save is ignored */ }
  }

  function setVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle("is-active", visible);
  }

  function setModal(name, visible) {
    state.modal = visible ? name : null;
    if (visible) {
      clearTimeout(toastTimer);
      setVisible(ui.toast, false);
    }
    const map = { map: ui.map, question: ui.question, selection: ui.selection, shop: ui.shop, outcome: ui.outcome, pause: ui.pause };
    Object.entries(map).forEach(([key, element]) => setVisible(element, visible && key === name));
  }

  function showToast(message, duration = 1800) {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    setVisible(ui.toast, true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setVisible(ui.toast, false), duration);
  }

  function resetJoystickInput() {
    joystick.pointerId = null;
    joystick.x = 0;
    joystick.y = 0;
    if (ui.joystickKnob) ui.joystickKnob.style.transform = "translate(0, 0)";
  }

  function resetControls() {
    Object.keys(keys).forEach((key) => { keys[key] = false; });
    resetJoystickInput();
    resetLookInput();
  }

  function showPersistentGraphicsMessage(message) {
    if (!ui.toast) return;
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    setVisible(ui.toast, true);
  }

  function handleWebGLContextLost(event) {
    event.preventDefault();
    if (contextLost) return;
    contextLost = true;
    pausedBeforeContextLoss = state.paused;
    state.paused = true;
    resetControls();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    showPersistentGraphicsMessage("3D-grafiken pausades. Spelet försöker återställa bilden automatiskt…");
  }

  function handleWebGLContextRestored() {
    if (!contextLost) return;
    try {
      renderer.resetState?.();
      resize();
      contextLost = false;
      state.paused = pausedBeforeContextLoss;
      lastTime = performance.now();
      accumulator = 0;
      render();
      showToast("3D-grafiken är tillbaka!", 2200);
      if (!rafId) rafId = requestAnimationFrame(frame);
    } catch (error) {
      contextLost = true;
      state.paused = true;
      console.error("War of Kingdoms kunde inte återställa WebGL-grafiken.", error);
      showPersistentGraphicsMessage("3D-grafiken kunde inte återställas. Ladda om sidan för att fortsätta.");
    }
  }

  function sfx(kind) {
    if (!soundReady) return;
    try {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      const tones = { click: 520, sword: 180, bow: 650, hit: 95, coin: 880, win: 740, lose: 120 };
      oscillator.frequency.setValueAtTime(tones[kind] || 330, now);
      if (kind === "sword") oscillator.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.17);
    } catch { /* audio is optional */ }
  }

  function enableSound() {
    if (soundReady) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext = new AudioCtor();
    soundReady = true;
  }

  function clearGroup(group) {
    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    const disposedTextures = new Set();
    while (group.children.length) {
      const child = group.children[group.children.length - 1];
      group.remove(child);
      child.traverse?.((node) => {
        if (node.geometry && !disposedGeometries.has(node.geometry)) {
          disposedGeometries.add(node.geometry);
          node.geometry.dispose?.();
        }
        const nodeMaterials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
        nodeMaterials.forEach((material) => {
          if (persistentMaterials.has(material) || disposedMaterials.has(material)) return;
          disposedMaterials.add(material);
          Object.values(material).forEach((value) => {
            if (!value?.isTexture || persistentTextures.has(value) || disposedTextures.has(value)) return;
            disposedTextures.add(value);
            value.dispose?.();
          });
          material.dispose?.();
        });
      });
    }
  }

  function addCollider(x, z, w, d, minY = -1, maxY = 4.2) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY, maxY });
  }

  function crenellations(x, z, w, d, y = 6.8) {
    const step = 2.4;
    if (w > d) {
      for (let px = x - w / 2 + 1; px <= x + w / 2 - 1; px += step) box(px, y, z, 1.15, 1.25, d, materials.stone);
    } else {
      for (let pz = z - d / 2 + 1; pz <= z + d / 2 - 1; pz += step) box(x, y, pz, w, 1.25, 1.15, materials.stone);
    }
  }

  function buildTower(x, z) {
    box(x, 3.2, z, 6.4, 6.4, 6.4, materials.stone);
    box(x, 6.1, z, 7, 0.55, 7, materials.stoneDark);
    crenellations(x, z - 3.1, 7, 0.9, 7.05);
    crenellations(x, z + 3.1, 7, 0.9, 7.05);
    crenellations(x - 3.1, z, 0.9, 7, 7.05);
    crenellations(x + 3.1, z, 0.9, 7, 7.05);
  }

  function buildCastle({ enemy = false } = {}) {
    box(0, -0.35, 0, 37, 0.7, 27, materials.sand, worldRoot, false, true);
    // The rear wall mirrors the front entrance, leaving a real doorway from
    // the courtyard to the mine path instead of sealing the mine outside.
    box(-11.5, 3, -14, 17, 6, 1.5, materials.stone);
    box(11.5, 3, -14, 17, 6, 1.5, materials.stone);
    box(-11.5, 3, 14, 17, 6, 1.5, materials.stone);
    box(11.5, 3, 14, 17, 6, 1.5, materials.stone);
    box(-20, 3, 0, 1.5, 6, 28, materials.stone);
    box(20, 3, 0, 1.5, 6, 28, materials.stone);
    addCollider(-11.5, -14, 17, 1.5);
    addCollider(11.5, -14, 17, 1.5);
    addCollider(-11.5, 14, 17, 1.5);
    addCollider(11.5, 14, 17, 1.5);
    addCollider(-20, 0, 1.5, 28);
    addCollider(20, 0, 1.5, 28);
    crenellations(-11.5, -14, 17, 1.2);
    crenellations(11.5, -14, 17, 1.2);
    crenellations(-11.5, 14, 17, 1.2);
    crenellations(11.5, 14, 17, 1.2);
    crenellations(-20, 0, 1.2, 28);
    crenellations(20, 0, 1.2, 28);

    [[-20, -14], [20, -14], [-20, 14], [20, 14]].forEach(([x, z]) => buildTower(x, z));

    box(0, 5.2, -11.8, 34, 0.6, 3.2, materials.stoneDark);
    box(0, 5.2, 11.8, 34, 0.6, 3.2, materials.stoneDark);
    box(-17.8, 5.2, 0, 3.2, 0.6, 21, materials.stoneDark);
    box(17.8, 5.2, 0, 3.2, 0.6, 21, materials.stoneDark);

    for (let i = 0; i < 10; i++) {
      const z = 6.7 - i * 0.95;
      const y = 0.25 + i * 0.52;
      box(15.1, y, z, 3.2, 0.5, 1.05, materials.stoneDark);
    }

    // A stone lintel and two open wooden door leaves make the rear opening
    // read as a castle door while keeping the middle clear to walk through.
    box(0, 5.15, -14, CASTLE_GATE_WIDTH, 1.7, 1.5, materials.stone);
    box(-2.82, 2.05, -12.7, 0.24, 4.1, 2.45, materials.wood);
    box(2.82, 2.05, -12.7, 0.24, 4.1, 2.45, materials.wood);
    for (const x of [-2.82, 2.82]) {
      box(x, 2.05, -12.08, 0.29, 0.14, 1.05, materials.ironDark);
      box(x, 2.05, -13.32, 0.29, 0.14, 1.05, materials.ironDark);
      addCollider(x, -12.7, 0.24, 2.45);
    }

    // The second drawbridge crosses the rear moat and meets the mine road.
    box(REAR_DRAWBRIDGE.x, 0.15, REAR_DRAWBRIDGE.z, REAR_DRAWBRIDGE.width, 0.35, REAR_DRAWBRIDGE.length, materials.wood, worldRoot, true, true);
    for (let z = -27; z <= -14; z += 1.25) box(0, 0.4, z, 6.3, 0.18, 0.12, materials.woodDark);
    box(-3.15, 1, REAR_DRAWBRIDGE.z, 0.22, 1.8, REAR_DRAWBRIDGE.length, materials.woodDark);
    box(3.15, 1, REAR_DRAWBRIDGE.z, 0.22, 1.8, REAR_DRAWBRIDGE.length, materials.woodDark);

    box(0, 0.15, 20.5, 6, 0.35, 14, materials.wood, worldRoot, true, true);
    for (let z = 14.4; z <= 27; z += 1.25) box(0, 0.4, z, 6.3, 0.18, 0.12, materials.woodDark);
    box(-3.15, 1, 20.5, 0.22, 1.8, 14, materials.woodDark);
    box(3.15, 1, 20.5, 0.22, 1.8, 14, materials.woodDark);

    box(-13.5, -0.25, 19.5, 13, 0.45, 13, materials.water, worldRoot, false, true);
    box(13.5, -0.25, 19.5, 13, 0.45, 13, materials.water, worldRoot, false, true);
    box(0, -0.25, -19.5, 53, 0.45, 10, materials.water, worldRoot, false, true);
    box(-24.5, -0.25, 0, 8, 0.45, 29, materials.water, worldRoot, false, true);
    box(24.5, -0.25, 0, 8, 0.45, 29, materials.water, worldRoot, false, true);

    const bannerMaterial = enemy ? new THREE.MeshStandardMaterial({ color: 0xb83c3c, roughness: 0.75 }) : materials.blue;
    box(0, 4.9, 13.15, 2.3, 3.8, 0.12, bannerMaterial);
    const crown = addMesh(new THREE.ConeGeometry(0.85, 0.8, 5), materials.gold);
    crown.position.set(0, 5.35, 12.95);
    crown.rotation.x = Math.PI / 2;

    buildMapTable(!enemy);
    buildBed(!enemy);
    buildTowerMarkers(!enemy);
  }

  function buildMapTable(interactive = true) {
    box(0, 0.72, 0, 4.8, 0.28, 3.6, materials.wood);
    [[-1.8, -1.25], [1.8, -1.25], [-1.8, 1.25], [1.8, 1.25]].forEach(([x, z]) => box(x, 0.35, z, 0.35, 0.75, 0.35, materials.woodDark));
    const mapMaterial = new THREE.MeshStandardMaterial({ color: 0xe7d69d, roughness: 0.92 });
    box(0, 0.9, 0, 3.8, 0.04, 2.65, mapMaterial, worldRoot, false, true);
    if (interactive) interactables.push({ kind: "map", x: 0, z: 0, radius: 3.2, label: "ÖPPNA KARTAN" });
  }

  function buildBed(interactive = true) {
    box(-13.2, 0.45, 1.2, 4.2, 0.8, 7, materials.woodDark);
    box(-13.2, 0.92, 1.2, 3.7, 0.35, 6.3, new THREE.MeshStandardMaterial({ color: 0x3d78c4, roughness: 0.9 }));
    box(-13.2, 1.15, -1.2, 3.6, 0.42, 1.25, new THREE.MeshStandardMaterial({ color: 0xf4ead3, roughness: 0.95 }));
    if (interactive) interactables.push({ kind: "bed", x: -13.2, z: 1.2, radius: 3.1, label: "SOV I SÄNGEN" });
  }

  function buildTowerMarkers(interactive = true) {
    const positions = [[-20, -14], [20, -14], [-20, 14], [20, 14]];
    positions.forEach(([x, z], index) => {
      const marker = cylinder(x, 5.58, z, 1.15, 0.18, materials.marker, worldRoot, 12);
      marker.userData.slot = index;
      towerMarkers.push(marker);
      if (interactive) interactables.push({ kind: "tower", x, z, y: 5.2, radius: 2.7, slot: index, label: "PLACERA BÅGSKYTT" });
    });
  }

  function buildHouse(x, z, color, rotation = 0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    worldRoot.add(group);
    const wall = new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
    box(0, 2.1, 0, 7, 4.2, 6, wall, group);
    const roof = addMesh(new THREE.ConeGeometry(5.1, 2.6, 4), new THREE.MeshStandardMaterial({ color: 0x8f402d, roughness: 0.86 }), group);
    roof.position.y = 5;
    roof.rotation.y = Math.PI / 4;
    box(0, 1.15, 3.02, 1.5, 2.3, 0.18, materials.woodDark, group);
    box(-2.1, 2.35, 3.04, 1.3, 1.25, 0.12, new THREE.MeshStandardMaterial({ color: 0x5bc9e9, roughness: 0.25, metalness: 0.05 }), group);
    addCollider(x, z, 7, 6);
  }

  function buildTree(x, z, scale = 1) {
    cylinder(x, 1.55 * scale, z, 0.45 * scale, 3.1 * scale, materials.leather, worldRoot, 8);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x48b14f, roughness: 0.94 });
    [[0, 3.8, 0], [-0.8, 3.4, 0.2], [0.8, 3.5, -0.1]].forEach(([dx, y, dz]) => {
      const crown = addMesh(new THREE.IcosahedronGeometry(1.65 * scale, 1), leafMat);
      crown.position.set(x + dx * scale, y * scale, z + dz * scale);
    });
  }

  function buildMine({ enemy = false, showWorkers = true } = {}) {
    const targetKingdom = state.mineRaid?.target ?? state.stealth?.target ?? 1;
    const minerCount = enemy ? state.kingdoms[targetKingdom]?.miners || 1 : state.miners;
    box(0, -0.42, -38.25, 28, 0.72, 24.5, materials.rockDark, worldRoot, false, true);
    box(0, 0.02, -34, 5.8, 0.08, 15, materials.sand, worldRoot, false, true);

    const opening = box(0, 2.35, -45.2, 5.2, 4.7, 0.42, materials.rockDark, worldRoot, false, false);
    opening.castShadow = false;
    const rockSpots = [
      [-5.7, 1.7, -44.9, 3.7], [-3.5, 3.7, -45.1, 3.2], [0, 5.2, -45.2, 3.7],
      [3.5, 3.7, -45.1, 3.2], [5.7, 1.7, -44.9, 3.7], [-8, 0.8, -44, 3.2], [8, 0.8, -44, 3.2],
    ];
    rockSpots.forEach(([x, y, z, scale], index) => {
      const rock = addMesh(new THREE.IcosahedronGeometry(scale, 1), index % 2 ? materials.rock : materials.stoneDark);
      rock.position.set(x, y, z);
      rock.scale.set(1.1, 0.85 + (index % 3) * 0.08, 0.78);
      rock.rotation.set(index * 0.19, index * 0.37, index * 0.11);
    });

    box(-2.65, 2.25, -44.65, 0.42, 4.5, 0.42, materials.woodDark);
    box(2.65, 2.25, -44.65, 0.42, 4.5, 0.42, materials.woodDark);
    box(0, 4.45, -44.65, 5.7, 0.42, 0.42, materials.woodDark);
    addCollider(-6, -44.3, 6.8, 4.2);
    addCollider(6, -44.3, 6.8, 4.2);
    addCollider(0, -45.25, 5.4, 0.7);
    for (const x of [-1.25, 1.25]) box(x, 0.12, -37.4, 0.12, 0.13, 12.5, materials.ironDark);
    for (let z = -43.2; z <= -31.4; z += 1.15) box(0, 0.08, z, 3.2, 0.1, 0.2, materials.woodDark);

    const cart = new THREE.Group();
    cart.position.set(5.2, 0, -34.8);
    worldRoot.add(cart);
    box(0, 0.85, 0, 2.5, 1.15, 1.65, materials.wood, cart);
    for (const x of [-0.83, 0.83]) for (const z of [-0.65, 0.65]) {
      const wheel = cylinder(x, 0.28, z, 0.32, 0.16, materials.ironDark, cart, 12);
      wheel.rotation.z = Math.PI / 2;
    }
    for (let i = 0; i < 7; i++) {
      const nuggetMaterial = i === 5 ? materials.gold : i === 6 ? materials.gem : materials.rock;
      const nuggetGeometry = i === 6 ? new THREE.OctahedronGeometry(0.34, 0) : new THREE.DodecahedronGeometry(0.22 + (i % 3) * 0.05, 0);
      const nugget = addMesh(nuggetGeometry, nuggetMaterial, cart);
      nugget.position.set(-0.85 + (i % 4) * 0.55, 1.48 + (i % 2) * 0.16, -0.45 + Math.floor(i / 4) * 0.75);
    }
    addCollider(5.2, -34.8, 2.8, 2);

    for (let index = 0; index < minerCount && showWorkers; index++) {
      const [x, z] = MINE_WORKER_SPOTS[index];
      const data = { id: `${enemy ? "enemy" : "home"}-miner-${index}`, team: enemy ? 1 : 0, type: "miner", x, z, hp: 100, alive: true, color: enemy ? KINGDOM_COLORS[targetKingdom] : 0xc58832 };
      const model = makeActor(data);
      model.rotation.y = index % 2 ? 0.22 : -0.22;
      minerVisuals.push({ data, model, phase: index * 0.83, enemy });
    }

    interactables.push({ kind: "mine", x: 0, z: -34.5, radius: 5.5, label: `${enemy ? "FIENDENS GRUVA" : "GRUVAN"} · ${minerCount}/${MAX_MINERS} MINERS` });
  }

  function buildVillage() {
    box(0, -0.45, 48, 70, 0.8, 45, materials.grass, worldRoot, false, true);
    box(0, 0.01, 43, 7, 0.08, 42, materials.sand, worldRoot, false, true);
    buildHouse(-12, 39, 0xf0c15b, 0);
    buildHouse(12, 39, 0xd46a56, 0);
    buildHouse(-15, 55, 0x6b9ed5, Math.PI);
    buildHouse(15, 55, 0x9d78cb, Math.PI);
    buildHouse(-27, 48, 0xe28c49, Math.PI / 2);
    buildHouse(27, 48, 0x64b987, -Math.PI / 2);
    [[-6, 33], [7, 35], [-8, 51], [7, 53], [-22, 36], [22, 58]].forEach(([x, z], index) => buildTree(x, z, 0.8 + (index % 2) * 0.12));

    box(7.5, 0.55, 29.5, 7.2, 1.1, 3.2, materials.wood);
    box(7.5, 2.9, 30.7, 8.4, 0.4, 1.4, materials.red);
    box(4.1, 1.7, 30.7, 0.35, 3.2, 0.35, materials.woodDark);
    box(10.9, 1.7, 30.7, 0.35, 3.2, 0.35, materials.woodDark);
    interactables.push({ kind: "shop", x: 7.5, z: 28.5, radius: 3.5, label: "ÖPPNA AFFÄREN" });

    if (state.phase === "day") {
      const villagerSpots = [[-5, 37], [5, 41], [-11, 50], [11, 50], [0, 58], [-21, 47], [21, 44]];
      villagerSpots.forEach(([x, z], index) => {
        const villager = makeActor({ id: `villager-${index}`, team: 0, type: "villager", x, z, hp: 100, alive: true, color: [0x54a7d8, 0xe38b4a, 0x7abf5f, 0xc970a0][index % 4] });
        villager.userData.homeVisual = true;
        homeGuardVisuals.push({ data: { id: `villager-${index}`, x, z, type: "villager", alive: true }, model: villager, villager: true });
      });
    }
  }

  function buildSkyDecor() {
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf3fbff, roughness: 0.96 });
    [[-35, 25, -50], [15, 29, -65], [42, 24, -30], [-18, 32, 18], [48, 30, 42]].forEach(([x, y, z], index) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      worldRoot.add(group);
      for (let i = 0; i < 5; i++) {
        const puff = addMesh(new THREE.IcosahedronGeometry(2.2 + (i % 2) * 0.55, 1), cloudMat, group, false, false);
        puff.position.set((i - 2) * 2.4, Math.sin(i * 1.7) * 0.8, 0);
      }
      group.userData.cloud = index;
    });
  }

  function buildHomeWorld(enemy = false) {
    box(0, -0.65, 12, 110, 1.2, 125, materials.grass, worldRoot, false, true);
    buildCastle({ enemy });
    buildVillage();
    buildSkyDecor();
    buildMine({ enemy, showWorkers: state.scene !== "mineRaid" });
    if (!enemy) buildHomeGuards();
  }

  function buildArena() {
    box(0, -0.45, 0, 50, 0.8, 68, materials.grass, worldRoot, false, true);
    box(0, 0.02, 0, 12, 0.12, 68, materials.sand, worldRoot, false, true);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x64a852, roughness: 0.96 });
    const leftHill = addMesh(new THREE.CylinderGeometry(9, 13, 8, 12, 1, false, 0, Math.PI), hillMat);
    leftHill.position.set(-24, 3.5, 0);
    leftHill.rotation.z = Math.PI / 2;
    const rightHill = leftHill.clone();
    rightHill.position.x = 24;
    rightHill.rotation.z = -Math.PI / 2;
    rightHill.castShadow = rightHill.receiveShadow = true;
    worldRoot.add(rightHill);
    for (let z = -29; z <= 29; z += 7) {
      buildTree(-17.5, z, 0.65);
      buildTree(17.5, z + 2, 0.65);
    }
    buildArenaGate(34.8, 0);
    buildArenaGate(-34.8, state.battle?.target || 1);
    // The hills stay climbable, but their high outer faces block arrows.
    addCollider(-23.2, 0, 4.8, 68, 2.2, 8.5);
    addCollider(23.2, 0, 4.8, 68, 2.2, 8.5);
    buildSkyDecor();
  }

  function buildArenaGate(z, kingdom) {
    const color = new THREE.MeshStandardMaterial({ color: KINGDOM_COLORS[kingdom], roughness: 0.74 });
    box(-11.5, 3, z, 17, 6, 1.4, materials.stone);
    box(11.5, 3, z, 17, 6, 1.4, materials.stone);
    addCollider(-11.5, z, 17, 1.4, -1, 6.4);
    addCollider(11.5, z, 17, 1.4, -1, 6.4);
    buildTower(-20, z);
    buildTower(20, z);
    addCollider(-20, z, 6.4, 6.4, -1, 7.4);
    addCollider(20, z, 6.4, 6.4, -1, 7.4);
    crenellations(-11.5, z, 17, 1.1);
    crenellations(11.5, z, 17, 1.1);
    box(0, 4.7, z + (z > 0 ? -0.78 : 0.78), 2.2, 3.2, 0.12, color);
  }

  function buildAbandonedSegmentedWall(orientation, fixed, start, end, gaps, material) {
    const orderedGaps = gaps
      .map((gap) => ({ start: Math.max(start, gap.center - gap.width / 2), end: Math.min(end, gap.center + gap.width / 2), ...gap }))
      .filter((gap) => gap.end > start && gap.start < end)
      .sort((a, b) => a.start - b.start);
    let cursor = start;
    const addSegment = (segmentStart, segmentEnd) => {
      const length = segmentEnd - segmentStart;
      if (length <= 0.08) return;
      const middle = (segmentStart + segmentEnd) / 2;
      if (orientation === "horizontal") {
        box(middle, 3, fixed, length, 6, 0.48, material);
        addCollider(middle, fixed, length, 0.48, -0.2, 6.2);
      } else {
        box(fixed, 3, middle, 0.48, 6, length, material);
        addCollider(fixed, middle, 0.48, length, -0.2, 6.2);
      }
      abandonedWallSegmentsBuilt++;
    };
    orderedGaps.forEach((gap) => {
      addSegment(cursor, Math.max(cursor, gap.start));
      const openingCenter = clamp(gap.center, start, end);
      const openingWidth = Math.min(gap.width, end - start);
      if (orientation === "horizontal") box(openingCenter, 5.45, fixed, openingWidth, 1.1, 0.55, material);
      else box(fixed, 5.45, openingCenter, 0.55, 1.1, openingWidth, material);
      cursor = Math.max(cursor, gap.end);
    });
    addSegment(cursor, end);
  }

  function buildAbandonedRoom(room, abandonedStone, abandonedFloor) {
    const doors = { north: [], south: [], east: [], west: [] };
    const skippedSides = new Set();
    if (room.type === "large") {
      skippedSides.add(room.side > 0 ? "west" : "east");
      doors[room.side > 0 ? "east" : "west"].push(
        { center: room.z - 4, width: 2.8 },
        { center: room.z + 4, width: 2.8 },
      );
      doors.north.push({ center: room.x, width: 2.8 });
      doors.south.push({ center: room.x, width: 2.8 });
    } else if (room.position === "outerNorth" || room.position === "outerSouth") {
      const wing = ABANDONED_WINGS[room.wing - 1];
      skippedSides.add(wing.side > 0 ? "west" : "east");
    } else if (room.position === "north") skippedSides.add("south");
    else if (room.position === "south") skippedSides.add("north");

    const minX = room.x - room.width / 2;
    const maxX = room.x + room.width / 2;
    const minZ = room.z - room.depth / 2;
    const maxZ = room.z + room.depth / 2;
    const roomFloor = room.type === "large"
      ? new THREE.MeshStandardMaterial({ color: [0x765a48, 0x526473, 0x5d5549, 0x63506b, 0x4b665b, 0x6b5548, 0x505e72][room.wing - 1], roughness: 0.93 })
      : abandonedFloor;
    box(room.x, -0.18, room.z, room.width - 0.35, 0.34, room.depth - 0.35, roomFloor, worldRoot, false, true);
    box(room.x, 6.22, room.z, room.width, 0.44, room.depth, materials.rockDark, worldRoot, false, true);
    if (!skippedSides.has("north")) buildAbandonedSegmentedWall("horizontal", minZ, minX, maxX, doors.north, abandonedStone);
    if (!skippedSides.has("south")) buildAbandonedSegmentedWall("horizontal", maxZ, minX, maxX, doors.south, abandonedStone);
    if (!skippedSides.has("west")) buildAbandonedSegmentedWall("vertical", minX, minZ, maxZ, doors.west, abandonedStone);
    if (!skippedSides.has("east")) buildAbandonedSegmentedWall("vertical", maxX, minZ, maxZ, doors.east, abandonedStone);

    cylinder(room.x, 0.13, room.z, room.type === "large" ? 1.15 : 0.82, 0.26, materials.stoneDark, worldRoot, 12);
    if (room.type === "large") {
      const bannerMaterial = new THREE.MeshStandardMaterial({ color: [0x8b3038, 0x385c85, 0x6c4b83, 0x8a682e, 0x397052, 0x884d6d, 0x445d73][room.wing - 1], roughness: 0.88 });
      const bannerX = room.x + room.side * (room.width / 2 - 0.28);
      box(bannerX, 3.45, room.z, 0.08, 3.7, 4.2, bannerMaterial, worldRoot, false, true);
      for (const dx of [-7.3, 7.3]) for (const dz of [-5.4, 5.4]) {
        cylinder(room.x + dx, 2.8, room.z + dz, 0.42, 5.6, abandonedStone, worldRoot, 10);
        addCollider(room.x + dx, room.z + dz, 0.72, 0.72, -0.2, 5.9);
      }
      const roomLight = new THREE.PointLight([0xffb46b, 0x8fb9ff, 0xc7a2ff, 0xffd27a, 0x8fe1b5, 0xff9fc3, 0x9ec8ff][room.wing - 1], 1.8, 24, 1.8);
      roomLight.position.set(room.x, 4.75, room.z);
      worldRoot.add(roomLight);
      cylinder(room.x, 5.28, room.z, 0.24, 0.42, materials.gold, worldRoot, 8);
    } else {
      const wing = ABANDONED_WINGS[room.wing - 1];
      const awayX = room.position.startsWith("outer") ? wing.side * 2.25 : 0;
      const awayZ = room.position === "north" ? -2.05 : room.position === "south" ? 2.05 : 0;
      box(room.x + awayX, 0.42, room.z + awayZ, 1.85, 0.84, 1.2, room.wing % 2 ? materials.woodDark : materials.stoneDark);
      box(room.x + awayX, 0.9, room.z + awayZ, 1.95, 0.12, 1.3, materials.ironDark);
    }
  }

  function buildAbandonedCastleWorld() {
    abandonedWallSegmentsBuilt = 0;
    const abandonedStone = new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0x72787a, roughness: 0.98 });
    const abandonedFloor = new THREE.MeshStandardMaterial({ color: 0x4c4a46, roughness: 0.97 });
    const runner = new THREE.MeshStandardMaterial({ color: 0x4d1f29, roughness: 0.94 });

    box(0, -0.65, 0, 74, 1.2, 190, materials.rockDark, worldRoot, false, true);
    box(0, -0.18, 0, 9.6, 0.34, 180, abandonedFloor, worldRoot, false, true);
    box(0, 0.015, 0, 3.7, 0.03, 174, runner, worldRoot, false, true);
    box(0, 6.22, 0, 10, 0.44, 180, materials.rockDark, worldRoot, false, true);

    const rightGaps = ABANDONED_WINGS.filter((wing) => wing.side > 0).map((wing) => ({ center: wing.z, width: 3.4 }));
    const leftGaps = ABANDONED_WINGS.filter((wing) => wing.side < 0).map((wing) => ({ center: wing.z, width: 3.4 }));
    buildAbandonedSegmentedWall("vertical", 5, -90, 90, rightGaps, abandonedStone);
    buildAbandonedSegmentedWall("vertical", -5, -90, 90, leftGaps, abandonedStone);
    buildAbandonedSegmentedWall("horizontal", -90, -5, 5, [], abandonedStone);
    buildAbandonedSegmentedWall("horizontal", 90, -5, 5, [{ center: 0, width: 6.4 }], abandonedStone);
    ABANDONED_MAZE_BARRIERS.forEach((barrier) => {
      buildAbandonedSegmentedWall(
        "horizontal",
        barrier.z,
        -5,
        5,
        [{ center: barrier.gapX, width: barrier.gapWidth }],
        abandonedStone,
      );
      // A different rune on each divider helps the player remember turns
      // without revealing which room contains the treasure.
      box(-barrier.gapX, 2.75, barrier.z + 0.28, 0.72, 1.35, 0.08, materials.gold, worldRoot, false, true);
    });

    for (let z = -82; z <= 82; z += 24) {
      const corridorLight = new THREE.PointLight(0xffb36a, 1.25, 18, 2);
      corridorLight.position.set(0, 4.6, z);
      worldRoot.add(corridorLight);
      box(-4.68, 2.75, z, 0.16, 0.85, 0.52, materials.gold, worldRoot, false, true);
      box(4.68, 2.75, z, 0.16, 0.85, 0.52, materials.gold, worldRoot, false, true);
    }

    ABANDONED_ROOMS.forEach((room) => buildAbandonedRoom(room, abandonedStone, abandonedFloor));

    // The enormous castle is reached physically from a forest, across one
    // lowered drawbridge and a moat that surrounds the entire ruin.
    box(0, -0.62, 139, 122, 1.15, 58, materials.grass, worldRoot, false, true);
    box(0, 0.015, 132, 7.2, 0.08, 45, materials.sand, worldRoot, false, true);
    box(-27, -0.27, 103.5, 42, 0.44, 15, materials.water, worldRoot, false, true);
    box(27, -0.27, 103.5, 42, 0.44, 15, materials.water, worldRoot, false, true);
    box(-43, -0.27, 0, 12, 0.44, 192, materials.water, worldRoot, false, true);
    box(43, -0.27, 0, 12, 0.44, 192, materials.water, worldRoot, false, true);
    box(0, -0.27, -102, 98, 0.44, 14, materials.water, worldRoot, false, true);

    box(0, 0.16, 103.5, 7, 0.36, 27, materials.wood, worldRoot, true, true);
    for (let z = 90.5; z <= 116.5; z += 1.25) box(0, 0.42, z, 7.25, 0.16, 0.12, materials.woodDark);
    box(-3.62, 1.05, 103.5, 0.2, 1.8, 27, materials.woodDark);
    box(3.62, 1.05, 103.5, 0.2, 1.8, 27, materials.woodDark);

    buildAbandonedSegmentedWall("horizontal", 92, -33, 33, [{ center: 0, width: 7 }], abandonedStone);
    box(0, 7.25, 92, 8.5, 2.5, 1.1, materials.stoneDark);
    buildTower(-36, 92);
    buildTower(36, 92);
    addCollider(-36, 92, 7, 7, -0.2, 7.5);
    addCollider(36, 92, 7, 7, -0.2, 7.5);

    const forestTrees = [
      [-50, 122, 1.25], [-39, 137, 1.05], [-54, 151, 1.2], [-25, 126, 0.9], [-22, 148, 1.15],
      [50, 122, 1.25], [39, 137, 1.05], [54, 151, 1.2], [25, 126, 0.9], [22, 148, 1.15],
      [-12, 157, 0.92], [13, 158, 1.08], [-46, 158, 0.95], [47, 157, 1.12],
    ];
    forestTrees.forEach(([x, z, scale]) => buildTree(x, z, scale));
    buildSkyDecor();

    const moneyRoom = ABANDONED_ROOMS.find((room) => room.id === ABANDONED_MONEY_ROOM_ID);
    if (moneyRoom && state.abandonedCastleVisit?.treasureAvailable !== false) {
      const moneyX = moneyRoom.x + 2.15;
      const moneyZ = moneyRoom.z;
      abandonedMoneyGroup = new THREE.Group();
      abandonedMoneyGroup.position.set(moneyX, 0, moneyZ);
      worldRoot.add(abandonedMoneyGroup);
      for (let index = 0; index < 18; index++) {
        const coin = cylinder(-0.9 + (index % 6) * 0.34, 0.12 + Math.floor(index / 6) * 0.1, -0.55 + Math.floor(index / 6) * 0.48, 0.17, 0.07, materials.gold, abandonedMoneyGroup, 12);
        coin.rotation.x = Math.PI / 2;
        coin.rotation.z = index * 0.37;
      }
      const gem = addMesh(new THREE.OctahedronGeometry(0.46, 0), materials.gem, abandonedMoneyGroup);
      gem.position.set(0, 0.68, 0);
      interactables.push({ kind: "infiniteMoney", x: moneyX, z: moneyZ, radius: 2.35, label: "SKATTKAMMARE · SAMLA HELA GRUPPEN" });
    }
  }

  function rebuildWorld() {
    clearGroup(worldRoot);
    clearGroup(actorRoot);
    clearGroup(effectRoot);
    colliders.length = 0;
    interactables.length = 0;
    homeGuardVisuals.length = 0;
    minerVisuals.length = 0;
    towerMarkers.length = 0;
    abandonedMoneyGroup = null;
    actorModels.clear();
    if (state.scene === "battle") buildArena();
    else if (state.scene === "abandonedCastle") buildAbandonedCastleWorld();
    else buildHomeWorld(state.scene === "stealth" || state.scene === "mineRaid");
    state.units.forEach((unit) => {
      const model = makeActor(unit);
      actorModels.set(unit.id, model);
    });
    state.loot.forEach((loot) => buildLoot(loot));
    updateLighting(true);
  }

  function makeWeaponModel(type, material = materials.iron, parent = null) {
    const group = new THREE.Group();
    if (parent) parent.add(group);
    if (type === "sword") {
      const blade = box(0, 0.75, 0, 0.14, 1.65, 0.08, material, group);
      blade.rotation.z = -0.08;
      box(0, -0.12, 0, 0.72, 0.12, 0.18, materials.gold, group);
      box(0, -0.48, 0, 0.17, 0.65, 0.18, materials.leather, group);
    } else if (type === "bow") {
      const curve = addMesh(new THREE.TorusGeometry(0.58, 0.055, 7, 20, Math.PI * 1.45), materials.wood, group);
      curve.rotation.z = -Math.PI * 0.73;
      const stringMaterial = new THREE.LineBasicMaterial({ color: 0xe9e4d4 });
      const points = [new THREE.Vector3(-0.42, -0.42, 0), new THREE.Vector3(0.02, 0, 0), new THREE.Vector3(-0.42, 0.42, 0)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), stringMaterial));
    } else if (type === "shield") {
      const shield = cylinder(0, 0, 0, 0.48, 0.12, materials.ironDark, group, 12);
      shield.rotation.x = Math.PI / 2;
      cylinder(0, 0, -0.08, 0.34, 0.08, materials.blue, group, 12).rotation.x = Math.PI / 2;
    } else if (type === "spear") {
      box(0, 0.7, 0, 0.08, 2.4, 0.08, materials.woodDark, group);
      const tip = addMesh(new THREE.ConeGeometry(0.14, 0.5, 5), materials.iron, group);
      tip.position.y = 2.1;
    }
    return group;
  }

  function makeActor(data) {
    const root = new THREE.Group();
    root.position.set(data.x, data.y || 0, data.z);
    actorRoot.add(root);
    const color = data.color ?? KINGDOM_COLORS[data.team || 0];
    const cloth = data.statue ? null : new THREE.MeshStandardMaterial({ color, roughness: 0.76 });
    const darkCloth = data.statue ? null : new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.62), roughness: 0.82 });
    const body = new THREE.Group();
    root.add(body);

    if (data.statue) {
      buildGuardianStatue(body);
    } else if (data.type === "cavalry") {
      const horse = new THREE.Group();
      body.add(horse);
      box(0, 1.05, 0, 1.05, 1.05, 2.15, materials.leather, horse);
      box(0, 1.55, -1.05, 0.62, 1.15, 0.68, materials.leather, horse).rotation.x = -0.25;
      for (const x of [-0.38, 0.38]) for (const z of [-0.65, 0.65]) box(x, 0.37, z, 0.2, 0.9, 0.2, materials.leather, horse);
      const rider = new THREE.Group();
      rider.position.y = 1.55;
      body.add(rider);
      buildHumanoid(rider, cloth, darkCloth, data, 0.82);
      body.userData.leftArm = rider.userData.leftArm;
      body.userData.rightArm = rider.userData.rightArm;
      body.userData.leftLeg = rider.userData.leftLeg;
      body.userData.rightLeg = rider.userData.rightLeg;
      const spear = makeWeaponModel("spear", materials.iron, rider);
      spear.position.set(0.72, 1.2, -0.2);
      spear.rotation.z = -0.28;
      const shield = makeWeaponModel("shield", materials.iron, rider);
      shield.position.set(-0.62, 1.2, -0.18);
    } else {
      buildHumanoid(body, cloth, darkCloth, data, data.type === "villager" ? 0.84 : 1);
    }

    root.userData.body = body;
    root.userData.data = data;
    root.traverse((part) => { if (part.isMesh) { part.castShadow = true; part.receiveShadow = true; } });
    return root;
  }

  function buildGuardianStatue(parent) {
    const torso = box(0, 1.65, 0, 1.16, 1.55, 0.72, materials.stoneDark, parent);
    torso.name = "torso";
    const head = addMesh(new THREE.DodecahedronGeometry(0.47, 0), materials.stone, parent);
    head.position.y = 2.72;
    const helmet = addMesh(new THREE.ConeGeometry(0.55, 0.7, 5), materials.ironDark, parent);
    helmet.position.y = 3.28;
    const leftArm = box(-0.77, 1.62, 0, 0.34, 1.46, 0.38, materials.stoneDark, parent);
    const rightArm = box(0.77, 1.62, 0, 0.34, 1.46, 0.38, materials.stoneDark, parent);
    const leftLeg = box(-0.31, 0.52, 0, 0.42, 1.08, 0.48, materials.rock, parent);
    const rightLeg = box(0.31, 0.52, 0, 0.42, 1.08, 0.48, materials.rock, parent);
    const sword = makeWeaponModel("sword", materials.ironDark, rightArm);
    sword.scale.setScalar(0.78);
    sword.position.set(0, -0.82, -0.24);
    sword.rotation.z = -0.38;
    const shield = makeWeaponModel("shield", materials.ironDark, leftArm);
    shield.scale.setScalar(0.92);
    shield.position.set(-0.08, -0.36, -0.45);
    const eyeGroup = new THREE.Group();
    eyeGroup.name = "statueEyes";
    parent.add(eyeGroup);
    for (const x of [-0.16, 0.16]) {
      const eye = addMesh(new THREE.SphereGeometry(0.055, 7, 5), materials.gem, eyeGroup, false, false);
      eye.position.set(x, 2.77, -0.43);
    }
    parent.userData.leftArm = leftArm;
    parent.userData.rightArm = rightArm;
    parent.userData.leftLeg = leftLeg;
    parent.userData.rightLeg = rightLeg;
    parent.userData.statueEyes = eyeGroup;
  }

  function buildHumanoid(parent, cloth, darkCloth, data, scale = 1) {
    const torso = box(0, 1.45 * scale, 0, 0.92 * scale, 1.28 * scale, 0.54 * scale, cloth, parent);
    torso.name = "torso";
    const head = addMesh(new THREE.SphereGeometry(0.39 * scale, 14, 10), materials.skin, parent);
    head.position.y = 2.38 * scale;
    const helmet = addMesh(new THREE.SphereGeometry(0.405 * scale, 14, 7, 0, TAU, 0, Math.PI / 2), data.king ? materials.gold : materials.ironDark, parent);
    helmet.position.y = 2.45 * scale;
    const leftArm = box(-0.63 * scale, 1.42 * scale, 0, 0.26 * scale, 1.18 * scale, 0.28 * scale, cloth, parent);
    const rightArm = box(0.63 * scale, 1.42 * scale, 0, 0.26 * scale, 1.18 * scale, 0.28 * scale, cloth, parent);
    leftArm.name = "leftArm";
    rightArm.name = "rightArm";
    const leftLeg = box(-0.23 * scale, 0.48 * scale, 0, 0.32 * scale, 0.96 * scale, 0.38 * scale, darkCloth, parent);
    const rightLeg = box(0.23 * scale, 0.48 * scale, 0, 0.32 * scale, 0.96 * scale, 0.38 * scale, darkCloth, parent);
    leftLeg.name = "leftLeg";
    rightLeg.name = "rightLeg";
    if (data.king) {
      const crown = addMesh(new THREE.ConeGeometry(0.34 * scale, 0.46 * scale, 5), materials.gold, parent);
      crown.position.y = 2.94 * scale;
    }
    if (data.type === "sword" || (data.king && data.weapon === "sword")) {
      const sword = makeWeaponModel("sword", materials.iron, rightArm);
      sword.scale.setScalar(0.62 * scale);
      sword.position.set(0, -0.68, -0.2);
      sword.rotation.z = -0.35;
      const shield = makeWeaponModel("shield", materials.iron, leftArm);
      shield.scale.setScalar(0.72 * scale);
      shield.position.set(-0.05, -0.3, -0.38);
    } else if (data.type === "archer" || (data.king && data.weapon === "bow")) {
      const bow = makeWeaponModel("bow", materials.wood, leftArm);
      bow.scale.setScalar(0.82 * scale);
      bow.position.set(-0.05, -0.45, -0.35);
      bow.rotation.y = Math.PI / 2;
    } else if (data.type === "miner") {
      const pickaxe = new THREE.Group();
      rightArm.add(pickaxe);
      pickaxe.position.set(0.02, -0.7, -0.18);
      pickaxe.rotation.z = -0.24;
      box(0, 0.55, 0, 0.09, 1.5, 0.09, materials.woodDark, pickaxe);
      box(0, 1.28, 0, 0.82, 0.12, 0.14, materials.iron, pickaxe);
      const lamp = cylinder(0, 2.62 * scale, -0.31 * scale, 0.12 * scale, 0.16 * scale, materials.gold, parent, 10);
      lamp.rotation.x = Math.PI / 2;
    }
    parent.userData.leftArm = leftArm;
    parent.userData.rightArm = rightArm;
    parent.userData.leftLeg = leftLeg;
    parent.userData.rightLeg = rightLeg;
  }

  const weaponRig = new THREE.Group();
  camera.add(weaponRig);
  weaponRig.position.set(0.53, -0.46, -1.08);
  const hand = addMesh(new THREE.SphereGeometry(0.115, 12, 9), materials.skin, weaponRig, false, false);
  hand.scale.set(1.25, 1.6, 1.1);
  hand.position.set(0.02, -0.05, 0.05);
  const sleeve = cylinder(0.02, -0.22, 0.08, 0.13, 0.36, materials.blue, weaponRig, 10);
  sleeve.rotation.z = -0.15;
  const fpSword = makeWeaponModel("sword", materials.iron, weaponRig);
  fpSword.position.set(0.03, 0.17, -0.04);
  fpSword.scale.setScalar(0.5);
  fpSword.rotation.z = -0.34;
  fpSword.rotation.x = 0.1;
  const fpBow = makeWeaponModel("bow", materials.wood, weaponRig);
  fpBow.position.set(-0.08, 0.17, -0.1);
  fpBow.scale.setScalar(0.56);
  fpBow.rotation.y = Math.PI / 2;
  fpBow.rotation.z = -0.32;
  weaponRig.traverse((part) => {
    part.frustumCulled = false;
    if (!part.isMesh) return;
    part.material = part.material.clone();
    part.material.depthTest = false;
    part.material.depthWrite = false;
    part.renderOrder = 100;
  });

  function makeHomeGuardSpots(total) {
    const spots = [
      [-7, 7], [7, 7], [-9, -5], [9, -5], [-4, 11], [4, 11], [-12, 8], [12, 8],
      [-6, -8], [6, -8], [-15, -2], [15, -2], [-2, 6], [2, 6], [-10, 4], [10, 4],
    ];
    if (total <= spots.length) return spots.slice(0, total);

    const spacing = clamp(Math.sqrt(520 / Math.max(1, total)), 1.05, 2.35);
    for (let z = -10.5; z <= 11 && spots.length < total; z += spacing) {
      for (let x = -16; x <= 16 && spots.length < total; x += spacing) {
        const besideMap = Math.hypot(x, z) < 5.2;
        const besideBed = x < -10.2 && z > -3.2 && z < 5.4;
        const besideStairs = x > 12.2 && z > -3.5 && z < 8;
        const rearDoorRoute = Math.abs(x) < 3.8 && z < -7.5;
        const atPlayerStart = Math.hypot(x, z - 9) < 2.7;
        const tooCloseToPreferredSpot = spots.some(([spotX, spotZ]) => Math.hypot(x - spotX, z - spotZ) < spacing * 0.72);
        if (!besideMap && !besideBed && !besideStairs && !rearDoorRoute && !atPlayerStart && !tooCloseToPreferredSpot) spots.push([x, z]);
      }
    }

    // Extremely large armies are packed more tightly, but every purchased guard still gets a place.
    for (let index = spots.length; index < total; index++) {
      const column = index % 32;
      const row = Math.floor(index / 32) % 22;
      spots.push([-16 + column * (32 / 31), -10.5 + row * (21 / 21)]);
    }
    return spots;
  }

  function buildHomeGuards() {
    const reserved = { sword: 0, archer: 0, cavalry: 0 };
    if (state.scene === "mineDefense") {
      state.units.filter((unit) => unit.team === 0 && unit.alive && UNIT_TYPES.includes(unit.sourceType)).forEach((unit) => reserved[unit.sourceType]++);
    }
    const remaining = Object.fromEntries(UNIT_TYPES.map((type) => [type, Math.max(0, state.guards[type] - reserved[type])]));
    const filledTowerIndices = state.towerSlots.map((filled, index) => filled ? index : -1).filter((index) => index >= 0);
    const visibleTowerIndices = filledTowerIndices.slice(0, remaining.archer);
    const assignedArchers = visibleTowerIndices.length;
    const floorGuardTotal = UNIT_TYPES.reduce((total, type) => total + Math.max(0, remaining[type] - (type === "archer" ? assignedArchers : 0)), 0);
    const spots = makeHomeGuardSpots(floorGuardTotal);
    let spot = 0;
    UNIT_TYPES.forEach((type) => {
      const assigned = type === "archer" ? assignedArchers : 0;
      const count = Math.max(0, remaining[type] - assigned);
      for (let i = 0; i < count; i++) {
        const [x, z] = spots[spot++];
        const data = { id: `home-${type}-${i}`, team: 0, type, x, z, hp: 100, alive: true, color: KINGDOM_COLORS[0] };
        const model = makeActor(data);
        homeGuardVisuals.push({ data, model, villager: false });
      }
    });
    state.towerSlots.forEach((filled, index) => {
      if (!filled || !visibleTowerIndices.includes(index)) return;
      const [x, z] = [[-20, -14], [20, -14], [-20, 14], [20, 14]][index];
      const data = { id: `tower-${index}`, team: 0, type: "archer", x, z, y: 5.55, hp: 100, alive: true, color: KINGDOM_COLORS[0] };
      const model = makeActor(data);
      homeGuardVisuals.push({ data, model, villager: false, tower: true });
    });
  }

  function buildLoot(loot) {
    const material = loot.kind === "diamond"
      ? new THREE.MeshStandardMaterial({ color: 0x4fe8ff, emissive: 0x08768e, emissiveIntensity: 0.9, roughness: 0.18, metalness: 0.18 })
      : materials.gold;
    const mesh = loot.kind === "diamond"
      ? addMesh(new THREE.OctahedronGeometry(0.48, 0), material, effectRoot)
      : cylinder(loot.x, 0.45, loot.z, 0.42, 0.14, material, effectRoot, 16);
    if (loot.kind === "diamond") mesh.position.set(loot.x, 0.7, loot.z);
    mesh.userData.lootId = loot.id;
    loot.mesh = mesh;
  }

  function resetPlayerForHome() {
    Object.assign(state.player, { x: 0, y: 0, z: 9, yaw: 0, pitch: 0, hp: 100, alive: true, attackCooldown: 0, swing: 0, abandonedDamagedAt: null, abandonedHealSecondsRemaining: 0 });
  }

  function startGame() {
    enableSound();
    state.screen = "playing";
    state.scene = "home";
    state.paused = false;
    setVisible(ui.menu, false);
    setVisible(ui.hud, true);
    setVisible(ui.touch, touchDevice);
    setVisible(ui.pauseButton, true);
    resetPlayerForHome();
    rebuildWorld();
    canvas.focus();
    const startNotice = state.loadNotice;
    state.loadNotice = "";
    showToast(startNotice || "VÄLKOMMEN, ERS MAJESTÄT!", startNotice ? 3400 : 2200);
    updateHud();
    sfx("click");
  }

  function availableGuards(type) {
    if (type !== "archer") return state.guards[type];
    return Math.max(0, state.guards.archer - state.towerSlots.filter(Boolean).length);
  }

  function selectionAvailable(type, selection = state.selection) {
    if (type === "archer" && ["attack", "stealth", "mineRaid", "mineDefense", "abandonedCastle"].includes(selection?.kind)) return state.guards.archer;
    return availableGuards(type);
  }

  function showQuestion(title, text, yes, no, yesLabel = "JA", noLabel = "NEJ", options = {}) {
    state.question = { yes, no, back: options.back || null };
    if (ui.questionTitle) ui.questionTitle.textContent = title;
    if (ui.questionText) ui.questionText.textContent = text;
    if (ui.questionYes) ui.questionYes.textContent = yesLabel;
    if (ui.questionNo) ui.questionNo.textContent = noLabel;
    if (ui.question) ui.question.dataset.mode = options.mode || "confirm";
    ui.questionActions?.classList.toggle("mission-choice", options.mode === "mission");
    if (ui.questionBack) {
      ui.questionBack.textContent = options.backLabel || "TILLBAKA";
      setVisible(ui.questionBack, Boolean(options.back));
    }
    setModal("question", true);
  }

  function answerQuestion(answer) {
    const question = state.question;
    state.question = null;
    setModal(null, false);
    sfx("click");
    if (!question) return;
    (answer ? question.yes : question.no)?.();
  }

  function backQuestion() {
    const question = state.question;
    state.question = null;
    setModal(null, false);
    question?.back?.();
  }

  function openWorldMap() {
    if (state.scene !== "home") return;
    populateMap();
    setModal("map", true);
    sfx("click");
  }

  function kingdomAtEnemyWar(index) {
    return Boolean(state.enemyWar && [state.enemyWar.attacker, state.enemyWar.defender].includes(index));
  }

  function startEnemyWar(attackerOverride = null, defenderOverride = null, durationOverride = 45) {
    if (state.phase !== "day" || state.enemyWar || state.enemyWarTriggered) return false;
    let attacker = Number.isInteger(attackerOverride) ? clamp(attackerOverride, 1, 6) : 1 + Math.floor(seeded() * 6);
    let defender = Number.isInteger(defenderOverride) ? clamp(defenderOverride, 1, 6) : null;
    if (!defender || defender === attacker) {
      const offset = 1 + Math.floor(seeded() * 5);
      defender = 1 + ((attacker - 1 + offset) % 6);
    }
    const duration = clamp(Number(durationOverride) || 45, 5, 120);
    state.enemyWar = { attacker, defender, duration, remaining: duration, day: state.day };
    state.enemyWarTriggered = true;
    if (state.modal === "map") populateMap();
    showToast(`FIENDEKUNG ${attacker} OCH FIENDEKUNG ${defender} HAR STARTAT KRIG!`, 2800);
    return true;
  }

  function finishEnemyWar(announce = true) {
    const war = state.enemyWar;
    if (!war) return false;
    state.enemyWar = null;
    if (state.modal === "map") populateMap();
    if (announce) showToast(`KRIGET MELLAN RIKE ${war.attacker} OCH RIKE ${war.defender} ÄR SLUT`, 2300);
    return true;
  }

  function updateEnemyWar(dt) {
    if (state.phase !== "day") return;
    if (state.enemyWar) {
      state.enemyWar.remaining = Math.max(0, state.enemyWar.remaining - dt);
      if (state.enemyWar.remaining <= 0) finishEnemyWar();
      return;
    }
    if (!state.enemyWarTriggered && state.phaseElapsed >= state.enemyWarAt && !state.modal) startEnemyWar();
  }

  function populateMap() {
    if (!ui.mapGrid) return;
    ui.mapGrid.replaceChildren();
    state.kingdoms.forEach((kingdom) => {
      const button = document.createElement("button");
      button.type = "button";
      const atWar = kingdomAtEnemyWar(kingdom.index);
      const warOpponent = atWar
        ? state.enemyWar.attacker === kingdom.index ? state.enemyWar.defender : state.enemyWar.attacker
        : null;
      button.className = `kingdom-node${kingdom.player ? " player-kingdom" : " enemy-kingdom"}${atWar ? " kingdom-at-war" : ""}`;
      button.dataset.kingdom = String(kingdom.index);
      if (atWar) button.setAttribute("aria-disabled", "true");
      const miners = kingdom.player ? state.miners : kingdom.miners;
      const minerLabel = miners === 1 ? "MINER" : "MINERS";
      const archerLabel = kingdom.towerArchers === 1 ? "TORNSKYTT" : "TORNSKYTTAR";
      button.setAttribute("aria-label", kingdom.player
        ? `Din borg, du har ${miners} ${minerLabel.toLowerCase()}`
        : atWar
          ? `Fiendeborg ${kingdom.index} är i krig mot rike ${warOpponent} och kan inte attackeras nu`
          : `Fiendeborg ${kingdom.index}, ${miners} ${minerLabel.toLowerCase()}, ${kingdom.towerArchers} ${archerLabel.toLowerCase()}`);
      button.innerHTML = kingdom.player
        ? `<span class="castle-symbol" aria-hidden="true">♜</span><strong>DIN BORG</strong><small>DU ÄR HÄR · ${miners} ${minerLabel}</small>`
        : `<span class="castle-symbol" aria-hidden="true">♜</span><strong>FIENDEBORG ${kingdom.index}</strong>${atWar ? `<span class="war-badge">⚔ KRIG MOT RIKE ${warOpponent}</span>` : ""}<small class="kingdom-stats"><span class="kingdom-stat">⛏ ${miners} ${minerLabel}</span><span class="kingdom-stat">➶ ${kingdom.towerArchers} ${archerLabel}</span></small>`;
      button.addEventListener("click", () => chooseKingdom(kingdom.index));
      ui.mapGrid.append(button);
    });
    const abandoned = document.createElement("button");
    abandoned.type = "button";
    abandoned.className = "kingdom-node abandoned-castle";
    abandoned.dataset.castle = ABANDONED_CASTLE.id;
    abandoned.setAttribute("aria-label", "Utforska det övergivna jätteslottet med 7 stora rum, 28 små rum och 35 levande statyer. Högst 10 vakter får följa med.");
    abandoned.innerHTML = `
      <span class="abandoned-castle-art" aria-hidden="true"></span>
      <strong>${ABANDONED_CASTLE.name}</strong>
      <small class="abandoned-castle-details">
        <span>LIKA STORT SOM 7 SLOTT</span>
        <span>UTFORSKA 35 RUM · MAX 10 VAKTER</span>
      </small>`;
    abandoned.addEventListener("click", () => openSelection("abandonedCastle", null, ABANDONED_MAX_GUARDS, false));
    ui.mapGrid.append(abandoned);
  }

  function showNightMissionChoice(index) {
    showQuestion(
      "VÄLJ NATTLIGT UPPDRAG",
      `Fienderike ${index} har ${state.kingdoms[index].miners} miners. Smyg till borgen efter skatter eller gör en räd mot gruvan.`,
      () => openSelection("stealth", index, 5, false),
      () => openSelection("mineRaid", index, 5, false),
      "SMYGUPPDRAG",
      "GRUVUPPDRAG",
      { mode: "mission", back: openWorldMap, backLabel: "TILLBAKA TILL KARTAN" },
    );
  }

  function chooseKingdom(index) {
    if (index === 0) {
      showToast("DET HÄR ÄR DIN EGEN BORG");
      return;
    }
    if (kingdomAtEnemyWar(index)) {
      const opponent = state.enemyWar.attacker === index ? state.enemyWar.defender : state.enemyWar.attacker;
      showToast(`FIENDEBORG ${index} ÄR REDAN I KRIG MOT RIKE ${opponent}`);
      return;
    }
    setModal(null, false);
    if (state.phase === "day") {
      showQuestion(
        "VILL DU ATTACKERA?",
        `Fiendeborg ${index} försvaras av en kung och 20 vakter.`,
        () => openSelection("attack", index, 20, false),
        () => openWorldMap(),
      );
    } else {
      showNightMissionChoice(index);
    }
  }

  function openSelection(kind, target, max, incoming = false) {
    const counts = { sword: 0, archer: 0, cavalry: 0 };
    const minimums = { sword: 0, archer: 0, cavalry: 0 };
    if (kind === "attack" && incoming) {
      minimums.archer = Math.min(state.towerSlots.filter(Boolean).length, max, state.guards.archer);
      counts.archer = minimums.archer;
    }
    if (kind === "stealth") {
      UNIT_TYPES.forEach((type) => { counts[type] = Math.min(state.quickStealth[type], availableGuards(type)); });
      while (Object.values(counts).reduce((sum, value) => sum + value, 0) > max) {
        const type = UNIT_TYPES.find((candidate) => counts[candidate] > 0);
        if (!type) break;
        counts[type]--;
      }
    }
    state.selection = { kind, target, max, counts, minimums, incoming };
    if (ui.selectionTitle) {
      ui.selectionTitle.textContent = kind === "attack"
        ? "VÄLJ DIN ARMÉ"
        : kind === "abandonedCastle"
          ? "VÄLJ GRUPP TILL JÄTTESLOTTET"
        : kind === "stealth"
          ? "VÄLJ SMYGGRUPP"
          : kind === "mineDefense"
            ? "FÖRSVARA GRUVAN"
            : "VÄLJ GRUVGRUPP";
    }
    if (ui.selectionCopy) {
      ui.selectionCopy.textContent = kind === "attack"
        ? "Högst 20 av dina egna vakter får följa med."
        : kind === "abandonedCastle"
          ? "Högst tio egna vakter får följa med in bland de 35 levande statyerna. Du får också gå ensam."
        : kind === "mineDefense"
          ? "En fiendekung anfaller din gruva. Välj högst fem vakter som försvar."
          : kind === "mineRaid"
            ? "Högst fem vakter får följa med för att besegra gruvans försvar och stjäla miners."
            : "Högst fem vakter. Du får också gå helt ensam.";
    }
    if (ui.selectionConfirm) {
      ui.selectionConfirm.textContent = kind === "attack"
        ? "STARTA KRIGET"
        : kind === "abandonedCastle"
          ? "UTFORSKA JÄTTESLOTTET"
        : kind === "stealth"
          ? "STARTA SMYGUPPDRAG"
          : kind === "mineDefense"
            ? "FÖRSVARA GRUVAN"
            : "STARTA GRUVUPPDRAG";
    }
    if (ui.selectionCancel) ui.selectionCancel.textContent = incoming ? "STRID UTAN FLER VAKTER" : "TILLBAKA";
    updateSelectionUi();
    setModal("selection", true);
  }

  function updateSelectionUi() {
    const selection = state.selection;
    if (!selection) return;
    UNIT_TYPES.forEach((type) => {
      const count = selection.counts[type];
      const available = selectionAvailable(type, selection);
      const countNode = $(`[data-unit-count="${type}"]`);
      const availableNode = $(`[data-unit-available="${type}"]`);
      if (countNode) countNode.textContent = String(count);
      if (availableNode) availableNode.textContent = `AV ${available}`;
      $$(`[data-unit="${type}"][data-delta]`).forEach((button) => {
        const delta = Number(button.dataset.delta);
        const total = Object.values(selection.counts).reduce((sum, value) => sum + value, 0);
        button.disabled = delta > 0
          ? count >= available || total >= selection.max
          : count <= (selection.minimums?.[type] || 0);
      });
    });
    const total = Object.values(selection.counts).reduce((sum, value) => sum + value, 0);
    if (ui.selectionTotal) ui.selectionTotal.textContent = `${total} / ${selection.max}`;
  }

  function adjustSelection(type, delta) {
    const selection = state.selection;
    if (!selection || !UNIT_TYPES.includes(type)) return;
    const total = Object.values(selection.counts).reduce((sum, value) => sum + value, 0);
    const available = selectionAvailable(type, selection);
    if (delta > 0 && (selection.counts[type] >= available || total >= selection.max)) return;
    selection.counts[type] = clamp(selection.counts[type] + delta, selection.minimums?.[type] || 0, available);
    updateSelectionUi();
    sfx("click");
  }

  function confirmSelection() {
    const selection = state.selection;
    if (!selection) return;
    state.selection = null;
    setModal(null, false);
    if (selection.kind === "attack") startBattle(selection.target, selection.counts, selection.incoming);
    else if (selection.kind === "abandonedCastle") startAbandonedCastle(selection.counts);
    else if (selection.kind === "stealth") startStealth(selection.target, selection.counts);
    else if (selection.kind === "mineRaid") startMineRaid(selection.target, selection.counts);
    else if (selection.kind === "mineDefense") startMineDefense(selection.target, selection.counts);
  }

  function openShop() {
    if (state.phase !== "day") {
      showToast("AFFÄREN ÄR STÄNGD PÅ NATTEN");
      return;
    }
    updateShopUi();
    setModal("shop", true);
  }

  function updateShopUi() {
    UNIT_TYPES.forEach((type) => {
      const owned = $(`[data-owned="${type}"]`);
      if (owned) owned.textContent = String(state.guards[type]);
      const buy = $(`[data-buy="${type}"]`);
      if (buy) buy.disabled = state.money < UNIT_PRICES[type];
    });
    const minersOwned = $('[data-owned="miner"]');
    if (minersOwned) minersOwned.textContent = String(state.miners);
    const buyMinerButton = $('[data-buy="miner"]');
    if (buyMinerButton) {
      buyMinerButton.disabled = state.money < MINER_PRICE || state.miners >= MAX_MINERS;
      const label = buyMinerButton.querySelector("span");
      if (label) label.textContent = state.miners >= MAX_MINERS ? "MAX 9" : "KÖP 1";
    }
    if (ui.sellDiamond) {
      ui.sellDiamond.disabled = state.diamonds < 1;
      ui.sellDiamond.textContent = state.diamonds ? "SÄLJ 1 DIAMANT · +10" : "INGA DIAMANTER ATT SÄLJA";
    }
    updateHud();
  }

  function buyGuards(type) {
    if (!UNIT_TYPES.includes(type)) return;
    const price = UNIT_PRICES[type];
    if (state.money < price) {
      showToast("DU HAR INTE NOG MED PENGAR");
      return;
    }
    state.money -= price;
    state.guards[type] += 2;
    saveProgress();
    rebuildWorld();
    updateShopUi();
    sfx("coin");
    showToast(`TVÅ VAKTER MED ${UNIT_LABELS[type]} ÄR REDO`);
  }

  function buyMiner() {
    if (state.miners >= MAX_MINERS) {
      showToast("GRUVAN HAR REDAN MAX NIO MINERS");
      return;
    }
    if (state.money < MINER_PRICE) {
      showToast("DU HAR INTE NOG MED PENGAR");
      return;
    }
    if (state.miners === 0) state.mineElapsed = 0;
    state.money -= MINER_PRICE;
    state.miners++;
    saveProgress();
    rebuildWorld();
    updateShopUi();
    sfx("coin");
    showToast(`EN MINER JOBBAR NU I GRUVAN (${state.miners}/${MAX_MINERS})`);
  }

  function sellDiamond() {
    if (state.diamonds < 1) return;
    state.diamonds--;
    state.money += 10;
    saveProgress();
    updateShopUi();
    sfx("coin");
    showToast("DIAMANT SÅLD FÖR 10 PENGAR");
  }

  function placeTowerArcher(slot) {
    if (state.towerSlots[slot] || availableGuards("archer") <= 0) return;
    showQuestion(
      "VILL DU PLACERA EN VAKT MED PILBÅGE?",
      "Bågskytten stannar här och vaktar från tornet.",
      () => {
        state.towerSlots[slot] = true;
        saveProgress();
        rebuildWorld();
        showToast("BÅGSKYTTEN VAKTAR TORNET");
      },
      () => {},
    );
  }

  function chooseMineRaider() {
    const candidates = state.kingdoms.slice(1).filter((kingdom) => kingdom.miners < MAX_MINERS);
    if (!candidates.length) return null;
    return candidates[Math.floor(seeded() * candidates.length)].index;
  }

  function resolveSleepingMineRaid(attackerOverride = null, requestedOverride = null) {
    if (state.phase !== "night" || state.nightMineRaidTriggered || state.miners <= 0) return null;
    state.nightMineRaidTriggered = true;
    const attacker = Number.isInteger(attackerOverride) ? attackerOverride : chooseMineRaider();
    if (!attacker || !state.kingdoms[attacker] || state.kingdoms[attacker].player || state.kingdoms[attacker].miners >= MAX_MINERS) return null;
    const requested = Number.isFinite(requestedOverride) ? requestedOverride : 1 + Math.floor(seeded() * 3);
    const transfer = applyMineTransfer("incoming", attacker, requested);
    state.sleepRaidMessage = transfer.transferred > 0
      ? `MEDAN DU SOV STAL FIENDEKUNG ${attacker} ${transfer.transferred} ${transfer.transferred === 1 ? "MINER" : "MINERS"}!`
      : `FIENDEKUNG ${attacker} FÖRSÖKTE PLUNDRA GRUVAN MEN KUNDE INTE TA NÅGON MINER`;
    return transfer;
  }

  function triggerIncomingMineRaid(attacker = chooseMineRaider()) {
    if (state.phase !== "night" || state.scene !== "home" || state.modal || state.nightMineRaidTriggered || state.miners <= 0 || !attacker) return false;
    state.nightMineRaidTriggered = true;
    state.pendingMineDefense = { attacker, requested: 1 + Math.floor(seeded() * 3) };
    saveProgress();
    showToast(`FIENDEKUNG ${attacker} KOMMER FÖR ATT STJÄLA DINA MINERS!`, 2200);
    openSelection("mineDefense", attacker, 5, true);
    return true;
  }

  function sleepOneSecond() {
    resolveSleepingMineRaid();
    setModal(null, false);
    state.sleeping = 1;
    showToast("DU SOVER...", 1100);
  }

  function startNightChoice() {
    state.askedNight = true;
    showQuestion(
      "VILL DU VARA VAKEN?",
      "Välj Ja för att vara vaken och kunna gå på smyg- eller gruvuppdrag. Fiendekungar kan också anfalla din gruva.",
      () => showToast("NATTEN HAR BÖRJAT"),
      () => sleepOneSecond(),
    );
  }

  function makeUnit(team, type, x, z, extra = {}) {
    return {
      id: extra.id || `${state.scene}-${team}-${type}-${state.time.toFixed(3)}-${Math.floor(seeded() * 1e8)}`,
      team,
      type,
      x,
      y: extra.y || 0,
      z,
      hp: Number.isFinite(extra.hp) ? extra.hp : 100,
      maxHp: Number.isFinite(extra.hp) ? extra.hp : 100,
      alive: true,
      king: Boolean(extra.king),
      worker: Boolean(extra.worker),
      statue: Boolean(extra.statue),
      shield: Boolean(extra.shield || extra.statue),
      rival: Boolean(extra.rival),
      rivalParty: Boolean(extra.rivalParty || extra.rival),
      broughtGuard: Boolean(extra.broughtGuard),
      searchParty: extra.searchParty || null,
      searchTargetRoomId: null,
      roomId: extra.roomId || null,
      awake: Boolean(extra.awake),
      respawnTimer: Number(extra.respawnTimer) || 0,
      abandonedDamagedAt: null,
      abandonedHealSecondsRemaining: 0,
      originX: Number.isFinite(extra.originX) ? extra.originX : x,
      originZ: Number.isFinite(extra.originZ) ? extra.originZ : z,
      kingdom: Number.isInteger(extra.kingdom) ? extra.kingdom : team === 0 ? 0 : 1,
      weapon: extra.weapon || (extra.statue ? "sword" : type === "king" ? (seeded() > 0.5 ? "sword" : "bow") : null),
      fixed: Boolean(extra.fixed),
      towerSlot: Number.isInteger(extra.towerSlot) ? extra.towerSlot : null,
      respawned: false,
      cooldown: randomRange(0.1, 0.7),
      facing: team === 0 ? Math.PI : 0,
      walk: randomRange(0, TAU),
      salute: 0,
      color: Number.isFinite(extra.color) ? extra.color : extra.statue ? 0x7b8183 : KINGDOM_COLORS[team === 0 ? 0 : extra.kingdom || 1],
      sourceType: extra.sourceType || type,
      lossRecorded: false,
    };
  }

  function battleTowerPosition(team, slot) {
    const x = [-20.5, -19.1, 19.1, 20.5][clamp(slot, 0, 3)];
    return { x, y: 6.72, z: team === 0 ? 33.25 : -33.25 };
  }

  function makeAbandonedSearchState(partySize = 0) {
    const order = ABANDONED_ROOMS.map((room) => room.id);
    for (let index = order.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(seeded() * (index + 1));
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }
    // Every searcher must first inspect a wrong room. The treasure then appears
    // soon enough in the independently shuffled route that helpers remain useful.
    const treasureIndex = order.indexOf(ABANDONED_MONEY_ROOM_ID);
    const firstLaterSearch = Math.min(order.length - 1, Math.max(1, partySize));
    const lastLaterSearch = Math.min(order.length - 1, firstLaterSearch + 4);
    const earlySearchIndex = firstLaterSearch + Math.floor(seeded() * (lastLaterSearch - firstLaterSearch + 1));
    [order[treasureIndex], order[earlySearchIndex]] = [order[earlySearchIndex], order[treasureIndex]];
    return {
      order,
      nextIndex: 0,
      claims: {},
      searchedRoomIds: [],
      treasureFound: false,
      foundByUnitId: null,
      foundAt: null,
      announced: false,
      announcementCount: 0,
    };
  }

  function startAbandonedCastle(counts = { sword: 0, archer: 0, cavalry: 0 }) {
    const safeCounts = Object.fromEntries(UNIT_TYPES.map((type) => [type, clamp(Math.floor(Number(counts?.[type]) || 0), 0, state.guards[type])]));
    while (Object.values(safeCounts).reduce((sum, value) => sum + value, 0) > ABANDONED_MAX_GUARDS) {
      const reducible = UNIT_TYPES.find((type) => safeCounts[type] > 0);
      if (!reducible) break;
      safeCounts[reducible]--;
    }
    const rivalCandidates = state.kingdoms.slice(1).filter((kingdom) => !kingdomAtEnemyWar(kingdom.index));
    const rivalKingdom = (rivalCandidates[Math.floor(seeded() * Math.max(1, rivalCandidates.length))] || state.kingdoms[1]).index;
    state.scene = "abandonedCastle";
    state.units = [];
    state.loot = [];
    state.battle = null;
    state.stealth = null;
    state.mineRaid = null;
    state.mineDefense = null;
    state.abandonedCastleVisit = {
      counts: { ...safeCounts },
      currentRoomId: null,
      visitedRoomIds: [],
      statuesDefeated: 0,
      statueRespawns: 0,
      moneyTakes: 0,
      totalMoneyTaken: 0,
      guardMoneyTaken: 0,
      guardPayoutAccumulator: 0,
      guardPayoutTicks: 0,
      treasureTimerStarted: false,
      treasureStartedAt: null,
      treasureSecondsRemaining: ABANDONED_TREASURE_SECONDS,
      treasureAvailable: true,
      treasureUnlocked: false,
      allFriendlyInsideTreasure: false,
      friendlySearch: makeAbandonedSearchState(Object.values(safeCounts).reduce((sum, value) => sum + value, 0)),
      rivalSearch: makeAbandonedSearchState(11),
      rivalKingdom,
      rivalKingId: null,
      rivalReachedMoney: false,
      rivalEscaping: false,
      rivalEscaped: false,
      rivalStolenMoney: 0,
      rivalGuardIds: [],
      enteredCastle: false,
      playerFoundTreasure: false,
      playerEscaping: false,
      playerEscapeWaitingNotice: false,
      playerKingRespawnedAtHome: false,
    };
    Object.assign(state.player, { x: -6, y: 0, z: 144, yaw: 0, pitch: 0, hp: 100, alive: true, attackCooldown: 0, swing: 0, abandonedDamagedAt: null, abandonedHealSecondsRemaining: 0 });

    let followerIndex = 0;
    UNIT_TYPES.forEach((type) => {
      for (let index = 0; index < safeCounts[type]; index++) {
        const x = -10 + (followerIndex % 4) * 2.05;
        const z = 146.3 + Math.floor(followerIndex / 4) * 1.55;
        state.units.push(makeUnit(0, type, x, z, { sourceType: type, broughtGuard: true, searchParty: "friendly" }));
        followerIndex++;
      }
    });

    ABANDONED_ROOMS.forEach((room) => {
      state.units.push(makeUnit(2, "statue", room.x, room.z, {
        id: `statue-${room.id}`,
        statue: true,
        roomId: room.id,
        hp: ABANDONED_STATUE_HP,
        y: 0.26,
        color: 0x7b8183,
      }));
    });

    const rival = makeUnit(1, "king", 6, 144, { king: true, rival: true, rivalParty: true, searchParty: "rival", kingdom: rivalKingdom });
    state.units.push(rival);
    state.abandonedCastleVisit.rivalKingId = rival.id;
    const rivalGuardTypes = ["sword", "archer", "cavalry", "sword", "archer", "cavalry", "sword", "archer", "cavalry", "sword"];
    rivalGuardTypes.forEach((type, index) => {
      const guard = makeUnit(1, type, 3.8 + (index % 3) * 2.2, 146.4 + Math.floor(index / 3) * 1.7, { rivalParty: true, searchParty: "rival", kingdom: rivalKingdom });
      state.units.push(guard);
      state.abandonedCastleVisit.rivalGuardIds.push(guard.id);
    });
    rebuildWorld();
    showToast("LABYRINTEN HAR 35 RUM · EN FIENDEKUNG OCH 10 VAKTER LETAR OCKSÅ", 3400);
    updateHud();
  }

  function finishAbandonedCastle(playerDied = false) {
    const visit = state.abandonedCastleVisit;
    if (!visit) return;
    const dead = { sword: 0, archer: 0, cavalry: 0 };
    state.units
      .filter((unit) => unit.team === 0 && !unit.alive && UNIT_TYPES.includes(unit.sourceType))
      .forEach((unit) => dead[unit.sourceType]++);
    UNIT_TYPES.forEach((type) => { state.guards[type] = Math.max(0, state.guards[type] - dead[type]); });
    normalizeTowerSlots();
    const visited = visit.visitedRoomIds.length;
    const moneyTaken = visit.totalMoneyTaken;
    state.abandonedCastleVisit = null;
    state.units = [];
    state.loot = [];
    state.scene = "home";
    resetPlayerForHome();
    saveProgress();
    rebuildWorld();
    showOutcome(
      playerDied ? "STATYERNA BESEGRADE KUNGEN" : "NI ÄR TILLBAKA FRÅN JÄTTESLOTTET",
      playerDied
        ? `Du började om i din borg. Gruppen hann besöka ${visited} av 35 rum och ta ${moneyTaken} pengar.`
        : `Ni besökte ${visited} av 35 rum och tog ${moneyTaken} pengar. Överlevande vakter är helade till 100 liv.`,
    );
  }

  function startBattle(target, counts, incoming = false) {
    const safeCounts = Object.fromEntries(UNIT_TYPES.map((type) => [type, clamp(Math.floor(Number(counts?.[type]) || 0), 0, state.guards[type])]));
    const placedTowerSlots = state.towerSlots
      .map((filled, slot) => filled ? slot : -1)
      .filter((slot) => slot >= 0);
    if (incoming) safeCounts.archer = Math.max(safeCounts.archer, placedTowerSlots.length);
    while (Object.values(safeCounts).reduce((sum, value) => sum + value, 0) > 20) {
      const reducible = UNIT_TYPES.find((type) => safeCounts[type] > (incoming && type === "archer" ? placedTowerSlots.length : 0));
      if (!reducible) break;
      safeCounts[reducible]--;
    }
    state.scene = "battle";
    state.phaseElapsed = clamp(state.phaseElapsed, 0, DAY_SECONDS - 1);
    state.units = [];
    state.loot = [];
    state.battle = {
      target,
      incoming,
      counts: { ...safeCounts },
      over: false,
      resultTimer: 0,
      result: null,
      playerKingRespawnedAtHome: false,
      enemyKingRespawnedAtHome: false,
    };
    state.stealth = null;
    state.mineRaid = null;
    state.mineDefense = null;
    Object.assign(state.player, { x: 0, y: 0, z: 27, yaw: 0, pitch: 0, hp: 100, alive: true, attackCooldown: 0 });
    let friendIndex = 0;
    UNIT_TYPES.forEach((type) => {
      for (let i = 0; i < safeCounts[type]; i++) {
        const row = Math.floor(friendIndex / 7);
        const col = friendIndex % 7;
        const towerSlot = incoming && type === "archer" ? placedTowerSlots[i] : undefined;
        const fixed = Number.isInteger(towerSlot);
        const position = fixed ? battleTowerPosition(0, towerSlot) : { x: -9 + col * 3, y: 0, z: 21 - row * 2.6 };
        state.units.push(makeUnit(0, type, position.x, position.z, { fixed, y: position.y, towerSlot }));
        friendIndex++;
      }
    });
    const enemyTowerCount = clamp(state.kingdoms[target]?.towerArchers || 0, 0, 4);
    const enemyCounts = { sword: 1, archer: Math.max(1, enemyTowerCount), cavalry: 1 };
    for (let i = Object.values(enemyCounts).reduce((sum, value) => sum + value, 0); i < 20; i++) enemyCounts[UNIT_TYPES[Math.floor(seeded() * 3)]]++;
    let enemyIndex = 0;
    UNIT_TYPES.forEach((type) => {
      for (let i = 0; i < enemyCounts[type]; i++) {
        const row = Math.floor(enemyIndex / 7);
        const col = enemyIndex % 7;
        const fixed = type === "archer" && i < enemyTowerCount;
        const position = fixed ? battleTowerPosition(1, i) : { x: -9 + col * 3, y: 0, z: -21 + row * 2.6 };
        state.units.push(makeUnit(1, type, position.x, position.z, { kingdom: target, fixed, y: position.y, towerSlot: fixed ? i : undefined }));
        enemyIndex++;
      }
    });
    state.units.push(makeUnit(1, "king", 0, -27, { king: true, kingdom: target }));
    rebuildWorld();
    showToast(incoming ? "FIENDEN ANFALLER DIN BORG!" : "KRIGET HAR BÖRJAT!", 2200);
    updateHud();
  }

  function startStealth(target, counts) {
    state.scene = "stealth";
    state.units = [];
    state.loot = [];
    state.battle = null;
    state.mineRaid = null;
    state.mineDefense = null;
    state.stealth = { target, counts: { ...counts }, deadFollowers: { sword: 0, archer: 0, cavalry: 0 }, result: null, enemyKingRespawnsAfterMission: false };
    state.quickStealth = { sword: 0, archer: 0, cavalry: 0 };
    state.quickStealthIds = [];
    state.enteredEnemyCastle = false;
    Object.assign(state.player, { x: 0, y: 0, z: 25.5, yaw: 0, pitch: 0, hp: 100, alive: true, attackCooldown: 0 });
    let index = 0;
    UNIT_TYPES.forEach((type) => {
      for (let i = 0; i < counts[type]; i++) {
        state.units.push(makeUnit(0, type, -2 + (index % 3) * 2, 27 + Math.floor(index / 3) * 2, { sourceType: type }));
        index++;
      }
    });
    const defenders = 5 + Math.floor(seeded() * 4);
    for (let i = 0; i < defenders; i++) {
      if (seeded() < 0.5) continue;
      const type = UNIT_TYPES[Math.floor(seeded() * 3)];
      state.units.push(makeUnit(1, type, randomRange(-14, 14), randomRange(-9, 10), { kingdom: target }));
    }
    const towerPositions = [[-20, -14], [20, -14], [-20, 14], [20, 14]];
    for (let i = 0; i < state.kingdoms[target].towerArchers; i++) {
      if (seeded() >= 0.5) continue;
      const [x, z] = towerPositions[i];
      state.units.push(makeUnit(1, "archer", x, z, { kingdom: target, fixed: true, y: 5.55 }));
    }
    if (seeded() < 0.5) state.units.push(makeUnit(1, "king", -12, 1, { king: true, kingdom: target }));
    state.loot.push(
      { id: "loot-money-a", kind: "money", amount: 10, x: -5, z: -4, taken: false },
      { id: "loot-money-b", kind: "money", amount: 10, x: 8, z: 4, taken: false },
      { id: "loot-diamond", kind: "diamond", amount: 1, x: 2, z: -8, taken: false },
    );
    rebuildWorld();
    showToast("SMYG IN, TA FYNDEN OCH ÅTERVÄND ÖVER BRON", 2800);
    updateHud();
  }

  function guardCountsLimitedTo(counts, max) {
    const safe = Object.fromEntries(UNIT_TYPES.map((type) => [type, clamp(Math.floor(Number(counts?.[type]) || 0), 0, state.guards[type])]));
    while (Object.values(safe).reduce((sum, value) => sum + value, 0) > max) {
      const reducible = UNIT_TYPES.find((type) => safe[type] > 0);
      if (!reducible) break;
      safe[reducible]--;
    }
    return safe;
  }

  function calculateMineTransfer(direction, playerMiners, enemyMiners, requested) {
    const playerBefore = clamp(Math.floor(Number(playerMiners) || 0), 0, MAX_MINERS);
    const enemyBefore = clamp(Math.floor(Number(enemyMiners) || 0), 1, MAX_MINERS);
    const wanted = Math.max(0, Math.floor(Number(requested) || 0));
    const transferred = direction === "incoming"
      ? Math.min(wanted, playerBefore, MAX_MINERS - enemyBefore)
      : Math.min(wanted, Math.max(0, enemyBefore - 1), MAX_MINERS - playerBefore);
    return {
      direction,
      requested: wanted,
      transferred,
      playerBefore,
      enemyBefore,
      playerAfter: direction === "incoming" ? playerBefore - transferred : playerBefore + transferred,
      enemyAfter: direction === "incoming" ? enemyBefore + transferred : enemyBefore - transferred,
    };
  }

  function applyMineTransfer(direction, enemyKingdomIndex, requested) {
    const enemyKingdom = state.kingdoms[enemyKingdomIndex];
    if (!["outgoing", "incoming"].includes(direction) || !enemyKingdom || enemyKingdom.player) return null;
    const transfer = calculateMineTransfer(direction, state.miners, enemyKingdom.miners, requested);
    state.miners = transfer.playerAfter;
    enemyKingdom.miners = transfer.enemyAfter;
    state.mineTransferId++;
    state.lastMineTransfer = {
      id: state.mineTransferId,
      source: direction === "outgoing" ? enemyKingdomIndex : 0,
      target: direction === "outgoing" ? 0 : enemyKingdomIndex,
      enemyKingdom: enemyKingdomIndex,
      ...transfer,
    };
    if (transfer.playerBefore === 0 && transfer.playerAfter > 0) state.mineElapsed = 0;
    if (state.miners === 0) state.mineElapsed = 0;
    saveProgress();
    return transfer;
  }

  function startMineRaid(target, counts) {
    target = clamp(Math.floor(Number(target) || 1), 1, state.kingdoms.length - 1);
    const safeCounts = guardCountsLimitedTo(counts, 5);
    state.scene = "mineRaid";
    state.units = [];
    state.loot = [];
    state.battle = null;
    state.stealth = null;
    state.mineDefense = null;
    state.mineRaid = {
      target,
      counts: { ...safeCounts },
      incoming: false,
      defeatedMiners: 0,
      stolenMiners: 0,
      result: null,
      resolved: false,
      enemyKingRespawnedAtHome: false,
    };
    Object.assign(state.player, { x: 0, y: 0, z: -27.5, yaw: 0, pitch: 0, hp: 100, alive: true, attackCooldown: 0 });

    let friendIndex = 0;
    UNIT_TYPES.forEach((type) => {
      for (let index = 0; index < safeCounts[type]; index++) {
        state.units.push(makeUnit(0, type, -4 + (friendIndex % 5) * 2, -25.8 + Math.floor(friendIndex / 5) * 1.8, { sourceType: type }));
        friendIndex++;
      }
    });

    const defenderCount = 2 + Math.ceil(state.kingdoms[target].miners / 3);
    for (let index = 0; index < defenderCount; index++) {
      const type = UNIT_TYPES[(target + index) % UNIT_TYPES.length];
      const [x, z] = MINE_GUARD_SPOTS[index];
      state.units.push(makeUnit(1, type, x, z, { kingdom: target }));
    }
    if (seeded() < 0.5) state.units.push(makeUnit(1, "king", 5.8, -39.5, { king: true, kingdom: target }));
    for (let index = 0; index < state.kingdoms[target].miners; index++) {
      const [x, z] = MINE_WORKER_SPOTS[index];
      state.units.push(makeUnit(1, "miner", x, z, { worker: true, kingdom: target }));
    }

    rebuildWorld();
    showToast("BESEGRA GRUVANS FÖRSVAR OCH STJÄL MINERS!", 2800);
    updateHud();
  }

  function startMineDefense(attacker, counts) {
    attacker = clamp(Math.floor(Number(attacker) || 1), 1, state.kingdoms.length - 1);
    const safeCounts = guardCountsLimitedTo(counts, 5);
    state.scene = "mineDefense";
    state.units = [];
    state.loot = [];
    state.battle = null;
    state.stealth = null;
    state.mineRaid = null;
    if (!state.pendingMineDefense || state.pendingMineDefense.attacker !== attacker) {
      state.pendingMineDefense = { attacker, requested: 1 + Math.floor(seeded() * 3) };
      saveProgress();
    }
    state.mineDefense = {
      attacker,
      counts: { ...safeCounts },
      over: false,
      result: null,
      resultTimer: 0,
      stolenMiners: 0,
      resolved: false,
      playerKingRespawnedAtHome: false,
      enemyKingRespawnedAtHome: false,
      theftRequested: state.pendingMineDefense.requested,
    };
    Object.assign(state.player, { x: 0, y: 0, z: -27.5, yaw: 0, pitch: 0, hp: 100, alive: true, attackCooldown: 0 });

    let friendIndex = 0;
    UNIT_TYPES.forEach((type) => {
      for (let index = 0; index < safeCounts[type]; index++) {
        state.units.push(makeUnit(0, type, -4 + (friendIndex % 5) * 2, -25.5 + Math.floor(friendIndex / 5) * 1.8, { sourceType: type }));
        friendIndex++;
      }
    });

    const enemyGuardCount = 4 + Math.floor(seeded() * 3);
    for (let index = 0; index < enemyGuardCount; index++) {
      const type = UNIT_TYPES[(attacker + index) % UNIT_TYPES.length];
      const [x, z] = MINE_GUARD_SPOTS[index];
      state.units.push(makeUnit(1, type, x, z, { kingdom: attacker }));
    }
    state.units.push(makeUnit(1, "king", 0, -32, { king: true, kingdom: attacker }));
    rebuildWorld();
    showToast(`FIENDEKUNG ${attacker} ANFALLER DIN GRUVA!`, 2500);
    updateHud();
  }

  function finishMineRaid(title, text) {
    if (!state.mineRaid || state.mineRaid.resolved) return;
    state.mineRaid.resolved = true;
    const dead = { sword: 0, archer: 0, cavalry: 0 };
    state.units.filter((unit) => unit.team === 0 && !unit.alive && !unit.lossRecorded && UNIT_TYPES.includes(unit.sourceType)).forEach((unit) => dead[unit.sourceType]++);
    UNIT_TYPES.forEach((type) => { state.guards[type] = Math.max(0, state.guards[type] - dead[type]); });
    normalizeTowerSlots();
    state.mineRaid = null;
    state.units = [];
    state.loot = [];
    state.scene = "home";
    resetPlayerForHome();
    saveProgress();
    rebuildWorld();
    showOutcome(title, `${text} Överlevande vakter är hemma igen och har läkts till 100 liv.`);
  }

  function stealFromEnemyMine(requestedOverride = null) {
    const raid = state.mineRaid;
    if (!raid || raid.incoming) return;
    const defendersAlive = state.units.some((unit) => unit.team === 1 && unit.alive && !unit.worker);
    if (defendersAlive) {
      showToast("BESEGRA GRUVANS VAKTER FÖRST");
      return;
    }
    const enemyKingdom = state.kingdoms[raid.target];
    const requested = Number.isFinite(requestedOverride) ? requestedOverride : 1 + Math.floor(seeded() * 3);
    const transfer = applyMineTransfer("outgoing", raid.target, requested);
    if (!transfer) return;
    const stolen = transfer.transferred;
    raid.stolenMiners = stolen;
    if (stolen > 0) {
      finishMineRaid(
        "GRUVUPPDRAGET LYCKADES!",
        `Du stal ${stolen} ${stolen === 1 ? "miner" : "miners"}. Fienderiket har ${enemyKingdom.miners} kvar och du har ${state.miners}.`,
      );
      sfx("win");
      return;
    }
    const reason = transfer.playerBefore >= MAX_MINERS
      ? "Din egen gruva är full med nio miners."
      : "Fienderikets sista miner måste stanna kvar.";
    finishMineRaid("INGEN MINER KUNDE STJÄLAS", reason);
  }

  function finishMineDefense(result) {
    if (!state.mineDefense || state.mineDefense.over) return;
    state.mineDefense.over = true;
    state.mineDefense.result = result;
    state.mineDefense.resultTimer = 1.5;
    if (result === "win") {
      state.pendingMineDefense = null;
      saveProgress();
    }
  }

  function resolveMineDefense(requestedOverride = null) {
    const defense = state.mineDefense;
    if (!defense || defense.resolved) return;
    defense.resolved = true;
    const dead = { sword: 0, archer: 0, cavalry: 0 };
    state.units.filter((unit) => unit.team === 0 && !unit.alive && !unit.lossRecorded && UNIT_TYPES.includes(unit.sourceType)).forEach((unit) => dead[unit.sourceType]++);
    UNIT_TYPES.forEach((type) => { state.guards[type] = Math.max(0, state.guards[type] - dead[type]); });
    normalizeTowerSlots();

    let stolen = 0;
    if (defense.result === "lose") {
      const requested = Number.isFinite(requestedOverride) ? requestedOverride : defense.theftRequested;
      state.pendingMineDefense = null;
      const transfer = applyMineTransfer("incoming", defense.attacker, requested);
      stolen = transfer.transferred;
      defense.stolenMiners = stolen;
    } else {
      state.pendingMineDefense = null;
    }

    const won = defense.result === "win";
    const title = won ? "GRUVAN ÄR RÄDDAD!" : "FIENDEN TOG SIG IN I GRUVAN";
    const text = won
      ? "Fiendekungen och vakterna besegrades. Alla dina överlevande miners är kvar."
      : stolen > 0
        ? `Fiendekung ${defense.attacker} stal ${stolen} ${stolen === 1 ? "miner" : "miners"}. Du har ${state.miners} kvar.`
        : "Fienden vann striden men kunde inte bära bort någon miner.";
    state.mineDefense = null;
    state.units = [];
    state.scene = "home";
    resetPlayerForHome();
    saveProgress();
    rebuildWorld();
    showOutcome(title, text);
    sfx(won ? "win" : "lose");
  }

  function finishStealth(playerDied = false) {
    if (!state.stealth) return;
    const dead = { sword: 0, archer: 0, cavalry: 0 };
    state.units.filter((unit) => unit.team === 0 && !unit.alive && UNIT_TYPES.includes(unit.sourceType)).forEach((unit) => dead[unit.sourceType]++);
    UNIT_TYPES.forEach((type) => { state.guards[type] = Math.max(0, state.guards[type] - dead[type]); });
    normalizeTowerSlots();
    saveProgress();
    state.stealth = null;
    state.quickStealth = { sword: 0, archer: 0, cavalry: 0 };
    state.quickStealthIds = [];
    state.units = [];
    state.loot = [];
    state.scene = "home";
    resetPlayerForHome();
    rebuildWorld();
    showOutcome(
      playerDied ? "SMYGUPPDRAGET MISSLYCKADES" : "NI ÄR TILLBAKA",
      playerDied
        ? "Du började om i din borg. Alla överlevande vakter återvände och har 100 liv."
        : "Överlevande vakter är hemma igen och har läkts till 100 liv.",
    );
  }

  function finishBattle(result) {
    if (!state.battle || state.battle.over) return;
    state.battle.over = true;
    state.battle.result = result;
    state.battle.resultTimer = 1.5;
  }

  function resolveBattle() {
    const battle = state.battle;
    if (!battle) return;
    const dead = { sword: 0, archer: 0, cavalry: 0 };
    state.units.filter((unit) => unit.team === 0 && !unit.alive && UNIT_TYPES.includes(unit.sourceType)).forEach((unit) => dead[unit.sourceType]++);
    UNIT_TYPES.forEach((type) => { state.guards[type] = Math.max(0, state.guards[type] - dead[type]); });
    normalizeTowerSlots();
    if (battle.result === "win") state.money += 50;
    else state.money = Math.max(0, state.money - 20);
    saveProgress();
    const title = battle.result === "win" ? "DU VANN KRIGET!" : "DU FÖRLORADE KRIGET";
    const copy = battle.result === "win" ? "Riket får 50 pengar." : "Riket förlorar 20 pengar.";
    state.battle = null;
    state.units = [];
    state.scene = "home";
    resetPlayerForHome();
    rebuildWorld();
    showOutcome(title, copy);
    sfx(battle.result === "win" ? "win" : "lose");
  }

  function showOutcome(title, text) {
    if (ui.outcomeTitle) ui.outcomeTitle.textContent = title;
    if (ui.outcomeText) ui.outcomeText.textContent = text;
    setModal("outcome", true);
    updateHud();
  }

  function updateLighting(force = false) {
    const night = state.scene === "stealth" || state.phase === "night";
    const t = force ? 1 : clamp(FIXED_STEP * 2.4, 0, 1);
    scene.background.lerp(new THREE.Color(night ? 0x101936 : 0x73c9f4), t);
    scene.fog.color.lerp(new THREE.Color(night ? 0x172445 : 0xaddff0), t);
    hemisphere.intensity = lerp(hemisphere.intensity, night ? 0.42 : 1.85, t);
    sun.intensity = lerp(sun.intensity, night ? 0.18 : 2.65, t);
    fill.intensity = lerp(fill.intensity, night ? 0.78 : 0.55, t);
    renderer.toneMappingExposure = lerp(renderer.toneMappingExposure, night ? 0.82 : 1.08, t);
  }

  function floorHeight(x, z, previousY = 0) {
    if (state.scene === "abandonedCastle") return 0;
    if (state.scene === "battle") {
      const edge = Math.max(0, Math.abs(x) - 17.5);
      return Math.min(5.5, edge * 0.82);
    }
    if (x >= 13.3 && x <= 16.9 && z >= -3 && z <= 7.4) return clamp((7.4 - z) / 10.4 * 5.2, 0, 5.2);
    const onNorthSouth = Math.abs(z) >= 10.2 && Math.abs(z) <= 15.4 && Math.abs(x) <= 20.8;
    const onEastWest = Math.abs(x) >= 15.3 && Math.abs(x) <= 20.8 && Math.abs(z) <= 15.4;
    const onTower = Math.hypot(Math.abs(x) - 20, Math.abs(z) - 14) < 4.1;
    if ((previousY > 3.1 || x > 13.1) && (onNorthSouth || onEastWest || onTower)) return 5.2;
    return 0;
  }

  function isMoat(x, z) {
    if (state.scene === "battle") return false;
    if (state.scene === "abandonedCastle") {
      const onGiantBridge = Math.abs(x) < 3.45 && z > 89.5 && z < 117.5;
      const frontMoat = Math.abs(x) < 49 && z > 96 && z < 111;
      const rearMoat = Math.abs(x) < 49 && z > -109 && z < -95;
      const sideMoat = Math.abs(x) > 37 && Math.abs(x) < 49 && z > -109 && z < 111;
      return (frontMoat || rearMoat || sideMoat) && !onGiantBridge;
    }
    const inOuter = Math.abs(x) < 29 && z > -25 && z < 26.8;
    const outsideCastle = Math.abs(x) > 21 || z < -15.2 || z > 15.2;
    const onFrontBridge = Math.abs(x) < 3.15 && z > 13.5 && z < 28;
    const onRearBridge = Math.abs(x - REAR_DRAWBRIDGE.x) < REAR_DRAWBRIDGE.width / 2 - 0.05
      && Math.abs(z - REAR_DRAWBRIDGE.z) < REAR_DRAWBRIDGE.length / 2 + 0.45;
    return inOuter && outsideCastle && !onFrontBridge && !onRearBridge && z < 27;
  }

  function collides(x, z, y) {
    if (state.scene === "battle") return Math.abs(x) > 24 || Math.abs(z) > 33;
    if (isMoat(x, z)) return true;
    return colliders.some((wall) => y >= wall.minY && y <= wall.maxY && x + PLAYER_RADIUS > wall.minX && x - PLAYER_RADIUS < wall.maxX && z + PLAYER_RADIUS > wall.minZ && z - PLAYER_RADIUS < wall.maxZ);
  }

  function movePlayer(dt) {
    if (!state.player.alive) return;
    let forwardInput = 0;
    let sideInput = 0;
    if (keys.KeyW || keys.ArrowUp) forwardInput += 1;
    if (keys.KeyS || keys.ArrowDown) forwardInput -= 1;
    if (keys.KeyD || keys.ArrowRight) sideInput += 1;
    if (keys.KeyA || keys.ArrowLeft) sideInput -= 1;
    forwardInput += -joystick.y;
    sideInput += joystick.x;
    const magnitude = Math.hypot(forwardInput, sideInput);
    if (magnitude > 1) { forwardInput /= magnitude; sideInput /= magnitude; }
    const sprint = keys.ShiftLeft || keys.ShiftRight;
    const speed = sprint ? 6.7 : 4.4;
    const sin = Math.sin(state.player.yaw);
    const cos = Math.cos(state.player.yaw);
    const vx = (-sin * forwardInput + cos * sideInput) * speed;
    const vz = (-cos * forwardInput - sin * sideInput) * speed;
    const nextX = state.player.x + vx * dt;
    const nextZ = state.player.z + vz * dt;
    if (!collides(nextX, state.player.z, state.player.y)) state.player.x = nextX;
    if (!collides(state.player.x, nextZ, state.player.y)) state.player.z = nextZ;
    const targetY = floorHeight(state.player.x, state.player.z, state.player.y);
    state.player.y = lerp(state.player.y, targetY, clamp(dt * 11, 0, 1));
    state.player.moving = lerp(state.player.moving, magnitude > 0.1 ? 1 : 0, clamp(dt * 9, 0, 1));
    camera.fov = lerp(camera.fov, sprint && magnitude > 0.1 ? 78 : 73, clamp(dt * 7, 0, 1));
    camera.updateProjectionMatrix();
    if (state.scene === "stealth") {
      const insideCourtyard = Math.abs(state.player.x) < 19.1 && state.player.z > -12.6 && state.player.z < 12.6;
      if (insideCourtyard) state.enteredEnemyCastle = true;
      const leftByFrontBridge = Math.abs(state.player.x) < 3.2 && state.player.z > 25.2;
      const leftByRearBridge = Math.abs(state.player.x) < 3.2 && state.player.z < -27.2;
      if (state.enteredEnemyCastle && (leftByFrontBridge || leftByRearBridge)) finishStealth(false);
    } else if (state.scene === "abandonedCastle" && state.abandonedCastleVisit) {
      const visit = state.abandonedCastleVisit;
      if (state.player.z < 87.5) visit.enteredCastle = true;
      if (visit.enteredCastle && !visit.playerEscaping && state.player.z > 91) {
        visit.playerEscaping = true;
        visit.friendlySearch.claims = {};
        abandonedPartyMembers("friendly").forEach((unit) => { unit.searchTargetRoomId = null; });
        showToast("FLY TILLBAKA ÖVER VINDBRYGGAN · VAKTERNA FÖLJER!", 2400);
      }
      if (visit.playerEscaping && state.player.z > 138) {
        const guardsStillReturning = abandonedPartyMembers("friendly").filter((unit) => unit.z <= 138);
        if (!guardsStillReturning.length) {
          finishAbandonedCastle(false);
          return;
        }
        if (!visit.playerEscapeWaitingNotice) {
          visit.playerEscapeWaitingNotice = true;
          showToast(`VÄNTA PÅ ${guardsStillReturning.length} ${guardsStillReturning.length === 1 ? "VAKT" : "VAKTER"}`, 2400);
        }
      }
    }
  }

  function updateCamera() {
    const bob = Math.sin(state.time * 10.2) * 0.045 * state.player.moving;
    camera.position.set(state.player.x, state.player.y + EYE_HEIGHT + bob, state.player.z);
    camera.rotation.set(state.player.pitch + Math.sin(state.time * 7.5) * 0.004 * state.player.moving, state.player.yaw, Math.sin(state.time * 5) * 0.006 * state.player.moving);
    const swing = state.player.swing;
    weaponRig.position.x = 0.53 + Math.sin(state.time * 8.6) * 0.018 * state.player.moving;
    weaponRig.position.y = -0.46 + Math.abs(Math.sin(state.time * 8.6)) * 0.018 * state.player.moving - Math.sin(swing * Math.PI) * 0.08;
    weaponRig.rotation.z = state.weapon === "sword" ? -Math.sin(swing * Math.PI) * 0.72 : Math.sin(swing * Math.PI) * 0.08;
    weaponRig.rotation.x = state.weapon === "sword" ? -Math.sin(swing * Math.PI) * 0.28 : Math.sin(swing * Math.PI) * 0.18;
    weaponRig.visible = state.player.alive;
    fpSword.visible = state.player.alive && state.weapon === "sword";
    fpBow.visible = state.player.alive && state.weapon === "bow";
  }

  function nearestEnemyTo(x, z, team, maxRange = Infinity, excludeWorkers = false) {
    let best = null;
    let bestDistance = maxRange;
    state.units.forEach((unit) => {
      if (!unit.alive || unit.team === team || isTowerArcher(unit) || (unit.statue && !unit.awake) || (unit.rivalParty && state.scene === "abandonedCastle" && unit.z > 90) || (excludeWorkers && unit.worker)) return;
      const distance = Math.hypot(unit.x - x, unit.z - z);
      if (distance < bestDistance) { best = unit; bestDistance = distance; }
    });
    if (team !== 0 && state.player.alive) {
      const playerDistance = Math.hypot(state.player.x - x, state.player.z - z);
      if (playerDistance < bestDistance) return { player: true, x: state.player.x, z: state.player.z, hp: state.player.hp, alive: true, distance: playerDistance };
    }
    if (best) best.distance = bestDistance;
    return best;
  }

  function hasLineOfSight(from, to, ignoreOriginCollider = false) {
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    const steps = Math.max(1, Math.ceil(distance / 0.65));
    const fromY = (from.y || 0) + 1.45;
    const toY = (to.y || 0) + 1.25;
    const originColliders = ignoreOriginCollider
      ? new Set(colliders.filter((wall) => {
          const compactTowerFootprint = wall.maxX - wall.minX <= 7.1 && wall.maxZ - wall.minZ <= 7.1;
          return compactTowerFootprint && from.x > wall.minX && from.x < wall.maxX && from.z > wall.minZ && from.z < wall.maxZ;
        }))
      : null;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = lerp(from.x, to.x, t);
      const z = lerp(from.z, to.z, t);
      const y = lerp(fromY, toY, t);
      if (colliders.some((wall) => !originColliders?.has(wall) && y >= wall.minY && y <= wall.maxY && x > wall.minX && x < wall.maxX && z > wall.minZ && z < wall.maxZ)) return false;
    }
    return true;
  }

  function abandonedRoomAt(x, z) {
    return ABANDONED_ROOMS.find((room) => (
      x > room.x - room.width / 2 + 0.12
      && x < room.x + room.width / 2 - 0.12
      && z > room.z - room.depth / 2 + 0.12
      && z < room.z + room.depth / 2 - 0.12
    )) || null;
  }

  function abandonedZoneAt(x, z) {
    const room = abandonedRoomAt(x, z);
    if (room) return room;
    if (Math.abs(x) < 4.78 && z > -89.5 && z < 89.5) return { id: "main-corridor", type: "corridor", x: 0, z };
    return null;
  }

  function abandonedNavigationZoneAt(x, z) {
    const transitionMargin = 0.72;
    const room = ABANDONED_ROOMS.find((entry) => (
      x > entry.x - entry.width / 2 - transitionMargin
      && x < entry.x + entry.width / 2 + transitionMargin
      && z > entry.z - entry.depth / 2 - transitionMargin
      && z < entry.z + entry.depth / 2 + transitionMargin
    ));
    if (room) return room;
    if (Math.abs(x) < 5.3 && z > -90.3 && z < 89.7) return { id: "main-corridor", type: "corridor", x: 0, z };
    return null;
  }

  function abandonedMazeTransitTarget(from, target) {
    const deltaZ = target.z - from.z;
    if (Math.abs(deltaZ) < 0.7) return target;
    const direction = deltaZ < 0 ? -1 : 1;
    const barriers = ABANDONED_MAZE_BARRIERS
      .filter((barrier) => direction < 0
        ? barrier.z < from.z + 0.85 && barrier.z > target.z + 0.25
        : barrier.z > from.z - 0.85 && barrier.z < target.z - 0.25)
      .sort((a, b) => direction < 0 ? b.z - a.z : a.z - b.z);
    const barrier = barriers[0];
    if (!barrier) return target;
    const approachZ = barrier.z - direction * 1.15;
    const beyondZ = barrier.z + direction * 1.15;
    if (Math.abs(from.x - barrier.gapX) > 0.42) {
      const safeZ = direction < 0
        ? Math.max(from.z, barrier.z + 0.78)
        : Math.min(from.z, barrier.z - 0.78);
      return { x: barrier.gapX, z: Number.isFinite(safeZ) ? safeZ : approachZ };
    }
    return { x: barrier.gapX, z: beyondZ };
  }

  function abandonedNavigationTarget(from, target) {
    if (state.scene !== "abandonedCastle") return target;
    const fromZone = abandonedNavigationZoneAt(from.x, from.z);
    const targetZone = abandonedNavigationZoneAt(target.x, target.z);
    if (!fromZone && targetZone && from.z > 87) {
      if (from.z > 118) return { x: 0, z: 116 };
      if (from.z > 90) return { x: 0, z: 89.7 };
      return { x: 0, z: 86.4 };
    }
    if (!fromZone || !targetZone) return target;
    // Two points in the long main corridor still need to pass every alternating
    // maze wall through its opening. Only ordinary rooms can take a direct path.
    if (fromZone.id === targetZone.id && fromZone.type !== "corridor") return target;
    if (fromZone.type === "corridor" && from.z > 88 && target.z < 88) return { x: 0, z: 87.2 };

    if (fromZone.type === "small") {
      const exitDoor = ABANDONED_DOORS.find((door) => door.connects.includes(fromZone.id));
      if (exitDoor && Math.hypot(from.x - exitDoor.x, from.z - exitDoor.z) > 0.8) return exitDoor;
      return ABANDONED_ROOMS.find((room) => room.id === `large-${fromZone.wing}`) || target;
    }

    if (fromZone.type === "large") {
      if (targetZone.type === "small" && targetZone.wing === fromZone.wing) {
        const roomDoor = ABANDONED_DOORS.find((door) => door.connects.includes(targetZone.id));
        if (roomDoor && Math.hypot(from.x - roomDoor.x, from.z - roomDoor.z) > 0.8) return roomDoor;
        return target;
      }
      const corridorDoor = ABANDONED_DOORS.find((door) => door.connects.includes(fromZone.id) && door.connects.includes("main-corridor"));
      if (corridorDoor && Math.hypot(from.x - corridorDoor.x, from.z - corridorDoor.z) > 0.8) return corridorDoor;
      return { x: 0, z: fromZone.z };
    }

    if (fromZone.type === "corridor" && targetZone.type !== "corridor") {
      const targetHall = targetZone.type === "large"
        ? targetZone
        : ABANDONED_ROOMS.find((room) => room.id === `large-${targetZone.wing}`);
      if (!targetHall) return target;
      if (Math.abs(from.z - targetHall.z) > 0.85) return abandonedMazeTransitTarget(from, { x: 0, z: targetHall.z });
      const corridorDoor = ABANDONED_DOORS.find((door) => door.connects.includes(targetHall.id) && door.connects.includes("main-corridor"));
      return corridorDoor || targetHall;
    }
    if (fromZone.type === "corridor" && targetZone.type === "corridor") return abandonedMazeTransitTarget(from, target);
    return target;
  }

  function abandonedMoneyPosition() {
    const room = ABANDONED_ROOMS.find((entry) => entry.id === ABANDONED_MONEY_ROOM_ID);
    return room ? { x: room.x + 2.15, z: room.z } : { x: 0, z: -84 };
  }

  function abandonedPartyMembers(party, aliveOnly = true) {
    return state.units.filter((unit) => {
      const belongs = party === "friendly" ? unit.broughtGuard && unit.team === 0 : unit.rivalParty && unit.team === 1;
      return belongs && (!aliveOnly || unit.alive);
    });
  }

  function abandonedSearchState(party) {
    const visit = state.abandonedCastleVisit;
    return party === "friendly" ? visit?.friendlySearch : visit?.rivalSearch;
  }

  function releaseAbandonedSearchClaims(party) {
    const search = abandonedSearchState(party);
    if (!search) return;
    const liveIds = new Set(abandonedPartyMembers(party).map((unit) => unit.id));
    Object.entries(search.claims).forEach(([roomId, unitId]) => {
      if (!liveIds.has(unitId)) delete search.claims[roomId];
    });
  }

  function markAbandonedTreasureFound(party, finder = null) {
    const search = abandonedSearchState(party);
    if (!search || search.treasureFound) return false;
    search.treasureFound = true;
    search.foundByUnitId = finder?.id || "player-king";
    search.foundAt = state.time;
    abandonedPartyMembers(party).forEach((unit) => {
      if (unit.searchTargetRoomId && search.claims[unit.searchTargetRoomId] === unit.id) delete search.claims[unit.searchTargetRoomId];
      unit.searchTargetRoomId = null;
    });
    if (party === "friendly") {
      search.announced = true;
      search.announcementCount++;
      showToast(finder?.broughtGuard ? TREASURE_FOUND_TEXT : "DU HITTADE SKATTKAMMAREN!", 3000);
    } else {
      search.announced = true;
      search.announcementCount++;
    }
    return true;
  }

  function abandonedRallyPosition(unit, party) {
    const room = ABANDONED_ROOMS.find((entry) => entry.id === ABANDONED_MONEY_ROOM_ID);
    if (!room) return abandonedMoneyPosition();
    const members = abandonedPartyMembers(party).sort((a, b) => a.id.localeCompare(b.id));
    const index = Math.max(0, members.findIndex((entry) => entry.id === unit.id));
    const columns = [-2.45, -0.85, 0.75, 2.35];
    const rows = [-2.05, 0, 2.05];
    return {
      x: room.x + columns[index % columns.length],
      z: room.z + rows[Math.floor(index / columns.length) % rows.length],
    };
  }

  function abandonedSearchGoal(unit, party) {
    const search = abandonedSearchState(party);
    if (!search) return null;
    releaseAbandonedSearchClaims(party);
    if (unit.searchTargetRoomId && search.searchedRoomIds.includes(unit.searchTargetRoomId)) {
      if (search.claims[unit.searchTargetRoomId] === unit.id) delete search.claims[unit.searchTargetRoomId];
      unit.searchTargetRoomId = null;
    }
    if (search.treasureFound) return abandonedRallyPosition(unit, party);
    if (!unit.searchTargetRoomId) {
      const nextRoomId = search.order.find((roomId) => !search.searchedRoomIds.includes(roomId) && !search.claims[roomId]);
      if (nextRoomId) {
        unit.searchTargetRoomId = nextRoomId;
        search.claims[nextRoomId] = unit.id;
      }
    }
    const targetRoom = ABANDONED_ROOMS.find((room) => room.id === unit.searchTargetRoomId);
    return targetRoom ? { x: targetRoom.x, z: targetRoom.z } : null;
  }

  function updateAbandonedSearchDiscoveries() {
    if (state.scene !== "abandonedCastle" || !state.abandonedCastleVisit) return;
    ["friendly", "rival"].forEach((party) => {
      if (party === "friendly" && state.abandonedCastleVisit.playerEscaping) return;
      if (party === "rival" && state.abandonedCastleVisit.rivalEscaping) return;
      const search = abandonedSearchState(party);
      if (!search) return;
      releaseAbandonedSearchClaims(party);
      abandonedPartyMembers(party).forEach((unit) => {
        const room = abandonedRoomAt(unit.x, unit.z);
        if (!room) return;
        if (!search.searchedRoomIds.includes(room.id)) search.searchedRoomIds.push(room.id);
        if (search.claims[room.id]) delete search.claims[room.id];
        if (unit.searchTargetRoomId === room.id) unit.searchTargetRoomId = null;
        if (room.id === ABANDONED_MONEY_ROOM_ID) markAbandonedTreasureFound(party, unit);
      });
    });
  }

  function moveUnit(unit, dx, dz) {
    const nextX = unit.x + dx;
    const nextZ = unit.z + dz;
    if (["stealth", "mineRaid", "mineDefense", "abandonedCastle"].includes(state.scene)) {
      if (!collides(nextX, unit.z, unit.y || 0)) unit.x = nextX;
      if (!collides(unit.x, nextZ, unit.y || 0)) unit.z = nextZ;
    } else {
      unit.x = nextX;
      unit.z = nextZ;
    }
    if (state.scene === "battle") {
      unit.x = clamp(unit.x, -23.5, 23.5);
      unit.z = clamp(unit.z, -32.5, 32.5);
    }
  }

  function unitAvoidance(unit) {
    let x = 0;
    let z = 0;
    state.units.forEach((other) => {
      if (other === unit || !other.alive || other.team !== unit.team) return;
      const dx = unit.x - other.x;
      const dz = unit.z - other.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= 1.3) return;
      if (distance < 0.001) {
        const side = unit.id < other.id ? -1 : 1;
        x += side;
        z -= side * 0.5;
        return;
      }
      const strength = (1.3 - distance) / 1.3;
      x += dx / distance * strength;
      z += dz / distance * strength;
    });
    return { x, z };
  }

  function rearBridgeWaypoint(from, target) {
    if (!["stealth", "mineRaid", "mineDefense"].includes(state.scene)) return null;
    const targetInsideCourtyard = Math.abs(target.x) < 19.1 && target.z > -12.8 && target.z < 12.8;
    if (targetInsideCourtyard && from.z < -13) {
      // First line up on the mine side, then stay centered until the actor is
      // through the rear doorway. This keeps units off the moat at an angle.
      if (from.z < -26.1 && Math.abs(from.x) > 1.7) return { x: 0, z: -26.2 };
      return { x: 0, z: -11.8 };
    }
    const targetBeyondMineSide = target.z < -27;
    if (targetBeyondMineSide && from.z > -27) {
      if (from.z > -13 && Math.abs(from.x) > 1.7) return { x: 0, z: -12 };
      return { x: 0, z: -27.25 };
    }
    return null;
  }

  function fireTracer(from, to, color = 0xffd45a) {
    const points = [new THREE.Vector3(from.x, (from.y || 0) + 1.45, from.z), new THREE.Vector3(to.x, (to.y || 0) + 1.2, to.z)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    line.userData.life = 0.18;
    effectRoot.add(line);
  }

  function isTowerArcher(unit) {
    return Boolean(unit?.fixed && unit.type === "archer");
  }

  function damageUnit(unit, amount) {
    if (!unit?.alive) return;
    // Tornskyttar stannar i tornen hela striden. De kan skjuta, men kan inte
    // skadas och räknas därför inte heller som markstridande i resultatet.
    if (isTowerArcher(unit)) return;
    if (unit.worker && state.mineRaid && !state.mineRaid.incoming) {
      const kingdom = state.kingdoms[state.mineRaid.target];
      if (unit.hp - amount <= 0 && kingdom.miners <= 1) {
        unit.hp = 1;
        showToast("FIENDERIKETS SISTA MINER KAN INTE TAS BORT", 1500);
        sfx("hit");
        return;
      }
    }
    unit.hp = Math.max(0, unit.hp - amount);
    const healsInAbandonedCastle = state.scene === "abandonedCastle"
      && !unit.statue
      && !unit.worker
      && (unit.king || UNIT_TYPES.includes(unit.type))
      && unit.hp > 0;
    if (healsInAbandonedCastle) {
      unit.abandonedDamagedAt = state.time;
      unit.abandonedHealSecondsRemaining = ABANDONED_HEAL_SECONDS;
    }
    if (unit.hp <= 0) {
      unit.alive = false;
      unit.cooldown = 999;
      if (unit.statue) {
        unit.awake = false;
        unit.respawnTimer = ABANDONED_STATUE_RESPAWN_SECONDS;
        if (state.abandonedCastleVisit) state.abandonedCastleVisit.statuesDefeated++;
      }
      if (unit.team === 0 && ["mineRaid", "mineDefense"].includes(state.scene) && UNIT_TYPES.includes(unit.sourceType) && !unit.lossRecorded) {
        unit.lossRecorded = true;
        state.guards[unit.sourceType] = Math.max(0, state.guards[unit.sourceType] - 1);
        normalizeTowerSlots();
        saveProgress();
      }
      if (unit.worker && state.mineRaid && !state.mineRaid.incoming) {
        const kingdom = state.kingdoms[state.mineRaid.target];
        kingdom.miners = Math.max(1, kingdom.miners - 1);
        state.mineRaid.defeatedMiners++;
        saveProgress();
      }
      if (unit.king && state.battle && unit.team === 1) {
        state.battle.enemyKingRespawnedAtHome = true;
        Object.assign(unit, { respawned: true, hp: 100, x: 0, y: 0, z: -38.5 });
      }
      if (unit.king && state.stealth && unit.team === 1) {
        state.stealth.enemyKingRespawnsAfterMission = true;
        Object.assign(unit, { respawned: true, hp: 100, x: -13.2, y: 0, z: 1.2 });
      }
      if (unit.king && state.mineRaid && unit.team === 1) {
        state.mineRaid.enemyKingRespawnedAtHome = true;
        Object.assign(unit, { respawned: true, hp: 100, x: 0, y: 0, z: 9 });
      }
      if (unit.king && state.mineDefense && unit.team === 1) {
        state.mineDefense.enemyKingRespawnedAtHome = true;
        Object.assign(unit, { respawned: true, hp: 100, x: 0, y: 0, z: -52 });
      }
      const model = actorModels.get(unit.id);
      if (model) model.userData.fall = unit.respawned ? 0 : 0.01;
    }
    sfx("hit");
  }

  function damagePlayer(amount) {
    if (!state.player.alive) return;
    state.player.hp = Math.max(0, state.player.hp - amount);
    if (state.scene === "abandonedCastle" && state.player.hp > 0) {
      state.player.abandonedDamagedAt = state.time;
      state.player.abandonedHealSecondsRemaining = ABANDONED_HEAL_SECONDS;
    }
    if (state.player.hp <= 0) {
      state.player.alive = false;
      if (state.scene === "stealth") {
        showToast("DU FÖLLER OCH BÖRJAR OM I DIN BORG", 1800);
        finishStealth(true);
      } else if (state.scene === "mineRaid") {
        finishMineRaid(
          "GRUVUPPDRAGET MISSLYCKADES",
          "Du började om i din borg. Besegrade miners förblir borta, men du lyckades inte stjäla någon.",
        );
      } else if (state.scene === "mineDefense") {
        state.mineDefense.playerKingRespawnedAtHome = true;
        state.player.x = 0;
        state.player.z = 9;
        state.player.y = 0;
        state.player.hp = 100;
        showToast("DU ÄR I BORGEN TILLS GRUVSTRIDEN ÄR ÖVER", 2300);
      } else if (state.scene === "abandonedCastle") {
        state.abandonedCastleVisit.playerKingRespawnedAtHome = true;
        finishAbandonedCastle(true);
      } else if (state.scene === "battle") {
        state.battle.playerKingRespawnedAtHome = true;
        showToast("DU ÄR TILLBAKA I BORGEN TILLS KRIGET ÄR ÖVER", 2300);
        state.player.x = 0;
        state.player.z = 38.5;
        state.player.y = 0;
        state.player.hp = 100;
      }
    }
    updateHud();
  }

  function unitUsesRangedWeapon(unit) {
    return unit.type === "archer" || (unit.king && unit.weapon === "bow");
  }

  function unitAttackRange(unit) {
    if (state.scene === "battle" && isTowerArcher(unit)) return COMBAT_RANGES.towerArcherBow;
    if (unit.king) return unit.weapon === "bow" ? COMBAT_RANGES.kingBow : COMBAT_RANGES.kingSword;
    if (unit.type === "archer") return COMBAT_RANGES.archerBow;
    if (unit.type === "cavalry") return COMBAT_RANGES.cavalrySpear;
    return COMBAT_RANGES.swordGuard;
  }

  function playerAttack() {
    enableSound();
    if (state.screen !== "playing" || state.modal || state.paused || !state.player.alive || state.player.attackCooldown > 0) return;
    if (!state.units.some((unit) => unit.alive && unit.team !== 0 && (!unit.statue || unit.awake))) {
      state.player.swing = 0.001;
      state.player.attackCooldown = state.weapon === "sword" ? 0.48 : 0.72;
      sfx(state.weapon);
      return;
    }
    const forward = { x: -Math.sin(state.player.yaw), z: -Math.cos(state.player.yaw) };
    const range = state.weapon === "sword" ? COMBAT_RANGES.kingSword : COMBAT_RANGES.kingBow;
    let target = null;
    let best = range;
    state.units.forEach((unit) => {
      if (!unit.alive || unit.team === 0 || (unit.statue && !unit.awake)) return;
      const dx = unit.x - state.player.x;
      const dz = unit.z - state.player.z;
      const distance = Math.hypot(dx, dz);
      if (distance > best) return;
      const dot = (dx * forward.x + dz * forward.z) / Math.max(0.001, distance);
      if (dot < (state.weapon === "sword" ? 0.45 : 0.965)) return;
      if (!hasLineOfSight(state.player, unit)) return;
      best = distance;
      target = unit;
    });
    state.player.swing = 0.001;
    state.player.attackCooldown = state.weapon === "sword" ? 0.48 : 0.72;
    sfx(state.weapon);
    if (target) {
      damageUnit(target, state.weapon === "sword" ? 34 : 25);
      if (state.weapon === "bow") fireTracer(state.player, target, 0x8fe8ff);
    } else if (state.weapon === "bow") {
      fireTracer(state.player, { x: state.player.x + forward.x * range, z: state.player.z + forward.z * range, y: state.player.y }, 0x8fe8ff);
    }
  }

  function updateAbandonedCastleVisit() {
    if (state.scene !== "abandonedCastle" || !state.abandonedCastleVisit) return;
    const visit = state.abandonedCastleVisit;
    const room = abandonedRoomAt(state.player.x, state.player.z);
    visit.currentRoomId = room?.id || null;
    if (room && !visit.visitedRoomIds.includes(room.id)) {
      visit.visitedRoomIds.push(room.id);
      if (room.id !== ABANDONED_MONEY_ROOM_ID && visit.friendlySearch.foundAt !== state.time) showToast(`${room.name} · ${visit.visitedRoomIds.length}/35 RUM BESÖKTA`, 1700);
    }
    const livingGuards = abandonedPartyMembers("friendly");
    if (room?.id === ABANDONED_MONEY_ROOM_ID) {
      visit.playerFoundTreasure = true;
      // With no surviving helpers, the king can open the treasury alone.
      // Otherwise the guards keep searching until one of them truly finds it
      // and calls the rest of the group over.
      if (livingGuards.length === 0) markAbandonedTreasureFound("friendly");
    }
    const guardsInside = livingGuards.filter((unit) => abandonedRoomAt(unit.x, unit.z)?.id === ABANDONED_MONEY_ROOM_ID);
    const playerInside = room?.id === ABANDONED_MONEY_ROOM_ID;
    visit.allFriendlyInsideTreasure = playerInside && guardsInside.length === livingGuards.length;
    const moneyInteraction = interactables.find((item) => item.kind === "infiniteMoney");

    if (!visit.treasureTimerStarted && visit.treasureAvailable && visit.friendlySearch.treasureFound && visit.allFriendlyInsideTreasure) {
      visit.treasureUnlocked = true;
      visit.treasureTimerStarted = true;
      visit.treasureStartedAt = state.time;
      if (moneyInteraction) moneyInteraction.label = `TA ${ABANDONED_MONEY_PER_TAKE} PENGAR · 30 SEKUNDER`;
      if (visit.friendlySearch.foundAt !== state.time) showToast("ALLA ÄR INNE · SKATTKAMMAREN ÄR ÖPPEN I 30 SEKUNDER!", 2600);
    } else if (moneyInteraction && !visit.treasureTimerStarted) {
      const missing = Math.max(0, livingGuards.length - guardsInside.length);
      moneyInteraction.label = visit.friendlySearch.treasureFound
        ? missing > 0 ? `VÄNTA PÅ ${missing} ${missing === 1 ? "VAKT" : "VAKTER"}` : "KUNGEN MÅSTE VARA I SKATTKAMMAREN"
        : visit.playerFoundTreasure ? "VÄNTA PÅ ATT EN VAKT HITTAR HIT" : "HITTA SKATTKAMMAREN I LABYRINTEN";
    }
  }

  function updateAbandonedTreasure(dt) {
    const visit = state.abandonedCastleVisit;
    if (state.scene !== "abandonedCastle" || !visit?.treasureTimerStarted || !visit.treasureAvailable) return;
    if (visit.treasureStartedAt === state.time) return;
    const activeDt = Math.min(dt, visit.treasureSecondsRemaining);
    visit.guardPayoutAccumulator += activeDt;
    while (visit.guardPayoutAccumulator >= 1 - 1e-9) {
      visit.guardPayoutAccumulator = Math.max(0, visit.guardPayoutAccumulator - 1);
      const helpingGuards = abandonedPartyMembers("friendly")
        .filter((unit) => abandonedRoomAt(unit.x, unit.z)?.id === ABANDONED_MONEY_ROOM_ID);
      const payout = helpingGuards.length * ABANDONED_GUARD_MONEY_PER_SECOND;
      if (payout > 0) {
        state.money += payout;
        visit.guardMoneyTaken += payout;
        visit.totalMoneyTaken += payout;
        visit.guardPayoutTicks = (visit.guardPayoutTicks || 0) + 1;
        saveProgress();
        updateHud();
      }
    }
    visit.treasureSecondsRemaining = Math.max(0, visit.treasureSecondsRemaining - activeDt);
    if (visit.treasureSecondsRemaining > 1e-9) return;
    visit.treasureSecondsRemaining = 0;
    visit.treasureAvailable = false;
    if (abandonedMoneyGroup) abandonedMoneyGroup.visible = false;
    for (let index = interactables.length - 1; index >= 0; index--) {
      if (interactables[index].kind === "infiniteMoney") interactables.splice(index, 1);
    }
    if (state.nearest?.kind === "infiniteMoney") state.nearest = null;
    showToast("DE 30 SEKUNDERNA ÄR SLUT · ALLA PENGAR FÖRSVANN", 2500);
  }

  function updateStatues(dt) {
    if (state.scene !== "abandonedCastle" || !state.abandonedCastleVisit) return;
    state.units.filter((unit) => unit.statue).forEach((unit) => {
      if (state.scene !== "abandonedCastle" || !state.abandonedCastleVisit) return;
      const model = actorModels.get(unit.id);
      const statueEyes = model?.userData.body?.userData.statueEyes;
      if (!unit.alive) {
        unit.respawnTimer = Math.max(0, unit.respawnTimer - dt);
        if (model) {
          model.userData.fall = Math.min(1, (model.userData.fall || 0) + dt * 2.8);
          model.rotation.z = -model.userData.fall * Math.PI / 2;
          model.position.y = unit.y + model.userData.fall * 0.2;
        }
        if (statueEyes) statueEyes.visible = false;
        if (unit.respawnTimer <= 1e-9) {
          unit.respawnTimer = 0;
          Object.assign(unit, {
            alive: true,
            hp: ABANDONED_STATUE_HP,
            awake: false,
            x: unit.originX,
            z: unit.originZ,
            cooldown: ABANDONED_STATUE_ATTACK_SECONDS,
            walk: 0,
          });
          if (model) {
            model.userData.fall = 0;
            model.rotation.z = 0;
            model.position.set(unit.x, unit.y, unit.z);
          }
          if (state.abandonedCastleVisit) state.abandonedCastleVisit.statueRespawns++;
        }
        return;
      }

      unit.cooldown -= dt;
      const room = ABANDONED_ROOMS.find((entry) => entry.id === unit.roomId);
      if (!room) return;
      const candidates = state.units.filter((other) => (
        other !== unit
        && !other.statue
        && other.alive
        && [0, 1].includes(other.team)
        && abandonedRoomAt(other.x, other.z)?.id === room.id
      ));
      if (state.player.alive && abandonedRoomAt(state.player.x, state.player.z)?.id === room.id) {
        candidates.push({ player: true, x: state.player.x, z: state.player.z, alive: true });
      }
      let target = null;
      let bestDistance = Infinity;
      candidates.forEach((candidate) => {
        const distance = Math.hypot(candidate.x - unit.x, candidate.z - unit.z);
        if (distance < bestDistance) { target = candidate; bestDistance = distance; }
      });

      if (target && !unit.awake) {
        unit.awake = true;
        unit.cooldown = Math.max(unit.cooldown, ABANDONED_STATUE_ATTACK_SECONDS);
        if (abandonedRoomAt(state.player.x, state.player.z)?.id === room.id && state.abandonedCastleVisit?.friendlySearch?.foundAt !== state.time) showToast(`STATYN I ${room.name} VAKNAR!`, 1600);
      }
      if (statueEyes) statueEyes.visible = unit.awake;

      if (!target) {
        const homeDistance = Math.hypot(unit.originX - unit.x, unit.originZ - unit.z);
        if (unit.awake && homeDistance > 0.18) {
          const move = Math.min(homeDistance, dt * 1.2);
          unit.x += (unit.originX - unit.x) / homeDistance * move;
          unit.z += (unit.originZ - unit.z) / homeDistance * move;
          unit.walk += dt * 4;
        } else {
          unit.x = unit.originX;
          unit.z = unit.originZ;
          unit.awake = false;
          if (statueEyes) statueEyes.visible = false;
        }
        if (model) animateActor(model, unit, dt);
        return;
      }

      const dx = target.x - unit.x;
      const dz = target.z - unit.z;
      const distance = Math.hypot(dx, dz) || 1;
      unit.facing = Math.atan2(dx, dz);
      if (distance > 2.55) {
        const move = Math.min(distance - 2.3, dt * 1.35);
        unit.x = clamp(unit.x + dx / distance * move, room.x - room.width / 2 + 0.8, room.x + room.width / 2 - 0.8);
        unit.z = clamp(unit.z + dz / distance * move, room.z - room.depth / 2 + 0.8, room.z + room.depth / 2 - 0.8);
        unit.walk += dt * 4.5;
      } else if (unit.cooldown <= 1e-9) {
        unit.cooldown = ABANDONED_STATUE_ATTACK_SECONDS;
        if (target.player) damagePlayer(32);
        else damageUnit(target, 32);
        if (state.scene !== "abandonedCastle" || !state.abandonedCastleVisit) return;
      }
      if (model) animateActor(model, unit, dt);
    });
  }

  function updateAbandonedCombatantHealing() {
    if (state.scene !== "abandonedCastle") return;
    state.units.forEach((unit) => {
      const isLivingCombatant = unit.alive
        && !unit.statue
        && !unit.worker
        && (unit.king || UNIT_TYPES.includes(unit.type));
      if (!isLivingCombatant || !Number.isFinite(unit.abandonedDamagedAt) || unit.hp >= unit.maxHp) return;
      const elapsed = Math.max(0, state.time - unit.abandonedDamagedAt);
      unit.abandonedHealSecondsRemaining = Math.max(0, ABANDONED_HEAL_SECONDS - elapsed);
      if (unit.abandonedHealSecondsRemaining > 1e-9) return;
      unit.hp = unit.maxHp;
      unit.abandonedDamagedAt = null;
      unit.abandonedHealSecondsRemaining = 0;
    });
    if (state.player.alive && Number.isFinite(state.player.abandonedDamagedAt) && state.player.hp < 100) {
      const elapsed = Math.max(0, state.time - state.player.abandonedDamagedAt);
      state.player.abandonedHealSecondsRemaining = Math.max(0, ABANDONED_HEAL_SECONDS - elapsed);
      if (state.player.abandonedHealSecondsRemaining <= 1e-9) {
        state.player.hp = 100;
        state.player.abandonedDamagedAt = null;
        state.player.abandonedHealSecondsRemaining = 0;
      }
    }
  }

  function updateUnits(dt) {
    const unitsAtFrameStart = state.units;
    const sceneAtFrameStart = state.scene;
    unitsAtFrameStart.some((unit) => {
      // A lethal hit can finish a mission, replace the unit list and respawn
      // the king at home. Stop this old frame immediately so stale enemies
      // cannot keep attacking the newly respawned player.
      if (state.units !== unitsAtFrameStart || state.scene !== sceneAtFrameStart) return true;
      if (unit.statue) return;
      const model = actorModels.get(unit.id);
      if (!unit.alive) {
        if (model) {
          if (unit.respawned) {
            model.rotation.z = 0;
            model.position.set(unit.x, unit.y || 0, unit.z);
            return;
          }
          model.userData.fall = Math.min(1, (model.userData.fall || 0) + dt * 2.8);
          model.rotation.z = -model.userData.fall * Math.PI / 2;
          model.position.y = unit.y + model.userData.fall * 0.2;
        }
        return;
      }
      unit.cooldown -= dt;
      if (unit.worker) {
        unit.walk += dt * 4.6;
        if (model) animateActor(model, unit, dt);
        return;
      }
      const ranged = unitUsesRangedWeapon(unit);
      const range = unitAttackRange(unit);
      const stealthAwareness = unit.team === 0 ? 12 : 15;
      const detectionRange = state.scene === "abandonedCastle"
        ? unit.rivalParty && unit.z > 90 ? 0 : 16
        : state.scene === "stealth"
          ? Math.max(stealthAwareness, range)
          : Infinity;
      const target = nearestEnemyTo(unit.x, unit.z, unit.team, detectionRange, state.scene === "mineRaid" && unit.team === 0);
      if (!target) {
        if (state.scene === "abandonedCastle" && (unit.broughtGuard || unit.rivalParty)) {
          const visit = state.abandonedCastleVisit;
          let goal = null;
          let stopDistance = 0.42;
          if (unit.broughtGuard) {
            if (visit.playerEscaping) {
              goal = unit.z < 87 ? { x: 0, z: 88 } : { x: 0, z: 145 };
              stopDistance = 0.4;
            } else {
              goal = visit.enteredCastle ? abandonedSearchGoal(unit, "friendly") : state.player;
              stopDistance = visit.enteredCastle ? 0.4 : 2.6;
            }
          } else if (unit.rivalParty) {
            const rivalRoom = abandonedRoomAt(unit.x, unit.z);
            if (unit.rival && !visit.rivalEscaping && visit.rivalSearch.treasureFound && visit.treasureAvailable && rivalRoom?.id === ABANDONED_MONEY_ROOM_ID) {
              visit.rivalReachedMoney = true;
              visit.rivalEscaping = true;
              visit.rivalStolenMoney = 100;
              showToast(`FIENDEKUNG ${unit.kingdom} TOG 100 PENGAR OCH FLYR!`, 2600);
            }
            if (visit.rivalEscaping) goal = unit.z < 87 ? { x: 0, z: 88 } : { x: 0, z: 145 };
            else if (unit.z > 118) goal = { x: 0, z: 116 };
            else if (unit.z > 87) goal = { x: 0, z: 86.4 };
            else goal = abandonedSearchGoal(unit, "rival");
          }
          if (goal) {
            const goalDistance = Math.hypot(goal.x - unit.x, goal.z - unit.z);
            if (goalDistance > stopDistance) {
              const moveTarget = abandonedNavigationTarget(unit, goal);
              const waypointDistance = Math.hypot(moveTarget.x - unit.x, moveTarget.z - unit.z) || 1;
              let moveX = (moveTarget.x - unit.x) / waypointDistance;
              let moveZ = (moveTarget.z - unit.z) / waypointDistance;
              const inNarrowLabyrinthPassage = Math.abs(unit.x) < 5.25 && unit.z > -92 && unit.z < 120;
              const avoidance = inNarrowLabyrinthPassage ? { x: 0, z: 0 } : unitAvoidance(unit);
              moveX += avoidance.x * 0.72;
              moveZ += avoidance.z * 0.72;
              const moveLength = Math.hypot(moveX, moveZ) || 1;
              moveX /= moveLength;
              moveZ /= moveLength;
              const speed = unit.type === "cavalry" ? 3.1 : unit.king ? 2.1 : 2.15;
              unit.facing = Math.atan2(moveX, moveZ);
              moveUnit(unit, moveX * speed * dt, moveZ * speed * dt);
              unit.walk += dt * speed * 3.2;
            }
          }
          if (visit.rivalEscaping && unit.rivalParty && unit.z > 138) {
            unit.escaped = true;
            unit.alive = false;
            unit.respawned = true;
            if (model) model.visible = false;
            if (unit.rival) {
              visit.rivalEscaped = true;
              showToast(`FIENDEKUNG ${unit.kingdom} FÖRSVANN IN I SKOGEN MED 100 PENGAR`, 2500);
            }
          }
        } else if (["stealth", "mineRaid"].includes(state.scene) && unit.team === 0 && !unit.fixed) {
          const followDistance = dist(unit, state.player);
          if (followDistance > 2.6) {
            const followSpeed = unit.type === "cavalry" ? 3.1 : 2.15;
            const followTarget = rearBridgeWaypoint(unit, state.player) || state.player;
            const waypointDistance = Math.hypot(followTarget.x - unit.x, followTarget.z - unit.z) || 1;
            const dx = (followTarget.x - unit.x) / waypointDistance;
            const dz = (followTarget.z - unit.z) / waypointDistance;
            unit.facing = Math.atan2(dx, dz);
            moveUnit(unit, dx * followSpeed * dt, dz * followSpeed * dt);
            unit.walk += dt * followSpeed * 3.2;
          }
        }
        if (model) animateActor(model, unit, dt);
        return;
      }
      const dx = target.x - unit.x;
      const dz = target.z - unit.z;
      const distance = Math.hypot(dx, dz) || 1;
      const dirX = dx / distance;
      const dirZ = dz / distance;
      const speed = unit.fixed ? 0 : unit.type === "cavalry" ? 3.1 : unit.king ? 2.1 : 1.75;
      unit.facing = Math.atan2(dirX, dirZ);
      const arenaTowerShot = state.scene === "battle" && isTowerArcher(unit);
      const lineOfSight = distance <= range && (arenaTowerShot || hasLineOfSight(unit, target, isTowerArcher(unit)));
      if (distance > range || !lineOfSight) {
        if (speed > 0) {
          const waypoint = state.scene === "abandonedCastle"
            ? abandonedNavigationTarget(unit, target)
            : rearBridgeWaypoint(unit, target);
          const moveTarget = waypoint || target;
          const moveDistance = Math.hypot(moveTarget.x - unit.x, moveTarget.z - unit.z) || 1;
          let moveX = (moveTarget.x - unit.x) / moveDistance;
          let moveZ = (moveTarget.z - unit.z) / moveDistance;
          unit.facing = Math.atan2(moveX, moveZ);
          if (["mineRaid", "mineDefense", "abandonedCastle"].includes(state.scene)) {
            const inNarrowLabyrinthPassage = state.scene === "abandonedCastle" && Math.abs(unit.x) < 5.25 && unit.z > -92 && unit.z < 120;
            const avoidance = inNarrowLabyrinthPassage ? { x: 0, z: 0 } : unitAvoidance(unit);
            moveX += avoidance.x * 1.15;
            moveZ += avoidance.z * 1.15;
            const moveLength = Math.hypot(moveX, moveZ) || 1;
            moveX /= moveLength;
            moveZ /= moveLength;
          }
          moveUnit(unit, moveX * speed * dt, moveZ * speed * dt);
          unit.walk += dt * speed * 3.2;
        }
      } else if (unit.cooldown <= 0) {
        unit.cooldown = ranged ? 1.25 : unit.type === "cavalry" ? 1.15 : 0.9;
        const damage = ranged ? 18 : unit.type === "cavalry" ? 30 : unit.king ? 25 : 24;
        if (target.player) damagePlayer(damage);
        else damageUnit(target, damage);
        if (state.units !== unitsAtFrameStart || state.scene !== sceneAtFrameStart) return true;
        if (ranged) fireTracer(unit, target, unit.team === 0 ? 0x72d6ff : 0xff765f);
      }
      if (model) animateActor(model, unit, dt);
      return false;
    });
  }

  function animateActor(model, unit, dt) {
    model.position.x = lerp(model.position.x, unit.x, clamp(dt * 12, 0, 1));
    model.position.z = lerp(model.position.z, unit.z, clamp(dt * 12, 0, 1));
    model.position.y = lerp(model.position.y, unit.y || floorHeight(unit.x, unit.z, unit.y || 0), clamp(dt * 10, 0, 1));
    model.rotation.y = unit.facing + Math.PI;
    const body = model.userData.body;
    if (!body) return;
    const stride = Math.sin(unit.walk) * 0.48;
    const leftLeg = body.userData.leftLeg;
    const rightLeg = body.userData.rightLeg;
    const leftArm = body.userData.leftArm;
    const rightArm = body.userData.rightArm;
    if (unit.worker) {
      const miningSwing = Math.sin(unit.walk);
      if (rightArm) rightArm.rotation.x = -0.72 + miningSwing * 0.78;
      if (leftArm) leftArm.rotation.x = 0.22 - miningSwing * 0.22;
      body.position.y = Math.max(0, miningSwing) * 0.025;
      return;
    }
    if (leftLeg) leftLeg.rotation.x = stride;
    if (rightLeg) rightLeg.rotation.x = -stride;
    if (leftArm) leftArm.rotation.x = -stride * 0.55;
    if (rightArm) rightArm.rotation.x = stride * 0.55;
    body.position.y = Math.abs(Math.sin(unit.walk)) * 0.05;
  }

  function updateHomeVisuals(dt) {
    homeGuardVisuals.forEach((entry, index) => {
      const distance = dist(entry.data, state.player);
      if (!entry.villager && distance < 3.2) entry.data.salute = 1;
      else entry.data.salute = Math.max(0, (entry.data.salute || 0) - dt * 1.4);
      const body = entry.model.userData.body;
      if (body?.userData.rightArm) body.userData.rightArm.rotation.z = -entry.data.salute * 1.9;
      if (entry.villager) {
        entry.data.x += Math.sin(state.time * 0.35 + index) * dt * 0.12;
        entry.data.z += Math.cos(state.time * 0.28 + index) * dt * 0.12;
        entry.model.position.set(entry.data.x, 0, entry.data.z);
        entry.model.rotation.y = state.time * 0.12 + index;
      } else {
        entry.model.rotation.y = Math.atan2(state.player.x - entry.data.x, state.player.z - entry.data.z) + Math.PI;
      }
    });
  }

  function updateMinerVisuals() {
    minerVisuals.forEach((entry) => {
      const body = entry.model.userData.body;
      const rightArm = body?.userData.rightArm;
      const leftArm = body?.userData.leftArm;
      const swing = Math.sin(state.time * 4.6 + entry.phase);
      if (rightArm) rightArm.rotation.x = -0.72 + swing * 0.78;
      if (leftArm) leftArm.rotation.x = 0.22 - swing * 0.22;
      if (body) body.position.y = Math.max(0, swing) * 0.025;
    });
  }

  function mineIncomeFor(miners = state.miners) {
    return MINE_INCOME[clamp(Math.floor(Number(miners) || 0), 0, MAX_MINERS)];
  }

  function updateMine(dt) {
    if (state.miners <= 0) {
      state.mineElapsed = 0;
      return;
    }
    state.mineElapsed += dt;
    while (state.mineElapsed + 1e-9 >= MINE_PAYOUT_SECONDS) {
      state.mineElapsed = Math.max(0, state.mineElapsed - MINE_PAYOUT_SECONDS);
      state.minePayouts++;
      const income = mineIncomeFor();
      const foundDiamond = state.minePayouts % MINE_DIAMOND_EVERY_PAYOUTS === 0;
      state.money += income;
      if (foundDiamond) state.diamonds++;
      saveProgress();
      updateHud();
      sfx("coin");
      showToast(foundDiamond ? `GRUVAN GAV ${income} PENGAR OCH 1 DIAMANT!` : `GRUVAN GAV ${income} PENGAR!`, 2300);
    }
  }

  function updateEnemyMines(dt) {
    let paid = false;
    state.kingdoms.slice(1).forEach((kingdom) => {
      kingdom.mineElapsed += dt;
      while (kingdom.mineElapsed + 1e-9 >= MINE_PAYOUT_SECONDS) {
        kingdom.mineElapsed = Math.max(0, kingdom.mineElapsed - MINE_PAYOUT_SECONDS);
        kingdom.money += mineIncomeFor(kingdom.miners);
        paid = true;
      }
    });
    if (paid) saveProgress();
  }

  function updateEffects(dt) {
    [...effectRoot.children].forEach((effect) => {
      if (effect.userData.lootId) {
        effect.rotation.y += dt * 1.8;
        effect.position.y += Math.sin(state.time * 3 + effect.position.x) * dt * 0.08;
        return;
      }
      if (typeof effect.userData.life === "number") {
        effect.userData.life -= dt;
        effect.material.opacity = clamp(effect.userData.life / 0.18, 0, 1);
        if (effect.userData.life <= 0) {
          effect.geometry.dispose?.();
          effect.material.dispose?.();
          effectRoot.remove(effect);
        }
      }
    });
  }

  function checkSceneResults(dt) {
    if (state.scene === "battle" && state.battle) {
      if (!state.battle.over) {
        const friendlyGroundCombatants = (state.player.alive ? 1 : 0)
          + state.units.filter((unit) => unit.team === 0 && unit.alive && !isTowerArcher(unit)).length;
        const enemyGroundCombatants = state.units.filter((unit) => unit.team === 1 && unit.alive && !isTowerArcher(unit)).length;
        if (enemyGroundCombatants === 0) finishBattle("win");
        else if (friendlyGroundCombatants === 0) finishBattle("lose");
      } else {
        state.battle.resultTimer -= dt;
        if (state.battle.resultTimer <= 0) resolveBattle();
      }
    } else if (state.scene === "mineDefense" && state.mineDefense) {
      if (!state.mineDefense.over) {
        const friendsAlive = (state.player.alive ? 1 : 0) + state.units.filter((unit) => unit.team === 0 && unit.alive).length;
        const enemiesAlive = state.units.filter((unit) => unit.team === 1 && unit.alive).length;
        if (enemiesAlive === 0) finishMineDefense("win");
        else if (friendsAlive === 0) finishMineDefense("lose");
      } else {
        state.mineDefense.resultTimer -= dt;
        if (state.mineDefense.resultTimer <= 0) resolveMineDefense();
      }
    }
  }

  function updateNearestInteraction() {
    state.nearest = null;
    if (state.scene === "home") {
      interactables.forEach((item) => {
        const distance = Math.hypot(item.x - state.player.x, item.z - state.player.z, (item.y || 0) - state.player.y);
        if (distance <= item.radius && (!state.nearest || distance < state.nearest.distance)) state.nearest = { ...item, distance };
      });
      if (state.phase === "night") {
        homeGuardVisuals.filter((entry) => !entry.villager && !entry.tower && !state.quickStealthIds.includes(entry.data.id)).forEach((entry) => {
          const distance = dist(entry.data, state.player);
          if (distance < 2.8 && (!state.nearest || distance < state.nearest.distance)) state.nearest = { kind: "guard", guardId: entry.data.id, type: entry.data.type, distance, label: "SMYG" };
        });
      }
      if (state.nearest?.kind === "tower" && (state.towerSlots[state.nearest.slot] || availableGuards("archer") <= 0)) state.nearest = null;
    } else if (state.scene === "stealth") {
      state.loot.filter((loot) => !loot.taken).forEach((loot) => {
        const distance = dist(loot, state.player);
        if (distance < 2.2 && (!state.nearest || distance < state.nearest.distance)) state.nearest = { kind: "loot", loot, distance, label: loot.kind === "diamond" ? "TA DIAMANTEN" : "TA PENGARNA" };
      });
    } else if (state.scene === "mineRaid") {
      const mine = interactables.find((item) => item.kind === "mine");
      if (mine) {
        const distance = Math.hypot(mine.x - state.player.x, mine.z - state.player.z);
        if (distance <= mine.radius) {
          const defendersAlive = state.units.some((unit) => unit.team === 1 && unit.alive && !unit.worker);
          state.nearest = { ...mine, distance, label: defendersAlive ? "BESEGRA GRUVANS VAKTER" : "STJÄL MINERS" };
        }
      }
    } else if (state.scene === "abandonedCastle") {
      interactables.forEach((item) => {
        const distance = Math.hypot(item.x - state.player.x, item.z - state.player.z);
        if (distance <= item.radius && (!state.nearest || distance < state.nearest.distance)) state.nearest = { ...item, distance };
      });
    }
    if (ui.prompt) {
      const visible = Boolean(state.nearest) && !state.modal;
      setVisible(ui.prompt, visible);
      if (visible) ui.prompt.innerHTML = `<kbd>E</kbd><span>${state.nearest.label}</span>`;
    }
  }

  function useInteraction() {
    if (state.modal || !state.nearest) return;
    const item = state.nearest;
    enableSound();
    if (item.kind === "map") openWorldMap();
    else if (item.kind === "bed") {
      if (state.phase === "night") showQuestion("VILL DU SOVA?", "Efter en sekund blir det morgon.", () => sleepOneSecond(), () => {});
      else showToast("DET ÄR DAG. DU BEHÖVER INTE SOVA ÄN.");
    } else if (item.kind === "shop") openShop();
    else if (item.kind === "mine") {
      if (state.scene === "mineRaid") stealFromEnemyMine();
      else if (state.miners <= 0) showToast("KÖP EN MINER I AFFÄREN FÖR ATT STARTA GRUVAN");
      else showToast(`${state.miners} MINERS JOBBAR · ${mineIncomeFor()} PENGAR VAR 30:E SEKUND`);
    }
    else if (item.kind === "tower") placeTowerArcher(item.slot);
    else if (item.kind === "infiniteMoney") {
      const visit = state.abandonedCastleVisit;
      if (!visit?.treasureTimerStarted || !visit.treasureAvailable) {
        const living = abandonedPartyMembers("friendly");
        const inside = living.filter((unit) => abandonedRoomAt(unit.x, unit.z)?.id === ABANDONED_MONEY_ROOM_ID);
        const missing = Math.max(0, living.length - inside.length);
        showToast(missing > 0 ? `VÄNTA PÅ ${missing} ${missing === 1 ? "VAKT" : "VAKTER"}` : "HELA GRUPPEN MÅSTE VARA I SKATTKAMMAREN");
        return;
      }
      state.money += ABANDONED_MONEY_PER_TAKE;
      visit.moneyTakes++;
      visit.totalMoneyTaken += ABANDONED_MONEY_PER_TAKE;
      saveProgress();
      sfx("coin");
      showToast(`DU TOG ${ABANDONED_MONEY_PER_TAKE} PENGAR · TA MER INNAN TIDEN ÄR SLUT`, 1600);
      updateHud();
    }
    else if (item.kind === "guard") {
      const total = Object.values(state.quickStealth).reduce((sum, value) => sum + value, 0);
      if (state.quickStealthIds.includes(item.guardId)) showToast("DEN VAKTEN ÄR REDAN VALD");
      else if (total >= 5 || state.quickStealth[item.type] >= availableGuards(item.type)) showToast("SMYGGRUPPEN ÄR REDAN FULL");
      else {
        state.quickStealth[item.type]++;
        state.quickStealthIds.push(item.guardId);
        showToast(`VAKTEN ÄR VALD FÖR SMYGUPPDRAGET (${total + 1}/5)`);
      }
    } else if (item.kind === "loot") {
      item.loot.taken = true;
      if (item.loot.kind === "diamond") state.diamonds += item.loot.amount;
      else state.money += item.loot.amount;
      saveProgress();
      item.loot.mesh?.removeFromParent();
      sfx("coin");
      showToast(item.loot.kind === "diamond" ? "DU HITTADE EN DIAMANT!" : `DU HITTADE ${item.loot.amount} PENGAR!`);
      updateHud();
    }
  }

  function switchWeapon() {
    state.weapon = state.weapon === "sword" ? "bow" : "sword";
    updateHud();
    sfx("click");
  }

  function updateCycle(dt) {
    if (["battle", "stealth", "mineRaid", "mineDefense", "abandonedCastle"].includes(state.scene)) return;
    if (state.sleeping > 0) {
      state.sleeping -= dt;
      if (state.sleeping <= 0) {
        state.phase = "day";
        state.phaseElapsed = 0;
        state.day++;
        state.askedNight = false;
        state.aiAttackTriggered = false;
        state.aiAttackAt = 35 + seeded() * 35;
        state.enemyWar = null;
        state.enemyWarTriggered = false;
        state.enemyWarAt = 24 + seeded() * 38;
        state.quickStealth = { sword: 0, archer: 0, cavalry: 0 };
        state.quickStealthIds = [];
        rebuildWorld();
        const hadSleepingRaid = Boolean(state.sleepRaidMessage);
        const morningMessage = state.sleepRaidMessage || "GOD MORGON!";
        state.sleepRaidMessage = "";
        showToast(morningMessage, hadSleepingRaid ? 3200 : 1800);
      }
      return;
    }
    state.phaseElapsed += dt;
    const duration = state.phase === "day" ? DAY_SECONDS : NIGHT_SECONDS;
    if (state.phaseElapsed >= duration) {
      state.phaseElapsed = 0;
      if (state.phase === "day") {
        finishEnemyWar(false);
        state.phase = "night";
        state.askedNight = false;
        state.nightMineRaidTriggered = false;
        state.nightMineRaidAt = 35 + seeded() * 55;
        state.sleepRaidMessage = "";
        rebuildWorld();
        startNightChoice();
      } else {
        state.phase = "day";
        state.day++;
        state.aiAttackTriggered = false;
        state.aiAttackAt = 35 + seeded() * 35;
        state.enemyWar = null;
        state.enemyWarTriggered = false;
        state.enemyWarAt = 24 + seeded() * 38;
        state.quickStealth = { sword: 0, archer: 0, cavalry: 0 };
        state.quickStealthIds = [];
        state.nightMineRaidTriggered = false;
        state.sleepRaidMessage = "";
        rebuildWorld();
        showToast("SOLEN GÅR UPP ÖVER RIKET");
      }
    }
    updateEnemyWar(dt);
    if (state.phase === "day" && !state.aiAttackTriggered && state.phaseElapsed >= state.aiAttackAt && !state.modal) {
      state.aiAttackTriggered = true;
      if (seeded() >= 0.58) {
        showToast("FIENDEKUNGARNA STANNAR I SINA BORGAR I DAG");
        return;
      }
      const availableAttackers = state.kingdoms.slice(1).filter((kingdom) => !kingdomAtEnemyWar(kingdom.index));
      if (!availableAttackers.length) return;
      const attacker = availableAttackers[Math.floor(seeded() * availableAttackers.length)].index;
      showToast(`FIENDEKUNG ${attacker} KOMMER MOT DIN BORG!`, 2100);
      openSelection("attack", attacker, 20, true);
    }
    if (state.phase === "night" && !state.nightMineRaidTriggered && state.phaseElapsed >= state.nightMineRaidAt && !state.modal) {
      if (state.miners > 0) {
        const attacker = chooseMineRaider();
        if (attacker) triggerIncomingMineRaid(attacker);
        else state.nightMineRaidTriggered = true;
      } else state.nightMineRaidTriggered = true;
    }
  }

  function update(dt) {
    if (state.screen !== "playing" || state.paused) return;
    state.time += dt;
    state.player.attackCooldown = Math.max(0, state.player.attackCooldown - dt);
    if (state.player.swing > 0) {
      state.player.swing += dt * 3.1;
      if (state.player.swing >= 1) state.player.swing = 0;
    }
    if (!state.modal || state.sleeping > 0) {
      updateCycle(dt);
      updateMine(dt);
      updateEnemyMines(dt);
      movePlayer(dt);
      updateAbandonedSearchDiscoveries();
      updateStatues(dt);
      updateUnits(dt);
      updateAbandonedCombatantHealing();
      updateAbandonedSearchDiscoveries();
      updateAbandonedCastleVisit();
      updateAbandonedTreasure(dt);
      updateHomeVisuals(dt);
      updateMinerVisuals();
      checkSceneResults(dt);
    }
    updateEffects(dt);
    updateLighting();
    updateNearestInteraction();
    updateCamera();
    updateHud();
  }

  function updateHud() {
    if (ui.healthValue) ui.healthValue.textContent = String(Math.round(state.player.hp));
    if (ui.healthFill) ui.healthFill.style.width = `${clamp(state.player.hp, 0, 100)}%`;
    if (ui.money) ui.money.textContent = String(state.money);
    if (ui.diamonds) ui.diamonds.textContent = String(state.diamonds);
    if (ui.phase) ui.phase.textContent = state.phase === "day" ? `DAG ${state.day}` : `NATT ${state.day}`;
    const duration = state.phase === "day" ? DAY_SECONDS : NIGHT_SECONDS;
    const remaining = Math.max(0, Math.ceil(duration - state.phaseElapsed));
    if (ui.clock) ui.clock.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    if (ui.weapon) ui.weapon.textContent = state.weapon === "sword" ? "SVÄRD" : "PILBÅGE";
    if (ui.followers) {
      const followers = ["battle", "stealth", "mineRaid", "mineDefense", "abandonedCastle"].includes(state.scene)
        ? state.units.filter((unit) => unit.team === 0 && unit.alive).length
        : Object.values(state.quickStealth).reduce((sum, value) => sum + value, 0);
      ui.followers.textContent = String(followers);
    }
  }

  function render() {
    if (contextLost) return;
    renderer.render(scene, camera);
  }

  function resize() {
    const rect = shell.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const pixelRatio = Math.min(devicePixelRatio || 1, touchDevice ? 1.25 : 1.7);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    if (contextLost) {
      rafId = 0;
      return;
    }
    const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (!manualMode) {
      accumulator += delta;
      while (accumulator >= FIXED_STEP) {
        update(FIXED_STEP);
        accumulator -= FIXED_STEP;
      }
    }
    render();
    rafId = contextLost ? 0 : requestAnimationFrame(frame);
  }

  function setPaused(paused) {
    if (state.screen !== "playing") return;
    if (paused) {
      state.pausedModal = state.modal;
      state.paused = true;
      setModal("pause", true);
    } else {
      const returnModal = state.pausedModal;
      state.pausedModal = null;
      state.paused = false;
      if (returnModal) setModal(returnModal, true);
      else setModal(null, false);
    }
  }

  function resetGame() {
    Object.assign(state, {
      screen: "playing", scene: "home", paused: false, pausedModal: null, modal: null, time: 0, phase: "day", phaseElapsed: 0, day: 1,
      sleeping: 0, askedNight: false, aiAttackTriggered: false, aiAttackAt: 42,
      enemyWar: null, enemyWarTriggered: false, enemyWarAt: 28, money: 50, diamonds: 0,
      guards: { sword: 0, archer: 0, cavalry: 0 }, towerSlots: [false, false, false, false],
      miners: 0, mineElapsed: 0, minePayouts: 0,
      kingdoms: makeKingdoms(),
      quickStealth: { sword: 0, archer: 0, cavalry: 0 }, quickStealthIds: [], weapon: "sword", units: [], loot: [], battle: null, stealth: null, mineRaid: null, mineDefense: null, abandonedCastleVisit: null, pendingMineDefense: null, loadNotice: "",
      nightMineRaidTriggered: false, nightMineRaidAt: 52, sleepRaidMessage: "", mineTransferId: 0, lastMineTransfer: null,
      selection: null, question: null, nearest: null, enteredEnemyCastle: false, deterministicSeed: INITIAL_SEED,
    });
    manualRemainderMs = 0;
    accumulator = 0;
    Object.keys(keys).forEach((key) => { keys[key] = false; });
    joystick.x = joystick.y = 0;
    joystick.pointerId = null;
    lookPointers.clear();
    clearTimeout(toastTimer);
    setVisible(ui.toast, false);
    resetPlayerForHome();
    setModal(null, false);
    rebuildWorld();
    updateHud();
    saveProgress();
  }

  function getAbandonedCastleLayout() {
    return {
      kind: "physical-serpentine-labyrinth",
      entrance: { x: 0, z: 90, width: 6.4 },
      forestSpawn: { player: { x: -6, z: 144 }, rivalKing: { x: 6, z: 144 } },
      exitToHome: { x: 0, z: 120, requiresPriorEntry: true },
      drawbridge: { x: 0, z: 103.5, width: 7, length: 27, lowered: true },
      moat: { surroundsCastle: true, bridgeIsOnlySafeFrontCrossing: true },
      rooms: ABANDONED_ROOMS.map((room) => ({
        id: room.id,
        name: room.name,
        type: room.type,
        wing: room.wing,
        x: room.x,
        z: room.z,
        width: room.width,
        depth: room.depth,
        bounds: {
          minX: room.x - room.width / 2,
          maxX: room.x + room.width / 2,
          minZ: room.z - room.depth / 2,
          maxZ: room.z + room.depth / 2,
        },
        connectsTo: [...room.connectsTo],
        hasStatue: true,
      })),
      doors: ABANDONED_DOORS.map((door) => ({ ...door, connects: [...door.connects] })),
      mazeBarriers: ABANDONED_MAZE_BARRIERS.map((barrier) => ({ ...barrier })),
      reachableRoomIds: ABANDONED_ROOMS.map((room) => room.id),
      reachableRoomCount: ABANDONED_ROOMS.length,
      largeRoomCount: ABANDONED_ROOMS.filter((room) => room.type === "large").length,
      smallRoomCount: ABANDONED_ROOMS.filter((room) => room.type === "small").length,
      wallSegmentsBuilt: abandonedWallSegmentsBuilt,
      colliderCount: colliders.length,
    };
  }

  function renderGameToText() {
    const nearbyUnits = state.units
      .filter((unit) => unit.alive && dist(unit, state.player) < 18)
      .slice(0, 16)
      .map((unit) => ({
        id: unit.id, team: unit.team, type: unit.type, king: unit.king, worker: unit.worker,
        statue: unit.statue, shield: unit.shield, weapon: unit.weapon, rivalParty: unit.rivalParty,
        broughtGuard: unit.broughtGuard, searchParty: unit.searchParty, searchTargetRoomId: unit.searchTargetRoomId,
        abandonedHealSecondsRemaining: rounded(unit.abandonedHealSecondsRemaining || 0),
        roomId: abandonedRoomAt(unit.x, unit.z)?.id || null,
        x: rounded(unit.x), y: rounded(unit.y || 0), z: rounded(unit.z), hp: unit.hp, maxHp: unit.maxHp,
        distance: rounded(dist(unit, state.player)),
      }));
    const duration = state.phase === "day" ? DAY_SECONDS : NIGHT_SECONDS;
    const abandonedVisitState = state.abandonedCastleVisit;
    const friendlyBrought = abandonedVisitState ? abandonedPartyMembers("friendly", false) : [];
    const friendlyAlive = friendlyBrought.filter((unit) => unit.alive);
    const friendlyInsideTreasure = friendlyAlive.filter((unit) => abandonedRoomAt(unit.x, unit.z)?.id === ABANDONED_MONEY_ROOM_ID);
    const playerInsideTreasure = abandonedRoomAt(state.player.x, state.player.z)?.id === ABANDONED_MONEY_ROOM_ID;
    const abandonedCastleState = abandonedVisitState ? {
      phase: !abandonedVisitState.treasureAvailable ? "expired" : abandonedVisitState.treasureTimerStarted ? "earning" : abandonedVisitState.friendlySearch.treasureFound ? "gathering" : "searching",
      enteredCastle: abandonedVisitState.enteredCastle,
      playerFoundTreasure: abandonedVisitState.playerFoundTreasure,
      playerEscaping: abandonedVisitState.playerEscaping,
      currentRoomId: abandonedVisitState.currentRoomId,
      visitedRoomIds: [...abandonedVisitState.visitedRoomIds],
      visitedRoomCount: abandonedVisitState.visitedRoomIds.length,
      layout: getAbandonedCastleLayout(),
      friendlySearch: {
        searchedRoomIds: [...abandonedVisitState.friendlySearch.searchedRoomIds],
        claims: { ...abandonedVisitState.friendlySearch.claims },
        treasureFound: abandonedVisitState.friendlySearch.treasureFound,
        foundByUnitId: abandonedVisitState.friendlySearch.foundByUnitId,
        foundAt: abandonedVisitState.friendlySearch.foundAt,
        announced: abandonedVisitState.friendlySearch.announced,
        announcementCount: abandonedVisitState.friendlySearch.announcementCount,
        exactGuardCallout: TREASURE_FOUND_TEXT,
      },
      rivalSearch: {
        searchedRoomIds: [...abandonedVisitState.rivalSearch.searchedRoomIds],
        claims: { ...abandonedVisitState.rivalSearch.claims },
        treasureFound: abandonedVisitState.rivalSearch.treasureFound,
        foundByUnitId: abandonedVisitState.rivalSearch.foundByUnitId,
        foundAt: abandonedVisitState.rivalSearch.foundAt,
        announcementCount: abandonedVisitState.rivalSearch.announcementCount,
      },
      friendlyGuards: {
        broughtIds: friendlyBrought.map((unit) => unit.id),
        aliveIds: friendlyAlive.map((unit) => unit.id),
        insideTreasureIds: friendlyInsideTreasure.map((unit) => unit.id),
        allSurvivorsInsideTreasure: abandonedVisitState.allFriendlyInsideTreasure,
      },
      playerInsideTreasure,
      treasure: {
        roomId: ABANDONED_MONEY_ROOM_ID,
        unlocked: abandonedVisitState.treasureUnlocked,
        timerStarted: abandonedVisitState.treasureTimerStarted,
        secondsRemaining: rounded(abandonedVisitState.treasureSecondsRemaining),
        available: abandonedVisitState.treasureAvailable,
        moneyPerPlayerUse: ABANDONED_MONEY_PER_TAKE,
        moneyPerGuardPerSecond: ABANDONED_GUARD_MONEY_PER_SECOND,
        guardPayoutAccumulator: rounded(abandonedVisitState.guardPayoutAccumulator),
        guardPayoutTicks: abandonedVisitState.guardPayoutTicks || 0,
        guardMoneyTaken: abandonedVisitState.guardMoneyTaken,
        playerMoneyTakes: abandonedVisitState.moneyTakes,
        totalMoneyTaken: abandonedVisitState.totalMoneyTaken,
        pileVisible: Boolean(abandonedMoneyGroup?.visible),
      },
      combatantHealing: {
        onlyInAbandonedCastle: true,
        secondsAfterLastDamage: ABANDONED_HEAL_SECONDS,
        restoresToFull: true,
        appliesTo: ["friendlyGuards", "enemyGuards", "playerKing", "enemyKing"],
        recovering: state.units.filter((unit) => unit.alive && Number.isFinite(unit.abandonedDamagedAt) && unit.hp < unit.maxHp).map((unit) => ({
          id: unit.id,
          hp: unit.hp,
          maxHp: unit.maxHp,
          secondsRemaining: rounded(unit.abandonedHealSecondsRemaining || 0),
        })).concat(Number.isFinite(state.player.abandonedDamagedAt) && state.player.hp < 100 ? [{
          id: "player-king",
          hp: state.player.hp,
          maxHp: 100,
          secondsRemaining: rounded(state.player.abandonedHealSecondsRemaining || 0),
        }] : []),
      },
      statues: state.units.filter((unit) => unit.statue).map((unit) => ({
        id: unit.id, roomId: unit.roomId, hp: unit.hp, maxHp: unit.maxHp, alive: unit.alive,
        awake: unit.awake, respawnSecondsRemaining: rounded(unit.respawnTimer), weapon: unit.weapon,
        shield: unit.shield, attackEverySeconds: ABANDONED_STATUE_ATTACK_SECONDS,
      })),
      statuesDefeated: abandonedVisitState.statuesDefeated,
      statueRespawns: abandonedVisitState.statueRespawns,
      rival: {
        kingdom: abandonedVisitState.rivalKingdom,
        kingId: abandonedVisitState.rivalKingId,
        guardIds: [...abandonedVisitState.rivalGuardIds],
        guardCount: abandonedVisitState.rivalGuardIds.length,
        reachedMoney: abandonedVisitState.rivalReachedMoney,
        escaping: abandonedVisitState.rivalEscaping,
        escaped: abandonedVisitState.rivalEscaped,
        stolenMoney: abandonedVisitState.rivalStolenMoney,
      },
    } : null;
    return JSON.stringify({
      coordinateSystem: "origin is the castle courtyard center; x increases east/right, z increases south/toward the drawbridge; y is height; yaw 0 looks north (-z)",
      graphics: "real-time WebGL 3D, Paint War 2 Deluxe inspired low-poly PBR",
      screen: state.screen,
      scene: state.scene,
      paused: state.paused,
      pausedModal: state.pausedModal,
      modal: state.modal,
      dialog: state.modal ? {
        type: state.modal,
        title: state.modal === "question" ? ui.questionTitle?.textContent : state.modal === "selection" ? ui.selectionTitle?.textContent : state.modal === "outcome" ? ui.outcomeTitle?.textContent : null,
        text: state.modal === "question" ? ui.questionText?.textContent : state.modal === "selection" ? ui.selectionCopy?.textContent : state.modal === "outcome" ? ui.outcomeText?.textContent : null,
        mode: state.modal === "question" ? ui.question?.dataset.mode || "confirm" : null,
        actions: state.modal === "question" ? {
          yes: ui.questionYes?.textContent,
          no: ui.questionNo?.textContent,
          back: ui.questionBack && !ui.questionBack.hidden ? ui.questionBack.textContent : null,
          actionIds: ui.question?.dataset.mode === "mission" ? ["castleStealth", "mineRaid"] : null,
        } : null,
      } : null,
      dayNight: { phase: state.phase, day: state.day, elapsedSeconds: rounded(state.phaseElapsed), remainingSeconds: rounded(duration - state.phaseElapsed), durationSeconds: duration, sleepingSeconds: rounded(state.sleeping), mineRaidTriggered: state.nightMineRaidTriggered, mineRaidAtSeconds: rounded(state.nightMineRaidAt), enemyWarTriggered: state.enemyWarTriggered, enemyWarAtSeconds: rounded(state.enemyWarAt) },
      player: { x: rounded(state.player.x), y: rounded(state.player.y), z: rounded(state.player.z), yaw: rounded(state.player.yaw), pitch: rounded(state.player.pitch), hp: state.player.hp, alive: state.player.alive, weapon: state.weapon, abandonedHealSecondsRemaining: rounded(state.player.abandonedHealSecondsRemaining || 0) },
      resources: { money: state.money, diamonds: state.diamonds, diamondSellValue: 10 },
      mine: {
        behindPlayerCastle: true,
        miners: state.miners,
        maxMiners: MAX_MINERS,
        minerPrice: MINER_PRICE,
        incomePer30Seconds: mineIncomeFor(),
        incomeTable: MINE_INCOME.slice(1),
        elapsedSeconds: rounded(state.mineElapsed),
        secondsUntilPayout: state.miners > 0 ? rounded(MINE_PAYOUT_SECONDS - state.mineElapsed) : null,
        payouts: state.minePayouts,
        diamondEveryPayouts: MINE_DIAMOND_EVERY_PAYOUTS,
        visibleMiners: ["home", "mineDefense"].includes(state.scene) ? minerVisuals.filter((entry) => !entry.enemy).length : state.miners,
      },
      castle: {
        rearDoor: { open: true, x: 0, z: -14, width: CASTLE_GATE_WIDTH, leadsTo: "mine" },
        rearDrawbridge: { ...REAR_DRAWBRIDGE, lowered: true, crossesMoat: true },
      },
      combatRanges: { ...COMBAT_RANGES },
      guards: {
        owned: { ...state.guards },
        available: Object.fromEntries(UNIT_TYPES.map((type) => [type, availableGuards(type)])),
        visibleInCastle: Object.fromEntries(UNIT_TYPES.map((type) => [type, homeGuardVisuals.filter((entry) => !entry.villager && entry.data.type === type).length])),
        towerSlots: [...state.towerSlots],
        quickStealth: { ...state.quickStealth },
        quickStealthIds: [...state.quickStealthIds],
        unnamed: true,
      },
      kingdoms: {
        total: 7,
        player: 1,
        bots: 6,
        castlesIdentical: true,
        villagesPerKingdom: 1,
        entries: state.kingdoms.map((kingdom) => ({ index: kingdom.index, player: kingdom.player, miners: kingdom.index === 0 ? state.miners : kingdom.miners, money: kingdom.index === 0 ? state.money : kingdom.money, towerArchers: kingdom.towerArchers })),
      },
      worldMap: {
        kingdoms: 7,
        castles: 8,
        playerCastles: 1,
        enemyCastles: 6,
        abandonedCastles: 1,
        abandonedCastle: { ...ABANDONED_CASTLE },
        enemyWar: state.enemyWar ? { ...state.enemyWar, remaining: rounded(state.enemyWar.remaining), blockedKingdoms: [state.enemyWar.attacker, state.enemyWar.defender] } : null,
      },
      abandonedCastleVisit: abandonedCastleState,
      nearestInteraction: state.nearest ? { kind: state.nearest.kind, label: state.nearest.label, distance: rounded(state.nearest.distance) } : null,
      battle: state.battle ? {
        target: state.battle.target,
        incoming: state.battle.incoming,
        selected: state.battle.counts,
        over: state.battle.over,
        result: state.battle.result,
        playerKingRespawnedAtHome: state.battle.playerKingRespawnedAtHome,
        enemyKingRespawnedAtHome: state.battle.enemyKingRespawnedAtHome,
        friendlyAlive: state.units.filter((unit) => unit.team === 0 && unit.alive).length + (state.player.alive ? 1 : 0),
        enemyAlive: state.units.filter((unit) => unit.team === 1 && unit.alive).length,
        friendlyGroundCombatantsAlive: state.units.filter((unit) => unit.team === 0 && unit.alive && !isTowerArcher(unit)).length + (state.player.alive ? 1 : 0),
        enemyGroundCombatantsAlive: state.units.filter((unit) => unit.team === 1 && unit.alive && !isTowerArcher(unit)).length,
        towerArchersAlive: state.units.filter((unit) => unit.alive && isTowerArcher(unit)).length,
        towerArchersInvulnerable: true,
        towerArchersCountTowardOutcome: false,
        towerArchersCoverWholeArena: true,
        towerArcherArenaRange: COMBAT_RANGES.towerArcherBow,
      } : null,
      stealth: state.stealth ? { target: state.stealth.target, selected: state.stealth.counts, enteredCastle: state.enteredEnemyCastle, enemyKingRespawnsAfterMission: state.stealth.enemyKingRespawnsAfterMission, lootRemaining: state.loot.filter((loot) => !loot.taken).map((loot) => loot.kind) } : null,
      mineRaid: state.mineRaid ? {
        direction: "outgoing",
        target: state.mineRaid.target,
        selected: state.mineRaid.counts,
        defeatedMiners: state.mineRaid.defeatedMiners,
        stolenMiners: state.mineRaid.stolenMiners,
        resolved: state.mineRaid.resolved,
        enemyKingRespawnedAtHome: state.mineRaid.enemyKingRespawnedAtHome,
        enemyMinersRemaining: state.kingdoms[state.mineRaid.target].miners,
        workersAlive: state.units.filter((unit) => unit.worker && unit.alive).length,
        defendersAlive: state.units.filter((unit) => unit.team === 1 && !unit.worker && unit.alive).length,
        transferable: Math.min(Math.max(0, state.kingdoms[state.mineRaid.target].miners - 1), MAX_MINERS - state.miners),
      } : null,
      mineDefense: state.mineDefense ? {
        direction: "incoming",
        attacker: state.mineDefense.attacker,
        selected: state.mineDefense.counts,
        over: state.mineDefense.over,
        result: state.mineDefense.result,
        stolenMiners: state.mineDefense.stolenMiners,
        theftRequested: state.mineDefense.theftRequested,
        playerKingRespawnedAtHome: state.mineDefense.playerKingRespawnedAtHome,
        enemyKingRespawnedAtHome: state.mineDefense.enemyKingRespawnedAtHome,
        friendlyAlive: state.units.filter((unit) => unit.team === 0 && unit.alive).length + (state.player.alive ? 1 : 0),
        enemyAlive: state.units.filter((unit) => unit.team === 1 && unit.alive).length,
      } : null,
      pendingMineDefense: state.pendingMineDefense ? { ...state.pendingMineDefense } : null,
      lastMineTransfer: state.lastMineTransfer ? { ...state.lastMineTransfer } : null,
      selection: state.selection ? { kind: state.selection.kind, target: state.selection.target, max: state.selection.max, counts: { ...state.selection.counts }, minimums: { ...state.selection.minimums }, incoming: state.selection.incoming } : null,
      loot: state.loot.filter((loot) => !loot.taken).map((loot) => ({ kind: loot.kind, amount: loot.amount, x: loot.x, z: loot.z })),
      fallenUnits: state.units.filter((unit) => !unit.alive && !unit.respawned).map((unit) => ({ team: unit.team, type: unit.type, x: rounded(unit.x), z: rounded(unit.z) })),
      nearbyUnits,
      controls: { keyboard: "WASD move, drag/mouse look, E use, click/space attack, Q switch weapon, F fullscreen, Esc pause", touch: "left joystick move, drag free game view to look, Attack/Use/Switch buttons" },
    });
  }

  function bindJoystick() {
    if (!ui.joystick) return;
    const updateStick = (event) => {
      const rect = ui.joystick.getBoundingClientRect();
      const radius = rect.width * 0.34;
      let x = (event.clientX - (rect.left + rect.width / 2)) / radius;
      let y = (event.clientY - (rect.top + rect.height / 2)) / radius;
      const length = Math.hypot(x, y);
      if (length > 1) { x /= length; y /= length; }
      joystick.x = x;
      joystick.y = y;
      if (ui.joystickKnob) ui.joystickKnob.style.transform = `translate(${x * radius * 0.65}px, ${y * radius * 0.65}px)`;
    };
    ui.joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      joystick.pointerId = event.pointerId;
      ui.joystick.setPointerCapture?.(event.pointerId);
      updateStick(event);
    });
    ui.joystick.addEventListener("pointermove", (event) => { if (joystick.pointerId === event.pointerId) updateStick(event); });
    const release = (event) => {
      if (joystick.pointerId !== event.pointerId) return;
      resetJoystickInput();
    };
    ui.joystick.addEventListener("pointerup", release);
    ui.joystick.addEventListener("pointercancel", release);
    ui.joystick.addEventListener("lostpointercapture", release);
  }

  function bindLook() {
    let mouseLooking = false;
    let lastX = 0;
    let lastY = 0;
    let mouseTravel = 0;
    canvas.addEventListener("pointerdown", (event) => {
      if (state.screen !== "playing" || state.modal || event.target !== canvas || joystick.pointerId === event.pointerId) return;
      enableSound();
      if (event.pointerType === "mouse" && event.button === 0) {
        mouseLooking = true;
        mouseTravel = 0;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture?.(event.pointerId);
      } else {
        lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        canvas.setPointerCapture?.(event.pointerId);
      }
    });
    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerType === "mouse" && mouseLooking) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        mouseTravel += Math.hypot(dx, dy);
        state.player.yaw -= dx * 0.004;
        state.player.pitch = clamp(state.player.pitch - dy * 0.0032, -0.72, 0.68);
        lastX = event.clientX;
        lastY = event.clientY;
      } else if (lookPointers.has(event.pointerId)) {
        const last = lookPointers.get(event.pointerId);
        state.player.yaw -= (event.clientX - last.x) * 0.006;
        state.player.pitch = clamp(state.player.pitch - (event.clientY - last.y) * 0.0045, -0.72, 0.68);
        last.x = event.clientX;
        last.y = event.clientY;
      }
    });
    const stopLook = (event, allowAttack = false) => {
      if (event.pointerType === "mouse") {
        if (allowAttack && mouseLooking && mouseTravel < 5) playerAttack();
        mouseLooking = false;
      }
      lookPointers.delete(event.pointerId);
    };
    resetLookInput = () => {
      mouseLooking = false;
      mouseTravel = 0;
      lookPointers.clear();
    };
    canvas.addEventListener("pointerup", (event) => stopLook(event, true));
    canvas.addEventListener("pointercancel", (event) => stopLook(event));
    canvas.addEventListener("lostpointercapture", (event) => stopLook(event));
  }

  function bindUi() {
    ui.start?.addEventListener("click", startGame);
    ui.questionYes?.addEventListener("click", () => answerQuestion(true));
    ui.questionNo?.addEventListener("click", () => answerQuestion(false));
    ui.questionBack?.addEventListener("click", backQuestion);
    ui.closeMap?.addEventListener("click", () => setModal(null, false));
    ui.selectionConfirm?.addEventListener("click", confirmSelection);
    ui.selectionCancel?.addEventListener("click", () => {
      const selection = state.selection;
      state.selection = null;
      setModal(null, false);
      if (selection?.kind === "mineDefense" && selection.incoming) startMineDefense(selection.target, { sword: 0, archer: 0, cavalry: 0 });
      else if (selection?.incoming) startBattle(selection.target, { ...selection.minimums }, true);
      else if (selection?.kind === "abandonedCastle") openWorldMap();
      else if (selection && ["stealth", "mineRaid"].includes(selection.kind)) showNightMissionChoice(selection.target);
    });
    $$('[data-unit][data-delta]').forEach((button) => button.addEventListener("click", () => adjustSelection(button.dataset.unit, Number(button.dataset.delta))));
    $$('[data-buy]').forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.buy === "miner") buyMiner();
      else buyGuards(button.dataset.buy);
    }));
    ui.sellDiamond?.addEventListener("click", sellDiamond);
    ui.closeShop?.addEventListener("click", () => setModal(null, false));
    ui.outcomeContinue?.addEventListener("click", () => setModal(null, false));
    ui.pauseButton?.addEventListener("click", () => setPaused(true));
    ui.resume?.addEventListener("click", () => setPaused(false));
    ui.restart?.addEventListener("click", resetGame);
    ui.attack?.addEventListener("pointerdown", (event) => { event.preventDefault(); playerAttack(); });
    ui.use?.addEventListener("click", useInteraction);
    ui.switchWeapon?.addEventListener("click", switchWeapon);
    ui.fullscreen?.addEventListener("click", () => {
      if (!document.fullscreenElement) shell.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
    window.addEventListener("keydown", (event) => {
      keys[event.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
      if (event.code === "KeyE") useInteraction();
      if (event.code === "KeyQ") switchWeapon();
      if (event.code === "Space") playerAttack();
      if (event.code === "KeyF") ui.fullscreen?.click();
      if (event.code === "Escape" && state.screen === "playing") setPaused(!state.paused);
    });
    window.addEventListener("keyup", (event) => { keys[event.code] = false; });
    window.addEventListener("blur", resetControls);
    window.addEventListener("pagehide", saveProgress);
    document.addEventListener("visibilitychange", () => { if (document.hidden) saveProgress(); });
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    canvas.addEventListener("webglcontextlost", handleWebGLContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleWebGLContextRestored, false);
    bindJoystick();
    bindLook();
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    manualMode = true;
    const stepMs = 1000 / 60;
    const totalMs = manualRemainderMs + Math.max(0, Number(ms) || 0);
    const steps = Math.floor(totalMs / stepMs + 1e-9);
    manualRemainderMs = totalMs - steps * stepMs;
    for (let i = 0; i < steps; i++) update(FIXED_STEP);
    render();
  };
  window.WarOfKingdoms = {
    state,
    startGame,
    openWorldMap,
    setPhase(phase, elapsed = 0) {
      if (!["day", "night"].includes(phase)) return;
      if (phase === "night") finishEnemyWar(false);
      state.phase = phase;
      state.phaseElapsed = elapsed;
      state.askedNight = phase === "night";
      rebuildWorld();
      updateHud();
    },
    startBattle: (target = 1, counts = { sword: 1, archer: 1, cavalry: 1 }, incoming = false) => startBattle(target, counts, incoming),
    startStealth: (target = 1, counts = { sword: 0, archer: 0, cavalry: 0 }) => startStealth(target, counts),
    startMineRaid: (target = 1, counts = { sword: 0, archer: 0, cavalry: 0 }) => startMineRaid(target, counts),
    startMineDefense: (attacker = 1, counts = { sword: 0, archer: 0, cavalry: 0 }) => startMineDefense(attacker, counts),
    startAbandonedCastle: (counts = { sword: 0, archer: 0, cavalry: 0 }) => startAbandonedCastle(counts),
    finishAbandonedCastle,
    startEnemyWar,
    finishEnemyWar,
    getAbandonedCastleLayout,
    getAbandonedNavigationTarget: (from, target) => abandonedNavigationTarget(from, target),
    collisionProbe: (x, y, z) => collides(Number(x) || 0, Number(z) || 0, Number(y) || 0),
    setPlayerPosition(x, z, y = 0) {
      Object.assign(state.player, { x: Number(x) || 0, z: Number(z) || 0, y: Number(y) || 0 });
      updateCamera();
    },
    setUnitPosition(id, x, z, y = null) {
      const unit = state.units.find((entry) => entry.id === id);
      if (!unit) return false;
      unit.x = Number(x) || 0;
      unit.z = Number(z) || 0;
      if (Number.isFinite(Number(y))) unit.y = Number(y);
      return true;
    },
    finishMineDefense,
    resolveMineDefense,
    stealFromEnemyMine,
    triggerIncomingMineRaid,
    resolveSleepingMineRaid,
    calculateMineTransfer,
    applyMineTransfer,
    damagePlayer,
    damageUnit,
    isTowerArcher,
    playerAttack,
    unitAttackRange,
    mineIncomeFor,
    buyMiner,
    combatRanges: COMBAT_RANGES,
    useInteraction,
    resetGame,
  };

  loadProgress();
  bindUi();
  resize();
  rebuildWorld();
  updateCamera();
  updateHud();
  render();
  rafId = requestAnimationFrame(frame);
})();
