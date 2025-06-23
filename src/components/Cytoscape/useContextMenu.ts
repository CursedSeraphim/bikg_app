// src/components/Cytoscape/useContextMenu.ts
import { Core, NodeSingular } from 'cytoscape';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ActionFunctionMap } from '../../types';
import { addHiddenLabels, setSelectedTypes, setSelectedViolationGroups, setSelectedViolations } from '../Store/CombinedSlice';
import { getContextMenuOptions } from './CytoscapeContextMenu';

const selectConnectedViolations = (node: NodeSingular, dispatch): void => {
  if (node.data('violation')) {
    dispatch(setSelectedViolations([node.id()]));
  }
  if (node.data('group')) {
    dispatch(setSelectedViolationGroups([node.id()]));
  }
  if (node.data('type')) {
    dispatch(setSelectedTypes([node.id()]));
  }
};

const blacklistNodesWithSameLabel = (node: NodeSingular, cy: Core, dispatch): void => {
  const targetLabel = node.data('label');
  const labelsToHide = new Set<string>();

  cy.nodes().each((n) => {
    if (n.data('label') === targetLabel) {
      labelsToHide.add(n.data('label'));
      n.data('blacklistedLabel', true);
      n.removeClass('visible');
      n.addClass('hidden');
    }
  });

  // Dispatch a single action with all labels to hide
  if (labelsToHide.size > 0) {
    dispatch(addHiddenLabels(Array.from(labelsToHide)));
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
        'Select connected focus nodes': { action: selectConnectedViolations, args: [dispatch], coreAsWell: false },
        'Hide nodes with same label': { action: blacklistNodesWithSameLabel, args: [cy, dispatch], coreAsWell: false },
        Reset: { action: subscribeCytoscape.resetCytoAndDispatch, args: [], coreAsWell: true },
        'Center View': { action: subscribeCytoscape.centerView, args: [], coreAsWell: true },
      };

      // Updating the context menu with new actions
      cy.contextMenus(getContextMenuOptions(updatedContextMenuActions));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, dispatch, viewHelpers.toggleChildren, viewHelpers.toggleParents, subscribeCytoscape, getContextMenuOptions]);
};

export default useCytoscapeContextMenu;
