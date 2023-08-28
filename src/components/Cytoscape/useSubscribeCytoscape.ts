// useSubscribeCytoscape.ts
import { useEffect } from 'react';
import { Core } from 'cytoscape';
import { useStore } from 'react-redux';
import { IRootState } from '../../types';

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

const selectNodes = (cyInstance: Core, attribute: string, values: string[]) => {
  values.forEach((value) => {
    cyInstance.$(`node[${attribute}="${value}"]`).select();
  });
};

const logSelectedNodes = (cyInstance: Core) => {
  console.log('Print all selected nodes:');
  cyInstance.$(':selected').forEach((node) => {
    console.log(node.id());
  });
};

// Custom Hook
export const useSubscribeCytoscape = (cy: Core | null) => {
  const store = useStore<IRootState>();

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { selectedTypes, selectedViolationExemplars, selectedViolations } = extractSelectedData(state);

      if (cy) {
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
};
