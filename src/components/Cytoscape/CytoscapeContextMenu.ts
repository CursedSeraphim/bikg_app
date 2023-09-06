import { NodeSingular } from 'cytoscape';
import { MenuItem, ContextMenuOptions, ContextMenuActions } from '../../types';

export function getContextMenuOptions(actions: ContextMenuActions): ContextMenuOptions {
  console.log('getContextMenuOptions', actions);
  const dynamicMenuItems: MenuItem[] = Object.keys(actions).map((actionKey) => {
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

  return {
    menuItems: dynamicMenuItems,
  };
}
