import * as THREE from './vendor/three.module.js';
import { FLOOR_PLANS, platformPose } from './floor-plans.js?v=20260907-holes-1';
import { createFactoryIntro, INTRO_TIMES } from './intro.js?v=20260907-ending-1';

export const ENDING_LINE = 'Jag kommer att ta dig någon gång.';
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const phase = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const angle = (a, b, n) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * n;

// This is a camera replay in a clone of the actual sixth-floor world, not a
// separately drawn approximation. Sampled game time also drives every S plate.
export function createFactoryEnding({ world, lights, fog, frames, buildPlayer, buildMonster }) {
  const ownedMaterials = new Set(), ownedTextures = new Set();
  const interior = new THREE.Scene();
  interior.background = new THREE.Color(fog.color);
  interior.fog = new THREE.Fog(fog.color, 32, 105);
  const map = world.clone(true);
  const materialCopies = new Map();
  map.traverse(object => {
    if (object.geometry) object.geometry = object.geometry.clone();
    if (object.material) {
      const copy = material => {
        if (!materialCopies.has(material)) {
          const cloned = material.clone();
          if (material.map) { cloned.map = material.map.clone(); cloned.map.needsUpdate = true; ownedTextures.add(cloned.map); }
          materialCopies.set(material, cloned); ownedMaterials.add(cloned);
        }
        return materialCopies.get(material);
      };
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
    }
  });
  interior.add(map);
  lights.forEach(light => interior.add(light.clone()));
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 280);
  const player = buildPlayer(interior), monster = buildMonster(); interior.add(monster);
  const mat = color => { const material = new THREE.MeshStandardMaterial({color,roughness:0.85,flatShading:true});ownedMaterials.add(material);return material; };
  const wood = mat(0x795434), metal = mat(0xaebbbd), dark = mat(0x0b1419), green = mat(0x4ba477);
  const box = (parent,w,h,d,x,y,z,material) => {const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  const hammer = actor => {
    const group = new THREE.Group(); actor.userData.rightArm.add(group);group.position.set(0,-1.05,0.2);
    box(group,0.16,0.16,1.6,0,0,0.7,wood);box(group,1.05,0.6,0.6,0,0,1.5,metal);return group;
  };
  hammer(player);
  const boards = new THREE.Group(); interior.add(boards);boards.position.set(19,0,-51);
  for(let i=-2;i<=2;i++){const b=box(boards,7.2,0.6,0.4,0,2.5+i*0.6,0,wood);b.rotation.z=i*0.08;b.userData.startY=b.position.y;}
  const replayFrames = frames.map(frame => ({...frame}));
  const first = replayFrames[0];
  const strikeIndex = replayFrames.findIndex(frame => frame.boardsBroken);
  const last = replayFrames[Math.max(0, strikeIndex < 0 ? replayFrames.length-1 : strikeIndex-1)];
  const sourceDuration = Math.max(0.05,last.t-first.t);
  const replayDuration = clamp(sourceDuration / 2.5, 8, 26);
  const arrivalDuration = 4;
  const outsideAt = arrivalDuration + replayDuration + 3.2;
  const duration = outsideAt + 16;
  const interpolate = t => {
    let lo=0,hi=replayFrames.length-1;
    while(lo+1<hi){const mid=(lo+hi)>>1;if(replayFrames[mid].t<=t)lo=mid;else hi=mid;}
    const a=replayFrames[lo],b=replayFrames[hi],n=clamp((t-a.t)/Math.max(0.001,b.t-a.t),0,1);
    return {...a,t,x:lerp(a.x,b.x,n),y:lerp(a.y,b.y,n),z:lerp(a.z,b.z,n),yaw:angle(a.yaw,b.yaw,n),
      mx:lerp(a.mx,b.mx,n),my:lerp(a.my,b.my,n),mz:lerp(a.mz,b.mz,n),mh:angle(a.mh,b.mh,n)};
  };
  const animate = (actor,t,running=true) => {
    const wave=running?Math.sin(t*12):0;
    actor.userData.leftLeg.rotation.x=wave*0.7;actor.userData.rightLeg.rotation.x=-wave*0.7;
    actor.userData.leftArm.rotation.x=-wave*0.55;actor.userData.rightArm.rotation.x=wave*0.35;
  };
  const plateModels=FLOOR_PLANS[6].platforms.map(def=>({def,group:map.getObjectByName(`platform:${def.id}`),ropes:[0,1,2,3].map(i=>map.getObjectByName(`rope:${def.id}:${i}`))}));
  const updatePlates=time=>plateModels.forEach(({def,group,ropes})=>{
    const p=platformPose(def,time);group?.position.set(p.x,p.y,p.z);
    let i=0;for(const sx of [-1,1])for(const sz of [-1,1]){const rope=ropes[i++];if(!rope)continue;const length=8.5-p.y;rope.position.set(p.x+sx*(def.w/2-0.22),p.y+length/2,p.z+sz*(def.d/2-0.22));rope.scale.y=length;}
  });

  // The same blue car and tree from the intro are visible on the wooded rear
  // side of the factory. No extra exit or elevator is added to playable maps.
  const outside = createFactoryIntro(buildPlayer);
  outside.update(INTRO_TIMES.end);
  const {actor:outPlayer,car,carTree,addTree,shadow}=outside.props;
  shadow.visible=false;outside.scene.add(outPlayer);outPlayer.scale.setScalar(0.58);
  hammer(outPlayer);
  car.position.set(34,0,60);car.rotation.y=-0.82;
  carTree.position.set(27,0,60);carTree.rotation.z=-1.42;
  box(outside.scene,220,0.3,170,0,-0.2,110,mat(0x1b3329));
  const door=new THREE.Group();outside.scene.add(door);door.position.set(12,0,47.15);
  box(door,5.2,6.9,0.12,0,3.45,0.03,dark);
  box(door,0.5,7.2,0.6,-2.85,3.6,0.3,metal);box(door,0.5,7.2,0.6,2.85,3.6,0.3,metal);
  box(door,6.2,0.6,0.6,0,7.2,0.3,green);
  const outMonster=buildMonster();outMonster.scale.setScalar(0.58);outside.scene.add(outMonster);
  const rearMoon=new THREE.DirectionalLight(0xb9d6eb,2.3);rearMoon.position.set(25,35,95);outside.scene.add(rearMoon);
  const rearDoorLight=new THREE.PointLight(0xffdfa0,140,28,2);rearDoorLight.position.set(12,6.5,52);outside.scene.add(rearDoorLight);
  for(let row=0;row<12;row++)for(const side of [-1,1]){
    addTree(24+side*(10+(row%3)*3),82+row*7,10+row%4,row);
    if(row>3)addTree(24+side*(22+row%4),82+row*7,12,row+1);
  }
  const bubbleCanvas=document.createElement('canvas');bubbleCanvas.width=768;bubbleCanvas.height=300;
  const ctx=bubbleCanvas.getContext('2d');
  ctx.fillStyle='#fff8df';ctx.strokeStyle='#152b31';ctx.lineWidth=10;
  ctx.beginPath();ctx.roundRect(8,8,752,240,32);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(325,242);ctx.lineTo(385,289);ctx.lineTo(423,242);ctx.fill();ctx.stroke();
  ctx.fillStyle='#152b31';ctx.textAlign='center';ctx.font='900 58px system-ui, sans-serif';
  ctx.fillText('Jag kommer att ta dig',384,103);ctx.fillText('någon gång.',384,179);
  const bubbleTexture=new THREE.CanvasTexture(bubbleCanvas);bubbleTexture.colorSpace=THREE.SRGBColorSpace;ownedTextures.add(bubbleTexture);
  const bubbleMaterial=new THREE.SpriteMaterial({map:bubbleTexture,transparent:true,depthTest:false});ownedMaterials.add(bubbleMaterial);
  const bubble=new THREE.Sprite(bubbleMaterial);bubble.scale.set(14,5.47,1);bubble.renderOrder=10;outside.scene.add(bubble);
  const sharedMaterials=new Set();[player,monster,outPlayer,outMonster].forEach(root=>root.traverse(o=>{
    if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!ownedMaterials.has(m))sharedMaterials.add(m);
  }));
  outside.scene.traverse(o=>{if(!o.material)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(!sharedMaterials.has(m)){ownedMaterials.add(m);if(m.map)ownedTextures.add(m.map);}
  }});
  let info;
  function update(seconds){
    const t=clamp(seconds,0,duration);const outdoors=t>=outsideAt;
    let phaseName='parkour-replay',sample=last;
    if(!outdoors){
      if(t<arrivalDuration){
        phaseName='arrive-from-T5';updatePlates(first.t);
        const stair=FLOOR_PLANS[6].stairs.down;
        if(t<1.3){const q=t/1.3;player.position.set(stair.x,lerp(3.06,0.34,q),stair.z+lerp(3.6,-3.6,q));player.rotation.y=Math.PI;}
        else {const q=phase(t,1.3,arrivalDuration);player.position.set(lerp(stair.x,first.x,q),lerp(0.34,first.y,q),lerp(stair.z-3.6,first.z,q));player.rotation.y=-Math.PI/2;}
        animate(player,t,true);monster.position.set(10,0,14);monster.rotation.y=Math.PI;animate(monster,t,false);
        camera.position.set(-2,7.1,39);camera.lookAt(5,2,25);
      }else if(t<arrivalDuration+replayDuration){
        sample=interpolate(first.t+sourceDuration*(t-arrivalDuration)/replayDuration);updatePlates(sample.t);
        player.position.set(sample.x,sample.y,sample.z);player.rotation.y=sample.yaw+Math.PI;
        animate(player,t,sample.moving||!sample.grounded);monster.position.set(sample.mx,sample.my,sample.mz);monster.rotation.y=sample.mh;animate(monster,t,true);
        const dx=Math.sin(sample.yaw),dz=Math.cos(sample.yaw);
        camera.position.set(clamp(sample.x+dx*7+dz*6,-49,49),Math.min(7.4,sample.y+6.2),clamp(sample.z+dz*7-dx*6,-49,49));
        camera.lookAt(sample.x,sample.y+1.8,sample.z);
        boards.children.forEach(b=>{b.position.y=b.userData.startY;});boards.visible=true;
      }else{
        const p=t-arrivalDuration-replayDuration;phaseName=p<1.5?'hammer-strike':'escape-through-exit';
        updatePlates(last.t+p);player.position.set(19,0,lerp(-48.2,-56,phase(p,1.5,3.2)));player.rotation.y=Math.PI;
        animate(player,t,p>=1.5);player.userData.rightArm.rotation.x=p<1.5?-Math.sin(phase(p,0,1.15)*Math.PI)*1.7:0.3;
        boards.visible=p<1.5;boards.children.forEach((b,i)=>{b.position.y=b.userData.startY-phase(p,0.75,1.5)*3.5;b.rotation.z=(i-2)*0.08+phase(p,0.75,1.5)*(i%2?0.7:-0.7);});
        // A cut to the exit shows the pursuer stopping at the doorway. No
        // jumping, wall-climbing or extra gameplay powers are given to it.
        monster.position.set(19,0,-43-3*phase(p,0,3.2));monster.rotation.y=Math.PI;animate(monster,t,true);
        camera.position.set(28,6.4,-42);camera.lookAt(19,2.3,-50);
      }
      monster.visible=true;player.visible=true;
    }else{
      const p=t-outsideAt;outPlayer.visible=p<9;outMonster.visible=p>=0.8;
      if(p<2){phaseName='outside-exit';outPlayer.position.set(lerp(12,22,p/2),0,lerp(49,56,p/2));outPlayer.rotation.y=0.9;animate(outPlayer,t,true);}
      else if(p<4){phaseName='see-broken-blue-car';outPlayer.position.set(22,0,56);outPlayer.rotation.y=1.1;animate(outPlayer,t,false);}
      else {phaseName=p<9?'run-deeper-into-forest':p<10.8?'monster-leaves-exit':'monster-speech';const q=phase(p,4,9);outPlayer.position.set(22+Math.sin(q*Math.PI*2)*4,0,56+84*q);outPlayer.rotation.y=0;animate(outPlayer,t,true);}
      outMonster.position.set(12,0,47.6+3.2*phase(p,9,10.8));outMonster.rotation.y=0;animate(outMonster,t,p>=9&&p<10.8);
      bubble.visible=p>=10.8&&p<16;bubble.position.set(12,5.1,outMonster.position.z);
      if(p<2){camera.position.set(30,7,68);camera.lookAt(18,2.8,51);}
      else if(p<4){camera.position.set(49,7,54);camera.lookAt(30,2.4,59);}
      else if(p<9){camera.position.set(24,7,76);camera.lookAt(24,2.4,100);}
      else {camera.position.set(18,4.5,59);camera.lookAt(12,3.9,50);}
    }
    camera.updateMatrixWorld(true);
    info={elapsed:+t.toFixed(3),duration:+duration.toFixed(3),replayDuration:+replayDuration.toFixed(3),outsideAt:+outsideAt.toFixed(3),phase:phaseName,
      floor:6,arrival:'T5 stairs, no elevator',arrivalDuration,sameMapAsGame:true,mapPlan:FLOOR_PLANS[6],routeSource:'recorded successful floor-six run',recordedFrames:replayFrames.length,sourceTime:sample.t,
      playerVisible:outdoors?outPlayer.visible:true,playerHasHammer:true,monster:'same black faceless monster',monsterOutside:outdoors&&t-outsideAt>=9,
      speech:outdoors&&bubble.visible?ENDING_LINE:'',carBroken:true,carColor:'blue',forest:'rear of factory',
      endingText:t>=duration?'Fortsättning följer':'',mapMeshCount:map.children.length,
      playerPosition:(outdoors?outPlayer:player).position.toArray(),monsterPosition:(outdoors?outMonster:monster).position.toArray(),
      cameraPosition:camera.position.toArray(),platforms:plateModels.map(({def,group})=>({id:def.id,position:group?.position.toArray()}))};
    return info;
  }
  update(0);
  const dispose=()=>{
    const geometries=new Set();[interior,outside.scene].forEach(root=>root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);}));
    geometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());ownedTextures.forEach(t=>t.dispose());
  };
  return {camera,update,snapshot:()=>info,scene:()=>info.elapsed>=outsideAt?outside.scene:interior,dispose};
}
