import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CirclePlus,
  FlaskConical,
  GitBranch,
  Link2,
  RotateCcw,
  ShieldQuestion,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  CONFIDENCE_LEVELS,
  MATURITY_LEVELS,
  NODE_TYPES,
  PHASES,
  PORTALS,
  STANCES,
  type SourceReference,
  type TheoryDocument,
  type TheoryEdge,
  type TheoryNode,
} from '../types'
import { makeId } from '../lib/theory'

type InspectorTab = 'essence' | 'relations' | 'grounding' | 'mirror'

interface InspectorProps {
  document: TheoryDocument
  node: TheoryNode | null
  edge: TheoryEdge | null
  requestedTab?: InspectorTab
  onChangeNode: (node: TheoryNode) => void
  onChangeEdge: (edge: TheoryEdge) => void
  onDeleteEdge: (id: string) => void
  onSelectNode: (id: string) => void
  onClose: () => void
  onArchive: (id: string) => void
  onRealise: (id: string) => void
  onBeginRelation: (from: string, to: string) => void
}

const titleCase = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

/** Keep typing local and commit after a short quiet period so the graph is not rebuilt per keystroke. */
function useBufferedDraft<T>(value: T, onCommit: (value: T) => void) {
  const [draft, setDraft] = useState(value)
  const draftRef = useRef(value)
  const dirtyRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const commitRef = useRef(onCommit)

  useEffect(() => { commitRef.current = onCommit }, [onCommit])

  const flush = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    if (!dirtyRef.current) return
    dirtyRef.current = false
    commitRef.current(draftRef.current)
  }, [])

  const update = useCallback((updater: T | ((current: T) => T)) => {
    setDraft((current) => {
      const next = typeof updater === 'function' ? (updater as (current: T) => T)(current) : updater
      draftRef.current = next
      dirtyRef.current = true
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(flush, 320)
      return next
    })
  }, [flush])

  useEffect(() => {
    if (!dirtyRef.current) {
      draftRef.current = value
      setDraft(value)
    }
  }, [value])

  useEffect(() => () => flush(), [flush])

  return { draft, update, flush }
}

export function Inspector(props: InspectorProps) {
  if (props.edge) {
    return (
      <EdgeInspector
        key={props.edge.id}
        document={props.document}
        edge={props.edge}
        onChange={props.onChangeEdge}
        onDelete={props.onDeleteEdge}
        onSelectNode={props.onSelectNode}
        onClose={props.onClose}
      />
    )
  }
  if (!props.node) return null
  return <NodeInspector key={props.node.id} {...props} node={props.node} />
}

function NodeInspector({
  document,
  node: nodeValue,
  requestedTab,
  onChangeNode,
  onSelectNode,
  onClose,
  onArchive,
  onRealise,
  onBeginRelation,
}: Omit<InspectorProps, 'node' | 'edge'> & { node: TheoryNode }) {
  const { draft: node, update: setNode, flush } = useBufferedDraft(nodeValue, onChangeNode)
  const [tab, setTab] = useState<InspectorTab>(requestedTab ?? 'essence')
  const [relationTargetId, setRelationTargetId] = useState('')

  useEffect(() => { if (requestedTab) setTab(requestedTab) }, [requestedTab])

  const nodeMap = useMemo(() => new Map(document.nodes.map((item) => [item.id, item])), [document.nodes])
  const relations = useMemo(
    () => document.edges.filter((relation) => relation.from === node.id || relation.to === node.id),
    [document.edges, node.id],
  )
  const relationCandidates = useMemo(
    () => document.nodes
      .filter((candidate) => candidate.id !== node.id && candidate.epistemics.stance !== 'archived')
      .sort((left, right) => left.title.localeCompare(right.title)),
    [document.nodes, node.id],
  )

  const update = (patch: Partial<TheoryNode>) => setNode((current) => ({ ...current, ...patch }))
  const updateEpistemics = (patch: Partial<TheoryNode['epistemics']>) =>
    setNode((current) => ({ ...current, epistemics: { ...current.epistemics, ...patch } }))
  const updateFacets = (patch: Partial<TheoryNode['facets']>) =>
    setNode((current) => ({ ...current, facets: { ...current.facets, ...patch } }))
  const updateMirror = (patch: Partial<NonNullable<TheoryNode['mirror']>>) =>
    setNode((current) => ({ ...current, mirror: { ...current.mirror, ...patch } }))

  const togglePortal = (portal: (typeof PORTALS)[number]) => {
    const portals = node.facets.portals.includes(portal)
      ? node.facets.portals.filter((item) => item !== portal)
      : [...node.facets.portals, portal]
    updateFacets({ portals })
  }

  const togglePhase = (phase: (typeof PHASES)[number]) => {
    const phases = node.facets.phases.includes(phase)
      ? node.facets.phases.filter((item) => item !== phase)
      : [...node.facets.phases, phase]
    updateFacets({ phases })
  }

  const addSource = () => {
    const source: SourceReference = { id: makeId('source-ref'), title: 'New source', url: '', locator: '', note: '' }
    setNode((current) => ({ ...current, sources: [...current.sources, source] }))
    setTab('grounding')
  }

  const updateSource = (id: string, patch: Partial<SourceReference>) =>
    setNode((current) => ({ ...current, sources: current.sources.map((source) => source.id === id ? { ...source, ...patch } : source) }))

  return (
    <aside className="inspector" aria-label={`Editor for ${node.title}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) flush()
    }}>
      <header className="inspector-header">
        <div>
          <span className={`inspector-type type-${node.type}`}>{node.type}</span>
          <span className="inspector-id">Editing · saved automatically</span>
        </div>
        <button type="button" className="icon-button" onClick={() => { flush(); onClose() }} aria-label="Close editor"><X size={18} /></button>
      </header>

      <nav className="inspector-tabs" aria-label="Idea details">
        {([
          ['essence', 'Idea'],
          ['relations', 'Links'],
          ['grounding', 'Evidence'],
          ['mirror', 'Test'],
        ] as Array<[InspectorTab, string]>).map(([name, label]) => (
          <button key={name} type="button" className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{label}</button>
        ))}
      </nav>

      <div className="inspector-scroll">
        {tab === 'essence' && (
          <div className="inspector-section-stack">
            <label className="field-label">Title
              <input value={node.title} onChange={(event) => update({ title: event.target.value })} />
            </label>
            <label className="field-label">In one sentence
              <textarea className="essence-input" value={node.essence} onChange={(event) => update({ essence: event.target.value })} rows={3} placeholder="What is this idea at its core?" />
            </label>
            <label className="field-label">Notes <small>Markdown supported</small>
              <textarea className="body-input" value={node.bodyMarkdown} onChange={(event) => update({ bodyMarkdown: event.target.value })} rows={11} placeholder="Definition, implications, tensions, questions…" />
            </label>

            <details className="classification-panel">
              <summary>Classification &amp; status <span>{titleCase(node.type)} · {titleCase(node.epistemics.maturity)}</span></summary>
              <div className="classification-fields">
                <div className="field-row">
                  <label className="field-label">Kind
                    <select value={node.type} onChange={(event) => update({ type: event.target.value as TheoryNode['type'] })}>
                      {NODE_TYPES.map((type) => <option value={type} key={type}>{titleCase(type)}</option>)}
                    </select>
                  </label>
                  <label className="field-label">Maturity
                    <select value={node.epistemics.maturity} onChange={(event) => updateEpistemics({ maturity: event.target.value as TheoryNode['epistemics']['maturity'] })}>
                      {MATURITY_LEVELS.map((level) => <option value={level} key={level}>{titleCase(level)}</option>)}
                    </select>
                  </label>
                </div>
                <div className="field-row">
                  <label className="field-label">Stance
                    <select value={node.epistemics.stance} onChange={(event) => updateEpistemics({ stance: event.target.value as TheoryNode['epistemics']['stance'] })}>
                      {STANCES.map((stance) => <option value={stance} key={stance}>{titleCase(stance)}</option>)}
                    </select>
                  </label>
                  <label className="field-label">Confidence
                    <select value={node.epistemics.confidence} onChange={(event) => updateEpistemics({ confidence: event.target.value as TheoryNode['epistemics']['confidence'] })}>
                      {CONFIDENCE_LEVELS.map((confidence) => <option value={confidence} key={confidence}>{titleCase(confidence)}</option>)}
                    </select>
                  </label>
                </div>
                <fieldset className="chip-fieldset">
                  <legend>Portals</legend>
                  <div>{PORTALS.map((portal) => (
                    <button type="button" key={portal} className={`chip portal-${portal} ${node.facets.portals.includes(portal) ? 'active' : ''}`} onClick={() => togglePortal(portal)} aria-pressed={node.facets.portals.includes(portal)}>{titleCase(portal)}</button>
                  ))}</div>
                </fieldset>
                <fieldset className="chip-fieldset">
                  <legend>Unity phase</legend>
                  <div>{PHASES.map((phase) => (
                    <button type="button" key={phase} className={`chip ${node.facets.phases.includes(phase) ? 'active' : ''}`} onClick={() => togglePhase(phase)} aria-pressed={node.facets.phases.includes(phase)}>{titleCase(phase)}</button>
                  ))}</div>
                </fieldset>
                <label className="field-label">Topics <small>comma separated</small>
                  <input value={node.facets.topics.join(', ')} onChange={(event) => updateFacets({ topics: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
                </label>
              </div>
            </details>
          </div>
        )}

        {tab === 'relations' && (
          <div className="inspector-section-stack">
            <div className="section-intro"><GitBranch size={19} /><div><h3>Connections as sentences</h3><p>Name what one idea does to another so the map remains meaningful.</p></div></div>
            <div className="relation-builder">
              <label className="field-label">Connect to
                <select value={relationTargetId} onChange={(event) => setRelationTargetId(event.target.value)}>
                  <option value="">Choose another idea…</option>
                  {relationCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
                </select>
              </label>
              <button type="button" className="secondary-button" disabled={!relationTargetId} onClick={() => {
                if (!relationTargetId) return
                flush()
                onBeginRelation(node.id, relationTargetId)
                setRelationTargetId('')
              }}><Link2 size={16} /> Connect</button>
            </div>
            {relations.length === 0 && <p className="empty-note">No links yet. Choose an idea above to make the first one.</p>}
            <ul className="relation-list">
              {relations.map((relation) => {
                const outgoing = relation.from === node.id
                const otherId = outgoing ? relation.to : relation.from
                const other = nodeMap.get(otherId)
                return (
                  <li key={relation.id}>
                    <span className="relation-direction" aria-hidden="true">{outgoing ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}</span>
                    <button type="button" onClick={() => other && onSelectNode(other.id)}>{other?.title ?? otherId}</button>
                    <span className="relation-verb">{outgoing ? relation.relation : `← ${relation.relation}`}</span>
                    <small>{relation.status}</small>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {tab === 'grounding' && (
          <div className="inspector-section-stack">
            <div className="section-intro"><BookOpen size={19} /><div><h3>Evidence &amp; origins</h3><p>Record what supports the idea and where the relevant material can be found.</p></div></div>
            {node.sources.map((source, index) => (
              <div className="source-card" key={source.id}>
                <div className="source-number">{index + 1}</div>
                <label className="field-label">Source title<input value={source.title} onChange={(event) => updateSource(source.id, { title: event.target.value })} /></label>
                <label className="field-label">URL<input type="url" value={source.url ?? ''} onChange={(event) => updateSource(source.id, { url: event.target.value })} placeholder="https://…" /></label>
                <label className="field-label">Locator<input value={source.locator ?? ''} onChange={(event) => updateSource(source.id, { locator: event.target.value })} placeholder="Page, section, timestamp…" /></label>
                <button type="button" className="text-button danger" onClick={() => setNode((current) => ({ ...current, sources: current.sources.filter((item) => item.id !== source.id) }))}>Remove source</button>
              </div>
            ))}
            <button type="button" className="secondary-button" onClick={addSource}><CirclePlus size={16} /> Add source</button>
            <label className="field-label">Why this confidence?
              <textarea rows={5} value={node.epistemics.confidenceRationale ?? ''} onChange={(event) => updateEpistemics({ confidenceRationale: event.target.value })} placeholder="What warrants this confidence? What would change it?" />
            </label>
          </div>
        )}

        {tab === 'mirror' && (
          <div className="inspector-section-stack mirror-section">
            <div className="section-intro mirror-intro"><ShieldQuestion size={20} /><div><h3>Reality &amp; Mirror Test</h3><p>Separate lived reality from its representation, then name what could disprove the idea.</p></div></div>
            <label className="field-label">Directly lived or observed<textarea rows={3} value={node.mirror?.directExperience ?? ''} onChange={(event) => updateMirror({ directExperience: event.target.value })} placeholder="What exists before interpretation or proxy?" /></label>
            <label className="field-label">Representation or proxy<textarea rows={3} value={node.mirror?.representation ?? ''} onChange={(event) => updateMirror({ representation: event.target.value })} placeholder="What image, measure, role or concept reflects it?" /></label>
            <label className="field-label">Primal value served<textarea rows={2} value={node.mirror?.primalValue ?? ''} onChange={(event) => updateMirror({ primalValue: event.target.value })} /></label>
            <label className="field-label">Inversion risk<textarea rows={3} value={node.mirror?.inversionRisk ?? ''} onChange={(event) => updateMirror({ inversionRisk: event.target.value })} placeholder="How could the reflection begin governing the source?" /></label>
            <label className="field-label">What would disprove or transform this?<textarea rows={3} value={node.mirror?.falsifier ?? ''} onChange={(event) => updateMirror({ falsifier: event.target.value })} /></label>
            <label className="field-label">Restoring action<textarea rows={3} value={node.mirror?.restoringAction ?? ''} onChange={(event) => updateMirror({ restoringAction: event.target.value })} placeholder="What embodied act returns authorship?" /></label>
          </div>
        )}
      </div>

      <footer className="inspector-actions">
        <button type="button" onClick={() => { flush(); onRealise(node.id) }}><FlaskConical size={16} /> Turn into action</button>
        <button type="button" onClick={() => setTab('mirror')}><Sparkles size={16} /> Test idea</button>
        <button type="button" onClick={() => { flush(); onArchive(node.id) }}><RotateCcw size={16} /> {node.epistemics.stance === 'archived' ? 'Restore' : 'Archive'}</button>
      </footer>
    </aside>
  )
}

function EdgeInspector({
  document,
  edge: edgeValue,
  onChange,
  onDelete,
  onSelectNode,
  onClose,
}: {
  document: TheoryDocument
  edge: TheoryEdge
  onChange: (edge: TheoryEdge) => void
  onDelete: (id: string) => void
  onSelectNode: (id: string) => void
  onClose: () => void
}) {
  const { draft: edge, update: setEdge, flush } = useBufferedDraft(edgeValue, onChange)
  const nodeMap = useMemo(() => new Map(document.nodes.map((node) => [node.id, node])), [document.nodes])
  const source = nodeMap.get(edge.from)
  const target = nodeMap.get(edge.to)
  const proposition = `${source?.title ?? edge.from} — ${edge.relation} → ${target?.title ?? edge.to}`
  const update = (patch: Partial<TheoryEdge>) => setEdge((current) => ({ ...current, ...patch }))

  return (
    <aside className="inspector edge-inspector" aria-label={`Relationship: ${proposition}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) flush()
    }}>
      <header className="inspector-header">
        <div><span className="inspector-type type-edge">Connection</span><span className="inspector-id">saved automatically</span></div>
        <button type="button" className="icon-button" onClick={() => { flush(); onClose() }} aria-label="Close editor"><X size={18} /></button>
      </header>
      <div className="inspector-scroll inspector-section-stack">
        <div className="proposition-card"><Link2 size={19} /><p>{proposition}</p></div>
        <div className="relation-endpoints">
          <button type="button" onClick={() => onSelectNode(edge.from)}>{source?.title ?? edge.from}</button>
          <span>→</span>
          <button type="button" onClick={() => onSelectNode(edge.to)}>{target?.title ?? edge.to}</button>
        </div>
        <label className="field-label">Relationship verb<input value={edge.relation} onChange={(event) => update({ relation: event.target.value })} /></label>
        <div className="field-row">
          <label className="field-label">Family
            <select value={edge.family} onChange={(event) => update({ family: event.target.value as TheoryEdge['family'] })}>
              {['structure', 'dynamics', 'reasoning', 'correspondence', 'integration', 'provenance'].map((family) => <option key={family} value={family}>{titleCase(family)}</option>)}
            </select>
          </label>
          <label className="field-label">Status
            <select value={edge.status} onChange={(event) => update({ status: event.target.value as TheoryEdge['status'] })}>
              {['proposed', 'accepted', 'contested', 'superseded'].map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </select>
          </label>
        </div>
        <label className="field-label">Why does this connection hold?
          <textarea rows={8} value={edge.rationale} onChange={(event) => update({ rationale: event.target.value })} placeholder="State the reasoning, boundaries and known exceptions…" />
        </label>
        <button type="button" className="edge-delete-action" onClick={() => {
          if (window.confirm('Delete this connection? You can still undo the change.')) onDelete(edge.id)
        }}><Trash2 size={16} /> Delete connection</button>
      </div>
    </aside>
  )
}
