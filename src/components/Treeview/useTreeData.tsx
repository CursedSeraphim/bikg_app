// src/components/Treeview/useTreeData.tsx

import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { INumberViolationsPerNodeMap, IOntologyNode } from '../../types';
import { RootState } from '../Store/Store';

import { getTreeDataFromTuples } from './TreeviewGlue';
import { updateTreeDataWithSelectedTypes } from './TreeViewHelpers';

// --- Our final shape for MUI rendering ---
export interface KnowledgeGraphNode {
  id: string; // e.g. "Car"
  name: string; // e.g. "Car (6/2)" with counts
  children: KnowledgeGraphNode[];
}

export default function useTreeData() {
  const [treeData, setTreeData] = useState<KnowledgeGraphNode[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Pull the relevant data from Redux
  const { rdfString, selectedTypes, subClassOfTriples, numberViolationsPerNode } = useSelector((state: RootState) => state.combined);

  useEffect(() => {
    // If we have enough data to build the tree
    if (rdfString && numberViolationsPerNode && Object.keys(numberViolationsPerNode).length > 0) {
      // Call your existing function from TreeviewGlue
      // which returns an IOntologyNode 'root' or a synthetic "root" node
      const rootNode: IOntologyNode = getTreeDataFromTuples(subClassOfTriples, numberViolationsPerNode as INumberViolationsPerNodeMap);

      // Convert that single root IOntologyNode into an array
      // of KnowledgeGraphNodes for MUI
      let rootArray: KnowledgeGraphNode[] = [];
      if (rootNode) {
        // If the top-level node is "root (...)" with children,
        // we still transform that single node. Potentially we can
        // flatten if the user doesn't want a synthetic root. But
        // let's keep the structure as-is.
        const transformedRoot = transformIOntologyNode(rootNode);
        if (transformedRoot) {
          rootArray = [transformedRoot];
        }
      }

      // Optionally mark selection in the data if your code uses it
      // for custom styling (not strictly needed by MUI)
      const updated = updateTreeDataWithSelectedTypes(rootArray, selectedTypes);
      setTreeData(updated);
      setLoading(false);
    }
    // If we already have treeData but only 'selectedTypes' changed
    else if (treeData && selectedTypes) {
      const updated = updateTreeDataWithSelectedTypes(treeData, selectedTypes);
      if (!_.isEqual(updated, treeData)) {
        setTreeData(updated);
      }
      setLoading(false);
    } else {
      // Not enough data or partial data
      setLoading(true);
    }
  }, [rdfString, subClassOfTriples, numberViolationsPerNode, selectedTypes]);

  return { treeData, loading };
}

/**
 * Transform your IOntologyNode into our KnowledgeGraphNode shape.
 * - IOntologyNode has .name (like "Car (6/2)"), .children, etc.
 * - We want .id, .name, .children
 */
function transformIOntologyNode(node: IOntologyNode): KnowledgeGraphNode | null {
  if (!node || !node.name) return null;

  // ID: If you want the portion before space, do this:
  // const [idPart] = node.name.split(' ');
  // But let's store the entire "Car" or "root" if you want a stable ID
  // For safety, let's parse out just the first token if needed:
  const [idPart] = node.name.split(' ');
  const nodeId = idPart || node.name;

  // Recurse children
  let childArray: KnowledgeGraphNode[] = [];
  if (Array.isArray(node.children)) {
    childArray = node.children.map(transformIOntologyNode).filter(Boolean) as KnowledgeGraphNode[];
  }

  return {
    id: nodeId,
    name: node.name, // e.g. "Car (6/2)"
    children: childArray,
  };
}
