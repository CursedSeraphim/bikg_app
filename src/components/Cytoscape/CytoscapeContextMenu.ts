// CytoscapeContextMenu.ts
import { NodeSingular } from 'cytoscape'; // Make sure to import NodeSingular from cytoscape
import { MenuItem, ContextMenuOptions, ContextMenuActions } from '../../types'; // Update the imports based on your project structure

export function getContextMenuOptions(actions: ContextMenuActions): ContextMenuOptions {
  const dynamicMenuItems: MenuItem[] = Object.keys(actions).map((actionKey) => {
    const content = actionKey.replaceAll('-', ' ');

    const actionOrObject = actions[actionKey];

    let action: (target: NodeSingular, ...args: any[]) => void;
    let args: any[] = [];

    if (typeof actionOrObject === 'function') {
      action = actionOrObject;
    } else if (actionOrObject && 'action' in actionOrObject && 'args' in actionOrObject) {
      action = actionOrObject.action;
      args = actionOrObject.args;
    } else {
      throw new Error(`Invalid action configuration for key ${actionKey}`);
    }

    return {
      id: actionKey,
      content: content.charAt(0).toUpperCase() + content.slice(1),
      selector: 'node',
      onClickFunction(event) {
        const target = event.target || event.cyTarget;
        action(target, ...args);
      },
    };
  });

  return {
    menuItems: dynamicMenuItems,
  };
}
