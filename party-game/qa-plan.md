# Party Game — acceptanstestplan

Ingen testning har körts ännu. Planen är gjord för korta, deterministiska Playwright-burstar med paus och observation efter varje handling. Efter varje scenario ska en skärmbild öppnas och granskas, `window.render_game_to_text()` jämföras med synligt läge och nya konsolfel kontrolleras.

## Avtalad testyta

- Spelyta: `canvas#game` (exakt en canvas).
- Vyer: `#menu-screen`, `#map-screen`, `#pause-screen`, `#round-screen`.
- Rundtext: `#round-title`, `#round-message`.
- Knappar: `#resume-btn`, `#restart-btn`, `#pause-btn`, `#sound-btn`, `#fullscreen-btn`.
- Lägesval: `[data-mode="peace"]`, `[data-mode="free"]`.
- Kartval: `[data-map="city"]`, `[data-map="grass"]`, `[data-map="hill"]`, `[data-map="platform"]`, `[data-map="castle"]`, alltid med rätt `data-for="peace|free"`.
- Touchrörelse: analog styrspak `#move-stick-base` med knopp `#move-stick-knob`.
- Touchhandlingar: `#attack-btn`, `#use-btn`, `#cycle-btn`.
- Hookar: `window.render_game_to_text()`, `window.advanceTime(ms)` och `window.__partyGameDebug` med minst `.start(mode,map)`, `.knockOut(targetIndex,sourceIndex)`, `.hitSword(targetIndex,sourceIndex)`, `.fireWeapon(playerIndex)`, `.enterNearestCar()`, `.damageCar()`, `.getState()`.

## Acceptansmatris

| ID | Område och startläge | Test | Godkänt när |
|---|---|---|---|
| M01 | Ny laddning | Läs DOM och första skärmbilden. | `#menu-screen` syns, övriga overlays är dolda, `canvas#game` finns, rubriken är tydligt **PARTY GAME**, och knapparna heter **Fred** och **Fri**. |
| M02 | Meny | Klicka Fred respektive Fri och gå tillbaka mellan försöken. | Fred visar endast Storstad + Gräs med `data-for="peace"`; Fri visar endast Storstad + Backen + Plattan + Borgen med `data-for="free"`. Ingen felaktig karta går att välja via synlig UI. |
| M03 | Meny/ljud | Efter första användargesten: lyssna/kontrollera ljudläge, toggla `#sound-btn` två gånger. | Glad partymusik startar utan autoplay-fel efter gest; knappen stänger av och återställer ljud samt visar korrekt tillstånd. |
| W01 | Alla sex mode/karta-kombinationer | Starta `peace/city`, `peace/grass`, `free/city`, `free/hill`, `free/platform`, `free/castle` och läs state/text. | Varje karta har exakt **10 figurer: 1 människospelare + 9 bottar** vid start; mode, karta och antal matchar på skärm, i debug-state och i text-hooken. |
| P01 | Fred / Storstad | Gå, gå in i närmaste bil, kör, lämna med Use, gå in igen och kör mot hus. | Stad/hus/bilar syns; spelaren kan gå in, styra och frivilligt lämna bilen. Huskrock skadar bilen; när bilen går sönder markeras den trasig och föraren hamnar utanför. |
| P02 | Fred / Storstad | Försök använda Attack, kör på bottar, förstör en bil och observera minst 20 s deterministisk speltid. | Inga vapen/projektiler orsakar skada, ingen figur tappar hälsa/blir utslagen/eliminering sker, även vid påkörning eller bilkrasch. |
| P03 | Fred / Storstad | Observera de nio bottarna över tid. | Bottarna promenerar, några kan välja/köra/krascha bilar, men de jagar eller attackerar aldrig någon och kan inte slå ut varandra. |
| P04 | Fred / Gräs | Gå runt och inspektera hela närmiljön. | Världen består av ett mycket stort gräsområde utan stad, bilar eller stridsutrustning; alla 10 figurer finns och bottarna vandrar fredligt. |
| P05 | Fred / Gräs | Gå till staketet, klättra/hoppa över och fortsätt mot yttergränsen. | Staketet är synligt och passerbart via avsedd klättring; området fortsätter långt på andra sidan men har en stabil yttergräns så spelaren inte kan gå oändligt eller lämna spelbar geometri. |
| F01 | Varje Fri-karta | Läs startinventering och avfyra från spelaren; observera bottarna. | Alla 10 figurer börjar med varsin kanon. Bottarna spelar alla-mot-alla, angriper både spelaren och varandra och använder kartans utrustning/fordon. |
| F02 | Varje Fri-karta | Skjut kanonen upprepade gånger med tidssteg mellan skotten. | Stora svarta kanonkulor syns, kolliderar korrekt och kan slå ut; inget ammunitionsvärde minskar eller hindrar fortsatt skjutning efter många skott. |
| C01 | Fri / Storstad | Gå in/ut ur bil, kör på en figur och kör in i ett hus. | Use ger frivillig exit; påkörning kan skada/slå ut i Fri; huskrock skadar bilen; trasig bil stannar och kastar ut eventuell förare. Detta skiljer sig tydligt från Fred där figurer aldrig skadas. |
| C02 | Fri / Storstad | Observera bot-AI över tid. | Bottar går in i bilar, kör och försöker köra på både spelaren och andra bottar; botkollisioner kan ge stridsresultat och spelet fortsätter utan låsning. |
| H01 | Fri / Backen | Slå ut en figur på sluttningen. | Figuren går in i slapp ragdoll, påverkas av lutning/gravitation och rullar tydligt nedför i stället för att ligga fast eller glida stelt. |
| T01 | Fri / Plattan | Flytta/knuffa en figur över kanten och stega tiden. | Figuren faller visuellt, markeras eliminerad när den passerar fallgränsen och återkommer inte under samma runda. |
| T02 | Fri / Plattan | Eliminera tills en figur återstår. | `#round-screen` visas med korrekt vinnare/resultat i `#round-title` och `#round-message`; Restart skapar ny runda med exakt 10 aktiva figurer. |
| K01 | Fri / Borgen | Inspektera karta och navigera runt vallgraven. | Stor borg, vallgrav, stängd vindbrygga och en verkligt passerbar hemlig väg in finns; vägen är dold nog att upptäckas men inte blockerad av osynlig kollision. |
| K01b | Fri / Borgen, start | Läs alla tio startpositioner och stega först 0,99 s och sedan förbi 1,00 s. | Alla börjar på gräsfastlandet utanför vallgraven. Bottarna får sikta/röra sig men skapar ingen projektil före en sekund; därefter får de skjuta på valda mål. |
| K02 | Fri / Borgen | Börja/ta sig in, gå till knappen och aktivera Use. | Knappen reagerar en gång, vindbryggan öppnas synligt, dess kollision ändras och bron går att passera från båda håll. |
| K03 | Fri / Borgen | Växla utrustning med Cycle och observera spelare/bottar. | Kanon, svärd, pilbåge och sköld går att identifiera och använda; bottarna använder utrustning mot varandra och inte bara mot människan. |
| V01 | Fri / Borgen, svärd | Ge samma oskyddade mål tre separata svärdsträffar. | Efter träff 1 och 2 är målet inte utslaget; exakt träff 3 ger utslagning/ragdoll. |
| V02 | Fri / Borgen, pilbåge | Skjut ett oskyddat mål en gång och skjut många fler pilar efter reset. | En enda träff slår ut målet och pilförrådet tar aldrig slut. |
| V03 | Fri / Borgen, sköld | Låt ett sköldande mål träffas av svärd, sedan pil; sänk skölden och upprepa. | Skölden stoppar båda attackerna utan hit-räkning/utslagning. Samma attacker fungerar när skölden inte skyddar. Blockerat svärdsslag räknas inte mot de tre träffarna. |
| A01 | Valfri karta | Håll en riktning, släpp, byt riktning och inspektera flera bildrutor. | Figuren har mjuk, tydligt vaggande gummigång med lösa lemmar; animationen följer rörelseriktning och fryser inte. |
| A02 | Fri, valfri karta | Kör `knockOut(1,0)` och stega korta intervall. | Hela kroppen blir slapp och faller ihop fysiskt; ingen stel dödsbild används. Vanlig KO och permanent Plattan-eliminering är olika state. |
| A03 | Alla karttyper | Förflytta spelaren till flera kanter/höjder. | Kameran håller samma sneda, lätt upphöjda party-brawler-vy, följer begripligt och visar relevanta hot utan skak, klippning eller tom yta. |
| I01 | Desktop | Spela med tangentbordets visade kontroller: fyra riktningar, attack, use och cycle. | Alla handlingar fungerar, keyup stoppar rörelse, fokus fastnar inte på knappar och sidan scrollar inte under spel. |
| I02 | iPad-viewport | Dra `#move-stick-base` i alla riktningar och använd samtidigt `#attack-btn`, `#use-btn`, `#cycle-btn` med ett andra finger. Släpp och avbryt även draget. | Analog riktning och fart fungerar, spaken återgår till mitten utan fastnad rörelse, samtidiga handlingar fungerar och inga kontroller ligger utanför skärmen eller ovanpå viktiga menyval. |
| I03 | Pågående spel | Öppna `#pause-screen` med `#pause-btn` och paus-tangent; stega tid; välj Resume. | Under paus ändras ingen fysik, AI, projektil eller timer; rätt overlay syns; `#resume-btn` återupptar exakt samma state. |
| I04 | Pågående spel | Klicka `#restart-btn`. | Samma mode/karta startar rent med 10 figurer, noll gammal projektil-/KO-/bilstate och stängd/initial kartmekanik. |
| I05 | Desktop och iPad-viewport | Toggla `#fullscreen-btn` och tangenten `f`; lämna med Esc; rotera/ändra viewport. | Fullscreen går in/ur där API stöds; canvas skalas utan stretching/klippning, inputmappning förblir korrekt och nekad fullscreen ger inget kraschat state. |
| D01 | Varje scenario | Jämför `JSON.parse(render_game_to_text())` med `__partyGameDebug.getState()` och bilden. | Texten är giltig, kort JSON med koordinatsystem, mode/karta, paus/runda, 10 figurers relevanta position/status/roll, fordon, vapen/projektiler och kartmekanik. Synligt och textuellt state motsäger aldrig varandra. |
| D02 | Deterministisk körning | Kör samma start + input + `advanceTime(ms)` två gånger efter reset. | Nyckelstate och utfall blir samma; hooken stegar utan dubbla realtidsuppdateringar eller flakighet. |
| E01 | Alla ovanstående | Samla `console`, `pageerror`, misslyckade requests och unhandled rejections. | Inga nya errors/rejections, inga 404 för lokala resurser och inga NaN/Infinity-värden i render- eller debug-state. |

## Föreslagna deterministiska debugsekvenser

Kör varje sekvens från en ny sidladdning eller en ny `start(...)`. Exakt intern state-form får variera, men `getState()` måste exponera de semantiska värden som acceptanstesten behöver och `render_game_to_text()` ska rapportera samma utfall.

```js
// 1. Alla kartor: exakt 1 människa + 9 bottar.
const d = window.__partyGameDebug;
const worlds = [
  ['peace', 'city'], ['peace', 'grass'],
  ['free', 'city'], ['free', 'hill'],
  ['free', 'platform'], ['free', 'castle'],
];
const counts = worlds.map(([mode, map]) => {
  d.start(mode, map);
  window.advanceTime(100);
  return { mode, map, state: d.getState(), text: JSON.parse(window.render_game_to_text()) };
});
// Assert per entry: 10 total, exactly one human and nine bots; mode/map agree.
```

```js
// 2. Svärdets exakta treträffsgräns.
const d = window.__partyGameDebug;
d.start('free', 'castle');
const s0 = d.getState();
d.hitSword(1, 0); const s1 = d.getState(); // inte KO
d.hitSword(1, 0); const s2 = d.getState(); // inte KO
d.hitSword(1, 0); const s3 = d.getState(); // KO + ragdoll
// Assert också att render_game_to_text speglar varje träff/KO.
```

```js
// 3. Ragdoll utan att vara beroende av AI eller projektilriktning.
const d = window.__partyGameDebug;
d.start('free', 'hill');
d.knockOut(1, 0);
const before = d.getState();
window.advanceTime(1000);
const after = d.getState();
// Assert: target 1 är KO/ragdoll och har rört sig nedför sluttningen.
```

```js
// 4. Kanon och oändlig ammunition på varje Fri-karta.
const d = window.__partyGameDebug;
for (const map of ['city', 'hill', 'platform', 'castle']) {
  d.start('free', map);
  const before = d.getState();
  for (let n = 0; n < 20; n += 1) {
    d.fireWeapon(0);
    window.advanceTime(500); // respektera eventuell cooldown
  }
  const after = d.getState();
  // Assert: kanonkulor skapades och spelaren kan fortfarande skjuta; ammo minskade inte.
}
```

```js
// 5. Fred-stad: bil kan gå sönder men figurer tar aldrig stridsskada.
const d = window.__partyGameDebug;
d.start('peace', 'city');
d.enterNearestCar();
const entered = d.getState();
for (let n = 0; n < 10; n += 1) d.damageCar();
window.advanceTime(100);
const broken = d.getState();
// Assert: bilen är trasig, människan är ute/urkastad, alla 10 är aktiva och ingen är KO/skadad.
```

```js
// 6. Fri-stad: motsvarande bilsekvens, plus mode-skillnaden.
const d = window.__partyGameDebug;
d.start('free', 'city');
d.enterNearestCar();
for (let n = 0; n < 10; n += 1) d.damageCar();
window.advanceTime(100);
const state = d.getState();
// Assert: bilen är trasig och föraren ute. Kör därefter på ett mål via normal input;
// i Fri får målstatus/hälsa ändras, till skillnad från Fred.
```

```js
// 7. Paus fryser deterministiskt state.
const d = window.__partyGameDebug;
d.start('free', 'platform');
document.querySelector('#pause-btn').click();
const pausedBefore = d.getState();
window.advanceTime(3000);
const pausedAfter = d.getState();
document.querySelector('#resume-btn').click();
window.advanceTime(1000);
const resumed = d.getState();
// Assert: fysik/AI/timers oförändrade under paus, förändras igen efter Resume.
```

För pil, sköld, vindbrygga, hemlig väg och plattformsfall används avtalade DOM-kontroller tillsammans med `getState()` och korta `advanceTime`-steg: Cycle tills önskad utrustning rapporteras, rörelse för att linjera målet, Attack/`fireWeapon`, respektive Use vid borgknappen. Om dessa tester inte kan göras repeterbara från den fasta startlayouten bör core lägga till smala debugkommandon (t.ex. positionera figur, välj utrustning eller flytta figur över fallgräns); de ska bara manipulera samma riktiga spelstate och får inte skapa en separat testlogik.

## Körordning och bevis

1. Kör meny/DOM/ljud först.
2. Kör varje scenario separat och reseta mellan dem.
3. Använd korta inputburstar och `window.advanceTime(ms)`; vänta efter attack, kollision och overlaybyte.
4. Spara minst en granskad spelskärmbild per karta samt extra bilder för ragdoll, trasig bil, öppnad vindbrygga, sköldblock och Plattan-eliminering.
5. Spara text-state och konsollogg tillsammans med varje misslyckande. Åtgärda första nya konsolfelet, kör om scenariot och därefter regressionen.
6. Slutgodkänn först när hela matrisen fungerar i både desktop- och iPad-viewport.
