import { makeStyles } from '@material-ui/core/styles';
import { ChevronRight, ExpandMore } from '@material-ui/icons';
import { TreeItem, TreeView } from '@material-ui/lab';
import React, { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarLoader } from 'react-spinners';

import { addSingleSelectedType, removeMultipleSelectedTypes } from '../Store/CombinedSlice';
import { RootState } from '../Store/Store';
import { KnowledgeGraphNode } from './TreeViewTypes';
import useTreeData from './useTreeData';

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(1),
    overflow: 'auto',
    maxHeight: '100%',
    userSelect: 'none',
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

  const { treeData, loading } = useTreeData();

  const storeSelectedTypes = useSelector((state: RootState) => state.combined.selectedTypes) as string[];

  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');

  const lastClickRef = useRef<number>(0);
  const DOUBLE_CLICK_TIMEOUT_MS = 250;

  useEffect(() => {
    setLocalSelected(storeSelectedTypes);

    // Expand subtrees to show selected nodes
    const selectedParentIds = new Set<string>();

    function collectParentIds(node: KnowledgeGraphNode, parentIds: string[]) {
      if (storeSelectedTypes.includes(node.id)) {
        parentIds.forEach((id) => selectedParentIds.add(id));
      }
      node.children.forEach((child) => collectParentIds(child, [...parentIds, node.id]));
    }

    if (treeData) {
      treeData.forEach((node) => collectParentIds(node, []));
      setExpanded((prev) => Array.from(new Set([...prev, ...selectedParentIds])));
    }
  }, [storeSelectedTypes, treeData]);

  const filteredData = useMemo(() => {
    if (!treeData) return [];
    const ft = filterText.trim().toLowerCase();
    if (!ft) return treeData;

    function filterNode(node: KnowledgeGraphNode): KnowledgeGraphNode | null {
      const matches = node.name.toLowerCase().includes(ft);
      const childMatches = node.children.map(filterNode).filter(Boolean) as KnowledgeGraphNode[];
      if (matches || childMatches.length > 0) {
        return { ...node, children: childMatches };
      }
      return null;
    }

    return treeData.map(filterNode).filter(Boolean) as KnowledgeGraphNode[];
  }, [treeData, filterText]);

  const collectAutoExpanded = useCallback((nodes: KnowledgeGraphNode[]): string[] => {
    const expansions: string[] = [];
    function dfs(n: KnowledgeGraphNode) {
      if (n.children && n.children.length > 0) {
        expansions.push(n.id);
        n.children.forEach(dfs);
      }
    }
    nodes.forEach(dfs);
    return expansions;
  }, []);

  useEffect(() => {
    if (!filteredData || filteredData.length === 0) {
      setExpanded([]);
      return;
    }
    if (filterText.trim()) {
      const expansions = collectAutoExpanded(filteredData);
      setExpanded(expansions);
    }
  }, [filteredData, filterText, collectAutoExpanded]);

  const toggleExpansion = useCallback((nodeId: string) => {
    setExpanded((prev) => (prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]));
  }, []);

  const dispatchSingleClass = useCallback(
    (nodeId: string) => {
      const isSelected = storeSelectedTypes.includes(nodeId);
      if (isSelected) {
        dispatch(removeMultipleSelectedTypes([nodeId]));
      } else {
        dispatch(addSingleSelectedType(nodeId));
      }
    },
    [dispatch, storeSelectedTypes],
  );

  const handleNodeClick = useCallback(
    (event: MouseEvent, nodeId: string) => {
      const now = Date.now();
      if (now - lastClickRef.current < DOUBLE_CLICK_TIMEOUT_MS) {
        event.preventDefault();
        dispatchSingleClass(nodeId);
      } else {
        toggleExpansion(nodeId);
      }
      lastClickRef.current = now;
    },
    [dispatchSingleClass, toggleExpansion],
  );

  const getColoredLabel = (nodeName: string): React.ReactNode => {
    const match = nodeName.match(/^(.*)\((\d+)\/(\d+)\)\s*$/);
    if (!match) {
      return nodeName;
    }
    const [, mainName, selectedStr, violatingStr] = match;
    const selectedCount = parseInt(selectedStr, 10);
    return (
      <span>
        {mainName.trim()}(
        <span style={{ color: selectedCount > 0 ? '#DA5700' : 'inherit', fontWeight: selectedCount > 0 ? 'bold' : 'inherit' }}>{selectedStr}</span>/
        {violatingStr})
      </span>
    );
  };

  const renderTree = (nodes: KnowledgeGraphNode[]): React.ReactNode => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        nodeId={node.id}
        label={
          <div onClick={(e) => handleNodeClick(e as MouseEvent, node.id)} onDoubleClick={(e) => e.preventDefault()}>
            {getColoredLabel(node.name)}
          </div>
        }
      >
        {node.children && node.children.length > 0 && renderTree(node.children)}
      </TreeItem>
    ));
  };

  if (loading) {
    return <BarLoader color="#888" loading />;
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className={classes.container}>
        <input className={classes.filterInput} type="text" placeholder="Filter nodes..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        <div style={{ padding: 8 }}>No data or no matching nodes.</div>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <input className={classes.filterInput} type="text" placeholder="Filter nodes..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
      <TreeView
        className={classes.treeRoot}
        multiSelect
        expanded={expanded}
        defaultCollapseIcon={<ExpandMore />}
        defaultExpandIcon={<ChevronRight />}
        onNodeToggle={(_event, nodeIds) => setExpanded(nodeIds)}
      >
        {renderTree(filteredData)}
      </TreeView>
    </div>
  );
}
