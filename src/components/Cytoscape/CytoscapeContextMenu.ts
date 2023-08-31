// CytoscapeContextMenu.ts
import { MenuItem, ContextMenuOptions, ContextMenuActions } from '../../types';

export function getContextMenuOptions(actions: ContextMenuActions): ContextMenuOptions {
  const dynamicMenuItems: MenuItem[] = Object.keys(actions).map((actionKey) => {
    const content = actionKey.replaceAll('-', ' ');
    return {
      id: actionKey,
      content: content.charAt(0).toUpperCase() + content.slice(1),
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
