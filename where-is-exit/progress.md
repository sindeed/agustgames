Original prompt: Jag vill ha ett spel som heter Where is Exit.

- Påbörjat: nytt fristående webbspel i `where-is-exit/`.
- Beslut: tre fasta neonlabyrinter där alla dörrar ser ut som EXIT, men bara en är rätt.
- Planerade kontroller: WASD/piltangenter, Space för sökpuls, F för helskärm och touchknappar för iPad.
- Implementerat: start/pause/game-over/vinstskärmar, tre 19x11-labyrinter, sökpuls,
  fyra EXIT-dörrar per bana, skuggor, tre liv, tidsmätning, felräknare,
  syntetiska ljudeffekter, touchstyrkors och helskärm.
- Teststöd finns via `render_game_to_text` och deterministiska `advanceTime(ms)`.
- Kartorna är validerade till exakt 19 tecken per rad och JavaScript klarar `node --check`.
- Playwright verifierar start med Enter, aktiv/utgången sökpuls och en falsk dörr:
  dörren tar ett hjärta, ökar felräknaren och återställer spelaren utan konsolfel.
- Visuellt kontrollerat: cyan sonarvåg, grön YES-dörr, rosa NO-dörrar, tydlig HUD
  och korrekt återgång till fyra likadana EXIT-skyltar.
- Rättat efter provspelning: våningsbannern visas kortare och skuggornas AI hålls
  stilla tills bannern är borta, så spelaren aldrig angrips bakom en skymd karta.
- Komplett riktat Chromium-test godkänt: väggkollision, tre felutgångar → Game Over,
  Enter-återstart, riktig utgång till bana 2, aktiv sonar fryser skuggan, skuggträff,
  riktiga utgångar genom bana 2 och 3, segerläge samt touch-SÖK och touch-rörelse.
- Fullsidiga skärmbilder av Game Over, seger och iPad-landskap är visuellt granskade.
- Polerat: spelaren blinkar inte längre bort vid banstart; osårbarhetsblinkning används
  bara efter en faktisk träff.
- Arkadmenyn och README länkar nu till `where-is-exit/`.
- Slutlig regressionskörning efter poleringen är helt grön för Game Over/återstart,
  skugga/full vinst och touchkontroller. Senaste touchbilden visar spelaren korrekt.
- Helskärm är verifierad i synligt Chromium: F går in i helskärm och Escape går ur.
- Inga kända fel eller lösa TODO:er återstår för första versionen.

## Start-rum med spellägesdörrar

- Ny önskan: när spelet startar ska spelaren börja i ett ganska litet rum med
  tre dörrar märkta Solo, Duo och Team.
- Implementerat ett separat 11x7 start-rum före banorna. Spelaren startar längst
  ned i mitten och går fram till en dörr med samma tangentbords- eller touchstyrning.
- Solo öppnar den befintliga labyrinten. Duo och Team finns som tydliga dörrar
  och svarar "kommer snart" tills deras spelregler är bestämda.
- HUD och touch anpassas i rummet: ingen timer, inga hjärtan och ingen SÖK-knapp.
- render_game_to_text visar nu scene, playMode och alla tre lobbydörrar.
- Verifierat med officiella Playwright-klienten: start → rum, stillastående timer,
  blockerad sökpuls, rummets väggar, Solo → bana 1, Duo-meddelande och
  Team-meddelande. Alla tre dörrtexter är synliga och inga konsolfel hittades.
- Visuellt granskat på desktop och iPad-landskap: rummet är kompakt, skyltarna
  är läsbara, spelaren syns, styrkorset skymmer inte rummet och SÖK är dold.
- Komplett regressionstest godkänt: Solo kan vinna alla tre banor och Game Over
  följt av Enter återvänder till start-rummet med nollställd timer och inget valt läge.
- Inga kända fel eller lösa TODO:er återstår för start-rummet.

## Tredjepersonsperspektiv

- Ny önskan: spelaren ska se spelet ur tredje persons perspektiv.
- Den tidigare ovanifrån-kartan är ersatt av en pseudo-3D-kamera bakom figuren i både
  start-rummet och alla tre labyrinter. Rutlogik, kollisioner och befintliga testvägar
  är oförändrade under den nya renderingen.
- Kameran använder 88 graders synfält, mjuk riktningsändring, perspektivgolv,
  djupskuggade väggar och en fast figur sedd bakifrån med jacka, ryggsäck och ljuskägla.
- Dörrytor hittas med raycasting och skyltar ritas bara på faktiskt synliga ytor.
  Från startpunkten syns Solo, Duo och Team samtidigt med egna neonfärger och status.
- Labyrintens EXIT-skyltar fungerar i perspektiv. Sökpulsen visar cyan ringar, fryser
  skuggor, färgar den riktiga dörren grön med YES och visar en riktning mot den.
- `render_game_to_text` rapporterar nu `camera.mode: "thirdPerson"`, synfält och
  aktuell kameravinkel för automatiska tester.
- Verifierat med den officiella Playwright-klienten: lobbyspawn, kameravändning,
  Solo-scenbyte, labyrintvy, aktiv sökpuls och en synlig grön YES-dörr utan konsolfel.
- Separata Chromium-kontroller godkänner Duo- och Team-meddelandena samt flera
  sammanhängande renderbilder under banbyte och sökpuls.
- Full regression är fortfarande grön för Game Over/återgång till start-rummet,
  full Solo-vinst genom tre banor och iPad-touch. Touchbilden visar att styrkors och
  SÖK-knapp lämnar dörrskyltar, korridor och tredjepersonsfigur fria.
- Inga kända fel eller lösa TODO:er återstår för tredjepersonsvyn.

## Dragbar kamera och mobil

- Ny önskan: dra spelbilden fritt, se figurens huvud, framsida, sidor och hela kropp,
  samt kunna spela med touch på både iPad och iPhone.
- Klart: kamerans yaw är frikopplad från rutrörelsen och canvasen hanterar
  pointer-drag med capture. Horisontellt drag roterar runt figuren och vertikalt drag
  styr en begränsad pitch utan att kameran går under golvet.
- Klart: avataren blandar rygg-, profil- och framvy utifrån kameravinkeln; framsidan
  har ansikte och bröstpanel medan ryggvyn behåller ryggsäcken.
- Klart: stående mobil använder spelbilden upptill och stora touchkontroller undertill;
  liggande mobil behåller den breda spelbilden. Alla touchmål är minst 44 CSS-pixlar.
- Verifierat i Chromium på iPhone stående/liggande och iPad stående samt i WebKit på
  iPhone stående: touchdrag till framvy, Solo-val, SÖK, paus/fortsätt, 19:12-spelbild,
  ingen scroll och inga konsol- eller sidfel.
- Full regression passerar: Game Over tillbaka till start-rummet, full Solo-vinst över
  tre banor och iPad-touch från start-rum till Solo.
- Inga kända fel eller lösa TODO:er återstår för dragkameran eller mobilstödet.

## Tre bottar i start-rummet

- Ny önskan: spelaren ska börja tillsammans med tre bottar; en går till Duo och två
  går till Team.
- Klart: DUBI, TEO och TOTO skapas bredvid spelaren med separata, fördröjda
  gångvägar och stannar vid rätt dörr utan att blockera spelarens rörelse.
- Klart: bottarna ritas som färgkodade små robotar i tredjepersonsvyn och redovisas
  i `render_game_to_text` för automatiska tester.
- Den officiella Playwright-klienten verifierar en spelare plus tre bottar, fördelningen
  en Duo/två Team, gångstatus och tre unika slutpositioner. Mellan- och slutbilder är
  visuellt granskade och båda Team-bottarna syns samtidigt.
- Full regression passerar fortfarande: Game Over tillbaka till start-rummet, full
  Solo-vinst genom tre banor och iPad-touch från start-rum till Solo.
- Inga kända fel eller lösa TODO:er återstår för start-rumsbottarna.

## Kamerarelativ styrning

- Ny önskan: framåt, bakåt, vänster och höger ska alltid räknas från det håll
  kameran tittar åt, på både tangentbord och touch.
- Implementerat: WASD, piltangenter och styrkorset använder kamerans närmaste
  rutriktning. Styrningen uppdateras även medan kameran vrids.
- `render_game_to_text` redovisar nu kamerans aktuella framåt- och högerriktning
  så att alla fyra riktningarna kan verifieras automatiskt.
- Verifierat i Chromium vid alla fyra kardinala kameravinklar: framåt, bakåt,
  vänster och höger flyttar exakt i kamerans riktningar utan att kameran centreras om.
- iPhone-test med touchdrag och styrkors är godkänt utan konsol- eller sidfel.
- Full regression passerar: Game Over/återstart, full Solo-vinst genom tre banor
  och touch från start-rummet till Solo fungerar med kamerarelativa rutter.
- Inga kända fel eller lösa TODO:er återstår för den kamerarelativa styrningen.

## Båtresan, hotellet och följeslagare

- Ny önskan: Duo ska ta med botten vid Duo, Team ska ta med de två Team-bottarna,
  alla lägen ska börja på en styrbar båt och därefter fortsätta till ett hotell med
  en enda nyckel och flera dörrar.
- Namnändring: Team-botten heter TEO; Team består av TEO och TOTO.
- Implementerat: Solo, Duo och Team är spelbara. Duo väljer DUBI, Team väljer TEO
  och TOTO, och valda bottar visas ombord samt följer spelaren i hotellet/labyrinten.
- Implementerat: separat tredjepersonsvy över ett stort hav med vågor, öar, havskarta,
  neonbåt och växling mellan PERSONSTYRNING och BÅTSTYRNING med knapp eller B.
- Implementerat: rätt brygga leder till Ö-HOTELLET. Där finns fyra hotellrum men
  exakt en nyckel; fel dörr behåller nyckeln och rätt dörr leder vidare till labyrinten.
- DUBI/TEO/TOTO hjälper genom att peka ut rätt hotellrum när nyckeln hittas.
- Officiella Playwright-klienten har verifierat start-rum → båt → hotell → nyckel →
  rätt dörr → alla tre labyrintbanor → seger utan konsol- eller sidfel.
- Riktade tester är godkända för Duo och Team, fel och rätt hotelldörr, styrväxling,
  hållen input vid scenbyte samt iPhone 393×852 och iPad 1024×1366.
- Havs-, hotell-, nyckel-, labyrint-, seger- och mobilbilder är visuellt granskade.
- Inga kända fel eller lösa TODO:er återstår för båt- och hotellresan.
