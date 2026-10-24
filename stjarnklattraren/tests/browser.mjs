import {homedir} from 'node:os';
const {chromium,webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||`${homedir()}/.codex/skills/develop-web-game/node_modules/playwright/index.mjs`);
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.GAME_URL||'http://localhost:8793/stjarnklattraren/';
const out=process.env.QA_OUTPUT||'/tmp/stjarn-qa/browser';fs.mkdirSync(out,{recursive:true});
let checks=0;function check(v,label){assert.ok(v,label);checks++}
for(const [name,engine,options]of[['chromium',chromium,{viewport:{width:1180,height:820}}],['ipad-webkit',webkit,{...devices['iPad (gen 7)'],viewport:{width:1024,height:768}}]]){
 const browser=await engine.launch({headless:true});const context=await browser.newContext(options);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(base+'?qa=1');await page.waitForFunction(()=>typeof window.render_game_to_text==='function');await page.screenshot({path:`${out}/${name}-menu.png`});await page.click('#start-btn');
 const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 check((await state()).place==='home','Starts in cave');
 // Visible joystick control, not keyboard substitute.
 const joy=await page.locator('#joystick').boundingBox();await page.mouse.move(joy.x+joy.width/2,joy.y+joy.height/2);await page.mouse.down();await page.mouse.move(joy.x+joy.width/2,joy.y+10);await page.evaluate(()=>window.advanceTime(600));await page.mouse.up();check((await state()).player.z>13,'Joystick walks forward');
 const beforeYaw=(await state()).player.yaw;await page.mouse.move(600,340);await page.mouse.down();await page.mouse.move(700,340,{steps:5});await page.mouse.up();check((await state()).player.yaw<beforeYaw-.3,'Drag aims camera');
 await page.locator('#attack').hover();await page.mouse.down();await page.evaluate(()=>window.advanceTime(100));check((await state()).shots>0,'Attack button fires shuriken');await page.mouse.up();
 // Show cave/mountain and real map interaction.
 await page.evaluate(()=>{const g=window.__game;g.player.x=27;g.player.z=25;g.player.yaw=0;g.player.pitch=0;window.advanceTime(20)});await page.screenshot({path:`${out}/${name}-cave.png`});
 await page.evaluate(()=>{const g=window.__game;g.player.x=21;g.player.z=17;g.player.yaw=0;window.advanceTime(20)});check((await state()).interact==='Titta på kartan','Map is reachable');await page.click('#interact');check((await state()).mode==='map','Map button opens destinations');await page.click('#travel');check((await state()).place==='outside','Travel button goes to tower');await page.screenshot({path:`${out}/${name}-rain-tower.png`});
 await page.evaluate(()=>{const g=window.__game;g.player.x=24;g.player.z=10.5;window.advanceTime(20)});check((await state()).interact==='Ta nyckeln','Hidden key can be collected');await page.click('#interact');await page.evaluate(()=>{const g=window.__game;g.player.x=15;g.player.z=8.5;g.player.yaw=0;window.advanceTime(20)});await page.click('#interact');check((await state()).place==='floor1','Key unlocks tower in UI');await page.screenshot({path:`${out}/${name}-cloakroom.png`});
 await page.evaluate(()=>{const g=window.__game;g.player.x=36;g.player.z=60;g.player.yaw=0;window.advanceTime(20)});await page.screenshot({path:`${out}/${name}-choice-room.png`});
 await page.evaluate(()=>{const g=window.__game;g.load('floor2');g.mode='play';g.level.doors[0].open=true;g.player.x=48;g.player.z=69;g.player.yaw=-Math.PI/2;window.advanceTime(20)});await page.screenshot({path:`${out}/${name}-traps.png`});
 await page.evaluate(()=>{const g=window.__game;g.load('floor3');g.mode='play';g.player.x=30;g.player.z=39;g.player.yaw=0;window.advanceTime(20)});await page.screenshot({path:`${out}/${name}-boss.png`});
 await page.evaluate(()=>{const g=window.__game;g.level.guards[0].hp=0;g.player.x=30;g.player.z=14;window.advanceTime(20)});await page.click('#interact');check((await state()).ability,'Reward collects through button');await page.click('#rewardhome');check((await state()).place==='home','Reward returns home');
 await page.evaluate(()=>{const g=window.__game;g.player.x=34.5;g.player.z=19;window.advanceTime(20)});await page.click('#interact');check((await state()).built,'Build button uses prize');
 await page.evaluate(()=>{const g=window.__game;g.player.x=27;g.player.z=25;g.player.yaw=0;window.advanceTime(20)});await page.screenshot({path:`${out}/${name}-built.png`});await page.waitForTimeout(1100);await page.reload();await page.waitForFunction(()=>window.render_game_to_text);check((await state()).built&&(await state()).ability,'Prize and ability survive reload');await page.click('#start-btn');
 await page.evaluate(()=>{const g=window.__game;g.player.x=22.9;g.player.z=9;g.player.yaw=Math.PI/2;window.advanceTime(20)});await page.locator('#attack').hover();await page.mouse.down();await page.evaluate(()=>window.advanceTime(700));check((await state()).player.y>3,'Hold attack climbs');await page.mouse.up();await page.evaluate(()=>window.advanceTime(1500));check((await state()).player.y===1.65,'Release lands');
 await page.evaluate(()=>{const g=window.__game;for(let i=0;i<5;i++)g.damage(10);window.advanceTime(20)});check((await state()).mode==='dead'&&!(await state()).built,'Death resets built prize');await page.click('#restart');check((await state()).hp===50,'Restart restores fifty health');
 await page.setViewportSize({width:768,height:1024});await page.waitForTimeout(250);await page.evaluate(()=>window.advanceTime(20));await page.screenshot({path:`${out}/${name}-portrait.png`});for(const id of['attack','joystick','pause']){const box=await page.locator('#'+id).boundingBox();check(box.x>=0&&box.y>=0&&box.x+box.width<=768&&box.y+box.height<=1024,`${id} fits portrait`)}
 check(errors.length===0,`${name} no browser errors: ${errors.join('; ')}`);await browser.close();console.log(`${name}: passed`);
}
console.log(`${checks} browser checks passed`);
