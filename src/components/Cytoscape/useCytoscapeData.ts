// useCytoscapeData.ts
import React, { useEffect } from 'react';
import { Core } from 'cytoscape';
import { selectCytoData } from '../Store/CombinedSlice';
import { createNewCytoscapeInstance, updateCytoscapeInstance } from './CytoscapeInstanceHelpers';
import { ContextMenuActions, GetShapeForNamespaceFn, SetCyFn } from '../../types';

interface CytoscapeDataProps {
  rdfOntology: any;
  getShapeForNamespace: GetShapeForNamespaceFn;
  violations: string[];
  types: string[];
  cy: any;
  setCy: React.Dispatch<any>;
  onLoaded: any;
  contextMenuActions: { [key: string]: any };
  initialNodePositions: React.MutableRefObject<Map<string, { x: number; y: number; visible: boolean }>>;
  setLoading: React.Dispatch<any>;
}

export function useCytoscapeData({
  rdfOntology,
  getShapeForNamespace,
  violations,
  types,
  cy,
  setCy,
  onLoaded,
  contextMenuActions,
  initialNodePositions,
  setLoading,
}: CytoscapeDataProps) {
  useEffect(() => {
    selectCytoData(rdfOntology, getShapeForNamespace, violations, types)
      .then((data) => {
        cy
          ? updateCytoscapeInstance(cy, data, initialNodePositions, onLoaded, setLoading, contextMenuActions)
          : createNewCytoscapeInstance(data, setCy, onLoaded, setLoading, getShapeForNamespace, contextMenuActions);
      })
      .catch((error) => {
        console.error('Failed to generate Cytoscape data:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdfOntology, getShapeForNamespace, violations, types, cy, setCy, onLoaded, contextMenuActions, setLoading]);
}
