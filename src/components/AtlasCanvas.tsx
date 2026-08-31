import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  MarkerType,
} from '@xyflow/react'
import type { AtlasDocument, AtlasView, Concept, Quadrant } from '../types'
import { QUADRANT_META } from '../types'
import { ConceptCard, type ConceptFlowNode } from './ConceptCard'
import { visibleConcepts, visibleRelations } from '../lib/document'

const nodeTypes = { concept: ConceptCard }

export function AtlasCanvas(props: {
  doc: AtlasDocument
  view: AtlasView
  selectedId: string | null
  editing: boolean
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  onConnectNodes: (from: string, to: string) => void
  onAddAt: (x: number, y: number) => void
  onChangeNotes: (id: string, notes: string) => void
  onChangeTitle: (id: string, title: string) => void
  onOpenDossier: (id: string) => void
}) {
  const { doc, view, selectedId, editing, onSelect, onMove, onConnectNodes, onAddAt, onChangeNotes, onChangeTitle, onOpenDossier } = props
  const concepts = visibleConcepts(doc, view)
  const relations = visibleRelations(doc, view)

  const builtNodes = useMemo<ConceptFlowNode[]>(() => concepts.map((concept) => ({
    id: concept.id,
    type: 'concept',
    position: doc.positions[concept.id] ?? { x: 0, y: 0 },
    data: { concept, selected: concept.id === selectedId, editing, onChangeNotes, onChangeTitle, onOpenDossier },
    style: { width: concept.kind === 'core' ? 320 : 228 },
    zIndex: concept.kind === 'core' ? 8 : 1,
  })), [concepts, doc.positions, selectedId, editing, onChangeNotes, onChangeTitle, onOpenDossier])

  const builtEdges = useMemo<Edge[]>(() => relations.map((relation) => {
    const from = doc.concepts.find((concept) => concept.id === relation.from)
    const accent = QUADRANT_META[(from?.quadrant ?? 'unity') as Quadrant].accent
    return {
      id: relation.id,
      source: relation.from,
      target: relation.to,
      label: relation.verb,
      markerEnd: { type: MarkerType.ArrowClosed, color: accent, width: 16, height: 16 },
      style: { stroke: accent, strokeWidth: 1.7 },
      labelStyle: { fill: '#d7e4ef', fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: 'rgba(8, 14, 24, 0.86)' },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 8,
    }
  }), [relations, doc.concepts])

  const [nodes, setNodes, onNodesChange] = useNodesState(builtNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(builtEdges)

  useEffect(() => {
    setNodes(builtNodes)
    setEdges(builtEdges)
  }, [builtNodes, builtEdges, setNodes, setEdges])

  const onConnect = useCallback<OnConnect>((connection: Connection) => {
    if (!connection.source || !connection.target) return
    setEdges((current) => addEdge({ ...connection, label: 'relates to' }, current))
    onConnectNodes(connection.source, connection.target)
  }, [onConnectNodes, setEdges])

  const [menu, setMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)

  return (
    <div className="atlas-canvas">
      <div className="quadrant-stage" aria-hidden="true">
        <div className="quad maker"><span>Maker</span></div>
        <div className="quad machine"><span>Machine</span></div>
        <div className="quad world"><span>World</span></div>
        <div className="quad unity"><span>Unity</span></div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => {
          onNodesChange(changes)
          for (const change of changes) {
            if (change.type === 'position' && change.position && !change.dragging) {
              onMove(change.id, change.position.x, change.position.y)
            }
          }
        }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => { setMenu(null); onSelect(null) }}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneDoubleClick={(event) => {
          const bounds = (event.target as HTMLElement).closest('.atlas-canvas')?.getBoundingClientRect()
          if (!bounds) return
          onAddAt(event.clientX - bounds.left - 114, event.clientY - bounds.top - 80)
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault()
          const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
          setMenu({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
            flowX: event.clientX - bounds.left - 114,
            flowY: event.clientY - bounds.top - 80,
          })
        }}
        fitView
        minZoom={0.35}
        maxZoom={1.8}
        panOnScroll
        panOnDrag
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background id="dots" variant={BackgroundVariant.Dots} gap={28} size={1.2} color="rgba(130,160,190,0.14)" />
        <Controls showInteractive={false} position="top-right" />
        <MiniMap className="atlas-minimap" position="top-right" pannable zoomable maskColor="rgba(6,10,18,0.55)" nodeColor={(node: Node) => {
          const concept = (node.data as { concept?: Concept }).concept
          return concept ? QUADRANT_META[concept.quadrant].accent : '#7dd3c7'
        }} />
      </ReactFlow>
      {menu ? (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }}>
          <button type="button" onClick={() => { onAddAt(menu.flowX, menu.flowY); setMenu(null) }}>Add card here</button>
          <button type="button" onClick={() => setMenu(null)}>Cancel</button>
        </div>
      ) : null}
    </div>
  )
}
