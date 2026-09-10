const { webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const out = process.env.WATERWAR_OUTPUT || "/tmp/waterwar-whale-music";
await fs.mkdir(out, { recursive: true });
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const playing = async track => {
  await page.waitForFunction(track => {
    const a = __waterwar.audio, m = a.musicElement;
    return a.musicTrack === track && m.currentTime > 0.3 && !m.paused && m.readyState >= 2;
  }, track);
  assert.equal(await page.evaluate(() => __waterwar.audio.musicError), null);
};
const swallow = async () => {
  await page.evaluate(() => { const s = __waterwar.sim; s.swallowRaft(s.raft); advanceTime(0); });
  assert.equal(await page.evaluate(() => __waterwar.sim.player.zone), "belly");
};
try {
  await page.goto(process.env.WATERWAR_URL || "http://127.0.0.1:8789/waterwar/");
  await page.locator("#start").tap();
  await playing("sea");
  await page.evaluate(() => {
    advanceTime(0); window.originalMusicPlayer = __waterwar.audio.musicElement;
    __waterwar.sim.warnWhale(); advanceTime(0);
  });
  assert.equal(await page.evaluate(() => __waterwar.audio.musicTrack), "sea", "warning still uses ocean music");
  await page.evaluate(() => advanceTime(14100));
  assert.equal(await page.evaluate(() => __waterwar.sim.player.zone), "belly", "whale actually swallows player after its warning");
  await playing("belly");
  assert(await page.evaluate(() => originalMusicPlayer === __waterwar.audio.musicElement), "automatic switch reuses Safari player without a tap");
  assert(await page.locator("#mission").isVisible());
  const track = await page.evaluate(() => {
    const a = __waterwar.audio, m = a.musicElement;
    window.musicMeter = a.context.createAnalyser(); musicMeter.fftSize = 2048; a.musicBus.connect(musicMeter);
    return { src: m.currentSrc, duration: m.duration, loop: m.loop };
  });
  assert(track.src.endsWith("/music/circuit-tension.mp3"));
  assert(track.duration > 160 && track.duration < 170 && track.loop);
  const energy = await page.evaluate(async () => {
    const values = new Float32Array(2048); let sum = 0, peak = 0;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 30)); musicMeter.getFloatTimeDomainData(values);
      for (const v of values) { sum += v * v; peak = Math.max(peak, Math.abs(v)); }
    }
    return { rms: Math.sqrt(sum / 20480), peak };
  });
  assert(energy.rms > 0.00001 && energy.peak < 0.5, "dramatic music produces a quiet, nonzero signal");
  const generation = await page.evaluate(() => __waterwar.audio.musicGeneration);
  await page.evaluate(() => { for (let i = 0; i < 30; i++) advanceTime(16); });
  assert.equal(await page.evaluate(() => __waterwar.audio.musicGeneration), generation, "song does not restart every frame");
  await page.screenshot({ path: out + "/inside-whale.png" });
  await page.locator("#pause").tap();
  const position = await page.evaluate(() => __waterwar.audio.musicElement.currentTime);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => __waterwar.audio.musicElement.paused), true);
  assert(Math.abs(await page.evaluate(() => __waterwar.audio.musicElement.currentTime) - position) < 0.05);
  await page.locator("#resume").tap(); await playing("belly");
  await page.evaluate(() => { const m = __waterwar.audio.musicElement; m.currentTime = m.duration - 0.3; });
  await page.waitForFunction(() => __waterwar.audio.musicElement.currentTime < 2, null, { timeout: 5000 });
  await playing("belly");
  await page.evaluate(() => {
    const s = __waterwar.sim; Object.assign(s.player, { x: 0, z: -65, y: 30 });
    s.updateWhale(0); advanceTime(0);
  });
  assert.equal(await page.evaluate(() => __waterwar.sim.player.zone), "sea", "blowhole escape switches back");
  await playing("sea");
  assert((await page.evaluate(() => __waterwar.audio.musicElement.currentSrc)).endsWith("/music/open-horizon.mp3"));
  await page.screenshot({ path: out + "/escaped-to-ocean.png" });
  await page.locator("#pause").tap(); await page.locator("#music-toggle").tap(); await page.locator("#resume").tap();
  await swallow(); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => __waterwar.audio.musicElement.paused), true, "muted music stays off when swallowed");
  assert.equal(await page.evaluate(() => __waterwar.audio.musicTrack), "belly");
  await page.locator("#hit").tap();
  await page.waitForFunction(() => __waterwar.audio.played.swing > 0);
  await page.locator("#pause").tap(); await page.locator("#music-toggle").tap(); await page.locator("#resume").tap();
  await playing("belly");
  // Cancel several loads before any play promise settles; the final zone wins.
  await page.evaluate(() => {
    const s = __waterwar.sim, a = __waterwar.audio;
    for (const zone of ["sea", "belly", "sea", "belly"]) { s.player.zone = zone; a.update(s); }
  });
  await playing("belly");
  await page.locator("#pause").tap(); await page.locator("#restart").tap();
  await playing("sea");
  assert(await page.evaluate(() => originalMusicPlayer === __waterwar.audio.musicElement), "restart uses the same single player");
  assert.deepEqual(errors, []);
  const report = { passed: true, engine: "WebKit", track, energy, errors };
  await fs.writeFile(out + "/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
