export const VERSION='20260923-1', CELL=3;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const pos=(x,z)=>({x:x*CELL,z:z*CELL});
export function makeLevel(id){
 const l={id,cells:new Set(),doors:[],guards:[],items:[],traps:[],portals:[],props:[],spawn:{...pos(9,7),yaw:Math.PI},name:'Grottan'};
 const rect=(x1,z1,x2,z2)=>{for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)l.cells.add(`${x},${z}`)};
 const prop=(type,x,z,extra={})=>l.props.push({type,...pos(x,z),...extra});
 const door=(id,x,z,axis,kind)=>l.doors.push({id,...pos(x,z),axis,kind,open:false});
 const guard=(id,x,z,yaw=0,boss=false)=>l.guards.push({id,...pos(x,z),home:pos(x,z),yaw,hp:boss?100:30,maxHp:boss?100:30,boss,alert:false,cooldown:0,flash:0});
 const item=(id,x,z,type='key')=>l.items.push({id,...pos(x,z),type,taken:false});
 if(id==='home'){
  rect(1,5,17,17);rect(8,2,10,5);l.spawn={...pos(9,4),yaw:Math.PI};
  prop('fire',9,3);prop('map',7,5);prop('sleep',9,2.5);prop('build',11.5,6);prop('mountain',9,0);
 }else if(id==='outside'){
  l.name='Det höga tornet';rect(2,2,9,10);l.spawn={...pos(5,9),yaw:0};
  door('entrance',5,2,'x','entrance');item('entrance',8,3);prop('boulder',7.6,4);prop('home',5,10);prop('tower',5,-1);
 }else if(id==='floor1'){
  l.name='Tornet · våning 1';l.spawn={...pos(12,25),yaw:0};rect(11,23,13,26);rect(10,18,14,22);
  rect(6,20,9,20);rect(6,10,6,20);door('left',9,20,'z','plain');guard('stairs1',6,15,Math.PI);prop('stairs',6,10,{target:'floor2',key:'key1',guards:['stairs1']});
  rect(15,20,16,20);rect(17,18,19,22);door('return1',15,20,'z','return');
  rect(18,10,18,17);guard('portal1',18,14,Math.PI);l.portals.push({id:'source1',...pos(18,10),target:pos(12,20),key:'key1',guards:['portal1']},{id:'arrival1',...pos(12,21),target:pos(18,10),key:'key1',guards:['portal1']});
  rect(20,20,23,20);rect(23,14,23,20);rect(20,14,28,14);rect(28,14,28,17);rect(26,17,28,17);rect(20,12,20,14);rect(28,11,28,13);rect(29,17,30,17);item('key1',26,17);
  prop('exit',12,26,{target:'outside'});prop('coat',11,24);prop('coat',13,24);
 }else if(id==='floor2'){
  l.name='Tornet · våning 2';l.spawn={...pos(12,23),yaw:0};rect(10,21,14,24);rect(12,5,12,20);rect(10,5,14,7);
  guard('stairs2a',12,17,Math.PI);guard('stairs2b',12,12,Math.PI);guard('stairs2c',12,8,Math.PI);prop('stairs',12,5,{target:'floor3',key:'key2',guards:['stairs2a','stairs2b','stairs2c']});
  rect(15,23,25,23);door('return2',15,23,'z','return');for(const x of [18,21,24])l.traps.push({...pos(x,23),cooldown:0,flash:0});
  rect(26,20,29,24);rect(27,14,27,19);guard('keyguard',27,17,Math.PI);item('key2',27,14);
  rect(30,22,35,22);rect(35,15,35,21);guard('portal2a',33,22,-Math.PI/2);guard('portal2b',35,18,Math.PI);
  l.portals.push({id:'source2',...pos(35,15),target:pos(12,23),key:'key2',guards:['portal2a','portal2b']},{id:'arrival2',...pos(11,23),target:pos(35,15),key:'key2',guards:['portal2a','portal2b']});
  prop('exit',12,24,{target:'floor1'});
 }else{
  l.name='Tornet · högsta våningen';l.spawn={...pos(10,18),yaw:0};rect(3,3,17,19);guard('boss',10,8,Math.PI,true);prop('table',10,4);item('reward',10,4,'reward');prop('exit',10,19,{target:'floor2'});
 }
 return l;
}
export class Game{
 constructor(saved){this.time=0;this.dayTime=saved?.dayTime||0;this.hp=50;this.lastDamage=-99;this.keys=new Set();this.ability=!!saved?.ability;this.trophy=!!saved?.trophy;this.built=!!saved?.built;this.mode='menu';this.notice='';this.noticeUntil=0;this.shots=[];this.shotCooldown=0;this.sleeping=0;this.deaths=0;this.visit={};this.load('home');
  if(saved?.world&&saved?.place&&saved.hp>0){for(const[id,record]of Object.entries(saved.world)){if(!['home','outside','floor1','floor2','floor3'].includes(id))continue;const level=makeLevel(id);for(const category of['guards','doors','items'])for(const o of level[category]){const old=record[category]?.find(v=>v.id===o.id);if(old)Object.assign(o,old)}this.visit[id]=level;}if(this.visit[saved.place]){this.load(saved.place);if(saved.player)Object.assign(this.player,saved.player);this.hp=saved.hp;this.keys=new Set(saved.keys||[]);this.lastDamage=0;}}
 }
 save(){const world={};for(const[id,l]of Object.entries(this.visit))world[id]={guards:l.guards.map(({id,x,z,yaw,hp,alert})=>({id,x,z,yaw,hp,alert})),doors:l.doors.map(({id,open})=>({id,open})),items:l.items.map(({id,taken})=>({id,taken}))};return{ability:this.ability,trophy:this.trophy,built:this.built,dayTime:this.dayTime,hp:this.hp,place:this.level.id,player:{...this.player,vy:0},keys:[...this.keys],world}}

 message(s){this.notice=s;this.noticeUntil=this.time+4;}
 load(id){this.level=this.visit[id]||(this.visit[id]=makeLevel(id));this.player={...this.level.spawn,y:1.65,pitch:0,vy:0};this.shots=[];this.context=null;this.notice='';this.noticeUntil=0;this.changed=true;}
 travel(id){if(id==='outside'){this.visit={};this.keys.clear()}this.load(id);this.mode='play';this.message(id==='outside'?'Hitta nyckeln till tornets dörr.':'Hemma igen.');}
 solid(x,z){const gx=Math.round(x/CELL),gz=Math.round(z/CELL);if(!this.level.cells.has(`${gx},${gz}`))return true;return this.level.doors.some(d=>!d.open&&(d.axis==='x'?Math.abs(x-d.x)<1.65&&Math.abs(z-d.z)<.26:Math.abs(z-d.z)<1.65&&Math.abs(x-d.x)<.26));}
 canStand(x,z,r=.32){return [[0,0],[-r,0],[r,0],[0,-r],[0,r],[-r,-r],[r,-r],[-r,r],[r,r]].every(([a,b])=>!this.solid(x+a,z+b));}
 lineClear(a,b){const n=Math.ceil(distance(a,b)/.35);for(let i=1;i<n;i++)if(this.solid(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;}
 move(entity,dx,dz){if(this.canStand(entity.x+dx,entity.z))entity.x+=dx;if(this.canStand(entity.x,entity.z+dz))entity.z+=dz;}
 damage(n){if(this.mode!=='play')return;this.hp=Math.max(0,this.hp-n);this.lastDamage=this.time;this.hitFlash=.5;if(this.hp===0){this.deaths++;this.ability=false;this.trophy=false;this.built=false;this.keys.clear();this.visit={};this.dayTime=0;this.load('home');this.mode='dead';this.changed=true;}}
 attack(){if(this.mode!=='play'||this.shotCooldown>0)return;const p=this.player;this.shotCooldown=.32;this.shots.push({x:p.x,y:p.y-.1,z:p.z,dx:-Math.sin(p.yaw)*Math.cos(p.pitch),dy:Math.sin(p.pitch),dz:-Math.cos(p.yaw)*Math.cos(p.pitch),ttl:1.8});}
 nearWall(){const p=this.player;return[-.55,0,.55].some(a=>this.solid(p.x-Math.sin(p.yaw+a)*1,p.z-Math.cos(p.yaw+a)*1));}
 jump(){if(this.mode==='play'&&this.player.y<=1.66)this.player.vy=5.5;}
 chaseStep(g){
  const key=o=>`${Math.round(o.x/CELL)},${Math.round(o.z/CELL)}`,start=key(g),goal=key(this.player),queue=[start],prev=new Map([[start,null]]);
  for(let i=0;i<queue.length;i++){const k=queue[i];if(k===goal){let next=k;while(prev.get(next)&&prev.get(next)!==start)next=prev.get(next);const[x,z]=next.split(',').map(Number);return{x:x*CELL,z:z*CELL};}const[x,z]=k.split(',').map(Number);for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const next=`${x+dx},${z+dz}`;if(!prev.has(next)&&this.canStand((x+dx)*CELL,(z+dz)*CELL)){prev.set(next,k);queue.push(next)}}}return null;
 }
 remaining(ids){return this.level.guards.some(g=>ids?.includes(g.id)&&g.hp>0)}
 interact(){if(this.mode!=='play')return;const c=this.context;if(!c)return;const o=c.obj;
  if(c.type==='door'){
   if(o.kind==='entrance'){if(!this.keys.has('entrance'))return this.message('Dörren är låst. Leta till höger om tornet.');this.load('floor1');return;}
   if(o.kind==='return'&&this.keys.has(this.level.id==='floor1'?'key1':'key2'))return this.message('Dörren har låsts. Hitta portalen!');
   o.open=true;if(o.id==='left'){const g=this.level.guards.find(g=>g.id==='stairs1');g.alert=true;}this.changed=true;
  }else if(c.type==='item'){
   if(o.type==='reward'){if(this.remaining(['boss']))return this.message('Besegra bossen först!');o.taken=true;this.ability=true;this.trophy=true;this.mode='reward';this.changed=true;return;}
   if(o.id==='key2'&&this.remaining(['keyguard']))return this.message('Besegra vakten som skyddar nyckeln.');o.taken=true;this.keys.add(o.id);if(o.id!=='entrance'){this.level.doors.filter(d=>d.kind==='return').forEach(d=>d.open=false);this.message('Nyckeln är din! Returvägen låses. Hitta portalen.')}else this.message('Du hittade dörrnyckeln!');this.changed=true;
  }else if(c.type==='portal'){
   if(this.remaining(o.guards))return this.message('Besegra portalens vakter först.');Object.assign(this.player,o.target,{yaw:0,y:1.65,pitch:0});this.message('Tillbaka genom portalen!');
  }else if(o.type==='map')this.mode='map';
  else if(o.type==='sleep'){this.sleeping=2;this.mode='sleep';}
  else if(o.type==='build'){if(!this.trophy)return this.message('Hämta tornets pris först.');this.built=true;this.trophy=false;this.changed=true;this.message('Tornets stjärna står nu vid din grotta!');}
  else if(o.type==='stairs'){if(!this.keys.has(o.key))return this.message('Trappan är låst. Hitta nyckeln.');if(this.remaining(o.guards))return this.message('Besegra vakterna framför trappan.');this.load(o.target);}
  else if(o.type==='home')this.travel('home');
  else if(o.type==='exit')this.load(o.target);
 }
 findContext(){const p=this.player,candidates=[];const add=(type,obj,label,max=3.7)=>{const d=distance(p,obj);if(d<max&&this.lineClear(p,obj))candidates.push({type,obj,label,d})};
  for(const d of this.level.doors)if(!d.open)add('door',d,d.kind==='entrance'?'Lås upp tornet':d.kind==='return'&&this.keys.has(this.level.id==='floor1'?'key1':'key2')?'Låst dörr':'Öppna dörr');
  for(const i of this.level.items)if(!i.taken)add('item',i,i.type==='reward'?'Ta klätterförmågan':'Ta nyckeln',3.1);
  for(const p of this.level.portals)if(this.keys.has(p.key))add('portal',p,'Gå genom portalen',2.5);
  for(const o of this.level.props){const labels={map:'Titta på kartan',sleep:'Sov · 2 sekunder',build:this.built?'Stjärnan är byggd':'Bygg tornets pris',stairs:'Gå upp till nästa våning',home:'Till grottan',exit:'Gå tillbaka'};if(labels[o.type]&&!(o.type==='build'&&this.built))add('prop',o,labels[o.type],o.type==='sleep'?2.4:3.5)}
  this.context=candidates.sort((a,b)=>a.d-b.d)[0]||null;
 }
 update(dt,input={}){
  if(this.mode==='sleep'){this.sleeping-=dt;if(this.sleeping<=0){this.dayTime=0;this.mode='play';this.message('God morgon!')}return;}
  if(this.mode!=='play')return;dt=Math.min(dt,.05);this.time+=dt;this.dayTime=(this.dayTime+dt)%120;this.shotCooldown=Math.max(0,this.shotCooldown-dt);this.hitFlash=Math.max(0,(this.hitFlash||0)-dt);
  if(this.hp<50&&this.time-this.lastDamage>=3)this.hp=50;
  const p=this.player;const forward=input.forward||0,side=input.side||0,len=Math.max(1,Math.hypot(forward,side));
  this.move(p,(-Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side)*5.8*dt/len,(-Math.cos(p.yaw)*forward-Math.sin(p.yaw)*side)*5.8*dt/len);
  this.climbing=!!(input.attack&&this.ability&&this.nearWall());
  if(this.climbing){p.y=Math.min(6.6,p.y+3*dt);p.vy=0;}else{p.vy-=14*dt;p.y=Math.max(1.65,p.y+p.vy*dt);if(p.y===1.65)p.vy=0;if(input.attack)this.attack();}
  for(const t of this.level.traps){t.cooldown=Math.max(0,t.cooldown-dt);t.flash=Math.max(0,t.flash-dt);const inside=distance(t,p)<1.1&&p.y<2.6,entered=inside&&!t.inside;t.inside=inside;if(entered&&t.cooldown===0){t.cooldown=1.3;t.flash=.3;this.damage(20);if(this.mode==='dead')return;this.message('Pilfälla! Vila 3 sekunder för fullt liv.')}}
  for(const g of this.level.guards){if(g.hp<=0)continue;g.flash=Math.max(0,g.flash-dt);g.cooldown=Math.max(0,g.cooldown-dt);const dist=distance(g,p),dx=p.x-g.x,dz=p.z-g.z;
   const front=(-Math.sin(g.yaw)*dx-Math.cos(g.yaw)*dz)/Math.max(.01,dist);
   if(dist<(g.boss?23:13)&&front>-.15&&this.lineClear(g,p))g.alert=true;
   if(g.alert){
    const visible=this.lineClear(g,p);let target=p;if(!visible){g.pathTimer=(g.pathTimer||0)-dt;if(g.pathTimer<=0){g.waypoint=this.chaseStep(g);g.pathTimer=.4;}target=g.waypoint;}if(target){const tx=target.x-g.x,tz=target.z-g.z,td=Math.hypot(tx,tz);g.yaw=Math.atan2(-tx,-tz);if(td>.08&&(!visible||dist>1.9))this.move(g,tx/td*(g.boss?3.2:2.9)*dt,tz/td*(g.boss?3.2:2.9)*dt);}
    if(visible&&dist<2.25&&p.y<3.2&&g.cooldown===0){g.cooldown=g.boss?.85:1.05;this.damage(10);if(this.mode==='dead')return;}
   }
  }
  for(const s of this.shots){s.ttl-=dt;const steps=4;for(let j=0;j<steps&&s.ttl>0;j++){s.x+=s.dx*30*dt/steps;s.y+=s.dy*30*dt/steps;s.z+=s.dz*30*dt/steps;if(this.solid(s.x,s.z)||s.y<0||s.y>7){s.ttl=0;break;}for(const g of this.level.guards){if(g.hp<=0||distance(s,g)>(g.boss?1.2:.7)||s.y>(g.boss?3.8:2.8))continue;const dx=s.dx,dz=s.dz;const back=dx*(-Math.sin(g.yaw))+dz*(-Math.cos(g.yaw))>.45;g.hp=Math.max(0,g.hp-(g.boss?10:back?30:10));g.flash=.15;g.alert=true;s.ttl=0;if(g.hp===0)this.message(g.boss?'Bossen är besegrad! Priset väntar på bordet.':'Vakten är besegrad.');break;}}}
  this.shots=this.shots.filter(s=>s.ttl>0);this.findContext();
 }
 text(){return JSON.stringify({version:VERSION,mode:this.mode,place:this.level.id,coordinates:'world metres; +x east/right, +z south; yaw 0 looks north (-z)',player:this.player,hp:this.hp,healIn:this.hp<50?Math.max(0,3-(this.time-this.lastDamage)):0,day:this.dayTime<60?'day':'night',keys:[...this.keys],ability:this.ability,built:this.built,trophy:this.trophy,climbing:this.climbing,interact:this.context?.label,guards:this.level.guards.map(({id,x,z,yaw,hp,alert})=>({id,x,z,yaw,hp,alert})),doors:this.level.doors,items:this.level.items,portals:this.level.portals.filter(p=>this.keys.has(p.key)),traps:this.level.traps,shots:this.shots.length,notice:this.time<this.noticeUntil?this.notice:''});}
}
