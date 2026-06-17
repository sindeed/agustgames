"use strict";

/* ====================================================================
   Pixelgubben – ett litet ovanifrån-spel med flera banor
   Bana 1: Grottan.  Bana 2: Riddarborgen (ritad av Agust, 9 år).
   Piltangenter = gå, Mellanslag = hoppa (leap 2 rutor, över hål).
   Knuffa stenar. Akta hål och ormar. Nå stjärnan!
   ==================================================================== */

const TS = 40;          // tile-storlek i pixlar
const COLS = 20;
const ROWS = 15;
const START_LIVES = 3;

const STEP_MS = 150;    // tid för ett vanligt steg
const JUMP_MS = 280;    // tid för ett hopp (2 rutor)
const SNAKE_MS = 340;   // ormens steg-tid
const INVULN_MS = 1300; // osårbarhet efter träff
const DRAGON_FIRE_MS = 1200; // tid mellan drakens eldsputtar (snabbare eld)
const FIRE_SPEED = 0.18;     // eldklotets fart (pixlar per ms)

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const livesEl = document.getElementById("lives-val");
const scoreEl = document.getElementById("score-val");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const overlayBtn = document.getElementById("overlay-btn");
const soundEl = document.getElementById("sound");
const hintEl = document.getElementById("overlay-hint");
const overlayRestart = document.getElementById("overlay-restart");
const overlayMenu = document.getElementById("overlay-menu");

/* ---------------------------------------------------------------- */
/* Ljud (Web Audio – syntade effekter, inga ljudfiler)              */
/* ---------------------------------------------------------------- */

let audioCtx = null;
let muted = false;

function resumeAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) { audioCtx = null; }
}

function tone(freq, dur, type = "square", vol = 0.15, freqEnd = null, delay = 0) {
  if (!audioCtx || muted) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const sfxStep = () => tone(220, 0.06, "square", 0.05);
const sfxPush = () => tone(90, 0.14, "sawtooth", 0.16, 60);
const sfxJump = () => tone(300, 0.22, "square", 0.12, 720);
const sfxFill = () => { tone(523, 0.10, "triangle", 0.16); tone(784, 0.16, "triangle", 0.16, null, 0.09); };
const sfxHurt = () => tone(330, 0.30, "sawtooth", 0.20, 70);
const sfxWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "square", 0.16, null, i * 0.12));
const sfxLevel = () => [523, 587, 659, 698, 784].forEach((f, i) => tone(f, 0.14, "triangle", 0.15, null, i * 0.10));
const sfxGameOver = () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, "triangle", 0.18, null, i * 0.16));
const sfxFire = () => tone(150, 0.26, "sawtooth", 0.16, 40);

/* ---------------------------------------------------------------- */
/* Banor                                                             */
/* ---------------------------------------------------------------- */

// Bana 2 – Riddarborgen. Ritad av Agust (sedd i liggande format).
// Start uppe till höger. Gå ner till stenen (S) som ligger precis ovanför
// klyftan med TVÅ rader hål. Putta stenen söderut så den fyller det första
// hålet, kliv ut på den – och HOPPA sedan över det andra hålet. Ett enkelt
// hopp räcker inte över två rader, så stenen behövs för att ta sig över!
// Nere väntar ormar och stockar innan stjärnan till höger.
// # vägg  . golv  O start  * mål(stjärna)  S sten  H hål  L stock  ~ orm
const LEVEL2_MAP = [
  "####################",
  "###.............O###",
  "###..............###",
  "###..............###",
  "###..............###",
  "###..............###",
  "###......S.......###",
  "###HHHHHHHHHHHHHH###",
  "###HHHHHHHHHHHHHH###",
  "###..............###",
  "###....~.....L...###",
  "###.........~....###",
  "###.....L.......*###",
  "###..............###",
  "####################",
];

// Bana 3 – Drakhålan. Ritad av Agust (sedd i liggande format).
// Tre lodräta sektioner: höger rum (start nere till höger + orm i övre delen),
// en trång mörk mittenkorridor som man klättrar igenom, och vänster rum med
// boss-DRAKEN (X) i mitten och stjärnan (M -> *) uppe till vänster. Draken
// sitter still men vänder sig upp/ned och sprutar eld – man måste pricka in
// timingen mellan eldsputtarna (eller hoppa) för att korsa dess kolumn.
// # vägg  . golv  O start  * mål(stjärna)  ~ orm  X drake  H hål  L stock  S sten
const LEVEL3_MAP = [
  "####################",
  "#*......####.......#",
  "#.......####...~...#",
  "#..X.......#.......#",
  "#..........#.......#",
  "#.......#..#.......#",
  "#.......#..#.......#",
  "#.......#..#.......#",
  "#.......#..#.......#",
  "#.......#..#.......#",
  "#.......#..........#",
  "#.......#..........#",
  "#.......####.......#",
  "#.......####......O#",
  "####################",
];

const LEVELS = [
  { name: "Bana 1: Grottan", theme: "dungeon", build: buildLevel1 },
  { name: "Bana 2: Riddarborgen", theme: "castle", map: LEVEL2_MAP },
  { name: "Bana 3: Drakhålan", theme: "underground", map: LEVEL3_MAP },
];

// Aktuell bana – fylls i av loadLevel()
let grid;        // grid[row][col]
let stones;      // [{col,row, ...anim}]
let snakes;      // [{...}]
let startCell;   // {col,row}
let theme = "dungeon";
let dragon = null;   // boss-draken (Bana 3) eller null
let fireballs = [];  // drakens eldklot

// Bana 1 byggs programmatiskt (samma som tidigare, väl testad)
function buildLevel1() {
  dragon = null;
  fireballs = [];
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const border = (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1);
      row.push(border ? "wall" : "floor");
    }
    grid.push(row);
  }
  for (let c = 1; c <= 18; c++) grid[4][c] = "wall";
  grid[4][16] = "floor";
  grid[4][17] = "floor";
  for (let c = 3; c <= 18; c++) grid[9][c] = "wall";

  setTiles("hole", [[6, 5], [7, 5], [10, 7], [11, 7], [8, 13]]);
  setTiles("log", [[12, 1], [13, 3], [8, 10]]);

  startCell = { col: 1, row: 1 };
  grid[1][1] = "start";
  grid[13][18] = "goal";

  stones = makeStones([[7, 1], [5, 3], [3, 11], [9, 12], [10, 12]]);
  snakes = [makeSnake(11, 2, 1), makeSnake(8, 6, 1), makeSnake(10, 11, -1)];
}

function setTiles(type, list) {
  for (const [c, r] of list) grid[r][c] = type;
}

function makeStones(list) {
  return list.map(([c, r]) => stoneObj(c, r));
}

function stoneObj(c, r) {
  return {
    col: c, row: r,
    fromX: c * TS, fromY: r * TS, toX: c * TS, toY: r * TS,
    moveStart: 0, moveDur: 0, moving: false,
  };
}

function makeSnake(c, r, dir) {
  return {
    col: c, row: r, dc: dir, dr: 0,
    fromX: c * TS, fromY: r * TS, toX: c * TS, toY: r * TS,
    moveStart: 0, moveDur: 0, moving: false,
    trail: [{ x: c * TS + TS / 2, y: r * TS + TS / 2 }],
  };
}

// Boss-draken: sitter still i mitten, vänder blicken upp/ned och sprutar eld
// med jämna mellanrum. dir växlar mellan upp och ned så att hela dess kolumn
// täcks turvis – spelaren måste pricka in luckan mellan eldsputtarna.
function makeDragon(c, r) {
  return {
    col: c, row: r,
    dir: { dc: 0, dr: -1 },                 // börjar blicka uppåt
    fireAt: performance.now() + 1200,       // första eldsputten dröjer lite
  };
}

// Tolkar en ASCII-bana till grid/stones/snakes/startCell
function parseMap(map) {
  grid = [];
  stones = [];
  snakes = [];
  dragon = null;
  fireballs = [];
  startCell = { col: 1, row: 1 };
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    const line = map[r] || "";
    if (line.length !== COLS) console.warn("Bana-rad fel längd:", r, line.length);
    for (let c = 0; c < COLS; c++) {
      const ch = line[c] || "#";
      switch (ch) {
        case "#": row.push("wall"); break;
        case "L": row.push("log"); break;
        case "H": row.push("hole"); break;
        case "*": row.push("goal"); break;
        case "O": row.push("start"); startCell = { col: c, row: r }; break;
        case "S": row.push("floor"); stones.push(stoneObj(c, r)); break;
        case "~": row.push("floor"); snakes.push(makeSnake(c, r, 1)); break;
        case "X": row.push("floor"); dragon = makeDragon(c, r); break;
        default: row.push("floor");
      }
    }
    grid.push(row);
  }
}

function loadLevel(index) {
  resumeAudio();
  currentLevel = index;
  const def = LEVELS[index];
  theme = def.theme;
  if (def.build) def.build();
  else parseMap(def.map);
  resetPlayer();
  heldDirs.length = 0;          // rensa ev. kvarhängande tangenter/knappar
  lives = START_LIVES;
  scoreAtLevelStart = score;
  state = "playing";
  hideOverlay();
  updateHud();
}

/* ---------------------------------------------------------------- */
/* Spelaren                                                          */
/* ---------------------------------------------------------------- */

let player;

function resetPlayer() {
  player = {
    col: startCell.col, row: startCell.row,
    fromX: startCell.col * TS, fromY: startCell.row * TS,
    toX: startCell.col * TS, toY: startCell.row * TS,
    moveStart: 0, moveDur: 0, moving: false,
    dir: { dc: 0, dr: 1 },
    jumping: false,
    invuln: 0,
  };
}

/* ---------------------------------------------------------------- */
/* Spelstatus                                                        */
/* ---------------------------------------------------------------- */

let state = "start";  // 'start' | 'playing' | 'paused' | 'dead' | 'levelcomplete' | 'won'
let lives = START_LIVES;
let score = 0;
let currentLevel = 0;
let scoreAtLevelStart = 0;
let paused = false;
let pauseAt = 0;

function newGame() {
  score = 0;
  loadLevel(0);
}

function updateHud() {
  livesEl.textContent = "♥ ".repeat(lives).trim() || "—";
  scoreEl.textContent = String(score);
  // kort bannamn i HUD:en (t.ex. "Bana 2") så liv/poäng alltid får plats
  if (levelEl) levelEl.textContent = LEVELS[currentLevel] ? LEVELS[currentLevel].name.split(":")[0] : "";
  if (soundEl) soundEl.textContent = muted ? "🔇" : "🔊";
}

/* ---------------------------------------------------------------- */
/* Tile-hjälp                                                        */
/* ---------------------------------------------------------------- */

function tileAt(c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return "wall";
  return grid[r][c];
}

function isSolid(c, r) {
  const t = tileAt(c, r);
  if (t === "wall" || t === "log") return true;
  if (dragon && dragon.col === c && dragon.row === r) return true;  // draken blockerar
  return false;
}

function stoneAt(c, r) {
  return stones.find(s => s.col === c && s.row === r) || null;
}

/* ---------------------------------------------------------------- */
/* Input                                                             */
/* ---------------------------------------------------------------- */

const heldDirs = [];
const DIR_KEYS = {
  ArrowUp: { dc: 0, dr: -1 },
  ArrowDown: { dc: 0, dr: 1 },
  ArrowLeft: { dc: -1, dr: 0 },
  ArrowRight: { dc: 1, dr: 0 },
};

window.addEventListener("keydown", (e) => {
  if (e.key in DIR_KEYS) {
    e.preventDefault();
    if (!heldDirs.includes(e.key)) heldDirs.unshift(e.key);
  } else if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    if (state === "playing") tryJump();
  } else if (e.key === "Enter") {
    if (state !== "playing") startBtnAction();
  } else if (e.key === "m" || e.key === "M") {
    muted = !muted;
    updateHud();
  } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
    if (state === "playing") pause();
    else if (state === "paused") resume();
  }
});

window.addEventListener("keyup", (e) => {
  const i = heldDirs.indexOf(e.key);
  if (i >= 0) heldDirs.splice(i, 1);
});

overlayBtn.addEventListener("click", startBtnAction);

if (soundEl) {
  soundEl.style.cursor = "pointer";
  soundEl.addEventListener("click", () => { resumeAudio(); muted = !muted; updateHud(); });
}

/* ---- Touch-kontroller (iPad/mobil) ---- */
const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
if (isTouch) document.body.classList.add("touch");

function pressDir(key) { if (!heldDirs.includes(key)) heldDirs.unshift(key); }
function releaseDir(key) { const i = heldDirs.indexOf(key); if (i >= 0) heldDirs.splice(i, 1); }

document.querySelectorAll(".dbtn").forEach((btn) => {
  const key = btn.dataset.dir;
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    resumeAudio();
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    pressDir(key);
  });
  const release = (e) => { if (e) e.preventDefault(); releaseDir(key); };
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointercancel", release);
  btn.addEventListener("lostpointercapture", () => releaseDir(key));
});

const jumpBtn = document.getElementById("jump-btn");
if (jumpBtn) {
  jumpBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    resumeAudio();
    if (state === "playing") tryJump();
  });
}

/* ---- Spelknappar i HUD:en + overlay: paus, börja om, meny ---- */
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const menuBtn = document.getElementById("menu-btn");
if (pauseBtn) pauseBtn.addEventListener("click", () => { resumeAudio(); state === "paused" ? resume() : pause(); });
if (restartBtn) restartBtn.addEventListener("click", restartLevel);
if (menuBtn) menuBtn.addEventListener("click", goToMenu);
if (overlayRestart) overlayRestart.addEventListener("click", restartLevel);
if (overlayMenu) overlayMenu.addEventListener("click", goToMenu);

// hindra sid-scroll och pinch-zoom på pekskärm
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
document.addEventListener("gesturestart", (e) => e.preventDefault());

// Knappen gör olika saker beroende på läge
function startBtnAction() {
  if (state === "paused") { resume(); return; }
  if (state === "levelcomplete") {
    loadLevel(currentLevel + 1);
  } else if (state === "dead") {
    score = scoreAtLevelStart;      // börja om aktuell bana
    loadLevel(currentLevel);
  } else {
    newGame();                      // 'start' eller 'won'
  }
}

/* ---- Paus / meny / börja om ---- */
function pause() {
  if (state !== "playing") return;
  paused = true;
  pauseAt = performance.now();
  state = "paused";
  showOverlay("⏸ Pausat", "", "Fortsätt", { restart: true, menu: true });
}

function resume() {
  if (state !== "paused") return;
  const delta = performance.now() - pauseAt;     // skjut fram animationer så de inte hoppar
  for (const o of [player, ...stones, ...snakes]) {
    if (o && o.moving) o.moveStart += delta;
  }
  if (player && player.invuln) player.invuln += delta;
  for (const fb of fireballs) fb.born += delta;
  if (dragon) dragon.fireAt += delta;
  paused = false;
  state = "playing";
  hideOverlay();
}

function restartLevel() {
  score = scoreAtLevelStart;
  paused = false;
  loadLevel(currentLevel);
}

function goToMenu() {
  window.location.href = "../";   // tillbaka till arkad-menyn
}

/* ---------------------------------------------------------------- */
/* Rörelse                                                           */
/* ---------------------------------------------------------------- */

function beginMove(obj, toCol, toRow, dur, now) {
  obj.fromX = obj.col * TS;
  obj.fromY = obj.row * TS;
  obj.toX = toCol * TS;
  obj.toY = toRow * TS;
  obj.col = toCol;
  obj.row = toRow;
  obj.moveStart = now;
  obj.moveDur = dur;
  obj.moving = true;
}

function tryStep(d, now) {
  const nc = player.col + d.dc;
  const nr = player.row + d.dr;

  if (isSolid(nc, nr)) return false;

  const stone = stoneAt(nc, nr);
  if (stone) {
    const sc = nc + d.dc;
    const sr = nr + d.dr;
    // får ej knuffas in i vägg, annan sten – eller över stjärnan (skulle låsa banan)
    if (isSolid(sc, sr) || stoneAt(sc, sr) || tileAt(sc, sr) === "goal") return false;
    if (tileAt(sc, sr) === "hole") {
      grid[sr][sc] = "floor";
      stones.splice(stones.indexOf(stone), 1);
      score += 25;
      updateHud();
      sfxFill();
    } else {
      beginMove(stone, sc, sr, STEP_MS, now);
      sfxPush();
    }
  } else {
    sfxStep();
  }

  player.jumping = false;
  beginMove(player, nc, nr, STEP_MS, now);
  return true;
}

function tryJump() {
  if (player.moving) return;
  const now = performance.now();
  const d = player.dir;
  const mc = player.col + d.dc, mr = player.row + d.dr;
  const lc = player.col + 2 * d.dc, lr = player.row + 2 * d.dr;

  const canLand =
    !isSolid(lc, lr) && !stoneAt(lc, lr) &&
    tileAt(lc, lr) !== "hole" &&
    !(d.dc === 0 && d.dr === 0);
  const midBlocked = isSolid(mc, mr);

  sfxJump();
  if (canLand && !midBlocked) {
    player.jumping = true;
    beginMove(player, lc, lr, JUMP_MS, now);
  } else {
    player.jumping = true;
    beginMove(player, player.col, player.row, JUMP_MS * 0.7, now);
  }
}

function onPlayerArrived() {
  const t = tileAt(player.col, player.row);
  if (t === "goal") { win(); return; }
  if (t === "hole" && !player.jumping) { die(); return; }
  player.jumping = false;
}

/* ---------------------------------------------------------------- */
/* Liv / död / vinst                                                 */
/* ---------------------------------------------------------------- */

function die() {
  lives -= 1;
  updateHud();
  if (lives <= 0) {
    gameOver();
  } else {
    player.col = startCell.col;
    player.row = startCell.row;
    player.toX = player.fromX = startCell.col * TS;
    player.toY = player.fromY = startCell.row * TS;
    player.moving = false;
    player.jumping = false;
    player.dir = { dc: 0, dr: 1 };
    player.invuln = performance.now() + INVULN_MS;
    fireballs.length = 0;                          // rensa eld så respawn blir rättvis
    if (dragon) dragon.fireAt = performance.now() + 1200;
    sfxHurt();
  }
}

function hit() {
  if (performance.now() < player.invuln) return;
  die();
}

function gameOver() {
  state = "dead";
  sfxGameOver();
  showOverlay("Game Over", `Du fick ${score} poäng. Försök igen!`, "Försök igen", { menu: true });
}

function win() {
  score += 100;
  updateHud();
  if (currentLevel < LEVELS.length - 1) {
    state = "levelcomplete";
    sfxLevel();
    const next = LEVELS[currentLevel + 1].name;
    showOverlay(`⭐ ${LEVELS[currentLevel].name} klar! ⭐`,
      `Poäng: ${score}. Härnäst: ${next}`, "Nästa bana", { menu: true });
  } else {
    state = "won";
    sfxWin();
    showOverlay("🏆 Du klarade alla banor! 🏆",
      `Slutpoäng: ${score}. Bra kämpat, riddare!`, "Spela igen", { menu: true });
  }
}

/* ---------------------------------------------------------------- */
/* Overlay                                                           */
/* ---------------------------------------------------------------- */

function showOverlay(title, text, btn, opts = {}) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayBtn.textContent = btn;
  if (hintEl) hintEl.style.display = opts.hint ? "" : "none";
  if (overlayRestart) overlayRestart.style.display = opts.restart ? "" : "none";
  if (overlayMenu) overlayMenu.style.display = (opts.menu === false) ? "none" : "";
  overlay.classList.remove("hidden");
}
function hideOverlay() {
  overlay.classList.add("hidden");
}

/* ---------------------------------------------------------------- */
/* Update-loop                                                       */
/* ---------------------------------------------------------------- */

let frameNow = 0;

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animPos(obj, now) {
  if (!obj.moving) return { x: obj.col * TS, y: obj.row * TS, p: 1 };
  let p = (now - obj.moveStart) / obj.moveDur;
  if (p >= 1) p = 1;
  const e = easeInOut(p);
  return {
    x: obj.fromX + (obj.toX - obj.fromX) * e,
    y: obj.fromY + (obj.toY - obj.fromY) * e,
    p,
  };
}

function update(now) {
  if (state !== "playing") return;

  if (player.moving) {
    if ((now - player.moveStart) / player.moveDur >= 1) {
      player.moving = false;
      onPlayerArrived();
    }
  }
  if (state !== "playing") return;

  if (!player.moving && heldDirs.length > 0) {
    const d = DIR_KEYS[heldDirs[0]];
    player.dir = d;
    tryStep(d, now);
  }

  for (const sn of snakes) updateSnake(sn, now);
  if (dragon) updateDragon(dragon, now);
  updateFireballs(now);

  const pc = playerCenter(now);
  const airborne = player.jumping && player.moving;
  if (!airborne) {
    for (const sn of snakes) {
      const sc = animPos(sn, now);
      const sx = sc.x + TS / 2, sy = sc.y + TS / 2;
      const dist = Math.hypot(pc.x - sx, pc.y - sy);
      if (dist < TS * 0.55) { hit(); break; }
    }
    for (const fb of fireballs) {
      if (Math.hypot(pc.x - fb.x, pc.y - fb.y) < TS * 0.5) { hit(); break; }
    }
  }
}

// Draken sprutar eld åt alla fyra håll samtidigt (upp, ner, höger, vänster)
// så den skyddar sig på alla sidor.
const FIRE_DIRS = [
  { dc: 0, dr: -1 },  // upp
  { dc: 1, dr: 0 },   // höger
  { dc: 0, dr: 1 },   // ner
  { dc: -1, dr: 0 },  // vänster
];

function updateDragon(dr, now) {
  if (now >= dr.fireAt) {
    spawnFire(dr, now);
    dr.dir = { dc: -dr.dir.dr, dr: dr.dir.dc };  // vrid blicken ett kvarts varv
    dr.fireAt = now + DRAGON_FIRE_MS;
  }
}

function spawnFire(dr, now) {
  for (const d of FIRE_DIRS) {
    const x0 = (dr.col + d.dc) * TS + TS / 2;   // starta en ruta framför munnen
    const y0 = (dr.row + d.dr) * TS + TS / 2;
    fireballs.push({ x0, y0, x: x0, y: y0, dc: d.dc, dr: d.dr, born: now });
  }
  sfxFire();
}

function updateFireballs(now) {
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const fb = fireballs[i];
    const t = (now - fb.born) * FIRE_SPEED;
    fb.x = fb.x0 + fb.dc * t;
    fb.y = fb.y0 + fb.dr * t;
    const c = Math.floor(fb.x / TS), r = Math.floor(fb.y / TS);
    const tile = tileAt(c, r);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS || tile === "wall" || tile === "log") {
      fireballs.splice(i, 1);            // slocknar mot vägg/stock eller utanför
    }
  }
}

function updateSnake(sn, now) {
  if (sn.moving) {
    if ((now - sn.moveStart) / sn.moveDur >= 1) {
      sn.moving = false;
      sn.trail.push({ x: sn.col * TS + TS / 2, y: sn.row * TS + TS / 2 });
      if (sn.trail.length > 4) sn.trail.shift();
    }
    return;
  }
  let nc = sn.col + sn.dc, nr = sn.row + sn.dr;
  if (blockedForSnake(nc, nr)) {
    sn.dc = -sn.dc; sn.dr = -sn.dr;
    nc = sn.col + sn.dc; nr = sn.row + sn.dr;
    if (blockedForSnake(nc, nr)) return;
  }
  beginMove(sn, nc, nr, SNAKE_MS, now);
}

function blockedForSnake(c, r) {
  const t = tileAt(c, r);
  return t === "wall" || t === "log" || t === "hole" || t === "goal" || !!stoneAt(c, r);
}

function playerCenter(now) {
  const p = animPos(player, now);
  return { x: p.x + TS / 2, y: p.y + TS / 2 };
}

/* ---------------------------------------------------------------- */
/* Rendering                                                         */
/* ---------------------------------------------------------------- */

function draw(now) {
  frameNow = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) drawTile(c, r);
  }
  if (theme === "underground") drawSkeletons();
  for (const s of stones) {
    const p = animPos(s, now);
    drawStone(p.x, p.y);
  }
  if (dragon) drawDragon(now);
  for (const fb of fireballs) drawFireball(fb, now);
  for (const sn of snakes) drawSnake(sn, now);

  if (theme === "underground") drawVignette();
  if (state === "playing" || state === "won" || state === "levelcomplete" || state === "paused") drawPlayer(now);
}

function drawTile(c, r) {
  const x = c * TS, y = r * TS;
  const t = grid[r][c];
  const castle = theme === "castle";
  const underground = theme === "underground";

  if (t === "wall") {
    if (underground) {
      ctx.fillStyle = "#241c15";
      ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = ((c + r) % 2 === 0) ? "#33271c" : "#2e2319";
      ctx.fillRect(x + 2, y + 2, TS - 4, TS - 4);
      // grus-/jordkorn
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + 6 + ((c * 7) % 10), y + 8 + ((r * 5) % 9), 3, 3);
      ctx.fillRect(x + 22 + ((r * 3) % 8), y + 24 + ((c * 3) % 7), 3, 3);
      // kedjor hänger vid vissa väggar (dekorativt)
      if ((c * 5 + r * 3) % 9 === 0) drawChain(x + TS / 2, y);
      return;
    }
    if (castle) {
      ctx.fillStyle = "#6f6357";
      ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = "#857868";
      ctx.fillRect(x + 2, y + 2, TS - 4, TS - 4);
      // murbruk-fogar (tegel)
      ctx.strokeStyle = "#5a4f44";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + TS / 2); ctx.lineTo(x + TS, y + TS / 2);
      const off = (r % 2 === 0) ? TS / 2 : 0;
      ctx.moveTo(x + off, y); ctx.lineTo(x + off, y + TS / 2);
      ctx.moveTo(x + off, y + TS / 2); ctx.lineTo(x + off, y + TS);
      ctx.stroke();
      if ((c * 5 + r * 3) % 13 === 0) drawTorch(x + TS / 2, y + TS / 2);
    } else {
      ctx.fillStyle = "#3c4250";
      ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = "#474e5e";
      ctx.fillRect(x + 3, y + 3, TS - 6, TS - 6);
    }
    return;
  }

  // Golv
  if (underground) {
    ctx.fillStyle = ((c + r) % 2 === 0) ? "#211e19" : "#1b1916";
  } else if (castle) {
    ctx.fillStyle = ((c + r) % 2 === 0) ? "#46413a" : "#403b34";
  } else {
    ctx.fillStyle = ((c + r) % 2 === 0) ? "#333a47" : "#2f3540";
  }
  ctx.fillRect(x, y, TS, TS);

  if (t === "hole") {
    ctx.fillStyle = "#0c0e12";
    ctx.beginPath();
    ctx.arc(x + TS / 2, y + TS / 2, TS * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = castle ? "#2a241d" : "#1c1f27";
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (t === "log") {
    ctx.fillStyle = "#7a4a25";
    roundRect(x + 4, y + 8, TS - 8, TS - 16, 6);
    ctx.fill();
    ctx.strokeStyle = "#5e3617";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 14 + i * 6);
      ctx.lineTo(x + TS - 8, y + 14 + i * 6);
      ctx.stroke();
    }
  } else if (t === "start") {
    ctx.strokeStyle = castle ? "#ffd34d" : "#5fd6ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + TS / 2, y + TS / 2, TS * 0.34, 0, Math.PI * 2);
    ctx.stroke();
  } else if (t === "goal") {
    drawStar(x + TS / 2, y + TS / 2, TS * 0.4, "#ffd34d");
  }
}

function drawTorch(cx, cy) {
  // fäste
  ctx.fillStyle = "#3a2c1a";
  ctx.fillRect(cx - 2, cy - 2, 4, 12);
  // låga (flimrar)
  const f = 1 + Math.sin(frameNow / 90 + cx) * 0.25;
  ctx.fillStyle = "#ffb330";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6, 5, 9 * f, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe680";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 5, 2.5, 5 * f, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ---- Undertema (Bana 3): kedjor, skelett, drake, eld, mörker ---- */

// Kedja som hänger ner från toppen av en väggruta (dekorativt)
function drawChain(cx, topY) {
  ctx.strokeStyle = "#605c54";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, topY + 5 + i * 8, 2.6, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Skelett/skallar i hörnen (dekorativt, ingen kollision)
const SKELETON_CELLS = [[1, 12], [18, 2], [13, 13]];
function drawSkeletons() {
  for (const [c, r] of SKELETON_CELLS) drawSkull(c * TS + TS / 2, r * TS + TS / 2);
}
function drawSkull(cx, cy) {
  ctx.strokeStyle = "#8f8a7e"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - 8, cy + 6); ctx.lineTo(cx + 8, cy + 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 8, cy + 6); ctx.lineTo(cx - 8, cy + 12); ctx.stroke();
  ctx.fillStyle = "#cbc6ba";
  ctx.beginPath(); ctx.arc(cx, cy - 2, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(cx - 4, cy + 3, 8, 4);
  ctx.fillStyle = "#15110d";
  ctx.beginPath(); ctx.arc(cx - 3, cy - 2, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 3, cy - 2, 1.8, 0, Math.PI * 2); ctx.fill();
}

// Boss-draken, sedd ovanifrån. Vänd mot dragon.dir, flaxar med vingarna och
// får en glödande mun strax innan den sprutar eld.
function drawDragon(now) {
  const cx = dragon.col * TS + TS / 2, cy = dragon.row * TS + TS / 2;
  const d = dragon.dir;
  let ang = 0;
  if (d.dr === 1) ang = Math.PI;
  else if (d.dc === 1) ang = Math.PI / 2;
  else if (d.dc === -1) ang = -Math.PI / 2;   // dr === -1 (upp) => 0

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(0, 14, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(ang);

  const flap = 0.5 + 0.5 * Math.sin(now / 110);

  // vingar (flaxar)
  ctx.fillStyle = "#3a1414"; ctx.strokeStyle = "#251010"; ctx.lineWidth = 1.5;
  for (const sgn of [-1, 1]) {
    const spread = 12 + flap * 9;
    ctx.beginPath();
    ctx.moveTo(sgn * 4, -2);
    ctx.lineTo(sgn * spread, -8 - flap * 4);
    ctx.lineTo(sgn * (spread + 3), 6);
    ctx.lineTo(sgn * 5, 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // svans
  ctx.strokeStyle = "#5a2020"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 20); ctx.stroke();
  ctx.fillStyle = "#7a2b2b";
  ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(-4, 18); ctx.lineTo(4, 18); ctx.closePath(); ctx.fill();

  // kropp + ryggtaggar
  ctx.fillStyle = "#7a2b2b"; roundRect(-9, -8, 18, 20, 7); ctx.fill();
  ctx.fillStyle = "#933636"; roundRect(-5, -6, 10, 14, 5); ctx.fill();
  ctx.fillStyle = "#c9a23a";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-3, -4 + i * 6); ctx.lineTo(0, -8 + i * 6); ctx.lineTo(3, -4 + i * 6);
    ctx.closePath(); ctx.fill();
  }

  // huvud, horn, lysande ögon
  ctx.fillStyle = "#8a3333";
  ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e7dcc0";
  ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(-9, -22); ctx.lineTo(-3, -17); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -16); ctx.lineTo(9, -22); ctx.lineTo(3, -17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffd23a";
  ctx.beginPath(); ctx.arc(-3, -13, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -13, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a0a0a";
  ctx.beginPath(); ctx.arc(-3, -13, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -13, 0.9, 0, Math.PI * 2); ctx.fill();

  // glödande mun strax innan eldsput
  const soon = Math.min(1, Math.max(0, 1 - (dragon.fireAt - now) / 500));
  if (soon > 0) {
    ctx.fillStyle = `rgba(255,140,30,${0.5 * soon})`;
    ctx.beginPath(); ctx.arc(0, -20, 3 + 4 * soon, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

function drawFireball(fb, now) {
  const flick = 0.85 + 0.15 * Math.sin(now / 40 + fb.born);
  ctx.fillStyle = "rgba(255,90,20,0.45)";
  ctx.beginPath(); ctx.arc(fb.x, fb.y, 12 * flick, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ff7a1a";
  ctx.beginPath(); ctx.arc(fb.x, fb.y, 7 * flick, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffe070";
  ctx.beginPath(); ctx.arc(fb.x, fb.y, 3.4, 0, Math.PI * 2); ctx.fill();
}

// Mörk vinjett – ger den svaga, instängda belysningen i underjorden
function drawVignette() {
  const g = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.28,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.72
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawStone(x, y) {
  ctx.fillStyle = "#8b909b";
  roundRect(x + 5, y + 5, TS - 10, TS - 10, 8);
  ctx.fill();
  ctx.fillStyle = "#a3a8b3";
  roundRect(x + 9, y + 8, TS - 22, TS - 22, 5);
  ctx.fill();
  ctx.strokeStyle = "#6c707a";
  ctx.lineWidth = 2;
  roundRect(x + 5, y + 5, TS - 10, TS - 10, 8);
  ctx.stroke();
}

function drawSnake(sn, now) {
  const p = animPos(sn, now);
  const hx = p.x + TS / 2, hy = p.y + TS / 2;

  ctx.strokeStyle = "#3aa657";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  const back = -sn.dc, backy = -sn.dr;
  for (let i = 1; i <= 3; i++) {
    const wob = (i % 2 === 0 ? 5 : -5);
    ctx.lineTo(
      hx + back * i * 8 + (sn.dr !== 0 ? wob : 0),
      hy + backy * i * 8 + (sn.dc !== 0 ? wob : 0)
    );
  }
  ctx.stroke();

  ctx.fillStyle = "#46c46b";
  ctx.beginPath();
  ctx.arc(hx, hy, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  const ex = sn.dc * 3, ey = sn.dr * 3;
  ctx.beginPath(); ctx.arc(hx + ex - 3, hy + ey - 3, 1.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(hx + ex + 3, hy + ey + 3, 1.6, 0, 7); ctx.fill();
}

function drawPlayer(now) {
  const p = animPos(player, now);
  const cx = p.x + TS / 2, cy = p.y + TS / 2;

  let lift = 0, scale = 1;
  if (player.jumping && player.moving) {
    lift = Math.sin(p.p * Math.PI) * 14;
    scale = 1 + Math.sin(p.p * Math.PI) * 0.18;
  }

  if (now < player.invuln && Math.floor(now / 100) % 2 === 0) return;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13, 11 - lift * 0.2, 5 - lift * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy - lift);
  ctx.scale(scale, scale);

  const d = player.dir;
  let ang = 0;
  if (d.dc === 1) ang = Math.PI / 2;
  else if (d.dc === -1) ang = -Math.PI / 2;
  else if (d.dr === 1) ang = Math.PI;
  ctx.rotate(ang);

  if (theme === "castle") drawKnightBody();
  else drawGubbeBody();

  ctx.restore();
}

// Grå pixelgubbe (Bana 1) sedd ovanifrån, tittar "uppåt"
function drawGubbeBody() {
  ctx.fillStyle = "#111";
  roundRect(-13, -4, 5, 14, 2); ctx.fill();
  roundRect(8, -4, 5, 14, 2); ctx.fill();

  ctx.fillStyle = "#e23b3b";
  roundRect(-7, 8, 6, 8, 2); ctx.fill();
  roundRect(1, 8, 6, 8, 2); ctx.fill();

  ctx.fillStyle = "#8a8f99";
  roundRect(-9, -6, 18, 16, 4); ctx.fill();

  ctx.fillStyle = "#9fa4ae";
  ctx.beginPath();
  ctx.arc(0, -7, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b8bcc4";
  roundRect(-7, -13, 14, 6, 3); ctx.fill();
}

// Riddare (Bana 2) sedd ovanifrån, tittar "uppåt"
function drawKnightBody() {
  // röda ben
  ctx.fillStyle = "#e23b3b";
  roundRect(-7, 8, 6, 8, 2); ctx.fill();
  roundRect(1, 8, 6, 8, 2); ctx.fill();

  // sköld (vänster) – silver med rött kors
  ctx.fillStyle = "#cfd3da";
  roundRect(-16, -6, 8, 16, 3); ctx.fill();
  ctx.strokeStyle = "#9aa0aa"; ctx.lineWidth = 1.5;
  roundRect(-16, -6, 8, 16, 3); ctx.stroke();
  ctx.fillStyle = "#d23b3b";
  ctx.fillRect(-12.5, -5, 1.6, 14);
  ctx.fillRect(-15, 1.2, 7, 1.6);

  // svärd (höger) – blad uppåt med guldfäste
  ctx.strokeStyle = "#e6e9ef"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(12, -15); ctx.stroke();
  ctx.fillStyle = "#e2b53a";
  roundRect(8, 6, 9, 3, 1); ctx.fill();

  // kropp/rustning
  ctx.fillStyle = "#8a8f99";
  roundRect(-9, -6, 18, 16, 4); ctx.fill();
  ctx.strokeStyle = "#70757f"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 9); ctx.stroke();

  // hjälm
  ctx.fillStyle = "#b6bbc4";
  ctx.beginPath(); ctx.arc(0, -7, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a3f48";              // visir-springa
  roundRect(-6, -8, 12, 3, 1); ctx.fill();
  // röd plym
  ctx.fillStyle = "#d23b3b";
  roundRect(-2, -16, 4, 8, 2); ctx.fill();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(cx, cy, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? radius : radius * 0.45;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#caa12f";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* ---------------------------------------------------------------- */
/* Loop                                                              */
/* ---------------------------------------------------------------- */

function loop(now) {
  if (!paused) update(now);
  draw(paused ? pauseAt : now);   // frys bilden medan pausad
  requestAnimationFrame(loop);
}

// Initiera (visa Bana 1 bakom start-overlay)
buildLevel1();
resetPlayer();
updateHud();
showOverlay("Pixelgubben", "", "Starta", { hint: true, menu: true });
requestAnimationFrame(loop);
