(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const gameFrame = document.getElementById("game-frame");
  const startScreen = document.getElementById("start-screen");
  const pauseScreen = document.getElementById("pause-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const victoryScreen = document.getElementById("victory-screen");
  const victoryStats = document.getElementById("victory-stats");
  const victoryEyebrow = victoryScreen.querySelector(".eyebrow");
  const victoryTitle = victoryScreen.querySelector("h2");
  const replayButton = document.getElementById("replay-btn");
  const pauseButton = document.getElementById("pause-btn");
  const soundButton = document.getElementById("sound-btn");
  const fullscreenButton = document.getElementById("fullscreen-btn");
  const boatControlButton = document.getElementById("boat-control-btn");

  const LOGICAL_WIDTH = 1140;
  const LOGICAL_HEIGHT = 720;
  const GRID_WIDTH = 19;
  const GRID_HEIGHT = 11;
  const TILE = 54;
  const MAP_X = (LOGICAL_WIDTH - GRID_WIDTH * TILE) / 2;
  const MAP_Y = 94;
  const MOVE_TIME = 105;
  const SONAR_DURATION = 1450;
  const SONAR_COOLDOWN = 4200;
  const LEVEL_BANNER_DURATION = 1350;
  const MAX_HEARTS = 3;
  const VIEW_TOP = 78;
  const BASE_VIEW_HORIZON = 334;
  const CAMERA_FOV_DEGREES = 88;
  const CAMERA_FOV = CAMERA_FOV_DEGREES * Math.PI / 180;
  const CAMERA_BACK_OFFSET = 0.28;
  const CAMERA_HEIGHT = 0.52;
  const CAMERA_FOCAL = (LOGICAL_WIDTH / 2) / Math.tan(CAMERA_FOV / 2);
  const RAY_STRIP_WIDTH = 2;
  const CAMERA_MIN_PITCH = -0.3;
  const CAMERA_MAX_PITCH = 0.38;
  const LOBBY_BOT_MOVE_TIME = 460;
  const BOAT_MOVE_TIME = 180;
  const PARTY_HELPER_MOVE_TIME = 180;

  const LEVELS = [
    {
      name: "THE FIRST MAZE",
      subtitle: "Fyra skyltar. En är sann.",
      shadowSpeed: 900,
      map: [
        "#########F#########",
        "#S#.....#.....#...#",
        "#.###.#.###.#.#.#.#",
        "#.....#.#...#...#.#",
        "#######.#.#######.#",
        "E.....#...#.#...#.F",
        "#.###.#####.#.#.#.#",
        "#.#.......#...#...#",
        "#.#.#######.#######",
        "#.#...............#",
        "#########F#########",
      ],
    },
    {
      name: "THE WRONG FLOOR",
      subtitle: "Någonting rör sig i korridorerna.",
      shadowSpeed: 780,
      map: [
        "#########F#########",
        "#S....#...#.......#",
        "#####.#.#.#.#.###.#",
        "#...#...#.#.#...#.#",
        "#.#######.#.###.###",
        "F.#.......#...#...F",
        "#.#.#########.###.#",
        "#.#...#.........#.#",
        "#.###.###########.#",
        "#..............G..#",
        "#########E#########",
      ],
    },
    {
      name: "THE LAST CORRIDOR",
      subtitle: "Hitta ut innan de hittar dig.",
      shadowSpeed: 660,
      map: [
        "#########F#########",
        "#S....#.........#.#",
        "#####.#.#######.#.#",
        "#...#...#.#.G.#...#",
        "#.#######.#.#.###.#",
        "F.......#...#.#...E",
        "#.#####.#.###.#.###",
        "#.#...#.#.#.#...#.#",
        "#.###.#.#.#.#####.#",
        "#.....#...G.......#",
        "#########F#########",
      ],
    },
  ];

  const LOBBY_MAP = [
    "VVVVVVVVVVVVVVVVVVV",
    "VVVVVVVVVVVVVVVVVVV",
    "VVV#4#1#2#3#VVVVVVV",
    "VVV#.......#VVVVVVV",
    "VVV#.......#VVVVVVV",
    "VVV#.......#VVVVVVV",
    "VVV#...S...#VVVVVVV",
    "VVV#.......#VVVVVVV",
    "VVV#########VVVVVVV",
    "VVVVVVVVVVVVVVVVVVV",
    "VVVVVVVVVVVVVVVVVVV",
  ];

  const LOBBY_DOOR_TYPES = {
    "4": { mode: "play", label: "PLAY", color: "#ff3e58", available: true, players: 10 },
    "1": { mode: "solo", label: "SOLO", color: "#55e8ff", available: true, players: 1 },
    "2": { mode: "duo", label: "DUO", color: "#ffd45e", available: true, players: 2 },
    "3": { mode: "team", label: "TEAM", color: "#ff5a91", available: true, players: 3 },
  };

  const LOBBY_BOT_PLANS = [
    {
      id: "dubi",
      name: "DUBI",
      targetMode: "duo",
      targetLabel: "DUO",
      color: "#ffd45e",
      bodyColor: "#b87820",
      startDelayMs: 450,
      spawn: { x: 6, y: 5 },
      path: [{ x: 7, y: 5 }, { x: 8, y: 5 }, { x: 8, y: 4 }, { x: 8, y: 3 }],
    },
    {
      id: "teo",
      name: "TEO",
      targetMode: "team",
      targetLabel: "TEAM",
      color: "#ff5a91",
      bodyColor: "#bd356c",
      startDelayMs: 700,
      spawn: { x: 7, y: 5 },
      path: [{ x: 8, y: 5 }, { x: 9, y: 5 }, { x: 10, y: 5 }, { x: 10, y: 4 }, { x: 10, y: 3 }],
    },
    {
      id: "toto",
      name: "TOTO",
      targetMode: "team",
      targetLabel: "TEAM",
      color: "#ff5a91",
      bodyColor: "#7947b8",
      startDelayMs: 950,
      spawn: { x: 8, y: 5 },
      path: [{ x: 9, y: 5 }, { x: 9, y: 4 }, { x: 10, y: 4 }, { x: 10.25, y: 3 }],
    },
  ];

  const SEA_MAP = Array.from({ length: GRID_HEIGHT }, () => ".".repeat(GRID_WIDTH));
  const SEA_ISLANDS = [
    {
      id: "hotel-island",
      name: "HOTELLÖN",
      x: 9,
      y: 1,
      dockX: 9,
      dockY: 2,
      isCorrect: true,
      hasHotel: true,
      color: "#b8ff69",
    },
    {
      id: "mist-island",
      name: "DIMÖN",
      x: 4,
      y: 4,
      dockX: 4,
      dockY: 5,
      isCorrect: false,
      hasHotel: false,
      color: "#8fc3c9",
    },
    {
      id: "rock-island",
      name: "KLIPPÖN",
      x: 14,
      y: 5,
      dockX: 14,
      dockY: 6,
      isCorrect: false,
      hasHotel: false,
      color: "#b39a7a",
    },
  ];

  const HOTEL_MAP_TEMPLATE = [
    "####H####H####H####",
    "#.................#",
    "#..#####.#####....#",
    "#..#...#.#...#....#",
    "#..#K..#.#........#",
    "#..#...#.#........H",
    "#..##.##.#####....#",
    "#.................#",
    "#........S........#",
    "#.................#",
    "###################",
  ];
  const HOTEL_DOOR_SPOTS = [
    { id: "room-101", label: "RUM 101", x: 4, y: 0 },
    { id: "room-102", label: "RUM 102", x: 9, y: 0 },
    { id: "room-103", label: "RUM 103", x: 14, y: 0 },
    { id: "room-104", label: "RUM 104", x: 18, y: 5 },
  ];
  const HOTEL_CORRECT_DOOR = {
    solo: "room-104",
    duo: "room-102",
    team: "room-103",
  };

  const PLAY_ROULETTE_SPIN_MS = 4600;
  const PLAY_ROULETTE_REVEAL_MS = 1500;
  const PLAY_HUNT_START_DELAY_MS = 1500;
  const PLAY_BOT_MOVE_TIME = 260;
  const PLAY_MONSTER_MOVE_TIME = 210;
  const PLAY_BOT_ROSTER = [
    { id: "bot-01", name: "DUBI", color: "#ffd45e", bodyColor: "#b87820" },
    { id: "bot-02", name: "TEO", color: "#ff5a91", bodyColor: "#bd356c" },
    { id: "bot-03", name: "TOTO", color: "#b979ff", bodyColor: "#7947b8" },
    { id: "bot-04", name: "BIBI", color: "#55a8ff", bodyColor: "#2867a6" },
    { id: "bot-05", name: "NEO", color: "#7eff8b", bodyColor: "#34884a" },
    { id: "bot-06", name: "LEO", color: "#55e8ff", bodyColor: "#247d91" },
    { id: "bot-07", name: "MIMI", color: "#ff9f55", bodyColor: "#a65b28" },
    { id: "bot-08", name: "NOVA", color: "#ff6bd6", bodyColor: "#9a3f82" },
    { id: "bot-09", name: "ZIGGY", color: "#b8ff69", bodyColor: "#668f38" },
  ];
  const PLAY_ROULETTE_MAP = [
    "###################",
    "#.................#",
    "#.................#",
    "#.................#",
    "#.................#",
    "#.................#",
    "#.................#",
    "#.................#",
    "#........S........#",
    "#.................#",
    "###################",
  ];
  const PLAY_HUNT_MAP = [
    "#########E#########",
    "#.................#",
    "#..###.......###..#",
    "#..#...........#..#",
    "#......#####......#",
    "F.....##...##.....F",
    "#......#####......#",
    "#..#...........#..#",
    "#..###.......###..#",
    "#....K...S........#",
    "#########F#########",
  ];
  const PLAY_HUNT_BOT_SPAWNS = [
    { x: 4, y: 1 }, { x: 9, y: 1 }, { x: 14, y: 1 },
    { x: 4, y: 3 }, { x: 9, y: 3 }, { x: 14, y: 3 },
    { x: 4, y: 7 }, { x: 9, y: 7 }, { x: 14, y: 7 },
  ];

  const COLORS = {
    night: "#050c1a",
    nightBlue: "#0a1b31",
    floor: "#e9e6cf",
    floorAlt: "#ddd9c0",
    floorLine: "#c9c5ae",
    wall: "#152945",
    wallTop: "#294765",
    wallDark: "#081629",
    cyan: "#55e8ff",
    cyanSoft: "#a7f7ff",
    lime: "#b8ff69",
    pink: "#ff4b82",
    red: "#ff3e58",
    orange: "#ffb13b",
    ink: "#0a1729",
    white: "#f7fff4",
  };

  const state = {
    mode: "start",
    scene: "lobby",
    playMode: null,
    levelIndex: 0,
    map: [],
    player: null,
    start: null,
    shadows: [],
    doors: [],
    lobbyDoors: [],
    lobbyBots: [],
    partyBots: [],
    partyAssistance: {
      scene: null,
      keyMarked: false,
      correctHotelDoorId: null,
      correctExit: null,
      warnedWrongExit: null,
      navigationActive: false,
    },
    boat: null,
    deckPlayer: null,
    controlTarget: "player",
    islands: [],
    hotel: null,
    inventory: {
      hotelKey: false,
    },
    adventure: {
      seaCompleted: false,
      hotelCompleted: false,
    },
    play: null,
    hearts: MAX_HEARTS,
    mistakes: 0,
    elapsedMs: 0,
    levelElapsedMs: 0,
    sonar: {
      activeMs: 0,
      cooldownMs: 0,
      elapsedMs: 0,
    },
    message: "",
    messageMs: 0,
    levelBannerMs: 0,
    transitionMs: 0,
    invulnerableMs: 0,
    flashMs: 0,
    shakeMs: 0,
    bumpMs: 0,
    visualTime: 0,
    soundOn: true,
    particles: [],
    confetti: [],
    cameraAngle: -Math.PI / 2,
    cameraTargetAngle: -Math.PI / 2,
    cameraPitch: 0,
    cameraTargetPitch: 0,
  };

  const input = {
    held: new Set(),
    primary: null,
    repeatMs: 0,
  };

  const cameraPointer = {
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    totalDistance: 0,
  };

  let audioContext = null;
  let pixelRatio = 1;
  let lastFrameTime = performance.now();
  let forcedPlayMonsterId = null;

  function validateLevels() {
    LEVELS.forEach((level, levelIndex) => {
      if (level.map.length !== GRID_HEIGHT) {
        throw new Error("Level " + (levelIndex + 1) + " must have " + GRID_HEIGHT + " rows.");
      }
      level.map.forEach((row, rowIndex) => {
        if (row.length !== GRID_WIDTH) {
          throw new Error(
            "Level " + (levelIndex + 1) + ", row " + rowIndex + " has " + row.length + " columns."
          );
        }
      });
    });

    if (
      LOBBY_MAP.length !== GRID_HEIGHT ||
      LOBBY_MAP.some((row) => row.length !== GRID_WIDTH)
    ) {
      throw new Error("The start room must be exactly 19x11 tiles.");
    }
    const lobbyDoorCount = LOBBY_MAP.join("")
      .split("")
      .filter((cell) => LOBBY_DOOR_TYPES[cell]).length;
    if (lobbyDoorCount !== 4 || !LOBBY_MAP.join("").includes("S")) {
      throw new Error("The start room needs one start and four mode doors.");
    }
    const duoBotCount = LOBBY_BOT_PLANS.filter((bot) => bot.targetMode === "duo").length;
    const teamBotCount = LOBBY_BOT_PLANS.filter((bot) => bot.targetMode === "team").length;
    if (LOBBY_BOT_PLANS.length !== 3 || duoBotCount !== 1 || teamBotCount !== 2) {
      throw new Error("The start room needs one Duo bot and two Team bots.");
    }
    if (
      HOTEL_MAP_TEMPLATE.length !== GRID_HEIGHT ||
      HOTEL_MAP_TEMPLATE.some((row) => row.length !== GRID_WIDTH)
    ) {
      throw new Error("The hotel must be exactly 19x11 tiles.");
    }
    const hotelCells = HOTEL_MAP_TEMPLATE.join("");
    if (
      HOTEL_DOOR_SPOTS.length !== 4 ||
      (hotelCells.match(/H/g) || []).length !== 4 ||
      (hotelCells.match(/K/g) || []).length !== 1 ||
      (hotelCells.match(/S/g) || []).length !== 1
    ) {
      throw new Error("The hotel needs one start, one key and four doors.");
    }
    if (
      PLAY_ROULETTE_MAP.length !== GRID_HEIGHT ||
      PLAY_ROULETTE_MAP.some((row) => row.length !== GRID_WIDTH) ||
      PLAY_HUNT_MAP.length !== GRID_HEIGHT ||
      PLAY_HUNT_MAP.some((row) => row.length !== GRID_WIDTH)
    ) {
      throw new Error("The Play rooms must be exactly 19x11 tiles.");
    }
    const playCells = PLAY_HUNT_MAP.join("");
    if (
      PLAY_BOT_ROSTER.length !== 9 ||
      PLAY_HUNT_BOT_SPAWNS.length !== 9 ||
      (playCells.match(/E/g) || []).length !== 1 ||
      (playCells.match(/F/g) || []).length !== 3 ||
      (playCells.match(/K/g) || []).length !== 1 ||
      (playCells.match(/S/g) || []).length !== 1
    ) {
      throw new Error("Play needs nine bots, one key and four doors with one real exit.");
    }
  }

  function hideAllScreens() {
    startScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    victoryScreen.classList.add("hidden");
  }

  function setMessage(text, duration) {
    state.message = text;
    state.messageMs = duration || 1700;
  }

  function normalizeAngle(angle) {
    let normalized = angle;
    while (normalized > Math.PI) normalized -= Math.PI * 2;
    while (normalized < -Math.PI) normalized += Math.PI * 2;
    return normalized;
  }

  function avatarViewFromAngles() {
    if (!state.player) {
      return "none";
    }
    const bodyAngle = Math.atan2(state.player.facingY, state.player.facingX);
    const relativeAngle = normalizeAngle(state.cameraAngle - bodyAngle);
    const absoluteAngle = Math.abs(relativeAngle);
    if (absoluteAngle < Math.PI / 4) {
      return "back";
    }
    if (absoluteAngle > Math.PI * 3 / 4) {
      return "front";
    }
    return relativeAngle > 0 ? "leftSide" : "rightSide";
  }

  function setCameraFacing(dx, dy, instant) {
    const angle = Math.atan2(dy, dx);
    state.cameraTargetAngle = angle;
    state.cameraTargetPitch = 0;
    if (instant) {
      state.cameraAngle = angle;
      state.cameraPitch = 0;
    }
  }

  function createLobbyBots() {
    return LOBBY_BOT_PLANS.map((plan, index) => {
      const firstTarget = plan.path[0] || plan.spawn;
      const dx = firstTarget.x - plan.spawn.x;
      const dy = firstTarget.y - plan.spawn.y;
      const length = Math.hypot(dx, dy) || 1;
      const destination = plan.path[plan.path.length - 1] || plan.spawn;
      return {
        id: plan.id,
        name: plan.name,
        targetMode: plan.targetMode,
        targetLabel: plan.targetLabel,
        targetX: destination.x,
        targetY: destination.y,
        color: plan.color,
        bodyColor: plan.bodyColor,
        x: plan.spawn.x,
        y: plan.spawn.y,
        fromX: plan.spawn.x,
        fromY: plan.spawn.y,
        facingX: dx / length,
        facingY: dy / length,
        path: plan.path.map((point) => ({ ...point })),
        pathIndex: 0,
        waitMs: plan.startDelayMs,
        startDelayMs: plan.startDelayMs,
        moveAnimMs: 0,
        walkMs: index * 130,
        status: "waiting",
      };
    });
  }

  function setSceneClass(scene) {
    [
      "lobby",
      "sea",
      "hotel",
      "maze",
      "play",
      "roulette",
      "hunt",
      "play-roulette",
      "play-hunt",
    ].forEach((name) => {
      document.body.classList.remove(name + "-mode");
    });
    document.body.classList.add(scene + "-mode");
    if (scene === "play") {
      const playPhase = state.play && state.play.phase === "hunt" ? "hunt" : "roulette";
      document.body.classList.add("play-" + playPhase + "-mode");
    }
    updateBoatControlButton();
  }

  function updateBoatControlButton() {
    if (!boatControlButton) {
      return;
    }
    const steeringBoat = state.scene === "sea" && state.controlTarget === "boat";
    boatControlButton.textContent = steeringBoat ? "PERSONSTYRNING" : "BÅTSTYRNING";
    boatControlButton.setAttribute(
      "aria-label",
      steeringBoat ? "Byt till personstyrning" : "Byt till båtstyrning"
    );
    boatControlButton.classList.toggle("active", steeringBoat);
  }

  function createPartyBots(mode) {
    return LOBBY_BOT_PLANS
      .filter((plan) => plan.targetMode === mode)
      .map((plan, index) => ({
        id: plan.id,
        name: plan.name,
        targetMode: plan.targetMode,
        targetLabel: plan.targetLabel,
        color: plan.color,
        bodyColor: plan.bodyColor,
        x: 0,
        y: 0,
        fromX: 0,
        fromY: 0,
        facingX: 0,
        facingY: -1,
        moveAnimMs: 0,
        walkMs: index * 130,
        startDelayMs: index * 170,
        status: "aboard",
        roleLabel: "HJÄLPER",
        helperTask: null,
        helperTarget: null,
        helperStation: null,
        helperPath: [],
        helperPathIndex: 0,
        helperWaitMs: 0,
        arrivalStatus: null,
        arrivalRoleLabel: null,
        followsPlayer: false,
      }));
  }

  function partyNames() {
    return state.partyBots.map((bot) => bot.name).join(" + ");
  }

  function setMapCell(x, y, symbol) {
    const row = state.map[y];
    state.map[y] = row.slice(0, x) + symbol + row.slice(x + 1);
  }

  function resetPartyAssistance(scene) {
    state.partyAssistance = {
      scene: scene || null,
      keyMarked: false,
      correctHotelDoorId: null,
      correctExit: null,
      warnedWrongExit: null,
      navigationActive: scene === "sea" && state.partyBots.length > 0,
    };
  }

  function placePartyBotsForDeployment() {
    if (!state.player || state.partyBots.length === 0) {
      return;
    }
    const forward = { x: state.player.facingX, y: state.player.facingY };
    const right = { x: -forward.y, y: forward.x };
    const offsets = [
      { x: -forward.x, y: -forward.y },
      { x: -right.x, y: -right.y },
      { x: right.x, y: right.y },
      { x: forward.x, y: forward.y },
    ];
    const occupied = new Set([state.player.x + "," + state.player.y]);
    state.partyBots.forEach((bot, index) => {
      const offset = offsets.find((candidate) => {
        const x = state.player.x + candidate.x;
        const y = state.player.y + candidate.y;
        return isWalkable(x, y) && !occupied.has(x + "," + y);
      }) || { x: 0, y: 0 };
      bot.x = state.player.x + offset.x;
      bot.y = state.player.y + offset.y;
      bot.fromX = bot.x;
      bot.fromY = bot.y;
      bot.facingX = forward.x;
      bot.facingY = forward.y;
      bot.moveAnimMs = 0;
      bot.walkMs = index * 130;
      bot.status = "preparing_help";
      bot.roleLabel = "HJÄLPER";
      bot.helperTask = null;
      bot.helperTarget = null;
      bot.helperStation = null;
      bot.helperPath = [];
      bot.helperPathIndex = 0;
      bot.helperWaitMs = index * 260;
      bot.arrivalStatus = null;
      bot.arrivalRoleLabel = null;
      bot.followsPlayer = false;
      occupied.add(bot.x + "," + bot.y);
    });
  }

  function findHelperStation(bot, target, reserved) {
    const directions = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ];
    return directions
      .map((direction) => ({
        x: target.x + direction.x,
        y: target.y + direction.y,
      }))
      .filter((candidate) => {
        return isWalkable(candidate.x, candidate.y) &&
          !reserved.has(candidate.x + "," + candidate.y);
      })
      .map((candidate) => ({
        ...candidate,
        path: findPath(bot.x, bot.y, candidate.x, candidate.y),
      }))
      .filter((candidate) => candidate.path.length > 0)
      .sort((a, b) => a.path.length - b.path.length)[0] || null;
  }

  function helperForTask(taskId) {
    return state.partyBots.find((bot) => bot.helperTask === taskId) || null;
  }

  function markPartyHelperArrival(bot, announce) {
    if (!bot.helperTarget || bot.helperTarget.scene !== state.scene) {
      return;
    }
    bot.status = bot.arrivalStatus || "helping_at_target";
    bot.roleLabel = bot.arrivalRoleLabel || "HJÄLPER HÄR";
    bot.helperPathIndex = bot.helperPath.length;
    const dx = bot.helperTarget.x - bot.x;
    const dy = bot.helperTarget.y - bot.y;
    const length = Math.hypot(dx, dy) || 1;
    bot.facingX = dx / length;
    bot.facingY = dy / length;

    if (bot.helperTask === "hotel-key") {
      state.partyAssistance.keyMarked = true;
      if (announce) setMessage(bot.name + ": NYCKELN ÄR HÄR", 1900);
    } else if (bot.helperTask === "hotel-correct-door") {
      state.partyAssistance.correctHotelDoorId = bot.helperTarget.doorId;
      if (announce) setMessage(bot.name + ": JAG VISAR RÄTT RUM", 1900);
    } else if (bot.helperTask === "maze-correct-exit") {
      state.partyAssistance.correctExit = {
        x: bot.helperTarget.x,
        y: bot.helperTarget.y,
      };
      if (announce) setMessage(bot.name + ": JAG HITTADE RÄTT EXIT", 1900);
    } else if (bot.helperTask === "maze-wrong-door") {
      state.partyAssistance.warnedWrongExit = {
        x: bot.helperTarget.x,
        y: bot.helperTarget.y,
      };
      if (announce) setMessage(bot.name + ": DEN HÄR EXIT ÄR FEL", 1900);
    }
  }

  function assignPartyHelperTask(bot, task) {
    const station = findHelperStation(bot, task.target, task.reserved);
    bot.helperTask = task.id;
    bot.helperTarget = {
      scene: state.scene,
      type: task.targetType,
      id: task.targetId || null,
      doorId: task.doorId || null,
      x: task.target.x,
      y: task.target.y,
    };
    bot.helperStation = station
      ? { x: station.x, y: station.y }
      : { x: bot.x, y: bot.y };
    bot.helperPath = station ? station.path.slice(1) : [];
    bot.helperPathIndex = 0;
    bot.helperWaitMs = task.delayMs || 0;
    bot.arrivalStatus = task.arrivalStatus;
    bot.arrivalRoleLabel = task.arrivalRoleLabel;
    bot.status = task.movingStatus;
    bot.roleLabel = task.movingRoleLabel;
    bot.moveAnimMs = 0;
    bot.followsPlayer = false;
    task.reserved.add(bot.helperStation.x + "," + bot.helperStation.y);
    if (bot.helperPath.length === 0) {
      markPartyHelperArrival(bot, false);
    }
  }

  function deployPartyHelpers() {
    resetPartyAssistance(state.scene);
    if (state.partyBots.length === 0 || (state.scene !== "hotel" && state.scene !== "maze")) {
      return;
    }
    placePartyBotsForDeployment();
    const reserved = new Set();

    if (state.scene === "hotel") {
      assignPartyHelperTask(state.partyBots[0], {
        id: "hotel-key",
        targetType: "key",
        targetId: state.hotel.key.id,
        target: state.hotel.key,
        reserved,
        delayMs: 240,
        movingStatus: "searching_key",
        movingRoleLabel: "LETAR NYCKEL",
        arrivalStatus: "pointing_key",
        arrivalRoleLabel: "NYCKEL HÄR",
      });
      if (state.partyBots[1]) {
        const correctDoor = state.doors.find((door) => door.isReal);
        assignPartyHelperTask(state.partyBots[1], {
          id: "hotel-correct-door",
          targetType: "door",
          targetId: correctDoor.id,
          doorId: correctDoor.id,
          target: correctDoor,
          reserved,
          delayMs: 520,
          movingStatus: "checking_room",
          movingRoleLabel: "KOLLAR RUM",
          arrivalStatus: "pointing_door",
          arrivalRoleLabel: "RÄTT RUM",
        });
      }
      return;
    }

    const correctExit = state.doors.find((door) => door.isReal);
    assignPartyHelperTask(state.partyBots[0], {
      id: "maze-correct-exit",
      targetType: "exit",
      targetId: "exit-" + correctExit.x + "-" + correctExit.y,
      target: correctExit,
      reserved,
      delayMs: 240,
      movingStatus: "searching_exit",
      movingRoleLabel: "LETAR EXIT",
      arrivalStatus: "pointing_exit",
      arrivalRoleLabel: "RÄTT EXIT",
    });
    if (state.partyBots[1]) {
      const wrongExit = state.doors
        .filter((door) => !door.isReal)
        .sort((a, b) => {
          const distanceA = Math.abs(a.x - state.start.x) + Math.abs(a.y - state.start.y);
          const distanceB = Math.abs(b.x - state.start.x) + Math.abs(b.y - state.start.y);
          return distanceA - distanceB;
        })[0];
      assignPartyHelperTask(state.partyBots[1], {
        id: "maze-wrong-door",
        targetType: "exit",
        targetId: "exit-" + wrongExit.x + "-" + wrongExit.y,
        target: wrongExit,
        reserved,
        delayMs: 520,
        movingStatus: "checking_door",
        movingRoleLabel: "KOLLAR EXIT",
        arrivalStatus: "warning_wrong_door",
        arrivalRoleLabel: "FEL DÖRR",
      });
    }
  }

  function reassignHotelHelpersAfterKey() {
    const keyHelper = helperForTask("hotel-key");
    const correctDoor = state.doors.find((door) => door.isReal);
    if (!keyHelper || !correctDoor) {
      return;
    }
    state.partyAssistance.keyMarked = true;
    if (state.partyBots.length === 1) {
      assignPartyHelperTask(keyHelper, {
        id: "hotel-correct-door",
        targetType: "door",
        targetId: correctDoor.id,
        doorId: correctDoor.id,
        target: correctDoor,
        reserved: new Set(),
        delayMs: 120,
        movingStatus: "checking_room",
        movingRoleLabel: "KOLLAR RUM",
        arrivalStatus: "pointing_door",
        arrivalRoleLabel: "RÄTT RUM",
      });
      return;
    }
    keyHelper.helperPath = [];
    keyHelper.helperPathIndex = 0;
    keyHelper.moveAnimMs = 0;
    keyHelper.status = "key_found";
    keyHelper.roleLabel = "NYCKEL HITTAD";
  }

  function updatePartyHelpers(dt) {
    if (state.scene !== "hotel" && state.scene !== "maze") {
      return;
    }
    state.partyBots.forEach((bot) => {
      if (!bot.helperTask) {
        return;
      }
      if (bot.helperWaitMs > 0) {
        bot.helperWaitMs = Math.max(0, bot.helperWaitMs - dt);
        return;
      }
      if (bot.moveAnimMs > 0) {
        bot.walkMs += dt;
        bot.moveAnimMs = Math.max(0, bot.moveAnimMs - dt);
        if (bot.moveAnimMs > 0) {
          return;
        }
      }
      if (bot.helperPathIndex >= bot.helperPath.length) {
        if (bot.status !== bot.arrivalStatus && bot.status !== "key_found") {
          markPartyHelperArrival(bot, true);
        }
        return;
      }
      const next = bot.helperPath[bot.helperPathIndex];
      const dx = next.x - bot.x;
      const dy = next.y - bot.y;
      const length = Math.hypot(dx, dy) || 1;
      bot.fromX = bot.x;
      bot.fromY = bot.y;
      bot.x = next.x;
      bot.y = next.y;
      bot.facingX = dx / length;
      bot.facingY = dy / length;
      bot.helperPathIndex += 1;
      bot.moveAnimMs = PARTY_HELPER_MOVE_TIME;
    });
  }

  function buildHotelMap(correctDoorId) {
    const rows = HOTEL_MAP_TEMPLATE.slice();
    HOTEL_DOOR_SPOTS.forEach((door) => {
      const symbol = door.id === correctDoorId ? "E" : "F";
      rows[door.y] =
        rows[door.y].slice(0, door.x) + symbol + rows[door.y].slice(door.x + 1);
    });
    return rows;
  }

  function createPlayBots() {
    const centerX = 9;
    const centerY = 5;
    return PLAY_BOT_ROSTER.map((profile, index) => {
      const seat = index + 1;
      const seatAngle = Math.PI / 2 + seat * Math.PI * 2 / 10;
      const x = centerX + Math.cos(seatAngle) * 3.35;
      const y = centerY + Math.sin(seatAngle) * 2.35;
      return {
        ...profile,
        targetMode: "play",
        targetLabel: "PLAY",
        rouletteSeat: seat,
        role: "survivor",
        status: "active",
        task: "waiting",
        roleLabel: "VÄNTAR",
        helperTask: null,
        x,
        y,
        fromX: x,
        fromY: y,
        facingX: (centerX - x) / (Math.hypot(centerX - x, centerY - y) || 1),
        facingY: (centerY - y) / (Math.hypot(centerX - x, centerY - y) || 1),
        moveAnimMs: 0,
        moveTimerMs: index * 36,
        walkMs: index * 91,
        startDelayMs: index * 57,
        aiTick: index,
        path: [],
        pathIndex: 0,
        followsPlayer: false,
      };
    });
  }

  function getPlayActors() {
    if (!state.play || !state.player) {
      return [];
    }
    return [state.player, ...state.play.bots];
  }

  function getPlayActor(id) {
    return getPlayActors().find((actor) => actor.id === id) || null;
  }

  function getPlayMonster() {
    return state.play ? getPlayActor(state.play.monsterId) : null;
  }

  function getActivePlaySurvivors() {
    return getPlayActors().filter(
      (actor) => actor.role === "survivor" && actor.status === "active"
    );
  }

  function configurePlayRouletteTarget(monsterId) {
    if (!state.play || !state.play.roulette) {
      return false;
    }
    const actors = getPlayActors();
    const requested = actors.find((actor) => actor.id === monsterId);
    const chosen = requested || actors[Math.floor(Math.random() * actors.length)];
    if (!chosen) {
      return false;
    }
    const seatIndex = chosen.id === "player" ? 0 : chosen.rouletteSeat;
    const targetAngle = Math.PI / 2 + seatIndex * Math.PI * 2 / 10;
    const startAngle = state.play.roulette.arrowAngle || -Math.PI / 2;
    const fullTurn = Math.PI * 2;
    const positiveDelta = ((targetAngle - startAngle) % fullTurn + fullTurn) % fullTurn;
    state.play.pendingMonsterId = chosen.id;
    state.play.roulette.elapsedMs = 0;
    state.play.roulette.revealRemainingMs = PLAY_ROULETTE_REVEAL_MS;
    state.play.roulette.revealed = false;
    state.play.roulette.startAngle = startAngle;
    state.play.roulette.targetAngle = targetAngle;
    state.play.roulette.totalRotation = fullTurn * 6 + positiveDelta;
    return true;
  }

  function loadPlayRoulette() {
    state.scene = "play";
    state.playMode = "play";
    state.map = PLAY_ROULETTE_MAP.slice();
    state.start = { x: 9, y: 8 };
    state.shadows = [];
    state.doors = [];
    state.lobbyDoors = [];
    state.lobbyBots = [];
    state.partyBots = [];
    resetPartyAssistance("play");
    state.boat = null;
    state.deckPlayer = null;
    state.controlTarget = "player";
    state.islands = [];
    state.hotel = null;
    state.inventory.hotelKey = false;
    state.levelElapsedMs = 0;
    state.sonar.activeMs = 0;
    state.sonar.cooldownMs = 0;
    state.sonar.elapsedMs = 0;
    state.invulnerableMs = 0;
    state.levelBannerMs = 0;
    state.transitionMs = 0;
    state.particles = [];
    state.player = {
      id: "player",
      name: "DU",
      rouletteSeat: 0,
      role: "survivor",
      status: "active",
      task: "waiting",
      roleLabel: "VÄNTAR",
      color: COLORS.orange,
      bodyColor: "#d77b25",
      x: state.start.x,
      y: state.start.y,
      fromX: state.start.x,
      fromY: state.start.y,
      moveAnimMs: 0,
      facingX: 0,
      facingY: -1,
      followsPlayer: false,
    };
    state.play = {
      phase: "roulette",
      bots: createPlayBots(),
      pendingMonsterId: null,
      monsterId: null,
      playerRole: null,
      playerStatus: "active",
      result: null,
      roulette: {
        elapsedMs: 0,
        durationMs: PLAY_ROULETTE_SPIN_MS,
        revealRemainingMs: PLAY_ROULETTE_REVEAL_MS,
        revealed: false,
        startAngle: -Math.PI / 2,
        targetAngle: 0,
        totalRotation: 0,
        arrowAngle: -Math.PI / 2,
      },
      key: null,
      correctDoorId: null,
      correctDoorKnown: false,
      monsterReleaseMs: PLAY_HUNT_START_DELAY_MS,
      monsterFrozen: false,
      caughtIds: [],
      wrongDoorAttempts: 0,
    };
    configurePlayRouletteTarget(forcedPlayMonsterId);
    forcedPlayMonsterId = null;
    setCameraFacing(0, -1, true);
    setSceneClass("play");
    setMessage("DEN RÖDA PILEN VÄLJER MONSTER...", PLAY_ROULETTE_SPIN_MS);
    playSound("start");
  }

  function revealPlayMonster() {
    if (!state.play || state.play.phase !== "roulette" || state.play.roulette.revealed) {
      return;
    }
    state.play.monsterId = state.play.pendingMonsterId;
    state.play.roulette.revealed = true;
    state.play.roulette.revealRemainingMs = PLAY_ROULETTE_REVEAL_MS;
    getPlayActors().forEach((actor) => {
      actor.role = actor.id === state.play.monsterId ? "monster" : "survivor";
      actor.roleLabel = actor.role === "monster" ? "MONSTER" : "ÖVERLEVARE";
    });
    state.play.playerRole = state.player.role;
    const monster = getPlayMonster();
    setMessage(
      monster && monster.id === "player"
        ? "PILEN VALDE DIG • DU ÄR MONSTRET!"
        : (monster ? monster.name : "EN BOT") + " BLEV MONSTRET!",
      PLAY_ROULETTE_REVEAL_MS
    );
    state.flashMs = 360;
    playSound("wrongDoor");
  }

  function playDoorId(x, y) {
    if (y === 0) return "play-door-north";
    if (x === GRID_WIDTH - 1) return "play-door-east";
    if (y === GRID_HEIGHT - 1) return "play-door-south";
    return "play-door-west";
  }

  function playDoorLabel(x, y) {
    if (y === 0) return "DÖRR 1";
    if (x === GRID_WIDTH - 1) return "DÖRR 2";
    if (y === GRID_HEIGHT - 1) return "DÖRR 3";
    return "DÖRR 4";
  }

  function nearestPlayDoorStation(actor, door) {
    const options = [
      { x: door.x, y: door.y + 1 },
      { x: door.x - 1, y: door.y },
      { x: door.x, y: door.y - 1 },
      { x: door.x + 1, y: door.y },
    ]
      .filter((point) => isWalkable(point.x, point.y))
      .map((point) => ({
        ...point,
        path: findPath(actor.x, actor.y, point.x, point.y),
      }))
      .filter((point) => point.path.length > 0)
      .sort((a, b) => a.path.length - b.path.length);
    return options[0] || null;
  }

  function assignPlayBotTasks() {
    if (!state.play || state.play.phase !== "hunt") {
      return;
    }
    const survivorBots = state.play.bots.filter(
      (bot) => bot.role === "survivor" && bot.status === "active"
    );
    const monsterBot = state.play.bots.find(
      (bot) => bot.role === "monster" && bot.status === "active"
    );
    if (monsterBot) {
      monsterBot.task = "chase";
      monsterBot.roleLabel = "JAGAR";
    }

    survivorBots.forEach((bot) => {
      bot.task = "escape";
      bot.roleLabel = "HJÄLPER";
      bot.path = [];
      bot.pathIndex = 0;
      bot.followsPlayer = false;
    });

    if (!state.play.key.collected && survivorBots[0]) {
      survivorBots[0].task = "find-key";
      survivorBots[0].roleLabel = "LETAR NYCKEL";
    }
    const doorScoutIndex = state.play.key.collected ? 0 : 1;
    if (!state.play.correctDoorKnown && survivorBots[doorScoutIndex]) {
      survivorBots[doorScoutIndex].task = "find-door";
      survivorBots[doorScoutIndex].roleLabel = "KOLLAR DÖRR";
    }
    if (state.play.key.collected && state.play.correctDoorKnown && survivorBots[0]) {
      survivorBots[0].task = "unlock-door";
      survivorBots[0].roleLabel = "LÅSER UPP";
    }
  }

  function beginPlayHunt() {
    if (!state.play || state.scene !== "play" || state.play.phase === "result") {
      return false;
    }
    if (!state.play.monsterId) {
      revealPlayMonster();
    }
    if (!state.play.monsterId) {
      return false;
    }

    clearHeldInput();
    state.play.phase = "hunt";
    state.play.result = null;
    state.play.monsterReleaseMs = PLAY_HUNT_START_DELAY_MS;
    state.play.monsterFrozen = false;
    state.play.caughtIds = [];
    state.play.correctDoorKnown = false;
    state.play.wrongDoorAttempts = 0;
    state.map = PLAY_HUNT_MAP.slice();
    state.doors = [];
    state.start = null;
    let keyPosition = null;
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const cell = state.map[y][x];
        if (cell === "S") {
          state.start = { x, y };
        } else if (cell === "K") {
          keyPosition = { x, y };
        } else if (cell === "E" || cell === "F") {
          state.doors.push({
            id: playDoorId(x, y),
            label: playDoorLabel(x, y),
            x,
            y,
            isReal: cell === "E",
            opened: false,
          });
        }
      }
    }
    if (!state.start || !keyPosition || state.doors.length !== 4) {
      throw new Error("Play hunt could not find its start, key and four doors.");
    }
    const correctDoor = state.doors.find((door) => door.isReal);
    state.play.correctDoorId = correctDoor.id;
    state.play.key = {
      id: "play-key",
      x: keyPosition.x,
      y: keyPosition.y,
      collected: false,
      collectedById: null,
    };

    const actors = getPlayActors();
    actors.forEach((actor) => {
      actor.role = actor.id === state.play.monsterId ? "monster" : "survivor";
      actor.status = "active";
      actor.task = actor.role === "monster" ? "chase" : "escape";
      actor.roleLabel = actor.role === "monster" ? "MONSTER" : "ÖVERLEVARE";
      actor.moveAnimMs = 0;
    });
    state.play.playerRole = state.player.role;
    state.play.playerStatus = "active";

    const monster = getPlayMonster();
    monster.x = state.start.x;
    monster.y = state.start.y;
    monster.fromX = monster.x;
    monster.fromY = monster.y;
    monster.facingX = 0;
    monster.facingY = -1;
    monster.moveTimerMs = PLAY_HUNT_START_DELAY_MS;

    const survivors = actors.filter((actor) => actor.role === "survivor");
    survivors.forEach((actor, index) => {
      const spawn = PLAY_HUNT_BOT_SPAWNS[index % PLAY_HUNT_BOT_SPAWNS.length];
      actor.x = spawn.x;
      actor.y = spawn.y;
      actor.fromX = spawn.x;
      actor.fromY = spawn.y;
      actor.facingX = 0;
      actor.facingY = 1;
      actor.moveAnimMs = 0;
      actor.moveTimerMs = 120 + index * 48;
      actor.aiTick = index;
    });
    state.start = { x: state.player.x, y: state.player.y };
    assignPlayBotTasks();
    setCameraFacing(state.player.facingX, state.player.facingY, true);
    setSceneClass("play");
    setMessage(
      state.play.playerRole === "monster"
        ? "DU ÄR MONSTRET • FÅNGA ALLA NIO!"
        : (monster.name || "MONSTRET") + " JAGAR • HITTA NYCKELN!",
      2800
    );
    return true;
  }

  function updatePlayRoulette(dt) {
    const roulette = state.play.roulette;
    if (!roulette.revealed) {
      roulette.elapsedMs = Math.min(roulette.durationMs, roulette.elapsedMs + dt);
      const progress = roulette.durationMs > 0
        ? roulette.elapsedMs / roulette.durationMs
        : 1;
      const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, progress)), 4);
      roulette.arrowAngle = roulette.startAngle + roulette.totalRotation * eased;
      if (roulette.elapsedMs >= roulette.durationMs) {
        roulette.arrowAngle = roulette.targetAngle;
        revealPlayMonster();
      }
      return;
    }
    roulette.revealRemainingMs = Math.max(0, roulette.revealRemainingMs - dt);
    if (roulette.revealRemainingMs <= 0) {
      beginPlayHunt();
    }
  }

  function collectPlayKey(actor) {
    if (
      !state.play ||
      state.play.phase !== "hunt" ||
      state.play.key.collected ||
      actor.role !== "survivor" ||
      actor.status !== "active"
    ) {
      return false;
    }
    state.play.key.collected = true;
    state.play.key.collectedById = actor.id;
    setMapCell(state.play.key.x, state.play.key.y, ".");
    setMessage((actor.name || "DU") + " HITTADE NYCKELN!", 1700);
    playSound("key");
    assignPlayBotTasks();
    return true;
  }

  function discoverCorrectPlayDoor(actor) {
    if (!state.play || state.play.correctDoorKnown) {
      return;
    }
    state.play.correctDoorKnown = true;
    const door = state.doors.find((candidate) => candidate.isReal);
    setMessage((actor.name || "DU") + ": " + door.label + " ÄR RÄTT!", 1900);
    playSound("rightDoor");
    assignPlayBotTasks();
  }

  function finishPlayRound(winner) {
    if (!state.play || state.play.phase === "result") {
      return;
    }
    state.play.phase = "result";
    state.play.result = winner;
    state.mode = "victory";
    clearHeldInput();
    createConfetti();
    victoryEyebrow.textContent = "PLAY ÄR AVGJORT";
    victoryTitle.textContent =
      winner === "survivors" ? "Överlevarna vann!" : "Monstret vann!";
    const caughtCount = state.play.caughtIds.length;
    victoryStats.textContent = winner === "survivors"
      ? "Nyckeln öppnade rätt dörr."
      : "Alla " + caughtCount + " överlevare blev tagna.";
    replayButton.textContent = "TILL START-RUMMET";
    victoryScreen.classList.remove("hidden");
    state.flashMs = 520;
    playSound(winner === "survivors" ? "victory" : "gameover");
  }

  function catchPlaySurvivor(actor) {
    if (
      !state.play ||
      state.play.phase !== "hunt" ||
      actor.role !== "survivor" ||
      actor.status !== "active"
    ) {
      return;
    }
    actor.status = "caught";
    actor.task = "caught";
    actor.roleLabel = "TAGEN";
    if (!state.play.caughtIds.includes(actor.id)) {
      state.play.caughtIds.push(actor.id);
    }
    if (actor.id === "player") {
      state.play.playerStatus = "caught";
      clearHeldInput();
      setMessage("DU BLEV TAGEN • BOTTARNA FORTSÄTTER", 2100);
    } else {
      setMessage(actor.name + " BLEV TAGEN!", 1200);
    }
    state.flashMs = 260;
    playSound("hurt");
    if (getActivePlaySurvivors().length === 0) {
      finishPlayRound("monster");
      return;
    }
    assignPlayBotTasks();
  }

  function checkPlayCatches() {
    if (!state.play || state.play.phase !== "hunt") {
      return;
    }
    const monster = getPlayMonster();
    if (!monster || monster.status !== "active") {
      return;
    }
    getActivePlaySurvivors().forEach((survivor) => {
      if (survivor.x === monster.x && survivor.y === monster.y) {
        catchPlaySurvivor(survivor);
      }
    });
  }

  function movePlayActor(actor, next, duration) {
    const dx = next.x - actor.x;
    const dy = next.y - actor.y;
    actor.fromX = actor.x;
    actor.fromY = actor.y;
    actor.x = next.x;
    actor.y = next.y;
    actor.facingX = dx;
    actor.facingY = dy;
    actor.moveAnimMs = duration;
    actor.walkMs = (actor.walkMs || 0) + duration;
  }

  function updatePlayBotStep(bot) {
    if (bot.status !== "active" || state.play.phase !== "hunt") {
      return;
    }
    if (bot.role === "monster") {
      if (state.play.monsterFrozen || state.play.monsterReleaseMs > 0) {
        return;
      }
      const targets = getActivePlaySurvivors()
        .map((survivor) => ({
          survivor,
          path: findPath(bot.x, bot.y, survivor.x, survivor.y),
        }))
        .filter((item) => item.path.length > 0)
        .sort((a, b) => a.path.length - b.path.length);
      if (targets[0] && targets[0].path[1]) {
        movePlayActor(bot, targets[0].path[1], PLAY_MONSTER_MOVE_TIME);
      }
      checkPlayCatches();
      return;
    }

    if (bot.task === "find-key" && !state.play.key.collected) {
      const path = findPath(bot.x, bot.y, state.play.key.x, state.play.key.y);
      if (path[1]) {
        movePlayActor(bot, path[1], PLAY_BOT_MOVE_TIME);
      }
      if (bot.x === state.play.key.x && bot.y === state.play.key.y) {
        collectPlayKey(bot);
      }
    } else if (bot.task === "find-door" && !state.play.correctDoorKnown) {
      const door = state.doors.find((candidate) => candidate.isReal);
      const station = nearestPlayDoorStation(bot, door);
      if (station && station.path[1]) {
        movePlayActor(bot, station.path[1], PLAY_BOT_MOVE_TIME);
      }
      if (station && bot.x === station.x && bot.y === station.y) {
        discoverCorrectPlayDoor(bot);
      }
    } else if (bot.task === "unlock-door") {
      const door = state.doors.find((candidate) => candidate.isReal);
      const station = nearestPlayDoorStation(bot, door);
      if (station && station.path[1]) {
        movePlayActor(bot, station.path[1], PLAY_BOT_MOVE_TIME);
      }
      if (
        station &&
        bot.x === station.x &&
        bot.y === station.y &&
        state.play.key.collected
      ) {
        door.opened = true;
        finishPlayRound("survivors");
      }
    } else {
      const monster = getPlayMonster();
      const options = [
        { x: bot.x + 1, y: bot.y },
        { x: bot.x, y: bot.y + 1 },
        { x: bot.x - 1, y: bot.y },
        { x: bot.x, y: bot.y - 1 },
      ].filter((point) => isWalkable(point.x, point.y));
      options.sort((a, b) => {
        const distanceA = Math.abs(a.x - monster.x) + Math.abs(a.y - monster.y);
        const distanceB = Math.abs(b.x - monster.x) + Math.abs(b.y - monster.y);
        if (distanceA !== distanceB) return distanceB - distanceA;
        return ((a.x * 7 + a.y * 11 + bot.aiTick) % 5) -
          ((b.x * 7 + b.y * 11 + bot.aiTick) % 5);
      });
      if (options[0]) {
        movePlayActor(bot, options[0], PLAY_BOT_MOVE_TIME);
      }
    }
    bot.aiTick += 1;
    checkPlayCatches();
  }

  function updatePlayHunt(dt) {
    state.play.monsterReleaseMs = Math.max(0, state.play.monsterReleaseMs - dt);
    state.play.bots.forEach((bot) => {
      if (bot.moveAnimMs > 0) {
        bot.moveAnimMs = Math.max(0, bot.moveAnimMs - dt);
        bot.walkMs += dt;
      }
      if (state.play.phase !== "hunt" || bot.status !== "active") {
        return;
      }
      bot.moveTimerMs -= dt;
      if (bot.moveTimerMs <= 0 && bot.moveAnimMs <= 0) {
        updatePlayBotStep(bot);
        bot.moveTimerMs += bot.role === "monster" ? 410 : 520;
      }
    });
    checkPlayCatches();
  }

  function updatePlay(dt) {
    if (!state.play) {
      return;
    }
    if (state.play.phase === "roulette") {
      updatePlayRoulette(dt);
    } else if (state.play.phase === "hunt") {
      updatePlayHunt(dt);
    }
  }

  function handlePlayDoor(door) {
    if (state.player.role === "monster") {
      setMessage("MONSTRET KAN INTE FLY!", 1100);
      state.bumpMs = 150;
      playSound("bump");
      return;
    }
    if (!state.play.key.collected) {
      setMessage("DÖRREN ÄR LÅST • HITTA NYCKELN", 1400);
      state.bumpMs = 160;
      playSound("bump");
      return;
    }
    if (!door.isReal) {
      state.play.wrongDoorAttempts += 1;
      setMessage("FEL DÖRR • NYCKELN PASSAR INTE", 1400);
      state.bumpMs = 180;
      playSound("wrongDoor");
      return;
    }
    door.opened = true;
    state.play.correctDoorKnown = true;
    finishPlayRound("survivors");
  }

  function tryMovePlay(dx, dy) {
    if (
      !state.play ||
      state.play.phase !== "hunt" ||
      (state.player.role === "survivor" && state.player.status !== "active")
    ) {
      if (state.play && state.play.phase === "roulette") {
        setMessage("VÄNTA TILLS PILEN HAR STANNAT", 800);
      }
      return;
    }
    state.player.facingX = dx;
    state.player.facingY = dy;
    const targetX = state.player.x + dx;
    const targetY = state.player.y + dy;
    const targetCell = cellAt(targetX, targetY);
    if (targetCell === "#" || targetCell === "V") {
      state.bumpMs = 120;
      playSound("bump");
      return;
    }
    const door = state.doors.find((candidate) => candidate.x === targetX && candidate.y === targetY);
    if (door) {
      handlePlayDoor(door);
      return;
    }
    commitPlayerStep(targetX, targetY);
    if (
      targetCell === "K" &&
      state.player.role === "survivor" &&
      !state.play.key.collected
    ) {
      collectPlayKey(state.player);
    }
    checkPlayCatches();
  }

  function loadSea() {
    state.play = null;
    state.scene = "sea";
    state.map = SEA_MAP.slice();
    state.start = { x: 9, y: 9 };
    state.shadows = [];
    state.doors = [];
    state.lobbyDoors = [];
    state.lobbyBots = [];
    state.levelElapsedMs = 0;
    state.sonar.activeMs = 0;
    state.sonar.cooldownMs = 0;
    state.sonar.elapsedMs = 0;
    state.levelBannerMs = 0;
    state.particles = [];
    state.inventory.hotelKey = false;
    state.adventure.seaCompleted = false;
    state.adventure.hotelCompleted = false;
    state.hotel = null;
    state.islands = SEA_ISLANDS.map((island) => ({ ...island, visited: false }));
    state.boat = {
      x: state.start.x,
      y: state.start.y,
      fromX: state.start.x,
      fromY: state.start.y,
      facingX: 0,
      facingY: -1,
      moveAnimMs: 0,
      pendingDockId: null,
      dockedAtIslandId: null,
    };
    state.deckPlayer = { x: 0, y: 0 };
    state.controlTarget = "player";
    state.player = {
      x: state.boat.x,
      y: state.boat.y,
      fromX: state.boat.x,
      fromY: state.boat.y,
      moveAnimMs: 0,
      facingX: 0,
      facingY: -1,
    };
    resetPartyAssistance("sea");
    const hotelIsland = state.islands.find((island) => island.isCorrect);
    state.partyBots.forEach((bot) => {
      bot.status = "navigating";
      bot.moveAnimMs = 0;
      bot.roleLabel = "NAVIGERAR";
      bot.helperTask = "sea-navigation";
      bot.helperTarget = hotelIsland
        ? {
            scene: "sea",
            type: "island-dock",
            id: hotelIsland.id,
            doorId: null,
            x: hotelIsland.dockX,
            y: hotelIsland.dockY,
          }
        : null;
      bot.helperStation = null;
      bot.helperPath = [];
      bot.helperPathIndex = 0;
      bot.helperWaitMs = 0;
      bot.arrivalStatus = null;
      bot.arrivalRoleLabel = null;
      bot.followsPlayer = false;
    });
    setCameraFacing(0, -1, true);
    setSceneClass("sea");
    const companions = partyNames();
    setMessage(
      companions
        ? companions + " HJÄLPER TILL • TRYCK BÅTSTYRNING"
        : "DU ÄR OMBORD • TRYCK BÅTSTYRNING",
      3600
    );
  }

  function loadHotel() {
    state.play = null;
    const correctDoorId = HOTEL_CORRECT_DOOR[state.playMode] || "room-104";
    state.scene = "hotel";
    state.map = buildHotelMap(correctDoorId);
    state.start = null;
    state.shadows = [];
    state.doors = HOTEL_DOOR_SPOTS.map((door) => ({
      ...door,
      isReal: door.id === correctDoorId,
      opened: false,
    }));
    state.lobbyDoors = [];
    state.lobbyBots = [];
    state.sonar.activeMs = 0;
    state.sonar.cooldownMs = 0;
    state.sonar.elapsedMs = 0;
    state.levelBannerMs = 0;
    state.particles = [];
    let keyPosition = null;
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const cell = state.map[y][x];
        if (cell === "S") {
          state.start = { x, y };
        } else if (cell === "K") {
          keyPosition = { x, y };
        }
      }
    }
    if (!state.start || !keyPosition) {
      throw new Error("The hotel needs a start and one key.");
    }
    state.hotel = {
      correctDoorId,
      key: { ...keyPosition, id: "hotel-key", collected: false },
      wrongDoorAttempts: 0,
      doors: state.doors,
    };
    state.inventory.hotelKey = false;
    state.controlTarget = "player";
    state.player = {
      x: state.start.x,
      y: state.start.y,
      fromX: state.start.x,
      fromY: state.start.y,
      moveAnimMs: 0,
      facingX: 0,
      facingY: -1,
    };
    deployPartyHelpers();
    setCameraFacing(0, -1, true);
    setSceneClass("hotel");
    setMessage(
      state.partyBots.length > 0
        ? partyNames() + ": VI HJÄLPER DIG HITTA NYCKELN"
        : "HITTA DEN ENDA NYCKELN",
      3200
    );
  }

  function chooseInitialFacing() {
    const directions = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ];
    return directions.find((direction) => {
      const cell = cellAt(state.start.x + direction.x, state.start.y + direction.y);
      return cell !== "#" && cell !== "V" && cell !== "E" && cell !== "F";
    }) || { x: 1, y: 0 };
  }

  function loadLobby() {
    state.play = null;
    state.scene = "lobby";
    state.levelIndex = 0;
    state.map = LOBBY_MAP.slice();
    state.start = null;
    state.shadows = [];
    state.doors = [];
    state.lobbyDoors = [];
    state.lobbyBots = [];
    state.partyBots = [];
    resetPartyAssistance("lobby");
    state.boat = null;
    state.deckPlayer = null;
    state.controlTarget = "player";
    state.islands = [];
    state.hotel = null;
    state.inventory.hotelKey = false;
    state.adventure.seaCompleted = false;
    state.adventure.hotelCompleted = false;
    state.levelElapsedMs = 0;
    state.sonar.activeMs = 0;
    state.sonar.cooldownMs = 0;
    state.sonar.elapsedMs = 0;
    state.invulnerableMs = 0;
    state.levelBannerMs = 0;
    state.transitionMs = 0;
    state.particles = [];
    setSceneClass("lobby");

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const cell = state.map[y][x];
        if (cell === "S") {
          state.start = { x, y };
        } else if (LOBBY_DOOR_TYPES[cell]) {
          state.lobbyDoors.push({
            x,
            y,
            symbol: cell,
            ...LOBBY_DOOR_TYPES[cell],
          });
        }
      }
    }

    state.player = {
      x: state.start.x,
      y: state.start.y,
      fromX: state.start.x,
      fromY: state.start.y,
      moveAnimMs: 0,
      facingX: 0,
      facingY: -1,
    };
    state.lobbyBots = createLobbyBots();
    setCameraFacing(0, -1, true);
    setMessage("DU + 3 BOTTAR • 1 TILL DUO • 2 TILL TEAM", 4200);
  }

  function loadLevel(index) {
    state.play = null;
    const level = LEVELS[index];
    state.scene = "maze";
    state.levelIndex = index;
    state.map = level.map.slice();
    state.start = null;
    state.shadows = [];
    state.doors = [];
    state.lobbyDoors = [];
    state.lobbyBots = [];
    state.levelElapsedMs = 0;
    state.sonar.activeMs = 0;
    state.sonar.cooldownMs = 0;
    state.sonar.elapsedMs = 0;
    state.invulnerableMs = 0;
    state.levelBannerMs = LEVEL_BANNER_DURATION;
    state.transitionMs = 0;
    state.particles = [];
    setSceneClass("maze");

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const cell = state.map[y][x];
        if (cell === "S") {
          state.start = { x, y };
        } else if (cell === "G") {
          state.shadows.push({
            id: state.shadows.length,
            x,
            y,
            fromX: x,
            fromY: y,
            spawnX: x,
            spawnY: y,
            previousX: x,
            previousY: y,
            moveAnimMs: 0,
            moveTimerMs: level.shadowSpeed + 950 + state.shadows.length * 260,
            patrolTick: 0,
          });
        } else if (cell === "E" || cell === "F") {
          state.doors.push({ x, y, isReal: cell === "E" });
        }
      }
    }

    if (!state.start || state.doors.length !== 4) {
      throw new Error("Every level needs one start and exactly four doors.");
    }

    const initialFacing = chooseInitialFacing();
    state.player = {
      x: state.start.x,
      y: state.start.y,
      fromX: state.start.x,
      fromY: state.start.y,
      moveAnimMs: 0,
      facingX: initialFacing.x,
      facingY: initialFacing.y,
    };
    deployPartyHelpers();
    setCameraFacing(initialFacing.x, initialFacing.y, true);

    setMessage(
      state.partyBots.length > 0
        ? partyNames() + ": VI LETAR SJÄLVA • DU KAN GÅ DIN VÄG"
        : index === 0 ? "SPACE = SÖKPULS" : "NY VÅNING",
      2300
    );
  }

  function startRun() {
    initAudio();
    hideAllScreens();
    clearHeldInput();
    victoryEyebrow.textContent = "ALLA TRE VÅNINGAR KLARADE";
    victoryTitle.textContent = "Du hittade ut!";
    replayButton.textContent = "SPELA IGEN";
    state.mode = "playing";
    state.playMode = null;
    state.partyBots = [];
    state.hearts = MAX_HEARTS;
    state.mistakes = 0;
    state.elapsedMs = 0;
    state.confetti = [];
    loadLobby();
    canvas.focus();
    playSound("start");
  }

  function retryRun() {
    startRun();
  }

  function clearHeldInput() {
    input.held.clear();
    input.primary = null;
    input.repeatMs = 0;
    document.querySelectorAll(".touch-button.active").forEach((button) => {
      button.classList.remove("active");
    });
    cancelCameraDrag();
  }

  function pauseGame() {
    if (state.mode !== "playing") {
      return;
    }
    state.mode = "paused";
    clearHeldInput();
    pauseScreen.classList.remove("hidden");
    pauseButton.textContent = "▶";
  }

  function resumeGame() {
    if (state.mode !== "paused") {
      return;
    }
    state.mode = "playing";
    pauseScreen.classList.add("hidden");
    pauseButton.textContent = "Ⅱ";
    canvas.focus();
  }

  function togglePause() {
    if (state.mode === "playing") {
      pauseGame();
    } else if (state.mode === "paused") {
      resumeGame();
    }
  }

  function completeLevel() {
    if (state.mode !== "playing" || state.scene !== "maze") {
      return;
    }
    state.mode = "transition";
    state.transitionMs = 1450;
    clearHeldInput();
    setMessage("RÄTT UTGÅNG!", 1450);
    state.flashMs = 420;
    burstAt(state.player.x, state.player.y, COLORS.lime, 26);
    playSound("rightDoor");
  }

  function finishRun() {
    state.mode = "victory";
    clearHeldInput();
    createConfetti();
    victoryEyebrow.textContent = "ALLA TRE VÅNINGAR KLARADE";
    victoryTitle.textContent = "Du hittade ut!";
    replayButton.textContent = "SPELA IGEN";
    const totalSeconds = Math.max(1, Math.round(state.elapsedMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeText = minutes > 0
      ? minutes + " min " + String(seconds).padStart(2, "0") + " sek"
      : seconds + " sek";
    victoryStats.textContent =
      "Tid: " + timeText + "  •  Felval: " + state.mistakes;
    victoryScreen.classList.remove("hidden");
    playSound("victory");
  }

  function triggerGameOver() {
    state.mode = "gameover";
    clearHeldInput();
    gameoverScreen.classList.remove("hidden");
    playSound("gameover");
  }

  function resetAfterHit() {
    state.player.x = state.start.x;
    state.player.y = state.start.y;
    state.player.fromX = state.start.x;
    state.player.fromY = state.start.y;
    state.player.moveAnimMs = 0;
    const initialFacing = chooseInitialFacing();
    state.player.facingX = initialFacing.x;
    state.player.facingY = initialFacing.y;
    setCameraFacing(initialFacing.x, initialFacing.y, true);
    state.shadows.forEach((shadow, index) => {
      shadow.x = shadow.spawnX;
      shadow.y = shadow.spawnY;
      shadow.fromX = shadow.spawnX;
      shadow.fromY = shadow.spawnY;
      shadow.previousX = shadow.spawnX;
      shadow.previousY = shadow.spawnY;
      shadow.moveAnimMs = 0;
      shadow.moveTimerMs = LEVELS[state.levelIndex].shadowSpeed + 900 + index * 250;
    });
    state.sonar.activeMs = 0;
    state.sonar.cooldownMs = 0;
    state.sonar.elapsedMs = 0;
    state.invulnerableMs = 1050;
  }

  function takeDamage(reason) {
    if (
      state.mode !== "playing" ||
      (state.invulnerableMs > 0 && reason !== "wrongDoor")
    ) {
      return;
    }
    state.hearts -= 1;
    state.mistakes += 1;
    state.flashMs = 500;
    state.shakeMs = 430;
    burstAt(state.player.x, state.player.y, COLORS.pink, 18);
    playSound(reason === "wrongDoor" ? "wrongDoor" : "hurt");

    if (state.hearts <= 0) {
      setMessage("INGEN VÄG UT", 1200);
      triggerGameOver();
      return;
    }

    setMessage(
      reason === "wrongDoor" ? "FEL DÖRR! TILLBAKA TILL START" : "SKUGGAN HITTADE DIG!",
      1800
    );
    resetAfterHit();
  }

  function cellAt(x, y) {
    if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) {
      return "#";
    }
    return state.map[y][x];
  }

  function isWalkable(x, y) {
    const cell = cellAt(x, y);
    return (
      cell !== "#" &&
      cell !== "V" &&
      cell !== "E" &&
      cell !== "F" &&
      !LOBBY_DOOR_TYPES[cell]
    );
  }

  function enterLobbyDoor(door) {
    if (!door.available) {
      setMessage(door.label + " KOMMER SNART", 1500);
      state.bumpMs = 180;
      playSound("bump");
      return;
    }

    state.playMode = door.mode;
    state.hearts = MAX_HEARTS;
    state.mistakes = 0;
    state.elapsedMs = 0;
    state.mode = "playing";
    if (door.mode === "play") {
      state.partyBots = [];
      loadPlayRoulette();
      setMessage("PLAY • PILEN VÄLJER MONSTER", 2200);
      playSound("rightDoor");
      render();
      return;
    }
    state.play = null;
    state.partyBots = createPartyBots(door.mode);
    loadSea();
    setMessage(door.label + " VALT • BÖRJA PÅ BÅTEN", 2200);
    playSound("rightDoor");
    render();
  }

  function toggleBoatControl() {
    if (state.mode !== "playing" || state.scene !== "sea") {
      return;
    }
    clearHeldInput();
    state.controlTarget = state.controlTarget === "boat" ? "player" : "boat";
    updateBoatControlButton();
    setMessage(
      state.controlTarget === "boat"
        ? "BÅTSTYRNING • KÖR MOT HOTELLÖN"
        : "PERSONSTYRNING • DU GÅR PÅ DÄCKET",
      1700
    );
    playSound("rightDoor");
  }

  function tryMoveSea(dx, dy) {
    state.player.facingX = dx;
    state.player.facingY = dy;

    if (state.controlTarget === "player") {
      const nextX = Math.max(-1, Math.min(1, state.deckPlayer.x + dx));
      const nextY = Math.max(-1, Math.min(1, state.deckPlayer.y + dy));
      if (nextX === state.deckPlayer.x && nextY === state.deckPlayer.y) {
        state.bumpMs = 110;
        playSound("bump");
        return;
      }
      state.deckPlayer.x = nextX;
      state.deckPlayer.y = nextY;
      state.player.moveAnimMs = MOVE_TIME;
      playSound("step");
      return;
    }

    if (!state.boat || state.boat.moveAnimMs > 0 || state.boat.pendingDockId) {
      return;
    }
    const targetX = state.boat.x + dx;
    const targetY = state.boat.y + dy;
    const outside = targetX < 1 || targetX > GRID_WIDTH - 2 || targetY < 1 || targetY > GRID_HEIGHT - 2;
    const islandBody = state.islands.some(
      (island) => island.x === targetX && island.y === targetY
    );
    if (outside || islandBody) {
      state.bumpMs = 150;
      setMessage(outside ? "VÄND TILLBAKA MOT ÖARNA" : "FÖR GRUNT • HITTA BRYGGAN", 1100);
      playSound("bump");
      return;
    }

    state.boat.fromX = state.boat.x;
    state.boat.fromY = state.boat.y;
    state.boat.x = targetX;
    state.boat.y = targetY;
    state.boat.facingX = dx;
    state.boat.facingY = dy;
    state.boat.moveAnimMs = BOAT_MOVE_TIME;
    state.player.x = targetX;
    state.player.y = targetY;
    state.player.fromX = state.boat.fromX;
    state.player.fromY = state.boat.fromY;
    const dockedIsland = state.islands.find(
      (island) => island.dockX === targetX && island.dockY === targetY
    );
    if (dockedIsland) {
      dockedIsland.visited = true;
      if (dockedIsland.isCorrect) {
        state.boat.pendingDockId = dockedIsland.id;
        setMessage("RÄTT Ö • LÄGG TILL VID HOTELLET", 1500);
      } else {
        setMessage(dockedIsland.name + " • HOTELLET ÄR INTE HÄR", 1500);
      }
    }
    playSound("boat");
  }

  function commitPlayerStep(targetX, targetY) {
    state.player.fromX = state.player.x;
    state.player.fromY = state.player.y;
    state.player.x = targetX;
    state.player.y = targetY;
    state.player.moveAnimMs = MOVE_TIME;
    playSound("step");
  }

  function handleHotelDoor(door) {
    if (!state.inventory.hotelKey) {
      setMessage("DÖRREN ÄR LÅST • HITTA NYCKELN", 1500);
      state.bumpMs = 160;
      playSound("bump");
      return;
    }
    if (!door.isReal) {
      state.hotel.wrongDoorAttempts += 1;
      const correctDoor = state.doors.find((candidate) => candidate.isReal);
      const doorHelper = helperForTask("hotel-correct-door");
      setMessage(
        doorHelper
          ? doorHelper.name + ": PROVA " + correctDoor.label
          : "NYCKELN PASSAR INTE I " + door.label,
        1800
      );
      state.bumpMs = 190;
      playSound("wrongDoor");
      return;
    }

    door.opened = true;
    state.adventure.hotelCompleted = true;
    playSound("rightDoor");
    clearHeldInput();
    loadLevel(0);
    setMessage("RÄTT HOTELLRUM • NU BÖRJAR LABYRINTEN", 2300);
  }

  function tryMove(dx, dy) {
    if (state.mode !== "playing" || !state.player) {
      return;
    }

    if (state.scene === "sea") {
      tryMoveSea(dx, dy);
      return;
    }
    if (state.scene === "play") {
      tryMovePlay(dx, dy);
      return;
    }

    state.player.facingX = dx;
    state.player.facingY = dy;
    const targetX = state.player.x + dx;
    const targetY = state.player.y + dy;
    const targetCell = cellAt(targetX, targetY);

    if (targetCell === "#" || targetCell === "V") {
      state.bumpMs = 120;
      playSound("bump");
      return;
    }

    if (state.scene === "lobby") {
      const lobbyDoor = state.lobbyDoors.find(
        (door) => door.x === targetX && door.y === targetY
      );
      if (lobbyDoor) {
        enterLobbyDoor(lobbyDoor);
        return;
      }

      commitPlayerStep(targetX, targetY);
      return;
    }

    if (state.scene === "hotel") {
      const hotelDoor = state.doors.find(
        (door) => door.x === targetX && door.y === targetY
      );
      if (hotelDoor) {
        handleHotelDoor(hotelDoor);
        return;
      }
      commitPlayerStep(targetX, targetY);
      if (targetCell === "K" && state.hotel && !state.hotel.key.collected) {
        state.hotel.key.collected = true;
        state.inventory.hotelKey = true;
        setMapCell(targetX, targetY, ".");
        const correctDoor = state.doors.find((door) => door.isReal);
        reassignHotelHelpersAfterKey();
        const doorHelper = helperForTask("hotel-correct-door");
        setMessage(
          doorHelper
            ? doorHelper.name + ": NYCKELN PASSAR " + correctDoor.label
            : "NYCKEL HITTAD • PROVA DÖRRARNA",
          2300
        );
        playSound("key");
      }
      return;
    }

    if (targetCell === "E") {
      completeLevel();
      return;
    }

    if (targetCell === "F") {
      takeDamage("wrongDoor");
      return;
    }

    commitPlayerStep(targetX, targetY);
    checkShadowCollision();
  }

  function activateSonar() {
    if (
      state.mode !== "playing" ||
      state.scene !== "maze" ||
      state.sonar.cooldownMs > 0 ||
      state.sonar.activeMs > 0
    ) {
      if (state.mode === "playing" && state.sonar.cooldownMs > 0) {
        setMessage("SÖKPULSEN LADDAR...", 700);
        playSound("bump");
      }
      return;
    }

    state.sonar.activeMs = SONAR_DURATION;
    state.sonar.cooldownMs = SONAR_COOLDOWN;
    state.sonar.elapsedMs = 0;
    setMessage("DEN GRÖNA DÖRREN ÄR RÄTT", 1200);
    burstAt(state.player.x, state.player.y, COLORS.cyan, 14);
    playSound("sonar");
  }

  function checkShadowCollision() {
    const hit = state.shadows.some(
      (shadow) => shadow.x === state.player.x && shadow.y === state.player.y
    );
    if (hit) {
      takeDamage("shadow");
    }
  }

  function findPath(startX, startY, targetX, targetY) {
    const queue = [{ x: startX, y: startY }];
    const seen = new Set([startX + "," + startY]);
    const previous = new Map();
    const directions = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.x === targetX && current.y === targetY) {
        const path = [current];
        let key = current.x + "," + current.y;
        while (previous.has(key)) {
          const item = previous.get(key);
          path.push({ x: item.x, y: item.y });
          key = item.x + "," + item.y;
        }
        return path.reverse();
      }

      directions.forEach((direction) => {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = nextX + "," + nextY;
        if (!seen.has(key) && isWalkable(nextX, nextY)) {
          seen.add(key);
          previous.set(key, current);
          queue.push({ x: nextX, y: nextY });
        }
      });
    }
    return [];
  }

  function moveShadow(shadow) {
    const path = findPath(shadow.x, shadow.y, state.player.x, state.player.y);
    const directions = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];
    let next = null;

    if (path.length > 1 && path.length <= 9) {
      next = path[1];
    } else {
      let options = directions
        .map((direction) => ({
          x: shadow.x + direction.x,
          y: shadow.y + direction.y,
        }))
        .filter((tile) => isWalkable(tile.x, tile.y))
        .filter((tile) => {
          return !state.shadows.some(
            (other) => other !== shadow && other.x === tile.x && other.y === tile.y
          );
        });

      const forwardOptions = options.filter(
        (tile) => tile.x !== shadow.previousX || tile.y !== shadow.previousY
      );
      if (forwardOptions.length > 0) {
        options = forwardOptions;
      }
      if (options.length > 0) {
        next = options[(shadow.patrolTick + shadow.id) % options.length];
      }
    }

    shadow.patrolTick += 1;
    if (!next) {
      return;
    }

    shadow.previousX = shadow.x;
    shadow.previousY = shadow.y;
    shadow.fromX = shadow.x;
    shadow.fromY = shadow.y;
    shadow.x = next.x;
    shadow.y = next.y;
    shadow.moveAnimMs = 180;
    checkShadowCollision();
  }

  function cameraMovementBasis() {
    const cameraX = Math.cos(state.cameraAngle);
    const cameraY = Math.sin(state.cameraAngle);
    const forward = Math.abs(cameraX) >= Math.abs(cameraY)
      ? { x: Math.sign(cameraX) || 1, y: 0 }
      : { x: 0, y: Math.sign(cameraY) || 1 };
    return {
      forward,
      right: { x: -forward.y, y: forward.x },
    };
  }

  function directionFromCode(code) {
    const intents = {
      ArrowUp: { forward: 1, right: 0 },
      KeyW: { forward: 1, right: 0 },
      ArrowDown: { forward: -1, right: 0 },
      KeyS: { forward: -1, right: 0 },
      ArrowLeft: { forward: 0, right: -1 },
      KeyA: { forward: 0, right: -1 },
      ArrowRight: { forward: 0, right: 1 },
      KeyD: { forward: 0, right: 1 },
    };
    const intent = intents[code];
    if (!intent) {
      return null;
    }
    const basis = cameraMovementBasis();
    return {
      x: basis.forward.x * intent.forward + basis.right.x * intent.right,
      y: basis.forward.y * intent.forward + basis.right.y * intent.right,
    };
  }

  function pressDirection(code) {
    const direction = directionFromCode(code);
    if (!direction) {
      return;
    }
    if (!input.held.has(code)) {
      input.held.add(code);
      input.primary = code;
      input.repeatMs = 245;
      tryMove(direction.x, direction.y);
    }
  }

  function releaseDirection(code) {
    input.held.delete(code);
    if (input.primary === code) {
      const heldCodes = Array.from(input.held);
      input.primary = heldCodes.length > 0 ? heldCodes[heldCodes.length - 1] : null;
      input.repeatMs = 130;
    }
  }

  function updateHeldMovement(dt) {
    if (state.mode !== "playing" || !input.primary || !input.held.has(input.primary)) {
      return;
    }
    input.repeatMs -= dt;
    if (input.repeatMs <= 0) {
      const direction = directionFromCode(input.primary);
      if (direction) {
        tryMove(direction.x, direction.y);
      }
      input.repeatMs += 122;
    }
  }

  function startNextLobbyBotStep(bot) {
    const next = bot.path[bot.pathIndex];
    if (!next) {
      bot.status = "arrived";
      bot.moveAnimMs = 0;
      return;
    }

    const dx = next.x - bot.x;
    const dy = next.y - bot.y;
    const length = Math.hypot(dx, dy) || 1;
    bot.fromX = bot.x;
    bot.fromY = bot.y;
    bot.x = next.x;
    bot.y = next.y;
    bot.facingX = dx / length;
    bot.facingY = dy / length;
    bot.pathIndex += 1;
    bot.moveAnimMs = LOBBY_BOT_MOVE_TIME;
    bot.status = "walking";
  }

  function updateLobbyBots(dt) {
    state.lobbyBots.forEach((bot) => {
      if (bot.status === "arrived") {
        return;
      }

      if (bot.waitMs > 0) {
        bot.waitMs = Math.max(0, bot.waitMs - dt);
        if (bot.waitMs > 0) {
          return;
        }
      }

      if (bot.moveAnimMs > 0) {
        bot.walkMs += dt;
        bot.moveAnimMs = Math.max(0, bot.moveAnimMs - dt);
        if (bot.moveAnimMs > 0) {
          return;
        }
        if (bot.pathIndex >= bot.path.length) {
          bot.status = "arrived";
          return;
        }
      }

      startNextLobbyBotStep(bot);
    });
  }

  function updatePlaying(dt) {
    updateHeldMovement(dt);

    if (state.player.moveAnimMs > 0) {
      state.player.moveAnimMs = Math.max(0, state.player.moveAnimMs - dt);
    }
    if (state.scene === "lobby") {
      updateLobbyBots(dt);
      return;
    }

    state.elapsedMs += dt;
    if (state.scene === "play") {
      updatePlay(dt);
      return;
    }
    if (state.scene === "sea") {
      if (state.boat && state.boat.moveAnimMs > 0) {
        state.boat.moveAnimMs = Math.max(0, state.boat.moveAnimMs - dt);
        if (state.boat.moveAnimMs <= 0 && state.boat.pendingDockId) {
          state.boat.dockedAtIslandId = state.boat.pendingDockId;
          state.boat.pendingDockId = null;
          state.adventure.seaCompleted = true;
          clearHeldInput();
          loadHotel();
        }
      }
      return;
    }
    updatePartyHelpers(dt);
    if (state.scene === "hotel") {
      return;
    }

    state.levelElapsedMs += dt;
    if (state.invulnerableMs > 0) {
      state.invulnerableMs = Math.max(0, state.invulnerableMs - dt);
    }
    if (state.sonar.activeMs > 0) {
      state.sonar.activeMs = Math.max(0, state.sonar.activeMs - dt);
      state.sonar.elapsedMs += dt;
    }
    if (state.sonar.cooldownMs > 0) {
      state.sonar.cooldownMs = Math.max(0, state.sonar.cooldownMs - dt);
    }

    state.shadows.forEach((shadow) => {
      if (shadow.moveAnimMs > 0) {
        shadow.moveAnimMs = Math.max(0, shadow.moveAnimMs - dt);
      }
      if (state.sonar.activeMs <= 0 && state.levelBannerMs <= 0) {
        shadow.moveTimerMs -= dt;
        if (shadow.moveTimerMs <= 0) {
          moveShadow(shadow);
          shadow.moveTimerMs += LEVELS[state.levelIndex].shadowSpeed;
        }
      }
    });
  }

  function updateTransition(dt) {
    state.transitionMs -= dt;
    if (state.transitionMs > 0) {
      return;
    }
    if (state.levelIndex >= LEVELS.length - 1) {
      finishRun();
      return;
    }
    state.hearts = Math.min(MAX_HEARTS, state.hearts + 1);
    state.mode = "playing";
    loadLevel(state.levelIndex + 1);
  }

  function updateParticles(dt) {
    state.particles.forEach((particle) => {
      particle.lifeMs -= dt;
      particle.x += particle.vx * dt / 1000;
      particle.y += particle.vy * dt / 1000;
      particle.vy += 40 * dt / 1000;
    });
    state.particles = state.particles.filter((particle) => particle.lifeMs > 0);

    state.confetti.forEach((particle) => {
      particle.y += particle.speed * dt / 1000;
      particle.x += Math.sin((state.visualTime + particle.phase) / 260) * 16 * dt / 1000;
      particle.rotation += particle.spin * dt / 1000;
      if (particle.y > LOGICAL_HEIGHT + 20) {
        particle.y = -20;
      }
    });
  }

  function update(dt) {
    const safeDt = Math.max(0, Math.min(dt, 50));
    state.visualTime += safeDt;

    const cameraDelta = normalizeAngle(state.cameraTargetAngle - state.cameraAngle);
    if (Math.abs(cameraDelta) > 0.0005) {
      const turnAmount = 1 - Math.exp(-safeDt / 62);
      state.cameraAngle += cameraDelta * turnAmount;
    } else {
      state.cameraAngle = state.cameraTargetAngle;
    }
    const pitchDelta = state.cameraTargetPitch - state.cameraPitch;
    if (Math.abs(pitchDelta) > 0.0005) {
      const pitchAmount = 1 - Math.exp(-safeDt / 72);
      state.cameraPitch += pitchDelta * pitchAmount;
    } else {
      state.cameraPitch = state.cameraTargetPitch;
    }

    if (state.mode === "playing") {
      updatePlaying(safeDt);
    } else if (state.mode === "transition") {
      updateTransition(safeDt);
    }

    if (state.messageMs > 0) {
      state.messageMs = Math.max(0, state.messageMs - safeDt);
    }
    if (state.levelBannerMs > 0) {
      state.levelBannerMs = Math.max(0, state.levelBannerMs - safeDt);
    }
    if (state.flashMs > 0) {
      state.flashMs = Math.max(0, state.flashMs - safeDt);
    }
    if (state.shakeMs > 0) {
      state.shakeMs = Math.max(0, state.shakeMs - safeDt);
    }
    if (state.bumpMs > 0) {
      state.bumpMs = Math.max(0, state.bumpMs - safeDt);
    }
    updateParticles(safeDt);
  }

  function gridToPixelX(gridX) {
    return MAP_X + gridX * TILE + TILE / 2;
  }

  function gridToPixelY(gridY) {
    return MAP_Y + gridY * TILE + TILE / 2;
  }

  function animationPosition(entity, duration) {
    const progress = entity.moveAnimMs > 0 ? 1 - entity.moveAnimMs / duration : 1;
    const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, progress)), 3);
    return {
      x: entity.fromX + (entity.x - entity.fromX) * eased,
      y: entity.fromY + (entity.y - entity.fromY) * eased,
    };
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const gradient = ctx.createRadialGradient(
      LOGICAL_WIDTH * 0.5,
      0,
      20,
      LOGICAL_WIDTH * 0.5,
      LOGICAL_HEIGHT * 0.55,
      800
    );
    gradient.addColorStop(0, "#123351");
    gradient.addColorStop(0.52, COLORS.nightBlue);
    gradient.addColorStop(1, COLORS.night);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = COLORS.cyan;
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 79 + 33) % LOGICAL_WIDTH;
      const y = 74 + ((i * 113) % 600);
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    ctx.fillStyle = "rgba(3, 11, 24, 0.82)";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, 78);
    ctx.strokeStyle = "rgba(84, 231, 255, 0.24)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 77);
    ctx.lineTo(LOGICAL_WIDTH, 77);
    ctx.stroke();

    if (state.scene === "lobby") {
      roundedRect(76, 16, 242, 44, 14);
      ctx.fillStyle = "rgba(19, 49, 75, 0.82)";
      ctx.fill();
      ctx.fillStyle = COLORS.cyanSoft;
      ctx.font = "900 12px Trebuchet MS";
      ctx.textAlign = "left";
      ctx.fillText("START-RUM", 94, 35);
      ctx.fillStyle = COLORS.white;
      ctx.font = "900 14px Trebuchet MS";
      ctx.fillText("DU + 3 BOTTAR", 94, 52);

      roundedRect(403, 19, 334, 38, 13);
      ctx.fillStyle = "rgba(5, 20, 38, 0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(84, 231, 255, 0.38)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.white;
      ctx.font = "900 13px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText("1 BOT → DUO  •  2 BOTTAR → TEAM", 570, 44);
      ctx.textAlign = "left";
      return;
    }

    if (state.scene === "play" && state.play) {
      const roulette = state.play.phase === "roulette";
      const activeSurvivors = getActivePlaySurvivors().length;
      roundedRect(76, 16, 252, 44, 14);
      ctx.fillStyle = "rgba(72, 20, 35, 0.92)";
      ctx.fill();
      ctx.strokeStyle = roulette ? "#ff3e58" : state.play.playerRole === "monster"
        ? "#ff3e58"
        : COLORS.cyan;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#ff9aaa";
      ctx.font = "900 12px Trebuchet MS";
      ctx.textAlign = "left";
      ctx.fillText("PLAY • 10 DELTAGARE", 94, 35);
      ctx.fillStyle = COLORS.white;
      ctx.font = "1000 14px Trebuchet MS";
      ctx.fillText(
        roulette
          ? state.play.roulette.revealed ? "MONSTRET ÄR VALT" : "PILEN SNURRAR"
          : state.play.playerRole === "monster" ? "DU ÄR MONSTRET" : "DU ÄR ÖVERLEVARE",
        94,
        52
      );

      roundedRect(383, 19, 388, 38, 13);
      ctx.fillStyle = "rgba(5, 20, 38, 0.9)";
      ctx.fill();
      ctx.strokeStyle = roulette ? "#ff3e58" : state.play.key.collected ? "#ffd45e" : "#55e8ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.white;
      ctx.font = "1000 14px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(
        roulette
          ? state.play.roulette.revealed ? "GÖR ER REDO..." : "VEM BLIR MONSTER?"
          : state.play.playerRole === "monster"
            ? "FÅNGA ALLA ÖVERLEVARE"
            : state.play.key.collected
              ? state.play.correctDoorKnown ? "NYCKEL + RÄTT DÖRR HITTAD" : "NYCKEL HITTAD • HITTA RÄTT DÖRR"
              : "HJÄLP BOTTARNA HITTA NYCKELN",
        577,
        44
      );

      ctx.fillStyle = activeSurvivors > 0 ? COLORS.lime : COLORS.red;
      ctx.font = "1000 15px Trebuchet MS";
      ctx.textAlign = "right";
      ctx.fillText(
        roulette ? "DU + 9 BOTTAR" : "KVAR " + activeSurvivors + " / 9",
        950,
        43
      );
      ctx.textAlign = "left";
      return;
    }

    if (state.scene === "sea") {
      roundedRect(76, 16, 270, 44, 14);
      ctx.fillStyle = "rgba(15, 67, 91, 0.88)";
      ctx.fill();
      ctx.fillStyle = "#9ff6ff";
      ctx.font = "900 12px Trebuchet MS";
      ctx.textAlign = "left";
      ctx.fillText("STORT HAV • " + state.playMode.toUpperCase(), 94, 35);
      ctx.fillStyle = COLORS.white;
      ctx.font = "900 14px Trebuchet MS";
      ctx.fillText(partyNames() ? partyNames() + " • NAVIGERAR" : "SOLO PÅ BÅTEN", 94, 52);

      roundedRect(403, 19, 334, 38, 13);
      ctx.fillStyle = state.controlTarget === "boat"
        ? "rgba(31, 126, 154, 0.94)"
        : "rgba(5, 27, 46, 0.9)";
      ctx.fill();
      ctx.strokeStyle = state.controlTarget === "boat" ? "#ffe071" : "#55e8ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.white;
      ctx.font = "1000 14px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(
        state.controlTarget === "boat" ? "STYR BÅTEN • HITTA HOTELLÖN" : "STYR PERSONEN PÅ DÄCKET",
        570,
        44
      );

      const hotelIsland = state.islands.find((island) => island.isCorrect);
      const distance = hotelIsland && state.boat
        ? Math.round(Math.hypot(hotelIsland.dockX - state.boat.x, hotelIsland.dockY - state.boat.y))
        : 0;
      ctx.fillStyle = "#ffe071";
      ctx.font = "1000 15px Trebuchet MS";
      ctx.textAlign = "right";
      ctx.fillText("HOTELLÖN  " + distance + " sjömil", 1044, 43);
      ctx.textAlign = "left";
      return;
    }

    if (state.scene === "hotel") {
      roundedRect(76, 16, 270, 44, 14);
      ctx.fillStyle = "rgba(72, 40, 58, 0.9)";
      ctx.fill();
      ctx.fillStyle = "#ffd98a";
      ctx.font = "900 12px Trebuchet MS";
      ctx.textAlign = "left";
      ctx.fillText("Ö-HOTELLET • " + state.playMode.toUpperCase(), 94, 35);
      ctx.fillStyle = COLORS.white;
      ctx.font = "900 14px Trebuchet MS";
      ctx.fillText(partyNames() || "HITTA RÄTT DÖRR", 94, 52);

      roundedRect(403, 19, 334, 38, 13);
      ctx.fillStyle = state.inventory.hotelKey
        ? "rgba(126, 92, 25, 0.94)"
        : "rgba(39, 24, 42, 0.92)";
      ctx.fill();
      ctx.strokeStyle = state.inventory.hotelKey ? "#ffd45e" : "#8f6c85";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.white;
      ctx.font = "1000 14px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(
        state.inventory.hotelKey ? "🔑 NYCKEL HITTAD • PROVA DÖRRARNA" : "🔑 HITTA DEN ENDA NYCKELN",
        570,
        44
      );
      ctx.fillStyle = "#ffd98a";
      ctx.font = "1000 15px Trebuchet MS";
      ctx.textAlign = "right";
      ctx.fillText("4 HOTELLRUM", 1044, 43);
      ctx.textAlign = "left";
      return;
    }

    roundedRect(76, 16, 242, 44, 14);
    ctx.fillStyle = "rgba(19, 49, 75, 0.82)";
    ctx.fill();
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.font = "900 12px Trebuchet MS";
    ctx.textAlign = "left";
    ctx.fillText("VÅNING " + (state.levelIndex + 1) + " / " + LEVELS.length, 94, 35);
    ctx.fillStyle = COLORS.white;
    ctx.font = "900 14px Trebuchet MS";
    ctx.fillText(
      (state.playMode ? state.playMode.toUpperCase() + " • " : "") +
        LEVELS[state.levelIndex].name,
      94,
      52
    );

    const cooldownRatio = state.sonar.activeMs > 0
      ? 1
      : 1 - state.sonar.cooldownMs / SONAR_COOLDOWN;
    roundedRect(403, 19, 334, 38, 13);
    ctx.fillStyle = "rgba(5, 20, 38, 0.88)";
    ctx.fill();
    roundedRect(407, 23, 326 * Math.max(0, cooldownRatio), 30, 10);
    ctx.fillStyle = state.sonar.activeMs > 0 ? COLORS.cyan : "#215873";
    ctx.fill();
    ctx.fillStyle = state.sonar.cooldownMs <= 0 || state.sonar.activeMs > 0
      ? COLORS.white
      : "#aac2cc";
    ctx.font = "900 14px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(
      state.sonar.activeMs > 0
        ? "SÖKER • SKUGGOR FRUSNA"
        : state.sonar.cooldownMs <= 0
          ? "SPACE • SÖKPULS REDO"
          : "SÖKPULS LADDAR",
      570,
      44
    );

    ctx.textAlign = "right";
    ctx.font = "900 20px Trebuchet MS";
    for (let i = 0; i < MAX_HEARTS; i += 1) {
      ctx.fillStyle = i < state.hearts ? COLORS.pink : "#2b3b4f";
      ctx.fillText("♥", 860 + i * 27, 46);
    }

    const totalSeconds = Math.floor(state.elapsedMs / 1000);
    const timeText =
      String(Math.floor(totalSeconds / 60)).padStart(2, "0") +
      ":" +
      String(totalSeconds % 60).padStart(2, "0");
    ctx.fillStyle = "#afc6d0";
    ctx.font = "900 14px ui-monospace, monospace";
    ctx.fillText(timeText, 958, 45);
    ctx.textAlign = "left";
  }

  function drawFloorTile(x, y, gridX, gridY) {
    ctx.fillStyle = (gridX + gridY) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = "rgba(82, 91, 91, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);

    if ((gridX * 5 + gridY * 3) % 7 === 0) {
      ctx.fillStyle = "rgba(16, 47, 56, 0.12)";
      ctx.fillRect(x + 11, y + 13, 3, 3);
      ctx.fillRect(x + 37, y + 39, 2, 2);
    }
  }

  function drawWallTile(x, y, gridX, gridY) {
    ctx.fillStyle = COLORS.wallDark;
    ctx.fillRect(x, y, TILE, TILE);
    roundedRect(x + 3, y + 3, TILE - 6, TILE - 6, 7);
    ctx.fillStyle = COLORS.wall;
    ctx.fill();
    ctx.fillStyle = COLORS.wallTop;
    roundedRect(x + 5, y + 5, TILE - 10, 12, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(77, 122, 158, 0.22)";
    ctx.fillRect(x + 8, y + 22, TILE - 16, 2);
    if ((gridX + gridY * 2) % 3 === 0) {
      ctx.fillStyle = "rgba(84, 231, 255, 0.18)";
      ctx.fillRect(x + TILE - 8, y + 12, 2, TILE - 24);
    }
  }

  function drawDoor(door) {
    const x = MAP_X + door.x * TILE;
    const y = MAP_Y + door.y * TILE;
    const revealed = state.sonar.activeMs > 0;
    const color = !revealed
      ? COLORS.red
      : door.isReal
        ? COLORS.lime
        : COLORS.pink;
    const glow = revealed && door.isReal ? 22 : 11;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = "#0a1729";
    roundedRect(x + 3, y + 3, TILE - 6, TILE - 6, 7);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    roundedRect(x + 8, y + 9, TILE - 16, TILE - 15, 4);
    ctx.fillStyle = revealed && door.isReal ? "#284a2a" : "#3a1630";
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = "1000 11px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(revealed ? (door.isReal ? "YES" : "NO") : "EXIT", x + TILE / 2, y + TILE / 2);
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }

  function drawLobbyDoor(door) {
    const x = MAP_X + door.x * TILE;
    const y = MAP_Y + door.y * TILE;
    const pulse = 0.72 + Math.sin((state.visualTime + door.x * 90) / 330) * 0.16;

    ctx.save();
    ctx.shadowColor = door.color;
    ctx.shadowBlur = 14 * pulse;
    roundedRect(x + 2, y + 2, TILE - 4, TILE - 4, 7);
    ctx.fillStyle = "#071528";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = door.color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    roundedRect(x + 7, y + 7, TILE - 14, 23, 5);
    ctx.fillStyle = door.available ? "rgba(24, 62, 81, 0.95)" : "rgba(39, 42, 55, 0.95)";
    ctx.fill();
    ctx.fillStyle = door.color;
    ctx.font = "1000 11px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(door.label, x + TILE / 2, y + 19);

    if (door.players >= 10) {
      roundedRect(x + TILE / 2 - 13, y + 32, 26, 14, 7);
      ctx.fillStyle = door.available ? COLORS.white : "#9da7af";
      ctx.fill();
      ctx.fillStyle = "#071528";
      ctx.font = "1000 9px Trebuchet MS";
      ctx.fillText(String(door.players), x + TILE / 2, y + 39);
    } else {
      const spacing = 8;
      const startX = x + TILE / 2 - ((door.players - 1) * spacing) / 2;
      for (let index = 0; index < door.players; index += 1) {
        ctx.beginPath();
        ctx.fillStyle = door.available ? COLORS.white : "#9da7af";
        ctx.arc(startX + index * spacing, y + 39, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }

  function drawLobbyRoom() {
    const roomX = MAP_X + 3 * TILE;
    const roomY = MAP_Y + 2 * TILE;
    const roomWidth = 9 * TILE;
    const roomHeight = 7 * TILE;

    ctx.save();
    ctx.shadowColor = "rgba(71, 224, 255, 0.2)";
    ctx.shadowBlur = 34;
    roundedRect(roomX - 10, roomY - 10, roomWidth + 20, roomHeight + 20, 20);
    ctx.fillStyle = "rgba(2, 8, 18, 0.92)";
    ctx.fill();
    ctx.restore();

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const cell = cellAt(x, y);
        if (cell === "V") {
          continue;
        }
        const px = MAP_X + x * TILE;
        const py = MAP_Y + y * TILE;
        if (cell === "#") {
          drawWallTile(px, py, x, y);
        } else {
          drawFloorTile(px, py, x, y);
        }
      }
    }

    roundedRect(MAP_X + 7 * TILE + 7, MAP_Y + 4 * TILE + 8, 5 * TILE - 14, 3 * TILE - 16, 18);
    ctx.fillStyle = "rgba(25, 109, 132, 0.16)";
    ctx.fill();
    ctx.strokeStyle = "rgba(85, 232, 255, 0.32)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(LOGICAL_WIDTH / 2, MAP_Y + 5.15 * TILE);
    ctx.fillStyle = "rgba(85, 232, 255, 0.42)";
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(13, -9);
    ctx.lineTo(5, -9);
    ctx.lineTo(5, 17);
    ctx.lineTo(-5, 17);
    ctx.lineTo(-5, -9);
    ctx.lineTo(-13, -9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    roundedRect(410, 145, 320, 42, 14);
    ctx.fillStyle = "rgba(5, 20, 38, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(85, 232, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COLORS.white;
    ctx.font = "1000 17px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("VÄLJ HUR DU VILL SPELA", 570, 172);
    ctx.textAlign = "left";

    state.lobbyDoors.forEach(drawLobbyDoor);
  }

  function drawMap() {
    if (state.scene === "lobby") {
      drawLobbyRoom();
      return;
    }

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.52)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#020711";
    roundedRect(MAP_X - 8, MAP_Y - 8, GRID_WIDTH * TILE + 16, GRID_HEIGHT * TILE + 16, 12);
    ctx.fill();
    ctx.restore();

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const px = MAP_X + x * TILE;
        const py = MAP_Y + y * TILE;
        if (cellAt(x, y) === "#") {
          drawWallTile(px, py, x, y);
        } else {
          drawFloorTile(px, py, x, y);
        }
      }
    }

    state.doors.forEach(drawDoor);
  }

  function getThirdPersonCamera() {
    const position = animationPosition(state.player, MOVE_TIME);
    const centerX = position.x + 0.5;
    const centerY = position.y + 0.5;
    const dirX = Math.cos(state.cameraAngle);
    const dirY = Math.sin(state.cameraAngle);
    const rightX = -dirY;
    const rightY = dirX;
    const planeScale = Math.tan(CAMERA_FOV / 2);
    return {
      x: centerX - dirX * CAMERA_BACK_OFFSET,
      y: centerY - dirY * CAMERA_BACK_OFFSET,
      dirX,
      dirY,
      rightX,
      rightY,
      planeX: rightX * planeScale,
      planeY: rightY * planeScale,
      horizon: Math.max(
        225,
        Math.min(455, BASE_VIEW_HORIZON + state.cameraPitch * 300)
      ),
    };
  }

  function isRaySolidCell(cell) {
    return (
      cell === "#" ||
      cell === "V" ||
      cell === "E" ||
      cell === "F" ||
      Boolean(LOBBY_DOOR_TYPES[cell])
    );
  }

  function castCameraRay(camera, cameraPlaneX) {
    const rayDirX = camera.dirX + camera.planeX * cameraPlaneX;
    const rayDirY = camera.dirY + camera.planeY * cameraPlaneX;
    let mapX = Math.floor(camera.x);
    let mapY = Math.floor(camera.y);
    const deltaDistX = Math.abs(rayDirX) < 0.000001 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(rayDirY) < 0.000001 ? 1e30 : Math.abs(1 / rayDirY);
    const stepX = rayDirX < 0 ? -1 : 1;
    const stepY = rayDirY < 0 ? -1 : 1;
    let sideDistX = rayDirX < 0
      ? (camera.x - mapX) * deltaDistX
      : (mapX + 1 - camera.x) * deltaDistX;
    let sideDistY = rayDirY < 0
      ? (camera.y - mapY) * deltaDistY
      : (mapY + 1 - camera.y) * deltaDistY;
    let side = 0;
    let cell = cellAt(mapX, mapY);

    for (let step = 0; step < 64; step += 1) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      cell = cellAt(mapX, mapY);
      if (isRaySolidCell(cell)) {
        break;
      }
    }

    const rawDistance = side === 0
      ? (mapX - camera.x + (1 - stepX) / 2) / rayDirX
      : (mapY - camera.y + (1 - stepY) / 2) / rayDirY;
    const distance = Math.max(0.08, Math.abs(rawDistance));
    let wallX = side === 0
      ? camera.y + rawDistance * rayDirY
      : camera.x + rawDistance * rayDirX;
    wallX -= Math.floor(wallX);

    return {
      distance,
      cell,
      mapX,
      mapY,
      side,
      wallX,
    };
  }

  function doorStyleForCell(cell, mapX, mapY) {
    if (LOBBY_DOOR_TYPES[cell]) {
      return {
        ...LOBBY_DOOR_TYPES[cell],
        text: LOBBY_DOOR_TYPES[cell].label,
      };
    }
    if (state.scene === "play" && state.play && (cell === "E" || cell === "F")) {
      const door = state.doors.find((candidate) => candidate.x === mapX && candidate.y === mapY);
      if (!door) {
        return null;
      }
      const knownCorrect = state.play.correctDoorKnown && door.isReal;
      return {
        color: knownCorrect
          ? COLORS.lime
          : state.play.key && state.play.key.collected ? "#ffd45e" : COLORS.red,
        text: knownCorrect ? "RÄTT DÖRR" : door.label,
        available: true,
        mode: "play-door",
      };
    }
    if (state.scene === "hotel" && (cell === "E" || cell === "F")) {
      const door = state.doors.find((candidate) => candidate.x === mapX && candidate.y === mapY);
      if (!door) {
        return null;
      }
      const doorHelper = helperForTask("hotel-correct-door");
      const companionHint = Boolean(
        state.inventory.hotelKey &&
        door.isReal &&
        doorHelper &&
        doorHelper.status === "pointing_door" &&
        doorHelper.helperTarget &&
        doorHelper.helperTarget.doorId === door.id
      );
      return {
        color: companionHint ? COLORS.lime : "#ffd45e",
        text: door.label,
        available: true,
        mode: "hotel-room",
      };
    }
    if (cell === "E" || cell === "F") {
      const revealed = state.sonar.activeMs > 0;
      const isReal = cell === "E";
      const helperMarkedCorrect = Boolean(
        isReal &&
        state.partyAssistance.correctExit &&
        state.partyAssistance.correctExit.x === mapX &&
        state.partyAssistance.correctExit.y === mapY
      );
      const helperWarnedWrong = Boolean(
        !isReal &&
        state.partyAssistance.warnedWrongExit &&
        state.partyAssistance.warnedWrongExit.x === mapX &&
        state.partyAssistance.warnedWrongExit.y === mapY
      );
      return {
        color: revealed
          ? isReal ? COLORS.lime : COLORS.pink
          : helperMarkedCorrect ? COLORS.lime : helperWarnedWrong ? COLORS.pink : COLORS.red,
        text: revealed
          ? isReal ? "YES" : "NO"
          : helperMarkedCorrect ? "RÄTT EXIT" : helperWarnedWrong ? "FEL DÖRR" : "EXIT",
        available: true,
        mode: "exit",
      };
    }
    return null;
  }

  function drawThirdPersonBackdrop(camera) {
    const hotelScene = state.scene === "hotel";
    const ceiling = ctx.createLinearGradient(0, VIEW_TOP, 0, camera.horizon);
    ceiling.addColorStop(0, hotelScene ? "#231726" : "#071426");
    ceiling.addColorStop(0.65, hotelScene ? "#503044" : "#102b43");
    ceiling.addColorStop(1, hotelScene ? "#6d4353" : "#173c52");
    ctx.fillStyle = ceiling;
    ctx.fillRect(0, VIEW_TOP, LOGICAL_WIDTH, camera.horizon - VIEW_TOP);

    const floor = ctx.createLinearGradient(0, camera.horizon, 0, LOGICAL_HEIGHT);
    floor.addColorStop(0, hotelScene ? "#375b62" : "#4f5961");
    floor.addColorStop(0.32, hotelScene ? "#173e4c" : "#283945");
    floor.addColorStop(1, hotelScene ? "#071b2a" : "#08131f");
    ctx.fillStyle = floor;
    ctx.fillRect(0, camera.horizon, LOGICAL_WIDTH, LOGICAL_HEIGHT - camera.horizon);

    ctx.strokeStyle = hotelScene
      ? "rgba(255, 212, 94, 0.15)"
      : "rgba(112, 225, 243, 0.11)";
    ctx.lineWidth = 2;
    for (let distance = 0.85; distance <= 15; distance += 1) {
      const y = camera.horizon + CAMERA_FOCAL * CAMERA_HEIGHT / distance;
      if (y > camera.horizon && y < LOGICAL_HEIGHT) {
        ctx.globalAlpha = Math.min(0.7, distance / 9);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_WIDTH, y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    for (let lane = -7; lane <= 7; lane += 1) {
      const fractionalShift = (camera.x * camera.rightX + camera.y * camera.rightY) % 1;
      const bottomX = LOGICAL_WIDTH / 2 + (lane - fractionalShift) * 116;
      ctx.beginPath();
      ctx.moveTo(LOGICAL_WIDTH / 2, camera.horizon);
      ctx.lineTo(bottomX, LOGICAL_HEIGHT);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(100, 226, 255, 0.22)";
    ctx.lineWidth = 3;
    for (let beam = -3; beam <= 3; beam += 1) {
      const topX = LOGICAL_WIDTH / 2 + beam * 188;
      ctx.beginPath();
      ctx.moveTo(topX - 70, VIEW_TOP + 8);
      ctx.lineTo(LOGICAL_WIDTH / 2 + beam * 48, camera.horizon);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawRaycastWalls(camera) {
    const zBuffer = new Array(LOGICAL_WIDTH).fill(64);
    const doorSurfaces = new Map();

    for (let screenX = 0; screenX < LOGICAL_WIDTH; screenX += RAY_STRIP_WIDTH) {
      const cameraPlaneX = 2 * (screenX + RAY_STRIP_WIDTH / 2) / LOGICAL_WIDTH - 1;
      const hit = castCameraRay(camera, cameraPlaneX);
      const wallHeight = Math.min(1600, CAMERA_FOCAL / hit.distance);
      const top = camera.horizon - wallHeight / 2;
      const bottom = camera.horizon + wallHeight / 2;
      const clippedTop = Math.max(VIEW_TOP, top);
      const clippedBottom = Math.min(LOGICAL_HEIGHT, bottom);
      const height = Math.max(0, clippedBottom - clippedTop);
      const doorStyle = doorStyleForCell(hit.cell, hit.mapX, hit.mapY);
      const hotelScene = state.scene === "hotel";

      if (doorStyle) {
        ctx.fillStyle = hotelScene
          ? (hit.side === 1 ? "#211219" : "#321b24")
          : (hit.side === 1 ? "#06111d" : "#091a2a");
        ctx.fillRect(screenX, clippedTop, RAY_STRIP_WIDTH + 0.5, height);
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, 0.27 - hit.distance * 0.008);
        ctx.fillStyle = doorStyle.color;
        ctx.fillRect(screenX, clippedTop, RAY_STRIP_WIDTH + 0.5, height);
        ctx.restore();

        if (hit.wallX < 0.075 || hit.wallX > 0.925) {
          ctx.fillStyle = doorStyle.color;
          ctx.fillRect(screenX, clippedTop, RAY_STRIP_WIDTH + 0.5, height);
        } else if (Math.floor(hit.wallX * 10) % 3 === 0) {
          ctx.fillStyle = "rgba(210, 244, 255, 0.055)";
          ctx.fillRect(screenX, clippedTop, RAY_STRIP_WIDTH + 0.5, height);
        }
        ctx.fillStyle = doorStyle.color;
        ctx.globalAlpha = Math.max(0.32, 0.78 - hit.distance * 0.04);
        ctx.fillRect(screenX, Math.max(VIEW_TOP, top), RAY_STRIP_WIDTH + 0.5, 3);
        ctx.fillRect(screenX, Math.min(LOGICAL_HEIGHT - 3, bottom - 3), RAY_STRIP_WIDTH + 0.5, 3);
        ctx.globalAlpha = 1;

        const key = hit.mapX + "," + hit.mapY;
        const existing = doorSurfaces.get(key);
        if (existing) {
          existing.left = Math.min(existing.left, screenX);
          existing.right = Math.max(existing.right, screenX + RAY_STRIP_WIDTH);
          existing.top = Math.min(existing.top, clippedTop);
          existing.bottom = Math.max(existing.bottom, clippedBottom);
          existing.distance = Math.min(existing.distance, hit.distance);
        } else {
          doorSurfaces.set(key, {
            left: screenX,
            right: screenX + RAY_STRIP_WIDTH,
            top: clippedTop,
            bottom: clippedBottom,
            distance: hit.distance,
            cell: hit.cell,
            mapX: hit.mapX,
            mapY: hit.mapY,
          });
        }
      } else {
        if (hit.cell === "V") {
          ctx.fillStyle = hit.side === 1 ? "#06101b" : "#091827";
        } else if (hotelScene) {
          ctx.fillStyle = hit.side === 1 ? "#4a2b3c" : "#684052";
        } else {
          ctx.fillStyle = hit.side === 1 ? "#102941" : "#183a57";
        }
        ctx.fillRect(screenX, clippedTop, RAY_STRIP_WIDTH + 0.5, height);

        if (hit.wallX < 0.04 || hit.wallX > 0.96) {
          ctx.fillStyle = "rgba(103, 204, 235, 0.18)";
          ctx.fillRect(screenX, clippedTop, RAY_STRIP_WIDTH + 0.5, height);
        } else if (Math.floor(hit.wallX * 12) % 5 === 0) {
          ctx.fillStyle = "rgba(174, 223, 239, 0.045)";
          ctx.fillRect(screenX, clippedTop, RAY_STRIP_WIDTH + 0.5, height);
        }

        ctx.fillStyle = hit.side === 1
          ? "rgba(72, 138, 174, 0.2)"
          : "rgba(111, 190, 217, 0.2)";
        ctx.fillRect(screenX, Math.max(VIEW_TOP, top), RAY_STRIP_WIDTH + 0.5, 2);
        ctx.fillRect(
          screenX,
          Math.max(clippedTop, Math.min(clippedBottom - 1, top + wallHeight * 0.24)),
          RAY_STRIP_WIDTH + 0.5,
          1
        );
      }

      const fogAlpha = Math.min(0.72, Math.max(0, (hit.distance - 2.5) / 20));
      if (fogAlpha > 0) {
        ctx.fillStyle = "rgba(1, 7, 15, " + fogAlpha.toFixed(3) + ")";
        ctx.fillRect(screenX, clippedTop, RAY_STRIP_WIDTH + 0.5, height);
      }
      for (let offset = 0; offset < RAY_STRIP_WIDTH; offset += 1) {
        zBuffer[screenX + offset] = hit.distance;
      }
    }

    return {
      zBuffer,
      visibleDoorSurfaces: Array.from(doorSurfaces.values()),
    };
  }

  function drawVisibleDoorSigns(visibleDoorSurfaces) {
    visibleDoorSurfaces
      .filter((surface) => surface.right - surface.left >= 9)
      .sort((a, b) => b.distance - a.distance)
      .forEach((surface) => {
        const style = doorStyleForCell(surface.cell, surface.mapX, surface.mapY);
        if (!style) {
          return;
        }
        const visibleWidth = surface.right - surface.left;
        const signWidth = Math.max(42, Math.min(190, visibleWidth * 0.82));
        const signHeight = Math.max(27, Math.min(48, signWidth * 0.29));
        const centerX = (surface.left + surface.right) / 2;
        const centerY = Math.max(
          VIEW_TOP + signHeight,
          Math.min(surface.bottom - signHeight - 10, (surface.top + surface.bottom) / 2 - 7)
        );

        ctx.save();
        ctx.shadowColor = style.color;
        ctx.shadowBlur = Math.max(8, 22 - surface.distance);
        roundedRect(
          centerX - signWidth / 2,
          centerY - signHeight / 2,
          signWidth,
          signHeight,
          Math.min(10, signHeight / 4)
        );
        ctx.fillStyle = "rgba(3, 13, 25, 0.94)";
        ctx.fill();
        ctx.lineWidth = Math.max(2, Math.min(4, signWidth / 45));
        ctx.strokeStyle = style.color;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = style.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "1000 " + Math.round(Math.max(13, Math.min(25, signWidth * 0.18))) + "px Trebuchet MS";
        ctx.fillText(style.text, centerX, centerY + 1);

        if (LOBBY_DOOR_TYPES[surface.cell] && surface.bottom - centerY > 36) {
          const status = style.available
            ? style.players + " SPELARE"
            : style.players + " SPELARE • SNART";
          ctx.font = "900 " + Math.round(Math.max(9, Math.min(13, signWidth * 0.085))) + "px Trebuchet MS";
          ctx.fillStyle = style.available ? COLORS.white : "#d4d9df";
          ctx.fillText(status, centerX, centerY + signHeight / 2 + 17);
        }
        ctx.restore();
      });
  }

  function projectWorldSprite(camera, worldX, worldY) {
    const relativeX = worldX - camera.x;
    const relativeY = worldY - camera.y;
    const depth = relativeX * camera.dirX + relativeY * camera.dirY;
    const side = relativeX * camera.rightX + relativeY * camera.rightY;
    return {
      depth,
      screenX: LOGICAL_WIDTH / 2 + side / Math.max(0.001, depth) * CAMERA_FOCAL,
      screenBottom: camera.horizon + CAMERA_FOCAL * CAMERA_HEIGHT / Math.max(0.001, depth),
    };
  }

  function drawLobbyBotSprite(bot, projection, zBuffer) {
    if (
      projection.depth <= 0.12 ||
      projection.screenX < -170 ||
      projection.screenX > LOGICAL_WIDTH + 170
    ) {
      return;
    }

    const height = Math.max(52, Math.min(190, CAMERA_FOCAL * 0.64 / projection.depth));
    const halfWidth = height * 0.34;
    const clipLeft = Math.max(0, Math.floor(projection.screenX - halfWidth));
    const clipRight = Math.min(LOGICAL_WIDTH - 1, Math.ceil(projection.screenX + halfWidth));
    let visibleColumns = 0;
    ctx.save();
    ctx.beginPath();
    for (let screenX = clipLeft; screenX <= clipRight; screenX += 4) {
      if (zBuffer[screenX] >= projection.depth - 0.18) {
        ctx.rect(screenX, VIEW_TOP, 5, LOGICAL_HEIGHT - VIEW_TOP);
        visibleColumns += 1;
      }
    }
    if (visibleColumns < Math.max(2, (clipRight - clipLeft) / 28)) {
      ctx.restore();
      return;
    }
    ctx.clip();

    const moving = bot.moveAnimMs > 0;
    const helperStationed = Boolean(
      bot.helperTask &&
      ((bot.arrivalStatus && bot.status === bot.arrivalStatus) || bot.status === "key_found")
    );
    const step = moving ? Math.sin(bot.walkMs / 68) : 0;
    const bob = moving
      ? Math.abs(Math.sin(bot.walkMs / 72)) * Math.min(7, height * 0.04)
      : Math.sin((state.visualTime + bot.startDelayMs) / 420) * Math.min(2.5, height * 0.014);
    const scale = height / 122;
    const bodyAngle = Math.atan2(bot.facingY, bot.facingX);
    const viewDelta = normalizeAngle(state.cameraAngle - bodyAngle);
    const viewCos = Math.cos(viewDelta);
    const backWeight = Math.max(0, viewCos);
    const frontWeight = Math.max(0, -viewCos);
    const sideWeight = Math.abs(Math.sin(viewDelta));

    ctx.translate(projection.screenX, projection.screenBottom - bob);
    ctx.strokeStyle = bot.color;
    ctx.shadowColor = helperStationed ? bot.color : "transparent";
    ctx.shadowBlur = helperStationed ? 12 + Math.sin(state.visualTime / 190) * 3 : 0;
    ctx.lineWidth = Math.max(1.5, height * (helperStationed ? 0.022 : 0.012));
    ctx.globalAlpha = helperStationed || bot.status === "arrived" ? 0.82 : 0.46;
    ctx.beginPath();
    ctx.ellipse(
      0,
      1,
      height * (helperStationed ? 0.34 : 0.25),
      height * (helperStationed ? 0.085 : 0.065),
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.rotate(moving ? step * 0.025 : 0);
    ctx.scale(scale, scale);

    ctx.fillStyle = "rgba(1, 6, 14, 0.48)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 31, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111c2b";
    roundedRect(-22, -31 + step * 3, 16, 30, 7);
    ctx.fill();
    roundedRect(6, -31 - step * 3, 16, 30, 7);
    ctx.fill();
    ctx.fillStyle = "#07111f";
    roundedRect(-26, -8 + step * 3, 22, 10, 5);
    ctx.fill();
    roundedRect(4, -8 - step * 3, 22, 10, 5);
    ctx.fill();

    ctx.fillStyle = bot.bodyColor;
    roundedRect(-39, -70 - step * 2, 12, 37, 7);
    ctx.fill();
    roundedRect(27, -70 + step * 2, 12, 37, 7);
    ctx.fill();

    ctx.shadowColor = bot.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = bot.bodyColor;
    roundedRect(-31, -79, 62, 51, 15);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = bot.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (backWeight > 0.06) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, backWeight + sideWeight * 0.28);
      ctx.fillStyle = "#122a43";
      roundedRect(-24, -70, 48, 34, 10);
      ctx.fill();
      ctx.strokeStyle = bot.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = bot.color;
      roundedRect(-14, -58, 28, 7, 3);
      ctx.fill();
      ctx.restore();
    }

    if (frontWeight > 0.05 || sideWeight > 0.28) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, frontWeight + sideWeight * 0.72);
      ctx.fillStyle = "#102b43";
      roundedRect(-19, -66, 38, 27, 8);
      ctx.fill();
      ctx.strokeStyle = bot.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = bot.color;
      ctx.font = "1000 18px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bot.targetMode === "duo" ? "D" : "T", 0, -52);
      ctx.restore();
    }

    ctx.fillStyle = "#d9edf2";
    roundedRect(-27, -113, 54, 38, 12);
    ctx.fill();
    ctx.strokeStyle = "#47677c";
    ctx.lineWidth = 3;
    ctx.stroke();

    if (backWeight > 0.55) {
      ctx.fillStyle = "#17283b";
      roundedRect(-20, -106, 40, 21, 7);
      ctx.fill();
      ctx.fillStyle = bot.color;
      roundedRect(-13, -97, 26, 5, 2);
      ctx.fill();
    } else {
      const profileShift = Math.sign(Math.sin(viewDelta) || 1) * sideWeight * 8;
      ctx.fillStyle = "#10263c";
      roundedRect(-20 + profileShift * 0.35, -106, 40 - sideWeight * 9, 23, 7);
      ctx.fill();
      ctx.fillStyle = "#9ff6ff";
      ctx.shadowColor = "#55e8ff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      if (frontWeight > 0.12) {
        ctx.arc(-8, -95, 3.5, 0, Math.PI * 2);
        ctx.arc(8, -95, 3.5, 0, Math.PI * 2);
      } else {
        ctx.arc(profileShift > 0 ? 9 : -9, -95, 4, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = "#7992a3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -113);
    ctx.lineTo(0, -123);
    ctx.stroke();
    ctx.fillStyle = bot.color;
    ctx.shadowColor = bot.color;
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(0, -126, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    const helperLabel = Boolean(bot.helperTask && state.scene !== "lobby");
    const labelFontSize = Math.round(
      helperLabel
        ? Math.max(14, Math.min(18, height * 0.1))
        : Math.max(9, Math.min(13, height * 0.075))
    );
    const labelText = bot.roleLabel
      ? bot.name + " • " + bot.roleLabel
      : bot.status === "arrived"
        ? bot.name + " ✓ " + bot.targetLabel
        : bot.name + " → " + bot.targetLabel;
    ctx.font = "1000 " + labelFontSize + "px Trebuchet MS";
    const labelWidth = Math.max(
      helperLabel ? 94 : 60,
      Math.min(helperLabel ? 178 : 116, ctx.measureText(labelText).width + 18)
    );
    const labelY = -height - labelFontSize - 8;
    roundedRect(-labelWidth / 2, labelY, labelWidth, labelFontSize + 10, 8);
    ctx.fillStyle = "rgba(3, 13, 25, 0.9)";
    ctx.fill();
    ctx.strokeStyle = bot.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = helperStationed || bot.status === "arrived" ? COLORS.white : bot.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, 0, labelY + (labelFontSize + 10) / 2 + 1);
    ctx.restore();
  }

  function drawThirdPersonLobbyBots(camera, zBuffer) {
    if (state.scene !== "lobby") {
      return;
    }
    state.lobbyBots
      .map((bot) => {
        const position = animationPosition(bot, LOBBY_BOT_MOVE_TIME);
        return {
          bot,
          projection: projectWorldSprite(camera, position.x + 0.5, position.y + 0.5),
        };
      })
      .sort((a, b) => b.projection.depth - a.projection.depth)
      .forEach(({ bot, projection }) => drawLobbyBotSprite(bot, projection, zBuffer));
  }

  function drawThirdPersonPartyBots(camera, zBuffer) {
    if (state.scene === "lobby" || state.scene === "sea") {
      return;
    }
    state.partyBots
      .map((bot) => {
        const position = animationPosition(bot, PARTY_HELPER_MOVE_TIME);
        return {
          bot,
          projection: projectWorldSprite(camera, position.x + 0.5, position.y + 0.5),
        };
      })
      .sort((a, b) => b.projection.depth - a.projection.depth)
      .forEach(({ bot, projection }) => drawLobbyBotSprite(bot, projection, zBuffer));
  }

  function drawThirdPersonPlayBots(camera, zBuffer) {
    if (state.scene !== "play" || !state.play || state.play.phase !== "hunt") {
      return;
    }
    state.play.bots
      .filter((bot) => bot.status === "active")
      .map((bot) => {
        const duration = bot.role === "monster" ? PLAY_MONSTER_MOVE_TIME : PLAY_BOT_MOVE_TIME;
        const position = animationPosition(bot, duration);
        const renderBot = {
          ...bot,
          color: bot.role === "monster" ? COLORS.red : bot.color,
          bodyColor: bot.role === "monster" ? "#4d1525" : bot.bodyColor,
          helperTask: bot.role === "monster" ? "play-monster" : "play-helper",
          roleLabel: bot.role === "monster" ? "MONSTER" : bot.roleLabel,
        };
        return {
          bot: renderBot,
          projection: projectWorldSprite(camera, position.x + 0.5, position.y + 0.5),
        };
      })
      .sort((a, b) => b.projection.depth - a.projection.depth)
      .forEach(({ bot, projection }) => {
        drawLobbyBotSprite(bot, projection, zBuffer);
        if (bot.role === "monster" && projection.depth > 0.12) {
          const size = Math.max(18, Math.min(72, CAMERA_FOCAL * 0.18 / projection.depth));
          ctx.save();
          ctx.translate(projection.screenX, projection.screenBottom - size * 3.4);
          ctx.fillStyle = COLORS.red;
          ctx.shadowColor = COLORS.red;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(-size * 0.45, size * 0.2);
          ctx.lineTo(-size * 0.2, -size * 0.55);
          ctx.lineTo(0, size * 0.1);
          ctx.moveTo(size * 0.45, size * 0.2);
          ctx.lineTo(size * 0.2, -size * 0.55);
          ctx.lineTo(0, size * 0.1);
          ctx.fill();
          ctx.restore();
        }
      });
  }

  function drawThirdPersonPlayKey(camera, zBuffer) {
    if (
      state.scene !== "play" ||
      !state.play ||
      state.play.phase !== "hunt" ||
      !state.play.key ||
      state.play.key.collected
    ) {
      return;
    }
    const key = state.play.key;
    const projection = projectWorldSprite(camera, key.x + 0.5, key.y + 0.5);
    if (
      projection.depth <= 0.12 ||
      projection.screenX < -100 ||
      projection.screenX > LOGICAL_WIDTH + 100
    ) {
      return;
    }
    const column = Math.max(0, Math.min(LOGICAL_WIDTH - 1, Math.round(projection.screenX)));
    if (zBuffer[column] < projection.depth - 0.16) {
      return;
    }
    const size = Math.max(42, Math.min(138, CAMERA_FOCAL * 0.36 / projection.depth));
    const bob = Math.sin(state.visualTime / 170) * Math.min(8, size * 0.08);
    ctx.save();
    ctx.translate(projection.screenX, projection.screenBottom - size * 0.55 - bob);
    ctx.rotate(Math.sin(state.visualTime / 430) * 0.18);
    ctx.strokeStyle = "#ffe071";
    ctx.lineWidth = Math.max(5, size * 0.1);
    ctx.shadowColor = "#ffd45e";
    ctx.shadowBlur = Math.max(14, size * 0.28);
    ctx.beginPath();
    ctx.arc(-size * 0.18, -size * 0.08, size * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.01, size * 0.02);
    ctx.lineTo(size * 0.42, size * 0.3);
    ctx.moveTo(size * 0.24, size * 0.18);
    ctx.lineTo(size * 0.36, size * 0.04);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.rotate(-Math.sin(state.visualTime / 430) * 0.18);
    ctx.font = "1000 " + Math.round(Math.max(12, size * 0.16)) + "px Trebuchet MS";
    roundedRect(-48, -size * 0.66, 96, 28, 9);
    ctx.fillStyle = "rgba(35, 22, 12, 0.94)";
    ctx.fill();
    ctx.strokeStyle = "#ffd45e";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff8d2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NYCKEL", 0, -size * 0.66 + 14);
    ctx.restore();
  }

  function drawThirdPersonHotelKey(camera, zBuffer) {
    if (state.scene !== "hotel" || !state.hotel || state.hotel.key.collected) {
      return;
    }
    const key = state.hotel.key;
    const projection = projectWorldSprite(camera, key.x + 0.5, key.y + 0.5);
    if (
      projection.depth <= 0.12 ||
      projection.screenX < -120 ||
      projection.screenX > LOGICAL_WIDTH + 120
    ) {
      return;
    }
    const size = Math.max(38, Math.min(130, CAMERA_FOCAL * 0.34 / projection.depth));
    const screenColumn = Math.max(0, Math.min(LOGICAL_WIDTH - 1, Math.round(projection.screenX)));
    if (zBuffer[screenColumn] < projection.depth - 0.16) {
      return;
    }
    const bob = Math.sin(state.visualTime / 180) * Math.min(7, size * 0.08);
    ctx.save();
    ctx.translate(projection.screenX, projection.screenBottom - size * 0.58 - bob);
    ctx.rotate(Math.sin(state.visualTime / 620) * 0.13);
    ctx.shadowColor = "#ffd45e";
    ctx.shadowBlur = Math.max(12, size * 0.25);
    ctx.strokeStyle = "#ffd45e";
    ctx.fillStyle = "#ffe98f";
    ctx.lineWidth = Math.max(5, size * 0.11);
    ctx.beginPath();
    ctx.arc(-size * 0.2, -size * 0.08, size * 0.19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.03, size * 0.02);
    ctx.lineTo(size * 0.36, size * 0.32);
    ctx.lineTo(size * 0.5, size * 0.16);
    ctx.moveTo(size * 0.25, size * 0.23);
    ctx.lineTo(size * 0.38, size * 0.08);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.rotate(-Math.sin(state.visualTime / 620) * 0.13);
    const keyHelper = helperForTask("hotel-key");
    const label = keyHelper && keyHelper.status === "pointing_key"
      ? keyHelper.name + ": NYCKEL!"
      : "NYCKEL";
    ctx.font = "1000 " + Math.round(Math.max(11, size * 0.16)) + "px Trebuchet MS";
    const width = Math.max(70, ctx.measureText(label).width + 22);
    roundedRect(-width / 2, -size * 0.72, width, 28, 9);
    ctx.fillStyle = "rgba(35, 22, 12, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "#ffd45e";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff8d2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, -size * 0.72 + 14);
    ctx.restore();
  }

  function drawThirdPersonShadows(camera, zBuffer) {
    const projected = state.shadows.map((shadow) => {
      const position = animationPosition(shadow, 180);
      return {
        shadow,
        projection: projectWorldSprite(camera, position.x + 0.5, position.y + 0.5),
      };
    }).sort((a, b) => b.projection.depth - a.projection.depth);

    projected.forEach(({ shadow, projection }) => {
      if (
        projection.depth <= 0.12 ||
        projection.screenX < -180 ||
        projection.screenX > LOGICAL_WIDTH + 180
      ) {
        return;
      }
      const bufferX = Math.max(0, Math.min(LOGICAL_WIDTH - 1, Math.round(projection.screenX)));
      if (zBuffer[bufferX] < projection.depth - 0.28) {
        return;
      }

      const frozen = state.sonar.activeMs > 0;
      const height = Math.max(34, Math.min(270, CAMERA_FOCAL * 0.76 / projection.depth));
      const width = height * 0.64;
      const bob = Math.sin((state.visualTime + shadow.id * 170) / 150) * Math.min(6, height * 0.04);
      ctx.save();
      ctx.translate(projection.screenX, projection.screenBottom + bob);
      ctx.shadowColor = frozen ? COLORS.cyan : "#853de0";
      ctx.shadowBlur = Math.min(28, 8 + height * 0.08);
      ctx.fillStyle = frozen ? "#1d6682" : "#2d174f";
      ctx.beginPath();
      ctx.moveTo(-width * 0.42, 0);
      ctx.quadraticCurveTo(-width * 0.62, -height * 0.42, -width * 0.3, -height * 0.78);
      ctx.quadraticCurveTo(0, -height * 1.04, width * 0.3, -height * 0.78);
      ctx.quadraticCurveTo(width * 0.62, -height * 0.42, width * 0.42, 0);
      ctx.quadraticCurveTo(width * 0.22, -height * 0.14, width * 0.06, 0);
      ctx.quadraticCurveTo(-width * 0.08, -height * 0.15, -width * 0.2, 0);
      ctx.quadraticCurveTo(-width * 0.31, -height * 0.13, -width * 0.42, 0);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = frozen ? COLORS.white : "#ffed8a";
      ctx.beginPath();
      ctx.ellipse(-width * 0.13, -height * 0.63, width * 0.075, height * 0.07, 0, 0, Math.PI * 2);
      ctx.ellipse(width * 0.13, -height * 0.63, width * 0.075, height * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(-width * 0.11, -height * 0.62, Math.max(1.5, width * 0.027), 0, Math.PI * 2);
      ctx.arc(width * 0.15, -height * 0.62, Math.max(1.5, width * 0.027), 0, Math.PI * 2);
      ctx.fill();

      if (frozen) {
        ctx.strokeStyle = "rgba(181, 251, 255, 0.9)";
        ctx.lineWidth = Math.max(2, height * 0.018);
        ctx.beginPath();
        ctx.moveTo(-width * 0.48, -height * 0.86);
        ctx.lineTo(width * 0.48, -height * 0.12);
        ctx.moveTo(width * 0.42, -height * 0.9);
        ctx.lineTo(-width * 0.42, -height * 0.1);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawThirdPersonFlashlight(camera) {
    const gradient = ctx.createLinearGradient(
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT - 118,
      LOGICAL_WIDTH / 2,
      camera.horizon
    );
    gradient.addColorStop(0, "rgba(255, 239, 158, 0.16)");
    gradient.addColorStop(1, "rgba(255, 239, 158, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(LOGICAL_WIDTH / 2 + 30, LOGICAL_HEIGHT - 125);
    ctx.lineTo(LOGICAL_WIDTH / 2 + 172, camera.horizon - 8);
    ctx.lineTo(LOGICAL_WIDTH / 2 - 135, camera.horizon - 8);
    ctx.lineTo(LOGICAL_WIDTH / 2 - 20, LOGICAL_HEIGHT - 125);
    ctx.closePath();
    ctx.fill();
  }

  function drawThirdPersonAvatar() {
    if (!state.player) {
      return;
    }
    const moveProgress = state.player.moveAnimMs > 0
      ? 1 - state.player.moveAnimMs / MOVE_TIME
      : 0;
    const bob = state.player.moveAnimMs > 0 ? Math.sin(moveProgress * Math.PI) * 7 : 0;
    const sway = state.player.moveAnimMs > 0 ? Math.sin(moveProgress * Math.PI * 2) * 3 : 0;
    const bodyAngle = Math.atan2(state.player.facingY, state.player.facingX);
    const viewDelta = normalizeAngle(state.cameraAngle - bodyAngle);
    const viewCos = Math.cos(viewDelta);
    const viewSin = Math.sin(viewDelta);
    const backWeight = Math.max(0, viewCos);
    const frontWeight = Math.max(0, -viewCos);
    const sideWeight = Math.abs(viewSin);
    const noseDirection = -Math.sign(viewSin || 1);
    const bodyWidth = 102 - sideWeight * 34;
    const headRadiusX = 42 - sideWeight * 7;
    const armSpread = bodyWidth / 2 + 10;
    const legGap = 15 - sideWeight * 9;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.setLineDash([]);
    if (state.invulnerableMs > 0 && Math.floor(state.invulnerableMs / 90) % 2 === 0) {
      ctx.globalAlpha = 0.38;
    }
    ctx.translate(LOGICAL_WIDTH / 2 + sway, LOGICAL_HEIGHT - 24 - bob);

    ctx.fillStyle = "rgba(0, 4, 11, 0.46)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 54 - sideWeight * 8, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const legWidth = 27 - sideWeight * 3;
    ctx.fillStyle = "#111b2a";
    roundedRect(-legGap - legWidth, -62, legWidth, 58, 9);
    ctx.fill();
    roundedRect(legGap, -62, legWidth, 58, 9);
    ctx.fill();
    ctx.fillStyle = "#07101d";
    roundedRect(-legGap - legWidth - 8, -13, legWidth + 12, 17, 7);
    ctx.fill();
    roundedRect(legGap - 4, -13, legWidth + 12, 17, 7);
    ctx.fill();

    const farArmX = viewSin >= 0 ? armSpread : -armSpread - 23;
    const nearArmX = viewSin >= 0 ? -armSpread - 23 : armSpread;
    ctx.fillStyle = "#934715";
    roundedRect(farArmX, -124, 23, 75, 12);
    ctx.fill();

    ctx.shadowColor = COLORS.orange;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#d77b25";
    roundedRect(-bodyWidth / 2, -139, bodyWidth, 96, 27);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#683817";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#b95d1d";
    roundedRect(nearArmX, -124, 23, 75, 12);
    ctx.fill();

    const backpackVisibility = Math.min(1, backWeight + sideWeight * 0.32);
    if (backpackVisibility > 0.02) {
      ctx.save();
      ctx.globalAlpha *= backpackVisibility;
      const backpackWidth = 72 - sideWeight * 19;
      const backpackX = -backpackWidth / 2 + noseDirection * sideWeight * 9;
      ctx.fillStyle = "#143653";
      roundedRect(backpackX, -120, backpackWidth, 72, 18);
      ctx.fill();
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#092033";
      roundedRect(backpackX + backpackWidth * 0.2, -101, backpackWidth * 0.6, 34, 11);
      ctx.fill();
      ctx.fillStyle = COLORS.cyan;
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(backpackX + backpackWidth / 2, -84, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#d8faff";
      ctx.beginPath();
      ctx.arc(backpackX + backpackWidth / 2 - 2, -87, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (frontWeight > 0.02) {
      ctx.save();
      ctx.globalAlpha *= frontWeight;
      ctx.strokeStyle = "#ffe2a9";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -128);
      ctx.lineTo(0, -56);
      ctx.stroke();
      ctx.fillStyle = "#143653";
      roundedRect(-24, -108, 48, 33, 10);
      ctx.fill();
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = COLORS.cyan;
      ctx.beginPath();
      ctx.arc(0, -91, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "#e59a45";
    ctx.beginPath();
    ctx.ellipse(0, -157, headRadiusX, 43, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#78431d";
    ctx.lineWidth = 4;
    ctx.stroke();

    if (backWeight > 0.02) {
      ctx.save();
      ctx.globalAlpha *= backWeight;
      ctx.fillStyle = "#192437";
      ctx.beginPath();
      ctx.ellipse(0, -158, headRadiusX - 8, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101927";
      ctx.beginPath();
      ctx.moveTo(-headRadiusX + 9, -163);
      ctx.quadraticCurveTo(0, -201, headRadiusX - 9, -163);
      ctx.lineTo(headRadiusX - 14, -139);
      ctx.quadraticCurveTo(0, -151, -headRadiusX + 14, -139);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const faceVisibility = Math.max(frontWeight, sideWeight);
    if (faceVisibility > 0.02) {
      ctx.save();
      ctx.globalAlpha *= faceVisibility;
      ctx.fillStyle = "#ffd493";
      ctx.beginPath();
      ctx.ellipse(
        noseDirection * sideWeight * 4,
        -157,
        headRadiusX - 9,
        34,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = "#182337";
      ctx.beginPath();
      ctx.ellipse(0, -174, headRadiusX - 9, 19, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (frontWeight > 0.02) {
      ctx.save();
      ctx.globalAlpha *= frontWeight;
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(-11, -158, 3.4, 0, Math.PI * 2);
      ctx.arc(11, -158, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#9c552b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -143, 10, 0.16 * Math.PI, 0.84 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = "rgba(240, 137, 102, 0.55)";
      ctx.beginPath();
      ctx.arc(-22, -147, 5, 0, Math.PI * 2);
      ctx.arc(22, -147, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (sideWeight > 0.08) {
      ctx.save();
      ctx.globalAlpha *= sideWeight;
      const faceX = noseDirection * (headRadiusX - 13);
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(faceX, -159, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd493";
      ctx.strokeStyle = "#9c552b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(noseDirection * (headRadiusX - 5), -154);
      ctx.lineTo(noseDirection * (headRadiusX + 5), -149);
      ctx.lineTo(noseDirection * (headRadiusX - 5), -145);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(noseDirection * 13, -139);
      ctx.quadraticCurveTo(noseDirection * 22, -134, noseDirection * 28, -140);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 9;
    roundedRect(nearArmX + (nearArmX < 0 ? -2 : 8), -75, 17, 25, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (state.scene === "play" && state.play && state.play.phase === "hunt") {
      const monsterPlayer = state.play.playerRole === "monster";
      const caughtPlayer = state.player.status === "caught";
      ctx.shadowColor = monsterPlayer ? COLORS.red : caughtPlayer ? "#9aa9b3" : COLORS.cyan;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = monsterPlayer ? COLORS.red : caughtPlayer ? "#9aa9b3" : COLORS.cyan;
      ctx.lineWidth = 5;
      roundedRect(-70, -220, 140, 34, 11);
      ctx.fillStyle = "rgba(4, 10, 20, 0.92)";
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = "1000 16px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        monsterPlayer ? "DU • MONSTER" : caughtPlayer ? "DU • TAGEN" : "DU • ÖVERLEVARE",
        0,
        -203
      );
      if (monsterPlayer) {
        ctx.fillStyle = COLORS.red;
        ctx.beginPath();
        ctx.moveTo(-30, -189);
        ctx.lineTo(-13, -236);
        ctx.lineTo(0, -190);
        ctx.moveTo(30, -189);
        ctx.lineTo(13, -236);
        ctx.lineTo(0, -190);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawThirdPersonSonar(camera) {
    if (state.scene !== "maze" || state.sonar.activeMs <= 0 || !state.player) {
      return;
    }
    const progress = Math.min(1, state.sonar.elapsedMs / SONAR_DURATION);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let ring = 0; ring < 3; ring += 1) {
      const localProgress = (progress + ring * 0.26) % 1;
      const radiusX = 38 + localProgress * 620;
      const radiusY = 13 + localProgress * 210;
      ctx.globalAlpha = (1 - localProgress) * 0.55;
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 7 - localProgress * 4;
      ctx.beginPath();
      ctx.ellipse(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 92,
        radiusX,
        radiusY,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.restore();

    const realDoor = state.doors.find((door) => door.isReal);
    if (!realDoor) {
      return;
    }
    const playerPosition = animationPosition(state.player, MOVE_TIME);
    const targetAngle = Math.atan2(
      realDoor.y + 0.5 - (playerPosition.y + 0.5),
      realDoor.x + 0.5 - (playerPosition.x + 0.5)
    );
    let angleDelta = targetAngle - state.cameraAngle;
    while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
    while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
    const indicatorX = LOGICAL_WIDTH / 2 + Math.max(-1, Math.min(1, angleDelta / (CAMERA_FOV / 2))) * 390;

    ctx.save();
    ctx.translate(indicatorX, 132);
    ctx.shadowColor = COLORS.lime;
    ctx.shadowBlur = 15;
    roundedRect(-66, -20, 132, 40, 14);
    ctx.fillStyle = "rgba(9, 31, 27, 0.94)";
    ctx.fill();
    ctx.strokeStyle = COLORS.lime;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.translate(-43, 0);
    ctx.rotate(angleDelta);
    ctx.fillStyle = COLORS.lime;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.white;
    ctx.font = "1000 12px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RÄTT DÖRR", 14, 1);
    ctx.restore();
  }

  function drawThirdPersonFocus(camera) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(LOGICAL_WIDTH / 2, camera.horizon, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(LOGICAL_WIDTH / 2 - 16, camera.horizon);
    ctx.lineTo(LOGICAL_WIDTH / 2 - 9, camera.horizon);
    ctx.moveTo(LOGICAL_WIDTH / 2 + 9, camera.horizon);
    ctx.lineTo(LOGICAL_WIDTH / 2 + 16, camera.horizon);
    ctx.stroke();
    ctx.restore();
  }

  function projectSeaIsland(island, boatPosition, horizon) {
    const dirX = Math.cos(state.cameraAngle);
    const dirY = Math.sin(state.cameraAngle);
    const rightX = -dirY;
    const rightY = dirX;
    const relativeX = island.x - boatPosition.x;
    const relativeY = island.y - boatPosition.y;
    const depth = relativeX * dirX + relativeY * dirY;
    const side = relativeX * rightX + relativeY * rightY;
    const distance = Math.max(0.7, depth + 1.1);
    return {
      depth,
      screenX: LOGICAL_WIDTH / 2 + side * 205 / distance,
      screenY: horizon + 285 / distance,
      scale: Math.max(0.22, Math.min(1.8, 1.55 / distance)),
    };
  }

  function drawSeaIsland(island, projection) {
    if (
      projection.depth < -0.4 ||
      projection.screenX < -260 ||
      projection.screenX > LOGICAL_WIDTH + 260
    ) {
      return;
    }
    const pulse = island.isCorrect ? 1 + Math.sin(state.visualTime / 260) * 0.08 : 1;
    const width = (island.isCorrect ? 380 : 250) * projection.scale * pulse;
    const height = width * 0.32;
    ctx.save();
    ctx.translate(projection.screenX, projection.screenY);
    ctx.globalAlpha = Math.max(0.28, Math.min(1, 1.2 - Math.max(0, projection.depth - 5) * 0.1));
    ctx.fillStyle = "rgba(0, 9, 17, 0.46)";
    ctx.beginPath();
    ctx.ellipse(0, height * 0.22, width * 0.58, height * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = island.isCorrect ? "#d6c77a" : "#9f9678";
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = island.color;
    ctx.beginPath();
    ctx.ellipse(0, -height * 0.08, width * 0.4, height * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    if (island.isCorrect) {
      const buildingWidth = width * 0.26;
      const buildingHeight = Math.max(24, width * 0.18);
      ctx.fillStyle = "#f2d8af";
      ctx.fillRect(-buildingWidth / 2, -buildingHeight - height * 0.2, buildingWidth, buildingHeight);
      ctx.fillStyle = "#a1495c";
      ctx.beginPath();
      ctx.moveTo(-buildingWidth * 0.62, -buildingHeight - height * 0.2);
      ctx.lineTo(0, -buildingHeight - height * 0.58);
      ctx.lineTo(buildingWidth * 0.62, -buildingHeight - height * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#55e8ff";
      ctx.fillRect(-buildingWidth * 0.31, -buildingHeight * 0.75 - height * 0.2, buildingWidth * 0.18, buildingHeight * 0.22);
      ctx.fillRect(buildingWidth * 0.13, -buildingHeight * 0.75 - height * 0.2, buildingWidth * 0.18, buildingHeight * 0.22);
      ctx.strokeStyle = "#ffe071";
      ctx.lineWidth = Math.max(2, width * 0.012);
      ctx.beginPath();
      ctx.moveTo(0, height * 0.2);
      ctx.lineTo(0, height * 0.85);
      ctx.stroke();
    } else if (island.id === "rock-island") {
      ctx.fillStyle = "#625c66";
      ctx.beginPath();
      ctx.moveTo(-width * 0.16, -height * 0.05);
      ctx.lineTo(-width * 0.04, -height * 0.75);
      ctx.lineTo(width * 0.18, -height * 0.12);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = "#604822";
      ctx.lineWidth = Math.max(2, width * 0.018);
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.12);
      ctx.lineTo(width * 0.04, -height * 0.82);
      ctx.stroke();
      ctx.fillStyle = "#5fc276";
      for (let index = -2; index <= 2; index += 1) {
        ctx.beginPath();
        ctx.ellipse(
          width * 0.04 + index * width * 0.035,
          -height * 0.8,
          width * 0.12,
          height * 0.12,
          index * 0.35,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    if (projection.depth < 8.5) {
      const label = island.visited && !island.isCorrect ? island.name + " • INTE HÄR" : island.name;
      ctx.font = "1000 " + Math.round(Math.max(11, Math.min(18, width * 0.08))) + "px Trebuchet MS";
      const labelWidth = Math.max(80, ctx.measureText(label).width + 24);
      roundedRect(-labelWidth / 2, -height * 1.35, labelWidth, 30, 10);
      ctx.fillStyle = "rgba(3, 15, 28, 0.9)";
      ctx.fill();
      ctx.strokeStyle = island.isCorrect ? "#ffe071" : "#9fd8df";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = island.isCorrect ? "#fff4b2" : COLORS.white;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, -height * 1.35 + 15);
    }
    ctx.restore();
  }

  function drawSeaMinimap(boatPosition) {
    const x = 904;
    const y = 122;
    const width = 200;
    const height = 128;
    ctx.save();
    roundedRect(x, y, width, height, 16);
    ctx.fillStyle = "rgba(3, 20, 35, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(116, 235, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#d9f8ff";
    ctx.font = "900 11px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("HAVSKARTA", x + width / 2, y + 17);
    state.islands.forEach((island) => {
      const px = x + 16 + island.x / (GRID_WIDTH - 1) * (width - 32);
      const py = y + 25 + island.y / (GRID_HEIGHT - 1) * (height - 38);
      ctx.fillStyle = island.isCorrect ? "#ffe071" : island.color;
      ctx.beginPath();
      ctx.arc(px, py, island.isCorrect ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (island.isCorrect) {
        ctx.strokeStyle = "rgba(255, 224, 113, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 10 + Math.sin(state.visualTime / 240) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    const boatX = x + 16 + boatPosition.x / (GRID_WIDTH - 1) * (width - 32);
    const boatY = y + 25 + boatPosition.y / (GRID_HEIGHT - 1) * (height - 38);
    ctx.fillStyle = "#55e8ff";
    ctx.beginPath();
    ctx.moveTo(boatX, boatY - 8);
    ctx.lineTo(boatX - 6, boatY + 6);
    ctx.lineTo(boatX + 6, boatY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSeaBoat() {
    const moving = state.boat && state.boat.moveAnimMs > 0;
    const bob = Math.sin(state.visualTime / 210) * 5;
    const turn = state.boat
      ? normalizeAngle(Math.atan2(state.boat.facingY, state.boat.facingX) - state.cameraAngle)
      : 0;
    ctx.save();
    ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 45 + bob);
    ctx.rotate(Math.sin(turn) * 0.08);
    if (moving) {
      ctx.strokeStyle = "rgba(220, 252, 255, 0.7)";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-42, -5);
      ctx.quadraticCurveTo(-78, 70, -126, 116);
      ctx.moveTo(42, -5);
      ctx.quadraticCurveTo(78, 70, 126, 116);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0, 9, 17, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 112, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "#55e8ff";
    ctx.shadowBlur = 17;
    ctx.fillStyle = "#c76522";
    ctx.beginPath();
    ctx.moveTo(-104, -18);
    ctx.lineTo(-68, -164);
    ctx.quadraticCurveTo(0, -210, 68, -164);
    ctx.lineTo(104, -18);
    ctx.quadraticCurveTo(0, 25, -104, -18);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#55e8ff";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = "#17394a";
    ctx.beginPath();
    ctx.moveTo(-62, -53);
    ctx.lineTo(-38, -148);
    ctx.quadraticCurveTo(0, -171, 38, -148);
    ctx.lineTo(62, -53);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#091827";
    roundedRect(-50, -142, 100, 43, 15);
    ctx.fill();
    ctx.strokeStyle = "#7df1ff";
    ctx.lineWidth = 3;
    ctx.stroke();

    const playerX = state.deckPlayer ? state.deckPlayer.x * 27 : 0;
    const playerY = state.deckPlayer ? state.deckPlayer.y * 17 : 0;
    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.arc(playerX, -82 + playerY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff1c1";
    ctx.beginPath();
    ctx.arc(playerX, -88 + playerY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#071425";
    ctx.beginPath();
    ctx.arc(playerX + 4, -91 + playerY, 2, 0, Math.PI * 2);
    ctx.fill();

    const seats = state.partyBots.length === 1
      ? [{ x: 48, y: -62 }]
      : [{ x: -52, y: -60 }, { x: 52, y: -60 }];
    state.partyBots.forEach((bot, index) => {
      const seat = seats[index] || { x: 0, y: -55 };
      ctx.fillStyle = bot.bodyColor;
      roundedRect(seat.x - 18, seat.y - 20, 36, 38, 11);
      ctx.fill();
      ctx.strokeStyle = bot.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#d9edf2";
      roundedRect(seat.x - 16, seat.y - 42, 32, 24, 8);
      ctx.fill();
      ctx.fillStyle = "#10263c";
      roundedRect(seat.x - 11, seat.y - 36, 22, 12, 4);
      ctx.fill();
      ctx.fillStyle = "#9ff6ff";
      ctx.beginPath();
      ctx.arc(seat.x + 5, seat.y - 30, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.font = "1000 11px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(bot.name, seat.x, seat.y + 32);
    });
    ctx.restore();
  }

  function drawSeaWorld() {
    if (!state.boat) {
      return;
    }
    const horizon = Math.max(210, Math.min(390, 286 + state.cameraPitch * 240));
    const sky = ctx.createLinearGradient(0, VIEW_TOP, 0, horizon);
    sky.addColorStop(0, "#07172d");
    sky.addColorStop(0.74, "#2d7894");
    sky.addColorStop(1, "#ffd37a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, VIEW_TOP, LOGICAL_WIDTH, horizon - VIEW_TOP);
    ctx.fillStyle = "rgba(255, 240, 176, 0.82)";
    ctx.beginPath();
    ctx.arc(188, horizon - 54, 28, 0, Math.PI * 2);
    ctx.fill();

    const water = ctx.createLinearGradient(0, horizon, 0, LOGICAL_HEIGHT);
    water.addColorStop(0, "#1c7890");
    water.addColorStop(0.45, "#0c4c68");
    water.addColorStop(1, "#031521");
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, LOGICAL_WIDTH, LOGICAL_HEIGHT - horizon);
    ctx.strokeStyle = "rgba(177, 241, 247, 0.26)";
    ctx.lineWidth = 2;
    for (let band = 1; band <= 14; band += 1) {
      const ratio = band / 14;
      const y = horizon + ratio * ratio * (LOGICAL_HEIGHT - horizon);
      const shift = Math.sin(state.visualTime / 310 + band * 1.7) * 42;
      ctx.beginPath();
      for (let x = -80; x <= LOGICAL_WIDTH + 80; x += 82) {
        const px = x + shift + (band % 2) * 31;
        ctx.moveTo(px, y);
        ctx.quadraticCurveTo(px + 22, y - 5 - ratio * 8, px + 48, y);
      }
      ctx.stroke();
    }

    const boatPosition = animationPosition(state.boat, BOAT_MOVE_TIME);
    state.islands
      .map((island) => ({ island, projection: projectSeaIsland(island, boatPosition, horizon) }))
      .filter((item) => item.projection.depth >= -0.4)
      .sort((a, b) => b.projection.depth - a.projection.depth)
      .forEach(({ island, projection }) => drawSeaIsland(island, projection));
    drawSeaMinimap(boatPosition);
    drawSeaBoat();
  }

  function drawPlayRouletteWorld() {
    const play = state.play;
    const roulette = play.roulette;
    const centerX = LOGICAL_WIDTH / 2;
    const centerY = 390;

    const room = ctx.createLinearGradient(0, VIEW_TOP, 0, LOGICAL_HEIGHT);
    room.addColorStop(0, "#271124");
    room.addColorStop(0.45, "#10233b");
    room.addColorStop(1, "#050914");
    ctx.fillStyle = room;
    ctx.fillRect(0, VIEW_TOP, LOGICAL_WIDTH, LOGICAL_HEIGHT - VIEW_TOP);

    ctx.strokeStyle = "rgba(255, 62, 88, 0.2)";
    ctx.lineWidth = 2;
    for (let lane = -7; lane <= 7; lane += 1) {
      ctx.beginPath();
      ctx.moveTo(centerX + lane * 34, 315);
      ctx.lineTo(centerX + lane * 98, LOGICAL_HEIGHT);
      ctx.stroke();
    }
    for (let ring = 0; ring < 7; ring += 1) {
      const y = 330 + ring * ring * 8.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(LOGICAL_WIDTH, y);
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = "#ff3e58";
    ctx.shadowBlur = 34;
    ctx.fillStyle = "rgba(42, 9, 24, 0.92)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 272, 126, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = "#7c2038";
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 7, 238, 96, 0, 0, Math.PI * 2);
    const tableGlow = ctx.createRadialGradient(centerX, centerY - 12, 20, centerX, centerY, 248);
    tableGlow.addColorStop(0, "#53213a");
    tableGlow.addColorStop(1, "#160a19");
    ctx.fillStyle = tableGlow;
    ctx.fill();
    ctx.restore();

    const actors = getPlayActors()
      .map((actor) => {
        const seat = actor.id === "player" ? 0 : actor.rouletteSeat;
        const angle = Math.PI / 2 + seat * Math.PI * 2 / 10;
        return {
          actor,
          angle,
          x: centerX + Math.cos(angle) * 350,
          y: centerY + Math.sin(angle) * 205,
        };
      })
      .sort((a, b) => a.y - b.y);

    actors.forEach(({ actor, angle, x, y }) => {
      const frontness = (Math.sin(angle) + 1) / 2;
      const scale = 0.72 + frontness * 0.5;
      const selected = roulette.revealed && actor.id === play.monsterId;
      const color = selected ? COLORS.red : actor.color;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.shadowColor = color;
      ctx.shadowBlur = selected ? 30 : 10;
      ctx.fillStyle = selected ? "#4d1322" : actor.bodyColor;
      roundedRect(-31, -52, 62, 64, 18);
      ctx.fill();
      ctx.lineWidth = selected ? 6 : 3;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = actor.id === "player" ? "#f1b26b" : "#d9edf2";
      if (actor.id === "player") {
        ctx.beginPath();
        ctx.arc(0, -76, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#17283b";
        ctx.beginPath();
        ctx.arc(-8, -79, 3, 0, Math.PI * 2);
        ctx.arc(8, -79, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        roundedRect(-27, -103, 54, 39, 12);
        ctx.fill();
        ctx.fillStyle = "#10263c";
        roundedRect(-20, -96, 40, 24, 7);
        ctx.fill();
        ctx.fillStyle = selected ? "#fff4c2" : "#9ff6ff";
        ctx.beginPath();
        ctx.arc(-8, -84, 3.5, 0, Math.PI * 2);
        ctx.arc(8, -84, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (selected) {
        ctx.fillStyle = COLORS.red;
        ctx.beginPath();
        ctx.moveTo(-22, -100);
        ctx.lineTo(-9, -130);
        ctx.lineTo(0, -99);
        ctx.moveTo(22, -100);
        ctx.lineTo(9, -130);
        ctx.lineTo(0, -99);
        ctx.fill();
      }
      ctx.font = "1000 15px Trebuchet MS";
      const label = selected ? actor.name + " • MONSTER" : actor.name;
      const labelWidth = Math.max(68, ctx.measureText(label).width + 20);
      roundedRect(-labelWidth / 2, 20, labelWidth, 28, 9);
      ctx.fillStyle = "rgba(3, 11, 24, 0.94)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = selected ? "#fff4f6" : color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 34);
      ctx.restore();
    });

    ctx.save();
    ctx.translate(centerX, centerY - 8);
    ctx.rotate(roulette.arrowAngle);
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 24;
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.moveTo(205, 0);
    ctx.lineTo(150, -25);
    ctx.lineTo(161, -7);
    ctx.lineTo(-35, -7);
    ctx.lineTo(-35, 7);
    ctx.lineTo(161, 7);
    ctx.lineTo(150, 25);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff4f6";
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = roulette.revealed ? COLORS.red : "#ffb2be";
    ctx.font = "1000 24px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(
      roulette.revealed ? "MONSTRET ÄR VALT!" : "DEN RÖDA PILEN SNURRAR...",
      centerX,
      120
    );
  }

  function drawThirdPersonWorld() {
    if (!state.player) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, VIEW_TOP, LOGICAL_WIDTH, LOGICAL_HEIGHT - VIEW_TOP);
    ctx.clip();

    const camera = getThirdPersonCamera();
    drawThirdPersonBackdrop(camera);
    const world = drawRaycastWalls(camera);
    drawThirdPersonShadows(camera, world.zBuffer);
    drawThirdPersonLobbyBots(camera, world.zBuffer);
    drawThirdPersonPlayKey(camera, world.zBuffer);
    drawThirdPersonPlayBots(camera, world.zBuffer);
    drawThirdPersonHotelKey(camera, world.zBuffer);
    drawThirdPersonPartyBots(camera, world.zBuffer);
    drawThirdPersonFlashlight(camera);
    drawVisibleDoorSigns(world.visibleDoorSurfaces);
    drawThirdPersonFocus(camera);
    drawThirdPersonSonar(camera);
    ctx.restore();
  }

  function drawShadow(shadow) {
    const position = animationPosition(shadow, 180);
    const x = gridToPixelX(position.x);
    const y = gridToPixelY(position.y);
    const bob = Math.sin((state.visualTime + shadow.id * 170) / 150) * 2.5;
    const frozen = state.sonar.activeMs > 0;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.shadowColor = frozen ? COLORS.cyan : "#7b38d1";
    ctx.shadowBlur = frozen ? 20 : 16;
    ctx.fillStyle = frozen ? "#237692" : "#39215f";
    ctx.beginPath();
    ctx.moveTo(-19, 17);
    ctx.quadraticCurveTo(-26, 1, -14, -17);
    ctx.quadraticCurveTo(0, -28, 14, -17);
    ctx.quadraticCurveTo(26, 0, 19, 17);
    ctx.quadraticCurveTo(11, 11, 5, 18);
    ctx.quadraticCurveTo(-2, 11, -8, 18);
    ctx.quadraticCurveTo(-14, 11, -19, 17);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = frozen ? COLORS.white : "#ffed8a";
    ctx.beginPath();
    ctx.ellipse(-7, -5, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(7, -5, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.arc(-6, -4, 2, 0, Math.PI * 2);
    ctx.arc(8, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    if (frozen) {
      ctx.strokeStyle = "rgba(172, 249, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-24, -22);
      ctx.lineTo(24, 22);
      ctx.moveTo(20, -24);
      ctx.lineTo(-20, 23);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer() {
    if (!state.player) {
      return;
    }
    if (
      state.invulnerableMs > 0 &&
      Math.floor(state.invulnerableMs / 90) % 2 === 0
    ) {
      return;
    }

    const position = animationPosition(state.player, MOVE_TIME);
    const x = gridToPixelX(position.x);
    const y = gridToPixelY(position.y);
    const facingX = state.player.facingX;
    const facingY = state.player.facingY;
    const bounce = state.player.moveAnimMs > 0
      ? Math.sin((1 - state.player.moveAnimMs / MOVE_TIME) * Math.PI) * 5
      : 0;

    ctx.save();
    ctx.translate(x, y - bounce);

    const beam = ctx.createLinearGradient(0, 0, facingX * 42, facingY * 42);
    beam.addColorStop(0, "rgba(255, 239, 150, 0.36)");
    beam.addColorStop(1, "rgba(255, 239, 150, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    const sideX = facingY * 13;
    const sideY = -facingX * 13;
    ctx.moveTo(sideX, sideY);
    ctx.lineTo(facingX * 43, facingY * 43);
    ctx.lineTo(-sideX, -sideY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(4, 14, 25, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 17, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = COLORS.orange;
    ctx.shadowBlur = 13;
    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#8f5317";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#fff2c4";
    ctx.beginPath();
    ctx.arc(facingX * 5, facingY * 5 - 1, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    const eyeSideX = facingY * 4;
    const eyeSideY = -facingX * 4;
    ctx.beginPath();
    ctx.arc(facingX * 7 + eyeSideX, facingY * 7 + eyeSideY - 1, 2.1, 0, Math.PI * 2);
    ctx.arc(facingX * 7 - eyeSideX, facingY * 7 - eyeSideY - 1, 2.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.arc(-facingY * 17, facingX * 17, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSonar() {
    if (state.scene !== "maze" || state.sonar.activeMs <= 0 || !state.player) {
      return;
    }
    const position = animationPosition(state.player, MOVE_TIME);
    const x = gridToPixelX(position.x);
    const y = gridToPixelY(position.y);
    const progress = Math.min(1, state.sonar.elapsedMs / SONAR_DURATION);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 3; i += 1) {
      const localProgress = (progress + i * 0.24) % 1;
      const radius = 30 + localProgress * 850;
      ctx.globalAlpha = (1 - localProgress) * 0.48;
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 7 - localProgress * 4;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    const realDoor = state.doors.find((door) => door.isReal);
    if (realDoor) {
      const dx = gridToPixelX(realDoor.x) - x;
      const dy = gridToPixelY(realDoor.y) - y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = dx / length;
      const ny = dy / length;
      ctx.save();
      ctx.translate(x + nx * 34, y + ny * 34);
      ctx.rotate(Math.atan2(ny, nx));
      ctx.fillStyle = COLORS.lime;
      ctx.shadowColor = COLORS.lime;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-7, -9);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function burstAt(gridX, gridY, color, amount) {
    const originX = LOGICAL_WIDTH / 2;
    const originY = LOGICAL_HEIGHT - 112;
    for (let i = 0; i < amount; i += 1) {
      const angle = (i / amount) * Math.PI * 2 + (i % 3) * 0.16;
      const speed = 42 + (i * 17) % 95;
      state.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifeMs: 420 + (i * 37) % 360,
        maxLifeMs: 780,
        color,
        size: 2 + (i % 4),
      });
    }
  }

  function createConfetti() {
    const colors = [COLORS.cyan, COLORS.lime, COLORS.pink, "#ffe36b", COLORS.white];
    state.confetti = [];
    for (let i = 0; i < 90; i += 1) {
      state.confetti.push({
        x: (i * 83) % LOGICAL_WIDTH,
        y: -20 - ((i * 41) % LOGICAL_HEIGHT),
        speed: 58 + (i * 13) % 110,
        phase: i * 71,
        rotation: i,
        spin: -3 + (i % 7),
        color: colors[i % colors.length],
        width: 5 + (i % 5),
        height: 9 + (i % 7),
      });
    }
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.lifeMs / particle.maxLifeMs);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    });
    ctx.globalAlpha = 1;

    state.confetti.forEach((particle) => {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        -particle.width / 2,
        -particle.height / 2,
        particle.width,
        particle.height
      );
      ctx.restore();
    });
  }

  function drawMessage() {
    const persistentHelperMessage =
      state.partyBots.length > 0 && (state.scene === "hotel" || state.scene === "maze")
        ? state.partyBots.map((bot) => bot.name + ": " + bot.roleLabel).join("  •  ")
        : "";
    const transientMessage = state.messageMs > 0 && state.message ? state.message : "";
    const message = transientMessage || persistentHelperMessage;
    if (!message) {
      return;
    }
    const alpha = transientMessage ? Math.min(1, state.messageMs / 260) : 0.92;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "1000 " + (transientMessage ? 16 : 18) + "px Trebuchet MS";
    const width = Math.min(transientMessage ? 520 : 680, ctx.measureText(message).width + 54);
    const x = (LOGICAL_WIDTH - width) / 2;
    roundedRect(x, 84, width, 34, 12);
    ctx.fillStyle = "rgba(4, 15, 29, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(92, 235, 255, 0.68)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.fillText(message, LOGICAL_WIDTH / 2, 107);
    ctx.restore();
  }

  function drawLevelBanner() {
    if (state.levelBannerMs <= 0) {
      return;
    }
    const fadeIn = Math.min(1, (LEVEL_BANNER_DURATION - state.levelBannerMs) / 220);
    const fadeOut = Math.min(1, state.levelBannerMs / 350);
    ctx.save();
    ctx.globalAlpha = Math.min(fadeIn, fadeOut) * 0.96;
    roundedRect(325, 302, 490, 120, 24);
    ctx.fillStyle = "rgba(5, 17, 34, 0.9)";
    ctx.fill();
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.cyan;
    ctx.font = "900 13px Trebuchet MS";
    ctx.fillText("VÅNING " + (state.levelIndex + 1), 570, 336);
    ctx.fillStyle = COLORS.white;
    ctx.font = "1000 29px Trebuchet MS";
    ctx.fillText(LEVELS[state.levelIndex].name, 570, 371);
    ctx.fillStyle = "#bed0d8";
    ctx.font = "700 14px Trebuchet MS";
    ctx.fillText(LEVELS[state.levelIndex].subtitle, 570, 397);
    ctx.restore();
  }

  function drawVignette() {
    const vignette = ctx.createRadialGradient(
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2,
      220,
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2,
      700
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.72, "rgba(0, 4, 12, 0.08)");
    vignette.addColorStop(1, "rgba(0, 4, 12, 0.48)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 76, LOGICAL_WIDTH, LOGICAL_HEIGHT - 76);
  }

  function drawTransition() {
    if (state.mode !== "transition") {
      return;
    }
    const progress = 1 - Math.max(0, state.transitionMs) / 1450;
    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.82;
    ctx.fillStyle = COLORS.lime;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.globalAlpha = Math.min(1, progress * 2.5);
    ctx.fillStyle = COLORS.ink;
    ctx.font = "1000 48px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(
      state.levelIndex === LEVELS.length - 1 ? "DU ÄR UTE!" : "NÄSTA VÅNING",
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2
    );
    ctx.restore();
  }

  function render() {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    drawBackground();
    drawHud();

    const shakeAmount = state.shakeMs > 0
      ? Math.sin(state.visualTime * 0.17) * (state.shakeMs / 430) * 9
      : 0;
    const bumpAmount = state.bumpMs > 0
      ? Math.sin(state.visualTime * 0.3) * 2
      : 0;

    ctx.save();
    ctx.translate(shakeAmount + bumpAmount, -shakeAmount * 0.35);
    if (state.scene === "sea") {
      drawSeaWorld();
    } else if (state.scene === "play" && state.play && state.play.phase === "roulette") {
      drawPlayRouletteWorld();
    } else {
      drawThirdPersonWorld();
    }
    drawParticles();
    ctx.restore();

    drawVignette();
    if (
      state.scene !== "sea" &&
      !(state.scene === "play" && state.play && state.play.phase === "roulette")
    ) {
      drawThirdPersonAvatar();
    }
    if (!(state.scene === "play" && state.play && state.play.phase === "roulette")) {
      drawMessage();
    }
    drawLevelBanner();
    drawTransition();

    if (state.flashMs > 0) {
      ctx.globalAlpha = Math.min(0.42, state.flashMs / 900);
      ctx.fillStyle = state.mode === "transition" ? COLORS.lime : COLORS.pink;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.globalAlpha = 1;
    }
  }

  function resizeCanvas() {
    pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(LOGICAL_WIDTH * pixelRatio);
    canvas.height = Math.round(LOGICAL_HEIGHT * pixelRatio);
    render();
  }

  function initAudio() {
    if (!state.soundOn) {
      return;
    }
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
  }

  function tone(frequency, duration, type, volume, delay, endFrequency) {
    if (!state.soundOn || !audioContext) {
      return;
    }
    const startAt = audioContext.currentTime + (delay || 0);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
    }
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume || 0.06, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  function playSound(name) {
    if (!state.soundOn) {
      return;
    }
    if (name === "step") {
      tone(95, 0.045, "triangle", 0.018);
    } else if (name === "boat") {
      tone(118, 0.11, "sawtooth", 0.022, 0, 92);
      tone(240, 0.07, "triangle", 0.016, 0.03, 180);
    } else if (name === "key") {
      tone(740, 0.18, "triangle", 0.065);
      tone(1110, 0.3, "sine", 0.055, 0.1);
    } else if (name === "bump") {
      tone(85, 0.07, "square", 0.025);
    } else if (name === "sonar") {
      tone(440, 0.42, "sine", 0.1, 0, 980);
      tone(880, 0.32, "sine", 0.045, 0.12, 1320);
    } else if (name === "wrongDoor") {
      tone(180, 0.35, "sawtooth", 0.055, 0, 78);
    } else if (name === "hurt") {
      tone(130, 0.28, "square", 0.05, 0, 65);
    } else if (name === "rightDoor") {
      tone(520, 0.24, "triangle", 0.07);
      tone(680, 0.24, "triangle", 0.07, 0.12);
      tone(920, 0.36, "triangle", 0.08, 0.24);
    } else if (name === "start") {
      tone(260, 0.2, "triangle", 0.05);
      tone(390, 0.25, "triangle", 0.05, 0.12);
    } else if (name === "gameover") {
      tone(210, 0.36, "sawtooth", 0.05, 0, 120);
      tone(120, 0.48, "triangle", 0.05, 0.28, 70);
    } else if (name === "victory") {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone(frequency, 0.42, "triangle", 0.065, index * 0.13);
      });
    }
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    soundButton.textContent = state.soundOn ? "🔊" : "🔇";
    if (state.soundOn) {
      initAudio();
      tone(620, 0.14, "sine", 0.05);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (gameFrame.requestFullscreen) {
        gameFrame.requestFullscreen().catch(() => {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function handleKeyDown(event) {
    const direction = directionFromCode(event.code);
    if (direction) {
      event.preventDefault();
      pressDirection(event.code);
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) {
        activateSonar();
      }
    } else if (event.code === "KeyB") {
      event.preventDefault();
      if (!event.repeat) {
        toggleBoatControl();
      }
    } else if (event.code === "KeyP") {
      if (!event.repeat) {
        togglePause();
      }
    } else if (event.code === "KeyF") {
      if (!event.repeat) {
        toggleFullscreen();
      }
    } else if (event.code === "Escape") {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (!event.repeat) {
        togglePause();
      }
    } else if (event.code === "Enter") {
      if (state.mode === "start" || state.mode === "gameover" || state.mode === "victory") {
        startRun();
      } else if (state.mode === "paused") {
        resumeGame();
      }
    }
  }

  function handleKeyUp(event) {
    if (directionFromCode(event.code)) {
      releaseDirection(event.code);
    }
  }

  function setupTouchControls() {
    document.querySelectorAll("[data-key]").forEach((button) => {
      const code = button.dataset.key;
      const release = (event) => {
        event.preventDefault();
        releaseDirection(code);
        button.classList.remove("active");
      };
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        initAudio();
        button.setPointerCapture(event.pointerId);
        button.classList.add("active");
        pressDirection(code);
      });
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", () => {
        releaseDirection(code);
        button.classList.remove("active");
      });
    });

    const searchButton = document.getElementById("touch-search");
    searchButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      initAudio();
      searchButton.classList.add("active");
      activateSonar();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      searchButton.addEventListener(eventName, () => {
        searchButton.classList.remove("active");
      });
    });
  }

  function beginCameraDrag(event) {
    if (
      cameraPointer.active ||
      !state.player ||
      (state.mode !== "playing" && state.mode !== "transition") ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    event.preventDefault();
    canvas.focus();
    cameraPointer.active = true;
    cameraPointer.pointerId = event.pointerId;
    cameraPointer.lastX = event.clientX;
    cameraPointer.lastY = event.clientY;
    cameraPointer.totalDistance = 0;
    canvas.classList.add("camera-dragging");
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // Synthetic pointer tests may not create a capturable native pointer.
    }
  }

  function moveCameraDrag(event) {
    if (!cameraPointer.active || event.pointerId !== cameraPointer.pointerId) {
      return;
    }
    event.preventDefault();
    const deltaX = event.clientX - cameraPointer.lastX;
    const deltaY = event.clientY - cameraPointer.lastY;
    cameraPointer.lastX = event.clientX;
    cameraPointer.lastY = event.clientY;
    cameraPointer.totalDistance += Math.hypot(deltaX, deltaY);

    const bounds = canvas.getBoundingClientRect();
    const logicalDeltaX = deltaX * LOGICAL_WIDTH / Math.max(1, bounds.width);
    const logicalDeltaY = deltaY * LOGICAL_HEIGHT / Math.max(1, bounds.height);
    state.cameraTargetAngle = normalizeAngle(
      state.cameraTargetAngle - logicalDeltaX * 0.0044
    );
    state.cameraTargetPitch = Math.max(
      CAMERA_MIN_PITCH,
      Math.min(CAMERA_MAX_PITCH, state.cameraTargetPitch + logicalDeltaY * 0.0011)
    );
  }

  function endCameraDrag(event) {
    if (!cameraPointer.active || event.pointerId !== cameraPointer.pointerId) {
      return;
    }
    event.preventDefault();
    cancelCameraDrag();
  }

  function cancelCameraDrag() {
    if (!cameraPointer.active) {
      canvas.classList.remove("camera-dragging");
      return;
    }
    const pointerId = cameraPointer.pointerId;
    cameraPointer.active = false;
    cameraPointer.pointerId = null;
    canvas.classList.remove("camera-dragging");
    try {
      if (canvas.hasPointerCapture(pointerId)) {
        canvas.releasePointerCapture(pointerId);
      }
    } catch (error) {
      // The pointer may already have been released by the browser.
    }
  }

  function renderGameToText() {
    const sonarActive = state.sonar.activeMs > 0;
    const movementBasis = cameraMovementBasis();
    const objective = state.scene === "lobby"
      ? "chooseMode"
      : state.scene === "play"
        ? !state.play || state.play.phase === "roulette"
          ? "waitForArrow"
          : state.play.phase === "result"
            ? state.play.result + "Won"
            : state.play.playerRole === "monster"
              ? "catchAllSurvivors"
              : state.play.key && state.play.key.collected
                ? "unlockCorrectPlayDoor"
                : "findPlayKey"
      : state.scene === "sea"
        ? "sailToHotelIsland"
        : state.scene === "hotel"
          ? state.inventory.hotelKey ? "openCorrectHotelDoor" : "findHotelKey"
          : "findExit";
    const payload = {
      coordinateSystem: state.scene === "sea"
        ? "Sea grid: origin is top-left; x increases east/right and y increases south/down. Deck coordinates range from -1 to 1."
        : "Grid coordinates: origin (0,0) is the top-left tile; x increases right and y increases down.",
      camera: {
        mode: "thirdPersonOrbit",
        fovDegrees: CAMERA_FOV_DEGREES,
        facingAngleDegrees: Math.round(state.cameraAngle * 180 / Math.PI),
        targetAngleDegrees: Math.round(state.cameraTargetAngle * 180 / Math.PI),
        pitchDegrees: Math.round(state.cameraPitch * 180 / Math.PI),
        targetPitchDegrees: Math.round(state.cameraTargetPitch * 180 / Math.PI),
        orbitDegrees: state.player
          ? Math.round(normalizeAngle(
              state.cameraAngle - Math.atan2(state.player.facingY, state.player.facingX)
            ) * 180 / Math.PI)
          : 0,
        avatarView: avatarViewFromAngles(),
        dragging: cameraPointer.active,
        gesture: "Drag the canvas horizontally to orbit and vertically to look up or down.",
      },
      controls: {
        movement: "cameraRelative",
        forward: movementBasis.forward,
        right: movementBasis.right,
        activeTarget: state.scene === "sea" ? state.controlTarget : "player",
        canToggleBoatControl: state.scene === "sea",
        toggleLabel: state.scene === "sea" ? "BÅTSTYRNING" : null,
      },
      mode: state.mode,
      scene: state.scene,
      playMode: state.playMode,
      objective: { id: objective },
      level: state.scene === "maze" ? state.levelIndex + 1 : null,
      levelName: state.scene === "maze"
        ? LEVELS[state.levelIndex].name
        : state.scene === "play"
          ? "PLAY"
        : state.scene === "sea"
          ? "STORT HAV"
          : state.scene === "hotel"
            ? "Ö-HOTELLET"
            : "START ROOM",
      mapRows: state.map,
      player: state.player
        ? {
            x: state.player.x,
            y: state.player.y,
            facingX: state.player.facingX,
            facingY: state.player.facingY,
            role: state.scene === "play" ? state.player.role : null,
            status: state.scene === "play" ? state.player.status : "active",
            invulnerableMs: Math.round(state.invulnerableMs),
          }
        : null,
      start: state.start,
      hearts: state.hearts,
      mistakes: state.mistakes,
      elapsedMs: Math.round(state.elapsedMs),
      sonar: {
        active: sonarActive,
        remainingMs: Math.round(state.sonar.activeMs),
        cooldownMs: Math.round(state.sonar.cooldownMs),
        doorsRevealed: sonarActive,
      },
      doors: state.doors.map((door) => ({
        x: door.x,
        y: door.y,
        isReal: door.isReal,
        id: door.id || null,
        label: door.label || "EXIT",
        locked: state.scene === "hotel"
          ? !state.inventory.hotelKey
          : state.scene === "play" && state.play
            ? !state.play.key || !state.play.key.collected
            : false,
        opened: Boolean(door.opened),
        visibleLabel: state.scene === "play" && state.play
          ? state.play.correctDoorKnown && door.isReal ? "RÄTT DÖRR" : door.label
          : state.scene === "hotel"
          ? door.label
          : sonarActive
            ? door.isReal ? "YES" : "NO"
            : state.partyAssistance.correctExit &&
                state.partyAssistance.correctExit.x === door.x &&
                state.partyAssistance.correctExit.y === door.y
              ? "RÄTT EXIT"
              : state.partyAssistance.warnedWrongExit &&
                  state.partyAssistance.warnedWrongExit.x === door.x &&
                  state.partyAssistance.warnedWrongExit.y === door.y
                ? "FEL DÖRR"
                : "EXIT",
      })),
      lobbyDoors: state.lobbyDoors.map((door) => ({
        x: door.x,
        y: door.y,
        label: door.label,
        mode: door.mode,
        available: door.available,
      })),
      lobbyParty: state.scene === "lobby"
        ? {
            playerCount: state.player ? 1 : 0,
            botCount: state.lobbyBots.length,
            totalCount: (state.player ? 1 : 0) + state.lobbyBots.length,
          }
        : null,
      lobbyBots: state.lobbyBots.map((bot) => ({
        id: bot.id,
        name: bot.name,
        targetMode: bot.targetMode,
        targetX: bot.targetX,
        targetY: bot.targetY,
        x: Math.round(bot.x * 100) / 100,
        y: Math.round(bot.y * 100) / 100,
        fromX: Math.round(bot.fromX * 100) / 100,
        fromY: Math.round(bot.fromY * 100) / 100,
        facingX: Math.round(bot.facingX * 100) / 100,
        facingY: Math.round(bot.facingY * 100) / 100,
        status: bot.status,
        remainingPathSteps: Math.max(0, bot.path.length - bot.pathIndex),
        moveRemainingMs: Math.round(bot.moveAnimMs),
        waitRemainingMs: Math.round(bot.waitMs),
      })),
      party: {
        behavior: state.partyBots.length > 0 ? "independentHelpers" : "solo",
        followsPlayer: false,
        expectedSize: 1 + state.partyBots.length,
        memberIds: ["player", ...state.partyBots.map((bot) => bot.id)],
        assistance: { ...state.partyAssistance },
        companions: state.partyBots.map((bot) => ({
          id: bot.id,
          name: bot.name,
          status: bot.status,
          roleLabel: bot.roleLabel,
          helperTask: bot.helperTask,
          helperTarget: bot.helperTarget ? { ...bot.helperTarget } : null,
          helperStation: bot.helperStation ? { ...bot.helperStation } : null,
          pathRemaining: Math.max(0, bot.helperPath.length - bot.helperPathIndex),
          arrived: Boolean(bot.arrivalStatus && bot.status === bot.arrivalStatus),
          followsPlayer: false,
          x: Math.round(bot.x * 100) / 100,
          y: Math.round(bot.y * 100) / 100,
          facingX: Math.round(bot.facingX * 100) / 100,
          facingY: Math.round(bot.facingY * 100) / 100,
          moveRemainingMs: Math.round(bot.moveAnimMs),
          onBoat: state.scene === "sea",
        })),
      },
      boat: state.boat
        ? {
            x: state.boat.x,
            y: state.boat.y,
            fromX: state.boat.fromX,
            fromY: state.boat.fromY,
            facingX: state.boat.facingX,
            facingY: state.boat.facingY,
            moveRemainingMs: Math.round(state.boat.moveAnimMs),
            dockedAtIslandId: state.boat.dockedAtIslandId,
            deckPlayer: state.deckPlayer ? { ...state.deckPlayer } : null,
          }
        : null,
      islands: state.islands.map((island) => ({
        id: island.id,
        name: island.name,
        dockX: island.dockX,
        dockY: island.dockY,
        isCorrect: island.isCorrect,
        hasHotel: island.hasHotel,
        visited: island.visited,
        distance: state.boat
          ? Math.round(Math.hypot(island.dockX - state.boat.x, island.dockY - state.boat.y) * 100) / 100
          : null,
      })),
      inventory: {
        hotelKey: state.inventory.hotelKey,
        keyCount: state.inventory.hotelKey ? 1 : 0,
      },
      hotel: state.hotel
        ? {
            correctDoorId: state.hotel.correctDoorId,
            key: { ...state.hotel.key },
            wrongDoorAttempts: state.hotel.wrongDoorAttempts,
            doors: state.hotel.doors.map((door) => ({
              id: door.id,
              label: door.label,
              x: door.x,
              y: door.y,
              isCorrect: door.isReal,
              locked: !state.inventory.hotelKey,
              opened: Boolean(door.opened),
            })),
          }
        : null,
      play: state.play
        ? {
            phase: state.play.phase,
            arrowAngleDeg: state.play.roulette
              ? Math.round(
                  (((state.play.roulette.arrowAngle * 180 / Math.PI) % 360) + 360) % 360
                )
              : null,
            arrowSpinning: Boolean(
              state.play.phase === "roulette" && !state.play.roulette.revealed
            ),
            table: { x: 9, y: 5 },
            monsterId: state.play.monsterId,
            playerRole: state.play.playerRole,
            participants: getPlayActors().map((actor) => ({
              id: actor.id,
              name: actor.name,
              x: Math.round(actor.x * 100) / 100,
              y: Math.round(actor.y * 100) / 100,
              role: state.play.monsterId ? actor.role : "unknown",
              status: actor.status,
              helperTask: actor.role === "survivor" ? actor.task : null,
              helperTarget: actor.task === "find-key" && state.play.key
                ? { type: "key", x: state.play.key.x, y: state.play.key.y }
                : actor.task === "find-door" || actor.task === "unlock-door"
                  ? {
                      type: "door",
                      id: state.play.correctDoorId,
                    }
                  : null,
              followsPlayer: false,
            })),
            key: state.play.key
              ? {
                  x: state.play.key.x,
                  y: state.play.key.y,
                  holderId: state.play.key.collectedById,
                  collected: state.play.key.collected,
                }
              : {
                  x: null,
                  y: null,
                  holderId: null,
                  collected: false,
                },
            correctDoorId: state.play.correctDoorId,
            correctDoorKnown: state.play.correctDoorKnown,
            doors: state.doors.map((door) => ({
              id: door.id,
              x: door.x,
              y: door.y,
              isCorrect: door.isReal,
              locked: !state.play.key || !state.play.key.collected,
              opened: Boolean(door.opened),
            })),
            survivors: {
              activeIds: state.play.phase === "roulette"
                ? []
                : getActivePlaySurvivors().map((actor) => actor.id),
              caughtIds: state.play.caughtIds.slice(),
            },
            monsterFrozen: state.play.monsterFrozen,
            monsterReleaseMs: Math.round(state.play.monsterReleaseMs),
            result: state.play.result,
          }
        : null,
      adventure: { ...state.adventure },
      shadows: state.shadows.map((shadow) => ({
        x: shadow.x,
        y: shadow.y,
        spawnX: shadow.spawnX,
        spawnY: shadow.spawnY,
        frozen: sonarActive,
        nextMoveMs: Math.round(shadow.moveTimerMs),
      })),
      message: state.messageMs > 0 ? state.message : "",
    };
    return JSON.stringify(payload);
  }

  function forcePlayMonsterForTest(id) {
    const validIds = ["player", ...PLAY_BOT_ROSTER.map((bot) => bot.id)];
    if (!validIds.includes(id)) {
      return false;
    }
    forcedPlayMonsterId = id;
    if (state.scene === "play" && state.play && state.play.phase === "roulette") {
      configurePlayRouletteTarget(id);
    }
    return true;
  }

  function startPlayHuntForTest() {
    if (!state.play || state.scene !== "play") {
      return false;
    }
    if (state.play.phase === "roulette" && !state.play.monsterId) {
      revealPlayMonster();
    }
    const started = beginPlayHunt();
    render();
    return started;
  }

  function setPlayPositionsForTest(specification) {
    if (!state.play || state.play.phase !== "hunt" || !specification) {
      return false;
    }
    const moveDirectly = (actor, position) => {
      if (!actor || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
        return;
      }
      actor.x = position.x;
      actor.y = position.y;
      actor.fromX = position.x;
      actor.fromY = position.y;
      actor.moveAnimMs = 0;
    };

    moveDirectly(state.player, specification.player);
    if (specification.bots && typeof specification.bots === "object") {
      Object.entries(specification.bots).forEach(([id, position]) => {
        moveDirectly(getPlayActor(id), position);
      });
    }
    if (Array.isArray(specification.participants)) {
      specification.participants.forEach((position) => {
        moveDirectly(getPlayActor(position.id), position);
      });
    }
    if (specification.monster) {
      moveDirectly(getPlayMonster(), specification.monster);
    }
    if (
      specification.key &&
      Number.isFinite(specification.key.x) &&
      Number.isFinite(specification.key.y) &&
      state.play.key
    ) {
      if (!state.play.key.collected) {
        const oldCell = cellAt(state.play.key.x, state.play.key.y);
        if (oldCell === "K") {
          setMapCell(state.play.key.x, state.play.key.y, ".");
        }
        state.play.key.x = specification.key.x;
        state.play.key.y = specification.key.y;
        const targetCell = cellAt(state.play.key.x, state.play.key.y);
        if (targetCell !== "#" && targetCell !== "E" && targetCell !== "F") {
          setMapCell(state.play.key.x, state.play.key.y, "K");
        }
      }
    }
    getActivePlaySurvivors().forEach((survivor) => {
      if (
        state.play.key &&
        !state.play.key.collected &&
        survivor.x === state.play.key.x &&
        survivor.y === state.play.key.y
      ) {
        collectPlayKey(survivor);
      }
    });
    checkPlayCatches();
    render();
    return true;
  }

  function setMonsterFrozenForTest(frozen) {
    if (!state.play) {
      return false;
    }
    state.play.monsterFrozen = Boolean(frozen);
    return state.play.monsterFrozen;
  }

  function gameLoop(now) {
    const dt = now - lastFrameTime;
    lastFrameTime = now;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  document.getElementById("start-btn").addEventListener("click", startRun);
  document.getElementById("resume-btn").addEventListener("click", resumeGame);
  document.getElementById("retry-btn").addEventListener("click", retryRun);
  document.getElementById("replay-btn").addEventListener("click", startRun);
  pauseButton.addEventListener("click", togglePause);
  soundButton.addEventListener("click", toggleSound);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  boatControlButton.addEventListener("click", () => {
    initAudio();
    toggleBoatControl();
    canvas.focus();
  });
  canvas.addEventListener("pointerdown", beginCameraDrag, { passive: false });
  canvas.addEventListener("pointermove", moveCameraDrag, { passive: false });
  canvas.addEventListener("pointerup", endCameraDrag, { passive: false });
  canvas.addEventListener("pointercancel", endCameraDrag, { passive: false });
  canvas.addEventListener("lostpointercapture", cancelCameraDrag);
  window.addEventListener("keydown", handleKeyDown, { passive: false });
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("fullscreenchange", resizeCanvas);
  window.addEventListener("blur", () => {
    clearHeldInput();
    if (state.mode === "playing") {
      pauseGame();
    }
  });

  if (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  ) {
    document.body.classList.add("touch");
  }

  setupTouchControls();
  validateLevels();
  loadLobby();
  state.mode = "start";
  state.levelBannerMs = 0;
  resizeCanvas();

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    const totalMs = Math.max(0, Number(ms) || 0);
    const steps = Math.max(1, Math.ceil(totalMs / (1000 / 60)));
    const stepMs = steps > 0 ? totalMs / steps : 0;
    for (let index = 0; index < steps; index += 1) {
      update(stepMs);
    }
    render();
  };
  window.__whereIsExitTest = {
    forcePlayMonster: forcePlayMonsterForTest,
    startPlayHunt: startPlayHuntForTest,
    setPlayPositions: setPlayPositionsForTest,
    setMonsterFrozen: setMonsterFrozenForTest,
  };

  requestAnimationFrame(gameLoop);
})();
