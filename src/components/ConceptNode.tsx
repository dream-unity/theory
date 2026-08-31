import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import {
  Atom,
  BookOpen,
  BrainCircuit,
  CircleHelp,
  FlaskConical,
  Gem,
  GitMerge,
  Lightbulb,
  Network,
  Quote,
  Scale,
  Sparkles,
} from 'lucide-react'
import type { TheoryNode } from '../types'

export type ConceptFlowNode = Node<{
  concept: TheoryNode
  zoom: number
  dimmed: boolean
  relationCount: number
}, 'concept'>

const icons = {
  concept: Lightbulb,
  claim: Quote,
  mechanism: BrainCircuit,
  model: Network,
  synthesis: GitMerge,
  practice: FlaskConical,
  evidence: Scale,
  source: BookOpen,
  question: CircleHelp,
  tension: Atom,
  example: Sparkles,
  document: BookOpen,
} as const

const maturityIndex = {
  seed: 1,
  articulated: 2,
  connected: 3,
  challenged: 4,
  grounded: 5,
  realised: 6,
  integrated: 7,
}

function ConceptNodeComponent({ data, selected }: NodeProps<ConceptFlowNode>) {
  const { concept, zoom, dimmed, relationCount } = data
  const Icon = concept.id === 'unity-core' ? Gem : icons[concept.type]
  const portal = concept.facets.portals[0] ?? 'ether'
  const detail = zoom >= 0.72
  const dossier = zoom >= 1.12
  const progress = Math.round((maturityIndex[concept.epistemics.maturity] / 7) * 360)
  const phase = concept.facets.phases[0] ?? 'ether'

  return (
    <article
      className={`concept-node portal-${portal} type-${concept.type} ${concept.id === 'unity-core' ? 'unity-node' : ''} ${dimmed ? 'is-dimmed' : ''} ${selected ? 'is-selected' : ''}`}
      style={{ '--maturity-angle': `${progress}deg` } as React.CSSProperties}
      aria-label={`${concept.title}, ${concept.type}, ${concept.epistemics.maturity}, ${relationCount} relationships`}
      data-testid={`node-${concept.id}`}
    >
      <Handle type="target" position={Position.Top} className="concept-handle" aria-label={`Connect into ${concept.title}`} />
      <div className="node-maturity" aria-hidden="true" />
      <header className="node-heading">
        <span className="node-icon" aria-hidden="true"><Icon size={15} strokeWidth={1.8} /></span>
        <span className="node-kind">{concept.type}</span>
        {concept.epistemics.stance === 'contested' && <span className="node-state contested">contested</span>}
        {concept.epistemics.stance === 'archived' && <span className="node-state archived">returned</span>}
      </header>
      <h3>{concept.title}</h3>
      {detail && concept.essence && <p>{concept.essence}</p>}
      {dossier && (
        <footer>
          <span>{phase}</span>
          <span>{relationCount} {relationCount === 1 ? 'relation' : 'relations'}</span>
        </footer>
      )}
      <Handle type="source" position={Position.Bottom} className="concept-handle" aria-label={`Connect from ${concept.title}`} />
    </article>
  )
}

export const ConceptNode = memo(ConceptNodeComponent)
