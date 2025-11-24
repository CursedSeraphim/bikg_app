import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { INamespaceInfo, INamespaces, UseShapeHandlerReturnType } from '../types';
import { selectNamespaces } from './Store/CombinedSlice';

const SHAPE_LIST = ['ellipse', 'rectangle', 'diamond', 'pentagon', 'hexagon'];
const map = {
  omics: 'ellipse',
  sh: 'rectangle',
  owl: 'diamond',
  cns: 'pentagon',
  xsd: 'hexagon',
};
const DEFAULT_SHAPE = 'triangle';
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
  return SHAPE_LIST;
};

/**
 * Custom React hook to handle shapes for namespaces.
 * @returns {Object} An object containing a function to get the shapes for a given namespace.
 */
const useShapeHandler = (): UseShapeHandlerReturnType => {
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
  const getShapeForNamespace = useCallback((namespace = '') => {
    return map[namespace] || DEFAULT_SHAPE;
  }, []);

  return { getShapeForNamespace };
};

export { useShapeHandler };
