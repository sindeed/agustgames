import assert from "node:assert/strict";
import { Simulation, BUILD, WEAPONS, dist } from "../sim.js";
let passed = 0,
  failed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log("PASS " + name);
  } catch (e) {
    failed++;
    console.error("FAIL " + name + "\n" + e.stack);
  }
};
const fresh = () => {
  const s = new Simulation();
  s.start();
  return s;
};
const step = (s, sec) => {
  for (let i = 0; i < Math.ceil(sec * 60); i++) s.update(1 / 60);
};
test("Start: hammer, sword, one tile, sofa, two tables, 49 distant bots", () => {
  const s = fresh();
  assert.equal(s.player.weapon, "hammer");
  assert.deepEqual(s.player.weapons, ["hammer", "sword"]);
  assert.equal(s.raft.parts.length, 1);
  assert.equal(s.bots.length, 49);
  assert(s.bots.every((b) => dist(b, s.player) > 1000));
  assert.deepEqual(
    s.resources.filter((r) => r.team === 0).map((r) => r.kind),
    ["sofa", "table", "table"],
  );
  assert.equal(s.player.wood, 0);
});
test("Furniture is worth exactly four wood after destruction", () => {
  const s = fresh();
  for (const r of s.resources.filter((r) => r.team === 0))
    for (let i = 0; i < 3; i++) s.harvest(r);
  assert.equal(s.player.wood, 4);
  assert(s.resources.filter((r) => r.team === 0).every((r) => !r.active));
});
test("Palms regrow at 30 seconds, same palm can be harvested again", () => {
  const s = fresh(),
    r = s.resources.find((r) => r.kind === "palm");
  s.player.invulnerable = 999;
  for (let i = 0; i < 3; i++) s.harvest(r);
  assert.equal(s.player.wood, 1);
  step(s, 29.9);
  assert.equal(r.active, false);
  step(s, 0.15);
  assert.equal(r.active, true);
  assert.equal(r.hp, 100);
  for (let i = 0; i < 3; i++) s.harvest(r);
  assert.equal(s.player.wood, 2);
});
test("Gold mine and chest yield spendable gold", () => {
  const s = fresh();
  for (const kind of ["ore", "chest"]) {
    const r = s.resources.find((r) => r.kind === kind);
    for (let i = 0; i < 3; i++) s.harvest(r);
  }
  assert.equal(s.player.gold, 8);
  assert(s.buy("firebow"));
  assert.equal(s.player.gold, 1);
});
test("Exact weapon and guard prices, no overspend, no shield", () => {
  for (const [type, cost, gcost] of [
    ["sword", 0, 3],
    ["spear", 3, 5],
    ["bow", 5, 7],
    ["firebow", 7, 10],
  ]) {
    const s = fresh();
    s.player.gold = cost;
    if (type !== "sword") {
      assert(s.buy(type));
      assert.equal(s.player.gold, 0);
    }
    s.player.gold = gcost;
    assert(s.buy(type, true));
    assert.equal(s.guards[0].hp, 100);
    assert.equal(s.guards[0].weapon, type);
    assert.equal(s.player.gold, 0);
  }
  const s = fresh();
  assert(!s.buy("firebow"));
  assert(!s.buy("shield"));
  assert.equal(WEAPONS.spear.reach > WEAPONS.sword.reach, true);
});
test("Adjacent floor costs one wood, invalid distant placement costs nothing", () => {
  const s = fresh();
  s.player.wood = 4;
  assert(s.build("floor", 3, 0));
  assert.equal(s.player.wood, 3);
  assert.equal(s.raft.parts.length, 2);
  assert(!s.build("floor", 200, 200));
  assert.equal(s.player.wood, 3);
  assert(!s.build("floor", 3, 0));
});
test("All six building types and their exact costs/health", () => {
  assert.deepEqual(
    Object.values(BUILD).map((x) => x.cost),
    [1, 2, 3, 5, 5, 1],
  );
  const s = fresh();
  s.player.wood = 30;
  assert(s.build("strong", 0, 0));
  assert.equal(s.raft.parts.at(-1).hp, 200);
  assert(s.build("stairs", 0, 0));
  assert(s.build("wall", 0, 0));
  assert(s.build("boat", 5, 0));
  assert.equal(s.boats[0].hp, 100);
});
test("Player can board the tiny starting raft from water", () => {
  const s = fresh();
  s.input.z = -1;
  step(s, 1);
  assert(s.player.y > 0.5);
  assert.equal(
    s.ground(s.player.x, s.player.z, "sea", s.player.y).raft,
    s.raft,
  );
});
test("Unsteered raft drifts; wheel anchors; joystick steers only while wheel in use", () => {
  const s = fresh();
  const x = s.raft.x,
    z = s.raft.z;
  step(s, 2);
  assert(Math.hypot(s.raft.x - x, s.raft.z - z) > 0.1);
  s.player.wood = 1;
  assert(s.build("wheel", s.raft.x, s.raft.z));
  const pos = { x: s.raft.x, z: s.raft.z };
  step(s, 2);
  assert.equal(s.raft.x, pos.x);
  assert.equal(s.raft.z, pos.z);
  s.player.x = s.raft.x;
  s.player.z = s.raft.z;
  s.player.y = 0.72;
  const part = s.raft.parts.find((p) => p.type === "wheel");
  assert(s.interact({ kind: "part", entity: part, raft: s.raft, distance: 1 }));
  s.input.z = -1;
  step(s, 1);
  assert(s.raft.z < pos.z - 10);
  s.input.z = 0;
  s.player.cooldown = 0;
  s.interact(null);
  assert.equal(s.player.steering, null);
});
test("A wheel cannot survive loss of all raft floors", () => {
  const s = fresh();
  s.player.wood = 1;
  s.build("wheel", 0, 0);
  s.damagePart(s.raft, s.raft.parts[0], 100);
  assert.equal(s.hasWheel(s.raft), false);
});
test("One dead bot is immediately replaced, still exactly 49", () => {
  const s = fresh(),
    b = s.bots[0];
  s.damage(b, 100);
  assert.equal(s.bots.length, 49);
  assert(!s.bots.includes(b));
  const n = s.bots.find((x) => x.slot === 0);
  assert.equal(n.hp, 100);
  assert.equal(n.y, -0.9);
  assert.equal(s.rafts.find((r) => r.team === n.team).parts.length, 1);
  assert.equal(s.replacements, 1);
});
test("Five-second fire destroys ordinary and special parts and spreads", () => {
  const s = fresh(),
    r = s.raft;
  const wall = s.addPart(r, "strong", 0, 0);
  s.addPart(r, "floor", 3, 0);
  s.ignite(r, wall);
  step(s, 4.8);
  assert(r.parts.includes(wall));
  assert(r.parts.some((p) => p !== wall && p.burning > 0));
  step(s, 0.3);
  assert(!r.parts.includes(wall));
  step(s, 1);
  assert.equal(r.parts.length, 0);
});
test("Swimming summons sharks; sharks and player have 100 health initially", () => {
  const s = fresh();
  s.player.x = 150;
  s.player.z = 140;
  step(s, 15);
  assert(s.sharks.length >= 2);
  assert(s.sharks.every((x) => x.hp === 100));
  assert.equal(s.player.hp, 100);
  step(s, 8);
  assert(s.player.hp < 100);
});
test("Bows never consume ammunition and damage targets with real projectiles", () => {
  const s = fresh();
  s.player.weapons.push("bow");
  s.player.weapon = "bow";
  s.player.x = 0;
  s.player.y = 0.72;
  s.player.z = 0;
  const b = s.bots[0];
  b.x = 0;
  b.z = -12;
  b.y = 0.72;
  b.think = 999;
  b.hostile = false;
  b.age = 0;
  for (let i = 0; i < 4; i++) {
    s.player.cooldown = 0;
    s.attack(null, { x: 0, y: 0, z: -1 });
    step(s, 0.35);
  }
  assert.equal(s.replacements, 1);
  assert(s.player.weapons.includes("bow"));
  assert.equal(s.player.gold, 0);
});
test("Dispatch requires near guard + owned boat + other nearby raft", () => {
  const s = fresh();
  s.player.gold = 3;
  s.buy("sword", true);
  const g = s.guards[0];
  assert(!s.canDispatch(g));
  s.player.wood = 5;
  s.build("boat", 5, 0);
  assert(!s.canDispatch(g));
  const r = s.rafts.find((r) => r.team === 1);
  r.x = 150;
  r.z = 0;
  assert(s.canDispatch(g));
  g.x = 80;
  assert(!s.canDispatch(g));
  g.x = s.player.x;
  assert(s.dispatchGuard(g));
  assert.equal(g.boarding, s.boats[0].id);
  assert.equal(s.boats[0].crew.length, 0);
  step(s, 3);
  assert(g.boatId);
  assert(s.atWar(0, 1));
  step(s, 12);
  assert.equal(g.boatId, null);
});
test("Peaceful encounters do not trigger automatic player guard raids", () => {
  const s = fresh();
  s.player.gold = 10;
  s.buy("firebow", true);
  s.player.wood = 5;
  s.build("boat", 5, 0);
  const b = s.bots[0];
  b.x = 20;
  b.z = 0;
  b.hostile = false;
  b.think = 999;
  step(s, 3);
  assert(!s.atWar(0, b.team));
  assert.equal(s.guards[0].boatId, null);
  assert.equal(s.boats[0].target, null);
});
test("Whale warns before swallowing, is immortal, takes raft and guards", () => {
  const s = fresh();
  s.player.gold = 3;
  s.buy("sword", true);
  s.warnWhale();
  assert.equal(s.player.zone, "sea");
  assert.equal(s.whale.phase, "warning");
  step(s, 13);
  assert.equal(s.player.zone, "sea");
  step(s, 1.2);
  assert.equal(s.player.zone, "belly");
  assert.equal(s.raft.zone, "belly");
  assert.equal(s.guards[0].zone, "belly");
  assert(s.bots.some((b) => b.zone === "belly"));
  s.damage(s.whale, 10000);
  assert.equal(s.whale.hp, Infinity);
});
test("Walkable belly route reaches blowhole, companions escape and mission clears", () => {
  const s = fresh();
  s.player.gold = 3;
  s.buy("sword", true);
  s.swallowRaft(s.raft);
  s.player.x = 25;
  s.player.z = 40;
  s.player.y = 0;
  s.input.z = -1;
  step(s, 19.5);
  assert(s.player.y >= 29);
  s.input.z = 0;
  s.input.x = -1;
  step(s, 4.8);
  assert.equal(s.player.zone, "sea");
  assert.equal(s.raft.zone, "sea");
  assert.equal(s.guards[0].zone, "sea");
  assert.equal(s.snapshot().mission, null);
});
test("Enemy guard rescue is an interaction with hammer in belly", () => {
  const s = fresh();
  s.swallowRaft(s.raft);
  const bot = s.bots[0];
  bot.gold = 3;
  s.buy("sword", true, bot);
  const g = s.guards.at(-1);
  g.zone = "belly";
  g.x = s.player.x;
  g.z = s.player.z;
  assert(s.interact({ kind: "guard", entity: g, distance: 2 }));
  assert(g.escort);
  s.player.x = 0;
  s.player.z = -65;
  s.player.y = 30;
  s.escape();
  assert.equal(g.zone, "sea");
  assert.equal(s.rescued, 1);
});
test("Skins unlock only at 25 floor tiles", () => {
  const s = fresh();
  assert(!s.setSkin("pirate"));
  for (let i = 1; i < 25; i++)
    s.addPart(s.raft, "floor", (i % 5) * 3, Math.floor(i / 5) * 3);
  assert(s.setSkin("pirate"));
  assert.equal(s.raft.skin, "pirate");
  assert(s.setSkin("medieval"));
});
test("Day and night change without any day-count field; whale independent of day", () => {
  const s = fresh();
  s.time = 0;
  assert(!s.night);
  s.time = 220;
  assert(s.night);
  s.warnWhale();
  assert.equal(s.whale.phase, "warning");
  assert(
    !Object.keys(s.snapshot()).some((k) => /dayCount|days|dayNumber/.test(k)),
  );
});
test("Simulation remains finite after five minutes with 49 active building bots", () => {
  const s = fresh();
  s.player.x = 35;
  s.player.z = -65;
  s.player.y = 1.15;
  s.player.invulnerable = 9999;
  step(s, 300);
  assert.equal(s.bots.length, 49);
  assert(s.bots.every((b) => Number.isFinite(b.x) && Number.isFinite(b.z)));
  assert(s.rafts.some((r) => r.team > 0 && r.parts.length > 1));
  assert(s.bots.some((b) => b.weapons.length > 2) || s.guards.length > 0);
});
test("Walls cannot trap the player when built at their feet", () => {
  const s = fresh();
  s.player.x = 0;
  s.player.z = 0;
  s.player.y = 0.72;
  s.player.wood = 2;
  assert(s.build("wall", 0, 0));
  s.input.z = 1;
  step(s, 0.4);
  assert(s.player.z > 1);
});
test("Stairs climb to an upper floor and require a supporting lower floor", () => {
  const s = fresh();
  s.player.wood = 10;
  assert(s.build("stairs", 0, 0));
  assert(s.build("floor", 0, -3, 3));
  s.player.x = 0;
  s.player.z = 1;
  s.player.y = 0.72;
  s.input.z = -1;
  step(s, 0.6);
  assert(s.player.y > 3.5);
  assert(!s.build("wall", 30, 30, 3));
});
test("Hammer gathers resources but sword is needed for combat", () => {
  const s = fresh(),
    b = s.bots[0];
  const target = { kind: "bot", entity: b, distance: 2 };
  assert(!s.attack(target));
  assert.equal(b.hp, 100);
  s.player.cooldown = 0;
  s.player.weapon = "sword";
  assert(s.attack(target));
  assert.equal(b.hp, 75);
});
test("Immortal whale can swallow sea crews without taking distant deployed guards", () => {
  const s = fresh();
  s.player.gold = 6;
  s.buy("sword", true);
  s.buy("sword", true);
  s.guards[1].x = 1200;
  s.guards[1].z = 1200;
  s.swallowRaft(s.raft);
  assert.equal(s.guards[0].zone, "belly");
  assert.equal(s.guards[1].zone, "sea");
});
test("A fully destroyed raft can be rebuilt using wood", () => {
  const s = fresh();
  s.raft.parts = [];
  s.player.wood = 1;
  assert(s.build("floor", s.raft.x, s.raft.z));
  assert.equal(s.raft.parts.length, 1);
  assert.equal(s.player.wood, 0);
});
test("Swallowed boat orders are cancelled so guards can help escape", () => {
  const s = fresh();
  s.player.gold = 3;
  s.buy("sword", true);
  s.player.wood = 5;
  s.build("boat", 5, 0);
  s.guards[0].boarding = s.boats[0].id;
  s.guards[0].raidTarget = "old-order";
  s.building = true;
  s.swallowRaft(s.raft);
  assert.equal(s.guards[0].boarding, null);
  assert.equal(s.guards[0].boatId, null);
  assert.equal(s.guards[0].raidTarget, null);
  assert.equal(s.building, false);
});
console.log(JSON.stringify({ passed, failed }));
if (failed) process.exitCode = 1;
