// Cytoscapeinstancehelpers.ts
import cytoscape, { Core } from 'cytoscape';
import React from 'react';
import { ContextMenuActions, GetShapeForNamespaceFn, ICytoData, SetCyFn, SetLoadingFn } from '../../types';
import { getStyle } from './CytoscapeStyles';
import { getLayout } from './CytoscapeLayout';
import { getContextMenuOptions } from './CytoscapeContextMenu'; // import this

export function createNewCytoscapeInstance(
  data: ICytoData,
  setCy: SetCyFn,
  onLoaded: () => void,
  setLoading: SetLoadingFn,
  getShapeForNamespace: GetShapeForNamespaceFn,
  contextMenuActions: ContextMenuActions,
): void {
  const newCy = cytoscape({
    container: document.getElementById('cy'),
    wheelSensitivity: 0.2,
    elements: data,
    style: getStyle(getShapeForNamespace),
    layout: getLayout(),
  });

  setCy(newCy);
  newCy.ready(() => {
    onLoaded();
    setLoading(false);
    newCy.fit();
  });
  newCy.contextMenus(getContextMenuOptions(contextMenuActions));
}

export function updateCytoscapeInstance(
  cy: Core,
  data: ICytoData,
  initialNodeData: React.MutableRefObject<Map<string, { x: number; y: number; visible: boolean }>>,
  onLoaded: () => void,
  setLoading: SetLoadingFn,
  contextMenuActions: ContextMenuActions,
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
  cy.contextMenus(getContextMenuOptions(contextMenuActions));
}
