import { KnowledgeGraphNode } from './TreeViewTypes';

export function updateTreeDataWithSelectedTypes(nodes: KnowledgeGraphNode[] | null, selectedTypes: string[] = []): KnowledgeGraphNode[] {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((node) => {
    if (!node || !node.name) return node;

    const updatedChildren = updateTreeDataWithSelectedTypes(node.children, selectedTypes);

    return {
      ...node,
      children: updatedChildren,
      // Optionally store a custom property if you want custom styling
      // selected: isSelected,
    };
  });
}
