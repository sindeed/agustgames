# Agust Games 🎮

En samling små webbspel gjorda av Agust (9 år). Varje spel ligger i sin egen
mapp och en arkad-meny (`index.html`) länkar ihop dem.

## Spela

Spelen körs direkt i webbläsaren – inget att installera.

- **Online:** https://sindeed.github.io/agustgames/
- **Lokalt:** öppna `index.html` i en webbläsare.

## Spel

| Spel | Mapp | Beskrivning |
|------|------|-------------|
| Pixelgubben | [`puzzle-game/`](puzzle-game/) | Ovanifrån-pussel: gå, hoppa över hål, knuffa stenar och akta fiender. Sju banor: grottan, riddarborgen, drakhålan, den rullande stenen, Kodtemplet, Bossarenan och Trädgården. |
| Survivor of Days | [`survivor-blockshop/`](survivor-blockshop/) | Bygg en bas, handla block i Blockshop och skydda hjärtat i fem dygn. |
| Wilder: The Big City | [`wilder-big-city/`](wilder-big-city/) | Utforska den stora staden Wilder i förstapersons-3D. Välj en av 19 personer (4 poliser, 5 tjuvar och 10 vanliga människor), kör fordon och besök stadens 13 byggnader. |
| Wildbound: The Stormwake Trail | [`wildbound/`](wildbound/) | Ett stort originellt förstapersonsäventyr med vildmark, floder, vägar, bybor, häststall, strid och kreativ byggmagi. |
| IKEA 3:33 | [`ikea-333/`](ikea-333/) | Ett stort förstapersonsäventyr i 23 kapitel. Överlev IKEA 03:33 och fortsätt genom drakgrottor, hajö, spöktåg, vulkan och nio nya skräckvärldar från den gamla skolan till den föränderliga källaren. |
| Where is Exit? | [`where-is-exit/`](where-is-exit/) | Neonlabyrint i tre våningar. Avslöja den riktiga EXIT-dörren med sökpulsen och undvik skuggorna. |
| Paint War 2 Deluxe | [`paint-war/`](paint-war/) | Tredjepersonsstrid med färgvapen, sju Waves, kartval, bottar och flyttbara bord att gömma sig under. |

## Struktur

```
agustgames/
├── index.html        ← arkad-meny som länkar till alla spel
├── puzzle-game/      ← Pixelgubben (index.html + style.css + game.js)
├── survivor-blockshop/ ← Survivor of Days and Blockshop of Building
├── wilder-big-city/  ← Förstapersons-3D i staden Wilder
├── wildbound/        ← Stort förstapersonsäventyr i en levande vildmark
├── ikea-333/         ← Förstapersons-3D i 23 kapitel med möbelbygge, drakar, katastrofer och skräckvärldar
├── where-is-exit/    ← Neonlabyrint med sökpuls, falska utgångar och skuggor
├── paint-war/        ← Paint War 2 Deluxe i tredje person med Waves och kartval
└── ...               ← nya spel läggs i egna mappar
```

## Lägga till ett nytt spel

1. Skapa en ny mapp, t.ex. `rymdspel/`, med en egen `index.html`.
2. Lägg till ett kort i menyn (`index.html` i roten) som länkar till mappen.
3. Commita och pusha – spelet blir automatiskt en ny adress:
   `https://sindeed.github.io/agustgames/rymdspel/`

Spelen publiceras gratis med **GitHub Pages**.
