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
  const DISTRICT_SIZE = 64;
  const ARENA_TILES = [
    { x: 0, z: 0, name: "Västra färgstaden" },
    { x: 64, z: 0, name: "Centrala färgstaden" },
    { x: 128, z: 0, name: "Östra färgstaden" },
    { x: 0, z: 64, name: "Södra väststaden" },
    { x: 64, z: 64, name: "Södra färgstaden" },
  ];
  const ARENA_AREA_MULTIPLIER = ARENA_TILES.length;
  const MAP_W = 200;
  const MAP_H = 138;
  const OUTROOM = { x: 194.5, z: 132.5, minX: 192, maxX: 197, minZ: 130, maxZ: 135 };
  const PLAYER_RADIUS = 0.23;
  const CAMERA_HEIGHT = 0.56;
  const SHOT_CAMERA_HEIGHT = 1.62;
  const CROUCHED_SHOT_CAMERA_HEIGHT = 0.82;
  const STANDING_TARGET_CENTER = 1.18;
  const CROUCHED_TARGET_CENTER = 0.58;
  const WALL_TOP_HEIGHT = 3.08;
  const WALL_CLIMB_SECONDS = 0.64;
  const UPGRADE_MATCH_LIFETIME = 3;
  const CAMERA_ORBIT_DEFAULT_ELEVATION = 0.5;
  const CAMERA_ORBIT_MIN_ELEVATION = 0.46;
  const CAMERA_ORBIT_MAX_ELEVATION = 0.72;
  const CAMERA_ORBIT_SHOULDER_ANGLE = Math.atan2(1.15, 6.2);
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
  const WAVE_BOT_COUNTS = [2, 3, 4, 5, 6, 7, 9];
  const MAP_LABELS = {
    house: "HUSET",
    yard: "GÅRDEN",
    village: "BYN",
    "endless-house": "OÄNDLIGA HUSET",
  };
  const BASE_HOUSES = [
    { x: 3, z: 3, w: 10, h: 9, theme: 1, floor: "#d9b776" },
    { x: 22, z: 3, w: 11, h: 10, theme: 2, floor: "#c5d8df" },
    { x: 46, z: 3, w: 11, h: 10, theme: 3, floor: "#dfc5a2" },
    { x: 3, z: 23, w: 11, h: 10, theme: 4, floor: "#c8d8b5" },
    { x: 22, z: 23, w: 12, h: 10, theme: 1, floor: "#d7b5c9" },
    { x: 46, z: 23, w: 11, h: 10, theme: 2, floor: "#c8d4e6" },
    { x: 3, z: 45, w: 12, h: 11, theme: 3, floor: "#dec48f" },
    { x: 23, z: 45, w: 11, h: 11, theme: 4, floor: "#bed9d6" },
    { x: 44, z: 45, w: 13, h: 11, theme: 1, floor: "#d9bdce" },
  ];
  const HOUSE_DEFS = ARENA_TILES.flatMap((tile, tileIndex) => BASE_HOUSES.map((house, baseIndex) => ({
    ...house,
    x: house.x + tile.x,
    z: house.z + tile.z,
    d: house.h,
    tileIndex,
    baseIndex,
  })));
  const HOUSE_FLOORS = HOUSE_DEFS.map((house) => [
    house.x,
    house.z,
    house.w,
    house.h,
    house.floor,
  ]);
  const HOUSE_FURNITURE_STYLES = [
    ["cabinet", 1.55, 0.72, 0.98, "#ff8a34"],
    ["sofa", 1.65, 0.82, 0.94, "#20a4ff"],
    ["cabinet", 1.5, 0.7, 1.02, "#ffd43b"],
    ["sofa", 1.7, 0.82, 0.92, "#5ee06f"],
    ["cabinet", 1.55, 0.72, 1, "#f45bd1"],
    ["sofa", 1.65, 0.82, 0.94, "#7f8cff"],
    ["cabinet", 1.6, 0.72, 1.02, "#ff466d"],
    ["sofa", 1.7, 0.82, 0.93, "#25e0d0"],
    ["cabinet", 1.55, 0.72, 1, "#bd63ff"],
  ];
  const FURNITURE = HOUSE_DEFS.map((house, index) => {
    const [kind, width, depth, height, color] = HOUSE_FURNITURE_STYLES[house.baseIndex];
    return {
      id: `house-${index + 1}`,
      zone: "house",
      house: index + 1,
      kind,
      x: house.x + 2.4,
      z: house.z + 2.3,
      width,
      depth,
      height,
      color,
    };
  });
  const EXTRA_FURNITURE = [
    ["outside-1", "outside-house", "bench", 14.2, 7.5, 1.65, 0.62, 0.9, "#e6a54c"],
    ["outside-2", "outside-house", "bench", 15.2, 27, 1.65, 0.62, 0.9, "#55a7b7"],
    ["outside-3", "outside-house", "bench", 35.5, 48, 1.65, 0.62, 0.9, "#8d73c8"],
    ["arena-1", "arena", "crate", 18, 29, 1.2, 1.2, 1.05, "#20a4ff"],
    ["arena-2", "arena", "crate", 39.5, 34.3, 1.2, 1.2, 1.05, "#ff466d"],
    ["arena-3", "arena", "crate", 30, 40.3, 1.2, 1.2, 1.05, "#ffd43b"],
  ];
  ARENA_TILES.forEach((tile, tileIndex) => {
    EXTRA_FURNITURE.forEach(([id, zone, kind, x, z, width, depth, height, color]) => {
      FURNITURE.push({
        id: `${id}-district-${tileIndex + 1}`,
        zone,
        kind,
        x: x + tile.x,
        z: z + tile.z,
        width,
        depth,
        height,
        color,
      });
    });
  });
  function gameTable(id, x, z, color = "#e6a54c", width = 1.8, depth = 1.05) {
    return {
      id,
      zone: "map",
      kind: "table",
      x,
      z,
      width,
      depth,
      height: 0.96,
      color,
      movable: true,
    };
  }
  const YARD_FURNITURE = [
    gameTable("yard-table-1", 15, 15, "#ff8a34"),
    gameTable("yard-table-2", 31, 14, "#20a4ff"),
    gameTable("yard-table-3", 47, 15, "#ffd43b"),
    gameTable("yard-table-4", 16, 32, "#5ee06f"),
    gameTable("yard-table-5", 47, 32, "#bd63ff"),
    gameTable("yard-table-6", 16, 48, "#f45bd1"),
    gameTable("yard-table-7", 32, 48, "#25e0d0"),
    gameTable("yard-table-8", 48, 48, "#ff466d"),
  ];
  const HOUSE_MAP_FURNITURE = [
    gameTable("house-table-1", 11.5, 11.5, "#ff8a34"),
    gameTable("house-table-2", 23.5, 11.5, "#20a4ff"),
    gameTable("house-table-3", 35.5, 11.5, "#ffd43b"),
    gameTable("house-table-4", 47.5, 11.5, "#5ee06f"),
    gameTable("house-table-5", 11.5, 27.5, "#bd63ff"),
    gameTable("house-table-6", 27.5, 27.5, "#f45bd1"),
    gameTable("house-table-7", 43.5, 27.5, "#25e0d0"),
    gameTable("house-table-8", 11.5, 43.5, "#ff466d"),
    gameTable("house-table-9", 27.5, 47.5, "#7f8cff"),
    gameTable("house-table-10", 47.5, 47.5, "#e6a54c"),
  ];
  const ENDLESS_HOUSE_FURNITURE = [];
  for (let z = 6; z <= 62; z += 8) {
    for (let x = 6; x <= 62; x += 8) {
      if ((x + z) % 16 === 12) {
        ENDLESS_HOUSE_FURNITURE.push(gameTable(
          `endless-table-${x}-${z}`,
          x + 0.5,
          z + 0.5,
          SOLO_COLORS[(x + z) % SOLO_COLORS.length],
          1.65,
          1.0,
        ));
      }
    }
  }
  const grid = new Uint8Array(MAP_W * MAP_H);
  const wallTheme = new Uint8Array(MAP_W * MAP_H);
  const climbableWalls = new Uint8Array(MAP_W * MAP_H);
  let activeMapId = "village";
  let activeMapKind = "village";
  let arenaRevision = 1;
  let activeFurniture = FURNITURE;
  let activeHouseDefs = HOUSE_DEFS;
  let activeHouseFloors = HOUSE_FLOORS;
  let activeTiles = ARENA_TILES;
  let activeBounds = { minX: 0, minZ: 0, maxX: 192, maxZ: 128, width: 192, height: 128 };
  const keys = Object.create(null);
  const touchActions = Object.create(null);
  const pointerState = { move: null, look: null };

  function capturePointerSafely(element, pointerId) {
    try {
      element.setPointerCapture?.(pointerId);
    } catch {
      // Ett syntetiskt eller redan avslutat pektryck saknar ibland aktiv capture.
    }
  }

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem("paintWarSave") || "{}");
      const savedUpgrades = {
        handgun: Boolean(saved.upgrades && saved.upgrades.handgun),
        longgun: Boolean(saved.upgrades && saved.upgrades.longgun),
      };
      const remainingMatches = (key) => {
        if (!savedUpgrades[key]) return 0;
        const stored = Number(saved.upgradeMatches && saved.upgradeMatches[key]);
        return Number.isFinite(stored)
          ? Math.max(0, Math.min(UPGRADE_MATCH_LIFETIME, Math.floor(stored)))
          : UPGRADE_MATCH_LIFETIME;
      };
      const upgradeMatches = {
        handgun: remainingMatches("handgun"),
        longgun: remainingMatches("longgun"),
      };
      return {
        coins: Number.isFinite(saved.coins) ? saved.coins : 300,
        upgrades: {
          handgun: upgradeMatches.handgun > 0,
          longgun: upgradeMatches.longgun > 0,
        },
        upgradeMatches,
      };
    } catch {
      return {
        coins: 300,
        upgrades: { handgun: false, longgun: false },
        upgradeMatches: { handgun: 0, longgun: 0 },
      };
    }
  }

  const save = loadSave();
  const state = {
    phase: "menu",
    mode: null,
    mapId: "village",
    pendingMode: null,
    wave: 0,
    waveDelay: 0,
    arenaRevision: 1,
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
    crouching: false,
    crouchToggle: false,
    pitch: 0,
    cameraOrbit: {
      yaw: Math.PI - CAMERA_ORBIT_SHOULDER_ANGLE,
      elevation: CAMERA_ORBIT_DEFAULT_ELEVATION,
      dragging: false,
      lastInputTime: 0,
    },
    recoil: 0,
    hitmarker: 0,
    hurtFlash: 0,
    muzzleFlash: 0,
    message: "",
    messageTime: 0,
    coins: save.coins,
    upgrades: save.upgrades,
    upgradeMatches: save.upgradeMatches,
    stats: { hits: 0, ko: 0, points: 0 },
    seed: 123456789,
    testClock: false,
    onWall: false,
    wallClimb: null,
    wallContactTime: 0,
    wallDismountReady: false,
    movingTableId: null,
    underTableId: null,
  };

  function saveProgress() {
    try {
      localStorage.setItem("paintWarSave", JSON.stringify({
        coins: state.coins,
        upgrades: state.upgrades,
        upgradeMatches: state.upgradeMatches,
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

  function setClimbableWall(x, z, theme) {
    setCell(x, z, 1, theme);
    climbableWalls[cellIndex(x, z)] = 1;
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

  function buildVillageArena() {
    grid.fill(4);
    wallTheme.fill(5);
    climbableWalls.fill(0);
    ARENA_TILES.forEach((tile) => {
      for (let localZ = 0; localZ <= DISTRICT_SIZE; localZ += 1) {
        for (let localX = 0; localX <= DISTRICT_SIZE; localX += 1) {
          const boundary = localX === 0 || localZ === 0
            || localX === DISTRICT_SIZE || localZ === DISTRICT_SIZE;
          setCell(tile.x + localX, tile.z + localZ, boundary ? 1 : 0, 0);
        }
      }
    });

    const hasTile = (x, z) => ARENA_TILES.some((tile) => tile.x === x && tile.z === z);
    ARENA_TILES.forEach((tile) => {
      if (hasTile(tile.x + DISTRICT_SIZE, tile.z)) {
        for (const [start, end] of [[15, 20], [36, 42]]) {
          for (let localZ = start; localZ <= end; localZ += 1) {
            setCell(tile.x + DISTRICT_SIZE, tile.z + localZ, 0);
          }
        }
      }
      if (hasTile(tile.x, tile.z + DISTRICT_SIZE)) {
        for (const [start, end] of [[15, 19], [37, 42]]) {
          for (let localX = start; localX <= end; localX += 1) {
            setCell(tile.x + localX, tile.z + DISTRICT_SIZE, 0);
          }
        }
      }
    });

    HOUSE_DEFS.forEach((house) => drawHouse(
      house.x,
      house.z,
      house.w,
      house.h,
      house.theme,
    ));
    ARENA_TILES.forEach((tile) => {
      for (let x = 8; x <= 14; x += 1) setClimbableWall(tile.x + x, tile.z + 40, 4);
      for (let z = 18; z <= 23; z += 1) setClimbableWall(tile.x + 39, tile.z + z, 2);
      for (let x = 40; x <= 46; x += 1) setClimbableWall(tile.x + x, tile.z + 39, 3);
    });
    for (let z = OUTROOM.minZ; z <= OUTROOM.maxZ; z += 1) {
      for (let x = OUTROOM.minX; x <= OUTROOM.maxX; x += 1) setCell(x, z, 0, 5);
    }
    activeMapId = "village";
    activeMapKind = "village";
    activeFurniture = FURNITURE;
    activeHouseDefs = HOUSE_DEFS;
    activeHouseFloors = HOUSE_FLOORS;
    activeTiles = ARENA_TILES;
    activeBounds = { minX: 0, minZ: 0, maxX: 192, maxZ: 128, width: 192, height: 128 };
  }

  function clearArena(theme = 0) {
    grid.fill(4);
    wallTheme.fill(theme);
    climbableWalls.fill(0);
  }

  function buildBoundary(minX, minZ, maxX, maxZ, theme) {
    for (let x = minX; x <= maxX; x += 1) {
      setCell(x, minZ, 1, theme);
      setCell(x, maxZ, 1, theme);
    }
    for (let z = minZ; z <= maxZ; z += 1) {
      setCell(minX, z, 1, theme);
      setCell(maxX, z, 1, theme);
    }
  }

  function buildYardArena() {
    clearArena(3);
    for (let z = 4; z <= 60; z += 1) {
      for (let x = 4; x <= 60; x += 1) setCell(x, z, 0, 3);
    }
    buildBoundary(4, 4, 60, 60, 3);
    const covers = [
      [20, 20, 6, 2, 1], [39, 20, 6, 2, 2], [29, 31, 6, 2, 4],
      [13, 40, 5, 2, 2], [46, 41, 5, 2, 1], [29, 52, 6, 2, 4],
    ];
    covers.forEach(([x, z, w, d, theme]) => {
      for (let zz = z; zz < z + d; zz += 1) {
        for (let xx = x; xx < x + w; xx += 1) setCell(xx, zz, 1, theme);
      }
    });
    activeMapId = "yard";
    activeMapKind = "yard";
    activeFurniture = YARD_FURNITURE;
    activeHouseDefs = [];
    activeHouseFloors = [];
    activeTiles = [];
    activeBounds = { minX: 4, minZ: 4, maxX: 60, maxZ: 60, width: 56, height: 56 };
  }

  function buildHouseArena() {
    clearArena(2);
    for (let z = 4; z <= 60; z += 1) {
      for (let x = 4; x <= 60; x += 1) setCell(x, z, 0, 2);
    }
    buildBoundary(4, 4, 60, 60, 2);
    for (const wallX of [16, 32, 48]) {
      for (let z = 5; z < 60; z += 1) {
        if (z % 16 < 6 || z % 16 > 9) setCell(wallX, z, 1, 2);
      }
    }
    for (const wallZ of [16, 32, 48]) {
      for (let x = 5; x < 60; x += 1) {
        if (x % 16 < 6 || x % 16 > 9) setCell(x, wallZ, 1, 2);
      }
    }
    activeMapId = "house";
    activeMapKind = "house";
    activeFurniture = HOUSE_MAP_FURNITURE;
    activeHouseDefs = [];
    activeHouseFloors = [[4, 4, 57, 57, "#d6ad72"]];
    activeTiles = [];
    activeBounds = { minX: 4, minZ: 4, maxX: 60, maxZ: 60, width: 56, height: 56 };
  }

  function buildEndlessHouseArena() {
    clearArena(4);
    for (let z = 0; z < 68; z += 1) {
      for (let x = 0; x < 68; x += 1) {
        const verticalWall = x % 8 === 0 && ![3, 4].includes(z % 8);
        const horizontalWall = z % 8 === 0 && ![3, 4].includes(x % 8);
        setCell(x, z, verticalWall || horizontalWall ? 1 : 0, 4);
      }
    }
    activeMapId = "endless-house";
    activeMapKind = "endless-house";
    activeFurniture = ENDLESS_HOUSE_FURNITURE;
    activeHouseDefs = [];
    activeHouseFloors = [[0, 0, 68, 68, "#b58ec7"]];
    activeTiles = [];
    activeBounds = { minX: 0, minZ: 0, maxX: 68, maxZ: 68, width: 68, height: 68 };
  }

  function activateMap(mapId) {
    if (mapId === "house") buildHouseArena();
    else if (mapId === "yard") buildYardArena();
    else if (mapId === "endless-house") buildEndlessHouseArena();
    else buildVillageArena();
    arenaRevision += 1;
    state.mapId = activeMapId;
    state.arenaRevision = arenaRevision;
  }

  buildVillageArena();

  function arenaTileAt(x, z) {
    return activeTiles.find((tile) => (
      x >= tile.x && x <= tile.x + DISTRICT_SIZE
      && z >= tile.z && z <= tile.z + DISTRICT_SIZE
    ));
  }

  function isRoad(x, z) {
    const tile = arenaTileAt(x, z);
    if (!tile) return false;
    const localX = x - tile.x;
    const localZ = z - tile.z;
    return (localX >= 15 && localX <= 19) || (localX >= 37 && localX <= 42)
      || (localZ >= 15 && localZ <= 20) || (localZ >= 36 && localZ <= 42);
  }

  function floorColor(x, z) {
    if (activeMapKind === "yard") {
      return (Math.floor(x) + Math.floor(z)) % 2 ? "#6ea64d" : "#78b657";
    }
    if (activeMapKind === "house" || activeMapKind === "endless-house") {
      const colors = activeMapKind === "endless-house"
        ? ["#b88fc7", "#caa7d4"]
        : ["#c99863", "#ddb77d"];
      return colors[(Math.floor(x / 4) + Math.floor(z / 4)) % 2];
    }
    if (
      x >= OUTROOM.minX && x <= OUTROOM.maxX
      && z >= OUTROOM.minZ && z <= OUTROOM.maxZ
    ) {
      return (Math.floor(x) + Math.floor(z)) % 2 ? "#33465a" : "#405a70";
    }
    for (const [hx, hz, hw, hh, color] of activeHouseFloors) {
      if (x > hx && x < hx + hw - 1 && z > hz && z < hz + hh - 1) {
        return (Math.floor(x * 2) + Math.floor(z * 2)) % 2 ? color : shade(color, 0.92);
      }
    }
    if (isRoad(x, z)) {
      const tile = arenaTileAt(x, z);
      const localX = x - tile.x;
      const localZ = z - tile.z;
      const horizontal = (localZ >= 15 && localZ <= 20) || (localZ >= 36 && localZ <= 42);
      const center = horizontal
        ? (Math.abs(localZ - 17.5) < 0.11 || Math.abs(localZ - 39) < 0.11)
        : (Math.abs(localX - 17) < 0.11 || Math.abs(localX - 39.5) < 0.11);
      const dashAxis = horizontal ? localX : localZ;
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

  function resetCameraOrbit() {
    const heading = Number(state.player?.angle) || 0;
    state.cameraOrbit.yaw = normalizeAngle(
      heading + Math.PI - CAMERA_ORBIT_SHOULDER_ANGLE,
    );
    state.cameraOrbit.elevation = CAMERA_ORBIT_DEFAULT_ELEVATION;
    state.cameraOrbit.dragging = false;
    state.cameraOrbit.lastInputTime = state.time;
    pointerState.look = null;
  }

  function facePlayerTowardCamera() {
    if (!state.player) return;
    state.player.angle = normalizeAngle(
      state.cameraOrbit.yaw + Math.PI + CAMERA_ORBIT_SHOULDER_ANGLE,
    );
  }

  function collides(x, z, actor = null) {
    for (let i = 0; i < 8; i += 1) {
      const a = i * Math.PI / 4;
      if (getCell(x + Math.cos(a) * PLAYER_RADIUS, z + Math.sin(a) * PLAYER_RADIUS) !== 0) return true;
    }
    for (const item of activeFurniture) {
      if (actor === state.player && state.movingTableId === item.id) continue;
      if (actor === state.player && state.crouching && item.kind === "table") continue;
      const nearestX = Math.max(item.x - item.width / 2, Math.min(x, item.x + item.width / 2));
      const nearestZ = Math.max(item.z - item.depth / 2, Math.min(z, item.z + item.depth / 2));
      if (Math.hypot(x - nearestX, z - nearestZ) < PLAYER_RADIUS) return true;
    }
    return false;
  }

  function moveActor(actor, dx, dz) {
    const nx = actor.x + dx;
    const nz = actor.z + dz;
    if (!collides(nx, actor.z, actor)) actor.x = nx;
    if (!collides(actor.x, nz, actor)) actor.z = nz;
  }

  function nearestMovableTable(maxDistance = 2.4) {
    if (!state.player) return null;
    let nearest = null;
    let nearestDistance = maxDistance;
    for (const item of activeFurniture) {
      if (!item.movable || item.kind !== "table") continue;
      const distance = Math.hypot(item.x - state.player.x, item.z - state.player.z);
      if (distance < nearestDistance) {
        nearest = item;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function tableCanStandAt(item, x, z) {
    const marginX = item.width / 2 + 0.08;
    const marginZ = item.depth / 2 + 0.08;
    for (const [px, pz] of [
      [x - marginX, z - marginZ], [x + marginX, z - marginZ],
      [x - marginX, z + marginZ], [x + marginX, z + marginZ],
    ]) {
      if (getCell(px, pz) !== 0) return false;
    }
    return !activeFurniture.some((other) => other !== item
      && Math.abs(other.x - x) < (other.width + item.width) * 0.45
      && Math.abs(other.z - z) < (other.depth + item.depth) * 0.45);
  }

  function toggleMoveTable() {
    if (!state.player?.alive) return;
    if (state.movingTableId) {
      state.movingTableId = null;
      state.message = "Bordet står kvar där!";
      state.messageTime = 1.2;
      return;
    }
    const table = nearestMovableTable();
    if (!table) {
      state.message = "Gå närmare ett bord först.";
      state.messageTime = 1.5;
      return;
    }
    state.crouchToggle = false;
    state.crouching = false;
    state.movingTableId = table.id;
    state.message = "Du flyttar bordet · tryck igen för att släppa!";
    state.messageTime = 1.8;
  }

  function updateMovingTable() {
    if (!state.movingTableId || !state.player?.alive) return;
    const table = activeFurniture.find((item) => item.id === state.movingTableId);
    if (!table) {
      state.movingTableId = null;
      return;
    }
    const distance = 1.35;
    const targetX = state.player.x + Math.cos(state.player.angle) * distance;
    const targetZ = state.player.z + Math.sin(state.player.angle) * distance;
    if (tableCanStandAt(table, targetX, targetZ)) {
      table.x = targetX;
      table.z = targetZ;
    }
  }

  function updateTableCover() {
    state.underTableId = null;
    if (!state.crouching || !state.player?.alive) return;
    const p = state.player;
    const table = activeFurniture.find((item) => item.kind === "table"
      && Math.abs(item.x - p.x) <= item.width * 0.42
      && Math.abs(item.z - p.z) <= item.depth * 0.42);
    if (table) state.underTableId = table.id;
  }

  function teamFor(mode, i) {
    if (mode === "solo") return i;
    if (mode === "waves") return i === 0 ? 0 : 1;
    if (mode === "duo") return Math.floor(i / 2);
    return i < 5 ? 0 : 1;
  }

  const SPAWNS = [
    [17.5, 2.5], [39.5, 2.5],
    [81.5, 2.5], [103.5, 22],
    [145.5, 2.5], [167.5, 22],
    [16.5, 86], [39.5, 107.5],
    [80.5, 86], [103.5, 107.5],
  ];
  const YARD_SPAWNS = [
    [9.5, 9.5], [23.5, 9.5], [39.5, 9.5], [54.5, 10.5], [10.5, 27.5],
    [53.5, 27.5], [10.5, 53.5], [25.5, 54.5], [40.5, 54.5], [54.5, 53.5],
  ];
  const HOUSE_SPAWNS = [
    [8.5, 8.5], [24.5, 8.5], [40.5, 8.5], [55.5, 8.5], [8.5, 24.5],
    [24.5, 24.5], [40.5, 24.5], [55.5, 40.5], [24.5, 55.5], [55.5, 55.5],
  ];
  const ENDLESS_SPAWNS = [
    [12.5, 12.5], [20.5, 12.5], [28.5, 12.5], [36.5, 12.5], [44.5, 12.5],
    [52.5, 20.5], [12.5, 36.5], [28.5, 44.5], [44.5, 52.5], [52.5, 52.5],
  ];

  function activeSpawns() {
    if (activeMapId === "yard") return YARD_SPAWNS;
    if (activeMapId === "house") return HOUSE_SPAWNS;
    if (activeMapId === "endless-house") return ENDLESS_SPAWNS;
    return SPAWNS;
  }

  function createActor(i, mode) {
    const team = teamFor(mode, i);
    const spawns = activeSpawns();
    const spawn = spawns[i % spawns.length];
    return {
      id: i,
      name: i === 0 ? "Du" : `Bot ${i}`,
      bot: i !== 0,
      team,
      color: mode === "solo" || mode === "waves" ? SOLO_COLORS[i % SOLO_COLORS.length] : TEAM_COLORS[team],
      x: spawn[0],
      z: spawn[1],
      angle: i === 0 ? Math.PI / 2 : seededRandom() * Math.PI * 2,
      health: 100,
      alive: true,
      outroom: false,
      weapon: mode === "waves" && i !== 0 ? 0 : (i % 3 === 0 ? 0 : 1),
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
      "map-select": document.getElementById("map-select-overlay"),
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
    state.cameraOrbit.dragging = false;
    state.firing = false;
    state.jumping = false;
    state.sprinting = false;
    state.crouching = false;
    state.crouchToggle = false;
    state.movingTableId = null;
    state.underTableId = null;
    const knob = document.getElementById("move-knob");
    if (knob) knob.style.transform = "translate(-50%, -50%)";
    document.querySelectorAll("[data-action].active").forEach((button) => button.classList.remove("active"));
  }

  function chooseMode(mode) {
    if (mode === "solo" || mode === "duo") {
      state.pendingMode = mode;
      state.phase = "map-select";
      setScreen("map-select");
      return;
    }
    startMatch(mode, mode === "waves" ? "endless-house" : "village");
  }

  function startWave(number) {
    state.wave = number;
    state.waveDelay = 0;
    const player = state.player;
    const spawn = ENDLESS_SPAWNS[0];
    player.x = spawn[0];
    player.z = spawn[1];
    player.y = 0;
    player.vy = 0;
    player.health = 100;
    player.alive = true;
    player.outroom = false;
    player.paint.length = 0;
    const count = WAVE_BOT_COUNTS[number - 1];
    const bots = Array.from({ length: count }, (_, slot) => {
      const enemy = createActor(slot + 1, "waves");
      enemy.id = number * 100 + slot + 1;
      enemy.name = `Wavebot ${slot + 1}`;
      enemy.team = 1;
      enemy.weapon = 0;
      return enemy;
    });
    state.players = [player, ...bots];
    state.message = `WAVE ${number} AV 7 · ${count} PISTOLBOTTAR`;
    state.messageTime = 2.6;
  }

  function startMatch(mode, mapId = "village") {
    const chosenMap = mode === "waves" ? "endless-house" : mapId;
    activateMap(chosenMap);
    state.phase = "playing";
    state.mode = mode;
    state.pendingMode = null;
    state.seed = 1977 + ["solo", "duo", "team", "waves"].indexOf(mode) * 911;
    state.players = mode === "waves"
      ? [createActor(0, "waves")]
      : Array.from({ length: 10 }, (_, i) => createActor(i, mode));
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
    resetCameraOrbit();
    state.onWall = false;
    state.wallClimb = null;
    state.wallContactTime = 0;
    state.wallDismountReady = false;
    state.movingTableId = null;
    state.underTableId = null;
    state.wave = mode === "waves" ? 1 : 0;
    state.waveDelay = 0;
    state.stats = { hits: 0, ko: 0, points: 0 };
    if (mode === "waves") startWave(1);
    else state.message = mode === "solo"
      ? `Alla mot alla i ${MAP_LABELS[chosenMap]}!`
      : `Håll ihop med ditt lag i ${MAP_LABELS[chosenMap]}!`;
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
    state.upgradeMatches[key] = UPGRADE_MATCH_LIFETIME;
    saveProgress();
    updateShop();
    updateHud();
  }

  function weaponStats(actor) {
    const isPlayer = actor === state.player;
    const weaponIndex = state.mode === "waves" && actor.bot
      ? 0
      : (isPlayer ? state.weapon : actor.weapon);
    const base = WEAPONS[weaponIndex];
    // Bara den lokala spelaren får använda köpta uppgraderingar.
    // Bottarnas vapen använder alltid vapnets vanliga värden.
    const upgraded = isPlayer && state.upgrades[base.key];
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
    const startCellX = Math.floor(x);
    const startCellZ = Math.floor(z);
    const startedInsideWall = getCell(x, z) !== 0;
    for (let d = 0.08; d <= maxDistance; d += 0.08) {
      const px = x + dx * d;
      const pz = z + dz * d;
      if (
        startedInsideWall
        && Math.floor(px) === startCellX
        && Math.floor(pz) === startCellZ
      ) continue;
      const cell = getCell(px, pz);
      if (cell === 1 || cell === 4 || (cell === 2 && !ignoreWindows)) {
        return { distance: d, x: px, z: pz, cell, surface: "wall" };
      }
    }
    return {
      distance: maxDistance,
      x: x + dx * maxDistance,
      z: z + dz * maxDistance,
      cell: 0,
      surface: "none",
    };
  }

  function rayFurnitureDistance(x, z, dx, dz, item) {
    const minX = item.x - item.width / 2;
    const maxX = item.x + item.width / 2;
    const minZ = item.z - item.depth / 2;
    const maxZ = item.z + item.depth / 2;
    let near = -Infinity;
    let far = Infinity;
    let normalX = 0;
    let normalZ = 0;

    if (Math.abs(dx) < 1e-8) {
      if (x < minX || x > maxX) return null;
    } else {
      const first = (minX - x) / dx;
      const second = (maxX - x) / dx;
      const axisNear = Math.min(first, second);
      const axisFar = Math.max(first, second);
      if (axisNear > near) {
        near = axisNear;
        normalX = first < second ? -1 : 1;
        normalZ = 0;
      }
      far = Math.min(far, axisFar);
    }

    if (Math.abs(dz) < 1e-8) {
      if (z < minZ || z > maxZ) return null;
    } else {
      const first = (minZ - z) / dz;
      const second = (maxZ - z) / dz;
      const axisNear = Math.min(first, second);
      const axisFar = Math.max(first, second);
      if (axisNear > near) {
        near = axisNear;
        normalX = 0;
        normalZ = first < second ? -1 : 1;
      }
      far = Math.min(far, axisFar);
    }
    if (far < near || far < 0) return null;
    return { distance: near >= 0 ? near : far, normalX, normalZ };
  }

  function traceFurniture(x, z, angle, maxDistance, originHeight, aimPitch) {
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let best = null;
    for (const item of activeFurniture) {
      const hit = rayFurnitureDistance(x, z, dx, dz, item);
      if (!hit || hit.distance < 0.03 || hit.distance >= maxDistance) continue;
      const y = originHeight - Math.tan(aimPitch) * hit.distance;
      if (y < 0.04 || y > item.height) continue;
      if (!best || hit.distance < best.distance) {
        best = {
          distance: hit.distance,
          x: x + dx * hit.distance,
          z: z + dz * hit.distance,
          y,
          cell: 3,
          surface: "furniture",
          furnitureId: item.id,
          normalX: hit.normalX,
          normalZ: hit.normalZ,
        };
      }
    }
    return best;
  }

  function actorShotOrigin(actor) {
    return actor.y + (
      actor === state.player && state.crouching
        ? CROUCHED_SHOT_CAMERA_HEIGHT
        : SHOT_CAMERA_HEIGHT
    );
  }

  function actorTargetShape(actor) {
    const crouched = actor === state.player && state.crouching;
    return {
      center: actor.y + (crouched ? CROUCHED_TARGET_CENTER : STANDING_TARGET_CENTER),
      radius: crouched ? 0.38 : 0.62,
    };
  }

  function nearestTargetOnRay(actor, angle, range, aimPitch = 0) {
    const wallHit = traceWall(actor.x, actor.z, angle, range, true);
    const originHeight = actorShotOrigin(actor);
    wallHit.y = Math.max(0.06, originHeight - Math.tan(aimPitch) * wallHit.distance);
    const furnitureHit = traceFurniture(
      actor.x,
      actor.z,
      angle,
      wallHit.distance,
      originHeight,
      aimPitch,
    );
    const worldHit = furnitureHit || wallHit;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let best = null;
    let bestAlong = worldHit.distance;
    for (const target of state.players) {
      if (!target.alive || target.id === actor.id || target.team === actor.team) continue;
      const tx = target.x - actor.x;
      const tz = target.z - actor.z;
      const along = tx * dx + tz * dz;
      if (along <= 0 || along >= bestAlong) continue;
      const side = Math.abs(tx * dz - tz * dx);
      const rayHeight = originHeight - Math.tan(aimPitch) * along;
      const targetShape = actorTargetShape(target);
      if (side < 0.34 && Math.abs(rayHeight - targetShape.center) < targetShape.radius) {
        best = target;
        bestAlong = along;
      }
    }
    return { target: best, wallHit: worldHit, distance: bestAlong };
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
      y: Number.isFinite(hit.y) ? hit.y : undefined,
      color,
      floor,
      surface: floor ? "floor" : (hit.surface || "wall"),
      furnitureId: hit.furnitureId || null,
      normalX: hit.normalX || 0,
      normalZ: hit.normalZ || 0,
      size: 0.14 + seededRandom() * 0.12,
    });
  }

  function eliminate(target, attacker) {
    if (!target.alive) return;
    target.alive = false;
    target.health = 0;
    if (state.mode === "waves") {
      target.outroom = false;
      target.y = 0;
      target.vy = 0;
      if (attacker === state.player && target.bot) {
        state.coins += 20;
        state.stats.ko += 1;
        state.stats.points += 20;
        saveProgress();
        state.message = `Du målade ut ${target.name}! +20`;
        state.messageTime = 1.4;
      }
      if (target === state.player) {
        state.message = "Du blev träffad i det oändliga huset!";
        state.messageTime = 2.4;
      }
      return;
    }
    target.outroom = true;
    const slot = state.outroomCount++;
    target.x = OUTROOM.minX + 0.7 + (slot % 3) * 1.25;
    target.z = OUTROOM.minZ + 0.7 + Math.floor(slot / 3) * 1.25;
    target.angle = Math.PI;
    target.y = 0;
    target.vy = 0;
    if (attacker && !attacker.bot && target.bot) {
      state.coins += 20;
      state.stats.ko += 1;
      state.stats.points += 20;
      saveProgress();
      state.message = `Du målade ut ${target.name}! +20`;
      state.messageTime = 2;
    }
    if (target === state.player) {
      state.onWall = false;
      state.wallClimb = null;
      state.wallContactTime = 0;
      state.wallDismountReady = false;
      state.crouching = false;
      state.crouchToggle = false;
      state.message = "Du är utslagen – välkommen till Outroom!";
      state.messageTime = 4;
      state.outroomIntro = 3.2;
      state.scoped = false;
    }
  }

  function autoAimAtNearestEnemy(actor) {
    const enemies = livingEnemies(actor);
    let nearest = null;
    let nearestDistance = Infinity;
    for (const enemy of enemies) {
      const distance = Math.hypot(enemy.x - actor.x, enemy.z - actor.z);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    if (!nearest) return null;
    const targetShape = actorTargetShape(nearest);
    return {
      target: nearest,
      angle: Math.atan2(nearest.z - actor.z, nearest.x - actor.x),
      pitch: Math.atan2(
        actorShotOrigin(actor) - targetShape.center,
        Math.max(0.2, nearestDistance),
      ),
    };
  }

  function fire(actor) {
    if (!actor.alive || actor.cooldown > 0) return false;
    const playerAim = actor === state.player ? autoAimAtNearestEnemy(actor) : null;
    if (actor === state.player) {
      state.scoped = false;
    }
    const stats = weaponStats(actor);
    actor.cooldown += stats.interval;
    let angle = playerAim?.angle ?? actor.angle;
    const spread = playerAim
      ? 0
      : (stats.key === "longgun" ? (stats.upgraded && state.scoped ? 0.002 : 0.022) : 0.01);
    angle += (seededRandom() - 0.5) * spread;
    let aimPitch = actor === state.player ? (playerAim?.pitch || 0) : 0;
    if (actor !== state.player && actor.target?.alive) {
      const targetShape = actorTargetShape(actor.target);
      const targetDistance = Math.max(0.2, Math.hypot(actor.target.x - actor.x, actor.target.z - actor.z));
      aimPitch = Math.atan2(actorShotOrigin(actor) - targetShape.center, targetDistance);
    }
    const result = nearestTargetOnRay(actor, angle, stats.range, aimPitch);
    let end = result.wallHit;
    if (result.target) {
      const target = result.target;
      end = {
        x: target.x,
        z: target.z,
        y: actorTargetShape(target).center,
        distance: result.distance,
      };
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
      const downward = actor === state.player && aimPitch > 0.22;
      if (downward) {
        const groundDistance = Math.min(
          stats.range,
          actorShotOrigin(actor) / Math.tan(Math.max(0.05, aimPitch)),
        );
        if (groundDistance < result.wallHit.distance) {
          end = {
            x: actor.x + Math.cos(angle) * groundDistance,
            z: actor.z + Math.sin(angle) * groundDistance,
            y: 0.04,
            surface: "floor",
          };
          addDecal(end, actor.color, true);
        } else addDecal(result.wallHit, actor.color, false);
      } else addDecal(result.wallHit, actor.color, false);
    }
    state.tracers.push({
      x1: actor.x, z1: actor.z, x2: end.x, z2: end.z,
      y1: actorShotOrigin(actor),
      y2: Number.isFinite(end.y) ? end.y : 1.18,
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

  function isClimbableWallAt(x, z) {
    const cellX = Math.floor(x);
    const cellZ = Math.floor(z);
    if (cellX < 0 || cellZ < 0 || cellX >= MAP_W || cellZ >= MAP_H) return false;
    return climbableWalls[cellIndex(cellX, cellZ)] === 1;
  }

  function findClimbableWallAhead(actor, directionX, directionZ) {
    for (let distance = PLAYER_RADIUS + 0.04; distance <= 0.86; distance += 0.06) {
      const x = actor.x + directionX * distance;
      const z = actor.z + directionZ * distance;
      if (isClimbableWallAt(x, z)) {
        const cellX = Math.floor(x);
        const cellZ = Math.floor(z);
        return {
          cellX,
          cellZ,
          centerX: cellX + 0.5,
          centerZ: cellZ + 0.5,
        };
      }
      if (getCell(x, z) !== 0) return null;
    }
    return null;
  }

  function startWallClimb(player, wall) {
    state.wallClimb = {
      ...wall,
      fromX: player.x,
      fromZ: player.z,
      progress: 0,
    };
    state.wallContactTime = 0;
    state.wallDismountReady = false;
    state.crouching = false;
    state.crouchToggle = false;
    player.vy = 0;
    state.message = "SPRING UPPFÖR VÄGGEN!";
    state.messageTime = 1.6;
  }

  function updateWallClimb(player, dt) {
    const climb = state.wallClimb;
    if (!climb) return;
    climb.progress = Math.min(1, climb.progress + dt / WALL_CLIMB_SECONDS);
    const smooth = climb.progress * climb.progress * (3 - 2 * climb.progress);
    player.x = climb.fromX + (climb.centerX - climb.fromX) * smooth;
    player.z = climb.fromZ + (climb.centerZ - climb.fromZ) * smooth;
    player.y = WALL_TOP_HEIGHT * smooth;
    player.vy = 0;
    if (climb.progress >= 1) {
      state.wallClimb = null;
      state.onWall = true;
      state.wallDismountReady = false;
      player.x = climb.centerX;
      player.z = climb.centerZ;
      player.y = WALL_TOP_HEIGHT;
      state.message = "DU STÅR PÅ VÄGGEN – SIKTA NERÅT!";
      state.messageTime = 2.4;
    }
  }

  function leaveWall(player, directionX, directionZ, jump = false) {
    const length = Math.max(0.001, Math.hypot(directionX, directionZ));
    const nx = player.x + directionX / length * 0.86;
    const nz = player.z + directionZ / length * 0.86;
    if (getCell(nx, nz) !== 0 || collides(nx, nz)) return false;
    player.x = nx;
    player.z = nz;
    player.y = WALL_TOP_HEIGHT;
    player.vy = jump ? 3.2 : 0;
    state.onWall = false;
    state.wallDismountReady = false;
    return true;
  }

  function jumpOffWall(player) {
    const directions = [
      [Math.cos(player.angle), Math.sin(player.angle)],
      [-Math.cos(player.angle), -Math.sin(player.angle)],
      [Math.cos(player.angle + Math.PI / 2), Math.sin(player.angle + Math.PI / 2)],
      [Math.cos(player.angle - Math.PI / 2), Math.sin(player.angle - Math.PI / 2)],
    ];
    return directions.some(([x, z]) => leaveWall(player, x, z, true));
  }

  function movePlayerOnWall(player, dx, dz, magnitude) {
    player.y = WALL_TOP_HEIGHT;
    player.vy = 0;
    if (magnitude < 0.08) {
      state.wallDismountReady = true;
      return;
    }
    if (!state.wallDismountReady) return;
    const nx = player.x + dx;
    const nz = player.z + dz;
    if (isClimbableWallAt(nx, nz)) {
      player.x = nx;
      player.z = nz;
      return;
    }
    if (getCell(nx, nz) !== 0) return;
    leaveWall(player, dx, dz, false);
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
    const wantsCrouch = keys.KeyC || keys.ControlLeft || keys.ControlRight || state.crouchToggle;
    state.crouching = Boolean(wantsCrouch && !state.wallClimb && (p.alive || p.outroom));
    if (state.crouching) state.movingTableId = null;
    const sprint = (keys.ShiftLeft || keys.ShiftRight || touchActions.sprint) && !state.crouching;
    state.sprinting = Boolean(sprint);
    const movementSpeed = state.crouching ? 1.55 : (sprint ? 4.25 : 2.65);
    const speed = movementSpeed * dt / Math.max(1, magnitude);
    const moveX = (Math.cos(p.angle) * forward + Math.cos(p.angle + Math.PI / 2) * side) * speed;
    const moveZ = (Math.sin(p.angle) * forward + Math.sin(p.angle + Math.PI / 2) * side) * speed;
    const canMove = p.alive || p.outroom;

    if (state.wallClimb) {
      updateWallClimb(p, dt);
    } else if (state.onWall) {
      if ((keys.Space || touchActions.jump || state.jumping) && jumpOffWall(p)) {
        state.jumping = false;
      } else {
        movePlayerOnWall(p, moveX, moveZ, magnitude);
      }
    } else {
      const beforeX = p.x;
      const beforeZ = p.z;
      if (canMove) moveActor(p, moveX, moveZ);
      const intendedDistance = Math.hypot(moveX, moveZ);
      const movedDistance = Math.hypot(p.x - beforeX, p.z - beforeZ);
      const blocked = intendedDistance > 0.001 && movedDistance < intendedDistance * 0.42;
      if (p.alive && !p.outroom && p.y <= 0.001 && blocked) {
        const directionLength = Math.max(0.001, Math.hypot(moveX, moveZ));
        const wall = findClimbableWallAhead(p, moveX / directionLength, moveZ / directionLength);
        if (wall) {
          state.wallContactTime += dt;
          if (state.wallContactTime >= 0.14) startWallClimb(p, wall);
        } else state.wallContactTime = 0;
      } else state.wallContactTime = 0;

      if (!state.wallClimb) {
        if ((keys.Space || touchActions.jump || state.jumping) && p.y <= 0.001) p.vy = 4.2;
        p.vy -= 10.5 * dt;
        p.y = Math.max(0, p.y + p.vy * dt);
        if (p.y === 0 && p.vy < 0) p.vy = 0;
      }
    }
    updateMovingTable();
    updateTableCover();
    if (p.alive && (state.firing || touchActions.shoot)) {
      let burst = 0;
      while (p.cooldown <= 0 && burst < 24 && p.alive) {
        if (!fire(p)) break;
        burst += 1;
      }
    } else p.cooldown = Math.max(0, p.cooldown);
  }

  function wrapEndlessEntities() {
    if (state.mode !== "waves") return;
    const wrap = (value) => {
      if (value < 10) return value + 48;
      if (value >= 58) return value - 48;
      return value;
    };
    for (const actor of state.players) {
      actor.x = wrap(actor.x);
      actor.z = wrap(actor.z);
    }
    for (const decal of state.decals) {
      decal.x = wrap(decal.x);
      decal.z = wrap(decal.z);
    }
    for (const tracer of state.tracers) {
      tracer.x1 = wrap(tracer.x1);
      tracer.z1 = wrap(tracer.z1);
      tracer.x2 = wrap(tracer.x2);
      tracer.z2 = wrap(tracer.z2);
    }
    const moving = activeFurniture.find((item) => item.id === state.movingTableId);
    if (moving) {
      moving.x = wrap(moving.x);
      moving.z = wrap(moving.z);
    }
  }

  function checkWinner(dt) {
    if (state.mode === "waves") {
      if (!state.player?.alive) {
        state.endDelay += dt;
        if (state.endDelay >= 1.25) {
          state.winner = null;
          endMatch();
        }
        return;
      }
      const botsLeft = state.players.filter((actor) => actor.bot && actor.alive).length;
      if (botsLeft === 0) {
        state.waveDelay += dt;
        if (state.waveDelay >= 1.35) {
          if (state.wave < WAVE_BOT_COUNTS.length) startWave(state.wave + 1);
          else {
            state.winner = state.player.team;
            endMatch();
          }
        }
      } else state.waveDelay = 0;
      return;
    }
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
    }
    const expiredUpgrades = [];
    Object.keys(UPGRADE_COST).forEach((key) => {
      if (!state.upgrades[key]) return;
      state.upgradeMatches[key] = Math.max(0, (state.upgradeMatches[key] || UPGRADE_MATCH_LIFETIME) - 1);
      if (state.upgradeMatches[key] === 0) {
        state.upgrades[key] = false;
        expiredUpgrades.push(key === "handgun" ? "Superpistolen" : "Supersiktet");
      }
    });
    if (!state.upgrades.longgun) state.scoped = false;
    saveProgress();
    const title = document.getElementById("match-end-title");
    const message = document.getElementById("match-end-message");
    const kicker = document.getElementById("match-end-kicker");
    if (kicker) kicker.textContent = state.mode === "waves" ? `WAVES · ${state.wave}/7` : "MATCHEN ÄR SLUT";
    if (title) title.textContent = playerWon
      ? (state.mode === "waves" ? "SJU VÅGOR KLARA!" : "DU VANN!")
      : (state.mode === "waves" ? "HUSET VANN DENNA GÅNG" : "VINNARE!");
    if (message) {
      const resultText = state.mode === "waves"
        ? (playerWon
          ? "Du klarade alla sju vågorna i det oändliga huset. +100 Paint-poäng!"
          : `Du tog dig till wave ${state.wave} av 7. Försök igen!`)
        : (playerWon
          ? "Du eller ditt lag blev sist kvar i Paint War. +100 Paint-poäng!"
          : "Du åkte ut, men färgkriget fortsatte till sista deltagaren.");
      message.textContent = expiredUpgrades.length
        ? `${resultText} ${expiredUpgrades.join(" och ")} tog slut och kan köpas igen i Shoppen.`
        : resultText;
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
    wrapEndlessEntities();
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
      } else if (cell === 1 || cell === 4) {
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
      let color = climbableWalls[cellIndex(hit.mapX, hit.mapZ)] ? "#75f04f" : WALL_COLORS[theme];
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
    drawFurniture2D(p, fov, horizon, proj, zBuffer);
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

  function drawFurniture2D(p, fov, horizon, proj, zBuffer) {
    const visible = activeFurniture
      .map((item) => ({ item, q: projectPoint(p, item.x, item.z, fov, horizon, proj) }))
      .filter(({ q }) => q && q.depth > 0.15)
      .sort((a, b) => b.q.depth - a.q.depth);
    for (const { item, q } of visible) {
      const column = Math.max(0, Math.min(W - 1, Math.floor(q.x)));
      if (zBuffer[column] + 0.3 < q.depth) continue;
      const width = Math.max(3, Math.min(W, proj * item.width / q.depth));
      const height = Math.max(3, Math.min(H, proj * item.height / q.depth));
      const bottom = horizon + proj * CAMERA_HEIGHT / q.depth;
      const top = bottom - height;
      g.fillStyle = "rgba(12,18,33,.28)";
      g.fillRect(q.x - width * 0.54, top + 3, width * 1.08, height);
      g.fillStyle = item.color;
      g.fillRect(q.x - width / 2, top, width, height);
      g.fillStyle = "rgba(255,255,255,.34)";
      g.fillRect(q.x - width / 2, top, width, Math.max(2, height * 0.1));
      g.strokeStyle = "#24303c";
      g.lineWidth = Math.max(1, width * 0.025);
      g.strokeRect(q.x - width / 2, top, width, height);
      if (item.kind === "cabinet" || item.kind === "crate") {
        g.beginPath();
        g.moveTo(q.x, top);
        g.lineTo(q.x, bottom);
        g.stroke();
      } else {
        g.fillStyle = "rgba(28,35,49,.5)";
        g.fillRect(q.x - width * 0.4, top + height * 0.52, width * 0.8, Math.max(2, height * 0.08));
      }
    }
  }

  function drawMinimap(p) {
    if (state.scoped) return;
    const size = 72;
    const left = 8;
    const top = 8;
    g.fillStyle = "rgba(8,18,25,.68)";
    g.fillRect(left, top, size, size);
    const arenaExtent = Math.max(activeBounds.maxX, activeBounds.maxZ, 1);
    const scale = size / arenaExtent;
    g.fillStyle = "rgba(215,226,219,.42)";
    for (let z = activeBounds.minZ; z <= activeBounds.maxZ; z += 2) {
      for (let x = activeBounds.minX; x <= activeBounds.maxX; x += 2) {
        const cell = getCell(x, z);
        if (cell === 1 || cell === 2) {
          g.fillRect(left + x * scale, top + z * scale, 2 * scale + 0.5, 2 * scale + 0.5);
        }
      }
    }
    g.fillStyle = "#7bea58";
    for (let z = activeBounds.minZ; z <= activeBounds.maxZ; z += 1) {
      for (let x = activeBounds.minX; x <= activeBounds.maxX; x += 1) {
        if (climbableWalls[cellIndex(x, z)]) {
          g.fillRect(left + x * scale, top + z * scale, Math.max(1, scale), Math.max(1, scale));
        }
      }
    }
    for (const item of activeFurniture) {
      g.fillStyle = item.color;
      g.fillRect(
        left + (item.x - item.width / 2) * scale,
        top + (item.z - item.depth / 2) * scale,
        Math.max(1, item.width * scale),
        Math.max(1, item.depth * scale),
      );
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
    // Det nya WebGL-lagret sköter bilden när det har startat. Den gamla
    // raycastern ligger kvar som en säker reserv för enheter utan WebGL.
    if (window.PaintWar3DActive) return;
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
    setText(["team", "team-label"], p ? (
      state.mode === "solo" ? "SOLO"
        : state.mode === "waves" ? "PISTOLVÅGOR"
          : `LAG ${p.team + 1}`
    ) : "–");
    setText(["mode", "mode-label"], state.mode === "waves"
      ? `WAVE ${state.wave}/7`
      : state.mode ? `${state.mode.toUpperCase()} · ${MAP_LABELS[state.mapId] || ""}` : "–");
    const alive = state.mode === "waves"
      ? state.players.filter((x) => x.bot && x.alive).length
      : state.players.filter((x) => x.alive).length;
    setText(["alive", "players-left", "alive-count", "spectating-count"], `${alive}`);
    const healthFill = document.getElementById("health-fill");
    if (healthFill) healthFill.style.width = `${Math.max(0, hp)}%`;
    if (p) {
      const stats = weaponStats(p);
      setText(["weapon", "weapon-name", "weapon-label"], `${stats.name}${stats.upgraded ? " ★" : ""}`.toUpperCase());
      const symbol = document.getElementById("weapon-symbol");
      if (symbol) symbol.textContent = state.weapon === 0 ? "▰" : "▰━";
      const teamBadge = document.getElementById("team-badge");
      if (teamBadge) teamBadge.hidden = state.phase !== "playing" || state.mode === "solo" || state.mode === "waves";
      const teamDot = teamBadge && teamBadge.querySelector(".team-dot");
      if (teamDot) {
        teamDot.style.background = p.color;
        teamDot.style.boxShadow = `0 0 8px ${p.color}`;
      }
    }
    const status = document.getElementById("status-banner");
    if (status) {
      status.hidden = !(state.phase === "playing" && state.messageTime > 0 && state.message);
      status.textContent = state.underTableId
        ? "SKYDDAD UNDER BORDET"
        : state.messageTime > 0 ? state.message : "";
      status.hidden = !(state.phase === "playing" && (state.underTableId || (state.messageTime > 0 && state.message)));
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
    const shopMessage = document.getElementById("shop-message");
    if (shopMessage) {
      shopMessage.textContent = "Varje uppgradering håller i 3 färdigspelade matcher och kan sedan köpas igen.";
    }
    document.querySelectorAll("[data-upgrade]").forEach((card) => {
      const key = card.dataset.upgrade;
      if (!(key in UPGRADE_COST)) return;
      const bought = state.upgrades[key];
      const remaining = bought ? Math.max(1, state.upgradeMatches[key] || UPGRADE_MATCH_LIFETIME) : 0;
      card.classList.toggle("bought", bought);
      card.classList.toggle("owned", bought);
      card.dataset.matchesRemaining = `${remaining}`;
      const button = card.querySelector("[data-buy]");
      if (!button) return;
      button.disabled = bought || state.coins < UPGRADE_COST[key];
      button.classList.toggle("bought", bought);
      button.classList.toggle("owned", bought);
      const label = document.getElementById(`${key}-price`) || button.querySelector("small");
      if (label) label.textContent = bought ? `${remaining} MATCHER KVAR` : `✦ ${UPGRADE_COST[key]}`;
      const mainLabel = button.querySelector("span");
      if (mainLabel) mainLabel.textContent = bought ? "AKTIV UPPGRADERING" : "KÖP UPPGRADERING";
    });
  }

  function bindClick(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }

  bindClick("solo-btn", () => chooseMode("solo"));
  bindClick("duo-btn", () => chooseMode("duo"));
  bindClick("team-btn", () => startMatch("team", "village"));
  bindClick("waves-btn", () => startMatch("waves", "endless-house"));
  document.querySelectorAll("[data-map]").forEach((button) => {
    button.addEventListener("click", () => startMatch(state.pendingMode || "solo", button.dataset.map));
  });
  bindClick("map-select-back", returnToMenu);
  bindClick("shop-btn", openShop);
  bindClick("shop-close", returnToMenu);
  bindClick("close-shop-btn", returnToMenu);
  bindClick("home-btn", returnToMenu);
  bindClick("play-again-btn", () => startMatch(state.mode || "solo", state.mapId || "village"));
  bindClick("back-to-menu-btn", returnToMenu);
  bindClick("restart-btn", () => startMatch(state.mode || "solo", state.mapId || "village"));
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
    if (action === "crouch") {
      if (active) {
        state.crouchToggle = !state.crouchToggle;
        state.crouching = state.crouchToggle;
      }
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
    if (action === "move-table") toggleMoveTable();
    if (action === "weapon-1") state.weapon = 0;
    if (action === "weapon-2") state.weapon = 1;
    if (action === "scope" && state.weapon === 1 && state.upgrades.longgun) state.scoped = !state.scoped;
    if (action === "menu" || action === "back-menu") returnToMenu();
    if (action === "restart") startMatch(state.mode || "solo", state.mapId || "village");
    if (action === "solo" || action === "duo") chooseMode(action);
    if (action === "team") startMatch("team", "village");
    if (action === "waves") startMatch("waves", "endless-house");
    if (action === "shop") openShop();
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      capturePointerSafely(button, event.pointerId);
      button.classList.add("active");
      handleAction(action, true);
    });
    const release = (event) => {
      event.preventDefault();
      if (action === "crouch") button.classList.toggle("active", state.crouchToggle);
      else button.classList.remove("active");
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
    if (event.code === "KeyE" && !event.repeat) toggleMoveTable();
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

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) state.firing = true;
  });
  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) state.firing = false;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || state.phase !== "playing") return;
    event.preventDefault();
    if (pointerState.look) return;
    capturePointerSafely(canvas, event.pointerId);
    pointerState.look = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    state.cameraOrbit.dragging = true;
    state.cameraOrbit.lastInputTime = state.time;
  }, { passive: false });
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch"
      || !pointerState.look
      || pointerState.look.id !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - pointerState.look.x;
    const dy = event.clientY - pointerState.look.y;
    pointerState.look.x = event.clientX;
    pointerState.look.y = event.clientY;
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
    state.cameraOrbit.yaw = normalizeAngle(state.cameraOrbit.yaw + dx * 0.0044);
    if (Math.abs(dx) >= 0.1) facePlayerTowardCamera();
    state.cameraOrbit.elevation = Math.max(
      CAMERA_ORBIT_MIN_ELEVATION,
      Math.min(CAMERA_ORBIT_MAX_ELEVATION, state.cameraOrbit.elevation + dy * 0.0015),
    );
    state.cameraOrbit.dragging = true;
    state.cameraOrbit.lastInputTime = state.time;
  }, { passive: false });
  function releasePointer(event) {
    if (pointerState.move && pointerState.move.id === event.pointerId) pointerState.move = null;
    if (pointerState.look && pointerState.look.id === event.pointerId) {
      pointerState.look = null;
      state.cameraOrbit.dragging = false;
      state.cameraOrbit.lastInputTime = state.time;
    }
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
      capturePointerSafely(joystick, event.pointerId);
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
      graphics: state.graphics3d ? "real-time WebGL 3D" : "canvas raycaster fallback",
      camera: state.graphics3d ? "third-person, diagonal behind and above the player" : "fallback view",
      cameraOrbit: {
        yaw: Number(state.cameraOrbit.yaw.toFixed(3)),
        elevation: Number(state.cameraOrbit.elevation.toFixed(3)),
        dragging: state.cameraOrbit.dragging,
        touchDragEnabled: true,
      },
      phase: state.phase,
      mode: state.mode,
      map: state.mapId,
      mapLabel: MAP_LABELS[state.mapId] || state.mapId,
      wave: state.mode === "waves" ? state.wave : null,
      wavesTotal: 7,
      timeSeconds: Number(state.time.toFixed(2)),
      player: p ? {
        x: Number(p.x.toFixed(2)),
        z: Number(p.z.toFixed(2)),
        y: Number(p.y.toFixed(2)),
        vy: Number(p.vy.toFixed(2)),
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
        crouching: state.crouching,
        underTable: state.underTableId,
        movingTable: state.movingTableId,
        eyeHeight: Number(actorShotOrigin(p).toFixed(2)),
        onWall: state.onWall,
        wallClimbing: Boolean(state.wallClimb),
        wallClimbProgress: state.wallClimb
          ? Number(state.wallClimb.progress.toFixed(2))
          : (state.onWall ? 1 : 0),
      } : null,
      match: {
        activeCount: state.players.filter((actor) => actor.alive).length,
        botsRemaining: state.players.filter((actor) => actor.bot && actor.alive).length,
        outroomCount: state.players.filter((actor) => actor.outroom).length,
        winner: state.winner,
        paintDecals: state.decals.length,
      },
      upgrades: { ...state.upgrades },
      upgradeMatchesRemaining: { ...state.upgradeMatches },
      upgradeRules: {
        playerOnly: true,
        botsCanUpgrade: false,
        expiresAfterCompletedMatches: UPGRADE_MATCH_LIFETIME,
        repurchaseRequiredAfterExpiry: true,
      },
      coins: state.coins,
      nearbyParticipants: visible.map((actor) => {
        const actorWeapon = weaponStats(actor);
        return {
          id: actor.id,
          name: actor.name,
          x: Number(actor.x.toFixed(2)),
          z: Number(actor.z.toFixed(2)),
          y: Number(actor.y.toFixed(2)),
          hp: actor.health,
          alive: actor.alive,
          team: actor.team,
          location: actor.outroom ? "outroom" : "arena",
          distance: Number(Math.hypot(actor.x - p.x, actor.z - p.z).toFixed(2)),
          weapon: actorWeapon.key,
          weaponUpgraded: actorWeapon.upgraded,
          fireIntervalMs: actorWeapon.interval,
          range: actorWeapon.range,
          crouching: false,
          onWall: false,
        };
      }),
      arena: {
        id: activeMapId,
        kind: activeMapKind,
        size: activeMapKind === "endless-house" ? "periodic house that continues forever" : `${activeBounds.width}x${activeBounds.height}`,
        areaMultiplier: activeMapKind === "village" ? ARENA_AREA_MULTIPLIER : 1,
        districts: activeTiles.length,
        houses: activeHouseDefs.length,
        furniture: activeFurniture.length,
        movableTables: activeFurniture.filter((item) => item.movable).length,
        climbableStandaloneWallCells: climbableWalls.reduce((total, value) => total + value, 0),
        characters: state.graphics3d ? "animated 3D people" : "2D fallback people",
        windowsAreShootThrough: true,
        paintPersistsUntilMatchEnd: true,
      },
      mobilityRules: {
        playerCanRunUpStandaloneWalls: true,
        houseWallsClimbable: false,
        botsCanWallRun: false,
        playerCanCrouch: true,
        playerCanHideUnderTables: true,
        tablesBlockShots: true,
        shootingAutoTargetsNearestEnemy: true,
        manualAiming: false,
        touchDragRotatesThirdPersonCamera: true,
        botsHandgunOnlyInWaves: true,
        botsCanCrouch: false,
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
    chooseMode,
    returnToMenu,
    openShop,
    buyUpgrade,
    resetCameraOrbit,
    toggleMoveTable,
    fireActor: fire,
    getState: () => state,
    getArena: () => ({
      id: activeMapId,
      kind: activeMapKind,
      revision: arenaRevision,
      width: MAP_W,
      height: MAP_H,
      districtSize: DISTRICT_SIZE,
      areaMultiplier: ARENA_AREA_MULTIPLIER,
      tiles: activeTiles,
      bounds: activeBounds,
      outroom: OUTROOM,
      cells: grid,
      wallThemes: wallTheme,
      climbableWalls,
      houses: activeHouseFloors,
      houseDefs: activeHouseDefs,
      furniture: activeFurniture,
    }),
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
