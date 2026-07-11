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
const VIEW3D_COLS = 170;
const HOTBAR_SLOTS = 10;
const DAY_LENGTH = 60;
const NIGHT_LENGTH = 30;
const ENEMY_ATTACK_INTERVAL = 1;
const ENEMY_PLAYER_ATTACK_WINDUP = 0.5;
const PLAYER_CHASE_RANGE = 2;
const ARROW_SHOT_INTERVAL = 3;
const ARROW_DAMAGE = 0.5;
const SKELETON_ATTACK_INTERVAL = 1;
const SKELETON_DAMAGE = 0.5;
const SKELETON_HP = 0.5;

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
];
const WORLDS = Object.fromEntries(WORLD_DEFS.map((world) => [world.id, createWorldConfig(world)]));

const PRICES = {
  wood: 5,
  stone: 15,
  arrow: 20,
  healer: 2,
  heartHeal: 30,
};

const BLOCKS = {
  wood: { name: "Trä", hp: 5, color: "#c46b34", light: "#e89d58", dark: "#7e3f1f" },
  stone: { name: "Sten", hp: 10, color: "#8d99a6", light: "#c7d0d9", dark: "#535f69" },
  arrow: { name: "Pilar", hp: 5, color: "#38bdf8", light: "#bae6fd", dark: "#075985" },
};

const ITEMS = {
  healer: { name: "Healerdryck", color: "#fb7185", light: "#fecdd3", dark: "#be123c" },
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
let lastTime = 0;
let dpr = 1;

const state = {
  mode: "menu",
  world: 1,
  playersWanted: 1,
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
    days: 5,
    terrainWalls,
    wallKeys: new Set(terrainWalls.map((cell) => key(cell.c, cell.r))),
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

function inBounds(c, r) {
  return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
}

function isTerrainWall(c, r) {
  return currentWorld().wallKeys.has(key(c, r));
}

function isBuildableGround(c, r) {
  return currentWorld().buildableKeys.has(key(c, r));
}

function isLava(c, r) {
  return currentWorld().lavaKeys.has(key(c, r));
}

function isSpawnCell(c, r) {
  return currentWorld().spawnKeys.has(key(c, r));
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
  if (x < BOARD_X || y < BOARD_Y || x >= BOARD_X + BOARD_W || y >= BOARD_Y + BOARD_H) {
    return null;
  }
  return {
    c: Math.floor((x - BOARD_X) / TILE),
    r: Math.floor((y - BOARD_Y) / TILE),
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

function startGame(playersWanted, worldId = 1) {
  setupWorld(worldId, playersWanted, false);
}

function setupWorld(worldId, playersWanted, keepProgress = false) {
  const world = WORLDS[worldId] || WORLDS[1];
  state.mode = "playing";
  state.world = world.id;
  state.playersWanted = playersWanted;
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
  state.enemies = [];
  state.skeletons = [];
  state.projectiles = [];
  state.nextEnemyId = 1;
  state.nextSkeletonId = 1;
  state.heart = { c: world.heartStart.c, r: world.heartStart.r, hp: 3, maxHp: 3 };
  state.players = [];

  for (let i = 0; i < playersWanted; i += 1) {
    const start = world.playerStarts[i] || world.playerStarts[0];
    state.players.push({
      id: i + 1,
      c: start.c,
      r: start.r,
      hp: 3,
      maxHp: 3,
      dir: i === 0 ? "left" : "up",
      attackCooldown: 0,
      stepCooldown: 0,
      color: i === 0 ? "#37d3ff" : "#ffd447",
      dark: i === 0 ? "#0e7490" : "#b45309",
    });
  }

  setMessage(`${world.name}: dag 1. Bygg basen runt hjärtat.`, 4);
}

function isDay() {
  return state.phase === "day";
}

function phaseLength() {
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
    if (state.hasSword) {
      setMessage("Ni har redan svärdet.", 2);
      return;
    }
    if (state.money < 40) {
      setMessage("Svärdet kostar 40 kronor.", 2);
      return;
    }
    state.money -= 40;
    state.hasSword = true;
    setMessage("Svärd köpt! Bossen kan skadas.", 3);
    return;
  }

  const price = PRICES[type];
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
  if (!BLOCKS[stack.type] && stack.type !== "healer") {
    setMessage("Det går inte att sälja den saken.", 2);
    return;
  }
  removeInventory(stack.type, 1);
  state.money += PRICES[stack.type];
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

function canBuildAt(c, r) {
  if (!inBounds(c, r)) return false;
  if (isTerrainWall(c, r)) return false;
  if (!isBuildableGround(c, r)) return false;
  if (state.blocks.has(key(c, r))) return false;
  if (sameCell({ c, r }, state.heart)) return false;
  if (isSpawnCell(c, r)) return false;
  if (state.players.some((player) => player.c === c && player.r === r)) return false;
  if (state.enemies.some((enemy) => enemy.c === c && enemy.r === r)) return false;
  if (state.skeletons.some((skeleton) => skeleton.c === c && skeleton.r === r)) return false;
  if (state.portalOpen && sameCell({ c, r }, currentWorld().portal)) return false;
  return true;
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
  if (!BLOCKS[stack.type]) {
    setMessage("Välj ett byggblock, inte en dryck.", 2);
    return;
  }
  if (!canBuildAt(c, r)) {
    setMessage("Där kan blocket inte stå.", 1.8);
    return;
  }
  const info = BLOCKS[stack.type];
  state.blocks.set(key(c, r), {
    type: stack.type,
    hp: info.hp,
    maxHp: info.hp,
    shootTimer: stack.type === "arrow" ? 0 : undefined,
    shotFlash: 0,
  });
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
  if (addInventory(block.type, 1)) {
    state.blocks.delete(blockKey);
    setMessage("Blocket gick tillbaka till lilla gallerian.", 1.8);
  }
}

function moveHeart(c, r) {
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
  if (state.players.some((player) => player.id !== playerId && player.c === c && player.r === r)) return true;
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

function isMapView() {
  return state.shopOpen || state.activeTool !== "none";
}

function joystickDirectionFromDelta(dx, dy) {
  const deadZone = 14;
  if (Math.hypot(dx, dy) < deadZone) return null;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? { dx: 1, dy: 0, name: "right" } : { dx: -1, dy: 0, name: "left" };
  }
  return dy > 0 ? { dx: 0, dy: 1, name: "down" } : { dx: 0, dy: -1, name: "up" };
}

function updateJoystick(pointerId, point) {
  const joystick = activeJoysticks.get(pointerId);
  if (!joystick) return;
  const rawDx = point.x - joystick.centerX;
  const rawDy = point.y - joystick.centerY;
  const distance = Math.hypot(rawDx, rawDy);
  const maxDistance = 34;
  const scale = distance > maxDistance ? maxDistance / distance : 1;
  joystick.knobX = joystick.centerX + rawDx * scale;
  joystick.knobY = joystick.centerY + rawDy * scale;
  joystick.direction = joystickDirectionFromDelta(rawDx, rawDy);
}

function movePlayersFromJoysticks() {
  if (state.mode !== "playing") return;
  for (const joystick of activeJoysticks.values()) {
    const player = state.players[joystick.playerId - 1];
    if (!player || !joystick.direction) continue;
    tryMovePlayer(player, joystick.direction.dx, joystick.direction.dy);
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

function attack(player) {
  if (state.mode !== "playing" || state.shopOpen) return;
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
  if (enemy.type === "boss") {
    state.money += 20;
    setMessage("Bossen föll! +20 kronor.", 2.5);
  } else {
    state.money += 5;
    setMessage("+5 kronor", 1.2);
  }
}

function passableForEnemy(c, r, enemy) {
  if (!inBounds(c, r)) return false;
  if (enemy.type !== "flying" && isTerrainWall(c, r)) return false;
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
    .slice()
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
    if (state.blocks.has(cellKey)) return false;
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

function shootArrowBlock(c, r, block) {
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
  const spawn = findOpenSpawn(cell);
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
    playerAttackWindup: 0,
    hitFlash: 0,
  };
  state.nextEnemyId += 1;
  state.enemies.push(enemy);
}

function findOpenSpawn(cell) {
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
    if (state.blocks.has(key(candidate.c, candidate.r))) continue;
    if (sameCell(candidate, state.heart)) continue;
    if (playerAt(candidate.c, candidate.r)) continue;
    if (skeletonAt(candidate.c, candidate.r)) continue;
    return candidate;
  }
  return cell;
}

function startNight() {
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
    const interval = state.day === 1 ? 1 : 3;
    while (state.phaseElapsed >= state.spawnCursor) {
      if (state.day === 1) {
        spawnEnemy("normal", world.spawns.f1);
      } else if (state.day === 2) {
        spawnEnemy("normal", world.spawns.f1);
        spawnEnemy("normal", world.spawns.f2);
      } else if (state.day === 3) {
        spawnEnemy("normal", world.spawns.f1);
        spawnEnemy("flying", world.spawns.f2);
      } else if (state.day === 4) {
        spawnEnemy("flying", world.spawns.f1);
        spawnEnemy("normal", world.spawns.f2);
      } else if (state.day === 5) {
        spawnEnemy("flying", world.spawns.f1);
        spawnEnemy("flying", world.spawns.f2);
      }
      state.spawnCursor += interval;
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
  player.hp -= 3;
  if (player.hp <= 0) {
    respawnPlayer(player);
    setMessage(`Lava! Spelare ${player.id} började om vid hjärtat.`, 2);
  }
}

function enterPortal() {
  const world = currentWorld();
  state.shopOpen = false;
  state.activeTool = "none";

  if (world.nextWorld) {
    setupWorld(world.nextWorld, state.playersWanted, true);
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

function resetPlayerAttackWindup(enemy) {
  enemy.playerAttackTargetId = null;
  enemy.playerAttackWindup = 0;
}

function enemyPlayerAttackWindup() {
  return ENEMY_PLAYER_ATTACK_WINDUP;
}

function updatePlayerAttack(enemy, player, dt) {
  if (enemy.playerAttackTargetId !== player.id) {
    enemy.playerAttackTargetId = player.id;
    enemy.playerAttackWindup = 0;
  }

  const requiredWindup = enemyPlayerAttackWindup();
  enemy.playerAttackWindup = Math.min(requiredWindup, enemy.playerAttackWindup + dt);
  if (enemy.playerAttackWindup < requiredWindup) {
    return;
  }

  if (enemy.attackTimer <= 0) {
    damagePlayer(enemy, player);
  }
}

function updateEnemy(enemy, dt) {
  enemy.moveTimer += dt;
  enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
  enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

  const chasedPlayer = nearestPlayerToChase(enemy);
  if (chasedPlayer && manhattan(enemy, chasedPlayer) <= 1) {
    updatePlayerAttack(enemy, chasedPlayer, dt);
    return;
  }
  resetPlayerAttackWindup(enemy);

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
    updatePlayerAttack(enemy, blockingPlayer, dt);
    return;
  }

  if (enemy.type !== "flying" && state.blocks.has(key(next.c, next.r))) return;
  enemy.c = next.c;
  enemy.r = next.r;
  triggerSkeletonsForEnemy(enemy);
}

function loseGame(reason) {
  state.mode = "gameover";
  state.shopOpen = false;
  state.activeTool = "none";
  setMessage(`${reason} Tryck på Starta om.`, 10);
}

function update(dt) {
  if (state.mode !== "playing") {
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
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  roundRect(BOARD_X - 28, BOARD_Y - 28, BOARD_W + 56, BOARD_H + 56, 8);
  ctx.fill();
  ctx.fillStyle = "#cbd5e1";
  roundRect(BOARD_X - 20, BOARD_Y - 20, BOARD_W + 40, BOARD_H + 40, 8);
  ctx.fill();
  ctx.fillStyle = "#142238";
  roundRect(BOARD_X - 12, BOARD_Y - 12, BOARD_W + 24, BOARD_H + 24, 8);
  ctx.fill();
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 4;
  ctx.stroke();

  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      const x = BOARD_X + c * TILE;
      const y = BOARD_Y + r * TILE;
      const mark = currentWorld().rows[r][c];
      const palette = state.world === 2
        ? ["#fff7ed", "#fef3c7", "#fde68a", "#e0f2fe", "#dcfce7"]
        : ["#7ed957", "#5fd38d", "#5bc7c9", "#e6cf5a", "#f29f6b"];
      let color = palette[(c * 2 + r * 3) % palette.length];
      if (mark === "A") color = "#94a3b8";
      if (mark === "L") color = "#f97316";
      if (mark === "e") color = "#e5e7eb";
      if (mark === "V") color = "#dbeafe";
      ctx.fillStyle = color;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 5, y + 5, TILE - 10, 8);
      if (mark === "L") {
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
    ...currentWorld().lava.map((cell) => ({ ...cell, color: "#f97316", label: "LAVA" })),
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
    { c: state.heart.c, r: state.heart.r, label: "H", color: "#fb7185", kind: "heart", boost: 1.15 },
    ...state.players
      .filter((other) => other.id !== player.id)
      .map((other) => ({ c: other.c, r: other.r, label: `P${other.id}`, color: other.color, kind: "player", boost: 1 })),
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
  const { x, y } = centerOf(state.heart.c, state.heart.r);
  ctx.save();
  ctx.fillStyle = "#be123c";
  ctx.fillRect(x - 14, y - 6, 28, 28);
  ctx.fillRect(x - 22, y - 14, 16, 16);
  ctx.fillRect(x + 6, y - 14, 16, 16);
  ctx.fillStyle = "#fb7185";
  ctx.fillRect(x - 7, y - 1, 10, 10);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 23, y + 23, 46, 6);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x - 23, y + 23, 46 * Math.max(0, state.heart.hp / state.heart.maxHp), 6);
  ctx.restore();
}

function drawPlayers() {
  for (const player of state.players) {
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
    drawText(`P${player.id}`, x, y + 37, 13, "#fff", "center", "900");
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
  const lives = state.players.map((player) => `P${player.id} ${Math.max(0, player.hp)}/3`).join("  ");
  drawText(lives, 720, 45, 18, isNight ? "#e0f2fe" : "#1e3a8a", "left", "800");
}

function drawToolPanel() {
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

  drawShopItem("buy-wood", x + 36, y + 86, 190, 140, "Träblock", "5 kr", "#c46b34", "5 slag");
  drawShopItem("buy-stone", x + 250, y + 86, 190, 140, "Stenblock", "15 kr", "#8d99a6", "10 slag");
  drawShopItem("buy-sword", x + 464, y + 86, 190, 140, "Svärd", "40 kr", "#facc15", "Boss-vapen");
  drawShopItem("buy-healer", x + 36, y + 250, 190, 140, "Healerdryck", "2 kr", "#fb7185", "Helar spelare");
  drawShopItem("buy-arrow", x + 250, y + 250, 190, 140, "Pilar", "20 kr", "#38bdf8", "Skjuter var 3s");
  drawShopItem("buy-heart-heal", x + 464, y + 250, 190, 140, "Hjärtmedicin", "30 kr", "#ef4444", "Helar hjärtat");

  pushButton("sell-selected", x + 250, y + 410, 190, 58, "Sälj valt", "#34d399", { small: true });
  pushButton("close-shop", x + 464, y + 410, 190, 58, "Stäng", "#f87171", { small: true, textColor: "#fff" });

  const stack = currentStack();
  const selectedText = stack ? `Valt: ${itemName(stack.type)} x${stack.count}` : "Valt: inget";
  drawText(selectedText, x + 38, y + 504, 18, "#f8fafc", "left", "800");
  drawText("Shoppen fungerar bara på dagen.", x + 38, y + 534, 15, "#cbd5e1", "left", "700");
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
      } else if (stack.type === "healer") {
        const info = ITEMS.healer;
        ctx.fillStyle = info.dark;
        ctx.fillRect(sx + 16, y + 9, 12, 6);
        ctx.fillRect(sx + 12, y + 16, 20, 20);
        ctx.fillStyle = info.color;
        ctx.fillRect(sx + 15, y + 19, 14, 14);
        ctx.fillStyle = info.light;
        ctx.fillRect(sx + 18, y + 21, 4, 4);
      }
      drawText(String(stack.count), sx + slot - 8, y + slot - 8, 14, "#fff", "right", "900");
    }
  }
}

function drawControls() {
  if (state.mode !== "playing") return;
  drawDpad(1, 76, 586);
  pushButton("attack-p1", 300, 592, 76, 48, "Slå", "#f472b6", { small: true });
  if (state.playersWanted > 1) {
    drawDpad(2, 790, 586);
    pushButton("attack-p2", 648, 592, 76, 48, "Slå", "#f472b6", { small: true });
  }
}

function drawDpad(playerId, x, y) {
  const centerX = x + 63;
  const centerY = y + 63;
  joystickZones.push({ playerId, x: x - 8, y: y - 8, w: 142, h: 112, centerX, centerY });
  drawText(`P${playerId}`, x + 47, y - 15, 15, "#e0f2fe", "center", "900");
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
  ctx.moveTo(centerX - 38, centerY);
  ctx.lineTo(centerX + 38, centerY);
  ctx.moveTo(centerX, centerY - 38);
  ctx.lineTo(centerX, centerY + 38);
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
  pushButton("start-w1-1", 282, 392, 206, 58, "1 spelare", "#38bdf8", { textColor: "#082f49" });
  pushButton("start-w1-2", 536, 392, 206, 58, "2 spelare", "#facc15", { textColor: "#422006" });

  drawText("Värld 2", 242, 466, 18, "#fed7aa", "left", "900");
  pushButton("start-w2-1", 282, 488, 206, 58, "1 spelare", "#fb923c", { textColor: "#431407" });
  pushButton("start-w2-2", 536, 488, 206, 58, "2 spelare", "#f97316", { textColor: "#431407" });

  drawText("P1: WASD + Space", VIEW_W / 2, 570, 17, "#e0f2fe", "center", "800");
  drawText("P2: pilar + Enter", VIEW_W / 2, 598, 17, "#fef3c7", "center", "800");
}

function drawEndScreen(title, subtitle) {
  drawBackground();
  drawBoard();
  drawTerrainWalls();
  drawBlocks();
  drawHeart();
  drawSkeletons();
  drawEnemies();
  drawPlayers();
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  roundRect(210, 220, 604, 250, 8);
  ctx.fill();
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 4;
  ctx.stroke();
  drawText(title, VIEW_W / 2, 285, 38, "#fde047", "center", "900");
  drawText(subtitle, VIEW_W / 2, 335, 20, "#f8fafc", "center", "800");
  pushButton("restart", VIEW_W / 2 - 110, 385, 220, 58, "Starta om", "#86efac");
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
  } else {
    drawBackground();
    drawTopHud();
    if (isMapView()) {
      drawBoard();
      drawTerrainWalls();
      drawBlocks();
      drawProjectiles();
      drawHeart();
      drawSkeletons();
      drawEnemies();
      drawPlayers();
    } else {
      drawFirstPersonView();
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

function gameplayDragZoneAt(x, y) {
  if (state.mode !== "playing" || state.shopOpen || state.activeTool !== "none") {
    return null;
  }
  const inFirstPersonView = x >= VIEW3D_X && y >= VIEW3D_Y && x <= VIEW3D_X + VIEW3D_W && y <= VIEW3D_Y + VIEW3D_H;
  const inMapBoard = x >= BOARD_X && y >= BOARD_Y && x <= BOARD_X + BOARD_W && y <= BOARD_Y + BOARD_H;
  if (!inFirstPersonView && !inMapBoard) return null;

  const playerId = state.playersWanted > 1 && x > VIEW_W / 2 ? 2 : 1;
  return {
    playerId,
    centerX: x,
    centerY: y,
  };
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function handlePointer(event) {
  event.preventDefault();
  const point = pointerToCanvas(event);
  const button = buttonAt(point.x, point.y);
  if (button && !button.disabled) {
    handleButton(button.id);
    render();
    return;
  }

  const joystickZone = state.mode === "playing" && !state.shopOpen
    ? joystickZoneAt(point.x, point.y) || gameplayDragZoneAt(point.x, point.y)
    : null;
  if (joystickZone) {
    activeJoysticks.set(event.pointerId, {
      playerId: joystickZone.playerId,
      centerX: joystickZone.centerX,
      centerY: joystickZone.centerY,
      knobX: joystickZone.centerX,
      knobY: joystickZone.centerY,
      direction: null,
    });
    updateJoystick(event.pointerId, point);
    canvas.setPointerCapture?.(event.pointerId);
    movePlayersFromJoysticks();
    render();
    return;
  }

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
  if (!activeJoysticks.has(event.pointerId)) return;
  event.preventDefault();
  updateJoystick(event.pointerId, pointerToCanvas(event));
  render();
}

function stopPointerJoystick(event) {
  if (!activeJoysticks.has(event.pointerId)) return;
  event.preventDefault();
  activeJoysticks.delete(event.pointerId);
  render();
}

function handleButton(id) {
  if (id === "start-w1-1") {
    startGame(1, 1);
    return;
  }
  if (id === "start-w1-2") {
    startGame(2, 1);
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
  if (id === "restart") {
    state.mode = "menu";
    state.world = 1;
    state.message = "Välj hur många som spelar.";
    return;
  }
  if (id.startsWith("slot-")) {
    state.selectedSlot = Number(id.split("-")[1]);
    return;
  }
  if (id === "shop") {
    state.shopOpen = !state.shopOpen;
    state.activeTool = "none";
    return;
  }
  if (id === "build") {
    state.shopOpen = false;
    state.activeTool = state.activeTool === "build" ? "none" : "build";
    return;
  }
  if (id === "heart") {
    state.shopOpen = false;
    state.activeTool = state.activeTool === "heart" ? "none" : "heart";
    return;
  }
  if (id === "delete") {
    state.shopOpen = false;
    state.activeTool = state.activeTool === "delete" ? "none" : "delete";
    return;
  }
  if (id === "close-shop") {
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
  if (id === "buy-heart-heal") {
    buy("heartHeal");
    return;
  }
  if (id === "attack-p1") {
    attack(state.players[0]);
    return;
  }
  if (id === "attack-p2" && state.players[1]) {
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
    if (event.key === "1") startGame(1, 1);
    if (event.key === "2") startGame(2, 1);
    if (event.key === "3") startGame(1, 2);
    if (event.key === "4") startGame(2, 2);
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
      state.mode = "menu";
      state.world = 1;
      render();
    }
    return;
  }

  const p1 = state.players[0];
  const p2 = state.players[1];
  let handled = true;

  switch (event.key) {
    case "w":
    case "W":
      tryMovePlayer(p1, 0, -1);
      break;
    case "s":
    case "S":
      tryMovePlayer(p1, 0, 1);
      break;
    case "a":
    case "A":
      tryMovePlayer(p1, -1, 0);
      break;
    case "d":
    case "D":
      tryMovePlayer(p1, 1, 0);
      break;
    case " ":
      attack(p1);
      break;
    case "ArrowUp":
      if (p2) tryMovePlayer(p2, 0, -1);
      else tryMovePlayer(p1, 0, -1);
      break;
    case "ArrowDown":
      if (p2) tryMovePlayer(p2, 0, 1);
      else tryMovePlayer(p1, 0, 1);
      break;
    case "ArrowLeft":
      if (p2) tryMovePlayer(p2, -1, 0);
      else tryMovePlayer(p1, -1, 0);
      break;
    case "ArrowRight":
      if (p2) tryMovePlayer(p2, 1, 0);
      else tryMovePlayer(p1, 1, 0);
      break;
    case "Enter":
      if (p2) attack(p2);
      else attack(p1);
      break;
    case "g":
    case "G":
      if (isDay() && !state.portalOpen) {
        state.shopOpen = !state.shopOpen;
        state.activeTool = "none";
      }
      break;
    case "b":
    case "B":
      if (isDay() && !state.portalOpen) {
        state.shopOpen = false;
        state.activeTool = state.activeTool === "build" ? "none" : "build";
      }
      break;
    case "r":
    case "R":
      if (isDay() && !state.portalOpen) {
        state.shopOpen = false;
        state.activeTool = state.activeTool === "delete" ? "none" : "delete";
      }
      break;
    case "h":
    case "H":
      if (isDay() && !state.portalOpen) {
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
  const payload = {
    coordinateSystem: "tile grid, origin top-left, c increases right, r increases down",
    mode: state.mode,
    world: state.world,
    worldName: currentWorld().name,
    day: state.day,
    phase: state.phase,
    phaseRemaining: Math.ceil(phaseRemaining()),
    portalOpen: state.portalOpen,
    money: state.money,
    hasSword: state.hasSword,
    cameraView: isMapView() ? "map" : "firstPerson3d",
    joysticks: Array.from(activeJoysticks.values()).map((joystick) => ({
      playerId: joystick.playerId,
      direction: joystick.direction ? joystick.direction.name : "center",
    })),
    activeTool: state.activeTool,
    shopOpen: state.shopOpen,
    selectedSlot: state.selectedSlot,
    inventory: state.inventory.map((stack) => ({ type: stack.type, count: stack.count })),
    heart: { c: state.heart.c, r: state.heart.r, hp: state.heart.hp },
    players: state.players.map((player) => ({
      id: player.id,
      c: player.c,
      r: player.r,
      hp: player.hp,
      dir: player.dir,
    })),
    enemies: state.enemies.slice(0, 20).map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      c: enemy.c,
      r: enemy.r,
      hp: enemy.hp,
    })),
    skeletons: state.skeletons.map((skeleton) => ({
      id: skeleton.id,
      c: skeleton.c,
      r: skeleton.r,
      hp: skeleton.hp,
    })),
    blocks: Array.from(state.blocks.entries()).map(([blockKey, block]) => {
      const [c, r] = blockKey.split(",").map(Number);
      return { c, r, type: block.type, hp: block.hp };
    }),
    projectiles: state.projectiles.map((projectile) => ({
      fromC: projectile.fromC,
      fromR: projectile.fromR,
      toC: projectile.toC,
      toR: projectile.toR,
    })),
    terrainWalls: currentWorld().terrainWalls.map((cell) => ({ c: cell.c, r: cell.r })),
    lava: currentWorld().lava.map((cell) => ({ c: cell.c, r: cell.r })),
    noBuild: currentWorld().noBuild.map((cell) => ({ c: cell.c, r: cell.r })),
    skeletonTriggers: currentWorld().skeletonTriggers.map((cell) => ({ c: cell.c, r: cell.r })),
    spawns: currentWorld().spawnList.map((spawn) => ({ c: spawn.c, r: spawn.r, label: spawn.label })),
    outerWalls: "all tiles outside the 9x9 world are walls",
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
canvas.addEventListener("pointerdown", handlePointer, { passive: false });
canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
canvas.addEventListener("pointerup", stopPointerJoystick, { passive: false });
canvas.addEventListener("pointercancel", stopPointerJoystick, { passive: false });
document.addEventListener("fullscreenchange", resizeCanvas);

resizeCanvas();
requestAnimationFrame(gameLoop);
