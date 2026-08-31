import { useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type NodeMouseHandler,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Portal, TheoryDocument, TheoryEdge, TheoryNode, TheoryView } from '../types'
import { ConceptNode, type ConceptFlowNode } from './ConceptNode'

const nodeTypes = { concept: ConceptNode }

const OVERVIEW_ZOOM = 0.5
const OVERVIEW_NODE_LIMIT = 12
const PORTAL_ORDER: Array<Portal | 'ether'> = ['unity', 'maker', 'machine', 'world', 'ether']

const maturityWeight: Record<TheoryNode['epistemics']['maturity'], number> = {
  seed: 0,
  articulated: 1,
  connected: 2,
  challenged: 3,
  grounded: 4,
  realised: 5,
  integrated: 6,
}

const typeWeight: Partial<Record<TheoryNode['type'], number>> = {
  model: 8,
  synthesis: 8,
  mechanism: 5,
  question: 4,
  tension: 4,
}

const edgeColors: Record<TheoryEdge['family'], string> = {
  structure: '#6887a8',
  dynamics: '#71d8e7',
  reasoning: '#d9b86d',
  correspondence: '#a28ce0',
  integration: '#e8dcac',
  provenance: '#82939e',
}

const portalColors: Record<Portal, string> = {
  maker: '#6ed8ea',
  machine: '#d9b86d',
  world: '#7ecb99',
  unity: '#aaa0ee',
}

function reducedMotionIsPreferred() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

interface TheoryCanvasProps {
  document: TheoryDocument
  view: TheoryView
  selectedNodeId: string | null
  selectedEdgeId: string | null
  focusDepth: 0 | 1 | 2
  visiblePortals: Set<string>
  onSelectNode: (id: string | null) => void
  onSelectEdge: (id: string | null) => void
  onSelectionChange: (ids: string[]) => void
  onMoveNode: (id: string, position: { x: number; y: number }) => void
  onCreateAt: (position: { x: number; y: number }) => void
  onConnect: (connection: Connection) => void
}

export function TheoryCanvas({
  document,
  view,
  selectedNodeId,
  selectedEdgeId,
  focusDepth,
  visiblePortals,
  onSelectNode,
  onSelectEdge,
  onSelectionChange,
  onMoveNode,
  onCreateAt,
  onConnect,
}: TheoryCanvasProps) {
  const [zoom, setZoom] = useState(0.62)
  const [instance, setInstance] = useState<ReactFlowInstance<ConceptFlowNode, Edge> | null>(null)
  const [transitionDuration] = useState(() => reducedMotionIsPreferred() ? 0 : 520)

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

  const nodeTitles = useMemo(() => new Map(document.nodes.map((node) => [node.id, node.title])), [document.nodes])
  const conceptsById = useMemo(() => new Map(document.nodes.map((node) => [node.id, node])), [document.nodes])

  const visibleConcepts = useMemo(() => {
    const included = new Set(view.includedNodeIds)
    return document.nodes
      .filter((concept) => included.has(concept.id))
      .filter((concept) => concept.facets.portals.length === 0 || concept.facets.portals.some((portal) => visiblePortals.has(portal)))
      .filter((concept) => !view.positions[concept.id]?.hidden)
  }, [document.nodes, view.includedNodeIds, view.positions, visiblePortals])

  const visibleConceptIds = useMemo(() => new Set(visibleConcepts.map((concept) => concept.id)), [visibleConcepts])
  const isLargeView = visibleConcepts.length > OVERVIEW_NODE_LIMIT
  const isOverview = zoom < OVERVIEW_ZOOM && isLargeView

  const overviewNodeIds = useMemo(() => {
    if (!isOverview) return visibleConceptIds

    const activeEdges = document.edges.filter((edge) =>
      visibleConceptIds.has(edge.from) &&
      visibleConceptIds.has(edge.to) &&
      view.visibleEdgeFamilies.includes(edge.family),
    )
    const activeDegree = new Map<string, number>()
    for (const edge of activeEdges) {
      activeDegree.set(edge.from, (activeDegree.get(edge.from) ?? 0) + 1)
      activeDegree.set(edge.to, (activeDegree.get(edge.to) ?? 0) + 1)
    }

    const score = (concept: TheoryNode) =>
      (activeDegree.get(concept.id) ?? 0) * 5 +
      (typeWeight[concept.type] ?? 0) +
      maturityWeight[concept.epistemics.maturity]

    const ranked = [...visibleConcepts].sort((left, right) => {
      const difference = score(right) - score(left)
      return difference || left.title.localeCompare(right.title)
    })
    const retained = new Set<string>()
    const retain = (id: string | undefined) => {
      if (id && visibleConceptIds.has(id) && retained.size < OVERVIEW_NODE_LIMIT) retained.add(id)
    }

    retain(view.rootNodeId)
    retain(selectedNodeId ?? undefined)

    for (const portal of PORTAL_ORDER) {
      const landmark = ranked.find((concept) =>
        portal === 'ether' ? concept.facets.portals.length === 0 : concept.facets.portals.includes(portal),
      )
      retain(landmark?.id)
    }

    if (selectedNodeId) {
      const neighborIds = new Set<string>()
      for (const edge of activeEdges) {
        if (edge.from === selectedNodeId) neighborIds.add(edge.to)
        if (edge.to === selectedNodeId) neighborIds.add(edge.from)
      }
      for (const concept of ranked) {
        if (neighborIds.has(concept.id)) retain(concept.id)
      }
    }

    for (const concept of ranked) retain(concept.id)
    return retained
  }, [document.edges, isOverview, selectedNodeId, view.rootNodeId, view.visibleEdgeFamilies, visibleConceptIds, visibleConcepts])

  const derivedNodes = useMemo<ConceptFlowNode[]>(() => {
    return visibleConcepts
      .filter((concept) => overviewNodeIds.has(concept.id))
      .map((concept) => ({
        id: concept.id,
        type: 'concept',
        position: view.positions[concept.id] ?? { x: 0, y: 0 },
        selected: concept.id === selectedNodeId,
        data: {
          concept,
          zoom,
          overview: isOverview,
          dimmed: !!neighborhood && !neighborhood.has(concept.id),
          relationCount: relationCounts.get(concept.id) ?? 0,
        },
        zIndex: concept.id === selectedNodeId ? 20 : concept.id === 'unity-core' ? 10 : 1,
        ariaLabel: `${concept.title}, ${concept.type}`,
      }))
  }, [isOverview, neighborhood, overviewNodeIds, relationCounts, selectedNodeId, view.positions, visibleConcepts, zoom])

  const nodeIds = useMemo(() => new Set(derivedNodes.map((node) => node.id)), [derivedNodes])
  const derivedEdges = useMemo<Edge[]>(() =>
    document.edges
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .filter((edge) => view.visibleEdgeFamilies.includes(edge.family))
      .map((edge) => {
        const connected = edge.from === selectedNodeId || edge.to === selectedNodeId
        const dimmed = !!neighborhood && (!neighborhood.has(edge.from) || !neighborhood.has(edge.to))
        const superseded = edge.status === 'superseded'
        const baseOpacity = dimmed ? 0.06 : connected ? 0.95 : zoom < OVERVIEW_ZOOM ? 0.22 : 0.38
        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          label: zoom >= 0.74 || connected ? `${edge.relation}${superseded ? ' · superseded' : ''}` : undefined,
          type: 'smoothstep',
          selected: edge.id === selectedEdgeId,
          animated: connected && !superseded && transitionDuration > 0,
          style: {
            stroke: superseded ? '#555c6b' : edgeColors[edge.family],
            strokeWidth: superseded ? edge.id === selectedEdgeId ? 1.8 : 1 : edge.id === selectedEdgeId ? 2.8 : connected ? 2.1 : 1.2,
            opacity: superseded ? edge.id === selectedEdgeId ? 0.5 : connected ? 0.24 : 0.07 : baseOpacity,
            strokeDasharray: superseded ? '2 8' : edge.status === 'contested' ? '6 5' : undefined,
          },
          labelStyle: { fill: superseded ? '#777d8c' : '#ddd8c9', fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: '#111522', fillOpacity: 0.94 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 5,
          markerEnd: { type: 'arrowclosed' as const, color: superseded ? '#555c6b' : edgeColors[edge.family], width: 15, height: 15 },
          ariaLabel: `${nodeTitles.get(edge.from) ?? edge.from} ${edge.relation} ${nodeTitles.get(edge.to) ?? edge.to}, ${edge.status} relation`,
        }
      }),
  [document.edges, neighborhood, nodeIds, nodeTitles, selectedEdgeId, selectedNodeId, transitionDuration, view.visibleEdgeFamilies, zoom])

  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptFlowNode>(derivedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges)

  useEffect(() => setNodes(derivedNodes), [derivedNodes, setNodes])
  useEffect(() => setEdges(derivedEdges), [derivedEdges, setEdges])

  useEffect(() => {
    if (!instance) return
    const frame = window.requestAnimationFrame(() => {
      void instance.fitView({
        padding: 0.22,
        maxZoom: isLargeView ? OVERVIEW_ZOOM - 0.04 : 0.82,
        duration: transitionDuration,
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [instance, isLargeView, transitionDuration, view.id])

  useEffect(() => {
    if (!instance || !selectedNodeId || !view.positions[selectedNodeId]) return
    const frame = window.requestAnimationFrame(() => {
      const selected = instance.getNode(selectedNodeId)
      const position = view.positions[selectedNodeId]
      const targetZoom = Math.max(instance.getZoom(), 0.78)
      const expandsFromOverview = instance.getZoom() < OVERVIEW_ZOOM && targetZoom >= OVERVIEW_ZOOM
      const normalWidth = selectedNodeId === 'unity-core' ? 275 : 245
      const normalHeight = selectedNodeId === 'unity-core' ? 104 : 96
      const width = expandsFromOverview ? normalWidth : selected?.measured?.width ?? selected?.width ?? normalWidth
      const height = expandsFromOverview ? normalHeight : selected?.measured?.height ?? selected?.height ?? normalHeight
      void instance.setCenter(position.x + width / 2, position.y + height / 2, {
        zoom: targetZoom,
        duration: transitionDuration,
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [instance, selectedNodeId, transitionDuration, view.id])

  const handleNodeClick: NodeMouseHandler<ConceptFlowNode> = (_event, node) => {
    onSelectEdge(null)
    onSelectNode(node.id)
  }

  const handlePaneDoubleClick = (event: React.MouseEvent) => {
    if (!instance) return
    if (event.target instanceof Element && event.target.closest('.react-flow__node, .react-flow__edge, button')) return
    onCreateAt(instance.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }

  const handleSelection = ({ nodes: selection }: OnSelectionChangeParams) => {
    onSelectionChange(selection.map((node) => node.id))
  }

  return (
    <div className="canvas-shell" aria-label="Dream Unity theory canvas">
      <ReactFlow<ConceptFlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={(_event, edge) => { onSelectNode(null); onSelectEdge(edge.id) }}
        onPaneClick={() => { onSelectNode(null); onSelectEdge(null) }}
        onDoubleClick={handlePaneDoubleClick}
        onNodeDragStop={(_event, node) => onMoveNode(node.id, node.position)}
        onConnect={onConnect}
        onSelectionChange={handleSelection}
        onInit={setInstance}
        onMove={(_event, viewport) => {
          const quantized = Math.round(viewport.zoom * 20) / 20
          setZoom((current) => current === quantized ? current : quantized)
        }}
        minZoom={0.18}
        maxZoom={1.8}
        defaultViewport={{ x: 0, y: 0, zoom: 0.62 }}
        selectionOnDrag
        panOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        nodesFocusable
        edgesFocusable
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(222, 224, 239, .11)" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          className="theory-minimap"
          ariaLabel="Overview of the current theory landscape"
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={(mapNode) => {
            const portals = conceptsById.get(mapNode.id)?.facets.portals ?? []
            if (portals.length > 1) return '#e7e3da'
            return portals[0] ? portalColors[portals[0]] : '#82939e'
          }}
          nodeStrokeColor={(mapNode) => {
            const portals = conceptsById.get(mapNode.id)?.facets.portals ?? []
            return portals.length > 1 ? '#ffffff' : 'transparent'
          }}
          maskColor="rgba(6, 8, 16, .78)"
        />
      </ReactFlow>
      <div className="canvas-hint" aria-hidden="true">Double-click empty space to capture a seed</div>
    </div>
  )
}
