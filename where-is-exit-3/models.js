import * as THREE from '../where-is-exit/vendor/three.module.js';
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

export function mouthModel(parent){
 const a=new THREE.Group();parent.add(a);
 box(a,1.55,3.15,.95,0,4.35,0,M.black);sphere(a,.95,0,6.25,0,M.black);
 const mouth=sphere(a,.52,0,6.0,1.0,M.glow);mouth.scale.set(.7,.9,.18);
 a.userData.la=limb(a,[.42,3.65,.42],[-1.08,5.3,0],M.black);
 a.userData.ra=limb(a,[.42,3.65,.42],[1.08,5.3,0],M.black);
 a.userData.ll=limb(a,[.52,3.25,.56],[-.45,3,0],M.black);
 a.userData.rl=limb(a,[.52,3.25,.56],[.45,3,0],M.black);
 a.userData.apron=box(a,1.45,1.85,.14,0,3.8,.53,mat(0xddd7b6));
 a.userData.tray=box(a,2.1,.13,1.3,-1.3,2.5,.8,M.light);
 a.scale.setScalar(.78);return a;
}
export function animateMonster(a,t,moving=true){
 const d=a.userData,s=moving?Math.sin(t*7)*.48:0;
 if(d.la){d.la.rotation.x=s;d.ra.rotation.x=-s;d.ll.rotation.x=-s;d.rl.rotation.x=s}
 if(d.legs)d.legs.forEach((l,i)=>l.rotation.y=moving?Math.sin(t*7+i)*.16:0);
}
export {THREE,M,mat,box,cyl,sphere,limb,playerModel,snabbisModel,enogatModel,eightLegs,tree,label};
