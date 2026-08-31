import { memo, useEffect, useRef } from 'react'
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

export type ConceptCardData = {
  title: string
  type: TheoryNode['type']
  essence: string
  portal: Portal | 'ether'
  portals: Portal[]
  stance: TheoryNode['epistemics']['stance']
  maturity: TheoryNode['epistemics']['maturity']
  dimmed: boolean
  relationCount: number
  isCore: boolean
  editing: boolean
}

export type ConceptFlowNode = Node<ConceptCardData, 'concept'>

const portalColors: Record<Portal, string> = {
  maker: 'var(--maker)',
  machine: 'var(--machine)',
  world: 'var(--world)',
  unity: 'var(--unity)',
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

function ConceptNodeComponent({ id, data, selected }: NodeProps<ConceptFlowNode>) {
  const { title, type, portal, portals, stance, maturity, dimmed, relationCount, isCore, editing } = data
  const Icon = isCore ? Gem : icons[type]
  const inputRef = useRef<HTMLInputElement>(null)
  const progress = Math.round((maturityIndex[maturity] / 7) * 360)
  const portalGradient = portals.length > 1
    ? `linear-gradient(90deg, ${portals.map((item, index) => `${portalColors[item]} ${(index * 100) / portals.length}% ${((index + 1) * 100) / portals.length}%`).join(', ')})`
    : portals[0] ? portalColors[portals[0]] : '#82939e'

  useEffect(() => {
    if (!editing || !inputRef.current) return
    inputRef.current.focus()
    inputRef.current.select()
  }, [editing])

  const commit = (value: string) => {
    const next = value.trim()
    window.dispatchEvent(new CustomEvent('theory-rename', { detail: { id, title: next || title || 'New idea' } }))
  }

  return (
    <article
      className={`concept-node portal-${portal} type-${type} ${isCore ? 'unity-node' : ''} ${portals.length > 1 ? 'is-multi-portal' : ''} ${dimmed ? 'is-dimmed' : ''} ${selected ? 'is-selected' : ''} ${editing ? 'is-editing' : ''}`}
      style={{ '--maturity-angle': `${progress}deg` } as React.CSSProperties}
      aria-label={`${title}, ${type}, ${maturity}, ${relationCount} relationships`}
      data-testid={`node-${id}`}
    >
      <Handle type="target" position={Position.Top} id="top" className="concept-handle" aria-label={`Connect into ${title}`} />
      <Handle type="source" position={Position.Right} id="right" className="concept-handle" aria-label={`Connect from ${title} right`} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="concept-handle" aria-label={`Connect from ${title}`} />
      <Handle type="target" position={Position.Left} id="left" className="concept-handle" aria-label={`Connect into ${title} left`} />
      <span className="node-portal-bar" aria-hidden="true" style={{ background: portalGradient }} />
      <div className="node-maturity" aria-hidden="true" />
      <header className="node-heading">
        <span className="node-icon" aria-hidden="true"><Icon size={15} strokeWidth={1.8} /></span>
        <span className="node-kind">{type}</span>
        {portals.length > 1 && (
          <span className="node-portal-dots" aria-hidden="true">
            {portals.map((item) => <span key={item} style={{ background: portalColors[item] }} />)}
          </span>
        )}
        {stance === 'contested' && <span className="node-state contested">contested</span>}
        {stance === 'archived' && <span className="node-state archived">returned</span>}
        <span className="node-rel-count" title={`${relationCount} relationships`}>{relationCount}</span>
      </header>
      {editing ? (
        <input
          ref={inputRef}
          className="node-title-input nodrag nopan"
          defaultValue={title === 'New idea' ? '' : title}
          placeholder="Name this idea"
          aria-label="Idea title"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              commit(event.currentTarget.value)
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              window.dispatchEvent(new CustomEvent('theory-rename', { detail: { id, title } }))
            }
          }}
          onBlur={(event) => commit(event.currentTarget.value)}
        />
      ) : (
        <h3>{title}</h3>
      )}
    </article>
  )
}

function conceptNodePropsEqual(previous: NodeProps<ConceptFlowNode>, next: NodeProps<ConceptFlowNode>) {
  const left = previous.data
  const right = next.data
  return previous.selected === next.selected &&
    left.title === right.title &&
    left.type === right.type &&
    left.portal === right.portal &&
    left.stance === right.stance &&
    left.maturity === right.maturity &&
    left.dimmed === right.dimmed &&
    left.relationCount === right.relationCount &&
    left.isCore === right.isCore &&
    left.editing === right.editing &&
    left.portals === right.portals
}

export const ConceptNode = memo(ConceptNodeComponent, conceptNodePropsEqual)
