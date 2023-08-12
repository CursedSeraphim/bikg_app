// CytoscapeNodeFactory.tsx
type Node = {
  group: 'nodes';
  data: {
    id: string;
    label: string;
    visible: true;
  };
};

type Edge = {
  group: 'edges';
  data: {
    id: string;
    source: string;
    target: string;
    visible: true;
  };
};

type Element = Node | Edge;

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
  createNode(label: string, parent?: Node): [Node, Edge?] {
    const id = `node-${this.idCounter++}`;
    const node: Node = {
      group: 'nodes',
      data: { id, label, visible: true },
    };

    if (parent) {
      const edge: Edge = {
        group: 'edges',
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
  createTree(depth: number, childrenPerNode: number, labelProvider: (index: number) => string = (index) => `Node ${index}`): Element[] {
    const elements: Element[] = [];
    const buildTree = (parent: Node, currentDepth: number): void => {
      if (currentDepth === depth) return;

      for (let i = 0; i < childrenPerNode; i++) {
        const [node, edge] = this.createNode(labelProvider(this.idCounter), parent);
        elements.push(node);
        if (edge) elements.push(edge);

        buildTree(node, currentDepth + 1);
      }
    };

    const [rootNode] = this.createNode(labelProvider(this.idCounter));
    elements.push(rootNode);
    buildTree(rootNode, 0);

    return elements;
  }
}
