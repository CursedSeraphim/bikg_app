import { RdfState, selectSubClassOfTuples } from '../Store/CombinedSlice';

/**
 * Glue that connects CombinedSlice selectSubClassOrObjectPropertyTuples return value to the Treebeard component
 * @param ontology The ontology data in N3 format
 * @returns The tree data in the format expected by Treebeard
 */
export async function getTreeDataFromN3Data(ontology) {
  const ontologyMap: { [key: string]: { name: string; children: any[] } } = {};

  const rdfOntologyState: RdfState = {
    rdfString: ontology,
  };

  const quads = await selectSubClassOfTuples({ rdf: rdfOntologyState });

  quads.forEach((triple) => {
    ontologyMap[triple.s] = ontologyMap[triple.s] || { name: triple.s, children: [] };
    ontologyMap[triple.o] = ontologyMap[triple.o] || { name: triple.o, children: [] };
    ontologyMap[triple.o].children.push(ontologyMap[triple.s]);
  });

  // Find nodes with no parents
  const roots = Object.values(ontologyMap).filter((node) => {
    // A node has no parents if no other node has it as a child
    return Object.values(ontologyMap).every((otherNode) => {
      return otherNode.children.indexOf(node) === -1;
    });
  });

  if (roots.length > 1) {
    const data = { name: 'root', children: roots };
    return data;
  }

  return roots[0];
}
