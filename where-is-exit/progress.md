Original prompt: Bygg om Where's Exit från grunden till ett icke-läskigt monsterspel i en jättestor fabrik med sju våningar, hissar, trappor, dörrar, tre mörkbruna monster, fem uppdrag och iPad-kontroller. Publicera den nya versionen i Agust Games först när den är färdigtestad.

# Where's Exit – ny version

## Låst spelspecifikation

- Startmenyn visar bara namnet `WHERE'S EXIT` och knappen `STARTA SPELET`.
- Fabriken är mycket stor, har sju våningar, hissar, trappor, dörrar och vanlig belysning.
- Spelet är ett lekfullt monsterspel, inte skräck. Inga jumpscares, inget blod och inga otäcka ljud.
- Tre helt svarta monster:
  1. Mycket långt, ett lysande gult öga och ett svart öga som smälter in, två armar/händer, två ben/fötter, ingen mun.
  2. Åtta ben, ett huvud, två lysande gula ögon, ingen mun; är det enda monstret som kan hoppa och gå på golv, väggar och tak.
  3. Inte långt, inga ögon eller mun, två armar/händer och två ben/fötter.
- Monstren vandrar; de jagar när de ser spelaren. Fångad spelare skickas till startmenyn och nästa start börjar om.
- Alla tre monster använder fabrikens trappor för att patrullera och jaga mellan våningar. Våning 3 är spärrad för dem tills de fem nycklarna är hittade.
- Det åttabenta och det korta ansiktslösa monstret rör sig exakt lika fort som spelaren springer (8,1 m/s). Det långa rör sig exakt lika fort som spelaren går (5,0 m/s).
- Uppdrag 1: hitta tio gula lampor och sätt en i vart och ett av tio eluttag.
- Uppdrag 2: dra i fem spakar; därefter fungerar hissen och spelaren kan välja våning.
- Uppdrag 3: hitta fem nycklar; därefter låses våning 3 upp för hiss och trappa.
- Uppdrag 4: våning 3 är dämpad men synlig; hitta knappen som tänder lamporna.
- Uppdrag 5: hitta hammaren, åk till våning 6, slå sönder EXIT-plankorna med ett tryck och gå ut för att vinna.
- Kontroller: spring, ta sak/använd och hoppa. Ta sak/använd slår sönder plankorna när hammaren finns.
- HUD visar alltid tydligt `UPPDRAG N AV 5` och namnet på det aktuella uppdraget.
- iPad/iPhone och dator ska fungera.

## Arbetslogg

- 2026-08-30: Gamla spelet raderades från projektet och GitHub Pages innan den nya specifikationen började byggas.
- 2026-08-30: Ny implementation startad från tom mapp.
- 2026-08-30: Första persons 3D låst efter användarens förtydligande. Samma lokala Three.js r185-renderingsmönster som War of Kingdoms används: ACES, sRGB, lågpolyformer, procedurtexturer, första persons handrigg, FOV 73 och iPad-DPR 1,25.
- 2026-08-30: Första lokala Chromium-testet startar, går och hoppar utan konsolfel. Fabriksljuset höjdes efter visuell kontroll för att undvika skräckkänsla.
- 2026-08-30: Full Chromium-E2E klar: 214 kontroller godkända, 0 funktionsfel, 0 konsolfel, 0 sidfel och 0 misslyckade nätverksanrop. Hela uppdragskedjan, hiss/trapp-lås, våning 3, vinst och monsterfångst verifierades.
- 2026-08-30: iPad 1024×1366 och iPhone 393×852 verifierade utan scroll, kontrollöverlapp eller flimmer. Pekmålen är 64–145 px och våning 3 är mörk men tydligt synlig.
- 2026-08-30: Version `20260830-2` publicerad i Agust Games. GitHub Pages-deploy lyckades och live-versionen startades, gick och hoppade utan konsolfel.
- 2026-08-30: Användaren ändrade monsterfärgen från mörkbrun till helt svart. Det långa monstret fick ett gult och ett osynligt svart öga. Fabrikens exponering sänktes lite från 1,08 till 1,02.
- 2026-08-30: HUD uppdaterad till `UPPDRAG N AV 5`. Version `20260830-3` klarade 214/214 regressionstester, 5/5 uppdragsrubriker och visuell iPad-kontroll av samtliga svarta monster utan konsol- eller sidfel.
- 2026-08-30: Version `20260830-3` publicerad. GitHub Pages-deploy lyckades och live-versionen verifierades med start, gång och hopp utan konsolfel.
- 2026-08-31: Monster-AI uppdaterad för trappor, patrull och jakt mellan våningar. Trapphöjden matchar modellen, nedåtresor hoppar inte i bild, åttabensmonstret startar utanför väggen och fastnade rutter har en säker återhämtning.
- 2026-08-31: Automatisk nav-självtest klar: 31/31 kontroller godkända för rätt version, exakta hastigheter 5,0/5,0/8,1, upp- och nedresor för alla tre monster, våning-3-lås, våningsgränser, verklig trappinflygning och noll konsol-/sidfel.
- 2026-08-31: Full spelregression klar efter AI-ändringen: 214/214 kontroller godkända, 0 funktionsfel, 0 konsolfel, 0 sidfel och 0 misslyckade nätverksanrop genom rörelse, samtliga fem uppdrag, hiss/trapp-lås, vinst, fångst och omstart.
- 2026-08-31: Slutlig iPad-kontroll 1180×820 klar. Monstrets fötter följer de diskreta trappstegen exakt (1,70 m på mittsteget), HUD-överlapp är 0, touchknapparna fungerar och inga konsol- eller sidfel uppstod.
- 2026-08-31: Version `20260831-4` publicerad i Agust Games. GitHub Pages-deploy lyckades, live-filerna matchar de testade blobbarna exakt och den publicerade versionen startade, gick och hoppade utan konsol- eller sidfel.
- 2026-08-31: ÅTTABEN fick sprintfart 8,1 m/s och blev spelets enda hoppande monster. Hopp använder samma tydliga fysik som spelaren, pausar vägg-/takbyten i luften, samverkar inte med trapphöjd och kan inte fånga spelaren från för stor höjd.
- 2026-08-31: ÅTTABEN-verifieringen är grön: 61/61 riktade kontroller godkända för exklusivt hopp, vägg/tak, 8,1 m/s, 1,227 m hopptopp, 0,75 s landning, trappblockering och noll webbläsarfel.
- 2026-08-31: Hela spelets regression är fortsatt grön med 214/214 kontroller. iPad 1180×820 är visuellt granskad vid hoppets topp, på väggen och i taket utan HUD-/touchöverlappning; alla touchmål är minst 44 px.
- 2026-08-31: Slutgranskningen rättade trappfångst och väggorientering. 17/17 höjdkänsliga trappkontroller, 61/61 ÅTTABEN-kontroller och en ny full 214/214-regression passerar; nord-, syd-, öst- och västvägg verifierades utan webbläsarfel.
- 2026-08-31: Version `20260831-5` publicerad i Agust Games. GitHub Pages-deploy lyckades, live-filerna matchar de testade filerna exakt och den publicerade versionen startade, gick och hoppade utan konsol- eller sidfel.

## TODO

- [x] Meny och responsiv kontrollayout
- [x] 3D-fabrik med sju våningar
- [x] Rörelse, hopp, spring, interaktion, hiss och trappor
- [x] Tre monster med vandring, syn, jakt och fångst
- [x] Monstertrappor mellan våningar och exakta gång-/sprintfarter
- [x] ÅTTABEN som exklusiv hoppare och vägg-/takklättrare
- [x] Alla fem uppdragen i rätt ordning
- [x] Vinst, förlust och omstart
- [x] render_game_to_text och advanceTime
- [x] Playwright-test på desktop, iPad och iPhone
- [x] Publicering och kontroll av live-version
