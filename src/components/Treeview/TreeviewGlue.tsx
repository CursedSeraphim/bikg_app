/* eslint-disable no-param-reassign */
import { OntologyMap, ITriple, INumberViolationsPerTypeMap, IOntologyNode } from '../../types';
import { constructViolationsPerTypeValueObject } from '../Store/CombinedSlice';

// TODO the variable namlected and violating are swapped in this file

// Formats the node name with the cumulative values
function formatNodeName(node: IOntologyNode): string {
  const selectedCount = node.n_selected_nodes !== 0 ? node.n_selected_nodes : node.n_cumulative_selected_nodes;
  const violatingCount = node.n_violating_nodes !== 0 ? node.n_violating_nodes : node.n_cumulative_violating_nodes;

  const originalName = node.name.split(' ')[0];
  return `${originalName} (${selectedCount}/${violatingCount})`;
}

// Updates the cumulative values for a node based on its children
function updateCumulativeNodeValues(node: IOntologyNode, cumulativeNumberViolationsPerType: INumberViolationsPerTypeMap): void {
  node.n_cumulative_selected_nodes = node.n_selected_nodes;
  node.n_cumulative_violating_nodes = node.n_violating_nodes;

  const ensureNodeEntry = (nodeName: string) => {
    cumulativeNumberViolationsPerType[nodeName] = cumulativeNumberViolationsPerType[nodeName] ?? constructViolationsPerTypeValueObject();
  };

  ensureNodeEntry(node.name);

  cumulativeNumberViolationsPerType[node.name].cumulativeSelected = node.n_cumulative_selected_nodes;
  cumulativeNumberViolationsPerType[node.name].cumulativeViolations = node.n_cumulative_violating_nodes;

  if (!node.children) return;

  for (const child of node.children) {
    updateCumulativeNodeValues(child, cumulativeNumberViolationsPerType);
    node.n_cumulative_selected_nodes += child.n_cumulative_selected_nodes;
    node.n_cumulative_violating_nodes += child.n_cumulative_violating_nodes;
  }

  ensureNodeEntry(node.name);

  cumulativeNumberViolationsPerType[node.name].cumulativeSelected = node.n_cumulative_selected_nodes;
  cumulativeNumberViolationsPerType[node.name].cumulativeViolations = node.n_cumulative_violating_nodes;

  node.name = formatNodeName(node);
}

// Populates the node with values from numberViolationsPerType and its formatted name
function populateNodeWithViolations(node: IOntologyNode, numberViolationsPerType: INumberViolationsPerTypeMap): void {
  if (numberViolationsPerType[node.name]) {
    const numViolationsObject = numberViolationsPerType[node.name];
    const { selected, violations } = numViolationsObject;
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

export function createIOntologyNode(name: string, children: IOntologyNode[] = []): IOntologyNode {
  return {
    name,
    children,
    n_selected_nodes: 0,
    n_violating_nodes: 0,
    n_cumulative_selected_nodes: 0,
    n_cumulative_violating_nodes: 0,
  };
}

export function getTreeDataFromTuples(
  subClassOfTriples: ITriple[],
  numberViolationsPerType: INumberViolationsPerTypeMap,
): { root: IOntologyNode; cumulativeNumberViolationsPerType: INumberViolationsPerTypeMap } {
  const ontologyMap: OntologyMap = {};
  const cumulativeNumberViolationsPerType: INumberViolationsPerTypeMap = {};

  for (const { s, o } of subClassOfTriples) {
    ontologyMap[s] = ontologyMap[s] || createIOntologyNode(s);
    ontologyMap[o] = ontologyMap[o] || createIOntologyNode(o);
    ontologyMap[o].children.push(ontologyMap[s]);
  }

  const childSet = new Set(subClassOfTriples.map((triple) => triple.s));
  const roots = Object.values(ontologyMap).filter((node) => !childSet.has(node.name));

  roots.forEach((root) => traverseTreeAndPopulateViolations(root, numberViolationsPerType));
  roots.forEach((root) => updateCumulativeNodeValues(root, cumulativeNumberViolationsPerType));

  const root: IOntologyNode = roots.length > 1 ? createIOntologyNode('root', roots) : roots[0];

  return { root, cumulativeNumberViolationsPerType };
}
