import * as THREE from './vendor/three.module.js';

export const INTRO_TIMES = Object.freeze({ fork: 4.5, turnLeft: 6.2, arrive: 8.2,
  outOfCar: 9.4, carTreeFalls: 11.4, carBroken: 12.2, doorOpens: 12.4,
  enter: 15.2, doorCloses: 17.2, locked: 17.8, end: 18.8 });

// A deterministic in-game film: no remote video, loading screen or audio start
// permission is needed. The actor is built by the game's own player factory.
export function createFactoryIntro(buildPlayer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071122);
  scene.fog = new THREE.Fog(0x101c2b, 50, 155);
  const camera = new THREE.PerspectiveCamera(51, 16 / 9, 0.1, 260);
  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x172619, 1.25));
  const moonlight = new THREE.DirectionalLight(0xa6c6ff, 2.2);
  moonlight.position.set(-35, 55, -24); scene.add(moonlight);
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, flatShading: true, ...extra });
  const dark = material(0x111923), metal = material(0x526a76), blue = material(0x137ce1, { metalness: 0.22, roughness: 0.35 });
  const glass = material(0x93c9de, { transparent: true, opacity: 0.18, depthWrite: false });
  const leaf = [material(0x193a33), material(0x244638), material(0x2d5141)], wood = material(0x624533);
  const glow = material(0xffe3a0, { emissive: 0xffca6a, emissiveIntensity: 2 });
  const box = (parent, w, h, d, x, y, z, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  const cylinder = (parent, top, bottom, height, x, y, z, mat, sides = 8) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), mat);
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  const road = (ax, az, bx, bz, width = 4.7) => {
    const mesh = box(scene, width, 0.08, Math.hypot(bx - ax, bz - az), (ax + bx) / 2, 0.02, (az + bz) / 2, material(0x777c78));
    mesh.rotation.y = Math.atan2(bx - ax, bz - az);
  };
  box(scene, 240, 0.3, 200, 0, -0.2, 0, material(0x1b3329));
  road(0, -65, 0, 0); road(0, -2, 24, 22); road(0, -2, -16, 13);
  road(-16, 13, -12, 22, 8);
  const tree = (x, z, height = 11, index = 0) => {
    const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root);
    cylinder(root, 0.2, 0.55, height, 0, height / 2, 0, wood);
    for (let tier = 0; tier < 3; tier++) cylinder(root, 0, 3.1 - tier * 0.5, 5, 0, height * 0.48 + tier * 2, 0, leaf[index % 3]);
    return root;
  };
  for (let i = 0; i < 68; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    const z = -61 + (row % 17) * 4.6;
    const x = side * (15 + (row % 4) * 4.4 + (row > 16 ? 15 : 0));
    if (z > 0 && x < 0 && x > -31 || z > 3 && x > 0 && x < 28) continue;
    tree(x, z, 9 + (i % 5), i);
  }
  const roadTree = tree(14, 6, 13, 1), carTree = tree(-23, 13, 12, 2);
  const shadow = new THREE.Group(); shadow.position.set(12.8, 0, 5.2); scene.add(shadow);
  const silhouette = new THREE.MeshBasicMaterial({ color: 0x070b13 });
  box(shadow, 0.65, 0.9, 0.45, 0, 0.9, 0, silhouette);
  const shadowHead = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), silhouette);
  shadowHead.position.y = 1.62; shadow.add(shadowHead);
  for (const x of [-0.2, 0.2]) box(shadow, 0.23, 0.55, 0.3, x, 0.28, 0, silhouette);
  const axeArm = new THREE.Group(); axeArm.position.set(0.38, 1.25, 0); shadow.add(axeArm);
  box(axeArm, 0.2, 0.65, 0.2, 0, -0.2, 0, silhouette);
  box(axeArm, 0.12, 0.9, 0.12, 0, 0.3, 0.08, wood);
  box(axeArm, 0.5, 0.28, 0.16, 0.14, 0.73, 0.08, metal);

  const factory = new THREE.Group(); scene.add(factory);
  const concrete = material(0x56616a), rib = material(0x394853);
  // The facade is intentionally enormous. Its roof is above every film shot.
  box(factory, 85.4, 90, 25, -57.3, 45, 34.5, concrete);
  box(factory, 109.4, 90, 25, 45.3, 45, 34.5, concrete);
  box(factory, 5.2, 83, 25, -12, 48.5, 34.5, concrete);
  for (let x = -94; x < 100; x += 12) {
    box(factory, 0.7, 88, 0.7, x, 44, 21.5, rib);
    for (const y of [12, 23, 34]) box(factory, 6, 3, 0.12, x + 5, y, 21.87, material(0x355768, { emissive: 0x172d3b, emissiveIntensity: 0.3 }));
  }
  box(factory, 14, 0.15, 17, -12, 0, 28, material(0x848582));
  box(factory, 14, 9, 0.5, -12, 4.5, 36, rib);
  box(factory, 7.2, 0.6, 1.5, -12, 7.3, 21.7, metal);
  box(factory, 2.8, 0.2, 0.3, -12, 7.1, 20.95, glow);
  const doorLight = new THREE.PointLight(0xffdc9b, 85, 32, 2);
  doorLight.position.set(-12, 6.3, 19.2); scene.add(doorLight);
  const doorLeft = box(factory, 2.6, 6.9, 0.35, -13.3, 3.45, 22, metal);
  const doorRight = box(factory, 2.6, 6.9, 0.35, -10.7, 3.45, 22, metal);
  const lock = new THREE.Group(); lock.position.set(-12, 3.1, 21.7); factory.add(lock);
  box(lock, 0.65, 0.75, 0.28, 0, 0, 0, glow);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 6, 12, Math.PI), metal);
  shackle.position.y = 0.4; lock.add(shackle);

  const car = new THREE.Group(), shell = new THREE.Group(); car.add(shell); scene.add(car);
  box(shell, 3.3, 0.95, 5.8, 0, 1, 0, blue);
  box(shell, 3.05, 0.28, 5.85, 0, 0.64, 0, dark);
  box(shell, 3.1, 0.18, 3.1, 0, 2.95, -0.25, blue);
  box(shell, 2.9, 1.25, 0.08, 0, 2.23, 1.23, glass);
  box(shell, 2.9, 1.25, 0.08, 0, 2.23, -1.78, glass);
  for (const side of [-1, 1]) {
    box(shell, 0.08, 1.25, 2.9, side * 1.48, 2.23, -0.25, glass);
    for (const z of [-1.7, 1.2]) box(shell, 0.15, 1.5, 0.17, side * 1.49, 2.2, z, blue);
    box(shell, 0.7, 0.32, 0.16, side, 1.22, 2.95, glow);
    const light = new THREE.SpotLight(0xffe3af, 75, 35, 0.45, 0.7, 1.5);
    light.position.set(side, 1.3, 2.9); light.target.position.set(side, 0.1, 22); car.add(light, light.target);
  }
  const wheels = [];
  for (const side of [-1, 1]) for (const z of [-1.8, 1.8]) {
    const wheel = cylinder(car, 0.64, 0.64, 0.4, side * 1.65, 0.63, z, dark, 12);
    wheel.rotation.z = Math.PI / 2; wheels.push(wheel);
  }
  const actor = buildPlayer(scene); actor.scale.setScalar(0.58);
  const progress = (t, start, end) => THREE.MathUtils.clamp((t - start) / (end - start), 0, 1);
  const ease = n => n * n * (3 - 2 * n);
  let lastInfo;
  function update(seconds) {
    const t = THREE.MathUtils.clamp(seconds, 0, INTRO_TIMES.end);
    factory.visible = t >= 6.2;
    carTree.visible = t >= 6.2;
    doorLight.visible = t >= 6.2;
    const turn = progress(t, 6.2, 8.2), drive = progress(t, 0, 4.5);
    car.position.set(-16 * turn, 0, t < 6.2 ? -26 + 24 * drive : -2 + 15 * turn);
    car.rotation.y = t < 6.2 ? 0 : -Math.atan2(16, 15) * ease(progress(t, 6.2, 6.7));
    const leaving = progress(t, 8.2, 9.4), entering = progress(t, 13.2, 15.2);
    if (t < 8.2) {
      car.add(actor); actor.position.set(-0.64, 0.22, -0.05); actor.rotation.y = 0;
    } else {
      scene.add(actor); actor.position.set(-16 + 4 * ease(leaving), 0, 13 + 4 * ease(leaving) + 7.5 * entering);
      actor.rotation.y = leaving < 1 ? 0.65 : 0;
    }
    const walking = t >= 8.2 && t < 9.4 || t >= 13.2 && t < 15.2;
    actor.userData.leftLeg.rotation.x = t < 8.2 ? -1.25 : walking ? Math.sin(t * 10) * 0.65 : 0;
    actor.userData.rightLeg.rotation.x = t < 8.2 ? -1.25 : walking ? -Math.sin(t * 10) * 0.65 : 0;
    actor.userData.leftArm.rotation.x = t < 8.2 ? -0.9 : walking ? -Math.sin(t * 10) * 0.5 : 0;
    actor.userData.rightArm.rotation.x = t < 8.2 ? -0.9 : walking ? Math.sin(t * 10) * 0.5 : 0;
    roadTree.rotation.z = 1.48 * ease(progress(t, 4.5, 5.5));
    shadow.visible = t >= 3.6 && t < 6.2;
    axeArm.rotation.z = -0.7 + Math.sin(progress(t, 3.6, 4.5) * Math.PI * 3) * 1.15;
    carTree.rotation.z = -1.42 * ease(progress(t, 11.4, 12.2));
    shell.scale.y = 1 - 0.5 * ease(progress(t, 11.9, 12.2));
    shell.rotation.z = 0.1 * progress(t, 11.9, 12.2);
    wheels.forEach(wheel => { wheel.rotation.x = t < 8.2 ? t * 7 : 8.2 * 7; });
    const opening = ease(progress(t, 12.4, 13.2)) * (1 - ease(progress(t, 17.2, 17.8)));
    doorLeft.position.x = -13.3 - opening * 2.65; doorRight.position.x = -10.7 + opening * 2.65;
    lock.visible = t >= 17.8;
    if (t >= 3.6 && t < 6.2) {
      camera.position.set(-9, 6.8, -14); camera.lookAt(7, 2.5, 4);
    } else if (t < 6.2) {
      camera.position.set(-9, 5.7, car.position.z - 10); camera.lookAt(0, 1.8, car.position.z + 1);
    } else if (t < 8.2) {
      camera.position.set(-3, 7, -3); camera.lookAt(car.position.x, 3.5, car.position.z + 6);
    } else if (t < 12.4) {
      camera.position.set(1, 7, 7); camera.lookAt(-14, 2.7, 18);
    } else {
      camera.position.set(-21, 4.8, 13); camera.lookAt(-12, 3, 23);
    }
    camera.updateMatrixWorld(true);
    lastInfo = { elapsed: Number(t.toFixed(3)), duration: INTRO_TIMES.end,
      phase: t < 4.5 ? 'forest-drive' : t < 6.2 ? 'right-road-blocked' : t < 8.2 ? 'turn-left' : t < 9.4 ? 'leave-car' : t < 11.4 ? 'look-at-factory' : t < 12.4 ? 'tree-breaks-car' : t < 13.2 ? 'door-opens' : t < 15.2 ? 'enter-factory' : t < 17.2 ? 'inside-factory' : t < 17.8 ? 'door-closes' : 'door-locked',
      camera: 'third-person, oblique side view', timeOfDay: 'midnight', carColor: 'blue', protagonist: 'same player model',
      car: { x: car.position.x, z: car.position.z, broken: t >= 12.2 },
      playerOutsideCar: t >= 8.2, playerInsideFactory: t >= 15.2,
      rightRoadBlocked: t >= 5.5, leftTurn: t >= 6.2, factoryRoofVisible: false,
      shadowVisible: shadow.visible, shadowHasEyes: false,
      treeCause: t >= 11.4 ? 'unseen shadow cuts car tree' : t >= 4.5 ? 'visible shadow cuts right-road tree' : null,
      doorOpen: opening > 0.99, doorLocked: lock.visible, timings: INTRO_TIMES };
    return lastInfo;
  }
  update(0);
  return { scene, camera, update, snapshot: () => lastInfo,
    // Shared film props keep the ending's player, blue car and fallen tree
    // identical to the introduction. These do not affect intro playback.
    props: { actor, car, carTree, factory, shadow, addTree: tree } };
}
