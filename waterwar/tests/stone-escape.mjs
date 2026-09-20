import assert from 'node:assert/strict';
import {Simulation, BLOWHOLE} from '../sim.js';
const fresh=()=>{const s=new Simulation();s.start();return s;};
function collect(s,a=s.player){const q=s.bellyQuests.get(a.team);for(const stone of q.stones){Object.assign(a,{x:stone.x,z:stone.z,y:0,cooldown:0});assert(s.collectBellyStone(stone,a));}return q;}
function build(s,a=s.player,n=5){const q=s.bellyQuests.get(a.team);Object.assign(a,{x:q.site.x,z:q.site.z,y:0});for(let i=0;i<n;i++){a.cooldown=0;assert(s.buildStoneStep(a));}return q;}
{
 const s=fresh();s.player.gold=20;s.buy('spear',true);s.buy('bow',true);
 s.addPart(s.raft,'floor',3,0);s.addPart(s.raft,'strong',0,-1.5,0);s.raft.parts[0].hp=43;s.guards[0].hp=52;
 s.player.wood=5;s.build('boat',6,0);const boat=s.boats[0],g=s.guards[0];boat.hp=61;boat.crew=[g.id];g.boatId=boat.id;
 const parts=JSON.stringify(s.raft.parts),guards=s.guards.map(g=>({id:g.id,hp:g.hp,weapon:g.weapon}));
 s.swallowRaft(s.raft);assert.equal(s.player.zone,'belly');assert(s.guards.every(g=>g.zone==='belly'));assert.equal(boat.zone,'belly');assert.equal(g.boatId,boat.id);
 const q=s.bellyQuests.get(0);assert.equal(q.stones.length,5);assert.equal(s.baseGround(25,-65,'belly'),0,'old ramp is gone');
 Object.assign(s.player,{x:0,z:-65,y:30});assert.equal(s.escape(),false,'cannot bypass quest at old exit');
 Object.assign(s.player,{x:q.site.x,z:q.site.z,y:0,cooldown:0});s.buildStoneStep();assert.equal(q.built,0);
 const stone=q.stones[0];Object.assign(s.player,{x:stone.x,z:stone.z,y:0});assert(s.collectBellyStone(stone));s.player.cooldown=0;assert.equal(s.collectBellyStone(stone),false);
 for(const item of q.stones.slice(1)){Object.assign(s.player,{x:item.x,z:item.z,cooldown:0});assert(s.collectBellyStone(item));}
 build(s,s.player,4);assert.equal(q.built,4);Object.assign(s.player,{x:0,z:-65,y:5});assert.equal(s.escape(),false,'four building strikes are not enough');
 build(s,s.player,1);assert.equal(q.built,5);Object.assign(s.player,{x:0,z:-65,y:5});assert(s.escape());
 assert.equal(JSON.stringify(s.raft.parts),parts,'all raft parts and damage states are preserved');
 assert.deepEqual(s.guards.map(g=>({id:g.id,hp:g.hp,weapon:g.weapon})),guards);assert(s.guards.every(g=>g.zone==='sea'));
 assert.equal(boat.hp,61);assert.equal(boat.zone,'sea');assert.equal(g.boatId,boat.id);assert.deepEqual(boat.crew,[g.id]);
 s.swallowRaft(s.raft);assert.equal(s.bellyQuests.get(0).built,0,'new visit requires a new staircase');assert.equal(s.bellyQuests.get(0).collected,0);
}
{
 const s=fresh();s.swallowRaft(s.raft);const first=s.bellyQuests.get(0).id;s.whale.mouth=false;s.whale.nextMouth=0;s.updateWhale(.1);s.time+=5;s.updateThroats();
 const b=s.bots.find(b=>b.zone==='belly');assert(b,'opening mouth admits another crew');assert(s.rafts.find(r=>r.team===b.team).zone==='belly');assert.equal(s.bellyQuests.get(0).id,first);
 collect(s,b);build(s,b);Object.assign(s.player,{x:0,z:-65,y:5});assert.equal(s.escape(),false,'another crew cannot complete the player quest');
}
{
 const s=fresh(),a=s.bots[0],b=s.bots[1];s.swallowRaft(s.rafts.find(r=>r.team===a.team));s.swallowRaft(s.rafts.find(r=>r.team===b.team));
 Object.assign(a,{x:0,z:20,y:0,hostile:true,cooldown:0});Object.assign(b,{x:1,z:20,y:0,hostile:false,cooldown:0});s.time=6;s.updateBots(.1);
 assert(s.atWar(a.team,b.team));assert(a.hp<100||b.hp<100,'bots damage other bots in the belly');
 s.swallowRaft(s.raft);Object.assign(s.player,{x:a.x+1,z:a.z,y:0,invulnerable:0});a.cooldown=0;s.startWar(0,a.team);s.updateBots(.1);assert(s.player.hp<100,'hostile bot can hit player');
}
{
 const s=fresh(),b=s.bots[0];b.hostile=false;s.swallowRaft(s.rafts.find(r=>r.team===b.team));
 for(let i=0;i<1800&&b.zone==='belly';i++){s.time+=.1;s.updateBots(.1);}
 assert.equal(b.zone,'sea','bot collects five stones, builds and walks out');assert.equal(s.bellyQuests.get(b.team).built,5);assert.equal(s.bots.length,49);
}
console.log('PASS five stones, five strikes, blocked shortcuts, intact fleet/guards/boats, repeat visit, later crew arrival, bot wars and bot escape');
