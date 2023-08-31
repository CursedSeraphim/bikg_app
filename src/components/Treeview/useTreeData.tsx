// useTreeData.tsx
import { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import store from '../Store/Store';
import { getTreeDataFromTuples } from './TreeviewGlue';
import { updateTreeDataWithSelectedTypes } from './TreeViewHelpers';

function sortEachLayerAlphabetically(tree) {
  if (!tree) return;

  const queue = [tree];

  while (queue.length > 0) {
    const node = queue.shift();

    if (Array.isArray(node.children)) {
      // Sort the children of the current node
      node.children.sort((a, b) => a.name.localeCompare(b.name));

      // Add children to the queue to sort their children later
      queue.push(...node.children);
    }
  }
}

export default function useTreeData() {
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
      console.log('currentState.combined', currentState.combined);

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
          sortEachLayerAlphabetically(processedData);
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

  return [treeData, setTreeData, selectedTypesRef];
}
