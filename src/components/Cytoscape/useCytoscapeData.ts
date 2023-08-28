// useCytoscapeData.ts
import React, { useEffect } from 'react';
import { Core } from 'cytoscape';
import { selectCytoData } from '../Store/CombinedSlice';
import { createNewCytoscapeInstance, updateCytoscapeInstance } from './CytoscapeInstanceHelpers';
import { ContextMenuActions, GetShapeForNamespaceFn, SetCyFn } from '../../types';

type CytoscapeDataProps = {
  rdfOntology: string;
  getShapeForNamespace: GetShapeForNamespaceFn;
  violations: string[];
  types: string[];
  cy: Core | null;
  setCy: SetCyFn;
  onLoaded: () => void;
  contextMenuActions: ContextMenuActions;
  initialNodePositions: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

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
  }, [rdfOntology, getShapeForNamespace, violations, types, cy, setCy, onLoaded, contextMenuActions, initialNodePositions, setLoading]);
}
