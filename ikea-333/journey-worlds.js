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
  "mystery_village",
  "haunted_school",
  "lighthouse_city",
  "forbidden_hotel",
  "graveyard_secret",
  "lost_carnival",
  "dollmaker_house",
  "midnight_museum",
  "forgotten_hospital",
  "four_floors_down"
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
    objective: "Spöktåget avgår exakt 03:33. Tänk efter innan du går ombord.",
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
    objective: "Vulkanen exploderar efter 30 sekunder. Nå flyktbåten innan lavan kommer.",
    next: "mystery_village",
    fail: "warehouse"
  },
  mystery_village: {
    title: "Byn som inte borde finnas",
    objective: "Hitta tre engelska ledtrådar och öppna den gamla porten.",
    next: "haunted_school"
  },
  haunted_school: {
    title: "Skolan klockan 03:33",
    objective: "Lös skolans tre pussel innan IKEA-monstret hittar dig och öppna nödutgången.",
    next: "lighthouse_city"
  },
  lighthouse_city: {
    title: "Fyren vid havet",
    objective: "Fly den enorma tsunamin, nå fyren på berget och avslöja hemligheten i källaren.",
    next: "forbidden_hotel"
  },
  forbidden_hotel: {
    title: "Det förbjudna hotellet",
    objective: "Hitta tre nycklar och tre dokument medan skuggvarelsen följer efter dig.",
    next: "graveyard_secret"
  },
  graveyard_secret: {
    title: "Kyrkogårdens hemlighet",
    objective: "Lös gravarnas tre gåtor och öppna altarets hemliga passage före gryningen.",
    next: "lost_carnival"
  },
  lost_carnival: {
    title: "Det försvunna tivolit",
    objective: "Stäng av tre övergivna åkattraktioner och håll ögonen på clownen.",
    next: "dollmaker_house"
  },
  dollmaker_house: {
    title: "Dockmakarens hus",
    objective: "Hitta tre ledtrådar bland dockorna och öppna husets låsta bakdörr.",
    next: "midnight_museum"
  },
  midnight_museum: {
    title: "Museet efter stängning",
    objective: "Lös tre utställningsledtrådar innan klockan slår midnatt och monstret vaknar.",
    next: "forgotten_hospital"
  },
  forgotten_hospital: {
    title: "Det glömda sjukhuset",
    objective: "Använd hissen, undersök våning 4, 7 och 13 och undvik sjuksköterskan.",
    next: "four_floors_down"
  },
  four_floors_down: {
    title: "Fyra våningar ner",
    objective: "Ta hissen till den hemliga källaren och hitta rätt väg genom korridorerna som skiftar.",
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
  mystery_village: buildMysteryVillage,
  haunted_school: buildHauntedSchool,
  lighthouse_city: buildLighthouseCity,
  forbidden_hotel: buildForbiddenHotel,
  graveyard_secret: buildGraveyardSecret,
  lost_carnival: buildLostCarnival,
  dollmaker_house: buildDollmakerHouse,
  midnight_museum: buildMidnightMuseum,
  forgotten_hospital: buildForgottenHospital,
  four_floors_down: buildFourFloorsDown
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
  const helm = torus(context, 0.38, 0.065, helmMat, 0, 2.15, -5.7, { x: 0, y: 0, z: 0 }, boatRig);
  for (let i = 0; i < 8; i += 1) {
    const spoke = box(context, 0.055, .78, 0.055, helmMat, 0, 2.15, -5.7, 0, boatRig);
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
  const stationSign = textPanel(context, "SPÖKSTATIONEN\nAVGÅNG: 03:33", {
    x: -14, y: 5.4, z: 38, width: 11, height: 3.2, background: "#10161d",
    border: "#8fdcf0", color: "#c9f6ff", font: "Arial, sans-serif", fontSize: 102,
    emissive: 0x12455d, emissiveIntensity: 1.4
  });
  interactable(context, "station-sign", "sign", -14, 38, 5.5, "Tidtabell: Spöktåget avgår 03:33", stationSign);

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
  const hourPivot = new THREE.Group();
  const minutePivot = new THREE.Group();
  hourPivot.position.x = .14;
  minutePivot.position.x = .16;
  hourPivot.rotation.x = -(3 + 32 / 60) / 12 * Math.PI * 2;
  minutePivot.rotation.x = -(32 / 60) * Math.PI * 2;
  stationClock.add(hourPivot, minutePivot);
  box(context, .12, .9, .08, clockHand, 0, .45, 0, 0, hourPivot);
  box(context, .1, 1.25, .08, clockHand, 0, .625, 0, 0, minutePivot);
  sphere(context, .14, 12, 8, clockHand, .19, 0, 0, stationClock);

  context.actors.train = trainModel.group;
  context.actors.trainCars = trainModel.cars;
  context.actors.doors = trainModel.doors;
  context.actors.wheels = trainModel.wheels;
  context.actors.stationLights = stationLights;
  context.actors.stationSign = stationSign;
  context.actors.clock = stationClock;
  context.actors.clockHands = [hourPivot, minutePivot];
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
  const warningSign = textPanel(context, "VULKANEN VAKNAR\nFLY INOM 30 SEKUNDER!", {
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

function buildHauntedSchool() {
  const context = createWorld(
    "haunted_school",
    { minX: -33, maxX: 33, minZ: -93, maxZ: 93 },
    { x: 0, y: 0, z: 84, yaw: 0 },
    {
      sky: 0x050812,
      ground: 0x010203,
      hemisphere: .48,
      sun: 0x7183a8,
      sunIntensity: .32,
      sunX: -28,
      sunY: 24,
      sunZ: 18
    }
  );
  context.root.userData.backgroundColor = 0x050812;
  context.root.userData.isInterior = true;

  const floorMat = material(context, "school-floor", { color: 0x374046, roughness: .76, metalness: .08 });
  const classroomFloorMat = material(context, "school-classroom-floor", { color: 0x493e35, roughness: .93 });
  const wallMat = material(context, "school-wall", { color: 0x77786f, roughness: .98 });
  const lowerWallMat = material(context, "school-lower-wall", { color: 0x314244, roughness: .92 });
  const ceilingMat = material(context, "school-ceiling", { color: 0x30343a, roughness: .96 });
  const trimMat = material(context, "school-trim", { color: 0x202a2c, roughness: .82 });
  const oldWood = material(context, "school-old-wood", { color: 0x5a3f2c, roughness: .95 });
  const darkWood = material(context, "school-dark-wood", { color: 0x281e1a, roughness: .96 });
  const metalMat = material(context, "school-metal", { color: 0x465159, roughness: .43, metalness: .72 });
  const glassMat = material(context, "school-night-window", {
    physical: true,
    color: 0x193a58,
    emissive: 0x0b1d39,
    emissiveIntensity: 1.2,
    roughness: .12,
    transparent: true,
    opacity: .5
  });
  const blackboardMat = material(context, "school-blackboard", {
    color: 0x172a24,
    emissive: 0x07100d,
    emissiveIntensity: .22,
    roughness: .97
  });

  plane(context, 16, 188, floorMat, 0, 0, 0);
  plane(context, 25, 188, classroomFloorMat, -20.5, -.01, 0);
  plane(context, 25, 188, classroomFloorMat, 20.5, -.01, 0);
  box(context, 68, .45, 190, ceilingMat, 0, 9.05, 0);

  // Ytterväggarna och bakväggen lämnar en riktig öppning framför nödutgången.
  for (const x of [-34, 34]) {
    box(context, 1, 9, 190, wallMat, x, 4.5, 0);
    box(context, .12, 3.1, 188, lowerWallMat, x + (x < 0 ? .56 : -.56), 1.55, 0);
    collider(context, x, 0, 1, 190);
  }
  box(context, 68, 9, 1, wallMat, 0, 4.5, 94);
  collider(context, 0, 94, 68, 1);
  for (const x of [-19, 19]) {
    box(context, 30, 9, 1, wallMat, x, 4.5, -94);
    collider(context, x, -94, 30, 1);
  }

  // Korridorväggarna har öppna dörrpassager till två spelbara klassrum.
  const addCorridorWall = (x, z, length) => {
    box(context, .5, 8.7, length, wallMat, x, 4.35, z);
    box(context, .16, 3.1, length, lowerWallMat, x + (x < 0 ? .32 : -.32), 1.55, z);
    box(context, .75, .24, length, trimMat, x + (x < 0 ? .42 : -.42), 3.12, z);
    collider(context, x, z, .55, length);
  };
  addCorridorWall(-8, 59, 70);
  addCorridorWall(-8, -12, 64);
  addCorridorWall(-8, -70, 48);
  addCorridorWall(8, 36, 116);
  addCorridorWall(8, -60, 68);

  // Klassrumsavdelare skapar en riktig gammal skola utan att stänga huvudgången.
  for (const z of [45, 0, -46]) {
    for (const x of [-21, 21]) {
      box(context, 25, 8.7, .5, wallMat, x, 4.35, z);
      collider(context, x, z, 25, .55);
    }
  }

  const windows = [];
  for (const side of [-1, 1]) {
    for (const z of [68, 54, 32, 15, -16, -32, -61, -76]) {
      const window = box(context, .1, 2.6, 5.8, glassMat, side * 33.42, 5.65, z);
      windows.push(window);
      for (const dz of [-2.95, 2.95]) box(context, .18, 3.05, .18, trimMat, side * 33.31, 5.65, z + dz);
    }
  }

  const entrySign = textPanel(context, "NATTSKOLAN\nINGEN LEKTION EFTER 03:33", {
    x: 0,
    y: 5.5,
    z: 93.42,
    width: 13.5,
    height: 3.1,
    background: "#20272b",
    border: "#879698",
    color: "#d8ded6",
    font: "Arial, sans-serif",
    fontSize: 94,
    emissive: 0x18262b,
    emissiveIntensity: .72
  });
  interactable(context, "school-warning-sign", "sign", 0, 89, 5.8, "Läs skolans varning", entrySign);

  const lights = [];
  const lightMat = material(context, "school-flicker-light", {
    color: 0xd5f6f2,
    emissive: 0x8be1d5,
    emissiveIntensity: 3.8,
    roughness: .22
  });
  const deadLightMat = material(context, "school-dead-light", {
    color: 0x464b49,
    emissive: 0x111716,
    emissiveIntensity: .15,
    roughness: .74
  });
  [79, 62, 45, 28, 11, -6, -23, -40, -57, -74, -87].forEach((z, index) => {
    const fixture = new THREE.Group();
    fixture.position.set(index % 3 === 0 ? -.7 : .7, 0, z);
    fixture.name = `school-ceiling-light-${index + 1}`;
    fixture.userData.flickerOffset = index * .71;
    fixture.userData.baseIntensity = index % 4 === 2 ? 18 : 28;
    context.root.add(fixture);
    box(context, 4.6, .13, .72, index % 5 === 3 ? deadLightMat : lightMat, 0, 8.72, 0, 0, fixture);
    const glow = pointLight(
      context,
      index % 4 === 0 ? 0xa8cfff : 0xc8fff0,
      fixture.userData.baseIntensity,
      20,
      0,
      7.8,
      0,
      fixture
    );
    glow.userData.baseIntensity = fixture.userData.baseIntensity;
    fixture.userData.light = glow;
    lights.push(fixture);
  });

  // Dörrar på gångjärn. Motorn kan låsa och slå igen grupperna vid 03:33.
  const doors = [];
  const doorMat = material(context, "school-door", { color: 0x4c3528, roughness: .87, metalness: .03 });
  const doorWindowMat = material(context, "school-door-window", {
    physical: true,
    color: 0x4e7684,
    emissive: 0x142f3c,
    emissiveIntensity: .8,
    roughness: .15,
    transparent: true,
    opacity: .5
  });
  const makeClassroomDoor = (name, x, z, yaw) => {
    const hinge = new THREE.Group();
    hinge.position.set(x, 0, z);
    hinge.rotation.y = yaw;
    hinge.name = name;
    hinge.userData.openYaw = yaw;
    hinge.userData.closedYaw = 0;
    context.root.add(hinge);
    box(context, .24, 4.9, 3.6, doorMat, 0, 2.45, 1.8, 0, hinge);
    box(context, .26, 1.35, 1.65, doorWindowMat, 0, 3.38, 1.8, 0, hinge);
    cylinder(context, .09, .09, .15, 12, metalMat, -.2, 2.3, 3.25, hinge).rotation.z = Math.PI / 2;
    doors.push(hinge);
    return hinge;
  };
  makeClassroomDoor("school-door-fuse-room", -8, 20.1, -.82);
  makeClassroomDoor("school-door-bell-room", 8, -26.1, .82);

  const lockers = [];
  const lockerMat = material(context, "school-locker", { color: 0x45575a, roughness: .59, metalness: .48 });
  const lockerDark = material(context, "school-locker-dark", { color: 0x1d292b, roughness: .52, metalness: .62 });
  for (const side of [-1, 1]) {
    for (const z of [73, 64, 43, 34, 8, -3, -42, -54, -68]) {
      if ((side < 0 && Math.abs(z - 22) < 7) || (side > 0 && Math.abs(z + 24) < 7)) continue;
      const bank = new THREE.Group();
      bank.position.set(side * 6.92, 0, z);
      bank.name = `school-lockers-${side < 0 ? "left" : "right"}-${z}`;
      context.root.add(bank);
      box(context, 1.2, 3.8, 7.1, lockerMat, 0, 1.9, 0, 0, bank);
      for (let i = -2; i <= 2; i += 1) {
        box(context, .05, 3.35, .08, lockerDark, -side * .63, 1.9, i * 1.37, 0, bank);
        box(context, .08, .12, .52, metalMat, -side * .67, 2.05, i * 1.37, 0, bank);
      }
      lockers.push(bank);
    }
  }

  const addSchoolDesk = (x, z, yaw = 0) => {
    const desk = new THREE.Group();
    desk.position.set(x, 0, z);
    desk.rotation.y = yaw;
    context.root.add(desk);
    box(context, 3.2, .18, 1.55, oldWood, 0, 1.75, 0, 0, desk);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(context, .14, 1.7, .14, darkWood, sx * 1.25, .85, sz * .52, 0, desk);
    }
    box(context, 1.15, .14, 1.05, oldWood, 0, 1.03, 2.0, 0, desk);
    box(context, 1.15, 1.5, .12, darkWood, 0, 1.72, 2.46, 0, desk);
    return desk;
  };
  const desks = [];
  for (const [x, z, yaw] of [
    [-25, 35, .08], [-17, 35, -.08], [-25, 7, -.04], [-17, 7, .06],
    [17, -9, -.05], [25, -9, .07], [17, -37, .06], [25, -37, -.08],
    [-25, -62, .12], [-17, -62, -.1], [17, 62, -.08], [25, 62, .1]
  ]) desks.push(addSchoolDesk(x, z, yaw));

  for (const [x, z, yaw] of [[-33.3, 14, Math.PI / 2], [33.3, -34, -Math.PI / 2], [-20, 45.3, 0], [20, .3, Math.PI]]) {
    const board = box(context, .18, 3.2, 11, blackboardMat, x, 4.4, z, yaw);
    board.name = "old-school-blackboard";
  }

  // Pussel 1: den stannade klockan i korridoren.
  const clock = new THREE.Group();
  clock.position.set(7.54, 5.35, 55);
  clock.rotation.z = Math.PI / 2;
  clock.name = "school-clock-0333";
  context.root.add(clock);
  const clockFaceMat = material(context, "school-clock-face", {
    color: 0xe6dfcb,
    emissive: 0x51483b,
    emissiveIntensity: .7,
    roughness: .62
  });
  const clockHandMat = material(context, "school-clock-hands", { color: 0x161313, roughness: .5 });
  cylinder(context, 1.55, 1.55, .22, 32, clockFaceMat, 0, 0, 0, clock);
  box(context, .11, .12, 1.05, clockHandMat, 0, .15, .4, .54, clock);
  box(context, .09, .13, 1.32, clockHandMat, 0, .17, -.5, -1.02, clock);
  sphere(context, .14, 12, 8, clockHandMat, 0, .18, 0, clock);
  const clockLabel = textPanel(context, "03:33", {
    x: 7.48,
    y: 2.15,
    z: 55,
    yaw: -Math.PI / 2,
    width: 3.2,
    height: 1.15,
    background: "#29191b",
    border: "#a64a4a",
    color: "#ffaaa2",
    font: "Arial, sans-serif",
    fontSize: 150,
    emissive: 0x5f1515,
    emissiveIntensity: 1.4
  });
  interactable(context, "school-puzzle-clock", "school_puzzle", 4.8, 55, 3.8, "Ställ den stannade skolklockan på 03:33", clock);

  // Pussel 2: säkringarna i det västra klassrummet.
  const fuseBox = new THREE.Group();
  fuseBox.position.set(-32.95, 0, 17);
  fuseBox.name = "school-fuse-box";
  context.root.add(fuseBox);
  box(context, .45, 4.2, 4.5, metalMat, 0, 3.05, 0, 0, fuseBox);
  const fuseGlowColors = [0xff3c34, 0xffbe35, 0x62d8ff];
  const fuses = [];
  fuseGlowColors.forEach((color, index) => {
    const fuseMat = material(context, `school-fuse-${index}`, { color, emissive: color, emissiveIntensity: 2.6, roughness: .22 });
    const fuse = sphere(context, .22, 14, 10, fuseMat, -.28, 3.95 - index * .9, -1.2 + index * 1.2, fuseBox);
    fuses.push(fuse);
  });
  pointLight(context, 0x4d9dff, 22, 11, -31.6, 4.3, 17);
  interactable(context, "school-puzzle-fuses", "school_puzzle", -29.3, 17, 4.8, "Koppla säkringarna i rätt ordning", fuseBox);

  // Pussel 3: den rostiga skolklockan i det östra klassrummet.
  const bell = new THREE.Group();
  bell.position.set(24, 0, -25);
  bell.name = "school-brass-bell";
  context.root.add(bell);
  const brassMat = material(context, "school-bell-brass", { color: 0x9f7335, emissive: 0x39240c, emissiveIntensity: .55, roughness: .35, metalness: .76 });
  cylinder(context, .55, 1.35, 2.0, 22, brassMat, 0, 3.9, 0, bell);
  torus(context, 1.3, .14, brassMat, 0, 2.88, 0, { x: Math.PI / 2 }, bell);
  sphere(context, .28, 14, 10, darkWood, 0, 2.55, 0, bell);
  box(context, 3.5, 3.8, .28, oldWood, 0, 3.4, 1.0, 0, bell);
  pointLight(context, 0xffb54d, 18, 10, 24, 4.1, -25);
  interactable(context, "school-puzzle-bell", "school_puzzle", 24, -25, 4.8, "Ring klockan med den hemliga rytmen", bell);

  // En öppen städgarderob ger spelaren ett tydligt gömställe i korridoren.
  const hideout = new THREE.Group();
  hideout.position.set(-5.55, 0, -55);
  hideout.rotation.y = .12;
  hideout.name = "school-cleaning-hideout";
  context.root.add(hideout);
  box(context, 3.1, 5.4, 2.15, darkWood, 0, 2.7, 0, 0, hideout);
  const hideDoor = box(context, .16, 5.05, 1.45, doorMat, 1.5, 2.62, 1.22, -.8, hideout);
  hideDoor.name = "school-hideout-door";
  interactable(context, "school-hideout", "hideout", -5.2, -52.8, 3.5, "Göm dig i den gamla städgarderoben", hideout);

  const footstepMat = material(context, "school-footsteps", {
    color: 0x7ec6df,
    emissive: 0x207c9c,
    emissiveIntensity: 2,
    transparent: true,
    opacity: .34,
    depthWrite: false,
    roughness: .5
  });
  const footsteps = [];
  for (let i = 0; i < 12; i += 1) {
    const step = plane(context, .36, .78, footstepMat, i % 2 ? .8 : -.8, .025, -8 - i * 4.1);
    step.rotation.z = (i % 2 ? -.13 : .13) + Math.sin(i) * .05;
    step.name = `mysterious-footstep-${i + 1}`;
    step.userData.phase = i * .42;
    footsteps.push(step);
  }

  // Samma gestalt som jagar spelaren i IKEA, osynlig tills klockan slår 03:33.
  const monster = addMonster(context, 0, -67, 1.08);
  monster.name = "ikea-monster-at-school";
  monster.visible = false;
  monster.userData.appearsAt = "03:33";

  const exitDoor = new THREE.Group();
  exitDoor.position.set(0, 0, -93.35);
  exitDoor.name = "locked-school-exit-door";
  exitDoor.userData.locked = true;
  exitDoor.userData.closedY = 0;
  context.root.add(exitDoor);
  const exitDoorMat = material(context, "school-exit-door", { color: 0x26373a, roughness: .5, metalness: .64 });
  const exitBarMat = material(context, "school-exit-bar", { color: 0xa8b6b8, roughness: .28, metalness: .86 });
  const leftExit = box(context, 3.75, 7.2, .42, exitDoorMat, -1.9, 3.6, 0, 0, exitDoor);
  const rightExit = box(context, 3.75, 7.2, .42, exitDoorMat, 1.9, 3.6, 0, 0, exitDoor);
  box(context, 6.2, .22, .28, exitBarMat, 0, 3.25, .28, 0, exitDoor);
  for (const x of [-1.9, 1.9]) box(context, 2.5, 1.65, .08, glassMat, x, 5.45, .25, 0, exitDoor);
  doors.push(leftExit, rightExit);

  const exitLight = new THREE.Group();
  exitLight.position.set(0, 0, -91.9);
  exitLight.name = "school-exit-light";
  exitLight.visible = false;
  context.root.add(exitLight);
  const exitGlowMat = material(context, "school-exit-glow", { color: 0xff4538, emissive: 0xff160d, emissiveIntensity: 4.2, roughness: .17 });
  box(context, 4.8, 1.15, .22, exitGlowMat, 0, 8.05, 0, 0, exitLight);
  const exitLamp = pointLight(context, 0xff2d22, 42, 20, 0, 7.5, 1.0, exitLight);
  exitLamp.userData.lockedColor = 0xff2d22;
  exitLamp.userData.openColor = 0x45ff91;
  interactable(context, "school-exit", "school_exit", 0, -88.5, 6.2, "Öppna nödutgången när alla tre pussel är lösta", exitDoor);

  context.actors.school = context.root;
  context.actors.windows = windows;
  context.actors.entrySign = entrySign;
  context.actors.lights = lights;
  context.actors.doors = doors;
  context.actors.lockers = lockers;
  context.actors.desks = desks;
  context.actors.clock = clock;
  context.actors.clockLabel = clockLabel;
  context.actors.fuseBox = fuseBox;
  context.actors.fuses = fuses;
  context.actors.bell = bell;
  context.actors.hideout = hideout;
  context.actors.footsteps = footsteps;
  context.actors.monster = monster;
  context.actors.exitDoor = exitDoor;
  context.actors.exitLight = exitLight;
  return finishWorld(context);
}

function buildLighthouseCity() {
  const context = createWorld(
    "lighthouse_city",
    { minX: -128, maxX: 128, minZ: -142, maxZ: 148 },
    { x: 0, y: 0, z: 124, yaw: 0 },
    {
      sky: 0x111927,
      ground: 0x02070b,
      hemisphere: .72,
      sun: 0x9ab9d1,
      sunIntensity: .7,
      sunX: -70,
      sunY: 54,
      sunZ: -30
    }
  );
  context.root.userData.backgroundColor = 0x111927;
  context.root.userData.storm = true;

  const wetGround = material(context, "lighthouse-city-ground", {
    physical: true,
    color: 0x252f36,
    emissive: 0x071018,
    emissiveIntensity: .25,
    roughness: .38,
    metalness: .18,
    clearcoat: .62,
    clearcoatRoughness: .22
  });
  const roadMat = material(context, "lighthouse-city-road", {
    physical: true,
    color: 0x20272b,
    roughness: .3,
    metalness: .16,
    clearcoat: .72,
    clearcoatRoughness: .18
  });
  const sidewalkMat = material(context, "lighthouse-city-sidewalk", { color: 0x5d676a, roughness: .82 });
  const mountainMat = material(context, "lighthouse-mountain", { color: 0x333a39, roughness: 1, flatShading: true });
  plane(context, 270, 310, wetGround, 0, -.08, 3);
  plane(context, 23, 190, roadMat, 0, .01, 42);
  for (const x of [-14, 14]) box(context, 5, .22, 190, sidewalkMat, x, .1, 42);

  const roadMarkMat = material(context, "lighthouse-road-marks", { color: 0xd9c46e, emissive: 0x3f3512, emissiveIntensity: .5, roughness: .64 });
  for (let z = 128; z >= -43; z -= 12) box(context, .32, .05, 5.5, roadMarkMat, 0, .08, z);

  const buildings = [];
  const windows = [];
  const buildingColors = [0x46515a, 0x39464c, 0x51505b, 0x3e4854];
  const windowColors = [0x74c5e2, 0xffd48b, 0x9be1ff];
  const buildingSpecs = [
    [-34, 95, 25, 16, 34], [36, 94, 28, 17, 45], [-68, 82, 28, 22, 58], [70, 76, 30, 23, 39],
    [-36, 52, 28, 18, 48], [38, 48, 30, 19, 31], [-72, 30, 27, 24, 43], [72, 23, 31, 22, 54],
    [-36, 7, 27, 20, 38], [37, 2, 29, 18, 50], [-68, -25, 30, 23, 34], [70, -29, 31, 21, 44]
  ];
  buildingSpecs.forEach(([x, z, w, d, h], index) => {
    const building = new THREE.Group();
    building.position.set(x, 0, z);
    building.name = `storm-city-building-${index + 1}`;
    context.root.add(building);
    const facade = material(context, `lighthouse-building-${index}`, { color: buildingColors[index % buildingColors.length], roughness: .84, metalness: .08 });
    box(context, w, h, d, facade, 0, h / 2, 0, 0, building);
    const windowMat = material(context, `lighthouse-window-${index}`, {
      color: windowColors[index % windowColors.length],
      emissive: windowColors[index % windowColors.length],
      emissiveIntensity: index % 3 === 1 ? 1.4 : .54,
      roughness: .2
    });
    const frontZ = -d / 2 - .04;
    for (let floor = 0; floor < Math.min(8, Math.floor(h / 5)); floor += 1) {
      for (const dx of [-w * .28, 0, w * .28]) {
        const window = box(context, 2.5, 1.7, .08, windowMat, dx, 4 + floor * 4.5, frontZ, 0, building);
        windows.push(window);
      }
    }
    collider(context, x, z, w, d);
    buildings.push(building);
  });

  const streetLights = addPathLights(context, [
    [-11, 116], [11, 101], [-11, 83], [11, 65], [-11, 47], [11, 29], [-11, 11], [11, -8], [-11, -27], [11, -43]
  ], 0x9dcfff);

  const hillPath = [];
  const hillPoints = [[8, -51], [17, -59], [25, -68], [31, -78], [37, -88], [43, -97]];
  hillPoints.forEach(([x, z], index) => {
    const slab = plane(context, 14, 14, index % 2 ? sidewalkMat : roadMat, x, .06 + index * .005, z);
    slab.rotation.z = -.15 - index * .012;
    hillPath.push(slab);
  });
  for (let i = 0; i < 38; i += 1) {
    const angle = i / 38 * Math.PI * 2;
    const radius = 24 + (i % 5) * 4.5;
    const x = 45 + Math.cos(angle) * radius;
    const z = -105 + Math.sin(angle) * radius;
    if (x > 4 && x < 53 && z > -101 && z < -44) continue;
    const rock = sphere(context, 7 + i % 4 * 2, 12, 8, mountainMat, x, -2.2 + i % 3, z);
    rock.scale.set(1.45, .8 + i % 2 * .22, 1.1);
    rock.rotation.y = i * .48;
  }

  const stormClouds = [];
  for (const [x, y, z, scale] of [
    [-75, 48, 92, 3.3], [-20, 54, 34, 4.2], [58, 46, 66, 3.7], [91, 52, -12, 3.4],
    [-84, 45, -51, 3.9], [20, 58, -91, 4.6], [88, 49, -112, 3.1]
  ]) {
    const cloud = addCloud(context, x, y, z, scale, 0x252d3d);
    cloud.name = "lighthouse-storm-cloud";
    cloud.userData.drift = .4 + scale * .08;
    stormClouds.push(cloud);
  }

  const rainGeometry = new THREE.BufferGeometry();
  const rainPositions = [];
  for (let i = 0; i < 260; i += 1) {
    const x = -122 + ((i * 47) % 244);
    const y = 3 + ((i * 29) % 40);
    const z = -138 + ((i * 71) % 280);
    rainPositions.push(x, y, z, x + .45, y - 3.8, z + .35);
  }
  rainGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.LineBasicMaterial({ color: 0x9bcbe2, transparent: true, opacity: .34 });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.name = "lighthouse-storm-rain";
  context.root.add(rain);

  // En enorm rörlig våg bakom staden; motorn för den in över gatorna.
  const tsunami = new THREE.Group();
  tsunami.position.set(0, 0, 153);
  tsunami.name = "enormous-city-tsunami";
  tsunami.userData.startZ = 153;
  tsunami.userData.safeZ = -78;
  context.root.add(tsunami);
  const waveMat = material(context, "lighthouse-tsunami-water", {
    physical: true,
    color: 0x176995,
    emissive: 0x082c4b,
    emissiveIntensity: .8,
    roughness: .08,
    metalness: .2,
    transparent: true,
    opacity: .9,
    clearcoat: 1,
    clearcoatRoughness: .06
  });
  const foamMat = material(context, "lighthouse-tsunami-foam", {
    color: 0xd2f4ff,
    emissive: 0x86ddff,
    emissiveIntensity: 1.45,
    roughness: .5
  });
  box(context, 272, 31, 15, waveMat, 0, 14.5, 0, 0, tsunami);
  for (let x = -126; x <= 126; x += 12) {
    const crest = sphere(context, 7.8, 16, 10, foamMat, x, 31 + Math.sin(x * .09) * 2, -3.8, tsunami);
    crest.scale.set(1.15, .45, .8);
  }
  pointLight(context, 0x75d6ff, 75, 80, 0, 25, -8, tsunami);

  const lighthouse = new THREE.Group();
  lighthouse.position.set(45, 0, -106);
  lighthouse.name = "lonely-lighthouse";
  context.root.add(lighthouse);
  const towerMat = material(context, "lighthouse-tower", { color: 0xd7d2c3, roughness: .8 });
  const towerBandMat = material(context, "lighthouse-bands", { color: 0x9d3430, roughness: .69 });
  const lighthouseMetal = material(context, "lighthouse-metal", { color: 0x2f3940, roughness: .36, metalness: .78 });
  cylinder(context, 5.2, 8.3, 29, 32, towerMat, 0, 14.5, 0, lighthouse);
  for (const y of [6, 15.5, 25]) cylinder(context, 5.4 + (25 - y) * .08, 5.6 + (25 - y) * .08, 2.2, 32, towerBandMat, 0, y, 0, lighthouse);
  cylinder(context, 7.1, 7.1, .7, 32, lighthouseMetal, 0, 29.4, 0, lighthouse);
  const lanternGlass = material(context, "lighthouse-lantern-glass", {
    physical: true,
    color: 0xc8f3ff,
    emissive: 0x79d7ff,
    emissiveIntensity: 2.5,
    roughness: .06,
    transparent: true,
    opacity: .55
  });
  cylinder(context, 4.8, 4.8, 5.7, 24, lanternGlass, 0, 32.5, 0, lighthouse);
  cone(context, 6.1, 4.1, 24, towerBandMat, 0, 37.4, 0, 0, lighthouse);
  collider(context, 45, -106, 13.5, 13.5);

  const lighthouseBeam = new THREE.Group();
  lighthouseBeam.position.set(45, 32.7, -106);
  lighthouseBeam.name = "rotating-lighthouse-beam";
  context.root.add(lighthouseBeam);
  const beamMat = material(context, "lighthouse-beam", {
    color: 0xe4fbff,
    emissive: 0xa9ecff,
    emissiveIntensity: 3.4,
    transparent: true,
    opacity: .2,
    depthWrite: false,
    roughness: .1
  });
  const beam = cone(context, 10, 82, 24, beamMat, 0, 0, -38, 0, lighthouseBeam);
  beam.rotation.x = Math.PI / 2;
  beam.scale.x = .35;
  const beacon = pointLight(context, 0xd8f7ff, 150, 95, 0, 0, 0, lighthouseBeam);
  beacon.castShadow = true;

  const shelterDoor = new THREE.Group();
  shelterDoor.position.set(45, 0, -98.55);
  shelterDoor.name = "lighthouse-storm-shelter-door";
  context.root.add(shelterDoor);
  const shelterDoorMat = material(context, "lighthouse-shelter-door", { color: 0x5e2726, roughness: .58, metalness: .4 });
  box(context, 4, 6.4, .45, shelterDoorMat, 0, 3.2, 0, 0, shelterDoor);
  box(context, 2.6, .2, .2, lighthouseMetal, 0, 3.1, -.28, 0, shelterDoor);
  interactable(context, "lighthouse-shelter", "lighthouse_shelter", 45, -96.5, 6.8, "Ta skydd inne i fyren innan vågen når berget", shelterDoor);

  // Ett riktigt, slutet skyddsrum inne under fyren. Spelaren teleporteras hit
  // när järndörren stängs och kan därför inte promenera ut genom tsunamin.
  const shelterInterior = new THREE.Group();
  shelterInterior.position.set(104, 0, -112);
  shelterInterior.name = "lighthouse-sealed-storm-room";
  context.root.add(shelterInterior);
  const shelterWallMat = material(context, "lighthouse-shelter-wall", { color: 0x4b5658, roughness: .92, metalness: .08 });
  const shelterFloorMat = material(context, "lighthouse-shelter-floor", { color: 0x242c2f, roughness: .52, metalness: .22 });
  box(context, 18, .25, 22, shelterFloorMat, 0, .02, 0, 0, shelterInterior);
  box(context, 18, 8, .55, shelterWallMat, 0, 4, -11, 0, shelterInterior);
  box(context, 18, 8, .55, shelterWallMat, 0, 4, 11, 0, shelterInterior);
  box(context, .55, 8, 22, shelterWallMat, -9, 4, 0, 0, shelterInterior);
  box(context, .55, 8, 22, shelterWallMat, 9, 4, 0, 0, shelterInterior);
  box(context, 18, .35, 22, lighthouseMetal, 0, 8, 0, 0, shelterInterior);
  box(context, 11, 1.1, 2.2, towerMat, 0, .75, 4.4, 0, shelterInterior);
  const shelterLampMat = material(context, "lighthouse-shelter-lamp", { color: 0xbceaff, emissive: 0x75d9ff, emissiveIntensity: 3.2, roughness: .16 });
  box(context, 7, .18, 1, shelterLampMat, 0, 7.72, -2.5, 0, shelterInterior);
  pointLight(context, 0xa9e8ff, 52, 24, 0, 6.8, -2.5, shelterInterior);
  textPanel(context, "FYRENS SÄKRA RUM\nSTANNA TILLS VÅGEN PASSERAT", {
    x: 104,
    y: 4.6,
    z: -122.32,
    width: 11,
    height: 2.4,
    background: "#17252a",
    border: "#8dc7d8",
    color: "#d9f5ff",
    font: "Arial, sans-serif",
    fontSize: 64,
    emissive: 0x163b49,
    emissiveIntensity: 1.1
  });
  collider(context, 104, -123, 18, .55);
  collider(context, 104, -101, 18, .55);
  collider(context, 95, -112, .55, 22);
  collider(context, 113, -112, .55, 22);
  const shelterSpawn = new THREE.Vector3(104, 0, -112);

  const basementDoor = new THREE.Group();
  basementDoor.position.set(58, 0, -112);
  basementDoor.rotation.y = -.55;
  basementDoor.name = "lighthouse-basement-door";
  basementDoor.userData.locked = true;
  context.root.add(basementDoor);
  box(context, 5.2, 5.4, .5, lighthouseMetal, 0, 2.7, 0, 0, basementDoor);
  for (const x of [-1.8, -.9, 0, .9, 1.8]) box(context, .1, 4.8, .65, towerBandMat, x, 2.7, 0, 0, basementDoor);
  const basementSign = textPanel(context, "KÄLLARE\nOBEHÖRIGA ÄGA EJ TILLTRÄDE", {
    x: 57,
    y: 6.6,
    z: -110.3,
    yaw: -.55,
    width: 7.2,
    height: 2.0,
    background: "#231f1d",
    border: "#a27b52",
    color: "#d9c09a",
    font: "Georgia, serif",
    fontSize: 82,
    emissive: 0x28180d,
    emissiveIntensity: .5
  });

  const secret = new THREE.Group();
  secret.position.set(65, 0, -119);
  secret.name = "lighthouse-secret-machine";
  secret.visible = false;
  context.root.add(secret);
  const secretMat = material(context, "lighthouse-secret", { color: 0x83fbff, emissive: 0x1fcfff, emissiveIntensity: 4.3, roughness: .14, metalness: .48 });
  const secretCore = sphere(context, 1.45, 24, 16, secretMat, 0, 2.3, 0, secret);
  torus(context, 2.3, .16, secretMat, 0, 2.3, 0, { x: Math.PI / 2 }, secret);
  torus(context, 2.8, .12, secretMat, 0, 2.3, 0, { y: Math.PI / 2 }, secret);
  pointLight(context, 0x40efff, 70, 25, 0, 2.3, 0, secret);
  interactable(context, "lighthouse-secret", "lighthouse_secret", 64, -118, 5.8, "Avslöja fyrens hemlighet i källaren", secretCore);

  const exitMat = material(context, "lighthouse-city-exit", { color: 0x9773ff, emissive: 0x6135ff, emissiveIntensity: 4, roughness: .15 });
  const cityExit = torus(context, 4.6, .44, exitMat, 78, 4.7, -126, { y: -.6 });
  cityExit.visible = false;
  pointLight(context, 0x8f69ff, 58, 28, 78, 4.5, -126);
  interactable(context, "lighthouse-exit", "lighthouse_exit", 76, -124, 7, "Följ den hemliga tunneln under fyren", cityExit);

  context.actors.buildings = buildings;
  context.actors.windows = windows;
  context.actors.streetLights = streetLights;
  context.actors.hillPath = hillPath;
  context.actors.stormClouds = stormClouds;
  context.actors.rain = rain;
  context.actors.tsunami = tsunami;
  context.actors.lighthouse = lighthouse;
  context.actors.lighthouseBeam = lighthouseBeam;
  context.actors.shelterDoor = shelterDoor;
  context.actors.shelterInterior = shelterInterior;
  context.actors.shelterSpawn = shelterSpawn;
  context.actors.basementDoor = basementDoor;
  context.actors.basementSign = basementSign;
  context.actors.secret = secret;
  context.actors.exit = cityExit;
  return finishWorld(context);
}

function buildForbiddenHotel() {
  const context = createWorld(
    "forbidden_hotel",
    { minX: -41, maxX: 41, minZ: -105, maxZ: 105 },
    { x: 0, y: 0, z: 94, yaw: 0 },
    {
      sky: 0x08070d,
      ground: 0x010102,
      hemisphere: .42,
      sun: 0x756b8d,
      sunIntensity: .38,
      sunX: 26,
      sunY: 28,
      sunZ: 18
    }
  );
  context.root.userData.backgroundColor = 0x08070d;
  context.root.userData.isInterior = true;

  const lobbyFloor = material(context, "hotel-lobby-floor", {
    physical: true,
    color: 0x302b2b,
    roughness: .36,
    metalness: .12,
    clearcoat: .58,
    clearcoatRoughness: .22
  });
  const corridorCarpet = material(context, "hotel-corridor-carpet", { color: 0x4a151d, roughness: .98 });
  const roomFloor = material(context, "hotel-room-floor", { color: 0x4b382d, roughness: .92 });
  const hotelWall = material(context, "hotel-wall", { color: 0x81786d, roughness: .96 });
  const hotelLowerWall = material(context, "hotel-lower-wall", { color: 0x352d2d, roughness: .91 });
  const hotelCeiling = material(context, "hotel-ceiling", { color: 0x28242a, roughness: .93 });
  const hotelTrim = material(context, "hotel-trim", { color: 0x2b1c1c, roughness: .86 });
  const brass = material(context, "hotel-brass", { color: 0xa98143, emissive: 0x231708, emissiveIntensity: .32, roughness: .28, metalness: .82 });
  const oldWood = material(context, "hotel-old-wood", { color: 0x4b3025, roughness: .91 });
  const glass = material(context, "hotel-night-glass", {
    physical: true,
    color: 0x263e57,
    emissive: 0x0d1b31,
    emissiveIntensity: 1,
    roughness: .09,
    transparent: true,
    opacity: .48
  });

  plane(context, 78, 52, lobbyFloor, 0, 0, 78);
  plane(context, 15.5, 160, corridorCarpet, 0, .012, -25);
  plane(context, 62, 160, roomFloor, 0, -.01, -25);
  box(context, 82, .45, 214, hotelCeiling, 0, 9.4, 0);

  for (const x of [-41, 41]) {
    box(context, 1, 9.4, 214, hotelWall, x, 4.7, 0);
    box(context, .12, 3.3, 212, hotelLowerWall, x + (x < 0 ? .56 : -.56), 1.65, 0);
    collider(context, x, 0, 1, 214);
  }
  box(context, 82, 9.4, 1, hotelWall, 0, 4.7, 106);
  collider(context, 0, 106, 82, 1);
  for (const x of [-24.5, 24.5]) {
    box(context, 33, 9.4, 1, hotelWall, x, 4.7, -106);
    collider(context, x, -106, 33, 1);
  }

  // Lobbyn mynnar ut i en lång korridor med fem dörröppningar per sida.
  for (const x of [-24.5, 24.5]) {
    box(context, 33, 8.9, .5, hotelWall, x, 4.45, 53);
    collider(context, x, 53, 33, .55);
  }
  const corridorSegments = [
    [46, 14], [20, 22], [-8, 22], [-36, 22], [-64, 22], [-93.5, 25]
  ];
  for (const side of [-1, 1]) {
    for (const [z, length] of corridorSegments) {
      box(context, .55, 8.9, length, hotelWall, side * 8, 4.45, z);
      box(context, .14, 3.2, length, hotelLowerWall, side * 7.66, 1.6, z);
      box(context, .76, .2, length, hotelTrim, side * 7.55, 3.15, z);
      collider(context, side * 8, z, .6, length);
    }
  }
  for (const z of [20, -8, -36, -64]) {
    for (const x of [-24.5, 24.5]) {
      box(context, 33, 8.9, .5, hotelWall, x, 4.45, z);
      collider(context, x, z, 33, .55);
    }
  }

  const lobbySign = textPanel(context, "HOTELLET ÄR STÄNGT\nINGA GÄSTER FINNS KVAR", {
    x: 0,
    y: 5.8,
    z: 105.42,
    width: 14,
    height: 3.2,
    background: "#271b1d",
    border: "#967044",
    color: "#d8c199",
    font: "Georgia, serif",
    fontSize: 88,
    emissive: 0x2b1512,
    emissiveIntensity: .72
  });
  interactable(context, "hotel-warning-sign", "sign", 0, 101, 6, "Läs hotellets stängda skylt", lobbySign);

  const reception = new THREE.Group();
  reception.position.set(0, 0, 67);
  reception.name = "abandoned-hotel-reception";
  context.root.add(reception);
  box(context, 20, 2.6, 3.5, oldWood, 0, 1.3, 0, 0, reception);
  box(context, 20.8, .25, 4.1, brass, 0, 2.68, 0, 0, reception);
  box(context, 7.2, 4.8, .32, oldWood, 0, 5.25, 2.15, 0, reception);
  const receptionPanel = textPanel(context, "DET FÖRBJUDNA HOTELLET", {
    x: 0,
    y: 5.35,
    z: 69.85,
    width: 6.6,
    height: 1.45,
    background: "#34221b",
    border: "#b28b4e",
    color: "#ead5a1",
    font: "Georgia, serif",
    fontSize: 108,
    emissive: 0x3b2512,
    emissiveIntensity: .8
  });
  collider(context, 0, 67, 20, 3.5);

  const chandeliers = [];
  const chandelierGlow = material(context, "hotel-chandelier-glow", { color: 0xffd997, emissive: 0xffa13d, emissiveIntensity: 3.2, roughness: .2 });
  for (const [x, z, scale] of [[-18, 83, 1], [18, 83, 1], [0, 55, .72]]) {
    const chandelier = new THREE.Group();
    chandelier.position.set(x, 0, z);
    chandelier.scale.setScalar(scale);
    chandelier.name = "hotel-chandelier";
    context.root.add(chandelier);
    cylinder(context, .08, .08, 3.4, 10, brass, 0, 7.55, 0, chandelier);
    torus(context, 2.1, .12, brass, 0, 6.1, 0, { x: Math.PI / 2 }, chandelier);
    for (let i = 0; i < 6; i += 1) {
      const angle = i / 6 * Math.PI * 2;
      sphere(context, .22, 14, 10, chandelierGlow, Math.cos(angle) * 1.85, 5.95, Math.sin(angle) * 1.85, chandelier);
    }
    const light = pointLight(context, 0xffc77a, 42, 24, 0, 5.8, 0, chandelier);
    chandelier.userData.light = light;
    chandeliers.push(chandelier);
  }

  const corridorLights = [];
  const corridorLightMat = material(context, "hotel-corridor-light", { color: 0xffd6a3, emissive: 0xffa95e, emissiveIntensity: 2.45, roughness: .27 });
  for (let z = 45; z >= -96; z -= 14) {
    const fixture = new THREE.Group();
    fixture.position.set(0, 0, z);
    fixture.name = "hotel-corridor-light";
    fixture.userData.flickerOffset = Math.abs(z) * .13;
    context.root.add(fixture);
    box(context, 3.1, .12, .75, corridorLightMat, 0, 9.05, 0, 0, fixture);
    const light = pointLight(context, 0xffbf77, z % 28 === 3 ? 9 : 20, 15, 0, 8.1, 0, fixture);
    fixture.userData.light = light;
    corridorLights.push(fixture);
  }

  const doors = [];
  const doorMat = material(context, "hotel-room-door", { color: 0x4a2c24, roughness: .88 });
  const doorNumberMat = material(context, "hotel-door-number", { color: 0xc9a15c, emissive: 0x463015, emissiveIntensity: .65, roughness: .3, metalness: .65 });
  const makeHotelDoor = (side, z, number, index) => {
    const door = new THREE.Group();
    door.position.set(side * 8, 0, z - 3);
    door.rotation.y = side * (index % 2 ? .78 : .62);
    door.name = `hotel-room-door-${number}`;
    door.userData.roomNumber = number;
    door.userData.closedYaw = 0;
    context.root.add(door);
    box(context, .28, 5.5, 5.1, doorMat, 0, 2.75, 2.55, 0, door);
    const plate = box(context, .08, .8, 1.5, doorNumberMat, -side * .18, 3.8, 2.55, 0, door);
    plate.name = `room-number-${number}`;
    cylinder(context, .1, .1, .16, 12, brass, -side * .22, 2.5, 4.35, door).rotation.z = Math.PI / 2;
    doors.push(door);
    return door;
  };
  const doorZs = [34, 6, -22, -50, -78];
  doorZs.forEach((z, index) => {
    makeHotelDoor(-1, z, 201 + index * 2, index);
    makeHotelDoor(1, z, 202 + index * 2, index + 1);
  });

  const roomWindows = [];
  for (const side of [-1, 1]) {
    for (const z of [35, 7, -21, -49, -78]) {
      const window = box(context, .1, 2.6, 7.5, glass, side * 40.42, 5.25, z);
      roomWindows.push(window);
      box(context, .15, 3, .18, hotelTrim, side * 40.3, 5.25, z - 3.85);
      box(context, .15, 3, .18, hotelTrim, side * 40.3, 5.25, z + 3.85);
    }
  }

  const beds = [];
  const mattressMat = material(context, "hotel-mattress", { color: 0x716a63, roughness: 1 });
  const blanketMat = material(context, "hotel-blanket", { color: 0x3d2630, roughness: 1 });
  for (const [x, z, yaw] of [
    [-27, 35, Math.PI / 2], [27, 35, -Math.PI / 2], [-27, 7, Math.PI / 2], [27, 7, -Math.PI / 2],
    [-27, -21, Math.PI / 2], [27, -21, -Math.PI / 2], [-27, -49, Math.PI / 2], [27, -49, -Math.PI / 2],
    [-27, -78, Math.PI / 2], [27, -78, -Math.PI / 2]
  ]) {
    const bed = new THREE.Group();
    bed.position.set(x, 0, z);
    bed.rotation.y = yaw;
    bed.name = "dusty-hotel-bed";
    context.root.add(bed);
    box(context, 4.2, .7, 7.2, oldWood, 0, .55, 0, 0, bed);
    box(context, 3.8, .6, 6.6, mattressMat, 0, 1.18, 0, 0, bed);
    box(context, 3.85, .18, 3.6, blanketMat, 0, 1.53, 1.15, 0, bed);
    box(context, 4.4, 3.2, .35, oldWood, 0, 2.05, -3.5, 0, bed);
    beds.push(bed);
  }

  const keyMat = material(context, "hotel-key-brass", { color: 0xffd064, emissive: 0x8c5216, emissiveIntensity: 2.1, roughness: .25, metalness: .86 });
  const addHotelKey = (id, x, z, label) => {
    const key = new THREE.Group();
    key.position.set(x, 1.25, z);
    key.rotation.x = -.2;
    key.name = id;
    context.root.add(key);
    torus(context, .5, .11, keyMat, 0, 0, 0, { x: Math.PI / 2 }, key);
    box(context, .16, .14, 1.55, keyMat, 0, 0, .95, 0, key);
    box(context, .55, .14, .18, keyMat, .22, 0, 1.58, 0, key);
    pointLight(context, 0xffbb4d, 13, 8, 0, .35, 0, key);
    interactable(context, id, "hotel_key", x, z, 3.8, label, key);
    return key;
  };
  const keys = [
    addHotelKey("hotel-key-lobby", -15.5, 72, "Ta den dammiga receptionsnyckeln"),
    addHotelKey("hotel-key-203", -22, 34, "Ta nyckeln märkt 203"),
    addHotelKey("hotel-key-basement", 22, -22, "Ta den kalla källarnyckeln")
  ];

  const paperMat = material(context, "hotel-document-paper", { color: 0xd8caa7, emissive: 0x45391d, emissiveIntensity: .48, roughness: .87 });
  const inkMat = material(context, "hotel-document-ink", { color: 0x2d211c, roughness: .78 });
  const addHotelDocument = (id, x, z, label, yaw = 0) => {
    const document = new THREE.Group();
    document.position.set(x, .9, z);
    document.rotation.y = yaw;
    document.rotation.x = -.06;
    document.name = id;
    context.root.add(document);
    box(context, 2.35, .06, 3.1, paperMat, 0, 0, 0, 0, document);
    for (let line = 0; line < 6; line += 1) box(context, 1.65 - line % 3 * .18, .035, .06, inkMat, -.18, .055, -1.02 + line * .36, 0, document);
    pointLight(context, 0xd6b776, 8, 6, 0, .55, 0, document);
    interactable(context, id, "hotel_document", x, z, 3.9, label, document);
    return document;
  };
  const documents = [
    addHotelDocument("hotel-document-guestbook", 15.5, 72, "Läs den sista sidan i gästboken", .1),
    addHotelDocument("hotel-document-room206", 21, 6, "Läs meddelandet från rum 206", -.2),
    addHotelDocument("hotel-document-warning", -21, -50, "Läs varningen som gömts under sängen", .24)
  ];

  // Skuggvarelsen har inga fötter, men väljer hela tiden en punkt bakom spelaren.
  const follower = new THREE.Group();
  follower.position.set(0, 0, 42);
  follower.name = "hotel-shadow-follower";
  follower.userData.followDistance = 13;
  follower.userData.active = false;
  context.root.add(follower);
  const shadowMat = material(context, "hotel-shadow", {
    color: 0x050407,
    emissive: 0x08030e,
    emissiveIntensity: .5,
    transparent: true,
    opacity: .86,
    depthWrite: false,
    roughness: .93
  });
  const shadowEye = material(context, "hotel-shadow-eye", { color: 0xb889ff, emissive: 0x883dff, emissiveIntensity: 4.3, roughness: .12 });
  const shadowBody = sphere(context, 1.8, 20, 14, shadowMat, 0, 3.25, 0, follower);
  shadowBody.scale.set(.72, 1.9, .55);
  const shadowHead = sphere(context, .82, 18, 12, shadowMat, 0, 6.2, 0, follower);
  shadowHead.scale.set(.7, 1.25, .6);
  sphere(context, .09, 12, 8, shadowEye, -.23, 6.3, -.55, follower);
  sphere(context, .09, 12, 8, shadowEye, .23, 6.3, -.55, follower);
  for (let i = 0; i < 5; i += 1) {
    const wisp = cone(context, .55 - i * .06, 2.6 + i * .25, 10, shadowMat, -1.15 + i * .58, .7, .2, 0, follower);
    wisp.rotation.z = (i - 2) * .13;
  }
  pointLight(context, 0x6630b8, 16, 11, 0, 5.8, -.4, follower);
  const followPoints = [
    new THREE.Vector3(0, 0, 42),
    new THREE.Vector3(-4.5, 0, 22),
    new THREE.Vector3(4.5, 0, -6),
    new THREE.Vector3(-4.5, 0, -34),
    new THREE.Vector3(4.5, 0, -62),
    new THREE.Vector3(0, 0, -88)
  ];

  const exitDoor = new THREE.Group();
  exitDoor.position.set(0, 0, -105.35);
  exitDoor.name = "forbidden-hotel-exit-door";
  exitDoor.userData.locked = true;
  context.root.add(exitDoor);
  const exitDoorMat = material(context, "hotel-exit-door", { color: 0x17171d, roughness: .43, metalness: .66 });
  const exitDoorLeft = box(context, 4.2, 7.6, .46, exitDoorMat, -2.15, 3.8, 0, 0, exitDoor);
  const exitDoorRight = box(context, 4.2, 7.6, .46, exitDoorMat, 2.15, 3.8, 0, 0, exitDoor);
  box(context, 7.3, .24, .25, brass, 0, 3.45, .28, 0, exitDoor);
  doors.push(exitDoorLeft, exitDoorRight);

  const exitLight = new THREE.Group();
  exitLight.position.set(0, 0, -103.9);
  exitLight.name = "forbidden-hotel-exit-light";
  exitLight.visible = false;
  context.root.add(exitLight);
  const exitGlowMat = material(context, "hotel-exit-glow", { color: 0xe52f42, emissive: 0xe20c31, emissiveIntensity: 4, roughness: .16 });
  box(context, 5.3, 1.2, .2, exitGlowMat, 0, 8.25, 0, 0, exitLight);
  const exitLamp = pointLight(context, 0xff2346, 44, 21, 0, 7.65, 1, exitLight);
  exitLamp.userData.openColor = 0x5bff9e;
  interactable(context, "hotel-exit", "hotel_exit", 0, -100.3, 6.5, "Lås upp hotellets sista dörr", exitDoor);

  context.actors.lobbySign = lobbySign;
  context.actors.reception = reception;
  context.actors.receptionPanel = receptionPanel;
  context.actors.chandeliers = chandeliers;
  context.actors.lights = corridorLights;
  context.actors.doors = doors;
  context.actors.windows = roomWindows;
  context.actors.beds = beds;
  context.actors.keys = keys;
  context.actors.documents = documents;
  context.actors.follower = follower;
  context.actors.followPoints = followPoints;
  context.actors.exitDoor = exitDoor;
  context.actors.exitLight = exitLight;
  return finishWorld(context);
}

function buildGraveyardSecret() {
  const context = createWorld(
    "graveyard_secret",
    { minX: -82, maxX: 82, minZ: -98, maxZ: 98 },
    { x: 0, y: 0, z: 89, yaw: 0 },
    { sky: 0x15172b, ground: 0x030504, hemisphere: .7, sun: 0xffa56f, sunIntensity: .62, sunX: 78, sunY: 18, sunZ: -88 }
  );
  context.root.userData.backgroundColor = 0x15172b;

  const grass = material(context, "graveyard-grass", { color: 0x17251d, roughness: 1 });
  const pathMat = material(context, "graveyard-path", { color: 0x5a554c, roughness: .98 });
  const stoneMats = [0x5f6262, 0x77756e, 0x4d5555].map((color, index) => material(context, `grave-stone-${index}`, { color, roughness: .97, flatShading: true }));
  const mossMat = material(context, "grave-moss", { color: 0x38543b, roughness: 1 });
  const iron = material(context, "grave-iron", { color: 0x202628, roughness: .48, metalness: .72 });
  plane(context, 172, 208, grass, 0, -.05, 0);
  for (let z = 92; z >= -87; z -= 8) plane(context, 10, 9, pathMat, Math.sin(z * .08) * 2.4, .01, z);

  const gravestones = [];
  const gravePositions = [];
  for (let row = 0; row < 9; row += 1) {
    const z = 70 - row * 16;
    for (let column = 0; column < 6; column += 1) {
      const side = column < 3 ? -1 : 1;
      const lane = column % 3;
      const x = side * (17 + lane * 18) + Math.sin(row * 1.7 + column) * 2;
      if (z < -55 && Math.abs(x) < 31) continue;
      gravePositions.push([x, z, row + column]);
    }
  }
  gravePositions.forEach(([x, z, variant], index) => {
    const grave = new THREE.Group();
    grave.position.set(x, 0, z);
    grave.rotation.y = Math.sin(index * 2.4) * .12;
    grave.name = `old-gravestone-${index + 1}`;
    context.root.add(grave);
    const stone = stoneMats[variant % stoneMats.length];
    if (variant % 3 === 0) {
      box(context, 2.8, 3.4, .55, stone, 0, 1.7, 0, 0, grave);
      sphere(context, 1.4, 18, 10, stone, 0, 3.35, 0, grave).scale.y = .6;
    } else if (variant % 3 === 1) {
      box(context, 1, 4.2, .55, stone, 0, 2.1, 0, 0, grave);
      box(context, 3.1, .85, .58, stone, 0, 2.9, 0, 0, grave);
    } else {
      box(context, 3.2, 2.8, .7, stone, 0, 1.4, 0, 0, grave);
      cone(context, 1.8, 1.8, 4, stone, 0, 3.45, 0, Math.PI / 4, grave);
    }
    const moss = box(context, 2.1, .08, .7, mossMat, -.25, 2.2 + variant % 2, -.32, .08, grave);
    moss.rotation.z = .08;
    collider(context, x, z, 3.4, 1.4);
    gravestones.push(grave);
  });

  const fencePosts = [];
  for (let z = -91; z <= 91; z += 8) {
    for (const x of [-78, 78]) {
      fencePosts.push(cylinder(context, .12, .16, 3.4, 8, iron, x, 1.7, z));
    }
  }
  for (let x = -78; x <= 78; x += 8) {
    for (const z of [-92, 92]) fencePosts.push(cylinder(context, .12, .16, 3.4, 8, iron, x, 1.7, z));
  }

  const chapel = new THREE.Group();
  chapel.position.set(0, 0, -68);
  chapel.name = "graveyard-chapel";
  context.root.add(chapel);
  const chapelStone = material(context, "graveyard-chapel-stone", { color: 0x55575a, roughness: .98 });
  const chapelRoof = material(context, "graveyard-chapel-roof", { color: 0x24272d, roughness: .88 });
  plane(context, 28, 31, stoneMats[1], 0, .02, 0, chapel);
  box(context, 1, 9, 31, chapelStone, -14, 4.5, 0, 0, chapel);
  box(context, 1, 9, 31, chapelStone, 14, 4.5, 0, 0, chapel);
  box(context, 28, 9, 1, chapelStone, 0, 4.5, -15.5, 0, chapel);
  box(context, 9, 9, 1, chapelStone, -9.5, 4.5, 15.5, 0, chapel);
  box(context, 9, 9, 1, chapelStone, 9.5, 4.5, 15.5, 0, chapel);
  const roof = cone(context, 21, 8, 4, chapelRoof, 0, 12, 0, Math.PI / 4, chapel);
  roof.scale.z = .72;
  collider(context, -14, -68, 1, 31);
  collider(context, 14, -68, 1, 31);
  collider(context, 0, -83.5, 28, 1);
  collider(context, -9.5, -52.5, 9, 1);
  collider(context, 9.5, -52.5, 9, 1);

  const riddleSpecs = [
    ["grave-riddle-1", -22, 42, "Jag vaknar när natten dör. Vilken tid är jag?"],
    ["grave-riddle-2", 24, 7, "Räkna korparna som aldrig flyger."],
    ["grave-riddle-3", -23, -30, "Vänd namnet som saknar en skugga."]
  ];
  const riddles = riddleSpecs.map(([id, x, z, label], index) => {
    const marker = new THREE.Group();
    marker.position.set(x, 0, z);
    marker.name = id;
    context.root.add(marker);
    const riddleGlow = material(context, `grave-riddle-glow-${index}`, { color: 0x9fdcff, emissive: 0x3b9ee2, emissiveIntensity: 3.1, roughness: .2 });
    box(context, 3.8, 3.4, .7, stoneMats[index], 0, 1.7, 0, 0, marker);
    torus(context, .72, .09, riddleGlow, 0, 2.0, -.42, {}, marker);
    pointLight(context, 0x68c7ff, 20, 10, 0, 2.2, 0, marker);
    interactable(context, id, "grave_riddle", x, z, 4.5, label, marker);
    return marker;
  });

  const altar = new THREE.Group();
  altar.position.set(0, 0, -76);
  altar.name = "graveyard-secret-altar";
  context.root.add(altar);
  const altarMat = material(context, "grave-altar", { color: 0x706960, roughness: .9 });
  const altarGlow = material(context, "grave-altar-glow", { color: 0x9fdcff, emissive: 0x3b9ee2, emissiveIntensity: 3.1, roughness: .2 });
  box(context, 7.5, 3.3, 3.2, altarMat, 0, 1.65, 0, 0, altar);
  box(context, 8.1, .28, 3.8, stoneMats[1], 0, 3.34, 0, 0, altar);
  const altarRune = torus(context, 1.1, .12, altarGlow, 0, 3.55, -.7, { x: Math.PI / 2 }, altar);
  pointLight(context, 0x7fdfff, 35, 16, 0, 5.2, 0, altar);
  interactable(context, "grave-altar", "grave_altar", 0, -73.5, 5.5, "Placera gåtornas svar på altaret", altarRune);

  const monster = addMonster(context, 31, -6, 1.05);
  monster.name = "ikea-monster-in-graveyard";
  monster.visible = false;
  monster.userData.revealAtDawn = true;

  const exitDoor = new THREE.Group();
  exitDoor.position.set(0, 0, -83.1);
  exitDoor.name = "graveyard-crypt-door";
  exitDoor.userData.locked = true;
  context.root.add(exitDoor);
  const exitDoorMat = material(context, "graveyard-exit-door", { color: 0x273035, roughness: .42, metalness: .72 });
  for (const x of [-2.2, 2.2]) box(context, 4.25, 6.5, .35, exitDoorMat, x, 3.25, 0, 0, exitDoor);
  for (let x = -3.8; x <= 3.8; x += 1.25) box(context, .11, 6, .52, iron, x, 3.1, -.08, 0, exitDoor);
  const exitLight = new THREE.Group();
  exitLight.position.set(0, 0, -81.8);
  exitLight.name = "graveyard-exit-light";
  exitLight.visible = false;
  context.root.add(exitLight);
  const exitGlow = material(context, "graveyard-exit-glow", { color: 0xffb06a, emissive: 0xff681f, emissiveIntensity: 3.7, roughness: .18 });
  sphere(context, .45, 16, 10, exitGlow, 0, 7.2, 0, exitLight);
  pointLight(context, 0xff8c4a, 45, 22, 0, 6.7, 1, exitLight);
  interactable(context, "graveyard-exit", "graveyard_exit", 0, -80, 6.3, "Öppna passagen under kapellet", exitDoor);

  const dawnLights = [];
  for (const [x, y, z, color, intensity] of [[70, 8, -82, 0xff875d, 48], [45, 16, -90, 0xffc08b, 34], [-55, 24, -80, 0x7d9dff, 20]]) {
    const light = pointLight(context, color, intensity, 80, x, y, z);
    light.userData.baseIntensity = intensity;
    dawnLights.push(light);
  }
  const dawnSun = sphere(context, 6.5, 24, 16, exitGlow, 72, 7, -92);
  dawnSun.name = "graveyard-dawn-sun";

  context.actors.gravestones = gravestones;
  context.actors.graves = gravestones;
  context.actors.fencePosts = fencePosts;
  context.actors.chapel = chapel;
  context.actors.riddles = riddles;
  context.actors.riddleStones = riddles;
  context.actors.altar = altar;
  context.actors.monster = monster;
  context.actors.monsterSpawn = monster;
  context.actors.exitDoor = exitDoor;
  context.actors.exitLight = exitLight;
  context.actors.dawnLights = dawnLights;
  context.actors.dawnSun = dawnSun;
  return finishWorld(context);
}

function buildLostCarnival() {
  const context = createWorld(
    "lost_carnival",
    { minX: -105, maxX: 105, minZ: -108, maxZ: 108 },
    { x: 0, y: 0, z: 98, yaw: 0 },
    { sky: 0x121124, ground: 0x030305, hemisphere: .62, sun: 0xa083b9, sunIntensity: .55, sunX: -50, sunY: 35 }
  );
  context.root.userData.backgroundColor = 0x121124;

  const dirt = material(context, "carnival-dirt", { color: 0x3a342d, roughness: 1 });
  const midway = material(context, "carnival-midway", { color: 0x605448, roughness: .96 });
  const red = material(context, "carnival-red", { color: 0x8f2934, roughness: .68, metalness: .12 });
  const fadedWhite = material(context, "carnival-white", { color: 0xc9bda6, roughness: .8 });
  const steel = material(context, "carnival-steel", { color: 0x434b51, roughness: .38, metalness: .78 });
  const wood = material(context, "carnival-wood", { color: 0x583c29, roughness: .94 });
  plane(context, 220, 228, dirt, 0, -.05, 0);
  for (let z = 102; z >= -96; z -= 9) plane(context, 17, 10, midway, Math.sin(z * .05) * 3, .01, z);

  const bulbColors = [0xff4050, 0xffdc63, 0x62d9ff, 0xb87bff];
  const bulbMats = bulbColors.map((color, i) => material(context, `carnival-bulb-${i}`, { color, emissive: color, emissiveIntensity: 3.8, roughness: .18 }));
  const lights = [];
  const addBulb = (x, y, z, index, parent = context.root) => {
    const bulbIndex = ((index % bulbMats.length) + bulbMats.length) % bulbMats.length;
    const bulb = sphere(context, .18, 12, 8, bulbMats[bulbIndex], x, y, z, parent);
    bulb.userData.phase = index * .41;
    lights.push(bulb);
    return bulb;
  };

  const entranceArch = new THREE.Group();
  entranceArch.position.set(0, 0, 84);
  entranceArch.name = "lost-carnival-entrance";
  context.root.add(entranceArch);
  for (const x of [-9, 9]) box(context, 1.2, 10, 1.2, red, x, 5, 0, 0, entranceArch);
  box(context, 19.2, 1.3, 1.2, fadedWhite, 0, 9.3, 0, 0, entranceArch);
  const entranceSign = textPanel(context, "DET FÖRSVUNNA TIVOLIT\nÖPPET FÖR ALLTID", {
    x: 0, y: 9.2, z: 83.3, width: 13, height: 2.7, background: "#351b20", border: "#c89c55",
    color: "#f1d29b", font: "Georgia, serif", fontSize: 94, emissive: 0x45121c, emissiveIntensity: 1
  });
  for (let x = -8; x <= 8; x += 1.3) addBulb(x, 10.2, 83.1, Math.round(x * 2));

  const rides = [];
  // Karusell.
  const carousel = new THREE.Group();
  carousel.position.set(-37, 0, 30);
  carousel.name = "abandoned-carousel";
  context.root.add(carousel);
  cylinder(context, 10.5, 10.5, 1.2, 32, fadedWhite, 0, .6, 0, carousel);
  cylinder(context, .45, .6, 10.5, 18, steel, 0, 5.6, 0, carousel);
  const carouselRotor = new THREE.Group();
  carouselRotor.name = "carousel-rotor";
  carouselRotor.position.y = 1.2;
  carousel.add(carouselRotor);
  const canopy = cone(context, 12.4, 5.5, 24, red, 0, 10.7, 0, 0, carouselRotor);
  canopy.scale.y = .6;
  for (let i = 0; i < 10; i += 1) {
    const angle = i / 10 * Math.PI * 2;
    const x = Math.cos(angle) * 7.4;
    const z = Math.sin(angle) * 7.4;
    cylinder(context, .08, .08, 7.6, 8, steel, x, 5.2, z, carouselRotor);
    const horse = new THREE.Group();
    horse.position.set(x, 3.4 + (i % 2) * .45, z);
    horse.rotation.y = -angle;
    carouselRotor.add(horse);
    const horseBody = sphere(context, .85, 16, 10, i % 2 ? fadedWhite : red, 0, 0, 0, horse);
    horseBody.scale.set(1.7, .65, .7);
    cylinder(context, .22, .34, 1.5, 10, fadedWhite, 1.05, .55, 0, horse).rotation.z = -.45;
    for (const lx of [-.65, .65]) cylinder(context, .12, .17, 1.4, 8, steel, lx, -.8, 0, horse);
  }
  for (let i = 0; i < 18; i += 1) {
    const angle = i / 18 * Math.PI * 2;
    addBulb(Math.cos(angle) * 10.4, 9.2, Math.sin(angle) * 10.4, i, carouselRotor);
  }
  carousel.userData.rotor = carouselRotor;
  carousel.userData.speed = .3;
  collider(context, -37, 30, 20, 20);
  rides.push(carousel);

  // Pariserhjul med separat rotor för motoranimation.
  const ferris = new THREE.Group();
  ferris.position.set(39, 0, 15);
  ferris.name = "rusty-ferris-wheel";
  context.root.add(ferris);
  for (const x of [-6.5, 6.5]) {
    const support = cylinder(context, .35, .55, 21, 12, steel, x, 9.2, 0, ferris);
    support.rotation.z = x < 0 ? -.34 : .34;
  }
  const ferrisRotor = new THREE.Group();
  ferrisRotor.position.set(0, 15, 0);
  ferrisRotor.rotation.z = .08;
  ferrisRotor.name = "ferris-wheel-rotor";
  ferris.add(ferrisRotor);
  torus(context, 13, .4, red, 0, 0, 0, {}, ferrisRotor);
  torus(context, 11.8, .14, fadedWhite, 0, 0, 0, {}, ferrisRotor);
  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * Math.PI * 2;
    const x = Math.cos(angle) * 13;
    const y = Math.sin(angle) * 13;
    box(context, .18, 26, .18, steel, 0, 0, 0, 0, ferrisRotor).rotation.z = angle + Math.PI / 2;
    const gondola = new THREE.Group();
    gondola.position.set(x, y, 0);
    gondola.name = "ferris-gondola";
    ferrisRotor.add(gondola);
    box(context, 2.7, 1.5, 2.3, i % 2 ? red : fadedWhite, 0, -1, 0, 0, gondola);
    addBulb(x, y, -.25, i, ferrisRotor);
  }
  ferris.userData.rotor = ferrisRotor;
  ferris.userData.speed = .18;
  collider(context, 39, 15, 19, 10);
  rides.push(ferris);

  // Den tredje attraktionen är en kedjegunga med tomma säten.
  const swingRide = new THREE.Group();
  swingRide.position.set(-32, 0, -43);
  swingRide.name = "empty-chain-swing";
  context.root.add(swingRide);
  cylinder(context, 1.2, 2.2, 13, 20, steel, 0, 6.5, 0, swingRide);
  const swingRotor = new THREE.Group();
  swingRotor.position.y = 12.7;
  swingRide.add(swingRotor);
  cylinder(context, 8.2, 5.5, 1.4, 24, red, 0, 0, 0, swingRotor);
  for (let i = 0; i < 10; i += 1) {
    const angle = i / 10 * Math.PI * 2;
    const chair = new THREE.Group();
    chair.position.set(Math.cos(angle) * 7, -4.2, Math.sin(angle) * 7);
    chair.rotation.y = -angle;
    swingRotor.add(chair);
    cylinder(context, .05, .05, 7, 7, steel, 0, 3.5, 0, chair);
    box(context, 1.5, .25, 1.3, fadedWhite, 0, 0, 0, 0, chair);
    box(context, 1.5, 1.2, .18, red, 0, .7, .55, 0, chair);
    addBulb(Math.cos(angle) * 7, .4, Math.sin(angle) * 7, i + 3, swingRotor);
  }
  swingRide.userData.rotor = swingRotor;
  swingRide.userData.speed = .4;
  collider(context, -32, -43, 15, 15);
  rides.push(swingRide);

  const switchMat = material(context, "carnival-switch-box", { color: 0x343b3d, roughness: .45, metalness: .68 });
  const leverMat = material(context, "carnival-switch-lever", { color: 0xffb640, emissive: 0xff641b, emissiveIntensity: 2.4, roughness: .25 });
  const switchSpecs = [
    ["carnival-switch-1", -22, 42, "Stäng av den gamla karusellen"],
    ["carnival-switch-2", 24, 26, "Stäng av pariserhjulet"],
    ["carnival-switch-3", -19, -32, "Stäng av kedjegungan"]
  ];
  const switches = switchSpecs.map(([id, x, z, label], index) => {
    const control = new THREE.Group();
    control.position.set(x, 0, z);
    control.name = id;
    context.root.add(control);
    box(context, 2.5, 3.4, 1.7, switchMat, 0, 1.7, 0, 0, control);
    const lever = cylinder(context, .12, .18, 1.8, 10, leverMat, 0, 3.4, -.55, control);
    lever.rotation.x = -.62;
    sphere(context, .27, 14, 10, leverMat, 0, 4.13, -1.12, control);
    pointLight(context, bulbColors[index], 18, 10, 0, 3.3, 0, control);
    interactable(context, id, "carnival_switch", x, z, 4.2, label, control);
    return control;
  });

  const clown = new THREE.Group();
  const clownSpawn = new THREE.Vector3(16, 0, 62);
  clown.position.copy(clownSpawn);
  clown.name = "watching-carnival-clown";
  clown.userData.active = false;
  clown.visible = false;
  context.root.add(clown);
  const clownSuit = material(context, "carnival-clown-suit", { color: 0x6d2533, roughness: .83 });
  const clownSkin = material(context, "carnival-clown-skin", { color: 0xd7c9b5, roughness: .65 });
  const clownBlue = material(context, "carnival-clown-blue", { color: 0x235d80, roughness: .75 });
  const clownEye = material(context, "carnival-clown-eye", { color: 0xffe071, emissive: 0xff4b17, emissiveIntensity: 3.8, roughness: .1 });
  box(context, 1.8, 3.3, 1.15, clownSuit, 0, 3.15, 0, 0, clown);
  sphere(context, .82, 20, 14, clownSkin, 0, 5.35, 0, clown);
  cone(context, 1.05, 2.4, 16, clownBlue, 0, 7.0, 0, 0, clown);
  sphere(context, .2, 14, 10, red, 0, 5.25, -.78, clown);
  sphere(context, .09, 12, 8, clownEye, -.29, 5.55, -.66, clown);
  sphere(context, .09, 12, 8, clownEye, .29, 5.55, -.66, clown);
  for (const side of [-1, 1]) {
    const arm = cylinder(context, .15, .23, 3.5, 10, side < 0 ? clownBlue : clownSuit, side * 1.15, 3.1, 0, clown);
    arm.rotation.z = side * .2;
    cylinder(context, .18, .28, 3.1, 10, side < 0 ? clownSuit : clownBlue, side * .5, 1.55, 0, clown);
  }
  pointLight(context, 0xff312a, 16, 9, 0, 5.4, -.4, clown);
  const followPoints = [
    clownSpawn.clone(), new THREE.Vector3(-10, 0, 48), new THREE.Vector3(13, 0, 20),
    new THREE.Vector3(-8, 0, -18), new THREE.Vector3(10, 0, -52), new THREE.Vector3(0, 0, -82)
  ];

  const exitDoor = new THREE.Group();
  exitDoor.position.set(0, 0, -96);
  exitDoor.name = "carnival-locked-gate";
  exitDoor.userData.locked = true;
  context.root.add(exitDoor);
  for (const x of [-4.2, 4.2]) box(context, 7.8, 7.5, .45, steel, x, 3.75, 0, 0, exitDoor);
  for (let x = -7.4; x <= 7.4; x += 1.25) box(context, .13, 7, .6, red, x, 3.6, -.08, 0, exitDoor);
  const exitLight = new THREE.Group();
  exitLight.position.set(0, 0, -94.7);
  exitLight.name = "carnival-exit-light";
  exitLight.visible = false;
  context.root.add(exitLight);
  for (let x = -7; x <= 7; x += 1.2) addBulb(x, 7.8, 0, Math.round(x * 3), exitLight);
  pointLight(context, 0xff4f66, 42, 22, 0, 7, 1, exitLight);
  interactable(context, "carnival-exit", "carnival_exit", 0, -91, 7, "Öppna tivolits grind när alla attraktioner går", exitDoor);

  context.actors.entrance = entranceArch;
  context.actors.entranceSign = entranceSign;
  context.actors.rides = rides;
  context.actors.switches = switches;
  context.actors.rideSwitches = switches;
  context.actors.clown = clown;
  context.actors.clownSpawn = clownSpawn;
  context.actors.followPoints = followPoints;
  context.actors.exitDoor = exitDoor;
  context.actors.exitLight = exitLight;
  context.actors.lights = lights;
  return finishWorld(context);
}

function buildDollmakerHouse() {
  const context = createWorld(
    "dollmaker_house",
    { minX: -34, maxX: 34, minZ: -91, maxZ: 91 },
    { x: 0, y: 0, z: 82, yaw: 0 },
    { sky: 0x0c0a12, ground: 0x020102, hemisphere: .48, sun: 0xa99181, sunIntensity: .45, sunX: 30, sunY: 32 }
  );
  context.root.userData.backgroundColor = 0x0c0a12;
  context.root.userData.isInterior = true;

  const floorMat = material(context, "doll-house-floor", { color: 0x48372c, roughness: .93 });
  const runnerMat = material(context, "doll-house-runner", { color: 0x49202e, roughness: .99 });
  const wallMat = material(context, "doll-house-wall", { color: 0x81786b, roughness: .98 });
  const lowerWall = material(context, "doll-house-lower-wall", { color: 0x3f302a, roughness: .92 });
  const ceilingMat = material(context, "doll-house-ceiling", { color: 0x2d282b, roughness: .96 });
  const wood = material(context, "doll-house-wood", { color: 0x553725, roughness: .9 });
  const darkWood = material(context, "doll-house-dark-wood", { color: 0x261b18, roughness: .95 });
  const porcelain = material(context, "doll-porcelain", { physical: true, color: 0xe1d4c4, roughness: .28, clearcoat: .34, clearcoatRoughness: .22 });
  const dollEye = material(context, "doll-eye", { color: 0x111016, emissive: 0x291438, emissiveIntensity: .75, roughness: .16 });
  const hairMats = [0x33231c, 0xb99262, 0x171619].map((color, i) => material(context, `doll-hair-${i}`, { color, roughness: .88 }));
  const dressMats = [0x6e2638, 0x294c5d, 0x6a5b32, 0x4c315f].map((color, i) => material(context, `doll-dress-${i}`, { color, roughness: .9 }));
  plane(context, 68, 186, floorMat, 0, -.02, 0);
  plane(context, 13, 178, runnerMat, 0, .015, 0);
  box(context, 68, .42, 186, ceilingMat, 0, 8.8, 0);

  for (const x of [-34, 34]) {
    box(context, 1, 8.8, 186, wallMat, x, 4.4, 0);
    box(context, .12, 3.1, 184, lowerWall, x + (x < 0 ? .56 : -.56), 1.55, 0);
    collider(context, x, 0, 1, 186);
  }
  box(context, 68, 8.8, 1, wallMat, 0, 4.4, 92);
  collider(context, 0, 92, 68, 1);
  for (const x of [-21, 21]) {
    box(context, 26, 8.8, 1, wallMat, x, 4.4, -92);
    collider(context, x, -92, 26, 1);
  }

  // Korridorväggar med tre breda öppningar på vardera sida.
  const wallSegments = [[69, 38], [28, 32], [-12, 36], [-53, 34], [-82, 18]];
  for (const side of [-1, 1]) {
    for (const [z, length] of wallSegments) {
      box(context, .55, 8.5, length, wallMat, side * 7.5, 4.25, z);
      box(context, .15, 3.1, length, lowerWall, side * 7.18, 1.55, z);
      collider(context, side * 7.5, z, .6, length);
    }
  }
  for (const z of [44, 4, -40]) {
    for (const x of [-20.5, 20.5]) {
      box(context, 26, 8.5, .5, wallMat, x, 4.25, z);
      collider(context, x, z, 26, .55);
    }
  }

  const workshop = new THREE.Group();
  workshop.position.set(-20, 0, 63);
  workshop.name = "dollmaker-workshop";
  context.root.add(workshop);
  box(context, 15, .3, 5.3, wood, 0, 2.2, 0, 0, workshop);
  for (const x of [-6.2, 6.2]) box(context, .35, 2.2, 4.5, darkWood, x, 1.1, 0, 0, workshop);
  const tools = [];
  for (let i = 0; i < 7; i += 1) {
    const tool = cylinder(context, .07, .12, 1.4 + i % 3 * .35, 8, i % 2 ? darkWood : porcelain, -5.2 + i * 1.7, 3.0, 0, workshop);
    tool.rotation.z = -.7 + i * .22;
    tools.push(tool);
  }

  const lights = [];
  const lampGlow = material(context, "doll-house-lamp", { color: 0xffd9a0, emissive: 0xff9f49, emissiveIntensity: 3, roughness: .24 });
  for (let z = 78; z >= -80; z -= 18) {
    const lamp = new THREE.Group();
    lamp.position.set(z % 36 === 6 ? -.5 : .5, 0, z);
    lamp.name = "doll-house-flickering-lamp";
    lamp.userData.phase = Math.abs(z) * .17;
    context.root.add(lamp);
    cylinder(context, .08, .08, 2, 8, darkWood, 0, 7.7, 0, lamp);
    sphere(context, .42, 16, 10, lampGlow, 0, 6.75, 0, lamp);
    const glow = pointLight(context, 0xffc17b, z % 36 === 6 ? 14 : 24, 16, 0, 6.6, 0, lamp);
    lamp.userData.light = glow;
    lights.push(lamp);
  }

  const dolls = [];
  const dollPositions = [];
  const dollSpecs = [
    [-24, 72, .9], [-16, 69, -.5], [22, 67, 2.5], [29, 55, -2.3],
    [-26, 28, .45], [-16, 17, -.8], [19, 31, 2.6], [27, 16, -2.5],
    [-25, -17, .65], [-16, -29, -.45], [19, -14, 2.7], [27, -30, -2.4],
    [-27, -60, .4], [-17, -73, -.65], [18, -62, 2.5], [27, -77, -2.55]
  ];
  dollSpecs.forEach(([x, z, yaw], index) => {
    const doll = new THREE.Group();
    doll.position.set(x, 0, z);
    doll.rotation.y = yaw;
    doll.scale.setScalar(.88 + index % 4 * .08);
    doll.name = `watching-doll-${index + 1}`;
    doll.userData.phase = index * .47;
    doll.userData.basePosition = new THREE.Vector3(x, 0, z);
    doll.userData.homeX = x;
    doll.userData.homeZ = z;
    context.root.add(doll);
    box(context, 1.15, 2.05, .72, dressMats[index % dressMats.length], 0, 2.1, 0, 0, doll);
    sphere(context, .65, 20, 14, porcelain, 0, 3.7, 0, doll);
    const hair = sphere(context, .69, 18, 12, hairMats[index % hairMats.length], 0, 4.0, .06, doll);
    hair.scale.y = .62;
    sphere(context, .075, 10, 8, dollEye, -.22, 3.82, -.56, doll);
    sphere(context, .075, 10, 8, dollEye, .22, 3.82, -.56, doll);
    for (const side of [-1, 1]) {
      const arm = cylinder(context, .08, .13, 1.9, 8, porcelain, side * .76, 2.15, 0, doll);
      arm.rotation.z = side * .12;
      cylinder(context, .09, .14, 1.75, 8, porcelain, side * .35, .9, 0, doll);
    }
    pointLight(context, 0x6e3c91, 5, 4.5, 0, 3.8, -.6, doll);
    dolls.push(doll);
    dollPositions.push(new THREE.Vector3(x, 0, z));
  });

  const clueGlowColors = [0x6ed9ff, 0xff8fc9, 0xffcf69];
  const clueSpecs = [
    ["doll-clue-1", -18, 55, "Läs lappen under dockmakarens verktyg"],
    ["doll-clue-2", 19, 18, "Undersök dockan som tittar mot väggen"],
    ["doll-clue-3", -18, -58, "Öppna den lilla speldosan"]
  ];
  const clues = clueSpecs.map(([id, x, z, label], index) => {
    const clue = new THREE.Group();
    clue.position.set(x, 0, z);
    clue.name = id;
    context.root.add(clue);
    const glowMat = material(context, `doll-clue-glow-${index}`, { color: clueGlowColors[index], emissive: clueGlowColors[index], emissiveIntensity: 3.2, roughness: .2 });
    box(context, 2.5, .18, 2.2, wood, 0, 1.3, 0, 0, clue);
    sphere(context, .42, 16, 10, glowMat, 0, 1.62, 0, clue);
    torus(context, .72, .08, glowMat, 0, 1.6, 0, { x: Math.PI / 2 }, clue);
    pointLight(context, clueGlowColors[index], 16, 9, 0, 1.8, 0, clue);
    interactable(context, id, "doll_clue", x, z, 4.2, label, clue);
    return clue;
  });

  const exitDoor = new THREE.Group();
  exitDoor.position.set(0, 0, -91.35);
  exitDoor.name = "dollmaker-locked-back-door";
  exitDoor.userData.locked = true;
  context.root.add(exitDoor);
  const doorMat = material(context, "dollmaker-exit-door", { color: 0x3c2720, roughness: .86 });
  for (const x of [-2.05, 2.05]) box(context, 4, 7, .42, doorMat, x, 3.5, 0, 0, exitDoor);
  box(context, 6.6, .2, .3, darkWood, 0, 3.1, -.32, 0, exitDoor);
  const exitLight = new THREE.Group();
  exitLight.position.set(0, 0, -89.9);
  exitLight.name = "dollmaker-exit-light";
  exitLight.visible = false;
  context.root.add(exitLight);
  const exitGlowMat = material(context, "dollmaker-exit-glow", { color: 0xd774ff, emissive: 0x8b2fff, emissiveIntensity: 3.8, roughness: .18 });
  sphere(context, .44, 16, 10, exitGlowMat, 0, 7.7, 0, exitLight);
  pointLight(context, 0xba5cff, 38, 20, 0, 7.1, 1, exitLight);
  interactable(context, "doll-exit", "doll_exit", 0, -87, 6.5, "Öppna dockmakarens bakdörr", exitDoor);

  context.actors.workshop = workshop;
  context.actors.tools = tools;
  context.actors.dolls = dolls;
  context.actors.dollPositions = dollPositions;
  context.actors.clues = clues;
  context.actors.exitDoor = exitDoor;
  context.actors.exitLight = exitLight;
  context.actors.lights = lights;
  return finishWorld(context);
}

function buildMidnightMuseum() {
  const context = createWorld(
    "midnight_museum",
    { minX: -42, maxX: 42, minZ: -99, maxZ: 99 },
    { x: 0, y: 0, z: 90, yaw: 0 },
    { sky: 0x080b15, ground: 0x010102, hemisphere: .5, sun: 0x8ca3c2, sunIntensity: .4, sunX: -32, sunY: 30 }
  );
  context.root.userData.backgroundColor = 0x080b15;
  context.root.userData.isInterior = true;

  const marble = material(context, "museum-marble", { physical: true, color: 0x716f70, roughness: .34, metalness: .12, clearcoat: .5, clearcoatRoughness: .22 });
  const runner = material(context, "museum-runner", { color: 0x321b2c, roughness: .98 });
  const wallMat = material(context, "museum-wall", { color: 0x85817c, roughness: .94 });
  const lowerWall = material(context, "museum-lower-wall", { color: 0x2e3339, roughness: .78 });
  const ceiling = material(context, "museum-ceiling", { color: 0x242830, roughness: .92 });
  const bronze = material(context, "museum-bronze", { color: 0x66513a, emissive: 0x191006, emissiveIntensity: .18, roughness: .43, metalness: .68 });
  const paleStone = material(context, "museum-statue-stone", { color: 0xb8b3aa, roughness: .64 });
  const frameMat = material(context, "museum-frame", { color: 0x7f6234, roughness: .37, metalness: .58 });
  plane(context, 84, 204, marble, 0, -.03, 0);
  plane(context, 12, 190, runner, 0, .015, 0);
  box(context, 84, .45, 204, ceiling, 0, 10.2, 0);
  for (const x of [-42, 42]) {
    box(context, 1, 10, 204, wallMat, x, 5, 0);
    box(context, .14, 3.4, 202, lowerWall, x + (x < 0 ? .57 : -.57), 1.7, 0);
    collider(context, x, 0, 1, 204);
  }
  box(context, 84, 10, 1, wallMat, 0, 5, 100);
  collider(context, 0, 100, 84, 1);
  for (const x of [-25, 25]) {
    box(context, 34, 10, 1, wallMat, x, 5, -100);
    collider(context, x, -100, 34, 1);
  }

  const entranceSign = textPanel(context, "MIDNATTSMUSEET\nSTÄNGER 23:59", {
    x: 0, y: 6.2, z: 99.4, width: 13, height: 2.8, background: "#171d27", border: "#9e875a",
    color: "#ddd0ad", font: "Georgia, serif", fontSize: 102, emissive: 0x17243a, emissiveIntensity: .75
  });
  interactable(context, "museum-hours", "sign", 0, 95, 5.5, "Läs museets märkliga öppettid", entranceSign);

  const lights = [];
  const lightMat = material(context, "museum-gallery-light", { color: 0xcbe9ff, emissive: 0x86c9ff, emissiveIntensity: 3.1, roughness: .18 });
  for (let z = 86; z >= -88; z -= 16) {
    const fixture = new THREE.Group();
    fixture.position.set(0, 0, z);
    fixture.name = "museum-gallery-light";
    fixture.userData.phase = Math.abs(z) * .11;
    context.root.add(fixture);
    box(context, 5, .12, .75, lightMat, 0, 9.85, 0, 0, fixture);
    const glow = pointLight(context, 0xb8ddff, z === -42 ? 9 : 24, 18, 0, 9, 0, fixture);
    fixture.userData.light = glow;
    lights.push(fixture);
  }

  const statues = [];
  const statueSpecs = [[-18, 69, .3], [19, 54, -2.7], [-18, 27, .4], [19, 10, -2.6], [-18, -18, .3], [19, -36, -2.7], [-18, -65, .4], [19, -77, -2.6]];
  statueSpecs.forEach(([x, z, yaw], index) => {
    const statue = new THREE.Group();
    statue.position.set(x, 0, z);
    statue.rotation.y = yaw;
    statue.name = `museum-statue-${index + 1}`;
    statue.userData.baseYaw = yaw;
    context.root.add(statue);
    cylinder(context, 2.1, 2.4, 1.2, 20, marble, 0, .6, 0, statue);
    const body = sphere(context, 1.2, 20, 14, index % 2 ? bronze : paleStone, 0, 3.1, 0, statue);
    body.scale.set(.72, 1.45, .56);
    sphere(context, .56, 18, 12, index % 2 ? bronze : paleStone, 0, 5.2, 0, statue);
    for (const side of [-1, 1]) {
      const arm = cylinder(context, .15, .23, 2.8, 10, index % 2 ? bronze : paleStone, side * .9, 3.15, 0, statue);
      arm.rotation.z = side * (.28 + index % 3 * .13);
    }
    collider(context, x, z, 4.5, 4.5);
    statues.push(statue);
  });

  const paintingColors = [0x243b57, 0x61353d, 0x4b4e2e, 0x352b59, 0x5b462e, 0x254b48];
  const paintings = [];
  for (const side of [-1, 1]) {
    [76, 43, 10, -24, -57, -82].forEach((z, index) => {
      const painting = new THREE.Group();
      painting.position.set(side * 41.35, 5.1, z);
      painting.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      painting.name = `museum-painting-${side < 0 ? "left" : "right"}-${index + 1}`;
      painting.userData.baseYaw = painting.rotation.y;
      context.root.add(painting);
      box(context, 8.2, 5.5, .32, frameMat, 0, 0, 0, 0, painting);
      const artMat = material(context, `museum-art-${side}-${index}`, { color: paintingColors[(index + (side > 0 ? 2 : 0)) % paintingColors.length], emissive: 0x0c1018, emissiveIntensity: .42, roughness: .73 });
      box(context, 7.35, 4.65, .38, artMat, 0, 0, -.02, 0, painting);
      sphere(context, .8 + index % 2 * .3, 16, 10, paleStone, Math.sin(index) * 1.7, .35, -.28, painting).scale.y = 1.4;
      paintings.push(painting);
    });
  }

  const clueSpecs = [
    ["museum-clue-1", -18, 69, "Undersök statyn som pekar bakåt"],
    ["museum-clue-2", 37.5, 10, "Studera porträttets ögon"],
    ["museum-clue-3", -18, -65, "Läs årtalet under den spruckna statyn"]
  ];
  const clues = clueSpecs.map(([id, x, z, label], index) => {
    const clueMat = material(context, `museum-clue-glow-${index}`, { color: 0x92ddff, emissive: 0x37b5ff, emissiveIntensity: 3.2, roughness: .18 });
    const marker = torus(context, 1.0, .1, clueMat, x, .08, z, { x: Math.PI / 2 });
    marker.name = id;
    pointLight(context, 0x55bfff, 15, 9, x, 1.2, z);
    interactable(context, id, "museum_clue", x, z, 4.7, label, marker);
    return marker;
  });

  const museumClock = new THREE.Group();
  museumClock.position.set(0, 6.4, -88.8);
  museumClock.name = "museum-clock-2359";
  context.root.add(museumClock);
  const clockFace = material(context, "museum-clock-face", { color: 0xe2dbc8, emissive: 0x4e493b, emissiveIntensity: .66, roughness: .58 });
  const clockHand = material(context, "museum-clock-hand", { color: 0x171417, roughness: .42 });
  cylinder(context, 2.8, 2.8, .28, 36, clockFace, 0, 0, 0, museumClock).rotation.x = Math.PI / 2;
  const hourHand = new THREE.Group();
  const minuteHand = new THREE.Group();
  hourHand.position.z = -.2;
  minuteHand.position.z = -.24;
  hourHand.rotation.z = -(11 + 59 / 60) / 12 * Math.PI * 2;
  minuteHand.rotation.z = -(59 / 60) * Math.PI * 2;
  museumClock.add(hourHand, minuteHand);
  box(context, .16, 1.65, .1, clockHand, 0, .82, 0, 0, hourHand);
  box(context, .12, 2.3, .09, clockHand, 0, 1.15, 0, 0, minuteHand);
  sphere(context, .18, 12, 8, clockHand, 0, 0, -.28, museumClock);
  const clockPanel = textPanel(context, "23:59", {
    x: 0, y: 2.2, z: -89.1, width: 4.8, height: 1.25, background: "#26191d", border: "#9e414f",
    color: "#ff9aa9", font: "Arial, sans-serif", fontSize: 150, emissive: 0x5c1422, emissiveIntensity: 1.3
  });

  const monster = addMonster(context, 0, -74, 1.08);
  monster.name = "ikea-monster-in-museum";
  monster.visible = false;
  monster.userData.appearsAt = "00:00";

  const exitDoor = new THREE.Group();
  exitDoor.position.set(0, 0, -99.3);
  exitDoor.name = "museum-emergency-exit";
  exitDoor.userData.locked = true;
  context.root.add(exitDoor);
  const exitDoorMat = material(context, "museum-exit-door", { color: 0x263338, roughness: .48, metalness: .62 });
  for (const x of [-2.25, 2.25]) box(context, 4.4, 7.4, .42, exitDoorMat, x, 3.7, 0, 0, exitDoor);
  box(context, 7.2, .2, .3, bronze, 0, 3.3, -.28, 0, exitDoor);
  const exitLight = new THREE.Group();
  exitLight.position.set(0, 0, -97.9);
  exitLight.name = "museum-exit-light";
  exitLight.visible = false;
  context.root.add(exitLight);
  const exitGlow = material(context, "museum-exit-glow", { color: 0xf33b4f, emissive: 0xe10f34, emissiveIntensity: 4, roughness: .16 });
  box(context, 5.2, 1.1, .2, exitGlow, 0, 8.2, 0, 0, exitLight);
  pointLight(context, 0xff3453, 42, 22, 0, 7.6, 1, exitLight);
  interactable(context, "museum-exit", "museum_exit", 0, -94.5, 6.5, "Öppna museets nödutgång", exitDoor);

  context.actors.entranceSign = entranceSign;
  context.actors.statues = statues;
  context.actors.paintings = paintings;
  context.actors.clues = clues;
  context.actors.clock = museumClock;
  context.actors.clockPanel = clockPanel;
  context.actors.clockHands = [hourHand, minuteHand];
  context.actors.monster = monster;
  context.actors.exitDoor = exitDoor;
  context.actors.exitLight = exitLight;
  context.actors.lights = lights;
  return finishWorld(context);
}

function buildForgottenHospital() {
  const context = createWorld(
    "forgotten_hospital",
    { minX: -108, maxX: 108, minZ: -106, maxZ: 108 },
    { x: 0, y: 0, z: 97, yaw: 0 },
    { sky: 0x071014, ground: 0x010303, hemisphere: .5, sun: 0x91b7b1, sunIntensity: .45, sunX: -30, sunY: 36 }
  );
  context.root.userData.backgroundColor = 0x071014;
  context.root.userData.isInterior = true;

  const tile = material(context, "hospital-tile", { physical: true, color: 0x687572, roughness: .38, metalness: .08, clearcoat: .48, clearcoatRoughness: .25 });
  const wardTile = material(context, "hospital-ward-tile", { color: 0x53615d, roughness: .72 });
  const wallMat = material(context, "hospital-wall", { color: 0x8b9188, roughness: .96 });
  const lowerWall = material(context, "hospital-lower-wall", { color: 0x3f5a56, roughness: .84 });
  const ceiling = material(context, "hospital-ceiling", { color: 0x343d3e, roughness: .94 });
  const steel = material(context, "hospital-steel", { color: 0x69777b, roughness: .32, metalness: .79 });
  const pale = material(context, "hospital-pale", { color: 0xb9c4ba, roughness: .83 });
  const curtainMat = material(context, "hospital-curtain", { color: 0x769a93, roughness: .98, transparent: true, opacity: .84 });
  const warningRed = material(context, "hospital-warning", { color: 0xb43b3d, emissive: 0x6c1118, emissiveIntensity: 1.4, roughness: .42 });

  // Lobbyn ligger för sig; de tre hemliga våningarna finns som isolerade avdelningar.
  plane(context, 72, 60, tile, 0, 0, 78);
  box(context, 72, .42, 60, ceiling, 0, 9.4, 78);
  for (const x of [-36, 36]) {
    box(context, 1, 9.2, 60, wallMat, x, 4.6, 78);
    collider(context, x, 78, 1, 60);
  }
  box(context, 72, 9.2, 1, wallMat, 0, 4.6, 108);
  box(context, 72, 9.2, 1, wallMat, 0, 4.6, 48);
  collider(context, 0, 108, 72, 1);
  collider(context, 0, 48, 72, 1);

  const lobbySign = textPanel(context, "DET GLÖMDA SJUKHUSET\nHISSVÅNINGAR: 1 · 2 · 3", {
    x: 0, y: 6.2, z: 107.4, width: 15, height: 3, background: "#172729", border: "#71918a",
    color: "#c9ded8", font: "Arial, sans-serif", fontSize: 94, emissive: 0x123b39, emissiveIntensity: .82
  });

  const reception = new THREE.Group();
  reception.position.set(-18, 0, 78);
  reception.name = "hospital-abandoned-reception";
  context.root.add(reception);
  box(context, 14, 2.5, 4, lowerWall, 0, 1.25, 0, 0, reception);
  box(context, 14.6, .25, 4.5, steel, 0, 2.6, 0, 0, reception);
  collider(context, -18, 78, 14, 4);

  const elevator = new THREE.Group();
  elevator.position.set(0, 0, 55);
  elevator.name = "hospital-impossible-elevator";
  context.root.add(elevator);
  const elevatorFrame = material(context, "hospital-elevator-frame", { color: 0x313d41, roughness: .36, metalness: .82 });
  box(context, 13, 8.4, 1, elevatorFrame, 0, 4.2, 0, 0, elevator);
  const elevatorDoors = [];
  for (const x of [-3.1, 3.1]) {
    const door = box(context, 5.9, 7.3, .18, steel, x, 3.65, -.58, 0, elevator);
    door.name = `hospital-elevator-door-${x < 0 ? "left" : "right"}`;
    door.userData.closedX = x;
    elevatorDoors.push(door);
  }
  const floorDisplay = textPanel(context, "VÅNING 1\n4 · 7 · 13?", {
    x: 0, y: 8.1, z: 54.25, width: 5.2, height: 1.45, background: "#161b1c", border: "#8d3c43",
    color: "#ff7883", font: "Arial, sans-serif", fontSize: 108, emissive: 0x75111d, emissiveIntensity: 1.3
  });
  interactable(context, "hospital-elevator", "hospital_elevator", 0, 59, 5.5, "Tryck på hissknappen som inte fanns nyss", elevator);

  const wardCenters = [-72, 0, 72];
  const floorNumbers = [4, 7, 13];
  const floorSpawns = wardCenters.map((x, index) => {
    const spawn = new THREE.Vector3(x, 0, 31);
    spawn.floor = floorNumbers[index];
    spawn.yaw = 0;
    return spawn;
  });
  const wards = [];
  const floorSigns = [];
  const wardBeds = [];
  wardCenters.forEach((centerX, wardIndex) => {
    const ward = new THREE.Group();
    ward.position.set(centerX, 0, -28);
    ward.name = `secret-hospital-floor-${floorNumbers[wardIndex]}`;
    context.root.add(ward);
    plane(context, 52, 122, wardIndex % 2 ? tile : wardTile, 0, 0, 0, ward);
    box(context, 52, .42, 122, ceiling, 0, 9.2, 0, 0, ward);
    for (const x of [-26, 26]) {
      box(context, 1, 9, 122, wallMat, x, 4.5, 0, 0, ward);
      box(context, .12, 3.1, 120, lowerWall, x + (x < 0 ? .56 : -.56), 1.55, 0, 0, ward);
    }
    box(context, 52, 9, 1, wallMat, 0, 4.5, 61, 0, ward);
    box(context, 52, 9, 1, wallMat, 0, 4.5, -61, 0, ward);
    collider(context, centerX - 26, -28, 1, 122);
    collider(context, centerX + 26, -28, 1, 122);
    collider(context, centerX, 33, 52, 1);
    collider(context, centerX, -89, 52, 1);

    const sign = textPanel(context, `HEMLIG VÅNING ${floorNumbers[wardIndex]}\nFINNS EJ PÅ KARTAN`, {
      x: centerX, y: 6.2, z: 32.4, width: 11, height: 2.5, background: "#1c2a2a", border: "#8a343e",
      color: "#efb0ac", font: "Arial, sans-serif", fontSize: 90, emissive: 0x5a1018, emissiveIntensity: 1.1
    });
    floorSigns.push(sign);

    for (let bedIndex = 0; bedIndex < 8; bedIndex += 1) {
      const side = bedIndex < 4 ? -1 : 1;
      const row = bedIndex % 4;
      const bed = new THREE.Group();
      bed.position.set(centerX + side * 15, 0, 14 - row * 24);
      bed.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      bed.name = `hospital-bed-floor-${floorNumbers[wardIndex]}-${bedIndex + 1}`;
      context.root.add(bed);
      box(context, 4.3, .55, 7.3, steel, 0, .55, 0, 0, bed);
      box(context, 3.9, .55, 6.8, pale, 0, 1.08, 0, 0, bed);
      box(context, 4.3, 2.3, .22, steel, 0, 1.4, -3.55, 0, bed);
      box(context, 4.1, .12, 2.6, curtainMat, 0, 2.4, .9, 0, bed);
      wardBeds.push(bed);
    }
    wards.push(ward);
  });

  const lights = [];
  const fluorescent = material(context, "hospital-fluorescent", { color: 0xd5fff2, emissive: 0x9debdc, emissiveIntensity: 3.1, roughness: .18 });
  [[0, 78], ...wardCenters.flatMap((x) => [30, 5, -20, -45, -70].map((z) => [x, z]))].forEach(([x, z], index) => {
    const fixture = new THREE.Group();
    fixture.position.set(x, 0, z);
    fixture.name = "hospital-flickering-light";
    fixture.userData.phase = index * .37;
    context.root.add(fixture);
    box(context, 4.4, .11, .72, fluorescent, 0, 8.85, 0, 0, fixture);
    const glow = pointLight(context, 0xb9ffe9, index % 6 === 4 ? 8 : 22, 18, 0, 8.1, 0, fixture);
    fixture.userData.light = glow;
    lights.push(fixture);
  });

  const recordMat = material(context, "hospital-record-paper", { color: 0xd7cfb4, emissive: 0x3d3a24, emissiveIntensity: .5, roughness: .85 });
  const recordInk = material(context, "hospital-record-ink", { color: 0x263337, roughness: .75 });
  const records = wardCenters.map((x, index) => {
    const z = -78;
    const record = new THREE.Group();
    record.position.set(x, .9, z);
    record.name = `hospital-record-${index + 1}`;
    context.root.add(record);
    box(context, 3, .08, 3.8, recordMat, 0, 0, 0, 0, record);
    for (let line = 0; line < 7; line += 1) box(context, 2.2 - line % 2 * .4, .035, .07, line === 0 ? warningRed : recordInk, 0, .08, -1.3 + line * .37, 0, record);
    pointLight(context, 0xffc986, 10, 7, 0, .6, 0, record);
    interactable(context, `hospital-record-${index + 1}`, "hospital_record", x, z, 4.6, `Läs patientjournalen från våning ${floorNumbers[index]}`, record);
    return record;
  });

  const nurse = new THREE.Group();
  nurse.position.set(72, 0, -44);
  nurse.name = "old-blood-stained-nurse";
  nurse.visible = false;
  nurse.userData.active = false;
  context.root.add(nurse);
  const nurseDress = material(context, "hospital-nurse-dress", { color: 0x9ca8a1, roughness: .9 });
  const nurseStain = material(context, "hospital-nurse-stain", { color: 0x672b2d, roughness: .96 });
  const nurseSkin = material(context, "hospital-nurse-skin", { color: 0xb0a69d, roughness: .72 });
  const nurseEye = material(context, "hospital-nurse-eye", { color: 0xff666b, emissive: 0xff202d, emissiveIntensity: 3.5, roughness: .12 });
  const nurseBody = box(context, 2.1, 4.2, 1.25, nurseDress, 0, 3.3, 0, 0, nurse);
  box(context, 1.25, 1.7, .08, nurseStain, -.2, 3.25, -.67, .18, nurse);
  sphere(context, .73, 20, 14, nurseSkin, 0, 5.85, 0, nurse);
  box(context, 1.7, .35, .8, nurseDress, 0, 6.62, 0, 0, nurse);
  box(context, .35, .12, 1.25, warningRed, 0, 6.82, -.12, 0, nurse);
  box(context, 1.25, .12, .35, warningRed, 0, 6.82, -.12, 0, nurse);
  sphere(context, .08, 10, 8, nurseEye, -.25, 6.0, -.62, nurse);
  sphere(context, .08, 10, 8, nurseEye, .25, 6.0, -.62, nurse);
  for (const side of [-1, 1]) {
    const arm = cylinder(context, .12, .2, 3.6, 10, nurseSkin, side * 1.25, 3.4, 0, nurse);
    arm.rotation.z = side * .12;
    cylinder(context, .17, .25, 3.2, 10, nurseDress, side * .55, 1.6, 0, nurse);
  }
  pointLight(context, 0xff3849, 14, 9, 0, 6, -.5, nurse);
  const followPoints = [
    new THREE.Vector3(72, 0, -44), new THREE.Vector3(-72, 0, -48),
    new THREE.Vector3(0, 0, -70), new THREE.Vector3(28, 0, 88)
  ];

  const exitDoor = new THREE.Group();
  exitDoor.position.set(35.3, 0, 78);
  exitDoor.rotation.y = -Math.PI / 2;
  exitDoor.name = "hospital-emergency-exit";
  exitDoor.userData.locked = true;
  context.root.add(exitDoor);
  for (const x of [-2, 2]) box(context, 3.9, 7.1, .4, lowerWall, x, 3.55, 0, 0, exitDoor);
  box(context, 6.3, .2, .3, steel, 0, 3.2, -.28, 0, exitDoor);
  const exitLight = new THREE.Group();
  exitLight.position.set(34, 0, 78);
  exitLight.rotation.y = -Math.PI / 2;
  exitLight.name = "hospital-exit-light";
  exitLight.visible = false;
  context.root.add(exitLight);
  box(context, 5, 1.1, .2, warningRed, 0, 8.1, 0, 0, exitLight);
  pointLight(context, 0xff3d55, 42, 22, 0, 7.5, 1, exitLight);
  interactable(context, "hospital-exit", "hospital_exit", 30.5, 78, 6.2, "Öppna sjukhusets nödutgång", exitDoor);

  context.actors.lobbySign = lobbySign;
  context.actors.reception = reception;
  context.actors.elevator = elevator;
  context.actors.elevatorDoors = elevatorDoors;
  context.actors.floorDisplay = floorDisplay;
  context.actors.floorSpawns = floorSpawns;
  context.actors.wards = wards;
  context.actors.floorSigns = floorSigns;
  context.actors.beds = wardBeds;
  context.actors.records = records;
  context.actors.nurse = nurse;
  context.actors.followPoints = followPoints;
  context.actors.exitDoor = exitDoor;
  context.actors.exitLight = exitLight;
  context.actors.lights = lights;
  return finishWorld(context);
}

function buildFourFloorsDown() {
  const context = createWorld(
    "four_floors_down",
    { minX: -34, maxX: 34, minZ: -99, maxZ: 99 },
    { x: 0, y: 0, z: 90, yaw: 0 },
    { sky: 0x05070b, ground: 0x010102, hemisphere: .42, sun: 0x768591, sunIntensity: .32, sunX: 24, sunY: 22 }
  );
  context.root.userData.backgroundColor = 0x05070b;
  context.root.userData.isInterior = true;

  const controlFloor = material(context, "basement-control-floor", { color: 0x42484a, roughness: .65, metalness: .12 });
  const basementFloor = material(context, "basement-floor", { color: 0x262b2e, roughness: .83 });
  const concrete = material(context, "basement-concrete", { color: 0x555b5b, roughness: .98 });
  const darkConcrete = material(context, "basement-dark-concrete", { color: 0x292f32, roughness: .92 });
  const steel = material(context, "basement-steel", { color: 0x434d54, roughness: .36, metalness: .8 });
  const rust = material(context, "basement-rust", { color: 0x73442f, roughness: .82, metalness: .38 });
  const screenMat = material(context, "basement-screen", { color: 0x79e8c0, emissive: 0x1bc77f, emissiveIntensity: 3, roughness: .15 });
  plane(context, 68, 58, controlFloor, 0, 0, 72);
  plane(context, 24, 154, basementFloor, 0, .005, -25);
  box(context, 68, .42, 202, darkConcrete, 0, 9.2, 0);

  for (const x of [-34, 34]) {
    box(context, 1, 9.2, 202, concrete, x, 4.6, 0);
    collider(context, x, 0, 1, 202);
  }
  box(context, 68, 9.2, 1, concrete, 0, 4.6, 100);
  collider(context, 0, 100, 68, 1);
  for (const x of [-21, 21]) {
    box(context, 26, 9.2, 1, concrete, x, 4.6, -100);
    collider(context, x, -100, 26, 1);
  }
  // Statiska sidoväggar lämnar alltid en 24 meter bred gemensam korridor.
  for (const x of [-12, 12]) {
    box(context, .8, 8.8, 154, concrete, x, 4.4, -25);
    box(context, .14, 3.2, 152, darkConcrete, x + (x < 0 ? .48 : -.48), 1.6, -25);
    collider(context, x, -25, .85, 154);
  }

  const controlHouse = new THREE.Group();
  controlHouse.position.set(0, 0, 78);
  controlHouse.name = "four-floors-control-house";
  context.root.add(controlHouse);
  const controlDesk = box(context, 22, 2.4, 4.5, steel, 0, 1.2, 0, 0, controlHouse);
  collider(context, 0, 78, 22, 4.5);
  const monitors = [];
  for (let i = 0; i < 5; i += 1) {
    const monitor = box(context, 3.2, 2.1, .35, screenMat, -7.6 + i * 3.8, 3.25, -.8, 0, controlHouse);
    monitor.name = `basement-monitor-${i + 1}`;
    monitor.userData.phase = i * .6;
    monitors.push(monitor);
  }
  const controlSign = textPanel(context, "KONTROLLHUS 04\nHISS: FYRA VÅNINGAR NER", {
    x: 0, y: 6.6, z: 99.4, width: 13.5, height: 2.7, background: "#172021", border: "#648779",
    color: "#bce6d5", font: "Arial, sans-serif", fontSize: 96, emissive: 0x164a39, emissiveIntensity: 1
  });

  const elevator = new THREE.Group();
  elevator.position.set(0, 0, 55);
  elevator.name = "control-house-basement-elevator";
  context.root.add(elevator);
  box(context, 14, 8.5, 1, steel, 0, 4.25, 0, 0, elevator);
  const elevatorDoors = [];
  for (const x of [-3.3, 3.3]) {
    const door = box(context, 6.3, 7.4, .2, darkConcrete, x, 3.7, -.58, 0, elevator);
    door.name = `basement-elevator-door-${x < 0 ? "left" : "right"}`;
    elevatorDoors.push(door);
  }
  const elevatorDisplay = textPanel(context, "0\n-1 · -2 · -3 · -4", {
    x: 0, y: 8.1, z: 54.25, width: 5.8, height: 1.5, background: "#15191a", border: "#9b473c",
    color: "#ff806b", font: "Arial, sans-serif", fontSize: 105, emissive: 0x6e2017, emissiveIntensity: 1.25
  });
  interactable(context, "basement-elevator", "basement_elevator", 0, 59.5, 5.7, "Åk fyra våningar ner med kontrollhusets hiss", elevator);
  const basementSpawn = { x: 0, z: 46, yaw: 0 };

  const lights = [];
  const corridorGlow = material(context, "basement-light", { color: 0xc7f0e4, emissive: 0x77d6bd, emissiveIntensity: 2.8, roughness: .2 });
  [91, 66, 45, 28, 10, -8, -26, -44, -62, -80, -94].forEach((z, index) => {
    const fixture = new THREE.Group();
    fixture.position.set(index % 2 ? .6 : -.6, 0, z);
    fixture.name = "basement-flickering-light";
    fixture.userData.phase = index * .51;
    context.root.add(fixture);
    box(context, 4.2, .12, .7, corridorGlow, 0, 8.82, 0, 0, fixture);
    const glow = pointLight(context, 0xa6ead5, index % 4 === 2 ? 8 : 19, 17, 0, 8, 0, fixture);
    fixture.userData.light = glow;
    lights.push(fixture);
  });

  // Varje layout är endast visuell och delar samma kollisionsfria mittgång.
  const corridorLayouts = [];
  const layoutColors = [0x386e65, 0x6b3a3f, 0x4c426c, 0x74623c];
  for (let layoutIndex = 0; layoutIndex < 4; layoutIndex += 1) {
    const layout = new THREE.Group();
    layout.name = `shifting-corridor-layout-${layoutIndex + 1}`;
    layout.visible = layoutIndex === 0;
    layout.userData.layoutIndex = layoutIndex;
    layout.userData.spawn = { ...basementSpawn };
    layout.userData.zone = { minX: -10.5, maxX: 10.5, minZ: -94, maxZ: 48 };
    context.root.add(layout);
    const accent = material(context, `basement-layout-accent-${layoutIndex}`, {
      color: layoutColors[layoutIndex], emissive: layoutColors[layoutIndex], emissiveIntensity: .48, roughness: .72
    });
    for (let segment = 0; segment < 8; segment += 1) {
      const z = 38 - segment * 18;
      const side = (segment + layoutIndex) % 2 ? -1 : 1;
      box(context, 1.2 + layoutIndex * .25, 5.2, 8 + (segment % 3) * 2, accent, side * 10.65, 3, z, (layoutIndex - 1.5) * .03, layout);
      box(context, 18 - layoutIndex, .35, .7, accent, side * 1.2, 7.2, z - 5, (segment % 2 ? .08 : -.08), layout);
      if (layoutIndex === 0) {
        for (let pipe = 0; pipe < 3; pipe += 1) {
          const tube = cylinder(context, .11, .11, 13, 8, rust, side * (8.8 + pipe * .42), 6.3, z, layout);
          tube.rotation.x = Math.PI / 2;
        }
      } else if (layoutIndex === 1) {
        torus(context, 1.2 + segment % 2 * .4, .13, accent, side * 9.7, 4.2, z, { y: Math.PI / 2 }, layout);
      } else if (layoutIndex === 2) {
        cone(context, .7, 2.1, 4, accent, side * 9.9, 5.4, z, layoutIndex * .2, layout);
      } else {
        sphere(context, .5, 14, 10, accent, side * 9.8, 4.5, z, layout);
      }
    }
    corridorLayouts.push(layout);
  }

  // Dörrarna ligger utanför layoutgrupperna så de alltid kan nås via testteleport.
  const doors = [];
  const shiftingDoorSpecs = [[-9.2, 30, Math.PI / 2], [9.2, 0, -Math.PI / 2], [-9.2, -30, Math.PI / 2], [9.2, -60, -Math.PI / 2]];
  shiftingDoorSpecs.forEach(([x, z, yaw], index) => {
    const door = new THREE.Group();
    door.position.set(x, 0, z);
    door.rotation.y = yaw;
    door.name = `shifting-door-${index + 1}`;
    door.userData.layoutAfter = (index + 1) % corridorLayouts.length;
    context.root.add(door);
    const doorMat = material(context, `shifting-door-mat-${index}`, {
      color: 0x344047, emissive: layoutColors[index], emissiveIntensity: .42, roughness: .42, metalness: .6
    });
    box(context, 5.4, 6.9, .42, doorMat, 0, 3.45, 0, 0, door);
    box(context, 4.2, .18, .28, rust, 0, 3.1, -.28, 0, door);
    const numberMat = material(context, `shifting-number-${index}`, { color: 0xb7fff0, emissive: 0x35d8b2, emissiveIntensity: 2.4, roughness: .18 });
    const number = sphere(context, .34, 14, 10, numberMat, 0, 5.45, -.32, door);
    number.scale.x = 1.5 + index * .18;
    pointLight(context, 0x4edbb7, 13, 8, 0, 5.2, -.3, door);
    interactable(context, `shifting-door-${index + 1}`, "shifting_door", x + (x < 0 ? 3.3 : -3.3), z, 4.6, `Öppna den skiftande dörren ${index + 1}`, door);
    doors.push(door);
  });

  const exitDoor = new THREE.Group();
  exitDoor.position.set(0, 0, -99.3);
  exitDoor.name = "four-floors-real-exit";
  exitDoor.userData.locked = true;
  context.root.add(exitDoor);
  const exitDoorMat = material(context, "basement-exit-door", { color: 0x25343a, roughness: .42, metalness: .7 });
  for (const x of [-2.25, 2.25]) box(context, 4.4, 7.4, .42, exitDoorMat, x, 3.7, 0, 0, exitDoor);
  box(context, 7.3, .2, .3, rust, 0, 3.25, -.28, 0, exitDoor);
  const exitLight = new THREE.Group();
  exitLight.position.set(0, 0, -97.9);
  exitLight.name = "basement-exit-light";
  exitLight.visible = false;
  context.root.add(exitLight);
  const exitGlow = material(context, "basement-exit-glow", { color: 0x4dffc5, emissive: 0x13dd98, emissiveIntensity: 4, roughness: .15 });
  box(context, 5.3, 1.1, .2, exitGlow, 0, 8.15, 0, 0, exitLight);
  pointLight(context, 0x43ffbc, 45, 22, 0, 7.55, 1, exitLight);
  interactable(context, "basement-exit", "basement_exit", 0, -94.5, 6.5, "Öppna den riktiga utgången efter fyra skiftande dörrar", exitDoor);

  context.actors.controlHouse = controlHouse;
  context.actors.controlDesk = controlDesk;
  context.actors.controlSign = controlSign;
  context.actors.monitors = monitors;
  context.actors.elevator = elevator;
  context.actors.elevatorDoors = elevatorDoors;
  context.actors.elevatorDisplay = elevatorDisplay;
  context.actors.basementSpawn = basementSpawn;
  context.actors.corridorLayouts = corridorLayouts;
  context.actors.doors = doors;
  context.actors.exitDoor = exitDoor;
  context.actors.exitLight = exitLight;
  context.actors.lights = lights;
  return finishWorld(context);
}
