import assert from "node:assert/strict";
import { Simulation, dist } from "../sim.js";
const s = new Simulation();
assert(s.islands.length >= 600);
assert(s.islands.filter(i => dist(i, s.player) < 500).length >= 10);
for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]])
  assert(s.islands.some(i => Math.sign(i.x) === x && Math.sign(i.z) === z && Math.hypot(i.x, i.z) < 550));
let worstGap = 0;
for (let x = -7900; x <= 7900; x += 500)
  for (let z = -7900; z <= 7900; z += 500) {
    const gap = Math.min(...s.islands.map(i => Math.hypot(i.x - x, i.z - z) - i.r));
    worstGap = Math.max(worstGap, gap);
  }
assert(worstGap < 850, "no huge empty regions across the ocean");
for (let a = 0; a < s.islands.length; a++) {
  const island = s.islands[a];
  assert(Math.abs(island.x) + island.r < 8000 && Math.abs(island.z) + island.r < 8000);
  for (let b = a + 1; b < s.islands.length; b++)
    assert(dist(island, s.islands[b]) > island.r + s.islands[b].r + 25, "islands leave navigable water between them");
  assert.equal(s.baseGround(island.x, island.z, "sea"), 1.15);
  assert(s.baseGround(island.x + island.r - 1, island.z, "sea") > 0);
  assert(s.baseGround(island.x + island.r + 1, island.z, "sea") < 0);
}
const resources = new Map();
for (const r of s.resources) if (r.island) {
  if (!resources.has(r.island)) resources.set(r.island, []);
  resources.get(r.island).push(r.kind);
}
for (const i of s.islands) {
  const kinds = resources.get(i.id);
  assert(kinds.includes("palm") && kinds.includes("chest") && kinds.includes("ore"));
}
assert.equal(s.islands.filter(i => i.cave).length, 1);
assert.deepEqual(s.islands.slice(0, 2).map(({x,z,r,cave})=>({x,z,r,cave})), [
  {x:35,z:-65,r:25,cave:undefined},{x:-112,z:-185,r:43,cave:true},
]);
assert.equal(s.bots.length, 49);
assert(s.bots.every(b=>s.baseGround(b.x,b.z,"sea") < 0 && dist(b,s.player)>1000));
assert(s.rafts.every(r=>s.baseGround(r.x,r.z,"sea") < 0));
assert.equal(s.baseGround(s.player.x,s.player.z,"sea"), -0.9);
console.log(JSON.stringify({passed:true,islands:s.islands.length,nearStart:s.islands.filter(i=>dist(i,s.player)<500).length,worstSampledGap:Math.round(worstGap),bots:s.bots.length}));
