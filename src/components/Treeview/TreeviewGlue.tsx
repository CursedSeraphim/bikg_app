import { OntologyMap, ITriple, INumberViolationsPerType } from '../../types';

/**
 * Glue that connects CombinedSlice selectSubClassOrObjectPropertyTuples return value to the Treebeard component
 * @param subClassOfTriples The cached subClassOf triples
 * @returns The tree data in the format expected by Treebeard
 */
export function getTreeDataFromTuples(subClassOfTriples: ITriple[], numberViolationsPerType: INumberViolationsPerType) {
  const ontologyMap: OntologyMap = {};

  const quads = subClassOfTriples;

  quads.forEach((triple) => {
    ontologyMap[triple.s] = ontologyMap[triple.s] || { name: triple.s, children: [] };
    ontologyMap[triple.o] = ontologyMap[triple.o] || { name: triple.o, children: [] };
    ontologyMap[triple.o].children.push(ontologyMap[triple.s]);
  });

  // Find nodes with no parents
  const childSet = new Set();
  quads.forEach((triple) => {
    childSet.add(triple.s);
  });

  const roots = Object.keys(ontologyMap)
    .filter((node) => !childSet.has(node))
    .map((node) => {
      return ontologyMap[node];
    });

  const traverseTree = (node) => {
    if (numberViolationsPerType[node.name]) {
      node.name = `${node.name} (${String(numberViolationsPerType[node.name][1])}/${String(numberViolationsPerType[node.name][0])})`;
    }
    if (node.children) {
      node.children.forEach(traverseTree);
    }
  };

  roots.forEach(traverseTree);

  if (roots.length > 1) {
    const data = { name: 'root', children: roots };
    return data;
  }
  return roots[0];
}
