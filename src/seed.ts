import type {
  Form,
  Phase,
  Portal,
  TheoryDocument,
  TheoryEdge,
  TheoryNode,
  TheoryNodeType,
  TheoryView,
} from './types'

const CREATED = '2026-08-31T00:00:00.000Z'

type SeedNode = {
  id: string
  title: string
  essence: string
  type?: TheoryNodeType
  portals?: Portal[]
  forms?: Form[]
  phases?: Phase[]
  topics?: string[]
  body?: string
}

const seedNodes: SeedNode[] = [
  {
    id: 'unity-core',
    title: 'Dream Unity',
    essence: 'Dream worlds are compressed, synthesised and realised in the physical before returning, transformed, to their originating ether.',
    type: 'model',
    portals: ['unity'],
    forms: ['consciousness', 'relational', 'strategic'],
    phases: ['formation', 'compression', 'synthesis', 'realisation', 'return'],
    topics: ['core', 'unity'],
    body: 'The central living model. Dream Unity is not merely a collection of imagined worlds; it is a cycle through which potential becomes form, forms discover relation, relation becomes strategy, and strategy becomes embodied reality. Return preserves what was learned while reopening possibility.',
  },
  {
    id: 'ether',
    title: 'Ether',
    essence: 'The field of uncommitted potential from which forms arise and to which completed forms can return.',
    type: 'concept', portals: ['unity'], forms: ['consciousness'], phases: ['ether', 'return'], topics: ['origin'],
  },
  {
    id: 'compression',
    title: 'Compression',
    essence: 'Distillation that preserves generative structure while removing noise and repetition.',
    type: 'mechanism', portals: ['machine', 'unity'], forms: ['relational'], phases: ['compression'], topics: ['transformation'],
  },
  {
    id: 'synthesis',
    title: 'Synthesis',
    essence: 'A reversible unity that creates something new without erasing the irreducible difference of its sources.',
    type: 'mechanism', portals: ['machine', 'unity'], forms: ['relational'], phases: ['synthesis'], topics: ['transformation'],
  },
  {
    id: 'realisation',
    title: 'Realisation',
    essence: 'The passage from inward possibility to embodied act, artifact, practice or observable consequence.',
    type: 'mechanism', portals: ['world', 'unity'], forms: ['strategic'], phases: ['realisation'], topics: ['embodiment'],
  },
  {
    id: 'return',
    title: 'Return to Ether',
    essence: 'Reversible release: a form is archived, unfolded or reopened without destroying its lineage.',
    type: 'mechanism', portals: ['unity'], forms: ['consciousness'], phases: ['reflection', 'return'], topics: ['origin'],
  },
  {
    id: 'dream-maker',
    title: 'Dream Maker',
    essence: 'The domain in which imagination, identity and agency deliberately form inner possibility.',
    type: 'model', portals: ['maker'], forms: ['consciousness'], phases: ['formation'], topics: ['architecture'],
  },
  {
    id: 'dream-machine',
    title: 'Dream Machine',
    essence: 'The domain in which relations, constraints and generative processes transform forms into coherent models.',
    type: 'model', portals: ['machine'], forms: ['relational'], phases: ['compression', 'synthesis'], topics: ['architecture'],
  },
  {
    id: 'dream-world',
    title: 'Dream World',
    essence: 'The domain in which models become navigable environments, artifacts and lived consequences.',
    type: 'model', portals: ['world'], forms: ['strategic'], phases: ['realisation', 'reflection'], topics: ['architecture'],
  },
  {
    id: 'consciousness-forms',
    title: 'Consciousness Forms',
    essence: 'Sensory, affective, imaginal and belief-structured forms that shape what can be experienced.',
    type: 'model', portals: ['maker'], forms: ['consciousness'], phases: ['formation'], topics: ['forms'],
  },
  {
    id: 'relational-forms',
    title: 'Relational Forms',
    essence: 'Patterns, analogies, distinctions and transformations through which separate forms become intelligible together.',
    type: 'model', portals: ['machine'], forms: ['relational'], phases: ['compression', 'synthesis'], topics: ['forms'],
  },
  {
    id: 'strategic-forms',
    title: 'Strategic Forms',
    essence: 'Models of action that coordinate choice, prediction, commitment and execution through time.',
    type: 'model', portals: ['world'], forms: ['strategic'], phases: ['realisation'], topics: ['forms'],
  },
  {
    id: 'primality',
    title: 'Primality',
    essence: 'The living capacity to originate impulse, test limits and extend one’s nature without surrendering authorship.',
    portals: ['maker'], forms: ['consciousness'], phases: ['formation'], topics: ['freedom'],
  },
  {
    id: 'sovereignty',
    title: 'Sovereignty',
    essence: 'Integrated authority over one’s awareness, choices and creative direction.',
    type: 'concept', portals: ['maker', 'world'], forms: ['consciousness', 'strategic'], phases: ['formation', 'realisation'], topics: ['freedom'],
  },
  {
    id: 'agency',
    title: 'Agency',
    essence: 'The capacity to choose and act from an authored centre rather than merely react to the system.',
    portals: ['maker', 'world'], forms: ['consciousness', 'strategic'], phases: ['formation', 'realisation'], topics: ['freedom'],
  },
  {
    id: 'imagination',
    title: 'Imagination',
    essence: 'The faculty that generates forms not yet constrained to present physical conditions.',
    portals: ['maker'], forms: ['consciousness'], phases: ['ether', 'formation'], topics: ['creation'],
  },
  {
    id: 'ghost-mirror',
    title: 'The Ghost in the Mirror',
    essence: 'A reflected representation that ceases to serve the living self and begins governing it.',
    type: 'model', portals: ['maker', 'machine'], forms: ['consciousness', 'relational'], phases: ['reflection'], topics: ['mirror', 'freedom'],
    body: 'A diagnostic model of inversion: the material image, social proxy or self-concept becomes more vital than the living primal source it once reflected. The question “Who am I?” can then be generated by the reflected system rather than by recovered agency.',
  },
  {
    id: 'material-inversion',
    title: 'Material Inversion',
    essence: 'The proxy, image or possession becomes more vital than the living capacity it was meant to extend.',
    type: 'mechanism', portals: ['machine', 'world'], forms: ['relational', 'strategic'], phases: ['reflection'], topics: ['mirror', 'freedom'],
  },
  {
    id: 'domestication',
    title: 'Domestication of Vitality',
    essence: 'Repeated external governance progressively narrows spontaneous agency into predictable compliance.',
    type: 'claim', portals: ['maker', 'world'], forms: ['consciousness', 'strategic'], phases: ['reflection'], topics: ['mirror', 'freedom'],
  },
  {
    id: 'inner-light',
    title: 'Inner Light',
    essence: 'A lived centre of value and orientation that does not require the outer world to authorise its existence.',
    portals: ['maker'], forms: ['consciousness'], phases: ['formation'], topics: ['freedom'],
  },
  {
    id: 'creative-freedom',
    title: 'Creative Freedom',
    essence: 'The practical ability to transform imagination into chosen form while retaining responsibility for consequences.',
    portals: ['maker', 'world', 'unity'], forms: ['consciousness', 'strategic'], phases: ['synthesis', 'realisation'], topics: ['freedom', 'creation'],
  },
  {
    id: 'wisdom',
    title: 'Wisdom',
    essence: 'The capacity to exercise freedom without becoming enslaved by the instruments, pleasures or images freedom makes available.',
    portals: ['unity'], forms: ['relational', 'strategic'], phases: ['reflection'], topics: ['freedom'],
  },
  {
    id: 'embodied-awareness',
    title: 'Embodied Awareness',
    essence: 'Physical limitation is a testing ground through which awareness becomes demonstrable agency.',
    type: 'claim', portals: ['world'], forms: ['consciousness', 'strategic'], phases: ['realisation'], topics: ['embodiment', 'freedom'],
  },
  {
    id: 'become',
    title: 'Become',
    essence: 'A practice for deliberately switching sensory form, vibe, reality frame and belief before applying the shift to life.',
    type: 'practice', portals: ['maker', 'world'], forms: ['consciousness', 'strategic'], phases: ['formation', 'realisation'], topics: ['training'],
  },
  {
    id: 'relational-training',
    title: 'Relational Training',
    essence: 'Practice across analogy, topology, constraints, trajectories and rule systems to make relation itself more flexible.',
    type: 'practice', portals: ['machine'], forms: ['relational'], phases: ['compression', 'synthesis'], topics: ['training'],
  },
  {
    id: 'action-cycle',
    title: 'Observe → Integrate → Predict → Commit → Execute',
    essence: 'A strategic cycle that carries perception through a model and into decisive embodied action.',
    type: 'mechanism', portals: ['world'], forms: ['relational', 'strategic'], phases: ['synthesis', 'realisation'], topics: ['training', 'strategy'],
  },
  {
    id: 'unity-forge',
    title: 'Unity Forge',
    essence: 'A synthesis practice that records shared invariants, irreducible differences, tensions, emergence and omissions.',
    type: 'practice', portals: ['machine', 'unity'], forms: ['relational'], phases: ['compression', 'synthesis'], topics: ['method'],
  },
  {
    id: 'mirror-test',
    title: 'Mirror Test',
    essence: 'A diagnostic that separates lived essence from representation and names the proxy, inversion risk and restoring action.',
    type: 'practice', portals: ['maker', 'unity'], forms: ['consciousness', 'relational'], phases: ['reflection'], topics: ['method', 'mirror'],
  },
  {
    id: 'reality-bridge',
    title: 'Reality Bridge',
    essence: 'A method that connects a claim to a practice, prediction, observable outcome and reflective update.',
    type: 'practice', portals: ['world', 'unity'], forms: ['strategic'], phases: ['realisation', 'reflection'], topics: ['method', 'embodiment'],
  },
  {
    id: 'question-unification',
    title: 'What survives unification?',
    essence: 'Which invariants must remain when dream forms are compressed, and which losses would falsify the synthesis?',
    type: 'question', portals: ['unity'], forms: ['relational'], phases: ['compression', 'synthesis'], topics: ['open-question'],
  },
  {
    id: 'tension-freedom-constraint',
    title: 'Freedom and Constraint',
    essence: 'Agency requires constraint to become testable, yet constraint can also harden into domestication.',
    type: 'tension', portals: ['unity'], forms: ['relational', 'strategic'], phases: ['reflection'], topics: ['tension', 'freedom'],
  },
  {
    id: 'ghost-essay',
    title: 'The Ghost in the Mirror — Of Slavery and Freedom',
    essence: 'A named source awaiting attachment of the author’s canonical text before its claims can be treated as grounded.',
    type: 'document', portals: ['maker', 'unity'], forms: ['consciousness', 'relational'], phases: ['reflection'], topics: ['source', 'mirror'],
    body: '## Source required\n\nThe founding text was not supplied to this repository. Attach the canonical essay, URL, or immutable content hash here before accepting relations derived from it.',
  },
]

type SeedEdge = [string, string, string, TheoryEdge['family'], string?]

const seedEdges: SeedEdge[] = [
  ['ether', 'imagination', 'gives rise to', 'dynamics'],
  ['imagination', 'consciousness-forms', 'forms', 'dynamics'],
  ['consciousness-forms', 'compression', 'are distilled by', 'dynamics'],
  ['compression', 'relational-forms', 'reveals reusable relations as', 'dynamics'],
  ['consciousness-forms', 'relational-forms', 'become intelligible through', 'dynamics'],
  ['relational-forms', 'synthesis', 'are integrated by', 'integration'],
  ['synthesis', 'strategic-forms', 'organises relations into', 'integration'],
  ['relational-forms', 'strategic-forms', 'inform', 'dynamics'],
  ['strategic-forms', 'realisation', 'direct', 'dynamics'],
  ['realisation', 'return', 'is reflected through', 'dynamics'],
  ['return', 'ether', 'reopens', 'dynamics'],
  ['dream-maker', 'consciousness-forms', 'cultivates', 'structure'],
  ['dream-machine', 'relational-forms', 'operates through', 'structure'],
  ['dream-world', 'strategic-forms', 'embodies', 'structure'],
  ['compression', 'synthesis', 'prepares', 'dynamics'],
  ['synthesis', 'realisation', 'makes coherent for', 'dynamics'],
  ['primality', 'agency', 'expresses itself through', 'dynamics'],
  ['agency', 'sovereignty', 'develops into', 'dynamics'],
  ['imagination', 'creative-freedom', 'supplies possibility to', 'dynamics'],
  ['agency', 'creative-freedom', 'enables', 'dynamics'],
  ['wisdom', 'creative-freedom', 'governs', 'dynamics'],
  ['material-inversion', 'ghost-mirror', 'produces', 'dynamics'],
  ['ghost-mirror', 'domestication', 'governs impulse through', 'dynamics'],
  ['domestication', 'primality', 'constrains', 'dynamics'],
  ['inner-light', 'agency', 'orients', 'dynamics'],
  ['embodied-awareness', 'agency', 'tests', 'reasoning'],
  ['tension-freedom-constraint', 'embodied-awareness', 'is explored by', 'reasoning'],
  ['ghost-essay', 'ghost-mirror', 'articulates', 'provenance'],
  ['ghost-essay', 'primality', 'defines', 'provenance'],
  ['ghost-essay', 'sovereignty', 'connects to', 'provenance'],
  ['become', 'consciousness-forms', 'trains deliberate control of', 'reasoning'],
  ['relational-training', 'relational-forms', 'trains', 'reasoning'],
  ['action-cycle', 'strategic-forms', 'operationalises', 'reasoning'],
  ['unity-forge', 'synthesis', 'operationalises', 'reasoning'],
  ['mirror-test', 'ghost-mirror', 'diagnoses', 'reasoning'],
  ['reality-bridge', 'realisation', 'operationalises', 'reasoning'],
  ['question-unification', 'synthesis', 'challenges', 'reasoning'],
  ['dream-maker', 'unity-core', 'contributes inner possibility to', 'integration'],
  ['dream-machine', 'unity-core', 'contributes relational coherence to', 'integration'],
  ['dream-world', 'unity-core', 'contributes embodiment to', 'integration'],
  ['unity-core', 'return', 'completes its cycle through', 'integration'],
]

const node = (seed: SeedNode): TheoryNode => ({
  id: seed.id,
  slug: seed.id,
  type: seed.type ?? 'concept',
  title: seed.title,
  essence: seed.essence,
  bodyMarkdown: seed.body ?? '',
  aliases: [],
  facets: {
    portals: seed.portals ?? [],
    forms: seed.forms ?? [],
    phases: seed.phases ?? [],
    scales: [],
    topics: seed.topics ?? [],
  },
  epistemics: {
    maturity: seed.id === 'unity-core' ? 'integrated' : 'articulated',
    stance: 'provisional',
    confidence: 'unknown',
    knowledgeModes: seed.type === 'practice' ? ['design'] : ['speculative'],
  },
  sources: [],
  mirror: seed.id === 'ghost-mirror' ? {
    directExperience: 'Living impulse, embodied vitality and authored desire.',
    representation: 'The self-image, social role or material proxy that originally reflected the living source.',
    primalValue: 'Sovereignty over one’s own creative direction.',
    inversionRisk: 'The reflection becomes the governor of the source.',
    falsifier: 'A proxy that consistently expands rather than narrows authored agency would resist the inversion claim.',
    restoringAction: 'Reconnect representation to a chosen embodied act and test whether agency increases.',
  } : undefined,
  provenance: {
    origin: 'ai-proposed', createdBy: 'OpenAI research synthesis', createdAt: CREATED,
    updatedBy: 'OpenAI research synthesis', updatedAt: CREATED, derivedFrom: [],
  },
})

const edge = ([from, to, relation, family, rationale]: SeedEdge, index: number): TheoryEdge => ({
  id: `edge-${index + 1}`,
  from,
  to,
  relation,
  family,
  rationale: rationale ?? '',
  status: 'proposed',
  evidenceIds: [],
  provenance: {
    origin: 'ai-proposed', createdBy: 'OpenAI research synthesis', createdAt: CREATED,
    updatedBy: 'OpenAI research synthesis', updatedAt: CREATED, derivedFrom: [],
  },
})

const positions = (entries: Array<[string, number, number]>) =>
  Object.fromEntries(entries.map(([id, x, y]) => [id, { x, y, pinned: true, updatedAt: CREATED }]))

const allNodeIds = seedNodes.map(({ id }) => id)

const wholeViewPositions = positions([
  ['unity-core', 0, 0], ['ether', 0, -700], ['compression', -240, -410], ['synthesis', 0, -430], ['realisation', 250, -410], ['return', 420, -690],
  ['dream-maker', -930, -240], ['dream-machine', -120, 600], ['dream-world', 930, -240],
  ['consciousness-forms', -900, 100], ['relational-forms', -130, 930], ['strategic-forms', 890, 100],
  ['primality', -1330, -410], ['agency', -1260, -80], ['sovereignty', -1280, 250], ['imagination', -1000, -600],
  ['inner-light', -1630, -160], ['creative-freedom', -760, 380], ['wisdom', -500, 690], ['embodied-awareness', 1120, 430],
  ['ghost-mirror', -650, -780], ['material-inversion', -1050, -900], ['domestication', -1340, -720], ['ghost-essay', -520, -1080],
  ['become', -930, 720], ['relational-training', -160, 1240], ['action-cycle', 850, 760], ['unity-forge', 240, 500],
  ['mirror-test', -520, -460], ['reality-bridge', 620, 400], ['question-unification', 420, -120], ['tension-freedom-constraint', 1280, -560],
])

const makeView = (
  id: string,
  title: string,
  focusQuestion: string,
  includedNodeIds: string[],
  positionEntries: Array<[string, number, number]>,
  description: string,
): TheoryView => ({
  id, title, focusQuestion, description, includedNodeIds,
  positions: positions(positionEntries),
  collapsedClusters: [],
  visibleEdgeFamilies: ['structure', 'dynamics', 'reasoning', 'correspondence', 'integration', 'provenance'],
})

export const SEED_DOCUMENT: TheoryDocument = {
  schemaVersion: 1,
  meta: {
    id: 'dream-unity-theory',
    title: 'Dream Unity',
    subtitle: 'A living map from ether to embodiment and back again',
    repository: 'dream-unity/theory',
    branch: 'theory-live',
    dataPath: 'public/data/theory.json',
    revision: 1,
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  nodes: seedNodes.map(node),
  edges: seedEdges.map(edge),
  views: [
    {
      id: 'whole-theory', title: 'Whole Theory',
      description: 'The stable canonical landscape. Existing landmarks never move unless you move them.',
      focusQuestion: 'How does Dream Unity carry potential into embodied unity and return?',
      rootNodeId: 'unity-core', includedNodeIds: allNodeIds, positions: wholeViewPositions,
      collapsedClusters: [],
      visibleEdgeFamilies: ['structure', 'dynamics', 'reasoning', 'correspondence', 'integration', 'provenance'],
    },
    makeView('unity-cycle', 'Unity Cycle', 'What is preserved as a dream moves from ether through realisation and returns?',
      ['ether', 'imagination', 'consciousness-forms', 'compression', 'relational-forms', 'synthesis', 'strategic-forms', 'realisation', 'return', 'unity-core', 'question-unification'],
      [['ether', -900, 0], ['imagination', -600, -220], ['consciousness-forms', -600, 220], ['compression', -280, -220], ['relational-forms', -280, 220], ['synthesis', 40, -220], ['strategic-forms', 40, 220], ['realisation', 360, -220], ['return', 680, 0], ['unity-core', 360, 220], ['question-unification', 40, -520]],
      'A process view of the core transformation cycle.'),
    makeView('mirror-freedom', 'Mirror & Freedom', 'Where can representation invert and begin governing primal agency?',
      ['ghost-essay', 'ghost-mirror', 'material-inversion', 'domestication', 'primality', 'inner-light', 'agency', 'sovereignty', 'creative-freedom', 'wisdom', 'embodied-awareness', 'mirror-test', 'tension-freedom-constraint'],
      [['ghost-essay', -700, -500], ['material-inversion', -700, -100], ['ghost-mirror', -340, -100], ['domestication', 20, -100], ['primality', 380, -100], ['inner-light', 380, -470], ['agency', 740, -100], ['sovereignty', 1100, -100], ['creative-freedom', 740, 300], ['wisdom', 1100, 300], ['embodied-awareness', 380, 300], ['mirror-test', -340, 300], ['tension-freedom-constraint', 20, 300]],
      'A diagnostic view of reflection, inversion, vitality and recovered authorship.'),
    makeView('three-forms', 'Three Forms', 'How do consciousness, relation and strategy become one embodied intelligence?',
      ['consciousness-forms', 'relational-forms', 'strategic-forms', 'dream-maker', 'dream-machine', 'dream-world', 'unity-core', 'become', 'relational-training', 'action-cycle'],
      [['unity-core', 0, 0], ['consciousness-forms', -650, -250], ['relational-forms', 0, 560], ['strategic-forms', 650, -250], ['dream-maker', -1050, -250], ['dream-machine', 0, 920], ['dream-world', 1050, -250], ['become', -650, 160], ['relational-training', -360, 560], ['action-cycle', 650, 160]],
      'The established three-stage development framework.'),
    makeView('realisation-lab', 'Realisation Lab', 'Which theories have crossed into practices, tests, artifacts and observable consequences?',
      ['unity-core', 'become', 'relational-training', 'action-cycle', 'unity-forge', 'mirror-test', 'reality-bridge', 'realisation', 'embodied-awareness', 'creative-freedom'],
      [['unity-core', 0, -450], ['unity-forge', -750, -50], ['mirror-test', -380, -50], ['reality-bridge', 0, -50], ['become', 380, -50], ['relational-training', 760, -50], ['action-cycle', 1140, -50], ['realisation', 0, 400], ['embodied-awareness', 380, 400], ['creative-freedom', 760, 400]],
      'Practices and bridges that force theory to meet physical reality.'),
  ],
  tombstones: [],
}
