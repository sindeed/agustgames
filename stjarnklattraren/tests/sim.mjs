import assert from 'node:assert/strict';
import {Game,makeLevel,CELL} from '../sim.js';
let checks=0;function check(ok,msg){assert.ok(ok,msg);checks++;}function step(g,secs,input={}){for(let t=0;t<secs;t+=1/120)g.update(1/120,input)}
function playing(id='home'){const g=new Game();g.mode='play';g.load(id);return g;}
function use(g,type,obj){g.context={type,obj};g.interact()}
function at(g,obj,dx=0,dz=0){g.player.x=obj.x+dx;g.player.z=obj.z+dz;g.findContext()}
// Fundamental timings, death, persistence, and cave-only sleeping.
{
const g=playing();step(g,60.1);check(g.dayTime>=60,'Night after one minute');step(g,60);check(g.dayTime<1,'Morning after another minute');g.damage(10);step(g,2.9);check(g.hp===40,'No early healing');g.damage(10);step(g,2.9);check(g.hp===30,'New damage restarts healing');step(g,.2);check(g.hp===50,'Full healing after three quiet seconds');
const sleep=g.level.props.find(p=>p.type==='sleep');at(g,sleep);check(g.context?.obj===sleep,'Sleep available in cave');g.interact();step(g,1.9);check(g.mode==='sleep','Sleep takes two seconds');step(g,.2);check(g.mode==='play'&&g.dayTime<.2,'Sleeping makes morning');
g.ability=true;g.trophy=true;use(g,'prop',g.level.props.find(p=>p.type==='build'));check(g.built&&!g.trophy,'Prize builds at cave');const restored=new Game(g.save());check(restored.built&&restored.ability,'Build and ability persist');for(let i=0;i<5;i++)g.damage(10);check(g.mode==='dead'&&g.level.id==='home'&&!g.built&&!g.ability,'Five hits reset everything to cave');
for(const id of['outside','floor1','floor2','floor3'])check(!makeLevel(id).props.some(p=>p.type==='sleep'),'No sleeping outside cave');
}
// Projectiles: three front hits, one rear hit, walls, boss health.
{
const g=playing('floor1'),guard=g.level.guards.find(e=>e.id==='stairs1');g.player.x=guard.x;g.player.z=guard.z+9;g.player.yaw=0;for(let i=0;i<3;i++){g.attack();step(g,.5);check(guard.hp===20-i*10,`Front hit ${i+1}`)}
const b=playing('floor1'),rear=b.level.guards.find(e=>e.id==='stairs1');b.player.x=rear.x;b.player.z=rear.z-6;b.player.yaw=Math.PI;b.attack();step(b,.3);check(rear.hp===0,'Rear hit defeats guard');
const w=playing('floor1'),wg=w.level.guards.find(e=>e.id==='stairs1');w.player.x=wg.x+6;w.player.z=wg.z;w.player.yaw=Math.PI/2;w.attack();step(w,1);check(wg.hp===30,'Walls stop shots');
const boss=playing('floor3');const bg=boss.level.guards[0];check(bg.hp===100&&bg.boss,'Boss has 100 HP');boss.player.x=bg.x;boss.player.z=bg.z+9;boss.player.yaw=0;boss.attack();step(boss,.5);check(bg.hp===90,'Boss loses ten per hit');
}
// Trap sequence allows waiting; cannot damage guards; guard damage front/back equal.
{
const g=playing('floor2');for(const guard of g.level.guards)guard.hp=0;
for(const trap of g.level.traps){at(g,trap);step(g,.02);check(g.hp===30,'Arrow trap damage 20');g.player.x+=2;step(g,3.1);check(g.hp===50,'Can heal between traps')}
check(g.level.traps.length===3,'Exactly three traps');
const a=playing('floor2');const ag=a.level.guards[0];ag.x=a.level.traps[0].x;ag.z=a.level.traps[0].z;step(a,1);check(ag.hp===30,'Traps do not hurt guards');ag.hp=10;step(a,4);check(ag.hp===10,'Guards do not heal');a.travel('home');a.travel('outside');a.load('floor2');check(a.level.guards.every(e=>e.hp===30),'New visit restores guards');
}
// Reachability follows actual collision map, not only visual coordinates.
function path(g,start,end){const encode=p=>`${Math.round(p.x/CELL)},${Math.round(p.z/CELL)}`;const begin=encode(start),goal=encode(end),queue=[begin],prev=new Map([[begin,null]]);for(let i=0;i<queue.length;i++){const k=queue[i];if(k===goal){const out=[];for(let t=k;t!==null;t=prev.get(t))out.unshift(t.split(',').map(Number));return out;}const[x,z]=k.split(',').map(Number);for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nk=`${x+dx},${z+dz}`;if(!prev.has(nk)&&g.canStand((x+dx)*CELL,(z+dz)*CELL)){prev.set(nk,k);queue.push(nk)}}}return null;}
{
const g=playing('outside');at(g,g.level.doors[0],0,2);g.interact();check(g.level.id==='outside','Entrance requires key');const key=g.level.items[0];check(path(g,g.player,key),'Exterior key reachable');use(g,'item',key);at(g,g.level.doors[0],0,2);g.interact();check(g.level.id==='floor1','Entrance opens with key');
const right=g.level.doors.find(d=>d.id==='return1');at(g,right,-2,0);check(g.context?.type==='door','Closed door interaction reachable');g.interact();const k=g.level.items[0];const mazePath=path(g,g.player,k);check(mazePath,'Three-turn maze key reachable');check(mazePath.some(([x,z])=>x===28&&z===14)&&mazePath.some(([x,z])=>x===28&&z===17),'Path includes maze corners');use(g,'item',k);check(!right.open,'Key locks return door');check(!path(g,k,{x:36,z:60}),'Locked return cannot be bypassed');const portal=g.level.portals[0];check(path(g,k,portal),'Can return from key to guard portal');const before={...g.player};use(g,'portal',portal);check(g.player.x===before.x,'Guard blocks portal');g.level.guards.find(e=>e.id==='portal1').hp=0;use(g,'portal',portal);check(g.player.x===36&&g.player.z===60,'Portal returns to first room');const left=g.level.doors[0];use(g,'door',left);check(g.level.guards[0].alert,'Opening left door alerts guard');const stairs=g.level.props.find(p=>p.type==='stairs');use(g,'prop',stairs);check(g.level.id==='floor1','Stair guard must be defeated');g.level.guards[0].hp=0;check(path(g,g.player,stairs),'First stairs reachable');use(g,'prop',stairs);check(g.level.id==='floor2','First stairs reach floor two');
const return2=g.level.doors[0];use(g,'door',return2);const key2=g.level.items[0];check(path(g,g.player,key2),'Second floor key reachable through trap corridor');use(g,'item',key2);check(!g.keys.has('key2'),'Key guard protects second key');g.level.guards.find(e=>e.id==='keyguard').hp=0;use(g,'item',key2);check(!return2.open,'Second return door locks');check(!path(g,key2,{x:36,z:69}),'Cannot bypass second locked door');const portal2=g.level.portals[0];check(path(g,key2,portal2),'Second portal reachable from key room');for(const id of portal2.guards)g.level.guards.find(e=>e.id===id).hp=0;use(g,'portal',portal2);check(g.player.x===36&&g.player.z===69,'Second portal returns to start');const stairs2=g.level.props.find(p=>p.type==='stairs');check(stairs2.guards.length===3,'Three stair guards');for(const id of stairs2.guards)g.level.guards.find(e=>e.id===id).hp=0;check(path(g,g.player,stairs2),'Third floor stairs reachable');use(g,'prop',stairs2);check(g.level.id==='floor3','Third floor reached');
use(g,'item',g.level.items[0]);check(!g.ability,'Boss protects reward');g.level.guards[0].hp=0;use(g,'item',g.level.items[0]);check(g.ability&&g.trophy&&g.mode==='reward','Reward grants climbing and buildable prize');
g.travel('home');g.player.x=8*CELL-1.1;g.player.z=3*CELL;g.player.yaw=Math.PI/2;step(g,1,{attack:true});check(g.player.y>3,'Holding attack climbs wall');const y=g.player.y;step(g,.4);check(g.player.y<y,'Releasing attack lets go');step(g,2);check(g.player.y===1.65,'Returns to ground');check(!g.canStand(5*CELL,2*CELL),'Mountain cannot be entered');
}
{
const g=playing('floor1');g.keys.add('key1');g.level.items[0].taken=true;g.level.guards[0].hp=10;g.player.x=78;g.player.z=51;g.hp=30;const restored=new Game(JSON.parse(JSON.stringify(g.save())));check(restored.level.id==='floor1'&&restored.player.x===78,'Reload preserves current place and position');check(restored.keys.has('key1')&&restored.level.items[0].taken,'Reload preserves key and locked route');check(restored.level.guards[0].hp===10&&restored.hp===30,'Reload preserves guard and player health');
}
{
const g=playing('floor2');g.level.guards.forEach(e=>e.hp=0);at(g,g.level.traps[0]);step(g,.02);step(g,3.1);check(g.hp===50,'Standing after trap activation permits healing');
const chase=playing('floor1');chase.player.x=30;chase.player.z=60;const left=chase.level.doors.find(d=>d.id==='left');use(chase,'door',left);const guard=chase.level.guards.find(g=>g.id==='stairs1');const startZ=guard.z;step(chase,2);check(guard.z>startZ+3,'Alerted guard chases around a corner');
}
console.log(`${checks} simulation checks passed`);
