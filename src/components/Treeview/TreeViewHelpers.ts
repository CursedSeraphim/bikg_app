// TreeViewHelpers.ts

// Toggle the path to a node in the tree data
export function togglePathToNode(node, targetName) {
  if (node.name === targetName) {
    node.toggled = true;
    node.selected = true;
    return true;
  }
  if (node.children) {
    for (const child of node.children) {
      if (togglePathToNode(child, targetName)) {
        node.toggled = true;
        return true;
      }
    }
  }
  return false;
}

// Reset all nodes in the tree data
export function resetAllNodes(node) {
  if (node) {
    node.toggled = false;
    node.selected = false;
    if (node.children) {
      for (const child of node.children) {
        resetAllNodes(child);
      }
    }
  }
}

export function updateTreeDataWithSelectedTypes(oldTreeData, selectedTypes) {
  const newTreeData = JSON.parse(JSON.stringify(oldTreeData));
  resetAllNodes(newTreeData);

  for (const selectedType of selectedTypes) {
    togglePathToNode(newTreeData, selectedType);
  }

  return newTreeData;
}
