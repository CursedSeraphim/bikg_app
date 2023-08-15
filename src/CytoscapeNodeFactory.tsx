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
 * If incoming edges include an edge with id 'sh:targetClass',
 * then return all source nodes of that edge. Otherwise,
 * return all outgoing target nodes.
 *
 * @param {Object} node - The node for which to find the children.
 * @return {Array} The children nodes based on the criteria.
 */
export const getChildren = (node) => {
  let targetClassNode = false;
  node
    .incomers()
    .edges()
    .forEach((edge) => {
      if (edge.data('id') === 'sh:targetClass') {
        targetClassNode = true;
      }
    });
  if (targetClassNode) {
    return node.outgoers().sources();
  }
  return node.outgoers().targets();
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

export function treeLayoutLeftAlign(
  root,
  spacing = {
    x: 100,
    y: 50,
  },
) {
  function recurse(node, level = 0, offsetX = 0) {
    const children = getChildren(node);
    let lastRecursionX = offsetX;
    children.forEach((child, index) => {
      // unless first child node, position at the last returned position of the recursive call. if first child node call with position of parent which is offsetX
      const x = index === 0 ? offsetX : lastRecursionX + spacing.x;
      const y = spacing.y * (level + 1);
      child.position({ x, y });
      lastRecursionX = recurse(child, level + 1, x);
    });

    return lastRecursionX;
  }

  recurse(root);
  return root;
}

/**
 * Lays out the nodes of a tree in a structured manner. The parent nodes will be centered above their children.
 *
 * @param {Object} root - The root node of the tree.
 * @param {Object} spacing - The spacing between nodes in x and y directions. Default: { x: 100, y: 50 }.
 * @returns {Object} - The root node with updated position values for itself and all child nodes.
 */
export function treeLayout(
  root,
  spacing = {
    x: 100,
    y: 50,
  },
) {
  /**
   * Helper function to check if a node has children.
   *
   * @param {Object} node - The node to check.
   * @returns {boolean} - True if the node has children, false otherwise.
   */
  function hasChildren(node) {
    return getChildren(node).length > 0;
  }

  // Early exit if no children for root node. Set its position to (0, 0) and return.
  if (!hasChildren(root)) {
    root.position({ x: 0, y: 0 });
    return root;
  }

  /**
   * Computes the average x-position of a node's children.
   * If the node has no children, returns the node's current x-position.
   *
   * @param {Object} node - The node whose children's average x-position is to be computed.
   * @returns {number} - The average x-position value.
   */
  function averageChildXPosition(node) {
    const children = getChildren(node);
    if (!children.length) return node.position().x;

    const totalX = children.reduce((acc, child) => acc + child.position().x, 0);
    return totalX / children.length;
  }

  /**
   * Recursive function to layout a node and its children in the tree.
   * It updates each node's x and y position based on spacing and the average position of its children.
   *
   * @param {Object} node - The current node to layout.
   * @param {number} level - The depth of the node in the tree (root is level 0).
   * @param {number} offsetX - The x-position offset for the node.
   * @returns {number} - The x-position value where the next sibling of this node should be placed.
   */
  function layoutNodeAndChildren(node, level = 0, offsetX = 0) {
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

  // Set the initial position for root node
  root.position({ x: 0, y: 0 });
  // Start the layout from the root node
  layoutNodeAndChildren(root);

  // Adjust root's x-position after the recursion to be centered above its children
  const rootXPosition = averageChildXPosition(root);
  root.position({ x: rootXPosition, y: root.position().y });

  return root;
}
