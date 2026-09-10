import assert from "node:assert/strict";
import { Simulation } from "../sim.js";
const fresh = () => {
  const s = new Simulation(); s.start();
  Object.assign(s.player, { x: 0, y: 0.72, z: 0, wood: 50 });
  return s;
};
for (const [x, z, rotation] of [[0, -1.5, 0], [1.5, 0, Math.PI / 2], [0, 1.5, 0], [-1.5, 0, Math.PI / 2]]) {
  const s = fresh();
  assert(s.build("wall", x * 0.8, z * 0.8));
  const wall = s.raft.parts.at(-1);
  assert.deepEqual([wall.x, wall.z, wall.rotation], [x, z, rotation]);
  assert.equal(wall.hp, 100);
  assert.equal(s.player.wood, 48);
  // The tile centre remains walkable, but a single large step cannot cross the wall.
  s.move(s.player, x * 0.4, z * 0.4);
  assert(Math.hypot(s.player.x, s.player.z) > 0.5);
  const before = { x: s.player.x, z: s.player.z };
  s.move(s.player, x * 2, z * 2);
  assert.deepEqual({ x: s.player.x, z: s.player.z }, before);
  console.log(`PASS edge ${x},${z}: placement, orientation, clear centre and collision`);
}

const s = fresh();
assert(s.build("floor", 3, 0));
assert(s.build("strong", 1.4, 0));
assert.deepEqual([s.raft.parts.at(-1).x, s.raft.parts.at(-1).z], [1.5, 0]);
assert.equal(s.raft.parts.at(-1).hp, 200);
const wood = s.player.wood;
assert(!s.build("wall", 1.6, 0), "same shared edge cannot hold overlapping wall types");
assert.equal(s.player.wood, wood);
assert(s.build("wall", 4.4, 0), "outer edge of neighbouring tile also accepts a wall");
console.log("PASS shared edge between two tiles, outer edge, health, duplicate prevention and no extra charge");

const upper = fresh();
upper.addPart(upper.raft, "floor", 0, 0, 3);
assert(upper.build("wall", 0, -1.4, 3));
assert.deepEqual([upper.raft.parts.at(-1).x, upper.raft.parts.at(-1).y, upper.raft.parts.at(-1).z], [0, 3, -1.5]);
assert(upper.build("wall", 0, -1.4, 0), "same edge on a different storey is available");
assert(!upper.build("wall", 30, 30, 3));
assert(!upper.build("wall", 0, 0, 6));
console.log("PASS upper-storey edges and required floor support");

const drift = fresh();
drift.translateRaft(drift.raft, 17.3, -24.8);
assert(drift.build("wall", 18.7, -24.8));
assert.deepEqual([drift.raft.parts.at(-1).x, drift.raft.parts.at(-1).z], [1.5, 0]);
assert.equal(drift.snapshot().raft.pieces.at(-1).rotation, Math.PI / 2);
console.log("PASS moving raft coordinates and test-state orientation");
