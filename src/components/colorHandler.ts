import { useState, useEffect, useMemo } from 'react';
import colorbrewer from 'colorbrewer';
import { useSelector } from 'react-redux';
import { INamespaces, INamespaceInfo } from '../../types';
import { selectNamespaces } from '../Store/CombinedSlice';

const DEFAULT_COLOR = '#000000';
const MAX_DISPLAY_NAMESPACES = 6;

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
 * Initializes the color scale based on the namespaces.
 * @param {INamespaces} [namespaces={}] - Namespaces to be used for initializing the color scale.
 * @returns {string[]} An array of color codes.
 */
const initializeColorScale = (namespaces: INamespaces = {}) => {
  const sortedNamespaces = sortAndFilterNamespaces(namespaces);

  let { otherNodeCount, otherEdgeCount } = { otherNodeCount: 0, otherEdgeCount: 0 };

  if (sortedNamespaces.length > MAX_DISPLAY_NAMESPACES) {
    ({ otherNodeCount, otherEdgeCount } = calculateOtherCounts(sortedNamespaces));
  }

  const topNamespaces = sortedNamespaces.slice(0, MAX_DISPLAY_NAMESPACES - 1);
  if (sortedNamespaces.length > MAX_DISPLAY_NAMESPACES) {
    topNamespaces.push(['other', { namespace: 'other', node_count: otherNodeCount, edge_count: otherEdgeCount }]);
  }

  const numDataClasses = topNamespaces.length * 2;

  return colorbrewer?.Paired?.[numDataClasses] || [DEFAULT_COLOR];
};

/**
 * Custom React hook to handle colors for namespaces.
 * @returns {Object} An object containing a function to get the color for a given namespace.
 */
const useColorHandler = () => {
  const selectedNamespaces = useSelector(selectNamespaces);
  const namespaces: INamespaces = useMemo(() => selectedNamespaces || {}, [selectedNamespaces]);
  const [colorScale, setColorScale] = useState<string[]>(initializeColorScale(namespaces));

  useEffect(() => {
    setColorScale(initializeColorScale(namespaces));
  }, [namespaces]);

  const sortedNamespaces = useMemo(() => sortAndFilterNamespaces(namespaces), [namespaces]);

  /**
   * Gets the color for a given namespace.
   * @param {string} [namespace=''] - The namespace to get the color for.
   * @param {boolean} [isSelected=false] - Flag to indicate whether the namespace is selected.
   * @returns {string} The color code for the namespace.
   */
  const getColorForNamespace = (namespace = '', isSelected = false) => {
    let namespaceIndex = sortedNamespaces.findIndex(([key]) => key === namespace);

    if (sortedNamespaces.length > MAX_DISPLAY_NAMESPACES && namespaceIndex >= MAX_DISPLAY_NAMESPACES) {
      namespaceIndex = MAX_DISPLAY_NAMESPACES - 1; // Group as "other"
    }

    if (namespaceIndex === -1) {
      return colorScale[colorScale.length - 1] || DEFAULT_COLOR;
    }

    return colorScale[namespaceIndex * 2 + (isSelected ? 1 : 0)] || DEFAULT_COLOR;
  };

  return { getColorForNamespace };
};

export { useColorHandler };
