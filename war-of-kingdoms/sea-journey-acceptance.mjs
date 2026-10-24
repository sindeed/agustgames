import { chromium, webkit } from "/Users/antonek/.codex/skills/develop-web-game/node_modules/playwright/index.mjs";
import fs from "node:fs";

const baseUrl = process.env.WOK_URL || "http://127.0.0.1:8765/war-of-kingdoms/";
const outputDir = process.env.WOK_OUTPUT || "output/wok-sea-journey-qa";
fs.mkdirSync(outputDir, { recursive: true });

const browserType = process.env.WOK_BROWSER === "webkit" ? webkit : chromium;
const browser = await browserType.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(8000);
page.setDefaultNavigationTimeout(12000);
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

let checks = 0;
const check = (condition, message) => {
  checks++;
  if (!condition) throw new Error(`Kontroll ${checks} misslyckades: ${message}`);
};
const state = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));

try {
  console.log("QA 1/7: laddar spelet");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.click("#start-btn");
  await page.waitForTimeout(120);

  console.log("QA 2/7: tittkarta och hamn");
  await page.evaluate(() => window.WarOfKingdoms.openWorldMap());
  let current = await state();
  check(current.modal === "map", "borgkartan ska öppnas");
  check(current.worldMap.openMode === "view", "borgkartan ska vara tittkarta");
  await page.evaluate(() => document.querySelector('[data-kingdom="1"]')?.click());
  current = await state();
  check(current.modal === "map" && current.selection === null, "tittkartan får inte starta uppdrag");
  await page.screenshot({ path: `${outputDir}/01-view-only-sea-map.png` });
  await page.click("#close-map-btn");

  await page.evaluate(() => {
    Object.assign(window.WarOfKingdoms.state.guards, { sword: 8, archer: 8, cavalry: 8 });
    window.WarOfKingdoms.setPlayerPosition(51.5, 49, 0);
    window.advanceTime(40);
  });
  current = await state();
  check(current.nearestInteraction?.kind === "longship", "långskeppet ska kunna användas i hamnen");
  check(await page.evaluate(() => !window.WarOfKingdoms.collisionProbe(51.5, 0, 49)), "hamnbryggan ska gå att gå på");
  check(await page.evaluate(() => window.WarOfKingdoms.collisionProbe(60, 0, 49)), "spelaren ska inte kunna gå över havsytan bredvid långskeppet");
  await page.evaluate(() => window.WarOfKingdoms.useInteraction());
  current = await state();
  check(current.worldMap.openMode === "travel", "långskeppet ska öppna resekartan");
  await page.screenshot({ path: `${outputDir}/02-travel-map.png` });

  console.log("QA 3/7: startar 18-minutersresan");
  await page.click('[data-kingdom="1"]');
  check((await state()).dialog?.title === "VILL DU ATTACKERA?", "dagsresan ska erbjuda attack");
  await page.click("#question-yes");
  current = await state();
  check(current.selection?.travel === true && current.selection.max === 20, "attackresan ska tillåta högst 20 vakter");
  await page.click('[data-unit="sword"][data-delta="1"]');
  await page.click('[data-unit="archer"][data-delta="1"]');
  await page.click("#selection-confirm");
  await page.waitForTimeout(120);
  current = await state();
  check(current.scene === "journey", "resan ska börja på långskeppet");
  check(current.seaJourney?.totalSeconds === 1080 && current.seaJourney?.gameDays === 3, "resan ska vara tre dygn eller 18 minuter");
  check(current.seaJourney?.selectedGuards.sword === 1 && current.seaJourney?.selectedGuards.archer === 1, "valda vakter ska följa med");
  await page.screenshot({ path: `${outputDir}/03-longship-deck.png` });

  const beforeSwim = current.seaJourney.remainingSeconds;
  await page.evaluate(() => {
    window.WarOfKingdoms.setJourneySwimming(true);
    window.advanceTime(1000);
  });
  current = await state();
  check(current.seaJourney?.swimming && current.seaJourney?.shipStopped, "skeppet ska stanna när kungen badar");
  check(current.seaJourney.remainingSeconds < beforeSwim - 0.9, "restiden ska fortsätta medan skeppet står stilla");
  check(current.seaJourney.guardsCanSwim, "vakterna ska kunna bada");
  check(current.nearbyUnits.every((unit) => unit.y < 0), "medföljande vakter ska vara i vattnet");
  check(current.nearbyUnits.some((unit) => unit.salute === 1), "en vakt nära kungen ska göra honnör även i vattnet");
  await page.screenshot({ path: `${outputDir}/04-swimming-around-ship.png` });

  console.log("QA 4/7: simtävlingar och applåder");
  const started = await page.evaluate(() => window.WarOfKingdoms.startSwimRace());
  check(started, "en simtävling ska kunna startas i vattnet");
  await page.evaluate(() => {
    window.WarOfKingdoms.setPlayerPosition(2.5, -18.2, -0.86);
    window.advanceTime(40);
  });
  current = await state();
  check(current.seaJourney?.applauseWinner === "king", "kungen ska få applåder när kungen vinner");
  check(current.seaJourney?.applauseRemainingSeconds > 4.8, "applåderna ska vara i fem sekunder");
  check(current.seaJourney?.raceCooldownSeconds > 29.8, "nästa tävling ska vänta 30 sekunder i verklig speltid");
  await page.screenshot({ path: `${outputDir}/05-king-applause.png` });

  await page.evaluate(() => window.advanceTime(30100));
  current = await state();
  check(current.seaJourney?.raceCooldownSeconds === 0, "nedräkningen ska nå noll efter 30 sekunder");
  check(current.seaJourney?.racesCompleted === 1, "första tävlingen ska räknas");
  check(await page.evaluate(() => window.WarOfKingdoms.startSwimRace()), "en ny tävling ska kunna startas efter nedräkningen");
  await page.evaluate(() => window.advanceTime(10100));
  current = await state();
  check(current.seaJourney?.applauseWinner === "guard", "vakten ska få applåder när vakten vinner");
  check(current.seaJourney?.racesCompleted === 2 && current.seaJourney?.guardWins === 1, "hur många tävlingar som helst ska kunna räknas");
  await page.screenshot({ path: `${outputDir}/06-guard-applause.png` });

  console.log("QA 5/7: ankomst och nattuppdrag");
  await page.evaluate(() => {
    window.WarOfKingdoms.state.journey.elapsedSeconds = 1079.9;
    window.WarOfKingdoms.state.journey.remainingSeconds = 0.1;
    window.advanceTime(200);
  });
  current = await state();
  check(current.scene === "battle" && current.battle?.target === 1, "uppdraget ska börja när 18 minuter har gått även efter bad");

  await page.evaluate(() => {
    window.WarOfKingdoms.resetGame();
    Object.assign(window.WarOfKingdoms.state.guards, { sword: 8, archer: 8, cavalry: 8 });
    window.WarOfKingdoms.setPhase("night", 10);
    window.WarOfKingdoms.openWorldMap("travel");
  });
  await page.click('[data-kingdom="2"]');
  current = await state();
  check(current.dialog?.mode === "mission", "nattresan ska ge val mellan två nattuppdrag");
  await page.click("#question-yes");
  current = await state();
  check(current.selection?.kind === "stealth" && current.selection.max === 5 && current.selection.travel, "smygresan ska tillåta högst fem vakter");
  await page.click("#selection-cancel");
  await page.click("#question-no");
  current = await state();
  check(current.selection?.kind === "mineRaid" && current.selection.max === 5 && current.selection.travel, "gruvresan ska tillåta högst fem vakter");

  await page.click("#selection-cancel");
  await page.click("#question-back");
  await page.click('[data-castle="abandoned-giant-castle"]');
  current = await state();
  check(current.selection?.kind === "abandonedCastle" && current.selection.max === 10 && current.selection.travel, "jätteslottet ska nås med långskepp och högst tio vakter");

  console.log("QA 6/7: fiendekungarnas långskepp");
  await page.evaluate(() => {
    window.WarOfKingdoms.resetGame();
    window.WarOfKingdoms.startIncomingEnemyJourney("attack", 3);
  });
  current = await state();
  check(current.worldMap.incomingEnemyLongship?.remainingSeconds === 1080, "fiendens attackresa ska ta 18 minuter");
  await page.evaluate(() => {
    window.WarOfKingdoms.state.enemyJourney.remainingSeconds = 0.1;
    window.advanceTime(200);
  });
  current = await state();
  check(current.selection?.kind === "attack" && current.selection?.incoming, "fiendens attackval ska visas först när långskeppet har kommit fram");

  await page.evaluate(() => {
    window.WarOfKingdoms.resetGame();
    window.WarOfKingdoms.state.miners = 3;
    window.WarOfKingdoms.startIncomingEnemyJourney("mineRaid", 4);
    window.WarOfKingdoms.state.enemyJourney.remainingSeconds = 0.1;
    window.advanceTime(200);
  });
  current = await state();
  check(current.selection?.kind === "mineDefense" && current.selection?.max === 5, "fiendens gruvuppdrag ska anlända med val av högst fem försvarsvakter");

  console.log("QA 7/7: felkontroll");
  check(errors.length === 0, errors.join("\n") || "inga webbläsarfel");
  console.log(`War of Kingdoms havsresa: ${checks}/${checks} kontroller godkända.`);
} finally {
  await browser.close();
}
