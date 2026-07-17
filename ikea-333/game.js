import * as THREE from "three";
import { JOURNEY_ORDER, CHAPTER_INFO, buildJourneyWorld, disposeJourneyWorld } from "./journey-worlds.js?v=5";

const canvas = document.getElementById("gameCanvas");
const frameElement = canvas.closest(".canvas-frame");
const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");
const gameStatus = document.getElementById("gameStatus");
const fullscreenButton = document.getElementById("fullscreenButton");
const touchControls = document.getElementById("touchControls");
const touchJoystick = document.getElementById("touchJoystick");
const touchKnob = document.getElementById("touchKnob");
const gameHud = document.getElementById("gameHud");
const hudArea = document.getElementById("hudArea");
const hudChapter = document.getElementById("hudChapter");
const hudWeather = document.getElementById("hudWeather");
const hudClock = document.getElementById("hudClock");
const hudDay = document.getElementById("hudDay");
const hudObjective = document.getElementById("hudObjective");
const hudPrompt = document.getElementById("hudPrompt");
const hudToast = document.getElementById("hudToast");
const hideMask = document.getElementById("hideMask");
const cinematicCaption = document.getElementById("cinematicCaption");
const webglError = document.getElementById("webglError");
const choiceOverlay = document.getElementById("choiceOverlay");
const choiceTitle = document.getElementById("choiceTitle");
const choiceText = document.getElementById("choiceText");
const choicePrimary = document.getElementById("choicePrimary");
const choiceSecondary = document.getElementById("choiceSecondary");
const chapterOverlay = document.getElementById("chapterOverlay");
const chapterGrid = document.getElementById("chapterGrid");
const chapterCloseButton = document.getElementById("chapterCloseButton");
const chapterMenuButton = document.getElementById("chapterMenuButton");
const chapterStartButton = document.getElementById("chapterStartButton");

const FIXED_STEP = 1 / 60;
const FIXED_MS = 1000 / 60;
const CHUNK_SIZE = 48;
const ACTIVE_RADIUS = matchMedia("(pointer: coarse)").matches ? 1 : 2;
const CEILING_HEIGHT = 8.8;
const PLAYER_EYE = 1.7;
const PLAYER_RADIUS = 0.42;
const CLOCK_SPEED = 6;
const EXIT_CHUNK = { x: 2, z: -1 };
const touchDevice = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

let renderer;
let scene;
let camera;
let sun;
let hemisphere;
let flashlight;
let sky;
let rain;
let rainPositions;
let tornado;
let tsunami;
let rainbow;
let monsterModel;
let cinematicRoot = null;
let cinematicIndex = -1;
let journeyWorld = null;
let journeyFurniture = [];
let choiceHandlers = null;
let chapterMenuRestorePaused = false;
let manualTime = false;
let manualAccumulator = 0;
let accumulator = 0;
let lastFrame = performance.now();
let lastChunkKey = "";
let audioContext = null;

const keys = new Set();
const loadedChunks = new Map();
const chunkStates = new Map();
const objectPatches = Object.create(null);
const input = { moveX: 0, moveZ: 0, lookX: 0, lookY: 0, sprint: false };
const touch = { stickId: null, lookId: null, lastX: 0, lastY: 0, x: 0, y: 0 };

const LoopbackTransport = {
  role: "offline-host",
  status: "solo",
  sendRealtime() {},
  sendReliable() {},
  close() {}
};

const chapters = {
  warehouse: { next: "forest_houses", generator: "endless-indoor" },
  forest_houses: { next: "dragon_caves", generator: "endless-outdoor" },
  dragon_caves: { next: "dragon_flight", generator: "caves" },
  dragon_flight: { next: "shark_island" },
  shark_island: { next: "boat_ride" },
  boat_ride: { next: "electric_hollow" },
  electric_hollow: { next: "robot_shop", enemy: "rattleman" },
  robot_shop: { next: "haunted_house" },
  haunted_house: { next: "ghost_station", enemy: "rattleman" },
  ghost_station: { choice: { board: "ghost_train", refuse: "desert" } },
  ghost_train: { trap: true, retry: "ghost_station" },
  desert: { portal: "warehouse", enemy: "rattleman" },
  desert_onward: { next: "volcano_island" },
  volcano_island: { next: "mystery_village", fail: "warehouse" },
  mystery_village: { next: "haunted_school", sign: "VILLAGE FROM 1920", language: "old-artifacts-English" },
  haunted_school: { next: "lighthouse_city", enemy: "rattleman", event: "03:33" },
  lighthouse_city: { next: "forbidden_hotel", hazard: "tsunami" },
  forbidden_hotel: { next: "graveyard_secret", enemy: "corridor-shadow" },
  graveyard_secret: { next: "lost_carnival", enemy: "rattleman", event: "dawn" },
  lost_carnival: { next: "dollmaker_house", enemy: "mysterious-clown" },
  dollmaker_house: { next: "midnight_museum", enemy: "moving-dolls" },
  midnight_museum: { next: "forgotten_hospital", enemy: "rattleman", event: "midnight" },
  forgotten_hospital: { next: "four_floors_down", enemy: "blood-stained-nurse" },
  four_floors_down: { next: "forest_houses", generator: "shifting-basement" }
};

const furnitureTypes = {
  wardrobe: { name: "gammal garderob", w: 2.4, d: 1.25, h: 4.4, movable: true, hideable: true, color: 0x6d4a31 },
  sofa: { name: "sliten soffa", w: 3.8, d: 1.8, h: 1.8, movable: true, hideable: true, color: 0x587064 },
  bed: { name: "gammal säng", w: 3.2, d: 5.0, h: 1.1, movable: true, hideable: true, color: 0x83655d },
  table: { name: "repigt bord", w: 3.6, d: 2.3, h: 1.7, movable: true, color: 0x805c3b },
  shelf: { name: "rostig hylla", w: 3.8, d: 1.0, h: 4.2, movable: false, color: 0x596168 },
  crate: { name: "gammal låda", w: 1.7, d: 1.7, h: 1.7, movable: true, color: 0x966333 },
  chair: { name: "ranglig stol", w: 1.4, d: 1.4, h: 2.0, movable: true, color: 0x9a7047 },
  lamp: { name: "gammal lampa", w: 0.9, d: 0.9, h: 3.2, movable: true, color: 0xb89c58 },
  column: { name: "betongpelare", w: 1.5, d: 1.5, h: CEILING_HEIGHT, movable: false, color: 0x74808a },
  wall: { name: "servicevägg", w: 3.0, d: 0.6, h: 6.5, movable: false, color: 0x344657 },
  exit: { name: "hemlig utgång", w: 2.5, d: 0.6, h: 4.2, movable: false, interactive: true, color: 0x176e5e }
};

const zoneNames = ["Soffhavet", "Sänglabyrinten", "Garderobsskogen", "Bordskogen", "Lampgången", "Pallbergen"];
const zoneFurniture = [
  ["sofa", "sofa", "table", "lamp", "crate"],
  ["bed", "bed", "wardrobe", "lamp", "chair"],
  ["wardrobe", "wardrobe", "shelf", "chair", "crate"],
  ["table", "table", "chair", "shelf", "lamp"],
  ["lamp", "lamp", "table", "sofa", "crate"],
  ["crate", "crate", "shelf", "table", "chair"]
];

const weatherCycle = [
  ["cloudy", 15], ["rain", 22], ["rainbow", 13], ["clear", 26],
  ["cloudy", 15], ["rain", 18], ["tornado_warning", 7], ["tornado", 11],
  ["clear", 32], ["tsunami_warning", 8], ["tsunami", 13], ["clear", 38]
];

const state = {
  mode: "title",
  paused: false,
  chapter: "warehouse",
  worldSeed: 333,
  tick: 0,
  timeMs: 0,
  day: 1,
  clockMinutes: 21 * 60,
  nightsSurvived: 0,
  monsterDays: Object.create(null),
  playersById: {
    p1: {
      id: "p1", x: 24, y: 0, z: 24, yaw: -Math.PI / 2, pitch: 0,
      hidden: false, hiddenBy: null, flashlight: true, carryingObjectId: null,
      moving: false, sprinting: false
    }
  },
  localPlayerId: "p1",
  network: { role: LoopbackTransport.role, status: LoopbackTransport.status },
  monster: {
    id: "rattleman", active: false, x: 0, z: 0, mode: "sleeping",
    targetPlayerId: "p1", lastSeenX: 24, lastSeenZ: 24, sawHide: false, breakHideTick: 0,
    speedScale: 1
  },
  held: null,
  markers: [],
  weather: {
    index: 0, type: "cloudy", endsTick: 15 * 60, startedTick: 0,
    originX: 24, originZ: 24, heading: 0
  },
  toast: "Utforska varuhuset och bygg ett gömställe före 03:33.",
  toastUntilTick: 360,
  prompt: "",
  exitFound: false,
  exitUnlocked: false,
  journey: {
    index: -1, elapsed: 0, stage: "", objective: "", timer: 0,
    flags: {}, collected: [], loop: 0, failedChapter: null
  },
  cinematic: { time: 0, phase: "" }
};

function player() { return state.playersById[state.localPlayerId]; }
function inWarehouse() { return state.chapter === "warehouse"; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance2D(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }
function chunkKey(cx, cz) { return `${cx}:${cz}`; }
function chunkCoord(value) { return Math.floor(value / CHUNK_SIZE); }
function hash32(a, b, c = 0) {
  let h = (state.worldSeed ^ Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function randomUnit(a, b, c = 0) { return hash32(a, b, c) / 4294967295; }

function createTexture(kind) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const c = textureCanvas.getContext("2d");
  if (kind === "floor") {
    c.fillStyle = "#626b70";
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) {
      for (let x = 0; x < 512; x += 64) {
        c.fillStyle = ((x + y) / 64) % 2 ? "#697277" : "#5e686d";
        c.fillRect(x + 1, y + 1, 62, 62);
      }
    }
    for (let i = 0; i < 1000; i += 1) {
      const shade = 65 + (i * 37 % 45);
      c.fillStyle = `rgba(${shade},${shade},${shade},0.18)`;
      c.fillRect((i * 97) % 512, (i * 193) % 512, 2 + i % 3, 2 + (i * 3) % 3);
    }
  } else if (kind === "wood") {
    c.fillStyle = "#775136";
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      c.fillStyle = y % 64 ? "rgba(35,16,8,.22)" : "rgba(255,210,150,.1)";
      c.fillRect(0, y, 512, 3);
      c.strokeStyle = "rgba(45,21,10,.28)";
      c.beginPath();
      for (let x = 0; x <= 512; x += 12) c.lineTo(x, y + 12 + Math.sin(x * .04 + y) * 5);
      c.stroke();
    }
  } else {
    c.fillStyle = "#68727b";
    c.fillRect(0, 0, 512, 512);
    c.strokeStyle = "rgba(230,240,245,.18)";
    for (let i = 0; i <= 512; i += 64) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 512); c.stroke();
      c.beginPath(); c.moveTo(0, i); c.lineTo(512, i); c.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "floor" ? 10 : 2, kind === "floor" ? 10 : 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const textures = { floor: createTexture("floor"), wood: createTexture("wood"), ceiling: createTexture("ceiling") };
const materials = {
  floor: new THREE.MeshStandardMaterial({ map: textures.floor, color: 0xbac1c4, roughness: 0.72, metalness: 0.04 }),
  ceiling: new THREE.MeshStandardMaterial({ map: textures.ceiling, color: 0xa8b1b9, roughness: 0.9 }),
  wood: new THREE.MeshStandardMaterial({ map: textures.wood, color: 0xffffff, roughness: 0.82 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x67727b, roughness: 0.48, metalness: 0.62 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x627d70, roughness: 1 }),
  mattress: new THREE.MeshStandardMaterial({ color: 0xd8d2bf, roughness: 0.95 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.8 }),
  light: new THREE.MeshStandardMaterial({ color: 0xfff4c4, emissive: 0xffe9a3, emissiveIntensity: 2.1, roughness: 0.35 }),
  exit: new THREE.MeshStandardMaterial({ color: 0x176e5e, emissive: 0x0c3b32, emissiveIntensity: 1, roughness: 0.5 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x92bed0, transparent: true, opacity: 0.26, roughness: 0.18, metalness: 0.05, depthWrite: false })
};
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
const sphereGeometry = new THREE.SphereGeometry(0.5, 18, 12);

function meshBox(w, h, d, material, x = 0, y = h / 2, z = 0) {
  const mesh = new THREE.Mesh(boxGeometry, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function tintMaterial(color, roughness = 0.82, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addLegs(group, w, d, height, material) {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    group.add(meshBox(0.22, height, 0.22, material, sx * (w / 2 - 0.22), height / 2, sz * (d / 2 - 0.22)));
  });
}

function buildFurnitureModel(desc) {
  const info = furnitureTypes[desc.type];
  const group = new THREE.Group();
  const main = desc.type === "shelf" || desc.type === "column" ? materials.metal :
    desc.type === "sofa" ? materials.fabric :
      desc.type === "exit" ? materials.exit : materials.wood;
  if (desc.type === "wardrobe") {
    group.add(meshBox(2.4, 4.4, 1.2, main));
    group.add(meshBox(1.08, 3.9, 0.08, tintMaterial(0x7d583b), -0.57, 2.2, -0.64));
    group.add(meshBox(1.08, 3.9, 0.08, tintMaterial(0x745035), 0.57, 2.2, -0.64));
    const handleMaterial = tintMaterial(0xbda66d, 0.25, 0.7);
    group.add(meshBox(0.08, 0.45, 0.08, handleMaterial, -0.15, 2.2, -0.72));
    group.add(meshBox(0.08, 0.45, 0.08, handleMaterial, 0.15, 2.2, -0.72));
  } else if (desc.type === "sofa") {
    group.add(meshBox(3.7, 0.75, 1.75, main, 0, 0.65, 0));
    group.add(meshBox(3.7, 1.55, 0.45, main, 0, 1.42, 0.65));
    group.add(meshBox(0.5, 1.15, 1.8, main, -1.62, 0.85, 0));
    group.add(meshBox(0.5, 1.15, 1.8, main, 1.62, 0.85, 0));
    const cushion = tintMaterial(0x718c7d, 1);
    group.add(meshBox(1.45, 0.25, 1.25, cushion, -0.78, 1.08, -0.08));
    group.add(meshBox(1.45, 0.25, 1.25, cushion, 0.78, 1.08, -0.08));
  } else if (desc.type === "bed") {
    group.add(meshBox(3.25, 0.42, 5, main, 0, 0.38, 0));
    group.add(meshBox(3.0, 0.55, 4.72, materials.mattress, 0, 0.83, 0));
    group.add(meshBox(3.25, 2.05, 0.28, main, 0, 1.1, 2.4));
    group.add(meshBox(1.4, 0.24, 0.8, tintMaterial(0xe7e3d5, 1), -0.72, 1.22, 1.65));
    group.add(meshBox(1.4, 0.24, 0.8, tintMaterial(0xe7e3d5, 1), 0.72, 1.22, 1.65));
  } else if (desc.type === "table") {
    group.add(meshBox(3.6, 0.28, 2.3, main, 0, 1.65, 0));
    addLegs(group, 3.6, 2.3, 1.55, main);
  } else if (desc.type === "shelf") {
    group.add(meshBox(0.2, 4.2, 1, main, -1.75, 2.1, 0));
    group.add(meshBox(0.2, 4.2, 1, main, 1.75, 2.1, 0));
    for (let y = 0.3; y <= 4.1; y += 0.95) group.add(meshBox(3.8, 0.16, 1, main, 0, y, 0));
  } else if (desc.type === "crate") {
    group.add(meshBox(1.7, 1.7, 1.7, main));
    const brace = tintMaterial(0x52331d, 0.9);
    group.add(meshBox(0.14, 1.55, 0.08, brace, -0.62, 0.85, -0.89));
    group.add(meshBox(0.14, 1.55, 0.08, brace, 0.62, 0.85, -0.89));
  } else if (desc.type === "chair") {
    group.add(meshBox(1.4, 0.22, 1.4, main, 0, 1.05, 0));
    addLegs(group, 1.4, 1.4, 1.0, main);
    group.add(meshBox(1.4, 1.15, 0.2, main, 0, 1.72, 0.6));
  } else if (desc.type === "lamp") {
    const pole = new THREE.Mesh(cylinderGeometry, materials.metal);
    pole.scale.set(0.13, 2.7, 0.13);
    pole.position.y = 1.45;
    pole.castShadow = true;
    group.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.85, 18, 1, true), tintMaterial(0xb9a267, 0.68, 0.1));
    shade.position.y = 3;
    shade.rotation.x = Math.PI;
    shade.castShadow = true;
    group.add(shade);
    const bulb = new THREE.Mesh(sphereGeometry, materials.light);
    bulb.scale.setScalar(0.24);
    bulb.position.y = 2.82;
    group.add(bulb);
  } else if (desc.type === "column") {
    group.add(meshBox(1.5, CEILING_HEIGHT, 1.5, main));
  } else if (desc.type === "wall") {
    group.add(meshBox(3, 6.5, 0.6, main));
  } else if (desc.type === "exit") {
    group.add(meshBox(2.5, 4.2, 0.55, materials.exit));
    group.add(meshBox(3.2, 0.34, 0.72, materials.light, 0, 4.65, 0));
    group.add(meshBox(0.15, 0.55, 0.15, tintMaterial(0xc8d7d4, 0.25, 0.8), 0.85, 2.0, -0.38));
  }
  group.position.set(desc.x, 0, desc.z);
  group.rotation.y = desc.rotation;
  group.userData.descriptor = desc;
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = desc.type !== "lamp";
      child.receiveShadow = true;
    }
  });
  return group;
}

function descriptorBounds(desc) {
  const info = furnitureTypes[desc.type];
  const swap = Math.abs(Math.sin(desc.rotation)) > 0.5;
  return { w: swap ? info.d : info.w, d: swap ? info.w : info.d, h: info.h };
}

function descriptorsOverlap(a, b, padding = 0.35) {
  const da = descriptorBounds(a);
  const db = descriptorBounds(b);
  return Math.abs(a.x - b.x) < (da.w + db.w) / 2 + padding &&
    Math.abs(a.z - b.z) < (da.d + db.d) / 2 + padding;
}

function generateChunkState(cx, cz) {
  const key = chunkKey(cx, cz);
  const zoneIndex = Math.floor(randomUnit(cx, cz, 7) * zoneNames.length) % zoneNames.length;
  const chunk = { key, cx, cz, zone: zoneNames[zoneIndex], objects: [], dirty: false };
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;
  const add = (desc) => { desc.chunkKey = key; chunk.objects.push(desc); };
  add({ id: `${key}:column`, type: "column", x: baseX + (randomUnit(cx, cz, 8) > .5 ? 7 : 41), z: baseZ + (randomUnit(cx, cz, 9) > .5 ? 7 : 41), rotation: 0, removed: false });
  const choices = zoneFurniture[zoneIndex];
  for (let attempt = 0; attempt < 70 && chunk.objects.length < 17; attempt += 1) {
    const lx = 3 + randomUnit(cx, cz, 100 + attempt * 3) * 42;
    const lz = 3 + randomUnit(cx, cz, 101 + attempt * 3) * 42;
    if (Math.abs(lx - 24) < 4.4 || Math.abs(lz - 24) < 4.4) continue;
    if (cx === 0 && cz === 0 && distance2D(lx, lz, 24, 24) < 9) continue;
    if (cx === EXIT_CHUNK.x && cz === EXIT_CHUNK.z && distance2D(lx, lz, 24, 12) < 9) continue;
    const type = choices[Math.floor(randomUnit(cx, cz, 102 + attempt * 3) * choices.length) % choices.length];
    const desc = {
      id: `${key}:f${attempt}`, type, x: baseX + lx, z: baseZ + lz,
      rotation: randomUnit(cx, cz, 103 + attempt * 3) > .5 ? Math.PI / 2 : 0,
      removed: false, group: null
    };
    if (chunk.objects.some((other) => descriptorsOverlap(desc, other))) continue;
    add(desc);
  }
  if (cx === 0 && cz === 0) {
    [
      { id: `${key}:start-wardrobe`, type: "wardrobe", x: 32, z: 20, rotation: 0 },
      { id: `${key}:start-sofa`, type: "sofa", x: 16, z: 31, rotation: 0 },
      { id: `${key}:start-crate`, type: "crate", x: 31, z: 31, rotation: 0 },
      { id: `${key}:start-chair`, type: "chair", x: 18, z: 15, rotation: Math.PI / 2 },
      { id: `${key}:start-table`, type: "table", x: 11, z: 17, rotation: 0 }
    ].forEach((desc) => { desc.removed = false; desc.group = null; if (!chunk.objects.some((o) => descriptorsOverlap(desc, o, .1))) add(desc); });
  }
  if (cx === EXIT_CHUNK.x && cz === EXIT_CHUNK.z) {
    for (let i = -3; i <= 3; i += 1) {
      if (i === 0) continue;
      add({ id: `${key}:wall${i}`, type: "wall", x: baseX + 24 + i * 3, z: baseZ + 12, rotation: 0, removed: false, group: null });
    }
    add({ id: `${key}:exit`, type: "exit", x: baseX + 24, z: baseZ + 12, rotation: 0, removed: false, group: null });
  }
  return chunk;
}

function ensureChunkState(cx, cz) {
  const key = chunkKey(cx, cz);
  if (!chunkStates.has(key)) chunkStates.set(key, generateChunkState(cx, cz));
  return chunkStates.get(key);
}

function makeZoneSign(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#0759a5"; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = "#ffd928"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 118);
  g.fillStyle = "#fff"; g.font = "bold 43px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
}

function loadChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  if (loadedChunks.has(key)) return;
  const data = ensureChunkState(cx, cz);
  const root = new THREE.Group();
  root.userData.chunkKey = key;
  const centerX = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
  const centerZ = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, centerZ);
  floor.receiveShadow = true;
  root.add(floor);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const panel = meshBox(21.6, 0.18, 21.6, materials.ceiling,
      centerX + sx * 12.1, CEILING_HEIGHT, centerZ + sz * 12.1);
    panel.castShadow = false;
    root.add(panel);
    const fixture = meshBox(6, 0.08, 0.7, materials.light,
      centerX + sx * 12.1, CEILING_HEIGHT - 0.17, centerZ + sz * 12.1);
    fixture.castShadow = false;
    root.add(fixture);
  });
  const skylight = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), materials.glass);
  skylight.rotation.x = Math.PI / 2;
  skylight.position.set(centerX, CEILING_HEIGHT + .05, centerZ);
  root.add(skylight);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), makeZoneSign(data.zone));
  sign.position.set(centerX, 5.5, centerZ - 10);
  root.add(sign);
  data.objects.forEach((desc) => {
    if (desc.removed || state.held?.id === desc.id) return;
    desc.group = buildFurnitureModel(desc);
    root.add(desc.group);
  });
  scene.add(root);
  loadedChunks.set(key, { root, data });
}

function unloadChunk(key) {
  const loaded = loadedChunks.get(key);
  if (!loaded) return;
  loaded.data.objects.forEach((desc) => { if (desc.group && state.held?.id !== desc.id) desc.group = null; });
  scene.remove(loaded.root);
  const disposableMaterials = new Set();
  loaded.root.traverse((object) => {
    const objectMaterials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    objectMaterials.forEach((material) => {
      if (!Object.values(materials).includes(material)) disposableMaterials.add(material);
    });
    if (object.geometry && object.geometry !== boxGeometry && object.geometry !== cylinderGeometry && object.geometry !== sphereGeometry) object.geometry.dispose();
  });
  disposableMaterials.forEach((material) => {
    if (material.map?.isCanvasTexture) material.map.dispose();
    material.dispose();
  });
  loadedChunks.delete(key);
  // Oredigerade delar kan alltid återskapas från världsfröet. Bara byggda/ändrade
  // delar behöver ligga kvar, så en oändlig promenad fyller inte minnet.
  if (!loaded.data.dirty) chunkStates.delete(key);
}

function refreshChunks(force = false) {
  const p = player();
  const cx = chunkCoord(p.x);
  const cz = chunkCoord(p.z);
  const centerKey = chunkKey(cx, cz);
  if (!force && centerKey === lastChunkKey) return;
  lastChunkKey = centerKey;
  const needed = new Set();
  for (let x = cx - ACTIVE_RADIUS; x <= cx + ACTIVE_RADIUS; x += 1) {
    for (let z = cz - ACTIVE_RADIUS; z <= cz + ACTIVE_RADIUS; z += 1) {
      needed.add(chunkKey(x, z));
      loadChunk(x, z);
    }
  }
  [...loadedChunks.keys()].forEach((key) => { if (!needed.has(key)) unloadChunk(key); });
}

function createSky() {
  const uniforms = {
    topColor: { value: new THREE.Color(0x446f91) },
    bottomColor: { value: new THREE.Color(0xb8c2bb) },
    exponent: { value: 0.8 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "varying vec3 vLocal; void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: "uniform vec3 topColor;uniform vec3 bottomColor;uniform float exponent;varying vec3 vLocal;void main(){float h=max(normalize(vLocal).y,0.0);gl_FragColor=vec4(mix(bottomColor,topColor,pow(h,exponent)),1.0);}",
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
  // Kamerans far plane är 190 m. En 165 m dome ryms helt och slipper den
  // cirkelformade klippkanten som annars syntes i filmsekvenserna.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(165, 32, 18), material);
  dome.frustumCulled = false;
  dome.userData.uniforms = uniforms;
  return dome;
}

function createRain() {
  const count = touchDevice ? 550 : 1100;
  rainPositions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    rainPositions[i * 3] = (randomUnit(i, 1, 1) - .5) * 70;
    rainPositions[i * 3 + 1] = randomUnit(i, 1, 2) * 28;
    rainPositions[i * 3 + 2] = (randomUnit(i, 1, 3) - .5) * 70;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  const material = new THREE.PointsMaterial({ color: 0xb8e2ff, size: .1, transparent: true, opacity: .72, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.visible = false;
  scene.add(points);
  return points;
}

function createRainbow() {
  const root = new THREE.Group();
  const colors = [0xff5b5b, 0xffa94a, 0xffe462, 0x63d679, 0x54a7ff, 0x9a6cff];
  class ArcCurve extends THREE.Curve {
    constructor(radius) { super(); this.radius = radius; }
    getPoint(t, target = new THREE.Vector3()) {
      const angle = Math.PI * (1 - t);
      return target.set(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius, 0);
    }
  }
  colors.forEach((color, index) => {
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new ArcCurve(13 - index * .5), 40, .22, 7, false),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55, depthWrite: false })
    );
    root.add(tube);
  });
  root.visible = false;
  scene.add(root);
  return root;
}

function createTornado() {
  const count = touchDevice ? 320 : 650;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xc6d2d3, size: .28, transparent: true, opacity: .7, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.userData.positions = positions;
  points.visible = false;
  scene.add(points);
  return points;
}

function createTsunami() {
  const root = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshPhysicalMaterial({ color: 0x197db1, transparent: true, opacity: .58, roughness: .16, metalness: .12, depthWrite: false })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = .04;
  root.add(water);
  const wave = meshBox(120, 3.2, 1.8,
    new THREE.MeshPhysicalMaterial({ color: 0x55bde3, transparent: true, opacity: .72, roughness: .12, depthWrite: false }),
    0, 1.6, -28);
  wave.castShadow = false;
  root.add(wave);
  root.visible = false;
  scene.add(root);
  return root;
}

function createMonster() {
  const root = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x15131a, roughness: .88 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4c392b, roughness: .94 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x3d4248, roughness: .46, metalness: .66 });
  const eyes = new THREE.MeshStandardMaterial({ color: 0xff3d2f, emissive: 0xff1808, emissiveIntensity: 4, roughness: .25 });
  const torso = meshBox(1.45, 2.7, .8, bodyMaterial, 0, 3.35, 0);
  root.add(torso);
  const head = meshBox(1.05, 1.1, .82, metal, 0, 5.2, 0);
  root.add(head);
  [-.28, .28].forEach((x) => root.add(meshBox(.16, .16, .08, eyes, x, 5.3, -.47)));
  const arms = [];
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * .88, 4.25, 0);
    pivot.add(meshBox(.26, 2.7, .26, wood, 0, -1.25, 0));
    root.add(pivot); arms.push(pivot);
  });
  const legs = [];
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * .38, 2.1, 0);
    pivot.add(meshBox(.34, 2.5, .34, wood, 0, -1.15, 0));
    root.add(pivot); legs.push(pivot);
  });
  const cloth = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.8, 8, 1, true), bodyMaterial);
  cloth.position.y = 2.65;
  cloth.rotation.y = Math.PI / 8;
  root.add(cloth);
  root.userData.arms = arms;
  root.userData.legs = legs;
  root.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
  root.visible = false;
  scene.add(root);
  return root;
}

function initRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: Boolean(navigator.webdriver),
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touchDevice ? 1.25 : 1.8));
  renderer.setSize(canvas.clientWidth || 960, canvas.clientHeight || 540, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x607f94);
  scene.fog = new THREE.FogExp2(0x75868d, .012);
  camera = new THREE.PerspectiveCamera(72, 16 / 9, .06, 190);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  hemisphere = new THREE.HemisphereLight(0xb9d8e6, 0x293034, 1.15);
  scene.add(hemisphere);
  sun = new THREE.DirectionalLight(0xffe2b2, 2.25);
  sun.position.set(-26, 44, -32);
  sun.castShadow = true;
  const shadowSize = touchDevice ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 2; sun.shadow.camera.far = 110;
  sun.shadow.bias = -.00035;
  scene.add(sun);
  scene.add(sun.target);
  flashlight = new THREE.SpotLight(0xfff0cf, 18, 28, .42, .5, 1.4);
  flashlight.position.set(0, 0, 0);
  flashlight.castShadow = !touchDevice;
  flashlight.shadow.mapSize.set(1024, 1024);
  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0, -1);
  camera.add(flashlight);
  camera.add(flashlightTarget);
  flashlight.target = flashlightTarget;
  sky = createSky(); scene.add(sky);
  rain = createRain();
  rainbow = createRainbow();
  tornado = createTornado();
  tsunami = createTsunami();
  monsterModel = createMonster();
  refreshChunks(true);
  updateCamera();
}

function allLoadedDescriptors() {
  if (!inWarehouse()) return journeyFurniture.filter((desc) => !desc.removed && state.held?.id !== desc.id);
  const result = [];
  loadedChunks.forEach(({ data }) => data.objects.forEach((desc) => { if (!desc.removed && state.held?.id !== desc.id) result.push(desc); }));
  return result;
}

function pointColliderDistance(x, z, collider) {
  const dx = Math.max(Math.abs(x - collider.x) - collider.w / 2, 0);
  const dz = Math.max(Math.abs(z - collider.z) - collider.d / 2, 0);
  return Math.hypot(dx, dz);
}

function pointAabbDistance(x, z, desc) {
  const bounds = descriptorBounds(desc);
  const dx = Math.max(Math.abs(x - desc.x) - bounds.w / 2, 0);
  const dz = Math.max(Math.abs(z - desc.z) - bounds.d / 2, 0);
  return Math.hypot(dx, dz);
}

function collides(x, z, radius = PLAYER_RADIUS, ignoreId = null) {
  if (!inWarehouse() && journeyWorld) {
    const b = journeyWorld.bounds;
    if (b && (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius)) return true;
    if (journeyWorld.colliders.some((collider) => pointColliderDistance(x, z, collider) < radius)) return true;
    if (state.chapter === "haunted_school" && state.journey.flags.doorsLocked) {
      const blockedBySchoolDoor = (journeyWorld.actors.doors || [])
        .filter((door) => door.userData.closedYaw != null)
        .some((door) => pointColliderDistance(x, z, {
          x: door.position.x,
          z: door.position.z + 1.8,
          w: .5,
          d: 3.6
        }) < radius);
      if (blockedBySchoolDoor) return true;
    }
  }
  return allLoadedDescriptors().some((desc) => desc.id !== ignoreId && pointAabbDistance(x, z, desc) < radius);
}

function movePlayer(dx, dz) {
  const p = player();
  if (!collides(p.x + dx, p.z)) p.x += dx;
  if (!collides(p.x, p.z + dz)) p.z += dz;
}

function lineBlocked(ax, az, bx, bz) {
  const length = distance2D(ax, az, bx, bz);
  const steps = Math.ceil(length / .45);
  const tall = allLoadedDescriptors().filter((desc) => descriptorBounds(desc).h >= 2.1);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    if (tall.some((desc) => pointAabbDistance(x, z, desc) < .08)) return true;
    if (!inWarehouse() && journeyWorld?.colliders.some((collider) => pointColliderDistance(x, z, collider) < .08)) return true;
  }
  return false;
}

function nearestObject(predicate, maxDistance = 3.2) {
  const p = player();
  const forwardX = -Math.sin(p.yaw);
  const forwardZ = -Math.cos(p.yaw);
  let best = null;
  let bestDistance = maxDistance;
  allLoadedDescriptors().forEach((desc) => {
    if (!predicate(desc)) return;
    const d = pointAabbDistance(p.x, p.z, desc);
    const centerDistance = distance2D(p.x, p.z, desc.x, desc.z) || 1;
    const facing = ((desc.x - p.x) * forwardX + (desc.z - p.z) * forwardZ) / centerDistance;
    if (d < bestDistance && facing > -.1) { best = desc; bestDistance = d; }
  });
  return best;
}

function coverScore() {
  const p = player();
  return allLoadedDescriptors().filter((desc) =>
    pointAabbDistance(p.x, p.z, desc) < 2.7 &&
    (furnitureTypes[desc.type].movable || furnitureTypes[desc.type].hideable || descriptorBounds(desc).h > 2.5)
  ).length;
}

function showToast(text, seconds = 2.8) {
  state.toast = text;
  state.toastUntilTick = state.tick + Math.round(seconds * 60);
  gameStatus.textContent = text;
}

function ensureAudio() {
  if (audioContext) { if (audioContext.state === "suspended") audioContext.resume(); return; }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioCtor) audioContext = new AudioCtor();
}

function tone(frequency, duration = .16, type = "sine", volume = .025, delay = 0) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001, audioContext.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + delay + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + delay + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + delay);
  oscillator.stop(audioContext.currentTime + delay + duration + .03);
}

function monsterArrivalSound() {
  tone(88, .45, "sawtooth", .035);
  tone(61, .6, "square", .027, .35);
  tone(43, .9, "sawtooth", .022, .78);
}

function spawnMonster() {
  if (state.monster.active || state.mode !== "playing") return;
  const p = player();
  const candidates = [0, Math.PI / 2, Math.PI, -Math.PI / 2, .75, -1.2];
  for (let i = 0; i < candidates.length; i += 1) {
    const angle = p.yaw + candidates[(i + state.day) % candidates.length];
    const x = p.x + Math.cos(angle) * (17 + i * 2);
    const z = p.z + Math.sin(angle) * (17 + i * 2);
    if (!collides(x, z, .7)) { state.monster.x = x; state.monster.z = z; break; }
  }
  state.monster.active = true;
  state.monster.mode = "hunting";
  state.monster.targetPlayerId = state.localPlayerId;
  state.monster.lastSeenX = p.x;
  state.monster.lastSeenZ = p.z;
  state.monster.sawHide = false;
  state.monster.speedScale = 1;
  state.monsterDays[state.day] = true;
  monsterModel.visible = true;
  showToast("03:33 — SKRAMLAREN HAR VAKNAT!", 5);
  monsterArrivalSound();
}

function caught() {
  state.mode = "gameover";
  state.monster.mode = "caught";
  const p = player();
  p.hidden = false;
  // Iscensätt fångsten på läsbart avstånd. Annars stannar det fem meter höga
  // monstret precis i kameran och ficklampans hotspot täcker hela ansiktet.
  let dx = state.monster.x - p.x;
  let dz = state.monster.z - p.z;
  const distance = Math.hypot(dx, dz);
  if (distance < .05) { dx = -Math.sin(p.yaw); dz = -Math.cos(p.yaw); }
  else { dx /= distance; dz /= distance; }
  state.monster.x = p.x + dx * 2.75;
  state.monster.z = p.z + dz * 2.75;
  p.yaw = Math.atan2(-dx, -dz);
  p.pitch = .9;
  if (!inWarehouse()) state.journey.failedChapter = state.chapter;
  hideMask.hidden = true;
  touchControls.hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  showToast(`${inWarehouse() ? "Skramlaren hittade dig." : `Skramlaren följde efter till ${chapterTitle()}.`} Tryck R eller E för att försöka igen.`, 10);
  tone(45, .9, "sawtooth", .04);
}

function updateMonster(dt) {
  const monster = state.monster;
  if (!monster.active || state.mode !== "playing") return;
  const p = player();
  const d = distance2D(monster.x, monster.z, p.x, p.z);
  const sees = !p.hidden && d < 17 && !lineBlocked(monster.x, monster.z, p.x, p.z);
  if (sees) {
    monster.mode = "chasing";
    monster.lastSeenX = p.x; monster.lastSeenZ = p.z;
  } else if (p.hidden) monster.mode = monster.sawHide ? "opening_hideout" : "searching";
  else monster.mode = "hunting";
  if (p.hidden && monster.sawHide && state.tick >= monster.breakHideTick) { caught(); return; }
  let tx = sees ? p.x : monster.lastSeenX;
  let tz = sees ? p.z : monster.lastSeenZ;
  if (p.hidden && !monster.sawHide) {
    tx = p.x + Math.cos(state.timeMs / 2100) * 6;
    tz = p.z + Math.sin(state.timeMs / 2100) * 6;
  }
  const dx = tx - monster.x;
  const dz = tz - monster.z;
  const length = Math.max(.001, Math.hypot(dx, dz));
  let speed = (monster.mode === "chasing" ? 4.25 : 2.35) * (monster.speedScale || 1);
  if (state.weather.type === "tsunami") speed *= .55;
  const mx = dx / length * speed * dt;
  const mz = dz / length * speed * dt;
  if (!collides(monster.x + mx, monster.z + mz, .52)) { monster.x += mx; monster.z += mz; }
  else if (!collides(monster.x + mx, monster.z, .52)) monster.x += mx;
  else if (!collides(monster.x, monster.z + mz, .52)) monster.z += mz;
  else {
    const sx = -dz / length * speed * dt;
    const sz = dx / length * speed * dt;
    if (!collides(monster.x + sx, monster.z + sz, .52)) { monster.x += sx; monster.z += sz; }
  }
  if (!p.hidden && distance2D(monster.x, monster.z, p.x, p.z) < 1.05) caught();
}

function tryHide() {
  const p = player();
  if (state.mode !== "playing") return;
  if (!inWarehouse() && !["haunted_house", "haunted_school"].includes(state.chapter)) {
    showToast("Här finns inget möbelgömställe. Fortsätt mot målet!", 2.5);
    return;
  }
  if (p.hidden) {
    p.hidden = false; p.hiddenBy = null; state.monster.sawHide = false;
    hideMask.hidden = true;
    showToast("Du smyger ut ur gömstället.", 2);
    return;
  }
  if (state.held) { showToast("Placera möbeln först.", 2); return; }
  const hideable = nearestObject((desc) => furnitureTypes[desc.type].hideable, 2.1);
  const schoolHideout = state.chapter === "haunted_school"
    ? journeyWorld?.interactables.find((item) => item.kind === "hideout" && distance2D(p.x, p.z, item.x, item.z) <= (item.radius || 3.2))
    : null;
  if (!hideable && !schoolHideout && coverScore() < 3) {
    showToast("Bygg med minst tre möbler eller hitta en garderob, säng eller soffa.", 3.4);
    return;
  }
  p.hidden = true;
  p.hiddenBy = hideable?.id || schoolHideout?.id || "built-fort";
  const d = state.monster.active ? distance2D(p.x, p.z, state.monster.x, state.monster.z) : Infinity;
  state.monster.sawHide = state.monster.active && d < 13 && !lineBlocked(state.monster.x, state.monster.z, p.x, p.z);
  state.monster.breakHideTick = state.tick + 150;
  hideMask.hidden = false;
  showToast(state.monster.sawHide ? "Den såg dig gömma dig! Ut snabbt!" : "Du är gömd. Var tyst.", 3);
}

function removeFromChunk(desc) {
  if (!inWarehouse()) return;
  const data = chunkStates.get(desc.chunkKey);
  if (!data) return;
  data.objects = data.objects.filter((item) => item.id !== desc.id);
  data.dirty = true;
}

function addToChunk(desc, cx, cz) {
  if (!inWarehouse()) {
    if (!journeyFurniture.includes(desc)) journeyFurniture.push(desc);
    return;
  }
  const data = ensureChunkState(cx, cz);
  desc.chunkKey = data.key;
  if (!data.objects.includes(desc)) data.objects.push(desc);
  data.dirty = true;
}

function pickUp(desc) {
  if (!desc.group) return;
  state.held = desc;
  player().carryingObjectId = desc.id;
  desc.group.parent.remove(desc.group);
  camera.add(desc.group);
  desc.group.position.set(0, -.95, -3.3);
  desc.group.rotation.set(0, 0, 0);
  showToast(`Du bär ${furnitureTypes[desc.type].name}. E placerar, R vrider.`, 3);
  tone(220, .09, "square", .018);
}

function placementPosition() {
  const p = player();
  return {
    x: Math.round((p.x - Math.sin(p.yaw) * 4) * 2) / 2,
    z: Math.round((p.z - Math.cos(p.yaw) * 4) * 2) / 2
  };
}

function canPlace(desc, x, z) {
  const oldX = desc.x, oldZ = desc.z;
  desc.x = x; desc.z = z;
  const blockedByFurniture = allLoadedDescriptors().some((other) => other.id !== desc.id && descriptorsOverlap(desc, other, .15));
  const bounds = descriptorBounds(desc);
  const blockedByWorld = !inWarehouse() && journeyWorld?.colliders.some((collider) =>
    pointColliderDistance(x, z, collider) < Math.min(bounds.w, bounds.d) * .42
  );
  const playerBlocked = pointAabbDistance(player().x, player().z, desc) < PLAYER_RADIUS + .15;
  desc.x = oldX; desc.z = oldZ;
  return !blockedByFurniture && !blockedByWorld && !playerBlocked;
}

function placeHeld() {
  const desc = state.held;
  if (!desc) return;
  const placement = placementPosition();
  if (!canPlace(desc, placement.x, placement.z)) { showToast("Här får möbeln inte plats.", 2); tone(75, .12, "square", .02); return; }
  removeFromChunk(desc);
  camera.remove(desc.group);
  desc.x = placement.x; desc.z = placement.z;
  desc.group.position.set(desc.x, 0, desc.z);
  desc.group.rotation.set(0, desc.rotation, 0);
  if (!inWarehouse()) {
    if (!journeyFurniture.includes(desc)) journeyFurniture.push(desc);
    journeyWorld.root.add(desc.group);
    objectPatches[desc.id] = { revision: (objectPatches[desc.id]?.revision || 0) + 1, x: desc.x, z: desc.z, rotation: desc.rotation, carriedBy: null };
    state.held = null; player().carryingObjectId = null;
    showToast(hauntedFortScore() >= 5 ? "Barrikaden är stark nog. Gör dig redo!" : "Möbeln är placerad.", 2.8);
    return;
  }
  const cx = chunkCoord(desc.x), cz = chunkCoord(desc.z);
  addToChunk(desc, cx, cz);
  loadChunk(cx, cz);
  const root = loadedChunks.get(chunkKey(cx, cz))?.root;
  if (root) root.add(desc.group); else scene.add(desc.group);
  objectPatches[desc.id] = { revision: (objectPatches[desc.id]?.revision || 0) + 1, x: desc.x, z: desc.z, rotation: desc.rotation, carriedBy: null };
  state.held = null; player().carryingObjectId = null;
  showToast(coverScore() >= 3 ? "Gömstället är klart. Tryck H bland möblerna." : "Möbeln är placerad.", 2.8);
}

function rotateHeld() {
  if (!state.held) return;
  state.held.rotation = (state.held.rotation + Math.PI / 2) % (Math.PI * 2);
  state.held.group.rotation.y = state.held.rotation;
  showToast("Möbeln vrids.", 1.2);
}

function makeMarker() {
  const p = player();
  const root = new THREE.Group();
  const pole = new THREE.Mesh(cylinderGeometry, materials.metal);
  pole.scale.set(.08, 1.6, .08); pole.position.y = .8; root.add(pole);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(.45, 1.1, 4), materials.light);
  arrow.rotation.z = -Math.PI / 2; arrow.position.y = 1.75; root.add(arrow);
  root.position.set(p.x, 0, p.z); root.rotation.y = p.yaw;
  scene.add(root);
  state.markers.push({ id: `marker-${state.markers.length + 1}`, ownerId: p.id, chapter: state.chapter, x: p.x, z: p.z, group: root });
  showToast(`Ljuspil ${state.markers.length} visar vägen tillbaka.`, 2);
}

const journeyObjectives = {
  forest_houses: "Utforska husen, följ stigen och hitta ingången till drakgrottan",
  dragon_caves: "Följ de blå klomärkena genom grottan till den stora draken",
  dragon_flight: "Styr draken genom de lysande ringarna mot ön",
  shark_island: "Vänta på båten — simma ut först när hajarna flyr",
  boat_ride: "Håll dig kvar på båten när havet blir allt märkligare",
  electric_hollow: "Följ de elektriskt blå larverna och nå draken före monstret",
  robot_shop: "Undersök gubben och titta på hans högra sida",
  haunted_house: "Hämta möbler ur förrådet och bygg en stark barrikad",
  ghost_station: "Spöktåget avgår exakt 03:33 — välj om du verkligen vågar gå ombord",
  ghost_train: "Vänta på avgången 03:33. Sedan stannar tåget aldrig...",
  desert: "Använd kartmärket: välj IKEA-grottan eller hitta vägen till vulkanön",
  volcano_island: "Vulkanen exploderar om 30 sekunder — nå flyktbåten i tid",
  mystery_village: "Hitta tre gamla ledtrådar och lös mysteriet 1910 / 1920",
  haunted_school: "Lös skolans tre pussel och överlev när IKEA-monstret kommer 03:33",
  lighthouse_city: "Spring genom stormstaden till fyren innan tsunamin når land",
  forbidden_hotel: "Utforska hotellrummen och hitta tre nycklar och tre gamla dokument",
  graveyard_secret: "Lös gravstenarnas tre gåtor och bryt förbannelsen före gryningen",
  lost_carnival: "Stäng av tre hemsökta åkattraktioner medan clownen följer efter",
  dollmaker_house: "Hitta tre ledtrådar i dockmakarens hus — dockorna flyttar sig när du vänder dig",
  midnight_museum: "Hitta nödutgångens tre koddelar före midnatt och fly från IKEA-monstret",
  forgotten_hospital: "Ta hissen till våningarna som saknas på kartan och hitta tre patientjournaler",
  four_floors_down: "Åk fyra våningar ner och hitta ut genom korridorerna som ändras vid varje dörr"
};

const journeyClock = {
  forest_houses: 14 * 60, dragon_caves: 18 * 60, dragon_flight: 16 * 60, shark_island: 17 * 60,
  boat_ride: 19 * 60, electric_hollow: 23 * 60, robot_shop: 20 * 60,
  haunted_house: 2 * 60 + 25, ghost_station: 3 * 60 + 32,
  ghost_train: 3 * 60 + 32, desert: 19 * 60 + 20,
  volcano_island: 17 * 60 + 30, mystery_village: 21 * 60,
  haunted_school: 3 * 60 + 32, lighthouse_city: 23 * 60 + 40,
  forbidden_hotel: 40, graveyard_secret: 5 * 60 + 55,
  lost_carnival: 23 * 60 + 33, dollmaker_house: 2 * 60 + 22,
  midnight_museum: 23 * 60 + 59, forgotten_hospital: 1 * 60 + 13,
  four_floors_down: 2 * 60 + 44
};

const GHOST_DEPARTURE_SECONDS = 20;
const GHOST_TRAIN_TRAP_SECONDS = 20;
const VOLCANO_ERUPTION_SECONDS = 30;
const VOLCANO_TIMER_EPSILON = .001;
const SCHOOL_MONSTER_SECONDS = 30;
const LIGHTHOUSE_TSUNAMI_SECONDS = 60;
const LIGHTHOUSE_WAVE_SECONDS = 6;
const GRAVEYARD_DAWN_SECONDS = 45;
const MUSEUM_MIDNIGHT_SECONDS = 30;
const JOURNEY_TIMER_EPSILON = .001;

function chapterTitle(chapter = state.chapter) {
  if (chapter === "warehouse") return "Det oändliga IKEA";
  return CHAPTER_INFO[chapter]?.title || chapter.replaceAll("_", " ").toUpperCase();
}

function chapterMenuEntries() {
  return ["warehouse", ...JOURNEY_ORDER].map((chapter, index) => ({
    chapter,
    number: index + 1,
    title: chapterTitle(chapter)
  }));
}

function refreshChapterMenu() {
  chapterGrid?.querySelectorAll("[data-chapter]").forEach((button) => {
    const active = button.dataset.chapter === state.chapter;
    button.setAttribute("aria-current", active ? "true" : "false");
  });
}

function buildChapterMenu() {
  if (!chapterGrid) return;
  chapterGrid.replaceChildren();
  chapterMenuEntries().forEach(({ chapter, number, title }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-select-button";
    button.dataset.chapter = chapter;
    button.setAttribute("aria-label", `Kapitel ${number}: ${title}`);
    const numberLabel = document.createElement("span");
    numberLabel.className = "chapter-number";
    numberLabel.textContent = String(number).padStart(2, "0");
    const nameLabel = document.createElement("strong");
    nameLabel.className = "chapter-name";
    nameLabel.textContent = title;
    button.append(numberLabel, nameLabel);
    button.addEventListener("click", () => selectChapter(chapter));
    chapterGrid.append(button);
  });
  refreshChapterMenu();
}

function openChapterMenu() {
  if (!chapterOverlay) return;
  if (choiceHandlers) {
    showToast("Gör berättelsevalet först.", 2);
    choicePrimary?.focus();
    return;
  }
  chapterMenuRestorePaused = state.paused;
  refreshChapterMenu();
  chapterOverlay.hidden = false;
  state.paused = true;
  keys.clear();
  resetTouch();
  touchControls.hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  const current = chapterGrid?.querySelector(`[data-chapter="${state.chapter}"]`)
    || chapterGrid?.querySelector("[data-chapter]");
  current?.focus();
  render();
}

function closeChapterMenu() {
  if (!chapterOverlay || chapterOverlay.hidden) return;
  chapterOverlay.hidden = true;
  state.paused = state.mode === "playing" ? chapterMenuRestorePaused : false;
  touchControls.hidden = state.mode !== "playing" || !touchDevice;
  if (state.mode === "title") (chapterStartButton || startButton).focus();
  else canvas.focus();
  render();
}

function selectChapter(chapter) {
  const entry = chapterMenuEntries().find((item) => item.chapter === chapter);
  if (!entry) return;
  ensureAudio();
  if (chapterOverlay) chapterOverlay.hidden = true;
  startOverlay.hidden = true;
  gameHud.hidden = false;
  state.paused = false;
  if (chapter === "warehouse") {
    if (state.mode === "title") startGame();
    else returnToWarehouse(`Hoppade till kapitel 1: ${entry.title}.`);
  } else {
    enterJourneyChapter(chapter, { quiet: true });
    showToast(`Hoppade till kapitel ${entry.number}: ${entry.title}.`, 4);
  }
  touchControls.hidden = !touchDevice;
  refreshChapterMenu();
  gameStatus.textContent = `Kapitel ${entry.number}: ${entry.title}`;
  canvas.focus();
  render();
}

function setJourneyObjective(text) {
  state.journey.objective = text;
  gameStatus.textContent = text;
}

function dropHeldSafely() {
  if (!state.held) return;
  const desc = state.held;
  camera.remove(desc.group);
  desc.group.position.set(desc.x, 0, desc.z);
  desc.group.rotation.set(0, desc.rotation, 0);
  if (inWarehouse()) {
    const root = loadedChunks.get(desc.chunkKey)?.root;
    (root || scene).add(desc.group);
  } else if (journeyWorld) journeyWorld.root.add(desc.group);
  state.held = null;
  player().carryingObjectId = null;
}

function closeChoice(runHandler = null) {
  if (choiceOverlay) choiceOverlay.hidden = true;
  const handlers = choiceHandlers;
  choiceHandlers = null;
  state.paused = false;
  if (runHandler && handlers?.[runHandler]) handlers[runHandler]();
  canvas.focus();
}

function openChoice({ title, text, primary, secondary, onPrimary, onSecondary }) {
  if (!choiceOverlay) {
    (onPrimary || onSecondary)?.();
    return;
  }
  choiceTitle.textContent = title;
  choiceText.textContent = text;
  choicePrimary.textContent = primary;
  choiceSecondary.textContent = secondary;
  choiceHandlers = { primary: onPrimary, secondary: onSecondary };
  choiceOverlay.hidden = false;
  state.paused = true;
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  choicePrimary.focus();
}

function hideWarehouseWorld(hidden) {
  loadedChunks.forEach(({ root }) => { root.visible = !hidden; });
  state.markers.forEach((marker) => { if (marker.group) marker.group.visible = !hidden && (marker.chapter || "warehouse") === "warehouse"; });
}

function clearJourneyWorld() {
  dropHeldSafely();
  if (journeyWorld) {
    journeyFurniture.filter((desc) => desc.group?.userData.engineSharedResources).forEach((desc) => {
      journeyWorld.root.remove(desc.group);
      const disposableMaterials = new Set();
      desc.group.traverse((object) => {
        if (object.geometry && ![boxGeometry, cylinderGeometry, sphereGeometry].includes(object.geometry)) object.geometry.dispose();
        const objectMaterials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
        objectMaterials.forEach((mat) => { if (!Object.values(materials).includes(mat)) disposableMaterials.add(mat); });
      });
      disposableMaterials.forEach((mat) => mat.dispose());
      desc.group.clear();
    });
    scene.remove(journeyWorld.root);
    disposeJourneyWorld(journeyWorld);
  }
  journeyWorld = null;
  journeyFurniture = [];
}

function configureJourneyStart(chapter) {
  const flags = {};
  if (chapter === "dragon_flight") Object.assign(flags, { ringsPassed: 0 });
  if (chapter === "shark_island") Object.assign(flags, { boatReady: false, boarded: false, boatWindow: 0 });
  if (chapter === "boat_ride") Object.assign(flags, { helmUsed: false });
  if (chapter === "robot_shop") Object.assign(flags, { robotStage: 0, buttonsRevealed: false, exitOpen: false });
  if (chapter === "haunted_house") Object.assign(flags, { furnitureTaken: 0, attackStarted: false, attackTime: 0, defended: false });
  if (chapter === "ghost_station") Object.assign(flags, {
    trainDeparting: false, departureStartedAt: null, waitingOnPlatform: false
  });
  if (chapter === "ghost_train") Object.assign(flags, {
    departed: false, departureCountdown: GHOST_DEPARTURE_SECONDS, travelTime: 0
  });
  if (chapter === "desert") Object.assign(flags, { monsterRisen: false, caveSeen: false });
  if (chapter === "volcano_island") Object.assign(flags, { eruptionIn: VOLCANO_ERUPTION_SECONDS, escaped: false });
  if (chapter === "mystery_village") Object.assign(flags, { gateOpen: false });
  if (chapter === "haunted_school") Object.assign(flags, {
    puzzlesSolved: 0, puzzleIds: [], monsterIn: SCHOOL_MONSTER_SECONDS,
    monsterArrived: false, doorsLocked: false, doorLockDone: false, exitOpen: false,
    nextFootstepAt: 4, footstepsHeard: 0, mistakes: 0
  });
  if (chapter === "lighthouse_city") Object.assign(flags, {
    tsunamiIn: LIGHTHOUSE_TSUNAMI_SECONDS, warned: false, sheltered: false,
    waveActive: false, waveElapsed: 0, wavePassed: false,
    secretFound: false, exitOpen: false
  });
  if (chapter === "forbidden_hotel") Object.assign(flags, {
    keysFound: 0, documentsFound: 0, shadowAwake: false,
    shadowDistance: null, exitOpen: false, nextWhisperAt: 5
  });
  if (chapter === "graveyard_secret") Object.assign(flags, {
    dawnIn: GRAVEYARD_DAWN_SECONDS, riddlesSolved: 0, riddleIds: [],
    curseBroken: false, monsterArrived: false, exitOpen: false, nextWhisperAt: 6
  });
  if (chapter === "lost_carnival") Object.assign(flags, {
    switchesOff: 0, switchIds: [], clownAwake: false,
    clownDistance: null, exitOpen: false, nextLaughAt: 4
  });
  if (chapter === "dollmaker_house") Object.assign(flags, {
    cluesFound: 0, clueIds: [], dollMoves: 0,
    lastDollYaw: null, lastDollMoveAt: -5, exitOpen: false
  });
  if (chapter === "midnight_museum") Object.assign(flags, {
    midnightIn: MUSEUM_MIDNIGHT_SECONDS, cluesFound: 0, clueIds: [],
    exhibitsAwake: false, monsterArrived: false, exitOpen: false
  });
  if (chapter === "forgotten_hospital") Object.assign(flags, {
    elevatorStops: 0, currentFloor: 1, visitedFloors: [1],
    recordsFound: 0, recordIds: [], nurseAwake: false,
    nurseDistance: null, exitOpen: false, nextAlarmAt: 5
  });
  if (chapter === "four_floors_down") Object.assign(flags, {
    elevatorUsed: false, doorsOpened: 0, doorIds: [],
    layoutIndex: 0, exitOpen: false
  });
  return flags;
}

function enterJourneyChapter(chapter, { quiet = false } = {}) {
  if (!JOURNEY_ORDER.includes(chapter)) throw new Error(`Okänt resekapitel: ${chapter}`);
  closeChoice();
  dropHeldSafely();
  disposeCinematicRoot();
  clearJourneyWorld();
  hideWarehouseWorld(true);
  state.chapter = chapter;
  state.mode = "playing";
  state.paused = false;
  state.monster.active = false;
  state.monster.mode = "sleeping";
  state.monster.sawHide = false;
  state.monster.breakHideTick = 0;
  monsterModel.visible = false;
  hideMask.hidden = true;
  cinematicCaption.hidden = true;
  state.journey.index = JOURNEY_ORDER.indexOf(chapter);
  state.journey.elapsed = 0;
  state.journey.stage = "start";
  state.journey.timer = 0;
  state.journey.flags = configureJourneyStart(chapter);
  state.journey.collected = [];
  state.journey.failedChapter = null;
  state.journey.objective = journeyObjectives[chapter];
  journeyWorld = buildJourneyWorld(chapter);
  journeyFurniture = journeyWorld.furniture || [];
  journeyFurniture.forEach((desc) => {
    desc.group = desc.group || desc.mesh;
    desc.rotation = Number.isFinite(desc.rotation) ? desc.rotation : desc.group?.rotation.y || 0;
    desc.removed = Boolean(desc.removed);
    if (!desc.group) desc.group = buildFurnitureModel(desc);
    if (!desc.group.parent) journeyWorld.root.add(desc.group);
  });
  scene.add(journeyWorld.root);
  const p = player();
  p.x = journeyWorld.spawn.x;
  p.y = chapter === "dragon_flight" ? 3 : chapter === "boat_ride" ? 1.05 : journeyWorld.spawn.y || 0;
  p.z = journeyWorld.spawn.z;
  p.yaw = journeyWorld.spawn.yaw ?? 0;
  p.pitch = 0;
  p.hidden = false;
  p.hiddenBy = null;
  p.flashlight = [
    "dragon_caves", "electric_hollow", "robot_shop", "haunted_house",
    "ghost_station", "ghost_train", "mystery_village", "haunted_school",
    "lighthouse_city", "forbidden_hotel", "graveyard_secret", "lost_carnival",
    "dollmaker_house", "midnight_museum", "forgotten_hospital", "four_floors_down"
  ].includes(chapter);
  state.clockMinutes = journeyClock[chapter] ?? state.clockMinutes;
  const chapterWeather = ["shark_island", "boat_ride", "lost_carnival"].includes(chapter)
    ? "clear"
    : chapter === "lighthouse_city" ? "rain" : "cloudy";
  setWeather(chapterWeather, JOURNEY_ORDER.slice(-9).includes(chapter) ? 180 : 40);
  updateWeather(0);
  updatePrompt();
  if (!quiet) showToast(`${chapterTitle(chapter)} — ${state.journey.objective}`, 5);
  render();
}

function enterNextJourneyChapter() {
  const next = JOURNEY_ORDER[state.journey.index + 1];
  if (next) enterJourneyChapter(next);
}

function returnToWarehouse(message = "Portalen för dig tillbaka till IKEA.") {
  closeChoice();
  clearJourneyWorld();
  state.chapter = "warehouse";
  state.mode = "playing";
  state.paused = false;
  state.monster.active = false;
  monsterModel.visible = false;
  hideWarehouseWorld(false);
  const p = player();
  p.x = 24; p.y = 0; p.z = 24; p.yaw = -Math.PI / 2; p.pitch = 0;
  p.hidden = false; p.hiddenBy = null; p.flashlight = true;
  state.clockMinutes = 21 * 60;
  lastChunkKey = "";
  refreshChunks(true);
  setWeather("cloudy", 18);
  updateWeather(0);
  updatePrompt();
  showToast(message, 5);
}

function failJourney(message, retryChapter = state.chapter) {
  state.journey.failedChapter = retryChapter;
  state.mode = "gameover";
  state.monster.active = false;
  monsterModel.visible = false;
  player().hidden = false;
  hideMask.hidden = true;
  touchControls.hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  showToast(`${message} Tryck R eller E för att försöka igen.`, 10);
  tone(48, .8, "sawtooth", .035);
}

function visibleInHierarchy(object) {
  for (let node = object; node; node = node.parent) {
    if (node.visible === false) return false;
  }
  return true;
}

function nearestJourneyInteractable(maxExtra = 0) {
  if (!journeyWorld) return null;
  const p = player();
  let best = null;
  let bestDistance = Infinity;
  journeyWorld.interactables.forEach((item) => {
    if (item.disabled || !visibleInHierarchy(item.mesh)) return;
    const d = distance2D(p.x, p.z, item.x, item.z);
    if (d <= (item.radius || 3.2) + maxExtra && d < bestDistance) { best = item; bestDistance = d; }
  });
  return best;
}

function hauntedDoorPosition() {
  const door = journeyWorld?.actors?.frontDoor || journeyWorld?.actors?.door;
  if (door?.position) return door.position;
  const spots = journeyWorld?.interactables?.filter((item) => item.kind === "build_spot") || [];
  if (spots.length) return {
    x: spots.reduce((sum, item) => sum + item.x, 0) / spots.length,
    z: spots.reduce((sum, item) => sum + item.z, 0) / spots.length
  };
  const interaction = journeyWorld?.interactables?.find((item) => item.kind === "house_door");
  return interaction || { x: 0, z: -18 };
}

function hauntedFortScore() {
  if (state.chapter !== "haunted_house") return 0;
  const door = hauntedDoorPosition();
  return journeyFurniture.filter((desc) => distance2D(desc.x, desc.z, door.x, door.z) < 8).length;
}

function createJourneyFurnitureVisual(desc) {
  const template = journeyFurniture.find((item) => item.type === desc.type && item.group && !item.group.userData.engineSharedResources);
  if (template) {
    const clone = template.group.clone(true);
    clone.position.set(desc.x, 0, desc.z);
    clone.rotation.set(0, desc.rotation, 0);
    clone.userData.descriptor = desc;
    return clone;
  }
  const group = buildFurnitureModel(desc);
  group.userData.engineSharedResources = true;
  return group;
}

function takeStorageFurniture() {
  if (state.held) { showToast("Placera möbeln du redan bär först.", 2); return; }
  const types = ["wardrobe", "sofa", "table", "crate", "chair", "bed"];
  const type = types[state.journey.flags.furnitureTaken % types.length];
  const p = player();
  const desc = {
    id: `haunted-storage-${state.journey.flags.furnitureTaken + 1}`,
    type, x: p.x, z: p.z, rotation: 0, removed: false, group: null
  };
  desc.group = createJourneyFurnitureVisual(desc);
  journeyFurniture.push(desc);
  journeyWorld.root.add(desc.group);
  state.journey.flags.furnitureTaken += 1;
  pickUp(desc);
  setJourneyObjective(`Bygg framför ytterdörren: ${hauntedFortScore()} / 5 möbler på plats`);
}

function collectVillageClue(item) {
  if (state.journey.collected.includes(item.id)) { showToast("Den här ledtråden har ni redan läst.", 2); return; }
  state.journey.collected.push(item.id);
  if (item.mesh?.material?.emissive) item.mesh.material.emissive.setHex(0x4a8f57);
  const clues = [
    "En dagbok säger: 'We arrived in 1910.'",
    "Skylten säger VILLAGE FROM 1920 — tio år saknas.",
    "En trasig klocka har stannat exakt 03:33."
  ];
  showToast(clues[(state.journey.collected.length - 1) % clues.length], 5);
  if (state.journey.collected.length >= 3) {
    state.journey.flags.gateOpen = true;
    if (journeyWorld.actors.gate) journeyWorld.actors.gate.visible = true;
    setJourneyObjective("Mysteriets port har öppnats — välj nästa nya obby");
    tone(523, .3); tone(659, .4, "sine", .025, .22);
  } else setJourneyObjective(`Hitta gamla ledtrådar: ${state.journey.collected.length} / 3`);
}

function markJourneyItem(item, { hide = false, color = 0x39d98a } = {}) {
  if (!item) return;
  item.disabled = true;
  if (hide && item.mesh) item.mesh.visible = false;
  item.mesh?.traverse?.((object) => {
    if (object.material?.emissive) {
      object.material.emissive.setHex(color);
      object.material.emissiveIntensity = Math.max(2.4, object.material.emissiveIntensity || 0);
    }
  });
}

function showJourneyExitReady() {
  const actors = journeyWorld?.actors || {};
  if (actors.exitLight) actors.exitLight.visible = true;
  if (actors.exit) actors.exit.visible = true;
  if (actors.exitPortal) actors.exitPortal.visible = true;
  pulseMaterial(actors.exitLight, 4.5);
  pulseMaterial(actors.exitDoor, 1.8);
}

function solveSchoolPuzzle(item) {
  const flags = state.journey.flags;
  if (flags.puzzleIds.includes(item.id)) { showToast("Det pusslet är redan löst.", 2); return; }
  if (item.id.includes("bell") && !flags.monsterArrived) {
    showToast("Skolklockan sitter fast. Den börjar fungera först exakt 03:33...", 3.5);
    return;
  }
  flags.puzzleIds.push(item.id);
  flags.puzzlesSolved = flags.puzzleIds.length;
  state.journey.collected.push(item.id);
  markJourneyItem(item);
  const solvedText = item.id.includes("clock")
    ? "Klockans visare klickar fast på 03:33."
    : item.id.includes("fuse")
      ? "Säkringarna kopplas rätt. Korridorens lampor vaknar."
      : "Skolklockan ringer tre gånger. En nödutgång låses upp!";
  showToast(solvedText, 4);
  tone(392 + flags.puzzlesSolved * 90, .25, "sine", .025);
  if (flags.puzzlesSolved >= 3) {
    flags.exitOpen = true;
    state.journey.stage = "escape";
    showJourneyExitReady();
    setJourneyObjective("Alla tre pussel är lösta — spring till skolans nödutgång!");
  } else setJourneyObjective(`Lös skolans pussel: ${flags.puzzlesSolved} / 3 · monstret kommer 03:33`);
}

function collectHotelItem(item) {
  if (state.journey.collected.includes(item.id)) { showToast("Det här fyndet har ni redan tagit.", 2); return; }
  const flags = state.journey.flags;
  state.journey.collected.push(item.id);
  markJourneyItem(item, { hide: true });
  if (item.kind === "hotel_key") flags.keysFound += 1;
  else flags.documentsFound += 1;
  if (!flags.shadowAwake) {
    flags.shadowAwake = true;
    const follower = journeyWorld.actors.follower || journeyWorld.actors.shadowCreature;
    if (follower) follower.visible = true;
    showToast("Något rör sig längre bort i korridoren...", 4);
    tone(74, .5, "sawtooth", .024);
  } else showToast(item.kind === "hotel_key" ? "En rostig hotellnyckel." : "Ett dokument om gäster som aldrig checkade ut.", 3);
  flags.exitOpen = flags.keysFound >= 3 && flags.documentsFound >= 3;
  if (flags.exitOpen) {
    showJourneyExitReady();
    state.journey.stage = "escape";
    setJourneyObjective("Alla nycklar och dokument är hittade — fly genom hotellets entré!");
  } else setJourneyObjective(`Hotellnycklar ${flags.keysFound} / 3 · dokument ${flags.documentsFound} / 3`);
}

function resolveGraveRiddle(item, correct) {
  if (!correct) {
    state.journey.flags.mistakes = (state.journey.flags.mistakes || 0) + 1;
    showToast("Fel svar. Marken mullrar under gravstenen...", 3);
    tone(58, .45, "square", .025);
    return;
  }
  const flags = state.journey.flags;
  if (flags.riddleIds.includes(item.id)) return;
  flags.riddleIds.push(item.id);
  flags.riddlesSolved = flags.riddleIds.length;
  state.journey.collected.push(item.id);
  markJourneyItem(item);
  showToast(`Gravstenens gåta är löst: ${flags.riddlesSolved} / 3.`, 3);
  if (flags.riddlesSolved >= 3) setJourneyObjective("Alla gåtor är lösta — bryt förbannelsen vid kapellets altare!");
  else setJourneyObjective(`Lös gravstenarnas gåtor före gryningen: ${flags.riddlesSolved} / 3`);
}

function openGraveRiddle(item) {
  if (state.journey.flags.riddleIds.includes(item.id)) { showToast("Den här gravstenen lyser redan.", 2); return; }
  const riddles = item.id.endsWith("1") ? {
    text: "Jag vaknar när natten dör. Vilken tid är jag?", primary: "GRYNINGEN", secondary: "MIDNATT", correct: "primary"
  } : item.id.endsWith("2") ? {
    text: "Räkna korparna som aldrig flyger.", primary: "SJU", secondary: "TRE", correct: "secondary"
  } : {
    text: "Vänd namnet som saknar en skugga. Vem står inte kvar?", primary: "INGEN", secondary: "SKRAMLAREN", correct: "primary"
  };
  openChoice({
    title: "GRAVSTENENS GÅTA",
    text: riddles.text,
    primary: riddles.primary,
    secondary: riddles.secondary,
    onPrimary: () => resolveGraveRiddle(item, riddles.correct === "primary"),
    onSecondary: () => resolveGraveRiddle(item, riddles.correct === "secondary")
  });
}

function collectCarnivalSwitch(item) {
  const flags = state.journey.flags;
  if (flags.switchIds.includes(item.id)) { showToast("Den attraktionen är redan avstängd.", 2); return; }
  flags.switchIds.push(item.id);
  flags.switchesOff = flags.switchIds.length;
  state.journey.collected.push(item.id);
  markJourneyItem(item);
  showToast(`Attraktionen stannar med ett gnissel: ${flags.switchesOff} / 3.`, 3);
  tone(92, .4, "sawtooth", .022);
  if (flags.switchesOff >= 3) {
    flags.exitOpen = true;
    state.journey.stage = "escape";
    showJourneyExitReady();
    setJourneyObjective("Tivolits grind har öppnats — spring ifrån clownen!");
  } else setJourneyObjective(`Stäng av de hemsökta attraktionerna: ${flags.switchesOff} / 3`);
}

function collectSimpleChapterItem(item, flagName, idsName, target, completeText, progressText, unlockWhen = () => true) {
  const flags = state.journey.flags;
  if (flags[idsName].includes(item.id)) { showToast("Den ledtråden är redan hittad.", 2); return false; }
  flags[idsName].push(item.id);
  flags[flagName] = flags[idsName].length;
  state.journey.collected.push(item.id);
  markJourneyItem(item, { hide: true });
  showToast(progressText(flags[flagName]), 3);
  if (flags[flagName] >= target) {
    if (unlockWhen()) {
      flags.exitOpen = true;
      state.journey.stage = "escape";
      showJourneyExitReady();
      setJourneyObjective(completeText);
    } else {
      state.journey.stage = "ready";
      setJourneyObjective("Nödutgångens kod är klar — vänta tills museiklockan slår tolv");
    }
  }
  return true;
}

function interactJourney() {
  if (state.held) { placeHeld(); return; }
  if (state.chapter === "haunted_house") {
    const desc = nearestObject((item) => furnitureTypes[item.type]?.movable, 2.8);
    if (desc) { pickUp(desc); return; }
  }
  const item = nearestJourneyInteractable();
  if (!item) { showToast("Inget att använda här.", 1.5); return; }
  switch (item.kind) {
    case "house":
      state.journey.flags.mapFound = true;
      setJourneyObjective("En gammal karta visar blå klomärken i norr — hitta drakgrottan.");
      showToast("I huset hittar ni en karta över skogen och grottan.", 4);
      break;
    case "cave_entrance":
    case "dragon_cave":
      enterNextJourneyChapter();
      break;
    case "blue_dragon":
    case "dragon":
      enterNextJourneyChapter();
      break;
    case "dragon_rescue":
      state.monster.active = false;
      monsterModel.visible = false;
      showToast("Den blå draken kastar sig mellan er och monstret — ni räddas!", 4);
      enterNextJourneyChapter();
      break;
    case "signal":
      state.journey.elapsed = Math.max(state.journey.elapsed, 9.7);
      showToast("Signalelden tänds. Båten styr mot ön!", 3);
      break;
    case "boat":
      if (!state.journey.flags.boatReady) showToast("Båten är inte framme än. Hajarna är fortfarande här!", 3);
      else { state.journey.flags.boarded = true; enterNextJourneyChapter(); }
      break;
    case "helm":
      state.journey.flags.helmUsed = true;
      setJourneyObjective("Styr båten mellan klipporna med A/D eller joysticken");
      showToast("Ni tar ratten — styr vänster och höger genom vågorna!", 3);
      break;
    case "robot":
      state.journey.flags.robotStage = Math.max(1, state.journey.flags.robotStage);
      setJourneyObjective("Han vänder aldrig höger. Smyg runt till hans högra sida och leta efter knappar.");
      showToast("Gubben vinkar: Hej, hej, hej, hej...", 4);
      break;
    case "robot_buttons":
    case "buttons":
      if (player().x < .5) { showToast("Knapparna sitter på hans högra sida.", 2.5); break; }
      state.journey.flags.buttonsRevealed = true;
      state.journey.flags.exitOpen = true;
      if (journeyWorld.actors.buttons) {
        const buttons = Array.isArray(journeyWorld.actors.buttons) ? journeyWorld.actors.buttons : [journeyWorld.actors.buttons];
        buttons.forEach((button) => { button.visible = true; });
      }
      if (journeyWorld.actors.robot) journeyWorld.actors.robot.rotation.y = -Math.PI / 2;
      setJourneyObjective("Det är en robot och maten är plast — spring till utgången!");
      showToast("KLICK! Gubbens sida öppnas. Han är en ROBOT!", 4);
      break;
    case "shop_exit":
    case "exit":
    case "chapter_exit":
      if (state.chapter === "robot_shop" && !state.journey.flags.exitOpen) showToast("Dörren är låst. Undersök gubben först.", 2.5);
      else if (state.chapter === "haunted_house" && !state.journey.flags.defended) showToast("Ni måste förstärka huset innan ni lämnar det.", 2.5);
      else enterNextJourneyChapter();
      break;
    case "storage":
    case "furniture_storage":
    case "infinite_storage":
      takeStorageFurniture();
      break;
    case "ghost_train":
    case "train_door":
    case "board_train":
      openChoice({
        title: "AVGÅNG EXAKT 03:33",
        text: "Spöktåget är tomt. Om ni går ombord kan ni inte gå av igen — och där finns ingen mat.",
        primary: "GÅ OMBORD ÄNDÅ",
        secondary: "STANNA PÅ PERRONGEN",
        onPrimary: () => {
          const secondsUntilDeparture = Math.max(0, GHOST_DEPARTURE_SECONDS - state.journey.elapsed);
          enterJourneyChapter("ghost_train");
          state.journey.flags.departureCountdown = secondsUntilDeparture;
          state.clockMinutes = 3 * 60 + 33 - secondsUntilDeparture / GHOST_DEPARTURE_SECONDS;
          setJourneyObjective("Ni är ombord. Dörrarna stängs och tåget avgår exakt 03:33.");
        },
        onSecondary: () => {
          state.journey.flags.waitingOnPlatform = true;
          const p = player();
          p.x = -7; p.y = 0; p.yaw = -Math.PI / 2;
          setJourneyObjective("Bra val. Stanna på perrongen — spöktåget avgår 03:33.");
          showToast("Ni stannar kvar. Håll ögonen på klockan: 03:33.", 4);
        }
      });
      break;
    case "refuse_train":
      state.journey.flags.waitingOnPlatform = true;
      setJourneyObjective("Ni stannar på perrongen. Spöktåget avgår exakt 03:33.");
      showToast("Bra val. Vänta på perrongen tills klockan blir 03:33.", 4);
      break;
    case "desert_cave":
    case "cave_portal":
    case "desert_cave_return":
      state.journey.flags.caveSeen = true;
      openChoice({
        title: "GROTTAN GÅR TILL IKEA",
        text: "Ni får välja: hoppa tillbaka till början eller stanna i öknen och hitta vägen vidare.",
        primary: "HOPPA TILL IKEA",
        secondary: "STANNA I ÖKNEN",
        onPrimary: () => returnToWarehouse("Grottportalen släpper er tillbaka i det oändliga IKEA.") ,
        onSecondary: () => setJourneyObjective("Ni stannar. Följ det röda skenet mot vulkanön.")
      });
      break;
    case "map":
      state.journey.flags.mapRead = true;
      setJourneyObjective("Kartan visar X vid grottan i nordväst och en glödande väg mot vulkanön.");
      showToast("X = grottan tillbaka till IKEA. ▲ = vägen vidare.", 4);
      break;
    case "volcano_portal":
    case "desert_exit":
      enterJourneyChapter("volcano_island");
      break;
    case "escape_boat":
    case "volcano_escape":
      state.journey.flags.escaped = true;
      enterNextJourneyChapter();
      break;
    case "village_clue":
    case "clue":
      collectVillageClue(item);
      break;
    case "old_sign":
      showToast("VILLAGE FROM 1920 — men en annan skylt säger 1910...", 5);
      setJourneyObjective("Utforska byn och hitta de tre engelska ledtrådarna");
      break;
    case "warning":
      showToast(`Marken mullrar. Utbrottet kommer om ungefär ${Math.max(1, Math.ceil(state.journey.flags.eruptionIn - VOLCANO_TIMER_EPSILON))} sekunder!`, 4);
      break;
    case "locked_door":
      showToast("Dörren går inte att öppna. Tåget har ingen slutstation.", 3);
      break;
    case "sign":
      showToast(item.label || "Ni läser skylten.", 3);
      break;
    case "build_spot":
      setJourneyObjective(`Placera gamla möbler här: ${hauntedFortScore()} / 5`);
      showToast("Bär hit möbler från det oändliga förrådet.", 3);
      break;
    case "mystery_gate":
    case "village_gate":
      if (!state.journey.flags.gateOpen) showToast("Porten behöver tre ledtrådar.", 2.5);
      else openChoice({
        title: "DEN GAMLA SKOLAN",
        text: "Bakom porten står en övergiven skola. Ett ensamt ljus blinkar i korridoren.",
        primary: "GÅ IN I SKOLAN",
        secondary: "STANNA I BYN",
        onPrimary: () => enterNextJourneyChapter(),
        onSecondary: () => showToast("Ni stannar och letar efter ännu fler mysterier.", 3)
      });
      break;
    case "school_puzzle":
      solveSchoolPuzzle(item);
      break;
    case "hideout":
      tryHide();
      break;
    case "school_exit":
      if (!state.journey.flags.exitOpen) showToast("Nödutgången har tre lås. Lös alla skolpussel först.", 3);
      else {
        state.monster.active = false;
        monsterModel.visible = false;
        player().hidden = false;
        hideMask.hidden = true;
        enterNextJourneyChapter();
      }
      break;
    case "lighthouse_shelter":
      state.journey.flags.sheltered = true;
      state.journey.stage = "shelter";
      item.disabled = true;
      if (journeyWorld.actors.shelterSpawn) {
        player().x = journeyWorld.actors.shelterSpawn.x;
        player().z = journeyWorld.actors.shelterSpawn.z;
        player().yaw = 0;
      }
      setJourneyObjective("Ni är inne i fyren — håll ut när tsunamin träffar och lyssna mot källaren");
      showToast("Fyrens järndörr slår igen. Stormvågen närmar sig!", 4);
      break;
    case "lighthouse_secret":
      if (!state.journey.flags.sheltered) showToast("Ni måste först hinna in i fyren.", 2.5);
      else if (!state.journey.flags.wavePassed) showToast("Vågen dånar utanför. Vänta tills fyren slutar skaka!", 3);
      else if (!state.journey.flags.secretFound) {
        state.journey.flags.secretFound = true;
        state.journey.flags.exitOpen = true;
        state.journey.collected.push(item.id);
        markJourneyItem(item);
        showJourneyExitReady();
        setJourneyObjective("Källarens loggbok avslöjar fyrens hemlighet — hitta tunneln ut");
        showToast("Loggboken berättar om ett hotell där ingen gäst checkade ut...", 5);
      }
      break;
    case "lighthouse_exit":
      if (!state.journey.flags.wavePassed) showToast("Tunneln är blockerad tills tsunamin passerat.", 2.5);
      else if (!state.journey.flags.secretFound) showToast("Undersök de konstiga ljuden i fyrens källare först.", 3);
      else enterNextJourneyChapter();
      break;
    case "hotel_key":
    case "hotel_document":
      collectHotelItem(item);
      break;
    case "hotel_exit":
      if (!state.journey.flags.exitOpen) showToast(`Entrén är låst · nycklar ${state.journey.flags.keysFound}/3 · dokument ${state.journey.flags.documentsFound}/3`, 3);
      else enterNextJourneyChapter();
      break;
    case "grave_riddle":
      openGraveRiddle(item);
      break;
    case "grave_altar":
      if (state.journey.flags.riddlesSolved < 3) showToast("Altaret behöver svaren från alla tre gravstenar.", 3);
      else if (!state.journey.flags.curseBroken) {
        state.journey.flags.curseBroken = true;
        state.journey.flags.exitOpen = true;
        state.monster.active = false;
        monsterModel.visible = false;
        markJourneyItem(item);
        showJourneyExitReady();
        setJourneyObjective("Förbannelsen är bruten — porten till det försvunna tivolit har öppnats");
        showToast("Ett blått ljus sveper över gravarna. Skramlaren försvinner!", 4);
      }
      break;
    case "graveyard_exit":
      if (!state.journey.flags.curseBroken) showToast("Kyrkogårdsporten öppnas först när förbannelsen är bruten.", 3);
      else enterNextJourneyChapter();
      break;
    case "carnival_switch":
      collectCarnivalSwitch(item);
      break;
    case "carnival_exit":
      if (!state.journey.flags.exitOpen) showToast(`Grinden saknar ström · attraktioner ${state.journey.flags.switchesOff}/3`, 3);
      else enterNextJourneyChapter();
      break;
    case "doll_clue":
      collectSimpleChapterItem(
        item, "cluesFound", "clueIds", 3,
        "Dockmakarens lås har öppnats — lämna huset innan dockorna kommer närmare",
        (count) => `En lapp från dockmakaren: ${count} / 3. Något flyttade sig bakom er...`
      );
      break;
    case "doll_exit":
      if (!state.journey.flags.exitOpen) showToast(`Dörren behöver dockmakarens tre ledtrådar · ${state.journey.flags.cluesFound}/3`, 3);
      else enterNextJourneyChapter();
      break;
    case "museum_clue":
      collectSimpleChapterItem(
        item, "cluesFound", "clueIds", 3,
        "Nödutgångens kod är komplett — spring medan utställningen jagar er",
        (count) => `Koddel ${count} / 3 hittad bakom ett gammalt konstverk.`,
        () => state.journey.flags.exhibitsAwake
      );
      break;
    case "museum_exit":
      if (!state.journey.flags.exhibitsAwake) showToast("Museiklockan har ännu inte slagit tolv. Något väntar i mörkret...", 3);
      else if (!state.journey.flags.exitOpen) showToast(`Nödutgången behöver tre koddelar · ${state.journey.flags.cluesFound}/3`, 3);
      else {
        state.monster.active = false;
        monsterModel.visible = false;
        enterNextJourneyChapter();
      }
      break;
    case "hospital_elevator": {
      const flags = state.journey.flags;
      const floors = [4, 7, 13];
      const floorIndex = Math.min(flags.elevatorStops, floors.length - 1);
      const floor = floors[floorIndex];
      flags.elevatorStops = Math.min(floors.length, flags.elevatorStops + 1);
      flags.currentFloor = floor;
      if (!flags.visitedFloors.includes(floor)) flags.visitedFloors.push(floor);
      const destination = journeyWorld.actors.floorSpawns?.[floorIndex];
      if (destination) {
        player().x = destination.x;
        player().z = destination.z;
        player().yaw = destination.yaw ?? 0;
      }
      if (floor >= 7 && !flags.nurseAwake) {
        flags.nurseAwake = true;
        const nurse = journeyWorld.actors.nurse;
        if (nurse) nurse.visible = true;
      }
      setJourneyObjective(`VÅNING ${floor} finns inte på kartan — hitta patientjournalen och återvänd till hissen`);
      showToast(`Hissen stannar på VÅNING ${floor}. Den knappen fanns inte nyss...`, 4);
      break;
    }
    case "hospital_record": {
      const found = collectSimpleChapterItem(
        item, "recordsFound", "recordIds", 3,
        "Tre journaler avslöjar den hemliga källaren — ta sjukhusets nödutgång",
        (count) => `Patientjournal ${count} / 3: "Hissen fortsätter fyra våningar ner."`
      );
      if (found) {
        const elevator = journeyWorld.actors.elevator;
        if (elevator?.position) {
          player().x = elevator.position.x;
          player().z = elevator.position.z + 3;
          state.journey.flags.currentFloor = 1;
        }
      }
      break;
    }
    case "hospital_exit":
      if (!state.journey.flags.exitOpen) showToast(`Nödutgången kräver tre patientjournaler · ${state.journey.flags.recordsFound}/3`, 3);
      else enterNextJourneyChapter();
      break;
    case "basement_elevator": {
      const flags = state.journey.flags;
      flags.elevatorUsed = true;
      state.journey.stage = "shifting_maze";
      const destination = journeyWorld.actors.basementSpawn || journeyWorld.actors.corridorLayouts?.[0]?.userData?.spawn;
      if (destination) { player().x = destination.x; player().z = destination.z; player().yaw = destination.yaw ?? 0; }
      setJourneyObjective("FYRA VÅNINGAR NER — öppna fyra dörrar och följ korridoren som byggs om");
      showToast("Hissen passerar -1, -2, -3... och stannar på -4.", 4);
      break;
    }
    case "shifting_door": {
      const flags = state.journey.flags;
      if (!flags.elevatorUsed) { showToast("Ta kontrollhusets hiss ner till källaren först.", 3); break; }
      if (flags.doorIds.includes(item.id)) { showToast("Den dörren leder nu tillbaka till samma korridor.", 2); break; }
      flags.doorIds.push(item.id);
      flags.doorsOpened = flags.doorIds.length;
      flags.layoutIndex = flags.doorsOpened % Math.max(1, journeyWorld.actors.corridorLayouts?.length || 1);
      (journeyWorld.actors.corridorLayouts || []).forEach((layout, index) => { layout.visible = index === flags.layoutIndex; });
      markJourneyItem(item);
      tone(64, .45, "sawtooth", .022);
      if (flags.doorsOpened >= 4) {
        flags.exitOpen = true;
        showJourneyExitReady();
        setJourneyObjective("Den fjärde dörren visar den riktiga utgången — lämna källaren!");
      } else setJourneyObjective(`Korridoren förändrades igen · dörrar ${flags.doorsOpened} / 4`);
      showToast("Väggarna glider. Korridoren bakom dörren är inte samma längre!", 3);
      break;
    }
    case "basement_exit":
      if (!state.journey.flags.exitOpen) showToast(`Utgången finns inte i den här korridoren än · ${state.journey.flags.doorsOpened}/4 dörrar`, 3);
      else {
        state.journey.loop += 1;
        enterJourneyChapter("forest_houses");
      }
      break;
    default:
      showToast(item.label || "Ni undersöker föremålet.", 2.5);
  }
}

function interact() {
  if (state.mode === "gameover" || state.mode === "ending") { resetGame(); return; }
  if (state.mode !== "playing" || state.paused || player().hidden) return;
  if (!inWarehouse()) { interactJourney(); return; }
  const exit = nearestObject((desc) => desc.type === "exit", 3.1);
  if (exit) {
    state.exitFound = true;
    if (!state.exitUnlocked) { showToast("Dörren öppnas först efter att du överlevt en IKEA-natt.", 3); return; }
    enterJourneyChapter("forest_houses"); return;
  }
  if (state.held) { placeHeld(); return; }
  const desc = nearestObject((item) => furnitureTypes[item.type].movable, 2.8);
  if (desc) pickUp(desc); else showToast("Inget att använda här.", 1.5);
}

function crossedClock(oldValue, newValue, target) {
  return newValue >= oldValue ? oldValue < target && newValue >= target : oldValue < target || newValue >= target;
}

function updateClock(dt) {
  const old = state.clockMinutes;
  state.clockMinutes += dt * CLOCK_SPEED;
  if (state.clockMinutes >= 1440) {
    state.clockMinutes -= 1440;
    if (inWarehouse()) state.day += 1;
  }
  if (!inWarehouse()) return;
  const monsterMinute = 3 * 60 + 33;
  if (!state.monsterDays[state.day] && crossedClock(old, state.clockMinutes, monsterMinute)) spawnMonster();
  if (state.monster.active && crossedClock(old, state.clockMinutes, 6 * 60)) {
    state.monster.active = false; state.monster.mode = "sleeping"; monsterModel.visible = false;
    state.nightsSurvived += 1; state.exitUnlocked = true; player().hidden = false; hideMask.hidden = true;
    setWeather("rainbow", 16);
    showToast("06:00 — du överlevde! Den hemliga utgången går nu att öppna.", 5);
    tone(392, .25); tone(523, .35, "sine", .025, .2); tone(659, .5, "sine", .02, .45);
  }
}

function setWeather(type, seconds = null) {
  const index = weatherCycle.findIndex(([name]) => name === type);
  if (index >= 0) state.weather.index = index;
  state.weather.type = type;
  state.weather.startedTick = state.tick;
  if (type === "tsunami") {
    const p = player();
    state.weather.originX = p.x;
    state.weather.originZ = p.z;
    state.weather.heading = p.yaw;
  }
  const duration = seconds ?? weatherCycle[state.weather.index][1];
  state.weather.endsTick = state.tick + Math.round(duration * 60);
  const messages = {
    clear: "Molnen spricker upp.", cloudy: "Tunga moln samlas över varuhuset.",
    rain: "Regnet slår mot takfönstren.", rainbow: "En regnbåge syns genom glastaket.",
    tornado_warning: "TORNADOVARNING — sök skydd bakom tunga möbler!", tornado: "TORNADON ÄR HÄR!",
    tsunami_warning: "TSUNAMIVARNING — sök höjd eller göm dig!", tsunami: "TSUNAMIN SKÖLJER IN!"
  };
  showToast(messages[type] || type, type.includes("warning") ? 4 : 2.5);
}

function updateWeather(dt) {
  if (state.tick >= state.weather.endsTick) {
    state.weather.index = (state.weather.index + 1) % weatherCycle.length;
    setWeather(weatherCycle[state.weather.index][0], weatherCycle[state.weather.index][1]);
  }
  const type = state.weather.type;
  rain.visible = type === "rain" || type === "tornado" || type === "tornado_warning";
  tornado.visible = type === "tornado";
  tsunami.visible = type === "tsunami";
  rainbow.visible = type === "rainbow";
  if (rain.visible) {
    rain.position.set(player().x, 0, player().z);
    for (let i = 0; i < rainPositions.length / 3; i += 1) {
      rainPositions[i * 3 + 1] -= dt * (19 + i % 9);
      if (rainPositions[i * 3 + 1] < 0) rainPositions[i * 3 + 1] += 28;
      if (type === "tornado") rainPositions[i * 3] += dt * 5;
    }
    rain.geometry.attributes.position.needsUpdate = true;
  }
  if (rainbow.visible) {
    rainbow.position.set(player().x + 16, 1.1, player().z - 32);
    rainbow.rotation.y = player().yaw;
  }
  if (tornado.visible) {
    tornado.position.set(player().x + 18, 0, player().z - 12);
    const positions = tornado.userData.positions;
    const count = positions.length / 3;
    for (let i = 0; i < count; i += 1) {
      const h = (i / count) * 18;
      const radius = .6 + h * .28;
      const angle = i * .63 + state.timeMs * .006 * (1 + i % 3 * .15);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    tornado.geometry.attributes.position.needsUpdate = true;
    if (!player().hidden) movePlayer(Math.sin(state.timeMs * .004) * dt * .75, Math.cos(state.timeMs * .003) * dt * .75);
  }
  if (tsunami.visible) {
    const progress = clamp((state.tick - state.weather.startedTick) / 180, 0, 1);
    tsunami.position.set(state.weather.originX, progress * 1.15, state.weather.originZ);
    tsunami.rotation.y = state.weather.heading;
    tsunami.children[1].position.z = -32 + progress * 50;
    if (!player().hidden) movePlayer(dt * .9, dt * .25);
  }
}

function spawnJourneyMonster(distance = 22, speedScale = .8, options = {}) {
  if (state.monster.active) return;
  const p = player();
  const source = options.source || journeyWorld?.actors?.monsterSpawn || null;
  const behindX = Math.sin(p.yaw);
  const behindZ = Math.cos(p.yaw);
  const preferredX = Number.isFinite(source?.position?.x) ? source.position.x : p.x + behindX * distance;
  const preferredZ = Number.isFinite(source?.position?.z) ? source.position.z : p.z + behindZ * distance;
  let spawnX = preferredX;
  let spawnZ = preferredZ;
  if (collides(spawnX, spawnZ, .7)) {
    for (let i = 0; i < 16; i += 1) {
      const angle = i * Math.PI / 4;
      const radius = 3 + Math.floor(i / 8) * 3;
      const candidateX = preferredX + Math.cos(angle) * radius;
      const candidateZ = preferredZ + Math.sin(angle) * radius;
      if (!collides(candidateX, candidateZ, .7)) { spawnX = candidateX; spawnZ = candidateZ; break; }
    }
  }
  state.monster.x = spawnX;
  state.monster.z = spawnZ;
  state.monster.active = true;
  state.monster.mode = "hunting";
  state.monster.targetPlayerId = state.localPlayerId;
  state.monster.lastSeenX = p.x;
  state.monster.lastSeenZ = p.z;
  state.monster.sawHide = false;
  state.monster.speedScale = speedScale;
  monsterModel.visible = true;
  if (source?.visible != null) source.visible = false;
  showToast(options.message || "Skramlaren har följt efter er till den här världen!", 4);
  monsterArrivalSound();
}

function pulseMaterial(object, value) {
  if (!object) return;
  object.traverse?.((child) => {
    if (child.material?.emissiveIntensity != null) child.material.emissiveIntensity = value;
  });
}

function updateJourneyActors(dt) {
  if (!journeyWorld) return;
  const actors = journeyWorld.actors || {};
  const t = state.journey.elapsed;
  const dragon = actors.dragon || actors.blueDragon;
  if (dragon && state.chapter !== "dragon_flight") {
    if (dragon.userData.baseY == null) dragon.userData.baseY = dragon.position.y;
    dragon.position.y = dragon.userData.baseY + Math.sin(t * 1.7) * .25;
    dragon.rotation.y += Math.sin(t * .9) * dt * .08;
  }
  const rings = actors.rings || [];
  rings.forEach((ring, index) => { ring.rotation.z += dt * (.28 + index * .04); });
  const larvae = actors.larvae || actors.larvaClusters || [];
  larvae.forEach((larva, index) => pulseMaterial(larva, 2.8 + Math.sin(t * 3 + index) * 1.4));
  const sharks = actors.sharks || [];
  sharks.forEach((shark, index) => {
    if (shark.userData.angle == null) {
      shark.userData.angle = Math.atan2(shark.position.z, shark.position.x);
      shark.userData.radius = Math.max(18, Math.hypot(shark.position.x, shark.position.z));
    }
    const flee = state.journey.flags.boatReady ? Math.min(36, (t - 10) * 8) : 0;
    const angle = shark.userData.angle + t * (.32 + index * .025);
    const radius = shark.userData.radius + Math.max(0, flee);
    shark.position.x = Math.cos(angle) * radius;
    shark.position.z = Math.sin(angle) * radius;
    shark.rotation.y = -angle;
    if (radius > 55) shark.visible = false;
  });
  const robotArm = actors.robotArm || actors.wavingArm;
  if (robotArm) robotArm.rotation.z = -.35 + Math.sin(t * 5) * .5;
  const train = actors.train;
  if (train && state.chapter === "ghost_station" && state.journey.flags.trainDeparting) train.position.z -= dt * 8;
  if (state.chapter === "ghost_station" && actors.clockHands?.length === 2) {
    const minute = ((state.clockMinutes % 60) + 60) % 60;
    const hour = ((state.clockMinutes / 60) % 12 + 12) % 12;
    actors.clockHands[0].rotation.x = -hour / 12 * Math.PI * 2;
    actors.clockHands[1].rotation.x = -minute / 60 * Math.PI * 2;
  }
  const lava = actors.lava;
  if (lava && state.chapter === "volcano_island") {
    const danger = clamp(1 - state.journey.flags.eruptionIn / VOLCANO_ERUPTION_SECONDS, 0, 1);
    const lavaObjects = Array.isArray(lava) ? lava : [lava];
    lavaObjects.forEach((object, index) => {
      if (object.userData.baseScaleY == null) object.userData.baseScaleY = object.scale.y;
      object.scale.y = object.userData.baseScaleY * (1 + danger * (index === 0 ? 1.2 : .35));
      pulseMaterial(object, 2 + danger * 5);
    });
  }
  if (state.chapter === "haunted_school") {
    (actors.lights || []).forEach((light, index) => {
      const blackout = Math.floor(t * 9 + index * 3) % 17 === 0 || (state.journey.flags.monsterArrived && Math.floor(t * 13 + index) % 23 < 2);
      light.visible = !blackout;
      if (!blackout) pulseMaterial(light, 1.5 + Math.sin(t * 7 + index) * .7);
    });
    (actors.doors || []).forEach((door, index) => {
      if (door.userData.schoolBaseYaw == null) door.userData.schoolBaseYaw = door.rotation.y;
      const slam = state.journey.flags.doorsLocked ? Math.sin(Math.min(1, Math.max(0, t - 6)) * Math.PI / 2) : 0;
      const closedYaw = door.userData.closedYaw ?? door.userData.schoolBaseYaw;
      door.rotation.y = THREE.MathUtils.lerp(door.userData.schoolBaseYaw, closedYaw, slam)
        + Math.sin(t * 3 + index) * .018 * (1 - slam);
    });
    (actors.footsteps || []).forEach((step, index) => {
      step.visible = state.journey.flags.footstepsHeard > index;
      if (step.visible) pulseMaterial(step, 1.5 + Math.sin(t * 4 + index) * .8);
    });
  }
  if (state.chapter === "lighthouse_city") {
    if (actors.lighthouseBeam) actors.lighthouseBeam.rotation.y += dt * .55;
    (actors.stormClouds || []).forEach((cloud, index) => {
      if (cloud.userData.baseX == null) cloud.userData.baseX = cloud.position.x;
      cloud.position.x = cloud.userData.baseX + Math.sin(t * .18 + index) * 5;
    });
    if (actors.tsunami) {
      const startZ = actors.tsunami.userData.startZ ?? 153;
      const safeZ = actors.tsunami.userData.safeZ ?? -78;
      const approach = clamp(1 - state.journey.flags.tsunamiIn / LIGHTHOUSE_TSUNAMI_SECONDS, 0, 1);
      actors.tsunami.position.z = startZ + (safeZ - startZ) * approach - (state.journey.flags.waveElapsed || 0) * 11;
      actors.tsunami.scale.y = 1 + approach * .7;
      pulseMaterial(actors.tsunami, .8 + approach * 2.4);
    }
  }
  if (state.chapter === "lost_carnival") {
    (actors.rides || []).forEach((ride, index) => {
      const switchId = `carnival-switch-${index + 1}`;
      if (state.journey.flags.switchIds.includes(switchId)) return;
      const rotor = ride.userData.rotor || ride;
      const speed = ride.userData.speed || (.2 + index * .08);
      if (index === 1) rotor.rotation.z += dt * speed;
      else rotor.rotation.y += dt * speed;
    });
    (actors.lights || []).forEach((light, index) => pulseMaterial(light, 2.2 + Math.sin(t * 5 + index) * 1.5));
  }
  if (state.chapter === "midnight_museum" && state.journey.flags.exhibitsAwake) {
    (actors.statues || []).forEach((statue, index) => {
      statue.rotation.y += dt * (.08 + index * .012);
      statue.position.y = Math.sin(t * 2 + index) * .05;
    });
    (actors.paintings || []).forEach((painting, index) => {
      if (painting.userData.baseY == null) painting.userData.baseY = painting.position.y;
      painting.rotation.z = Math.sin(t * 1.8 + index) * .12;
      painting.position.y = painting.userData.baseY + Math.sin(t * 3 + index) * .06;
    });
  }
  if (state.chapter === "midnight_museum" && actors.clockHands?.length === 2) {
    const minute = ((state.clockMinutes % 60) + 60) % 60;
    const hour = ((state.clockMinutes / 60) % 12 + 12) % 12;
    actors.clockHands[0].rotation.z = -hour / 12 * Math.PI * 2;
    actors.clockHands[1].rotation.z = -minute / 60 * Math.PI * 2;
  }
  if (state.chapter === "graveyard_secret") {
    const dawn = clamp(1 - state.journey.flags.dawnIn / GRAVEYARD_DAWN_SECONDS, 0, 1);
    (actors.dawnLights || []).forEach((light) => { light.intensity = (light.userData.baseIntensity || 1) * (.4 + dawn * 2.2); });
    if (actors.dawnSun) actors.dawnSun.visible = dawn > .45;
  }
}

function angleDistance(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function updateChapterFollower(actor, awake, distanceFlag, dt, speed, failMessage, retryChapter) {
  if (!actor) return false;
  actor.visible = Boolean(awake);
  if (!awake) return false;
  const p = player();
  if (!actor.userData.followStarted) {
    const points = journeyWorld.actors.followPoints || journeyWorld.actors.clownSpawn || [];
    const candidates = Array.isArray(points) ? points : [points];
    const farthest = candidates.filter(Boolean).sort((a, b) =>
      distance2D(p.x, p.z, b.x, b.z) - distance2D(p.x, p.z, a.x, a.z)
    )[0];
    if (farthest) actor.position.set(farthest.x, farthest.y || 0, farthest.z);
    actor.userData.followStarted = true;
  }
  const dx = p.x - actor.position.x;
  const dz = p.z - actor.position.z;
  const distance = Math.max(.001, Math.hypot(dx, dz));
  state.journey.flags[distanceFlag] = Math.round(distance * 10) / 10;
  const mx = dx / distance * speed * dt;
  const mz = dz / distance * speed * dt;
  if (!collides(actor.position.x + mx, actor.position.z + mz, .52)) {
    actor.position.x += mx;
    actor.position.z += mz;
  } else if (!collides(actor.position.x + mx, actor.position.z, .52)) actor.position.x += mx;
  else if (!collides(actor.position.x, actor.position.z + mz, .52)) actor.position.z += mz;
  else {
    const sx = -dz / distance * speed * dt;
    const sz = dx / distance * speed * dt;
    if (!collides(actor.position.x + sx, actor.position.z + sz, .52)) {
      actor.position.x += sx;
      actor.position.z += sz;
    }
  }
  actor.rotation.y = Math.atan2(dx, dz);
  actor.position.y = Math.abs(Math.sin(state.journey.elapsed * 3.2)) * .04;
  const captureDistance = distance2D(actor.position.x, actor.position.z, p.x, p.z);
  state.journey.flags[distanceFlag] = Math.round(captureDistance * 10) / 10;
  if (captureDistance < 1.15 && !lineBlocked(actor.position.x, actor.position.z, p.x, p.z)) {
    failJourney(failMessage, retryChapter);
    return true;
  }
  return false;
}

function updateJourney(dt) {
  if (inWarehouse() || !journeyWorld) return;
  state.journey.elapsed += dt;
  state.journey.timer += dt;
  updateJourneyActors(dt);
  const flags = state.journey.flags;
  const actors = journeyWorld.actors || {};
  switch (state.chapter) {
    case "forest_houses":
      if (state.journey.elapsed > 18 && !state.monster.active) spawnJourneyMonster(25, .68);
      break;
    case "shark_island": {
      if (!flags.boatReady && state.journey.elapsed >= 10) {
        flags.boatReady = true;
        flags.boatWindow = 12;
        if (actors.boat) actors.boat.position.z = -31;
        setJourneyObjective("NU! Hajarna flyr — simma snabbt ut och tryck E vid båten!");
        showToast("BÅTEN KOMMER! Hajarna simmar bort!", 4);
        tone(330, .3, "square", .025); tone(440, .3, "square", .02, .35);
      }
      if (flags.boatReady) {
        flags.boatWindow -= dt;
        const boat = actors.boat;
        if (boat) {
          const item = journeyWorld.interactables.find((entry) => entry.kind === "boat");
          if (item) { item.x = boat.position.x; item.z = boat.position.z; }
        }
        if (flags.boatWindow <= 0 && !flags.boarded) {
          enterJourneyChapter("shark_island", { quiet: true });
          showToast("Båten hann åka. En ny närmar sig...", 3);
          return;
        }
      } else if (distance2D(player().x, player().z, 0, 0) > 18) {
        failJourney("En haj tog dig när du simmade ut för tidigt!", "shark_island");
        return;
      }
      break;
    }
    case "boat_ride": {
      const boat = actors.boat;
      if (boat) {
        boat.position.z -= dt * 11;
        boat.rotation.z = Math.sin(state.journey.elapsed * 2.4) * .035;
        player().x = boat.position.x;
        // Stå på fördäcket. Den gamla platsen låg inne i hyttväggen och
        // gjorde hela vyn grå när båtfärden startade.
        player().y = 1.05;
        player().z = boat.position.z - 4.2;
        const helm = journeyWorld.interactables.find((entry) => entry.kind === "helm");
        if (helm) { helm.x = boat.position.x; helm.z = boat.position.z - 5.7; }
      }
      if (state.journey.elapsed > 10) {
        showToast("Däcket brister — ni faller ner i ett enormt hål!", 3);
        enterNextJourneyChapter();
        return;
      }
      break;
    }
    case "electric_hollow":
      if (state.journey.elapsed > 6 && !state.monster.active) spawnJourneyMonster(24, .78);
      break;
    case "haunted_house": {
      const fort = hauntedFortScore();
      if (!flags.attackStarted && fort >= 5) {
        flags.attackStarted = true;
        flags.attackTime = 0;
        setJourneyObjective("Barrikaden är klar — håll ut medan monstret slår mot huset!");
        showToast("03:33 — MONSTRET ÄR UTANFÖR HUSET!", 4);
        monsterArrivalSound();
        if (actors.monster) actors.monster.visible = true;
      }
      if (flags.attackStarted) {
        flags.attackTime += dt;
        if (actors.monster) {
          actors.monster.position.x = Math.sin(flags.attackTime * 2.2) * 2;
          actors.monster.rotation.z = Math.sin(flags.attackTime * 4) * .05;
        }
        if (flags.attackTime >= 10) {
          flags.defended = true;
          showToast("Barrikaden höll! En dörr öppnas mot spökstationen.", 4);
          enterNextJourneyChapter();
          return;
        }
      }
      break;
    }
    case "ghost_station": {
      const secondsUntilDeparture = Math.max(0, GHOST_DEPARTURE_SECONDS - state.journey.elapsed);
      state.clockMinutes = 3 * 60 + 33 - secondsUntilDeparture / GHOST_DEPARTURE_SECONDS;
      if (!flags.trainDeparting && secondsUntilDeparture <= 0) {
        flags.trainDeparting = true;
        flags.departureStartedAt = state.journey.elapsed;
        const p = player();
        if (p.x > -3) { p.x = -7; p.y = 0; p.yaw = -Math.PI / 2; }
        const trainDoor = journeyWorld.interactables.find((entry) => entry.kind === "board_train");
        if (trainDoor) trainDoor.disabled = true;
        setJourneyObjective("03:33 — spöktåget avgår! Nästa värld är öknen.");
        showToast("03:33 — SPÖKTÅGET AVGÅR!", 4);
        tone(82, .8, "sawtooth", .035); tone(41, 1.2, "square", .025, .35);
      }
      if (flags.trainDeparting && state.journey.elapsed - flags.departureStartedAt > 4) {
        enterJourneyChapter("desert");
        return;
      }
      break;
    }
    case "ghost_train":
      if (!flags.departed) {
        flags.departureCountdown = Math.max(0, flags.departureCountdown - dt);
        state.clockMinutes = 3 * 60 + 33 - flags.departureCountdown / GHOST_DEPARTURE_SECONDS;
        if (flags.departureCountdown <= 0) {
          flags.departed = true;
          flags.travelTime = 0;
          state.clockMinutes = 3 * 60 + 33;
          setJourneyObjective("03:33 — tåget rusar iväg och dörrarna går inte att öppna!");
          showToast("03:33 — SPÖKTÅGET AVGÅR!", 4);
          tone(82, .8, "sawtooth", .035); tone(41, 1.2, "square", .025, .35);
        }
      } else {
        state.clockMinutes = 3 * 60 + 33;
        flags.travelTime += dt;
        if (actors.train) actors.train.position.x = Math.sin(flags.travelTime * 5) * .08;
      }
      if (flags.departed && flags.travelTime > GHOST_TRAIN_TRAP_SECONDS) {
        failJourney("Tåget fortsatte för alltid och maten tog slut.", "ghost_station");
        return;
      }
      break;
    case "desert":
      if (state.journey.elapsed > 12 && !flags.monsterRisen) {
        flags.monsterRisen = true;
        spawnJourneyMonster(28, .72);
        setJourneyObjective("Sandmonstret har vaknat — hitta grottan eller det röda vulkanskenet!");
      }
      break;
    case "volcano_island":
      flags.eruptionIn = Math.max(0, flags.eruptionIn - dt);
      if (flags.eruptionIn <= 10 && !flags.warned) {
        flags.warned = true;
        showToast("VULKANEN DÅNAR — SPRING TILL FLYKTBÅTEN!", 5);
        tone(55, 1.1, "sawtooth", .04); tone(42, 1.5, "square", .025, .7);
      }
      if (flags.eruptionIn <= VOLCANO_TIMER_EPSILON && !flags.escaped) {
        flags.eruptionIn = 0;
        returnToWarehouse("Vulkanen exploderade. Lavan skickar er tillbaka till IKEA!");
        return;
      }
      break;
    case "haunted_school": {
      flags.monsterIn = Math.max(0, SCHOOL_MONSTER_SECONDS - state.journey.elapsed);
      state.clockMinutes = 3 * 60 + 33 - flags.monsterIn / SCHOOL_MONSTER_SECONDS;
      if (!flags.doorLockDone && state.journey.elapsed >= 6) {
        flags.doorsLocked = true;
        flags.doorLockDone = true;
        showToast("KLICK... skolans dörrar låser sig själva.", 3);
        tone(66, .3, "square", .024); tone(54, .45, "square", .02, .2);
      }
      if (flags.doorsLocked && state.journey.elapsed >= 9) {
        flags.doorsLocked = false;
        showToast("KLICK... efter några kusliga sekunder släpper dörrarnas lås igen.", 3);
      }
      if (state.journey.elapsed >= flags.nextFootstepAt && !flags.monsterArrived) {
        flags.footstepsHeard += 1;
        flags.nextFootstepAt += 6;
        showToast(flags.footstepsHeard === 1 ? "Fotsteg hörs i korridoren — men ni är ensamma..." : "Fotstegen är närmare nu.", 2.8);
        tone(92, .12, "sine", .018); tone(76, .15, "sine", .016, .22);
      }
      if (!flags.monsterArrived && flags.monsterIn <= JOURNEY_TIMER_EPSILON) {
        flags.monsterIn = 0;
        flags.monsterArrived = true;
        state.journey.stage = "hunt";
        spawnJourneyMonster(25, .78, {
          source: actors.monster,
          message: "03:33 — IKEA-MONSTRET SKRAMLAREN ÄR I SKOLAN!"
        });
        setJourneyObjective(`Skramlaren jagar er — lös pusslen ${flags.puzzlesSolved} / 3 och fly`);
      }
      break;
    }
    case "lighthouse_city": {
      if (!flags.waveActive && !flags.wavePassed) flags.tsunamiIn = Math.max(0, flags.tsunamiIn - dt);
      if (flags.tsunamiIn <= 10 && !flags.warned) {
        flags.warned = true;
        showToast("TSUNAMIVARNING — SPRING UPPFÖR BERGET TILL FYREN!", 5);
        tone(58, .8, "sawtooth", .035); tone(46, 1, "square", .025, .5);
      }
      if (!flags.waveActive && !flags.wavePassed && flags.tsunamiIn <= JOURNEY_TIMER_EPSILON) {
        flags.tsunamiIn = 0;
        const shelter = actors.shelterSpawn;
        const insideShelter = flags.sheltered && shelter
          && distance2D(player().x, player().z, shelter.x, shelter.z) <= 15;
        if (!insideShelter) {
          failJourney("Tsunamin svepte över hela staden innan ni hann till fyren.", "lighthouse_city");
          return;
        }
        flags.waveActive = true;
        flags.waveElapsed = 0;
        state.journey.stage = "wave";
        showToast("VÅGEN TRÄFFAR FYREN — håll er inne!", 5);
      }
      if (flags.waveActive) {
        const shelter = actors.shelterSpawn;
        if (!shelter || distance2D(player().x, player().z, shelter.x, shelter.z) > 15) {
          failJourney("Ni lämnade fyrens skydd medan tsunamin slog över staden.", "lighthouse_city");
          return;
        }
        flags.waveElapsed += dt;
        if (flags.waveElapsed >= LIGHTHOUSE_WAVE_SECONDS) {
          flags.waveActive = false;
          flags.wavePassed = true;
          state.journey.stage = "basement";
          if (actors.secret) actors.secret.visible = true;
          if (actors.basementDoor) actors.basementDoor.userData.locked = false;
          player().x = 58;
          player().z = -106;
          player().yaw = 0;
          setJourneyObjective("Tsunamin har passerat — undersök ljudet från fyrens källare");
          showToast("Skyddsrummets innerdörr öppnas. Något elektriskt surrar i källaren...", 4);
        }
      }
      break;
    }
    case "forbidden_hotel": {
      if (!flags.shadowAwake && state.journey.elapsed > 8) {
        flags.shadowAwake = true;
        showToast("En lång skugga passerar tvärs över korridoren.", 3.5);
      }
      const follower = actors.follower || actors.shadowCreature;
      if (updateChapterFollower(follower, flags.shadowAwake, "shadowDistance", dt, 1.18,
        "Skuggan hann ikapp er i hotellets korridor.", "forbidden_hotel")) return;
      if (flags.shadowAwake && state.journey.elapsed >= flags.nextWhisperAt) {
        flags.nextWhisperAt += 7;
        tone(71, .3, "sine", .014); tone(64, .35, "sine", .012, .24);
      }
      break;
    }
    case "graveyard_secret": {
      flags.dawnIn = Math.max(0, GRAVEYARD_DAWN_SECONDS - state.journey.elapsed);
      state.clockMinutes = 6 * 60 - flags.dawnIn * (5 / GRAVEYARD_DAWN_SECONDS);
      if (state.journey.elapsed >= flags.nextWhisperAt && !flags.curseBroken) {
        flags.nextWhisperAt += 8;
        tone(82, .22, "sine", .013); tone(55, .5, "sawtooth", .012, .25);
      }
      if (!flags.monsterArrived && !flags.curseBroken && flags.dawnIn <= JOURNEY_TIMER_EPSILON) {
        flags.dawnIn = 0;
        flags.monsterArrived = true;
        state.journey.stage = "dawn_hunt";
        spawnJourneyMonster(27, .76, {
          source: actors.monster,
          message: "06:00 — GRYNINGEN VÄCKER IKEA-MONSTRET PÅ KYRKOGÅRDEN!"
        });
        setJourneyObjective(`Skramlaren är här — lös gåtorna ${flags.riddlesSolved} / 3 och bryt förbannelsen`);
      }
      break;
    }
    case "lost_carnival": {
      if (!flags.clownAwake && state.journey.elapsed >= 3) {
        flags.clownAwake = true;
        showToast("Karusellerna startar av sig själva. En clown står vid grinden...", 4);
        tone(196, .22, "square", .018); tone(233, .22, "square", .016, .24);
      }
      if (flags.clownAwake && state.journey.elapsed >= flags.nextLaughAt) {
        flags.nextLaughAt += 7;
        tone(330, .1, "square", .012); tone(392, .12, "square", .011, .13); tone(294, .18, "square", .01, .28);
      }
      if (updateChapterFollower(actors.clown, flags.clownAwake, "clownDistance", dt, 1.28,
        "Den mystiska clownen fångade er mellan åkattraktionerna.", "lost_carnival")) return;
      break;
    }
    case "dollmaker_house": {
      if (flags.lastDollYaw == null) flags.lastDollYaw = player().yaw;
      const turned = Math.abs(angleDistance(player().yaw, flags.lastDollYaw));
      if (turned >= 1.25 && state.journey.elapsed - flags.lastDollMoveAt >= .8) {
        flags.lastDollYaw = player().yaw;
        flags.lastDollMoveAt = state.journey.elapsed;
        flags.dollMoves += 1;
        const dolls = actors.dolls || [];
        const positions = actors.dollPositions || [];
        dolls.forEach((doll, index) => {
          const position = positions.length ? positions[(index + flags.dollMoves) % positions.length] : null;
          if (position) doll.position.set(position.x, position.y || 0, position.z);
          doll.rotation.y = Math.atan2(player().x - doll.position.x, player().z - doll.position.z);
        });
        showToast("När ni vänder er om står dockorna på nya platser...", 3);
        tone(118, .16, "triangle", .018); tone(96, .22, "triangle", .014, .18);
      }
      break;
    }
    case "midnight_museum": {
      flags.midnightIn = Math.max(0, MUSEUM_MIDNIGHT_SECONDS - state.journey.elapsed);
      state.clockMinutes = flags.midnightIn <= JOURNEY_TIMER_EPSILON
        ? 0 : 24 * 60 - flags.midnightIn / MUSEUM_MIDNIGHT_SECONDS;
      if (!flags.exhibitsAwake && flags.midnightIn <= JOURNEY_TIMER_EPSILON) {
        flags.midnightIn = 0;
        flags.exhibitsAwake = true;
        flags.monsterArrived = true;
        state.journey.stage = "midnight_hunt";
        spawnJourneyMonster(24, .82, {
          source: actors.monster,
          message: "00:00 — STATYERNA RÖR SIG OCH IKEA-MONSTRET ÄR I MUSEET!"
        });
        if (flags.cluesFound >= 3) {
          flags.exitOpen = true;
          state.journey.stage = "escape";
          showJourneyExitReady();
          setJourneyObjective("00:00 — koden fungerar! Spring ut från museet medan allt jagar er");
        } else setJourneyObjective(`Midnatt! Spring till nödutgången · koddelar ${flags.cluesFound} / 3`);
      }
      break;
    }
    case "forgotten_hospital": {
      if (!flags.nurseAwake && state.journey.elapsed > 10) {
        flags.nurseAwake = true;
        showToast("En blodfläckig sjuksköterska kliver ut ur en sal som inte finns på kartan.", 4);
      }
      if (state.journey.elapsed >= flags.nextAlarmAt) {
        flags.nextAlarmAt += 9;
        tone(520, .08, "square", .01); tone(390, .12, "square", .009, .14);
      }
      if (updateChapterFollower(actors.nurse, flags.nurseAwake, "nurseDistance", dt, 1.24,
        "Den gamla sjuksköterskan fångade er på den förbjudna våningen.", "forgotten_hospital")) return;
      break;
    }
    default:
      break;
  }
}

function updateDragonFlight(dt, forward, strafe) {
  const p = player();
  const climb = forward;
  p.x += strafe * 9 * dt;
  p.y = clamp(p.y + climb * 5 * dt, 1, 8);
  p.z -= 10 * dt;
  p.x = clamp(p.x, journeyWorld.bounds.minX + 3, journeyWorld.bounds.maxX - 3);
  p.yaw = 0;
  p.pitch = clamp((3.2 - p.y) * .05, -.35, .35);
  p.moving = true;
  const dragon = journeyWorld.actors.dragon || journeyWorld.actors.blueDragon;
  if (dragon) {
    // Draken ska synas under spelaren utan att vingarna täcker flygringarna.
    dragon.scale.setScalar(.34);
    dragon.position.set(p.x, p.y - 2.4, p.z - 6);
    dragon.rotation.y = 0;
  }
  const rings = journeyWorld.actors.rings || [];
  rings.forEach((ring) => {
    if (!ring.visible) return;
    if (Math.hypot(p.x - ring.position.x, p.y - ring.position.y, p.z - ring.position.z) < 6) {
      ring.visible = false;
      state.journey.flags.ringsPassed += 1;
      showToast(`Vindring ${state.journey.flags.ringsPassed} / ${rings.length}`, 2);
      tone(660, .18, "sine", .02);
    }
  });
  setJourneyObjective(`Flyg mot ön · vindringar ${state.journey.flags.ringsPassed} / ${rings.length || 3} (minst 4)`);
  if (p.z <= journeyWorld.bounds.minZ + 12) {
    const requiredRings = Math.min(4, rings.length);
    if (state.journey.flags.ringsPassed >= requiredRings) enterNextJourneyChapter();
    else {
      p.x = 0; p.y = 3; p.z = journeyWorld.spawn.z;
      state.journey.flags.ringsPassed = 0;
      rings.forEach((ring) => { ring.visible = true; });
      showToast(`Draken gör ett nytt varv — flyg genom minst ${requiredRings} ringar!`, 4);
    }
  }
}

function updatePlayer(dt) {
  const p = player();
  p.moving = false;
  p.sprinting = false;
  if (state.mode !== "playing" || state.paused || p.hidden) return;
  let forward = 0;
  let strafe = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
  if (keys.has("KeyA")) strafe -= 1;
  if (keys.has("KeyD")) strafe += 1;
  forward += -touch.y;
  strafe += touch.x;
  if (keys.has("ArrowLeft")) p.yaw += 1.9 * dt;
  if (keys.has("ArrowRight")) p.yaw -= 1.9 * dt;
  if (state.chapter === "dragon_flight") {
    updateDragonFlight(dt, forward, strafe);
    return;
  }
  if (state.chapter === "boat_ride") {
    const boat = journeyWorld?.actors?.boat;
    if (boat) {
      boat.position.x = clamp(boat.position.x + strafe * 8 * dt, -9, 9);
      p.x = boat.position.x;
      p.moving = Math.abs(strafe) > .04;
      p.sprinting = false;
    }
    return;
  }
  const length = Math.hypot(forward, strafe);
  if (length > .04) {
    forward /= Math.max(1, length);
    strafe /= Math.max(1, length);
    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
    let speed = sprint ? 6.6 : 4.15;
    if (state.chapter === "shark_island" && distance2D(p.x, p.z, 0, 0) > 14) speed *= .58;
    if (state.chapter === "desert") speed *= .92;
    const forwardX = -Math.sin(p.yaw);
    const forwardZ = -Math.cos(p.yaw);
    const rightX = Math.cos(p.yaw);
    const rightZ = -Math.sin(p.yaw);
    let dx = (forwardX * forward + rightX * strafe) * speed * dt;
    let dz = (forwardZ * forward + rightZ * strafe) * speed * dt;
    if (state.weather.type === "rain") { dx *= .94; dz *= .94; }
    movePlayer(dx, dz);
    p.moving = true;
    p.sprinting = sprint;
  }
  if (inWarehouse()) refreshChunks();
}

function updateCamera() {
  // Himlen följer även filmkameran så domen aldrig klipps till en mörk cirkel.
  if (sky) sky.position.copy(camera.position);
  if (state.mode === "cinematic" || state.mode === "ending") return;
  const p = player();
  const hiddenHeight = p.hidden ? .92 : PLAYER_EYE;
  const bob = p.moving ? Math.sin(state.timeMs * (p.sprinting ? .014 : .009)) * .035 : 0;
  camera.position.set(p.x, p.y + hiddenHeight + Math.abs(bob), p.z);
  camera.rotation.y = p.yaw;
  camera.rotation.x = p.pitch + bob * .12;
  flashlight.visible = p.flashlight && (state.mode === "playing" || state.mode === "gameover");
  // En svagare fångststråle visar ansiktet utan den utfrätta vita cirkeln.
  flashlight.intensity = state.mode === "gameover" ? 6 : inWarehouse() ? 18 : 24;
  sun.position.set(p.x - 28, 44, p.z - 34);
  sun.target.position.set(p.x, p.y, p.z);
  sun.target.updateMatrixWorld();
  sky.position.copy(camera.position);
  if (journeyWorld?.actors?.sky) journeyWorld.actors.sky.position.copy(camera.position);
}

function updateLighting() {
  const minute = state.clockMinutes;
  const hour = minute / 60;
  const daylight = hour >= 6 && hour < 19;
  const dawn = clamp((hour - 5.5) / 2, 0, 1);
  const dusk = clamp((20 - hour) / 2, 0, 1);
  let dayFactor = daylight ? Math.min(dawn, dusk) : .12;
  if (state.weather.type === "cloudy") dayFactor *= .72;
  if (["rain", "tornado", "tornado_warning"].includes(state.weather.type)) dayFactor *= .55;
  hemisphere.intensity = .42 + dayFactor * 1.0;
  sun.intensity = .25 + dayFactor * 2.2;
  if (state.mode === "cinematic" || state.mode === "ending") {
    hemisphere.intensity = Math.max(hemisphere.intensity, 1.0);
    sun.intensity = Math.max(sun.intensity, 1.35);
  }
  materials.light.emissiveIntensity = daylight ? .85 : 2.4;
  materials.floor.roughness = ["rain", "tsunami"].includes(state.weather.type) ? .28 : .72;
  scene.fog.density = state.weather.type.includes("tornado") ? .021 : state.weather.type === "rain" ? .016 : .0115;
  const top = daylight ? new THREE.Color(0x4e91b9) : new THREE.Color(0x0d1730);
  const bottom = daylight ? new THREE.Color(0xc7d0c0) : new THREE.Color(0x45505b);
  if (state.weather.type === "cloudy" || state.weather.type === "rain") {
    top.multiplyScalar(.62); bottom.multiplyScalar(.75);
  }
  sky.userData.uniforms.topColor.value.copy(top);
  sky.userData.uniforms.bottomColor.value.copy(bottom);
  scene.background.copy(top);
  scene.fog.color.copy(bottom);
  if (!inWarehouse() && journeyWorld) {
    const dimChapter = [
      "dragon_caves", "electric_hollow", "ghost_train", "haunted_school",
      "forbidden_hotel", "graveyard_secret", "lost_carnival", "dollmaker_house",
      "midnight_museum", "forgotten_hospital", "four_floors_down"
    ].includes(state.chapter);
    const electricHollow = state.chapter === "electric_hollow";
    hemisphere.intensity = Math.max(hemisphere.intensity, electricHollow ? 1.08 : dimChapter ? .72 : 1.02);
    sun.intensity = Math.max(sun.intensity, electricHollow ? .92 : dimChapter ? .68 : 1.08);
    scene.fog.density = electricHollow ? .006 : dimChapter ? .0085 : .0065;
    const worldColor = journeyWorld.root.userData.backgroundColor;
    if (Number.isFinite(worldColor)) {
      scene.background.setHex(worldColor);
      scene.fog.color.setHex(worldColor).multiplyScalar(electricHollow ? .68 : dimChapter ? .48 : .72);
    }
  }
}

function updateMonsterModel() {
  if (!state.monster.active) { monsterModel.visible = false; return; }
  monsterModel.visible = true;
  monsterModel.position.set(state.monster.x, 0, state.monster.z);
  const p = player();
  // Modellens ansikte pekar längs lokal -Z, så rotationen ska vända ögonen
  // mot spelaren (inte ryggen, vilket den tidigare gjorde).
  monsterModel.rotation.y = Math.atan2(state.monster.x - p.x, state.monster.z - p.z);
  const pace = state.monster.mode === "chasing" ? 9 : 5;
  const swing = Math.sin(state.timeMs * .001 * pace) * .5;
  monsterModel.userData.arms[0].rotation.x = swing;
  monsterModel.userData.arms[1].rotation.x = -swing;
  monsterModel.userData.legs[0].rotation.x = -swing;
  monsterModel.userData.legs[1].rotation.x = swing;
  monsterModel.position.y = Math.abs(Math.sin(state.timeMs * .001 * pace)) * .08;
}

function updatePrompt() {
  const p = player();
  if (state.mode !== "playing") { state.prompt = ""; return; }
  if (p.hidden) { state.prompt = "H · Lämna gömstället"; return; }
  if (!inWarehouse()) {
    if (state.held) { state.prompt = "E · Placera   R · Vrid"; return; }
    if (state.chapter === "haunted_house") {
      const desc = nearestObject((item) => furnitureTypes[item.type]?.movable, 2.8);
      if (desc) { state.prompt = `E · Bär ${furnitureTypes[desc.type].name}`; return; }
    }
    if (state.chapter === "haunted_school") {
      const hideout = journeyWorld?.interactables.find((item) => item.kind === "hideout" && distance2D(p.x, p.z, item.x, item.z) <= (item.radius || 3.2) + .45);
      if (hideout) { state.prompt = "H eller E · Göm dig i elevskåpet"; return; }
    }
    const item = nearestJourneyInteractable(.45);
    state.prompt = item ? (item.label || "E · Undersök") : "";
    return;
  }
  const exit = nearestObject((desc) => desc.type === "exit", 3.2);
  if (exit) {
    state.exitFound = true;
    state.prompt = state.exitUnlocked ? "E · Öppna den hemliga utgången" : "Utgången är låst till gryningen";
    return;
  }
  if (state.held) { state.prompt = "E · Placera   R · Vrid"; return; }
  const desc = nearestObject((item) => furnitureTypes[item.type].movable, 2.8);
  if (desc) state.prompt = `E · Bär ${furnitureTypes[desc.type].name}`;
  else if (nearestObject((item) => furnitureTypes[item.type].hideable, 2.1) || coverScore() >= 3) state.prompt = "H · Göm dig";
  else state.prompt = "";
}

function formatClock() {
  const minute = ((Math.floor(state.clockMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function weatherName() {
  return ({
    clear: "Klart", cloudy: "Molnigt", rain: "Regn", rainbow: "Regnbåge",
    tornado_warning: "Tornadovarning", tornado: "Tornado",
    tsunami_warning: "Tsunamivarning", tsunami: "Tsunami"
  })[state.weather.type] || state.weather.type;
}

function currentZone() {
  if (!inWarehouse()) return chapterTitle();
  return ensureChunkState(chunkCoord(player().x), chunkCoord(player().z)).zone;
}

function objectiveText() {
  if (!inWarehouse()) {
    if (state.mode === "gameover") return `Försök igen: ${chapterTitle()}`;
    return state.journey.objective || journeyObjectives[state.chapter];
  }
  if (state.mode === "cinematic") return "Resan fortsätter genom alla era världar";
  if (state.mode === "gameover") return "Försök igen och göm dig tidigare";
  if (state.nightsSurvived > 0) return "Hitta den hemliga utgången";
  if (state.monster.active) return "Göm dig och överlev till 06:00";
  return "Flytta möbler och bygg ett gömställe före 03:33";
}

function updateHud() {
  gameHud.hidden = state.mode === "title";
  if (gameHud.hidden) return;
  const totalChapters = JOURNEY_ORDER.length + 1;
  const chapterNumber = inWarehouse() ? 1 : state.journey.index + 2;
  if (hudChapter) hudChapter.textContent = `KAPITEL ${chapterNumber} / ${totalChapters}`;
  hudArea.textContent = state.mode === "cinematic" ? "NÄSTA VÄRLD" : inWarehouse() ? `IKEA ∞ · ${currentZone()}` : chapterTitle();
  hudWeather.textContent = inWarehouse()
    ? `${weatherName()} · ruta ${chunkCoord(player().x)}:${chunkCoord(player().z)}`
    : `${weatherName()} · position ${Math.round(player().x)}:${Math.round(player().z)}`;
  hudClock.textContent = formatClock();
  hudClock.style.color = state.monster.active ? "#ff6259" : "#fff3a7";
  if (state.chapter === "shark_island") {
    hudDay.textContent = state.journey.flags.boatReady
      ? `Båten åker om ${Math.max(0, Math.ceil(state.journey.flags.boatWindow))} s`
      : `Båten kommer om ${Math.max(0, Math.ceil(10 - state.journey.elapsed))} s`;
  } else if (state.chapter === "boat_ride") hudDay.textContent = `Styr A/D · ${Math.max(0, Math.ceil(10 - state.journey.elapsed))} s kvar`;
  else if (state.chapter === "ghost_station") hudDay.textContent = state.journey.flags.trainDeparting
    ? "03:33 · Tåget avgår!"
    : `Avgång 03:33 · ${Math.max(0, Math.ceil(GHOST_DEPARTURE_SECONDS - state.journey.elapsed))} s`;
  else if (state.chapter === "ghost_train") hudDay.textContent = state.journey.flags.departed
    ? `Instängd ${Math.min(GHOST_TRAIN_TRAP_SECONDS, Math.floor(state.journey.flags.travelTime))} / ${GHOST_TRAIN_TRAP_SECONDS} s`
    : `Avgång 03:33 · ${Math.max(0, Math.ceil(state.journey.flags.departureCountdown))} s`;
  else if (state.chapter === "volcano_island") hudDay.textContent = `Utbrott om ${Math.max(0, Math.ceil(state.journey.flags.eruptionIn - VOLCANO_TIMER_EPSILON))} s`;
  else if (state.chapter === "haunted_school") hudDay.textContent = state.journey.flags.monsterArrived
    ? `03:33 · Pussel ${state.journey.flags.puzzlesSolved} / 3`
    : `03:33 om ${Math.max(0, Math.ceil(state.journey.flags.monsterIn - JOURNEY_TIMER_EPSILON))} s · Pussel ${state.journey.flags.puzzlesSolved}/3`;
  else if (state.chapter === "lighthouse_city") hudDay.textContent = state.journey.flags.wavePassed
    ? "Tsunamin har passerat"
    : state.journey.flags.waveActive
      ? `Vågen träffar · ${Math.min(LIGHTHOUSE_WAVE_SECONDS, Math.floor(state.journey.flags.waveElapsed))}/${LIGHTHOUSE_WAVE_SECONDS} s`
      : `Tsunami om ${Math.max(0, Math.ceil(state.journey.flags.tsunamiIn - JOURNEY_TIMER_EPSILON))} s`;
  else if (state.chapter === "forbidden_hotel") hudDay.textContent = `Nycklar ${state.journey.flags.keysFound}/3 · Dokument ${state.journey.flags.documentsFound}/3`;
  else if (state.chapter === "graveyard_secret") hudDay.textContent = state.journey.flags.monsterArrived
    ? `06:00 · Gåtor ${state.journey.flags.riddlesSolved}/3`
    : `Gryning om ${Math.max(0, Math.ceil(state.journey.flags.dawnIn - JOURNEY_TIMER_EPSILON))} s · Gåtor ${state.journey.flags.riddlesSolved}/3`;
  else if (state.chapter === "lost_carnival") hudDay.textContent = `Attraktioner ${state.journey.flags.switchesOff}/3 · Clown ${state.journey.flags.clownDistance ?? "?"} m`;
  else if (state.chapter === "dollmaker_house") hudDay.textContent = `Ledtrådar ${state.journey.flags.cluesFound}/3 · Dockflyttar ${state.journey.flags.dollMoves}`;
  else if (state.chapter === "midnight_museum") hudDay.textContent = state.journey.flags.exhibitsAwake
    ? `00:00 · Kod ${state.journey.flags.cluesFound}/3`
    : `Midnatt om ${Math.max(0, Math.ceil(state.journey.flags.midnightIn - JOURNEY_TIMER_EPSILON))} s · Kod ${state.journey.flags.cluesFound}/3`;
  else if (state.chapter === "forgotten_hospital") hudDay.textContent = `Våning ${state.journey.flags.currentFloor} · Journaler ${state.journey.flags.recordsFound}/3`;
  else if (state.chapter === "four_floors_down") hudDay.textContent = state.journey.flags.elevatorUsed
    ? `Källare −4 · Dörrar ${state.journey.flags.doorsOpened}/4`
    : "Kontrollhuset · Hissen väntar";
  else if (state.chapter === "haunted_house") hudDay.textContent = state.journey.flags.attackStarted
    ? `Belägring ${Math.min(10, Math.floor(state.journey.flags.attackTime))} / 10 s`
    : `Barrikad ${hauntedFortScore()} / 5`;
  else hudDay.textContent = `Dygn ${state.day} · överlevda nätter ${state.nightsSurvived}`;
  hudObjective.textContent = objectiveText();
  hudPrompt.textContent = state.prompt;
  hudPrompt.hidden = !state.prompt;
  const show = state.toast && state.tick < state.toastUntilTick;
  hudToast.textContent = state.toast;
  hudToast.hidden = !show;
}

function updateSimulation(dt) {
  if (state.mode === "title" || state.paused || state.mode === "gameover" || state.mode === "ending") return;
  state.tick += 1;
  state.timeMs = state.tick * FIXED_MS;
  if (state.mode === "cinematic") { updateCinematic(dt); return; }
  updateClock(dt);
  updateWeather(dt);
  updateJourney(dt);
  if (state.mode !== "playing" || state.paused) return;
  updatePlayer(dt);
  updateMonster(dt);
  updatePrompt();
}

function updateVisuals() {
  updateLighting();
  updateCamera();
  updateMonsterModel();
  updateHud();
}

function render() {
  if (!renderer || !scene || !camera) return;
  updateVisuals();
  renderer.render(scene, camera);
}

function pauseGame(force = null) {
  if (state.mode !== "playing") return;
  if (choiceHandlers) {
    state.paused = true;
    showToast("Välj ett av alternativen först.", 1.5);
    return;
  }
  state.paused = force == null ? !state.paused : Boolean(force);
  keys.clear(); touch.x = 0; touch.y = 0;
  if (state.paused && document.pointerLockElement) document.exitPointerLock();
  showToast(state.paused ? "Paus" : "Spelet fortsätter", 1.5);
}

function startGame() {
  ensureAudio();
  state.mode = "playing";
  state.paused = false;
  startOverlay.hidden = true;
  gameHud.hidden = false;
  touchControls.hidden = !touchDevice;
  canvas.focus();
  showToast("Utforska varuhuset. Monstret kommer exakt 03:33.", 4);
  render();
}

function resetGame() {
  if (!inWarehouse()) {
    const retryChapter = state.journey.failedChapter || state.chapter;
    enterJourneyChapter(retryChapter, { quiet: true });
    touchControls.hidden = !touchDevice;
    showToast(`Nytt försök: ${chapterTitle(retryChapter)}.`, 4);
    return;
  }
  const p = player();
  disposeCinematicRoot();
  state.mode = "playing";
  state.paused = false;
  state.clockMinutes = 2 * 60 + 30;
  // Ett nytt försök ska få en ny 03:33-händelse samma dygn.
  delete state.monsterDays[state.day];
  state.monster.active = false;
  state.monster.mode = "sleeping";
  state.monster.sawHide = false;
  monsterModel.visible = false;
  p.x = 24; p.y = 0; p.z = 24; p.yaw = -Math.PI / 2; p.pitch = 0;
  p.hidden = false; p.hiddenBy = null;
  p.flashlight = true;
  hideMask.hidden = true;
  cinematicCaption.hidden = true;
  state.cinematic.time = 0;
  state.cinematic.phase = "";
  loadedChunks.forEach(({ root }) => { root.visible = true; });
  state.markers.forEach((marker) => { if (marker.group) marker.group.visible = true; });
  touchControls.hidden = !touchDevice;
  refreshChunks(true);
  setWeather("cloudy", 15);
  updateWeather(0);
  updatePrompt();
  showToast("Nytt försök från 02:30. Dina byggda möbler finns kvar.", 4);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const request = frameElement.requestFullscreen || frameElement.webkitRequestFullscreen;
    if (request) request.call(frameElement);
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  }
}

function applyLook(dx, dy, isTouch) {
  const sensitivity = isTouch ? .0045 : .00235;
  const p = player();
  p.yaw -= dx * sensitivity;
  p.pitch -= dy * sensitivity;
  p.pitch = clamp(p.pitch, -1.15, 1.05);
}

function resetTouch() {
  touch.stickId = null; touch.lookId = null; touch.x = 0; touch.y = 0;
  touchKnob.style.transform = "translate(-50%, -50%)";
}

function updateJoystick(event) {
  const rect = touchJoystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = event.clientX - cx;
  let dy = event.clientY - cy;
  const max = rect.width * .31;
  const length = Math.hypot(dx, dy);
  if (length > max) { dx = dx / length * max; dy = dy / length * max; }
  touch.x = dx / max;
  touch.y = dy / max;
  touchKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function bindInputs() {
  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Escape"].includes(event.code)) event.preventDefault();
    if (event.repeat && event.code === "KeyK") return;
    if (chapterOverlay && !chapterOverlay.hidden) {
      if (event.code === "Escape" || event.code === "KeyK") closeChapterMenu();
      return;
    }
    if (event.code === "KeyK") { openChapterMenu(); return; }
    if (state.mode === "title" && ["Enter", "Space"].includes(event.code)) { startGame(); return; }
    if (event.repeat && ["KeyE", "KeyR", "KeyH", "KeyM", "KeyK", "KeyL", "KeyF", "KeyP"].includes(event.code)) return;
    keys.add(event.code);
    if (event.code === "KeyE" || event.code === "Enter") interact();
    else if (event.code === "KeyR") { if (state.mode === "gameover") resetGame(); else rotateHeld(); }
    else if (event.code === "KeyH") tryHide();
    else if (event.code === "KeyM") makeMarker();
    else if (event.code === "KeyL") { player().flashlight = !player().flashlight; showToast(player().flashlight ? "Ficklampan tänds." : "Ficklampan släcks.", 1.5); }
    else if (event.code === "KeyF") toggleFullscreen();
    else if (event.code === "KeyP" || event.code === "Escape") pauseGame();
  }, { passive: false });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("mousedown", (event) => {
    if (state.mode === "gameover") { resetGame(); return; }
    if (state.mode !== "playing") return;
    if (!document.pointerLockElement && canvas.requestPointerLock && document.hasFocus() && !navigator.webdriver) canvas.requestPointerLock();
  });
  window.addEventListener("mousemove", (event) => {
    if (state.mode !== "playing" || state.paused) return;
    if (document.pointerLockElement === canvas) applyLook(event.movementX, event.movementY, false);
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || state.mode !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left + rect.width * .3) return;
    touch.lookId = event.pointerId; touch.lastX = event.clientX; touch.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== touch.lookId) return;
    applyLook(event.clientX - touch.lastX, event.clientY - touch.lastY, true);
    touch.lastX = event.clientX; touch.lastY = event.clientY;
  });
  const releaseLook = (event) => { if (event.pointerId === touch.lookId) touch.lookId = null; };
  canvas.addEventListener("pointerup", releaseLook);
  canvas.addEventListener("pointercancel", releaseLook);
  canvas.addEventListener("lostpointercapture", releaseLook);
  touchJoystick.addEventListener("pointerdown", (event) => {
    touch.stickId = event.pointerId; touchJoystick.setPointerCapture(event.pointerId); updateJoystick(event);
  });
  touchJoystick.addEventListener("pointermove", (event) => { if (event.pointerId === touch.stickId) updateJoystick(event); });
  const releaseStick = (event) => {
    if (event.pointerId !== touch.stickId) return;
    touch.stickId = null; touch.x = 0; touch.y = 0;
    touchKnob.style.transform = "translate(-50%, -50%)";
  };
  touchJoystick.addEventListener("pointerup", releaseStick);
  touchJoystick.addEventListener("pointercancel", releaseStick);
  touchJoystick.addEventListener("lostpointercapture", releaseStick);
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (button.dataset.action === "interact") interact();
      if (button.dataset.action === "hide") tryHide();
      if (button.dataset.action === "marker") makeMarker();
    });
  });
  choicePrimary?.addEventListener("click", () => closeChoice("primary"));
  choiceSecondary?.addEventListener("click", () => closeChoice("secondary"));
  chapterMenuButton?.addEventListener("click", openChapterMenu);
  chapterStartButton?.addEventListener("click", openChapterMenu);
  chapterCloseButton?.addEventListener("click", closeChapterMenu);
  chapterOverlay?.addEventListener("click", (event) => { if (event.target === chapterOverlay) closeChapterMenu(); });
  window.addEventListener("blur", () => { keys.clear(); resetTouch(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.mode === "playing") pauseGame(true); });
}

function resize() {
  if (!renderer || !camera) return;
  const width = canvas.clientWidth || 960;
  const height = canvas.clientHeight || 540;
  camera.aspect = width / height;
  camera.fov = height > width ? 92 : 75;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touchDevice ? 1.25 : 1.8));
  renderer.setSize(width, height, false);
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(50, Math.max(0, now - lastFrame));
  lastFrame = now;
  if (!manualTime) {
    accumulator += elapsed;
    let safety = 0;
    while (accumulator >= FIXED_MS && safety < 5) {
      accumulator -= FIXED_MS;
      updateSimulation(FIXED_STEP);
      safety += 1;
    }
  }
  render();
}

const cinematicPhases = [
  ["forest", 5.5, "Den hemliga utgången leder till en enorm skog. Någonstans väntar den blå draken."],
  ["island", 5.5, "Draken flyger er till hajön. När båten kommer flyr hajarna — då måste ni simma snabbt."],
  ["hollow", 5.5, "Efter båten faller ni ner i hålet. Elektriskt blå larver lyser vägen när Skramlaren återkommer."],
  ["robot_shop", 5.5, "I den tomma affären vinkar gubben: hej, hej, hej. Knapparna på höger sida avslöjar roboten."],
  ["haunted_house", 5.5, "Det hemsökta huset är säkert inuti. Bygg starka skydd med möblerna från det oändliga förrådet."],
  ["ghost_station", 5.5, "På spökstationen stannar det tomma tåget. Går ni ombord kanske ni aldrig kan gå av."],
  ["desert_volcano", 5.5, "Öknen har en grottportal tillbaka till IKEA. På vulkanön måste ni lyssna och fly före utbrottet."],
  ["village", 7, "Någonstans finns den gamla byn. Varför säger ledtrådarna både 1910 och 1920?" ]
];

function disposeCinematicRoot() {
  if (!cinematicRoot) return;
  scene.remove(cinematicRoot);
  cinematicRoot.traverse((object) => {
    if (object.geometry && ![boxGeometry, cylinderGeometry, sphereGeometry].includes(object.geometry)) object.geometry.dispose();
    if (object.material && !Object.values(materials).includes(object.material)) {
      if (object.material.map?.isTexture) object.material.map.dispose();
      object.material.dispose();
    }
  });
  cinematicRoot = null;
}

function simpleDragon(color = 0x2788d8) {
  const root = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .08 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x85dcff, emissive: 0x1d8fff, emissiveIntensity: 2 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 12), bodyMaterial);
  body.scale.set(2.5, 1, 1); root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.8, 18, 10), bodyMaterial);
  head.position.set(2.5, .35, 0); root.add(head);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.65, 4.2, 12), bodyMaterial);
  tail.rotation.z = Math.PI / 2; tail.position.x = -3; root.add(tail);
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5.5, 3), bodyMaterial);
    wing.rotation.z = side * Math.PI / 2;
    wing.rotation.y = Math.PI / 2;
    wing.position.set(0, .5, side * 2.2);
    root.add(wing);
  });
  [-.28, .28].forEach((z) => {
    const eye = new THREE.Mesh(sphereGeometry, glow); eye.scale.setScalar(.14); eye.position.set(3.13, .6, z); root.add(eye);
  });
  root.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  return root;
}

function addTree(root, x, z, scale = 1) {
  const trunk = new THREE.Mesh(cylinderGeometry, tintMaterial(0x5c3b25, .95));
  trunk.scale.set(.55 * scale, 4 * scale, .55 * scale); trunk.position.set(x, 2 * scale, z); trunk.castShadow = true; root.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(2.4 * scale, 7 * scale, 10), tintMaterial(0x335f3e, .9));
  crown.position.set(x, 7 * scale, z); crown.castShadow = true; root.add(crown);
}

function addHouse(root, x, z, color = 0x786654) {
  const wall = tintMaterial(color, .88);
  root.add(meshBox(7, 4.5, 7, wall, x, 2.25, z));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.7, 3.2, 4), tintMaterial(0x4c302b, .9));
  roof.position.set(x, 6.1, z); roof.rotation.y = Math.PI / 4; roof.castShadow = true; root.add(roof);
  root.add(meshBox(1.4, 2.8, .2, materials.dark, x, 1.4, z - 3.6));
}

function textSign(text, width = 9, height = 2.2) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
  const g = c.getContext("2d"); g.fillStyle = "#34271c"; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = "#c5aa7a"; g.lineWidth = 20; g.strokeRect(10, 10, 1004, 236);
  g.fillStyle = "#e8d8b7"; g.font = "bold 70px Georgia"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 512, 132);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
}

function buildCinematicScene(name) {
  disposeCinematicRoot();
  cinematicRoot = new THREE.Group();
  const pbrGround = (color, roughness = .9) => new THREE.MeshStandardMaterial({ color, roughness });
  if (name === "forest") {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150, 1, 1), pbrGround(0x416e49));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; cinematicRoot.add(ground);
    for (let i = 0; i < 70; i += 1) addTree(cinematicRoot, (randomUnit(i, 41) - .5) * 120, -5 - randomUnit(i, 42) * 100, .7 + randomUnit(i, 43) * .8);
    for (let i = 0; i < 6; i += 1) addHouse(cinematicRoot, -30 + i * 13, -38 - (i % 2) * 12, 0x85735b);
    const dragon = simpleDragon(); dragon.position.set(0, 18, -38); dragon.userData.hero = true; cinematicRoot.add(dragon);
    camera.position.set(0, 3, 18); camera.lookAt(0, 7, -35);
  } else if (name === "island") {
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshPhysicalMaterial({ color: 0x147ca7, roughness: .16, metalness: .15 }));
    ocean.rotation.x = -Math.PI / 2; ocean.position.y = -.3; cinematicRoot.add(ocean);
    const island = new THREE.Mesh(new THREE.CylinderGeometry(15, 18, 2.4, 40), pbrGround(0xbca46e)); island.position.y = .8; island.receiveShadow = true; cinematicRoot.add(island);
    for (let i = 0; i < 7; i += 1) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(.55, 1.8, 3), materials.dark);
      const angle = i / 7 * Math.PI * 2; fin.position.set(Math.cos(angle) * 23, .5, Math.sin(angle) * 23); fin.rotation.z = .35; cinematicRoot.add(fin);
    }
    const boat = new THREE.Group();
    boat.add(meshBox(7, 1.2, 3, tintMaterial(0x8c3e2c, .65), 0, .6, 0));
    boat.add(meshBox(3.2, 2.2, 2.3, tintMaterial(0xe4dfcf, .65), 0, 2, 0));
    boat.position.set(-22, 0, -25); cinematicRoot.add(boat);
    const dragon = simpleDragon(); dragon.scale.setScalar(.7); dragon.position.set(15, 15, -28); cinematicRoot.add(dragon);
    camera.position.set(0, 5, 30); camera.lookAt(0, 2, 0);
  } else if (name === "hollow") {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), pbrGround(0x1d2028)); ground.rotation.x = -Math.PI / 2; cinematicRoot.add(ground);
    for (let i = 0; i < 38; i += 1) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + randomUnit(i, 50) * 2, 0), pbrGround(0x343944));
      rock.position.set((randomUnit(i, 51) - .5) * 55, randomUnit(i, 52), -5 - randomUnit(i, 53) * 55); rock.castShadow = true; cinematicRoot.add(rock);
    }
    const larvaMaterial = new THREE.MeshStandardMaterial({ color: 0x8ceeff, emissive: 0x007cff, emissiveIntensity: 4 });
    for (let i = 0; i < 32; i += 1) {
      const larva = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .45, 4, 8), larvaMaterial);
      larva.position.set((randomUnit(i, 54) - .5) * 24, .22, -3 - randomUnit(i, 55) * 30); larva.rotation.z = Math.PI / 2; cinematicRoot.add(larva);
    }
    const shadowMonster = monsterModel.clone(true); shadowMonster.visible = true; shadowMonster.position.set(-7, 0, -21); cinematicRoot.add(shadowMonster);
    const dragon = simpleDragon(); dragon.position.set(9, 8, -25); dragon.scale.setScalar(1.1); cinematicRoot.add(dragon);
    camera.position.set(0, 2.2, 14); camera.lookAt(0, 2.5, -20);
  } else if (name === "robot_shop") {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), pbrGround(0xc3c5bf, .35)); floor.rotation.x = -Math.PI / 2; cinematicRoot.add(floor);
    for (let row = 0; row < 3; row += 1) for (let side of [-1, 1]) {
      const shelf = buildFurnitureModel({ type: "shelf", x: side * (8 + row * 7), z: -18, rotation: 0 }); shelf.position.z = -18; cinematicRoot.add(shelf);
      for (let i = 0; i < 6; i += 1) {
        const food = new THREE.Mesh(sphereGeometry, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe7372d : 0x49a94f, roughness: .06, metalness: .1 }));
        food.scale.set(.45, .32, .45); food.position.set(side * (8 + row * 7) + (i - 3) * .6, 1.5, -18); cinematicRoot.add(food);
      }
    }
    const robot = new THREE.Group();
    robot.add(meshBox(1.5, 2.5, .9, tintMaterial(0x77674e), 0, 2.3, 0));
    const head = new THREE.Mesh(sphereGeometry, tintMaterial(0xd3aa83)); head.scale.set(1, 1.05, 1); head.position.y = 4.2; robot.add(head);
    [0, .5, 1].forEach((y, i) => { const b = new THREE.Mesh(sphereGeometry, tintMaterial([0xff3d35, 0x4caf50, 0x2b86e7][i], .3, .6)); b.scale.setScalar(.14); b.position.set(.82, 2.1 + y, 0); robot.add(b); });
    robot.position.set(0, 0, -8); cinematicRoot.add(robot);
    camera.position.set(0, 2, 11); camera.lookAt(.5, 2.8, -8);
  } else if (name === "haunted_house") {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), pbrGround(0x344433)); ground.rotation.x = -Math.PI / 2; cinematicRoot.add(ground);
    addHouse(cinematicRoot, 0, -18, 0x5e5e62);
    const storage = textSign("OÄNDLIGT MÖBELFÖRRÅD", 8, 1.5); storage.position.set(0, 3.2, -14.4); cinematicRoot.add(storage);
    for (let i = 0; i < 10; i += 1) {
      const desc = { type: ["crate", "chair", "wardrobe", "sofa"][i % 4], x: -12 + i * 2.7, z: -4, rotation: 0 };
      cinematicRoot.add(buildFurnitureModel(desc));
    }
    const silhouette = monsterModel.clone(true); silhouette.visible = true; silhouette.position.set(13, 0, -17); cinematicRoot.add(silhouette);
    camera.position.set(0, 2.2, 18); camera.lookAt(0, 3, -18);
  } else if (name === "ghost_station") {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), pbrGround(0x35373a)); ground.rotation.x = -Math.PI / 2; cinematicRoot.add(ground);
    [-1, 1].forEach((side) => cinematicRoot.add(meshBox(.18, .16, 100, materials.metal, side * 2, .08, -15)));
    const trainMaterial = new THREE.MeshPhysicalMaterial({ color: 0x263744, transparent: true, opacity: .82, roughness: .28, metalness: .55 });
    const train = meshBox(7, 5.5, 33, trainMaterial, 0, 2.75, -24); cinematicRoot.add(train);
    for (let z = -12; z >= -36; z -= 6) cinematicRoot.add(meshBox(.08, 2.1, 2.8, materials.light, -3.55, 3, z));
    const station = textSign("INGEN SLUTSTATION", 8, 1.7); station.position.set(8, 3.5, -12); station.rotation.y = -Math.PI / 2; cinematicRoot.add(station);
    camera.position.set(10, 2.1, 12); camera.lookAt(0, 2.5, -24);
  } else if (name === "desert_volcano") {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), pbrGround(0xd1a45d)); ground.rotation.x = -Math.PI / 2; cinematicRoot.add(ground);
    const volcano = new THREE.Mesh(new THREE.ConeGeometry(22, 38, 28, 1, true), pbrGround(0x4a3a34)); volcano.position.set(18, 18, -52); cinematicRoot.add(volcano);
    const lava = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, .4, 24), new THREE.MeshStandardMaterial({ color: 0xff4b18, emissive: 0xff2400, emissiveIntensity: 4 })); lava.position.set(18, 37, -52); cinematicRoot.add(lava);
    const cave = new THREE.Mesh(new THREE.TorusGeometry(4, 1.2, 12, 24, Math.PI), materials.dark); cave.position.set(-14, 3, -20); cave.rotation.z = Math.PI; cinematicRoot.add(cave);
    const portal = textSign("PORTAL TILL IKEA", 6, 1.2); portal.position.set(-14, 7, -20); cinematicRoot.add(portal);
    camera.position.set(0, 3, 24); camera.lookAt(7, 9, -42);
  } else if (name === "village") {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), pbrGround(0x53634b)); ground.rotation.x = -Math.PI / 2; cinematicRoot.add(ground);
    for (let i = 0; i < 10; i += 1) addHouse(cinematicRoot, -34 + (i % 5) * 17, -22 - Math.floor(i / 5) * 22, i % 2 ? 0x6c5c4d : 0x596059);
    for (let i = 0; i < 32; i += 1) addTree(cinematicRoot, (randomUnit(i, 71) - .5) * 120, -10 - randomUnit(i, 72) * 90, .7 + randomUnit(i, 73) * .6);
    const sign = textSign("VILLAGE FROM 1920", 11, 2.3); sign.position.set(0, 3, -8); cinematicRoot.add(sign);
    const wrongYear = textSign("FOUNDED 1910", 6.8, 1.55); wrongYear.position.set(10.5, 2.65, -7); wrongYear.rotation.y = -.12; cinematicRoot.add(wrongYear);
    camera.position.set(0, 2.1, 18); camera.lookAt(0, 2.5, -20);
  }
  cinematicRoot.traverse((child) => { if (child.isMesh) { child.receiveShadow = true; } });
  scene.add(cinematicRoot);
}

function startCinematic() {
  state.mode = "cinematic";
  state.cinematic.time = 0;
  state.cinematic.phase = cinematicPhases[0][0];
  cinematicIndex = -1;
  state.monster.active = false; monsterModel.visible = false;
  loadedChunks.forEach(({ root }) => { root.visible = false; });
  state.markers.forEach((marker) => { if (marker.group) marker.group.visible = false; });
  touchControls.hidden = true; hideMask.hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  cinematicCaption.hidden = false;
  updateCinematic(0);
}

function updateCinematic(dt) {
  state.cinematic.time += dt;
  let cursor = 0;
  let nextIndex = cinematicPhases.length;
  for (let i = 0; i < cinematicPhases.length; i += 1) {
    cursor += cinematicPhases[i][1];
    if (state.cinematic.time < cursor) { nextIndex = i; break; }
  }
  if (nextIndex >= cinematicPhases.length) {
    state.mode = "ending";
    cinematicCaption.textContent = "FÖRSTA KAPITLET ÄR BYGGT. ALLA VÄRLDAR FINNS SPARADE I SPELETS PLAN OCH BYGGS VIDARE HÄRIFRÅN.";
    return;
  }
  if (nextIndex !== cinematicIndex) {
    cinematicIndex = nextIndex;
    const [name, , caption] = cinematicPhases[nextIndex];
    state.cinematic.phase = name;
    cinematicCaption.textContent = caption;
    buildCinematicScene(name);
    tone(220 + nextIndex * 35, .35, "sine", .018);
  }
  if (cinematicRoot) {
    const phaseTime = state.cinematic.time - cinematicPhases.slice(0, nextIndex).reduce((sum, phase) => sum + phase[1], 0);
    cinematicRoot.rotation.y = Math.sin(phaseTime * .22) * .025;
    camera.position.x += Math.sin(state.timeMs * .00045) * dt * .35;
  }
}

function nearbyFurnitureState() {
  const p = player();
  return allLoadedDescriptors()
    .filter((desc) => pointAabbDistance(p.x, p.z, desc) < 14)
    .sort((a, b) => pointAabbDistance(p.x, p.z, a) - pointAabbDistance(p.x, p.z, b))
    .slice(0, 14)
    .map((desc) => ({ id: desc.id, type: desc.type, x: Math.round(desc.x * 10) / 10, z: Math.round(desc.z * 10) / 10, movable: Boolean(furnitureTypes[desc.type].movable) }));
}

function renderGameToText() {
  const p = player();
  const current = { x: chunkCoord(p.x), z: chunkCoord(p.z) };
  return JSON.stringify({
    coordinateSystem: "World metres; x east/right, y up, z south/down. IKEA uses endless 48x48 metre chunks; later chapters use their own bounded worlds.",
    mode: state.mode,
    paused: state.paused,
    chapter: state.chapter,
    view: "firstPerson3d-high-resolution",
    chapterSelection: {
      open: Boolean(chapterOverlay && !chapterOverlay.hidden),
      currentNumber: Math.max(1, JOURNEY_ORDER.indexOf(state.chapter) + 2),
      choiceCount: JOURNEY_ORDER.length + 1,
      choices: chapterOverlay && !chapterOverlay.hidden ? chapterMenuEntries().map((entry) => entry.chapter) : []
    },
    world: {
      endless: inWarehouse() || state.chapter === "mystery_village",
      worldSeed: state.worldSeed,
      chunkSize: CHUNK_SIZE,
      currentChunk: current,
      currentZone: currentZone(),
      activeChunks: [...loadedChunks.keys()],
      visitedGeneratedChunks: chunkStates.size,
      objectPatchCount: Object.keys(objectPatches).length,
      nextChapterGraph: chapters
    },
    journey: !inWarehouse() ? {
      order: JOURNEY_ORDER,
      chapterIndex: state.journey.index,
      chapterNumber: state.journey.index + 2,
      totalChapters: JOURNEY_ORDER.length + 1,
      elapsedSeconds: Math.round(state.journey.elapsed * 10) / 10,
      stage: state.journey.stage,
      objective: state.journey.objective,
      flags: { ...state.journey.flags },
      collected: [...state.journey.collected],
      interactables: (journeyWorld?.interactables || []).filter((item) => !item.disabled && visibleInHierarchy(item.mesh)).map((item) => ({
        id: item.id, kind: item.kind, x: Math.round(item.x * 10) / 10, z: Math.round(item.z * 10) / 10,
        distance: Math.round(distance2D(p.x, p.z, item.x, item.z) * 10) / 10,
        label: item.label
      })).sort((a, b) => a.distance - b.distance).slice(0, 10),
      choiceOpen: Boolean(choiceHandlers),
      loop: state.journey.loop
    } : null,
    network: state.network,
    localPlayerId: state.localPlayerId,
    players: Object.values(state.playersById).map((item) => ({
      id: item.id, x: Math.round(item.x * 10) / 10, y: item.y, z: Math.round(item.z * 10) / 10,
      yaw: Math.round(item.yaw * 100) / 100, hidden: item.hidden, hiddenBy: item.hiddenBy,
      carryingObjectId: item.carryingObjectId, flashlight: item.flashlight
    })),
    clock: { day: state.day, time: formatClock(), minutes: Math.round(state.clockMinutes * 10) / 10, nightsSurvived: state.nightsSurvived },
    weather: { type: state.weather.type, remainingTicks: Math.max(0, state.weather.endsTick - state.tick) },
    monster: {
      id: state.monster.id, active: state.monster.active, mode: state.monster.mode,
      x: Math.round(state.monster.x * 10) / 10, z: Math.round(state.monster.z * 10) / 10,
      targetPlayerId: state.monster.targetPlayerId,
      distanceToLocalPlayer: state.monster.active ? Math.round(distance2D(p.x, p.z, state.monster.x, state.monster.z) * 10) / 10 : null,
      lineOfSight: state.monster.active ? !lineBlocked(state.monster.x, state.monster.z, p.x, p.z) : false
    },
    building: { heldObjectId: state.held?.id || null, coverScore: coverScore(), hauntedFortScore: hauntedFortScore(), markers: state.markers.length },
    exit: inWarehouse() ? {
      chunk: EXIT_CHUNK, found: state.exitFound, unlocked: state.exitUnlocked,
      distance: Math.round(distance2D(p.x, p.z, EXIT_CHUNK.x * CHUNK_SIZE + 24, EXIT_CHUNK.z * CHUNK_SIZE + 12))
    } : null,
    objective: objectiveText(),
    prompt: state.prompt,
    toast: state.tick < state.toastUntilTick ? state.toast : "",
    nearbyFurniture: nearbyFurnitureState(),
    cinematic: state.mode === "cinematic" || state.mode === "ending" ? { phase: state.cinematic.phase, time: Math.round(state.cinematic.time * 10) / 10 } : null,
    renderer: renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures } : null,
    controls: "WASD/pilar gå; mus/drag titta; Shift spring; E bär/placera/använd; R vrid; H göm; M vägpil; K välj kapitel; L ficklampa; F helskärm; Esc/P paus."
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (milliseconds) => {
  manualTime = true;
  manualAccumulator += Math.max(0, Number(milliseconds) || 0);
  let safety = 0;
  while (manualAccumulator + .0001 >= FIXED_MS && safety < 100000) {
    manualAccumulator -= FIXED_MS;
    updateSimulation(FIXED_STEP);
    safety += 1;
  }
  render();
};

function teleport(x, z, yaw = null) {
  const p = player();
  p.x = Number(x); p.z = Number(z);
  if (Number.isFinite(yaw)) p.yaw = Number(yaw);
  if (inWarehouse()) {
    lastChunkKey = "";
    refreshChunks(true);
  }
  updatePrompt(); render();
  return JSON.parse(renderGameToText());
}

function addTestFurniture(type, x, z, id) {
  const desc = { id, type, x, z, rotation: 0, removed: false, group: null };
  if (!inWarehouse()) {
    desc.group = createJourneyFurnitureVisual(desc);
    journeyFurniture.push(desc);
    journeyWorld.root.add(desc.group);
    return desc;
  }
  const cx = chunkCoord(x), cz = chunkCoord(z);
  addToChunk(desc, cx, cz);
  const loaded = loadedChunks.get(chunkKey(cx, cz));
  if (loaded) { desc.group = buildFurnitureModel(desc); loaded.root.add(desc.group); }
  return desc;
}

function teleportNearJourney(kindOrId) {
  const item = journeyWorld?.interactables.find((entry) => entry.kind === kindOrId || entry.id === kindOrId);
  if (!item) return null;
  const offset = Math.min(1.8, Math.max(.6, (item.radius || 3) * .45));
  const p = player();
  p.x = item.x;
  p.z = item.z + offset;
  p.yaw = 0;
  updatePrompt();
  render();
  return JSON.parse(renderGameToText());
}

window.__ikea333Test = {
  start: () => { startGame(); return JSON.parse(renderGameToText()); },
  teleport,
  teleportToChunk: (cx, cz, localX = 24, localZ = 24) => teleport(Number(cx) * CHUNK_SIZE + Number(localX), Number(cz) * CHUNK_SIZE + Number(localZ)),
  nearExit: () => teleport(EXIT_CHUNK.x * CHUNK_SIZE + 24, EXIT_CHUNK.z * CHUNK_SIZE + 14.5, 0),
  setClock: (hour, minute = 0) => { state.clockMinutes = Number(hour) * 60 + Number(minute); render(); return JSON.parse(renderGameToText()); },
  setWeather: (type, seconds = 30) => { setWeather(type, seconds); render(); return JSON.parse(renderGameToText()); },
  spawnMonster: () => { spawnMonster(); render(); return JSON.parse(renderGameToText()); },
  setMonsterDistance: (metres) => {
    const p = player(); state.monster.x = p.x - Math.sin(p.yaw) * Number(metres); state.monster.z = p.z - Math.cos(p.yaw) * Number(metres);
    state.monster.active = true; monsterModel.visible = true; render(); return JSON.parse(renderGameToText());
  },
  unlockExit: () => { state.nightsSurvived = Math.max(1, state.nightsSurvived); state.exitUnlocked = true; render(); },
  placeFort: () => {
    const p = player();
    [[-1.8, 0], [1.8, 0], [0, -1.8]].forEach(([dx, dz], index) => addTestFurniture("crate", p.x + dx, p.z + dz, `test-fort-${state.tick}-${index}`));
    updatePrompt(); render(); return JSON.parse(renderGameToText());
  },
  action: (name) => {
    if (name === "interact") interact();
    if (name === "hide") tryHide();
    if (name === "rotate") rotateHeld();
    if (name === "marker") makeMarker();
    render(); return JSON.parse(renderGameToText());
  },
  startCinematic: () => { startCinematic(); render(); return JSON.parse(renderGameToText()); },
  enterChapter: (chapter) => { enterJourneyChapter(chapter); return JSON.parse(renderGameToText()); },
  nearJourney: (kindOrId) => teleportNearJourney(kindOrId),
  setJourneyElapsed: (seconds) => { state.journey.elapsed = Number(seconds); render(); return JSON.parse(renderGameToText()); },
  setVolcanoTimer: (seconds) => { state.journey.flags.eruptionIn = Number(seconds); render(); return JSON.parse(renderGameToText()); },
  setSchoolTimer: (seconds) => {
    state.journey.elapsed = Math.max(0, SCHOOL_MONSTER_SECONDS - Number(seconds));
    state.journey.flags.monsterIn = Math.max(0, Number(seconds));
    render(); return JSON.parse(renderGameToText());
  },
  setLighthouseTimer: (seconds) => {
    state.journey.flags.tsunamiIn = Math.max(0, Number(seconds));
    state.journey.elapsed = Math.max(0, LIGHTHOUSE_TSUNAMI_SECONDS - Number(seconds));
    render(); return JSON.parse(renderGameToText());
  },
  setGraveyardTimer: (seconds) => {
    state.journey.flags.dawnIn = Math.max(0, Number(seconds));
    state.journey.elapsed = Math.max(0, GRAVEYARD_DAWN_SECONDS - Number(seconds));
    render(); return JSON.parse(renderGameToText());
  },
  setMuseumTimer: (seconds) => {
    state.journey.flags.midnightIn = Math.max(0, Number(seconds));
    state.journey.elapsed = Math.max(0, MUSEUM_MIDNIGHT_SECONDS - Number(seconds));
    render(); return JSON.parse(renderGameToText());
  },
  setPlayerYaw: (yaw) => { player().yaw = Number(yaw); updatePrompt(); render(); return JSON.parse(renderGameToText()); },
  setFollowerDistance: (actorName, metres) => {
    const actor = journeyWorld?.actors?.[actorName];
    if (!actor) return null;
    const p = player();
    actor.position.set(p.x, 0, p.z + Number(metres));
    actor.userData.followStarted = true;
    if (actorName === "follower") state.journey.flags.shadowAwake = true;
    if (actorName === "clown") state.journey.flags.clownAwake = true;
    if (actorName === "nurse") state.journey.flags.nurseAwake = true;
    render(); return JSON.parse(renderGameToText());
  },
  choose: (which) => { closeChoice(which === "secondary" ? "secondary" : "primary"); render(); return JSON.parse(renderGameToText()); },
  placeHauntedFort: () => {
    const door = hauntedDoorPosition();
    [[-3, 1], [-1.5, 1], [0, 1], [1.5, 1], [3, 1]].forEach(([dx, dz], index) => addTestFurniture("crate", door.x + dx, door.z + dz, `test-haunted-${index}`));
    render(); return JSON.parse(renderGameToText());
  },
  openChapterMenu: () => { openChapterMenu(); return JSON.parse(renderGameToText()); },
  closeChapterMenu: () => { closeChapterMenu(); return JSON.parse(renderGameToText()); },
  selectChapter: (chapter) => { selectChapter(chapter); return JSON.parse(renderGameToText()); },
  awaitChunksIdle: () => Promise.resolve(JSON.parse(renderGameToText())),
  reset: () => { resetGame(); render(); return JSON.parse(renderGameToText()); },
  snapshot: () => JSON.parse(renderGameToText())
};

function init() {
  try {
    initRenderer();
    initScene();
    buildChapterMenu();
    bindInputs();
    startButton.addEventListener("click", startGame);
    fullscreenButton.addEventListener("click", toggleFullscreen);
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", () => setTimeout(resize, 50));
    resize();
    updatePrompt();
    render();
    requestAnimationFrame((now) => { lastFrame = now; requestAnimationFrame(frame); });
  } catch (error) {
    console.error(error);
    webglError.hidden = false;
    webglError.textContent = `3D-världen kunde inte starta: ${error.message}`;
  }
}

init();
