// src/components/Cytoscape/TreeLayoutHelpers.ts
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
 * @param {Map<string, {x: number, y: number, visible: boolean}>} initialNodeData -
 *        An Map where keys are node IDs and values are objects containing x, y coordinates
 *        and a visibility flag.
 */
export function resetNodes(cy: cytoscape.Core, initialNodeData: Map<string, { x: number; y: number; visible: boolean }>) {
  cy.startBatch();

  for (const [id, { x, y, visible }] of initialNodeData) {
    const node = cy.getElementById(id);
    if (node.empty()) continue;

    // Set x, y, and visible properties directly
    node.json({
      position: { x, y },
      data: { visible },
      style: { display: 'none' },
    });

    if (visible) {
      node.removeClass('hidden').addClass('visible');
    } else {
      node.removeClass('visible').addClass('hidden');
    }
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
 * Fetch and categorize nodes based on violations, types, and groups.
 * Uses selectedViolations to get the nodes that need to be visible to show the path to the types using violationsTypesMap.
 * Differentiates whether these nodes are selected types or not.
 * Independently of this logic also returns the selectedViolatoinGroups.
 * @returns {Object} An object containing categorized nodes: violationNodes, typeNodes, otherNodes, and groupNodes.
 */
export function getFilteredNodes(cy, selectedViolations, violationsTypesMap, selectedTypes, selectedViolationGroups) {
  const violationNodes = getNodesFromIds(selectedViolations, cy);
  const connectedNodesIds = selectedViolations.flatMap((violation) => violationsTypesMap[violation]);

  const typeNodeIds = connectedNodesIds.filter((node) => selectedTypes.includes(node));
  const otherNodeIds = connectedNodesIds.filter((node) => !selectedTypes.includes(node));

  return {
    violationNodes,
    typeNodes: getNodesFromIds(typeNodeIds, cy),
    otherNodes: getNodesFromIds(otherNodeIds, cy),
    groupNodes: getNodesFromIds(selectedViolationGroups, cy),
  };
}

// Helper function to apply styles to nodes
export function showCytoElements(element) {
  element.removeClass('hidden').addClass('visible');
  element.data('visible', true);
}

/**
 * Adjust the layout of nodes for better visibility and organization.
 * @param {Collection} violationNodes - Nodes representing violations.
 * @param {Collection} typeNodes - Nodes representing types.
 * @param {Collection} otherNodes - Other nodes.
 * @param {Collection} groupNodes - Nodes representing groups.
 */
export function adjustLayout(cy, violationNodes, typeNodes, otherNodes, groupNodes) {
  const potentialRoots = typeNodes.union(otherNodes).union(violationNodes);
  const everything = potentialRoots.union(violationNodes).union(groupNodes).union(groupNodes.outgoers().targets());
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
 * @param {Collection} groupNodes - Nodes representing groups.
 */
export function styleAndDisplayNodes(typeNodes, otherNodes, groupNodes, violationNodes) {
  showCytoElements(violationNodes.union(otherNodes).union(typeNodes).union(groupNodes).union(groupNodes.outgoers().targets()));
}

export function hideAllNonPermanentNodes(cy) {
  cy.nodes()
    .filter((node) => node.data('permanent') === false)
    .style('display', 'none')
    .data('visible', false);
}
