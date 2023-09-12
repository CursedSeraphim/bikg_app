// App.tsx
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarLoader } from 'react-spinners';
import { AppDispatch } from './components/Store/Store';
import BottomTabs from './components/BottomTabs';
import {
  setRdfString,
  selectRdfData,
  setViolationTypesMap,
  setTypesViolationMap,
  setEdgeCountDict,
  setNamespaces,
  setSubClassOfTriples,
} from './components/Store/CombinedSlice';

import CytoscapeView from './components/Cytoscape/CytoscapeView';

import './styles.css';
import { fetchOntology, fetchViolationPathNodesDict, fetchEdgeCountDict, fetchNamespaces, fetchSubClassOfTriples, fetchNodeCountDict } from './api';
import { SPINNER_COLOR } from './constants';
import { fetchAndInitializeData } from './components/Store/thunks';

export function App() {
  const dispatch: AppDispatch = useDispatch();
  const rdfOntology = useSelector(selectRdfData);
  const [cytoscapeLoading, setCytoscapeLoading] = React.useState(true);

  // Fetch sub-class-of triples and print
  React.useEffect(() => {
    fetchSubClassOfTriples()
      .then((data) => {
        dispatch(setSubClassOfTriples(data));
      })
      .catch((error) => {
        console.error('Failed to fetch sub-class-of triples', error);
      });
  }, [dispatch]);

  // Fetch node count dict and print
  React.useEffect(() => {
    fetchNodeCountDict()
      .then((data) => {
        console.log('node count dict', data);
      })
      .catch((error) => {
        console.error('Failed to fetch edge count dictionary', error);
      });
  });

  // // Fetch classes and print
  // React.useEffect(() => {
  //   fetchClasses()
  //     .then((data) => {
  //       dispatch(setTypes(data));
  //     })
  //     .catch((error) => {
  //       console.error('Failed to fetch classes', error);
  //     });
  // }, [dispatch]);

  // Fetch prefix->namespace dictionary and print
  React.useEffect(() => {
    fetchNamespaces()
      .then((data) => {
        dispatch(setNamespaces(data));
      })
      .catch((error) => {
        console.error('Failed to fetch edge count dictionary', error);
      });
  }, [dispatch]);

  // Fetch edge count dictionary and print
  React.useEffect(() => {
    fetchEdgeCountDict()
      .then((data) => {
        dispatch(setEdgeCountDict(data));
      })
      .catch((error) => {
        console.error('Failed to fetch edge count dictionary', error);
      });
  }, [dispatch]);

  // // Fetch edge count dictionary and print
  // React.useEffect(() => {
  //   fetchFocusNodeExemplarDict()
  //     .then((data) => {
  //       dispatch(setFocusNodeExemplarDict(data));
  //     })
  //     .catch((error) => {
  //       console.error('Failed to fetch focus node exemplar dictionary', error);
  //     });
  // }, [dispatch]);

  // Fetch ontology
  React.useEffect(() => {
    fetchOntology()
      .then((data) => {
        dispatch(setRdfString(data));
      })
      .catch((error) => {
        console.error('Failed to fetch ontology', error);
      });
  }, [dispatch]);

  React.useEffect(() => {
    fetchViolationPathNodesDict()
      .then((data) => {
        dispatch(setViolationTypesMap(data.property_class_d));
        dispatch(setTypesViolationMap(data.class_property_d));
      })
      .catch((error) => {
        console.error('Failed to fetch violation path nodes dictionary', error);
      });
  }, [dispatch]);

  React.useEffect(() => {
    dispatch(fetchAndInitializeData());
  }, [dispatch]);

  return (
    <div className="container">
      <div className="Ontology-Title">Extended Ontology View</div>
      <div className="Extended-Ontology-View">
        <div style={{ display: cytoscapeLoading ? 'none' : 'block' }} className="cytoscape-container">
          <CytoscapeView rdfOntology={rdfOntology} onLoaded={() => setCytoscapeLoading(false)} />
        </div>
        {cytoscapeLoading && <BarLoader color={SPINNER_COLOR} loading />}
      </div>
      <div className="TabsContainer">
        <BottomTabs />
      </div>
    </div>
  );
}
