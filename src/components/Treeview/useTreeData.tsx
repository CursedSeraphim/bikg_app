// useTreeData.tsx
import { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import store from '../Store/Store';
import { getTreeDataFromTuples } from './TreeviewGlue';
import { updateTreeDataWithSelectedTypes } from './TreeViewHelpers';

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

  return [treeData, setTreeData, selectedTypesRef];
}
