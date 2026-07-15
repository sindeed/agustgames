Original prompt: in my game i want to have a man thats magic or that has magic powers then hes gonna ask us to find his lost diamond then we are going to go look in the mountain and in the trees it is going to be like zelda

Additional requests:
- The game has a big map with rivers, forest, and creepy monster-looking creatures.
- The creatures try to eat the player. Defeated creatures drop food.
- Horses roam the world and can be fed.
- Start with 3 lives; meat adds lives up to 8.
- Shadowkeep Castle contains Boswer, who must be defeated to take the diamond map.
- Weather changes; heavy rain can create a tornado.
- Aster gives a red magic apple; apples grant stronger power and feed horses.
- Rainbow fish grant super speed.
- Sword, bow, spear, and fishing rod are usable equipment.
- The player can swim, talk to villagers, and choose a girl or boy fantasy hero.
- The castle contains a magic-opened secret feast room.
- A live minimap and full M-key map show the player's current position.
- The adventure is viewed and controlled from first person.

## Work log

- 2026-07-15: Chosen first playable version: a continuous top-down Zelda-like world with Aster the wizard, a forest clue quest, river bridges, Moonstone Mountain, magic combat, food/healing, feedable horses, and the lost diamond.
- 2026-07-15: Created the responsive standalone game shell, title/pause/victory screens, desktop controls, touch controls, sound/fullscreen buttons, and mobile landscape handling.
- 2026-07-15: Built the continuous 3840×2400 world, quest state machine, castle/Boswer/map sequence, mountain crystals, diamond return, monsters, food, horses/riding, apples, rainbow fish, deterministic rain, tornado, swimming, villagers, character choice, live maps, weapons, and castle secret room.
- 2026-07-15: Added the game to the Agust Games arcade, fixed spawn/collision/life/map issues found in review, and made horses and monsters navigate across rivers by using bridge approach and exit paths.
- 2026-07-15: Completed 21 end-to-end browser checks covering the full quest and every requested mechanic. Also checked desktop and mobile layouts, the official game client, screenshots, replay reset, and browser errors.
- 2026-07-15: Rebuilt exploration as a first-person view with perspective terrain, walls, depth-clipped characters and items, mouse/keyboard/touch look controls, visible hands and weapons, riding ears/reins, a swimming waterline, and camera-relative objectives.
- 2026-07-15: Tuned close-up character, monster, crystal, pickup, and particle scaling after screenshot review; the first official first-person Playwright smoke test opened Aster's dialogue with matching text state and no browser errors.
- 2026-07-15: Passed 40 first-person browser regression checks plus an isolated pointer-lock branch check: movement/look/strafe, pause and focused controls, mouse attacks and magic, Aster dialogue, combat, horses, swimming, tornado, castle secret room, maps, desktop/mobile layouts, and the complete quest through the victory screen. All reviewed screenshots were clear and no browser errors were reported.

## TODO

- First-person version complete and ready to publish.
- Future polish ideas: more quests, more monster types, music, and save slots.
