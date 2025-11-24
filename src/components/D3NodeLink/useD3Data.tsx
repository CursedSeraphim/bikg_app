import { useEffect, useState } from 'react';
import { INumberViolationsPerNodeMap } from '../../types';
import { selectCytoData } from '../Store/CombinedSlice';

/**
 * The props we need in order to compute graph data,
 * which we now feed into our D3 usage.
 */
interface GraphscapeDataProps {
  rdfOntology: string;
  violations: string[];
  types: string[];
  cumulativeNumberViolationsPerType: INumberViolationsPerNodeMap;
  onLoaded?: () => void;
}

/**
 * A custom hook that retrieves node/edge data. We filter out hidden nodes/edges in
 * the main component, so we pass everything here.
 */
export function useD3Data({ rdfOntology, violations, types, cumulativeNumberViolationsPerType, onLoaded }: GraphscapeDataProps) {
  const [loading, setLoading] = useState(true);
  const [cyDataNodes, setCyDataNodes] = useState<any[]>([]);
  const [cyDataEdges, setCyDataEdges] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);
      try {
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
        console.error('Failed to load data for D3 Graph:', error);
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
