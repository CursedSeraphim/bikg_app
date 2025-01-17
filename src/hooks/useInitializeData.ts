// src/hooks/useInitializeData.ts
import React from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchEdgeCountDict,
  fetchEdgeLabelSet,
  fetchNamespaces,
  fetchNodeFocusNodeCountDict,
  fetchNodeLabelSet,
  fetchOntology,
  fetchOntologyTree,
  fetchSubClassOfTriples,
  fetchViolationPathNodesDict,
} from '../api';
import {
  setCumulativeNumberViolationsPerNode,
  setEdgeCountDict,
  setEdgeLabels,
  setNamespaces,
  setNodeLabels,
  setOntologyTree,
  setRdfString,
  setSubClassOfTriples,
  setTypesViolationMap,
  setViolationTypesMap,
} from '../components/Store/CombinedSlice';
import { AppDispatch } from '../components/Store/Store';
import { fetchAndInitializeData } from '../components/Store/thunks';

export function useInitializeData() {
  const dispatch: AppDispatch = useDispatch();

  // The large sequence of data fetching, kept in the same order as before:
  React.useEffect(() => {
    fetchSubClassOfTriples()
      .then((data) => {
        dispatch(setSubClassOfTriples(data));
      })
      .catch((error) => {
        console.error('Failed to fetch sub-class-of triples', error);
      });

    fetchOntologyTree()
      .then((data) => {
        dispatch(setOntologyTree(data));
      })
      .catch((fetchError) => {
        console.error('Error retrieving ontology tree', fetchError);
      });

    fetchNodeLabelSet()
      .then((data) => {
        dispatch(setNodeLabels(data));
      })
      .catch((fetchError) => {
        console.error('Error retrieving node label set', fetchError);
      });

    fetchEdgeLabelSet()
      .then((data) => {
        dispatch(setEdgeLabels(data));
      })
      .catch((fetchError) => {
        console.error('Error retrieving edge label set', fetchError);
      });

    fetchNodeFocusNodeCountDict()
      .then((nodeFocusNodeCountDict) => {
        const updatedObject = Object.keys(nodeFocusNodeCountDict).reduce(
          (acc, key) => {
            const { count, cumulative_count: cumulativeCount } = nodeFocusNodeCountDict[key];
            acc[key] = {
              cumulativeViolations: cumulativeCount,
              cumulativeSelected: 0,
              violations: count,
            };
            return acc;
          },
          {} as Record<string, any>,
        );
        dispatch(setCumulativeNumberViolationsPerNode(updatedObject));
      })
      .catch((error) => {
        console.error('Failed to fetch node focus node count dict', error);
      });

    fetchNamespaces()
      .then((data) => {
        dispatch(setNamespaces(data));
      })
      .catch((error) => {
        console.error('Failed to fetch namespaces', error);
      });

    fetchEdgeCountDict()
      .then((data) => {
        dispatch(setEdgeCountDict(data));
      })
      .catch((error) => {
        console.error('Failed to fetch edge count dictionary', error);
      });

    fetchOntology()
      .then((data) => {
        dispatch(setRdfString(data));
      })
      .catch((error) => {
        console.error('Failed to fetch ontology', error);
      });

    fetchViolationPathNodesDict()
      .then((data) => {
        dispatch(setViolationTypesMap(data.property_class_d));
        dispatch(setTypesViolationMap(data.class_property_d));
      })
      .catch((error) => {
        console.error('Failed to fetch violation path nodes dictionary', error);
      });

    // Finally, call your existing thunk that fetches CSV data, classes, etc.
    dispatch(fetchAndInitializeData());
  }, [dispatch]);
}
