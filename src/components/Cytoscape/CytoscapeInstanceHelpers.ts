// Cytoscapeinstancehelpers.ts
import cytoscape, { Core } from 'cytoscape';
import React from 'react';
import { GetShapeForNamespaceFn, ICytoData } from '../../types';
import { getStyle } from './CytoscapeStyles';
import { getLayout } from './CytoscapeLayout';
import { getContextMenuOptions } from './CytoscapeContextMenu'; // import this

type SetCyFn = React.Dispatch<React.SetStateAction<Core | null>>;
type SetLoadingFn = React.Dispatch<React.SetStateAction<boolean>>;

export function createNewCytoscapeInstance(
  data: ICytoData,
  setCy: SetCyFn,
  onLoaded: () => void,
  setLoading: SetLoadingFn,
  getShapeForNamespace: GetShapeForNamespaceFn,
): void {
  const newCy = cytoscape({
    container: document.getElementById('cy'),
    wheelSensitivity: 0.2,
    elements: data,
    style: getStyle(getShapeForNamespace),
    layout: getLayout(),
  });
  newCy.contextMenus(getContextMenuOptions());

  setCy(newCy);
  newCy.ready(() => {
    onLoaded();
    setLoading(false);
    newCy.fit();
  });
}

export function updateCytoscapeInstance(
  cy: Core,
  data: ICytoData,
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
  cy.layout({ ...getLayout(), eles: cy.elements(':visible') }).run();
  cy.ready(() => {
    onLoaded();
    setLoading(false);
    cy.fit();
  });
}
