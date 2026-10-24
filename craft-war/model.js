export const TYPES={
 pistol:{label:'Laserpistol',cost:20,hp:50,damage:20,range:210,rate:.75,color:'#6eeaff',size:13},
 long:{label:'Lång laserpistol',cost:60,hp:70,damage:50,range:250,rate:1.05,color:'#38c2ff',size:14},
 sword:{label:'Lasersvärd',cost:120,hp:100,damage:70,range:28,rate:.85,color:'#9dff77',size:15},
 special:{label:'Hoppsvärd',cost:160,hp:130,damage:70,range:28,rate:.9,color:'#e4a5ff',size:15},
 captain:{label:'Kapten',cost:0,hp:200,damage:100,range:32,rate:.95,color:'#ffe478',size:18},
 wall:{label:'Mur',cost:10,hp:100,size:38},tower:{label:'Lasertorn',cost:60,hp:100,size:44},box:{label:'Låda',cost:40,hp:Infinity,size:38},house:{label:'Huvudhus',cost:0,hp:100,size:88}
};
export const TEAM_COLORS=['#42d9ff','#ff8a71','#d9a4ff','#ffd76a','#a4ef84'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unitTypes=['pistol','long','sword','special','captain'];
export class Game{
 constructor(saved){this.seq=0;this.mode='home';this.time=0;this.round=0;this.money=50;this.home=[];this.entities=[];this.bullets=[];this.effects=[];this.control=null;this.result=null;this.order=null;this.width=1000;this.height=800;this.noAI=false;
  if(saved&&saved.version===1&&Number.isFinite(saved.money)&&Array.isArray(saved.home)){this.money=clamp(saved.money,0,9999999);this.home=saved.home.filter(e=>TYPES[e.type]).map(e=>this.make(e.type,0,clamp(e.x,35,965),clamp(e.y,35,765)));}
  if(!this.home.some(e=>e.type==='house'))this.home.push(this.make('house',0,500,320));
  if(!this.home.some(e=>e.type==='captain'))this.home.push(this.make('captain',0,500,430));
  this.entities=this.home;this.message='Bygg din by och välj en vakt genom att trycka på den.';
 }
 make(type,team,x,y){const t=TYPES[type];return {id:++this.seq,type,team,x,y,hp:t.hp,maxHp:t.hp,unit:unitTypes.includes(type),r:t.size/2,cool:0,angle:-Math.PI/2,age:0,hold:false,order:null,path:[],pathNext:0,jump:0};}
 get player(){return this.entities.find(e=>e.id===this.control&&e.hp>0)||null;}
 get budget(){return this.mode==='war-build'?this.warMoney:this.money;}
 get canBuild(){return this.mode==='home'||this.mode==='war-build';}
 save(){return {version:1,money:this.money,home:this.home.map(e=>({type:e.type,x:e.x,y:e.y}))};}
 boxCount(team=0){return this.entities.filter(e=>e.team===team&&e.type==='box').length;}
 inBuildArea(x,y){if(this.mode==='war-build')return Math.hypot(x-this.centers[0].x,y-this.centers[0].y)<250;return x>30&&x<this.width-30&&y>30&&y<this.height-30;}
 place(type,x,y){const t=TYPES[type];if(!t||!this.canBuild||type==='house'||type==='captain')return {ok:false,why:'Du kan inte bygga nu.'};
  if(this.budget<t.cost)return {ok:false,why:'Du behöver mer pengar.'};
  if(type==='box'&&this.boxCount()>=10)return {ok:false,why:'Högst 10 lådor i byn.'};
  if(!this.inBuildArea(x,y))return {ok:false,why:'Placera i din bys byggområde.'};
  const e=this.make(type,0,x,y);if(this.entities.some(o=>o.hp>0&&(e.unit||o.unit?distance(e,o)<(e.unit?e.r: t.size*.65)+(o.unit?o.r:TYPES[o.type].size*.65)+8:Math.abs(e.x-o.x)<(t.size+TYPES[o.type].size)/2+3&&Math.abs(e.y-o.y)<(t.size+TYPES[o.type].size)/2+3)))return {ok:false,why:'Här är det redan upptaget.'};
  if(this.mode==='war-build')this.warMoney-=t.cost;else this.money-=t.cost;this.entities.push(e);this.message=t.label+' placerad!';return {ok:true,id:e.id};
 }
 moveBuilding(id,x,y){if(!this.canBuild)return false;const e=this.entities.find(o=>o.id===id&&o.team===0&&!o.unit&&o.type!=='house');if(!e)return false;const old={x:e.x,y:e.y};e.x=-1000;e.y=-1000;const clear=this.inBuildArea(x,y)&&!this.entities.some(o=>o.id!==id&&o.hp>0&&Math.abs(x-o.x)<(TYPES[e.type].size+(o.unit?o.r*2:TYPES[o.type].size))/2+4&&Math.abs(y-o.y)<(TYPES[e.type].size+(o.unit?o.r*2:TYPES[o.type].size))/2+4);Object.assign(e,clear?{x,y}:old);return clear;}
 select(id){const e=this.entities.find(e=>e.id===id&&e.team===0&&e.unit&&e.hp>0);if(!e||this.mode==='war-build'||this.mode==='war'&&e.type!=='captain')return false;this.control=id;e.order=null;e.hold=true;return true;}
 release(){if(this.player)this.player.hold=true;this.control=null;}
 bot(team,cx,cy,level=0){let es=[this.make('house',team,cx,cy),this.make('captain',team,cx,cy+115),this.make('pistol',team,cx-80,cy+105)];
  if(level>0)es.push(this.make('long',team,cx+85,cy+110));
  if(level>1)es.push(this.make('sword',team,cx,cy+175));
  es.push(this.make('tower',team,cx-110,cy-45));if(level>2)es.push(this.make('tower',team,cx+110,cy-45));
  for(const p of [[-85,55],[-42,55],[42,55],[85,55]])es.push(this.make('wall',team,cx+p[0],cy+p[1]));
  es.push(this.make('box',team,cx-70,cy-90),this.make('box',team,cx+70,cy-90));return es;
 }
 attack(ids){if(this.mode!=='home')return false;const army=this.home.filter(e=>ids.includes(e.id)&&e.unit);if(!army.length||army.length>10)return false;this.round++;this.mode='attack';this.time=0;this.width=1100;this.height=900;this.result=null;this.control=null;this.order=null;this.bullets=[];this.effects=[];
  const level=Math.min(3,Math.floor((this.round-1)/3));const cx=550+Math.sin(this.round*2.1)*100,cy=265+Math.cos(this.round)*35;this.entities=this.bot(1,cx,cy,level);
  army.forEach((e,i)=>this.entities.push(this.make(e.type,0,380+(i%5)*65,730+Math.floor(i/5)*65)));
  this.message='Botby '+this.round+' · förstör huvudhusets 100 HP för +100 pengar.';return true;
 }
 startWarBuild(){if(this.mode!=='home')return false;this.mode='war-build';this.width=2200;this.height=1800;this.time=0;this.control=null;this.result=null;this.bullets=[];this.effects=[];this.warMoney=600;this.order=null;
  this.centers=[{x:1100,y:1430},{x:350,y:980},{x:630,y:350},{x:1570,y:350},{x:1850,y:980}];
  const p=this.centers[0];this.entities=[this.make('house',0,p.x,p.y)];
  this.home.filter(e=>e.unit).forEach((e,i)=>this.entities.push(this.make(e.type,0,p.x+(i===0?0:((i-1)%7-3)*45),p.y+100+(i===0?0:Math.floor((i-1)/7)*45))));
  this.centers.slice(1).forEach((p,i)=>this.entities.push(...this.bot(i+1,p.x,p.y,1)));this.message='Bygg så länge du vill. Tryck Starta kriget när du är redo.';return true;
 }
 startWar(){if(this.mode!=='war-build')return false;this.mode='war';this.time=0;for(const e of this.entities){e.age=0;e.cool=0;}const c=this.entities.find(e=>e.team===0&&e.type==='captain');this.control=c?.id??null;this.message='Fem byar. Skydda ditt huvudhus och besegra de fyra botbyarna!';return true;}
 goHome(){this.mode='home';this.time=0;this.entities=this.home;for(const e of this.home){e.hp=e.maxHp;e.cool=0;e.hold=false;e.order=null;e.age=0;}this.width=1000;this.height=800;this.control=null;this.bullets=[];this.effects=[];this.order=null;this.result=null;this.message='Tillbaka i din by. Vakterna är hela igen.';}
 giveOrder(x,y){if(this.mode!=='war'||!this.player)return false;this.order={x:clamp(x,20,this.width-20),y:clamp(y,20,this.height-20)};let i=0;for(const e of this.entities.filter(e=>e.unit&&e.team===0&&e.type!=='captain'&&e.hp>0)){e.order={x:this.order.x+Math.cos(i*2.4)*25,y:this.order.y+Math.sin(i*2.4)*25};e.pathNext=0;i++;}this.message='Vakterna går till orderringen.';return true;}
 surface(a,b){if(b.unit)return distance(a,b)-b.r;const h=TYPES[b.type].size/2;return Math.hypot(Math.max(0,Math.abs(a.x-b.x)-h),Math.max(0,Math.abs(a.y-b.y)-h));}
 collides(x,y,r,ignore){return this.entities.find(e=>e.hp>0&&!e.unit&&e.id!==ignore&&Math.abs(x-e.x)<TYPES[e.type].size/2+r&&Math.abs(y-e.y)<TYPES[e.type].size/2+r);}
 canLine(a,b,ignore){const d=distance(a,b),n=Math.ceil(d/12);for(let i=1;i<=n;i++){if(this.collides(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,a.r||5,ignore))return false;}return true;}
 pathfind(a,b,ignore){const cell=35,cols=Math.ceil(this.width/cell),rows=Math.ceil(this.height/cell),start=Math.floor(a.x/cell)+Math.floor(a.y/cell)*cols;
  const goalX=clamp(Math.floor(b.x/cell),0,cols-1),goalY=clamp(Math.floor(b.y/cell),0,rows-1),goal=goalX+goalY*cols;
  const open=[start],cost=new Map([[start,0]]),prev=new Map(),closed=new Set(),blocked=new Map();const h=i=>Math.hypot(i%cols-goalX,Math.floor(i/cols)-goalY);
  let best=start,iterations=0;while(open.length&&iterations++<1600){open.sort((i,j)=>cost.get(j)+h(j)-cost.get(i)-h(i));const c=open.pop();if(closed.has(c))continue;closed.add(c);if(h(c)<h(best))best=c;if(c===goal){best=c;break;}const x=c%cols,y=Math.floor(c/cols);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const n=nx+ny*cols;if(closed.has(n))continue;if(!blocked.has(n))blocked.set(n,!!this.collides((nx+.5)*cell,(ny+.5)*cell,a.r+2,ignore));if(blocked.get(n))continue;
    if(dx&&dy&&(this.collides((x+dx+.5)*cell,(y+.5)*cell,a.r+2,ignore)||this.collides((x+.5)*cell,(y+dy+.5)*cell,a.r+2,ignore)))continue;
    const next=cost.get(c)+(dx&&dy?1.414:1);if(next<(cost.get(n)??Infinity)){cost.set(n,next);prev.set(n,c);open.push(n);}}
  }let path=[],c=best;while(c!==start&&prev.has(c)){path.push({x:(c%cols+.5)*cell,y:(Math.floor(c/cols)+.5)*cell});c=prev.get(c);}return path.reverse();
 }
 move(a,dx,dy,dt){const len=Math.hypot(dx,dy);if(!len)return;dx/=Math.max(1,len);dy/=Math.max(1,len);const speed=100;const nx=clamp(a.x+dx*speed*dt,a.r,this.width-a.r),ny=clamp(a.y+dy*speed*dt,a.r,this.height-a.r);if(!this.collides(nx,a.y,a.r))a.x=nx;if(!this.collides(a.x,ny,a.r))a.y=ny;a.angle=Math.atan2(dy,dx);}
 navigate(a,b,dt,ignore){if(this.canLine(a,b,ignore)){a.path=[];this.move(a,b.x-a.x,b.y-a.y,dt);return;}
  if(a.pathNext<=this.time){a.path=this.pathfind(a,b,ignore);a.pathNext=this.time+1.1;}
  while(a.path.length&&distance(a,a.path[0])<12)a.path.shift();if(a.path.length)this.move(a,a.path[0].x-a.x,a.path[0].y-a.y,dt);
 }
 shield(a){return a.type==='captain'&&a.age%20<5;}
 damage(e,amount){if(e.type==='box'||e.hp<=0||this.shield(e))return false;e.hp=Math.max(0,e.hp-amount);if(!e.hp){this.effects.push({type:'burst',x:e.x,y:e.y,life:.6,team:e.team});if(this.control===e.id)this.control=null;}return true;}
 fire(a,angle){if(a.cool>0||a.hp<=0)return false;const t=TYPES[a.type];a.angle=angle;a.cool=t.rate||1.1;
  if(['pistol','long','tower'].includes(a.type)){this.bullets.push({x:a.x+Math.cos(angle)*20,y:a.y+Math.sin(angle)*20,vx:Math.cos(angle)*580,vy:Math.sin(angle)*580,life:(t.range||210)/580,team:a.team,damage:t.damage||20});this.effects.push({type:'flash',x:a.x,y:a.y,angle,life:.13,team:a.team});}
  else{this.effects.push({type:'slash',x:a.x,y:a.y,angle,life:.22,team:a.team});const targets=this.entities.filter(e=>e.team!==a.team&&e.hp>0&&e.type!=='box'&&this.surface(a,e)<=t.range+a.r&&Math.cos(Math.atan2(e.y-a.y,e.x-a.x)-angle)>.25&&this.canLine({...a,r:2},e,e.id));
   targets.sort((e,f)=>this.surface(a,e)-this.surface(a,f));if(targets[0])this.damage(targets[0],t.damage);
   if(a.type==='special'){const e=targets[0]?.unit?targets[0]:null;if(e){const nx=e.x+Math.cos(angle)*45,ny=e.y+Math.sin(angle)*45;if(nx>a.r&&ny>a.r&&nx<this.width-a.r&&ny<this.height-a.r&&this.canLine(a,{x:nx,y:ny})&&!this.collides(nx,ny,a.r)){a.x=nx;a.y=ny;a.jump=.4;}}}
  }return true;
 }
 finish(won,reason){if(this.result)return;const reward=won?(this.mode==='attack'?100:200):0;this.money+=reward;this.result={won,reward,reason,mode:this.mode};this.control=null;this.message=reason;}
 update(dt,input={}){dt=Math.min(dt,.05);if(this.result)return;this.time+=dt;this.effects=this.effects.filter(e=>(e.life-=dt)>0);const fighting=this.mode==='attack'||this.mode==='war';
  for(const a of this.entities){if(a.hp<=0)continue;a.cool=Math.max(0,a.cool-dt);a.age+=dt;a.jump=Math.max(0,a.jump-dt);
   if(a.id===this.control&&a.unit){if(input.moveX||input.moveY)this.move(a,input.moveX||0,input.moveY||0,dt);if(input.fireX||input.fireY)this.fire(a,Math.atan2(input.fireY||0,input.fireX||0));continue;}
   if(!fighting||this.noAI||a.type==='box'||a.type==='wall'||a.type==='house')continue;
   const t=TYPES[a.type];let enemies=this.entities.filter(e=>e.team!==a.team&&e.hp>0&&e.type!=='box');if(!enemies.length)continue;
   const close=enemies.filter(e=>e.unit&&distance(a,e)<270).sort((e,f)=>distance(a,e)-distance(a,f));let target=close[0]||enemies.filter(e=>e.type==='house').sort((e,f)=>distance(a,e)-distance(a,f))[0]||enemies.sort((e,f)=>distance(a,e)-distance(a,f))[0];
   if(a.type==='tower'){target=enemies.filter(e=>e.unit&&distance(a,e)<190).sort((e,f)=>distance(a,e)-distance(a,f))[0];if(target&&this.canLine({...a,r:2},target,a.id))this.fire(a,Math.atan2(target.y-a.y,target.x-a.x));continue;}
   if(a.order&&!close.length){if(distance(a,a.order)>18)this.navigate(a,a.order,dt);else a.order=null;continue;}
   const nearby=enemies.filter(e=>!e.unit&&e.type!=='house'&&this.surface(a,e)<a.r+t.range).sort((e,f)=>this.surface(a,e)-this.surface(a,f));if(nearby.length&&!close.length)target=nearby[0];
   if(target&&this.surface(a,target)<=t.range+a.r&&this.canLine({...a,r:2},target,target.id))this.fire(a,Math.atan2(target.y-a.y,target.x-a.x));
   else if(target)this.navigate(a,target,dt,target.unit?undefined:target.id);
  }
  for(const p of this.bullets){const d=dt*580,n=Math.max(1,Math.ceil(d/7));for(let i=0;i<n&&p.life>0;i++){p.x+=p.vx*dt/n;p.y+=p.vy*dt/n;p.life-=dt/n;const hit=this.entities.find(e=>e.hp>0&&(e.team!==p.team||e.type==='box')&&(e.unit?distance(e,p)<e.r+4:Math.abs(e.x-p.x)<TYPES[e.type].size/2+3&&Math.abs(e.y-p.y)<TYPES[e.type].size/2+3));if(hit){this.damage(hit,p.damage);this.effects.push({type:'hit',x:p.x,y:p.y,life:.2,team:p.team});p.life=0;}}}this.bullets=this.bullets.filter(p=>p.life>0);
  if(fighting){if(this.mode==='attack'){if(!this.entities.some(e=>e.type==='house'&&e.team===1&&e.hp>0))this.finish(true,'Huvudhuset är förstört! Du vann.');else if(!this.entities.some(e=>e.unit&&e.team===0&&e.hp>0))this.finish(false,'Din armé är utslagen. Försök igen med fler vakter!');}
   else{const house=this.entities.find(e=>e.type==='house'&&e.team===0);if(!house||house.hp<=0)this.finish(false,'Ditt huvudhus föll. Nästa allekrig väntar!');else if(!this.entities.some(e=>e.type==='captain'&&e.team===0&&e.hp>0))this.finish(false,'Kaptenen är utslagen. Samla din armé och försök igen!');else if(!this.entities.some(e=>e.type==='house'&&e.team!==0&&e.hp>0))this.finish(true,'Din by vann allekriget!');
    const teams=new Set(this.entities.filter(e=>e.type==='house'&&e.hp>0).map(e=>e.team));for(const e of this.entities)if(e.team!==0&&!teams.has(e.team)&&e.unit)e.hp=0;
   }
  }
 }
 state(){return {coordinates:'Världskoordinater: x åt höger, y nedåt, origo övre vänstra hörnet',mode:this.mode,time:+this.time.toFixed(2),money:this.money,budget:this.budget,world:{width:this.width,height:this.height},control:this.control,order:this.order,result:this.result,message:this.message,entities:this.entities.filter(e=>e.hp>0).map(e=>({id:e.id,type:e.type,team:e.team,x:+e.x.toFixed(1),y:+e.y.toFixed(1),hp:Number.isFinite(e.hp)?e.hp:'oförstörbar',shield:this.shield(e),order:e.order})),bullets:this.bullets.length};}
}
