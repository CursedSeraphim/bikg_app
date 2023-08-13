// CytoscapeNodeFactory.tsx
import cytoscape from 'cytoscape';

import { ICytoNode, ICytoEdge } from './types';

/**
 * Node Factory for creating Cytoscape nodes and edges in a tree structure.
 */
export class CytoscapeNodeFactory {
  private idCounter = 0;

  constructor() {
    this.idCounter = 0;
  }

  /**
   * Creates a node with an optional parent. Returns the node and edge if a parent is specified.
   * @param label - The label for the node.
   * @param parent - The parent node (optional).
   * @returns An array containing the created node and optionally an edge.
   */
  createNode(label?: string, parent?: ICytoNode): [ICytoNode, ICytoEdge?] {
    const id = `node-${this.idCounter++}`;
    const node: ICytoNode = {
      data: { id, label, visible: true },
    };

    if (parent) {
      const edge: ICytoEdge = {
        data: { id: `edge-${this.idCounter++}`, source: parent.data.id, target: id, visible: true },
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
        const [node, edge] = this.createNode(labelProvider(this.idCounter), parent);
        elements.push(node);
        if (edge) elements.push(edge as ICytoNode); // Since edge has a different structure, it needs to be casted if you intend to keep it in the same array

        buildTree(node, currentDepth + 1);
      }
    };

    const [rootNode] = this.createNode(labelProvider(this.idCounter));
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
  function recurse(node, level = 0) {
    console.log('');
    console.log('node', node.data('id'), 'level', level);
    const children = getChildren(node);
    children.forEach((child, index) => {
      console.log('child', child.data('id'), 'index', index);
      const x = spacing.x * index;
      const y = spacing.y * (level + 1);

      // Adjust children's position in the layout.
      child.position({ x, y });
      console.log('child', child.data('id'), 'x', x, 'y', y);

      // Recursive call per level
      recurse(child, level + 1);
    });
  }

  recurse(root);
  return root;
}
