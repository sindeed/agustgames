export async function geographyFlow({page,state,place,step,press,check,shot}){
 const tap=selector=>page.locator(selector).tap();
 const walk=async(x,z)=>{const p=(await state()).player,dx=x-p.x,dz=z-p.z;await page.evaluate(yaw=>window.__exit3.state.player.yaw=yaw,Math.atan2(-dx,-dz));await press('KeyW',Math.hypot(dx,dz)/4.7*1000);await step(20)};
 await page.evaluate(()=>window.__exit3.state.immuneUntil=1e7);
 await place(30,-21);await step(30);await place(-8,-16);await step(30);check('Besök före orienteringsuppgiften ger ingen gratis lösning',!(await state()).geography.visits.gym&&!(await state()).geography.visits.english);
 await place(15,-46);await press('KeyE');check('Geografitavlan öppnas i det nya rummet',(await state()).mode==='geography');
 check('Alla sju ämnesrum finns på kartan',await page.locator('#geoBody [data-room]').count()===7);
 check('Idrottssalens kartmått är verkliga 160 × 100',await page.locator('#geoBody [data-room=gym]').evaluate(e=>e.getAttribute('width')==='160'&&e.getAttribute('height')==='100'));
 check('Svenska och SO har olika kartbeteckningar',(await page.locator('#geoBody .map-legend').textContent()).includes('S = svenska')&&(await page.locator('#geoBody .map-legend').textContent()).includes('SO = samhällsorientering'));
 await shot('geography-orientation');await tap('#geoExplore');
 // Walk through real doors, with no position helper after the assignment starts.
 await walk(15,-38);await walk(7,-38);await walk(7,-40);await walk(0,-40);check('Geografirummets dörr fungerar ut till korridoren',(await state()).zone==='corridor');
 await walk(0,-21);await walk(30,-21);check('Verklig promenad in i I registreras',(await state()).zone==='gym'&&(await state()).geography.visits.gym);
 await tap('#mapButton');check('Kartan kan tas fram på pekskärm under orienteringen',await page.locator('#mapScreen').isVisible()&&(await page.locator('#mapBody').textContent()).includes('Hitta E'));await tap('#mapClose');
 await walk(0,-21);await walk(0,-16);await walk(-8,-16);check('Verklig promenad in i E registreras',(await state()).zone==='english'&&(await state()).geography.visits.english);check('Uppgiften kräver återkomst till G',!(await state()).geography.orientationDone);
 await walk(0,-16);await walk(0,-40);await walk(7,-40);await walk(7,-46);await walk(15,-46);await press('KeyE');check('Återkomst till G avslutar orienteringen',(await state()).geography.orientationDone&&(await state()).mode==='geography');
 await page.locator('#countryAnswer').fill('Norge Finland');check('Danmark krävs också',!(await state()).geography.countriesDone);await page.locator('#countryAnswer').fill('Norge Norge Danmark');check('Dubbla länder räcker inte',!(await state()).geography.countriesDone);await page.locator('#countryAnswer').fill(' DANMARK, norge och FINLAND ');check('Alla tre grannländer godtas ordningsoberoende',(await state()).geography.countriesDone);
 await shot('geography-countries');await tap('#countryErase');check('Sudd kan rätta geografisvaret utan att radera orienteringen',!(await state()).geography.countriesDone&&(await state()).geography.orientationDone);await page.locator('#countryAnswer').fill('Finland Danmark Norge');await tap('#geoNext');
 const positions={snabbis:{x:-28,z:98},enogat:{x:0,z:4.4},spider:{x:170,z:-70}};
 await page.evaluate(positions=>{for(const [id,p] of Object.entries(positions))Object.assign(window.__exit3.state.monsters[id],p)},positions);await tap('#geoSurvey');
 check('Monsteruppgiften fångar de faktiska aktuella positionerna',JSON.stringify((await state()).geography.snapshot)===JSON.stringify(positions));check('Lösningsmarkörer visas inte automatiskt',await page.locator('[data-pin]').count()===0);await shot('geography-monsters-blank');
 const before=await state();await tap('[data-geo-action=scout]');await press('KeyS',600);await step(1000);const during=await state();check('Spelaren kan gå medan monsterläget och tiden är frysta',Math.hypot(during.player.x-before.player.x,during.player.z-before.player.z)>1&&during.time===before.time&&Object.keys(positions).every(id=>during.monsters[id].x===positions[id].x&&during.monsters[id].z===positions[id].z),{before:before.player,during:during.player,time:[before.time,during.time],monsters:during.monsters});
 await tap('#mapButton');
 const pin=async(id,point)=>{await tap(`#mapBody [data-monster=${id}]`);const view={snabbis:'yard',enogat:'school',spider:'gym'}[id];await tap(`#mapBody [data-map-view=${view}]`);const p=await page.locator('#mapBody svg').evaluate((svg,p)=>{const q=svg.createSVGPoint();q.x=p.x;q.y=p.z;const out=q.matrixTransform(svg.getScreenCTM());return {x:out.x,y:out.y}},point);await page.touchscreen.tap(p.x,p.y)};
 await pin('snabbis',{x:25,z:120});await tap('#mapBody [data-geo-action=check]');check('Vanlig plats eller fel position ger inte rätt',!(await state()).geography.monstersDone);
 for(const id of Object.keys(positions))await pin(id,positions[id]);check('S E och Å placeras av verkliga tryck på kartan',await page.locator('#mapBody [data-pin]').count()===3);await shot('geography-monsters-pinned');await tap('#mapBody [data-geo-action=check]');
 check('Tre riktiga markörer avslutar geografins tredje uppgift',(await state()).geography.monstersDone);check('Geografi blir klar först efter samtliga tre uppgifter',(await state()).done.geography);await tap('#mapClose');const endTime=(await state()).time;await step(300);check('Tiden fortsätter när spaningen är klar',(await state()).time>endTime);
}
