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
const HOTBAR_SLOTS = 10;
const DAY_LENGTH = 60;
const NIGHT_LENGTH = 30;
const ENEMY_ATTACK_INTERVAL = 2;
const ENEMY_PLAYER_ATTACK_WINDUP = 1;
const PLAYER_CHASE_RANGE = 2;
const CELL_F = { c: 8, r: 0 };
const CELL_CORNER = { c: 0, r: 0 };
const CELL_PORTAL = { c: 0, r: 0 };
const HEART_START = { c: 7, r: 5 };
const PLAYER_STARTS = [
  { c: 8, r: 8 },
  { c: 7, r: 8 },
];
const WORLD_WALL_LIST = [];
const WORLD_WALL_KEYS = new Set(WORLD_WALL_LIST.map(([c, r]) => `${c},${r}`));

const PRICES = {
  wood: 5,
  stone: 15,
  healer: 2,
};

const BLOCKS = {
  wood: { name: "Trä", hp: 5, color: "#c46b34", light: "#e89d58", dark: "#7e3f1f" },
  stone: { name: "Sten", hp: 10, color: "#8d99a6", light: "#c7d0d9", dark: "#535f69" },
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
let lastTime = 0;
let dpr = 1;

const state = {
  mode: "menu",
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
  heart: { c: HEART_START.c, r: HEART_START.r, hp: 3, maxHp: 3 },
  blocks: new Map(),
  enemies: [],
  nextEnemyId: 1,
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

function inBounds(c, r) {
  return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
}

function isTerrainWall(c, r) {
  return WORLD_WALL_KEYS.has(key(c, r));
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

function startGame(playersWanted) {
  state.mode = "playing";
  state.playersWanted = playersWanted;
  state.day = 1;
  state.phase = "day";
  state.phaseElapsed = 0;
  state.spawnCursor = 0;
  state.bossSpawned = false;
  state.portalOpen = false;
  state.activeTool = "none";
  state.shopOpen = false;
  state.money = 10;
  state.hasSword = false;
  state.selectedSlot = 0;
  state.inventory = [];
  state.blocks = new Map();
  state.enemies = [];
  state.nextEnemyId = 1;
  state.heart = { c: HEART_START.c, r: HEART_START.r, hp: 3, maxHp: 3 };
  state.players = [];

  for (let i = 0; i < playersWanted; i += 1) {
    state.players.push({
      id: i + 1,
      c: PLAYER_STARTS[i].c,
      r: PLAYER_STARTS[i].r,
      hp: 3,
      maxHp: 3,
      dir: i === 0 ? "left" : "up",
      attackCooldown: 0,
      stepCooldown: 0,
      color: i === 0 ? "#37d3ff" : "#ffd447",
      dark: i === 0 ? "#0e7490" : "#b45309",
    });
  }

  setMessage("Dag 1: bygg basen runt hjärtat.", 4);
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
  if (state.blocks.has(key(c, r))) return false;
  if (sameCell({ c, r }, state.heart)) return false;
  if (sameCell({ c, r }, CELL_F)) return false;
  if (sameCell({ c, r }, CELL_CORNER)) return false;
  if (state.players.some((player) => player.c === c && player.r === r)) return false;
  if (state.enemies.some((enemy) => enemy.c === c && enemy.r === r)) return false;
  if (state.portalOpen && sameCell({ c, r }, CELL_PORTAL)) return false;
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
  state.blocks.set(key(c, r), { type: stack.type, hp: info.hp, maxHp: info.hp });
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

  if (state.portalOpen && sameCell(player, CELL_PORTAL)) {
    state.mode = "worldComplete";
    state.shopOpen = false;
    setMessage("Portalen tog er vidare! Värld 2 kommer senare.", 5);
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
    enemy.hp -= damage;
    enemy.hitFlash = 0.18;
    if (enemy.hp <= 0) {
      killEnemy(enemy);
    }
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

function damageBlock(c, r, amount) {
  const blockKey = key(c, r);
  const block = state.blocks.get(blockKey);
  if (!block) return;
  block.hp -= amount;
  if (block.hp <= 0) {
    state.blocks.delete(blockKey);
  }
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
  setMessage(`Natt ${state.day}! Skydda hjärtat.`, 3);
}

function startNextDay() {
  state.enemies = [];
  if (state.day >= 5) {
    state.portalOpen = true;
    state.phase = "day";
    state.phaseElapsed = 0;
    state.activeTool = "none";
    setMessage("Värld 1 klar! Portalen öppnade uppe till vänster.", 5);
    return;
  }

  state.day += 1;
  state.phase = "day";
  state.phaseElapsed = 0;
  state.activeTool = "none";
  if (state.day === 3 && !state.hasSword) {
    setMessage("Dag 3: Köp svärd! Bossen kan bara skadas med svärd.", 6);
  } else {
    setMessage(`Dag ${state.day}: bygg och handla innan natten.`, 3);
  }
}

function updateSpawns() {
  if (state.phase !== "night") return;

  if (state.day === 3) {
    if (!state.bossSpawned) {
      spawnEnemy("boss", CELL_F);
      state.bossSpawned = true;
      setMessage("Bossen kom från F!", 2.5);
    }
    return;
  }

  while (state.phaseElapsed >= state.spawnCursor) {
    if (state.day === 1) {
      spawnEnemy("normal", CELL_F);
    } else if (state.day === 2) {
      spawnEnemy("normal", CELL_F);
      spawnEnemy("normal", CELL_CORNER);
    } else if (state.day === 4) {
      spawnEnemy("flying", CELL_F);
    } else if (state.day === 5) {
      spawnEnemy("flying", CELL_F);
      spawnEnemy("flying", CELL_F);
      spawnEnemy("flying", CELL_F);
    }
    state.spawnCursor += 3;
    if (state.spawnCursor > NIGHT_LENGTH) break;
  }
}

function enemyPlayerDamage(enemy) {
  return enemy.type === "boss" ? 1 : 0.5;
}

function damagePlayer(enemy, player) {
  player.hp -= enemyPlayerDamage(enemy);
  enemy.attackTimer = ENEMY_ATTACK_INTERVAL;
  setMessage(`Fienden slog spelare ${player.id}!`, 1.6);
  if (player.hp <= 0) {
    loseGame(`Spelare ${player.id} dog.`);
  }
}

function resetPlayerAttackWindup(enemy) {
  enemy.playerAttackTargetId = null;
  enemy.playerAttackWindup = 0;
}

function enemyPlayerAttackWindup() {
  return state.day === 1 ? ENEMY_PLAYER_ATTACK_WINDUP : 0;
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

  const moveDelay = enemy.type === "boss" ? 0.85 : enemy.type === "flying" ? 0.55 : 0.75;
  if (enemy.moveTimer < moveDelay) return;
  enemy.moveTimer = 0;

  const next = nextStepTowardTarget(enemy, chasedPlayer || state.heart);
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

  for (const enemy of [...state.enemies]) {
    updateEnemy(enemy, dt);
    if (state.mode !== "playing") break;
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
      const palette = ["#7ed957", "#5fd38d", "#5bc7c9", "#e6cf5a", "#f29f6b"];
      const color = palette[(c * 2 + r * 3) % palette.length];
      ctx.fillStyle = color;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 5, y + 5, TILE - 10, 8);
      ctx.strokeStyle = "rgba(22, 44, 57, 0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    }
  }

  drawSpawnMarker(CELL_F.c, CELL_F.r, "F", "#ef4444");
  drawSpawnMarker(CELL_CORNER.c, CELL_CORNER.r, state.portalOpen ? "P" : "F2", state.portalOpen ? "#8b5cf6" : "#f97316");
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
    const hpW = Math.max(0, (TILE - 16) * (block.hp / block.maxHp));
    ctx.fillStyle = "#111827";
    ctx.fillRect(x + 3, y + TILE - 17, TILE - 16, 7);
    ctx.fillStyle = block.type === "wood" ? "#fde047" : "#e5e7eb";
    ctx.fillRect(x + 3, y + TILE - 17, hpW, 7);
  }
}

function drawTerrainWalls() {
  for (const [c, r] of WORLD_WALL_LIST) {
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
    : `${isNight ? "Natt" : "Dag"} ${state.day}`;
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
  drawText("Värld 1", x + 20, y + 28, 24, "#fff", "left", "900");
  drawText(isDay() ? "Bygg på dagen" : "Fiender på natten", x + 20, y + 58, 16, "#cbd5e1", "left", "700");

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
  drawText(state.messageTimer > 0 ? state.message : "Skydda hjärtat.", x + 22, y + 357, 15, "#fde68a", "left", "700");
}

function drawShop() {
  if (!state.shopOpen) return;
  const x = 114;
  const y = 88;
  const w = 690;
  const h = 520;
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 4;
  ctx.stroke();
  drawText("Blockshop", x + 32, y + 42, 32, "#bbf7d0", "left", "900");
  drawText(`Pengar: ${state.money}`, x + w - 32, y + 42, 22, "#fde68a", "right", "900");

  drawShopItem("buy-wood", x + 36, y + 92, 190, 140, "Träblock", "5 kr", "#c46b34", "5 slag");
  drawShopItem("buy-stone", x + 250, y + 92, 190, 140, "Stenblock", "15 kr", "#8d99a6", "10 slag");
  drawShopItem("buy-sword", x + 464, y + 92, 190, 140, "Svärd", "40 kr", "#facc15", "Boss-vapen");
  drawShopItem("buy-healer", x + 36, y + 250, 190, 140, "Healerdryck", "2 kr", "#fb7185", "Helar helt");

  pushButton("sell-selected", x + 250, y + 304, 190, 58, "Sälj valt", "#34d399", { small: true });
  pushButton("close-shop", x + 464, y + 304, 190, 58, "Stäng", "#f87171", { small: true, textColor: "#fff" });

  const stack = currentStack();
  const selectedText = stack ? `Valt: ${itemName(stack.type)} x${stack.count}` : "Valt: inget block";
  drawText(selectedText, x + 38, y + 430, 18, "#f8fafc", "left", "800");
  drawText("Shoppen fungerar bara på dagen.", x + 38, y + 457, 15, "#cbd5e1", "left", "700");
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
  drawText(title, x + 94, y + 37, 18, "#fff", "left", "900");
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
  drawText(`P${playerId}`, x + 47, y - 15, 15, "#e0f2fe", "center", "900");
  pushButton(`p${playerId}-up`, x + 42, y, 42, 42, "▲", "#93c5fd", { small: true });
  pushButton(`p${playerId}-left`, x, y + 42, 42, 42, "◀", "#93c5fd", { small: true });
  pushButton(`p${playerId}-down`, x + 42, y + 42, 42, 42, "▼", "#93c5fd", { small: true });
  pushButton(`p${playerId}-right`, x + 84, y + 42, 42, 42, "▶", "#93c5fd", { small: true });
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
  drawText("Bygg en bas. Skydda hjärtat i 5 dagar.", VIEW_W / 2, 284, 22, "#f8fafc", "center", "800");
  drawText("En hel dag är 2 minuter: 1 minut dag och 1 minut natt.", VIEW_W / 2, 320, 18, "#cbd5e1", "center", "700");

  pushButton("start-1", 282, 386, 206, 74, "1 spelare", "#38bdf8", { textColor: "#082f49" });
  pushButton("start-2", 536, 386, 206, 74, "2 spelare", "#facc15", { textColor: "#422006" });

  drawText("P1: WASD + Space", VIEW_W / 2, 506, 17, "#e0f2fe", "center", "800");
  drawText("P2: pilar + Enter", VIEW_W / 2, 535, 17, "#fef3c7", "center", "800");
}

function drawEndScreen(title, subtitle) {
  drawBackground();
  drawBoard();
  drawBlocks();
  drawHeart();
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
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  if (state.mode === "menu") {
    drawMenu();
    drawButtonsFrom(0);
  } else if (state.mode === "gameover") {
    drawEndScreen("Game Over", state.message || "Hjärtat måste överleva.");
    drawButtonsFrom(0);
  } else if (state.mode === "worldComplete") {
    drawEndScreen("Värld 1 klar!", "Värld 2 kommer i nästa byggpass.");
    drawButtonsFrom(0);
  } else {
    drawBackground();
    drawTopHud();
    drawBoard();
    drawTerrainWalls();
    drawBlocks();
    drawHeart();
    drawEnemies();
    drawPlayers();
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

function handleButton(id) {
  if (id === "start-1") {
    startGame(1);
    return;
  }
  if (id === "start-2") {
    startGame(2);
    return;
  }
  if (id === "restart") {
    state.mode = "menu";
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
  if (id === "attack-p1") {
    attack(state.players[0]);
    return;
  }
  if (id === "attack-p2" && state.players[1]) {
    attack(state.players[1]);
    return;
  }

  const moveMatch = id.match(/^p(\d+)-(up|down|left|right)$/);
  if (moveMatch) {
    const player = state.players[Number(moveMatch[1]) - 1];
    const dir = moveMatch[2];
    if (!player) return;
    if (dir === "up") tryMovePlayer(player, 0, -1);
    if (dir === "down") tryMovePlayer(player, 0, 1);
    if (dir === "left") tryMovePlayer(player, -1, 0);
    if (dir === "right") tryMovePlayer(player, 1, 0);
  }
}

function handleKey(event) {
  if (event.key === "f" || event.key === "F") {
    toggleFullscreen();
    return;
  }

  if (state.mode === "menu") {
    if (event.key === "1") startGame(1);
    if (event.key === "2") startGame(2);
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
    day: state.day,
    phase: state.phase,
    phaseRemaining: Math.ceil(phaseRemaining()),
    portalOpen: state.portalOpen,
    money: state.money,
    hasSword: state.hasSword,
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
    blocks: Array.from(state.blocks.entries()).map(([blockKey, block]) => {
      const [c, r] = blockKey.split(",").map(Number);
      return { c, r, type: block.type, hp: block.hp };
    }),
    terrainWalls: WORLD_WALL_LIST.map(([c, r]) => ({ c, r })),
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
document.addEventListener("fullscreenchange", resizeCanvas);

resizeCanvas();
requestAnimationFrame(gameLoop);
