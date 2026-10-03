// Shared geometry for navigation, collision and rendering. One logical unit = 0.05 m.
export const PLANET={width:2400,height:1600};
export const wrap=(n,size)=>((n%size)+size)%size;
export function wrapBody(p){p.x=wrap(p.x,PLANET.width);p.y=wrap(p.y,PLANET.height);}
export function planetDelta(a,b){return {x:wrap(b.x-a.x+PLANET.width/2,PLANET.width)-PLANET.width/2,y:wrap(b.y-a.y+PLANET.height/2,PLANET.height)-PLANET.height/2};}
export const shipRooms=[],shipZones=[],shipWalls=[],shipCovers=[];
const wall=(x,y,w,h)=>shipWalls.push({x,y,w,h,height:3.2,type:'structure'});
for(let row=0;row<4;row++)for(let col=0;col<4;col++){
 const x=260+col*420,y=260+row*340,id=row*4+col;
 shipRooms.push({id,x,y,w:300,h:240,name:['Dockning','Navigation','Sensorer','Bryggan','Teknik','Energi','Laboratorium','Kommunikation','Lastsal','Reservdelar','Matsal','Sjukrum','Maskinrum','Generatorer','Kontrollrum','Observatorium'][id]});shipZones.push({x,y,w:300,h:240});
 const horizontal=(yy,open)=>{if(open){wall(x-97.5,yy,105,8);wall(x+97.5,yy,105,8);}else wall(x,yy,308,8);};
 const vertical=(xx,open)=>{if(open){wall(xx,y-82.5,8,75);wall(xx,y+82.5,8,75);}else wall(xx,y,8,248);};
 horizontal(y-120,row>0||id===0);horizontal(y+120,row<3);vertical(x-150,col>0);vertical(x+150,col<3);
 if(col<3){shipZones.push({x:x+210,y,w:120,h:90});wall(x+210,y-45,120,8);wall(x+210,y+45,120,8);}
 if(row<3){shipZones.push({x,y:y+170,w:90,h:100});wall(x-45,y+170,8,100);wall(x+45,y+170,8,100);}
 shipCovers.push({id:'wall-'+id,type:'wall',x:x+65,y:y-40,w:70,h:14,height:2.1});
 shipCovers.push({id:'barrel-'+id,type:'barrel',x:x-60,y:y+35,r:18,height:1.8});
}
export const shipObstacles=[...shipWalls,...shipCovers];
export const SHIP_ENTRY={x:260,y:155},SPACE_DOCK={x:820,y:430};
export function insideObstacle(x,y,o,margin=0){return o.r?Math.hypot(x-o.x,y-o.y)<o.r+margin:Math.abs(x-o.x)<o.w/2+margin&&Math.abs(y-o.y)<o.h/2+margin;}
export function shipWalkable(x,y){return shipZones.some(z=>Math.abs(x-z.x)<=z.w/2&&Math.abs(y-z.y)<=z.h/2)&&!shipObstacles.some(o=>insideObstacle(x,y,o,10));}
export function segmentHit(a,b,o){
 const dx=b.x-a.x,dy=b.y-a.y;
 if(o.r){const px=a.x-o.x,py=a.y-o.y,A=dx*dx+dy*dy,B=2*(px*dx+py*dy),C=px*px+py*py-o.r*o.r;if(C<0)return 0;if(!A)return null;const disc=B*B-4*A*C;if(disc<0)return null;const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null;}
 let lo=0,hi=1;for(const [start,delta,min,max] of [[a.x,dx,o.x-o.w/2,o.x+o.w/2],[a.y,dy,o.y-o.h/2,o.y+o.h/2]]){if(Math.abs(delta)<1e-9){if(start<min||start>max)return null;}else{let t1=(min-start)/delta,t2=(max-start)/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}}return lo;
}
export function shipLineClear(a,b){return !shipObstacles.some(o=>segmentHit(a,b,o)!==null);}
// Grid BFS is used only when a companion's direct route is obstructed, not every frame.
export function shipPath(a,b){const grid=25,key=(x,y)=>x+','+y,start=[Math.round(a.x/grid),Math.round(a.y/grid)],goal=[Math.round(b.x/grid),Math.round(b.y/grid)],queue=[start],parents=new Map([[key(...start),null]]);let found=null;
 for(let i=0;i<queue.length&&i<9000;i++){const cur=queue[i];if(Math.hypot(cur[0]-goal[0],cur[1]-goal[1])<1.5){found=cur;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next=[cur[0]+dx,cur[1]+dy],k=key(...next);if(parents.has(k)||!shipWalkable(next[0]*grid,next[1]*grid))continue;parents.set(k,cur);queue.push(next);}}
 const path=[];while(found){path.unshift({x:found[0]*grid,y:found[1]*grid});found=parents.get(key(...found));}return path.slice(1);
}
