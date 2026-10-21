export const VERSION = '20261021-camp-1';
export const WORLD = { w:2400, h:2200 };
export const CABIN = { x:680, y:1390, w:260, h:210 };
export const SAFE = { x:670, y:1620, w:290, h:160 };
export const TABLES = [{x:810,y:1300},{x:1000,y:1470}];
export const WOOD = {x:1550,y:1490};
export const FIRE = {x:1220,y:1460};
export const NAMES = {human:'Människan',ghost:'Spöket',tall:'Långa monstret'};
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const inside = (p,r,margin=0) => p.x>=r.x-margin&&p.x<=r.x+r.w+margin&&p.y>=r.y-margin&&p.y<=r.y+r.h+margin;
export const isSafe = p=>inside(p,SAFE);
export function random(s) { s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296; }
function tree(id,x,y) {return {id,x,y,r:19,fallen:false,wood:3,fall:0};}
export function createGame(role='human',mode='playing') {
 const s={version:VERSION,mode,role,time:0,day:1,phase:'day',phaseTime:0,nights:0,seed:1479,fire:0,logs:0,tinder:0,tools:['knife','axe'],tasks:{},actionCooldown:0,brawl:null,brawlCooldown:6,scene:null,nextScene:24,sceneIndex:0,events:[],notice:'',noticeTime:0,stats:{carved:0,chopped:0,fires:0,teases:0,treeFalls:0,throws:0},input:{x:0,y:0},actors:{human:{id:'human',x:1210,y:1620,speed:153,r:16,z:0,sad:0,facing:1,goal:null,anim:0,status:'Utforskar'},ghost:{id:'ghost',x:1140,y:1130,speed:69,r:21,z:0,sad:0,facing:1,goal:null,anim:0,status:'Strosar'},tall:{id:'tall',x:1380,y:1090,speed:64,r:19,z:0,sad:0,facing:-1,goal:null,anim:0,status:'Strosar'}},trees:[]};
 s.trees.push(tree('scene-0',1260,1140),tree('scene-1',1430,1020),tree('near-camp',1630,1360));
 for(let y=160;y<1240;y+=150)for(let x=160;x<2280;x+=150){let tx=x+random(s)*65,ty=y+random(s)*60;if(Math.hypot(tx-1260,ty-1140)>165&&Math.hypot(tx-1430,ty-1020)>130&&!(tx>1080&&tx<1320&&ty>630))s.trees.push(tree('t'+s.trees.length,tx,ty));}
 for(let i=0;i<30;i++){let x=i%2?180+random(s)*300:1900+random(s)*290;let y=1300+random(s)*670;s.trees.push(tree('edge'+i,x,y));}
 return s;
}
export function say(s,text){s.notice=text;s.noticeTime=5;s.events.push({at:Math.round(s.time),text});if(s.events.length>8)s.events.shift();}
export function nearestTree(s,p,includeFallen=false){return s.trees.filter(t=>includeFallen||!t.fallen).sort((a,b)=>distance(a,p)-distance(b,p))[0];}
function collides(s,p,r){if(inside(p,CABIN,r))return true;return s.trees.some(t=>!t.fallen&&distance(p,t)<t.r+r);}
export function move(s,a,dx,dy,dt){if(a.z>5)return;const d=Math.hypot(dx,dy);if(d<.01)return;dx/=Math.max(1,d);dy/=Math.max(1,d);let speed=a.speed;if(a.id!=='human'&&s.fire>0&&distance(a,FIRE)<180)speed*=.65;const step=speed*dt;const nx=Math.max(45,Math.min(WORLD.w-45,a.x+dx*step)),ny=Math.max(70,Math.min(WORLD.h-50,a.y+dy*step));if(!collides(s,{x:nx,y:a.y},a.r))a.x=nx;if(!collides(s,{x:a.x,y:ny},a.r))a.y=ny;if(dx)a.facing=Math.sign(dx);a.anim+=dt*9;}
function go(s,a,p,dt){const d=distance(a,p);if(d<12)return true;const dx=(p.x-a.x)/d,dy=(p.y-a.y)/d,old={x:a.x,y:a.y};move(s,a,dx,dy,dt);if(distance(old,a)<a.speed*dt*.25){a.detour=(a.detour||0)+dt;const side=a.id==='ghost'?1:-1;move(s,a,-dy*side,dx*side,dt);}return d<24;}
export function actionInfo(s,id=s.role){const a=s.actors[id];if(s.tasks[id])return {label:s.tasks[id].label,kind:'busy'};if(id==='human'){
 const table=TABLES.find(t=>distance(a,t)<95);if(table)return {label:'Tälj tändmaterial',kind:'carve',target:table};
 if(distance(a,FIRE)<105)return {label:s.fire>0?'Lägg på ved':'Tänd elden',kind:s.fire>0?'fuel':'light'};
 const fallen=s.trees.find(t=>t.fallen&&t.wood>0&&distance(a,t)<100);if(distance(a,WOOD)<115||fallen)return {label:'Hugg ved',kind:'chop',target:fallen||WOOD};
 return {label:'Gå till bord, ved eller eld',kind:'none'};
 }
 if(a.z>0)return {label:'Klättra ner',kind:'down'};
 const other=s.actors[id==='ghost'?'tall':'ghost'];const t=nearestTree(s,a);
 if(id==='tall'&&distance(a,other)<105&&t&&distance(a,t)<210)return {label:'Släng spöket i trädet',kind:'throw',target:t};
 if(t&&distance(a,t)<115)return {label:id==='ghost'?'Hugg ner trädet':'Klättra upp',kind:id==='ghost'?'fell':'climb',target:t};
 return {label:id==='ghost'?'Gå nära ett träd':'Gå nära ett träd eller spöket',kind:'none'};
}
function fallTree(s,t){if(!t||t.fallen)return;t.fallen=true;t.fall=1;s.stats.treeFalls++;say(s,'KNAK! Trädet blev ved.');const tall=s.actors.tall;if(tall.treeId===t.id){tall.z=0;tall.treeId=null;tall.sad=8;tall.status='Sur och ledsen';tall.x=t.x+70;tall.y=t.y+70;tall.goal={x:t.x+280,y:t.y+140};say(s,'Oj! Långa monstret ramlade. Nu går det surt därifrån.');}}
export function act(s,id=s.role){if(s.mode!=='playing'||(id===s.role&&s.actionCooldown>0)||(s.scene&&id!=='human')||s.tasks[id])return false;const a=s.actors[id],info=actionInfo(s,id);switch(info.kind){
 case 'carve': a.x=info.target.x;a.y=info.target.y+18;s.tasks[id]={actor:id,kind:'carve',label:'Täljer…',left:1.3,total:1.3};a.status='Sitter och täljer';break;
 case 'chop':s.tasks[id]={actor:id,kind:'chop',label:'Hugger…',left:1.4,total:1.4,targetId:info.target.id};a.status='Hugger ved';break;
 case 'light':if(s.logs<1||s.tinder<1){say(s,'Elden behöver ved och tändmaterial. Hugg och tälj först.');return false;}s.logs--;s.tinder--;s.fire=135;s.stats.fires++;say(s,'Elden brinner! Det känns tryggare här.');break;
 case 'fuel':if(s.logs<1){say(s,'Hugg mer ved först.');return false;}s.logs--;s.fire=Math.min(240,s.fire+80);say(s,'Mer ved på elden.');break;
 case 'fell':s.tasks[id]={actor:id,kind:'fell',label:'Hugger trädet…',left:1.5,total:1.5,targetId:info.target.id};break;
 case 'climb':a.z=85;a.treeId=info.target.id;a.x=info.target.x+22;a.y=info.target.y+18;a.status='Sitter i trädet';say(s,'Långa monstret har klättrat upp.');break;
 case 'down':a.z=0;a.x+=50;a.treeId=null;a.status='Strosar';break;
 case 'throw':startScene(s,'throw',info.target);break;
 default:return false;
 }if(id===s.role)s.actionCooldown=.35;return true;}
export function tease(s,id=s.role){if(s.mode!=='playing'||id==='human'||s.scene||s.brawl||s.actionCooldown>0)return false;let victim=s.actors[id==='ghost'?'tall':'ghost'];if(distance(s.actors[id],victim)>145){say(s,'Gå närmare det andra monstret för att retas.');return false;}startBrawl(s,id,'tease');s.actionCooldown=2;return true;}
function startBrawl(s,actor,kind){const victim=actor==='ghost'?'tall':'ghost';s.brawl={actor,victim,kind,left:kind==='tease'?3:5};s.brawlCooldown=15;s.actors[actor].status=kind==='tease'?'Retas':'Jagar det andra monstret';s.actors[victim].status='Blir retad';s.actors[actor].bubble=kind==='tease'?'Du kan inte ta mig!':'Kom tillbaka!';say(s,'Monstren bråkar med varandra. Passa på att smita!');}
export function startScene(s,kind,target){if(s.scene||!target||target.fallen)return false;s.brawl=null;s.scene={kind,treeId:target.id,stage:'approach',time:0};s.actors.ghost.z=0;s.actors.tall.z=0;s.actors.ghost.treeId=null;s.actors.tall.treeId=null;s.actors.ghost.sad=0;s.actors.tall.sad=0;s.actors.ghost.status='Bråkar med långa monstret';s.actors.tall.status='Bråkar med spöket';say(s,kind==='fell'?'Långa monstret klättrar. Spöket har en idé…':'Långa monstret har fått en tokig idé…');return true;}
function sceneUpdate(s,dt){const sc=s.scene,t=s.trees.find(t=>t.id===sc.treeId),g=s.actors.ghost,l=s.actors.tall;sc.time+=dt;if(sc.stage==='approach'){
 go(s,g,{x:t.x-64,y:t.y+55},dt);go(s,l,{x:t.x+40,y:t.y+55},dt);
 if((distance(g,{x:t.x-64,y:t.y+55})<30&&distance(l,{x:t.x+40,y:t.y+55})<30)||sc.time>15){sc.stage='act';sc.time=0;g.x=t.x-64;g.y=t.y+55;l.x=t.x+40;l.y=t.y+55;}
 }else if(sc.kind==='fell'){
 if(sc.time<2){l.z=Math.min(85,sc.time*60);l.treeId=t.id;l.status='Klättrar';g.status='Hugger trädet';g.anim+=dt*10;}
 else if(!t.fallen){fallTree(s,t);l.z=0;l.treeId=null;l.sad=8;l.status='Sur och ledsen';l.bubble='Mitt träd…';}
 if(sc.time>3)go(s,l,{x:t.x+270,y:t.y+170},dt);
 if(sc.time>7){l.goal={x:t.x+320,y:t.y+220};s.scene=null;s.nextScene=28;s.brawlCooldown=12;}
 }else{
 if(sc.time<1.5){g.x=l.x-15;g.y=l.y;g.z=sc.time*40;g.status='Blir upplyft';l.status='Lyfter spöket';}
 else if(sc.time<3){const k=(sc.time-1.5)/1.5;g.x=l.x+(t.x+18-l.x)*k;g.y=l.y+(t.y+12-l.y)*k;g.z=60+Math.sin(k*Math.PI)*70+30*k;g.status='Flyger mot trädet';}
 else{g.x=t.x+18;g.y=t.y+12;g.z=sc.time<6?90:Math.max(0,90-(sc.time-6)*90);g.sad=9;g.bubble='Inte ett träd!';g.status='Vill ner från trädet';}
 if(sc.time>7){g.z=0;g.x=t.x-65;g.y=t.y+70;g.goal={x:t.x-320,y:t.y+230};g.status='Ledsen, går iväg';s.stats.throws++;s.scene=null;s.nextScene=32;s.brawlCooldown=14;say(s,'Spöket gillar verkligen inte träd. Det går iväg.');}
 }
}
function humanBot(s,dt){const h=s.actors.human;if(s.tasks.human)return;let danger=Math.min(distance(h,s.actors.ghost),distance(h,s.actors.tall));if(s.phase==='night'&&!s.scene&&!s.brawl&&danger<300){h.status='Söker skydd bakom stugan';go(s,h,{x:SAFE.x+SAFE.w/2,y:SAFE.y+90},dt);return;}
 let target;if(s.tinder<1)target=TABLES[1];else if(s.logs<2)target=WOOD;else target=FIRE;
 h.status='Samlar till elden';if(distance(h,target)>75)go(s,h,{x:target.x,y:target.y+55},dt);else if(s.fire<55||s.tinder<1||s.logs<2)act(s,'human');else{h.status='Utforskar lägret';go(s,h,{x:1240+Math.sin(s.time*.04)*310,y:1600+Math.cos(s.time*.04)*150},dt);}}
function monsterBot(s,id,dt){const a=s.actors[id],h=s.actors.human;if(a.sad>0){a.status='Ledsen, går iväg';if(a.goal)go(s,a,a.goal,dt);return;}if(a.z>0){if(s.phase==='night'||s.time>(a.perchUntil||Infinity)){a.z=0;a.x+=55;a.treeId=null;}else return;}
 if(s.phase==='day'&&id==='tall'&&s.time>(a.nextClimb||14)){const t=nearestTree(s,a);if(t&&distance(a,t)<115){act(s,id);a.perchUntil=s.time+8;a.nextClimb=s.time+38;return;}}
 if(id==='ghost'&&s.actors.tall.z>0){const t=s.trees.find(t=>t.id===s.actors.tall.treeId);if(t){if(distance(a,t)<115)act(s,id);else go(s,a,{x:t.x-60,y:t.y+45},dt);return;}}
 if(s.phase==='night'&&!isSafe(h)){a.status='Jagar människan';go(s,a,h,dt);return;}
 // Deep forest is less safe in daylight too, but rivalry remains the main daytime activity.
 if(h.y<650&&distance(h,a)<240&&!isSafe(h)){a.status='Jagar i djupa skogen';go(s,a,h,dt);return;}
 a.status=s.phase==='night'?'Letar utanför gömman':'Strosar';if(!a.goal||distance(a,a.goal)<40){a.goal={x:880+random(s)*700,y:800+random(s)*620};}go(s,a,a.goal,dt);
}
export function update(s,dt,input={x:0,y:0}){
 if(s.mode!=='playing')return;s.time+=dt;s.phaseTime+=dt;s.input={x:input.x||0,y:input.y||0};s.actionCooldown=Math.max(0,s.actionCooldown-dt);s.noticeTime=Math.max(0,s.noticeTime-dt);s.fire=Math.max(0,s.fire-dt);s.brawlCooldown-=dt;
 const duration=s.phase==='day'?180:120;if(s.phaseTime>=duration-1e-8){s.phaseTime=Math.max(0,s.phaseTime-duration);if(s.phase==='day'){s.phase='night';say(s,'Det är natt. Håll koll på monstren och gömman.');}else{s.phase='day';s.day++;s.nights++;say(s,'God morgon! Du klarade natten.');}}
 for(const a of Object.values(s.actors)){a.sad=Math.max(0,a.sad-dt);if(!s.brawl&&!s.scene)a.bubble='';}for(const t of s.trees)t.fall=Math.max(0,t.fall-dt);
 const p=s.actors[s.role];if((!s.scene||s.role==='human')&&!s.tasks[s.role]){move(s,p,input.x||0,input.y||0,dt);if(Math.hypot(input.x||0,input.y||0)>.1)p.status='Går';}
 for(const [id,task] of Object.entries(s.tasks)){s.actors[id].anim+=dt*10;task.left-=dt;if(task.left<=0){delete s.tasks[id];s.actors[id].status=id==='human'?'Utforskar':'Strosar';if(task.kind==='carve'){s.tinder++;s.stats.carved++;say(s,'Små flisor! Nu har du tändmaterial.');}if(task.kind==='chop'){s.logs++;s.stats.chopped++;const t=s.trees.find(t=>t.id===task.targetId);if(t)t.wood--;say(s,'En vedklabb till elden.');}if(task.kind==='fell')fallTree(s,s.trees.find(t=>t.id===task.targetId));}}
 if(s.role!=='human')humanBot(s,dt);
 if(s.scene)sceneUpdate(s,dt);else if(s.brawl){const b=s.brawl,a=s.actors[b.actor],v=s.actors[b.victim];b.left-=dt;if(b.kind==='chase'){if(b.actor!==s.role)go(s,a,v,dt);if(b.victim!==s.role)go(s,v,{x:v.x+(v.x-a.x)*2,y:v.y+(v.y-a.y)*2+30},dt);}if(b.left<=0){v.sad=8;v.bubble='Det var inte snällt…';v.goal={x:Math.max(100,Math.min(2300,v.x+(v.x-a.x)*3+120)),y:Math.max(100,Math.min(2050,v.y+260))};v.status='Ledsen, går iväg';s.stats.teases++;s.brawl=null;}}
 else{
 const g=s.actors.ghost,l=s.actors.tall;s.nextScene-=dt;
 if(s.role==='human'&&s.nextScene<=0){const t=nearestTree(s,{x:(g.x+l.x)/2,y:(g.y+l.y)/2});if(t)startScene(s,s.sceneIndex++%2===0?'fell':'throw',t);}
 else if(distance(g,l)<(s.phase==='night'?300:225)&&s.brawlCooldown<=0&&g.sad<=0&&l.sad<=0){startBrawl(s,random(s)<.5?'ghost':'tall',random(s)<.5?'tease':'chase');}
 else for(const id of ['ghost','tall'])if(id!==s.role&&!s.tasks[id])monsterBot(s,id,dt);
 }
 const h=s.actors.human;if(!s.scene&&!s.brawl&&!isSafe(h)&&(s.phase==='night'||h.y<650))for(const id of ['ghost','tall']){const a=s.actors[id];if(a.z<5&&a.sad<=0&&distance(a,h)<30){s.mode='caught';say(s,s.role==='human'?'Hittad! Vi tar en ny dag.':'Du hittade människan! Vi tar en ny dag.');break;}}
}
export function step(s,ms,input={x:0,y:0}){let remaining=Math.max(0,ms/1000);while(remaining>1e-8){const dt=Math.min(1/60,remaining);update(s,dt,input);remaining-=dt;}return s;}
export function snapshot(s){const p=s.actors[s.role];return {version:s.version,mode:s.mode,role:s.role,coordinates:'World units; origin top-left; +x right, +y down (forest is north).',world:WORLD,time:+s.time.toFixed(2),phase:s.phase,day:s.day,secondsLeft:Math.max(0,Math.ceil((s.phase==='day'?180:120)-s.phaseTime)),nights:s.nights,player:{id:s.role,x:+p.x.toFixed(1),y:+p.y.toFixed(1),z:p.z,safe:s.role==='human'&&isSafe(p)},inventory:{tools:s.tools,tinder:s.tinder,wood:s.logs},fire:{...FIRE,seconds:+s.fire.toFixed(1)},actors:Object.values(s.actors).map(a=>({id:a.id,x:+a.x.toFixed(1),y:+a.y.toFixed(1),z:+a.z.toFixed(1),status:a.status,sad:a.sad>0,eyes:a.id==='ghost'?'plus':a.id==='tall'?'black':'normal',controlled:a.id===s.role})),action:actionInfo(s),task:s.tasks[s.role]||null,tasks:Object.values(s.tasks),brawl:s.brawl,scene:s.scene,stats:s.stats,nearbyTrees:s.trees.filter(t=>distance(p,t)<500).map(t=>({id:t.id,x:t.x,y:t.y,fallen:t.fallen,wood:t.wood})),landmarks:{cabin:{...CABIN,closed:true},safe:SAFE,tables:TABLES,wood:WOOD},notice:s.noticeTime>0?s.notice:'',input:s.input};}
