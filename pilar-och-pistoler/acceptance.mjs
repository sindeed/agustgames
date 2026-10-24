import {Game,WEAPONS} from './sim.js';
import {makeWorld,floorAt,collides} from './world.js';
import fs from 'node:fs';
let tests=[];function check(name,pass,detail=''){tests.push({name,pass:!!pass,detail:pass?'':detail});console.log((pass?'PASS ':'FAIL ')+name+(pass?'':' '+JSON.stringify(detail)));}
function setup(id=1,kind='solo'){const g=new Game();g.start(kind,true);g.noAI=true;for(const a of g.actors){a.x=95;a.z=95;a.y=0;}const a=g.player,b=g.actors[1];Object.assign(a,{x:5,z:10,y:0,inventory:[id],yaw:0});Object.assign(b,{x:5,z:2,y:0});return {g,a,b};}
function step(g,sec,input={}){for(let t=0;t<sec-1e-8;t+=1/120)g.update(Math.min(1/120,sec-t),input);}
check('Exakt 12 vapen, fyra per nivå',WEAPONS.length===12&&[0,1,2].every(t=>WEAPONS.filter(w=>w.tier===t).length===4));
{
 const g=new Game();g.start('solo');check('Solo öppnar förmatch med 12 Pipår',g.mode==='lobby'&&g.actors.length===12&&g.actors.every(a=>g.weapon(a)===1));check('Exakt fem centrumhus',g.world.buildings.filter(b=>Math.abs(b.x)<30&&Math.abs(b.z)<32).length===5);
 const a=g.player;g.noAI=true;g.damage(a,4);step(g,2.49);check('Lobbydöd stannar före återkomst',a.hp===0);step(g,.03);check('Återkommer under tre sekunder',a.hp===4);a.x=0;a.z=2;g.interact();check('Fysisk röd knapp startar match',g.mode==='match');check('Pipår bara spelaren, övriga elva exakt en gång',g.weapon(g.player)===1&&new Set(g.actors.slice(1).map(a=>g.weapon(a))).size===11&&g.actors.slice(1).every(a=>g.weapon(a)!==1));
}
for(const id of [0,1,2,4,6,7,8,10]){const {g,a,b}=setup(id);g.fire(a);step(g,.5);check(WEAPONS[id].name+' verklig pil ger korrekt skada',b.hp===4-WEAPONS[id].damage,b.hp);}
{
 const {g,a,b}=setup(1);for(let i=0;i<4;i++){a.cool=0;g.fire(a);step(g,.4);}check('Pipår slår ut bot',b.hp===0);const t=g.time;g.damage(a,4);step(g,.02);check('Soloförlust visas',g.mode==='result');
}
{
 const {g,a,b}=setup(0);check('Blickdår första skott',g.fire(a));check('Blickdår spärrar snabbare än 0.5 s',!g.fire(a));step(g,.49);check('Blickdår fortfarande laddning',!g.fire(a));step(g,.02);check('Blickdår redo efter halv sekund',g.fire(a));
}
{
 const {g,a,b}=setup(5);g.fire(a);step(g,.3);check('Edår ingen direkt skada',b.hp===4&&b.burn?.left===10,b);const next=b.burn?.next;step(g,next-g.time+.001);check('Edår första tick 0.25',b.hp===3.75,b.hp);g.hit(a,b,5);step(g,4.49);check('Edår nio ticks före fem sekunder',b.hp===1.75,b.hp);step(g,.02);check('Edår exakt tio ticks och 2.5 totalt',b.hp===1.5&&!b.burn,b.hp);step(g,2);check('Edår upphör helt efter fem sekunder',b.hp===1.5);
}
{
 const {g,a,b}=setup(7);g.fire(a);step(g,.1);const until=b.freeze;check('Liker fryser efter faktisk träff',until>g.time+4.8);b.dx=1;const x=b.x;g.move(b,1);check('Frusen kan inte röra sig',b.x===x);g.hit(a,b,1);check('Frusen kan skadas',b.hp===2);step(g,until-g.time+.01);g.move(b,.1);check('Frysning slutar efter fem sekunder',b.x>x);
}
{
 const {g,a,b}=setup(3);const originA={x:a.x,z:a.z},originB={x:b.x,z:b.z};g.fire(a);step(g,.3);check('Skooker verklig träff skapar separat lila värld',a.realm>0&&a.realm===b.realm&&a.x>500&&b.hp===4);check('Skooker tvingar bådas vapen',g.weapon(a)===3&&g.weapon(b)===3);const until=g.realms[0].until;a.cool=0;g.fire(a);step(g,.5);check('Skooker gör ett hjärta inne i världen',b.hp===3,b.hp);step(g,until-g.time+.01);check('Båda återkommer automatiskt vid fem sekunder',!a.realm&&!b.realm&&a.x===originA.x&&a.z===originA.z&&b.x===originB.x&&b.z===originB.z);check('Botens fasta vapen återställs',g.weapon(b)===0);
}
{
 const {g,a,b}=setup(2);g.world.boxes.push({x:5,y:1.5,z:6,sx:5,sy:3,sz:1,type:'wall'});check('Ingen genomväggssyn',!g.visible(a,b));g.fire(a);step(g,.4);check('Gegå går genom vägg',b.hp===3);
 const q=setup(1);q.g.world.boxes.push({x:5,y:1.5,z:6,sx:5,sy:3,sz:1,type:'wall'});q.g.fire(q.a);step(q.g,.5);check('Vanlig pil stoppas av vägg',q.b.hp===4);
}
{
 const {g,a}=setup(6);g.world.boxes.push({x:5,y:1.5,z:4,sx:7,sy:3,sz:.5,type:'wall'},{x:5,y:1.5,z:14,sx:7,sy:3,sz:.5,type:'wall'});g.actors[1].x=40;g.fire(a);step(g,.2);check('Dundår studsar första väggen',g.projectiles[0]?.bounces===1&&g.projectiles[0]?.vz>0,g.projectiles);step(g,.4);check('Dundår stoppas vid andra väggen',g.projectiles.length===0);
}
{
 const {g,a,b}=setup(9);const c=g.actors[2];Object.assign(c,{x:8,z:2,y:0});g.fire(a);check('Wyver vind lyfter flera utan skada',b.vy>0&&c.vy>0&&b.hp===4&&c.hp===4&&!a.windNext);step(g,1);check('Wyver fiender högt i luften',b.y>8);a.cool=0;g.fire(a,{x:0,y:.7,z:-.7});check('Wyver andra skott långsam pil',g.projectiles.some(p=>p.weapon===9&&Math.hypot(p.vx,p.vy,p.vz)<13)&&a.windNext);step(g,3);check('Wyver långsam nedkomst',b.y>5);
}
{
 const {g,a}=setup(8);g.fire(a);step(g,.2);check('Bigda kastar skytten uppåt',a.y>2&&a.vy>0);const s=setup(10);s.g.fire(s.a);step(s.g,.2);check('Bimbår stillastående ger inget kast',s.a.y<.05&&s.a.vx===0&&s.a.vz===0);s.a.cool=0;s.a.dx=1;s.g.fire(s.a);check('Bimbår kast följer rörelseriktning inte sikte',s.a.vx>30&&s.a.vz===0);step(s.g,.7,{side:1});check('Bimbår kast längre än ett hus',s.a.x>23,s.a.x);
 const h=setup(10);Object.assign(h.a,{x:-64+11+.7,z:-48,y:0,dx:0,dz:1});h.g.fire(h.a);check('Hotellvägg ger litet uppkast',h.a.vy===7&&Math.abs(h.a.vz)===5);step(h.g,3.6,{jump:true});check('Aktiv hotellklättring når takhöjd utan teleport',h.a.y>13,h.a.y);
}
{
 const {g,a,b}=setup(11);const c=g.actors[2];Object.assign(c,{x:7,z:2,y:0});g.fire(a);check('Bomba långsam stor kula',g.projectiles[0].radius===.5&&g.projectiles[0].vz===-15);step(g,.7);check('Bomba explosion skadar flera med två',b.hp===2&&c.hp===2,[b.hp,c.hp]);
}
{
 const {g,a,b}=setup();check('Bot kan inte plocka/släppa',!g.pickup(b)&&!g.drop(b));g.loot=[{id:4,x:a.x,z:a.z,y:.5,uid:1},{id:11,x:a.x,z:a.z,y:.5,uid:2},{id:8,x:a.x,z:a.z,y:.5,uid:3}];check('Två upptag ger tre vapen',g.pickup()&&g.pickup()&&a.inventory.length===3);check('Fjärde vapen nekas',!g.pickup());g.select(0);check('Pipår kan släppas',g.drop()&&!a.inventory.includes(1)&&g.loot.some(l=>l.id===1));a.slot=0;g.drop();g.drop();check('Alla vapen kan släppas',a.inventory.length===0&&g.weapon(a)===null&&!g.fire(a));
}
for(const kind of ['solo','town','ships','castle']){
 const g=new Game();g.start(kind,true);check(kind+' 12 deltagare',g.actors.length===12);check(kind+' startpositioner ej i vägg',g.actors.every(a=>!collides(g.world,a.x,a.y,a.z)),g.actors.filter(a=>collides(g.world,a.x,a.y,a.z)).map(a=>a.id));
 if(kind!=='solo')check(kind+' två lag om sex',g.actors.filter(a=>a.team===0).length===6&&g.actors.filter(a=>a.team===1).length===6);
}
{
 const w=makeWorld('solo');check('Alla solohus/hotell har öppna dörrar',w.buildings.every(b=>!collides(w,b.x,0,b.z+b.sz/2)&&!collides(w,b.x,0,b.z)));check('Stadens hus stängda',makeWorld('town').buildings.every(b=>collides(makeWorld('town'),b.x,0,b.z)));
 const {g,a}=setup();Object.assign(a,{x:0,z:-17,y:0});for(let i=0;i<180;i++){a.dx=0;a.dz=-1;g.move(a,1/60);}check('Kan faktiskt gå genom centrumhusets dörr',a.z< -22,a.z);a.dx=1;a.dz=0;for(let i=0;i<180;i++)g.move(a,1/60);check('Husets sidovägg stoppar',a.x<6,a.x);
}
{
 const {g,a}=setup(1,'ships');Object.assign(a,{x:7.5,z:-23,y:4});a.dx=0;a.dz=-1;for(let i=0;i<245;i++)g.move(a,1/60);check('Fysisk skeppstrappa går ner till nedervåning',a.y<.1&&a.z< -42,[a.y,a.z]);a.dz=1;for(let i=0;i<285;i++)g.move(a,1/60);check('Samma trappa leder tillbaka till däck',a.y>=3.9,[a.y,a.z]);check('Inga nedervåningsteleporter',g.world.ramps.length===2);check('Tre bryggleder',g.world.floors.some(f=>f.x===0&&f.z===0)&&g.world.floors.some(f=>f.x===21)&&g.world.floors.some(f=>f.x===-21));
 Object.assign(a,{x:0,z:-20,y:0,vy:0});g.jump(a);for(let i=0;i<80;i++)g.move(a,1/60);check('Däcket stoppar hopp från nedervåningen',a.y<3.9,a.y);
}
{
 const {g,a}=setup(1,'castle');check('Fyra torn med verkliga trappor',g.world.ramps.length===4);for(const r of g.world.ramps){Object.assign(a,{x:r.x,z:r.z-r.sz/2+.1,y:0,vy:0,dx:0,dz:1});for(let i=0;i<260;i++)g.move(a,1/60);check('Torntrappa '+r.x+','+r.z+' når toppen',a.y>=8.9,a.y);}
 for(const [i,gate]of g.world.gates.entries()){for(const actor of [a,g.actors[7]]){actor.x=gate.x;actor.z=gate.z-4;actor.y=0;const old=gate.open;g.interact(actor);check('Båda lag kan öppna/stänga port '+i,gate.open!==old);}}
}
{
 // Bot abilities go through exactly the same fire/hit/move entry points.
 for(const id of [3,5,7,8,9,10,11]){const {g,a,b}=setup();b.inventory=[id];b.yaw=Math.PI;b.dx=1;b.cool=0;g.fire(b,{x:0,y:0,z:1});step(g,.65);check('Bot använder '+WEAPONS[id].name,id===3?a.realm>0:id===5?!!a.burn:id===7?a.freeze>g.time:id===8?b.y>2:id===9?a.float>g.time:id===10?b.x>15:a.hp===2,{hp:a.hp,y:b.y,x:b.x,realm:a.realm});}
}
{
 const g=new Game();g.start('town',true);g.noAI=true;g.actors.filter(a=>a.team===1).forEach(a=>g.damage(a,4));step(g,.1);check('Lagvinst när andra laget är utslaget',g.mode==='result'&&g.result==='Ditt lag vann!');
 const {g:q}=setup();q.actors.slice(1).forEach(a=>q.damage(a,4));step(q,.1);check('Solovinst sista kvar',q.mode==='result'&&q.result.includes('Du vann'));
}
const failed=tests.filter(t=>!t.pass);fs.mkdirSync('output/pilar-qa',{recursive:true});fs.writeFileSync('output/pilar-qa/simulation.json',JSON.stringify(tests,null,2));console.log(`RESULT ${tests.length-failed.length}/${tests.length}`);if(failed.length)process.exitCode=1;
