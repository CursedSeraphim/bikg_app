import _ from 'lodash';
import { useEffect, useRef } from 'react';
import { INumberViolationsPerNodeMap } from '../../../types';
import store from '../../Store/Store';
import { CanvasNode } from '../D3NldTypes';

/**
 * Extracts the underlying node id without any auto generated UUID suffix.
 * This keeps human readable labels intact when cumulative counts are added.
 */
const getBaseId = (id: string): string => {
  // Remove trailing UUID ("_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") if present
  return id.replace(/_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, '');
};

export const updateD3NodesGivenCounts = (nodes: CanvasNode[], numberViolationsPerNode: INumberViolationsPerNodeMap) => {
  nodes.forEach((node) => {
    const baseId = getBaseId(node.id);
    const { cumulativeViolations = 0, cumulativeSelected = 0, violations = 0 } = numberViolationsPerNode[node.id] ?? numberViolationsPerNode[baseId] ?? {};
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
        updateD3NodesGivenCounts(nodesRef.current, numberViolationsPerNode);
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
