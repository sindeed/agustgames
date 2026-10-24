// Exercise the three lessons with actual input and physics. Placement helpers are
// used only to prepare scenarios / construct a repeatable route, never to cross it.
export async function gymFlow({page,state,place,step,press,check,shot}){
 const g=await page.evaluate(()=>window.__exit3.constants.GYM);
 await place(g.balls.x,g.balls.z);await press('KeyE');
 check('Idrottsbollar kan hämtas',(await state()).inventory.ball==='gym');
 await place(56,-26);await page.evaluate(()=>{const s=window.__exit3.state;s.monsters.spider.x=56;s.monsters.spider.z=-34;s.immuneUntil=s.time+180});
 for(let i=0;i<9;i++){await press('KeyQ');await step(450)}
 check('Nio bollträffar räcker inte',(await state()).gym.hits===9&&(await state()).gym.phase==='balls');
 await press('KeyQ');await step(450);
 check('Tio bollträffar startar andra leken',(await state()).gym.hits===10&&(await state()).gym.phase==='build');await shot('gym-balls');
 await place(g.goal.x,g.goal.z,1.8);await step(30);
 check('Målet kan inte nås från golvet för att hoppa över byggandet',(await state()).gym.phase==='build');
 await page.evaluate(()=>{const w=window.__exit3.world;for(const p of w.pieces)w.root.remove(p.mesh);w.pieces=[]});
 await place(36,-27.6,1.8,-Math.PI/2);await step(30);await press('KeyB');
 await page.locator('[data-build=cube]').tap();await page.locator('[data-build=place]').tap();
 check('Kub placeras med oförändrade pekknappar',(await state()).pieces.length===1&&(await state()).pieces[0].h===1.8);await shot('gym-building');
 await page.locator('[data-build=pickup]').tap();
 check('Kuben kan lyftas och flyttas',(await state()).pieces.length===0);
 await page.locator('[data-build=place]').tap();await page.locator('[data-build=mat]').tap();await page.locator('[data-build=rotate]').tap();await place(50,-35,0,0);await page.locator('[data-build=place]').tap();
 check('Mattor kan vridas och placeras',(await state()).pieces.some(p=>p.type==='mat'&&p.d===4.8));await page.locator('[data-build=close]').tap();
 await page.evaluate(()=>{const w=window.__exit3.world;for(const p of w.pieces)w.root.remove(p.mesh);w.pieces=[]});
 const route=[];
 for(let i=0;i<=32;i++){const x=40.8+i*2.4;if(x>61.3&&x<68.3)continue;route.push([+x.toFixed(1),-27.6])}
 for(let i=0;i<=18;i++)route.push([117.6,+(-30-i*2.4).toFixed(1)]);
 for(const [x,z] of route){await place(x,z+4,2,0);await page.evaluate(()=>{const api=window.__exit3;api.buildAction('cube');api.buildAction('place')})}
 check('Lång byggväg består av minst 45 fysiska kuber',(await state()).pieces.length>=45,{placed:(await state()).pieces.length});
 await place(36.6,-27.6,1.8,-Math.PI/2);await step(30);await press('Space');await press('KeyW',900);await step(120);
 check('Spelaren landar på sin byggda kub',(await state()).player.support?.startsWith('piece-'));
 // Walk over connected placed cubes and one rest island, then turn toward the goal.
 let p=(await state()).player;await press('KeyW',(117.6-p.x)/4.7*1000);
 check('Första sträckan korsar den nya salen ovanför golvet',(await state()).player.y>=1.79&&(await state()).gym.route,{player:(await state()).player});
 await page.evaluate(()=>window.__exit3.state.player.yaw=0);p=(await state()).player;await press('KeyW',(p.z+72.8)/4.7*1000);await press('Space');await press('KeyW',900);await step(200);await press('KeyW',450);await step(50);
 check('Byggvägen når nya målet och startar kurragömma',(await state()).gym.phase==='count',{player:(await state()).player,gym:(await state()).gym});await shot('gym-goal');
 check('Åttaben räknar nära det flyttade målet',Math.hypot((await state()).monsters.spider.x-g.goal.x,(await state()).monsters.spider.z-g.goal.z)<20);
 await page.evaluate(()=>window.__exit3.state.immuneUntil=0);
 const hide=g.hideouts[0];await place(hide.x,hide.z-2);
 const remaining=(await state()).gym.timer;
 await step(Math.max(0,remaining-.05)*1000);
 check('Räkning fortsätter fram till exakt 30 sekunder',(await state()).gym.phase==='count');
 await step(100);check('Sökning startar efter 30 sekunder',(await state()).gym.phase==='seek');
 await page.keyboard.down('KeyC');await step(29900);
 check('Söktiden är fortfarande 30 sekunder',(await state()).gym.phase==='seek');
 await step(150);await page.keyboard.up('KeyC');
 check('Gömd under hela söktiden klarar idrotten',(await state()).gym.phase==='done'&&(await state()).done.gym,{gym:(await state()).gym,catches:(await state()).catches});await shot('gym-hidden');
}
