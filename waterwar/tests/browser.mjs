const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const url = process.env.WATERWAR_URL || "http://127.0.0.1:8789/waterwar/";
const out = process.env.WATERWAR_OUTPUT || "/tmp/waterwar-browser";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
    console.error("FAIL " + name + " " + e.message);
    await fs.writeFile(
      out + "/failure-" + results.length + ".json",
      await page.evaluate(() => render_game_to_text()),
    );
  }
}
await page.goto(url);
await page.waitForFunction(() => window.__waterwar);
await page.evaluate(() => window.advanceTime(0));
await page.screenshot({ path: out + "/menu.png" });
await check("Only Start; no intro button", async () => {
  assert.equal(await page.locator("#menu button").count(), 1);
  assert.equal(await page.locator("#start").innerText(), "Start ▶");
  assert.equal(await page.getByRole("button", { name: /intro/i }).count(), 0);
});
await page.locator("#start").click();
await page.evaluate(() => window.advanceTime(1));
await page.screenshot({ path: out + "/start-ipad.png" });
await check("Start hammer; Byt cycles only owned weapons", async () => {
  assert.equal(
    await page.evaluate(() => __waterwar.sim.player.weapon),
    "hammer",
  );
  await page.locator("#switch").click();
  assert.equal(
    await page.evaluate(() => __waterwar.sim.player.weapon),
    "sword",
  );
  await page.locator("#switch").click();
  assert.equal(
    await page.evaluate(() => __waterwar.sim.player.weapon),
    "hammer",
  );
});
await check("Drag changes view and joystick moves player", async () => {
  const yaw = await page.evaluate(() => __waterwar.sim.player.yaw);
  await page.mouse.move(550, 390);
  await page.mouse.down();
  await page.mouse.move(670, 430, { steps: 6 });
  await page.mouse.up();
  assert.notEqual(await page.evaluate(() => __waterwar.sim.player.yaw), yaw);
  const joy = await page.locator("#joystick").boundingBox();
  const before = await page.evaluate(() => ({
    x: __waterwar.sim.player.x,
    z: __waterwar.sim.player.z,
  }));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: joy.x + joy.width / 2, y: joy.y + joy.height / 2 - 32 }],
  });
  await page.evaluate(() => advanceTime(800));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
  const after = await page.evaluate(() => ({
    x: __waterwar.sim.player.x,
    z: __waterwar.sim.player.z,
  }));
  assert(Math.hypot(before.x - after.x, before.z - after.z) > 2);
});
await check(
  "Hammer hit via Slå destroys sofa and tables, yields four wood",
  async () => {
    await page.evaluate(() => {
      __waterwar.newGame();
      advanceTime(0);
    });
    for (const index of [0, 1, 2]) {
      await page.evaluate((index) => {
        const s = __waterwar.sim,
          r = s.resources.filter((r) => r.team === 0)[index];
        s.player.x = r.x;
        s.player.z = r.z + 2;
        s.player.y = -0.9;
        s.player.yaw = 0;
        s.player.pitch = 0.02;
        s.player.cooldown = 0;
        __waterwar.render();
      }, index);
      for (let i = 0; i < 3; i++) {
        await page.locator("#hit").click();
        await page.evaluate(() => advanceTime(520));
      }
    }
    assert.equal(await page.evaluate(() => __waterwar.sim.player.wood), 4);
  },
);
await check(
  "Build gallery has six rows; touch on water places floor and charges wood",
  async () => {
    await page.evaluate(() => {
      const s = __waterwar.sim;
      s.player.x = s.raft.x;
      s.player.z = s.raft.z;
      s.player.y = 0.72;
      s.player.pitch = -0.6;
      s.player.yaw = -Math.PI / 2;
      __waterwar.render();
    });
    await page.locator("#build").click();
    assert.equal(await page.locator("#build-items button").count(), 6);
    await page.locator('[data-build="floor"]').click();
    const coords = await page.evaluate(() => {
      const v = __waterwar.view;
      const r = __waterwar.sim.raft;
      const p = v.tmp.set(r.x + 3, 0.6, r.z).project(v.camera);
      return {
        x: ((p.x + 1) * innerWidth) / 2,
        y: ((1 - p.y) * innerHeight) / 2,
      };
    });
    await page.mouse.click(coords.x, coords.y);
    assert.equal(
      await page.evaluate(
        () =>
          __waterwar.sim.raft.parts.filter((p) => p.type === "floor").length,
      ),
      2,
    );
    assert.equal(await page.evaluate(() => __waterwar.sim.player.wood), 3);
    await page.screenshot({ path: out + "/build-ipad.png" });
    await page.locator("#close-build").click();
    assert(await page.locator("#gallery").isHidden());
  },
);
await check(
  "Shop prices buy bow, infinite shots; weapon cycle includes purchase",
  async () => {
    await page.evaluate(() => {
      __waterwar.sim.player.gold = 12;
    });
    await page.locator("#shop").click();
    await page.locator('[data-buy="bow"]').click();
    await page.locator('[data-guard="bow"]').click();
    assert.equal(await page.evaluate(() => __waterwar.sim.player.gold), 0);
    await page.screenshot({ path: out + "/shop-ipad.png" });
    await page.locator("#close-shop").click();
    assert.equal(
      await page.evaluate(() => __waterwar.sim.player.weapon),
      "bow",
    );
    await page.locator("#switch").click();
    assert.equal(
      await page.evaluate(() => __waterwar.sim.player.weapon),
      "hammer",
    );
  },
);
await check(
  "Contextual guard button only with nearby fleet and boat; dispatch boards",
  async () => {
    await page.evaluate(() => {
      const s = __waterwar.sim;
      s.player.wood = 5;
      s.build("boat", s.player.x + 5, s.player.z);
      const g = s.guards[0];
      g.x = s.player.x + 1;
      g.z = s.player.z;
      s.mode = "playing";
      __waterwar.render();
    });
    assert(await page.locator("#dispatch").isHidden());
    await page.evaluate(() => {
      const s = __waterwar.sim,
        r = s.rafts.find((r) => r.team === 1);
      r.x = s.player.x + 90;
      r.z = s.player.z;
      __waterwar.render();
    });
    assert(await page.locator("#dispatch").isVisible());
    await page.screenshot({ path: out + "/guard-order.png" });
    await page.locator("#dispatch").click();
    await page.evaluate(() => advanceTime(2500));
    assert(await page.evaluate(() => !!__waterwar.sim.guards[0].boatId));
  },
);
await check("Night is readable and no day counter", async () => {
  await page.evaluate(() => {
    const s = __waterwar.sim;
    s.time = 220;
    s.player.x = 0;
    s.player.z = 6;
    s.player.y = -0.9;
    s.player.yaw = -0.2;
    s.player.pitch = 0.05;
    __waterwar.render();
  });
  assert.equal(await page.locator("#daylight").innerText(), "Natt");
  await page.screenshot({ path: out + "/night-ipad.png" });
});
await check("Cave same readable dim lighting", async () => {
  await page.evaluate(() => {
    const s = __waterwar.sim,
      i = s.islands.find((i) => i.cave);
    s.time = 20;
    s.player.x = i.x;
    s.player.z = i.z + 1;
    s.player.y = 1.15;
    s.player.yaw = 0;
    s.player.pitch = -0.12;
    __waterwar.render();
  });
  assert.equal(await page.locator("#mode-label").innerText(), "GULDGRUVAN");
  await page.screenshot({ path: out + "/cave-ipad.png" });
});
await check(
  "Whale warning, swallowing, belly mouth light and escape",
  async () => {
    await page.evaluate(() => {
      const s = __waterwar.sim;
      s.player.x = s.raft.x;
      s.player.z = s.raft.z;
      s.player.y = 0.72;
      s.player.pitch = 0.15;
      s.player.yaw = 0;
      s.warnWhale();
      __waterwar.render();
    });
    assert(await page.locator("#warning").isVisible());
    await page.screenshot({ path: out + "/whale-warning.png" });
    await page.evaluate(() => advanceTime(14200));
    assert.equal(
      await page.evaluate(() => __waterwar.sim.player.zone),
      "belly",
    );
    assert(await page.locator("#mission").isVisible());
    await page.evaluate(() => {
      const s = __waterwar.sim;
      s.player.x = 0;
      s.player.z = 65;
      s.player.y = 0;
      s.player.yaw = 0;
      s.player.pitch = 0.05;
      s.whale.mouth = false;
      __waterwar.render();
    });
    await page.screenshot({ path: out + "/belly-closed.png" });
    await page.evaluate(() => {
      __waterwar.sim.whale.mouth = true;
      __waterwar.render();
    });
    await page.screenshot({ path: out + "/belly-open.png" });
    await page.evaluate(() => {
      const s = __waterwar.sim;
      s.player.x = 0;
      s.player.z = -65;
      s.player.y = 30;
      advanceTime(200);
    });
    assert.equal(await page.evaluate(() => __waterwar.sim.player.zone), "sea");
    assert(await page.locator("#mission").isHidden());
  },
);
await check("Phone portrait controls fit", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    __waterwar.newGame();
    advanceTime(0);
  });
  for (const id of ["hit", "shop", "build", "switch", "joystick"]) {
    const r = await page.locator("#" + id).boundingBox();
    assert(
      r.x >= 0 && r.y >= 0 && r.x + r.width <= 390 && r.y + r.height <= 844,
    );
  }
  await page.screenshot({ path: out + "/portrait.png" });
});
await check("Pause and restart reset to hammer and 49 bots", async () => {
  await page.locator("#pause").click();
  assert.equal(await page.evaluate(() => __waterwar.sim.mode), "paused");
  await page.locator("#restart").click();
  assert.equal(
    await page.evaluate(() => __waterwar.sim.player.weapon),
    "hammer",
  );
  assert.equal(await page.evaluate(() => __waterwar.sim.bots.length), 49);
});
await check("No browser errors", async () => assert.deepEqual(errors, []));
await fs.writeFile(
  out + "/report.json",
  JSON.stringify({ url, results, errors }, null, 2),
);
await browser.close();
if (results.some((r) => !r.pass)) process.exitCode = 1;
