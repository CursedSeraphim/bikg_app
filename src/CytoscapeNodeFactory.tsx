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

export function treeLayout(
  root,
  spacing = {
    x: 100,
    y: 50,
  },
) {
  function recurse(node, level = 0, offsetX = 0) {
    const children = getChildren(node);
    // let currentX = offsetX;
    // console.log('just set the x of node', node.id(), 'to', currentX);

    // children.forEach((child, index) => {
    //   const x = currentX + (index === 0 ? 0 : spacing.x);
    //   const y = spacing.y * (level + 1);

    //   // Adjust children's position in the layout.
    //   child.position({ x, y });

    //   // Recursive call per level
    //   currentX = recurse(child, level + 1, currentX);
    // });
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
