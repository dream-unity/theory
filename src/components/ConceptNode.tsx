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
import type { Portal, TheoryNode } from '../types'

export type ConceptDetailTier = 'overview' | 'compact' | 'detail' | 'dossier'

export type ConceptFlowNode = Node<{
  concept: TheoryNode
  detailTier: ConceptDetailTier
  dimmed: boolean
  relationCount: number
}, 'concept'>

const portalColors: Record<Portal, string> = {
  maker: 'var(--maker)',
  machine: 'var(--machine)',
  world: 'var(--world)',
  unity: 'var(--unity)',
}

const portalLabels: Record<Portal, string> = {
  maker: 'Maker',
  machine: 'Machine',
  world: 'World',
  unity: 'Unity',
}

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
  const { concept, detailTier, dimmed, relationCount } = data
  const Icon = concept.id === 'unity-core' ? Gem : icons[concept.type]
  const portals = concept.facets.portals
  const portal = portals[0] ?? 'ether'
  const overview = detailTier === 'overview'
  const detail = detailTier === 'detail' || detailTier === 'dossier'
  const dossier = detailTier === 'dossier'
  const progress = Math.round((maturityIndex[concept.epistemics.maturity] / 7) * 360)
  const phase = concept.facets.phases[0] ?? 'unplaced'
  const portalSummary = portals.length > 0 ? portals.map((item) => portalLabels[item]).join(' · ') : 'Unplaced'
  const portalGradient = portals.length > 1
    ? `linear-gradient(90deg, ${portals.map((item, index) => `${portalColors[item]} ${index * 100 / portals.length}% ${(index + 1) * 100 / portals.length}%`).join(', ')})`
    : portals[0] ? portalColors[portals[0]] : '#82939e'
  const nodeStyle = {
    '--maturity-angle': `${progress}deg`,
    ...(overview ? {
      width: '312px',
      minHeight: '108px',
      padding: '20px 24px',
      borderRadius: '22px',
    } : {}),
  } as React.CSSProperties

  return (
    <article
      className={`concept-node portal-${portal} type-${concept.type} ${concept.id === 'unity-core' ? 'unity-node' : ''} ${portals.length > 1 ? 'is-multi-portal' : ''} ${dimmed ? 'is-dimmed' : ''} ${selected ? 'is-selected' : ''}`}
      style={nodeStyle}
      aria-label={`${concept.title}, ${concept.type}, ${concept.epistemics.maturity}, ${portalSummary}, ${relationCount} relationships`}
      data-testid={`node-${concept.id}`}
    >
      <Handle type="target" position={Position.Top} className="concept-handle" aria-label={`Connect into ${concept.title}`} />
      <span
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: '12%', right: '12%', height: overview ? 5 : 2, borderRadius: '0 0 999px 999px', background: portalGradient }}
      />
      {overview ? (
        <>
          <header className="node-heading" style={{ gap: 13 }}>
            <span className="node-icon" aria-hidden="true" style={{ width: 43, height: 43, borderRadius: 11 }}>
              <Icon size={28} strokeWidth={1.8} />
            </span>
            <span className="node-kind" style={{ fontSize: 15 }}>{concept.type}</span>
          </header>
          <h3 style={{ marginTop: 13, fontSize: 28 }}>{concept.title}</h3>
          <span
            title={`Portals: ${portalSummary}`}
            style={{ display: 'block', marginTop: 11, color: 'var(--muted)', fontSize: 14, letterSpacing: '.08em', textTransform: 'uppercase' }}
          >
            {portalSummary}
          </span>
        </>
      ) : (
        <>
          <div className="node-maturity" aria-hidden="true" />
          <header className="node-heading">
            <span className="node-icon" aria-hidden="true"><Icon size={15} strokeWidth={1.8} /></span>
            <span className="node-kind">{concept.type}</span>
            {portals.length > 1 ? (
              <span
                aria-label={`Portals: ${portalSummary}`}
                title={`Bridge concept · ${portalSummary}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}
              >
                {portals.map((item) => (
                  <span key={item} aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: portalColors[item], boxShadow: '0 0 0 1px rgba(23,32,51,.14)' }} />
                ))}
              </span>
            ) : null}
            {concept.epistemics.stance === 'contested' && <span className="node-state contested">contested</span>}
            {concept.epistemics.stance === 'archived' && <span className="node-state archived">returned</span>}
          </header>
          <h3>{concept.title}</h3>
          {detail && concept.essence ? <p>{concept.essence}</p> : null}
          {dossier ? (
            <footer>
              <span>{phase}</span>
              <span>{relationCount} {relationCount === 1 ? 'relation' : 'relations'}</span>
            </footer>
          ) : null}
        </>
      )}
      <Handle type="source" position={Position.Bottom} className="concept-handle" aria-label={`Connect from ${concept.title}`} />
    </article>
  )
}

function conceptNodePropsEqual(previous: NodeProps<ConceptFlowNode>, next: NodeProps<ConceptFlowNode>) {
  return previous.selected === next.selected &&
    previous.data.concept === next.data.concept &&
    previous.data.detailTier === next.data.detailTier &&
    previous.data.dimmed === next.data.dimmed &&
    previous.data.relationCount === next.data.relationCount
}

export const ConceptNode = memo(ConceptNodeComponent, conceptNodePropsEqual)
