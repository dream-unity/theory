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
import type { TheoryDocument, TheoryEdge, TheoryView } from '../types'
import { ConceptNode, type ConceptFlowNode } from './ConceptNode'

const nodeTypes = { concept: ConceptNode }

const edgeColors: Record<TheoryEdge['family'], string> = {
  structure: '#6887a8',
  dynamics: '#71d8e7',
  reasoning: '#d9b86d',
  correspondence: '#a28ce0',
  integration: '#e8dcac',
  provenance: '#82939e',
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

  const derivedNodes = useMemo<ConceptFlowNode[]>(() => {
    const included = new Set(view.includedNodeIds)
    return document.nodes
      .filter((concept) => included.has(concept.id))
      .filter((concept) => concept.facets.portals.length === 0 || concept.facets.portals.some((portal) => visiblePortals.has(portal)))
      .filter((concept) => !view.positions[concept.id]?.hidden)
      .map((concept) => ({
        id: concept.id,
        type: 'concept',
        position: view.positions[concept.id] ?? { x: 0, y: 0 },
        selected: concept.id === selectedNodeId,
        data: {
          concept,
          zoom,
          dimmed: !!neighborhood && !neighborhood.has(concept.id),
          relationCount: relationCounts.get(concept.id) ?? 0,
        },
        zIndex: concept.id === selectedNodeId ? 20 : concept.id === 'unity-core' ? 10 : 1,
        ariaLabel: `${concept.title}, ${concept.type}`,
      }))
  }, [document.nodes, neighborhood, relationCounts, selectedNodeId, view, visiblePortals, zoom])

  const nodeIds = useMemo(() => new Set(derivedNodes.map((node) => node.id)), [derivedNodes])
  const derivedEdges = useMemo<Edge[]>(() =>
    document.edges
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .filter((edge) => view.visibleEdgeFamilies.includes(edge.family))
      .map((edge) => {
        const connected = edge.from === selectedNodeId || edge.to === selectedNodeId
        const dimmed = !!neighborhood && (!neighborhood.has(edge.from) || !neighborhood.has(edge.to))
        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          label: zoom >= 0.74 || connected ? edge.relation : undefined,
          type: 'smoothstep',
          selected: edge.id === selectedEdgeId,
          animated: connected && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          style: {
            stroke: edgeColors[edge.family],
            strokeWidth: edge.id === selectedEdgeId ? 2.8 : connected ? 2.1 : 1.2,
            opacity: dimmed ? 0.06 : connected ? 0.95 : zoom < 0.45 ? 0.16 : 0.38,
            strokeDasharray: edge.status === 'contested' ? '6 5' : undefined,
          },
          labelStyle: { fill: '#ddd8c9', fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: '#111522', fillOpacity: 0.94 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 5,
          markerEnd: { type: 'arrowclosed' as const, color: edgeColors[edge.family], width: 15, height: 15 },
          ariaLabel: `${nodeTitles.get(edge.from) ?? edge.from} ${edge.relation} ${nodeTitles.get(edge.to) ?? edge.to}`,
        }
      }),
  [document.edges, neighborhood, nodeIds, nodeTitles, selectedEdgeId, selectedNodeId, view.visibleEdgeFamilies, zoom])

  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptFlowNode>(derivedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges)

  useEffect(() => setNodes(derivedNodes), [derivedNodes, setNodes])
  useEffect(() => setEdges(derivedEdges), [derivedEdges, setEdges])

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
      <div className="field-aura field-maker" aria-hidden="true"><span>Consciousness</span></div>
      <div className="field-aura field-machine" aria-hidden="true"><span>Relation</span></div>
      <div className="field-aura field-world" aria-hidden="true"><span>Strategy</span></div>
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
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 0.82 }}
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
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={(mapNode) => {
            const concept = document.nodes.find((item) => item.id === mapNode.id)
            const portal = concept?.facets.portals[0]
            return portal === 'maker' ? '#6ed8ea' : portal === 'machine' ? '#d9b86d' : portal === 'world' ? '#7ecb99' : '#aaa0ee'
          }}
          maskColor="rgba(6, 8, 16, .78)"
        />
      </ReactFlow>
      <div className="canvas-hint" aria-hidden="true">Double-click empty space to capture a seed</div>
    </div>
  )
}
