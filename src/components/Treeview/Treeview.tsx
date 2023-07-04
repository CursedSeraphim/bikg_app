import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Treebeard, decorators } from 'react-treebeard';
import { BarLoader } from 'react-spinners';
import { selectRdfData, selectSelectedTypes } from '../Store/CombinedSlice';
import { getTreeDataFromN3Data } from './TreeviewGlue';
import { lightTheme } from './lightTheme';

function CustomHeader({ style, node }) {
  // const iconType = node.children ? 'folder' : 'file-text';
  const iconClass = `fas fa-caret-right`;
  const iconStyle = { marginRight: '5px' };

  let newStyle = { ...style };
  if (node.selected) {
    // Check selected instead of toggled
    newStyle = { ...newStyle, color: 'steelblue' };
  } else {
    newStyle = { ...newStyle, color: 'lightgrey' };
  }

  return (
    <div style={newStyle} className="row">
      <div className="col-11" style={{ ...style.title }}>
        <i className={iconClass} style={iconStyle} />
        {node.name}
      </div>
    </div>
  );
}

decorators.Header = CustomHeader;

function togglePathToNode(node, targetName) {
  if (node.name === targetName) {
    node.toggled = true;
    node.selected = true; // Add selected field
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

function resetAllNodes(node) {
  if (node) {
    node.toggled = false;
    node.selected = false; // Reset selected field
    if (node.children) {
      for (const child of node.children) {
        resetAllNodes(child);
      }
    }
  }
}

export default function Treeview() {
  const [treeData, setTreeData] = useState(null);
  const ontology = useSelector(selectRdfData);
  const selectedTypes = useSelector(selectSelectedTypes);

  useEffect(() => {
    if (ontology) {
      getTreeDataFromN3Data(ontology).then((processedData) => {
        setTreeData(processedData);
      });
    }
  }, [ontology]);

  useEffect(() => {
    setTreeData((oldTreeData) => {
      const newTreeData = JSON.parse(JSON.stringify(oldTreeData));
      resetAllNodes(newTreeData);

      if (selectedTypes.length !== 0) {
        // If types are selected, toggle the paths to the selected nodes.
        for (const selectedType of selectedTypes) {
          togglePathToNode(newTreeData, selectedType);
        }
      }

      return newTreeData;
    });
  }, [selectedTypes]);

  const onToggle = (node, toggled) => {
    if (node.children) {
      setTreeData((oldTreeData) => {
        const newTreeData = JSON.parse(JSON.stringify(oldTreeData));
        const traverseAndToggle = (n) => {
          if (n.children) {
            n.children.forEach(traverseAndToggle);
            if (n.name === node.name) {
              n.toggled = toggled;
            }
          }
        };
        traverseAndToggle(newTreeData);
        return newTreeData;
      });
    }
  };

  if (!treeData) {
    return <BarLoader color="steelblue" loading />;
  }

  // set root element to be default toggled
  treeData.toggled = true;

  return <Treebeard data={treeData} style={lightTheme} onToggle={onToggle} decorator={decorators} />;
}
