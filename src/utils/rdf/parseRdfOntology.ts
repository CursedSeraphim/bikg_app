// src/utils/parseRdfOntology.ts
export interface ParsedNode {
  id: string;
  label: string;
  children: string[]; // immediate connections
  isRoot?: boolean; // can use a heuristic or post-processing to mark roots
}

export interface ParsedEdge {
  source: string;
  target: string;
  label?: string; // If you want to store property or predicate
}

export interface ParsedGraph {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
}

/**
 * Very naive parser that attempts to parse lines for NodeShapes and gather children from `sh:property` or other statements.
 * In your real app, you might want something more robust or a real TTL parser.
 */
export function parseRdfOntology(rdfText: string): ParsedGraph {
  const nodesMap = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];

  // Example: For each NodeShape, gather "sh:property" references, also gather "sh:targetClass" references.
  // We'll treat each "cns:NodeShapeXX" as a node. The properties become edges to the target IDs.

  // Split on newlines. This is naive, but enough to illustrate.
  const lines = rdfText.split('\n');

  // We'll keep track of the current node-shape while reading lines in a naive approach.
  let currentNodeId: string | null = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    // Example pattern for node shape declaration:
    // cns:NodeShape1 a sh:NodeShape ;
    //   -> We assume the first token up to " a " is the node ID
    if (line.match(/^cns:.*a\s+sh:NodeShape/)) {
      // e.g. cns:NodeShape1 a sh:NodeShape ;
      const nodeId = line.split(/\s+/)[0]; // cns:NodeShape1
      currentNodeId = nodeId;
      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          label: nodeId,
          children: [],
          isRoot: true, // we might consider them root unless proven otherwise
        });
      }
      return;
    }

    // Check if line references "sh:property"
    if (currentNodeId && line.includes('sh:property')) {
      // e.g. sh:property omics:349bea5c, omics:whatever ;
      // We'll parse out the omics references as children.
      // This is naive string splitting:
      const propertyPart = line.replace(/sh:property/, '').replace(/[;.,]/g, '');
      const references = propertyPart.split(/\s+/).filter((item) => item.startsWith('omics:') || item.startsWith('cns:') || item.includes(':'));
      // For each reference, we add an edge
      references.forEach((ref) => {
        if (!nodesMap.has(ref)) {
          nodesMap.set(ref, {
            id: ref,
            label: ref,
            children: [],
          });
        }
        // Add edge
        edges.push({
          source: currentNodeId,
          target: ref,
          label: 'sh:property',
        });
        // Also push to the parent's children array
        const parentNode = nodesMap.get(currentNodeId);
        if (parentNode && !parentNode.children.includes(ref)) {
          parentNode.children.push(ref);
        }
        // The child might not be root
        const childNode = nodesMap.get(ref);
        if (childNode) {
          childNode.isRoot = false;
        }
      });
    }

    // Check if line references "sh:targetClass"
    if (currentNodeId && line.includes('sh:targetClass')) {
      // e.g. sh:targetClass omics:Analysis .
      const targetPart = line.replace(/sh:targetClass/, '').replace(/[;.,]/g, '');
      const references = targetPart.split(/\s+/).filter((item) => item.includes(':'));
      references.forEach((ref) => {
        if (!nodesMap.has(ref)) {
          nodesMap.set(ref, {
            id: ref,
            label: ref,
            children: [],
          });
        }
        edges.push({
          source: currentNodeId,
          target: ref,
          label: 'sh:targetClass',
        });
        const parentNode = nodesMap.get(currentNodeId);
        if (parentNode && !parentNode.children.includes(ref)) {
          parentNode.children.push(ref);
        }
        const childNode = nodesMap.get(ref);
        if (childNode) {
          childNode.isRoot = false;
        }
      });
    }

    // If the line ends with a period, likely we're done with the current NodeShape
    if (line.endsWith('.')) {
      currentNodeId = null;
    }
  });

  // Convert Map to array
  const nodes = Array.from(nodesMap.values());

  return {
    nodes,
    edges,
  };
}
