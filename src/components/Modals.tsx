import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  Cloud,
  Command,
  ExternalLink,
  FlaskConical,
  GitMerge,
  Github,
  KeyRound,
  Link2,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Waypoints,
  X,
} from 'lucide-react'
import type { GithubSession, RuntimeConfig, TheoryDocument, TheoryEdge, TheoryNode, TheoryNodeType } from '../types'
import { NODE_TYPES } from '../types'
import { beginGithubOAuth, connectWithToken } from '../lib/github'

function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  dismissible = true,
}: {
  title: string
  eyebrow?: string
  children: ReactNode
  onClose?: () => void
  wide?: boolean
  dismissible?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previouslyFocused = globalThis.document.activeElement instanceof HTMLElement ? globalThis.document.activeElement : null
    const autofocusTarget = ref.current?.querySelector<HTMLElement>('[autofocus]')
    ;(autofocusTarget ?? ref.current)?.focus()

    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const openDialogs = globalThis.document.querySelectorAll<HTMLElement>('.modal-card')
      if (openDialogs[openDialogs.length - 1] !== ref.current) return

      if (event.key === 'Escape' && dismissible && onClose) {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !ref.current) return
      const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')

      if (focusable.length === 0) {
        event.preventDefault()
        ref.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = globalThis.document.activeElement
      if (event.shiftKey && (active === first || !ref.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !ref.current.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dismissible, onClose])

  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => { if (dismissible && onClose && event.target === event.currentTarget) onClose() }}>
      <section className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref} data-dismissible={dismissible && Boolean(onClose)}>
        <header className="modal-header">
          <div>{eyebrow && <span>{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
          {dismissible && onClose && <button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>}
        </header>
        {children}
      </section>
    </div>
  )
}

const titleCase = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const quickLinkPresets: Array<{ label: string; family: TheoryEdge['family'] }> = [
  { label: 'inspires', family: 'provenance' },
  { label: 'supports', family: 'reasoning' },
  { label: 'extends into', family: 'structure' },
  { label: 'contrasts with', family: 'correspondence' },
  { label: 'realises as', family: 'integration' },
]

export function NewSeedDialog({
  selectedNode,
  onClose,
  onCreate,
}: {
  selectedNode: TheoryNode | null
  onClose: () => void
  onCreate: (title: string, type: TheoryNodeType, link?: { relation: string; family: TheoryEdge['family'] }) => void
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TheoryNodeType>('concept')
  const [connectToSelected, setConnectToSelected] = useState(Boolean(selectedNode))
  const [relation, setRelation] = useState('inspires')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    const preset = quickLinkPresets.find((item) => item.label === relation) ?? quickLinkPresets[0]
    onCreate(title.trim(), type, selectedNode && connectToSelected ? { relation: preset.label, family: preset.family } : undefined)
  }
  return (
    <Modal title="Add a new idea" eyebrow={selectedNode ? `Near ${selectedNode.title}` : 'Theory inbox'} onClose={onClose}>
      <form onSubmit={submit} className="modal-body form-stack">
        <p className="modal-lead">Capture the thought first. You can deepen its classification later.</p>
        <label className="field-label">Idea
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What idea just appeared?" />
        </label>
        <label className="field-label">Kind
          <select value={type} onChange={(event) => setType(event.target.value as TheoryNodeType)}>
            {NODE_TYPES.map((value) => <option value={value} key={value}>{titleCase(value)}</option>)}
          </select>
        </label>
        {selectedNode && (
          <div className="quick-link-field">
            <label className="check-row">
              <input type="checkbox" checked={connectToSelected} onChange={(event) => setConnectToSelected(event.target.checked)} />
              <span>Connect this idea to <strong>{selectedNode.title}</strong></span>
            </label>
            {connectToSelected && (
              <label className="field-label">Quick relationship
                <select value={relation} onChange={(event) => setRelation(event.target.value)}>
                  {quickLinkPresets.map((item) => <option key={item.label} value={item.label}>{selectedNode.title} → {item.label} → this idea</option>)}
                </select>
              </label>
            )}
          </div>
        )}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Sparkles size={17} /> Add idea</button></div>
      </form>
    </Modal>
  )
}

const relationPresets: Array<{ label: string; family: TheoryEdge['family'] }> = [
  { label: 'contains', family: 'structure' },
  { label: 'defines', family: 'structure' },
  { label: 'enables', family: 'dynamics' },
  { label: 'inhibits', family: 'dynamics' },
  { label: 'transforms into', family: 'dynamics' },
  { label: 'supports', family: 'reasoning' },
  { label: 'challenges', family: 'reasoning' },
  { label: 'tests', family: 'reasoning' },
  { label: 'mirrors', family: 'correspondence' },
  { label: 'inverts', family: 'correspondence' },
  { label: 'contrasts with', family: 'correspondence' },
  { label: 'synthesises', family: 'integration' },
  { label: 'realises as', family: 'integration' },
  { label: 'derived from', family: 'provenance' },
]

export function RelationDialog({ source, target, onClose, onCreate }: { source: TheoryNode; target: TheoryNode; onClose: () => void; onCreate: (relation: string, family: TheoryEdge['family']) => void }) {
  const [relation, setRelation] = useState('enables')
  const [family, setFamily] = useState<TheoryEdge['family']>('dynamics')
  const choosePreset = (label: string, nextFamily: TheoryEdge['family']) => { setRelation(label); setFamily(nextFamily) }
  return (
    <Modal title="Name the relationship" eyebrow="Readable proposition" onClose={onClose}>
      <form className="modal-body form-stack" onSubmit={(event) => { event.preventDefault(); if (relation.trim()) onCreate(relation.trim(), family) }}>
        <div className="proposition-preview"><strong>{source.title}</strong><span>— {relation || '…'} →</span><strong>{target.title}</strong></div>
        <div className="preset-grid">
          {relationPresets.map((preset) => <button type="button" key={preset.label} className={relation === preset.label ? 'active' : ''} onClick={() => choosePreset(preset.label, preset.family)}>{preset.label}</button>)}
        </div>
        <label className="field-label">Custom relationship verb<input autoFocus value={relation} onChange={(event) => setRelation(event.target.value)} /></label>
        <label className="field-label">Relationship family
          <select value={family} onChange={(event) => setFamily(event.target.value as TheoryEdge['family'])}>
            {['structure', 'dynamics', 'reasoning', 'correspondence', 'integration', 'provenance'].map((value) => <option value={value} key={value}>{titleCase(value)}</option>)}
          </select>
        </label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Link2 size={15} /> Create proposition</button></div>
      </form>
    </Modal>
  )
}

export function GithubDialog({ config, session, onClose, onConnected, onDisconnect }: {
  config: RuntimeConfig
  session: GithubSession | null
  onClose: () => void
  onConnected: (session: GithubSession) => void
  onDisconnect: () => void
}) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const connect = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      onConnected(await connectWithToken(token.trim(), config))
      setToken('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connection failed')
    } finally { setBusy(false) }
  }
  return (
    <Modal title="Repository connection" eyebrow="Automatic checkpoints" onClose={onClose}>
      <div className="modal-body form-stack github-connect">
        {session ? (
          <>
            <div className="connected-card"><div className="connected-icon"><Check size={19} /></div><div><strong>Connected as @{session.login}</strong><span>{session.repository} · {session.branch}</span></div></div>
            <p>Every edit is saved immediately on this device. Quiet periods are coalesced into a GitHub checkpoint, so the repository remains useful history rather than one commit per keystroke.</p>
            <div className="security-note"><ShieldCheck size={17} /><span>The token lives only in this browser tab and is never written into the theory or repository.</span></div>
            <div className="modal-actions"><button type="button" className="danger-button" onClick={onDisconnect}>Disconnect this tab</button><button type="button" className="primary-button" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            {config.githubOAuthClientId ? (
              <button type="button" className="oauth-button" onClick={() => void beginGithubOAuth(config.githubOAuthClientId as string)}><Github size={18} /> Continue with GitHub</button>
            ) : (
              <div className="connection-explainer"><Cloud size={20} /><div><strong>Owner-only secure prototype</strong><p>Connect a fine-grained token limited to this one repository. A future shared-editor release should use a GitHub App broker and live CRDT service.</p></div></div>
            )}
            <form onSubmit={connect} className="form-stack">
              <label className="field-label">Fine-grained GitHub token
                <div className="input-with-icon"><KeyRound size={15} /><input type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} placeholder="github_pat_…" /></div>
              </label>
              <a className="external-help" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create a token for only <strong>dream-unity/theory</strong>, with Contents: Read and write <ExternalLink size={13} /></a>
              <div className="security-note"><ShieldCheck size={17} /><span>Use an expiry. The token remains in session storage, disappears when this tab closes, and is excluded from exports and commits.</span></div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Keep local only</button><button type="submit" className="primary-button" disabled={busy || !token.trim()}><Github size={15} /> {busy ? 'Checking…' : 'Connect repository'}</button></div>
            </form>
          </>
        )}
      </div>
    </Modal>
  )
}

export interface ForgePayload {
  invariant: string
  differences: string
  tensions: string
  emergence: string
  consequences: string
  omissions: string
}

export function ForgeDialog({ nodes, onClose, onCreate }: { nodes: TheoryNode[]; onClose: () => void; onCreate: (payload: ForgePayload) => void }) {
  const [payload, setPayload] = useState<ForgePayload>({ invariant: '', differences: '', tensions: '', emergence: '', consequences: '', omissions: '' })
  const update = (key: keyof ForgePayload, value: string) => setPayload((current) => ({ ...current, [key]: value }))
  return (
    <Modal title="Unity Forge" eyebrow={`${nodes.length} forms held together`} onClose={onClose} wide>
      <form className="modal-body forge-layout" onSubmit={(event) => { event.preventDefault(); if (payload.emergence.trim()) onCreate(payload) }}>
        <aside className="forge-sources"><p>Source constellation</p>{nodes.map((node) => <div key={node.id}><span className={`node-type-dot type-${node.type}`} /><strong>{node.title}</strong><small>{node.essence}</small></div>)}</aside>
        <div className="forge-form form-stack">
          <p className="modal-lead">Create a reversible synthesis. Unity must preserve its sources, differences, tensions and omissions.</p>
          <label className="field-label">Shared invariant<textarea rows={2} value={payload.invariant} onChange={(event) => update('invariant', event.target.value)} placeholder="What remains true across all selected forms?" /></label>
          <label className="field-label">Irreducible differences<textarea rows={2} value={payload.differences} onChange={(event) => update('differences', event.target.value)} /></label>
          <label className="field-label">Unresolved tensions<textarea rows={2} value={payload.tensions} onChange={(event) => update('tensions', event.target.value)} /></label>
          <label className="field-label">Emergent unifying claim<textarea autoFocus rows={3} value={payload.emergence} onChange={(event) => update('emergence', event.target.value)} placeholder="What becomes possible only when these are held together?" /></label>
          <div className="field-row"><label className="field-label">Practical consequences<textarea rows={2} value={payload.consequences} onChange={(event) => update('consequences', event.target.value)} /></label><label className="field-label">What compression omits<textarea rows={2} value={payload.omissions} onChange={(event) => update('omissions', event.target.value)} /></label></div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={!payload.emergence.trim()}><GitMerge size={15} /> Forge synthesis</button></div>
        </div>
      </form>
    </Modal>
  )
}

export interface RealisePayload { action: string; expected: string; observed: string; title: string }

export function RealiseDialog({ node, onClose, onCreate }: { node: TheoryNode; onClose: () => void; onCreate: (payload: RealisePayload) => void }) {
  const [payload, setPayload] = useState<RealisePayload>({ title: `${node.title} — Reality Bridge`, action: '', expected: '', observed: '' })
  const update = (key: keyof RealisePayload, value: string) => setPayload((current) => ({ ...current, [key]: value }))
  return (
    <Modal title="Cross the Reality Bridge" eyebrow={node.title} onClose={onClose}>
      <form className="modal-body form-stack" onSubmit={(event) => { event.preventDefault(); if (payload.title.trim() && payload.action.trim()) onCreate(payload) }}>
        <p className="modal-lead">Force an abstract form to meet action, consequence and reflection.</p>
        <label className="field-label">Practice or experiment title<input value={payload.title} onChange={(event) => update('title', event.target.value)} /></label>
        <label className="field-label">What will be done?<textarea autoFocus rows={3} value={payload.action} onChange={(event) => update('action', event.target.value)} /></label>
        <label className="field-label">What should become observable?<textarea rows={3} value={payload.expected} onChange={(event) => update('expected', event.target.value)} /></label>
        <label className="field-label">What happened? <small>leave open until tested</small><textarea rows={3} value={payload.observed} onChange={(event) => update('observed', event.target.value)} /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={!payload.title.trim() || !payload.action.trim()}><FlaskConical size={15} /> Create bridge</button></div>
      </form>
    </Modal>
  )
}

export function ConflictDialog({
  local,
  remote,
  conflictingPaths,
  onResolve,
}: {
  local: TheoryDocument
  remote: TheoryDocument
  conflictingPaths?: string[]
  onClose: () => void
  onResolve: (choice: 'merge' | 'mine' | 'remote') => void
}) {
  const overlapWarningId = useId()
  const hasOverlaps = Boolean(conflictingPaths?.length)
  const visibleOverlaps = conflictingPaths?.slice(0, 3) ?? []
  const remainingOverlapCount = (conflictingPaths?.length ?? 0) - visibleOverlaps.length

  return (
    <Modal title="Two versions are alive" eyebrow="GitHub conflict" dismissible={false}>
      <div className="modal-body form-stack">
        <p className="modal-lead">Nothing has been overwritten. This device and GitHub both remain intact until you decide.</p>
        <p className="conflict-warning" role="note">Choose one explicit resolution to resume repository saving. Escape and backdrop clicks cannot dismiss this decision.</p>
        <div className="version-compare">
          <div><span>This device</span><strong>Revision {local.meta.revision}</strong><small>{new Date(local.meta.updatedAt).toLocaleString()}</small><small>{local.nodes.length} concepts · {local.edges.length} links</small></div>
          <div><span>GitHub</span><strong>Revision {remote.meta.revision}</strong><small>{new Date(remote.meta.updatedAt).toLocaleString()}</small><small>{remote.nodes.length} concepts · {remote.edges.length} links</small></div>
        </div>
        {hasOverlaps && (
          <p className="conflict-warning" id={overlapWarningId} role="alert">
            <strong>Safe merge is blocked.</strong>{' '}
            Both versions changed the same field or have no usable common base: {visibleOverlaps.join(', ')}{remainingOverlapCount > 0 ? `, plus ${remainingOverlapCount} more` : ''}. Choose one complete version below.
          </p>
        )}
        <button type="button" className="resolution-option" onClick={() => onResolve('mine')}><Cloud size={19} /><div><strong>Use this device</strong><span>Replace the GitHub theory file with the intact local atlas. The current GitHub version remains recoverable in repository history.</span></div><ArrowRight size={17} /></button>
        <button type="button" className="resolution-option" onClick={() => onResolve('remote')}><Github size={19} /><div><strong>Use GitHub</strong><span>Replace the active working atlas on this device with GitHub. Current device-only differences will no longer be active.</span></div><ArrowRight size={17} /></button>
        <button type="button" className="resolution-option" onClick={() => onResolve('merge')} disabled={hasOverlaps} aria-describedby={hasOverlaps ? overlapWarningId : undefined}><GitMerge size={19} /><div><strong>Base-aware safe merge</strong><span>Compare both versions with their common base, merge only independent field edits, and stop if the same field changed on both sides.</span></div><ArrowRight size={17} /></button>
      </div>
    </Modal>
  )
}

interface CommandItem { id: string; label: string; description: string; icon: ReactNode; action: () => void; keywords?: string }

export function CommandPalette({ document, onClose, onSelectNode, commands }: { document: TheoryDocument; onClose: () => void; onSelectNode: (id: string) => void; commands: CommandItem[] }) {
  const [query, setQuery] = useState('')
  const normalized = query.toLowerCase().trim()
  const items = useMemo(() => {
    const concepts: CommandItem[] = document.nodes.map((node) => ({
      id: `node:${node.id}`, label: node.title, description: `${node.type} · ${node.essence}`, icon: <span className={`node-type-dot type-${node.type}`} />, keywords: node.facets.topics.join(' '),
      action: () => onSelectNode(node.id),
    }))
    return [...commands, ...concepts].filter((item) => !normalized || `${item.label} ${item.description} ${item.keywords ?? ''}`.toLowerCase().includes(normalized)).slice(0, 30)
  }, [commands, document.nodes, normalized, onSelectNode])
  return (
    <Modal title="Navigate the living theory" eyebrow="Command + search" onClose={onClose}>
      <div className="command-palette">
        <label className="command-search"><Search size={18} /><span className="sr-only">Search commands and theory</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ideas or actions…" /></label>
        <div className="command-results">
          {items.map((item) => <button type="button" key={item.id} onClick={() => { item.action(); onClose() }}><span className="command-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.description}</small></span><Command size={13} /></button>)}
          {items.length === 0 && <p>No matching ideas or actions.</p>}
        </div>
      </div>
    </Modal>
  )
}

export function WelcomeDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="The Living Unity Atlas" eyebrow="Dream Unity Theory Observatory" onClose={onClose} wide>
      <div className="modal-body welcome-grid">
        <div className="welcome-manifesto"><div className="welcome-symbol"><Waypoints size={32} /></div><h3>Not a bubble map.<br />A theory that can think with you.</h3><p>One canonical idea can appear in many focus maps. Its position remains a spatial memory. Its connections read as propositions. Its history never needs to disappear.</p></div>
        <div className="welcome-principles">
          <div><span>01</span><Network size={20} /><strong>Navigate by relation</strong><p>Zoom for detail, select to reveal context, and follow sentence-like links.</p></div>
          <div><span>02</span><GitMerge size={20} /><strong>Forge, don’t flatten</strong><p>Synthesis preserves sources, differences, tensions and omissions.</p></div>
          <div><span>03</span><FlaskConical size={20} /><strong>Cross into reality</strong><p>Turn claims into practices, predictions, observations and reflective updates.</p></div>
        </div>
        <div className="welcome-footer"><p>Start anywhere. Double-click open space to capture a seed.</p><button type="button" className="primary-button" onClick={onClose}>Enter the atlas <ArrowRight size={16} /></button></div>
      </div>
    </Modal>
  )
}
