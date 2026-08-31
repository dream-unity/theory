# Dream Unity — Theory Atlas

A 2.5D knowledge atlas for Dream Unity. Four coloured quadrants surround **Unity Core**. Every card keeps its note, verb-labelled relations, maturity ring, and filing path visible. Nothing is hidden by semantic zoom.

## What you are looking at

The working surface matches the atlas desk:

- **Maker / Machine / World / Unity** quadrants, always on
- **Unity Core** in the centre, with in-card notes and a blinking caret
- **Atlas Filing Rail** — Inbox, Whole Theory, Mirror & Freedom, Three Forms, Realisation Lab
- **Inspector** — full note, maturity, sources, file-under, tags
- **Dossier** — facet chips, long notes, and drawers for Essence / Relations / Grounding / Mirror / Practice
- Verb edges: *enables, shapes, grounds, synthesises into, realises as, attunes, integrates*

Cards stay on the map at every zoom. Positions persist. Double-click a card to open its dossier. Type inside the card.

## Run

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

GitHub Pages builds from `main` via `.github/workflows/deploy-pages.yml` and publishes `/theory/`.

## Use

| Action | How |
|---|---|
| Pan | Drag the desk |
| Move a card | Drag the card |
| Connect | Drag a port onto another card |
| Add | Double-click the desk, right-click, or `N` |
| Edit notes | Toggle **In-node notes** and type in the card |
| Dossier | Double-click a card or press Enter |
| File | Choose a rail view, then **File here** |
| Restore seed | Filing rail footer |

Edits autosave to IndexedDB. **Restore seeded atlas** returns the canonical Whole Theory map.

## Filing method

Each concept carries:

- **Kind** — core, facet, form, field, principle, practice, tension
- **Portal / form / phase / stance / maturity**
- **Notes** typed in the card
- **Sources**
- **Mirror** — identity, intention, paradox, inversion risk, falsifier, restoring action
- **Practice** — methods, experiments, habits
- **Views** — which filing rail the card belongs on

The same concept can sit in more than one view without being copied.
