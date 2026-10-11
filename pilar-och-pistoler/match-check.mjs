import {Game} from './sim.js';
import fs from 'node:fs';
let tests=[];function check(name,pass,details){tests.push({name,pass:!!pass,details});console.log((pass?'PASS ':'FAIL ')+name+' '+JSON.stringify(details??''));}
for(const kind of ['solo','town','ships','castle']){
 const g=new Game();g.start(kind,true);const start=g.actors.map(a=>({x:a.x,z:a.z})),tick=performance.now();let shotCount=0;const orig=g.fire.bind(g);g.fire=(...args)=>{const yes=orig(...args);if(yes)shotCount++;return yes;};
 // Actual bot movement, decisions and collision for 90 simulated seconds.
 for(let i=0;i<5400&&g.mode==='match';i++)g.update(1/60);
 const moved=g.actors.slice(1).filter((a,i)=>Math.hypot(a.x-start[i+1].x,a.z-start[i+1].z)>4).length;
 check(kind+' bottar hittar och bekämpar deltagare',shotCount>8&&g.actors.some(a=>a.hp<4),{shots:shotCount,moved,hp:g.actors.map(a=>a.hp),mode:g.mode,seconds:g.time,cpuMs:Math.round(performance.now()-tick)});
 check(kind+' inga ogiltiga fysikvärden',g.actors.every(a=>[a.x,a.y,a.z,a.hp].every(Number.isFinite)));
}
// Forced routes prove bots can navigate through actual entrances and stairs.
for(const kind of ['solo','ships','castle']){
 const g=new Game();g.start(kind,true);const a=g.actors[1],b=g.player;let target;
 if(kind==='solo'){Object.assign(a,{x:0,z:-15,y:0});target={x:0,z:-25,y:0};}
 if(kind==='ships'){Object.assign(a,{x:0,z:-25,y:4});target={x:0,z:-38,y:0};}
 if(kind==='castle'){const r=g.world.ramps[0];Object.assign(a,{x:r.x,z:r.z-r.sz/2-2,y:0});target={x:r.x,z:r.z+r.sz/2+2,y:9};}
 const path=g.route(a,target);check(kind+' botväg till interiör/torn finns',path.length>2,{length:path.length,end:path.at(-1)});
 for(let i=0;i<1500&&path.length;i++){const n=path[0],dx=n.x-a.x,dz=n.z-a.z,l=Math.hypot(dx,dz);if(l<.7){path.shift();continue;}a.dx=dx/l;a.dz=dz/l;g.move(a,1/60);}
 check(kind+' bot går hela fysiska vägen',Math.hypot(a.x-target.x,a.z-target.z)<4&&Math.abs(a.y-target.y)<1,{pos:{x:a.x,y:a.y,z:a.z},target,pathLeft:path.length});
}
const g=new Game();g.start('ships',true);const a=g.player;Object.assign(a,{x:0,z:-22,y:4,dz:1,dx:0});for(let i=0;i<500;i++)g.move(a,1/60);check('Mittbrygga förenar skeppen fysiskt',a.z>25&&a.y>=4,{x:a.x,y:a.y,z:a.z});
fs.mkdirSync('output/pilar-qa',{recursive:true});fs.writeFileSync('output/pilar-qa/matches.json',JSON.stringify(tests,null,2));if(tests.some(t=>!t.pass))process.exitCode=1;
