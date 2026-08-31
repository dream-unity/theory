import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  GitMerge,
  Github,
  Home,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Redo2,
  RefreshCw,
  Search,
  Undo2,
  Upload,
} from 'lucide-react'
import { useRef } from 'react'
import type { GithubSession, SyncState, TheoryView } from '../types'

const syncShortLabels: Record<SyncState['kind'], string> = {
  loading: 'Opening',
  local: 'Device',
  queued: 'Queued',
  syncing: 'Saving',
  synced: 'Saved',
  offline: 'Offline',
  conflict: 'Review',
  error: 'Retry',
}

interface HeaderProps {
  view: TheoryView
  focusDepth: 0 | 1 | 2
  selectedCount: number
  hasSelection: boolean
  session: GithubSession | null
  syncState: SyncState
  leftOpen: boolean
  rightOpen: boolean
  canGoBack: boolean
  canGoForward: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
  onRequestPanel?: (panel: 'left' | 'right' | 'none') => void
  onSetFocusDepth: (depth: 0 | 1 | 2) => void
  onCommand: () => void
  onNewIdea: () => void
  onConnect: () => void
  onCheckpoint: () => void
  onForge: () => void
  onExport: () => void
  onImport: () => void
  onUndo: () => void
  onRedo: () => void
  onGoBack: () => void
  onGoForward: () => void
  onHelp: () => void
  onHome: () => void
}

function SyncIcon({ state }: { state: SyncState }) {
  if (state.kind === 'syncing' || state.kind === 'loading') return <LoaderCircle className="spin" size={16} />
  if (state.kind === 'synced') return <CheckCircle2 size={16} />
  if (state.kind === 'offline') return <CloudOff size={16} />
  if (state.kind === 'error' || state.kind === 'conflict') return <RefreshCw size={16} />
  return <Cloud size={16} />
}

export function Header({
  view,
  focusDepth,
  selectedCount,
  hasSelection,
  session,
  syncState,
  leftOpen,
  rightOpen,
  canGoBack,
  canGoForward,
  onToggleLeft,
  onToggleRight,
  onRequestPanel,
  onSetFocusDepth,
  onCommand,
  onNewIdea,
  onConnect,
  onCheckpoint,
  onForge,
  onExport,
  onImport,
  onUndo,
  onRedo,
  onGoBack,
  onGoForward,
  onHelp,
  onHome,
}: HeaderProps) {
  const overflowRef = useRef<HTMLDetailsElement>(null)
  const syncTitle = syncState.kind === 'synced'
    ? `${syncState.label} at ${new Date(syncState.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : syncState.label
  const syncLabel = session ? syncShortLabels[syncState.kind] : 'Connect GitHub'
  const syncButtonTitle = session ? syncTitle : 'Connect GitHub for automatic repository checkpoints'

  const requestPanel = (panel: 'left' | 'right' | 'none') => {
    if (onRequestPanel) onRequestPanel(panel)
    else if (panel === 'left') onToggleLeft()
    else if (panel === 'right') onToggleRight()
  }
  const closeOverflow = () => overflowRef.current?.removeAttribute('open')
  const run = (action: () => void) => { action(); closeOverflow() }

  return (
    <>
      <header className="app-header">
        <div className="brand-zone">
          <button type="button" className="rail-toggle browse-button" onClick={() => requestPanel(leftOpen ? 'none' : 'left')} aria-label={leftOpen ? 'Close ideas browser' : 'Open ideas browser'} aria-expanded={leftOpen}>
            {leftOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}<span>Browse</span>
          </button>
          <div className="unity-mark" aria-hidden="true"><span /><span /><span /></div>
          <div className="brand-copy"><strong>Dream Unity</strong><span>Theory map</span></div>
          <div className="navigation-history" aria-label="Idea navigation history">
            <button type="button" onClick={onGoBack} disabled={!canGoBack} aria-label="Previous idea"><ArrowLeft size={16} /></button>
            <button type="button" onClick={onGoForward} disabled={!canGoForward} aria-label="Next idea"><ArrowRight size={16} /></button>
          </div>
        </div>

        <div className="question-zone">
          <div className="view-crumb"><Network size={14} /><span>{view.title}</span></div>
          <p>{view.focusQuestion}</p>
        </div>

        <div className="header-actions">
          {selectedCount >= 2 && <button type="button" className="forge-header-button" onClick={onForge} aria-label={`Combine ${selectedCount} selected ideas`}><GitMerge size={16} /><span>Combine {selectedCount}</span></button>}
          <button type="button" className="command-button" onClick={onCommand} aria-label="Find ideas and actions"><Search size={17} /><span>Find</span><kbd>/</kbd></button>
          <button type="button" className="new-idea-header-button" onClick={onNewIdea}><Plus size={18} /><span>New idea</span></button>
          <button type="button" className={`sync-button sync-${syncState.kind}`} onClick={session ? onCheckpoint : onConnect} title={syncButtonTitle}>
            {session ? <SyncIcon state={syncState} /> : <Github size={16} />}<span>{syncLabel}</span>
          </button>
          <details className="utility-menu" ref={overflowRef}>
            <summary className="icon-button" aria-label="More tools"><MoreHorizontal size={19} /></summary>
            <div className="utility-popover">
              <section>
                <span className="menu-label">Relationship view</span>
                <div className="menu-segment" role="group" aria-label="Relationship view depth">
                  {([0, 1, 2] as const).map((depth) => (
                    <button type="button" key={depth} className={focusDepth === depth ? 'active' : ''} onClick={() => onSetFocusDepth(depth)} aria-pressed={focusDepth === depth}>
                      {depth === 0 ? 'All' : depth === 1 ? 'Neighbours' : 'Branch'}
                    </button>
                  ))}
                </div>
              </section>
              <button type="button" onClick={() => run(onUndo)}><Undo2 size={16} /> Undo</button>
              <button type="button" onClick={() => run(onRedo)}><Redo2 size={16} /> Redo</button>
              {hasSelection && <button type="button" onClick={() => run(() => requestPanel(rightOpen ? 'none' : 'right'))}><PanelRightClose size={16} /> {rightOpen ? 'Close editor' : 'Edit selected idea'}</button>}
              <button type="button" onClick={() => run(onConnect)}><Github size={16} /> {session ? `GitHub · ${session.login}` : 'Connect GitHub'}</button>
              <button type="button" onClick={() => run(onExport)}><Download size={16} /> Export backup</button>
              <button type="button" onClick={() => run(onImport)}><Upload size={16} /> Import backup</button>
              <button type="button" onClick={() => run(onHelp)}><Network size={16} /> How this map works</button>
            </div>
          </details>
        </div>
        <span className="sr-only" role="status" aria-live="polite">Save status: {syncTitle}</span>
      </header>

      {(leftOpen || rightOpen) && <button type="button" className="drawer-scrim" onClick={() => requestPanel('none')} aria-label="Close open panel" />}

      <nav className="mobile-recovery-bar" aria-label="Theory map controls">
        <button type="button" className="mobile-recovery-action" onClick={() => requestPanel(leftOpen ? 'none' : 'left')}>
          <Menu size={20} /><span>Browse</span>
        </button>
        <button type="button" className="mobile-recovery-action" onClick={onCommand}>
          <Search size={20} /><span>Find</span>
        </button>
        <button type="button" className="mobile-recovery-action mobile-add" onClick={onNewIdea}>
          <Plus size={22} /><span>Add</span>
        </button>
        <button type="button" className="mobile-recovery-action" onClick={onHome}>
          <Home size={20} /><span>Home</span>
        </button>
        <button type="button" className={`mobile-recovery-action mobile-sync sync-${syncState.kind}`} onClick={session ? onCheckpoint : onConnect} aria-label={session ? `Save status: ${syncTitle}` : syncButtonTitle}>
          {session ? <SyncIcon state={syncState} /> : <Github size={17} />}<span>{session ? syncLabel : 'Connect'}</span>
        </button>
      </nav>
    </>
  )
}
