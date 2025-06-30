import { useEffect, useRef } from 'react';
import _ from 'lodash';
import store from '../../Store/Store';
import { INumberViolationsPerNodeMap } from '../../../types';
import { CanvasNode } from '../D3NldTypes';

const getBaseId = (compositeKey: string): string => compositeKey.split(' ')[0];

export const updateD3NodesGivenCounts = (nodes: CanvasNode[], numberViolationsPerNode: INumberViolationsPerNodeMap) => {
  nodes.forEach((node) => {
    const baseId = getBaseId(node.id);
    const { cumulativeViolations = 0, cumulativeSelected = 0, violations = 0 } = numberViolationsPerNode[node.id] ?? numberViolationsPerNode[baseId] ?? {};
    const labelSuffix = cumulativeSelected !== 0 || cumulativeViolations !== 0 ? ` (${cumulativeSelected}/${cumulativeViolations})` : '';
    const marker = cumulativeSelected !== 0 || cumulativeViolations !== 0 ? (violations === 0 ? '*' : '') : '';
    node.label = `${baseId}${labelSuffix}${marker}`;
  });
};

export function useD3CumulativeCounts(nodes: CanvasNode[], setNodes: (n: CanvasNode[]) => void, redraw?: () => void) {
  const nodesRef = useRef<CanvasNode[]>(nodes);
  const prevCountsRef = useRef<INumberViolationsPerNodeMap>({});

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const { numberViolationsPerNode } = store.getState().combined;
      const nextCounts = _.cloneDeep(numberViolationsPerNode);
      const shouldUpdate = !_.isEqual(nextCounts, prevCountsRef.current);
      if (shouldUpdate) {
        prevCountsRef.current = nextCounts;
        const updatedNodes = nodesRef.current.map((n) => ({ ...n }));
        updateD3NodesGivenCounts(updatedNodes, nextCounts);
        setNodes(updatedNodes);
        if (redraw) {
          redraw();
        }
      }
    });
    return () => unsubscribe();
  }, [setNodes, redraw]);
}

export default useD3CumulativeCounts;
