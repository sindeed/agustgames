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
- Published game commit: 755aadbd3ff0f4ecb6368f4c791ece8c04e03c29 on main. GitHub Pages run 34486157023 completed successfully.
- First push correctly failed because the active GitHub account was antonekv. Published using the already signed-in owner sindeed for one operation, without changing the globally active account or printing/storing credentials.
- Live verification passed: all eight delivered HTML/CSS/JavaScript/vendor files have exactly the same SHA-256 as the tested local files. Live Agust Games card opens WaterWar; Start, 49 bots, initial hammer, Byt, boarding and six-row Bygg gallery verified in WebKit at iPad size with no browser errors.
- Live screenshots and report inspected: /tmp/waterwar-live/report.json, agust-games-menu.png, waterwar-live-ipad.png.
- READY: https://sindeed.github.io/agustgames/?v=20260910-waterwar and https://sindeed.github.io/agustgames/waterwar/?v=20260910-1. Tell the user to refresh the page on the iPad and choose WaterWar → Start.
- Remaining work: none required for this requested first release. Future changes should follow Agust's feedback. This final release note is local documentation; deployed game files match the verified commit.

## Requested tuning, 2026-09-10
- Agust asked to be only a tiny bit slower. Reduced player walking and swimming by 10%: 6 -> 5.4 and 4.8 -> 4.32 units/second. Other movement and timing unchanged.
- Updated versioned imports and menu link to 20260910-2 so the iPad refresh loads the change.
- All 28 rule scenarios pass. The existing blowhole-route test now allows the extra travel time required by the lower walking speed.
- Official browser client passed movement/boarding, with 20260910-2 in text state, no console errors, and screenshot inspected in /tmp/waterwar-slower-official.
- Published e4fe3783b1e12d7e5417979006e95212503ebc73. Pages run 34486951902 deployed successfully. Live verification confirms SHA-256 equality for eight delivered files, version 20260910-2, Start/Byt/movement/boarding/build gallery in WebKit at iPad size, with no errors. Live screenshot inspected. Ready to refresh and play.

## Guard movement, shark defense and sound, 2026-09-10
- Requests: guards should walk normally instead of vibrating; guards should also fight sharks; add low music and sounds for walking, swings, hits, harvesting and shark bites, including guards.
- Fixed leg poses resetting on every render between 10 Hz AI updates. Added deck-relative motion smoothing and a continuous stride with hip/knee/shoulder pivots and opposite arm movement. Drift and boat rides do not trigger walking; pause freezes the pose.
- Guards automatically target nearby sharks, including from boats and for bot crews. Corrected AI arrow aim height for sharks. Melee guards stay on deck/shore while defending. Existing peaceful-crew behavior remains covered.
- Added procedural Web Audio effects and an original quiet pentatonic background melody. Audio unlocks on Start/touch, spatial effects attenuate with distance, pause/mute fade audio out, and independent music choice persists. Pause dialog scrolls on small screens.
- 28/28 existing rule scenarios pass, plus motion tests at 30/60/120 fps, all four weapons for player/bot shark defense, boat and rescued-guard checks, and event queue/footstep/harvest/bite tests.
- WebKit iPad browser verifies continuous alternating legs/arms and pause, actual shark damage/defeat while staying aboard, gesture-started audio with nonzero RMS and quiet levels, all 12 effect types, mute/music toggles and refresh persistence. Landscape/portrait pause screenshots inspected. Local QA in /tmp/waterwar-guards-browser and /tmp/waterwar-audio-browser.
- Published c76cf660ba4972054f83626e911cb3580c5e9df1; GitHub Pages run 34488957854 succeeded. Version 20260910-3 verified live: ten files match tested SHA-256, menu opens the game, Start unlocks running audio, movement/boarding/Byt/build gallery pass with no errors. Live WebKit audio test confirms nonzero signal, all 12 effect types, pause/mute/music controls and saved preferences. Final live screenshot inspected. READY for iPad refresh.

## Walls along tile edges, 2026-09-10
- Agust corrected walls: ordinary and special walls belong on floor edges, including the shared edge between two adjacent tiles.
- Wall placement snaps the actual tapped point to the nearest supported edge, aligns along either axis, and prevents overlapping ordinary/special walls on the same edge. Costs and health unchanged. Bot walls use edges too.
- Thin preview matches the resulting wall position, height and orientation. Floor centres stay clear. Collision follows wall orientation and checks the movement segment so a large AI step cannot skip through a wall; actors overlapping a newly built wall can still leave.
- 28/28 existing scenarios pass; dedicated edge tests cover all four sides, shared edges, duplicates, upper floors, missing support, moving rafts and collisions. Existing guard/audio/motion tests pass. Separate check verifies bot walls on actual floor edges.
- WebKit iPad-size checks use real taps for north/east/south/west edges and the seam between two tiles, both wall types, exact costs and preview/model alignment. All five pass with no browser errors. Screenshots inspected in /tmp/waterwar-walls-browser. Official browser client start/movement screenshot also inspected.
- Published 9295df75b1372716eb92888799ad5c912e0fb0b5. Pages run 34490944815 succeeded. Live version 20260910-4: ten file hashes match, menu/Start/audio/49 bots/Byt/boarding/build gallery pass. All five real-tap wall cases (four edges plus shared seam) also pass on the live site; shared-edge screenshot inspected. READY to refresh on iPad.
- Agust confirmed while publishing: retain exactly 49 bots, with access to all player building types and their own independent construction rather than copying the player. Verified existing bot construction uses all six types; no copying of the player's layout occurs.

## Full healing after two seconds, 2026-09-10
- Agust requested player and bot captains to heal fully after two seconds; explicitly no healing for guards or raft parts. Interpreted and explained as two seconds without taking further damage, while still alive.
- Damage now schedules recovery only for player and bot captains. Further actual damage restarts the timer; ignored hits do not. At exactly two simulated seconds health becomes 100. Pause/shop do not advance time. Guards, raft parts, boats and sharks never use this recovery; normal death and 49-bot replacement remain intact.
- 28/28 prior rule scenarios pass, plus targeted exact-time/reset/pause/death/exclusion checks and wall/guard-defense regressions.
- WebKit iPad HUD check: at 1.99 seconds player=40, bot=35, guard=75, part=75; at 2.00 player=100, bot=100, guard=75, part=75. Pause/resume timing and 49 bots verified, no browser errors. Before/after HUD screenshots inspected in /tmp/waterwar-healing-browser; official browser start/movement screenshot inspected.
- Published b69bd8e374e4f2b44d37a40e8801c444065265b4, Pages run 34493536882 succeeded. Live 20260910-5 verified: ten file hashes match and menu/Start/audio/49 bots/movement/Byt/build gallery pass. Live healing browser test confirms the same exact 1.99s/2.00s health values and exclusions, plus pause/resume. No errors; final live HUD screenshot inspected. READY for iPad refresh.

## Many islands throughout the ocean, 2026-09-10
- Agust requested many more islands everywhere, rather than only seeing about three.
- Expanded the world from 47 to 686 islands with a jittered 600-unit grid across the full finite ocean and a richer starting archipelago: 13 islands within 500 units. Preserved the original first island and cave-mine locations; every island has palms, a chest and ore.
- Added spatial lookup for shore-height checks and a linear nearest-resource search for bots. Island/resource graphics outside the nearby area are disposed and recreated on return to keep travel memory bounded. Bots still start in water and remain 49 distant independent crews.
- Geography tests pass for full-world coverage (worst sampled distance to shore 632 units), nonoverlap/navigation gaps, indexed shore heights, resources, original landmarks and all 49 swimming starts. 28/28 existing game-rule scenarios plus healing, wall and guard-shark checks pass.
- WebKit at iPad size shows 7/4/5/5 islands in the north/east/south/west views. Draw calls 195-562; static cache falls to 12-15 models in distant regions and returns to 98, without accumulating geometry. The measured local test-frame average was 3.23ms (not a physical iPad measurement). No browser errors. Screenshots inspected in /tmp/waterwar-islands-browser and /tmp/waterwar-islands-official.
- Published 9a8670fcffcd098929f6d10c0d0e6451833f9143; Pages run 34494939753 succeeded. Live version 20260910-6 verified: ten file hashes match, menu/Start/audio/686 islands/49 bots/Byt/movement/build gallery pass. Live four-direction and long-distance cache checks also pass with no errors; live screenshot inspected. READY for iPad refresh.

## MP3 background music, 2026-09-10
- User authorized choosing a suitable MP3 from their VFOS archive and lending it to WaterWar. Found the existing V-Falun-reels-beds local music library through the source manifest; selected Open Horizon, take A, based on the catalog’s hopeful piano/synth instrumental description. No claim of a human listening review.
- Verified the original library file against its recorded SHA-256. Copied the audio stream without re-encoding, removed embedded cover art/unrelated tags, and left the source library and VFOS unchanged. Included source attribution in music/README.md.
- Replaced the procedural background melody with a quiet looping HTML media stream through the existing Web Audio music bus. First playback occurs within the Start gesture, avoiding full-song PCM buffering on iPad. Existing SFX, independent music/mute preferences, pause, shop, resume and refresh preserved. Added handling for pause after context suspension and quick loading/play cancellation.
- MP3 fully decodes: 149.73 seconds, stereo 48 kHz; source mean -14.6 dB and peak -1.2 dB before the quiet game mix. WebKit verifies actual nonzero music signal (RMS about 0.0047 near intro), end-to-start loop, pause position/resume, shop, all 12 SFX, independent toggles and refresh persistence. Landscape and portrait screenshots inspected.
- Final regression and live publication verification pending. Version 20260910-7.
- Final local checks pass: WebKit also covers suspended audio context, restart reuse of one music element and death/retry. All 12 SFX still play; audio-event rule test passes. Official client screenshot/text state inspected for version 20260910-7, 49 bots, 686 islands, movement and initial equipment, without console errors. Ready to publish.
- Published 08b7f301a5bd07f110eb04e833704287d5cc4ea4; Pages run 34497590040 succeeded. Live version 20260910-7: all eleven served assets including the MP3 match local SHA-256; August Games card opens WaterWar, Start unlocks the actual MP3, 49 bots/686 islands/Byt/boarding/build gallery pass. Live WebKit music tests confirm audible graph signal, 149.76-second media loop, pause/resume, shop, all twelve SFX, toggles/refresh, suspended context, restart and death/retry. No browser errors. Live gameplay screenshot inspected. READY for iPad page refresh; no required work remains.

## Dramatic music inside the whale, 2026-09-10
- User requested more exciting/dramatic music while inside the whale. The user’s standing permission allows borrowing copies from the music archive, with absolutely no edits, moves or deletions in the archive.
- Selected Circuit Tension A from its catalog description (tense minor-key synth arpeggios, deep bass, restrained dramatic build). This is a catalog-based choice, not a listening-review claim. Verified its recorded SHA-256 and copied all MP3 bytes unchanged into the game. Source archive untouched.
- Implementing automatic belly/sea music switching while keeping iPad gesture playback, looping, music/sound preferences and SFX. Version 20260910-8.
- Implemented one persistent Safari media player that switches MP3 source according to player zone. Stale play promises cannot stop or restart a newer track; playback fades in gently. Restart selects the sea track before unlocking audio.
- Final local WebKit test passes the real warning -> 14.1-second whale swallow -> dramatic playback -> blowhole trigger -> ocean music sequence with no extra tap. Also verifies a 164.256-second loop, actual nonzero music-bus signal, pause position, muted swallowing, SFX while music is off, rapid canceled loads, and restart without duplicate players. Screenshots inside whale and after escape inspected. Existing MP3/SFX regression and official client pass with no errors; version -8, 49 bots and 686 islands retained. Source archive file rechecked unchanged by SHA-256. Ready to publish.
- Published bd8f4cdb006393bdf2746cda2feb382415b3e36c; Pages run 34509138065 succeeded. Live 20260910-8: all twelve served assets, including both MP3s, match tested local SHA-256; menu/Start/49 bots/686 islands/Byt/boarding/build gallery pass. Live WebKit verifies actual warning -> swallow -> dramatic music -> blowhole -> ocean music, looping, nonzero music signal, mute/pause, rapid load changes and restart with no browser errors. Live whale screenshot inspected. READY for iPad page refresh. Source music archive remains untouched; no required work remains.

## Five-stone whale escape, 2026-09-13
- User: replace instant/fixed-ramp escape with five loose stones picked up via Slå, then five Slå presses to construct the stone staircase at the blowhole. Player, raft and accompanying guards leave together without transition damage. Preserve later swallowed fleets, player-vs-bot and bot-vs-bot wars inside. User requested a narrow quick change while work was underway.
- Fast-forwarded release checkout to 7261401 (only a newer Where Is Exit music release) before changes; prior local progress notes preserved.
- Removed the old ready-made ramp. Each swallowed crew gets a five-stone quest and a five-step route to the lowered blowhole entrance. Light stones, a marked build site, real step geometry/collision and HUD collection/build counts guide the player. Five individual presses are required; holding Slå does not auto-build the mission. A finished bot staircase cannot unlock the player’s quest.
- Fleet transfers preserve parts, HP, guard equipment and small-boat crew assignments. Distant deployed guards remain outside as before. Guards in the belly leave with their captain. Hostile bots may start battles against nearby captains/guards in the belly; peaceful bots gather/build/escape. Later mouth openings can admit additional crews even if only bots remain inside.
- Targeted tests pass for five stones/five strikes, blocked shortcuts/four-step escape, repeated visits, full fleet/guard/boat state preservation, late arrivals, player/bot and bot/bot damage, independent quests and completed bot escape. WebKit real Slå taps and walking pass with two guards, unchanged HP/parts, music transitions and no console errors. Collection, completed staircase and escaped screenshots inspected.
- Final regression and publication checks pending. Version 20260913-1.
- Final regression: 28/28 game-rule scenarios pass, plus stone quest, guard/shark defense, walls, healing and sound-event checks. Fixed a bot approach oscillation at the first step and retained the existing distant-guard exclusion. WebKit retest passes five real collection taps, five individual building taps, walking out onto the raft, preserved two guards/part HP and music change. Official client state/screenshot reviewed at version 20260913-1 with no errors. Ready to publish.
- Published 44c5761fa09cfb5586619245f1feb5acdaa459e2; Pages run 34750160815 succeeded. Live version 20260913-1: twelve served assets match tested SHA-256; Agust Games menu, Start, audio, 49 bots, 686 islands, Byt, boarding and six-row build gallery pass. Live WebKit verifies five real stone-collection taps, five individual building taps, walking through the blowhole onto the raft, preserved two guards and raft HP, and ocean music returning, with no browser errors. Live completed-staircase and escaped-with-fleet screenshots inspected. READY for iPad webpage refresh. No music archive changes.

## Rebuild a completely destroyed raft, 2026-09-13
- User requested rebuilding a new raft using remaining wood after all old raft parts are destroyed, with a time estimate and live iPad delivery.
- Empty rafts can start with a new first floor at the chosen nearby water position for one wood, even far from the old location or after leaving the whale. Preserve raft identity for existing crew/boat references; failed placement and previews never move it. Build mode initially selects floor when empty; preview uses the new position. Bot captains use the same recovery. Version 20260913-2.
- Local regression, touch browser checks and publication pending.
- Targeted rebuilding tests pass: damage destroys every piece, arbitrary nearby water position after leaving the old location, preview/failed placements preserve state, one-wood cost, subsequent expansion, no free replacement, land rejection, surviving raft cannot relocate, empty raft in old whale zone, and bot recovery with 49 bots retained. WebKit real touch checks verify auto-selected floor, insufficient wood, green preview aligned to final placement, and boarding. The first boarding test walked past a tile built immediately under the player; revised the test to build ahead and stop on boarding. Screenshots and official browser-client start/movement state reviewed; no errors.
- Final regression: 28/28 rules, wall-placement suite and five-stone whale escape pass. Published 0077bca154996156d6b2c744e80de3f14b3077d5; Pages run 34752708506 succeeded. Live version 20260913-2: twelve served files match local SHA-256; menu/Start/audio/49 bots/686 islands/Byt/boarding/build gallery pass. Live WebKit real taps verify rebuilding after complete destruction far from the old origin, exact wood cost and boarding, without browser errors. Live rebuilt-raft screenshot inspected. Temporary local server stopped. READY for iPad webpage refresh; no required work remains.

## Confirm matching wall placement, 2026-09-13
- Agust requested that ordinary and special walls use the same building method on tile edges and shared edges. Inspected current implementation: both already share edge snapping, preview alignment and collision rules. No gameplay edit or new release needed.
- Verified live version 20260913-2 in WebKit at iPad size with real gallery selection and canvas taps: both wall types on north/east/south/west and shared edges (10/10), matching final model/preview orientation and wood costs, with no browser errors. Ordinary/special shared-edge screenshots inspected in /tmp/waterwar-both-walls-live. Ready to play on the existing published version.

## Blender-style weapons, palms and treasure barrels, 2026-09-20

- Agust approved the Blender-style hammer, sword, spear, bow and firebow for WaterWar. Their in-game first-person and actor models now use matching low-poly silhouettes; weapon rules, costs, damage and controls are unchanged.
- Palms now use the straighter Blender-inspired trunk. Half of the existing island chests display as locked treasure barrels; they keep the exact same chest interaction: three hammer hits, 100 HP, five gold and normal respawn.
- Local syntax check and Playwright start/movement/swing smoke test passed. Screenshots are in /private/tmp/waterwar-blender-assets-final. Not published yet.

## Deep sea, pirate wreck and whale throat, 2026-09-20
- Added the Dive/Up control. A diving captain stays in the deep while its raft follows at the surface; sharks do not target that surface raft. Bots also take short dives.
- Added the large sunken pirate wreck north of the starting deep-sea area: deck plus captain cabin, treasure room with five ordinary chests, map room, cannon room, prison, stairs, cargo, powder room, forge, sleeping cabin, kitchen, infirmary, library, music room and secret room.
- Deep whale warnings use a faster underwater approach. A swallowed player or bot crew travels through a water-filled whale throat for exactly five seconds before arriving in the belly. Rafts, boats and guards follow. Blowhole escape returns a crew to the deep near the whale.
- Player skins protect only raft parts that existed when the skin was bought: those cannot burn or break. New player parts can. Bot skins are decorative only. Medieval floors show decorative shields; pirate floors show decorative cannons, neither usable.
- Added an unchanged copied `Circuit Warmth A` MP3 for diving, selected from the archive catalog's warm electronic description. The source library was not modified. Blender 5.2.2 preview is at `art/waterwar-blender-style-preview.blend`.
- Verified: deterministic depth test; full core rules; stone escape; healing; walls; guard/shark defense; island coverage; Chromium browser flow; deep browser flow; official client screenshot/state; and WebKit iPad-size smoke test. No browser errors in passing suites.
- Published commit `603cc24` with the Sindeed account. Live `sim.js?v=20260920-1` reports the correct version and the live deep browser flow passes: Dive/Up, raft following, deep whale approach, five-second throat and belly arrival. Ready for an iPad page refresh.
