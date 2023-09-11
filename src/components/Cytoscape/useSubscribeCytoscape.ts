// useSubscribeCytoscape.ts
import { useEffect } from 'react';
import { Core } from 'cytoscape';
import { useStore } from 'react-redux';
import { IRootState } from '../../types';
import { getSuccessors } from '../../CytoscapeNodeFactory';
import { adjustLayout, getNodesFromIds, resetNodes, showCytoElements } from './TreeLayoutHelpers';
import { showAllEdges } from './useCytoscapeViewHelpers';
import { setSelectedTypes } from '../Store/CombinedSlice';

const clearSelectedNodes = (cy: Core) => {
  cy.$(':selected').unselect();
};

export const useSubscribeCytoscape = (cy: Core | null, initialNodeData) => {
  const store = useStore<IRootState>();
  const { dispatch } = store;

  const resetCyto = () => {
    clearSelectedNodes(cy);
    showAllEdges(cy);
    resetNodes(cy, initialNodeData.current);
  };

  const resetCytoAndDispatch = () => {
    dispatch(setSelectedTypes([]));
    resetCyto();
  };

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      // console.time('cyto useeffect');
      const state = store.getState().combined;
      const violationsTypesMap = state.violationTypesMap;
      // const { selectedTypes, selectedViolationExemplars, selectedViolations } = extractSelectedData(state);

      if (cy && initialNodeData.current && initialNodeData.current.size > 0) {
        resetCyto();

        // TODO I think the problem is that this selection of connected nodes is not working properly in case a user selects a single violation or a single exemplar
        // perhaps it is enough to directly use the maps now that we have them
        // const { violationNodes, typeNodes, otherNodes, exemplarNodes } = getFilteredNodes(
        //   cy,
        //   selectedViolations,
        //   violationsTypesMap,
        //   selectedTypes,
        //   selectedViolationExemplars,
        // );
        const violationNodes = cy.nodes().filter((node) => state.selectedViolations.includes(node.id()));
        const typeNodes = cy.nodes().filter((node) => state.selectedTypes.includes(node.id()));
        const connectedNodesIds = state.selectedViolations.flatMap((violation) => violationsTypesMap[violation]);
        const otherNodeIds = connectedNodesIds.filter((node) => !state.selectedTypes.includes(node));
        const otherNodes = getNodesFromIds(otherNodeIds, cy);
        const exemplarNodes = cy.nodes().filter((node) => state.selectedViolationExemplars.includes(node.id()));
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

  return {
    resetCytoAndDispatch,
  };
};
