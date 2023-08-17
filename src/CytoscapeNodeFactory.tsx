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
 * If incoming edges include an edge with label 'sh:targetClass' or 'rdfs:subClassOf',
 * then return all source nodes of that edge. Otherwise,
 * return all outgoing target nodes but exclude targets of outgoing edges with label 'sh:targetClass' or 'rdfs:subClassOf'.
 *
 * @param {Object} node - The node for which to find the children.
 * @return {Collection} The children nodes based on the criteria.
 */
export const getChildren = (node) => {
  const childrenCollection = [];

  // Process incoming edges with specific labels
  node
    .incomers()
    .edges()
    .forEach((edge) => {
      if (edge.data('label') === 'sh:targetClass' || edge.data('label') === 'rdfs:subClassOf') {
        childrenCollection.push(edge.source());
      }
    });

  // Process outgoing edges but exclude targets of edges with specific labels
  node
    .outgoers()
    .edges()
    .forEach((edge) => {
      if (!(edge.data('label') === 'sh:targetClass' || edge.data('label') === 'rdfs:subClassOf')) {
        childrenCollection.push(edge.target());
      }
    });

  return childrenCollection;
};

/**
 * Gets the parents of a given node based on specific criteria.
 * If outgoing edges include an edge with label 'sh:targetClass' or 'rdfs:subClassOf',
 * then return all target nodes of that edge. Otherwise,
 * return all incoming source nodes but exclude sources of incoming edges with label 'sh:targetClass' or 'rdfs:subClassOf'.
 *
 * @param {Object} node - The node for which to find the parents.
 * @return {Collection} The parent nodes based on the criteria.
 */
export const getParents = (node) => {
  const parentsCollection = [];

  // Process outgoing edges with specific labels
  node
    .outgoers()
    .edges()
    .forEach((edge) => {
      if (edge.data('label') === 'sh:targetClass' || edge.data('label') === 'rdfs:subClassOf') {
        parentsCollection.push(edge.target());
      }
    });

  // Process incoming edges but exclude sources of edges with specific labels
  node
    .incomers()
    .edges()
    .forEach((edge) => {
      if (!(edge.data('label') === 'sh:targetClass' || edge.data('label') === 'rdfs:subClassOf')) {
        parentsCollection.push(edge.source());
      }
    });

  return parentsCollection;
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

export function collectionIntoColumn(collection, yDistance) {
  for (let i = 0; i < collection.length; i += 1) {
    const n = collection[i];
    const nPos = n.position();
    n.position({ x: nPos.x, y: nPos.y + i * yDistance });
  }
}

/**
 * Arranges nodes in a tree layout. If a collection of nodes is provided, only nodes
 * within this collection will be positioned; others will be ignored.
 *
 * The layout algorithm places the root node at the origin (0, 0) and arranges its
 * children based on the specified horizontal (x) and vertical (y) spacing. If a node
 * is not in the provided node collection (if specified), it will not be positioned.
 * The positioning is carried out recursively for each child node and its subsequent
 * descendants. Each node's x-position is determined by the average x-position of its
 * children.
 *
 * @param {Object} root - The root node from where the layout begins.
 * @param {Object} spacing - An object with x and y properties determining the spacing between nodes.
 *                           Default is { x: 100, y: 50 }.
 * @param {Set} nodeCollection - (Optional) A set of nodes that should be positioned. If not provided,
 *                               all nodes will be considered.
 *
 * @return {Object} The root node after positioning.
 *
 * @example
 *
 * treeLayout(rootNode, { x: 150, y: 70 }, new Set([node1, node2, node3]));
 */
export function treeLayout(
  root,
  spacing = {
    x: 100,
    y: 50,
  },
  nodeCollection = null, // default is null which means all nodes are considered
) {
  // Create a set to keep track of nodes that have been processed
  const processedNodes = new Set();

  function isInCollection(node) {
    return !nodeCollection || nodeCollection.has(node);
  }

  function hasChildren(node) {
    return getChildren(node).filter(isInCollection).length > 0;
  }

  if (!isInCollection(root) || !hasChildren(root)) {
    root.position({ x: 0, y: 0 });
    return root;
  }

  function averageChildXPosition(node) {
    const children = getChildren(node).filter(isInCollection);
    if (!children.length) return node.position().x;

    const totalX = children.reduce((acc, child) => acc + child.position().x, 0);
    return totalX / children.length;
  }

  function layoutNodeAndChildren(node, level = 0, offsetX = 0) {
    if (!isInCollection(node)) {
      return offsetX;
    }

    // If the node has been processed, return to prevent infinite recursion
    if (processedNodes.has(node)) {
      return offsetX;
    }

    // Mark the node as processed
    processedNodes.add(node);

    const children = getChildren(node).filter(isInCollection);
    let lastChildX = offsetX;

    children.forEach((child, index) => {
      const x = index === 0 ? offsetX : lastChildX + spacing.x;
      const y = spacing.y * (level + 1);
      child.position({ x, y });
      lastChildX = layoutNodeAndChildren(child, level + 1, x);
    });

    const nodeXPosition = averageChildXPosition(node);
    node.position({ x: nodeXPosition, y: node.position().y });
    return lastChildX;
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
  const radians = (angle * Math.PI) / 180; // convert angle from degrees to radians

  nodes.forEach((node) => {
    const position = node.position();
    const x = position.x - cx;
    const y = position.y - cy;
    position.x = x * Math.cos(radians) - y * Math.sin(radians) + cx;
    position.y = x * Math.sin(radians) + y * Math.cos(radians) + cy;
    node.position(position); // setting the new position for each node
  });
}

export function translateNodesToPosition(nodes, x, y) {
  const bb = nodes.boundingBox(); // the bounding box of the collection
  const cx = (bb.x1 + bb.x2) / 2; // the x-coordinate of the center of the collection
  const cy = (bb.y1 + bb.y2) / 2; // the y-coordinate of the center of the collection
  const dx = x - cx; // the amount by which to translate the nodes along the x axis
  const dy = y - cy; // the amount by which to translate the nodes along the y axis

  nodes.positions((node) => {
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
 * Moves a collection of nodes in Cytoscape to the specified x/y coordinates
 * while maintaining their relative distances to each other. If the collection contains
 * duplicate nodes, each node is only moved once to ensure consistent positioning.
 * If no x or y coordinate is provided, the current x or y coordinate of the
 * targetCollection is retained.
 *
 * @param {Object} targetCollection - The collection of nodes to be moved.
 *                                    Can contain duplicate nodes.
 * @param {number|null} x - The desired x-coordinate for the top-left corner
 *                          of the target collection's bounding box, or null
 *                          to retain the current x-coordinate.
 * @param {number|null} y - The desired y-coordinate for the top-left corner
 *                          of the target collection's bounding box, or null
 *                          to retain the current y-coordinate.
 */
export function moveCollectionToCoordinates(targetCollection, x = null, y = null) {
  // 1. Calculate the bounding box for the target collection.
  const targetCollectionBB = targetCollection.boundingBox();

  // 2. Calculate the translation values. If x or y is null, use the current bounding box value.
  const translationX = x !== null ? x - targetCollectionBB.x1 : 0;
  const translationY = y !== null ? y - targetCollectionBB.y1 : 0;

  // Set to keep track of already processed nodes
  const processedNodes = new Set();

  targetCollection.forEach((node) => {
    if (!processedNodes.has(node.id())) {
      // Only process nodes that haven't been processed
      const currentPosition = node.position();
      node.position({
        x: currentPosition.x + translationX,
        y: currentPosition.y + translationY,
      });
      processedNodes.add(node.id()); // Mark the node as processed
    }
  });
}

/**
 * Finds all potential root nodes in a collection where all other nodes are below them in the hierarchy.
 *
 * @param {Object} nodeCollection - A collection of nodes.
 * @returns {Array} The array of root nodes.
 */
export function findRootNodes(nodeCollection) {
  const potentialRoots = [];

  for (let i = 0; i < nodeCollection.length; i++) {
    const node = nodeCollection[i];
    const parents = getParents(node);

    let hasParentInCollection = false;

    for (const parent of parents) {
      if (nodeCollection.includes(parent)) {
        hasParentInCollection = true;
        break;
      }
    }

    // If the current node doesn't have any parent in the collection, it's a potential root node.
    if (!hasParentInCollection) {
      potentialRoots.push(node);
    }
  }

  return potentialRoots;
}

/**
 * Retrieves all successors (children, grandchildren, etc.) for a collection of nodes.
 *
 * @param {Array} collection - The collection of nodes.
 * @return {Collection} The combined collection of successors.
 */
export function getSuccessors(collection) {
  const successors = collection.cy().collection();
  const visited = new Set();

  // Helper function to recursively get successors for a node
  function getSuccessorsForNode(node) {
    if (visited.has(node)) {
      // Skip this node since it has been visited before
      return;
    }

    visited.add(node);
    const children = getChildren(node);

    // Add children directly into the successors collection
    successors.push(...children);

    // Recursively get successors for each child
    children.forEach((child) => {
      getSuccessorsForNode(child);
    });
  }

  // Start the recursive retrieval of successors for each node in the initial collection
  collection.forEach((node) => {
    getSuccessorsForNode(node);
  });

  return successors;
}
