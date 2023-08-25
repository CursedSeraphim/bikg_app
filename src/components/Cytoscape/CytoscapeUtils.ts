// CytoscapeUtils.ts
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import React from 'react';
import { CY_LAYOUT } from './constants';

interface CytoData {
  nodes: ElementDefinition[];
  edges: ElementDefinition[];
}

type SetCyFn = React.Dispatch<React.SetStateAction<Core | null>>;
type SetLoadingFn = React.Dispatch<React.SetStateAction<boolean>>;

export function createNewCytoscapeInstance(data: CytoData, setCy: SetCyFn, onLoaded: () => void, setLoading: SetLoadingFn): void {
  const newCy = cytoscape({
    container: document.getElementById('cy'),
    wheelSensitivity: 0.2,
    elements: data,
    style: [],
    layout: CY_LAYOUT,
  });

  setCy(newCy);
  newCy.ready(() => {
    onLoaded();
    setLoading(false);
    newCy.fit();
  });
}

export function updateCytoscapeInstance(
  cy: Core,
  data: CytoData,
  initialNodePositions: React.MutableRefObject<Map<string, { x: number; y: number }>>,
  onLoaded: () => void,
  setLoading: SetLoadingFn,
): void {
  cy.elements().remove();
  cy.add(data);
  cy.lassoSelectionEnabled(true);
  cy.nodes().forEach((node) => {
    const pos = node.position();
    initialNodePositions.current.set(node.data('id'), { x: pos.x, y: pos.y });
  });
  cy.layout({ ...CY_LAYOUT, eles: cy.elements(':visible') }).run();
  cy.ready(() => {
    onLoaded();
    setLoading(false);
    cy.fit();
  });
}
