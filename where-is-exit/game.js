import * as THREE from "./vendor/three.module.js";

const canvas = document.getElementById("gameCanvas");
const frameElement = canvas.closest(".canvas-frame");
const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");
const gameHud = document.getElementById("gameHud");
const gameNav = document.getElementById("gameNav");
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
const FLOOR_COUNT = 7;
const MAP_HALF = 55;
const CEILING_HEIGHT = 8.5;
const PLAYER_RADIUS = 0.62;
const WALK_SPEED = 5.0;
const SPRINT_SPEED = 8.1;
const GRAVITY = 17.5;
const JUMP_SPEED = 6.7;
const INTERACT_RANGE = 3.15;
const VERSION = "20260830-2";

const FLOOR_THEMES = [
  { name: "MOTTAGNING", floor: 0x6f7472, wall: 0x74726a, accent: 0xf1a13d, fog: 0xaab0a9 },
  { name: "MASKINHALL", floor: 0x626d72, wall: 0x68767a, accent: 0x55bed3, fog: 0x9aaab0 },
  { name: "RESERVKRAFT", floor: 0x555c61, wall: 0x61666b, accent: 0xf1c84c, fog: 0x606b72 },
  { name: "LAGER", floor: 0x71685c, wall: 0x7b7062, accent: 0xed7f52, fog: 0xaaa092 },
  { name: "VERKSTAD", floor: 0x5e6964, wall: 0x68746e, accent: 0x67d08b, fog: 0x94a59d },
  { name: "LASTZON", floor: 0x67616e, wall: 0x706878, accent: 0xbc8df0, fog: 0x9f97aa },
  { name: "KONTROLLPLAN", floor: 0x5d6874, wall: 0x687888, accent: 0x70baff, fog: 0x99a9b7 },
];

const MISSION_INFO = [
  { title: "HITTA 10 GULA LAMPOR", short: "Lampor", total: 10 },
  { title: "DRA I 5 SPAKAR", short: "Spakar", total: 5 },
  { title: "HITTA 5 NYCKLAR", short: "Nycklar", total: 5 },
  { title: "TÄND VÅNING 3", short: "Belysning", total: 1 },
  { title: "HITTA HAMMAREN OCH EXIT", short: "EXIT", total: 2 },
];

const ENTITY_DEFS = {
  lamps: [
    ["lamp-1", 1, -43, -37], ["lamp-2", 1, -8, -33],
    ["lamp-3", 1, 34, -38], ["lamp-4", 1, 42, -4],
    ["lamp-5", 1, 26, 31], ["lamp-6", 1, -18, 25],
    ["lamp-7", 1, -44, 5], ["lamp-8", 2, -36, -30],
    ["lamp-9", 2, 8, 24], ["lamp-10", 2, 39, 35],
  ],
  levers: [
    ["lever-1", 1, -41, -8], ["lever-2", 1, 40, 8],
    ["lever-3", 1, 18, 38], ["lever-4", 2, -34, 31],
    ["lever-5", 2, 36, -28],
  ],
  keys: [
    ["key-1", 1, 39, -31], ["key-2", 2, -38, 29],
    ["key-3", 4, 35, 34], ["key-4", 5, -36, -35],
    ["key-5", 7, 38, 4],
  ],
  lightSwitch: ["light-switch", 3, 38, -34],
  hammer: ["hammer", 5, 39, 35],
  boards: ["exit-boards", 6, 51.4, 0],
  exit: ["exit", 6, 54, 0],
};

const MONSTER_STARTS = [
  { id: "monster-1", kind: "tall-one-eye", name: "ENÖGAT", floor: 1, x: 30, z: 24, heading: Math.PI, surface: "floor" },
  { id: "monster-2", kind: "eight-legs", name: "ÅTTABEN", floor: 3, x: -25, z: -20, heading: 0.4, surface: "ceiling" },
  { id: "monster-3", kind: "faceless", name: "BRUNIS", floor: 6, x: -32, z: 23, heading: -0.7, surface: "floor" },
];

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

function freshState(seed = 333) {
  return {
    version: VERSION,
    mode: "menu",
    elapsedMs: 0,
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
  brownMonster: createMaterial(0x5b3826, { roughness: 0.86, metalness: 0.02 }),
  brownLight: createMaterial(0x76503a, { roughness: 0.84, metalness: 0.02 }),
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
  renderer.toneMappingExposure = 1.08;
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
  context.font = "900 54px system-ui, sans-serif";
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
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  parent.add(group);
  meshBox(group, [0.45, 5.6, 0.6], [-2.2, 2.8, 0], MATERIALS.darkMetal);
  meshBox(group, [0.45, 5.6, 0.6], [2.2, 2.8, 0], MATERIALS.darkMetal);
  meshBox(group, [4.85, 0.45, 0.6], [0, 5.55, 0], MATERIALS.orange);
  const panel = meshBox(group, [2.2, 4.7, 0.22], [-2.05, 2.35, 0.42], MATERIALS.mediumMetal);
  panel.rotation.y = -0.72;
  addLabel(group, label, [0, 6.3, 0], "#ffd15c", 2.0);
  return group;
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
  const x = isUp ? -43 : -32;
  const z = 43;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
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
    z: 40,
    radius: 4.2,
  }, group);
}

function addElevator(parent, floor, theme) {
  const group = new THREE.Group();
  group.position.set(0, 0, 47);
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
  registerInteractable({ id: `elevator-${floor}`, type: "elevator", name: "HISS", floor, x: 5.1, z: 42.4, radius: 3.4 }, panel);
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
  addLabel(group, "10 ELUTTAG", [0, 6.4, 0], "#ffd75b", 2.55);
  for (let index = 0; index < 10; index += 1) {
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
  group.position.set(52.2, 0, 0);
  parent.add(group);
  meshBox(group, [0.75, 6.6, 9.0], [0, 3.3, -5.25], MATERIALS.darkMetal);
  meshBox(group, [0.75, 6.6, 9.0], [0, 3.3, 5.25], MATERIALS.darkMetal);
  meshBox(group, [0.75, 0.65, 11], [0, 6.3, 0], MATERIALS.green);
  addLabel(group, "EXIT", [-0.5, 7.35, 0], "#7dffa6", 3.0);
  if (!state.missions.exit.boardsBroken) {
    for (let index = -2; index <= 2; index += 1) {
      const board = meshBox(group, [0.42, 0.65, 9.4], [-0.45, 2.8 + index * 0.58, 0], MATERIALS.wood, { rotationY: 0.06 * index });
      board.rotation.x = 0.08 * index;
    }
    colliders.push({ id: "exit-boards", minX: 50.6, maxX: 53.0, minZ: -4.7, maxZ: 4.7, vision: true });
    if (state.activeMission === 5) registerInteractable({ id: "exit-boards", type: "boards", name: "PLANKOR VID EXIT", floor: 6, x: 50.5, z: 0, radius: 3.4 }, group);
  } else {
    registerInteractable({ id: "exit", type: "exit", name: "GÅ UT GENOM EXIT", floor: 6, x: 53.4, z: 0, radius: 4.0 }, group);
  }
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

  meshBox(worldRoot, [MAP_HALF * 2, 0.35, MAP_HALF * 2], [0, -0.18, 0], floorMaterial, { receiveShadow: true, castShadow: false });
  meshBox(worldRoot, [MAP_HALF * 2, 0.22, MAP_HALF * 2], [0, CEILING_HEIGHT + 0.1, 0], MATERIALS.ceiling, { castShadow: false });

  const wallHeight = CEILING_HEIGHT;
  addColliderBox(worldRoot, [1.0, wallHeight, MAP_HALF * 2], [-MAP_HALF, wallHeight / 2, 0], wallMaterial, "outer-west");
  if (floor === 6) {
    addColliderBox(worldRoot, [1.0, wallHeight, MAP_HALF - 5], [MAP_HALF, wallHeight / 2, -(MAP_HALF + 5) / 2], wallMaterial, "outer-east-north");
    addColliderBox(worldRoot, [1.0, wallHeight, MAP_HALF - 5], [MAP_HALF, wallHeight / 2, (MAP_HALF + 5) / 2], wallMaterial, "outer-east-south");
  } else {
    addColliderBox(worldRoot, [1.0, wallHeight, MAP_HALF * 2], [MAP_HALF, wallHeight / 2, 0], wallMaterial, "outer-east");
  }
  addColliderBox(worldRoot, [MAP_HALF * 2, wallHeight, 1.0], [0, wallHeight / 2, -MAP_HALF], wallMaterial, "outer-north");
  addColliderBox(worldRoot, [MAP_HALF * 2, wallHeight, 1.0], [0, wallHeight / 2, MAP_HALF], wallMaterial, "outer-south");

  // Två långa innerväggar med breda dörröppningar skapar stora slingor.
  for (const z of [-20, 20]) {
    addColliderBox(worldRoot, [32, 5.8, 0.75], [-35, 2.9, z], wallMaterial, `partition-${z}-west`);
    addColliderBox(worldRoot, [32, 5.8, 0.75], [35, 2.9, z], wallMaterial, `partition-${z}-east`);
    addColliderBox(worldRoot, [14, 5.8, 0.75], [-9, 2.9, z], wallMaterial, `partition-${z}-midwest`);
    addColliderBox(worldRoot, [14, 5.8, 0.75], [9, 2.9, z], wallMaterial, `partition-${z}-mideast`);
    addDoorFrame(worldRoot, 0, z, 0, z < 0 ? "NORRA DÖRREN" : "SÖDRA DÖRREN");
  }
  addColliderBox(worldRoot, [0.75, 5.8, 22], [-24, 2.9, 0], wallMaterial, "partition-west-center");
  addColliderBox(worldRoot, [0.75, 5.8, 22], [24, 2.9, 0], wallMaterial, "partition-east-center");
  addDoorFrame(worldRoot, -24, 0, Math.PI / 2, "VÄST");
  addDoorFrame(worldRoot, 24, 0, Math.PI / 2, "ÖST");

  const fixturePositions = [-42, -21, 0, 21, 42];
  let fixtureIndex = 0;
  for (const z of fixturePositions) {
    for (const x of fixturePositions) {
      addFactoryFixture(worldRoot, x, z, factoryLightsOn, fixtureIndex % 4 === 0);
      fixtureIndex += 1;
    }
  }

  const machinePositions = [
    [-39, -32], [-22, -33], [19, -34], [38, -33],
    [-39, 31], [-18, 33], [18, 32], [39, 31],
  ];
  machinePositions.forEach(([x, z], index) => {
    const jitterX = (seededUnit(floor, index, 1) - 0.5) * 2.2;
    const jitterZ = (seededUnit(floor, index, 2) - 0.5) * 2.2;
    addMachine(worldRoot, x + jitterX, z + jitterZ, floor * 20 + index, theme.accentMaterial);
  });
  addConveyor(worldRoot, -34, 10, 0, floor * 2);
  addConveyor(worldRoot, 34, -10, Math.PI / 2, floor * 2 + 1);

  for (let index = 0; index < 12; index += 1) {
    const side = index % 2 ? 1 : -1;
    const x = side * (12 + (index % 4) * 8);
    const z = -10 + Math.floor(index / 4) * 10;
    addColliderBox(worldRoot, [1.8, 1.8 + (index % 3) * 0.5, 1.8], [x, 0.9 + (index % 3) * 0.25, z], index % 3 ? MATERIALS.wood : theme.accentMaterial, `crate-${floor}-${index}`, false);
  }

  addLabel(worldRoot, `VÅNING ${floor} · ${theme.name}`, [0, 6.7, -51.8], `#${theme.accent.toString(16).padStart(6, "0")}`, 4.1);
  addElevator(worldRoot, floor, theme);
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

function buildPlayerModel() {
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

  carriedLampModel = new THREE.Group();
  carriedLampModel.position.set(0.92, 2.35, 0.35);
  meshCylinder(carriedLampModel, 0.16, 0.2, 0.28, 10, [0, 0, 0], MATERIALS.darkMetal);
  meshSphere(carriedLampModel, 0.26, [0, 0.35, 0], MATERIALS.yellowGlow, 12);
  carriedLampModel.visible = false;
  group.add(carriedLampModel);
  actorRoot.add(group);
  return group;
}

function createTallMonster() {
  const group = new THREE.Group();
  meshBox(group, [1.55, 3.15, 0.95], [0, 4.35, 0], MATERIALS.brownMonster);
  meshSphere(group, 0.95, [0, 6.25, 0], MATERIALS.brownLight, 18);
  const eye = meshSphere(group, 0.31, [0, 6.37, 0.86], MATERIALS.yellowGlow, 16);
  eye.scale.set(1.15, 0.9, 0.4);
  group.userData.leftArm = limb(group, [0.42, 3.2, 0.42], [-1.08, 5.3, 0], MATERIALS.brownMonster, "leftArm");
  group.userData.rightArm = limb(group, [0.42, 3.2, 0.42], [1.08, 5.3, 0], MATERIALS.brownMonster, "rightArm");
  group.userData.leftLeg = limb(group, [0.52, 3.25, 0.56], [-0.45, 3.0, 0], MATERIALS.brownMonster, "leftLeg");
  group.userData.rightLeg = limb(group, [0.52, 3.25, 0.56], [0.45, 3.0, 0], MATERIALS.brownMonster, "rightLeg");
  meshBox(group, [0.78, 0.32, 1.25], [-0.45, 0.16, 0.22], MATERIALS.brownLight);
  meshBox(group, [0.78, 0.32, 1.25], [0.45, 0.16, 0.22], MATERIALS.brownLight);
  group.scale.setScalar(0.78);
  return group;
}

function createSpiderMonster() {
  const group = new THREE.Group();
  const body = meshSphere(group, 1.12, [0, 1.22, 0], MATERIALS.brownMonster, 18);
  body.scale.set(1.3, 0.82, 1.15);
  const head = meshSphere(group, 0.76, [0, 1.42, 1.06], MATERIALS.brownLight, 18);
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
    const upper = meshCylinder(pivot, 0.13, 0.16, 1.55, 9, [side * 0.68, -0.25, 0], MATERIALS.brownMonster);
    upper.rotation.z = side * 1.05;
    const lower = meshCylinder(pivot, 0.11, 0.13, 1.5, 9, [side * 1.37, -0.75, 0], MATERIALS.brownLight);
    lower.rotation.z = side * 0.28;
    group.userData.legs.push(pivot);
  }
  return group;
}

function createFacelessMonster() {
  const group = new THREE.Group();
  meshBox(group, [1.45, 1.75, 0.85], [0, 2.15, 0], MATERIALS.brownMonster);
  meshSphere(group, 0.68, [0, 3.55, 0], MATERIALS.brownLight, 18);
  group.userData.leftArm = limb(group, [0.38, 1.65, 0.38], [-0.93, 2.78, 0], MATERIALS.brownMonster, "leftArm");
  group.userData.rightArm = limb(group, [0.38, 1.65, 0.38], [0.93, 2.78, 0], MATERIALS.brownMonster, "rightArm");
  group.userData.leftLeg = limb(group, [0.46, 1.65, 0.5], [-0.37, 1.45, 0], MATERIALS.brownMonster, "leftLeg");
  group.userData.rightLeg = limb(group, [0.46, 1.65, 0.5], [0.37, 1.45, 0], MATERIALS.brownMonster, "rightLeg");
  meshBox(group, [0.65, 0.26, 1.05], [-0.37, 0.13, 0.18], MATERIALS.brownLight);
  meshBox(group, [0.65, 0.26, 1.05], [0.37, 0.13, 0.18], MATERIALS.brownLight);
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

function collidesAt(x, z, radius = PLAYER_RADIUS) {
  return colliders.some((wall) => (
    x + radius > wall.minX
    && x - radius < wall.maxX
    && z + radius > wall.minZ
    && z - radius < wall.maxZ
  ));
}

function moveWithCollisions(actor, dx, dz, radius = PLAYER_RADIUS) {
  const nextX = actor.x + dx;
  if (!collidesAt(nextX, actor.z, radius)) actor.x = nextX;
  const nextZ = actor.z + dz;
  if (!collidesAt(actor.x, nextZ, radius)) actor.z = nextZ;
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
      total: 10,
      text: `${state.missions.lamps.installedSocketIds.length} / 10 I ELUTTAG`,
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
    hudMessage.textContent = `TA SAK · ${state.nearby.name}`;
    hudMessage.hidden = false;
  } else {
    hudMessage.hidden = true;
  }
}

function setModeUi() {
  const playing = state.mode === "playing";
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

function returnToMenu() {
  const seed = state.seed || 333;
  state = freshState(seed);
  state.mode = "menu";
  resetInputs();
  buildFloor(1);
  setModeUi();
  updateCamera(true);
  render();
}

function winGame() {
  if (state.won) return;
  state.won = true;
  state.mode = "won";
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
  closeElevator();
  buildFloor(targetFloor);
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
      const complete = state.missions.lamps.installedSocketIds.length === 10;
      if (complete) completeMission(1);
      else {
        buildFloor(state.player.floor);
        showMessage(`${state.missions.lamps.installedSocketIds.length} AV 10 LAMPOR PÅ PLATS`, 2.2);
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
    state.missions.exit.boardsBroken = true;
    state.factory.exitBoards = "broken";
    buildFloor(state.player.floor);
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
  monster.waypoint = (monster.waypoint + 1) % PATROL_POINTS.length;
  const point = PATROL_POINTS[(monster.waypoint + MONSTER_STARTS.findIndex((item) => item.id === monster.id) * 3) % PATROL_POINTS.length];
  monster.targetX = point[0];
  monster.targetZ = point[1];
}

function monsterCanSeePlayer(monster) {
  if (typeof monster.visionOverride === "boolean") return monster.visionOverride;
  if (monster.floor !== state.player.floor) return false;
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

function moveMonsterToward(monster, targetX, targetZ, speed, dt) {
  const dx = targetX - monster.x;
  const dz = targetZ - monster.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return distance;
  const heading = Math.atan2(dx, dz);
  monster.heading = normalizeAngle(heading);
  const step = Math.min(distance, speed * dt);
  const beforeX = monster.x;
  const beforeZ = monster.z;
  moveWithCollisions(monster, dx / distance * step, dz / distance * step, monster.kind === "eight-legs" ? 0.95 : 0.72);
  if (Math.hypot(monster.x - beforeX, monster.z - beforeZ) < step * 0.18) chooseMonsterTarget(monster);
  return distance;
}

function updateSpiderSurface(monster, dt) {
  if (monster.ai === "chase") {
    monster.surface = "floor";
    monster.surfaceTimer = 4;
    return;
  }
  monster.surfaceTimer -= dt;
  if (monster.surfaceTimer > 0) return;
  monster.surface = monster.surface === "floor" ? "wall" : monster.surface === "wall" ? "ceiling" : "floor";
  monster.surfaceTimer = monster.surface === "ceiling" ? 7 : 5;
  if (monster.surface === "wall") {
    const side = monster.waypoint % 4;
    monster.targetX = side === 0 ? -50 : side === 1 ? 50 : clamp(monster.x, -46, 46);
    monster.targetZ = side === 2 ? -50 : side === 3 ? 50 : clamp(monster.z, -46, 46);
  } else chooseMonsterTarget(monster);
}

function updateMonsters(dt) {
  state.monsters.forEach((monster, index) => {
    if (monster.frozen || monster.floor !== state.player.floor) {
      monster.seesPlayer = false;
      return;
    }
    if (monster.kind === "eight-legs") updateSpiderSurface(monster, dt);
    const sees = monsterCanSeePlayer(monster);
    monster.seesPlayer = sees;
    if (sees) {
      monster.ai = "chase";
      monster.lostTime = 0;
      monster.targetX = state.player.x;
      monster.targetZ = state.player.z;
    } else if (monster.ai === "chase") {
      monster.lostTime += dt;
      if (monster.lostTime > 4.5) {
        monster.ai = "patrol";
        monster.lostTime = 0;
        chooseMonsterTarget(monster);
      }
    }

    if (monster.ai === "chase") {
      const chaseSpeed = monster.kind === "eight-legs" ? 5.35 : index === 0 ? 5.05 : 4.9;
      moveMonsterToward(monster, state.player.x, state.player.z, chaseSpeed, dt);
    } else {
      if (distance2D(monster.x, monster.z, monster.targetX, monster.targetZ) < 1.4) chooseMonsterTarget(monster);
      const patrolSpeed = monster.kind === "eight-legs" ? 3.45 : 2.75 + index * 0.18;
      moveMonsterToward(monster, monster.targetX, monster.targetZ, patrolSpeed, dt);
    }

    if (distance2D(monster.x, monster.z, state.player.x, state.player.z) < 1.35 && state.player.y < 1.6) {
      caughtByMonster(monster);
    }
  });
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
  const velocityX = (-sin * forward + cos * side) * speed;
  const velocityZ = (-cos * forward - sin * side) * speed;
  moveWithCollisions(state.player, velocityX * dt, velocityZ * dt);

  state.player.moving = magnitude > 0.08;
  state.player.sprinting = Boolean(sprint && state.player.moving);
  if (actions.jumpQueued && state.player.grounded) {
    state.player.vy = JUMP_SPEED;
    state.player.grounded = false;
  }
  actions.jumpQueued = false;
  state.player.vy -= GRAVITY * dt;
  state.player.y += state.player.vy * dt;
  if (state.player.y <= 0) {
    state.player.y = 0;
    state.player.vy = 0;
    state.player.grounded = true;
  }

  const targetFov = state.player.sprinting ? 78 : 73;
  camera.fov += (targetFov - camera.fov) * clamp(dt * 7, 0, 1);
  camera.updateProjectionMatrix();

  if (state.player.floor === 6 && state.missions.exit.boardsBroken && state.player.x > 53.4 && Math.abs(state.player.z) < 4.8) {
    winGame();
  }
}

function updateMonsterModels() {
  state.monsters.forEach((monster, index) => {
    const model = monsterModels.get(monster.id);
    if (!model) return;
    model.visible = (state.mode === "playing" || state.mode === "won") && monster.floor === state.player.floor;
    if (!model.visible) return;
    let height = 0;
    model.rotation.set(0, monster.heading, 0);
    if (monster.kind === "eight-legs") {
      if (monster.surface === "ceiling" && monster.ai !== "chase") {
        height = CEILING_HEIGHT - 0.25;
        model.rotation.z = Math.PI;
      } else if (monster.surface === "wall" && monster.ai !== "chase") {
        height = 3.2;
        model.rotation.z = monster.x < 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      (model.userData.legs || []).forEach((leg, legIndex) => {
        leg.rotation.z = Math.sin(state.elapsedMs * 0.009 + legIndex * 0.85) * 0.25;
      });
    } else {
      const walk = Math.sin(state.elapsedMs * 0.0075 + index);
      if (model.userData.leftArm) model.userData.leftArm.rotation.x = walk * 0.36;
      if (model.userData.rightArm) model.userData.rightArm.rotation.x = -walk * 0.36;
      if (model.userData.leftLeg) model.userData.leftLeg.rotation.x = -walk * 0.32;
      if (model.userData.rightLeg) model.userData.rightLeg.rotation.x = walk * 0.32;
      height = Math.abs(Math.sin(state.elapsedMs * 0.006 + index)) * 0.05;
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
  if (state.mode !== "playing") {
    updateCamera();
    return;
  }
  state.elapsedMs += dt * 1000;
  updatePlayer(dt);
  if (state.mode !== "playing") return;
  updateMonsters(dt);
  if (state.mode !== "playing") return;
  findNearbyInteractable();
  updateMonsterModels();
  updateCamera();
  updatePrompt(dt);
  updateHud();
}

function render() {
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
  winMenuButton?.addEventListener("click", returnToMenu);
  elevatorCloseButton?.addEventListener("click", closeElevator);
  fullscreenButton?.addEventListener("click", toggleFullscreen);

  window.addEventListener("keydown", (event) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
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
  const definitions = [];
  for (const [id, floor, x, z] of ENTITY_DEFS.lamps) definitions.push({ id, type: "lamp", floor, x, z });
  for (const [id, floor, x, z] of ENTITY_DEFS.levers) definitions.push({ id, type: "lever", floor, x, z });
  for (const [id, floor, x, z] of ENTITY_DEFS.keys) definitions.push({ id, type: "key", floor, x, z });
  for (let index = 0; index < 10; index += 1) {
    const column = index % 5;
    const row = Math.floor(index / 5);
    definitions.push({ id: `socket-${index + 1}`, type: "socket", floor: 1, x: -14.4 + column * 3.2, z: -46.8, row });
  }
  for (const key of ["lightSwitch", "hammer", "boards", "exit"]) {
    const [id, floor, x, z] = ENTITY_DEFS[key];
    definitions.push({ id, type: key, floor, x, z });
  }
  for (let floor = 1; floor <= FLOOR_COUNT; floor += 1) {
    definitions.push({ id: `elevator-${floor}`, type: "elevator", floor, x: 5.1, z: 42.4 });
    if (floor < FLOOR_COUNT) definitions.push({ id: `stairs-up-${floor}`, type: "stair-up", floor, x: -43, z: 40 });
    if (floor > 1) definitions.push({ id: `stairs-down-${floor}`, type: "stair-down", floor, x: -32, z: 40 });
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
    state.missions.lamps.installedSocketIds = Array.from({ length: 10 }, (_, index) => `socket-${index + 1}`);
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
    coordinateSystem: "Each floor has local y=0. x increases east/right, z increases south; yaw 0 looks north (-z).",
    world: {
      kind: "giant seven-floor factory",
      floors: FLOOR_COUNT,
      currentFloor: state.player.floor,
      currentFloorName: FLOOR_THEMES[state.player.floor - 1].name,
      sizePerFloorMeters: MAP_HALF * 2,
      worldRevision,
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
      perspective: "first-person 3D",
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
    })),
    overlays: { elevator: state.elevatorOpen, win: state.mode === "won", menu: state.mode === "menu" },
    controls: {
      keyboard: "WASD move, drag to look, Shift sprint, E take/use, Space jump, F fullscreen",
      touch: "left joystick move, drag world to look, SPRING hold, TA SAK, HOPPA",
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
  snapshot: () => JSON.parse(renderGameToText()),
  setPlayerPose: ({ floor = state.player.floor, x = state.player.x, y = 0, z = state.player.z, yaw = state.player.yaw, pitch = state.player.pitch } = {}) => {
    state.player.floor = clamp(Math.floor(floor), 1, FLOOR_COUNT);
    state.player.x = x;
    state.player.y = y;
    state.player.z = z;
    state.player.yaw = yaw;
    state.player.pitch = pitch;
    state.player.vy = 0;
    buildFloor(state.player.floor);
    updateCamera(true);
    render();
  },
  setEntityPose: (id, { floor, x, z, surface } = {}) => {
    const monster = state.monsters.find((item) => item.id === id);
    if (!monster) return false;
    if (Number.isFinite(floor)) monster.floor = clamp(Math.floor(floor), 1, FLOOR_COUNT);
    if (Number.isFinite(x)) monster.x = x;
    if (Number.isFinite(z)) monster.z = z;
    if (surface) monster.surface = surface;
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
  setVisionOverride: (id, value = null) => {
    const monster = state.monsters.find((item) => item.id === id);
    if (!monster) return false;
    monster.visionOverride = typeof value === "boolean" ? value : null;
    return true;
  },
  placePlayerNear: testPlacePlayerNear,
  triggerInteract: interact,
  selectElevatorFloor: (floor) => changeFloor(Number(floor), "elevator"),
  setMission: setupMissionForTest,
  getEntityCatalog: allEntityDefinitions,
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
