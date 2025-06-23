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

// Helper function to hide/unhide Cytoscape nodes based on blacklisted labels
function applyBlacklisting(cy: Core, hiddenLabels: string[]) {
  cy.nodes().forEach((n) => {
    const label = n.data('label');
    if (hiddenLabels.includes(label)) {
      n.data('blacklistedLabel', true);
      n.addClass('hidden');
    } else {
      n.removeData('blacklistedLabel');
      n.removeClass('hidden');
    }
  });
}

export const useSubscribeCytoscape = (cy: Core | null, initialNodeData, blacklistedLabelsRef) => {
  const store = useStore<IRootState>();
  const { dispatch } = store;

  const resetCyto = () => {
    if (!cy) return;
    clearSelectedNodes(cy);
    showAllEdges(cy);
    resetNodes(cy, initialNodeData.current);
  };

  const resetCytoAndDispatch = () => {
    dispatch(setSelectedTypes([]));
    resetCyto();
  };

  const centerView = () => {
    if (!cy) return;
    cy.fit();
    cy.center();
  };

  // 1) On mount (or when `cy` first becomes available), immediately hide
  // blacklisted nodes so they don't flicker.
  useEffect(() => {
    if (!cy) return;

    const state = store.getState().combined;
    blacklistedLabelsRef.current = state.hiddenLabels;

    applyBlacklisting(cy, blacklistedLabelsRef.current);
  }, [cy, store, blacklistedLabelsRef]);

  // 2) Subscribe to the store for *all subsequent changes* (e.g. node selections,
  // violation updates, or blacklistedLabels changes). Re-apply blacklisting
  // *after* we do any resets or layout calls.
  useEffect(() => {
    if (!cy) return;

    const unsubscribe = store.subscribe(() => {
      const state = store.getState().combined;
      const violationsTypesMap = state.violationTypesMap;

      // 2a) Reset the graph and show relevant nodes
      if (initialNodeData.current && initialNodeData.current.size > 0) {
        resetCyto();

        const violationNodes = cy.nodes().filter((node) => state.selectedViolations.includes(node.id()));
        const typeNodes = cy.nodes().filter((node) => state.selectedTypes.includes(node.id()));
        const connectedNodesIds = state.selectedViolations.flatMap((v) => violationsTypesMap[v]);
        const otherNodeIds = connectedNodesIds.filter((nodeId) => !state.selectedTypes.includes(nodeId));
        const otherNodes = getNodesFromIds(otherNodeIds, cy);
        const groupNodes = cy.nodes().filter((node) => state.selectedViolationGroups.includes(node.id()));

        showCytoElements(violationNodes.union(typeNodes).union(otherNodes).union(groupNodes).union(groupNodes.outgoers().targets()));
        adjustLayout(cy, violationNodes, typeNodes, otherNodes, groupNodes);

        violationNodes.union(typeNodes).union(otherNodes).union(groupNodes).union(getSuccessors(groupNodes)).select();
      }

      // 2b) Apply blacklisting *after* the reset and layout so hidden nodes don't flicker
      const newHiddenLabels = state.hiddenLabels;
      blacklistedLabelsRef.current = newHiddenLabels;
      applyBlacklisting(cy, newHiddenLabels);
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, initialNodeData, store]);

  return {
    resetCytoAndDispatch,
    centerView,
  };
};
