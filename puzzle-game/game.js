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
const ROLLER_STEP_MS = 175; // stenen är lite långsammare än gubben
const ROLLER_HEADSTART = 2000; // två sekunders försprång innan stenen börjar rulla
const ROLLER_HOLE_PAUSE_MS = 1000; // stenen stannar en sekund på varje hål
const CRUMBLE_MS = 500;      // tid innan ett klurigt K-block rasar och blir hål
const ARROW_FIRE_MS = 1000;   // pilfällorna skjuter en gång per sekund
const ARROW_SPEED = 0.09;     // ganska långsam pil (pixlar per ms)
const TEMPLE_CODE = "25412541";
const BOSS_ATTACK_MS = 1000;
const SWORD_COOLDOWN_MS = 300;
const BOSS_START_LIVES = 5;
const DRAGON_START_LIVES = 3;
const EVIL_GUY_STEP_MS = 500;
const EVIL_GUY_ALERT_PAUSE_MS = 500;
const EVIL_GUY_PATROL = [
  { dc: 0, dr: 1, steps: 2 },
  { dc: -1, dr: 0, steps: 5 },
  { dc: 1, dr: 0, steps: 5 },
  { dc: 0, dr: 1, steps: 3 },
  { dc: -1, dr: 0, steps: 5 },
  { dc: 1, dr: 0, steps: 5 },
  { dc: 0, dr: 1, steps: 2 },
  { dc: 0, dr: 1, steps: 4 },
  { dc: -1, dr: 0, steps: 6 },
  { dc: 1, dr: 0, steps: 6 },
  { dc: 0, dr: -1, steps: 9 },
];

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
const attackBtn = document.getElementById("attack-btn");
const keypadEl = document.getElementById("keypad");
const keypadDisplay = document.getElementById("keypad-display");
const keypadButtons = document.getElementById("keypad-buttons");
const keypadCancel = document.getElementById("keypad-cancel");

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
const sfxRoll = () => tone(70, 0.16, "sawtooth", 0.05, 50);   // lågt muller från stenen
const sfxCrumble = () => tone(120, 0.2, "sawtooth", 0.12, 40); // golvet rasar
const sfxSword = () => tone(620, 0.11, "triangle", 0.16, 260);
const sfxBossHit = () => tone(110, 0.2, "square", 0.18, 55);
const sfxBossAttack = () => tone(85, 0.18, "sawtooth", 0.15, 45);

/* ---------------------------------------------------------------- */
/* Bakgrundsmusik – mystisk, syntad slinga (ingen ljudfil)          */
/* ---------------------------------------------------------------- */
let musicTimer = null;
let musicStep = 0;
let musicGain = null;

// Toner i a-moll = lite mörk, mystisk stämning (frekvenser i Hz)
const MUSIC_NOTES = [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 415.30];
// Lugn, lite olycksbådande slinga (index i MUSIC_NOTES)
const MUSIC_SEQ = [0, 2, 4, 3, 5, 4, 2, 1, 0, 3, 5, 6, 4, 3, 1, 0];
// Riddarborgen får en stadig, medeltida marschmelodi.
const CASTLE_MUSIC_NOTES = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33];
const CASTLE_MUSIC_SEQ = [0, 2, 3, 2, 0, 3, 4, 3, 2, 1, 2, 4, 5, 4, 3, 0];
// Bossarenan får en snabb, spännande stridsmelodi i d-moll.
const ARENA_MUSIC_NOTES = [146.83, 174.61, 196.00, 220.00, 233.08, 293.66, 349.23];
const ARENA_MUSIC_SEQ = [0, 0, 3, 4, 5, 3, 2, 1, 0, 2, 3, 5, 6, 5, 4, 2];
// Kodtemplet får en egen lugn och ljus melodi utan den mörka bas-dronen.
const TEMPLE_MUSIC_NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
const TEMPLE_MUSIC_SEQ = [0, 2, 3, 2, 1, 4, 3, 1, 0, 1, 2, 4, 3, 2, 1, 0];
// Trädgården får en mjuk, glad melodi med ljusa toner.
const GARDEN_MUSIC_NOTES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 523.25];
const GARDEN_MUSIC_SEQ = [0, 2, 4, 5, 4, 2, 1, 3, 5, 6, 5, 3, 2, 1, 0, 2];

function musicNote(freq, dur, vol, type = "sine") {
  if (!audioCtx || muted || !musicGain) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.35);  // mjuk insvävning
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);      // lång utklang
  osc.connect(g).connect(musicGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function musicTick() {
  if (!audioCtx || muted) return;
  if (theme === "arena") {
    const n = ARENA_MUSIC_SEQ[musicStep % ARENA_MUSIC_SEQ.length];
    musicNote(ARENA_MUSIC_NOTES[n], 0.48, 0.043, "square");
    if (musicStep % 2 === 0) musicNote(73.42, 0.3, 0.035, "sawtooth");
    if (musicStep % 8 === 7) musicNote(440, 0.65, 0.025, "triangle");
    musicStep++;
    return;
  }
  if (theme === "castle") {
    const n = CASTLE_MUSIC_SEQ[musicStep % CASTLE_MUSIC_SEQ.length];
    musicNote(CASTLE_MUSIC_NOTES[n], 0.72, 0.045, "triangle");
    if (musicStep % 2 === 0) {
      const bass = musicStep % 4 === 0 ? 146.83 : 220.00;
      musicNote(bass, 0.42, 0.025, "square");
    }
    musicStep++;
    return;
  }
  if (theme === "temple") {
    const n = TEMPLE_MUSIC_SEQ[musicStep % TEMPLE_MUSIC_SEQ.length];
    musicNote(TEMPLE_MUSIC_NOTES[n], 2.2, 0.035, "sine");
    if (musicStep % 4 === 0) musicNote(130.81, 2.8, 0.018, "triangle");
    musicStep++;
    return;
  }
  if (theme === "garden") {
    const n = GARDEN_MUSIC_SEQ[musicStep % GARDEN_MUSIC_SEQ.length];
    musicNote(GARDEN_MUSIC_NOTES[n], 1.15, 0.036, "sine");
    if (musicStep % 4 === 0) musicNote(196.00, 1.5, 0.018, "triangle");
    musicStep++;
    return;
  }
  const n = MUSIC_SEQ[musicStep % MUSIC_SEQ.length];
  musicNote(MUSIC_NOTES[n], 1.8, 0.05, "triangle");           // svävande melodi
  if (musicStep % 4 === 0) musicNote(110, 3.4, 0.045, "sine"); // dov bas-drone
  if (musicStep % 8 === 5) musicNote(MUSIC_NOTES[6] * 2, 2.6, 0.018, "sine"); // hög, mystisk klang
  musicStep++;
}

function startMusic() {
  if (musicTimer) return;
  resumeAudio();
  if (!audioCtx) return;
  if (!musicGain || musicGain.context !== audioCtx) {
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(audioCtx.destination);
  }
  musicTick();
  const tempo = theme === "arena" ? 480
    : (theme === "castle" ? 650 : (theme === "temple" ? 1100 : (theme === "garden" ? 780 : 850)));
  musicTimer = setInterval(musicTick, tempo);
}

function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}

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
// boss-DRAKEN (X) i mitten. Draken sitter still och sprutar eld. Spelaren får
// ett svärd och måste ta drakens tre liv för att klara banan.
// # vägg  . golv  O start  ~ orm  X drake  H hål  L stock  S sten
const LEVEL3_MAP = [
  "####################",
  "#.......####.......#",
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

// Bana 4 – Rullande stenen. Ritad av Agust (9 år).
// En lång, smal (1 ruta bred) korridor som ringlar fram och tillbaka. Du startar
// vid O med den rullande stenen (R) precis bakom dig och måste springa hela vägen
// till målet (*) innan stenen kommer ikapp. Stenen har samma fart som gubben
// men stannar en sekund på varje hål. På vägen finns hål (H) att hoppa över
// och ormar (~) att undvika.
// # vägg  . golv  O start  * mål  R rullande sten  ~ orm  H hål
const LEVEL4_MAP = [
  "####################",
  "#RO.......H........#",
  "##################.#",
  "#........~.........#",
  "#.##################",
  "#........H.........#",
  "##################.#",
  "#........H.........#",
  "#.##################",
  "#.........~........#",
  "##################.#",
  "#.......H..........#",
  "#.##################",
  "#...........H.....*#",
  "####################",
];

// Bana 5 – Kodtemplet. Två separata rum från Agusts ritade karta.
// I vänstra rummet finns starten, kodskylten K och kodlåset L. Rätt kod
// teleporterar spelaren till M i det högra rummet, där en orm och målet väntar.
// Fyra pilfällor sitter i ytterväggarna, siktar på spelaren och skjuter varje sekund.
function buildLevel5() {
  arenaBoss = null;
  dragon = null;
  evilGuy = null;
  fireballs = [];
  roller = null;
  crumbleCells = [];
  activeCrumbles = [];
  stones = [];
  snakes = [];
  turrets = [];
  arrows = [];
  templeTeleport = { col: 10, row: 10 };
  codeSolved = false;

  grid = Array.from({ length: ROWS }, () => Array(COLS).fill("wall"));

  // Vänstra rummet: fem rutor brett och två rader högt, som på kartan.
  for (let r = 4; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) grid[r][c] = "floor";
  }
  startCell = { col: 1, row: 4 };
  grid[4][1] = "start";
  grid[4][4] = "code-clue";
  grid[5][6] = "code-lock";

  // Högra rummet och målkammaren.
  for (let r = 8; r <= 10; r++) {
    for (let c = 10; c <= 18; c++) grid[r][c] = "floor";
  }
  for (let r = 6; r <= 7; r++) {
    for (let c = 16; c <= 18; c++) grid[r][c] = "floor";
  }
  grid[10][10] = "teleport";
  grid[8][17] = "goal";

  // Ormen ovanför målstjärnan rör sig lodrätt.
  const templeSnake = makeSnake(16, 7, 0);
  templeSnake.dc = 0;
  templeSnake.dr = 1;
  templeSnake.range = 1;
  snakes.push(templeSnake);

  // Två fällor runt varje rum, inbyggda i ytterväggarna.
  turrets.push(makeTurret(3, 3), makeTurret(3, 6));
  turrets.push(makeTurret(13, 7), makeTurret(14, 11));
}

// Bana 6 – Bossarenan. Agusts karta är vriden 90 grader åt höger: tio
// rutor bred och två rutor hög. Spelaren startar uppe till vänster och bossen
// står nere till höger. Båda kan slå en ruta åt alla håll, även diagonalt.
function buildLevel6() {
  dragon = null;
  evilGuy = null;
  fireballs = [];
  roller = null;
  crumbleCells = [];
  activeCrumbles = [];
  stones = [];
  snakes = [];
  turrets = [];
  arrows = [];
  templeTeleport = null;
  codeSolved = false;

  grid = Array.from({ length: ROWS }, () => Array(COLS).fill("wall"));
  for (let r = 6; r <= 7; r++) {
    for (let c = 5; c <= 14; c++) grid[r][c] = "floor";
  }
  startCell = { col: 5, row: 6 };
  grid[6][5] = "start";
  arenaBoss = {
    col: 14,
    row: 7,
    lives: BOSS_START_LIVES,
    nextAttackAt: performance.now() + BOSS_ATTACK_MS,
    attackUntil: 0,
    hurtUntil: 0,
  };
}

// Bana 7 – Trädgården. Tomma rutor från Agusts karta är golv och allt runtom är
// vägg. Den elaka gubben (X) kan inte besegras. Stå en ruta bakom honom för att
// få nyckeln till L-dörren. Då pausar han 0,5 sek, backar två steg och står
// sedan still tills spelaren når M.
function buildLevel7() {
  arenaBoss = null;
  dragon = null;
  fireballs = [];
  roller = null;
  crumbleCells = [];
  activeCrumbles = [];
  stones = [];
  snakes = [];
  turrets = [];
  arrows = [];
  templeTeleport = null;
  codeSolved = false;
  evilGuyKey = false;

  grid = Array.from({ length: ROWS }, () => Array(COLS).fill("wall"));

  // Övre rummet och patrullvägen.
  for (let r = 3; r <= 5; r++) {
    for (let c = 1; c <= 12; c++) grid[r][c] = "floor";
  }
  for (let c = 2; c <= 7; c++) grid[6][c] = "floor";
  for (let r = 1; r <= 13; r++) grid[r][7] = "floor";
  grid[1][6] = "floor";
  grid[1][7] = "floor";

  // Långa vägen hem åt höger, med den låsta L-dörren före målet.
  for (let c = 1; c <= 18; c++) grid[10][c] = "floor";
  for (let r = 11; r <= 13; r++) grid[r][7] = "floor";
  startCell = { col: 7, row: 13 };
  grid[13][7] = "start";
  grid[10][17] = "locked-door";
  grid[10][18] = "goal";

  evilGuy = makeEvilGuy(7, 1);
}

const LEVELS = [
  { name: "Bana 1: Grottan", theme: "dungeon", build: buildLevel1 },
  { name: "Bana 2: Riddarborgen", theme: "castle", map: LEVEL2_MAP },
  { name: "Bana 3: Drakhålan", theme: "underground", map: LEVEL3_MAP },
  { name: "Bana 4: Rullande stenen", theme: "dungeon", map: LEVEL4_MAP, stepMs: STEP_MS, snakeRange: 1 },
  { name: "Bana 5: Kodtemplet", theme: "temple", build: buildLevel5 },
  { name: "Bana 6: Bossarenan", theme: "arena", build: buildLevel6 },
  { name: "Bana 7: Trädgården", theme: "garden", build: buildLevel7 },
];

// Aktuell bana – fylls i av loadLevel()
let grid;        // grid[row][col]
let stones;      // [{col,row, ...anim}]
let snakes;      // [{...}]
let startCell;   // {col,row}
let theme = "dungeon";
let dragon = null;   // boss-draken (Bana 3) eller null
let fireballs = [];  // drakens eldklot
let roller = null;       // rullande stenen (Bana 4) eller null
let crumbleCells = [];   // alla K-block (för att kunna återställa vid omstart)
let activeCrumbles = []; // K-block som börjat rasa: {c, r, dieAt}
let playerStepMs = STEP_MS; // tid för ett spelar-steg (kan sättas per bana)
let turrets = [];           // väggmonterade pilfällor i Bana 5
let arrows = [];            // flygande pilar
let templeTeleport = null;  // M-rutan efter godkänd kod
let codeSolved = false;
let enteredCode = "";
let arenaBoss = null;          // den stillastående bossen i Bana 6
let swordSwingUntil = 0;
let nextSwordAt = 0;
let evilGuy = null;            // den elaka gubben i Bana 7
let evilGuyKey = false;

function makeTurret(c, r) {
  return { col: c, row: r, nextAt: performance.now() + ARROW_FIRE_MS };
}

function makeEvilGuy(c, r) {
  return {
    col: c, row: r,
    fromX: c * TS, fromY: r * TS, toX: c * TS, toY: r * TS,
    moveStart: 0, moveDur: 0, moving: false,
    dir: { dc: 0, dr: 1 },
    nextAt: performance.now() + EVIL_GUY_STEP_MS,
    mode: "patrol",
    patrolIndex: 0,
    stepsLeft: EVIL_GUY_PATROL[0].steps,
    pauseUntil: 0,
    backStepsLeft: 0,
    backDir: { dc: 0, dr: -1 },
  };
}

function resetEvilGuy(now) {
  if (!evilGuy) return;
  evilGuy.col = 7;
  evilGuy.row = 1;
  evilGuy.fromX = evilGuy.toX = evilGuy.col * TS;
  evilGuy.fromY = evilGuy.toY = evilGuy.row * TS;
  evilGuy.moving = false;
  evilGuy.dir = { dc: 0, dr: 1 };
  evilGuy.mode = "patrol";
  evilGuy.patrolIndex = 0;
  evilGuy.stepsLeft = EVIL_GUY_PATROL[0].steps;
  evilGuy.pauseUntil = 0;
  evilGuy.backStepsLeft = 0;
  evilGuy.backDir = { dc: 0, dr: -1 };
  evilGuy.nextAt = now + EVIL_GUY_STEP_MS;
}

// Bana 1 byggs programmatiskt (samma som tidigare, väl testad)
function buildLevel1() {
  arenaBoss = null;
  dragon = null;
  evilGuy = null;
  fireballs = [];
  roller = null;
  crumbleCells = [];
  activeCrumbles = [];
  turrets = [];
  arrows = [];
  templeTeleport = null;
  codeSolved = false;
  evilGuyKey = false;
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
    homeCol: c, homeRow: r, range: Infinity,   // range = hur långt den vandrar från start
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
    lives: DRAGON_START_LIVES,
    hurtUntil: 0,
  };
}

// Rullande stenen (Bana 4): rullar längs korridoren, en ruta i taget. Den har
// "fart" i en riktning och fortsätter rakt fram så länge det går – krockar den
// med en vägg svänger den ditåt korridoren öppnar sig. Den jagar därför aldrig
// "smart", den följer bara samma väg som spelaren måste ta.
function makeRoller(c, r) {
  return {
    col: c, row: r,
    startCol: c, startRow: r,
    dir: { dc: 1, dr: 0 },                  // börjar rulla åt höger
    fromX: c * TS, fromY: r * TS, toX: c * TS, toY: r * TS,
    moveStart: 0, moveDur: 0, moving: false,
    spin: 0,                                // hur långt den rullat (för snurr-effekt)
    nextAt: performance.now() + ROLLER_HEADSTART,
    lastPausedHole: null,
  };
}

function resetRoller(now) {
  roller.col = roller.startCol;
  roller.row = roller.startRow;
  roller.fromX = roller.toX = roller.startCol * TS;
  roller.fromY = roller.toY = roller.startRow * TS;
  roller.moving = false;
  roller.dir = { dc: 1, dr: 0 };
  roller.lastPausedHole = null;
  roller.nextAt = now + ROLLER_HEADSTART;
}

// Linjär position (jämn rullning, inte easeInOut som hoppar mellan rutorna)
function rollerCenter(now) {
  if (!roller.moving) return { x: roller.col * TS + TS / 2, y: roller.row * TS + TS / 2 };
  let p = (now - roller.moveStart) / roller.moveDur;
  if (p > 1) p = 1;
  return {
    x: roller.fromX + (roller.toX - roller.fromX) * p + TS / 2,
    y: roller.fromY + (roller.toY - roller.fromY) * p + TS / 2,
  };
}

function rollerCanGo(c, r) {
  return tileAt(c, r) !== "wall";   // stenen rullar över allt utom väggar
}

// Tolkar en ASCII-bana till grid/stones/snakes/startCell
function parseMap(map) {
  grid = [];
  stones = [];
  snakes = [];
  dragon = null;
  fireballs = [];
  roller = null;
  crumbleCells = [];
  activeCrumbles = [];
  turrets = [];
  arrows = [];
  templeTeleport = null;
  codeSolved = false;
  arenaBoss = null;
  evilGuy = null;
  evilGuyKey = false;
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
        case "R": row.push("floor"); roller = makeRoller(c, r); break;
        case "K": row.push("crumble"); crumbleCells.push({ c, r }); break;
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
  playerStepMs = def.stepMs || STEP_MS;
  if (def.build) def.build();
  else parseMap(def.map);
  document.body.classList.toggle("sword-level", !!(dragon || arenaBoss));
  if (def.snakeRange != null) for (const sn of snakes) sn.range = def.snakeRange;
  resetPlayer();
  heldDirs.length = 0;          // rensa ev. kvarhängande tangenter/knappar
  lives = START_LIVES;
  scoreAtLevelStart = score;
  state = "playing";
  swordSwingUntil = 0;
  nextSwordAt = 0;
  if (keypadEl) keypadEl.classList.add("hidden");
  hideOverlay();
  updateHud();
  startMusic();
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
    jumpQueued: false,
    invuln: 0,
  };
}

/* ---------------------------------------------------------------- */
/* Spelstatus                                                        */
/* ---------------------------------------------------------------- */

let state = "start";  // 'start' | 'playing' | 'paused' | 'code' | 'code-wrong' | 'dead' | 'levelcomplete' | 'won'
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
  if (levelEl) {
    const shortName = LEVELS[currentLevel] ? LEVELS[currentLevel].name.split(":")[0] : "";
    const enemy = arenaBoss || dragon;
    const enemyName = arenaBoss ? "Boss" : "Drake";
    levelEl.textContent = enemy && enemy.lives > 0
      ? `${shortName} · ${enemyName} ${"♥".repeat(enemy.lives)}`
      : shortName;
  }
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
  if (t === "locked-door" && !evilGuyKey) return true;
  if (dragon && dragon.lives > 0 && dragon.col === c && dragon.row === r) return true;
  if (arenaBoss && arenaBoss.col === c && arenaBoss.row === r) return true;
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
  if (state === "code") {
    if (/^[0-9]$/.test(e.key)) enterCodeDigit(e.key);
    else if (e.key === "Backspace") removeCodeDigit();
    else if (e.key === "Enter") submitTempleCode();
    else if (e.key === "Escape") closeKeypad();
    e.preventDefault();
    return;
  }
  if (e.key in DIR_KEYS) {
    e.preventDefault();
    if (!heldDirs.includes(e.key)) heldDirs.unshift(e.key);
  } else if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    if (state === "playing") tryJump();
  } else if (e.key === "a" || e.key === "A") {
    e.preventDefault();
    if (state === "playing") playerAttack();
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

if (attackBtn) {
  attackBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    resumeAudio();
    if (state === "playing") playerAttack();
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

if (keypadButtons) {
  for (const digit of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"]) {
    const btn = document.createElement("button");
    btn.textContent = digit;
    btn.addEventListener("click", () => {
      resumeAudio();
      if (digit === "⌫") removeCodeDigit();
      else if (digit === "✓") submitTempleCode();
      else enterCodeDigit(digit);
    });
    keypadButtons.appendChild(btn);
  }
}
if (keypadCancel) keypadCancel.addEventListener("click", closeKeypad);

// hindra sid-scroll och pinch-zoom på pekskärm
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
document.addEventListener("gesturestart", (e) => e.preventDefault());

// Knappen gör olika saker beroende på läge
function startBtnAction() {
  if (state === "paused") { resume(); return; }
  if (state === "levelcomplete") {
    loadLevel(currentLevel + 1);
  } else if (state === "dead") {
    score = 0;                      // Game Over = börja om hela spelet
    loadLevel(0);
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
  stopMusic();
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
  for (const arrow of arrows) arrow.born += delta;
  for (const turret of turrets) turret.nextAt += delta;
  if (dragon) {
    dragon.fireAt += delta;
    dragon.hurtUntil += delta;
  }
  if (arenaBoss) {
    arenaBoss.nextAttackAt += delta;
    arenaBoss.attackUntil += delta;
    arenaBoss.hurtUntil += delta;
  }
  if (swordSwingUntil) swordSwingUntil += delta;
  if (nextSwordAt) nextSwordAt += delta;
  if (roller) { if (roller.moving) roller.moveStart += delta; roller.nextAt += delta; }
  for (const cb of activeCrumbles) cb.dieAt += delta;
  paused = false;
  state = "playing";
  hideOverlay();
  startMusic();
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
  beginMove(player, nc, nr, playerStepMs, now);
  return true;
}

function snakeAheadDistance(d) {
  if (!roller || (d.dc === 0 && d.dr === 0)) return 0;
  for (let distance = 1; distance <= 3; distance++) {
    const c = player.col + distance * d.dc;
    const r = player.row + distance * d.dr;
    if (snakes.some(sn => sn.col === c && sn.row === r)) return distance;
  }
  return 0;
}

function performJump() {
  const now = performance.now();
  const d = player.dir;
  const snakeDistance = snakeAheadDistance(d);
  // På Bana 4 landar det vanliga hoppet precis efter en orm som står högst
  // tre rutor framför spelaren (alltså högst två tomma rutor emellan).
  const distance = snakeDistance > 0 ? snakeDistance + 1 : 2;
  const lc = player.col + distance * d.dc;
  const lr = player.row + distance * d.dr;

  let pathBlocked = false;
  for (let step = 1; step < distance; step++) {
    if (isSolid(player.col + step * d.dc, player.row + step * d.dr)) {
      pathBlocked = true;
      break;
    }
  }
  const canLand =
    !isSolid(lc, lr) && !stoneAt(lc, lr) &&
    tileAt(lc, lr) !== "hole" &&
    !(d.dc === 0 && d.dr === 0);

  sfxJump();
  if (canLand && !pathBlocked) {
    player.jumping = true;
    beginMove(player, lc, lr, JUMP_MS, now);
  } else {
    player.jumping = true;
    beginMove(player, player.col, player.row, JUMP_MS * 0.7, now);
  }
}

function tryJump() {
  if (player.moving) {
    // Bara Bana 4: ett hopp som trycks medan gubben springer köas och
    // startar direkt när det vanliga steget är klart.
    if (roller && !player.jumping) player.jumpQueued = true;
    return;
  }

  // Om pil och HOPP trycks nästan samtidigt på iPad startar först ett steg och
  // sedan hoppet. Tidigare hann riktningen ibland inte registreras.
  if (roller && heldDirs.length > 0) {
    const d = DIR_KEYS[heldDirs[0]];
    player.dir = d;
    if (tryStep(d, performance.now())) {
      player.jumpQueued = true;
      return;
    }
  }

  performJump();
}

function isNextToEnemy(enemy) {
  if (!enemy) return false;
  const dc = Math.abs(player.col - enemy.col);
  const dr = Math.abs(player.row - enemy.row);
  return Math.max(dc, dr) === 1;
}

function playerAttack() {
  const enemy = arenaBoss || dragon;
  if (!enemy || enemy.lives <= 0 || player.moving) return;
  const now = performance.now();
  if (now < nextSwordAt) return;
  nextSwordAt = now + SWORD_COOLDOWN_MS;
  swordSwingUntil = now + 220;
  sfxSword();

  if (!isNextToEnemy(enemy)) return;
  enemy.lives -= 1;
  enemy.hurtUntil = now + 220;
  updateHud();
  sfxBossHit();
  if (enemy.lives <= 0) {
    if (enemy === dragon) fireballs.length = 0;
    win();
  }
}

function updateArenaBoss(now) {
  if (!arenaBoss || arenaBoss.lives <= 0 || now < arenaBoss.nextAttackAt) return;
  arenaBoss.nextAttackAt = now + BOSS_ATTACK_MS;
  arenaBoss.attackUntil = now + 280;
  sfxBossAttack();
  if (isNextToEnemy(arenaBoss)) hit();
}

function tryCollectEvilGuyKey(now) {
  if (!evilGuy || evilGuyKey || evilGuy.moving) return;
  const behindCol = evilGuy.col - evilGuy.dir.dc;
  const behindRow = evilGuy.row - evilGuy.dir.dr;
  if (player.col !== behindCol || player.row !== behindRow) return;
  evilGuyKey = true;
  evilGuy.mode = "chase";
  evilGuy.nextAt = now + EVIL_GUY_ALERT_PAUSE_MS;
  sfxLevel();
  updateHud();
}

function onPlayerArrived() {
  const queuedJump = player.jumpQueued;
  player.jumpQueued = false;
  const t = tileAt(player.col, player.row);
  if (t === "goal") { win(); return; }
  if (t === "hole" && !player.jumping) { die(); return; }
  if (t === "code-lock" && !codeSolved) { openKeypad(); return; }
  if (t === "crumble") {
    // golvet börjar rasa – kom igång igen innan det blir ett hål!
    grid[player.row][player.col] = "crumbling";
    activeCrumbles.push({ c: player.col, r: player.row, dieAt: performance.now() + CRUMBLE_MS });
  }
  player.jumping = false;
  if (queuedJump && roller && state === "playing") performJump();
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
    // Efter avklarat kodlås är M den nya kontrollpunkten. Annars skulle en
    // pilträff i rum två skicka spelaren till ett rum som inte längre går att lämna.
    const respawn = codeSolved && templeTeleport ? templeTeleport : startCell;
    player.col = respawn.col;
    player.row = respawn.row;
    player.toX = player.fromX = respawn.col * TS;
    player.toY = player.fromY = respawn.row * TS;
    player.moving = false;
    player.jumping = false;
    player.jumpQueued = false;
    player.dir = { dc: 0, dr: 1 };
    player.invuln = performance.now() + INVULN_MS;
    fireballs.length = 0;                          // rensa eld så respawn blir rättvis
    resetTempleHazards(performance.now());
    if (dragon) dragon.fireAt = performance.now() + 1200;
    if (arenaBoss) arenaBoss.nextAttackAt = performance.now() + BOSS_ATTACK_MS;
    if (roller) resetRoller(performance.now());    // stenen tillbaka till start
    if (evilGuy) resetEvilGuy(performance.now());
    restoreCrumbles();                             // laga rasade K-block inför nytt försök
    sfxHurt();
  }
}

function resetTempleHazards(now) {
  arrows.length = 0;
  for (const turret of turrets) turret.nextAt = now + ARROW_FIRE_MS;
}

function openKeypad() {
  enteredCode = "";
  updateKeypadDisplay();
  state = "code";
  heldDirs.length = 0;
  if (keypadEl) {
    keypadEl.classList.remove("hidden");
    keypadEl.setAttribute("aria-hidden", "false");
  }
}

function closeKeypad() {
  if (state !== "code") return;
  if (keypadEl) {
    keypadEl.classList.add("hidden");
    keypadEl.setAttribute("aria-hidden", "true");
  }
  state = "playing";
}

function enterCodeDigit(digit) {
  if (state !== "code" || enteredCode.length >= TEMPLE_CODE.length) return;
  enteredCode += digit;
  updateKeypadDisplay();
  if (enteredCode.length === TEMPLE_CODE.length) submitTempleCode();
}

function removeCodeDigit() {
  if (state !== "code") return;
  enteredCode = enteredCode.slice(0, -1);
  updateKeypadDisplay();
}

function updateKeypadDisplay(message = "") {
  if (!keypadDisplay) return;
  keypadDisplay.textContent = message || enteredCode.padEnd(TEMPLE_CODE.length, "·");
}

function submitTempleCode() {
  if (state !== "code" || enteredCode.length !== TEMPLE_CODE.length) return;
  if (enteredCode === TEMPLE_CODE) {
    codeSolved = true;
    closeKeypad();
    player.col = templeTeleport.col;
    player.row = templeTeleport.row;
    player.fromX = player.toX = player.col * TS;
    player.fromY = player.toY = player.row * TS;
    player.moving = false;
    player.invuln = performance.now() + 700;
    resetTempleHazards(performance.now());
    sfxLevel();
  } else {
    state = "code-wrong";
    updateKeypadDisplay("FEL KOD");
    setTimeout(() => {
      if (state !== "code-wrong") return;
      if (keypadEl) {
        keypadEl.classList.add("hidden");
        keypadEl.setAttribute("aria-hidden", "true");
      }
      state = "playing";
      resetPlayer();
      resetTempleHazards(performance.now());
      sfxHurt();
    }, 650);
  }
}

// Lägg tillbaka alla K-block som rasat, så ett nytt försök börjar likadant
function restoreCrumbles() {
  for (const { c, r } of crumbleCells) grid[r][c] = "crumble";
  activeCrumbles = [];
}

// Mjuk träff: kostar ett liv men flyttar dig INTE tillbaka till start. Används i
// jakt-banor (rullande stenen) så att en orm inte slänger dig hela vägen tillbaka –
// där är det stenen, hålen och de rasande golven som är de riktiga farorna.
function softHit() {
  if (performance.now() < player.invuln) return;
  lives -= 1;
  updateHud();
  if (lives <= 0) { gameOver(); return; }
  player.invuln = performance.now() + INVULN_MS;
  sfxHurt();
}

function hit() {
  if (performance.now() < player.invuln) return;
  die();
}

function gameOver() {
  state = "dead";
  stopMusic();
  sfxGameOver();
  showOverlay("Game Over", `Du fick ${score} poäng. Nu börjar du om från Bana 1!`,
    "Börja om från Bana 1", { menu: true });
}

function win() {
  score += 100;
  updateHud();
  if (currentLevel < LEVELS.length - 1) {
    state = "levelcomplete";
    stopMusic();
    sfxLevel();
    const next = LEVELS[currentLevel + 1].name;
    showOverlay(`⭐ ${LEVELS[currentLevel].name} klar! ⭐`,
      `Poäng: ${score}. Härnäst: ${next}`, "Nästa bana", { menu: true });
  } else {
    state = "won";
    stopMusic();
    sfxWin();
    showOverlay("🏆 Du klarade alla banor! 🏆",
      `Slutpoäng: ${score}. Bra kämpat, riddare!`, "Spela igen", { menu: true, levelSelect: true });
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
  if (levelSelectEl) levelSelectEl.style.display = opts.levelSelect ? "" : "none";
  overlay.classList.remove("hidden");
}
function hideOverlay() {
  overlay.classList.add("hidden");
}

// Bana-väljare i start-menyn: hoppa direkt till valfri bana (snabb provspelning)
let levelSelectEl = null;
function buildLevelSelect() {
  const box = document.querySelector(".overlay-box");
  if (!box) return;
  levelSelectEl = document.createElement("div");
  levelSelectEl.id = "level-select";
  levelSelectEl.style.cssText = "display:none;margin-top:14px;";

  const label = document.createElement("div");
  label.textContent = "Eller hoppa direkt till en bana:";
  label.style.cssText = "margin-bottom:8px;opacity:0.85;font-size:15px;";
  levelSelectEl.appendChild(label);

  const row = document.createElement("div");
  row.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;justify-content:center;";
  LEVELS.forEach((lv, i) => {
    const b = document.createElement("button");
    b.textContent = String(i + 1);
    b.title = lv.name;
    b.style.cssText =
      "min-width:44px;padding:10px 14px;font-size:18px;font-weight:bold;cursor:pointer;" +
      "border-radius:10px;border:2px solid #5fd6ff;background:#1d2330;color:#e8f4ff;";
    b.addEventListener("click", () => { resumeAudio(); score = 0; loadLevel(i); });
    row.appendChild(b);
  });
  levelSelectEl.appendChild(row);
  box.appendChild(levelSelectEl);
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
  if (arenaBoss) updateArenaBoss(now);
  if (roller) updateRoller(now);
  if (evilGuy) updateEvilGuy(now);
  updateTurrets(now);
  updateCrumbles(now);
  updateFireballs(now);
  updateArrows(now);
  if (state !== "playing") return;        // kan ha dött av ett rasande golv

  const pc = playerCenter(now);
  const airborne = player.jumping && player.moving;
  if (!airborne) {
    const onHit = roller ? softHit : hit;   // i jakt-banan kastas man inte tillbaka till start
    for (const sn of snakes) {
      const sc = animPos(sn, now);
      const sx = sc.x + TS / 2, sy = sc.y + TS / 2;
      const dist = Math.hypot(pc.x - sx, pc.y - sy);
      if (dist < TS * 0.55) { onHit(); break; }
    }
    for (const fb of fireballs) {
      if (Math.hypot(pc.x - fb.x, pc.y - fb.y) < TS * 0.5) { onHit(); break; }
    }
    for (const arrow of arrows) {
      if (Math.hypot(pc.x - arrow.x, pc.y - arrow.y) < TS * 0.34) { hit(); break; }
    }
    if (state === "playing" && evilGuy && evilGuyTouchesPlayer()) hit();
  }
  // Rullande stenen krossar dig oavsett osårbarhet eller hopp
  if (roller) {
    const rcenter = rollerCenter(now);
    if (Math.hypot(pc.x - rcenter.x, pc.y - rcenter.y) < TS * 0.7) die();
  }
}

function updateTurrets(now) {
  if (turrets.length === 0) return;

  // K-rutan är en säker plats så spelaren hinner läsa och minnas koden.
  // Befintliga pilar försvinner och fällorna får en ny sekunds väntan när
  // spelaren lämnar rutan.
  if (tileAt(player.col, player.row) === "code-clue") {
    arrows.length = 0;
    for (const turret of turrets) turret.nextAt = now + ARROW_FIRE_MS;
    return;
  }

  const pc = playerCenter(now);
  for (const turret of turrets) {
    if (now < turret.nextAt) continue;
    const x0 = turret.col * TS + TS / 2;
    const y0 = turret.row * TS + TS / 2;
    const dx = pc.x - x0;
    const dy = pc.y - y0;
    const len = Math.hypot(dx, dy) || 1;
    arrows.push({
      x0, y0, x: x0, y: y0,
      vx: dx / len, vy: dy / len,
      born: now,
      sourceCol: turret.col, sourceRow: turret.row,
    });
    turret.nextAt = now + ARROW_FIRE_MS;
    sfxFire();
  }
}

function updateArrows(now) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const arrow = arrows[i];
    const distance = (now - arrow.born) * ARROW_SPEED;
    arrow.x = arrow.x0 + arrow.vx * distance;
    arrow.y = arrow.y0 + arrow.vy * distance;
    const c = Math.floor(arrow.x / TS);
    const r = Math.floor(arrow.y / TS);
    const stillInSourceWall = c === arrow.sourceCol && r === arrow.sourceRow;
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS ||
        (!stillInSourceWall && (tileAt(c, r) === "wall" || tileAt(c, r) === "log"))) {
      arrows.splice(i, 1);
    }
  }
}

// Stenen rullar en ruta var ROLLER_STEP_MS. Den fortsätter rakt fram om den kan,
// annars svänger den åt det håll korridoren öppnar sig (aldrig bakåt).
function updateRoller(now) {
  if (roller.moving) {
    if ((now - roller.moveStart) / roller.moveDur < 1) return;
    roller.moving = false;

    // När stenen precis har rullat ut på ett hål tar den en sekunds paus.
    // Rutans nyckel gör att samma hål bara utlöser pausen en gång per besök.
    const holeKey = `${roller.col},${roller.row}`;
    if (tileAt(roller.col, roller.row) === "hole" && roller.lastPausedHole !== holeKey) {
      roller.lastPausedHole = holeKey;
      roller.nextAt = now + ROLLER_HOLE_PAUSE_MS;
      return;
    }
    if (tileAt(roller.col, roller.row) !== "hole") roller.lastPausedHole = null;
  }
  if (now < roller.nextAt) return;

  const fwd = roller.dir;
  let nd = null;
  if (rollerCanGo(roller.col + fwd.dc, roller.row + fwd.dr)) {
    nd = fwd;
  } else {
    const perps = fwd.dc !== 0
      ? [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }]
      : [{ dc: -1, dr: 0 }, { dc: 1, dr: 0 }];
    for (const p of perps) {
      if (rollerCanGo(roller.col + p.dc, roller.row + p.dr)) { nd = p; break; }
    }
  }
  if (!nd) return;   // återvändsgränd – stenen stannar

  roller.dir = nd;
  roller.spin += 1;
  beginMove(roller, roller.col + nd.dc, roller.row + nd.dr, ROLLER_STEP_MS, now);
  roller.nextAt = now + ROLLER_STEP_MS;
  sfxRoll();
}

// Kluriga K-block: när spelaren landat på ett börjar det rasa, och efter
// CRUMBLE_MS blir det ett hål. Står du kvar när det rasar ramlar du ner.
function updateCrumbles(now) {
  for (let i = activeCrumbles.length - 1; i >= 0; i--) {
    const cb = activeCrumbles[i];
    if (now < cb.dieAt) continue;
    grid[cb.r][cb.c] = "hole";
    activeCrumbles.splice(i, 1);
    sfxCrumble();
    if (player.col === cb.c && player.row === cb.r && !player.jumping) { die(); return; }
  }
}

function nextEvilPatrolDir(guy) {
  while (guy.stepsLeft <= 0) {
    guy.patrolIndex = (guy.patrolIndex + 1) % EVIL_GUY_PATROL.length;
    guy.stepsLeft = EVIL_GUY_PATROL[guy.patrolIndex].steps;
  }
  const part = EVIL_GUY_PATROL[guy.patrolIndex];
  return { dc: part.dc, dr: part.dr };
}

function chooseEvilChaseDir(guy) {
  const options = [];
  const dx = player.col - guy.col;
  const dy = player.row - guy.row;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx !== 0) options.push({ dc: Math.sign(dx), dr: 0 });
    if (dy !== 0) options.push({ dc: 0, dr: Math.sign(dy) });
  } else {
    if (dy !== 0) options.push({ dc: 0, dr: Math.sign(dy) });
    if (dx !== 0) options.push({ dc: Math.sign(dx), dr: 0 });
  }
  options.push(
    { dc: 0, dr: -1 },
    { dc: 1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
  );
  return options.find(d => tileAt(guy.col + d.dc, guy.row + d.dr) !== "wall") || guy.dir;
}

function updateEvilGuy(now) {
  const guy = evilGuy;
  if (guy.moving) {
    if ((now - guy.moveStart) / guy.moveDur < 1) return;
    guy.moving = false;
  }

  tryCollectEvilGuyKey(now);

  if (guy.mode === "pause") {
    if (now < guy.pauseUntil) return;
    guy.mode = "backing";
    guy.nextAt = now;
  }
  if (guy.mode === "stopped") return;
  if (now < guy.nextAt) return;

  let d;
  if (guy.mode === "backing") {
    d = guy.backDir;
  } else if (guy.mode === "chase") {
    d = chooseEvilChaseDir(guy);
  } else {
    d = nextEvilPatrolDir(guy);
  }

  const nc = guy.col + d.dc;
  const nr = guy.row + d.dr;
  if (tileAt(nc, nr) === "wall") {
    guy.nextAt = now + EVIL_GUY_STEP_MS;
    if (guy.mode === "patrol") guy.stepsLeft = 0;
    return;
  }

  guy.dir = d;
  if (guy.mode === "patrol") guy.stepsLeft -= 1;
  else if (guy.mode === "backing") guy.backStepsLeft -= 1;
  beginMove(guy, nc, nr, EVIL_GUY_STEP_MS, now);
  guy.nextAt = now + EVIL_GUY_STEP_MS;
  if (guy.mode === "backing" && guy.backStepsLeft <= 0) {
    guy.mode = "stopped";
  }
}

function evilGuyTouchesPlayer() {
  if (!evilGuy) return false;
  if (evilGuyKey && evilGuy.mode !== "chase") return false;
  if (player.col === evilGuy.col && player.row === evilGuy.row) return true;
  for (let distance = 1; distance <= 2; distance++) {
    const c = evilGuy.col + evilGuy.dir.dc * distance;
    const r = evilGuy.row + evilGuy.dir.dr * distance;
    if (player.col === c && player.row === r) return true;
  }
  return false;
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
  if (dr.lives <= 0) return;
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
  // vänd om den krockar ELLER har vandrat för långt från sin hemruta
  if (blockedForSnake(nc, nr) || strayedTooFar(sn, nc, nr)) {
    sn.dc = -sn.dc; sn.dr = -sn.dr;
    nc = sn.col + sn.dc; nr = sn.row + sn.dr;
    if (blockedForSnake(nc, nr)) return;
  }
  beginMove(sn, nc, nr, SNAKE_MS, now);
}

function strayedTooFar(sn, nc, nr) {
  if (!isFinite(sn.range)) return false;
  return Math.abs(nc - sn.homeCol) > sn.range || Math.abs(nr - sn.homeRow) > sn.range;
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
  if (roller) drawRoller(now);
  for (const fb of fireballs) drawFireball(fb, now);
  for (const turret of turrets) drawTurret(turret, now);
  for (const arrow of arrows) drawArrow(arrow);
  for (const sn of snakes) drawSnake(sn, now);
  if (arenaBoss) drawArenaBoss(now);
  if (evilGuy) drawEvilGuy(now);

  // Koden visas bara när spelaren verkligen har gått fram till K-rutan.
  if (theme === "temple" && state === "playing" &&
      tileAt(player.col, player.row) === "code-clue") drawTempleCode();

  if (theme === "underground") drawVignette();
  if (state === "playing" || state === "won" || state === "levelcomplete" || state === "paused") drawPlayer(now);
}

function drawTile(c, r) {
  const x = c * TS, y = r * TS;
  const t = grid[r][c];
  const castle = theme === "castle";
  const underground = theme === "underground";
  const temple = theme === "temple";
  const arena = theme === "arena";
  const garden = theme === "garden";

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
    if (garden) {
      ctx.fillStyle = "#234d28";
      ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = ((c + r) % 2 === 0) ? "#2f6b35" : "#285f30";
      ctx.fillRect(x + 2, y + 2, TS - 4, TS - 4);
      ctx.fillStyle = "#58a94a";
      ctx.beginPath();
      ctx.arc(x + 9, y + 11, 5, 0, Math.PI * 2);
      ctx.arc(x + 20, y + 7, 5, 0, Math.PI * 2);
      ctx.arc(x + 31, y + 13, 5, 0, Math.PI * 2);
      ctx.arc(x + 13, y + 29, 5, 0, Math.PI * 2);
      ctx.arc(x + 28, y + 28, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#18351e";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4);
    } else if (arena) {
      ctx.fillStyle = "#3d2530";
      ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = ((c + r) % 2 === 0) ? "#563342" : "#4b2c39";
      ctx.fillRect(x + 2, y + 2, TS - 4, TS - 4);
      ctx.strokeStyle = "#291820";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4);
    } else if (temple) {
      ctx.fillStyle = "#6c573b";
      ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = ((c + r) % 2 === 0) ? "#8a704c" : "#7d6545";
      ctx.fillRect(x + 2, y + 2, TS - 4, TS - 4);
      ctx.strokeStyle = "#51412e";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4);
    } else if (castle) {
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
  } else if (garden) {
    ctx.fillStyle = ((c + r) % 2 === 0) ? "#4e8f3d" : "#478438";
  } else if (arena) {
    ctx.fillStyle = ((c + r) % 2 === 0) ? "#9b7958" : "#8d6d50";
  } else if (temple) {
    ctx.fillStyle = ((c + r) % 2 === 0) ? "#b4925f" : "#a88656";
  } else if (castle) {
    ctx.fillStyle = ((c + r) % 2 === 0) ? "#46413a" : "#403b34";
  } else {
    ctx.fillStyle = ((c + r) % 2 === 0) ? "#333a47" : "#2f3540";
  }
  ctx.fillRect(x, y, TS, TS);
  if (garden) {
    ctx.fillStyle = "rgba(230,255,190,0.18)";
    ctx.fillRect(x + 8 + ((c * 7) % 17), y + 7 + ((r * 5) % 19), 3, 8);
    ctx.fillRect(x + 24 + ((r * 4) % 8), y + 22 + ((c * 3) % 9), 2, 7);
    if ((c * 11 + r * 5) % 17 === 0) {
      ctx.fillStyle = (c + r) % 2 === 0 ? "#ffd1dc" : "#ffe36e";
      ctx.beginPath();
      ctx.arc(x + TS / 2, y + TS / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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
  } else if (t === "crumble" || t === "crumbling") {
    // sprucket golvblock som rasar om man dröjer kvar
    const shake = t === "crumbling" ? Math.sin(frameNow / 30) * 1.5 : 0;
    ctx.save();
    ctx.translate(shake, 0);
    ctx.fillStyle = t === "crumbling" ? "#6b5a3a" : "#5a5550";
    roundRect(x + 4, y + 4, TS - 8, TS - 8, 5);
    ctx.fill();
    ctx.strokeStyle = "#2c2722";
    ctx.lineWidth = 2;
    // sprickor
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 6); ctx.lineTo(x + 16, y + 18); ctx.lineTo(x + 12, y + TS - 8);
    ctx.moveTo(x + TS - 8, y + 8); ctx.lineTo(x + 22, y + 20); ctx.lineTo(x + TS - 10, y + TS - 7);
    ctx.stroke();
    ctx.restore();
  } else if (t === "start") {
    ctx.strokeStyle = castle ? "#ffd34d" : "#5fd6ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + TS / 2, y + TS / 2, TS * 0.34, 0, Math.PI * 2);
    ctx.stroke();
  } else if (t === "goal") {
    drawStar(x + TS / 2, y + TS / 2, TS * 0.4, "#ffd34d");
    if (temple || evilGuy) {
      ctx.fillStyle = "#6f4c00";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("M", x + TS / 2, y + TS / 2 + 1);
    }
  } else if (t === "code-clue") {
    ctx.fillStyle = "#275e49";
    roundRect(x + 5, y + 5, TS - 10, TS - 10, 5); ctx.fill();
    ctx.fillStyle = "#b9ffd1";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("K", x + TS / 2, y + TS / 2);
  } else if (t === "code-lock") {
    ctx.fillStyle = codeSolved ? "#397a4c" : "#574b68";
    roundRect(x + 4, y + 4, TS - 8, TS - 8, 5); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 21px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("L", x + TS / 2, y + TS / 2);
  } else if (t === "locked-door") {
    ctx.fillStyle = evilGuyKey ? "#496e45" : "#5b3c2d";
    roundRect(x + 4, y + 4, TS - 8, TS - 8, 5); ctx.fill();
    ctx.strokeStyle = evilGuyKey ? "#94e48d" : "#d1a45b";
    ctx.lineWidth = 2;
    roundRect(x + 4, y + 4, TS - 8, TS - 8, 5); ctx.stroke();
    ctx.fillStyle = "#fff5c8";
    ctx.font = "bold 21px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("L", x + TS / 2, y + TS / 2);
  } else if (t === "teleport") {
    ctx.strokeStyle = "#75e7ff";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x + TS / 2, y + TS / 2, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#d6f8ff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("M", x + TS / 2, y + TS / 2);
  }
}

function drawTempleCode() {
  const c = 4, r = 4;
  const x = c * TS + TS / 2;
  const y = (r + 1) * TS + TS / 2;
  ctx.fillStyle = "rgba(9, 30, 23, 0.94)";
  roundRect(x - 62, y - 13, 124, 26, 5); ctx.fill();
  ctx.strokeStyle = "#75d99c";
  ctx.lineWidth = 2;
  roundRect(x - 62, y - 13, 124, 26, 5); ctx.stroke();
  ctx.fillStyle = "#b9ffd1";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`K: ${TEMPLE_CODE}`, x, y + 1);
}

function drawTurret(turret, now) {
  const x = turret.col * TS + TS / 2;
  const y = turret.row * TS + TS / 2;
  const pc = playerCenter(now);
  const angle = Math.atan2(pc.y - y, pc.x - x);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#342f2b";
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#d2c2a2";
  ctx.fillRect(0, -4, 18, 8);
  ctx.fillStyle = "#8f2f28";
  ctx.beginPath();
  ctx.moveTo(18, -9); ctx.lineTo(28, 0); ctx.lineTo(18, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawArrow(arrow) {
  const angle = Math.atan2(arrow.vy, arrow.vx);
  ctx.save();
  ctx.translate(arrow.x, arrow.y);
  ctx.rotate(angle);
  ctx.strokeStyle = "#f1dfb4";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(10, 0); ctx.stroke();
  ctx.fillStyle = "#c8cfd5";
  ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -5); ctx.lineTo(5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
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
  if (dragon.lives <= 0) return;
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

// Stor rullande sten – fyller nästan hela rutan och snurrar medan den rullar.
function drawRoller(now) {
  const c = rollerCenter(now);
  const rad = TS * 0.46;
  // dammoln bakom
  ctx.fillStyle = "rgba(120,110,95,0.25)";
  ctx.beginPath();
  ctx.arc(c.x - roller.dir.dc * 10, c.y - roller.dir.dr * 10, rad * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // själva stenen
  ctx.fillStyle = "#6f6a64";
  ctx.beginPath(); ctx.arc(c.x, c.y, rad, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#827d75";
  ctx.beginPath(); ctx.arc(c.x - rad * 0.2, c.y - rad * 0.2, rad * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#454039"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(c.x, c.y, rad, 0, Math.PI * 2); ctx.stroke();

  // snurrande sprickor så man ser att den rullar
  const spin = roller.spin + (roller.moving ? (now - roller.moveStart) / roller.moveDur : 0);
  const ang = spin * (roller.dir.dc !== 0 ? roller.dir.dc : roller.dir.dr) * 1.2;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(ang);
  ctx.strokeStyle = "#3f3a34"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-rad * 0.5, -rad * 0.3); ctx.lineTo(rad * 0.2, rad * 0.1); ctx.lineTo(rad * 0.6, -rad * 0.2);
  ctx.moveTo(-rad * 0.2, rad * 0.5); ctx.lineTo(rad * 0.1, -rad * 0.1);
  ctx.stroke();
  ctx.restore();
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

function drawArenaBoss(now) {
  if (!arenaBoss || arenaBoss.lives <= 0) return;
  const cx = arenaBoss.col * TS + TS / 2;
  const cy = arenaBoss.row * TS + TS / 2;

  // Den röda attackytan visar alla åtta rutor som bossen kan träffa.
  if (now < arenaBoss.attackUntil) {
    const pulse = 0.22 + 0.1 * Math.sin(now / 35);
    ctx.fillStyle = `rgba(255,55,45,${pulse})`;
    ctx.fillRect(cx - TS * 1.5, cy - TS * 1.5, TS * 3, TS * 3);
    ctx.strokeStyle = "rgba(255,120,80,0.9)";
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - TS * 1.5, cy - TS * 1.5, TS * 3, TS * 3);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = now < arenaBoss.hurtUntil ? "#fff" : "#a92727";
  roundRect(-16, -15, 32, 31, 8); ctx.fill();
  ctx.fillStyle = "#541212";
  roundRect(-12, -11, 24, 22, 6); ctx.fill();
  ctx.fillStyle = "#d9b35e";
  ctx.beginPath();
  ctx.moveTo(-13, -12); ctx.lineTo(-9, -24); ctx.lineTo(-3, -13);
  ctx.moveTo(13, -12); ctx.lineTo(9, -24); ctx.lineTo(3, -13);
  ctx.fill();
  ctx.strokeStyle = "#ffdf7a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-7, -6); ctx.lineTo(7, 7);
  ctx.moveTo(7, -6); ctx.lineTo(-7, 7);
  ctx.stroke();
  ctx.restore();

}

function drawEvilGuy(now) {
  const p = animPos(evilGuy, now);
  const cx = p.x + TS / 2;
  const cy = p.y + TS / 2;

  // Visa de två farliga rutorna framför honom.
  if (evilGuy.mode !== "stopped") {
    ctx.fillStyle = "rgba(255,45,45,0.18)";
    for (let i = 1; i <= 2; i++) {
      ctx.fillRect(
        (evilGuy.col + evilGuy.dir.dc * i) * TS + 4,
        (evilGuy.row + evilGuy.dir.dr * i) * TS + 4,
        TS - 8,
        TS - 8,
      );
    }
  }

  ctx.save();
  ctx.translate(cx, cy);
  let ang = 0;
  if (evilGuy.dir.dc === 1) ang = Math.PI / 2;
  else if (evilGuy.dir.dc === -1) ang = -Math.PI / 2;
  else if (evilGuy.dir.dr === 1) ang = Math.PI;
  ctx.rotate(ang);

  // Elak trädgårdsman: grön jacka, brun overall, hatt och ett litet verktyg.
  ctx.strokeStyle = "#5b3518";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(13, 8);
  ctx.lineTo(18, -12);
  ctx.stroke();
  ctx.strokeStyle = "#b9c9a0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, -13); ctx.lineTo(21, -15);
  ctx.moveTo(16, -10); ctx.lineTo(21, -10);
  ctx.moveTo(15, -7); ctx.lineTo(20, -5);
  ctx.stroke();

  ctx.fillStyle = evilGuyKey ? "#6d7058" : "#2f6b28";
  roundRect(-13, -10, 26, 24, 7); ctx.fill();
  ctx.fillStyle = "#6b3f1d";
  roundRect(-7, -5, 14, 17, 4); ctx.fill();
  ctx.strokeStyle = "#203f1c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -7); ctx.lineTo(-2, 4);
  ctx.moveTo(6, -7); ctx.lineTo(2, 4);
  ctx.stroke();
  ctx.fillStyle = "#f0d08b";
  ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4c6f28";
  roundRect(-10, -23, 20, 6, 3); ctx.fill();
  ctx.fillStyle = "#31501e";
  roundRect(-7, -29, 14, 10, 4); ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(-3, -13, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -13, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(4, -8); ctx.stroke();

  if (!evilGuyKey) {
    ctx.fillStyle = "#c92727";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", 0, 4);
  } else {
    ctx.fillStyle = "#ffd34d";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓", 0, 2);
  }
  ctx.restore();

  if (evilGuyKey) {
    ctx.fillStyle = "#ffd34d";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("🔑", 8, 42);
  }
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

  if (theme === "castle" || theme === "arena" || theme === "underground") drawKnightBody();
  else drawGubbeBody();

  ctx.restore();

  if ((dragon || arenaBoss) && now < swordSwingUntil) {
    ctx.strokeStyle = "#fff0a8";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy - lift, TS * 0.62, -Math.PI * 0.85, Math.PI * 0.55);
    ctx.stroke();
  }
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

// Test-/tillgänglighetsvy: en kort textbeskrivning av det som är relevant just nu.
window.render_game_to_text = () => JSON.stringify({
  coordinates: "rutnät, (0,0) uppe till vänster; kolumn ökar åt höger, rad nedåt",
  state,
  level: currentLevel + 1,
  player: player ? {
    col: player.col,
    row: player.row,
    moving: player.moving,
    jumping: player.jumping,
    jumpQueued: player.jumpQueued,
  } : null,
  lives,
  score,
  codeSolved,
  enteredCode: state === "code" ? enteredCode : undefined,
  snakes: snakes.map(sn => ({ col: sn.col, row: sn.row })),
  turrets: turrets.map(t => ({ col: t.col, row: t.row })),
  arrows: arrows.map(a => ({ x: Math.round(a.x), y: Math.round(a.y) })),
  evilGuy: evilGuy ? {
    col: evilGuy.col,
    row: evilGuy.row,
    dir: evilGuy.dir,
    mode: evilGuy.mode,
    key: evilGuyKey,
    dangerous: [1, 2].map(distance => ({
      col: evilGuy.col + evilGuy.dir.dc * distance,
      row: evilGuy.row + evilGuy.dir.dr * distance,
    })),
  } : null,
  lockedDoor: (() => {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === "locked-door") return { col: c, row: r, open: evilGuyKey };
    }
    return null;
  })(),
  boss: arenaBoss ? {
    col: arenaBoss.col,
    row: arenaBoss.row,
    lives: arenaBoss.lives,
    attacksEveryMs: BOSS_ATTACK_MS,
  } : null,
  dragon: dragon ? {
    col: dragon.col,
    row: dragon.row,
    lives: dragon.lives,
  } : null,
  sword: (dragon || arenaBoss) ? { key: "A", range: "en ruta inklusive diagonalt" } : undefined,
  jump: roller && player ? {
    snakeAhead: snakeAheadDistance(player.dir),
    landsAfterNearbySnake: true,
    runningJump: true,
  } : undefined,
  roller: roller ? { col: roller.col, row: roller.row, moving: roller.moving } : null,
  stepMs: roller ? { player: playerStepMs, roller: ROLLER_STEP_MS } : undefined,
  rollerHeadstartMs: roller ? ROLLER_HEADSTART : undefined,
  rollerHolePauseMs: roller ? ROLLER_HOLE_PAUSE_MS : undefined,
  rollerHolePauseRemainingMs: roller && !roller.moving && tileAt(roller.col, roller.row) === "hole"
    ? Math.max(0, Math.round(roller.nextAt - performance.now())) : undefined,
  goal: (() => {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === "goal") return { col: c, row: r };
    }
    return null;
  })(),
});

window.advanceTime = (ms) => {
  const start = frameNow || performance.now();
  const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
  for (let i = 1; i <= steps; i++) update(start + (ms * i) / steps);
  draw(start + ms);
};

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
buildLevelSelect();

// Direktlänk: ?bana=4 hoppar rakt in i bana 4 (bra för snabb provspelning)
const banaParam = parseInt(new URLSearchParams(location.search).get("bana"), 10);
if (banaParam >= 1 && banaParam <= LEVELS.length) {
  score = 0;
  loadLevel(banaParam - 1);
} else {
  showOverlay("Pixelgubben", "", "Starta", { hint: true, menu: true, levelSelect: true });
}
requestAnimationFrame(loop);
