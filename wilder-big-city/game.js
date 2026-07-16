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
  const PROJECTION_DISTANCE = canvas.width / (2 * Math.tan(FOV / 2));
  const COARSE_RENDER_PROFILE = navigator.maxTouchPoints > 1 || !!window.matchMedia?.('(pointer: coarse)').matches;
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
  const stableNoise = value => {
    const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
    return raw - Math.floor(raw);
  };
  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(Math.abs(width) / 2, Math.abs(height) / 2, Math.max(0, radius));
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }
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
    effects: [],
    mallReceipt: '',
    boss: { kind: 'boss', x: PLACES.boss.x, y: PLACES.boss.y, health: 20, maxHealth: 20, defeated: false, cooldown: 0 },
    thiefRobot: {
      kind: 'thiefRobot', id: 'tjuvrobot', role: 'robot', x: PLACES.thiefRobot.x, y: PLACES.thiefRobot.y,
      health: 20, maxHealth: 20, defeated: false, cooldown: 0,
    },
    lastHouseTheft: null,
    lastHomeTeleport: null,
    jailCells: [[11.5, 102.5], [15.5, 102.5], [19.5, 102.5], [23.5, 102.5], [27.5, 102.5]]
      .map(([x, y], index) => ({ kind: 'cell', index, x, y, occupant: null, label: `CELL ${index + 1}` })),
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
  const structureIndexAtCell = new Int16Array(MAP_W * MAP_H);
  structureIndexAtCell.fill(-1);
  const exteriorWallAtCell = new Uint8Array(MAP_W * MAP_H);
  structures.forEach((building, index) => {
    for (let y = building.y; y < building.y + building.h; y++) {
      for (let x = building.x; x < building.x + building.w; x++) {
        const cellIndex = y * MAP_W + x;
        structureIndexAtCell[cellIndex] = index;
        if (x === building.x || x === building.x + building.w - 1 || y === building.y || y === building.y + building.h - 1) exteriorWallAtCell[cellIndex] = 1;
      }
    }
  });
  state.safes = structures.filter(s => s.type === 'house').map((s, i) => ({
    kind: 'safe', id: `safe-${i + 1}`, house: i + 1, ownerId: `människa-${i + 1}`,
    x: s.x + 3.5, y: s.y + 3.5, code: SAFE_CODES[i], money: 50, opened: false,
  }));
  state.vehicles = [
    { id: 'police-car', type: 'car', label: 'polisbil', x: 13.5, y: 112.5, health: 10, maxHealth: 10, owner: 'polis', driverId: null, reservedBy: null, altitude: 0, destroyed: false },
    { id: 'police-heli', type: 'helicopter', label: 'polishelikopter', x: 31.5, y: 112.5, health: 10, maxHealth: 10, owner: 'polis', driverId: null, reservedBy: null, altitude: 0, destroyed: false },
    { id: 'shop-car', type: 'car', label: 'bil', x: 68.5, y: 112.5, health: 10, maxHealth: 10, owner: null, driverId: null, reservedBy: null, altitude: 0, destroyed: false },
    { id: 'shop-heli', type: 'helicopter', label: 'helikopter', x: 84.5, y: 112.5, health: 10, maxHealth: 10, owner: null, driverId: null, reservedBy: null, altitude: 0, destroyed: false },
  ];
  state.vehicles.forEach(vehicle => { vehicle.kind = 'vehicle'; });
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
  const buildingSigns = structures.map(s => ({ kind: 'sign', x: s.door.x + .5, y: s.door.y + 1.1, label: s.label, color: s.type === 'police' ? '#2f78d0' : s.type === 'hideout' ? '#a23d48' : s.type === 'shop' ? '#e5a92d' : '#3c5968' }));
  const codeNotePickup = { kind: 'pickup', x: PLACES.codeNote.x, y: PLACES.codeNote.y, label: 'KODLAPP', color: '#f2e7b3' };
  const jailKeyPickup = { kind: 'pickup', x: PLACES.jailKey.x, y: PLACES.jailKey.y, label: 'NYCKEL', color: '#f2c94c' };
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
  // iPad använder en lättare profil; datorer får extra markdetalj.
  floorCanvas.width = COARSE_RENDER_PROFILE ? 256 : 320;
  floorCanvas.height = COARSE_RENDER_PROFILE ? 160 : 200;
  const floorCtx = floorCanvas.getContext('2d', { alpha: false });
  const floorPixels = floorCtx.createImageData(floorCanvas.width, floorCanvas.height);
  const floorRayRelative = new Float32Array(floorCanvas.width);
  const floorRayCos = new Float32Array(floorCanvas.width);
  const floorDirX = new Float32Array(floorCanvas.width);
  const floorDirY = new Float32Array(floorCanvas.width);
  const WALL_RAYS = COARSE_RENDER_PROFILE ? 320 : Math.max(240, Math.floor(canvas.width / 2));
  const depthBuffer = new Float32Array(WALL_RAYS);
  const wallRayRelative = new Float32Array(WALL_RAYS);
  for (let x = 0; x < floorCanvas.width; x++) {
    floorRayRelative[x] = Math.atan((x + .5 - floorCanvas.width / 2) / (floorCanvas.width / 2) * Math.tan(FOV / 2));
    floorRayCos[x] = Math.cos(floorRayRelative[x]);
  }
  for (let ray = 0; ray < WALL_RAYS; ray++) {
    const cameraX = ((ray + .5) / WALL_RAYS) * 2 - 1;
    wallRayRelative[ray] = Math.atan(cameraX * Math.tan(FOV / 2));
  }

  const WALL_TEXTURE_SIZE = 64;
  const WALL_BASE_COLORS = Object.freeze({
    1: [91, 105, 113],
    2: [184, 157, 119],
    3: [129, 79, 37],
    4: [67, 113, 153],
    5: [190, 146, 61],
    6: [119, 63, 69],
  });
  function createWallTexture(cell) {
    const texture = document.createElement('canvas');
    texture.width = texture.height = WALL_TEXTURE_SIZE;
    const textureContext = texture.getContext('2d', { alpha: false });
    const image = textureContext.createImageData(WALL_TEXTURE_SIZE, WALL_TEXTURE_SIZE);
    const base = WALL_BASE_COLORS[cell] || WALL_BASE_COLORS[2];
    for (let y = 0; y < WALL_TEXTURE_SIZE; y++) {
      for (let x = 0; x < WALL_TEXTURE_SIZE; x++) {
        const grain = (stableNoise(cell * 9001 + x * 41 + y * 73) - .5) * (cell === 3 ? 24 : 17);
        let factor = 1 + (y / WALL_TEXTURE_SIZE - .5) * .08;
        let seam = false;
        if (cell === 3) {
          seam = x % 12 < 1;
          factor += Math.sin(x * .72 + stableNoise(y * 11) * 1.7) * .055;
        } else if (cell === 1) {
          seam = x % 16 < 1 || y % 16 < 1;
        } else if (cell === 4) {
          seam = x % 16 < 1 || y % 16 < 1;
          factor += x % 16 < 8 ? .035 : -.025;
        } else if (cell === 5) {
          seam = y % 12 < 1 || (x + (Math.floor(y / 12) % 2) * 8) % 16 < 1;
          factor += .025 * Math.sin(x * .2);
        } else {
          seam = y % 8 < 1 || (x + (Math.floor(y / 8) % 2) * 8) % 16 < 1;
        }
        if (seam) factor *= cell === 3 ? .55 : .63;
        const index = (y * WALL_TEXTURE_SIZE + x) * 4;
        image.data[index] = clamp(base[0] * factor + grain, 0, 255);
        image.data[index + 1] = clamp(base[1] * factor + grain, 0, 255);
        image.data[index + 2] = clamp(base[2] * factor + grain, 0, 255);
        image.data[index + 3] = 255;
      }
    }
    textureContext.putImageData(image, 0, 0);
    textureContext.fillStyle = 'rgba(255,255,255,.09)';
    textureContext.fillRect(2, 0, 1, WALL_TEXTURE_SIZE);
    textureContext.fillStyle = 'rgba(12,20,24,.12)';
    for (let scratch = 0; scratch < 5; scratch++) {
      const sx = Math.floor(stableNoise(cell * 31 + scratch * 17) * WALL_TEXTURE_SIZE);
      const sy = Math.floor(stableNoise(cell * 61 + scratch * 29) * WALL_TEXTURE_SIZE);
      textureContext.fillRect(sx, sy, 1, 3 + scratch);
    }
    textureContext.fillStyle = 'rgba(8,15,18,.3)'; textureContext.fillRect(0, WALL_TEXTURE_SIZE - 3, WALL_TEXTURE_SIZE, 3);
    textureContext.fillStyle = 'rgba(255,255,255,.1)'; textureContext.fillRect(0, 0, WALL_TEXTURE_SIZE, 1);
    if (cell === 3) {
      textureContext.strokeStyle = 'rgba(39,22,12,.62)'; textureContext.lineWidth = 2;
      textureContext.strokeRect(7, 7, 50, 50); textureContext.strokeRect(12, 12, 40, 16); textureContext.strokeRect(12, 34, 40, 17);
      textureContext.fillStyle = '#d9b44e'; textureContext.beginPath(); textureContext.arc(45, 32, 2.4, 0, TAU); textureContext.fill();
    }
    return texture;
  }
  const wallTextures = Object.freeze(Object.fromEntries([1, 2, 3, 4, 5, 6].map(cell => [cell, createWallTexture(cell)])));

  function createExteriorTexture(cell) {
    const texture = document.createElement('canvas'); texture.width = texture.height = WALL_TEXTURE_SIZE;
    const textureContext = texture.getContext('2d', { alpha: false });
    textureContext.drawImage(wallTextures[cell], 0, 0);
    if (![2, 4, 5, 6].includes(cell)) return texture;
    const rows = cell === 4 ? [7, 27, 47] : [10, 36];
    const windowHeight = cell === 4 ? 11 : 14;
    rows.forEach((y, row) => {
      textureContext.fillStyle = 'rgba(24,37,43,.95)'; textureContext.fillRect(12, y - 2, 40, windowHeight + 4);
      const warm = ((cell * 13 + row * 7) & 3) === 0;
      const glass = textureContext.createLinearGradient(0, y, 0, y + windowHeight);
      glass.addColorStop(0, warm ? '#f0c36c' : '#a8d0d8'); glass.addColorStop(.38, warm ? '#b9833d' : '#5f98aa'); glass.addColorStop(1, '#345b68');
      textureContext.fillStyle = glass; textureContext.fillRect(15, y, 34, windowHeight);
      textureContext.fillStyle = 'rgba(229,246,247,.55)'; textureContext.beginPath(); textureContext.moveTo(17, y + 1); textureContext.lineTo(26, y + 1); textureContext.lineTo(20, y + windowHeight - 1); textureContext.lineTo(16, y + windowHeight - 1); textureContext.closePath(); textureContext.fill();
      textureContext.fillStyle = 'rgba(25,40,46,.86)'; textureContext.fillRect(31, y, 2, windowHeight);
    });
    return texture;
  }

  function createInteriorTexture(cell) {
    const texture = document.createElement('canvas'); texture.width = texture.height = WALL_TEXTURE_SIZE;
    const textureContext = texture.getContext('2d', { alpha: false });
    const colors = { 1: [126, 137, 143], 2: [214, 204, 186], 3: [129, 79, 37], 4: [177, 195, 204], 5: [226, 216, 191], 6: [113, 119, 116] };
    const base = colors[cell] || colors[2], image = textureContext.createImageData(WALL_TEXTURE_SIZE, WALL_TEXTURE_SIZE);
    for (let y = 0; y < WALL_TEXTURE_SIZE; y++) {
      for (let x = 0; x < WALL_TEXTURE_SIZE; x++) {
        const variation = (stableNoise(cell * 717 + x * 23 + y * 47) - .5) * 7;
        const index = (y * WALL_TEXTURE_SIZE + x) * 4;
        image.data[index] = base[0] + variation; image.data[index + 1] = base[1] + variation; image.data[index + 2] = base[2] + variation; image.data[index + 3] = 255;
      }
    }
    textureContext.putImageData(image, 0, 0);
    textureContext.fillStyle = 'rgba(255,255,255,.12)'; textureContext.fillRect(0, 1, WALL_TEXTURE_SIZE, 2);
    textureContext.fillStyle = 'rgba(54,58,56,.2)'; textureContext.fillRect(0, 51, WALL_TEXTURE_SIZE, 2);
    textureContext.fillStyle = cell === 6 ? 'rgba(37,42,41,.48)' : 'rgba(79,67,54,.32)'; textureContext.fillRect(0, 58, WALL_TEXTURE_SIZE, 6);
    if (cell === 3) textureContext.drawImage(wallTextures[3], 0, 0);
    return texture;
  }

  function createTextureVariants(source) {
    const sourceContext = source.getContext('2d', { alpha: false });
    const original = sourceContext.getImageData(0, 0, WALL_TEXTURE_SIZE, WALL_TEXTURE_SIZE).data;
    return Array.from({ length: 6 }, (_, lightLevel) => Array.from({ length: 3 }, (_, fogLevel) => {
      const brightness = .45 + lightLevel * .11;
      const fog = fogLevel * .2;
      const texture = document.createElement('canvas'); texture.width = texture.height = WALL_TEXTURE_SIZE;
      const textureContext = texture.getContext('2d', { alpha: false });
      const image = textureContext.createImageData(WALL_TEXTURE_SIZE, WALL_TEXTURE_SIZE);
      for (let index = 0; index < original.length; index += 4) {
        image.data[index] = original[index] * brightness * (1 - fog) + 199 * fog;
        image.data[index + 1] = original[index + 1] * brightness * (1 - fog) + 224 * fog;
        image.data[index + 2] = original[index + 2] * brightness * (1 - fog) + 231 * fog;
        image.data[index + 3] = 255;
      }
      textureContext.putImageData(image, 0, 0);
      return texture;
    }));
  }

  const wallTextureSets = Object.freeze(Object.fromEntries([1, 2, 3, 4, 5, 6].map(cell => [cell, Object.freeze({
    base: createTextureVariants(wallTextures[cell]),
    exterior: createTextureVariants(createExteriorTexture(cell)),
    interior: createTextureVariants(createInteriorTexture(cell)),
  })])));

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
          kind: 'bot',
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
      const sx = w * (.5 + sunRel / FOV), sy = Math.max(38, horizon * .24);
      const glow = ctx.createRadialGradient(sx, sy, 3, sx, sy, 88);
      glow.addColorStop(0, 'rgba(255,252,218,1)');
      glow.addColorStop(.2, 'rgba(255,226,145,.72)');
      glow.addColorStop(.55, 'rgba(255,213,108,.2)');
      glow.addColorStop(1, 'rgba(255,213,108,0)');
      ctx.fillStyle = glow; ctx.fillRect(sx - 92, sy - 92, 184, 184);
      ctx.fillStyle = '#fff4d2'; ctx.beginPath(); ctx.arc(sx, sy, 17, 0, TAU); ctx.fill();
    }
    const cloudAngles = [-2.7, -1.6, -.25, .75, 1.8, 2.75];
    cloudAngles.forEach((cloudAngle, index) => {
      const rel = angleDiff(cloudAngle + state.time * .003, p.angle);
      if (Math.abs(rel) > FOV * .75) return;
      const x = w * (.5 + rel / FOV), y = 55 + (index % 3) * 38;
      ctx.fillStyle = 'rgba(102,144,164,.16)';
      ctx.beginPath(); ctx.ellipse(x, y + 8, 51, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.64)';
      ctx.beginPath(); ctx.ellipse(x, y, 48, 13, 0, 0, TAU); ctx.ellipse(x - 23, y - 7, 25, 15, 0, 0, TAU); ctx.ellipse(x + 17, y - 9, 30, 18, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(x - 12, y - 11, 22, 8, -.2, 0, TAU); ctx.fill();
    });

    // En avlägsen stad som följer kamerans riktning ger riktig parallax.
    for (let i = 0; i < 40; i++) {
      const buildingAngle = -Math.PI + i * TAU / 40;
      const rel = angleDiff(buildingAngle, p.angle);
      if (Math.abs(rel) > FOV * .68) continue;
      const x = w * (.5 + rel / FOV);
      const bw = 34 + stableNoise(i * 17) * 47;
      const bh = 25 + stableNoise(i * 43 + 9) * 92;
      const bx = x - bw / 2, by = horizon - bh;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(50,72,84,.42)' : i % 3 === 1 ? 'rgba(62,81,91,.36)' : 'rgba(42,64,78,.34)';
      ctx.fillRect(bx, by, bw, bh + 4);
      ctx.fillStyle = 'rgba(255,220,129,.28)';
      for (let wy = by + 15; wy < horizon - 9; wy += 21) {
        for (let wx = bx + 10; wx < bx + bw - 6; wx += 19) {
          if (stableNoise(i * 101 + wx * 3 + wy) > .42) ctx.fillRect(wx, wy, 5, 7);
        }
      }
      if (bh > 78) {
        ctx.strokeStyle = 'rgba(45,63,72,.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by - 18); ctx.stroke();
      }
    }
    const haze = ctx.createLinearGradient(0, horizon - 48, 0, horizon + 24);
    haze.addColorStop(0, 'rgba(205,229,232,0)'); haze.addColorStop(.72, 'rgba(205,229,232,.34)'); haze.addColorStop(1, 'rgba(205,229,232,0)');
    ctx.fillStyle = haze; ctx.fillRect(0, horizon - 48, w, 72);
  }

  function groundColorAt(wx, wy) {
    const ix = Math.floor(wx), iy = Math.floor(wy);
    if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return 0x587252;
    const zone = groundZones[iy * MAP_W + ix];
    const fx = wx - ix, fy = wy - iy;
    const microX = Math.floor(wx * 7), microY = Math.floor(wy * 7);
    const grain = ((microX * 37 ^ microY * 67) >>> 0) & 3;
    if (zone === 1) {
      const hRoad = HORIZONTAL_ROADS.find(r => Math.abs(wy - r.center) <= r.half);
      const vRoad = VERTICAL_ROADS.find(r => Math.abs(wx - r.center) <= r.half);
      const crosswalk = hRoad && vRoad && (
        (Math.abs(Math.abs(wy - hRoad.center) - (hRoad.half - .75)) < .58
          && Math.abs(wx - vRoad.center) < vRoad.half - .45
          && Math.floor(wx * 1.35) % 2 === 0)
        || (Math.abs(Math.abs(wx - vRoad.center) - (vRoad.half - .75)) < .58
          && Math.abs(wy - hRoad.center) < hRoad.half - .45
          && Math.floor(wy * 1.35) % 2 === 0)
      );
      const hLine = hRoad && Math.abs(wy - hRoad.center) < .18 && Math.floor(wx / 3.5) % 2 === 0;
      const vLine = vRoad && Math.abs(wx - vRoad.center) < .18 && Math.floor(wy / 3.5) % 2 === 0;
      if (crosswalk) return 0xd9dee0;
      if (hLine || vLine) return 0xe2bd49;
      const crack = (((microX * 73856093) ^ (microY * 19349663)) >>> 0) % 47 === 0;
      if (crack && (fx < .18 || fy < .16)) return 0x292e31;
      return [0x363c3f, 0x3b4144, 0x32383b, 0x404649][grain];
    }
    if (zone === 2) {
      const atCurb = (fx < .12 && ix > 0 && groundZones[iy * MAP_W + ix - 1] === 1)
        || (fx > .88 && ix + 1 < MAP_W && groundZones[iy * MAP_W + ix + 1] === 1)
        || (fy < .12 && iy > 0 && groundZones[(iy - 1) * MAP_W + ix] === 1)
        || (fy > .88 && iy + 1 < MAP_H && groundZones[(iy + 1) * MAP_W + ix] === 1);
      if (atCurb) return 0xd1cec1;
      if (fx < .045 || fy < .045) return 0x91928e;
      return grain % 2 ? 0xaaa9a1 : 0xb5b3aa;
    }
    if (zone === 3) {
      if (fy < .055) return 0x75583d;
      return grain % 2 ? 0x9a7652 : 0xa6815b;
    }
    if (zone === 4) return fx < .05 || fy < .05 ? 0x53636d : grain % 2 ? 0x687985 : 0x74858f;
    if (zone === 5) return fx < .045 || fy < .045 ? 0x80765f : grain % 2 ? 0xa3987d : 0xb0a489;
    if (zone === 6) return fx < .05 || fy < .05 ? 0x3b4140 : grain % 2 ? 0x505957 : 0x5b6461;
    if ((((microX * 83492791) ^ (microY * 297657976)) >>> 0) % 19 === 0) return 0x385b38;
    return [0x537b49, 0x5d8450, 0x496f43, 0x648b55][grain];
  }

  function drawGround(horizon, currentBuilding) {
    const w = canvas.width, h = canvas.height, p = state.player;
    const lowW = floorCanvas.width, lowH = floorCanvas.height;
    const lowHorizon = clamp(Math.floor(horizon / h * lowH), 0, lowH - 1);
    const cameraHeight = (.55 + p.altitude) * PROJECTION_DISTANCE, data = floorPixels.data;
    for (let x = 0; x < lowW; x++) {
      floorDirX[x] = Math.cos(p.angle + floorRayRelative[x]);
      floorDirY[x] = Math.sin(p.angle + floorRayRelative[x]);
    }
    for (let sy = lowHorizon; sy < lowH; sy++) {
      const screenY = sy / lowH * h;
      const rowDistance = Math.min(190, cameraHeight / Math.max(1, screenY - horizon));
      const fog = currentBuilding ? 0 : clamp((rowDistance - 30) / 155, 0, .48);
      const foregroundLight = .78 + .22 * clamp((screenY - horizon) / Math.max(1, h - horizon), 0, 1);
      for (let sx = 0; sx < lowW; sx++) {
        const rayDistance = rowDistance / Math.max(.2, floorRayCos[sx]);
        const color = groundColorAt(p.x + floorDirX[sx] * rayDistance, p.y + floorDirY[sx] * rayDistance);
        let r = color >> 16 & 255, g = color >> 8 & 255, b = color & 255;
        r *= foregroundLight * 1.03; g *= foregroundLight; b *= foregroundLight * .98;
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
    const horizon = h * (0.48 + p.pitch * .42 + state.cameraBob * 0.005);
    const currentBuilding = p.altitude > .6 ? null : currentBuildingAt(p.x, p.y);
    if (currentBuilding) {
      const ceiling = { house: '#ddd5c8', police: '#b7c5cc', shop: '#e9dfc8', hideout: '#747c79' }[currentBuilding.type];
      const ceilingGradient = ctx.createLinearGradient(0, 0, 0, horizon);
      ceilingGradient.addColorStop(0, '#48535b'); ceilingGradient.addColorStop(.72, ceiling); ceilingGradient.addColorStop(1, '#8a8d88');
      ctx.fillStyle = ceilingGradient; ctx.fillRect(0, 0, w, horizon);
      for (let light = 1; light < 6; light += 2) {
        const lx = w * light / 6;
        const lampGlow = ctx.createRadialGradient(lx, horizon * .17, 2, lx, horizon * .17, 70);
        lampGlow.addColorStop(0, 'rgba(255,248,205,.38)'); lampGlow.addColorStop(1, 'rgba(255,248,205,0)');
        ctx.fillStyle = lampGlow; ctx.fillRect(lx - 72, horizon * .17 - 48, 144, 96);
        ctx.fillStyle = 'rgba(255,248,213,.82)'; ctx.fillRect(lx - 28, horizon * .15, 56, 6);
      }
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#398fc4'); sky.addColorStop(.55, '#87c7df'); sky.addColorStop(1, '#cde5e5');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
      drawOutdoorSky(horizon);
    }
    drawGround(horizon, currentBuilding);
    const rays = WALL_RAYS;
    const colW = w / rays;
    state.depthBuffer = depthBuffer;
    for (let i = 0; i < rays; i++) {
      const rayAngle = p.angle + wallRayRelative[i];
      const ray = castRay(rayAngle);
      const corrected = ray.distance * Math.cos(rayAngle - p.angle);
      state.depthBuffer[i] = corrected;
      const wallWorldHeight = { 1: .28, 2: 1.05, 3: .98, 4: 1.24, 5: 1.14, 6: 1.07 }[ray.cell] || 1.02;
      const eyeZ = .55 + p.altitude;
      const top = horizon + (eyeZ - wallWorldHeight) * PROJECTION_DISTANCE / corrected;
      const bottom = horizon + eyeZ * PROJECTION_DISTANCE / corrected;
      const wallH = bottom - top;
      const screenX = i * colW;
      const textureX = clamp(Math.floor(ray.texture * WALL_TEXTURE_SIZE), 0, WALL_TEXTURE_SIZE - 1);
      const normalX = ray.side === 0 ? (Math.cos(rayAngle) > 0 ? -1 : 1) : 0;
      const normalY = ray.side === 1 ? (Math.sin(rayAngle) > 0 ? -1 : 1) : 0;
      const sunlight = currentBuilding ? .08 : Math.max(0, normalX * Math.cos(-.85) + normalY * Math.sin(-.85));
      const darkness = clamp(.18 + corrected * .012 + ray.side * .08 - sunlight * .22, .035, .62);
      const fogAlpha = currentBuilding ? 0 : clamp((corrected - 30) / 155, 0, .52);
      const cellIndex = ray.mapX >= 0 && ray.mapY >= 0 && ray.mapX < MAP_W && ray.mapY < MAP_H ? ray.mapY * MAP_W + ray.mapX : -1;
      const structureIndex = cellIndex >= 0 ? structureIndexAtCell[cellIndex] : -1;
      const hitBuilding = structureIndex >= 0 ? structures[structureIndex] : null;
      const sameInterior = !!(currentBuilding && hitBuilding && currentBuilding.id === hitBuilding.id);
      const textureKind = sameInterior ? 'interior' : cellIndex >= 0 && exteriorWallAtCell[cellIndex] && ray.cell !== 3 ? 'exterior' : 'base';
      const lightLevel = clamp(Math.round(((1 - darkness) - .45) / .11), 0, 5);
      const fogLevel = clamp(Math.round(fogAlpha / .2), 0, 2);
      const textureSet = wallTextureSets[ray.cell] || wallTextureSets[2];
      if (bottom > -h && top < h * 2) ctx.drawImage(textureSet[textureKind][lightLevel][fogLevel], textureX, 0, 1, WALL_TEXTURE_SIZE, screenX, top, colW + 1, wallH);
    }
    drawSprites(horizon);
    drawAtmosphereOverlay(currentBuilding);
    drawFirstPersonView();
    drawHud();
  }

  const atmosphereLayers = Object.freeze({
    outdoor: createAtmosphereLayer(false),
    indoor: createAtmosphereLayer(true),
  });

  function createAtmosphereLayer(indoor) {
    const layer = document.createElement('canvas');
    layer.width = Math.ceil(canvas.width / 2); layer.height = Math.ceil(canvas.height / 2);
    const layerContext = layer.getContext('2d');
    const w = layer.width, h = layer.height;
    const vignette = layerContext.createRadialGradient(w * .5, h * .48, h * .12, w * .5, h * .48, w * .62);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(.7, 'rgba(0,0,0,.025)');
    vignette.addColorStop(1, indoor ? 'rgba(3,8,12,.22)' : 'rgba(4,13,18,.17)');
    layerContext.fillStyle = vignette; layerContext.fillRect(0, 0, w, h);
    const horizonGlow = layerContext.createLinearGradient(0, h * .34, 0, h * .66);
    horizonGlow.addColorStop(0, 'rgba(255,240,200,0)');
    horizonGlow.addColorStop(.5, indoor ? 'rgba(255,230,175,.025)' : 'rgba(255,232,177,.06)');
    horizonGlow.addColorStop(1, 'rgba(255,240,200,0)');
    layerContext.fillStyle = horizonGlow; layerContext.fillRect(0, h * .34, w, h * .32);
    return layer;
  }

  function drawAtmosphereOverlay(currentBuilding) {
    ctx.drawImage(currentBuilding ? atmosphereLayers.indoor : atmosphereLayers.outdoor, 0, 0, canvas.width, canvas.height);
  }

  function projectSprite(x, y, scale = 1) {
    const p = state.player;
    const dx = x - p.x, dy = y - p.y, dist = Math.hypot(dx, dy);
    const rel = angleDiff(Math.atan2(dy, dx), p.angle);
    if (Math.abs(rel) > FOV * .72 || dist < .15) return null;
    const screenX = canvas.width / 2 + Math.tan(rel) * PROJECTION_DISTANCE;
    const correctedDistance = dist * Math.cos(rel);
    const projection = PROJECTION_DISTANCE / correctedDistance;
    const size = projection * scale;
    const rayIndex = clamp(Math.floor(screenX / canvas.width * state.depthBuffer.length), 0, state.depthBuffer.length - 1);
    if (state.depthBuffer[rayIndex] < correctedDistance - .25) return null;
    return { screenX, size, dist, correctedDistance, projection };
  }

  function spriteGroundY(pr, horizon) {
    return clamp(horizon + (.55 + state.player.altitude) * pr.projection, horizon + 2, canvas.height * 1.55);
  }

  function drawHealthBar(x, y, width, ratio, label = '') {
    const height = clamp(width * .075, 4, 8);
    if (label) {
      ctx.fillStyle = 'rgba(7,14,19,.82)';
      roundedRectPath(ctx, x - width / 2 - 5, y - 18, width + 10, 18 + height, 6); ctx.fill();
      ctx.fillStyle = '#f5f8f9'; ctx.font = `800 ${clamp(width * .12, 8, 13)}px system-ui`; ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 5);
    }
    ctx.fillStyle = '#7f2932'; roundedRectPath(ctx, x - width / 2, y, width, height, height / 2); ctx.fill();
    if (ratio > 0) {
      ctx.fillStyle = ratio > .35 ? '#55d36d' : '#ffc857';
      roundedRectPath(ctx, x - width / 2, y, Math.max(height, width * clamp(ratio, 0, 1)), height, height / 2); ctx.fill();
    }
  }

  function vehicleRole(vehicle) {
    if (vehicle.owner === 'polis' || vehicle.id.startsWith('police-')) return 'polis';
    if (vehicle.owner === 'player') return state.player?.role || 'människa';
    return personById(vehicle.owner)?.role || 'människa';
  }

  function drawVehicleSprite(vehicle, pr, horizon) {
    const baseY = spriteGroundY(pr, horizon);
    const sh = clamp(pr.projection * .43, 16, canvas.height * .95);
    const sw = sh * (vehicle.type === 'car' ? 1.58 : 1.92);
    const role = vehicleRole(vehicle);
    const bodyTop = role === 'polis' ? '#3e91d3' : role === 'tjuv' ? '#a53b4b' : '#d95b45';
    const bodyBottom = role === 'polis' ? '#174b80' : role === 'tjuv' ? '#612832' : '#8f3029';
    const altitude = vehicle.type === 'helicopter' ? (vehicle.altitude || 0) : 0;
    const airLift = altitude * pr.projection * .5;

    ctx.fillStyle = `rgba(4,10,13,${clamp(.36 - altitude * .09, .12, .36)})`;
    ctx.beginPath(); ctx.ellipse(pr.screenX, baseY + sh * .02, sw * (.5 - altitude * .05), sh * (.12 - altitude * .018), 0, 0, TAU); ctx.fill();

    if (vehicle.type === 'car') {
      const y = baseY - sh * .79;
      const bodyGradient = ctx.createLinearGradient(0, y, 0, baseY);
      bodyGradient.addColorStop(0, bodyTop); bodyGradient.addColorStop(.52, bodyTop); bodyGradient.addColorStop(1, bodyBottom);
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.moveTo(pr.screenX - sw * .49, y + sh * .37);
      ctx.quadraticCurveTo(pr.screenX - sw * .46, y + sh * .24, pr.screenX - sw * .27, y + sh * .22);
      ctx.lineTo(pr.screenX - sw * .17, y + sh * .04);
      ctx.quadraticCurveTo(pr.screenX, y - sh * .02, pr.screenX + sw * .17, y + sh * .04);
      ctx.lineTo(pr.screenX + sw * .27, y + sh * .22);
      ctx.quadraticCurveTo(pr.screenX + sw * .47, y + sh * .25, pr.screenX + sw * .49, y + sh * .4);
      ctx.lineTo(pr.screenX + sw * .45, y + sh * .72);
      ctx.lineTo(pr.screenX - sw * .45, y + sh * .72);
      ctx.closePath(); ctx.fill();

      const glass = ctx.createLinearGradient(0, y + sh * .04, 0, y + sh * .3);
      glass.addColorStop(0, '#d8f0f1'); glass.addColorStop(.42, '#78aebb'); glass.addColorStop(1, '#355f70');
      ctx.fillStyle = glass;
      ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .16, y + sh * .06); ctx.lineTo(pr.screenX + sw * .16, y + sh * .06); ctx.lineTo(pr.screenX + sw * .25, y + sh * .27); ctx.lineTo(pr.screenX - sw * .25, y + sh * .27); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(13,31,39,.72)'; ctx.lineWidth = Math.max(1, sh * .025); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .13, y + sh * .09); ctx.lineTo(pr.screenX - sw * .02, y + sh * .09); ctx.lineTo(pr.screenX - sw * .12, y + sh * .25); ctx.lineTo(pr.screenX - sw * .2, y + sh * .25); ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#151b1f';
      ctx.beginPath(); ctx.arc(pr.screenX - sw * .34, y + sh * .68, sh * .17, 0, TAU); ctx.arc(pr.screenX + sw * .34, y + sh * .68, sh * .17, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7e8b91';
      ctx.beginPath(); ctx.arc(pr.screenX - sw * .34, y + sh * .68, sh * .075, 0, TAU); ctx.arc(pr.screenX + sw * .34, y + sh * .68, sh * .075, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eaf4d0'; roundedRectPath(ctx, pr.screenX - sw * .42, y + sh * .46, sw * .12, sh * .1, sh * .025); ctx.fill();
      roundedRectPath(ctx, pr.screenX + sw * .3, y + sh * .46, sw * .12, sh * .1, sh * .025); ctx.fill();
      ctx.fillStyle = '#172127'; roundedRectPath(ctx, pr.screenX - sw * .18, y + sh * .5, sw * .36, sh * .11, sh * .025); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = Math.max(1, sh * .018); ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .39, y + sh * .34); ctx.lineTo(pr.screenX + sw * .39, y + sh * .34); ctx.stroke();
      if (role === 'polis') {
        const blink = Math.floor(state.time * 7) % 2 === 0;
        ctx.fillStyle = blink ? '#63c9ff' : '#f4f8ff'; ctx.fillRect(pr.screenX - sw * .12, y - sh * .01, sw * .11, sh * .055);
        ctx.fillStyle = blink ? '#f4f8ff' : '#2e93e8'; ctx.fillRect(pr.screenX + sw * .01, y - sh * .01, sw * .11, sh * .055);
        ctx.fillStyle = 'rgba(108,203,255,.24)'; ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .02, sw * .22, 0, TAU); ctx.fill();
      }
    } else {
      const centerY = baseY - airLift - sh * .45;
      const bodyGradient = ctx.createLinearGradient(0, centerY - sh * .32, 0, centerY + sh * .35);
      bodyGradient.addColorStop(0, bodyTop); bodyGradient.addColorStop(1, bodyBottom);
      ctx.fillStyle = bodyGradient;
      ctx.beginPath(); ctx.ellipse(pr.screenX - sw * .04, centerY, sw * .34, sh * .34, -.08, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(pr.screenX + sw * .2, centerY - sh * .09); ctx.lineTo(pr.screenX + sw * .73, centerY - sh * .2); ctx.lineTo(pr.screenX + sw * .76, centerY + sh * .05); ctx.lineTo(pr.screenX + sw * .2, centerY + sh * .13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2d4e5c'; ctx.beginPath(); ctx.ellipse(pr.screenX - sw * .14, centerY - sh * .08, sw * .18, sh * .19, -.12, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(218,240,241,.72)'; ctx.beginPath(); ctx.ellipse(pr.screenX - sw * .19, centerY - sh * .13, sw * .09, sh * .1, -.25, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#27343a'; ctx.lineWidth = Math.max(2, sh * .045); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .26, centerY + sh * .26); ctx.lineTo(pr.screenX - sw * .2, centerY + sh * .43); ctx.lineTo(pr.screenX + sw * .18, centerY + sh * .43); ctx.lineTo(pr.screenX + sw * .25, centerY + sh * .25); ctx.stroke();
      const rotor = state.time * 16;
      ctx.save(); ctx.translate(pr.screenX - sw * .02, centerY - sh * .39); ctx.rotate(rotor);
      ctx.strokeStyle = 'rgba(27,38,44,.62)'; ctx.lineWidth = Math.max(2, sh * .025);
      ctx.beginPath(); ctx.moveTo(-sw * .61, 0); ctx.lineTo(sw * .61, 0); ctx.moveTo(0, -sw * .16); ctx.lineTo(0, sw * .16); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#26343a'; ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .02, centerY - sh * .35); ctx.lineTo(pr.screenX - sw * .02, centerY - sh * .45); ctx.stroke();
      ctx.save(); ctx.translate(pr.screenX + sw * .75, centerY - sh * .08); ctx.rotate(-rotor * 1.8);
      ctx.beginPath(); ctx.moveTo(0, -sh * .13); ctx.lineTo(0, sh * .13); ctx.moveTo(-sh * .13, 0); ctx.lineTo(sh * .13, 0); ctx.stroke(); ctx.restore();
      if (role === 'polis') {
        ctx.fillStyle = '#e8f5ff'; ctx.fillRect(pr.screenX - sw * .27, centerY + sh * .03, sw * .48, sh * .07);
        ctx.fillStyle = Math.floor(state.time * 7) % 2 ? '#55c8ff' : '#f8fbff'; ctx.beginPath(); ctx.arc(pr.screenX, centerY - sh * .34, sh * .055, 0, TAU); ctx.fill();
      }
      ctx.lineCap = 'butt';
    }
    if (vehicle.health < vehicle.maxHealth || pr.dist < 6) drawHealthBar(pr.screenX, Math.max(10, baseY - airLift - sh * 1.02), sw * .72, vehicle.health / vehicle.maxHealth, `${vehicle.health}/10`);
  }

  function drawThiefRobotSprite(robot, pr, horizon) {
    const baseY = spriteGroundY(pr, horizon);
    const sh = clamp(pr.projection * 1.05, 32, canvas.height * 1.25), sw = sh * .5, y = baseY - sh;
    const pulse = robot.active ? .72 + Math.sin(state.time * 7) * .2 : .25;
    ctx.fillStyle = 'rgba(3,8,10,.38)'; ctx.beginPath(); ctx.ellipse(pr.screenX, baseY, sw * .78, sh * .095, 0, 0, TAU); ctx.fill();

    const legGradient = ctx.createLinearGradient(pr.screenX - sw * .5, 0, pr.screenX + sw * .5, 0);
    legGradient.addColorStop(0, '#11181c'); legGradient.addColorStop(.5, '#465158'); legGradient.addColorStop(1, '#11181c');
    ctx.fillStyle = legGradient;
    roundedRectPath(ctx, pr.screenX - sw * .42, y + sh * .72, sw * .29, sh * .27, sw * .08); ctx.fill();
    roundedRectPath(ctx, pr.screenX + sw * .13, y + sh * .72, sw * .29, sh * .27, sw * .08); ctx.fill();
    ctx.fillStyle = '#0f1519'; roundedRectPath(ctx, pr.screenX - sw * .5, y + sh * .92, sw * .4, sh * .09, sh * .025); ctx.fill();
    roundedRectPath(ctx, pr.screenX + sw * .1, y + sh * .92, sw * .4, sh * .09, sh * .025); ctx.fill();

    const bodyGradient = ctx.createLinearGradient(pr.screenX - sw * .65, 0, pr.screenX + sw * .65, 0);
    bodyGradient.addColorStop(0, '#182126'); bodyGradient.addColorStop(.2, '#59656b'); bodyGradient.addColorStop(.48, '#29343a'); bodyGradient.addColorStop(.78, '#4c585e'); bodyGradient.addColorStop(1, '#11181c');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .62, y + sh * .36); ctx.lineTo(pr.screenX - sw * .48, y + sh * .72); ctx.lineTo(pr.screenX + sw * .48, y + sh * .72); ctx.lineTo(pr.screenX + sw * .62, y + sh * .36); ctx.lineTo(pr.screenX + sw * .42, y + sh * .27); ctx.lineTo(pr.screenX - sw * .42, y + sh * .27); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9ca9af'; ctx.lineWidth = Math.max(1.5, sw * .035); ctx.stroke();
    const chest = ctx.createLinearGradient(0, y + sh * .38, 0, y + sh * .62);
    chest.addColorStop(0, '#a93749'); chest.addColorStop(1, '#5f1e2a');
    ctx.fillStyle = chest; roundedRectPath(ctx, pr.screenX - sw * .39, y + sh * .39, sw * .78, sh * .22, sw * .06); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(pr.screenX - sw * .33, y + sh * .42, sw * .66, sh * .025);
    for (const bolt of [-1, 1]) { ctx.fillStyle = '#c5cdd0'; ctx.beginPath(); ctx.arc(pr.screenX + bolt * sw * .31, y + sh * .64, sw * .035, 0, TAU); ctx.fill(); }

    ctx.strokeStyle = '#343f44'; ctx.lineWidth = Math.max(5, sw * .15); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .54, y + sh * .38); ctx.lineTo(pr.screenX - sw * .88, y + sh * .61); ctx.moveTo(pr.screenX + sw * .54, y + sh * .38); ctx.lineTo(pr.screenX + sw * .88, y + sh * .61); ctx.stroke();
    ctx.fillStyle = '#69757b'; ctx.beginPath(); ctx.arc(pr.screenX - sw * .72, y + sh * .5, sw * .1, 0, TAU); ctx.arc(pr.screenX + sw * .72, y + sh * .5, sw * .1, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c2ccd0'; ctx.lineWidth = Math.max(2, sw * .055);
    ctx.beginPath();
    ctx.moveTo(pr.screenX - sw * .88, y + sh * .61); ctx.lineTo(pr.screenX - sw * 1.05, y + sh * .55); ctx.moveTo(pr.screenX - sw * .88, y + sh * .61); ctx.lineTo(pr.screenX - sw * 1.04, y + sh * .72);
    ctx.moveTo(pr.screenX + sw * .88, y + sh * .61); ctx.lineTo(pr.screenX + sw * 1.05, y + sh * .55); ctx.moveTo(pr.screenX + sw * .88, y + sh * .61); ctx.lineTo(pr.screenX + sw * 1.04, y + sh * .72); ctx.stroke();

    const headGradient = ctx.createLinearGradient(pr.screenX - sw * .5, 0, pr.screenX + sw * .5, 0);
    headGradient.addColorStop(0, '#161e22'); headGradient.addColorStop(.45, '#59666c'); headGradient.addColorStop(1, '#12191d');
    ctx.fillStyle = headGradient; roundedRectPath(ctx, pr.screenX - sw * .47, y + sh * .04, sw * .94, sh * .27, sw * .08); ctx.fill();
    ctx.strokeStyle = '#b6c1c6'; ctx.lineWidth = Math.max(2, sw * .045); roundedRectPath(ctx, pr.screenX - sw * .47, y + sh * .04, sw * .94, sh * .27, sw * .08); ctx.stroke();
    ctx.fillStyle = '#10171b'; roundedRectPath(ctx, pr.screenX - sw * .35, y + sh * .105, sw * .7, sh * .11, sw * .045); ctx.fill();
    for (const eyeX of [-.18, .18]) {
      const ex = pr.screenX + sw * eyeX, ey = y + sh * .16;
      const eyeGlow = ctx.createRadialGradient(ex, ey, 1, ex, ey, sw * .2);
      eyeGlow.addColorStop(0, `rgba(255,75,95,${pulse})`); eyeGlow.addColorStop(1, 'rgba(255,48,71,0)'); ctx.fillStyle = eyeGlow; ctx.beginPath(); ctx.arc(ex, ey, sw * .2, 0, TAU); ctx.fill();
      ctx.fillStyle = robot.active ? '#ff4058' : '#772733'; roundedRectPath(ctx, ex - sw * .075, ey - sh * .018, sw * .15, sh * .036, sh * .012); ctx.fill();
    }
    ctx.strokeStyle = '#9faab0'; ctx.lineWidth = Math.max(2, sw * .045); ctx.beginPath(); ctx.moveTo(pr.screenX, y + sh * .04); ctx.lineTo(pr.screenX, y - sh * .09); ctx.stroke();
    const antennaY = y - sh * .1;
    const antennaGlow = ctx.createRadialGradient(pr.screenX, antennaY, 1, pr.screenX, antennaY, sw * .17);
    antennaGlow.addColorStop(0, `rgba(255,53,73,${pulse})`); antennaGlow.addColorStop(1, 'rgba(255,53,73,0)'); ctx.fillStyle = antennaGlow; ctx.beginPath(); ctx.arc(pr.screenX, antennaY, sw * .17, 0, TAU); ctx.fill();
    ctx.fillStyle = robot.active ? '#ff3549' : '#762631'; ctx.beginPath(); ctx.arc(pr.screenX, antennaY, sw * .055, 0, TAU); ctx.fill();
    ctx.lineCap = 'butt';
    drawHealthBar(pr.screenX, Math.max(9, y - 24), sw * 1.85, robot.health / robot.maxHealth, `TJUVROBOT ${robot.health}/${robot.maxHealth}`);
  }

  function drawPersonSprite(person, pr, horizon, boss = false) {
    const baseY = spriteGroundY(pr, horizon);
    const sh = clamp(pr.projection * (boss ? .92 : .72), 18, canvas.height * 1.28);
    const sw = sh * .34;
    const y = baseY - sh;
    const personNumber = Number(String(person.id).split('-').pop()) || 1;
    const skinColors = ['#e8b68a', '#c98b65', '#8e5b42', '#f0c49e'];
    const skin = skinColors[personNumber % skinColors.length];
    const civilianColors = [
      ['#3d9b74', '#1e5945'], ['#d07d3d', '#824221'], ['#6b71bd', '#34386d'],
      ['#c55074', '#743048'], ['#4c8f9a', '#28515a'], ['#9a7443', '#594123'],
    ];
    const palette = person.role === 'polis' ? ['#367fba', '#153f68']
      : person.role === 'tjuv' ? ['#9b3a4b', '#4e232c']
        : civilianColors[personNumber % civilianColors.length];
    const unconscious = person.unconsciousUntil > state.time;

    ctx.fillStyle = 'rgba(3,9,12,.3)';
    ctx.beginPath(); ctx.ellipse(pr.screenX, baseY + sh * .015, unconscious ? sh * .42 : sw * .88, unconscious ? sh * .075 : sh * .085, 0, 0, TAU); ctx.fill();
    if (unconscious) {
      const bodyGradient = ctx.createLinearGradient(pr.screenX - sh * .34, 0, pr.screenX + sh * .34, 0);
      bodyGradient.addColorStop(0, palette[1]); bodyGradient.addColorStop(.55, palette[0]); bodyGradient.addColorStop(1, palette[1]);
      ctx.fillStyle = bodyGradient; roundedRectPath(ctx, pr.screenX - sh * .3, baseY - sh * .16, sh * .55, sh * .16, sh * .07); ctx.fill();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(pr.screenX + sh * .31, baseY - sh * .09, sh * .085, 0, TAU); ctx.fill();
      if (pr.dist < 6) { ctx.fillStyle = '#dceff5'; ctx.font = `900 ${clamp(sh * .12, 9, 16)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('Z Z Z', pr.screenX, baseY - sh * .28); }
      return;
    }

    const moving = !!person.goal && !String(person.goal).includes('vaktar') && person.faceOffStartedAt === null;
    const stride = moving ? Math.sin(state.time * 8 + personNumber * 1.7) * sh * .035 : 0;
    const attacking = person.lastAttackAt !== null && state.time - person.lastAttackAt < .22;
    const hipY = y + sh * .7;
    ctx.strokeStyle = '#1a252d'; ctx.lineWidth = Math.max(3, sw * .42); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .16, hipY); ctx.lineTo(pr.screenX - sw * .24 + stride, baseY - sh * .035); ctx.moveTo(pr.screenX + sw * .16, hipY); ctx.lineTo(pr.screenX + sw * .24 - stride, baseY - sh * .035); ctx.stroke();
    ctx.strokeStyle = '#10181d'; ctx.lineWidth = Math.max(2, sw * .5);
    ctx.beginPath(); ctx.moveTo(pr.screenX - sw * .32 + stride, baseY - sh * .025); ctx.lineTo(pr.screenX - sw * .03 + stride, baseY - sh * .025); ctx.moveTo(pr.screenX + sw * .03 - stride, baseY - sh * .025); ctx.lineTo(pr.screenX + sw * .32 - stride, baseY - sh * .025); ctx.stroke();

    const torsoGradient = ctx.createLinearGradient(pr.screenX - sw, 0, pr.screenX + sw, 0);
    torsoGradient.addColorStop(0, palette[1]); torsoGradient.addColorStop(.46, palette[0]); torsoGradient.addColorStop(.72, palette[0]); torsoGradient.addColorStop(1, palette[1]);
    ctx.fillStyle = torsoGradient; roundedRectPath(ctx, pr.screenX - sw * .62, y + sh * .28, sw * 1.24, sh * .46, sw * .25); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.1)'; roundedRectPath(ctx, pr.screenX - sw * .46, y + sh * .31, sw * .22, sh * .37, sw * .08); ctx.fill();
    ctx.fillStyle = '#1d2830'; ctx.fillRect(pr.screenX - sw * .62, y + sh * .66, sw * 1.24, sh * .075);
    if (person.role === 'polis') {
      ctx.fillStyle = '#f2c64d'; ctx.beginPath(); ctx.moveTo(pr.screenX + sw * .17, y + sh * .39); ctx.lineTo(pr.screenX + sw * .32, y + sh * .43); ctx.lineTo(pr.screenX + sw * .27, y + sh * .56); ctx.lineTo(pr.screenX + sw * .08, y + sh * .56); ctx.lineTo(pr.screenX + sw * .03, y + sh * .43); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8edf8'; ctx.fillRect(pr.screenX - sw * .5, y + sh * .59, sw * .28, sh * .035);
    } else if (person.role === 'tjuv') {
      ctx.fillStyle = 'rgba(30,34,37,.72)'; ctx.fillRect(pr.screenX - sw * .54, y + sh * .44, sw * 1.08, sh * .055);
    }

    ctx.strokeStyle = palette[1]; ctx.lineWidth = Math.max(3, sw * .28); ctx.lineCap = 'round';
    const leftHandY = y + sh * (attacking ? .3 : .63), rightHandY = y + sh * (attacking ? .32 : .63);
    ctx.beginPath();
    ctx.moveTo(pr.screenX - sw * .52, y + sh * .38); ctx.lineTo(pr.screenX - sw * (attacking ? .95 : .78), leftHandY);
    ctx.moveTo(pr.screenX + sw * .52, y + sh * .38); ctx.lineTo(pr.screenX + sw * (attacking ? 1.02 : .78), rightHandY); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(pr.screenX - sw * (attacking ? .95 : .78), leftHandY, sw * .12, 0, TAU); ctx.arc(pr.screenX + sw * (attacking ? 1.02 : .78), rightHandY, sw * .12, 0, TAU); ctx.fill();

    const headGradient = ctx.createRadialGradient(pr.screenX - sw * .14, y + sh * .15, sw * .05, pr.screenX, y + sh * .17, sw * .5);
    headGradient.addColorStop(0, '#f8d0ad'); headGradient.addColorStop(.5, skin); headGradient.addColorStop(1, '#8d5c45');
    ctx.fillStyle = headGradient; ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .18, sw * .45, 0, TAU); ctx.fill();
    ctx.fillStyle = person.role === 'tjuv' ? '#262c31' : person.role === 'polis' ? '#173f6b' : ['#3b2a24', '#b98045', '#202327'][personNumber % 3];
    if (person.role === 'polis' || boss) {
      ctx.beginPath(); ctx.ellipse(pr.screenX, y + sh * .08, sw * .49, sh * .055, 0, 0, TAU); ctx.fill();
      roundedRectPath(ctx, pr.screenX - sw * .3, y - sh * .005, sw * .6, sh * .1, sw * .09); ctx.fill();
      if (boss) { ctx.fillStyle = '#f2c64d'; ctx.fillRect(pr.screenX - sw * .09, y + sh * .018, sw * .18, sh * .055); }
    } else {
      ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .13, sw * .44, Math.PI, TAU); ctx.fill();
    }
    if (person.role === 'tjuv') {
      ctx.fillStyle = 'rgba(27,31,35,.84)'; roundedRectPath(ctx, pr.screenX - sw * .38, y + sh * .135, sw * .76, sh * .09, sh * .035); ctx.fill();
    }
    ctx.fillStyle = '#17232a'; ctx.beginPath(); ctx.arc(pr.screenX - sw * .16, y + sh * .18, sw * .045, 0, TAU); ctx.arc(pr.screenX + sw * .16, y + sh * .18, sw * .045, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(91,48,38,.65)'; ctx.lineWidth = Math.max(1, sw * .025); ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .26, sw * .11, .15, Math.PI - .15); ctx.stroke();
    if (person.inventory?.baton) {
      const handX = pr.screenX + sw * (attacking ? 1.02 : .78);
      ctx.strokeStyle = '#182126'; ctx.lineWidth = Math.max(3, sw * .13); ctx.beginPath(); ctx.moveTo(handX, rightHandY); ctx.lineTo(handX + sw * (attacking ? .2 : .42), rightHandY - sh * (attacking ? .34 : .23)); ctx.stroke();
      ctx.strokeStyle = 'rgba(219,231,235,.4)'; ctx.lineWidth = Math.max(1, sw * .035); ctx.beginPath(); ctx.moveTo(handX + sw * .04, rightHandY - sh * .03); ctx.lineTo(handX + sw * (attacking ? .18 : .39), rightHandY - sh * (attacking ? .31 : .21)); ctx.stroke();
    }
    ctx.lineCap = 'butt';

    const damaged = person.health < person.maxHealth;
    if (boss || damaged || pr.dist < 4.5 || person.faceOffStartedAt !== null) {
      const label = boss ? `POLISBOSS ${person.health}/${person.maxHealth}` : damaged ? `${person.health}/${person.maxHealth}` : '';
      drawHealthBar(pr.screenX, Math.max(9, y - 13), boss ? sw * 2.5 : sw * 1.65, person.health / person.maxHealth, label);
    }
    if (person.faceOffStartedAt !== null && state.time < person.nextMeleeAt) {
      ctx.fillStyle = '#ffc857'; ctx.font = `900 ${clamp(sh * .15, 11, 22)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('!', pr.screenX, y - 19);
    }
  }

  function drawExplosionSprite(effect, pr, horizon) {
    const progress = clamp((state.time - effect.startedAt) / effect.duration, 0, 1);
    const baseY = spriteGroundY(pr, horizon) - effect.altitude * pr.projection;
    const centerY = baseY - pr.projection * .2;
    const radius = clamp(pr.projection * (.14 + Math.sin(progress * Math.PI) * .34), 12, canvas.height * .55);
    ctx.save(); ctx.globalAlpha = 1 - progress * .86;
    const fire = ctx.createRadialGradient(pr.screenX - radius * .16, centerY - radius * .18, radius * .04, pr.screenX, centerY, radius);
    fire.addColorStop(0, '#fff8c7'); fire.addColorStop(.18, '#ffd45d'); fire.addColorStop(.48, '#f06a2b'); fire.addColorStop(.74, '#9d2e24'); fire.addColorStop(1, 'rgba(35,42,44,0)');
    ctx.fillStyle = fire; ctx.beginPath(); ctx.arc(pr.screenX, centerY, radius, 0, TAU); ctx.fill();
    for (let puff = 0; puff < 5; puff++) {
      const angle = stableNoise(effect.seed * 100 + puff * 17) * TAU;
      const travel = radius * (.18 + progress * .55);
      const px = pr.screenX + Math.cos(angle) * travel, py = centerY + Math.sin(angle) * travel * .6 - progress * radius * .22;
      ctx.fillStyle = `rgba(45,51,52,${.34 + progress * .35})`; ctx.beginPath(); ctx.arc(px, py, radius * (.16 + puff * .018), 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#ffd45d'; ctx.lineCap = 'round';
    for (let spark = 0; spark < 10; spark++) {
      const angle = stableNoise(effect.seed * 1000 + spark * 31) * TAU;
      const length = radius * (.55 + stableNoise(effect.seed * 300 + spark * 13) * .65) * progress;
      ctx.lineWidth = Math.max(1, radius * .025);
      ctx.beginPath(); ctx.moveTo(pr.screenX + Math.cos(angle) * radius * .25, centerY + Math.sin(angle) * radius * .2); ctx.lineTo(pr.screenX + Math.cos(angle) * length, centerY + Math.sin(angle) * length * .75); ctx.stroke();
    }
    ctx.restore(); ctx.lineCap = 'butt';
  }

  function drawSprites(horizon) {
    const sprites = [];
    const queue = (sprite, maxDistance = 58) => {
      const dx = sprite.x - state.player.x, dy = sprite.y - state.player.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > maxDistance * maxDistance) return;
      const rel = angleDiff(Math.atan2(dy, dx), state.player.angle);
      if (Math.abs(rel) > FOV * .82 && distanceSquared > 2.25) return;
      sprite._renderDistanceSquared = distanceSquared;
      sprites.push(sprite);
    };
    buildingSigns.forEach(sign => queue(sign, 11));
    for (const bot of state.bots) if (!bot.jailed && !bot.vehicleId) queue(bot, 52);
    for (const safe of state.safes) if (!safe.opened) queue(safe, 34);
    for (const vehicle of state.vehicles) if (!vehicle.destroyed && vehicle.id !== state.player.vehicleId) queue(vehicle, 62);
    furniture.forEach(item => queue(item, 34));
    cityProps.forEach(item => queue(item, 54));
    if (!state.boss.defeated) queue(state.boss, 42);
    if (!state.thiefRobot.defeated) { state.thiefRobot.active = allThievesJailed(); queue(state.thiefRobot, 42); }
    state.effects.forEach(effect => queue(effect, 46));
    queue(codeNotePickup, 28);
    if (!state.jailKeyHolder) queue(jailKeyPickup, 28);
    state.jailCells.forEach(cell => queue(cell, 28));
    sprites.sort((a, b) => b._renderDistanceSquared - a._renderDistanceSquared);
    for (const s of sprites) {
      const scale = s.kind === 'sign' ? .48 : s.kind === 'safe' || s.kind === 'pickup' ? .42 : s.kind === 'cell' ? .42 : s.kind === 'thiefRobot' ? 1.15 : s.kind === 'boss' ? 1.05 : s.kind === 'vehicle' ? .7 : s.kind === 'explosion' ? .95 : s.kind === 'tree' ? 1.35 : s.kind === 'lamp' ? 1.15 : s.kind === 'furniture' ? .5 : .62;
      const pr = projectSprite(s.x, s.y, scale);
      if (!pr) continue;
      if (s.kind === 'explosion') {
        drawExplosionSprite(s, pr, horizon);
      } else if (s.kind === 'sign') {
        if (pr.dist > 9) continue;
        const fs = clamp(pr.size * .18, 10, 22), signY = horizon + (.55 + state.player.altitude - .74) * pr.projection;
        if (signY < -40 || signY > canvas.height + 30) continue;
        ctx.font = `800 ${fs}px system-ui`; const tw = ctx.measureText(s.label).width + 18;
        ctx.fillStyle = 'rgba(9,18,24,.85)'; roundedRectPath(ctx, pr.screenX - tw / 2, signY - (fs + 10) / 2, tw, fs + 10, 4); ctx.fill();
        ctx.strokeStyle = s.color; ctx.lineWidth = 3; roundedRectPath(ctx, pr.screenX - tw / 2, signY - (fs + 10) / 2, tw, fs + 10, 4); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(s.label, pr.screenX, signY + fs * .34);
      } else if (s.kind === 'vehicle') {
        drawVehicleSprite(s, pr, horizon);
      } else if (s.kind === 'safe') {
        const sz = clamp(pr.size, 16, 180), baseY = spriteGroundY(pr, horizon), y = baseY - sz * .72;
        ctx.fillStyle = 'rgba(3,8,11,.28)'; ctx.beginPath(); ctx.ellipse(pr.screenX, baseY, sz * .4, sz * .08, 0, 0, TAU); ctx.fill();
        const safeGradient = ctx.createLinearGradient(pr.screenX - sz * .4, 0, pr.screenX + sz * .4, 0);
        safeGradient.addColorStop(0, '#252d32'); safeGradient.addColorStop(.45, '#59636a'); safeGradient.addColorStop(1, '#252c31');
        ctx.fillStyle = safeGradient; roundedRectPath(ctx, pr.screenX - sz * .38, y, sz * .76, sz * .72, sz * .055); ctx.fill();
        ctx.strokeStyle = '#bdc7cc'; ctx.lineWidth = Math.max(2, sz * .035); roundedRectPath(ctx, pr.screenX - sz * .31, y + sz * .07, sz * .62, sz * .56, sz * .035); ctx.stroke();
        ctx.fillStyle = '#172027'; roundedRectPath(ctx, pr.screenX + sz * .02, y + sz * .22, sz * .2, sz * .22, sz * .025); ctx.fill();
        ctx.strokeStyle = '#d5dde1'; ctx.beginPath(); ctx.arc(pr.screenX + sz * .12, y + sz * .33, sz * .065, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#7ccbe7'; ctx.fillRect(pr.screenX + sz * .075, y + sz * .255, sz * .09, sz * .025);
      } else if (s.kind === 'pickup') {
        const sz = clamp(pr.size, 14, 130), y = spriteGroundY(pr, horizon) - sz * .42;
        ctx.fillStyle = s.color; ctx.fillRect(pr.screenX - sz * .3, y, sz * .6, sz * .42);
        ctx.fillStyle = '#1e272c'; ctx.font = `900 ${clamp(sz * .1, 8, 13)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(s.label, pr.screenX, y + sz * .26);
      } else if (s.kind === 'cell') {
        const sh = clamp(pr.size, 18, 170), sw = sh * .72, y = spriteGroundY(pr, horizon) - sh * .84;
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
        const sh = clamp(pr.size, 18, canvas.height * 1.5), baseY = spriteGroundY(pr, horizon), y = baseY - sh * .92;
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(pr.screenX, baseY, sh * .3, sh * .07, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#61442d'; ctx.fillRect(pr.screenX - sh * .055, y + sh * .42, sh * .11, sh * .5);
        ctx.fillStyle = '#315f38'; ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .29, sh * .28, 0, TAU); ctx.arc(pr.screenX - sh * .19, y + sh * .39, sh * .23, 0, TAU); ctx.arc(pr.screenX + sh * .2, y + sh * .4, sh * .24, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(111,166,84,.55)'; ctx.beginPath(); ctx.arc(pr.screenX - sh * .08, y + sh * .2, sh * .13, 0, TAU); ctx.fill();
      } else if (s.kind === 'lamp') {
        const sh = clamp(pr.size, 18, canvas.height * 1.4), y = spriteGroundY(pr, horizon) - sh;
        ctx.strokeStyle = '#303a3f'; ctx.lineWidth = Math.max(2, sh * .045); ctx.beginPath(); ctx.moveTo(pr.screenX, y + sh); ctx.lineTo(pr.screenX, y + sh * .14); ctx.lineTo(pr.screenX + sh * .16, y + sh * .14); ctx.stroke();
        ctx.fillStyle = 'rgba(255,230,147,.28)'; ctx.beginPath(); ctx.arc(pr.screenX + sh * .16, y + sh * .17, sh * .16, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffe49a'; ctx.fillRect(pr.screenX + sh * .1, y + sh * .12, sh * .13, sh * .1);
      } else if (s.kind === 'bench') {
        const sh = clamp(pr.size, 12, 150), sw = sh * 1.45, y = spriteGroundY(pr, horizon) - sh * .46;
        ctx.fillStyle = '#704a2b'; ctx.fillRect(pr.screenX - sw / 2, y - sh * .35, sw, sh * .18); ctx.fillRect(pr.screenX - sw / 2, y, sw, sh * .16);
        ctx.fillStyle = '#333b3f'; ctx.fillRect(pr.screenX - sw * .38, y + sh * .12, sh * .08, sh * .34); ctx.fillRect(pr.screenX + sw * .3, y + sh * .12, sh * .08, sh * .34);
      } else if (s.kind === 'hydrant') {
        const sh = clamp(pr.size, 9, 85), y = spriteGroundY(pr, horizon) - sh * .1;
        ctx.fillStyle = '#c83c37'; ctx.fillRect(pr.screenX - sh * .16, y - sh * .45, sh * .32, sh * .55); ctx.beginPath(); ctx.arc(pr.screenX, y - sh * .45, sh * .2, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = '#932a29'; ctx.fillRect(pr.screenX - sh * .26, y - sh * .28, sh * .52, sh * .12);
      } else if (s.kind === 'furniture') {
        const sh = clamp(pr.size, 12, 135), sw = sh * (s.style === 'bed' ? 1.5 : 1.15), y = spriteGroundY(pr, horizon) - sh * .5;
        const colors = { sofa: '#54788b', table: '#765034', bed: '#d5d0bd', desk: '#365c74', counter: '#d3a33e', crate: '#8b6032' };
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(pr.screenX, y + sh * .55, sw * .55, sh * .12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = colors[s.style] || '#78634b'; ctx.fillRect(pr.screenX - sw / 2, y, sw, sh * .5);
        if (s.style === 'sofa' || s.style === 'bed') { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(pr.screenX - sw * .42, y + sh * .08, sw * .84, sh * .17); }
        if (s.style === 'crate') { ctx.strokeStyle = '#4d321c'; ctx.lineWidth = Math.max(1, sh * .03); ctx.strokeRect(pr.screenX - sw / 2, y, sw, sh * .5); }
        if (s.style === 'counter') { ctx.fillStyle = '#fff0b0'; ctx.font = `800 ${clamp(sh * .12, 8, 13)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('KÖP HÄR', pr.screenX, y - 5); }
      } else if (s.kind === 'thiefRobot') {
        drawThiefRobotSprite(s, pr, horizon);
      } else if (s.kind === 'boss') {
        drawPersonSprite({ ...s, id: 'polisboss', role: 'polis', inventory: { baton: true }, unconsciousUntil: 0, lastAttackAt: null, faceOffStartedAt: null, nextMeleeAt: Infinity }, pr, horizon, true);
      } else {
        drawPersonSprite(s, pr, horizon);
      }
    }
  }

  function drawFirstPersonView() {
    const p = state.player, w = canvas.width, h = canvas.height;
    if (p.vehicle) {
      ctx.fillStyle = p.vehicle === 'helicopter' ? 'rgba(78,145,169,.055)' : 'rgba(91,142,158,.035)'; ctx.fillRect(0, 0, w, h);
      const dashboard = ctx.createLinearGradient(0, h * .75, 0, h);
      dashboard.addColorStop(0, 'rgba(54,66,72,.94)'); dashboard.addColorStop(.18, '#202a30'); dashboard.addColorStop(1, '#0d1418');
      ctx.fillStyle = dashboard;
      ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * .86); ctx.quadraticCurveTo(w * .5, h * .73, w, h * .86); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(205,225,232,.24)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, h * .86); ctx.quadraticCurveTo(w * .5, h * .73, w, h * .86); ctx.stroke();
      ctx.strokeStyle = '#111a1f'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(w / 2, h * .92, h * .12, Math.PI, TAU); ctx.stroke();
      ctx.strokeStyle = '#728188'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w / 2, h * .92, h * .12, Math.PI, TAU); ctx.stroke();
      ctx.fillStyle = '#172329'; roundedRectPath(ctx, w * .4, h * .79, w * .2, h * .095, h * .015); ctx.fill();
      for (let gauge = -1; gauge <= 1; gauge++) {
        const gx = w * .5 + gauge * w * .057;
        ctx.fillStyle = '#081014'; ctx.beginPath(); ctx.arc(gx, h * .835, h * .031, 0, TAU); ctx.fill();
        ctx.strokeStyle = gauge === 0 ? '#58c7f2' : '#ffc857'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, h * .835, h * .024, Math.PI * .8, Math.PI * (1.55 + gauge * .08)); ctx.stroke();
      }
      if (p.vehicle === 'helicopter') {
        ctx.strokeStyle = 'rgba(22,30,34,.76)'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(w * .13, 0); ctx.lineTo(w * .29, h); ctx.moveTo(w * .87, 0); ctx.lineTo(w * .71, h); ctx.stroke();
        ctx.strokeStyle = 'rgba(25,34,39,.48)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(w * .25, 16); ctx.lineTo(w * .75, 16); ctx.stroke();
        const rotorSweep = (state.time * 240) % w;
        ctx.strokeStyle = 'rgba(18,28,33,.18)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(rotorSweep - w * .45, 13); ctx.lineTo(rotorSweep + w * .45, 13); ctx.stroke();
        ctx.fillStyle = '#bde9f7'; ctx.font = `800 ${Math.max(11, h * .019)}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.fillText(`HÖJD ${p.altitude.toFixed(1)}`, w / 2, h * .86);
      } else {
        ctx.strokeStyle = 'rgba(21,30,35,.72)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(w * .02, h * .16); ctx.lineTo(w * .12, h); ctx.moveTo(w * .98, h * .16); ctx.lineTo(w * .88, h); ctx.stroke();
      }
      return;
    }
    const swing = Math.sin(state.time * 8) * state.cameraBob * 4;
    const attacking = state.time < p.attackSwingUntil;
    const punch = attacking ? h * .13 : 0;
    const sleeve = p.role === 'polis' ? '#215887' : p.role === 'tjuv' ? '#6e2b37' : '#34775c';
    const cuff = p.role === 'polis' ? '#153a5c' : p.role === 'tjuv' ? '#38242a' : '#214d3c';
    const skin = '#d7a27c';
    const leftGradient = ctx.createLinearGradient(w * .15, h, w * .3, h * .75);
    leftGradient.addColorStop(0, cuff); leftGradient.addColorStop(.58, sleeve); leftGradient.addColorStop(1, '#4f91a5');
    ctx.fillStyle = leftGradient; ctx.beginPath(); ctx.moveTo(w * .1 + swing, h); ctx.quadraticCurveTo(w * .15 + swing, h * .88, w * .22 + swing, h * .83); ctx.lineTo(w * .29 + swing, h * .91); ctx.lineTo(w * .26 + swing, h); ctx.closePath(); ctx.fill();
    const rightGradient = ctx.createLinearGradient(w * .88, h, w * .7, h * .7);
    rightGradient.addColorStop(0, cuff); rightGradient.addColorStop(.58, sleeve); rightGradient.addColorStop(1, '#4f91a5');
    ctx.fillStyle = rightGradient; ctx.beginPath(); ctx.moveTo(w * .9 - swing, h); ctx.quadraticCurveTo(w * .85 - swing, h * .87, w * .79 - swing, h * (.82 - punch / h)); ctx.lineTo(w * .71 - swing, h * (.9 - punch / h)); ctx.lineTo(w * .75 - swing, h); ctx.closePath(); ctx.fill();
    const handGradient = ctx.createRadialGradient(w * .76, h * .79 - punch, 3, w * .78, h * .84 - punch, h * .09);
    handGradient.addColorStop(0, '#f2c29d'); handGradient.addColorStop(.62, skin); handGradient.addColorStop(1, '#986447');
    ctx.fillStyle = handGradient;
    ctx.beginPath(); ctx.ellipse(w * .24 + swing, h * .84, w * .042, h * .068, -.35, 0, TAU); ctx.ellipse(w * .76 - swing, h * .82 - punch, w * .043, h * .07, .35, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(94,55,41,.4)'; ctx.lineWidth = 2;
    for (let finger = 0; finger < 3; finger++) { ctx.beginPath(); ctx.arc(w * .76 - swing + finger * 5 - 5, h * .81 - punch, w * .023, .1, Math.PI * .75); ctx.stroke(); }
    if (p.inventory.baton) {
      ctx.save(); ctx.translate(w * .78 - swing, h * .81 - punch); ctx.rotate(attacking ? -.82 : .27);
      const batonGradient = ctx.createLinearGradient(0, 0, 0, -h * .32);
      batonGradient.addColorStop(0, '#11191e'); batonGradient.addColorStop(.45, '#35434a'); batonGradient.addColorStop(.7, '#d1dce0'); batonGradient.addColorStop(.76, '#334047'); batonGradient.addColorStop(1, '#131b20');
      ctx.strokeStyle = batonGradient; ctx.lineWidth = Math.max(11, h * .025); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, h * .035); ctx.lineTo(0, -h * .31); ctx.stroke();
      ctx.strokeStyle = '#0d1418'; ctx.lineWidth = Math.max(14, h * .031); ctx.beginPath(); ctx.moveTo(0, h * .04); ctx.lineTo(0, -h * .05); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.48)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-h * .006, -h * .08); ctx.lineTo(-h * .006, -h * .27); ctx.stroke();
      ctx.restore(); ctx.lineCap = 'butt';
    }
  }

  function heartPath(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * .88);
    ctx.bezierCurveTo(x - size * .08, y + size * .72, x - size * .5, y + size * .5, x - size * .5, y + size * .24);
    ctx.bezierCurveTo(x - size * .5, y - size * .05, x - size * .12, y - size * .12, x, y + size * .13);
    ctx.bezierCurveTo(x + size * .12, y - size * .12, x + size * .5, y - size * .05, x + size * .5, y + size * .24);
    ctx.bezierCurveTo(x + size * .5, y + size * .5, x + size * .08, y + size * .72, x, y + size * .88);
    ctx.closePath();
  }

  function drawHeart(x, y, size, fillRatio) {
    heartPath(x, y, size); ctx.fillStyle = 'rgba(227,76,83,.2)'; ctx.fill();
    if (fillRatio > 0) {
      ctx.save(); heartPath(x, y, size); ctx.clip();
      const heartGradient = ctx.createLinearGradient(0, y, 0, y + size);
      heartGradient.addColorStop(0, '#ff7a7f'); heartGradient.addColorStop(1, '#c92e3b');
      ctx.fillStyle = heartGradient; ctx.fillRect(x - size / 2, y - size * .1, size * fillRatio, size * 1.1); ctx.restore();
    }
    heartPath(x, y, size); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawHud() {
    const p = state.player, w = canvas.width, h = canvas.height;
    const hudTop = 72;
    ctx.textAlign = 'left';
    const roleColor = p.role === 'polis' ? '#49b6f2' : p.role === 'tjuv' ? '#d95b70' : '#65cf9c';
    ctx.fillStyle = 'rgba(7,17,24,.76)'; roundedRectPath(ctx, 18, hudTop, 247, 82, 13); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.5; roundedRectPath(ctx, 18, hudTop, 247, 82, 13); ctx.stroke();
    ctx.fillStyle = roleColor; ctx.beginPath(); ctx.arc(46, hudTop + 29, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10202a'; ctx.font = `900 ${Math.max(15, h * .027)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(p.role === 'polis' ? 'P' : p.role === 'tjuv' ? 'T' : 'M', 46, hudTop + 35);
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.max(16, h * .027)}px system-ui`; ctx.textAlign = 'left'; ctx.fillText(`${p.role.toUpperCase()} 1`, 71, hudTop + 28);
    ctx.font = `800 ${Math.max(13, h * .021)}px system-ui`; ctx.fillStyle = '#ffc857'; ctx.fillText(`● ${p.money} pengar`, 71, hudTop + 56);
    for (let i = 0; i < 3; i++) {
      drawHeart(170 + i * 29, hudTop + 44, 21, clamp(p.health - i, 0, 1));
    }
    ctx.fillStyle = 'rgba(7,17,24,.76)'; roundedRectPath(ctx, w - 267, hudTop, 249, 82, 13); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; roundedRectPath(ctx, w - 267, hudTop, 249, 82, 13); ctx.stroke();
    ctx.fillStyle = '#ffc857'; roundedRectPath(ctx, w - 251, hudTop + 13, 7, 54, 3.5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(13, h * .019)}px system-ui`;
    ctx.fillText(`Tjuvar i fängelse  ${state.jailedThieves}/5`, w - 232, hudTop + 29);
    ctx.fillStyle = allThievesJailed() ? '#ff7a86' : '#ffc857';
    ctx.fillText(allThievesJailed() ? `Tjuvrobot  ${state.thiefRobot.health}/20` : `Stulna pengar  ${state.stolen}/500`, w - 232, hudTop + 58);
    if (state.message && state.messageUntil > state.time) {
      ctx.font = `700 ${Math.max(15, h * .024)}px system-ui`; const tw = Math.min(w - 60, ctx.measureText(state.message).width + 40);
      const messageY = h - 154;
      ctx.fillStyle = 'rgba(4,12,18,.84)'; roundedRectPath(ctx, (w - tw) / 2, messageY, tw, 46, 13); ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,87,.48)'; roundedRectPath(ctx, (w - tw) / 2, messageY, tw, 46, 13); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(state.message, w / 2, messageY + 29);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(w / 2 - 10, h / 2); ctx.lineTo(w / 2 - 4, h / 2); ctx.moveTo(w / 2 + 4, h / 2); ctx.lineTo(w / 2 + 10, h / 2); ctx.moveTo(w / 2, h / 2 - 10); ctx.lineTo(w / 2, h / 2 - 4); ctx.moveTo(w / 2, h / 2 + 4); ctx.lineTo(w / 2, h / 2 + 10); ctx.stroke();
    ctx.fillStyle = '#ffc857'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 1.8, 0, TAU); ctx.fill();
    drawMinimap(w - 145, hudTop + 106, 126, 96);
    if (p.vehicleId) {
      const vehicle = state.vehicles.find(v => v.id === p.vehicleId);
      ctx.fillStyle = 'rgba(5,13,19,.78)'; roundedRectPath(ctx, 18, h - 218, 210, 48, 11); ctx.fill();
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
    if (state.effects.length) state.effects = state.effects.filter(effect => state.time - effect.startedAt < effect.duration);
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
      kind: 'vehicle',
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
    state.effects.push({ kind: 'explosion', x: vehicle.x, y: vehicle.y, altitude: vehicle.altitude || 0, startedAt: state.time, duration: .9, seed: stableNoise(state.time * 97 + vehicle.x * 13 + vehicle.y * 29) });
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
    graphics: {
      renderer: 'textured-first-person-3d',
      perspective: 'corrected-raycasting',
      materials: ['betong', 'puts', 'tegel', 'trä', 'glas', 'metall', 'asfalt', 'gräs'],
      lighting: ['riktningsljus', 'kalla skuggor', 'avståndsdis', 'kontaktsskuggor', 'inomhusljus'],
      profile: COARSE_RENDER_PROFILE ? 'ipad-medium' : 'desktop-high',
      wallRays: WALL_RAYS,
      floorBuffer: `${floorCanvas.width}x${floorCanvas.height}`,
      helicopterHeightPerspective: true,
    },
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
    tryPurchase, enterBotVehicle, exitVehicle, destroyVehicle, botMeleeReady, damagePerson, damageThiefRobot, stealHouseSafe, homeSafeFor, activeThiefInHome, assignedSafeForThief,
    homeTeleportAvailable, teleportPlayerHome, botMoveSpeed, moveBotTo, render, doors, structures, places: PLACES, playerHome: PLAYER_HOME,
    allThievesJailed, canEnterBuilding, checkWin,
  };
  window.__wilderFallback = window.__wilderTest;

  let last = performance.now();
  function frame(now) { const dt = clamp((now - last) / 1000, 0, .05); last = now; if (!manualTime) update(dt); render(); requestAnimationFrame(frame); }
  render(); requestAnimationFrame(frame);
})();
