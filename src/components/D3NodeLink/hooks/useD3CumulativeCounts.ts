import _ from 'lodash';
import { useEffect, useRef } from 'react';
import { INumberViolationsPerNodeMap } from '../../../types';
import { getNormalizedNodeId, getViolationCountsForNode } from '../../../utils/violations';
import store from '../../Store/Store';
import { CanvasNode } from '../D3NldTypes';

export const updateD3NodesGivenCounts = (nodes: CanvasNode[]) => {
  nodes.forEach((node) => {
    const baseId = getNormalizedNodeId(node.id);
    const { cumulativeViolations, cumulativeSelected, violations } = getViolationCountsForNode(node.id);
    const labelSuffix = cumulativeSelected !== 0 || cumulativeViolations !== 0 ? ` (${cumulativeSelected}/${cumulativeViolations})` : '';
    const marker = cumulativeSelected !== 0 || cumulativeViolations !== 0 ? (violations === 0 ? '*' : '') : '';
    // eslint-disable-next-line no-param-reassign
    node.label = `${baseId}${labelSuffix}${marker}`;
  });
};

export function useD3CumulativeCounts(nodes: CanvasNode[], setNodes: (n: CanvasNode[]) => void, redraw?: () => void) {
  const nodesRef = useRef<CanvasNode[]>(nodes);
  const numberViolationsPerNodeRef = useRef<INumberViolationsPerNodeMap>({});

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const { numberViolationsPerNode } = store.getState().combined;
      const shouldUpdate = !_.isEqual(numberViolationsPerNode, numberViolationsPerNodeRef.current);
      if (shouldUpdate) {
        numberViolationsPerNodeRef.current = numberViolationsPerNode;
        updateD3NodesGivenCounts(nodesRef.current);
        setNodes([...nodesRef.current]);
        if (redraw) {
          redraw();
        }
      }
    });
    return () => unsubscribe();
  }, [setNodes, redraw]);
}

export default useD3CumulativeCounts;
