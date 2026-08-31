import { useEffect, useState } from 'react'
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
  onSelectNode: (id: string) => void
  onClose: () => void
  onArchive: (id: string) => void
  onRealise: (id: string) => void
}

const titleCase = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function Inspector({
  document,
  node,
  edge,
  requestedTab,
  onChangeNode,
  onChangeEdge,
  onSelectNode,
  onClose,
  onArchive,
  onRealise,
}: InspectorProps) {
  const [tab, setTab] = useState<InspectorTab>(requestedTab ?? 'essence')
  useEffect(() => { if (requestedTab) setTab(requestedTab) }, [requestedTab])
  useEffect(() => { if (node) setTab(requestedTab ?? 'essence') }, [node?.id, requestedTab])

  if (edge) {
    return <EdgeInspector document={document} edge={edge} onChange={onChangeEdge} onSelectNode={onSelectNode} onClose={onClose} />
  }

  if (!node) {
    return (
      <aside className="inspector inspector-empty" aria-label="Theory inspector">
        <div className="empty-symbol" aria-hidden="true"><GitBranch size={26} /></div>
        <h2>Follow a thought</h2>
        <p>Select a concept to edit its essence, inspect its propositions, test its grounding, or hold it to the Mirror.</p>
        <div className="empty-shortcuts">
          <span><kbd>N</kbd> capture a seed</span>
          <span><kbd>F</kbd> focus relations</span>
          <span><kbd>M</kbd> open Mirror</span>
        </div>
      </aside>
    )
  }

  const update = (patch: Partial<TheoryNode>) => onChangeNode({ ...node, ...patch })
  const updateEpistemics = (patch: Partial<TheoryNode['epistemics']>) =>
    update({ epistemics: { ...node.epistemics, ...patch } })
  const updateFacets = (patch: Partial<TheoryNode['facets']>) =>
    update({ facets: { ...node.facets, ...patch } })
  const updateMirror = (patch: Partial<NonNullable<TheoryNode['mirror']>>) =>
    update({ mirror: { ...node.mirror, ...patch } })

  const relations = document.edges.filter((relation) => relation.from === node.id || relation.to === node.id)

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
    update({ sources: [...node.sources, source] })
    setTab('grounding')
  }

  const updateSource = (id: string, patch: Partial<SourceReference>) =>
    update({ sources: node.sources.map((source) => source.id === id ? { ...source, ...patch } : source) })

  return (
    <aside className="inspector" aria-label={`Inspector for ${node.title}`}>
      <header className="inspector-header">
        <div>
          <span className={`inspector-type type-${node.type}`}>{node.type}</span>
          <span className="inspector-id">{node.slug}</span>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close inspector"><X size={17} /></button>
      </header>

      <nav className="inspector-tabs" aria-label="Concept details">
        {(['essence', 'relations', 'grounding', 'mirror'] as InspectorTab[]).map((name) => (
          <button key={name} type="button" className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
            {name === 'mirror' ? 'Mirror' : titleCase(name)}
          </button>
        ))}
      </nav>

      <div className="inspector-scroll">
        {tab === 'essence' && (
          <div className="inspector-section-stack">
            <label className="field-label">Title
              <input value={node.title} onChange={(event) => update({ title: event.target.value })} />
            </label>
            <label className="field-label">One-sentence essence
              <textarea className="essence-input" value={node.essence} onChange={(event) => update({ essence: event.target.value })} rows={4} placeholder="What is this, at its irreducible core?" />
            </label>
            <label className="field-label">Full theory note <small>Markdown</small>
              <textarea className="body-input" value={node.bodyMarkdown} onChange={(event) => update({ bodyMarkdown: event.target.value })} rows={10} placeholder="Definition, scope, implications, tensions…" />
            </label>
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
                <button type="button" key={portal} className={`chip portal-${portal} ${node.facets.portals.includes(portal) ? 'active' : ''}`} onClick={() => togglePortal(portal)} aria-pressed={node.facets.portals.includes(portal)}>
                  {titleCase(portal)}
                </button>
              ))}</div>
            </fieldset>
            <fieldset className="chip-fieldset">
              <legend>Unity phase</legend>
              <div>{PHASES.map((phase) => (
                <button type="button" key={phase} className={`chip ${node.facets.phases.includes(phase) ? 'active' : ''}`} onClick={() => togglePhase(phase)} aria-pressed={node.facets.phases.includes(phase)}>
                  {titleCase(phase)}
                </button>
              ))}</div>
            </fieldset>
            <label className="field-label">Topics <small>comma separated</small>
              <input value={node.facets.topics.join(', ')} onChange={(event) => updateFacets({ topics: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
            </label>
          </div>
        )}

        {tab === 'relations' && (
          <div className="inspector-section-stack">
            <div className="section-intro"><GitBranch size={18} /><div><h3>Readable propositions</h3><p>Every line should state a relationship, not merely imply association.</p></div></div>
            {relations.length === 0 && <p className="empty-note">This idea is still an orphan. Drag from its connection handle to another idea.</p>}
            <ul className="relation-list">
              {relations.map((relation) => {
                const outgoing = relation.from === node.id
                const otherId = outgoing ? relation.to : relation.from
                const other = document.nodes.find((item) => item.id === otherId)
                return (
                  <li key={relation.id}>
                    <span className="relation-direction" aria-hidden="true">{outgoing ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}</span>
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
            <div className="section-intro"><BookOpen size={18} /><div><h3>Grounding</h3><p>Record where the idea came from, what bears on it, and exactly where the relevant material can be found.</p></div></div>
            {node.sources.map((source, index) => (
              <div className="source-card" key={source.id}>
                <div className="source-number">{index + 1}</div>
                <label className="field-label">Source title<input value={source.title} onChange={(event) => updateSource(source.id, { title: event.target.value })} /></label>
                <label className="field-label">URL<input type="url" value={source.url ?? ''} onChange={(event) => updateSource(source.id, { url: event.target.value })} placeholder="https://…" /></label>
                <label className="field-label">Locator<input value={source.locator ?? ''} onChange={(event) => updateSource(source.id, { locator: event.target.value })} placeholder="Page, section, timestamp…" /></label>
                <button type="button" className="text-button danger" onClick={() => update({ sources: node.sources.filter((item) => item.id !== source.id) })}>Remove source</button>
              </div>
            ))}
            <button type="button" className="secondary-button" onClick={addSource}><CirclePlus size={15} /> Add source</button>
            <label className="field-label">Confidence rationale
              <textarea rows={5} value={node.epistemics.confidenceRationale ?? ''} onChange={(event) => updateEpistemics({ confidenceRationale: event.target.value })} placeholder="Why is this confidence warranted? What would change it?" />
            </label>
          </div>
        )}

        {tab === 'mirror' && (
          <div className="inspector-section-stack mirror-section">
            <div className="section-intro mirror-intro"><ShieldQuestion size={19} /><div><h3>The Mirror Test</h3><p>Separate the living source from its reflection; then name the inversion and the way back to agency.</p></div></div>
            <label className="field-label">Directly lived or observed
              <textarea rows={3} value={node.mirror?.directExperience ?? ''} onChange={(event) => updateMirror({ directExperience: event.target.value })} placeholder="What exists before interpretation or proxy?" />
            </label>
            <label className="field-label">Representation or proxy
              <textarea rows={3} value={node.mirror?.representation ?? ''} onChange={(event) => updateMirror({ representation: event.target.value })} placeholder="What image, measure, role or concept reflects it?" />
            </label>
            <label className="field-label">Primal value served
              <textarea rows={2} value={node.mirror?.primalValue ?? ''} onChange={(event) => updateMirror({ primalValue: event.target.value })} />
            </label>
            <label className="field-label">Inversion risk
              <textarea rows={3} value={node.mirror?.inversionRisk ?? ''} onChange={(event) => updateMirror({ inversionRisk: event.target.value })} placeholder="How could the reflection begin governing the source?" />
            </label>
            <label className="field-label">What would falsify or transform this?
              <textarea rows={3} value={node.mirror?.falsifier ?? ''} onChange={(event) => updateMirror({ falsifier: event.target.value })} />
            </label>
            <label className="field-label">Restoring action
              <textarea rows={3} value={node.mirror?.restoringAction ?? ''} onChange={(event) => updateMirror({ restoringAction: event.target.value })} placeholder="What embodied act returns authorship?" />
            </label>
          </div>
        )}
      </div>

      <footer className="inspector-actions">
        <button type="button" onClick={() => onRealise(node.id)}><FlaskConical size={15} /> Realise</button>
        <button type="button" onClick={() => setTab('mirror')}><Sparkles size={15} /> Mirror</button>
        <button type="button" onClick={() => onArchive(node.id)} disabled={node.epistemics.stance === 'archived'}><RotateCcw size={15} /> Return</button>
      </footer>
    </aside>
  )
}

function EdgeInspector({
  document,
  edge,
  onChange,
  onSelectNode,
  onClose,
}: {
  document: TheoryDocument
  edge: TheoryEdge
  onChange: (edge: TheoryEdge) => void
  onSelectNode: (id: string) => void
  onClose: () => void
}) {
  const source = document.nodes.find((node) => node.id === edge.from)
  const target = document.nodes.find((node) => node.id === edge.to)
  const proposition = `${source?.title ?? edge.from} — ${edge.relation} → ${target?.title ?? edge.to}`
  return (
    <aside className="inspector edge-inspector" aria-label={`Relationship: ${proposition}`}>
      <header className="inspector-header">
        <div><span className="inspector-type type-edge">relationship</span><span className="inspector-id">{edge.family}</span></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close inspector"><X size={17} /></button>
      </header>
      <div className="inspector-scroll inspector-section-stack">
        <div className="proposition-card"><Link2 size={18} /><p>{proposition}</p></div>
        <div className="relation-endpoints">
          <button type="button" onClick={() => onSelectNode(edge.from)}>{source?.title ?? edge.from}</button>
          <span>→</span>
          <button type="button" onClick={() => onSelectNode(edge.to)}>{target?.title ?? edge.to}</button>
        </div>
        <label className="field-label">Relationship verb
          <input value={edge.relation} onChange={(event) => onChange({ ...edge, relation: event.target.value })} />
        </label>
        <label className="field-label">Family
          <select value={edge.family} onChange={(event) => onChange({ ...edge, family: event.target.value as TheoryEdge['family'] })}>
            {['structure', 'dynamics', 'reasoning', 'correspondence', 'integration', 'provenance'].map((family) => <option key={family} value={family}>{titleCase(family)}</option>)}
          </select>
        </label>
        <label className="field-label">Status
          <select value={edge.status} onChange={(event) => onChange({ ...edge, status: event.target.value as TheoryEdge['status'] })}>
            {['proposed', 'accepted', 'contested', 'superseded'].map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
          </select>
        </label>
        <label className="field-label">Why does this connection hold?
          <textarea rows={8} value={edge.rationale} onChange={(event) => onChange({ ...edge, rationale: event.target.value })} placeholder="State the reasoning, boundary conditions and known exceptions…" />
        </label>
      </div>
    </aside>
  )
}
