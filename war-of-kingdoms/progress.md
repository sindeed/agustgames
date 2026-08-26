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

## Nästa kontroll

- Ingen känd blockerande testbrist. Publicera uppdateringen och verifiera liveversionen.
