import assert from "node:assert/strict";
import { Simulation } from "../sim.js";
const fresh = () => {
  const s = new Simulation(); s.start(); s.sharks = [];
  Object.assign(s.player, { x: 0, y: 0.72, z: 0, invulnerable: 0 });
  return s;
};
const step = (s, seconds) => {
  const frames = Math.ceil(seconds * 60);
  for (let i = 0; i < frames; i++) s.update(seconds / frames);
};
for (const kind of ["player", "bot"]) {
  const s = fresh(), a = kind === "player" ? s.player : s.bots[0];
  s.damage(a, 75);
  step(s, 1);
  assert.equal(a.hp, 25, kind + " does not heal after one second");
  step(s, 0.99);
  assert.equal(a.hp, 25, kind + " does not heal early");
  step(s, 0.01);
  assert.equal(a.hp, 100, kind + " heals fully at two seconds");
  assert.equal(a.healAt, null);
  s.damage(a, 20);
  step(s, 1.5);
  s.damage(a, 10);
  step(s, 1.99);
  assert.equal(a.hp, 70, kind + " new damage restarts the wait");
  step(s, 0.01);
  assert.equal(a.hp, 100);
  console.log(`PASS ${kind}: full heal at exactly two seconds, reset by further damage`);
}

const s = fresh();
s.player.gold = 30;
s.buy("sword", true);
s.player.wood = 30;
s.build("wall", 0, -1.4);
s.build("strong", 1.4, 0);
s.build("boat", 8, 0);
const guard = s.guards[0], boat = s.boats[0], shark = s.addShark(50, 0);
s.damage(guard, 25); s.damage(boat, 25); s.damage(shark, 25);
const parts = s.raft.parts.map(p => ({ part: p, expected: p.hp - 25 }));
for (const {part} of parts) s.damagePart(s.raft, part, 25);
step(s, 3);
assert.equal(guard.hp, 75); assert.equal(boat.hp, 75); assert.equal(shark.hp, 75);
for (const {part, expected} of parts) assert.equal(part.hp, expected);
console.log("PASS guards, boats, sharks, ordinary parts and special walls do not heal");

const paused = fresh();
paused.damage(paused.player, 50); step(paused, 1);
paused.mode = "paused"; step(paused, 10);
assert.equal(paused.player.hp, 50);
paused.mode = "playing"; step(paused, 1);
assert.equal(paused.player.hp, 100);
console.log("PASS pause does not count toward recovery");

const dead = fresh(), oldBot = dead.bots[0];
dead.damage(oldBot, 100);
assert.equal(oldBot.hp, 0);assert.equal(oldBot.healAt, null);
assert.equal(dead.bots.length, 49);assert.notEqual(dead.bots.find(b=>b.slot===oldBot.slot),oldBot);
dead.damage(dead.player, 100);step(dead, 3);
assert.equal(dead.mode, "dead");assert.equal(dead.player.hp, 0);
console.log("PASS death still ends the player run; dead bots are replaced instead of healed");

const immune = fresh();
immune.damage(immune.player, 20);step(immune, 1);
immune.player.invulnerable = 10;immune.damage(immune.player, 20);step(immune, 1);
assert.equal(immune.player.hp, 100);
console.log("PASS ignored damage does not reset the recovery timer");
