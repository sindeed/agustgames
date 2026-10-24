Original prompt: Bygg, testa och publicera hela Where Is Exit 3 på Agust Games. Övergiven skola med matte, svenska, engelska, SO, NO och idrott. Samma 3D-stil och touchkontroller som ettan/tvåan. Alla sex ämnen krävs före flykt via matsal, kök, lastbil, lövhög och skog. Sluttext: Fortsättning följer.

Start: 2026-10-09 17:58 Europe/Stockholm. Grov uppskattning: 1–2 timmar inklusive verifiering.
Arbetskopia: separat klon av aktuell main; skydda alla ändringar i agustgames.

Krav som ska bevaras:
- Tavlor med native textinmatning och sudd; svar sparas under omgången, automatiskt klara vid kompletta korrekta svar. Inget inlämningssteg eller nollställning av andra svar. Svensk bok hålls synlig bredvid tavlan.
- Enögat i korridor, Snabbis på skolgård, Åttaben i fyrdubbelt stor idrottssal. Munvrålet är svart, lika lång som Enögat, utan ögon, med enda munnen: gullysande. Servitris i matsalen; händerna från tvåans slut.
- Idrott i ordning: tio bollträffar, byggväg ovanför golvet till mål, 30 s gömma + 30 s söka. Byggbara/flyttbara kuber och mattor.
- Ute: två sorters gungor, två lika snabba rutschkanor, kulle, klätterställning, genomgående lekstuga/tryggt tak, två snurror, bollförråd, frivillig fotboll till tre. Gungor och bollar bromsar; snurror kastar Snabbis till lilla rutschkanan.
- Alla sex ämnen före matsalsflykt. Oändligt vatten stoppar Munvrålet exakt fem sekunder, upprepningsbart. Köksgångar: vänster matlagning, höger disk, rakt fram lastkaj. Skydd i lastbil, vrid nyckel, kör, hoppa oskadd i lövhög, gå till skog, film med rätt replik och Fortsättning följer.

2026-10-09: Läser faktisk källkod och publiceringsbas. Inga ändringar i tidigare spel. Ingen musik beställd; bygger enbart korta interaktionsljud.

2026-10-09 18:20: Komplett första genomgång i Chromium: 69/69 kontroller gröna, inga konsolfel. Native skrivtavlor, sparade svar/sudd, bok, alla ämnen, pekjoystick/kameradrag/hopp, skydd/gungor/rutschkanor/klätterställning/lekstuga, snurror, bollar, tio träffar, fysisk byggväg, 30+30 s kurragömma, frivillig fotboll och full flykt/slutfilm testade. Testerna använder placeringshjälp mellan separata avsnitt och riktiga kontroller/fysik inom avsnitt. Ingen fysisk iPad-testning.

Åtgärdade testfynd: Snurrornas längre söktid skrevs över av generellt skydd; använder nu längst giltig tid. Kurragömma har riktig siktlinje och upptäckt även när spelaren står högt. Testets byggväg måste gå runt fasta skärmar och landa på sina byggdelar; verifierat fram till målytan. Sista puts: synlig kastbåge för Snabbis och hopp upp på lastbilstaket samt bakåtvänd sikt under körningen.

Slutlig lokal verifiering: Chromium 71/71 inklusive riktiga pekhändelser. WebKit 68/68 för spelkedjan och 27/27 extra kontroller för dörrar, väggar, fångst, förlust, paus, omstart, stående skärmformat, tangentbordsyta och portallänkar. Inga JavaScript- eller konsolfel. Alla 14 befintliga portallänkar är oförändrade; en ny länk till trean tillagd. Syntaxkontroller och git diff --check passerade. Återstår: publicering och liveverifiering.


Publicerad och liveverifierad 2026-10-09 18:29 Europe/Stockholm.
- GitHub-commit: dfd4b81284cc27a363c856077bde274b600c18d1. Pages-körning 37959249672 avslutad med success.
- Live: https://sindeed.github.io/agustgames/where-is-exit-3/?v=20261009-1 . Portalens första spelkort leder till trean.
- Alla sju laddade portal-/spelfiler returnerade HTTP 200 och SHA-256 matchade publiceringskopian.
- Live Chromium: 71/71 kontroller, inklusive pekhändelser, skrivning, byggväg och full slutsekvens.
- Live WebKit: 27/27 extra kontroller, inklusive dörrar, förlust, omstart, stående format, tangentbordsyta och portallänk. WebKits hela spelkedja hade även 68/68 lokalt.
- Inga JavaScript- eller konsolfel. Skärmbilder öppnade och granskade.
- Ingen fysisk iPad verifierad. Testerna använder placeringshjälp mellan avsnitt; ingen obruten spelomgång utan testhjälp har påståtts. Svar sparas bara under aktuell omgång, inte efter omladdning.
- Start 17:58; verifierad leverans cirka 18:32, ungefär 34 minuter. Tidig grov uppskattning var 1–2 timmar.
- Inga kvarstående blockerare. Nästa möjliga arbete: justeringar efter Agusts egen iPad-provspelning.

Skärmrotation i WebKit kontrollerad efter avslutad layout: canvas, CSS, shell och viewport matchade 1180×820 respektive 820×1180. Den första smala bilden var fångad mitt i storleksbytet, ingen kvarstående proportioneringsbugg.

Ny beställning 2026-10-09: Gör idrottssalens golvyta tio gånger större än nuvarande sal. Implementerar 160 × 100, samma höjd, med sammanhängande passage från befintlig dörr, utökade bygg-/monstergränser, flyttat mål, viloplatser och spridda gömställen. Tio bollträffar och 30 + 30 sekunder behålls. Version 20261009-gym10-2. Tester och publicering återstår.

Genomförande: Gemensam gym-layout styr verklig golvgeometri, zoner, väggar, bygggränser, Åttabens förflyttning och nya mål-/sökplatser. Salen ligger öster om skolan så andra klassrum och matsal/kök inte överlappas. Tio bollträffar, normal monsterfart och tre sekunders broms är oförändrade. Ett test behövde rättas för 3D-objekt utan geometri-parametrar; byggprovets sista överlappande kub ersattes med ett faktiskt hopp till målplattformen.

Åtgärdat ett verkligt testfynd: en 0,05 bred logisk springa mellan passagen och salens golv kunde stoppa återvägen beroende på steglängd. Zonerna möts nu utan glapp; väggarnas kollisioner behåller avgränsningen.

Verifierat före publicering: 36/36 riktade Chromium-kontroller, 72/72 kontroller av hela spelet i WebKit och 27/27 WebKit-kontroller av dörrar, omstart, iPad-format och portal. Skills Playwright-klient körd efter sista speländringen; skärmbilder granskade och inga konsol-/JavaScriptfel. Syntaxkontroller och git diff --check godkända. Fysiskt iPad-test är inte utfört.

Publicerad 2026-10-09: commit 0156d9d977b176e639e71f3aa09650935722230e, Pages-körning 37964181538 slutförd med success. Alla nio kontrollerade portal-/runtimefiler svarar HTTP 200 och har samma SHA-256 som den lokalt testade kopian. Efter publicering passerade 36/36 gymkontroller i Chromium och 27/27 WebKit-kontroller på den publika adressen, utan webbläsarfel. Live-skärmbild av hela salen granskad. Spela: https://sindeed.github.io/agustgames/where-is-exit-3/?v=20261009-gym10-2

Ny beställning: geografi som sjunde obligatoriska ämne. Tre uppgifter i ordning: hitta I och E med korrekt skolkarta och återvänd till G; Norge, Finland och Danmark på Sverigekarta; placera S, E och Å vid de tre originalmonstrens aktuella lägen. Ingen väderstrecksuppgift. Spaning fryser läget medan spelaren tittar och markerar. Samma uppdatering ska ge Åttaben vägval runt fasta/dynamiska hinder med återhämtning och bevarad skymd sikt.

Implementerat: geografirum (15, -40) med egen korridordörr; proportionerlig SVG-karta för alla sju rum, zoom för monsterplacering och portabel karta; faktisk rumsorientering och återkomst till G; ordningsoberoende grannländer; fryst spaning av de verkliga monsterlägena utan automatiska lösningsmarkörer. Åttaben använder nu A* med kontinuerlig kollisionskontroll och omplanering vid byggändring, flyttat mål eller stopp. Byggdelar får inte omsluta eller överlappa Åttaben. Tester återstår.

Testfynd åtgärdade: Åttabens första vägsmoothing kunde skära ett mycket litet hinderhörn; nu används exakt segment–rektangel-kontroll och full passage till hörnpunkterna. Små kvarvarande waypointavstånd får inte stoppa förflyttningen. 20/20 navigeringsfall passerar. En testassertion för spaning jämförde enbart z trots att spelaren gick längs x; korrigerad till verkligt gångavstånd. Geografi 32/32 WebKit, hela sjuflödet 96/96 WebKit och idrott 36/36 Chromium passerade. Utökar avbryt-/ny spaning och verklig hinderkontroll före slutlig publicering.

Slutlig lokal verifiering: geografi 34/34 WebKit, alla sju ämnen och hela flykten 96/96 WebKit, idrott 36/36 Chromium, rumsdörrar/pekformat/portal 28/28 WebKit, Åttaben i verkliga gömställen och dynamiskt bygge 8/8 Chromium samt 22/22 separata navigeringsfall. Inga webbläsarfel. Skills originalklient körd efter sista ändringen; bilder av kartor, iPad-porträtt, tangentbordsyta och spelvärld visuellt granskade. Ingen fysisk iPad testad. Återstår: publicering och livekontroll.
