// src/components/Treeview/TreeViewTypes.ts

export interface KnowledgeGraphNode {
  id: string;
  name: string;
  children: KnowledgeGraphNode[];
}
