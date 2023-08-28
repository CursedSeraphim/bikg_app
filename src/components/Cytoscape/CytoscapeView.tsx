// CytoscapeView.tsx
import * as React from 'react';
import cytoscape, { Core } from 'cytoscape';
import { useSelector, useStore } from 'react-redux';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import viewUtilities from 'cytoscape-view-utilities';
import contextMenus from 'cytoscape-context-menus';
import { selectCytoData, selectTypes, selectViolations } from '../Store/CombinedSlice';
import { useShapeHandler } from '../components/namespaceHandler';
import { createNewCytoscapeInstance, updateCytoscapeInstance } from './CytoscapeInstanceHelpers';
import { useViewUtilities } from './useCytoscapeViewHelpers';
import { registerCytoscapeEventListeners } from './CytoscapeEventHandlers';
import { IRootState } from '../../types';

cytoscape.use(viewUtilities);
cytoscape.use(coseBilkent);
cytoscape.use(cytoscapeLasso);
cytoscape.use(contextMenus);

interface CytoscapeViewProps {
  rdfOntology: string;
  onLoaded: () => void;
}

function CytoscapeView({ rdfOntology, onLoaded }: CytoscapeViewProps): JSX.Element {
  const [cy, setCy] = React.useState<Core | null>(null);
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);

  const { getShapeForNamespace } = useShapeHandler();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = React.useState(true);
  const initialNodePositions = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  const { toggleChildren, toggleParents } = useViewUtilities(cy);
  const contextMenuActions = {
    'toggle-children': toggleChildren,
    'toggle-parents': toggleParents,
  };

  // Helper functions
  const extractSelectedData = (state) => {
    return {
      selectedTypes: state.combined.selectedTypes,
      selectedViolationExemplars: state.combined.selectedViolationExemplars,
      selectedViolations: state.combined.selectedViolations,
    };
  };

  const clearSelectedNodes = (cyInstance) => {
    cyInstance.$(':selected').unselect();
  };

  const selectNodes = (cyInstance, attribute, values) => {
    values.forEach((value) => {
      cyInstance.$(`node[${attribute}="${value}"]`).select();
    });
  };

  const logSelectedNodes = (cyInstance) => {
    console.log('Print all selected nodes:');
    cyInstance.$(':selected').forEach((node) => {
      console.log(node.id());
    });
  };

  const store = useStore<IRootState>();

  React.useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { selectedTypes, selectedViolationExemplars, selectedViolations } = extractSelectedData(state);

      console.log('Selected Types:', selectedTypes);

      if (cy) {
        // Make sure Cytoscape instance is available
        clearSelectedNodes(cy);
        selectNodes(cy, 'label', selectedTypes);
        selectNodes(cy, 'label', selectedViolationExemplars);
        selectNodes(cy, 'label', selectedViolations);
        logSelectedNodes(cy);
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [cy, store]);

  React.useEffect(() => {
    selectCytoData(rdfOntology, getShapeForNamespace, violations, types)
      .then((data) => {
        cy
          ? updateCytoscapeInstance(cy, data, initialNodePositions, onLoaded, setLoading, contextMenuActions)
          : createNewCytoscapeInstance(data, setCy, onLoaded, setLoading, getShapeForNamespace, contextMenuActions);
      })
      .catch((error) => {
        console.error('Failed to generate Cytoscape data:', error);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdfOntology, contextMenuActions, types, violations]);

  React.useEffect(() => {
    // Register event listeners and get the cleanup function
    const cleanup = registerCytoscapeEventListeners(cy, toggleChildren);

    // Call the cleanup function when the component unmounts
    return () => {
      cleanup();
    };
  }, [cy, toggleChildren]);

  return <div id="cy" />;
}

export default CytoscapeView;
