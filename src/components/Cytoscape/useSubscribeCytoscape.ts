// useSubscribeCytoscape.ts
import React, { useEffect } from 'react';
import { Core } from 'cytoscape';
import { useStore } from 'react-redux';
import { IRootState } from '../../types';
import { getSuccessors } from '../../CytoscapeNodeFactory';
import { adjustLayout, getFilteredNodes, hideAllVisibleNodes, resetNodePositions, styleAndDisplayNodes } from './TreeLayoutHelpers';

const extractSelectedData = (state) => {
  return {
    selectedTypes: state.combined.selectedTypes,
    selectedViolationExemplars: state.combined.selectedViolationExemplars,
    selectedViolations: state.combined.selectedViolations,
  };
};

const clearSelectedNodes = (cyInstance: Core) => {
  cyInstance.$(':selected').unselect();
};

const selectNodes = (cyInstance: Core, attribute: string, values: string[]) => {
  values.forEach((value) => {
    cyInstance.$(`node[${attribute}="${value}"]`).select();
  });
};

// const logSelectedNodes = (cyInstance: Core) => {
//   console.log('Print all selected nodes:');
//   cyInstance.$(':selected').forEach((node) => {
//     console.log(node.id());
//   });
// };

// Custom Hook
export const useSubscribeCytoscape = (cy: Core | null, initialNodePositions) => {
  const store = useStore<IRootState>();
  const listOfNodesThatHaveBeenMadeVisible = React.useRef([]);

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const violationsTypesMap = state.combined.violationTypesMap;
      const { selectedTypes, selectedViolationExemplars, selectedViolations } = extractSelectedData(state);

      if (cy && initialNodePositions.current && initialNodePositions.current.size > 0) {
        console.time('usesubscribe/handling subscription for tree layout took');

        clearSelectedNodes(cy);
        hideAllVisibleNodes(listOfNodesThatHaveBeenMadeVisible);
        resetNodePositions(cy, initialNodePositions.current);

        const { violationNodes, typeNodes, otherNodes, exemplarNodes } = getFilteredNodes(
          cy,
          selectedViolations,
          violationsTypesMap,
          selectedTypes,
          selectedViolationExemplars,
        );
        styleAndDisplayNodes(listOfNodesThatHaveBeenMadeVisible, typeNodes, otherNodes, exemplarNodes, violationNodes);
        adjustLayout(cy, violationNodes, typeNodes, otherNodes, exemplarNodes);

        violationNodes.union(typeNodes).union(otherNodes).union(exemplarNodes).union(getSuccessors(exemplarNodes)).select();
        selectNodes(cy, 'label', selectedTypes);
        selectNodes(cy, 'label', selectedViolationExemplars);
        selectNodes(cy, 'label', selectedViolations);
        cy.style().update();
        console.timeEnd('usesubscribe/handling subscription for tree layout took');
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, initialNodePositions]);
};
