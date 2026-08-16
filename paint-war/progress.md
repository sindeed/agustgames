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

## Slutstatus

- Publicerad på GitHub Pages i commit `8b809fd5c8954f8cae95af269aad4307394477a1`.
- Live-HTML och `game.js` svarar med HTTP 200 och rätt filstorlekar.
- Den publicerade Team-versionen är provspelad direkt från liveadressen utan konsol- eller sidfel.
- Nästa steg är bara Agusts egen provspelning och eventuella nya idéer eller balansändringar.

## Grafikuppgradering – ny begäran

- Ny användarbegäran: gör grafiken mycket bättre, med riktiga 3D-människor och en vy som tydligt förändras när spelaren går runt.
- Diagnosen visade att den gamla versionen faktiskt flyttade kameran, men den statiska himlen, den symmetriska startvägen, de enfärgade ytorna, 480×270-upplösningen och orörliga botsprites fick den att kännas som en stillbild.
- Ett nytt WebGL/Three.js-lager är byggt ovanpå den befintliga och testade spelmotorn. Den gamla raycastern är kvar som reserv om WebGL saknas.
- Nytt 3D-lager innehåller belysta och skuggade hus, riktiga fönsterramar, tak, vägar, trottoarer, träd, gatlyktor, färgtunnor, moln, Outroom, animerade 3D-människor, 3D-vapen, kameragung, sprint-FOV, färgdekaler och laserliknande färgspår.
- Den obligatoriska Playwright-loopen har körts flera gånger efter meningsfulla ändringar; senaste bildprovet gav `real-time WebGL 3D` utan konsol- eller sidfel.
- Full QA passerar: rörelse 3,05 enheter, tydlig 0,92-radianers kameravridning, Solo 10×1, Duo 5×2, Team 2×5, korrekt 30/5-skada, båda uppgraderingarna, 90-räckvidd med sikte och Outroom.
- Simulerad iPad passerar utan fel: joystick 2,51 enheter, dragblick 0,72 radianer och skjutknappen skapade en ny bestående färgfläck.
- WebKit/Safari laddade och renderade WebGL-versionen korrekt.
- Skuggkastare optimerades efter första provet; renderanrop sjönk från 1026 till 691 samtidigt som vägg-, tak-, träd- och människoskuggor behölls.
- Visuellt godkända skärmbilder: `output/paint-war-3d-qa/ipad-start.png`, `ipad-after-move-turn.png`, `ipad-after-shot.png`, `ipad-webkit.png` och `desktop-after-turn.png`.
- Three.js 0.185.1 laddas från samma jsDelivr-upplägg som repoets andra 3D-spel; om nätverket eller WebGL saknas fortsätter den gamla raycastern som reserv.
- WebGL-reserven är testad med `--disable-webgl`: endast reservcanvasen finns kvar, dess opacitet är 1 och inga sidfel uppstår.
- Slutlig CDN-version är testad i både Chromium och WebKit/Safari utan konsol- eller sidfel.
- Publicerad på `main` i fjärrcommit `e171255d22168f9829f7407899a4380c5476db79`.
- GitHub Pages levererar nya `index.html` och `graphics3d.js` med HTTP 200.
- Den publicerade Team-versionen är provspelad med rörelse, vridning och skott utan fel; ett separat liveprov i WebKit/Safari rapporterar `real-time WebGL 3D` och `ready: true`.
- Direktlänk: `https://sindeed.github.io/agustgames/paint-war/?v=20260725-paintwar-3d-v2b`.

## Botuppgraderingar – ny begäran

- Ny användarbegäran: bottar får aldrig använda uppgraderade vapen; bara spelaren får uppgraderingar.
- Vapenkontrollen är nu låst till exakt `state.player` i stället för att anta att alla med `bot: false` är spelaren.
- `render_game_to_text` visar den uttryckliga regeln `playerOnly: true`, `botsCanUpgrade: false` samt varje närliggande deltagares vapen, uppgraderingsstatus, eldhastighet och räckvidd.
- Exakt QA passerar när spelaren äger båda uppgraderingarna: spelarens handpistol får 1 ms och långpistolen räckvidd 90 med sikte; botarnas handpistol stannar på 500 ms/räckvidd 34 och långpistolen på sin vanliga 1 ms/räckvidd 42. Båda rapporterar `weaponUpgraded: false`.
- Visuell Playwright-kontroll passerar i 3D utan konsol- eller sidfel: `output/paint-war-player-only-upgrades/shot-0.png`.
- Nästa steg: publicera och liveverifiera iPad-versionen.

## Väggspringning, duckning, möbler och tillfälliga uppgraderingar

- Nya användarbegäranden: spelaren ska automatiskt kunna springa uppför fristående väggar och stå/skjuta ovanpå dem; husväggar och bottar får inte vara klätterbara.
- De 20 cellerna i arenans tre fristående väggar är nu särskilt markerade. Spelaren klättrar när hen fortsätter gå in i en sådan vägg, stannar stabilt på toppen och kan hoppa/gå ned. 3D-världen visar gröna lysande grepp och toppmarkeringar.
- Duckning är tillagd med C/Ctrl på dator och en växlande DUCKA-knapp på iPad/iPhone. Duckning sänker kamera, skottursprung, träffyta och gånghastighet.
- 15 fysiska småmöbler är tillagda: exakt en i vart och ett av nio hus, tre direkt utanför hus och tre ute i den öppna arenan. Samma data styr 3D-mesh, rörelsekollision och skottblockering.
- Möbler kan få bestående färgträffar. Skottstrålar och färgdekaler använder nu verklig höjd, även när spelaren skjuter ned från en vägg.
- Köpta uppgraderingar håller nu i tre färdigspelade matcher. Räknaren sparas, visas i Shoppen och uppgraderingen måste köpas igen efter match tre.
- Botar använder fortfarande endast grundvapen och kan varken klättra eller ducka.
- Syntax- och diffkontroll passerar. Nästa steg: deterministisk gameplay-QA, visuell desktop/iPad-kontroll och därefter publicering.

## Waves, kartval och förenklade mobilkontroller – ny begäran

- Ny användarbegäran: lämna Godot och fortsätt i webbläsarspelet.
- Waves ska ha sju vågor i ett hus som upplevs fortsätta utan slut; bottarna använder endast handpistol.
- Solo och Duo ska alltid öppna kartvalet Huset, Gården eller Byn före matchstart.
- Spelaren ska inte sikta manuellt. Skjutknappen vrider automatiskt mot närmaste levande fiende; väggar och bord stoppar fortfarande skott.
- Mobilkontrollerna ska vara Skjut, Hoppa, Spring, Byt vapen, Flytta bord och Ducka.
- Duckad spelare kan krypa under bord, där bordsskivan fungerar som riktigt skottskydd.
- Kartprofiler, sjuvågslogik, automatisk målsökning, flyttbara bord och bordsskydd är nu under implementation i `game.js`.
- Nästa steg: färdigställ meny/3D-kartväxling, kör Playwright-QA och skapa en riktig iPad-skärmbild.

### Färdig implementation och QA

- Tredjepersonskameran följer spelaren bakifrån, snett ovanifrån; den egna gubben och vapnet syns och förstapersonsvapnet är borttaget.
- Waves använder det oändliga inomhushuset med 32 flyttbara bord och sju verifierade vågor: 2, 3, 4, 5, 6, 7 och 9 bottar.
- Alla Wave-bottar är låsta till vanlig handpistol.
- Solo öppnar verifierat kartval och startar rätt faktisk karta; samma koppling används av Duo.
- Automatisk skjutning verifierad: närmaste bot gick från 100 till 70 HP utan manuell siktning.
- Bordsskydd verifierat: duckad spelare registrerades under ett bord; flyttknappen flyttade bordets riktiga speldata och 3D-modell.
- Simulerad iPad Pro 11 i liggande läge visar alla sex knappar utan fel: Skjut, Hoppa, Spring, Byt, Flytta bord och Ducka.
- Full iPad-QA gav inga konsol- eller sidfel. Resultat: `output/paint-war-ipad-final/results.json`.
- Verifierad riktig iPad-bild: `output/paint-war-ipad-final/ipad-waves-gameplay.png`.
- Nästa steg: publicera de fem Paint War-filerna till Agust Games och liveverifiera sidan.

## Vridbar tredjepersonskamera på iPad

- Ny användarbegäran: ett drag med fingret över den fria spelplanen ska visa gubben från ett annat håll i tredje person.
- Kameran har nu en egen absolut sidvinkel och höjd som inte används för siktning eller skott.
- Joysticken och de sex actionknapparna behåller sina egna pekare, så vänster tum kan styra samtidigt som höger tum vrider kameran.
- Kameran begränsas till en trygg ovanifrånvinkel och hittar mjukt tillbaka bakom gubben när spelaren börjar röra sig efter en paus.
- Menyhjälpen beskriver den nya gesten och spelstatusen exponerar kameravinklarna för exakt iPad-QA.
- Simulerad iPad-QA passerar utan fel: ett svep ändrade sidvinkeln 0,748 radianer och kamerans position 4,48 enheter utan att flytta spelaren eller avfyra skott.
- Tvåfingertestet passerar: joysticken flyttade spelaren 1,33 enheter samtidigt som det andra fingret vred kameran 0,484 radianer.
- Den säkra höjdgränsen 0,46–0,72 höll gubben synlig över husväggarna. Kontrollbild: `output/paint-war-camera-orbit/ipad-after-camera-drag.png`.

### Gubben följer kamerans håll

- Ny användarbegäran: när spelaren drar kameran åt sidan ska gubben vända hela kroppen åt samma håll.
- Spelarens kroppsriktning följer nu kamerans bakdiagonala spelriktning exakt; uppmätt riktningsfel efter svep är 0 radianer.
- Automatisk skjutning använder en separat tillfällig skottvinkel. En bot gick verifierat från 100 till 70 HP utan att gubbens riktning, kamerans vinkel eller kamerans höjd ändrades.
- Full regression passerar fortfarande utan fel: alla sju Waves, kartval, 32 bord, bordsskydd, bordflytt och samtliga sex iPad-knappar.
