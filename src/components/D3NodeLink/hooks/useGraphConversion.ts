import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';
import store from '../../Store/Store';
import { CanvasEdge, CanvasNode } from '../D3NldTypes';
import { computeColorForId } from '../D3NldUtils';
import { updateD3NodesGivenCounts } from './useD3CumulativeCounts';

interface UseGraphConversionParams {
  cyDataNodes: any[];
  cyDataEdges: any[];
  loading: boolean;
  hiddenLabels: string[];
  anonymizeLabel: (value: string | undefined) => string;
  isLabelBlacklisted: (label: string | undefined) => boolean;
  hiddenNodesRef: MutableRefObject<Set<string>>;
  originRef: MutableRefObject<Record<string, string | null>>;
  nodeMapRef: MutableRefObject<Record<string, CanvasNode>>;
  savedPositionsRef: MutableRefObject<Record<string, { x?: number; y?: number }>>;
}

export function useGraphConversion({
  cyDataNodes,
  cyDataEdges,
  loading,
  hiddenLabels,
  anonymizeLabel,
  isLabelBlacklisted,
  hiddenNodesRef,
  originRef,
  nodeMapRef,
  savedPositionsRef,
}: UseGraphConversionParams) {
  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  const convertData = useCallback(() => {
    const visibleNodeData = cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id) && !isLabelBlacklisted(n.data.label));
    const visibleIds = new Set(visibleNodeData.map((n) => n.data.id));

    const visibleEdgeData = cyDataEdges.filter((e) => e.data.visible && visibleIds.has(e.data.source) && visibleIds.has(e.data.target));

    const nextNodes: CanvasNode[] = [];

    visibleNodeData.forEach((n) => {
      const { id } = n.data;
      const display = anonymizeLabel(n.data.label ?? n.data.id);
      let node = nodeMapRef.current[id];
      if (!node) {
        const saved = savedPositionsRef.current[id];
        node = {
          id,
          label: display,
          color: computeColorForId(id),
          x: saved?.x,
          y: saved?.y,
          selected: Boolean(n.data.selected),
          violation: Boolean(n.data.violation),
          exemplar: Boolean(n.data.exemplar),
          type: Boolean(n.data.type),
        };
      } else {
        node.label = display;
        node.color = computeColorForId(id);
        node.selected = Boolean(n.data.selected);
        node.violation = Boolean(n.data.violation);
        node.exemplar = Boolean(n.data.exemplar);
        node.type = Boolean(n.data.type);
      }
      if (originRef.current[id] === undefined) {
        originRef.current[id] = null;
      }
      nodeMapRef.current[id] = node;
      nextNodes.push(node);
    });

    Object.keys(nodeMapRef.current).forEach((id) => {
      if (!visibleIds.has(id)) {
        const node = nodeMapRef.current[id];
        savedPositionsRef.current[id] = { x: node.x, y: node.y };
        delete nodeMapRef.current[id];
      }
    });

    const newEdges: CanvasEdge[] = visibleEdgeData.map((e) => ({
      source: e.data.source,
      target: e.data.target,
      label: anonymizeLabel(e.data.label ?? e.data.id),
      visible: true,
      selected: Boolean(e.data.selected),
    }));

    updateD3NodesGivenCounts(nextNodes, store.getState().combined.numberViolationsPerNode);
    setD3Nodes(nextNodes);
    setD3Edges(newEdges);
  }, [anonymizeLabel, cyDataEdges, cyDataNodes, hiddenNodesRef, isLabelBlacklisted, nodeMapRef, originRef, savedPositionsRef]);

  useEffect(() => {
    if (!loading) {
      cyDataNodes.forEach((n) => (n.data.label = anonymizeLabel(n.data.label ?? n.data.id)));
      cyDataEdges.forEach((e) => (e.data.label = anonymizeLabel(e.data.label ?? e.data.id)));
      convertData();
    }
  }, [loading, convertData, hiddenLabels, cyDataNodes, cyDataEdges, anonymizeLabel]);

  return { convertData, d3Edges, d3Nodes, setD3Nodes };
}
