Original prompt: mib Jag och min kusin vill göra ett spel där man ska, spelet ska vara lite läskigt och det ska vara väldigt kul. Och kommer du ihåg att du gjorde ett spel till mig, som Zelda? Det ska vara stort som den och det ska vara 3D och bra, vad heter det nu igen, bra pixel och sånt. Det ska vara bra, okej? Det ska vara skuggor och ibland ska det komma tsunami, tornado och regn. Ibland. Och det ska vara ibland molnigt, ibland regnigt, ibland regnbågar, okej? Allt ska vara som i riktig värld. Och man börjar i Ikea. Det ska vara en Ikea, och i Ikean, det finns inga rum eller något, det finns bara gamla möbler, och man ska försöka gömma sig för att det finns ett monster som kommer 3:33 varje natt och försöker ta dig. Det är en av våra idéer, vi ska lägga mycket mer i spelet.

# IKEA 3:33 – progress

## 2026-07-16 – första spelbara 3D-versionen

- Byggde en riktig högupplöst förstapersonsvärld i Three.js/WebGL, utan pixelgrafik.
- IKEA skapas deterministiskt i 48 × 48-metersrutor medan spelaren går. Endast 25 rutor på dator eller 9 på mobil hålls renderade samtidigt, så världen kan fortsätta utan en fast kant.
- Lade till gamla garderober, soffor, sängar, bord, stolar, lampor, lådor och hyllor med material, takljus, dimma och mjuka skuggor.
- Möbelbygge fungerar: E bär/placerar, R vrider och flyttade möbler sparas när spelaren går långt bort och återvänder.
- Gömställen fungerar både i möbler och i egna fort byggda av minst tre möbler.
- Dygnsklockan, monstret Skramlaren exakt 03:33, jakt, gömmande, fångst, omstart och överlevnad till 06:00 är spelbara.
- Efter en överlevd natt låses den hemliga utgången upp.
- Vädercykeln innehåller moln, regn, regnbåge, tornadovarning/tornado och tsunamivarning/tsunami.
- Lade till ficklampa, springning, vägmarkörer, paus, helskärm, tangentbord/mus och mobilens joystick/knappar.
- Lade till en 3D-film efter utgången som visar skogen och den blå draken, hajön och båten, det blå larvhålet, robotbutiken, hemsökta huset, spöktåget, öknen/vulkanen och mysteriebyn.
- Samlade hela spelvisionen och kapitelreglerna i `WORLD.md`.

## Integration och testning

- `index.html` laddar Three.js 0.185.1 och `game.js?v=3` som ES-modul.
- `window.render_game_to_text()` beskriver spelläget för testning och `window.advanceTime(ms)` ger deterministisk tid.
- Rootmenyn och README länkar till `ikea-333/`.
- Playwright-provspelning verifierade rörelse, 03:33-spawn, fångst/omstart, gömställe till 06:00, upplåst utgång, hela filmresan, möbelpersistens, begränsad chunk-memory och mobilrendering.
- Senaste kontrollerna gav inga console- eller page-fel.

## Nästa stora version

- Göra varje värld efter IKEA till ett fullt spelbart kapitel; i denna version visas de som en 3D-teaser efter den spelbara IKEA-natten.
- Bygga riktig tvåspelar-online med server och synk. Koden har redan separata spelar-id:n, monstermål och en transportgräns, men denna version är solo.
- Ersätta fler procedurmodeller och syntetiska toner med specialbyggda 3D-modeller, animationer och inspelade miljöljud.
- Utöka tsunami/tornado, uppdrag, inventarie, sparfil och mysterierna i byn.

## Nya idéer från Agust och kusinen

- IKEA ska fortsätta skapas medan spelaren går och aldrig ta slut.
- Gamla möbler ska kunna flyttas och byggas till egna gömställen för nattmonstret.
- En svårfunnen utgång leder till en enorm värld med hus, skogar, skogsmonster och drakgrottor.
- Spelaren ska hitta en blå drake och flyga iväg med den.
- Draken släpper spelaren på en liten ö med hajar. När en tidsbegränsad båt kommer flyr hajarna och spelaren måste simma ut och hinna ombord.
- Efter båtfärden faller spelaren ner i ett stort hål med små magiska larver som lyser elektriskt blå på natten.
- Samma läskiga monster som finns i IKEA återkommer i hålet. Den blå draken räddar spelaren.
- Alla kapitel ska använda samma tydliga 3D-pixelgrafik, ljus och skuggor.
- Korrigering: världen ska **inte** vara pixelgrafik. Den ska använda högupplöst riktig 3D med mjuka material, bra modeller, skuggor och många detaljer.
- Världen ska vara minst 100 gånger större än startområdet och fortsätta procedurgenereras så att nya områden nästan aldrig tar slut.
- Efter hålet kommer robotbutiken: en gammal gubbe vinkar men vänder sig aldrig åt höger. När han till slut gör det syns knappar på höger sida, all mat visar sig vara plast och spelarna flyr.
- Spelet ska stödja två spelare och på sikt onlinespel.
- Ljuddetaljer ska omfatta vind, fåglar, hav, hajar, regn, möbelknarr, monster och områdesspecifik stämning.
