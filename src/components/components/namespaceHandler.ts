import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { INamespaces, INamespaceInfo } from '../../types';
import { selectNamespaces } from '../Store/CombinedSlice';

const SHAPE_LIST = ['triangle', 'rectangle', 'diamond', 'pentagon', 'hexagon'];
const map = {
  omics: 'triangle',
  sh: 'rectangle',
  owl: 'diamond',
  cns: 'pentagon',
  xsd: 'hexagon',
};
const DEFAULT_SHAPE = 'ellipse';
const MAX_DISPLAY_NAMESPACES = 5;

/**
 * Sorts and filters an INamespaces object based on the node_count.
 * @param {INamespaces} namespaces - The namespaces to be sorted and filtered.
 * @returns {Array} An array of namespace entries, sorted and filtered.
 */
const sortAndFilterNamespaces = (namespaces: INamespaces) => {
  return (
    Object.entries(namespaces)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, info]) => info.node_count > 0)
      .sort(([, a], [, b]) => b.node_count - a.node_count)
  );
};

/**
 * Calculates the aggregated counts for namespaces labeled as 'other'.
 * @param {Array} sortedNamespaces - An array of sorted and filtered namespace entries.
 * @returns {Object} An object containing the aggregated node and edge counts for 'other'.
 */
const calculateOtherCounts = (sortedNamespaces: Array<[string, INamespaceInfo]>) => {
  const otherNamespaces = sortedNamespaces.slice(MAX_DISPLAY_NAMESPACES - 1);
  return {
    otherNodeCount: otherNamespaces.reduce((acc, [, info]) => acc + info.node_count, 0),
    otherEdgeCount: otherNamespaces.reduce((acc, [, info]) => acc + info.edge_count, 0),
  };
};

/**
 * Initializes the shape scale based on the namespaces.
 * @param {INamespaces} [namespaces={}] - Namespaces to be used for initializing the shape list.
 * @returns {string[]} An array of shapes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const initializeShapeList = (namespaces: INamespaces = {}) => {
  // const sortedNamespaces = sortAndFilterNamespaces(namespaces);

  // let { otherNodeCount, otherEdgeCount } = { otherNodeCount: 0, otherEdgeCount: 0 };

  // if (sortedNamespaces.length > MAX_DISPLAY_NAMESPACES) {
  //   ({ otherNodeCount, otherEdgeCount } = calculateOtherCounts(sortedNamespaces));
  // }

  // const topNamespaces = sortedNamespaces.slice(0, MAX_DISPLAY_NAMESPACES - 1);
  // if (sortedNamespaces.length > MAX_DISPLAY_NAMESPACES) {
  //   topNamespaces.push(['other', { namespace: 'other', node_count: otherNodeCount, edge_count: otherEdgeCount }]);
  // }
  // console.log('test namespaces', namespaces);
  return SHAPE_LIST;
};

/**
 * Custom React hook to handle shapes for namespaces.
 * @returns {Object} An object containing a function to get the shapes for a given namespace.
 */
const useShapeHandler = () => {
  const selectedNamespaces = useSelector(selectNamespaces);
  const namespaces: INamespaces = useMemo(() => selectedNamespaces || {}, [selectedNamespaces]);
  const [shapeList, setShapeList] = useState<string[]>(initializeShapeList(namespaces));

  useEffect(() => {
    setShapeList(initializeShapeList(namespaces));
  }, [namespaces]);

  const sortedNamespaces = useMemo(() => sortAndFilterNamespaces(namespaces), [namespaces]);
  // console.log('sortedNamespaces', sortedNamespaces);

  /**
   * Gets the shape for a given namespace.
   * @param {string} [namespace=''] - The namespace to get the shape for.
   * @returns {string} The shape for the namespace.
   */
  const getShapeForNamespace = (namespace = '') => {
    return map[namespace] || DEFAULT_SHAPE;
    // console.log('called with namespace', namespace);
    let namespaceIndex = sortedNamespaces.findIndex(([key]) => key === namespace);

    console.log('sortedNamespaces', sortedNamespaces, 'key', namespace, 'index', namespaceIndex);

    if (sortedNamespaces.length > MAX_DISPLAY_NAMESPACES && namespaceIndex >= MAX_DISPLAY_NAMESPACES) {
      namespaceIndex = MAX_DISPLAY_NAMESPACES - 1; // Group as "other"
    }

    if (namespaceIndex === -1) {
      // console.log('returning default shape', DEFAULT_SHAPE);
      return DEFAULT_SHAPE;
    }

    // console.log('returning shape by index', shapeList[namespaceIndex]);

    return shapeList[namespaceIndex] || DEFAULT_SHAPE;
  };

  // console.log('getShapeForNamespace("omics")', getShapeForNamespace('omics'));

  return { getShapeForNamespace };
};

export { useShapeHandler };
