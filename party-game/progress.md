Original prompt: Bygg och publicera Party Game åt Agust (A-G-U-S-T) med lägena Fred och Fri, sex världar och exakt tio figurer totalt.

Spelet är beställt av **Agust** — exakt stavning **A-G-U-S-T**, inte August — och ska heta **Party Game**.

## Komplett kravbild från samtalet

- Agust bad först att inget skulle byggas eller visas medan han beskrev spelet. Det ersattes senare uttryckligen av: bygg spelet färdigt och säg till när det går att spela på iPad.
- Figurerna ska gå med samma mjuka, vingliga gummikänsla som figurerna i *Rubber Bandits*. När någon blir utslagen ska hela kroppen bli slapp, falla ihop och ligga som en ragdoll i stället för att använda en stel fallanimation.
- Spelet ska ses från samma sneda, lätt upphöjda kamerahåll som *Rubber Bandits*. Referensbilden Agust bad om var en gående och en utslagen figur tillsammans i samma värld.
- Första vyn är en meny med mycket stor text **PARTY GAME** och rolig partymusik.
- Menyn har exakt två lägen: **Fred** och **Fri**.
- Varje värld ska alltid börja med exakt **nio bottar plus människospelaren**, alltså **tio figurer totalt**.

### Läget Fred

- Ingen får slåss eller skada/slå ut någon.
- Bottarna går runt fredligt. I staden får bottarna också köra bilar och kan råka krascha dem, men krascher får inte göra figurer utslagna.
- Världsvalet innehåller:
  - **Storstad:** en stor stad med körbara bilar.
  - **Gräs:** ett mycket stort område med bara gräs. Det finns ett staket vid gränsen som går att klättra över. Man kan gå väldigt långt, men världen får inte vara oändlig.

### Läget Fri

- Alla får slåss; människan och de nio bottarna spelar alla-mot-alla.
- Bottarna ska själva slåss, använda tillgänglig utrustning och, där det finns bilar, köra på varandra.
- Världsvalet innehåller:
  - **Storstad:** kör bilar och kör på varandra. Det ska gå att krascha in i hus; bilen går då sönder och föraren ska kunna lämna/hoppa ur den.
  - **Backen:** figurer kan slås omkull och rulla nedför backen.
  - **Plattan:** en plattform högt uppe i luften. Den som ramlar ned åker ut.
  - **Borgen:** en stor borg omgiven av vallgrav. Det finns en hemlig väg in. En figur som börjar inne i borgen kan trycka på en knapp för att öppna vindbryggan.
- I alla fyra Fri-världar börjar varje figur med en egen piratskeppskanon. Kanonen skjuter stora svarta kanonkulor och har oändligt med ammunition.
- I borgen finns dessutom:
  - **Svärd:** exakt tre oblockerade svärdsträffar gör en figur utslagen.
  - **Pilbåge:** en oblockerad pilträff gör en figur utslagen; pilbågen har oändligt med pilar.
  - **Sköld:** blockerar både svärdsslag och pilar.
- När en figur blir utslagen gäller den slappa ragdoll-looken ovan. På Plattan är ett fall däremot en riktig eliminering ur rundan.

### Leveransförväntan

- Spelet ska vara lätt att spela på iPad. I den här webbspelssamlingen betyder det att den publicerade webbsidan laddas om/öppnas på iPad; en vanlig iPad-systemuppdatering kan inte installera spelet automatiskt.
- När allt är färdigt och verifierat ska Agust få en kort, tydlig instruktion för hur han öppnar eller uppdaterar sidan på sin iPad.

## Tolkningar som prototypen får använda

- "Alla världar" i kanonkravet betyder alla världar under **Fri**, inte Fred.
- En direkt kanonkuleträff får slå ut en figur i prototypen; Agust angav ingen annan träffgräns. Ammunitionen får aldrig ta slut.
- En bil kan lämnas frivilligt. När en bil går sönder ska eventuell förare också kastas/kliva ur. Bil- och huskollisioner får inte skada figurer i Fred, medan påkörningar får vara ett vapen i Fri.
- Vanlig utslagning kan återhämta sig efter spelets korta standardtid. Endast fall från Plattan är uttryckligen permanent eliminering för den rundan.
- Grafiken och animationen ska återskapa den efterfrågade mjuka, komiska känslan med egna originalformer och egen kod; inga originalresurser från *Rubber Bandits* ska kopieras.

## Checklista / TODO

- [x] Bygg responsiv meny med PARTY GAME, rolig partymusik, ljudknapp och valen Fred/Fri.
- [x] Bygg kartval: Fred = Storstad/Gräs; Fri = Storstad/Backen/Plattan/Borgen.
- [x] Lägg in exakt en människospelare och nio bottar i varje karta.
- [x] Implementera mjuk vaggande gång, sned upphöjd kamera och slapp ragdoll vid utslagning.
- [x] Implementera Fred utan attacker eller figur-skada; fredliga botpromenader samt botbilskörning/krascher i staden.
- [x] Implementera Freds storstad med körbara bilar.
- [x] Implementera den stora, ändliga gräsvärlden med klättring över staketet.
- [x] Implementera Fri som alla-mot-alla med aggressiva bottar och kartanpassad AI.
- [x] Implementera Fri-stadens bilar: gå in, köra, köra på figurer, lämna, huskrasch, trasig bil och urkastning.
- [x] Implementera Backens nedförsrullning för ragdolls.
- [x] Implementera Plattans fallgräns, eliminering och rundslut.
- [x] Implementera Borgens vallgrav, hemliga väg, knapp och öppningsbara vindbrygga.
- [x] Ge alla tio figurer en egen kanon med stora svarta kulor och oändlig ammunition i varje Fri-karta.
- [x] Implementera Borgens svärd (tre träffar), pilbåge (en träff, oändliga pilar) och sköld (blockerar svärd/pil).
- [x] Implementera tangentbord, iPad-touchknappar, paus/fortsätt/starta om och helskärm med korrekt canvas-resize.
- [x] Exponera `window.render_game_to_text`, `window.advanceTime(ms)` och det avtalade `window.__partyGameDebug`.
- [x] Kör hela testmatrisen i `qa-plan.md`, inspektera spelskärmbilder och verifiera noll nya konsolfel.
- [ ] Lägg till Party Game i arkadmenyn, publicera enligt repo-flödet och ge Agust korrekt iPad-länk/laddningsinstruktion.

## Verifiering

- 191 automatiska kontroller godkända på desktop och iPad i liggande läge.
- Alla sex världar granskade som skärmbilder.
- Meny, Plattan och touchkontroller granskade visuellt.
- Inga JavaScript-, konsol- eller sidfel i slutkörningen.
