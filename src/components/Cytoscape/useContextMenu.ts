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

const showNodesWithSameLabelPermanently = (node: NodeSingular, cy: Core): void => {
  const targetLabel = node.data('label');

  cy.nodes().each((n) => {
    if (n.data('label') === targetLabel && n.data('hiddenByLabel')) {
      console.log('n', n);
      n.removeData('hiddenByLabel');
      n.removeClass('hidden'); // Remove 'hidden' class from the node
      n.addClass('visible'); // Add 'visible' class to the node
    }
  });
};

const hideNodesWithSameLabelPermanently = (node: NodeSingular, cy: Core): void => {
  const targetLabel = node.data('label');

  cy.nodes().each((n) => {
    if (n.data('label') === targetLabel) {
      console.log('n', n);
      n.data('hiddenByLabel', true);
      n.removeClass('visible'); // Remove 'visible' class from the node
      n.addClass('hidden'); // Add 'hidden' class to the node
    }
  });
};

const showNodesWithSameLabel = (node: NodeSingular, cy: Core): void => {
  const targetLabel = node.data('label'); // Get the label of the clicked node
  console.log('targetLabel', targetLabel);

  cy.nodes().each((n) => {
    if (n.data('label') === targetLabel) {
      n.removeClass('hidden'); // Remove 'hidden' class from the node
      n.addClass('visible'); // Add 'visible' class to the node
    }
  });
};

const hideNodesWithSameLabel = (node: NodeSingular, cy: Core): void => {
  const targetLabel = node.data('label'); // Get the label of the clicked node
  console.log('targetLabel', targetLabel);

  cy.nodes().each((n) => {
    if (n.data('label') === targetLabel) {
      n.removeClass('visible'); // Remove 'visible' class from the node
      n.addClass('hidden'); // Add 'hidden' class to the node
    }
  });
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
        'Hide nodes with same label': { action: hideNodesWithSameLabelPermanently, args: [cy], coreAsWell: false },
        'Show nodes with same label': { action: showNodesWithSameLabelPermanently, args: [cy], coreAsWell: false },
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
