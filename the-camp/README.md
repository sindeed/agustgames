# The Camp

Ett tyst, barnvänligt skogsspel av Agust. Öppna `index.html` genom en statisk webbserver. Ingen installation, inloggning, ljudkälla, extern CDN eller backend behövs.

- Starta spelet: styr människan. Välj monster: styr spöket eller långa monstret. De två andra är bottar.
- Dra spaken eller använd WASD/pilar. E/mellanslag använder den närmaste möjligheten. R retas. M öppnar kartan, P/Esc pausar och F växlar fullskärm.
- Tälj vid ett bord och hugg på vedgräsmattan eller ett fällt träd. En flisa och en vedklabb behövs för att tända elden. Ytterligare ved håller den brinnande.
- Dag är 180 sekunder, natt 120. Människan kan alltid gömma sig bakom stugan. Monstren kan komma fram till elden, men rör sig långsammare nära den.
- WebKit på dator med touch/iPad-format är testat. Fysisk iPad/Safari är inte verifierad. På iPad används webbläsarens fullskärms-API om det finns, annars fyller spelet den tillgängliga webbytan.

## Filer och tester

`model.mjs` innehåller regler, tid och bottar. `game.js` ritar och hanterar inmatning. `window.render_game_to_text()` beskriver läget och `window.advanceTime(ms)` stegar samma modell deterministiskt. Extra testfixtures finns endast med `?test=1`.

- `node the-camp/acceptance.mjs` kör regelkontroller.
- `node the-camp/browser-tests.mjs` kör Chromium/WebKit med installerad Playwright från develop-web-game-skillen. `CAMP_URL` väljer lokal/publik portal och `CAMP_OUT` resultatmapp.
- Skillens `web_game_playwright_client.js` används också för inputburst, bild och JSON-state.

Testernas långa tidshopp/specialscener använder tydliga fixtures. Den normala browserkedjan grusplan → bord → ved → eld använder verklig tangentbords- och knappinmatning utan att ge resurser via fixtures.
