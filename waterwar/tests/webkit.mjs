const { webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const out = process.env.WATERWAR_OUTPUT || "/tmp/waterwar-webkit";
await fs.mkdir(out, { recursive: true });
const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1024, height: 768 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(process.env.WATERWAR_URL || "http://127.0.0.1:8789/waterwar/");
await page.waitForFunction(() => window.__waterwar);
await page.locator("#start").tap();
await page.evaluate(() => advanceTime(100));
assert.equal(await page.evaluate(() => __waterwar.sim.mode), "playing");
await page.locator("#switch").tap();
assert.equal(await page.evaluate(() => __waterwar.sim.player.weapon), "sword");
await page.locator("#switch").tap();
assert.equal(await page.evaluate(() => __waterwar.sim.player.weapon), "hammer");
await page.keyboard.down("ArrowUp");
await page.evaluate(() => advanceTime(1000));
await page.keyboard.up("ArrowUp");
assert((await page.evaluate(() => __waterwar.sim.player.y)) > 0.5);
await page.screenshot({ path: out + "/ipad-safari.png" });
await page.locator("#build").tap();
assert(await page.locator("#gallery").isVisible());
assert.equal(await page.locator("#build-items button").count(), 6);
await page.locator("#close-build").tap();
await page.locator("#shop").tap();
assert(await page.locator("#shop-screen").isVisible());
await page.locator("#close-shop").tap();
const stats = await page.evaluate(() => ({
  state: JSON.parse(render_game_to_text()),
  render: __waterwar.view.renderer.info.render,
  memory: __waterwar.view.renderer.info.memory,
}));
assert.deepEqual(errors, []);
await fs.writeFile(
  out + "/report.json",
  JSON.stringify(
    { passed: true, engine: "WebKit iPad emulation", errors, stats },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    passed: true,
    engine: "WebKit",
    render: stats.render,
    errors,
  }),
);
await browser.close();
