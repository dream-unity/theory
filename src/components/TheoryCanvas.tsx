import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type NodeMouseHandler,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Eye, Link2, Maximize2, PanelRightOpen, Plus, Sparkles } from 'lucide-react'
import { clientPoint } from '../lib/canvas'
import type { Portal, TheoryDocument, TheoryEdge, TheoryView } from '../types'
import { ConceptNode, type ConceptCardData, type ConceptFlowNode } from './ConceptNode'

const nodeTypes = { concept: ConceptNode }

const edgeColors: Record<TheoryEdge['family'], string> = {
  structure: '#08798a',
  dynamics: '#0e7490',
  reasoning: '#8a5a00',
  correspondence: '#6250a8',
  integration: '#1e7a45',
  provenance: '#64748b',
}

const minimapFill: Record<Portal | 'ether', string> = {
  maker: '#08798a',
  machine: '#8a5a00',
  world: '#1e7a45',
  unity: '#6250a8',
  ether: '#82939e',
}

function preferredTransitionDuration() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 180
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0
  return window.matchMedia('(pointer: coarse)').matches ? 90 : 180
}

function sameCard(left: ConceptCardData, right: ConceptCardData) {
  return left.title === right.title &&
    left.type === right.type &&
    left.essence === right.essence &&
    left.portal === right.portal &&
    left.portals === right.portals &&
    left.stance === right.stance &&
    left.maturity === right.maturity &&
    left.dimmed === right.dimmed &&
    left.relationCount === right.relationCount &&
    left.isCore === right.isCore &&
    left.editing === right.editing
}

function reconcileNodes(current: ConceptFlowNode[], next: ConceptFlowNode[]) {
  const currentById = new Map(current.map((node) => [node.id, node]))
  let changed = current.length !== next.length
  const reconciled = next.map((candidate) => {
    const existing = currentById.get(candidate.id)
    if (!existing) {
      changed = true
      return candidate
    }
    const data = sameCard(existing.data, candidate.data) ? existing.data : candidate.data
    const position = existing.dragging ? existing.position : candidate.position
    const unchanged = existing.selected === candidate.selected &&
      existing.zIndex === candidate.zIndex &&
      existing.position.x === position.x &&
      existing.position.y === position.y &&
      existing.data === data
    if (unchanged) return existing
    changed = true
    return { ...existing, ...candidate, data, position, dragging: existing.dragging, measured: existing.measured }
  })
  return changed ? reconciled : current
}

export interface CameraRequest {
  id: string
  nonce: number
}

type MenuEvent = { preventDefault(): void; stopPropagation(): void; clientX: number; clientY: number }

interface TheoryCanvasProps {
  document: TheoryDocument
  view: TheoryView
  selectedNodeId: string | null
  selectedEdgeId: string | null
  editingNodeId?: string | null
  focusDepth: 0 | 1 | 2
  lasso?: boolean
  camera?: CameraRequest | null
  visiblePortals: Set<string>
  visibleEdgeFamilies: Set<TheoryEdge['family']>
  onSelectNode: (id: string | null) => void
  onInspectNode?: (id: string) => void
  onSelectEdge: (id: string | null) => void
  onSelectionChange: (ids: string[]) => void
  onMoveNode: (id: string, position: { x: number; y: number }) => void
  onCreateAt: (position: { x: number; y: number }, connectFrom?: string) => void
  onConnect: (connection: Connection) => void
  onSetLasso?: (value: boolean) => void
  onTighten?: () => void
  onRenameNode?: (id: string) => void
}

export function TheoryCanvas({
  document,
  view,
  selectedNodeId,
  selectedEdgeId,
  editingNodeId = null,
  focusDepth,
  lasso = false,
  camera = null,
  visiblePortals,
  visibleEdgeFamilies,
  onSelectNode,
  onInspectNode,
  onSelectEdge,
  onSelectionChange,
  onMoveNode,
  onCreateAt,
  onConnect,
  onSetLasso,
  onTighten,
  onRenameNode,
}: TheoryCanvasProps) {
  const inspect = onInspectNode ?? ((id: string) => onSelectNode(id))
  const setLassoMode = onSetLasso ?? (() => undefined)
  const tighten = onTighten ?? (() => undefined)
  const [instance, setInstance] = useState<ReactFlowInstance<ConceptFlowNode, Edge> | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(true)
  const [spacePan, setSpacePan] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId?: string; flow?: { x: number; y: number } } | null>(null)
  const [transitionDuration] = useState(preferredTransitionDuration)
  const hideHint = useCallback(() => setHintVisible(false), [])
  const lastFitKey = useRef<string | null>(null)

  const neighborhood = useMemo(() => {
    if (!selectedNodeId || focusDepth === 0) return null
    let frontier = new Set([selectedNodeId])
    const visited = new Set(frontier)
    for (let depth = 0; depth < focusDepth; depth += 1) {
      const next = new Set<string>()
      for (const edge of document.edges) {
        if (frontier.has(edge.from)) next.add(edge.to)
        if (frontier.has(edge.to)) next.add(edge.from)
      }
      for (const id of next) visited.add(id)
      frontier = next
    }
    return visited
  }, [document.edges, focusDepth, selectedNodeId])

  const relationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of document.edges) {
      counts.set(edge.from, (counts.get(edge.from) ?? 0) + 1)
      counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1)
    }
    return counts
  }, [document.edges])

  const visibleConcepts = useMemo(() => {
    const included = view.id === 'whole-theory'
      ? new Set(document.nodes.map((concept) => concept.id))
      : new Set(view.includedNodeIds)
    return document.nodes.filter((concept) =>
      included.has(concept.id) &&
      (concept.facets.portals.length === 0 || concept.facets.portals.some((portal) => visiblePortals.has(portal))),
    )
  }, [document.nodes, view.id, view.includedNodeIds, visiblePortals])

  const derivedNodes = useMemo<ConceptFlowNode[]>(() => visibleConcepts.map((concept, index) => {
    const portals = concept.facets.portals
    const stored = view.positions[concept.id]
    return {
      id: concept.id,
      type: 'concept',
      position: stored ?? { x: (index % 6) * 260 - 650, y: Math.floor(index / 6) * 140 - 280 },
      selected: concept.id === selectedNodeId,
      data: {
        title: concept.title,
        type: concept.type,
        essence: concept.essence,
        portal: portals.length > 1 ? 'unity' : portals[0] ?? 'ether',
        portals,
        stance: concept.epistemics.stance,
        maturity: concept.epistemics.maturity,
        dimmed: !!neighborhood && !neighborhood.has(concept.id),
        relationCount: relationCounts.get(concept.id) ?? 0,
        isCore: concept.id === 'unity-core' || concept.id === view.rootNodeId,
        editing: editingNodeId === concept.id,
      },
      zIndex: concept.id === selectedNodeId ? 20 : concept.id === view.rootNodeId ? 8 : 1,
      ariaLabel: `${concept.title}, ${concept.type}`,
    }
  }), [editingNodeId, neighborhood, relationCounts, selectedNodeId, view.positions, view.rootNodeId, visibleConcepts])

  const nodeIds = useMemo(() => new Set(derivedNodes.map((node) => node.id)), [derivedNodes])

  const derivedEdges = useMemo<Edge[]>(() =>
    document.edges
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && visibleEdgeFamilies.has(edge.family))
      .map((edge) => {
        const connected = edge.from === selectedNodeId || edge.to === selectedNodeId || edge.from === hoveredNodeId || edge.to === hoveredNodeId
        const dimmed = !!neighborhood && (!neighborhood.has(edge.from) || !neighborhood.has(edge.to))
        const highlighted = edge.id === selectedEdgeId || edge.id === hoveredEdgeId
        const superseded = edge.status === 'superseded'
        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          label: highlighted || connected ? `${edge.relation}${superseded ? ' · superseded' : ''}` : edge.relation,
          type: 'smoothstep',
          selected: edge.id === selectedEdgeId,
          animated: highlighted || connected,
          interactionWidth: 36,
          style: {
            stroke: superseded ? '#64748b' : edgeColors[edge.family],
            strokeWidth: highlighted ? 3 : connected ? 2.4 : 1.85,
            opacity: dimmed ? 0.16 : superseded ? highlighted ? 0.55 : 0.28 : highlighted ? 1 : connected ? 0.98 : 0.72,
            strokeDasharray: superseded ? '2 8' : edge.status === 'contested' ? '6 5' : undefined,
          },
          labelStyle: {
            fill: highlighted || connected ? '#172033' : '#5b6b80',
            fontSize: highlighted || connected ? 11 : 10,
            fontWeight: highlighted || connected ? 650 : 600,
          },
          labelBgStyle: { fill: '#ffffff', fillOpacity: highlighted || connected ? 0.96 : 0.82 },
          labelBgPadding: [5, 2] as [number, number],
          labelBgBorderRadius: 6,
          markerEnd: { type: 'arrowclosed' as const, color: superseded ? '#64748b' : edgeColors[edge.family], width: 15, height: 15 },
        }
      }),
  [document.edges, hoveredEdgeId, hoveredNodeId, neighborhood, nodeIds, selectedEdgeId, selectedNodeId, visibleEdgeFamilies])

  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptFlowNode>(derivedNodes)
  useEffect(() => setNodes((current) => reconcileNodes(current, derivedNodes)), [derivedNodes, setNodes])

  const fitAll = useCallback(() => {
    void instance?.fitView({ padding: 0.16, maxZoom: 0.92, minZoom: 0.18, duration: transitionDuration })
  }, [instance, transitionDuration])

  useEffect(() => {
    if (!instance) return
    const key = `${view.id}:${derivedNodes.length}`
    if (lastFitKey.current === key) return
    lastFitKey.current = key
    const frame = window.requestAnimationFrame(() => {
      void instance.fitView({ padding: 0.16, maxZoom: 0.92, minZoom: 0.18, duration: transitionDuration })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [derivedNodes.length, instance, transitionDuration, view.id])

  useEffect(() => {
    if (!instance || !camera) return
    const position = view.positions[camera.id] ?? derivedNodes.find((node) => node.id === camera.id)?.position
    if (!position) return
    const frame = window.requestAnimationFrame(() => {
      const selected = instance.getNode(camera.id)
      const width = selected?.measured?.width ?? 220
      const height = selected?.measured?.height ?? 86
      void instance.setCenter(position.x + width / 2, position.y + height / 2, {
        zoom: Math.max(instance.getZoom(), 0.78),
        duration: transitionDuration,
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [camera, derivedNodes, instance, transitionDuration, view.positions])

  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTyping(event.target) && !event.repeat) {
        event.preventDefault()
        setSpacePan(true)
      }
      if (event.key === 'Escape') setMenu(null)
    }
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePan(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const handleNodeClick = useCallback<NodeMouseHandler<ConceptFlowNode>>((event, node) => {
    event.stopPropagation()
    setMenu(null)
    onSelectEdge(null)
    onSelectNode(node.id)
    hideHint()
  }, [hideHint, onSelectEdge, onSelectNode])

  const handleNodeDoubleClick = useCallback<NodeMouseHandler<ConceptFlowNode>>((event, node) => {
    event.stopPropagation()
    setMenu(null)
    inspect(node.id)
  }, [inspect])

  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!instance) return
    if (event.target instanceof Element && event.target.closest('.react-flow__node, .react-flow__edge, button, input')) return
    hideHint()
    setMenu(null)
    onCreateAt(instance.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }, [hideHint, instance, onCreateAt])

  const handleSelection = useCallback(({ nodes: selection }: OnSelectionChangeParams) => {
    onSelectionChange(selection.map((node) => node.id))
  }, [onSelectionChange])

  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (state.isValid || !state.fromNode || !instance) return
    const target = event.target as Element | null
    if (target?.closest?.('.react-flow__node')) return
    hideHint()
    const point = clientPoint(event)
    const flowPoint = instance.screenToFlowPosition(point)
    const origin = state.fromNode.position
    if (Math.hypot(flowPoint.x - origin.x, flowPoint.y - origin.y) < 90) return
    onCreateAt(flowPoint, state.fromNode.id)
  }, [hideHint, instance, onCreateAt])

  const openMenu = useCallback((event: MenuEvent, nodeId?: string) => {
    event.preventDefault()
    event.stopPropagation()
    hideHint()
    const flow = instance?.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    setMenu({ x: event.clientX, y: event.clientY, nodeId, flow })
    if (nodeId) {
      onSelectEdge(null)
      onSelectNode(nodeId)
    }
  }, [hideHint, instance, onSelectEdge, onSelectNode])

  const hoveredConcept = hoveredNodeId ? document.nodes.find((node) => node.id === hoveredNodeId) : undefined
  const selectedConcept = selectedNodeId ? document.nodes.find((node) => node.id === selectedNodeId) : undefined
  const panMode = !lasso || spacePan

  return (
    <div className={`canvas-shell ${panMode ? 'is-pan' : 'is-lasso'}${spacePan ? ' is-panning' : ''}`} aria-label="Dream Unity theory canvas">
      <style>{`
        .canvas-shell{background:radial-gradient(circle at 18% 12%, rgba(8,121,138,.08), transparent 28%),radial-gradient(circle at 82% 18%, rgba(98,80,168,.08), transparent 26%),radial-gradient(circle at 50% 88%, rgba(30,122,69,.07), transparent 30%),#f3f6fb}
        .canvas-shell .react-flow__background circle{fill:#c5cedb !important}
        .concept-node{width:228px;min-height:86px;padding:13px 14px 12px;border:1px solid color-mix(in srgb,var(--node-accent) 38%,#d5dde8);border-radius:14px;background:#fff;box-shadow:0 10px 24px rgba(23,32,51,.08)}
        .concept-node.is-selected{border-width:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--node-accent) 18%,transparent)}
        .concept-node.unity-node{width:248px;background:linear-gradient(180deg,#f7f4ff,#ffffff)}
        .canvas-status{position:absolute;z-index:10;top:12px;right:12px;display:flex;gap:8px;padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:#ffffffee;color:var(--muted);font-size:11px;font-weight:650;pointer-events:none}
        .canvas-status span + span::before{content:"·";margin-right:8px;color:var(--faint)}
        .canvas-context-menu{position:fixed;z-index:80;min-width:196px;padding:6px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:0 18px 44px rgba(23,32,51,.18)}
        .canvas-context-menu button{display:block;width:100%;min-height:38px;padding:0 11px;border:0;border-radius:8px;background:transparent;color:var(--text);text-align:left;cursor:pointer;font-size:13px;font-weight:600}
        .canvas-context-menu button:hover{background:var(--surface-2)}
        .overview-count-badge{display:none !important}
      `}</style>
      <ReactFlow<ConceptFlowNode>
        nodes={nodes}
        edges={derivedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={(event, node) => openMenu(event, node.id)}
        onPaneContextMenu={(event) => openMenu(event)}
        onEdgeClick={(_event, edge) => { setMenu(null); onSelectNode(null); onSelectEdge(edge.id) }}
        onEdgeMouseEnter={(_event, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        onPaneClick={() => { setMenu(null); onSelectNode(null); onSelectEdge(null) }}
        onDoubleClick={handlePaneDoubleClick}
        onNodeDragStart={hideHint}
        onNodeDragStop={(_event, node) => onMoveNode(node.id, node.position)}
        onConnect={onConnect}
        onConnectEnd={handleConnectEnd}
        onSelectionChange={handleSelection}
        onInit={setInstance}
        onMoveStart={hideHint}
        minZoom={0.14}
        maxZoom={1.9}
        defaultViewport={{ x: 0, y: 0, zoom: 0.62 }}
        connectionMode={ConnectionMode.Loose}
        connectionLineStyle={{ stroke: '#6250a8', strokeWidth: 2.4 }}
        panOnDrag={panMode}
        selectionOnDrag={!panMode}
        panOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        selectNodesOnDrag={false}
        autoPanOnConnect
        autoPanOnNodeDrag
        elevateNodesOnSelect
        elevateEdgesOnSelect
        deleteKeyCode={null}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        selectionKeyCode="Shift"
        nodesFocusable
        edgesFocusable
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.15} color="rgba(71, 85, 105, .2)" />
        <Controls position="bottom-left" showInteractive={false} onFitView={fitAll} />
        <MiniMap className="theory-minimap" pannable zoomable position="bottom-right" nodeColor={(node) => minimapFill[(node.data as ConceptCardData).portal]} maskColor="rgba(23,32,51,.1)" />
      </ReactFlow>
      <div className="canvas-status" aria-live="polite">
        <span>{visibleConcepts.length} ideas</span>
        <span>{derivedEdges.length} links</span>
        <span>{panMode ? 'Drag to pan' : 'Lasso select'}</span>
      </div>
      {hoveredConcept && hoveredConcept.id !== selectedNodeId && hoveredConcept.essence && (
        <div className="node-hover-card" role="tooltip">{hoveredConcept.essence}</div>
      )}
      {selectedConcept && (
        <div className="selection-hud" role="toolbar" aria-label="Selected idea">
          <span className="selection-hud-title">{selectedConcept.title}</span>
          <button type="button" onClick={() => inspect(selectedConcept.id)} title="Open editor (Enter)">
            <PanelRightOpen size={15} /> Open
          </button>
          <button type="button" onClick={() => onCreateAt({
            x: (view.positions[selectedConcept.id]?.x ?? 0) + 280,
            y: view.positions[selectedConcept.id]?.y ?? 0,
          }, selectedConcept.id)} title="Add a connected idea (Tab)">
            <Plus size={15} /> Related
          </button>
          <button type="button" onClick={() => setLassoMode(!lasso)} title="Toggle lasso select">
            <Link2 size={15} /> {lasso && !spacePan ? 'Pan' : 'Lasso'}
          </button>
          <button type="button" onClick={fitAll} title="Fit the whole map">
            <Maximize2 size={15} /> Fit
          </button>
        </div>
      )}
      <div className="canvas-tools" role="group" aria-label="Map tools">
        <button type="button" className={panMode ? 'active' : ''} onClick={() => setLassoMode(false)}>Pan</button>
        <button type="button" className={!panMode ? 'active' : ''} onClick={() => setLassoMode(true)}>Lasso</button>
        <button type="button" onClick={fitAll}><Maximize2 size={14} /> Fit all</button>
        <button type="button" onClick={() => tighten()}><Sparkles size={14} /> Tighten</button>
        {focusDepth > 0 && <span className="canvas-tools-note"><Eye size={13} /> Neighbour focus</span>}
      </div>
      {hintVisible && (
        <div className="canvas-hint">
          Drag empty space to pan · Double-click or right-click to add · Drag a dot onto the page to connect
        </div>
      )}
      {menu && (
        <div className="canvas-context-menu" style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 220) }} role="menu">
          {menu.nodeId ? (
            <>
              <button type="button" onClick={() => { inspect(menu.nodeId!); setMenu(null) }}>Open idea</button>
              <button type="button" onClick={() => { onRenameNode?.(menu.nodeId!); setMenu(null) }}>Rename</button>
              <button type="button" onClick={() => {
                const origin = view.positions[menu.nodeId!] ?? { x: 0, y: 0 }
                onCreateAt({ x: origin.x + 280, y: origin.y }, menu.nodeId)
                setMenu(null)
              }}>Add related idea</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { if (menu.flow) onCreateAt(menu.flow); setMenu(null) }}>Add idea here</button>
              <button type="button" onClick={() => { fitAll(); setMenu(null) }}>Fit whole map</button>
              <button type="button" onClick={() => { tighten(); setMenu(null) }}>Tighten layout</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
