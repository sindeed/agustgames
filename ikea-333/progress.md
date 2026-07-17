Original prompt: mib Jag och min kusin vill göra ett spel där man ska, spelet ska vara lite läskigt och det ska vara väldigt kul. Och kommer du ihåg att du gjorde ett spel till mig, som Zelda? Det ska vara stort som den och det ska vara 3D och bra, vad heter det nu igen, bra pixel och sånt. Det ska vara bra, okej? Det ska vara skuggor och ibland ska det komma tsunami, tornado och regn. Ibland. Och det ska vara ibland molnigt, ibland regnigt, ibland regnbågar, okej? Allt ska vara som i riktig värld. Och man börjar i Ikea. Det ska vara en Ikea, och i Ikean, det finns inga rum eller något, det finns bara gamla möbler, och man ska försöka gömma sig för att det finns ett monster som kommer 3:33 varje natt och försöker ta dig. Det är en av våra idéer, vi ska lägga mycket mer i spelet.

# IKEA 3:33 – progress

## 2026-07-16 – första spelbara 3D-versionen

- Byggde en riktig högupplöst förstapersonsvärld i Three.js/WebGL, utan pixelgrafik.
- IKEA skapas deterministiskt i 48 × 48-metersrutor medan spelaren går. Endast 25 rutor på dator eller 9 på mobil hålls renderade samtidigt, så världen kan fortsätta utan en fast kant.
- Lade till gamla garderober, soffor, sängar, bord, stolar, lampor, lådor och hyllor med material, takljus, dimma och mjuka skuggor.
- Möbelbygge fungerar: E bär/placerar, R vrider och flyttade möbler sparas när spelaren går långt bort och återvänder.
- Gömställen fungerar både i möbler och i egna fort byggda av minst tre möbler.
- Dygnsklockan, monstret Skramlaren exakt 03:33, jakt, gömmande, fångst, omstart och överlevnad till 06:00 är spelbara.
- Efter en överlevd natt låses den hemliga utgången upp.
- Vädercykeln innehåller moln, regn, regnbåge, tornadovarning/tornado och tsunamivarning/tsunami.
- Lade till ficklampa, springning, vägmarkörer, paus, helskärm, tangentbord/mus och mobilens joystick/knappar.
- Lade till en 3D-film efter utgången som visar skogen och den blå draken, hajön och båten, det blå larvhålet, robotbutiken, hemsökta huset, spöktåget, öknen/vulkanen och mysteriebyn.
- Samlade hela spelvisionen och kapitelreglerna i `WORLD.md`.

## Integration och testning

- `index.html` laddar Three.js 0.185.1, `style.css?v=4`, `game.js?v=11` och onlinetransporten `multiplayer.js?v=1` som ES-moduler.
- `window.render_game_to_text()` beskriver spelläget för testning och `window.advanceTime(ms)` ger deterministisk tid.
- Rootmenyn och README länkar till `ikea-333/`.
- Playwright-provspelning verifierade rörelse, 03:33-spawn, fångst/omstart, gömställe till 06:00, upplåst utgång, hela filmresan, möbelpersistens, begränsad chunk-memory och mobilrendering.
- Senaste kontrollerna gav inga console- eller page-fel.

## 2026-07-16 – hela resan är nu spelbar

- Ersatte 3D-teasern med 13 riktiga spelvärldar efter IKEA, totalt 14 kapitel.
- Kapitlen ligger i berättelsens ordning: IKEA → enorma skogen och husen → drakgrottorna → drakflygningen → hajarnas ö → båtfärden → elektriska hålet → robotaffären → hemsökta huset → spökstationen och tågfällan → öknen → vulkanön → mysteriebyn.
- Varje värld har egen 3D-miljö, mål, interaktioner, ljus, ljudstämning, risker och en riktig övergång till nästa plats.
- Drakflygningen har styrning och vindringar. Hajarna flyr när båten kommer. Spöktåget är ett riktigt riskval, ökenportalen kan föra spelaren tillbaka till IKEA och vulkanens lava gör detsamma om tiden tar slut.
- Det hemsökta husets förråd ger oändligt många gamla möbler som går att bära, vrida och bygga barrikad med.
- Mysteriebyn använder svenska speltexter men engelska gamla skyltar och ledtrådar, bland annat `VILLAGE FROM 1920` och `FOUNDED 1910`.
- Lade till kapitelmätare, responsiva vägvalsknappar och utökat testläge som beskriver aktiv värld, mål, timers, faror, ledtrådar och val.
- En automatisk genomspelning verifierar hela kedjan, tågfällans omstart och den nya obby-loopen utan konsol- eller sidfel.
- Riktiga tangentprov verifierar att draken måste passera minst fyra flygringar, båten går att styra med A/D, förrådet nås genom en riktig dörr och spöktåget går att utforska innan fällan slår igen.
- Mobilen använder nu en fullhög porträttvy. I 390 × 844 ryms startknapp, HUD, mål, val och touchkontroller utan scroll, klippning eller överlapp.
- Alla 14 startvyer, de mörka kapitlen och den rörliga båtriggen är visuellt kontrollerade. Den officiella Playwright-klienten och slutprovet rapporterar inga console- eller page-fel.

## Kvar att bygga vidare på

- Utöka tvåspelarläget med egen PeerServer/TURN-reserv och fler samtidiga spelare. Nuvarande inbjudningsrum är avsedda för exakt två spelare.
- Ersätta fler procedurmodeller och syntetiska toner med specialbyggda 3D-modeller, animationer och inspelade miljöljud.
- Utöka tsunami/tornado, uppdrag, inventarie, sparfil och mysterierna i byn.

## 2026-07-17 – spöktågets avgång 03:33

- Spökstationen börjar 03:32 och både HUD och tidtabell visar att spöktåget avgår exakt 03:33.
- Efter tjugo sekunder slår klockan 03:33, dörren låses och tåget kör iväg. Den som stannar på perrongen fortsätter till öknen.
- Den som går ombord väntar inne i tåget till 03:33; därefter börjar den tjugo sekunder långa tågfällan.
- Deterministiska webbläsartester verifierar ombordstigning, perrongval, missat tåg, pausad nedräkning och tågfällans omstart utan console- eller page-fel. Hela kedjan genom alla 14 kapitel passerar fortfarande.

## 2026-07-17 – Vulkanön exploderar efter 30 sekunder

- Vulkanens nedräkning börjar på 30 sekunder när spelaren kommer till ön.
- Vid noll exploderar vulkanen och lavan skickar spelaren tillbaka till IKEA; flyktbåten leder fortfarande vidare till mysteriebyn.
- Lavaanimationens styrka följer hela 30-sekunderstimern och de sista tio sekunderna har den starka varningen kvar.
- Deterministisk Chromium-QA verifierar att spelaren är kvar vid 29,999 sekunder och skickas till IKEA vid exakt 30,000 sekunder, utan console- eller page-fel.

## 2026-07-17 – nio nya förstapersonskapitel

- Ny berättelseordning efter mysteriebyn: gamla skolan → fyrstaden → förbjudna hotellet → kyrkogården → det försvunna tivolit → dockmakarens hus → museet efter stängning → det glömda sjukhuset → Fyra våningar ner.
- Alla kapitel använder samma högupplösta Three.js-värld, förstapersonskamera, ljus, skuggor, dimma och ficklampa som resten av spelet.
- Spelmotorn har fått regler för skolpussel och Skramlaren exakt 03:33, tsunami/fyrskydd, hotellfynd och korridorskugga, gravgåtor och gryningsmonster, clownjakt, flyttande dockor, levande museikonst vid midnatt, hemliga sjukhusvåningar och föränderliga källarkorridorer.
- Alla nio världar är färdigmodellerade och sammankopplade. Spelet har nu totalt 23 spelbara kapitel och fortsätter därefter i den nya obby-loopen.
- Fyrstaden har ett slutet skyddsrum under fyren; tsunamin sveper bort spelaren som inte hinner in. Museets nödutgång aktiveras först när klockan verkligen slår 00:00.
- Automatisk Chromium-genomspelning verifierar 187 kontroller genom alla nio nya kapitel, 16 visuella kontrollbilder, rätt omstarter och noll console- eller page-fel.
- En separat slutkörning passerar hela kedjan från IKEA genom samtliga 23 kapitel och tillbaka till den nya skogsloopen. Mobilvyer i 390 × 844 för sju av de nya miljöerna ryms utan scroll, klippning eller webbläsarfel.

## 2026-07-17 – tsunamin kommer efter en minut

- Fyrstadens tsunaminedräkning börjar nu på exakt 60 sekunder.
- Vågförlopp, varning, skyddsrum, förlust och omstart använder samma enminutstimer.
- Chromium-QA verifierar start på 60 sekunder, fortsatt spel vid 59,999 sekunder, oskyddad förlust vid 60,000 sekunder, omstart till 60 och överlevnad i fyrens skyddsrum utan console- eller page-fel.

## 2026-07-17 – välj fritt bland alla 23 kapitel

- Startmenyn har nu en stor `VÄLJ KAPITEL`-knapp med alla 23 världar upplåsta, numrerade och namngivna på svenska.
- Under spelet öppnas samma väljare med kapitelknappen uppe till höger eller tangenten K. Världen pausas medan menyn är öppen och fortsätter korrekt när den stängs.
- Ett val startar det valda kapitlet direkt i högupplöst 3D från första person. Det går även att hoppa tillbaka till det oändliga IKEA från vilket senare kapitel som helst.
- Mobilvyn använder två kolumner och en intern skrollista så att även kapitel 23 går att nå utan sidscroll eller klippning.
- Samtliga 23 riktiga kapitelhopp passerar automatisk Chromium-QA. En separat kontroll med 155 tester verifierar svenska titlar, tangentbord, pausläge, berättelseval, dator- och mobilvy samt noll console- eller page-fel.

## 2026-07-17 – två spelare online via Meddelanden

- Startskärmen och spelmenyn har fått `SPELA ONLINE`/`2P`. Värden skapar ett privat rum för två och delar den hemliga inbjudningslänken via iPadens/iPhonens delningsruta eller kopierar den till Meddelanden.
- Kompisen öppnar länken, trycker `GÅ MED` och ansluts till samma pågående 3D-värld. Länken innehåller en slumpad 128-bitars rumskod och en tredje spelare avvisas med `Rummet är fullt (2/2)`.
- Båda ser varandra som en blågul 3D-spelare med namnet `KOMPIS`. Rörelse, riktning, ficklampa, gömmande, burna möbler och byggda möbler synkas åt båda håll.
- Värden styr världens klocka, monster, faror, pussel, dörrar och kapitel. Gästen kan gå, springa, titta, gömma sig och bygga, och följer automatiskt med genom hissar, portaler och andra stora förflyttningar.
- Kapitelbyte, omstart av samma kapitel, väder, Skramlaren, aktörer, möbler och alla viktiga kapitelvärden synkas. Gästen får värdens aktuella 60-sekunderstimer i fyrstaden.
- Om själva spelkanalen bryts försöker gästen återansluta automatiskt upp till fyra gånger. Värden kan hålla rummet öppet och vänta på att kompisen kommer tillbaka.
- Onlinepanelen är anpassad för porträtt och landskap på iPad: ingen sidoscroll, panelen ryms och alla tryckmål är minst 44 px. Fokus stannar i dialogen för tangentbordsanvändare.
- Riktig QA med tre separata webbläsare verifierar 2/2-anslutning, rörelse åt båda håll, synlig kompisfigur, kapitelbyte, samma-kapitel-omstart, partiteleport, automatisk återanslutning, fullt rum och noll console-/page-fel.
- Regressionstester verifierar dessutom samtliga 23 kapitelhopp och att tsunamin fortfarande träffar exakt efter 60,000 sekunder.

## Nya idéer från Agust och kusinen

- IKEA ska fortsätta skapas medan spelaren går och aldrig ta slut.
- Gamla möbler ska kunna flyttas och byggas till egna gömställen för nattmonstret.
- En svårfunnen utgång leder till en enorm värld med hus, skogar, skogsmonster och drakgrottor.
- Spelaren ska hitta en blå drake och flyga iväg med den.
- Draken släpper spelaren på en liten ö med hajar. När en tidsbegränsad båt kommer flyr hajarna och spelaren måste simma ut och hinna ombord.
- Efter båtfärden faller spelaren ner i ett stort hål med små magiska larver som lyser elektriskt blå på natten.
- Samma läskiga monster som finns i IKEA återkommer i hålet. Den blå draken räddar spelaren.
- Alla kapitel ska använda samma tydliga 3D-pixelgrafik, ljus och skuggor.
- Korrigering: världen ska **inte** vara pixelgrafik. Den ska använda högupplöst riktig 3D med mjuka material, bra modeller, skuggor och många detaljer.
- Världen ska vara minst 100 gånger större än startområdet och fortsätta procedurgenereras så att nya områden nästan aldrig tar slut.
- Efter hålet kommer robotbutiken: en gammal gubbe vinkar men vänder sig aldrig åt höger. När han till slut gör det syns knappar på höger sida, all mat visar sig vara plast och spelarna flyr.
- Spelet ska stödja två spelare och på sikt onlinespel.
- Ljuddetaljer ska omfatta vind, fåglar, hav, hajar, regn, möbelknarr, monster och områdesspecifik stämning.
