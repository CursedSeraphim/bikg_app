import { Core } from 'cytoscape';
import { ActionFunction } from '../../types';

export function registerCytoscapeEventListeners(cy: Core | null, toggleChildren: ActionFunction) {
  if (!cy) return () => {};

  // Register dblclick event
  cy.on('dblclick', 'node', (evt) => {
    const node = evt.target;
    toggleChildren(node);
  });

  // Return a cleanup function
  return () => {
    cy.off('dblclick', 'node');
  };
}
