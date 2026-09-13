const {webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=process.env.WATERWAR_OUTPUT || '/tmp/waterwar-stone-escape';await fs.mkdir(out,{recursive:true});
const browser=await webkit.launch();const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
 await page.goto(process.env.WATERWAR_URL || 'http://127.0.0.1:8789/waterwar/');await page.locator('#start').tap();
 await page.evaluate(()=>{advanceTime(0);const s=__waterwar.sim;s.player.gold=10;s.buy('sword',true);s.buy('spear',true);s.raft.parts[0].hp=62;s.guards[0].hp=71;window.fleetBefore=JSON.stringify({parts:s.raft.parts,guards:s.guards.map(g=>({id:g.id,hp:g.hp,weapon:g.weapon}))});s.swallowRaft(s.raft);advanceTime(0)});
 await page.waitForFunction(()=>__waterwar.audio.musicTrack==='belly');
 assert.equal(await page.evaluate(()=>__waterwar.sim.bellyQuests.get(0).built),0);
 const aim=async({x,z,y=.65})=>{await page.evaluate(({x,z,y})=>{const s=__waterwar.sim;Object.assign(s.player,{x,z:z+2.8,y:0,yaw:0,pitch:Math.atan2(y-1.65,2.8),cooldown:0});advanceTime(0)}, {x,z,y});};
 const stones=await page.evaluate(()=>__waterwar.sim.bellyQuests.get(0).stones.map(s=>({x:s.x,z:s.z,y:s.y})));
 for(let i=0;i<5;i++){
  await aim(stones[i]);assert.equal(await page.evaluate(()=>__waterwar.view.pick()?.kind),'questStone');
  if(i===0)await page.screenshot({path:out+'/collect-stone.png'});
  await page.locator('#hit').tap();assert.equal(await page.evaluate(()=>__waterwar.sim.bellyQuests.get(0).collected),i+1);
 }
 const site=await page.evaluate(()=>__waterwar.sim.bellyQuests.get(0).site);await aim({...site,y:1.2});
 for(let i=0;i<5;i++){
  assert.equal(await page.evaluate(()=>__waterwar.view.pick()?.kind),'stoneStair');
  await page.locator('#hit').tap();assert.equal(await page.evaluate(()=>__waterwar.sim.bellyQuests.get(0).built),i+1);
  await page.evaluate(()=>advanceTime(470));
  assert.equal(await page.evaluate(()=>__waterwar.sim.bellyQuests.get(0).built),i+1,'one press builds exactly one step');
 }
 assert((await page.locator('#mission-detail').innerText()).includes('klar'));
 await page.evaluate(()=>{__waterwar.sim.player.pitch=.12;advanceTime(0)});
 await page.screenshot({path:out+'/five-stone-staircase.png'});
 await page.keyboard.down('ArrowUp');
 for(let i=0;i<35 && await page.evaluate(()=>__waterwar.sim.player.zone==='belly');i++) await page.evaluate(()=>advanceTime(100));
 await page.keyboard.up('ArrowUp');
 assert.equal(await page.evaluate(()=>__waterwar.sim.player.zone),'sea');
 assert.equal(await page.evaluate(()=>JSON.stringify({parts:__waterwar.sim.raft.parts,guards:__waterwar.sim.guards.map(g=>({id:g.id,hp:g.hp,weapon:g.weapon}))})===fleetBefore),true,'fleet survives collection, building and escape unchanged');
 assert(await page.evaluate(()=>__waterwar.sim.guards.every(g=>g.zone==='sea')));
 await page.waitForFunction(()=>__waterwar.audio.musicTrack==='sea' && !__waterwar.audio.musicElement.paused);
 await page.screenshot({path:out+'/escaped-with-fleet.png'});
 assert.deepEqual(errors,[]);const state=await page.evaluate(()=>JSON.parse(render_game_to_text()));
 await fs.writeFile(out+'/report.json',JSON.stringify({passed:true,state,errors},null,2));console.log(JSON.stringify({passed:true,version:state.version,botCount:state.botCount,guards:state.guards.length,errors}));
}finally{await browser.close()}
