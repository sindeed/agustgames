# Where Is Exit 3

Agusts tredje Where Is Exit-spel. Ett sammanhängande förstapersonsäventyr i en övergiven skola, med samma Three.js-version och originalmonster som föregångaren.

Spela: https://sindeed.github.io/agustgames/where-is-exit-3/?v=20261009-geography-3

## Kontroller

- Pekskärm: vänster joystick, dra på bilden för att titta, SPRING, HOPPA, TA SAK, KASTA/VATTEN, DUCKA, BYGG.
- Dator: WASD/pilar, dra musen, Shift, mellanslag, E, Q, C, B. Esc pausar, F ger helskärm.
- Tavlor: vanliga textfält och sudd. Boktexten är samma sträng som facit. Automatiskt klart först när samtliga svar stämmer. Svar finns kvar under omgången; omstart eller omladdning börjar om.
- Idrott: tio bollträffar → bygg från blå startplats över golvet till gul målplats → 30 sekunder att gömma sig och 30 sekunders sökning. Påbörjad byggväg förloras om man går ner på golvet; själva bygget finns kvar.
- Bygg: välj kub/matta, titta mot önskad plats, placera. VRID roterar mattan. FLYTTA lyfter en närliggande del; delar ovanpå måste flyttas först. Placering staplar på befintliga delar. Hoppa mellan delarna.
- Valfri fotboll: hämta boll i förrådet, gå till planen, använd TA SAK. Du gör mål i bortre målet. Först till tre; vinst ger 15 sekunders extra fart.
- Efter sju ämnen: matsal → vatten → kökets mittgång → lastkaj → lastutrymme → nyckel → hopp till lövhögen → skogen.

## Filer och tester

`gym-layout.js` samlar idrottssalens mått och placeringar. `curriculum.js` innehåller frågorna och textnormalisering. `models.js` återanvänder Snabbis, Enögat och Åttaben och tillför Munvrålet. `world.js` bygger geometri, väggar, ytor och redskap. `game.js` sköter spelregler och inmatning. Ingen extern nätresurs behövs efter att de statiska spelfilerna har laddats.

Starta en lokal server i repositoryroten. Testerna använder Playwright från develop-web-game-skillen, eller modulen som anges i `PLAYWRIGHT_MODULE`. Kör `node tests/exit3-gym10.mjs`, `node tests/exit3-acceptance.mjs` och `node tests/exit3-edges.mjs`. Miljövariabler: `GAME_URL`, `QA_OUT`, `ENGINE=webkit`, `PLAYWRIGHT_BROWSERS_PATH`.

`render_game_to_text()` och `advanceTime(ms)` ger deterministisk verifiering. Placeringshjälp finns enbart på localhost eller när adressen innehåller `qa`. Testerna placerar spelaren mellan avsnitt; de prövar sedan inmatning, projektiler, fysik, byggväg, tidtagning och övergångar. De är inte en enda obruten genomspelning från start utan placeringshjälp. Skärmformat och WebKit är emulerade tester, inte testning på fysisk iPad.

Musik har inte lagts till. Korta syntetiska interaktionsljud finns för hopp, bollar och motorstart.

## Större idrottssal, 2026-10-09

Salen är nu 160 × 100 (16 000), jämfört med tidigare 40 × 40 (1 600): exakt tio gånger golvytan. Taket är fortsatt 9,4 högt. En kort passage från samma korridordörr ligger utanför dessa mått. Byggmålet ligger längre in, med två fristående viloplatser och stora mellanrum som måste byggas över. Kuber och mattor behåller sina användbara storlekar. Bollarnas sikthjälp når 48 i salen; övriga kast är oförändrade. Åttaben har samma fart som Enögat och söker från en plats nära det nya byggmålet. Kurragömman är fortfarande 30 + 30 sekunder.

## Geografi och Åttabens vägval, 2026-10-09

Geografi är det sjunde obligatoriska ämnet. Rummet ligger öster om korridoren, ovanför idrottspassagen på kartan. Första uppgiften kräver att spelaren börjar i G, går in i I och E och återvänder till G:s tavla. Den portabla kartan visar de verkliga rumsproportionerna och skolgården; S betyder svenska och SO samhällsorientering. Andra uppgiften rättar Norge, Finland och Danmark utan krav på ordning. Danmark visas över Öresund och beskrivs inte som en landgräns.

Tredje uppgiften fångar Snabbis, Enögats och Åttabens aktuella x/z. Under spaningen fryser monster, minispel och spelklocka, medan spelaren kan gå och titta. KARTA öppnar placeringen av S, E och Å; inga facitmarkörer ritas. Rättning kräver högst 8 spelenheters avstånd och rätt faktiskt område. Det finns zoom för skolan, idrotten och gården. Avbryt återupptar spelet; en ny spaning fångar ett nytt läge. Munvrålet ingår inte. Alla tre uppgifter måste vara klara tillsammans med de sex tidigare ämnena.

Åttabens A*-vägar använder den riktiga hinderytan, säker hörnpassage och exakt kontroll av rörelsens sträcka. Flyttade/nya byggdelar och ändrade mål ger nya vägval. Han går runt upphöjda mål, byter sökpunkt när en punkt inte går att nå och fortsätter att respektera gömställenas siktblockering. Ett bygge får inte överlappa eller helt stänga in Åttaben i en liten ficka.

Nya tester: `tests/exit3-geography.mjs`, `tests/exit3-navigation.mjs` och `tests/exit3-spider.mjs`. Den befintliga acceptanskedjan omfattar nu geografi och alla sju ämnen före hela slutsekvensen.

Kartfilen `assets/nordic-map.svg` är lokalt genererad och förenklad från [Natural Earth 1:50m](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson). Kartdata är [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Ingen extern karttjänst behövs vid spel.
