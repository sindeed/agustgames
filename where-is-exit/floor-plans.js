// Agust's drawings: north is the top of the paper, +x right, +z down.
// Dimensions are in metres; the arrangements and letters follow the drawings.
const rect = (id, x, z, w, d, y = 0) => ({ id, x, z, w, d, y });
const lift = (id, x, z, startsUp = false) => ({
  ...rect(id, x, z, 7, 7), kind: 'vertical',
  from: { x, y: startsUp ? 3.2 : 0.65, z },
  to: { x, y: startsUp ? 0.65 : 3.2, z }, duration: 5,
  arrow: startsUp ? '↓' : '↑',
});
const shuttle = (id, x, z, tx, tz, size = 7) => ({
  ...rect(id, x, z, size, size), kind: 'shuttle',
  from: { x, y: 0.65, z }, to: { x: tx, y: 0.65, z: tz },
  duration: Math.max(5, Math.hypot(tx - x, tz - z) / 2), arrow: tz < z ? '↑ U' : 'U →',
});

export const FLOOR_PLANS = {
  3: {
    name: 'HÄNGANDE PLATTOR', drawnBy: 'Agust',
    // Only the outlined entrance/exit banks and U are fixed ground. The white
    // paper is an open pit, including underneath the suspended platforms.
    blankIsVoid: true,
    ground: [rect('south-bank', 0, 45, 38, 18), rect('north-bank', 0, -38.75, 38, 30.5),
      rect('3-U', 29, 26, 16, 16)], holes: [], machines: [],
    elevators: [{ x: -10, z: 47 }, { x: -10, z: -47, rotation: Math.PI }],
    stairs: { down: { x: 10, z: 47 }, up: { x: 10, z: -47, rotation: Math.PI } },
    // Two-metre gaps keep the original four-platform arrangement jumpable
    // at the spider's unchanged walking speed; no extra bridges or platforms.
    platforms: [{ ...lift('3-S-up', -19, -9), w: 25, d: 25 },
      { ...lift('3-S-down', 8, -9, true), w: 25, d: 25 },
      shuttle('3-S-to-U', -1, 26, 29, 26, 16),
      { ...rect('3-S-still', 29, 8, 13, 16), kind: 'static', from: { x: 29, y: 0.65, z: 8 } }],
    destinations: [rect('3-U', 29, 26, 16, 16)],
    switch: { x: 34, z: 26 },
  },
  4: {
    name: 'MASKINER OCH HÅL', drawnBy: 'Agust',
    ground: [rect('main', 0, 0, 64, 64), rect('north', 4, -35, 36, 18),
      rect('south', 0, 38, 26, 20), rect('north-hiss', 12, -46, 14, 12),
      rect('south-hiss', -11, 48, 12, 12), rect('south-stairs', 11, 48, 12, 12)],
    holes: [rect('4-M-center', 8, -9, 14, 14), rect('4-M-west', -24, 14, 16, 14)],
    machines: [rect('4-A-center', -7, -9, 12, 12), rect('4-A-south', 9, 15, 12, 12)],
    walls: [rect('middle-divider', 1, -23, 0.7, 14)],
    elevators: [{ x: 12, z: -47, rotation: Math.PI }, { x: -11, z: 47 }],
    stairs: { down: { x: 11, z: 47 }, up: { x: 8, z: 4, rotation: Math.PI } },
    platforms: [], destinations: [],
  },
  6: {
    name: 'TVÅ HÖJDNIVÅER', drawnBy: 'Agust',
    blankIsVoid: true,
    ground: [rect('W', -8, 29, 22, 22), rect('V1', 10, 14, 14, 12),
      rect('T5', 10, 28, 14, 16), rect('main-west', -30, 8, 12, 38),
      rect('main-north', -16, -5, 26, 12), rect('main-join', -22, 21, 12, 12),
      rect('outer-west', -41, 4, 10, 58), rect('outer-bottom', -6, 37, 80, 10),
      rect('outer-right', 29, 32, 10, 12),
      rect('north-shelf', -14, -30, 28, 8), rect('6-U-left', 3, -30, 8, 8),
      rect('6-U-exit', 29, -41, 10, 10), rect('exit-approach', 19, -47, 8, 12),
      rect('X', 19, -53, 8, 4)],
    holes: [rect('6-M', 10, -1, 14, 16)], machines: [],
    elevators: [], stairs: { down: { x: 10, z: 29 } },
    playerSpawn: { x: -8, z: 29, yaw: 0 }, monsterSpawn: { x: 10, z: 14 },
    upper: [rect('upper-row', 29, -3, 8, 34, 3.2)],
    monsterOnly: [rect('E', 29, 23, 8, 18)],
    platforms: [
      { ...rect('6-S-still', -37, -17, 7, 7), kind: 'static', from: { x: -37, y: 0.65, z: -17 } },
      shuttle('6-S-to-U-left', -2, -5, 3, -30, 8),
      lift('6-S-up', 19, 14),
      shuttle('6-S-to-U-exit', 29, -24, 29, -41, 8),
      lift('6-S-down', 19, -39, true),
    ],
    destinations: [rect('6-U-left', 3, -30, 8, 8), rect('6-U-exit', 29, -41, 10, 10)],
    exit: { x: 19, z: -52 },
  },
};

export function insideRect(x, z, box, inset = 0) {
  return Math.abs(x - box.x) <= box.w / 2 - inset && Math.abs(z - box.z) <= box.d / 2 - inset;
}

export function platformPose(platform, seconds) {
  if (!platform.to) return { ...platform.from };
  // One second at each end gives touch players time to step aboard.
  const leg = platform.duration + 1;
  const phase = ((seconds % (leg * 2)) + leg * 2) % (leg * 2);
  const travel = Math.max(0, Math.min(1, (phase < leg ? phase - 1 : phase - leg - 1) / platform.duration));
  const t = phase < leg ? travel : 1 - travel;
  return Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, platform.from[axis] + (platform.to[axis] - platform.from[axis]) * t]));
}

export function floorHasGround(floor, x, z) {
  const plan = FLOOR_PLANS[floor];
  if (!plan) return Math.abs(x) < 55 && Math.abs(z) < 55;
  if (plan.holes.some(box => insideRect(x, z, box))) return false;
  return plan.ground.some(box => insideRect(x, z, box));
}

// These pits are separate from the labelled M holes. Not even a spider may
// use walls or the ceiling to cross the unoutlined white areas.
export function isBlankVoid(floor, x, z) {
  const plan = FLOOR_PLANS[floor];
  if (!plan?.blankIsVoid) return false;
  return ![...plan.ground, ...plan.holes, ...(plan.upper || []), ...(plan.monsterOnly || [])]
    .some(box => insideRect(x, z, box));
}

export function stairLocation(floor, direction) {
  return FLOOR_PLANS[floor]?.stairs[direction] || { x: direction === 'up' ? -43 : -32, z: 43 };
}
