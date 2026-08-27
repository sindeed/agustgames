Original prompt: Bygg War of Kingdoms som ett iPad-anpassat 3D-spel i första person, utifrån Agusts ritade borg och de spelregler som beskrivits i samtalet, och lägg det i Agust Games-menyn.

## Krav som spelet följer

- Spelaren är en kung i förstaperson och använder svärd eller pilbåge.
- Sju likadana borgar finns: spelarens borg och sex datorstyrda kungars borgar, med varsin by.
- Borgarna har vallgrav, vindbrygga, karta, säng, trappa/murgång och fyra bågskytteplatser enligt ritningen.
- Dag och natt varar tre minuter vardera. Spelaren kan sova över natten på en sekund.
- Dagsattacker använder högst 20 egna vakter; nattliga smyguppdrag använder noll till fem.
- Alla kungar och vakter har 100 liv. Vinst ger 50 pengar och förlust kostar 20 pengar.
- Affären säljer två svärdvakter för 10, två bågskyttar för 15 och två spjutryttare för 20 pengar. Diamanter säljs för 10.
- Endast bågskyttar kan placeras på de fyra tornplatserna.
- Spelet har WebGL-grafik, svensk UI, tangentbord/mus samt pekkontroller för iPad i liggande läge.

## Status

- 2026-08-25: Första spelbara versionens WebGL-motor skapad i `game.js`.
- 2026-08-25: Komplett HTML-gränssnitt skapat för start, HUD, karta, frågor, arméval, affär, resultat, paus och pekkontroller.
- 2026-08-25: Medeltida guld/röd/blå design och responsiv iPad-layout skapad i `style.css`.
- 2026-08-25: War of Kingdoms tillagt i Agust Games-menyn och dokumentationen.
- 2026-08-25: Statisk kontroll bekräftar att samtliga 47 DOM-ID:n som `game.js` använder finns i HTML-filen, tillsammans med alla val- och köp-attribut.
- 2026-08-25: Playwright startade spelet i simulerad iPad-storlek (1180×820), öppnade världskartan och rapporterade inga konsol- eller sidfel. Startmeny, HUD och karta granskades visuellt utan överlappningsproblem.
- 2026-08-25: Riktad QA hittade och rättade att armévalets CSS-animation kunde fastna med `opacity: 0`. Bara `.selection-dialog` ändrades; karta och frågerutor påverkas inte.
- 2026-08-25: Slutlig Chromium-svit klar: 25/25 kontroller passerade för start, karta nära/långt bort, dagattack, max 20 vakter, nattfråga, en sekunds sömn, smyguppdrag med 0–5 vakter, fiendens 20-vaktsarmé med alla tre typer, fyra tornskyttar vid försvar, affär/diamanter, vinst/förlustpengar, tornplacering och iPad-joystick. Inga konsolfel eller saknade HTTP-resurser.
- 2026-08-26: Startarmén ändrad till noll vakter. Varje köp skapar exakt två vakter, bygger om borggården direkt och visar alla köpta vakter utan det tidigare visuella taket. Köpta vakter fortsätter vara valbara till både attack och smyguppdrag.
- 2026-08-26: Gamla sparningar migreras så gott den äldre datan tillåter: den tidigare gratisarmén dras bort, överskjutande vakter samt pengar/diamanter förs över, och hela originalsparningen ligger kvar orörd under v1-nyckeln som säkerhetskopia.
- 2026-08-26: Det riktade iPad-testet hittade att en dekorativ cirkel i armékorten kunde fånga tryck på plusknappen. Dekorationen ignorerar nu pekhändelser så vakterna går att välja säkert.
- 2026-08-26: Den visuella kontrollen hittade också att ett återställt dagläge kunde behålla nattens färg en kort stund. Tvingad ljusuppdatering sätter nu rätt dag- eller nattljus direkt.
- 2026-08-26: Sluttest godkänt utan webbläsarfel: ny start har 0/0/0 vakter; ett köp ger två synliga och valbara vakter; 2+2+2 kan väljas till attack och fem av dem till smyg; även 12 svärdvakter, 10 bågskyttar och 6 ryttare visas samtidigt. Gammal sparning migrerades med pengar och diamanter bevarade. Det obligatoriska spelklienttestet passerade också.
- 2026-08-26: Slutgranskningen gjorde tornskyttar valbara även till smyguppdrag och flyttade den nya sparningen till en separat v2-nyckel, så den äldre sparningen aldrig skrivs över.
- 2026-08-27: Pågående uppdatering ger spjutryttare längre räckvidd än svärdvakter, låter alla kungars svärd nå lika långt som spjuten och låter alla kungars pilbågar nå längre än bågskyttarnas. AI:n använder nu hela den angivna attackräckvidden i stället för endast 82 procent.
- 2026-08-27: Pågående uppdatering lägger en synlig gruva bakom spelarens borg. Affären säljer en miner för 15 pengar, högst nio, och köpta miners visas arbetande vid gruvan. Intäktstabellen per 30 sekunder är 3, 5, 10, 13, 15, 20, 23, 25 och 30 pengar för en till nio miners. Var fjärde utbetalning ger också en diamant.
- 2026-08-27: Sparningen flyttas säkert till en separat v3-nyckel; v2 och v1 lämnas orörda som säkerhetskopior vid migrering.
- 2026-08-27: Gruvan fick berg-, vagn- och grottkollisioner samt sparning när sidan göms eller stängs, så nästan färdig 30-sekundersprogress inte tappas. Gruvtimern går under aktivt spel, även krig och smyg, men pausar tillsammans med spelet vid menyer och frågor.
- 2026-08-27: Riktad Chromium-QA godkänd i iPad-storlek: 33/33 räckvidds- och gruvtester plus en separat helhetssvit utan webbläsarfel. Exakt 30 sekunder fungerar stabilt för alla nio nivåer; 120 sekunder ger fyra utbetalningar och en diamant. Shopens fyra kort och alla nio synliga miners granskades visuellt utan överlapp. Den obligatoriska web-game-klienten passerade också efter slutändringarna.
- 2026-08-27: Sex fienderiken har nu varsin synlig gruva och börjar med sex olika minerantal mellan ett och nio: 2, 5, 8, 1, 7 och 4. Deras gruvor tjänar pengar enligt samma 30-sekunderstabell och antalen sparas separat för varje rike.
- 2026-08-27: Nattkartan visar minerantal för varje fienderike och erbjuder två tydliga val: smyguppdrag till borgen eller gruvuppdrag. Ett gruvuppdrag kan göras ensam eller med högst fem egna vakter; gruvans vakter och ibland kungen försvarar de arbetande miners som kan besegras eller stjälas.
- 2026-08-27: Fienderikets sista miner skyddas så att fiender alltid har minst en. Stöld flyttar miners atomärt mellan rikena, respekterar spelarens max nio och håller besegrade miners åtskilda från de miners som faktiskt stjäls.
- 2026-08-27: En fiendekung försöker högst en gång per natt stjäla spelarens miners. En vaken spelare väljer upp till fem vakter och försvarar gruvan i en strid; sömn löser nattens stöld automatiskt. En förlust kan sänka spelaren till noll miners, stoppar inkomsten och nollställer gruvtimern.
- 2026-08-27: Ny iPad-svit godkänd 31/31 utan konsol-, sid- eller HTTP-fel. Den kontrollerade båda nattvägarna, alla sex unika startvärden, worker-KO och fiendegolv, exhaustiva transferfall, nattförsvar, en räd per natt, save/reload och reset. Fyra nya iPad-bilder granskades visuellt, och den obligatoriska web-game-klienten passerade utan fel.
- 2026-08-27: Slutgranskningen hittade och rättade fem hörnfall: medföljande vakter slår inte längre automatiskt stöldmålen, gruvvakter använder gruvans kollisioner, valda försvarsvakter visas inte dubbelt i borgen, paus återgår till det underliggande försvarsvalet och fulla fiendegruvor orsakar inte nya triggerförsök varje bildruta.
- 2026-08-27: Död egen vakt bokförs nu direkt i en gruvstrid. En påbörjad inkommande räd sparas tills den vunnits eller förlorats; omladdning kan därför varken återuppliva döda vakter eller undvika minerstölden. Riktad hörnfallssvit, 31/31 gruvsvit, 33/33 ekonomi/räckviddssvit, nollvakts-/migreringssvit och den obligatoriska slutklienten passerade utan webbläsarfel.
- 2026-08-27: Slutlig visuell iPad-QA gjorde miner- och tornraderna större, rättade singularformerna, döljer toast när en dialog öppnas och spred ut gruvans försvarare runt de arbetande miners. Den nya bilden visar tydligt miners, vakter och fiendekung utan UI-överlapp; 31/31-sviten och den obligatoriska publiceringsklienten passerade igen.

## Nästa kontroll

- Kör slutlig regressionssvit och kodgranskning, publicera därefter och verifiera liveversionens filer, meny-länk och startläge på GitHub Pages.
