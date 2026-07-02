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
  närmaste vanliga/flygande fiende och skjuter en gång per sekund för 0,5 skada.
