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
- Värld 2:s markfiender och boss kan inte längre gå eller reservspawna på lava;
  flygfiender kan fortfarande flyga över den. Byggkontrollen räknar också lava
  som blockerad när den säkerställer en öppen markväg till hjärtat.
- Värld 2:s nattvågor är ändrade: natt 1 vanlig fiende från F1 varje sekund,
  natt 2 flygfiende från F1 varje sekund, natt 3 en svärdskänslig boss från F1,
  natt 4 en vanlig fiende från vardera F1/F2 varje sekund och natt 5 en
  flygfiende från vardera F1/F2 varje sekund. Därefter öppnas portalen. Bossen
  kan inte skadas av hand, bot, pilblock eller skelett.
- Deterministiskt verifierat över hela 30-sekundersvågor: natt 1/2 ger 30 rätt
  fiender, natt 3 exakt en boss, natt 4/5 ger 30 från vardera F1 och F2 och ingen
  extra spawn sker vid nattens slut. Markfiende och boss väljer A-korridoren i
  stället för lava, reservspawn följer samma regel, bossen kräver tre svärdslag
  och portalen avslutar värld 2 efter natt 5. Tidigare direktattack och
  blockvägskontroll passerar fortsatt utan konsol- eller sidfel.
- Nya dödsbelöningar i Survivor: vanlig fiende och flygfiende ger exakt 2 pengar,
  medan bossen ger exakt 4 pengar. Samma lagpengar delas oavsett om dödsslaget
  kommer från spelare, bot, pilblock eller skelett (bossen kräver fortfarande
  svärd).
- Verifierat i webbläsaren: start från 10 pengar slutar på 12 efter vanlig eller
  flygande fiende och 14 efter boss, med rätt meddelanden och utan dubbla
  belöningar, konsolfel eller sidfel. Värld 2:s vågor, lava, bosskydd och portal
  passerar fortfarande hela regressionstestet.
- Survivor-menyn har fått en stor grön `Freewar`-knapp högst upp. Knappen kan
  tryckas på och visar en ljus markering samt textstate `Freewar valt.`, men
  stannar säkert i menyn tills reglerna för det nya läget är bestämda.
- Verifierat med den ordinarie spelklienten i iPad-landskap: Freewar-knappen
  syns helt utan överlapp, tryck ger markering och textstate `Freewar valt.`,
  och den befintliga Värld 1-knappen startar fortsatt spelet utan konsol- eller
  sidfel.
- Freewar-knappen öppnar nu en egen meny med tre stora tryckbara val: `2 botar`,
  `5 botar` och `8 botar`. Det valda antalet markeras tydligt, och en
  `Tillbaka`-knapp leder tillbaka till den vanliga Survivor-menyn.
- Verifierat i iPad-landskap med den ordinarie spelklienten: alla tre botvalen
  registreras korrekt, `8 botar` syns markerat utan överlapp i menyn, och
  `Tillbaka` följt av Värld 1 startar fortsatt spelet utan konsol- eller sidfel.
- Agust godkände Freewar-kartan. Den är nu inlagd som ett 15×15-fotavtryck med
  tretton sammanhängande 3×3-markgrupper: mänsklig mittbas, fyra inre gångar och
  åtta yttre botbaser. Alla nio baserna har öppna ingångar och varsitt hjärta
  med 3 liv; kartvyn skalar separat så de vanliga 9×9-världarna inte ändras.
- Första iPad-landskapstestet startar Freewar med 8 botar, visar hela den
  godkända kartformen, nio spelare och nio hjärtan utan konsol- eller sidfel.
  Freewar-HUD, dagbyggande, natt-AI och den särskilda shoppen återstår i nästa
  del av bygget.
- Freewar är nu spelbart direkt från valen `2 botar`, `5 botar` och `8 botar`.
  Människan startar i mittbasen och varje deltagare har en egen bas, ett hjärta
  med 3 liv, en spelare med 3 liv och återuppstår så länge hjärtat lever.
- Endast i Freewar varar både dag och natt exakt 60 sekunder. På dagen bygger
  botarna staggerade trä-/sten-/pilförsvar utan att stänga in sig själva; på
  natten får en roterande bot människan som mål medan övriga botar krigar mot
  varandra, bryter fientliga block, slår spelare och förstör hjärtan.
- Freewar-shoppen har trä 5, sten 5, pilblock 20, lava 20, lavablockare 20 och
  svärd 40. Lava kan läggas på fri mark, lavablockaren tar bort den och ett
  vanligt byggblock ersätter lavan med säker mark. Survivor-priserna är helt
  separata och oförändrade.
- Basernas ingångar har fått en andra öppning så en försvarare inte kan låsa
  hjärtat genom att stå i dörren. Alla bas-spawnrutor är byggskyddade, och
  respawn söker utåt efter närmaste säkra ruta i stället för att kunna hamna i
  lava, ett block eller en annan spelare.
- Verifierat med ordinarie spelklient och riktade deterministiska tester: alla
  botval startar rätt antal spelare/hjärtan, människan kan köpa och placera
  block, lava/lavablockare/ersättningsblock fungerar, och 2 respektive 8 botar
  lämnar baserna, slåss, skadar spelare/hjärtan och går vidare till dag 2 efter
  en hel natt. Kart-, shop-, första person- och nattvyer har granskats visuellt
  utan konsol- eller sidfel.
- Survival-regression godkänd i värld 1 och 2: kameradrag, endast-framåt-spak,
  shop, byggkarta och värld 2:s åtta lavarutor fungerar; sten kostar fortfarande
  15 i Survivor. Safari-resurserna har ny Freewar-cachemarkering inför publicering.
- Freewar följer nu sist-kvar-regeln för alla deltagare. Om människan slås ut
  fortsätter matchen i en åskådarkarta där botarna fortfarande bygger och krigar;
  spelarens rörelse-, attack-, shop-, bygg- och raderingskontroller är då avstängda.
  När exakt en deltagare återstår visas rätt vinnare, både `Du vann Freewar!` och
  exempelvis `Bot 5 vann Freewar!`.
- `Ny match` leder direkt tillbaka till Freewars val med 2, 5 eller 8 botar, så
  obegränsat många matcher kan startas med valfritt antal. Menyn förklarar också
  att botvalen tillsammans med spelaren ger totalt 3, 6 eller 9 deltagare.
- Naturliga simuleringar med 2, 5 och 8 botar har alla fortsatt efter människans
  utslagning och nått en ensam botvinnare. Separata tester har verifierat mänsklig
  vinnare, botvinnare, åskådarläge, avstängda kontroller och flera omstarter utan
  tillståndsläckor, konsolfel eller sidfel. Safari-token är nu
  `20260714-freewar-last-standing`.
- Freewar-ekonomin börjar nu på 50 pengar. Varje gång människan dödar en bot får
  laget exakt 10 pengar, både när botens hjärta lever och den återuppstår och när
  boten slås ut helt. Deterministiskt test gav 50 → 60 → 70 → 80 efter tre
  botdödar, med synligt `+10 pengar`-meddelande och utan konsol- eller sidfel.
  Safari-token är uppdaterad till `20260714-freewar-money-50`.
- Sten kostar nu 15 pengar även i Freewar. Botarna varierar sina tre säkra
  försvarsplatser mellan trä, sten, pilblock och lava med en ny slumpad blandning
  för varje match; svärd och lavablockare används inte som byggmaterial. Lava kan
  fortfarande bara tas bort med lavablockaren, och spelaren kan använda den på
  både egen och botbyggd lava. Safari-token är uppdaterad till
  `20260714-freewar-varied-builds`.
- Verifierat lokalt: sex 2-botarsstarter använde varje gång alla fyra material
  och gav tre olika slumpade layouter. Varje botplacering backas nu automatiskt om
  den skulle stänga en tidigare öppen väg ut ur någon bas. I 2-, 5- och
  8-botarsmatcher lämnade alla botar baserna och strid uppstod på natten trots
  lavan. Shoppen drog 15 för sten; raderingsverktyget lämnade botlava kvar medan
  en lavablockare tog bort den.
- Freewar har nu en femdygnsregel: när natt 5 tar slut och exakt två deltagare är
  kvar avslutas matchen oavgjort och båda visas som vinnare. En ensam deltagare
  vinner fortfarande direkt enligt sist-kvar-regeln, medan tre eller fler kvar
  fortsätter till dag 6.
- Freewar-världen är utökad från 15 × 15 till 40 × 45 rutor: exakt åtta gånger
  större kartyta. Samma diamantform och nio baser finns kvar, men baserna ligger
  nu mycket längre ifrån varandra. Safari-token är nu
  `20260714-freewar-varied-builds-draw5-big8`.
- Den stora kartan är verifierad med 2, 5 och 8 botar: samtliga fyra material
  byggdes, alla botar lämnade baserna, strid uppstod och fasbyten fortsatte utan
  lava- eller körfel. Bygg/radera på de nedskalade kartrutorna fungerar på touch.
  Oavgjort människa+bot och bot+bot, dag 6 med tre kvar samt vanlig ensam vinnare
  är testade; Survivor-världarna är fortfarande oförändrade 9 × 9.
- Blockshop har nu en pilbåge för exakt 50 pengar i både Survivor och Freewar.
  Köpet är permanent under matchen och använder inget pilförråd, så spelaren har
  hur många pilar som helst. Pilbågen följer kamerans exakta riktning, har en egen
  `Skjut`-knapp och egen cooldown så `Slå` och svärdet fortfarande kan användas
  oberoende. Båda mänskliga spelarna får varsin skjutknapp i delad skärm.
- Pilbågen skadar vanliga fiender och Freewar-botar med ett halvt liv per träff,
  stoppas av väggar och block och följer Freewars byggfred på dagen. Botdödar ger
  fortsatt +10 pengar och vanliga Survivor-fiender +2. Bossen stoppar pilen utan
  skada och kan fortfarande bara dödas med svärd. Köp vid 49/50 pengar,
  obegränsade skott, räckvidd, diagonal riktning, portalövergång, omstart och
  tvåspelarknappar är verifierade utan konsol- eller sidfel. Safari-token är
  `20260714-infinite-bow`.

## Wilder: The Big City

- Original prompt for this game: Bygg ett nytt spel där Wilder är namnet på en
  stor stad. Spelet ska ses i första person i 3D och göras så verkligt som den
  första webbläsarversionen klarar.
- Spelvärlden ska ha exakt 20 personer: fem poliser, fem tjuvar och tio vanliga
  personer. Spelaren väljer en av dem och de andra 19 styrs av datorn.
- Staden ska ha exakt 13 byggnader som går att gå in i: tio vanliga hus,
  polishuset, tjuvhuset och en fordonsaffär.
- Varje vanligt hus har ett kassaskåp med 50 pengar. Bara tjuvar kan öppna
  skåpen. Alla tio fyrsiffriga koder finns på en lapp i polishuset.
- Polishuset har fem fängelseceller och en räddningsnyckel bredvid kodlappen.
  En fri tjuv kan använda nyckeln för att rädda fängslade tjuvar.
- Alla personer har tre liv. En tjuv som tappar sista livet efter en polis
  klubbslag fängslas. En polis svimmar i tio sekunder vid noll liv och en vanlig
  person i fem sekunder; därefter vaknar personen med tre liv.
- Poliser har klubba gratis. Tjuvar kan köpa klubba för 10. Vanliga personer
  kan inte köpa klubba. Bil kostar 20 och helikopter 30; vanliga personer får
  bara köpa bil. Polisen börjar med en gratis bil, en polishelikopter och
  klubbor. Poliser och tjuvar börjar med 10 pengar. Arbetsantagande i v1:
  vanliga personer börjar med 20 så att deras bilköp kan fungera.
- Bilar och helikoptrar har tio liv, kan köras/flygas och kan explodera.
- Tjuvarna vinner när alla 500 pengar är stulna ur husen och polisbossen i
  polishusets sista rum, med 20 liv, är besegrad. Poliserna vinner när alla fem
  tjuvar sitter i varsin cell. Vanliga personer har inget vinnarmål utan lever i
  staden, kör och handlar.
- Första spelbara 3D-versionen är byggd i `wilder-big-city/` och länkad från
  arkadmenyn. Den har förstapersons-raycasting, karta, mus-/pekdragning,
  tangentbord och stora touchkontroller för iPad.
- Alla 13 byggnader, 20 personer och 19 botar finns i samma stora stad. Botarna
  hittar vägar genom dörrar; poliser jagar/fängslar, tjuvar köper klubba, hämtar
  koder, öppnar kassaskåp, fritar lagkamrater och attackerar bossen, medan vanliga
  personer rör sig i staden.
- Verifierat deterministiskt och i webbläsaren: exakta rollantal, 13 dörrar,
  affärens priser/rollspärrar inklusive touchköp, tio koder, tio kassaskåp och
  exakt 500 pengar, fem synliga celler, räddningsnyckel, svimning i 10/5 sekunder,
  båda vinstvillkoren, bil/helikopter/flygning samt explosion vid 0 av 10 liv.
  Sluttesterna gav inga konsol- eller sidfel.
- Botarnas naturliga matcher är också verifierade: med aktiva poliser kan alla
  fem tjuvar fängslas; med poliserna tillfälligt utslagna köper tjuvbotarna
  utrustning, stjäl 500 pengar och besegrar 20-livsbossen.
- V1-förenklingar att förbättra senare: procedurritad 2,5D-grafik i stället för
  riktiga 3D-modeller, enkel fordonsfysik och inga personliga namn/utseenden för
  de 20 personerna ännu. En riktig knappsats för att själv skriva in varje
  kassaskåpskod kan vara nästa spelmekanik; v1 öppnar skåpet automatiskt efter
  att tjuven har läst kodlappen.
- Ny Wilder-beställning: gallerian ska öppnas när spelaren går in, gripande polis
  ska få exakt 10 pengar, både spelaren och bot-tjuvar ska kunna gripas/fritas,
  poliser får inte gå in i tjuvhuset, och staden/husen ska bli mycket större och
  verkligare.
- Pågående storstadsuppdatering: kartan är nu 152 × 120 = 18 240 rutor, exakt
  tio gånger den gamla kartytan. De tio vanliga husen är 15 × 12 = 180 rutor,
  exakt fem gånger den gamla husytan. Polishus och tjuvhus är 27 × 20 (exakt 5×)
  och gallerian 27 × 18 (cirka 5×). Alla 13 byggnader finns kvar.
- Nya regler inlagda: gallerian öppnas automatiskt en gång per inträde, bara den
  gripande polisen får +10, poliser blockeras från tjuvhuset även genom öppen
  dörr, och tjuvbotar måste fysiskt hämta nyckeln och nå cellerna för att frita
  en eller flera kamrater. Den gamla magiska 12-sekundersfritagningen är borttagen.
- Första verklighetspasset inlagt: världsankrade vägar, vägmarkeringar,
  övergångsställen, trottoarer och gräs; sol, moln, skyline och dimma; högre
  fönsterfasader; lokal radar; två rum och möbler i villorna; träd, lampor,
  bänkar, brandposter samt förstapersonshänder/fordonsinstrument. Gallerian har
  en ny illustrerad butiksskärm. Syntaxkontroll och diffkontroll passerar;
  fullständig webbläsarprovning återstår.
- Sluttest för Wilder storstadsv2 godkänt i Chromium och iPad-landskap utan
  konsol- eller sidfel. Verifierat: 152 × 120 rutor (exakt 10×), alla tio
  15 × 12-hus (exakt 5×), 13 byggnader, 20 personer/19 botar och exakta
  rollantal; galleria vid inträde/återinträde; rollpriser; alla rollers väg in i
  alla vanliga hus; tjuvens väg in i polishuset; polis- och botpolisblockering
  vid tjuvhuset även genom öppen dörr; helikopter kan inte landa där.
- Gripande är testat åt alla håll: spelarpolis och annan botpolis får bara sin
  egen +10-belöning, spelartjuven kan gripas, och fem gripanden ger polisvinst.
  Botfritagningen hämtar nyckeln och når cellerna före fritagning; den gamla
  fjärrfritagningen sker inte, och spelartjuven kan frita flera vänner samtidigt.
- Naturliga botsimuleringar godkända på den stora kartan: aktiva poliser når
  polisvinst med fem fångade tjuvar; med poliser utslagna köper tjuvarna klubbor,
  öppnar alla tio kassaskåp för 500, besegrar 20-livsbossen och vinner. Den
  optimerade vägberäkningen simulerade 120 sekunder på cirka 0,5 sekunder i
  testmiljön. Safari-cachetoken är `20260715-wilder-big-city-v2`.
- Ny Wilder-beställning: exakt tre poliser, fem tjuvar och tio vanliga människor;
  alla fria tjuvar ska börja rädda direkt när någon fängslas; botar ska kunna
  handla och använda bil/helikopter; alla får slå med handen för 0,5 skada.
  Polis och tjuv väntar en sekund när de möts. Tjuvar slår sedan var 0,5 sekund
  och poliser var 1 sekund, så en jämn botduell vinns av tjuven.
- Pågående Wilder-v3: rollantalet är 3/5/10 (18 personer och 17 botar), handslag
  och halva liv är inlagda, botdueller har separat mötestimer, och alla tjuvar
  prioriterar nyckel/celler vid första fångsten. Botfordon har nu förare,
  reservation, höjd, köp och transportmål. Syntaxkontroll och fullständig
  webbläsarprovning återstår efter integrationen.
- Wilder-v3 sluttestad: exakt 18 personer/17 botar och 3/5/10 roller; handslag
  gör 0,5 skada; båda botarna väntar en sekund, tjuven slår därefter var 0,5 s
  och polisen var 1 s, så tjuven vinner en jämn duell. Spelar- och botpoliser
  kan fortfarande gripa och rätt polis får +10.
- Alla fria tjuvar väljer räddningsmål direkt. Verifierat hela kedjan nyckel →
  stöd vid cellerna → alla fångar fria. Tjuvbotar köper klubba och ett eget
  bil- eller helikopterval; människobotar köper bil; polisbotar använder de två
  gemensamma polisfordonen. Förare/reservationer städas vid gripande och explosion.
- Regressioner godkända för galleria, alla tio hus, tjuvhusspärr, båda vinstlägen,
  iPad-landskap och den officiella Playwright-klienten utan konsolfel. Naturlig
  botmatch gav polisvinst; med poliser utslagna stal tjuvarna 500, använde båda
  fordonstyperna och besegrade bossen. Safari-cachetoken är
  `20260715-wilder-big-city-v3`.
- Wilder-v4: tjuvbotarnas grundfart är nu exakt 20 % högre än polisbotarnas på
  fot, i bil och i helikopter. Fartregeln gäller alla tjuvuppdrag, även flykt,
  fritagning, shopping, kassaskåp och bosskamp. Safari-cachetoken är
  `20260715-wilder-big-city-v4`.
- Wilder-v4 sluttestad med den officiella Playwright-klienten utan konsol- eller
  sidfel. I två sekunders kapplöpningar hann tjuven 3 mot polisens 2,5 rutor på
  fot, 12 mot 10 i bil och 13,2 mot 11 i helikopter. Hela Wilder-v3-regressionen
  passerar fortfarande, inklusive roller, galleria, strid, fritagning, fordon,
  tillträdesregler och båda vinstlägena.
- Wilder-v5: vart och ett av de tio vanliga husens kassaskåp är nu
  kopplat till människan med samma nummer. Spelar- och bottjuvar registrerar en
  riktig husstöld, får kassaskåpets 50 pengar och visar vem pengarna stals från.
  Safari-cachetoken är `20260715-wilder-big-city-v5`.
- Wilder-v5 sluttestad utan konsol- eller sidfel: en bot-tjuv öppnade dörren,
  gick från gatan in i Hus 1 och stal 50 från människa-1 efter 8,7 sekunder.
  Tjuvens pengar ökade 10 → 60, stadens stulna summa 0 → 50 och nio fulla
  kassaskåp återstod. Spelartjuven klarar samma stöld, medan en vanlig människa
  stoppas. Den officiella klienten, hela Wilder-v3-regressionen och v4-farttestet
  passerar fortfarande. En naturlig botsimulering stal dessutom alla 500 pengar
  från de tio husen, besegrade bossen och nådde tjuvvinsten utan webbläsarfel;
  båda vinstlägena är kvar.
- Ny Wilder-beställning: människorna ska arbeta med att vakta sina kassaskåp.
  Spelaren är alltid Människa 1 med Hus 1 som hem och ska få en knapp som
  teleporterar hem när spelaren är borta.
- Wilder-v6: Människa 1 startar inne i Hus 1 och får en 🏠 Hem-knapp
  (samt H på tangentbord) som bara visas borta från hemmet. Människa 2–10 är
  kopplade till Hus 2–10; botarna köper fortfarande bil men återvänder sedan till
  sitt kassaskåp och slåss mot en aktiv tjuv inne i det egna huset. Safari-token
  är `20260715-wilder-big-city-v6`.
- Wilder-v6 sluttestad med den officiella spelklienten utan konsol- eller sidfel.
  Hem-knappen är dold hemma och för andra roller, syns ute i staden, landar säkert
  i Hus 1, stänger gallerian, lämnar bilen kvar och blockeras under svimning.
  Alla tio husmappningar är verifierade. En vakt prioriterar en riktig inkräktare,
  väntar en sekund, gör 0,5 skada per handslag och svimmar tjuven utan fängelse.
  Husstöld-, fart-, fordons-, fritagnings- och båda vinsttesterna passerar; med
  poliserna utslagna stal botarna fortfarande 500 och nådde tjuvvinsten.
- Ny Wilder-beställning: när alla fem tjuvar är fångade ska poliserna först då få
  gå in i tjuvhuset och besegra en tjuvrobot. Slutligt rollantal ändrades till
  fyra poliser, fem tjuvar och tio vanliga människor. Polis- och tjuvbotar ska
  röra sig lika snabbt, men tjuvarna ska vara lite starkare.
- Wilder-v7: staden har nu 4/5/10 roller (19 personer och 18 botar). Polis- och
  tjuvbotarnas fart är exakt lika på fot, i bil och i helikopter; tjuvarna behåller
  stridsfördelen genom slag var 0,5 sekund mot polisernas 1 sekund.
- Tjuvhuset är spärrat för poliser tills fem tjuvar sitter i de fem cellerna.
  Femte gripandet håller spelet igång, låser upp dörr, gångväg och landning och
  aktiverar den nya tjuvroboten med 20 liv. Alla polisbotar prioriterar roboten,
  använder transport och går in. Polisvinst kräver både 5/5 fångar och besegrad
  robot; tjuvvinsten 500 pengar + besegrad polisboss är oförändrad.
- Tjuvroboten har egen 3D-figur, livmätare, HUD-rad och kartmarkör. Den slår bara
  vakna poliser, gör 1 skada var 1,1 sekund och en utslagen polis svimmar i tio
  sekunder. Spelarpolisen kan slå roboten med sin klubb och touchknappen fungerar.
- Wilder-v7 är testad med den officiella Playwright-klienten samt egna
  regel-, bot- och iPad-landskapstester utan konsol- eller sidfel. Verifierat:
  låst vid 4/5, upplåst men ingen tidig vinst vid 5/5, spelar- och botattacker,
  robotens motattack, båda vinstlägena och 4/5/10 roller. Fyra polisbotar vann
  roboträden naturligt efter cirka 62 spelsekunder; tre polisbotar vann efter
  cirka 84 sekunder när spelaren var polis men inte hjälpte till. En fängslad
  spelartjuv låg kvar i cellen medan polisbotarna avslutade matchen. iPad-provet
  hade 1024 × 768 utan sidscroll och Safari-cachetoken är
  `20260715-wilder-big-city-v7`.
