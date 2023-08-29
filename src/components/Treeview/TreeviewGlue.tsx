import { OntologyMap, ITriple } from '../../types';

/**
 * Glue that connects CombinedSlice selectSubClassOrObjectPropertyTuples return value to the Treebeard component
 * @param ontology The ontology data in N3 format
 * @param subClassOfTriples The cached subClassOf triples
 * @returns The tree data in the format expected by Treebeard
 */
export function getTreeDataFromN3Data(ontology: string, subClassOfTriples: ITriple[]) {
  console.time('time in getTreeDataFromN3Data');
  const ontologyMap: OntologyMap = {};

  // The quads now come from the parameter subClassOfTriples instead of the async call to selectSubClassOfTuples
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
    .map((node) => ontologyMap[node]);

  console.timeEnd('time in getTreeDataFromN3Data');

  if (roots.length > 1) {
    const data = { name: 'root', children: roots };
    console.log('done in glue');
    return data;
  }
  console.log('done in glue');
  return roots[0];
}
