import { useEffect } from 'react';
import { NodeSingular } from 'cytoscape';
import { useDispatch } from 'react-redux';
import { setSelectedTypes, setSelectedViolationExemplars, setSelectedViolations } from '../Store/CombinedSlice';
import { getContextMenuOptions } from './CytoscapeContextMenu';

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

const useCytoscapeContextMenu = (cy, viewHelpers, resetCyto) => {
  const dispatch = useDispatch();
  useEffect(() => {
    let updatedContextMenuActions = {};

    if (cy) {
      updatedContextMenuActions = {
        'Toggle children': { action: viewHelpers.toggleChildren, args: [], coreAsWell: false },
        'Toggle parents': { action: viewHelpers.toggleParents, args: [], coreAsWell: false },
        'Select connected violations': { action: selectConnectedViolations, args: [dispatch], coreAsWell: false },
        'Reset View': { action: resetCyto, args: [], coreAsWell: true },
      };

      // Updating the context menu with new actions
      cy.contextMenus(getContextMenuOptions(updatedContextMenuActions));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, dispatch, viewHelpers.toggleChildren, viewHelpers.toggleParents, resetCyto, getContextMenuOptions]);
};

export default useCytoscapeContextMenu;
