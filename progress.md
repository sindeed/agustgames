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
  vänster, 5 höger, 3 ner, 5 vänster, 5 höger, 5 upp, med 500 ms per steg.
- Bana 7: spelaren tappar liv om han står på elaka gubben eller 1–2 rutor framför
  den riktning gubben går. Står spelaren en ruta bakom gubben får han nyckeln,
  L-dörren öppnas, gubben pausar 0,5 s, backar två steg och stannar tills banan
  är klar. Verifierat lokalt utan konsolfel.
- Bana 7 har eget trädgårdstema: grönt gräs, häckväggar, små blommor och egen
  mjuk trädgårdsmusik. Temat används bara på Bana 7.
- Bana 7: den elaka gubben ritas nu som en elak trädgårdsman med grön hatt,
  gröna kläder, brun overall och ett litet trädgårdsverktyg.
