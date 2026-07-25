import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js";

const inputCanvas = document.getElementById("game");
const shell = document.getElementById("game-shell");
const badge = document.getElementById("graphics-badge");
const touchDevice = matchMedia("(pointer: coarse)").matches;

const HOUSE_DEFS = [
  { x: 3, z: 3, w: 10, d: 9, theme: 1, floor: 0xd9b776 },
  { x: 22, z: 3, w: 11, d: 10, theme: 2, floor: 0xc5d8df },
  { x: 46, z: 3, w: 11, d: 10, theme: 3, floor: 0xdfc5a2 },
  { x: 3, z: 23, w: 11, d: 10, theme: 4, floor: 0xc8d8b5 },
  { x: 22, z: 23, w: 12, d: 10, theme: 1, floor: 0xd7b5c9 },
  { x: 46, z: 23, w: 11, d: 10, theme: 2, floor: 0xc8d4e6 },
  { x: 3, z: 45, w: 12, d: 11, theme: 3, floor: 0xdec48f },
  { x: 23, z: 45, w: 11, d: 11, theme: 4, floor: 0xbed9d6 },
  { x: 44, z: 45, w: 13, d: 11, theme: 1, floor: 0xd9bdce },
];

const WALL_COLORS = [0x796d68, 0xef745f, 0xe2b74c, 0x55a7b7, 0x8d73c8, 0x75818d];
const ROOF_COLORS = [0x34465b, 0x7e3546, 0x3c6083, 0x276a68, 0x614383, 0x4d5968];
const actorModels = new Map();
const decalMeshes = [];
const tracerPool = [];
const splatMaterials = new Map();
const animatedClouds = [];
const shared = {};

let api;
let state;
let arena;
let renderer;
let webglCanvas;
let scene;
let camera;
let worldRoot;
let characterRoot;
let decalRoot;
let tracerRoot;
let weaponRoot;
let handgunView;
let longgunView;
let playerMuzzle;
let lastFrame = performance.now();
let lastPlayerX = 0;
let lastPlayerZ = 0;
let playerSpeed = 0;
let cameraBob = 0;
let resizeObserver;

function waitForGame(attempt = 0) {
  if (window.PaintWar?.getState && window.PaintWar?.getArena) {
    start3D();
    return;
  }
  if (attempt < 300) requestAnimationFrame(() => waitForGame(attempt + 1));
}

function start3D() {
  try {
    api = window.PaintWar;
    state = api.getState();
    arena = api.getArena();
    initRenderer();
    initScene();
    buildWorld();
    buildFirstPersonWeapons();
    buildTracerPool();
    state.graphics3d = true;
    window.PaintWar3DActive = true;
    inputCanvas.classList.add("paint-war-input-layer");
    if (badge) badge.hidden = false;
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
    window.addEventListener("resize", resize);
    window.PaintWar3D = {
      ready: true,
      renderer,
      scene,
      camera,
      getStats: () => ({
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        actors: actorModels.size,
        decals: decalMeshes.length,
      }),
    };
    requestAnimationFrame(frame);
  } catch (error) {
    window.PaintWar3DActive = false;
    state && (state.graphics3d = false);
    inputCanvas.classList.remove("paint-war-input-layer");
    renderer?.dispose?.();
    webglCanvas?.remove();
    webglCanvas = null;
    if (badge) badge.hidden = true;
    console.warn("Paint War använder sin 2D-reserv eftersom WebGL 3D inte kunde starta.", error);
  }
}

function initRenderer() {
  webglCanvas = document.createElement("canvas");
  webglCanvas.id = "game-3d";
  webglCanvas.setAttribute("aria-hidden", "true");
  inputCanvas.insertAdjacentElement("afterend", webglCanvas);
  renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: Boolean(navigator.webdriver),
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touchDevice ? 1.25 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x85d9ff);
  scene.fog = new THREE.Fog(0xa8dded, 42, 105);
  camera = new THREE.PerspectiveCamera(73, 16 / 9, 0.035, 150);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const hemisphere = new THREE.HemisphereLight(0xc8efff, 0x405b34, 1.85);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffefd1, 2.65);
  sun.position.set(-30, 48, -26);
  sun.castShadow = true;
  const shadowSize = touchDevice ? 1024 : 1536;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.00035;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0x78bfff, 0.55);
  fill.position.set(30, 18, 42);
  scene.add(fill);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(125, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x2799e8) },
        horizonColor: { value: new THREE.Color(0xd8f6ff) },
        sunsetColor: { value: new THREE.Color(0xffd7a0) },
      },
      vertexShader: `
        varying vec3 worldPos;
        void main() {
          vec4 p = modelMatrix * vec4(position, 1.0);
          worldPos = p.xyz;
          gl_Position = projectionMatrix * viewMatrix * p;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 sunsetColor;
        varying vec3 worldPos;
        void main() {
          vec3 d = normalize(worldPos - cameraPosition);
          float h = smoothstep(-0.08, 0.72, d.y);
          float sunGlow = pow(max(0.0, dot(d, normalize(vec3(-0.55, 0.48, -0.42)))), 22.0);
          vec3 color = mix(horizonColor, topColor, h);
          color = mix(color, sunsetColor, sunGlow * 0.42);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    }),
  );
  sky.frustumCulled = false;
  scene.add(sky);

  worldRoot = new THREE.Group();
  characterRoot = new THREE.Group();
  decalRoot = new THREE.Group();
  tracerRoot = new THREE.Group();
  scene.add(worldRoot, characterRoot, decalRoot, tracerRoot);
}

function canvasTexture(size, paint, repeatX = 1, repeatY = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const context = c.getContext("2d");
  paint(context, size);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function pseudoRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function prepareSharedAssets() {
  const randomGrass = pseudoRandom(1439);
  shared.grassTexture = canvasTexture(256, (c, size) => {
    c.fillStyle = "#5f9852";
    c.fillRect(0, 0, size, size);
    for (let i = 0; i < 3600; i += 1) {
      const light = randomGrass() > 0.5;
      c.fillStyle = light ? "rgba(186,230,125,.17)" : "rgba(25,78,35,.16)";
      const x = randomGrass() * size;
      const y = randomGrass() * size;
      c.fillRect(x, y, 1 + randomGrass() * 2, 2 + randomGrass() * 4);
    }
  }, 18, 18);

  const randomRoad = pseudoRandom(8241);
  shared.roadTexture = canvasTexture(192, (c, size) => {
    c.fillStyle = "#4b5662";
    c.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i += 1) {
      const v = 70 + Math.floor(randomRoad() * 45);
      c.fillStyle = `rgba(${v},${v + 4},${v + 9},.18)`;
      c.fillRect(randomRoad() * size, randomRoad() * size, 1.3, 1.3);
    }
  }, 3, 14);

  shared.splatTexture = canvasTexture(128, (c, size) => {
    c.clearRect(0, 0, size, size);
    c.translate(size / 2, size / 2);
    c.fillStyle = "#fff";
    c.beginPath();
    const points = 18;
    for (let i = 0; i < points; i += 1) {
      const a = i / points * Math.PI * 2;
      const radius = size * (0.31 + ((i * 17) % 7) * 0.018);
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
    [[-43, -15, 8], [39, -29, 6], [45, 22, 5], [-30, 39, 5], [3, -48, 4]].forEach(([x, y, r]) => {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    });
  });

  shared.grassMaterial = new THREE.MeshStandardMaterial({
    map: shared.grassTexture,
    color: 0xffffff,
    roughness: 0.96,
  });
  shared.roadMaterial = new THREE.MeshStandardMaterial({
    map: shared.roadTexture,
    color: 0xffffff,
    roughness: 0.9,
  });
  shared.sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0xb9c2c1, roughness: 0.9 });
  shared.lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffdc5f, roughness: 0.65 });
  shared.crosswalkMaterial = new THREE.MeshStandardMaterial({ color: 0xf3f6eb, roughness: 0.75 });
  shared.windowFrame = new THREE.MeshStandardMaterial({ color: 0x213e51, roughness: 0.42, metalness: 0.25 });
  shared.glass = new THREE.MeshPhysicalMaterial({
    color: 0x65d7ff,
    transparent: true,
    opacity: 0.24,
    roughness: 0.1,
    metalness: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  shared.dark = new THREE.MeshStandardMaterial({ color: 0x25313b, roughness: 0.78 });
  shared.skin = new THREE.MeshStandardMaterial({ color: 0xe8b284, roughness: 0.82 });
  shared.hair = new THREE.MeshStandardMaterial({ color: 0x3a241e, roughness: 0.92 });
  shared.eye = new THREE.MeshStandardMaterial({
    color: 0xeefaff,
    emissive: 0x8ddcff,
    emissiveIntensity: 1.6,
    roughness: 0.24,
  });
  shared.treeTrunk = new THREE.MeshStandardMaterial({ color: 0x76513a, roughness: 1 });
  shared.treeLeaf = new THREE.MeshStandardMaterial({ color: 0x43a849, roughness: 0.95 });
  shared.metal = new THREE.MeshStandardMaterial({ color: 0x4e6070, roughness: 0.38, metalness: 0.62 });
  shared.lampGlow = new THREE.MeshStandardMaterial({
    color: 0xfff5bc,
    emissive: 0xffd75a,
    emissiveIntensity: 3.8,
    roughness: 0.2,
  });
}

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  // Små statiska detaljer tar emot skuggor men kastar dem inte. De stora
  // instansierade väggarna, taken, träden och människorna aktiverar skuggor
  // uttryckligen, vilket håller iPad-versionen snabb.
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function buildWorld() {
  prepareSharedAssets();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(66, 66), shared.grassMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(32, -0.03, 32);
  ground.receiveShadow = true;
  worldRoot.add(ground);

  addRoad(17, 32, 4.2, 64);
  addRoad(39.5, 32, 5.3, 64);
  addRoad(32, 17.5, 64, 5.2);
  addRoad(32, 39, 64, 6.2);
  addRoadMarkings();
  buildWalls();
  buildHouses();
  buildOutroom();
  buildStreetProps();
  buildClouds();
}

function addRoad(x, z, width, depth) {
  const road = box(width, 0.07, depth, shared.roadMaterial, x, 0.015, z);
  road.castShadow = false;
  worldRoot.add(road);
  if (depth > width) {
    worldRoot.add(
      box(0.34, 0.16, depth, shared.sidewalkMaterial, x - width / 2 - 0.2, 0.07, z),
      box(0.34, 0.16, depth, shared.sidewalkMaterial, x + width / 2 + 0.2, 0.07, z),
    );
  } else {
    worldRoot.add(
      box(width, 0.16, 0.34, shared.sidewalkMaterial, x, 0.07, z - depth / 2 - 0.2),
      box(width, 0.16, 0.34, shared.sidewalkMaterial, x, 0.07, z + depth / 2 + 0.2),
    );
  }
}

function addRoadMarkings() {
  for (const x of [17, 39.5]) {
    for (let z = 1.6; z < 64; z += 3.1) {
      worldRoot.add(box(0.12, 0.035, 1.45, shared.lineMaterial, x, 0.075, z));
    }
  }
  for (const z of [17.5, 39]) {
    for (let x = 1.6; x < 64; x += 3.1) {
      worldRoot.add(box(1.45, 0.035, 0.12, shared.lineMaterial, x, 0.076, z));
    }
  }
  for (const [x, z] of [[17, 17.5], [39.5, 17.5], [17, 39], [39.5, 39]]) {
    for (let i = -3; i <= 3; i += 1) {
      worldRoot.add(box(0.28, 0.04, 2.8, shared.crosswalkMaterial, x + i * 0.5, 0.09, z));
    }
  }
}

function wallTexture(color, seed) {
  const random = pseudoRandom(seed);
  const base = new THREE.Color(color);
  return canvasTexture(128, (c, size) => {
    c.fillStyle = `#${base.getHexString()}`;
    c.fillRect(0, 0, size, size);
    c.strokeStyle = "rgba(255,255,255,.16)";
    c.lineWidth = 2;
    for (let y = 0; y <= size; y += 24) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(size, y);
      c.stroke();
      const offset = (y / 24) % 2 ? 19 : 0;
      for (let x = offset; x < size; x += 38) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 24);
        c.stroke();
      }
    }
    for (let i = 0; i < 180; i += 1) {
      c.fillStyle = random() > 0.5 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.045)";
      c.fillRect(random() * size, random() * size, 1 + random() * 4, 1 + random() * 3);
    }
  });
}

function buildWalls() {
  const boxGeometry = new THREE.BoxGeometry(0.98, 2.95, 0.98);
  const capGeometry = new THREE.BoxGeometry(1.01, 0.12, 1.01);
  for (let theme = 0; theme < WALL_COLORS.length; theme += 1) {
    const positions = [];
    for (let z = 0; z <= 64; z += 1) {
      for (let x = 0; x <= 64; x += 1) {
        const index = z * arena.width + x;
        if (arena.cells[index] === 1 && (arena.wallThemes[index] || 0) === theme) positions.push([x + 0.5, z + 0.5]);
      }
    }
    if (!positions.length) continue;
    const material = new THREE.MeshStandardMaterial({
      map: wallTexture(WALL_COLORS[theme], 1907 + theme * 317),
      color: 0xffffff,
      roughness: 0.82,
    });
    const capMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(WALL_COLORS[theme]).offsetHSL(0, 0.04, 0.12),
      roughness: 0.72,
    });
    const walls = new THREE.InstancedMesh(boxGeometry, material, positions.length);
    const caps = new THREE.InstancedMesh(capGeometry, capMaterial, positions.length);
    const matrix = new THREE.Matrix4();
    positions.forEach(([x, z], i) => {
      matrix.makeTranslation(x, 1.475, z);
      walls.setMatrixAt(i, matrix);
      matrix.makeTranslation(x, 3.005, z);
      caps.setMatrixAt(i, matrix);
    });
    walls.castShadow = walls.receiveShadow = true;
    caps.castShadow = caps.receiveShadow = true;
    worldRoot.add(walls, caps);
  }

  for (let z = 0; z <= 64; z += 1) {
    for (let x = 0; x <= 64; x += 1) {
      const index = z * arena.width + x;
      if (arena.cells[index] !== 2) continue;
      const leftRight = Number(arena.cells[index - 1] > 0) + Number(arena.cells[index + 1] > 0);
      const upDown = Number(arena.cells[index - arena.width] > 0) + Number(arena.cells[index + arena.width] > 0);
      addWindow(x + 0.5, z + 0.5, leftRight >= upDown, arena.wallThemes[index] || 0);
    }
  }
}

function addWindow(x, z, horizontal, theme) {
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: WALL_COLORS[theme],
    roughness: 0.8,
  });
  const width = horizontal ? 0.98 : 0.18;
  const depth = horizontal ? 0.18 : 0.98;
  const sideWidth = horizontal ? 0.16 : 0.18;
  const sideDepth = horizontal ? 0.18 : 0.16;
  const sideOffsetX = horizontal ? 0.4 : 0;
  const sideOffsetZ = horizontal ? 0 : 0.4;
  worldRoot.add(
    box(width, 0.58, depth, wallMaterial, x, 0.29, z),
    box(width, 0.46, depth, wallMaterial, x, 2.72, z),
    box(sideWidth, 1.68, sideDepth, wallMaterial, x - sideOffsetX, 1.42, z - sideOffsetZ),
    box(sideWidth, 1.68, sideDepth, wallMaterial, x + sideOffsetX, 1.42, z + sideOffsetZ),
  );
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.35), shared.glass);
  glass.position.set(x, 1.43, z);
  if (!horizontal) glass.rotation.y = Math.PI / 2;
  glass.castShadow = false;
  worldRoot.add(glass);
  const mullion = horizontal
    ? box(0.07, 1.46, 0.08, shared.windowFrame, x, 1.43, z)
    : box(0.08, 1.46, 0.07, shared.windowFrame, x, 1.43, z);
  worldRoot.add(mullion);
}

function buildHouses() {
  HOUSE_DEFS.forEach((house, index) => {
    const floorMaterial = new THREE.MeshStandardMaterial({ color: house.floor, roughness: 0.82 });
    const floor = box(house.w - 1.8, 0.08, house.d - 1.8, floorMaterial,
      house.x + house.w / 2, 0.015, house.z + house.d / 2);
    floor.castShadow = false;
    worldRoot.add(floor);

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: ROOF_COLORS[house.theme],
      roughness: 0.68,
      metalness: 0.08,
    });
    worldRoot.add(box(
      house.w + 0.35,
      0.18,
      house.d + 0.35,
      roofMaterial,
      house.x + house.w / 2,
      3.12,
      house.z + house.d / 2,
    ));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1.45, 4), roofMaterial);
    roof.position.set(house.x + house.w / 2, 3.9, house.z + house.d / 2);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(house.w * 0.72, 1, house.d * 0.72);
    roof.castShadow = roof.receiveShadow = true;
    worldRoot.add(roof);

    const doorX = house.x + Math.floor(house.w / 2);
    const doorZ = house.z + house.d - 1;
    const doorWidth = house.w > 8 ? 1.86 : 0.94;
    worldRoot.add(
      box(0.16, 2.42, 0.28, shared.windowFrame, doorX - doorWidth / 2, 1.21, doorZ + 0.03),
      box(0.16, 2.42, 0.28, shared.windowFrame, doorX + doorWidth / 2, 1.21, doorZ + 0.03),
      box(doorWidth + 0.2, 0.18, 0.3, shared.windowFrame, doorX, 2.38, doorZ + 0.03),
      box(doorWidth + 0.65, 0.16, 0.72, roofMaterial, doorX, 2.62, doorZ + 0.27),
      box(doorWidth + 0.5, 0.08, 0.78, shared.sidewalkMaterial, doorX, 0.04, doorZ + 0.55),
    );
    worldRoot.add(createHouseNumber(index + 1, house.floor, doorX, 2.78, doorZ + 0.54));
  });
}

function createTextSprite(text, foreground = "#ffffff", background = "rgba(10,24,44,.86)") {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 128;
  const context = c.getContext("2d");
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(7, 7, 370, 114, 24);
  context.fill();
  context.strokeStyle = foreground;
  context.lineWidth = 7;
  context.stroke();
  context.fillStyle = foreground;
  context.font = "900 60px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 192, 67);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
  const sprite = new THREE.Sprite(material);
  sprite.userData.texture = texture;
  return sprite;
}

function createHouseNumber(number, color, x, y, z) {
  const sprite = createTextSprite(`${number}`, `#${new THREE.Color(color).getHexString()}`);
  sprite.position.set(x, y, z);
  sprite.scale.set(0.72, 0.24, 1);
  return sprite;
}

function buildOutroom() {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x294862,
    roughness: 0.55,
    metalness: 0.18,
  });
  worldRoot.add(box(5, 0.12, 5, floorMaterial, 70.5, 0, 70.5));
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x34465a,
    roughness: 0.58,
    metalness: 0.2,
  });
  const neonMaterial = new THREE.MeshStandardMaterial({
    color: 0xff58b7,
    emissive: 0xff178f,
    emissiveIntensity: 3.8,
    roughness: 0.25,
  });
  worldRoot.add(
    box(1, 3.1, 7, wallMaterial, 67.5, 1.55, 70.5),
    box(1, 3.1, 7, wallMaterial, 73.5, 1.55, 70.5),
    box(7, 3.1, 1, wallMaterial, 70.5, 1.55, 67.5),
    box(7, 3.1, 1, wallMaterial, 70.5, 1.55, 73.5),
    box(5, 0.15, 5, wallMaterial, 70.5, 3.08, 70.5),
    box(3.8, 0.07, 0.07, neonMaterial, 70.5, 2.62, 68.04),
    box(0.07, 1.9, 0.07, neonMaterial, 68.12, 1.52, 70.5),
    box(0.07, 1.9, 0.07, neonMaterial, 72.88, 1.52, 70.5),
  );
  const sign = createTextSprite("OUTROOM", "#ff77c8", "rgba(14,20,49,.92)");
  sign.position.set(70.5, 2.05, 68.02);
  sign.scale.set(2.4, 0.8, 1);
  worldRoot.add(sign);
  const light = new THREE.PointLight(0x68dfff, 8.5, 10, 1.5);
  light.position.set(70.5, 2.55, 70.5);
  worldRoot.add(light);
  worldRoot.add(
    box(1.8, 0.18, 0.48, shared.windowFrame, 70.5, 0.48, 72.55),
    box(0.18, 0.45, 0.4, shared.windowFrame, 69.8, 0.23, 72.55),
    box(0.18, 0.45, 0.4, shared.windowFrame, 71.2, 0.23, 72.55),
  );
}

function buildStreetProps() {
  const treeSpots = [
    [1.7, 14], [7, 15], [13.2, 14], [21, 15], [29, 15], [35, 13.5],
    [44, 14], [59, 15], [62, 22], [58, 35], [44, 35], [35, 35],
    [21, 35], [8, 36], [2, 41], [13, 43], [21, 43], [35, 44],
    [43, 43], [59, 43], [62, 59], [35, 60], [20, 59], [2, 59],
  ];
  treeSpots.forEach(([x, z], i) => addTree(x, z, 0.85 + (i % 4) * 0.08));

  const lampSpots = [
    [14.4, 9], [20.1, 9], [36.4, 9], [43, 9],
    [14.4, 28], [20.1, 28], [36.4, 28], [43, 28],
    [14.4, 50], [20.1, 50], [36.4, 50], [43, 50],
  ];
  lampSpots.forEach(([x, z], i) => addStreetLamp(x, z, i % 2 ? 1 : -1));

  [[20.8, 21.5, 0x20a4ff], [35.4, 21.5, 0xff466d], [43.5, 35, 0xffd43b], [21, 43.7, 0x5ee06f]]
    .forEach(([x, z, color]) => addPaintBarrels(x, z, color));
}

function addTree(x, z, scale = 1) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.scale.setScalar(scale);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.55, 8), shared.treeTrunk);
  trunk.position.y = 0.78;
  trunk.castShadow = trunk.receiveShadow = true;
  root.add(trunk);
  [[0, 1.9, 0, 0.82], [-0.35, 1.7, 0.08, 0.62], [0.34, 1.72, -0.05, 0.67], [0, 2.28, 0, 0.56]]
    .forEach(([px, py, pz, radius], index) => {
      const leaf = new THREE.Mesh(
        new THREE.IcosahedronGeometry(radius, 1),
        index % 2 ? shared.treeLeaf : new THREE.MeshStandardMaterial({ color: 0x56bd4d, roughness: 0.95 }),
      );
      leaf.position.set(px, py, pz);
      leaf.castShadow = leaf.receiveShadow = true;
      root.add(leaf);
    });
  worldRoot.add(root);
}

function addStreetLamp(x, z, side) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 2.85, 8), shared.metal);
  pole.position.y = 1.43;
  pole.castShadow = true;
  root.add(pole);
  root.add(
    box(0.62, 0.07, 0.07, shared.metal, side * 0.25, 2.78, 0),
    box(0.24, 0.16, 0.24, shared.lampGlow, side * 0.52, 2.68, 0),
  );
  worldRoot.add(root);
}

function addPaintBarrels(x, z, color) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.25 });
  for (let i = 0; i < 3; i += 1) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.72, 14), material);
    barrel.position.set(x + (i % 2) * 0.52, 0.36, z + Math.floor(i / 2) * 0.48);
    barrel.castShadow = barrel.receiveShadow = true;
    worldRoot.add(barrel);
  }
}

function buildClouds() {
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.82,
    roughness: 1,
    depthWrite: false,
  });
  for (let i = 0; i < 10; i += 1) {
    const cloud = new THREE.Group();
    const x = -30 + i * 14;
    const z = 12 + (i * 23) % 72;
    cloud.position.set(x, 17 + (i % 3) * 2.2, z);
    for (let j = 0; j < 5; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.4 + (j % 3) * 0.45, 10, 6), cloudMaterial);
      puff.position.set((j - 2) * 1.45, (j % 2) * 0.45, (j % 3 - 1) * 0.45);
      cloud.add(puff);
    }
    cloud.userData.speed = 0.32 + (i % 4) * 0.07;
    animatedClouds.push(cloud);
    worldRoot.add(cloud);
  }
}

function capsule(radius, length, material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function createActorModel(actor) {
  const root = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: actor.color, roughness: 0.7 });
  const shirtDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(actor.color).offsetHSL(0, 0.05, -0.17),
    roughness: 0.76,
  });
  const paintGlow = new THREE.MeshStandardMaterial({
    color: actor.color,
    emissive: actor.color,
    emissiveIntensity: 0.65,
    roughness: 0.38,
  });

  const torso = box(0.72, 0.76, 0.43, shirt, 0, 1.35, 0);
  torso.geometry.translate(0, 0, 0);
  root.add(torso);
  const chest = box(0.5, 0.13, 0.05, paintGlow, 0, 1.48, -0.24);
  root.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 10), shared.skin);
  head.position.set(0, 2.02, -0.02);
  head.castShadow = head.receiveShadow = true;
  root.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.315, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.54), shared.hair);
  hair.position.set(0, 2.1, -0.01);
  hair.castShadow = true;
  root.add(hair);
  [-0.11, 0.11].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 5), shared.eye);
    eye.position.set(x, 2.06, -0.296);
    root.add(eye);
  });

  const arms = [];
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.46, 1.64, 0);
    const upper = capsule(0.105, 0.48, shirt);
    upper.position.y = -0.34;
    pivot.add(upper);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 7), shared.skin);
    hand.position.y = -0.73;
    hand.castShadow = true;
    pivot.add(hand);
    root.add(pivot);
    arms.push(pivot);
  });

  const legs = [];
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.2, 0.96, 0);
    const leg = capsule(0.13, 0.54, shared.dark);
    leg.position.y = -0.4;
    pivot.add(leg);
    const shoe = box(0.25, 0.14, 0.38, shared.dark, 0, -0.77, -0.07);
    pivot.add(shoe);
    root.add(pivot);
    legs.push(pivot);
  });

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.64, 12), paintGlow);
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 1.34, 0.31);
  tank.castShadow = true;
  root.add(tank);

  const handgun = new THREE.Group();
  handgun.add(
    box(0.16, 0.16, 0.52, shared.metal, 0.28, 1.34, -0.43),
    box(0.14, 0.34, 0.15, shirtDark, 0.28, 1.17, -0.28),
  );
  const handgunMuzzle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 5), shared.lampGlow);
  handgunMuzzle.position.set(0.28, 1.34, -0.73);
  handgunMuzzle.visible = false;
  handgun.add(handgunMuzzle);

  const longgun = new THREE.Group();
  longgun.add(
    box(0.18, 0.18, 0.94, shared.metal, 0, 1.37, -0.53),
    box(0.22, 0.25, 0.34, paintGlow, 0, 1.39, -0.22),
    box(0.13, 0.16, 0.34, shirtDark, 0, 1.18, -0.3),
  );
  const longgunMuzzle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 5), shared.lampGlow);
  longgunMuzzle.position.set(0, 1.37, -1.04);
  longgunMuzzle.visible = false;
  longgun.add(longgunMuzzle);
  root.add(handgun, longgun);

  const paintMarks = [];
  for (let i = 0; i < 6; i += 1) {
    const markMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mark = new THREE.Mesh(new THREE.CircleGeometry(0.075 + (i % 2) * 0.025, 10), markMaterial);
    mark.position.set(((i % 3) - 1) * 0.18, 1.2 + Math.floor(i / 3) * 0.27, -0.225);
    mark.visible = false;
    root.add(mark);
    paintMarks.push(mark);
  }

  const health = createHealthSprite(actor);
  health.position.y = 2.62;
  root.add(health);
  root.userData = {
    actorId: actor.id,
    shirt,
    shirtDark,
    paintGlow,
    arms,
    legs,
    torso,
    handgun,
    longgun,
    handgunMuzzle,
    longgunMuzzle,
    paintMarks,
    health,
    lastHealth: -1,
    lastX: actor.x,
    lastZ: actor.z,
    muzzleTimer: 0,
  };
  root.traverse((child) => {
    if (child.isMesh && !child.isSprite) {
      child.castShadow = child.castShadow !== false;
      child.receiveShadow = true;
    }
  });
  characterRoot.add(root);
  actorModels.set(actor.id, root);
  return root;
}

function createHealthSprite(actor) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.15, 0.29, 1);
  sprite.userData = { canvas: c, texture, actorName: actor.name, hp: -1 };
  updateHealthSprite(sprite, actor);
  return sprite;
}

function updateHealthSprite(sprite, actor) {
  if (sprite.userData.hp === actor.health && sprite.userData.actorName === actor.name) return;
  sprite.userData.hp = actor.health;
  sprite.userData.actorName = actor.name;
  const c = sprite.userData.canvas;
  const context = c.getContext("2d");
  context.clearRect(0, 0, c.width, c.height);
  context.fillStyle = "rgba(6,16,29,.82)";
  context.beginPath();
  context.roundRect(5, 5, 246, 54, 20);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "900 22px Arial";
  context.textAlign = "left";
  context.fillText(actor.name.toUpperCase(), 15, 27);
  context.fillStyle = "rgba(255,255,255,.18)";
  context.fillRect(15, 36, 226, 12);
  context.fillStyle = actor.health > 35 ? "#62ed7d" : "#ff5268";
  context.fillRect(15, 36, 226 * actor.health / 100, 12);
  sprite.userData.texture.needsUpdate = true;
}

function syncActors(dt) {
  const currentIds = new Set(state.players.map((actor) => actor.id));
  actorModels.forEach((model, id) => {
    if (!currentIds.has(id)) model.visible = false;
  });

  const firingIds = new Set();
  state.tracers.forEach((tracer) => {
    let closest = null;
    let distance = 0.35;
    state.players.forEach((actor) => {
      const d = Math.hypot(actor.x - tracer.x1, actor.z - tracer.z1);
      if (d < distance) {
        closest = actor;
        distance = d;
      }
    });
    if (closest) firingIds.add(closest.id);
  });

  state.players.forEach((actor) => {
    let model = actorModels.get(actor.id);
    if (!model) model = createActorModel(actor);
    const data = model.userData;
    model.visible = actor !== state.player;
    model.position.set(actor.x, actor.y, actor.z);
    model.rotation.y = -actor.angle - Math.PI / 2;
    const moved = Math.hypot(actor.x - data.lastX, actor.z - data.lastZ);
    const speed = dt > 0 ? Math.min(7, moved / dt) : 0;
    data.lastX = actor.x;
    data.lastZ = actor.z;
    const pace = speed > 0.08 ? (speed > 3.4 ? 13 : 8.5) : 0;
    const swing = pace ? Math.sin(state.time * pace + actor.id * 0.7) * Math.min(0.72, speed * 0.2) : 0;
    data.legs[0].rotation.x = swing;
    data.legs[1].rotation.x = -swing;
    if (actor.weapon === 0) {
      data.arms[0].rotation.x = -1.15 + swing * 0.14;
      data.arms[0].rotation.z = -0.12;
      data.arms[1].rotation.x = -swing * 0.65;
    } else {
      data.arms[0].rotation.x = -1.1 + swing * 0.08;
      data.arms[1].rotation.x = -1.1 - swing * 0.08;
      data.arms[0].rotation.z = -0.18;
      data.arms[1].rotation.z = 0.18;
    }
    data.torso.position.y = 1.35 + (pace ? Math.abs(Math.sin(state.time * pace)) * 0.035 : 0);
    data.handgun.visible = actor.weapon === 0;
    data.longgun.visible = actor.weapon === 1;
    if (firingIds.has(actor.id)) data.muzzleTimer = 0.07;
    data.muzzleTimer = Math.max(0, data.muzzleTimer - dt);
    data.handgunMuzzle.visible = actor.weapon === 0 && data.muzzleTimer > 0;
    data.longgunMuzzle.visible = actor.weapon === 1 && data.muzzleTimer > 0;
    data.shirt.color.set(actor.color);
    data.paintGlow.color.set(actor.color);
    data.paintGlow.emissive.set(actor.color);
    data.paintMarks.forEach((mark, index) => {
      const paint = actor.paint[index];
      mark.visible = Boolean(paint);
      if (paint) mark.material.color.set(paint.color);
    });
    data.health.visible = actor.alive;
    updateHealthSprite(data.health, actor);
  });
}

function buildFirstPersonWeapons() {
  weaponRoot = new THREE.Group();
  camera.add(weaponRoot);
  const fpMetal = new THREE.MeshStandardMaterial({
    color: 0xe8f0f3,
    roughness: 0.28,
    metalness: 0.62,
    depthTest: false,
    depthWrite: false,
  });
  const fpDark = new THREE.MeshStandardMaterial({
    color: 0x23313e,
    roughness: 0.66,
    depthTest: false,
    depthWrite: false,
  });
  const fpSkin = new THREE.MeshStandardMaterial({
    color: 0xefb98e,
    roughness: 0.8,
    depthTest: false,
    depthWrite: false,
  });
  const fpPaint = new THREE.MeshStandardMaterial({
    color: 0x20a4ff,
    emissive: 0x20a4ff,
    emissiveIntensity: 0.75,
    roughness: 0.35,
    depthTest: false,
    depthWrite: false,
  });

  handgunView = new THREE.Group();
  handgunView.add(
    box(0.18, 0.18, 0.52, fpMetal, 0, 0, -0.2),
    box(0.16, 0.38, 0.17, fpDark, 0, -0.22, 0),
    box(0.25, 0.3, 0.28, fpSkin, -0.01, -0.4, 0.09),
  );
  const handgunCanister = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.31, 12), fpPaint);
  handgunCanister.rotation.x = Math.PI / 2;
  handgunCanister.position.set(0, 0.055, -0.2);
  handgunView.add(handgunCanister);
  const handgunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 0.42, 12), fpDark);
  handgunBarrel.rotation.x = Math.PI / 2;
  handgunBarrel.position.set(0, 0.015, -0.42);
  handgunView.add(handgunBarrel);
  const handgunFlash = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), shared.lampGlow);
  handgunFlash.rotation.x = -Math.PI / 2;
  handgunFlash.position.set(0, 0, -0.62);
  handgunView.add(handgunFlash);

  longgunView = new THREE.Group();
  longgunView.add(
    box(0.2, 0.2, 1.05, fpMetal, 0, 0, -0.32),
    box(0.24, 0.29, 0.42, fpPaint, 0, 0.01, -0.12),
    box(0.18, 0.44, 0.19, fpDark, 0, -0.25, -0.05),
    box(0.31, 0.34, 0.29, fpSkin, 0.02, -0.43, 0.02),
    box(0.31, 0.31, 0.3, fpSkin, -0.38, -0.2, -0.38),
  );
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.48, 12), fpDark);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.2, -0.28);
  scope.material.depthTest = false;
  scope.material.depthWrite = false;
  scope.userData.scopePart = true;
  longgunView.add(scope);
  const longgunFlash = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 8), shared.lampGlow);
  longgunFlash.rotation.x = -Math.PI / 2;
  longgunFlash.position.set(0, 0, -0.94);
  longgunView.add(longgunFlash);

  handgunView.userData.flash = handgunFlash;
  longgunView.userData.flash = longgunFlash;
  weaponRoot.userData.paintMaterial = fpPaint;
  weaponRoot.add(handgunView, longgunView);
  weaponRoot.scale.setScalar(0.82);
  weaponRoot.traverse((child) => {
    if (child.isMesh) {
      child.renderOrder = 100;
      child.castShadow = false;
      child.receiveShadow = false;
      child.material.depthTest = false;
      child.material.depthWrite = false;
    }
  });
}

function buildTracerPool() {
  for (let i = 0; i < 128; i += 1) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.visible = false;
    line.frustumCulled = false;
    tracerPool.push(line);
    tracerRoot.add(line);
  }
}

function splatMaterial(color) {
  if (!splatMaterials.has(color)) {
    splatMaterials.set(color, new THREE.MeshBasicMaterial({
      color,
      map: shared.splatTexture,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      side: THREE.DoubleSide,
    }));
  }
  return splatMaterials.get(color);
}

function syncDecals() {
  while (decalMeshes.length > state.decals.length) {
    const mesh = decalMeshes.pop();
    decalRoot.remove(mesh);
  }
  state.decals.forEach((decal, index) => {
    let mesh = decalMeshes[index];
    if (!mesh) {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), splatMaterial(decal.color));
      mesh.renderOrder = 6;
      decalMeshes.push(mesh);
      decalRoot.add(mesh);
    }
    if (mesh.material.color.getStyle() !== new THREE.Color(decal.color).getStyle()) mesh.material = splatMaterial(decal.color);
    const size = decal.size * 2.25;
    mesh.scale.set(size, size, size);
    if (decal.floor) {
      mesh.position.set(decal.x, 0.055, decal.z);
      mesh.rotation.set(-Math.PI / 2, 0, ((index * 47) % 360) * Math.PI / 180);
    } else {
      const cellX = Math.floor(decal.x);
      const cellZ = Math.floor(decal.z);
      const centerX = cellX + 0.5;
      const centerZ = cellZ + 0.5;
      const dx = decal.x - centerX;
      const dz = decal.z - centerZ;
      const y = 0.85 + ((index * 37) % 125) / 100;
      if (Math.abs(dx) > Math.abs(dz)) {
        const side = Math.sign(dx) || 1;
        mesh.position.set(centerX + side * 0.502, y, decal.z);
        mesh.rotation.set(0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      } else {
        const side = Math.sign(dz) || 1;
        mesh.position.set(decal.x, y, centerZ + side * 0.502);
        mesh.rotation.set(0, side > 0 ? 0 : Math.PI, 0);
      }
    }
  });
}

function syncTracers() {
  tracerPool.forEach((line, index) => {
    const tracer = state.tracers[index];
    line.visible = Boolean(tracer);
    if (!tracer) return;
    const positions = line.geometry.attributes.position;
    positions.setXYZ(0, tracer.x1, 1.42, tracer.z1);
    positions.setXYZ(1, tracer.x2, tracer.floor ? 0.08 : 1.18, tracer.z2);
    positions.needsUpdate = true;
    line.material.color.set(tracer.color);
    line.material.opacity = Math.min(1, tracer.life * 16);
  });
}

function updateCameraAndWeapon(dt) {
  const playing = state.phase === "playing" || state.phase === "end";
  const p = state.player;
  if (!playing || !p) {
    const t = performance.now() * 0.00008;
    camera.position.set(17 + Math.sin(t) * 3.2, 4.6, 8.5 + Math.cos(t) * 2.3);
    camera.lookAt(17, 1.45, 18.5);
    camera.fov += (68 - camera.fov) * 0.08;
    camera.updateProjectionMatrix();
    weaponRoot.visible = false;
    return;
  }

  const moved = Math.hypot(p.x - lastPlayerX, p.z - lastPlayerZ);
  const rawSpeed = dt > 0 ? Math.min(8, moved / dt) : 0;
  playerSpeed += (rawSpeed - playerSpeed) * Math.min(1, dt * 9);
  lastPlayerX = p.x;
  lastPlayerZ = p.z;
  cameraBob = playerSpeed > 0.08 ? Math.sin(state.time * (playerSpeed > 3.4 ? 13 : 9)) * Math.min(0.065, playerSpeed * 0.015) : cameraBob * 0.82;
  const sideBob = playerSpeed > 0.08 ? Math.cos(state.time * 6.5) * Math.min(0.024, playerSpeed * 0.006) : 0;
  camera.position.set(p.x, 1.62 + p.y + Math.abs(cameraBob) * 0.45, p.z);
  camera.rotation.set(
    -state.pitch - state.recoil * 0.22,
    -p.angle - Math.PI / 2,
    sideBob * 0.5,
  );
  const scoped = state.scoped && state.weapon === 1 && state.upgrades.longgun;
  const targetFov = scoped ? 24 : playerSpeed > 3.4 ? 78 : 73;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 11);
  camera.updateProjectionMatrix();

  weaponRoot.visible = state.phase === "playing" && p.alive;
  handgunView.visible = state.weapon === 0;
  longgunView.visible = state.weapon === 1;
  longgunView.children.forEach((child) => {
    if (child.userData.scopePart) child.visible = state.upgrades.longgun;
  });
  weaponRoot.userData.paintMaterial.color.set(p.color);
  weaponRoot.userData.paintMaterial.emissive.set(p.color);
  const bobX = Math.sin(state.time * 7.4) * Math.min(0.035, playerSpeed * 0.009);
  const bobY = Math.abs(Math.cos(state.time * 7.4)) * Math.min(0.035, playerSpeed * 0.008);
  const scopedOffset = scoped ? -0.19 : 0;
  weaponRoot.position.set(0.3 + bobX + scopedOffset, -0.32 - bobY, -0.6 + state.recoil * 0.18);
  weaponRoot.rotation.set(-0.05 - state.recoil * 0.8, -0.08 + bobX * 0.8, -0.04 + sideBob);
  handgunView.userData.flash.visible = state.muzzleFlash > 0 && state.weapon === 0;
  longgunView.userData.flash.visible = state.muzzleFlash > 0 && state.weapon === 1;
}

function resize() {
  if (!renderer || !shell) return;
  const rect = shell.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(180, Math.round(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
  lastFrame = now;
  state = api.getState();
  if (badge) badge.hidden = state.phase !== "menu";
  syncActors(dt);
  syncDecals();
  syncTracers();
  updateCameraAndWeapon(dt);
  animatedClouds.forEach((cloud) => {
    cloud.position.x += cloud.userData.speed * dt;
    if (cloud.position.x > 105) cloud.position.x = -55;
  });
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

waitForGame();
