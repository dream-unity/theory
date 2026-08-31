export const QUADRANTS = ['maker', 'machine', 'world', 'unity'] as const
export const KINDS = ['core', 'facet', 'form', 'field', 'principle', 'practice', 'tension'] as const
export const PORTALS = ['maker', 'machine', 'world', 'unity'] as const
export const FORMS = ['consciousness', 'relational', 'strategic'] as const
export const PHASES = ['ether', 'formation', 'compression', 'synthesis', 'realisation', 'reflection'] as const
export const STANCES = ['open', 'provisional', 'adopted', 'contested', 'superseded'] as const
export const VIEWS = ['inbox', 'whole-theory', 'mirror-freedom', 'three-forms', 'realisation-lab'] as const
export const DRAWERS = ['essence', 'relations', 'grounding', 'mirror', 'practice'] as const

export type Quadrant = (typeof QUADRANTS)[number]
export type Kind = (typeof KINDS)[number]
export type Portal = (typeof PORTALS)[number]
export type Form = (typeof FORMS)[number]
export type Phase = (typeof PHASES)[number]
export type Stance = (typeof STANCES)[number]
export type AtlasView = (typeof VIEWS)[number]
export type Drawer = (typeof DRAWERS)[number]

export interface SourceRef {
  id: string
  kind: 'paper' | 'journal' | 'transcript' | 'text' | 'video' | 'journal-entry'
  title: string
  locator?: string
}

export interface Mirror {
  identity: string
  intention: string
  coreParadox: string
  inversionRisk: string
  falsifier: string
  restoringAction: string
}

export interface Practice {
  methods: string
  experiments: string
  habits: string
}

export interface Concept {
  id: string
  title: string
  kind: Kind
  quadrant: Quadrant
  essence: string
  notes: string
  portals: Portal[]
  forms: Form[]
  phase: Phase
  stance: Stance
  maturity: number
  tags: string[]
  fileUnder: string
  sources: SourceRef[]
  mirror: Mirror
  practice: Practice
  views: AtlasView[]
  inbox?: boolean
}

export interface Relation {
  id: string
  from: string
  to: string
  verb: string
}

export interface Position {
  x: number
  y: number
}

export interface AtlasDocument {
  schemaVersion: 2
  revision: number
  updatedAt: string
  concepts: Concept[]
  relations: Relation[]
  positions: Record<string, Position>
}

export const KIND_LABEL: Record<Kind, string> = {
  core: 'CORE',
  facet: 'FACET',
  form: 'FORM',
  field: 'FIELD',
  principle: 'PRINCIPLE',
  practice: 'PRACTICE',
  tension: 'TENSION',
}

export const QUADRANT_META: Record<
  Quadrant,
  { label: string; accent: string; soft: string; ink: string }
> = {
  maker: { label: 'MAKER', accent: '#2ee6c5', soft: 'rgba(46, 230, 197, 0.14)', ink: '#8ef6e4' },
  machine: { label: 'MACHINE', accent: '#f0b429', soft: 'rgba(240, 180, 41, 0.14)', ink: '#f7d48a' },
  world: { label: 'WORLD', accent: '#4ade80', soft: 'rgba(74, 222, 128, 0.14)', ink: '#9cf0b6' },
  unity: { label: 'UNITY', accent: '#c084fc', soft: 'rgba(192, 132, 252, 0.16)', ink: '#e0b8ff' },
}

export const VIEW_META: Record<AtlasView, { title: string; version: string; hint: string }> = {
  inbox: { title: 'Inbox', version: 'live', hint: 'Unfiled captures waiting for a drawer' },
  'whole-theory': { title: 'Whole Theory', version: 'v0.8.4', hint: 'Maker · Machine · World · Unity' },
  'mirror-freedom': { title: 'Mirror & Freedom', version: 'v0.7.1', hint: 'Creative freedom and inversion risk' },
  'three-forms': { title: 'Three Forms', version: 'v0.6.3', hint: 'Consciousness · Relational · Strategic' },
  'realisation-lab': { title: 'Realisation Lab', version: 'v0.5.2', hint: 'Practices, experiments, lived tests' },
}

export function maturityLabel(value: number): string {
  if (value >= 9) return 'Highly Coherent'
  if (value >= 7) return 'Articulated'
  if (value >= 5) return 'Connected'
  if (value >= 3) return 'Forming'
  return 'Seed'
}
