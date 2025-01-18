// src/components/Treeview/useTreeData.tsx

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { INumberViolationsPerNodeMap, IOntologyNode } from '../../types';
import { RootState } from '../Store/Store';

import { getTreeDataFromTuples } from './TreeviewGlue';
import { updateTreeDataWithSelectedTypes } from './TreeViewHelpers';

export interface KnowledgeGraphNode {
  id: string;
  name: string;
  children: KnowledgeGraphNode[];
}

export default function useTreeData() {
  const [treeData, setTreeData] = useState<KnowledgeGraphNode[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Redux data (including subClassOfTriples, etc.)
  const { rdfString, selectedTypes, subClassOfTriples, numberViolationsPerNode } = useSelector((state: RootState) => state.combined);

  useEffect(() => {
    if (rdfString && numberViolationsPerNode && Object.keys(numberViolationsPerNode).length > 0) {
      const rootNode: IOntologyNode = getTreeDataFromTuples(subClassOfTriples, numberViolationsPerNode as INumberViolationsPerNodeMap);

      let rootArray: KnowledgeGraphNode[] = [];
      if (rootNode) {
        const transformedRoot = transformIOntologyNode(rootNode);
        if (transformedRoot) {
          rootArray = [transformedRoot];
        }
      }

      // We call updateTreeDataWithSelectedTypes if you still want the "selected" boolean
      // in the data for styling, but it is no longer used for direct dispatch triggers.
      const updated = updateTreeDataWithSelectedTypes(rootArray, selectedTypes);
      setTreeData(updated);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [rdfString, subClassOfTriples, numberViolationsPerNode, selectedTypes]);

  return { treeData, loading };
}

function transformIOntologyNode(node: IOntologyNode): KnowledgeGraphNode | null {
  if (!node || !node.name) return null;

  const [idPart] = node.name.split(' ');
  const nodeId = idPart || node.name;

  let childArray: KnowledgeGraphNode[] = [];
  if (Array.isArray(node.children)) {
    childArray = node.children.map(transformIOntologyNode).filter(Boolean) as KnowledgeGraphNode[];
  }

  return {
    id: nodeId,
    name: node.name,
    children: childArray,
  };
}
