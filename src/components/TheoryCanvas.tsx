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
import { Eye, Link2, Maximize2, PanelRightOpen, Plus } from 'lucide-react'
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

interface TheoryCanvasProps {
  document: TheoryDocument
  view: TheoryView
  selectedNodeId: string | null
  selectedEdgeId: string | null
  editingNodeId: string | null
  focusDepth: 0 | 1 | 2
  lasso: boolean
  camera: CameraRequest | null
  visiblePortals: Set<string>
  visibleEdgeFamilies: Set<TheoryEdge['family']>
  onSelectNode: (id: string | null) => void
  onInspectNode: (id: string) => void
  onSelectEdge: (id: string | null) => void
  onSelectionChange: (ids: string[]) => void
  onMoveNode: (id: string, position: { x: number; y: number }) => void
  onCreateAt: (position: { x: number; y: number }, connectFrom?: string) => void
  onConnect: (connection: Connection) => void
  onSetLasso: (value: boolean) => void
}

export function TheoryCanvas({
  document,
  view,
  selectedNodeId,
  selectedEdgeId,
  editingNodeId,
  focusDepth,
  lasso,
  camera,
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
}: TheoryCanvasProps) {
  const [instance, setInstance] = useState<ReactFlowInstance<ConceptFlowNode, Edge> | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(true)
  const [transitionDuration] = useState(preferredTransitionDuration)
  const hideHint = useCallback(() => setHintVisible(false), [])
  const lastView = useRef<string | null>(null)

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
    const included = new Set(view.includedNodeIds)
    return document.nodes.filter((concept) =>
      included.has(concept.id) &&
      (concept.facets.portals.length === 0 || concept.facets.portals.some((portal) => visiblePortals.has(portal))) &&
      !view.positions[concept.id]?.hidden,
    )
  }, [document.nodes, view.includedNodeIds, view.positions, visiblePortals])

  const derivedNodes = useMemo<ConceptFlowNode[]>(() => visibleConcepts.map((concept) => {
    const portals = concept.facets.portals
    return {
      id: concept.id,
      type: 'concept',
      position: view.positions[concept.id] ?? { x: 0, y: 0 },
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
        const connected = edge.from === selectedNodeId || edge.to === selectedNodeId
        const dimmed = !!neighborhood && (!neighborhood.has(edge.from) || !neighborhood.has(edge.to))
        const highlighted = edge.id === selectedEdgeId || edge.id === hoveredEdgeId
        const superseded = edge.status === 'superseded'
        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          label: highlighted ? `${edge.relation}${superseded ? ' · superseded' : ''}` : undefined,
          type: 'smoothstep',
          selected: edge.id === selectedEdgeId,
          animated: false,
          interactionWidth: 28,
          style: {
            stroke: superseded ? '#64748b' : edgeColors[edge.family],
            strokeWidth: highlighted ? 2.6 : connected ? 2 : 1.15,
            opacity: dimmed ? 0.08 : superseded ? highlighted ? 0.55 : 0.16 : highlighted ? 1 : connected ? 0.9 : 0.42,
            strokeDasharray: superseded ? '2 8' : edge.status === 'contested' ? '6 5' : undefined,
          },
          labelStyle: { fill: '#172033', fontSize: 11, fontWeight: 650 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.96 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
          markerEnd: { type: 'arrowclosed' as const, color: superseded ? '#64748b' : edgeColors[edge.family], width: 14, height: 14 },
        }
      }),
  [document.edges, hoveredEdgeId, neighborhood, nodeIds, selectedEdgeId, selectedNodeId, visibleEdgeFamilies])

  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptFlowNode>(derivedNodes)
  useEffect(() => setNodes((current) => reconcileNodes(current, derivedNodes)), [derivedNodes, setNodes])

  useEffect(() => {
    if (!instance || lastView.current === view.id) return
    lastView.current = view.id
    const frame = window.requestAnimationFrame(() => {
      void instance.fitView({ padding: 0.2, maxZoom: 1, minZoom: 0.22, duration: transitionDuration })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [instance, transitionDuration, view.id])

  useEffect(() => {
    if (!instance || !camera) return
    const position = view.positions[camera.id]
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
  }, [camera, instance, transitionDuration, view.positions])

  const handleNodeClick = useCallback<NodeMouseHandler<ConceptFlowNode>>((event, node) => {
    event.stopPropagation()
    onSelectEdge(null)
    onSelectNode(node.id)
    hideHint()
  }, [hideHint, onSelectEdge, onSelectNode])

  const handleNodeDoubleClick = useCallback<NodeMouseHandler<ConceptFlowNode>>((event, node) => {
    event.stopPropagation()
    onInspectNode(node.id)
  }, [onInspectNode])

  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!instance) return
    if (event.target instanceof Element && event.target.closest('.react-flow__node, .react-flow__edge, button, input')) return
    hideHint()
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

  const hoveredConcept = hoveredNodeId ? document.nodes.find((node) => node.id === hoveredNodeId) : undefined
  const selectedConcept = selectedNodeId ? document.nodes.find((node) => node.id === selectedNodeId) : undefined

  const fitAll = useCallback(() => {
    void instance?.fitView({ padding: 0.2, maxZoom: 1, duration: transitionDuration })
  }, [instance, transitionDuration])

  return (
    <div className={`canvas-shell ${lasso ? 'is-lasso' : 'is-pan'}`} aria-label="Dream Unity theory canvas">
      <ReactFlow<ConceptFlowNode>
        nodes={nodes}
        edges={derivedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeClick={(_event, edge) => { onSelectNode(null); onSelectEdge(edge.id) }}
        onEdgeMouseEnter={(_event, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        onPaneClick={() => { onSelectNode(null); onSelectEdge(null) }}
        onDoubleClick={handlePaneDoubleClick}
        onNodeDragStart={hideHint}
        onNodeDragStop={(_event, node) => onMoveNode(node.id, node.position)}
        onConnect={onConnect}
        onConnectEnd={handleConnectEnd}
        onSelectionChange={handleSelection}
        onInit={setInstance}
        onMoveStart={hideHint}
        minZoom={0.16}
        maxZoom={1.9}
        defaultViewport={{ x: 0, y: 0, zoom: 0.72 }}
        connectionMode={ConnectionMode.Loose}
        panOnDrag={!lasso}
        selectionOnDrag={lasso}
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
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(71, 85, 105, .16)" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          className="theory-minimap"
          pannable
          zoomable
          position="bottom-right"
          nodeColor={(node) => minimapFill[(node.data as ConceptCardData).portal]}
          maskColor="rgba(23,32,51,.08)"
        />
      </ReactFlow>

      {hoveredConcept && hoveredConcept.id !== selectedNodeId && hoveredConcept.essence && (
        <div className="node-hover-card" role="tooltip">{hoveredConcept.essence}</div>
      )}

      {selectedConcept && (
        <div className="selection-hud" role="toolbar" aria-label="Selected idea">
          <span className="selection-hud-title">{selectedConcept.title}</span>
          <button type="button" onClick={() => onInspectNode(selectedConcept.id)} title="Open editor (Enter)">
            <PanelRightOpen size={15} /> Open
          </button>
          <button type="button" onClick={() => onCreateAt({
            x: (view.positions[selectedConcept.id]?.x ?? 0) + 280,
            y: view.positions[selectedConcept.id]?.y ?? 0,
          }, selectedConcept.id)} title="Add a connected idea (Tab)">
            <Plus size={15} /> Related
          </button>
          <button type="button" onClick={() => onSetLasso(!lasso)} title="Toggle lasso select">
            <Link2 size={15} /> {lasso ? 'Pan' : 'Lasso'}
          </button>
          <button type="button" onClick={fitAll} title="Fit the whole map">
            <Maximize2 size={15} /> Fit
          </button>
        </div>
      )}

      <div className="canvas-tools" role="group" aria-label="Map tools">
        <button type="button" className={!lasso ? 'active' : ''} onClick={() => onSetLasso(false)}>Pan</button>
        <button type="button" className={lasso ? 'active' : ''} onClick={() => onSetLasso(true)}>Lasso</button>
        <button type="button" onClick={fitAll}><Maximize2 size={14} /> Fit</button>
        {focusDepth > 0 && <span className="canvas-tools-note"><Eye size={13} /> Neighbour focus</span>}
      </div>

      {hintVisible && (
        <div className="canvas-hint">
          Drag empty space to pan · Double-click to add · Drag a dot to connect · Shift-drag to lasso
        </div>
      )}
    </div>
  )
}
