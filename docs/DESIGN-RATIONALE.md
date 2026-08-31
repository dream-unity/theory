# Why the Theory Observatory is designed this way

There is no scientifically established interface that is universally “compatible with the human brain.” The useful question is narrower: which representation best supports Dream Unity’s actual work—capturing concepts quickly, preserving spatial memory, tracing arguments, exposing tensions, forming reversible syntheses, and forcing theory to meet reality?

The resulting answer is a hybrid: a typed knowledge graph, a stable spatial canvas, a hierarchy-like theory spine, and several task-specific views.

## Evidence → implementation

| Research finding or design principle | Implementation decision |
|---|---|
| Concept maps gain meaning from concepts joined by linking phrases; cross-links can expose synthesis. [Novak & Cañas, IHMC](https://cmap.ihmc.us/docs/theory-of-concept-maps) | Every edge is directional and verb-labelled. Selecting it exposes a grammatical proposition, rationale, status, and family. |
| A user-arranged, stable spatial surface can support location memory. [Robertson et al., Data Mountain](https://www.microsoft.com/en-us/research/wp-content/uploads/1998/01/p153-robertson.pdf) | Positions are durable and view-specific. No continuous force simulation and no unsolicited global rearrangement. |
| More freedom in a third dimension can worsen retrieval and perceived efficiency through clutter. [Cockburn & McKenzie](https://faculty.washington.edu/aragon/classes/hcde411/a15/readings/cockburn-chi02.pdf) | The working information plane is 2D. Depth, glow, Ether, and overlapping fields are atmospheric only. |
| Overview, zoom/filter, details, relationships, and history are complementary tasks. [Shneiderman, “The Eyes Have It”](https://hci.ucsd.edu/220/EyesHaveIt.pdf) | The interface combines overview maps, semantic zoom, filters, a dossier, readable relations, revision metadata, and recoverable return. |
| Zoomable interfaces can preserve one navigable information world across scales. [Bederson & Hollan, Pad++](https://www.cs.columbia.edu/graphics/courses/csw4170/resources/bedersonHollanUIST94.pdf) | Far zoom prioritizes major forms; mid zoom shows concepts; near zoom adds essences, phases, relation counts, and full edge verbs. |
| Large graphs become unusable when the entire topology is emphasized at once; focal context and expansion-on-demand are safer. [van Ham & Perer](https://perer.org/papers/adamPerer-DOIGraphs-InfoVis2009.pdf) | One- and two-hop focus fade irrelevant nodes without destroying the user’s global landmarks. Focus maps answer explicit questions. |
| Path continuity and crossings materially affect graph-reading tasks. [Ware et al.](https://doi.org/10.1057/palgrave.ivs.9500013) | Smooth, restrained edges; filters by relation family; local maps; and stable user placement take precedence over decorative symmetry. |
| Direct manipulation of an external representation can be an epistemic action: the manipulation helps generate insight. [Kirsh & Maglio](https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1804_1) | Capture, connect, select, reposition, Mirror, Forge, and Realise are reasoning actions, not a read-only diagram. |
| Closely aligning verbal and visual material can improve retention and transfer. [Moreno & Mayer](https://www.davidlewisphd.com/courses/EDD8121/readings/1999-MorenoMayer.pdf) | Concise essence stays inside its concept; the edge verb stays on the edge; long material moves to the adjacent inspector. |
| React Flow exposes custom DOM nodes, selection, connections, pan/zoom, keyboard operation and accessibility primitives. [Official documentation](https://reactflow.dev/learn/advanced-use/accessibility) | React Flow is the spatial interaction layer; the graph is not trapped in a canvas-only renderer. |

## Dream Unity-specific information architecture

The repository begins with four portal anchors:

- Dream Maker — imagination, consciousness, identity, agency, primality
- Dream Machine — relation, constraint, compression, synthesis, generative process
- Dream World — strategy, embodiment, artifacts, environments, lived consequence
- Unity — principles and models that genuinely span the three

Ether is the surrounding origin/return field. The three established forms—consciousness, relational, strategic—remain independent facets. This avoids prematurely declaring that portals and forms are identical.

Concept coordinates are not stored on the concept. They live in a `TheoryView`. “Primality” can therefore occupy different meaningful positions in Whole Theory and Mirror & Freedom while remaining one canonical idea.

## Epistemic structure

The design deliberately separates:

- **Type:** what kind of entity this is
- **Maturity:** how thoroughly it has been developed
- **Stance:** whether it is open, adopted, contested, superseded, or archived
- **Confidence:** how strongly it is currently warranted
- **Knowledge mode:** empirical, logical, phenomenological, interpretive, normative, symbolic, speculative, or design

A sophisticated claim may be mature but rejected. A metaphysical model may be coherent but explicitly speculative. A single “truth score” would erase these distinctions.

## Native reasoning operations

### Unity Forge

A synthesis records its sources, shared invariant, irreducible differences, unresolved tensions, emergent claim, practical consequences, and omissions. The compressed result can always be unfolded back to its provenance.

### Mirror Test

The Mirror is analytical, not decorative. It separates direct experience from representation, names the primal value, identifies inversion risk, records what could falsify or transform the claim, and demands a restoring action.

### Reality Bridge

An abstract form becomes a linked practice or experiment with a proposed act, expected observation, observed outcome, and later reflective update. This exposes the “reality gap” rather than allowing theory to grow indefinitely without consequence.

### Return to Ether

Normal use archives and supersedes rather than hard-deleting. Return preserves backlinks and lineage while releasing an obsolete form from the active theory.

## Constraints and honest caveats

- Cognitive findings are task-dependent; spatial stability is a default, not dogma.
- Working-memory research does not justify an arbitrary fixed number of visible nodes.
- Semantic zoom reduces visual load but can hide a needed relationship; the outline and search remain equal escape routes.
- A graph can still become a hairball. Growth requires curated focus questions, local views, relation filters, and periodic attention to orphans, vague links, reality gaps, and over-connected hubs.
- AI-suggested theory should remain visibly provisional until a human accepts it. The current release does not autonomously generate canonical claims.
