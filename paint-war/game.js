(() => {
  "use strict";

  const canvas = document.getElementById("game");
  if (!canvas) {
    console.error("Paint War behöver <canvas id=\"game\">.");
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: false });
  const view = document.createElement("canvas");
  view.width = 480;
  view.height = 270;
  const g = view.getContext("2d", { alpha: false });

  const W = view.width;
  const H = view.height;
  const MAP_W = 74;
  const MAP_H = 74;
  const PLAYER_RADIUS = 0.23;
  const CAMERA_HEIGHT = 0.56;
  const TEAM_COLORS = ["#20a4ff", "#ff466d", "#ffd43b", "#5ee06f", "#bd63ff"];
  const SOLO_COLORS = [
    "#20a4ff", "#ff466d", "#ffd43b", "#5ee06f", "#bd63ff",
    "#ff8a30", "#25e0d0", "#f45bd1", "#a6ef47", "#7f8cff",
  ];
  const WEAPONS = [
    { key: "handgun", name: "Handpistol", damage: 30, interval: 500, range: 34 },
    { key: "longgun", name: "Långpistol", damage: 5, interval: 1, range: 42 },
  ];
  const UPGRADE_COST = { handgun: 150, longgun: 100 };
  const grid = new Uint8Array(MAP_W * MAP_H);
  const wallTheme = new Uint8Array(MAP_W * MAP_H);
  const keys = Object.create(null);
  const touchActions = Object.create(null);
  const pointerState = { move: null, look: null };

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem("paintWarSave") || "{}");
      return {
        coins: Number.isFinite(saved.coins) ? saved.coins : 300,
        upgrades: {
          handgun: Boolean(saved.upgrades && saved.upgrades.handgun),
          longgun: Boolean(saved.upgrades && saved.upgrades.longgun),
        },
      };
    } catch {
      return { coins: 300, upgrades: { handgun: false, longgun: false } };
    }
  }

  const save = loadSave();
  const state = {
    phase: "menu",
    mode: null,
    players: [],
    player: null,
    decals: [],
    tracers: [],
    particles: [],
    time: 0,
    winner: null,
    endDelay: 0,
    outroomCount: 0,
    outroomIntro: 0,
    weapon: 0,
    scoped: false,
    firing: false,
    jumping: false,
    sprinting: false,
    pitch: 0,
    recoil: 0,
    hitmarker: 0,
    hurtFlash: 0,
    muzzleFlash: 0,
    message: "",
    messageTime: 0,
    coins: save.coins,
    upgrades: save.upgrades,
    stats: { hits: 0, ko: 0, points: 0 },
    seed: 123456789,
    testClock: false,
  };

  function saveProgress() {
    try {
      localStorage.setItem("paintWarSave", JSON.stringify({
        coins: state.coins,
        upgrades: state.upgrades,
      }));
    } catch {
      // Spelet fungerar även när privat surfning blockerar localStorage.
    }
  }

  const cellIndex = (x, z) => z * MAP_W + x;
  function getCell(x, z) {
    x = Math.floor(x);
    z = Math.floor(z);
    if (x < 0 || z < 0 || x >= MAP_W || z >= MAP_H) return 1;
    return grid[cellIndex(x, z)];
  }
  function setCell(x, z, value, theme = 0) {
    if (x < 0 || z < 0 || x >= MAP_W || z >= MAP_H) return;
    const i = cellIndex(x, z);
    grid[i] = value;
    wallTheme[i] = theme;
  }

  function drawHouse(x, z, w, h, theme) {
    for (let xx = x; xx < x + w; xx += 1) {
      setCell(xx, z, 1, theme);
      setCell(xx, z + h - 1, 1, theme);
    }
    for (let zz = z; zz < z + h; zz += 1) {
      setCell(x, zz, 1, theme);
      setCell(x + w - 1, zz, 1, theme);
    }
    const doorX = x + Math.floor(w / 2);
    setCell(doorX, z + h - 1, 0);
    if (w > 8) setCell(doorX + 1, z + h - 1, 0);
    setCell(x + 2, z, 2, theme);
    setCell(x + w - 3, z, 2, theme);
    setCell(x, z + 2, 2, theme);
    setCell(x + w - 1, z + h - 3, 2, theme);
    const divider = z + Math.floor(h / 2);
    for (let xx = x + 1; xx < x + w - 1; xx += 1) {
      if (xx !== doorX) setCell(xx, divider, 1, theme);
    }
  }

  function buildArena() {
    grid.fill(0);
    wallTheme.fill(0);
    for (let x = 0; x <= 64; x += 1) {
      setCell(x, 0, 1, 0);
      setCell(x, 64, 1, 0);
    }
    for (let z = 0; z <= 64; z += 1) {
      setCell(0, z, 1, 0);
      setCell(64, z, 1, 0);
    }
    for (let z = 0; z < MAP_H; z += 1) {
      for (let x = 65; x < MAP_W; x += 1) setCell(x, z, 1, 5);
    }
    for (let z = 65; z < MAP_H; z += 1) {
      for (let x = 0; x < MAP_W; x += 1) setCell(x, z, 1, 5);
    }
    for (let z = 68; z <= 72; z += 1) {
      for (let x = 68; x <= 72; x += 1) setCell(x, z, 0, 5);
    }
    drawHouse(3, 3, 10, 9, 1);
    drawHouse(22, 3, 11, 10, 2);
    drawHouse(46, 3, 11, 10, 3);
    drawHouse(3, 23, 11, 10, 4);
    drawHouse(22, 23, 12, 10, 1);
    drawHouse(46, 23, 11, 10, 2);
    drawHouse(3, 45, 12, 11, 3);
    drawHouse(23, 45, 11, 11, 4);
    drawHouse(44, 45, 13, 11, 1);
    for (let x = 8; x <= 14; x += 1) setCell(x, 40, 1, 4);
    for (let z = 18; z <= 23; z += 1) setCell(39, z, 1, 2);
    for (let x = 40; x <= 46; x += 1) setCell(x, 39, 1, 3);
  }
  buildArena();

  function isRoad(x, z) {
    return (x >= 15 && x <= 19) || (x >= 37 && x <= 42)
      || (z >= 15 && z <= 20) || (z >= 36 && z <= 42);
  }

  const HOUSE_FLOORS = [
    [3, 3, 10, 9, "#d9b776"], [22, 3, 11, 10, "#c5d8df"], [46, 3, 11, 10, "#dfc5a2"],
    [3, 23, 11, 10, "#c8d8b5"], [22, 23, 12, 10, "#d7b5c9"], [46, 23, 11, 10, "#c8d4e6"],
    [3, 45, 12, 11, "#dec48f"], [23, 45, 11, 11, "#bed9d6"], [44, 45, 13, 11, "#d9bdce"],
  ];

  function floorColor(x, z) {
    if (x >= 68 && x <= 73 && z >= 68 && z <= 73) {
      return (Math.floor(x) + Math.floor(z)) % 2 ? "#33465a" : "#405a70";
    }
    for (const [hx, hz, hw, hh, color] of HOUSE_FLOORS) {
      if (x > hx && x < hx + hw - 1 && z > hz && z < hz + hh - 1) {
        return (Math.floor(x * 2) + Math.floor(z * 2)) % 2 ? color : shade(color, 0.92);
      }
    }
    if (isRoad(x, z)) {
      const horizontal = (z >= 15 && z <= 20) || (z >= 36 && z <= 42);
      const center = horizontal
        ? (Math.abs(z - 17.5) < 0.11 || Math.abs(z - 39) < 0.11)
        : (Math.abs(x - 17) < 0.11 || Math.abs(x - 39.5) < 0.11);
      const dashAxis = horizontal ? x : z;
      if (center && Math.floor(dashAxis * 0.55) % 2 === 0) return "#f3cf55";
      return (Math.floor(x) + Math.floor(z)) % 2 ? "#59636b" : "#626d75";
    }
    return (Math.floor(x) + Math.floor(z)) % 2 ? "#557452" : "#5f805b";
  }

  function seededRandom() {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }

  function normalizeAngle(a) {
    while (a < -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
  }

  function collides(x, z) {
    for (let i = 0; i < 8; i += 1) {
      const a = i * Math.PI / 4;
      if (getCell(x + Math.cos(a) * PLAYER_RADIUS, z + Math.sin(a) * PLAYER_RADIUS) !== 0) return true;
    }
    return false;
  }

  function moveActor(actor, dx, dz) {
    const nx = actor.x + dx;
    const nz = actor.z + dz;
    if (!collides(nx, actor.z)) actor.x = nx;
    if (!collides(actor.x, nz)) actor.z = nz;
  }

  function teamFor(mode, i) {
    if (mode === "solo") return i;
    if (mode === "duo") return Math.floor(i / 2);
    return i < 5 ? 0 : 1;
  }

  const SPAWNS = [
    [17.5, 2.5], [39.5, 2.5], [61.5, 10.5], [16.5, 22],
    [43.5, 22], [61, 30], [16.5, 43.5], [39.5, 43.5],
    [61, 52], [38, 61],
  ];

  function createActor(i, mode) {
    const team = teamFor(mode, i);
    const spawn = SPAWNS[i];
    return {
      id: i,
      name: i === 0 ? "Du" : `Bot ${i}`,
      bot: i !== 0,
      team,
      color: mode === "solo" ? SOLO_COLORS[i] : TEAM_COLORS[team],
      x: spawn[0],
      z: spawn[1],
      angle: i === 0 ? Math.PI / 2 : seededRandom() * Math.PI * 2,
      health: 100,
      alive: true,
      outroom: false,
      weapon: i % 3 === 0 ? 0 : 1,
      cooldown: i === 0 ? 0 : 500 + seededRandom() * 700,
      think: seededRandom() * 0.4,
      target: null,
      strafe: seededRandom() < 0.5 ? -1 : 1,
      paint: [],
      y: 0,
      vy: 0,
    };
  }

  function setScreen(name) {
    const screens = {
      menu: document.getElementById("main-menu"),
      shop: document.getElementById("shop-overlay"),
      "match-end": document.getElementById("match-end-overlay"),
    };
    Object.entries(screens).forEach(([screenName, el]) => {
      if (!el) return;
      el.hidden = screenName !== name;
      el.setAttribute("aria-hidden", String(screenName !== name));
    });
    const playing = name === null && (state.phase === "playing" || state.phase === "end");
    const hud = document.getElementById("hud");
    const crosshair = document.getElementById("crosshair");
    const touch = document.getElementById("touch-controls");
    if (hud) hud.hidden = !playing;
    if (crosshair) crosshair.hidden = !playing;
    if (touch) touch.hidden = !playing;
    if (!playing) {
      const outroom = document.getElementById("outroom-overlay");
      if (outroom) outroom.hidden = true;
      const teamBadge = document.getElementById("team-badge");
      const status = document.getElementById("status-banner");
      const scope = document.getElementById("scope-overlay");
      if (teamBadge) teamBadge.hidden = true;
      if (status) status.hidden = true;
      if (scope) scope.hidden = true;
    }
    document.body.classList.toggle("is-playing", playing);
  }

  function resetControls() {
    Object.keys(keys).forEach((key) => { keys[key] = false; });
    Object.keys(touchActions).forEach((key) => { touchActions[key] = false; });
    pointerState.move = null;
    pointerState.look = null;
    state.firing = false;
    state.jumping = false;
    state.sprinting = false;
    const knob = document.getElementById("move-knob");
    if (knob) knob.style.transform = "translate(-50%, -50%)";
    document.querySelectorAll("[data-action].active").forEach((button) => button.classList.remove("active"));
  }

  function startMatch(mode) {
    state.phase = "playing";
    state.mode = mode;
    state.seed = 1977 + ["solo", "duo", "team"].indexOf(mode) * 911;
    state.players = Array.from({ length: 10 }, (_, i) => createActor(i, mode));
    state.player = state.players[0];
    state.decals.length = 0;
    state.tracers.length = 0;
    state.particles.length = 0;
    state.time = 0;
    state.winner = null;
    state.endDelay = 0;
    state.outroomCount = 0;
    state.outroomIntro = 0;
    state.weapon = 0;
    state.scoped = false;
    state.pitch = 0;
    state.stats = { hits: 0, ko: 0, points: 0 };
    state.message = mode === "solo" ? "Alla mot alla!" : "Håll ihop med ditt lag!";
    state.messageTime = 2.5;
    resetControls();
    setScreen(null);
    updateHud();
    canvas.focus();
  }

  function returnToMenu() {
    state.phase = "menu";
    resetControls();
    state.scoped = false;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    setScreen("menu");
    render();
  }

  function openShop() {
    state.phase = "shop";
    setScreen("shop");
    updateShop();
    render();
  }

  function buyUpgrade(key) {
    if (!(key in UPGRADE_COST) || state.upgrades[key]) return;
    const cost = UPGRADE_COST[key];
    if (state.coins < cost) {
      state.message = "Du behöver fler färgmynt!";
      state.messageTime = 2;
      updateShop();
      return;
    }
    state.coins -= cost;
    state.upgrades[key] = true;
    saveProgress();
    updateShop();
    updateHud();
  }

  function weaponStats(actor) {
    const base = WEAPONS[actor.bot ? actor.weapon : state.weapon];
    const upgraded = !actor.bot && state.upgrades[base.key];
    return {
      ...base,
      upgraded,
      interval: upgraded && base.key === "handgun" ? 1 : base.interval,
      range: upgraded && base.key === "longgun" ? 90 : base.range,
    };
  }

  function traceWall(x, z, angle, maxDistance, ignoreWindows = true) {
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    for (let d = 0.08; d <= maxDistance; d += 0.08) {
      const px = x + dx * d;
      const pz = z + dz * d;
      const cell = getCell(px, pz);
      if (cell === 1 || (cell === 2 && !ignoreWindows)) {
        return { distance: d, x: px, z: pz, cell };
      }
    }
    return { distance: maxDistance, x: x + dx * maxDistance, z: z + dz * maxDistance, cell: 0 };
  }

  function nearestTargetOnRay(actor, angle, range, aimPitch = 0) {
    const wallHit = traceWall(actor.x, actor.z, angle, range, true);
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let best = null;
    let bestAlong = wallHit.distance;
    for (const target of state.players) {
      if (!target.alive || target.id === actor.id || target.team === actor.team) continue;
      const tx = target.x - actor.x;
      const tz = target.z - actor.z;
      const along = tx * dx + tz * dz;
      if (along <= 0 || along >= bestAlong) continue;
      const side = Math.abs(tx * dz - tz * dx);
      const rayHeight = actor.y + CAMERA_HEIGHT - Math.tan(aimPitch) * along;
      const targetCenter = target.y + 0.5;
      if (side < 0.34 && Math.abs(rayHeight - targetCenter) < 0.52) {
        best = target;
        bestAlong = along;
      }
    }
    return { target: best, wallHit, distance: bestAlong };
  }

  function addDecal(hit, color, floor = false) {
    const nearby = state.decals.find((decal) => decal.floor === floor
      && decal.color === color
      && Math.hypot(decal.x - hit.x, decal.z - hit.z) < 0.16);
    if (nearby) {
      nearby.size = Math.min(0.38, nearby.size + 0.025);
      return;
    }
    state.decals.push({
      x: hit.x,
      z: hit.z,
      color,
      floor,
      size: 0.14 + seededRandom() * 0.12,
    });
  }

  function eliminate(target, attacker) {
    if (!target.alive) return;
    target.alive = false;
    target.health = 0;
    target.outroom = true;
    const slot = state.outroomCount++;
    target.x = 68.7 + (slot % 3) * 1.25;
    target.z = 68.7 + Math.floor(slot / 3) * 1.25;
    target.angle = Math.PI;
    if (attacker && !attacker.bot && target.bot) {
      state.coins += 20;
      state.stats.ko += 1;
      state.stats.points += 20;
      saveProgress();
      state.message = `Du målade ut ${target.name}! +20`;
      state.messageTime = 2;
    }
    if (target === state.player) {
      state.message = "Du är utslagen – välkommen till Outroom!";
      state.messageTime = 4;
      state.outroomIntro = 3.2;
      state.scoped = false;
    }
  }

  function fire(actor) {
    if (!actor.alive || actor.cooldown > 0) return false;
    const stats = weaponStats(actor);
    actor.cooldown += stats.interval;
    let angle = actor.angle;
    const spread = stats.key === "longgun" ? (stats.upgraded && state.scoped ? 0.002 : 0.022) : 0.01;
    angle += (seededRandom() - 0.5) * spread;
    const aimPitch = actor === state.player ? state.pitch : 0;
    const result = nearestTargetOnRay(actor, angle, stats.range, aimPitch);
    let end = result.wallHit;
    if (result.target) {
      const target = result.target;
      end = { x: target.x, z: target.z, distance: result.distance };
      target.health = Math.max(0, target.health - stats.damage);
      target.paint.push({ color: actor.color, amount: stats.damage });
      if (target.paint.length > 8) target.paint.shift();
      if (actor === state.player) {
        state.hitmarker = 0.16;
        state.stats.hits += 1;
      }
      if (target === state.player) state.hurtFlash = 0.25;
      if (target.health <= 0) eliminate(target, actor);
    } else {
      const downward = actor === state.player && state.pitch > 0.22;
      if (downward) {
        const groundDistance = Math.min(stats.range, CAMERA_HEIGHT / Math.tan(Math.max(0.05, state.pitch)));
        if (groundDistance < result.wallHit.distance) {
          end = {
            x: actor.x + Math.cos(angle) * groundDistance,
            z: actor.z + Math.sin(angle) * groundDistance,
          };
          addDecal(end, actor.color, true);
        } else addDecal(result.wallHit, actor.color, false);
      } else addDecal(result.wallHit, actor.color, false);
    }
    state.tracers.push({
      x1: actor.x, z1: actor.z, x2: end.x, z2: end.z,
      color: actor.color, life: 0.09,
    });
    if (actor === state.player) {
      state.recoil = Math.min(0.12, state.recoil + (stats.key === "handgun" ? 0.045 : 0.012));
      state.muzzleFlash = 0.07;
    }
    return true;
  }

  function livingEnemies(actor) {
    return state.players.filter((p) => p.alive && p.team !== actor.team);
  }

  function updateBot(bot, dt) {
    if (!bot.alive) return;
    bot.cooldown -= dt * 1000;
    bot.think -= dt;
    if (bot.think <= 0 || !bot.target || !bot.target.alive) {
      const enemies = livingEnemies(bot);
      let nearest = null;
      let nearestDist = Infinity;
      for (const enemy of enemies) {
        const d = Math.hypot(enemy.x - bot.x, enemy.z - bot.z);
        if (d < nearestDist) {
          nearest = enemy;
          nearestDist = d;
        }
      }
      bot.target = nearest;
      bot.think = 0.18 + seededRandom() * 0.22;
      if (seededRandom() < 0.18) bot.strafe *= -1;
    }
    if (!bot.target) {
      bot.cooldown = Math.max(0, bot.cooldown);
      return;
    }
    const dx = bot.target.x - bot.x;
    const dz = bot.target.z - bot.z;
    const dist = Math.hypot(dx, dz);
    const desired = Math.atan2(dz, dx);
    bot.angle += normalizeAngle(desired - bot.angle) * Math.min(1, dt * 4.2);
    const los = traceWall(bot.x, bot.z, desired, dist, true).distance >= dist - 0.2;
    const forward = dist > 6 ? 1 : dist < 2.5 ? -0.6 : 0.15;
    const speed = 1.55 * dt;
    let mx = Math.cos(bot.angle) * forward + Math.cos(bot.angle + Math.PI / 2) * bot.strafe * 0.35;
    let mz = Math.sin(bot.angle) * forward + Math.sin(bot.angle + Math.PI / 2) * bot.strafe * 0.35;
    moveActor(bot, mx * speed, mz * speed);
    if (los && dist < weaponStats(bot).range && Math.abs(normalizeAngle(desired - bot.angle)) < 0.08) {
      const accuracy = bot.weapon === 0 ? 0.7 : 0.34;
      const original = bot.angle;
      bot.angle += (seededRandom() - 0.5) * (seededRandom() < accuracy ? 0.025 : 0.24);
      let burst = 0;
      while (bot.cooldown <= 0 && burst < 24 && bot.alive) {
        if (!fire(bot)) break;
        burst += 1;
      }
      bot.angle = original;
    } else bot.cooldown = Math.max(0, bot.cooldown);
  }

  function updatePlayer(dt) {
    const p = state.player;
    if (!p) return;
    p.cooldown -= dt * 1000;
    const forwardInput = (keys.KeyW || keys.ArrowUp || touchActions.forward ? 1 : 0)
      - (keys.KeyS || keys.ArrowDown || touchActions.backward ? 1 : 0);
    const sideInput = (keys.KeyD || keys.ArrowRight || touchActions.right ? 1 : 0)
      - (keys.KeyA || keys.ArrowLeft || touchActions.left ? 1 : 0);
    let joyX = 0;
    let joyY = 0;
    if (pointerState.move) {
      const radius = pointerState.move.radius || 48;
      joyX = Math.max(-1, Math.min(1, (pointerState.move.x - pointerState.move.startX) / radius));
      joyY = Math.max(-1, Math.min(1, (pointerState.move.y - pointerState.move.startY) / radius));
    }
    const forward = forwardInput - joyY;
    const side = sideInput + joyX;
    const magnitude = Math.hypot(forward, side);
    const sprint = keys.ShiftLeft || keys.ShiftRight || touchActions.sprint;
    const speed = (sprint ? 4.25 : 2.65) * dt / Math.max(1, magnitude);
    if (p.alive || p.outroom) {
      moveActor(
        p,
        (Math.cos(p.angle) * forward + Math.cos(p.angle + Math.PI / 2) * side) * speed,
        (Math.sin(p.angle) * forward + Math.sin(p.angle + Math.PI / 2) * side) * speed,
      );
    }
    if ((keys.Space || touchActions.jump || state.jumping) && p.y <= 0.001) p.vy = 4.2;
    p.vy -= 10.5 * dt;
    p.y = Math.max(0, p.y + p.vy * dt);
    if (p.y === 0 && p.vy < 0) p.vy = 0;
    if (p.alive && (state.firing || touchActions.shoot)) {
      let burst = 0;
      while (p.cooldown <= 0 && burst < 24 && p.alive) {
        if (!fire(p)) break;
        burst += 1;
      }
    } else p.cooldown = Math.max(0, p.cooldown);
  }

  function checkWinner(dt) {
    const alive = state.players.filter((p) => p.alive);
    const contenders = state.mode === "solo"
      ? new Set(alive.map((p) => p.id))
      : new Set(alive.map((p) => p.team));
    if (contenders.size <= 1 && state.players.length) {
      state.endDelay += dt;
      if (state.endDelay >= 1.25) {
        state.winner = contenders.size ? [...contenders][0] : null;
        endMatch();
      }
    } else state.endDelay = 0;
  }

  function endMatch() {
    if (state.phase !== "playing") return;
    const playerWon = state.winner !== null
      && (state.mode === "solo" ? state.winner === state.player.id : state.winner === state.player.team);
    state.phase = "end";
    resetControls();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    if (playerWon) {
      state.coins += 100;
      state.stats.points += 100;
      saveProgress();
    }
    const title = document.getElementById("match-end-title");
    const message = document.getElementById("match-end-message");
    const kicker = document.getElementById("match-end-kicker");
    if (kicker) kicker.textContent = "MATCHEN ÄR SLUT";
    if (title) title.textContent = playerWon ? "DU VANN!" : "VINNARE!";
    if (message) {
      message.textContent = playerWon
        ? "Du eller ditt lag blev sist kvar i Paint War. +100 Paint-poäng!"
        : "Du åkte ut, men färgkriget fortsatte till sista deltagaren.";
    }
    setText(["result-hits"], `${state.stats.hits}`);
    setText(["result-ko"], `${state.stats.ko}`);
    setText(["result-points"], `${state.stats.points}`);
    setScreen("match-end");
    updateHud();
  }

  function step(dt) {
    if (state.phase !== "playing") return;
    dt = Math.min(dt, 0.05);
    state.time += dt;
    updatePlayer(dt);
    for (const bot of state.players) if (bot.bot) updateBot(bot, dt);
    for (const tracer of state.tracers) tracer.life -= dt;
    state.tracers = state.tracers.filter((t) => t.life > 0);
    state.hitmarker = Math.max(0, state.hitmarker - dt);
    state.hurtFlash = Math.max(0, state.hurtFlash - dt);
    state.muzzleFlash = Math.max(0, state.muzzleFlash - dt);
    state.recoil *= Math.pow(0.02, dt);
    state.messageTime = Math.max(0, state.messageTime - dt);
    state.outroomIntro = Math.max(0, state.outroomIntro - dt);
    checkWinner(dt);
    updateHud();
  }

  function castRay(px, pz, angle, maxDist = 100) {
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let mapX = Math.floor(px);
    let mapZ = Math.floor(pz);
    const deltaX = Math.abs(1 / (Math.abs(dx) < 1e-8 ? 1e-8 : dx));
    const deltaZ = Math.abs(1 / (Math.abs(dz) < 1e-8 ? 1e-8 : dz));
    const stepX = dx < 0 ? -1 : 1;
    const stepZ = dz < 0 ? -1 : 1;
    let sideX = dx < 0 ? (px - mapX) * deltaX : (mapX + 1 - px) * deltaX;
    let sideZ = dz < 0 ? (pz - mapZ) * deltaZ : (mapZ + 1 - pz) * deltaZ;
    let side = 0;
    let windowHit = null;
    for (let n = 0; n < 160; n += 1) {
      let distance;
      if (sideX < sideZ) {
        mapX += stepX;
        distance = sideX;
        sideX += deltaX;
        side = 0;
      } else {
        mapZ += stepZ;
        distance = sideZ;
        sideZ += deltaZ;
        side = 1;
      }
      if (distance > maxDist) break;
      const cell = getCell(mapX, mapZ);
      if (cell === 2 && !windowHit) {
        windowHit = { distance, side, mapX, mapZ };
      } else if (cell === 1) {
        return { distance, side, mapX, mapZ, windowHit };
      }
    }
    return { distance: maxDist, side: 0, mapX, mapZ, windowHit };
  }

  const WALL_COLORS = ["#7f6f67", "#ef745f", "#e2b74c", "#55a7b7", "#8d73c8", "#75818d"];
  function renderWorld() {
    const p = state.player || { x: 17.5, z: 18, angle: 0, y: 0 };
    const fov = state.scoped && state.weapon === 1 && state.upgrades.longgun ? 0.46 : 1.18;
    const horizon = Math.max(55, Math.min(215, H / 2 - state.pitch * 92 + p.y * 25 + state.recoil * 50));
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#67c7ff");
    sky.addColorStop(1, "#dff5ff");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, horizon);
    const ground = g.createLinearGradient(0, horizon, 0, H);
    ground.addColorStop(0, "#6d856a");
    ground.addColorStop(1, "#344f3b");
    g.fillStyle = ground;
    g.fillRect(0, horizon, W, H - horizon);

    const proj = (W / 2) / Math.tan(fov / 2);
    drawFloor(p, fov, horizon, proj);
    const zBuffer = new Float32Array(W);
    for (let sx = 0; sx < W; sx += 2) {
      const rayAngle = p.angle + Math.atan(((sx - W / 2) / proj));
      const hit = castRay(p.x, p.z, rayAngle);
      const corrected = Math.max(0.05, hit.distance * Math.cos(rayAngle - p.angle));
      zBuffer[sx] = zBuffer[sx + 1] = corrected;
      const wallH = Math.min(H * 3, proj / corrected);
      const top = horizon - wallH * (1 - CAMERA_HEIGHT);
      const theme = wallTheme[cellIndex(hit.mapX, hit.mapZ)] || 0;
      let color = WALL_COLORS[theme];
      if (hit.side) color = shade(color, 0.78);
      const fog = Math.min(0.72, corrected / 75);
      g.fillStyle = mixColor(color, "#bdd0d3", fog);
      g.fillRect(sx, top, 2, wallH + 1);
      if (hit.windowHit) {
        const wh = Math.min(H * 3, proj / Math.max(0.05, hit.windowHit.distance * Math.cos(rayAngle - p.angle)));
        const wt = horizon - wh * (1 - CAMERA_HEIGHT);
        g.fillStyle = "rgba(31,62,76,.82)";
        g.fillRect(sx, wt, 2, wh * 0.2);
        g.fillRect(sx, wt + wh * 0.78, 2, wh * 0.22);
        g.fillStyle = "rgba(94,212,255,.19)";
        g.fillRect(sx, wt + wh * 0.2, 2, wh * 0.58);
      }
    }

    drawDecalsAndTracers(p, fov, horizon, proj, zBuffer);
    drawActors(p, fov, horizon, proj, zBuffer);
    drawMinimap(p);
    drawWeapon();
    drawCrosshair();
  }

  function drawFloor(p, fov, horizon, proj) {
    const startY = Math.max(0, Math.ceil(horizon));
    for (let sy = startY; sy < H; sy += 3) {
      const depth = CAMERA_HEIGHT * proj / Math.max(1, sy - horizon);
      for (let sx = 0; sx < W; sx += 4) {
        const rel = Math.atan((sx - W / 2) / proj);
        const rayDistance = depth / Math.max(0.2, Math.cos(rel));
        const angle = p.angle + rel;
        const worldX = p.x + Math.cos(angle) * rayDistance;
        const worldZ = p.z + Math.sin(angle) * rayDistance;
        const fog = Math.min(0.62, depth / 70);
        g.fillStyle = mixColor(floorColor(worldX, worldZ), "#9db7aa", fog);
        g.fillRect(sx, sy, 4, 3);
      }
    }
  }

  function shade(hex, amount) {
    return mixColor(hex, "#000000", 1 - amount);
  }

  function mixColor(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ar = pa >> 16;
    const ag = (pa >> 8) & 255;
    const ab = pa & 255;
    const br = pb >> 16;
    const bg = (pb >> 8) & 255;
    const bb = pb & 255;
    const r = Math.round(ar + (br - ar) * t);
    const gg = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${gg},${bl})`;
  }

  function projectPoint(p, x, z, fov, horizon, proj) {
    const dx = x - p.x;
    const dz = z - p.z;
    const dist = Math.hypot(dx, dz);
    const rel = normalizeAngle(Math.atan2(dz, dx) - p.angle);
    if (Math.abs(rel) > fov * 0.68) return null;
    const depth = dist * Math.cos(rel);
    return { x: W / 2 + Math.tan(rel) * proj, y: horizon, dist, depth };
  }

  function drawDecalsAndTracers(p, fov, horizon, proj, zBuffer) {
    const visible = state.decals.map((d) => ({ d, q: projectPoint(p, d.x, d.z, fov, horizon, proj) }))
      .filter((o) => o.q && o.q.depth > 0.15)
      .sort((a, b) => b.q.depth - a.q.depth);
    for (const { d, q } of visible) {
      const column = Math.max(0, Math.min(W - 1, Math.floor(q.x)));
      if (zBuffer[column] + 0.4 < q.depth) continue;
      const size = Math.max(2, Math.min(22, proj * d.size / q.depth));
      g.fillStyle = d.color;
      g.globalAlpha = 0.88;
      g.beginPath();
      g.ellipse(q.x, d.floor ? horizon + proj * CAMERA_HEIGHT / q.depth : horizon, size, d.floor ? size * 0.32 : size, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    for (const t of state.tracers) {
      const a = projectPoint(p, t.x1, t.z1, fov, horizon, proj);
      const b = projectPoint(p, t.x2, t.z2, fov, horizon, proj);
      if (!a || !b) continue;
      g.strokeStyle = t.color;
      g.globalAlpha = Math.min(1, t.life * 12);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(a.x, horizon);
      g.lineTo(b.x, horizon);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  function drawActors(p, fov, horizon, proj, zBuffer) {
    const actors = state.players.filter((actor) => actor !== p)
      .map((actor) => ({ actor, q: projectPoint(p, actor.x, actor.z, fov, horizon, proj) }))
      .filter((o) => o.q && o.q.depth > 0.15)
      .sort((a, b) => b.q.depth - a.q.depth);
    for (const { actor, q } of actors) {
      const column = Math.max(0, Math.min(W - 1, Math.floor(q.x)));
      if (zBuffer[column] < q.depth - 0.25) continue;
      const height = Math.min(H * 1.4, proj * 1.05 / q.depth);
      const width = height * 0.43;
      const bottom = horizon + proj * CAMERA_HEIGHT / q.depth;
      const top = bottom - height;
      g.fillStyle = "rgba(0,0,0,.22)";
      g.beginPath();
      g.ellipse(q.x, bottom, width * 0.55, width * 0.18, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = actor.color;
      g.fillRect(q.x - width * 0.34, top + height * 0.35, width * 0.68, height * 0.48);
      g.fillStyle = "#f2c9a4";
      g.beginPath();
      g.arc(q.x, top + height * 0.22, width * 0.32, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#28333a";
      g.fillRect(q.x - width * 0.3, top + height * 0.79, width * 0.22, height * 0.2);
      g.fillRect(q.x + width * 0.08, top + height * 0.79, width * 0.22, height * 0.2);
      for (let i = 0; i < actor.paint.length; i += 1) {
        const spot = actor.paint[i];
        g.fillStyle = spot.color;
        g.beginPath();
        g.arc(q.x + ((i % 3) - 1) * width * 0.17, top + height * (0.42 + (i % 4) * 0.1), Math.max(1, width * 0.08), 0, Math.PI * 2);
        g.fill();
      }
      if (actor.alive) {
        g.fillStyle = "rgba(0,0,0,.65)";
        g.fillRect(q.x - width / 2, top - 6, width, 3);
        g.fillStyle = actor.health > 35 ? "#55ef7b" : "#ff5e66";
        g.fillRect(q.x - width / 2, top - 6, width * actor.health / 100, 3);
      }
    }
  }

  function drawMinimap(p) {
    if (state.scoped) return;
    const size = 62;
    const left = 8;
    const top = 8;
    g.fillStyle = "rgba(8,18,25,.68)";
    g.fillRect(left, top, size, size);
    const scale = size / 65;
    g.fillStyle = "rgba(215,226,219,.42)";
    for (let z = 0; z <= 64; z += 2) {
      for (let x = 0; x <= 64; x += 2) {
        if (getCell(x, z)) g.fillRect(left + x * scale, top + z * scale, 2 * scale + 0.5, 2 * scale + 0.5);
      }
    }
    for (const actor of state.players) {
      if (!actor.alive || actor === p) continue;
      g.fillStyle = actor.team === p.team && state.mode !== "solo" ? "#7aff9c" : "#ff657e";
      g.beginPath();
      g.arc(left + actor.x * scale, top + actor.z * scale, 1.3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(left + p.x * scale, top + p.z * scale, 2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#fff";
    g.beginPath();
    g.moveTo(left + p.x * scale, top + p.z * scale);
    g.lineTo(left + (p.x + Math.cos(p.angle) * 4) * scale, top + (p.z + Math.sin(p.angle) * 4) * scale);
    g.stroke();
  }

  function drawWeapon() {
    const color = state.player ? state.player.color : "#20a4ff";
    const bob = state.muzzleFlash > 0 ? -4 : Math.sin(state.time * 7) * 1.5;
    if (state.weapon === 0) {
      g.fillStyle = "#e5edf1";
      g.fillRect(W / 2 + 28, H - 64 + bob, 42, 22);
      g.fillStyle = color;
      g.fillRect(W / 2 + 36, H - 59 + bob, 38, 10);
      g.fillStyle = "#26343d";
      g.fillRect(W / 2 + 43, H - 43 + bob, 15, 38);
      g.fillStyle = "#efc39e";
      g.fillRect(W / 2 + 31, H - 28, 29, 28);
    } else {
      g.fillStyle = "#dbe6ea";
      g.fillRect(W / 2 - 12, H - 67 + bob, 105, 24);
      g.fillStyle = color;
      g.fillRect(W / 2 + 4, H - 61 + bob, 82, 11);
      g.fillStyle = "#1f2c34";
      g.fillRect(W / 2 + 18, H - 45 + bob, 14, 32);
      g.fillStyle = "#efc39e";
      g.fillRect(W / 2 - 13, H - 31, 34, 31);
      g.fillRect(W / 2 + 45, H - 25, 31, 25);
      if (state.upgrades.longgun) {
        g.fillStyle = "#172128";
        g.fillRect(W / 2 + 30, H - 76 + bob, 34, 10);
        g.fillStyle = "#70ddff";
        g.fillRect(W / 2 + 39, H - 74 + bob, 13, 5);
      }
    }
    if (state.muzzleFlash > 0) {
      g.fillStyle = "#fff5a6";
      g.beginPath();
      g.arc(W / 2 + (state.weapon ? 95 : 75), H - 56 + bob, 9, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawCrosshair() {
    if (state.scoped && state.weapon === 1 && state.upgrades.longgun) {
      g.strokeStyle = "rgba(0,0,0,.94)";
      g.lineWidth = 55;
      g.beginPath();
      g.arc(W / 2, H / 2, 160, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = "#64e8ff";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(W / 2, H / 2, 76, 0, Math.PI * 2);
      g.moveTo(W / 2 - 100, H / 2);
      g.lineTo(W / 2 + 100, H / 2);
      g.moveTo(W / 2, H / 2 - 80);
      g.lineTo(W / 2, H / 2 + 80);
      g.stroke();
    } else {
      g.strokeStyle = state.hitmarker > 0 ? "#fff36b" : "#ffffff";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(W / 2 - 8, H / 2);
      g.lineTo(W / 2 - 3, H / 2);
      g.moveTo(W / 2 + 3, H / 2);
      g.lineTo(W / 2 + 8, H / 2);
      g.moveTo(W / 2, H / 2 - 8);
      g.lineTo(W / 2, H / 2 - 3);
      g.moveTo(W / 2, H / 2 + 3);
      g.lineTo(W / 2, H / 2 + 8);
      g.stroke();
    }
    if (state.hitmarker > 0) {
      g.strokeStyle = "#fff";
      g.beginPath();
      g.moveTo(W / 2 - 9, H / 2 - 9);
      g.lineTo(W / 2 - 4, H / 2 - 4);
      g.moveTo(W / 2 + 9, H / 2 - 9);
      g.lineTo(W / 2 + 4, H / 2 - 4);
      g.moveTo(W / 2 - 9, H / 2 + 9);
      g.lineTo(W / 2 - 4, H / 2 + 4);
      g.moveTo(W / 2 + 9, H / 2 + 9);
      g.lineTo(W / 2 + 4, H / 2 + 4);
      g.stroke();
    }
  }

  function renderMenuBackdrop() {
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#109bdd");
    grad.addColorStop(0.5, "#7b4fe0");
    grad.addColorStop(1, "#ff4d79");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 32; i += 1) {
      const x = (i * 83 + 31) % W;
      const y = (i * 47 + 19) % H;
      g.fillStyle = SOLO_COLORS[i % SOLO_COLORS.length];
      g.globalAlpha = 0.32;
      g.beginPath();
      g.arc(x, y, 8 + (i % 5) * 4, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.font = "900 42px system-ui,sans-serif";
    g.fillText("PAINT WAR", W / 2, 91);
    g.font = "600 15px system-ui,sans-serif";
    g.fillText("Färg. Fart. Sista laget vinner.", W / 2, 119);
  }

  function render() {
    if (state.phase === "playing" || state.phase === "end") renderWorld();
    else renderMenuBackdrop();
    if (state.player && state.player.outroom && state.phase === "playing") {
      g.fillStyle = "rgba(8,16,23,.72)";
      g.fillRect(W / 2 - 82, 12, 164, 30);
      g.fillStyle = "#fff";
      g.textAlign = "center";
      g.font = "800 16px system-ui,sans-serif";
      g.fillText("OUTROOM", W / 2, 33);
    }
    if (state.messageTime > 0 && state.message && !document.getElementById("status-banner")) {
      g.fillStyle = "rgba(5,15,22,.72)";
      g.fillRect(W / 2 - 125, H - 112, 250, 29);
      g.fillStyle = "#fff";
      g.textAlign = "center";
      g.font = "700 13px system-ui,sans-serif";
      g.fillText(state.message, W / 2, H - 92);
    }
    if (state.hurtFlash > 0) {
      g.fillStyle = `rgba(255,32,70,${state.hurtFlash * 0.8})`;
      g.fillRect(0, 0, W, H);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(view, 0, 0, canvas.width, canvas.height);
  }

  function setText(ids, value) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }
  }

  function updateHud() {
    const p = state.player;
    const hp = p ? Math.ceil(p.health) : 100;
    setText(["hp", "health", "health-value"], `${hp}`);
    setText(["fargmynt", "färgmynt", "coins"], `${state.coins}`);
    setText(["team", "team-label"], p ? (state.mode === "solo" ? "SOLO" : `LAG ${p.team + 1}`) : "–");
    setText(["mode", "mode-label"], state.mode ? state.mode.toUpperCase() : "–");
    const alive = state.players.filter((x) => x.alive).length;
    setText(["alive", "players-left", "alive-count", "spectating-count"], `${alive}`);
    const healthFill = document.getElementById("health-fill");
    if (healthFill) healthFill.style.width = `${Math.max(0, hp)}%`;
    if (p) {
      const stats = weaponStats(p);
      setText(["weapon", "weapon-name", "weapon-label"], `${stats.name}${stats.upgraded ? " ★" : ""}`.toUpperCase());
      const symbol = document.getElementById("weapon-symbol");
      if (symbol) symbol.textContent = state.weapon === 0 ? "▰" : "▰━";
      const teamBadge = document.getElementById("team-badge");
      if (teamBadge) teamBadge.hidden = state.phase !== "playing" || state.mode === "solo";
      const teamDot = teamBadge && teamBadge.querySelector(".team-dot");
      if (teamDot) {
        teamDot.style.background = p.color;
        teamDot.style.boxShadow = `0 0 8px ${p.color}`;
      }
    }
    const status = document.getElementById("status-banner");
    if (status) {
      status.hidden = !(state.phase === "playing" && state.messageTime > 0 && state.message);
      status.textContent = state.messageTime > 0 ? state.message : "";
    }
    const gameStatus = document.getElementById("game-status");
    if (gameStatus) gameStatus.textContent = state.messageTime > 0 ? state.message : "";
    const scope = document.getElementById("scope-overlay");
    if (scope) scope.hidden = !(state.phase === "playing" && state.scoped && state.weapon === 1 && state.upgrades.longgun);
    const scopeButton = document.getElementById("scope-btn");
    if (scopeButton) scopeButton.hidden = !(state.weapon === 1 && state.upgrades.longgun);
    const hit = document.getElementById("hit-marker");
    if (hit) hit.classList.toggle("show", state.hitmarker > 0);
    const damage = document.getElementById("damage-flash");
    if (damage) damage.classList.toggle("show", state.hurtFlash > 0);
    const outroom = document.getElementById("outroom-overlay");
    if (outroom) outroom.hidden = !(state.phase === "playing" && p && p.outroom && state.outroomIntro > 0);
    const eliminatedList = document.getElementById("eliminated-list");
    if (eliminatedList) {
      eliminatedList.textContent = "";
      for (const actor of state.players.filter((item) => item.outroom)) {
        const chip = document.createElement("span");
        chip.className = "eliminated-player";
        chip.textContent = actor.name;
        chip.style.setProperty("--player-color", actor.color);
        eliminatedList.appendChild(chip);
      }
    }
  }

  function updateShop() {
    setText(["shop-coins", "fargmynt", "färgmynt", "coins"], `${state.coins}`);
    document.querySelectorAll("[data-upgrade]").forEach((card) => {
      const key = card.dataset.upgrade;
      if (!(key in UPGRADE_COST)) return;
      const bought = state.upgrades[key];
      card.classList.toggle("bought", bought);
      card.classList.toggle("owned", bought);
      const button = card.querySelector("[data-buy]");
      if (!button) return;
      button.disabled = bought || state.coins < UPGRADE_COST[key];
      button.classList.toggle("bought", bought);
      button.classList.toggle("owned", bought);
      const label = document.getElementById(`${key}-price`) || button.querySelector("small");
      if (label) label.textContent = bought ? "KÖPT" : `✦ ${UPGRADE_COST[key]}`;
      const mainLabel = button.querySelector("span");
      if (mainLabel) mainLabel.textContent = bought ? "UPPGRADERAD" : "KÖP UPPGRADERING";
    });
  }

  function bindClick(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }

  bindClick("solo-btn", () => startMatch("solo"));
  bindClick("duo-btn", () => startMatch("duo"));
  bindClick("team-btn", () => startMatch("team"));
  bindClick("shop-btn", openShop);
  bindClick("shop-close", returnToMenu);
  bindClick("close-shop-btn", returnToMenu);
  bindClick("home-btn", returnToMenu);
  bindClick("play-again-btn", () => startMatch(state.mode || "solo"));
  bindClick("back-to-menu-btn", returnToMenu);
  bindClick("restart-btn", () => startMatch(state.mode || "solo"));
  bindClick("menu-btn", returnToMenu);
  bindClick("fullscreen-btn", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.getElementById("game-shell")?.requestFullscreen?.();
  });
  document.querySelectorAll("[data-buy]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      buyUpgrade(button.dataset.buy);
    });
  });

  function handleAction(action, active) {
    if (["forward", "backward", "left", "right", "sprint", "shoot"].includes(action)) {
      touchActions[action] = active;
      return;
    }
    if (action === "jump") {
      state.jumping = active;
      return;
    }
    if (!active) return;
    if (action === "switch") {
      state.weapon = 1 - state.weapon;
      state.scoped = false;
      updateHud();
    }
    if (action === "weapon-1") state.weapon = 0;
    if (action === "weapon-2") state.weapon = 1;
    if (action === "scope" && state.weapon === 1 && state.upgrades.longgun) state.scoped = !state.scoped;
    if (action === "menu" || action === "back-menu") returnToMenu();
    if (action === "restart") startMatch(state.mode || "solo");
    if (action === "solo" || action === "duo" || action === "team") startMatch(action);
    if (action === "shop") openShop();
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.setPointerCapture?.(event.pointerId);
      button.classList.add("active");
      handleAction(action, true);
    });
    const release = (event) => {
      event.preventDefault();
      button.classList.remove("active");
      handleAction(action, false);
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });

  window.addEventListener("keydown", (event) => {
    keys[event.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    if (event.code === "Digit1") {
      state.weapon = 0;
      state.scoped = false;
      updateHud();
    }
    if (event.code === "Digit2") {
      state.weapon = 1;
      state.scoped = false;
      updateHud();
    }
    if (event.code === "KeyQ" && state.weapon === 1 && state.upgrades.longgun) state.scoped = !state.scoped;
    if (event.code === "KeyF") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.getElementById("game-shell")?.requestFullscreen?.();
    }
    if (event.code === "Escape") state.scoped = false;
  });
  window.addEventListener("keyup", (event) => {
    keys[event.code] = false;
    if (event.code === "Space") state.jumping = false;
  });
  window.addEventListener("blur", resetControls);

  canvas.addEventListener("click", () => {
    if (
      state.phase === "playing"
      && matchMedia("(pointer:fine)").matches
      && !navigator.webdriver
      && document.hasFocus()
    ) {
      try {
        const result = canvas.requestPointerLock?.();
        result?.catch?.(() => {});
      } catch {
        // Pointer lock kan nekas i inbäddade webbläsare; spelet fortsätter ändå.
      }
    }
  });
  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) state.firing = true;
    if (event.button === 2 && state.weapon === 1 && state.upgrades.longgun) state.scoped = true;
  });
  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) state.firing = false;
    if (event.button === 2) state.scoped = false;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== canvas || state.phase !== "playing" || !state.player) return;
    state.player.angle = normalizeAngle(state.player.angle + event.movementX * 0.0025);
    state.pitch = Math.max(-0.65, Math.min(0.65, state.pitch + event.movementY * 0.002));
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || state.phase !== "playing") return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    if (event.clientX < window.innerWidth * 0.43 && !pointerState.move) {
      pointerState.move = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
      };
    } else if (!pointerState.look) {
      pointerState.look = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  }, { passive: false });
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch") return;
    if (pointerState.move && pointerState.move.id === event.pointerId) {
      pointerState.move.x = event.clientX;
      pointerState.move.y = event.clientY;
    } else if (pointerState.look && pointerState.look.id === event.pointerId && state.player) {
      const dx = event.clientX - pointerState.look.x;
      const dy = event.clientY - pointerState.look.y;
      state.player.angle = normalizeAngle(state.player.angle + dx * 0.006);
      state.pitch = Math.max(-0.65, Math.min(0.65, state.pitch + dy * 0.004));
      pointerState.look.x = event.clientX;
      pointerState.look.y = event.clientY;
    }
  }, { passive: false });
  function releasePointer(event) {
    if (pointerState.move && pointerState.move.id === event.pointerId) pointerState.move = null;
    if (pointerState.look && pointerState.look.id === event.pointerId) pointerState.look = null;
  }
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("lostpointercapture", releasePointer);

  const joystick = document.getElementById("move-joystick");
  const joystickKnob = document.getElementById("move-knob");
  if (joystick) {
    joystick.addEventListener("pointerdown", (event) => {
      if (state.phase !== "playing") return;
      event.preventDefault();
      event.stopPropagation();
      joystick.setPointerCapture?.(event.pointerId);
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      pointerState.move = {
        id: event.pointerId,
        startX: cx,
        startY: cy,
        x: event.clientX,
        y: event.clientY,
        radius: Math.max(18, rect.width * 0.28),
      };
    }, { passive: false });
    joystick.addEventListener("pointermove", (event) => {
      if (!pointerState.move || pointerState.move.id !== event.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - pointerState.move.startX;
      const dy = event.clientY - pointerState.move.startY;
      const length = Math.hypot(dx, dy);
      const max = pointerState.move.radius || joystick.getBoundingClientRect().width * 0.28;
      const scale = length > max ? max / length : 1;
      pointerState.move.x = pointerState.move.startX + dx * scale;
      pointerState.move.y = pointerState.move.startY + dy * scale;
      if (joystickKnob) {
        joystickKnob.style.transform = `translate(calc(-50% + ${dx * scale}px), calc(-50% + ${dy * scale}px))`;
      }
    }, { passive: false });
    const releaseJoystick = (event) => {
      if (!pointerState.move || pointerState.move.id !== event.pointerId) return;
      pointerState.move = null;
      if (joystickKnob) joystickKnob.style.transform = "translate(-50%, -50%)";
    };
    joystick.addEventListener("pointerup", releaseJoystick);
    joystick.addEventListener("pointercancel", releaseJoystick);
    joystick.addEventListener("lostpointercapture", releaseJoystick);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width > 100 ? rect.width : window.innerWidth;
    const cssHeight = rect.height > 100 ? rect.height : window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(320, Math.round(cssWidth * dpr));
    canvas.height = Math.max(180, Math.round(cssHeight * dpr));
    render();
  }
  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", resize);

  window.render_game_to_text = () => {
    const p = state.player;
    const visible = p ? state.players.filter((actor) => actor !== p && Math.hypot(actor.x - p.x, actor.z - p.z) < 28) : [];
    const stats = p ? weaponStats(p) : WEAPONS[state.weapon];
    return JSON.stringify({
      coordinateSystem: "origin northwest; x increases east/right, z increases south/down; angles are radians, 0=east",
      phase: state.phase,
      mode: state.mode,
      timeSeconds: Number(state.time.toFixed(2)),
      player: p ? {
        x: Number(p.x.toFixed(2)),
        z: Number(p.z.toFixed(2)),
        angle: Number(p.angle.toFixed(3)),
        pitch: Number(state.pitch.toFixed(3)),
        hp: p.health,
        alive: p.alive,
        location: p.outroom ? "outroom" : "arena",
        team: p.team,
        weapon: stats.key,
        weaponName: stats.name,
        damage: stats.damage,
        fireIntervalMs: stats.interval,
        range: stats.range,
        scoped: state.scoped,
      } : null,
      match: {
        activeCount: state.players.filter((actor) => actor.alive).length,
        outroomCount: state.players.filter((actor) => actor.outroom).length,
        winner: state.winner,
        paintDecals: state.decals.length,
      },
      upgrades: { ...state.upgrades },
      coins: state.coins,
      nearbyParticipants: visible.map((actor) => ({
        id: actor.id,
        name: actor.name,
        x: Number(actor.x.toFixed(2)),
        z: Number(actor.z.toFixed(2)),
        hp: actor.health,
        alive: actor.alive,
        team: actor.team,
        location: actor.outroom ? "outroom" : "arena",
        distance: Number(Math.hypot(actor.x - p.x, actor.z - p.z).toFixed(2)),
      })),
      arena: {
        size: "64x64 world units plus sealed Outroom",
        houses: 9,
        windowsAreShootThrough: true,
        paintPersistsUntilMatchEnd: true,
      },
    });
  };

  window.advanceTime = (ms) => {
    state.testClock = true;
    let remaining = Math.max(0, Number(ms) || 0);
    while (remaining > 0) {
      const chunk = Math.min(1000 / 60, remaining);
      step(chunk / 1000);
      remaining -= chunk;
    }
    render();
    return window.render_game_to_text();
  };

  window.PaintWar = {
    startMatch,
    returnToMenu,
    openShop,
    buyUpgrade,
    getState: () => state,
  };

  let previous = performance.now();
  function frame(now) {
    const dt = (now - previous) / 1000;
    previous = now;
    if (!state.testClock) step(dt);
    render();
    requestAnimationFrame(frame);
  }

  setScreen("menu");
  updateHud();
  updateShop();
  resize();
  requestAnimationFrame(frame);
})();
