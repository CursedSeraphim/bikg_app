// CytoscapeContextMenu.ts
import { MenuItem, ContextMenuOptions, ContextMenuActions } from '../../types';

export function getContextMenuOptions(actions: ContextMenuActions): ContextMenuOptions {
  const dynamicMenuItems: MenuItem[] = Object.keys(actions).map((actionKey) => {
    return {
      id: actionKey,
      content: actionKey.replace('-', ' '),
      selector: 'node',
      onClickFunction(event) {
        const target = event.target || event.cyTarget;
        console.log(`Executing ${actionKey}`);
        actions[actionKey](target);
      },
    };
  });

  return {
    menuItems: dynamicMenuItems,
  };
}
