// App.tsx
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarLoader } from 'react-spinners';
import Tabs from './components/Tabs';
import {
  setRdfString,
  selectRdfData,
  setCsvData,
  selectCsvDataForPlotly,
  setViolations,
  setViolationTypesMap,
  setTypesViolationMap,
} from './components/Store/CombinedSlice';

// import BarPlotList from './components/FeatureDistributionView/BarPlotList';
// import FixedBarPlotList from './components/FeatureDistributionView/newFixedBarPlotList';
import CytoscapeView from './CytoscapeView';

import './styles.css';
import { fetchOntology, fetchCSVFile, fetchViolationList, fetchViolationPathNodesDict } from './api';
import InteractiveScatterPlot from './components/EmbeddingView/InteractiveScatterPlot';

export function App() {
  const dispatch = useDispatch();
  const plotlyData = useSelector(selectCsvDataForPlotly);
  const rdfOntology = useSelector(selectRdfData);
  const [cytoscapeLoading, setCytoscapeLoading] = React.useState(true);

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

  return (
    <div className="container">
      <div className="Ontology-Title">Extended Ontology View</div>
      <div className="Extended-Ontology-View">
        <div style={{ display: cytoscapeLoading ? 'none' : 'block' }} className="cytoscape-container">
          <CytoscapeView rdfOntology={rdfOntology} onLoaded={() => setCytoscapeLoading(false)} />
        </div>
        {cytoscapeLoading && <BarLoader color="steelblue" loading />}
      </div>
      {/* <div className="Embedding-Title">Embedding View</div> */}
      <div className="TabsContainer">
        {/* <InteractiveScatterPlot data={plotlyData} /> */}
        <Tabs />
      </div>
      {/* <LineUpView /> */}
    </div>
  );
}
