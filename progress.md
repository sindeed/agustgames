Original prompt: Bygg Bana 5: Kodtemplet utifrån Agusts ritade karta.

- Bana 5 ska ha två separata områden, fyra pilfällor i väggarna, K-ruta med koden 25412541, L-kodlås med knappsats, teleportering till M, en orm och en målstjärna.
- Fel kod skickar spelaren tillbaka till start. Pilar skjuts en gång per sekund, flyger ganska långsamt, stoppas av väggar och kostar ett liv vid träff.
- Implementerat: nivålayout, tempeltema, fyra siktande pilfällor, kodskylt,
  knappsats, felkod-reset, teleportering, orm och målstjärna.
- Pågående: syntaxkontroll och provspelning av hela flödet.
- Tillagt teststöd via `render_game_to_text` och `advanceTime`.
- Verifierat: knappsatsen visas, fel kod ger omstart, 25412541 teleporterar till M,
  pilar kostar ett liv och målstjärnan avslutar spelet utan konsolfel.
- Rättat: M blir ny kontrollpunkt efter teleporteringen så en senare träff
  inte kan låsa spelaren i det första rummet.
- Kodtemplet har nu en egen långsammare, ljusare och lugnare musik utan den
  mystiska musikens mörka bas-drone. Övriga banors musik är oförändrad.
- Bana 2 Riddarborgen har fått en egen medeltida riddarmarsch med stadig rytm.
- Koden på K-rutan göms medan knappsatsen vid L är öppen, så spelaren
  måste komma ihåg 25412541.
- Bana 4: spelarens vanliga steg tar nu 500 ms, exakt lika lång tid som den
  rullande stenens steg. Stenens försprång på en sekund är kvar.
- Bana 5: koden är dold tills spelaren står på K-rutan. Den försvinner igen
  när spelaren lämnar K och är fortfarande dold vid knappsatsen.
- Bana 4: stenen väntar nu två sekunder efter start eller omstart innan den
  börjar rulla. Därefter har spelaren och stenen samma hastighet.
- Bana 4: gubben och stenen tar nu 150 ms per ruta, samma vanliga fart som på
  de andra banorna. När stenen rullar över ett hål stannar den i en sekund.
- Bana 4: grupperna med tre och två spruckna rutor har ersatts med ett vanligt
  synligt hål i den vänstra rutan i varje grupp. Resten är vanligt golv.
- Bana 5: K-rutan är nu säker. Alla flygande pilar försvinner och inga nya
  skjuts medan spelaren läser koden. Fällorna väntar en sekund efter att K lämnats.
- Game Over startar nu om hela spelet från Bana 1 med noll poäng. Bana-väljaren
  visas inte på Game Over-rutan, så man kan inte hoppa över tidigare banor.
- Bana 6 Bossarenan byggs från Agusts karta, vriden 90 grader åt höger och
  med spelare/boss bytta: spelaren uppe till vänster, bossen nere till höger.
- Bossen står stilla, har tre liv och slår varje sekund på alla åtta rutor
  runt sig. Spelaren kan slå lika långt med A eller en rund röd iPad-knapp.
- Verifierat Bana 6: ett diagonalt slag tar ett bossliv, tre slag vinner, bossens
  diagonala slag tar ett spelarliv, och iPad-knappen är rund/röd och dold på Bana 5.
- Bana 6 har en egen snabb och spännande bossmusik i d-moll. Musikvalet styrs
  av arenatemat och påverkar inte någon av de andra fem banorna.
- Bossen på Bana 6 slår nu en gång var 1,5 sekund. Spelarens svärdshastighet
  är oförändrad.
- Bara Bana 4 har springhopp: trycker spelaren HOPP under ett vanligt steg köas
  hoppet och startar vid nästa ruta, med landning två rutor fram. Bana 1 är oförändrad.
- Bana 4: gubben tar 150 ms per ruta och stenen tar 175 ms per ruta, så gubben
  är lite snabbare än stenen.
- Bana 6: bossen slår nu en gång per sekund.
- Bana 6: bossen har nu fem liv och måste träffas fem gånger för att besegras.
- Bana 4: springhoppet registrerar nu pil + HOPP även när knapparna trycks nästan
  samtidigt på iPad. Ett vanligt hopp landar efter en orm som är 1–3 rutor framför.
- Bana 3: draken har tre liv och spelaren får samma svärd och röda slagknapp som
  på Bana 6. Målet är borttaget; draken måste besegras för att klara banan.
- Bana 7 Trädgården byggd från Agusts karta. Spelaren startar på S, L är en låst
  dörr och M är målet/hem. Den elaka gubben patrullerar i ordningen 2 ner, 5
  vänster, 5 höger, 3 ner, 5 vänster, 5 höger, 4 ner, 6 vänster,
  6 höger, 9 upp, med 500 ms per steg. Sedan börjar samma ordning om igen.
- Bana 7: efter första 5 vänster går gubben 5 höger och sedan 3 ner.
- Bana 7: efter 3 ner går gubben 5 vänster, 5 höger, 4 ner, 6 vänster,
  6 höger och 9 upp, sedan börjar patrullen om.
- Bana 7: spelaren tappar liv om han står på elaka gubben eller 1–2 rutor framför
  den riktning gubben går. Står spelaren en ruta bakom gubben får han nyckeln,
  L-dörren öppnas, gubben står still i 0,5 sekund och börjar sedan jaga spelaren
  där spelaren är. Spelaren ska springa in till målet. Verifierat lokalt utan
  konsolfel.
- Bana 7 har eget trädgårdstema: grönt gräs, häckväggar, små blommor och egen
  mjuk trädgårdsmusik. Temat används bara på Bana 7.
- Bana 7: den elaka gubben ritas nu som en elak trädgårdsman med grön hatt,
  gröna kläder, brun overall och ett litet trädgårdsverktyg.
- Bana 7: patrullen loopar för alltid. Efter 25 steg går trädgårdsmannen 4 ner,
  6 vänster, 6 höger och 9 upp, sedan börjar samma patrull om igen.
- Bana 7: första nedsteg efter första 5 vänster är 3 ner.
- Bana 7: trädgårdsmannen ser nu mindre läskig ut med mjukare färger, snällare
  ansikte och mildare varningsmarkering.
- Bana 7: patrullen börjar med 2 ner och gubben tittar nedåt från start.
- Alla banor: hopp kan nu gå över stockar, men inte över stenar.
- Bana 8 Spegeltemplet byggd från Agusts karta. En person styr två gubbar
  samtidigt; de delar på tre liv. Båda måste stå på varsitt M-mål för att klara
  banan, och en gubbe som står på M kan inte röra sig mer.
- Bana 8: O-rutan är bara för ormar. Ormen kan gå in i O, vänta en sekund och
  fortsätta till nästa ruta, men spelarna kan inte gå in i O.
- Bana 8: två pilfällor skjuter en gång per sekund. Den övre siktar på den övre
  gubben och den undre siktar på den undre gubben. V-rutor är väggar.
- Verifierat lokalt: Bana 8 laddar, båda gubbarna rör sig samtidigt, målvillkoret
  kräver båda M-rutorna, M-gubben stannar kvar, hopp går över stock men inte sten,
  och inga konsolfel hittades i Chrome-testet.
- Bana 8: ormen väntar nu en halv sekund i O-rutan istället för en sekund.
- Bana 8: den övre gången är en ruta längre åt höger. Efter sex steg åt höger
  har väggen framför flyttats ett steg åt höger.
- Bana 8: för gubbe 2 är väggen direkt höger efter sju steg flyttad tre rutor
  upp. Rutan nere blir golv och den nya väggrutan sitter tre steg högre upp.
- Bana 8: för gubbe 1 är väggen direkt höger efter sju steg flyttad tre rutor
  ned. Rutan uppe blir golv och den nya väggrutan sitter tre steg längre ned.
- Bana 8: när båda gubbarna har gått åtta steg åt höger är väggarna mellan dem
  ihopkopplade till en hel lodrät vägg.
- Bana 8: när gubbe 1 har gått åtta steg åt höger är rutan direkt ovanför honom
  nu vägg.
- Bana 8: de tre ihopkopplade väggarna mellan gubbarna efter åtta steg åt höger
  är flyttade ett steg åt höger.
- Bana 8: efter sex steg åt höger för gubbe 1 är rutan framför honom vägg, och
  väggen fortsätter tre rutor nedåt. Rutan ovanför gubbe 1 efter åtta steg åt
  höger är golv igen.
- Bana 8: ormen fortsätter nu två steg nedåt efter O-rutan.
- Bana 8: den översta pilfällan är flyttad två rutor upp in i väggen. Väggarna
  direkt vänster och höger om pilfällan är borttagna.
- Bana 8: väggen diagonalt höger från det nedersta V:et är borttagen, så gubbe 2
  kan gå in mot sitt mål.
- Bana 8: pilfällorna skjuter nu varannan sekund.
- Bana 8: om båda gubbarna hamnar på samma mål stannar gubbe 1 kvar, men gubbe 2
  får gå ut igen och fortsätta till det andra målet.
- Bana 8 heter nu Spegeltemplet.
- Bana 8: om båda gubbarna hamnar på exakt samma ruta tappar laget ett liv.
- Bana 3: draken skjuter nu även diagonalt. Elden går i åtta riktningar:
  upp, ner, höger, vänster och alla fyra diagonaler.
- Bana 9 Strålbossen: 7x7-arena med vägg runtom. Spelaren startar uppe till
  vänster, bossen står i mitten, har tio liv och måste besegras med samma
  svärd/SLÅ-knapp som Bana 6. Bossen loopar för alltid: ett medsols laservarv
  på två sekunder, sedan fyra meteorer: en vid övre kanten, en vid högra kanten,
  en vid nedre kanten och en vid vänstra kanten. Meteorerna visar skugga i en
  sekund innan de landar, så spelaren hinner gå bort. Varje meteor landar på
  ett 3x3-område, alltså nio rutor.
- Bana 6 Bossarenan: efter varje vanlig bossattack släpps en meteor som siktar
  på spelarens ruta. Det fortsätter attack → meteor hela tiden tills bossen är
  besegrad.
- Bana 6: bossens meteor träffar nu bara exakt en ruta. Bana 9 behåller sina
  större meteorer som träffar 3x3, alltså nio rutor.
- Verifierat lokalt i Chrome: Bana 6-meteoren har area 1 och tar ett liv när
  spelaren står i exakt den rutan. Bana 9-meteorerna har fortfarande area 9.

## Survivor of Days and Blockshop of Building

- Nytt spelprojekt påbörjat i `survivor-blockshop/`.
- Originalidé från Agust: färgglatt pixelspel där spelaren bygger en bas,
  skyddar ett hjärta, köper block i Blockshop och överlever fem dygn i värld 1.
- Första versionen ska innehålla både 1 spelare och 2 spelare på samma skärm.
- Grundfiler skapade: `index.html`, `style.css`, `game.js`.
- Root-menyn länkar nu till spelet och README listar den nya spelmappen.
- JavaScript-syntaxkontroll går igenom med `node --check`.
- Ritordningen för shop-overlay justerad så underliggande spelknappar inte ritas
  ovanpå Blockshop.
- Korrigering från Agust: de inre rutorna på kartan är spelrutor; det helt vita
  utanför kartan är vägg. Värld 1 har därför inga fasta inre vita väggar, men
  har en tydlig vit yttervägg runt 9x9-kartan.
- Tom vald plats i lilla gallerian ritas nu som tom ruta med markerad ram, inte
  som ett gult block.
- Verifierat med Playwright/browser:
  - startskärm och 1-spelarläge laddar utan konsolfel,
  - Blockshop kan köpa två träblock för 10 kronor,
  - byggläge placerar block,
  - raderingsläge tar bort block och ger tillbaka blocket,
  - hjärtknappen flyttar hjärtat på dagen,
  - 2-spelarläge startar P1 och P2 på samma skärm,
  - P1 rör sig med WASD och P2 med piltangenter,
  - natt 1 spawnar vanlig fiende från F,
  - vanlig attack gör 0,5 skada och två slag dödar vanlig fiende för +5 kronor,
  - natt 2 spawnar fiender från F och övre vänstra hörnet,
  - dag 3 visar varningen "Köp svärd!",
  - natt 3 spawnar boss med 3 liv,
  - bossen tar ingen skada utan svärd och dör av tre svärdslag,
  - natt 4 spawnar flygande fiender,
  - natt 5 spawnar tre flygande fiender per våg,
  - portalen öppnas uppe till vänster efter natt 5 och avslutar värld 1 när
    spelaren går in i den.
- Fixat iPad/touch-kontroller: rosa Slå-knappen låg ovanpå högerpilen på
  styrkorset. Slå-knapparna är flyttade så högerpilen går att se och trycka.
- Agust såg fortfarande problem på iPad. Slå-knapparna flyttades längre in mot
  mitten, bort från båda styrkorsen: P1 till vänster om mitten och P2 till höger
  om mitten.
- Lilla gallerian flyttades lite nedåt så den rosa knappen inte täcker texten
  "Lilla gallerian" heller.
- Agust förtydligade fiendereglerna: alla fiender och bossen ska alltid gå mot
  hjärtat på natten. De slår nu varannan sekund. En fiende slår bara spelaren
  när spelaren står i nästa steg på vägen mot hjärtat; annars fortsätter fienden
  mot hjärtat.
- Blockshop har fått Healerdryck för 2 kronor. Den hamnar i lilla gallerian,
  kan inte byggas som block, och knappen "Drick healerdryck" helar den skadade
  spelare som har minst liv helt upp till 3/3. Verifierat i 1- och 2-spelarläge.
- Spelarskada från fiender ändrad: bossen tar 1 helt liv när den slår spelaren,
  medan vanlig fiende och flygfiende tar 0,5 liv. Hjärtats skada är oförändrad.
- Fiender, flygfiender och bossen jagar nu en spelare som står inom två steg runt
  fienden, även diagonalt. Om ingen spelare är så nära går de mot hjärtat.
- Spelarens attack träffar nu runt spelaren i alla åtta angränsande rutor.
  Handen gör 0,5 skada, svärdet gör 1 skada, och bossen kan fortfarande bara
  skadas med svärd.
- Healerdrycker kan nu säljas från lilla gallerian med samma säljknapp som block.
  Vanliga fiender och flygfiender har 0,5 liv.
- På dag 1 väntar en fiende 1 sekund när den kommer fram till en spelare innan
  första slaget. Från dag 2 och framåt slår fiender direkt när de är framme.
- Alla nätter i Survivor är nu 30 sekunder. Dagarna är fortfarande 60 sekunder.
- Survival-spelets startskärm och spelpanel visar nu: dagen är 1 minut och
  natten är 0,5 minut.
- Blockshop har fått byggbara Pilar för 7 kronor. En placerad pilruta siktar på
  närmaste vanliga/flygande fiende och skjuter varannan sekund för 0,5 skada.
  Pilar skjuter inte på bossen.
- Verifierat med riktat Playwright-test: pilblock skjuter inte före 2 sekunder,
  dödar vanlig fiende med två skott, och skjuter inte alls när bara boss finns.
- Blockshop har fått Hjärtmedicin för 30 kronor. Köpet helar hjärtat direkt till
  fullt liv och hamnar inte i lilla gallerian.
- Pilfällor kostar nu 20 kronor, skjuter var tredje sekund, skjuter inte genom
  byggda block och kan slås sönder av vanliga fiender/bossen. Fiender väntar
  0,5 sekund första gången de når en spelare och slår sedan varje sekund.
- När en spelare dör blir det inte Game Over längre. Spelaren får fullt liv och
  börjar om på hjärtats ruta; bara hjärtats död förlorar spelet.
- Verifierat med riktat Playwright-test och skärmbild: pilfällans pris/timer,
  blockerad sikt genom byggda block, fiendens blockslag, spelar-respawn,
  hjärt-Game-Over och dag 2-varningen fungerar.
- Värld 2 första spelbara version byggd: menyval för värld 1/värld 2, portal
  från värld 1 till värld 2, ny karta från Agusts ritning, fasta V-väggar,
  lava som respawnar spelaren vid hjärtat, A-golv där man inte kan bygga/flytta
  hjärtat, F1/F2-spawns, och e-rutor som väcker skelett-hjälpare. Värld 2
  natt 1 spawnar en vanlig fiende per sekund från F1; natt 2-5 har tillfälliga
  enkla vågor tills Agust bestämmer dem mer exakt.
- Verifierat med Playwright: värld 2 kan startas från menyn, byggförbud gäller
  på V/L/A/e/F, lava-respawn fungerar, skelett kan slå fiender, fiender kan slå
  skelett, F1 spawnar varje sekund natt 1, och värld 1-portalen går till värld 2.
- Survivor har nu en första enkel 3D/förstapersonsvy i vanligt spelläge. När
  spelaren öppnar shop, byggläge, raderingsläge eller hjärtflytt växlar spelet
  tillbaka till kartvy så rutor fortfarande går att trycka på. `render_game_to_text`
  visar `cameraView` som `firstPerson3d` eller `map`.
- Verifierat med syntaxkontroll och Playwright: vanlig start visar `firstPerson3d`,
  byggknappen växlar till `map`, B-tangenten växlar tillbaka till 3D, högerstyrning
  fungerar efter växlingen, och skärmbilderna visar både 3D-vy och kartvy.
- Survivor har fått touch-spak på styrkorset: håller och drar man på P1/P2-kontrollen
  fortsätter spelaren gå åt spakens riktning tills man släpper. Vanliga tryck på
  pilarna fungerar fortfarande. Verifierat med Playwright att P1-spaken registrerar
  riktning, flyttar spelaren flera rutor medan den hålls nere, släpper korrekt,
  och byggläge/kartvy fortfarande fungerar efteråt.
- De vanliga synliga pilknapparna på Survivor-spaken är borttagna. Ett vanligt
  tryck i spakens mitt flyttar inte längre spelaren; man måste dra spaken. Verifierat
  med Playwright att tryck inte flyttar, drag flyttar, och skärmbilden visar rund
  spak utan pilknappar.
- Survivor kan nu styras genom att dra på själva spelbilden i vanligt spelläge,
  inte bara på den runda spaken. Dragets startruta blir en tillfällig spakpunkt
  och riktningen väljer vart spelaren går. Knappar som Shop/Bygg/Slå hanteras
  fortfarande före dragstyrning. Verifierat med Playwright att drag på 3D-bilden
  flyttar spelaren och att Shop-knappen fortfarande öppnar shoppen.
- Dragstyrningen har gjorts robustare för iPad: nästan hela canvasen i vanligt
  spelläge kan starta en tillfällig dragpunkt, förutom HUD/hotbar/knappar. Spelet
  lyssnar nu även på `touchstart`/`touchmove`/`touchend`, inte bara pointer events.
  Verifierat med simulerade Touch Events att dragpunkten syns på spelbilden,
  riktningen blir vänster, spelaren rör sig och draget släpper korrekt.
- Agust ändrade sig: drag på själva spelbilden ska inte längre flytta spelaren.
  Dragstyrningen är åter begränsad till den runda spaken, men touch-stödet för
  spaken finns kvar. Verifierat att touch-drag på spelbilden inte startar joystick
  och inte flyttar spelaren, medan drag på runda spaken fortfarande flyttar.
- Survivor iPad-knappfix: Pointer Events och Touch Events registreras inte längre
  samtidigt. Moderna iPads använder Pointer Events och äldre enheter får Touch
  Events som reserv, så samma tryck kan inte växla Shop/Bygg/Hjärta/Radera två
  gånger eller råka genomföra två köp.
- Survivor har fått en mycket verkligare förstapersonsvy med snabb DDA-raycasting,
  korrekt djup och väggskymning, dagsljus/sol/moln, natt/måne/stjärnor, dimma,
  perspektivmark med gräs eller sten, texturerade trä-/sten-/pilväggar, händer,
  svärd, sikte och formritade hjärtan, fiender, bossar, flygare och skelett.
- Verifierat lokalt: dag i värld 1, natt med synligt hjärta och fiende, värld 2,
  kart-/byggläge och Blockshop renderas utan konsolfel. iPad-test passerar både
  Pointer Events och äldre Touch Events-reserv; ett tryck kör varje knapp en gång,
  köp dras bara en gång och touch-spaken fungerar fortfarande.
- Survivor-länkarna till `game.js` och `style.css` har fått en versionsmarkering,
  så Safari på iPad tvingas hämta den nya verkligare versionen i stället för en
  gammal cachad fil.
- Survivor P1 har nu fri förstapersonskamera: dra i själva 3D-bilden för att se
  åt sidorna och upp/ner utan att spelaren flyttas. Yaw är helt fri och pitch är
  säkert begränsad så himmel och mark alltid kan renderas.
- P1-spaken är nu endast FRAMÅT. Vänster-, höger- och neddrag flyttar inte
  spelaren; uppdrag går framåt i den rutnätsriktning kameran tittar och stannar
  direkt när fingret släpps. P2:s separata fyrvägskontroll är oförändrad.
- Verifierat med simulerad iPad-touch i både Pointer Events och äldre Touch Events:
  fri look ändrar kamera men inte position, framåt följer kameran efter vridning,
  sid-/bakåtdrag ignoreras, släpp stoppar rörelsen, och Shop/Bygg/köp/placering
  fortsätter fungera utan dubbeltryck eller konsolfel.
- Survivor 2P har nu äkta delad förstapersonsskärm: P1 får övre vyn och P2 den
  undre. Båda har egen yaw/pitch-kamera, egen framåtspak och egen SLÅ-knapp, och
  två fingrar kan styra kamerorna samtidigt utan korskoppling. Shop och byggläge
  växlar fortfarande till den gemensamma kartan.
- Menyn har fått `1 + bot` i båda världarna. BOT 2 har en egen observerbar vy,
  vaktar två rutor från hjärtat på dagen och väljer nåbara hot på natten. Den
  undviker lava, väggar, block, spawns, portal, spelare och andra figurer, slår
  närliggande fiender först och ignorerar bossen tills laget har svärd.
- Botens beslut körs deterministiskt var 0,25 sekund. Den använder vanliga
  spelarregler för rörelse, attack, skada och respawn och kan inte styras via P2-
  kontroller. Botläget bevaras vid portalövergång till värld 2.
- Verifierat slutligt med riktig samtidig CDP-touch i iPad-landskap: 23/23 P0-
  tester passerar efter de sista rättningarna. Båda spelarnas look/framåt/släpp,
  kontrollrensning vid Shop/Bygg, botens nattdödande, värld 2-säkerhet och hela
  1P-flödet fungerar utan konsol- eller sidfel. Split-, bot- och kartvyer har
  granskats visuellt och är korrekt klippta utan överlapp.
- Korrigering av botläget: botens egen förstapersonsbild visas inte längre. `1 +
  bot` visar bara P1:s fullstora kamera, medan boten fortfarande syns som figur i
  världen, har liv i HUD:en och fortsätter vakta/slåss själv. Delad skärm används
  endast när två människor spelar.
- Lokalt regressionstest med spelklienten visar en enda fullstor P1-kamera i
  botläget och fortsatt två korrekt klippta kameror när två människor spelar,
  utan konsol- eller sidfel.
- Fiender slår nu direkt vid första kontakt med en mänsklig spelare eller bot,
  även när kontakten uppstår på fiendens eget rörelsesteg. Efter första slaget
  är den vanliga attackrytmen fortfarande ett slag per sekund.
- Verifierat deterministiskt: en fiende som går från diagonal ruta till kontakt
  tar omedelbart 0,5 liv från P1 respektive BOT 2, gör inget extraslag före en
  sekund och slår igen när sekunden gått. Botläget är även granskat med den
  ordinarie spelklienten utan konsol- eller sidfel.
- Blockplacering kontrollerar nu strukturella markvägar från båda fiendespawns
  och alla befintliga markfiender till en attackruta bredvid hjärtat. Om det
  senaste blocket stänger en nödvändig väg tas just det blocket bort direkt och
  behålls i spelarens lilla galleri.
- Verifierat i värld 1 och 2: lagliga block ligger kvar och förbrukas; sista
  blocket runt hjärtat, block i värld 2:s enda korridor och block som fångar en
  befintlig markfiende tas bort utan att förbrukas. Trä, sten och pilblock är
  testade, flygfiender ger inga falska stopp och ordinarie köp/byggflöde fungerar
  visuellt utan konsol- eller sidfel.
