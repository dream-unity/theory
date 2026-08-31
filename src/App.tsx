import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Connection } from '@xyflow/react'
import { CircleHelp, GitMerge, Github, RotateCcw, Sparkles } from 'lucide-react'
import { Header } from './components/Header'
import type { ForgePayload, RealisePayload } from './components/Modals'
import { TheoryCanvas } from './components/TheoryCanvas'
import { useAutosave } from './hooks/useAutosave'
import { completeGithubOAuth, connectWithToken, loadRuntimeConfig } from './lib/github'
import { clearSession, loadPublishedDocument, loadSession, resolveInitialDocument, saveLocalBackup, saveSession } from './lib/local-store'
import {
  addEdge,
  addNodeToView,
  archiveNode,
  createEdge,
  createNode,
  deleteEdge,
  now,
  touchDocument,
  updateNodePosition,
  validateDocument,
  withUpdatedEdge,
  withUpdatedNode,
} from './lib/theory'
import { SEED_DOCUMENT } from './seed'
import type { GithubSession, Portal, RuntimeConfig, TheoryDocument, TheoryEdge, TheoryNode, TheoryNodeType } from './types'

const CommandPalette = lazy(() => import('./components/Modals').then((module) => ({ default: module.CommandPalette })))
const ConflictDialog = lazy(() => import('./components/Modals').then((module) => ({ default: module.ConflictDialog })))
const ForgeDialog = lazy(() => import('./components/Modals').then((module) => ({ default: module.ForgeDialog })))
const GithubDialog = lazy(() => import('./components/Modals').then((module) => ({ default: module.GithubDialog })))
const NewSeedDialog = lazy(() => import('./components/Modals').then((module) => ({ default: module.NewSeedDialog })))
const RealiseDialog = lazy(() => import('./components/Modals').then((module) => ({ default: module.RealiseDialog })))
const RelationDialog = lazy(() => import('./components/Modals').then((module) => ({ default: module.RelationDialog })))
const WelcomeDialog = lazy(() => import('./components/Modals').then((module) => ({ default: module.WelcomeDialog })))
const Inspector = lazy(() => import('./components/Inspector').then((module) => ({ default: module.Inspector })))
const OutlinePanel = lazy(() => import('./components/OutlinePanel').then((module) => ({ default: module.OutlinePanel })))

type ModalName = 'seed' | 'github' | 'forge' | 'realise' | 'commands' | 'welcome' | null

export default function App() {
  const [document, setDocument] = useState<TheoryDocument | null>(null)
  const [config, setConfig] = useState<RuntimeConfig>({ repository: 'dream-unity/theory', branch: 'theory-live', dataPath: 'public/data/theory.json' })
  const [session, setSession] = useState<GithubSession | null>(() => loadSession())
  const [viewId, setViewId] = useState('whole-theory')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [focusDepth, setFocusDepth] = useState<0 | 1 | 2>(() => window.matchMedia('(max-width: 700px)').matches ? 1 : 0)
  const [visiblePortals, setVisiblePortals] = useState<Set<string>>(new Set(['maker', 'machine', 'world', 'unity']))
  const [edgeFamilyOverrides, setEdgeFamilyOverrides] = useState<Record<string, Set<TheoryEdge['family']>>>({})
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [modal, setModal] = useState<ModalName>(null)
  const [inspectorTab, setInspectorTab] = useState<'essence' | 'relations' | 'grounding' | 'mirror'>('essence')
  const [seedPosition, setSeedPosition] = useState<{ x: number; y: number }>({ x: -50, y: -760 })
  const [pendingConnection, setPendingConnection] = useState<{ from: string; to: string } | null>(null)
  const [realiseNodeId, setRealiseNodeId] = useState<string | null>(null)
  const actor = session ? `@${session.login}` : 'Local Dream Unity editor'
  const undoStack = useRef<TheoryDocument[]>([])
  const redoStack = useRef<TheoryDocument[]>([])
  const lastHistoryAt = useRef(0)
  const [navigation, setNavigation] = useState<{ ids: string[]; index: number }>({ ids: [], index: -1 })

  useEffect(() => {
    let cancelled = false
    void resolveInitialDocument(SEED_DOCUMENT).then((initial) => {
      if (cancelled) return
      setDocument(initial)
      // Paint immediately from local/bundled data, then hydrate a first-time browser
      // from the published theory without blocking or replacing an edit already made.
      if (initial === SEED_DOCUMENT) {
        void loadPublishedDocument().then((published) => {
          if (!cancelled && published) setDocument((current) => current === initial ? published : current)
        })
      }
    })
    void loadRuntimeConfig().then(async (runtime) => {
      if (cancelled) return
      setConfig(runtime)
      if (runtime.githubOAuthClientId) {
        try {
          const token = await completeGithubOAuth(runtime.githubOAuthClientId)
          if (token) {
            const connected = await connectWithToken(token, runtime)
            saveSession(connected)
            setSession(connected)
          }
        } catch (error) {
          console.error(error)
          setModal('github')
        }
      }
    })
    return () => { cancelled = true }
  }, [])

  const mutate = useCallback((updater: (current: TheoryDocument) => TheoryDocument, recordHistory = true) => {
    setDocument((current) => {
      if (!current) return current
      if (recordHistory && Date.now() - lastHistoryAt.current > 650) {
        undoStack.current = [...undoStack.current.slice(-59), current]
        redoStack.current = []
        lastHistoryAt.current = Date.now()
      }
      return updater(current)
    })
  }, [])

  const undo = useCallback(() => {
    setDocument((current) => {
      const previous = undoStack.current.pop()
      if (!current || !previous) return current
      redoStack.current.push(current)
      return touchDocument(previous)
    })
  }, [])

  const redo = useCallback(() => {
    setDocument((current) => {
      const next = redoStack.current.pop()
      if (!current || !next) return current
      undoStack.current.push(current)
      return touchDocument(next)
    })
  }, [])

  const { syncState, conflict, checkpointNow, resolveConflict } = useAutosave(document, setDocument, session)

  const view = useMemo(() => document?.views.find((item) => item.id === viewId) ?? document?.views[0], [document, viewId])
  const visibleEdgeFamilies = useMemo(
    () => edgeFamilyOverrides[viewId] ?? new Set(view?.visibleEdgeFamilies ?? []),
    [edgeFamilyOverrides, view?.visibleEdgeFamilies, viewId],
  )
  const selectedNode = useMemo(() => document?.nodes.find((node) => node.id === selectedNodeId) ?? null, [document, selectedNodeId])
  const selectedEdge = useMemo(() => document?.edges.find((edge) => edge.id === selectedEdgeId) ?? null, [document, selectedEdgeId])
  const forgeNodes = useMemo(() => document?.nodes.filter((node) => selectedIds.includes(node.id)) ?? [], [document, selectedIds])
  const realiseNode = useMemo(() => document?.nodes.find((node) => node.id === realiseNodeId) ?? null, [document, realiseNodeId])
  const relationSource = useMemo(() => document?.nodes.find((node) => node.id === pendingConnection?.from), [document, pendingConnection])
  const relationTarget = useMemo(() => document?.nodes.find((node) => node.id === pendingConnection?.to), [document, pendingConnection])

  const revealNode = useCallback((id: string | null) => {
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
    if (id) {
      setSelectedIds([id])
      setRightOpen(true)
      if (window.matchMedia('(max-width: 979px)').matches) setLeftOpen(false)
    } else {
      setSelectedIds([])
      setRightOpen(false)
    }
  }, [])

  const selectNode = useCallback((id: string | null) => {
    revealNode(id)
    if (!id) return
    setNavigation((current) => {
      if (current.ids[current.index] === id) return current
      const ids = [...current.ids.slice(0, current.index + 1), id].slice(-40)
      return { ids, index: ids.length - 1 }
    })
  }, [revealNode])

  const goBack = useCallback(() => {
    if (navigation.index <= 0) return
    const index = navigation.index - 1
    setNavigation((current) => ({ ...current, index }))
    revealNode(navigation.ids[index])
  }, [navigation, revealNode])

  const goForward = useCallback(() => {
    if (navigation.index >= navigation.ids.length - 1) return
    const index = navigation.index + 1
    setNavigation((current) => ({ ...current, index }))
    revealNode(navigation.ids[index])
  }, [navigation, revealNode])

  const selectEdge = useCallback((id: string | null) => {
    setSelectedEdgeId(id)
    if (id) { setSelectedNodeId(null); setSelectedIds([]); setRightOpen(true) }
    else if (!selectedNodeId) setRightOpen(false)
  }, [selectedNodeId])

  const addCanonicalNode = useCallback((node: TheoryNode, position: { x: number; y: number }) => {
    mutate((current) => {
      const activeView = current.views.find((item) => item.id === viewId) ?? current.views[0]
      let next = addNodeToView(current, node, activeView.id, position)
      if (activeView.id !== 'whole-theory') {
        const whole = next.views.find((item) => item.id === 'whole-theory')
        if (whole) {
          next = touchDocument({
            ...next,
            views: next.views.map((item) => item.id === 'whole-theory' ? {
              ...item,
              includedNodeIds: [...item.includedNodeIds, node.id],
              positions: { ...item.positions, [node.id]: { x: -1750, y: -620 + (item.includedNodeIds.length % 8) * 190, updatedAt: now() } },
            } : item),
          })
        }
      }
      return next
    })
    setSelectedNodeId(node.id)
    setSelectedIds([node.id])
    setRightOpen(true)
  }, [mutate, viewId])

  const createSeed = useCallback((title: string, type: TheoryNodeType, link?: { relation: string; family: TheoryEdge['family'] }) => {
    const sourceId = link ? selectedNodeId : null
    const node = createNode(title, type, [], actor)
    addCanonicalNode(node, seedPosition)
    if (sourceId && link) {
      mutate((current) => addEdge(current, createEdge(sourceId, node.id, link.relation, link.family, actor)))
    }
    setModal(null)
  }, [actor, addCanonicalNode, mutate, seedPosition, selectedNodeId])

  const openSeed = useCallback((position?: { x: number; y: number }) => {
    if (position) setSeedPosition(position)
    else if (selectedNodeId && view?.positions[selectedNodeId]) {
      const selectedPosition = view.positions[selectedNodeId]
      const nearbyCount = document?.edges.filter((edge) => edge.from === selectedNodeId || edge.to === selectedNodeId).length ?? 0
      setSeedPosition({
        x: selectedPosition.x + 330,
        y: selectedPosition.y + (nearbyCount % 4) * 130 - 120,
      })
    }
    else {
      const count = document?.nodes.filter((node) => node.epistemics.maturity === 'seed').length ?? 0
      setSeedPosition({ x: -1400 + (count % 5) * 290, y: -1000 + Math.floor(count / 5) * 210 })
    }
    setModal('seed')
  }, [document?.edges, document?.nodes, selectedNodeId, view?.positions])

  const createRelation = useCallback((relation: string, family: TheoryEdge['family']) => {
    if (!pendingConnection) return
    const edge = createEdge(pendingConnection.from, pendingConnection.to, relation, family, actor)
    mutate((current) => addEdge(current, edge))
    setPendingConnection(null)
    setSelectedEdgeId(edge.id)
    setSelectedNodeId(null)
    setRightOpen(true)
  }, [actor, mutate, pendingConnection])

  const connect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return
    setPendingConnection({ from: connection.source, to: connection.target })
  }, [])

  const updateNode = useCallback((node: TheoryNode) => {
    mutate((current) => withUpdatedNode(current, node.id, () => node, actor))
  }, [actor, mutate])

  const updateEdge = useCallback((edge: TheoryEdge) => {
    mutate((current) => withUpdatedEdge(current, edge.id, () => edge, actor))
  }, [actor, mutate])

  const forge = useCallback((payload: ForgePayload) => {
    if (forgeNodes.length < 2 || !view) return
    const title = payload.emergence.length > 72 ? `${payload.emergence.slice(0, 69)}…` : payload.emergence
    const synthesis = createNode(title, 'synthesis', forgeNodes.map((node) => node.id), actor)
    synthesis.essence = payload.emergence
    synthesis.bodyMarkdown = [
      '## Shared invariant', payload.invariant || '_Not yet articulated._',
      '## Irreducible differences', payload.differences || '_Not yet articulated._',
      '## Unresolved tensions', payload.tensions || '_None yet recorded._',
      '## Practical consequences', payload.consequences || '_Not yet realised._',
      '## What this compression omits', payload.omissions || '_Not yet recorded._',
    ].join('\n\n')
    synthesis.facets.portals = Array.from(new Set([...forgeNodes.flatMap((node) => node.facets.portals), 'unity']))
    synthesis.facets.forms = Array.from(new Set(forgeNodes.flatMap((node) => node.facets.forms)))
    synthesis.facets.phases = ['synthesis']
    synthesis.epistemics.maturity = 'articulated'
    const states = forgeNodes.map((node) => view.positions[node.id]).filter(Boolean)
    const position = states.length ? {
      x: states.reduce((sum, item) => sum + item.x, 0) / states.length,
      y: states.reduce((sum, item) => sum + item.y, 0) / states.length + 320,
    } : { x: 0, y: 300 }
    mutate((current) => {
      let next = addNodeToView(current, synthesis, view.id, position)
      if (view.id !== 'whole-theory') {
        next = touchDocument({ ...next, views: next.views.map((item) => item.id === 'whole-theory' ? { ...item, includedNodeIds: [...item.includedNodeIds, synthesis.id], positions: { ...item.positions, [synthesis.id]: { ...position, updatedAt: now() } } } : item) })
      }
      for (const source of forgeNodes) next = addEdge(next, createEdge(source.id, synthesis.id, 'synthesises into', 'integration', actor))
      return next
    })
    setSelectedNodeId(synthesis.id)
    setSelectedIds([synthesis.id])
    setModal(null)
  }, [actor, forgeNodes, mutate, view])

  const realise = useCallback((payload: RealisePayload) => {
    if (!realiseNode || !view) return
    const practice = createNode(payload.title, 'practice', [realiseNode.id], actor)
    practice.essence = payload.action
    practice.bodyMarkdown = `## Action\n\n${payload.action}\n\n## Expected observation\n\n${payload.expected || '_Not yet specified._'}\n\n## Observed outcome\n\n${payload.observed || '_Awaiting practice._'}`
    practice.facets.portals = Array.from(new Set([...realiseNode.facets.portals, 'world']))
    practice.facets.forms = Array.from(new Set([...realiseNode.facets.forms, 'strategic']))
    practice.facets.phases = ['realisation', 'reflection']
    const sourcePosition = view.positions[realiseNode.id] ?? { x: 0, y: 0 }
    const position = { x: sourcePosition.x + 360, y: sourcePosition.y + 280 }
    mutate((current) => {
      let next = addNodeToView(current, practice, view.id, position)
      if (view.id !== 'whole-theory') {
        next = touchDocument({ ...next, views: next.views.map((item) => item.id === 'whole-theory' ? { ...item, includedNodeIds: [...item.includedNodeIds, practice.id], positions: { ...item.positions, [practice.id]: { ...position, updatedAt: now() } } } : item) })
      }
      return addEdge(next, createEdge(realiseNode.id, practice.id, 'realises as', 'integration', actor))
    })
    setSelectedNodeId(practice.id)
    setSelectedIds([practice.id])
    setRealiseNodeId(null)
    setModal(null)
  }, [actor, mutate, realiseNode, view])

  const handleConnectSession = useCallback((connected: GithubSession) => {
    saveSession(connected)
    setSession(connected)
    setModal(null)
  }, [])

  const disconnect = useCallback(() => {
    clearSession(); setSession(null); setModal(null)
  }, [])

  const togglePortal = useCallback((portal: Portal) => {
    setVisiblePortals((current) => {
      const next = new Set(current)
      if (next.has(portal) && next.size > 1) next.delete(portal)
      else next.add(portal)
      return next
    })
  }, [])

  const toggleEdgeFamily = useCallback((family: TheoryEdge['family']) => {
    setEdgeFamilyOverrides((current) => {
      const existing = current[viewId] ?? new Set(view?.visibleEdgeFamilies ?? [])
      if (existing.has(family) && existing.size === 1) return current
      const next = new Set(existing)
      if (next.has(family)) next.delete(family)
      else next.add(family)
      return { ...current, [viewId]: next }
    })
  }, [view?.visibleEdgeFamilies, viewId])

  const exportDocument = useCallback(() => {
    if (!document) return
    const blob = new Blob([`${JSON.stringify(document, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = `dream-unity-theory-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [document])

  const importDocument = useCallback(() => {
    const input = window.document.createElement('input')
    input.type = 'file'; input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      void file.text().then(async (text) => {
        const value: unknown = JSON.parse(text)
        if (!validateDocument(value)) throw new Error('This file is not a Dream Unity theory document.')
        const approved = window.confirm(
          `Import “${value.meta.title}” (revision ${value.meta.revision}) with ${value.nodes.length} concepts and ${value.edges.length} relationships?\n\nYour current atlas will be kept as a recovery backup.`,
        )
        if (!approved) return
        if (document) await saveLocalBackup(document, `Before importing ${file.name}`, session)
        mutate(() => touchDocument(value))
        setViewId(value.views[0]?.id ?? 'whole-theory')
      }).catch((error: unknown) => alert(error instanceof Error ? error.message : 'Import failed'))
    }
    input.click()
  }, [document, mutate, session])

  const closeWelcome = useCallback(() => setModal(null), [])

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setModal('commands'); return }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return }
      if (isTyping(event.target) || modal) return
      if (event.key === '/' || event.key.toLowerCase() === 'k') { event.preventDefault(); setModal('commands') }
      else if (event.key.toLowerCase() === 'n') openSeed()
      else if (event.key.toLowerCase() === 'f') setFocusDepth((current) => current === 0 ? 1 : current === 1 ? 2 : 0)
      else if (event.key.toLowerCase() === 'm' && selectedNodeId) { setInspectorTab('mirror'); setRightOpen(true) }
      else if (event.key.toLowerCase() === 's' && selectedIds.length >= 2) setModal('forge')
      else if (event.key.toLowerCase() === 'r' && selectedNodeId) { setRealiseNodeId(selectedNodeId); setModal('realise') }
      else if (event.key === 'Home') selectNode('unity-core')
      else if (event.key === '?') setModal('welcome')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [modal, openSeed, redo, selectNode, selectedIds.length, selectedNodeId, undo])

  const commands = useMemo(() => [
    { id: 'new-seed', label: 'Add a new idea', description: selectedNodeId ? 'Create it beside and optionally connect it to the selected idea' : 'Capture it in the Inbox', icon: <Sparkles size={16} />, action: () => openSeed(), keywords: 'new seed add create' },
    { id: 'browse', label: 'Browse views and ideas', description: 'Open the searchable theory outline and review queues', icon: <CircleHelp size={16} />, action: () => { setLeftOpen(true); setRightOpen(false) }, keywords: 'outline health review views' },
    { id: 'realise', label: 'Turn selected idea into action', description: selectedNodeId ? 'Create a linked practice or experiment' : 'Select an idea first', icon: <Sparkles size={16} />, action: () => { if (selectedNodeId) { setRealiseNodeId(selectedNodeId); setModal('realise') } }, keywords: 'realise practice experiment action' },
    { id: 'forge', label: 'Combine selected ideas', description: selectedIds.length >= 2 ? `Synthesize ${selectedIds.length} selected ideas` : 'Select two or more ideas first', icon: <GitMerge size={16} />, action: () => { if (selectedIds.length >= 2) setModal('forge') }, keywords: 'forge synthesis compress' },
    { id: 'github', label: 'Repository connection', description: session ? `Connected as @${session.login}` : 'Enable automatic GitHub checkpoints', icon: <Github size={16} />, action: () => setModal('github'), keywords: 'save sync' },
    { id: 'undo', label: 'Undo recent change', description: 'Restore the prior local theory state', icon: <RotateCcw size={16} />, action: undo },
    { id: 'help', label: 'How the atlas works', description: 'Reopen the orientation guide', icon: <CircleHelp size={16} />, action: () => setModal('welcome') },
  ], [openSeed, selectedIds.length, selectedNodeId, session, undo])

  if (!document || !view) {
    return <div className="loading-screen"><div className="unity-mark large" aria-hidden="true"><span /><span /><span /></div><p>Opening the Theory Observatory…</p></div>
  }

  return (
    <div className={`app-shell ${leftOpen ? 'left-open' : 'left-closed'} ${rightOpen ? 'right-open' : 'right-closed'}`}>
      <Header
        view={view}
        focusDepth={focusDepth}
        selectedCount={selectedIds.length}
        hasSelection={Boolean(selectedNodeId || selectedEdgeId)}
        session={session}
        syncState={syncState}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        canGoBack={navigation.index > 0}
        canGoForward={navigation.index >= 0 && navigation.index < navigation.ids.length - 1}
        onToggleLeft={() => setLeftOpen((value) => {
          const next = !value
          if (next && window.matchMedia('(max-width: 979px)').matches) setRightOpen(false)
          return next
        })}
        onToggleRight={() => setRightOpen((value) => {
          const next = !value
          if (next && window.matchMedia('(max-width: 979px)').matches) setLeftOpen(false)
          return next
        })}
        onSetFocusDepth={setFocusDepth}
        onCommand={() => setModal('commands')}
        onNewIdea={() => openSeed()}
        onConnect={() => setModal('github')}
        onCheckpoint={() => void checkpointNow()}
        onForge={() => setModal('forge')}
        onExport={exportDocument}
        onImport={importDocument}
        onUndo={undo}
        onRedo={redo}
        onGoBack={goBack}
        onGoForward={goForward}
        onHelp={() => setModal('welcome')}
        onRequestPanel={(panel) => {
          setLeftOpen(panel === 'left')
          setRightOpen(panel === 'right' && Boolean(selectedNodeId || selectedEdgeId))
        }}
        onHome={() => selectNode(view.rootNodeId ?? 'unity-core')}
      />
      <main className="workspace">
        <Suspense fallback={leftOpen ? <aside className="outline-panel panel-loading" role="status">Opening ideas…</aside> : null}>
          {leftOpen && <OutlinePanel document={document} currentView={view} selectedNodeId={selectedNodeId} onSelectNode={selectNode} onSelectView={(id) => { setViewId(id); selectNode(null) }} visiblePortals={visiblePortals} onTogglePortal={togglePortal} visibleEdgeFamilies={visibleEdgeFamilies} onToggleEdgeFamily={toggleEdgeFamily} onRequestClose={() => { if (window.matchMedia('(max-width: 979px)').matches) setLeftOpen(false) }} />}
        </Suspense>
        <TheoryCanvas
          document={document}
          view={view}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          focusDepth={focusDepth}
          visiblePortals={visiblePortals}
          visibleEdgeFamilies={visibleEdgeFamilies}
          onSelectNode={selectNode}
          onSelectEdge={selectEdge}
          onSelectionChange={(ids) => setSelectedIds(ids)}
          onMoveNode={(id, position) => mutate((current) => updateNodePosition(current, view.id, id, position))}
          onCreateAt={openSeed}
          onConnect={connect}
        />
        <Suspense fallback={rightOpen ? <aside className="inspector panel-loading" role="status">Opening editor…</aside> : null}>
          {rightOpen && (selectedNode || selectedEdge) && <Inspector document={document} node={selectedNode} edge={selectedEdge} requestedTab={inspectorTab} onChangeNode={updateNode} onChangeEdge={updateEdge} onDeleteEdge={(id) => { mutate((current) => deleteEdge(current, id)); selectEdge(null) }} onSelectNode={selectNode} onClose={() => setRightOpen(false)} onArchive={(id) => mutate((current) => archiveNode(current, id, actor))} onRealise={(id) => { setRealiseNodeId(id); setModal('realise') }} onBeginRelation={(from, to) => setPendingConnection({ from, to })} />}
        </Suspense>
      </main>

      <Suspense fallback={<div className="modal-backdrop"><div className="modal-loading" role="status">Opening tool…</div></div>}>
        {modal === 'welcome' && <WelcomeDialog onClose={closeWelcome} />}
        {modal === 'seed' && <NewSeedDialog selectedNode={selectedNode} onClose={() => setModal(null)} onCreate={createSeed} />}
        {modal === 'github' && <GithubDialog config={config} session={session} onClose={() => setModal(null)} onConnected={handleConnectSession} onDisconnect={disconnect} />}
        {modal === 'forge' && forgeNodes.length >= 2 && <ForgeDialog nodes={forgeNodes} onClose={() => setModal(null)} onCreate={forge} />}
        {modal === 'realise' && realiseNode && <RealiseDialog node={realiseNode} onClose={() => { setModal(null); setRealiseNodeId(null) }} onCreate={realise} />}
        {modal === 'commands' && <CommandPalette document={document} onClose={() => setModal(null)} onSelectNode={selectNode} commands={commands} />}
        {pendingConnection && relationSource && relationTarget && <RelationDialog source={relationSource} target={relationTarget} onClose={() => setPendingConnection(null)} onCreate={createRelation} />}
        {conflict && <ConflictDialog local={document} remote={conflict.remote} conflictingPaths={conflict.conflictingPaths} onClose={() => undefined} onResolve={(choice) => void resolveConflict(choice)} />}
      </Suspense>
    </div>
  )
}
