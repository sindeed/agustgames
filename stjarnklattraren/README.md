# Stjärnklättraren

Agust's first-person shuriken adventure. Three.js, static HTML, no build step.

- Enter the cave, use its wall map, explore the three-floor High Tower.
- iPad: left joystick moves; drag world to aim; hold KASTA to throw. Nearby objects show an interaction button.
- Desktop: WASD, drag to aim (or arrow keys to turn/walk), Space throws, E interacts, Shift jumps, F fullscreen, Escape pause.
- Sleep only in the home cave: two seconds to morning. Day and night last one minute each.
- Guards need three front hits or one rear hit. Boss has 100 HP. Player has 50 HP, heals after three quiet seconds, loses 10 per sword hit and 20 per arrow trap.
- Keys lock return doors and activate portals. Defeat portal guards to return, then clear the stair guards.
- Boss reward unlocks held-button wall climbing and a decorative cave prize.
- Local progress saves once per second and at menus. Death clears progress and cave construction. A new visit resets the tower guards.

## Checks

`node stjarnklattraren/tests/sim.mjs` from the repository root.

Browser scripts import Playwright from `PLAYWRIGHT_MODULE`, falling back to the local Codex game-testing installation. Set `GAME_URL` to test a published copy and `QA_OUTPUT` to redirect screenshots. The optional `?qa=1` URL exposes simulation state only for tests; standard gameplay has no debug controls.

See progress.md for the dictated rules and implementation interpretations. Additional destinations and building recipes await Agust's design.
