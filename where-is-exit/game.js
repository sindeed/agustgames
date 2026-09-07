import * as THREE from "./vendor/three.module.js";
import { FLOOR_PLANS, insideRect, platformPose, floorHasGround, stairLocation, isBlankVoid } from "./floor-plans.js?v=20260907-holes-1";
import { findRoute, rectangleConnection, findSurfaceRoute } from "./navigation.js?v=20260907-holes-1";
import { createFactoryIntro, INTRO_TIMES } from "./intro.js?v=20260907-ending-1";
import { createFactoryEnding } from "./ending.js?v=20260907-ending-2";

const canvas = document.getElementById("gameCanvas");
const frameElement = canvas.closest(".canvas-frame");
const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");
const introButton = document.getElementById("introButton");
const introOverlay = document.getElementById("introOverlay");
const introCaption = document.getElementById("introCaption");
const gameHud = document.getElementById("gameHud");
const gameNav = document.getElementById("gameNav");
const hudMissionNumber = document.getElementById("hudMissionNumber");
const hudMission = document.getElementById("hudMission");
const hudProgress = document.getElementById("hudProgress");
const hudFloor = document.getElementById("hudFloor");
const hudMessage = document.getElementById("hudMessage");
const missionList = document.getElementById("missionList");
const touchControls = document.getElementById("touchControls");
const touchJoystick = document.getElementById("touchJoystick");
const touchKnob = document.getElementById("touchKnob");
const fullscreenButton = document.getElementById("fullscreenButton");
const crosshair = document.getElementById("crosshair");
const elevatorOverlay = document.getElementById("elevatorOverlay");
const elevatorFloorButtons = document.getElementById("elevatorFloorButtons");
const elevatorCloseButton = document.getElementById("elevatorCloseButton");
const winOverlay = document.getElementById("winOverlay");
const winMenuButton = document.getElementById("winMenuButton");

const touchDevice = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
document.body.classList.toggle("touch-device", touchDevice);

const FIXED_STEP = 1 / 60;
const FLOOR_COUNT = 6;
const LAMP_TARGET_COUNT = 5;
const MAP_HALF = 55;
const CEILING_HEIGHT = 8.5;
const PLAYER_RADIUS = 0.62;
const WALK_SPEED = 5.0;
const SPRINT_SPEED = 8.9;
const FACELESS_SPEED = 8.1;
const ELEVATOR_MONSTER_CLEARANCE = 5;
const GRAVITY = 17.5;
const JUMP_SPEED = 6.7;
const INTERACT_RANGE = 3.15;
const DOOR_OPEN_MS = 2000;
const VERSION = "20260907-floor6-stay-1";
const STAIR_UP_X = -43;
const STAIR_DOWN_X = -32;
const STAIR_ENTRY_Z = 39.4;
const STAIR_TOP_Z = 46.6;
const STAIR_HEIGHT = 3.06;
const STAIR_STEP_COUNT = 9;
const STAIR_STEP_RISE = 0.34;
const SPIDER_JUMP_SPEED = JUMP_SPEED;
const SPIDER_JUMP_GRAVITY = GRAVITY;
const SPIDER_PATROL_JUMP_INTERVAL = 3.4;
const SPIDER_CHASE_JUMP_INTERVAL = 1.45;

const FLOOR_THEMES = [
  { name: "MOTTAGNING", floor: 0x6f7472, wall: 0x74726a, accent: 0xf1a13d, fog: 0xaab0a9 },
  { name: "MASKINHALL", floor: 0x626d72, wall: 0x68767a, accent: 0x55bed3, fog: 0x9aaab0 },
  { name: "HÄNGANDE PLATTOR", floor: 0x555c61, wall: 0x61666b, accent: 0xf1c84c, fog: 0x606b72 },
  { name: "MASKINER OCH HÅL", floor: 0x71685c, wall: 0x7b7062, accent: 0xed7f52, fog: 0xaaa092 },
  { name: "VERKSTAD", floor: 0x5e6964, wall: 0x68746e, accent: 0x67d08b, fog: 0x94a59d },
  { name: "TVÅ HÖJDNIVÅER", floor: 0x67616e, wall: 0x706878, accent: 0xbc8df0, fog: 0x9f97aa },
];

const MISSION_INFO = [
  { title: "HITTA 5 GULA LAMPOR", short: "Lampor", total: LAMP_TARGET_COUNT },
  { title: "DRA I 5 SPAKAR", short: "Spakar", total: 5 },
  { title: "HITTA 5 NYCKLAR", short: "Nycklar", total: 5 },
  { title: "TÄND VÅNING 3", short: "Belysning", total: 1 },
  { title: "HITTA HAMMAREN OCH EXIT", short: "EXIT", total: 2 },
];

const ENTITY_DEFS = {
  lamps: [
    ["lamp-1", 1, -43, -37], ["lamp-2", 1, -8, -33],
    ["lamp-3", 1, 34, -38], ["lamp-4", 1, 42, -4],
    ["lamp-5", 1, 26, 31],
  ],
  levers: [
    ["lever-1", 1, -41, -8], ["lever-2", 1, 40, 8],
    ["lever-3", 1, 18, 38], ["lever-4", 2, -34, 31],
    ["lever-5", 2, 36, -28],
  ],
  keys: [
    ["key-1", 1, 39, -31], ["key-2", 2, -38, 29],
    ["key-3", 4, 23, 25], ["key-4", 5, -36, -35],
    ["key-5", 2, -31, 22],
  ],
  lightSwitch: ["light-switch", 3, FLOOR_PLANS[3].switch.x, FLOOR_PLANS[3].switch.z],
  hammer: ["hammer", 5, 39, 35],
  boards: ["exit-boards", 6, 19, -50.2],
  exit: ["exit", 6, 19, -53],
};

const MONSTER_STARTS = [
  { id: "monster-1", kind: "tall-one-eye", name: "ENÖGAT", floor: 1, x: 30, z: 24, heading: Math.PI, surface: "floor" },
  { id: "monster-2", kind: "eight-legs", name: "ÅTTABEN", floor: 3, x: -10, z: -32, heading: 0.4, surface: "ceiling" },
  { id: "monster-3", kind: "faceless", name: "SNABBIS", floor: 5, x: -32, z: 23, heading: -0.7, surface: "floor" },
];

const MONSTER_FLOOR_RANGES = {
  "tall-one-eye": [1, 2],
  "eight-legs": [3, 4],
  faceless: [5, 6],
};

const keysDown = new Set();
const touch = {
  stickId: null,
  lookId: null,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  lookX: 0,
  lookY: 0,
};
const actions = { sprint: false, jumpQueued: false };

let renderer;
let scene;
let camera;
let worldRoot;
let actorRoot;
let effectRoot;
let hemisphereLight;
let keyLight;
let fillLight;
let ambientLight;
let playerModel;
let carriedLampModel;
let worldRevision = 0;
let colliders = [];
let doorways = [];
let platforms = [];
let interactables = [];
let interactableModels = new Map();
let monsterModels = new Map();
let dynamicFloorMaterials = [];
let firstPersonRig;
let firstPersonHammer;
let firstPersonLamp;
let manualTime = false;
let accumulator = 0;
let lastFrame = performance.now();
let messageTimer = 0;
let resizeObserver;
let introFilm;
let introElapsed = 0;
let endingFilm;
let endingElapsed = 0;
let endingFrames = [];
let lastEndingSample = -Infinity;

function freshState(seed = 333) {
  return {
    version: VERSION,
    mode: "menu",
    elapsedMs: 0,
    doorOpenUntil: {},
    seed,
    activeMission: 1,
    player: {
      floor: 1,
      x: 0,
      y: 0,
      z: -42,
      vy: 0,
      yaw: Math.PI,
      pitch: 0,
      grounded: true,
      supportId: null,
      autoJump: null,
      autoJumpCount: 0,
      sprinting: false,
      moving: false,
    },
    inventory: { carryingLampId: null, hasHammer: false },
    missions: {
      lamps: { collectedIds: [], installedSocketIds: [], complete: false },
      levers: { pulledIds: [], complete: false },
      keys: { collectedIds: [], complete: false },
      floor3Lights: { switchPressed: false, complete: false },
      exit: { hammerCollected: false, boardsBroken: false, exited: false, complete: false },
    },
    factory: {
      floors: FLOOR_COUNT,
      elevatorsPowered: false,
      floor3Unlocked: false,
      floor3LightsOn: false,
      exitBoards: "intact",
      floor6Visited: false,
      entranceLocked: true,
    },
    monsters: MONSTER_STARTS.map((monster, index) => ({
      ...monster,
      ai: "patrol",
      seesPlayer: false,
      lostTime: 0,
      targetX: monster.x,
      targetZ: monster.z,
      waypoint: index * 7,
      frozen: false,
      visionOverride: null,
      surfaceTimer: 3 + index * 2,
      jumpY: 0,
      baseY: 0,
      supportId: null,
      jumpVelocity: 0,
      jumping: false,
      jumpGrounded: true,
      jumpCooldown: monster.kind === "eight-legs" ? 1.2 : 0,
      stairRoute: null,
      stairY: 0,
      stairCooldown: 2 + index,
      floorRoamTimer: 8 + index * 4,
      path: [],
      pathTimer: 0,
      holeCrossing: null,
    })),
    nearby: null,
    elevatorOpen: false,
    caughtBy: null,
    won: false,
  };
}

let state = freshState();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function seededUnit(a, b = 0, c = 0) {
  let value = (state.seed ^ Math.imul(a + 17, 374761393) ^ Math.imul(b + 23, 668265263) ^ Math.imul(c + 41, 2246822519)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function createMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0.18,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
  });
}

const MATERIALS = {
  darkMetal: createMaterial(0x414b4f, { metalness: 0.58, roughness: 0.42 }),
  mediumMetal: createMaterial(0x596468, { metalness: 0.54, roughness: 0.44 }),
  ceiling: createMaterial(0x647074, { metalness: 0.35, roughness: 0.62, emissive: 0x30383a, emissiveIntensity: 0.72 }),
  lightMetal: createMaterial(0x899398, { metalness: 0.5, roughness: 0.38 }),
  orange: createMaterial(0xe48a27, { metalness: 0.18, roughness: 0.48 }),
  safetyYellow: createMaterial(0xf5ca3f, { metalness: 0.12, roughness: 0.48 }),
  yellowGlow: createMaterial(0xffd94d, { emissive: 0xffb300, emissiveIntensity: 3.4, roughness: 0.18 }),
  yellowOff: createMaterial(0x655c3f, { roughness: 0.72 }),
  monsterBlack: createMaterial(0x000000, { roughness: 0.9, metalness: 0 }),
  playerBlue: createMaterial(0x2e8bd2, { roughness: 0.68 }),
  playerNavy: createMaterial(0x174f79, { roughness: 0.72 }),
  playerSkin: createMaterial(0xf0bd83, { roughness: 0.9, metalness: 0 }),
  green: createMaterial(0x47c47a, { emissive: 0x0b4e25, emissiveIntensity: 0.55 }),
  red: createMaterial(0xc84e47, { emissive: 0x5b100d, emissiveIntensity: 0.35 }),
  wood: createMaterial(0x8c633d, { roughness: 0.92, metalness: 0 }),
  black: createMaterial(0x1d2528, { roughness: 0.72 }),
  white: createMaterial(0xe8eee9, { roughness: 0.7 }),
  glass: createMaterial(0x76c4d4, { transparent: true, opacity: 0.42, roughness: 0.22, metalness: 0.08 }),
};

const FLOOR_ACCENTS = FLOOR_THEMES.map((theme) => createMaterial(theme.accent, {
  emissive: theme.accent,
  emissiveIntensity: 0.16,
  roughness: 0.5,
}));

function factoryTexture(base, fleck, lines = false, repeatX = 8, repeatY = 8) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  context.fillStyle = base;
  context.fillRect(0, 0, 256, 256);
  let seed = 9341;
  for (let index = 0; index < 420; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 256;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 256;
    context.globalAlpha = 0.08 + ((seed >>> 8) % 12) / 100;
    context.fillStyle = fleck;
    context.fillRect(x, y, 1 + seed % 3, 1 + (seed >>> 3) % 3);
  }
  context.globalAlpha = 1;
  if (lines) {
    context.strokeStyle = "rgba(20,26,28,.28)";
    context.lineWidth = 2;
    for (let value = 0; value <= 256; value += 32) {
      context.beginPath();
      context.moveTo(value, 0);
      context.lineTo(value, 256);
      context.stroke();
      context.beginPath();
      context.moveTo(0, value);
      context.lineTo(256, value);
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  return texture;
}

function initRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: Boolean(navigator.webdriver),
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touchDevice ? 1.25 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8c9897);
  scene.fog = new THREE.Fog(0x9da6a1, 35, 92);

  camera = new THREE.PerspectiveCamera(73, 16 / 9, 0.035, 220);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  worldRoot = new THREE.Group();
  actorRoot = new THREE.Group();
  effectRoot = new THREE.Group();
  scene.add(worldRoot, actorRoot, effectRoot);

  hemisphereLight = new THREE.HemisphereLight(0xc8efff, 0x405b34, 1.85);
  scene.add(hemisphereLight);

  ambientLight = new THREE.AmbientLight(0xffe4bd, 0.92);
  scene.add(ambientLight);

  keyLight = new THREE.DirectionalLight(0xffefd1, 2.65);
  keyLight.position.set(-28, 46, 18);
  keyLight.castShadow = true;
  const shadowSize = touchDevice ? 1024 : 1536;
  keyLight.shadow.mapSize.set(shadowSize, shadowSize);
  keyLight.shadow.camera.left = -45;
  keyLight.shadow.camera.right = 45;
  keyLight.shadow.camera.top = 45;
  keyLight.shadow.camera.bottom = -45;
  keyLight.shadow.camera.near = 4;
  keyLight.shadow.camera.far = 110;
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight, keyLight.target);

  fillLight = new THREE.DirectionalLight(0x78bfff, 0.55);
  fillLight.position.set(32, 20, 40);
  scene.add(fillLight);
}

function meshBox(parent, size, position, material, options = {}) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  if (options.rotationY) mesh.rotation.y = options.rotationY;
  mesh.castShadow = options.castShadow ?? !touchDevice;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  if (options.collider) {
    colliders.push({
      id: options.colliderId || `wall-${colliders.length + 1}`,
      minX: position[0] - size[0] / 2,
      maxX: position[0] + size[0] / 2,
      minZ: position[2] - size[2] / 2,
      maxZ: position[2] + size[2] / 2,
      vision: options.vision !== false,
    });
  }
  return mesh;
}

function meshCylinder(parent, radiusTop, radiusBottom, height, segments, position, material) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = !touchDevice;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function meshSphere(parent, radius, position, material, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(8, segments / 2)), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = !touchDevice;
  parent.add(mesh);
  return mesh;
}

function addLabel(parent, text, position, color = "#ffd85c", scale = 5.2) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext("2d");
  context.fillStyle = "rgba(25,31,33,.88)";
  context.fillRect(4, 4, 504, 120);
  context.strokeStyle = color;
  context.lineWidth = 8;
  context.strokeRect(8, 8, 496, 112);
  context.fillStyle = color;
  let fontSize = 54;
  context.font = `900 ${fontSize}px system-ui, sans-serif`;
  while (context.measureText(text).width > 440 && fontSize > 28) {
    fontSize -= 2;
    context.font = `900 ${fontSize}px system-ui, sans-serif`;
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 65);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.position.set(position[0], position[1], position[2]);
  sprite.scale.set(scale * 2.7, scale * 0.68, 1);
  parent.add(sprite);
  return sprite;
}

function disposeWorld() {
  worldRoot.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material?.map && object.type === "Sprite") object.material.map.dispose();
    if (object.type === "Sprite") object.material.dispose();
  });
  worldRoot.clear();
  dynamicFloorMaterials.forEach((material) => {
    material.map?.dispose();
    material.dispose();
  });
  dynamicFloorMaterials = [];
  colliders = [];
  doorways = [];
  platforms = [];
  interactables = [];
  interactableModels = new Map();
}

function addColliderBox(parent, size, position, material, id, vision = true) {
  return meshBox(parent, size, position, material, {
    collider: true,
    colliderId: id,
    vision,
  });
}

function registerInteractable(definition, model = null) {
  interactables.push({ radius: INTERACT_RANGE, ...definition });
  if (model) interactableModels.set(definition.id, model);
}

function addDoorFrame(parent, x, z, rotationY, label = "DÖRR") {
  const id = `door-${state.player.floor}-${x}-${z}`;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  parent.add(group);
  meshBox(group, [0.45, 5.6, 0.6], [-2.2, 2.8, 0], MATERIALS.darkMetal);
  meshBox(group, [0.45, 5.6, 0.6], [2.2, 2.8, 0], MATERIALS.darkMetal);
  meshBox(group, [4.85, 0.45, 0.6], [0, 5.55, 0], MATERIALS.orange);
  const hinge = new THREE.Group();
  hinge.position.set(-2, 0, 0);
  group.add(hinge);
  meshBox(hinge, [4, 5.1, 0.28], [2, 2.55, 0], MATERIALS.mediumMetal);
  meshBox(hinge, [0.16, 0.65, 0.14], [3.65, 2.4, -0.22], MATERIALS.safetyYellow);
  meshBox(hinge, [0.16, 0.65, 0.14], [3.65, 2.4, 0.22], MATERIALS.safetyYellow);
  const collider = { id, minX: 0, maxX: 0, minZ: 0, maxZ: 0, vision: true };
  const door = { id, floor: state.player.floor, name: label, x, z, rotationY, open: false, hinge, collider };
  doorways.push(door);
  colliders.push(collider);
  setDoorOpen(door, (state.doorOpenUntil[id] || 0) > state.elapsedMs);
  registerInteractable({ id, type: "door", name: label, floor: state.player.floor, x, z }, group);
  addLabel(group, label, [0, 6.3, 0], "#ffd15c", 2.0);
  return group;
}

function setDoorOpen(door, open) {
  door.open = open;
  door.hinge.rotation.y = open ? -Math.PI / 2 : 0;
  const cos = Math.cos(door.rotationY);
  const sin = Math.sin(door.rotationY);
  const localX = open ? -2 : 0;
  const localZ = open ? 2 : 0;
  const centerX = door.x + cos * localX + sin * localZ;
  const centerZ = door.z - sin * localX + cos * localZ;
  const halfWidth = open ? 0.14 : 2;
  const halfDepth = open ? 2 : 0.14;
  const extentX = Math.abs(cos) * halfWidth + Math.abs(sin) * halfDepth;
  const extentZ = Math.abs(sin) * halfWidth + Math.abs(cos) * halfDepth;
  Object.assign(door.collider, { minX: centerX - extentX, maxX: centerX + extentX, minZ: centerZ - extentZ, maxZ: centerZ + extentZ });
}

function clearClosingDoor(door) {
  const cos = Math.cos(door.rotationY);
  const sin = Math.sin(door.rotationY);
  const actors = [state.player, ...state.monsters.filter((monster) => monster.floor === door.floor && monster.surface === "floor")];
  for (const actor of actors) {
    const radius = actor === state.player ? PLAYER_RADIUS : actor.kind === "eight-legs" ? 0.95 : 0.72;
    const dx = actor.x - door.x;
    const dz = actor.z - door.z;
    const along = cos * dx - sin * dz;
    const across = sin * dx + cos * dz;
    if (Math.abs(along) >= 2 + radius || Math.abs(across) >= 0.14 + radius) continue;
    const side = across < 0 ? -1 : 1;
    for (const direction of [side, -side]) {
      const safeAcross = direction * (0.14 + radius + 0.08);
      const x = door.x + cos * along + sin * safeAcross;
      const z = door.z - sin * along + cos * safeAcross;
      if (collidesAt(x, z, radius)) continue;
      actor.x = x;
      actor.z = z;
      break;
    }
  }
}

function updateDoors() {
  for (const door of doorways) {
    if (!door.open || state.elapsedMs < (state.doorOpenUntil[door.id] || 0) - 0.000001) continue;
    setDoorOpen(door, false);
    delete state.doorOpenUntil[door.id];
    clearClosingDoor(door);
  }
}

function addFactoryDoorway(parent, x, z, rotationY, label, accentMaterial) {
  addDoorFrame(parent, x, z, rotationY, label);
  const rotated = Math.abs(Math.sin(rotationY)) > 0.5;
  for (const side of [-1, 1]) {
    const wallX = x + Math.cos(rotationY) * side * 4.4;
    const wallZ = z - Math.sin(rotationY) * side * 4.4;
    const size = rotated ? [0.65, 5.6, 4.4] : [4.4, 5.6, 0.65];
    addColliderBox(parent, size, [wallX, 2.8, wallZ], accentMaterial, `door-wall-${label}-${side}`);
  }
}

function addFactoryFixture(parent, x, z, lightsOn, pointLight = false) {
  meshBox(parent, [3.7, 0.14, 0.42], [x, CEILING_HEIGHT - 0.35, z], lightsOn ? MATERIALS.yellowGlow : MATERIALS.yellowOff, { castShadow: false });
  if (pointLight && lightsOn) {
    const light = new THREE.PointLight(0xffd99a, 5.2, 23, 2);
    light.position.set(x, CEILING_HEIGHT - 1.1, z);
    light.castShadow = false;
    parent.add(light);
  }
}

function addMachine(parent, x, z, index, accentMaterial) {
  const width = 3.8 + (index % 3) * 0.65;
  const depth = 2.7 + ((index + 1) % 2) * 0.8;
  addColliderBox(parent, [width, 2.8, depth], [x, 1.4, z], MATERIALS.mediumMetal, `machine-${index}`);
  meshBox(parent, [width * 0.82, 0.3, depth * 0.78], [x, 2.95, z], accentMaterial);
  meshCylinder(parent, 0.3, 0.34, 2.2, 12, [x - width * 0.25, 4.0, z], MATERIALS.darkMetal);
  meshCylinder(parent, 0.3, 0.34, 1.5, 12, [x + width * 0.25, 3.65, z], MATERIALS.darkMetal);
  const indicator = meshSphere(parent, 0.16, [x, 2.8, z + depth * 0.51], index % 2 ? MATERIALS.green : MATERIALS.yellowGlow, 10);
  indicator.castShadow = false;
}

function addConveyor(parent, x, z, rotationY, index) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  parent.add(group);
  meshBox(group, [10, 1.15, 2.5], [0, 0.9, 0], MATERIALS.darkMetal);
  const rotated = Math.abs(Math.sin(rotationY)) > 0.5;
  colliders.push({
    id: `conveyor-${index}`,
    minX: x - (rotated ? 2.5 : 10) / 2,
    maxX: x + (rotated ? 2.5 : 10) / 2,
    minZ: z - (rotated ? 10 : 2.5) / 2,
    maxZ: z + (rotated ? 10 : 2.5) / 2,
    vision: true,
  });
  for (let offset = -4.4; offset <= 4.4; offset += 1.1) {
    const roller = meshCylinder(group, 0.34, 0.34, 2.1, 10, [offset, 1.55, 0], MATERIALS.lightMetal);
    roller.rotation.z = Math.PI / 2;
  }
  meshBox(group, [10.4, 0.18, 0.18], [0, 1.72, -1.25], MATERIALS.orange);
  meshBox(group, [10.4, 0.18, 0.18], [0, 1.72, 1.25], MATERIALS.orange);
}

function addStairs(parent, floor, direction) {
  const isUp = direction === "up";
  const { x, z, rotation = 0 } = stairLocation(floor, direction);
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  parent.add(group);
  for (let step = 0; step < 9; step += 1) {
    meshBox(group, [4.4, 0.34 + step * 0.34, 0.92], [0, (0.34 + step * 0.34) / 2, -3.6 + step * 0.9], MATERIALS.lightMetal, { castShadow: false });
  }
  meshBox(group, [5.2, 0.18, 9], [0, 0.18, 0], MATERIALS.safetyYellow, { castShadow: false });
  const target = isUp ? floor + 1 : floor - 1;
  const text = isUp ? `TRAPPA UPP · ${target}` : `TRAPPA NER · ${target}`;
  addLabel(group, text, [0, 4.8, -1], "#fff19a", 2.2);
  registerInteractable({
    id: `stairs-${direction}-${floor}`,
    type: isUp ? "stair-up" : "stair-down",
    name: text,
    floor,
    targetFloor: target,
    x,
    z: z - Math.cos(rotation) * 3,
    radius: 4.2,
  }, group);
}

function addElevator(parent, floor, theme, location = { x: 0, z: 47 }, index = 0) {
  const group = new THREE.Group();
  const rotation = location.rotation || 0;
  group.position.set(location.x, 0, location.z);
  group.rotation.y = rotation;
  parent.add(group);
  meshBox(group, [12, 0.25, 9], [0, 0.12, 0], MATERIALS.darkMetal, { castShadow: false });
  meshBox(group, [0.55, 6.4, 8.7], [-6, 3.2, 0], MATERIALS.mediumMetal);
  meshBox(group, [0.55, 6.4, 8.7], [6, 3.2, 0], MATERIALS.mediumMetal);
  meshBox(group, [12.5, 0.55, 9], [0, 6.25, 0], MATERIALS.darkMetal);
  meshBox(group, [4.6, 5.7, 0.35], [-3.5, 2.85, -4.25], MATERIALS.lightMetal);
  meshBox(group, [4.6, 5.7, 0.35], [3.5, 2.85, -4.25], MATERIALS.lightMetal);
  const panelMaterial = state.factory.elevatorsPowered ? MATERIALS.green : MATERIALS.red;
  const panel = meshBox(group, [1.3, 2.1, 0.38], [5.1, 2.25, -4.6], panelMaterial);
  addLabel(group, state.factory.elevatorsPowered ? "HISS PÅ" : "HISS AV", [0, 7.0, 0], state.factory.elevatorsPowered ? "#79f2a2" : "#ff9a84", 2.45);
  registerInteractable({ id: `elevator-${floor}${index ? `-${index + 1}` : ''}`, type: "elevator", name: "HISS", floor,
    x: location.x + Math.cos(rotation) * 5.1 - Math.sin(rotation) * 4.6,
    z: location.z - Math.sin(rotation) * 5.1 - Math.cos(rotation) * 4.6, radius: 3.4 }, panel);
  const floorNumber = meshBox(group, [1.5, 1.5, 0.22], [0, 3.9, -4.62], theme.accentMaterial);
  floorNumber.rotation.z = Math.PI / 4;
}

function addLampCollectible(parent, definition) {
  const [id, floor, x, z] = definition;
  if (floor !== state.player.floor) return;
  if (state.missions.lamps.collectedIds.includes(id)) return;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  meshCylinder(group, 0.45, 0.58, 0.4, 14, [0, 0.2, 0], MATERIALS.darkMetal);
  meshCylinder(group, 0.12, 0.12, 1.45, 10, [0, 1.05, 0], MATERIALS.orange);
  meshSphere(group, 0.52, [0, 2.05, 0], MATERIALS.yellowGlow, 18);
  const light = new THREE.PointLight(0xffd75b, 3.2, 10, 2);
  light.position.set(0, 2.0, 0);
  group.add(light);
  registerInteractable({ id, type: "lamp", name: "GUL LAMPA", floor, x, z }, group);
}

function addSocketStation(parent) {
  if (state.player.floor !== 1) return;
  const group = new THREE.Group();
  group.position.set(-8, 0, -47.8);
  parent.add(group);
  meshBox(group, [17, 5.6, 0.55], [0, 2.8, 0], MATERIALS.darkMetal);
  meshBox(group, [16.2, 4.8, 0.25], [0, 2.8, -0.34], MATERIALS.mediumMetal);
  addLabel(group, "5 ELUTTAG", [0, 6.4, 0], "#ffd75b", 2.55);
  for (let index = 0; index < LAMP_TARGET_COUNT; index += 1) {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const sx = -6.4 + column * 3.2;
    const sy = 4.1 - row * 2.15;
    const id = `socket-${index + 1}`;
    const installed = state.missions.lamps.installedSocketIds.includes(id);
    const socket = meshCylinder(group, 0.58, 0.58, 0.22, 16, [sx, sy, -0.54], installed ? MATERIALS.yellowGlow : MATERIALS.black);
    socket.rotation.x = Math.PI / 2;
    if (installed) {
      meshSphere(group, 0.38, [sx, sy, -0.82], MATERIALS.yellowGlow, 14);
    } else if (state.activeMission === 1) {
      registerInteractable({
        id,
        type: "socket",
        name: "TOMT ELUTTAG",
        floor: 1,
        x: group.position.x + sx,
        z: -46.8,
        radius: 3.0,
      }, socket);
    }
  }
}

function addLever(parent, definition) {
  const [id, floor, x, z] = definition;
  if (floor !== state.player.floor || state.activeMission !== 2) return;
  const pulled = state.missions.levers.pulledIds.includes(id);
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  meshBox(group, [1.7, 2.3, 1.1], [0, 1.15, 0], MATERIALS.darkMetal);
  const pivot = new THREE.Group();
  pivot.position.set(0, 2.15, 0);
  pivot.rotation.z = pulled ? 0.9 : -0.9;
  group.add(pivot);
  meshCylinder(pivot, 0.13, 0.13, 1.7, 10, [0, 0.8, 0], MATERIALS.lightMetal);
  meshSphere(pivot, 0.31, [0, 1.68, 0], pulled ? MATERIALS.green : MATERIALS.red, 12);
  if (!pulled) registerInteractable({ id, type: "lever", name: "SPAK", floor, x, z }, group);
}

function addKey(parent, definition) {
  const [id, floor, x, z] = definition;
  if (floor !== state.player.floor || state.activeMission !== 3 || state.missions.keys.collectedIds.includes(id)) return;
  const group = new THREE.Group();
  group.position.set(x, 1.5, z);
  parent.add(group);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.16, 10, 20), MATERIALS.safetyYellow);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  meshBox(group, [1.4, 0.22, 0.25], [1.0, 0, 0], MATERIALS.safetyYellow);
  meshBox(group, [0.22, 0.72, 0.25], [1.48, -0.26, 0], MATERIALS.safetyYellow);
  const light = new THREE.PointLight(0xffcf51, 2.3, 9, 2);
  group.add(light);
  registerInteractable({ id, type: "key", name: "GUL NYCKEL", floor, x, z }, group);
}

function addLightSwitch(parent) {
  const [id, floor, x, z] = ENTITY_DEFS.lightSwitch;
  if (state.player.floor !== floor || state.activeMission !== 4) return;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  meshBox(group, [3.0, 3.2, 1.0], [0, 1.6, 0], MATERIALS.darkMetal);
  meshBox(group, [1.25, 1.25, 0.3], [0, 1.8, -0.62], MATERIALS.green);
  addLabel(group, "TÄND", [0, 4.1, 0], "#8affb0", 1.8);
  registerInteractable({ id, type: "light-switch", name: "LJUSKNAPP", floor, x, z }, group);
}

function addHammer(parent) {
  const [id, floor, x, z] = ENTITY_DEFS.hammer;
  if (state.player.floor !== floor || state.activeMission !== 5 || state.inventory.hasHammer) return;
  const group = new THREE.Group();
  group.position.set(x, 1.25, z);
  group.rotation.z = 0.22;
  parent.add(group);
  const handle = meshCylinder(group, 0.14, 0.18, 2.4, 12, [0, 0, 0], MATERIALS.wood);
  handle.rotation.z = Math.PI / 2;
  meshBox(group, [0.85, 1.25, 0.82], [1.15, 0, 0], MATERIALS.lightMetal);
  const light = new THREE.PointLight(0x9deaff, 2.0, 8, 2);
  group.add(light);
  registerInteractable({ id, type: "hammer", name: "HAMMARE", floor, x, z }, group);
}

function addExit(parent) {
  if (state.player.floor !== 6) return;
  const group = new THREE.Group();
  group.position.set(19, 0, -51);
  parent.add(group);
  meshBox(group, [0.6, 5.2, 0.6], [-3.7, 2.6, 0], MATERIALS.darkMetal);
  meshBox(group, [0.6, 5.2, 0.6], [3.7, 2.6, 0], MATERIALS.darkMetal);
  meshBox(group, [8, 0.65, 0.65], [0, 5.2, 0], MATERIALS.green);
  addLabel(group, "EXIT", [0, 6.3, 0], "#7dffa6", 2.6);
  if (!state.missions.exit.boardsBroken) {
    for (let index = -2; index <= 2; index += 1) {
      const board = meshBox(group, [7.2, 0.6, 0.4], [0, 2.5 + index * 0.6, 0], MATERIALS.wood);
      board.rotation.z = 0.08 * index;
    }
    colliders.push({ id: "exit-boards", minX: 15, maxX: 23, minZ: -51.5, maxZ: -50.7, vision: true });
    if (state.activeMission === 5) registerInteractable({ id: "exit-boards", type: "boards", name: "PLANKOR VID EXIT", floor: 6, x: 19, z: -50.2, radius: 3.4 }, group);
  } else {
    // Winning requires walking through the exit, not using it from the platform.
    registerInteractable({ id: "exit", type: "exit", name: "GÅ UT GENOM EXIT", floor: 6, x: 19, z: -53, radius: 1.4 }, group);
  }
}

function addFloorFixtures(parent, floor, lightsOn) {
  let positions;
  if (floor === 1) {
    positions = [-36, -12, 12, 36].flatMap((x) => [-34, 0, 34].map((z) => [x, z]));
  } else if (floor === 2) {
    positions = [-42, -21, 0, 21, 42].flatMap((x) => [-28, 28].map((z) => [x, z]));
  } else if (floor === 3) {
    const legacy = [-42, -21, 0, 21, 42];
    positions = legacy.flatMap((z) => legacy.map((x) => [x, z]));
  } else if (floor === 4) {
    positions = [-40, -20, 0, 20, 40].flatMap((x) => [-38, -12, 14, 38].map((z) => [x, z]));
  } else if (floor === 5) {
    positions = [[-34, -32], [0, -32], [34, -32], [-22, 0], [22, 0], [-34, 30], [0, 30], [34, 30]];
  } else {
    positions = [-40, -20, 0, 20, 40].flatMap((x) => [-30, 0, 30].map((z) => [x, z]));
  }
  positions.forEach(([x, z], index) => addFactoryFixture(parent, x, z, lightsOn, index % 4 === 0));
}

function addLegacyFactoryLayout(parent, floor, theme, wallMaterial) {
  // Våning 3 behåller den ursprungliga layouten tills användaren ritar sin egen.
  for (const z of [-20, 20]) {
    addColliderBox(parent, [32, 5.8, 0.75], [-35, 2.9, z], wallMaterial, `partition-${z}-west`);
    addColliderBox(parent, [32, 5.8, 0.75], [35, 2.9, z], wallMaterial, `partition-${z}-east`);
    addColliderBox(parent, [14, 5.8, 0.75], [-9, 2.9, z], wallMaterial, `partition-${z}-midwest`);
    addColliderBox(parent, [14, 5.8, 0.75], [9, 2.9, z], wallMaterial, `partition-${z}-mideast`);
    addDoorFrame(parent, 0, z, 0, z < 0 ? "NORRA DÖRREN" : "SÖDRA DÖRREN");
  }
  addColliderBox(parent, [0.75, 5.8, 22], [-24, 2.9, 0], wallMaterial, "partition-west-center");
  addColliderBox(parent, [0.75, 5.8, 22], [24, 2.9, 0], wallMaterial, "partition-east-center");
  addDoorFrame(parent, -24, 0, Math.PI / 2, "VÄST");
  addDoorFrame(parent, 24, 0, Math.PI / 2, "ÖST");

  const machinePositions = [
    [-39, -32], [-22, -33], [19, -34], [38, -33],
    [-39, 31], [-18, 33], [18, 32], [39, 31],
  ];
  machinePositions.forEach(([x, z], index) => {
    const jitterX = (seededUnit(floor, index, 1) - 0.5) * 2.2;
    const jitterZ = (seededUnit(floor, index, 2) - 0.5) * 2.2;
    addMachine(parent, x + jitterX, z + jitterZ, floor * 20 + index, theme.accentMaterial);
  });
  addConveyor(parent, -34, 10, 0, floor * 2);
  addConveyor(parent, 34, -10, Math.PI / 2, floor * 2 + 1);
  for (let index = 0; index < 12; index += 1) {
    const side = index % 2 ? 1 : -1;
    const x = side * (12 + (index % 4) * 8);
    const z = -10 + Math.floor(index / 4) * 10;
    addColliderBox(parent, [1.8, 1.8 + (index % 3) * 0.5, 1.8], [x, 0.9 + (index % 3) * 0.25, z], index % 3 ? MATERIALS.wood : theme.accentMaterial, `crate-${floor}-${index}`, false);
  }
}

function addReceptionLayout(parent, theme) {
  addFactoryDoorway(parent, -28, -4, 0, "SORTERING", theme.accentMaterial);
  addFactoryDoorway(parent, 28, 18, 0, "PAKETRUM", theme.accentMaterial);
  addLabel(parent, "MOTTAGNING · SORTERING", [0, 6.3, -18], "#ffd58a", 3.2);
  addColliderBox(parent, [18, 1.45, 4.2], [0, 0.73, -12], MATERIALS.wood, "reception-main", false);
  meshBox(parent, [18.6, 0.25, 4.7], [0, 1.58, -12], theme.accentMaterial);
  for (const x of [-16, 16]) {
    addColliderBox(parent, [7.5, 1.25, 3.4], [x, 0.63, 7], MATERIALS.mediumMetal, `sorting-desk-${x}`, false);
    meshBox(parent, [7.9, 0.2, 3.8], [x, 1.34, 7], MATERIALS.safetyYellow);
  }
  addConveyor(parent, -28, -17, 0, 101);
  addConveyor(parent, 12, 16, Math.PI / 2, 102);
  [[-33, 14], [-20, 27], [4, 29], [31, 14]].forEach(([x, z], index) => {
    addColliderBox(parent, [3.2, 2.1 + index % 2, 3.2], [x, 1.05 + (index % 2) * 0.5, z], index % 2 ? MATERIALS.orange : MATERIALS.wood, `arrival-package-${index}`, false);
  });
  meshBox(parent, [4, 0.06, 70], [0, 0.04, 4], MATERIALS.safetyYellow, { castShadow: false });
}

function addMachineHallLayout(parent, theme) {
  addFactoryDoorway(parent, -12, -5, Math.PI / 2, "KYLRUM", theme.accentMaterial);
  addFactoryDoorway(parent, 12, 20, 0, "SERVICE", theme.accentMaterial);
  addLabel(parent, "MASKINHALL · KYLSYSTEM", [0, 6.3, -18], "#91efff", 3.2);
  [[-24, -18], [0, -18], [24, -18], [-24, 8], [0, 8], [24, 8]].forEach(([x, z], index) => {
    addMachine(parent, x, z, 200 + index, theme.accentMaterial);
  });
  addConveyor(parent, 0, 25, 0, 210);
  for (const x of [-42, 42]) {
    for (const z of [-16, 4, 24]) {
      meshCylinder(parent, 2.5, 2.8, 5.8, 18, [x, 2.9, z], MATERIALS.glass);
      meshCylinder(parent, 0.55, 0.65, 7.2, 14, [x, 3.6, z], theme.accentMaterial);
    }
  }
  for (const z of [-38, 38]) {
    const pipe = meshCylinder(parent, 0.5, 0.5, 72, 14, [0, 6.1, z], MATERIALS.lightMetal);
    pipe.rotation.z = Math.PI / 2;
  }
}

function addWarehouseRack(parent, x, z, index, accentMaterial) {
  addColliderBox(parent, [12.5, 4.8, 2.4], [x, 2.4, z], MATERIALS.darkMetal, `warehouse-rack-${index}`);
  for (const y of [1.1, 2.5, 3.9]) meshBox(parent, [12.8, 0.18, 2.7], [x, y, z], accentMaterial);
  for (const offset of [-5.2, -1.8, 1.8, 5.2]) {
    meshBox(parent, [2.6, 0.75, 1.8], [x + offset, 1.55 + (index % 2) * 1.4, z], index % 2 ? MATERIALS.wood : MATERIALS.orange);
  }
}

function addWarehouseLayout(parent, theme) {
  addFactoryDoorway(parent, -4, -18, 0, "LAGER A", theme.accentMaterial);
  addFactoryDoorway(parent, 18, 7, 0, "LAGER B", theme.accentMaterial);
  addLabel(parent, "FÄRGLAGER · GÅNGAR", [0, 6.3, 31], "#ffc08a", 3.2);
  const rackPositions = [
    [-34, -31], [-14, -31], [10, -31], [32, -31],
    [-34, -6], [-14, -6], [10, -6], [32, -6],
    [-34, 19], [-14, 19], [10, 19], [32, 19],
  ];
  rackPositions.forEach(([x, z], index) => addWarehouseRack(parent, x, z, index, theme.accentMaterial));
  for (const x of [-44, -24, -4, 16, 36]) {
    meshBox(parent, [1.2, 0.08, 80], [x, 0.05, 0], theme.accentMaterial, { castShadow: false });
  }
}

function addWorkshopBench(parent, x, z, index, accentMaterial) {
  addColliderBox(parent, [10.5, 1.5, 4.5], [x, 0.75, z], MATERIALS.wood, `workbench-${index}`, false);
  meshBox(parent, [11, 0.22, 5], [x, 1.62, z], accentMaterial);
  for (const offset of [-3.2, 0, 3.2]) {
    const arm = meshCylinder(parent, 0.22, 0.3, 3.2, 12, [x + offset, 3.0, z], MATERIALS.lightMetal);
    arm.rotation.z = (index % 2 ? -1 : 1) * 0.42;
    meshSphere(parent, 0.42, [x + offset + (index % 2 ? 0.62 : -0.62), 4.42, z], MATERIALS.green, 12);
  }
}

function addWorkshopLayout(parent, theme) {
  addFactoryDoorway(parent, -14, -5, 0, "MONTERING", theme.accentMaterial);
  addFactoryDoorway(parent, 14, 20, Math.PI / 2, "VERKTYG", theme.accentMaterial);
  addLabel(parent, "ROBOTVERKSTAD · VERKTYG", [0, 6.3, -18], "#a4ffc0", 3.2);
  [[-28, -18], [0, -18], [28, -18], [-28, 8], [0, 8], [28, 8]].forEach(([x, z], index) => {
    addWorkshopBench(parent, x, z, index, theme.accentMaterial);
  });
  for (const x of [-40, -20, 20, 40]) {
    meshCylinder(parent, 1.1, 1.1, 6.5, 18, [x, 3.25, 25], MATERIALS.mediumMetal);
    meshSphere(parent, 1.25, [x, 6.3, 25], theme.accentMaterial, 14);
  }
}

function addLoadingBayLayout(parent, theme) {
  addLabel(parent, "LASTZON · PORT 6", [0, 6.3, -18], "#ddbaff", 3.2);
  const containers = [
    [-38, -27], [-19, -27], [9, -27], [32, -27],
    [-38, 18], [-17, 18], [5, 18], [25, 18],
  ];
  containers.forEach(([x, z], index) => {
    const material = index % 3 === 0 ? theme.accentMaterial : index % 3 === 1 ? MATERIALS.orange : MATERIALS.mediumMetal;
    addColliderBox(parent, [14, 4.2, 5.4], [x, 2.1, z], material, `container-${index}`);
    for (let stripe = -5; stripe <= 5; stripe += 2.5) meshBox(parent, [0.12, 4.0, 5.5], [x + stripe, 2.1, z], MATERIALS.darkMetal);
  });
  for (const z of [-9, 0, 9]) meshBox(parent, [88, 0.07, 0.45], [-2, 0.05, z], MATERIALS.safetyYellow, { castShadow: false });
  addDoorFrame(parent, 39, -14, Math.PI / 2, "LASTPORT");
  meshBox(parent, [18, 0.08, 8], [42, 0.06, 0], MATERIALS.green, { castShadow: false });
}

function floorMark(parent, text, x, y, z, color = '#ffe18b', size = 4) {
  const surface = document.createElement('canvas');
  surface.width = 256; surface.height = 128;
  const ctx = surface.getContext('2d');
  ctx.font = 'bold 68px sans-serif'; ctx.fillStyle = color;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 64);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  dynamicFloorMaterials.push(material);
  const marking = new THREE.Mesh(new THREE.PlaneGeometry(size, size / 2), material);
  marking.rotation.x = -Math.PI / 2;
  marking.position.set(x, y, z);
  parent.add(marking);
}

function addDrawnGround(parent, floor, material, wallMaterial) {
  const plan = FLOOR_PLANS[floor];
  const boxes = [...plan.ground, ...plan.holes];
  const xs = [...new Set(boxes.flatMap(b => [b.x - b.w / 2, b.x + b.w / 2]))].sort((a, b) => a - b);
  const zs = [...new Set(boxes.flatMap(b => [b.z - b.d / 2, b.z + b.d / 2]))].sort((a, b) => a - b);
  const inOutline = (x, z) => plan.ground.some(b => insideRect(x, z, b));
  for (let xi = 0; xi < xs.length - 1; xi++) {
    for (let zi = 0; zi < zs.length - 1; zi++) {
      const x = (xs[xi] + xs[xi + 1]) / 2, z = (zs[zi] + zs[zi + 1]) / 2;
      const w = xs[xi + 1] - xs[xi], d = zs[zi + 1] - zs[zi];
      if (!floorHasGround(floor, x, z)) continue;
      meshBox(parent, [w, 0.35, d], [x, -0.18, z], material, { castShadow: false });
      if (plan.blankIsVoid) {
        for (const [dx, dz, sw, sd] of [[-w / 2, 0, 0.15, d], [w / 2, 0, 0.15, d], [0, -d / 2, w, 0.15], [0, d / 2, w, 0.15]]) {
          if (floorHasGround(floor, x + dx * 1.001, z + dz * 1.001)) continue;
          meshBox(parent, [sw, 0.06, sd], [x + dx, 0.03, z + dz], MATERIALS.safetyYellow, { castShadow: false });
          meshBox(parent, [sw, 4.8, sd], [x + dx, -2.6, z + dz], MATERIALS.darkMetal, { castShadow: false });
        }
      }
      if (floor !== 4) continue;
      for (const [dx, dz, sw, sd] of [[-w / 2, 0, 0.4, d], [w / 2, 0, 0.4, d], [0, -d / 2, w, 0.4], [0, d / 2, w, 0.4]]) {
        if (inOutline(x + dx * 1.001, z + dz * 1.001)) continue;
        addColliderBox(parent, [sw, CEILING_HEIGHT, sd], [x + dx, CEILING_HEIGHT / 2, z + dz], wallMaterial, `outline-${xi}-${zi}-${dx}-${dz}`);
      }
    }
  }
  meshBox(parent, [110, 0.3, 110], [0, -7.5, 0], MATERIALS.darkMetal, { castShadow: false });
  for (const hole of plan.holes) {
    for (const side of [-1, 1]) {
      meshBox(parent, [hole.w, 0.06, 0.2], [hole.x, 0.035, hole.z + side * hole.d / 2], MATERIALS.safetyYellow);
      meshBox(parent, [0.2, 0.06, hole.d], [hole.x + side * hole.w / 2, 0.035, hole.z], MATERIALS.safetyYellow);
    }
    addLabel(parent, 'M · HÅL', [hole.x, 1.2, hole.z], '#ffd35b', 2.2);
  }
}

function addSuspendedPlatform(parent, definition, accent) {
  const group = new THREE.Group();
  group.name = `platform:${definition.id}`;
  parent.add(group);
  meshBox(group, [definition.w, 0.32, definition.d], [0, -0.16, 0], MATERIALS.darkMetal);
  meshBox(group, [definition.w - 0.2, 0.06, definition.d - 0.2], [0, 0, 0], accent);
  floorMark(group, `S ${definition.arrow || ''}`, 0, 0.045, 0, '#fff6c5', definition.w - 0.6);
  const ropes = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const rope = meshCylinder(parent, 0.055, 0.055, 1, 7, [0, 0, 0], MATERIALS.wood);
    rope.name = `rope:${definition.id}:${ropes.length}`;
    ropes.push({ mesh: rope, dx: sx * (definition.w / 2 - 0.22), dz: sz * (definition.d / 2 - 0.22) });
  }
  const pose = platformPose(definition, state.elapsedMs / 1000);
  const platform = { ...definition, ...pose, definition, group, ropes };
  platforms.push(platform);
  positionPlatformModel(platform);
  if (definition.to && definition.kind === 'shuttle') {
    const length = Math.hypot(definition.to.x - definition.from.x, definition.to.z - definition.from.z);
    const rail = meshBox(parent, [0.16, 0.16, length + definition.d],
      [(definition.from.x + definition.to.x) / 2, CEILING_HEIGHT - 0.12, (definition.from.z + definition.to.z) / 2], MATERIALS.lightMetal);
    rail.rotation.y = Math.atan2(definition.to.x - definition.from.x, definition.to.z - definition.from.z);
  }
}

function positionPlatformModel(platform) {
  platform.group.position.set(platform.x, platform.y, platform.z);
  for (const { mesh, dx, dz } of platform.ropes) {
    const length = CEILING_HEIGHT - platform.y;
    mesh.position.set(platform.x + dx, platform.y + length / 2, platform.z + dz);
    mesh.scale.y = length;
  }
}

function addDrawnLayout(parent, floor, theme, wallMaterial) {
  const plan = FLOOR_PLANS[floor];
  for (const machine of plan.machines) {
    addMachine(parent, machine.x - 2.4, machine.z, 401, theme.accentMaterial);
    addMachine(parent, machine.x + 2.4, machine.z, 402, theme.accentMaterial);
    floorMark(parent, 'A', machine.x, 0.03, machine.z + 4, '#ffc993', 3);
  }
  for (const wall of plan.walls || []) {
    addColliderBox(parent, [wall.w, 7, wall.d], [wall.x, 3.5, wall.z], wallMaterial, wall.id);
  }
  for (const platform of plan.platforms) addSuspendedPlatform(parent, platform, theme.accentMaterial);
  for (const destination of plan.destinations) floorMark(parent, 'U', destination.x, 0.05, destination.z, '#ffe79b', 4);
  for (const upper of plan.upper || []) {
    meshBox(parent, [upper.w, 0.3, upper.d], [upper.x, upper.y - 0.15, upper.z], MATERIALS.mediumMetal);
    floorMark(parent, 'ÖVRE', upper.x, upper.y + 0.03, upper.z, '#f0dbff', 5);
    for (const side of [-1, 1]) {
      for (let z = upper.z - upper.d / 2; z <= upper.z + upper.d / 2; z += 4) {
        meshCylinder(parent, 0.08, 0.08, upper.y, 8, [upper.x + side * (upper.w / 2 - 0.15), upper.y / 2, z], MATERIALS.lightMetal);
      }
    }
  }
  for (const bridge of plan.monsterOnly || []) {
    // E is a sloped route to the upper row, usable only by monsters.
    const ramp = meshBox(parent, [bridge.w, 0.22, Math.hypot(bridge.d, 3.2)], [bridge.x, 1.6, bridge.z], theme.accentMaterial);
    ramp.rotation.x = Math.atan2(3.2, bridge.d);
    addLabel(parent, 'E · BARA MONSTER', [bridge.x, 3, bridge.z + 5], '#e8c6ff', 2.5);
  }
  if (plan.playerSpawn) floorMark(parent, 'W · START', plan.playerSpawn.x, 0.035, plan.playerSpawn.z, '#95efcb', 8);
  if (plan.monsterSpawn) floorMark(parent, 'V1', plan.monsterSpawn.x, 0.035, plan.monsterSpawn.z, '#ffa96a', 4);
}

function addFloorLayout(parent, floor, theme, wallMaterial) {
  if (floor === 1) addReceptionLayout(parent, theme);
  else if (floor === 2) addMachineHallLayout(parent, theme);
  else if (floor === 3 || floor === 4) addDrawnLayout(parent, floor, theme, wallMaterial);
  else if (floor === 5) addWorkshopLayout(parent, theme);
  else addDrawnLayout(parent, floor, theme, wallMaterial);
}

function buildFloor(floor = state.player.floor) {
  disposeWorld();
  worldRevision += 1;
  const theme = FLOOR_THEMES[floor - 1];
  theme.accentMaterial = FLOOR_ACCENTS[floor - 1];
  const floorColor = `#${theme.floor.toString(16).padStart(6, "0")}`;
  const wallColor = `#${theme.wall.toString(16).padStart(6, "0")}`;
  const floorMaterial = createMaterial(0xffffff, { roughness: 0.9, metalness: 0.05 });
  floorMaterial.map = factoryTexture(floorColor, "#d1c6ac", true, 18, 18);
  const wallMaterial = createMaterial(0xffffff, { roughness: 0.82, metalness: 0.12 });
  wallMaterial.map = factoryTexture(wallColor, "#d9e0dd", false, 9, 3);
  dynamicFloorMaterials.push(floorMaterial, wallMaterial);
  const floor3Dim = floor === 3 && !state.factory.floor3LightsOn;
  const factoryLightsOn = !floor3Dim;

  scene.background.set(floor3Dim ? 0x3a4247 : theme.fog);
  scene.fog.color.set(floor3Dim ? 0x3d474d : theme.fog);
  scene.fog.near = floor3Dim ? 25 : 38;
  scene.fog.far = floor3Dim ? 72 : 98;
  hemisphereLight.intensity = floor3Dim ? 0.68 : 1.85;
  keyLight.intensity = floor3Dim ? 0.65 : 2.65;
  fillLight.intensity = floor3Dim ? 0.42 : 0.55;
  ambientLight.intensity = floor3Dim ? 0.32 : 0.92;

  if (FLOOR_PLANS[floor]) addDrawnGround(worldRoot, floor, floorMaterial, wallMaterial);
  else meshBox(worldRoot, [MAP_HALF * 2, 0.35, MAP_HALF * 2], [0, -0.18, 0], floorMaterial, { receiveShadow: true, castShadow: false });
  meshBox(worldRoot, [MAP_HALF * 2, 0.22, MAP_HALF * 2], [0, CEILING_HEIGHT + 0.1, 0], MATERIALS.ceiling, { castShadow: false });

  const wallHeight = CEILING_HEIGHT;
  addColliderBox(worldRoot, [1.0, wallHeight, MAP_HALF * 2], [-MAP_HALF, wallHeight / 2, 0], wallMaterial, "outer-west");
  if (floor === 6) {
    addColliderBox(worldRoot, [1.0, wallHeight, MAP_HALF - 5], [MAP_HALF, wallHeight / 2, -(MAP_HALF + 5) / 2], wallMaterial, "outer-east-north");
    addColliderBox(worldRoot, [1.0, wallHeight, MAP_HALF - 5], [MAP_HALF, wallHeight / 2, (MAP_HALF + 5) / 2], wallMaterial, "outer-east-south");
  } else {
    addColliderBox(worldRoot, [1.0, wallHeight, MAP_HALF * 2], [MAP_HALF, wallHeight / 2, 0], wallMaterial, "outer-east");
  }
  if (floor === 6) {
    // The existing EXIT has a real opening behind its frame. This also keeps
    // the ending's exact-world replay from showing a wall behind the exit.
    addColliderBox(worldRoot, [70, wallHeight, 1.0], [-20, wallHeight / 2, -MAP_HALF], wallMaterial, "exit-wall-west");
    addColliderBox(worldRoot, [32, wallHeight, 1.0], [39, wallHeight / 2, -MAP_HALF], wallMaterial, "exit-wall-east");
    addColliderBox(worldRoot, [8, 3, 1.0], [19, 7, -MAP_HALF], wallMaterial, "exit-wall-header");
  } else {
    addColliderBox(worldRoot, [MAP_HALF * 2, wallHeight, 1.0], [0, wallHeight / 2, -MAP_HALF], wallMaterial, "outer-north");
  }
  addColliderBox(worldRoot, [MAP_HALF * 2, wallHeight, 1.0], [0, wallHeight / 2, MAP_HALF], wallMaterial, "outer-south");

  addFloorFixtures(worldRoot, floor, factoryLightsOn);
  addFloorLayout(worldRoot, floor, theme, wallMaterial);
  if (floor === 1) addLockedEntrance(worldRoot);

  addLabel(worldRoot, `VÅNING ${floor} · ${theme.name}`, [0, 6.7, -51.8], `#${theme.accent.toString(16).padStart(6, "0")}`, 4.1);
  const elevators = FLOOR_PLANS[floor]?.elevators || [{ x: 0, z: 47 }];
  elevators.forEach((location, index) => addElevator(worldRoot, floor, theme, location, index));
  if (floor < FLOOR_COUNT) addStairs(worldRoot, floor, "up");
  if (floor > 1) addStairs(worldRoot, floor, "down");

  addSocketStation(worldRoot);
  if (state.activeMission === 1) ENTITY_DEFS.lamps.forEach((definition) => addLampCollectible(worldRoot, definition));
  ENTITY_DEFS.levers.forEach((definition) => addLever(worldRoot, definition));
  ENTITY_DEFS.keys.forEach((definition) => addKey(worldRoot, definition));
  addLightSwitch(worldRoot);
  addHammer(worldRoot);
  addExit(worldRoot);

  updateActorVisibility();
  updateHud();
}

function limb(parent, size, position, material, name) {
  const pivot = new THREE.Group();
  pivot.position.set(position[0], position[1], position[2]);
  pivot.name = name;
  parent.add(pivot);
  meshBox(pivot, size, [0, -size[1] / 2, 0], material);
  return pivot;
}

function addLockedEntrance(parent) {
  const door = meshBox(parent, [5.4, 6.6, 0.45], [0, 3.3, -53.8], MATERIALS.mediumMetal,
    { collider: true, colliderId: 'locked-factory-entrance' });
  for (const x of [-2.85, 2.85]) meshBox(parent, [0.3, 7, 0.6], [x, 3.5, -53.6], MATERIALS.darkMetal);
  meshBox(parent, [5.9, 0.3, 0.6], [0, 6.9, -53.6], MATERIALS.darkMetal);
  meshBox(parent, [0.07, 6.4, 0.1], [0, 3.2, -53.5], MATERIALS.darkMetal);
  meshBox(parent, [1.2, 0.16, 0.15], [0, 2.8, -53.4], MATERIALS.lightMetal);
  meshBox(parent, [0.6, 0.75, 0.28], [0, 2.4, -53.2], MATERIALS.safetyYellow);
  addLabel(parent, 'INGÅNG · LÅST', [0, 5.25, -53.35], '#ffd34f', 1.65);
  registerInteractable({ id: 'factory-entrance', type: 'locked-entrance', name: 'INGÅNG · LÅST', floor: 1,
    x: 0, z: -53.2, radius: 3.4 }, door);
}

function buildPlayerModel(parent = actorRoot) {
  const group = new THREE.Group();
  group.name = "player";
  meshBox(group, [1.15, 1.55, 0.68], [0, 2.15, 0], MATERIALS.playerBlue);
  meshSphere(group, 0.57, [0, 3.38, 0], MATERIALS.playerSkin, 18);
  meshCylinder(group, 0.67, 0.55, 0.35, 18, [0, 3.88, 0], MATERIALS.safetyYellow);
  meshBox(group, [1.45, 0.12, 0.8], [0, 3.79, 0.12], MATERIALS.safetyYellow);
  group.userData.leftArm = limb(group, [0.34, 1.45, 0.34], [-0.78, 2.78, 0], MATERIALS.playerNavy, "leftArm");
  group.userData.rightArm = limb(group, [0.34, 1.45, 0.34], [0.78, 2.78, 0], MATERIALS.playerNavy, "rightArm");
  group.userData.leftLeg = limb(group, [0.42, 1.5, 0.45], [-0.34, 1.38, 0], MATERIALS.playerNavy, "leftLeg");
  group.userData.rightLeg = limb(group, [0.42, 1.5, 0.45], [0.34, 1.38, 0], MATERIALS.playerNavy, "rightLeg");
  meshBox(group, [0.58, 0.25, 0.95], [-0.34, 0.12, 0.16], MATERIALS.black);
  meshBox(group, [0.58, 0.25, 0.95], [0.34, 0.12, 0.16], MATERIALS.black);

  const lampModel = new THREE.Group();
  lampModel.position.set(0.92, 2.35, 0.35);
  meshCylinder(lampModel, 0.16, 0.2, 0.28, 10, [0, 0, 0], MATERIALS.darkMetal);
  meshSphere(lampModel, 0.26, [0, 0.35, 0], MATERIALS.yellowGlow, 12);
  lampModel.visible = false;
  group.add(lampModel);
  if (parent === actorRoot) carriedLampModel = lampModel;
  parent.add(group);
  return group;
}

function createTallMonster() {
  const group = new THREE.Group();
  meshBox(group, [1.55, 3.15, 0.95], [0, 4.35, 0], MATERIALS.monsterBlack);
  meshSphere(group, 0.95, [0, 6.25, 0], MATERIALS.monsterBlack, 18);
  const yellowEye = meshSphere(group, 0.27, [-0.3, 6.37, 0.87], MATERIALS.yellowGlow, 16);
  yellowEye.scale.set(1.05, 0.9, 0.38);
  const blackEye = meshSphere(group, 0.27, [0.3, 6.37, 0.65], MATERIALS.monsterBlack, 16);
  blackEye.scale.set(1.05, 0.9, 0.38);
  group.userData.leftArm = limb(group, [0.42, 3.2, 0.42], [-1.08, 5.3, 0], MATERIALS.monsterBlack, "leftArm");
  group.userData.rightArm = limb(group, [0.42, 3.2, 0.42], [1.08, 5.3, 0], MATERIALS.monsterBlack, "rightArm");
  group.userData.leftLeg = limb(group, [0.52, 3.25, 0.56], [-0.45, 3.0, 0], MATERIALS.monsterBlack, "leftLeg");
  group.userData.rightLeg = limb(group, [0.52, 3.25, 0.56], [0.45, 3.0, 0], MATERIALS.monsterBlack, "rightLeg");
  meshBox(group, [0.78, 0.32, 1.25], [-0.45, 0.16, 0.22], MATERIALS.monsterBlack);
  meshBox(group, [0.78, 0.32, 1.25], [0.45, 0.16, 0.22], MATERIALS.monsterBlack);
  group.scale.setScalar(0.78);
  return group;
}

function createSpiderMonster() {
  const group = new THREE.Group();
  const body = meshSphere(group, 1.12, [0, 1.22, 0], MATERIALS.monsterBlack, 18);
  body.scale.set(1.3, 0.82, 1.15);
  const head = meshSphere(group, 0.76, [0, 1.42, 1.06], MATERIALS.monsterBlack, 18);
  head.scale.set(1.05, 0.9, 0.9);
  for (const x of [-0.28, 0.28]) {
    const eye = meshSphere(group, 0.17, [x, 1.6, 1.7], MATERIALS.yellowGlow, 12);
    eye.scale.z = 0.5;
  }
  group.userData.legs = [];
  for (let index = 0; index < 8; index += 1) {
    const side = index < 4 ? -1 : 1;
    const row = index % 4;
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.72, 1.22, -0.78 + row * 0.52);
    pivot.rotation.y = side * (0.45 + row * 0.12);
    group.add(pivot);
    const upper = meshCylinder(pivot, 0.13, 0.16, 1.55, 9, [side * 0.68, -0.25, 0], MATERIALS.monsterBlack);
    upper.rotation.z = side * 1.05;
    const lower = meshCylinder(pivot, 0.11, 0.13, 1.5, 9, [side * 1.37, -0.75, 0], MATERIALS.monsterBlack);
    lower.rotation.z = side * 0.28;
    group.userData.legs.push(pivot);
  }
  return group;
}

function createFacelessMonster() {
  const group = new THREE.Group();
  meshBox(group, [1.45, 1.75, 0.85], [0, 2.15, 0], MATERIALS.monsterBlack);
  meshSphere(group, 0.68, [0, 3.55, 0], MATERIALS.monsterBlack, 18);
  group.userData.leftArm = limb(group, [0.38, 1.65, 0.38], [-0.93, 2.78, 0], MATERIALS.monsterBlack, "leftArm");
  group.userData.rightArm = limb(group, [0.38, 1.65, 0.38], [0.93, 2.78, 0], MATERIALS.monsterBlack, "rightArm");
  group.userData.leftLeg = limb(group, [0.46, 1.65, 0.5], [-0.37, 1.45, 0], MATERIALS.monsterBlack, "leftLeg");
  group.userData.rightLeg = limb(group, [0.46, 1.65, 0.5], [0.37, 1.45, 0], MATERIALS.monsterBlack, "rightLeg");
  meshBox(group, [0.65, 0.26, 1.05], [-0.37, 0.13, 0.18], MATERIALS.monsterBlack);
  meshBox(group, [0.65, 0.26, 1.05], [0.37, 0.13, 0.18], MATERIALS.monsterBlack);
  return group;
}

function buildMonsterModels() {
  MONSTER_STARTS.forEach((monster) => {
    const model = monster.kind === "tall-one-eye"
      ? createTallMonster()
      : monster.kind === "eight-legs"
        ? createSpiderMonster()
        : createFacelessMonster();
    model.name = monster.id;
    actorRoot.add(model);
    monsterModels.set(monster.id, model);
  });
}

function buildFirstPersonRig() {
  const rig = new THREE.Group();
  rig.position.set(0.48, -0.48, -1.05);
  camera.add(rig);

  const leftArm = meshBox(rig, [0.2, 0.2, 0.78], [-0.48, -0.08, 0.06], MATERIALS.playerNavy, { castShadow: false });
  leftArm.rotation.x = -0.35;
  leftArm.rotation.y = -0.18;
  meshSphere(rig, 0.15, [-0.49, -0.13, -0.38], MATERIALS.playerSkin, 12).castShadow = false;
  const rightArm = meshBox(rig, [0.22, 0.22, 0.82], [0.25, -0.1, 0.02], MATERIALS.playerNavy, { castShadow: false });
  rightArm.rotation.x = -0.32;
  rightArm.rotation.y = 0.15;
  meshSphere(rig, 0.16, [0.29, -0.16, -0.42], MATERIALS.playerSkin, 12).castShadow = false;

  firstPersonLamp = new THREE.Group();
  firstPersonLamp.position.set(0.28, -0.08, -0.56);
  meshCylinder(firstPersonLamp, 0.11, 0.14, 0.35, 10, [0, 0, 0], MATERIALS.darkMetal);
  meshSphere(firstPersonLamp, 0.2, [0, 0.28, 0], MATERIALS.yellowGlow, 12);
  firstPersonLamp.visible = false;
  rig.add(firstPersonLamp);

  firstPersonHammer = new THREE.Group();
  firstPersonHammer.position.set(0.29, -0.06, -0.58);
  firstPersonHammer.rotation.z = -0.45;
  const handle = meshCylinder(firstPersonHammer, 0.07, 0.09, 0.92, 10, [0, 0.18, 0], MATERIALS.wood);
  handle.rotation.z = Math.PI / 2;
  meshBox(firstPersonHammer, [0.34, 0.48, 0.3], [0.48, 0.18, 0], MATERIALS.lightMetal, { castShadow: false });
  firstPersonHammer.visible = false;
  rig.add(firstPersonHammer);

  return rig;
}

function updateActorVisibility() {
  if (playerModel) playerModel.visible = false;
  if (carriedLampModel) carriedLampModel.visible = false;
  if (firstPersonRig) firstPersonRig.visible = state.mode === "playing" || state.mode === "won";
  if (firstPersonLamp) firstPersonLamp.visible = Boolean(state.inventory.carryingLampId && firstPersonRig?.visible);
  if (firstPersonHammer) firstPersonHammer.visible = Boolean(state.inventory.hasHammer && firstPersonRig?.visible);
  state.monsters.forEach((monster) => {
    const model = monsterModels.get(monster.id);
    if (model) model.visible = (state.mode === "playing" || state.mode === "won") && monster.floor === state.player.floor;
  });
}

// Protect the cabin and five metres around it, at every height, even offscreen.
function elevatorSafeAreas(floor) {
  return (FLOOR_PLANS[floor]?.elevators || [{ x: 0, z: 47 }]).map(lift => ({
    x: lift.x, z: lift.z, w: 12 + ELEVATOR_MONSTER_CLEARANCE * 2,
    d: 9 + ELEVATOR_MONSTER_CLEARANCE * 2,
  }));
}

function nearElevator(floor, x, z) {
  return elevatorSafeAreas(floor).some(area => insideRect(x, z, area));
}

function crossesElevatorArea(monster, x, z) {
  return elevatorSafeAreas(monster.floor).some(area => segmentHitsBox(monster.x, monster.z, x, z, {
    minX: area.x - area.w / 2, maxX: area.x + area.w / 2,
    minZ: area.z - area.d / 2, maxZ: area.z + area.d / 2,
  }));
}

function collidesAt(x, z, radius = PLAYER_RADIUS, actor = null) {
  if (actor && actor !== state.player && nearElevator(actor.floor, x, z)) return true;
  if (actor === state.player && (FLOOR_PLANS[actor.floor]?.monsterOnly || []).some(box => insideRect(x, z, box, -radius))) return true;
  if (actor && actor.surface !== 'wall' && actor.surface !== 'ceiling') {
    const feet = actor === state.player ? actor.y : (actor.baseY || 0) + (actor.jumpY || 0);
    const solids = [...platforms, ...(FLOOR_PLANS[actor.floor]?.upper || [])];
    if (solids.some(box => box.y > feet + 0.3 && box.y < feet + 1.55 && insideRect(x, z, box, -radius * 0.5))) return true;
  }
  return colliders.some((wall) => (
    x + radius > wall.minX
    && x - radius < wall.maxX
    && z + radius > wall.minZ
    && z - radius < wall.maxZ
  ));
}

function moveWithCollisions(actor, dx, dz, radius = PLAYER_RADIUS) {
  const nextX = actor.x + dx;
  if (!collidesAt(nextX, actor.z, radius, actor)) actor.x = nextX;
  const nextZ = actor.z + dz;
  if (!collidesAt(actor.x, nextZ, radius, actor)) actor.z = nextZ;
}

function supportAt(x, z, highestY = Infinity, monster = false) {
  let best = floorHasGround(state.player.floor, x, z) && highestY >= -0.02 ? { id: 'ground', y: 0 } : null;
  for (const box of [...platforms, ...(FLOOR_PLANS[state.player.floor]?.upper || [])]) {
    // Only hanging platforms need an edge inset. Fixed floor joins must meet
    // exactly, otherwise the E ramp ends in a five-centimetre navigation gap.
    if (box.y <= highestY + 0.02 && insideRect(x, z, box, box.kind ? 0.05 : 0) && (!best || box.y > best.y)) best = { id: box.id, y: box.y };
  }
  if (monster) for (const ramp of FLOOR_PLANS[state.player.floor]?.monsterOnly || []) {
    const height = 3.2 * clamp((ramp.z + ramp.d / 2 - z) / ramp.d, 0, 1);
    if (insideRect(x, z, ramp) && height <= highestY + 0.35 && (!best || height > best.y)) best = { id: ramp.id, y: height };
  }
  return best;
}

function floorSupportAt(floor, x, z, highestY = Infinity) {
  if (floor === state.player.floor) return supportAt(x, z, highestY, true);
  const plan = FLOOR_PLANS[floor];
  let best = floorHasGround(floor, x, z) && highestY >= -0.02 ? { id: 'ground', y: 0 } : null;
  const surfaces = [...(plan?.upper || []), ...(plan?.platforms || []).map(p => ({ ...p, ...platformPose(p, state.elapsedMs / 1000) }))];
  for (const box of surfaces) {
    if (box.y <= highestY + 0.02 && insideRect(x, z, box, box.kind ? 0.05 : 0) && (!best || box.y > best.y)) best = { id: box.id, y: box.y };
  }
  for (const ramp of plan?.monsterOnly || []) {
    const y = 3.2 * clamp((ramp.z + ramp.d / 2 - z) / ramp.d, 0, 1);
    if (insideRect(x, z, ramp) && y <= highestY + 0.35 && (!best || y > best.y)) best = { id: ramp.id, y };
  }
  return best;
}

function updatePlatforms() {
  for (const platform of platforms) {
    const pose = platformPose(platform.definition, state.elapsedMs / 1000);
    const dx = pose.x - platform.x, dy = pose.y - platform.y, dz = pose.z - platform.z;
    for (const actor of [state.player, ...state.monsters]) {
      if (actor.floor !== state.player.floor || actor.supportId !== platform.id) continue;
      const riding = actor === state.player ? actor.grounded : !actor.jumping && actor.surface === 'floor';
      if (!riding || !insideRect(actor.x, actor.z, platform)) { actor.supportId = null; continue; }
      actor.x += dx; actor.z += dz;
      if (actor === state.player) actor.y += dy;
      else actor.baseY = (actor.baseY || 0) + dy;
    }
    Object.assign(platform, pose);
    positionPlatformModel(platform);
  }
  for (const monster of state.monsters) {
    const definition = FLOOR_PLANS[monster.floor]?.platforms.find(p => p.id === monster.supportId);
    if (!definition || monster.jumping || monster.surface !== 'floor') { monster.lastPlatformPose = null; continue; }
    const pose = platformPose(definition, state.elapsedMs / 1000);
    const previous = monster.lastPlatformPose;
    if (monster.floor !== state.player.floor && previous?.id === definition.id) {
      monster.x += pose.x - previous.x; monster.z += pose.z - previous.z;
      monster.baseY = (monster.baseY || 0) + pose.y - previous.y;
    }
    monster.lastPlatformPose = { ...pose, id: definition.id };
  }
}

function segmentHitsBox(ax, az, bx, bz, box) {
  const dx = bx - ax;
  const dz = bz - az;
  let low = 0;
  let high = 1;
  const clip = (p, q) => {
    if (Math.abs(p) < 1e-8) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > high) return false;
      if (r > low) low = r;
    } else {
      if (r < low) return false;
      if (r < high) high = r;
    }
    return true;
  };
  return clip(-dx, ax - box.minX)
    && clip(dx, box.maxX - ax)
    && clip(-dz, az - box.minZ)
    && clip(dz, box.maxZ - az)
    && high >= low;
}

function lineBlocked(ax, az, bx, bz) {
  return colliders.some((wall) => wall.vision !== false && segmentHitsBox(ax, az, bx, bz, wall));
}

function missionProgress() {
  if (state.activeMission === 1) {
    return {
      value: state.missions.lamps.installedSocketIds.length,
      total: LAMP_TARGET_COUNT,
      text: `${state.missions.lamps.installedSocketIds.length} / ${LAMP_TARGET_COUNT} I ELUTTAG`,
    };
  }
  if (state.activeMission === 2) {
    return {
      value: state.missions.levers.pulledIds.length,
      total: 5,
      text: `${state.missions.levers.pulledIds.length} / 5 SPAKAR`,
    };
  }
  if (state.activeMission === 3) {
    return {
      value: state.missions.keys.collectedIds.length,
      total: 5,
      text: `${state.missions.keys.collectedIds.length} / 5 NYCKLAR`,
    };
  }
  if (state.activeMission === 4) {
    return { value: state.factory.floor3LightsOn ? 1 : 0, total: 1, text: state.factory.floor3LightsOn ? "LAMPORNA LYSER" : "HITTA KNAPPEN" };
  }
  const exitSteps = Number(state.inventory.hasHammer) + Number(state.missions.exit.boardsBroken);
  return {
    value: exitSteps,
    total: 2,
    text: !state.inventory.hasHammer ? "HITTA HAMMAREN" : state.missions.exit.boardsBroken ? "GÅ UT GENOM EXIT" : "SLÅ SÖNDER PLANKORNA",
  };
}

function updateMissionList() {
  if (!missionList) return;
  missionList.replaceChildren();
  MISSION_INFO.forEach((mission, index) => {
    const number = index + 1;
    const item = document.createElement("li");
    const completed = number < state.activeMission || (number === 5 && state.won);
    item.className = completed ? "is-complete" : number === state.activeMission ? "is-active" : "is-locked";
    item.textContent = mission.short;
    missionList.append(item);
  });
}

function updateHud() {
  if (!hudMission) return;
  const mission = MISSION_INFO[state.activeMission - 1] || MISSION_INFO[4];
  const progress = missionProgress();
  if (hudMissionNumber) hudMissionNumber.textContent = `UPPDRAG ${state.activeMission} AV ${MISSION_INFO.length}`;
  hudMission.textContent = mission.title;
  hudProgress.textContent = progress.text;
  hudFloor.textContent = `${state.player.floor} / ${FLOOR_COUNT}`;
  updateMissionList();
}

function showMessage(text, seconds = 2.5) {
  if (!hudMessage) return;
  hudMessage.textContent = text;
  hudMessage.hidden = false;
  messageTimer = seconds;
}

function updatePrompt(dt) {
  if (messageTimer > 0) {
    messageTimer = Math.max(0, messageTimer - dt);
    if (messageTimer > 0) return;
  }
  if (state.mode === "playing" && state.nearby) {
    hudMessage.textContent = state.nearby.type === "door"
      ? `TA SAK · ÖPPNA ${state.nearby.name}`
      : `TA SAK · ${state.nearby.name}`;
    hudMessage.hidden = false;
  } else {
    hudMessage.hidden = true;
  }
}

function setModeUi() {
  const playing = state.mode === "playing";
  introOverlay.hidden = state.mode !== 'intro';
  startOverlay.hidden = state.mode !== "menu";
  gameHud.hidden = !playing;
  if (crosshair) crosshair.hidden = !playing;
  if (gameNav) gameNav.hidden = !playing;
  touchControls.hidden = !(playing && touchDevice && !state.elevatorOpen);
  if (elevatorOverlay) elevatorOverlay.hidden = !state.elevatorOpen;
  if (winOverlay) winOverlay.hidden = state.mode !== "won";
  updateActorVisibility();
}

function resetInputs() {
  keysDown.clear();
  actions.sprint = false;
  actions.jumpQueued = false;
  touch.stickId = null;
  touch.lookId = null;
  touch.x = 0;
  touch.y = 0;
  if (touchKnob) touchKnob.style.transform = "translate(-50%, -50%)";
}

function resetGame(seed = 333) {
  clearEnding();
  state = freshState(seed);
  messageTimer = 0;
  resetInputs();
  closeElevator();
  buildFloor(1);
  setModeUi();
  updateCamera(true);
  render();
}

function startGame() {
  clearEnding();
  const seed = state.seed || 333;
  state = freshState(seed);
  state.mode = "playing";
  resetInputs();
  buildFloor(1);
  setModeUi();
  showMessage("UPPDRAG 1 · HITTA DE GULA LAMPORNA", 3.2);
  canvas.focus({ preventScroll: true });
  updateCamera(true);
  render();
}

function startIntro() {
  resetGame(state.seed || 333);
  introFilm ||= createFactoryIntro(buildPlayerModel);
  introElapsed = 0;
  state.mode = 'intro';
  introFilm.update(0);
  introCaption.textContent = 'MITT I NATTEN';
  setModeUi();
  canvas.focus({ preventScroll: true });
  render();
}

function returnToMenu() {
  clearEnding();
  const seed = state.seed || 333;
  state = freshState(seed);
  state.mode = "menu";
  resetInputs();
  buildFloor(1);
  setModeUi();
  updateCamera(true);
  render();
}

function clearEnding() {
  endingFilm?.dispose();
  endingFilm = null;
  endingElapsed = 0;
  endingFrames = [];
  lastEndingSample = -Infinity;
}

function recordEndingFrame(force = false) {
  if (state.mode !== 'playing' || state.player.floor !== 6) return;
  const t = state.elapsedMs / 1000;
  if (!force && t - lastEndingSample < 0.1) return;
  const p = state.player, m = state.monsters.find(monster => monster.kind === 'faceless');
  endingFrames.push({ t, x:p.x, y:p.y, z:p.z, yaw:p.yaw, moving:p.moving,
    grounded:p.grounded, supportId:p.supportId, boardsBroken:state.missions.exit.boardsBroken,
    mx:m.x, my:monsterWorldY(m), mz:m.z, mh:m.heading });
  lastEndingSample = t;
  // Bound memory without discarding the start of a long successful run.
  if (endingFrames.length > 12000) endingFrames = endingFrames.filter((_, index) => index % 2 === 0);
}

function winGame() {
  if (state.won) return;
  recordEndingFrame(true);
  state.won = true;
  endingFilm = createFactoryEnding({world:worldRoot,lights:[hemisphereLight,keyLight,fillLight,ambientLight],
    fog:{color:scene.fog.color.getHex()},frames:endingFrames,buildPlayer:buildPlayerModel,buildMonster:createFacelessMonster});
  endingElapsed = 0;
  state.mode = "ending";
  state.missions.exit.exited = true;
  state.missions.exit.complete = true;
  closeElevator();
  resetInputs();
  setModeUi();
}

function caughtByMonster(monster) {
  if (state.mode !== "playing") return;
  state.caughtBy = monster.id;
  returnToMenu();
}

function completeMission(number) {
  if (number === 1) state.missions.lamps.complete = true;
  if (number === 2) state.missions.levers.complete = true;
  if (number === 3) state.missions.keys.complete = true;
  if (number === 4) state.missions.floor3Lights.complete = true;
  if (number < 5) state.activeMission = number + 1;
  buildFloor(state.player.floor);
  showMessage(number === 4 ? "UPPDRAG 4 KLART · HITTA HAMMAREN" : `UPPDRAG ${number} KLART · UPPDRAG ${number + 1} BÖRJAR`, 3.5);
}

function findNearbyInteractable() {
  let best = null;
  let bestDistance = Infinity;
  interactables.forEach((item) => {
    if (item.floor !== state.player.floor) return;
    const distance = distance2D(state.player.x, state.player.z, item.x, item.z);
    if (distance <= (item.radius || INTERACT_RANGE) && distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  });
  state.nearby = best ? { ...best, distance: Number(bestDistance.toFixed(2)) } : null;
  return best;
}

function changeFloor(targetFloor, method = "elevator") {
  if (targetFloor < 1 || targetFloor > FLOOR_COUNT) return false;
  if (targetFloor === 3 && !state.factory.floor3Unlocked) {
    showMessage("VÅNING 3 ÄR LÅST · HITTA 5 NYCKLAR", 3.0);
    return false;
  }
  const previousFloor = state.player.floor;
  state.player.floor = targetFloor;
  state.player.y = 0;
  state.player.vy = 0;
  state.player.grounded = true;
  state.player.supportId = null;
  state.player.autoJump = null;
  if (method === "elevator") {
    state.player.x = 0;
    state.player.z = 38.5;
  } else if (targetFloor > previousFloor) {
    state.player.x = -32;
    state.player.z = 35;
  } else {
    state.player.x = -43;
    state.player.z = 35;
  }
  const plan = FLOOR_PLANS[targetFloor];
  if (plan) {
    const entrance = method === 'elevator' && plan.elevators.length ? plan.elevators[0]
      : plan.stairs[targetFloor > previousFloor ? 'down' : 'up'] || plan.stairs.down;
    if (entrance) {
      state.player.x = entrance.x;
      state.player.z = entrance.z - Math.cos(entrance.rotation || 0) * 8;
      state.player.yaw = entrance.rotation || 0;
    }
  }
  if (targetFloor === 6 && previousFloor !== 6) {
    endingFrames = [];
    lastEndingSample = -Infinity;
    Object.assign(state.player, FLOOR_PLANS[6].playerSpawn);
    state.factory.floor6Visited = true;
    const monster = state.monsters.find(item => item.kind === 'faceless');
    Object.assign(monster, FLOOR_PLANS[6].monsterSpawn, {
      floor: 6, ai: 'patrol', surface: 'floor', baseY: 0, supportId: null,
      stairRoute: null, stairY: 0, floorRoamTimer: 18, lostTime: 0,
    });
    chooseMonsterTarget(monster);
  }
  closeElevator();
  buildFloor(targetFloor);
  if (targetFloor === 6) recordEndingFrame(true);
  showMessage(`VÅNING ${targetFloor} · ${FLOOR_THEMES[targetFloor - 1].name}`, 2.6);
  return true;
}

function populateElevatorButtons() {
  if (!elevatorFloorButtons) return;
  elevatorFloorButtons.replaceChildren();
  for (let floor = 1; floor <= FLOOR_COUNT; floor += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "elevator-floor-button";
    button.textContent = String(floor);
    button.dataset.floor = String(floor);
    button.disabled = floor === state.player.floor || (floor === 3 && !state.factory.floor3Unlocked);
    if (floor === 3 && !state.factory.floor3Unlocked) button.setAttribute("aria-label", "Våning 3 är låst");
    button.addEventListener("click", () => changeFloor(floor, "elevator"));
    elevatorFloorButtons.append(button);
  }
}

function openElevator() {
  if (!state.factory.elevatorsPowered) {
    showMessage("HISSEN HAR INGEN STRÖM · DRA I 5 SPAKAR", 3.0);
    return false;
  }
  state.elevatorOpen = true;
  populateElevatorButtons();
  setModeUi();
  return true;
}

function closeElevator() {
  state.elevatorOpen = false;
  if (elevatorOverlay) elevatorOverlay.hidden = true;
  if (state.mode === "playing") touchControls.hidden = !touchDevice;
}

function interact() {
  if (state.mode !== "playing" || state.elevatorOpen) return false;
  const item = findNearbyInteractable();
  if (!item) {
    showMessage("INGET ATT TA HÄR", 1.3);
    return false;
  }

  if (item.type === 'locked-entrance') {
    showMessage('INGÅNGEN ÄR LÅST · DU MÅSTE HITTA EXIT', 3);
    return false;
  }
  if (item.type === "door") {
    const door = doorways.find((entry) => entry.id === item.id);
    if (!door) return false;
    state.doorOpenUntil[door.id] = state.elapsedMs + DOOR_OPEN_MS;
    setDoorOpen(door, true);
    showMessage("DÖRREN ÖPPEN", 1.2);
    return true;
  }

  if (item.type === "lamp") {
    if (state.activeMission !== 1) return false;
    if (state.inventory.carryingLampId) {
      showMessage("DU BÄR REDAN EN LAMPA · GÅ TILL ELUTTAGEN", 2.4);
      return false;
    }
    state.missions.lamps.collectedIds.push(item.id);
    state.inventory.carryingLampId = item.id;
    buildFloor(state.player.floor);
    showMessage("LAMPA HITTAD · TA DEN TILL ETT TOMT ELUTTAG", 2.5);
    return true;
  }

  if (item.type === "socket") {
    if (!state.inventory.carryingLampId) {
      showMessage("HITTA EN GUL LAMPA FÖRST", 2.0);
      return false;
    }
    if (!state.missions.lamps.installedSocketIds.includes(item.id)) {
      state.missions.lamps.installedSocketIds.push(item.id);
      state.inventory.carryingLampId = null;
      const complete = state.missions.lamps.installedSocketIds.length === LAMP_TARGET_COUNT;
      if (complete) completeMission(1);
      else {
        buildFloor(state.player.floor);
        showMessage(`${state.missions.lamps.installedSocketIds.length} AV ${LAMP_TARGET_COUNT} LAMPOR PÅ PLATS`, 2.2);
      }
      return true;
    }
  }

  if (item.type === "lever") {
    if (state.activeMission !== 2 || state.missions.levers.pulledIds.includes(item.id)) return false;
    state.missions.levers.pulledIds.push(item.id);
    if (state.missions.levers.pulledIds.length === 5) {
      state.factory.elevatorsPowered = true;
      completeMission(2);
    } else {
      buildFloor(state.player.floor);
      showMessage(`${state.missions.levers.pulledIds.length} AV 5 SPAKAR DRAGNA`, 2.1);
    }
    return true;
  }

  if (item.type === "key") {
    if (state.activeMission !== 3 || state.missions.keys.collectedIds.includes(item.id)) return false;
    state.missions.keys.collectedIds.push(item.id);
    if (state.missions.keys.collectedIds.length === 5) {
      state.factory.floor3Unlocked = true;
      completeMission(3);
    } else {
      buildFloor(state.player.floor);
      showMessage(`${state.missions.keys.collectedIds.length} AV 5 NYCKLAR HITTADE`, 2.1);
    }
    return true;
  }

  if (item.type === "light-switch") {
    if (state.activeMission !== 4) return false;
    state.factory.floor3LightsOn = true;
    state.missions.floor3Lights.switchPressed = true;
    completeMission(4);
    return true;
  }

  if (item.type === "hammer") {
    if (state.activeMission !== 5) return false;
    state.inventory.hasHammer = true;
    state.missions.exit.hammerCollected = true;
    buildFloor(state.player.floor);
    showMessage("HAMMAREN HITTAD · EXIT FINNS PÅ VÅNING 6", 3.0);
    return true;
  }

  if (item.type === "boards") {
    if (!state.inventory.hasHammer) {
      showMessage("DU BEHÖVER HAMMAREN", 2.2);
      return false;
    }
    recordEndingFrame(true);
    state.missions.exit.boardsBroken = true;
    state.factory.exitBoards = "broken";
    buildFloor(state.player.floor);
    recordEndingFrame(true);
    showMessage("PLANKORNA ÄR BORTA · GÅ UT GENOM EXIT", 3.0);
    return true;
  }

  if (item.type === "exit") {
    if (state.missions.exit.boardsBroken) winGame();
    return true;
  }

  if (item.type === "elevator") return openElevator();
  if (item.type === "stair-up" || item.type === "stair-down") return changeFloor(item.targetFloor, "stairs");
  return false;
}

const PATROL_POINTS = [
  [-42, -39], [-8, -36], [36, -38], [42, -7], [39, 35],
  [8, 38], [-38, 34], [-43, 2], [-9, -8], [12, 9], [32, -5], [-30, 8],
];

function chooseMonsterTarget(monster) {
  const candidates = monster.floor === 3 ? [[-10,-32],[8,-9],[-19,-9],[29,8],[29,26],[10,39]]
    : monster.floor === 4 ? [[-23,-26],[12,-36],[23,-9],[24,26],[0,37],[-22,26],[-24,0],[0,4]]
    : monster.floor === 6 ? [[10,14],[-8,28],[-30,21],[-40,-6],[-6,37],[29,32],[29,14],[29,-16]] : PATROL_POINTS;
  const points = candidates.filter(([x, z]) => !nearElevator(monster.floor, x, z));
  monster.waypoint = (monster.waypoint + 1) % points.length;
  const point = points[(monster.waypoint + MONSTER_STARTS.findIndex((item) => item.id === monster.id) * 3) % points.length];
  monster.targetX = point[0];
  monster.targetZ = point[1];
}

function monsterMovementSpeed(monster) {
  return monster.kind === "faceless" ? FACELESS_SPEED : WALK_SPEED;
}

function monsterCanJump(monster) {
  return monster.kind === "eight-legs";
}

function monsterCanUseSurface(monster, surface) {
  return ["floor", "wall", "ceiling"].includes(surface)
    && (surface === "floor" || monster.kind === "eight-legs" && !isBlankVoid(monster.floor, monster.x, monster.z));
}

function setMonsterSurfaceState(monster, surface) {
  if (!monsterCanUseSurface(monster, surface)) return false;
  if (surface !== "floor" && monster.jumping) return false;
  monster.surface = surface;
  if (surface !== "floor") landMonsterJump(monster, 0.55);
  return true;
}

function landMonsterJump(monster, cooldown = monster.jumpCooldown) {
  monster.jumpY = 0;
  monster.jumpVelocity = 0;
  monster.jumping = false;
  monster.jumpGrounded = true;
  monster.jumpCooldown = Math.max(0, cooldown || 0);
}

function triggerMonsterJump(monster) {
  const stairBlocksJump = monster.stairRoute && !(FLOOR_PLANS[monster.floor]?.blankIsVoid && monster.stairRoute.phase === 'approach');
  if (!monsterCanJump(monster) || stairBlocksJump || monster.surface !== "floor" || monster.jumping) return false;
  monster.jumpVelocity = SPIDER_JUMP_SPEED;
  monster.jumping = true;
  monster.jumpGrounded = false;
  monster.supportId = null;
  monster.jumpCooldown = monster.ai === "chase" ? SPIDER_CHASE_JUMP_INTERVAL : SPIDER_PATROL_JUMP_INTERVAL;
  return true;
}

function updateMonsterJump(monster, dt) {
  if (!monsterCanJump(monster)) return;
  const onStairSteps = monster.stairRoute && !(FLOOR_PLANS[monster.floor]?.blankIsVoid && monster.stairRoute.phase === 'approach');
  if (onStairSteps || monster.surface !== "floor") {
    landMonsterJump(monster, Math.max(monster.jumpCooldown, 0.55));
    return;
  }
  monster.jumpCooldown = Math.max(0, monster.jumpCooldown - dt);
  if (!monster.jumping) {
    const support = floorSupportAt(monster.floor, monster.x, monster.z, (monster.baseY || 0) + 0.1);
    if (support && Math.abs(support.y - (monster.baseY || 0)) < 0.25) {
      monster.baseY = support.y; monster.supportId = support.id;
    } else if ((monster.baseY || 0) > 0) {
      monster.jumpY = monster.baseY; monster.baseY = 0;
      monster.jumping = true; monster.jumpVelocity = 0; monster.supportId = null;
    }
  }
  // On the new pit floor, jump only with a real landing target. Random hops
  // cannot create an invisible floor above the white areas.
  if (!monster.jumping && monster.jumpCooldown <= 0 && !FLOOR_PLANS[monster.floor]?.blankIsVoid) triggerMonsterJump(monster);
  if (!monster.jumping) return;
  const previousHeight = (monster.baseY || 0) + monster.jumpY;
  monster.jumpVelocity -= SPIDER_JUMP_GRAVITY * dt;
  monster.jumpY += monster.jumpVelocity * dt;
  if (monster.jumpVelocity <= 0) {
    const support = floorSupportAt(monster.floor, monster.x, monster.z, previousHeight + 0.08);
    if (support && (monster.baseY || 0) + monster.jumpY <= support.y) {
      monster.baseY = support.y; monster.supportId = support.id;
      monster.platformJump = null;
      landMonsterJump(monster, monster.ai === 'chase' ? SPIDER_CHASE_JUMP_INTERVAL : SPIDER_PATROL_JUMP_INTERVAL);
      return;
    }
  }
  if (monster.jumpY <= 0 && !FLOOR_PLANS[monster.floor]?.blankIsVoid) landMonsterJump(monster, monster.ai === "chase" ? SPIDER_CHASE_JUMP_INTERVAL : SPIDER_PATROL_JUMP_INTERVAL);
  if (FLOOR_PLANS[monster.floor]?.blankIsVoid && monsterWorldY(monster) < -3.5) {
    // A missed landing is not permission to walk on air. Return to the same
    // launch surface, including its new position if it is a moving platform.
    let safe = monster.platformJump?.launch || { x: -10, z: -32, y: 0 };
    const launchSurface = spiderSupportSurfaces(monster).find(surface => surface.id === safe.surfaceId);
    if (launchSurface) safe = { x: launchSurface.x + safe.offsetX, z: launchSurface.z + safe.offsetZ, y: launchSurface.y || 0 };
    monster.x = safe.x; monster.z = safe.z; monster.baseY = safe.y;
    monster.platformJump = null; monster.supportId = null; landMonsterJump(monster, 1);
  }
}

function monsterAllowedFloors(monster) {
  // After the first floor-six arrival, SNABBIS stays there until a new game.
  if (monster.kind === 'faceless' && state.factory.floor6Visited) return [6, 6];
  return MONSTER_FLOOR_RANGES[monster.kind] || [1, FLOOR_COUNT];
}

function monsterCanEnterFloor(monster, targetFloor) {
  if (monster.kind === 'faceless' && targetFloor === 6 && !state.factory.floor6Visited) return false;
  const [minimumFloor, maximumFloor] = monsterAllowedFloors(monster);
  return targetFloor >= minimumFloor && targetFloor <= maximumFloor;
}

function monsterStairWaypoints(direction, floor = 1) {
  const stair = stairLocation(floor, direction > 0 ? 'up' : 'down');
  return [{ x: stair.x, z: stair.z - Math.cos(stair.rotation || 0) * 7 },
    { x: stair.x, z: stair.z - Math.cos(stair.rotation || 0) * 3.6 }];
}

function monsterStairSurfaceHeight(progress) {
  const stepIndex = clamp(Math.round(clamp(progress, 0, 1) * (STAIR_STEP_COUNT - 1)), 0, STAIR_STEP_COUNT - 1);
  return Math.min(STAIR_HEIGHT, STAIR_STEP_RISE * (stepIndex + 1));
}

function beginMonsterStairTravel(monster, targetFloor, reason = "patrol") {
  if (monster.stairRoute || monster.stairCooldown > 0 || monster.jumping) return false;
  if (Math.abs(targetFloor - monster.floor) !== 1 || !monsterCanEnterFloor(monster, targetFloor)) return false;
  const direction = Math.sign(targetFloor - monster.floor);
  monster.stairRoute = {
    direction,
    targetFloor,
    reason,
    phase: "approach",
    waypointIndex: 0,
    waypoints: monsterStairWaypoints(direction, monster.floor),
    location: stairLocation(monster.floor, direction > 0 ? 'up' : 'down'),
    progress: 0,
    stuckTime: 0,
  };
  monster.surface = "floor";
  landMonsterJump(monster, 0.8);
  monster.stairY = 0;
  return true;
}

function chooseMonsterPatrolFloor(monster) {
  const index = MONSTER_STARTS.findIndex((item) => item.id === monster.id);
  const [minimumFloor, maximumFloor] = monsterAllowedFloors(monster);
  const preferredDirection = monster.floor <= minimumFloor
    ? 1
    : monster.floor >= maximumFloor
      ? -1
      : (monster.waypoint + index) % 2 === 0 ? 1 : -1;
  for (const direction of [preferredDirection, -preferredDirection]) {
    if (beginMonsterStairTravel(monster, monster.floor + direction, "patrol")) return true;
  }
  monster.floorRoamTimer = 5;
  return false;
}

function finishMonsterStairTravel(monster) {
  const route = monster.stairRoute;
  if (!route) return;
  const previousFloor = monster.floor;
  monster.floor = route.targetFloor;
  monster.x = route.direction > 0 ? STAIR_DOWN_X : STAIR_UP_X;
  monster.z = 35;
  const arrival = stairLocation(monster.floor, route.direction > 0 ? 'down' : 'up');
  monster.x = arrival.x;
  monster.z = arrival.z - Math.cos(arrival.rotation || 0) * 8;
  monster.baseY = 0;
  monster.supportId = null;
  monster.stairY = 0;
  monster.stairRoute = null;
  monster.stairCooldown = 1.8;
  monster.floorRoamTimer = 11 + MONSTER_STARTS.findIndex((item) => item.id === monster.id) * 2;
  monster.surface = "floor";
  landMonsterJump(monster, 0.8);
  if (route.reason === "patrol" || previousFloor === monster.floor) monster.ai = "patrol";
  chooseMonsterTarget(monster);
}

function advanceMonsterStairTravel(monster, dt) {
  const route = monster.stairRoute;
  if (!route) return false;
  const speed = monsterMovementSpeed(monster);
  if (route.phase === "approach") {
    const target = route.waypoints[route.waypointIndex];
    const beforeX = monster.x;
    const beforeZ = monster.z;
    moveMonsterToward(monster, target.x, target.z, speed, dt);
    const moved = distance2D(beforeX, beforeZ, monster.x, monster.z);
    if (moved < Math.min(0.02, speed * dt * 0.1) && distance2D(monster.x, monster.z, target.x, target.z) >= 0.72) {
      route.stuckTime += dt;
      if (route.stuckTime >= 1) {
        monster.pathTimer = 0;
        monster.path = [];
        route.stuckTime = 0;
      }
    } else {
      route.stuckTime = 0;
    }
    if (distance2D(monster.x, monster.z, target.x, target.z) < 0.72) {
      route.waypointIndex += 1;
      if (route.waypointIndex >= route.waypoints.length) {
        if (route.direction < 0) {
          finishMonsterStairTravel(monster);
          return true;
        }
        route.phase = "climb";
        route.progress = 0;
        monster.x = route.location.x;
        monster.z = route.location.z - Math.cos(route.location.rotation || 0) * 3.6;
        monster.stairY = monsterStairSurfaceHeight(0);
        monster.heading = route.location.rotation || 0;
      }
    }
    return true;
  }

  const stairDistance = STAIR_TOP_Z - STAIR_ENTRY_Z;
  route.progress = clamp(route.progress + dt * speed / stairDistance, 0, 1);
  monster.z = route.location.z + Math.cos(route.location.rotation || 0) * (-3.6 + stairDistance * route.progress);
  monster.stairY = monsterStairSurfaceHeight(route.progress);
  if (route.progress >= 1) finishMonsterStairTravel(monster);
  return true;
}

function monsterCanSeePlayer(monster) {
  if (monster.floor !== state.player.floor) return false;
  if (nearElevator(state.player.floor, state.player.x, state.player.z)) return false;
  if (typeof monster.visionOverride === "boolean") return monster.visionOverride;
  const dx = state.player.x - monster.x;
  const dz = state.player.z - monster.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 24) return false;
  if (lineBlocked(monster.x, monster.z, state.player.x, state.player.z)) return false;
  if (distance < 5.5 || monster.ai === "chase") return true;
  const facingX = Math.sin(monster.heading);
  const facingZ = Math.cos(monster.heading);
  return (facingX * dx + facingZ * dz) / Math.max(0.001, distance) > 0.12;
}

function monsterNavigationHeight(monster, x, z) {
  if (nearElevator(monster.floor, x, z)) return null;
  if (monster.floor === state.player.floor && collidesAt(x, z, monster.kind === 'eight-legs' ? 0.98 : 0.76)) return null;
  const support = floorSupportAt(monster.floor, x, z);
  return support ? support.y : null;
}

function monsterDirectPath(monster, x, z) {
  const length = distance2D(monster.x, monster.z, x, z);
  let height = monster.baseY || 0;
  for (let distance = 0.5; distance <= length + 0.5; distance += 0.5) {
    const t = Math.min(1, distance / Math.max(0.001, length));
    const next = monsterNavigationHeight(monster, monster.x + (x - monster.x) * t, monster.z + (z - monster.z) * t);
    if (next === null || next - height > (monsterCanJump(monster) ? 1.25 : 0.35)) return false;
    height = next;
  }
  return true;
}

function beginHoleCrossing(monster, targetX, targetZ) {
  if (monster.kind !== 'eight-legs' || monster.floor !== 4 || monster.surface !== 'floor' || monster.holeCrossing || monster.jumping || monster.stairRoute) return false;
  for (const hole of FLOOR_PLANS[4].holes) {
    const box = { minX: hole.x - hole.w / 2, maxX: hole.x + hole.w / 2, minZ: hole.z - hole.d / 2, maxZ: hole.z + hole.d / 2 };
    if (!segmentHitsBox(monster.x, monster.z, targetX, targetZ, box) || distance2D(monster.x, monster.z, hole.x, hole.z) > 22) continue;
    const south = targetZ > hole.z;
    monster.holeCrossing = {
      phase: 'approach', height: 0,
      entry: { x: box.minX - (hole.id.includes('west') ? -1.6 : 1.6), z: south ? box.minZ - 1.7 : box.maxZ + 1.7 },
      exit: { x: hole.x, z: south ? box.maxZ + 1.7 : box.minZ - 1.7 },
    };
    monster.path = []; monster.pathTimer = 0;
    return true;
  }
  return false;
}

function advanceHoleCrossing(monster, dt) {
  const route = monster.holeCrossing;
  if (!route) return false;
  const speed = monsterMovementSpeed(monster);
  if (route.phase === 'approach') {
    moveMonsterToward(monster, route.entry.x, route.entry.z, speed, dt, false);
    if (distance2D(monster.x, monster.z, route.entry.x, route.entry.z) < 0.8) {
      route.phase = 'rise'; monster.surface = 'wall'; landMonsterJump(monster, 1);
      monster.baseY = 0; monster.supportId = null;
    }
  } else if (route.phase === 'rise') {
    route.height = Math.min(CEILING_HEIGHT - 0.25, route.height + speed * dt);
    if (route.height >= CEILING_HEIGHT - 0.25) { route.phase = 'cross'; monster.surface = 'ceiling'; }
  } else if (route.phase === 'cross') {
    const dx = route.exit.x - monster.x, dz = route.exit.z - monster.z, distance = Math.hypot(dx, dz);
    const step = Math.min(distance, speed * dt);
    if (crossesElevatorArea(monster, monster.x + dx / Math.max(distance, 0.001) * step, monster.z + dz / Math.max(distance, 0.001) * step)) {
      monster.holeCrossing = null;
      chooseMonsterTarget(monster);
      return true;
    }
    monster.x += dx / Math.max(distance, 0.001) * step;
    monster.z += dz / Math.max(distance, 0.001) * step;
    monster.heading = Math.atan2(dx, dz);
    if (distance < 0.15) { route.phase = 'lower'; monster.surface = 'wall'; }
  } else {
    route.height = Math.max(0, route.height - speed * dt);
    if (route.height <= 0) { monster.holeCrossing = null; monster.surface = 'floor'; monster.baseY = 0; monster.pathTimer = 0; }
  }
  return true;
}

function spiderSupportSurfaces(monster) {
  const plan = FLOOR_PLANS[monster.floor];
  return [...plan.ground, ...plan.platforms.map(definition => ({
    ...definition, ...platformPose(definition, state.elapsedMs / 1000),
    docks: [definition.from, definition.to].filter(Boolean).map(pose => ({ ...definition, ...pose })),
  }))];
}

function moveSpiderOnPitFloor(monster, targetX, targetZ, speed, dt) {
  const surfaces = spiderSupportSurfaces(monster);
  const move = (point, bounds = null) => {
    if (bounds && crossesElevatorArea(monster, point.x, point.z)) {
      const route = findRoute(monster, point, (x, z) => insideRect(x, z, bounds, 0.15) && !nearElevator(monster.floor, x, z) ? bounds.y || 0 : null);
      point = route.find(p => distance2D(monster.x, monster.z, p.x, p.z) > 0.2) || monster;
    }
    const dx = point.x - monster.x, dz = point.z - monster.z, d = Math.hypot(dx, dz);
    const step = Math.min(d, speed * dt);
    if (crossesElevatorArea(monster, monster.x + dx / Math.max(d, 0.001) * step, monster.z + dz / Math.max(d, 0.001) * step)) return d;
    if (d > 0.001) {
      monster.x += dx / d * step; monster.z += dz / d * step;
      monster.heading = Math.atan2(dx, dz);
    }
    if (bounds) {
      monster.x = clamp(monster.x, bounds.x - bounds.w / 2 + 0.15, bounds.x + bounds.w / 2 - 0.15);
      monster.z = clamp(monster.z, bounds.z - bounds.d / 2 + 0.15, bounds.z + bounds.d / 2 - 0.15);
    }
    return d;
  };
  if (monster.platformJump && monster.jumping) {
    const target = surfaces.find(s => s.id === monster.platformJump.toId);
    if (target) move({ x: target.x + monster.platformJump.offsetX, z: target.z + monster.platformJump.offsetZ });
    return distance2D(monster.x, monster.z, targetX, targetZ);
  }
  if (monster.jumping) return distance2D(monster.x, monster.z, targetX, targetZ);
  const current = surfaces.filter(s => insideRect(monster.x, monster.z, s) && Math.abs((s.y || 0) - (monster.baseY || 0)) < 0.3)
    .sort((a, b) => (b.y || 0) - (a.y || 0))[0];
  if (!current) return distance2D(monster.x, monster.z, targetX, targetZ);
  const distanceTo = surface => Math.hypot(Math.max(0, Math.abs(targetX - surface.x) - surface.w / 2), Math.max(0, Math.abs(targetZ - surface.z) - surface.d / 2));
  const destination = [...surfaces].sort((a, b) => distanceTo(a) - distanceTo(b) || (b.y || 0) - (a.y || 0))[0];
  if (destination.id === current.id) return move({ x: targetX, z: targetZ }, current);
  // Return to the floor before making an allowed platform jump. A wall or
  // ceiling route may never bypass one of the newly added pits.
  monster.surface = 'floor';
  const path = findSurfaceRoute(surfaces, current.id, destination.id);
  if (!path.length) return distance2D(monster.x, monster.z, targetX, targetZ);
  const next = surfaces.find(s => s.id === path[0]);
  const actual = rectangleConnection(current, next, monster);
  const possible = [next, ...(next.docks || [])].map(pose => rectangleConnection(current, pose, monster))
    .sort((a, b) => a.distance - b.distance)[0];
  const ready = actual.distance <= 3.1 && (next.y || 0) - (current.y || 0) <= 0.85;
  const connection = ready ? actual : possible;
  move(connection.from, current);
  if (!ready || distance2D(monster.x, monster.z, connection.from.x, connection.from.z) > 0.09 || monster.jumpCooldown > 0) return 1;
  if (actual.distance < 0.05 && Math.abs((next.y || 0) - (current.y || 0)) < 0.2) {
    return move({ x: next.x, z: next.z }, next);
  }
  const launch = { x: monster.x, z: monster.z, y: monster.baseY || 0, surfaceId: current.id,
    offsetX: monster.x - current.x, offsetZ: monster.z - current.z };
  if (triggerMonsterJump(monster)) monster.platformJump = {
    toId: next.id, offsetX: actual.to.x - next.x, offsetZ: actual.to.z - next.z, launch,
  };
  return 1;
}

function moveMonsterToward(monster, targetX, targetZ, speed, dt, allowCrossing = true) {
  if (nearElevator(monster.floor, targetX, targetZ)) {
    chooseMonsterTarget(monster);
    targetX = monster.targetX; targetZ = monster.targetZ;
  }
  if (monster.kind === 'eight-legs' && FLOOR_PLANS[monster.floor]?.blankIsVoid) {
    return moveSpiderOnPitFloor(monster, targetX, targetZ, speed, dt);
  }
  const sameFloor = monster.floor === state.player.floor;
  if (sameFloor && allowCrossing && beginHoleCrossing(monster, targetX, targetZ)) return 1;
  if (crossesElevatorArea(monster, targetX, targetZ) || (sameFloor || FLOOR_PLANS[monster.floor]?.blankIsVoid) && monster.surface === 'floor' && !monsterDirectPath(monster, targetX, targetZ)) {
    monster.pathTimer = (monster.pathTimer || 0) - dt;
    if (!Array.isArray(monster.path) || monster.pathTimer <= 0) {
      monster.path = findRoute(monster, { x: targetX, z: targetZ }, (x, z) => monsterNavigationHeight(monster, x, z), monsterCanJump(monster) ? 1.25 : 0.4);
      monster.pathTimer = 1;
    }
    while (monster.path.length && distance2D(monster.x, monster.z, monster.path[0].x, monster.path[0].z) < 0.4) monster.path.shift();
    if (monster.path.length) { targetX = monster.path[0].x; targetZ = monster.path[0].z; }
    else return distance2D(monster.x, monster.z, targetX, targetZ);
  } else monster.path = [];
  const dx = targetX - monster.x;
  const dz = targetZ - monster.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return distance;
  const heading = Math.atan2(dx, dz);
  monster.heading = normalizeAngle(heading);
  const step = Math.min(distance, speed * dt);
  const beforeX = monster.x;
  const beforeZ = monster.z;
  const stepX = dx / distance * step;
  const stepZ = dz / distance * step;
  if (crossesElevatorArea(monster, monster.x + stepX, monster.z + stepZ)) { monster.pathTimer = 0; return distance; }
  if (FLOOR_PLANS[monster.floor]?.blankIsVoid) {
    if (monster.surface !== 'floor' && isBlankVoid(monster.floor, monster.x + stepX, monster.z + stepZ)) return distance;
    const nextSupport = floorSupportAt(monster.floor, monster.x + stepX, monster.z + stepZ, monsterWorldY(monster) + 0.35);
    if (!nextSupport) return distance;
    if (!sameFloor) { monster.baseY = nextSupport.y; monster.supportId = nextSupport.id; }
  }
  if (sameFloor) {
    if (monster.surface === 'floor') {
      const support = supportAt(monster.x + stepX, monster.z + stepZ, monsterWorldY(monster) + 0.35, true);
      if (!support) return distance;
      if (monster.kind !== 'eight-legs') { monster.baseY = support.y; monster.supportId = support.id; }
      else if (!monster.jumping && support.y - (monster.baseY || 0) > 0.3) triggerMonsterJump(monster);
    }
    moveWithCollisions(monster, stepX, stepZ, monster.kind === "eight-legs" ? 0.95 : 0.72);
  } else {
    monster.x += stepX;
    monster.z += stepZ;
  }
  if (!monster.stairRoute && Math.hypot(monster.x - beforeX, monster.z - beforeZ) < step * 0.18) chooseMonsterTarget(monster);
  return distance;
}

function updateSpiderSurface(monster, dt) {
  if (monster.holeCrossing || monster.platformJump || monster.supportId && monster.supportId !== 'ground') return;
  if (monster.jumping) {
    monster.surface = "floor";
    return;
  }
  if (monster.ai === "chase") {
    monster.surface = "floor";
    monster.surfaceTimer = 4;
    return;
  }
  monster.surfaceTimer -= dt;
  if (monster.surfaceTimer > 0) return;
  const nextSurface = monster.surface === "floor" ? "wall" : monster.surface === "wall" ? "ceiling" : "floor";
  if (!monsterCanUseSurface(monster, nextSurface)) return;
  monster.surface = nextSurface;
  monster.surfaceTimer = monster.surface === "ceiling" ? 7 : 5;
  if (monster.surface === "wall") {
    const side = monster.waypoint % 4;
    monster.targetX = side === 0 ? -50 : side === 1 ? 50 : clamp(monster.x, -46, 46);
    monster.targetZ = side === 2 ? -50 : side === 3 ? 50 : clamp(monster.z, -46, 46);
  } else chooseMonsterTarget(monster);
}

function spiderWallSide(monster) {
  const boundary = 50;
  const candidates = [
    { side: "west", distance: Math.min(Math.abs(monster.x + boundary), Math.abs(monster.targetX + boundary)) },
    { side: "east", distance: Math.min(Math.abs(monster.x - boundary), Math.abs(monster.targetX - boundary)) },
    { side: "north", distance: Math.min(Math.abs(monster.z + boundary), Math.abs(monster.targetZ + boundary)) },
    { side: "south", distance: Math.min(Math.abs(monster.z - boundary), Math.abs(monster.targetZ - boundary)) },
  ];
  return candidates.reduce((closest, candidate) => candidate.distance < closest.distance ? candidate : closest).side;
}

function monsterWorldY(monster) {
  if (monster.holeCrossing?.phase !== 'approach' && monster.holeCrossing) return monster.holeCrossing.height;
  if (monster.stairRoute?.phase === "climb") return monster.stairY || 0;
  if (monster.kind === "eight-legs" && monster.ai !== "chase") {
    if (monster.surface === "ceiling") return CEILING_HEIGHT - 0.25;
    if (monster.surface === "wall") return 3.2;
  }
  return (monster.baseY || 0) + (monster.jumpY || 0);
}

function tryMonsterCatch(monster) {
  if (state.mode !== "playing" || monster.floor !== state.player.floor) return false;
  if (nearElevator(state.player.floor, state.player.x, state.player.z)) return false;
  const verticalDistance = Math.abs(monsterWorldY(monster) - state.player.y);
  if (distance2D(monster.x, monster.z, state.player.x, state.player.z) >= 1.35 || verticalDistance >= 1.05) return false;
  caughtByMonster(monster);
  return true;
}

function updateMonsters(dt) {
    state.monsters.forEach((monster) => {
    if (monster.frozen) {
      monster.seesPlayer = false;
      return;
    }

    monster.stairCooldown = Math.max(0, monster.stairCooldown - dt);
    monster.floorRoamTimer -= dt;
    const sameFloor = monster.floor === state.player.floor;
    if (monster.ai === 'chase' && nearElevator(state.player.floor, state.player.x, state.player.z)) {
      monster.ai = 'patrol'; monster.lostTime = 0;
      monster.path = []; monster.pathTimer = 0;
      if (monster.stairRoute?.phase === 'approach') monster.stairRoute = null;
      chooseMonsterTarget(monster);
    }
    if (monster.holeCrossing) { advanceHoleCrossing(monster, dt); tryMonsterCatch(monster); return; }
    if (monster.kind === "eight-legs" && !monster.stairRoute) updateSpiderSurface(monster, dt);

    const sees = sameFloor && monsterCanSeePlayer(monster);
    monster.seesPlayer = sees;
    if (sees) {
      if (monster.stairRoute?.phase === "approach") {
        monster.stairRoute = null;
        monster.stairY = 0;
      }
      monster.ai = "chase";
      if (monster.kind === "eight-legs" && monster.surface !== "floor") {
        monster.surface = "floor";
        landMonsterJump(monster, 0.35);
      }
      monster.lostTime = 0;
      monster.targetX = state.player.x;
      monster.targetZ = state.player.z;
    }

    updateMonsterJump(monster, dt);

    if (monster.stairRoute) {
      advanceMonsterStairTravel(monster, dt);
      tryMonsterCatch(monster);
      return;
    }

    if (!sameFloor && monster.ai === "chase") {
      if (monster.jumping) return;
      if (monster.stairCooldown > 0) return;
      const direction = Math.sign(state.player.floor - monster.floor);
      if (beginMonsterStairTravel(monster, monster.floor + direction, "chase")) {
        advanceMonsterStairTravel(monster, dt);
        tryMonsterCatch(monster);
        return;
      }
      monster.ai = "patrol";
      monster.lostTime = 0;
      chooseMonsterTarget(monster);
    } else if (!sees && monster.ai === "chase") {
      monster.lostTime += dt;
      if (monster.lostTime > 4.5) {
        monster.ai = "patrol";
        monster.lostTime = 0;
        chooseMonsterTarget(monster);
      }
    }

    if (monster.ai === "patrol" && !monster.jumping && monster.stairCooldown <= 0 && monster.floorRoamTimer <= 0) {
      chooseMonsterPatrolFloor(monster);
      if (monster.stairRoute) {
        advanceMonsterStairTravel(monster, dt);
        tryMonsterCatch(monster);
        return;
      }
    }

    const speed = monsterMovementSpeed(monster);
    if (monster.ai === "chase" && sameFloor) {
      moveMonsterToward(monster, state.player.x, state.player.z, speed, dt);
    } else {
      if (distance2D(monster.x, monster.z, monster.targetX, monster.targetZ) < 1.4) chooseMonsterTarget(monster);
      moveMonsterToward(monster, monster.targetX, monster.targetZ, speed, dt);
    }

    tryMonsterCatch(monster);
  });
}

function autoJumpSurfaces(seconds) {
  const plan = FLOOR_PLANS[state.player.floor];
  if (!plan) return [];
  return [...plan.ground, ...(plan.upper || []), ...plan.platforms.map(definition => ({
    ...definition, ...platformPose(definition, seconds),
  }))];
}

function startPlayerAutoJump(velocityX, velocityZ, speed) {
  const player = state.player, length = Math.hypot(velocityX, velocityZ);
  if (!player.grounded || player.autoJump || actions.jumpQueued || length < 0.4) return false;
  const standing = supportAt(player.x, player.z, player.y + 0.08);
  if (!standing || Math.abs(standing.y - player.y) > 0.2) return false;
  const dx = velocityX / length, dz = velocityZ / length;
  const ahead = supportAt(player.x + dx * 0.28, player.z + dz * 0.28, player.y + 0.1);
  // A low S plate can overlap the edge (floor 6). Its side would otherwise
  // stop walking before the player can reach the edge that triggers the jump.
  const lowPlateAhead = platforms.some(p => p.y > player.y + 0.2
    && p.y < player.y + JUMP_SPEED ** 2 / (2 * GRAVITY)
    && insideRect(player.x + dx * 0.28, player.z + dz * 0.28, p, -PLAYER_RADIUS * 0.5));
  if (ahead && Math.abs(ahead.y - player.y) < 0.2 && !lowPlateAhead) return false;

  // Predict a real landing using the ordinary jump height and walk/run speed.
  // Moving S platforms are evaluated where they will be at landing time.
  const plan = FLOOR_PLANS[player.floor];
  if (!plan) return false;
  const forbidden = [...plan.holes, ...(plan.monsterOnly || [])];
  const arcY = t => player.y + JUMP_SPEED * t - GRAVITY * t * (t + FIXED_STEP) / 2;
  for (let t = Math.ceil(JUMP_SPEED / GRAVITY / FIXED_STEP) * FIXED_STEP; t <= 1.3; t += FIXED_STEP) {
    const x = player.x + dx * speed * t, z = player.z + dz * speed * t;
    const surfaces = autoJumpSurfaces(state.elapsedMs / 1000 + t);
    for (const surface of surfaces) {
      if (!insideRect(x, z, surface, 0.4) || arcY(t) > surface.y || arcY(t - FIXED_STEP) < surface.y - 0.02) continue;
      if (surface.y < player.y - 3.3) continue;
      const blocked = forbidden.some(box => segmentHitsBox(player.x, player.z, x, z, {
        minX: box.x - box.w / 2, maxX: box.x + box.w / 2,
        minZ: box.z - box.d / 2, maxZ: box.z + box.d / 2,
      })) || colliders.some(box => segmentHitsBox(player.x, player.z, x, z, box));
      if (blocked) continue;
      player.autoJump = { targetId: surface.id, offsetX: x - surface.x, offsetZ: z - surface.z, remaining: t, speed };
      player.autoJumpCount += 1;
      player.vy = JUMP_SPEED; player.grounded = false; player.supportId = null;
      return true;
    }
  }
  return false;
}

function updatePlayer(dt) {
  if (state.mode !== "playing" || state.elevatorOpen) return;
  let forward = 0;
  let side = 0;
  if (keysDown.has("KeyW") || keysDown.has("ArrowUp")) forward += 1;
  if (keysDown.has("KeyS") || keysDown.has("ArrowDown")) forward -= 1;
  if (keysDown.has("KeyD") || keysDown.has("ArrowRight")) side += 1;
  if (keysDown.has("KeyA") || keysDown.has("ArrowLeft")) side -= 1;
  forward += -touch.y;
  side += touch.x;
  const magnitude = Math.hypot(forward, side);
  if (magnitude > 1) {
    forward /= magnitude;
    side /= magnitude;
  }
  const sprint = keysDown.has("ShiftLeft") || keysDown.has("ShiftRight") || actions.sprint;
  const speed = sprint ? SPRINT_SPEED : WALK_SPEED;
  const sin = Math.sin(state.player.yaw);
  const cos = Math.cos(state.player.yaw);
  let velocityX = (-sin * forward + cos * side) * speed;
  let velocityZ = (-cos * forward - sin * side) * speed;
  startPlayerAutoJump(velocityX, velocityZ, speed);
  const autoJump = state.player.autoJump;
  if (autoJump) {
    const target = autoJumpSurfaces(state.elapsedMs / 1000 + autoJump.remaining).find(surface => surface.id === autoJump.targetId);
    if (target) {
      velocityX = (target.x + autoJump.offsetX - state.player.x) / Math.max(dt, autoJump.remaining);
      velocityZ = (target.z + autoJump.offsetZ - state.player.z) / Math.max(dt, autoJump.remaining);
      const scale = Math.min(1, autoJump.speed / Math.max(0.001, Math.hypot(velocityX, velocityZ)));
      velocityX *= scale; velocityZ *= scale;
    }
    autoJump.remaining = Math.max(0, autoJump.remaining - dt);
  }
  moveWithCollisions(state.player, velocityX * dt, velocityZ * dt);

  state.player.moving = Boolean(autoJump || magnitude > 0.08);
  state.player.sprinting = Boolean((autoJump ? autoJump.speed === SPRINT_SPEED : sprint) && state.player.moving);
  const standing = supportAt(state.player.x, state.player.z, state.player.y + 0.08);
  if (state.player.grounded && (!standing || Math.abs(standing.y - state.player.y) > 0.2)) {
    state.player.grounded = false;
    state.player.supportId = null;
  }
  if (actions.jumpQueued && state.player.grounded) {
    state.player.vy = JUMP_SPEED;
    state.player.grounded = false;
    state.player.supportId = null;
  }
  actions.jumpQueued = false;
  const previousY = state.player.y;
  state.player.vy -= GRAVITY * dt;
  state.player.y += state.player.vy * dt;
  const landing = supportAt(state.player.x, state.player.z, previousY + 0.08);
  if (landing && state.player.vy <= 0 && state.player.y <= landing.y) {
    state.player.y = landing.y;
    state.player.vy = 0;
    state.player.grounded = true;
    state.player.supportId = landing.id;
    state.player.autoJump = null;
  }
  if (state.player.y < -3.5) { returnToMenu(); return; }

  const targetFov = state.player.sprinting ? 78 : 73;
  camera.fov += (targetFov - camera.fov) * clamp(dt * 7, 0, 1);
  camera.updateProjectionMatrix();

  if (state.player.floor === 6 && state.missions.exit.boardsBroken && state.player.z < -52 && Math.abs(state.player.x - 19) < 3.6 && state.player.y >= -0.1) {
    winGame();
  }
}

function updateMonsterModels() {
  state.monsters.forEach((monster, index) => {
    const model = monsterModels.get(monster.id);
    if (!model) return;
    model.visible = (state.mode === "playing" || state.mode === "won") && monster.floor === state.player.floor;
    if (!model.visible) return;
    const climbingStairs = monster.stairRoute?.phase === "climb";
    let height = monsterWorldY(monster);
    model.rotation.set(0, monster.heading, 0);
    if (monster.kind === "eight-legs") {
      if (!climbingStairs && monster.surface === "ceiling" && (monster.ai !== "chase" || monster.holeCrossing)) {
        model.rotation.z = Math.PI;
      } else if (!climbingStairs && monster.surface === "wall" && (monster.ai !== "chase" || monster.holeCrossing)) {
        const wallSide = spiderWallSide(monster);
        if (wallSide === "west" || wallSide === "east") {
          model.rotation.set(0, 0, wallSide === "west" ? -Math.PI / 2 : Math.PI / 2);
        } else {
          model.rotation.set(wallSide === "north" ? Math.PI / 2 : -Math.PI / 2, 0, 0);
        }
      }
      (model.userData.legs || []).forEach((leg, legIndex) => {
        const walk = Math.sin(state.elapsedMs * 0.009 + legIndex * 0.85) * 0.25;
        const tuck = monster.jumping ? (legIndex % 2 === 0 ? 0.22 : -0.22) : 0;
        leg.rotation.z = walk + tuck;
      });
    } else {
      const walk = Math.sin(state.elapsedMs * 0.0075 + index);
      if (model.userData.leftArm) model.userData.leftArm.rotation.x = walk * 0.36;
      if (model.userData.rightArm) model.userData.rightArm.rotation.x = -walk * 0.36;
      if (model.userData.leftLeg) model.userData.leftLeg.rotation.x = -walk * 0.32;
      if (model.userData.rightLeg) model.userData.rightLeg.rotation.x = walk * 0.32;
      height += Math.abs(Math.sin(state.elapsedMs * 0.006 + index)) * 0.05;
    }
    model.position.set(monster.x, height, monster.z);
  });
}

function updateFirstPersonRig() {
  if (!firstPersonRig) return;
  firstPersonRig.visible = state.mode === "playing" || state.mode === "won";
  firstPersonLamp.visible = Boolean(state.inventory.carryingLampId && firstPersonRig.visible);
  firstPersonHammer.visible = Boolean(state.inventory.hasHammer && firstPersonRig.visible);
  const motion = state.player.moving ? 1 : 0;
  const bob = Math.sin(state.elapsedMs * 0.009) * 0.018 * motion;
  firstPersonRig.position.x = 0.48 + Math.sin(state.elapsedMs * 0.006) * 0.012 * motion;
  firstPersonRig.position.y = -0.48 + Math.abs(bob);
  firstPersonRig.rotation.z = Math.sin(state.elapsedMs * 0.006) * 0.008 * motion;
}

function updateCamera(force = false) {
  if (state.mode === 'intro') return;
  camera.up.set(0, 1, 0);
  if (state.mode === "menu") {
    camera.position.set(0, 4.8, -48.5);
    camera.rotation.set(-0.08, Math.PI, 0);
    camera.lookAt(0, 2.4, -29);
    if (firstPersonRig) firstPersonRig.visible = false;
    return;
  }
  const moving = state.player.moving ? 1 : 0;
  const bob = Math.sin(state.elapsedMs * 0.0102) * 0.045 * moving;
  camera.position.set(state.player.x, state.player.y + 1.62 + bob, state.player.z);
  camera.rotation.set(
    state.player.pitch + Math.sin(state.elapsedMs * 0.0075) * 0.004 * moving,
    state.player.yaw,
    Math.sin(state.elapsedMs * 0.005) * 0.006 * moving,
  );
  if (force) camera.updateMatrixWorld(true);
  updateFirstPersonRig();
}

function update(dt) {
  if (state.mode === 'ending') {
    endingElapsed += dt;
    const ending = endingFilm.update(endingElapsed);
    if (endingElapsed >= ending.duration) {
      state.mode = 'won';
      setModeUi();
    }
    return;
  }
  if (state.mode === 'intro') {
    introElapsed += dt;
    introFilm.update(introElapsed);
    introCaption.textContent = introElapsed < 3.6 ? 'MITT I NATTEN' : introElapsed >= INTRO_TIMES.locked ? 'DÖRREN ÄR LÅST' : '';
    if (introElapsed >= INTRO_TIMES.end) startGame();
    return;
  }
  if (state.mode !== "playing") {
    updateCamera();
    return;
  }
  state.elapsedMs += dt * 1000;
  updatePlatforms();
  updateDoors();
  updatePlayer(dt);
  if (state.mode !== "playing") return;
  updateMonsters(dt);
  if (state.mode !== "playing") return;
  recordEndingFrame();
  findNearbyInteractable();
  updateMonsterModels();
  updateCamera();
  updatePrompt(dt);
  updateHud();
}

function render() {
  const film = state.mode === 'intro' ? introFilm : (state.mode === 'ending' || state.mode === 'won') ? endingFilm : null;
  if (film) {
    // Preserve the complete film shot on portrait phones, rather than cropping
    // away the car or shadow. Gameplay still uses the full device viewport.
    const size = renderer.getSize(new THREE.Vector2());
    const height = Math.min(size.y, size.x * 9 / 16), width = height * 16 / 9;
    const left = (size.x - width) / 2, bottom = (size.y - height) / 2;
    film.camera.aspect = 16 / 9;
    film.camera.updateProjectionMatrix();
    introCaption.style.top = `${bottom + 14}px`;
    renderer.setScissorTest(false);
    renderer.setClearColor(0x071122);
    renderer.clear();
    renderer.setViewport(left, bottom, width, height);
    renderer.setScissor(left, bottom, width, height);
    renderer.setScissorTest(true);
    renderer.render(typeof film.scene === 'function' ? film.scene() : film.scene, film.camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
    return;
  }
  renderer.render(scene, camera);
}

function resize() {
  const rect = frameElement.getBoundingClientRect();
  const width = Math.max(1, rect.width || innerWidth);
  const height = Math.max(1, rect.height || innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touchDevice ? 1.25 : 1.7));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}

function frame(now) {
  const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (!manualTime) {
    accumulator += delta;
    while (accumulator >= FIXED_STEP) {
      update(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
  }
  render();
  requestAnimationFrame(frame);
}

function capturePointerSafely(element, pointerId) {
  try {
    element.setPointerCapture?.(pointerId);
  } catch {
    // Syntetiska testpekare kan redan ha släppts.
  }
}

function updateJoystick(event) {
  const rect = touchJoystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = Math.max(24, rect.width * 0.34);
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const length = Math.hypot(dx, dy);
  if (length > radius) {
    dx *= radius / length;
    dy *= radius / length;
  }
  touch.x = dx / radius;
  touch.y = dy / radius;
  touchKnob.style.transform = `translate(calc(-50% + ${dx * 0.68}px), calc(-50% + ${dy * 0.68}px))`;
}

function releaseJoystick(event) {
  if (touch.stickId !== event.pointerId) return;
  touch.stickId = null;
  touch.x = 0;
  touch.y = 0;
  touchKnob.style.transform = "translate(-50%, -50%)";
}

function releaseLook(event) {
  if (touch.lookId !== event.pointerId) return;
  touch.lookId = null;
}

function releaseAction(button, actionName) {
  button.classList.remove("is-pressed");
  if (actionName === "sprint") actions.sprint = false;
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else frameElement.requestFullscreen?.();
}

function bindInputs() {
  startButton.addEventListener("click", startGame);
  introButton.addEventListener('click', startIntro);
  winMenuButton?.addEventListener("click", returnToMenu);
  elevatorCloseButton?.addEventListener("click", closeElevator);
  fullscreenButton?.addEventListener("click", toggleFullscreen);

  window.addEventListener("keydown", (event) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    if (state.mode === 'intro') {
      if (event.code === 'Escape') returnToMenu();
      return;
    }
    if (state.mode === 'ending') return;
    if (state.mode === 'menu' && event.target === introButton && (event.code === 'Enter' || event.code === 'Space')) {
      event.preventDefault(); startIntro(); return;
    }
    if (state.mode === "menu" && (event.code === "Enter" || event.code === "Space")) {
      startGame();
      return;
    }
    if (event.code === "KeyF" && !event.repeat) toggleFullscreen();
    if (event.code === "Escape" && state.elevatorOpen) closeElevator();
    if (event.code === "KeyE" && !event.repeat) interact();
    if (event.code === "Space" && !event.repeat && state.mode === "playing") actions.jumpQueued = true;
    keysDown.add(event.code);
  });
  window.addEventListener("keyup", (event) => keysDown.delete(event.code));
  window.addEventListener("blur", resetInputs);

  touchJoystick.addEventListener("pointerdown", (event) => {
    if (state.mode !== "playing" || state.elevatorOpen) return;
    event.preventDefault();
    event.stopPropagation();
    touch.stickId = event.pointerId;
    capturePointerSafely(touchJoystick, event.pointerId);
    updateJoystick(event);
  }, { passive: false });
  touchJoystick.addEventListener("pointermove", (event) => {
    if (touch.stickId !== event.pointerId) return;
    event.preventDefault();
    updateJoystick(event);
  }, { passive: false });
  touchJoystick.addEventListener("pointerup", releaseJoystick);
  touchJoystick.addEventListener("pointercancel", releaseJoystick);
  touchJoystick.addEventListener("lostpointercapture", releaseJoystick);

  canvas.addEventListener("pointerdown", (event) => {
    if (state.mode !== "playing" || state.elevatorOpen || touch.lookId !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    touch.lookId = event.pointerId;
    touch.lookX = event.clientX;
    touch.lookY = event.clientY;
    capturePointerSafely(canvas, event.pointerId);
  }, { passive: false });
  canvas.addEventListener("pointermove", (event) => {
    if (touch.lookId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - touch.lookX;
    const dy = event.clientY - touch.lookY;
    touch.lookX = event.clientX;
    touch.lookY = event.clientY;
    const mouse = event.pointerType === "mouse";
    state.player.yaw = normalizeAngle(state.player.yaw - dx * (mouse ? 0.004 : 0.006));
    state.player.pitch = clamp(state.player.pitch - dy * (mouse ? 0.0032 : 0.0045), -0.72, 0.68);
  }, { passive: false });
  canvas.addEventListener("pointerup", releaseLook);
  canvas.addEventListener("pointercancel", releaseLook);
  canvas.addEventListener("lostpointercapture", releaseLook);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  document.querySelectorAll("[data-action]").forEach((button) => {
    const actionName = button.dataset.action;
    button.addEventListener("pointerdown", (event) => {
      if (state.mode !== "playing" || state.elevatorOpen) return;
      event.preventDefault();
      event.stopPropagation();
      capturePointerSafely(button, event.pointerId);
      button.classList.add("is-pressed");
      if (actionName === "sprint") actions.sprint = true;
      if (actionName === "jump") actions.jumpQueued = true;
      if (actionName === "interact") interact();
    }, { passive: false });
    const release = () => releaseAction(button, actionName);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });

  document.addEventListener("fullscreenchange", () => requestAnimationFrame(resize));
  window.addEventListener("resize", resize);
}

function allEntityDefinitions() {
  const definitions = [{ id: 'factory-entrance', type: 'locked-entrance', floor: 1, x: 0, z: -53.2 }];
  for (const [id, floor, x, z] of ENTITY_DEFS.lamps) definitions.push({ id, type: "lamp", floor, x, z });
  for (const [id, floor, x, z] of ENTITY_DEFS.levers) definitions.push({ id, type: "lever", floor, x, z });
  for (const [id, floor, x, z] of ENTITY_DEFS.keys) definitions.push({ id, type: "key", floor, x, z });
  for (let index = 0; index < LAMP_TARGET_COUNT; index += 1) {
    const column = index % 5;
    const row = Math.floor(index / 5);
    definitions.push({ id: `socket-${index + 1}`, type: "socket", floor: 1, x: -14.4 + column * 3.2, z: -46.8, row });
  }
  for (const key of ["lightSwitch", "hammer", "boards", "exit"]) {
    const [id, floor, x, z] = ENTITY_DEFS[key];
    definitions.push({ id, type: key, floor, x, z });
  }
  for (let floor = 1; floor <= FLOOR_COUNT; floor += 1) {
    const elevators = FLOOR_PLANS[floor]?.elevators || [{ x: 0, z: 47 }];
    elevators.forEach((entry, index) => definitions.push({ id: `elevator-${floor}${index ? `-${index + 1}` : ''}`, type: 'elevator', floor,
      x: entry.x + Math.cos(entry.rotation || 0) * 5.1 - Math.sin(entry.rotation || 0) * 4.6,
      z: entry.z - Math.sin(entry.rotation || 0) * 5.1 - Math.cos(entry.rotation || 0) * 4.6 }));
    for (const direction of ['up', 'down']) {
      if (direction === 'up' && floor === FLOOR_COUNT || direction === 'down' && floor === 1) continue;
      const stair = stairLocation(floor, direction);
      definitions.push({ id: `stairs-${direction}-${floor}`, type: `stair-${direction}`, floor,
        x: stair.x, z: stair.z - Math.cos(stair.rotation || 0) * 3 });
    }
  }
  return definitions;
}

function testPlacePlayerNear(id) {
  const monster = state.monsters.find((item) => item.id === id);
  const definition = monster || allEntityDefinitions().find((item) => item.id === id);
  if (!definition) return false;
  if (state.player.floor !== definition.floor) {
    state.player.floor = definition.floor;
    buildFloor(definition.floor);
  }
  state.player.x = definition.x - 1.15;
  state.player.z = definition.z;
  state.player.y = 0;
  state.player.vy = 0;
  state.player.grounded = true;
  state.player.supportId = null;
  findNearbyInteractable();
  updateCamera(true);
  render();
  return true;
}

function setupMissionForTest(mission) {
  const target = clamp(Math.floor(mission), 1, 5);
  state.activeMission = target;
  if (target >= 2) {
    state.missions.lamps.collectedIds = ENTITY_DEFS.lamps.map((item) => item[0]);
    state.missions.lamps.installedSocketIds = Array.from({ length: LAMP_TARGET_COUNT }, (_, index) => `socket-${index + 1}`);
    state.missions.lamps.complete = true;
  }
  if (target >= 3) {
    state.missions.levers.pulledIds = ENTITY_DEFS.levers.map((item) => item[0]);
    state.missions.levers.complete = true;
    state.factory.elevatorsPowered = true;
  }
  if (target >= 4) {
    state.missions.keys.collectedIds = ENTITY_DEFS.keys.map((item) => item[0]);
    state.missions.keys.complete = true;
    state.factory.floor3Unlocked = true;
  }
  if (target >= 5) {
    state.missions.floor3Lights.switchPressed = true;
    state.missions.floor3Lights.complete = true;
    state.factory.floor3LightsOn = true;
  }
  buildFloor(state.player.floor);
  updateCamera(true);
  render();
}

function runMonsterNavigationSelfTest() {
  const originalState = state;
  const originalManualTime = manualTime;
  const results = { speeds: {}, jump: {}, surfaces: {}, stairs: {}, zones: {}, boundaries: {}, realApproach: {} };

  const prepare = (id, floor = null) => {
    state = freshState(333);
    state.mode = "playing";
    const startDefinition = MONSTER_STARTS.find((item) => item.id === id);
    const selectedFloor = Number.isFinite(floor) ? floor : startDefinition.floor;
    state.player.floor = selectedFloor;
    state.player.x = 0;
    state.player.z = 10;
    state.monsters.forEach((item) => { item.frozen = item.id !== id; });
    const monster = state.monsters.find((item) => item.id === id);
    monster.floor = selectedFloor;
    monster.x = 0;
    monster.z = -10;
    monster.surface = "floor";
    monster.stairCooldown = 0;
    monster.visionOverride = true;
    return monster;
  };

  const putOnStairs = (monster, targetFloor) => {
    const started = beginMonsterStairTravel(monster, targetFloor, "patrol");
    if (!started) return false;
    const route = monster.stairRoute;
    if (route.direction < 0) {
      finishMonsterStairTravel(monster);
      return true;
    }
    route.phase = "climb";
    route.progress = 0;
    monster.x = route.direction > 0 ? STAIR_UP_X : STAIR_DOWN_X;
    monster.z = route.direction > 0 ? STAIR_ENTRY_Z : STAIR_TOP_Z;
    monster.stairY = route.direction > 0 ? monsterStairSurfaceHeight(0) : STAIR_HEIGHT;
    monster.heading = route.direction > 0 ? 0 : Math.PI;
    return true;
  };

  try {
    manualTime = true;
    for (const id of ["monster-1", "monster-2", "monster-3"]) {
      const monster = prepare(id);
      const before = { x: monster.x, z: monster.z };
      updateMonsters(1);
      results.speeds[id] = {
        expected: monsterMovementSpeed(monster),
        distance: Number(distance2D(before.x, before.z, monster.x, monster.z).toFixed(4)),
      };
    }

    const tallMonster = prepare("monster-1");
    const tallJumpStarted = triggerMonsterJump(tallMonster);
    const facelessMonster = prepare("monster-3");
    const facelessJumpStarted = triggerMonsterJump(facelessMonster);
    const spider = prepare("monster-2");
    spider.visionOverride = false;
    const spiderJumpStarted = triggerMonsterJump(spider);
    const repeatedJumpStarted = triggerMonsterJump(spider);
    let maxJumpY = spider.jumpY;
    let jumpSteps = 0;
    while (spider.jumping && jumpSteps < 180) {
      updateMonsters(FIXED_STEP);
      maxJumpY = Math.max(maxJumpY, spider.jumpY);
      jumpSteps += 1;
    }
    results.jump = {
      onlyEightLegs: !tallJumpStarted && spiderJumpStarted && !facelessJumpStarted,
      started: spiderJumpStarted,
      repeatBlocked: !repeatedJumpStarted,
      maxY: Number(maxJumpY.toFixed(3)),
      landed: !spider.jumping && spider.jumpY === 0,
      grounded: spider.jumpGrounded,
      steps: jumpSteps,
    };

    const tallSurfaceMonster = prepare("monster-1");
    const tallWall = setMonsterSurfaceState(tallSurfaceMonster, "wall");
    const facelessSurfaceMonster = prepare("monster-3");
    const facelessCeiling = setMonsterSurfaceState(facelessSurfaceMonster, "ceiling");
    const spiderSurfaceMonster = prepare("monster-2");
    const spiderWall = setMonsterSurfaceState(spiderSurfaceMonster, "wall");
    const wallJumpStarted = triggerMonsterJump(spiderSurfaceMonster);
    const spiderCeiling = setMonsterSurfaceState(spiderSurfaceMonster, "ceiling");
    results.surfaces = {
      onlyEightLegs: !tallWall && !facelessCeiling && spiderWall && spiderCeiling,
      spiderSurface: spiderSurfaceMonster.surface,
      tallSurface: tallSurfaceMonster.surface,
      facelessSurface: facelessSurfaceMonster.surface,
    };
    const stairSpider = prepare("monster-2", 3);
    stairSpider.visionOverride = false;
    const stairStarted = beginMonsterStairTravel(stairSpider, 4, "patrol");
    const stairJumpStarted = triggerMonsterJump(stairSpider);
    results.jump.wallBlocked = !wallJumpStarted;
    results.jump.stairBlocked = stairStarted && !stairJumpStarted;

    const stairCases = [
      ["monster-1", 1, 2], ["monster-2", 3, 4], ["monster-3", 5, 6],
      ["monster-1", 2, 1], ["monster-2", 4, 3], ["monster-3", 6, 5],
    ];
    stairCases.forEach(([id, from, to]) => {
      const monster = prepare(id, from);
      monster.visionOverride = false;
      const started = putOnStairs(monster, to);
      if (monster.stairRoute) updateMonsters(2);
      results.stairs[`${id}:${from}-${to}`] = {
        started,
        floor: monster.floor,
        x: Number(monster.x.toFixed(2)),
        z: Number(monster.z.toFixed(2)),
        surface: monster.surface,
        routeComplete: monster.stairRoute === null,
      };
    });

    const zoneEscapeCases = [
      ["monster-1", 2, 3],
      ["monster-2", 3, 2], ["monster-2", 4, 5],
      ["monster-3", 5, 4],
    ];
    zoneEscapeCases.forEach(([id, from, to]) => {
      const monster = prepare(id, from);
      monster.visionOverride = false;
      results.zones[`${id}:${from}-${to}`] = beginMonsterStairTravel(monster, to, "chase");
    });

    const lowerMonster = prepare("monster-1", 1);
    results.boundaries.belowOne = beginMonsterStairTravel(lowerMonster, 0, "patrol");
    const upperMonster = prepare("monster-3", 6);
    results.boundaries.aboveSix = beginMonsterStairTravel(upperMonster, 7, "patrol");

    const realMonster = prepare("monster-1", 1);
    realMonster.x = 0;
    realMonster.z = 16;
    realMonster.visionOverride = false;
    state.player.x = 48;
    state.player.z = -44;
    const started = beginMonsterStairTravel(realMonster, 2, "patrol");
    let sawApproach = false;
    let sawClimb = false;
    let steps = 0;
    while (realMonster.floor === 1 && steps < 400) {
      updateMonsters(0.1);
      sawApproach ||= realMonster.stairRoute?.phase === "approach";
      sawClimb ||= realMonster.stairRoute?.phase === "climb";
      steps += 1;
    }
    results.realApproach = {
      started,
      sawApproach,
      sawClimb,
      arrivedFloor: realMonster.floor,
      x: Number(realMonster.x.toFixed(2)),
      z: Number(realMonster.z.toFixed(2)),
      steps,
    };
  } finally {
    state = originalState;
    manualTime = originalManualTime;
  }
  return results;
}

function renderGameToText() {
  const progress = missionProgress();
  const visibleInteractables = interactables
    .map((item) => ({
      id: item.id,
      type: item.type,
      x: Number(item.x.toFixed(2)),
      z: Number(item.z.toFixed(2)),
      distance: Number(distance2D(state.player.x, state.player.z, item.x, item.z).toFixed(2)),
    }))
    .filter((item) => item.distance <= 32)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 14);
  return JSON.stringify({
    version: state.version,
    mode: state.mode,
    intro: state.mode === 'intro' ? introFilm.snapshot() : null,
    ending: endingFilm && (state.mode === 'ending' || state.mode === 'won') ? endingFilm.snapshot() : null,
    coordinateSystem: "Each floor has local y=0. x increases east/right, z increases south; yaw 0 looks north (-z).",
    world: {
      kind: "giant six-floor factory",
      floors: FLOOR_COUNT,
      currentFloor: state.player.floor,
      currentFloorName: FLOOR_THEMES[state.player.floor - 1].name,
      sizePerFloorMeters: MAP_HALF * 2,
      worldRevision,
      drawnBy: FLOOR_PLANS[state.player.floor]?.drawnBy || 'factory design',
    },
    player: {
      floor: state.player.floor,
      x: Number(state.player.x.toFixed(2)),
      y: Number(state.player.y.toFixed(2)),
      z: Number(state.player.z.toFixed(2)),
      yaw: Number(state.player.yaw.toFixed(3)),
      pitch: Number(state.player.pitch.toFixed(3)),
      grounded: state.player.grounded,
      moving: state.player.moving,
      sprinting: state.player.sprinting,
      walkSpeed: WALK_SPEED,
      sprintSpeed: SPRINT_SPEED,
      perspective: "first-person 3D",
      supportId: state.player.supportId,
      safeNearElevator: nearElevator(state.player.floor, state.player.x, state.player.z),
      autoJumping: Boolean(state.player.autoJump),
      autoJumpTarget: state.player.autoJump?.targetId || null,
      autoJumpCount: state.player.autoJumpCount,
    },
    mission: {
      active: state.activeMission,
      title: MISSION_INFO[state.activeMission - 1].title,
      progress: progress.value,
      total: progress.total,
      progressText: progress.text,
      lampsCollected: state.missions.lamps.collectedIds.length,
      lampsInstalled: state.missions.lamps.installedSocketIds.length,
      leversPulled: state.missions.levers.pulledIds.length,
      keysFound: state.missions.keys.collectedIds.length,
      floor3LightsOn: state.factory.floor3LightsOn,
      boardsBroken: state.missions.exit.boardsBroken,
    },
    inventory: { ...state.inventory },
    factory: { ...state.factory },
    platforms: platforms.map(({ id, x, y, z, w, d, kind, definition }) => ({ id, x, y, z, w, d, kind, ropes: 4, from: definition.from, to: definition.to || null })),
    holes: FLOOR_PLANS[state.player.floor]?.holes || [],
    blankAreas: FLOOR_PLANS[state.player.floor]?.blankIsVoid ? {
      arePits: true, walkingAllowed: false, wallOrCeilingCrossingAllowed: false,
      platformJumpsAllowed: true, fixedGround: FLOOR_PLANS[state.player.floor].ground,
    } : null,
    upperAreas: FLOOR_PLANS[state.player.floor]?.upper || [],
    elevatorSafeAreas: elevatorSafeAreas(state.player.floor),
    monsterOnlyAreas: FLOOR_PLANS[state.player.floor]?.monsterOnly || [],
    doors: doorways.map(({ id, floor, name, x, z, rotationY, open }) => ({
      id, floor, name, x, z, rotationY, open,
      closesInSeconds: open ? Number((Math.max(0, (state.doorOpenUntil[id] || 0) - state.elapsedMs) / 1000).toFixed(3)) : 0,
    })),
    nearby: state.nearby,
    visibleInteractables,
    monsters: state.monsters.map((monster) => ({
      id: monster.id,
      kind: monster.kind,
      floor: monster.floor,
      x: Number(monster.x.toFixed(2)),
      z: Number(monster.z.toFixed(2)),
      surface: monster.surface,
      ai: monster.ai,
      seesPlayer: monster.seesPlayer,
      visible: monster.floor === state.player.floor,
      movementSpeed: monsterMovementSpeed(monster),
      speedMatches: monsterMovementSpeed(monster) === WALK_SPEED ? "player walk" : null,
      allowedFloors: [...monsterAllowedFloors(monster)],
      canJump: monsterCanJump(monster),
      isJumping: Boolean(monster.jumping),
      jumpY: Number((monster.jumpY || 0).toFixed(2)),
      worldY: Number(monsterWorldY(monster).toFixed(2)),
      supportId: monster.supportId,
      jumpVy: Number((monster.jumpVelocity || 0).toFixed(2)),
      jumpGrounded: Boolean(monster.jumpGrounded),
      jumpCooldown: Number((monster.jumpCooldown || 0).toFixed(2)),
      canClimbWalls: monster.kind === "eight-legs",
      canClimbCeiling: monster.kind === "eight-legs",
      canUseWallsAndCeiling: monster.kind === "eight-legs",
      wallSide: monster.surface === "wall" && monster.kind === "eight-legs" ? spiderWallSide(monster) : null,
      usingStairs: Boolean(monster.stairRoute),
      stairPhase: monster.stairRoute?.phase || null,
      stairTargetFloor: monster.stairRoute?.targetFloor || null,
      stairY: Number((monster.stairY || 0).toFixed(2)),
      holeCrossing: monster.holeCrossing?.phase || null,
      platformJumpTarget: monster.platformJump?.toId || null,
    })),
    overlays: { elevator: state.elevatorOpen, win: state.mode === "won", menu: state.mode === "menu" },
    controls: {
      keyboard: "WASD move, drag to look, Shift sprint, E take/use, Space jump, F fullscreen",
      touch: "left joystick move, drag world to look, SPRING hold, TA SAK, HOPPA; automatic edge jumps to reachable platforms",
    },
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (milliseconds) => {
  manualTime = true;
  const steps = Math.max(1, Math.round(Math.max(0, milliseconds) / (FIXED_STEP * 1000)));
  for (let step = 0; step < steps; step += 1) update(FIXED_STEP);
  updateCamera(true);
  render();
};
window.__whereIsExitTest = {
  reset: ({ seed = 333 } = {}) => resetGame(seed),
  startGame,
  startIntro,
  endingFrames: () => endingFrames.map(frame => ({...frame})),
  seekEnding: seconds => {
    if (!endingFilm) return false;
    endingElapsed = Math.max(0,seconds);
    endingFilm.update(endingElapsed);
    render();
    return endingFilm.snapshot();
  },
  snapshot: () => JSON.parse(renderGameToText()),
  setPlayerPose: ({ floor = state.player.floor, x = state.player.x, y = 0, z = state.player.z, yaw = state.player.yaw, pitch = state.player.pitch } = {}) => {
    state.player.floor = clamp(Math.floor(floor), 1, FLOOR_COUNT);
    state.player.x = x;
    state.player.y = y;
    state.player.z = z;
    state.player.yaw = yaw;
    state.player.pitch = pitch;
    state.player.vy = 0;
    state.player.grounded = true;
    state.player.supportId = null;
    state.player.autoJump = null;
    buildFloor(state.player.floor);
    updateCamera(true);
    render();
  },
  setEntityPose: (id, { floor, x, z, surface } = {}) => {
    const monster = state.monsters.find((item) => item.id === id);
    if (!monster) return false;
    if (surface && !monsterCanUseSurface({ ...monster, floor: floor ?? monster.floor, x: x ?? monster.x, z: z ?? monster.z }, surface)) return false;
    if (Number.isFinite(floor)) monster.floor = clamp(Math.floor(floor), 1, FLOOR_COUNT);
    if (Number.isFinite(x)) monster.x = x;
    if (Number.isFinite(z)) monster.z = z;
    if (surface) setMonsterSurfaceState(monster, surface);
    landMonsterJump(monster, monster.kind === "eight-legs" ? 0.4 : 0);
    monster.stairRoute = null;
    monster.stairY = 0;
    monster.stairCooldown = 0;
    monster.baseY = 0;
    monster.supportId = null;
    monster.holeCrossing = null;
    monster.platformJump = null;
    monster.lastPlatformPose = null;
    monster.path = []; monster.pathTimer = 0;
    updateMonsterModels();
    render();
    return true;
  },
  setMonsterFrozen: (id, frozen = true) => {
    const monster = state.monsters.find((item) => item.id === id);
    if (!monster) return false;
    monster.frozen = Boolean(frozen);
    return true;
  },
  setAllMonstersFrozen: (frozen = true) => state.monsters.forEach((monster) => { monster.frozen = Boolean(frozen); }),
  pauseSimulation: () => { manualTime = true; },
  runMonsterNavigationSelfTest,
  stepMonsters: (seconds = FIXED_STEP) => {
    manualTime = true;
    updateMonsters(Math.max(0, Number(seconds) || 0));
    updateMonsterModels();
    updateCamera(true);
    render();
    return JSON.parse(renderGameToText());
  },
  setVisionOverride: (id, value = null) => {
    const monster = state.monsters.find((item) => item.id === id);
    if (!monster) return false;
    monster.visionOverride = typeof value === "boolean" ? value : null;
    return true;
  },
  triggerMonsterJump: (id) => {
    const monster = state.monsters.find((item) => item.id === id);
    if (!monster) return false;
    const started = triggerMonsterJump(monster);
    updateMonsterModels();
    render();
    return started;
  },
  setMonsterSurface: (id, surface = "floor") => {
    const monster = state.monsters.find((item) => item.id === id);
    if (!monster || !setMonsterSurfaceState(monster, surface)) return false;
    updateMonsterModels();
    render();
    return true;
  },
  setMonsterNavigation: (id, { ai, targetFloor, cooldown = 0, floorRoamTimer, startOnStairs = false } = {}) => {
    const monster = state.monsters.find((item) => item.id === id);
    if (!monster) return false;
    if (ai === "patrol" || ai === "chase") monster.ai = ai;
    monster.stairRoute = null;
    monster.stairY = 0;
    landMonsterJump(monster, monster.kind === "eight-legs" ? 0.4 : 0);
    monster.stairCooldown = Math.max(0, Number(cooldown) || 0);
    if (Number.isFinite(floorRoamTimer)) monster.floorRoamTimer = floorRoamTimer;
    if (Number.isFinite(targetFloor)) {
      const started = beginMonsterStairTravel(monster, Math.floor(targetFloor), monster.ai);
      if (started && startOnStairs) {
        const route = monster.stairRoute;
        if (route.direction < 0) {
          finishMonsterStairTravel(monster);
          return true;
        }
        route.phase = "climb";
        route.progress = 0;
        monster.x = route.location.x;
        monster.z = route.location.z - Math.cos(route.location.rotation || 0) * 3.6;
        monster.stairY = route.direction > 0 ? monsterStairSurfaceHeight(0) : STAIR_HEIGHT;
        monster.heading = route.direction > 0 ? 0 : Math.PI;
      }
      return started;
    }
    return true;
  },
  placePlayerNear: testPlacePlayerNear,
  triggerInteract: interact,
  selectElevatorFloor: (floor) => changeFloor(Number(floor), "elevator"),
  setMission: setupMissionForTest,
  getEntityCatalog: allEntityDefinitions,
  getFloorPlans: () => JSON.parse(JSON.stringify(FLOOR_PLANS)),
  getGround: (x, z, y = Infinity) => supportAt(x, z, y),
  isBlankVoid: (floor, x, z) => isBlankVoid(floor, x, z),
  nearElevator,
  aim: (yaw, pitch = 0) => { state.player.yaw = yaw; state.player.pitch = pitch; },
  setMonsterTarget: (id, x, z) => {
    const monster = state.monsters.find(item => item.id === id);
    Object.assign(monster, { targetX: x, targetZ: z, ai: 'patrol', floorRoamTimer: 1000, surfaceTimer: 1000, path: [], pathTimer: 0 });
  },
  setElapsedTime: (seconds) => { state.elapsedMs = seconds * 1000; updatePlatforms(); },
  viewFromAbove: () => {
    camera.position.set(0, 92, 0); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0);
    scene.fog.near = 500; scene.fog.far = 1000;
    firstPersonRig.visible = false;
    const ceiling = worldRoot.children.filter(child => child.isMesh && child.position.y > CEILING_HEIGHT);
    ceiling.forEach(child => { child.visible = false; });
    render();
  },
};

function showStartupError(error) {
  console.error("Where's Exit kunde inte starta 3D-grafiken.", error);
  startButton.disabled = true;
  startButton.textContent = "3D-GRAFIKEN KUNDE INTE STARTA";
}

function boot() {
  try {
    initRenderer();
    initScene();
    buildMonsterModels();
    firstPersonRig = buildFirstPersonRig();
    firstPersonRig.traverse((object) => {
      if (!object.isMesh) return;
      object.material = object.material.clone();
      object.material.depthTest = false;
      object.material.depthWrite = false;
      object.renderOrder = 100;
      object.frustumCulled = false;
    });
    buildFloor(1);
    bindInputs();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frameElement);
    setModeUi();
    updateCamera(true);
    resize();
    requestAnimationFrame((now) => {
      lastFrame = now;
      requestAnimationFrame(frame);
    });
  } catch (error) {
    showStartupError(error);
  }
}

boot();
