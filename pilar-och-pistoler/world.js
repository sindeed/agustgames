// Geometry is shared by rendering, movement, AI and projectiles. Feet use y=0.
export function makeWorld(kind='solo') {
 const w={kind,size:kind==='solo'?120:kind==='town'?54:68,boxes:[],floors:[],ramps:[],buildings:[],trees:[],gates:[],loot:[],spawns:[],decor:[]};
 const box=(x,y,z,sx,sy,sz,color,type='wall')=>{const b={x,y,z,sx,sy,sz,color,type};w.boxes.push(b);return b};
 const floor=(x,z,sx,sz,y,color)=>{w.floors.push({x,z,sx,sz,y,color});if(y>.1)box(x,y-.1,z,sx,.2,sz,color,'platform');};
 const ramp=(x,z,sx,sz,y0,y1)=>w.ramps.push({x,z,sx,sz,y0,y1});
 const house=(x,z,sx=14,sz=12,h=7,hotel=false,open=true)=>{
  const b={x,z,sx,sz,h,hotel,open};w.buildings.push(b);const c=hotel?0xe9c299:0xf2e3b5;
  if(!open)box(x,h/2,z,sx,h,sz,c,'house');
  else {box(x-sx/2,h/2,z,.6,h,sz,c);box(x+sx/2,h/2,z,.6,h,sz,c);box(x,h/2,z-sz/2,sx,h,.6,c);box(x-sx/4-1,h/2,z+sz/2,sx/2-2,h,.6,c);box(x+sx/4+1,h/2,z+sz/2,sx/2-2,h,.6,c);box(x,h-1.7,z+sz/2,4,3.4,.6,c);floor(x,z,sx,sz,.04,0xbaa17a);box(x+sx/3,.7,z-sz/3,2,1.4,2,0x815b43,'furniture');box(x+3,.8,z,2,1.6,1,0x6b5947,'furniture');}
  box(x,h+.25,z,sx+1,.5,sz+1,hotel?0x765f94:0xb66c56,'roof');floor(x,z,sx+1,sz+1,h+.5,hotel?0x765f94:0xb66c56);
 };
 if(kind==='solo'||kind==='town'){
  floor(0,0,w.size*2,w.size*2,0,0x80a85c);
  floor(0,0,14,w.size*2,.01,0xcbbb94);floor(0,0,w.size*2,12,.015,0xcbbb94);
  if(kind==='solo'){
   floor(0,0,52,48,.02,0xdac9a2);
   for(const [x,z] of [[-20,-19],[0,-25],[20,-19],[-23,17],[23,17]])house(x,z,13,11,7);
   for(const [x,z,h] of [[-64,-48,true],[60,-50,true],[-63,58,true],[64,58,true],[-88,0,false],[89,3,false],[0,82,false],[0,-86,false]])house(x,z,h?22:15,h?19:13,h?13:8,h);
   w.button={x:0,y:.8,z:0};box(0,.3,0,1.6,.6,1.6,0x786454,'pedestal');
  }else for(const [x,z] of [[-20,-20],[20,-20],[-20,20],[20,20],[-36,0],[36,0]])house(x,z,13,12,7,false,false);
  for(let i=0;i<(kind==='solo'?95:24);i++){const x=Math.sin(i*19.17)*w.size*.92,z=Math.cos(i*7.71)*w.size*.92;if(Math.abs(x)<31&&Math.abs(z)<33||w.buildings.some(b=>Math.abs(x-b.x)<b.sx/2+3&&Math.abs(z-b.z)<b.sz/2+3))continue;w.trees.push({x,z,size:2+(i%4),bush:i%3===0});if(i%3!==0)box(x,2,z,.7,4,.7,0x7a5b3d,'trunk');}
  for(let i=0;i<12;i++)w.spawns.push(kind==='solo'?{x:Math.sin(i*Math.PI/6)*12,z:Math.cos(i*Math.PI/6)*12,y:0}:{x:(i%6-2.5)*5,z:i<6?40:-40,y:0});
 }
 if(kind==='ships'){
  for(const side of [-1,1]){const z=side*35;
   floor(0,z,30,40,0,0x78563d); // actual enclosed lower hold
   // Deck leaves a stair opening on its east side.
   floor(-5,z,20,40,4,0xb98851);floor(12.5,z,5,40,4,0xb98851);floor(7.5,z-16,5,8,4,0xb98851);floor(7.5,z+12,5,16,4,0xb98851);
   ramp(7.5,z-4,5,16,0,4);
   for(const x of [-15,15])box(x,2,z,.7,5,40,0x6d4735);
   box(0,2,z+20,30,4,.7,0x6d4735);box(0,2,z-20,30,4,.7,0x6d4735);
   // Rail gaps lead physically onto all three bridges.
   for(const end of [-1,1]){box(-9,4.6,z+end*20,10,1.2,.5,0x95683d);box(9,4.6,z+end*20,10,1.2,.5,0x95683d);}
   box(-4,8,z,1,16,1,0x775236,'mast');w.decor.push({type:'sail',x:-4,y:12,z,side});
   for(const x of [-10,2])box(x,.65,z+8,2.5,1.3,1.6,0xaa793b,'chest');
   for(let i=0;i<6;i++)w.spawns.push({x:-10+(i%3)*6,z:z-7+Math.floor(i/3)*9,y:4});
  }
  floor(0,0,5,30,4,0xb98851);
  for(const side of [-1,1]){
   // Access arms from ship deck to the outer jumping lanes.
   for(const z of [-16,16])floor(side*17,z,12,5,4,0xb98851);
   for(const z of [-13,-4,5,14])floor(side*21,z,5,5,4,0xb98851);
  }
 }
 if(kind==='castle'){
  floor(0,0,125,130,0,0x8caa6a);floor(0,0,36,116,.01,0xc3b79c);
  for(const side of [-1,1]){
   const z=side*43;
   box(-22,4,z,1.3,8,35,0xa7a9aa);box(22,4,z,1.3,8,35,0xa7a9aa);box(0,4,z+side*17,44,8,1.3,0xa7a9aa);
   const front=z-side*17;
   box(-14,4,front,16,8,1.3,0xa7a9aa);box(14,4,front,16,8,1.3,0xa7a9aa);box(0,7,front,12,2,1.3,0xa7a9aa);
   const gate=box(0,3,front,10,6,.8,0x76523d,'gate');gate.open=false;w.gates.push(gate);
   for(const x of [-15,15]){
    // Each tower has a full physical staircase and a top firing platform.
    const rz=z-2;
    ramp(x,rz,6,24,0,9);floor(x,rz+15,9,6,9,0xb6b6ae);
    box(x-4.8,5,rz+3,.6,10,30,0x969ba5);box(x+4.8,5,rz+3,.6,10,30,0x969ba5);box(x,5,rz+18,10,10,.6,0x969ba5);
    for(const dx of [-4,0,4])box(x+dx,10,rz+18,2,2,1,0xc5c6bd,'battlement');
    w.decor.push({type:'flag',x,y:13,z:rz+15,side});
   }
   for(let i=0;i<6;i++)w.spawns.push({x:(i%3-1)*5,z:z-6+Math.floor(i/3)*6,y:0});
  }
  for(const [x,z] of [[-13,-9],[13,8],[-28,7],[27,-7]]){box(x,1.2,z,7,2.4,1.5,0xa1a6a5);}
  for(const [x,z] of [[-10,9],[10,-9]])box(x,1,z,3,2,5,0x8a6342,'wagon');
 }
 // Distribute all eleven non-Pipår weapons; duplicates make exploration worthwhile.
 const ids=[0,2,3,4,5,6,7,8,9,10,11];
 if(kind==='solo')for(let i=0;i<26;i++){const b=w.buildings[i%w.buildings.length];w.loot.push({id:ids[i%11],x:b.x+(i%2?3:-3),z:b.z-2,y:.5});}
 else for(let i=0;i<11;i++){const s=w.spawns[i%12];w.loot.push({id:ids[i],x:s.x+1.7,z:s.z+3,y:s.y+.5});}
 return w;
}
export function inRect(x,z,r,pad=0){return Math.abs(x-r.x)<r.sx/2+pad&&Math.abs(z-r.z)<r.sz/2+pad;}
export function rampHeight(r,z){return r.y0+(r.y1-r.y0)*Math.max(0,Math.min(1,(z-(r.z-r.sz/2))/r.sz));}
export function floorAt(w,x,z,feet=100){let y=-20;for(const f of w.floors)if(inRect(x,z,f)&&f.y<=feet+.5)y=Math.max(y,f.y);for(const r of w.ramps)if(inRect(x,z,r)){const h=rampHeight(r,z);if(h<=feet+.65)y=Math.max(y,h);}return y;}
export function collides(w,x,y,z,r=.42){return w.boxes.find(b=>!(b.type==='gate'&&b.open)&&!(['platform','roof'].includes(b.type)&&b.y+b.sy/2<=y+.65)&&inRect(x,z,b,r)&&y+1.7>b.y-b.sy/2+.05&&y<b.y+b.sy/2-.05);}
