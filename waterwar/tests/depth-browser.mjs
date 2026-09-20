const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const out = process.env.WATERWAR_OUTPUT || "/tmp/waterwar-depth-view";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const errors = [];
page.on("pageerror", error => errors.push(String(error)));
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
try {
  await page.goto(process.env.WATERWAR_URL || "http://127.0.0.1:17777/waterwar/");
  await page.locator("#start").click();
  await page.locator("#dive").click();
  await page.evaluate(() => advanceTime(800));
  assert.equal(await page.evaluate(() => __waterwar.sim.player.diving), true);
  assert.equal(await page.locator("#mode-label").innerText(), "I DJUPET");
  assert.equal(await page.evaluate(() => Math.hypot(__waterwar.sim.raft.x - __waterwar.sim.player.x, __waterwar.sim.raft.z - __waterwar.sim.player.z) < .2), true);
  await page.screenshot({ path: out + "/deep-pirate-ship.png" });
  await page.evaluate(() => { const s = __waterwar.sim; s.warnWhale(); advanceTime(8200); });
  assert.equal(await page.evaluate(() => __waterwar.sim.player.zone), "throat");
  assert(await page.locator("#warning").isHidden());
  await page.screenshot({ path: out + "/deep-whale-throat.png" });
  await page.evaluate(() => advanceTime(5000));
  assert.equal(await page.evaluate(() => __waterwar.sim.player.zone), "belly");
  assert.deepEqual(errors, []);
  console.log("PASS deep dive button, surface raft following, deep whale chase, five-second throat, and belly arrival");
} finally { await browser.close(); }
