// useSubscribeCytoscape.ts
import { useEffect } from 'react';
import { Core } from 'cytoscape';
import { useStore } from 'react-redux';
import { IRootState } from '../../types';
import { getSuccessors } from '../../CytoscapeNodeFactory';
import { adjustLayout, getFilteredNodes, resetNodes, showCytoElements } from './TreeLayoutHelpers';
import { showAllEdges } from './useCytoscapeViewHelpers';

const extractSelectedData = (state) => {
  return {
    selectedTypes: state.combined.selectedTypes,
    selectedViolationExemplars: state.combined.selectedViolationExemplars,
    selectedViolations: state.combined.selectedViolations,
  };
};

const clearSelectedNodes = (cy: Core) => {
  cy.$(':selected').unselect();
};

// Custom Hook
export const useSubscribeCytoscape = (cy: Core | null, initialNodeData) => {
  const store = useStore<IRootState>();

  const resetCyto = () => {
    clearSelectedNodes(cy);
    showAllEdges(cy);
    resetNodes(cy, initialNodeData.current);
  };

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      // console.time('cyto useeffect');
      const state = store.getState();
      const violationsTypesMap = state.combined.violationTypesMap;
      const { selectedTypes, selectedViolationExemplars, selectedViolations } = extractSelectedData(state);

      if (cy && initialNodeData.current && initialNodeData.current.size > 0) {
        resetCyto();

        const { violationNodes, typeNodes, otherNodes, exemplarNodes } = getFilteredNodes(
          cy,
          selectedViolations,
          violationsTypesMap,
          selectedTypes,
          selectedViolationExemplars,
        );
        showCytoElements(violationNodes.union(otherNodes).union(typeNodes).union(exemplarNodes).union(exemplarNodes.outgoers().targets()));
        adjustLayout(cy, violationNodes, typeNodes, otherNodes, exemplarNodes);

        violationNodes.union(typeNodes).union(otherNodes).union(exemplarNodes).union(getSuccessors(exemplarNodes)).select();
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, initialNodeData]);
};
