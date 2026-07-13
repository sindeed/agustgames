"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const VIEW_W = 1024;
const VIEW_H = 768;
const GRID_COLS = 9;
const GRID_ROWS = 9;
const TILE = 54;
const BOARD_X = 214;
const BOARD_Y = 88;
const BOARD_W = GRID_COLS * TILE;
const BOARD_H = GRID_ROWS * TILE;
const VIEW3D_X = 30;
const VIEW3D_Y = 88;
const VIEW3D_W = 670;
const VIEW3D_H = 486;
const VIEW3D_COLS = 268;
const VIEW3D_FOV = Math.PI / 3;
const VIEW3D_CAMERA_HEIGHT = 0.54;
const VIEW3D_WALL_HEIGHT = 1.08;
const VIEW3D_NEAR = 0.08;
const VIEW3D_MAX_DISTANCE = 20;
const SINGLE_VIEW = { x: VIEW3D_X, y: VIEW3D_Y, w: VIEW3D_W, h: VIEW3D_H, cols: VIEW3D_COLS };
const SPLIT_VIEWS = [
  { x: VIEW3D_X, y: VIEW3D_Y, w: VIEW3D_W, h: 239, cols: 210 },
  { x: VIEW3D_X, y: 335, w: VIEW3D_W, h: 239, cols: 210 },
];
const HOTBAR_SLOTS = 10;
const DAY_LENGTH = 60;
const NIGHT_LENGTH = 30;
const ENEMY_ATTACK_INTERVAL = 1;
const ENEMY_REWARD = 2;
const BOSS_REWARD = 4;
const PLAYER_CHASE_RANGE = 2;
const ARROW_SHOT_INTERVAL = 3;
const ARROW_DAMAGE = 0.5;
const SKELETON_ATTACK_INTERVAL = 1;
const SKELETON_DAMAGE = 0.5;
const SKELETON_HP = 0.5;
const LOOK_YAW_SENSITIVITY = 0.0055;
const LOOK_PITCH_SENSITIVITY = 0.0035;
const MAX_LOOK_PITCH = 0.32;

const FREEWAR_BASE_DEFS = [
  {
    id: 1,
    name: "Din bas",
    heart: { c: 7, r: 7 },
    spawn: { c: 7, r: 8 },
    dir: "down",
    walls: [{ c: 6, r: 6 }, { c: 7, r: 6 }, { c: 8, r: 6 }, { c: 6, r: 7 }, { c: 8, r: 7 }, { c: 6, r: 8 }],
  },
  {
    id: 2,
    name: "Norr",
    heart: { c: 7, r: 1 },
    spawn: { c: 7, r: 2 },
    dir: "down",
    walls: [{ c: 6, r: 0 }, { c: 7, r: 0 }, { c: 8, r: 0 }, { c: 6, r: 1 }, { c: 8, r: 1 }, { c: 6, r: 2 }],
  },
  {
    id: 3,
    name: "Söder",
    heart: { c: 7, r: 13 },
    spawn: { c: 7, r: 12 },
    dir: "up",
    walls: [{ c: 6, r: 12 }, { c: 6, r: 13 }, { c: 8, r: 13 }, { c: 6, r: 14 }, { c: 7, r: 14 }, { c: 8, r: 14 }],
  },
  {
    id: 4,
    name: "Öster",
    heart: { c: 13, r: 7 },
    spawn: { c: 12, r: 7 },
    dir: "left",
    walls: [{ c: 12, r: 6 }, { c: 13, r: 6 }, { c: 14, r: 6 }, { c: 14, r: 7 }, { c: 13, r: 8 }, { c: 14, r: 8 }],
  },
  {
    id: 5,
    name: "Väster",
    heart: { c: 1, r: 7 },
    spawn: { c: 2, r: 7 },
    dir: "right",
    walls: [{ c: 0, r: 6 }, { c: 1, r: 6 }, { c: 2, r: 6 }, { c: 0, r: 7 }, { c: 0, r: 8 }, { c: 1, r: 8 }],
  },
  {
    id: 6,
    name: "Nordost",
    heart: { c: 10, r: 4 },
    spawn: { c: 9, r: 4 },
    dir: "left",
    walls: [{ c: 9, r: 3 }, { c: 10, r: 3 }, { c: 11, r: 3 }, { c: 11, r: 4 }, { c: 11, r: 5 }],
  },
  {
    id: 7,
    name: "Sydost",
    heart: { c: 10, r: 10 },
    spawn: { c: 10, r: 9 },
    dir: "up",
    walls: [{ c: 11, r: 9 }, { c: 11, r: 10 }, { c: 9, r: 11 }, { c: 10, r: 11 }, { c: 11, r: 11 }],
  },
  {
    id: 8,
    name: "Sydväst",
    heart: { c: 4, r: 10 },
    spawn: { c: 5, r: 10 },
    dir: "right",
    walls: [{ c: 3, r: 9 }, { c: 3, r: 10 }, { c: 3, r: 11 }, { c: 4, r: 11 }, { c: 5, r: 11 }],
  },
  {
    id: 9,
    name: "Nordväst",
    heart: { c: 4, r: 4 },
    spawn: { c: 4, r: 5 },
    dir: "down",
    walls: [{ c: 3, r: 3 }, { c: 4, r: 3 }, { c: 5, r: 3 }, { c: 3, r: 4 }, { c: 3, r: 5 }],
  },
];

function createFreewarArenaRows() {
  const chunkMask = ["..#..", ".###.", "#####", ".###.", "..#.."];
  const cells = Array.from({ length: 15 }, () => Array(15).fill("V"));
  for (let chunkR = 0; chunkR < chunkMask.length; chunkR += 1) {
    for (let chunkC = 0; chunkC < chunkMask[chunkR].length; chunkC += 1) {
      if (chunkMask[chunkR][chunkC] !== "#") continue;
      for (let innerR = 0; innerR < 3; innerR += 1) {
        for (let innerC = 0; innerC < 3; innerC += 1) {
          cells[chunkR * 3 + innerR][chunkC * 3 + innerC] = ".";
        }
      }
    }
  }
  for (const base of FREEWAR_BASE_DEFS) {
    for (const wall of base.walls) cells[wall.r][wall.c] = "V";
  }
  return cells.map((row) => row.join(""));
}

const WORLD_DEFS = [
  {
    id: 1,
    name: "Värld 1",
    rows: [
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
    ],
    heartStart: { c: 7, r: 5 },
    playerStarts: [{ c: 8, r: 8 }, { c: 7, r: 8 }],
    portal: { c: 0, r: 0 },
    nextWorld: 2,
    spawns: {
      f1: { c: 8, r: 0, label: "F", color: "#ef4444" },
      f2: { c: 0, r: 0, label: "F2", color: "#f97316" },
    },
  },
  {
    id: 2,
    name: "Värld 2",
    rows: [
      "VVVVVVVVV",
      "VVVFAAAFV",
      "VVVLLALLV",
      "VVVVLALVV",
      "VVVVLALVV",
      "H..VVAVeV",
      "...AAAeVV",
      "...VVVVVV",
      "S..VVVVVV",
    ],
    heartStart: { c: 0, r: 5 },
    playerStarts: [{ c: 0, r: 8 }, { c: 1, r: 8 }],
    portal: { c: 2, r: 8 },
    nextWorld: null,
    spawns: {
      f1: { c: 7, r: 1, label: "F1", color: "#ef4444" },
      f2: { c: 3, r: 1, label: "F2", color: "#f97316" },
    },
  },
  {
    id: 3,
    name: "Freewar",
    rows: createFreewarArenaRows(),
    heartStart: { ...FREEWAR_BASE_DEFS[0].heart },
    playerStarts: [{ ...FREEWAR_BASE_DEFS[0].spawn }],
    portal: null,
    nextWorld: null,
    spawns: {},
    freewar: true,
    baseDefs: FREEWAR_BASE_DEFS,
  },
];
const WORLDS = Object.fromEntries(WORLD_DEFS.map((world) => [world.id, createWorldConfig(world)]));

const PRICES = {
  wood: 5,
  stone: 15,
  arrow: 20,
  healer: 2,
  heartHeal: 30,
  sword: 40,
};

const FREEWAR_PRICES = {
  wood: 5,
  stone: 5,
  arrow: 20,
  lava: 20,
  lavaBlocker: 20,
  sword: 40,
};

const BLOCKS = {
  wood: { name: "Trä", hp: 5, color: "#c46b34", light: "#e89d58", dark: "#7e3f1f" },
  stone: { name: "Sten", hp: 10, color: "#8d99a6", light: "#c7d0d9", dark: "#535f69" },
  arrow: { name: "Pilar", hp: 5, color: "#38bdf8", light: "#bae6fd", dark: "#075985" },
};

const ITEMS = {
  healer: { name: "Healerdryck", color: "#fb7185", light: "#fecdd3", dark: "#be123c" },
  lava: { name: "Lava", color: "#f97316", light: "#fde047", dark: "#991b1b" },
  lavaBlocker: { name: "Lavablockare", color: "#67e8f9", light: "#ecfeff", dark: "#155e75" },
};

const DIRS = [
  { dx: 0, dy: -1, name: "up" },
  { dx: 1, dy: 0, name: "right" },
  { dx: 0, dy: 1, name: "down" },
  { dx: -1, dy: 0, name: "left" },
];
const ATTACK_OFFSETS = [
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
];

function tileRadius(a, b) {
  return Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));
}

let uiButtons = [];
let joystickZones = [];
const activeJoysticks = new Map();
const activeLookDrags = new Map();
const firstPersonDepthBuffers = [
  new Float32Array(VIEW3D_COLS),
  new Float32Array(VIEW3D_COLS),
];
let lastTime = 0;
let dpr = 1;

function clearActiveControls() {
  activeJoysticks.clear();
  activeLookDrags.clear();
}

const state = {
  mode: "menu",
  gameKind: "survival",
  menuPage: "main",
  freewarBotCount: null,
  freewar: null,
  lavaKeys: new Set(),
  world: 1,
  playersWanted: 1,
  botPlayerId: null,
  botTargetEnemyId: null,
  botGoal: null,
  message: "Välj hur många som spelar.",
  messageTimer: 0,
  day: 1,
  phase: "day",
  phaseElapsed: 0,
  spawnCursor: 0,
  bossSpawned: false,
  portalOpen: false,
  activeTool: "none",
  shopOpen: false,
  money: 10,
  hasSword: false,
  selectedSlot: 0,
  inventory: [],
  players: [],
  heart: { c: 7, r: 5, hp: 3, maxHp: 3 },
  blocks: new Map(),
  enemies: [],
  skeletons: [],
  projectiles: [],
  nextEnemyId: 1,
  nextSkeletonId: 1,
};

function resizeCanvas() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const ratio = VIEW_W / VIEW_H;
  let cssW = window.innerWidth;
  let cssH = window.innerHeight;

  if (cssW / cssH > ratio) {
    cssW = cssH * ratio;
  } else {
    cssH = cssW / ratio;
  }

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(VIEW_W * dpr);
  canvas.height = Math.round(VIEW_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function key(c, r) {
  return `${c},${r}`;
}

function createWorldConfig(world) {
  const terrainWalls = [];
  const lava = [];
  const noBuild = [];
  const skeletonTriggers = [];
  const buildableKeys = new Set();

  for (let r = 0; r < world.rows.length; r += 1) {
    for (let c = 0; c < world.rows[r].length; c += 1) {
      const mark = world.rows[r][c];
      const tileKey = key(c, r);
      if (mark === "V") {
        terrainWalls.push({ c, r });
      } else if (mark === "L") {
        lava.push({ c, r });
        noBuild.push({ c, r });
      } else if (mark === "A" || mark === "F" || mark === "e") {
        noBuild.push({ c, r });
        if (mark === "e") skeletonTriggers.push({ c, r });
      } else {
        buildableKeys.add(tileKey);
      }
    }
  }

  const spawnList = Object.values(world.spawns);
  const spawnKeys = new Set(spawnList.map((spawn) => key(spawn.c, spawn.r)));
  for (const spawn of spawnList) {
    buildableKeys.delete(key(spawn.c, spawn.r));
  }

  return {
    ...world,
    gridCols: Math.max(...world.rows.map((row) => row.length)),
    gridRows: world.rows.length,
    days: 5,
    terrainWalls,
    wallKeys: new Set(terrainWalls.map((cell) => key(cell.c, cell.r))),
    baseWallKeys: new Set((world.baseDefs || []).flatMap((base) => base.walls.map((cell) => key(cell.c, cell.r)))),
    lava,
    lavaKeys: new Set(lava.map((cell) => key(cell.c, cell.r))),
    noBuild,
    noBuildKeys: new Set(noBuild.map((cell) => key(cell.c, cell.r))),
    skeletonTriggers,
    skeletonTriggerKeys: new Set(skeletonTriggers.map((cell) => key(cell.c, cell.r))),
    buildableKeys,
    spawnList,
    spawnKeys,
  };
}

function currentWorld() {
  return WORLDS[state.world] || WORLDS[1];
}

function gridDimensions() {
  const world = currentWorld();
  return { cols: world.gridCols || GRID_COLS, rows: world.gridRows || GRID_ROWS };
}

function boardTransform() {
  const { cols, rows } = gridDimensions();
  const logicalW = cols * TILE;
  const logicalH = rows * TILE;
  const scale = Math.min(1, BOARD_W / logicalW, BOARD_H / logicalH);
  return {
    x: BOARD_X + (BOARD_W - logicalW * scale) / 2,
    y: BOARD_Y + (BOARD_H - logicalH * scale) / 2,
    w: logicalW * scale,
    h: logicalH * scale,
    logicalW,
    logicalH,
    scale,
  };
}

function withBoardTransform(draw) {
  const transform = boardTransform();
  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.scale, transform.scale);
  ctx.translate(-BOARD_X, -BOARD_Y);
  draw();
  ctx.restore();
}

function inBounds(c, r) {
  const { cols, rows } = gridDimensions();
  return c >= 0 && c < cols && r >= 0 && r < rows;
}

function isTerrainWall(c, r) {
  return currentWorld().wallKeys.has(key(c, r));
}

function isBaseWall(c, r) {
  return currentWorld().baseWallKeys.has(key(c, r));
}

function isBuildableGround(c, r) {
  return currentWorld().buildableKeys.has(key(c, r));
}

function isLava(c, r) {
  return state.lavaKeys.has(key(c, r));
}

function lavaCells() {
  return Array.from(state.lavaKeys, (cellKey) => {
    const [c, r] = cellKey.split(",").map(Number);
    return { c, r };
  });
}

function isSpawnCell(c, r) {
  return currentWorld().spawnKeys.has(key(c, r));
}

function isFreewarBaseSpawnCell(c, r) {
  return isFreewar() && currentWorld().baseDefs.some((base) => base.spawn.c === c && base.spawn.r === r);
}

function isSkeletonTrigger(c, r) {
  return currentWorld().skeletonTriggerKeys.has(key(c, r));
}

function sameCell(a, b) {
  return a.c === b.c && a.r === b.r;
}

function manhattan(a, b) {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
}

function centerOf(c, r) {
  return {
    x: BOARD_X + c * TILE + TILE / 2,
    y: BOARD_Y + r * TILE + TILE / 2,
  };
}

function cellFromPoint(x, y) {
  const transform = boardTransform();
  if (x < transform.x || y < transform.y || x >= transform.x + transform.w || y >= transform.y + transform.h) {
    return null;
  }
  return {
    c: Math.floor((x - transform.x) / (TILE * transform.scale)),
    r: Math.floor((y - transform.y) / (TILE * transform.scale)),
  };
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawText(text, x, y, size = 20, color = "#fff", align = "left", weight = "700") {
  ctx.font = `${weight} ${size}px Segoe UI, Tahoma, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function pushButton(id, x, y, w, h, label, color, options = {}) {
  uiButtons.push({
    id,
    x,
    y,
    w,
    h,
    label,
    color,
    disabled: !!options.disabled,
    textColor: options.textColor || "#111827",
    small: !!options.small,
    outline: options.outline || null,
  });
}

function drawButton(button) {
  ctx.save();
  ctx.globalAlpha = button.disabled ? 0.45 : 1;
  ctx.fillStyle = button.color;
  roundRect(button.x, button.y, button.w, button.h, 7);
  ctx.fill();
  ctx.lineWidth = button.outline ? 4 : 2;
  ctx.strokeStyle = button.outline || "rgba(255,255,255,0.35)";
  ctx.stroke();
  drawText(
    button.label,
    button.x + button.w / 2,
    button.y + button.h / 2,
    button.small ? 16 : 19,
    button.textColor,
    "center",
    "800",
  );
  ctx.restore();
}

function setMessage(text, seconds = 2.8) {
  state.message = text;
  state.messageTimer = seconds;
}

function startGame(playersWanted, worldId = 1, botPlayerId = null) {
  state.gameKind = "survival";
  state.freewar = null;
  state.menuPage = "main";
  state.freewarBotCount = null;
  setupWorld(worldId, playersWanted, false, botPlayerId);
}

function setupWorld(worldId, playersWanted, keepProgress = false, botPlayerId = null) {
  const world = WORLDS[worldId] || WORLDS[1];
  state.mode = "playing";
  state.world = world.id;
  state.playersWanted = playersWanted;
  state.botPlayerId = botPlayerId;
  state.botTargetEnemyId = null;
  state.botGoal = null;
  state.day = 1;
  state.phase = "day";
  state.phaseElapsed = 0;
  state.spawnCursor = 0;
  state.bossSpawned = false;
  state.portalOpen = false;
  state.activeTool = "none";
  state.shopOpen = false;
  if (!keepProgress) {
    state.money = 10;
    state.hasSword = false;
    state.selectedSlot = 0;
    state.inventory = [];
  }
  state.blocks = new Map();
  state.lavaKeys = new Set(world.lavaKeys);
  state.enemies = [];
  state.skeletons = [];
  state.projectiles = [];
  state.nextEnemyId = 1;
  state.nextSkeletonId = 1;
  state.heart = { c: world.heartStart.c, r: world.heartStart.r, hp: 3, maxHp: 3 };
  state.players = [];
  clearActiveControls();

  for (let i = 0; i < playersWanted; i += 1) {
    const start = world.playerStarts[i] || world.playerStarts[0];
    const startDir = i === 0 && playersWanted === 1 ? "left" : "up";
    state.players.push({
      id: i + 1,
      c: start.c,
      r: start.r,
      hp: 3,
      maxHp: 3,
      dir: startDir,
      lookYaw: angleFromDir(startDir),
      lookPitch: 0,
      isBot: i + 1 === botPlayerId,
      botMoveTimer: 0,
      attackCooldown: 0,
      stepCooldown: 0,
      color: i === 0 ? "#37d3ff" : "#ffd447",
      dark: i === 0 ? "#0e7490" : "#b45309",
    });
  }

  setMessage(`${world.name}: dag 1. Bygg basen runt hjärtat.`, 4);
}

function isFreewar() {
  return state.gameKind === "freewar";
}

function startFreewar(botCount) {
  setupWorld(3, 1, false, null);
  const world = currentWorld();
  const selectedBases = [world.baseDefs[0], ...world.baseDefs.slice(1, botCount + 1)];
  const colors = [
    ["#37d3ff", "#0e7490"],
    ["#f97316", "#9a3412"],
    ["#a855f7", "#6b21a8"],
    ["#22c55e", "#166534"],
    ["#f43f5e", "#9f1239"],
    ["#eab308", "#854d0e"],
    ["#14b8a6", "#115e59"],
    ["#ec4899", "#9d174d"],
    ["#6366f1", "#3730a3"],
  ];

  state.gameKind = "freewar";
  state.menuPage = "main";
  state.freewarBotCount = botCount;
  state.playersWanted = botCount + 1;
  state.botPlayerId = botCount > 0 ? 2 : null;
  state.day = 1;
  state.phase = "day";
  state.phaseElapsed = 0;
  state.portalOpen = false;
  state.shopOpen = false;
  state.activeTool = "none";
  state.money = 10;
  state.hasSword = false;
  state.selectedSlot = 0;
  state.inventory = [];
  state.blocks = new Map();
  state.lavaKeys = new Set();
  state.projectiles = [];
  state.enemies = [];
  state.skeletons = [];
  state.freewar = {
    botCount,
    winnerId: null,
    spectating: false,
    hearts: selectedBases.map((base, index) => ({
      id: index + 1,
      ownerId: index + 1,
      baseId: base.id,
      name: base.name,
      c: base.heart.c,
      r: base.heart.r,
      hp: 3,
      maxHp: 3,
    })),
  };
  state.heart = state.freewar.hearts[0];
  state.players = selectedBases.map((base, index) => {
    const id = index + 1;
    return {
      id,
      baseId: base.id,
      c: base.spawn.c,
      r: base.spawn.r,
      spawnC: base.spawn.c,
      spawnR: base.spawn.r,
      hp: 3,
      maxHp: 3,
      dir: base.dir,
      lookYaw: angleFromDir(base.dir),
      lookPitch: 0,
      isBot: id !== 1,
      eliminated: false,
      botMoveTimer: 0,
      botBuildTimer: 0.25 + index * 0.08,
      botBuildIndex: 0,
      botTargetId: null,
      botGoal: null,
      attackCooldown: 0,
      stepCooldown: 0,
      color: colors[index][0],
      dark: colors[index][1],
    };
  });
  clearActiveControls();
  setMessage(`${botCount} botar bygger.`, 6);
}

function isDay() {
  return state.phase === "day";
}

function phaseLength() {
  if (isFreewar()) return 60;
  return isDay() ? DAY_LENGTH : NIGHT_LENGTH;
}

function phaseRemaining() {
  return Math.max(0, phaseLength() - state.phaseElapsed);
}

function currentStack() {
  return state.inventory[state.selectedSlot] || null;
}

function itemName(type) {
  return BLOCKS[type]?.name || ITEMS[type]?.name || type;
}

function priceFor(type) {
  return (isFreewar() ? FREEWAR_PRICES : PRICES)[type];
}

function hasInventory(type) {
  return state.inventory.some((stack) => stack.type === type && stack.count > 0);
}

function addInventory(type, amount = 1) {
  const existing = state.inventory.find((stack) => stack.type === type);
  if (existing) {
    existing.count += amount;
    state.selectedSlot = state.inventory.indexOf(existing);
    return true;
  }
  if (state.inventory.length >= HOTBAR_SLOTS) {
    setMessage("Lilla gallerian är full.", 2.5);
    return false;
  }
  state.inventory.push({ type, count: amount });
  state.selectedSlot = state.inventory.length - 1;
  return true;
}

function removeInventory(type, amount = 1) {
  const index = state.inventory.findIndex((stack) => stack.type === type);
  if (index === -1) {
    return false;
  }
  state.inventory[index].count -= amount;
  if (state.inventory[index].count <= 0) {
    state.inventory.splice(index, 1);
    state.selectedSlot = Math.max(0, Math.min(state.selectedSlot, state.inventory.length - 1));
  }
  return true;
}

function buy(type) {
  if (!isDay()) {
    setMessage("Blockshop är stängd på natten.", 2);
    return;
  }

  if (type === "heartHeal") {
    buyHeartHeal();
    return;
  }

  if (type === "sword") {
    const swordPrice = priceFor("sword");
    if (state.hasSword) {
      setMessage("Ni har redan svärdet.", 2);
      return;
    }
    if (state.money < swordPrice) {
      setMessage(`Svärdet kostar ${swordPrice} kronor.`, 2);
      return;
    }
    state.money -= swordPrice;
    state.hasSword = true;
    setMessage(isFreewar() ? "Svärd köpt! Du slår hårdare på natten." : "Svärd köpt! Bossen kan skadas.", 3);
    return;
  }

  const price = priceFor(type);
  if (!Number.isFinite(price)) return;
  if (state.money < price) {
    setMessage(`${itemName(type)} kostar ${price} kronor.`, 2);
    return;
  }
  if (addInventory(type, 1)) {
    state.money -= price;
    setMessage(`${itemName(type)} köpt.`, 1.6);
  }
}

function buyHeartHeal() {
  if (state.heart.hp >= state.heart.maxHp) {
    setMessage("Hjärtat har redan fullt liv.", 2);
    return;
  }
  if (state.money < PRICES.heartHeal) {
    setMessage("Hjärtmedicin kostar 30 kronor.", 2);
    return;
  }
  state.money -= PRICES.heartHeal;
  state.heart.hp = state.heart.maxHp;
  setMessage("Hjärtat helades helt.", 2.2);
}

function sellSelectedItem() {
  const stack = currentStack();
  if (!stack) {
    setMessage("Välj något i lilla gallerian först.", 2);
    return;
  }
  if (!BLOCKS[stack.type] && !["healer", "lava", "lavaBlocker"].includes(stack.type)) {
    setMessage("Det går inte att sälja den saken.", 2);
    return;
  }
  removeInventory(stack.type, 1);
  state.money += priceFor(stack.type);
  setMessage(`${itemName(stack.type)} såld.`, 1.6);
}

function useHealerPotion() {
  if (!hasInventory("healer")) {
    setMessage("Köp en healerdryck först.", 2);
    return;
  }

  const target = state.players
    .filter((player) => player.hp > 0 && player.hp < player.maxHp)
    .sort((a, b) => a.hp - b.hp)[0];

  if (!target) {
    setMessage("Alla spelare har fullt liv.", 2);
    return;
  }

  target.hp = target.maxHp;
  removeInventory("healer", 1);
  setMessage(`Spelare ${target.id} helades helt.`, 2.2);
}

function activeHearts() {
  if (isFreewar()) return state.freewar?.hearts || [];
  return state.heart ? [state.heart] : [];
}

function heartAt(c, r) {
  return activeHearts().find((heart) => heart.c === c && heart.r === r) || null;
}

function heartForPlayer(playerId) {
  return activeHearts().find((heart) => heart.ownerId === playerId) || null;
}

function canBuildAt(c, r) {
  if (!inBounds(c, r)) return false;
  if (isTerrainWall(c, r)) return false;
  if (!isBuildableGround(c, r)) return false;
  if (state.blocks.has(key(c, r))) return false;
  if (heartAt(c, r)) return false;
  if (isSpawnCell(c, r)) return false;
  if (isFreewarBaseSpawnCell(c, r)) return false;
  if (state.players.some((player) => player.c === c && player.r === r)) return false;
  if (state.enemies.some((enemy) => enemy.c === c && enemy.r === r)) return false;
  if (state.skeletons.some((skeleton) => skeleton.c === c && skeleton.r === r)) return false;
  if (state.portalOpen && sameCell({ c, r }, currentWorld().portal)) return false;
  return true;
}

function groundRouteToHeartExists(start) {
  const attackCells = new Set(
    DIRS
      .map((dir) => ({ c: state.heart.c + dir.dx, r: state.heart.r + dir.dy }))
      .filter((cell) => inBounds(cell.c, cell.r))
      .filter((cell) => !isTerrainWall(cell.c, cell.r))
      .filter((cell) => !isLava(cell.c, cell.r))
      .filter((cell) => !state.blocks.has(key(cell.c, cell.r)))
      .map((cell) => key(cell.c, cell.r)),
  );
  if (attackCells.size === 0) return false;

  const startKey = key(start.c, start.r);
  const queue = [{ c: start.c, r: start.r }];
  const visited = new Set([startKey]);

  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    if (attackCells.has(key(current.c, current.r))) return true;

    for (const dir of DIRS) {
      const c = current.c + dir.dx;
      const r = current.r + dir.dy;
      const cellKey = key(c, r);
      if (visited.has(cellKey)) continue;
      if (!inBounds(c, r) || isTerrainWall(c, r) || isLava(c, r)) continue;
      if (state.blocks.has(cellKey) || sameCell({ c, r }, state.heart)) continue;
      visited.add(cellKey);
      queue.push({ c, r });
    }
  }
  return false;
}

function allGroundEnemyRoutesOpen() {
  const sources = [
    ...currentWorld().spawnList,
    ...state.enemies.filter((enemy) => enemy.type !== "flying"),
  ];
  const uniqueSources = new Map(sources.map((source) => [key(source.c, source.r), source]));
  return Array.from(uniqueSources.values()).every(groundRouteToHeartExists);
}

function placeBlock(c, r) {
  const stack = currentStack();
  if (!isDay()) {
    setMessage("Man bygger bara på dagen.", 2);
    return;
  }
  if (!stack) {
    setMessage("Köp eller välj ett block först.", 2);
    return;
  }
  if (isFreewar() && stack.type === "lavaBlocker") {
    if (!isLava(c, r)) {
      setMessage("Lavablockaren måste läggas på lava.", 2);
      return;
    }
    state.lavaKeys.delete(key(c, r));
    removeInventory("lavaBlocker", 1);
    setMessage("Lavan försvann!", 1.8);
    return;
  }
  if (isFreewar() && stack.type === "lava") {
    if (!canBuildAt(c, r) || isLava(c, r)) {
      setMessage("Där kan lavan inte läggas.", 1.8);
      return;
    }
    state.lavaKeys.add(key(c, r));
    removeInventory("lava", 1);
    setMessage("Lava utlagd.", 1.8);
    return;
  }
  if (!BLOCKS[stack.type]) {
    setMessage("Välj ett byggblock, inte en dryck.", 2);
    return;
  }
  if (!canBuildAt(c, r)) {
    setMessage("Där kan blocket inte stå.", 1.8);
    return;
  }
  const info = BLOCKS[stack.type];
  const blockKey = key(c, r);
  const replacedLava = isFreewar() && isLava(c, r);
  if (replacedLava) state.lavaKeys.delete(blockKey);
  state.blocks.set(blockKey, {
    type: stack.type,
    ownerId: isFreewar() ? 1 : null,
    hp: info.hp,
    maxHp: info.hp,
    shootTimer: stack.type === "arrow" ? 0 : undefined,
    shotFlash: 0,
  });
  if (!isFreewar() && !allGroundEnemyRoutesOpen()) {
    state.blocks.delete(blockKey);
    if (replacedLava) state.lavaKeys.add(blockKey);
    setMessage("Block bort – fri väg krävs!", 3);
    return;
  }
  removeInventory(stack.type, 1);
}

function deleteBlock(c, r) {
  if (!isDay()) {
    setMessage("Man raderar bara på dagen.", 2);
    return;
  }
  const blockKey = key(c, r);
  const block = state.blocks.get(blockKey);
  if (!block) return;
  if (isFreewar() && block.ownerId !== 1) {
    setMessage("Du kan bara radera dina egna Freewar-block.", 2);
    return;
  }
  if (addInventory(block.type, 1)) {
    state.blocks.delete(blockKey);
    setMessage("Blocket gick tillbaka till lilla gallerian.", 1.8);
  }
}

function moveHeart(c, r) {
  if (isFreewar()) {
    setMessage("Hjärtana stannar i sina Freewar-baser.", 2);
    return;
  }
  if (!isDay()) {
    setMessage("Hjärtat flyttas bara på dagen.", 2);
    return;
  }
  if (!canBuildAt(c, r)) {
    setMessage("Hjärtat får inte ligga där.", 1.8);
    return;
  }
  state.heart.c = c;
  state.heart.r = r;
  setMessage("Hjärtat flyttat.", 1.8);
}

function playerAt(c, r) {
  return state.players.find((player) => player.c === c && player.r === r && player.hp > 0) || null;
}

function enemyAt(c, r) {
  return state.enemies.find((enemy) => enemy.c === c && enemy.r === r) || null;
}

function skeletonAt(c, r) {
  return state.skeletons.find((skeleton) => skeleton.c === c && skeleton.r === r && skeleton.hp > 0) || null;
}

function isPlayerBlocked(c, r, playerId) {
  if (!inBounds(c, r)) return true;
  if (isTerrainWall(c, r)) return true;
  if (state.blocks.has(key(c, r))) return true;
  if (isFreewar() && heartAt(c, r)) return true;
  if (state.players.some((player) => !player.eliminated && player.id !== playerId && player.c === c && player.r === r)) return true;
  return false;
}

function dirFromName(name) {
  return DIRS.find((dir) => dir.name === name) || DIRS[0];
}

function angleFromDir(name) {
  if (name === "right") return 0;
  if (name === "down") return Math.PI / 2;
  if (name === "left") return Math.PI;
  return -Math.PI / 2;
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function cameraAngleFor(player) {
  return Number.isFinite(player?.lookYaw) ? player.lookYaw : angleFromDir(player?.dir);
}

function forwardDirectionFor(player) {
  const angle = cameraAngleFor(player);
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  if (Math.abs(x) >= Math.abs(y)) {
    return x >= 0 ? DIRS[1] : DIRS[3];
  }
  return y >= 0 ? DIRS[2] : DIRS[0];
}

function movePlayerForward(player) {
  if (!player || (isFreewar() && player.eliminated)) return;
  const direction = forwardDirectionFor(player);
  tryMovePlayer(player, direction.dx, direction.dy);
}

function turnPlayerView(player, amount) {
  if (!player || (isFreewar() && player.eliminated)) return;
  player.lookYaw = normalizeAngle(cameraAngleFor(player) + amount);
  player.dir = forwardDirectionFor(player).name;
}

function isMapView() {
  return state.shopOpen || state.activeTool !== "none" || (isFreewar() && state.freewar?.spectating);
}

function usesSplitScreen() {
  return state.playersWanted > 1 && state.players.length > 1 && !state.botPlayerId;
}

function firstPersonViewFor(playerId) {
  if (!usesSplitScreen()) return SINGLE_VIEW;
  return SPLIT_VIEWS[playerId - 1] || SPLIT_VIEWS[0];
}

function firstPersonViewEntries() {
  return state.players.filter((player) => !player.isBot).map((player) => ({
    player,
    view: firstPersonViewFor(player.id),
    depth: firstPersonDepthBuffers[player.id - 1] || firstPersonDepthBuffers[0],
  }));
}

function updateJoystick(pointerId, point) {
  const joystick = activeJoysticks.get(pointerId);
  if (!joystick) return;
  const rawDx = point.x - joystick.centerX;
  const rawDy = point.y - joystick.centerY;
  const player = state.players[joystick.playerId - 1];
  if (player && !player.isBot) {
    const forwardAmount = Math.max(0, -rawDy);
    joystick.knobX = joystick.centerX;
    joystick.knobY = joystick.centerY - Math.min(34, forwardAmount);
    joystick.forwardActive = rawDy < -14 && -rawDy >= Math.abs(rawDx);
    joystick.direction = joystick.forwardActive ? forwardDirectionFor(player) : null;
    return;
  }
  joystick.direction = null;
}

function movePlayersFromJoysticks() {
  if (state.mode !== "playing" || isMapView()) return;
  for (const joystick of activeJoysticks.values()) {
    const player = state.players[joystick.playerId - 1];
    if (!player || !joystick.direction) continue;
    joystick.direction = forwardDirectionFor(player);
    movePlayerForward(player);
  }
}

function tryMovePlayer(player, dx, dy) {
  if (state.mode !== "playing" || state.shopOpen) return;
  if (player.stepCooldown > 0) return;

  const direction = DIRS.find((dir) => dir.dx === dx && dir.dy === dy);
  if (direction) player.dir = direction.name;

  const nextC = player.c + dx;
  const nextR = player.r + dy;
  if (isPlayerBlocked(nextC, nextR, player.id)) return;

  player.c = nextC;
  player.r = nextR;
  player.stepCooldown = 0.11;

  if (isLava(player.c, player.r)) {
    damagePlayerByLava(player);
    return;
  }

  if (state.portalOpen && sameCell(player, currentWorld().portal)) {
    enterPortal();
  }
}

function activeFreewarPlayers() {
  return isFreewar() ? state.players.filter((player) => !player.eliminated) : [];
}

function findFreewarRespawn(player) {
  const isSafe = (cell) => (
    inBounds(cell.c, cell.r)
    && !isTerrainWall(cell.c, cell.r)
    && !isLava(cell.c, cell.r)
    && !state.blocks.has(key(cell.c, cell.r))
    && !heartAt(cell.c, cell.r)
    && !state.players.some((other) => !other.eliminated && other.id !== player.id && other.c === cell.c && other.r === cell.r)
  );
  const { cols, rows } = gridDimensions();
  for (let radius = 0; radius <= cols + rows; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      const dx = radius - Math.abs(dy);
      const candidates = dx === 0
        ? [{ c: player.spawnC, r: player.spawnR + dy }]
        : [
          { c: player.spawnC - dx, r: player.spawnR + dy },
          { c: player.spawnC + dx, r: player.spawnR + dy },
        ];
      const safe = candidates.find(isSafe);
      if (safe) return safe;
    }
  }
  return { c: player.spawnC, r: player.spawnR };
}

function respawnFreewarPlayer(player, reason = "") {
  const spawn = findFreewarRespawn(player);
  player.c = spawn.c;
  player.r = spawn.r;
  player.hp = player.maxHp;
  player.attackCooldown = 0;
  player.stepCooldown = 0;
  player.botGoal = null;
  if (player.id === 1) {
    setMessage(reason || "Du började om vid ditt hjärta.", 2.5);
  }
}

function finishFreewarIfNeeded() {
  const remaining = activeFreewarPlayers();
  const human = state.players[0];
  if (remaining.length === 1) {
    clearActiveControls();
    state.freewar.winnerId = remaining[0].id;
    state.freewar.spectating = false;
    state.mode = "freewarWin";
    state.shopOpen = false;
    state.activeTool = "none";
    setMessage(remaining[0].id === 1 ? "Du vann Freewar!" : `Bot ${remaining[0].id - 1} vann Freewar!`, 10);
    return true;
  }
  if (human?.eliminated && !state.freewar.spectating) {
    clearActiveControls();
    state.freewar.spectating = true;
    state.shopOpen = false;
    state.activeTool = "none";
    setMessage("Du är ute. Botarna fortsätter!", 5);
  }
  return false;
}

function damageFreewarPlayer(attacker, target, amount) {
  if (target.eliminated) return;
  target.hp = Math.max(0, target.hp - amount);
  if (target.hp > 0) {
    if (target.id === 1) setMessage(`Bot ${attacker?.id ? attacker.id - 1 : ""} träffade dig!`, 1.2);
    return;
  }

  if (attacker?.id === 1 && target.id !== 1) state.money += ENEMY_REWARD;
  const homeHeart = heartForPlayer(target.id);
  if (homeHeart?.hp > 0) {
    respawnFreewarPlayer(target, target.id === 1 ? "Du började om vid ditt hjärta." : "");
    return;
  }

  target.eliminated = true;
  target.c = -99;
  target.r = -99;
  if (target.id === 1) setMessage("Du är utslagen ur Freewar.", 5);
  else setMessage(`Bot ${target.id - 1} är utslagen!`, 2.5);
  finishFreewarIfNeeded();
}

function damageFreewarHeart(attacker, heart, amount) {
  if (!heart || heart.hp <= 0 || heart.ownerId === attacker.id) return;
  heart.hp = Math.max(0, heart.hp - amount);
  if (heart.hp > 0) {
    if (heart.ownerId === 1) setMessage(`Bot ${attacker.id - 1} slog ditt hjärta!`, 1.4);
    return;
  }
  if (attacker.id === 1) {
    state.money += BOSS_REWARD;
    setMessage(`Bot ${heart.ownerId - 1}:s hjärta förstördes! +${BOSS_REWARD} pengar.`, 3);
  } else if (heart.ownerId === 1) {
    setMessage("Ditt hjärta är förstört – du kan inte börja om mer!", 5);
  } else {
    setMessage(`Bot ${heart.ownerId - 1}:s hjärta förstördes.`, 2.5);
  }
}

function attackFreewar(player) {
  if (!player || player.eliminated || state.phase !== "night") {
    if (player?.id === 1 && state.phase === "day") setMessage("På dagen bygger man. Kriget börjar på natten.", 2);
    return;
  }
  if (player.attackCooldown > 0) return;
  player.attackCooldown = player.id === 1 && state.hasSword ? 0.32 : 0.48;
  const damage = player.id === 1 && state.hasSword ? 1 : 0.5;

  const targetHeart = activeHearts()
    .filter((heart) => heart.ownerId !== player.id && heart.hp > 0 && tileRadius(player, heart) <= 1)
    .sort((a, b) => a.hp - b.hp || a.ownerId - b.ownerId)[0] || null;
  if (targetHeart) {
    damageFreewarHeart(player, targetHeart, damage);
    return;
  }

  const targetPlayer = activeFreewarPlayers()
    .filter((other) => other.id !== player.id && tileRadius(player, other) <= 1)
    .sort((a, b) => a.hp - b.hp || a.id - b.id)[0] || null;
  if (targetPlayer) {
    damageFreewarPlayer(player, targetPlayer, damage);
    return;
  }

  const targetBlock = ATTACK_OFFSETS
    .map((offset) => ({ c: player.c + offset.dx, r: player.r + offset.dy }))
    .map((cell) => ({ ...cell, block: state.blocks.get(key(cell.c, cell.r)) }))
    .filter((cell) => cell.block && cell.block.ownerId !== player.id)
    .sort((a, b) => a.block.hp - b.block.hp)[0] || null;
  if (targetBlock) {
    damageBlock(targetBlock.c, targetBlock.r, damage);
    return;
  }

  if (player.id === 1) setMessage("Slaget träffade luften.", 0.8);
}

function attack(player) {
  if (state.mode !== "playing" || state.shopOpen) return;
  if (isFreewar()) {
    attackFreewar(player);
    return;
  }
  if (player.attackCooldown > 0) return;
  const enemies = ATTACK_OFFSETS.map((offset) => enemyAt(player.c + offset.dx, player.r + offset.dy))
    .filter(Boolean);
  player.attackCooldown = state.hasSword ? 0.32 : 0.45;

  if (enemies.length === 0) {
    setMessage("Slaget träffade luften.", 0.8);
    return;
  }

  const damageableEnemies = enemies.filter((enemy) => enemy.type !== "boss" || state.hasSword);
  if (damageableEnemies.length === 0) {
    setMessage("Bossen kan bara skadas med svärd!", 1.8);
    return;
  }

  const damage = state.hasSword ? 1 : 0.5;
  for (const enemy of damageableEnemies) {
    damageEnemy(enemy, damage);
  }
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  enemy.hitFlash = 0.18;
  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

function damageSkeleton(skeleton, amount) {
  skeleton.hp -= amount;
  skeleton.hitFlash = 0.18;
  if (skeleton.hp <= 0) {
    state.skeletons = state.skeletons.filter((item) => item.id !== skeleton.id);
  }
}

function killEnemy(enemy) {
  state.enemies = state.enemies.filter((item) => item.id !== enemy.id);
  if (state.botTargetEnemyId === enemy.id) state.botTargetEnemyId = null;
  if (enemy.type === "boss") {
    state.money += BOSS_REWARD;
    setMessage(`Bossen föll! +${BOSS_REWARD} pengar.`, 2.5);
  } else {
    state.money += ENEMY_REWARD;
    setMessage(`+${ENEMY_REWARD} pengar`, 1.2);
  }
}

function passableForEnemy(c, r, enemy) {
  if (!inBounds(c, r)) return false;
  if (enemy.type !== "flying" && isTerrainWall(c, r)) return false;
  if (enemy.type !== "flying" && isLava(c, r)) return false;
  if (enemy.type !== "flying" && state.blocks.has(key(c, r))) return false;
  if (enemy.type !== "flying" && skeletonAt(c, r)) return false;
  return true;
}

function passableForSkeleton(c, r) {
  if (!inBounds(c, r)) return false;
  if (isTerrainWall(c, r)) return false;
  if (state.blocks.has(key(c, r))) return false;
  if (sameCell({ c, r }, state.heart)) return false;
  if (state.players.some((player) => player.c === c && player.r === r)) return false;
  if (state.enemies.some((enemy) => enemy.c === c && enemy.r === r)) return false;
  if (skeletonAt(c, r)) return false;
  return true;
}

function nextStepTowardTarget(enemy, target) {
  const startKey = key(enemy.c, enemy.r);
  const targetKey = key(target.c, target.r);
  const queue = [{ c: enemy.c, r: enemy.r }];
  const cameFrom = new Map();
  cameFrom.set(startKey, null);

  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    if (key(current.c, current.r) === targetKey) break;

    const orderedDirs = DIRS.slice().sort((a, b) => {
      const da = Math.abs(current.c + a.dx - target.c) + Math.abs(current.r + a.dy - target.r);
      const db = Math.abs(current.c + b.dx - target.c) + Math.abs(current.r + b.dy - target.r);
      return da - db;
    });

    for (const dir of orderedDirs) {
      const nc = current.c + dir.dx;
      const nr = current.r + dir.dy;
      const nk = key(nc, nr);
      if (cameFrom.has(nk)) continue;
      if (!passableForEnemy(nc, nr, enemy)) continue;
      cameFrom.set(nk, current);
      queue.push({ c: nc, r: nr });
    }
  }

  if (!cameFrom.has(targetKey)) {
    return null;
  }

  let current = { c: target.c, r: target.r };
  let previous = cameFrom.get(targetKey);
  while (previous && key(previous.c, previous.r) !== startKey) {
    current = previous;
    previous = cameFrom.get(key(current.c, current.r));
  }
  return current;
}

function nearestPlayerToChase(enemy) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const player of state.players) {
    if (player.hp <= 0) continue;
    const dist = tileRadius(enemy, player);
    if (dist > PLAYER_CHASE_RANGE) continue;
    if (dist < nearestDist || (dist === nearestDist && player.id < nearest.id)) {
      nearest = player;
      nearestDist = dist;
    }
  }
  return nearest;
}

function adjacentPlayerToAttack(enemy) {
  return state.players
    .filter((player) => player.hp > 0 && manhattan(enemy, player) <= 1)
    .sort((a, b) => a.id - b.id)[0] || null;
}

function adjacentBlockToAttack(enemy) {
  const candidates = [];
  for (const dir of DIRS) {
    const c = enemy.c + dir.dx;
    const r = enemy.r + dir.dy;
    const block = state.blocks.get(key(c, r));
    if (block) {
      candidates.push({ c, r, block, dist: manhattan({ c, r }, state.heart) });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0] || null;
}

function adjacentSkeletonToAttack(enemy) {
  const candidates = [];
  for (const dir of DIRS) {
    const skeleton = skeletonAt(enemy.c + dir.dx, enemy.r + dir.dy);
    if (skeleton) {
      candidates.push({ skeleton, dist: manhattan(skeleton, state.heart) });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0]?.skeleton || null;
}

function adjacentBlockTowardTarget(enemy, target) {
  const candidates = [];
  const currentDist = manhattan(enemy, target);
  for (const dir of DIRS) {
    const c = enemy.c + dir.dx;
    const r = enemy.r + dir.dy;
    const block = state.blocks.get(key(c, r));
    if (!block) continue;

    const dist = manhattan({ c, r }, target);
    if (dist < currentDist) {
      candidates.push({ c, r, block, dist });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0] || null;
}

function damageBlock(c, r, amount) {
  const blockKey = key(c, r);
  const block = state.blocks.get(blockKey);
  if (!block) return;
  block.hp -= amount;
  if (block.hp <= 0) {
    state.blocks.delete(blockKey);
  }
}

function spawnSkeletonFromTrigger(c, r) {
  const candidates = [
    { c, r },
    ...DIRS.map((dir) => ({ c: c + dir.dx, r: r + dir.dy })),
  ];
  const spawn = candidates.find((candidate) => passableForSkeleton(candidate.c, candidate.r));
  if (!spawn) return null;

  const skeleton = {
    id: state.nextSkeletonId,
    c: spawn.c,
    r: spawn.r,
    hp: SKELETON_HP,
    maxHp: SKELETON_HP,
    moveTimer: 0,
    attackTimer: 0,
    hitFlash: 0,
  };
  state.nextSkeletonId += 1;
  state.skeletons.push(skeleton);
  setMessage("En skelett-hjälpare vaknade!", 1.5);
  return skeleton;
}

function triggerSkeletonsForEnemy(enemy) {
  if (!currentWorld().skeletonTriggers.length) return;
  for (const trigger of currentWorld().skeletonTriggers) {
    if (tileRadius(enemy, trigger) <= 1) {
      spawnSkeletonFromTrigger(trigger.c, trigger.r);
    }
  }
}

function nearestEnemyForSkeleton(skeleton) {
  return state.enemies
    .filter((enemy) => enemy.type !== "boss")
    .sort((a, b) => manhattan(skeleton, a) - manhattan(skeleton, b) || a.id - b.id)[0] || null;
}

function updateSkeleton(skeleton, dt) {
  skeleton.moveTimer += dt;
  skeleton.attackTimer = Math.max(0, skeleton.attackTimer - dt);
  skeleton.hitFlash = Math.max(0, skeleton.hitFlash - dt);

  const target = nearestEnemyForSkeleton(skeleton);
  if (!target) return;

  if (manhattan(skeleton, target) <= 1) {
    if (skeleton.attackTimer <= 0) {
      damageEnemy(target, SKELETON_DAMAGE);
      skeleton.attackTimer = SKELETON_ATTACK_INTERVAL;
    }
    return;
  }

  if (skeleton.moveTimer < 0.65) return;
  skeleton.moveTimer = 0;

  const next = DIRS
    .map((dir) => ({ c: skeleton.c + dir.dx, r: skeleton.r + dir.dy }))
    .filter((cell) => passableForSkeleton(cell.c, cell.r))
    .sort((a, b) => manhattan(a, target) - manhattan(b, target))[0];

  if (next && manhattan(next, target) < manhattan(skeleton, target)) {
    skeleton.c = next.c;
    skeleton.r = next.r;
  }
}

function updateSkeletons(dt) {
  for (const skeleton of [...state.skeletons]) {
    updateSkeleton(skeleton, dt);
  }
}

function botPlayer() {
  return state.botPlayerId ? state.players.find((player) => player.id === state.botPlayerId) || null : null;
}

function passableForBot(c, r, bot) {
  if (!inBounds(c, r)) return false;
  if (isTerrainWall(c, r) || isLava(c, r)) return false;
  if (state.blocks.has(key(c, r))) return false;
  if (sameCell({ c, r }, state.heart)) return false;
  if (isSpawnCell(c, r)) return false;
  if (state.portalOpen && sameCell({ c, r }, currentWorld().portal)) return false;
  if (state.players.some((player) => player.id !== bot.id && player.c === c && player.r === r)) return false;
  if (state.enemies.some((enemy) => enemy.c === c && enemy.r === r)) return false;
  if (state.skeletons.some((skeleton) => skeleton.c === c && skeleton.r === r)) return false;
  return true;
}

function botPathPlan(bot, goals) {
  const goalKeys = new Set(goals.map((goal) => key(goal.c, goal.r)));
  const startKey = key(bot.c, bot.r);
  if (goalKeys.has(startKey)) {
    return { next: null, goal: { c: bot.c, r: bot.r } };
  }

  const queue = [{ c: bot.c, r: bot.r }];
  const cameFrom = new Map([[startKey, null]]);
  let reached = null;

  for (let i = 0; i < queue.length && !reached; i += 1) {
    const current = queue[i];
    const orderedDirs = DIRS.slice().sort((a, b) => {
      const aCell = { c: current.c + a.dx, r: current.r + a.dy };
      const bCell = { c: current.c + b.dx, r: current.r + b.dy };
      const da = Math.min(...goals.map((goal) => manhattan(aCell, goal)));
      const db = Math.min(...goals.map((goal) => manhattan(bCell, goal)));
      return da - db;
    });
    for (const dir of orderedDirs) {
      const next = { c: current.c + dir.dx, r: current.r + dir.dy };
      const nextKey = key(next.c, next.r);
      if (cameFrom.has(nextKey) || !passableForBot(next.c, next.r, bot)) continue;
      cameFrom.set(nextKey, current);
      queue.push(next);
      if (goalKeys.has(nextKey)) {
        reached = next;
        break;
      }
    }
  }

  if (!reached) return null;
  let step = reached;
  let previous = cameFrom.get(key(step.c, step.r));
  while (previous && key(previous.c, previous.r) !== startKey) {
    step = previous;
    previous = cameFrom.get(key(step.c, step.r));
  }
  return { next: step, goal: reached };
}

function botGuardGoals(bot) {
  const guardOffsets = [];
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) guardOffsets.push({ dx, dy });
    }
  }
  return guardOffsets
    .map((offset) => ({ c: state.heart.c + offset.dx, r: state.heart.r + offset.dy }))
    .filter((cell) => passableForBot(cell.c, cell.r, bot))
    .sort((a, b) => manhattan(bot, a) - manhattan(bot, b) || a.r - b.r || a.c - b.c);
}

function botAttackGoals(bot, enemy) {
  return ATTACK_OFFSETS
    .map((offset) => ({ c: enemy.c + offset.dx, r: enemy.r + offset.dy }))
    .filter((cell) => passableForBot(cell.c, cell.r, bot));
}

function botTargetPlan(bot) {
  const candidates = state.enemies
    .filter((enemy) => enemy.type !== "boss" || state.hasSword)
    .filter((enemy) => manhattan(enemy, state.heart) <= 6 || tileRadius(bot, enemy) <= 3)
    .sort((a, b) => (
      manhattan(a, state.heart) - manhattan(b, state.heart)
      || manhattan(bot, a) - manhattan(bot, b)
      || a.id - b.id
    ));
  for (const target of candidates) {
    const goals = botAttackGoals(bot, target);
    const path = goals.length ? botPathPlan(bot, goals) : null;
    if (path) return { target, path };
  }
  return null;
}

function faceBotToward(bot, target) {
  const dx = target.c - bot.c;
  const dy = target.r - bot.r;
  if (dx === 0 && dy === 0) return;
  bot.lookYaw = normalizeAngle(Math.atan2(dy, dx));
  bot.lookPitch = 0;
  bot.dir = forwardDirectionFor(bot).name;
}

function updateBot(dt) {
  const bot = botPlayer();
  if (!bot || state.mode !== "playing") return;
  bot.botMoveTimer += dt;
  if (bot.botMoveTimer < 0.25) return;
  bot.botMoveTimer -= 0.25;

  if (!isDay()) {
    const adjacent = state.enemies
      .filter((enemy) => enemy.type !== "boss" || state.hasSword)
      .filter((enemy) => tileRadius(bot, enemy) <= 1)
      .sort((a, b) => manhattan(a, state.heart) - manhattan(b, state.heart) || a.id - b.id)[0] || null;
    if (adjacent) {
      state.botTargetEnemyId = adjacent.id;
      state.botGoal = { type: "attack", c: bot.c, r: bot.r };
      faceBotToward(bot, adjacent);
      attack(bot);
      if (!state.enemies.some((enemy) => enemy.id === adjacent.id)) {
        state.botTargetEnemyId = null;
      }
      return;
    }

    const targetPlan = botTargetPlan(bot);
    if (targetPlan) {
      state.botTargetEnemyId = targetPlan.target.id;
      state.botGoal = { type: "attack", c: targetPlan.path.goal.c, r: targetPlan.path.goal.r };
      if (targetPlan.path.next) {
        faceBotToward(bot, targetPlan.path.next);
        tryMovePlayer(bot, targetPlan.path.next.c - bot.c, targetPlan.path.next.r - bot.r);
      }
      return;
    }
  }

  state.botTargetEnemyId = null;
  const guardGoals = botGuardGoals(bot);
  const guardPlan = guardGoals.length ? botPathPlan(bot, guardGoals) : null;
  state.botGoal = guardPlan ? { type: "guard", c: guardPlan.goal.c, r: guardPlan.goal.r } : null;
  if (!guardPlan?.next) return;
  faceBotToward(bot, guardPlan.next);
  tryMovePlayer(bot, guardPlan.next.c - bot.c, guardPlan.next.r - bot.r);
}

function freewarPassableForBot(c, r, bot) {
  if (!inBounds(c, r) || isTerrainWall(c, r) || isLava(c, r)) return false;
  if (state.blocks.has(key(c, r)) || heartAt(c, r)) return false;
  if (activeFreewarPlayers().some((player) => player.id !== bot.id && player.c === c && player.r === r)) return false;
  return true;
}

function freewarBotPathPlan(bot, goals) {
  if (!goals.length) return null;
  const goalKeys = new Set(goals.map((goal) => key(goal.c, goal.r)));
  const startKey = key(bot.c, bot.r);
  if (goalKeys.has(startKey)) return { next: null, goal: { c: bot.c, r: bot.r } };

  const queue = [{ c: bot.c, r: bot.r }];
  const cameFrom = new Map([[startKey, null]]);
  let reached = null;
  for (let i = 0; i < queue.length && !reached; i += 1) {
    const current = queue[i];
    const orderedDirs = DIRS.slice().sort((a, b) => {
      const aCell = { c: current.c + a.dx, r: current.r + a.dy };
      const bCell = { c: current.c + b.dx, r: current.r + b.dy };
      const da = Math.min(...goals.map((goal) => manhattan(aCell, goal)));
      const db = Math.min(...goals.map((goal) => manhattan(bCell, goal)));
      return da - db;
    });
    for (const dir of orderedDirs) {
      const next = { c: current.c + dir.dx, r: current.r + dir.dy };
      const nextKey = key(next.c, next.r);
      if (cameFrom.has(nextKey) || !freewarPassableForBot(next.c, next.r, bot)) continue;
      cameFrom.set(nextKey, current);
      queue.push(next);
      if (goalKeys.has(nextKey)) {
        reached = next;
        break;
      }
    }
  }
  if (!reached) return null;

  let step = reached;
  let previous = cameFrom.get(key(step.c, step.r));
  while (previous && key(previous.c, previous.r) !== startKey) {
    step = previous;
    previous = cameFrom.get(key(step.c, step.r));
  }
  return { next: step, goal: reached };
}

function freewarAttackGoals(target, bot) {
  return ATTACK_OFFSETS
    .map((offset) => ({ c: target.c + offset.dx, r: target.r + offset.dy }))
    .filter((cell) => freewarPassableForBot(cell.c, cell.r, bot));
}

function freewarBotBuildSpots(bot) {
  const base = currentWorld().baseDefs.find((item) => item.id === bot.baseId);
  if (!base) return [];
  const forward = dirFromName(base.dir);
  const side = { dx: -forward.dy, dy: forward.dx };
  const spots = [];
  for (let distance = 2; distance <= 4; distance += 1) {
    const lateral = distance % 2 === 0 ? -1 : 1;
    const cell = {
      c: base.heart.c + forward.dx * distance + side.dx * lateral,
      r: base.heart.r + forward.dy * distance + side.dy * lateral,
    };
    if (inBounds(cell.c, cell.r) && !isTerrainWall(cell.c, cell.r) && !isFreewarBaseSpawnCell(cell.c, cell.r)) spots.push(cell);
  }
  return spots;
}

function buildFreewarBotDefense(bot) {
  const spots = freewarBotBuildSpots(bot);
  if (!spots.length) return false;
  const buildOrder = ["wood", "stone", "wood", "arrow", "stone", "wood"];
  for (let offset = 0; offset < spots.length; offset += 1) {
    const index = (bot.botBuildIndex + offset) % spots.length;
    const spot = spots[index];
    const spotKey = key(spot.c, spot.r);
    if (state.blocks.has(spotKey) || isLava(spot.c, spot.r) || heartAt(spot.c, spot.r)) continue;
    if (activeFreewarPlayers().some((player) => player.c === spot.c && player.r === spot.r)) continue;
    const type = buildOrder[index % buildOrder.length];
    const info = BLOCKS[type];
    state.blocks.set(spotKey, {
      type,
      ownerId: bot.id,
      hp: info.hp,
      maxHp: info.hp,
      shootTimer: type === "arrow" ? 0 : undefined,
      shotFlash: 0,
    });
    bot.botBuildIndex = (index + 1) % spots.length;
    bot.botGoal = { type: "build", c: spot.c, r: spot.r };
    return true;
  }
  return false;
}

function chooseFreewarBotTarget(bot) {
  const preferred = state.players.find((player) => player.id === bot.botTargetId && !player.eliminated);
  if (preferred) return preferred;
  const opponents = activeFreewarPlayers().filter((player) => player.id !== bot.id);
  if (!opponents.length) return null;
  const target = opponents.sort((a, b) => manhattan(bot, a) - manhattan(bot, b) || a.id - b.id)[0];
  bot.botTargetId = target.id;
  return target;
}

function closestHostileBlockPlan(bot, strategicTarget) {
  const candidates = Array.from(state.blocks.entries())
    .map(([blockKey, block]) => {
      const [c, r] = blockKey.split(",").map(Number);
      return { c, r, block };
    })
    .filter((entry) => entry.block.ownerId !== bot.id)
    .sort((a, b) => (
      manhattan(a, strategicTarget) - manhattan(b, strategicTarget)
      || manhattan(bot, a) - manhattan(bot, b)
    ));
  for (const block of candidates) {
    const path = freewarBotPathPlan(bot, freewarAttackGoals(block, bot));
    if (path) return { block, path };
  }
  return null;
}

function updateFreewarBot(bot, dt) {
  if (bot.eliminated || state.mode !== "playing") return;
  bot.botMoveTimer += dt;

  if (isDay()) {
    bot.botBuildTimer -= dt;
    if (bot.botBuildTimer <= 0) {
      buildFreewarBotDefense(bot);
      bot.botBuildTimer += 7;
    }
    if (bot.botMoveTimer < 0.32) return;
    bot.botMoveTimer -= 0.32;
    const home = currentWorld().baseDefs.find((base) => base.id === bot.baseId)?.spawn;
    if (!home || sameCell(bot, home)) return;
    const plan = freewarBotPathPlan(bot, [home]);
    if (plan?.next) {
      faceBotToward(bot, plan.next);
      tryMovePlayer(bot, plan.next.c - bot.c, plan.next.r - bot.r);
      bot.botGoal = { type: "return", c: home.c, r: home.r };
    }
    return;
  }

  if (bot.botMoveTimer < 0.28) return;
  bot.botMoveTimer -= 0.28;

  const adjacentOpponent = activeFreewarPlayers()
    .filter((player) => player.id !== bot.id && tileRadius(bot, player) <= 1)
    .sort((a, b) => a.hp - b.hp || a.id - b.id)[0] || null;
  const adjacentHeart = activeHearts()
    .filter((heart) => heart.ownerId !== bot.id && heart.hp > 0 && tileRadius(bot, heart) <= 1)
    .sort((a, b) => a.hp - b.hp || a.ownerId - b.ownerId)[0] || null;
  const adjacentBlock = ATTACK_OFFSETS
    .map((offset) => ({ c: bot.c + offset.dx, r: bot.r + offset.dy }))
    .map((cell) => ({ ...cell, block: state.blocks.get(key(cell.c, cell.r)) }))
    .find((cell) => cell.block && cell.block.ownerId !== bot.id);
  if (adjacentHeart || adjacentOpponent || adjacentBlock) {
    const faceTarget = adjacentHeart || adjacentOpponent || adjacentBlock;
    faceBotToward(bot, faceTarget);
    attackFreewar(bot);
    bot.botGoal = { type: "attack", c: faceTarget.c, r: faceTarget.r };
    return;
  }

  const targetPlayer = chooseFreewarBotTarget(bot);
  if (!targetPlayer) return;
  const targetHeart = heartForPlayer(targetPlayer.id);
  const strategicTarget = targetHeart?.hp > 0 ? targetHeart : targetPlayer;
  let path = freewarBotPathPlan(bot, freewarAttackGoals(strategicTarget, bot));
  if (!path) {
    const blockPlan = closestHostileBlockPlan(bot, strategicTarget);
    if (blockPlan) {
      path = blockPlan.path;
      bot.botGoal = { type: "break", c: blockPlan.block.c, r: blockPlan.block.r, targetPlayerId: targetPlayer.id };
    }
  }
  if (!path) return;
  if (!bot.botGoal || bot.botGoal.type !== "break") {
    bot.botGoal = { type: "raid", c: strategicTarget.c, r: strategicTarget.r, targetPlayerId: targetPlayer.id };
  }
  if (path.next) {
    faceBotToward(bot, path.next);
    tryMovePlayer(bot, path.next.c - bot.c, path.next.r - bot.r);
  }
}

function updateFreewarBots(dt) {
  for (const bot of state.players.filter((player) => player.isBot)) {
    updateFreewarBot(bot, dt);
  }
}

function hasClearArrowShot(fromC, fromR, toC, toR) {
  const steps = Math.max(Math.abs(toC - fromC), Math.abs(toR - fromR));
  if (steps <= 1) return true;

  const checked = new Set();
  for (let i = 1; i < steps; i += 1) {
    const c = Math.round(fromC + ((toC - fromC) * i) / steps);
    const r = Math.round(fromR + ((toR - fromR) * i) / steps);
    const cellKey = key(c, r);
    if (checked.has(cellKey)) continue;
    checked.add(cellKey);
    if (state.blocks.has(cellKey) || isTerrainWall(c, r)) return false;
  }
  return true;
}

function nearestArrowTarget(c, r) {
  return state.enemies
    .filter((enemy) => enemy.type !== "boss")
    .filter((enemy) => hasClearArrowShot(c, r, enemy.c, enemy.r))
    .sort((a, b) => {
      const da = manhattan({ c, r }, a);
      const db = manhattan({ c, r }, b);
      return da - db || a.id - b.id;
    })[0] || null;
}

function nearestFreewarArrowTarget(c, r, block) {
  if (state.phase !== "night") return null;
  const owner = state.players.find((player) => player.id === block.ownerId);
  if (!owner || owner.eliminated) return null;
  return activeFreewarPlayers()
    .filter((player) => player.id !== block.ownerId)
    .filter((player) => hasClearArrowShot(c, r, player.c, player.r))
    .sort((a, b) => manhattan({ c, r }, a) - manhattan({ c, r }, b) || a.id - b.id)[0] || null;
}

function shootArrowBlock(c, r, block) {
  if (isFreewar()) {
    const target = nearestFreewarArrowTarget(c, r, block);
    if (!target) return false;
    block.shotFlash = 0.18;
    state.projectiles.push({ fromC: c, fromR: r, toC: target.c, toR: target.r, life: 0.18 });
    const owner = state.players.find((player) => player.id === block.ownerId) || null;
    damageFreewarPlayer(owner, target, ARROW_DAMAGE);
    return true;
  }
  const target = nearestArrowTarget(c, r);
  if (!target) return false;

  block.shotFlash = 0.18;
  state.projectiles.push({
    fromC: c,
    fromR: r,
    toC: target.c,
    toR: target.r,
    life: 0.18,
  });
  damageEnemy(target, ARROW_DAMAGE);
  return true;
}

function updateArrowBlocks(dt) {
  for (const [blockKey, block] of state.blocks.entries()) {
    block.shotFlash = Math.max(0, (block.shotFlash || 0) - dt);
    if (block.type !== "arrow") continue;

    const [c, r] = blockKey.split(",").map(Number);
    block.shootTimer = (block.shootTimer || 0) + dt;
    while (block.shootTimer >= ARROW_SHOT_INTERVAL) {
      block.shootTimer -= ARROW_SHOT_INTERVAL;
      if (!shootArrowBlock(c, r, block)) break;
    }
  }
}

function updateProjectiles(dt) {
  state.projectiles = state.projectiles
    .map((projectile) => ({ ...projectile, life: projectile.life - dt }))
    .filter((projectile) => projectile.life > 0);
}

function spawnEnemy(type, cell) {
  const spawn = findOpenSpawn(cell, type);
  const enemy = {
    id: state.nextEnemyId,
    type,
    c: spawn.c,
    r: spawn.r,
    hp: type === "boss" ? 3 : 0.5,
    maxHp: type === "boss" ? 3 : 0.5,
    moveTimer: 0,
    attackTimer: 0,
    playerAttackTargetId: null,
    hitFlash: 0,
  };
  state.nextEnemyId += 1;
  state.enemies.push(enemy);
}

function findOpenSpawn(cell, type) {
  const candidates = [
    cell,
    { c: cell.c - 1, r: cell.r },
    { c: cell.c, r: cell.r + 1 },
    { c: cell.c - 1, r: cell.r + 1 },
    { c: cell.c, r: cell.r - 1 },
    { c: cell.c + 1, r: cell.r },
  ];
  for (const candidate of candidates) {
    if (!inBounds(candidate.c, candidate.r)) continue;
    if (isTerrainWall(candidate.c, candidate.r)) continue;
    if (type !== "flying" && isLava(candidate.c, candidate.r)) continue;
    if (state.blocks.has(key(candidate.c, candidate.r))) continue;
    if (sameCell(candidate, state.heart)) continue;
    if (playerAt(candidate.c, candidate.r)) continue;
    if (skeletonAt(candidate.c, candidate.r)) continue;
    return candidate;
  }
  return cell;
}

function startFreewarNight() {
  clearActiveControls();
  state.phase = "night";
  state.phaseElapsed = 0;
  state.shopOpen = false;
  state.activeTool = "none";
  const bots = activeFreewarPlayers().filter((player) => player.isBot);
  const hunter = bots.length ? bots[(state.day - 1) % bots.length] : null;
  bots.forEach((bot, index) => {
    bot.botTargetId = bot.id === hunter?.id ? 1 : bots[(index + 1) % bots.length]?.id || 1;
    if (bot.botTargetId === bot.id) bot.botTargetId = 1;
    bot.botGoal = null;
    bot.botMoveTimer = 0;
  });
  setMessage(`Natt ${state.day}: botarna krigar!`, 4);
}

function startFreewarDay() {
  clearActiveControls();
  state.day += 1;
  state.phase = "day";
  state.phaseElapsed = 0;
  state.shopOpen = false;
  state.activeTool = "none";
  for (const bot of state.players.filter((player) => player.isBot && !player.eliminated)) {
    bot.botTargetId = null;
    bot.botGoal = null;
    bot.botBuildTimer = 0.25 + (bot.id - 2) * 0.08;
  }
  setMessage(`Dag ${state.day}: botarna bygger.`, 4);
}

function startNight() {
  clearActiveControls();
  state.phase = "night";
  state.phaseElapsed = 0;
  state.spawnCursor = 0;
  state.bossSpawned = false;
  state.shopOpen = false;
  state.activeTool = "none";
  setMessage(`${currentWorld().name} natt ${state.day}! Skydda hjärtat.`, 3);
}

function startNextDay() {
  state.enemies = [];
  state.skeletons = [];
  if (state.day >= currentWorld().days) {
    state.portalOpen = true;
    state.phase = "day";
    state.phaseElapsed = 0;
    state.activeTool = "none";
    setMessage(`${currentWorld().name} klar! Portalen öppnade.`, 5);
    return;
  }

  state.day += 1;
  state.phase = "day";
  state.phaseElapsed = 0;
  state.activeTool = "none";
  if (state.day === 2 && !state.hasSword) {
    setMessage("Varning: köp svärd! På dag 3 kommer en boss som bara kan skadas med svärd.", 7);
  } else if (state.day === 3 && !state.hasSword) {
    setMessage("Dag 3: Köp svärd! Bossen kan bara skadas med svärd.", 6);
  } else {
    setMessage(`${currentWorld().name} dag ${state.day}: bygg och handla innan natten.`, 3);
  }
}

function updateSpawns() {
  if (state.phase !== "night") return;
  const world = currentWorld();

  if (state.world === 2) {
    if (state.day === 3) {
      if (!state.bossSpawned) {
        spawnEnemy("boss", world.spawns.f1);
        state.bossSpawned = true;
        setMessage("Bossen kom från F1! Bara svärdet kan skada den.", 3);
      }
      return;
    }

    while (state.phaseElapsed >= state.spawnCursor) {
      if (state.day === 1) {
        spawnEnemy("normal", world.spawns.f1);
      } else if (state.day === 2) {
        spawnEnemy("flying", world.spawns.f1);
      } else if (state.day === 4) {
        spawnEnemy("normal", world.spawns.f1);
        spawnEnemy("normal", world.spawns.f2);
      } else if (state.day === 5) {
        spawnEnemy("flying", world.spawns.f1);
        spawnEnemy("flying", world.spawns.f2);
      }
      state.spawnCursor += 1;
      if (state.spawnCursor > NIGHT_LENGTH) break;
    }
    return;
  }

  if (state.day === 3) {
    if (!state.bossSpawned) {
      spawnEnemy("boss", world.spawns.f1);
      state.bossSpawned = true;
      setMessage("Bossen kom från F!", 2.5);
    }
    return;
  }

  while (state.phaseElapsed >= state.spawnCursor) {
    if (state.day === 1) {
      spawnEnemy("normal", world.spawns.f1);
    } else if (state.day === 2) {
      spawnEnemy("normal", world.spawns.f1);
      spawnEnemy("normal", world.spawns.f2);
    } else if (state.day === 4) {
      spawnEnemy("flying", world.spawns.f1);
    } else if (state.day === 5) {
      spawnEnemy("flying", world.spawns.f1);
      spawnEnemy("flying", world.spawns.f1);
      spawnEnemy("flying", world.spawns.f1);
    }
    state.spawnCursor += 3;
    if (state.spawnCursor > NIGHT_LENGTH) break;
  }
}

function enemyPlayerDamage(enemy) {
  return enemy.type === "boss" ? 1 : 0.5;
}

function respawnPlayer(player) {
  player.c = state.heart.c;
  player.r = state.heart.r;
  player.hp = player.maxHp;
  player.attackCooldown = 0;
  player.stepCooldown = 0;
  setMessage(`Spelare ${player.id} började om vid hjärtat.`, 2);
}

function damagePlayerByLava(player) {
  if (isFreewar()) {
    const hadHeart = (heartForPlayer(player.id)?.hp || 0) > 0;
    damageFreewarPlayer(null, player, 3);
    if (state.mode === "playing" && !player.eliminated && hadHeart) {
      setMessage(player.id === 1 ? "Lava! Du började om vid ditt hjärta." : `Bot ${player.id - 1} föll i lava.`, 2);
    }
    return;
  }
  player.hp -= 3;
  if (player.hp <= 0) {
    respawnPlayer(player);
    setMessage(`Lava! Spelare ${player.id} började om vid hjärtat.`, 2);
  }
}

function enterPortal() {
  const world = currentWorld();
  clearActiveControls();
  state.shopOpen = false;
  state.activeTool = "none";

  if (world.nextWorld) {
    setupWorld(world.nextWorld, state.playersWanted, true, state.botPlayerId);
    setMessage(`${world.name} klar! Ni kom till ${currentWorld().name}.`, 5);
    return;
  }

  state.mode = "worldComplete";
  setMessage(`${world.name} klar! Fler världar kommer senare.`, 5);
}

function damagePlayer(enemy, player) {
  player.hp -= enemyPlayerDamage(enemy);
  enemy.attackTimer = ENEMY_ATTACK_INTERVAL;
  if (player.hp <= 0) {
    respawnPlayer(player);
    return;
  }
  setMessage(`Fienden slog spelare ${player.id}!`, 1.6);
}

function resetPlayerAttackTarget(enemy) {
  enemy.playerAttackTargetId = null;
}

function updatePlayerAttack(enemy, player) {
  enemy.playerAttackTargetId = player.id;
  if (enemy.attackTimer <= 0) {
    damagePlayer(enemy, player);
  }
}

function updateEnemy(enemy, dt) {
  enemy.moveTimer += dt;
  enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
  enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

  const adjacentPlayer = adjacentPlayerToAttack(enemy);
  if (adjacentPlayer) {
    updatePlayerAttack(enemy, adjacentPlayer);
    return;
  }
  resetPlayerAttackTarget(enemy);

  const chasedPlayer = nearestPlayerToChase(enemy);

  const skeletonTarget = adjacentSkeletonToAttack(enemy);
  if (skeletonTarget) {
    if (enemy.attackTimer <= 0) {
      damageSkeleton(skeletonTarget, enemyPlayerDamage(enemy));
      enemy.attackTimer = ENEMY_ATTACK_INTERVAL;
      setMessage("Fienden slog ett skelett!", 1.2);
    }
    return;
  }

  if (!chasedPlayer && manhattan(enemy, state.heart) === 1) {
    if (enemy.attackTimer <= 0) {
      state.heart.hp -= enemy.type === "boss" ? 1 : 1;
      enemy.attackTimer = ENEMY_ATTACK_INTERVAL;
      setMessage("Hjärtat blev slaget!", 1.4);
      if (state.heart.hp <= 0) {
        loseGame("Hjärtat dog.");
      }
    }
    return;
  }

  const target = chasedPlayer || state.heart;
  const blockTowardTarget = enemy.type !== "flying" ? adjacentBlockTowardTarget(enemy, target) : null;
  if (blockTowardTarget) {
    if (enemy.attackTimer <= 0) {
      damageBlock(blockTowardTarget.c, blockTowardTarget.r, enemy.type === "boss" ? 3 : 1);
      enemy.attackTimer = ENEMY_ATTACK_INTERVAL;
    }
    return;
  }

  const moveDelay = enemy.type === "boss" ? 0.85 : enemy.type === "flying" ? 0.55 : 0.75;
  if (enemy.moveTimer < moveDelay) return;
  enemy.moveTimer = 0;

  const next = nextStepTowardTarget(enemy, target);
  if (!next) {
    const blockTarget = adjacentBlockToAttack(enemy);
    if (blockTarget && enemy.attackTimer <= 0 && enemy.type !== "flying") {
      damageBlock(blockTarget.c, blockTarget.r, enemy.type === "boss" ? 3 : 1);
      enemy.attackTimer = ENEMY_ATTACK_INTERVAL;
    }
    return;
  }
  if (sameCell(next, state.heart)) return;

  const blockingPlayer = playerAt(next.c, next.r);
  if (blockingPlayer) {
    updatePlayerAttack(enemy, blockingPlayer);
    return;
  }

  if (enemy.type !== "flying" && state.blocks.has(key(next.c, next.r))) return;
  enemy.c = next.c;
  enemy.r = next.r;
  const reachedPlayer = adjacentPlayerToAttack(enemy);
  if (reachedPlayer) {
    updatePlayerAttack(enemy, reachedPlayer);
  }
  triggerSkeletonsForEnemy(enemy);
}

function loseGame(reason) {
  clearActiveControls();
  state.mode = "gameover";
  state.shopOpen = false;
  state.activeTool = "none";
  setMessage(`${reason} Tryck på Starta om.`, 10);
}

function updateFreewar(dt) {
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  for (const player of state.players) {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.stepCooldown = Math.max(0, player.stepCooldown - dt);
  }
  movePlayersFromJoysticks();

  state.phaseElapsed += dt;
  if (state.phaseElapsed + 1e-6 >= phaseLength()) {
    if (isDay()) startFreewarNight();
    else startFreewarDay();
  }

  updateFreewarBots(dt);
  updateProjectiles(dt);
  updateArrowBlocks(dt);
}

function update(dt) {
  if (state.mode !== "playing") {
    return;
  }

  if (isFreewar()) {
    updateFreewar(dt);
    return;
  }

  state.messageTimer = Math.max(0, state.messageTimer - dt);
  for (const player of state.players) {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.stepCooldown = Math.max(0, player.stepCooldown - dt);
  }
  movePlayersFromJoysticks();

  if (!state.portalOpen) {
    state.phaseElapsed += dt;
    if (isDay() && state.phaseElapsed >= DAY_LENGTH) {
      startNight();
    } else if (!isDay() && state.phaseElapsed >= NIGHT_LENGTH) {
      startNextDay();
    }
  }

  if (!isDay()) {
    state.shopOpen = false;
    updateSpawns();
  }

  updateBot(dt);

  updateProjectiles(dt);
  updateArrowBlocks(dt);

  for (const enemy of [...state.enemies]) {
    updateEnemy(enemy, dt);
    if (state.mode !== "playing") break;
  }

  if (state.mode === "playing") {
    updateSkeletons(dt);
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, VIEW_W, VIEW_H);
  gradient.addColorStop(0, "#202944");
  gradient.addColorStop(0.45, "#1a3f45");
  gradient.addColorStop(1, "#332449");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = "rgba(255, 210, 93, 0.08)";
  for (let i = 0; i < 20; i += 1) {
    const x = (i * 173) % VIEW_W;
    const y = (i * 97) % VIEW_H;
    ctx.fillRect(x, y, 18, 18);
  }
}

function drawBoard() {
  const { cols, rows } = gridDimensions();
  const boardW = cols * TILE;
  const boardH = rows * TILE;
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  roundRect(BOARD_X - 28, BOARD_Y - 28, boardW + 56, boardH + 56, 8);
  ctx.fill();
  ctx.fillStyle = "#cbd5e1";
  roundRect(BOARD_X - 20, BOARD_Y - 20, boardW + 40, boardH + 40, 8);
  ctx.fill();
  ctx.fillStyle = "#142238";
  roundRect(BOARD_X - 12, BOARD_Y - 12, boardW + 24, boardH + 24, 8);
  ctx.fill();
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 4;
  ctx.stroke();

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = BOARD_X + c * TILE;
      const y = BOARD_Y + r * TILE;
      const mark = currentWorld().rows[r][c];
      const palette = state.world === 2
        ? ["#fff7ed", "#fef3c7", "#fde68a", "#e0f2fe", "#dcfce7"]
        : isFreewar()
          ? ["#4d8c55", "#5d9b61", "#478051", "#68a866", "#3f754a"]
        : ["#7ed957", "#5fd38d", "#5bc7c9", "#e6cf5a", "#f29f6b"];
      let color = palette[(c * 2 + r * 3) % palette.length];
      if (mark === "A") color = "#94a3b8";
      if (isLava(c, r)) color = "#f97316";
      if (mark === "e") color = "#e5e7eb";
      if (mark === "V") color = isFreewar() && !isBaseWall(c, r) ? "#111827" : "#dbeafe";
      ctx.fillStyle = color;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 5, y + 5, TILE - 10, 8);
      if (isLava(c, r)) {
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(x + 11, y + 28, TILE - 22, 8);
        ctx.fillStyle = "#facc15";
        ctx.fillRect(x + 18, y + 17, TILE - 36, 7);
      } else if (mark === "A") {
        drawText("A", x + TILE / 2, y + TILE / 2 + 1, 25, "#334155", "center", "900");
      } else if (mark === "e") {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(x + 18, y + 13, 18, 14);
        ctx.fillRect(x + 22, y + 27, 10, 15);
        ctx.fillStyle = "#111827";
        ctx.fillRect(x + 22, y + 18, 4, 4);
        ctx.fillRect(x + 29, y + 18, 4, 4);
        drawText("e", x + TILE / 2, y + 43, 16, "#475569", "center", "900");
      }
      ctx.strokeStyle = "rgba(22, 44, 57, 0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
      if (isFreewar() && mark !== "V") {
        ctx.strokeStyle = "rgba(187,247,208,0.46)";
        ctx.lineWidth = 4;
        if (c % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 2);
          ctx.lineTo(x + 2, y + TILE - 2);
          ctx.stroke();
        }
        if (r % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 2);
          ctx.lineTo(x + TILE - 2, y + 2);
          ctx.stroke();
        }
      }
    }
  }

  for (const spawn of currentWorld().spawnList) {
    drawSpawnMarker(spawn.c, spawn.r, spawn.label, spawn.color);
  }
  if (state.portalOpen) {
    drawSpawnMarker(currentWorld().portal.c, currentWorld().portal.r, "P", "#8b5cf6");
  }
  ctx.restore();
}

function drawSpawnMarker(c, r, label, color) {
  const x = BOARD_X + c * TILE + 7;
  const y = BOARD_Y + r * TILE + 7;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, TILE - 14, TILE - 14);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + 6, y + 5, TILE - 26, 7);
  drawText(label, x + (TILE - 14) / 2, y + (TILE - 14) / 2 + 1, label.length > 1 ? 17 : 22, "#fff", "center", "900");
}

function wallColorFor3d(c, r, block, distance) {
  const shade = Math.max(0.38, 1 - distance * 0.11);
  const mix = (hex) => {
    const value = hex.replace("#", "");
    const red = Math.round(parseInt(value.slice(0, 2), 16) * shade);
    const green = Math.round(parseInt(value.slice(2, 4), 16) * shade);
    const blue = Math.round(parseInt(value.slice(4, 6), 16) * shade);
    return `rgb(${red},${green},${blue})`;
  };
  if (block) return mix(BLOCKS[block.type]?.color || "#94a3b8");
  if (!inBounds(c, r) || isTerrainWall(c, r)) return mix("#dbeafe");
  return mix("#94a3b8");
}

function castWallRay(angle, player) {
  const startX = player.c + 0.5;
  const startY = player.r + 0.5;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = 0.025;
  const maxDistance = 12;
  let previousKey = key(player.c, player.r);

  for (let distance = step; distance <= maxDistance; distance += step) {
    const x = startX + dx * distance;
    const y = startY + dy * distance;
    const c = Math.floor(x);
    const r = Math.floor(y);
    const cellKey = key(c, r);
    if (cellKey === previousKey) continue;
    previousKey = cellKey;
    const block = state.blocks.get(cellKey);
    if (!inBounds(c, r) || isTerrainWall(c, r) || block) {
      return { c, r, distance, block };
    }
  }
  return { c: -1, r: -1, distance: maxDistance, block: null };
}

function drawFirstPersonGroundMarkers(player, cameraAngle) {
  const markers = [
    ...lavaCells().map((cell) => ({ ...cell, color: "#f97316", label: "LAVA" })),
    ...(state.portalOpen ? [{ ...currentWorld().portal, color: "#8b5cf6", label: "PORTAL" }] : []),
  ];
  for (const marker of markers) {
    drawFirstPersonBillboard(player, cameraAngle, marker.c, marker.r, marker.label, marker.color, "floor");
  }
}

function drawFirstPersonBillboard(player, cameraAngle, c, r, label, color, kind = "sprite", sizeBoost = 1) {
  const px = player.c + 0.5;
  const py = player.r + 0.5;
  const dx = c + 0.5 - px;
  const dy = r + 0.5 - py;
  const forward = Math.cos(cameraAngle) * dx + Math.sin(cameraAngle) * dy;
  if (forward <= 0.15 || forward > 8) return;

  const side = -Math.sin(cameraAngle) * dx + Math.cos(cameraAngle) * dy;
  const halfFov = Math.PI / 5;
  const angleOffset = Math.atan2(side, forward);
  if (Math.abs(angleOffset) > halfFov * 1.18) return;

  const screenX = VIEW3D_X + VIEW3D_W / 2 + (angleOffset / halfFov) * (VIEW3D_W / 2);
  const distance = Math.max(0.35, Math.hypot(dx, dy));
  const scale = Math.max(22, (115 / distance) * sizeBoost);
  const horizon = VIEW3D_Y + VIEW3D_H * 0.48;
  const baseY = kind === "floor"
    ? horizon + (VIEW3D_H * 0.42) / distance
    : horizon + 135 / distance;
  const w = kind === "floor" ? scale * 1.35 : scale;
  const h = kind === "floor" ? Math.max(14, scale * 0.28) : scale * 1.2;

  ctx.save();
  ctx.globalAlpha = Math.max(0.35, 1 - distance * 0.08);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(screenX - w * 0.45, baseY + h * 0.42, w * 0.9, Math.max(5, h * 0.12));
  ctx.fillStyle = color;
  if (kind === "floor") {
    ctx.fillRect(screenX - w / 2, baseY, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(screenX - w / 2 + 4, baseY + 3, w - 8, 4);
  } else {
    ctx.fillRect(screenX - w / 2, baseY - h, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(screenX - w / 2 + 5, baseY - h + 6, w - 10, Math.max(5, h * 0.15));
  }
  drawText(label, screenX, kind === "floor" ? baseY + h / 2 : baseY - h / 2, Math.max(11, Math.min(24, w * 0.22)), "#111827", "center", "900");
  ctx.restore();
}

function drawFirstPersonEntities(player, cameraAngle) {
  const sprites = [
    ...activeHearts().map((heart) => ({ c: heart.c, r: heart.r, label: heart.ownerId === 1 ? "DITT H" : `B${heart.ownerId - 1} H`, color: "#fb7185", kind: "heart", boost: 1.15 })),
    ...state.players
      .filter((other) => other.id !== player.id && !other.eliminated)
      .map((other) => ({ c: other.c, r: other.r, label: isFreewar() && other.isBot ? `BOT ${other.id - 1}` : `P${other.id}`, color: other.color, kind: "player", boost: 1 })),
    ...state.skeletons.map((skeleton) => ({ c: skeleton.c, r: skeleton.r, label: "S", color: "#f8fafc", kind: "skeleton", boost: 0.9 })),
    ...state.enemies.map((enemy) => ({
      c: enemy.c,
      r: enemy.r,
      label: enemy.type === "boss" ? "BOSS" : enemy.type === "flying" ? "FLYG" : "FIENDE",
      color: enemy.type === "boss" ? "#ef4444" : enemy.type === "flying" ? "#f0abfc" : "#8b5cf6",
      kind: "enemy",
      boost: enemy.type === "boss" ? 1.45 : 1,
    })),
  ];

  sprites
    .map((sprite) => ({
      ...sprite,
      dist: Math.hypot(sprite.c - player.c, sprite.r - player.r),
    }))
    .sort((a, b) => b.dist - a.dist)
    .forEach((sprite) => {
      drawFirstPersonBillboard(player, cameraAngle, sprite.c, sprite.r, sprite.label, sprite.color, "sprite", sprite.boost);
    });
}

function drawFirstPersonView() {
  const player = state.players[0];
  if (!player) return;

  const cameraAngle = angleFromDir(player.dir);
  const horizon = VIEW3D_Y + VIEW3D_H * 0.48;
  ctx.save();
  roundRect(VIEW3D_X, VIEW3D_Y, VIEW3D_W, VIEW3D_H, 8);
  ctx.clip();

  const sky = ctx.createLinearGradient(0, VIEW3D_Y, 0, horizon);
  sky.addColorStop(0, state.phase === "night" ? "#0f172a" : "#38bdf8");
  sky.addColorStop(1, state.phase === "night" ? "#1e293b" : "#bfdbfe");
  ctx.fillStyle = sky;
  ctx.fillRect(VIEW3D_X, VIEW3D_Y, VIEW3D_W, horizon - VIEW3D_Y);

  const floor = ctx.createLinearGradient(0, horizon, 0, VIEW3D_Y + VIEW3D_H);
  floor.addColorStop(0, "#64748b");
  floor.addColorStop(1, state.world === 2 ? "#fef3c7" : "#166534");
  ctx.fillStyle = floor;
  ctx.fillRect(VIEW3D_X, horizon, VIEW3D_W, VIEW3D_Y + VIEW3D_H - horizon);

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  for (let i = 1; i <= 8; i += 1) {
    const y = horizon + (VIEW3D_H * 0.46) * (i / 8) ** 1.7;
    ctx.beginPath();
    ctx.moveTo(VIEW3D_X, y);
    ctx.lineTo(VIEW3D_X + VIEW3D_W, y);
    ctx.stroke();
  }

  const fov = Math.PI / 2.8;
  for (let i = 0; i < VIEW3D_COLS; i += 1) {
    const ratio = i / (VIEW3D_COLS - 1);
    const rayAngle = cameraAngle - fov / 2 + ratio * fov;
    const hit = castWallRay(rayAngle, player);
    const corrected = Math.max(0.18, hit.distance * Math.cos(rayAngle - cameraAngle));
    const sliceH = Math.min(VIEW3D_H * 1.6, VIEW3D_H * 0.9 / corrected);
    const x = VIEW3D_X + ratio * VIEW3D_W;
    const w = VIEW3D_W / VIEW3D_COLS + 1;
    const y = horizon - sliceH / 2;
    ctx.fillStyle = wallColorFor3d(hit.c, hit.r, hit.block, corrected);
    ctx.fillRect(x, y, w, sliceH);
    if (i % 8 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.11)";
      ctx.fillRect(x, y + 6, w, Math.max(4, sliceH * 0.05));
    }
  }

  drawFirstPersonGroundMarkers(player, cameraAngle);
  drawFirstPersonEntities(player, cameraAngle);

  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 4;
  ctx.strokeRect(VIEW3D_X + 2, VIEW3D_Y + 2, VIEW3D_W - 4, VIEW3D_H - 4);
  drawText("3D-läge", VIEW3D_X + 22, VIEW3D_Y + 28, 20, "#f8fafc", "left", "900");
  drawText(`P1 tittar ${player.dir}`, VIEW3D_X + 22, VIEW3D_Y + 54, 14, "#e0f2fe", "left", "800");
  ctx.restore();
}

function shadeHex(hex, factor) {
  const value = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, Math.round(parseInt(value.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(value.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(value.slice(4, 6), 16) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function stableNoise(value) {
  const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function wallMaterialAt(c, r, block) {
  if (block?.type === "wood") return { name: "wood", base: "#925329" };
  if (block?.type === "stone") return { name: "stone", base: "#89939a" };
  if (block?.type === "arrow") return { name: "arrow", base: "#227da1" };
  if (!inBounds(c, r)) return { name: "boundary", base: isFreewar() ? "#334155" : state.world === 2 ? "#7b7469" : "#a9b2b5" };
  if (isFreewar() && isBaseWall(c, r)) return { name: "stone", base: "#cbd5e1" };
  if (isFreewar() && isTerrainWall(c, r)) return { name: "boundary", base: "#334155" };
  return { name: "temple", base: state.world === 2 ? "#8a8071" : "#c5c9c4" };
}

function castRealisticWallRay(angle, player) {
  const posX = player.c + 0.5;
  const posY = player.r + 0.5;
  const rayX = Math.cos(angle);
  const rayY = Math.sin(angle);
  let mapX = Math.floor(posX);
  let mapY = Math.floor(posY);
  const deltaX = Math.abs(1 / (Math.abs(rayX) < 0.00001 ? 0.00001 : rayX));
  const deltaY = Math.abs(1 / (Math.abs(rayY) < 0.00001 ? 0.00001 : rayY));
  const stepX = rayX < 0 ? -1 : 1;
  const stepY = rayY < 0 ? -1 : 1;
  let sideX = rayX < 0 ? (posX - mapX) * deltaX : (mapX + 1 - posX) * deltaX;
  let sideY = rayY < 0 ? (posY - mapY) * deltaY : (mapY + 1 - posY) * deltaY;
  let side = 0;

  for (let steps = 0; steps < 64; steps += 1) {
    if (sideX < sideY) {
      sideX += deltaX;
      mapX += stepX;
      side = 0;
    } else {
      sideY += deltaY;
      mapY += stepY;
      side = 1;
    }

    const block = state.blocks.get(key(mapX, mapY));
    if (!inBounds(mapX, mapY) || isTerrainWall(mapX, mapY) || block) {
      const distance = Math.min(
        VIEW3D_MAX_DISTANCE,
        side === 0 ? sideX - deltaX : sideY - deltaY,
      );
      const hitPosition = side === 0 ? posY + distance * rayY : posX + distance * rayX;
      let wallU = hitPosition - Math.floor(hitPosition);
      if ((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) wallU = 1 - wallU;
      return {
        c: mapX,
        r: mapY,
        distance: Math.max(VIEW3D_NEAR, distance),
        side,
        wallU,
        block,
        material: wallMaterialAt(mapX, mapY, block),
      };
    }
  }

  return {
    c: -1,
    r: -1,
    distance: VIEW3D_MAX_DISTANCE,
    side: 0,
    wallU: 0,
    block: null,
    material: wallMaterialAt(-1, -1, null),
  };
}

function realisticWallColor(hit, forwardDistance) {
  const { material, wallU, c, r } = hit;
  const cellVariation = 0.92 + stableNoise(c * 37 + r * 71) * 0.14;
  let texture = 1;
  if (material.name === "wood") {
    texture = 0.86 + Math.sin((wallU + stableNoise(c * 9 + r)) * 58) * 0.055;
    if (wallU < 0.035 || wallU > 0.965) texture *= 0.62;
  } else if (material.name === "stone" || material.name === "temple" || material.name === "boundary") {
    const mortar = Math.abs((wallU * 4) % 1 - 0.5);
    texture = mortar > 0.455 ? 0.63 : 0.93 + stableNoise(Math.floor(wallU * 15) + c * 11 + r * 19) * 0.1;
  } else if (material.name === "arrow") {
    texture = 0.83 + Math.sin(wallU * Math.PI * 10) * 0.08;
    if (Math.abs(wallU - 0.5) < 0.055) texture = 1.45;
  }
  const sideShade = hit.side === 1 ? 0.79 : 1;
  const distanceShade = Math.max(0.31, 1 / (1 + forwardDistance * 0.105));
  return shadeHex(material.base, cellVariation * texture * sideShade * distanceShade);
}

function drawRealisticSky(horizon, view) {
  const night = state.phase === "night";
  const scale = Math.min(1, view.h / VIEW3D_H);
  const sky = ctx.createLinearGradient(0, view.y, 0, horizon + 16 * scale);
  if (night) {
    sky.addColorStop(0, "#020617");
    sky.addColorStop(0.58, "#10223b");
    sky.addColorStop(1, "#40536a");
  } else {
    sky.addColorStop(0, "#1777b7");
    sky.addColorStop(0.55, "#62b7df");
    sky.addColorStop(1, "#d8e8dc");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(view.x, view.y, view.w, horizon - view.y + 18 * scale);

  if (night) {
    for (let i = 0; i < 55; i += 1) {
      const x = view.x + stableNoise(i * 17) * view.w;
      const y = view.y + stableNoise(i * 31 + 3) * Math.max(8, horizon - view.y - 12 * scale);
      const radius = (0.45 + stableNoise(i * 53) * 1.25) * Math.max(0.55, scale);
      ctx.globalAlpha = 0.38 + stableNoise(i * 97) * 0.55;
      ctx.fillStyle = stableNoise(i * 23) > 0.82 ? "#bfdbfe" : "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const moonX = view.x + view.w * 0.78;
    const moonY = view.y + 75 * scale;
    const glowRadius = 58 * scale;
    const glow = ctx.createRadialGradient(moonX, moonY, 4 * scale, moonX, moonY, glowRadius);
    glow.addColorStop(0, "rgba(255,255,226,0.95)");
    glow.addColorStop(0.22, "rgba(226,232,240,0.75)");
    glow.addColorStop(1, "rgba(191,219,254,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8edf2";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 21 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(100,116,139,0.25)";
    ctx.beginPath();
    ctx.arc(moonX - 7 * scale, moonY + 2 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const sunX = view.x + view.w * 0.76;
    const sunY = view.y + 74 * scale;
    const glowRadius = 78 * scale;
    const glow = ctx.createRadialGradient(sunX, sunY, 5 * scale, sunX, sunY, glowRadius);
    glow.addColorStop(0, "rgba(255,250,205,1)");
    glow.addColorStop(0.24, "rgba(255,226,125,0.7)");
    glow.addColorStop(1, "rgba(255,221,120,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff5c4";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 22 * scale, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 5; i += 1) {
      const cloudX = view.x - 110 * scale + ((i * 177 + state.phaseElapsed * 4) % (view.w + 220 * scale));
      const cloudY = view.y + (48 + (i % 3) * 43) * scale;
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, 58 * scale, 15 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cloudX - 24 * scale, cloudY - 8 * scale, 28 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cloudX + 18 * scale, cloudY - 11 * scale, 34 * scale, 22 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRealisticFloor(horizon, player, view) {
  const night = state.phase === "night";
  const worldTwo = state.world === 2;
  const floor = ctx.createLinearGradient(0, horizon, 0, view.y + view.h);
  if (worldTwo) {
    floor.addColorStop(0, night ? "#30343a" : "#817764");
    floor.addColorStop(1, night ? "#171b20" : "#403a31");
  } else {
    floor.addColorStop(0, night ? "#1c342d" : "#527b44");
    floor.addColorStop(1, night ? "#071812" : "#173f25");
  }
  ctx.fillStyle = floor;
  ctx.fillRect(view.x, horizon, view.w, view.y + view.h - horizon);

  const seed = state.world * 1000 + player.c * 101 + player.r * 211;
  const detailCount = view.h < VIEW3D_H ? 100 : 190;
  for (let i = 0; i < detailCount; i += 1) {
    const x = view.x + stableNoise(seed + i * 13) * view.w;
    const depth = Math.pow(stableNoise(seed + i * 29 + 7), 0.48);
    const y = horizon + 5 + depth * Math.max(1, view.y + view.h - horizon - 7);
    const size = (0.7 + depth * 4.2) * Math.min(1, view.h / VIEW3D_H + 0.2);
    ctx.globalAlpha = 0.14 + depth * 0.36;
    if (worldTwo) {
      ctx.fillStyle = stableNoise(seed + i * 43) > 0.5 ? "#c2b69d" : "#27231f";
      ctx.beginPath();
      ctx.ellipse(x, y, size * 1.4, size * 0.45, stableNoise(i * 71) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = stableNoise(seed + i * 37) > 0.55 ? "#b0d269" : "#173d21";
      ctx.lineWidth = Math.max(0.7, size * 0.34);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + size * 0.25, y - size, x + size * 0.8, y - size * 1.55);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const haze = ctx.createLinearGradient(0, horizon - 18, 0, horizon + 72);
  haze.addColorStop(0, "rgba(220,232,224,0)");
  haze.addColorStop(0.5, night ? "rgba(92,115,126,0.24)" : "rgba(221,232,216,0.3)");
  haze.addColorStop(1, "rgba(220,232,224,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(view.x, horizon - 18, view.w, Math.min(90, view.h * 0.28));
}

function drawProjectedSpriteArt(kind, label, color, x, baseY, w, h, hpRatio) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.ellipse(0, 2, w * 0.44, Math.max(3, h * 0.075), 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "floor") {
    if (label === "PORTAL") {
      ctx.shadowBlur = Math.max(10, w * 0.22);
      ctx.shadowColor = "#c084fc";
      const portal = ctx.createRadialGradient(0, -h * 0.1, 2, 0, -h * 0.1, w * 0.48);
      portal.addColorStop(0, "rgba(255,255,255,0.95)");
      portal.addColorStop(0.28, "rgba(168,85,247,0.85)");
      portal.addColorStop(0.72, "rgba(76,29,149,0.65)");
      portal.addColorStop(1, "rgba(88,28,135,0)");
      ctx.fillStyle = portal;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.08, w * 0.52, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowBlur = Math.max(8, w * 0.17);
      ctx.shadowColor = "#fb923c";
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.53, h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fb923c";
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc((i - 2) * w * 0.16, -stableNoise(i * 9) * h * 0.12, w * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  if (kind === "heart") {
    ctx.fillStyle = "#463429";
    ctx.fillRect(-w * 0.34, -h * 0.18, w * 0.68, h * 0.2);
    ctx.shadowBlur = Math.max(12, w * 0.25);
    ctx.shadowColor = "#fb7185";
    const heart = ctx.createLinearGradient(0, -h, 0, 0);
    heart.addColorStop(0, "#fecdd3");
    heart.addColorStop(0.34, "#fb4770");
    heart.addColorStop(1, "#9f1239");
    ctx.fillStyle = heart;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.12);
    ctx.bezierCurveTo(-w * 0.5, -h * 0.4, -w * 0.52, -h * 0.9, -w * 0.2, -h * 0.88);
    ctx.bezierCurveTo(0, -h * 0.86, 0, -h * 0.66, 0, -h * 0.6);
    ctx.bezierCurveTo(0, -h * 0.66, 0, -h * 0.86, w * 0.2, -h * 0.88);
    ctx.bezierCurveTo(w * 0.52, -h * 0.9, w * 0.5, -h * 0.4, 0, -h * 0.12);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (kind === "flying") {
    ctx.fillStyle = "#301943";
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.48);
    ctx.lineTo(-w * 0.58, -h * 0.82);
    ctx.lineTo(-w * 0.43, -h * 0.32);
    ctx.lineTo(-w * 0.18, -h * 0.45);
    ctx.lineTo(0, -h * 0.16);
    ctx.lineTo(w * 0.18, -h * 0.45);
    ctx.lineTo(w * 0.43, -h * 0.32);
    ctx.lineTo(w * 0.58, -h * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d946ef";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.48, w * 0.18, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.fillRect(-w * 0.09, -h * 0.56, w * 0.06, h * 0.035);
    ctx.fillRect(w * 0.03, -h * 0.56, w * 0.06, h * 0.035);
  } else if (kind === "skeleton") {
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = Math.max(2, w * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.63);
    ctx.lineTo(0, -h * 0.22);
    ctx.moveTo(0, -h * 0.52);
    ctx.lineTo(-w * 0.32, -h * 0.3);
    ctx.moveTo(0, -h * 0.52);
    ctx.lineTo(w * 0.32, -h * 0.3);
    ctx.moveTo(0, -h * 0.24);
    ctx.lineTo(-w * 0.2, -h * 0.02);
    ctx.moveTo(0, -h * 0.24);
    ctx.lineTo(w * 0.2, -h * 0.02);
    ctx.stroke();
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.76, w * 0.22, h * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(-w * 0.075, -h * 0.79, w * 0.045, 0, Math.PI * 2);
    ctx.arc(w * 0.075, -h * 0.79, w * 0.045, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const boss = kind === "boss";
    const player = kind === "player";
    const body = ctx.createLinearGradient(-w * 0.35, -h * 0.65, w * 0.35, -h * 0.08);
    body.addColorStop(0, player ? shadeHex(color, 1.25) : boss ? "#991b1b" : "#4c1d6f");
    body.addColorStop(1, player ? shadeHex(color, 0.52) : boss ? "#3f0b0b" : "#190d29");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-w * 0.32, -h * 0.12);
    ctx.lineTo(-w * 0.27, -h * 0.62);
    ctx.quadraticCurveTo(0, -h * 0.76, w * 0.27, -h * 0.62);
    ctx.lineTo(w * 0.32, -h * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = player ? "#d9a477" : boss ? "#7f1d1d" : "#66545d";
    ctx.beginPath();
    ctx.arc(0, -h * 0.76, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
    if (boss) {
      ctx.fillStyle = "#2b1010";
      ctx.beginPath();
      ctx.moveTo(-w * 0.18, -h * 0.9);
      ctx.lineTo(-w * 0.36, -h * 1.05);
      ctx.lineTo(-w * 0.07, -h * 0.91);
      ctx.moveTo(w * 0.18, -h * 0.9);
      ctx.lineTo(w * 0.36, -h * 1.05);
      ctx.lineTo(w * 0.07, -h * 0.91);
      ctx.fill();
    }
    ctx.fillStyle = player ? "#f8fafc" : "#fef08a";
    ctx.shadowBlur = player ? 0 : Math.max(4, w * 0.08);
    ctx.shadowColor = "#facc15";
    ctx.beginPath();
    ctx.arc(-w * 0.075, -h * 0.78, w * 0.035, 0, Math.PI * 2);
    ctx.arc(w * 0.075, -h * 0.78, w * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (Number.isFinite(hpRatio) && hpRatio < 0.999) {
    ctx.fillStyle = "rgba(7,12,18,0.88)";
    roundRect(-w * 0.42, -h * 1.08, w * 0.84, Math.max(4, h * 0.055), 3);
    ctx.fill();
    ctx.fillStyle = hpRatio > 0.45 ? "#4ade80" : "#fb7185";
    ctx.fillRect(-w * 0.4, -h * 1.065, w * 0.8 * Math.max(0, hpRatio), Math.max(2, h * 0.025));
  }
  ctx.restore();
}

function drawRealisticBillboard(player, cameraAngle, sprite, horizon, projection, view, depthBuffer) {
  const dx = sprite.c + 0.5 - (player.c + 0.5);
  const dy = sprite.r + 0.5 - (player.r + 0.5);
  const forward = Math.cos(cameraAngle) * dx + Math.sin(cameraAngle) * dy;
  if (forward <= 0.12 || forward > VIEW3D_MAX_DISTANCE) return;
  const side = -Math.sin(cameraAngle) * dx + Math.cos(cameraAngle) * dy;
  const screenX = view.x + view.w / 2 + (side / forward) * projection;
  const sizeBoost = sprite.boost || 1;
  const spriteW = Math.max(12, projection * 0.62 * sizeBoost / forward);
  const spriteH = sprite.kind === "floor"
    ? Math.max(8, projection * 0.24 * sizeBoost / forward)
    : Math.max(16, projection * 0.92 * sizeBoost / forward);
  const baseY = horizon + projection * VIEW3D_CAMERA_HEIGHT / forward;
  const left = screenX - spriteW * 0.58;
  const right = screenX + spriteW * 0.58;
  if (right < view.x || left > view.x + view.w) return;

  const columnWidth = view.w / view.cols;
  const startCol = Math.max(0, Math.floor((left - view.x) / columnWidth));
  const endCol = Math.min(view.cols - 1, Math.ceil((right - view.x) / columnWidth));
  let runStart = -1;
  const drawRun = (from, to) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x + from * columnWidth - 1, view.y, (to - from + 1) * columnWidth + 2, view.h);
    ctx.clip();
    drawProjectedSpriteArt(
      sprite.kind,
      sprite.label,
      sprite.color,
      screenX,
      Math.min(view.y + view.h + spriteH * 0.2, baseY),
      spriteW,
      spriteH,
      sprite.hpRatio,
    );
    ctx.restore();
  };

  for (let col = startCol; col <= endCol + 1; col += 1) {
    const visible = col <= endCol && forward < depthBuffer[col] + 0.14;
    if (visible && runStart < 0) runStart = col;
    if (!visible && runStart >= 0) {
      drawRun(runStart, col - 1);
      runStart = -1;
    }
  }
}

function drawRealisticEntities(player, cameraAngle, horizon, projection, view, depthBuffer) {
  const sprites = [
    ...activeHearts().map((heart) => ({
      c: heart.c,
      r: heart.r,
      label: isFreewar() ? (heart.ownerId === 1 ? "DITT HJÄRTA" : `BOT ${heart.ownerId - 1} HJÄRTA`) : "HJÄRTA",
      color: state.players.find((owner) => owner.id === heart.ownerId)?.color || "#fb7185",
      kind: "heart",
      boost: 1.18,
      hpRatio: heart.hp / heart.maxHp,
    })),
    ...state.players
      .filter((other) => other.id !== player.id && !other.eliminated)
      .map((other) => ({ c: other.c, r: other.r, label: isFreewar() && other.isBot ? `BOT ${other.id - 1}` : `P${other.id}`, color: other.color, kind: "player", boost: 1, hpRatio: other.hp / other.maxHp })),
    ...state.skeletons.map((skeleton) => ({ c: skeleton.c, r: skeleton.r, label: "SKELETT", color: "#f8fafc", kind: "skeleton", boost: 0.9, hpRatio: skeleton.hp / skeleton.maxHp })),
    ...state.enemies.map((enemy) => ({
      c: enemy.c,
      r: enemy.r,
      label: enemy.type === "boss" ? "BOSS" : enemy.type === "flying" ? "FLYGARE" : "FIENDE",
      color: enemy.type === "boss" ? "#ef4444" : enemy.type === "flying" ? "#d946ef" : "#7c3aed",
      kind: enemy.type === "boss" ? "boss" : enemy.type === "flying" ? "flying" : "enemy",
      boost: enemy.type === "boss" ? 1.5 : 1,
      hpRatio: enemy.hp / enemy.maxHp,
    })),
    ...lavaCells().map((cell) => ({ ...cell, label: "LAVA", color: "#f97316", kind: "floor", boost: 1.1, hpRatio: 1 })),
    ...(state.portalOpen ? [{ ...currentWorld().portal, label: "PORTAL", color: "#a855f7", kind: "floor", boost: 1.4, hpRatio: 1 }] : []),
  ];

  sprites
    .map((sprite) => ({
      ...sprite,
      forward: Math.cos(cameraAngle) * (sprite.c - player.c) + Math.sin(cameraAngle) * (sprite.r - player.r),
    }))
    .sort((a, b) => b.forward - a.forward)
    .forEach((sprite) => drawRealisticBillboard(player, cameraAngle, sprite, horizon, projection, view, depthBuffer));
}

function drawFirstPersonHands(view) {
  const bottom = view.y + view.h;
  const scale = Math.min(1, view.h / 360);
  const skin = ctx.createLinearGradient(0, bottom - 95 * scale, 0, bottom);
  skin.addColorStop(0, "#e7b585");
  skin.addColorStop(1, "#9b6540");
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(view.x + view.w * 0.19, bottom);
  ctx.quadraticCurveTo(view.x + view.w * 0.25, bottom - 76 * scale, view.x + view.w * 0.33, bottom - 38 * scale);
  ctx.lineTo(view.x + view.w * 0.37, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(view.x + view.w * 0.81, bottom);
  ctx.quadraticCurveTo(view.x + view.w * 0.75, bottom - 76 * scale, view.x + view.w * 0.67, bottom - 38 * scale);
  ctx.lineTo(view.x + view.w * 0.63, bottom);
  ctx.closePath();
  ctx.fill();

  if (state.hasSword) {
    const swordX = view.x + view.w * 0.7;
    ctx.save();
    ctx.translate(swordX, bottom - 35 * scale);
    ctx.rotate(-0.24);
    const blade = ctx.createLinearGradient(-12, 0, 18, 0);
    blade.addColorStop(0, "#64748b");
    blade.addColorStop(0.46, "#f8fafc");
    blade.addColorStop(1, "#94a3b8");
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(-10 * scale, 0);
    ctx.lineTo(-5 * scale, -168 * scale);
    ctx.lineTo(0, -188 * scale);
    ctx.lineTo(8 * scale, -166 * scale);
    ctx.lineTo(11 * scale, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(-34 * scale, -4 * scale, 68 * scale, 10 * scale);
    ctx.fillStyle = "#4b2e1f";
    ctx.fillRect(-8 * scale, 4 * scale, 16 * scale, 55 * scale);
    ctx.restore();
  }
}

function drawRealisticFirstPersonView(player, view, depthBuffer) {
  if (!player || !view) return;
  const cameraAngle = cameraAngleFor(player);
  const projection = (view.w / 2) / Math.tan(VIEW3D_FOV / 2);
  const pitchLimit = Math.min(MAX_LOOK_PITCH, Math.atan((view.h * 0.4) / projection));
  const renderPitch = Math.max(-pitchLimit, Math.min(pitchLimit, player.lookPitch || 0));
  const horizon = view.y + view.h * 0.46 + Math.tan(renderPitch) * projection;
  const columnWidth = view.w / view.cols;

  ctx.save();
  roundRect(view.x, view.y, view.w, view.h, 9);
  ctx.clip();
  drawRealisticSky(horizon, view);
  drawRealisticFloor(horizon, player, view);

  for (let i = 0; i < view.cols; i += 1) {
    const cameraX = (i + 0.5) / view.cols - 0.5;
    const rayAngle = cameraAngle + cameraX * VIEW3D_FOV;
    const hit = castRealisticWallRay(rayAngle, player);
    const forwardDistance = Math.max(VIEW3D_NEAR, hit.distance * Math.cos(rayAngle - cameraAngle));
    depthBuffer[i] = forwardDistance;
    const sliceH = Math.min(view.h * 2.25, projection * VIEW3D_WALL_HEIGHT / forwardDistance);
    const wallY = horizon - sliceH * (1 - VIEW3D_CAMERA_HEIGHT);
    const x = view.x + i * columnWidth;
    ctx.fillStyle = realisticWallColor(hit, forwardDistance);
    ctx.fillRect(x, wallY, columnWidth + 1, sliceH);

    const material = hit.material.name;
    if (material === "wood") {
      ctx.fillStyle = `rgba(39,20,9,${Math.min(0.45, 0.15 + forwardDistance * 0.018)})`;
      for (let seam = 1; seam < 4; seam += 1) {
        ctx.fillRect(x, wallY + sliceH * seam / 4, columnWidth + 1, Math.max(1, sliceH * 0.008));
      }
    } else if (material === "stone" || material === "temple" || material === "boundary") {
      ctx.fillStyle = `rgba(24,30,32,${Math.min(0.36, 0.1 + forwardDistance * 0.016)})`;
      for (let seam = 1; seam < 5; seam += 1) {
        ctx.fillRect(x, wallY + sliceH * seam / 5, columnWidth + 1, Math.max(1, sliceH * 0.006));
      }
    }

    const fogAlpha = Math.min(0.62, Math.max(0, (forwardDistance - 4) / 17));
    if (fogAlpha > 0) {
      ctx.fillStyle = state.phase === "night"
        ? `rgba(34,53,70,${fogAlpha})`
        : `rgba(198,216,211,${fogAlpha})`;
      ctx.fillRect(x, wallY, columnWidth + 1, sliceH);
    }
  }

  drawRealisticEntities(player, cameraAngle, horizon, projection, view, depthBuffer);
  drawFirstPersonHands(view);

  const vignette = ctx.createRadialGradient(
    view.x + view.w / 2,
    view.y + view.h * 0.48,
    view.h * 0.12,
    view.x + view.w / 2,
    view.y + view.h * 0.48,
    view.w * 0.54,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(0,0,0,0.08)");
  vignette.addColorStop(1, state.phase === "night" ? "rgba(0,0,0,0.56)" : "rgba(0,0,0,0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(view.x, view.y, view.w, view.h);

  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx - 3, cy);
  ctx.moveTo(cx + 3, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy - 3);
  ctx.moveTo(cx, cy + 3);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();

  ctx.fillStyle = "rgba(5,12,18,0.55)";
  roundRect(view.x + 14, view.y + 12, player.isBot ? 180 : 205, 40, 7);
  ctx.fill();
  drawText(
    player.isBot ? "BOT 2 • FÖRSVARAR" : `P${player.id} • DRA FÖR ATT TITTA`,
    view.x + 28,
    view.y + 27,
    12,
    player.id === 1 ? "#e0f2fe" : "#fef3c7",
    "left",
    "900",
  );
  drawText(
    player.isBot ? "Boten styr själv" : "Spak: bara framåt",
    view.x + 28,
    view.y + 44,
    11,
    "#dbeafe",
    "left",
    "700",
  );
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#0b1720";
  ctx.lineWidth = 8;
  roundRect(view.x, view.y, view.w, view.h, 9);
  ctx.stroke();
  ctx.strokeStyle = player.id === 1 ? "#67e8f9" : "#fde047";
  ctx.lineWidth = 2;
  roundRect(view.x + 4, view.y + 4, view.w - 8, view.h - 8, 7);
  ctx.stroke();
  ctx.restore();
}

function drawBlocks() {
  for (const [blockKey, block] of state.blocks.entries()) {
    const [c, r] = blockKey.split(",").map(Number);
    const info = BLOCKS[block.type];
    const x = BOARD_X + c * TILE + 5;
    const y = BOARD_Y + r * TILE + 5;
    ctx.fillStyle = info.dark;
    ctx.fillRect(x, y, TILE - 10, TILE - 10);
    ctx.fillStyle = info.color;
    ctx.fillRect(x + 4, y + 4, TILE - 18, TILE - 18);
    ctx.fillStyle = info.light;
    ctx.fillRect(x + 8, y + 8, TILE - 26, 6);
    if (isFreewar() && block.ownerId) {
      const owner = state.players.find((player) => player.id === block.ownerId);
      ctx.strokeStyle = owner?.color || "#fff";
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 1, y + 1, TILE - 12, TILE - 12);
    }
    if (block.type === "arrow") {
      ctx.fillStyle = block.shotFlash > 0 ? "#fef08a" : "#facc15";
      ctx.fillRect(x + 11, y + 23, 24, 5);
      ctx.fillRect(x + 29, y + 18, 5, 15);
      ctx.fillRect(x + 34, y + 21, 5, 9);
      ctx.fillStyle = "#082f49";
      ctx.fillRect(x + 12, y + 15, 7, 7);
      ctx.fillRect(x + 12, y + 31, 7, 7);
    }
    const hpW = Math.max(0, (TILE - 16) * (block.hp / block.maxHp));
    ctx.fillStyle = "#111827";
    ctx.fillRect(x + 3, y + TILE - 17, TILE - 16, 7);
    ctx.fillStyle = block.type === "wood" ? "#fde047" : block.type === "arrow" ? "#67e8f9" : "#e5e7eb";
    ctx.fillRect(x + 3, y + TILE - 17, hpW, 7);
  }
}

function drawProjectiles() {
  ctx.save();
  for (const projectile of state.projectiles) {
    const from = centerOf(projectile.fromC, projectile.fromR);
    const to = centerOf(projectile.toC, projectile.toR);
    const alpha = Math.max(0.15, Math.min(1, projectile.life / 0.18));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(to.x - 5, to.y - 5, 10, 10);
  }
  ctx.restore();
}

function drawTerrainWalls() {
  for (const { c, r } of currentWorld().terrainWalls) {
    if (isFreewar() && !isBaseWall(c, r)) continue;
    const x = BOARD_X + c * TILE + 4;
    const y = BOARD_Y + r * TILE + 4;
    ctx.fillStyle = "#eef6ff";
    ctx.fillRect(x, y, TILE - 8, TILE - 8);
    ctx.fillStyle = "#c7d8ea";
    ctx.fillRect(x + 5, y + 5, TILE - 18, TILE - 18);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 9, y + 9, TILE - 26, 8);
    ctx.strokeStyle = "#6b8aa8";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 10, TILE - 10);
  }
}

function drawHeart() {
  for (const heart of activeHearts()) {
    const { x, y } = centerOf(heart.c, heart.r);
    const owner = state.players.find((player) => player.id === heart.ownerId);
    ctx.save();
    ctx.globalAlpha = heart.hp > 0 ? 1 : 0.34;
    ctx.fillStyle = owner?.dark || "#be123c";
    ctx.fillRect(x - 14, y - 6, 28, 28);
    ctx.fillRect(x - 22, y - 14, 16, 16);
    ctx.fillRect(x + 6, y - 14, 16, 16);
    ctx.fillStyle = owner?.color || "#fb7185";
    ctx.fillRect(x - 7, y - 1, 10, 10);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 23, y + 23, 46, 6);
    ctx.fillStyle = heart.hp > 0 ? "#ef4444" : "#64748b";
    ctx.fillRect(x - 23, y + 23, 46 * Math.max(0, heart.hp / heart.maxHp), 6);
    if (isFreewar()) drawText(heart.ownerId === 1 ? "DU" : `B${heart.ownerId - 1}`, x, y + 38, 12, "#fff", "center", "900");
    ctx.restore();
  }
}

function drawPlayers() {
  for (const player of state.players.filter((item) => !item.eliminated)) {
    const { x, y } = centerOf(player.c, player.r);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x - 17, y + 15, 34, 7);
    ctx.fillStyle = player.dark;
    ctx.fillRect(x - 16, y - 7, 32, 30);
    ctx.fillStyle = player.color;
    ctx.fillRect(x - 12, y - 20, 24, 18);
    ctx.fillStyle = "#111827";
    const dir = dirFromName(player.dir);
    ctx.fillRect(x + dir.dx * 6 - 4, y - 14 + dir.dy * 3, 4, 4);
    ctx.fillRect(x + dir.dx * 6 + 5, y - 14 + dir.dy * 3, 4, 4);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 20, y + 25, 40, 5);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x - 20, y + 25, 40 * Math.max(0, player.hp / player.maxHp), 5);
    drawText(isFreewar() && player.isBot ? `B${player.id - 1}` : `P${player.id}`, x, y + 37, 13, "#fff", "center", "900");
    ctx.restore();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    const { x, y } = centerOf(enemy.c, enemy.r);
    ctx.save();
    if (enemy.hitFlash > 0) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 25, y - 25, 50, 50);
      ctx.globalAlpha = 1;
    }

    if (enemy.type === "boss") {
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(x - 25, y - 25, 50, 50);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x - 19, y - 19, 38, 38);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(x - 19, y - 31, 12, 12);
      ctx.fillRect(x + 7, y - 31, 12, 12);
      ctx.fillStyle = "#111827";
      ctx.fillRect(x - 11, y - 5, 7, 7);
      ctx.fillRect(x + 4, y - 5, 7, 7);
    } else if (enemy.type === "flying") {
      ctx.fillStyle = "#a21caf";
      ctx.fillRect(x - 14, y - 16, 28, 28);
      ctx.fillStyle = "#f0abfc";
      ctx.fillRect(x - 30, y - 6, 16, 12);
      ctx.fillRect(x + 14, y - 6, 16, 12);
      ctx.fillStyle = "#111827";
      ctx.fillRect(x - 7, y - 8, 5, 5);
      ctx.fillRect(x + 4, y - 8, 5, 5);
    } else {
      ctx.fillStyle = "#4c1d95";
      ctx.fillRect(x - 17, y - 17, 34, 34);
      ctx.fillStyle = "#8b5cf6";
      ctx.fillRect(x - 11, y - 21, 22, 8);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 9, y - 7, 6, 6);
      ctx.fillRect(x + 3, y - 7, 6, 6);
      ctx.fillStyle = "#111827";
      ctx.fillRect(x - 7, y - 5, 3, 3);
      ctx.fillRect(x + 5, y - 5, 3, 3);
    }

    const hpRatio = enemy.maxHp > 0 ? Math.max(0, enemy.hp / enemy.maxHp) : 0;
    ctx.fillStyle = "#111827";
    ctx.fillRect(x - 20, y + 26, 40, 5);
    ctx.fillStyle = enemy.type === "boss" ? "#facc15" : "#fb7185";
    ctx.fillRect(x - 20, y + 26, 40 * hpRatio, 5);
    ctx.restore();
  }
}

function drawSkeletons() {
  for (const skeleton of state.skeletons) {
    const { x, y } = centerOf(skeleton.c, skeleton.r);
    ctx.save();
    if (skeleton.hitFlash > 0) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 23, y - 23, 46, 46);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x - 13, y - 19, 26, 19);
    ctx.fillRect(x - 8, y, 16, 25);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(x - 18, y + 4, 8, 18);
    ctx.fillRect(x + 10, y + 4, 8, 18);
    ctx.fillStyle = "#111827";
    ctx.fillRect(x - 7, y - 12, 5, 5);
    ctx.fillRect(x + 3, y - 12, 5, 5);
    ctx.fillRect(x - 5, y - 3, 10, 3);
    ctx.fillStyle = "#111827";
    ctx.fillRect(x - 18, y + 29, 36, 5);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(x - 18, y + 29, 36 * Math.max(0, skeleton.hp / skeleton.maxHp), 5);
    ctx.restore();
  }
}

function drawTopHud() {
  if (isFreewar()) {
    drawFreewarTopHud();
    return;
  }
  const isNight = state.phase === "night";
  ctx.fillStyle = isNight ? "#111827" : "#fff7ad";
  roundRect(30, 18, 964, 52, 8);
  ctx.fill();
  ctx.strokeStyle = isNight ? "#60a5fa" : "#f59e0b";
  ctx.lineWidth = 3;
  ctx.stroke();

  const phaseText = state.portalOpen
    ? "Portal öppen"
    : `V${state.world} ${isNight ? "Natt" : "Dag"} ${state.day}`;
  drawText(phaseText, 52, 45, 22, isNight ? "#dbeafe" : "#422006", "left", "900");
  drawText(`Tid: ${Math.ceil(phaseRemaining())}s`, 190, 45, 18, isNight ? "#dbeafe" : "#422006", "left", "800");
  drawText(`Pengar: ${state.money}`, 315, 45, 18, isNight ? "#fde68a" : "#854d0e", "left", "800");
  drawText(`Hjärta: ${Math.max(0, state.heart.hp)}/3`, 450, 45, 18, isNight ? "#fecdd3" : "#9f1239", "left", "800");
  drawText(`Svärd: ${state.hasSword ? "ja" : "nej"}`, 595, 45, 18, isNight ? "#d1fae5" : "#14532d", "left", "800");
  const lives = state.players
    .map((player) => `${player.isBot ? "BOT" : `P${player.id}`} ${Math.max(0, player.hp)}/3`)
    .join("  ");
  drawText(lives, 720, 45, 18, isNight ? "#e0f2fe" : "#1e3a8a", "left", "800");
}

function drawFreewarTopHud() {
  const night = state.phase === "night";
  const human = state.players[0];
  const homeHeart = heartForPlayer(1);
  ctx.fillStyle = night ? "#111827" : "#ecfccb";
  roundRect(30, 18, 964, 52, 8);
  ctx.fill();
  ctx.strokeStyle = night ? "#a78bfa" : "#22c55e";
  ctx.lineWidth = 3;
  ctx.stroke();

  const color = night ? "#f8fafc" : "#14532d";
  drawText(`Freewar ${night ? "Natt" : "Dag"} ${state.day}`, 50, 45, 20, color, "left", "900");
  drawText(`Tid: ${Math.ceil(phaseRemaining())}s`, 225, 45, 17, color, "left", "800");
  drawText(`Pengar: ${state.money}`, 350, 45, 17, night ? "#fde68a" : "#854d0e", "left", "800");
  drawText(`Hjärta: ${Math.max(0, homeHeart?.hp || 0)}/3`, 485, 45, 17, night ? "#fecdd3" : "#9f1239", "left", "800");
  drawText(human?.eliminated ? "Du: UTE" : `Du: ${Math.max(0, human?.hp || 0)}/3`, 625, 45, 17, night ? "#bae6fd" : "#075985", "left", "800");
  drawText(`Kvar: ${activeFreewarPlayers().length}`, 735, 45, 17, night ? "#d1fae5" : "#166534", "left", "800");
  drawText(`Svärd: ${state.hasSword ? "ja" : "nej"}`, 840, 45, 17, night ? "#fef3c7" : "#713f12", "left", "800");
}

function drawToolPanel() {
  if (isFreewar()) {
    drawFreewarToolPanel();
    return;
  }
  const x = 732;
  const y = 100;
  ctx.fillStyle = "rgba(15, 23, 42, 0.84)";
  roundRect(x, y, 250, 382, 8);
  ctx.fill();
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText(currentWorld().name, x + 20, y + 28, 24, "#fff", "left", "900");
  drawText(isDay() ? "Bygg på dagen" : "Fiender på natten", x + 20, y + 58, 16, "#cbd5e1", "left", "700");
  drawText("Dag: 1 min  Natt: 0,5 min", x + 20, y + 78, 13, "#e0f2fe", "left", "800");

  const disabledDayTool = !isDay() || state.portalOpen;
  pushButton("shop", x + 20, y + 84, 98, 48, "Shop", "#22c55e", {
    disabled: !isDay() || state.portalOpen,
    outline: state.shopOpen ? "#fef08a" : null,
  });
  pushButton("build", x + 132, y + 84, 98, 48, "Bygg", "#38bdf8", {
    disabled: disabledDayTool,
    outline: state.activeTool === "build" ? "#fef08a" : null,
  });
  pushButton("heart", x + 20, y + 146, 98, 48, "Hjärta", "#ef4444", {
    disabled: disabledDayTool,
    textColor: "#fff",
    outline: state.activeTool === "heart" ? "#fef08a" : null,
  });
  pushButton("delete", x + 132, y + 146, 98, 48, "Radera", "#111827", {
    disabled: disabledDayTool,
    textColor: "#fff",
    outline: state.activeTool === "delete" ? "#fef08a" : null,
  });
  pushButton("restart", x + 20, y + 208, 210, 40, "Starta om", "#fbbf24", { small: true });
  pushButton("drink-healer", x + 20, y + 260, 210, 40, "Drick healerdryck", "#fb7185", {
    disabled: !hasInventory("healer"),
    small: true,
    textColor: "#fff",
  });

  const toolName = state.activeTool === "build"
    ? "Byggläge"
    : state.activeTool === "delete"
      ? "Raderingsläge"
      : state.activeTool === "heart"
        ? "Flytta hjärtat"
        : "Vanligt läge";
  drawText(toolName, x + 22, y + 330, 17, "#f8fafc", "left", "800");
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 20, y + 338, 210, 38);
  ctx.clip();
  drawText(state.messageTimer > 0 ? state.message : "Skydda hjärtat.", x + 22, y + 357, 15, "#fde68a", "left", "700");
  ctx.restore();
}

function drawFreewarToolPanel() {
  const x = 732;
  const y = 100;
  const day = isDay();
  const humanOut = !!state.players[0]?.eliminated;
  const canBuild = day && !humanOut;
  ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
  roundRect(x, y, 250, 382, 8);
  ctx.fill();
  ctx.strokeStyle = humanOut ? "#94a3b8" : day ? "#86efac" : "#c4b5fd";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText("Freewar", x + 20, y + 28, 24, "#fff", "left", "900");
  drawText(humanOut ? "Du tittar på matchen" : day ? "Botarna bygger baser" : "Botarna krigar", x + 20, y + 58, 16, humanOut ? "#e2e8f0" : day ? "#bbf7d0" : "#ddd6fe", "left", "800");
  drawText("Dag: 1 min  Natt: 1 min", x + 20, y + 78, 13, "#e0f2fe", "left", "800");

  pushButton("shop", x + 20, y + 84, 98, 48, "Shop", "#22c55e", {
    disabled: !canBuild,
    outline: state.shopOpen ? "#fef08a" : null,
  });
  pushButton("build", x + 132, y + 84, 98, 48, "Bygg", "#38bdf8", {
    disabled: !canBuild,
    outline: state.activeTool === "build" ? "#fef08a" : null,
  });
  pushButton("delete", x + 20, y + 146, 210, 48, "Radera eget block", "#111827", {
    disabled: !canBuild,
    textColor: "#fff",
    outline: state.activeTool === "delete" ? "#fef08a" : null,
    small: true,
  });
  pushButton("restart", x + 20, y + 208, 210, 40, "Starta om", "#fbbf24", { small: true });

  drawText(humanOut ? "ÅSKÅDARE" : day ? "BYGGFRED" : "NATTKRIG", x + 22, y + 280, 18, humanOut ? "#cbd5e1" : day ? "#86efac" : "#f0abfc", "left", "900");
  drawText(humanOut ? "Sista deltagaren vinner." : day ? "Shoppa och bygg försvar." : "Slå spelare och hjärtan.", x + 22, y + 307, 14, "#cbd5e1", "left", "700");
  const toolName = humanOut
    ? "Botarna fortsätter"
    : state.activeTool === "build"
    ? "Byggläge"
    : state.activeTool === "delete"
      ? "Raderingsläge"
      : "Vanligt läge";
  drawText(toolName, x + 22, y + 334, 16, "#f8fafc", "left", "800");
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 20, y + 341, 210, 35);
  ctx.clip();
  drawText(state.messageTimer > 0 ? state.message : (humanOut ? "Se vem som blir sist kvar." : day ? "Förbered basen." : "Kriget pågår!"), x + 22, y + 359, 14, "#fde68a", "left", "700");
  ctx.restore();
}

function drawShop() {
  if (!state.shopOpen) return;
  const x = 114;
  const y = 70;
  const w = 690;
  const h = 590;
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 4;
  ctx.stroke();
  drawText("Blockshop", x + 32, y + 42, 32, "#bbf7d0", "left", "900");
  drawText(`Pengar: ${state.money}`, x + w - 32, y + 42, 22, "#fde68a", "right", "900");

  if (isFreewar()) {
    drawShopItem("buy-wood", x + 36, y + 86, 190, 140, "Träblock", `${priceFor("wood")} kr`, "#c46b34", "5 slag");
    drawShopItem("buy-stone", x + 250, y + 86, 190, 140, "Stenblock", `${priceFor("stone")} kr`, "#8d99a6", "10 slag");
    drawShopItem("buy-sword", x + 464, y + 86, 190, 140, "Svärd", `${priceFor("sword")} kr`, "#facc15", "Slår hårdare");
    drawShopItem("buy-arrow", x + 36, y + 250, 190, 140, "Pilblock", `${priceFor("arrow")} kr`, "#38bdf8", "Skjuter på natten");
    drawShopItem("buy-lava", x + 250, y + 250, 190, 140, "Lava", `${priceFor("lava")} kr`, "#f97316", "Farlig mark");
    drawShopItem("buy-lava-blocker", x + 464, y + 250, 190, 140, "Lavablockare", `${priceFor("lavaBlocker")} kr`, "#67e8f9", "Tar bort lava");
  } else {
    drawShopItem("buy-wood", x + 36, y + 86, 190, 140, "Träblock", "5 kr", "#c46b34", "5 slag");
    drawShopItem("buy-stone", x + 250, y + 86, 190, 140, "Stenblock", "15 kr", "#8d99a6", "10 slag");
    drawShopItem("buy-sword", x + 464, y + 86, 190, 140, "Svärd", "40 kr", "#facc15", "Boss-vapen");
    drawShopItem("buy-healer", x + 36, y + 250, 190, 140, "Healerdryck", "2 kr", "#fb7185", "Helar spelare");
    drawShopItem("buy-arrow", x + 250, y + 250, 190, 140, "Pilar", "20 kr", "#38bdf8", "Skjuter var 3s");
    drawShopItem("buy-heart-heal", x + 464, y + 250, 190, 140, "Hjärtmedicin", "30 kr", "#ef4444", "Helar hjärtat");
  }

  pushButton("sell-selected", x + 250, y + 410, 190, 58, "Sälj valt", "#34d399", { small: true });
  pushButton("close-shop", x + 464, y + 410, 190, 58, "Stäng", "#f87171", { small: true, textColor: "#fff" });

  const stack = currentStack();
  const selectedText = stack ? `Valt: ${itemName(stack.type)} x${stack.count}` : "Valt: inget";
  drawText(selectedText, x + 38, y + 504, 18, "#f8fafc", "left", "800");
  drawText(isFreewar() ? "Bygg på dagen. Kriga på natten." : "Shoppen fungerar bara på dagen.", x + 38, y + 534, 15, "#cbd5e1", "left", "700");
}

function drawShopItem(id, x, y, w, h, title, price, color, subtitle) {
  ctx.fillStyle = "#1f2937";
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x + 18, y + 18, 58, 58);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + 27, y + 27, 40, 10);
  drawText(title, x + 94, y + 37, title.length > 10 ? 16 : 18, "#fff", "left", "900");
  drawText(price, x + 94, y + 66, 17, "#fde68a", "left", "800");
  drawText(subtitle, x + 18, y + 94, 15, "#cbd5e1", "left", "700");
  pushButton(id, x + 18, y + 104, w - 36, 28, "Köp", "#86efac", { small: true });
}

function drawHotbar() {
  const slot = 44;
  const gap = 5;
  const totalW = HOTBAR_SLOTS * slot + (HOTBAR_SLOTS - 1) * gap;
  const x = (VIEW_W - totalW) / 2;
  const y = 676;
  drawText("Lilla gallerian", x, y - 18, 16, "#e0f2fe", "left", "800");

  for (let i = 0; i < HOTBAR_SLOTS; i += 1) {
    const sx = x + i * (slot + gap);
    const stack = state.inventory[i];
    const selected = i === state.selectedSlot;
    ctx.fillStyle = "rgba(15,23,42,0.86)";
    roundRect(sx, y, slot, slot, 6);
    ctx.fill();
    ctx.strokeStyle = selected ? "#f59e0b" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = selected ? 3 : 2;
    ctx.stroke();
    pushButton(`slot-${i}`, sx, y, slot, slot, "", "#fff");

    if (stack) {
      if (BLOCKS[stack.type]) {
        const info = BLOCKS[stack.type];
        ctx.fillStyle = info.dark;
        ctx.fillRect(sx + 9, y + 8, 26, 26);
        ctx.fillStyle = info.color;
        ctx.fillRect(sx + 13, y + 12, 18, 18);
        if (stack.type === "arrow") {
          ctx.fillStyle = "#facc15";
          ctx.fillRect(sx + 13, y + 21, 14, 3);
          ctx.fillRect(sx + 24, y + 17, 3, 11);
          ctx.fillRect(sx + 27, y + 19, 3, 7);
        }
      } else if (ITEMS[stack.type]) {
        const info = ITEMS[stack.type];
        if (stack.type === "lava") {
          ctx.fillStyle = info.dark;
          ctx.fillRect(sx + 10, y + 10, 24, 24);
          ctx.fillStyle = info.color;
          ctx.fillRect(sx + 13, y + 15, 18, 16);
          ctx.fillStyle = info.light;
          ctx.fillRect(sx + 17, y + 18, 5, 5);
          ctx.fillRect(sx + 25, y + 23, 4, 5);
        } else if (stack.type === "lavaBlocker") {
          ctx.fillStyle = info.dark;
          ctx.fillRect(sx + 9, y + 9, 26, 26);
          ctx.fillStyle = info.color;
          ctx.fillRect(sx + 13, y + 13, 18, 18);
          ctx.fillStyle = info.light;
          ctx.fillRect(sx + 20, y + 14, 4, 16);
          ctx.fillRect(sx + 14, y + 20, 16, 4);
        } else {
          ctx.fillStyle = info.dark;
          ctx.fillRect(sx + 16, y + 9, 12, 6);
          ctx.fillRect(sx + 12, y + 16, 20, 20);
          ctx.fillStyle = info.color;
          ctx.fillRect(sx + 15, y + 19, 14, 14);
          ctx.fillStyle = info.light;
          ctx.fillRect(sx + 18, y + 21, 4, 4);
        }
      }
      drawText(String(stack.count), sx + slot - 8, y + slot - 8, 14, "#fff", "right", "900");
    }
  }
}

function drawControls() {
  if (state.mode !== "playing") return;
  if (isFreewar() && state.players[0]?.eliminated) return;
  drawDpad(1, 76, 586);
  pushButton("attack-p1", 300, 592, 76, 48, "Slå", "#f472b6", { small: true });
  if (state.playersWanted > 1 && !state.botPlayerId) {
    drawDpad(2, 790, 586);
    pushButton("attack-p2", 648, 592, 76, 48, "Slå", "#f472b6", { small: true });
  }
}

function drawDpad(playerId, x, y) {
  const centerX = x + 63;
  const centerY = y + 63;
  joystickZones.push({ playerId, x: x - 8, y: y - 8, w: 142, h: 112, centerX, centerY });
  drawText(`P${playerId} FRAMÅT`, centerX, y - 4, 14, "#e0f2fe", "center", "900");
  ctx.save();
  ctx.fillStyle = "rgba(147, 197, 253, 0.34)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(219, 234, 254, 0.78)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY + 30);
  ctx.lineTo(centerX, centerY - 30);
  ctx.moveTo(centerX, centerY - 30);
  ctx.lineTo(centerX - 13, centerY - 16);
  ctx.moveTo(centerX, centerY - 30);
  ctx.lineTo(centerX + 13, centerY - 16);
  ctx.stroke();
  ctx.restore();
  drawJoystickKnob(playerId, centerX, centerY);
}

function drawJoystickKnob(playerId, centerX, centerY) {
  const active = Array.from(activeJoysticks.values()).find((joystick) => joystick.playerId === playerId);
  const knobX = active ? active.knobX : centerX;
  const knobY = active ? active.knobY : centerY;

  ctx.save();
  ctx.globalAlpha = active ? 0.95 : 0.62;
  ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = active ? "#fef08a" : "#dbeafe";
  ctx.beginPath();
  ctx.arc(knobX, knobY, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawMenu() {
  drawBackground();
  if (state.menuPage === "freewar") {
    drawFreewarMenu();
    return;
  }

  pushButton("freewar", 397, 24, 230, 52, "Freewar", "#22c55e", { textColor: "#052e16" });
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  roundRect(166, 92, 692, 520, 8);
  ctx.fill();
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 4;
  ctx.stroke();

  drawText("Survivor of Days", VIEW_W / 2, 166, 48, "#fde047", "center", "900");
  drawText("and Blockshop of Building", VIEW_W / 2, 218, 31, "#bae6fd", "center", "900");
  drawText("Bygg en bas. Skydda hjärtat i 5 dagar.", VIEW_W / 2, 276, 22, "#f8fafc", "center", "800");
  drawText("Dagen är 1 minut. Natten är 0,5 minut.", VIEW_W / 2, 310, 18, "#cbd5e1", "center", "700");

  drawText("Värld 1", 242, 370, 18, "#bbf7d0", "left", "900");
  pushButton("start-w1-1", 226, 392, 170, 58, "1 spelare", "#38bdf8", { textColor: "#082f49" });
  pushButton("start-w1-2", 427, 392, 170, 58, "2 spelare", "#facc15", { textColor: "#422006" });
  pushButton("start-w1-bot", 628, 392, 170, 58, "1 + bot", "#86efac", { textColor: "#14532d" });

  drawText("Värld 2", 242, 466, 18, "#fed7aa", "left", "900");
  pushButton("start-w2-1", 226, 488, 170, 58, "1 spelare", "#fb923c", { textColor: "#431407" });
  pushButton("start-w2-2", 427, 488, 170, 58, "2 spelare", "#f97316", { textColor: "#431407" });
  pushButton("start-w2-bot", 628, 488, 170, 58, "1 + bot", "#a7f3d0", { textColor: "#064e3b" });

  drawText("P1/P2: dra sin bild + spak framåt", VIEW_W / 2, 570, 16, "#e0f2fe", "center", "800");
  drawText("Bot: försvarar hjärtat själv", VIEW_W / 2, 598, 16, "#d1fae5", "center", "800");
}

function drawFreewarMenu() {
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  roundRect(166, 92, 692, 520, 8);
  ctx.fill();
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 4;
  ctx.stroke();

  drawText("Freewar", VIEW_W / 2, 170, 50, "#4ade80", "center", "900");
  drawText("Välj hur många botar", VIEW_W / 2, 232, 25, "#f8fafc", "center", "800");

  const choices = [
    { count: 2, x: 226, color: "#86efac" },
    { count: 5, x: 427, color: "#4ade80" },
    { count: 8, x: 628, color: "#22c55e" },
  ];
  for (const choice of choices) {
    pushButton(
      `freewar-bots-${choice.count}`,
      choice.x,
      300,
      170,
      72,
      `${choice.count} botar`,
      choice.color,
      {
        textColor: "#052e16",
        outline: state.freewarBotCount === choice.count ? "#fef9c3" : null,
      },
    );
  }

  drawText("Du + botarna = totalt 3, 6 eller 9.", VIEW_W / 2, 424, 20, "#d1fae5", "center", "800");
  pushButton("freewar-back", 397, 486, 230, 58, "Tillbaka", "#cbd5e1", { textColor: "#0f172a" });
}

function drawMapScene() {
  withBoardTransform(() => {
    drawBoard();
    drawTerrainWalls();
    drawBlocks();
    drawProjectiles();
    drawHeart();
    drawSkeletons();
    drawEnemies();
    drawPlayers();
  });
}

function drawEndScreen(title, subtitle, buttonLabel = "Starta om") {
  drawBackground();
  drawMapScene();
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  roundRect(210, 220, 604, 250, 8);
  ctx.fill();
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 4;
  ctx.stroke();
  drawText(title, VIEW_W / 2, 285, 38, "#fde047", "center", "900");
  drawText(subtitle, VIEW_W / 2, 335, 20, "#f8fafc", "center", "800");
  pushButton("restart", VIEW_W / 2 - 110, 385, 220, 58, buttonLabel, "#86efac");
}

function freewarWinnerTitle() {
  const winnerId = state.freewar?.winnerId;
  if (winnerId === 1) return "Du vann Freewar!";
  if (winnerId) return `Bot ${winnerId - 1} vann Freewar!`;
  return "Freewar är slut!";
}

function render() {
  uiButtons = [];
  joystickZones = [];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  if (state.mode === "menu") {
    drawMenu();
    drawButtonsFrom(0);
  } else if (state.mode === "gameover") {
    drawEndScreen("Game Over", state.message || "Hjärtat måste överleva.");
    drawButtonsFrom(0);
  } else if (state.mode === "worldComplete") {
    drawEndScreen(`${currentWorld().name} klar!`, "Fler världar kommer senare.");
    drawButtonsFrom(0);
  } else if (state.mode === "freewarWin") {
    drawEndScreen(freewarWinnerTitle(), "Sist kvar vann matchen.", "Ny match");
    drawButtonsFrom(0);
  } else {
    drawBackground();
    drawTopHud();
    if (isMapView()) {
      drawMapScene();
    } else {
      for (const entry of firstPersonViewEntries()) {
        drawRealisticFirstPersonView(entry.player, entry.view, entry.depth);
      }
    }
    drawToolPanel();
    drawHotbar();
    drawControls();
    const baseButtonCount = uiButtons.length;
    drawButtonsFrom(0, baseButtonCount);
    drawShop();
    drawButtonsFrom(baseButtonCount);
  }
}

function drawButtonsFrom(start, end = uiButtons.length) {
  for (const button of uiButtons.slice(start, end)) {
    if (button.label) drawButton(button);
  }
}

function buttonAt(x, y) {
  for (let i = uiButtons.length - 1; i >= 0; i -= 1) {
    const button = uiButtons[i];
    if (x >= button.x && y >= button.y && x <= button.x + button.w && y <= button.y + button.h) {
      return button;
    }
  }
  return null;
}

function joystickZoneAt(x, y) {
  for (let i = joystickZones.length - 1; i >= 0; i -= 1) {
    const zone = joystickZones[i];
    if (x >= zone.x && y >= zone.y && x <= zone.x + zone.w && y <= zone.y + zone.h) {
      return zone;
    }
  }
  return null;
}

function lookDragViewAt(x, y) {
  if (state.mode !== "playing" || isMapView()) return null;
  return firstPersonViewEntries().find(({ player, view }) => (
    !player.isBot
    && x >= view.x
    && y >= view.y
    && x <= view.x + view.w
    && y <= view.y + view.h
  )) || null;
}

function updateLookDrag(id, point) {
  if (isMapView()) return;
  const drag = activeLookDrags.get(id);
  const player = state.players[drag?.playerId - 1];
  if (!drag || !player) return;
  const dx = point.x - drag.lastX;
  const dy = point.y - drag.lastY;
  drag.lastX = point.x;
  drag.lastY = point.y;
  player.lookYaw = normalizeAngle(cameraAngleFor(player) + dx * LOOK_YAW_SENSITIVITY);
  const projection = (drag.view.w / 2) / Math.tan(VIEW3D_FOV / 2);
  const pitchLimit = Math.min(MAX_LOOK_PITCH, Math.atan((drag.view.h * 0.4) / projection));
  player.lookPitch = Math.max(
    -pitchLimit,
    Math.min(pitchLimit, (player.lookPitch || 0) - dy * LOOK_PITCH_SENSITIVITY),
  );
  player.dir = forwardDirectionFor(player).name;
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function startDragControl(id, point) {
  const button = buttonAt(point.x, point.y);
  if (button && !button.disabled) {
    handleButton(button.id);
    render();
    return true;
  }

  const joystickZone = state.mode === "playing" && !state.shopOpen ? joystickZoneAt(point.x, point.y) : null;
  if (joystickZone) {
    activeJoysticks.set(id, {
      playerId: joystickZone.playerId,
      centerX: joystickZone.centerX,
      centerY: joystickZone.centerY,
      knobX: joystickZone.centerX,
      knobY: joystickZone.centerY,
      direction: null,
    });
    updateJoystick(id, point);
    movePlayersFromJoysticks();
    render();
    return true;
  }
  const lookEntry = lookDragViewAt(point.x, point.y);
  if (lookEntry) {
    activeLookDrags.set(id, {
      playerId: lookEntry.player.id,
      view: lookEntry.view,
      lastX: point.x,
      lastY: point.y,
    });
    render();
    return true;
  }
  return false;
}

function handlePointer(event) {
  event.preventDefault();
  const point = pointerToCanvas(event);
  if (startDragControl(event.pointerId, point)) {
    canvas.setPointerCapture?.(event.pointerId);
    return;
  }

  useMapToolAt(point);
}

function useMapToolAt(point) {
  if (state.mode !== "playing" || state.shopOpen) return;
  const cell = cellFromPoint(point.x, point.y);
  if (!cell) return;

  if (state.activeTool === "build") {
    placeBlock(cell.c, cell.r);
  } else if (state.activeTool === "delete") {
    deleteBlock(cell.c, cell.r);
  } else if (state.activeTool === "heart") {
    moveHeart(cell.c, cell.r);
  }
  render();
}

function handlePointerMove(event) {
  const hasJoystick = activeJoysticks.has(event.pointerId);
  const hasLookDrag = activeLookDrags.has(event.pointerId);
  if (!hasJoystick && !hasLookDrag) return;
  event.preventDefault();
  const point = pointerToCanvas(event);
  if (hasJoystick) updateJoystick(event.pointerId, point);
  if (hasLookDrag) updateLookDrag(event.pointerId, point);
}

function stopPointerControl(event) {
  const stoppedJoystick = activeJoysticks.delete(event.pointerId);
  const stoppedLookDrag = activeLookDrags.delete(event.pointerId);
  if (!stoppedJoystick && !stoppedLookDrag) return;
  event.preventDefault();
  render();
}

function touchToCanvas(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((touch.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((touch.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function touchId(touch) {
  return `touch-${touch.identifier}`;
}

function handleTouchStart(event) {
  event.preventDefault();
  for (const touch of event.changedTouches) {
    const point = touchToCanvas(touch);
    if (!startDragControl(touchId(touch), point)) {
      useMapToolAt(point);
    }
  }
}

function handleTouchMove(event) {
  let handled = false;
  for (const touch of event.changedTouches) {
    const id = touchId(touch);
    const hasJoystick = activeJoysticks.has(id);
    const hasLookDrag = activeLookDrags.has(id);
    if (!hasJoystick && !hasLookDrag) continue;
    const point = touchToCanvas(touch);
    if (hasJoystick) updateJoystick(id, point);
    if (hasLookDrag) updateLookDrag(id, point);
    handled = true;
  }
  if (handled) {
    event.preventDefault();
  }
}

function handleTouchEnd(event) {
  let handled = false;
  for (const touch of event.changedTouches) {
    const id = touchId(touch);
    if (activeJoysticks.delete(id)) handled = true;
    if (activeLookDrags.delete(id)) handled = true;
  }
  if (handled) {
    event.preventDefault();
    render();
  }
}

function handleButton(id) {
  if (id === "freewar") {
    state.menuPage = "freewar";
    setMessage("Välj 2, 5 eller 8 botar.", 2.5);
    return;
  }
  if (id === "freewar-back") {
    state.menuPage = "main";
    setMessage("Välj hur många som spelar.", 2.5);
    return;
  }
  if (id.startsWith("freewar-bots-")) {
    const botCount = Number(id.split("-").pop());
    if ([2, 5, 8].includes(botCount)) {
      startFreewar(botCount);
    }
    return;
  }
  if (id === "start-w1-1") {
    startGame(1, 1);
    return;
  }
  if (id === "start-w1-2") {
    startGame(2, 1);
    return;
  }
  if (id === "start-w1-bot") {
    startGame(2, 1, 2);
    return;
  }
  if (id === "start-w2-1") {
    startGame(1, 2);
    return;
  }
  if (id === "start-w2-2") {
    startGame(2, 2);
    return;
  }
  if (id === "start-w2-bot") {
    startGame(2, 2, 2);
    return;
  }
  if (id === "restart") {
    const restartingFreewar = isFreewar();
    clearActiveControls();
    state.mode = "menu";
    state.gameKind = "survival";
    state.freewar = null;
    state.menuPage = restartingFreewar ? "freewar" : "main";
    state.freewarBotCount = null;
    state.world = 1;
    state.botPlayerId = null;
    state.lavaKeys = new Set();
    state.message = restartingFreewar ? "Välj 2, 5 eller 8 botar." : "Välj hur många som spelar.";
    return;
  }
  if (id.startsWith("slot-")) {
    state.selectedSlot = Number(id.split("-")[1]);
    return;
  }
  if (id === "shop") {
    clearActiveControls();
    state.shopOpen = !state.shopOpen;
    state.activeTool = "none";
    return;
  }
  if (id === "build") {
    clearActiveControls();
    state.shopOpen = false;
    state.activeTool = state.activeTool === "build" ? "none" : "build";
    return;
  }
  if (id === "heart") {
    clearActiveControls();
    state.shopOpen = false;
    state.activeTool = state.activeTool === "heart" ? "none" : "heart";
    return;
  }
  if (id === "delete") {
    clearActiveControls();
    state.shopOpen = false;
    state.activeTool = state.activeTool === "delete" ? "none" : "delete";
    return;
  }
  if (id === "close-shop") {
    clearActiveControls();
    state.shopOpen = false;
    return;
  }
  if (id === "sell-selected") {
    sellSelectedItem();
    return;
  }
  if (id === "drink-healer") {
    useHealerPotion();
    return;
  }
  if (id === "buy-wood") {
    buy("wood");
    return;
  }
  if (id === "buy-stone") {
    buy("stone");
    return;
  }
  if (id === "buy-sword") {
    buy("sword");
    return;
  }
  if (id === "buy-healer") {
    buy("healer");
    return;
  }
  if (id === "buy-arrow") {
    buy("arrow");
    return;
  }
  if (id === "buy-lava") {
    buy("lava");
    return;
  }
  if (id === "buy-lava-blocker") {
    buy("lavaBlocker");
    return;
  }
  if (id === "buy-heart-heal") {
    buy("heartHeal");
    return;
  }
  if (id === "attack-p1") {
    attack(state.players[0]);
    return;
  }
  if (id === "attack-p2" && state.players[1] && !state.players[1].isBot) {
    attack(state.players[1]);
    return;
  }

}

function handleKey(event) {
  if (event.key === "f" || event.key === "F") {
    toggleFullscreen();
    return;
  }

  if (state.mode === "menu") {
    if (state.menuPage === "freewar") {
      if (["2", "5", "8"].includes(event.key)) handleButton(`freewar-bots-${event.key}`);
      if (event.key === "Escape") handleButton("freewar-back");
    } else {
      if (event.key === "1") startGame(1, 1);
      if (event.key === "2") startGame(2, 1);
      if (event.key === "3") startGame(1, 2);
      if (event.key === "4") startGame(2, 2);
      if (event.key === "5") startGame(2, 1, 2);
      if (event.key === "6") startGame(2, 2, 2);
    }
    render();
    return;
  }

  if (event.key === "Escape") {
    if (document.fullscreenElement) document.exitFullscreen();
    state.shopOpen = false;
    render();
    return;
  }

  if (state.mode !== "playing") {
    if (event.key === "Enter" || event.key === " ") {
      handleButton("restart");
      render();
    }
    return;
  }

  const p1 = state.players[0];
  const p2 = state.players[1];
  const canUseDayTools = isDay() && !state.portalOpen && (!isFreewar() || !p1?.eliminated);
  let handled = true;

  switch (event.key) {
    case "w":
    case "W":
      movePlayerForward(p1);
      break;
    case "s":
    case "S":
      break;
    case "a":
    case "A":
      turnPlayerView(p1, -Math.PI / 8);
      break;
    case "d":
    case "D":
      turnPlayerView(p1, Math.PI / 8);
      break;
    case " ":
      attack(p1);
      break;
    case "ArrowUp":
      if (p2 && !p2.isBot) movePlayerForward(p2);
      else movePlayerForward(p1);
      break;
    case "ArrowDown":
      break;
    case "ArrowLeft":
      if (p2 && !p2.isBot) turnPlayerView(p2, -Math.PI / 8);
      else turnPlayerView(p1, -Math.PI / 8);
      break;
    case "ArrowRight":
      if (p2 && !p2.isBot) turnPlayerView(p2, Math.PI / 8);
      else turnPlayerView(p1, Math.PI / 8);
      break;
    case "Enter":
      if (p2 && !p2.isBot) attack(p2);
      else attack(p1);
      break;
    case "g":
    case "G":
      if (canUseDayTools) {
        clearActiveControls();
        state.shopOpen = !state.shopOpen;
        state.activeTool = "none";
      }
      break;
    case "b":
    case "B":
      if (canUseDayTools) {
        clearActiveControls();
        state.shopOpen = false;
        state.activeTool = state.activeTool === "build" ? "none" : "build";
      }
      break;
    case "r":
    case "R":
      if (canUseDayTools) {
        clearActiveControls();
        state.shopOpen = false;
        state.activeTool = state.activeTool === "delete" ? "none" : "delete";
      }
      break;
    case "h":
    case "H":
      if (!isFreewar() && isDay() && !state.portalOpen) {
        clearActiveControls();
        state.shopOpen = false;
        state.activeTool = state.activeTool === "heart" ? "none" : "heart";
      }
      break;
    default:
      if (/^[1-9]$/.test(event.key)) {
        state.selectedSlot = Number(event.key) - 1;
      } else if (event.key === "0") {
        state.selectedSlot = 9;
      } else {
        handled = false;
      }
  }

  if (handled) {
    event.preventDefault();
    render();
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function gameLoop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function renderGameToText() {
  const cameraPlayer = state.players[0];
  const cameraForward = cameraPlayer ? forwardDirectionFor(cameraPlayer) : null;
  const activeBotTarget = state.botTargetEnemyId
    ? state.enemies.find((enemy) => enemy.id === state.botTargetEnemyId) || null
    : null;
  const cameras = state.players.filter((player) => !player.isBot).map((player) => {
    const forward = forwardDirectionFor(player);
    const view = firstPersonViewFor(player.id);
    return {
      playerId: player.id,
      label: player.isBot ? "BOT" : `P${player.id}`,
      yawRadians: Number(cameraAngleFor(player).toFixed(3)),
      pitchRadians: Number((player.lookPitch || 0).toFixed(3)),
      forward: { dx: forward.dx, dy: forward.dy, name: forward.name },
      dragging: Array.from(activeLookDrags.values()).some((drag) => drag.playerId === player.id),
      viewport: { x: view.x, y: view.y, w: view.w, h: view.h },
    };
  });
  const payload = {
    coordinateSystem: "tile grid, origin top-left, c increases right, r increases down",
    mode: state.mode,
    gameKind: state.gameKind,
    menuPage: state.menuPage,
    freewarBotCount: state.freewarBotCount,
    world: state.world,
    worldName: currentWorld().name,
    day: state.day,
    phase: state.phase,
    phaseRemaining: Math.ceil(phaseRemaining()),
    portalOpen: state.portalOpen,
    money: state.money,
    hasSword: state.hasSword,
    cameraView: isMapView() ? "map" : "firstPerson3d",
    splitScreen: usesSplitScreen() && !isMapView(),
    player2Control: isFreewar() ? `${state.freewarBotCount} bots` : state.playersWanted < 2 ? "none" : state.botPlayerId ? "bot" : "human",
    controlMode: "each human drags their image to look; movement is forward only",
    camera: cameraPlayer ? {
      yawRadians: Number(cameraAngleFor(cameraPlayer).toFixed(3)),
      pitchRadians: Number((cameraPlayer.lookPitch || 0).toFixed(3)),
      forward: { dx: cameraForward.dx, dy: cameraForward.dy, name: cameraForward.name },
      dragging: cameras[0]?.dragging || false,
    } : null,
    cameras,
    bot: state.botPlayerId && !isFreewar() ? {
      playerId: state.botPlayerId,
      targetEnemyId: state.botTargetEnemyId,
      target: activeBotTarget ? {
        id: activeBotTarget.id,
        type: activeBotTarget.type,
        c: activeBotTarget.c,
        r: activeBotTarget.r,
        hp: activeBotTarget.hp,
      } : null,
      goal: state.botGoal,
      decisionTimer: Number((botPlayer()?.botMoveTimer || 0).toFixed(3)),
    } : null,
    joysticks: Array.from(activeJoysticks.values()).map((joystick) => ({
      playerId: joystick.playerId,
      direction: joystick.direction ? joystick.direction.name : "center",
    })),
    activeTool: state.activeTool,
    shopOpen: state.shopOpen,
    selectedSlot: state.selectedSlot,
    inventory: state.inventory.map((stack) => ({ type: stack.type, count: stack.count })),
    heart: { c: state.heart.c, r: state.heart.r, hp: state.heart.hp },
    freewar: isFreewar() ? {
      botCount: state.freewar.botCount,
      winnerId: state.freewar.winnerId,
      winnerLabel: state.freewar.winnerId === 1
        ? "human"
        : state.freewar.winnerId
          ? `bot ${state.freewar.winnerId - 1}`
          : null,
      spectating: state.freewar.spectating,
      remainingPlayers: activeFreewarPlayers().length,
      phaseRule: "day 60s build, night 60s fight",
      hearts: activeHearts().map((heart) => ({
        ownerId: heart.ownerId,
        baseId: heart.baseId,
        name: heart.name,
        c: heart.c,
        r: heart.r,
        hp: heart.hp,
      })),
    } : null,
    players: state.players.map((player) => ({
      id: player.id,
      controller: player.isBot ? "bot" : "human",
      baseId: player.baseId || null,
      c: player.c,
      r: player.r,
      hp: player.hp,
      eliminated: !!player.eliminated,
      targetPlayerId: player.botTargetId || null,
      goal: player.botGoal || null,
      dir: player.dir,
      lookYaw: Number(cameraAngleFor(player).toFixed(3)),
      lookPitch: Number((player.lookPitch || 0).toFixed(3)),
      attackCooldown: Number(player.attackCooldown.toFixed(3)),
      stepCooldown: Number(player.stepCooldown.toFixed(3)),
    })),
    enemies: state.enemies.slice(0, 20).map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      c: enemy.c,
      r: enemy.r,
      hp: enemy.hp,
      targetPlayerId: enemy.playerAttackTargetId,
      attackCooldown: Number(enemy.attackTimer.toFixed(3)),
    })),
    skeletons: state.skeletons.map((skeleton) => ({
      id: skeleton.id,
      c: skeleton.c,
      r: skeleton.r,
      hp: skeleton.hp,
    })),
    blocks: Array.from(state.blocks.entries()).map(([blockKey, block]) => {
      const [c, r] = blockKey.split(",").map(Number);
      return { c, r, type: block.type, ownerId: block.ownerId || null, hp: block.hp };
    }),
    projectiles: state.projectiles.map((projectile) => ({
      fromC: projectile.fromC,
      fromR: projectile.fromR,
      toC: projectile.toC,
      toR: projectile.toR,
    })),
    terrainWalls: (isFreewar()
      ? currentWorld().terrainWalls.filter((cell) => isBaseWall(cell.c, cell.r))
      : currentWorld().terrainWalls).map((cell) => ({ c: cell.c, r: cell.r })),
    lava: lavaCells(),
    noBuild: currentWorld().noBuild.map((cell) => ({ c: cell.c, r: cell.r })),
    skeletonTriggers: currentWorld().skeletonTriggers.map((cell) => ({ c: cell.c, r: cell.r })),
    spawns: currentWorld().spawnList.map((spawn) => ({ c: spawn.c, r: spawn.r, label: spawn.label })),
    grid: gridDimensions(),
    outerWalls: `all tiles outside the ${gridDimensions().cols}x${gridDimensions().rows} world are walls`,
    message: state.messageTimer > 0 ? state.message : "",
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const step = 1000 / 60;
  const steps = Math.max(1, Math.round(ms / step));
  for (let i = 0; i < steps; i += 1) {
    update(step / 1000);
  }
  render();
};

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", handleKey, { passive: false });
if ("PointerEvent" in window) {
  canvas.addEventListener("pointerdown", handlePointer, { passive: false });
  canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
  canvas.addEventListener("pointerup", stopPointerControl, { passive: false });
  canvas.addEventListener("pointercancel", stopPointerControl, { passive: false });
} else {
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
}
document.addEventListener("fullscreenchange", resizeCanvas);

resizeCanvas();
requestAnimationFrame(gameLoop);
