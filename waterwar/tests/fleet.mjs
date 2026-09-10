const { webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const out = "/tmp/waterwar-fleet";
await fs.mkdir(out, { recursive: true });
const browser = await webkit.launch();
const page = await browser.newPage({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://127.0.0.1:8789/waterwar/");
await page.waitForFunction(() => window.__waterwar);
await page.locator("#start").tap();
await page.evaluate(() => {
  advanceTime(0);
  const s = __waterwar.sim;
  s.player.wood = 120;
  s.player.gold = 60;
  s.player.x = 0;
  s.player.z = 0;
  s.player.y = 0.72;
  const cells = [];
  for (let x = -2; x <= 2; x++)
    for (let z = -2; z <= 2; z++) if (x || z) cells.push({ x, z });
  cells.sort(
    (a, b) => Math.abs(a.x) + Math.abs(a.z) - Math.abs(b.x) - Math.abs(b.z),
  );
  for (const c of cells)
    s.build("floor", s.raft.x + c.x * 3, s.raft.z + c.z * 3);
  s.build("wheel", s.raft.x, s.raft.z);
  s.build("stairs", s.raft.x - 3, s.raft.z);
  s.build("strong", s.raft.x + 3, s.raft.z - 6);
  s.build("wall", s.raft.x, s.raft.z - 6);
  s.build("boat", s.raft.x + 11, s.raft.z);
  s.setSkin("pirate");
  s.player.x = s.raft.x;
  s.player.z = s.raft.z + 6;
  s.player.y = 0.72;
  s.player.pitch = 0.07;
  __waterwar.render();
});
assert.equal(
  await page.evaluate(
    () => __waterwar.sim.raft.parts.filter((p) => p.type === "floor").length,
  ),
  25,
);
assert.equal(await page.evaluate(() => __waterwar.sim.raft.skin), "pirate");
await page.screenshot({ path: out + "/large-pirate-raft.png" });
await page.evaluate(() => {
  const s = __waterwar.sim;
  s.player.x = s.raft.x;
  s.player.z = s.raft.z + 1.3;
  s.player.y = 0.72;
  s.player.yaw = 0;
  s.player.pitch = -0.35;
  __waterwar.render();
});
assert.equal(
  await page.evaluate(() => __waterwar.view.pick()?.entity?.type),
  "wheel",
);
await page.locator("#hit").tap();
assert(await page.evaluate(() => !!__waterwar.sim.player.steering));
const before = await page.evaluate(() => __waterwar.sim.raft.x);
await page.keyboard.down("ArrowRight");
await page.evaluate(() => advanceTime(400));
await page.keyboard.up("ArrowRight");
assert((await page.evaluate(() => __waterwar.sim.raft.x)) > before + 4);
await page.locator("#hit").tap();
assert.equal(await page.evaluate(() => __waterwar.sim.player.steering), null);
console.log("PASS large raft, skin, wheel interaction and joystick steering");
await page.evaluate(() => {
  const s = __waterwar.sim;
  s.setSkin("medieval");
  s.player.x = s.raft.x + 6;
  s.player.z = s.raft.z + 6;
  s.player.y = 0.72;
  s.player.yaw = 0.5;
  s.player.pitch = 0.05;
  __waterwar.render();
});
await page.screenshot({ path: out + "/large-medieval-raft.png" });
await page.evaluate(() => {
  const s = __waterwar.sim;
  s.player.weapons.push("firebow");
  s.player.weapon = "firebow";
  s.player.x = s.raft.x + 6;
  s.player.z = s.raft.z - 6;
  s.player.y = 0.72;
  s.player.invulnerable = 999;
  const r = s.rafts.find((r) => r.team === 1);
  r.x = s.player.x;
  r.z = s.player.z - 30;
  s.addPart(r, "floor", 3, 0);
  s.addPart(r, "strong", 3, 0);
  const b = s.bots.find((b) => b.team === 1);
  b.x = r.x;
  b.z = r.z;
  b.y = 0.72;
  b.think = 999;
  b.hostile = false;
  const target = { x: r.x + 3, y: 0.6, z: r.z };
  const dx = target.x - s.player.x,
    dz = target.z - s.player.z,
    dy = target.y - (s.player.y + 1.65);
  s.player.yaw = Math.atan2(-dx, -dz);
  s.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  __waterwar.render();
});
await page.locator("#hit").tap();
await page.evaluate(() => advanceTime(1000));
assert(
  await page.evaluate(() =>
    __waterwar.sim.rafts
      .find((r) => r.team === 1)
      .parts.some((p) => p.burning > 0),
  ),
);
await page.evaluate(() => advanceTime(1400));
await page.screenshot({ path: out + "/fire-arrows.png" });
await page.evaluate(() => advanceTime(5000));
assert.equal(
  await page.evaluate(
    () => __waterwar.sim.rafts.find((r) => r.team === 1).parts.length,
  ),
  0,
);
assert.equal(await page.evaluate(() => __waterwar.sim.bots.length), 49);
console.log("PASS fire arrow hit, spread and destruction");
await page.evaluate(() => {
  const s = __waterwar.sim;
  s.player.x = s.raft.x + 6;
  s.player.z = s.raft.z - 6;
  s.player.y = 0.72;
  s.player.yaw = 0;
  s.player.pitch = 0.1;
  s.warnWhale();
  advanceTime(12000);
});
await page.screenshot({ path: out + "/giant-whale.png" });
assert.deepEqual(errors, []);
await fs.writeFile(
  out + "/report.json",
  JSON.stringify({ passed: true, errors }, null, 2),
);
await browser.close();
