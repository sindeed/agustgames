# Where’s Exit Multi

Agusts förstapersonsspel med fem återkommande banor och datorstyrda medspelare. Välj 3 personer (du + 2 botar, 4 liv var), 4 personer (du + 3 botar, 3 liv var) eller 5 personer (du + 4 botar, 2 liv var). Alla har egna liv. Vid noll liv blir du åskådare; sist kvar vinner.

## De fem banorna

1. **Välj platta:** gå till 1 eller 2 inom åtta sekunder. En är rätt. Fel val eller uteblivet val kostar ett liv.
2. **Kurragömma:** en deltagare väljs till letare. 20 sekunder att gömma sig, 15 sekunder att leta. Gå nära ett gömställe och tryck GÖM DIG / E. Letaren använder SÖK / E. Den som hittas tappar ett liv, högst en gång per sökomgång. Skåp, två bord, träd, hus, stor låda, buske, soffa, trappa och koja med två öppningar finns på den stora ytan.
3. **Monster:** håll dig undan den automatiska jagaren i tio sekunder. Fångst kostar ett liv med ett kort skydd efteråt.
4. **Akta pilarna:** överlev i tio sekunder. Färgmarkeringar visar var väggen skjuter och vilka luckor som är säkra. Träff kostar ett liv.
5. **Where is Exit:** en ny labyrint varje varv. Först till EXIT behåller liven; övriga tappar ett. Monstret skickar fångade till start utan livförlust. Efter fångst återgår också monstret till starten och väntar kort, så ingen kan spärras ute från hela labyrinten.

Efter femte banan börjar ordningen om med kvarvarande liv. Om de sista deltagarna förlorar sitt sista liv i exakt samma ögonblick får de ett liv igen och spelar vidare för att få fram en vinnare.

## Practice

Knappen **PRACTICE · Se alla banor** startar en trygg utforskning utan klocka eller livförlust. Välj föregående/nästa bana själv. Det går att gå runt, hoppa och prova gömställen. Botar och monster står stilla.

## Kontroller

- Dator: WASD/pilar för rörelse, dra på spelbilden för att titta, E för gömställen, mellanslag för hopp. Esc pausar och F växlar helskärm där webbläsaren stöder det.
- Pekskärm: styrspak till vänster, dra på bilden för att titta, HOPPA och ANVÄND/GÖM DIG/SÖK till höger.
- Åskådare: Följ nästa byter vilken kvarvarande deltagare kameran följer.
- Pausmenyn kan återvända till korridoren.

Spelfilerna är fristående HTML/CSS/JS med lokalt kopierad Three.js. Ingen server för multiplayer behövs: de andra deltagarna är botar, enligt Agusts beskrivning. Ingen musik ingår.

## Verifiering

`render_game_to_text()` ger spelstatus och `advanceTime(ms)` möjliggör styrda tester. QA-hjälpare finns på localhost eller med `?qa=1`. Automatiska tester täcker regler, styrning, banövergångar, navigerbara labyrinter, hela matcher, practice och mobilskärmar. WebKit och Chromium testas med emulerad pekskärm; detta är inte ett test på en fysisk iPad.
