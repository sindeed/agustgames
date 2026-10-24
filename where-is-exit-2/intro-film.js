import * as THREE from '../where-is-exit/vendor/three.module.js';
import { createFactoryIntro, INTRO_TIMES } from '../where-is-exit/intro.js';

const DURATION = 24;
const canvas = document.getElementById('film');
const caption = document.getElementById('caption');
const playButton = document.getElementById('play');
const seek = document.getElementById('seek');
const clock = document.getElementById('clock');
const loading = document.getElementById('loading');
const material = (color, options={}) => new THREE.MeshStandardMaterial({color,roughness:0.82,flatShading:true,...options});
const blue=material(0x126cbd), navy=material(0x0a3359), skin=material(0xe6b789), yellow=material(0xf5c743), black=material(0x080b0e), metal=material(0x526a76), wood=material(0x624533), leaf=material(0x18382f);
const box=(parent,w,h,d,x,y,z,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const cyl=(parent,top,bottom,h,x,y,z,mat,sides=8)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,sides),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
function limb(parent,size,position,mat){const root=new THREE.Group();root.position.set(...position);parent.add(root);box(root,...size,0,-size[1]/2,0,mat);return root;}
function buildPlayer(parent){
 const a=new THREE.Group();parent.add(a);
 box(a,1.15,1.55,.68,0,2.15,0,blue);const head=new THREE.Mesh(new THREE.SphereGeometry(.57,18,14),skin);head.position.y=3.38;a.add(head);
 cyl(a,.67,.55,.35,0,3.88,0,yellow,18);box(a,1.45,.12,.8,0,3.79,.12,yellow);
 a.userData.leftArm=limb(a,[.34,1.45,.34],[-.78,2.78,0],navy);
 a.userData.rightArm=limb(a,[.34,1.45,.34],[.78,2.78,0],navy);
 a.userData.leftLeg=limb(a,[.42,1.5,.45],[-.34,1.38,0],navy);
 a.userData.rightLeg=limb(a,[.42,1.5,.45],[.34,1.38,0],navy);
 box(a,.58,.25,.95,-.34,.12,.16,black);box(a,.58,.25,.95,.34,.12,.16,black);
 return a;
}
function buildSnabbis(parent){
 const a=new THREE.Group();parent.add(a);
 box(a,1.45,1.75,.85,0,2.15,0,black);const head=new THREE.Mesh(new THREE.SphereGeometry(.68,18,14),black);head.position.y=3.55;a.add(head);
 a.userData.leftArm=limb(a,[.38,1.65,.38],[-.93,2.78,0],black);
 a.userData.rightArm=limb(a,[.38,1.65,.38],[.93,2.78,0],black);
 a.userData.leftLeg=limb(a,[.46,1.65,.5],[-.37,1.45,0],black);
 a.userData.rightLeg=limb(a,[.46,1.65,.5],[.37,1.45,0],black);
 box(a,.65,.26,1.05,-.37,.13,.18,black);box(a,.65,.26,1.05,.37,.13,.18,black);
 a.scale.setScalar(.58);return a;
}
const old = createFactoryIntro(buildPlayer);
old.update(INTRO_TIMES.end);
const scene=old.scene, camera=old.camera;
const {actor,car,carTree,shadow,addTree}=old.props;
shadow.visible=false;actor.scale.setScalar(.58);scene.add(actor);
car.position.set(34,0,60);car.rotation.y=-.82;carTree.position.set(27,0,60);carTree.rotation.z=-1.42;
box(scene,220,.3,185,0,-.2,108,material(0x1b3329));
const rearDoor=new THREE.Group();scene.add(rearDoor);rearDoor.position.set(12,0,47.15);
box(rearDoor,5.2,6.9,.12,0,3.45,.03,black);box(rearDoor,.5,7.2,.6,-2.85,3.6,.3,metal);box(rearDoor,.5,7.2,.6,2.85,3.6,.3,metal);box(rearDoor,6.2,.6,.6,0,7.2,.3,material(0x4ba477));
const snabbis=buildSnabbis(scene), peek=buildSnabbis(scene);
const moon=new THREE.DirectionalLight(0xb9d6eb,2.3);moon.position.set(25,35,95);scene.add(moon);
const doorLight=new THREE.PointLight(0xffdfa0,140,28,2);doorLight.position.set(12,6.5,52);scene.add(doorLight);
for(let row=0;row<16;row++)for(const side of [-1,1]){
 addTree(24+side*(10+(row%3)*3),82+row*7,10+row%4,row);
 if(row>3)addTree(24+side*(22+row%4),82+row*7,12,row+1);
}
// The new forest is built with the same tree shapes/materials as the ending.
for(let i=0;i<14;i++){
 const x=i%2?40:-4;const z=104+Math.floor(i/2)*10;
 addTree(x,z,10+(i%4),i);
}
const gate=new THREE.Group();gate.position.set(24,0,140);scene.add(gate);
for(const side of [-1,1])for(let x=5;x<=47;x+=2.8){if(x>20.5&&x<27.5)continue;const post=box(gate,.17,4.7,.17,x-24,2.35,0,metal);post.castShadow=true;}
for(const y of [.55,2.15,4.3]){
 box(gate,17,.15,.15,-18.5,y,0,metal);box(gate,17,.15,.15,18.5,y,0,metal);
}
const gateDoor=new THREE.Group();gate.add(gateDoor);
for(let x=-3;x<=3;x+=1)box(gateDoor,.14,4.4,.14,x,2.2,0,metal);
for(const y of [.45,2.2,4.25])box(gateDoor,7.2,.16,.18,0,y,0,metal);
const lock=new THREE.Group();gateDoor.add(lock);lock.position.set(0,1.8,-.26);box(lock,.65,.7,.27,0,0,0,yellow);
const trunk=cyl(scene,.25,.55,10,14,5,128,wood,8);trunk.scale.set(1.2,1,1.2);
for(let h=0;h<3;h++)cyl(scene,0,3-h*.5,4,14,7+h*1.7,128,leaf,8);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,2));
let time=0,last=0,playing=true,endedSent=false;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const phase=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const smooth=n=>n*n*(3-2*n);
function runPose(a,t,running=true){const wave=running?Math.sin(t*12):0;a.userData.leftLeg.rotation.x=wave*.7;a.userData.rightLeg.rotation.x=-wave*.7;a.userData.leftArm.rotation.x=-wave*.55;a.userData.rightArm.rotation.x=wave*.35;}
function cameraAt(x,y,z,tx,ty,tz){camera.position.set(x,y,z);camera.lookAt(tx,ty,tz);}
function update(t){
 time=clamp(t,0,DURATION);const s=time;
 if(s>=DURATION&&!endedSent){endedSent=true;window.parent.postMessage({type:"where2-intro-ended"},location.origin);}
 seek.value=s.toFixed(1);clock.textContent=`0:${String(Math.floor(s)).padStart(2,'0')} / 0:24`;
 actor.visible=s<20.2;snabbis.visible=s>=6&&s<8.5;peek.visible=s>=20.3&&s<23.5;
 if(s<2){actor.position.set(12+5*phase(s,0,2),0,49+7*phase(s,0,2));actor.rotation.y=.9;runPose(actor,s);cameraAt(30,7,68,18,2.8,51);caption.textContent='Tidigare i Where Is Exit…';}
 else if(s<4){actor.position.set(22,0,56);actor.rotation.y=1.1;runPose(actor,s,false);cameraAt(49,7,54,30,2.4,59);caption.textContent='';}
 else if(s<8.5){const q=phase(s,4,7.3);actor.position.set(22+Math.sin(q*Math.PI*2)*4,0,56+84*q);actor.rotation.y=0;runPose(actor,s);snabbis.position.set(12,0,47.6+3.2*phase(s,6,7));runPose(snabbis,s,s>=6&&s<7);cameraAt(s<6?24:18,s<6?7:4.5,s<6?76:59,s<6?24:12,s<6?2.4:3.9,s<6?100:50);caption.textContent=s>=6?'Jag kommer att ta dig någon gång.':'';}
 else if(s<13){const q=phase(s,8.5,13);actor.position.set(24,0,100+28*q);actor.rotation.y=0;runPose(actor,s);cameraAt(36,6,113+23*q,24,2,120+22*q);caption.textContent='';}
 else if(s<16){actor.position.set(24,0,135);actor.rotation.y=0;runPose(actor,s,false);cameraAt(36,6,132,24,2.4,140);caption.textContent='Grinden är låst.';}
 else if(s<20.3){const q=smooth(phase(s,16,20.3));actor.position.set(24,5.5*Math.sin(Math.PI*q),135+9*q);actor.rotation.y=0;runPose(actor,s);cameraAt(34,6.5,135,24,3,140);caption.textContent='';}
 else{peek.position.set(14.2,0,128.5);peek.rotation.y=.45;runPose(peek,s,false);cameraAt(29,5.5,119,14,2.5,128);caption.textContent='';}
 camera.updateMatrixWorld(true);renderer.render(scene,camera);
 return {time:s,phase:s<8.5?'replay':s<13?'forest':s<20.3?'locked-gate':'shadow',snabbisVisible:snabbis.visible,shadowVisible:peek.visible,playerVisible:actor.visible};
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();update(time);}
new ResizeObserver(resize).observe(canvas);resize();
function frame(now){if(playing&&last)update(time+Math.min(.1,(now-last)/1000));last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
playButton.onclick=()=>{if(time>=DURATION)time=0;playing=!playing;playButton.textContent=playing?'Pausa':'Spela';};
document.getElementById('restart').onclick=()=>{time=0;playing=true;playButton.textContent='Pausa';update(0);};
seek.oninput=()=>{time=Number(seek.value);update(time);};
window.seekIntro=seconds=>{playing=false;playButton.textContent='Spela';return update(seconds);};
window.introSnapshot=()=>({time,phase:time<8.5?'replay':time<13?'forest':time<20.3?'locked-gate':'shadow'});
loading.hidden=true;
update(0);
