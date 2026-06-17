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
| Pixelgubben | [`puzzle-game/`](puzzle-game/) | Ovanifrån-pussel: gå, hoppa över hål, knuffa stenar, akta ormar. Bana 1 (grottan), Bana 2 (riddarborgen), Bana 3 (drakhålan med boss-drake) och Bana 4 (fly från den rullande stenen). Med mystisk bakgrundsmusik. |

## Struktur

```
agustgames/
├── index.html        ← arkad-meny som länkar till alla spel
├── puzzle-game/      ← Pixelgubben (index.html + style.css + game.js)
└── ...               ← nya spel läggs i egna mappar
```

## Lägga till ett nytt spel

1. Skapa en ny mapp, t.ex. `rymdspel/`, med en egen `index.html`.
2. Lägg till ett kort i menyn (`index.html` i roten) som länkar till mappen.
3. Commita och pusha – spelet blir automatiskt en ny adress:
   `https://sindeed.github.io/agustgames/rymdspel/`

Spelen publiceras gratis med **GitHub Pages**.
