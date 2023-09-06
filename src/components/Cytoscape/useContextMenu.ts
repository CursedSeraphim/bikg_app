import { useEffect } from 'react';
import { Core, NodeSingular } from 'cytoscape';
import { useDispatch } from 'react-redux';
import { setSelectedTypes, setSelectedViolationExemplars, setSelectedViolations } from '../Store/CombinedSlice';
import { getContextMenuOptions } from './CytoscapeContextMenu';
import { ActionFunctionMap } from '../../types';

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

const useCytoscapeContextMenu = (cy: Core, viewHelpers: ActionFunctionMap, subscribeCytoscape: ActionFunctionMap) => {
  const dispatch = useDispatch();
  useEffect(() => {
    let updatedContextMenuActions = {};

    if (cy) {
      updatedContextMenuActions = {
        'Hide node': { action: viewHelpers.hideNode, args: [], coreAsWell: false },
        'Toggle children': { action: viewHelpers.toggleChildren, args: [], coreAsWell: false },
        'Toggle parents': { action: viewHelpers.toggleParents, args: [], coreAsWell: false },
        'Select connected violations': { action: selectConnectedViolations, args: [dispatch], coreAsWell: false },
        'Reset View': { action: subscribeCytoscape.resetCytoAndDispatch, args: [], coreAsWell: true },
      };

      // Updating the context menu with new actions
      cy.contextMenus(getContextMenuOptions(updatedContextMenuActions));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, dispatch, viewHelpers.toggleChildren, viewHelpers.toggleParents, subscribeCytoscape, getContextMenuOptions]);
};

export default useCytoscapeContextMenu;
