// CytoscapeContextMenu.ts
import contextMenus from 'cytoscape-context-menus';
import 'cytoscape-context-menus/cytoscape-context-menus.css';

// This function will now just return the configuration object for the context menu
export function getContextMenuOptions() {
  return {
    menuItems: [
      {
        id: 'remove',
        content: 'remove',
        selector: 'node',
        onClickFunction(event) {
          const target = event.target || event.cyTarget;
          target.remove();
        },
      },
      // Add more items as needed
    ],
  };
}
