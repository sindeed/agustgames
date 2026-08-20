(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const ui = {
    menu: $("#menu-screen"),
    maps: $("#map-screen"),
    pause: $("#pause-screen"),
    round: $("#round-screen"),
    roundTitle: $("#round-title"),
    roundMessage: $("#round-message"),
    pauseButton: $("#pause-btn"),
    soundButton: $("#sound-btn"),
    fullscreenButton: $("#fullscreen-btn"),
    touch: $("#touch-controls"),
    joystick: $("#move-stick"),
    joystickBase: $("#move-stick-base"),
    toast: $("#status-toast"),
    mapMessage: $("#map-message"),
    mapTip: $("#map-tip"),
  };

  const TAU = Math.PI * 2;
  const FIXED_STEP = 1 / 60;
  const PLAYER_COUNT = 10;
  const PLAYER_COLORS = [
    "#ff405d", "#30b8ff", "#ffd232", "#7c5cff", "#36d67f",
    "#ff843d", "#f15ee6", "#55ded5", "#9fd33d", "#ff6d9f",
  ];
  const PLAYER_NAMES = ["AGUST", "BLIxten", "KULAN", "BOBB", "LIME", "PIRATEN", "ROSA", "PLASK", "GURKAN", "POP" ];
  const MODE_NAMES = { peace: "FRED", free: "FRI" };
  const MAP_NAMES = {
    city: "STORSTADEN",
    grass: "GRÄSSLÄTTEN",
    hill: "BACKEN",
    platform: "PLATTAN",
    castle: "BORGEN",
  };
  const WEAPON_NAMES = { cannon: "PIRATKANON", sword: "SVÄRD", shield: "SKÖLD", bow: "PILBÅGE" };

  const state = {
    screen: "menu",
    mode: null,
    map: null,
    selectedMode: null,
    time: 0,
    roundTime: 0,
    frame: 0,
    paused: false,
    roundOver: false,
    winner: null,
    players: [],
    cars: [],
    projectiles: [],
    pickups: [],
    particles: [],
    notices: [],
    bridgeOpen: false,
    camera: { x: 0, z: 0, shake: 0 },
    view: { w: 1280, h: 720, dpr: 1 },
    sound: true,
    deterministicSeed: 89173,
  };

  const keys = Object.create(null);
  const touchStick = { x: 0, y: 0, pointerId: null };
  let rafId = 0;
  let lastFrameTime = performance.now();
  let accumulator = 0;
  let audio = null;
  let musicTimer = null;
  let toastTimer = null;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function distSq(a, b) { const x = a.x - b.x; const z = a.z - b.z; return x * x + z * z; }
  function len(x, z) { return Math.hypot(x, z); }
  function norm(x, z) {
    const length = Math.hypot(x, z) || 1;
    return { x: x / length, z: z / length };
  }
  function seeded() {
    state.deterministicSeed = (state.deterministicSeed * 1664525 + 1013904223) >>> 0;
    return state.deterministicSeed / 4294967296;
  }
  function randomRange(min, max) { return min + (max - min) * seeded(); }
  function choose(list) { return list[Math.floor(seeded() * list.length) % list.length]; }
  function rounded(value) { return Math.round(value * 100) / 100; }

  function setVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle("is-active", visible);
  }

  function showToast(message, duration = 1700) {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    setVisible(ui.toast, true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setVisible(ui.toast, false), duration);
  }

  function showMenu() {
    resetJoystick();
    state.screen = "menu";
    state.paused = false;
    state.roundOver = false;
    setVisible(ui.menu, true);
    setVisible(ui.maps, false);
    setVisible(ui.pause, false);
    setVisible(ui.round, false);
    setVisible(ui.pauseButton, false);
    setVisible(ui.touch, false);
    canvas.setAttribute("aria-hidden", "true");
    updateMusic();
  }

  function chooseMode(mode) {
    if (!Object.hasOwn(MODE_NAMES, mode)) return;
    state.selectedMode = mode;
    state.screen = "maps";
    setVisible(ui.menu, false);
    setVisible(ui.maps, true);
    $$(".map-group[data-for]").forEach((group) => setVisible(group, group.dataset.for === mode));
    if (ui.mapMessage) ui.mapMessage.textContent = mode === "peace" ? "Vart vill ni utforska?" : "Var börjar striden?";
    if (ui.mapTip) ui.mapTip.textContent = mode === "peace" ? "I Fred kan ingen skada någon." : "I Fri börjar alla med en piratkanon och oändligt med kulor.";
    sfx("select");
  }

  function mapAllowed(mode, map) {
    return mode === "peace" ? ["city", "grass"].includes(map) : mode === "free" && ["city", "hill", "platform", "castle"].includes(map);
  }

  function makePlayer(index, spawn) {
    const angle = randomRange(0, TAU);
    return {
      index,
      name: PLAYER_NAMES[index],
      human: index === 0,
      color: PLAYER_COLORS[index],
      x: spawn.x,
      z: spawn.z,
      y: spawn.y || 0,
      vx: 0,
      vz: 0,
      vy: 0,
      facingX: Math.cos(angle),
      facingZ: Math.sin(angle),
      radius: 0.5,
      alive: true,
      eliminated: false,
      knocked: false,
      knockoutTimer: 0,
      invulnerable: 0.65,
      swordHits: 0,
      inventory: state.mode === "free" ? ["cannon"] : [],
      weaponIndex: 0,
      attackCooldown: randomRange(0, 0.4),
      attackFlash: 0,
      blockedFlash: 0,
      score: 0,
      inCar: null,
      walk: randomRange(0, TAU),
      moveAmount: 0,
      climbTimer: 0,
      respawnX: spawn.x,
      respawnZ: spawn.z,
      ai: {
        target: null,
        think: randomRange(0.1, 0.7),
        goalX: spawn.x + randomRange(-6, 6),
        goalZ: spawn.z + randomRange(-6, 6),
        useTimer: randomRange(0.8, 2.2),
        strafe: seeded() > 0.5 ? 1 : -1,
      },
    };
  }

  function spawnPoints(map) {
    const result = [];
    if (map === "city") {
      const points = [
        { x: 0, z: 0 }, { x: -3, z: 0 }, { x: 3, z: 0 }, { x: -7, z: 3 }, { x: 7, z: -3 },
        { x: -1, z: 7 }, { x: 2, z: -7 }, { x: -11, z: -1 }, { x: 11, z: 1 }, { x: 0, z: 11 },
      ];
      return points;
    }
    if (map === "grass") {
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const a = (i / PLAYER_COUNT) * TAU;
        result.push({ x: Math.cos(a) * 4.5, z: Math.sin(a) * 4.5 });
      }
      return result;
    }
    if (map === "hill") {
      for (let i = 0; i < PLAYER_COUNT; i++) result.push({ x: -8 + (i % 5) * 4, z: -8 + Math.floor(i / 5) * 3 });
      return result;
    }
    if (map === "platform") {
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const a = (i / PLAYER_COUNT) * TAU;
        result.push({ x: Math.cos(a) * 5.4, z: Math.sin(a) * 3.4, y: 7 });
      }
      return result;
    }
    for (let i = 0; i < PLAYER_COUNT; i++) {
      result.push({ x: -4.2 + (i % 5) * 2.1, z: -1.9 + Math.floor(i / 5) * 2.3, y: 0 });
    }
    return result;
  }

  function makeCars() {
    if (state.map !== "city") return [];
    const specs = [
      [-2, -7, "#f6c62e"], [5, -1, "#42c7ee"], [-10, 2, "#ff526d"], [12, -2, "#6fdd77"],
      [0, 8, "#9a75ff"], [7, 10, "#ff8b35"], [-14, -7, "#f55bc1"], [15, 7, "#f2f4f8"],
    ];
    return specs.map((spec, index) => ({
      id: index,
      x: spec[0], z: spec[1], y: 0, vx: 0, vz: 0,
      angle: index % 2 ? Math.PI / 2 : 0,
      color: spec[2], radius: 1.05, driver: null, broken: false, smoke: 0,
    }));
  }

  function makePickups() {
    if (state.map !== "castle") return [];
    return [
      { id: 0, type: "sword", x: -3.4, z: -1.6, takenBy: null, bob: 0 },
      { id: 1, type: "shield", x: 3.4, z: -1.6, takenBy: null, bob: 1.8 },
      { id: 2, type: "bow", x: 0, z: 1.4, takenBy: null, bob: 3.6 },
    ];
  }

  function startGame(mode, map) {
    resetJoystick();
    const actualMode = Object.hasOwn(MODE_NAMES, mode) ? mode : "free";
    const actualMap = mapAllowed(actualMode, map) ? map : (actualMode === "peace" ? "city" : "platform");
    state.mode = actualMode;
    state.map = actualMap;
    state.selectedMode = actualMode;
    state.screen = "playing";
    state.time = 0;
    state.roundTime = 0;
    state.frame = 0;
    state.paused = false;
    state.roundOver = false;
    state.winner = null;
    state.bridgeOpen = false;
    state.projectiles = [];
    state.particles = [];
    state.notices = [];
    state.deterministicSeed = 89173 + Object.keys(MAP_NAMES).indexOf(actualMap) * 101;
    const spawns = spawnPoints(actualMap);
    state.players = spawns.map((spawn, index) => makePlayer(index, spawn));
    state.cars = makeCars();
    state.pickups = makePickups();
    state.camera.x = state.players[0].x;
    state.camera.z = state.players[0].z;
    state.camera.shake = 0;
    setVisible(ui.menu, false);
    setVisible(ui.maps, false);
    setVisible(ui.pause, false);
    setVisible(ui.round, false);
    setVisible(ui.pauseButton, true);
    setVisible(ui.touch, true);
    canvas.removeAttribute("aria-hidden");
    canvas.focus({ preventScroll: true });
    resizeCanvas();
    updateMusic();
    showToast(`${MODE_NAMES[actualMode]} · ${MAP_NAMES[actualMap]}`);
    render();
    return getDebugState();
  }

  function pauseGame() {
    if (state.screen !== "playing" || state.roundOver) return;
    state.paused = true;
    state.screen = "paused";
    resetJoystick();
    setVisible(ui.pause, true);
    setVisible(ui.touch, false);
    sfx("pause");
  }

  function resumeGame() {
    if (state.screen !== "paused") return;
    state.paused = false;
    state.screen = "playing";
    setVisible(ui.pause, false);
    setVisible(ui.touch, true);
    canvas.focus({ preventScroll: true });
    lastFrameTime = performance.now();
    sfx("select");
  }

  function returnToMaps() {
    resetJoystick();
    state.paused = false;
    state.roundOver = false;
    state.screen = "maps";
    setVisible(ui.pause, false);
    setVisible(ui.round, false);
    setVisible(ui.pauseButton, false);
    setVisible(ui.touch, false);
    chooseMode(state.selectedMode || state.mode || "free");
  }

  function restartGame() {
    if (!state.mode || !state.map) return;
    startGame(state.mode, state.map);
  }

  function currentWeapon(player) {
    if (!player.inventory.length) return null;
    player.weaponIndex = ((player.weaponIndex % player.inventory.length) + player.inventory.length) % player.inventory.length;
    return player.inventory[player.weaponIndex];
  }

  function cycleWeapon(player = state.players[0]) {
    if (!player || player.knocked || player.eliminated || player.inCar !== null || player.inventory.length < 2) return;
    player.weaponIndex = (player.weaponIndex + 1) % player.inventory.length;
    showToast(`${player.human ? "Du" : player.name} valde ${WEAPON_NAMES[currentWeapon(player)]}`);
    sfx("cycle");
  }

  function bindInput() {
    $$("[data-mode]").forEach((button) => button.addEventListener("click", () => { ensureAudio(); chooseMode(button.dataset.mode); }));
    $$("[data-map]").forEach((button) => button.addEventListener("click", () => {
      ensureAudio();
      const mode = button.dataset.for || state.selectedMode;
      startGame(mode, button.dataset.map);
    }));
    $("#map-back-btn")?.addEventListener("click", showMenu);
    ui.pauseButton?.addEventListener("click", pauseGame);
    $("#resume-btn")?.addEventListener("click", resumeGame);
    $("#restart-btn")?.addEventListener("click", restartGame);
    $("#play-again-btn")?.addEventListener("click", restartGame);
    $("#menu-btn")?.addEventListener("click", returnToMaps);
    $("#round-menu-btn")?.addEventListener("click", returnToMaps);
    $("#attack-btn")?.addEventListener("pointerdown", (event) => { event.preventDefault(); ensureAudio(); attack(state.players[0]); });
    $("#use-btn")?.addEventListener("pointerdown", (event) => { event.preventDefault(); useAction(state.players[0]); });
    $("#cycle-btn")?.addEventListener("pointerdown", (event) => { event.preventDefault(); cycleWeapon(); });
    ui.soundButton?.addEventListener("click", toggleSound);
    ui.fullscreenButton?.addEventListener("click", toggleFullscreen);

    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
      ensureAudio();
      if (!event.repeat) {
        if ((event.code === "Space" || event.code === "KeyJ") && state.screen === "playing") attack(state.players[0]);
        if (event.code === "KeyE" && state.screen === "playing") useAction(state.players[0]);
        if (event.code === "KeyQ" && state.screen === "playing") cycleWeapon();
        if (event.code === "Escape" && state.screen === "playing") pauseGame();
        else if (event.code === "Escape" && state.screen === "paused") resumeGame();
        if (event.code === "KeyF") toggleFullscreen();
      }
      keys[event.code] = true;
    }, { passive: false });
    window.addEventListener("keyup", (event) => { keys[event.code] = false; });
    window.addEventListener("blur", () => {
      Object.keys(keys).forEach((key) => { keys[key] = false; });
      resetJoystick();
    });

    bindJoystick();
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", () => { if (document.hidden) resetJoystick(); });
    document.addEventListener("fullscreenchange", resizeCanvas);
  }

  function bindJoystick() {
    const base = ui.joystickBase;
    if (!base) return;
    const move = (event) => {
      if (event.pointerId !== touchStick.pointerId) return;
      event.preventDefault();
      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maxDistance = rect.width * 0.29;
      let dx = event.clientX - centerX;
      let dy = event.clientY - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance > maxDistance) {
        dx = dx / distance * maxDistance;
        dy = dy / distance * maxDistance;
      }
      const rawX = dx / maxDistance;
      const rawY = dy / maxDistance;
      const strength = Math.hypot(rawX, rawY);
      const deadZone = 0.12;
      const scaled = strength <= deadZone ? 0 : Math.min(1, (strength - deadZone) / (1 - deadZone));
      touchStick.x = strength ? rawX / strength * scaled : 0;
      touchStick.y = strength ? rawY / strength * scaled : 0;
      base.style.setProperty("--stick-x", `${dx.toFixed(1)}px`);
      base.style.setProperty("--stick-y", `${dy.toFixed(1)}px`);
    };
    base.addEventListener("pointerdown", (event) => {
      if (state.screen !== "playing") return;
      event.preventDefault();
      if (touchStick.pointerId !== null) return;
      ensureAudio();
      touchStick.pointerId = event.pointerId;
      ui.joystick?.classList.add("is-active");
      base.setPointerCapture?.(event.pointerId);
      move(event);
    });
    base.addEventListener("pointermove", move);
    const release = (event) => {
      if (event.pointerId !== touchStick.pointerId) return;
      event.preventDefault();
      resetJoystick();
    };
    base.addEventListener("pointerup", release);
    base.addEventListener("pointercancel", release);
    base.addEventListener("lostpointercapture", release);
  }

  function resetJoystick() {
    touchStick.x = 0;
    touchStick.y = 0;
    touchStick.pointerId = null;
    ui.joystick?.classList.remove("is-active");
    ui.joystickBase?.style.setProperty("--stick-x", "0px");
    ui.joystickBase?.style.setProperty("--stick-y", "0px");
  }

  function mapBounds() {
    if (state.map === "city") return { minX: -22, maxX: 22, minZ: -17, maxZ: 17 };
    if (state.map === "grass") return { minX: -22, maxX: 22, minZ: -16, maxZ: 16 };
    if (state.map === "hill") return { minX: -18, maxX: 18, minZ: -12, maxZ: 13 };
    if (state.map === "platform") return { minX: -9.5, maxX: 9.5, minZ: -6.5, maxZ: 6.5 };
    return { minX: -18, maxX: 18, minZ: -14, maxZ: 14 };
  }

  const CITY_BUILDINGS = [
    { x: -19, z: -15, w: 6, d: 6, h: 5, color: "#ff6f62" },
    { x: -10, z: -15, w: 5, d: 6, h: 8, color: "#46a6cc" },
    { x: 4, z: -15, w: 6, d: 6, h: 6, color: "#f2b84b" },
    { x: 13, z: -15, w: 6, d: 6, h: 9, color: "#886fd6" },
    { x: -19, z: -5, w: 7, d: 5, h: 7, color: "#5cc785" },
    { x: 10, z: -5, w: 9, d: 5, h: 5, color: "#e879a4" },
    { x: -19, z: 5, w: 7, d: 5, h: 5, color: "#eb8b4d" },
    { x: 11, z: 5, w: 8, d: 5, h: 8, color: "#42b8be" },
    { x: -19, z: 13, w: 6, d: 4, h: 8, color: "#efcc4e" },
    { x: -10, z: 13, w: 5, d: 4, h: 5, color: "#6f8ee6" },
    { x: 4, z: 13, w: 6, d: 4, h: 7, color: "#ed6b78" },
    { x: 13, z: 13, w: 6, d: 4, h: 6, color: "#74bd63" },
  ];

  function castleWalls() {
    const walls = [
      { x: -6.4, z: -4.7, w: 10.4, d: 0.75, h: 3.3 },
      { x: 5.55, z: -4.7, w: 0.85, d: 0.75, h: 3.3 },
      { x: -6.4, z: 4.05, w: 5.15, d: 0.75, h: 3.3 },
      { x: 1.25, z: 4.05, w: 5.15, d: 0.75, h: 3.3 },
      { x: -6.4, z: -4.7, w: 0.75, d: 9.5, h: 3.3 },
      { x: 5.65, z: -4.7, w: 0.75, d: 9.5, h: 3.3 },
    ];
    if (!state.bridgeOpen) walls.push({ x: -1.25, z: 3.95, w: 2.5, d: 0.95, h: 3.7, gate: true });
    return walls;
  }

  function obstacleRects() {
    if (state.map === "city") return CITY_BUILDINGS;
    if (state.map === "castle") return castleWalls();
    return [];
  }

  function circleHitsRect(x, z, radius, rect) {
    const nearX = clamp(x, rect.x, rect.x + rect.w);
    const nearZ = clamp(z, rect.z, rect.z + rect.d);
    const dx = x - nearX;
    const dz = z - nearZ;
    return dx * dx + dz * dz < radius * radius;
  }

  function pointHitsObstacle(x, z, padding = 0) {
    return obstacleRects().some((rect) => circleHitsRect(x, z, padding, rect));
  }

  function groundHeight(x, z) {
    if (state.map === "hill") return clamp((11 - z) * 0.3, 0, 7);
    if (state.map === "platform") {
      const b = mapBounds();
      return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ ? 7 : null;
    }
    return 0;
  }

  function onCastleSafeGround(x, z) {
    const inIsland = Math.abs(x) <= 8 && Math.abs(z) <= 6;
    const onMainland = Math.abs(x) >= 12 || Math.abs(z) >= 10;
    const onBridge = state.bridgeOpen && Math.abs(x) <= 1.3 && z >= 4 && z <= 10.3;
    const onSecretPath = x >= 4.35 && x <= 5.65 && z >= -10.2 && z <= -4;
    return inIsland || onMainland || onBridge || onSecretPath;
  }

  function movementInput() {
    const keyboardX = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const keyboardY = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    const screenX = clamp(keyboardX + touchStick.x, -1, 1);
    const screenY = clamp(keyboardY + touchStick.y, -1, 1);
    if (!screenX && !screenY) return { x: 0, z: 0 };
    const strength = Math.min(1, Math.hypot(screenX, screenY));
    const direction = norm(screenY + screenX, screenY - screenX);
    return { x: direction.x * strength, z: direction.z * strength };
  }

  function moveWithCollisions(entity, dx, dz, radius) {
    const bounds = mapBounds();
    const limitPadding = state.map === "platform" ? -4 : radius;
    let nextX = entity.x + dx;
    let nextZ = entity.z;
    if (!pointHitsObstacle(nextX, nextZ, radius)) entity.x = nextX;
    else entity.vx *= -0.25;
    nextX = entity.x;
    nextZ = entity.z + dz;
    if (!pointHitsObstacle(nextX, nextZ, radius)) entity.z = nextZ;
    else entity.vz *= -0.25;
    if (state.map !== "platform") {
      entity.x = clamp(entity.x, bounds.minX + limitPadding, bounds.maxX - limitPadding);
      entity.z = clamp(entity.z, bounds.minZ + limitPadding, bounds.maxZ - limitPadding);
    }
  }

  function updatePlayer(player, dt) {
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackFlash = Math.max(0, player.attackFlash - dt);
    player.blockedFlash = Math.max(0, player.blockedFlash - dt);
    player.climbTimer = Math.max(0, player.climbTimer - dt);
    if (player.eliminated) return;
    if (player.inCar !== null) {
      const car = state.cars[player.inCar];
      if (car && !car.broken) {
        player.x = car.x;
        player.z = car.z;
        player.y = groundHeight(car.x, car.z) || 0;
        player.facingX = Math.cos(car.angle);
        player.facingZ = Math.sin(car.angle);
      } else {
        player.inCar = null;
      }
      return;
    }
    if (player.knocked) {
      updateRagdoll(player, dt);
      return;
    }

    let input = { x: 0, z: 0 };
    if (player.human) input = movementInput();
    else input = botInput(player, dt);
    const moving = Math.hypot(input.x, input.z) > 0.1;
    const speed = state.map === "hill" ? 4.3 : 4.75;
    if (moving) {
      player.vx = lerp(player.vx, input.x * speed, Math.min(1, dt * 11));
      player.vz = lerp(player.vz, input.z * speed, Math.min(1, dt * 11));
      player.facingX = lerp(player.facingX, input.x, Math.min(1, dt * 13));
      player.facingZ = lerp(player.facingZ, input.z, Math.min(1, dt * 13));
      const facing = norm(player.facingX, player.facingZ);
      player.facingX = facing.x;
      player.facingZ = facing.z;
    } else {
      player.vx *= Math.pow(0.0008, dt);
      player.vz *= Math.pow(0.0008, dt);
    }
    const oldFenceSide = Math.max(Math.abs(player.x) / 14, Math.abs(player.z) / 10.5) <= 1;
    moveWithCollisions(player, player.vx * dt, player.vz * dt, player.radius);
    const newFenceSide = Math.max(Math.abs(player.x) / 14, Math.abs(player.z) / 10.5) <= 1;
    if (state.map === "grass" && oldFenceSide !== newFenceSide) {
      player.climbTimer = 0.55;
      if (player.human) showToast("Du klättrade över staketet!");
      sfx("hop");
    }
    const ground = groundHeight(player.x, player.z);
    if (ground === null) {
      player.vy -= 16 * dt;
      player.y += player.vy * dt;
      if (player.y < -9) eliminatePlayer(player);
    } else {
      player.y = ground + (player.climbTimer > 0 ? Math.sin((player.climbTimer / 0.55) * Math.PI) * 0.9 : 0);
      player.vy = 0;
    }
    player.moveAmount = lerp(player.moveAmount, moving ? 1 : 0, Math.min(1, dt * 10));
    player.walk += dt * (moving ? 10 : 2.2);
    if (state.map === "castle" && !onCastleSafeGround(player.x, player.z)) fallInMoat(player);
    handlePickupOverlap(player);
  }

  function updateRagdoll(player, dt) {
    player.knockoutTimer -= dt;
    if (state.map === "hill") player.vz += 4.2 * dt;
    player.vx *= Math.pow(state.map === "hill" ? 0.4 : 0.12, dt);
    player.vz *= Math.pow(state.map === "hill" ? 0.72 : 0.12, dt);
    moveWithCollisions(player, player.vx * dt, player.vz * dt, player.radius * 0.8);
    player.walk += dt * (5 + Math.hypot(player.vx, player.vz));
    const ground = groundHeight(player.x, player.z);
    if (ground === null) {
      player.vy -= 16 * dt;
      player.y += player.vy * dt;
      if (player.y < -9) eliminatePlayer(player);
      return;
    }
    player.y = ground + 0.08;
    if (state.map === "castle" && !onCastleSafeGround(player.x, player.z)) {
      fallInMoat(player);
      return;
    }
    if (player.knockoutTimer <= 0 && state.map !== "platform") recoverPlayer(player);
    else if (player.knockoutTimer <= 0 && state.map === "platform") recoverPlayer(player);
  }

  function recoverPlayer(player) {
    if (player.eliminated) return;
    player.knocked = false;
    player.knockoutTimer = 0;
    player.vx = 0;
    player.vz = 0;
    player.vy = 0;
    player.invulnerable = 1;
    player.swordHits = 0;
  }

  function respawnPlayer(player) {
    player.x = player.respawnX;
    player.z = player.respawnZ;
    player.y = groundHeight(player.x, player.z) || 0;
    player.vx = player.vz = player.vy = 0;
    player.knocked = true;
    player.knockoutTimer = 1;
    player.invulnerable = 1.2;
  }

  function fallInMoat(player) {
    if (player.eliminated || player.invulnerable > 0) return;
    player.invulnerable = 2;
    spawnSplash(player.x, player.z);
    sfx("splash");
    if (player.inCar !== null) exitCar(player, true);
    respawnPlayer(player);
    if (player.human) showToast("PLASK! Du föll i vallgraven.");
  }

  function botInput(player, dt) {
    const ai = player.ai;
    ai.think -= dt;
    ai.useTimer -= dt;
    if (ai.think <= 0) {
      ai.think = randomRange(0.16, 0.42);
      if (state.mode === "free") {
        const opponents = state.players.filter((other) => other !== player && other.alive && !other.eliminated && !other.knocked);
        opponents.sort((a, b) => distSq(player, a) - distSq(player, b));
        ai.target = opponents[0]?.index ?? null;
        if (state.map === "castle") {
          const pickup = nearestAvailablePickup(player);
          if (pickup && !player.inventory.includes(pickup.type) && distSq(player, pickup) < 70) ai.targetPickup = pickup.id;
          else ai.targetPickup = null;
        }
      } else {
        ai.target = null;
        if (Math.hypot(player.x - ai.goalX, player.z - ai.goalZ) < 1.8 || seeded() < 0.08) pickWanderGoal(player);
      }
    }

    if (state.map === "city" && ai.useTimer <= 0) {
      ai.useTimer = randomRange(1, 2.6);
      const nearest = nearestCar(player, false);
      if (player.inCar === null && nearest && distSq(player, nearest) < 4.8 && (state.mode === "peace" || seeded() < 0.7)) enterCar(player, nearest);
    }

    let goal = { x: ai.goalX, z: ai.goalZ };
    if (state.mode === "free") {
      const pickup = ai.targetPickup === null || ai.targetPickup === undefined ? null : state.pickups.find((item) => item.id === ai.targetPickup && item.takenBy === null);
      const target = state.players[ai.target];
      if (pickup) goal = pickup;
      else if (target && !target.eliminated) {
        goal = target;
        const dx = target.x - player.x;
        const dz = target.z - player.z;
        const distance = Math.hypot(dx, dz);
        const aim = norm(dx, dz);
        player.facingX = aim.x;
        player.facingZ = aim.z;
        const weapon = currentWeapon(player);
        if (weapon === "sword" && distance < 2.15) attack(player);
        else if ((weapon === "bow" && distance < 12) || (weapon === "cannon" && distance < 10)) {
          if (seeded() < 0.28) attack(player);
        } else if (weapon === "shield" && seeded() < 0.12 && player.inventory.length > 1) cycleWeaponQuiet(player);
        if (distance < 2.4 && weapon !== "sword" && player.inventory.includes("sword")) selectWeapon(player, "sword");
        else if (distance > 5 && player.inventory.includes("bow") && seeded() < 0.12) selectWeapon(player, "bow");
      }
    }
    const direction = norm(goal.x - player.x, goal.z - player.z);
    if (state.mode === "free" && state.players[ai.target]) {
      const distance = Math.sqrt(distSq(player, state.players[ai.target]));
      if (distance < 4 && currentWeapon(player) !== "sword") {
        direction.x = direction.x * 0.25 + (-direction.z) * ai.strafe;
        direction.z = direction.z * 0.25 + direction.x * ai.strafe * 0.15;
      }
    }
    return direction;
  }

  function pickWanderGoal(player) {
    const b = mapBounds();
    player.ai.goalX = randomRange(b.minX + 2, b.maxX - 2);
    player.ai.goalZ = randomRange(b.minZ + 2, b.maxZ - 2);
    if (state.map === "castle") {
      player.ai.goalX = randomRange(-5.2, 5.2);
      player.ai.goalZ = randomRange(-3.4, 3.4);
    }
  }

  function selectWeapon(player, weapon) {
    const index = player.inventory.indexOf(weapon);
    if (index >= 0) player.weaponIndex = index;
  }

  function cycleWeaponQuiet(player) {
    if (player.inventory.length > 1) player.weaponIndex = (player.weaponIndex + 1) % player.inventory.length;
  }

  function nearestAvailablePickup(player) {
    let best = null;
    let bestDistance = Infinity;
    for (const pickup of state.pickups) {
      if (pickup.takenBy !== null) continue;
      const distance = distSq(player, pickup);
      if (distance < bestDistance) { best = pickup; bestDistance = distance; }
    }
    return best;
  }

  function handlePickupOverlap(player) {
    if (state.map !== "castle" || player.knocked || player.eliminated) return;
    // Everyone begins Fri with their own cannon before the castle pickups
    // become available. This also makes the opening state clear on slower
    // touch devices where a bot can otherwise overlap a pickup immediately.
    if (state.roundTime < 0.65) return;
    if (player.human) return;
    const pickup = nearestAvailablePickup(player);
    if (pickup && distSq(player, pickup) < 1.35) takePickup(player, pickup);
  }

  function takePickup(player, pickup) {
    if (!pickup || pickup.takenBy !== null) return false;
    pickup.takenBy = player.index;
    if (!player.inventory.includes(pickup.type)) player.inventory.push(pickup.type);
    player.weaponIndex = player.inventory.indexOf(pickup.type);
    burst(pickup.x, pickup.z, "#ffe35e", 10);
    sfx("pickup");
    if (player.human) showToast(`Du plockade upp ${WEAPON_NAMES[pickup.type]}!`);
    return true;
  }

  function nearestCar(player, includeBroken = false) {
    let best = null;
    let bestDistance = Infinity;
    for (const car of state.cars) {
      if (car.driver !== null || (!includeBroken && car.broken)) continue;
      const distance = distSq(player, car);
      if (distance < bestDistance) { best = car; bestDistance = distance; }
    }
    return best;
  }

  function enterCar(player, car) {
    if (!car || car.broken || car.driver !== null || player.knocked || player.eliminated) return false;
    if (distSq(player, car) > 7) return false;
    car.driver = player.index;
    player.inCar = car.id;
    player.x = car.x;
    player.z = car.z;
    sfx("car");
    if (player.human) showToast("Du kör! Tryck E för att hoppa ur.");
    return true;
  }

  function exitCar(player, ejected = false) {
    if (player.inCar === null) return false;
    const car = state.cars[player.inCar];
    if (!car) { player.inCar = null; return false; }
    car.driver = null;
    player.inCar = null;
    const side = { x: -Math.sin(car.angle), z: Math.cos(car.angle) };
    player.x = car.x + side.x * 1.55;
    player.z = car.z + side.z * 1.55;
    player.y = groundHeight(player.x, player.z) || 0;
    if (ejected) {
      player.vx = car.vx * 0.7 + side.x * 2;
      player.vz = car.vz * 0.7 + side.z * 2;
      if (state.mode === "free") {
        player.knocked = true;
        player.knockoutTimer = 1.4;
      }
    }
    if (player.human) showToast(ejected ? "BILEN GICK SÖNDER!" : "Du hoppade ur bilen.");
    return true;
  }

  function breakCar(car) {
    if (!car || car.broken) return;
    car.broken = true;
    car.smoke = 1;
    const driver = car.driver === null ? null : state.players[car.driver];
    if (driver) exitCar(driver, true);
    burst(car.x, car.z, "#ffb133", 18);
    state.camera.shake = Math.max(state.camera.shake, 0.55);
    sfx("crash");
  }

  function updateCars(dt) {
    for (const car of state.cars) {
      if (car.broken) {
        car.vx *= Math.pow(0.02, dt);
        car.vz *= Math.pow(0.02, dt);
        car.smoke += dt;
        if (seeded() < dt * 3) state.particles.push({ x: car.x, z: car.z, y: 1, vx: randomRange(-0.15, 0.15), vz: randomRange(-0.15, 0.15), vy: 0.7, life: 1.3, maxLife: 1.3, color: "#4c4a55", size: 0.25 });
        continue;
      }
      let desiredX = 0;
      let desiredZ = 0;
      const driver = car.driver === null ? null : state.players[car.driver];
      if (driver?.human) {
        const input = movementInput();
        desiredX = input.x;
        desiredZ = input.z;
      } else if (driver) {
        let goal = { x: driver.ai.goalX, z: driver.ai.goalZ };
        if (state.mode === "free" && state.players[driver.ai.target]) goal = state.players[driver.ai.target];
        if (Math.hypot(goal.x - car.x, goal.z - car.z) < 2) pickWanderGoal(driver);
        const direction = norm(goal.x - car.x, goal.z - car.z);
        desiredX = direction.x;
        desiredZ = direction.z;
      }
      if (driver && (desiredX || desiredZ)) {
        const targetAngle = Math.atan2(desiredZ, desiredX);
        let difference = ((targetAngle - car.angle + Math.PI * 3) % TAU) - Math.PI;
        car.angle += clamp(difference, -dt * 3.8, dt * 3.8);
        const targetSpeed = 7.8;
        car.vx = lerp(car.vx, Math.cos(car.angle) * targetSpeed, Math.min(1, dt * 3.6));
        car.vz = lerp(car.vz, Math.sin(car.angle) * targetSpeed, Math.min(1, dt * 3.6));
      } else {
        car.vx *= Math.pow(0.08, dt);
        car.vz *= Math.pow(0.08, dt);
      }
      const oldX = car.x;
      const oldZ = car.z;
      car.x += car.vx * dt;
      car.z += car.vz * dt;
      const bounds = mapBounds();
      const collided = pointHitsObstacle(car.x, car.z, car.radius) || car.x < bounds.minX + 1 || car.x > bounds.maxX - 1 || car.z < bounds.minZ + 1 || car.z > bounds.maxZ - 1;
      if (collided) {
        car.x = oldX;
        car.z = oldZ;
        breakCar(car);
        continue;
      }
      const speed = Math.hypot(car.vx, car.vz);
      if (speed > 2.5) {
        for (const player of state.players) {
          if (player.index === car.driver || player.eliminated || player.inCar !== null) continue;
          if (distSq(car, player) < 2.25) {
            if (state.mode === "free") knockOut(player, driver, "car", norm(car.vx, car.vz));
            else {
              player.x += car.vx * dt * 0.45;
              player.z += car.vz * dt * 0.45;
            }
          }
        }
      }
    }
  }

  function useAction(player) {
    if (!player || state.screen !== "playing" || player.knocked || player.eliminated) return false;
    if (player.inCar !== null) return exitCar(player);
    if (state.map === "city") {
      const car = nearestCar(player, false);
      if (car && distSq(player, car) <= 7) return enterCar(player, car);
    }
    if (state.map === "castle") {
      const pickup = nearestAvailablePickup(player);
      if (pickup && distSq(player, pickup) < 3) return takePickup(player, pickup);
      if (Math.hypot(player.x, player.z - 2.9) < 2) {
        if (!state.bridgeOpen) {
          state.bridgeOpen = true;
          showToast("VINDBRYGGAN ÖPPNAS!");
          burst(0, 4.3, "#ffe15b", 20);
          sfx("bridge");
        } else if (player.human) showToast("Vindbryggan är redan öppen.");
        return true;
      }
    }
    if (player.human) showToast("Inget att använda här.", 900);
    return false;
  }

  function update(dt) {
    if (state.screen !== "playing" || state.paused || state.roundOver) return;
    state.time += dt;
    state.roundTime += dt;
    state.frame++;
    updateCars(dt);
    for (const player of state.players) updatePlayer(player, dt);
    separatePlayers();
    updateProjectiles(dt);
    updateParticles(dt);
    state.camera.shake = Math.max(0, state.camera.shake - dt * 2.6);
    const human = state.players[0];
    if (human && !human.eliminated) {
      state.camera.x = lerp(state.camera.x, human.x, 1 - Math.pow(0.0001, dt));
      state.camera.z = lerp(state.camera.z, human.z, 1 - Math.pow(0.0001, dt));
    }
  }

  function separatePlayers() {
    for (let i = 0; i < state.players.length; i++) {
      const a = state.players[i];
      if (a.eliminated || a.inCar !== null) continue;
      for (let j = i + 1; j < state.players.length; j++) {
        const b = state.players[j];
        if (b.eliminated || b.inCar !== null) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const distance = Math.hypot(dx, dz);
        const minimum = (a.knocked || b.knocked) ? 0.68 : 0.86;
        if (distance > 0 && distance < minimum) {
          const push = (minimum - distance) * 0.5;
          const nx = dx / distance;
          const nz = dz / distance;
          if (!a.knocked) { a.x -= nx * push; a.z -= nz * push; }
          if (!b.knocked) { b.x += nx * push; b.z += nz * push; }
        }
      }
    }
  }

  function attack(player) {
    if (!player || state.screen !== "playing" || state.mode !== "free" || player.eliminated || player.knocked || player.inCar !== null || player.attackCooldown > 0) return false;
    const weapon = currentWeapon(player);
    if (!weapon || weapon === "shield") {
      if (player?.human && weapon === "shield") showToast("Skölden skyddar framifrån. Byt vapen med Q.", 1100);
      return false;
    }
    player.attackFlash = 0.22;
    if (weapon === "sword") {
      player.attackCooldown = 0.68;
      swingSword(player);
    } else if (weapon === "bow") {
      player.attackCooldown = 0.58;
      fireProjectile(player, "arrow");
    } else {
      player.attackCooldown = 1.35;
      fireProjectile(player, "cannonball");
    }
    return true;
  }

  function swingSword(player) {
    let target = null;
    let best = Infinity;
    for (const other of state.players) {
      if (other === player || other.eliminated || other.knocked || other.inCar !== null || other.invulnerable > 0) continue;
      const dx = other.x - player.x;
      const dz = other.z - player.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 2.2) continue;
      const direction = norm(dx, dz);
      const facingDot = direction.x * player.facingX + direction.z * player.facingZ;
      if (facingDot < -0.05 || distance >= best) continue;
      target = other;
      best = distance;
    }
    sfx("swing");
    if (!target) return;
    applySwordHit(target, player);
  }

  function shieldBlocks(target, sourceX, sourceZ) {
    if (currentWeapon(target) !== "shield" || target.knocked || target.eliminated) return false;
    const towardSource = norm(sourceX - target.x, sourceZ - target.z);
    return towardSource.x * target.facingX + towardSource.z * target.facingZ > 0.05;
  }

  function applySwordHit(target, source) {
    if (!target || target.eliminated || target.knocked || state.mode !== "free") return false;
    if (shieldBlocks(target, source?.x ?? target.x, source?.z ?? target.z - 1)) {
      target.blockedFlash = 0.35;
      burst(target.x, target.z, "#c9f3ff", 7);
      sfx("block");
      return "blocked";
    }
    target.swordHits++;
    const push = source ? norm(target.x - source.x, target.z - source.z) : { x: 0, z: 1 };
    target.vx += push.x * 2.2;
    target.vz += push.z * 2.2;
    burst(target.x, target.z, "#fff3a3", 7);
    sfx("hit");
    if (target.swordHits >= 3) {
      knockOut(target, source, "sword", push);
      return "knocked-out";
    }
    if (target.human) showToast(`SVÄRDSTRÄFF ${target.swordHits}/3`, 850);
    return `hit-${target.swordHits}`;
  }

  function fireProjectile(player, type) {
    if (!player || player.eliminated || player.knocked || state.mode !== "free") return false;
    const direction = norm(player.facingX, player.facingZ);
    const speed = type === "arrow" ? 16.5 : 10.5;
    const radius = type === "arrow" ? 0.14 : 0.58;
    state.projectiles.push({
      id: `${state.frame}-${player.index}-${Math.floor(seeded() * 10000)}`,
      type,
      owner: player.index,
      x: player.x + direction.x * 0.95,
      z: player.z + direction.z * 0.95,
      y: player.y + (type === "arrow" ? 1.15 : 0.75),
      vx: direction.x * speed,
      vz: direction.z * speed,
      vy: type === "cannonball" ? 1.3 : 0,
      radius,
      life: type === "arrow" ? 2.1 : 3.2,
      rotation: Math.atan2(direction.z, direction.x),
    });
    if (type === "cannonball") {
      player.vx -= direction.x * 0.8;
      player.vz -= direction.z * 0.8;
      state.camera.shake = player.human ? Math.max(state.camera.shake, 0.18) : state.camera.shake;
      sfx("cannon");
    } else sfx("bow");
    return true;
  }

  function updateProjectiles(dt) {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const shot = state.projectiles[i];
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.z += shot.vz * dt;
      if (shot.type === "cannonball") {
        shot.vy -= 5.5 * dt;
        shot.y += shot.vy * dt;
        const floor = groundHeight(shot.x, shot.z);
        if (floor !== null && shot.y < floor + shot.radius) {
          shot.y = floor + shot.radius;
          shot.vy = Math.abs(shot.vy) * 0.42;
        }
      }
      if (shot.life <= 0 || pointHitsObstacle(shot.x, shot.z, shot.radius)) {
        projectileImpact(shot);
        state.projectiles.splice(i, 1);
        continue;
      }
      if (state.map === "castle" && !onCastleSafeGround(shot.x, shot.z) && shot.y < 0.5) {
        state.projectiles.splice(i, 1);
        continue;
      }
      let removed = false;
      for (const car of state.cars) {
        if (car.broken || distSq(shot, car) > (car.radius + shot.radius) ** 2) continue;
        if (shot.type === "cannonball") breakCar(car);
        projectileImpact(shot);
        state.projectiles.splice(i, 1);
        removed = true;
        break;
      }
      if (removed) continue;
      for (const player of state.players) {
        if (player.index === shot.owner || player.eliminated || player.knocked || player.invulnerable > 0 || player.inCar !== null) continue;
        const verticalDistance = Math.abs((player.y + 0.7) - shot.y);
        if (distSq(shot, player) > (player.radius + shot.radius) ** 2 || verticalDistance > 1.2) continue;
        const owner = state.players[shot.owner];
        if (shot.type === "arrow" && shieldBlocks(player, owner?.x ?? shot.x - shot.vx, owner?.z ?? shot.z - shot.vz)) {
          player.blockedFlash = 0.35;
          burst(player.x, player.z, "#c9f3ff", 8);
          sfx("block");
        } else {
          const force = norm(shot.vx, shot.vz);
          knockOut(player, owner, shot.type, force);
        }
        projectileImpact(shot);
        state.projectiles.splice(i, 1);
        removed = true;
        break;
      }
    }
  }

  function projectileImpact(shot) {
    burst(shot.x, shot.z, shot.type === "arrow" ? "#d9b36c" : "#36333e", shot.type === "arrow" ? 5 : 10);
  }

  function knockOut(target, source = null, reason = "cannonball", force = null) {
    if (!target || target.eliminated || target.knocked || state.mode !== "free" || target.invulnerable > 0) return false;
    target.knocked = true;
    target.knockoutTimer = state.map === "platform" ? 4.6 : 4;
    target.swordHits = 0;
    const direction = force || (source ? norm(target.x - source.x, target.z - source.z) : { x: 0, z: 1 });
    const strength = reason === "cannonball" ? 8.4 : reason === "car" ? 9 : reason === "arrow" ? 5.8 : 5;
    target.vx = direction.x * strength;
    target.vz = direction.z * strength;
    target.vy = reason === "cannonball" ? 2 : 0.7;
    if (target.inCar !== null) exitCar(target, true);
    if (source && source !== target) source.score++;
    state.camera.shake = Math.max(state.camera.shake, reason === "cannonball" || reason === "car" ? 0.75 : 0.35);
    burst(target.x, target.z, target.color, 14);
    sfx("knockout");
    if (target.human) showToast("DU BLEV UTSLAGEN!", 1400);
    return true;
  }

  function eliminatePlayer(player) {
    if (!player || player.eliminated) return false;
    player.eliminated = true;
    player.alive = false;
    player.knocked = true;
    player.inCar = null;
    burst(player.x, player.z, player.color, 22);
    sfx("fall");
    checkPlatformWinner();
    return true;
  }

  function checkPlatformWinner() {
    if (state.map !== "platform" || state.roundOver) return;
    const alive = state.players.filter((player) => !player.eliminated);
    if (alive.length <= 1) {
      state.roundOver = true;
      state.winner = alive[0]?.index ?? null;
      state.screen = "round";
      const winner = alive[0];
      if (ui.roundTitle) ui.roundTitle.textContent = winner?.human ? "DU VANN!" : `${winner?.name || "INGEN"} VANN!`;
      if (ui.roundMessage) ui.roundMessage.textContent = winner?.human ? "Du blev sist kvar på Plattan!" : `${winner?.name || "Ingen"} blev sist kvar. Försök igen!`;
      setVisible(ui.round, true);
      setVisible(ui.pauseButton, false);
      setVisible(ui.touch, false);
      resetJoystick();
      sfx(winner?.human ? "win" : "round");
    }
  }

  function burst(x, z, color, count) {
    const y = groundHeight(x, z) || 0;
    for (let i = 0; i < count; i++) {
      const angle = randomRange(0, TAU);
      const speed = randomRange(0.6, 3.2);
      state.particles.push({
        x, z, y: y + randomRange(0.3, 1.3),
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        vy: randomRange(0.8, 3.4),
        life: randomRange(0.35, 0.85),
        maxLife: 0.85,
        color,
        size: randomRange(0.06, 0.2),
      });
    }
  }

  function spawnSplash(x, z) {
    for (let i = 0; i < 18; i++) {
      const angle = randomRange(0, TAU);
      const speed = randomRange(0.8, 3.5);
      state.particles.push({ x, z, y: 0, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, vy: randomRange(1, 4), life: randomRange(0.5, 1), maxLife: 1, color: "#69d9ff", size: randomRange(0.08, 0.2) });
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const particle = state.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) { state.particles.splice(i, 1); continue; }
      particle.x += particle.vx * dt;
      particle.z += particle.vz * dt;
      particle.y += particle.vy * dt;
      particle.vy -= 5.5 * dt;
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(800, Math.round(rect.width || 1280));
    const h = Math.max(450, Math.round(rect.height || 720));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    state.view.w = w;
    state.view.h = h;
    state.view.dpr = dpr;
    render();
  }

  function isoScale() {
    return clamp(state.view.w / 1280, 0.72, 1.18);
  }

  function project(x, z, y = 0) {
    const scale = isoScale();
    const dx = x - state.camera.x;
    const dz = z - state.camera.z;
    const renderY = y - (state.map === "platform" ? 7 : 0);
    const shake = state.camera.shake;
    const sx = shake ? Math.sin(state.time * 73) * shake * 5 : 0;
    const sy = shake ? Math.cos(state.time * 61) * shake * 3 : 0;
    return {
      x: state.view.w * 0.5 + (dx - dz) * 31 * scale + sx,
      y: state.view.h * 0.47 + (dx + dz) * 16 * scale - renderY * 31 * scale + sy,
    };
  }

  function pathPolygon(points, fill, stroke = null, width = 1) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }

  function worldQuad(x, z, w, d, color, height = 0, stroke = null) {
    pathPolygon([
      project(x, z, height), project(x + w, z, height),
      project(x + w, z + d, height), project(x, z + d, height),
    ], color, stroke, 1);
  }

  function drawIsoBox(rect, color = rect.color || "#9c8a79") {
    const base = 0;
    const top = rect.h || 2;
    const a = project(rect.x, rect.z, base);
    const b = project(rect.x + rect.w, rect.z, base);
    const c = project(rect.x + rect.w, rect.z + rect.d, base);
    const d = project(rect.x, rect.z + rect.d, base);
    const at = project(rect.x, rect.z, top);
    const bt = project(rect.x + rect.w, rect.z, top);
    const ct = project(rect.x + rect.w, rect.z + rect.d, top);
    const dt = project(rect.x, rect.z + rect.d, top);
    pathPolygon([d, c, ct, dt], shade(color, -26));
    pathPolygon([b, c, ct, bt], shade(color, -42));
    pathPolygon([at, bt, ct, dt], shade(color, 18), "rgba(25,18,45,.28)", 1.4);
    if (rect.h >= 4 && rect.w > 2) {
      const rows = Math.min(3, Math.floor(rect.h / 2));
      for (let r = 0; r < rows; r++) {
        const p = project(rect.x + rect.w + 0.015, rect.z + rect.d * (0.22 + r * 0.25), rect.h - 1.2 - r * 1.15);
        ctx.fillStyle = "rgba(255,237,143,.82)";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 5 * isoScale(), 7 * isoScale(), 0.48, 0, TAU);
        ctx.fill();
      }
    }
  }

  function shade(hex, amount) {
    const value = hex.startsWith("#") ? hex.slice(1) : "888888";
    const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
    const number = parseInt(full, 16);
    const r = clamp((number >> 16) + amount, 0, 255);
    const g = clamp(((number >> 8) & 255) + amount, 0, 255);
    const b = clamp((number & 255) + amount, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  function drawBackdrop() {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.view.h);
    if (state.map === "platform") {
      gradient.addColorStop(0, "#5cc8ff");
      gradient.addColorStop(1, "#d7f4ff");
    } else if (state.map === "castle") {
      gradient.addColorStop(0, "#92d9ff");
      gradient.addColorStop(1, "#dff5e5");
    } else {
      gradient.addColorStop(0, "#80d7ff");
      gradient.addColorStop(0.56, "#d9f5ff");
      gradient.addColorStop(1, "#e9f5d5");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.view.w, state.view.h);
    if (state.map === "platform") {
      for (let i = 0; i < 9; i++) {
        const x = ((i * 183 + state.time * (i % 2 ? 5 : -3)) % (state.view.w + 260)) - 130;
        const y = 90 + (i % 4) * 105;
        drawCloud(x, y, 0.7 + (i % 3) * 0.25);
      }
    }
  }

  function drawCloud(x, y, scale) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y, 55 * scale, 18 * scale, 0, 0, TAU);
    ctx.ellipse(x - 27 * scale, y - 11 * scale, 25 * scale, 23 * scale, 0, 0, TAU);
    ctx.ellipse(x + 14 * scale, y - 18 * scale, 32 * scale, 29 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawMap() {
    if (state.map === "city") drawCity();
    else if (state.map === "grass") drawGrass();
    else if (state.map === "hill") drawHill();
    else if (state.map === "platform") drawPlatform();
    else if (state.map === "castle") drawCastle();
  }

  function drawCity() {
    const b = mapBounds();
    worldQuad(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ, "#9fb0b3", 0, "#7e8f92");
    for (let x = b.minX; x < b.maxX; x += 2) {
      for (let z = b.minZ; z < b.maxZ; z += 2) {
        const road = Math.abs(x + 1) < 4.2 || Math.abs(z + 1) < 3.6 || Math.abs(x + 1 - 10) < 2.2 || Math.abs(x + 1 + 10) < 2.2;
        worldQuad(x, z, 2, 2, road ? ((x + z) % 4 ? "#626c78" : "#68737f") : "#b8c3bd", 0, "rgba(42,50,61,.08)");
      }
    }
    for (let z = b.minZ + 1; z < b.maxZ; z += 4) worldQuad(-0.12, z, 0.24, 1.8, "#ffd34f");
    for (let x = b.minX + 1; x < b.maxX; x += 4) worldQuad(x, -0.12, 1.8, 0.24, "#ffd34f");
    CITY_BUILDINGS.slice().sort((a, bld) => a.x + a.z - bld.x - bld.z).forEach((building) => drawIsoBox(building));
    for (const position of [[-3, 4], [4, 4], [-4, -9], [8, -9]]) drawTree(position[0], position[1]);
  }

  function drawGrass() {
    const b = mapBounds();
    worldQuad(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ, "#65c85a", 0, "#3d9f4d");
    for (let x = b.minX; x < b.maxX; x += 2) {
      for (let z = b.minZ; z < b.maxZ; z += 2) {
        const variation = ((x * 7 + z * 11) % 5 + 5) % 5;
        worldQuad(x, z, 2, 2, variation < 2 ? "#6ed05d" : "#64c456", 0, "rgba(32,110,52,.09)");
      }
    }
    drawFence(-14, -10.5, 28, 0, 18);
    drawFence(-14, 10.5, 28, 0, 18);
    drawFence(-14, -10.5, 0, 21, 14);
    drawFence(14, -10.5, 0, 21, 14);
    for (const flower of [[-9,-5],[8,6],[4,-8],[-4,8],[16,-2],[-17,5]]) drawFlower(flower[0], flower[1]);
  }

  function drawFence(x, z, w, d, count) {
    const scale = isoScale();
    let previous = null;
    for (let i = 0; i <= count; i++) {
      const px = x + w * (i / count);
      const pz = z + d * (i / count);
      const bottom = project(px, pz, 0);
      const top = project(px, pz, 0.85);
      ctx.strokeStyle = "#704b2f";
      ctx.lineWidth = 5 * scale;
      ctx.beginPath(); ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      if (previous) {
        const rail = project(px, pz, 0.55);
        ctx.lineWidth = 3 * scale;
        ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(rail.x, rail.y); ctx.stroke();
        previous = rail;
      } else previous = project(px, pz, 0.55);
    }
  }

  function drawHill() {
    const b = mapBounds();
    for (let z = b.minZ; z < b.maxZ; z += 1) {
      const h1 = groundHeight(0, z);
      const h2 = groundHeight(0, z + 1);
      for (let x = b.minX; x < b.maxX; x += 2) {
        pathPolygon([
          project(x, z, h1), project(x + 2, z, h1),
          project(x + 2, z + 1, h2), project(x, z + 1, h2),
        ], z % 2 ? "#65bf58" : "#6ac65b", "rgba(37,114,53,.08)");
      }
    }
    for (let x = -15; x <= 15; x += 5) drawTree(x, 10.5);
    const sign = project(-14, -9, groundHeight(-14, -9));
    ctx.save(); ctx.translate(sign.x, sign.y - 25); ctx.rotate(-0.05); ctx.fillStyle = "#f8d15c"; ctx.fillRect(-36, -19, 72, 30); ctx.fillStyle = "#503825"; ctx.font = "900 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("BRANT!", 0, 1); ctx.restore();
  }

  function drawPlatform() {
    const b = mapBounds();
    const top = [project(b.minX, b.minZ, 7), project(b.maxX, b.minZ, 7), project(b.maxX, b.maxZ, 7), project(b.minX, b.maxZ, 7)];
    const lowerB = project(b.maxX, b.minZ, 5.5);
    const lowerC = project(b.maxX, b.maxZ, 5.5);
    const lowerD = project(b.minX, b.maxZ, 5.5);
    pathPolygon([top[1], top[2], lowerC, lowerB], "#6e58a9");
    pathPolygon([top[3], top[2], lowerC, lowerD], "#58458d");
    pathPolygon(top, "#e7558e", "#fff0a8", 6 * isoScale());
    for (let x = -8; x < 9; x += 2) for (let z = -5.5; z < 6; z += 2) worldQuad(x, z, 2, 2, ((x + z) % 4 ? "#f05e96" : "#dc4d86"), 7, "rgba(255,255,255,.12)");
    worldQuad(-1.6, -1.4, 3.2, 2.8, "#ffd44d", 7.03, "#fff3a0");
  }

  function drawCastle() {
    const b = mapBounds();
    worldQuad(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ, "#67bd5a", 0, "#3a8c4b");
    worldQuad(-12, -10, 24, 20, "#30a8d0", -0.08, "#1980a9");
    for (let x = -11; x < 11; x += 2) for (let z = -9; z < 9; z += 2) worldQuad(x, z, 2, 2, ((x + z) % 4 ? "#3bb7dc" : "#32acd2"), -0.09);
    worldQuad(-8, -6, 16, 12, "#83bd63", 0, "#5b8f4f");
    worldQuad(4.35, -10.1, 1.3, 6.2, "#6c6757", 0.02, "#c1b58c");
    for (let z = -9.7; z < -4; z += 1.15) worldQuad(4.45, z, 1.1, 0.65, "#a39570", 0.05, "#d3c79c");
    if (state.bridgeOpen) {
      for (let z = 4; z < 10.1; z += 0.8) worldQuad(-1.25, z, 2.5, 0.68, z % 1.6 < .7 ? "#9a6039" : "#ad7142", 0.08, "#613d28");
    } else {
      const hinge = project(0, 4.15, 0);
      const raised = project(0, 4.15, 3.5);
      ctx.strokeStyle = "#77472e"; ctx.lineWidth = 18 * isoScale(); ctx.beginPath(); ctx.moveTo(hinge.x, hinge.y); ctx.lineTo(raised.x, raised.y); ctx.stroke();
    }
    castleWalls().filter((wall) => !wall.gate).forEach((wall) => drawIsoBox(wall, "#a99679"));
    for (const [x, z] of [[-6.4,-4.7],[5.65,-4.7],[-6.4,4.05],[5.65,4.05]]) drawTower(x, z);
    drawCastleButton();
  }

  function drawTower(x, z) {
    const scale = isoScale();
    const p = project(x + 0.35, z + 0.35, 3.6);
    ctx.fillStyle = "#c5b393";
    ctx.beginPath(); ctx.arc(p.x, p.y, 17 * scale, 0, TAU); ctx.fill();
    ctx.fillStyle = "#754f83";
    ctx.beginPath(); ctx.moveTo(p.x - 20 * scale, p.y); ctx.lineTo(p.x, p.y - 35 * scale); ctx.lineTo(p.x + 20 * scale, p.y); ctx.closePath(); ctx.fill();
  }

  function drawCastleButton() {
    const p = project(0, 2.9, 0.08);
    const scale = isoScale();
    ctx.fillStyle = state.bridgeOpen ? "#50e686" : "#ffdd45";
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 16 * scale, 9 * scale, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#5b3f39"; ctx.lineWidth = 3 * scale; ctx.stroke();
    ctx.fillStyle = "#342549"; ctx.font = `900 ${11 * scale}px system-ui`; ctx.textAlign = "center"; ctx.fillText("E", p.x, p.y + 4 * scale);
  }

  function drawTree(x, z) {
    const scale = isoScale();
    const bottom = project(x, z, 0);
    const top = project(x, z, 1.7);
    ctx.strokeStyle = "#75492d"; ctx.lineWidth = 7 * scale; ctx.beginPath(); ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(top.x, top.y); ctx.stroke();
    ctx.fillStyle = "#3eaa63"; ctx.beginPath(); ctx.arc(top.x, top.y - 10 * scale, 20 * scale, 0, TAU); ctx.fill();
    ctx.fillStyle = "#62cd74"; ctx.beginPath(); ctx.arc(top.x - 9 * scale, top.y - 20 * scale, 12 * scale, 0, TAU); ctx.fill();
  }

  function drawFlower(x, z) {
    const p = project(x, z, 0.1);
    const scale = isoScale();
    const colors = ["#ffdf50", "#ff75a8", "#f4f0ff"];
    ctx.fillStyle = colors[Math.abs(Math.round(x * 3 + z * 5)) % colors.length];
    ctx.beginPath(); ctx.arc(p.x, p.y, 4 * scale, 0, TAU); ctx.fill();
  }

  function drawEntities() {
    const drawables = [];
    for (const pickup of state.pickups) if (pickup.takenBy === null) drawables.push({ depth: pickup.x + pickup.z, draw: () => drawPickup(pickup) });
    for (const car of state.cars) drawables.push({ depth: car.x + car.z + 0.2, draw: () => drawCar(car) });
    for (const shot of state.projectiles) drawables.push({ depth: shot.x + shot.z + 0.3, draw: () => drawProjectile(shot) });
    for (const player of state.players) {
      if (player.eliminated || player.inCar !== null) continue;
      drawables.push({ depth: player.x + player.z + (player.knocked ? -0.1 : 0.1), draw: () => drawPlayer(player) });
    }
    drawables.sort((a, b) => a.depth - b.depth);
    for (const drawable of drawables) drawable.draw();
    drawParticles();
  }

  function drawPickup(pickup) {
    const scale = isoScale();
    const y = 0.8 + Math.sin(state.time * 3 + pickup.bob) * 0.16;
    const p = project(pickup.x, pickup.z, y);
    const shadow = project(pickup.x, pickup.z, 0);
    ctx.fillStyle = "rgba(31,28,47,.2)";
    ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y, 18 * scale, 8 * scale, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(scale, scale);
    if (pickup.type === "sword") {
      ctx.rotate(-0.65); ctx.fillStyle = "#eaf7ff"; ctx.fillRect(-3, -27, 6, 35); ctx.fillStyle = "#72c9ee"; ctx.fillRect(-1.5, -25, 2.5, 30); ctx.fillStyle = "#ffd45b"; ctx.fillRect(-11, 5, 22, 6); ctx.fillStyle = "#774229"; ctx.fillRect(-3, 10, 6, 14);
    } else if (pickup.type === "shield") {
      ctx.fillStyle = "#55bced"; ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(22, -17, 17, 7); ctx.quadraticCurveTo(0, 27, -17, 7); ctx.quadraticCurveTo(-22, -17, 0, -24); ctx.fill(); ctx.strokeStyle = "#e9f8ff"; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = "#ffe05a"; ctx.beginPath(); ctx.arc(0, -1, 5, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = "#8b542e"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-4, 0, 18, -1.25, 1.25); ctx.stroke(); ctx.strokeStyle = "#f3e5c4"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2, -17); ctx.lineTo(2, 17); ctx.stroke();
    }
    ctx.restore();
  }

  function drawCar(car) {
    const scale = isoScale();
    const p = project(car.x, car.z, 0.25);
    const forwardWorld = { x: Math.cos(car.angle), z: Math.sin(car.angle) };
    const front = project(car.x + forwardWorld.x, car.z + forwardWorld.z, 0.25);
    const screenAngle = Math.atan2(front.y - p.y, front.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(screenAngle);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(27,24,42,.25)";
    ctx.beginPath(); ctx.ellipse(0, 14, 42, 14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = car.broken ? "#625f68" : shade(car.color, -16);
    roundRectPath(-39, -18, 78, 34, 10); ctx.fill();
    ctx.fillStyle = car.broken ? "#474650" : car.color;
    roundRectPath(-22, -30, 43, 26, 9); ctx.fill();
    ctx.fillStyle = "#bfeaff";
    roundRectPath(-14, -26, 26, 14, 4); ctx.fill();
    ctx.fillStyle = "#272534";
    ctx.beginPath(); ctx.arc(-25, 16, 10, 0, TAU); ctx.arc(25, 16, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff3a0"; ctx.fillRect(31, -10, 8, 8);
    if (car.broken) {
      ctx.strokeStyle = "#f0eff5"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, -25); ctx.lineTo(5, -12); ctx.moveTo(6, -25); ctx.lineTo(-5, -13); ctx.stroke();
    }
    if (car.driver !== null) {
      const driver = state.players[car.driver];
      ctx.fillStyle = driver.color;
      ctx.beginPath(); ctx.arc(-2, -31, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#241c39"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#171423"; ctx.beginPath(); ctx.arc(2, -33, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawProjectile(shot) {
    const p = project(shot.x, shot.z, shot.y);
    const scale = isoScale();
    if (shot.type === "cannonball") {
      ctx.fillStyle = "rgba(26,23,38,.18)";
      const shadow = project(shot.x, shot.z, groundHeight(shot.x, shot.z) || 0);
      ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y, 14 * scale, 6 * scale, 0, 0, TAU); ctx.fill();
      const gradient = ctx.createRadialGradient(p.x - 5 * scale, p.y - 6 * scale, 2, p.x, p.y, 15 * scale);
      gradient.addColorStop(0, "#6e6b78"); gradient.addColorStop(0.25, "#292733"); gradient.addColorStop(1, "#09080d");
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(p.x, p.y, 14 * scale, 0, TAU); ctx.fill();
      ctx.fillStyle = "#f1a23b"; ctx.beginPath(); ctx.arc(p.x - 10 * scale, p.y - 10 * scale, 3 * scale, 0, TAU); ctx.fill();
    } else {
      const ahead = project(shot.x + shot.vx * 0.07, shot.z + shot.vz * 0.07, shot.y);
      const angle = Math.atan2(ahead.y - p.y, ahead.x - p.x);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle); ctx.strokeStyle = "#774625"; ctx.lineWidth = 3 * scale; ctx.beginPath(); ctx.moveTo(-15 * scale, 0); ctx.lineTo(15 * scale, 0); ctx.stroke(); ctx.fillStyle = "#e6edf2"; ctx.beginPath(); ctx.moveTo(18 * scale, 0); ctx.lineTo(10 * scale, -5 * scale); ctx.lineTo(10 * scale, 5 * scale); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

  function drawPlayer(player) {
    const scale = isoScale();
    const ground = groundHeight(player.x, player.z) ?? player.y;
    const shadow = project(player.x, player.z, ground + 0.02);
    ctx.save();
    ctx.fillStyle = "rgba(25,20,44,.24)";
    ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y, (player.knocked ? 31 : 18) * scale, (player.knocked ? 10 : 8) * scale, 0, 0, TAU); ctx.fill();
    ctx.restore();
    if (player.knocked) drawRagdoll(player);
    else drawUprightPlayer(player);
  }

  function drawUprightPlayer(player) {
    const scale = isoScale();
    const bob = Math.abs(Math.sin(player.walk)) * 4.5 * player.moveAmount;
    const wobble = Math.sin(player.walk * 0.52 + player.index) * 0.085 * (0.25 + player.moveAmount);
    const p = project(player.x, player.z, player.y + 0.15);
    const facingEnd = project(player.x + player.facingX, player.z + player.facingZ, player.y);
    const facingAngle = Math.atan2(facingEnd.y - p.y, facingEnd.x - p.x);
    const legSwing = Math.sin(player.walk) * 8 * player.moveAmount;
    const armSwing = -Math.sin(player.walk) * 13 * player.moveAmount;
    ctx.save();
    ctx.translate(p.x, p.y - bob * scale);
    ctx.rotate(wobble);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.strokeStyle = shade(player.color, -35);
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(-7, -23); ctx.lineTo(-9 + legSwing * 0.45, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -23); ctx.lineTo(9 - legSwing * 0.45, 4); ctx.stroke();
    ctx.fillStyle = "#2b2340";
    ctx.beginPath(); ctx.ellipse(-10 + legSwing * 0.45, 5, 9, 5, 0, 0, TAU); ctx.ellipse(10 - legSwing * 0.45, 5, 9, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = shade(player.color, -18);
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(-16, -47); ctx.quadraticCurveTo(-26, -35 + armSwing * .4, -22, -19 + armSwing * .25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, -47); ctx.quadraticCurveTo(26, -35 - armSwing * .4, 22, -19 - armSwing * .25); ctx.stroke();
    const bodyGradient = ctx.createLinearGradient(-16, -60, 18, -20);
    bodyGradient.addColorStop(0, shade(player.color, 28)); bodyGradient.addColorStop(0.5, player.color); bodyGradient.addColorStop(1, shade(player.color, -24));
    ctx.fillStyle = bodyGradient;
    roundRectPath(-19, -64, 38, 48, 17); ctx.fill();
    ctx.strokeStyle = "rgba(39,26,58,.35)"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = shade(player.color, 24);
    ctx.beginPath(); ctx.ellipse(0, -73, 18, 20, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(39,26,58,.5)"; ctx.lineWidth = 2.5; ctx.stroke();
    const eyeShift = Math.cos(facingAngle) * 3;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(-6 + eyeShift, -77, 4.7, 6, 0, 0, TAU); ctx.ellipse(6 + eyeShift, -77, 4.7, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#21172f";
    ctx.beginPath(); ctx.arc(-5 + eyeShift, -76, 2.2, 0, TAU); ctx.arc(7 + eyeShift, -76, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#522b3d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -68, 5, 0.1, Math.PI - 0.1); ctx.stroke();
    drawHeldWeapon(player, facingAngle);
    if (player.blockedFlash > 0) {
      ctx.strokeStyle = `rgba(211,248,255,${player.blockedFlash * 2.8})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -44, 31, -1.3, 1.3); ctx.stroke();
    }
    ctx.restore();
    drawPlayerLabel(player, p.x, p.y - (90 + bob) * scale);
  }

  function drawHeldWeapon(player, facingAngle) {
    const weapon = currentWeapon(player);
    if (!weapon) return;
    ctx.save();
    ctx.rotate(facingAngle * 0.24);
    if (weapon === "cannon") {
      ctx.fillStyle = "#24212b"; roundRectPath(10, -54, 34, 13, 6); ctx.fill();
      ctx.fillStyle = "#0e0c12"; ctx.beginPath(); ctx.arc(43, -47.5, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = "#6d462b"; ctx.fillRect(12, -38, 19, 5);
    } else if (weapon === "sword") {
      ctx.rotate(player.attackFlash > 0 ? -1.1 : -0.25); ctx.fillStyle = "#e8f6ff"; ctx.fillRect(18, -80, 6, 47); ctx.fillStyle = "#75cdeb"; ctx.fillRect(20, -78, 2, 42); ctx.fillStyle = "#ffd64d"; ctx.fillRect(10, -37, 23, 6);
    } else if (weapon === "shield") {
      ctx.fillStyle = "#55bced"; ctx.beginPath(); ctx.moveTo(25, -67); ctx.quadraticCurveTo(48, -59, 40, -30); ctx.quadraticCurveTo(25, -17, 10, -30); ctx.quadraticCurveTo(2, -59, 25, -67); ctx.fill(); ctx.strokeStyle = "#e7f8ff"; ctx.lineWidth = 3; ctx.stroke();
    } else if (weapon === "bow") {
      ctx.strokeStyle = "#86502d"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(23, -48, 19, -1.25, 1.25); ctx.stroke(); ctx.strokeStyle = "#fff2d1"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(29, -66); ctx.lineTo(29, -30); ctx.stroke();
    }
    ctx.restore();
  }

  function drawRagdoll(player) {
    const scale = isoScale();
    const p = project(player.x, player.z, player.y + 0.04);
    const angle = Math.atan2(player.vz || player.facingZ, player.vx || player.facingX) * 0.45 + Math.sin(player.walk) * 0.18;
    ctx.save(); ctx.translate(p.x, p.y - 5 * scale); ctx.rotate(angle); ctx.scale(scale, scale); ctx.lineCap = "round";
    ctx.strokeStyle = shade(player.color, -25); ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-30, 14); ctx.moveTo(7, 1); ctx.lineTo(27, 18); ctx.moveTo(-10, -7); ctx.lineTo(-29, -19); ctx.moveTo(11, -7); ctx.lineTo(34, -12); ctx.stroke();
    ctx.fillStyle = player.color; roundRectPath(-20, -17, 42, 26, 13); ctx.fill(); ctx.strokeStyle = "rgba(35,24,49,.45)"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = shade(player.color, 24); ctx.beginPath(); ctx.ellipse(25, -5, 16, 15, 0.2, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(35,24,49,.5)"; ctx.stroke();
    ctx.strokeStyle = "#281b35"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(20, -9); ctx.lineTo(25, -4); ctx.moveTo(25, -9); ctx.lineTo(20, -4); ctx.moveTo(29, -8); ctx.lineTo(34, -3); ctx.moveTo(34, -8); ctx.lineTo(29, -3); ctx.stroke();
    ctx.restore();
    const stars = Math.min(3, Math.ceil(player.knockoutTimer));
    ctx.fillStyle = "#ffe356"; ctx.font = `900 ${16 * scale}px system-ui`; ctx.textAlign = "center";
    for (let i = 0; i < stars; i++) ctx.fillText("★", p.x + Math.cos(state.time * 3 + i * 2.1) * 26 * scale, p.y - (28 + Math.sin(state.time * 4 + i) * 5) * scale);
    drawPlayerLabel(player, p.x, p.y - 42 * scale, "UTSLAGEN");
  }

  function drawPlayerLabel(player, x, y, extra = "") {
    const scale = isoScale();
    ctx.save();
    ctx.font = `900 ${player.human ? 12 : 9.5}px system-ui`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const label = player.human ? "DU · AGUST" : player.name;
    const width = ctx.measureText(label).width + 14 * scale;
    ctx.fillStyle = player.human ? "#fff4a3" : "rgba(35,24,57,.72)";
    roundRectPath(x - width / 2, y - 9 * scale, width, 18 * scale, 7 * scale); ctx.fill();
    ctx.fillStyle = player.human ? "#392350" : "#fff"; ctx.fillText(label, x, y);
    if (extra) { ctx.fillStyle = "#ffef64"; ctx.font = `900 ${8 * scale}px system-ui`; ctx.fillText(extra, x, y + 13 * scale); }
    ctx.restore();
  }

  function drawParticles() {
    for (const particle of state.particles) {
      const p = project(particle.x, particle.z, particle.y);
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, particle.size * 35 * isoScale()), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    const human = state.players[0];
    if (!human || state.screen === "menu" || state.screen === "maps") return;
    const scale = clamp(state.view.w / 1280, 0.75, 1.1);
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(35,20,70,.84)"; roundRectPath(18, 18, 310 * scale, 68 * scale, 18 * scale); ctx.fill();
    ctx.fillStyle = "#ffe45b"; ctx.font = `1000 ${19 * scale}px system-ui`; ctx.fillText(`${MODE_NAMES[state.mode]} · ${MAP_NAMES[state.map]}`, 37, 42 * scale);
    ctx.fillStyle = "#fff"; ctx.font = `800 ${13 * scale}px system-ui`;
    const active = state.players.filter((player) => !player.eliminated).length;
    ctx.fillText(state.map === "platform" ? `${active}/10 KVAR` : `DU + 9 BOTTAR`, 37, 67 * scale);
    if (state.mode === "free") {
      const weapon = currentWeapon(human);
      const hudWidth = 270 * scale;
      ctx.fillStyle = "rgba(35,20,70,.84)"; roundRectPath(state.view.w - hudWidth - 18, 18, hudWidth, 68 * scale, 18 * scale); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `900 ${16 * scale}px system-ui`; ctx.textAlign = "right"; ctx.fillText(WEAPON_NAMES[weapon] || "INGET VAPEN", state.view.w - 38, 42 * scale);
      ctx.fillStyle = "#ffdf56"; ctx.font = `800 ${12 * scale}px system-ui`;
      const detail = weapon === "sword" ? `TRÄFFAR PÅ DIG: ${human.swordHits}/3` : (weapon === "bow" || weapon === "cannon") ? "OÄNDLIG AMMUNITION" : "BLOCKERAR SVÄRD + PILAR";
      ctx.fillText(detail, state.view.w - 38, 67 * scale);
    }
    if (state.map === "castle") {
      ctx.textAlign = "center"; ctx.fillStyle = state.bridgeOpen ? "rgba(47,183,101,.9)" : "rgba(120,71,46,.88)"; roundRectPath(state.view.w / 2 - 110 * scale, 20, 220 * scale, 38 * scale, 13 * scale); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `900 ${13 * scale}px system-ui`; ctx.fillText(state.bridgeOpen ? "VINDBRYGGAN ÄR ÖPPEN" : "HITTA KNAPPEN ELLER HEMLIGA VÄGEN", state.view.w / 2, 39 * scale);
    }
    if (state.screen === "playing" && !state.roundOver) {
      ctx.textAlign = "center"; ctx.fillStyle = "rgba(28,18,50,.72)"; roundRectPath(state.view.w / 2 - 195 * scale, state.view.h - 49 * scale, 390 * scale, 31 * scale, 12 * scale); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `800 ${11.5 * scale}px system-ui`;
      const moveHint = window.matchMedia("(pointer: coarse)").matches ? "SPAK: GÅ" : "WASD/PILAR: GÅ";
      ctx.fillText(state.mode === "free" ? `${moveHint} · SPACE/J: ANFALL · E: ANVÄND · Q: BYT` : `${moveHint} · E: KÖR/HOPPA UR`, state.view.w / 2, state.view.h - 33 * scale);
    }
    ctx.restore();
  }

  function roundRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function render() {
    const { w, h, dpr } = state.view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawBackdrop();
    if (state.map && !["menu", "maps"].includes(state.screen)) {
      drawMap();
      drawEntities();
      drawHud();
    } else {
      ctx.fillStyle = "#24145f";
      ctx.fillRect(0, 0, w, h);
    }
  }

  function ensureAudio() {
    if (!state.sound) return;
    if (!audio) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      audio = new AudioCtor();
    }
    if (audio.state === "suspended") audio.resume().catch(() => {});
    updateMusic();
  }

  function playTone(frequency, duration, volume = 0.035, type = "square", slideTo = null, delay = 0) {
    if (!state.sound || !audio || audio.state === "closed") return;
    const now = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function sfx(name) {
    if (!state.sound || !audio) return;
    if (name === "select" || name === "cycle") { playTone(520, 0.08, 0.025, "square", 710); }
    else if (name === "pause") playTone(360, 0.12, 0.03, "triangle", 230);
    else if (name === "hop") playTone(430, 0.12, 0.03, "sine", 720);
    else if (name === "pickup") { playTone(620, 0.1, 0.04, "square", 920); playTone(880, 0.12, 0.025, "square", 1180, 0.07); }
    else if (name === "car") playTone(120, 0.18, 0.045, "sawtooth", 210);
    else if (name === "crash") { playTone(92, 0.35, 0.085, "sawtooth", 38); playTone(240, 0.16, 0.04, "square", 70); }
    else if (name === "swing") playTone(290, 0.13, 0.032, "sawtooth", 650);
    else if (name === "hit") playTone(150, 0.12, 0.055, "square", 75);
    else if (name === "block") playTone(850, 0.14, 0.045, "triangle", 1220);
    else if (name === "bow") playTone(510, 0.1, 0.026, "triangle", 170);
    else if (name === "cannon") { playTone(82, 0.42, 0.095, "sawtooth", 34); playTone(55, 0.3, 0.05, "square", 28); }
    else if (name === "knockout") { playTone(180, 0.18, 0.065, "square", 65); playTone(520, 0.25, 0.025, "sine", 180, 0.08); }
    else if (name === "splash") playTone(260, 0.3, 0.035, "sine", 75);
    else if (name === "bridge") { playTone(110, 0.55, 0.045, "sawtooth", 70); playTone(330, 0.18, 0.03, "square", 520, 0.42); }
    else if (name === "fall") playTone(420, 0.6, 0.045, "sine", 55);
    else if (name === "win") { [523, 659, 784, 1047].forEach((note, index) => playTone(note, 0.28, 0.04, "square", null, index * 0.12)); }
    else if (name === "round") { playTone(330, 0.25, 0.04, "triangle", 220); playTone(220, 0.4, 0.035, "triangle", 110, 0.2); }
  }

  function updateMusic() {
    if (!state.sound || !audio) {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      return;
    }
    if (musicTimer) return;
    let beat = 0;
    const melody = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587];
    musicTimer = setInterval(() => {
      if (!state.sound || !audio || document.hidden || state.screen === "paused") return;
      const note = melody[beat % melody.length];
      playTone(note, 0.13, state.screen === "menu" || state.screen === "maps" ? 0.018 : 0.011, "square");
      if (beat % 2 === 0) playTone(110 + (beat % 4) * 15, 0.08, 0.018, "triangle", 80);
      if (beat % 4 === 0) playTone(65, 0.11, 0.025, "sine", 48);
      beat++;
    }, 185);
  }

  function toggleSound() {
    state.sound = !state.sound;
    if (ui.soundButton) {
      ui.soundButton.setAttribute("aria-pressed", String(!state.sound));
      ui.soundButton.setAttribute("aria-label", state.sound ? "Stäng av ljudet" : "Sätt på ljudet");
      ui.soundButton.classList.toggle("is-muted", !state.sound);
    }
    if (state.sound) { ensureAudio(); sfx("select"); }
    else updateMusic();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await ($("#game-shell") || canvas).requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch (_) {
      showToast("Helskärm kunde inte öppnas.", 1100);
    }
    resizeCanvas();
  }

  function getDebugState() {
    return {
      screen: state.screen,
      mode: state.mode,
      modeName: state.mode ? MODE_NAMES[state.mode] : null,
      map: state.map,
      mapName: state.map ? MAP_NAMES[state.map] : null,
      paused: state.paused,
      roundOver: state.roundOver,
      winner: state.winner,
      time: rounded(state.roundTime),
      coordinateSystem: "Världskoordinater: x ökar åt sydost på skärmen, z ökar åt sydväst, y är höjd uppåt.",
      playerCount: state.players.length,
      aliveCount: state.players.filter((player) => !player.eliminated).length,
      bridgeOpen: state.bridgeOpen,
      input: {
        joystick: { x: rounded(touchStick.x), y: rounded(touchStick.y), active: touchStick.pointerId !== null },
      },
      players: state.players.map((player) => ({
        index: player.index,
        name: player.name,
        human: player.human,
        bot: !player.human,
        x: rounded(player.x), z: rounded(player.z), y: rounded(player.y),
        vx: rounded(player.vx), vz: rounded(player.vz),
        facing: { x: rounded(player.facingX), z: rounded(player.facingZ) },
        alive: player.alive,
        knocked: player.knocked,
        knockoutSeconds: rounded(Math.max(0, player.knockoutTimer)),
        eliminated: player.eliminated,
        weapon: currentWeapon(player),
        inventory: [...player.inventory],
        swordHits: player.swordHits,
        inCar: player.inCar,
        score: player.score,
      })),
      cars: state.cars.map((car) => ({ id: car.id, x: rounded(car.x), z: rounded(car.z), speed: rounded(Math.hypot(car.vx, car.vz)), driver: car.driver, broken: car.broken })),
      pickups: state.pickups.map((pickup) => ({ id: pickup.id, type: pickup.type, x: pickup.x, z: pickup.z, takenBy: pickup.takenBy })),
      projectiles: state.projectiles.map((shot) => ({ type: shot.type, owner: shot.owner, x: rounded(shot.x), z: rounded(shot.z), y: rounded(shot.y) })),
    };
  }

  function renderGameToText() {
    return JSON.stringify(getDebugState());
  }

  function animationFrame(now) {
    const elapsed = Math.min(0.08, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    accumulator += elapsed;
    while (accumulator >= FIXED_STEP) {
      update(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
    render();
    rafId = requestAnimationFrame(animationFrame);
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (milliseconds) => {
    const safeMs = clamp(Number(milliseconds) || 0, 0, 120000);
    const steps = Math.max(1, Math.round(safeMs / (FIXED_STEP * 1000)));
    for (let i = 0; i < steps; i++) update(FIXED_STEP);
    lastFrameTime = performance.now();
    accumulator = 0;
    render();
    return getDebugState();
  };

  window.__partyGameDebug = Object.freeze({
    start(mode, map) { return startGame(mode, map); },
    knockOut(targetIndex, sourceIndex = null) {
      const target = state.players[targetIndex];
      const source = sourceIndex === null ? null : state.players[sourceIndex];
      if (target) target.invulnerable = 0;
      const result = knockOut(target, source, "cannonball");
      render();
      return { result, state: getDebugState() };
    },
    hitSword(targetIndex, sourceIndex = 0) {
      const target = state.players[targetIndex];
      const source = state.players[sourceIndex];
      if (target) target.invulnerable = 0;
      const result = applySwordHit(target, source);
      render();
      return { result, state: getDebugState() };
    },
    fireWeapon(playerIndex = 0) {
      const player = state.players[playerIndex];
      if (player) player.attackCooldown = 0;
      const result = attack(player);
      render();
      return { result, state: getDebugState() };
    },
    enterNearestCar() {
      const human = state.players[0];
      if (!human || state.map !== "city") return { result: false, state: getDebugState() };
      const car = nearestCar(human, false);
      if (car && distSq(human, car) > 7) { human.x = car.x + 1.4; human.z = car.z; }
      const result = enterCar(human, car);
      render();
      return { result, state: getDebugState() };
    },
    damageCar() {
      const human = state.players[0];
      const car = human?.inCar !== null && human?.inCar !== undefined ? state.cars[human.inCar] : nearestCar(human || { x: 0, z: 0 }, true);
      breakCar(car);
      render();
      return { result: Boolean(car?.broken), state: getDebugState() };
    },
    getState() { return getDebugState(); },
  });

  bindInput();
  resizeCanvas();
  showMenu();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(animationFrame);
})();
