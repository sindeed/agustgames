// Wilder: The Big City — storstadsversionen.
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  if (!canvas) return;
  const homeButton = document.getElementById('home-btn');
  const gameFrame = canvas.closest('.game-frame') || canvas;
  const ctx = canvas.getContext('2d', { alpha: false });
  const TAU = Math.PI * 2;
  const FOV = Math.PI / 3;
  // Den gamla kartan var 48 × 38 = 1 824 rutor. 152 × 120 = 18 240,
  // alltså exakt tio gånger så stor yta.
  const MAP_W = 152;
  const MAP_H = 120;
  const CITY_AREA_SCALE = 10;
  const HOUSE_AREA_SCALE = 5;
  const ROLE_TOTALS = Object.freeze({ polis: 4, tjuv: 5, människa: 10 });
  const TOTAL_PEOPLE = Object.values(ROLE_TOTALS).reduce((sum, count) => sum + count, 0);
  const HAND_DAMAGE = 0.5;
  const BATON_DAMAGE = 1;
  const FACE_OFF_DELAY = 1;
  const ATTACK_INTERVAL = Object.freeze({ polis: 1, tjuv: 0.5, människa: 0.75 });
  const BOT_MOVE_SPEED = Object.freeze({
    polis: Object.freeze({ foot: 1.5, car: 6, helicopter: 6.6 }),
    tjuv: Object.freeze({ foot: 1.5, car: 6, helicopter: 6.6 }),
    människa: Object.freeze({ foot: 0.72, car: 4.7, helicopter: 5.6 }),
  });
  const ITEM_PRICE = Object.freeze({ baton: 10, car: 20, helicopter: 30 });
  const map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0));
  const doors = new Map();
  const structures = [];
  const pathPrevious = new Int32Array(MAP_W * MAP_H);
  const pathVisited = new Int32Array(MAP_W * MAP_H);
  const pathQueue = new Int32Array(MAP_W * MAP_H);
  let pathGeneration = 0;
  const keys = Object.create(null);
  let manualTime = false;
  let lookPointer = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let lookDragged = false;
  let soundOn = true;
  let audioContext = null;
  let seed = 73421;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const botMoveSpeed = (bot, movement = 'foot') => BOT_MOVE_SPEED[bot.role]?.[movement] ?? BOT_MOVE_SPEED.människa[movement];
  const SAFE_CODES = ['2413', '8052', '7316', '4290', '1538', '6742', '3905', '8174', '5621', '9463'];
  const PLACES = {
    police: { x: 8, y: 86, w: 27, h: 20, doorX: 21 },
    mall: { x: 63, y: 88, w: 27, h: 18, doorX: 76 },
    hideout: { x: 117, y: 86, w: 27, h: 20, doorX: 130 },
    boss: { x: 21.5, y: 90.5 },
    thiefRobot: { x: 130.5, y: 92.5 },
    bossWallY: 94,
    codeNote: { x: 11.5, y: 98.5 },
    jailKey: { x: 15.5, y: 98.5 },
    jailRelease: { x: 31.5, y: 102.5 },
    mallCounter: { x: 76.5, y: 96.5 },
    policeSpawn: { x: 21.5, y: 112.5 },
    thiefSpawn: { x: 130.5, y: 112.5 },
  };
  const PLAYER_HOME = Object.freeze({ house: 1, id: 'house-1', x: 10.5, y: 8.5, angle: Math.PI });
  const HORIZONTAL_ROADS = [{ center: 27, half: 6 }, { center: 72, half: 7 }, { center: 112, half: 6 }];
  const VERTICAL_ROADS = [{ center: 27, half: 5 }, { center: 56, half: 5 }, { center: 85, half: 5 }, { center: 114, half: 5 }];

  const state = {
    mode: 'role-select',
    time: 0,
    message: 'Välj vem du vill vara i Wilder',
    messageUntil: Infinity,
    player: null,
    bots: [],
    roleCounts: { ...ROLE_TOTALS },
    shopOpen: false,
    mallVisits: 0,
    lastBuildingId: null,
    codesOpen: false,
    safes: [],
    vehicles: [],
    stolen: 0,
    jailedThieves: 0,
    thiefCodesKnown: false,
    jailKeyHolder: null,
    lastCapture: null,
    lastRescue: null,
    events: [],
    mallReceipt: '',
    boss: { x: PLACES.boss.x, y: PLACES.boss.y, health: 20, maxHealth: 20, defeated: false, cooldown: 0 },
    thiefRobot: {
      id: 'tjuvrobot', role: 'robot', x: PLACES.thiefRobot.x, y: PLACES.thiefRobot.y,
      health: 20, maxHealth: 20, defeated: false, cooldown: 0,
    },
    lastHouseTheft: null,
    lastHomeTeleport: null,
    jailCells: [[11.5, 102.5], [15.5, 102.5], [19.5, 102.5], [23.5, 102.5], [27.5, 102.5]]
      .map(([x, y], index) => ({ index, x, y, occupant: null })),
    cameraBob: 0,
  };

  function addBuilding(id, label, type, x, y, w, h, doorX) {
    const doorY = y + h - 1;
    const building = { id, label, type, x, y, w, h, door: { x: doorX, y: doorY }, center: { x: x + w / 2, y: y + h / 2 } };
    structures.push(building);
    const wallCode = { house: 2, police: 4, shop: 5, hideout: 6 }[type] || 2;
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1) map[yy][xx] = wallCode;
      }
    }
    map[doorY][doorX] = 3;
    doors.set(`${doorX},${doorY}`, { id: `${id}-door`, buildingId: id, buildingType: type, x: doorX, y: doorY, open: false, label });
    return building;
  }

  for (let x = 0; x < MAP_W; x++) map[0][x] = map[MAP_H - 1][x] = 1;
  for (let y = 0; y < MAP_H; y++) map[y][0] = map[y][MAP_W - 1] = 1;

  const houseSpecs = [
    [1, 5, 5], [2, 34, 5], [3, 63, 5], [4, 92, 5], [5, 121, 5],
    [6, 5, 38], [7, 34, 38], [8, 63, 38], [9, 92, 38], [10, 121, 38],
  ];
  // 15 × 12 = 180 rutor per vanligt hus; de gamla var 6 × 6 = 36.
  houseSpecs.forEach(([n, x, y]) => addBuilding(`house-${n}`, `Hus ${n}`, 'house', x, y, 15, 12, x + 7));
  const policeStation = addBuilding('police', 'Polishuset', 'police', PLACES.police.x, PLACES.police.y, PLACES.police.w, PLACES.police.h, PLACES.police.doorX);
  const shop = addBuilding('shop', 'Wilder-gallerian', 'shop', PLACES.mall.x, PLACES.mall.y, PLACES.mall.w, PLACES.mall.h, PLACES.mall.doorX);
  const hideout = addBuilding('hideout', 'Tjuvhuset', 'hideout', PLACES.hideout.x, PLACES.hideout.y, PLACES.hideout.w, PLACES.hideout.h, PLACES.hideout.doorX);
  for (let x = policeStation.x + 1; x < policeStation.x + policeStation.w - 1; x++) map[PLACES.bossWallY][x] = 4;
  map[PLACES.bossWallY][PLACES.police.doorX] = 3;
  doors.set(`${PLACES.police.doorX},${PLACES.bossWallY}`, {
    id: 'boss-door', buildingId: 'police', buildingType: 'police', x: PLACES.police.doorX, y: PLACES.bossWallY,
    open: false, label: 'Bossrummet',
  });
  // De fem gånger större villorna har två riktiga rum i stället för ett tomt skal.
  for (const house of structures.filter(building => building.type === 'house')) {
    const dividerX = house.x + 7;
    for (let y = house.y + 1; y < house.y + house.h - 1; y++) {
      if (y !== house.y + 6 && y !== house.y + house.h - 2) map[y][dividerX] = 2;
    }
  }
  state.safes = structures.filter(s => s.type === 'house').map((s, i) => ({
    id: `safe-${i + 1}`, house: i + 1, ownerId: `människa-${i + 1}`,
    x: s.x + 3.5, y: s.y + 3.5, code: SAFE_CODES[i], money: 50, opened: false,
  }));
  state.vehicles = [
    { id: 'police-car', type: 'car', label: 'polisbil', x: 13.5, y: 112.5, health: 10, maxHealth: 10, owner: 'polis', driverId: null, reservedBy: null, altitude: 0, destroyed: false },
    { id: 'police-heli', type: 'helicopter', label: 'polishelikopter', x: 31.5, y: 112.5, health: 10, maxHealth: 10, owner: 'polis', driverId: null, reservedBy: null, altitude: 0, destroyed: false },
    { id: 'shop-car', type: 'car', label: 'bil', x: 68.5, y: 112.5, health: 10, maxHealth: 10, owner: null, driverId: null, reservedBy: null, altitude: 0, destroyed: false },
    { id: 'shop-heli', type: 'helicopter', label: 'helikopter', x: 84.5, y: 112.5, health: 10, maxHealth: 10, owner: null, driverId: null, reservedBy: null, altitude: 0, destroyed: false },
  ];
  const furniture = [];
  for (const house of structures.filter(building => building.type === 'house')) {
    furniture.push(
      { kind: 'furniture', style: 'sofa', x: house.x + 10.5, y: house.y + 3.2, label: 'SOFFA' },
      { kind: 'furniture', style: 'table', x: house.x + 10.5, y: house.y + 8.2, label: 'BORD' },
      { kind: 'furniture', style: 'bed', x: house.x + 3.5, y: house.y + 8.2, label: 'SÄNG' },
    );
  }
  furniture.push(
    { kind: 'furniture', style: 'desk', x: 26.5, y: 98.5, label: 'POLISDISK' },
    { kind: 'furniture', style: 'counter', x: PLACES.mallCounter.x, y: PLACES.mallCounter.y, label: 'GALLERIA' },
    { kind: 'furniture', style: 'crate', x: 123.5, y: 94.5, label: 'LÅDOR' },
    { kind: 'furniture', style: 'sofa', x: 136.5, y: 97.5, label: 'SOFFA' },
  );
  const cityProps = [];
  [8, 19, 38, 48, 67, 77, 96, 106, 125, 135, 146].forEach((x, i) => {
    cityProps.push({ kind: 'tree', x, y: i % 2 ? 57.5 : 58.5 });
    cityProps.push({ kind: 'tree', x: x + .7, y: i % 2 ? 81.5 : 82.5 });
  });
  [26, 55, 84, 113].forEach(x => {
    cityProps.push({ kind: 'lamp', x, y: 20.5 }, { kind: 'lamp', x, y: 34.5 }, { kind: 'lamp', x, y: 63.5 }, { kind: 'lamp', x, y: 80.5 });
  });
  cityProps.push(
    { kind: 'bench', x: 58.5, y: 59.5 }, { kind: 'bench', x: 92.5, y: 87.5 },
    { kind: 'hydrant', x: 36.5, y: 31.5 }, { kind: 'hydrant', x: 115.5, y: 75.5 },
  );
  const groundZones = new Uint8Array(MAP_W * MAP_H);
  const surfaceBuildingCode = { house: 3, police: 4, shop: 5, hideout: 6 };
  const distanceToRect = (px, py, rect) => {
    const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w - 1));
    const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h - 1));
    return Math.hypot(dx, dy);
  };
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const px = x + .5, py = y + .5, building = currentBuildingAt(px, py);
      let zone = building ? surfaceBuildingCode[building.type] : 0;
      if (!building) {
        const road = HORIZONTAL_ROADS.some(r => Math.abs(py - r.center) <= r.half)
          || VERTICAL_ROADS.some(r => Math.abs(px - r.center) <= r.half);
        const sidewalk = structures.some(rect => distanceToRect(px, py, rect) <= 2.4);
        zone = road ? 1 : sidewalk ? 2 : 0;
      }
      groundZones[y * MAP_W + x] = zone;
    }
  }
  const minimapBase = document.createElement('canvas');
  minimapBase.width = MAP_W; minimapBase.height = MAP_H;
  const minimapCtx = minimapBase.getContext('2d', { alpha: false });
  const minimapColors = { 0: '#3d5550', 1: '#82909a', 2: '#c7ab7f', 3: '#d89b47', 4: '#397ab4', 5: '#d5a42c', 6: '#a34d55' };
  for (let yy = 0; yy < MAP_H; yy++) {
    for (let xx = 0; xx < MAP_W; xx++) {
      minimapCtx.fillStyle = minimapColors[map[yy][xx]] || '#aab4b9';
      minimapCtx.fillRect(xx, yy, 1, 1);
    }
  }
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 256; floorCanvas.height = 160;
  const floorCtx = floorCanvas.getContext('2d', { alpha: false });
  const floorPixels = floorCtx.createImageData(floorCanvas.width, floorCanvas.height);
  const floorRayRelative = new Float32Array(floorCanvas.width);
  const floorRayCos = new Float32Array(floorCanvas.width);
  for (let x = 0; x < floorCanvas.width; x++) {
    floorRayRelative[x] = Math.atan((x + .5 - floorCanvas.width / 2) / (floorCanvas.width / 2) * Math.tan(FOV / 2));
    floorRayCos[x] = Math.cos(floorRayRelative[x]);
  }

  function cellAt(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return 1;
    const cell = map[iy][ix];
    if (cell === 3 && doors.get(`${ix},${iy}`)?.open) return 0;
    return cell;
  }

  function canStand(x, y, radius = 0.23, ignoreWalls = false) {
    if (ignoreWalls) return x > 0.3 && y > 0.3 && x < MAP_W - 0.3 && y < MAP_H - 0.3;
    return !cellAt(x - radius, y - radius) && !cellAt(x + radius, y - radius) && !cellAt(x - radius, y + radius) && !cellAt(x + radius, y + radius);
  }

  function currentBuildingAt(x, y) {
    return structures.find(s => x > s.x && x < s.x + s.w - 1 && y > s.y && y < s.y + s.h - 1) || null;
  }

  function allThievesJailed() {
    return state.jailedThieves >= ROLE_TOTALS.tjuv;
  }

  function canEnterBuilding(person, building) {
    if (!person || !building) return true;
    return !(person.role === 'polis' && building.type === 'hideout' && !allThievesJailed());
  }

  function canPersonStand(person, x, y, radius = 0.23, ignoreWalls = false) {
    if (!ignoreWalls && !canEnterBuilding(person, currentBuildingAt(x, y))) return false;
    return canStand(x, y, radius, ignoreWalls);
  }

  function playTone(frequency = 440, duration = 0.08, type = 'sine') {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* Ljud är en bonus; spelet ska fungera även utan Web Audio. */ }
  }

  function showMessage(text, seconds = 3) {
    state.message = text;
    state.messageUntil = state.time + seconds;
  }

  function recordEvent(type, details = {}) {
    state.events.push({ time: +state.time.toFixed(2), type, ...details });
    if (state.events.length > 36) state.events.splice(0, state.events.length - 36);
  }

  function stealHouseSafe(thief, safe) {
    if (!thief || thief.role !== 'tjuv' || !safe || safe.opened) return null;
    safe.opened = true;
    if ('safeTargetId' in thief) thief.safeTargetId = null;
    thief.money += safe.money;
    state.stolen += safe.money;
    const theft = {
      time: +state.time.toFixed(2),
      thief: thief.id,
      homeowner: safe.ownerId,
      house: safe.house,
      money: safe.money,
    };
    state.lastHouseTheft = theft;
    recordEvent('safe-opened', theft);
    checkWin();
    return theft;
  }

  function chooseRole(role) {
    const starts = {
      polis: { x: PLACES.policeSpawn.x, y: PLACES.policeSpawn.y, angle: 0, money: 10, baton: true, car: true, helicopter: true },
      tjuv: { x: PLACES.thiefSpawn.x, y: PLACES.thiefSpawn.y, angle: Math.PI, money: 10, baton: false, car: false, helicopter: false },
      människa: { x: PLAYER_HOME.x, y: PLAYER_HOME.y, angle: PLAYER_HOME.angle, money: 20, baton: false, car: false, helicopter: false },
    };
    const s = starts[role];
    state.player = {
      id: `${role}-1`, role, x: s.x, y: s.y, angle: s.angle, health: 3, maxHealth: 3, money: s.money,
      captures: 0,
      inventory: { baton: s.baton, car: s.car, helicopter: s.helicopter, codes: role === 'polis', jailKey: false },
      vehicle: null, vehicleId: null, altitude: 0, pitch: 0, attackCooldown: 0, attackSwingUntil: 0,
      unconsciousUntil: 0, jailed: false, jailCell: null,
    };
    state.mode = 'playing';
    state.messageUntil = 0;
    makeBots(role);
    showMessage(role === 'polis' ? 'Du är polis: fånga fem tjuvar och besegra tjuvroboten!' : role === 'tjuv' ? 'Du är tjuv: hitta koderna och stjäl 500 pengar!' : 'Du är Människa 1. Hus 1 är ditt hem och du vaktar kassaskåpet!', 6);
    canvas.focus();
  }

  function makeBots(playerRole) {
    const totals = { ...ROLE_TOTALS };
    totals[playerRole]--;
    state.bots = [];
    const spawns = {
      polis: [[21, 112], [12, 112], [16, 112], [27, 112], [32, 112]],
      tjuv: [[130, 112], [120, 112], [125, 112], [135, 112], [140, 112]],
      människa: [[12, 25], [41, 25], [70, 25], [99, 25], [128, 25], [12, 65], [41, 65], [70, 65], [99, 65], [128, 65]],
    };
    Object.entries(totals).forEach(([role, count]) => {
      const roleSpawns = playerRole === role ? spawns[role].slice(1) : spawns[role];
      for (let i = 0; i < count; i++) {
        const p = roleSpawns[i];
        const number = playerRole === role ? i + 2 : i + 1;
        state.bots.push({
          id: `${role}-${number}`,
          role,
          x: p[0] + 0.3,
          y: p[1] + 0.3,
          angle: random() * TAU,
          health: 3,
          maxHealth: 3,
          money: role === 'människa' ? 20 : 10,
          captures: 0,
          inventory: { baton: role === 'polis', car: role === 'polis', helicopter: role === 'polis', codes: role === 'polis', jailKey: false },
          preferredVehicle: role === 'människa' ? 'car' : role === 'tjuv' ? (number % 2 ? 'car' : 'helicopter') : (number % 2 ? 'helicopter' : 'car'),
          vehicle: null,
          vehicleId: null,
          altitude: 0,
          pendingVehicleId: null,
          vehicleUseUntil: 0,
          jailed: false,
          jailCell: null,
          unconsciousUntil: 0,
          cooldown: random(),
          combatTargetId: null,
          faceOffStartedAt: null,
          nextMeleeAt: Infinity,
          lastAttackAt: null,
          lastDamage: null,
          safeTargetId: null,
          targetX: p[0],
          targetY: p[1],
          goal: 'vandrar',
          path: [],
          pathTimer: 0,
        });
      }
    });
  }

  function castRay(angle) {
    const p = state.player;
    const dirX = Math.cos(angle), dirY = Math.sin(angle);
    let mapX = Math.floor(p.x), mapY = Math.floor(p.y);
    const deltaX = Math.abs(1 / (dirX || 1e-9));
    const deltaY = Math.abs(1 / (dirY || 1e-9));
    const stepX = dirX < 0 ? -1 : 1, stepY = dirY < 0 ? -1 : 1;
    let sideX = dirX < 0 ? (p.x - mapX) * deltaX : (mapX + 1 - p.x) * deltaX;
    let sideY = dirY < 0 ? (p.y - mapY) * deltaY : (mapY + 1 - p.y) * deltaY;
    let side = 0, cell = 0, guard = 0;
    while (!cell && guard++ < MAP_W + MAP_H + 12) {
      if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
      else { sideY += deltaY; mapY += stepY; side = 1; }
      cell = cellAt(mapX + 0.01, mapY + 0.01);
    }
    const rawDistance = side === 0 ? sideX - deltaX : sideY - deltaY;
    const hitX = p.x + dirX * rawDistance, hitY = p.y + dirY * rawDistance;
    const texture = side === 0 ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);
    return { distance: Math.max(0.001, rawDistance), side, cell, mapX, mapY, texture };
  }

  function drawRoleSelect() {
    const w = canvas.width, h = canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8fd4ff'); g.addColorStop(0.55, '#d9eff8'); g.addColorStop(0.56, '#5d744b'); g.addColorStop(1, '#273a2c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#15283a'; ctx.fillRect(0, h * 0.64, w, h * 0.36);
    for (let i = 0; i < 15; i++) {
      const x = i * w / 14 - 30, bh = 55 + (i * 37 % 110);
      ctx.fillStyle = i % 2 ? '#44596b' : '#364b5d'; ctx.fillRect(x, h * 0.64 - bh, 76, bh);
      ctx.fillStyle = '#ffd36b'; for (let wy = h * 0.64 - bh + 14; wy < h * 0.61; wy += 25) ctx.fillRect(x + 12, wy, 8, 10);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(h * 0.085)}px system-ui`; ctx.fillText('WILDER', w / 2, h * 0.17);
    ctx.font = `700 ${Math.round(h * 0.033)}px system-ui`; ctx.fillStyle = '#bce6ff'; ctx.fillText('THE BIG CITY', w / 2, h * 0.225);
    ctx.font = `600 ${Math.round(h * 0.026)}px system-ui`; ctx.fillStyle = '#fff'; ctx.fillText('Vem vill du vara?', w / 2, h * 0.31);
    const roles = [
      { role: 'polis', title: 'POLIS', count: '4 poliser', color: '#2f79d3', key: '1', note: 'Bil, helikopter och klubba' },
      { role: 'tjuv', title: 'TJUV', count: '5 tjuvar', color: '#a73c47', key: '2', note: 'Stjäl 500 pengar' },
      { role: 'människa', title: 'MÄNNISKA', count: '10 människor', color: '#36966a', key: '3', note: 'Hus 1 blir ditt hem' },
    ];
    state.roleButtons = [];
    roles.forEach((r, i) => {
      const bw = w * 0.25, bh = h * 0.28, x = w * (0.09 + i * 0.285), y = h * 0.38;
      state.roleButtons.push({ role: r.role, x, y, w: bw, h: bh });
      ctx.fillStyle = 'rgba(5,15,24,.72)'; ctx.fillRect(x + 6, y + 9, bw, bh);
      ctx.fillStyle = r.color; ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(x, y, bw, bh * .35);
      ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(h * .038)}px system-ui`; ctx.fillText(r.title, x + bw / 2, y + bh * .28);
      ctx.font = `700 ${Math.round(h * .024)}px system-ui`; ctx.fillText(r.count, x + bw / 2, y + bh * .49);
      ctx.font = `500 ${Math.round(h * .017)}px system-ui`; ctx.fillText(r.note, x + bw / 2, y + bh * .67);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + bw * .39, y + bh * .78, bw * .22, bh * .16);
      ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(h * .025)}px system-ui`; ctx.fillText(r.key, x + bw / 2, y + bh * .9);
    });
    ctx.font = `500 ${Math.round(h * .018)}px system-ui`; ctx.fillStyle = '#d8edf7'; ctx.fillText('Klicka på en roll eller tryck 1, 2 eller 3', w / 2, h * .75);
  }

  function drawOutdoorSky(horizon) {
    const w = canvas.width, h = canvas.height, p = state.player;
    const sunRel = angleDiff(-.85, p.angle);
    if (Math.abs(sunRel) < FOV * .8) {
      const sx = w * (.5 + sunRel / FOV), sy = Math.max(42, horizon * .26);
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 58);
      glow.addColorStop(0, 'rgba(255,250,199,.95)'); glow.addColorStop(.22, 'rgba(255,229,118,.7)'); glow.addColorStop(1, 'rgba(255,229,118,0)');
      ctx.fillStyle = glow; ctx.fillRect(sx - 62, sy - 62, 124, 124);
      ctx.fillStyle = '#fff2ad'; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, TAU); ctx.fill();
    }
    const cloudAngles = [-2.7, -1.6, -.25, .75, 1.8, 2.75];
    cloudAngles.forEach((cloudAngle, index) => {
      const rel = angleDiff(cloudAngle + state.time * .003, p.angle);
      if (Math.abs(rel) > FOV * .75) return;
      const x = w * (.5 + rel / FOV), y = 55 + (index % 3) * 38;
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.beginPath(); ctx.ellipse(x, y, 48, 13, 0, 0, TAU); ctx.ellipse(x - 23, y - 7, 25, 15, 0, 0, TAU); ctx.ellipse(x + 17, y - 9, 30, 18, 0, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = 'rgba(38,61,76,.38)';
    for (let i = 0; i < 24; i++) {
      const bw = 28 + (i * 17 % 37), bh = 24 + (i * 41 % 72), x = i * w / 23 - 25;
      ctx.fillRect(x, horizon - bh, bw, bh);
      if (bh > 55) { ctx.fillStyle = 'rgba(241,205,105,.35)'; ctx.fillRect(x + 8, horizon - bh + 14, 5, 8); ctx.fillStyle = 'rgba(38,61,76,.38)'; }
    }
  }

  function groundColorAt(wx, wy) {
    const ix = Math.floor(wx), iy = Math.floor(wy);
    if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return 0x587252;
    const zone = groundZones[iy * MAP_W + ix];
    const grain = ((ix * 37 + iy * 67) & 3);
    if (zone === 1) {
      const hRoad = HORIZONTAL_ROADS.find(r => Math.abs(wy - r.center) <= r.half);
      const vRoad = VERTICAL_ROADS.find(r => Math.abs(wx - r.center) <= r.half);
      const crosswalk = hRoad && vRoad && ((Math.floor(wx * 1.4) + Math.floor(wy * 1.4)) % 5 < 2);
      const hLine = hRoad && Math.abs(wy - hRoad.center) < .18 && Math.floor(wx / 3.5) % 2 === 0;
      const vLine = vRoad && Math.abs(wx - vRoad.center) < .18 && Math.floor(wy / 3.5) % 2 === 0;
      if (crosswalk) return 0xd9dee0;
      if (hLine || vLine) return 0xe2bd49;
      return [0x41484c, 0x454c50, 0x3e4549, 0x484f53][grain];
    }
    if (zone === 2) return grain % 2 ? 0xaeb3b0 : 0xb8bcb9;
    if (zone === 3) return ((ix + iy) & 1) ? 0x957553 : 0xa17f59;
    if (zone === 4) return ((ix + iy) & 1) ? 0x65737b : 0x707e86;
    if (zone === 5) return ((ix + iy) & 1) ? 0x9b8f72 : 0xa99d7f;
    if (zone === 6) return ((ix + iy) & 1) ? 0x4e5553 : 0x59615e;
    return [0x5f8055, 0x66875a, 0x58794e, 0x6a8c5d][grain];
  }

  function drawGround(horizon, currentBuilding) {
    const w = canvas.width, h = canvas.height, p = state.player;
    const lowW = floorCanvas.width, lowH = floorCanvas.height;
    const lowHorizon = clamp(Math.floor(horizon / h * lowH), 0, lowH - 1);
    const cameraHeight = h * (.5 + p.altitude * .16), data = floorPixels.data;
    const dirX = new Float32Array(lowW), dirY = new Float32Array(lowW);
    for (let x = 0; x < lowW; x++) {
      dirX[x] = Math.cos(p.angle + floorRayRelative[x]);
      dirY[x] = Math.sin(p.angle + floorRayRelative[x]);
    }
    for (let sy = lowHorizon; sy < lowH; sy++) {
      const screenY = sy / lowH * h;
      const rowDistance = Math.min(190, cameraHeight / Math.max(1, screenY - horizon));
      const fog = currentBuilding ? 0 : clamp((rowDistance - 45) / 340, 0, .3);
      for (let sx = 0; sx < lowW; sx++) {
        const rayDistance = rowDistance / Math.max(.2, floorRayCos[sx]);
        const color = groundColorAt(p.x + dirX[sx] * rayDistance, p.y + dirY[sx] * rayDistance);
        let r = color >> 16 & 255, g = color >> 8 & 255, b = color & 255;
        if (fog) { r += (199 - r) * fog; g += (224 - g) * fog; b += (231 - b) * fog; }
        const index = (sy * lowW + sx) * 4;
        data[index] = r; data[index + 1] = g; data[index + 2] = b; data[index + 3] = 255;
      }
    }
    floorCtx.putImageData(floorPixels, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(floorCanvas, 0, lowHorizon, lowW, lowH - lowHorizon, 0, horizon, w, h - horizon);
  }

  function drawWorld() {
    const p = state.player, w = canvas.width, h = canvas.height;
    const horizon = h * (0.48 + p.pitch * .42 + state.cameraBob * 0.005 - p.altitude * .055);
    const currentBuilding = p.altitude > .6 ? null : currentBuildingAt(p.x, p.y);
    if (currentBuilding) {
      const ceiling = { house: '#d9d2c5', police: '#aebac1', shop: '#e5ddca', hideout: '#777f7d' }[currentBuilding.type];
      const ceilingGradient = ctx.createLinearGradient(0, 0, 0, horizon);
      ceilingGradient.addColorStop(0, '#59636a'); ceilingGradient.addColorStop(1, ceiling);
      ctx.fillStyle = ceilingGradient; ctx.fillRect(0, 0, w, horizon);
      ctx.fillStyle = 'rgba(255,244,198,.55)';
      for (let light = 1; light < 6; light += 2) ctx.fillRect(w * light / 6 - 28, horizon * .16, 56, 7);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#4ca7e5'); sky.addColorStop(.62, '#a8dcf5'); sky.addColorStop(1, '#e6f2f4');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
      drawOutdoorSky(horizon);
    }
    drawGround(horizon, currentBuilding);
    const rays = Math.max(240, Math.floor(w / 2));
    const colW = w / rays;
    state.depthBuffer = new Float32Array(rays);
    for (let i = 0; i < rays; i++) {
      const rayAngle = p.angle - FOV / 2 + FOV * (i + .5) / rays;
      const ray = castRay(rayAngle);
      const corrected = ray.distance * Math.cos(rayAngle - p.angle);
      state.depthBuffer[i] = corrected;
      const wallScale = { 1: .38, 2: 1.45, 3: 1.35, 4: 1.72, 5: 1.58, 6: 1.48 }[ray.cell] || 1.35;
      const wallH = Math.min(h * 3, h * wallScale / corrected);
      const top = horizon - wallH / 2;
      const materialColors = {
        1: [79, 91, 99],
        2: [178, 158, 127],
        3: [116, 73, 38],
        4: [75, 116, 151],
        5: [185, 141, 58],
        6: [112, 65, 69],
      };
      let base = materialColors[ray.cell] || materialColors[2];
      let shade = clamp(1.15 - corrected * .012 - ray.side * .12, .3, 1);
      if (ray.cell !== 1 && ray.cell !== 3 && wallH > 28) {
        const band = Math.floor(ray.texture * 8) % 2 ? 1 : .88;
        shade *= band;
      }
      ctx.fillStyle = `rgb(${base[0] * shade},${base[1] * shade},${base[2] * shade})`;
      ctx.fillRect(i * colW, top, colW + 1, wallH);
      const hitBuilding = structures.find(building => ray.mapX >= building.x && ray.mapX < building.x + building.w && ray.mapY >= building.y && ray.mapY < building.y + building.h);
      const exteriorWall = hitBuilding && (ray.mapX === hitBuilding.x || ray.mapX === hitBuilding.x + hitBuilding.w - 1 || ray.mapY === hitBuilding.y || ray.mapY === hitBuilding.y + hitBuilding.h - 1);
      if (exteriorWall && ray.cell !== 3 && wallH > 18) {
        const windowColumn = ray.texture > .2 && ray.texture < .8;
        const windowRows = ray.cell === 4 ? 3 : 2;
        if (windowColumn) {
          for (let row = 0; row < windowRows; row++) {
            const wy = top + wallH * (.18 + row * .25);
            ctx.fillStyle = `rgba(${65 * shade},${137 * shade},${169 * shade},.82)`;
            ctx.fillRect(i * colW, wy, colW + 1, Math.max(2, wallH * .115));
            ctx.fillStyle = `rgba(218,242,249,${.28 * shade})`;
            ctx.fillRect(i * colW, wy, colW + 1, Math.max(1, wallH * .018));
          }
        }
        ctx.fillStyle = `rgba(28,36,40,${.35 * shade})`;
        ctx.fillRect(i * colW, top, colW + 1, Math.max(1, wallH * .025));
      } else if ((ray.cell === 2 || ray.cell === 6) && wallH > 34) {
        ctx.fillStyle = `rgba(53,43,36,${.22 * shade})`;
        for (let mortar = .22; mortar < .9; mortar += .22) ctx.fillRect(i * colW, top + wallH * mortar, colW + 1, Math.max(1, wallH * .01));
      }
      if (ray.cell === 3 && wallH > 45) {
        ctx.fillStyle = `rgba(232,194,89,${shade})`; ctx.fillRect(i * colW, top + wallH * .47, colW + 1, Math.max(1, wallH * .025));
        ctx.fillStyle = `rgba(34,22,14,${.55 * shade})`; ctx.fillRect(i * colW, top + wallH * .16, colW + 1, Math.max(1, wallH * .035));
      }
    }
    drawSprites(horizon);
    drawFirstPersonView();
    drawHud();
  }

  function projectSprite(x, y, scale = 1) {
    const p = state.player;
    const dx = x - p.x, dy = y - p.y, dist = Math.hypot(dx, dy);
    const rel = angleDiff(Math.atan2(dy, dx), p.angle);
    if (Math.abs(rel) > FOV * .72 || dist < .15) return null;
    const screenX = canvas.width * (.5 + rel / FOV);
    const size = canvas.height * scale / (dist * Math.cos(rel));
    const rayIndex = clamp(Math.floor(screenX / canvas.width * state.depthBuffer.length), 0, state.depthBuffer.length - 1);
    if (state.depthBuffer[rayIndex] < dist * Math.cos(rel) - .25) return null;
    return { screenX, size, dist };
  }

  function drawSprites(horizon) {
    const sprites = [];
    structures.forEach(s => sprites.push({ kind: 'sign', x: s.door.x + .5, y: s.door.y + 1.1, label: s.label, color: s.type === 'police' ? '#2f78d0' : s.type === 'hideout' ? '#a23d48' : s.type === 'shop' ? '#e5a92d' : '#3c5968' }));
    state.bots.filter(b => !b.jailed && !b.vehicleId).forEach(b => sprites.push({ kind: 'bot', ...b }));
    state.safes.filter(s => !s.opened).forEach(s => sprites.push({ kind: 'safe', ...s }));
    state.vehicles.filter(v => !v.destroyed && v.id !== state.player.vehicleId).forEach(v => sprites.push({ kind: 'vehicle', ...v }));
    furniture.forEach(item => sprites.push({ ...item }));
    cityProps.forEach(item => sprites.push({ ...item }));
    if (!state.boss.defeated) sprites.push({ kind: 'boss', ...state.boss });
    if (!state.thiefRobot.defeated) sprites.push({ kind: 'thiefRobot', active: allThievesJailed(), ...state.thiefRobot });
    sprites.push({ kind: 'pickup', x: PLACES.codeNote.x, y: PLACES.codeNote.y, label: 'KODLAPP', color: '#f2e7b3' });
    if (!state.jailKeyHolder) sprites.push({ kind: 'pickup', x: PLACES.jailKey.x, y: PLACES.jailKey.y, label: 'NYCKEL', color: '#f2c94c' });
    state.jailCells.forEach(cell => sprites.push({ kind: 'cell', ...cell, label: `CELL ${cell.index + 1}` }));
    sprites.sort((a, b) => distance(b, state.player) - distance(a, state.player));
    for (const s of sprites) {
      const scale = s.kind === 'sign' ? .48 : s.kind === 'safe' || s.kind === 'pickup' ? .42 : s.kind === 'cell' ? .42 : s.kind === 'thiefRobot' ? 1.15 : s.kind === 'boss' ? 1.05 : s.kind === 'vehicle' ? .7 : s.kind === 'tree' ? 1.35 : s.kind === 'lamp' ? 1.15 : s.kind === 'furniture' ? .5 : .62;
      const pr = projectSprite(s.x, s.y, scale);
      if (!pr) continue;
      if (s.kind === 'sign') {
        const fs = clamp(pr.size * .18, 10, 22); ctx.font = `800 ${fs}px system-ui`; const tw = ctx.measureText(s.label).width + 18;
        ctx.fillStyle = 'rgba(9,18,24,.85)'; ctx.fillRect(pr.screenX - tw / 2, horizon - pr.size * .65, tw, fs + 10);
        ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.strokeRect(pr.screenX - tw / 2, horizon - pr.size * .65, tw, fs + 10);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(s.label, pr.screenX, horizon - pr.size * .65 + fs + 2);
      } else if (s.kind === 'vehicle') {
        const sh = clamp(pr.size * .62, 14, canvas.height), sw = sh * (s.type === 'car' ? 1.45 : 1.8);
        const y = horizon - sh * .2 - (s.type === 'helicopter' ? (s.altitude || 0) * sh * .55 : 0);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(pr.screenX, y + sh * .77, sw * .55, sh * .15, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = s.owner === 'polis' ? '#1d65b5' : '#d54d3f';
        if (s.type === 'car') {
          ctx.fillRect(pr.screenX - sw / 2, y + sh * .32, sw, sh * .42); ctx.fillStyle = '#aee1f5'; ctx.fillRect(pr.screenX - sw * .24, y + sh * .12, sw * .48, sh * .3);
          ctx.fillStyle = '#12181c'; ctx.beginPath(); ctx.arc(pr.screenX - sw * .32, y + sh * .75, sh * .17, 0, TAU); ctx.arc(pr.screenX + sw * .32, y + sh * .75, sh * .17, 0, TAU); ctx.fill();
        } else {
          ctx.beginPath(); ctx.ellipse(pr.screenX, y + sh * .42, sw * .36, sh * .31, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#aee1f5'; ctx.beginPath(); ctx.ellipse(pr.screenX - sw * .1, y + sh * .35, sw * .17, sh * .17, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#242d32'; ctx.lineWidth = Math.max(2, sh * .045); ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .58, y + sh * .05); ctx.lineTo(pr.screenX + sw * .58, y + sh * .05); ctx.stroke();
        }
        ctx.fillStyle = '#fff'; ctx.font = `700 ${clamp(sh * .14, 9, 16)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(`${s.health}/10`, pr.screenX, y - 4);
      } else if (s.kind === 'safe') {
        const sz = clamp(pr.size, 16, 180), y = horizon - sz * .35;
        ctx.fillStyle = '#353c42'; ctx.fillRect(pr.screenX - sz * .38, y, sz * .76, sz * .72);
        ctx.strokeStyle = '#aab3b9'; ctx.lineWidth = Math.max(2, sz * .035); ctx.strokeRect(pr.screenX - sz * .32, y + sz * .06, sz * .64, sz * .58);
        ctx.beginPath(); ctx.arc(pr.screenX + sz * .1, y + sz * .35, sz * .09, 0, TAU); ctx.stroke();
      } else if (s.kind === 'pickup') {
        const sz = clamp(pr.size, 14, 130), y = horizon - sz * .2;
        ctx.fillStyle = s.color; ctx.fillRect(pr.screenX - sz * .3, y, sz * .6, sz * .42);
        ctx.fillStyle = '#1e272c'; ctx.font = `900 ${clamp(sz * .1, 8, 13)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(s.label, pr.screenX, y + sz * .26);
      } else if (s.kind === 'cell') {
        const sh = clamp(pr.size, 18, 170), sw = sh * .72, y = horizon - sh * .42;
        ctx.fillStyle = 'rgba(31,40,47,.78)'; ctx.fillRect(pr.screenX - sw / 2, y, sw, sh * .84);
        ctx.strokeStyle = '#bac8cf'; ctx.lineWidth = Math.max(2, sh * .035);
        for (let bar = -2; bar <= 2; bar++) {
          const bx = pr.screenX + bar * sw * .18;
          ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + sh * .84); ctx.stroke();
        }
        ctx.strokeRect(pr.screenX - sw / 2, y, sw, sh * .84);
        ctx.fillStyle = s.occupant ? '#ffcc57' : '#d8e4e9';
        ctx.font = `800 ${clamp(sh * .105, 8, 13)}px system-ui`; ctx.textAlign = 'center';
        ctx.fillText(s.occupant ? `${s.label}: UPPTAGEN` : s.label, pr.screenX, y - 5);
      } else if (s.kind === 'tree') {
        const sh = clamp(pr.size, 18, canvas.height * 1.5), y = horizon - sh * .62;
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(pr.screenX, horizon + sh * .25, sh * .3, sh * .07, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#61442d'; ctx.fillRect(pr.screenX - sh * .055, y + sh * .42, sh * .11, sh * .5);
        ctx.fillStyle = '#315f38'; ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .29, sh * .28, 0, TAU); ctx.arc(pr.screenX - sh * .19, y + sh * .39, sh * .23, 0, TAU); ctx.arc(pr.screenX + sh * .2, y + sh * .4, sh * .24, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(111,166,84,.55)'; ctx.beginPath(); ctx.arc(pr.screenX - sh * .08, y + sh * .2, sh * .13, 0, TAU); ctx.fill();
      } else if (s.kind === 'lamp') {
        const sh = clamp(pr.size, 18, canvas.height * 1.4), y = horizon - sh * .62;
        ctx.strokeStyle = '#303a3f'; ctx.lineWidth = Math.max(2, sh * .045); ctx.beginPath(); ctx.moveTo(pr.screenX, y + sh); ctx.lineTo(pr.screenX, y + sh * .14); ctx.lineTo(pr.screenX + sh * .16, y + sh * .14); ctx.stroke();
        ctx.fillStyle = 'rgba(255,230,147,.28)'; ctx.beginPath(); ctx.arc(pr.screenX + sh * .16, y + sh * .17, sh * .16, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffe49a'; ctx.fillRect(pr.screenX + sh * .1, y + sh * .12, sh * .13, sh * .1);
      } else if (s.kind === 'bench') {
        const sh = clamp(pr.size, 12, 150), sw = sh * 1.45, y = horizon - sh * .05;
        ctx.fillStyle = '#704a2b'; ctx.fillRect(pr.screenX - sw / 2, y - sh * .35, sw, sh * .18); ctx.fillRect(pr.screenX - sw / 2, y, sw, sh * .16);
        ctx.fillStyle = '#333b3f'; ctx.fillRect(pr.screenX - sw * .38, y + sh * .12, sh * .08, sh * .34); ctx.fillRect(pr.screenX + sw * .3, y + sh * .12, sh * .08, sh * .34);
      } else if (s.kind === 'hydrant') {
        const sh = clamp(pr.size, 9, 85), y = horizon - sh * .08;
        ctx.fillStyle = '#c83c37'; ctx.fillRect(pr.screenX - sh * .16, y - sh * .45, sh * .32, sh * .55); ctx.beginPath(); ctx.arc(pr.screenX, y - sh * .45, sh * .2, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = '#932a29'; ctx.fillRect(pr.screenX - sh * .26, y - sh * .28, sh * .52, sh * .12);
      } else if (s.kind === 'furniture') {
        const sh = clamp(pr.size, 12, 135), sw = sh * (s.style === 'bed' ? 1.5 : 1.15), y = horizon - sh * .15;
        const colors = { sofa: '#54788b', table: '#765034', bed: '#d5d0bd', desk: '#365c74', counter: '#d3a33e', crate: '#8b6032' };
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(pr.screenX, y + sh * .55, sw * .55, sh * .12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = colors[s.style] || '#78634b'; ctx.fillRect(pr.screenX - sw / 2, y, sw, sh * .5);
        if (s.style === 'sofa' || s.style === 'bed') { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(pr.screenX - sw * .42, y + sh * .08, sw * .84, sh * .17); }
        if (s.style === 'crate') { ctx.strokeStyle = '#4d321c'; ctx.lineWidth = Math.max(1, sh * .03); ctx.strokeRect(pr.screenX - sw / 2, y, sw, sh * .5); }
        if (s.style === 'counter') { ctx.fillStyle = '#fff0b0'; ctx.font = `800 ${clamp(sh * .12, 8, 13)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('KÖP HÄR', pr.screenX, y - 5); }
      } else if (s.kind === 'thiefRobot') {
        const sh = clamp(pr.size, 28, canvas.height * 1.25), sw = sh * .5, y = horizon - sh * .58;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(pr.screenX, horizon + sh * .43, sw * .82, sh * .12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#242b30'; ctx.fillRect(pr.screenX - sw * .58, y + sh * .32, sw * 1.16, sh * .49);
        ctx.fillStyle = '#7c2633'; ctx.fillRect(pr.screenX - sw * .48, y + sh * .39, sw * .96, sh * .2);
        ctx.fillStyle = '#171d21'; ctx.fillRect(pr.screenX - sw * .43, y + sh * .05, sw * .86, sh * .28);
        ctx.strokeStyle = '#aeb8bd'; ctx.lineWidth = Math.max(2, sw * .055); ctx.strokeRect(pr.screenX - sw * .43, y + sh * .05, sw * .86, sh * .28);
        ctx.strokeStyle = '#9da7ac'; ctx.lineWidth = Math.max(2, sw * .05); ctx.beginPath(); ctx.moveTo(pr.screenX, y + sh * .05); ctx.lineTo(pr.screenX, y - sh * .08); ctx.stroke();
        ctx.fillStyle = s.active ? '#ff3349' : '#792631'; ctx.beginPath(); ctx.arc(pr.screenX, y - sh * .1, sw * .06, 0, TAU); ctx.fill();
        ctx.fillStyle = s.active ? '#ff3047' : '#69252d';
        ctx.fillRect(pr.screenX - sw * .27, y + sh * .16, sw * .16, sh * .055); ctx.fillRect(pr.screenX + sw * .11, y + sh * .16, sw * .16, sh * .055);
        ctx.strokeStyle = '#343c41'; ctx.lineWidth = Math.max(5, sw * .15); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .52, y + sh * .42); ctx.lineTo(pr.screenX - sw * .88, y + sh * .68); ctx.moveTo(pr.screenX + sw * .52, y + sh * .42); ctx.lineTo(pr.screenX + sw * .88, y + sh * .68); ctx.stroke();
        ctx.strokeStyle = '#aeb8bd'; ctx.lineWidth = Math.max(2, sw * .055); ctx.beginPath();
        ctx.moveTo(pr.screenX - sw * .88, y + sh * .68); ctx.lineTo(pr.screenX - sw * 1.02, y + sh * .61); ctx.moveTo(pr.screenX - sw * .88, y + sh * .68); ctx.lineTo(pr.screenX - sw * 1.03, y + sh * .76);
        ctx.moveTo(pr.screenX + sw * .88, y + sh * .68); ctx.lineTo(pr.screenX + sw * 1.02, y + sh * .61); ctx.moveTo(pr.screenX + sw * .88, y + sh * .68); ctx.lineTo(pr.screenX + sw * 1.03, y + sh * .76); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = '#1b2125'; ctx.fillRect(pr.screenX - sw * .48, y + sh * .79, sw * .35, sh * .25); ctx.fillRect(pr.screenX + sw * .13, y + sh * .79, sw * .35, sh * .25);
        const barW = sw * 1.75;
        ctx.fillStyle = 'rgba(9,13,16,.9)'; ctx.fillRect(pr.screenX - barW / 2 - 3, y - 8, barW + 6, 24);
        ctx.fillStyle = '#8b2734'; ctx.fillRect(pr.screenX - barW / 2, y + 8, barW, 7);
        ctx.fillStyle = '#55d36d'; ctx.fillRect(pr.screenX - barW / 2, y + 8, barW * s.health / s.maxHealth, 7);
        ctx.fillStyle = '#fff'; ctx.font = `900 ${clamp(sh * .09, 9, 15)}px system-ui`; ctx.textAlign = 'center';
        ctx.fillText(`TJUVROBOT ${s.health}/${s.maxHealth}`, pr.screenX, y + 5);
      } else if (s.kind === 'boss') {
        const sh = clamp(pr.size, 22, canvas.height * 1.2), sw = sh * .42, y = horizon - sh * .55;
        ctx.fillStyle = '#152b4f'; ctx.fillRect(pr.screenX - sw / 2, y + sh * .28, sw, sh * .58);
        ctx.fillStyle = '#c58f72'; ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .18, sw * .42, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8bd43'; ctx.fillRect(pr.screenX - sw * .52, y + sh * .01, sw * 1.04, sh * .1);
        ctx.fillStyle = '#161b20'; ctx.fillRect(pr.screenX - sw * .44, y + sh * .82, sw * .34, sh * .23); ctx.fillRect(pr.screenX + sw * .1, y + sh * .82, sw * .34, sh * .23);
        ctx.fillStyle = '#be323c'; ctx.fillRect(pr.screenX - sw * .65, y - 14, sw * 1.3, 7); ctx.fillStyle = '#55d36d'; ctx.fillRect(pr.screenX - sw * .65, y - 14, sw * 1.3 * s.health / s.maxHealth, 7);
      } else {
        const sh = clamp(pr.size, 12, canvas.height * 1.2), sw = sh * .36, y = horizon - sh * .55;
        const colors = { polis: '#2473d1', tjuv: '#a63241', människa: '#30a36e' };
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(pr.screenX, horizon + sh * .48, sw * .75, sh * .12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = colors[s.role]; ctx.fillRect(pr.screenX - sw / 2, y + sh * .3, sw, sh * .52);
        ctx.fillStyle = colors[s.role]; ctx.fillRect(pr.screenX - sw * .72, y + sh * .34, sw * .18, sh * .45); ctx.fillRect(pr.screenX + sw * .54, y + sh * .34, sw * .18, sh * .45);
        const skinColors = ['#e8b68a', '#c98b65', '#8e5b42', '#f0c49e'];
        const personNumber = Number(String(s.id).split('-').pop()) || 1;
        ctx.fillStyle = skinColors[personNumber % skinColors.length]; ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .2, sw * .43, 0, TAU); ctx.fill();
        ctx.fillStyle = s.role === 'tjuv' ? '#282d32' : s.role === 'polis' ? '#173f75' : ['#3b2a24', '#bb8b4f', '#1f2023'][personNumber % 3];
        if (s.role === 'polis') { ctx.fillRect(pr.screenX - sw * .5, y + sh * .05, sw, sh * .09); ctx.fillRect(pr.screenX - sw * .28, y, sw * .56, sh * .08); }
        else { ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .13, sw * .43, Math.PI, TAU); ctx.fill(); }
        ctx.fillStyle = '#192126'; ctx.fillRect(pr.screenX - sw * .19, y + sh * .18, sw * .08, sh * .04); ctx.fillRect(pr.screenX + sw * .11, y + sh * .18, sw * .08, sh * .04);
        ctx.fillStyle = '#17202a'; ctx.fillRect(pr.screenX - sw * .42, y + sh * .78, sw * .34, sh * .24); ctx.fillRect(pr.screenX + sw * .08, y + sh * .78, sw * .34, sh * .24);
        if (s.inventory?.baton) {
          ctx.strokeStyle = '#253038'; ctx.lineWidth = Math.max(2, sw * .1); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(pr.screenX + sw * .62, y + sh * .46); ctx.lineTo(pr.screenX + sw * .9, y + sh * .74); ctx.stroke(); ctx.lineCap = 'butt';
        }
        const healthWidth = sw * 1.45;
        ctx.fillStyle = '#872e36'; ctx.fillRect(pr.screenX - healthWidth / 2, y - 10, healthWidth, 5);
        ctx.fillStyle = '#55d36d'; ctx.fillRect(pr.screenX - healthWidth / 2, y - 10, healthWidth * s.health / s.maxHealth, 5);
        if (s.faceOffStartedAt !== null && state.time < s.nextMeleeAt) {
          ctx.fillStyle = '#ffcf55'; ctx.font = `900 ${clamp(sh * .18, 10, 22)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('!', pr.screenX, y - 15);
        }
      }
    }
  }

  function drawFirstPersonView() {
    const p = state.player, w = canvas.width, h = canvas.height;
    if (p.vehicle) {
      ctx.fillStyle = 'rgba(18,25,29,.9)';
      ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * .86); ctx.quadraticCurveTo(w * .5, h * .73, w, h * .86); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#71828a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w / 2, h * .9, h * .11, Math.PI, TAU); ctx.stroke();
      if (p.vehicle === 'helicopter') { ctx.strokeStyle = 'rgba(22,30,34,.72)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(w * .18, 0); ctx.lineTo(w * .31, h); ctx.moveTo(w * .82, 0); ctx.lineTo(w * .69, h); ctx.stroke(); }
      return;
    }
    const swing = Math.sin(state.time * 8) * state.cameraBob * 4;
    const punch = state.time < p.attackSwingUntil ? h * .1 : 0;
    ctx.fillStyle = '#d5a17c';
    ctx.beginPath(); ctx.ellipse(w * .22 + swing, h * .97, w * .055, h * .17, -.42, 0, TAU); ctx.ellipse(w * .78 - swing, h * .97 - punch, w * .055, h * .17, .42, 0, TAU); ctx.fill();
    if (p.inventory.baton) {
      ctx.strokeStyle = '#1e272d'; ctx.lineWidth = Math.max(9, h * .025); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(w * .8 - swing, h * .94); ctx.lineTo(w * .88 - swing, h * .65); ctx.stroke(); ctx.lineCap = 'butt';
    }
  }

  function drawHud() {
    const p = state.player, w = canvas.width, h = canvas.height;
    const hudTop = 72;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(5,13,19,.78)'; ctx.fillRect(18, hudTop, 245, 76);
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.max(16, h * .029)}px system-ui`; ctx.fillText(`${p.role.toUpperCase()} 1`, 32, hudTop + 29);
    ctx.font = `700 ${Math.max(13, h * .022)}px system-ui`; ctx.fillStyle = '#ffd461'; ctx.fillText(`${p.money} pengar`, 32, hudTop + 58);
    for (let i = 0; i < 3; i++) {
      const fill = clamp(p.health - i, 0, 1), bx = 150 + i * 29;
      ctx.fillStyle = 'rgba(227,76,83,.2)'; ctx.fillRect(bx, hudTop + 42, 21, 12);
      ctx.fillStyle = '#e34c53'; ctx.fillRect(bx, hudTop + 42, 21 * fill, 12);
    }
    ctx.fillStyle = 'rgba(5,13,19,.78)'; ctx.fillRect(w - 258, hudTop, 240, 76);
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(13, h * .019)}px system-ui`;
    ctx.fillText(`Tjuvar i fängelse: ${state.jailedThieves}/5`, w - 240, hudTop + 27);
    ctx.fillText(allThievesJailed() ? `Tjuvrobot: ${state.thiefRobot.health}/20` : `Stulna pengar: ${state.stolen}/500`, w - 240, hudTop + 54);
    if (state.message && state.messageUntil > state.time) {
      ctx.font = `700 ${Math.max(15, h * .024)}px system-ui`; const tw = Math.min(w - 60, ctx.measureText(state.message).width + 40);
      const messageY = h - 154;
      ctx.fillStyle = 'rgba(4,12,18,.85)'; ctx.fillRect((w - tw) / 2, messageY, tw, 46);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(state.message, w / 2, messageY + 29);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2 - 10, h / 2); ctx.lineTo(w / 2 + 10, h / 2); ctx.moveTo(w / 2, h / 2 - 10); ctx.lineTo(w / 2, h / 2 + 10); ctx.stroke();
    drawMinimap(w - 145, hudTop + 106, 126, 96);
    if (p.vehicleId) {
      const vehicle = state.vehicles.find(v => v.id === p.vehicleId);
      ctx.fillStyle = 'rgba(5,13,19,.82)'; ctx.fillRect(18, h - 218, 210, 48);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = `700 ${Math.max(13, h * .019)}px system-ui`; ctx.fillText(`${p.vehicle === 'car' ? 'BIL' : 'HELIKOPTER'}  ${vehicle?.health ?? 0}/10 liv`, 32, h - 188);
    }
    if (p.unconsciousUntil > state.time || p.jailed || state.shopOpen || state.codesOpen || state.mode === 'police-win' || state.mode === 'thief-win') drawOverlay();
  }

  function drawMinimap(x, y, width, height) {
    const viewW = 54, viewH = viewW * height / width;
    const sx = clamp(state.player.x - viewW / 2, 0, MAP_W - viewW);
    const sy = clamp(state.player.y - viewH / 2, 0, MAP_H - viewH);
    const scaleX = width / viewW, scaleY = height / viewH;
    ctx.save();
    ctx.fillStyle = 'rgba(5,13,19,.82)'; ctx.fillRect(x - 8, y - 24, width + 16, height + 32);
    ctx.fillStyle = '#d6e8ef'; ctx.font = '800 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('LOKAL KARTA • 10×', x, y - 8);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(minimapBase, sx, sy, viewW, viewH, x, y, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.strokeRect(x, y, width, height);
    for (const bot of state.bots) {
      if (bot.jailed) continue;
      if (bot.x < sx || bot.x > sx + viewW || bot.y < sy || bot.y > sy + viewH) continue;
      ctx.fillStyle = bot.role === 'polis' ? '#54a7ff' : bot.role === 'tjuv' ? '#ff6570' : '#55d997';
      ctx.fillRect(x + (bot.x - sx) * scaleX - 2, y + (bot.y - sy) * scaleY - 2, 4, 4);
    }
    if (allThievesJailed() && !state.thiefRobot.defeated && state.thiefRobot.x >= sx && state.thiefRobot.x <= sx + viewW && state.thiefRobot.y >= sy && state.thiefRobot.y <= sy + viewH) {
      const rx = x + (state.thiefRobot.x - sx) * scaleX, ry = y + (state.thiefRobot.y - sy) * scaleY;
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#ff3047'; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
    }
    ctx.translate(x + (state.player.x - sx) * scaleX, y + (state.player.y - sy) * scaleY);
    ctx.rotate(state.player.angle);
    ctx.fillStyle = '#ffe05c'; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -3.5); ctx.lineTo(-3, 3.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawOverlay() {
    const p = state.player, w = canvas.width, h = canvas.height;
    state.overlayButtons = [];
    ctx.fillStyle = 'rgba(3,9,14,.72)'; ctx.fillRect(0, 0, w, h);
    const pw = Math.min(600, w * .78), ph = Math.min(420, h * .7), x = (w - pw) / 2, y = (h - ph) / 2;
    ctx.fillStyle = '#14232e'; ctx.fillRect(x, y, pw, ph); ctx.strokeStyle = '#82c9ee'; ctx.lineWidth = 4; ctx.strokeRect(x, y, pw, ph);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    if (state.shopOpen) {
      ctx.fillStyle = '#d9a62f'; ctx.fillRect(x, y, pw, 78);
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x, y, pw, 24);
      ctx.font = `900 ${Math.max(23, h * .047)}px system-ui`; ctx.fillStyle = '#17232a'; ctx.fillText('WILDERS GALLERIA', w / 2, y + 43);
      ctx.font = `800 ${Math.max(12, h * .019)}px system-ui`; ctx.fillText('FORDON & UTRUSTNING', w / 2, y + 66);
      ctx.font = `800 ${Math.max(15, h * .025)}px system-ui`; ctx.fillStyle = '#ffd86b'; ctx.fillText(`PLÅNBOK: ${p.money} PENGAR`, w / 2, y + 108);
      const choices = p.role === 'människa'
        ? [{ key: '2', item: 'car', label: 'Bil — 20 pengar' }]
        : [
            { key: '1', item: 'baton', label: 'Klubba — 10 pengar' },
            { key: '2', item: 'car', label: 'Bil — 20 pengar' },
            { key: '3', item: 'helicopter', label: 'Helikopter — 30 pengar' },
          ];
      const gap = 12, cardW = Math.min(178, (pw - 48 - gap * (choices.length - 1)) / choices.length), cardH = Math.min(178, ph * .43);
      const cardsW = cardW * choices.length + gap * (choices.length - 1), cardsX = w / 2 - cardsW / 2;
      choices.forEach((choice, i) => {
        const bx = cardsX + i * (cardW + gap), by = y + 126, price = { baton: 10, car: 20, helicopter: 30 }[choice.item];
        const owned = !!p.inventory[choice.item], affordable = p.money >= price;
        state.overlayButtons.push({ action: 'buy', item: choice.item, x: bx, y: by, w: cardW, h: cardH });
        ctx.fillStyle = owned ? '#2d5e4c' : affordable ? '#23485b' : '#343f45'; ctx.fillRect(bx, by, cardW, cardH);
        ctx.strokeStyle = owned ? '#72d6a3' : affordable ? '#82c9ee' : '#7b858a'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, cardW, cardH);
        ctx.fillStyle = '#ffd86b'; ctx.beginPath(); ctx.arc(bx + 24, by + 23, 15, 0, TAU); ctx.fill();
        ctx.fillStyle = '#17232a'; ctx.font = `900 ${Math.max(12, h * .02)}px system-ui`; ctx.fillText(choice.key, bx + 24, by + 29);
        ctx.save(); ctx.translate(bx + cardW / 2, by + cardH * .42);
        if (choice.item === 'baton') {
          ctx.strokeStyle = '#dbe4e8'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-22, 30); ctx.lineTo(20, -29); ctx.stroke(); ctx.strokeStyle = '#263138'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-22, 30); ctx.lineTo(20, -29); ctx.stroke();
        } else if (choice.item === 'car') {
          ctx.fillStyle = '#cf493f'; ctx.fillRect(-45, -2, 90, 30); ctx.fillStyle = '#9ed9ed'; ctx.fillRect(-23, -20, 47, 22); ctx.fillStyle = '#171d21'; ctx.beginPath(); ctx.arc(-28, 29, 10, 0, TAU); ctx.arc(28, 29, 10, 0, TAU); ctx.fill();
        } else {
          ctx.fillStyle = '#cf493f'; ctx.beginPath(); ctx.ellipse(0, 4, 43, 24, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#9ed9ed'; ctx.beginPath(); ctx.ellipse(-13, -2, 17, 13, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#202a30'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-55, -25); ctx.lineTo(55, -25); ctx.stroke();
        }
        ctx.restore();
        const itemName = choice.item === 'baton' ? 'KLUBBA' : choice.item === 'car' ? 'BIL' : 'HELIKOPTER';
        ctx.font = `900 ${Math.max(13, h * .021)}px system-ui`; ctx.fillStyle = '#fff'; ctx.fillText(itemName, bx + cardW / 2, by + cardH - 42);
        ctx.font = `800 ${Math.max(12, h * .019)}px system-ui`; ctx.fillStyle = owned ? '#8ce5b5' : '#ffd86b'; ctx.fillText(owned ? 'REDAN ÄGD' : `${price} PENGAR`, bx + cardW / 2, by + cardH - 18);
      });
      if (state.mallReceipt) { ctx.font = `800 ${Math.max(13, h * .021)}px system-ui`; ctx.fillStyle = '#8ce5b5'; ctx.fillText(state.mallReceipt, w / 2, y + ph - 45); }
      ctx.font = `600 ${Math.max(12, h * .018)}px system-ui`; ctx.fillStyle = '#b8d2df'; ctx.fillText('Tryck på en vara eller använd siffra • E stänger gallerian', w / 2, y + ph - 20);
    } else if (state.codesOpen) {
      ctx.font = `900 ${Math.max(23, h * .047)}px system-ui`; ctx.fillText('KODER TILL WILDERS KASSASKÅP', w / 2, y + 58);
      ctx.font = `700 ${Math.max(14, h * .024)}px ui-monospace, monospace`;
      SAFE_CODES.forEach((code, i) => { const col = i < 5 ? 0 : 1, row = i % 5; ctx.fillText(`Hus ${i + 1}: ${code}`, x + pw * (.27 + col * .46), y + 112 + row * 42); });
      ctx.font = `500 ${Math.max(13, h * .02)}px system-ui`; ctx.fillStyle = '#b8d2df'; ctx.fillText('E för att stänga lappen', w / 2, y + ph - 30);
    } else if (state.mode === 'police-win' || state.mode === 'thief-win') {
      ctx.font = `900 ${Math.max(30, h * .07)}px system-ui`; ctx.fillStyle = '#ffd75d'; ctx.fillText(state.mode === 'police-win' ? 'POLISERNA VANN!' : 'TJUVLIGAN VANN!', w / 2, y + ph * .38);
      ctx.font = `600 ${Math.max(16, h * .028)}px system-ui`; ctx.fillStyle = '#fff'; ctx.fillText(state.mode === 'police-win' ? 'Fem tjuvar är fångade och tjuvroboten är besegrad.' : 'Alla pengar är stulna och polisbossen är besegrad.', w / 2, y + ph * .55);
      const bw = 230, bh = 48, bx = w / 2 - bw / 2, by = y + ph * .67;
      state.overlayButtons.push({ action: 'restart', x: bx, y: by, w: bw, h: bh });
      ctx.fillStyle = '#ffd75d'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#17232a'; ctx.font = `800 ${Math.max(15, h * .024)}px system-ui`; ctx.fillText('NYTT SPEL', w / 2, by + 31);
    } else if (p.jailed) {
      ctx.font = `900 ${Math.max(29, h * .065)}px system-ui`; ctx.fillStyle = '#ffca55'; ctx.fillText('DU SITTER I FÄNGELSE', w / 2, y + ph * .4);
      ctx.font = `600 ${Math.max(15, h * .026)}px system-ui`; ctx.fillStyle = '#fff'; ctx.fillText('En fri tjuv måste hitta nyckeln och rädda dig.', w / 2, y + ph * .58);
    } else {
      const left = Math.max(0, Math.ceil(p.unconsciousUntil - state.time));
      ctx.font = `900 ${Math.max(29, h * .065)}px system-ui`; ctx.fillStyle = '#ffca55'; ctx.fillText('AVSVIMMAD', w / 2, y + ph * .42);
      ctx.font = `700 ${Math.max(17, h * .032)}px system-ui`; ctx.fillStyle = '#fff'; ctx.fillText(`Vaknar om ${left} sekunder`, w / 2, y + ph * .6);
    }
  }

  function update(dt) {
    state.time += dt;
    if (state.mode !== 'playing' || !state.player) return;
    const p = state.player;
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    if (p.attackCooldown < 1e-6) p.attackCooldown = 0;
    const enteredBuilding = p.altitude > .6 ? null : currentBuildingAt(p.x, p.y);
    if (enteredBuilding?.id === 'shop' && state.lastBuildingId !== 'shop') {
      state.shopOpen = true;
      state.mallVisits++;
      state.mallReceipt = '';
      playTone(620, .1, 'triangle');
    }
    state.lastBuildingId = enteredBuilding?.id || null;
    if (state.shopOpen || state.codesOpen) return;
    if (p.jailed) { updateBots(dt); return; }
    if (p.unconsciousUntil > state.time) { updateBots(dt); return; }
    if (p.vehicle === 'helicopter') {
      if (keys.FlyUp || keys.KeyR) p.altitude = clamp(p.altitude + dt * .75, 0, 2);
      if (keys.FlyDown || keys.KeyC) {
        const overForbiddenHideout = p.role === 'polis' && !allThievesJailed() && currentBuildingAt(p.x, p.y)?.type === 'hideout';
        p.altitude = clamp(p.altitude - dt * .75, overForbiddenHideout ? .65 : 0, 2);
      }
    }
    const turn = ((keys.ArrowRight || keys.KeyQ) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyZ) ? 1 : 0);
    p.angle = (p.angle + turn * 2.15 * dt + TAU) % TAU;
    const forward = ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0);
    const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const speed = p.vehicle === 'car' ? 4.7 : p.vehicle === 'helicopter' ? 5.6 : 2.65;
    const vx = Math.cos(p.angle) * forward + Math.cos(p.angle + Math.PI / 2) * strafe;
    const vy = Math.sin(p.angle) * forward + Math.sin(p.angle + Math.PI / 2) * strafe;
    const mag = Math.hypot(vx, vy) || 1, nx = p.x + vx / mag * speed * dt, ny = p.y + vy / mag * speed * dt;
    const flying = p.vehicle === 'helicopter' && p.altitude > .6;
    if (canPersonStand(p, nx, p.y, p.vehicle ? .34 : .23, flying)) p.x = nx;
    if (canPersonStand(p, p.x, ny, p.vehicle ? .34 : .23, flying)) p.y = ny;
    if (p.vehicleId) {
      const vehicle = state.vehicles.find(v => v.id === p.vehicleId);
      if (vehicle) { vehicle.x = p.x; vehicle.y = p.y; vehicle.altitude = p.altitude; }
    }
    state.boss.cooldown = Math.max(0, state.boss.cooldown - dt);
    if (p.role === 'tjuv' && !state.boss.defeated && distance(p, state.boss) < 1.55 && state.boss.cooldown <= 0) {
      state.boss.cooldown = 1.1;
      if (p.vehicleId) {
        const vehicle = state.vehicles.find(v => v.id === p.vehicleId);
        if (vehicle && --vehicle.health <= 0) destroyVehicle(vehicle);
      } else {
        p.health--;
        if (p.health <= 0) jailThief(p);
        else showMessage(`Polisbossen träffade dig! ${p.health} liv kvar`, 1);
      }
    }
    if (forward || strafe) state.cameraBob = Math.sin(state.time * (p.vehicle ? 5 : 10)) * (p.vehicle ? .3 : 1);
    else state.cameraBob *= .85;
    updateBots(dt);
  }

  function botWalkable(x, y, person = null, movement = 'foot') {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return false;
    if (movement === 'car') return groundZones[y * MAP_W + x] === 1 && map[y][x] === 0;
    if (person && !canEnterBuilding(person, currentBuildingAt(x + .5, y + .5))) return false;
    return map[y][x] === 0 || map[y][x] === 3;
  }

  function findBotPath(fromX, fromY, toX, toY, person = null, movement = 'foot') {
    const sx = clamp(Math.floor(fromX), 1, MAP_W - 2), sy = clamp(Math.floor(fromY), 1, MAP_H - 2);
    const gx = clamp(Math.floor(toX), 1, MAP_W - 2), gy = clamp(Math.floor(toY), 1, MAP_H - 2);
    if (++pathGeneration >= 2147483647) { pathVisited.fill(0); pathGeneration = 1; }
    const generation = pathGeneration, start = sy * MAP_W + sx, goal = gy * MAP_W + gx;
    let head = 0, tail = 0; pathQueue[tail++] = start; pathVisited[start] = generation; pathPrevious[start] = start;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < tail && pathVisited[goal] !== generation) {
      const current = pathQueue[head++], cx = current % MAP_W, cy = Math.floor(current / MAP_W);
      for (const [dx, dy] of directions) {
        const nx = cx + dx, ny = cy + dy, next = ny * MAP_W + nx;
        if (!botWalkable(nx, ny, person, movement) || pathVisited[next] === generation) continue;
        pathVisited[next] = generation; pathPrevious[next] = current; pathQueue[tail++] = next;
      }
    }
    if (pathVisited[goal] !== generation) return [];
    const path = [];
    for (let current = goal; current !== start; current = pathPrevious[current]) path.push({ x: current % MAP_W + .5, y: Math.floor(current / MAP_W) + .5 });
    return path.reverse();
  }

  function randomFreeTarget(person = null) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const x = 1 + Math.floor(random() * (MAP_W - 2)), y = 1 + Math.floor(random() * (MAP_H - 2));
      if (botWalkable(x, y, person)) return { x: x + .5, y: y + .5 };
    }
    return { x: 24.5, y: 22.5 };
  }

  const roadDropoffCache = new Map();
  function nearestRoadPoint(x, y) {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    if (roadDropoffCache.has(key)) return roadDropoffCache.get(key);
    const cx = clamp(Math.floor(x), 1, MAP_W - 2), cy = clamp(Math.floor(y), 1, MAP_H - 2);
    let best = null, bestDistance = Infinity;
    for (let radius = 0; radius <= 24 && !best; radius++) {
      for (let yy = Math.max(1, cy - radius); yy <= Math.min(MAP_H - 2, cy + radius); yy++) {
        for (let xx = Math.max(1, cx - radius); xx <= Math.min(MAP_W - 2, cx + radius); xx++) {
          if (Math.max(Math.abs(xx - cx), Math.abs(yy - cy)) !== radius || !botWalkable(xx, yy, null, 'car')) continue;
          const d = Math.hypot(xx + .5 - x, yy + .5 - y);
          if (d < bestDistance) { bestDistance = d; best = { x: xx + .5, y: yy + .5 }; }
        }
      }
    }
    best ||= { x: clamp(x, 1.5, MAP_W - 1.5), y: clamp(y, 1.5, MAP_H - 1.5) };
    roadDropoffCache.set(key, best);
    return best;
  }

  function moveBotTo(b, target, dt, speed) {
    if (b.vehicle === 'helicopter') {
      const angle = Math.atan2(target.y - b.y, target.x - b.x);
      b.angle = angle;
      b.altitude = Math.max(1.15, b.altitude);
      b.x = clamp(b.x + Math.cos(angle) * speed * dt, .5, MAP_W - .5);
      b.y = clamp(b.y + Math.sin(angle) * speed * dt, .5, MAP_H - .5);
      const helicopter = state.vehicles.find(vehicle => vehicle.id === b.vehicleId);
      if (helicopter) { helicopter.x = b.x; helicopter.y = b.y; helicopter.altitude = b.altitude; }
      return;
    }
    b.pathTimer -= dt;
    const movingTarget = target.type === 'chase' || target.type === 'fight';
    const targetShift = movingTarget ? 1.25 : .7;
    if (b.pathTimer <= 0 || Math.hypot(target.x - b.targetX, target.y - b.targetY) > targetShift) {
      b.path = findBotPath(b.x, b.y, target.x, target.y, b, b.vehicle === 'car' ? 'car' : 'foot');
      b.targetX = target.x; b.targetY = target.y; b.pathTimer = movingTarget ? .7 + random() * .2 : 1.65 + random() * .45;
    }
    let waypoint = b.path[0] || target;
    if (Math.hypot(waypoint.x - b.x, waypoint.y - b.y) < .16 && b.path.length) { b.path.shift(); waypoint = b.path[0] || target; }
    const door = doors.get(`${Math.floor(waypoint.x)},${Math.floor(waypoint.y)}`);
    if (door && !(b.role === 'polis' && door.buildingType === 'hideout' && !allThievesJailed())) door.open = true;
    const angle = Math.atan2(waypoint.y - b.y, waypoint.x - b.x); b.angle = angle;
    const nx = b.x + Math.cos(angle) * speed * dt, ny = b.y + Math.sin(angle) * speed * dt;
    const canMove = b.vehicle === 'car'
      ? (xx, yy) => botWalkable(Math.floor(xx), Math.floor(yy), b, 'car')
      : (xx, yy) => canPersonStand(b, xx, yy, .18);
    if (canMove(nx, b.y)) b.x = nx; else b.pathTimer = 0;
    if (canMove(b.x, ny)) b.y = ny; else b.pathTimer = 0;
    if (b.vehicleId) {
      const vehicle = state.vehicles.find(candidate => candidate.id === b.vehicleId);
      if (vehicle) { vehicle.x = b.x; vehicle.y = b.y; vehicle.altitude = 0; }
    }
  }

  function nearestActive(role, from, maxDistance = Infinity) {
    const candidates = state.bots.filter(person => person.role === role && !person.jailed && person.unconsciousUntil <= state.time);
    if (state.player.role === role && !state.player.jailed && state.player.unconsciousUntil <= state.time) candidates.push(state.player);
    let best = null, bestDistance = maxDistance;
    for (const person of candidates) { const d = distance(from, person); if (d < bestDistance) { best = person; bestDistance = d; } }
    return best;
  }

  function personById(id) {
    if (state.player?.id === id) return state.player;
    return state.bots.find(person => person.id === id) || null;
  }

  function homeSafeFor(person) {
    if (!person || person.role !== 'människa') return null;
    return state.safes.find(safe => safe.ownerId === person.id) || null;
  }

  function activeThiefInHome(homeowner, safe = homeSafeFor(homeowner)) {
    if (!safe) return null;
    const homeId = `house-${safe.house}`;
    return [state.player, ...state.bots]
      .filter(person => person && person.role === 'tjuv' && !person.jailed && person.unconsciousUntil <= state.time
        && !person.vehicleId && (person.altitude || 0) <= .6 && currentBuildingAt(person.x, person.y)?.id === homeId)
      .sort((a, b) => distance(homeowner, a) - distance(homeowner, b))[0] || null;
  }

  function resetBotFaceOff(bot) {
    bot.combatTargetId = null;
    bot.faceOffStartedAt = null;
    bot.nextMeleeAt = Infinity;
  }

  function botMeleeReady(bot, target, interval) {
    if (bot.combatTargetId !== target.id || bot.faceOffStartedAt === null) {
      bot.combatTargetId = target.id;
      bot.faceOffStartedAt = state.time;
      bot.nextMeleeAt = state.time + FACE_OFF_DELAY;
      recordEvent('face-off', { attacker: bot.id, target: target.id, wait: FACE_OFF_DELAY });
      return false;
    }
    if (state.time + 1e-6 < bot.nextMeleeAt) return false;
    bot.lastAttackAt = state.time;
    bot.nextMeleeAt = state.time + interval;
    return true;
  }

  function damagePerson(attacker, target, damage, source = 'hand') {
    if (!target || target.jailed || target.unconsciousUntil > state.time) return false;
    target.health = Math.max(0, +(target.health - damage).toFixed(2));
    target.lastDamage = { time: state.time, attacker: attacker?.id || 'okänd', damage, source };
    recordEvent('hit', { attacker: attacker?.id || 'okänd', target: target.id, damage, source, health: target.health });
    if (target.health > 0) return true;
    if (attacker?.role === 'polis' && target.role === 'tjuv') {
      jailThief(target, attacker);
      return true;
    }
    const seconds = target.role === 'polis' ? 10 : 5;
    target.health = 3;
    target.unconsciousUntil = state.time + seconds;
    if (target !== state.player) resetBotFaceOff(target);
    recordEvent('unconscious', { person: target.id, seconds, winner: attacker?.id || null });
    if (target === state.player) showMessage(`Du svimmade i ${seconds} sekunder!`, 3);
    else showMessage(`${target.id} svimmade i ${seconds} sekunder!`, 2.5);
    return true;
  }

  function damageThiefRobot(attacker, damage = BATON_DAMAGE) {
    const robot = state.thiefRobot;
    if (!attacker || attacker.role !== 'polis' || !allThievesJailed() || robot.defeated) return false;
    robot.health = Math.max(0, +(robot.health - damage).toFixed(2));
    recordEvent('thief-robot-hit', { attacker: attacker.id, damage, health: robot.health });
    if (robot.health <= 0) {
      robot.health = 0;
      robot.defeated = true;
      recordEvent('thief-robot-defeated', { attacker: attacker.id });
      showMessage('Tjuvroboten är besegrad! Poliserna vann!', 5);
      checkWin();
    }
    return true;
  }

  function exitVehicle(person, reason = 'parked') {
    if (!person?.vehicleId) return null;
    const vehicle = state.vehicles.find(candidate => candidate.id === person.vehicleId);
    if (vehicle) {
      vehicle.x = person.x;
      vehicle.y = person.y;
      vehicle.altitude = 0;
      vehicle.driverId = null;
      vehicle.reservedBy = null;
    }
    const oldId = person.vehicleId;
    person.vehicle = null;
    person.vehicleId = null;
    person.altitude = 0;
    if (person.role === 'polis' && !allThievesJailed() && currentBuildingAt(person.x, person.y)?.type === 'hideout') {
      person.x = hideout.door.x + .5;
      person.y = hideout.door.y + 1.7;
      person.angle = -Math.PI / 2;
    }
    if ('pendingVehicleId' in person) person.pendingVehicleId = null;
    recordEvent('vehicle-exit', { person: person.id, vehicle: oldId, reason });
    return vehicle;
  }

  function enterBotVehicle(bot, vehicle) {
    if (!vehicle || vehicle.destroyed || vehicle.driverId || (vehicle.reservedBy && vehicle.reservedBy !== bot.id)) return false;
    vehicle.driverId = bot.id;
    vehicle.reservedBy = null;
    bot.vehicle = vehicle.type;
    bot.vehicleId = vehicle.id;
    bot.pendingVehicleId = null;
    bot.x = vehicle.x;
    bot.y = vehicle.y;
    bot.altitude = vehicle.type === 'helicopter' ? 1.15 : 0;
    vehicle.altitude = bot.altitude;
    bot.vehicleUseUntil = state.time + 8;
    bot.path = [];
    bot.pathTimer = 0;
    recordEvent('vehicle-enter', { person: bot.id, vehicle: vehicle.id, vehicleType: vehicle.type });
    return true;
  }

  function deliverBotVehicle(bot, type) {
    const existing = state.vehicles.find(vehicle => vehicle.owner === bot.id && vehicle.type === type && !vehicle.destroyed);
    if (existing) { bot.pendingVehicleId = existing.id; return existing; }
    const delivered = state.vehicles.filter(vehicle => typeof vehicle.owner === 'string' && vehicle.owner.includes('-') && !vehicle.id.startsWith('police-')).length;
    const x = 37.5 + (delivered % 8) * 3;
    const y = 108.5 + Math.floor(delivered / 8) * 3;
    const vehicle = {
      id: `${bot.id}-${type}`,
      type,
      label: `${bot.id}s ${type === 'car' ? 'bil' : 'helikopter'}`,
      x,
      y,
      health: 10,
      maxHealth: 10,
      owner: bot.id,
      driverId: null,
      reservedBy: bot.id,
      altitude: 0,
      destroyed: false,
    };
    state.vehicles.push(vehicle);
    bot.pendingVehicleId = vehicle.id;
    return vehicle;
  }

  function roleCanBuy(person, item) {
    return !(person.role === 'människa' && (item === 'baton' || item === 'helicopter'));
  }

  function tryPurchase(person, item, isBot = false) {
    const price = ITEM_PRICE[item];
    if (!price || !roleCanBuy(person, item) || person.inventory[item] || person.money < price) return false;
    person.money -= price;
    person.inventory[item] = true;
    if (isBot && (item === 'car' || item === 'helicopter')) deliverBotVehicle(person, item);
    if (!isBot && item === 'car') state.vehicles.find(vehicle => vehicle.id === 'shop-car').owner = 'player';
    if (!isBot && item === 'helicopter') state.vehicles.find(vehicle => vehicle.id === 'shop-heli').owner = 'player';
    recordEvent('purchase', { buyer: person.id, item, price, money: person.money });
    return true;
  }

  function botShoppingItem(bot) {
    if (bot.role === 'människa') return !bot.inventory.car && bot.money >= ITEM_PRICE.car ? 'car' : null;
    if (bot.role !== 'tjuv') return null;
    if (!bot.inventory.baton && bot.money >= ITEM_PRICE.baton) return 'baton';
    const preferred = bot.preferredVehicle;
    if (!bot.inventory[preferred] && bot.money >= ITEM_PRICE[preferred]) return preferred;
    return null;
  }

  function assignedSafeForThief(bot) {
    if (!bot || bot.role !== 'tjuv') return null;
    const current = state.safes.find(safe => safe.id === bot.safeTargetId && !safe.opened);
    if (current) return current;
    bot.safeTargetId = null;
    const unopened = state.safes.filter(safe => !safe.opened);
    if (!unopened.length) return null;
    const claimed = new Set(state.bots
      .filter(other => other !== bot && other.role === 'tjuv' && !other.jailed)
      .map(other => other.safeTargetId)
      .filter(Boolean));
    const unclaimed = unopened.filter(safe => !claimed.has(safe.id));
    const choices = unclaimed.length ? unclaimed : unopened;
    choices.sort((a, b) => distance(bot, a) - distance(bot, b));
    bot.safeTargetId = choices[0].id;
    return choices[0];
  }

  function ownedAvailableVehicle(bot) {
    const allowed = state.vehicles.filter(vehicle => {
      const owned = vehicle.owner === bot.id || (bot.role === 'polis' && vehicle.owner === 'polis');
      return owned && !vehicle.destroyed && !vehicle.driverId && (!vehicle.reservedBy || vehicle.reservedBy === bot.id) && bot.inventory[vehicle.type];
    });
    allowed.sort((a, b) => {
      const aPreferred = a.type === bot.preferredVehicle ? 0 : 1;
      const bPreferred = b.type === bot.preferredVehicle ? 0 : 1;
      return aPreferred - bPreferred || distance(bot, a) - distance(bot, b);
    });
    return allowed[0] || null;
  }

  function outdoorPointFor(goal) {
    const target = goal.target && typeof goal.target.x === 'number' ? goal.target : goal;
    const building = currentBuildingAt(target.x, target.y);
    if (!building) return { x: target.x, y: target.y };
    return { x: building.door.x + .5, y: building.door.y + 1.8 };
  }

  function prepareBotTravel(bot, mission) {
    if (!bot.vehicle) {
      let vehicle = bot.pendingVehicleId && state.vehicles.find(candidate => candidate.id === bot.pendingVehicleId && !candidate.destroyed);
      if (!vehicle && distance(bot, mission) > 18) vehicle = ownedAvailableVehicle(bot);
      if (vehicle) {
        if (!vehicle.reservedBy) vehicle.reservedBy = bot.id;
        if (vehicle.reservedBy === bot.id) {
          bot.pendingVehicleId = vehicle.id;
          return { type: 'enter-vehicle', target: vehicle, x: vehicle.x, y: vehicle.y, speed: botMoveSpeed(bot), transportOnly: true };
        }
      }
      return mission;
    }
    const outside = outdoorPointFor(mission);
    const destination = bot.vehicle === 'car' ? nearestRoadPoint(outside.x, outside.y) : outside;
    return {
      type: bot.vehicle === 'car' ? `drive-${mission.type}` : `fly-${mission.type}`,
      x: destination.x,
      y: destination.y,
      speed: botMoveSpeed(bot, bot.vehicle === 'car' ? 'car' : 'helicopter'),
      transportOnly: true,
      mission,
      moving: mission.type === 'chase' || mission.type === 'fight',
    };
  }

  function freeAllThieves(rescuer) {
    let freed = 0;
    for (const thief of state.bots.filter(person => person.role === 'tjuv' && person.jailed)) {
      const cell = state.jailCells[thief.jailCell]; if (cell) cell.occupant = null;
      thief.jailed = false; thief.jailCell = null; thief.health = 3;
      thief.x = PLACES.jailRelease.x - freed * 1.15; thief.y = PLACES.jailRelease.y - 2.2; thief.path = []; freed++;
    }
    if (state.player.role === 'tjuv' && state.player.jailed) {
      const cell = state.jailCells[state.player.jailCell]; if (cell) cell.occupant = null;
      state.player.jailed = false; state.player.jailCell = null; state.player.health = 3;
      state.player.x = PLACES.jailRelease.x; state.player.y = PLACES.jailRelease.y - 2.2; freed++;
    }
    state.jailedThieves = Math.max(0, state.jailedThieves - freed);
    if (freed && !allThievesJailed()) {
      for (const police of [state.player, ...state.bots].filter(person => person?.role === 'polis' && currentBuildingAt(person.x, person.y)?.type === 'hideout')) {
        if (police.vehicleId) exitVehicle(police, 'hideout-relocked');
        else {
          police.x = hideout.door.x + .5;
          police.y = hideout.door.y + 1.7;
          police.angle = -Math.PI / 2;
          if (police.path) police.path = [];
        }
      }
    }
    state.jailKeyHolder = null; state.player.inventory.jailKey = false;
    for (const thief of state.bots.filter(person => person.role === 'tjuv')) thief.inventory.jailKey = false;
    if (freed) {
      state.lastRescue = { time: +state.time.toFixed(2), rescuer, freed };
      recordEvent('rescue', state.lastRescue);
      showMessage(`${rescuer} befriade ${freed} tjuv${freed === 1 ? '' : 'ar'}!`, 5);
    }
    return freed;
  }

  function chooseBotGoal(b) {
    if (b.role === 'polis') {
      if (allThievesJailed() && !state.thiefRobot.defeated) {
        return {
          type: 'thief-robot', target: state.thiefRobot,
          x: state.thiefRobot.x, y: state.thiefRobot.y, speed: botMoveSpeed(b),
        };
      }
      const thief = nearestActive('tjuv', b);
      if (thief) {
        const thiefBuilding = currentBuildingAt(thief.x, thief.y);
        const waitsOutsideHideout = thiefBuilding?.type === 'hideout';
        return {
          type: waitsOutsideHideout ? 'guard-hideout' : 'chase',
          target: thief,
          x: waitsOutsideHideout ? hideout.door.x + .5 : thief.x,
          y: waitsOutsideHideout ? hideout.door.y + 1.7 : thief.y,
          speed: botMoveSpeed(b),
        };
      }
    }
    if (b.role === 'tjuv') {
      const nearbyPolice = nearestActive('polis', b, 2.4);
      if (nearbyPolice) return { type: 'fight', target: nearbyPolice, x: nearbyPolice.x, y: nearbyPolice.y, speed: botMoveSpeed(b) };
      if (state.jailedThieves > 0) {
        if (b.inventory.jailKey) return { type: 'release', x: PLACES.jailRelease.x, y: PLACES.jailRelease.y, speed: botMoveSpeed(b) };
        if (!state.jailKeyHolder || state.jailKeyHolder === b.id) return { type: 'key', x: PLACES.jailKey.x, y: PLACES.jailKey.y, speed: botMoveSpeed(b) };
        return { type: 'rescue-support', x: PLACES.jailRelease.x, y: PLACES.jailRelease.y, speed: botMoveSpeed(b) };
      }
      if (!state.thiefCodesKnown) return { type: 'note', x: PLACES.codeNote.x, y: PLACES.codeNote.y, speed: botMoveSpeed(b) };
      const safe = assignedSafeForThief(b);
      if (safe) return { type: 'safe', target: safe, x: safe.x, y: safe.y, speed: botMoveSpeed(b) };
      // Tjuvbotarna får fortfarande handla, men först när alla kassaskåpspengar är stulna.
      const shoppingItem = botShoppingItem(b);
      if (shoppingItem) return { type: 'shop', item: shoppingItem, x: PLACES.mallCounter.x, y: PLACES.mallCounter.y, speed: botMoveSpeed(b) };
      if (!state.boss.defeated) return { type: 'boss', target: state.boss, x: state.boss.x, y: state.boss.y, speed: botMoveSpeed(b) };
    }
    if (b.role === 'människa') {
      const homeSafe = homeSafeFor(b);
      const intruder = activeThiefInHome(b, homeSafe);
      if (intruder) return { type: 'fight', target: intruder, x: intruder.x, y: intruder.y, speed: 1.08, guardingHouse: homeSafe.house };
      const attacker = b.lastDamage && state.time - b.lastDamage.time < 8 ? personById(b.lastDamage.attacker) : null;
      if (attacker && !attacker.jailed && attacker.unconsciousUntil <= state.time && distance(b, attacker) < 6) {
        return { type: 'fight', target: attacker, x: attacker.x, y: attacker.y, speed: 1.08 };
      }
      const shoppingItem = botShoppingItem(b);
      if (shoppingItem) return { type: 'shop', item: shoppingItem, x: PLACES.mallCounter.x, y: PLACES.mallCounter.y, speed: 1.05 };
      if (homeSafe) return { type: 'guard-safe', target: homeSafe, x: homeSafe.x + .85, y: homeSafe.y, speed: botMoveSpeed(b), guardingHouse: homeSafe.house };
    }
    if (!b.wanderTarget || distance(b, b.wanderTarget) < .6) b.wanderTarget = randomFreeTarget(b);
    return { type: 'wander', x: b.wanderTarget.x, y: b.wanderTarget.y, speed: botMoveSpeed(b) };
  }

  function updateBots(dt) {
    for (const b of state.bots) {
      if (b.jailed || b.unconsciousUntil > state.time) { resetBotFaceOff(b); continue; }
      b.cooldown = Math.max(0, b.cooldown - dt);
      const mission = chooseBotGoal(b);
      const goal = prepareBotTravel(b, mission);
      b.goal = goal.type;
      moveBotTo(b, goal, dt, goal.speed);
      const close = Math.hypot(goal.x - b.x, goal.y - b.y);
      if (goal.transportOnly) {
        resetBotFaceOff(b);
        if (goal.type === 'enter-vehicle' && close < .78) enterBotVehicle(b, goal.target);
        else if ((goal.type.startsWith('drive-') || goal.type.startsWith('fly-')) && close < (b.vehicle === 'helicopter' ? 1.25 : .72)) exitVehicle(b, 'arrived');
        continue;
      }
      if (mission.type === 'shop' && close < .8 && tryPurchase(b, mission.item, true)) {
        b.pathTimer = 0;
        showMessage(`${b.id} köpte ${mission.item === 'baton' ? 'en klubba' : mission.item === 'car' ? 'en bil' : 'en helikopter'}!`, 2.2);
      }
      if (mission.type === 'note' && close < .8) { b.inventory.codes = true; state.thiefCodesKnown = true; b.pathTimer = 0; }
      if (mission.type === 'safe' && close < .75 && !mission.target.opened) {
        const theft = stealHouseSafe(b, mission.target); b.pathTimer = 0;
        if (theft) showMessage(`${b.id} stal ${theft.money} pengar från människan i Hus ${theft.house}!`, 3);
      }
      if (mission.type === 'key' && close < .75 && (!state.jailKeyHolder || state.jailKeyHolder === b.id)) {
        b.inventory.jailKey = true; state.jailKeyHolder = b.id; b.pathTimer = 0;
        recordEvent('jail-key', { thief: b.id });
      }
      if (mission.type === 'release' && close < 1.1) freeAllThieves(b.id);
      if (mission.type === 'boss' && close < 1.15 && b.cooldown <= 0) {
        b.cooldown = .65; state.boss.health = Math.max(0, state.boss.health - (b.inventory.baton ? BATON_DAMAGE : HAND_DAMAGE));
        recordEvent('boss-hit', { attacker: b.id, damage: b.inventory.baton ? BATON_DAMAGE : HAND_DAMAGE, health: state.boss.health });
        if (state.boss.health <= 0) { state.boss.health = 0; state.boss.defeated = true; showMessage(`${b.id} besegrade polisbossen!`, 4); checkWin(); }
      }
      const isRobotMelee = mission.type === 'thief-robot';
      const isMelee = mission.type === 'chase' || mission.type === 'fight' || isRobotMelee;
      const meleeDistance = mission.type === 'chase' ? .82 : isRobotMelee ? 1.15 : .9;
      if (isMelee && distance(b, mission.target) < meleeDistance) {
        const interval = ATTACK_INTERVAL[b.role] || .75;
        if (botMeleeReady(b, mission.target, interval)) {
          if (isRobotMelee) {
            damageThiefRobot(b, BATON_DAMAGE);
          } else if (mission.target.vehicleId) {
            const vehicle = state.vehicles.find(candidate => candidate.id === mission.target.vehicleId);
            const damage = b.inventory.baton ? BATON_DAMAGE : HAND_DAMAGE;
            if (vehicle) {
              vehicle.health = Math.max(0, vehicle.health - damage);
              recordEvent('vehicle-hit', { attacker: b.id, vehicle: vehicle.id, damage, health: vehicle.health });
              if (vehicle.health <= 0) destroyVehicle(vehicle);
              else if (mission.target === state.player) showMessage(`Fordonet träffades! ${vehicle.health}/10 liv`, 1);
            }
          } else {
            damagePerson(b, mission.target, HAND_DAMAGE, 'hand');
            if (mission.target === state.player && !state.player.jailed && state.player.unconsciousUntil <= state.time) showMessage(`${b.id} träffade dig! ${state.player.health}/3 liv`, 1);
          }
        }
      } else if (isMelee) {
        resetBotFaceOff(b);
      } else {
        resetBotFaceOff(b);
      }
    }
    const bossTarget = nearestActive('tjuv', state.boss, 1.55);
    if (!state.boss.defeated && bossTarget && state.boss.cooldown <= 0) {
      state.boss.cooldown = 1.1;
      if (bossTarget.vehicleId) {
        const vehicle = state.vehicles.find(candidate => candidate.id === bossTarget.vehicleId);
        if (vehicle) {
          vehicle.health = Math.max(0, vehicle.health - 1);
          if (vehicle.health <= 0) destroyVehicle(vehicle);
        } else {
          exitVehicle(bossTarget, 'missing');
        }
      } else {
        bossTarget.health--;
        if (bossTarget.health <= 0) jailThief(bossTarget);
      }
    }
    const robot = state.thiefRobot;
    robot.cooldown = Math.max(0, robot.cooldown - dt);
    const robotTarget = allThievesJailed() && !robot.defeated ? nearestActive('polis', robot, 1.55) : null;
    if (robotTarget && robot.cooldown <= 0) {
      robot.cooldown = 1.1;
      if (robotTarget.vehicleId) {
        const vehicle = state.vehicles.find(candidate => candidate.id === robotTarget.vehicleId);
        if (vehicle) {
          vehicle.health = Math.max(0, vehicle.health - 1);
          recordEvent('thief-robot-attack', { target: robotTarget.id, vehicle: vehicle.id, damage: 1, health: vehicle.health });
          if (vehicle.health <= 0) destroyVehicle(vehicle);
        } else {
          exitVehicle(robotTarget, 'missing');
        }
      } else {
        damagePerson(robot, robotTarget, 1, 'robot');
        recordEvent('thief-robot-attack', { target: robotTarget.id, damage: 1, health: robotTarget.health });
        if (robotTarget === state.player && robotTarget.unconsciousUntil <= state.time) showMessage(`Tjuvroboten träffade dig! ${robotTarget.health}/3 liv`, 1);
      }
    }
  }

  function jailThief(thief, captor = null) {
    if (thief.jailed) return false;
    const cell = state.jailCells.find(candidate => candidate.occupant === null);
    if (!cell) return false;
    if (thief.vehicleId) exitVehicle(thief, 'jailed');
    if (thief.pendingVehicleId) {
      const reserved = state.vehicles.find(vehicle => vehicle.id === thief.pendingVehicleId);
      if (reserved?.reservedBy === thief.id) reserved.reservedBy = null;
      thief.pendingVehicleId = null;
    }
    thief.health = 3; thief.jailed = true; thief.jailCell = cell.index;
    if ('safeTargetId' in thief) thief.safeTargetId = null;
    if (thief !== state.player) resetBotFaceOff(thief);
    if (thief.inventory?.jailKey) { thief.inventory.jailKey = false; if (state.jailKeyHolder === thief.id) state.jailKeyHolder = null; }
    cell.occupant = thief === state.player ? 'spelaren' : thief.id;
    thief.x = cell.x; thief.y = cell.y;
    const unlockedRaid = !allThievesJailed() && state.jailedThieves + 1 >= ROLE_TOTALS.tjuv;
    state.jailedThieves = clamp(state.jailedThieves + 1, 0, ROLE_TOTALS.tjuv);
    let rewardText = '';
    if (captor?.role === 'polis') {
      captor.money += 10;
      captor.captures = (captor.captures || 0) + 1;
      rewardText = ` ${captor === state.player ? 'Du fick' : `${captor.id} fick`} +10 pengar!`;
    }
    state.lastCapture = { thief: thief.id, captor: captor?.id || 'polisbossen', reward: captor?.role === 'polis' ? 10 : 0 };
    recordEvent('capture', state.lastCapture);
    if (unlockedRaid) {
      recordEvent('thief-robot-activated', { health: state.thiefRobot.health });
      showMessage(`Alla fem tjuvar är fångade!${rewardText} Tjuvhuset är upplåst – besegra tjuvroboten!`, 7);
    } else {
      showMessage(`${thief === state.player ? 'Du har blivit fångad!' : `${thief.id} skickades till fängelset!`}${rewardText}`, 4);
    }
    checkWin();
    return true;
  }

  function destroyVehicle(vehicle) {
    const driver = vehicle.driverId ? personById(vehicle.driverId) : null;
    if (driver) exitVehicle(driver, 'destroyed');
    for (const bot of state.bots) if (bot.pendingVehicleId === vehicle.id) { bot.pendingVehicleId = null; resetBotFaceOff(bot); }
    vehicle.destroyed = true; vehicle.health = 0;
    vehicle.driverId = null; vehicle.reservedBy = null; vehicle.altitude = 0;
    recordEvent('vehicle-destroyed', { vehicle: vehicle.id });
    showMessage(`${vehicle.label.toUpperCase()} SPRÄNGDES!`, 3);
    playTone(95, .35, 'sawtooth');
  }

  function checkWin() {
    const oldMode = state.mode;
    if (allThievesJailed() && state.thiefRobot.defeated) state.mode = 'police-win';
    else if (state.stolen >= 500 && state.boss.defeated) state.mode = 'thief-win';
    if (state.mode !== oldMode) playTone(740, .45, 'triangle');
  }

  function homeTeleportAvailable() {
    const p = state.player;
    return state.mode === 'playing' && p?.role === 'människa' && !p.jailed && p.unconsciousUntil <= state.time
      && currentBuildingAt(p.x, p.y)?.id !== PLAYER_HOME.id;
  }

  function syncHomeButton() {
    if (!homeButton) return;
    const available = homeTeleportAvailable();
    homeButton.hidden = !available;
    homeButton.disabled = !available;
  }

  function teleportPlayerHome() {
    const p = state.player;
    if (!p || p.role !== 'människa' || state.mode !== 'playing') return false;
    if (p.jailed || p.unconsciousUntil > state.time) return false;
    if (currentBuildingAt(p.x, p.y)?.id === PLAYER_HOME.id) {
      showMessage('Du är redan hemma i Hus 1!', 2);
      return false;
    }
    state.shopOpen = false;
    state.codesOpen = false;
    const parkedVehicle = p.vehicleId ? exitVehicle(p, 'home-teleport') : null;
    p.x = PLAYER_HOME.x;
    p.y = PLAYER_HOME.y;
    p.angle = PLAYER_HOME.angle;
    p.pitch = 0;
    p.altitude = 0;
    state.cameraBob = 0;
    state.lastBuildingId = PLAYER_HOME.id;
    state.lastHomeTeleport = { time: +state.time.toFixed(2), person: p.id, house: PLAYER_HOME.house, parkedVehicle: parkedVehicle?.id || null };
    recordEvent('home-teleport', state.lastHomeTeleport);
    showMessage(`Du teleporterades hem till Hus ${PLAYER_HOME.house}!${parkedVehicle ? ' Ditt fordon står kvar.' : ''}`, 4);
    render();
    return true;
  }

  function render() {
    if (state.mode === 'role-select') drawRoleSelect(); else drawWorld();
    syncHomeButton();
  }

  function interact() {
    if (state.mode !== 'playing') return;
    const p = state.player;
    if (state.shopOpen) { state.shopOpen = false; return; }
    if (state.codesOpen) { state.codesOpen = false; return; }
    if (p.jailed || p.unconsciousUntil > state.time) return;
    if (p.vehicleId) {
      if (p.role === 'polis' && !allThievesJailed() && currentBuildingAt(p.x, p.y)?.type === 'hideout') {
        showMessage('Poliser får flyga över tjuvhuset, men inte landa eller gå in!', 4);
        return;
      }
      exitVehicle(p, 'player-exit');
      showMessage('Du steg ur fordonet');
      return;
    }
    let nearbyVehicle = null, vehicleDistance = 1.65;
    for (const vehicle of state.vehicles) {
      const d = distance(p, vehicle);
      if (!vehicle.destroyed && d < vehicleDistance) { vehicleDistance = d; nearbyVehicle = vehicle; }
    }
    if (nearbyVehicle) {
      if (nearbyVehicle.driverId) { showMessage('Någon kör redan det fordonet'); return; }
      const owned = nearbyVehicle.owner === p.role || nearbyVehicle.owner === 'player';
      const hasType = nearbyVehicle.type === 'car' ? p.inventory.car : p.inventory.helicopter;
      if (!owned || !hasType) { showMessage(`Du måste köpa ${nearbyVehicle.type === 'car' ? 'bilen' : 'helikoptern'} i affären först`); return; }
      if (nearbyVehicle.reservedBy) {
        const reservingBot = personById(nearbyVehicle.reservedBy);
        if (reservingBot) reservingBot.pendingVehicleId = null;
        nearbyVehicle.reservedBy = null;
      }
      p.vehicle = nearbyVehicle.type; p.vehicleId = nearbyVehicle.id; p.x = nearbyVehicle.x; p.y = nearbyVehicle.y;
      nearbyVehicle.driverId = p.id;
      recordEvent('vehicle-enter', { person: p.id, vehicle: nearbyVehicle.id, vehicleType: nearbyVehicle.type });
      showMessage(`Du kör nu ${nearbyVehicle.label}. E = stig ur${nearbyVehicle.type === 'helicopter' ? ', R/C = upp/ner' : ''}`, 4);
      return;
    }
    let safe = null;
    for (const candidate of state.safes) if (!candidate.opened && distance(p, candidate) < 1.45) safe = candidate;
    if (safe) {
      if (p.role !== 'tjuv') { showMessage('Bara tjuvarna kan öppna kassaskåp'); return; }
      if (!p.inventory.codes) { showMessage('Du behöver kodlappen från polishuset'); return; }
      const theft = stealHouseSafe(p, safe);
      if (theft) showMessage(`Kod ${safe.code}! Du stal ${theft.money} pengar från människan i Hus ${theft.house}`, 4);
      return;
    }
    if (Math.hypot(p.x - PLACES.codeNote.x, p.y - PLACES.codeNote.y) < 1.45) {
      p.inventory.codes = true; state.thiefCodesKnown ||= p.role === 'tjuv'; state.codesOpen = true; return;
    }
    if (Math.hypot(p.x - PLACES.jailKey.x, p.y - PLACES.jailKey.y) < 1.35 && !p.inventory.jailKey) {
      if (p.role !== 'tjuv') { showMessage('Det är nyckeln till de fem fängelsecellerna'); return; }
      if (state.jailKeyHolder && state.jailKeyHolder !== p.id) { showMessage('En annan tjuv har redan nyckeln'); return; }
      p.inventory.jailKey = true; state.jailKeyHolder = p.id; showMessage('Du tog fängelsenyckeln!'); return;
    }
    if (Math.hypot(p.x - PLACES.jailRelease.x, p.y - PLACES.jailRelease.y) < 2 && p.role === 'tjuv') {
      if (!p.inventory.jailKey) { showMessage('Du behöver nyckeln som ligger bredvid kodlappen'); return; }
      if (!state.jailedThieves) { showMessage('Ingen tjuv sitter i fängelse'); return; }
      freeAllThieves('Du'); return;
    }
    if (currentBuildingAt(p.x, p.y)?.id === shop.id) {
      state.shopOpen = true; state.mallReceipt = ''; return;
    }
    let nearest = null, best = 1.7;
    for (const door of doors.values()) {
      const d = Math.hypot(p.x - (door.x + .5), p.y - (door.y + .5));
      if (d < best) { best = d; nearest = door; }
    }
    if (nearest) {
      if (p.role === 'polis' && nearest.buildingType === 'hideout' && !allThievesJailed()) {
        showMessage('Fånga alla fem tjuvar först! Då låses tjuvhuset upp.', 4);
        return;
      }
      nearest.open = !nearest.open; playTone(nearest.open ? 420 : 280, .08, 'square');
      showMessage(`${nearest.label}: dörren är ${nearest.open ? 'öppen' : 'stängd'}`); return;
    }
    showMessage('Inget att använda här');
  }

  function buy(item) {
    const p = state.player;
    if (!state.shopOpen || !p) return;
    const price = ITEM_PRICE[item];
    if (!price) return;
    if ((item === 'baton' || item === 'helicopter') && p.role === 'människa') { state.mallReceipt = 'DEN VARAN FÅR MÄNNISKOR INTE KÖPA'; showMessage('Vanliga människor får bara köpa bil'); return; }
    if (p.inventory[item]) { state.mallReceipt = 'DU ÄGER REDAN DEN VARAN'; showMessage(`Du har redan ${item === 'baton' ? 'en klubba' : item === 'car' ? 'en bil' : 'en helikopter'}`); return; }
    if (p.money < price) { state.mallReceipt = `DU SAKNAR ${price - p.money} PENGAR`; showMessage(`Du behöver ${price - p.money} pengar till`); return; }
    if (!tryPurchase(p, item, false)) return;
    state.mallReceipt = `KÖPT: ${item === 'baton' ? 'KLUBBA' : item === 'car' ? 'BIL' : 'HELIKOPTER'}`;
    playTone(680, .12, 'triangle');
    showMessage(`Köpet klart: ${item === 'baton' ? 'klubba' : item === 'car' ? 'bil' : 'helikopter'}!`, 3);
  }

  function attack() {
    if (state.mode !== 'playing') return;
    const p = state.player;
    if (!p || p.jailed || p.unconsciousUntil > state.time) return;
    if (p.vehicleId) { showMessage('Stig ur fordonet för att slå', 1.2); return; }
    if (p.attackCooldown > 0) return;
    p.attackCooldown = ATTACK_INTERVAL[p.role] || .75;
    p.attackSwingUntil = state.time + .18;
    const damage = p.inventory.baton ? BATON_DAMAGE : HAND_DAMAGE;
    const source = p.inventory.baton ? 'baton' : 'hand';
    const robotDistance = distance(p, state.thiefRobot);
    const robotAngle = Math.abs(angleDiff(Math.atan2(state.thiefRobot.y - p.y, state.thiefRobot.x - p.x), p.angle));
    if (p.role === 'polis' && allThievesJailed() && !state.thiefRobot.defeated && robotDistance < 2.3 && robotAngle < .55) {
      damageThiefRobot(p, damage);
      if (!state.thiefRobot.defeated) showMessage(`Tjuvroboten har ${state.thiefRobot.health}/20 liv kvar`, 1.2);
      return;
    }
    const bossDistance = distance(p, state.boss);
    const bossAngle = Math.abs(angleDiff(Math.atan2(state.boss.y - p.y, state.boss.x - p.x), p.angle));
    if (p.role === 'tjuv' && !state.boss.defeated && bossDistance < 2.3 && bossAngle < .55) {
      state.boss.health = Math.max(0, state.boss.health - damage);
      recordEvent('boss-hit', { attacker: p.id, damage, health: state.boss.health });
      if (state.boss.health <= 0) { state.boss.health = 0; state.boss.defeated = true; showMessage('Polisbossen är besegrad!', 4); checkWin(); }
      else showMessage(`Polisbossen har ${state.boss.health}/20 liv kvar`, 1.2);
      return;
    }
    let target = null, best = 2.05;
    for (const b of state.bots) {
      if (b.jailed || b.unconsciousUntil > state.time || b.vehicleId) continue;
      const d = distance(p, b), a = Math.abs(angleDiff(Math.atan2(b.y - p.y, b.x - p.x), p.angle));
      if (d < best && a < .48) { target = b; best = d; }
    }
    if (!target) {
      let vehicle = null, vehicleDistance = 2.2;
      for (const v of state.vehicles) {
        const d = distance(p, v), a = Math.abs(angleDiff(Math.atan2(v.y - p.y, v.x - p.x), p.angle));
        if (!v.destroyed && v.id !== p.vehicleId && d < vehicleDistance && a < .55) { vehicle = v; vehicleDistance = d; }
      }
      if (vehicle) {
        vehicle.health = Math.max(0, vehicle.health - damage);
        recordEvent('vehicle-hit', { attacker: p.id, vehicle: vehicle.id, damage, health: vehicle.health });
        if (vehicle.health <= 0) destroyVehicle(vehicle); else showMessage(`${vehicle.label}: ${vehicle.health}/10 liv`, 1);
        return;
      }
      showMessage('Du träffade ingen', 1); return;
    }
    damagePerson(p, target, damage, source);
    if (!target.jailed && target.unconsciousUntil <= state.time) showMessage(`${source === 'hand' ? 'Handslag' : 'Klubbslag'}! ${target.health}/3 liv kvar`, 1.2);
  }

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (state.mode === 'role-select' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) chooseRole({ Digit1: 'polis', Digit2: 'tjuv', Digit3: 'människa' }[e.code]);
    if (state.shopOpen && ['Digit1', 'Digit2', 'Digit3'].includes(e.code) && !e.repeat) buy({ Digit1: 'baton', Digit2: 'car', Digit3: 'helicopter' }[e.code]);
    if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) interact();
    if (e.code === 'KeyH' && !e.repeat) teleportPlayerHome();
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); attack(); }
    if (e.code === 'KeyF' && !e.repeat) { if (!document.fullscreenElement) gameFrame.requestFullscreen?.(); else document.exitFullscreen?.(); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * canvas.width / r.width, y = (e.clientY - r.top) * canvas.height / r.height;
    return { x, y };
  }
  canvas.addEventListener('click', e => {
    const point = canvasPoint(e);
    if (lookDragged) { lookDragged = false; return; }
    const overlayHit = state.overlayButtons?.find(b => point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h);
    if (overlayHit?.action === 'buy') { buy(overlayHit.item); return; }
    if (overlayHit?.action === 'restart') { window.location.reload(); return; }
    if (state.mode === 'role-select') {
      const hit = state.roleButtons?.find(b => point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h);
      if (hit) chooseRole(hit.role);
    }
    canvas.focus();
  });
  canvas.addEventListener('pointerdown', e => {
    if (state.mode !== 'playing' || state.shopOpen || state.codesOpen || state.player?.jailed || e.button !== 0) return;
    lookPointer = e.pointerId; lookLastX = e.clientX; lookLastY = e.clientY; lookDragged = false;
    canvas.setPointerCapture?.(e.pointerId); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== lookPointer || !state.player) return;
    const dx = e.clientX - lookLastX, dy = e.clientY - lookLastY;
    if (Math.abs(dx) + Math.abs(dy) > 1) lookDragged = true;
    state.player.angle = (state.player.angle + dx * .006 + TAU) % TAU;
    state.player.pitch = clamp(state.player.pitch + dy * .0022, -.28, .28);
    lookLastX = e.clientX; lookLastY = e.clientY; e.preventDefault();
  });
  const endLook = e => {
    if (e.pointerId !== lookPointer) return;
    canvas.releasePointerCapture?.(e.pointerId); lookPointer = null; e.preventDefault();
  };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);
  document.querySelectorAll('[data-action]').forEach(button => {
    const action = button.dataset.action;
    const code = { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', 'turn-left': 'ArrowLeft', 'turn-right': 'ArrowRight' }[action];
    const press = e => { e.preventDefault(); if (code) keys[code] = true; else if (action === 'up') keys.FlyUp = true; else if (action === 'down') keys.FlyDown = true; else if (action === 'interact') interact(); else if (action === 'attack') attack(); };
    const release = e => { e.preventDefault(); if (code) keys[code] = false; else if (action === 'up') keys.FlyUp = false; else if (action === 'down') keys.FlyDown = false; };
    button.addEventListener('pointerdown', press); button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('pointerleave', release);
  });
  homeButton?.addEventListener('click', teleportPlayerHome);
  document.getElementById('fullscreen-btn')?.addEventListener('click', () => { if (!document.fullscreenElement) gameFrame.requestFullscreen?.(); else document.exitFullscreen?.(); });
  document.getElementById('sound-btn')?.addEventListener('click', event => {
    soundOn = !soundOn;
    const icon = event.currentTarget.querySelector('span'); if (icon) icon.textContent = soundOn ? '🔊' : '🔇';
    event.currentTarget.setAttribute('aria-label', soundOn ? 'Stäng av ljudet' : 'Slå på ljudet');
    if (soundOn) playTone(620, .09, 'triangle');
  });

  window.render_game_to_text = () => JSON.stringify({
    coordinateSystem: 'Rutnät: (0,0) uppe till vänster; x ökar åt höger, y nedåt; vinklar i radianer.',
    mode: state.mode,
    player: state.player && {
      id: state.player.id,
      role: state.player.role,
      x: +state.player.x.toFixed(2),
      y: +state.player.y.toFixed(2),
      angle: +state.player.angle.toFixed(2),
      pitch: +state.player.pitch.toFixed(2),
      altitude: +state.player.altitude.toFixed(2),
      health: state.player.health,
      money: state.player.money,
      captures: state.player.captures,
      vehicle: state.player.vehicle,
      jailed: state.player.jailed,
      jailCell: state.player.jailCell,
      unconsciousSeconds: Math.max(0, +(state.player.unconsciousUntil - state.time).toFixed(1)),
      currentBuilding: state.player.altitude > .6 ? null : currentBuildingAt(state.player.x, state.player.y)?.id || null,
      inventory: state.player.inventory,
      home: state.player.role === 'människa' ? { id: PLAYER_HOME.id, house: PLAYER_HOME.house, x: PLAYER_HOME.x, y: PLAYER_HOME.y, teleportAvailable: homeTeleportAvailable() } : null,
    },
    city: {
      people: state.player ? 1 + state.bots.length : TOTAL_PEOPLE,
      bots: state.player ? state.bots.length : TOTAL_PEOPLE - 1,
      roleCounts: state.roleCounts,
      mapWidth: MAP_W,
      mapHeight: MAP_H,
      mapTiles: MAP_W * MAP_H,
      areaScale: CITY_AREA_SCALE,
      ordinaryHouseAreaScale: HOUSE_AREA_SCALE,
      structures: structures.map(s => {
        const oldArea = s.type === 'house' ? 36 : s.type === 'shop' ? 96 : 108;
        return { id: s.id, label: s.label, type: s.type, x: s.center.x, y: s.center.y, width: s.w, height: s.h, areaTiles: s.w * s.h, areaScale: +(s.w * s.h / oldArea).toFixed(2), doorOpen: doors.get(`${s.door.x},${s.door.y}`)?.open };
      }),
    },
    nearbyBots: state.player ? state.bots.filter(b => !b.jailed && distance(b, state.player) < 8).map(b => ({
      id: b.id, role: b.role, x: +b.x.toFixed(1), y: +b.y.toFixed(1), health: b.health, goal: b.goal, money: b.money,
      vehicle: b.vehicle, vehicleId: b.vehicleId, altitude: +b.altitude.toFixed(1), inventory: b.inventory,
      faceOffTarget: b.combatTargetId, faceOffSeconds: b.faceOffStartedAt === null ? 0 : +Math.max(0, b.nextMeleeAt - state.time).toFixed(2),
      lastAttackAt: b.lastAttackAt === null ? null : +b.lastAttackAt.toFixed(2),
      unconsciousSeconds: Math.max(0, +(b.unconsciousUntil - state.time).toFixed(1)),
    })) : [],
    bots: state.bots.map(b => ({
      id: b.id, role: b.role, x: +b.x.toFixed(1), y: +b.y.toFixed(1), health: b.health, money: b.money, goal: b.goal,
      jailed: b.jailed, vehicle: b.vehicle, vehicleId: b.vehicleId, altitude: +b.altitude.toFixed(1), preferredVehicle: b.preferredVehicle,
      inventory: b.inventory, faceOffTarget: b.combatTargetId, homeHouse: homeSafeFor(b)?.house || null, safeTargetId: b.safeTargetId || null,
    })),
    interactives: state.player ? {
      shopOpen: state.shopOpen,
      mallVisits: state.mallVisits,
      mallReceipt: state.mallReceipt,
      codesOpen: state.codesOpen,
      thiefCodesKnown: state.thiefCodesKnown,
      jailKeyHolder: state.jailKeyHolder,
      unopenedSafes: state.safes.filter(s => !s.opened).map(s => ({ house: s.house, homeowner: s.ownerId, x: s.x, y: s.y, money: s.money })),
      jailCells: state.jailCells.map(cell => ({ number: cell.index + 1, occupant: cell.occupant, x: cell.x, y: cell.y })),
      vehicles: state.vehicles.map(v => ({
        id: v.id, type: v.type, x: +v.x.toFixed(1), y: +v.y.toFixed(1), altitude: +(v.altitude || 0).toFixed(1),
        health: v.health, owner: v.owner, driverId: v.driverId, reservedBy: v.reservedBy, destroyed: v.destroyed,
      })),
    } : null,
    policeTeam: [state.player, ...state.bots].filter(person => person?.role === 'polis').map(person => ({ id: person.id, money: person.money, captures: person.captures || 0 })),
    accessRules: {
      allRolesCanEnterOrdinaryHouses: true,
      policeCanEnterHideout: allThievesJailed(),
      policeHideoutUnlockAtJailedThieves: ROLE_TOTALS.tjuv,
      thievesCanEnterPoliceStation: true,
    },
    combatRules: { handDamage: HAND_DAMAGE, batonDamage: BATON_DAMAGE, faceOffDelay: FACE_OFF_DELAY, policeAttackSeconds: ATTACK_INTERVAL.polis, thiefAttackSeconds: ATTACK_INTERVAL.tjuv },
    movementRules: { policeBot: BOT_MOVE_SPEED.polis, thiefBot: BOT_MOVE_SPEED.tjuv, policeAndThiefBotsSameSpeed: true, thiefSpeedMultiplier: 1 },
    thiefBotRules: {
      priorities: ['fight-nearby-police', 'rescue-jailed-thieves', 'read-code-note', 'steal-all-safe-money', 'shop-after-all-safes', 'defeat-police-boss'],
      shoppingWaitsUntilAllSafesAreEmpty: true,
    },
    guardRules: { civilianBotsGuardOwnSafe: true, humanPlayerId: 'människa-1', humanPlayerHome: PLAYER_HOME.id, homeTeleportKey: 'H' },
    lastHouseTheft: state.lastHouseTheft,
    lastHomeTeleport: state.lastHomeTeleport,
    lastCapture: state.lastCapture,
    lastRescue: state.lastRescue,
    recentEvents: state.events.slice(-12),
    objectives: {
      stolenMoney: state.stolen, totalSafeMoney: 500, jailedThieves: state.jailedThieves,
      bossHealth: state.boss.health, bossDefeated: state.boss.defeated,
      hideoutUnlockedForPolice: allThievesJailed(),
      thiefRobotActive: allThievesJailed() && !state.thiefRobot.defeated,
      thiefRobotHealth: state.thiefRobot.health,
      thiefRobotDefeated: state.thiefRobot.defeated,
    },
    thiefRobot: {
      id: state.thiefRobot.id, x: state.thiefRobot.x, y: state.thiefRobot.y,
      health: state.thiefRobot.health, maxHealth: state.thiefRobot.maxHealth,
      active: allThievesJailed() && !state.thiefRobot.defeated, defeated: state.thiefRobot.defeated,
    },
    message: state.messageUntil > state.time ? state.message : '',
  });
  window.advanceTime = ms => {
    manualTime = true;
    const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(1 / 60);
    render();
  };
  window.__wilderTest = {
    state, chooseRole, interact, attack, buy, jailThief, freeAllThieves, findBotPath, chooseBotGoal, prepareBotTravel,
    tryPurchase, enterBotVehicle, exitVehicle, botMeleeReady, damagePerson, damageThiefRobot, stealHouseSafe, homeSafeFor, activeThiefInHome, assignedSafeForThief,
    homeTeleportAvailable, teleportPlayerHome, botMoveSpeed, moveBotTo, render, doors, structures, places: PLACES, playerHome: PLAYER_HOME,
    allThievesJailed, canEnterBuilding, checkWin,
  };
  window.__wilderFallback = window.__wilderTest;

  let last = performance.now();
  function frame(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; if (!manualTime) update(dt); render(); requestAnimationFrame(frame); }
  render(); requestAnimationFrame(frame);
})();
