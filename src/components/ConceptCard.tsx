import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { Concept, Quadrant } from '../types'
import { KIND_LABEL, QUADRANT_META, maturityLabel } from '../types'

export type ConceptNodeData = {
  concept: Concept
  selected: boolean
  editing: boolean
  onChangeNotes: (id: string, notes: string) => void
  onChangeTitle: (id: string, title: string) => void
  onOpenDossier: (id: string) => void
}

export type ConceptFlowNode = Node<ConceptNodeData, 'concept'>

export function ConceptCard({ data, selected }: NodeProps<ConceptFlowNode>) {
  const { concept, editing, onChangeNotes, onChangeTitle, onOpenDossier } = data
  const meta = QUADRANT_META[concept.quadrant]
  const isCore = concept.kind === 'core'
  const ring = 2 * Math.PI * 16
  const progress = Math.max(0, Math.min(10, concept.maturity)) / 10

  return (
    <article
      className={`concept-card q-${concept.quadrant} ${isCore ? 'is-core' : ''} ${selected ? 'is-selected' : ''}`}
      style={{ ['--accent' as string]: meta.accent, ['--soft' as string]: meta.soft, ['--ink' as string]: meta.ink }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onOpenDossier(concept.id)
      }}
    >
      <Handle type="target" position={Position.Left} className="port" />
      <Handle type="target" position={Position.Top} className="port" />
      <Handle type="source" position={Position.Right} className="port" />
      <Handle type="source" position={Position.Bottom} className="port" />

      <header className="card-head">
        {editing ? (
          <input
            className="card-title-input"
            value={concept.title}
            onChange={(event) => onChangeTitle(concept.id, event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <h3>{concept.title}</h3>
        )}
        <span className="kind-pill">{KIND_LABEL[concept.kind]}</span>
      </header>

      {editing ? (
        <textarea
          className="card-notes"
          value={concept.notes}
          placeholder="Type the note inside the card"
          onChange={(event) => onChangeNotes(concept.id, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        />
      ) : (
        <p className="card-essence">{concept.essence}</p>
      )}

      <footer className="card-foot">
        <button type="button" className="caret" onClick={() => onOpenDossier(concept.id)} aria-label="Open dossier">
          ^
        </button>
        <span className="maturity-wrap" title={maturityLabel(concept.maturity)}>
          <svg viewBox="0 0 40 40" className="maturity-ring">
            <circle cx="20" cy="20" r="16" className="ring-track" />
            <circle
              cx="20"
              cy="20"
              r="16"
              className="ring-value"
              strokeDasharray={`${ring * progress} ${ring}`}
              transform="rotate(-90 20 20)"
            />
          </svg>
          {isCore ? <em>{concept.maturity}</em> : null}
        </span>
      </footer>
    </article>
  )
}

export function quadrantClass(quadrant: Quadrant): string {
  return `q-${quadrant}`
}
