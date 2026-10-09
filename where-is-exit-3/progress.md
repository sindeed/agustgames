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
