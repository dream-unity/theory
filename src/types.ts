export const PORTALS = ['maker', 'machine', 'world', 'unity'] as const
export const FORMS = ['consciousness', 'relational', 'strategic'] as const
export const PHASES = ['ether', 'formation', 'compression', 'synthesis', 'realisation', 'reflection', 'return'] as const
export const NODE_TYPES = [
  'concept',
  'claim',
  'mechanism',
  'model',
  'synthesis',
  'practice',
  'evidence',
  'source',
  'question',
  'tension',
  'example',
  'document',
] as const
export const MATURITY_LEVELS = ['seed', 'articulated', 'connected', 'challenged', 'grounded', 'realised', 'integrated'] as const
export const STANCES = ['open', 'provisional', 'adopted', 'contested', 'superseded', 'archived'] as const
export const CONFIDENCE_LEVELS = ['unknown', 'low', 'medium', 'high'] as const

export type Portal = (typeof PORTALS)[number]
export type Form = (typeof FORMS)[number]
export type Phase = (typeof PHASES)[number]
export type TheoryNodeType = (typeof NODE_TYPES)[number]
export type Maturity = (typeof MATURITY_LEVELS)[number]
export type Stance = (typeof STANCES)[number]
export type Confidence = (typeof CONFIDENCE_LEVELS)[number]

export type KnowledgeMode =
  | 'empirical'
  | 'logical'
  | 'phenomenological'
  | 'interpretive'
  | 'normative'
  | 'symbolic'
  | 'speculative'
  | 'design'

export interface SourceReference {
  id: string
  title: string
  url?: string
  locator?: string
  note?: string
}

export interface Provenance {
  origin: 'human' | 'source' | 'imported' | 'ai-proposed'
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  derivedFrom: string[]
}

export interface TheoryNode {
  id: string
  slug: string
  type: TheoryNodeType
  title: string
  essence: string
  bodyMarkdown: string
  aliases: string[]
  facets: {
    portals: Portal[]
    forms: Form[]
    phases: Phase[]
    scales: string[]
    topics: string[]
  }
  epistemics: {
    maturity: Maturity
    stance: Stance
    confidence: Confidence
    confidenceRationale?: string
    knowledgeModes: KnowledgeMode[]
    scope?: string
    lastReviewedAt?: string
  }
  sources: SourceReference[]
  mirror?: {
    directExperience?: string
    representation?: string
    primalValue?: string
    inversionRisk?: string
    falsifier?: string
    restoringAction?: string
  }
  provenance: Provenance
}

export type RelationStatus = 'proposed' | 'accepted' | 'contested' | 'superseded'

export interface TheoryEdge {
  id: string
  from: string
  to: string
  relation: string
  rationale: string
  family: 'structure' | 'dynamics' | 'reasoning' | 'correspondence' | 'integration' | 'provenance'
  status: RelationStatus
  confidence?: Exclude<Confidence, 'unknown'>
  evidenceIds: string[]
  provenance: Provenance
}

export interface ViewNodeState {
  x: number
  y: number
  pinned?: boolean
  hidden?: boolean
  updatedAt: string
}

export interface TheoryView {
  id: string
  title: string
  description: string
  focusQuestion: string
  rootNodeId?: string
  includedNodeIds: string[]
  positions: Record<string, ViewNodeState>
  collapsedClusters: string[]
  visibleEdgeFamilies: TheoryEdge['family'][]
  guidedPath?: string[]
}

export interface Tombstone {
  id: string
  entity: 'node' | 'edge' | 'view'
  deletedAt: string
}

export interface TheoryDocument {
  schemaVersion: 1
  meta: {
    id: string
    title: string
    subtitle: string
    repository: string
    branch: string
    dataPath: string
    revision: number
    createdAt: string
    updatedAt: string
  }
  nodes: TheoryNode[]
  edges: TheoryEdge[]
  views: TheoryView[]
  tombstones: Tombstone[]
}

export type SyncState =
  | { kind: 'loading'; label: string }
  | { kind: 'local'; label: string }
  | { kind: 'queued'; label: string }
  | { kind: 'syncing'; label: string }
  | { kind: 'synced'; label: string; at: string }
  | { kind: 'offline'; label: string }
  | { kind: 'conflict'; label: string }
  | { kind: 'error'; label: string }

export interface GithubSession {
  token: string
  login: string
  avatarUrl?: string
  repository: string
  branch: string
  dataPath: string
}

export interface RuntimeConfig {
  repository: string
  branch: string
  dataPath: string
  githubOAuthClientId?: string
}
