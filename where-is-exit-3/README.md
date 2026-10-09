# Where Is Exit 3

Agusts tredje Where Is Exit-spel. Ett sammanhängande förstapersonsäventyr i en övergiven skola, med samma Three.js-version och originalmonster som föregångaren.

Spela: https://sindeed.github.io/agustgames/where-is-exit-3/?v=20261009-gym10-2

## Kontroller

- Pekskärm: vänster joystick, dra på bilden för att titta, SPRING, HOPPA, TA SAK, KASTA/VATTEN, DUCKA, BYGG.
- Dator: WASD/pilar, dra musen, Shift, mellanslag, E, Q, C, B. Esc pausar, F ger helskärm.
- Tavlor: vanliga textfält och sudd. Boktexten är samma sträng som facit. Automatiskt klart först när samtliga svar stämmer. Svar finns kvar under omgången; omstart eller omladdning börjar om.
- Idrott: tio bollträffar → bygg från blå startplats över golvet till gul målplats → 30 sekunder att gömma sig och 30 sekunders sökning. Påbörjad byggväg förloras om man går ner på golvet; själva bygget finns kvar.
- Bygg: välj kub/matta, titta mot önskad plats, placera. VRID roterar mattan. FLYTTA lyfter en närliggande del; delar ovanpå måste flyttas först. Placering staplar på befintliga delar. Hoppa mellan delarna.
- Valfri fotboll: hämta boll i förrådet, gå till planen, använd TA SAK. Du gör mål i bortre målet. Först till tre; vinst ger 15 sekunders extra fart.
- Efter sex ämnen: matsal → vatten → kökets mittgång → lastkaj → lastutrymme → nyckel → hopp till lövhögen → skogen.

## Filer och tester

`gym-layout.js` samlar idrottssalens mått och placeringar. `curriculum.js` innehåller frågorna och textnormalisering. `models.js` återanvänder Snabbis, Enögat och Åttaben och tillför Munvrålet. `world.js` bygger geometri, väggar, ytor och redskap. `game.js` sköter spelregler och inmatning. Ingen extern nätresurs behövs efter att de statiska spelfilerna har laddats.

Starta en lokal server i repositoryroten. Testerna använder Playwright från develop-web-game-skillen, eller modulen som anges i `PLAYWRIGHT_MODULE`. Kör `node tests/exit3-gym10.mjs`, `node tests/exit3-acceptance.mjs` och `node tests/exit3-edges.mjs`. Miljövariabler: `GAME_URL`, `QA_OUT`, `ENGINE=webkit`, `PLAYWRIGHT_BROWSERS_PATH`.

`render_game_to_text()` och `advanceTime(ms)` ger deterministisk verifiering. Placeringshjälp finns enbart på localhost eller när adressen innehåller `qa`. Testerna placerar spelaren mellan avsnitt; de prövar sedan inmatning, projektiler, fysik, byggväg, tidtagning och övergångar. De är inte en enda obruten genomspelning från start utan placeringshjälp. Skärmformat och WebKit är emulerade tester, inte testning på fysisk iPad.

Musik har inte lagts till. Korta syntetiska interaktionsljud finns för hopp, bollar och motorstart.

## Större idrottssal, 2026-10-09

Salen är nu 160 × 100 (16 000), jämfört med tidigare 40 × 40 (1 600): exakt tio gånger golvytan. Taket är fortsatt 9,4 högt. En kort passage från samma korridordörr ligger utanför dessa mått. Byggmålet ligger längre in, med två fristående viloplatser och stora mellanrum som måste byggas över. Kuber och mattor behåller sina användbara storlekar. Bollarnas sikthjälp når 48 i salen; övriga kast är oförändrade. Åttaben har samma fart som Enögat och söker från en plats nära det nya byggmålet. Kurragömman är fortfarande 30 + 30 sekunder.
