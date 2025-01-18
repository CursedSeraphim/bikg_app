// src/components/Cytoscape/useSubscribeCytoscape.ts
import { Core } from 'cytoscape';
import { useEffect } from 'react';
import { useStore } from 'react-redux';
import { getSuccessors } from '../../CytoscapeNodeFactory';
import { IRootState } from '../../types';
import { setSelectedTypes } from '../Store/CombinedSlice';
import { adjustLayout, getNodesFromIds, resetNodes, showCytoElements } from './TreeLayoutHelpers';
import { showAllEdges } from './useCytoscapeViewHelpers';

const clearSelectedNodes = (cy: Core) => {
  cy.$(':selected').unselect();
};

export const useSubscribeCytoscape = (cy: Core | null, initialNodeData, blacklistedLabelsRef) => {
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

  const centerView = () => {
    cy.fit();
    cy.center();
  };

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState().combined;
      const violationsTypesMap = state.violationTypesMap;

      if (cy && initialNodeData.current && initialNodeData.current.size > 0) {
        resetCyto();
        
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

      const newBlacklistedLabels = state.hiddenLabels;
      if (cy && JSON.stringify(newBlacklistedLabels) !== JSON.stringify(blacklistedLabelsRef.current)) {
        cy.nodes().each((n) => {
          const label = n.data('label');
          if (newBlacklistedLabels.includes(label) && !n.data('blacklistedLabel')) {
            n.data('blacklistedLabel', true);
            n.addClass('hidden');
          } else if (!newBlacklistedLabels.includes(label) && n.data('blacklistedLabel')) {
            n.removeData('blacklistedLabel');
            n.removeClass('hidden');
          }
        });
        // eslint-disable-next-line no-param-reassign
        blacklistedLabelsRef.current = newBlacklistedLabels;
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
    centerView,
  };
};
