import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Treebeard, decorators } from 'react-treebeard';
import { BarLoader } from 'react-spinners';
import _ from 'lodash';
import store from '../Store/Store';
import { setSelectedTypes } from '../Store/CombinedSlice';
import { getTreeDataFromTuples } from './TreeviewGlue';
import { lightTheme } from './lightTheme';
import { CustomHeader } from './CustomHeader'; // Import CustomHeader
import { SPINNER_COLOR } from '../../constants';
import { togglePathToNode, resetAllNodes } from './TreeViewHelpers';

decorators.Header = CustomHeader;

function updateTreeDataWithSelectedTypes(oldTreeData, selectedTypes) {
  const newTreeData = JSON.parse(JSON.stringify(oldTreeData));
  resetAllNodes(newTreeData);

  for (const selectedType of selectedTypes) {
    togglePathToNode(newTreeData, selectedType);
  }

  return newTreeData;
}

export default function Treeview() {
  console.log('Treeview render');
  const dispatch = useDispatch();
  const [treeData, setTreeData] = useState(null);
  const ontologyRef = useRef('');
  const selectedTypesRef = useRef([]);
  const subClassOfTriplesRef = useRef([]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const currentState = store.getState();
      const newOntology = currentState.combined.rdfString;
      const newSelectedTypes = currentState.combined.selectedTypes;
      const newSubClassOfTriples = currentState.combined.subClassOfTriples; // Get new value from state

      let shouldUpdateTreeData = false;

      if (ontologyRef.current !== newOntology) {
        ontologyRef.current = newOntology;
        shouldUpdateTreeData = true;
      }

      if (!_.isEqual(selectedTypesRef.current, newSelectedTypes)) {
        selectedTypesRef.current = newSelectedTypes;
        shouldUpdateTreeData = true;
      }

      if (!_.isEqual(subClassOfTriplesRef.current, newSubClassOfTriples)) {
        // Compare new and old value
        subClassOfTriplesRef.current = newSubClassOfTriples;
        shouldUpdateTreeData = true;
      }

      if (shouldUpdateTreeData) {
        let processedData;
        if (newOntology) {
          // Call the function directly since it's not asynchronous anymore
          processedData = getTreeDataFromTuples(subClassOfTriplesRef.current);
          if (Array.isArray(newSelectedTypes) && newSelectedTypes.length > 0) {
            setTreeData(updateTreeDataWithSelectedTypes(processedData, newSelectedTypes));
          } else {
            setTreeData(processedData);
          }
        } else if (Array.isArray(newSelectedTypes) && newSelectedTypes.length > 0) {
          setTreeData((oldTreeData) => updateTreeDataWithSelectedTypes(oldTreeData, newSelectedTypes));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // This function will be called when a node is toggled
  const onToggle = (node, toggled) => {
    let newSelectedTypes = [...selectedTypesRef.current];

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
  };

  // This will show a spinner while the treeview is loading
  if (!treeData) {
    return <BarLoader color={SPINNER_COLOR} loading />;
  }

  // This will expand the treeview by default
  treeData.toggled = true;

  // Here we return the JSX that will be rendered
  return (
    <div className="treeview-container">
      <Treebeard data={treeData} style={lightTheme} onToggle={onToggle} decorator={decorators} />
    </div>
  );
}
