const {webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=process.env.WATERWAR_OUTPUT || '/tmp/waterwar-rebuild-browser';await fs.mkdir(out,{recursive:true});
const browser=await webkit.launch();const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
 await page.goto(process.env.WATERWAR_URL || 'http://127.0.0.1:8789/waterwar/');await page.locator('#start').tap();
 await page.evaluate(()=>{advanceTime(0);const s=__waterwar.sim;for(const p of [...s.raft.parts])s.damagePart(s.raft,p,500);s.raft.x=1500;s.raft.z=1500;Object.assign(s.player,{x:0,z:5,y:0,pitch:-.045,yaw:0,wood:0,invulnerable:100});s.selectedBuild='wall';advanceTime(0)});
 await page.locator('#build').tap();assert.equal(await page.evaluate(()=>__waterwar.sim.selectedBuild),'floor');
 assert.equal(await page.evaluate(()=>__waterwar.view.ghost.material.color.getHex()),0xff7466);
 await page.touchscreen.tap(512,384);assert.equal(await page.evaluate(()=>__waterwar.sim.raft.parts.length),0);
 await page.evaluate(()=>{__waterwar.sim.player.wood=2;__waterwar.sim.toast='';advanceTime(0)});
 const target=await page.evaluate(()=>{const v=__waterwar.view,p=v.buildPoint();return {p,ghost:{x:v.ghost.position.x,z:v.ghost.position.z},color:v.ghost.material.color.getHex()}});
 assert.equal(target.color,0x8cffb4);assert(Math.hypot(target.p.x-target.ghost.x,target.p.z-target.ghost.z)<.01);
 await page.screenshot({path:out+'/new-raft-preview.png'});
 await page.touchscreen.tap(512,384);await page.evaluate(()=>advanceTime(0));
 assert.equal(await page.evaluate(()=>__waterwar.sim.raft.parts.length),1);assert.equal(await page.evaluate(()=>__waterwar.sim.player.wood),1);
 assert(await page.evaluate(({x,z})=>Math.hypot(__waterwar.sim.raft.x-x,__waterwar.sim.raft.z-z)<.01,target.p));
 await page.locator('#close-build').tap();await page.keyboard.down('ArrowUp');
 for(let i=0;i<25;i++){if(await page.evaluate(()=>__waterwar.sim.ground(__waterwar.sim.player.x,__waterwar.sim.player.z,'sea',__waterwar.sim.player.y).raft===__waterwar.sim.raft))break;await page.evaluate(()=>advanceTime(100));}
 await page.keyboard.up('ArrowUp');await page.evaluate(()=>{__waterwar.sim.player.pitch=-.65;advanceTime(0)});
 assert(await page.evaluate(()=>__waterwar.sim.ground(__waterwar.sim.player.x,__waterwar.sim.player.z,'sea',__waterwar.sim.player.y).raft===__waterwar.sim.raft),'player can climb onto rebuilt raft');
 await page.screenshot({path:out+'/aboard-new-raft.png'});
 assert.deepEqual(errors,[]);const state=await page.evaluate(()=>JSON.parse(render_game_to_text()));
 await fs.writeFile(out+'/report.json',JSON.stringify({passed:true,state,errors},null,2));console.log(JSON.stringify({passed:true,version:state.version,botCount:state.botCount,wood:state.player.wood,errors}));
}finally{await browser.close()}
