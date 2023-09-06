// useCytoscapeContextMenu.ts
import { useEffect } from 'react';
import { Core } from 'cytoscape';
import { ContextMenuActions } from '../../types';
import { getContextMenuOptions } from './CytoscapeContextMenu';

export function useCytoscapeContextMenu(
  cy: Core | null,
  contextMenuActions: ContextMenuActions,
  initialNodeData: Map<string, { x: number; y: number; visible: boolean }>,
) {
  useEffect(() => {
    console.log('useEffect called with initialNodeData', initialNodeData);
    if (cy) {
      cy.contextMenus(getContextMenuOptions(contextMenuActions));
    }
  }, [cy, contextMenuActions, initialNodeData]); // Added initialNodeData as a dependency here
}
