import React, { useEffect } from 'react';
import { NodeSingular } from 'cytoscape';
import { setSelectedTypes, setSelectedViolationExemplars, setSelectedViolations } from '../Store/CombinedSlice';

const selectConnectedViolations = (node: NodeSingular, dispatch): void => {
  if (node.data('violation')) {
    dispatch(setSelectedViolations([node.id()]));
  }
  if (node.data('exemplar')) {
    dispatch(setSelectedViolationExemplars([node.id()]));
  }
  if (node.data('type')) {
    dispatch(setSelectedTypes([node.id()]));
  }
};

const useCytoscapeContextMenu = (cy, initialNodeData, dispatch, toggleChildren, toggleParents, resetCyto, getContextMenuOptions) => {
  useEffect(() => {
    console.log('useEffect running...');
    console.log('cy:', cy);
    console.log('initialNodeData.current.size:', initialNodeData.current.size);
    let updatedContextMenuActions = {};

    if (cy) {
      if (initialNodeData.current.size > 0) {
        console.log('Initializing context menu...', initialNodeData.current.size);
        updatedContextMenuActions = {
          'Toggle children': { action: toggleChildren, args: [], coreAsWell: false },
          'Toggle parents': { action: toggleParents, args: [], coreAsWell: false },
          'Select connected violations': { action: selectConnectedViolations, args: [dispatch], coreAsWell: false },
          'Reset View': { action: resetCyto, args: [cy, initialNodeData.current], coreAsWell: true },
        };

        // Updating the context menu with new actions
        cy.contextMenus(getContextMenuOptions(updatedContextMenuActions));
      } else {
        console.log('initialNodeData is empty, skipping context menu initialization');
      }
    } else {
      console.log('cy is not available, skipping context menu initialization');
    }

    console.log('getContextMenuOptions:', getContextMenuOptions(updatedContextMenuActions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, initialNodeData.current, dispatch, toggleChildren, toggleParents, resetCyto, getContextMenuOptions]);
};

export default useCytoscapeContextMenu;
