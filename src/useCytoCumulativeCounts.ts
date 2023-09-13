// useCytoCumulativeCounts.ts
import { useEffect, useRef } from 'react';
import { Core } from 'cytoscape';
import _ from 'lodash';
import store from './components/Store/Store';
import { INumberViolationsPerNodeMap } from './types';

// Helper function to get the base node name from the composite key
function getBaseId(compositeKey: string): string {
  const parts = compositeKey.split(' ');
  return parts[0];
}

export function updateCytoscapeNodesGivenCumulativeCounts(cy: Core, numberViolationsPerNode: INumberViolationsPerNodeMap) {
  console.log('triggering cytoscape update');

  cy.startBatch();

  // Build an array of node IDs to update
  const nodeIdsToUpdate = Object.keys(numberViolationsPerNode);

  // TODO handle both cases: where node  contains the count, and where it doesn't
  // Update each node
  for (const id of nodeIdsToUpdate) {
    const baseId = getBaseId(id);
    const node = cy.getElementById(baseId);
    if (node.empty()) continue;

    // TODO create a smart mapping of keys where whether the key is a node or a node + count, we get the same value
    const { cumulativeViolations, cumulativeSelected } = numberViolationsPerNode[id] || numberViolationsPerNode[baseId];
    const label = id;
    // console.log(
    //   'updating node',
    //   node.id(),
    //   'with cumulativeViolations',
    //   cumulativeViolations,
    //   'and cumulativeSelected',
    //   cumulativeSelected,
    //   'and label',
    //   label,
    // );

    // Set cumulativeViolations and cumulativeSelected properties directly
    node.json({
      data: {
        cumulativeViolations,
        cumulativeSelected,
        label: `${baseId} (${cumulativeSelected}/${cumulativeViolations})`,
      },
    });
  }

  cy.endBatch();
}

const useCytoCumulativeCounts = (cy: Core) => {
  const numberViolationsPerNodeRef = useRef({});

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const currentState = store.getState().combined;
      let shouldUpdateTreeData = false;
      const { numberViolationsPerNode } = currentState;

      // check equality to ref using lodash
      if (!_.isEqual(numberViolationsPerNode, numberViolationsPerNodeRef.current)) {
        shouldUpdateTreeData = true;
        numberViolationsPerNodeRef.current = numberViolationsPerNode;
      }

      if (cy && shouldUpdateTreeData) {
        updateCytoscapeNodesGivenCumulativeCounts(cy, numberViolationsPerNode);
      }
    });

    return () => unsubscribe();
  }, [cy]);
};

export default useCytoCumulativeCounts;
