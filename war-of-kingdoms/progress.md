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

## Nästa kontroll

- Ingen känd blockerande testbrist i den första spelbara versionen.
