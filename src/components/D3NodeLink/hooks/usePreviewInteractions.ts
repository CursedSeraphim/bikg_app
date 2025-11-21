import * as d3 from 'd3';
import { useCallback, useEffect } from 'react';

import { CanvasEdge, CanvasNode } from '../D3NldTypes';
import { computeColorForId } from '../D3NldUtils';
import { getNearNodeThreshold } from './hoverRadius';

interface UsePreviewInteractionsParams {
  d3Nodes: CanvasNode[];
  ghostNodes: CanvasNode[];
  setGhostNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  ghostEdges: CanvasEdge[];
  setGhostEdges: React.Dispatch<React.SetStateAction<CanvasEdge[]>>;
  cyDataNodes: any[];
  cyDataEdges: any[];
  adjacencyRef: React.MutableRefObject<Record<string, string[]>>;
  revAdjRef: React.MutableRefObject<Record<string, string[]>>;
  hiddenNodesRef: React.MutableRefObject<Set<string>>;
  hiddenEdgesRef: React.MutableRefObject<Set<string>>;
  nodeMapRef: React.MutableRefObject<Record<string, CanvasNode>>;
  originRef: React.MutableRefObject<Record<string, string | null>>;
  savedPositionsRef: React.MutableRefObject<Record<string, { x?: number; y?: number }>>;
  computeExpansion: (id: string, mode: 'children' | 'parents') => { nodeIds: string[]; edges: any[] };
  computeAssociations: (nodeId: string) => { nodeIds: string[]; edges: { id: string; source: string; target: string; label?: string }[] };
  showChildren: (id: string) => void;
  hideChildren: (id: string) => void;
  showParents: (id: string) => void;
  hideParents: (id: string) => void;
  showAssociated: (id: string) => void;
  hideAssociated: (id: string) => void;
  anonymizeLabel: (value: string | undefined) => string;
  isIdBlacklisted: (id: string) => boolean;
  isLabelBlacklisted: (label: string | undefined) => boolean;
  runIncrementalLayout: (options: {
    movableNodeIds?: string[];
    pinAllExisting?: boolean;
    alphaTarget?: number;
    releaseAfter?: number | null;
  }) => void;
  simulationRef: React.MutableRefObject<d3.Simulation<CanvasNode, CanvasEdge> | null>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  transformRef: React.MutableRefObject<d3.ZoomTransform>;
  setD3Edges: React.Dispatch<React.SetStateAction<CanvasEdge[]>>;
  activePreviewRef: React.MutableRefObject<{ mode: 'children' | 'parents' | 'associated' | null; nodeId: string | null }>;
}

export function usePreviewInteractions({
  d3Nodes,
  ghostNodes,
  setGhostNodes,
  ghostEdges,
  setGhostEdges,
  cyDataNodes,
  cyDataEdges,
  adjacencyRef,
  revAdjRef,
  hiddenNodesRef,
  hiddenEdgesRef,
  nodeMapRef,
  originRef: _originRef,
  savedPositionsRef,
  computeExpansion,
  computeAssociations,
  anonymizeLabel,
  isIdBlacklisted,
  isLabelBlacklisted: _isLabelBlacklisted,
  showChildren,
  hideChildren,
  showParents,
  hideParents,
  showAssociated,
  hideAssociated,
  runIncrementalLayout,
  simulationRef,
  canvasRef,
  transformRef,
  setD3Edges,
  activePreviewRef,
}: UsePreviewInteractionsParams) {
  const freezeNode = useCallback(
    (id: string, otherDuration = 500, triggerDuration = 1000, alphaTarget = 0.1) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const allNodes = Object.values(nodeMapRef.current);
      allNodes.forEach((node) => {
        if (otherDuration > 0 || node.id === id) {
          (node as any).fx = node.x;
          (node as any).fy = node.y;
        }
      });

      sim.alphaTarget(alphaTarget).restart();

      if (otherDuration > 0) {
        setTimeout(() => {
          allNodes.forEach((node) => {
            if (node.id !== id) {
              (node as any).fx = null;
              (node as any).fy = null;
            }
          });
        }, otherDuration);
      }

      setTimeout(() => {
        const triggerNode = nodeMapRef.current[id];
        if (triggerNode) {
          (triggerNode as any).fx = null;
          (triggerNode as any).fy = null;
        }
        sim.alphaTarget(0);
      }, triggerDuration);
    },
    [nodeMapRef, simulationRef],
  );

  const clearPreview = useCallback(() => {
    if (activePreviewRef.current.nodeId === null) {
      return;
    }
    setGhostNodes([]);
    setGhostEdges([]);
    setD3Edges((edges) =>
      edges.map((e) => ({
        ...e,
        source: typeof e.source === 'object' ? (e.source as any).id : e.source,
        target: typeof e.target === 'object' ? (e.target as any).id : e.target,
      })),
    );
    Object.values(nodeMapRef.current).forEach((n) => {
      (n as any).fx = null;
      (n as any).fy = null;
      (n as any).vx = 0;
      (n as any).vy = 0;
    });
    const sim = simulationRef.current;
    if (sim) {
      sim.alpha(0);
      sim.alphaTarget(0);
    }
    activePreviewRef.current = { mode: null, nodeId: null };
  }, [activePreviewRef, nodeMapRef, setD3Edges, setGhostEdges, setGhostNodes, simulationRef]);

  const toggleChildren = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'children' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const childIds = (adjacencyRef.current[id] || []).filter((cid) => !isIdBlacklisted(cid));
      const allVisible =
        childIds.length > 0 &&
        childIds.every((childId) => {
          const node = cyDataNodes.find((n) => n.data.id === childId);
          if (!node || !node.data.visible || hiddenNodesRef.current.has(childId)) {
            return false;
          }

          return cyDataEdges.some(
            (e) =>
              !hiddenEdgesRef.current.has(e.data.id) &&
              ((e.data.source === id && e.data.target === childId) || (e.data.source === childId && e.data.target === id)),
          );
        });

      if (allVisible) {
        hideChildren(id);
      } else {
        showChildren(id);
        freezeNode(id, 500, 1000, 0.3);
      }
    },
    [
      activePreviewRef,
      adjacencyRef,
      cyDataEdges,
      cyDataNodes,
      freezeNode,
      ghostNodes,
      hideChildren,
      isIdBlacklisted,
      showChildren,
      savedPositionsRef,
    ],
  );

  const toggleParents = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'parents' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const parentIds = (revAdjRef.current[id] || []).filter((pid) => !isIdBlacklisted(pid));
      const allVisible =
        parentIds.length > 0 &&
        parentIds.every((parentId) => {
          const node = cyDataNodes.find((n) => n.data.id === parentId);
          if (!node || !node.data.visible || hiddenNodesRef.current.has(parentId)) {
            return false;
          }

          return cyDataEdges.some(
            (e) =>
              !hiddenEdgesRef.current.has(e.data.id) &&
              ((e.data.source === parentId && e.data.target === id) || (e.data.source === id && e.data.target === parentId)),
          );
        });

      if (allVisible) {
        hideParents(id);
      } else {
        showParents(id);
        freezeNode(id, 500, 1000, 0.3);
      }
    },
    [
      activePreviewRef,
      cyDataNodes,
      freezeNode,
      ghostNodes,
      hideParents,
      isIdBlacklisted,
      revAdjRef,
      showParents,
      savedPositionsRef,
    ],
  );

  const toggleAssociated = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'associated' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const { nodeIds, edges: assocEdges } = computeAssociations(id);
      const allVisible =
        nodeIds.length > 0 &&
        nodeIds.every((nid) => {
          const node = cyDataNodes.find((n) => n.data.id === nid);
          if (!node || !node.data.visible || hiddenNodesRef.current.has(nid)) {
            return false;
          }

          return assocEdges.some((edge) => !hiddenEdgesRef.current.has(edge.id) && edge.source && edge.target);
        });

      if (allVisible) {
        hideAssociated(id);
      } else {
        showAssociated(id);
        freezeNode(id, 500, 1000, 0.3);
      }
    },
    [
      activePreviewRef,
      computeAssociations,
      cyDataNodes,
      freezeNode,
      ghostNodes,
      hideAssociated,
      savedPositionsRef,
      showAssociated,
    ],
  );

  const updateHoverPreview = useCallback(
    (event: MouseEvent) => {
      if (!event.ctrlKey && !event.shiftKey) {
        clearPreview();
        return;
      }
      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const transform = transformRef.current;
      const [px, py] = transform.invert([pxRaw, pyRaw]);

      const NEAR_NODE_DIST_SQ = getNearNodeThreshold(transform);

      let closest: CanvasNode | null = null;
      let minDist = Infinity;

      d3Nodes.forEach((node) => {
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < minDist) {
          minDist = dist2;
          closest = node;
        }
      });

      if (!closest || minDist >= NEAR_NODE_DIST_SQ) {
        clearPreview();
        return;
      }

      const mode: 'children' | 'parents' | 'associated' = event.ctrlKey && event.shiftKey ? 'associated' : event.ctrlKey ? 'children' : 'parents';
      if (activePreviewRef.current.mode === mode && activePreviewRef.current.nodeId === closest.id) {
        return;
      }
      const { nodeIds, edges: expansionEdges } = mode === 'associated' ? computeAssociations(closest.id) : computeExpansion(closest.id, mode);

      const filteredNodeIds = nodeIds.filter((nid) => !isIdBlacklisted(nid));
      const filteredExpansionEdges = expansionEdges.filter((e) => !isIdBlacklisted(e.source) && !isIdBlacklisted(e.target));

      const hasHiddenEdges = filteredExpansionEdges.some((e) => hiddenEdgesRef.current.has(e.id));
      const allVisible = filteredNodeIds.length === 0 && !hasHiddenEdges;

      const newGhostNodes: CanvasNode[] = [];
      const newGhostEdges: CanvasEdge[] = [];
      const addedEdgeKeys = new Set<string>();

      if (allVisible) {
        const visibleIds =
          mode === 'children'
            ? (adjacencyRef.current[closest.id] || []).filter((nid) => !isIdBlacklisted(nid))
            : (revAdjRef.current[closest.id] || []).filter((nid) => !isIdBlacklisted(nid));

        visibleIds.forEach((nid) => {
          const edgeData = cyDataEdges.find(
            (e) => e.data.source === (mode === 'children' ? closest.id : nid) && e.data.target === (mode === 'children' ? nid : closest.id),
          );
          if (edgeData && !isIdBlacklisted(edgeData.data.source) && !isIdBlacklisted(edgeData.data.target)) {
            const key = `${edgeData.data.source}->${edgeData.data.target}`;
            if (!addedEdgeKeys.has(key)) {
              addedEdgeKeys.add(key);
              newGhostEdges.push({
                source: edgeData.data.source,
                target: edgeData.data.target,
                label: anonymizeLabel(edgeData.data.label ?? edgeData.data.id),
                visible: true,
                previewRemoval: true as any,
              } as any);
            }
          }
        });
      } else {
        filteredNodeIds.forEach((nid) => {
          const nodeData = cyDataNodes.find((n) => n.data.id === nid);
          if (!nodeData) return;
          newGhostNodes.push({
            id: nid,
            label: anonymizeLabel(nodeData.data.label ?? nodeData.data.id),
            color: computeColorForId(nid),
            x: closest?.x,
            y: closest?.y,
            ghost: true as any,
          } as any);
        });
        filteredExpansionEdges.forEach((edge) => {
          const key = `${edge.source}->${edge.target}`;
          if (!addedEdgeKeys.has(key)) {
            addedEdgeKeys.add(key);
            newGhostEdges.push({
              source: edge.source,
              target: edge.target,
              label: anonymizeLabel(edge.label ?? edge.id),
              visible: true,
              ghost: true as any,
            } as any);
          }
        });
      }

      const hasRemovalEdges = newGhostEdges.some((e: any) => e.previewRemoval);
      const hasAdditionEdges = newGhostEdges.some((e: any) => !e.previewRemoval);

      if (newGhostNodes.length > 0 || hasRemovalEdges || hasAdditionEdges) {
        activePreviewRef.current = { mode, nodeId: closest.id };
        setGhostNodes(newGhostNodes);
        setGhostEdges(newGhostEdges);

        runIncrementalLayout({
          pinAllExisting: true,
          alphaTarget: 0.3,
          releaseAfter: null,
        });
      } else {
        clearPreview();
      }
    },
    [
      activePreviewRef,
      adjacencyRef,
      anonymizeLabel,
      canvasRef,
      clearPreview,
      computeAssociations,
      computeExpansion,
      cyDataEdges,
      cyDataNodes,
      d3Nodes,
      hiddenEdgesRef,
      isIdBlacklisted,
      revAdjRef,
      runIncrementalLayout,
      setGhostEdges,
      setGhostNodes,
      transformRef,
    ],
  );

  useEffect(() => {
    if (ghostNodes.length === 0 && ghostEdges.some((e: any) => e.previewRemoval)) {
      const sim = simulationRef.current;
      if (sim) {
        sim.alpha(0.001);
        sim.alphaTarget(0).restart();
      }
    }
  }, [ghostEdges, ghostNodes.length, simulationRef]);

  useEffect(() => {
    if (ghostNodes.length === 0 && ghostEdges.length === 0) {
      const sim = simulationRef.current;
      if (sim) {
        sim.alphaTarget(0);
        sim.alpha(0);
      }
    }
  }, [ghostEdges.length, ghostNodes.length, simulationRef]);

  return {
    updateHoverPreview,
    clearPreview,
    toggleChildren,
    toggleParents,
    toggleAssociated,
    ghostNodes,
    ghostEdges,
    activePreviewRef,
  };
}
