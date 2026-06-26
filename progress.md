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
- Bana 8 Tvillinggången byggd från Agusts karta. En person styr två gubbar
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
