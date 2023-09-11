// useCytoCumulativeCounts.ts
import { useEffect, useRef } from 'react';
import { Core } from 'cytoscape';
import { useDispatch } from 'react-redux';
import _ from 'lodash';
import store from './components/Store/Store';

// Helper function to get the base node name from the composite key
function getBaseNodeName(compositeKey: string): string {
  const parts = compositeKey.split(' ');
  return parts[0];
}

export function updateCytoscapeNodesGivenCumulativeCounts(cy: Core, cumulativeNumberViolationsPerType: Record<string, any>) {
  console.log('triggering cytoscape update');
  console.log('cy.nodes()', cy.nodes());

  cy.startBatch();

  // Build an array of node IDs to update
  const nodeIdsToUpdate = Object.keys(cumulativeNumberViolationsPerType);
  console.log('nodeIdsToUpdate', nodeIdsToUpdate);
  console.log('cumulativeNumberViolationsPerType keys', Object.keys(cumulativeNumberViolationsPerType));

  // Update each node
  for (const id of nodeIdsToUpdate) {
    // TODO here id might contain sth like node.id()+' (0/1734)' and therefore we aren't getting the node
    const baseId = id.split(' ')[0];
    const node = cy.getElementById(baseId);
    if (node.empty()) continue;

    const { cumulativeViolations, cumulativeSelected } = cumulativeNumberViolationsPerType[id];
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
  const cumulativeNumberViolationsPerTypeRef = useRef({});

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const currentState = store.getState().combined;
      let shouldUpdateTreeData = false;
      const { cumulativeNumberViolationsPerType } = currentState;

      // check equality to ref using lodash
      if (!_.isEqual(cumulativeNumberViolationsPerType, cumulativeNumberViolationsPerTypeRef.current)) {
        shouldUpdateTreeData = true;
        cumulativeNumberViolationsPerTypeRef.current = cumulativeNumberViolationsPerType;
      }

      if (cy && shouldUpdateTreeData) {
        updateCytoscapeNodesGivenCumulativeCounts(cy, cumulativeNumberViolationsPerType);
      }
    });

    return () => unsubscribe();
  }, [cy]);
};

export default useCytoCumulativeCounts;
