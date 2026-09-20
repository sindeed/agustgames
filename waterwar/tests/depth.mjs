import assert from "node:assert/strict";
import { Simulation, DEEP_Y, PIRATE_SHIP } from "../sim.js";

const step = (s, seconds) => {
  for (let t = 0; t < seconds; t += 0.1) s.update(0.1);
};

{
  const s = new Simulation();
  s.start();
  assert(s.toggleDive());
  assert.equal(s.player.diving, true);
  assert.equal(s.player.y, DEEP_Y);
  s.input.z = -1;
  step(s, 1);
  assert.equal(s.player.y, DEEP_Y, "a diver stays in the deep");
  assert(Math.hypot(s.raft.x - s.player.x, s.raft.z - s.player.z) < 0.2, "surface raft follows its diver");
  assert.equal(s.pirateShip ?? PIRATE_SHIP, PIRATE_SHIP);
}
{
  const s = new Simulation();
  s.start();
  s.player.diving = true;
  s.player.y = DEEP_Y;
  s.startThroat(s.raft);
  assert.equal(s.player.zone, "throat");
  step(s, 4.9);
  assert.equal(s.player.zone, "throat", "the water journey is five seconds");
  step(s, 0.2);
  assert.equal(s.player.zone, "belly");
  assert.equal(s.raft.zone, "belly");
}
{
  const s = new Simulation();
  s.start();
  s.player.wood = 40;
  for (let i = 1; i < 25; i++) s.addPart(s.raft, "floor", i * 3, 0);
  assert(s.setSkin("pirate"));
  const old = s.raft.parts[0], later = s.addPart(s.raft, "floor", 100, 0);
  s.damagePart(s.raft, old, 1000);
  assert(s.raft.parts.includes(old), "pre-skin player part is protected");
  s.damagePart(s.raft, later, 1000);
  assert(!s.raft.parts.includes(later), "new part can break");
  const botRaft = s.rafts.find((r) => r.team === 1);
  s.bots[0].wood = 50;
  for (let i = 1; i < 25; i++) s.addPart(botRaft, "floor", i * 3, 0);
  assert(s.setSkin("medieval", s.bots[0]));
  const botPart = botRaft.parts[0];
  s.damagePart(botRaft, botPart, 1000);
  assert(!botRaft.parts.includes(botPart), "bot skin never protects parts");
}
console.log("PASS deep dive, five-second whale throat, surface raft follow, and player-only skin protection");
