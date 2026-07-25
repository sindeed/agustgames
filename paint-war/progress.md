Original prompt: Bygg Paint War som ett förstapersonsspel för dator, iPad och iPhone. Spelet ska ha en stor arena med flera hus, väggar, vägar och golv; färgskott ska stanna kvar på ytor tills matchen är slut. Alla har 100 liv. Handpistolen gör 30 skada och skjuter var 0,5 sekund; uppgraderingen skjuter lika starkt per millisekund. Långpistolen gör 5 skada och skjuter per millisekund; uppgraderingen får sikte och superlång räckvidd. Vid 0 liv åker deltagaren till Outroom. Menyn ska ha Shop, Solo, Duo och Team. Solo är en spelare mot nio bottar, Duo är fem tvåmannalag och Team är två femmannalag.

## Plan

- Bygg ett fristående Canvas-baserat förstapersonsspel utan externa beroenden.
- Lägg till huvudmeny, shop, tre spellägen och sparade vapenuppgraderingar.
- Skapa en stor stadsarena med flera hus som går att gå in i, dörrar, skjutbara fönsteröppningar, vägar och fristående väggar.
- Lägg till tio deltagare, lagregler, bottar, vapen, 100 HP, eliminering och ett separat Outroom.
- Låt missade färgskott lämna synliga färgstänk under resten av matchen.
- Stöd tangentbord/mus och multitouch i liggande läge på iPad/iPhone.
- Verifiera alla viktiga flöden med Playwright, skärmbilder och `render_game_to_text`.

## Status

- Kraven är sammanställda.
- Responsivt UI-skal med meny, Shop, HUD, Outroom, matchslut och touchkontroller är byggt.
- Menyn är visuellt verifierad i lokal Chromium och ser korrekt ut i liggande format.
- Spelmotorn är byggd som ett Canvas-baserat förstapersonsspel med raycasting.
- Arenan är 64×64 med nio hus, interiörer, genomskjutbara fönster, dörrar, vägar, fristående väggar och ett separat Outroom.
- Solo, Duo och Team använder exakt tio deltagare med lagstorlekarna 10×1, 5×2 respektive 2×5.
- Bot-AI, 100 HP, 30/5 skada, båda 1 ms-uppgraderingarna, scope, Shop, Paint-poäng, färgstänk och matchslut är implementerade.
- Joystick, dragblick, skjut-, hopp-, sprint-, vapenbytes- och scopeknappar är kopplade för iPad/iPhone.
- Paint War är länkat från Agust Games-menyn och dokumenterat i README.

## Testnoteringar

- Playwright-menyskärmbild: `output/paint-war-ui/shot-0.png`.
- `node --check paint-war/game.js` passerar.
- Full QA passerar utan konsol- eller sidfel.
- Verifierat: Solo 10×1, Duo 5×2 och Team 2×5.
- Verifierat: handpistolens fyra träffar ger HP 100→70→40→10→0 och skickar målet till Outroom.
- Verifierat: långpistolens 20 träffar med 5 skada skickar målet till Outroom.
- Verifierat: båda uppgraderingarna kan köpas, sparas och lämnar 50 av 300 startpoäng.
- Verifierat: långpistolens sikte zoomar och ökar räckvidden till 90.
- Verifierat visuellt: meny, förstapersonsarenan, iPad-HUD/touchkontroller, Outroom och matchslut.
- Simulerad iPad: joysticken flyttade spelaren 1,66 enheter, dragblick ändrade vinkeln 0,54 radianer och skjutknappen skapade bestående färg.
- QA-resultat: `output/paint-war-qa/results.json`.

## Kvar

- Publicera den verifierade versionen på GitHub Pages och kontrollera liveadressen på iPad-storlek.
