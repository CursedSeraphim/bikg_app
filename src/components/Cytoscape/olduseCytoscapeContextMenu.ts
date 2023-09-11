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
    if (cy) {
      cy.contextMenus(getContextMenuOptions(contextMenuActions));
    }
  }, [cy, contextMenuActions, initialNodeData]); // Added initialNodeData as a dependency here
}
