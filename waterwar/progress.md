Original prompt: Agust dictated WaterWar, asked to build and publish it in Agust Games for iPad, then removed the intro button before authorizing the build. Preserve the joined name WaterWar. Subsequent steering: use the same 3D graphics style as War of Kingdoms; add day/night with no day counter and whale visits possible at either time.

## Accepted rules
- First person, touch joystick for walking and steering, drag to look. Main menu only Start. In play: Slå, Shop, Bygg, plus weapon selection. No shields.
- Enormous finite ocean, islands, palms, cave mine, gold chests. Start swimming next to one tiny raft tile, a sofa (2 wood) and two tables (1 wood each). Hammer and sword initially owned. Palms regrow 30 seconds after chopping.
- Build gallery: tile 1 wood, wall 2, stairs 3, strong wall 5, boat 5, wheel 1. Raft requires a tile for its wheel. Without a wheel it drifts slowly in changing directions; with a wheel it only moves when steered.
- Weapons: sword free, spear 3 gold (long reach), bow 5 (infinite arrows), firebow 7. Guards with sword 3, spear 5, bow 7, firebow 10. Latest dictated currency is guldklimpar; gold is represented as bars in-world.
- Exactly 49 bots plus player, spread far apart. Bots start swimming by small rafts with hammer, sword and furniture; gather, build and buy using the same rules. Dead bots are replaced. Bots can use all raft items and guards.
- Player, bots, guards, sharks and ordinary pieces have 100 HP. Strong wall has 200. Whale is immortal. Fire can spread over a raft; a burning part breaks after 5 seconds.
- Sharks appear sometimes, attack after prolonged swimming and bite raft pieces. Guards fight and use small boats to raid.
- Giant whale deep underwater: prior warning “Valen kommer!”. It can swallow multiple rafts, boats, captains and guards; spacious walkable belly, fights inside, guards follow. Escape mission ONLY through blowhole. Rescuing enemy guards is possible. Mouth opening admits light and further arrivals; closing darkens it again. Cave and belly similarly dim but readable.
- Pirate and medieval skins unlock only for a very large raft (implementation threshold: 25 floor pieces).
- Day/night cycle, no day number; sea visible at night, cave/belly visible and dimmer; whale visits at either time.

## Implementation choices where unspecified
- World 16,000 × 16,000 units; deterministic bot separation and island generation.
- 6-minute full day/night cycle, no day counter. Whale first visit about 3 minutes, subsequent intervals vary independently of daylight.
- Damage, movement speed, island distances, shark delay and skin threshold are tuning choices, not new user rules.

## Status
- Working in isolated clean clone waterwar-release on codex/waterwar from live main d22e7a8. Existing dirty checkout untouched.
- Verified publication target: https://sindeed.github.io/agustgames/, Pages from main root.
- Reviewed War of Kingdoms materials, humanoids, lighting and first-person screenshot. Reuse its vendored Three.js and matching procedural mesh style.
- Build and QA in progress.

## Additional live steering during build
- Added Byt as a fourth main action. Cycle owned weapons in order hammer, sword, spear, bow, firebow; always start with hammer. Replaces weapon hotbar.
- Encounters are optional for player; some bots attack, some continue peacefully. Own guards defend but do not launch raids automatically.
- Contextual exact button “ta vakten till båten”: visible ONLY near an own guard, when an own boat and another nearby raft exist. The selected guard walks to the boat then raids the closest enemy raft. No general attack/encounter button.

## Completed implementation and QA, 2026-09-10
- Implemented the complete dictated first version: first-person ocean, 49 resource-gathering/building bots, respawns, resource economy, six building types, wheel steering, weapon cycle, guards and explicit nearby-raft boat orders, sharks, fire, skins, day/night, cave, swallowing and blowhole escape.
- Large world and distant AI run in 0.1-second AI steps; player and projectiles run at frame rate. Matching War of Kingdoms material palette, humanoid style, shadows and first-person equipment; shared vendored Three.js.
- Corrected boarding from swimming height, forgiving hammer targeting on table legs, stepping out of a wall built at player feet, stair visual/physics height, pending boat orders on swallowing, and first-tile rebuilding after complete raft destruction.
- Corrected whale approach to keep camera outside its body before swallowing. Fire is visible above walls as well as floor tiles.
- 28/28 deterministic rule scenarios pass, including five simulated minutes of all 49 bots, resource respawns, death/respawn, fire timing, upper-floor traversal, rescue, and guard boat orders.
- 13/13 Chromium browser flow checks pass; actual touch input covers joystick, Byt, gathering four starting wood, building by tapping water, shop, contextual dispatch, night/cave/belly visibility, escape, portrait controls, pause and restart. No browser errors.
- WebKit iPad-size smoke checks pass: start, touch buttons, movement/boarding, Bygg/Shop and no browser errors. Physical iPad still requires the user to refresh and play.
- Separate WebKit fleet checks cover all 25 tiles, both skins, wheel interaction and movement, a fired projectile igniting an enemy raft, spread, and full destruction. Screenshots inspected.
- Official develop-web-game client run multiple times for start/movement/building; screenshots and text state inspected.
- Screenshots/reports are local QA artifacts in /tmp/waterwar-browser, /tmp/waterwar-webkit, /tmp/waterwar-fleet and /tmp/waterwar-final-official. No QA artifacts added to game files.
- Agust Games menu includes WaterWar first; all pre-existing game links preserved.
- Publication and live verification are the remaining release steps.
