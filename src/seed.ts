import type { AtlasDocument, Concept, Kind, Quadrant, AtlasView, Form, Phase, Stance } from './types'

const stamp = '2026-08-31T12:00:00.000Z'

function mirror(identity: string, intention: string, paradox: string) {
  return {
    identity,
    intention,
    coreParadox: paradox,
    inversionRisk: 'The form hardens into a slogan and stops doing work.',
    falsifier: 'Lived practice no longer produces the named quality.',
    restoringAction: 'Return the claim to a concrete act and watch what happens.',
  }
}

function practice(methods: string) {
  return {
    methods,
    experiments: 'Name one small act that would make this real this week.',
    habits: 'Review the note after contact with the world, not before.',
  }
}

function card(
  id: string,
  title: string,
  kind: Kind,
  quadrant: Quadrant,
  essence: string,
  extra: Partial<Concept> = {},
): Concept {
  return {
    id,
    title,
    kind,
    quadrant,
    essence,
    notes: extra.notes ?? essence,
    portals: extra.portals ?? [quadrant],
    forms: extra.forms ?? (['consciousness'] as Form[]),
    phase: extra.phase ?? ('formation' as Phase),
    stance: extra.stance ?? ('provisional' as Stance),
    maturity: extra.maturity ?? 6,
    tags: extra.tags ?? ['portal'],
    fileUnder: extra.fileUnder ?? `${quadrant} / ${kind} / ${title}`,
    sources: extra.sources ?? [{ id: 's4', kind: 'text', title: 'The Field and the Form', locator: 'text' }],
    mirror: extra.mirror ?? mirror(title, essence, 'Form without world becomes slogan'),
    practice: extra.practice ?? practice(essence),
    views: extra.views ?? (['whole-theory'] as AtlasView[]),
    inbox: extra.inbox,
  }
}

const concepts: Concept[] = [
  card('unity-core', 'Unity Core', 'core', 'unity',
    'The coherent convergence of maker, machine, and world.\nThe generative ground and telos of the whole theory.', {
      notes: 'The coherent convergence of maker, machine, and world.\nThe generative ground and telos of the whole theory.\n\nUnity is not a fourth object placed beside the others. It is the field in which maker, machine, and world stop contradicting one another long enough to generate a world worth inhabiting.',
      portals: ['maker', 'machine', 'world', 'unity'],
      forms: ['consciousness', 'relational', 'strategic'],
      phase: 'synthesis',
      maturity: 9,
      tags: ['generative', 'coherence', 'first-principles', 'telos'],
      fileUnder: 'Unity / Principles / Coherence',
      sources: [
        { id: 's1', kind: 'paper', title: 'B. Chen — Generative Coherence (2031)', locator: 'paper' },
        { id: 's2', kind: 'journal', title: 'A. N. Systems Research · Vol. 17', locator: 'journal' },
        { id: 's3', kind: 'transcript', title: 'Field Dialogue Transcripts · 2030-Q4', locator: 'transcript' },
      ],
      views: ['whole-theory', 'mirror-freedom', 'three-forms', 'realisation-lab'],
    }),
  card('intention', 'Intention', 'facet', 'maker', 'Directed attention and generative purpose.', { phase: 'formation', stance: 'adopted', maturity: 7, tags: ['portal', 'attention'], views: ['whole-theory', 'three-forms'] }),
  card('craft', 'Craft', 'facet', 'maker', 'Skill, method, and the shaping of possibility.', { forms: ['strategic'], phase: 'realisation', stance: 'adopted', maturity: 8, tags: ['portal', 'method'], views: ['whole-theory', 'realisation-lab'] }),
  card('insight', 'Insight', 'facet', 'maker', 'Pattern recognition and the spark of understanding.', { phase: 'compression', maturity: 6, tags: ['portal', 'pattern'], views: ['whole-theory', 'mirror-freedom'] }),
  card('model', 'Model', 'form', 'machine', 'Abstract structure and predictive representation.', { forms: ['relational'], phase: 'compression', tags: ['form', 'structure'], views: ['whole-theory', 'three-forms'] }),
  card('engine', 'Engine', 'form', 'machine', 'Computation, process, and execution.', { forms: ['strategic'], phase: 'realisation', stance: 'adopted', tags: ['form', 'process'], views: ['whole-theory', 'realisation-lab'] }),
  card('tool', 'Tool', 'form', 'machine', 'Instrument and interface for application.', { portals: ['machine', 'maker'], forms: ['strategic'], phase: 'realisation', stance: 'adopted', tags: ['form', 'interface'], views: ['whole-theory', 'realisation-lab'] }),
  card('context', 'Context', 'field', 'world', 'Environment, culture, and lived condition.', { forms: ['relational'], stance: 'adopted', maturity: 7, tags: ['portal', 'environment'], views: ['whole-theory', 'three-forms'] }),
  card('system', 'System', 'field', 'world', 'Networks, ecologies, and interrelated dynamics.', { portals: ['world', 'machine'], forms: ['relational'], phase: 'synthesis', tags: ['portal', 'network'], views: ['whole-theory', 'three-forms'] }),
  card('impact', 'Impact', 'field', 'world', 'Consequence, value, and legacy.', { forms: ['strategic'], phase: 'reflection', maturity: 5, tags: ['portal', 'consequence'], views: ['whole-theory', 'realisation-lab'] }),
  card('coherence', 'Coherence', 'principle', 'unity', 'Internal alignment and non-contradiction.', { phase: 'synthesis', stance: 'adopted', maturity: 8, tags: ['stance', 'alignment'], views: ['whole-theory', 'mirror-freedom', 'three-forms'] }),
  card('resonance', 'Resonance', 'principle', 'unity', 'Deep agreement across forms and fields.', { portals: ['unity', 'maker', 'world'], forms: ['relational'], phase: 'synthesis', tags: ['stance', 'agreement'], views: ['whole-theory', 'mirror-freedom'] }),
  card('transcendence', 'Transcendence', 'principle', 'unity', 'Beyond parts. The whole as generative one.', { phase: 'reflection', tags: ['stance', 'whole'], views: ['whole-theory', 'mirror-freedom'] }),
  card('creative-freedom', 'Creative Freedom', 'principle', 'maker',
    'Freedom is not the absence of constraint, but the presence of aligned possibility.', {
      notes: 'Creative freedom is not the absence of constraint, but the presence of aligned possibility. It arises when the maker, the world, and the work cohere into a generative field.\n\nThis coherence does not guarantee ease-rather, it makes difficulty meaningful. Constraints become sculptural. Choices become expressive.\n\nI am testing this as a working lens. Still provisional.',
      portals: ['maker', 'world'],
      phase: 'synthesis',
      maturity: 8,
      tags: ['stance', 'freedom', 'constraint'],
      fileUnder: 'Maker / World / Freedom',
      views: ['inbox', 'mirror-freedom', 'whole-theory'],
      inbox: true,
    }),
  card('expressive-constraints', 'Expressive Constraints', 'tension', 'maker', 'Tension as structure', { portals: ['maker', 'world'], forms: ['strategic'], phase: 'synthesis', tags: ['maturity', 'constraint'], views: ['mirror-freedom', 'inbox'], inbox: true }),
  card('generative-field', 'Generative Field', 'field', 'unity', 'Coherence of maker, world, and work', { portals: ['maker', 'world', 'unity'], forms: ['relational'], phase: 'synthesis', tags: ['form', 'field'], views: ['mirror-freedom', 'three-forms'] }),
  card('sculptural-difficulty', 'Sculptural Difficulty', 'tension', 'maker', 'Meaningful resistance', { forms: ['strategic'], phase: 'realisation', tags: ['maturity', 'resistance'], views: ['mirror-freedom', 'realisation-lab', 'inbox'], inbox: true }),
  card('authorship-without-control', 'Authorship without Control', 'principle', 'maker', 'Letting the work speak', { phase: 'reflection', tags: ['stance', 'authorship'], views: ['mirror-freedom'] }),
  card('aligned-possibility', 'Aligned Possibility', 'principle', 'unity', 'Freedom within form', { portals: ['unity', 'maker'], phase: 'synthesis', tags: ['stance', 'possibility'], views: ['mirror-freedom', 'three-forms'] }),
  card('revelation-through-making', 'Revelation through Making', 'practice', 'maker', 'What wants to be expressed', { portals: ['maker', 'world'], phase: 'realisation', stance: 'adopted', tags: ['stance', 'making'], views: ['mirror-freedom', 'realisation-lab'] }),
]

export const SEED: AtlasDocument = {
  schemaVersion: 2,
  revision: 1,
  updatedAt: stamp,
  concepts,
  relations: [
    { id: 'e1', from: 'intention', to: 'craft', verb: 'enables' },
    { id: 'e2', from: 'intention', to: 'insight', verb: 'shapes' },
    { id: 'e3', from: 'insight', to: 'unity-core', verb: 'synthesises into' },
    { id: 'e4', from: 'craft', to: 'unity-core', verb: 'shapes' },
    { id: 'e5', from: 'model', to: 'unity-core', verb: 'grounds' },
    { id: 'e6', from: 'model', to: 'engine', verb: 'drives' },
    { id: 'e7', from: 'engine', to: 'tool', verb: 'grounds' },
    { id: 'e8', from: 'unity-core', to: 'tool', verb: 'realises as' },
    { id: 'e9', from: 'context', to: 'unity-core', verb: 'grounds' },
    { id: 'e10', from: 'context', to: 'system', verb: 'grounds' },
    { id: 'e11', from: 'system', to: 'impact', verb: 'sustains' },
    { id: 'e12', from: 'impact', to: 'unity-core', verb: 'synthesises into' },
    { id: 'e13', from: 'resonance', to: 'unity-core', verb: 'synthesises as' },
    { id: 'e14', from: 'coherence', to: 'unity-core', verb: 'enables' },
    { id: 'e15', from: 'resonance', to: 'transcendence', verb: 'attunes' },
    { id: 'e16', from: 'transcendence', to: 'unity-core', verb: 'integrates' },
    { id: 'e17', from: 'expressive-constraints', to: 'creative-freedom', verb: 'structures' },
    { id: 'e18', from: 'generative-field', to: 'creative-freedom', verb: 'hosts' },
    { id: 'e19', from: 'sculptural-difficulty', to: 'creative-freedom', verb: 'tempers' },
    { id: 'e20', from: 'authorship-without-control', to: 'creative-freedom', verb: 'protects' },
    { id: 'e21', from: 'aligned-possibility', to: 'creative-freedom', verb: 'names' },
    { id: 'e22', from: 'revelation-through-making', to: 'creative-freedom', verb: 'discloses' },
    { id: 'e23', from: 'creative-freedom', to: 'unity-core', verb: 'tests' },
  ],
  positions: {
    'unity-core': { x: 486, y: 318 },
    intention: { x: 86, y: 46 },
    craft: { x: 354, y: 46 },
    insight: { x: 86, y: 268 },
    model: { x: 880, y: 46 },
    engine: { x: 1148, y: 46 },
    tool: { x: 1148, y: 268 },
    context: { x: 86, y: 560 },
    system: { x: 86, y: 782 },
    impact: { x: 354, y: 782 },
    coherence: { x: 1148, y: 560 },
    resonance: { x: 880, y: 782 },
    transcendence: { x: 1148, y: 782 },
    'creative-freedom': { x: 486, y: 40 },
    'expressive-constraints': { x: 80, y: 80 },
    'generative-field': { x: 80, y: 300 },
    'sculptural-difficulty': { x: 80, y: 520 },
    'authorship-without-control': { x: 1080, y: 80 },
    'aligned-possibility': { x: 1080, y: 300 },
    'revelation-through-making': { x: 1080, y: 520 },
  },
}

export function createConcept(partial: Partial<Concept> & Pick<Concept, 'title'>): Concept {
  return card(partial.id ?? `c-${Math.random().toString(36).slice(2, 8)}`, partial.title, partial.kind ?? 'facet', partial.quadrant ?? 'maker', partial.essence ?? '', {
    ...partial,
    views: partial.views ?? ['inbox', 'whole-theory'],
    inbox: partial.inbox ?? true,
  })
}
