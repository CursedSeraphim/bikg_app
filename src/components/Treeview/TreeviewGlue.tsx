/* eslint-disable no-param-reassign */
import { OntologyMap, ITriple, INumberViolationsPerTypeMap, IOntologyNode } from '../../types';

// TODO the variable namlected and violating are swapped in this file

// Formats the node name with the cumulative values
function formatNodeName(node: IOntologyNode): string {
  const selectedCount = node.n_selected_nodes !== 0 ? node.n_selected_nodes : node.n_cumulative_selected_nodes;
  const violatingCount = node.n_violating_nodes !== 0 ? node.n_violating_nodes : node.n_cumulative_violating_nodes;

  const originalName = node.name.split(' ')[0];
  return `${originalName} (${selectedCount}/${violatingCount})`;
}

// Updates the cumulative values for a node based on its children
function updateCumulativeNodeValues(node: IOntologyNode): void {
  node.n_cumulative_selected_nodes = node.n_selected_nodes;
  node.n_cumulative_violating_nodes = node.n_violating_nodes;

  if (!node.children) return;

  for (const child of node.children) {
    updateCumulativeNodeValues(child);
    node.n_cumulative_selected_nodes += child.n_cumulative_selected_nodes;
    node.n_cumulative_violating_nodes += child.n_cumulative_violating_nodes;
  }

  node.name = formatNodeName(node);
}

// Populates the node with values from numberViolationsPerType and its formatted name
function populateNodeWithViolations(node: IOntologyNode, numberViolationsPerType: INumberViolationsPerTypeMap): void {
  if (numberViolationsPerType[node.name]) {
    const numViolationsObject = numberViolationsPerType[node.name];
    const { selected, violations } = numViolationsObject;
    console.log('pop/numViolationsObject', numViolationsObject);
    console.log('pop/selected', selected);
    console.log('pop/violations', violations);
    node.n_selected_nodes = selected;
    node.n_violating_nodes = violations;
    node.n_cumulative_selected_nodes = selected;
    node.n_cumulative_violating_nodes = violations;
    node.name = formatNodeName(node);
  }
}

// Traverse the tree to populate nodes with violation counts
function traverseTreeAndPopulateViolations(node: IOntologyNode, numberViolationsPerType: INumberViolationsPerTypeMap): void {
  populateNodeWithViolations(node, numberViolationsPerType);
  node.children?.forEach((child) => traverseTreeAndPopulateViolations(child, numberViolationsPerType));
}

export function getTreeDataFromTuples(subClassOfTriples: ITriple[], numberViolationsPerType: INumberViolationsPerTypeMap): IOntologyNode {
  // Initialize the ontology map
  const ontologyMap: OntologyMap = {};

  // Populate the ontology map based on the subclass triples
  for (const { s, o } of subClassOfTriples) {
    ontologyMap[s] = ontologyMap[s] || {
      name: s,
      children: [],
      n_selected_nodes: 0,
      n_violating_nodes: 0,
      n_cumulative_selected_nodes: 0,
      n_cumulative_violating_nodes: 0,
    };
    ontologyMap[o] = ontologyMap[o] || {
      name: o,
      children: [],
      n_selected_nodes: 0,
      n_violating_nodes: 0,
      n_cumulative_selected_nodes: 0,
      n_cumulative_violating_nodes: 0,
    };
    ontologyMap[o].children.push(ontologyMap[s]);
  }

  // Identify the root nodes
  const childSet = new Set(subClassOfTriples.map((triple) => triple.s));
  const roots = Object.values(ontologyMap).filter((node) => !childSet.has(node.name));

  // Populate the nodes with violation counts
  roots.forEach((root) => traverseTreeAndPopulateViolations(root, numberViolationsPerType));

  // Update the nodes with their cumulative counts
  roots.forEach(updateCumulativeNodeValues);

  // Return the appropriate root
  return roots.length > 1
    ? { name: 'root', children: roots, n_selected_nodes: 0, n_violating_nodes: 0, n_cumulative_selected_nodes: 0, n_cumulative_violating_nodes: 0 }
    : roots[0];
}
