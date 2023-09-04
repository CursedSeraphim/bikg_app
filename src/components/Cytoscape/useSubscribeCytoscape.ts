// useSubscribeCytoscape.ts
import { useEffect } from 'react';
import { Core } from 'cytoscape';
import { useStore } from 'react-redux';
import { IRootState } from '../../types';
import { getSuccessors } from '../../CytoscapeNodeFactory';
import { adjustLayout, getFilteredNodes, resetNodes, showCytoElements } from './TreeLayoutHelpers';

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

// Custom Hook
export const useSubscribeCytoscape = (cy: Core | null, initialNodeData, showAllPermanentEdges) => {
  const store = useStore<IRootState>();

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      console.log('cyto/ subscription triggered');
      // console.time('cyto useeffect');
      const state = store.getState();
      const violationsTypesMap = state.combined.violationTypesMap;
      const { selectedTypes, selectedViolationExemplars, selectedViolations } = extractSelectedData(state);
      console.log('cyto/ state', state);

      if (cy && initialNodeData.current && initialNodeData.current.size > 0) {
        // console.log('');
        // console.time('clear');
        clearSelectedNodes(cy);
        // console.timeEnd('clear');
        // console.time('show');
        showAllPermanentEdges();
        // console.timeEnd('show');
        // console.time('reset');
        resetNodes(cy, initialNodeData.current);
        // console.timeEnd('reset');

        // console.time('getfilter');
        const { violationNodes, typeNodes, otherNodes, exemplarNodes } = getFilteredNodes(
          cy,
          selectedViolations,
          violationsTypesMap,
          selectedTypes,
          selectedViolationExemplars,
        );
        // console.timeEnd('getfilter');
        // console.time('style&display');
        showCytoElements(violationNodes.union(otherNodes).union(typeNodes).union(exemplarNodes).union(exemplarNodes.outgoers().targets()));
        // console.timeEnd('style&display');
        // console.time('adjst');
        adjustLayout(cy, violationNodes, typeNodes, otherNodes, exemplarNodes);
        // console.timeEnd('adjst');

        // TODO check why this triggers a selection of typeNodes with an empty array afterwards
        // console.time('unionsel');
        violationNodes.union(typeNodes).union(otherNodes).union(exemplarNodes).union(getSuccessors(exemplarNodes)).select();
        // console.timeEnd('unionsel');
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, initialNodeData]);
};
