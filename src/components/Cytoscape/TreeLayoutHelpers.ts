// TreeLayoutHelpers.ts
import cytoscape from 'cytoscape';
import { findRootNodes, moveCollectionToCoordinates, rotateNodes, treeLayout } from '../../CytoscapeNodeFactory';
import { UNFOLDED_SUBTREE_BOUNDING_BOX_MARGIN } from '../../constants';

// Helper function to hide nodes
export function hideVisibleNodes(nodeList) {
  nodeList.current.forEach((nodeCollection) => {
    nodeCollection.forEach((node) => {
      if (node.data('permanent') === false) {
        node.style('display', 'none');
        node.data('visible', false);
      }
    });
  });

  // return empty to clear nodeList.current
  return [];
}

/**
 * Add a virtual root to the collection and connect it to the provided roots.
 * @param {Collection} roots - The roots to which the virtual root should be connected.
 * @returns {Node} The added virtual root node.
 */
export function addVirtualRoot(cy, roots) {
  const virtualRoot = cy.add({
    group: 'nodes',
    data: { id: 'virtualRoot' },
  });
  roots.forEach((node) => {
    cy.add({
      group: 'edges',
      data: {
        source: virtualRoot.id(),
        target: node.id(),
        label: 'virtualParent',
      },
    });
  });
  return virtualRoot;
}

/**
 * Resets the positions and visibility of nodes based on the provided initial positions map.
 *
 * @param {cytoscape.Core} cy - The Cytoscape instance.
 * @param {Map<string, {x: number, y: number, visible: boolean}>} initialNodePositions -
 *        An Map where keys are node IDs and values are objects containing x, y coordinates
 *        and a visibility flag.
 */
export function resetNodePositions(cy: cytoscape.Core, initialNodePositions: Map<string, { x: number; y: number; visible: boolean }>) {
  cy.startBatch();

  for (const [id, { x, y, visible }] of initialNodePositions) {
    const node = cy.getElementById(id);
    if (node.empty()) continue;

    // Set x, y, and visible properties directly
    node.json({
      position: { x, y },
      data: { visible },
      style: { display: visible ? 'element' : 'none' },
    });
  }

  cy.endBatch();
}

// Helper function to get nodes from ids
export function getNodesFromIds(ids, cy) {
  let nodes = cy.collection();
  ids.forEach((id) => {
    nodes = nodes.union(cy.getElementById(id));
  });
  return nodes;
}

/**
 * Fetch and categorize nodes based on violations, types, and exemplars.
 * Uses selectedViolations to get the nodes that need to be visible to show the path to the types using violationsTypesMap.
 * Differentiates whether these nodes are selected types or not.
 * Independently of this logic also returns the selectedViolatoinExemplars.
 * @returns {Object} An object containing categorized nodes: violationNodes, typeNodes, otherNodes, and exemplarNodes.
 */
export function getFilteredNodes(cy, selectedViolations, violationsTypesMap, selectedTypes, selectedViolationExemplars) {
  const violationNodes = getNodesFromIds(selectedViolations, cy);
  const connectedNodesIds = selectedViolations.flatMap((violation) => violationsTypesMap[violation]);

  const typeNodeIds = connectedNodesIds.filter((node) => selectedTypes.includes(node));
  const otherNodeIds = connectedNodesIds.filter((node) => !selectedTypes.includes(node));

  return {
    violationNodes,
    typeNodes: getNodesFromIds(typeNodeIds, cy),
    otherNodes: getNodesFromIds(otherNodeIds, cy),
    exemplarNodes: getNodesFromIds(selectedViolationExemplars, cy),
  };
}

// Helper function to apply styles to nodes
export function showCytoElements(element) {
  element.style({
    display: 'element',
  });
  element.data('visible', true);
}

/**
 * Adjust the layout of nodes for better visibility and organization.
 * @param {Collection} violationNodes - Nodes representing violations.
 * @param {Collection} typeNodes - Nodes representing types.
 * @param {Collection} otherNodes - Other nodes.
 * @param {Collection} exemplarNodes - Nodes representing exemplars.
 */
export function adjustLayout(cy, violationNodes, typeNodes, otherNodes, exemplarNodes) {
  const potentialRoots = typeNodes.union(otherNodes);
  const everything = potentialRoots.union(violationNodes).union(exemplarNodes).union(exemplarNodes.outgoers().targets());
  const roots = findRootNodes(potentialRoots);
  const layoutSpacing = { x: 70, y: 500 };

  cy.startBatch();

  if (roots?.length > 1) {
    const virtualRoot = addVirtualRoot(cy, roots);
    treeLayout(virtualRoot, layoutSpacing, virtualRoot.union(everything));
    cy.remove(virtualRoot);
  } else if (roots?.length === 1) {
    const root = roots[0];
    treeLayout(root, layoutSpacing, everything);
  }

  rotateNodes(everything, -90);
  cy.endBatch();

  let maxX = -Infinity;
  cy.nodes().forEach((node) => {
    if (node.data('permanent') === false) return;
    const x = node.position('x');
    maxX = Math.max(maxX, x);
  });
  const newX = maxX + UNFOLDED_SUBTREE_BOUNDING_BOX_MARGIN;
  moveCollectionToCoordinates(everything, newX);
}

/**
 * Apply styles and display settings to nodes based on their categorization.
 * @param {Collection} violationNodes - Nodes representing violations.
 * @param {Collection} typeNodes - Nodes representing types.
 * @param {Collection} otherNodes - Other nodes.
 * @param {Collection} exemplarNodes - Nodes representing exemplars.
 */
export function styleAndDisplayNodes(listOfNodesThatHaveBeenMadeVisible, typeNodes, otherNodes, exemplarNodes, violationNodes) {
  showCytoElements(violationNodes.union(otherNodes).union(typeNodes).union(exemplarNodes));

  exemplarNodes.outgoers().targets().data('visible', true);
  exemplarNodes.outgoers().targets().style('display', 'element');

  listOfNodesThatHaveBeenMadeVisible.current.push(violationNodes, otherNodes, exemplarNodes, typeNodes, exemplarNodes.outgoers().targets());
}

/**
 * Hide all nodes that have previously been made visible. Convenience function using the listOfNodesThatHaveBeenMadeVisible ref.
 */
export function hideAllVisibleNodes(listOfNodesThatHaveBeenMadeVisible) {
  listOfNodesThatHaveBeenMadeVisible.current = hideVisibleNodes(listOfNodesThatHaveBeenMadeVisible);
}
