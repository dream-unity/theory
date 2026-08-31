# Dream Unity — Theory Observatory

A living, editable knowledge atlas for Dream Unity. It combines a stable spatial concept map with a structured theory spine, question-driven focus views, sentence-like relationships, epistemic metadata, and Dream Unity-native reasoning operations.

## What is implemented

- Stable 2D semantic canvas with pan-by-default, pinch zoom, optional lasso, minimap, touch, and keyboard support
- Every idea stays on the map at every zoom — no disappearing landmarks
- Click selects without stealing the camera; double-click or Enter opens the dossier
- Drag a handle onto empty space (or press Tab) to grow a related idea in place
- Canonical typed concepts shown through multiple views without duplicating their content
- Explicit directional relationship verbs, rationale, status, and family
- Searchable outline/spine as an equal representation of the graph
- Editable essence, Markdown dossier, maturity, stance, confidence, portals, phases, topics, sources, and Mirror fields
- `Unity Forge`: combines selected forms while retaining provenance, differences, tensions, consequences, and omissions
- `Reality Bridge`: converts theory into a practice/experiment with expected and observed outcomes
- `Return to Ether`: reversible archival rather than destructive deletion
- Immediate IndexedDB persistence, offline-safe local edits, undo/redo, JSON import/export
- Serialized, debounced GitHub checkpoints with SHA conflict detection and an explicit review flow
- Five focus maps and an explicitly `ai-proposed` starting ontology for author review
- Responsive mobile drawers, 44px-class primary touch controls, reduced-motion and increased-contrast support

## Run locally

```bash
npm install
npm run dev
```

Production verification:

```bash
npm test
npm run build
npm run preview
```

Before committing a release, refresh the branch-compatible GitHub Pages files:

```bash
npm run pages:prepare
```

The editable Vite source entry is `app.html`. The generated root `index.html`,
`assets/`, `data/`, and `runtime-config.json` mirror the production build so the
site remains valid whether GitHub Pages is configured for Actions artifacts or
for the `main` branch root.

## Keyboard

| Key | Action |
|---|---|
| Drag empty space | Pan the map |
| Shift-drag | Lasso-select several ideas |
| Double-click empty space | Add an idea in place and name it |
| Drag a connection dot onto empty space | Grow a related idea |
| Double-click an idea | Open the editor |
| `Enter` | Open the selected idea |
| `Tab` | Add a related idea beside the selection |
| `F2` | Rename in place |
| Arrow keys | Jump to the nearest idea in that direction |
| `Ctrl/Cmd + K` or `/` | Search and commands |
| `N` | Capture a seed with type and link options |
| `F` | Cycle all / one-hop / two-hop focus |
| `Home` | Return to the Unity Core |
| `Esc` | Close the editor, then deselect |
| `Ctrl/Cmd + Z` | Undo |
| `?` | Orientation guide |

## Research basis

The implementation rationale and primary research links are recorded in [docs/DESIGN-RATIONALE.md](docs/DESIGN-RATIONALE.md).
