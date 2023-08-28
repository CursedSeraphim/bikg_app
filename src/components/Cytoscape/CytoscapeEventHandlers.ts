import { Core } from 'cytoscape';

export function registerCytoscapeEventListeners(cy: Core | null, toggleChildren: any) {
  if (!cy) return () => {};

  // TODO Initialize the context menu?

  // Register dblclick event
  cy.on('dblclick', 'node', (evt) => {
    const node = evt.target;
    toggleChildren(node);
  });

  // Register cxttap event
  cy.on('cxttap', 'node', (evt) => {
    const node = evt.target;
    // Your additional cxttap logic here if needed
  });

  // Return a cleanup function
  return () => {
    cy.off('dblclick', 'node');
    cy.off('cxttap', 'node');
  };
}
