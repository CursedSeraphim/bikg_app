// src/utils/rdfGraphHelpers.ts
import * as N3 from 'n3';
import { NamedNode, Quad, Store } from 'n3';
import { v4 as uuidv4 } from 'uuid';
import { ICombinedState, IRdfState, ITriple } from '../../types';

type PrefixMap = Record<string, string>;

export const normalizePrefixes = (raw: N3.Prefixes<NamedNode<string>>): PrefixMap => {
  const result: PrefixMap = {};
  for (const [prefix, value] of Object.entries(raw)) {
    result[prefix] = typeof value === 'string' ? value : value.value;
  }
  return result;
};

export const shortenURI = (uri: string, prefixes: PrefixMap): string => {
  for (const [prefix, iri] of Object.entries(prefixes)) {
    if (uri.startsWith(iri)) {
      return uri.replace(iri, `${prefix}:`);
    }
  }
  return uri;
};

export const mapQuadToShortenedResult = (quad: Quad, prefixes: PrefixMap): ITriple => ({
  s: shortenURI(quad.subject.id, prefixes),
  p: shortenURI(quad.predicate.id, prefixes),
  o: shortenURI(quad.object.id, prefixes),
});

export const parseRdfToStore = async (rdfString: string): Promise<{ store: Store; prefixes: PrefixMap }> => {
  const store: Store = new Store();
  const parser: N3.Parser = new N3.Parser();

  const prefixes: PrefixMap = await new Promise<PrefixMap>((resolve, reject) => {
    parser.parse(rdfString, (error, quad, rawPrefixes) => {
      if (quad) {
        store.addQuad(quad);
      } else if (error) {
        reject(error);
      } else {
        resolve(normalizePrefixes(rawPrefixes as N3.Prefixes<NamedNode<string>>));
      }
    });
  });

  return { store, prefixes };
};

// ---- public helpers that components / thunks can call ----

export const getSubClassOfTuples = async (state: { rdf: IRdfState }): Promise<ITriple[]> => {
  const { rdfString } = state.rdf;
  const { store, prefixes } = await parseRdfToStore(rdfString);

  const subClassOfPredicate = new NamedNode(`${prefixes.rdfs}subClassOf`);
  const quads = store.getQuads(null, subClassOfPredicate, null, null);

  return quads.map((quad) => mapQuadToShortenedResult(quad, prefixes));
};

export const getAllClassesAndViolations = async (state: { combined: ICombinedState }): Promise<{ visibleTriples: ITriple[]; hiddenTriples: ITriple[] }> => {
  const { rdfString } = state.combined;
  const { store, prefixes } = await parseRdfToStore(rdfString);

  const subClassOfPredicate = new NamedNode(`${prefixes.rdfs}subClassOf`);
  const shaclPropertyPredicate = new NamedNode(`${prefixes.sh}property`);

  const allVisibleTuples = store.getQuads(null, subClassOfPredicate, null, null);
  const targetClassTuples = store.getQuads(null, `${prefixes.sh}targetClass`, null, null);

  for (const tuple of targetClassTuples) {
    const childrenPropertyPredicate = store.getQuads(tuple.subject, shaclPropertyPredicate, null, null);
    const children = store.getQuads(tuple.subject, null, null, null);

    for (const childTuple of children) {
      if (childTuple.object.equals(new NamedNode(`${prefixes.omics}Sample`))) {
        allVisibleTuples.push(...childrenPropertyPredicate);
        break;
      }
    }
  }

  const allHiddenTuples = store.getQuads(null, null, null, null).filter((q) => !allVisibleTuples.includes(q));

  const visibleTriples = allVisibleTuples.map((quad) => mapQuadToShortenedResult(quad, prefixes));
  const hiddenTriples = allHiddenTuples.map((quad) => mapQuadToShortenedResult(quad, prefixes));

  return { visibleTriples, hiddenTriples };
};

export const getAllTriples = async (rdfString: string): Promise<{ visibleTriples: ITriple[]; hiddenTriples: ITriple[] }> => {
  const { store, prefixes } = await parseRdfToStore(rdfString);

  const subClassOfPredicate = new NamedNode(`${prefixes.rdfs}subClassOf`);
  const allVisibleTuples = store.getQuads(null, subClassOfPredicate, null, null).filter((quad) => quad.object.id !== `${prefixes.omics}ReferenceData`);

  const allHiddenTuples = store.getQuads(null, null, null, null).filter((quad) => !allVisibleTuples.includes(quad));

  const visibleTriples = allVisibleTuples.map((quad) => mapQuadToShortenedResult(quad, prefixes));
  const hiddenTriples = allHiddenTuples.map((quad) => mapQuadToShortenedResult(quad, prefixes));

  return { visibleTriples, hiddenTriples };
};
/**
 * Calculate object properties from the visible and hidden triples.
 *
 * @param {Array} visibleTriples - Array of visible triples.
 * @param {Array} hiddenTriples - Array of hidden triples.
 * @returns {Map} objectProperties - Returns a map containing object properties.
 */
export const calculateObjectProperties = (visibleTriples, hiddenTriples) => {
  const objectProperties = new Map();
  const typesToInclude = new Set(['owl:ObjectProperty', 'owl:Class', 'sh:PropertyShape', 'owl:Ontology']);
  const predicatesToInclude = new Set(['sh:value']);

  [...visibleTriples, ...hiddenTriples].forEach((t) => {
    // If the object type is in typesToInclude, or if the predicate is in predicatesToInclude
    // then consider the object as an object property.
    if (typesToInclude.has(t.o)) {
      objectProperties.set(t.s, t.o);
    }
    if (predicatesToInclude.has(t.p)) {
      objectProperties.set(t.o, true); // Just indicate that this URI should be treated as an object property.
    }
  });

  return objectProperties;
};
// Helper function to extract namespace from a URI
export const extractNamespace = (uri) => {
  const match = uri.match(/^([^:]+):/);
  return match ? match[1] : '';
};
// Helper function to find or add node
export const findOrAddNode = (id, label, visible, nodes, types, numberViolationsPerNode, getColorForNamespace, violationList) => {
  const baseId = id.replace(/_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, '');
  const { cumulativeSelected = 0, cumulativeViolations = 0, violations = 0 } = numberViolationsPerNode[id] || numberViolationsPerNode[baseId] || {};

  const hasCounts = cumulativeSelected !== 0 || cumulativeViolations !== 0;
  const labelSuffix = hasCounts ? ` (${cumulativeSelected}/${cumulativeViolations})` : '';
  const marker = hasCounts && violations === 0 ? '*' : '';
  const computedLabel = `${label}${labelSuffix}${marker}`;

  let node = nodes.find((n) => n.data.id === id);
  if (!node) {
    const namespace = extractNamespace(id);
    const defaultColor = getColorForNamespace(namespace, false);
    const selectedColor = getColorForNamespace(namespace, true);
    node = {
      data: {
        id,
        label: computedLabel,
        visible,
        permanent: visible,
        namespace,
        defaultColor,
        selectedColor,
        violation: violationList.includes(id),
        exemplar: namespace === 'ex',
        type: types.includes(id),
      },
    };
    nodes.push(node);
  } else if (visible) {
    node.data.visible = visible;
    node.data.permanent = visible;
  }
};

// Main function to process triples
export const processTriples = (triples, visible, nodes, edges, objectProperties, getColorForNamespace, types, numberViolationsPerNode, violationList) => {
  triples.forEach((t) => {
    findOrAddNode(t.s, t.s, visible, nodes, types, numberViolationsPerNode, getColorForNamespace, violationList);

    if (objectProperties.has(t.o)) {
      findOrAddNode(t.o, t.o, visible, nodes, types, numberViolationsPerNode, getColorForNamespace, violationList);
    }

    const uniqueId = objectProperties.has(t.o) ? t.o : `${t.o}_${uuidv4()}`;
    findOrAddNode(uniqueId, t.o, visible, nodes, types, numberViolationsPerNode, getColorForNamespace, violationList);

    edges.push({
      data: {
        id: `${t.s}_${t.p}_${uniqueId}`,
        source: t.s,
        target: uniqueId,
        label: t.p,
        visible,
        permanent: visible,
        namespace: extractNamespace(t.p),
      },
    });
  });
};
