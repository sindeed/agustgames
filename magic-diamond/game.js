(function () {
  "use strict";

  var canvas = document.getElementById("game");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var gameFrame = document.getElementById("game-frame");
  var startScreen = document.getElementById("start-screen");
  var pauseScreen = document.getElementById("pause-screen");
  var victoryScreen = document.getElementById("victory-screen");
  var victoryStats = document.getElementById("victory-stats");
  var startButton = document.getElementById("start-btn");
  var resumeButton = document.getElementById("resume-btn");
  var replayButton = document.getElementById("replay-btn");
  var soundButton = document.getElementById("sound-btn");
  var mapButton = document.getElementById("map-btn");
  var fullscreenButton = document.getElementById("fullscreen-btn");

  var VIEW_W = canvas.width;
  var VIEW_H = canvas.height;
  var WORLD_W = 3840;
  var WORLD_H = 2400;
  var STEP_MS = 1000 / 60;
  var PLAYER_RADIUS = 18;
  var MAGIC_RANGE = 148;
  var MAX_FOOD = 6;
  var MAX_APPLES = 5;
  var MAX_RAINBOW_FISH = 3;
  var STARTING_HEARTS = 3;
  var MAX_HEARTS = 8;
  var FP_FOV = 70 * Math.PI / 180;
  var FP_NEAR = 12;
  var FP_FAR = 1150;
  var FP_HORIZON = 246;
  var FP_PROJECTION = VIEW_W / (2 * Math.tan(FP_FOV / 2));
  var FP_RAY_STRIDE = 3;
  var fpGroundCanvas = document.createElement("canvas");
  fpGroundCanvas.width = 120;
  fpGroundCanvas.height = 48;
  var fpGroundContext = fpGroundCanvas.getContext("2d");
  var FP_TERRAIN_W = 192;
  var FP_TERRAIN_H = 120;
  var fpTerrainPixels = null;
  var fpDepthBuffer = new Float32Array(VIEW_W);
  var keys = new Set();
  var state = null;
  var manualTime = false;
  var manualAccumulator = 0;
  var realAccumulator = 0;
  var lastFrameTime = performance.now();
  var effectSeed = 987654321;
  var soundEnabled = true;
  var audioContext = null;
  var selectedCharacter = "girl";
  var prefersReducedMotion = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function distanceXY(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function seededRandomFactory(seed) {
    var value = seed >>> 0;
    return function () {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function effectRandom() {
    effectSeed = (Math.imul(effectSeed, 1664525) + 1013904223) >>> 0;
    return effectSeed / 4294967296;
  }

  function riverX(y) {
    return 1840 + Math.sin(y / 274) * 154 + Math.sin(y / 91) * 22;
  }

  var bridges = [
    { id: "moon_bridge", x: riverX(720), y: 720, w: 324, h: 112 },
    { id: "old_bridge", x: riverX(1700), y: 1700, w: 324, h: 112 }
  ];
  var rainbowFishSpots = [
    { id: "rainbow_fish_1", x: riverX(585), y: 585, caught: false, phase: 0.4 },
    { id: "rainbow_fish_2", x: riverX(1575), y: 1575, caught: false, phase: 2.2 },
    { id: "rainbow_fish_3", x: riverX(2050), y: 2050, caught: false, phase: 4.1 }
  ];

  var wizard = { x: 520, y: 1950, r: 28, name: "Aster" };
  var castle = { x: 200, y: 180, w: 720, h: 600, name: "Shadowkeep Castle" };
  var castleWalls = [
    { x: 200, y: 180, w: 720, h: 64 },
    { x: 200, y: 180, w: 64, h: 600 },
    { x: 856, y: 180, w: 64, h: 600 },
    { x: 200, y: 716, w: 268, h: 64 },
    { x: 652, y: 716, w: 268, h: 64 }
  ];
  var secretRoomWalls = [
    { x: 630, y: 260, w: 210, h: 28 },
    { x: 630, y: 490, w: 210, h: 28 },
    { x: 812, y: 260, w: 28, h: 258 },
    { x: 630, y: 260, w: 28, h: 80 },
    { x: 630, y: 420, w: 28, h: 98 }
  ];
  var secretDoor = { x: 630, y: 340, w: 28, h: 80 };
  var royalFoods = [
    { id: "royal_roast", x: 716, y: 330, icon: "🍗", collected: false },
    { id: "castle_cheese", x: 770, y: 384, icon: "🧀", collected: false },
    { id: "berry_pie", x: 712, y: 450, icon: "🥧", collected: false }
  ];
  var thornGate = { x: 2534, y: 654, w: 82, h: 292 };
  var cliffs = [
    { x: 2485, y: 0, w: 184, h: 620 },
    { x: 2485, y: 980, w: 184, h: 1420 }
  ];
  var ancientTrees = [
    { id: "whisper_tree", x: 1040, y: 880, r: 54, found: false, label: "Whisper Tree" },
    { id: "river_tree", x: 2205, y: 1550, r: 54, found: false, label: "River Tree" }
  ];
  var crystals = [
    { id: "dawn_crystal", x: 2910, y: 850, lit: false, color: "#8ff7ff" },
    { id: "echo_crystal", x: 3200, y: 1510, lit: false, color: "#dca8ff" },
    { id: "moon_crystal", x: 3500, y: 760, lit: false, color: "#9db8ff" }
  ];
  var diamond = { x: 3515, y: 322, collected: false };
  var portal = { x: 3405, y: 485, active: false };
  var treasureMap = { x: 560, y: 430, available: false, collected: false };
  var WEAPON_ORDER = ["sword", "bow", "spear", "rod"];
  var WEAPON_INFO = {
    sword: { name: "Sword", icon: "⚔", cooldown: 420, range: 90, damage: 2 },
    bow: { name: "Bow", icon: "🏹", cooldown: 560, range: 590, damage: 1 },
    spear: { name: "Spear", icon: "🔱", cooldown: 680, range: 142, damage: 3 },
    rod: { name: "Fishing Rod", icon: "🎣", cooldown: 820, range: 210, damage: 0 }
  };
  var weaponPickups = [
    { id: "sword", x: 350, y: 470, collected: false },
    { id: "bow", x: 1130, y: 800, collected: false },
    { id: "spear", x: 3000, y: 1250, collected: false }
  ];

  var routePaths = [
    [
      { x: 360, y: 2020 }, { x: 520, y: 1950 }, { x: 860, y: 1800 },
      { x: 1360, y: 1710 }, { x: bridges[1].x, y: 1700 }, { x: 2205, y: 1550 }
    ],
    [
      { x: 720, y: 1870 }, { x: 800, y: 1480 }, { x: 930, y: 1140 }, { x: 1040, y: 880 }
    ],
    [
      { x: 1040, y: 880 }, { x: 850, y: 780 }, { x: 560, y: 750 }, { x: 560, y: 430 }
    ],
    [
      { x: 1040, y: 880 }, { x: 1420, y: 760 }, { x: bridges[0].x, y: 720 },
      { x: 2250, y: 760 }, { x: 2575, y: 800 }
    ],
    [
      { x: 2205, y: 1550 }, { x: 2290, y: 1230 }, { x: 2280, y: 870 }, { x: 2575, y: 800 }
    ],
    [
      { x: 2600, y: 800 }, { x: 2910, y: 850 }, { x: 3090, y: 1120 },
      { x: 3200, y: 1510 }
    ],
    [
      { x: 2910, y: 850 }, { x: 3240, y: 810 }, { x: 3500, y: 760 },
      { x: 3520, y: 520 }, { x: 3515, y: 322 }
    ]
  ];

  function distanceToSegment(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return distanceXY(px, py, ax, ay);
    var t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
    return distanceXY(px, py, ax + t * dx, ay + t * dy);
  }

  function distanceToRoutes(x, y) {
    var best = Infinity;
    for (var p = 0; p < routePaths.length; p += 1) {
      for (var i = 0; i < routePaths[p].length - 1; i += 1) {
        var a = routePaths[p][i];
        var b = routePaths[p][i + 1];
        best = Math.min(best, distanceToSegment(x, y, a.x, a.y, b.x, b.y));
      }
    }
    return best;
  }

  function buildWorldObjects() {
    var random = seededRandomFactory(120719);
    var trees = [];
    var attempts = 0;
    while (trees.length < 155 && attempts < 1300) {
      attempts += 1;
      var x = 250 + random() * 2200;
      var y = 170 + random() * 2070;
      var r = 34 + random() * 15;
      if (x > 130 && x < 990 && y > 110 && y < 850) continue;
      if (x < 760 && y > 1640) continue;
      if (Math.abs(x - riverX(y)) < 122) continue;
      if (distanceToRoutes(x, y) < 105) continue;
      if (distanceXY(x, y, wizard.x, wizard.y) < 170) continue;
      if (ancientTrees.some(function (tree) { return distanceXY(x, y, tree.x, tree.y) < 145; })) continue;
      if (trees.some(function (tree) { return distanceXY(x, y, tree.x, tree.y) < r + tree.r + 12; })) continue;
      trees.push({
        x: x,
        y: y,
        r: r,
        collisionR: r * 0.52,
        tint: random(),
        shape: Math.floor(random() * 3)
      });
    }

    var rocks = [];
    attempts = 0;
    while (rocks.length < 76 && attempts < 1000) {
      attempts += 1;
      var rx = 2700 + random() * 1020;
      var ry = 130 + random() * 2140;
      var rr = 25 + random() * 25;
      if (distanceToRoutes(rx, ry) < 112) continue;
      if (crystals.some(function (crystal) { return distanceXY(rx, ry, crystal.x, crystal.y) < 130; })) continue;
      if (distanceXY(rx, ry, diamond.x, diamond.y) < 175) continue;
      if (rocks.some(function (rock) { return distanceXY(rx, ry, rock.x, rock.y) < rr + rock.r + 10; })) continue;
      rocks.push({ x: rx, y: ry, r: rr, tint: random(), shape: Math.floor(random() * 3) });
    }

    var decorations = [];
    for (var d = 0; d < 520; d += 1) {
      var dx = 35 + random() * (WORLD_W - 70);
      var dy = 35 + random() * (WORLD_H - 70);
      if (Math.abs(dx - riverX(dy)) < 92) continue;
      decorations.push({
        x: dx,
        y: dy,
        size: 2 + random() * 4,
        kind: dx > 2670 ? "stone" : (random() < 0.28 ? "flower" : "grass"),
        tint: random()
      });
    }

    return { trees: trees, rocks: rocks, decorations: decorations };
  }

  var worldObjects = buildWorldObjects();
  var trees = worldObjects.trees;
  var rocks = worldObjects.rocks;
  var decorations = worldObjects.decorations;

  var monsterBlueprints = [
    { id: "boswer", type: "boswer", x: 560, y: 430, hp: 8, speed: 66, phase: 3.8 },
    { id: "m1", type: "hornling", x: 860, y: 1370, hp: 2, speed: 92, phase: 0.2 },
    { id: "m2", type: "maw", x: 1120, y: 590, hp: 3, speed: 76, phase: 1.7 },
    { id: "m3", type: "crawler", x: 1300, y: 1210, hp: 2, speed: 105, phase: 2.4 },
    { id: "m4", type: "hornling", x: 1510, y: 1960, hp: 2, speed: 92, phase: 3.2 },
    { id: "m5", type: "maw", x: 2140, y: 1840, hp: 3, speed: 76, phase: 4.1 },
    { id: "m6", type: "crawler", x: 2120, y: 1180, hp: 2, speed: 106, phase: 0.8 },
    { id: "m7", type: "hornling", x: 2280, y: 500, hp: 2, speed: 94, phase: 5.2 },
    { id: "m8", type: "maw", x: 2780, y: 1160, hp: 3, speed: 80, phase: 1.1 },
    { id: "m9", type: "crawler", x: 2980, y: 540, hp: 2, speed: 110, phase: 2.1 },
    { id: "m10", type: "hornling", x: 3060, y: 1760, hp: 2, speed: 96, phase: 3.6 },
    { id: "m11", type: "maw", x: 3350, y: 1260, hp: 3, speed: 82, phase: 4.6 },
    { id: "m12", type: "crawler", x: 3570, y: 960, hp: 2, speed: 112, phase: 5.8 },
    { id: "m13", type: "hornling", x: 3230, y: 420, hp: 2, speed: 96, phase: 2.8 },
    { id: "m14", type: "maw", x: 3700, y: 1940, hp: 3, speed: 82, phase: 0.4 }
  ];

  var horseBlueprints = [
    { id: "ember", name: "Ember", x: 820, y: 2090, color: "#a96336", mane: "#4a2b20", phase: 0.4 },
    { id: "mist", name: "Mist", x: 2180, y: 1900, color: "#d7d5c9", mane: "#72727b", phase: 2.2 },
    { id: "night", name: "Night", x: 2860, y: 2020, color: "#3e414b", mane: "#151821", phase: 4.5 }
  ];
  var villagerBlueprints = [
    {
      id: "lina", name: "Lina", x: 720, y: 1870, color: "#d96d67", hair: "#5d3528", phase: 0.5,
      text: "Silver River is safe to swim, but the current slows you down. Horses should use the bridges."
    },
    {
      id: "tor", name: "Tor", x: 930, y: 1140, color: "#d49b46", hair: "#3f3027", phase: 1.4,
      text: "I saw a bow shining below the old rune tree. Wake the tree with magic and look nearby."
    },
    {
      id: "pip", name: "Pip", x: 1320, y: 1700, color: "#5d93b8", hair: "#b4773e", phase: 2.5,
      text: "Rainbow fish gather near the bridges. A fishing rod can reach them from the riverbank."
    },
    {
      id: "mira", name: "Mira", x: 2240, y: 760, color: "#806bb4", hair: "#2d2828", phase: 3.7,
      text: "Boswer guards a stolen map inside Shadowkeep Castle. The map reveals Crystal Hollow."
    },
    {
      id: "orin", name: "Orin", x: 2860, y: 850, color: "#6c9870", hair: "#d0c4aa", phase: 4.6,
      text: "A spear lies on Moonstone Mountain. Watch the sky: tornadoes form only in the heaviest rain."
    },
    {
      id: "bea", name: "Bea", x: 560, y: 690, color: "#b55a82", hair: "#c2914f", phase: 5.4,
      text: "The castle walls hide more than Boswer. A cracked wall may open when struck by Spark Magic."
    }
  ];

  (function clearBlueprintSpawnAreas() {
    var positions = monsterBlueprints.concat(horseBlueprints).concat(villagerBlueprints);
    for (var i = trees.length - 1; i >= 0; i -= 1) {
      if (positions.some(function (item) {
        return distanceXY(trees[i].x, trees[i].y, item.x, item.y) < trees[i].collisionR + 48;
      })) trees.splice(i, 1);
    }
    for (var r = rocks.length - 1; r >= 0; r -= 1) {
      if (positions.some(function (item) {
        return distanceXY(rocks[r].x, rocks[r].y, item.x, item.y) < rocks[r].r * 0.72 + 52;
      })) rocks.splice(r, 1);
    }
  }());

  function makeMonsters() {
    return monsterBlueprints.map(function (m) {
      return {
        id: m.id,
        type: m.type,
        x: m.x,
        y: m.y,
        homeX: m.x,
        homeY: m.y,
        hp: m.hp,
        maxHp: m.hp,
        speed: m.speed,
        phase: m.phase,
        r: m.type === "boswer" ? 38 : (m.type === "maw" ? 24 : 21),
        mode: "patrol",
        defeated: false,
        hurtUntil: 0,
        biteReadyAt: 0,
        facingX: 1,
        facingY: 0
      };
    });
  }

  function makeHorses() {
    return horseBlueprints.map(function (horse) {
      return {
        id: horse.id,
        name: horse.name,
        x: horse.x,
        y: horse.y,
        homeX: horse.x,
        homeY: horse.y,
        color: horse.color,
        mane: horse.mane,
        phase: horse.phase,
        fed: false,
        mounted: false,
        facingX: 1,
        facingY: 0
      };
    });
  }

  function makeVillagers() {
    return villagerBlueprints.map(function (villager) {
      return {
        id: villager.id,
        name: villager.name,
        x: villager.x,
        y: villager.y,
        homeX: villager.x,
        homeY: villager.y,
        color: villager.color,
        hair: villager.hair,
        phase: villager.phase,
        text: villager.text,
        facingX: 1,
        facingY: 0
      };
    });
  }

  function resetQuestObjects() {
    ancientTrees.forEach(function (tree) { tree.found = false; });
    crystals.forEach(function (crystal) { crystal.lit = false; });
    diamond.collected = false;
    portal.active = false;
    treasureMap.x = 560;
    treasureMap.y = 430;
    treasureMap.available = false;
    treasureMap.collected = false;
    rainbowFishSpots.forEach(function (fish) { fish.caught = false; });
    weaponPickups.forEach(function (pickup) { pickup.collected = false; });
    royalFoods.forEach(function (food) { food.collected = false; });
  }

  function createState(mode) {
    resetQuestObjects();
    effectSeed = 987654321;
    return {
      mode: mode || "title",
      mapOpen: false,
      timeMs: 0,
      questStage: "meet_wizard",
      objective: "Talk to Aster in the glowing grove",
      gateCleared: false,
      sealOpen: false,
      secretRoomOpen: false,
      player: {
        x: 355,
        y: 2030,
        character: selectedCharacter,
        viewAngle: 0,
        facingX: 1,
        facingY: 0,
        moving: false,
        hearts: STARTING_HEARTS,
        maxHearts: MAX_HEARTS,
        food: 0,
        apples: 0,
        rainbowFish: 0,
        hasMagic: false,
        magicReadyAt: 0,
        strongPowerUntil: 0,
        superSpeedUntil: 0,
        swimming: false,
        weapons: { sword: false, bow: false, spear: false, rod: false },
        selectedWeapon: null,
        weaponReadyAt: 0,
        invulnerableUntil: 0,
        checkpointX: 355,
        checkpointY: 2030
      },
      camera: { x: 0, y: 0 },
      monsters: makeMonsters(),
      horses: makeHorses(),
      villagers: makeVillagers(),
      mountedHorseId: null,
      foodDrops: [],
      arrows: [],
      weaponEffects: [],
      magicWaves: [],
      particles: [],
      dialog: null,
      toast: "",
      toastUntil: 0,
      area: "Sunlit Grove",
      areaBanner: "Sunlit Grove",
      areaBannerUntil: 2500,
      monstersDefeated: 0,
      horsesFed: 0,
      diamondCollected: false,
      boswerDefeated: false,
      hasMap: false,
      weather: {
        raining: false,
        targetIntensity: 0,
        intensity: 0,
        nextChangeAt: 28000,
        cycle: 0,
        wind: 0.35,
        tornado: {
          phase: "idle",
          stormCycle: -1,
          x: 0,
          y: 0,
          warningUntil: 0,
          activeUntil: 0
        }
      },
      rideDustReadyAt: 0
    };
  }

  function syncCamera() {
    state.camera.x = clamp(state.player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    state.camera.y = clamp(state.player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode !== "playing") {
      state.mapOpen = false;
      mapButton.textContent = "🗺️";
      mapButton.setAttribute("aria-label", "Open world map");
      releasePointerLock();
    }
    document.body.classList.toggle("map-open", state.mapOpen);
    startScreen.classList.toggle("hidden", mode !== "title");
    pauseScreen.classList.toggle("hidden", mode !== "paused");
    victoryScreen.classList.toggle("hidden", mode !== "victory");
    if (mode !== "playing") keys.clear();
  }

  function startNewGame() {
    state = createState("playing");
    mapButton.textContent = "🗺️";
    mapButton.setAttribute("aria-label", "Open world map");
    syncCamera();
    setMode("playing");
    showToast("FIRST PERSON • Click to look • W/S walk • E talks", 4.2);
    unlockAudio();
    playTone(392, 0.12, "sine", 0.05);
    canvas.focus();
    render();
  }

  function togglePause() {
    if (state.mode === "playing") {
      setMode("paused");
      render();
    } else if (state.mode === "paused") {
      setMode("playing");
      canvas.focus();
      render();
    }
  }

  function toggleWorldMap() {
    if (state.mode !== "playing" || state.dialog) return;
    state.mapOpen = !state.mapOpen;
    if (state.mapOpen) releasePointerLock();
    document.body.classList.toggle("map-open", state.mapOpen);
    keys.clear();
    mapButton.textContent = state.mapOpen ? "✕" : "🗺️";
    mapButton.setAttribute("aria-label", state.mapOpen ? "Close world map" : "Open world map");
    render();
  }

  function circleRectCollision(x, y, radius, rect) {
    var closestX = clamp(x, rect.x, rect.x + rect.w);
    var closestY = clamp(y, rect.y, rect.y + rect.h);
    return distanceXY(x, y, closestX, closestY) < radius;
  }

  function isOnBridge(x, y, radius) {
    return bridges.some(function (bridge) {
      return Math.abs(y - bridge.y) < bridge.h / 2 - Math.min(radius * 0.25, 6) &&
        Math.abs(x - bridge.x) < bridge.w / 2 + radius;
    });
  }

  function isInRiver(x, y, radius) {
    return !isOnBridge(x, y, radius || 0) && Math.abs(x - riverX(y)) < 62 + (radius || 0);
  }

  function isPlayerSwimming() {
    return !getMountedHorse() && isInRiver(state.player.x, state.player.y, 0);
  }

  function routeTargetAcrossRiver(actor, target) {
    var actorSide = Math.sign(actor.x - riverX(actor.y));
    var targetSide = Math.sign(target.x - riverX(target.y));
    var radius = actor.r || 20;
    var activeBridge = bridges.find(function (bridge) {
      return Math.abs(actor.y - bridge.y) < bridge.h / 2 &&
        Math.abs(actor.x - bridge.x) < bridge.w / 2 + radius + 8;
    });
    if (activeBridge) {
      var exitSide = targetSide || actorSide || 1;
      return {
        x: activeBridge.x + exitSide * (activeBridge.w / 2 + radius + 34),
        y: activeBridge.y
      };
    }
    if (actorSide === 0 || targetSide === 0 || actorSide === targetSide) {
      return target;
    }
    var bridge = bridges.slice().sort(function (a, b) {
      var aApproachX = a.x + actorSide * (a.w / 2 + radius + 34);
      var bApproachX = b.x + actorSide * (b.w / 2 + radius + 34);
      var aExitX = a.x + targetSide * (a.w / 2 + radius + 34);
      var bExitX = b.x + targetSide * (b.w / 2 + radius + 34);
      var aRoute = distanceXY(actor.x, actor.y, aApproachX, a.y) + distanceXY(target.x, target.y, aExitX, a.y);
      var bRoute = distanceXY(actor.x, actor.y, bApproachX, b.y) + distanceXY(target.x, target.y, bExitX, b.y);
      return aRoute - bRoute;
    })[0];
    var approach = {
      x: bridge.x + actorSide * (bridge.w / 2 + radius + 34),
      y: bridge.y
    };
    if (distanceXY(actor.x, actor.y, approach.x, approach.y) > 68) return approach;
    return { x: bridge.x, y: bridge.y };
  }

  function isBlocked(x, y, radius, movement) {
    var canSwim = Boolean(movement && movement.canSwim);
    if (x < radius + 18 || y < radius + 18 || x > WORLD_W - radius - 18 || y > WORLD_H - radius - 18) return true;
    if (!canSwim && !isOnBridge(x, y, radius) && Math.abs(x - riverX(y)) < 68 + radius) return true;

    for (var i = 0; i < trees.length; i += 1) {
      if (distanceXY(x, y, trees[i].x, trees[i].y) < radius + trees[i].collisionR) return true;
    }
    for (var a = 0; a < ancientTrees.length; a += 1) {
      if (distanceXY(x, y, ancientTrees[a].x, ancientTrees[a].y) < radius + 37) return true;
    }
    for (var r = 0; r < rocks.length; r += 1) {
      if (distanceXY(x, y, rocks[r].x, rocks[r].y) < radius + rocks[r].r * 0.72) return true;
    }
    for (var c = 0; c < cliffs.length; c += 1) {
      if (circleRectCollision(x, y, radius, cliffs[c])) return true;
    }
    for (var wall = 0; wall < castleWalls.length; wall += 1) {
      if (circleRectCollision(x, y, radius, castleWalls[wall])) return true;
    }
    for (var secretWall = 0; secretWall < secretRoomWalls.length; secretWall += 1) {
      if (circleRectCollision(x, y, radius, secretRoomWalls[secretWall])) return true;
    }
    if (!state.secretRoomOpen && circleRectCollision(x, y, radius, secretDoor)) return true;
    if (!state.gateCleared && circleRectCollision(x, y, radius, thornGate)) return true;
    if (!state.sealOpen && distanceXY(x, y, diamond.x, diamond.y) < 118 + radius) return true;
    return false;
  }

  function moveCircle(entity, dx, dy, radius, movement) {
    var startX = entity.x;
    var startY = entity.y;
    if (!isBlocked(entity.x + dx, entity.y, radius, movement)) entity.x += dx;
    if (!isBlocked(entity.x, entity.y + dy, radius, movement)) entity.y += dy;
    return Math.abs(entity.x - startX) > 0.001 || Math.abs(entity.y - startY) > 0.001;
  }

  function moveCircleWithSteering(entity, dx, dy, radius, movement) {
    if (moveCircle(entity, dx, dy, radius, movement)) return true;
    var turn = Math.floor((entity.phase || 0) * 10) % 2 === 0 ? 1 : -1;
    if (moveCircle(entity, -dy * turn, dx * turn, radius, movement)) return true;
    return moveCircle(entity, dy * turn, -dx * turn, radius, movement);
  }

  function getArea(x, y) {
    if (x > 3260 && y < 560) return "Crystal Hollow";
    if (x >= 2670) return "Moonstone Mountain";
    if (x < 760 && y > 1630) return "Sunlit Grove";
    if (Math.abs(x - riverX(y)) < 185) return "Silver River";
    return "Whispering Woods";
  }

  function updateArea() {
    var nextArea = getArea(state.player.x, state.player.y);
    if (nextArea !== state.area) {
      state.area = nextArea;
      state.areaBanner = nextArea;
      state.areaBannerUntil = state.timeMs + 2300;
    }
  }

  function getFoundTreeCount() {
    return ancientTrees.filter(function (tree) { return tree.found; }).length;
  }

  function getLitCrystalCount() {
    return crystals.filter(function (crystal) { return crystal.lit; }).length;
  }

  function setQuestStage(stage) {
    state.questStage = stage;
    if (stage === "meet_wizard") state.objective = "Talk to Aster in the glowing grove";
    if (stage === "forest_clues") state.objective = "Awaken the 2 ancient trees with Spark Magic";
    if (stage === "castle_map") state.objective = "Defeat Boswer in Shadowkeep Castle and take his map";
    if (stage === "mountain_gate") state.objective = "Clear the thorn gate to Moonstone Mountain";
    if (stage === "mountain_crystals") state.objective = "Light the 3 moon crystals on the mountain";
    if (stage === "diamond") state.objective = "Find and take Aster's lost diamond";
    if (stage === "return") state.objective = "Return the diamond to Aster";
    if (stage === "won") state.objective = "Quest complete!";
  }

  function showToast(text, seconds) {
    state.toast = text;
    state.toastUntil = state.timeMs + (seconds || 2.3) * 1000;
  }

  function openDialog(speaker, pages, onClose) {
    state.dialog = {
      speaker: speaker,
      pages: pages,
      index: 0,
      onClose: onClose || null
    };
    keys.clear();
    render();
  }

  function advanceDialog() {
    if (!state.dialog) return;
    state.dialog.index += 1;
    if (state.dialog.index >= state.dialog.pages.length) {
      var callback = state.dialog.onClose;
      state.dialog = null;
      if (callback) callback();
    }
    playTone(520, 0.035, "sine", 0.018);
    render();
  }

  function talkToWizard() {
    if (state.questStage === "meet_wizard") {
      openDialog("Aster the Wizard", [
        "An adventurer! My magic diamond was carried away by a wild spell.",
        "Its light split between two ancient trees, on both sides of Silver River.",
        "Take my Spark Magic and this red magic apple. Its gift can make your power much stronger!"
      ], function () {
        state.player.hasMagic = true;
        state.player.apples = Math.min(MAX_APPLES, state.player.apples + 1);
        state.player.weapons.rod = true;
        state.player.selectedWeapon = "rod";
        setQuestStage("forest_clues");
        emitParticles(wizard.x, wizard.y - 30, "#82fff1", 28, 125);
        showToast("Spark Magic and Fishing Rod received!", 3);
        playChime([523, 659, 784]);
      });
    } else if (state.questStage === "forest_clues") {
      openDialog("Aster the Wizard", [
        "Look for blue runes glowing in the leaves. Cast Spark Magic near both ancient trees."
      ]);
    } else if (state.questStage === "castle_map") {
      openDialog("Aster the Wizard", [
        "The trees saw Boswer steal the map! Find him inside Shadowkeep Castle in the northwest."
      ]);
    } else if (state.questStage === "mountain_gate") {
      openDialog("Aster the Wizard", [
        "The trees are awake! Their light can now break the thorn gate east of the upper bridge."
      ]);
    } else if (state.questStage === "mountain_crystals") {
      openDialog("Aster the Wizard", [
        "Moonstone Mountain is open. Light all three crystals and the diamond will reveal itself."
      ]);
    } else if (state.questStage === "diamond") {
      openDialog("Aster the Wizard", [
        "I can feel the diamond shining in Crystal Hollow, high in the northeast."
      ]);
    } else if (state.questStage === "return") {
      openDialog("Aster the Wizard", [
        "My diamond! You crossed the rivers, faced the hungry shadows, and brought its magic home.",
        "The whole valley will remember you as the Diamond Keeper!"
      ], finishQuest);
    } else {
      openDialog("Aster the Wizard", ["The valley shines because of you, Diamond Keeper!"]);
    }
  }

  function nearestHorse() {
    var best = null;
    var bestDistance = Infinity;
    state.horses.forEach(function (horse) {
      if (horse.mounted) return;
      var d = distanceXY(state.player.x, state.player.y, horse.x, horse.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = horse;
      }
    });
    return bestDistance <= 92 ? best : null;
  }

  function nearestVillager() {
    var best = null;
    var bestDistance = Infinity;
    state.villagers.forEach(function (villager) {
      var d = distanceXY(state.player.x, state.player.y, villager.x, villager.y);
      if (d < bestDistance) {
        best = villager;
        bestDistance = d;
      }
    });
    return bestDistance <= 94 ? best : null;
  }

  function talkToVillager(villager) {
    openDialog(villager.name, [villager.text]);
    playTone(380 + villager.phase * 35, 0.06, "sine", 0.018);
  }

  function nearestRainbowFish(range) {
    var best = null;
    var bestDistance = Infinity;
    rainbowFishSpots.forEach(function (fish) {
      if (fish.caught) return;
      var d = distanceXY(state.player.x, state.player.y, fish.x, fish.y);
      if (d < bestDistance) {
        best = fish;
        bestDistance = d;
      }
    });
    return bestDistance <= (range || 128) ? best : null;
  }

  function isWeaponPickupVisible(pickup) {
    if (pickup.collected) return false;
    if (pickup.id === "bow") return ancientTrees[0].found;
    if (pickup.id === "spear") return state.gateCleared;
    return true;
  }

  function nearestWeaponPickup() {
    var best = null;
    var bestDistance = Infinity;
    weaponPickups.forEach(function (pickup) {
      if (!isWeaponPickupVisible(pickup)) return;
      var d = distanceXY(state.player.x, state.player.y, pickup.x, pickup.y);
      if (d < bestDistance) {
        best = pickup;
        bestDistance = d;
      }
    });
    return bestDistance <= 88 ? best : null;
  }

  function collectWeapon(pickup) {
    pickup.collected = true;
    state.player.weapons[pickup.id] = true;
    state.player.selectedWeapon = pickup.id;
    emitParticles(pickup.x, pickup.y, "#ffe180", 24, 125);
    showToast(WEAPON_INFO[pickup.id].name + " found and equipped!", 2.5);
    playChime([440, 554, 659]);
  }

  function catchRainbowFish(fish) {
    if (state.player.rainbowFish >= MAX_RAINBOW_FISH) {
      showToast("Your rainbow-fish pouch is full.", 1.8);
      return;
    }
    fish.caught = true;
    state.player.rainbowFish += 1;
    emitParticles(fish.x, fish.y, "#9d8cff", 24, 130);
    showToast("Rainbow fish caught! Eat it for super speed.", 2.7);
    playChime([587, 740, 988]);
  }

  function getMountedHorse() {
    if (!state.mountedHorseId) return null;
    return state.horses.find(function (horse) { return horse.id === state.mountedHorseId; }) || null;
  }

  function feedOrRideHorse(horse) {
    if (isPlayerSwimming()) {
      showToast("Swim back to land before feeding or riding a horse.", 2.1);
      return;
    }
    if (!horse.fed) {
      if (state.player.apples <= 0) {
        showToast(horse.name + " wants a red apple. Ancient trees give apples.", 2.8);
        playTone(170, 0.1, "triangle", 0.025);
        return;
      }
      state.player.apples -= 1;
      horse.fed = true;
      state.horsesFed += 1;
      emitParticles(horse.x, horse.y - 15, "#ff9ccf", 18, 90);
      showToast("You fed " + horse.name + "! The horse trusts you now.", 2.8);
      playChime([440, 554, 659]);
      return;
    }
    horse.mounted = true;
    state.mountedHorseId = horse.id;
    horse.x = state.player.x;
    horse.y = state.player.y;
    showToast("Riding " + horse.name + " — much faster!", 2.3);
    playTone(330, 0.11, "triangle", 0.035);
  }

  function dismountHorse() {
    var horse = getMountedHorse();
    if (!horse) return;
    horse.mounted = false;
    horse.x = state.player.x + state.player.facingY * 46;
    horse.y = state.player.y - state.player.facingX * 46;
    if (isBlocked(horse.x, horse.y, 20)) {
      horse.x = state.player.x;
      horse.y = state.player.y;
    }
    state.mountedHorseId = null;
    showToast("You hop down from " + horse.name + ".", 1.7);
  }

  function handleInteract() {
    if (state.mode !== "playing" || state.mapOpen) return;
    if (state.dialog) {
      advanceDialog();
      return;
    }
    if (getMountedHorse()) {
      dismountHorse();
      return;
    }
    if (distanceXY(state.player.x, state.player.y, wizard.x, wizard.y) <= 108) {
      talkToWizard();
      return;
    }
    if (state.questStage === "castle_map" && treasureMap.available && !treasureMap.collected &&
        distanceXY(state.player.x, state.player.y, treasureMap.x, treasureMap.y) <= 100) {
      collectTreasureMap();
      return;
    }
    if (state.questStage === "diamond" && !diamond.collected &&
        distanceXY(state.player.x, state.player.y, diamond.x, diamond.y) <= 100) {
      collectDiamond();
      return;
    }
    if (portal.active && distanceXY(state.player.x, state.player.y, portal.x, portal.y) <= 100) {
      state.player.x = 665;
      state.player.y = 1900;
      state.player.checkpointX = 665;
      state.player.checkpointY = 1900;
      syncCamera();
      emitParticles(state.player.x, state.player.y, "#8ff7ff", 32, 150);
      showToast("Aster's portal carries you home!", 2.4);
      playChime([784, 659, 523]);
      return;
    }
    var villager = nearestVillager();
    if (villager) {
      talkToVillager(villager);
      return;
    }
    var fish = nearestRainbowFish();
    if (fish) {
      if (state.player.selectedWeapon === "rod" && state.player.weapons.rod) {
        useSelectedWeapon();
      } else {
        showToast("Equip the Fishing Rod to catch it.", 2.1);
      }
      return;
    }
    var weaponPickup = nearestWeaponPickup();
    if (weaponPickup) {
      collectWeapon(weaponPickup);
      return;
    }
    var horse = nearestHorse();
    if (horse) {
      feedOrRideHorse(horse);
      return;
    }
    showToast("Nothing to use here.", 1.25);
  }

  function selectWeapon(name) {
    if (!WEAPON_INFO[name] || !state.player.weapons[name]) {
      if (WEAPON_INFO[name]) showToast("You have not found the " + WEAPON_INFO[name].name + " yet.", 1.8);
      return false;
    }
    state.player.selectedWeapon = name;
    showToast(WEAPON_INFO[name].icon + " " + WEAPON_INFO[name].name + " equipped", 1.4);
    playTone(330 + WEAPON_ORDER.indexOf(name) * 70, 0.06, "triangle", 0.02);
    return true;
  }

  function cycleWeapon() {
    var owned = WEAPON_ORDER.filter(function (name) { return state.player.weapons[name]; });
    if (!owned.length) {
      showToast("You have no gear yet. Talk to Aster.", 1.8);
      return;
    }
    var index = owned.indexOf(state.player.selectedWeapon);
    selectWeapon(owned[(index + 1 + owned.length) % owned.length]);
  }

  function useSelectedWeapon() {
    if (state.mode !== "playing" || state.dialog || state.mapOpen) return;
    var name = state.player.selectedWeapon;
    if (!name || !state.player.weapons[name]) {
      showToast("Choose gear with Z or keys 1–4.", 1.8);
      return;
    }
    if (state.timeMs < state.player.weaponReadyAt) return;
    if (isPlayerSwimming()) {
      showToast("You cannot use gear while swimming.", 1.7);
      return;
    }
    var info = WEAPON_INFO[name];
    state.player.weaponReadyAt = state.timeMs + info.cooldown;
    if (name === "bow") shootArrow();
    else if (name === "rod") castFishingRod();
    else attackMelee(name);
  }

  function attackMelee(name) {
    var info = WEAPON_INFO[name];
    var strong = state.player.strongPowerUntil > state.timeMs;
    var damage = info.damage * (strong ? 2 : 1);
    var facingX = state.player.facingX;
    var facingY = state.player.facingY;
    var candidates = state.monsters.filter(function (monster) {
      if (monster.defeated) return false;
      var dx = monster.x - state.player.x;
      var dy = monster.y - state.player.y;
      var d = Math.max(1, Math.hypot(dx, dy));
      var dot = (dx / d) * facingX + (dy / d) * facingY;
      return d <= info.range + monster.r && dot >= (name === "spear" ? 0.7 : -0.05);
    });
    candidates.sort(function (a, b) {
      return distanceXY(state.player.x, state.player.y, a.x, a.y) -
        distanceXY(state.player.x, state.player.y, b.x, b.y);
    });
    if (name === "spear" && candidates.length > 1) candidates = [candidates[0]];
    candidates.forEach(function (monster) { hurtMonster(monster, damage); });
    state.weaponEffects.push({
      type: name,
      x: state.player.x,
      y: state.player.y,
      dx: facingX,
      dy: facingY,
      age: 0,
      life: name === "spear" ? 0.22 : 0.28,
      strong: strong
    });
    playTone(name === "spear" ? 210 : 285, 0.08, "sawtooth", 0.025);
  }

  function shootArrow() {
    var strong = state.player.strongPowerUntil > state.timeMs;
    state.arrows.push({
      x: state.player.x + state.player.facingX * 28,
      y: state.player.y + state.player.facingY * 28,
      vx: state.player.facingX * 650,
      vy: state.player.facingY * 650,
      age: 0,
      life: 0.92,
      damage: WEAPON_INFO.bow.damage * (strong ? 2 : 1),
      removed: false
    });
    state.weaponEffects.push({
      type: "bow",
      x: state.player.x,
      y: state.player.y,
      dx: state.player.facingX,
      dy: state.player.facingY,
      age: 0,
      life: 0.16,
      strong: strong
    });
    playTone(410, 0.055, "triangle", 0.022);
  }

  function castFishingRod() {
    var fish = nearestRainbowFish(WEAPON_INFO.rod.range);
    var targetX = state.player.x + state.player.facingX * WEAPON_INFO.rod.range;
    var targetY = state.player.y + state.player.facingY * WEAPON_INFO.rod.range;
    if (fish) {
      targetX = fish.x;
      targetY = fish.y;
      catchRainbowFish(fish);
    } else {
      showToast("No rainbow fish is close enough.", 1.6);
      playTone(170, 0.11, "triangle", 0.02);
    }
    state.weaponEffects.push({
      type: "rod",
      x: state.player.x,
      y: state.player.y,
      targetX: targetX,
      targetY: targetY,
      age: 0,
      life: 0.55,
      strong: false
    });
  }

  function castMagic() {
    if (state.mode !== "playing" || state.dialog || state.mapOpen) return;
    if (!state.player.hasMagic) {
      showToast("Talk to Aster to learn Spark Magic.", 2);
      return;
    }
    if (isPlayerSwimming()) {
      showToast("Swim to land before casting magic.", 1.7);
      return;
    }
    if (state.timeMs < state.player.magicReadyAt) return;
    var strong = state.player.strongPowerUntil > state.timeMs;
    var castRange = strong ? 218 : MAGIC_RANGE;
    state.player.magicReadyAt = state.timeMs + (strong ? 300 : 560);
    state.magicWaves.push({
      x: state.player.x,
      y: state.player.y,
      age: 0,
      life: 0.36,
      range: castRange,
      strong: strong
    });
    emitParticles(state.player.x, state.player.y, strong ? "#ff5b69" : "#7fffee", strong ? 22 : 12, strong ? 155 : 110);
    playTone(610, 0.12, "sine", 0.035);

    if (!state.secretRoomOpen &&
        distanceXY(state.player.x, state.player.y, secretDoor.x + secretDoor.w / 2, secretDoor.y + secretDoor.h / 2) <= castRange + 38) {
      state.secretRoomOpen = true;
      emitParticles(secretDoor.x + secretDoor.w / 2, secretDoor.y + secretDoor.h / 2, "#ffd873", 38, 160);
      showToast("A secret wall opens! You found the castle feast room.", 3.2);
      playChime([330, 440, 554, 740]);
    }

    state.monsters.forEach(function (monster) {
      if (monster.defeated) return;
      if (distanceXY(state.player.x, state.player.y, monster.x, monster.y) <= castRange + monster.r) {
        hurtMonster(monster, strong ? 2 : 1);
      }
    });

    if (state.questStage === "forest_clues") {
      ancientTrees.forEach(function (tree) {
        if (!tree.found && distanceXY(state.player.x, state.player.y, tree.x, tree.y) <= castRange + 25) {
          tree.found = true;
          state.player.apples = Math.min(MAX_APPLES, state.player.apples + 2);
          emitParticles(tree.x, tree.y - 45, "#75fff2", 34, 155);
          playChime([523, 659, 880]);
          var count = getFoundTreeCount();
          showToast(tree.label + " awakened and gives you two red apples! " + count + "/2", 3);
          if (count === ancientTrees.length) {
            setQuestStage("castle_map");
            showToast("The trees reveal a secret: Boswer stole the map!", 3.5);
          }
        }
      });
    }

    if (state.questStage === "mountain_gate" &&
        distanceXY(state.player.x, state.player.y, thornGate.x + thornGate.w / 2, thornGate.y + thornGate.h / 2) <= castRange + 80) {
      state.gateCleared = true;
      state.player.checkpointX = 2720;
      state.player.checkpointY = 800;
      setQuestStage("mountain_crystals");
      emitParticles(thornGate.x + thornGate.w / 2, thornGate.y + thornGate.h / 2, "#a5ff8e", 48, 185);
      showToast("The thorn gate dissolves!", 2.8);
      playChime([392, 523, 659, 784]);
    }

    if (state.questStage === "mountain_crystals") {
      crystals.forEach(function (crystal) {
        if (!crystal.lit && distanceXY(state.player.x, state.player.y, crystal.x, crystal.y) <= castRange + 22) {
          crystal.lit = true;
          emitParticles(crystal.x, crystal.y - 15, crystal.color, 30, 145);
          playChime([587, 740, 880]);
          var lit = getLitCrystalCount();
          showToast("Moon crystal lit! " + lit + "/3", 2.4);
          if (lit === crystals.length) {
            state.sealOpen = true;
            setQuestStage("diamond");
            emitParticles(diamond.x, diamond.y, "#8ff7ff", 45, 180);
            showToast("The Crystal Hollow seal is open!", 3.2);
          }
        }
      });
    }
  }

  function hurtMonster(monster, damage) {
    if (monster.hurtUntil > state.timeMs) return;
    if (monster.id === "boswer" && state.questStage !== "castle_map") {
      monster.hurtUntil = state.timeMs + 350;
      emitParticles(monster.x, monster.y, "#ffcf67", 12, 90);
      showToast("Boswer's shield is strong. Awaken both ancient trees first!", 2.7);
      playTone(120, 0.12, "square", 0.025);
      return;
    }
    monster.hp -= damage || 1;
    monster.hurtUntil = state.timeMs + 220;
    emitParticles(monster.x, monster.y, "#86fff0", 9, 90);
    playTone(monster.hp <= 0 ? 150 : 235, 0.09, "square", 0.025);
    if (monster.hp <= 0) defeatMonster(monster);
  }

  function defeatMonster(monster) {
    if (monster.defeated) return;
    monster.defeated = true;
    state.monstersDefeated += 1;
    state.foodDrops.push({
      id: "food_" + monster.id,
      x: monster.x,
      y: monster.y,
      bob: monster.phase,
      collected: false
    });
    if (monster.id === "boswer") {
      state.boswerDefeated = true;
      treasureMap.x = monster.x;
      treasureMap.y = monster.y - 18;
      treasureMap.available = true;
      emitParticles(monster.x, monster.y, "#ffd873", 36, 165);
      showToast("Boswer dropped the diamond map! Take it with E.", 3.4);
      playChime([392, 494, 659, 784]);
      return;
    }
    emitParticles(monster.x, monster.y, "#57457a", 24, 135);
    showToast("The creature dropped food!", 1.9);
  }

  function collectTreasureMap() {
    treasureMap.collected = true;
    state.hasMap = true;
    setQuestStage("mountain_gate");
    emitParticles(treasureMap.x, treasureMap.y, "#ffd873", 26, 125);
    showToast("Map taken! It marks the thorn gate and Crystal Hollow.", 3.5);
    playChime([440, 554, 659, 880]);
  }

  function eatFood() {
    if (state.mode !== "playing" || state.dialog || state.mapOpen) return;
    if (state.player.food <= 0) {
      showToast("Your food bag is empty.", 1.8);
      return;
    }
    if (state.player.hearts >= state.player.maxHearts) {
      showToast("You already have the maximum 8 lives.", 1.8);
      return;
    }
    state.player.food -= 1;
    state.player.hearts = Math.min(state.player.maxHearts, state.player.hearts + 1);
    emitParticles(state.player.x, state.player.y - 15, "#ff8ca1", 16, 95);
    showToast("Yum! The meat gives you one more life.", 2);
    playChime([392, 523]);
  }

  function eatMagicApple() {
    if (state.mode !== "playing" || state.dialog || state.mapOpen) return;
    if (state.player.apples <= 0) {
      showToast("You have no red magic apples.", 1.8);
      return;
    }
    state.player.apples -= 1;
    state.player.strongPowerUntil = Math.max(state.player.strongPowerUntil, state.timeMs) + 20000;
    emitParticles(state.player.x, state.player.y - 8, "#ff5364", 32, 165);
    showToast("SUPER POWER! Double magic and weapon damage for 20 seconds.", 3);
    playChime([440, 554, 659, 880]);
  }

  function eatRainbowFish() {
    if (state.mode !== "playing" || state.dialog || state.mapOpen) return;
    if (state.player.rainbowFish <= 0) {
      showToast("You have no rainbow fish.", 1.8);
      return;
    }
    state.player.rainbowFish -= 1;
    state.player.superSpeedUntil = Math.max(state.player.superSpeedUntil, state.timeMs) + 15000;
    emitParticles(state.player.x, state.player.y, "#8b8cff", 34, 180);
    showToast("RAINBOW SPEED! You move super fast for 15 seconds.", 3);
    playChime([659, 784, 988, 1175]);
  }

  function collectDiamond() {
    diamond.collected = true;
    state.diamondCollected = true;
    portal.active = true;
    setQuestStage("return");
    emitParticles(diamond.x, diamond.y, "#8ff7ff", 60, 220);
    showToast("You found the Lost Diamond! Return to Aster.", 3.8);
    playChime([523, 659, 784, 1047]);
  }

  function finishQuest() {
    setQuestStage("won");
    state.mode = "victory";
    keys.clear();
    emitParticles(wizard.x, wizard.y - 20, "#fff09c", 70, 240);
    victoryStats.textContent = state.monstersDefeated + " creatures defeated • " +
      state.horsesFed + " horses befriended";
    setMode("victory");
    playChime([523, 659, 784, 1047, 1319]);
    render();
  }

  function normalizeViewAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle <= -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function setPlayerViewAngle(angle) {
    state.player.viewAngle = normalizeViewAngle(angle);
    state.player.facingX = Math.cos(state.player.viewAngle);
    state.player.facingY = Math.sin(state.player.viewAngle);
  }

  function updatePlayer(dt) {
    var forward = 0;
    var strafe = 0;
    var turn = 0;
    if (keys.has("ArrowUp") || keys.has("KeyW")) forward += 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) forward -= 1;
    if (keys.has("KeyA")) strafe -= 1;
    if (keys.has("KeyD")) strafe += 1;
    if (keys.has("ArrowLeft")) turn -= 1;
    if (keys.has("ArrowRight")) turn += 1;

    if (turn) {
      var turnSpeed = getMountedHorse() ? 1.95 : 2.45;
      setPlayerViewAngle(state.player.viewAngle + turn * turnSpeed * dt);
    } else {
      setPlayerViewAngle(state.player.viewAngle);
    }

    var xDirection = state.player.facingX * forward - state.player.facingY * strafe;
    var yDirection = state.player.facingY * forward + state.player.facingX * strafe;
    var wantsToMove = Boolean(xDirection || yDirection);
    state.player.moving = false;
    if (wantsToMove) {
      var length = Math.hypot(xDirection, yDirection);
      xDirection /= length;
      yDirection /= length;
      var mounted = Boolean(getMountedHorse());
      var speed = mounted ? 425 : 250;
      if (forward < 0) speed *= 0.72;
      if (!mounted && isPlayerSwimming()) speed *= 0.55;
      if (state.player.superSpeedUntil > state.timeMs) speed *= 1.75;
      state.player.moving = moveCircle(
        state.player,
        xDirection * speed * dt,
        yDirection * speed * dt,
        PLAYER_RADIUS,
        { canSwim: !mounted }
      );
      var horse = getMountedHorse();
      if (horse) {
        horse.x = state.player.x;
        horse.y = state.player.y;
        horse.facingX = state.player.facingX;
        horse.facingY = state.player.facingY;
        if (state.player.moving && state.timeMs >= state.rideDustReadyAt) {
          state.rideDustReadyAt = state.timeMs + 110;
          emitParticles(state.player.x - xDirection * 22, state.player.y - yDirection * 22, "#d6c59a", 2, 32);
        }
      } else if (state.player.moving && state.player.superSpeedUntil > state.timeMs && state.timeMs >= state.rideDustReadyAt) {
        state.rideDustReadyAt = state.timeMs + 85;
        emitParticles(state.player.x - xDirection * 18, state.player.y - yDirection * 18, "#9e8cff", 2, 38);
      }
    }
    state.player.swimming = isPlayerSwimming();

    if (state.gateCleared && state.player.x > 2700 && state.player.y > 620 && state.player.y < 980) {
      state.player.checkpointX = 2720;
      state.player.checkpointY = 800;
    }
  }

  function updateMonsters(dt) {
    state.monsters.forEach(function (monster) {
      if (monster.defeated) return;
      var toPlayerX = state.player.x - monster.x;
      var toPlayerY = state.player.y - monster.y;
      var playerDistance = Math.hypot(toPlayerX, toPlayerY);
      var targetX;
      var targetY;
      if (playerDistance < 440) {
        monster.mode = "chase";
        var chaseTarget = routeTargetAcrossRiver(monster, state.player);
        targetX = chaseTarget.x;
        targetY = chaseTarget.y;
      } else {
        monster.mode = "patrol";
        targetX = monster.homeX + Math.cos(state.timeMs / 1900 + monster.phase) * 115;
        targetY = monster.homeY + Math.sin(state.timeMs / 1550 + monster.phase * 1.3) * 95;
      }

      var dx = targetX - monster.x;
      var dy = targetY - monster.y;
      var d = Math.hypot(dx, dy);
      if (d > 2) {
        dx /= d;
        dy /= d;
        monster.facingX = dx;
        monster.facingY = dy;
        var speedMultiplier = monster.mode === "chase" ? 1 : 0.52;
        moveCircleWithSteering(
          monster,
          dx * monster.speed * speedMultiplier * dt,
          dy * monster.speed * speedMultiplier * dt,
          monster.r
        );
      }

      playerDistance = distanceXY(state.player.x, state.player.y, monster.x, monster.y);
      if (playerDistance < PLAYER_RADIUS + monster.r + 7 &&
          state.timeMs >= monster.biteReadyAt &&
          state.timeMs >= state.player.invulnerableUntil) {
        bitePlayer(monster);
      }
    });
  }

  function updateArrows(dt) {
    state.arrows.forEach(function (arrow) {
      if (arrow.removed) return;
      arrow.age += dt;
      var nextX = arrow.x + arrow.vx * dt;
      var nextY = arrow.y + arrow.vy * dt;
      if (arrow.age >= arrow.life || isBlocked(nextX, nextY, 4)) {
        arrow.removed = true;
        return;
      }
      arrow.x = nextX;
      arrow.y = nextY;
      for (var i = 0; i < state.monsters.length; i += 1) {
        var monster = state.monsters[i];
        if (!monster.defeated && distanceXY(arrow.x, arrow.y, monster.x, monster.y) < monster.r + 8) {
          hurtMonster(monster, arrow.damage);
          arrow.removed = true;
          break;
        }
      }
    });
    state.arrows = state.arrows.filter(function (arrow) { return !arrow.removed; });
  }

  function bitePlayer(monster) {
    monster.biteReadyAt = state.timeMs + 1050;
    state.player.hearts -= 1;
    state.player.invulnerableUntil = state.timeMs + 1200;
    var dx = state.player.x - monster.x;
    var dy = state.player.y - monster.y;
    var d = Math.max(1, Math.hypot(dx, dy));
    moveCircle(
      state.player,
      dx / d * 48,
      dy / d * 48,
      PLAYER_RADIUS,
      { canSwim: !getMountedHorse() }
    );
    emitParticles(state.player.x, state.player.y, "#ff667d", 16, 125);
    showToast("CHOMP! The creature bit you.", 1.5);
    playTone(92, 0.18, "sawtooth", 0.045);
    if (state.player.hearts <= 0) respawnPlayer();
  }

  function respawnPlayer() {
    var horse = getMountedHorse();
    if (horse) {
      horse.mounted = false;
      horse.x = state.player.x;
      horse.y = state.player.y;
      state.mountedHorseId = null;
    }
    state.player.x = state.player.checkpointX;
    state.player.y = state.player.checkpointY;
    state.player.hearts = STARTING_HEARTS;
    state.player.invulnerableUntil = state.timeMs + 2200;
    syncCamera();
    emitParticles(state.player.x, state.player.y, "#9cf7ff", 35, 165);
    showToast("Aster's magic rescued you. Quest progress saved!", 3.2);
    playChime([330, 262, 392]);
  }

  function updateFoodDrops() {
    state.foodDrops.forEach(function (food) {
      if (food.collected) return;
      if (distanceXY(state.player.x, state.player.y, food.x, food.y) < 42) {
        if (state.player.food < MAX_FOOD) {
          food.collected = true;
          state.player.food += 1;
          emitParticles(food.x, food.y, "#ffcf72", 11, 75);
          showToast("Food collected! Bag: " + state.player.food + "/" + MAX_FOOD, 1.8);
          playTone(680, 0.07, "triangle", 0.03);
        } else if (state.toast !== "Food bag full!") {
          showToast("Food bag full!", 1.2);
        }
      }
    });
  }

  function updateRoyalFoods() {
    if (!state.secretRoomOpen) return;
    royalFoods.forEach(function (food) {
      if (food.collected) return;
      if (distanceXY(state.player.x, state.player.y, food.x, food.y) < 38) {
        if (state.player.hearts >= state.player.maxHearts) {
          if (state.toast !== "Save the feast until you need more lives.") {
            showToast("Save the feast until you need more lives.", 1.6);
          }
          return;
        }
        food.collected = true;
        state.player.hearts = Math.min(state.player.maxHearts, state.player.hearts + 2);
        emitParticles(food.x, food.y, "#ffcf72", 20, 105);
        showToast("Royal feast! Two extra lives.", 2.2);
        playChime([392, 523, 659]);
      }
    });
  }

  function updateHorses(dt) {
    state.horses.forEach(function (horse) {
      if (horse.mounted) return;
      var targetX;
      var targetY;
      var speed;
      if (horse.fed && distanceXY(horse.x, horse.y, state.player.x, state.player.y) > 125) {
        var followTarget = routeTargetAcrossRiver(horse, state.player);
        targetX = followTarget.x;
        targetY = followTarget.y;
        speed = 145;
      } else {
        targetX = horse.homeX + Math.cos(state.timeMs / 2400 + horse.phase) * 72;
        targetY = horse.homeY + Math.sin(state.timeMs / 2100 + horse.phase) * 54;
        speed = 42;
      }
      var dx = targetX - horse.x;
      var dy = targetY - horse.y;
      var d = Math.hypot(dx, dy);
      if (d > 4) {
        dx /= d;
        dy /= d;
        horse.facingX = dx;
        horse.facingY = dy;
        moveCircleWithSteering(horse, dx * speed * dt, dy * speed * dt, 20);
      }
    });
  }

  function updateVillagers(dt) {
    state.villagers.forEach(function (villager) {
      var targetX = villager.homeX + Math.cos(state.timeMs / 3100 + villager.phase) * 34;
      var targetY = villager.homeY + Math.sin(state.timeMs / 2800 + villager.phase) * 26;
      var dx = targetX - villager.x;
      var dy = targetY - villager.y;
      var d = Math.hypot(dx, dy);
      if (d > 3) {
        dx /= d;
        dy /= d;
        villager.facingX = dx;
        villager.facingY = dy;
        moveCircle(villager, dx * 28 * dt, dy * 28 * dt, 15);
      }
    });
  }

  function syncMountedHorsePose() {
    var horse = getMountedHorse();
    if (!horse) return;
    horse.x = state.player.x;
    horse.y = state.player.y;
    horse.facingX = state.player.facingX;
    horse.facingY = state.player.facingY;
  }

  function emitParticles(x, y, color, count, speed) {
    if (!state) return;
    for (var i = 0; i < count; i += 1) {
      var angle = effectRandom() * Math.PI * 2;
      var velocity = speed * (0.35 + effectRandom() * 0.65);
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.42 + effectRandom() * 0.55,
        age: 0,
        color: color,
        size: 2 + effectRandom() * 4
      });
    }
  }

  function updateEffects(dt) {
    state.magicWaves.forEach(function (wave) { wave.age += dt; });
    state.magicWaves = state.magicWaves.filter(function (wave) { return wave.age < wave.life; });
    state.weaponEffects.forEach(function (effect) { effect.age += dt; });
    state.weaponEffects = state.weaponEffects.filter(function (effect) { return effect.age < effect.life; });
    state.particles.forEach(function (particle) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy = particle.vy * 0.96 + 12 * dt;
    });
    state.particles = state.particles.filter(function (particle) { return particle.age < particle.life; });
  }

  function findTornadoSpawn(weather) {
    var offsets = [
      [340, -120], [-340, -120], [340, 120], [-340, 120],
      [280, -180], [-280, -180], [280, 180], [-280, 180]
    ];
    for (var i = 0; i < offsets.length; i += 1) {
      var offset = offsets[(weather.cycle + i) % offsets.length];
      var x = clamp(state.player.x + offset[0], 110, WORLD_W - 110);
      var y = clamp(state.player.y + offset[1], 170, WORLD_H - 110);
      var spawnDistance = distanceXY(state.player.x, state.player.y, x, y);
      if (spawnDistance < 220 || spawnDistance > 430) continue;
      if (isInsideCastle(x, y)) continue;
      if (!isBlocked(x, y, 55, { canSwim: true })) return { x: x, y: y };
    }
    return null;
  }

  function updateWeather(dt) {
    var weather = state.weather;
    if (state.timeMs >= weather.nextChangeAt) {
      weather.raining = !weather.raining;
      weather.targetIntensity = weather.raining ? 1 : 0;
      weather.cycle += 1;
      if (weather.raining) {
        weather.nextChangeAt = state.timeMs + 23000 + (weather.cycle % 3) * 4000;
        showToast("Dark clouds gather. Rain is coming.", 2.5);
      } else {
        weather.nextChangeAt = state.timeMs + 43000 + (weather.cycle % 4) * 6000;
        showToast("The rain passes and sunlight returns.", 2.5);
      }
    }
    var change = weather.targetIntensity - weather.intensity;
    weather.intensity += clamp(change, -dt * 0.19, dt * 0.19);
    weather.intensity = clamp(weather.intensity, 0, 1);
    weather.wind = 0.35 + weather.intensity * 0.75 + Math.sin(state.timeMs / 2100) * 0.12;
    var tornado = weather.tornado;
    if (weather.raining && weather.intensity >= 0.82 &&
        tornado.phase === "idle" && tornado.stormCycle !== weather.cycle) {
      var spawn = findTornadoSpawn(weather);
      if (spawn) {
        tornado.phase = "warning";
        tornado.stormCycle = weather.cycle;
        tornado.x = spawn.x;
        tornado.y = spawn.y;
        tornado.warningUntil = state.timeMs + 3500;
        tornado.activeUntil = 0;
        showToast("TORNADO WARNING! Swirling wind is forming nearby.", 3.4);
        playTone(84, 0.5, "sawtooth", 0.025);
      }
    }
    if ((!weather.raining || weather.intensity < 0.82) && tornado.phase !== "idle") {
      tornado.phase = "idle";
    }
  }

  function isInsideCastle(x, y) {
    return x > castle.x + 55 && x < castle.x + castle.w - 55 &&
      y > castle.y + 55 && y < castle.y + castle.h - 55;
  }

  function updateTornado(dt) {
    var tornado = state.weather.tornado;
    if (!state.weather.raining || state.weather.intensity < 0.82) {
      tornado.phase = "idle";
      return;
    }
    if (tornado.phase === "warning" && state.timeMs >= tornado.warningUntil) {
      tornado.phase = "active";
      tornado.activeUntil = state.timeMs + 6500;
      showToast("TORNADO! Run away or shelter inside the castle.", 3.2);
      playTone(66, 0.65, "sawtooth", 0.04);
    }
    if (tornado.phase !== "active") return;
    if (state.timeMs >= tornado.activeUntil) {
      tornado.phase = "idle";
      showToast("The tornado fades into the rain.", 2.2);
      return;
    }
    tornado.x = clamp(tornado.x + state.weather.wind * 34 * dt, 90, WORLD_W - 90);
    tornado.y = clamp(tornado.y + Math.sin(state.timeMs / 480) * 20 * dt, 90, WORLD_H - 90);
    if (isInsideCastle(state.player.x, state.player.y)) return;
    var dx = tornado.x - state.player.x;
    var dy = tornado.y - state.player.y;
    var d = Math.max(1, Math.hypot(dx, dy));
    if (d < 520) {
      var pull = 140 * clamp(1 - d / 520, 0, 1);
      moveCircle(
        state.player,
        dx / d * pull * dt,
        dy / d * pull * dt,
        PLAYER_RADIUS,
        { canSwim: !getMountedHorse() }
      );
    }
  }

  function simulateStep() {
    if (state.mode !== "playing" || state.dialog || state.mapOpen) return;
    state.timeMs += STEP_MS;
    var dt = STEP_MS / 1000;
    updateWeather(dt);
    updatePlayer(dt);
    updateTornado(dt);
    updateMonsters(dt);
    updateArrows(dt);
    updateHorses(dt);
    updateVillagers(dt);
    updateFoodDrops();
    updateRoyalFoods();
    updateEffects(dt);
    syncMountedHorsePose();
    state.player.swimming = isPlayerSwimming();
    updateArea();
    syncCamera();
  }

  function getObjectiveTarget() {
    if (state.questStage === "meet_wizard") return { x: wizard.x, y: wizard.y, label: "Aster" };
    if (state.questStage === "forest_clues") {
      var remaining = ancientTrees.filter(function (tree) { return !tree.found; });
      if (remaining.length) {
        remaining.sort(function (a, b) {
          return distanceXY(state.player.x, state.player.y, a.x, a.y) -
            distanceXY(state.player.x, state.player.y, b.x, b.y);
        });
        return { x: remaining[0].x, y: remaining[0].y, label: "Ancient tree" };
      }
    }
    if (state.questStage === "castle_map") {
      if (treasureMap.available && !treasureMap.collected) {
        return { x: treasureMap.x, y: treasureMap.y, label: "Boswer's map" };
      }
      var boswer = state.monsters.find(function (monster) { return monster.id === "boswer"; });
      return { x: boswer.x, y: boswer.y, label: "Boswer" };
    }
    if (state.questStage === "mountain_gate") {
      return { x: thornGate.x + thornGate.w / 2, y: thornGate.y + thornGate.h / 2, label: "Thorn gate" };
    }
    if (state.questStage === "mountain_crystals") {
      var unlit = crystals.filter(function (crystal) { return !crystal.lit; });
      if (unlit.length) {
        unlit.sort(function (a, b) {
          return distanceXY(state.player.x, state.player.y, a.x, a.y) -
            distanceXY(state.player.x, state.player.y, b.x, b.y);
        });
        return { x: unlit[0].x, y: unlit[0].y, label: "Moon crystal" };
      }
    }
    if (state.questStage === "diamond") return { x: diamond.x, y: diamond.y, label: "Lost Diamond" };
    if (state.questStage === "return") {
      if (portal.active && distanceXY(state.player.x, state.player.y, portal.x, portal.y) < 620) {
        return { x: portal.x, y: portal.y, label: "Magic portal" };
      }
      return { x: wizard.x, y: wizard.y, label: "Aster" };
    }
    return null;
  }

  function getInteractionPrompt() {
    if (state.dialog || state.mode !== "playing" || state.mapOpen) return "";
    var mounted = getMountedHorse();
    if (mounted) return "E / ENTER  •  Dismount " + mounted.name;
    if (distanceXY(state.player.x, state.player.y, wizard.x, wizard.y) <= 108) {
      return "E / ENTER  •  Talk to Aster";
    }
    if (state.questStage === "castle_map" && treasureMap.available && !treasureMap.collected &&
        distanceXY(state.player.x, state.player.y, treasureMap.x, treasureMap.y) <= 100) {
      return "E / ENTER  •  Take Boswer's map";
    }
    if (state.questStage === "diamond" && !diamond.collected &&
        distanceXY(state.player.x, state.player.y, diamond.x, diamond.y) <= 100) {
      return "E / ENTER  •  Take the Lost Diamond";
    }
    if (portal.active && distanceXY(state.player.x, state.player.y, portal.x, portal.y) <= 100) {
      return "E / ENTER  •  Use Aster's portal";
    }
    var villager = nearestVillager();
    if (villager) return "E / ENTER  •  Talk to " + villager.name;
    var pickup = nearestWeaponPickup();
    if (pickup) return "E / ENTER  •  Take " + WEAPON_INFO[pickup.id].name;
    if (isPlayerSwimming()) return "SWIMMING  •  Move toward either riverbank";
    var fish = nearestRainbowFish();
    if (fish) return state.player.selectedWeapon === "rod" ?
      "K / USE  •  Catch rainbow fish with Fishing Rod" :
      "Equip the Fishing Rod to catch this rainbow fish";
    var horse = nearestHorse();
    if (horse) {
      if (!horse.fed) return "E / ENTER  •  Feed " + horse.name + " (1 red apple)";
      return "E / ENTER  •  Ride " + horse.name;
    }
    return "";
  }

  function getFPViewBasis() {
    var angle = state.player.viewAngle;
    return {
      forwardX: Math.cos(angle),
      forwardY: Math.sin(angle),
      rightX: -Math.sin(angle),
      rightY: Math.cos(angle)
    };
  }

  function getFPEyeHeight() {
    if (getMountedHorse()) return 66;
    if (state.player.swimming) return 27;
    return 52;
  }

  function getFPHorizon() {
    var bob = !prefersReducedMotion && state.player.moving && !state.dialog ?
      Math.sin(state.timeMs / (getMountedHorse() ? 72 : 105)) * (getMountedHorse() ? 5 : 2.8) : 0;
    return FP_HORIZON + bob;
  }

  function getFPCameraPoint(x, y) {
    var basis = getFPViewBasis();
    var dx = x - state.player.x;
    var dy = y - state.player.y;
    return {
      depth: dx * basis.forwardX + dy * basis.forwardY,
      lateral: dx * basis.rightX + dy * basis.rightY
    };
  }

  function projectFPPoint(x, y, height) {
    var cameraPoint = getFPCameraPoint(x, y);
    if (cameraPoint.depth <= FP_NEAR) return null;
    var horizon = getFPHorizon();
    var eyeHeight = getFPEyeHeight();
    return {
      depth: cameraPoint.depth,
      lateral: cameraPoint.lateral,
      x: VIEW_W / 2 + cameraPoint.lateral * FP_PROJECTION / cameraPoint.depth,
      groundY: horizon + eyeHeight * FP_PROJECTION / cameraPoint.depth,
      y: horizon + (eyeHeight - (height || 0)) * FP_PROJECTION / cameraPoint.depth,
      scale: FP_PROJECTION / cameraPoint.depth
    };
  }

  function isInFirstPersonView(x, y, margin) {
    var point = getFPCameraPoint(x, y);
    margin = margin || 0;
    if (point.depth < -margin || point.depth > FP_FAR + margin) return false;
    var halfWidth = Math.max(40, point.depth * Math.tan(FP_FOV / 2)) + margin;
    return Math.abs(point.lateral) <= halfWidth;
  }

  function isPointInsideRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function staticTerrainColorAt(x, y) {
    var base;
    var onBridge = bridges.some(function (bridge) {
      return Math.abs(x - bridge.x) <= bridge.w / 2 && Math.abs(y - bridge.y) <= bridge.h / 2;
    });
    var riverDistance = Math.abs(x - riverX(y));
    if (onBridge) {
      base = ((Math.floor(x / 25) + Math.floor(y / 24)) % 2) ? [151, 93, 48] : [170, 108, 57];
    } else if (riverDistance < 61) {
      base = [61, 151, 179];
    } else if (riverDistance < 90) {
      base = [186, 158, 101];
    } else if (isInsideCastle(x, y)) {
      var stone = (Math.floor(x / 42) + Math.floor(y / 42)) % 2 ? 7 : 0;
      base = [116 + stone, 112 + stone, 107 + stone];
    } else if (distanceToRoutes(x, y) < 42) {
      base = [180, 154, 98];
    } else if (x >= 2668) {
      base = x > 3260 && y < 620 ? [136, 142, 151] : [113, 109, 119];
    } else if (x < 760 && y > 1630) {
      base = [126, 194, 99];
    } else {
      var forestPatch = (Math.floor(x / 95) + Math.floor(y / 95)) % 2 ? 5 : -3;
      base = [70 + forestPatch, 132 + forestPatch, 73 + forestPatch];
    }
    return base;
  }

  function ensureFPTerrainTexture() {
    if (fpTerrainPixels) return;
    fpTerrainPixels = new Uint8ClampedArray(FP_TERRAIN_W * FP_TERRAIN_H * 3);
    for (var ty = 0; ty < FP_TERRAIN_H; ty += 1) {
      for (var tx = 0; tx < FP_TERRAIN_W; tx += 1) {
        var worldX = (tx + 0.5) / FP_TERRAIN_W * WORLD_W;
        var worldY = (ty + 0.5) / FP_TERRAIN_H * WORLD_H;
        var color = staticTerrainColorAt(worldX, worldY);
        var index = (ty * FP_TERRAIN_W + tx) * 3;
        fpTerrainPixels[index] = color[0];
        fpTerrainPixels[index + 1] = color[1];
        fpTerrainPixels[index + 2] = color[2];
      }
    }
  }

  function sampleFPTerrain(x, y, depth, destination, destinationIndex) {
    var textureX = clamp(Math.floor(x / WORLD_W * FP_TERRAIN_W), 0, FP_TERRAIN_W - 1);
    var textureY = clamp(Math.floor(y / WORLD_H * FP_TERRAIN_H), 0, FP_TERRAIN_H - 1);
    var sourceIndex = (textureY * FP_TERRAIN_W + textureX) * 3;
    var shade = clamp(1.05 - depth / (FP_FAR * 2.4), 0.58, 1.05);
    destination[destinationIndex] = fpTerrainPixels[sourceIndex] * shade;
    destination[destinationIndex + 1] = fpTerrainPixels[sourceIndex + 1] * shade;
    destination[destinationIndex + 2] = fpTerrainPixels[sourceIndex + 2] * shade;
    destination[destinationIndex + 3] = 255;
  }

  function drawFPSkyAndGround() {
    ensureFPTerrainTexture();
    var horizon = getFPHorizon();
    var sky = ctx.createLinearGradient(0, 0, 0, horizon + 35);
    if (state.weather.intensity > 0.45) {
      sky.addColorStop(0, "#56677a");
      sky.addColorStop(1, "#a6b2b1");
    } else if (state.area === "Moonstone Mountain" || state.area === "Crystal Hollow") {
      sky.addColorStop(0, "#7289a7");
      sky.addColorStop(1, "#d8d4c9");
    } else {
      sky.addColorStop(0, "#67b9df");
      sky.addColorStop(1, "#d9f2cf");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, horizon + 3);

    var sunX = 705 - Math.sin(state.player.viewAngle) * 150;
    var sunY = 105;
    ctx.fillStyle = "rgba(255,240,157,0.82)";
    ctx.shadowColor = "rgba(255,235,136,0.72)";
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = state.player.x >= 2668 ? "rgba(71,69,82,0.58)" : "rgba(39,93,55,0.48)";
    ctx.beginPath();
    ctx.moveTo(0, horizon + 3);
    for (var ridgeX = 0; ridgeX <= VIEW_W; ridgeX += 60) {
      var ridgeY = horizon - 24 - Math.sin(ridgeX * 0.015 + state.player.viewAngle * 3) * 18;
      ctx.lineTo(ridgeX, ridgeY);
    }
    ctx.lineTo(VIEW_W, horizon + 8);
    ctx.closePath();
    ctx.fill();

    var groundWidth = fpGroundCanvas.width;
    var groundHeight = fpGroundCanvas.height;
    var image = fpGroundContext.createImageData(groundWidth, groundHeight);
    var basis = getFPViewBasis();
    var eyeHeight = getFPEyeHeight();
    for (var gy = 0; gy < groundHeight; gy += 1) {
      var screenY = horizon + 1 + (gy + 0.5) / groundHeight * (VIEW_H - horizon - 1);
      var rowDepth = clamp(eyeHeight * FP_PROJECTION / Math.max(1, screenY - horizon), FP_NEAR, FP_FAR);
      for (var gx = 0; gx < groundWidth; gx += 1) {
        var screenX = (gx + 0.5) / groundWidth * VIEW_W;
        var lateral = (screenX - VIEW_W / 2) * rowDepth / FP_PROJECTION;
        var worldX = state.player.x + basis.forwardX * rowDepth + basis.rightX * lateral;
        var worldY = state.player.y + basis.forwardY * rowDepth + basis.rightY * lateral;
        var index = (gy * groundWidth + gx) * 4;
        sampleFPTerrain(worldX, worldY, rowDepth, image.data, index);
      }
    }
    fpGroundContext.putImageData(image, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fpGroundCanvas, 0, horizon, VIEW_W, VIEW_H - horizon);
    ctx.restore();

    var fog = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 95);
    fog.addColorStop(0, "rgba(218,232,211,0.42)");
    fog.addColorStop(1, "rgba(218,232,211,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizon - 10, VIEW_W, 110);
  }

  function rayRectIntersection(originX, originY, rayX, rayY, rect) {
    var entry = -Infinity;
    var exit = Infinity;
    if (Math.abs(rayX) < 0.00001) {
      if (originX < rect.x || originX > rect.x + rect.w) return null;
    } else {
      var tx1 = (rect.x - originX) / rayX;
      var tx2 = (rect.x + rect.w - originX) / rayX;
      entry = Math.max(entry, Math.min(tx1, tx2));
      exit = Math.min(exit, Math.max(tx1, tx2));
    }
    if (Math.abs(rayY) < 0.00001) {
      if (originY < rect.y || originY > rect.y + rect.h) return null;
    } else {
      var ty1 = (rect.y - originY) / rayY;
      var ty2 = (rect.y + rect.h - originY) / rayY;
      entry = Math.max(entry, Math.min(ty1, ty2));
      exit = Math.min(exit, Math.max(ty1, ty2));
    }
    if (exit < Math.max(FP_NEAR, entry)) return null;
    return entry >= FP_NEAR ? entry : exit;
  }

  function rayCircleIntersection(originX, originY, rayX, rayY, circle) {
    var ox = originX - circle.x;
    var oy = originY - circle.y;
    var a = rayX * rayX + rayY * rayY;
    var b = 2 * (ox * rayX + oy * rayY);
    var c = ox * ox + oy * oy - circle.r * circle.r;
    var discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    var root = Math.sqrt(discriminant);
    var first = (-b - root) / (2 * a);
    var second = (-b + root) / (2 * a);
    if (first >= FP_NEAR) return first;
    if (second >= FP_NEAR) return second;
    return null;
  }

  function getFPSolids() {
    var solids = [];
    cliffs.forEach(function (rect) {
      solids.push({ type: "rect", rect: rect, height: 260, material: "cliff" });
    });
    castleWalls.forEach(function (rect) {
      solids.push({ type: "rect", rect: rect, height: 128, material: "castle" });
    });
    secretRoomWalls.forEach(function (rect) {
      solids.push({ type: "rect", rect: rect, height: 112, material: "castle" });
    });
    if (!state.secretRoomOpen) {
      solids.push({ type: "rect", rect: secretDoor, height: 112, material: "door" });
    }
    if (!state.gateCleared) {
      solids.push({ type: "rect", rect: thornGate, height: 170, material: "thorn" });
    }
    if (!state.sealOpen) {
      solids.push({ type: "circle", circle: { x: diamond.x, y: diamond.y, r: 118 }, height: 145, material: "seal" });
    }
    return solids;
  }

  function fpWallColor(material, depth, column) {
    var flicker = (Math.floor(column / 9) % 2) * 6;
    var shade = clamp(1 - depth / 1800, 0.48, 1);
    var color;
    if (material === "castle") color = [113 + flicker, 111 + flicker, 122 + flicker];
    else if (material === "door") color = [91 + flicker, 82 + flicker, 94 + flicker];
    else if (material === "thorn") color = [48 + flicker, 94 + flicker, 48];
    else if (material === "seal") color = [104, 183, 219];
    else if (material === "boundary") color = [45, 69, 53];
    else color = [83 + flicker, 80 + flicker, 93 + flicker];
    if (material === "seal") return "rgba(" + color[0] + "," + color[1] + "," + color[2] + ",0.72)";
    return "rgb(" + Math.round(color[0] * shade) + "," + Math.round(color[1] * shade) + "," + Math.round(color[2] * shade) + ")";
  }

  function drawFPWalls() {
    var solids = getFPSolids();
    var basis = getFPViewBasis();
    var planeScale = Math.tan(FP_FOV / 2);
    var horizon = getFPHorizon();
    var eyeHeight = getFPEyeHeight();
    fpDepthBuffer.fill(FP_FAR + 1);
    for (var column = 0; column < VIEW_W; column += FP_RAY_STRIDE) {
      var cameraX = 2 * (column + FP_RAY_STRIDE / 2) / VIEW_W - 1;
      var rayX = basis.forwardX + basis.rightX * planeScale * cameraX;
      var rayY = basis.forwardY + basis.rightY * planeScale * cameraX;
      var nearest = FP_FAR + 1;
      var hitSolid = null;
      solids.forEach(function (solid) {
        var hit = solid.type === "rect" ?
          rayRectIntersection(state.player.x, state.player.y, rayX, rayY, solid.rect) :
          rayCircleIntersection(state.player.x, state.player.y, rayX, rayY, solid.circle);
        if (hit !== null && hit < nearest && hit <= FP_FAR) {
          nearest = hit;
          hitSolid = solid;
        }
      });
      for (var fillX = column; fillX < Math.min(VIEW_W, column + FP_RAY_STRIDE); fillX += 1) {
        fpDepthBuffer[fillX] = nearest;
      }
      if (!hitSolid) continue;
      var baseY = horizon + eyeHeight * FP_PROJECTION / nearest;
      var topY = baseY - hitSolid.height * FP_PROJECTION / nearest;
      ctx.fillStyle = fpWallColor(hitSolid.material, nearest, column);
      ctx.fillRect(column, Math.max(-220, topY), FP_RAY_STRIDE + 0.5, Math.min(VIEW_H + 220, baseY) - Math.max(-220, topY));
      if (hitSolid.material === "door" && Math.floor(column / 14) % 4 === 0) {
        ctx.fillStyle = "rgba(34,31,40,0.72)";
        ctx.fillRect(column, Math.max(0, topY + (baseY - topY) * 0.25), 2, Math.min(VIEW_H, (baseY - topY) * 0.55));
      }
      if (hitSolid.material === "thorn" && Math.floor(column / 11) % 3 === 0) {
        ctx.fillStyle = "rgba(142,184,78,0.8)";
        ctx.fillRect(column, Math.max(0, topY), 3, Math.max(8, Math.min(VIEW_H, baseY) - Math.max(0, topY)));
      }
    }
  }

  function drawFPPortalBillboard() {
    ctx.save();
    ctx.translate(portal.x, portal.y);
    var pulse = 0.8 + Math.sin(state.timeMs / 160) * 0.12;
    ctx.strokeStyle = "rgba(125,255,238," + pulse + ")";
    ctx.shadowColor = "#7fffee";
    ctx.shadowBlur = 20;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, -46, 35, 61, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(196,164,255,0.82)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, -46, 24, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(91,70,150,0.22)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawEntitySideOn(entity, drawFunction) {
    var facingX = entity.facingX;
    var facingY = entity.facingY;
    entity.facingX = 1;
    entity.facingY = 0;
    drawFunction();
    entity.facingX = facingX;
    entity.facingY = facingY;
  }

  function collectFPSprites() {
    var sprites = [];
    function add(x, y, radius, draw, raise, minVisualDepth, occlusionBias) {
      var cameraPoint = getFPCameraPoint(x, y);
      if (cameraPoint.depth <= FP_NEAR || cameraPoint.depth > FP_FAR) return;
      var halfView = cameraPoint.depth * Math.tan(FP_FOV / 2) + radius * 2;
      if (Math.abs(cameraPoint.lateral) > halfView) return;
      sprites.push({
        x: x,
        y: y,
        radius: radius,
        draw: draw,
        raise: raise || 0,
        depth: cameraPoint.depth,
        minVisualDepth: minVisualDepth || 150,
        occlusionBias: occlusionBias || 2
      });
    }
    trees.forEach(function (tree) {
      add(tree.x, tree.y, tree.r * 1.25, function () { drawTree(tree, false); }, 0, 175, 6);
    });
    ancientTrees.forEach(function (tree) {
      add(tree.x, tree.y, 92, function () { drawTree(tree, true); }, 0, 200, 6);
    });
    rocks.forEach(function (rock) {
      add(rock.x, rock.y, rock.r * 1.2, function () { drawRock(rock); }, 0, 155);
    });
    crystals.forEach(function (crystal) {
      add(crystal.x, crystal.y, 58, function () { drawCrystal(crystal); }, 0, 200);
    });
    add(diamond.x, diamond.y, 126, drawDiamondAndSeal, 0, 210);
    if (portal.active) add(portal.x, portal.y, 76, drawFPPortalBillboard, 0, 220);
    if (treasureMap.available && !treasureMap.collected) {
      add(treasureMap.x, treasureMap.y, 48, drawTreasureMap, 8, 150);
    }
    state.foodDrops.forEach(function (food) {
      if (!food.collected) add(food.x, food.y, 30, function () { drawFood(food); }, 10, 150);
    });
    if (state.secretRoomOpen) {
      royalFoods.forEach(function (food) {
        if (!food.collected) add(food.x, food.y, 38, function () { drawRoyalFood(food); }, 12, 145);
      });
    }
    rainbowFishSpots.forEach(function (fish) {
      if (!fish.caught) add(fish.x, fish.y, 48, function () { drawRainbowFish(fish); }, 13, 150);
    });
    weaponPickups.forEach(function (pickup) {
      if (isWeaponPickupVisible(pickup)) add(pickup.x, pickup.y, 48, function () { drawWeaponPickup(pickup); }, 10, 180);
    });
    state.monsters.forEach(function (monster) {
      if (!monster.defeated) {
        add(monster.x, monster.y, monster.id === "boswer" ? 92 : monster.r * 1.8, function () {
          drawEntitySideOn(monster, function () { drawMonster(monster); });
        }, 0, monster.id === "boswer" ? 240 : 160);
      }
    });
    state.horses.forEach(function (horse) {
      if (!horse.mounted) {
        add(horse.x, horse.y, 72, function () {
          drawEntitySideOn(horse, function () { drawHorse(horse, false); });
        }, 0, 165);
      }
    });
    state.villagers.forEach(function (villager) {
      add(villager.x, villager.y, 38, function () { drawVillager(villager); }, 0, 145);
    });
    add(wizard.x, wizard.y, 66, drawWizard, 0, 180);
    if (state.weather.tornado.phase !== "idle") {
      var tornado = state.weather.tornado;
      add(tornado.x, tornado.y, 145, drawTornadoWorld, 0, 280, 10);
    }
    state.arrows.forEach(function (arrow) {
      add(arrow.x, arrow.y, 18, function () {
        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.strokeStyle = "#6d4828";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();
        ctx.fillStyle = "#e5efec";
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(9, -5);
        ctx.lineTo(9, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }, 18, 180);
    });
    state.particles.forEach(function (particle) {
      add(particle.x, particle.y, 9, function () {
        var alpha = 1 - particle.age / particle.life;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(2.25, particle.size * 0.35 + 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }, 22, 240);
    });
    sprites.sort(function (a, b) { return b.depth - a.depth; });
    return sprites;
  }

  function drawProjectedFPSprite(sprite) {
    var projected = projectFPPoint(sprite.x, sprite.y, 0);
    if (!projected) return;
    var visualDepth = Math.max(sprite.minVisualDepth, projected.depth);
    projected.groundY = getFPHorizon() + getFPEyeHeight() * FP_PROJECTION / visualDepth;
    projected.scale = FP_PROJECTION / visualDepth;
    var halfWidth = Math.max(8, sprite.radius * projected.scale * 1.5);
    if (projected.x + halfWidth < 0 || projected.x - halfWidth > VIEW_W) return;
    var left = Math.max(0, Math.floor(projected.x - halfWidth));
    var right = Math.min(VIEW_W - 1, Math.ceil(projected.x + halfWidth));
    ctx.save();
    ctx.beginPath();
    var visibleStrip = false;
    for (var x = left; x <= right; x += FP_RAY_STRIDE) {
      if (projected.depth <= fpDepthBuffer[x] + sprite.occlusionBias) {
        ctx.rect(x, 0, FP_RAY_STRIDE + 1, VIEW_H);
        visibleStrip = true;
      }
    }
    if (!visibleStrip) {
      ctx.restore();
      return;
    }
    ctx.clip();
    ctx.globalAlpha = clamp(1.18 - projected.depth / FP_FAR, 0.26, 1);
    ctx.translate(projected.x, projected.groundY - sprite.raise * projected.scale);
    ctx.scale(projected.scale, projected.scale);
    ctx.translate(-sprite.x, -sprite.y);
    sprite.draw();
    ctx.restore();
  }

  function drawFPObjectiveMarker() {
    var target = getObjectiveTarget();
    if (!target) return;
    var projected = projectFPPoint(target.x, target.y, 112);
    if (!projected || projected.x < 20 || projected.x > VIEW_W - 20) return;
    var column = clamp(Math.round(projected.x), 0, VIEW_W - 1);
    if (projected.depth > fpDepthBuffer[column] + 18) return;
    var pulse = 8 + Math.sin(state.timeMs / 140) * 2;
    ctx.save();
    ctx.translate(projected.x, clamp(projected.y, 105, VIEW_H - 120));
    ctx.shadowColor = "#ffe66d";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    ctx.moveTo(0, -pulse);
    ctx.lineTo(pulse * 0.7, 0);
    ctx.lineTo(0, pulse);
    ctx.lineTo(-pulse * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawFirstPersonWorld() {
    drawFPSkyAndGround();
    drawFPWalls();
    collectFPSprites().forEach(drawProjectedFPSprite);
    drawFPObjectiveMarker();
  }

  function drawFPHandsAndWeapon() {
    if (state.mode === "title" || state.mode === "victory" || state.mapOpen || state.dialog) return;
    var girlHero = state.player.character === "girl";
    var sleeve = girlHero ? "#425fa2" : "#3c8656";
    var skin = "#e4bd8e";
    var bob = prefersReducedMotion ? 0 :
      (state.player.moving ? Math.sin(state.timeMs / 95) * 7 : Math.sin(state.timeMs / 420) * 2);
    var activeEffect = state.weaponEffects.length ? state.weaponEffects[state.weaponEffects.length - 1] : null;
    var effectProgress = activeEffect ? clamp(activeEffect.age / activeEffect.life, 0, 1) : 1;

    if (getMountedHorse()) {
      var horse = getMountedHorse();
      ctx.fillStyle = horse.mane;
      ctx.beginPath();
      ctx.moveTo(420, VIEW_H);
      ctx.lineTo(446, 500 + bob);
      ctx.lineTo(474, VIEW_H);
      ctx.moveTo(486, VIEW_H);
      ctx.lineTo(515, 500 + bob);
      ctx.lineTo(544, VIEW_H);
      ctx.fill();
      ctx.strokeStyle = "#6c4930";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(445, 540 + bob);
      ctx.quadraticCurveTo(480, 515 + bob, 516, 540 + bob);
      ctx.stroke();
    }

    if (state.player.swimming) {
      var waterLine = 500 + Math.sin(state.timeMs / 130) * 8;
      var water = ctx.createLinearGradient(0, waterLine, 0, VIEW_H);
      water.addColorStop(0, "rgba(110,218,231,0.38)");
      water.addColorStop(1, "rgba(42,127,161,0.72)");
      ctx.fillStyle = water;
      ctx.fillRect(0, waterLine, VIEW_W, VIEW_H - waterLine);
      ctx.strokeStyle = "rgba(218,255,255,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (var wx = 0; wx <= VIEW_W; wx += 60) {
        var waveY = waterLine + Math.sin(wx / 48 + state.timeMs / 160) * 6;
        if (wx === 0) ctx.moveTo(wx, waveY);
        else ctx.lineTo(wx, waveY);
      }
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = sleeve;
    ctx.beginPath();
    ctx.moveTo(180, VIEW_H + 25);
    ctx.lineTo(265, 493);
    ctx.lineTo(338, 522);
    ctx.lineTo(300, VIEW_H + 25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(329, 504, 28, 22, -0.25, 0, Math.PI * 2);
    ctx.fill();
    if (state.player.hasMagic) {
      var magicPulse = 11 + Math.sin(state.timeMs / 120) * 3;
      ctx.fillStyle = state.player.strongPowerUntil > state.timeMs ? "#ff6574" : "#7fffee";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(326, 476, magicPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = sleeve;
    ctx.beginPath();
    ctx.moveTo(780, VIEW_H + 25);
    ctx.lineTo(700, 493);
    ctx.lineTo(628, 522);
    ctx.lineTo(660, VIEW_H + 25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(696, 500, 29, 22, 0.25, 0, Math.PI * 2);
    ctx.fill();

    var weapon = state.player.selectedWeapon;
    ctx.save();
    if (activeEffect && activeEffect.type === weapon && weapon !== "rod" && weapon !== "bow") {
      var swing = Math.sin(effectProgress * Math.PI);
      ctx.translate(-swing * 85, -swing * 65);
      ctx.rotate(-swing * 0.6);
    }
    if (weapon === "sword") {
      ctx.strokeStyle = "#684625";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(698, 492);
      ctx.lineTo(650, 430);
      ctx.stroke();
      ctx.strokeStyle = "#d9eef1";
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(650, 430);
      ctx.lineTo(550, 276);
      ctx.stroke();
      ctx.strokeStyle = "#fff9d2";
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (weapon === "spear") {
      var thrust = activeEffect && activeEffect.type === "spear" ? Math.sin(effectProgress * Math.PI) * 80 : 0;
      ctx.strokeStyle = "#76502e";
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(718, 540);
      ctx.lineTo(518 - thrust, 305 - thrust * 0.25);
      ctx.stroke();
      ctx.fillStyle = "#e2ecea";
      ctx.beginPath();
      ctx.moveTo(498 - thrust, 278 - thrust * 0.25);
      ctx.lineTo(532 - thrust, 306 - thrust * 0.25);
      ctx.lineTo(505 - thrust, 318 - thrust * 0.25);
      ctx.closePath();
      ctx.fill();
    } else if (weapon === "bow") {
      ctx.strokeStyle = "#8a582e";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(650, 402, 92, -1.2, 1.2);
      ctx.stroke();
      ctx.strokeStyle = "#f1e7cf";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(684, 317);
      ctx.lineTo(650, 402);
      ctx.lineTo(684, 487);
      ctx.stroke();
      ctx.strokeStyle = "#6d4828";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(650, 402);
      ctx.lineTo(480, 402);
      ctx.stroke();
    } else if (weapon === "rod") {
      ctx.strokeStyle = "#80532c";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(708, 520);
      ctx.lineTo(580, 310);
      ctx.stroke();
      ctx.strokeStyle = "rgba(241,247,232,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(580, 310);
      ctx.quadraticCurveTo(540, 360, 512, 455);
      ctx.stroke();
      ctx.fillStyle = "#e95665";
      ctx.beginPath();
      ctx.arc(512, 455, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();

    state.magicWaves.forEach(function (wave) {
      var progress = wave.age / wave.life;
      ctx.strokeStyle = wave.strong ?
        "rgba(255,83,100," + (1 - progress) + ")" :
        "rgba(127,255,238," + (1 - progress) + ")";
      ctx.lineWidth = 8 * (1 - progress) + 2;
      ctx.beginPath();
      ctx.arc(VIEW_W / 2, VIEW_H / 2, 35 + progress * 260, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (!prefersReducedMotion && state.player.superSpeedUntil > state.timeMs) {
      ctx.strokeStyle = "rgba(171,150,255,0.38)";
      ctx.lineWidth = 3;
      for (var streak = 0; streak < 12; streak += 1) {
        var sy = 190 + ((streak * 47 + state.timeMs * 0.4) % 340);
        ctx.beginPath();
        ctx.moveTo((streak % 2) ? 0 : VIEW_W, sy);
        ctx.lineTo((streak % 2) ? 130 : VIEW_W - 130, sy + 18);
        ctx.stroke();
      }
    }
    if (state.player.strongPowerUntil > state.timeMs) {
      var aura = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 210, VIEW_W / 2, VIEW_H / 2, 560);
      aura.addColorStop(0, "rgba(255,83,100,0)");
      aura.addColorStop(1, "rgba(255,83,100,0.2)");
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (state.player.invulnerableUntil > state.timeMs) {
      ctx.fillStyle = "rgba(255,46,70," + (0.08 + Math.sin(state.timeMs / 55) * 0.06) + ")";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    ctx.save();
    ctx.translate(VIEW_W / 2, VIEW_H / 2 + 2);
    ctx.strokeStyle = "rgba(255,255,235,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-3, 0);
    ctx.moveTo(3, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, -3);
    ctx.moveTo(0, 3);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function visibleWorldPoint(x, y, margin) {
    return isInFirstPersonView(x, y, margin || 80);
  }

  function drawRoundedRect(x, y, w, h, radius, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function drawGround() {
    ctx.fillStyle = "#75b85c";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    ctx.fillStyle = "#508e4d";
    ctx.fillRect(720, 0, 1765, WORLD_H);
    ctx.fillStyle = "rgba(28, 84, 51, 0.32)";
    ctx.fillRect(850, 120, 1420, 2040);

    ctx.fillStyle = "#8a866c";
    ctx.fillRect(2668, 0, WORLD_W - 2668, WORLD_H);
    ctx.fillStyle = "rgba(83, 77, 94, 0.38)";
    ctx.fillRect(2790, 0, WORLD_W - 2790, WORLD_H);
    ctx.fillStyle = "rgba(179, 195, 202, 0.28)";
    ctx.beginPath();
    ctx.ellipse(3480, 350, 360, 285, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#83c86a";
    ctx.beginPath();
    ctx.ellipse(505, 1960, 430, 360, 0, 0, Math.PI * 2);
    ctx.fill();

    drawDirtPaths();
    drawDecorations();
    drawRiver();
    drawBridges();
    drawCliffs();
    drawCastle();
  }

  function drawDirtPaths() {
    routePaths.forEach(function (path) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (var i = 1; i < path.length; i += 1) ctx.lineTo(path[i].x, path[i].y);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(82, 61, 37, 0.22)";
      ctx.lineWidth = 88;
      ctx.stroke();
      ctx.strokeStyle = "#b49a62";
      ctx.lineWidth = 70;
      ctx.stroke();
      ctx.strokeStyle = "rgba(244, 220, 153, 0.22)";
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 22]);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawDecorations() {
    decorations.forEach(function (item) {
      if (!visibleWorldPoint(item.x, item.y, 20)) return;
      if (item.kind === "grass") {
        ctx.strokeStyle = item.tint > 0.5 ? "rgba(35, 103, 48, 0.55)" : "rgba(207, 229, 116, 0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(item.x, item.y + item.size);
        ctx.lineTo(item.x - item.size, item.y - item.size);
        ctx.moveTo(item.x, item.y + item.size);
        ctx.lineTo(item.x + item.size, item.y - item.size * 0.7);
        ctx.stroke();
      } else if (item.kind === "flower") {
        ctx.fillStyle = item.tint > 0.5 ? "#f8e889" : "#b9d5ff";
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff8bc";
        ctx.fillRect(item.x - 1, item.y - 1, 2, 2);
      } else {
        ctx.fillStyle = item.tint > 0.5 ? "rgba(48, 49, 57, 0.35)" : "rgba(225, 218, 199, 0.3)";
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function traceRiverPath() {
    ctx.beginPath();
    ctx.moveTo(riverX(-100), -100);
    for (var y = -60; y <= WORLD_H + 100; y += 34) ctx.lineTo(riverX(y), y);
  }

  function drawRiver() {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    traceRiverPath();
    ctx.strokeStyle = "#c2a86b";
    ctx.lineWidth = 178;
    ctx.stroke();
    traceRiverPath();
    ctx.strokeStyle = "#347f99";
    ctx.lineWidth = 142;
    ctx.stroke();
    traceRiverPath();
    ctx.strokeStyle = "#4ea8bd";
    ctx.lineWidth = 118;
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(181, 246, 244, 0.52)";
    for (var y = Math.floor(state.camera.y / 90) * 90 - 90; y < state.camera.y + VIEW_H + 100; y += 90) {
      var x = riverX(y);
      ctx.beginPath();
      ctx.moveTo(x - 45, y);
      ctx.quadraticCurveTo(x - 18, y - 8, x + 8, y);
      ctx.quadraticCurveTo(x + 34, y + 8, x + 54, y - 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBridges() {
    bridges.forEach(function (bridge) {
      if (!visibleWorldPoint(bridge.x, bridge.y, 210)) return;
      ctx.save();
      ctx.translate(bridge.x, bridge.y);
      ctx.fillStyle = "rgba(42, 28, 18, 0.32)";
      ctx.fillRect(-bridge.w / 2 + 8, -bridge.h / 2 + 10, bridge.w, bridge.h);
      ctx.fillStyle = "#7b4a27";
      ctx.fillRect(-bridge.w / 2, -bridge.h / 2, bridge.w, bridge.h);
      for (var x = -bridge.w / 2 + 4; x < bridge.w / 2; x += 25) {
        ctx.fillStyle = (Math.floor((x + bridge.w / 2) / 25) % 2) ? "#a66d38" : "#986032";
        ctx.fillRect(x, -bridge.h / 2 + 7, 21, bridge.h - 14);
        ctx.fillStyle = "rgba(255, 223, 152, 0.25)";
        ctx.fillRect(x + 3, -bridge.h / 2 + 10, 2, bridge.h - 20);
      }
      ctx.fillStyle = "#4c2d1d";
      ctx.fillRect(-bridge.w / 2, -bridge.h / 2 + 5, bridge.w, 9);
      ctx.fillRect(-bridge.w / 2, bridge.h / 2 - 14, bridge.w, 9);
      ctx.restore();
    });
  }

  function drawCliffs() {
    cliffs.forEach(function (cliff) {
      ctx.fillStyle = "#54515d";
      ctx.fillRect(cliff.x, cliff.y, cliff.w, cliff.h);
      ctx.fillStyle = "#77717a";
      ctx.fillRect(cliff.x + 15, cliff.y, 38, cliff.h);
      ctx.fillStyle = "rgba(211, 210, 199, 0.24)";
      for (var y = cliff.y + 24; y < cliff.y + cliff.h; y += 58) {
        ctx.beginPath();
        ctx.moveTo(cliff.x + 12, y);
        ctx.lineTo(cliff.x + 65, y - 15);
        ctx.lineTo(cliff.x + 115, y + 8);
        ctx.lineTo(cliff.x + cliff.w - 8, y - 10);
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(39, 38, 48, 0.45)";
        ctx.stroke();
      }
      ctx.fillStyle = "#423f4b";
      ctx.fillRect(cliff.x + cliff.w - 20, cliff.y, 20, cliff.h);
    });
  }

  function drawStoneWall(rect) {
    ctx.fillStyle = "#514f59";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = "#777580";
    ctx.fillRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 14);
    ctx.strokeStyle = "rgba(43, 42, 50, 0.52)";
    ctx.lineWidth = 2;
    for (var y = rect.y + 18; y < rect.y + rect.h - 5; y += 22) {
      ctx.beginPath();
      ctx.moveTo(rect.x + 5, y);
      ctx.lineTo(rect.x + rect.w - 5, y);
      ctx.stroke();
      var offset = (Math.floor((y - rect.y) / 22) % 2) * 22;
      for (var x = rect.x + 22 + offset; x < rect.x + rect.w; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, y - 21);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(218, 216, 204, 0.22)";
    ctx.fillRect(rect.x + 8, rect.y + 8, rect.w - 16, 5);
  }

  function drawCastle() {
    if (!visibleWorldPoint(castle.x + castle.w / 2, castle.y + castle.h / 2, 520)) return;
    ctx.save();
    ctx.fillStyle = "#77736c";
    ctx.fillRect(castle.x + 54, castle.y + 54, castle.w - 108, castle.h - 108);
    ctx.strokeStyle = "rgba(47, 45, 49, 0.32)";
    ctx.lineWidth = 2;
    for (var x = castle.x + 60; x < castle.x + castle.w - 55; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, castle.y + 55);
      ctx.lineTo(x, castle.y + castle.h - 55);
      ctx.stroke();
    }
    for (var y = castle.y + 60; y < castle.y + castle.h - 55; y += 42) {
      ctx.beginPath();
      ctx.moveTo(castle.x + 55, y);
      ctx.lineTo(castle.x + castle.w - 55, y);
      ctx.stroke();
    }
    castleWalls.forEach(drawStoneWall);
    secretRoomWalls.forEach(drawStoneWall);
    if (!state.secretRoomOpen) {
      ctx.fillStyle = "#65626d";
      ctx.fillRect(secretDoor.x, secretDoor.y, secretDoor.w, secretDoor.h);
      ctx.strokeStyle = "#2e2c34";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(secretDoor.x + 4, secretDoor.y + 8);
      ctx.lineTo(secretDoor.x + 19, secretDoor.y + 29);
      ctx.lineTo(secretDoor.x + 8, secretDoor.y + 50);
      ctx.lineTo(secretDoor.x + 23, secretDoor.y + 72);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#2f2c35";
      ctx.fillRect(secretDoor.x, secretDoor.y, secretDoor.w, secretDoor.h);
    }
    [[castle.x + 32, castle.y + 32], [castle.x + castle.w - 32, castle.y + 32],
      [castle.x + 32, castle.y + castle.h - 32], [castle.x + castle.w - 32, castle.y + castle.h - 32]].forEach(function (tower) {
      ctx.fillStyle = "#4c4a54";
      ctx.beginPath();
      ctx.arc(tower[0], tower[1], 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#898792";
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.fillStyle = "#6a6873";
      for (var i = 0; i < 8; i += 1) {
        var angle = i / 8 * Math.PI * 2;
        ctx.fillRect(tower[0] + Math.cos(angle) * 49 - 7, tower[1] + Math.sin(angle) * 49 - 7, 14, 14);
      }
    });
    ctx.fillStyle = "#7b2638";
    ctx.fillRect(castle.x + 325, castle.y + 64, 70, 100);
    ctx.fillStyle = "#e4c355";
    ctx.beginPath();
    ctx.moveTo(castle.x + 360, castle.y + 80);
    ctx.lineTo(castle.x + 382, castle.y + 110);
    ctx.lineTo(castle.x + 360, castle.y + 140);
    ctx.lineTo(castle.x + 338, castle.y + 110);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#352e37";
    ctx.fillRect(castle.x + 268, castle.y + castle.h - 70, 184, 70);
    ctx.fillStyle = "#a8783c";
    for (var bar = 0; bar < 5; bar += 1) {
      ctx.fillRect(castle.x + 284 + bar * 36, castle.y + castle.h - 68, 10, 20);
    }
    ctx.fillStyle = "rgba(255, 177, 71, 0.7)";
    ctx.shadowColor = "#ff9b45";
    ctx.shadowBlur = 14;
    [castle.x + 295, castle.x + 425].forEach(function (torchX) {
      ctx.beginPath();
      ctx.arc(torchX, castle.y + castle.h - 85, 8 + Math.sin(state.timeMs / 95 + torchX) * 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawTree(tree, ancient) {
    var size = tree.r;
    ctx.save();
    var windSway = state.weather.intensity * Math.sin(state.timeMs / 330 + tree.x * 0.017) * (ancient ? 3.5 : 2.3);
    ctx.translate(tree.x + windSway, tree.y);
    ctx.fillStyle = "rgba(20, 39, 27, 0.28)";
    ctx.beginPath();
    ctx.ellipse(8, size * 0.5, size * 0.78, size * 0.33, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ancient ? "#6d4b31" : "#64452d";
    ctx.fillRect(-size * 0.17, -4, size * 0.34, size * 0.78);
    ctx.fillStyle = ancient ? "#3d8663" : (tree.tint > 0.55 ? "#2f7649" : "#377f4a");
    var canopyY = -size * 0.46;
    [[-0.42, 0.02, 0.55], [0.42, 0.02, 0.55], [0, -0.35, 0.62], [0, 0.2, 0.62]].forEach(function (part, index) {
      ctx.beginPath();
      ctx.arc(part[0] * size, canopyY + part[1] * size, part[2] * size, 0, Math.PI * 2);
      ctx.fill();
      if (index < 3) {
        ctx.fillStyle = ancient ? "#4fa176" : "#4c9458";
      }
    });
    ctx.fillStyle = "rgba(183, 236, 152, 0.3)";
    ctx.beginPath();
    ctx.arc(-size * 0.22, canopyY - size * 0.26, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
    if (ancient) {
      var glow = tree.found ? 0.95 : 0.58 + Math.sin(state.timeMs / 260 + tree.x) * 0.2;
      ctx.strokeStyle = "rgba(119, 255, 242, " + glow + ")";
      ctx.lineWidth = tree.found ? 6 : 3;
      ctx.beginPath();
      ctx.moveTo(-12, -3);
      ctx.lineTo(0, 10);
      ctx.lineTo(13, -5);
      ctx.moveTo(0, 10);
      ctx.lineTo(0, 33);
      ctx.stroke();
      ctx.shadowColor = "#72fff0";
      ctx.shadowBlur = tree.found ? 22 : 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawRock(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.fillStyle = "rgba(29, 27, 36, 0.32)";
    ctx.beginPath();
    ctx.ellipse(7, rock.r * 0.48, rock.r * 0.92, rock.r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-rock.r, rock.r * 0.28);
    ctx.lineTo(-rock.r * 0.6, -rock.r * 0.62);
    ctx.lineTo(rock.r * 0.18, -rock.r);
    ctx.lineTo(rock.r, -rock.r * 0.2);
    ctx.lineTo(rock.r * 0.75, rock.r * 0.55);
    ctx.closePath();
    ctx.fillStyle = rock.tint > 0.5 ? "#67636e" : "#77717b";
    ctx.fill();
    ctx.fillStyle = "rgba(222, 226, 220, 0.25)";
    ctx.beginPath();
    ctx.moveTo(-rock.r * 0.56, -rock.r * 0.5);
    ctx.lineTo(rock.r * 0.14, -rock.r * 0.82);
    ctx.lineTo(rock.r * 0.34, -rock.r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawThornGate() {
    if (state.gateCleared) return;
    ctx.save();
    ctx.translate(thornGate.x + thornGate.w / 2, thornGate.y + thornGate.h / 2);
    ctx.strokeStyle = "#27482c";
    ctx.lineWidth = 11;
    for (var i = -4; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-36 + i * 9, -thornGate.h / 2);
      ctx.bezierCurveTo(28 - i * 5, -62, -30 + i * 5, 48, 34 - i * 8, thornGate.h / 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#86b44d";
    for (var t = 0; t < 17; t += 1) {
      var ty = -thornGate.h / 2 + 18 + t * 16;
      var tx = Math.sin(t * 1.7) * 30;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - 12, ty - 5);
      ctx.lineTo(tx - 6, ty + 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCrystal(crystal) {
    ctx.save();
    ctx.translate(crystal.x, crystal.y);
    var pulse = 0.75 + Math.sin(state.timeMs / 230 + crystal.x) * 0.15;
    if (crystal.lit) {
      ctx.shadowColor = crystal.color;
      ctx.shadowBlur = 30;
      ctx.fillStyle = crystal.color;
    } else {
      ctx.fillStyle = "#56636e";
      ctx.strokeStyle = "rgba(185, 206, 217, 0.55)";
    }
    ctx.beginPath();
    ctx.moveTo(0, -47);
    ctx.lineTo(25, -8);
    ctx.lineTo(16, 33);
    ctx.lineTo(-17, 33);
    ctx.lineTo(-25, -8);
    ctx.closePath();
    ctx.fill();
    if (!crystal.lit) ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = crystal.lit ? "rgba(255,255,255," + pulse + ")" : "rgba(230,240,244,0.2)";
    ctx.beginPath();
    ctx.moveTo(-4, -37);
    ctx.lineTo(7, -8);
    ctx.lineTo(1, 16);
    ctx.lineTo(-8, -5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#403d49";
    ctx.beginPath();
    ctx.ellipse(0, 37, 37, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDiamondAndSeal() {
    ctx.save();
    ctx.translate(diamond.x, diamond.y);
    if (!state.sealOpen) {
      ctx.strokeStyle = "rgba(156, 184, 255, 0.72)";
      ctx.lineWidth = 9;
      ctx.setLineDash([12, 11]);
      ctx.beginPath();
      ctx.arc(0, 0, 118, state.timeMs / 1000, state.timeMs / 1000 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(50, 53, 77, 0.45)";
      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#5d5969";
    ctx.beginPath();
    ctx.ellipse(0, 34, 58, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8d8793";
    ctx.beginPath();
    ctx.ellipse(0, 24, 49, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!diamond.collected && state.sealOpen) {
      var bob = Math.sin(state.timeMs / 260) * 7;
      ctx.translate(0, bob - 25);
      ctx.shadowColor = "#6ff7ff";
      ctx.shadowBlur = 30;
      ctx.fillStyle = "#8ff7ff";
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(27, -7);
      ctx.lineTo(15, 28);
      ctx.lineTo(0, 39);
      ctx.lineTo(-15, 28);
      ctx.lineTo(-27, -7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.beginPath();
      ctx.moveTo(-4, -27);
      ctx.lineTo(12, -7);
      ctx.lineTo(1, 14);
      ctx.lineTo(-11, -7);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawPortal() {
    if (!portal.active) return;
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(state.timeMs / 1100);
    ctx.strokeStyle = "rgba(125, 255, 238, 0.86)";
    ctx.shadowColor = "#7fffee";
    ctx.shadowBlur = 22;
    ctx.lineWidth = 8;
    ctx.setLineDash([17, 10]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 49, 25, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-state.timeMs / 560);
    ctx.strokeStyle = "rgba(196, 164, 255, 0.78)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 17, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawWizard() {
    ctx.save();
    ctx.translate(wizard.x, wizard.y);
    ctx.fillStyle = "rgba(19, 29, 22, 0.32)";
    ctx.beginPath();
    ctx.ellipse(4, 24, 29, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6c42a8";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-30, 30);
    ctx.lineTo(31, 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9465d0";
    ctx.fillRect(-18, -13, 36, 30);
    ctx.fillStyle = "#efd0a7";
    ctx.beginPath();
    ctx.arc(0, -27, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0ecdf";
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.lineTo(0, 8);
    ctx.lineTo(13, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4d2b76";
    ctx.beginPath();
    ctx.moveTo(-31, -36);
    ctx.lineTo(4, -78);
    ctx.lineTo(27, -35);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-29, -39, 55, 9);
    ctx.strokeStyle = "#684625";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(27, -29);
    ctx.lineTo(38, 29);
    ctx.stroke();
    var glow = 0.65 + Math.sin(state.timeMs / 220) * 0.2;
    ctx.fillStyle = "rgba(126,255,240," + glow + ")";
    ctx.shadowColor = "#7fffee";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(24, -32, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawVillager(villager) {
    ctx.save();
    ctx.translate(villager.x, villager.y + Math.sin(state.timeMs / 260 + villager.phase) * 1.3);
    ctx.fillStyle = "rgba(20,29,23,0.28)";
    ctx.beginPath();
    ctx.ellipse(2, 18, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = villager.color;
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.lineTo(-16, 21);
    ctx.lineTo(17, 21);
    ctx.lineTo(13, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e4bd8e";
    ctx.beginPath();
    ctx.arc(0, -14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = villager.hair;
    ctx.beginPath();
    ctx.arc(-2, -18, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#26313a";
    ctx.beginPath();
    ctx.arc(villager.facingX >= 0 ? 6 : -6, -14, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1d36d";
    ctx.fillRect(-13, 7, 27, 4);
    ctx.restore();
  }

  function drawHorse(horse, underPlayer) {
    ctx.save();
    ctx.translate(horse.x, horse.y);
    var angle = Math.atan2(horse.facingY, horse.facingX);
    ctx.rotate(angle);
    var bob = Math.sin(state.timeMs / (horse.mounted ? 80 : 210) + horse.phase) * (horse.mounted ? 2.5 : 1.2);
    ctx.translate(0, bob);
    ctx.fillStyle = "rgba(20, 25, 22, 0.28)";
    ctx.beginPath();
    ctx.ellipse(-4, 18, 38, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = horse.mane;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-30, -4);
    ctx.quadraticCurveTo(-48, -13, -51, 5);
    ctx.stroke();
    ctx.fillStyle = horse.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 37, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(33, -13, 17, 12, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = horse.mane;
    ctx.beginPath();
    ctx.moveTo(14, -18);
    ctx.lineTo(29, -31);
    ctx.lineTo(34, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#151515";
    ctx.beginPath();
    ctx.arc(40, -16, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = horse.color;
    ctx.lineWidth = 7;
    [-20, 18].forEach(function (legX) {
      ctx.beginPath();
      ctx.moveTo(legX, 10);
      ctx.lineTo(legX - 2, 29);
      ctx.stroke();
    });
    if (horse.fed) {
      ctx.fillStyle = "#ff8fc4";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("♥", -8, -27);
    }
    ctx.restore();
  }

  function drawMonster(monster) {
    if (monster.type === "boswer") {
      drawBoswer(monster);
      return;
    }
    var hurt = monster.hurtUntil > state.timeMs;
    ctx.save();
    ctx.translate(monster.x, monster.y);
    var angle = Math.atan2(monster.facingY, monster.facingX);
    ctx.rotate(angle);
    var bob = Math.sin(state.timeMs / 125 + monster.phase) * 3;
    ctx.translate(0, bob);
    ctx.fillStyle = "rgba(13, 9, 20, 0.35)";
    ctx.beginPath();
    ctx.ellipse(-2, 19, monster.r * 1.35, monster.r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hurt ? "#91fff1" : "#332743";
    ctx.lineWidth = 7;
    for (var leg = -1; leg <= 1; leg += 1) {
      ctx.beginPath();
      ctx.moveTo(-5, 8 + leg * 7);
      ctx.quadraticCurveTo(-monster.r - 9, 15 + leg * 12, -monster.r - 13, 24 + leg * 8);
      ctx.stroke();
    }
    ctx.fillStyle = hurt ? "#8bf5e7" : (monster.type === "maw" ? "#382443" : "#29223a");
    ctx.beginPath();
    ctx.ellipse(0, 0, monster.r * 1.2, monster.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#18121f";
    ctx.beginPath();
    ctx.moveTo(-monster.r * 0.55, -monster.r * 0.68);
    ctx.lineTo(-monster.r * 0.15, -monster.r * 1.48);
    ctx.lineTo(monster.r * 0.05, -monster.r * 0.65);
    ctx.moveTo(monster.r * 0.32, -monster.r * 0.67);
    ctx.lineTo(monster.r * 0.72, -monster.r * 1.35);
    ctx.lineTo(monster.r * 0.83, -monster.r * 0.42);
    ctx.fill();
    ctx.fillStyle = "#ffe66f";
    ctx.shadowColor = "#ffe66f";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(monster.r * 0.26, -5, 4, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(monster.r * 0.66, -4, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#100b16";
    ctx.beginPath();
    ctx.ellipse(monster.r * 0.55, 9, monster.r * 0.46, monster.type === "maw" ? 10 : 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1e9d4";
    for (var tooth = -1; tooth <= 1; tooth += 1) {
      ctx.beginPath();
      ctx.moveTo(monster.r * 0.38 + tooth * 7, 4);
      ctx.lineTo(monster.r * 0.43 + tooth * 7, 12);
      ctx.lineTo(monster.r * 0.49 + tooth * 7, 4);
      ctx.closePath();
      ctx.fill();
    }
    if (monster.hp < monster.maxHp) {
      ctx.fillStyle = "rgba(10,10,14,0.72)";
      ctx.fillRect(-23, -monster.r - 22, 46, 6);
      ctx.fillStyle = "#ff6077";
      ctx.fillRect(-22, -monster.r - 21, 44 * (monster.hp / monster.maxHp), 4);
    }
    ctx.restore();
  }

  function drawBoswer(monster) {
    var hurt = monster.hurtUntil > state.timeMs;
    ctx.save();
    ctx.translate(monster.x, monster.y + Math.sin(state.timeMs / 150) * 2);
    var angle = Math.atan2(monster.facingY, monster.facingX);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(20, 12, 14, 0.38)";
    ctx.beginPath();
    ctx.ellipse(-4, 31, 55, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hurt ? "#8ff7e9" : "#773540";
    ctx.beginPath();
    ctx.ellipse(-7, 0, 48, 37, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3c4b38";
    ctx.beginPath();
    ctx.ellipse(-19, -6, 38, 31, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d8d0b7";
    ctx.lineWidth = 5;
    for (var spike = -2; spike <= 2; spike += 1) {
      ctx.beginPath();
      ctx.moveTo(-26 + spike * 12, -28);
      ctx.lineTo(-20 + spike * 12, -52 + Math.abs(spike) * 5);
      ctx.lineTo(-12 + spike * 12, -27);
      ctx.stroke();
    }
    ctx.fillStyle = hurt ? "#8ff7e9" : "#a94842";
    ctx.beginPath();
    ctx.ellipse(35, -9, 29, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dac36a";
    ctx.beginPath();
    ctx.moveTo(22, -25);
    ctx.lineTo(27, -50);
    ctx.lineTo(38, -25);
    ctx.moveTo(44, -25);
    ctx.lineTo(55, -46);
    ctx.lineTo(59, -18);
    ctx.fill();
    ctx.fillStyle = "#ffe66d";
    ctx.shadowColor = "#ffad45";
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(44, -15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#21151a";
    ctx.beginPath();
    ctx.ellipse(57, 1, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3ead7";
    for (var tooth = 0; tooth < 3; tooth += 1) {
      ctx.beginPath();
      ctx.moveTo(49 + tooth * 8, -5);
      ctx.lineTo(53 + tooth * 8, 5);
      ctx.lineTo(57 + tooth * 8, -4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = hurt ? "#8ff7e9" : "#773540";
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(-22, 24);
    ctx.lineTo(-30, 48);
    ctx.moveTo(15, 23);
    ctx.lineTo(22, 48);
    ctx.stroke();
    ctx.rotate(-angle);
    ctx.fillStyle = "rgba(11, 10, 14, 0.82)";
    ctx.fillRect(-58, -78, 116, 11);
    ctx.fillStyle = "#ff596e";
    ctx.fillRect(-56, -76, 112 * Math.max(0, monster.hp / monster.maxHp), 7);
    ctx.font = "900 16px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe87e";
    ctx.strokeStyle = "#21151a";
    ctx.lineWidth = 4;
    ctx.strokeText("BOSWER", 0, -92);
    ctx.fillText("BOSWER", 0, -92);
    ctx.restore();
  }

  function drawTreasureMap() {
    if (!treasureMap.available || treasureMap.collected) return;
    var bob = Math.sin(state.timeMs / 190) * 5;
    ctx.save();
    ctx.translate(treasureMap.x, treasureMap.y + bob);
    ctx.shadowColor = "#ffd873";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ead08b";
    ctx.fillRect(-25, -19, 50, 38);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#8a5a2c";
    ctx.lineWidth = 3;
    ctx.strokeRect(-25, -19, 50, 38);
    ctx.strokeStyle = "#866239";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 11);
    ctx.quadraticCurveTo(-5, -8, 8, 5);
    ctx.quadraticCurveTo(13, 10, 19, -9);
    ctx.stroke();
    ctx.strokeStyle = "#bb3c3c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(9, -13);
    ctx.lineTo(19, -3);
    ctx.moveTo(19, -13);
    ctx.lineTo(9, -3);
    ctx.stroke();
    ctx.restore();
  }

  function drawFood(food) {
    var bob = Math.sin(state.timeMs / 180 + food.bob) * 4;
    ctx.save();
    ctx.translate(food.x, food.y + bob);
    ctx.fillStyle = "rgba(20,20,18,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(-0.35);
    ctx.fillStyle = "#cf5d45";
    ctx.beginPath();
    ctx.ellipse(-4, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1d4a2";
    ctx.fillRect(8, -4, 16, 8);
    ctx.beginPath();
    ctx.arc(25, -4, 5, 0, Math.PI * 2);
    ctx.arc(25, 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRoyalFood(food) {
    var bob = Math.sin(state.timeMs / 210 + food.x) * 3;
    ctx.save();
    ctx.translate(food.x, food.y + bob);
    ctx.fillStyle = "rgba(22,17,12,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "#ffd873";
    ctx.shadowBlur = 13;
    ctx.font = "34px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(food.icon, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawRainbowFish(fish) {
    var swim = Math.sin(state.timeMs / 210 + fish.phase) * 8;
    ctx.save();
    ctx.translate(fish.x + swim, fish.y);
    ctx.rotate(Math.sin(state.timeMs / 700 + fish.phase) * 0.22);
    ctx.shadowColor = "#9d8cff";
    ctx.shadowBlur = 15;
    var gradient = ctx.createLinearGradient(-25, 0, 25, 0);
    gradient.addColorStop(0, "#ff6f91");
    gradient.addColorStop(0.25, "#ffd86f");
    gradient.addColorStop(0.5, "#72e58d");
    gradient.addColorStop(0.75, "#67c9ff");
    gradient.addColorStop(1, "#bb79ff");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-36, -14);
    ctx.lineTo(-34, 14);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(12, -3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#172033";
    ctx.beginPath();
    ctx.arc(13, -3, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(213,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 16, 30, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawWeaponPickup(pickup) {
    var info = WEAPON_INFO[pickup.id];
    var bob = Math.sin(state.timeMs / 190 + pickup.x) * 5;
    ctx.save();
    ctx.translate(pickup.x, pickup.y + bob);
    ctx.fillStyle = "rgba(18,20,18,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 27, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "#ffe180";
    ctx.shadowBlur = 17;
    ctx.font = "38px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(info.icon, 0, -2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(15,31,22,0.84)";
    ctx.fillRect(-34, 27, 68, 18);
    ctx.fillStyle = "#fff0a0";
    ctx.font = "800 10px Trebuchet MS, sans-serif";
    ctx.fillText(info.name.toUpperCase(), 0, 36);
    ctx.restore();
  }

  function drawPlayer() {
    var mounted = getMountedHorse();
    var girlHero = state.player.character === "girl";
    var blink = state.player.invulnerableUntil > state.timeMs && Math.floor(state.timeMs / 80) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    if (state.player.strongPowerUntil > state.timeMs) {
      ctx.save();
      ctx.translate(state.player.x, state.player.y);
      ctx.strokeStyle = "rgba(255, 83, 100, " + (0.55 + Math.sin(state.timeMs / 90) * 0.2) + ")";
      ctx.shadowColor = "#ff5364";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 29 + Math.sin(state.timeMs / 120) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (state.player.swimming) {
      ctx.save();
      ctx.translate(state.player.x, state.player.y);
      ctx.strokeStyle = "rgba(211,250,255,0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 10, 31 + Math.sin(state.timeMs / 120) * 4, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = girlHero ? "#425fa2" : "#3c8656";
      ctx.beginPath();
      ctx.ellipse(0, 6, 17, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e4bd8e";
      ctx.beginPath();
      ctx.arc(0, -6, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = girlHero ? "#b9783f" : "#6a3e25";
      ctx.beginPath();
      ctx.arc(-3, -10, 9, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#132039";
      ctx.beginPath();
      ctx.arc(7, -6, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.save();
    ctx.translate(state.player.x, state.player.y - (mounted ? 17 : 0));
    var angle = Math.atan2(state.player.facingY, state.player.facingX);
    ctx.rotate(angle);
    if (!mounted) {
      ctx.fillStyle = "rgba(20, 31, 25, 0.3)";
      ctx.beginPath();
      ctx.ellipse(-2, 19, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (girlHero) {
      ctx.fillStyle = "#b9783f";
      ctx.beginPath();
      ctx.arc(-9, -17, 10, 0, Math.PI * 2);
      ctx.arc(-13, -7, 6, 0, Math.PI * 2);
      ctx.arc(-15, 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = girlHero ? "#425fa2" : "#3c8656";
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.lineTo(-15, 24);
    ctx.lineTo(16, 24);
    ctx.lineTo(18, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e4bd8e";
    ctx.beginPath();
    ctx.arc(0, -13, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = girlHero ? "#b9783f" : "#6a3e25";
    ctx.beginPath();
    ctx.arc(-4, -18, 11, Math.PI, Math.PI * 2);
    ctx.fill();
    if (!girlHero) {
      ctx.fillStyle = "#2e7149";
      ctx.beginPath();
      ctx.moveTo(-11, -22);
      ctx.lineTo(-34, -17);
      ctx.lineTo(-13, -8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = "#f0ca55";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-4, -18, 12, 0.15, 1.05);
      ctx.stroke();
    }
    ctx.fillStyle = "#132039";
    ctx.beginPath();
    ctx.arc(8, -13, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3d55d";
    ctx.fillRect(-15, 7, 30, 6);
    ctx.strokeStyle = "#d7edf2";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(27, -12);
    ctx.stroke();
    ctx.fillStyle = "#7fffee";
    ctx.shadowColor = "#7fffee";
    ctx.shadowBlur = state.player.hasMagic ? 12 : 0;
    ctx.beginPath();
    ctx.arc(29, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (state.diamondCollected) {
      ctx.fillStyle = "#8ff7ff";
      ctx.beginPath();
      ctx.moveTo(-15, -28);
      ctx.lineTo(-9, -21);
      ctx.lineTo(-15, -14);
      ctx.lineTo(-21, -21);
      ctx.closePath();
      ctx.fill();
    }
    if (state.player.selectedWeapon) {
      ctx.fillStyle = "#fff2ae";
      ctx.font = "17px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(WEAPON_INFO[state.player.selectedWeapon].icon, -18, 4);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawEffects() {
    state.magicWaves.forEach(function (wave) {
      var t = wave.age / wave.life;
      ctx.strokeStyle = wave.strong ?
        "rgba(255,83,100," + (1 - t) + ")" :
        "rgba(121,255,238," + (1 - t) + ")";
      ctx.lineWidth = 7 * (1 - t) + 2;
      ctx.shadowColor = wave.strong ? "#ff5364" : "#74fff0";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, 20 + t * (wave.range || MAGIC_RANGE), 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
    state.arrows.forEach(function (arrow) {
      var angle = Math.atan2(arrow.vy, arrow.vx);
      ctx.save();
      ctx.translate(arrow.x, arrow.y);
      ctx.rotate(angle);
      ctx.strokeStyle = "#6d4828";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();
      ctx.fillStyle = "#dce7e4";
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(8, -5);
      ctx.lineTo(8, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    state.weaponEffects.forEach(function (effect) {
      var t = effect.age / effect.life;
      ctx.save();
      if (effect.type === "rod") {
        ctx.strokeStyle = "rgba(236,245,222," + (1 - t) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(effect.x, effect.y);
        ctx.quadraticCurveTo(
          (effect.x + effect.targetX) / 2,
          Math.min(effect.y, effect.targetY) - 75 * (1 - t),
          effect.targetX,
          effect.targetY
        );
        ctx.stroke();
        ctx.fillStyle = "#e94f5f";
        ctx.beginPath();
        ctx.arc(effect.targetX, effect.targetY, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.translate(effect.x, effect.y);
        ctx.rotate(Math.atan2(effect.dy, effect.dx));
        ctx.strokeStyle = effect.strong ?
          "rgba(255,83,100," + (1 - t) + ")" :
          "rgba(255,232,151," + (1 - t) + ")";
        ctx.shadowColor = effect.strong ? "#ff5364" : "#ffe897";
        ctx.shadowBlur = 10;
        ctx.lineWidth = effect.type === "spear" ? 7 : 6;
        ctx.beginPath();
        if (effect.type === "sword") {
          ctx.arc(0, 0, 70, -0.78, 0.78);
        } else if (effect.type === "spear") {
          ctx.moveTo(22, 0);
          ctx.lineTo(138 * (1 - t * 0.35), 0);
        } else {
          ctx.arc(0, 0, 31, -0.4, 0.4);
        }
        ctx.stroke();
      }
      ctx.restore();
    });
    state.particles.forEach(function (particle) {
      var alpha = 1 - particle.age / particle.life;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawWorldEntities() {
    var drawables = [];
    trees.forEach(function (tree) {
      if (visibleWorldPoint(tree.x, tree.y, tree.r + 50)) {
        drawables.push({ y: tree.y, draw: function () { drawTree(tree, false); } });
      }
    });
    ancientTrees.forEach(function (tree) {
      if (visibleWorldPoint(tree.x, tree.y, 110)) {
        drawables.push({ y: tree.y, draw: function () { drawTree(tree, true); } });
      }
    });
    rocks.forEach(function (rock) {
      if (visibleWorldPoint(rock.x, rock.y, rock.r + 30)) {
        drawables.push({ y: rock.y, draw: function () { drawRock(rock); } });
      }
    });
    crystals.forEach(function (crystal) {
      if (visibleWorldPoint(crystal.x, crystal.y, 80)) {
        drawables.push({ y: crystal.y, draw: function () { drawCrystal(crystal); } });
      }
    });
    if (visibleWorldPoint(diamond.x, diamond.y, 170)) {
      drawables.push({ y: diamond.y + 30, draw: drawDiamondAndSeal });
    }
    if (portal.active && visibleWorldPoint(portal.x, portal.y, 90)) {
      drawables.push({ y: portal.y, draw: drawPortal });
    }
    if (treasureMap.available && !treasureMap.collected && visibleWorldPoint(treasureMap.x, treasureMap.y, 60)) {
      drawables.push({ y: treasureMap.y, draw: drawTreasureMap });
    }
    state.foodDrops.forEach(function (food) {
      if (!food.collected && visibleWorldPoint(food.x, food.y, 45)) {
        drawables.push({ y: food.y, draw: function () { drawFood(food); } });
      }
    });
    if (state.secretRoomOpen) {
      royalFoods.forEach(function (food) {
        if (!food.collected && visibleWorldPoint(food.x, food.y, 45)) {
          drawables.push({ y: food.y, draw: function () { drawRoyalFood(food); } });
        }
      });
    }
    rainbowFishSpots.forEach(function (fish) {
      if (!fish.caught && visibleWorldPoint(fish.x, fish.y, 55)) {
        drawables.push({ y: fish.y, draw: function () { drawRainbowFish(fish); } });
      }
    });
    weaponPickups.forEach(function (pickup) {
      if (isWeaponPickupVisible(pickup) && visibleWorldPoint(pickup.x, pickup.y, 60)) {
        drawables.push({ y: pickup.y, draw: function () { drawWeaponPickup(pickup); } });
      }
    });
    state.monsters.forEach(function (monster) {
      if (!monster.defeated && visibleWorldPoint(monster.x, monster.y, 70)) {
        drawables.push({ y: monster.y, draw: function () { drawMonster(monster); } });
      }
    });
    state.horses.forEach(function (horse) {
      if (!horse.mounted && visibleWorldPoint(horse.x, horse.y, 80)) {
        drawables.push({ y: horse.y, draw: function () { drawHorse(horse, false); } });
      }
    });
    state.villagers.forEach(function (villager) {
      if (visibleWorldPoint(villager.x, villager.y, 50)) {
        drawables.push({ y: villager.y, draw: function () { drawVillager(villager); } });
      }
    });
    if (visibleWorldPoint(wizard.x, wizard.y, 100)) {
      drawables.push({ y: wizard.y, draw: drawWizard });
    }
    var mounted = getMountedHorse();
    if (mounted) {
      drawables.push({ y: state.player.y - 2, draw: function () { drawHorse(mounted, true); } });
    }
    drawables.push({ y: state.player.y + 1, draw: drawPlayer });
    drawables.sort(function (a, b) { return a.y - b.y; });
    drawables.forEach(function (item) { item.draw(); });
    drawThornGate();
    drawEffects();
  }

  function drawHeart(x, y, filled, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale || 0.9, scale || 0.9);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-17, -4, -15, -18, -4, -18);
    ctx.bezierCurveTo(3, -18, 6, -13, 7, -10);
    ctx.bezierCurveTo(9, -14, 13, -18, 19, -18);
    ctx.bezierCurveTo(31, -18, 31, -3, 14, 8);
    ctx.lineTo(7, 14);
    ctx.closePath();
    ctx.fillStyle = filled ? "#ff5f73" : "rgba(22, 25, 25, 0.55)";
    ctx.fill();
    ctx.strokeStyle = filled ? "#ffd0d7" : "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawMiniMap() {
    var mapX = 790;
    var mapY = 76;
    var mapW = 151;
    var mapH = 94;
    drawRoundedRect(mapX, mapY, mapW, mapH, 12, "rgba(10,27,20,0.72)", "rgba(225,255,229,0.38)");
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mapX + 5, mapY + 5, mapW - 10, mapH - 10, 8);
    ctx.clip();
    ctx.fillStyle = "#5f9b50";
    ctx.fillRect(mapX + 5, mapY + 5, mapW - 10, mapH - 10);
    ctx.fillStyle = "#67636e";
    var mountainStart = mapX + 5 + (2668 / WORLD_W) * (mapW - 10);
    ctx.fillRect(mountainStart, mapY + 5, mapX + mapW - 5 - mountainStart, mapH - 10);
    ctx.fillStyle = "#45434d";
    ctx.fillRect(
      mapX + 5 + (castle.x / WORLD_W) * (mapW - 10),
      mapY + 5 + (castle.y / WORLD_H) * (mapH - 10),
      Math.max(7, (castle.w / WORLD_W) * (mapW - 10)),
      Math.max(7, (castle.h / WORLD_H) * (mapH - 10))
    );
    ctx.strokeStyle = "#55c4db";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (var y = 0; y <= WORLD_H; y += 160) {
      var mx = mapX + 5 + (riverX(y) / WORLD_W) * (mapW - 10);
      var my = mapY + 5 + (y / WORLD_H) * (mapH - 10);
      if (y === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.stroke();
    if (!state.hasMap) {
      ctx.fillStyle = "rgba(39,37,48,0.72)";
      ctx.fillRect(mountainStart, mapY + 5, mapX + mapW - 5 - mountainStart, mapH - 10);
    }
    var target = getObjectiveTarget();
    if (target) {
      var tx = mapX + 5 + (target.x / WORLD_W) * (mapW - 10);
      var ty = mapY + 5 + (target.y / WORLD_H) * (mapH - 10);
      ctx.fillStyle = "#ffe96d";
      ctx.beginPath();
      ctx.arc(tx, ty, 4 + Math.sin(state.timeMs / 150) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    var px = mapX + 5 + (state.player.x / WORLD_W) * (mapW - 10);
    var py = mapY + 5 + (state.player.y / WORLD_H) * (mapH - 10);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(state.player.facingY, state.player.facingX));
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#19334a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = "#dceee1";
    ctx.font = "700 10px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VALLEY MAP", mapX + mapW / 2, mapY + mapH + 13);
  }

  function drawFullMapOverlay() {
    var panelX = 58;
    var panelY = 42;
    var panelW = 844;
    var panelH = 516;
    var mapX = 86;
    var mapY = 104;
    var mapW = 788;
    var mapH = 390;
    ctx.save();
    ctx.fillStyle = "rgba(3,12,9,0.84)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawRoundedRect(panelX, panelY, panelW, panelH, 22, "rgba(15,38,27,0.97)", "rgba(156,231,176,0.7)");
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff0a0";
    ctx.font = "900 30px Georgia, serif";
    ctx.fillText("VALLEY MAP", VIEW_W / 2, 70);
    ctx.fillStyle = "#b9dfc1";
    ctx.font = "800 13px Trebuchet MS, sans-serif";
    ctx.fillText("The white arrow is you • Yellow light is your next goal", VIEW_W / 2, 91);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapW, mapH, 14);
    ctx.clip();
    ctx.fillStyle = "#6da657";
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.fillStyle = "#427a49";
    ctx.fillRect(mapX + mapW * 0.15, mapY, mapW * 0.53, mapH);
    ctx.fillStyle = "#77727a";
    ctx.fillRect(mapX + mapW * (2668 / WORLD_W), mapY, mapW * (1 - 2668 / WORLD_W), mapH);

    ctx.fillStyle = "#484650";
    ctx.fillRect(
      mapX + mapW * (castle.x / WORLD_W),
      mapY + mapH * (castle.y / WORLD_H),
      mapW * (castle.w / WORLD_W),
      mapH * (castle.h / WORLD_H)
    );

    ctx.strokeStyle = "#47a9c2";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (var y = 0; y <= WORLD_H; y += 70) {
      var riverMapX = mapX + mapW * (riverX(y) / WORLD_W);
      var riverMapY = mapY + mapH * (y / WORLD_H);
      if (y === 0) ctx.moveTo(riverMapX, riverMapY);
      else ctx.lineTo(riverMapX, riverMapY);
    }
    ctx.stroke();

    ctx.fillStyle = "#a56b38";
    bridges.forEach(function (bridge) {
      ctx.fillRect(
        mapX + mapW * ((bridge.x - bridge.w / 2) / WORLD_W),
        mapY + mapH * ((bridge.y - bridge.h / 2) / WORLD_H),
        mapW * (bridge.w / WORLD_W),
        Math.max(8, mapH * (bridge.h / WORLD_H))
      );
    });

    function mapMarker(worldX, worldY, color, radius) {
      var x = mapX + mapW * (worldX / WORLD_W);
      var y = mapY + mapH * (worldY / WORLD_H);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius || 6, 0, Math.PI * 2);
      ctx.fill();
      return { x: x, y: y };
    }

    var asterMarker = mapMarker(wizard.x, wizard.y, "#b68cff", 7);
    ctx.fillStyle = "#f4eefc";
    ctx.font = "800 12px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Aster", asterMarker.x + 10, asterMarker.y + 4);

    ancientTrees.forEach(function (tree) {
      mapMarker(tree.x, tree.y, tree.found ? "#82fff1" : "#b5e487", 7);
    });
    mapMarker(castle.x + castle.w / 2, castle.y + castle.h / 2, "#ff8c69", 8);

    if (state.hasMap) {
      crystals.forEach(function (crystal) {
        mapMarker(crystal.x, crystal.y, crystal.lit ? crystal.color : "#d2d3dc", 6);
      });
      mapMarker(diamond.x, diamond.y, "#8ff7ff", 8);
    } else {
      var fogX = mapX + mapW * (2670 / WORLD_W);
      ctx.fillStyle = "rgba(31,30,39,0.76)";
      ctx.fillRect(fogX, mapY, mapX + mapW - fogX, mapH);
      ctx.fillStyle = "#d7d0dc";
      ctx.font = "900 15px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("UNKNOWN MOUNTAIN", (fogX + mapX + mapW) / 2, mapY + mapH / 2 - 8);
      ctx.font = "700 12px Trebuchet MS, sans-serif";
      ctx.fillText("Take Boswer's map to reveal it", (fogX + mapX + mapW) / 2, mapY + mapH / 2 + 15);
    }

    var target = getObjectiveTarget();
    if (target) {
      var targetPoint = mapMarker(target.x, target.y, "#ffe66d", 8 + Math.sin(state.timeMs / 170) * 1.5);
      ctx.strokeStyle = "rgba(255,230,109,0.45)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    var playerX = mapX + mapW * (state.player.x / WORLD_W);
    var playerY = mapY + mapH * (state.player.y / WORLD_H);
    ctx.save();
    ctx.translate(playerX, playerY);
    ctx.rotate(Math.atan2(state.player.facingY, state.player.facingX));
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#17263b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-9, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff0a0";
    ctx.font = "900 15px Trebuchet MS, sans-serif";
    ctx.fillText("YOU ARE HERE: " + state.area, VIEW_W / 2, 518);
    ctx.fillStyle = "#b9d8be";
    ctx.font = "800 12px Trebuchet MS, sans-serif";
    ctx.fillText("Press M or the map button to close", VIEW_W / 2, 542);
    ctx.restore();
  }

  function drawObjectiveArrow() {
    var target = getObjectiveTarget();
    if (!target) return;
    var dx = target.x - state.player.x;
    var dy = target.y - state.player.y;
    var targetAngle = Math.atan2(dy, dx);
    var relativeAngle = normalizeViewAngle(targetAngle - state.player.viewAngle);
    var projected = projectFPPoint(target.x, target.y, 70);
    if (projected && Math.abs(relativeAngle) < FP_FOV * 0.42 && projected.depth < FP_FAR) return;
    var direction = relativeAngle < 0 ? -1 : 1;
    var x = direction < 0 ? 316 : 644;
    var y = 211;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(9, 25, 19, 0.72)";
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    ctx.moveTo(direction * 16, 0);
    ctx.lineTo(direction * -6, -10);
    ctx.lineTo(direction * -1, 0);
    ctx.lineTo(direction * -6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHUD() {
    ctx.save();
    ctx.textBaseline = "middle";
    drawRoundedRect(67, 13, 220, 86, 14, "rgba(8,25,18,0.73)", "rgba(230,255,232,0.28)");
    for (var i = 0; i < state.player.maxHearts; i += 1) {
      drawHeart(80 + i * 24, 36, i < state.player.hearts, 0.67);
    }
    ctx.font = "800 15px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#ffd88c";
    ctx.textAlign = "left";
    ctx.fillText("🍖 " + state.player.food + "   🍎 " + state.player.apples + "   🐟 " + state.player.rainbowFish, 79, 63);
    ctx.fillStyle = "#82fff1";
    var cooldown = Math.max(0, state.player.magicReadyAt - state.timeMs);
    var powerMs = Math.max(0, state.player.strongPowerUntil - state.timeMs);
    var speedMs = Math.max(0, state.player.superSpeedUntil - state.timeMs);
    var status = state.player.hasMagic ? "✦ " + (cooldown > 0 ? (cooldown / 1000).toFixed(1) : "READY") : "✦ LOCKED";
    if (powerMs > 0) status += "  🔥" + Math.ceil(powerMs / 1000);
    if (speedMs > 0) status += "  ⚡" + Math.ceil(speedMs / 1000);
    if (state.weather.intensity > 0.3) status += "  🌧";
    ctx.fillText(status, 79, 85);

    drawRoundedRect(300, 13, 450, 65, 15, "rgba(8,25,18,0.76)", "rgba(230,255,232,0.28)");
    ctx.textAlign = "center";
    ctx.fillStyle = "#9bd9a9";
    ctx.font = "800 11px Trebuchet MS, sans-serif";
    ctx.fillText("CURRENT QUEST", 525, 28);
    ctx.fillStyle = "#fff1a5";
    ctx.font = "800 16px Trebuchet MS, sans-serif";
    ctx.fillText(state.objective, 525, 50);
    ctx.fillStyle = "#c9e9d0";
    ctx.font = "700 12px Trebuchet MS, sans-serif";
    var progress = "";
    if (state.questStage === "forest_clues") progress = "Ancient trees " + getFoundTreeCount() + "/2";
    if (state.questStage === "mountain_crystals") progress = "Moon crystals " + getLitCrystalCount() + "/3";
    if (state.questStage === "return") progress = "◆ Diamond in your bag";
    ctx.fillText(progress, 525, 69);

    drawRoundedRect(67, 106, 220, 45, 12, "rgba(8,25,18,0.75)", "rgba(230,255,232,0.25)");
    WEAPON_ORDER.forEach(function (name, index) {
      var owned = state.player.weapons[name];
      var selected = state.player.selectedWeapon === name;
      var slotX = 75 + index * 52;
      if (selected) drawRoundedRect(slotX, 111, 46, 34, 8, "rgba(255,225,112,0.28)", "rgba(255,235,140,0.85)");
      ctx.globalAlpha = owned ? 1 : 0.24;
      ctx.fillStyle = "#f7f3da";
      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.fillText(WEAPON_INFO[name].icon, slotX + 23, 128);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#b9d8be";
      ctx.font = "700 9px Trebuchet MS, sans-serif";
      ctx.fillText(String(index + 1), slotX + 6, 117);
    });

    drawMiniMap();
    drawObjectiveArrow();

    if (state.areaBannerUntil > state.timeMs) {
      var alpha = clamp((state.areaBannerUntil - state.timeMs) / 500, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.font = "900 28px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff4b0";
      ctx.strokeStyle = "rgba(23,39,28,0.85)";
      ctx.lineWidth = 6;
      ctx.strokeText(state.areaBanner, VIEW_W / 2, 118);
      ctx.fillText(state.areaBanner, VIEW_W / 2, 118);
      ctx.globalAlpha = 1;
    }

    if (state.toastUntil > state.timeMs && state.toast) {
      ctx.font = "800 17px Trebuchet MS, sans-serif";
      var width = Math.min(690, ctx.measureText(state.toast).width + 46);
      drawRoundedRect((VIEW_W - width) / 2, 91, width, 38, 19, "rgba(21,45,31,0.9)", "rgba(143,247,255,0.65)");
      ctx.textAlign = "center";
      ctx.fillStyle = "#f0fff0";
      ctx.fillText(state.toast, VIEW_W / 2, 110);
    }

    if (state.weather.tornado.phase !== "idle") {
      var tornado = state.weather.tornado;
      var tornadoSeconds = tornado.phase === "warning" ?
        Math.max(0, Math.ceil((tornado.warningUntil - state.timeMs) / 1000)) :
        Math.max(0, Math.ceil((tornado.activeUntil - state.timeMs) / 1000));
      var safe = isInsideCastle(state.player.x, state.player.y);
      drawRoundedRect(344, 146, 272, 38, 18,
        safe ? "rgba(38,92,56,0.9)" : "rgba(117,34,43,0.92)",
        safe ? "rgba(161,255,181,0.8)" : "rgba(255,188,155,0.82)");
      ctx.fillStyle = "#fff2dc";
      ctx.font = "900 14px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        safe ? "CASTLE SHELTER — SAFE" :
          (tornado.phase === "warning" ? "TORNADO FORMING — " : "TORNADO ACTIVE — ") + tornadoSeconds + "s",
        VIEW_W / 2,
        166
      );
    }

    var prompt = getInteractionPrompt();
    if (prompt) {
      ctx.font = "900 17px Trebuchet MS, sans-serif";
      var promptWidth = Math.min(620, ctx.measureText(prompt).width + 50);
      drawRoundedRect((VIEW_W - promptWidth) / 2, VIEW_H - 55, promptWidth, 39, 20, "rgba(6,22,16,0.88)", "rgba(255,229,108,0.68)");
      ctx.fillStyle = "#fff0a4";
      ctx.textAlign = "center";
      ctx.fillText(prompt, VIEW_W / 2, VIEW_H - 35);
    }

    if (state.dialog) drawDialog();
    ctx.restore();
  }

  function wrapText(text, maxWidth) {
    var words = text.split(/\s+/);
    var lines = [];
    var line = "";
    words.forEach(function (word) {
      var test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawDialog() {
    var boxX = 84;
    var boxY = 418;
    var boxW = 792;
    var boxH = 154;
    drawRoundedRect(boxX, boxY, boxW, boxH, 18, "rgba(9,24,18,0.96)", "rgba(154,231,178,0.76)");
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffe782";
    ctx.font = "900 18px Trebuchet MS, sans-serif";
    ctx.fillText(state.dialog.speaker, boxX + 27, boxY + 31);
    ctx.fillStyle = "#edf8ec";
    ctx.font = "700 19px Trebuchet MS, sans-serif";
    var text = state.dialog.pages[state.dialog.index];
    var lines = wrapText(text, boxW - 54);
    lines.slice(0, 3).forEach(function (line, index) {
      ctx.fillText(line, boxX + 27, boxY + 67 + index * 25);
    });
    ctx.textAlign = "right";
    ctx.fillStyle = "#9fd5aa";
    ctx.font = "800 12px Trebuchet MS, sans-serif";
    ctx.fillText("E / ENTER  NEXT  ▶", boxX + boxW - 25, boxY + boxH - 18);
  }

  function drawCanvasTitle() {
    ctx.fillStyle = "rgba(3,14,10,0.55)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#8ff7ff";
    ctx.shadowColor = "#6ff8f2";
    ctx.shadowBlur = 25;
    ctx.font = "900 82px Georgia, serif";
    ctx.fillText("◆", VIEW_W / 2, 205);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff1a5";
    ctx.font = "900 52px Georgia, serif";
    ctx.fillText("THE LOST DIAMOND", VIEW_W / 2, 285);
    ctx.fillStyle = "#d9efdb";
    ctx.font = "800 18px Trebuchet MS, sans-serif";
    ctx.fillText("A BIG-MAP MAGIC ADVENTURE", VIEW_W / 2, 327);
  }

  function drawCanvasVictory() {
    ctx.fillStyle = "rgba(4,18,12,0.44)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#8ff7ff";
    ctx.shadowColor = "#7fffee";
    ctx.shadowBlur = 24;
    ctx.font = "900 72px Georgia, serif";
    ctx.fillText("◆", VIEW_W / 2, 222);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff2a4";
    ctx.font = "900 44px Georgia, serif";
    ctx.fillText("QUEST COMPLETE!", VIEW_W / 2, 302);
    ctx.fillStyle = "#e9f8e6";
    ctx.font = "800 20px Trebuchet MS, sans-serif";
    ctx.fillText("The diamond is home.", VIEW_W / 2, 343);
  }

  function drawTornadoWorld() {
    var tornado = state.weather.tornado;
    if (tornado.phase === "idle" || !visibleWorldPoint(tornado.x, tornado.y, 300)) return;
    ctx.save();
    ctx.translate(tornado.x, tornado.y);
    var spin = state.timeMs / 190;
    if (tornado.phase === "warning") {
      var warningProgress = 1 - Math.max(0, tornado.warningUntil - state.timeMs) / 3500;
      ctx.strokeStyle = "rgba(215,225,231," + (0.25 + warningProgress * 0.45) + ")";
      ctx.lineWidth = 5;
      for (var ring = 0; ring < 3; ring += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 10 - ring * 18, 45 + ring * 24, 16 + ring * 7, spin + ring, 0, Math.PI * 1.55);
        ctx.stroke();
      }
      ctx.fillStyle = "#d7bd76";
      for (var leaf = 0; leaf < 12; leaf += 1) {
        var leafAngle = spin + leaf / 12 * Math.PI * 2;
        var leafRadius = 45 + (leaf % 4) * 22;
        ctx.beginPath();
        ctx.ellipse(Math.cos(leafAngle) * leafRadius, Math.sin(leafAngle) * leafRadius * 0.42,
          6, 3, leafAngle, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      var gradient = ctx.createLinearGradient(0, -150, 0, 80);
      gradient.addColorStop(0, "rgba(191,201,211,0.28)");
      gradient.addColorStop(0.55, "rgba(132,139,151,0.68)");
      gradient.addColorStop(1, "rgba(87,78,72,0.82)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-92, -145);
      ctx.bezierCurveTo(-48, -78, -42, -25, -18, 75);
      ctx.quadraticCurveTo(0, 105, 18, 75);
      ctx.bezierCurveTo(40, -25, 50, -78, 94, -145);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(225,231,236,0.65)";
      ctx.lineWidth = 8;
      for (var band = 0; band < 6; band += 1) {
        var bandY = -125 + band * 34;
        var bandW = 82 - band * 11;
        ctx.beginPath();
        ctx.ellipse(0, bandY, bandW, 17, spin * (band % 2 ? -1 : 1) + band, 0, Math.PI * 1.65);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(73,61,48,0.45)";
      ctx.beginPath();
      ctx.ellipse(0, 78, 105, 35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWeather() {
    var intensity = state.weather.intensity;
    if (intensity <= 0.01) return;
    ctx.save();
    ctx.fillStyle = "rgba(35, 49, 68, " + (intensity * 0.24) + ")";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    var cloudOffset = (state.timeMs * state.weather.wind * 0.018) % 420;
    ctx.fillStyle = "rgba(20, 29, 41, " + (intensity * 0.09) + ")";
    for (var cloud = -1; cloud < 4; cloud += 1) {
      ctx.beginPath();
      ctx.ellipse(cloud * 420 + cloudOffset, 105 + (cloud % 2) * 170, 260, 100, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    var dropCount = Math.floor(155 * intensity);
    ctx.strokeStyle = "rgba(206, 235, 255, " + (0.32 + intensity * 0.36) + ")";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < dropCount; i += 1) {
      var x = ((i * 83 + state.timeMs * (0.48 + state.weather.wind * 0.18)) % (VIEW_W + 130)) - 65;
      var y = ((i * 137 + state.timeMs * 0.91) % (VIEW_H + 100)) - 50;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7 * state.weather.wind, y + 17 + intensity * 7);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(205, 240, 255, " + (intensity * 0.34) + ")";
    ctx.lineWidth = 1.3;
    for (var splash = 0; splash < Math.floor(24 * intensity); splash += 1) {
      var sx = (splash * 173 + state.timeMs * 0.17) % VIEW_W;
      var sy = 130 + ((splash * 97 + state.timeMs * 0.23) % (VIEW_H - 150));
      var phase = ((state.timeMs / 220 + splash * 0.31) % 1);
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3 + phase * 8, 1 + phase * 2.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    var lightningPhase = state.timeMs % 19000;
    if (state.weather.raining && lightningPhase > 40 && lightningPhase < 135) {
      ctx.fillStyle = "rgba(224, 236, 255, " + (intensity * 0.22) + ")";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.restore();
  }

  function render() {
    if (!state) return;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawFirstPersonWorld();
    drawWeather();
    if (state.mode !== "title") {
      drawFPHandsAndWeapon();
      drawHUD();
    }
    if (state.mode === "title") drawCanvasTitle();
    if (state.mode === "paused") {
      ctx.fillStyle = "rgba(4,14,10,0.45)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (state.mode === "victory") drawCanvasVictory();
    if (state.mapOpen) drawFullMapOverlay();
  }

  function unlockAudio() {
    if (!soundEnabled) return;
    if (!audioContext) {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext && audioContext.state === "suspended") audioContext.resume();
  }

  function playTone(frequency, duration, type, volume, delay) {
    if (!soundEnabled) return;
    unlockAudio();
    if (!audioContext) return;
    var start = audioContext.currentTime + (delay || 0);
    var oscillator = audioContext.createOscillator();
    var gain = audioContext.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.035, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function playChime(notes) {
    notes.forEach(function (note, index) {
      playTone(note, 0.16, "sine", 0.032, index * 0.09);
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (gameFrame.requestFullscreen) gameFrame.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function releasePointerLock() {
    if (document.pointerLockElement === canvas && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  function handleKeyDown(event) {
    var code = event.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(code) >= 0) {
      event.preventDefault();
    }
    if (code === "KeyF") {
      event.preventDefault();
      if (!event.repeat) toggleFullscreen();
      return;
    }
    if (state.mode === "title") {
      var titleControl = document.activeElement && document.activeElement.closest("button, a");
      if (titleControl) return;
      if (code === "Enter" || code === "Space") {
        event.preventDefault();
        startNewGame();
      }
      return;
    }
    if (state.mode === "victory") {
      var victoryControl = document.activeElement && document.activeElement.closest("button, a");
      if (victoryControl) return;
      if (code === "Enter" || code === "Space") {
        event.preventDefault();
        startNewGame();
      }
      return;
    }
    var focusedControl = document.activeElement && document.activeElement.closest("button, a");
    if (focusedControl && (code === "Enter" || code === "Space")) return;
    if (code === "KeyP") {
      if (!event.repeat) togglePause();
      return;
    }
    if (state.mode === "paused") {
      if (code === "Enter") togglePause();
      return;
    }
    if (state.mode !== "playing") return;
    if (code === "KeyM" && !event.repeat) {
      toggleWorldMap();
      return;
    }
    if (state.mapOpen) return;
    if (state.dialog) {
      if (!event.repeat && (code === "KeyE" || code === "Enter")) advanceDialog();
      return;
    }
    if (!event.repeat && (code === "KeyE" || code === "Enter")) {
      handleInteract();
      return;
    }
    if (!event.repeat && code === "Space") {
      event.preventDefault();
      castMagic();
      return;
    }
    if (!event.repeat && (code === "KeyQ" || code === "KeyB")) {
      eatFood();
      return;
    }
    if (!event.repeat && (code === "KeyR" || code === "KeyC")) {
      eatMagicApple();
      return;
    }
    if (!event.repeat && (code === "KeyV" || code === "KeyX")) {
      eatRainbowFish();
      return;
    }
    if (!event.repeat && code === "KeyZ") {
      cycleWeapon();
      return;
    }
    if (!event.repeat && (code === "KeyK" || code === "KeyJ")) {
      useSelectedWeapon();
      return;
    }
    if (!event.repeat && /^Digit[1-4]$/.test(code)) {
      selectWeapon(WEAPON_ORDER[Number(code.slice(-1)) - 1]);
      return;
    }
    keys.add(code);
  }

  function handleKeyUp(event) {
    keys.delete(event.code);
  }

  function bindTouchButton(button, onPress, onRelease) {
    if (!button) return;
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      button.classList.add("pressed");
      onPress();
      canvas.focus();
    });
    function release(event) {
      event.preventDefault();
      button.classList.remove("pressed");
      if (onRelease) onRelease();
    }
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", function () {
      button.classList.remove("pressed");
      if (onRelease) onRelease();
    });
  }

  document.querySelectorAll("[data-key]").forEach(function (button) {
    var code = button.getAttribute("data-key");
    bindTouchButton(button, function () { keys.add(code); }, function () { keys.delete(code); });
  });
  bindTouchButton(document.getElementById("touch-magic"), castMagic);
  bindTouchButton(document.getElementById("touch-interact"), handleInteract);
  bindTouchButton(document.getElementById("touch-eat"), eatFood);
  bindTouchButton(document.getElementById("touch-apple"), eatMagicApple);
  bindTouchButton(document.getElementById("touch-fish"), eatRainbowFish);
  bindTouchButton(document.getElementById("touch-weapon"), cycleWeapon);
  bindTouchButton(document.getElementById("touch-attack"), useSelectedWeapon);

  startButton.addEventListener("click", startNewGame);
  resumeButton.addEventListener("click", togglePause);
  replayButton.addEventListener("click", startNewGame);
  mapButton.addEventListener("click", toggleWorldMap);
  soundButton.addEventListener("click", function () {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? "🔊" : "🔇";
    soundButton.setAttribute("aria-label", soundEnabled ? "Turn sound off" : "Turn sound on");
    if (soundEnabled) playTone(523, 0.08, "sine", 0.03);
  });
  fullscreenButton.addEventListener("click", toggleFullscreen);
  document.querySelectorAll("[data-character]").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedCharacter = button.getAttribute("data-character") === "boy" ? "boy" : "girl";
      document.querySelectorAll("[data-character]").forEach(function (option) {
        var selected = option === button;
        option.classList.toggle("selected", selected);
        option.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      playTone(selectedCharacter === "girl" ? 659 : 523, 0.08, "sine", 0.025);
    });
  });
  canvas.addEventListener("pointerdown", function (event) {
    canvas.focus();
    if (event.pointerType !== "mouse" || state.mode !== "playing" || state.dialog || state.mapOpen) return;
    if (document.pointerLockElement === canvas) {
      event.preventDefault();
      if (event.button === 0) useSelectedWeapon();
      if (event.button === 2) castMagic();
      return;
    }
  });
  canvas.addEventListener("click", function (event) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (event.button !== 0 || state.mode !== "playing" || state.dialog || state.mapOpen) return;
    if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
      var lockRequest = canvas.requestPointerLock();
      if (lockRequest && lockRequest.catch) lockRequest.catch(function () {});
    }
  });
  canvas.addEventListener("contextmenu", function (event) {
    if (state.mode === "playing") event.preventDefault();
  });
  document.addEventListener("mousemove", function (event) {
    if (document.pointerLockElement !== canvas || state.mode !== "playing" || state.mapOpen || state.dialog) return;
    setPlayerViewAngle(state.player.viewAngle + event.movementX * 0.00235);
  });
  document.addEventListener("pointerlockchange", render);
  document.addEventListener("pointerlockerror", function () {
    if (state.mode === "playing") showToast("Mouse look unavailable — use ← → to turn.", 2.2);
  });
  window.addEventListener("keydown", handleKeyDown, { passive: false });
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", function () { keys.clear(); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) keys.clear();
  });
  document.addEventListener("fullscreenchange", function () {
    fullscreenButton.textContent = document.fullscreenElement ? "↙" : "⛶";
  });

  if (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) {
    document.body.classList.add("touch");
  }

  window.render_game_to_text = function () {
    var camera = state.camera;
    var visibleMonsterState = state.monsters.filter(function (monster) {
      return !monster.defeated && visibleWorldPoint(monster.x, monster.y, 60);
    }).map(function (monster) {
      return {
        id: monster.id,
        type: monster.type,
        x: round1(monster.x),
        y: round1(monster.y),
        hp: monster.hp,
        maxHp: monster.maxHp,
        mode: monster.mode,
        biteCooldownMs: Math.max(0, Math.round(monster.biteReadyAt - state.timeMs))
      };
    });
    var visibleFood = state.foodDrops.filter(function (food) {
      return !food.collected && visibleWorldPoint(food.x, food.y, 30);
    }).map(function (food) {
      return { id: food.id, x: round1(food.x), y: round1(food.y) };
    });
    return JSON.stringify({
      coordinateSystem: "first-person view over world pixels; map origin top-left; x increases right; y increases down; viewport 960x600",
      mode: state.mode,
      paused: state.mode === "paused",
      mapOpen: state.mapOpen,
      timeMs: Math.round(state.timeMs),
      region: state.area,
      view: {
        mode: "first-person",
        yawDegrees: Math.round(state.player.viewAngle * 180 / Math.PI),
        fieldOfViewDegrees: 70,
        pointerLocked: document.pointerLockElement === canvas
      },
      quest: {
        stage: state.questStage,
        objective: state.objective,
        ancientTrees: getFoundTreeCount() + "/2",
        boswerDefeated: state.boswerDefeated,
        mapAvailable: treasureMap.available && !treasureMap.collected,
        hasMap: state.hasMap,
        secretRoomOpen: state.secretRoomOpen,
        gateCleared: state.gateCleared,
        crystalsLit: getLitCrystalCount() + "/3",
        diamondCollected: state.diamondCollected
      },
      player: {
        x: round1(state.player.x),
        y: round1(state.player.y),
        character: state.player.character,
        movementMode: state.player.swimming ? "swimming" : (state.mountedHorseId ? "riding" : "walking"),
        facingX: round1(state.player.facingX),
        facingY: round1(state.player.facingY),
        hearts: state.player.hearts,
        maxHearts: state.player.maxHearts,
        food: state.player.food,
        foodCapacity: MAX_FOOD,
        canEat: state.player.food > 0 && state.player.hearts < state.player.maxHearts,
        apples: state.player.apples,
        appleCapacity: MAX_APPLES,
        rainbowFish: state.player.rainbowFish,
        rainbowFishCapacity: MAX_RAINBOW_FISH,
        hasMagic: state.player.hasMagic,
        magicCooldownMs: Math.max(0, Math.round(state.player.magicReadyAt - state.timeMs)),
        strongPowerMs: Math.max(0, Math.round(state.player.strongPowerUntil - state.timeMs)),
        superSpeedMs: Math.max(0, Math.round(state.player.superSpeedUntil - state.timeMs)),
        invulnerableMs: Math.max(0, Math.round(state.player.invulnerableUntil - state.timeMs)),
        mountedHorse: state.mountedHorseId,
        weapons: Object.assign({}, state.player.weapons),
        selectedWeapon: state.player.selectedWeapon,
        weaponCooldownMs: Math.max(0, Math.round(state.player.weaponReadyAt - state.timeMs))
      },
      camera: {
        left: round1(camera.x),
        top: round1(camera.y),
        right: round1(camera.x + VIEW_W),
        bottom: round1(camera.y + VIEW_H)
      },
      wizard: {
        x: wizard.x,
        y: wizard.y,
        canInteract: state.mode === "playing" && !state.dialog && !state.mapOpen &&
          distanceXY(state.player.x, state.player.y, wizard.x, wizard.y) <= 108
      },
      objectiveTarget: getObjectiveTarget(),
      interactionPrompt: getInteractionPrompt(),
      dialogue: state.dialog ? {
        speaker: state.dialog.speaker,
        page: state.dialog.index + 1,
        pages: state.dialog.pages.length,
        text: state.dialog.pages[state.dialog.index]
      } : null,
      bridges: bridges.map(function (bridge) {
        return { id: bridge.id, x: round1(bridge.x), y: bridge.y, width: bridge.w };
      }),
      weather: {
        raining: state.weather.raining,
        intensity: round1(state.weather.intensity),
        wind: round1(state.weather.wind),
        nextChangeMs: Math.max(0, Math.round(state.weather.nextChangeAt - state.timeMs)),
        heavyRain: state.weather.intensity >= 0.82,
        tornado: {
          phase: state.weather.tornado.phase,
          x: round1(state.weather.tornado.x),
          y: round1(state.weather.tornado.y),
          warningMs: Math.max(0, Math.round(state.weather.tornado.warningUntil - state.timeMs)),
          activeMs: Math.max(0, Math.round(state.weather.tornado.activeUntil - state.timeMs)),
          distanceToPlayer: state.weather.tornado.phase === "idle" ? null :
            Math.round(distanceXY(state.player.x, state.player.y, state.weather.tornado.x, state.weather.tornado.y))
        }
      },
      rainbowFishSpots: rainbowFishSpots.filter(function (fish) {
        return !fish.caught;
      }).map(function (fish) {
        return { id: fish.id, x: round1(fish.x), y: fish.y };
      }),
      horses: state.horses.map(function (horse) {
        return {
          id: horse.id,
          name: horse.name,
          x: round1(horse.x),
          y: round1(horse.y),
          fed: horse.fed,
          mounted: horse.mounted
        };
      }),
      visibleVillagers: state.villagers.filter(function (villager) {
        return visibleWorldPoint(villager.x, villager.y, 40);
      }).map(function (villager) {
        return { id: villager.id, name: villager.name, x: round1(villager.x), y: round1(villager.y) };
      }),
      visibleWeaponPickups: weaponPickups.filter(function (pickup) {
        return isWeaponPickupVisible(pickup) && visibleWorldPoint(pickup.x, pickup.y, 40);
      }).map(function (pickup) {
        return { id: pickup.id, x: pickup.x, y: pickup.y };
      }),
      visibleArrows: state.arrows.filter(function (arrow) {
        return visibleWorldPoint(arrow.x, arrow.y, 20);
      }).map(function (arrow) {
        return { x: round1(arrow.x), y: round1(arrow.y), damage: arrow.damage };
      }),
      remainingRoyalFood: royalFoods.filter(function (food) { return !food.collected; }).length,
      visibleMonsters: visibleMonsterState,
      visibleFoodDrops: visibleFood,
      monstersDefeated: state.monstersDefeated,
      toast: state.toastUntil > state.timeMs ? state.toast : ""
    });
  };

  window.advanceTime = function (milliseconds) {
    manualTime = true;
    manualAccumulator += Math.max(0, milliseconds);
    var safety = 0;
    while (manualAccumulator + 0.0001 >= STEP_MS && safety < 12000) {
      manualAccumulator -= STEP_MS;
      simulateStep();
      safety += 1;
    }
    render();
  };

  window.__lostDiamondTest = {
    resetAndStart: function () {
      startNewGame();
      return JSON.parse(window.render_game_to_text());
    },
    teleport: function (x, y) {
      state.player.x = clamp(Number(x), 25, WORLD_W - 25);
      state.player.y = clamp(Number(y), 25, WORLD_H - 25);
      state.player.swimming = isPlayerSwimming();
      syncCamera();
      updateArea();
      render();
      return JSON.parse(window.render_game_to_text());
    },
    near: function (name) {
      var targets = {
        wizard: wizard,
        tree1: ancientTrees[0],
        tree2: ancientTrees[1],
        gate: { x: thornGate.x - 100, y: thornGate.y + thornGate.h / 2 },
        crystal1: crystals[0],
        crystal2: crystals[1],
        crystal3: crystals[2],
        diamond: { x: diamond.x, y: diamond.y + 78 },
        portal: portal,
        boswer: state.monsters[0],
        horse1: state.horses[0],
        horse2: state.horses[1],
        villager1: state.villagers[0],
        monster1: state.monsters[1],
        fish1: rainbowFishSpots[0],
        sword: weaponPickups[0],
        bow: weaponPickups[1],
        spear: weaponPickups[2],
        secretDoor: { x: secretDoor.x - 70, y: secretDoor.y + secretDoor.h / 2 }
      };
      var target = targets[name];
      if (!target) throw new Error("Unknown target: " + name);
      var targetOffset = name.indexOf("tree") === 0 ? 118 : (name === "fish1" ? 110 : 58);
      state.player.x = target.x - targetOffset;
      state.player.y = target.y;
      setPlayerViewAngle(Math.atan2(target.y - state.player.y, target.x - state.player.x));
      state.player.swimming = isPlayerSwimming();
      syncCamera();
      updateArea();
      render();
      return JSON.parse(window.render_game_to_text());
    },
    setStage: function (stage) {
      state.player.hasMagic = stage !== "meet_wizard";
      if (["castle_map", "mountain_gate", "mountain_crystals", "diamond", "return", "won"].indexOf(stage) >= 0) {
        ancientTrees.forEach(function (tree) { tree.found = true; });
      }
      if (["mountain_gate", "mountain_crystals", "diamond", "return", "won"].indexOf(stage) >= 0) {
        var boswer = state.monsters.find(function (monster) { return monster.id === "boswer"; });
        boswer.defeated = true;
        boswer.hp = 0;
        state.boswerDefeated = true;
        state.hasMap = true;
        treasureMap.available = false;
        treasureMap.collected = true;
      }
      if (["mountain_crystals", "diamond", "return", "won"].indexOf(stage) >= 0) state.gateCleared = true;
      if (["diamond", "return", "won"].indexOf(stage) >= 0) {
        crystals.forEach(function (crystal) { crystal.lit = true; });
        state.sealOpen = true;
      }
      if (["return", "won"].indexOf(stage) >= 0) {
        diamond.collected = true;
        state.diamondCollected = true;
        portal.active = true;
      }
      setQuestStage(stage);
      render();
      return JSON.parse(window.render_game_to_text());
    },
    giveFood: function (count) {
      state.player.food = clamp(Math.floor(count), 0, MAX_FOOD);
      render();
    },
    giveApples: function (count) {
      state.player.apples = clamp(Math.floor(count), 0, MAX_APPLES);
      render();
    },
    giveRainbowFish: function (count) {
      state.player.rainbowFish = clamp(Math.floor(count), 0, MAX_RAINBOW_FISH);
      render();
    },
    giveWeapon: function (name) {
      if (!WEAPON_INFO[name]) throw new Error("Unknown weapon: " + name);
      state.player.weapons[name] = true;
      state.player.selectedWeapon = name;
      var pickup = weaponPickups.find(function (item) { return item.id === name; });
      if (pickup) pickup.collected = true;
      render();
    },
    selectWeapon: function (name) {
      selectWeapon(name);
      render();
      return JSON.parse(window.render_game_to_text());
    },
    setCharacter: function (character) {
      state.player.character = character === "boy" ? "boy" : "girl";
      render();
    },
    setViewAngle: function (degrees) {
      setPlayerViewAngle(Number(degrees) * Math.PI / 180);
      render();
      return JSON.parse(window.render_game_to_text());
    },
    setHearts: function (count) {
      state.player.hearts = clamp(Math.floor(count), 0, state.player.maxHearts);
      render();
    },
    action: function (name) {
      if (name === "interact") handleInteract();
      if (name === "magic") castMagic();
      if (name === "eat") eatFood();
      if (name === "apple") eatMagicApple();
      if (name === "fish") eatRainbowFish();
      if (name === "weapon") useSelectedWeapon();
      if (name === "cycleWeapon") cycleWeapon();
      if (name === "map") toggleWorldMap();
      render();
      return JSON.parse(window.render_game_to_text());
    },
    placeMonster: function (id, x, y, hp) {
      var monster = state.monsters.find(function (item) { return item.id === id; });
      if (!monster) throw new Error("Unknown monster: " + id);
      monster.x = x;
      monster.y = y;
      monster.homeX = x;
      monster.homeY = y;
      monster.hp = hp || monster.maxHp;
      monster.defeated = false;
      monster.hurtUntil = 0;
      monster.biteReadyAt = state.timeMs;
      monster.mode = "patrol";
      render();
    },
    setWeather: function (raining, intensity) {
      state.weather.raining = Boolean(raining);
      state.weather.targetIntensity = state.weather.raining ? 1 : 0;
      state.weather.intensity = clamp(Number(intensity), 0, 1);
      state.weather.nextChangeAt = state.timeMs + 30000;
      state.weather.tornado.phase = "idle";
      state.weather.tornado.stormCycle = state.weather.cycle - 1;
      render();
    },
    openSecretRoom: function () {
      state.secretRoomOpen = true;
      render();
    },
    setMapOpen: function (open) {
      state.mapOpen = Boolean(open);
      document.body.classList.toggle("map-open", state.mapOpen);
      mapButton.textContent = state.mapOpen ? "✕" : "🗺️";
      render();
    },
    snapshot: function () {
      return JSON.parse(window.render_game_to_text());
    }
  };

  function animationFrame(now) {
    var elapsed = Math.min(50, Math.max(0, now - lastFrameTime));
    lastFrameTime = now;
    if (!manualTime) {
      realAccumulator += elapsed;
      var safety = 0;
      while (realAccumulator >= STEP_MS && safety < 4) {
        realAccumulator -= STEP_MS;
        simulateStep();
        safety += 1;
      }
    }
    render();
    requestAnimationFrame(animationFrame);
  }

  state = createState("title");
  syncCamera();
  setMode("title");
  render();
  requestAnimationFrame(animationFrame);
}());
