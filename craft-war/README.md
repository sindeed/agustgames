# Craft War

Agusts eget by- och laserarméspel. Statisk HTML/CSS/JavaScript, utan nätverksberoenden eller musik.

## Spela

Öppna `index.html` via HTTP. Byn sparas i webbläsarens localStorage (`craft-war-v1`), per enhet och webbadress.

- Grön butik och galleri nederst: välj en sak och tryck på ledig mark. Avbryt avbryter placeringen utan kostnad. Tryck på mur/torn/låda för att flytta den.
- Tryck direkt på en vakt: vänster styrspak går, höger siktar/skjuter/slår. Släpp stoppar. Röda X återgår till vanlig kamera.
- Dra marken för kameran, nyp eller +/- för zoom. Dator: WASD, pilar, mellanslag och F för helskärm.
- Vill du attackera? → Välj din armé → Hitta en by. Förstör huvudhus för +100.
- Gå till allekrig: fem byar, ingen byggtimer. Starta kriget när du är redo. Du spelar kaptenen; gula styrspaken visar hela slagfältet medan du väljer orderring. Släpp skickar dina andra vakter dit. På dator kan R+klick ge en order.

## Regler och första versionsval

Start50 och gratis kapten. Pistol20 pengar/50HP/skada20, lång pistol60/70HP/skada50, lasersvärd120/100HP/skada70, hoppsvärd160/130HP/skada70. Kapten200HP/skada100, sköld5s var20s (även botkaptener). Ett svärdsslag träffar en fiende. Hoppsvärd kan hoppa över fiender men aldrig murar, hus eller lådor.

Mur10, torn60 med inbyggd skytt, låda40. Murar/torn/huvudhus100HP. Tornets vakt försvinner med tornet och kan inte träffas separat. Lådor är oförstörbara på båda sidor; max10 per by, fri placering på ledig mark.

Rimliga defaults för sådant som inte bestämdes muntligt: högst10 vakter i en normal anfallsarmé, ingen global vaktgräns; vakter kommer hem med full hälsa efter strid; allekrig startar med din ägda armé och ett nytt huvudhus, egen tillfällig byggkassa600. Tillfälliga allekrigsbyggnader ändrar inte hemmabyn. Allekrig vinns när övriga fyra huvudhus förstörts (+200), och förloras om ditt huvudhus eller din kapten dör. Vanligt anfall förloras när hela anfallsarmén är utslagen. Balansering/räckvidder kan justeras efter Agusts test.

## Tester

- `node acceptance.mjs` – simulering av skador, sköld, blockering, bygge, sparning, vinst/förlust, AI och order.
- `node browser-tests.mjs` – Chromium och WebKit, iPadformat + smal mobil, riktiga pektryck och styrspaksdragningar; samtidiga pekspakar i Chromium. Kräver lokal Playwright-installation angiven i skriptet och server på 127.0.0.1:5185 (alternativ URL via CRAFT_URL).
- `window.render_game_to_text()` / `window.advanceTime(ms)` ger insyn och deterministiska tidssteg för test.

WebKit med emulerad pekskärm är inte ett fysiskt iPad-test.
