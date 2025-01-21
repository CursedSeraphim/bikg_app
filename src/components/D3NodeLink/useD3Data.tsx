import { useEffect, useState } from 'react';
import { INumberViolationsPerNodeMap } from '../../types';
import { selectCytoData } from '../Store/CombinedSlice';

/**
 * The props we need in order to compute the old "Cytoscape" data,
 * which we now feed into our D3 usage.
 */
interface CytoscapeDataProps {
  rdfOntology: string;
  violations: string[];
  types: string[];
  cumulativeNumberViolationsPerType: INumberViolationsPerNodeMap;
  onLoaded?: () => void;
}

/**
 * A custom hook that retrieves the same node/edge data that the Cytoscape version
 * used, but we feed it into our D3-based MVP. We filter out hidden nodes/edges in
 * the main component, so we just pass everything here.
 */
export function useD3Data({ rdfOntology, violations, types, cumulativeNumberViolationsPerType, onLoaded }: CytoscapeDataProps) {
  const [loading, setLoading] = useState(true);
  const [cyDataNodes, setCyDataNodes] = useState<any[]>([]);
  const [cyDataEdges, setCyDataEdges] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);
      try {
        // Use the real color function from the slice if you prefer,
        // but for now we pass a placeholder (we do actual coloring on the final side).
        const fakeColorFn = () => '#000';
        const { nodes, edges } = await selectCytoData(rdfOntology, fakeColorFn, types, cumulativeNumberViolationsPerType, violations);

        if (isMounted) {
          setCyDataNodes(nodes);
          setCyDataEdges(edges);
          setLoading(false);
          if (onLoaded) {
            onLoaded();
          }
        }
      } catch (error) {
        console.error('Failed to load data for D3/Cytoscape:', error);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [rdfOntology, types, violations, cumulativeNumberViolationsPerType, onLoaded]);

  return {
    loading,
    cyDataNodes,
    cyDataEdges,
  };
}
