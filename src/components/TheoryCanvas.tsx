import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type NodeMouseHandler,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Portal, TheoryDocument, TheoryEdge, TheoryNode, TheoryView } from '../types'
import { ConceptNode, type ConceptDetailTier, type ConceptFlowNode } from './ConceptNode'

const nodeTypes = { concept: ConceptNode }

const DEFAULT_ZOOM = 0.62
const OVERVIEW_ENTER_ZOOM = 0.46
const OVERVIEW_EXIT_ZOOM = 0.58
const DETAIL_ENTER_ZOOM = 0.76
const DETAIL_EXIT_ZOOM = 0.66
const DOSSIER_ENTER_ZOOM = 1.16
const DOSSIER_EXIT_ZOOM = 1.04
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
  structure: '#08798a',
  dynamics: '#0e7490',
  reasoning: '#8a5a00',
  correspondence: '#6250a8',
  integration: '#1e7a45',
  provenance: '#64748b',
}

function preferredTransitionDuration() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 160
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0
  return window.matchMedia('(pointer: coarse)').matches ? 80 : 160
}

function detailTierForZoom(
  current: ConceptDetailTier,
  zoom: number,
  isLargeView: boolean,
): ConceptDetailTier {
  if (isLargeView && current !== 'overview' && zoom <= OVERVIEW_ENTER_ZOOM) return 'overview'
  if (current === 'overview') {
    if (isLargeView && zoom < OVERVIEW_EXIT_ZOOM) return 'overview'
    current = 'compact'
  }

  if (current === 'dossier') {
    if (zoom >= DOSSIER_EXIT_ZOOM) return 'dossier'
    current = 'detail'
  } else if (zoom >= DOSSIER_ENTER_ZOOM) {
    return 'dossier'
  }

  if (current === 'detail') return zoom >= DETAIL_EXIT_ZOOM ? 'detail' : 'compact'
  return zoom >= DETAIL_ENTER_ZOOM ? 'detail' : 'compact'
}

function sameNodeData(left: ConceptFlowNode['data'], right: ConceptFlowNode['data']) {
  return left.concept === right.concept &&
    left.detailTier === right.detailTier &&
    left.dimmed === right.dimmed &&
    left.relationCount === right.relationCount
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

    const data = sameNodeData(existing.data, candidate.data) ? existing.data : candidate.data
    const position = existing.dragging ? existing.position : candidate.position
    const unchanged = existing.type === candidate.type &&
      existing.selected === candidate.selected &&
      existing.zIndex === candidate.zIndex &&
      existing.ariaLabel === candidate.ariaLabel &&
      existing.position.x === position.x &&
      existing.position.y === position.y &&
      existing.data === data

    if (unchanged) return existing
    changed = true
    return {
      ...existing,
      ...candidate,
      data,
      position,
      dragging: existing.dragging,
      measured: existing.measured,
    }
  })

  return changed ? reconciled : current
}

interface TheoryCanvasProps {
  document: TheoryDocument
  view: TheoryView
  selectedNodeId: string | null
  selectedEdgeId: string | null
  focusDepth: 0 | 1 | 2
  visiblePortals: Set<string>
  visibleEdgeFamilies: Set<TheoryEdge['family']>
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
  visibleEdgeFamilies,
  onSelectNode,
  onSelectEdge,
  onSelectionChange,
  onMoveNode,
  onCreateAt,
  onConnect,
}: TheoryCanvasProps) {
  const [detailTier, setDetailTier] = useState<ConceptDetailTier>('compact')
  const [instance, setInstance] = useState<ReactFlowInstance<ConceptFlowNode, Edge> | null>(null)
  const [transitionDuration] = useState(preferredTransitionDuration)

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

  const nodeTitleSignature = document.nodes.map((node) => `${node.id}\u0000${node.title}`).join('\u0001')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the signature captures exactly the fields the map contains
  const nodeTitles = useMemo(() => new Map(document.nodes.map((node) => [node.id, node.title])), [nodeTitleSignature])

  const visibleConcepts = useMemo(() => {
    const included = new Set(view.includedNodeIds)
    return document.nodes
      .filter((concept) => included.has(concept.id))
      .filter((concept) => concept.facets.portals.length === 0 || concept.facets.portals.some((portal) => visiblePortals.has(portal)))
      .filter((concept) => !view.positions[concept.id]?.hidden)
  }, [document.nodes, view.includedNodeIds, view.positions, visiblePortals])

  const visibleConceptIds = useMemo(() => new Set(visibleConcepts.map((concept) => concept.id)), [visibleConcepts])
  const isLargeView = visibleConcepts.length > OVERVIEW_NODE_LIMIT
  const isOverview = detailTier === 'overview' && isLargeView
  const effectiveDetailTier: ConceptDetailTier = isOverview ? 'overview' : detailTier === 'overview' ? 'compact' : detailTier

  const overviewNodeIds = useMemo(() => {
    if (!isOverview) return visibleConceptIds

    const activeEdges = document.edges.filter((edge) =>
      visibleConceptIds.has(edge.from) &&
      visibleConceptIds.has(edge.to) &&
      visibleEdgeFamilies.has(edge.family),
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
  }, [document.edges, isOverview, selectedNodeId, view.rootNodeId, visibleConceptIds, visibleConcepts, visibleEdgeFamilies])

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
          detailTier: effectiveDetailTier,
          dimmed: !!neighborhood && !neighborhood.has(concept.id),
          relationCount: relationCounts.get(concept.id) ?? 0,
        },
        zIndex: concept.id === selectedNodeId ? 20 : concept.id === 'unity-core' ? 10 : 1,
        ariaLabel: `${concept.title}, ${concept.type}`,
      }))
  }, [effectiveDetailTier, neighborhood, overviewNodeIds, relationCounts, selectedNodeId, view.positions, visibleConcepts])

  const nodeIdSignature = derivedNodes.map((node) => node.id).join('\u0000')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- IDs are the complete input to this membership set
  const nodeIds = useMemo(() => new Set(derivedNodes.map((node) => node.id)), [nodeIdSignature])
  const derivedEdges = useMemo<Edge[]>(() =>
    document.edges
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .filter((edge) => visibleEdgeFamilies.has(edge.family))
      .map((edge) => {
        const connected = edge.from === selectedNodeId || edge.to === selectedNodeId
        const dimmed = !!neighborhood && (!neighborhood.has(edge.from) || !neighborhood.has(edge.to))
        const superseded = edge.status === 'superseded'
        const baseOpacity = dimmed ? 0.08 : connected ? 0.95 : isOverview ? 0.26 : 0.46
        const showLabel = effectiveDetailTier === 'detail' || effectiveDetailTier === 'dossier' || connected
        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          label: showLabel ? `${edge.relation}${superseded ? ' · superseded' : ''}` : undefined,
          type: isOverview ? 'straight' : 'default',
          selected: edge.id === selectedEdgeId,
          animated: false,
          style: {
            stroke: superseded ? '#64748b' : edgeColors[edge.family],
            strokeWidth: superseded ? edge.id === selectedEdgeId ? 1.8 : 1 : edge.id === selectedEdgeId ? 2.8 : connected ? 2.1 : 1.2,
            opacity: superseded ? edge.id === selectedEdgeId ? 0.5 : connected ? 0.24 : 0.07 : baseOpacity,
            strokeDasharray: superseded ? '2 8' : edge.status === 'contested' ? '6 5' : undefined,
          },
          labelStyle: { fill: superseded ? '#64748b' : '#172033', fontSize: 11, fontWeight: 650 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.96 },
          labelBgPadding: [5, 3] as [number, number],
          labelBgBorderRadius: 5,
          markerEnd: { type: 'arrowclosed' as const, color: superseded ? '#64748b' : edgeColors[edge.family], width: isOverview ? 12 : 14, height: isOverview ? 12 : 14 },
          ariaLabel: `${nodeTitles.get(edge.from) ?? edge.from} ${edge.relation} ${nodeTitles.get(edge.to) ?? edge.to}, ${edge.status} relation`,
        }
      }),
  [document.edges, effectiveDetailTier, isOverview, neighborhood, nodeIds, nodeTitles, selectedEdgeId, selectedNodeId, visibleEdgeFamilies])

  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptFlowNode>(derivedNodes)

  useEffect(() => setNodes((current) => reconcileNodes(current, derivedNodes)), [derivedNodes, setNodes])

  useEffect(() => {
    if (!instance) return
    setDetailTier(isLargeView ? 'overview' : 'compact')
    const frame = window.requestAnimationFrame(() => {
      void instance.fitView({
        padding: 0.22,
        maxZoom: isLargeView ? OVERVIEW_ENTER_ZOOM : 0.82,
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
      const targetZoom = Math.max(instance.getZoom(), 0.82)
      const expandsFromOverview = instance.getZoom() <= OVERVIEW_EXIT_ZOOM && targetZoom >= OVERVIEW_EXIT_ZOOM
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

  const handleNodeClick = useCallback<NodeMouseHandler<ConceptFlowNode>>((_event, node) => {
    onSelectEdge(null)
    onSelectNode(node.id)
  }, [onSelectEdge, onSelectNode])

  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!instance) return
    if (event.target instanceof Element && event.target.closest('.react-flow__node, .react-flow__edge, button')) return
    onCreateAt(instance.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }, [instance, onCreateAt])

  const handleSelection = useCallback(({ nodes: selection }: OnSelectionChangeParams) => {
    onSelectionChange(selection.map((node) => node.id))
  }, [onSelectionChange])

  const handleMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, viewport: { zoom: number }) => {
    setDetailTier((current) => detailTierForZoom(current, viewport.zoom, isLargeView))
  }, [isLargeView])

  return (
    <div className="canvas-shell" aria-label="Dream Unity theory canvas">
      <ReactFlow<ConceptFlowNode>
        nodes={nodes}
        edges={derivedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={(_event, edge) => { onSelectNode(null); onSelectEdge(edge.id) }}
        onPaneClick={() => { onSelectNode(null); onSelectEdge(null) }}
        onDoubleClick={handlePaneDoubleClick}
        onNodeDragStop={(_event, node) => onMoveNode(node.id, node.position)}
        onConnect={onConnect}
        onSelectionChange={handleSelection}
        onInit={setInstance}
        onMoveEnd={handleMoveEnd}
        minZoom={0.18}
        maxZoom={1.8}
        defaultViewport={{ x: 0, y: 0, zoom: DEFAULT_ZOOM }}
        selectionOnDrag
        panOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        nodesFocusable
        edgesFocusable
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(71, 85, 105, .18)" />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
      {isOverview && (
        <div className="overview-count-badge" role="status" aria-live="polite">
          {derivedNodes.length} of {visibleConcepts.length} ideas · zoom in for all
        </div>
      )}
      <div className="canvas-hint" aria-hidden="true">Double-click empty space to add an idea</div>
    </div>
  )
}
