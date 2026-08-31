import {
  Braces,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  GitMerge,
  Github,
  LoaderCircle,
  Menu,
  Network,
  PanelLeftClose,
  PanelRightClose,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react'
import type { GithubSession, SyncState, TheoryView } from '../types'

interface HeaderProps {
  view: TheoryView
  focusDepth: 0 | 1 | 2
  selectedCount: number
  session: GithubSession | null
  syncState: SyncState
  leftOpen: boolean
  rightOpen: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
  onSetFocusDepth: (depth: 0 | 1 | 2) => void
  onCommand: () => void
  onConnect: () => void
  onCheckpoint: () => void
  onForge: () => void
  onExport: () => void
  onImport: () => void
}

function SyncIcon({ state }: { state: SyncState }) {
  if (state.kind === 'syncing' || state.kind === 'loading') return <LoaderCircle className="spin" size={14} />
  if (state.kind === 'synced') return <CheckCircle2 size={14} />
  if (state.kind === 'offline') return <CloudOff size={14} />
  if (state.kind === 'error' || state.kind === 'conflict') return <RefreshCw size={14} />
  return <Cloud size={14} />
}

export function Header({
  view,
  focusDepth,
  selectedCount,
  session,
  syncState,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  onSetFocusDepth,
  onCommand,
  onConnect,
  onCheckpoint,
  onForge,
  onExport,
  onImport,
}: HeaderProps) {
  const syncTitle = syncState.kind === 'synced'
    ? `${syncState.label} at ${new Date(syncState.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : syncState.label
  return (
    <header className="app-header">
      <div className="brand-zone">
        <button type="button" className="rail-toggle" onClick={onToggleLeft} aria-label={leftOpen ? 'Close theory spine' : 'Open theory spine'}>
          {leftOpen ? <PanelLeftClose size={17} /> : <Menu size={17} />}
        </button>
        <div className="unity-mark" aria-hidden="true"><span /><span /><span /></div>
        <div className="brand-copy"><strong>Dream Unity</strong><span>Theory Observatory</span></div>
      </div>

      <div className="question-zone">
        <div className="view-crumb"><Network size={13} /><span>{view.title}</span></div>
        <p>{view.focusQuestion}</p>
      </div>

      <div className="header-actions">
        {selectedCount >= 2 && <button type="button" className="forge-header-button" onClick={onForge}><GitMerge size={15} /><span>Forge {selectedCount}</span></button>}
        <div className="focus-depth" role="group" aria-label="Relationship focus depth">
          <span>Focus</span>
          {([0, 1, 2] as const).map((depth) => <button type="button" key={depth} className={focusDepth === depth ? 'active' : ''} onClick={() => onSetFocusDepth(depth)} aria-label={depth === 0 ? 'Show all relationships' : `Focus ${depth} relationship hop${depth === 1 ? '' : 's'}`}>{depth === 0 ? 'All' : depth}</button>)}
        </div>
        <button type="button" className="command-button" onClick={onCommand} aria-label="Search and commands"><Search size={15} /><span>Search</span><kbd>⌘ K</kbd></button>
        <div className="utility-menu">
          <button type="button" className="icon-button" aria-label="Data tools"><Braces size={16} /></button>
          <div className="utility-popover">
            <button type="button" onClick={onExport}><Download size={14} /> Export JSON</button>
            <button type="button" onClick={onImport}><Upload size={14} /> Import JSON</button>
          </div>
        </div>
        <button type="button" className={`sync-button sync-${syncState.kind}`} onClick={session ? onCheckpoint : onConnect} title={syncTitle}>
          <SyncIcon state={syncState} /><span>{syncState.kind === 'synced' ? 'GitHub saved' : syncState.kind === 'local' ? 'Device saved' : syncState.label}</span>
        </button>
        <button type="button" className={`github-button ${session ? 'connected' : ''}`} onClick={onConnect} title={session ? `Connected as @${session.login}` : 'Connect GitHub autosave'}><Github size={17} /><span>{session ? session.login : 'Connect'}</span></button>
        <button type="button" className="rail-toggle" onClick={onToggleRight} aria-label={rightOpen ? 'Close inspector' : 'Open inspector'}><PanelRightClose size={17} /></button>
      </div>
    </header>
  )
}
