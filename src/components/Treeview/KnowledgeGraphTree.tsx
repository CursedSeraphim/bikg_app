// src/components/Treeview/KnowledgeGraphTree.tsx
import { makeStyles } from '@material-ui/core/styles';
import { ChevronRight, ExpandMore } from '@material-ui/icons';
import { TreeItem, TreeView } from '@material-ui/lab';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarLoader } from 'react-spinners';

import { addSingleSelectedType, removeMultipleSelectedTypes } from '../Store/CombinedSlice';
import { RootState } from '../Store/Store';

import useTreeData, { KnowledgeGraphNode } from './useTreeData';

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(1),
    overflow: 'auto',
    maxHeight: '100%',
  },
  filterInput: {
    marginBottom: theme.spacing(1),
    width: '100%',
    padding: 4,
    fontSize: '0.9rem',
  },
  treeRoot: {
    flexGrow: 1,
  },
}));

export default function KnowledgeGraphTree() {
  const classes = useStyles();
  const dispatch = useDispatch();

  // Pull the final array of nodes from the custom hook
  const { treeData, loading } = useTreeData();

  // Redux store selection
  const selectedTypes = useSelector((state: RootState) => state.combined.selectedTypes) as string[];

  // Local expansions
  const [expanded, setExpanded] = useState<string[]>([]);
  const handleToggle = useCallback((event: React.ChangeEvent<{}>, nodeIds: string[]) => {
    setExpanded(nodeIds);
  }, []);

  // MUI multi-select calls this when the user checks or unchecks a node
  const handleSelect = useCallback(
    (event: React.ChangeEvent<{}>, nodeIds: string[]) => {
      // nodeIds = all MUI-selected IDs
      // Compare with the old selectedTypes
      const newlySelected = nodeIds.filter((id) => !selectedTypes.includes(id));
      const newlyDeselected = selectedTypes.filter((id) => !nodeIds.includes(id));

      // Add newly selected
      newlySelected.forEach((typeId) => {
        dispatch(addSingleSelectedType(typeId));
      });
      // Remove newly deselected
      if (newlyDeselected.length > 0) {
        dispatch(removeMultipleSelectedTypes(newlyDeselected));
      }
    },
    [dispatch, selectedTypes],
  );

  // Local text filter
  const [filterText, setFilterText] = useState('');
  const filteredData = useMemo(() => {
    if (!treeData) return [];
    if (!filterText.trim()) return treeData;

    const lower = filterText.toLowerCase();

    function filterNode(node: KnowledgeGraphNode): KnowledgeGraphNode | null {
      const hasMatch = node.name.toLowerCase().includes(lower);
      // Filter children
      const childMatches = node.children.map(filterNode).filter(Boolean) as KnowledgeGraphNode[];
      if (hasMatch || childMatches.length > 0) {
        return { ...node, children: childMatches };
      }
      return null;
    }

    return treeData.map(filterNode).filter(Boolean) as KnowledgeGraphNode[];
  }, [treeData, filterText]);

  // Render MUI TreeItems
  const renderTree = (nodes: KnowledgeGraphNode[]): React.ReactNode => {
    return nodes.map((node) => (
      <TreeItem key={node.id} nodeId={node.id} label={node.name}>
        {node.children && node.children.length > 0 ? renderTree(node.children) : null}
      </TreeItem>
    ));
  };

  // If still loading
  if (loading) {
    return <BarLoader color="#888" loading />;
  }
  // If no data or filter mismatch
  if (!filteredData || filteredData.length === 0) {
    return (
      <div className={classes.container}>
        <input className={classes.filterInput} type="text" placeholder="Filter nodes..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        <div style={{ padding: 8 }}>No data or no matching nodes.</div>;
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <input className={classes.filterInput} type="text" placeholder="Filter nodes..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />

      <TreeView
        className={classes.treeRoot}
        defaultCollapseIcon={<ExpandMore />}
        defaultExpandIcon={<ChevronRight />}
        multiSelect
        expanded={expanded}
        selected={selectedTypes}
        onNodeToggle={handleToggle}
        onNodeSelect={handleSelect}
      >
        {renderTree(filteredData)}
      </TreeView>
    </div>
  );
}
