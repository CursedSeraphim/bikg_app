// handleNodeToggle.tsx
export function handleNodeToggle(node, toggled, selectedTypes, dispatch, setSelectedTypes, setTreeData) {
  let newSelectedTypes = [...selectedTypes];

  const removeNodeAndChildrenFromList = (n) => {
    newSelectedTypes = newSelectedTypes.filter((type) => type !== n.name);
    if (n.children) {
      n.children.forEach(removeNodeAndChildrenFromList);
    }
  };

  if (toggled) {
    newSelectedTypes.push(node.name);
  } else {
    removeNodeAndChildrenFromList(node);
  }

  dispatch(setSelectedTypes(newSelectedTypes));

  if (node.children) {
    setTreeData((oldTreeData) => {
      const newTreeData = JSON.parse(JSON.stringify(oldTreeData));
      const traverseAndToggle = (n) => {
        if (n.children) {
          n.children.forEach(traverseAndToggle);
        }
        if (n.name === node.name) {
          n.toggled = toggled;
        }
      };
      traverseAndToggle(newTreeData);
      return newTreeData;
    });
  }
}
