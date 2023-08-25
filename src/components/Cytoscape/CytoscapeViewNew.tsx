// CytoscapeViewNew.tsx
import React, { useEffect, useRef } from 'react';
import { useCytoData } from './hooks/useCytoData';
import { useCytoscape } from './hooks/useCytoscape';
import { useShapeHandler } from '../components/namespaceHandler';

interface CytoscapeViewProps {
  rdfOntology: any;
  onLoaded: () => void;
}

// Using function declaration instead of an arrow function
export default function CytoscapeView({ rdfOntology, onLoaded }: CytoscapeViewProps) {
  const { getShapeForNamespace } = useShapeHandler();
  const initialNodePositions = useRef(new Map());

  const cytoData = useCytoData(rdfOntology, getShapeForNamespace);
  const { cy } = useCytoscape({ containerId: 'cy', initialElements: cytoData });

  useEffect(() => {
    console.log('useeffect in CytoscapeViewNew.tsx');
    if (cy && cytoData) {
      cy.elements().remove();
      cy.add(cytoData);
      onLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, cytoData]);

  return <div id="cy" />;
}
