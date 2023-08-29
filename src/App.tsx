// App.tsx
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarLoader } from 'react-spinners';
import BottomTabs from './components/BottomTabs';
import {
  setRdfString,
  selectRdfData,
  setCsvData,
  setViolations,
  setViolationTypesMap,
  setTypesViolationMap,
  setEdgeCountDict,
  setFocusNodeExemplarDict,
  setExemplarFocusNodeDict,
  setNamespaces,
  setTypes,
  setSubClassOfTriples,
} from './components/Store/CombinedSlice';

import CytoscapeView from './components/Cytoscape/CytoscapeView';

import './styles.css';
import {
  fetchOntology,
  fetchCSVFile,
  fetchViolationList,
  fetchViolationPathNodesDict,
  fetchEdgeCountDict,
  fetchFocusNodeExemplarDict,
  fetchExemplarFocusNodeDict,
  fetchNamespaces,
  fetchClasses,
  fetchSubClassOfTriples,
} from './api';
import { SPINNER_COLOR } from './constants';

export function App() {
  const dispatch = useDispatch();
  const rdfOntology = useSelector(selectRdfData);
  const [cytoscapeLoading, setCytoscapeLoading] = React.useState(true);

  // Fetch sub-class-of triples and print
  React.useEffect(() => {
    fetchSubClassOfTriples()
      .then((data) => {
        console.log('fetchSubClassOfTriples', data);
        dispatch(setSubClassOfTriples(data));
      })
      .catch((error) => {
        console.error('Failed to fetch sub-class-of triples', error);
      });
  }, [dispatch]);

  // Fetch classes and print
  React.useEffect(() => {
    fetchClasses()
      .then((data) => {
        dispatch(setTypes(data));
      })
      .catch((error) => {
        console.error('Failed to fetch classes', error);
      });
  }, [dispatch]);

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
        // console.log('fetchEdgeCountDict', data);
        dispatch(setEdgeCountDict(data));
      })
      .catch((error) => {
        console.error('Failed to fetch edge count dictionary', error);
      });
  }, [dispatch]);

  // Fetch edge count dictionary and print
  React.useEffect(() => {
    fetchFocusNodeExemplarDict()
      .then((data) => {
        dispatch(setFocusNodeExemplarDict(data));
      })
      .catch((error) => {
        console.error('Failed to fetch focus node exemplar dictionary', error);
      });
  }, [dispatch]);

  // Fetch edge count dictionary and print
  React.useEffect(() => {
    fetchExemplarFocusNodeDict()
      .then((data) => {
        dispatch(setExemplarFocusNodeDict(data));
      })
      .catch((error) => {
        console.error('Failed to fetch exemplar focus node dictionary', error);
      });
  }, [dispatch]);

  // Fetch violation list
  React.useEffect(() => {
    fetchViolationList()
      .then((data) => {
        dispatch(setViolations(data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, [dispatch]);

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

  // Fetch study data
  React.useEffect(() => {
    fetchCSVFile()
      .then((data) => {
        const parsedData = JSON.parse(data);
        dispatch(setCsvData(parsedData.data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, [dispatch]);

  console.log('render app');

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
