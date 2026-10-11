import {makeWorld,inRect,floorAt,collides} from './world.js?v=20261011-3';
export const WEAPONS=[
 {name:'Blickdår',tier:0,damage:.5,cool:.5,speed:48,color:0xd8c895,tip:'Snabba enskilda pilar · ½ hjärta'},
 {name:'Pipår',tier:0,damage:1,cool:1.55,speed:30,color:0xd8c895,tip:'En enkel pil · 1 hjärta'},
 {name:'Gegå',tier:0,damage:1,cool:2.3,speed:34,color:0xb7d7a5,tip:'Pilen går genom väggar · 1 hjärta'},
 {name:'Skooker',tier:0,damage:0,cool:1.25,speed:40,color:0xbb76f5,tip:'Fem sekunder i den lila duellvärlden'},
 {name:'Lord War',tier:1,damage:4,cool:4.5,speed:46,color:0x6bbdff,tip:'Piratpistol · 4 hjärtan · lång laddning'},
 {name:'Edår',tier:1,damage:0,cool:3.4,speed:34,color:0xffa046,tip:'Bred eld nära · 2½ hjärtan på fem sekunder'},
 {name:'Dundår',tier:1,damage:1,cool:2.4,speed:37,color:0x67cfef,tip:'Studsar en gång mot väggen · 1 hjärta'},
 {name:'Liker',tier:1,damage:1,cool:4,speed:110,color:0xa2f1ff,tip:'Fryser i fem sekunder · 1 hjärta'},
 {name:'Bigda',tier:2,damage:1,cool:1.3,speed:44,color:0xf0a2ff,tip:'Skjut för att flyga rakt upp · 1 hjärta'},
 {name:'Wyver',tier:2,damage:1,cool:.85,speed:12,color:0x96ffe5,tip:'Vind som lyfter → långsam bred pil'},
 {name:'Bimbår',tier:2,damage:1,cool:1.5,speed:42,color:0xff9bcd,tip:'Rör dig + skjut: långt kast · klättra vid hotell'},
 {name:'Bomba',tier:2,damage:2,cool:3.5,speed:15,color:0xffbe6b,tip:'Stor kanonkula · explosion · 2 hjärtan'}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Game {
 constructor(){this.mode='menu';this.time=0;this.events=[];this.paused=false;this.serial=0;this.seed=1921;}
 random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 start(kind='solo',match=false){this.kind=kind;this.mode=kind==='solo'&&!match?'lobby':'match';this.world=makeWorld(kind);this.time=0;this.projectiles=[];this.effects=[];this.realms=[];this.events=[];this.result='';this.potions=this.world.potions.map(p=>({...p,uid:++this.serial}));this.paused=false;this.actors=[];this.loot=this.mode==='lobby'?[]:this.world.loot.map(l=>({...l,uid:++this.serial}));
  const ids=[1,0,2,3,4,5,6,7,8,9,10,11];
  for(let i=0;i<12;i++){let s=this.world.spawns[i];if(kind==='solo'&&match)s=this.world.matchSpawns[i];
   this.actors.push({id:i,name:i===0?'Du':['Blick','Gegge','Skook','Kapten War','Edda','Dunder','Lajker','Biggi','Vind','Bim','Bom'][i-1],...s,vx:0,vz:0,vy:0,dx:0,dz:0,yaw:kind==='solo'?Math.atan2(s.x,s.z):i<6?Math.PI:0,pitch:0,hp:4,inventory:[this.mode==='lobby'?1:ids[i]],slot:0,cool:0,freeze:0,burn:null,float:0,realm:0,returnAt:0,spawn:{...s},respawn:0,team:kind==='solo'?i:i<6?0:1,windNext:true,climb:false,aiAt:0,path:[],age:0});}
 }
 get player(){return this.actors?.[0]};weapon(a){return a.realm?3:a.inventory[a.slot]??null;}
 event(text){this.events.push({text,t:this.time});if(this.events.length>4)this.events.shift();}
 damage(a,n,from){if(a.hp<=0)return;a.hp=Math.max(0,a.hp-n);if(!a.hp){a.respawn=this.mode==='lobby'?this.time+2.5:0;a.burn=null;this.event(`${a.name} är utslagen${from?' av '+from.name:''}`);}}
 hit(a,b,id){if(b.hp<=0||a.realm!==b.realm)return;const w=WEAPONS[id];
  if(id===3&&!a.realm){this.duel(a,b);return;}
  if(id===5){if(!b.burn)b.burn={next:this.time+.5,left:10,from:a.id};return;}
  this.damage(b,id===3?1:w.damage,a);if(id===7)b.freeze=this.time+5;
 }
 duel(a,b){if(a.realm||b.realm)return;const id=++this.serial;const cx=500+id*50;const r={id,cx,until:this.time+5,actors:[a.id,b.id]};this.realms.push(r);
  for(const [i,e] of [a,b].entries()){e.saved={x:e.x,y:e.y,z:e.z,yaw:e.yaw,pitch:e.pitch};e.realm=id;e.x=cx;e.z=i===0?6:-6;e.y=0;e.vx=e.vz=e.vy=0;e.cool=.25;e.yaw=i===0?0:Math.PI;e.pitch=0;e.path=[];}this.event('Lila duellen! Bara Skooker — fem sekunder.');
 }
 nearHotel(a){return this.world.buildings.find(b=>b.hotel&&Math.abs(a.x-b.x)<b.sx/2+1.4&&Math.abs(a.z-b.z)<b.sz/2+1.4&& (Math.abs(a.x-b.x)>b.sx/2-.6||Math.abs(a.z-b.z)>b.sz/2-.6)&&a.y<b.h+.55);}
 fire(a,dir){if(!a||a.hp<=0||a.cool>1e-6||a.freeze>this.time||this.paused||!['lobby','match'].includes(this.mode))return false;const id=this.weapon(a);if(id===null)return false;const w=WEAPONS[id];a.cool=w.cool;
  const d=dir||{x:-Math.sin(a.yaw)*Math.cos(a.pitch),y:Math.sin(a.pitch),z:-Math.cos(a.yaw)*Math.cos(a.pitch)};
  if(id===8)a.vy=16;
  if(id===10&&Math.hypot(a.dx,a.dz)>.1){const m=Math.hypot(a.dx,a.dz);const hotel=this.nearHotel(a);a.vx=a.dx/m*(hotel?5:33);a.vz=a.dz/m*(hotel?5:33);a.vy=hotel?7:10;a.climb=!!hotel;}
  if(id===9&&a.windNext){a.windNext=false;for(const b of this.actors){if(b===a||b.hp<=0||b.realm!==a.realm||this.kind!=='solo'&&b.team===a.team)continue;const dx=b.x-a.x,dz=b.z-a.z,range=Math.hypot(dx,dz);if(range<25&&(dx*d.x+dz*d.z)/Math.max(.1,range)>.45&&this.visible(a,b)){b.vy=13;b.float=this.time+6;}}
   this.effects.push({type:'wind',x:a.x+d.x*8,y:a.y+2,z:a.z+d.z*8,t:1,color:w.color});return true;
  }
  if(id===9)a.windNext=true;
  const count=id===5?9:1;for(let i=0;i<count;i++){const spread=id===5?(i-4)*.095:0;const dx=d.x*Math.cos(spread)-d.z*Math.sin(spread),dz=d.z*Math.cos(spread)+d.x*Math.sin(spread);
   this.projectiles.push({uid:++this.serial,owner:a.id,weapon:id,realm:a.realm,x:a.x+dx*.72,y:a.y+1.35,z:a.z+dz*.72,vx:dx*w.speed,vy:d.y*w.speed,vz:dz*w.speed,life:id===5?.38:id===9?3:4,bounces:0,radius:id===11?.5:id===9?.8:.12});}
  return true;
 }
 visible(a,b){const dx=b.x-a.x,dz=b.z-a.z,dy=b.y-a.y,n=Math.ceil(Math.hypot(dx,dz)*2);for(let i=1;i<n;i++){const t=i/n;if(this.pointWall(a.x+dx*t,a.y+1.3+dy*t,a.z+dz*t))return false;}return true;}
 pointWall(x,y,z,pad=0){return this.world.boxes.find(b=>!(b.type==='gate'&&b.open)&&Math.abs(x-b.x)<b.sx/2+pad&&Math.abs(y-b.y)<b.sy/2+pad&&Math.abs(z-b.z)<b.sz/2+pad);}
 explode(p){this.effects.push({type:'blast',x:p.x,y:p.y,z:p.z,t:.65,color:0xffc260});const a=this.actors[p.owner];for(const b of this.actors)if(b.hp>0&&b.realm===p.realm&&b.id!==p.owner&&(this.kind==='solo'||b.team!==a.team)&&Math.hypot(b.x-p.x,b.z-p.z,b.y+1-p.y)<6)this.damage(b,2,a);}
 interact(a=this.player){if(!a||a.hp<=0||a.realm)return false;
  if(this.mode==='lobby'&&a.id===0&&Math.hypot(a.x,a.z)<3){this.start('solo',true);this.event('Matchen är igång! Hitta vapen i hus och hotell.');return true;}
  const gate=this.world.gates.find(g=>dist(a,g)<7);if(gate){if(gate.open&&this.actors.some(b=>b.hp>0&&inRect(b.x,b.z,gate,.7)))return false;gate.open=!gate.open;this.event(gate.open?'Porten öppnades':'Porten stängdes');return true;}
  if(this.nearPotion(a))return this.drink(a);
  return this.pickup(a);
 }
 nearPotion(a=this.player){if(!a||a.id!==0||a.hp<=0||a.realm||this.kind!=='solo'||this.paused||!['lobby','match'].includes(this.mode))return null;return this.potions.find(p=>dist(a,p)<1.9&&Math.abs(a.y+.65-p.y)<1&&this.visible(a,{...p,y:p.y-.65}));}
 drink(a=this.player){const potion=this.nearPotion(a);if(!potion)return false;if(a.hp>=4){this.event('Du har redan alla fyra hjärtan! Drycken finns kvar.');return false;}a.hp=4;this.potions.splice(this.potions.indexOf(potion),1);this.event('Du drack en helardryck! ♥ Alla fyra hjärtan tillbaka.');return true;}
 pickup(a=this.player){if(a.id!==0||a.realm||a.hp<=0||this.mode!=='match')return false;const item=this.loot.find(l=>dist(a,l)<2.8&&Math.abs(a.y+.5-l.y)<2);if(!item)return false;if(a.inventory.length>=3){this.event('Tre vapen! Släpp ett först.');return false;}a.inventory.push(item.id);a.slot=a.inventory.length-1;this.loot.splice(this.loot.indexOf(item),1);return true;}
 drop(a=this.player){if(a.id!==0||a.realm||a.hp<=0||this.mode!=='match'||!a.inventory.length)return false;const id=a.inventory.splice(a.slot,1)[0];this.loot.push({uid:++this.serial,id,x:a.x,y:a.y+.5,z:a.z});a.slot=Math.min(a.slot,Math.max(0,a.inventory.length-1));return true;}
 select(slot){if(this.player&&!this.player.realm&&slot<this.player.inventory.length)this.player.slot=slot;}
 jump(a=this.player){if(!a||a.hp<=0||a.freeze>this.time)return;const ground=a.realm?0:floorAt(this.world,a.x,a.z,a.y);if(a.y<=ground+.12)a.vy=8.5;}
 move(a,dt,jump=false){if(a.freeze>this.time){a.vx=a.vz=a.vy=0;return;}const speed=6.2;let mx=(a.dx*speed+a.vx)*dt,mz=(a.dz*speed+a.vz)*dt;
  if(a.realm){const r=this.realms.find(r=>r.id===a.realm);a.x=clamp(a.x+mx,r.cx-10,r.cx+10);a.z=clamp(a.z+mz,-10,10);}else{
   const sub=Math.max(1,Math.ceil(Math.hypot(mx,mz)/.22));for(let i=0;i<sub;i++){const nx=clamp(a.x+mx/sub,-this.world.size+.7,this.world.size-.7),nz=clamp(a.z+mz/sub,-this.world.size+.7,this.world.size-.7);const fx=floorAt(this.world,nx,a.z,a.y),fz=floorAt(this.world,a.x,nz,a.y);if(!collides(this.world,nx,Math.max(a.y,fx),a.z)){a.x=nx;if(fx>a.y&&fx-a.y<.65)a.y=fx;}if(!collides(this.world,a.x,Math.max(a.y,fz),nz)){a.z=nz;if(fz>a.y&&fz-a.y<.65)a.y=fz;}}
  }
  const hotel=this.weapon(a)===10&&this.nearHotel(a);if(hotel&&jump){a.climb=true;a.vy=4.5;}else a.climb=false;
  a.vx*=Math.exp(-1.4*dt);a.vz*=Math.exp(-1.4*dt);const floating=a.float>this.time;a.vy-=(floating?4:22)*dt;if(floating)a.vy=Math.max(-2.2,a.vy);
  const ny=a.y+a.vy*dt;if(!a.realm&&a.vy>0&&collides(this.world,a.x,ny,a.z)&&!a.climb){a.vy=0;}else a.y=ny;
  const ground=a.realm?0:floorAt(this.world,a.x,a.z,Math.max(a.y,ny)+Math.abs(a.vy*dt));if(a.y<=ground){a.y=ground;a.vy=0;}
  if(a.y< -10){if(this.mode==='lobby'){a.hp=0;a.respawn=this.time+.5;}else this.damage(a,4);}
 }
 // Grid route uses the same collision/floor model as actual actors, including physical stairs.
 route(a,target){if(a.realm)return [{x:target.x,z:target.z}];const grid=2,limit=this.world.size;const snap=v=>Math.round(v/grid);const sx=snap(a.x),sz=snap(a.z),gx=snap(target.x),gz=snap(target.z);const key=(x,z,y)=>`${x},${z},${Math.round(y/2)}`;let open=[{x:sx,z:sz,y:a.y,g:0,f:0,parent:null}],seen=new Map();let best=open[0],iterations=0;
  while(open.length&&iterations++<2300){open.sort((a,b)=>a.f-b.f);const n=open.shift();if(Math.hypot(n.x-gx,n.z-gz)<1.5&&Math.abs(n.y-target.y)<1.5){best=n;break;}if(Math.hypot(n.x-gx,n.z-gz)+Math.abs(n.y-target.y)*2<Math.hypot(best.x-gx,best.z-gz)+Math.abs(best.y-target.y)*2)best=n;
   for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n.x+dx,z=n.z+dz;if(Math.abs(x*grid)>limit-1||Math.abs(z*grid)>limit-1)continue;const y=floorAt(this.world,x*grid,z*grid,n.y+.4);if(y< -5||Math.abs(y-n.y)>1.25)continue;const block=collides(this.world,x*grid,y,z*grid,.55);if(block&&block.type!=='gate')continue;let blocked=false;for(let t=.25;t<1;t+=.25){const b=collides(this.world,(n.x+dx*t)*grid,n.y+(y-n.y)*t,(n.z+dz*t)*grid,.5);if(b&&b.type!=='gate'){blocked=true;break;}}if(blocked)continue;
    const k=key(x,z,y),g=n.g+Math.hypot(dx,dz)+(block?2:0);if((seen.get(k)??Infinity)<=g)continue;seen.set(k,g);open.push({x,z,y,g,f:g+Math.hypot(x-gx,z-gz)+Math.abs(y-target.y),parent:n});}
  }const path=[];while(best?.parent){path.unshift({x:best.x*grid,z:best.z*grid,y:best.y});best=best.parent;}return path;
 }
 bot(a,dt){if(a.hp<=0||a.freeze>this.time)return;const targets=this.actors.filter(b=>b!==a&&b.hp>0&&a.realm===b.realm&&(this.mode==='lobby'||this.kind==='solo'||b.team!==a.team));targets.sort((b,c)=>dist(a,b)-dist(a,c));const target=targets[0];if(!target)return;
  const d=dist(a,target),visible=this.visible(a,target),id=this.weapon(a);const range=id===5?9:id===9?21:36;
  if(this.time>a.aiAt){a.aiAt=this.time+.7+this.random()*.5;if(!visible||d>range*.8)a.path=this.route(a,target);else a.path=[];}
  let dx=0,dz=0;if(a.path.length){const n=a.path[0];dx=n.x-a.x;dz=n.z-a.z;if(Math.hypot(dx,dz)<1.2)a.path.shift();}
  else if(d>range*.65){dx=target.x-a.x;dz=target.z-a.z;}else{dx=Math.cos(this.time*.6+a.id)*.6;dz=Math.sin(this.time*.6+a.id)*.6;}
  const len=Math.hypot(dx,dz);a.dx=len>.1?dx/Math.max(1,len):0;a.dz=len>.1?dz/Math.max(1,len):0;
  for(const gate of this.world.gates)if(!gate.open&&dist(a,gate)<5){gate.open=true;}
  const aim={x:target.x-a.x,y:target.y-a.y,z:target.z-a.z},mag=Math.hypot(aim.x,aim.y,aim.z);for(const k of ['x','y','z'])aim[k]/=Math.max(.1,mag);
  a.yaw=Math.atan2(-aim.x,-aim.z);a.pitch=Math.asin(aim.y);
  if(d<range&&(visible||id===2)&&this.time>a.age+1.5){const error=(this.random()-.5)*(this.mode==='lobby'?.23:.13);aim.x+=error;aim.z+=(this.random()-.5)*.13;this.fire(a,aim);}
  const climb=id===10&&!!this.nearHotel(a);this.move(a,dt,climb);
 }
 update(dt,input={}){if(this.paused||!['lobby','match'].includes(this.mode))return;this.time+=dt;
  for(const r of [...this.realms])if(this.time+1e-8>=r.until){for(const id of r.actors){const a=this.actors[id];Object.assign(a,a.saved);a.realm=0;a.vx=a.vz=a.vy=0;a.path=[];a.cool=Math.max(.25,a.cool);}this.projectiles=this.projectiles.filter(p=>p.realm!==r.id);this.realms.splice(this.realms.indexOf(r),1);}
  for(const a of this.actors){a.cool=Math.max(0,a.cool-dt);if(a.burn){while(a.burn&&this.time+1e-8>=a.burn.next){const b=a.burn;this.damage(a,.25,this.actors[b.from]);b.left--;b.next+=.5;if(b.left===0)a.burn=null;}}
   if(a.hp<=0&&a.respawn&&this.time>=a.respawn){if(a.realm)continue;Object.assign(a,a.spawn);a.hp=4;a.freeze=0;a.burn=null;a.respawn=0;a.vy=a.vx=a.vz=0;a.age=this.time;}
  }
  const p=this.player;if(p.hp>0){const f=input.forward||0,s=input.side||0,n=Math.max(1,Math.hypot(f,s));p.dx=(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)/n;p.dz=(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)/n;if(input.jump)this.jump(p);if(input.fire)this.fire(p);this.move(p,dt,input.jump);}
  for(const a of this.actors.slice(1)){if(this.noAI){if(a.hp>0)this.move(a,dt);}else this.bot(a,dt);}
  for(const p of [...this.projectiles]){p.life-=dt;let dead=false;const steps=Math.max(1,Math.ceil(Math.hypot(p.vx,p.vy,p.vz)*dt/.28));for(let i=0;i<steps&&!dead;i++){
    const ox=p.x,oy=p.y,oz=p.z;p.x+=p.vx*dt/steps;p.y+=p.vy*dt/steps;p.z+=p.vz*dt/steps;
    const wall=p.weapon===2||p.realm?null:this.pointWall(p.x,p.y,p.z,p.weapon===11?.4:0);
    if(wall){if(p.weapon===6&&p.bounces===0){p.bounces++;const crossX=Math.abs(ox-wall.x)>=wall.sx/2,crossZ=Math.abs(oz-wall.z)>=wall.sz/2;if(crossX)p.vx*=-1;else if(crossZ)p.vz*=-1;else p.vy*=-1;p.x=ox;p.y=oy;p.z=oz;}else dead=true;}
    if(p.y<(p.realm?0:floorAt(this.world,p.x,p.z,p.y))-.01)dead=true;
    if(!dead)for(const b of this.actors){const a=this.actors[p.owner];if(b.id===p.owner||b.hp<=0||b.realm!==p.realm||this.mode!=='lobby'&&this.kind!=='solo'&&b.team===a.team)continue;
     if(Math.hypot(b.x-p.x,b.z-p.z)<.48+p.radius&&p.y>b.y-.2&&p.y<b.y+1.9){if(p.weapon!==11)this.hit(a,b,p.weapon);dead=true;break;}}
   }if(p.life<=0)dead=true;if(dead){if(p.weapon===11)this.explode(p);const at=this.projectiles.indexOf(p);if(at>=0)this.projectiles.splice(at,1);}
  }
  this.effects=this.effects.filter(e=>(e.t-=dt)>0);
  if(this.mode==='match'){const alive=this.actors.filter(a=>a.hp>0);if(this.kind==='solo'){if(p.hp<=0){this.result='Du blev utslagen. Försök igen!';this.mode='result';}else if(alive.length===1){this.result='Du vann! Sist kvar i världen.';this.mode='result';}}else {const teams=new Set(alive.map(a=>a.team));if(teams.size<2){this.result=teams.has(0)?'Ditt lag vann!':'Det andra laget vann. Försök igen!';this.mode='result';}}}
 }
 text(){return {revision:'20261011-3',mode:this.mode,kind:this.kind,time:+this.time.toFixed(2),paused:this.paused,result:this.result,axes:'x east, z south; y feet height; yaw 0 north (-z)',player:this.player,actors:this.actors,projectiles:this.projectiles,loot:this.loot,potions:this.potions,realms:this.realms,gates:this.world?.gates,button:this.world?.button};}
}
