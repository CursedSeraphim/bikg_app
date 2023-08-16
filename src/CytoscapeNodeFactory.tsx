// CytoscapeNodeFactory.tsx
import cytoscape from 'cytoscape';

import { ICytoNode, ICytoEdge } from './types';

/**
 * Node Factory for creating Cytoscape nodes and edges in a tree structure.
 */
export class CytoscapeNodeFactory {
  private nodeIdCounter = 0;

  private edgeIdCounter = 0;

  constructor() {
    this.nodeIdCounter = 0;
    this.edgeIdCounter = 0;
  }

  /**
   * Creates a node with an optional parent. Returns the node and edge if a parent is specified.
   * @param label - The label for the node.
   * @param parent - The parent node (optional).
   * @returns An array containing the created node and optionally an edge.
   */
  createNode(label?: string, parent?: ICytoNode): [ICytoNode, ICytoEdge?] {
    const id = `node-${this.nodeIdCounter++}`;
    const node: ICytoNode = {
      data: { id, label, visible: true },
    };

    if (parent) {
      const edge: ICytoEdge = {
        data: { id: `edge-${this.edgeIdCounter++}`, source: parent.data.id, target: id, visible: true },
      };
      return [node, edge];
    }

    return [node];
  }

  /**
   * Creates a tree structure with the specified depth and children per node.
   * @param depth - The depth of the tree.
   * @param childrenPerNode - The number of children per node.
   * @param labelProvider - A function that provides labels for nodes, defaulting to "Node {index}".
   * @returns An array of elements representing the tree structure.
   */
  createTree(depth: number, childrenPerNode: number, labelProvider: (index: number) => string = (index) => `Node ${index}`): ICytoNode[] {
    const elements: ICytoNode[] = [];
    const buildTree = (parent: ICytoNode, currentDepth: number): void => {
      console.log('called with depth', currentDepth, 'and parent', parent.data.id);
      if (currentDepth === depth) return;

      for (let i = 0; i < childrenPerNode; i++) {
        const [node, edge] = this.createNode(labelProvider(this.nodeIdCounter), parent);
        elements.push(node);
        if (edge) elements.push(edge as ICytoNode); // Since edge has a different structure, it needs to be casted if you intend to keep it in the same array

        buildTree(node, currentDepth + 1);
      }
    };

    const [rootNode] = this.createNode(labelProvider(this.nodeIdCounter));
    elements.push(rootNode);
    buildTree(rootNode, 0);

    return elements;
  }
}

/**
 * Gets the children of a given node based on specific criteria.
 * If incoming edges include an edge with id 'sh:targetClass'  or 'rdfs:subClassOf',
 * then return all source nodes of that edge. Otherwise,
 * return all outgoing target nodes.
 *
 * @param {Object} node - The node for which to find the children.
 * @return {Array} The children nodes based on the criteria.
 */
export const getChildren = (node) => {
  // for the sake of more sensible layout, if the parent is a targetClass or subClassOf, treat it as a child
  // this is because it is clearer if nodeshapes are below types in the hierarchy
  let parentShouldBeTreatedAsChild = false;
  node
    .incomers()
    .edges()
    .forEach((edge) => {
      if (edge.data('label') === 'sh:targetClass' || edge.data('label') === 'rdfs:subClassOf') {
        parentShouldBeTreatedAsChild = true;
      }
    });
  if (parentShouldBeTreatedAsChild) {
    return node.outgoers().sources();
  }
  return node.outgoers().targets();
};

/**
 * Gets the parents of a given node based on specific criteria.
 * If outgoing edges include an edge with id 'sh:targetClass' or 'rdfs:subClassOf',
 * then return all target nodes of that edge. Otherwise,
 * return all source nodes of the incoming edges.
 *
 * @param {Object} node - The node for which to find the parents.
 * @return {Array} The parent nodes based on the criteria.
 */
export const getParents = (node) => {
  // Check if this node has outgoing edges with id 'sh:targetClass' or 'rdfs:subClassOf'
  // which indicates that the target of these edges is a parent.
  const parentsViaOutgoingEdges = [];
  node
    .outgoers()
    .edges()
    .forEach((edge) => {
      if (edge.data('label') === 'sh:targetClass' || edge.data('label') === 'rdfs:subClassOf') {
        parentsViaOutgoingEdges.push(edge.target());
      }
    });

  // If there are any parents found via outgoing edges, return them
  if (parentsViaOutgoingEdges.length) {
    return parentsViaOutgoingEdges;
  }

  // Otherwise, return the source nodes of all incoming edges as the parents.
  return node.incomers().sources();
};

/**
 * Traverses the children of the given root node and returns a map where the keys are the IDs of the nodes, and the values are their positions.
 * @param root - The root node of the tree.
 * @returns A map object with node IDs and their corresponding positions.
 */
export function getNodePositions(root: cytoscape.NodeSingular): Map<string, cytoscape.Position> {
  const positions = new Map<string, cytoscape.Position>();

  // Recursive function to traverse children
  const traverseChildren = (node: cytoscape.NodeSingular) => {
    positions.set(node.id(), node.position());
    getChildren(node).forEach((child) => {
      traverseChildren(child);
    });
  };

  traverseChildren(root);

  return positions;
}

export function treeLayout(
  root,
  spacing = {
    x: 100,
    y: 50,
  },
) {
  // Create a set to keep track of nodes that have been processed
  const processedNodes = new Set();

  function hasChildren(node) {
    return getChildren(node).length > 0;
  }

  if (!hasChildren(root)) {
    root.position({ x: 0, y: 0 });
    return root;
  }

  function averageChildXPosition(node) {
    const children = getChildren(node);
    if (!children.length) return node.position().x;

    const totalX = children.reduce((acc, child) => acc + child.position().x, 0);
    return totalX / children.length;
  }

  function layoutNodeAndChildren(node, level = 0, offsetX = 0) {
    // If the node has been processed, return to prevent infinite recursion
    if (processedNodes.has(node)) {
      return offsetX;
    }

    // Mark the node as processed
    processedNodes.add(node);

    const children = getChildren(node);
    let lastChildX = offsetX;

    children.forEach((child, index) => {
      const x = index === 0 ? offsetX : lastChildX + spacing.x;
      const y = spacing.y * (level + 1);
      child.position({ x, y });
      lastChildX = layoutNodeAndChildren(child, level + 1, x);
    });

    const nodeXPosition = averageChildXPosition(node);
    node.position({ x: nodeXPosition, y: node.position().y });
    return lastChildX + (hasChildren(node) ? spacing.x : 0);
  }

  root.position({ x: 0, y: 0 });
  layoutNodeAndChildren(root);

  const rootXPosition = averageChildXPosition(root);
  root.position({ x: rootXPosition, y: root.position().y });

  return root;
}

/**
 * Deletes nodes (and their descendants) from the tree given their IDs.
 *
 * @param root - The root node of the tree.
 * @param idsToDelete - List of node IDs to delete.
 * @returns void
 */
export function deleteNodes(root: cytoscape.NodeSingular, idsToDelete: string[]): void {
  // Recursive function to check and delete nodes
  const checkAndDelete = (node: cytoscape.NodeSingular): boolean => {
    // Check children first
    const children = getChildren(node);
    const childrenToDelete = [];
    for (const child of children) {
      if (checkAndDelete(child)) {
        childrenToDelete.push(child);
      }
    }

    // Remove children marked for deletion
    for (const child of childrenToDelete) {
      child.remove();
    }

    // If the current node's id is in the list of IDs to delete or all of its children have been deleted, delete it
    if (idsToDelete.includes(node.id()) || (children.length && childrenToDelete.length === children.length)) {
      node.remove();
      return true;
    }

    return false;
  };

  // Start from the root node
  checkAndDelete(root);
}

const deg2rad = function (degrees) {
  return (degrees * Math.PI) / 180;
};

function rotateNodesWithD3(nodes, angle, origin) {
  const radians = deg2rad(angle); // Convert angle to radians

  return nodes.map((node) => {
    // Translate to origin
    const x = node.x - origin.x;
    const y = node.y - origin.y;

    // Rotate using D3's rotation formula
    const newX = x * Math.cos(radians) - y * Math.sin(radians);
    const newY = x * Math.sin(radians) + y * Math.cos(radians);

    // Translate back from origin
    return {
      x: newX + origin.x,
      y: newY + origin.y,
    };
  });
}

// export function rotateNodes(nodes, angle) {
//   const bb = nodes.boundingBox(); // the bounding box of the collection
//   const cx = (bb.x1 + bb.x2) / 2; // the x-coordinate of the center of the collection
//   const cy = (bb.y1 + bb.y2) / 2; // the y-coordinate of the center of the collection
//   angle = (angle * Math.PI) / 180; // convert angle from degrees to radians

//   nodes
//     .layout({
//       name: 'preset',
//       animate: true,
//       fit: false,
//       transform: (node) => {
//         const position = node.position();
//         const x = position.x - cx;
//         const y = position.y - cy;
//         position.x = x * Math.cos(angle) - y * Math.sin(angle) + cx;
//         position.y = x * Math.sin(angle) + y * Math.cos(angle) + cy;
//         return position;
//       },
//     })
//     .run();
// }

/**
 * Rotates a collection of nodes in cytoscape about their collective center.
 *
 * @param {Object} nodes - A collection of nodes in cytoscape to be rotated.
 * @param {number} angle - The angle (in degrees) by which the nodes should be rotated.
 *                          Positive values represent counter-clockwise rotations, and negative values represent clockwise rotations.
 *
 * @example
 * const nodes = cy.elements('node'); // get all nodes from cytoscape instance
 * rotateNodes(nodes, 45); // rotates the nodes 45 degrees counter-clockwise about their collective center
 */
export function rotateNodes(nodes, angle) {
  const bb = nodes.boundingBox(); // the bounding box of the collection
  const cx = (bb.x1 + bb.x2) / 2; // the x-coordinate of the center of the collection
  const cy = (bb.y1 + bb.y2) / 2; // the y-coordinate of the center of the collection
  angle = (angle * Math.PI) / 180; // convert angle from degrees to radians

  nodes.forEach((node) => {
    const position = node.position();
    const x = position.x - cx;
    const y = position.y - cy;
    position.x = x * Math.cos(angle) - y * Math.sin(angle) + cx;
    position.y = x * Math.sin(angle) + y * Math.cos(angle) + cy;
    node.position(position); // setting the new position for each node
  });
}

export function translateNodesToPosition(nodes, x, y) {
  const bb = nodes.boundingBox(); // the bounding box of the collection
  const cx = (bb.x1 + bb.x2) / 2; // the x-coordinate of the center of the collection
  const cy = (bb.y1 + bb.y2) / 2; // the y-coordinate of the center of the collection
  const dx = x - cx; // the amount by which to translate the nodes along the x axis
  const dy = y - cy; // the amount by which to translate the nodes along the y axis

  nodes.positions((node, i) => {
    const position = node.position();
    position.x += dx;
    position.y += dy;
    return position;
  });
}

/**
 * Moves a collection of nodes in cytoscape to the bottom right of the bounding box
 * of all other nodes while maintaining their relative distances to each other.
 *
 * @param {Object} targetCollection - The collection of nodes to be moved.
 */
export function moveCollectionToBottomRight(cy, targetCollection) {
  const allNodes = cy.nodes();
  const otherNodes = allNodes.difference(targetCollection);

  // 1. Calculate the bounding box for all nodes except the nodes in target collection.
  const otherNodesBB = otherNodes.boundingBox();

  // 2. Calculate the bounding box for the target collection.
  const targetCollectionBB = targetCollection.boundingBox();

  // 3. Determine the new position for the top-left corner of target collection's bounding box.
  const newTopLeftX = otherNodesBB.x2;
  const newTopLeftY = otherNodesBB.y2;

  // 4. Calculate the translation.
  const translationX = newTopLeftX - targetCollectionBB.x1;
  const translationY = newTopLeftY - targetCollectionBB.y1;

  // 5. Move all nodes in the target collection.
  targetCollection.positions((node) => {
    const currentPosition = node.position();
    return {
      x: currentPosition.x + translationX,
      y: currentPosition.y + translationY,
    };
  });
}

/**
 * Finds the root node in a collection where all other nodes are below it in the hierarchy.
 *
 * @param {Object} nodeCollection - A collection of nodes.
 * @returns {Object} The root node.
 */
export function findRootNode(nodeCollection) {
  for (let i = 0; i < nodeCollection.length; i++) {
    console.log('-------------------');
    const node = nodeCollection[i];
    const parents = getParents(node);
    console.log(
      'node',
      node.id(),
      'has parents',
      parents.map((parent) => parent.id()),
    );

    let hasParentInCollection = false;

    for (const parent of parents) {
      if (nodeCollection.includes(parent)) {
        hasParentInCollection = true;
        console.log('node', node.id(), 'has parent', parent.id(), 'in collection, therefore it is not the root node');
        break;
      }
    }

    // If the current node doesn't have any parent in the collection, it's the root node.
    if (!hasParentInCollection) {
      return node;
    }
  }

  return null; // In case no root is found, though given the problem's constraints, this should not happen.
}
