import * as THREE from '../where-is-exit/vendor/three.module.js';
import { FLOOR_PLANS, floorHasGround, platformPose } from '../where-is-exit/floor-plans.js';

const $ = id => document.getElementById(id);
const canvas=$('game'), menu=$('menu'), introScreen=$('introScreen'), endingScreen=$('endingScreen');
const hud=$('hud'), missionNumber=$('missionNumber'), missionText=$('missionText'), prompt=$('prompt'), notice=$('notice');
const touch=$('touch'), stick=$('stick'), knob=$('knob'), duck=$('duck'), fullscreen=$('fullscreen');
const coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
const clamp=THREE.MathUtils.clamp;
const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.18,...opts});
const M={floor:mat(0x626d72),metal:mat(0x596468,{metalness:.54,roughness:.44}),dark:mat(0x414b4f,{metalness:.58,roughness:.42}),light:mat(0x899398,{metalness:.5,roughness:.38}),orange:mat(0xe48a27),yellow:mat(0xf5ca3f),glow:mat(0xffd94d,{emissive:0xffb300,emissiveIntensity:2.5}),off:mat(0x655c3f),black:mat(0x000000,{roughness:.9,metalness:0}),blue:mat(0x2e8bd2),navy:mat(0x174f79),skin:mat(0xf0bd83),green:mat(0x47c47a,{emissive:0x0b4e25,emissiveIntensity:.55}),red:mat(0xc84e47,{emissive:0x5b100d,emissiveIntensity:.35}),wood:mat(0x624533,{roughness:.92,metalness:0}),leaf:mat(0x244638,{roughness:.95,metalness:0}),ground:mat(0x1b3329,{roughness:1,metalness:0}),sky:mat(0x76c4d4,{transparent:true,opacity:.42})};
function factoryTexture(base,fleck,lines=false){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);let seed=9341;for(let i=0;i<420;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;const y=seed%256;ctx.globalAlpha=.08+((seed>>>8)%12)/100;ctx.fillStyle=fleck;ctx.fillRect(x,y,1+seed%3,1+(seed>>>3)%3)}ctx.globalAlpha=1;if(lines){ctx.strokeStyle='rgba(20,26,28,.28)';ctx.lineWidth=2;for(let v=0;v<=256;v+=32){ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,256);ctx.moveTo(0,v);ctx.lineTo(256,v);ctx.stroke()}}const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(18,18);return tx}
M.factoryFloor=mat(0xffffff,{roughness:.9,metalness:.05,map:factoryTexture('#555c61','#d1c6ac',true)});
M.factoryWall=mat(0xffffff,{roughness:.82,metalness:.12,map:factoryTexture('#61666b','#d9e0dd')});
const box=(parent,w,h,d,x,y,z,material=M.metal)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
const cyl=(parent,a,b,h,x,y,z,material=M.metal,sides=8)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,sides),material);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o};
const sphere=(parent,r,x,y,z,material=M.black)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o};
function limb(parent,size,pos,material){const root=new THREE.Group();root.position.set(...pos);parent.add(root);box(root,...size,0,-size[1]/2,0,material);return root}
function playerModel(parent){const a=new THREE.Group();parent.add(a);box(a,1.15,1.55,.68,0,2.15,0,M.blue);sphere(a,.57,0,3.38,0,M.skin);cyl(a,.67,.55,.35,0,3.88,0,M.yellow,18);box(a,1.45,.12,.8,0,3.79,.12,M.yellow);a.userData.la=limb(a,[.34,1.45,.34],[-.78,2.78,0],M.navy);a.userData.ra=limb(a,[.34,1.45,.34],[.78,2.78,0],M.navy);a.userData.ll=limb(a,[.42,1.5,.45],[-.34,1.38,0],M.navy);a.userData.rl=limb(a,[.42,1.5,.45],[.34,1.38,0],M.navy);box(a,.58,.25,.95,-.34,.12,.16,M.black);box(a,.58,.25,.95,.34,.12,.16,M.black);return a}
function snabbisModel(parent){const a=new THREE.Group();parent.add(a);box(a,1.45,1.75,.85,0,2.15,0,M.black);sphere(a,.68,0,3.55,0,M.black);a.userData.la=limb(a,[.38,1.65,.38],[-.93,2.78,0],M.black);a.userData.ra=limb(a,[.38,1.65,.38],[.93,2.78,0],M.black);a.userData.ll=limb(a,[.46,1.65,.5],[-.37,1.45,0],M.black);a.userData.rl=limb(a,[.46,1.65,.5],[.37,1.45,0],M.black);box(a,.65,.26,1.05,-.37,.13,.18,M.black);box(a,.65,.26,1.05,.37,.13,.18,M.black);return a}
function enogatModel(parent){const a=new THREE.Group();parent.add(a);box(a,1.55,3.15,.95,0,4.35,0,M.black);sphere(a,.95,0,6.25,0,M.black);sphere(a,.27,-.3,6.37,.87,M.glow).scale.z=.38;sphere(a,.27,.3,6.37,.65,M.black).scale.z=.38;a.userData.la=limb(a,[.42,3.2,.42],[-1.08,5.3,0],M.black);a.userData.ra=limb(a,[.42,3.2,.42],[1.08,5.3,0],M.black);a.userData.ll=limb(a,[.52,3.25,.56],[-.45,3,0],M.black);a.userData.rl=limb(a,[.52,3.25,.56],[.45,3,0],M.black);a.scale.setScalar(.78);return a}
function eightLegs(parent){const a=new THREE.Group();parent.add(a);sphere(a,1.12,0,1.22,0,M.black).scale.set(1.3,.82,1.15);sphere(a,.76,0,1.42,1.06,M.black);for(const x of [-.28,.28])sphere(a,.17,x,1.6,1.7,M.glow);a.userData.legs=[];for(let i=0;i<8;i++){const side=i<4?-1:1,row=i%4,pivot=new THREE.Group();pivot.position.set(side*.72,1.22,-.78+row*.52);a.add(pivot);const upper=cyl(pivot,.13,.16,1.55,side*.68,-.25,0,M.black,9);upper.rotation.z=side*1.05;const lower=cyl(pivot,.11,.13,1.5,side*1.37,-.75,0,M.black,9);lower.rotation.z=side*.28;a.userData.legs.push(pivot)}return a}
function tree(parent,x,z,h=10){const root=new THREE.Group();root.position.set(x,0,z);parent.add(root);cyl(root,.22,.55,h,0,h/2,0,M.wood);for(let i=0;i<3;i++)cyl(root,0,3-i*.45,4,0,h*.48+i*1.6,0,M.leaf);return root}
function label(parent,text,x,y,z,color='#fff5d4'){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#071920cc';ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='900 48px system-ui';ctx.textAlign='center';ctx.fillText(text,256,83);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true}));s.position.set(x,y,z);s.scale.set(7.2,1.8,1);parent.add(s);return s}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:Boolean(navigator.webdriver)});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.25:1.7));renderer.shadowMap.enabled=true;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x101c2b);scene.fog=new THREE.Fog(0x263a3d,45,160);const camera=new THREE.PerspectiveCamera(73,1,.05,300);camera.rotation.order='YXZ';const hemi=new THREE.HemisphereLight(0xc8efff,0x405b34,1.85);scene.add(hemi);const amb=new THREE.AmbientLight(0xffe4bd,.92);scene.add(amb);const sun=new THREE.DirectionalLight(0xffefd1,2.65);sun.position.set(-28,46,18);sun.castShadow=true;sun.shadow.mapSize.set(coarse?1024:1536,coarse?1024:1536);sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;scene.add(sun);
let world=new THREE.Group();scene.add(world);
const armRig=new THREE.Group();armRig.position.set(.48,-.48,-1.05);camera.add(armRig);scene.add(camera);box(armRig,.2,.2,.78,-.48,-.08,.06,M.navy);sphere(armRig,.15,-.49,-.13,-.38,M.skin);box(armRig,.22,.22,.82,.25,-.1,.02,M.navy);sphere(armRig,.16,.29,-.16,-.42,M.skin);armRig.visible=false;
const keys=new Set(),touchHeld=new Set();let stickVal={x:0,y:0},stickId=null,lookId=null,lookLast={x:0,y:0};
const MONSTER_SPEED=3.4, FACTORY_X=-245, FACTORY_Z=35, RUN_X=68, RUN_Z=-152;
const state={mode:'menu',quest:1,player:{x:0,y:0,z:70,vy:0,yaw:0,pitch:0,grounded:true,support:null},time:0,message:'',messageEnd:0,flags:{maze:false,tower:false,rod:false,factory:false},rodCarried:false,corridor:{started:false,slowed:0,snabbisSlow:0,hits:0},endingTime:0,replay:[],factoryFloor:1,elevator:null};
let interactables=[],colliders=[],platforms=[],dangerPads=[],spider=null,snabbis=null,enogat=null,buskis=null,playerVisual=null,forestTrees=[],ramps=[],towerDecks=[],pillarLights=[],factoryLights=[],secretDoor=null,entranceDoor=null;
const QUESTS=['HITTA KNAPPEN I LABYRINTEN','TA PLATTORNA TILL DET ANDRA TORNET','KOPPLA IHOP ELPELARNA','TÄND LAMPORNA I FABRIKEN','SMIT FRÅN KRAFTVERKET'];
M.grass=mat(0x457f36,{roughness:1,metalness:0});M.bush=mat(0x245b2b,{roughness:1,metalness:0});
function say(message,duration=3){state.message=message;state.messageEnd=state.time+duration;notice.textContent=message}
function addInteract(id,name,x,y,z,onUse){interactables.push({id,name,x,y,z,onUse})}
function addWall(x,y,z,w,h,d,material=M.metal){const mesh=box(world,w,h,d,x,y,z,material);const collider={x,z,w,d,minY:y-h/2,maxY:y+h/2,enabled:true};colliders.push(collider);return {mesh,collider}}
function ground(w,d,x=0,z=0,y=-.25,material=M.floor){return box(world,w,.5,d,x,y,z,material)}
function factorySlab(rect,y,holes=[]){let pieces=[rect];for(const hole of holes){const next=[];for(const r of pieces){const l=r.x-r.w/2,h=r.x+r.w/2,n=r.z-r.d/2,s=r.z+r.d/2,hl=Math.max(l,hole.x-hole.w/2),hr=Math.min(h,hole.x+hole.w/2),hn=Math.max(n,hole.z-hole.d/2),hs=Math.min(s,hole.z+hole.d/2);if(hl>=hr||hn>=hs){next.push(r);continue}for(const [a,b,c,d] of [[l,hl,n,s],[hr,h,n,s],[hl,hr,n,hn],[hl,hr,hs,s]])if(b-a>.01&&d-c>.01)next.push({x:(a+b)/2,z:(c+d)/2,w:b-a,d:d-c})}pieces=next}for(const r of pieces)ground(r.w,r.d,FACTORY_X+r.x,FACTORY_Z+r.z,y-.25,M.factoryFloor)}
function addPillar(x,z,electric=false){const root=new THREE.Group();root.position.set(x,0,z);world.add(root);cyl(root,.7,.9,8,0,4,0,M.metal);cyl(root,1.2,1.2,.5,0,7.9,0,M.dark);const bulb=sphere(root,.7,0,8.3,0,electric?M.glow:M.off);pillarLights.push(bulb);return root}
function addButton(x,y,z,name,onUse){const root=new THREE.Group();root.position.set(x,y,z);world.add(root);box(root,1.6,1.8,.5,0,0,0,M.dark);box(root,.85,.85,.54,0,0,.1,M.glow);addInteract(name,name,x,y,z,onUse);return root}
function bush(parent,x,z,monster=false){const root=new THREE.Group();root.position.set(x,0,z);parent.add(root);for(const [dx,dz,r] of [[0,0,1.1],[-.7,.2,.8],[.65,.2,.85],[0,-.55,.8]]){const leaf=sphere(root,r,dx,1,dz,M.bush);leaf.scale.y=.85}if(monster){root.userData.eyes=new THREE.Group();root.add(root.userData.eyes);for(const x of [-.34,.34])sphere(root.userData.eyes,.16,x,1.12,1.01,M.glow);root.userData.eyes.visible=false;root.userData.legs=[];for(const x of [-.48,.48])root.userData.legs.push(limb(root,[.23,.65,.25],[x,.65,0],M.black))}return root}
function clearWorld(){scene.remove(world);world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material?.isSpriteMaterial){o.material.map?.dispose();o.material.dispose()}});world=new THREE.Group();scene.add(world);interactables=[];colliders=[];platforms=[];dangerPads=[];ramps=[];towerDecks=[];pillarLights=[];factoryLights=[];spider=null;snabbis=null;enogat=null;buskis=null;secretDoor=null;entranceDoor=null;playerVisual=null;forestTrees=[];sun.intensity=2.65;scene.fog.near=80;scene.fog.far=420;camera.far=650;camera.updateProjectionMatrix();scene.background.set(0x243a42);scene.fog.color.set(0x34494c);hemi.intensity=1.85;amb.intensity=.92}
function setQuest(n){state.quest=n;missionNumber.textContent=`UPPDRAG ${n} AV 5`;missionText.textContent=QUESTS[n-1]}
function buildMaze(){
 const left=-70,right=-30,north=-51,south=1;
 addWall(left,3.5,-25,.8,7,52);addWall(right,3.5,-25,.8,7,52);addWall(-50,3.5,north,40,7,.8);
 addWall(-62,3.5,south,16,7,.8);addWall(-38,3.5,south,16,7,.8);
 for(const [x,z,w] of [[-54.5,-10,31],[-45.5,-23,31],[-54.5,-36,31]])addWall(x,3.5,z,w,7,.8,M.dark);
 addButton(-63,1.6,-48,'LABYRINTKNAPP',()=>{if(state.flags.maze)return;if(state.quest!==1)return;state.flags.maze=true;pillarLights[0].material=M.glow;setQuest(2);say('PELAREN FICK EL! GÅ UT OCH HITTA STARTTORNET.')});
 enogat=enogatModel(world);enogat.position.set(-34,0,-4);enogat.userData.path=[[-34,-4],[-34,-17],[-66,-17],[-66,-30],[-34,-30],[-34,-44],[-64,-44],[-34,-44],[-34,-30],[-66,-30],[-66,-17],[-34,-17]];enogat.userData.index=1;
 label(world,'LABYRINT',-50,8,4);
}
function tower(x,z,stairs=false){
 for(const dx of [-17,17])for(const dz of [-7,7])box(world,.8,12,.8,x+dx,6,z+dz,M.light);
 box(world,36,.6,16,x,11.7,z,M.floor);towerDecks.push({x,z,w:36,d:16,y:12});
 if(stairs){const ramp={x,z0:z+8,z1:z+32,width:6,y0:12,y1:0};ramps.push(ramp);for(let i=0;i<24;i++){const h=(24-i)*.5;box(world,6,h,1,x,h/2,z+8+i+.5,M.orange)}label(world,'TRAPPOR UPP',x,3,z+32)}
}
function buildTower(){
 tower(38,44,true);tower(38,-24);label(world,'T2 · START',38,16,44);label(world,'TM · KNAPP',38,16,-24);
 for(let row=0;row<2;row++)for(let i=0;i<3;i++){const x=row===0?28:48,z=28-i*18,axis=i===2?'y':i===1?'z':'x',amp=i===2?.7:1.3;const mesh=box(world,14,.6,14,x,11.7,z,M.orange);platforms.push({mesh,x,z,baseY:11.7,axis,amp,phase:row*1.4+i,id:`tower-${row}-${i}`,row,tower:true})}
 spider=eightLegs(world);spider.scale.setScalar(.62);spider.userData.hop=0;spider.userData.order=[0,1,2,5,4,3];spider.position.set(28,12,28);
 addButton(38,13.6,-28,'TORNKNAPP',()=>{if(!state.flags.maze){say('HITTA LABYRINTKNAPPEN FÖRST');return}if(state.flags.tower)return;state.flags.tower=true;pillarLights[0].material=M.glow;setQuest(3);say('PELAREN LADDADES MER! HOPPA NER OCH HITTA METALLSTÅNGEN.')});
}
function buildPillars(){
 for(const x of [-5,4,13,22,31])addPillar(x,-62,false);
 const rod=box(world,.35,.35,4,-5,.7,22,M.light);rod.rotation.y=.35;
 addInteract('rod','METALLSTÅNG',-5,0,22,()=>{if(!state.flags.tower){say('LADDA PELAREN FRÅN TORNET FÖRST');return}if(state.rodCarried)return;state.rodCarried=true;rod.visible=false;say('DU TOG METALLSTÅNGEN. LÄGG DEN MELLAN DE TVÅ FÖRSTA PELARNA.')});
 addInteract('gap','MELLAN PELARNA',-.5,0,-62,()=>{if(state.flags.rod)return;if(!state.rodCarried){say('HITTA METALLSTÅNGEN FÖRST');return}state.flags.rod=true;box(world,9,.35,.35,-.5,1.5,-62,M.light);for(const bulb of pillarLights)bulb.material=M.glow;setQuest(4);say('ALLA PELARE FICK EL! FÖLJ SKOGSSTIGEN TILL FABRIKEN.',5)});
 label(world,'PELARNA',13,12,-62);
}
function buildForestAndFactory(){
 ground(98,12,-149,35,-.25,M.wood);ground(40,40,-181,35,-.25,M.ground);
 for(let i=0;i<17;i++)for(const side of [-1,1])tree(world,-108-i*5.2,35+side*(9+i%3*2),11+i%4);
 label(world,'TILL FABRIKEN',-103,5,35);label(world,'TRYGG SKOGSSTIG',-145,5,35);
 // The blue car and fallen tree remain where the first game's intro left them.
 const car=new THREE.Group();car.position.set(-177,0,47);world.add(car);box(car,3.3,.95,5.8,0,1,0,M.blue);box(car,3.05,.28,5.85,0,.64,0,M.black);const roof=box(car,3.1,.18,3.1,0,2.55,-.25,M.blue);roof.rotation.z=.15;for(const z of [1.23,-1.78])box(car,2.9,1.1,.08,0,1.96,z,M.sky);for(const x of [-1.48,1.48]){box(car,.08,1.1,2.9,x,1.96,-.25,M.sky);for(const z of [-1.7,1.2])box(car,.15,1.3,.17,x,1.93,z,M.blue)}for(const x of [-1,1])box(car,.7,.32,.16,x,1.22,2.95,M.off);for(const x of [-1.65,1.65])for(const z of [-1.8,1.8]){const wheel=cyl(car,.64,.64,.4,x,.63,z,M.black,12);wheel.rotation.z=Math.PI/2}const fallen=tree(world,-176,48,12);fallen.rotation.z=1.3;fallen.position.y=1;
 const fx=FACTORY_X,fz=FACTORY_Z;
 for(const side of [-1,1])addWall(fx,30,fz+side*55,110,60,.8,M.factoryWall);
 addWall(fx-55,30,fz,.8,60,110,M.factoryWall);
 addWall(fx+55,30,fz-29.5,.8,60,51,M.factoryWall);addWall(fx+55,30,fz+29.5,.8,60,51,M.factoryWall);
 // A visible doorway at the east facade leads directly onto floor one.
 addWall(fx+55,33,fz,.8,54,8,M.factoryWall);
 entranceDoor=addWall(fx+55,3,fz,.5,6,7.5,M.metal);box(entranceDoor.mesh,.1,6,.07,.28,0,0,M.dark);box(entranceDoor.mesh,.3,.75,.65,.4,.1,0,M.glow);box(world,1.5,.6,9,fx+55,7.3,fz,M.metal);box(world,.3,.2,2.8,fx+55.9,7.1,fz,M.glow);
 addInteract('factory-entry','FABRIKENS ENTRÉ',fx+58,0,fz,()=>{if(!state.flags.rod){say('KOPPLA IHOP PELARNA FÖRST');return}entranceDoor.mesh.visible=false;entranceDoor.collider.enabled=false;say('VÅNING 1. TA HISSEN ELLER TRAPPORNA TILL VÅNING 3.',4)});
 for(let z=-48;z<55;z+=12){if(Math.abs(z)>5)box(world,.7,59,.7,fx+55.6,29.5,fz+z,M.dark);for(const y of [12,23,34,45,56])box(world,.12,3,6,fx+55.45,y,fz+z+5,M.navy)}
 label(world,'FABRIKEN',fx+55,64,fz);label(world,'ENTRÉ · VÅNING 1',fx+59,8.5,fz);
 for(let floor=0;floor<3;floor++){
  const y=floor*10;
  const holes=floor===1?[{x:13,z:34.5,w:12,d:25},{x:-10,z:47,w:7,d:7}]:floor===2?[{x:16,z:34.5,w:6,d:25},{x:-10,z:47,w:7,d:7}]:[];
  if(floor<2)factorySlab({x:0,z:0,w:110,d:110},y,holes);else for(const area of FLOOR_PLANS[3].ground)factorySlab(area,y,holes);
  // The original third-floor suspended platforms are visible on the return visit.
  if(floor===2)for(const def of FLOOR_PLANS[3].platforms){const pose=platformPose(def,0);const mesh=box(world,def.w,.48,def.d,fx+pose.x,y+pose.y-.24,fz+pose.z,M.orange);platforms.push({mesh,id:`factory-${def.id}`,poseFn:()=>{const p=platformPose(def,state.time);return {x:fx+p.x,y:y+p.y-.24,z:fz+p.z}},factory:true})}
  for(const x of [-22,22]){const lamp=box(world,2,.3,3,fx+x,y+7.8,fz+45,state.flags.factory?M.glow:M.off);factoryLights.push(lamp)}
  if(floor===0){label(world,'MOTTAGNING · SORTERING',fx,6.3,fz-18);addWall(fx,.73,fz-12,18,1.45,4.2,M.wood);box(world,18.6,.25,4.7,fx,1.58,fz-12,M.orange);for(const x of [-16,16]){addWall(fx+x,.63,fz+7,7.5,1.25,3.4,M.metal);box(world,7.9,.2,3.8,fx+x,1.34,fz+7,M.yellow)}for(const [x,z] of [[-33,14],[-20,27],[4,29],[31,14]])addWall(fx+x,1.05,fz+z,3.2,2.1,3.2,M.wood);box(world,4,.06,70,fx,.04,fz+4,M.yellow)}
  if(floor===1){label(world,'MASKINHALL · KYLSYSTEM',fx,y+6.3,fz-18);for(const [x,z] of [[-24,-18],[0,-18],[24,-18],[-24,8],[0,8],[24,8]]){addWall(fx+x,y+1.75,fz+z,8,3.5,7,M.dark);cyl(world,1,1,4,fx+x,y+2,fz+z,M.light)}for(const x of [-42,42])for(const z of [-16,4,24]){cyl(world,2.5,2.8,5.8,fx+x,y+2.9,fz+z,M.sky);cyl(world,.55,.65,7.2,fx+x,y+3.6,fz+z,M.light)}}
  label(world,`VÅNING ${floor+1}`,fx-10,y+6,fz+49);
 }
 // Two physical stair flights connect the first floor to the third-floor bank.
 for(const [x,z0,z1,y0,y1] of [[10,22,47,10,0],[16,22,47,10,20]]){ramps.push({x:fx+x,z0:fz+z0,z1:fz+z1,width:6,y0,y1,factory:true});for(let i=0;i<25;i++){const h=y0+(y1-y0)*(i+.5)/25;box(world,6,.5,1,fx+x,h-.25,fz+z0+i+.5,M.orange)}}
 ground(110,110,fx,fz,29.75,M.dark);
 label(world,'TRAPPOR TILL 3',fx+10,3,fz+49);
 const lift=ground(7,7,fx-10,fz+47,-.25,M.orange);state.liftMesh=lift;
 for(const dx of [-4,4])box(world,.25,27,.25,fx-10+dx,13.5,fz+50,M.light);
 addInteract('lift','HISS TILL VÅNING 3',fx-10,0,fz+47,()=>{if(state.elevator)return;state.elevator={x:fx-10,z:fz+47,y:0,target:20};state.player.x=fx-10;state.player.z=fz+47;say('HISSEN ÅKER TILL VÅNING 3')});
 ground(14,12,fx-24,fz+45,19.75,M.factoryFloor);ground(19,19,fx-38,fz+45,19.75,M.factoryFloor);
 for(const [x,z,w,d] of [[-47.5,45,.8,19],[-38,35.5,19,.8],[-38,54.5,19,.8],[-28.5,38,1,6],[-28.5,52,1,6]])addWall(fx+x,23,fz+z,w,6,d,M.factoryWall);
 secretDoor=addWall(fx-28.5,22.5,fz+45,1,5,7.5,M.orange);
 addInteract('secret','HEMLIG DÖRR',fx-27,20,fz+45,()=>{secretDoor.mesh.visible=false;secretDoor.collider.enabled=false;say('HEMLIGT RUM: UNDVIK GOLVKNAPPARNA!')});
 for(const [x,z] of [[-34,40],[-38,40],[-42,40],[-34,45],[-38,45],[-34,50],[-38,50],[-42,50]]){const mesh=box(world,2,.12,2,fx+x,20.02,fz+z,M.red);dangerPads.push({x:fx+x,z:fz+z,y:20,r:1.4,mesh,kind:'floor'})}
 ground(19,19,fx-38,fz+45,27.75,M.dark);
 const wallButton=addButton(fx-44,21.7,fz+45,'VÄGGKNAPP',()=>{if(state.flags.factory)return;state.flags.factory=true;for(const lamp of factoryLights)lamp.material=M.glow;setQuest(5);const p=state.player;p.x=fx+62;p.y=0;p.z=fz;p.vy=0;p.yaw=-Math.PI/2;p.pitch=0;p.support=null;state.elevator=null;say('LAMPORNA TÄNDS! GÅ STIGEN TILLBAKA TILL KRAFTVERKET.',5)});wallButton.rotation.y=Math.PI/2;
 label(world,'HEMLIGT RUM',fx-38,26,fz+44);
}
function buildCorridor(){
 const x=RUN_X,offset=RUN_Z;
 addWall(x,3.5,-72,14,7,12,M.dark);box(world,16,.7,14,x,7.3,-72,M.orange);box(world,4,5,.35,x,2.5,-65.8,M.light);for(const side of [-1,1])box(world,2.1,2,.4,x+side*4.5,3.7,-65.75,M.glow);label(world,'ELHUS · FLYKT',x,9,-72);
 ground(16,140,x,offset,-.25,M.floor);for(const side of [-1,1]){const fence=addWall(x+side*8,2,offset,.3,4,140,M.light);fence.mesh.visible=false;for(let z=-68;z<=68;z+=4)box(world,.14,4,.14,x+side*8,2,offset+z,M.light);for(const y of [.4,2.1,3.8])box(world,.14,.14,140,x+side*8,y,offset,M.light)}
 for(const localZ of [40,20,0,-20,-40]){const z=localZ+offset;for(const px of [-5,5]){cyl(world,.45,.6,5,x+px,2.5,z,M.dark);sphere(world,.6,x+px,5.3,z,M.glow)}const kind=[40,0,-40].includes(localZ)?'jump':'crouch';box(world,10,.45,.5,x,kind==='jump'?.65:2.4,z,M.glow);dangerPads.push({z,kind,hit:false})}
 addWall(x,4,offset-69,16,8,.5,M.dark);box(world,5,7,.3,x,3.5,offset-68.6,M.orange);label(world,'PORT',x,9,offset-68);
 addInteract('gate','ÖPPNA PORTEN',x,0,offset-67,()=>{if(state.corridor.started&&state.player.z<offset-62)winGame()});snabbis=snabbisModel(world);snabbis.position.set(x,0,offset+68);snabbis.scale.setScalar(.7);snabbis.visible=false;
}
function buildConnectedWorld(){
 clearWorld();ground(200,180,0,0,-.25,M.grass);
 // The west opening is for the safe forest path; the north opening is the finale.
 addWall(100,2,0,.6,4,180,M.dark);addWall(0,2,90,200,4,.6,M.dark);
 addWall(-100,2,-30.5,.6,4,119,M.dark);addWall(-100,2,68.5,.6,4,43,M.dark);
 addWall(-20,2,-90,160,4,.6,M.dark);addWall(91,2,-90,18,4,.6,M.dark);
 for(let i=0;i<25;i++){const x=-86+(i*37)%173,z=-78+(i*53)%157;if(x>-75&&x<-25&&z<10||x>17&&x<59||Math.abs(z-35)<10&&x<-70)continue;tree(world,x,z,8+i%4)}
 for(const [x,z] of [[-18,10],[-8,42],[-26,55],[4,8],[72,30],[80,60],[-80,63],[-83,-65],[3,65],[-15,-44],[60,-48]])bush(world,x,z);
 buskis=bush(world,6,36,true);buskis.userData.path=[[6,36],[-18,55],[-81,61],[-82,-64],[3,-43],[78,-45],[81,61]];buskis.userData.index=1;buskis.userData.pause=2;buskis.userData.mode='bush';
 buildPillars();buildMaze();buildTower();buildForestAndFactory();buildCorridor();
 label(world,'KRAFTVERKET',0,8,80);label(world,'TORNEN',38,4,78);
}
function startGame(){state.mode='playing';state.time=0;state.flags={maze:false,tower:false,rod:false,factory:false};state.rodCarried=false;state.elevator=null;state.corridor={started:false,slowed:0,snabbisSlow:0,hits:0};state.replay=[];Object.assign(state.player,{x:0,y:0,z:70,vy:0,yaw:0,pitch:0,grounded:true,support:null,lastGroundedAt:0});menu.hidden=true;introScreen.hidden=true;endingScreen.hidden=true;hud.hidden=false;touch.hidden=!coarse;fullscreen.hidden=false;duck.hidden=true;stick.hidden=false;document.querySelector('[data-action="sprint"]').hidden=false;buildConnectedWorld();setQuest(1);say('GÅ TILL LABYRINTENS ENDA INGÅNG.',4);canvas.focus()}
function showMenu(){state.mode='menu';menu.hidden=false;introScreen.hidden=true;endingScreen.hidden=true;hud.hidden=true;touch.hidden=true;fullscreen.hidden=true;duck.hidden=true;clearWorld();buildMenuForest()}
function buildMenuForest(){ground(150,150,0,0,-.3,M.ground);for(let i=0;i<42;i++){const x=((i*37)%137)-68,z=((i*61)%137)-68;if(Math.abs(x)<8&&z>0&&z<35)continue;tree(world,x,z,9+i%6)}scene.background.set(0x101c2b);camera.position.set(0,5,35);camera.lookAt(0,2,0)}
function startIntro(){menu.hidden=true;introScreen.hidden=false;$('introFrame').src='intro-film.html';state.mode='intro'}
function use(){if(state.mode!=='playing'||state.elevator)return;if(state.corridor.started&&state.player.z<RUN_Z-62){winGame();return}let nearest=null,best=3.6;for(const a of interactables){const d=Math.hypot(a.x-state.player.x,a.y-state.player.y,a.z-state.player.z);if(d<best){best=d;nearest=a}}if(nearest)nearest.onUse();else say('INGET ATT TA HÄR',1.4)}
function inGrass(x,z){return x>-99&&x<99&&z>-89&&z<89}
function inMaze(x,z){return x>-70&&x<-30&&z>-51&&z<1}
function inFactory(x,z){return x>FACTORY_X-55&&x<FACTORY_X+55&&Math.abs(z-FACTORY_Z)<55}
function zone(){const p=state.player;if(inFactory(p.x,p.z))return 'factory';if(p.x<-100)return 'forest-path';if(state.corridor.started)return 'corridor';if(inMaze(p.x,p.z))return 'maze';return 'grass'}
function walkable(x,z){return inGrass(x,z)||(x>=FACTORY_X+55&&x<=-99&&Math.abs(z-35)<6)||(x>=-201&&x<=-160&&Math.abs(z-35)<20)||inFactory(x,z)||(Math.abs(x-RUN_X)<7.6&&z<=-88&&z>RUN_Z-69)}
function isBlocked(x,z,y=state.player.y){return !walkable(x,z)||colliders.some(c=>c.enabled&&y+1.55>c.minY&&y<c.maxY-.05&&Math.abs(x-c.x)<c.w/2+.5&&Math.abs(z-c.z)<c.d/2+.5)}
function surface(x,z,y){let best=0,platform=null;const consider=(height,id=null)=>{if(height<=y+.62&&height>=best){best=height;platform=id}};
 if(inFactory(x,z)){const lx=x-FACTORY_X,lz=z-FACTORY_Z,inStairwell=lx>=7&&lx<=19&&lz>=22&&lz<=47,inUpperStair=lx>=13&&lx<=19&&lz>=22&&lz<47,inLift=Math.abs(lx+10)<3.5&&Math.abs(lz-47)<3.5;if(!inStairwell&&!inLift)consider(10);if(!inUpperStair&&!inLift&&(floorHasGround(3,lx,lz)||Math.abs(lx+38)<9.5&&Math.abs(lz-45)<9.5||Math.abs(lx+24)<7&&Math.abs(lz-45)<6))consider(20);if(inLift&&state.liftMesh)consider(state.liftMesh.position.y+.25)}
 for(const r of ramps){if(Math.abs(x-r.x)<=r.width/2&&z>=r.z0&&z<=r.z1){const h=r.y0+(r.y1-r.y0)*(z-r.z0)/(r.z1-r.z0);consider(h)}}
 for(const deck of towerDecks)if(Math.abs(x-deck.x)<deck.w/2&&Math.abs(z-deck.z)<deck.d/2)consider(deck.y);
 for(const q of platforms)if(Math.abs(x-q.mesh.position.x)<q.mesh.geometry.parameters.width/2&&Math.abs(z-q.mesh.position.z)<q.mesh.geometry.parameters.depth/2)consider(q.mesh.position.y+q.mesh.geometry.parameters.height/2,q.id);
 return {height:best,platform}
}
function updatePlatforms(dt){for(const q of platforms){const old=q.mesh.position.clone();if(q.poseFn){const p=q.poseFn();q.mesh.position.set(p.x,p.y,p.z)}else{const shift=Math.sin(state.time*.65+q.phase)*q.amp;q.mesh.position.set(q.x,q.baseY,q.z);q.mesh.position[q.axis]+=shift}if(state.player.support===q.id&&state.player.grounded){state.player.x+=q.mesh.position.x-old.x;state.player.y+=q.mesh.position.y-old.y;state.player.z+=q.mesh.position.z-old.z}}
 if(spider){spider.userData.hop+=dt;const cycle=3.6,order=spider.userData.order,i=Math.floor(spider.userData.hop/cycle)%6,t=(spider.userData.hop%cycle)/cycle;const from=platforms.filter(q=>q.tower)[order[i]].mesh.position,to=platforms.filter(q=>q.tower)[order[(i+1)%6]].mesh.position;const travel=clamp((t-.35)/.45,0,1);spider.position.lerpVectors(from,to,travel);spider.position.y+=.35+Math.sin(Math.PI*travel)*4;spider.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);spider.userData.legs.forEach((leg,j)=>leg.rotation.y=Math.sin(state.time*5+j)*.14)}
}
function moveMonster(mesh,path,indexKey,dt,blocked=false){const data=mesh.userData,goal=path[data[indexKey]],dx=goal[0]-mesh.position.x,dz=goal[1]-mesh.position.z,d=Math.hypot(dx,dz);if(d<.15){data[indexKey]=(data[indexKey]+1)%path.length;return true}const amount=Math.min(d,MONSTER_SPEED*dt);const nx=mesh.position.x+dx/d*amount,nz=mesh.position.z+dz/d*amount;if(!blocked||!isBlocked(nx,mesh.position.z,0))mesh.position.x=nx;if(!blocked||!isBlocked(mesh.position.x,nz,0))mesh.position.z=nz;mesh.rotation.y=Math.atan2(dx,dz);return false}
function updateMonsters(dt){
 if(enogat){moveMonster(enogat,enogat.userData.path,'index',dt);enogat.userData.ll.rotation.x=Math.sin(state.time*6)*.3;enogat.userData.rl.rotation.x=-enogat.userData.ll.rotation.x}
 if(buskis){const p=state.player,d=Math.hypot(p.x-buskis.position.x,p.z-buskis.position.z),data=buskis.userData;const chasing=zone()==='grass'&&p.y<1.4&&d<11;
  if(chasing){data.mode='chase';const nx=buskis.position.x+(p.x-buskis.position.x)/Math.max(d,.01)*MONSTER_SPEED*dt,nz=buskis.position.z+(p.z-buskis.position.z)/Math.max(d,.01)*MONSTER_SPEED*dt;if(inGrass(nx,nz)&&!inMaze(nx,nz)){if(!isBlocked(nx,buskis.position.z,0))buskis.position.x=nx;if(!isBlocked(buskis.position.x,nz,0))buskis.position.z=nz}buskis.rotation.y=Math.atan2(p.x-buskis.position.x,p.z-buskis.position.z)}
  else if(data.pause>0){data.pause-=dt;data.mode='bush'}else{data.mode='patrol';if(moveMonster(buskis,data.path,'index',dt,true))data.pause=2.5}
  data.eyes.visible=data.mode!=='bush';data.legs.forEach((leg,i)=>{leg.visible=data.mode!=='bush';leg.rotation.x=data.mode==='bush'?0:Math.sin(state.time*7+i*Math.PI)*.35});
 }
}
function jump(){if(state.mode!=='playing'||state.elevator)return;const p=state.player;if(p.grounded||state.time-(p.lastGroundedAt??-100)<.15){p.vy=7.8;p.grounded=false;p.support=null}}
function resetAt(x,z,y,message){Object.assign(state.player,{x,z,y,vy:0,support:null,grounded:true});say(message,2)}
function updatePlayer(dt){const p=state.player;
 if(state.elevator){const lift=state.elevator;lift.y=Math.min(lift.target,lift.y+dt*3.5);p.x=lift.x;p.z=lift.z;p.y=lift.y;p.vy=0;p.support=null;state.liftMesh.position.y=lift.y-.25;if(lift.y>=lift.target){state.elevator=null;p.grounded=true;state.factoryFloor=3;say('VÅNING 3. DEN HEMLIGA DÖRREN ÄR BREDVID HISSEN.',4)}return}
 if(state.corridor.started){const slow=state.corridor.slowed>0?3.5:7.4;p.x=RUN_X;p.yaw=0;p.pitch=0;p.z=Math.max(RUN_Z-66,p.z-slow*dt);state.corridor.slowed=Math.max(0,state.corridor.slowed-dt);const crouch=keys.has('KeyC')||touchHeld.has('crouch');for(const hazard of dangerPads.filter(q=>q.kind!=='floor')){if(hazard.hit||p.z>hazard.z+.65||p.z<hazard.z-.65)continue;hazard.hit=true;if(!(hazard.kind==='jump'?p.y>.65:crouch)){state.corridor.slowed=1.7;state.corridor.hits++;say('ELEN TRÄFFADE DIG: DU BLIR LÅNGSAMMARE!',1.4)}else{state.corridor.snabbisSlow=1.6;say('SNABBIS TRÄFFADES AV ELEN!',1.4)}}snabbis.position.z-=dt*(state.corridor.snabbisSlow>0?3.5:6.8);state.corridor.snabbisSlow=Math.max(0,state.corridor.snabbisSlow-dt);if(snabbis.position.z-p.z<2.3){p.z=RUN_Z+60;snabbis.position.z=RUN_Z+68;state.corridor.slowed=0;state.corridor.snabbisSlow=0;dangerPads.filter(q=>q.kind!=='floor').forEach(q=>q.hit=false);say('SNABBIS HANN IKAPP! PROVA IGEN.',2)}snabbis.userData.ll.rotation.x=Math.sin(state.time*12)*.5;snabbis.userData.rl.rotation.x=-snabbis.userData.ll.rotation.x;
 const next=dangerPads.find(q=>q.kind!=='floor'&&!q.hit&&q.z<p.z);prompt.textContent=next&&p.z-next.z<10?`${next.kind==='jump'?'HOPPA':'DUCKA'}!`:p.z<RUN_Z-61?'TA SAK: ÖPPNA PORTEN':'';
 }else{
 const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stickVal.y,side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stickVal.x,length=Math.hypot(forward,side);
 if(length){const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')||touchHeld.has('sprint')?8.9:5)*dt/Math.max(1,length),dx=(-Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side)*speed,dz=(-Math.cos(p.yaw)*forward-Math.sin(p.yaw)*side)*speed;if(!isBlocked(p.x+dx,p.z))p.x+=dx;if(!isBlocked(p.x,p.z+dz))p.z+=dz}
 let nearest=null,best=3.6;for(const a of interactables){const d=Math.hypot(a.x-p.x,a.y-p.y,a.z-p.z);if(d<best){best=d;nearest=a}}prompt.textContent=nearest?`TA SAK: ${nearest.name}`:'';
 }
 const beforeY=p.y;p.vy-=17.5*dt;p.y+=p.vy*dt;const floor=surface(p.x,p.z,Math.max(beforeY,p.y));if(p.y<=floor.height&&p.vy<=0){p.y=floor.height;p.vy=0;p.grounded=true;p.lastGroundedAt=state.time;p.support=floor.platform}else{p.grounded=false;p.support=null}
 // Walking up stairs follows the tread; jumps still use gravity.
 if(p.grounded){const step=surface(p.x,p.z,p.y);if(step.height>p.y&&step.height-p.y<.62)p.y=step.height}
 if(inFactory(p.x,p.z)){state.factoryFloor=clamp(Math.floor((p.y+.5)/10)+1,1,3);hemi.intensity=state.flags.factory?1.3:.55;amb.intensity=state.flags.factory?.85:.25;sun.intensity=state.flags.factory?1.2:.4;if(state.quest===4)missionText.textContent=`VÅNING ${state.factoryFloor} · HITTA HEMLIGA RUMMET`;for(const pad of dangerPads.filter(q=>q.kind==='floor'))if(Math.abs(p.y-pad.y)<.7&&Math.hypot(p.x-pad.x,p.z-pad.z)<pad.r)resetAt(FACTORY_X-31,FACTORY_Z+45,20,'DU TRAMPADE PÅ EN GOLVKNAPP!')}
 else{hemi.intensity=1.85;amb.intensity=.92;sun.intensity=2.65;missionText.textContent=QUESTS[state.quest-1]}
 if(spider&&p.y>9&&Math.hypot(p.x-spider.position.x,p.z-spider.position.z)<1.6&&Math.abs(p.y-spider.position.y)<1.8)resetAt(38,44,12,'ÅTTABEN HITTADE DIG! PROVA IGEN.')
 if(enogat&&inMaze(p.x,p.z)&&Math.hypot(p.x-enogat.position.x,p.z-enogat.position.z)<1.7)resetAt(-50,5,0,'ENÖGAT HITTADE DIG! PROVA LABYRINTEN IGEN.')
 if(buskis&&zone()==='grass'&&p.y<1.2&&Math.hypot(p.x-buskis.position.x,p.z-buskis.position.z)<1.5){resetAt(0,70,0,'BUSKIS HITTADE DIG!');buskis.position.set(6,0,36);buskis.userData.pause=3}
 if(!state.corridor.started&&Math.abs(p.x-RUN_X)<7&&p.z<=RUN_Z+60){if(state.flags.factory){state.corridor.started=true;p.x=RUN_X;p.z=RUN_Z+60;p.y=0;p.yaw=0;snabbis.visible=true;duck.hidden=false;stick.hidden=true;document.querySelector('[data-action="sprint"]').hidden=true;state.replay=[];say('SNABBIS! HOPPA ELLER DUCKA FÖR ELEN!',3)}else{p.z=RUN_Z+60.5;say('TÄND FABRIKENS LAMPOR FÖRST',1.4)}}
 if(state.corridor.started){state.replay.push({quest:5,x:p.x-RUN_X,y:p.y,z:p.z-RUN_Z,mz:snabbis.position.z-RUN_Z,t:state.time});if(state.replay.length>1800)state.replay.shift()}
}

function animateCamera(){if(state.mode==='menu')return;const p=state.player;camera.position.set(p.x,p.y+1.62+(p.vy?0:.02*Math.sin(state.time*9)),p.z);camera.rotation.set(p.pitch,p.yaw,0);armRig.visible=state.mode==='playing'}
function update(dt){state.time+=dt;if(state.mode==='playing'){updatePlatforms(dt);updateMonsters(dt);updatePlayer(dt);animateCamera();if(state.message&&state.time>state.messageEnd){state.message='';notice.textContent=''}}else if(state.mode==='ending')updateEnding(dt)}
function makeEnding(){
 const route=state.replay.filter(frame=>frame.quest===5);
 state.endingRoute=route.length>2?route:[{x:0,y:0,z:60,mz:68},{x:0,y:0,z:-66,mz:-58}];
 clearWorld();state.endingTime=0;endingScreen.hidden=false;hud.hidden=true;touch.hidden=true;fullscreen.hidden=true;armRig.visible=false;
 scene.background.set(0x071122);scene.fog.color.set(0x101c2b);scene.fog.near=50;scene.fog.far=170;
 ground(150,220,0,-4,-.3,M.ground);ground(16,140,0,0,-.2,M.floor);
 for(const side of [-1,1]){for(let z=-68;z<=68;z+=3)box(world,.14,4,.14,side*8,2,z,M.light);for(const y of [.4,2.1,3.8])box(world,.14,.14,140,side*8,y,0,M.light)}
 for(const z of [40,20,0,-20,-40]){for(const x of [-5,5]){cyl(world,.45,.6,5,x,2.5,z,M.dark);sphere(world,.6,x,5.3,z,M.glow)}box(world,10,.45,.5,0,z===40||z===0||z===-40?.65:2.4,z,M.glow)}
 box(world,18,8,.7,0,4,-69,M.dark);box(world,5,7,.4,5,3.5,-68.5,M.orange);
 for(let i=0;i<24;i++){const x=(i%2?-1:1)*(12+(i%4)*5),z=-76-Math.floor(i/2)*4;tree(world,x,z,9+i%5)}
 playerVisual=playerModel(world);playerVisual.scale.setScalar(.58);snabbis=snabbisModel(world);snabbis.scale.setScalar(.58);
 const hiddenTree=tree(world,13,-91,12);const revealLight=new THREE.PointLight(0xa9cfff,85,24,2);revealLight.position.set(19,10,-84);world.add(revealLight);const hands=new THREE.Group();hiddenTree.add(hands);hands.position.set(2.5,1,1.5);for(const x of [1.35,2.45]){box(hands,.25,1.5,.25,x,4.6,0,M.black);box(hands,.78,.8,.3,x,5.65,0,M.black);for(let finger=0;finger<4;finger++)box(hands,.14,.7,.23,x-.27+finger*.18,6.35,0,M.black);const thumb=box(hands,.15,.55,.22,x-.45,5.55,0,M.black);thumb.rotation.z=-.6}hands.visible=false;state.endingHands=hands;state.mode='ending'
}
function updateEnding(dt){
 state.endingTime+=dt;const t=state.endingTime,cap=$('endingCaption');
 if(t<8){const route=state.endingRoute,idx=Math.min(route.length-1,Math.floor(t/8*(route.length-1))),f=route[idx];playerVisual.visible=true;snabbis.visible=true;state.endingHands.visible=false;playerVisual.position.set(f.x,f.y,f.z);snabbis.position.set(0,0,f.mz??f.z+8);const run=Math.sin(t*12);playerVisual.userData.ll.rotation.x=run*.7;playerVisual.userData.rl.rotation.x=-run*.7;snabbis.userData.ll.rotation.x=run*.7;snabbis.userData.rl.rotation.x=-run*.7;camera.position.set(14,6,f.z+8);camera.lookAt(f.x,f.y+2,f.z);cap.textContent=''}
 else if(t<12){const q=t-8;playerVisual.visible=true;snabbis.visible=false;playerVisual.position.set(0,0,-72-q*8);camera.position.set(18,6,-70-q*6);camera.lookAt(0,2,playerVisual.position.z);cap.textContent=''}
 else if(t<16){playerVisual.visible=false;snabbis.visible=true;snabbis.position.set(0,0,-70-(t-12)*1.8);camera.position.set(13,5,-81);camera.lookAt(0,2,snabbis.position.z);cap.textContent=t>=13.5?'Du smet igen. Vi ses igen någon gång.':''}
 else if(t<20){snabbis.visible=false;state.endingHands.visible=true;camera.position.set(23,9,-82);camera.lookAt(17,8,-91);cap.textContent=''}
 else{state.endingHands.visible=true;cap.textContent='FORTSÄTTNING FÖLJER';$('endMenu').hidden=false;state.mode='won'}
}
function winGame(){if(state.mode!=='playing')return;makeEnding()}
function frame(now){if(!frame.last)frame.last=now;const dt=Math.min(.05,(now-frame.last)/1000);frame.last=now;if(state.mode==='playing'||state.mode==='ending')update(dt);renderer.render(scene,camera);requestAnimationFrame(frame)}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(canvas);resize();
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='where2-intro-ended'&&state.mode==='intro')startGame()});$('start').onclick=startGame;$('intro').onclick=startIntro;$('skipIntro').onclick=startGame;$('endMenu').onclick=showMenu;$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else $('shell').requestFullscreen?.()};
window.addEventListener('keydown',e=>{keys.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Space'&&!e.repeat)jump();if(e.code==='KeyE'&&!e.repeat)use();if(e.code==='KeyF'&&!e.repeat)$('fullscreen').click()});window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('pointerdown',e=>{if(state.mode==='playing'){lookId=e.pointerId;lookLast={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)}});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookId||state.mode!=='playing'||state.corridor.started)return;const dx=e.clientX-lookLast.x,dy=e.clientY-lookLast.y;state.player.yaw-=dx*.005;state.player.pitch=clamp(state.player.pitch-dy*.004,-1.1,1.1);lookLast={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookId)lookId=null});
stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId)});stick.addEventListener('pointermove',e=>{if(e.pointerId!==stickId)return;const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,x=clamp((e.clientX-cx)/(r.width*.34),-1,1),y=clamp((e.clientY-cy)/(r.height*.34),-1,1);stickVal={x,y};knob.style.transform=`translate(${x*32}px,${y*32}px)`});for(const name of ['pointerup','pointercancel'])stick.addEventListener(name,e=>{if(e.pointerId===stickId){stickId=null;stickVal={x:0,y:0};knob.style.transform=''}});
for(const b of document.querySelectorAll('[data-action]')){const action=b.dataset.action;b.addEventListener('pointerdown',e=>{e.preventDefault();touchHeld.add(action);b.setPointerCapture(e.pointerId);if(action==='jump')jump();if(action==='interact')use()});for(const name of ['pointerup','pointercancel'])b.addEventListener(name,()=>touchHeld.delete(action))}
window.advanceTime=ms=>{const n=Math.max(1,Math.round(ms/(1000/60)));for(let i=0;i<n;i++)update(1/60);renderer.render(scene,camera)};
window.render_game_to_text=()=>JSON.stringify({version:'20261009-connected-1',coordinateSystem:'x right, y up, z south; forward faces negative z',mode:state.mode,quest:state.quest,zone:zone(),factoryFloor:zone()==='factory'?state.factoryFloor:null,mission:missionText.textContent,player:{x:+state.player.x.toFixed(2),y:+state.player.y.toFixed(2),z:+state.player.z.toFixed(2),yaw:+state.player.yaw.toFixed(2),grounded:state.player.grounded},nearby:interactables.filter(a=>Math.hypot(a.x-state.player.x,a.y-state.player.y,a.z-state.player.z)<7).map(a=>a.name),flags:state.flags,rodCarried:state.rodCarried,platforms:platforms.map(q=>({id:q.id,row:q.row,x:+q.mesh.position.x.toFixed(1),y:+q.mesh.position.y.toFixed(1),z:+q.mesh.position.z.toFixed(1)})),monsters:[enogat,buskis,spider,snabbis].map((m,i)=>m?({name:['Enögat','Buskis','Åttaben','Snabbis'][i],x:+m.position.x.toFixed(1),y:+m.position.y.toFixed(1),z:+m.position.z.toFixed(1),visible:m.visible,speed:i<2?MONSTER_SPEED:undefined,camouflaged:m===buskis&&m.userData.mode==='bush'}):null).filter(Boolean),corridor:state.corridor,elevator:state.elevator,endingTime:+state.endingTime.toFixed(1),message:state.message});
window.__whereIsExit2Test={startGame,setQuest,use,winGame,state,zone,isBlocked,surface,get scene(){return scene},get world(){return world},get camera(){return camera},get platforms(){return platforms},get monsters(){return {enogat,buskis,spider,snabbis}},get interactables(){return interactables},get colliders(){return colliders}};
buildMenuForest();requestAnimationFrame(frame);
