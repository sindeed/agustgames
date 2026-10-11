Original prompt: Bygg, testa och publicera Pilar och pistoler i Agust Games. Lekfullt förstapersonsspel för iPad/desktop. Solo med centrumförmatch, 11 bottar, stor utforskbar värld. Team 6 mot 6 på stad/skepp/slott. Tolv exakt specificerade vapen, botparitet, tre vapenplatser, inga musikbeställningar. Full regelbok finns i RULES.md.

2026-10-11: Inspekterat AGENTS.md, develop-web-game och etablerad GitHub Pages-publicering. Separat ren releasekopia från origin/main 98df21c bevarar alla andra lokala ändringar. Lokal huvudkopia lämnas intakt utom en ny spelmapp och separat portalkort vid färdig leverans.

2026-10-11: Implementerat samtliga 12 vapen via gemensam simulering; fyra världar, interiörer, trappor, portar, inventarium, match/lobby/resultat, touch och desktop. 95/95 simulationstester, 15/15 match/navigationskontroller, 27/27 browserkontroller i Chromium och 27/27 i WebKit samt 6/6 samtidiga touchkontroller passerar. Inspekterat skärmbilder av meny, centrum, lila duell, skepp, torn, hotell och iPad-porträtt. Rättat botarnas höjdspecifika vägval och övergångar mellan trappor och plattformar. WebKit och touch är emulerade; ingen fysisk iPad testad.

Publicering: bara den nya spelmappen och ett nytt portalkort ingår. GitHub Pages källa verifierad som sindeed/agustgames main /, legacy Pages. Liveverifiering återstår innan färdigbesked.
