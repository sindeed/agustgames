Original prompt: Bygg Where Is Exit 2 med fem uppdrag, intro, slutfilm, samma grafik och knappar som ettan, och gör det spelbart på iPad via Agust Games.

Beslut från Agust:
- Skogsmeny med Starta spelet och Intro. Intro visar återblick från ettan, grinden till kraftverket och Snabbis skugga.
- Uppdrag 1: labyrint vid kraftverket, knapp som laddar en pelare (detaljer delvis öppna).
- Uppdrag 2: starttorn T2, rörliga plattor enligt Agusts karta, Åttaben, måltorn TM med knapp som laddar samma pelare mer; hoppa ner till pelarna.
- Uppdrag 3: hitta en metallstång och lägg den mellan elektriska pelaren och den närmaste. Då får alla pelare ström.
- Uppdrag 4: tillbaka till ettans fabrik, hemligt rum på våning tre bredvid hissen, undvik golvknappar, tryck väggknappen för att tända fabriken, tillbaka till kraftverket.
- Uppdrag 5: bakom ett hus finns mycket lång taklös gallerkorridor med Snabbis och elhinder. Automatisk springning, hoppa/ducka efter varning. Den som träffas av elen blir långsammare. Öppna porten.
- Slutfilm: repris av sista springsträckan från annan kameravinkel, skogen, spelaren springer vidare, Snabbis säger 'Du smet igen. Vi ses igen någon gång.' Två svarta händer bakom ett träd. 'Fortsättning följer'.

Status 2026-10-02: Första spelbara versionen byggd. Samma lågpolygonstil, figurformer och 3D-bibliotek som ettan används. Meny, intro, fem uppdrag och slutfilm finns.

Kontroller: Alla fem uppdragsövergångar och slutfilmen gick igenom utan webbläsarfel. Labyrinten och fabrikens hemliga rum gick att gå igenom med tangentbord. Tornets fyra plattor testades i delar med riktiga hopp. Finalen testades från huset genom Snabbis-korridoren till porten utan elträffar, och om spelaren inte duckar eller hoppar hinner Snabbis ikapp. På iPad-storlek testades pekstyrd förflyttning, hopp och duckknapp. Introfilmen startar spelet när den är slut.

Begränsning: Testerna bevisar inte varje möjlig väg och tajming genom hela spelet i en enda obruten spelomgång. Agust kan vilja justera plattorna eller hinder efter egen provspelning.

Ändringar 2026-10-09, implementerade och lokalt testade:
- Kraftverket ska vara ett sammanhängande stort gräsområde. Labyrinten, tornen, pelarna och vägen till fabriken finns på olika platser samtidigt. Uppdragsbyte får inte teleportera spelaren.
- Labyrinten ska ha väggar runt hela och bara en ingång. Det ska inte gå att gå runt till knappen. Enögat går omkring inne i labyrinten.
- Tornbanan får sex rörliga plattor: två rader med tre i varje, båda till samma måltorn. Åttaben hoppar mellan alla sex. Åttaben är enda monstret som tar sig mellan rörliga plattor; övriga håller sig på fast mark.
- Snabbis hör till finalens korridor.
- Nytt monster Buskis på gräsområdet: rund mörkgrön buske, två gula ögon, korta ben, liknar en vanlig buske när det står stilla och jagar en liten bit när spelaren kommer nära. Vanliga buskar ska läggas till på gräset. Buskis ska vara lika snabbt som Enögat.
- Buskis är kraftverkets vakt och går runt över hela gräsområdet inne i kraftverket, men inte på andra platser.
- Till uppdrag fyra går spelaren själv genom en öppning i kraftverket och följer en liten stig genom skogen till fabriken. Skogsstigen är trygg och har inga monster.
- Vid stigens slut ser spelaren den stora fabriken och sin trasiga blå bil. Spelaren återvänder genom samma entrédörr som låste sig i ettans intro, inte genom EXIT eller direkt till våning tre.
- Fabrikens entré leder till våning ett. Spelaren väljer hissen eller trapporna upp till våning tre och den hemliga dörren bredvid hissen.
- Undantag från regeln om inga teleporteringar: när väggknappen i det hemliga rummet trycks tänds fabrikens lampor och spelaren teleporteras utanför fabriken. Därifrån måste spelaren gå samma trygga skogsstig tillbaka till kraftverket.
- Slutfilmen med händerna behålls: den som spelar ska undra vad händerna är och om det kommer en trea.

- Fabriken i tvåan har inga monster.

Kontroller 2026-10-09: Uppdragsknapparna behåller spelarens position och samma värld. Labyrinten gick att gå igenom med Enögat aktivt. Båda tornradernas hopp testades, och Åttaben besöker alla sex plattor. Buskis kamouflage fungerar och hastigheten är samma som Enögats. Skogsstigen gick att gå åt båda hållen utan monster. Fabriksentrén, båda trapporna och hissen till våning tre fungerar. Det hemliga rummet gick att passera utan golvknappar; väggknappen tänder lamporna och flyttar spelaren utanför fabriken. Finalen gick att klara med hopp och duckning fram till slutfilmen. Pekstyrning, hopp, kamerarörelse och duckning testades i webbläsare med iPad-format. Inga webbläsarfel i dessa kontroller.

Testerna omfattar separata spelavsnitt och använder placeringshjälp mellan vissa avsnitt; de är inte en enda obruten genomspelning. iPad-format testades i webbläsare, inte på fysisk iPad.
