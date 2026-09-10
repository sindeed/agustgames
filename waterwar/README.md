# WaterWar

Agusts förstapersonsspel på ett mycket stort hav, i samma 3D-stil som War of Kingdoms.

- Spelaren och botkaptener får fullt liv efter två sekunder utan ny skada. Vakter och byggdelar läker inte.
- Utforska 686 öar utspridda över hela havet, med fler öar nära starten.
- Starta i vattnet med hammare och svärd, en liten flotte, en soffa och två bord.
- Gå med spaken och dra på skärmen för att titta. **Byt** väljer nästa ägda vapen.
- **Slå** använder redskapet eller vapnet. Vid ratten används samma knapp för att börja/sluta styra.
- **Bygg** öppnar bygggallerian. Välj en del och tryck på en plats att bygga den.
- **Shop** säljer vapen och vakter. Skins låses upp vid 25 plattor.
- Nära en egen vakt visas **ta vakten till båten** när både en egen båt och en annan flotte finns i närheten.
- Vakter försvarar också mot hajar. Steg, slag, hugg och bett har ljud, och låg musik spelas i bakgrunden. Ljud och musik kan stängas av i pausmenyn.
- Valen kan komma både dag och natt. I magen är uppdraget att fly genom blåshålet.

På dator: WASD/piltangenter, dra med musen, mellanslag för Slå, E/Tab för Byt, B för Bygg, P för Shop, Escape för paus.

## Utveckling

Ren HTML/CSS/JavaScript. `sim.js` innehåller spelregler, `view.js` 3D-scenen och `game.js` gränssnitt/styrning. Spelet återanvänder repoets MIT-licensierade Three.js från `war-of-kingdoms/vendor/`.

Ljudeffekterna skapas i `audio.js` med Web Audio. Bakgrundsmusiken **Open Horizon** spelas på havet och **Circuit Tension** inne i valen. MP3-filerna strömmas, upprepas och pausas med spelet. Musiken börjar efter tryck på Start och byter automatiskt tillbaka när man flyr genom blåshålet. Musik och ljudeffekter kan stängas av i pausmenyn. `actor-motion.js` mjukar upp AI-rörelser och driver gånganimationen.

Kör en lokal webbserver i repoets rot. Regeltest: `node waterwar/tests/rules.mjs`.
Webbläsartesterna använder Playwright. Installera paketet lokalt eller ange sökvägen till dess ES-modul med `PLAYWRIGHT_MODULE`. `WATERWAR_URL` och `WATERWAR_OUTPUT` kan ändra adress och resultatmapp för testerna.

Testkrokar: `render_game_to_text()` ger en JSON-snapshot och `advanceTime(ms)` stegar simuleringen deterministiskt. De ändrar inga externa data.
