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
    name: 'AGUSTS VÄG TILL EXIT', drawnBy: 'Agust',
    blankIsVoid: true,
    ground: [
      rect('W', -8, 29, 16, 16),
      rect('T5', 10, 28, 14, 16),
      rect('V1', 10, 14, 14, 12),
      rect('left-corridor', -26, 29, 22, 8),
      rect('outer-west', -41, 4, 10, 58),
      rect('north-corridor', -18, -5, 32, 12),
      rect('6-U-left', 3, -30, 8, 8),
      rect('exit-approach', 19, -47, 8, 12),
      rect('X', 19, -53, 8, 4),
    ],
    holes: [], machines: [], elevators: [],
    stairs: { down: { x: 10, z: 29 } },
    playerSpawn: { x: -8, z: 29, yaw: 0 },
    monsterSpawn: { x: 10, z: 14 },
    upper: [], monsterOnly: [
      // Snabbis takes a long, fixed switchback route. Players cannot enter E.
      rect('E-entry', 22, 14, 14, 3),
      rect('E-east-1', 29, -11, 3, 53),
      rect('E-turn-1', 34, -37, 13, 3),
      rect('E-west-1', 40, -7, 3, 63),
      rect('E-turn-2', 46, 24, 15, 3),
      rect('E-east-mid', 44, -10, 3, 70),
      rect('E-east-2', 48, -10, 3, 70),
      rect('E-east-3', 52, -10, 3, 70),
      rect('E-final', 38.5, -45, 29, 3),
    ],
    monsterRaceRoute: [
      [10,14], [29,14], [29,-37], [40,-37], [40,24],
      [44,24], [44,-45], [48,-45], [48,24],
      [52,24], [52,-45], [24,-45],
    ],
    platforms: [
      shuttle('6-S-to-U-left', -2, -5, 3, -30, 8),
      {
        ...rect('6-S-down', 8, -32, 12, 12), kind: 'shuttle',
        from: { x: 8, y: 0.65, z: -32 },
        to: { x: 19, y: 0.65, z: -47 },
        duration: 11, arrow: 'EXIT',
      },
    ],
    destinations: [rect('6-U-left', 3, -30, 8, 8)],
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
  const pose = Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, platform.from[axis] + (platform.to[axis] - platform.from[axis]) * t]));
  if (platform.id === '6-S-down') pose.y += 0.7 * Math.sin(Math.PI * t);
  return pose;
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
