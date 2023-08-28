import { Core } from 'cytoscape';

export function registerCytoscapeEventListeners(cy: Core | null, toggleChildren: any) {
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
