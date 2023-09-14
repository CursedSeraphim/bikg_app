// useCytoscapeData.ts
import { Core } from 'cytoscape';
import React, { useEffect } from 'react';
import { selectCytoData } from '../Store/CombinedSlice';
import { createNewCytoscapeInstance, updateCytoscapeInstance } from './CytoscapeInstanceHelpers';
import { GetShapeForNamespaceFn, INumberViolationsPerNodeMap, SetCyFn } from '../../types';

interface CytoscapeDataProps {
  rdfOntology: string;
  getShapeForNamespace: GetShapeForNamespaceFn;
  violations: string[];
  types: string[];
  cy: Core;
  setCy: React.Dispatch<SetCyFn>;
  onLoaded: () => void;
  initialNodeData: React.MutableRefObject<Map<string, { x: number; y: number; visible: boolean }>>;
  setLoading: React.Dispatch<boolean>;
  cumulativeNumberViolationsPerType: INumberViolationsPerNodeMap;
}

export function useCytoscapeData({
  rdfOntology,
  getShapeForNamespace,
  violations,
  types,
  cy,
  setCy,
  onLoaded,
  initialNodeData,
  setLoading,
  cumulativeNumberViolationsPerType,
}: CytoscapeDataProps) {
  useEffect(() => {
    // console.log('useCytoscapeData called with cumulativeNumberViolationsPerType', cumulativeNumberViolationsPerType);
    selectCytoData(rdfOntology, getShapeForNamespace, types, cumulativeNumberViolationsPerType, violations)
      .then((data) => {
        cy
          ? updateCytoscapeInstance(cy, data, initialNodeData, onLoaded, setLoading)
          : createNewCytoscapeInstance(data, setCy, onLoaded, setLoading, getShapeForNamespace);
      })
      .catch((error) => {
        console.error('Failed to generate Cytoscape data:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdfOntology, getShapeForNamespace, violations, types, cy, setCy, onLoaded, setLoading, cumulativeNumberViolationsPerType]);
}
