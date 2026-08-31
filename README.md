# Dream Unity — Theory Observatory

A living, editable knowledge atlas for Dream Unity. It combines a stable spatial concept map with a structured theory spine, question-driven focus views, sentence-like relationships, epistemic metadata, and Dream Unity-native reasoning operations.

## What is implemented

- Stable 2D semantic canvas with pan, pinch, zoom, lasso, minimap, touch, and keyboard support
- Semantic zoom: the atlas reveals essence, phase, and relation detail only as scale permits
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

## GitHub autosave

The public application never contains a repository credential.

For the owner-only version, choose **Connect** and provide a fine-grained GitHub token that:

1. Is limited to only `dream-unity/theory`.
2. Has **Contents: Read and write**.
3. Has an expiry.

The token is kept in session storage only, is never placed in IndexedDB or theory JSON, and disappears when the browser tab is closed. Every edit first enters a serialized local-save queue; GitHub writes are coalesced and serialized onto the `theory-live` branch. This avoids rebuilding the website after every checkpoint. The last synced SHA and full common ancestor are stored locally without the token. Divergence pauses sync, retains recovery backups, and offers a base-aware merge only when independent fields can be combined without guessing.

For shared real-time editing, use the production evolution described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): a repository-scoped GitHub App, trusted authentication/sync service, granular Yjs document, IndexedDB offline cache, and GitHub as a human-readable checkpoint layer.

## Data model

The published working snapshot is [`public/data/theory.json`](public/data/theory.json). Its starting material was synthesized from the Dream Unity project context available during implementation and is marked `ai-proposed`, provisional, and confidence-unknown—not silently presented as Michael's accepted canon. The named founding essay remains source-pending until its canonical text or immutable locator is attached. Positions belong to views rather than concepts, so the same concept can occupy a useful location in Whole Theory, Mirror & Freedom, Three Forms, and other maps without creating competing copies.

Core entities:

- Concepts, claims, mechanisms, models, syntheses, practices, evidence, sources, questions, tensions, examples, and documents
- Structure, dynamics, reasoning, correspondence, integration, and provenance relations
- Maker, Machine, World, and Unity portal facets
- Consciousness, relational, and strategic form facets
- Ether, formation, compression, synthesis, realisation, reflection, and return phases
- Maturity, stance, confidence, knowledge mode, sources, provenance, and Mirror analysis

## Keyboard

| Key | Action |
|---|---|
| `Ctrl/Cmd + K` or `/` | Search and commands |
| `N` | Capture a seed |
| `F` | Cycle all / one-hop / two-hop focus |
| `M` | Open the selected concept's Mirror |
| `S` | Forge the multi-selection |
| `R` | Realise the selected concept |
| `Home` | Return to the Unity Core |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `?` | Orientation guide |

## Research basis

The implementation rationale and primary research links are recorded in [docs/DESIGN-RATIONALE.md](docs/DESIGN-RATIONALE.md).
