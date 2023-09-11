// useCytoCumulativeCounts.ts
import { useEffect, useRef } from 'react';
import { Core } from 'cytoscape';
import { useDispatch } from 'react-redux';
import _ from 'lodash';
import store from './components/Store/Store';

function updateCytoscapeNodesGivenCumulativeCounts(cy: Core, cumulativeNumberViolationsPerType: any) {
  console.log('triggering cytoscape update');
  // TODO
}

const useCytoCumulativeCounts = (cy: Core) => {
  const dispatch = useDispatch();
  // TODO define a ref for the current cumulativeNumberViolationsPerType
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
        // TODO update cy.nodes such that if the node label is in cumulativeNumberViolationsPerType, we add cumulativeViolations cumulativeSelected from cumulativeNumberViolationsPerType to the nodes
        updateCytoscapeNodesGivenCumulativeCounts(cy, cumulativeNumberViolationsPerType);
      }
    });

    return () => unsubscribe();
    // TODO relevant dependencies
  }, [cy]);
};

export default useCytoCumulativeCounts;
