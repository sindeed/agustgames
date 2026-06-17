# Arbetsregler för Agust Games

Det här är en samling små webbspel som **Agust (9 år)** spelar. Målet är att han
ska kunna **provspela ändringar så snabbt som möjligt**.

## Publicera snabbt (viktigast)

- När en ändring är klar och rimligt verifierad: **publicera den direkt** så den
  blir spelbar live, utan att fråsa först varje gång. Standardflödet är:
  1. Gör ändringen på arbetsbranchen och commita.
  2. **Merga in i `main`** och pusha `main`.
  3. GitHub Pages bygger om automatiskt (oftast 1–3 min) →
     https://sindeed.github.io/agustgames/
- Påminn vid behov om att ladda om hårt (Ctrl/Cmd+Shift+R) ifall den gamla
  versionen ligger kvar i cachen.
- Skapa pull request bara om användaren uttryckligen ber om granskning först.

## Projektstruktur

```
agustgames/
├── index.html        ← arkad-meny som länkar till alla spel
├── puzzle-game/      ← Pixelgubben (index.html + style.css + game.js)
└── ...               ← nya spel läggs i egna mappar
```

- Spelen är ren HTML/CSS/JS utan byggsteg – öppnas direkt i webbläsaren.
- Pixelgubben har flera banor i `puzzle-game/game.js` (bl.a. Bana 3 Drakhålan
  med boss-draken).

## Att tänka på

- Skriv enkel, lättläst kod i samma stil som befintliga filer.
- Banor i `game.js` är ASCII-kartor – varje rad måste vara exakt `COLS` tecken.
