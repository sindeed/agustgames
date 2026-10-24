Original prompt: Build Agust's new first-person game in Water War's visual style, choose a good name, measure elapsed time, test and publish to the existing arcade for iPad.

Started 2026-09-23 20:11 Europe/Stockholm. Working title: Stjärnklättraren.

## Agust's rules
- Infinite shuriken, no other player weapons; central crosshair and throw button. First person.
- Square grass home, mountain on one edge, inaccessible summit, shallow cave containing open fire. Sleep only inside own cave, 2 seconds to morning. Day/night each 60 seconds, no gameplay difference.
- Map nailed to mountain on right when looking out of cave. Travel buttons for available places. Only The High Tower defined so far.
- Tower exterior: rain, bounded small area, locked entrance; hidden key on right.
- Floor 1: cloakroom, choice room. Left door then right: guard and locked upstairs. Right door: hub with guard branch left and corridor straight then left to small maze. Maze route right, short corridor, right, short corridor, right, key. Return door locks when key collected. Defeat branch guard, portal back to choice room, defeat stair guard, unlock stairs.
- Floor 2: start room, right route with THREE 20-damage arrow traps (cannot hurt guards). At far room left is guard/key. Key locks return door, unlocks paired portals; defeat two portal guards and return to start. Straight from start: THREE stair guards, stairs to floor 3.
- Player 50 HP, all normal guards 30 HP; front takes three shuriken, back one. Guard weapons do 10 damage from any direction. Full heal after 3 seconds without further damage; guards never heal. Re-entering a place resets guards.
- Death resets entire game including cave building. No reset merely for leaving/reloading.
- Floor 3 big arena, two-sword boss with 100 HP. Table behind boss starting position holds wall-climbing ability: hold attack near ANY wall to climb with shuriken, release to let go. Infinite supply.
- Rewards can be built at cave. Other locations/build options not yet specified.

## Implementation interpretations to review with Agust
- Floor 2 two-guard portal corridor branches from far trap room, distinct from three-guard stair corridor.
- Boss takes 10 per shuriken, does 10 per sword attack. Back instant-defeat applies to normal guards.
- First buildable prize is a decorative star trophy, since detailed building recipes are deferred.
- Mountain summit remains blocked even with climbing; climb cave walls up to their ceiling.
- No music requested; no added music.

## Validation
- 67 simulation checks pass: timers, damage, front/back hits, boss health, traps, sleep, death reset, saved progress, all route connections, locks, portal conditions, stairs, climbing, guard chase around corners.
- 42 browser checks pass across Chromium and Safari/WebKit with iPad dimensions: controls, map travel, key and entrance, reward, building, reload, climbing, restart, portrait layouts; no console errors.
- 5 actual simultaneous touch checks pass: move, aim and shoot with three fingers, release stops movement/shooting.
- Required standard Playwright game client run after meaningful batches. Screenshots inspected for cave/map/fire, rainy exterior, cloakroom, choice room, traps, boss with two visible swords, build reward, landscape and portrait.
- Fixed door collision sampling, exposed map drawing outside rock, reoriented sword visuals, resize handling, repeated trap damage while standing, and chase navigation around corners.
- Static geometry batched with InstancedMesh for tablets.
- Browser tests use staged scene positions for visual coverage; simulation tests verify route connectivity. Physical iPad testing is still the user's final device check.
- Publication and live readback pending.
