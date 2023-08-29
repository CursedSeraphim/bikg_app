// useSubscribeCytoscape.ts
import React, { useEffect } from 'react';
import { Core } from 'cytoscape';
import { useStore } from 'react-redux';
import { IRootState } from '../../types';
import { findRootNodes, getSuccessors, moveCollectionToCoordinates, rotateNodes, treeLayout } from '../../CytoscapeNodeFactory';

// Helper function to hide nodes
function hideVisibleNodes(nodeList) {
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
function addVirtualRoot(cy, roots) {
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
 * Resets the positions of nodes to their initial state and hides nodes with (0,0) positions.
 * @param {Cytoscape.Core} cy - The cytoscape instance.
 * @param {Collection} nodes - The collection of nodes to reset.
 */
function resetNodePositions(cy, nodes, initialNodePositions) {
  const nodesToHideArray = [];

  cy.batch(() => {
    nodes.forEach((node) => {
      const pos = initialNodePositions.current.get(node.id());
      if (pos) {
        node.position(pos);

        if (pos.x === 0 && pos.y === 0) {
          nodesToHideArray.push(node);
        }
      }
    });
  });

  const nodesToHide = cy.collection(nodesToHideArray);
  nodesToHide.style('display', 'none');
  nodesToHide.data('visible', false);
}

// Helper function to get nodes from ids
function getNodesFromIds(ids, cy) {
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
function getFilteredNodes(cy, selectedViolations, violationsTypesMap, selectedTypes, selectedViolationExemplars) {
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
function showCytoElements(element) {
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
function adjustLayout(cy, violationNodes, typeNodes, otherNodes, exemplarNodes) {
  const potentialRoots = typeNodes.union(otherNodes);
  const everything = typeNodes.union(otherNodes).union(violationNodes).union(exemplarNodes).union(exemplarNodes.outgoers().targets());
  const roots = findRootNodes(potentialRoots);
  const layoutSpacing = { x: 70, y: 500 };

  if (roots?.length > 1) {
    const virtualRoot = addVirtualRoot(cy, roots);
    treeLayout(virtualRoot, layoutSpacing, virtualRoot.union(everything));
    cy.remove(virtualRoot);
  } else if (roots?.length === 1) {
    const root = roots[0];
    treeLayout(root, layoutSpacing, everything);
  }

  rotateNodes(everything, -90);
  const bb = cy.nodes().difference(everything).boundingBox();
  moveCollectionToCoordinates(everything, bb.x2);
}

/**
 * Apply styles and display settings to nodes based on their categorization.
 * @param {Collection} violationNodes - Nodes representing violations.
 * @param {Collection} typeNodes - Nodes representing types.
 * @param {Collection} otherNodes - Other nodes.
 * @param {Collection} exemplarNodes - Nodes representing exemplars.
 */
function styleAndDisplayNodes(listOfNodesThatHaveBeenMadeVisible, typeNodes, otherNodes, exemplarNodes, violationNodes) {
  showCytoElements(violationNodes.union(otherNodes).union(typeNodes).union(exemplarNodes));

  exemplarNodes.outgoers().targets().data('visible', true);
  exemplarNodes.outgoers().targets().style('display', 'element');

  listOfNodesThatHaveBeenMadeVisible.current.push(violationNodes, otherNodes, exemplarNodes, typeNodes);
}

/**
 * Hide all nodes that have previously been made visible. Convenience function using the listOfNodesThatHaveBeenMadeVisible ref.
 */
function hideAllVisibleNodes(listOfNodesThatHaveBeenMadeVisible) {
  listOfNodesThatHaveBeenMadeVisible.current = hideVisibleNodes(listOfNodesThatHaveBeenMadeVisible);
}

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

// const logSelectedNodes = (cyInstance: Core) => {
//   console.log('Print all selected nodes:');
//   cyInstance.$(':selected').forEach((node) => {
//     console.log(node.id());
//   });
// };

// Custom Hook
export const useSubscribeCytoscape = (cy: Core | null, initialNodePositions) => {
  const store = useStore<IRootState>();
  const listOfNodesThatHaveBeenMadeVisible = React.useRef([]);

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const violationsTypesMap = state.combined.violationTypesMap;
      const { selectedTypes, selectedViolationExemplars, selectedViolations } = extractSelectedData(state);

      if (cy && initialNodePositions.current && initialNodePositions.current.size > 0) {
        clearSelectedNodes(cy);
        console.log('initialNodePositions.current', initialNodePositions.current);
        hideAllVisibleNodes(listOfNodesThatHaveBeenMadeVisible);
        resetNodePositions(cy, cy.nodes(), initialNodePositions);

        const { violationNodes, typeNodes, otherNodes, exemplarNodes } = getFilteredNodes(
          cy,
          selectedViolations,
          violationsTypesMap,
          selectedTypes,
          selectedViolationExemplars,
        );
        styleAndDisplayNodes(listOfNodesThatHaveBeenMadeVisible, typeNodes, otherNodes, exemplarNodes, violationNodes);
        adjustLayout(cy, violationNodes, typeNodes, otherNodes, exemplarNodes);

        violationNodes.union(typeNodes).union(otherNodes).union(exemplarNodes).union(getSuccessors(exemplarNodes)).select();
        selectNodes(cy, 'label', selectedTypes);
        selectNodes(cy, 'label', selectedViolationExemplars);
        selectNodes(cy, 'label', selectedViolations);
        cy.style().update();
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, initialNodePositions]);
};
