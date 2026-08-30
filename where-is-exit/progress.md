Original prompt: Bygg om Where's Exit från grunden till ett icke-läskigt monsterspel i en jättestor fabrik med sju våningar, hissar, trappor, dörrar, tre mörkbruna monster, fem uppdrag och iPad-kontroller. Publicera den nya versionen i Agust Games först när den är färdigtestad.

# Where's Exit – ny version

## Låst spelspecifikation

- Startmenyn visar bara namnet `WHERE'S EXIT` och knappen `STARTA SPELET`.
- Fabriken är mycket stor, har sju våningar, hissar, trappor, dörrar och vanlig belysning.
- Spelet är ett lekfullt monsterspel, inte skräck. Inga jumpscares, inget blod och inga otäcka ljud.
- Tre mörkbruna monster:
  1. Mycket långt, ett lysande gult öga, två armar/händer, två ben/fötter, ingen mun.
  2. Åtta ben, ett huvud, två lysande gula ögon, ingen mun; går på golv, väggar och tak.
  3. Inte långt, inga ögon eller mun, två armar/händer och två ben/fötter.
- Monstren vandrar; de jagar när de ser spelaren. Fångad spelare skickas till startmenyn och nästa start börjar om.
- Uppdrag 1: hitta tio gula lampor och sätt en i vart och ett av tio eluttag.
- Uppdrag 2: dra i fem spakar; därefter fungerar hissen och spelaren kan välja våning.
- Uppdrag 3: hitta fem nycklar; därefter låses våning 3 upp för hiss och trappa.
- Uppdrag 4: våning 3 är dämpad men synlig; hitta knappen som tänder lamporna.
- Uppdrag 5: hitta hammaren, åk till våning 6, slå sönder EXIT-plankorna med ett tryck och gå ut för att vinna.
- Kontroller: spring, ta sak/använd och hoppa. Ta sak/använd slår sönder plankorna när hammaren finns.
- iPad/iPhone och dator ska fungera.

## Arbetslogg

- 2026-08-30: Gamla spelet raderades från projektet och GitHub Pages innan den nya specifikationen började byggas.
- 2026-08-30: Ny implementation startad från tom mapp.
- 2026-08-30: Första persons 3D låst efter användarens förtydligande. Samma lokala Three.js r185-renderingsmönster som War of Kingdoms används: ACES, sRGB, lågpolyformer, procedurtexturer, första persons handrigg, FOV 73 och iPad-DPR 1,25.
- 2026-08-30: Första lokala Chromium-testet startar, går och hoppar utan konsolfel. Fabriksljuset höjdes efter visuell kontroll för att undvika skräckkänsla.
- 2026-08-30: Full Chromium-E2E klar: 214 kontroller godkända, 0 funktionsfel, 0 konsolfel, 0 sidfel och 0 misslyckade nätverksanrop. Hela uppdragskedjan, hiss/trapp-lås, våning 3, vinst och monsterfångst verifierades.
- 2026-08-30: iPad 1024×1366 och iPhone 393×852 verifierade utan scroll, kontrollöverlapp eller flimmer. Pekmålen är 64–145 px och våning 3 är mörk men tydligt synlig.

## TODO

- [x] Meny och responsiv kontrollayout
- [x] 3D-fabrik med sju våningar
- [x] Rörelse, hopp, spring, interaktion, hiss och trappor
- [x] Tre monster med vandring, syn, jakt och fångst
- [x] Alla fem uppdragen i rätt ordning
- [x] Vinst, förlust och omstart
- [x] render_game_to_text och advanceTime
- [x] Playwright-test på desktop, iPad och iPhone
- [ ] Publicering och kontroll av live-version
