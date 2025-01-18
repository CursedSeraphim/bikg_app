// src/useCytoCumulativeCounts.ts
import { Core } from 'cytoscape';
import _ from 'lodash';
import { useEffect, useRef } from 'react';
import store from './components/Store/Store';
import { INumberViolationsPerNodeMap } from './types';

// Gets the base node name from the composite key
const getBaseId = (compositeKey: string): string => compositeKey.split(' ')[0];

const updateNodeLabel = (node: any, baseId: string, cumulativeSelected: number, cumulativeViolations: number, violations: number) => {
  const labelSuffix = cumulativeSelected !== 0 || cumulativeViolations !== 0 ? ` (${cumulativeSelected}/${cumulativeViolations})` : '';
  const marker = (cumulativeSelected !== 0 || cumulativeViolations !== 0) && violations === 0 ? '*' : '';
  const label = `${baseId}${labelSuffix}${marker}`;

  node.json({
    data: {
      cumulativeViolations,
      cumulativeSelected,
      label,
    },
  });
};

export const updateCytoscapeNodesGivenCounts = (cy: Core, numberViolationsPerNode: INumberViolationsPerNodeMap) => {
  cy.startBatch();

  const nodeIdsToUpdate = Object.keys(numberViolationsPerNode);
  for (const id of nodeIdsToUpdate) {
    const baseId = getBaseId(id);
    const node = cy.getElementById(baseId);

    if (node.empty()) continue;

    const { cumulativeViolations = 0, cumulativeSelected = 0, violations = 0 } = numberViolationsPerNode[id] ?? {};
    updateNodeLabel(node, baseId, cumulativeSelected, cumulativeViolations, violations);
  }

  cy.endBatch();
};

const useCytoSelectedCounts = (cy: Core) => {
  const numberViolationsPerNodeRef = useRef<INumberViolationsPerNodeMap>({});

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const { numberViolationsPerNode } = store.getState().combined;
      const shouldUpdateTreeData = !_.isEqual(numberViolationsPerNode, numberViolationsPerNodeRef.current);

      if (shouldUpdateTreeData) {
        numberViolationsPerNodeRef.current = numberViolationsPerNode;
        if (cy) {
          updateCytoscapeNodesGivenCounts(cy, numberViolationsPerNode);
        }
      }
    });

    return () => unsubscribe();
  }, [cy]);
};

export default useCytoSelectedCounts;
