import assert from "node:assert/strict";
import { Simulation } from "../sim.js";

for (const weapon of ["sword", "spear", "bow", "firebow"]) {
  for (const botCrew of [false, true]) {
    const s = new Simulation();
    s.start();
    s.sharks = [];
    const owner = botCrew ? s.bots[0] : s.player;
    const raft = s.rafts.find((r) => r.team === owner.team);
    Object.assign(owner, { x: raft.x, z: raft.z, y: 0.72, gold: 20 });
    assert(s.buy(weapon, true, owner));
    const g = s.guards.at(-1);
    Object.assign(g, { x: raft.x, z: raft.z, y: 0.72 });
    const shark = s.addShark(g.x + (weapon.includes("bow") ? 12 : 2.4), g.z);
    for (let frame = 0; frame < 600 && shark.hp > 0; frame++) {
      if (frame % 6 === 0) s.updateGuards(0.1);
      s.updateProjectiles(1 / 60);
    }
    assert.equal(shark.hp, 0, `${weapon} guard defeats nearby shark`);
    assert(!s.sharks.includes(shark));
    assert.equal(owner.hp, 100);
    assert(g.y >= 0, "guard stays on deck");
    console.log(`PASS ${botCrew ? "bot" : "player"} ${weapon} guard defeats shark`);
  }
}

const s = new Simulation();
s.start();
s.player.gold = 20;
s.buy("bow", true);
const g = s.guards[0];
Object.assign(g, { x: 0, z: 0, y: 0.7, boatId: "test-boat" });
s.sharks = [];
const shark = s.addShark(8, 0);
s.updateGuards(0.1);
assert(s.arrows.length > 0, "guard fires from boat");
for (let i = 0; i < 30; i++) s.updateProjectiles(1 / 60);
assert.equal(shark.hp, 75);
assert.equal(g.boatId, "test-boat");
g.boatId = null;
g.escort = true;
assert.equal(s.guardEnemy(g), shark, "rescued guards also help against sharks");
g.zone = "belly";
assert.equal(s.guardEnemy(g), undefined, "belly guards cannot target sea sharks");
console.log("PASS boat defense, rescued guards and zone isolation");

g.zone = "sea";
g.escort = false;
shark.x = 200;
assert.equal(s.guardEnemy(g), undefined, "distant sharks do not distract guards");
const enemy = s.bots[0];
Object.assign(enemy, { x: g.x + 2, z: g.z, zone: "sea" });
assert.equal(s.guardEnemy(g), undefined, "peaceful crews are still left alone");
s.startWar(g.team, enemy.team);
assert.equal(s.guardEnemy(g), enemy, "guards still defend against enemy crews");
console.log("PASS nearby-only shark defense and existing crew combat");
