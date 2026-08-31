import {
  Braces,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  GitMerge,
  Github,
  Home,
  LoaderCircle,
  Maximize2,
  Menu,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  PanelRightClose,
  RefreshCw,
  Search,
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
  session: GithubSession | null
  syncState: SyncState
  leftOpen: boolean
  rightOpen: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
  onRequestPanel?: (panel: 'left' | 'right' | 'none') => void
  onSetFocusDepth: (depth: 0 | 1 | 2) => void
  onCommand: () => void
  onConnect: () => void
  onCheckpoint: () => void
  onForge: () => void
  onExport: () => void
  onImport: () => void
  onHome?: () => void
  onFit?: () => void
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
  onRequestPanel,
  onSetFocusDepth,
  onCommand,
  onConnect,
  onCheckpoint,
  onForge,
  onExport,
  onImport,
  onHome,
  onFit,
}: HeaderProps) {
  const overflowRef = useRef<HTMLDetailsElement>(null)
  const syncTitle = syncState.kind === 'synced'
    ? `${syncState.label} at ${new Date(syncState.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : syncState.label
  const focusLabel = focusDepth === 0 ? 'All' : `${focusDepth}`
  const spatialAction = onHome ?? onFit
  const spatialLabel = onHome ? 'Home' : 'Fit'

  const toggleLeft = () => {
    if (onRequestPanel) onRequestPanel(leftOpen ? 'none' : 'left')
    else onToggleLeft()
  }

  const toggleRight = () => {
    if (onRequestPanel) onRequestPanel(rightOpen ? 'none' : 'right')
    else onToggleRight()
  }

  const closeDrawers = () => {
    if (onRequestPanel) onRequestPanel('none')
    else {
      if (leftOpen) onToggleLeft()
      if (rightOpen) onToggleRight()
    }
  }

  const cycleFocusDepth = () => onSetFocusDepth(focusDepth === 0 ? 1 : focusDepth === 1 ? 2 : 0)
  const closeOverflow = () => overflowRef.current?.removeAttribute('open')

  return (
    <>
      <header className="app-header">
        <div className="brand-zone">
          <button type="button" className="rail-toggle" onClick={toggleLeft} aria-label={leftOpen ? 'Close theory spine' : 'Open theory spine'} aria-expanded={leftOpen}>
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
          {selectedCount >= 2 && <button type="button" className="forge-header-button" onClick={onForge} aria-label={`Forge synthesis from ${selectedCount} selected ideas`}><GitMerge size={15} aria-hidden="true" /><span>Forge {selectedCount}</span></button>}
          <div className="focus-depth" role="group" aria-label="Relationship focus depth">
            <span>Focus</span>
            {([0, 1, 2] as const).map((depth) => <button type="button" key={depth} className={focusDepth === depth ? 'active' : ''} onClick={() => onSetFocusDepth(depth)} aria-label={depth === 0 ? 'Show all relationships' : `Focus ${depth} relationship hop${depth === 1 ? '' : 's'}`} aria-pressed={focusDepth === depth}>{depth === 0 ? 'All' : depth}</button>)}
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
          <button type="button" className="rail-toggle" onClick={toggleRight} aria-label={rightOpen ? 'Close inspector' : 'Open inspector'} aria-expanded={rightOpen}><PanelRightClose size={17} /></button>
        </div>
        <span className="sr-only" role="status" aria-live="polite">Sync status: {syncTitle}</span>
      </header>

      {(leftOpen || rightOpen) && <button type="button" className="drawer-scrim" onClick={closeDrawers} aria-label="Close open side panel" />}

      <nav className="mobile-recovery-bar" aria-label="Atlas controls">
        <button type="button" className="mobile-recovery-action" onClick={onCommand}>
          <Search size={19} aria-hidden="true" /><span>Search</span>
        </button>
        <button type="button" className="mobile-recovery-action" onClick={cycleFocusDepth} aria-label={`Relationship focus: ${focusLabel}. Change depth.`}>
          <Network size={19} aria-hidden="true" /><span>Focus {focusLabel}</span>
        </button>
        {spatialAction && (
          <button type="button" className="mobile-recovery-action" onClick={spatialAction}>
            {onHome ? <Home size={19} aria-hidden="true" /> : <Maximize2 size={19} aria-hidden="true" />}<span>{spatialLabel}</span>
          </button>
        )}
        <button type="button" className={`mobile-recovery-action mobile-sync sync-${syncState.kind}`} onClick={session ? onCheckpoint : onConnect} aria-label={`Sync status: ${syncTitle}. ${session ? 'Create checkpoint' : 'Connect GitHub'}.`}>
          <SyncIcon state={syncState} /><span>{syncShortLabels[syncState.kind]}</span>
        </button>
        <details className="mobile-overflow" ref={overflowRef}>
          <summary className="mobile-recovery-action" aria-label="More atlas controls"><MoreHorizontal size={20} aria-hidden="true" /><span>More</span></summary>
          <div className="mobile-overflow-menu">
            <div className="mobile-focus-question">
              <span>{view.title}</span>
              <p>{view.focusQuestion}</p>
            </div>
            <div className="mobile-overflow-section">
              <span>Relationship focus</span>
              <div className="mobile-focus-options" role="group" aria-label="Relationship focus depth">
                {([0, 1, 2] as const).map((depth) => (
                  <button type="button" key={depth} className={focusDepth === depth ? 'active' : ''} onClick={() => { onSetFocusDepth(depth); closeOverflow() }} aria-pressed={focusDepth === depth}>{depth === 0 ? 'All' : `${depth} hop${depth === 1 ? '' : 's'}`}</button>
                ))}
              </div>
            </div>
            <div className="mobile-overflow-actions">
              {onHome && <button type="button" onClick={() => { onHome(); closeOverflow() }}><Home size={17} aria-hidden="true" /> Return to view home</button>}
              {onFit && <button type="button" onClick={() => { onFit(); closeOverflow() }}><Maximize2 size={17} aria-hidden="true" /> Fit visible theory</button>}
              <button type="button" onClick={() => { onCommand(); closeOverflow() }}><Search size={17} aria-hidden="true" /> Search and commands</button>
              <button type="button" onClick={() => { (session ? onCheckpoint : onConnect)(); closeOverflow() }}><SyncIcon state={syncState} /> <span><strong>{syncTitle}</strong><small>{session ? 'Create a repository checkpoint' : 'Connect GitHub autosave'}</small></span></button>
            </div>
          </div>
        </details>
      </nav>
    </>
  )
}
