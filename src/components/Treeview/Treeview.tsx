import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Treebeard, decorators } from 'react-treebeard';
import { BarLoader } from 'react-spinners';
import { selectRdfData, selectSelectedTypes, setSelectedTypes } from '../Store/CombinedSlice';
import { getTreeDataFromN3Data } from './TreeviewGlue';
import { lightTheme } from './lightTheme';
import { SPINNER_COLOR } from '../../constants';

function CustomHeader({ onSelect, style, node }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const iconClass = `fas fa-caret-right`;
  const iconStyle = { marginRight: '5px' };

  let newStyle = { ...style.base, transition: 'all 0.15s ease-in-out' };

  if (node.selected) {
    // Check selected instead of toggled
    newStyle = { ...newStyle, color: 'steelblue', fontWeight: 'bold' };
  } else {
    newStyle = { ...newStyle, color: 'lightgrey', fontWeight: 'normal' };
  }

  // Adding hover and active style
  if (isHovered) {
    newStyle = { ...newStyle, color: 'black' };
  }
  if (isActive) {
    newStyle = { ...newStyle, backgroundColor: 'steelblue', color: 'white' };
  }

  return (
    <div
      style={newStyle}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onBlur={() => setIsActive(false)}
    >
      <div style={node.selected ? { ...style.title, fontWeight: 'bold' } : style.title}>
        <i className={iconClass} style={iconStyle} />
        {node.name}
      </div>
    </div>
  );
}

decorators.Header = CustomHeader;

// it would lead to problems with large objects if we created a new object for each node to solve the eslint error
// this way we can keep an elegant recursive solution
/* eslint-disable no-param-reassign */
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
  const dispatch = useDispatch();
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
    console.log('toggle', node, toggled);
    // Get the current list of selected types
    let newSelectedTypes = [...selectedTypes];

    const removeNodeAndChildrenFromList = (n) => {
      newSelectedTypes = newSelectedTypes.filter((type) => type !== n.name);

      if (n.children) {
        n.children.forEach(removeNodeAndChildrenFromList);
      }
    };

    // If toggled, add the node to the list
    if (toggled) {
      newSelectedTypes.push(node.name);
    } else {
      removeNodeAndChildrenFromList(node);
    }

    // Update the selected types in the store
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
  };

  if (!treeData) {
    return <BarLoader color={SPINNER_COLOR} loading />;
  }

  // set root element to be default toggled
  treeData.toggled = true;

  return (
    <div className="treeview-container">
      <Treebeard data={treeData} style={lightTheme} onToggle={onToggle} decorator={decorators} />
    </div>
  );
}
