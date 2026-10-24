import {THREE,M,mat,box,cyl,sphere,tree,label,enogatModel,snabbisModel,eightLegs,mouthModel,playerModel} from './models.js?v=20261009-geography-3';
import {GYM,inGymHall} from './gym-layout.js?v=20261009-geography-3';
import {SUBJECTS} from './curriculum.js?v=20261009-geography-3';

const P={wall:mat(0x829796),plaster:mat(0xb4b9a5),floor:mat(0x536b69),wood:mat(0xa07b4d),chalk:mat(0x16483b),grass:mat(0x587954),line:mat(0xe8deac),red:mat(0xb65043),blue:mat(0x5c90ac),yellow:mat(0xdcb650),foam:mat(0x3c8eaa),pink:mat(0xbe7283),leaves:mat(0xb56c36),road:mat(0x4b5556)};
export const ROOM_SIZE=20;
export function createWorld(scene){
 const root=new THREE.Group();scene.add(root);
 const w={root,walls:[],surfaces:[],interacts:[],pieces:[],swings:[],spinners:[],slides:[],roomBoards:{},monsters:{},decor:[],ghost:null};
 const solid=(x,y,z,ww,hh,dd,material=P.wall,extra={})=>{const mesh=box(root,ww,hh,dd,x,y,z,material);const c={x,z,w:ww,d:dd,minY:y-hh/2,maxY:y+hh/2,enabled:true,mesh,...extra};w.walls.push(c);return c};
 const floor=(x,z,ww,dd,material=P.floor,y=0)=>box(root,ww,.3,dd,x,y-.15,z,material);
 const surface=(x,z,ww,dd,y,id)=>w.surfaces.push({x,z,w:ww,d:dd,y,id});
 const interact=(id,name,x,z,y=0,extra={})=>w.interacts.push({id,name,x,y,z,...extra});
 function wallWithDoor(x,z,length,axis,door,opening=4){
  const lo=(axis==='x'?x:z)-length/2,hi=lo+length;
  for(const [a,b] of [[lo,door-opening/2],[door+opening/2,hi]])if(b>a)solid(axis==='x'?(a+b)/2:x,3.7,axis==='z'?(a+b)/2:z,axis==='x'?b-a:.45,7.4,axis==='z'?b-a:.45);
  solid(axis==='x'?door:x,6.3,axis==='z'?door:z,axis==='x'?opening:.45,2.2,axis==='z'?opening:.45);
 }
 function boardText(subject){const c=document.createElement('canvas');c.width=1024;c.height=512;const t=c.getContext('2d');t.fillStyle='#153e34';t.fillRect(0,0,1024,512);t.textAlign='center';t.fillStyle='#ede9c6';t.font='bold 61px system-ui';t.fillText(subject.name.toUpperCase(),512,98);t.font='34px system-ui';const lines=subject.id==='math'?['7 × 6 =','8 × 4 =','9 × 7 =']:subject.id==='swedish'?['Sagan om fabriken','Ta boken. Skriv av berättelsen.']:subject.id==='english'?['monster · skola · bok','nyckel · skugga']:subject.id==='social'?['Stenåldern · Birka · Runor']:subject.id==='geography'?['Hitta I och E · Sveriges grannar','Var är monstren just nu?']:['Skogen · Rovdjur · Fjärilar'];lines.forEach((l,i)=>t.fillText(l,512,195+i*75));t.font='24px system-ui';t.fillStyle='#b4c2a3';t.fillText('PENNA OCH SUDD PÅ HYLLAN',512,467);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:tx})}
 function desk(x,z,angle=0){const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;root.add(group);box(group,2.6,.18,1.6,0,1.35,0,P.wood);for(const dx of [-1.05,1.05])for(const dz of [-.55,.55])box(group,.12,1.3,.12,dx,.65,dz,M.dark);box(group,1.1,.18,1,0,.75,1.55,P.wood);box(group,1.1,1,.15,0,1.3,2,P.wood);for(const dx of [-.42,.42])for(const dz of [1.2,1.9])box(group,.1,.7,.1,dx,.35,dz,M.dark);w.walls.push({x,z,w:2.5,d:1.5,minY:0,maxY:1.45,enabled:true});return group}
 function classroom(s){
  const {x,z}=s;floor(x,z,20,20,P.floor);solid(x,3.7,z-10,20,7.4,.45);solid(x,3.7,z+10,20,7.4,.45);solid(x+(x<0?-10:10),3.7,z,.45,7.4,20);wallWithDoor(x+(x<0?10:-10),z,20,'z',z,4);
  box(root,20,.22,20,x,7.52,z,P.plaster);
  const b=box(root,11,4,.25,x,3.65,z-9.55,P.wood);const writing=new THREE.Mesh(new THREE.PlaneGeometry(10.5,3.65),boardText(s));writing.position.set(x,3.65,z-9.4);root.add(writing);w.roomBoards[s.id]=writing;
  box(root,11,.15,.6,x,1.62,z-9.1,P.wood);box(root,.22,.22,.7,x-2,1.78,z-9.05,P.line);box(root,.65,.2,.4,x+2,1.78,z-9.05,M.dark);
  interact('board-'+s.id,'SKRIV PÅ TAVLAN',x,z-6.5,0,{subject:s.id,radius:4.3});
  for(const dx of [-4,3.5])for(const dz of [-1,4.5])desk(x+dx,z+dz,(dx<0&&dz>0)?.1:0);
  for(const zz of [-5,4]){box(root,.14,3.4,5,x+(x<0?-9.7:9.7),3.9,z+zz,M.sky);box(root,.3,.13,5.2,x+(x<0?-9.5:9.5),3.9,z+zz,P.plaster)}
  box(root,5,.12,1,x,7.2,z,M.off);box(root,4.8,.08,.8,x,7.1,z,mat(0xffefbd,{emissive:0xe8ddac,emissiveIntensity:.8}));
  label(root,s.name.toUpperCase(),x<0?-5.1:5.1,5.9,z,'#ffe7a6').scale.set(4,1,1);
  if(s.id==='swedish'){const book=box(root,1.3,.18,1.05,x-4,1.54,z-1,P.red);box(root,1.15,.08,.95,x-4,1.56,z-1,P.line);w.bookMesh=book;interact('book','TA SAGOBOKEN',x-4,z-1,0,{radius:3})}
 }
 floor(0,-2,10,104,P.floor);
 for(const s of SUBJECTS.filter(s=>s.id!=='gym'))classroom(s);
 // Close gaps between classrooms; each door is a real opening into the corridor.
 for(const [side,segments] of [[-5,[[-54,-26],[-6,0],[20,26],[46,50]]],[5,[[-54,-50],[-10,0],[20,26],[46,50]]]])for(const [a,b] of segments)solid(side,3.7,(a+b)/2,.45,7.4,b-a);
 box(root,10,.22,104,0,7.5,-2,P.plaster);
 for(let z=-46;z<48;z+=14){box(root,2,.12,.75,0,7.12,z,M.glow);for(const x of [-4.7,4.7]){box(root,.15,1.4,5,x,1.2,z,P.wood);for(let i=0;i<3;i++)box(root,.25,2,1.2,x,4,z-1.5+i*1.5,i%2?P.blue:P.yellow)}}
 label(root,'SKOLGÅRD',0,5.8,49);label(root,'MATSAL',0,5.8,-53);
 const gate=solid(0,3.5,-54,9.7,7,.4,P.wood,{id:'diningGate'});w.gate=gate;interact('dining','TILL MATSALEN',0,-51,0,{radius:4});
 // The hall itself is 160 × 100 = 16,000, exactly ten old 40 × 40 halls.
 // Extend east of the other school rooms; an entrance passage preserves the old door.
 const g=GYM;
 floor(g.x,g.z,g.w,g.d,P.wood);
 solid(g.x,4.6,g.minZ,g.w,9.2,.45);solid(g.x,4.6,g.maxZ,g.w,9.2,.45);
 solid(g.maxX,4.6,g.z,.45,9.2,g.d);
 wallWithDoor(g.minX,g.z,g.d,'z',g.passage.z,8);
 box(root,.45,1.8,g.d,g.minX,8.3,g.z,P.wall);
 box(root,g.w,.25,g.d,g.x,g.height,g.z,P.plaster);
 floor(g.passage.x,g.passage.z,g.passage.w,g.passage.d,P.wood);
 for(const z of [-25,-17])solid(g.passage.x,3.7,z,g.passage.w,7.4,.45);
 wallWithDoor(5,-20,20,'z',-21,4);
 box(root,20,.25,8,15,7.5,-21,P.plaster);
 label(root,'IDROTT →',8,5.5,-21).scale.set(5.2,1.2,1);
 // Repeated lights and court lines make the large distances visible without scaling props.
 for(const x of [45,75,105,135,165])for(const z of [-28,-60,-92])box(root,6,.1,1.2,x,9.1,z,M.glow);
 for(const z of [-104,-60,-16])box(root,148,.02,.16,105,.03,z,P.line);
 for(const x of [31,79,131,179])box(root,.16,.02,88,x,.03,-60,P.line);
 for(const x of [55,105,155]){const ring=new THREE.Mesh(new THREE.RingGeometry(8.9,9,48),P.line);ring.rotation.x=-Math.PI/2;ring.position.set(x,.035,-60);root.add(ring)}
 for(const z of [-24,-48,-72,-96])box(root,.12,2,12,g.maxX-.3,6.7,z,M.sky);
 label(root,'IDROTT',32,6,-22).scale.set(6,1.3,1);
 label(root,'BOLLAR · OÄNDLIGT',g.balls.x,4,-12.7).scale.set(6,1.5,1);
 box(root,4,1,2,g.balls.x,.5,-12.2,P.blue);for(let i=0;i<6;i++)sphere(root,.4,g.balls.x-1.5+(i%3)*1.1,1.3,-12.3-Math.floor(i/3)*.7,P.red);
 interact('gymBalls','TA BOLL',g.balls.x,g.balls.z,0,{radius:4});
 label(root,'MJUKA KUBER & MATTOR',g.supply.x,4,-12).scale.set(8,1.5,1);
 interact('buildSupply','BYGG MED KUBER OCH MATTOR',g.supply.x,g.supply.z,0,{radius:4});
 function gymPad(q,id,material,text){const mesh=box(root,q.w,1.8,q.d,q.x,.9,q.z,material);surface(q.x,q.z,q.w,q.d,1.8,id);w.walls.push({x:q.x,z:q.z,w:q.w,d:q.d,minY:0,maxY:1.8,enabled:true,id});label(root,text,q.x,4.4,q.z).scale.set(id==='gymGoal'?10:7,1.5,1);return mesh}
 gymPad(g.start,'gymStart',P.blue,'BYGGSTART');
 g.rests.forEach((q,i)=>gymPad(q,'gymRest-'+i,P.foam,'BYGG VIDARE'));
 w.gymGoal=gymPad(g.goal,'gymGoal',P.yellow,'MÅL · KURRAGÖMMA');
 // High beacons show the destination from the entrance and across the building course.
 box(root,.25,5,.25,g.goal.x,4.3,g.goal.z,M.glow);
 label(root,'← TILL KORRIDOREN',29,6,-21).scale.set(8,1.4,1);
 // Screens with return walls provide usable hiding nooks throughout the whole hall.
 // Their opening is on the north side; all walls are real vision/collision blockers.
 for(const {x,z} of g.hideouts){solid(x,1.75,z,6,3.5,.6,P.pink);for(const dx of [-3,3])solid(x+dx,1.75,z-2,.6,3.5,4,P.foam)}
 seedGymPieces(w);
 // Cafeteria and three kitchen aisles.
 floor(0,-69.5,44,31,P.floor);solid(-22,4,-69.5,.5,8,31);solid(22,4,-69.5,.5,8,31);
 wallWithDoor(0,-54,44,'x',0,10);wallWithDoor(0,-85,44,'x',0,5);box(root,44,.2,57,0,8.1,-82.5,P.plaster);
 for(const x of [-13,13])for(const z of [-64,-74]){solid(x,.8,z,9,1.6,3,P.wood);for(const dz of [-2.5,2.5])solid(x,.42,z+dz,9,.84,1,P.wood)}
 label(root,'MATSAL',0,6,-64);label(root,'KÖK →',0,5,-82);
 solid(-17,1.2,-81,6,2.4,2,M.light);cyl(root,.35,.35,.8,-17,2.6,-81,M.blue);interact('water','FYLL VATTEN · OÄNDLIGT',-17,-78,0,{radius:4});label(root,'DRICKSVATTEN',-17,4.5,-80).scale.set(5,1.1,1);
 floor(0,-98,44,26,M.light);solid(-22,4,-98,.5,8,26);solid(22,4,-98,.5,8,26);wallWithDoor(0,-111,44,'x',0,7);
 // The aisle junction is open; counters separate the three choices.
 for(const x of [-7,7])solid(x,2.7,-102,.5,5.4,18,P.wall);
 label(root,'← MATLAGNING',-14,5.8,-92).scale.set(6.5,1.4,1);label(root,'LASTKAJ ↑',0,5.8,-94).scale.set(5.5,1.2,1);label(root,'DISKINLÄMNING →',14,5.8,-92).scale.set(7.4,1.4,1);
 for(const x of [-18,18]){solid(x,1,-102,5,2,13,M.metal);for(let z=-107;z<-95;z+=4){box(root,3,.15,2,x,2.1,z,M.black);cyl(root,.6,.6,.4,x,2.4,z,M.light)}}
 // School yard.
 floor(0,92.5,130,85,P.grass);solid(-65,1.5,92.5,.5,3,85,P.wood);solid(65,1.5,92.5,.5,3,85,P.wood);solid(0,1.5,135,130,3,.5,P.wood);
 for(const x of [-35,35])solid(x,3.7,50,60,7.4,.5,P.wall);
 for(let i=0;i<14;i++)tree(root,-60+i*9,131,8+i%4);for(const x of [-60,60])for(let z=61;z<127;z+=16)tree(root,x,z,8);
 function swing(id,x,z,big){const group=new THREE.Group();group.position.set(x,0,z);root.add(group);for(const dx of [-3,3]){box(group,.22,big?6:4,.22,dx,big?3:2,0,M.metal);box(group,.22,big?6:4,.22,dx,big?3:2,1.2,M.metal)}box(group,7,.25,.3,0,big?6:4,.6,P.yellow);const pivot=new THREE.Group();pivot.position.set(0,big?5.8:3.8,.6);group.add(pivot);const len=big?3:2.7;for(const dx of [-1,1])cyl(pivot,.035,.035,len,dx,-len/2,0,M.light,5);const seat=box(pivot,big?3.4:2.4,.2,big?2:1,0,-len,0,big?P.blue:P.red);w.swings.push({id,x,z,big,group,pivot,len,height:big?5.8:3.8});interact(id,big?'GUNGA PÅ KOMPISGUNGAN':'GUNGA',x,z,0,{radius:3.6});label(root,big?'KOMPISGUNGA':'GUNGOR',x,big?7:5,z).scale.set(5.5,1.2,1)}
 swing('swing-small-1',-43,68,false);swing('swing-small-2',-32,68,false);swing('swing-big-1',-43,84,true);swing('swing-big-2',-31,84,true);
 function slide(id,x,z,h,len){
  // Identical gameplay speed for both lengths; the ramp is visibly connected.
  const group=new THREE.Group();group.position.set(x,0,z);root.add(group);
  box(group,3,.3,3,0,h,0,P.yellow);for(const dx of [-1.3,1.3])box(group,.18,h,.18,dx,h/2,0,M.metal);
  const slope=box(group,2.6,.18,Math.hypot(len,h),0,h/2,-len/2,P.blue);slope.rotation.x=-Math.atan2(h,len);
  for(const dx of [-1.4,1.4]){const rail=box(group,.16,.6,Math.hypot(len,h),dx,h/2+.3,-len/2,P.yellow);rail.rotation.x=-Math.atan2(h,len)}
  for(let i=0;i<h*2;i++)box(group,2,.14,.4,0,.5+i*.5,1.4+i*.22,M.metal);
  w.slides.push({id,x,z,h,len});interact(id,'KLÄTTRA UPP OCH ÅK',x,z+2,0,{radius:4});label(root,h>4?'STORA RUTSCHKANAN':'LILLA RUTSCHKANAN',x,h+2,z).scale.set(7,1.4,1);
 }
 slide('slide-small',-9,79,3.5,11);slide('slide-big',40,98,7,22);
 const hill=new THREE.Mesh(new THREE.ConeGeometry(16,6,24),P.grass);hill.position.set(40,2.9,107);root.add(hill);w.hill={x:40,z:107,r:16,h:6};
 // Climbing frame: walkable platforms, ladder interaction and a sloped ramp.
 for(const x of [8,20])for(const z of [67,79])box(root,.25,5,.25,x,2.5,z,M.metal);box(root,13,.3,13,14,3.8,73,P.wood);surface(14,73,13,13,3.95,'climber');
 for(let i=0;i<8;i++)box(root,2,.13,.4,14,.5+i*.48,80,M.metal);interact('climber','KLÄTTRA I STÄLLNINGEN',14,81,0,{radius:3});label(root,'KLÄTTERSTÄLLNING',14,6.5,73).scale.set(7,1.4,1);
 // Playhouse has open front and back and a usable, safe roof.
 const hx=-40,hz=112;floor(hx,hz,11,12,P.wood);solid(hx-5.5,1.8,hz,.3,3.6,12,P.red);solid(hx+5.5,1.8,hz,.3,3.6,12,P.red);wallWithDoor(hx,hz-6,11,'x',hx,4);wallWithDoor(hx,hz+6,11,'x',hx,4);
 const roof=box(root,12,.3,13,hx,3.65,hz,P.wood);surface(hx,hz,12,13,3.8,'houseRoof');
 // Low playhouse door lintels replace school-height pieces added above.
 for(const c of w.walls.filter(c=>Math.abs(c.z-hz)===6&&Math.abs(c.x-hx)<7)){if(c.minY>4){c.enabled=false;c.mesh.visible=false}else{c.maxY=3.5;c.mesh.scale.y=3.5/7.4;c.mesh.position.y=1.75}}
 for(let i=0;i<8;i++)box(root,1.8,.13,.35,hx+6.3,.4+i*.46,hz+2,M.metal);interact('houseRoof','KLÄTTRA TILL LEKSTUGANS TAK',hx+7,hz+2,0,{radius:3});label(root,'LEKSTUGA',hx,5.5,hz).scale.set(6,1.3,1);
 for(const [id,x,z] of [['spin-1',-11,100],['spin-2',7,114]]){const group=new THREE.Group();group.position.set(x,.5,z);root.add(group);cyl(group,2.3,2.3,.3,0,0,0,P.yellow,20);for(let i=0;i<4;i++){const a=i*Math.PI/2;box(group,.13,1.5,.13,Math.sin(a)*1.5,.85,Math.cos(a)*1.5,M.metal)}w.spinners.push({id,x,z,group});interact(id,'SNURRA',x,z,0,{radius:3})}
 // Ball shed, accessible and unlimited.
 solid(-18,1.5,125,6,3,3,P.wood);box(root,6.5,.2,4,-18,3.1,125,P.red);sphere(root,.45,-18,1.4,123,P.line);interact('yardBalls','TA FOTBOLL · OÄNDLIGT',-18,122,0,{radius:4});label(root,'BOLLFÖRRÅD',-18,4.5,125).scale.set(6,1.3,1);
 // Football court: active physics, dribbling, shots and opponent.
 floor(25,117,30,28,mat(0x416843),.04);for(const x of [10,40])box(root,.16,.02,28,x,.065,117,P.line);for(const z of [103,131,117])box(root,30,.02,.16,25,.065,z,P.line);
 for(const z of [103,131]){for(const x of [21,29])box(root,.17,3,.17,x,1.5,z,P.line);box(root,8,.17,.17,25,3,z,P.line);for(let i=0;i<9;i++)box(root,.035,3,.035,21+i,1.5,z+(z<117?-1:1),M.light)}
 interact('football','SPELA FOTBOLL MOT SNABBIS',25,119,0,{radius:5});label(root,'FÖRST TILL 3 MÅL',25,5,130).scale.set(7,1.4,1);
 // Loading dock and road toward the forest.
 floor(0,-123,44,24,P.road);floor(0,-174,13,80,P.road,.025);
 for(const x of [-1,1]){floor(x*45,-179,78,92,P.grass);for(let i=0;i<24;i++)tree(root,x*(12+(i%5)*8),-141-Math.floor(i/5)*16,9+i%5)}
 label(root,'LASTKAJ',0,6,-114).scale.set(6,1.4,1);
 const truck=new THREE.Group();truck.position.set(0,0,-128);root.add(truck);w.truck=truck;
 box(truck,5,.5,10,0,.8,0,M.dark);box(truck,5,3.3,3,0,2.5,-3.5,P.blue);box(truck,4.6,1.25,.08,0,3.1,-5.03,M.sky);
 box(truck,5,.2,7,0,1.2,1.5,P.wood);box(truck,5,.2,7,0,5.5,1.5,M.light);for(const x of [-2.5,2.5])box(truck,.15,4.3,7,x,3.35,1.5,M.light);box(truck,5,4.3,.15,0,3.35,-2,M.light);
 for(const x of [-2.6,2.6])for(const z of [-3.6,3.5]){const wheel=cyl(truck,.85,.85,.5,x,.85,z,M.black,12);wheel.rotation.z=Math.PI/2}
 label(truck,'NYCKEL · START',0,3,-1).scale.set(3,0.7,1);cyl(truck,.12,.12,.5,1.5,2.8,-1,M.glow);
 interact('truck','HOPPA IN I LASTUTRYMMET',0,-120.5,0,{radius:5});
 const leafpile=new THREE.Group();leafpile.position.set(-12,0,-181);root.add(leafpile);w.leafpile=leafpile;
 for(let i=0;i<22;i++){const a=i*2.4,r=1+(i%5)*.7;const leaf=sphere(leafpile,.9,Math.sin(a)*r,.2+Math.max(0,1-r/5),Math.cos(a)*r,i%2?P.leaves:P.yellow);leaf.scale.set(1.3,.35,1.2)}
 label(root,'SKOGEN',-30,5,-190).scale.set(6,1.4,1);
 w.monsters.enogat=enogatModel(root);w.monsters.enogat.position.set(0,0,-28);
 w.monsters.snabbis=snabbisModel(root);w.monsters.snabbis.position.set(32,0,62);
 w.monsters.spider=eightLegs(root);w.monsters.spider.position.set(GYM.spiderSpawn.x,0,GYM.spiderSpawn.z);
 w.monsters.mouth=mouthModel(root);w.monsters.mouth.position.set(8,0,-75);
 w.actor=playerModel(root);w.actor.scale.setScalar(.58);w.actor.visible=false;
 return w;
}
export function addPiece(w,type,x,z,bottom=0,rotated=false){w.navRevision=(w.navRevision||0)+1;const width=type==='cube'?2.4:4.8,depth=2.4,height=type==='cube'?1.8:.3;const mesh=box(w.root,rotated?depth:width,height,rotated?width:depth,x,bottom+height/2,z,type==='cube'?P.foam:P.pink);const p={id:'piece-'+(w.nextPieceId=(w.nextPieceId||0)+1),type,x,z,w:rotated?depth:width,d:rotated?width:depth,h:height,bottom,mesh,rotated};w.pieces.push(p);return p}
export function inRect(x,z,r){return Math.abs(x-r.x)<=r.w/2&&Math.abs(z-r.z)<=r.d/2}
export function zoneAt(x,z){if(inGymHall(x,z)||inRect(x,z,GYM.passage))return 'gym';for(const s of SUBJECTS.filter(s=>s.id!=='gym')){if(Math.abs(x-s.x)<=10&&Math.abs(z-s.z)<=10)return s.id}if(x>=-5&&x<=5&&z>=-54&&z<=50)return 'corridor';if(z>=50&&z<=135&&Math.abs(x)<=65)return 'yard';if(z<-54&&z>=-85&&Math.abs(x)<=22)return 'dining';if(z<-85&&z>=-111&&Math.abs(x)<=22)return 'kitchen';if(z<-111&&z>=-136&&Math.abs(x)<22)return 'loading';if(z<-136)return 'forest';return 'outside'}

export function seedGymPieces(w){
 for(const [x,z] of [[44,-19],[94,-100],[165,-32],[163,-101]]){
  for(let i=0;i<5;i++)addPiece(w,'cube',x+(i%3)*2.6,z-Math.floor(i/3)*2.8,0,false);
  for(let i=0;i<2;i++)addPiece(w,'mat',x+9+i*5,z,0,i===1);
 }
}
