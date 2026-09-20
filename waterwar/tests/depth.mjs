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
  assert(s.setDiveDirection(-1));
  step(s, 1);
  assert(s.player.y < -6, "Ner moves the swimmer down through the water");
  assert(s.player.diving);
  assert(s.setDiveDirection(1));
  step(s, 3);
  assert(s.player.y >= -0.9, "Upp reaches the surface or the raft floating on it");
  assert.equal(s.player.diving, false);
}
{
  const s = new Simulation();
  s.start();
  Object.assign(s.player, { x: PIRATE_SHIP.x, z: PIRATE_SHIP.z + 74, y: DEEP_Y, diving: true });
  assert(s.enterPirateShip(), "the nearby wreck has a deliberate enter action");
  assert.equal(s.player.zone, "ship");
  s.player.x = PIRATE_SHIP.x - 40;
  s.player.z = PIRATE_SHIP.z;
  s.move(s.player, 30, 0);
  assert.equal(s.player.x, PIRATE_SHIP.x - 40, "a ship wall blocks movement outside a door");
  s.player.z = PIRATE_SHIP.z + 16.5;
  s.move(s.player, 30, 0);
  assert(s.player.x > PIRATE_SHIP.x - 20, "the matching doorway lets the player reach the next room");
  Object.assign(s.player, { x: PIRATE_SHIP.x, z: PIRATE_SHIP.z + 50 });
  assert(s.toggleShipRoof());
  assert.equal(s.player.shipRoof, true);
  assert(s.toggleShipRoof());
  s.player.z = PIRATE_SHIP.z + 66;
  assert(s.exitPirateShip());
  assert.equal(s.player.zone, "sea");
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
console.log("PASS depth buttons, pirate ship doors and roof, whale throat, raft follow, and skin protection");
