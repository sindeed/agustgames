import {homedir} from 'node:os';
import fs from 'node:fs/promises';
import {gymFlow} from './exit3-gym-flow.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||`${homedir()}/.codex/skills/develop-web-game/node_modules/playwright/index.mjs`);
const base=process.env.GAME_URL||'http://127.0.0.1:8133/where-is-exit-3/?qa=1',out=process.env.QA_OUT||'output/gym10-chromium';await fs.mkdir(out,{recursive:true});
const browser=await(process.env.ENGINE==='webkit'?webkit:chromium).launch({headless:true,args:process.env.ENGINE==='webkit'?[]:['--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1180,height:820},isMobile:true,hasTouch:true});const page=await context.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text())),step=ms=>page.evaluate(ms=>window.advanceTime(ms),ms),place=(x,z,y=0,yaw=0)=>page.evaluate(a=>window.__exit3.place(...a),[x,z,y,yaw]);
const press=async(k,ms=0)=>{await page.keyboard.down(k);if(ms)await step(ms);await page.keyboard.up(k)};
const check=(name,ok,details)=>{checks.push({name,pass:!!ok,details});console.log((ok?'PASS ':'FAIL ')+name+(!ok?' '+JSON.stringify(details):''))};
const shot=async name=>{await page.evaluate(()=>window.__exit3.render());await page.screenshot({path:out+'/'+name+'.png'})};
await page.goto(base,{waitUntil:'networkidle'});await page.locator('#start').tap();await step(1);
const g=await page.evaluate(()=>window.__exit3.constants.GYM);
const floor=await page.evaluate(()=>window.__exit3.world.root.children.filter(o=>o.geometry?.parameters?.width===160&&o.geometry?.parameters.depth===100&&o.position.y<0).map(o=>({w:o.geometry.parameters.width,d:o.geometry.parameters.depth})));
check('Verkligt renderat golv är 160 × 100 och exakt tio gånger större',floor.length===1&&floor[0].w*floor[0].d===16000&&g.w*g.d/1600===10);
check('Takhöjden är oförändrad',g.height===9.4);
await place(0,-21,0,-Math.PI/2);await page.evaluate(()=>window.__exit3.state.immuneUntil=999);await press('KeyW',6500);
check('Den gamla korridordörren leder hela vägen in i nya salen',(await state()).zone==='gym'&&(await state()).player.x>29);
await page.evaluate(()=>{window.__exit3.state.player.yaw=-.8;window.__exit3.state.player.pitch=.1});await shot('expanded-hall');await place(35,-70,0,-Math.PI/2);await shot('whole-hall');
for(const [x,z] of [[28,-106],[181,-106],[181,-14],[100,-105]]){await place(x,z);await step(1);check(`Den nya ytan vid ${x},${z} går att använda`,(await state()).zone==='gym');}
await place(180,-60,0,-Math.PI/2);await press('KeyW',2000);check('Östra ytterväggen stoppar spelaren',(await state()).player.x<184.5&&(await state()).player.x>180);
await place(150,-108,0,0);await press('KeyW',1000);check('Norra ytterväggen stoppar spelaren',(await state()).player.z>-109.6);
await place(150,-101);await page.evaluate(()=>{const a=window.__exit3;a.buildAction('cube');a.buildAction('place')});check('Man kan bygga långt utanför gamla salens gräns',(await state()).pieces.some(p=>p.x>140&&p.z<-100));
const count=(await state()).pieces.length;await place(183,-106,0,-Math.PI/2);await page.evaluate(()=>window.__exit3.buildAction('place'));check('Det går inte att bygga utanför nya ytterväggen',(await state()).pieces.length===count);
await place(174,-55);await page.evaluate(()=>{const s=window.__exit3.state;s.monsters.spider.x=150;s.monsters.spider.z=-55});await step(2000);
check('Åttaben jagar på den utökade ytan med Enögats fart',Math.abs((await state()).monsters.spider.x-156.8)<.05&&(await state()).monsters.spider.speed===(await state()).monsters.enogat.speed);
// A hit at 35 units exercises the extended aim/lifetime, outside the old 23-unit range.
await place(160,-38);await page.evaluate(()=>{const s=window.__exit3.state;s.ball='gym';s.monsters.spider.x=160;s.monsters.spider.z=-73;s.monsters.spider.slowUntil=s.time+3});await press('KeyQ');await step(1550);
check('Längre bollkast träffar i den stora salen',(await state()).gym.hits===1);
await page.evaluate(()=>window.__exit3.start());await step(1);
await gymFlow({page,state,place,step,press,check,shot});
// Visible players can be found across a wider hall; retry starts by the new goal.
await place(150,-58);await page.evaluate(()=>{const s=window.__exit3.state;s.gym.phase='seek';s.gym.timer=30;s.immuneUntil=0;s.monsters.spider.x=150;s.monsters.spider.z=-100});await step(1100);
check('Synlig spelare upptäcks även på den större sökräckvidden',(await state()).gym.phase==='count');
check('Ny kurragömma börjar nära målet',Math.hypot((await state()).player.x-g.goal.x,(await state()).player.z-g.goal.z)<1);
await place(g.respawn.x,-21,0,Math.PI/2);await page.evaluate(()=>window.__exit3.state.immuneUntil=window.__exit3.state.time+7);await press('KeyW',6200);check('Samma dörr fungerar tillbaka till korridoren',(await state()).zone==='corridor',{zone:(await state()).zone,player:(await state()).player});
await page.evaluate(()=>window.__exit3.start());await step(1);
check('Omstart återställer Åttaben i den nya salen',(await state()).monsters.spider.x===g.spiderSpawn.x&&(await state()).gym.hits===0);
if(process.env.ENGINE!=='webkit'){
 await place(145,-48);const cdp=await context.newCDPSession(page),r=await page.locator('#stick').boundingBox();const before=(await state()).player.z;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+20,id:1}]});await step(750);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check('Samma joystick fungerar långt in i nya salen',(await state()).player.z<before-2);await page.locator('[data-action=jump]').tap();await step(300);check('Samma pekknapp hoppar i den stora salen',(await state()).player.y>1);
}
check('Inga webbläsarfel',errors.length===0,errors);await fs.writeFile(out+'/report.json',JSON.stringify({base,checks,errors,final:await state()},null,2));await browser.close();console.log(`RESULT ${checks.filter(x=>x.pass).length}/${checks.length}`);if(checks.some(x=>!x.pass))process.exitCode=1;
