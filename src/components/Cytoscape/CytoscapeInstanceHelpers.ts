// src/components/Cytoscape/CytoscapeInstanceHelpers.ts
import cytoscape, { Core } from 'cytoscape';
import React from 'react';
import { GetShapeForNamespaceFn, ICytoData, SetCyFn, SetLoadingFn } from '../../types';
import { getLayout } from './CytoscapeLayout';
import { getStyle } from './CytoscapeStyles';

export function createNewCytoscapeInstance(
  data: ICytoData,
  setCy: SetCyFn,
  onLoaded: () => void,
  setLoading: SetLoadingFn,
  getShapeForNamespace: GetShapeForNamespaceFn,
): void {
  const cy = cytoscape({
    container: document.getElementById('cy'),
    wheelSensitivity: 0.2,
    elements: data,
    style: getStyle(getShapeForNamespace),
    layout: getLayout(),
  });

  setCy(cy);
  cy.ready(() => {
    onLoaded();
    setLoading(false);
    cy.fit();
  });
}

export function updateCytoscapeInstance(
  cy: Core,
  data: ICytoData,
  initialNodeData: React.MutableRefObject<Map<string, { x: number; y: number; visible: boolean }>>,
  onLoaded: () => void,
  setLoading: SetLoadingFn,
): void {
  cy.elements().remove();
  cy.add(data);
  cy.lassoSelectionEnabled(true);
  cy.layout({ ...getLayout(), eles: cy.elements(':visible') }).run();
  cy.ready(() => {
    onLoaded();
    setLoading(false);
    cy.fit();
    cy.nodes().forEach((node) => {
      const pos = node.position();
      initialNodeData.current.set(node.data('id'), { x: pos.x, y: pos.y, visible: node.data('visible') });
    });
  });
}
