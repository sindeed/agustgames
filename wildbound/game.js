(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var frameElement = document.getElementById("game-frame");
  var startScreen = document.getElementById("start-screen");
  var startButton = document.getElementById("start-button");
  var loadingNote = document.getElementById("loading-note");
  var hud = document.getElementById("hud");
  var heartsElement = document.getElementById("hearts");
  var staminaFill = document.getElementById("stamina-fill");
  var objectiveElement = document.getElementById("objective");
  var regionElement = document.getElementById("region-name");
  var bossHud = document.getElementById("boss-hud");
  var bossName = document.getElementById("boss-name");
  var bossHealthFill = document.getElementById("boss-health-fill");
  var promptElement = document.getElementById("interaction-prompt");
  var minimapCanvas = document.getElementById("minimap");
  var minimapContext = minimapCanvas.getContext("2d");
  var pauseButton = document.getElementById("pause-button");
  var mapButton = document.getElementById("map-button");
  var mapOverlay = document.getElementById("map-overlay");
  var worldMapCanvas = document.getElementById("world-map-canvas");
  var worldMapContext = worldMapCanvas.getContext("2d");
  var closeMapButton = document.getElementById("close-map-button");
  var soundButton = document.getElementById("sound-button");
  var fullscreenButton = document.getElementById("fullscreen-button");
  var pauseDialog = document.getElementById("pause-dialog");
  var resumeButton = document.getElementById("resume-button");
  var respawnDialog = document.getElementById("respawn-dialog");
  var respawnButton = document.getElementById("respawn-button");
  var victoryDialog = document.getElementById("victory-dialog");
  var victoryStats = document.getElementById("victory-stats");
  var playAgainButton = document.getElementById("play-again-button");
  var dialogueBox = document.getElementById("dialogue-box");
  var speakerName = document.getElementById("speaker-name");
  var dialogueText = document.getElementById("dialogue-text");
  var touchControls = document.getElementById("touch-controls");
  var webglError = document.getElementById("webgl-error");

  if (!window.THREE) {
    webglError.classList.remove("hidden");
    loadingNote.textContent = "The 3D realm could not load.";
    return;
  }

  var THREE = window.THREE;
  var WORLD_SIZE = 2400;
  var HALF_WORLD = WORLD_SIZE / 2;
  var WATER_LEVEL = 1.7;
  var RIVER_HALF_WIDTH = 27;
  var PLAYER_EYE = 1.72;
  var FIXED_STEP = 1 / 60;
  var touchDevice = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  var keys = new Set();
  var scene;
  var camera;
  var renderer;
  var clock;
  var sunLight;
  var waterMaterial;
  var waterMesh;
  var foliageMeshes = [];
  var cloudGroups = [];
  var skyDome = null;
  var sunMesh = null;
  var staticColliders = [];
  var roadPoints = [];
  var particles = [];
  var npcs = [];
  var enemies = [];
  var buildParts = [];
  var horse = null;
  var beacon = null;
  var ruinGuardian = null;
  var hollowKing = null;
  var elaraNpc = null;
  var firstPersonRig = null;
  var swordRig = null;
  var gripGlow = null;
  var horseView = null;
  var gliderView = null;
  var animationFrame = 0;
  var manualStepUntil = 0;
  var lastFrameTime = performance.now();
  var mouseDragging = false;
  var lastPointerX = 0;
  var lastPointerY = 0;
  var joystickPointer = null;
  var joystickVector = { x: 0, y: 0 };
  var lookPointer = null;
  var sound = createSoundEngine();

  var sectorNames = [
    ["Stormpine Crown", "Cloudstep Moors", "Amberwild", "Frostmere Reach"],
    ["Oldgrowth Weald", "Windrest Highlands", "Bramblewick Vale", "Sunwash Downs"],
    ["Mosswater Fen", "Wayfarer Fields", "Silverrun Basin", "Thornwatch"],
    ["Emberroot Wilds", "Whispering Scar", "Stormwake Expanse", "Hollow March"]
  ];

  var questText = [
    "Follow the old road to Bramblewick Stable",
    "Reach the broken Silverrun crossing • build, ride or swim",
    "Cross the wilds and defeat the Stormwake Warden",
    "Place your hand on the ancient beacon",
    "Follow the revealed road to the Hollow Citadel",
    "Defeat the Hollow King",
    "Reach Elara inside the throne prison",
    "Elara is free • the wild roads are open"
  ];

  var state = {
    mode: "title",
    time: 0,
    dayTime: 0.29,
    mapOpen: false,
    dialogue: null,
    dialogueIndex: 0,
    soundOn: true,
    questStage: 0,
    enemiesDefeated: 0,
    partsAttached: 0,
    regionsVisited: new Set(),
    currentSector: "Windrest Highlands",
    toast: "",
    toastUntil: 0,
    heldPart: null,
    player: {
      x: -430,
      y: 0,
      z: 330,
      vy: 0,
      yaw: -0.87,
      pitch: -0.04,
      health: 5,
      maxHealth: 5,
      stamina: 100,
      onGround: true,
      swimming: false,
      gliding: false,
      mounted: false,
      attackReady: 0,
      attackAnim: 0,
      hurtUntil: 0,
      distance: 0,
      stepTimer: 0,
      respawnX: -430,
      respawnZ: 330
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function smoothstep(edge0, edge1, value) {
    var t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function distance2D(ax, az, bx, bz) {
    return Math.hypot(ax - bx, az - bz);
  }

  function seededRandom(seed) {
    var value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function riverCenter(z) {
    return 82 + Math.sin(z * 0.0046) * 128 + Math.sin(z * 0.013) * 24;
  }

  function rawTerrainHeight(x, z) {
    var rolling = Math.sin(x * 0.0062) * 7 + Math.cos(z * 0.0053) * 8;
    rolling += Math.sin((x + z) * 0.0031) * 10 + Math.cos((x - z) * 0.0042) * 5;
    var mountainEast = Math.max(0, (x - 400) / 700);
    var mountainNorth = Math.max(0, (-z - 420) / 700);
    rolling += mountainEast * mountainEast * 92 + mountainNorth * mountainNorth * 66;
    rolling += Math.pow(Math.max(0, Math.sin(x * 0.0018 + 1.8) * Math.cos(z * 0.0017)), 2) * 35;
    return rolling;
  }

  function flattenAround(height, x, z, cx, cz, radius, target) {
    var d = distance2D(x, z, cx, cz);
    if (d >= radius) return height;
    var blend = 1 - smoothstep(radius * 0.35, radius, d);
    return lerp(height, target, blend);
  }

  function terrainHeight(x, z) {
    var h = rawTerrainHeight(x, z);
    var riverDistance = Math.abs(x - riverCenter(z));
    if (riverDistance < RIVER_HALF_WIDTH + 62) {
      var riverBlend = 1 - smoothstep(RIVER_HALF_WIDTH - 5, RIVER_HALF_WIDTH + 62, riverDistance);
      h = lerp(h, -2.8, riverBlend);
    }
    var brokenApproachX = riverCenter(-20) - 56;
    if (x < riverCenter(z) - RIVER_HALF_WIDTH + 2) {
      h = flattenAround(h, x, z, brokenApproachX, -29, 90, 2.6);
    }
    h = flattenAround(h, x, z, -278, 165, 95, 3.6);
    h = flattenAround(h, x, z, -92, 32, 120, 2.8);
    h = flattenAround(h, x, z, 446, -438, 190, 18);
    h = flattenAround(h, x, z, 980, -850, 175, 68);
    h = flattenAround(h, x, z, -430, 330, 58, 5.5);
    return h;
  }

  function isRiver(x, z) {
    return Math.abs(x - riverCenter(z)) < RIVER_HALF_WIDTH;
  }

  function roadDistance(x, z) {
    var best = Infinity;
    for (var i = 0; i < roadPoints.length - 1; i += 1) {
      var a = roadPoints[i];
      var b = roadPoints[i + 1];
      var vx = b.x - a.x;
      var vz = b.z - a.z;
      var lengthSquared = vx * vx + vz * vz || 1;
      var t = clamp(((x - a.x) * vx + (z - a.z) * vz) / lengthSquared, 0, 1);
      var px = a.x + vx * t;
      var pz = a.z + vz * t;
      best = Math.min(best, distance2D(x, z, px, pz));
    }
    return best;
  }

  function worldSurfaceHeight(x, z, currentY) {
    var height = terrainHeight(x, z);
    if (isRiver(x, z)) height = WATER_LEVEL - 1.05;
    for (var i = 0; i < buildParts.length; i += 1) {
      var part = buildParts[i];
      if (part === state.heldPart) continue;
      var dx = x - part.group.position.x;
      var dz = z - part.group.position.z;
      var c = Math.cos(-part.rotation);
      var s = Math.sin(-part.rotation);
      var localX = dx * c - dz * s;
      var localZ = dx * s + dz * c;
      if (Math.abs(localX) < part.length * 0.52 && Math.abs(localZ) < part.width * 0.62) {
        var top = part.group.position.y + part.height * 0.56;
        if (currentY == null || currentY >= top - 2.4) height = Math.max(height, top);
      }
    }
    if (Math.abs(z + 20) < 4.8) {
      var center = riverCenter(-20);
      var bridgeDx = x - center;
      if ((bridgeDx < -9 && bridgeDx > -48) || (bridgeDx > 9 && bridgeDx < 48)) {
        height = Math.max(height, WATER_LEVEL + 1.3);
      }
    }
    if (Math.abs(x - 980) < 52 && Math.abs(z + 850) < 46) {
      height = Math.max(height, terrainHeight(980, -850) + 5.05);
    }
    return height;
  }

  function material(color, roughness, metalness) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness == null ? 0.82 : roughness,
      metalness: metalness == null ? 0.02 : metalness
    });
  }

  function mesh(geometry, meshMaterial, shadows) {
    var result = new THREE.Mesh(geometry, meshMaterial);
    result.castShadow = shadows !== false;
    result.receiveShadow = shadows !== false;
    return result;
  }

  function setShadows(object, cast, receive) {
    object.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = cast !== false;
        child.receiveShadow = receive !== false;
      }
    });
    return object;
  }

  function initRenderer() {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: Boolean(navigator.webdriver),
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.74;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(canvas.clientWidth || 960, canvas.clientHeight || 600, false);
    renderer.setClearColor(0x89b5c3, 1);
  }

  function createSky() {
    var uniforms = {
      topColor: { value: new THREE.Color(0x4f91b2) },
      bottomColor: { value: new THREE.Color(0xd8d7ae) },
      offset: { value: 45 },
      exponent: { value: 0.75 }
    };
    var skyMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: "varying vec3 vWorldPosition; void main(){ vec4 worldPosition=modelMatrix*vec4(position,1.0); vWorldPosition=worldPosition.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h=normalize(vWorldPosition+offset).y; gl_FragColor=vec4(mix(bottomColor,topColor,max(pow(max(h,0.0),exponent),0.0)),1.0); }",
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    skyDome = new THREE.Mesh(new THREE.SphereGeometry(1080, 32, 18), skyMaterial);
    skyDome.frustumCulled = false;
    scene.add(skyDome);

    sunMesh = mesh(new THREE.SphereGeometry(22, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffedab, fog: false }), false);
    sunMesh.position.set(-420, 470, -720);
    scene.add(sunMesh);

    for (var i = 0; i < 13; i += 1) {
      var cloud = new THREE.Group();
      var cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xf1f1dc, transparent: true, opacity: 0.65, depthWrite: false });
      var lobes = 3 + Math.floor(seededRandom(i + 80) * 4);
      for (var j = 0; j < lobes; j += 1) {
        var puff = mesh(new THREE.SphereGeometry(18 + seededRandom(i * 12 + j) * 20, 10, 7), cloudMaterial, false);
        puff.scale.y = 0.42;
        puff.position.set(j * 23 - lobes * 11, seededRandom(j + i * 4) * 7, seededRandom(j * 9 + i) * 14);
        cloud.add(puff);
      }
      cloud.position.set(-900 + seededRandom(i + 2) * 1800, 155 + seededRandom(i + 12) * 115, -850 + seededRandom(i + 31) * 1700);
      cloud.userData.speed = 1.2 + seededRandom(i + 77) * 2;
      cloudGroups.push(cloud);
      scene.add(cloud);
    }
  }

  function createTerrain() {
    var segments = 240;
    var positions = [];
    var colors = [];
    var indices = [];
    var color = new THREE.Color();
    for (var row = 0; row <= segments; row += 1) {
      var z = -HALF_WORLD + row / segments * WORLD_SIZE;
      for (var col = 0; col <= segments; col += 1) {
        var x = -HALF_WORLD + col / segments * WORLD_SIZE;
        var y = terrainHeight(x, z);
        positions.push(x, y, z);
        var moisture = Math.sin(x * 0.003 + z * 0.002) * 0.5 + 0.5;
        if (y > 62) color.set(0x8d907f);
        else if (x < -500 && z < 120) color.set(moisture > 0.42 ? 0x416c4b : 0x557954);
        else if (z > 430) color.set(moisture > 0.46 ? 0x527d51 : 0x6f935d);
        else if (x > 470 && z > 0) color.set(0x87945e);
        else if (z < -520) color.set(moisture > 0.5 ? 0x687c58 : 0x7f815a);
        else color.set(moisture > 0.48 ? 0x638f57 : 0x769b61);
        var shade = clamp(0.86 + y * 0.002 + seededRandom(row * 181 + col) * 0.12, 0.72, 1.12);
        color.multiplyScalar(shade);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (var r = 0; r < segments; r += 1) {
      for (var c = 0; c < segments; c += 1) {
        var a = r * (segments + 1) + c;
        var b = a + 1;
        var d = (r + 1) * (segments + 1) + c;
        var e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    var terrainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    var terrain = mesh(geometry, terrainMaterial, false);
    terrain.receiveShadow = true;
    scene.add(terrain);
  }

  function createRiver() {
    var segments = 260;
    var positions = [];
    var indices = [];
    for (var i = 0; i <= segments; i += 1) {
      var z = -HALF_WORLD + i / segments * WORLD_SIZE;
      var center = riverCenter(z);
      var width = RIVER_HALF_WIDTH + Math.sin(z * 0.01) * 4;
      positions.push(center - width, WATER_LEVEL, z, center + width, WATER_LEVEL, z);
      if (i < segments) {
        var n = i * 2;
        indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x3b91a2,
      emissive: 0x0b3039,
      shininess: 115,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide
    });
    waterMesh = mesh(geometry, waterMaterial, false);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    var sparkleMaterial = new THREE.LineBasicMaterial({ color: 0xc7f1e4, transparent: true, opacity: 0.42 });
    for (var s = 0; s < 18; s += 1) {
      var points = [];
      for (var k = 0; k < 18; k += 1) {
        var lineZ = -1100 + ((s * 137 + k * 22) % 2200);
        points.push(new THREE.Vector3(riverCenter(lineZ) - 18 + seededRandom(s * 20 + k) * 36, WATER_LEVEL + 0.05, lineZ));
      }
      var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), sparkleMaterial);
      scene.add(line);
    }
  }

  function makeRibbon(points, width, ribbonMaterial) {
    ribbonMaterial.side = THREE.DoubleSide;
    var positions = [];
    var indices = [];
    function insideBridgeDeck(point) {
      var atBrokenBridge = Math.abs(point.z + 20) < 10 && Math.abs(point.x - riverCenter(-20)) < 56;
      var atCompleteBridge = Math.abs(point.z - 508) < 10 && Math.abs(point.x - riverCenter(508)) < 55;
      return atBrokenBridge || atCompleteBridge;
    }
    for (var i = 0; i < points.length; i += 1) {
      var previous = points[Math.max(0, i - 1)];
      var next = points[Math.min(points.length - 1, i + 1)];
      var dx = next.x - previous.x;
      var dz = next.z - previous.z;
      var length = Math.hypot(dx, dz) || 1;
      var sideX = -dz / length * width;
      var sideZ = dx / length * width;
      var leftX = points[i].x - sideX;
      var leftZ = points[i].z - sideZ;
      var rightX = points[i].x + sideX;
      var rightZ = points[i].z + sideZ;
      var centerY = terrainHeight(points[i].x, points[i].z) + 0.64;
      var leftY = clamp(terrainHeight(leftX, leftZ) + 0.64, centerY - 1.35, centerY + 1.35);
      var rightY = clamp(terrainHeight(rightX, rightZ) + 0.64, centerY - 1.35, centerY + 1.35);
      positions.push(leftX, leftY, leftZ, rightX, rightY, rightZ);
      if (i < points.length - 1) {
        var n = i * 2;
        var nextY = terrainHeight(points[i + 1].x, points[i + 1].z) + 0.64;
        var steepSeam = Math.abs(nextY - centerY) > 5;
        if (!insideBridgeDeck(points[i]) && !insideBridgeDeck(points[i + 1]) && !steepSeam) {
          indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        }
      }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    var ribbon = mesh(geometry, ribbonMaterial, false);
    ribbon.receiveShadow = true;
    scene.add(ribbon);
    return ribbon;
  }

  function createRoads() {
    var crossingZ = -20;
    var crossingCenter = riverCenter(crossingZ);
    roadPoints = [
      { x: -475, z: 370 }, { x: -405, z: 305 }, { x: -330, z: 225 }, { x: -275, z: 168 },
      { x: -205, z: 105 }, { x: -120, z: 48 }, { x: -58, z: 4 },
      { x: crossingCenter - 50, z: crossingZ }, { x: crossingCenter - 9, z: crossingZ },
      { x: crossingCenter + 9, z: crossingZ }, { x: crossingCenter + 50, z: crossingZ },
      { x: 175, z: -105 }, { x: 265, z: -205 }, { x: 352, z: -325 }, { x: 446, z: -438 },
      { x: 570, z: -525 }, { x: 710, z: -625 }, { x: 850, z: -742 }, { x: 980, z: -850 }
    ];
    var sampled = [];
    for (var i = 0; i < roadPoints.length - 1; i += 1) {
      for (var n = 0; n < 10; n += 1) {
        var t = n / 10;
        sampled.push({ x: lerp(roadPoints[i].x, roadPoints[i + 1].x, t), z: lerp(roadPoints[i].z, roadPoints[i + 1].z, t) });
      }
    }
    sampled.push(roadPoints[roadPoints.length - 1]);
    makeRibbon(sampled, 6.2, new THREE.MeshStandardMaterial({ color: 0x8b6b43, roughness: 1, metalness: 0 }));

    var sideRoad = [];
    for (var q = 0; q <= 40; q += 1) {
      var t2 = q / 40;
      var z = lerp(168, 520, t2);
      sideRoad.push({ x: lerp(-275, riverCenter(520) + 80, t2) + Math.sin(t2 * Math.PI) * 60, z: z });
    }
    makeRibbon(sideRoad, 3.4, new THREE.MeshStandardMaterial({ color: 0x8d7857, roughness: 1 }));
  }

  function createInstancedNature() {
    var oakTrunkGeometry = new THREE.CylinderGeometry(0.65, 0.95, 7, 7);
    oakTrunkGeometry.translate(0, 3.5, 0);
    var oakCrownGeometry = new THREE.IcosahedronGeometry(4.4, 1);
    oakCrownGeometry.translate(0, 9.2, 0);
    var pineTrunkGeometry = new THREE.CylinderGeometry(0.5, 0.85, 7.5, 6);
    pineTrunkGeometry.translate(0, 3.75, 0);
    var pineCrownGeometry = new THREE.ConeGeometry(4.5, 13, 9);
    pineCrownGeometry.translate(0, 9.4, 0);
    var trunkMaterial = material(0x5b402d, 1, 0);
    var oakMaterials = [material(0x315f3f, 0.96), material(0x43754a, 0.96), material(0x557f4e, 0.96)];
    var pineMaterial = material(0x285744, 0.98);
    var oakMatrices = [[], [], []];
    var pineMatrices = [];
    var trunkOakMatrices = [];
    var trunkPineMatrices = [];
    var dummy = new THREE.Object3D();
    var accepted = 0;
    var attempts = 0;
    while (accepted < 2600 && attempts < 12000) {
      attempts += 1;
      var x = -HALF_WORLD + seededRandom(attempts * 3.11) * WORLD_SIZE;
      var z = -HALF_WORLD + seededRandom(attempts * 7.71 + 9) * WORLD_SIZE;
      var forestBias = seededRandom(attempts * 11.3);
      var dense = x < -350 || z > 330 || (x > 420 && z < -220);
      if (!dense && forestBias > 0.43) continue;
      if (isRiver(x, z) || roadDistance(x, z) < 12) continue;
      if (distance2D(x, z, -278, 165) < 125 || distance2D(x, z, -92, 32) < 145 || distance2D(x, z, 446, -438) < 115) continue;
      var y = terrainHeight(x, z);
      if (y > 88) continue;
      var scale = 0.72 + seededRandom(attempts * 4.7) * 1.38;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, seededRandom(attempts * 2.2) * Math.PI * 2, 0);
      dummy.scale.set(scale * (0.88 + seededRandom(attempts) * 0.25), scale, scale * (0.88 + seededRandom(attempts * 8) * 0.25));
      dummy.updateMatrix();
      if (z > 520 || x < -720 || (x > 610 && z < 100)) {
        pineMatrices.push(dummy.matrix.clone());
        trunkPineMatrices.push(dummy.matrix.clone());
      } else {
        var variant = Math.floor(seededRandom(attempts * 12.4) * 3);
        oakMatrices[variant].push(dummy.matrix.clone());
        trunkOakMatrices.push(dummy.matrix.clone());
      }
      accepted += 1;
    }

    function addInstances(geometry, meshMaterial, matrices, shadows) {
      if (!matrices.length) return null;
      var instances = new THREE.InstancedMesh(geometry, meshMaterial, matrices.length);
      matrices.forEach(function (matrix, index) { instances.setMatrixAt(index, matrix); });
      instances.instanceMatrix.needsUpdate = true;
      instances.castShadow = shadows;
      instances.receiveShadow = true;
      scene.add(instances);
      return instances;
    }

    addInstances(oakTrunkGeometry, trunkMaterial, trunkOakMatrices, false);
    addInstances(pineTrunkGeometry, trunkMaterial, trunkPineMatrices, false);
    oakMatrices.forEach(function (matrices, index) {
      var crown = addInstances(oakCrownGeometry, oakMaterials[index], matrices, false);
      if (crown) foliageMeshes.push(crown);
    });
    var pineCrowns = addInstances(pineCrownGeometry, pineMaterial, pineMatrices, false);
    if (pineCrowns) foliageMeshes.push(pineCrowns);

    var heroMatrices = [];
    var heroCenters = [
      { x: -430, z: 330, radius: 115 },
      { x: -278, z: 165, radius: 130 },
      { x: -92, z: 32, radius: 145 },
      { x: 446, z: -438, radius: 125 },
      { x: 980, z: -850, radius: 155 }
    ];
    heroCenters.forEach(function (center, centerIndex) {
      for (var hi = 0; hi < 22; hi += 1) {
        var angle = seededRandom(centerIndex * 90 + hi * 3) * Math.PI * 2;
        var radius = 35 + seededRandom(centerIndex * 110 + hi * 7) * center.radius;
        var hx = center.x + Math.cos(angle) * radius;
        var hz = center.z + Math.sin(angle) * radius;
        if (isRiver(hx, hz) || roadDistance(hx, hz) < 11) continue;
        dummy.position.set(hx, terrainHeight(hx, hz), hz);
        dummy.rotation.set(0, seededRandom(hi * 13 + centerIndex) * Math.PI * 2, 0);
        var hs = 0.8 + seededRandom(hi * 17 + centerIndex) * 0.85;
        dummy.scale.set(hs, hs, hs);
        dummy.updateMatrix();
        heroMatrices.push(dummy.matrix.clone());
      }
    });
    addInstances(oakTrunkGeometry, trunkMaterial, heroMatrices, true);
    var heroCrowns = addInstances(oakCrownGeometry, oakMaterials[1], heroMatrices, true);
    if (heroCrowns) foliageMeshes.push(heroCrowns);

    var rockGeometry = new THREE.DodecahedronGeometry(2.2, 0);
    var rockMatrices = [];
    for (var r = 0; r < 280; r += 1) {
      var rx = -HALF_WORLD + seededRandom(r * 19 + 4) * WORLD_SIZE;
      var rz = -HALF_WORLD + seededRandom(r * 29 + 8) * WORLD_SIZE;
      if (isRiver(rx, rz) || roadDistance(rx, rz) < 8 || distance2D(rx, rz, -278, 165) < 100) continue;
      dummy.position.set(rx, terrainHeight(rx, rz) + 0.6, rz);
      dummy.rotation.set(seededRandom(r) * 0.4, seededRandom(r + 2) * 6.2, seededRandom(r + 3) * 0.35);
      var rs = 0.45 + seededRandom(r * 31) * 2.3;
      dummy.scale.set(rs * 1.2, rs * 0.8, rs);
      dummy.updateMatrix();
      rockMatrices.push(dummy.matrix.clone());
    }
    addInstances(rockGeometry, material(0x77786d, 0.99), rockMatrices, true);

    var grassGeometry = new THREE.ConeGeometry(0.28, 1.5, 3);
    grassGeometry.translate(0, 0.75, 0);
    var grassMatrices = [];
    for (var g = 0; g < 900; g += 1) {
      var gx = -650 + seededRandom(g * 41 + 1) * 1300;
      var gz = -650 + seededRandom(g * 47 + 2) * 1300;
      if (isRiver(gx, gz) || roadDistance(gx, gz) < 5) continue;
      dummy.position.set(gx, terrainHeight(gx, gz), gz);
      dummy.rotation.set(0, seededRandom(g) * Math.PI * 2, 0);
      var gs = 0.7 + seededRandom(g * 53) * 1.2;
      dummy.scale.set(gs, gs, gs);
      dummy.updateMatrix();
      grassMatrices.push(dummy.matrix.clone());
    }
    var grass = addInstances(grassGeometry, new THREE.MeshLambertMaterial({ color: 0x789d54 }), grassMatrices, false);
    if (grass) foliageMeshes.push(grass);
  }

  function addBox(group, size, position, boxMaterial, rotation) {
    var object = mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), boxMaterial);
    object.position.set(position[0], position[1], position[2]);
    if (rotation) object.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
    group.add(object);
    return object;
  }

  function createHouse(x, z, rotation, wallColor, roofColor, scale) {
    scale = scale || 1;
    var group = new THREE.Group();
    var baseY = terrainHeight(x, z);
    group.position.set(x, baseY, z);
    group.rotation.y = rotation || 0;
    var wallMaterial = material(wallColor || 0xb9a476, 0.98);
    var woodMaterial = material(0x513b2b, 0.96);
    addBox(group, [12 * scale, 7 * scale, 10 * scale], [0, 3.5 * scale, 0], wallMaterial);
    addBox(group, [2.6 * scale, 4.8 * scale, 0.45], [0, 2.4 * scale, 5.15 * scale], woodMaterial);
    var roof = mesh(new THREE.ConeGeometry(9.4 * scale, 6 * scale, 4), material(roofColor || 0x40583f, 0.92));
    roof.position.y = 9.1 * scale;
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.8;
    group.add(roof);
    var chimney = addBox(group, [1.2, 5, 1.2], [3.6 * scale, 9 * scale, -1.2 * scale], material(0x6d675c, 1));
    chimney.rotation.y = -rotation;
    setShadows(group);
    scene.add(group);
    staticColliders.push({ x: x, z: z, radius: 6.5 * scale });
    return group;
  }

  function createFence(x, z, length, rotation) {
    var group = new THREE.Group();
    group.position.set(x, worldSurfaceHeight(x, z), z);
    group.rotation.y = rotation || 0;
    var wood = material(0x65482e, 0.98);
    var posts = Math.max(2, Math.floor(length / 4));
    for (var i = 0; i <= posts; i += 1) {
      addBox(group, [0.35, 2.5, 0.35], [-length / 2 + i / posts * length, 1.25, 0], wood);
    }
    addBox(group, [length, 0.26, 0.3], [0, 1.75, 0], wood);
    addBox(group, [length, 0.23, 0.3], [0, 0.86, 0], wood);
    scene.add(group);
    return group;
  }

  function createFurniture(group, x, y, z, rotation) {
    var wood = material(0x6b4a2e, 0.95);
    var table = new THREE.Group();
    addBox(table, [4.8, 0.35, 2.5], [0, 2.05, 0], wood);
    [[-1.8, 1, -0.8], [1.8, 1, -0.8], [-1.8, 1, 0.8], [1.8, 1, 0.8]].forEach(function (p) {
      addBox(table, [0.28, 2, 0.28], p, wood);
    });
    table.position.set(x, y, z);
    table.rotation.y = rotation || 0;
    group.add(table);
    [-1, 1].forEach(function (side) {
      var chair = new THREE.Group();
      addBox(chair, [1.5, 0.25, 1.5], [0, 1.05, 0], wood);
      addBox(chair, [1.5, 2.2, 0.25], [0, 2.05, -0.65], wood);
      addBox(chair, [0.22, 1, 0.22], [-0.5, 0.5, 0.5], wood);
      addBox(chair, [0.22, 1, 0.22], [0.5, 0.5, 0.5], wood);
      chair.position.set(x + side * 3.2, y, z);
      chair.rotation.y = (rotation || 0) + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      group.add(chair);
    });
  }

  function createLantern(parent, x, y, z, glow) {
    var frame = new THREE.Group();
    addBox(frame, [0.55, 1.2, 0.55], [0, 0, 0], material(0x43372b, 0.55, 0.25));
    var lightOrb = mesh(new THREE.SphereGeometry(0.26, 10, 7), new THREE.MeshBasicMaterial({ color: glow || 0xffd37b }), false);
    lightOrb.position.y = 0.05;
    frame.add(lightOrb);
    frame.position.set(x, y, z);
    parent.add(frame);
    return frame;
  }

  function createStableAndVillage() {
    var stableX = -278;
    var stableZ = 165;
    var stableY = terrainHeight(stableX, stableZ);
    var stable = new THREE.Group();
    stable.position.set(stableX, stableY, stableZ);
    stable.rotation.y = -0.7;
    var wood = material(0x60452f, 0.96);
    var darkWood = material(0x3f3127, 0.94);
    var plaster = material(0xc0ac7b, 0.98);
    addBox(stable, [23, 0.8, 15], [0, 0.4, 0], material(0x85714f, 1));
    addBox(stable, [23, 6, 1], [0, 3, -7], plaster);
    addBox(stable, [1, 6, 15], [-11, 3, 0], plaster);
    addBox(stable, [1, 6, 15], [11, 3, 0], plaster);
    for (var post = -9; post <= 9; post += 6) addBox(stable, [0.7, 8.5, 0.7], [post, 4.25, 6.7], wood);
    var roofLeft = addBox(stable, [25, 0.7, 10], [0, 8.1, -3.4], material(0x375245, 0.96), [0.34, 0, 0]);
    var roofRight = addBox(stable, [25, 0.7, 10], [0, 8.1, 3.4], material(0x375245, 0.96), [-0.34, 0, 0]);
    roofLeft.position.y = 7.6;
    roofRight.position.y = 7.6;
    createFurniture(stable, -4, 0.8, 1, 0);
    for (var stall = 0; stall < 3; stall += 1) {
      var sx = 2 + stall * 6;
      addBox(stable, [0.35, 3.6, 10], [sx, 1.8, -1], darkWood);
      addBox(stable, [5.5, 1.2, 0.3], [sx - 2.8, 1.1, 3.7], darkWood);
    }
    createLantern(stable, -8, 5.4, 6.5);
    createLantern(stable, 8, 5.4, 6.5);
    var sign = new THREE.Group();
    addBox(sign, [5.7, 2.5, 0.35], [0, 3.8, 0], material(0x8a6a3f));
    addBox(sign, [0.4, 5, 0.4], [0, 1.4, 0], darkWood);
    var emblem = mesh(new THREE.TorusGeometry(0.7, 0.13, 7, 18), new THREE.MeshStandardMaterial({ color: 0xf0d078, emissive: 0x332206 }));
    emblem.position.set(0, 3.8, 0.24);
    sign.add(emblem);
    sign.position.set(-16, 0, 8);
    stable.add(sign);
    setShadows(stable);
    scene.add(stable);
    staticColliders.push({ x: stableX, z: stableZ, radius: 14 });

    createFence(-315, 126, 45, -0.05);
    createFence(-337, 148, 44, Math.PI / 2);
    createFence(-292, 105, 44, Math.PI / 2);
    createFence(-315, 83, 45, 0);

    createHouse(-112, 22, 0.45, 0xb9a476, 0x4e6546, 1.05);
    createHouse(-77, 53, -0.25, 0xc6b583, 0x566a48, 0.85);
    createHouse(-65, -3, 0.05, 0xb8a16d, 0x6d5741, 0.92);
    createHouse(-139, 63, 0.75, 0xc9b98c, 0x3e5c4b, 0.75);
    createFence(-105, -21, 54, 0.1);

    var well = new THREE.Group();
    well.position.set(-103, terrainHeight(-103, 35), 35);
    var wellStone = material(0x77766a, 1);
    for (var wi = 0; wi < 12; wi += 1) {
      var angle = wi / 12 * Math.PI * 2;
      var stone = addBox(well, [1.5, 1.2, 1.2], [Math.cos(angle) * 3, 0.6, Math.sin(angle) * 3], wellStone);
      stone.rotation.y = -angle;
    }
    addBox(well, [0.35, 5, 0.35], [-3, 2.5, 0], wood);
    addBox(well, [0.35, 5, 0.35], [3, 2.5, 0], wood);
    addBox(well, [7, 0.3, 0.3], [0, 4.8, 0], wood);
    scene.add(well);
  }

  function createBridgeSection(centerX, z, startX, endX) {
    var bridge = new THREE.Group();
    bridge.position.set(centerX, WATER_LEVEL + 1.2, z);
    var wood = material(0x735035, 0.94);
    var length = endX - startX;
    var planks = Math.max(1, Math.floor(length / 1.2));
    for (var i = 0; i <= planks; i += 1) {
      var x = startX + i / planks * length;
      addBox(bridge, [1.05, 0.45, 8], [x - centerX, 0, 0], wood, [0, 0, (seededRandom(i + startX) - 0.5) * 0.05]);
    }
    for (var side = -1; side <= 1; side += 2) {
      addBox(bridge, [length + 1, 0.3, 0.3], [(startX + endX) / 2 - centerX, 1.9, side * 3.7], wood);
      for (var p = 0; p <= 5; p += 1) addBox(bridge, [0.28, 2.1, 0.28], [startX + p / 5 * length - centerX, 1, side * 3.7], wood);
    }
    scene.add(bridge);
    return bridge;
  }

  function createBridgesAndParts() {
    var brokenZ = -20;
    var center = riverCenter(brokenZ);
    createBridgeSection(center, brokenZ, center - 50, center - 9);
    createBridgeSection(center, brokenZ, center + 9, center + 50);

    var completeZ = 508;
    var completeCenter = riverCenter(completeZ);
    createBridgeSection(completeCenter, completeZ, completeCenter - 49, completeCenter + 49);

    var partMaterial = material(0x8b6038, 0.86);
    var starting = [
      { x: center - 48, z: -34, length: 12, width: 2.3, rotation: 0.05, type: "log" },
      { x: center - 52, z: -27, length: 12, width: 2.3, rotation: -0.1, type: "log" },
      { x: center - 47, z: -9, length: 10, width: 4.2, rotation: 0.2, type: "plank" },
      { x: center - 57, z: -17, length: 10, width: 4.2, rotation: -0.15, type: "plank" }
    ];
    starting.forEach(function (data, index) {
      var group = new THREE.Group();
      var geometry = data.type === "log" ? new THREE.CylinderGeometry(data.width / 2, data.width / 2, data.length, 10) : new THREE.BoxGeometry(data.length, 0.62, data.width);
      if (data.type === "log") geometry.rotateZ(Math.PI / 2);
      var body = mesh(geometry, partMaterial.clone());
      group.add(body);
      group.position.set(data.x, terrainHeight(data.x, data.z) + data.width * 0.42, data.z);
      group.rotation.y = data.rotation;
      group.userData.buildPart = true;
      scene.add(group);
      buildParts.push({
        id: "part-" + index,
        type: data.type,
        group: group,
        body: body,
        length: data.length,
        width: data.width,
        height: data.type === "log" ? data.width : 0.62,
        rotation: data.rotation,
        attached: false,
        original: { x: data.x, z: data.z, rotation: data.rotation }
      });
    });
  }

  function createRuinAndBeacon() {
    var x = 446;
    var z = -438;
    var y = terrainHeight(x, z);
    var ruin = new THREE.Group();
    ruin.position.set(x, y, z);
    var stone = material(0x74786f, 0.92);
    var glowStone = new THREE.MeshStandardMaterial({ color: 0x6d7770, roughness: 0.78, emissive: 0x132c28 });
    for (var i = 0; i < 8; i += 1) {
      var angle = i / 8 * Math.PI * 2;
      var column = addBox(ruin, [3.2, 16 + (i % 3) * 2, 3.2], [Math.cos(angle) * 22, 8, Math.sin(angle) * 22], i % 2 ? stone : glowStone);
      column.rotation.y = -angle + (seededRandom(i) - 0.5) * 0.16;
      var cap = mesh(new THREE.CylinderGeometry(3.1, 2.7, 1.4, 6), stone);
      cap.position.copy(column.position);
      cap.position.y += 8.7 + (i % 3);
      ruin.add(cap);
    }
    for (var a = 0; a < 4; a += 1) {
      var archAngle = a / 4 * Math.PI * 2;
      addBox(ruin, [18, 2.8, 3], [Math.cos(archAngle) * 15, 14, Math.sin(archAngle) * 15], stone, [0, -archAngle, 0.08 * (a % 2 ? 1 : -1)]);
    }
    var dais = mesh(new THREE.CylinderGeometry(13, 15, 2.4, 12), stone);
    dais.position.y = 1.2;
    ruin.add(dais);
    var beaconGroup = new THREE.Group();
    var base = mesh(new THREE.CylinderGeometry(3.8, 5, 5, 8), glowStone);
    base.position.y = 4.8;
    beaconGroup.add(base);
    var crystalMaterial = new THREE.MeshStandardMaterial({ color: 0x7ed9cc, emissive: 0x164d4a, roughness: 0.3, metalness: 0.18 });
    var crystal = mesh(new THREE.OctahedronGeometry(3.5, 0), crystalMaterial);
    crystal.position.y = 10;
    beaconGroup.add(crystal);
    beaconGroup.position.y = 2.2;
    ruin.add(beaconGroup);
    beacon = { group: beaconGroup, crystal: crystal, x: x, z: z, active: false };
    setShadows(ruin);
    scene.add(ruin);

    var beamMaterial = new THREE.MeshBasicMaterial({ color: 0x8ffbe5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    var beam = mesh(new THREE.CylinderGeometry(2.4, 7, 420, 12, 1, true), beamMaterial, false);
    beam.position.set(x, y + 218, z);
    beam.userData.beaconBeam = true;
    scene.add(beam);
    beacon.beam = beam;
  }

  function createHollowCitadel() {
    var x = 980;
    var z = -850;
    var y = terrainHeight(x, z);
    var citadel = new THREE.Group();
    citadel.position.set(x, y, z);
    var blackStone = material(0x343b3c, 0.78, 0.12);
    var wornStone = material(0x525957, 0.9, 0.04);
    var iron = material(0x23292b, 0.48, 0.55);
    var redGlow = new THREE.MeshStandardMaterial({ color: 0x7b3d3b, emissive: 0x521414, emissiveIntensity: 1.25, roughness: 0.42 });

    addBox(citadel, [105, 5, 92], [0, 2.5, 0], blackStone);
    addBox(citadel, [105, 22, 6], [0, 11, -43], blackStone);
    addBox(citadel, [6, 22, 92], [-50, 11, 0], blackStone);
    addBox(citadel, [6, 22, 92], [50, 11, 0], blackStone);
    addBox(citadel, [35, 22, 6], [-35, 11, 43], blackStone);
    addBox(citadel, [35, 22, 6], [35, 11, 43], blackStone);
    for (var towerIndex = 0; towerIndex < 4; towerIndex += 1) {
      var tx = towerIndex % 2 ? 48 : -48;
      var tz = towerIndex > 1 ? 41 : -41;
      var tower = mesh(new THREE.CylinderGeometry(10, 12, 34, 8), wornStone);
      tower.position.set(tx, 17, tz);
      citadel.add(tower);
      var roof = mesh(new THREE.ConeGeometry(13, 12, 8), blackStone);
      roof.position.set(tx, 39, tz);
      roof.rotation.y = Math.PI / 8;
      citadel.add(roof);
      createLantern(citadel, tx, 20, tz + (tz > 0 ? -10.2 : 10.2), 0xff6e5e);
    }
    for (var battlement = -45; battlement <= 45; battlement += 10) {
      addBox(citadel, [5, 5, 7], [battlement, 24.5, -43], blackStone);
    }
    var gateLeft = addBox(citadel, [15, 25, 2], [-8, 12.5, 43], iron);
    var gateRight = addBox(citadel, [15, 25, 2], [8, 12.5, 43], iron);
    gateLeft.position.x = -14;
    gateRight.position.x = 14;
    var throne = new THREE.Group();
    addBox(throne, [10, 2.5, 8], [0, 1.25, 0], wornStone);
    addBox(throne, [7, 11, 2], [0, 7, 3], blackStone);
    addBox(throne, [2, 5, 9], [-4.5, 3.5, 0], blackStone);
    addBox(throne, [2, 5, 9], [4.5, 3.5, 0], blackStone);
    throne.position.set(-18, 5, -25);
    citadel.add(throne);

    var prison = new THREE.Group();
    prison.position.set(24, 5, -24);
    addBox(prison, [18, 0.8, 18], [0, 0.4, 0], wornStone);
    addBox(prison, [18, 0.8, 18], [0, 12.2, 0], blackStone);
    for (var barIndex = -8; barIndex <= 8; barIndex += 2) {
      addBox(prison, [0.28, 12, 0.28], [barIndex, 6, -8.5], iron);
      addBox(prison, [0.28, 12, 0.28], [barIndex, 6, 8.5], iron);
      if (Math.abs(barIndex) < 7) {
        addBox(prison, [0.28, 12, 0.28], [-8.5, 6, barIndex], iron);
        addBox(prison, [0.28, 12, 0.28], [8.5, 6, barIndex], iron);
      }
    }
    var prisonSeal = mesh(new THREE.OctahedronGeometry(1.3, 0), redGlow);
    prisonSeal.position.set(0, 7, 8.9);
    prison.add(prisonSeal);
    prison.userData.prisonSeal = prisonSeal;
    citadel.add(prison);
    setShadows(citadel);
    scene.add(citadel);

    elaraNpc = createNpc(
      "Elara",
      x + 24,
      z - 24,
      { cloth: 0xc9b36a, accent: 0x80a7a1, dark: 0x543d32, skin: 0xd8aa80 },
      [
        "Ryn! The Stormwall broke when your beacon answered.",
        "You crossed every wild road and faced the Hollow King. Aeria is free because you chose your own path."
      ],
      "elara"
    );
    elaraNpc.group.position.y = y + 5;
    elaraNpc.homeY = y + 5;
    elaraNpc.prisonSeal = prisonSeal;
  }

  function createWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x89b5c3);
    scene.fog = new THREE.Fog(0x9fb7ad, 125, 610);
    camera = new THREE.PerspectiveCamera(72, 8 / 5, 0.08, 1300);
    camera.rotation.order = "YXZ";
    scene.add(camera);
    var hemisphere = new THREE.HemisphereLight(0xbfe2ec, 0x34422f, 0.5);
    scene.add(hemisphere);
    sunLight = new THREE.DirectionalLight(0xffe6b2, 0.86);
    sunLight.position.set(-260, 430, -330);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(touchDevice ? 1024 : 2048, touchDevice ? 1024 : 2048);
    sunLight.shadow.camera.left = -155;
    sunLight.shadow.camera.right = 155;
    sunLight.shadow.camera.top = 155;
    sunLight.shadow.camera.bottom = -155;
    sunLight.shadow.camera.near = 30;
    sunLight.shadow.camera.far = 780;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    createSky();
    createTerrain();
    createRoads();
    createRiver();
    createInstancedNature();
    createStableAndVillage();
    createBridgesAndParts();
    createRuinAndBeacon();
    createHollowCitadel();
    createCast();
    createEnemyPopulation();
    createFirstPersonRig();
    state.player.y = worldSurfaceHeight(state.player.x, state.player.z) + 0.01;
    updateCamera();
  }

  function createPersonModel(colors, hatStyle) {
    var group = new THREE.Group();
    colors = colors || {};
    var skin = material(colors.skin || 0xc89162, 0.82);
    var cloth = material(colors.cloth || 0x506f62, 0.96);
    var accent = material(colors.accent || 0xa47c45, 0.93);
    var dark = material(colors.dark || 0x3a312b, 0.96);
    var body = mesh(new THREE.CylinderGeometry(0.52, 0.72, 1.55, 8), cloth);
    body.position.y = 1.75;
    group.add(body);
    var belt = mesh(new THREE.CylinderGeometry(0.61, 0.61, 0.18, 8), accent);
    belt.position.y = 1.45;
    group.add(belt);
    var head = mesh(new THREE.SphereGeometry(0.48, 12, 9), skin);
    head.position.y = 2.95;
    group.add(head);
    var hair = mesh(new THREE.SphereGeometry(0.5, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.58), dark);
    hair.position.y = 3.1;
    group.add(hair);
    [-1, 1].forEach(function (side) {
      var arm = mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.25, 7), cloth);
      arm.position.set(side * 0.7, 1.92, 0);
      arm.rotation.z = side * 0.12;
      group.add(arm);
      var hand = mesh(new THREE.SphereGeometry(0.17, 8, 6), skin);
      hand.position.set(side * 0.78, 1.27, 0);
      group.add(hand);
      var leg = mesh(new THREE.CylinderGeometry(0.17, 0.19, 1.2, 7), dark);
      leg.position.set(side * 0.25, 0.6, 0);
      group.add(leg);
    });
    if (hatStyle === "stable") {
      var brim = mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.12, 14), accent);
      brim.position.y = 3.35;
      group.add(brim);
      var crown = mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.7, 10), accent);
      crown.position.y = 3.67;
      group.add(crown);
    } else if (hatStyle === "hood") {
      var hood = mesh(new THREE.ConeGeometry(0.62, 1.1, 10), cloth);
      hood.position.y = 3.62;
      hood.rotation.z = 0.08;
      group.add(hood);
    }
    setShadows(group);
    return group;
  }

  function createNpc(name, x, z, colors, lines, type, path) {
    var group = createPersonModel(colors, type === "stable" ? "stable" : type === "traveler" ? "hood" : null);
    group.position.set(x, terrainHeight(x, z), z);
    group.rotation.y = seededRandom(x + z) * Math.PI * 2;
    scene.add(group);
    var npc = {
      name: name,
      x: x,
      z: z,
      homeX: x,
      homeZ: z,
      group: group,
      lines: lines,
      type: type || "villager",
      path: path || null,
      pathTime: seededRandom(x * 3 + z) * 10
    };
    npcs.push(npc);
    return npc;
  }

  function createHorseModel() {
    var group = new THREE.Group();
    var coat = material(0x87563a, 0.87);
    var dark = material(0x2f2824, 0.95);
    var cream = material(0xc8a874, 0.9);
    var body = mesh(new THREE.SphereGeometry(1.45, 12, 9), coat);
    body.scale.set(1.65, 0.94, 0.72);
    body.position.y = 2.25;
    group.add(body);
    var neck = mesh(new THREE.CylinderGeometry(0.47, 0.65, 1.9, 9), coat);
    neck.position.set(1.35, 3.1, 0);
    neck.rotation.z = -0.55;
    group.add(neck);
    var head = mesh(new THREE.BoxGeometry(1.25, 0.78, 0.72), coat);
    head.position.set(2.05, 3.72, 0);
    head.rotation.z = -0.1;
    group.add(head);
    [-1, 1].forEach(function (side) {
      var ear = mesh(new THREE.ConeGeometry(0.16, 0.62, 6), dark);
      ear.position.set(1.75, 4.35, side * 0.22);
      group.add(ear);
    });
    [[-0.88, -0.53], [-0.88, 0.53], [0.9, -0.53], [0.9, 0.53]].forEach(function (p) {
      var leg = mesh(new THREE.CylinderGeometry(0.16, 0.21, 2.1, 7), coat);
      leg.position.set(p[0], 1.05, p[1]);
      group.add(leg);
      var hoof = mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.3, 7), dark);
      hoof.position.set(p[0], 0.08, p[1]);
      group.add(hoof);
    });
    var mane = mesh(new THREE.BoxGeometry(1.8, 0.55, 0.12), dark);
    mane.position.set(0.85, 3.25, 0);
    mane.rotation.z = -0.6;
    group.add(mane);
    var tail = mesh(new THREE.CylinderGeometry(0.1, 0.23, 1.8, 7), dark);
    tail.position.set(-2.15, 2.05, 0);
    tail.rotation.z = -0.55;
    group.add(tail);
    var saddle = mesh(new THREE.BoxGeometry(1.25, 0.28, 1.28), cream);
    saddle.position.set(-0.05, 3.35, 0);
    group.add(saddle);
    setShadows(group);
    return group;
  }

  function createCast() {
    createNpc(
      "Mara, keeper of Bramblewick",
      -249,
      147,
      { cloth: 0x365e50, accent: 0xb68a4e, dark: 0x5a3d2d },
      [
        "Ryn! The Hollow King's riders passed east before dawn. Elara was with them.",
        "The Stormwall hides their road. Only the old beacon can reveal a path through it.",
        "Take Ashwind if you wish. At Silverrun, use your Aether Grip on the fallen timber — or find your own way across."
      ],
      "stable"
    );
    createNpc("Toma the baker", -102, 39, { cloth: 0x8b5b3e, accent: 0xd3a95b }, ["The road is safer by day, but the forest is never truly empty."], "villager");
    createNpc("Nemi the mapmaker", -74, 16, { cloth: 0x586b8e, accent: 0xd7c07c }, ["High places teach you the shape of the land. Open the map with M whenever you lose the road."], "villager");
    createNpc("Old Bren", -131, 70, { cloth: 0x6f7850, accent: 0x947448 }, ["I saw green-eyed Mosslings gather beyond the river. They fear a bright blade."], "villager");
    createNpc("Lio the traveller", -382, 292, { cloth: 0x4e6e68, accent: 0xc58d4d }, ["Stables are safe fires on a long road. Rest there whenever the wilds wear you down."], "traveler", [
      { x: -430, z: 336 }, { x: -330, z: 232 }, { x: -250, z: 148 }, { x: -158, z: 80 }
    ]);
    createNpc("Sela the courier", 112, -69, { cloth: 0x7f4d52, accent: 0xd2b866 }, ["The broken bridge is not the only answer. A brave swimmer or a clever builder can both cross Silverrun."], "traveler", [
      { x: 54, z: -31 }, { x: 128, z: -75 }, { x: 205, z: -135 }
    ]);

    var horseGroup = createHorseModel();
    horseGroup.position.set(-314, terrainHeight(-314, 111), 111);
    horseGroup.rotation.y = -0.25;
    scene.add(horseGroup);
    horse = {
      name: "Ashwind",
      group: horseGroup,
      x: -314,
      z: 111,
      homeX: -314,
      homeZ: 111,
      phase: 0,
      mounted: false
    };
  }

  function createMosslingModel(scale, color) {
    var group = new THREE.Group();
    group.scale.setScalar(scale || 1);
    var hide = material(color || 0x526844, 0.9);
    var belly = material(0x8a714c, 0.95);
    var horn = material(0xc5b57a, 0.84);
    var eye = new THREE.MeshStandardMaterial({ color: 0xd6ff7c, emissive: 0x67852a, emissiveIntensity: 1.2 });
    var body = mesh(new THREE.SphereGeometry(0.76, 10, 8), hide);
    body.scale.y = 1.15;
    body.position.y = 1.35;
    group.add(body);
    var bellyPatch = mesh(new THREE.SphereGeometry(0.53, 9, 7), belly);
    bellyPatch.scale.set(0.75, 0.95, 0.25);
    bellyPatch.position.set(0, 1.25, -0.58);
    group.add(bellyPatch);
    var head = mesh(new THREE.SphereGeometry(0.66, 10, 8), hide);
    head.position.y = 2.35;
    group.add(head);
    [-1, 1].forEach(function (side) {
      var h = mesh(new THREE.ConeGeometry(0.2, 0.72, 6), horn);
      h.position.set(side * 0.55, 2.9, 0);
      h.rotation.z = -side * 0.6;
      group.add(h);
      var e = mesh(new THREE.SphereGeometry(0.11, 7, 5), eye);
      e.position.set(side * 0.23, 2.42, -0.58);
      group.add(e);
      var arm = mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.2, 7), hide);
      arm.position.set(side * 0.85, 1.4, 0);
      arm.rotation.z = side * 0.25;
      group.add(arm);
      var leg = mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.95, 7), hide);
      leg.position.set(side * 0.35, 0.45, 0);
      group.add(leg);
    });
    var club = mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.8, 7), material(0x503521, 1));
    club.position.set(1.05, 1.1, -0.12);
    club.rotation.z = -0.4;
    group.add(club);
    setShadows(group);
    return group;
  }

  function createWardenModel() {
    var group = new THREE.Group();
    var stone = material(0x505b58, 0.74, 0.08);
    var darkStone = material(0x303b39, 0.68, 0.16);
    var copper = material(0x92714d, 0.52, 0.42);
    var glow = new THREE.MeshStandardMaterial({ color: 0x78f0d0, emissive: 0x1c8b78, emissiveIntensity: 1.8, roughness: 0.25 });
    var torso = mesh(new THREE.DodecahedronGeometry(1.55, 0), stone);
    torso.scale.y = 1.25;
    torso.position.y = 2.55;
    group.add(torso);
    var head = mesh(new THREE.DodecahedronGeometry(1.05, 0), darkStone);
    head.position.y = 4.25;
    group.add(head);
    var eye = mesh(new THREE.SphereGeometry(0.35, 10, 7), glow);
    eye.position.set(0, 4.25, -0.95);
    group.add(eye);
    [-1, 1].forEach(function (side) {
      var shoulder = mesh(new THREE.OctahedronGeometry(0.75, 0), copper);
      shoulder.position.set(side * 1.65, 3.15, 0);
      group.add(shoulder);
      var arm = mesh(new THREE.CylinderGeometry(0.38, 0.48, 2.6, 8), stone);
      arm.position.set(side * 2.0, 2.0, 0);
      arm.rotation.z = side * 0.16;
      group.add(arm);
      var leg = mesh(new THREE.CylinderGeometry(0.42, 0.62, 2.3, 8), darkStone);
      leg.position.set(side * 0.75, 0.95, 0);
      group.add(leg);
    });
    var coreRing = mesh(new THREE.TorusGeometry(0.7, 0.14, 8, 18), copper);
    coreRing.position.set(0, 2.6, -1.42);
    group.add(coreRing);
    setShadows(group);
    return group;
  }

  function createHollowKingModel() {
    var group = createWardenModel();
    group.scale.setScalar(1.65);
    var crownMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6a45, emissive: 0x2b170b, roughness: 0.36, metalness: 0.56 });
    var voidMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2029, emissive: 0x7b172b, emissiveIntensity: 1.55, roughness: 0.3 });
    var crown = new THREE.Group();
    for (var i = 0; i < 7; i += 1) {
      var angle = i / 7 * Math.PI * 2;
      var spike = mesh(new THREE.ConeGeometry(0.23, 1.5 + (i % 2) * 0.55, 6), crownMaterial);
      spike.position.set(Math.cos(angle) * 0.72, 5.45 + (i % 2) * 0.18, Math.sin(angle) * 0.72);
      spike.rotation.z = Math.cos(angle) * 0.18;
      spike.rotation.x = -Math.sin(angle) * 0.18;
      crown.add(spike);
    }
    var voidCore = mesh(new THREE.OctahedronGeometry(0.5, 0), voidMaterial);
    voidCore.position.set(0, 2.65, -1.58);
    crown.add(voidCore);
    group.add(crown);
    var cloak = mesh(new THREE.ConeGeometry(2.2, 5.4, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a1823, roughness: 0.92, side: THREE.DoubleSide }));
    cloak.position.set(0, 2.4, 0.85);
    cloak.rotation.x = 0.12;
    group.add(cloak);
    setShadows(group);
    return group;
  }

  function addEnemy(type, x, z, scale, guardian) {
    var group = type === "hollowking" ? createHollowKingModel() : type === "warden" ? createWardenModel() : createMosslingModel(scale, type === "brute" ? 0x6c5840 : 0x516946);
    group.position.set(x, worldSurfaceHeight(x, z), z);
    group.rotation.y = seededRandom(x * 2 + z) * Math.PI * 2;
    scene.add(group);
    var hp = type === "hollowking" ? 18 : type === "warden" ? 9 : type === "brute" ? 5 : 3;
    var enemy = {
      id: "enemy-" + enemies.length,
      type: type,
      x: x,
      z: z,
      homeX: x,
      homeZ: z,
      group: group,
      hp: hp,
      maxHp: hp,
      speed: type === "hollowking" ? 5.3 : type === "warden" ? 4.6 : type === "brute" ? 3.8 : 5.2,
      damage: type === "hollowking" ? 2 : type === "warden" ? 2 : 1,
      radius: type === "hollowking" ? 4.2 : type === "warden" ? 2.7 : type === "brute" ? 1.6 : 1.1,
      state: "patrol",
      stateTime: 0,
      phase: seededRandom(x + z) * 10,
      attackReady: 0,
      dead: false,
      guardian: Boolean(guardian)
    };
    enemies.push(enemy);
    if (guardian) ruinGuardian = enemy;
    if (type === "hollowking") hollowKing = enemy;
    return enemy;
  }

  function createCamp(x, z) {
    var group = new THREE.Group();
    group.position.set(x, terrainHeight(x, z), z);
    var wood = material(0x4c3525, 1);
    for (var i = 0; i < 6; i += 1) {
      var angle = i / 6 * Math.PI * 2;
      var spike = mesh(new THREE.ConeGeometry(0.25, 3.8, 6), wood);
      spike.position.set(Math.cos(angle) * 6.5, 1.8, Math.sin(angle) * 6.5);
      spike.rotation.z = Math.cos(angle) * 0.35;
      spike.rotation.x = Math.sin(angle) * 0.35;
      group.add(spike);
    }
    var emberMaterial = new THREE.MeshStandardMaterial({ color: 0xff8b3d, emissive: 0xd84b12, emissiveIntensity: 1.5 });
    var fire = mesh(new THREE.ConeGeometry(0.65, 1.7, 8), emberMaterial, false);
    fire.position.y = 0.9;
    fire.userData.campfire = true;
    group.add(fire);
    var ringMaterial = material(0x55544d, 1);
    for (var s = 0; s < 8; s += 1) {
      var a = s / 8 * Math.PI * 2;
      var rock = mesh(new THREE.DodecahedronGeometry(0.48, 0), ringMaterial);
      rock.position.set(Math.cos(a) * 1.45, 0.3, Math.sin(a) * 1.45);
      group.add(rock);
    }
    scene.add(group);
  }

  function createEnemyPopulation() {
    var camps = [
      { x: 176, z: -121, count: 4 },
      { x: 284, z: -246, count: 5 },
      { x: -514, z: -160, count: 4 },
      { x: 365, z: 270, count: 5 },
      { x: -740, z: 520, count: 6 }
    ];
    camps.forEach(function (camp, campIndex) {
      createCamp(camp.x, camp.z);
      for (var i = 0; i < camp.count; i += 1) {
        var angle = i / camp.count * Math.PI * 2;
        addEnemy(i === camp.count - 1 && camp.count > 4 ? "brute" : "mossling", camp.x + Math.cos(angle) * (8 + i), camp.z + Math.sin(angle) * (8 + i), i % 3 === 0 ? 1.18 : 1);
      }
    });
    for (var n = 0; n < 28; n += 1) {
      var x = -900 + seededRandom(n * 37 + 4) * 1800;
      var z = -850 + seededRandom(n * 43 + 7) * 1700;
      if (isRiver(x, z) || roadDistance(x, z) < 16 || distance2D(x, z, -278, 165) < 150 || distance2D(x, z, -92, 32) < 150) continue;
      addEnemy(n % 9 === 0 ? "brute" : "mossling", x, z, n % 5 === 0 ? 1.2 : 0.95);
    }
    addEnemy("warden", 446, -468, 1, true);
    addEnemy("hollowking", 950, -820, 1, false);
  }

  function createFirstPersonRig() {
    firstPersonRig = new THREE.Group();
    firstPersonRig.position.set(0.08, -0.7, -0.95);
    firstPersonRig.scale.setScalar(0.72);
    camera.add(firstPersonRig);
    var skin = material(0xb9865f, 0.76);
    var sleeve = material(0x246b64, 0.9);
    var leather = material(0x5d4029, 0.92);
    var metal = material(0xc9d6cc, 0.28, 0.72);
    var gold = material(0xcaa957, 0.44, 0.45);

    [-1, 1].forEach(function (side) {
      var arm = mesh(new THREE.CylinderGeometry(0.095, 0.14, 0.72, 9), sleeve, false);
      arm.rotation.z = side * 0.42;
      arm.rotation.x = -0.35;
      arm.position.set(side * 0.48, -0.24, -0.05);
      firstPersonRig.add(arm);
      var hand = mesh(new THREE.SphereGeometry(0.14, 10, 7), skin, false);
      hand.position.set(side * 0.31, -0.52, -0.22);
      firstPersonRig.add(hand);
    });

    swordRig = new THREE.Group();
    var blade = mesh(new THREE.BoxGeometry(0.11, 1.48, 0.08), metal, false);
    blade.position.y = 0.68;
    swordRig.add(blade);
    var tip = mesh(new THREE.ConeGeometry(0.075, 0.28, 4), metal, false);
    tip.position.y = 1.55;
    swordRig.add(tip);
    var guard = mesh(new THREE.BoxGeometry(0.62, 0.09, 0.12), gold, false);
    guard.position.y = -0.12;
    swordRig.add(guard);
    var grip = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.52, 8), leather, false);
    grip.position.y = -0.4;
    swordRig.add(grip);
    swordRig.position.set(0.38, -0.25, -0.36);
    swordRig.rotation.set(-0.08, -0.08, -0.5);
    swordRig.scale.setScalar(0.8);
    firstPersonRig.add(swordRig);

    gripGlow = mesh(new THREE.SphereGeometry(0.23, 12, 9), new THREE.MeshStandardMaterial({ color: 0x75ead4, emissive: 0x1b9c8b, emissiveIntensity: 2, transparent: true, opacity: 0 }), false);
    gripGlow.position.set(-0.32, -0.42, -0.42);
    firstPersonRig.add(gripGlow);

    horseView = new THREE.Group();
    var horseDark = material(0x3b2c27, 0.95);
    [-1, 1].forEach(function (side) {
      var ear = mesh(new THREE.ConeGeometry(0.12, 0.7, 7), horseDark, false);
      ear.position.set(side * 0.42, -0.16, -1.48);
      horseView.add(ear);
    });
    var reins = mesh(new THREE.TorusGeometry(0.52, 0.025, 5, 24, Math.PI), leather, false);
    reins.rotation.set(Math.PI / 2, 0, Math.PI);
    reins.position.set(0, -0.5, -1.22);
    horseView.add(reins);
    horseView.visible = false;
    camera.add(horseView);

    gliderView = new THREE.Group();
    var gliderWood = material(0x66503a, 0.9);
    var gliderCloth = material(0xb59155, 0.92);
    addBox(gliderView, [2.7, 0.08, 0.12], [0, 0, 0], gliderWood);
    var leftWing = addBox(gliderView, [1.38, 0.06, 0.82], [-0.68, -0.07, 0.18], gliderCloth, [0.08, 0, 0.12]);
    var rightWing = addBox(gliderView, [1.38, 0.06, 0.82], [0.68, -0.07, 0.18], gliderCloth, [0.08, 0, -0.12]);
    leftWing.castShadow = false;
    rightWing.castShadow = false;
    gliderView.position.set(0, 0.82, -1.15);
    gliderView.visible = false;
    camera.add(gliderView);

    [firstPersonRig, horseView, gliderView].forEach(function (overlay) {
      overlay.traverse(function (object) {
        object.renderOrder = 999;
        object.frustumCulled = false;
        if (!object.material) return;
        var materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(function (overlayMaterial) {
          overlayMaterial.depthTest = false;
          overlayMaterial.depthWrite = false;
        });
      });
    });
  }

  function createSoundEngine() {
    var audioContext = null;
    var master = null;
    var windSource = null;
    var windGain = null;

    function ensure() {
      if (!audioContext) {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        audioContext = new AudioContext();
        master = audioContext.createGain();
        master.gain.value = state && state.soundOn ? 0.6 : 0;
        master.connect(audioContext.destination);
        startWind();
      }
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    }

    function startWind() {
      if (!audioContext || windSource) return;
      var length = audioContext.sampleRate * 2;
      var buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
      var data = buffer.getChannelData(0);
      var last = 0;
      for (var i = 0; i < length; i += 1) {
        var white = Math.random() * 2 - 1;
        last = last * 0.985 + white * 0.015;
        data[i] = last;
      }
      windSource = audioContext.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      var filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 750;
      windGain = audioContext.createGain();
      windGain.gain.value = 0.12;
      windSource.connect(filter).connect(windGain).connect(master);
      windSource.start();
    }

    function tone(frequency, duration, type, volume, endFrequency, delay) {
      var ctx = ensure();
      if (!ctx || !state.soundOn) return;
      var now = ctx.currentTime + (delay || 0);
      var oscillator = ctx.createOscillator();
      var gain = ctx.createGain();
      oscillator.type = type || "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume || 0.08, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);
    }

    function noise(duration, volume, cutoff, delay) {
      var ctx = ensure();
      if (!ctx || !state.soundOn) return;
      var count = Math.floor(ctx.sampleRate * duration);
      var buffer = ctx.createBuffer(1, count, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < count; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / count);
      var source = ctx.createBufferSource();
      source.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = cutoff || 1100;
      var gain = ctx.createGain();
      var now = ctx.currentTime + (delay || 0);
      gain.gain.setValueAtTime(volume || 0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter).connect(gain).connect(master);
      source.start(now);
    }

    return {
      ensure: ensure,
      setEnabled: function (enabled) {
        ensure();
        if (master) master.gain.setTargetAtTime(enabled ? 0.6 : 0, audioContext.currentTime, 0.03);
      },
      step: function (mounted, water) {
        if (water) { noise(0.12, 0.06, 420); tone(120, 0.08, "sine", 0.025, 80); }
        else if (mounted) { noise(0.08, 0.08, 260); tone(92, 0.05, "triangle", 0.05, 70); }
        else { noise(0.08, 0.035, 520); tone(145, 0.045, "triangle", 0.018, 105); }
      },
      sword: function () { noise(0.18, 0.1, 1900); tone(340, 0.13, "sawtooth", 0.035, 120); },
      hit: function () { noise(0.13, 0.12, 580); tone(105, 0.18, "square", 0.045, 58); },
      hurt: function () { noise(0.24, 0.14, 260); tone(170, 0.28, "sawtooth", 0.065, 65); },
      monster: function (big) { tone(big ? 72 : 115, big ? 0.7 : 0.38, "sawtooth", big ? 0.07 : 0.045, big ? 38 : 72); },
      grip: function () { tone(330, 0.16, "sine", 0.055, 590); tone(660, 0.2, "triangle", 0.03, 880, 0.08); },
      attach: function () { tone(440, 0.13, "triangle", 0.05, 620); tone(660, 0.2, "sine", 0.05, 990, 0.12); },
      rotate: function () { tone(285, 0.09, "triangle", 0.026, 365); },
      jump: function () { tone(190, 0.13, "sine", 0.028, 310); },
      dialogue: function () { tone(420, 0.055, "triangle", 0.023, 500); },
      quest: function () { [392, 494, 587].forEach(function (f, i) { tone(f, 0.35, "triangle", 0.045, f * 1.04, i * 0.12); }); },
      victory: function () { [262, 330, 392, 523, 659].forEach(function (f, i) { tone(f, 0.55, "triangle", 0.06, f * 1.03, i * 0.15); }); },
      bird: function () { tone(1200 + Math.random() * 500, 0.08, "sine", 0.015, 1600 + Math.random() * 500); tone(1400, 0.07, "sine", 0.012, 1850, 0.11); },
      setWaterWind: function (riverNear) {
        if (windGain && audioContext) windGain.gain.setTargetAtTime(riverNear ? 0.18 : 0.11, audioContext.currentTime, 0.4);
      }
    };
  }

  function objectiveForStage() {
    return questText[Math.min(state.questStage, questText.length - 1)];
  }

  function setQuestStage(stage, message) {
    if (stage <= state.questStage) return;
    state.questStage = stage;
    objectiveElement.textContent = objectiveForStage();
    if (message) showToast(message, 4.2);
    sound.quest();
  }

  function showToast(text, seconds) {
    state.toast = text;
    state.toastUntil = state.time + (seconds || 2.5);
    promptElement.textContent = text;
    promptElement.classList.remove("hidden");
  }

  function requestMouseLock() {
    if (touchDevice || navigator.webdriver || !canvas.requestPointerLock || !document.hasFocus()) return;
    try {
      var result = canvas.requestPointerLock();
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (error) {
      // Mouse-drag look remains available when pointer lock is not supported.
    }
  }

  function closeAllDialogs() {
    [pauseDialog, respawnDialog, victoryDialog].forEach(function (dialog) {
      if (dialog.open) dialog.close();
    });
  }

  function startGame() {
    sound.ensure();
    state.mode = "playing";
    state.mapOpen = false;
    startScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    touchControls.classList.toggle("hidden", !touchDevice);
    closeAllDialogs();
    updateHud();
    showToast(touchDevice ? "Drag the view to look around" : "Click the world for mouse look", 3.6);
    requestMouseLock();
    canvas.focus();
  }

  function resetAdventure() {
    state.questStage = 0;
    state.enemiesDefeated = 0;
    state.partsAttached = 0;
    state.regionsVisited = new Set();
    state.dialogue = null;
    state.heldPart = null;
    state.player.x = -430;
    state.player.z = 330;
    state.player.y = worldSurfaceHeight(-430, 330);
    state.player.vy = 0;
    state.player.yaw = -0.87;
    state.player.pitch = -0.04;
    state.player.health = state.player.maxHealth;
    state.player.stamina = 100;
    state.player.mounted = false;
    state.player.distance = 0;
    state.player.respawnX = -430;
    state.player.respawnZ = 330;
    horse.mounted = false;
    horse.group.visible = true;
    horse.x = horse.homeX;
    horse.z = horse.homeZ;
    horse.group.position.set(horse.x, terrainHeight(horse.x, horse.z), horse.z);
    enemies.forEach(function (enemy) {
      enemy.dead = false;
      enemy.hp = enemy.maxHp;
      enemy.x = enemy.homeX;
      enemy.z = enemy.homeZ;
      enemy.state = "patrol";
      enemy.stateTime = 0;
      enemy.group.visible = true;
      enemy.group.position.set(enemy.x, worldSurfaceHeight(enemy.x, enemy.z), enemy.z);
    });
    buildParts.forEach(function (part) {
      part.attached = false;
      part.rotation = part.original.rotation;
      part.group.rotation.set(0, part.rotation, 0);
      part.group.position.set(part.original.x, terrainHeight(part.original.x, part.original.z) + part.height * 0.6, part.original.z);
      part.body.material.emissive.setHex(0x000000);
    });
    beacon.active = false;
    beacon.beam.material.opacity = 0;
    beacon.crystal.material.emissive.setHex(0x164d4a);
    if (elaraNpc && elaraNpc.prisonSeal) elaraNpc.prisonSeal.visible = true;
    startGame();
  }

  function pauseGame() {
    if (state.mode !== "playing" || state.mapOpen || state.dialogue) return;
    state.mode = "paused";
    keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    if (!pauseDialog.open) pauseDialog.showModal();
  }

  function resumeGame() {
    if (pauseDialog.open) pauseDialog.close();
    state.mode = "playing";
    requestMouseLock();
  }

  function toggleMap(force) {
    if (state.mode !== "playing" && !state.mapOpen) return;
    state.mapOpen = force == null ? !state.mapOpen : Boolean(force);
    mapOverlay.classList.toggle("hidden", !state.mapOpen);
    keys.clear();
    if (state.mapOpen) {
      if (document.pointerLockElement) document.exitPointerLock();
      drawWorldMap();
    } else if (state.mode === "playing") {
      requestMouseLock();
    }
  }

  function openDialogue(npc) {
    state.dialogue = npc;
    state.dialogueIndex = 0;
    keys.clear();
    speakerName.textContent = npc.name;
    dialogueText.textContent = npc.lines[0];
    dialogueBox.classList.remove("hidden");
    sound.dialogue();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function advanceDialogue() {
    if (!state.dialogue) return;
    state.dialogueIndex += 1;
    if (state.dialogueIndex < state.dialogue.lines.length) {
      dialogueText.textContent = state.dialogue.lines[state.dialogueIndex];
      sound.dialogue();
      return;
    }
    var completedNpc = state.dialogue;
    state.dialogue = null;
    dialogueBox.classList.add("hidden");
    if (completedNpc.type === "stable" && state.questStage === 0) {
      state.player.health = state.player.maxHealth;
      state.player.respawnX = -271;
      state.player.respawnZ = 144;
      setQuestStage(1, "MAIN QUEST • The road to Stormwake has begun");
    } else if (completedNpc.type === "stable") {
      state.player.health = state.player.maxHealth;
      state.player.stamina = 100;
      showToast("Rested at Bramblewick • hearts restored", 2.8);
    } else if (completedNpc.type === "elara" && hollowKing && hollowKing.dead) {
      completeVictory();
    }
    requestMouseLock();
  }

  function nearestNpc(maxDistance) {
    var nearest = null;
    var best = maxDistance == null ? 5.2 : maxDistance;
    npcs.forEach(function (npc) {
      var d = distance2D(state.player.x, state.player.z, npc.x, npc.z);
      if (d < best) { best = d; nearest = npc; }
    });
    return nearest;
  }

  function nearestBuildPart(maxDistance, omitHeld) {
    var nearest = null;
    var best = maxDistance == null ? 7 : maxDistance;
    buildParts.forEach(function (part) {
      if (omitHeld && part === state.heldPart) return;
      var d = distance2D(state.player.x, state.player.z, part.group.position.x, part.group.position.z);
      if (d < best) { best = d; nearest = part; }
    });
    return nearest;
  }

  function interact() {
    if (state.mode !== "playing" || state.mapOpen) return;
    if (state.dialogue) {
      advanceDialogue();
      return;
    }
    if (state.player.mounted) {
      dismountHorse();
      return;
    }
    var npc = nearestNpc(5.4);
    if (npc) {
      if (npc.type === "elara" && hollowKing && !hollowKing.dead) {
        showToast("The Hollow King's seal still binds the prison", 2.2);
        sound.monster(true);
        return;
      }
      if (npc.type === "stable" && state.questStage > 0) {
        openDialogue({ name: npc.name, type: "stable", lines: ["Welcome back, Ryn. The fire is warm and Ashwind is ready. Your hearts are restored."] });
      } else {
        openDialogue(npc);
      }
      return;
    }
    if (horse && !horse.mounted && distance2D(state.player.x, state.player.z, horse.x, horse.z) < 5.4) {
      mountHorse();
      return;
    }
    if (beacon && state.questStage >= 3 && distance2D(state.player.x, state.player.z, beacon.x, beacon.z) < 7.5) {
      activateBeacon();
      return;
    }
    showToast("Nothing nearby to use", 1.2);
  }

  function mountHorse() {
    state.player.mounted = true;
    horse.mounted = true;
    horse.group.visible = false;
    horseView.visible = true;
    sound.quest();
    showToast("Riding Ashwind • hold SHIFT to gallop • E to dismount", 3.2);
  }

  function dismountHorse() {
    state.player.mounted = false;
    horse.mounted = false;
    horse.x = state.player.x + Math.cos(state.player.yaw) * 2.8;
    horse.z = state.player.z - Math.sin(state.player.yaw) * 2.8;
    horse.group.position.set(horse.x, terrainHeight(horse.x, horse.z), horse.z);
    horse.group.rotation.y = state.player.yaw;
    horse.group.visible = true;
    horseView.visible = false;
    showToast("Ashwind will wait nearby", 1.8);
  }

  function gripPart() {
    if (state.mode !== "playing" || state.dialogue || state.mapOpen) return;
    if (state.player.mounted || state.player.swimming) {
      showToast("Stand on solid ground to use Aether Grip", 1.8);
      return;
    }
    if (state.heldPart) {
      dropHeldPart();
      return;
    }
    var part = nearestBuildPart(8, true);
    if (!part) {
      showToast("No loose building part within reach", 1.6);
      return;
    }
    state.heldPart = part;
    part.attached = false;
    part.body.material.emissive.setHex(0x1b776c);
    sound.grip();
    showToast("AETHER GRIP • Q drop • R turn • X attach", 2.5);
  }

  function dropHeldPart() {
    var part = state.heldPart;
    if (!part) return;
    state.heldPart = null;
    var x = part.group.position.x;
    var z = part.group.position.z;
    var ground = isRiver(x, z) ? WATER_LEVEL + part.height * 0.38 : terrainHeight(x, z) + part.height * 0.55;
    part.group.position.y = ground;
    part.body.material.emissive.setHex(part.attached ? 0x173d34 : 0x000000);
    sound.grip();
  }

  function rotateHeldPart() {
    if (!state.heldPart) return;
    state.heldPart.rotation += Math.PI / 8;
    state.heldPart.group.rotation.y = state.heldPart.rotation;
    sound.rotate();
  }

  function attachHeldPart() {
    if (!state.heldPart) {
      showToast("Grip a log or plank first", 1.5);
      return;
    }
    var held = state.heldPart;
    var target = null;
    var best = 6.5;
    buildParts.forEach(function (part) {
      if (part === held) return;
      var d = distance2D(held.group.position.x, held.group.position.z, part.group.position.x, part.group.position.z);
      if (d < best) { best = d; target = part; }
    });
    if (!target) {
      showToast("Move the part closer to another piece", 1.6);
      return;
    }
    held.rotation = target.rotation;
    held.group.rotation.y = held.rotation;
    var directionX = Math.cos(target.rotation);
    var directionZ = -Math.sin(target.rotation);
    var spacing = (target.length + held.length) * 0.49;
    held.group.position.x = target.group.position.x + directionX * spacing;
    held.group.position.z = target.group.position.z + directionZ * spacing;
    held.group.position.y = target.group.position.y;
    held.attached = true;
    target.attached = true;
    state.partsAttached += 1;
    held.body.material.emissive.setHex(0x173d34);
    target.body.material.emissive.setHex(0x173d34);
    state.heldPart = null;
    sound.attach();
    showToast("Pieces joined! Your crossing can support Ryn.", 2.6);
  }

  function attack() {
    if (state.mode !== "playing" || state.dialogue || state.mapOpen || state.time < state.player.attackReady) return;
    state.player.attackReady = state.time + (state.player.mounted ? 0.62 : 0.44);
    state.player.attackAnim = 1;
    sound.sword();
    var forwardX = -Math.sin(state.player.yaw);
    var forwardZ = -Math.cos(state.player.yaw);
    var hit = false;
    enemies.forEach(function (enemy) {
      if (enemy.dead) return;
      var dx = enemy.x - state.player.x;
      var dz = enemy.z - state.player.z;
      var distance = Math.hypot(dx, dz);
      var reach = state.player.mounted ? 5.2 : 4.3;
      var dot = distance > 0 ? (dx / distance) * forwardX + (dz / distance) * forwardZ : 1;
      if (distance < reach + enemy.radius && dot > 0.18) {
        hurtEnemy(enemy, state.player.mounted ? 2 : 1);
        hit = true;
      }
    });
    if (!hit) spawnSpark(state.player.x + forwardX * 2.3, state.player.y + 1, state.player.z + forwardZ * 2.3, 0xe9efcf, 3);
  }

  function hurtEnemy(enemy, damage) {
    if (enemy.dead) return;
    enemy.hp -= damage;
    enemy.state = "stunned";
    enemy.stateTime = 0.32;
    sound.hit();
    spawnSpark(enemy.x, terrainHeight(enemy.x, enemy.z) + enemy.radius + 0.9, enemy.z, enemy.type === "warden" ? 0x7ff5dd : 0xd9ee79, enemy.type === "warden" ? 16 : 9);
    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.group.visible = false;
      state.enemiesDefeated += 1;
      if (enemy.guardian) setQuestStage(3, "The Warden falls • the beacon is ready");
      else if (enemy.type === "hollowking") {
        setQuestStage(6, "THE HOLLOW KING FALLS • free Elara from the throne prison");
        if (elaraNpc && elaraNpc.prisonSeal) elaraNpc.prisonSeal.visible = false;
      }
      else showToast(enemy.type === "brute" ? "Thornback defeated" : "Mossling defeated", 1.3);
    }
  }

  function damagePlayer(amount, source) {
    if (state.mode !== "playing" || state.time < state.player.hurtUntil) return;
    state.player.health = Math.max(0, state.player.health - amount);
    state.player.hurtUntil = state.time + 1.05;
    sound.hurt();
    showToast(source || "Ryn was hurt!", 1.6);
    if (state.player.health <= 0) {
      state.mode = "fallen";
      keys.clear();
      if (state.player.mounted) dismountHorse();
      if (document.pointerLockElement) document.exitPointerLock();
      setTimeout(function () {
        if (!respawnDialog.open) respawnDialog.showModal();
      }, 120);
    }
  }

  function respawnPlayer() {
    if (respawnDialog.open) respawnDialog.close();
    state.player.x = state.player.respawnX;
    state.player.z = state.player.respawnZ;
    state.player.y = worldSurfaceHeight(state.player.x, state.player.z);
    state.player.vy = 0;
    state.player.health = state.player.maxHealth;
    state.player.stamina = 100;
    state.player.hurtUntil = state.time + 1;
    state.mode = "playing";
    enemies.forEach(function (enemy) {
      if (!enemy.dead && distance2D(enemy.x, enemy.z, state.player.x, state.player.z) < 35) {
        enemy.x = enemy.homeX;
        enemy.z = enemy.homeZ;
      }
    });
    showToast("The safe fire restores Ryn", 2.5);
    requestMouseLock();
  }

  function activateBeacon() {
    if (beacon.active) return;
    beacon.active = true;
    beacon.beam.material.opacity = 0.58;
    beacon.crystal.material.emissive.setHex(0x42d9c2);
    setQuestStage(4, "The Stormwall opens • Elara's trail continues east");
    sound.victory();
    showToast("A new golden road shines toward the Hollow Citadel", 4.4);
  }

  function completeVictory() {
    if (state.mode === "victory") return;
    state.questStage = 7;
    objectiveElement.textContent = objectiveForStage();
    sound.victory();
    state.mode = "victory";
    keys.clear();
    victoryStats.textContent = state.enemiesDefeated + " creatures defeated • " + state.regionsVisited.size + " regions found • " + Math.round(state.player.distance) + " m travelled";
    if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(function () {
      if (!victoryDialog.open) victoryDialog.showModal();
    }, 700);
  }

  function spawnSpark(x, y, z, color, count) {
    for (var i = 0; i < count; i += 1) {
      var spark = mesh(new THREE.OctahedronGeometry(0.09 + Math.random() * 0.08, 0), new THREE.MeshBasicMaterial({ color: color }), false);
      spark.position.set(x, y, z);
      scene.add(spark);
      particles.push({
        mesh: spark,
        vx: (Math.random() - 0.5) * 5,
        vy: 2 + Math.random() * 5,
        vz: (Math.random() - 0.5) * 5,
        life: 0.45 + Math.random() * 0.45
      });
    }
  }

  function isBlockedAt(x, z) {
    for (var i = 0; i < staticColliders.length; i += 1) {
      if (distance2D(x, z, staticColliders[i].x, staticColliders[i].z) < staticColliders[i].radius + 0.7) return true;
    }
    return false;
  }

  function updatePlayer(dt) {
    var player = state.player;
    if (state.mode !== "playing" || state.dialogue || state.mapOpen) return;
    if (keys.has("ArrowLeft")) player.yaw += dt * 1.9;
    if (keys.has("ArrowRight")) player.yaw -= dt * 1.9;
    player.pitch = clamp(player.pitch, -1.18, 1.08);
    var forwardInput = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    var strafeInput = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    if (touchDevice) {
      forwardInput += -joystickVector.y;
      strafeInput += joystickVector.x;
    }
    var inputLength = Math.hypot(forwardInput, strafeInput);
    if (inputLength > 1) { forwardInput /= inputLength; strafeInput /= inputLength; }
    var forwardX = -Math.sin(player.yaw);
    var forwardZ = -Math.cos(player.yaw);
    var rightX = Math.cos(player.yaw);
    var rightZ = -Math.sin(player.yaw);
    var moving = Math.abs(forwardInput) + Math.abs(strafeInput) > 0.08;
    var sprinting = moving && (keys.has("ShiftLeft") || keys.has("ShiftRight")) && player.stamina > 1 && !player.swimming;
    var speed = player.mounted ? (sprinting ? 30 : 19) : player.swimming ? 4.7 : sprinting ? 16.5 : 10.2;
    if (player.gliding) speed = 13;
    if (sprinting) player.stamina = Math.max(0, player.stamina - dt * (player.mounted ? 7 : 18));
    else if (!player.swimming) player.stamina = Math.min(100, player.stamina + dt * 13);
    var dx = (forwardX * forwardInput + rightX * strafeInput) * speed * dt;
    var dz = (forwardZ * forwardInput + rightZ * strafeInput) * speed * dt;
    var oldX = player.x;
    var oldZ = player.z;
    var nextX = clamp(player.x + dx, -HALF_WORLD + 5, HALF_WORLD - 5);
    var nextZ = clamp(player.z + dz, -HALF_WORLD + 5, HALF_WORLD - 5);
    if (!isBlockedAt(nextX, player.z)) player.x = nextX;
    if (!isBlockedAt(player.x, nextZ)) player.z = nextZ;
    var moved = distance2D(oldX, oldZ, player.x, player.z);
    player.distance += moved;
    var riverNow = isRiver(player.x, player.z);
    var surface = worldSurfaceHeight(player.x, player.z, player.y);
    player.swimming = riverNow && player.y <= WATER_LEVEL + 0.8 && !player.mounted;
    if (player.mounted && riverNow && Math.abs(player.x - riverCenter(player.z)) < RIVER_HALF_WIDTH - 3 && surface < WATER_LEVEL + 1) {
      player.x = oldX;
      player.z = oldZ;
      showToast("Ashwind needs a bridge or a shallower crossing", 1.5);
    }
    if (player.swimming) {
      player.y = WATER_LEVEL - 0.2;
      player.vy = 0;
      player.onGround = false;
      player.stamina = Math.max(0, player.stamina - dt * (moving ? 8 : 3));
      if (player.stamina <= 0) damagePlayer(1, "The current pulls Ryn under!");
    } else {
      player.vy -= 22 * dt;
      if (player.gliding && player.vy < -2.2 && player.stamina > 0) {
        player.vy = -2.2;
        player.stamina = Math.max(0, player.stamina - dt * 9);
      }
      player.y += player.vy * dt;
      if (player.y <= surface) {
        player.y = surface;
        player.vy = 0;
        player.onGround = true;
        player.gliding = false;
      } else {
        player.onGround = false;
      }
    }
    if (moving) {
      player.stepTimer -= dt;
      if (player.stepTimer <= 0) {
        sound.step(player.mounted, player.swimming);
        player.stepTimer = player.mounted ? (sprinting ? 0.22 : 0.34) : sprinting ? 0.28 : player.swimming ? 0.52 : 0.43;
      }
    } else {
      player.stepTimer = Math.min(player.stepTimer, 0.12);
    }
    if (player.attackAnim > 0) player.attackAnim = Math.max(0, player.attackAnim - dt * 3.7);
    if (state.questStage === 1 && player.x > riverCenter(player.z) + RIVER_HALF_WIDTH + 8 && player.z < 100) {
      setQuestStage(2, "Silverrun crossed • Stormwake Ruin lies southeast");
      player.respawnX = player.x;
      player.respawnZ = player.z;
    }
    if (player.y < -15) damagePlayer(5, "Ryn fell into the depths");
  }

  function jumpOrGlide() {
    var player = state.player;
    if (state.mode !== "playing" || state.dialogue || state.mapOpen || player.mounted || player.swimming) return;
    if (player.onGround) {
      player.vy = 8.8;
      player.onGround = false;
      sound.jump();
    } else if (player.vy < 1 && player.stamina > 3) {
      player.gliding = true;
      showToast("Windcloth open • hold SPACE to glide", 1.4);
    }
  }

  function updateHeldPart() {
    if (!state.heldPart) {
      gripGlow.material.opacity = lerp(gripGlow.material.opacity, 0, 0.18);
      return;
    }
    var part = state.heldPart;
    var forwardX = -Math.sin(state.player.yaw) * Math.cos(state.player.pitch);
    var forwardZ = -Math.cos(state.player.yaw) * Math.cos(state.player.pitch);
    var targetX = state.player.x + forwardX * 6.2;
    var targetZ = state.player.z + forwardZ * 6.2;
    var targetY = state.player.y + PLAYER_EYE + Math.sin(state.player.pitch) * 4.5 - 0.4;
    part.group.position.x = lerp(part.group.position.x, targetX, 0.22);
    part.group.position.y = lerp(part.group.position.y, targetY, 0.22);
    part.group.position.z = lerp(part.group.position.z, targetZ, 0.22);
    part.group.rotation.y = part.rotation;
    gripGlow.material.opacity = 0.86;
  }

  function updateNpcs(dt) {
    npcs.forEach(function (npc) {
      if (npc.path && npc.path.length > 1 && distance2D(npc.x, npc.z, state.player.x, state.player.z) < 230) {
        npc.pathTime += dt * 0.14;
        var pointIndex = Math.floor(npc.pathTime) % npc.path.length;
        var nextIndex = (pointIndex + 1) % npc.path.length;
        var t = npc.pathTime - Math.floor(npc.pathTime);
        var targetX = lerp(npc.path[pointIndex].x, npc.path[nextIndex].x, t);
        var targetZ = lerp(npc.path[pointIndex].z, npc.path[nextIndex].z, t);
        var angle = Math.atan2(targetX - npc.x, targetZ - npc.z);
        npc.x = lerp(npc.x, targetX, dt * 2.2);
        npc.z = lerp(npc.z, targetZ, dt * 2.2);
        npc.group.rotation.y = angle;
      }
      npc.group.position.set(npc.x, (npc.homeY == null ? terrainHeight(npc.x, npc.z) : npc.homeY) + Math.sin(state.time * 2 + npc.x) * 0.015, npc.z);
    });
  }

  function updateHorse(dt) {
    if (!horse) return;
    if (horse.mounted) {
      horse.x = state.player.x;
      horse.z = state.player.z;
      return;
    }
    var playerNear = distance2D(horse.x, horse.z, state.player.x, state.player.z) < 120;
    if (playerNear) {
      horse.phase += dt;
      var targetX = horse.homeX + Math.sin(horse.phase * 0.32) * 10;
      var targetZ = horse.homeZ + Math.cos(horse.phase * 0.27) * 8;
      var dx = targetX - horse.x;
      var dz = targetZ - horse.z;
      var length = Math.hypot(dx, dz);
      if (length > 0.4) {
        horse.x += dx / length * dt * 1.2;
        horse.z += dz / length * dt * 1.2;
        horse.group.rotation.y = Math.atan2(dx, dz);
      }
    }
    horse.group.position.set(horse.x, terrainHeight(horse.x, horse.z), horse.z);
  }

  function updateEnemies(dt) {
    enemies.forEach(function (enemy) {
      if (enemy.dead) return;
      var distance = distance2D(enemy.x, enemy.z, state.player.x, state.player.z);
      if (distance > 260) return;
      if (enemy.type === "hollowking" && distance < 78 && state.questStage >= 4 && state.questStage < 5) {
        setQuestStage(5, "FINAL BATTLE • defeat the Hollow King");
      }
      enemy.stateTime -= dt;
      if (enemy.state === "stunned") {
        if (enemy.stateTime <= 0) enemy.state = "chase";
      } else if (enemy.state === "windup") {
        enemy.group.rotation.z = Math.sin(state.time * 19) * 0.08;
        if (enemy.stateTime <= 0) {
          if (distance < enemy.radius + 3.1) damagePlayer(enemy.damage, enemy.type === "hollowking" ? "The Hollow King's void blade strikes!" : enemy.type === "warden" ? "The Warden's hammer strikes!" : "A Mossling hits Ryn!");
          enemy.state = "recover";
          enemy.stateTime = enemy.type === "hollowking" ? 1.05 : enemy.type === "warden" ? 1.25 : 0.75;
        }
      } else if (enemy.state === "recover") {
        if (enemy.stateTime <= 0) enemy.state = "chase";
      } else if (distance < (enemy.type === "hollowking" ? 68 : enemy.type === "warden" ? 48 : 24)) {
        enemy.state = "chase";
        if (distance < enemy.radius + 2.35 && state.time >= enemy.attackReady) {
          enemy.state = "windup";
          enemy.stateTime = enemy.type === "hollowking" ? 1.05 : enemy.type === "warden" ? 0.9 : 0.58;
          enemy.attackReady = state.time + (enemy.type === "hollowking" ? 2.3 : enemy.type === "warden" ? 2.7 : 1.8);
          sound.monster(enemy.type === "warden" || enemy.type === "hollowking");
        } else if (distance > enemy.radius + 2) {
          var dx = state.player.x - enemy.x;
          var dz = state.player.z - enemy.z;
          var length = Math.hypot(dx, dz) || 1;
          var speed = enemy.speed * (state.player.mounted ? 1.08 : 1);
          var nextX = enemy.x + dx / length * speed * dt;
          var nextZ = enemy.z + dz / length * speed * dt;
          if (!isRiver(nextX, nextZ)) {
            enemy.x = nextX;
            enemy.z = nextZ;
          }
          enemy.group.rotation.y = Math.atan2(-dx, -dz);
        }
      } else {
        enemy.state = "patrol";
        var targetX = enemy.homeX + Math.cos(state.time * 0.19 + enemy.phase) * 7;
        var targetZ = enemy.homeZ + Math.sin(state.time * 0.16 + enemy.phase) * 7;
        var pdx = targetX - enemy.x;
        var pdz = targetZ - enemy.z;
        var plength = Math.hypot(pdx, pdz) || 1;
        enemy.x += pdx / plength * enemy.speed * 0.22 * dt;
        enemy.z += pdz / plength * enemy.speed * 0.22 * dt;
        enemy.group.rotation.y = Math.atan2(-pdx, -pdz);
      }
      enemy.group.position.set(enemy.x, worldSurfaceHeight(enemy.x, enemy.z) + Math.abs(Math.sin(state.time * 3 + enemy.phase)) * 0.05, enemy.z);
      if (enemy.state !== "windup") enemy.group.rotation.z = lerp(enemy.group.rotation.z, 0, 0.15);
    });
  }

  function updateParticles(dt) {
    particles.forEach(function (particle) {
      particle.life -= dt;
      particle.vy -= dt * 10;
      particle.mesh.position.x += particle.vx * dt;
      particle.mesh.position.y += particle.vy * dt;
      particle.mesh.position.z += particle.vz * dt;
      particle.mesh.rotation.x += dt * 8;
      particle.mesh.rotation.y += dt * 6;
      particle.mesh.scale.setScalar(clamp(particle.life * 2, 0, 1));
    });
    particles = particles.filter(function (particle) {
      if (particle.life > 0) return true;
      scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
      return false;
    });
  }

  function updateWorldVisuals(dt) {
    cloudGroups.forEach(function (cloud) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > HALF_WORLD + 350) cloud.position.x = -HALF_WORLD - 350;
    });
    foliageMeshes.forEach(function (foliage, index) {
      foliage.position.x = Math.sin(state.time * 0.65 + index) * 0.035;
      foliage.position.z = Math.cos(state.time * 0.52 + index) * 0.025;
    });
    if (waterMaterial) {
      waterMaterial.opacity = 0.78 + Math.sin(state.time * 1.7) * 0.035;
      waterMaterial.shininess = 95 + Math.sin(state.time * 0.8) * 18;
    }
    if (beacon) {
      beacon.crystal.rotation.y += dt * (beacon.active ? 1.8 : 0.5);
      beacon.crystal.position.y = 10 + Math.sin(state.time * 1.8) * 0.32;
      if (beacon.active) beacon.beam.material.opacity = 0.48 + Math.sin(state.time * 2.5) * 0.1;
    }
    scene.traverse(function (object) {
      if (object.userData && object.userData.campfire) {
        object.scale.y = 0.82 + Math.sin(state.time * 9 + object.id) * 0.2;
        object.rotation.y += dt * 1.3;
      }
    });
    updateParticles(dt);
    if (Math.floor(state.time) % 13 === 4 && Math.floor((state.time - dt) * 2) !== Math.floor(state.time * 2)) sound.bird();
    sound.setWaterWind(Math.abs(state.player.x - riverCenter(state.player.z)) < 70);
  }

  function updateFirstPersonRig() {
    if (!firstPersonRig) return;
    firstPersonRig.visible = state.mode === "playing" || state.mode === "victory";
    var moving = keys.has("KeyW") || keys.has("KeyS") || keys.has("KeyA") || keys.has("KeyD") || keys.has("ArrowUp") || Math.hypot(joystickVector.x, joystickVector.y) > 0.1;
    var pace = state.player.mounted ? 10 : keys.has("ShiftLeft") ? 13 : 8;
    var bob = moving && state.player.onGround ? Math.sin(state.time * pace) : 0;
    firstPersonRig.position.x = 0.08 + bob * 0.018;
    firstPersonRig.position.y = -0.7 + Math.abs(bob) * 0.018;
    if (state.player.attackAnim > 0) {
      var progress = 1 - state.player.attackAnim;
      var swing = Math.sin(progress * Math.PI);
      swordRig.rotation.x = -0.08 - swing * 1.18;
      swordRig.rotation.y = -0.08 + swing * 0.78;
      swordRig.rotation.z = -0.5 - swing * 0.72;
      swordRig.position.x = 0.38 - swing * 0.42;
    } else {
      swordRig.rotation.x = lerp(swordRig.rotation.x, -0.08 + bob * 0.025, 0.18);
      swordRig.rotation.y = lerp(swordRig.rotation.y, -0.08, 0.18);
      swordRig.rotation.z = lerp(swordRig.rotation.z, -0.5, 0.18);
      swordRig.position.x = lerp(swordRig.position.x, 0.38, 0.18);
    }
    horseView.visible = state.player.mounted;
    horseView.position.y = state.player.mounted ? Math.abs(Math.sin(state.time * 8)) * 0.06 : 0;
    if (gliderView) {
      gliderView.visible = state.player.gliding;
      gliderView.rotation.z = Math.sin(state.time * 2.4) * 0.025;
    }
  }

  function updateCamera() {
    if (!camera) return;
    camera.position.set(state.player.x, state.player.y + PLAYER_EYE + (state.player.mounted ? 1.28 : 0), state.player.z);
    camera.rotation.y = state.player.yaw;
    camera.rotation.x = state.player.pitch;
    camera.rotation.z = state.player.hurtUntil > state.time ? Math.sin(state.time * 42) * 0.018 : 0;
    sunLight.position.set(state.player.x - 260, 430, state.player.z - 330);
    sunLight.target.position.set(state.player.x, 0, state.player.z);
    sunLight.target.updateMatrixWorld();
    if (skyDome) skyDome.position.set(state.player.x, 0, state.player.z);
    if (sunMesh) sunMesh.position.set(state.player.x - 420, 470, state.player.z - 720);
  }

  function updateSector() {
    var col = clamp(Math.floor((state.player.x + HALF_WORLD) / (WORLD_SIZE / 4)), 0, 3);
    var row = clamp(Math.floor((state.player.z + HALF_WORLD) / (WORLD_SIZE / 4)), 0, 3);
    var name = sectorNames[row][col];
    if (name !== state.currentSector) {
      state.currentSector = name;
      regionElement.textContent = name;
      if (!state.regionsVisited.has(name)) showToast(name, 2.2);
    }
    state.regionsVisited.add(name);
  }

  function updatePrompt() {
    if (state.toastUntil > state.time) return;
    if (state.dialogue) {
      promptElement.classList.add("hidden");
      return;
    }
    var text = "";
    var npc = nearestNpc(5.3);
    if (npc) text = "E / ENTER • Talk to " + npc.name.split(",")[0];
    else if (state.player.mounted) text = "E / ENTER • Dismount Ashwind";
    else if (horse && distance2D(state.player.x, state.player.z, horse.x, horse.z) < 5.4) text = "E / ENTER • Ride Ashwind";
    else if (beacon && state.questStage >= 3 && distance2D(state.player.x, state.player.z, beacon.x, beacon.z) < 7.5) text = "E / ENTER • Awaken the beacon";
    else if (state.heldPart) text = "Q drop • R turn • X attach";
    else if (nearestBuildPart(7, true)) text = "Q / B • Lift with Aether Grip";
    if (text) {
      promptElement.textContent = text;
      promptElement.classList.remove("hidden");
    } else {
      promptElement.classList.add("hidden");
    }
  }

  function updateHud() {
    var hearts = "";
    for (var i = 0; i < state.player.maxHealth; i += 1) hearts += i < state.player.health ? "♥ " : "♡ ";
    heartsElement.textContent = hearts.trim();
    staminaFill.style.width = clamp(state.player.stamina, 0, 100) + "%";
    objectiveElement.textContent = objectiveForStage();
    regionElement.textContent = state.currentSector;
    var nearbyBoss = null;
    [ruinGuardian, hollowKing].forEach(function (boss) {
      if (!boss || boss.dead) return;
      var range = boss.type === "hollowking" ? 90 : 72;
      if (distance2D(state.player.x, state.player.z, boss.x, boss.z) < range) nearbyBoss = boss;
    });
    if (nearbyBoss) {
      bossName.textContent = nearbyBoss.type === "hollowking" ? "THE HOLLOW KING" : "STORMWAKE WARDEN";
      bossHealthFill.style.width = clamp(nearbyBoss.hp / nearbyBoss.maxHp * 100, 0, 100) + "%";
      bossHud.classList.remove("hidden");
    } else {
      bossHud.classList.add("hidden");
    }
    updatePrompt();
  }

  function worldToMap(x, z, width, height) {
    return {
      x: (x + HALF_WORLD) / WORLD_SIZE * width,
      y: (z + HALF_WORLD) / WORLD_SIZE * height
    };
  }

  function drawRiverOnMap(context, width, height, local) {
    context.beginPath();
    var steps = local ? 45 : 140;
    for (var i = 0; i <= steps; i += 1) {
      var z;
      var x;
      if (local) {
        z = state.player.z - 120 + i / steps * 240;
        x = riverCenter(z);
        var lx = width / 2 + (x - state.player.x) / 240 * width;
        var ly = height / 2 + (z - state.player.z) / 240 * height;
        if (i === 0) context.moveTo(lx, ly); else context.lineTo(lx, ly);
      } else {
        z = -HALF_WORLD + i / steps * WORLD_SIZE;
        x = riverCenter(z);
        var map = worldToMap(x, z, width, height);
        if (i === 0) context.moveTo(map.x, map.y); else context.lineTo(map.x, map.y);
      }
    }
    context.strokeStyle = local ? "#67c4cf" : "#3c8f9f";
    context.lineWidth = local ? 11 : 12;
    context.stroke();
  }

  function drawMinimap() {
    var ctx = minimapContext;
    var w = minimapCanvas.width;
    var h = minimapCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#668d5f";
    ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 50; i += 1) {
      var tx = seededRandom(i * 7 + Math.floor(state.player.x / 180)) * w;
      var ty = seededRandom(i * 11 + Math.floor(state.player.z / 180)) * h;
      ctx.fillStyle = "rgba(42,92,57,.38)";
      ctx.beginPath();
      ctx.arc(tx, ty, 2 + seededRandom(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    drawRiverOnMap(ctx, w, h, true);
    ctx.beginPath();
    roadPoints.forEach(function (point, index) {
      var x = w / 2 + (point.x - state.player.x) / 240 * w;
      var y = h / 2 + (point.z - state.player.z) / 240 * h;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#c0a16b";
    ctx.lineWidth = 5;
    ctx.stroke();
    [{ x: -278, z: 165, icon: "S" }, { x: -92, z: 32, icon: "V" }, { x: 446, z: -438, icon: "✦" }, { x: 980, z: -850, icon: "♛" }].forEach(function (marker) {
      var x = w / 2 + (marker.x - state.player.x) / 240 * w;
      var y = h / 2 + (marker.z - state.player.z) / 240 * h;
      if (x > 5 && x < w - 5 && y > 5 && y < h - 5) {
        ctx.fillStyle = "#fff0a2";
        ctx.font = "bold 15px Georgia";
        ctx.textAlign = "center";
        ctx.fillText(marker.icon, x, y + 5);
      }
    });
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-state.player.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 5);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fillStyle = "#fff6bd";
    ctx.fill();
    ctx.strokeStyle = "#193b31";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawWorldMap() {
    var ctx = worldMapContext;
    var w = worldMapCanvas.width;
    var h = worldMapCanvas.height;
    ctx.clearRect(0, 0, w, h);
    var palette = ["#526f58", "#6f875d", "#7c8c5d", "#899271"];
    for (var row = 0; row < 4; row += 1) {
      for (var col = 0; col < 4; col += 1) {
        ctx.fillStyle = palette[(row + col) % palette.length];
        ctx.fillRect(col * w / 4, row * h / 4, w / 4 + 1, h / 4 + 1);
        ctx.strokeStyle = "rgba(60,65,45,.42)";
        ctx.strokeRect(col * w / 4, row * h / 4, w / 4, h / 4);
        ctx.fillStyle = "rgba(239,227,180,.82)";
        ctx.font = "bold 11px Trebuchet MS";
        ctx.textAlign = "center";
        ctx.fillText(sectorNames[row][col], (col + 0.5) * w / 4, (row + 0.88) * h / 4);
      }
    }
    for (var i = 0; i < 240; i += 1) {
      ctx.fillStyle = i % 3 ? "rgba(38,74,47,.26)" : "rgba(30,67,44,.4)";
      ctx.beginPath();
      ctx.arc(seededRandom(i * 17) * w, seededRandom(i * 31) * h, 1 + seededRandom(i) * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    drawRiverOnMap(ctx, w, h, false);
    ctx.beginPath();
    roadPoints.forEach(function (point, index) {
      var map = worldToMap(point.x, point.z, w, h);
      if (index === 0) ctx.moveTo(map.x, map.y); else ctx.lineTo(map.x, map.y);
    });
    ctx.strokeStyle = "#c5a36c";
    ctx.lineWidth = 6;
    ctx.stroke();
    var markers = [
      { x: -278, z: 165, label: "Bramblewick Stable" },
      { x: -92, z: 32, label: "Wayfarer Village" },
      { x: 446, z: -438, label: "Stormwake Ruin" },
      { x: 980, z: -850, label: "Hollow Citadel" }
    ];
    markers.forEach(function (marker) {
      var m = worldToMap(marker.x, marker.z, w, h);
      ctx.fillStyle = "#f7e5a1";
      ctx.strokeStyle = "#3b4934";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#28372b";
      ctx.font = "bold 12px Georgia";
      var rightEdge = m.x > w - 145;
      ctx.textAlign = rightEdge ? "right" : "left";
      ctx.fillText(marker.label, m.x + (rightEdge ? -11 : 11), m.y + 4);
    });
    var playerMap = worldToMap(state.player.x, state.player.z, w, h);
    ctx.fillStyle = "#fff7c0";
    ctx.strokeStyle = "#173e34";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(playerMap.x, playerMap.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function update(dt) {
    state.time += dt;
    if (state.mode === "playing" && !state.mapOpen) {
      updatePlayer(dt);
      updateHeldPart();
      updateNpcs(dt);
      updateHorse(dt);
      updateEnemies(dt);
      updateSector();
    }
    updateWorldVisuals(dt);
    updateFirstPersonRig();
    updateCamera();
    updateHud();
  }

  function render() {
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    drawMinimap();
  }

  function frame(now) {
    animationFrame = requestAnimationFrame(frame);
    var dt = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    if (now > manualStepUntil) update(dt || FIXED_STEP);
    render();
  }

  function resize() {
    if (!renderer || !camera) return;
    var width = canvas.clientWidth || 960;
    var height = canvas.clientHeight || 600;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.5 : 2));
    renderer.setSize(width, height, false);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      var request = frameElement.requestFullscreen || frameElement.webkitRequestFullscreen;
      if (request) request.call(frameElement);
    } else {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }

  function handleKeyDown(event) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Escape"].includes(event.code)) event.preventDefault();
    if (state.mode === "title" && (event.code === "Enter" || event.code === "Space")) {
      startGame();
      return;
    }
    if (event.code === "Escape") {
      if (state.mapOpen) toggleMap(false);
      else if (state.dialogue) advanceDialogue();
      else if (state.mode === "playing") pauseGame();
      else if (state.mode === "paused") resumeGame();
      return;
    }
    if (event.repeat && ["KeyE", "Enter", "KeyF", "KeyQ", "KeyB", "KeyR", "KeyX", "KeyM"].includes(event.code)) return;
    keys.add(event.code);
    if (event.code === "Space") jumpOrGlide();
    else if (event.code === "KeyF") attack();
    else if (event.code === "KeyE" || event.code === "Enter") interact();
    else if (event.code === "KeyQ" || event.code === "KeyB") gripPart();
    else if (event.code === "KeyR") rotateHeldPart();
    else if (event.code === "KeyX") attachHeldPart();
    else if (event.code === "KeyM") toggleMap();
    else if (event.code === "Backspace" && state.heldPart) { event.preventDefault(); dropHeldPart(); }
  }

  function handleKeyUp(event) {
    keys.delete(event.code);
    if (event.code === "Space") state.player.gliding = false;
  }

  function applyLook(dx, dy, touch) {
    var sensitivity = touch ? 0.0046 : 0.00235;
    state.player.yaw -= dx * sensitivity;
    state.player.pitch -= dy * sensitivity;
    state.player.pitch = clamp(state.player.pitch, -1.18, 1.08);
  }

  function bindPointerControls() {
    canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    canvas.addEventListener("mousedown", function (event) {
      if (state.mode !== "playing" || state.mapOpen || state.dialogue) return;
      if (event.button === 0) attack();
      if (event.button === 2) gripPart();
      mouseDragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      if (!document.pointerLockElement) requestMouseLock();
    });
    window.addEventListener("mouseup", function () { mouseDragging = false; });
    window.addEventListener("mousemove", function (event) {
      if (state.mode !== "playing" || state.mapOpen || state.dialogue) return;
      if (document.pointerLockElement === canvas) applyLook(event.movementX, event.movementY, false);
      else if (mouseDragging) {
        applyLook(event.clientX - lastPointerX, event.clientY - lastPointerY, false);
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
      }
    });

    canvas.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" || state.mode !== "playing" || state.mapOpen || state.dialogue) return;
      if (event.clientX < innerWidth * 0.28 || event.clientX > innerWidth * 0.73) return;
      lookPointer = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", function (event) {
      if (event.pointerId !== lookPointer) return;
      applyLook(event.clientX - lastPointerX, event.clientY - lastPointerY, true);
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    });
    function releaseLook(event) {
      if (event.pointerId === lookPointer) lookPointer = null;
    }
    canvas.addEventListener("pointerup", releaseLook);
    canvas.addEventListener("pointercancel", releaseLook);
  }

  function bindTouchControls() {
    var joystick = document.getElementById("joystick");
    var knob = document.getElementById("joystick-knob");
    function updateJoystick(event) {
      var rect = joystick.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = event.clientX - cx;
      var dy = event.clientY - cy;
      var max = rect.width * 0.31;
      var distance = Math.hypot(dx, dy);
      if (distance > max) { dx = dx / distance * max; dy = dy / distance * max; }
      joystickVector.x = dx / max;
      joystickVector.y = dy / max;
      knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
    }
    joystick.addEventListener("pointerdown", function (event) {
      joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      updateJoystick(event);
    });
    joystick.addEventListener("pointermove", function (event) {
      if (event.pointerId === joystickPointer) updateJoystick(event);
    });
    function releaseJoystick(event) {
      if (event.pointerId !== joystickPointer) return;
      joystickPointer = null;
      joystickVector.x = 0;
      joystickVector.y = 0;
      knob.style.transform = "translate(-50%, -50%)";
    }
    joystick.addEventListener("pointerup", releaseJoystick);
    joystick.addEventListener("pointercancel", releaseJoystick);

    document.querySelectorAll("[data-action]").forEach(function (button) {
      var action = button.dataset.action;
      if (action === "sprint") {
        button.addEventListener("pointerdown", function (event) {
          event.preventDefault();
          keys.add("ShiftLeft");
          button.setPointerCapture(event.pointerId);
        });
        ["pointerup", "pointercancel"].forEach(function (name) {
          button.addEventListener(name, function () { keys.delete("ShiftLeft"); });
        });
      } else {
        button.addEventListener("pointerdown", function (event) {
          event.preventDefault();
          if (action === "jump") jumpOrGlide();
          else if (action === "attack") attack();
          else if (action === "interact") interact();
          else if (action === "grip") gripPart();
          else if (action === "rotate") rotateHeldPart();
          else if (action === "attach") attachHeldPart();
        });
        if (action === "jump") button.addEventListener("pointerup", function () { state.player.gliding = false; });
      }
    });
  }

  function bindUi() {
    startButton.addEventListener("click", startGame);
    resumeButton.addEventListener("click", resumeGame);
    respawnButton.addEventListener("click", respawnPlayer);
    playAgainButton.addEventListener("click", function () { if (victoryDialog.open) victoryDialog.close(); resetAdventure(); });
    pauseButton.addEventListener("click", function () {
      if (state.mode === "playing") pauseGame();
      else if (state.mode === "paused") resumeGame();
    });
    mapButton.addEventListener("click", function () { toggleMap(); });
    closeMapButton.addEventListener("click", function () { toggleMap(false); });
    soundButton.addEventListener("click", function () {
      state.soundOn = !state.soundOn;
      soundButton.textContent = state.soundOn ? "🔊" : "🔇";
      soundButton.setAttribute("aria-label", state.soundOn ? "Turn sound off" : "Turn sound on");
      sound.setEnabled(state.soundOn);
    });
    fullscreenButton.addEventListener("click", toggleFullscreen);
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", function () { setTimeout(resize, 50); });
    bindPointerControls();
    bindTouchControls();
  }

  function renderGameToText() {
    var nearbyEnemies = enemies.filter(function (enemy) {
      return !enemy.dead && distance2D(enemy.x, enemy.z, state.player.x, state.player.z) < 45;
    }).slice(0, 8).map(function (enemy) {
      return { id: enemy.id, type: enemy.type, x: Math.round(enemy.x), z: Math.round(enemy.z), hp: enemy.hp, state: enemy.state };
    });
    var nearbyNpcs = npcs.filter(function (npc) {
      return distance2D(npc.x, npc.z, state.player.x, state.player.z) < 45;
    }).slice(0, 5).map(function (npc) {
      return { name: npc.name, x: Math.round(npc.x), z: Math.round(npc.z), type: npc.type };
    });
    var nearbyParts = buildParts.filter(function (part) {
      return distance2D(part.group.position.x, part.group.position.z, state.player.x, state.player.z) < 30;
    }).map(function (part) {
      return { id: part.id, type: part.type, x: Math.round(part.group.position.x), z: Math.round(part.group.position.z), attached: part.attached, held: part === state.heldPart };
    });
    return JSON.stringify({
      coordinateSystem: "World metres; x increases east/right, z increases south/down on map, y increases upward.",
      mode: state.mode,
      view: "firstPerson3d",
      world: { width: WORLD_SIZE, depth: WORLD_SIZE, regions: 16, currentRegion: state.currentSector, regionsVisited: state.regionsVisited.size },
      player: {
        hero: "Ryn",
        x: Math.round(state.player.x * 10) / 10,
        y: Math.round(state.player.y * 10) / 10,
        z: Math.round(state.player.z * 10) / 10,
        yaw: Math.round(state.player.yaw * 100) / 100,
        health: state.player.health,
        stamina: Math.round(state.player.stamina),
        grounded: state.player.onGround,
        swimming: state.player.swimming,
        gliding: state.player.gliding,
        mounted: state.player.mounted
      },
      quest: { stage: state.questStage, objective: objectiveForStage(), rescueTarget: "Elara", finalThreat: "The Hollow King" },
      horse: horse ? { name: horse.name, x: Math.round(horse.x), z: Math.round(horse.z), mounted: horse.mounted } : null,
      interaction: state.dialogue ? { speaker: state.dialogue.name, line: state.dialogueIndex } : null,
      heldPart: state.heldPart ? state.heldPart.id : null,
      nearby: { npcs: nearbyNpcs, enemies: nearbyEnemies, buildingParts: nearbyParts },
      totals: { livingEnemies: enemies.filter(function (enemy) { return !enemy.dead; }).length, enemiesDefeated: state.enemiesDefeated, trees: 2600 },
      controls: "WASD/arrows move; mouse or drag look; Shift sprint; Space jump/glide; left click or F attack; E/Enter interact; Q/B grip; R rotate; X attach; M map; Esc pause."
    });
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = function (milliseconds) {
    var steps = Math.max(1, Math.round(milliseconds / (1000 / 60)));
    for (var i = 0; i < steps; i += 1) update(FIXED_STEP);
    manualStepUntil = performance.now() + 220;
    render();
  };

  window.__wildbound_test = {
    teleport: function (x, z, yaw) {
      state.player.x = clamp(Number(x), -HALF_WORLD + 5, HALF_WORLD - 5);
      state.player.z = clamp(Number(z), -HALF_WORLD + 5, HALF_WORLD - 5);
      state.player.y = worldSurfaceHeight(state.player.x, state.player.z) + 0.02;
      state.player.vy = 0;
      state.player.onGround = true;
      state.player.swimming = false;
      if (Number.isFinite(yaw)) state.player.yaw = yaw;
      updateSector();
      updateCamera();
      updateHud();
      render();
    },
    face: function (x, z) {
      var dx = Number(x) - state.player.x;
      var dz = Number(z) - state.player.z;
      state.player.yaw = Math.atan2(-dx, -dz);
      state.player.pitch = 0;
      updateCamera();
      render();
    },
    setQuestStage: function (stage) {
      state.questStage = clamp(Math.floor(Number(stage)), 0, 7);
      updateHud();
    },
    defeatGuardian: function () {
      if (ruinGuardian && !ruinGuardian.dead) hurtEnemy(ruinGuardian, ruinGuardian.hp);
    },
    defeatHollowKing: function () {
      if (hollowKing && !hollowKing.dead) hurtEnemy(hollowKing, hollowKing.hp);
    },
    damagePlayer: damagePlayer,
    attack: attack,
    interact: interact,
    grip: gripPart,
    attach: attachHeldPart,
    snapshot: renderGameToText
  };

  function init() {
    try {
      initRenderer();
      createWorld();
      bindUi();
      resize();
      drawWorldMap();
      updateHud();
      loadingNote.textContent = "Realm ready • 2,400 × 2,400 metres • 16 regions";
      clock = new THREE.Clock();
      lastFrameTime = performance.now();
      animationFrame = requestAnimationFrame(frame);
    } catch (error) {
      console.error(error);
      webglError.textContent = "The 3D realm could not start: " + error.message;
      webglError.classList.remove("hidden");
    }
  }

  init();
}());
