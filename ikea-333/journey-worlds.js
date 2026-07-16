import * as THREE from "three";

/**
 * The playable journey after IKEA. Every build owns every geometry, material,
 * texture and light it creates, so disposeJourneyWorld can safely tear it down.
 */
export const JOURNEY_ORDER = Object.freeze([
  "forest_houses",
  "dragon_caves",
  "dragon_flight",
  "shark_island",
  "boat_ride",
  "electric_hollow",
  "robot_shop",
  "haunted_house",
  "ghost_station",
  "ghost_train",
  "desert",
  "volcano_island",
  "mystery_village"
]);

export const CHAPTER_INFO = Object.freeze({
  forest_houses: {
    title: "Den enorma skogen",
    objective: "Följ lyktorna förbi husen och hitta ingången till drakgrottan.",
    next: "dragon_caves"
  },
  dragon_caves: {
    title: "Drakgrottorna",
    objective: "Följ de blå spåren förbi de sovande drakarna och hitta den stora blå draken.",
    next: "dragon_flight"
  },
  dragon_flight: {
    title: "Drakflygningen",
    objective: "Flyg genom de lysande ringarna utan att falla ner i molnen.",
    next: "shark_island"
  },
  shark_island: {
    title: "Hajarnas ö",
    objective: "Överlev på ön och nå båten när hajarna flyr.",
    next: "boat_ride"
  },
  boat_ride: {
    title: "Båtfärden",
    objective: "Håll dig ombord tills båten når det stora blå hålet.",
    next: "electric_hollow"
  },
  electric_hollow: {
    title: "Det elektriska hålet",
    objective: "Följ lyslarverna, undvik monstret och låt draken rädda dig.",
    next: "robot_shop"
  },
  robot_shop: {
    title: "Affären där allt är falskt",
    objective: "Undersök gubbens högra sida och avslöja roboten.",
    next: "haunted_house"
  },
  haunted_house: {
    title: "Det hemsökta huset",
    objective: "Hämta gamla möbler ur förrådet och förstärk det tomma huset.",
    next: "ghost_station"
  },
  ghost_station: {
    title: "Spökstationen",
    objective: "Undersök tåget, men tänk efter innan du går ombord.",
    next: "ghost_train"
  },
  ghost_train: {
    title: "Tåget som aldrig stannar",
    objective: "Utforska det tomma tåget och hitta en väg till nästa stopp.",
    next: "desert"
  },
  desert: {
    title: "Den ändlösa öknen",
    objective: "Läs kartan och välj kartgrottan tillbaka till IKEA eller vägen vidare.",
    next: "volcano_island",
    alternate: "warehouse"
  },
  volcano_island: {
    title: "Vulkanön",
    objective: "Lyssna efter mullret och nå flyktbåten innan lavan kommer.",
    next: "mystery_village",
    fail: "warehouse"
  },
  mystery_village: {
    title: "Byn som inte borde finnas",
    objective: "Hitta tre engelska ledtrådar och öppna den gamla porten.",
    next: "forest_houses"
  }
});

const WORLD_BUILDERS = {
  forest_houses: buildForestHouses,
  dragon_caves: buildDragonCaves,
  dragon_flight: buildDragonFlight,
  shark_island: buildSharkIsland,
  boat_ride: buildBoatRide,
  electric_hollow: buildElectricHollow,
  robot_shop: buildRobotShop,
  haunted_house: buildHauntedHouse,
  ghost_station: buildGhostStation,
  ghost_train: buildGhostTrain,
  desert: buildDesert,
  volcano_island: buildVolcanoIsland,
  mystery_village: buildMysteryVillage
};

export function buildJourneyWorld(chapter) {
  const builder = WORLD_BUILDERS[chapter];
  if (!builder) {
    throw new RangeError(`Okänt resekapitel: ${chapter}`);
  }
  const world = builder();
  world.root.name = `journey-${chapter}`;
  world.root.userData.chapter = chapter;
  world.root.userData.journeyWorld = true;
  return world;
}

export function disposeJourneyWorld(world) {
  if (!world?.root?.isObject3D) return;

  if (world.root.parent) world.root.parent.remove(world.root);

  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  world.root.traverse((object) => {
    if (object.geometry?.isBufferGeometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (material?.isMaterial) materials.add(material);
    }
    if (object.isLight && object.shadow?.map) object.shadow.map.dispose();
  });

  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value?.isTexture) textures.add(value);
    }
  }
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();

  world.root.clear();
}

function createWorld(chapter, bounds, spawn, colors) {
  const root = new THREE.Group();
  const context = {
    chapter,
    root,
    bounds,
    spawn,
    colliders: [],
    interactables: [],
    actors: {},
    furniture: [],
    materials: new Map()
  };

  const hemisphere = new THREE.HemisphereLight(colors.sky, colors.ground, colors.hemisphere ?? 1.1);
  hemisphere.name = `${chapter}-hemisphere`;
  root.add(hemisphere);

  const sun = new THREE.DirectionalLight(colors.sun ?? 0xffe4bf, colors.sunIntensity ?? 2.2);
  sun.position.set(colors.sunX ?? -35, colors.sunY ?? 55, colors.sunZ ?? 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.00025;
  sun.name = `${chapter}-sun`;
  const sunTarget = new THREE.Object3D();
  sunTarget.name = `${chapter}-sun-target`;
  sunTarget.position.set(0, 0, 0);
  sun.target = sunTarget;
  root.add(sun, sunTarget);
  context.actors.sun = sun;

  const skyMaterial = new THREE.MeshBasicMaterial({
    color: colors.sky,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });
  // Kept inside the main camera's 190-unit far plane. The engine recentres
  // actors.sky on the player so the dome never exposes an edge.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(165, 32, 18), skyMaterial);
  sky.name = `${chapter}-sky`;
  sky.renderOrder = -100;
  root.add(sky);
  context.actors.sky = sky;

  return context;
}

function finishWorld(context) {
  return {
    root: context.root,
    spawn: { ...context.spawn },
    bounds: { ...context.bounds },
    colliders: context.colliders,
    interactables: context.interactables,
    actors: context.actors,
    furniture: context.furniture
  };
}

function material(context, key, options) {
  if (!context.materials.has(key)) {
    const MaterialType = options.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const settings = { ...options };
    delete settings.physical;
    context.materials.set(key, new MaterialType(settings));
  }
  return context.materials.get(key);
}

function addMesh(context, geometry, mat, position, rotation = null, parent = context.root) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
  if (rotation) mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
  mesh.castShadow = mat.transparent !== true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function box(context, w, h, d, mat, x, y, z, yaw = 0, parent = context.root) {
  return addMesh(context, new THREE.BoxGeometry(w, h, d, 1, 1, 1), mat, { x, y, z }, { y: yaw }, parent);
}

function cylinder(context, radiusTop, radiusBottom, height, segments, mat, x, y, z, parent = context.root) {
  return addMesh(context, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat, { x, y, z }, null, parent);
}

function sphere(context, radius, widthSegments, heightSegments, mat, x, y, z, parent = context.root) {
  return addMesh(context, new THREE.SphereGeometry(radius, widthSegments, heightSegments), mat, { x, y, z }, null, parent);
}

function plane(context, w, d, mat, x = 0, y = 0, z = 0, parent = context.root) {
  return addMesh(context, new THREE.PlaneGeometry(w, d, 1, 1), mat, { x, y, z }, { x: -Math.PI / 2 }, parent);
}

function cone(context, radius, height, segments, mat, x, y, z, yaw = 0, parent = context.root) {
  return addMesh(context, new THREE.ConeGeometry(radius, height, segments), mat, { x, y, z }, { y: yaw }, parent);
}

function torus(context, radius, tube, mat, x, y, z, rotation = {}, parent = context.root) {
  return addMesh(
    context,
    new THREE.TorusGeometry(radius, tube, 16, 48),
    mat,
    { x, y, z },
    rotation,
    parent
  );
}

function collider(context, x, z, w, d) {
  const entry = { x, z, w, d };
  context.colliders.push(entry);
  return entry;
}

function interactable(context, id, kind, x, z, radius, label, mesh = undefined) {
  const entry = { id, kind, x, z, radius, label };
  if (mesh) entry.mesh = mesh;
  context.interactables.push(entry);
  return entry;
}

function pointLight(context, color, intensity, distance, x, y, z, parent = context.root) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(x, y, z);
  light.castShadow = false;
  parent.add(light);
  return light;
}

function spotLight(context, color, intensity, distance, angle, x, y, z, tx, ty, tz) {
  const light = new THREE.SpotLight(color, intensity, distance, angle, 0.48, 1.5);
  light.position.set(x, y, z);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  const target = new THREE.Object3D();
  target.position.set(tx, ty, tz);
  light.target = target;
  context.root.add(light, target);
  return light;
}

function textPanel(context, text, options = {}) {
  const width = options.width ?? 8;
  const height = options.height ?? 2;
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = Math.max(256, Math.round(1536 * height / width));
  const c = canvas.getContext("2d");
  c.fillStyle = options.background ?? "#111820";
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = options.border ?? "#d7c68a";
  c.lineWidth = 24;
  c.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
  c.fillStyle = options.color ?? "#f3e6b8";
  c.font = `700 ${options.fontSize ?? 116}px ${options.font ?? "Georgia, serif"}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  const lines = String(text).split("\n");
  const lineHeight = (options.fontSize ?? 116) * 1.08;
  const firstY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
  lines.forEach((line, index) => c.fillText(line, canvas.width / 2, firstY + index * lineHeight));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    emissive: options.emissive ?? 0x0c0c08,
    emissiveIntensity: options.emissiveIntensity ?? 0.35,
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const panel = addMesh(
    context,
    new THREE.PlaneGeometry(width, height),
    mat,
    { x: options.x ?? 0, y: options.y ?? height / 2, z: options.z ?? 0 },
    { y: options.yaw ?? 0 }
  );
  panel.name = options.name ?? `sign-${text.replace(/\W+/g, "-").toLowerCase()}`;
  return panel;
}

function addPathLights(context, points, color = 0xffd68a) {
  const posts = [];
  const postMat = material(context, `lamp-post-${color}`, { color: 0x29323a, roughness: 0.44, metalness: 0.74 });
  const glowMat = material(context, `lamp-glow-${color}`, {
    color,
    emissive: color,
    emissiveIntensity: 3.2,
    roughness: 0.2
  });
  for (const [x, z] of points) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    context.root.add(group);
    cylinder(context, 0.09, 0.13, 3.5, 10, postMat, 0, 1.75, 0, group);
    sphere(context, 0.24, 16, 10, glowMat, 0, 3.48, 0, group);
    pointLight(context, color, 22, 12, 0, 3.3, 0, group);
    posts.push(group);
  }
  return posts;
}

function addTree(context, x, z, scale = 1, tint = 0x234b32) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  context.root.add(group);
  const trunkMat = material(context, "forest-trunk", { color: 0x4b3527, roughness: 0.95 });
  const leafMat = material(context, `forest-leaf-${tint}`, { color: tint, roughness: 0.9 });
  cylinder(context, 0.45, 0.65, 5.4, 10, trunkMat, 0, 2.7, 0, group);
  cone(context, 2.8, 5.8, 12, leafMat, 0, 5.7, 0, 0, group);
  cone(context, 2.25, 4.8, 12, leafMat, 0, 8.15, 0, 0.2, group);
  return group;
}

function addHouse(context, x, z, yaw = 0, colors = {}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  context.root.add(group);
  const wallMat = material(context, `house-wall-${colors.wall ?? 0x8b8172}`, {
    color: colors.wall ?? 0x8b8172,
    roughness: 0.92
  });
  const roofMat = material(context, `house-roof-${colors.roof ?? 0x382a2c}`, {
    color: colors.roof ?? 0x382a2c,
    roughness: 0.88
  });
  const trimMat = material(context, "house-trim", { color: 0xd1c5a7, roughness: 0.72 });
  const windowMat = material(context, "house-window", {
    physical: true,
    color: 0x7eb6c5,
    emissive: 0x244753,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.74
  });
  box(context, 8.6, 5.3, 7.2, wallMat, 0, 2.65, 0, 0, group);
  const roof = cone(context, 6.2, 3.4, 4, roofMat, 0, 6.55, 0, Math.PI / 4, group);
  roof.scale.z = 0.82;
  box(context, 1.55, 3.2, 0.18, trimMat, 0, 1.6, 3.67, 0, group);
  box(context, 1.1, 1.35, 0.12, windowMat, -2.55, 3.2, 3.72, 0, group);
  box(context, 1.1, 1.35, 0.12, windowMat, 2.55, 3.2, 3.72, 0, group);
  pointLight(context, 0xffd68e, 18, 10, 0, 3.8, 3.6, group);
  collider(context, x, z, 8.6, 7.2);
  return group;
}

function addDragon(context, x, y, z, scale = 1, yaw = 0) {
  const dragon = new THREE.Group();
  dragon.position.set(x, y, z);
  dragon.rotation.y = yaw;
  dragon.scale.setScalar(scale);
  dragon.name = "blue-dragon";
  context.root.add(dragon);

  const blue = material(context, "dragon-blue", {
    color: 0x176cc6,
    emissive: 0x062d61,
    emissiveIntensity: 0.72,
    roughness: 0.42,
    metalness: 0.12
  });
  const pale = material(context, "dragon-pale", { color: 0x87c9e9, roughness: 0.52 });
  const horn = material(context, "dragon-horn", { color: 0xd7edf2, roughness: 0.35, metalness: 0.08 });
  const eye = material(context, "dragon-eye", {
    color: 0x71ffff,
    emissive: 0x36ffff,
    emissiveIntensity: 4,
    roughness: 0.12
  });

  const body = sphere(context, 2.25, 28, 18, blue, 0, 2.8, 0, dragon);
  body.scale.set(1.05, 0.72, 1.8);
  const chest = sphere(context, 1.65, 24, 16, pale, 0, 2.45, 1.15, dragon);
  chest.scale.set(0.62, 0.62, 0.72);
  const neck = cylinder(context, 0.66, 1.05, 3.4, 16, blue, 0, 4.38, -1.75, dragon);
  neck.rotation.x = -0.38;
  const head = sphere(context, 1.18, 24, 16, blue, 0, 6.0, -2.65, dragon);
  head.scale.set(1.2, 0.8, 1.35);
  const snout = sphere(context, 0.82, 20, 12, pale, 0, 5.72, -3.72, dragon);
  snout.scale.set(1.15, 0.58, 1.15);
  sphere(context, 0.15, 14, 10, eye, -0.73, 6.15, -3.18, dragon);
  sphere(context, 0.15, 14, 10, eye, 0.73, 6.15, -3.18, dragon);
  const leftHorn = cone(context, 0.22, 1.65, 10, horn, -0.58, 7.03, -2.42, -0.12, dragon);
  leftHorn.rotation.x = -0.25;
  const rightHorn = cone(context, 0.22, 1.65, 10, horn, 0.58, 7.03, -2.42, 0.12, dragon);
  rightHorn.rotation.x = -0.25;

  const wingGeometry = new THREE.ConeGeometry(2.9, 6.8, 3);
  const leftWing = addMesh(context, wingGeometry, blue, { x: -3.0, y: 4.35, z: 0.4 }, { x: 0.12, y: 0.15, z: -1.03 }, dragon);
  leftWing.scale.z = 0.16;
  const rightWing = addMesh(context, new THREE.ConeGeometry(2.9, 6.8, 3), blue, { x: 3.0, y: 4.35, z: 0.4 }, { x: -0.12, y: -0.15, z: 1.03 }, dragon);
  rightWing.scale.z = 0.16;

  for (let i = 0; i < 5; i += 1) {
    const tail = cone(context, 0.7 - i * 0.11, 2.7, 10, blue, 0, 2.7 - i * 0.12, 2.6 + i * 1.75, 0, dragon);
    tail.rotation.x = Math.PI / 2;
  }

  pointLight(context, 0x329cff, 35, 18, 0, 5.7, -2.8, dragon);
  dragon.userData.wings = [leftWing, rightWing];
  dragon.userData.head = head;
  return dragon;
}

function addBoat(context, x, y, z, scale = 1, yaw = 0, parent = context.root) {
  const boat = new THREE.Group();
  boat.position.set(x, y, z);
  boat.rotation.y = yaw;
  boat.scale.setScalar(scale);
  boat.name = "rescue-boat";
  parent.add(boat);
  const hullMat = material(context, "boat-hull", { color: 0x9a362d, roughness: 0.58, metalness: 0.18 });
  const edgeMat = material(context, "boat-edge", { color: 0xe8dfca, roughness: 0.64 });
  const deckMat = material(context, "boat-deck", { color: 0x7b5639, roughness: 0.84 });
  const glassMat = material(context, "boat-glass", {
    physical: true,
    color: 0x7fc4d9,
    roughness: 0.08,
    transmission: 0.28,
    transparent: true,
    opacity: 0.72
  });
  const hull = addMesh(context, new THREE.CylinderGeometry(2.6, 1.55, 9.5, 5), hullMat, { x: 0, y: 1.05, z: 0 }, { x: Math.PI / 2, y: 0, z: 0 }, boat);
  hull.scale.x = 1.32;
  box(context, 5.1, 0.35, 7.6, deckMat, 0, 1.65, 0.2, 0, boat);
  box(context, 3.1, 2.2, 3.0, edgeMat, 0, 2.9, 0.8, 0, boat);
  box(context, 2.55, 1.0, 0.12, glassMat, 0, 3.28, -0.73, 0, boat);
  box(context, 0.18, 4.8, 0.18, edgeMat, 0, 4.6, 1.6, 0, boat);
  pointLight(context, 0xfff1c2, 28, 18, 0, 4.8, -3.2, boat);
  const beaconMat = material(context, "boat-beacon", { color: 0xffa22e, emissive: 0xff7214, emissiveIntensity: 4 });
  sphere(context, 0.28, 16, 10, beaconMat, 0, 4.2, 0.7, boat);
  boat.userData.deck = deckMat;
  return boat;
}

function addShark(context, x, y, z, scale = 1, yaw = 0, parent = context.root) {
  const shark = new THREE.Group();
  shark.position.set(x, y, z);
  shark.rotation.y = yaw;
  shark.scale.setScalar(scale);
  parent.add(shark);
  const sharkMat = material(context, "shark-skin", { color: 0x526a76, roughness: 0.56, metalness: 0.05 });
  const bellyMat = material(context, "shark-belly", { color: 0xb7c5c5, roughness: 0.72 });
  const eyeMat = material(context, "shark-eye", { color: 0x050505, roughness: 0.14 });
  const body = sphere(context, 1.2, 24, 14, sharkMat, 0, 0, 0, shark);
  body.scale.set(0.82, 0.58, 2.35);
  const nose = sphere(context, 0.72, 18, 12, bellyMat, 0, -0.17, -2.0, shark);
  nose.scale.set(0.75, 0.45, 1.2);
  const fin = cone(context, 0.68, 1.55, 3, sharkMat, 0, 1.0, 0.3, 0, shark);
  fin.rotation.x = -0.12;
  const tail = cone(context, 0.9, 2.2, 3, sharkMat, 0, 0, 3.05, 0, shark);
  tail.rotation.x = Math.PI / 2;
  sphere(context, 0.09, 10, 8, eyeMat, -0.53, 0.18, -1.38, shark);
  sphere(context, 0.09, 10, 8, eyeMat, 0.53, 0.18, -1.38, shark);
  shark.userData.fin = fin;
  return shark;
}

function addFurniture(context, id, type, x, z, yaw = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  group.name = id;
  context.root.add(group);
  const wood = material(context, "furniture-wood", { color: 0x745039, roughness: 0.88 });
  const darkWood = material(context, "furniture-dark", { color: 0x3f2b24, roughness: 0.92 });
  const fabric = material(context, "furniture-fabric", { color: 0x596b67, roughness: 1 });
  let w = 2;
  let d = 1;
  if (type === "wardrobe") {
    w = 2.4; d = 1.1;
    box(context, w, 3.5, d, wood, 0, 1.75, 0, 0, group);
    box(context, 0.06, 3.15, 0.08, darkWood, 0, 1.75, d / 2 + 0.04, 0, group);
  } else if (type === "table") {
    w = 2.8; d = 1.6;
    box(context, w, 0.18, d, wood, 0, 1.55, 0, 0, group);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(context, 0.16, 1.5, 0.16, darkWood, sx * 1.1, 0.75, sz * 0.52, 0, group);
    }
  } else if (type === "chair") {
    w = 1.1; d = 1.1;
    box(context, 1.0, 0.16, 1.0, wood, 0, 1.0, 0, 0, group);
    box(context, 1.0, 1.45, 0.14, darkWood, 0, 1.75, 0.44, 0, group);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(context, 0.12, 1.0, 0.12, darkWood, sx * 0.38, 0.5, sz * 0.38, 0, group);
    }
  } else if (type === "sofa") {
    w = 3.2; d = 1.55;
    box(context, w, 0.55, d, fabric, 0, 0.65, 0, 0, group);
    box(context, w, 1.25, 0.34, fabric, 0, 1.35, 0.58, 0, group);
    box(context, 0.36, 0.85, d, fabric, -1.42, 0.93, 0, 0, group);
    box(context, 0.36, 0.85, d, fabric, 1.42, 0.93, 0, 0, group);
  } else {
    w = 1.35; d = 1.35;
    box(context, w, 1.35, d, wood, 0, 0.68, 0, 0, group);
    box(context, 0.08, 1.22, 0.08, darkWood, 0, 0.7, d / 2 + 0.045, 0, group);
  }
  const entry = { id, type, mesh: group, x, z, w, d, movable: true };
  context.furniture.push(entry);
  interactable(context, id, "furniture", x, z, 2.2, `Flytta ${type === "wardrobe" ? "garderob" : type === "table" ? "bord" : type === "chair" ? "stol" : type === "sofa" ? "soffa" : "låda"}`, group);
  return group;
}

function addMonster(context, x, z, scale = 1) {
  const monster = new THREE.Group();
  monster.position.set(x, 0, z);
  monster.scale.setScalar(scale);
  monster.name = "rattleman";
  context.root.add(monster);
  const coatMat = material(context, "monster-coat", { color: 0x16191b, roughness: 0.91 });
  const boneMat = material(context, "monster-bone", { color: 0xb1aaa0, roughness: 0.72 });
  const eyeMat = material(context, "monster-eye", { color: 0xff382e, emissive: 0xff1008, emissiveIntensity: 4 });
  box(context, 1.6, 3.5, 0.95, coatMat, 0, 3.35, 0, 0, monster);
  sphere(context, 0.72, 18, 12, boneMat, 0, 5.45, 0, monster);
  sphere(context, 0.09, 10, 8, eyeMat, -0.28, 5.58, -0.61, monster);
  sphere(context, 0.09, 10, 8, eyeMat, 0.28, 5.58, -0.61, monster);
  for (const side of [-1, 1]) {
    const arm = cylinder(context, 0.13, 0.2, 4.2, 10, boneMat, side * 1.14, 3.4, 0, monster);
    arm.rotation.z = side * 0.16;
    cylinder(context, 0.23, 0.3, 3.1, 10, coatMat, side * 0.48, 1.55, 0, monster);
  }
  pointLight(context, 0xff241d, 16, 9, 0, 5.4, -0.3, monster);
  return monster;
}

function addRock(context, x, y, z, scale, colorKey = "rock", color = 0x4b4f52, parent = context.root) {
  const mat = material(context, colorKey, { color, roughness: 0.96, metalness: 0.02, flatShading: true });
  const rock = sphere(context, 1, 10, 7, mat, x, y, z, parent);
  rock.scale.set(scale * 1.25, scale * 0.78, scale);
  rock.rotation.set((x * 0.13) % 0.5, (z * 0.17) % Math.PI, (x + z) * 0.01);
  return rock;
}

function addWater(context, size, color = 0x164c70, y = -0.2) {
  const waterMat = material(context, `water-${color}`, {
    physical: true,
    color,
    emissive: 0x051727,
    emissiveIntensity: 0.34,
    roughness: 0.18,
    metalness: 0.18,
    transparent: true,
    opacity: 0.88,
    clearcoat: 0.72,
    clearcoatRoughness: 0.12
  });
  const water = plane(context, size, size, waterMat, 0, y, 0);
  water.name = "water";
  context.actors.water = water;
  return water;
}

function addCloud(context, x, y, z, scale = 1, color = 0xd8e5ec) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  context.root.add(group);
  const mat = material(context, `cloud-${color}`, {
    color,
    emissive: color,
    emissiveIntensity: 0.08,
    roughness: 1
  });
  for (const [dx, dy, dz, r] of [[0, 0, 0, 2.6], [-2.2, -0.2, 0, 1.9], [2.2, -0.25, 0.2, 2.0], [0.6, 1.05, 0, 1.8]]) {
    sphere(context, r, 16, 10, mat, dx, dy, dz, group);
  }
  return group;
}

function buildForestHouses() {
  const context = createWorld(
    "forest_houses",
    { minX: -112, maxX: 112, minZ: -116, maxZ: 132 },
    { x: 0, y: 0, z: 112, yaw: 0 },
    { sky: 0x26384e, ground: 0x08120e, hemisphere: 1.25, sun: 0xffd0a2, sunIntensity: 2.1 }
  );
  context.root.userData.backgroundColor = 0x26384e;

  const grass = material(context, "forest-ground", { color: 0x183c29, roughness: 0.98 });
  const pathMat = material(context, "forest-path", { color: 0x776a52, roughness: 1 });
  const moss = material(context, "forest-moss", { color: 0x315b38, roughness: 1 });
  plane(context, 240, 264, grass, 0, -0.02, 8);

  const pathPoints = [];
  for (let z = 116; z >= -92; z -= 8) {
    const x = Math.sin(z * 0.045) * 7 + Math.sin(z * 0.011) * 3;
    const slab = plane(context, 11, 9.2, pathMat, x, 0.015, z);
    slab.rotation.z = Math.sin(z * 0.045) * 0.05;
    pathPoints.push([x + (z % 16 === 0 ? 5.8 : -5.8), z]);
  }

  const treeGroups = [];
  for (let i = 0; i < 126; i += 1) {
    const x = -104 + ((i * 47) % 208);
    const z = -104 + ((i * 73) % 226);
    const pathX = Math.sin(z * 0.045) * 7 + Math.sin(z * 0.011) * 3;
    if (Math.abs(x - pathX) < 12 || (z < -76 && Math.abs(x) < 24)) continue;
    const scale = 0.72 + ((i * 29) % 58) / 100;
    const tint = i % 3 === 0 ? 0x1d3c2a : i % 3 === 1 ? 0x285437 : 0x173926;
    const tree = addTree(context, x, z, scale, tint);
    tree.rotation.y = i * 1.97;
    treeGroups.push(tree);
    if (i % 2 === 0) collider(context, x, z, 1.15 * scale, 1.15 * scale);
  }

  for (let i = 0; i < 46; i += 1) {
    const x = -102 + ((i * 31) % 204);
    const z = -103 + ((i * 61) % 226);
    const rock = addRock(context, x, 0.35, z, 0.55 + (i % 5) * 0.15, "forest-rock", 0x3e4a42);
    rock.scale.y *= 0.72;
  }

  const houseSpecs = [
    [-28, 82, 0.24, 0x817b70], [31, 63, -0.35, 0x786b62],
    [-38, 27, 0.18, 0x83745f], [33, 10, -0.62, 0x6c7776],
    [-29, -31, 0.5, 0x746d78], [38, -55, -0.3, 0x796c58]
  ];
  const houses = houseSpecs.map(([x, z, yaw, wall], index) => {
    const house = addHouse(context, x, z, yaw, { wall, roof: index % 2 ? 0x34282d : 0x3d3029 });
    house.name = `abandoned-house-${index + 1}`;
    interactable(context, `forest-house-${index + 1}`, "house", x, z, 6.8, "Undersök det övergivna huset", house);
    return house;
  });

  const lights = addPathLights(context, pathPoints.filter((_, i) => i % 2 === 0));
  const cave = new THREE.Group();
  cave.position.set(0, 0, -96);
  cave.name = "dragon-cave";
  context.root.add(cave);
  const caveMat = material(context, "cave-rock", { color: 0x272d32, roughness: 0.96, flatShading: true });
  for (let i = 0; i < 15; i += 1) {
    const angle = Math.PI * (i / 14);
    const x = Math.cos(angle) * 16;
    const y = 1 + Math.sin(angle) * 13;
    const rock = sphere(context, 3.8 + (i % 3), 10, 7, caveMat, x, y, 0, cave);
    rock.scale.set(1.3, 0.9, 2.8);
  }
  box(context, 34, 1.2, 27, caveMat, 0, -0.55, -9, 0, cave);
  const caveGlow = material(context, "cave-runes", {
    color: 0x49bfff,
    emissive: 0x159dff,
    emissiveIntensity: 4,
    roughness: 0.24
  });
  for (const x of [-10, -6, 6, 10]) {
    const rune = box(context, 0.22, 3.2, 0.15, caveGlow, x, 4.8 + Math.abs(x) * 0.18, 2.62, x * 0.02, cave);
    rune.rotation.z = x * 0.035;
  }
  pointLight(context, 0x219cff, 70, 42, 0, 6, -101);
  collider(context, -16, -96, 5, 18);
  collider(context, 16, -96, 5, 18);
  interactable(context, "dragon-cave-entrance", "cave_entrance", 0, -90, 7, "Gå in i drakgrottan", cave);
  const cavePortalMat = material(context, "cave-portal", {
    color: 0x54d4ff, emissive: 0x128dff, emissiveIntensity: 3.5, roughness: 0.2,
    transparent: true, opacity: 0.72
  });
  const cavePortal = torus(context, 6.6, 0.38, cavePortalMat, 0, 5.8, -106, {});

  const forestMonsters = [addMonster(context, -67, -12, 0.72), addMonster(context, 72, 43, 0.7)];
  forestMonsters.forEach((monster, i) => {
    monster.name = `forest-shadow-${i + 1}`;
    monster.visible = false;
  });

  context.actors.trees = treeGroups;
  context.actors.houses = houses;
  context.actors.pathLights = lights;
  context.actors.cave = cave;
  context.actors.cavePortal = cavePortal;
  context.actors.forestMonsters = forestMonsters;
  return finishWorld(context);
}

function buildDragonCaves() {
  const context = createWorld(
    "dragon_caves",
    { minX: -54, maxX: 54, minZ: -68, maxZ: 62 },
    { x: 0, y: 0, z: 52, yaw: 0 },
    { sky: 0x080c18, ground: 0x020307, hemisphere: 0.72, sun: 0x79bfff, sunIntensity: 0.78, sunY: 28 }
  );
  context.root.userData.backgroundColor = 0x080c18;
  const caveFloorMat = material(context, "dragon-cave-floor", { color: 0x242832, roughness: 0.98, flatShading: true });
  plane(context, 112, 140, caveFloorMat, 0, -0.04, -3);

  const wallMat = material(context, "dragon-cave-wall", { color: 0x171b24, roughness: 1, flatShading: true });
  const walls = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 25; i += 1) {
      const z = -64 + i * 5.3;
      const x = side * (43 + (i % 4) * 2.2);
      const wallRock = sphere(context, 5.8, 10, 7, wallMat, x, 3.2 + i % 3, z);
      wallRock.scale.set(1.35, 1.15, 1.4);
      walls.push(wallRock);
      if (i % 2 === 0) collider(context, x, z, 7.5, 7.5);
    }
  }
  for (let i = 0; i < 30; i += 1) {
    const x = -39 + ((i * 23) % 78);
    const z = -59 + ((i * 31) % 116);
    const stalactite = cone(context, 1.2 + i % 3 * .55, 5 + i % 4 * 1.6, 9, wallMat, x, 12 - i % 3, z, i * .3);
    stalactite.rotation.z = Math.PI;
  }

  const crystalMat = material(context, "dragon-crystal", {
    physical: true,
    color: 0x54d8ff,
    emissive: 0x087ce9,
    emissiveIntensity: 4,
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.9
  });
  const crystals = [];
  for (let i = 0; i < 28; i += 1) {
    const side = i % 2 ? 1 : -1;
    const x = side * (29 + (i * 7) % 10);
    const z = -58 + i * 4.2;
    const crystal = cone(context, 0.55 + i % 3 * 0.24, 2.8 + i % 4, 6, crystalMat, x, 1.2 + i % 4 * .25, z, i * .37);
    crystal.rotation.z = side * 0.18;
    crystals.push(crystal);
    if (i % 5 === 0) pointLight(context, 0x21b9ff, 22, 16, x, 2.3, z);
  }

  const trackMat = material(context, "dragon-tracks", {
    color: 0x8cecff,
    emissive: 0x1aafff,
    emissiveIntensity: 4,
    roughness: 0.24
  });
  const tracks = [];
  for (let i = 0; i < 24; i += 1) {
    const z = 45 - i * 4.1;
    const side = i % 2 ? 1 : -1;
    const x = Math.sin(i * .55) * 6 + side * .8;
    const print = sphere(context, 0.42, 12, 8, trackMat, x, 0.08, z);
    print.scale.set(1.6, .16, 2.1);
    print.rotation.y = Math.sin(i * .3) * .25;
    print.name = `blue-track-${i + 1}`;
    tracks.push(print);
  }

  const sleepingDragons = [];
  for (const [x, z, yaw, scale] of [[-19, 20, 1.1, .34], [21, 3, -1.2, .38], [-23, -19, .8, .31], [22, -32, -1, .35]]) {
    const dragon = addDragon(context, x, 0, z, scale, yaw);
    dragon.name = "sleeping-dragon";
    dragon.rotation.z = 0.09;
    dragon.userData.sleeping = true;
    sleepingDragons.push(dragon);
    collider(context, x, z, 4.5, 5.5);
  }

  const blueDragon = addDragon(context, 0, 0, -52, 1.18, 0);
  blueDragon.name = "great-blue-dragon";
  interactable(context, "great-blue-dragon", "blue_dragon", 0, -52, 9, "Närma dig den stora blå draken", blueDragon);
  pointLight(context, 0x2fbaff, 82, 48, 0, 7, -52);
  const flightPortal = torus(context, 8.4, .55, crystalMat, 0, 7.2, -63, {});
  flightPortal.visible = false;
  interactable(context, "dragon-flight-start", "chapter_exit", 0, -61, 8, "Flyg ut ur grottan", flightPortal);

  context.actors.walls = walls;
  context.actors.crystals = crystals;
  context.actors.tracks = tracks;
  context.actors.sleepingDragons = sleepingDragons;
  context.actors.dragon = blueDragon;
  context.actors.flightPortal = flightPortal;
  return finishWorld(context);
}

function buildDragonFlight() {
  const context = createWorld(
    "dragon_flight",
    { minX: -64, maxX: 64, minZ: -132, maxZ: 58 },
    { x: 0, y: 0, z: 48, yaw: 0 },
    { sky: 0x658fba, ground: 0x273141, hemisphere: 1.65, sun: 0xffefc8, sunIntensity: 3.1, sunY: 82 }
  );
  context.root.userData.backgroundColor = 0x658fba;
  const cloudFloor = material(context, "flight-cloud-floor", {
    physical: true,
    color: 0xd8e8ef,
    emissive: 0x33404a,
    emissiveIntensity: 0.24,
    roughness: 0.95,
    transparent: true,
    opacity: 0.86
  });
  plane(context, 170, 245, cloudFloor, 0, -12, -35);

  const clouds = [];
  for (let i = 0; i < 28; i += 1) {
    const cloud = addCloud(
      context,
      -58 + ((i * 31) % 116),
      -7 + (i % 5) * 3.2,
      -118 + ((i * 47) % 174),
      0.7 + (i % 4) * 0.22,
      i % 3 ? 0xd8e5ec : 0xbecfda
    );
    clouds.push(cloud);
  }

  const islandMat = material(context, "flight-island", { color: 0x3b4a3c, roughness: 0.96, flatShading: true });
  const islandTop = material(context, "flight-island-top", { color: 0x487544, roughness: 1 });
  const islands = [];
  for (let i = 0; i < 9; i += 1) {
    const x = -49 + ((i * 29) % 98);
    const z = -116 + i * 19;
    const island = new THREE.Group();
    island.position.set(x, -8 + (i % 3) * 2.5, z);
    context.root.add(island);
    const base = cone(context, 7 + i % 4, 15 + i % 3 * 3, 10, islandMat, 0, -4.8, 0, i * 0.15, island);
    base.rotation.x = Math.PI;
    cylinder(context, 7 + i % 4, 6 + i % 3, 1.2, 12, islandTop, 0, 2.25, 0, island);
    if (i % 2 === 0) addTree(context, x, z, 0.7, 0x315e3d).position.y = island.position.y + 2.8;
    islands.push(island);
  }

  const ringMat = material(context, "flight-ring", {
    color: 0x67dcff,
    emissive: 0x18b9ff,
    emissiveIntensity: 4,
    roughness: 0.18,
    metalness: 0.22
  });
  const route = [
    [0, 1.5, 31], [-13, 3, 12], [12, 1.2, -8], [22, 4.5, -28],
    [-4, 2.8, -48], [-23, 5.4, -68], [5, 3.2, -90], [0, 2, -116]
  ];
  const rings = route.map(([x, y, z], i) => {
    const ring = torus(context, 4.6, 0.45, ringMat, x, y, z, { y: i % 2 ? 0.18 : -0.18 });
    ring.name = `flight-ring-${i + 1}`;
    ring.userData.index = i;
    pointLight(context, 0x3dcfff, 26, 14, x, y, z);
    interactable(context, `flight-ring-${i + 1}`, "flight_ring", x, z, 5.8, `Flyg genom ring ${i + 1}`, ring);
    return ring;
  });

  const dragon = addDragon(context, 0, -1.2, 43, 0.72, Math.PI);
  const finishGate = torus(context, 7.8, 0.75, ringMat, 0, 2, -124, { y: 0 });
  finishGate.name = "flight-finish";
  interactable(context, "flight-finish", "chapter_exit", 0, -124, 9, "Landa på den lilla ön", finishGate);

  context.actors.dragon = dragon;
  context.actors.rings = rings;
  context.actors.finishGate = finishGate;
  context.actors.clouds = clouds;
  context.actors.islands = islands;
  return finishWorld(context);
}

function buildSharkIsland() {
  const context = createWorld(
    "shark_island",
    { minX: -86, maxX: 86, minZ: -86, maxZ: 86 },
    { x: 0, y: 0, z: 5, yaw: 0 },
    { sky: 0x4c7994, ground: 0x071e2b, hemisphere: 1.7, sun: 0xffe1ad, sunIntensity: 2.8, sunX: -55, sunY: 48 }
  );
  context.root.userData.backgroundColor = 0x4c7994;
  const water = addWater(context, 190, 0x145474, -1.35);
  const sand = material(context, "island-sand", { color: 0xc7aa72, roughness: 0.96 });
  const soil = material(context, "island-soil", { color: 0x765d3f, roughness: 1 });
  cylinder(context, 18, 22, 4, 48, soil, 0, -1.15, 0);
  const beach = cylinder(context, 17.5, 19, 1.2, 48, sand, 0, 0.25, 0);
  beach.scale.z = 0.86;

  const palmTrunk = material(context, "palm-trunk", { color: 0x76502e, roughness: 0.92 });
  const palmLeaf = material(context, "palm-leaf", { color: 0x287342, roughness: 0.9 });
  const palms = [];
  for (const [x, z, s] of [[-8, 1, 1], [7, 5, .9], [-2, -8, .75]]) {
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);
    palm.scale.setScalar(s);
    context.root.add(palm);
    const trunk = cylinder(context, 0.25, 0.42, 6.8, 12, palmTrunk, 0, 3.35, 0, palm);
    trunk.rotation.z = 0.08 * Math.sign(x || 1);
    for (let i = 0; i < 7; i += 1) {
      const leaf = cone(context, 0.48, 4.4, 4, palmLeaf, 0, 6.7, 0, i * Math.PI / 3.5, palm);
      leaf.rotation.z = 1.18;
      leaf.rotation.y = i * Math.PI / 3.5;
    }
    palms.push(palm);
    collider(context, x, z, 0.9, 0.9);
  }

  const warningSign = textPanel(context, "VÄNTA PÅ BÅTEN\nHAJAR I VATTNET", {
    x: 0, y: 2.3, z: -7.5, yaw: 0, width: 7.5, height: 2.2,
    background: "#57321f", border: "#f1cf7e", color: "#fff0bd", font: "Arial, sans-serif", fontSize: 98
  });
  box(context, 0.18, 3.2, 0.18, material(context, "sign-post-wood", { color: 0x694629, roughness: .95 }), -2.7, 1.15, -7.35);
  box(context, 0.18, 3.2, 0.18, material(context, "sign-post-wood", { color: 0x694629, roughness: .95 }), 2.7, 1.15, -7.35);
  interactable(context, "island-warning", "sign", 0, -7.5, 4.8, "Läs varningsskylten", warningSign);

  const boat = addBoat(context, 0, -1.4, -49, 1, 0);
  interactable(context, "island-boat", "boat", 0, -49, 8.5, "Hoppa ombord innan båten åker", boat);

  const sharks = [];
  for (let i = 0; i < 9; i += 1) {
    const angle = i * Math.PI * 2 / 9;
    const radius = 27 + (i % 3) * 5;
    const shark = addShark(context, Math.sin(angle) * radius, -0.7, Math.cos(angle) * radius, 0.72 + (i % 2) * 0.16, angle + Math.PI / 2);
    shark.name = `island-shark-${i + 1}`;
    shark.userData.orbitRadius = radius;
    shark.userData.orbitPhase = angle;
    sharks.push(shark);
  }

  const flareMat = material(context, "rescue-flare", { color: 0xffdf6c, emissive: 0xff8d1f, emissiveIntensity: 5 });
  const rescueFlare = sphere(context, 0.35, 16, 10, flareMat, 0, 3.2, -17);
  pointLight(context, 0xffa32f, 42, 24, 0, 3.2, -17);
  interactable(context, "call-boat", "signal", 0, -16, 3.5, "Tänd signalen och kalla på båten", rescueFlare);

  context.actors.water = water;
  context.actors.palms = palms;
  context.actors.sharks = sharks;
  context.actors.boat = boat;
  context.actors.rescueFlare = rescueFlare;
  context.actors.warningSign = warningSign;
  return finishWorld(context);
}

function buildBoatRide() {
  const context = createWorld(
    "boat_ride",
    { minX: -42, maxX: 42, minZ: -94, maxZ: 54 },
    { x: 0, y: 0, z: 5, yaw: 0 },
    { sky: 0x193a55, ground: 0x03101b, hemisphere: 1.2, sun: 0xb8d9ef, sunIntensity: 1.7, sunX: 45, sunY: 42 }
  );
  context.root.userData.backgroundColor = 0x193a55;
  const water = addWater(context, 210, 0x0b3d60, -2.25);
  // Hela båten ligger i samma rigg så skrov, ratt och räcken rör sig ihop.
  const boatRig = new THREE.Group();
  boatRig.position.set(0, 0, 6);
  boatRig.name = "journey-boat-rig";
  context.root.add(boatRig);
  const boat = addBoat(context, 0, -1.62, 0, 1.65, Math.PI, boatRig);
  boat.name = "journey-boat";
  const helmMat = material(context, "helm", { color: 0x6b4429, roughness: 0.72, metalness: 0.08 });
  const helm = torus(context, 0.58, 0.08, helmMat, 0, 2.15, -5.7, { x: 0, y: 0, z: 0 }, boatRig);
  for (let i = 0; i < 8; i += 1) {
    const spoke = box(context, 0.065, 1.18, 0.065, helmMat, 0, 2.15, -5.7, 0, boatRig);
    spoke.rotation.z = i * Math.PI / 4;
  }
  interactable(context, "boat-helm", "helm", 0, .3, 3.2, "Ta ratten och styr med A/D", helm);

  const railMat = material(context, "boat-rail", { color: 0xd9d7cb, roughness: 0.42, metalness: 0.74 });
  for (const x of [-4.05, 4.05]) {
    box(context, 0.13, 1.25, 12, railMat, x, 0.7, 0, 0, boatRig);
    collider(context, x, 6, 0.35, 12);
  }
  collider(context, 0, 12, 8.3, 0.35);
  collider(context, 0, 0, 8.3, 0.35);

  const buoyMat = material(context, "buoy", { color: 0xff5b36, emissive: 0x6e1004, emissiveIntensity: 1.5, roughness: 0.45 });
  const buoys = [];
  for (let i = 0; i < 10; i += 1) {
    const side = i % 2 ? 1 : -1;
    const buoy = cylinder(context, 0.48, 0.68, 1.5, 16, buoyMat, side * (12 + i % 3 * 4), -1.1, -8 - i * 8);
    pointLight(context, 0xff5b36, 16, 10, buoy.position.x, 0.1, buoy.position.z);
    buoys.push(buoy);
  }

  const rocks = [];
  for (let i = 0; i < 18; i += 1) {
    const side = i % 2 ? 1 : -1;
    rocks.push(addRock(context, side * (22 + (i * 7) % 16), -1.0, -72 + i * 8, 2.2 + i % 4, "sea-rock", 0x293943));
  }

  const vortexMat = material(context, "hollow-vortex", {
    color: 0x2dd9ff,
    emissive: 0x0577ff,
    emissiveIntensity: 4,
    roughness: 0.18,
    metalness: 0.22
  });
  const vortexRings = [];
  for (let i = 0; i < 5; i += 1) {
    const ring = torus(context, 6 + i * 2.5, 0.28 + i * 0.05, vortexMat, 0, -1.7 - i * .28, -82, { x: Math.PI / 2 });
    ring.name = `vortex-ring-${i + 1}`;
    vortexRings.push(ring);
  }
  pointLight(context, 0x1da9ff, 80, 52, 0, 3, -82);
  interactable(context, "hollow-drop", "chapter_exit", 0, -82, 12, "Följ virveln ner i det stora hålet", vortexRings[0]);

  context.actors.water = water;
  context.actors.boat = boatRig;
  context.actors.boatHull = boat;
  context.actors.helm = helm;
  context.actors.buoys = buoys;
  context.actors.rocks = rocks;
  context.actors.vortex = vortexRings;
  return finishWorld(context);
}

function buildElectricHollow() {
  const context = createWorld(
    "electric_hollow",
    { minX: -48, maxX: 48, minZ: -62, maxZ: 58 },
    { x: 0, y: 0, z: 48, yaw: 0 },
    { sky: 0x050817, ground: 0x010208, hemisphere: 0.62, sun: 0x3a80bb, sunIntensity: 0.55, sunY: 32 }
  );
  context.root.userData.backgroundColor = 0x050817;
  const floorMat = material(context, "hollow-floor", { color: 0x20242d, roughness: 0.98, flatShading: true });
  plane(context, 102, 128, floorMat, 0, -0.03, -2);

  const wallMat = material(context, "hollow-wall", { color: 0x131720, roughness: 1, flatShading: true });
  const walls = [];
  for (let i = 0; i < 38; i += 1) {
    const angle = i / 38 * Math.PI * 2;
    const radiusX = 43 + (i % 3) * 3;
    const radiusZ = 55 + (i % 4) * 2;
    const rock = sphere(context, 5.6, 10, 7, wallMat, Math.sin(angle) * radiusX, 3.8 + i % 4, Math.cos(angle) * radiusZ - 2);
    rock.scale.set(1.4, 1.3, 1.45);
    walls.push(rock);
  }

  const poolMat = material(context, "electric-pool", {
    physical: true,
    color: 0x0878a8,
    emissive: 0x064fbb,
    emissiveIntensity: 2.2,
    roughness: 0.12,
    metalness: 0.16,
    transparent: true,
    opacity: 0.82,
    clearcoat: 0.8
  });
  const pools = [];
  for (const [x, z, sx, sz] of [[-17, 20, 8, 4], [18, 3, 6, 9], [-13, -23, 9, 5], [17, -42, 7, 4]]) {
    const pool = plane(context, sx * 2, sz * 2, poolMat, x, 0.02, z);
    pools.push(pool);
    pointLight(context, 0x148cff, 28, 18, x, 1, z);
  }

  const larvaBody = material(context, "larva-body", {
    physical: true,
    color: 0x68eaff,
    emissive: 0x05a7ff,
    emissiveIntensity: 5,
    roughness: 0.16,
    transparent: true,
    opacity: 0.94
  });
  const larvaEye = material(context, "larva-eye", { color: 0xf4ffff, emissive: 0xa8ffff, emissiveIntensity: 5 });
  const larvae = [];
  for (let i = 0; i < 24; i += 1) {
    const larva = new THREE.Group();
    const x = -30 + ((i * 17) % 60);
    const z = 37 - i * 3.25;
    larva.position.set(x, 0.38 + i % 3 * 0.12, z);
    larva.rotation.y = i * .77;
    larva.scale.setScalar(.62 + i % 4 * .1);
    larva.name = `electric-larva-${i + 1}`;
    context.root.add(larva);
    for (let j = 0; j < 5; j += 1) {
      const segment = sphere(context, .42 - j * .035, 14, 10, larvaBody, 0, Math.sin(j) * .08, j * .55, larva);
      segment.scale.y = .72;
    }
    sphere(context, .08, 10, 8, larvaEye, -.18, .13, -.34, larva);
    sphere(context, .08, 10, 8, larvaEye, .18, .13, -.34, larva);
    if (i % 4 === 0) pointLight(context, 0x1bbcff, 19, 11, x, 1, z);
    larvae.push(larva);
  }

  const ledgeMat = material(context, "hollow-ledge", { color: 0x3b4551, roughness: .96, flatShading: true });
  const ledges = [];
  for (let i = 0; i < 10; i += 1) {
    const side = i % 2 ? 1 : -1;
    const x = side * (22 + i * 1.8);
    const z = 32 - i * 8;
    const ledge = box(context, 8.2, 1.1, 5.5, ledgeMat, x, .55 + i * .33, z, side * .15);
    ledges.push(ledge);
  }

  const monster = addMonster(context, 0, -14, 1.05);
  monster.name = "hollow-rattleman";
  interactable(context, "hollow-monster", "danger", 0, -14, 9, "Fly från monstret", monster);
  const dragon = addDragon(context, 0, 0, -48, 1.12, 0);
  dragon.name = "rescue-dragon";
  interactable(context, "rescue-dragon", "dragon_rescue", 0, -48, 9, "Spring till den blå draken", dragon);
  const rescueLight = spotLight(context, 0x43c7ff, 95, 70, .72, 0, 21, -43, 0, 0, -48);

  context.actors.walls = walls;
  context.actors.pools = pools;
  context.actors.larvae = larvae;
  context.actors.ledges = ledges;
  context.actors.monster = monster;
  context.actors.dragon = dragon;
  context.actors.rescueLight = rescueLight;
  return finishWorld(context);
}

function buildRobotShop() {
  const context = createWorld(
    "robot_shop",
    { minX: -31, maxX: 31, minZ: -39, maxZ: 39 },
    { x: 0, y: 0, z: 30, yaw: 0 },
    { sky: 0x1b1a1d, ground: 0x08080a, hemisphere: 1.75, sun: 0xffddb2, sunIntensity: 1.4, sunY: 25 }
  );
  context.root.userData.backgroundColor = 0x1b1a1d;
  const tile = material(context, "shop-tile", { color: 0xc1bba9, emissive: 0x17130d, emissiveIntensity: .22, roughness: .72, metalness: .03 });
  const wall = material(context, "shop-wall", { color: 0x777968, emissive: 0x11120f, emissiveIntensity: .18, roughness: .88 });
  const ceiling = material(context, "shop-ceiling", { color: 0x484942, roughness: .92 });
  plane(context, 62, 78, tile, 0, -0.02, 0);
  box(context, 1, 9, 78, wall, -30.5, 4.5, 0);
  box(context, 1, 9, 78, wall, 30.5, 4.5, 0);
  box(context, 62, 9, 1, wall, 0, 4.5, -38.5);
  box(context, 62, .5, 78, ceiling, 0, 9.1, 0);
  collider(context, -30.5, 0, 1, 78);
  collider(context, 30.5, 0, 1, 78);
  collider(context, 0, -38.5, 62, 1);

  const shopSign = textPanel(context, "GAMLA LIVS", {
    x: 0, y: 7, z: -37.9, width: 15, height: 2.6, background: "#24503c",
    border: "#f3e1aa", color: "#fff4c7", font: "Arial, sans-serif", fontSize: 144,
    emissive: 0x163c2d, emissiveIntensity: 1.2
  });

  const shelfMat = material(context, "shop-shelf", { color: 0x5b6871, emissive: 0x0a0e12, emissiveIntensity: .18, roughness: .54, metalness: .62 });
  const plasticMaterials = [
    material(context, "plastic-red", { physical: true, color: 0xe94e3c, roughness: .25, clearcoat: .72 }),
    material(context, "plastic-yellow", { physical: true, color: 0xf2ca48, roughness: .22, clearcoat: .78 }),
    material(context, "plastic-green", { physical: true, color: 0x4ca968, roughness: .24, clearcoat: .7 }),
    material(context, "plastic-purple", { physical: true, color: 0x8c57b2, roughness: .2, clearcoat: .8 })
  ];
  const plasticFood = [];
  const shelves = [];
  for (const x of [-20, -10, 10, 20]) {
    const shelf = new THREE.Group();
    shelf.position.set(x, 0, 4);
    context.root.add(shelf);
    for (const level of [1, 2.8, 4.6]) box(context, 5.4, .16, 25, shelfMat, 0, level, 0, 0, shelf);
    for (const z of [-11.8, 11.8]) box(context, .25, 5.3, .25, shelfMat, -2.4, 2.65, z, 0, shelf);
    for (const z of [-11.8, 11.8]) box(context, .25, 5.3, .25, shelfMat, 2.4, 2.65, z, 0, shelf);
    for (let i = 0; i < 18; i += 1) {
      const foodMat = plasticMaterials[(i + Math.abs(x)) % plasticMaterials.length];
      const food = i % 2
        ? sphere(context, .32 + i % 3 * .06, 16, 12, foodMat, -1.8 + i % 5 * .9, 1.35 + Math.floor(i / 6) * 1.8, -9 + (i * 7) % 18, shelf)
        : box(context, .62, .78, .46, foodMat, -1.8 + i % 5 * .9, 1.38 + Math.floor(i / 6) * 1.8, -9 + (i * 7) % 18, i * .1, shelf);
      food.userData.plasticFood = true;
      plasticFood.push(food);
    }
    shelves.push(shelf);
    collider(context, x, 4, 5.4, 25);
  }

  const counterMat = material(context, "shop-counter", { color: 0x5a402e, roughness: .82 });
  box(context, 15, 2.5, 3.2, counterMat, 0, 1.25, -27);
  collider(context, 0, -27, 15, 3.2);

  const robot = new THREE.Group();
  robot.position.set(0, 2.5, -24.6);
  robot.rotation.y = 0;
  robot.name = "waving-robot-man";
  context.root.add(robot);
  const coat = material(context, "robot-coat", { color: 0x4d463d, roughness: .91 });
  const skin = material(context, "robot-skin", { physical: true, color: 0xc19d7c, roughness: .54, clearcoat: .12 });
  const hair = material(context, "robot-hair", { color: 0xddd7ca, roughness: .96 });
  const metal = material(context, "robot-metal", { color: 0x59636b, roughness: .38, metalness: .82 });
  const buttonMats = [0xff3c31, 0xffd23f, 0x39e574].map((color, i) => material(context, `robot-button-${i}`, { color, emissive: color, emissiveIntensity: 2.5, roughness: .22 }));
  box(context, 2.2, 3.5, 1.2, coat, 0, 1.75, 0, 0, robot);
  sphere(context, .83, 24, 16, skin, 0, 4.15, 0, robot);
  const hairCap = sphere(context, .88, 20, 12, hair, 0, 4.48, .1, robot);
  hairCap.scale.y = .42;
  sphere(context, .09, 12, 8, metal, -.28, 4.25, -.72, robot);
  sphere(context, .09, 12, 8, metal, .28, 4.25, -.72, robot);
  const normalArm = cylinder(context, .17, .23, 3.2, 12, coat, -.75, 1.8, 0, robot);
  normalArm.rotation.z = -.08;
  const wavePivot = new THREE.Group();
  wavePivot.position.set(.95, 3.1, 0);
  robot.add(wavePivot);
  const wavingArm = cylinder(context, .16, .22, 2.7, 12, coat, 0, 1.05, 0, wavePivot);
  wavingArm.rotation.z = -.5;
  sphere(context, .27, 16, 10, skin, .95, 2.25, 0, wavePivot);
  const sidePanel = box(context, .12, 2.0, .7, metal, 1.16, 2.1, 0, 0, robot);
  const buttons = [];
  for (let i = 0; i < 3; i += 1) {
    const button = cylinder(context, .13, .13, .12, 16, buttonMats[i], 1.25, 2.7 - i * .58, 0, robot);
    button.rotation.z = Math.PI / 2;
    button.name = `robot-button-${i + 1}`;
    buttons.push(button);
  }
  pointLight(context, 0xffcf83, 72, 18, 0, 6.2, -24);
  interactable(context, "robot-man", "robot", 0, -24.6, 4.5, "Prata med gubben: Hej, hej, hej, hej", robot);
  interactable(context, "robot-buttons", "robot_buttons", 1.3, -24.6, 3.1, "Undersök knapparna på hans högra sida", sidePanel);

  const exitMat = material(context, "shop-exit", { color: 0x834fff, emissive: 0x5721d8, emissiveIntensity: 3, roughness: .18 });
  const exitPortal = torus(context, 4.5, .45, exitMat, 25, 4.5, 31, { y: -Math.PI / 2 });
  pointLight(context, 0x824aff, 45, 22, 25, 4, 31);
  interactable(context, "shop-exit", "chapter_exit", 25, 31, 6, "Spring ut ur den falska affären", exitPortal);

  const fixtures = [];
  const lightMat = material(context, "shop-light", { color: 0xfff1cb, emissive: 0xffe0a1, emissiveIntensity: 3.4 });
  for (const x of [-20, -7, 7, 20]) for (const z of [-24, -8, 8, 24]) {
    fixtures.push(box(context, 4.5, .12, .6, lightMat, x, 8.72, z));
    pointLight(context, 0xffe3b0, 58, 14, x, 7.8, z);
  }

  context.actors.shopSign = shopSign;
  context.actors.shelves = shelves;
  context.actors.plasticFood = plasticFood;
  context.actors.robot = robot;
  context.actors.robotArm = wavePivot;
  context.actors.sidePanel = sidePanel;
  context.actors.buttons = buttons;
  context.actors.exitPortal = exitPortal;
  context.actors.fixtures = fixtures;
  return finishWorld(context);
}

function buildHauntedHouse() {
  const context = createWorld(
    "haunted_house",
    { minX: -64, maxX: 64, minZ: -66, maxZ: 66 },
    { x: 0, y: 0, z: 12, yaw: 0 },
    { sky: 0x111426, ground: 0x040608, hemisphere: .82, sun: 0x91a0c8, sunIntensity: .95, sunX: 40, sunY: 45 }
  );
  context.root.userData.backgroundColor = 0x111426;
  const yard = material(context, "haunted-yard", { color: 0x18241d, roughness: 1 });
  const floor = material(context, "haunted-floor", { color: 0x4b3a31, roughness: .94 });
  const plaster = material(context, "haunted-plaster", { color: 0x77776f, roughness: .96 });
  const roofMat = material(context, "haunted-roof", { color: 0x24242b, roughness: .92 });
  plane(context, 136, 136, yard, 0, -0.08, 0);
  plane(context, 38, 42, floor, 0, 0.01, -3);

  const house = new THREE.Group();
  house.name = "empty-haunted-house";
  context.root.add(house);
  box(context, 1, 8, 42, plaster, -19, 4, -3, 0, house);
  box(context, 1, 8, 42, plaster, 19, 4, -3, 0, house);
  box(context, 38, 8, 1, plaster, 0, 4, -24, 0, house);
  box(context, 14, 8, 1, plaster, -12, 4, 18, 0, house);
  box(context, 14, 8, 1, plaster, 12, 4, 18, 0, house);
  const roof = cone(context, 29, 9, 4, roofMat, 0, 12, -3, Math.PI / 4, house);
  roof.scale.z = .72;
  collider(context, -19, -3, 1, 42);
  collider(context, 19, -3, 1, 42);
  collider(context, 0, -24, 38, 1);
  collider(context, -12, 18, 14, 1);
  collider(context, 12, 18, 14, 1);

  const windowMat = material(context, "haunted-window", {
    physical: true, color: 0x8eb7c7, emissive: 0x152c40, emissiveIntensity: 1.3,
    roughness: .12, transparent: true, opacity: .52
  });
  for (const x of [-12, -5, 5, 12]) box(context, 2.4, 2.6, .12, windowMat, x, 4.4, -23.42);
  pointLight(context, 0x8ebdff, 23, 19, 0, 6.5, -5);

  const storageWall = material(context, "storage-wall", { color: 0x313039, roughness: .95 });
  box(context, 1, 7, 17, storageWall, 9, 3.5, -15.5);
  // Två väggbitar lämnar en riktig fyra meter bred dörr in till förrådet.
  box(context, 3, 7, 1, storageWall, 10.5, 3.5, -7);
  box(context, 3, 7, 1, storageWall, 17.5, 3.5, -7);
  collider(context, 9, -15.5, 1, 17);
  collider(context, 10.5, -7, 3, 1);
  collider(context, 17.5, -7, 3, 1);
  const portalMat = material(context, "storage-portal", {
    physical: true, color: 0x9b6fff, emissive: 0x5521ff, emissiveIntensity: 3.2,
    roughness: .15, transparent: true, opacity: .76
  });
  const storagePortal = plane(context, 7, 5.5, portalMat, 13.9, 2.8, -22.9);
  storagePortal.rotation.set(0, 0, 0);
  storagePortal.name = "infinite-storage-portal";
  interactable(context, "infinite-storage", "infinite_storage", 14, -21.8, 4.8, "Öppna förrådet med oändligt många möbler", storagePortal);

  const furnitureSpecs = [
    ["storage-wardrobe-1", "wardrobe", 11.2, -18, .1], ["storage-wardrobe-2", "wardrobe", 17, -18, -.2],
    ["storage-table-1", "table", 10.8, -13, 0], ["storage-chair-1", "chair", 17, -13, .6],
    ["storage-sofa-1", "sofa", 16.5, -9.5, Math.PI], ["storage-crate-1", "crate", 11, -11, .3],
    ["storage-crate-2", "crate", 17, -11.5, -.4], ["storage-chair-2", "chair", 11, -16, 1.2],
    ["storage-table-2", "table", -10, -9, .1], ["storage-wardrobe-3", "wardrobe", -13, -1, .3],
    ["storage-sofa-2", "sofa", 8, 9, -.8], ["storage-crate-3", "crate", -7, 12, .4]
  ];
  furnitureSpecs.forEach((spec) => addFurniture(context, ...spec));

  const monster = addMonster(context, 0, 39, 1.1);
  monster.name = "monster-outside-house";
  interactable(context, "outside-monster", "danger", 0, 39, 11, "Håll monstret utanför huset", monster);
  const barrierSpots = [[-6, 17], [0, 17], [6, 17]].map(([x, z], i) => {
    const markerMat = material(context, `barrier-marker-${i}`, { color: 0xffd56c, emissive: 0xff9f1c, emissiveIntensity: 2.2, roughness: .4 });
    const marker = torus(context, 1.1, .12, markerMat, x, .08, z, { x: Math.PI / 2 });
    interactable(context, `barrier-spot-${i + 1}`, "build_spot", x, z, 2.1, "Bygg en stark barrikad här", marker);
    return marker;
  });

  const stationPortalMat = material(context, "station-portal", { color: 0x89d6ff, emissive: 0x2677d9, emissiveIntensity: 3 });
  const stationPortal = torus(context, 4.2, .38, stationPortalMat, -46, 4.4, -47, { y: Math.PI / 4 });
  pointLight(context, 0x55b4ff, 38, 22, -46, 4, -47);
  interactable(context, "station-path", "chapter_exit", -46, -47, 6, "Följ dimman till spökstationen", stationPortal);

  context.actors.house = house;
  context.actors.storagePortal = storagePortal;
  context.actors.monster = monster;
  context.actors.barrierSpots = barrierSpots;
  context.actors.stationPortal = stationPortal;
  return finishWorld(context);
}

function addGhostTrainModel(context, x, z, yaw = 0, carCount = 3) {
  const train = new THREE.Group();
  train.position.set(x, 0, z);
  train.rotation.y = yaw;
  train.name = "ghost-train";
  context.root.add(train);
  const bodyMat = material(context, "ghost-train-body", {
    physical: true,
    color: 0x182938,
    emissive: 0x071723,
    emissiveIntensity: .65,
    roughness: .38,
    metalness: .62,
    transparent: true,
    opacity: .94
  });
  const trimMat = material(context, "ghost-train-trim", {
    color: 0x94d7e8,
    emissive: 0x338bab,
    emissiveIntensity: 2.2,
    roughness: .24,
    metalness: .56
  });
  const glassMat = material(context, "ghost-train-glass", {
    physical: true,
    color: 0x78cce6,
    emissive: 0x1b698b,
    emissiveIntensity: 1.55,
    roughness: .1,
    transparent: true,
    opacity: .4
  });
  const wheelMat = material(context, "ghost-train-wheel", { color: 0x11161a, roughness: .42, metalness: .8 });
  const doors = [];
  const windows = [];
  const wheels = [];
  const cars = [];
  for (let carIndex = 0; carIndex < carCount; carIndex += 1) {
    const car = new THREE.Group();
    const localZ = (carIndex - (carCount - 1) / 2) * 15.8;
    car.position.set(0, 0, localZ);
    train.add(car);
    box(context, 5.8, 4.8, 14.7, bodyMat, 0, 3.25, 0, 0, car);
    box(context, 5.92, .2, 14.9, trimMat, 0, 5.45, 0, 0, car);
    box(context, 5.92, .14, 14.9, trimMat, 0, 1.2, 0, 0, car);
    for (const side of [-1, 1]) {
      for (const wz of [-5.1, -2.8, 2.8, 5.1]) {
        const window = box(context, .08, 1.35, 1.65, glassMat, side * 2.94, 3.85, wz, 0, car);
        windows.push(window);
      }
      const door = box(context, .1, 3.25, 2.2, trimMat, side * 3.0, 2.9, 0, 0, car);
      door.name = `ghost-train-door-${carIndex + 1}-${side > 0 ? "right" : "left"}`;
      doors.push(door);
    }
    for (const wz of [-4.8, 4.8]) {
      const axle = cylinder(context, .65, .65, 6.2, 18, wheelMat, 0, .85, wz, car);
      axle.rotation.z = Math.PI / 2;
      wheels.push(axle);
    }
    pointLight(context, 0x8ee8ff, 15, 10, 0, 4.4, localZ, train);
    cars.push(car);
  }
  train.userData.doors = doors;
  train.userData.windows = windows;
  return { group: train, cars, doors, windows, wheels };
}

function buildGhostStation() {
  const context = createWorld(
    "ghost_station",
    { minX: -48, maxX: 48, minZ: -84, maxZ: 84 },
    { x: -12, y: 0, z: 65, yaw: 0 },
    { sky: 0x101827, ground: 0x030609, hemisphere: .92, sun: 0x8099bb, sunIntensity: .82, sunX: -35, sunY: 44 }
  );
  context.root.userData.backgroundColor = 0x101827;
  const gravel = material(context, "station-gravel", { color: 0x34373b, roughness: 1 });
  const platformMat = material(context, "station-platform", { color: 0x79776f, roughness: .9 });
  const yellow = material(context, "station-warning-line", { color: 0xe5b83f, emissive: 0x4b3306, emissiveIntensity: .8, roughness: .62 });
  plane(context, 100, 176, gravel, 0, -.08, 0);
  box(context, 20, .7, 154, platformMat, -14, .35, 0);
  box(context, .5, .08, 154, yellow, -3.8, .76, 0);
  collider(context, -24, 0, .5, 154);

  const steel = material(context, "station-rail", { color: 0x6c7479, roughness: .34, metalness: .83 });
  const sleeper = material(context, "station-sleeper", { color: 0x4b362b, roughness: .96 });
  for (const x of [4.5, 10.2]) box(context, .2, .22, 168, steel, x, .12, 0);
  for (let z = -80; z <= 80; z += 2.3) box(context, 9, .18, .45, sleeper, 7.35, .02, z);

  const roofMat = material(context, "station-roof", { color: 0x2c343b, roughness: .61, metalness: .45 });
  const postMat = material(context, "station-post", { color: 0x444d54, roughness: .48, metalness: .62 });
  box(context, 19, .45, 78, roofMat, -14, 8.2, 11);
  for (const x of [-21, -7]) for (const z of [-24, -4, 16, 36, 50]) {
    cylinder(context, .18, .25, 8, 12, postMat, x, 4, z);
  }
  const stationLights = addPathLights(context, [[-18, 56], [-10, 42], [-18, 25], [-10, 8], [-18, -10], [-10, -27], [-18, -47]], 0x9eeaff);
  const stationSign = textPanel(context, "SPÖKSTATIONEN\nSISTA TÅGET: ALDRIG", {
    x: -14, y: 5.4, z: -39, width: 11, height: 3.2, background: "#10161d",
    border: "#8fdcf0", color: "#c9f6ff", font: "Arial, sans-serif", fontSize: 102,
    emissive: 0x12455d, emissiveIntensity: 1.4
  });
  interactable(context, "station-sign", "sign", -14, -39, 5.5, "Läs stationens tidtabell", stationSign);

  const trainModel = addGhostTrainModel(context, 7.4, 3, 0, 4);
  trainModel.group.position.z = 18;
  interactable(context, "ghost-train-door", "board_train", 4.4, 18, 5.2, "Gå ombord på spöktåget (du kanske inte kan gå av)", trainModel.doors[Math.floor(trainModel.doors.length / 2)]);

  const benchMat = material(context, "station-bench", { color: 0x4e342c, roughness: .86 });
  const bench = new THREE.Group();
  bench.position.set(-14, 0, -55);
  context.root.add(bench);
  box(context, 7, .25, 1.3, benchMat, 0, 1.4, 0, 0, bench);
  box(context, 7, 1.8, .22, benchMat, 0, 2.2, .52, 0, bench);
  for (const x of [-2.7, 2.7]) box(context, .22, 1.4, .22, benchMat, x, .7, 0, 0, bench);
  interactable(context, "refuse-train", "refuse_train", -14, -55, 4.8, "Stanna kvar och vänta på nya världar", bench);

  const stationClock = new THREE.Group();
  stationClock.position.set(-5, 6.2, 48);
  stationClock.rotation.y = -Math.PI / 2;
  context.root.add(stationClock);
  const clockFace = material(context, "station-clock", { color: 0xe7e6dc, emissive: 0x4c5861, emissiveIntensity: .65, roughness: .58 });
  const clockHand = material(context, "station-clock-hand", { color: 0x111319, roughness: .4 });
  cylinder(context, 1.6, 1.6, .18, 32, clockFace, 0, 0, 0, stationClock).rotation.z = Math.PI / 2;
  const hour = box(context, .12, .9, .08, clockHand, 0, .35, -.12, -.55, stationClock);
  const minute = box(context, .1, 1.25, .08, clockHand, .35, .4, -.14, 1.0, stationClock);

  context.actors.train = trainModel.group;
  context.actors.trainCars = trainModel.cars;
  context.actors.doors = trainModel.doors;
  context.actors.wheels = trainModel.wheels;
  context.actors.stationLights = stationLights;
  context.actors.stationSign = stationSign;
  context.actors.clock = stationClock;
  context.actors.clockHands = [hour, minute];
  context.actors.waitBench = bench;
  return finishWorld(context);
}

function buildGhostTrain() {
  const context = createWorld(
    "ghost_train",
    { minX: -7.5, maxX: 7.5, minZ: -96, maxZ: 96 },
    { x: 0, y: 0, z: 82, yaw: 0 },
    { sky: 0x030609, ground: 0x010203, hemisphere: .52, sun: 0x6faac4, sunIntensity: .35, sunY: 20 }
  );
  context.root.userData.backgroundColor = 0x030609;
  const floor = material(context, "train-interior-floor", { color: 0x3c4144, roughness: .74, metalness: .14 });
  const wall = material(context, "train-interior-wall", { color: 0x5d686b, roughness: .68, metalness: .22 });
  const ceiling = material(context, "train-interior-ceiling", { color: 0x303a3e, roughness: .7, metalness: .22 });
  const glass = material(context, "train-interior-glass", {
    physical: true, color: 0x4ba2c5, emissive: 0x153c5a, emissiveIntensity: 1.8,
    roughness: .1, transparent: true, opacity: .34
  });
  const trainInterior = new THREE.Group();
  trainInterior.name = "endless-empty-train-interior";
  context.root.add(trainInterior);
  box(context, 12, .4, 190, floor, 0, -.12, 0, 0, trainInterior);
  box(context, .45, 6.4, 190, wall, -6, 3.2, 0, 0, trainInterior);
  box(context, .45, 6.4, 190, wall, 6, 3.2, 0, 0, trainInterior);
  box(context, 12, .4, 190, ceiling, 0, 6.25, 0, 0, trainInterior);
  collider(context, -6, 0, .5, 190);
  collider(context, 6, 0, .5, 190);

  const windows = [];
  for (const side of [-1, 1]) for (let z = -86; z <= 86; z += 10) {
    const window = box(context, .08, 2.2, 6.2, glass, side * 5.72, 3.55, z, 0, trainInterior);
    windows.push(window);
  }
  const stripMat = material(context, "tunnel-streak", { color: 0x7edfff, emissive: 0x299fff, emissiveIntensity: 4 });
  const tunnelStreaks = [];
  for (const side of [-1, 1]) for (let i = 0; i < 18; i += 1) {
    tunnelStreaks.push(box(context, .05, .12, 4 + i % 4 * 2, stripMat, side * 7.2, 2 + i % 4, -85 + i * 10, 0, trainInterior));
  }

  const lightMat = material(context, "train-interior-light", { color: 0xb8f0ff, emissive: 0x6adfff, emissiveIntensity: 3.2 });
  const lights = [];
  for (let z = -88; z <= 88; z += 12) {
    lights.push(box(context, 2.8, .1, 1.2, lightMat, 0, 5.98, z, 0, trainInterior));
    if (z % 24 === 0) pointLight(context, 0x8fdfff, 13, 10, 0, 5.3, z, trainInterior);
  }

  const doorMat = material(context, "train-locked-door", { color: 0x29373d, emissive: 0x112f3e, emissiveIntensity: 1, roughness: .45, metalness: .58 });
  const lockedDoors = [];
  for (const z of [-92, -30, 30, 92]) {
    const leftDoor = box(context, 5.7, 5.7, .25, doorMat, -2.95, 2.85, z, 0, trainInterior);
    const rightDoor = box(context, 5.7, 5.7, .25, doorMat, 2.95, 2.85, z, 0, trainInterior);
    lockedDoors.push(leftDoor, rightDoor);
    collider(context, 0, z, 11.8, .35);
    if (Math.abs(z) < 40) interactable(context, `locked-train-door-${z}`, "locked_door", 0, z, 4, "Dörren går inte att öppna", leftDoor);
  }

  const noFoodSign = textPanel(context, "INGEN MAT\nINGEN UTGÅNG", {
    x: 0, y: 3.3, z: 28.7, width: 5.2, height: 2.5, background: "#32181a",
    border: "#ff746b", color: "#ffc3bd", font: "Arial, sans-serif", fontSize: 104,
    emissive: 0x5c1612, emissiveIntensity: 1.2
  });
  interactable(context, "no-food-sign", "sign", 0, 27.5, 3.7, "Läs den hotfulla skylten", noFoodSign);

  const impossibleExitMat = material(context, "impossible-stop", { color: 0xffc45b, emissive: 0xff7519, emissiveIntensity: 4, roughness: .18 });
  const impossibleExit = torus(context, 4.2, .42, impossibleExitMat, 0, 3.5, -88, {});
  impossibleExit.visible = false;
  interactable(context, "impossible-stop", "chapter_exit", 0, -86, 5.5, "Ett omöjligt stopp flimrar fram", impossibleExit);

  context.actors.train = trainInterior;
  context.actors.windows = windows;
  context.actors.tunnelStreaks = tunnelStreaks;
  context.actors.lights = lights;
  context.actors.doors = lockedDoors;
  context.actors.noFoodSign = noFoodSign;
  context.actors.impossibleExit = impossibleExit;
  return finishWorld(context);
}

function buildDesert() {
  const context = createWorld(
    "desert",
    { minX: -118, maxX: 118, minZ: -122, maxZ: 122 },
    { x: 0, y: 0, z: 105, yaw: 0 },
    { sky: 0x8b6749, ground: 0x29170e, hemisphere: 1.45, sun: 0xffc276, sunIntensity: 3.5, sunX: -70, sunY: 60 }
  );
  context.root.userData.backgroundColor = 0x8b6749;
  const sand = material(context, "desert-sand", { color: 0xb77c42, roughness: 1 });
  plane(context, 250, 258, sand, 0, -.06, 0);

  const dunes = [];
  for (let i = 0; i < 54; i += 1) {
    const x = -110 + ((i * 47) % 220);
    const z = -112 + ((i * 73) % 224);
    if (Math.abs(x) < 14 && z > -105) continue;
    const dune = sphere(context, 7 + i % 5 * 2, 18, 10, sand, x, -3.4 + i % 3 * .7, z);
    dune.scale.set(2.2 + i % 3 * .4, .55, 1.25);
    dune.rotation.y = i * .63;
    dunes.push(dune);
  }

  const deadWood = material(context, "desert-deadwood", { color: 0x513526, roughness: 1 });
  const cacti = [];
  const cactusMat = material(context, "desert-cactus", { color: 0x3f6440, roughness: .92 });
  for (let i = 0; i < 22; i += 1) {
    const x = -92 + ((i * 41) % 184);
    const z = -98 + ((i * 67) % 198);
    const cactus = new THREE.Group();
    cactus.position.set(x, 0, z);
    context.root.add(cactus);
    cylinder(context, .45, .55, 4 + i % 4, 12, cactusMat, 0, 2 + i % 4 * .5, 0, cactus);
    if (i % 2 === 0) {
      const arm = cylinder(context, .22, .28, 2.0, 10, cactusMat, .75, 2.4, 0, cactus);
      arm.rotation.z = Math.PI / 2.8;
    }
    cacti.push(cactus);
    collider(context, x, z, 1.1, 1.1);
  }
  for (const [x, z] of [[-73, 40], [76, 16], [-64, -68], [84, -84]]) {
    const branch = cylinder(context, .18, .35, 5.2, 8, deadWood, x, 2.2, z);
    branch.rotation.z = .55;
  }

  const mapStand = new THREE.Group();
  mapStand.position.set(0, 0, 78);
  context.root.add(mapStand);
  const mapWood = material(context, "desert-map-wood", { color: 0x5f3f2d, roughness: .9 });
  box(context, 7, .45, 4.8, mapWood, 0, 1.6, 0, 0, mapStand);
  box(context, .35, 1.6, .35, mapWood, -2.6, .8, 0, 0, mapStand);
  box(context, .35, 1.6, .35, mapWood, 2.6, .8, 0, 0, mapStand);
  const map = textPanel(context, "ÖKENKARTA\nX = GROTTAN TILL IKEA\n▲ = VÄGEN VIDARE", {
    x: 0, y: 2.1, z: 77.7, width: 9, height: 4.5, background: "#d7b77e",
    border: "#5b3b24", color: "#3a2619", font: "Arial, sans-serif", fontSize: 82,
    emissive: 0x2b190b, emissiveIntensity: .2
  });
  map.rotation.x = -.22;
  interactable(context, "desert-map", "map", 0, 78, 5.2, "Läs kartan över öknen", map);

  const caveRimMat = material(context, "desert-cave-rim", { color: 0x593a27, roughness: 1, flatShading: true });
  const caveDark = material(context, "desert-cave-dark", { color: 0x030303, emissive: 0x020102, emissiveIntensity: .2, roughness: 1 });
  const cave = new THREE.Group();
  cave.position.set(-72, 0, -55);
  cave.name = "map-cave-to-ikea";
  context.root.add(cave);
  cylinder(context, 7.8, 7.8, .35, 32, caveDark, 0, -.03, 0, cave);
  const caveRim = torus(context, 7.8, 1.05, caveRimMat, 0, .22, 0, { x: Math.PI / 2 }, cave);
  for (let i = 0; i < 9; i += 1) addRock(context, Math.sin(i) * 8.2, .3, Math.cos(i) * 8.2, 1.3 + i % 3 * .4, "desert-cave-rock", 0x5c3d28, cave);
  pointLight(context, 0x6b3cff, 32, 19, -72, 1.5, -55);
  interactable(context, "desert-cave", "desert_cave_return", -72, -55, 9, "Hoppa ner i kartgrottan och återvänd till IKEA", caveRim);

  const portalMat = material(context, "desert-onward", {
    physical: true, color: 0xffc85c, emissive: 0xff6f1c, emissiveIntensity: 3.6,
    roughness: .16, transparent: true, opacity: .82
  });
  const onwardPortal = torus(context, 6.5, .55, portalMat, 78, 6.4, -91, { y: -.25 });
  pointLight(context, 0xff8a32, 62, 34, 78, 6, -91);
  interactable(context, "desert-onward", "chapter_exit", 78, -91, 8, "Välj vägen vidare mot vulkanön", onwardPortal);

  const sandMonsters = [];
  for (const [x, z] of [[-24, 34], [35, 2], [-6, -27], [48, -54], [-51, -90]]) {
    const monster = addMonster(context, x, z, .72);
    monster.position.y = -5.5;
    monster.name = "sand-monster";
    monster.userData.buried = true;
    sandMonsters.push(monster);
  }

  const windLines = [];
  const windMat = material(context, "desert-wind", {
    color: 0xe7c58d, emissive: 0x5c3d1d, emissiveIntensity: .35,
    transparent: true, opacity: .32, roughness: 1
  });
  for (let i = 0; i < 18; i += 1) {
    const line = box(context, 18 + i % 5 * 6, .04, .04, windMat, -90 + (i * 29) % 180, 1 + i % 4 * .8, -100 + (i * 43) % 200, .16);
    windLines.push(line);
  }

  context.actors.dunes = dunes;
  context.actors.cacti = cacti;
  context.actors.map = map;
  context.actors.mapStand = mapStand;
  context.actors.cave = cave;
  context.actors.caveRim = caveRim;
  context.actors.onwardPortal = onwardPortal;
  context.actors.sandMonsters = sandMonsters;
  context.actors.windLines = windLines;
  return finishWorld(context);
}

function buildVolcanoIsland() {
  const context = createWorld(
    "volcano_island",
    { minX: -92, maxX: 92, minZ: -92, maxZ: 92 },
    { x: 0, y: 0, z: 65, yaw: 0 },
    { sky: 0x402c30, ground: 0x120708, hemisphere: .92, sun: 0xff7648, sunIntensity: 2.4, sunX: 54, sunY: 46 }
  );
  context.root.userData.backgroundColor = 0x402c30;
  const water = addWater(context, 210, 0x142f3d, -1.65);
  const islandRock = material(context, "volcano-island-rock", { color: 0x36312f, roughness: .98, flatShading: true });
  const ash = material(context, "volcano-ash", { color: 0x4b4039, roughness: 1 });
  cylinder(context, 68, 76, 5, 64, islandRock, 0, -2.4, 0);
  const islandTop = cylinder(context, 65, 69, 1.2, 64, ash, 0, .05, 0);
  islandTop.scale.z = .91;

  const volcanoGroup = new THREE.Group();
  volcanoGroup.position.set(0, 0, -17);
  volcanoGroup.name = "active-volcano";
  context.root.add(volcanoGroup);
  const coneRock = cone(context, 33, 38, 40, islandRock, 0, 18, 0, 0, volcanoGroup);
  coneRock.scale.z = .88;
  const craterDark = material(context, "volcano-crater", { color: 0x160908, roughness: .92 });
  const crater = torus(context, 9, 2.6, craterDark, 0, 36.2, 0, { x: Math.PI / 2 }, volcanoGroup);
  crater.scale.z = .82;

  const lavaMat = material(context, "volcano-lava", {
    physical: true, color: 0xff5b1f, emissive: 0xff2608, emissiveIntensity: 5,
    roughness: .2, metalness: .08, clearcoat: .45
  });
  const lava = [];
  const craterLava = cylinder(context, 7.2, 8.1, .7, 32, lavaMat, 0, 34.7, 0, volcanoGroup);
  craterLava.scale.z = .82;
  lava.push(craterLava);
  for (const [yaw, length] of [[-.45, 29], [.35, 36], [1.2, 24]]) {
    const flow = box(context, 3.2, .32, length, lavaMat, Math.sin(yaw) * 13, 9, Math.cos(yaw) * 13, yaw, volcanoGroup);
    flow.rotation.x = -.58;
    lava.push(flow);
  }
  pointLight(context, 0xff3b12, 110, 70, 0, 36, -17);

  const smoke = [];
  for (let i = 0; i < 14; i += 1) {
    const cloud = addCloud(context, Math.sin(i * 1.7) * (2 + i * .3), 39 + i * 3.1, -17 + Math.cos(i) * 3, .55 + i * .07, i % 3 ? 0x302b2d : 0x4a3a38);
    cloud.name = `volcano-smoke-${i + 1}`;
    smoke.push(cloud);
  }

  const pathMat = material(context, "volcano-path", { color: 0x695043, roughness: 1 });
  const path = [];
  for (let z = 59; z >= 5; z -= 7) {
    const x = Math.sin(z * .1) * 10;
    path.push(plane(context, 8, 8, pathMat, x, .65, z));
  }
  for (let i = 0; i < 30; i += 1) {
    const x = -58 + ((i * 31) % 116);
    const z = -58 + ((i * 47) % 116);
    if (Math.hypot(x, z + 17) < 36) continue;
    addRock(context, x, .8, z, 1.2 + i % 4 * .55, "volcano-boulder", 0x302c2b);
  }

  const warningBeaconMat = material(context, "volcano-beacon", { color: 0xffd35d, emissive: 0xff6b13, emissiveIntensity: 4 });
  const warningBeacons = [];
  for (const [x, z] of [[-18, 48], [18, 35], [-25, 19]]) {
    const beacon = sphere(context, .42, 16, 10, warningBeaconMat, x, 3.2, z);
    cylinder(context, .12, .2, 3, 10, islandRock, x, 1.5, z);
    pointLight(context, 0xff6d22, 25, 16, x, 3.2, z);
    warningBeacons.push(beacon);
  }
  const warningSign = textPanel(context, "VULKANEN VAKNAR\nSPRING TILL BÅTEN!", {
    x: 0, y: 3.7, z: 51, width: 10, height: 3.1, background: "#3d1811",
    border: "#ff8a45", color: "#ffd2a3", font: "Arial, sans-serif", fontSize: 104,
    emissive: 0x6b180a, emissiveIntensity: 1.4
  });
  interactable(context, "volcano-warning", "warning", 0, 51, 5.8, "Läs varningen och lyssna efter mullret", warningSign);

  const boat = addBoat(context, 54, -1.3, -47, .9, -.75);
  const escapeFlare = sphere(context, .5, 16, 10, warningBeaconMat, 49, 3.2, -42);
  pointLight(context, 0xffc45a, 55, 31, 49, 3.2, -42);
  interactable(context, "volcano-escape", "volcano_escape", 52, -45, 9, "Fly från ön innan utbrottet", boat);

  context.actors.water = water;
  context.actors.volcano = volcanoGroup;
  context.actors.crater = crater;
  context.actors.lava = lava;
  context.actors.smoke = smoke;
  context.actors.path = path;
  context.actors.warningBeacons = warningBeacons;
  context.actors.warningSign = warningSign;
  context.actors.boat = boat;
  context.actors.escape = escapeFlare;
  return finishWorld(context);
}

function buildMysteryVillage() {
  const context = createWorld(
    "mystery_village",
    { minX: -92, maxX: 92, minZ: -104, maxZ: 104 },
    { x: 0, y: 0, z: 100, yaw: 0 },
    { sky: 0x182133, ground: 0x06090b, hemisphere: .96, sun: 0x9fb4c9, sunIntensity: 1.15, sunX: -52, sunY: 48 }
  );
  context.root.userData.backgroundColor = 0x182133;
  const villageGround = material(context, "village-ground", { color: 0x263228, roughness: 1 });
  const road = material(context, "village-road", { color: 0x5c5548, roughness: 1 });
  plane(context, 196, 220, villageGround, 0, -.04, 0);
  for (let z = 95; z >= -85; z -= 9) plane(context, 10 + Math.sin(z) * .7, 10, road, Math.sin(z * .05) * 4, .01, z);

  const entranceSign = textPanel(context, "VILLAGE FROM 1920", {
    x: 0, y: 4.6, z: 77, width: 14, height: 3, background: "#2f261e",
    border: "#b69a66", color: "#e5d0a1", font: "Georgia, serif", fontSize: 118,
    emissive: 0x21170d, emissiveIntensity: .45
  });
  const signWood = material(context, "village-sign-wood", { color: 0x453226, roughness: .96 });
  box(context, .35, 5.5, .35, signWood, -6.25, 2.25, 77.3);
  box(context, .35, 5.5, .35, signWood, 6.25, 2.25, 77.3);
  interactable(context, "village-1920-sign", "old_sign", 0, 77, 7.8, "Läs den gamla engelska skylten", entranceSign);

  const houseSpecs = [
    [-30, 57, .2, 0x62594e], [28, 49, -.3, 0x5b6260], [-35, 23, .35, 0x6b5c50],
    [32, 15, -.4, 0x5d554d], [-27, -14, .15, 0x66635a], [35, -25, -.25, 0x60534b],
    [-32, -49, .38, 0x5a6061], [28, -58, -.28, 0x66584c]
  ];
  const houses = houseSpecs.map(([x, z, yaw, wall], i) => {
    const house = addHouse(context, x, z, yaw, { wall, roof: i % 2 ? 0x272329 : 0x302625 });
    house.name = `village-house-${i + 1}`;
    return house;
  });

  const villageLights = addPathLights(context, [[-6, 66], [7, 48], [-6, 30], [7, 12], [-6, -7], [7, -27], [-6, -48], [7, -68]], 0xa8d8ff);

  const well = new THREE.Group();
  well.position.set(0, 0, 6);
  context.root.add(well);
  const wellStone = material(context, "village-well", { color: 0x676963, roughness: 1 });
  const wellWater = material(context, "village-well-water", { color: 0x1c4a5b, emissive: 0x0a2536, emissiveIntensity: 1, roughness: .16 });
  cylinder(context, 3.2, 3.5, 2.2, 24, wellStone, 0, 1.1, 0, well);
  cylinder(context, 2.55, 2.55, .15, 24, wellWater, 0, 2.25, 0, well);
  for (const x of [-2.5, 2.5]) cylinder(context, .16, .23, 5.5, 10, signWood, x, 3.8, 0, well);
  box(context, 6.2, .3, 4.6, signWood, 0, 6.4, 0, 0, well);
  collider(context, 0, 6, 6.5, 6.5);

  const clockTower = new THREE.Group();
  clockTower.position.set(0, 0, -42);
  context.root.add(clockTower);
  const towerMat = material(context, "village-tower", { color: 0x655e53, roughness: .95 });
  const clockFaceMat = material(context, "village-clock-face", { color: 0xe1d4b7, emissive: 0x695c3e, emissiveIntensity: .65, roughness: .6 });
  const handMat = material(context, "village-clock-hand", { color: 0x161412, roughness: .5 });
  box(context, 7.5, 16, 7.5, towerMat, 0, 8, 0, 0, clockTower);
  cone(context, 6, 7, 4, signWood, 0, 19.5, 0, Math.PI / 4, clockTower);
  const clockFace = cylinder(context, 2.3, 2.3, .22, 32, clockFaceMat, 0, 13.1, 3.83, clockTower);
  clockFace.rotation.x = Math.PI / 2;
  const clockHour = box(context, .16, 1.3, .12, handMat, -.25, 13.5, 3.98, 0, clockTower);
  clockHour.rotation.z = .58;
  const clockMinute = box(context, .13, 1.8, .12, handMat, .65, 13.55, 4.0, 0, clockTower);
  clockMinute.rotation.z = -1.0;
  collider(context, 0, -42, 7.5, 7.5);

  const foundedPlaque = textPanel(context, "FOUNDED 1910", {
    x: 0, y: 6.2, z: -37.9, width: 6, height: 1.65, background: "#4a3c2c",
    border: "#c8a969", color: "#ead19d", font: "Georgia, serif", fontSize: 120,
    emissive: 0x3b2a16, emissiveIntensity: .55
  });
  interactable(context, "village-1910-plaque", "clue", 0, -37.5, 4.5, "Ledtråd 1: Läs årtalet på klocktornet", foundedPlaque);

  const clueTwo = textPanel(context, "THE BELL RANG\nTEN YEARS TOO SOON", {
    x: -31, y: 3.2, z: 20, yaw: Math.PI / 2, width: 7, height: 3.2, background: "#302a22",
    border: "#98815e", color: "#d9c49a", font: "Georgia, serif", fontSize: 88,
    emissive: 0x291b10, emissiveIntensity: .42
  });
  interactable(context, "village-clue-bell", "clue", -31, 20, 4.5, "Ledtråd 2: Undersök den blekta tavlan", clueTwo);

  const clueThree = textPanel(context, "NO ONE LEFT\nBUT WE STILL ARRIVE", {
    x: 29, y: 2.5, z: -56, yaw: -Math.PI / 2, width: 6.5, height: 3, background: "#272b2d",
    border: "#718b91", color: "#bcd5d6", font: "Georgia, serif", fontSize: 86,
    emissive: 0x142b31, emissiveIntensity: .7
  });
  interactable(context, "village-clue-arrive", "clue", 29, -56, 4.5, "Ledtråd 3: Läs meddelandet vid det tomma huset", clueThree);

  const gate = new THREE.Group();
  gate.position.set(0, 0, -86);
  gate.name = "mystery-gate";
  context.root.add(gate);
  const gateMat = material(context, "village-gate", { color: 0x303b40, roughness: .42, metalness: .78 });
  const gateGlow = material(context, "village-gate-glow", { color: 0x8ae8ff, emissive: 0x2fa9ff, emissiveIntensity: 4, roughness: .14 });
  for (const x of [-7, 7]) {
    box(context, 1.4, 10, 1.4, gateMat, x, 5, 0, 0, gate);
    sphere(context, .45, 16, 10, gateGlow, x, 10.2, 0, gate);
  }
  box(context, 15.5, 1.1, 1.1, gateMat, 0, 9.4, 0, 0, gate);
  const gateDoors = [];
  for (const side of [-1, 1]) {
    const door = box(context, 6.6, 7.8, .38, gateMat, side * 3.4, 4, 0, side * .03, gate);
    for (let i = -2; i <= 2; i += 1) box(context, .13, 7.4, .5, gateGlow, side * 3.4 + i * 1.1, 4, -.05, 0, gate);
    gateDoors.push(door);
  }
  collider(context, -3.4, -86, 6.6, .7);
  collider(context, 3.4, -86, 6.6, .7);
  pointLight(context, 0x4ac7ff, 65, 34, 0, 7, -86);
  interactable(context, "mystery-gate", "mystery_gate", 0, -83, 8.5, "Öppna porten när alla tre ledtrådarna är lösta", gate);

  const mistMat = material(context, "village-mist", {
    color: 0xa8bcc3, emissive: 0x25353d, emissiveIntensity: .25,
    transparent: true, opacity: .16, depthWrite: false, roughness: 1
  });
  const mist = [];
  for (let i = 0; i < 20; i += 1) {
    const cloud = sphere(context, 5 + i % 4 * 2, 16, 10, mistMat, -80 + (i * 37) % 160, .4 + i % 3 * .35, -90 + (i * 53) % 180);
    cloud.scale.set(2.4, .18, 1.2);
    mist.push(cloud);
  }

  context.actors.entranceSign = entranceSign;
  context.actors.houses = houses;
  context.actors.villageLights = villageLights;
  context.actors.well = well;
  context.actors.clockTower = clockTower;
  context.actors.clockHands = [clockHour, clockMinute];
  context.actors.foundedPlaque = foundedPlaque;
  context.actors.clues = [foundedPlaque, clueTwo, clueThree];
  context.actors.gate = gate;
  context.actors.gateDoors = gateDoors;
  context.actors.mist = mist;
  return finishWorld(context);
}
