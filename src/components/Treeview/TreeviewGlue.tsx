/* eslint-disable no-param-reassign */
import { INumberViolationsPerNodeMap, IOntologyNode, ITriple, OntologyMap } from '../../types';

// Formats the node name with the cumulative values
function formatNodeName(node: IOntologyNode): string {
  const { nSelectedNodes = 0, nCumulativeSelectedNodes = 0, nViolatingNodes = 0, nCumulativeViolatingNodes = 0, name } = node;

  const selectedCount = nSelectedNodes || nCumulativeSelectedNodes;
  const violatingCount = nViolatingNodes || nCumulativeViolatingNodes;

  const originalName = name.split(' ')[0];
  return `${originalName} (${selectedCount}/${violatingCount})`;
}

/**
 * Creates an IOntologyNode object
 * ...
 */
export const createIOntologyNode = (
  name: string,
  cumulativeNumberViolationsPerType: INumberViolationsPerNodeMap,
  children: IOntologyNode[] = [],
): IOntologyNode => {
  const { selected = 0, violations = 0, cumulativeSelected = 0, cumulativeViolations = 0 } = cumulativeNumberViolationsPerType[name] ?? {};

  return {
    name,
    children,
    nSelectedNodes: selected,
    nViolatingNodes: violations,
    nCumulativeSelectedNodes: cumulativeSelected,
    nCumulativeViolatingNodes: cumulativeViolations,
  };
};

function recursivelyNameNodes(root): void {
  root.forEach((node) => {
    node.name = formatNodeName(node);
    recursivelyNameNodes(node.children);
  });
}

export function getTreeDataFromTuples(subClassOfTriples: ITriple[], cumulativeNumberViolationsPerType: INumberViolationsPerNodeMap): IOntologyNode {
  const ontologyMap: OntologyMap = {};
  for (const { s, o } of subClassOfTriples) {
    ontologyMap[s] = ontologyMap[s] || createIOntologyNode(s, cumulativeNumberViolationsPerType);
    ontologyMap[o] = ontologyMap[o] || createIOntologyNode(o, cumulativeNumberViolationsPerType);
    ontologyMap[o].children.push(ontologyMap[s]);
  }

  const childSet = new Set(subClassOfTriples.map((triple) => triple.s));
  const roots = Object.values(ontologyMap).filter((node) => !childSet.has(node.name));

  recursivelyNameNodes(roots);

  const root: IOntologyNode = roots.length > 1 ? createIOntologyNode('root', cumulativeNumberViolationsPerType, roots) : roots[0];

  return root;
}
