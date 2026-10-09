import {GYM,inGymHall} from './gym-layout.js?v=20261009-geography-3';

// One-unit A* grid plus continuous swept collision checks. Paths are rebuilt
// when building pieces change, the target moves, or a route stops advancing.
const RADIUS=.68,STEP=1,MIN_X=GYM.minX+1,MIN_Z=GYM.minZ+1;
const COLS=GYM.w-1,ROWS=GYM.d-1,COUNT=COLS*ROWS;
const pos=i=>({x:MIN_X+i%COLS*STEP,z:MIN_Z+Math.floor(i/COLS)*STEP});
const cell=(x,z)=>Math.max(0,Math.min(ROWS-1,Math.round(z-MIN_Z)))*COLS+Math.max(0,Math.min(COLS-1,Math.round(x-MIN_X)));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
class Heap{constructor(){this.a=[]}push(n){const a=this.a;let i=a.length;a.push(n);while(i){const p=(i-1)>>1;if(a[p].f<=n.f)break;a[i]=a[p];i=p}a[i]=n}pop(){const a=this.a,root=a[0],n=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(n.f<=a[j].f)break;a[i]=a[j];i=j}a[i]=n}return root}get length(){return this.a.length}}
export function createGymNavigator(world){
 let revision=-1,blockedCells=new Uint8Array(COUNT),obstacles=[];
 const solid=c=>c.minY<1.7&&c.maxY>.05&&c.x+c.w/2>GYM.minX&&c.x-c.w/2<GYM.maxX&&c.z+c.d/2>GYM.minZ&&c.z-c.d/2<GYM.maxZ;
 const refresh=()=>{if(revision===(world.navRevision||0))return;revision=world.navRevision||0;obstacles=[...world.walls.filter(c=>c.enabled&&solid(c)),...world.pieces.filter(c=>c.bottom<1.7&&c.bottom+c.h>.05)];for(let i=0;i<COUNT;i++){const p=pos(i);blockedCells[i]=+blocked(p.x,p.z)}};
 function blocked(x,z,extra){return !inGymHall(x,z,.9)||obstacles.some(c=>Math.abs(x-c.x)<c.w/2+RADIUS&&Math.abs(z-c.z)<c.d/2+RADIUS)||(!!extra&&Math.abs(x-extra.x)<extra.w/2+RADIUS&&Math.abs(z-extra.z)<extra.d/2+RADIUS)}
 function clear(a,b,extra){if(!inGymHall(b.x,b.z,.9))return false;const intersects=c=>{let lo=0,hi=1;for(const [axis,size] of [['x','w'],['z','d']]){const delta=b[axis]-a[axis],min=c[axis]-c[size]/2-RADIUS+1e-7,max=c[axis]+c[size]/2+RADIUS-1e-7;if(Math.abs(delta)<1e-10){if(a[axis]<=min||a[axis]>=max)return false}else{let t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false}}return hi>=0&&lo<=1};return !obstacles.some(intersects)&&(!extra||!intersects(extra))}
 function near(point,from,extra){let best=-1,bestD=Infinity;const base=cell(point.x,point.z),cx=base%COLS,cz=Math.floor(base/COLS);for(let dz=-10;dz<=10;dz++)for(let dx=-10;dx<=10;dx++){const x=cx+dx,z=cz+dz;if(x<0||x>=COLS||z<0||z>=ROWS)continue;const i=z*COLS+x,p=pos(i),d=distance(p,point);if(d>=bestD||blocked(p.x,p.z,extra)||(from&&!clear(from,p,extra)))continue;best=i;bestD=d}return best}
 function plan(from,target,orbit=0){refresh();const start=near(from,from);if(start<0)return {path:[],unreachable:true};const blockedGoal=blocked(target.x,target.z),ideal=blockedGoal?{x:target.x+Math.cos(orbit*Math.PI/2)*5,z:target.z+Math.sin(orbit*Math.PI/2)*5}:target;const goal=near(ideal);if(goal<0)return {path:[],unreachable:true};const goalPoint=pos(goal),cost=new Float32Array(COUNT).fill(Infinity),parent=new Int32Array(COUNT).fill(-1),closed=new Uint8Array(COUNT),heap=new Heap();cost[start]=0;heap.push({i:start,g:0,f:distance(pos(start),goalPoint)});let best=start,bestD=Infinity;
  while(heap.length){const {i,g}=heap.pop();if(closed[i])continue;closed[i]=1;const p=pos(i),h=distance(p,goalPoint);if(h<bestD){best=i;bestD=h}if(i===goal)break;const x=i%COLS,z=Math.floor(i/COLS);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nx>=COLS||nz<0||nz>=ROWS)continue;const next=nz*COLS+nx;if(closed[next]||blockedCells[next]||(dx&&dz&&(blockedCells[z*COLS+nx]||blockedCells[nz*COLS+x])))continue;const ng=g+Math.hypot(dx,dz);if(ng>=cost[next]||!clear(p,pos(next)))continue;cost[next]=ng;parent[next]=i;heap.push({i:next,g:ng,f:ng+distance(pos(next),goalPoint)})}}
  const path=[];for(let i=best;i>=0;i=parent[i])path.push(pos(i));path.reverse();return {path,unreachable:best!==goal,blockedGoal};
 }
 function move(monster,target,speed,dt){refresh();let n=monster.navigation;
  if(!n||n.revision!==revision||distance(n.goal,target)>2.5||distance(monster,n.last)>2){n=monster.navigation={revision,goal:{x:target.x,z:target.z},path:[],last:{x:monster.x,z:monster.z},age:0,stuck:0,orbit:n?.orbit||0,replans:(n?.replans||0)+1};Object.assign(n,plan(monster,target,n.orbit))}
  n.age+=dt;let destination=target;
  if(blocked(target.x,target.z)||!clear(monster,target)){
   while(n.path.length&&distance(monster,n.path[0])<.001)n.path.shift();
   if(!n.path.length){const reached=!n.unreachable;if(n.blockedGoal||n.unreachable){n.orbit++;const wander={x:monster.x+Math.cos(n.orbit*Math.PI/2)*5,z:monster.z+Math.sin(n.orbit*Math.PI/2)*5};const wasBlocked=n.blockedGoal,wasUnreachable=n.unreachable;Object.assign(n,plan(monster,wasBlocked?target:wander,n.orbit));n.blockedGoal=wasBlocked;n.unreachable=wasUnreachable;n.replans++}return {reached:true,unreachable:!reached};}
   let next=0;for(let i=1;i<Math.min(n.path.length,12);i++){if(!clear(monster,n.path[i]))break;next=i}if(next)n.path.splice(0,next);destination=n.path[0];
  }
  const d=distance(monster,destination);if(d<1e-8)return {reached:true,unreachable:false};const step=Math.min(speed*dt,d),p={x:monster.x+(destination.x-monster.x)/d*step,z:monster.z+(destination.z-monster.z)/d*step};
  if(clear(monster,p)){monster.x=p.x;monster.z=p.z;n.stuck=0}else n.stuck+=dt;
  if(n.stuck>.2){n.path=plan(monster,target,n.orbit).path;n.stuck=0;n.replans++}
  n.last={x:monster.x,z:monster.z};return {reached:distance(monster,target)<1.7,unreachable:n.unreachable};
 }
 function canPlace(piece,monster){refresh();if(piece.bottom>=1.7)return true;if(blocked(monster.x,monster.z,piece))return false;const start=near(monster,monster,piece);if(start<0)return false;const seen=new Uint8Array(COUNT),queue=[start];seen[start]=1;for(let k=0;k<queue.length;k++){const i=queue[k],p=pos(i);if(distance(p,monster)>=12)return true;const x=i%COLS,z=Math.floor(i/COLS);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nx>=COLS||nz<0||nz>=ROWS)continue;const next=nz*COLS+nx;if(seen[next]||blockedCells[next]||!clear(p,pos(next),piece))continue;seen[next]=1;queue.push(next)}}return false}
 return {move,canPlace,blocked:(x,z)=>{refresh();return blocked(x,z)},clear:(a,b)=>{refresh();return clear(a,b)}};
}
