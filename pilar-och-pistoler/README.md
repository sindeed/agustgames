# Pilar och pistoler

Agusts fantasifulla förstapersonsspel. Solo med förmatch i centrum, 11 bottar och en stor värld; Team 6 mot 6 på tre arenor. Inga externa runtime-anrop: Three.js och licensen medföljer.

Spela: https://sindeed.github.io/agustgames/pilar-och-pistoler/?v=20261011-1

Regler: [RULES.md](RULES.md). Version: `20261011-1`.

## Filer
- `sim.js`: gemensamma vapen, projektiler, fysik och botlogik.
- `world.js`: gemensam kollisions- och världskarta.
- `game.js`: Three.js, HUD och kontroller.
- `acceptance.mjs`: 95 regel- och fysiktester.
- `match-check.mjs`: längre matcher och botnavigation.
- `browser-check.mjs`: Chromium/WebKit, UI och iPad-format.
- `touch-check.mjs`: verkliga emulerade flerfingerhändelser via Chromium.

## Lokalt
Kör en HTTP-server för mappen, exempelvis `python3 -m http.server 8163 --bind 127.0.0.1`. Öppna `http://127.0.0.1:8163/`. Ingen byggprocess behövs. Testläge `?qa=1` exponerar simuleringen för kontrollerna; normalspel använder samma kod. `render_game_to_text` och `advanceTime` finns för reproducerbara tester.

Fysisk iPad är inte testad av agenten; browseremulering och WebKit är separata kontroller.
