// CytoscapeEventHandlers.ts
import React, { useEffect } from 'react';
import { Core } from 'cytoscape';
import { ActionFunction } from '../../types';

export function useRegisterCytoscapeEventListeners(cy: Core | null, toggleChildren: ActionFunction) {
  useEffect(() => {
    if (!cy) {
      // Return an empty cleanup function
      return () => {};
    }

    // Register dblclick event
    cy.on('dblclick', 'node', (evt) => {
      const node = evt.target;
      toggleChildren(node);
    });

    // Return a cleanup function
    return () => {
      cy?.off('dblclick', 'node');
    };
  }, [cy, toggleChildren]);
}
