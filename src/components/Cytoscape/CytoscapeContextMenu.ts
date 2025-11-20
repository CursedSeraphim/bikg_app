// src/components/Cytoscape/CytoscapeContextMenu.ts
import { NodeSingular } from 'cytoscape';
import { ContextMenuActions, ContextMenuOptions, MenuItem } from '../../types';

export function getContextMenuOptions(actions: ContextMenuActions): ContextMenuOptions {
  let dynamicMenuItems: MenuItem[] = Object.keys(actions).map((actionKey) => {
    const actionOrObject = actions[actionKey];

    let action: (target: NodeSingular, ...args: unknown[]) => void;
    let args: unknown[] = [];
    let coreAsWell = false;

    if (typeof actionOrObject === 'function') {
      action = actionOrObject;
    } else if (actionOrObject && 'action' in actionOrObject && 'args' in actionOrObject) {
      ({ action, args, coreAsWell } = actionOrObject);
    } else {
      throw new Error(`Invalid action configuration for key ${actionKey}`);
    }

    const menuItem = {
      id: actionKey,
      content: actionKey,
      selector: 'node',
      coreAsWell,
      onClickFunction(event) {
        const target = event.target || event.cyTarget;
        action(target, ...args);
      },
    };
    return menuItem;
  });

  // Sort menu items by 'content' property alphabetically
  dynamicMenuItems = dynamicMenuItems.sort((a, b) => a.content.localeCompare(b.content));

  return {
    menuItems: dynamicMenuItems,
  };
}
