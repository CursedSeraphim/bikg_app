// src/components/Treeview/TreeViewHelpers.ts

import { KnowledgeGraphNode } from './useTreeData';

export function updateTreeDataWithSelectedTypes(nodes: KnowledgeGraphNode[] | null, selectedTypes: string[] = []): KnowledgeGraphNode[] {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((node) => {
    if (!node || !node.name) return node;

    // The ID we used above is typically the portion before the space
    // so if node.id = "Car", we can see if "Car" is in selectedTypes.
    const isSelected = selectedTypes.includes(node.id);

    // Optionally, store a boolean "selected" for your own styling
    // (MUI highlights selected nodes automatically if you pass 'selected' to <TreeView>)
    const updatedChildren = updateTreeDataWithSelectedTypes(node.children, selectedTypes);

    return {
      ...node,
      children: updatedChildren,
      // optional custom property
      // selected: isSelected,
    };
  });
}
