// Wilder: The Big City — första spelbara 3D-versionen.
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  if (!canvas) return;
  const gameFrame = canvas.closest('.game-frame') || canvas;
  const ctx = canvas.getContext('2d', { alpha: false });
  const TAU = Math.PI * 2;
  const FOV = Math.PI / 3;
  const MAP_W = 48;
  const MAP_H = 38;
  const map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0));
  const doors = new Map();
  const structures = [];
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
  const SAFE_CODES = ['2413', '8052', '7316', '4290', '1538', '6742', '3905', '8174', '5621', '9463'];

  const state = {
    mode: 'role-select',
    time: 0,
    message: 'Välj vem du vill vara i Wilder',
    messageUntil: Infinity,
    player: null,
    bots: [],
    roleCounts: { polis: 5, tjuv: 5, människa: 10 },
    shopOpen: false,
    codesOpen: false,
    safes: [],
    vehicles: [],
    stolen: 0,
    jailedThieves: 0,
    thiefCodesKnown: false,
    jailKeyHolder: null,
    botRescueAt: 0,
    boss: { x: 40.5, y: 4.5, health: 20, maxHealth: 20, defeated: false, cooldown: 0 },
    jailCells: [[38, 7.25], [39, 7.25], [40, 7.25], [41, 7.25], [42, 7.25]]
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
    doors.set(`${doorX},${doorY}`, { id: `${id}-door`, x: doorX, y: doorY, open: false, label });
    return building;
  }

  for (let x = 0; x < MAP_W; x++) map[0][x] = map[MAP_H - 1][x] = 1;
  for (let y = 0; y < MAP_H; y++) map[y][0] = map[y][MAP_W - 1] = 1;

  const houseSpecs = [
    [1, 2, 2], [2, 10, 2], [3, 18, 2], [4, 26, 2],
    [5, 2, 13], [6, 10, 13], [7, 18, 13], [8, 26, 13],
    [9, 2, 25], [10, 10, 25],
  ];
  houseSpecs.forEach(([n, x, y]) => addBuilding(`house-${n}`, `Hus ${n}`, 'house', x, y, 6, 6, x + 3));
  const policeStation = addBuilding('police', 'Polishuset', 'police', 34, 2, 12, 9, 40);
  const shop = addBuilding('shop', 'Wilder-affären', 'shop', 34, 13, 12, 8, 40);
  const hideout = addBuilding('hideout', 'Tjuvhuset', 'hideout', 34, 25, 12, 9, 40);
  for (let x = 35; x < 45; x++) map[6][x] = 4;
  map[6][40] = 3;
  doors.set('40,6', { id: 'boss-door', x: 40, y: 6, open: false, label: 'Bossrummet' });
  state.safes = structures.filter(s => s.type === 'house').map((s, i) => ({
    id: `safe-${i + 1}`, house: i + 1, x: s.x + 1.6, y: s.y + 1.6, code: SAFE_CODES[i], money: 50, opened: false,
  }));
  state.vehicles = [
    { id: 'police-car', type: 'car', label: 'polisbil', x: 36.5, y: 12, health: 10, maxHealth: 10, owner: 'polis', destroyed: false },
    { id: 'police-heli', type: 'helicopter', label: 'polishelikopter', x: 44, y: 12, health: 10, maxHealth: 10, owner: 'polis', destroyed: false },
    { id: 'shop-car', type: 'car', label: 'bil', x: 36.5, y: 22.5, health: 10, maxHealth: 10, owner: null, destroyed: false },
    { id: 'shop-heli', type: 'helicopter', label: 'helikopter', x: 43.5, y: 22.5, health: 10, maxHealth: 10, owner: null, destroyed: false },
  ];

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

  function chooseRole(role) {
    const starts = {
      polis: { x: 40.5, y: 12, angle: -Math.PI / 2, money: 10, baton: true, car: true, helicopter: true },
      tjuv: { x: 40.5, y: 35.5, angle: -Math.PI / 2, money: 10, baton: false, car: false, helicopter: false },
      människa: { x: 23.5, y: 22.5, angle: -Math.PI / 2, money: 20, baton: false, car: false, helicopter: false },
    };
    const s = starts[role];
    state.player = {
      id: `${role}-1`, role, x: s.x, y: s.y, angle: s.angle, health: 3, maxHealth: 3, money: s.money,
      inventory: { baton: s.baton, car: s.car, helicopter: s.helicopter, codes: role === 'polis', jailKey: false },
      vehicle: null, vehicleId: null, altitude: 0, pitch: 0, attackCooldown: 0, unconsciousUntil: 0, jailed: false, jailCell: null,
    };
    state.mode = 'playing';
    state.messageUntil = 0;
    makeBots(role);
    showMessage(role === 'polis' ? 'Du är polis: fånga alla fem tjuvar!' : role === 'tjuv' ? 'Du är tjuv: hitta koderna och stjäl 500 pengar!' : 'Du bor i Wilder. Utforska den stora staden!', 5);
    canvas.focus();
  }

  function makeBots(playerRole) {
    const totals = { polis: 5, tjuv: 5, människa: 10 };
    totals[playerRole]--;
    state.bots = [];
    const spawns = {
      polis: [[37, 12], [39, 12], [42, 12], [44, 12], [36, 11]],
      tjuv: [[36, 35], [38, 35], [41, 35], [43, 35], [45, 35]],
      människa: [[9, 10], [16, 10], [23, 10], [30, 10], [8, 22], [14, 22], [20, 22], [27, 22], [18, 34], [27, 34]],
    };
    Object.entries(totals).forEach(([role, count]) => {
      for (let i = 0; i < count; i++) {
        const p = spawns[role][i];
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
          inventory: { baton: role === 'polis', codes: role === 'polis', jailKey: false },
          jailed: false,
          jailCell: null,
          unconsciousUntil: 0,
          cooldown: random(),
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
    while (!cell && guard++ < 90) {
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
      { role: 'polis', title: 'POLIS', count: '5 poliser', color: '#2f79d3', key: '1', note: 'Bil, helikopter och klubba' },
      { role: 'tjuv', title: 'TJUV', count: '5 tjuvar', color: '#a73c47', key: '2', note: 'Stjäl 500 pengar' },
      { role: 'människa', title: 'MÄNNISKA', count: '10 människor', color: '#36966a', key: '3', note: 'Lev och utforska staden' },
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

  function drawWorld() {
    const p = state.player, w = canvas.width, h = canvas.height;
    const horizon = h * (0.48 + p.pitch * .42 + state.cameraBob * 0.005 - p.altitude * .055);
    const currentBuilding = currentBuildingAt(p.x, p.y);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#68b8ef'); sky.addColorStop(.7, '#b9e4fa'); sky.addColorStop(1, '#e7f4f8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
    const floorColors = { house: '#8f785e', police: '#5d6b74', shop: '#7b745f', hideout: '#4d5554' };
    ctx.fillStyle = currentBuilding ? floorColors[currentBuilding.type] : '#4d555d';
    ctx.fillRect(0, horizon, w, h - horizon);
    for (let y = Math.ceil(horizon); y < h; y += 3) {
      const depth = (y - horizon) / (h - horizon);
      ctx.fillStyle = currentBuilding
        ? `rgba(25,20,15,${.05 + depth * .22})`
        : `rgba(${35 + depth * 16},${40 + depth * 16},${44 + depth * 18},${.18 + depth * .24})`;
      ctx.fillRect(0, y, w, 3);
    }
    if (!currentBuilding) {
      ctx.fillStyle = 'rgba(242,197,69,.82)';
      for (let i = 0; i < 5; i++) {
        const near = h + i * 85 - ((state.time * 85) % 85);
        const far = Math.max(horizon + 4, near - 42);
        if (near <= horizon || far >= h) continue;
        const nearWidth = 9 + (near - horizon) * .035;
        const farWidth = 4 + (far - horizon) * .018;
        ctx.beginPath();
        ctx.moveTo(w / 2 - farWidth, far); ctx.lineTo(w / 2 + farWidth, far);
        ctx.lineTo(w / 2 + nearWidth, Math.min(h, near)); ctx.lineTo(w / 2 - nearWidth, Math.min(h, near));
        ctx.closePath(); ctx.fill();
      }
    }
    const rays = Math.max(240, Math.floor(w / 2));
    const colW = w / rays;
    state.depthBuffer = new Float32Array(rays);
    for (let i = 0; i < rays; i++) {
      const rayAngle = p.angle - FOV / 2 + FOV * (i + .5) / rays;
      const ray = castRay(rayAngle);
      const corrected = ray.distance * Math.cos(rayAngle - p.angle);
      state.depthBuffer[i] = corrected;
      const wallH = Math.min(h * 2.2, h / corrected);
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
      let shade = clamp(1.18 - corrected * .032 - ray.side * .14, .25, 1);
      if (ray.cell !== 1 && ray.cell !== 3 && wallH > 28) {
        const band = Math.floor(ray.texture * 8) % 2 ? 1 : .88;
        shade *= band;
      }
      ctx.fillStyle = `rgb(${base[0] * shade},${base[1] * shade},${base[2] * shade})`;
      ctx.fillRect(i * colW, top, colW + 1, wallH);
      if (ray.cell === 3 && wallH > 45) {
        ctx.fillStyle = `rgba(232,194,89,${shade})`; ctx.fillRect(i * colW, top + wallH * .47, colW + 1, Math.max(1, wallH * .025));
      }
    }
    drawSprites(horizon);
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
    state.bots.filter(b => !b.jailed).forEach(b => sprites.push({ kind: 'bot', ...b }));
    state.safes.filter(s => !s.opened).forEach(s => sprites.push({ kind: 'safe', ...s }));
    state.vehicles.filter(v => !v.destroyed && v.id !== state.player.vehicleId).forEach(v => sprites.push({ kind: 'vehicle', ...v }));
    if (!state.boss.defeated) sprites.push({ kind: 'boss', ...state.boss });
    sprites.push({ kind: 'pickup', x: 36.5, y: 8.1, label: 'KODLAPP', color: '#f2e7b3' });
    if (!state.jailKeyHolder) sprites.push({ kind: 'pickup', x: 38, y: 8.1, label: 'NYCKEL', color: '#f2c94c' });
    state.jailCells.forEach(cell => sprites.push({ kind: 'cell', ...cell, label: `CELL ${cell.index + 1}` }));
    sprites.sort((a, b) => distance(b, state.player) - distance(a, state.player));
    for (const s of sprites) {
      const scale = s.kind === 'sign' ? .48 : s.kind === 'safe' || s.kind === 'pickup' ? .42 : s.kind === 'cell' ? .42 : s.kind === 'boss' ? 1.05 : s.kind === 'vehicle' ? .7 : .8;
      const pr = projectSprite(s.x, s.y, scale);
      if (!pr) continue;
      if (s.kind === 'sign') {
        const fs = clamp(pr.size * .18, 10, 22); ctx.font = `800 ${fs}px system-ui`; const tw = ctx.measureText(s.label).width + 18;
        ctx.fillStyle = 'rgba(9,18,24,.85)'; ctx.fillRect(pr.screenX - tw / 2, horizon - pr.size * .65, tw, fs + 10);
        ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.strokeRect(pr.screenX - tw / 2, horizon - pr.size * .65, tw, fs + 10);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(s.label, pr.screenX, horizon - pr.size * .65 + fs + 2);
      } else if (s.kind === 'vehicle') {
        const sh = clamp(pr.size * .62, 14, canvas.height), sw = sh * (s.type === 'car' ? 1.45 : 1.8), y = horizon - sh * .2;
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
        ctx.fillStyle = '#e8b68a'; ctx.beginPath(); ctx.arc(pr.screenX, y + sh * .2, sw * .43, 0, TAU); ctx.fill();
        ctx.fillStyle = '#17202a'; ctx.fillRect(pr.screenX - sw * .42, y + sh * .78, sw * .34, sh * .24); ctx.fillRect(pr.screenX + sw * .08, y + sh * .78, sw * .34, sh * .24);
      }
    }
  }

  function drawHud() {
    const p = state.player, w = canvas.width, h = canvas.height;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(5,13,19,.78)'; ctx.fillRect(18, 18, 245, 76);
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.max(16, h * .029)}px system-ui`; ctx.fillText(`${p.role.toUpperCase()} 1`, 32, 47);
    ctx.font = `700 ${Math.max(13, h * .022)}px system-ui`; ctx.fillStyle = '#ffd461'; ctx.fillText(`${p.money} pengar`, 32, 76);
    ctx.fillStyle = '#e34c53'; for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < p.health ? 1 : .2; ctx.fillRect(150 + i * 29, 60, 21, 12); } ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(5,13,19,.78)'; ctx.fillRect(w - 258, 18, 240, 76);
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(13, h * .019)}px system-ui`;
    ctx.fillText(`Tjuvar i fängelse: ${state.jailedThieves}/5`, w - 240, 45);
    ctx.fillText(`Stulna pengar: ${state.stolen}/500`, w - 240, 72);
    if (state.message && state.messageUntil > state.time) {
      ctx.font = `700 ${Math.max(15, h * .024)}px system-ui`; const tw = Math.min(w - 60, ctx.measureText(state.message).width + 40);
      ctx.fillStyle = 'rgba(4,12,18,.85)'; ctx.fillRect((w - tw) / 2, h - 76, tw, 46);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(state.message, w / 2, h - 47);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2 - 10, h / 2); ctx.lineTo(w / 2 + 10, h / 2); ctx.moveTo(w / 2, h / 2 - 10); ctx.lineTo(w / 2, h / 2 + 10); ctx.stroke();
    drawMinimap(w - 145, 108, 2.45);
    if (p.vehicleId) {
      const vehicle = state.vehicles.find(v => v.id === p.vehicleId);
      ctx.fillStyle = 'rgba(5,13,19,.82)'; ctx.fillRect(18, h - 138, 210, 48);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = `700 ${Math.max(13, h * .019)}px system-ui`; ctx.fillText(`${p.vehicle === 'car' ? 'BIL' : 'HELIKOPTER'}  ${vehicle?.health ?? 0}/10 liv`, 32, h - 108);
    }
    if (p.unconsciousUntil > state.time || p.jailed || state.shopOpen || state.codesOpen || state.mode === 'police-win' || state.mode === 'thief-win') drawOverlay();
  }

  function drawMinimap(x, y, scale) {
    const width = MAP_W * scale, height = MAP_H * scale;
    ctx.save();
    ctx.fillStyle = 'rgba(5,13,19,.82)'; ctx.fillRect(x - 8, y - 24, width + 16, height + 32);
    ctx.fillStyle = '#d6e8ef'; ctx.font = '800 11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('KARTA ÖVER WILDER', x, y - 8);
    const colors = { 1: '#82909a', 2: '#c7ab7f', 3: '#d89b47', 4: '#397ab4', 5: '#d5a42c', 6: '#a34d55' };
    for (let yy = 0; yy < MAP_H; yy++) {
      for (let xx = 0; xx < MAP_W; xx++) {
        const cell = map[yy][xx];
        ctx.fillStyle = cell ? colors[cell] || '#aab4b9' : '#3c4b51';
        ctx.fillRect(x + xx * scale, y + yy * scale, Math.ceil(scale), Math.ceil(scale));
      }
    }
    for (const bot of state.bots) {
      if (bot.jailed) continue;
      ctx.fillStyle = bot.role === 'polis' ? '#54a7ff' : bot.role === 'tjuv' ? '#ff6570' : '#55d997';
      ctx.fillRect(x + bot.x * scale - 1, y + bot.y * scale - 1, 3, 3);
    }
    ctx.translate(x + state.player.x * scale, y + state.player.y * scale);
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
      ctx.font = `900 ${Math.max(24, h * .05)}px system-ui`; ctx.fillText('WILDER-AFFÄREN', w / 2, y + 65);
      ctx.font = `700 ${Math.max(16, h * .027)}px system-ui`; ctx.fillStyle = '#ffd86b'; ctx.fillText(`Du har ${p.money} pengar`, w / 2, y + 105);
      const choices = p.role === 'människa'
        ? [{ key: '2', item: 'car', label: 'Bil — 20 pengar' }]
        : [
            { key: '1', item: 'baton', label: 'Klubba — 10 pengar' },
            { key: '2', item: 'car', label: 'Bil — 20 pengar' },
            { key: '3', item: 'helicopter', label: 'Helikopter — 30 pengar' },
          ];
      const buttonW = Math.min(400, pw * .72), buttonH = 42;
      choices.forEach((choice, i) => {
        const bx = w / 2 - buttonW / 2, by = y + 132 + i * 55;
        state.overlayButtons.push({ action: 'buy', item: choice.item, x: bx, y: by, w: buttonW, h: buttonH });
        ctx.fillStyle = '#23485b'; ctx.fillRect(bx, by, buttonW, buttonH);
        ctx.strokeStyle = '#82c9ee'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, buttonW, buttonH);
        ctx.fillStyle = '#fff'; ctx.fillText(`${choice.key}  ${choice.label}`, w / 2, by + 28);
      });
      ctx.font = `500 ${Math.max(13, h * .02)}px system-ui`; ctx.fillStyle = '#b8d2df'; ctx.fillText('Tryck på en vara eller använd siffra • E stänger', w / 2, y + ph - 38);
    } else if (state.codesOpen) {
      ctx.font = `900 ${Math.max(23, h * .047)}px system-ui`; ctx.fillText('KODER TILL WILDERS KASSASKÅP', w / 2, y + 58);
      ctx.font = `700 ${Math.max(14, h * .024)}px ui-monospace, monospace`;
      SAFE_CODES.forEach((code, i) => { const col = i < 5 ? 0 : 1, row = i % 5; ctx.fillText(`Hus ${i + 1}: ${code}`, x + pw * (.27 + col * .46), y + 112 + row * 42); });
      ctx.font = `500 ${Math.max(13, h * .02)}px system-ui`; ctx.fillStyle = '#b8d2df'; ctx.fillText('E för att stänga lappen', w / 2, y + ph - 30);
    } else if (state.mode === 'police-win' || state.mode === 'thief-win') {
      ctx.font = `900 ${Math.max(30, h * .07)}px system-ui`; ctx.fillStyle = '#ffd75d'; ctx.fillText(state.mode === 'police-win' ? 'POLISERNA VANN!' : 'TJUVLIGAN VANN!', w / 2, y + ph * .38);
      ctx.font = `600 ${Math.max(16, h * .028)}px system-ui`; ctx.fillStyle = '#fff'; ctx.fillText(state.mode === 'police-win' ? 'Alla fem tjuvar sitter i fängelse.' : 'Alla pengar är stulna och polisbossen är besegrad.', w / 2, y + ph * .55);
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
    if (state.shopOpen || state.codesOpen) return;
    if (p.jailed) { updateBots(dt); return; }
    if (p.unconsciousUntil > state.time) { updateBots(dt); return; }
    if (p.vehicle === 'helicopter') {
      if (keys.FlyUp || keys.KeyR) p.altitude = clamp(p.altitude + dt * .75, 0, 2);
      if (keys.FlyDown || keys.KeyC) p.altitude = clamp(p.altitude - dt * .75, 0, 2);
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
    if (canStand(nx, p.y, p.vehicle ? .34 : .23, flying)) p.x = nx;
    if (canStand(p.x, ny, p.vehicle ? .34 : .23, flying)) p.y = ny;
    if (p.vehicleId) {
      const vehicle = state.vehicles.find(v => v.id === p.vehicleId);
      if (vehicle) { vehicle.x = p.x; vehicle.y = p.y; }
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

  function botWalkable(x, y) {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return false;
    return map[y][x] === 0 || map[y][x] === 3;
  }

  function findBotPath(fromX, fromY, toX, toY) {
    const sx = clamp(Math.floor(fromX), 1, MAP_W - 2), sy = clamp(Math.floor(fromY), 1, MAP_H - 2);
    const gx = clamp(Math.floor(toX), 1, MAP_W - 2), gy = clamp(Math.floor(toY), 1, MAP_H - 2);
    const total = MAP_W * MAP_H, previous = new Int32Array(total); previous.fill(-1);
    const queue = new Int32Array(total), start = sy * MAP_W + sx, goal = gy * MAP_W + gx;
    let head = 0, tail = 0; queue[tail++] = start; previous[start] = start;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < tail && previous[goal] === -1) {
      const current = queue[head++], cx = current % MAP_W, cy = Math.floor(current / MAP_W);
      for (const [dx, dy] of directions) {
        const nx = cx + dx, ny = cy + dy, next = ny * MAP_W + nx;
        if (!botWalkable(nx, ny) || previous[next] !== -1) continue;
        previous[next] = current; queue[tail++] = next;
      }
    }
    if (previous[goal] === -1) return [];
    const path = [];
    for (let current = goal; current !== start; current = previous[current]) path.push({ x: current % MAP_W + .5, y: Math.floor(current / MAP_W) + .5 });
    return path.reverse();
  }

  function randomFreeTarget() {
    for (let attempt = 0; attempt < 80; attempt++) {
      const x = 1 + Math.floor(random() * (MAP_W - 2)), y = 1 + Math.floor(random() * (MAP_H - 2));
      if (botWalkable(x, y)) return { x: x + .5, y: y + .5 };
    }
    return { x: 24.5, y: 22.5 };
  }

  function moveBotTo(b, target, dt, speed) {
    b.pathTimer -= dt;
    if (b.pathTimer <= 0 || Math.hypot(target.x - b.targetX, target.y - b.targetY) > .7) {
      b.path = findBotPath(b.x, b.y, target.x, target.y);
      b.targetX = target.x; b.targetY = target.y; b.pathTimer = .55 + random() * .2;
    }
    let waypoint = b.path[0] || target;
    if (Math.hypot(waypoint.x - b.x, waypoint.y - b.y) < .16 && b.path.length) { b.path.shift(); waypoint = b.path[0] || target; }
    const door = doors.get(`${Math.floor(waypoint.x)},${Math.floor(waypoint.y)}`); if (door) door.open = true;
    const angle = Math.atan2(waypoint.y - b.y, waypoint.x - b.x); b.angle = angle;
    const nx = b.x + Math.cos(angle) * speed * dt, ny = b.y + Math.sin(angle) * speed * dt;
    if (canStand(nx, b.y, .18)) b.x = nx; else b.pathTimer = 0;
    if (canStand(b.x, ny, .18)) b.y = ny; else b.pathTimer = 0;
  }

  function nearestActive(role, from, maxDistance = Infinity) {
    const candidates = state.bots.filter(person => person.role === role && !person.jailed && person.unconsciousUntil <= state.time);
    if (state.player.role === role && !state.player.jailed && state.player.unconsciousUntil <= state.time) candidates.push(state.player);
    let best = null, bestDistance = maxDistance;
    for (const person of candidates) { const d = distance(from, person); if (d < bestDistance) { best = person; bestDistance = d; } }
    return best;
  }

  function freeAllThieves(rescuer) {
    let freed = 0;
    for (const thief of state.bots.filter(person => person.role === 'tjuv' && person.jailed)) {
      const cell = state.jailCells[thief.jailCell]; if (cell) cell.occupant = null;
      thief.jailed = false; thief.jailCell = null; thief.health = 3; thief.x = 36 + freed * 1.4; thief.y = 35; thief.path = []; freed++;
    }
    if (state.player.role === 'tjuv' && state.player.jailed) {
      const cell = state.jailCells[state.player.jailCell]; if (cell) cell.occupant = null;
      state.player.jailed = false; state.player.jailCell = null; state.player.health = 3; state.player.x = 40; state.player.y = 35; freed++;
    }
    state.jailedThieves = Math.max(0, state.jailedThieves - freed);
    state.jailKeyHolder = null; state.player.inventory.jailKey = false;
    for (const thief of state.bots.filter(person => person.role === 'tjuv')) thief.inventory.jailKey = false;
    state.botRescueAt = Infinity;
    if (freed) showMessage(`${rescuer} befriade ${freed} tjuv${freed === 1 ? '' : 'ar'}!`, 5);
    return freed;
  }

  function chooseBotGoal(b) {
    if (b.role === 'polis') {
      const thief = nearestActive('tjuv', b, 15);
      if (thief) return { type: 'chase', target: thief, x: thief.x, y: thief.y, speed: 1.35 };
    }
    if (b.role === 'tjuv') {
      const nearbyPolice = b.inventory.baton ? nearestActive('polis', b, 2.4) : null;
      if (nearbyPolice) return { type: 'fight', target: nearbyPolice, x: nearbyPolice.x, y: nearbyPolice.y, speed: 1.2 };
      if (state.jailedThieves >= 4) {
        if (b.inventory.jailKey) return { type: 'release', x: 43, y: 8, speed: 1.3 };
        if (!state.jailKeyHolder || state.jailKeyHolder === b.id) return { type: 'key', x: 38, y: 8.1, speed: 1.3 };
      }
      if (!b.inventory.baton) return { type: 'shop', x: 40, y: 16, speed: 1.05 };
      if (!state.thiefCodesKnown) return { type: 'note', x: 36.5, y: 8.1, speed: 1.12 };
      const safe = state.safes.filter(item => !item.opened).sort((a, c) => distance(b, a) - distance(b, c))[0];
      if (safe) return { type: 'safe', target: safe, x: safe.x, y: safe.y, speed: 1.12 };
      if (!state.boss.defeated) return { type: 'boss', target: state.boss, x: state.boss.x, y: state.boss.y, speed: 1.25 };
    }
    if (!b.wanderTarget || distance(b, b.wanderTarget) < .6) b.wanderTarget = randomFreeTarget();
    return { type: 'wander', x: b.wanderTarget.x, y: b.wanderTarget.y, speed: .72 };
  }

  function updateBots(dt) {
    for (const b of state.bots) {
      if (b.jailed || b.unconsciousUntil > state.time) continue;
      b.cooldown = Math.max(0, b.cooldown - dt);
      const goal = chooseBotGoal(b); b.goal = goal.type;
      moveBotTo(b, goal, dt, goal.speed);
      const close = Math.hypot(goal.x - b.x, goal.y - b.y);
      if (goal.type === 'shop' && close < .8 && b.money >= 10) { b.money -= 10; b.inventory.baton = true; b.pathTimer = 0; }
      if (goal.type === 'note' && close < .8) { b.inventory.codes = true; state.thiefCodesKnown = true; b.pathTimer = 0; }
      if (goal.type === 'safe' && close < .75 && !goal.target.opened) {
        goal.target.opened = true; b.money += 50; state.stolen += 50; b.pathTimer = 0;
        showMessage(`${b.id} öppnade kassaskåpet i Hus ${goal.target.house}!`, 2.2); checkWin();
      }
      if (goal.type === 'key' && close < .75 && (!state.jailKeyHolder || state.jailKeyHolder === b.id)) {
        b.inventory.jailKey = true; state.jailKeyHolder = b.id; b.pathTimer = 0;
      }
      if (goal.type === 'release' && close < 1.1) freeAllThieves(b.id);
      if (goal.type === 'boss' && close < 1.15 && b.cooldown <= 0) {
        b.cooldown = .65; state.boss.health--;
        if (state.boss.health <= 0) { state.boss.health = 0; state.boss.defeated = true; showMessage(`${b.id} besegrade polisbossen!`, 4); checkWin(); }
      }
      if (goal.type === 'chase' && distance(b, goal.target) < .82 && b.cooldown <= 0) {
        b.cooldown = 1.05;
        if (goal.target === state.player && state.player.vehicleId) {
          const vehicle = state.vehicles.find(v => v.id === state.player.vehicleId);
          if (vehicle && --vehicle.health <= 0) destroyVehicle(vehicle);
          else if (vehicle) showMessage(`Fordonet träffades! ${vehicle.health}/10 liv`, 1);
        } else {
          goal.target.health--;
          if (goal.target.health <= 0) jailThief(goal.target);
          else if (goal.target === state.player) showMessage(`Polisen träffade dig! ${goal.target.health} liv kvar`, 1);
        }
      }
      if (goal.type === 'fight' && distance(b, goal.target) < .9 && b.cooldown <= 0) {
        b.cooldown = .85; goal.target.health--;
        if (goal.target.health <= 0) {
          goal.target.health = 3; goal.target.unconsciousUntil = state.time + 10;
          if (goal.target === state.player) showMessage('En tjuv slog dig medvetslös i 10 sekunder!', 3);
        }
      }
    }
    const bossTarget = nearestActive('tjuv', state.boss, 1.55);
    if (!state.boss.defeated && bossTarget && state.boss.cooldown <= 0) { state.boss.cooldown = 1.1; bossTarget.health--; if (bossTarget.health <= 0) jailThief(bossTarget); }
    if (state.player.jailed && state.time >= state.botRescueAt) {
      const rescuer = state.bots.find(b => b.role === 'tjuv' && !b.jailed && b.unconsciousUntil <= state.time);
      if (rescuer) freeAllThieves(rescuer.id);
    }
  }

  function jailThief(thief) {
    if (thief.jailed) return;
    const cell = state.jailCells.find(candidate => candidate.occupant === null);
    if (!cell) return;
    thief.health = 3; thief.jailed = true; thief.jailCell = cell.index;
    if (thief.inventory?.jailKey) { thief.inventory.jailKey = false; if (state.jailKeyHolder === thief.id) state.jailKeyHolder = null; }
    cell.occupant = thief === state.player ? 'spelaren' : thief.id;
    thief.x = cell.x; thief.y = cell.y;
    state.jailedThieves = clamp(state.jailedThieves + 1, 0, 5);
    if (thief === state.player) { thief.vehicle = null; thief.vehicleId = null; state.botRescueAt = state.time + 12; }
    showMessage(thief === state.player ? 'Du har blivit fångad!' : 'En tjuv har skickats till fängelset!');
    checkWin();
  }

  function destroyVehicle(vehicle) {
    vehicle.destroyed = true; vehicle.health = 0;
    if (state.player.vehicleId === vehicle.id) { state.player.vehicle = null; state.player.vehicleId = null; state.player.altitude = 0; }
    showMessage(`${vehicle.label.toUpperCase()} SPRÄNGDES!`, 3);
    playTone(95, .35, 'sawtooth');
  }

  function checkWin() {
    const oldMode = state.mode;
    if (state.jailedThieves >= 5) state.mode = 'police-win';
    else if (state.stolen >= 500 && state.boss.defeated) state.mode = 'thief-win';
    if (state.mode !== oldMode) playTone(740, .45, 'triangle');
  }

  function render() {
    if (state.mode === 'role-select') drawRoleSelect(); else drawWorld();
  }

  function interact() {
    if (state.mode !== 'playing') return;
    const p = state.player;
    if (state.shopOpen) { state.shopOpen = false; return; }
    if (state.codesOpen) { state.codesOpen = false; return; }
    if (p.jailed || p.unconsciousUntil > state.time) return;
    if (p.vehicleId) {
      const vehicle = state.vehicles.find(v => v.id === p.vehicleId);
      if (vehicle) { vehicle.x = p.x; vehicle.y = p.y; }
      p.vehicle = null; p.vehicleId = null; p.altitude = 0;
      showMessage('Du steg ur fordonet');
      return;
    }
    let nearbyVehicle = null, vehicleDistance = 1.65;
    for (const vehicle of state.vehicles) {
      const d = distance(p, vehicle);
      if (!vehicle.destroyed && d < vehicleDistance) { vehicleDistance = d; nearbyVehicle = vehicle; }
    }
    if (nearbyVehicle) {
      const owned = nearbyVehicle.owner === p.role || nearbyVehicle.owner === 'player';
      const hasType = nearbyVehicle.type === 'car' ? p.inventory.car : p.inventory.helicopter;
      if (!owned || !hasType) { showMessage(`Du måste köpa ${nearbyVehicle.type === 'car' ? 'bilen' : 'helikoptern'} i affären först`); return; }
      p.vehicle = nearbyVehicle.type; p.vehicleId = nearbyVehicle.id; p.x = nearbyVehicle.x; p.y = nearbyVehicle.y;
      showMessage(`Du kör nu ${nearbyVehicle.label}. E = stig ur${nearbyVehicle.type === 'helicopter' ? ', R/C = upp/ner' : ''}`, 4);
      return;
    }
    let safe = null;
    for (const candidate of state.safes) if (!candidate.opened && distance(p, candidate) < 1.45) safe = candidate;
    if (safe) {
      if (p.role !== 'tjuv') { showMessage('Bara tjuvarna kan öppna kassaskåp'); return; }
      if (!p.inventory.codes) { showMessage('Du behöver kodlappen från polishuset'); return; }
      safe.opened = true; p.money += safe.money; state.stolen += safe.money;
      showMessage(`Kod ${safe.code}! Du stal 50 pengar från Hus ${safe.house}`, 4); checkWin(); return;
    }
    if (Math.hypot(p.x - 36.5, p.y - 8.1) < 1.45) {
      p.inventory.codes = true; state.thiefCodesKnown ||= p.role === 'tjuv'; state.codesOpen = true; return;
    }
    if (Math.hypot(p.x - 38, p.y - 8.1) < 1.35 && !p.inventory.jailKey) {
      if (p.role !== 'tjuv') { showMessage('Det är nyckeln till de fem fängelsecellerna'); return; }
      if (state.jailKeyHolder && state.jailKeyHolder !== p.id) { showMessage('En annan tjuv har redan nyckeln'); return; }
      p.inventory.jailKey = true; state.jailKeyHolder = p.id; showMessage('Du tog fängelsenyckeln!'); return;
    }
    if (Math.hypot(p.x - 43, p.y - 8) < 2 && p.role === 'tjuv') {
      if (!p.inventory.jailKey) { showMessage('Du behöver nyckeln som ligger bredvid kodlappen'); return; }
      const prisoners = state.bots.filter(b => b.role === 'tjuv' && b.jailed);
      if (!prisoners.length) { showMessage('Ingen tjuv sitter i fängelse'); return; }
      prisoners.forEach((b, i) => {
        const cell = state.jailCells[b.jailCell]; if (cell) cell.occupant = null;
        b.jailed = false; b.jailCell = null; b.health = 3; b.x = 36 + i * 1.7; b.y = 35; b.targetX = b.x; b.targetY = b.y;
      });
      state.jailedThieves = Math.max(0, state.jailedThieves - prisoners.length); p.inventory.jailKey = false;
      state.jailKeyHolder = null;
      showMessage(`Du befriade ${prisoners.length} tjuv${prisoners.length === 1 ? '' : 'ar'}!`, 4); return;
    }
    if (p.x > shop.x && p.x < shop.x + shop.w && p.y > shop.y && p.y < shop.y + shop.h && Math.hypot(p.x - 40, p.y - 16) < 4.5) {
      state.shopOpen = true; return;
    }
    let nearest = null, best = 1.7;
    for (const door of doors.values()) {
      const d = Math.hypot(p.x - (door.x + .5), p.y - (door.y + .5));
      if (d < best) { best = d; nearest = door; }
    }
    if (nearest) { nearest.open = !nearest.open; playTone(nearest.open ? 420 : 280, .08, 'square'); showMessage(`${nearest.label}: dörren är ${nearest.open ? 'öppen' : 'stängd'}`); return; }
    showMessage('Inget att använda här');
  }

  function buy(item) {
    const p = state.player;
    if (!state.shopOpen || !p) return;
    const price = { baton: 10, car: 20, helicopter: 30 }[item];
    if (!price) return;
    if ((item === 'baton' || item === 'helicopter') && p.role === 'människa') { showMessage('Vanliga människor får bara köpa bil'); return; }
    if (p.inventory[item]) { showMessage(`Du har redan ${item === 'baton' ? 'en klubba' : item === 'car' ? 'en bil' : 'en helikopter'}`); return; }
    if (p.money < price) { showMessage(`Du behöver ${price - p.money} pengar till`); return; }
    p.money -= price; p.inventory[item] = true;
    if (item === 'car') state.vehicles.find(v => v.id === 'shop-car').owner = 'player';
    if (item === 'helicopter') state.vehicles.find(v => v.id === 'shop-heli').owner = 'player';
    state.shopOpen = false;
    playTone(680, .12, 'triangle');
    showMessage(`Köpet klart: ${item === 'baton' ? 'klubba' : item === 'car' ? 'bil' : 'helikopter'}!`, 3);
  }

  function attack() {
    if (state.mode !== 'playing') return;
    const p = state.player;
    if (!p.inventory.baton) { showMessage(p.role === 'människa' ? 'Vanliga människor kan inte använda klubbor' : 'Köp en klubba i affären först'); return; }
    if (p.attackCooldown > 0) return;
    p.attackCooldown = .45;
    const bossDistance = distance(p, state.boss);
    const bossAngle = Math.abs(angleDiff(Math.atan2(state.boss.y - p.y, state.boss.x - p.x), p.angle));
    if (p.role === 'tjuv' && !state.boss.defeated && bossDistance < 2.3 && bossAngle < .55) {
      state.boss.health--;
      if (state.boss.health <= 0) { state.boss.health = 0; state.boss.defeated = true; showMessage('Polisbossen är besegrad!', 4); checkWin(); }
      else showMessage(`Polisbossen har ${state.boss.health}/20 liv kvar`, 1.2);
      return;
    }
    let target = null, best = 2.05;
    for (const b of state.bots) {
      if (b.jailed || b.unconsciousUntil > state.time) continue;
      const d = distance(p, b), a = Math.abs(angleDiff(Math.atan2(b.y - p.y, b.x - p.x), p.angle));
      if (d < best && a < .48) { target = b; best = d; }
    }
    if (!target) {
      let vehicle = null, vehicleDistance = 2.2;
      for (const v of state.vehicles) {
        const d = distance(p, v), a = Math.abs(angleDiff(Math.atan2(v.y - p.y, v.x - p.x), p.angle));
        if (!v.destroyed && v.id !== p.vehicleId && d < vehicleDistance && a < .55) { vehicle = v; vehicleDistance = d; }
      }
      if (vehicle) { vehicle.health--; if (vehicle.health <= 0) destroyVehicle(vehicle); else showMessage(`${vehicle.label}: ${vehicle.health}/10 liv`, 1); return; }
      showMessage('Du träffade ingen', 1); return;
    }
    target.health--;
    if (target.health <= 0) {
      if (p.role === 'polis' && target.role === 'tjuv') jailThief(target);
      else { const secs = target.role === 'polis' ? 10 : 5; target.unconsciousUntil = state.time + secs; target.health = 3; showMessage(`${target.role === 'polis' ? 'Polisen' : 'Personen'} svimmade i ${secs} sekunder`); }
    } else showMessage(`Träff! ${target.health} liv kvar`, 1.2);
  }

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (state.mode === 'role-select' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) chooseRole({ Digit1: 'polis', Digit2: 'tjuv', Digit3: 'människa' }[e.code]);
    if (state.shopOpen && ['Digit1', 'Digit2', 'Digit3'].includes(e.code) && !e.repeat) buy({ Digit1: 'baton', Digit2: 'car', Digit3: 'helicopter' }[e.code]);
    if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) interact();
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
      vehicle: state.player.vehicle,
      jailed: state.player.jailed,
      jailCell: state.player.jailCell,
      unconsciousSeconds: Math.max(0, +(state.player.unconsciousUntil - state.time).toFixed(1)),
      currentBuilding: currentBuildingAt(state.player.x, state.player.y)?.id || null,
      inventory: state.player.inventory,
    },
    city: { people: 20, bots: state.bots.length, roleCounts: state.roleCounts, structures: structures.map(s => ({ id: s.id, label: s.label, type: s.type, x: s.center.x, y: s.center.y, doorOpen: doors.get(`${s.door.x},${s.door.y}`)?.open })) },
    nearbyBots: state.player ? state.bots.filter(b => !b.jailed && distance(b, state.player) < 8).map(b => ({ id: b.id, role: b.role, x: +b.x.toFixed(1), y: +b.y.toFixed(1), health: b.health, goal: b.goal, money: b.money, unconsciousSeconds: Math.max(0, +(b.unconsciousUntil - state.time).toFixed(1)) })) : [],
    interactives: state.player ? {
      shopOpen: state.shopOpen,
      codesOpen: state.codesOpen,
      thiefCodesKnown: state.thiefCodesKnown,
      jailKeyHolder: state.jailKeyHolder,
      unopenedSafes: state.safes.filter(s => !s.opened).map(s => ({ house: s.house, x: s.x, y: s.y, money: s.money })),
      jailCells: state.jailCells.map(cell => ({ number: cell.index + 1, occupant: cell.occupant, x: cell.x, y: cell.y })),
      vehicles: state.vehicles.map(v => ({ id: v.id, type: v.type, x: +v.x.toFixed(1), y: +v.y.toFixed(1), health: v.health, owner: v.owner, destroyed: v.destroyed })),
    } : null,
    objectives: { stolenMoney: state.stolen, totalSafeMoney: 500, jailedThieves: state.jailedThieves, bossHealth: state.boss.health, bossDefeated: state.boss.defeated },
    message: state.messageUntil > state.time ? state.message : '',
  });
  window.advanceTime = ms => {
    manualTime = true;
    const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(1 / 60);
    render();
  };
  window.__wilderTest = { state, chooseRole, interact, attack, render };
  window.__wilderFallback = window.__wilderTest;

  let last = performance.now();
  function frame(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; if (!manualTime) update(dt); render(); requestAnimationFrame(frame); }
  render(); requestAnimationFrame(frame);
})();
