// App.tsx
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setRdfString,
  selectRdfData,
  setCsvData,
  selectCsvDataForPlotly,
  setViolations,
  setViolationTypesMap,
  setTypesViolationMap,
} from './components/Store/CombinedSlice';
import InteractiveScatterPlot from './components/EmbeddingView/InteractiveScatterPlot';
import BarPlotList from './components/FeatureDistributionView/BarPlotList';
import FixedBarPlotList from './components/FeatureDistributionView/newFixedBarPlotList';
import CytoscapeView from './CytoscapeView';

import './styles.css';
import { fetchOntology, fetchCSVFile, fetchJSONFile, fetchViolationList, fetchViolationPathNodesDict } from './api';

export function App() {
  const dispatch = useDispatch();
  const plotlyData = useSelector(selectCsvDataForPlotly);
  const rdfOntology = useSelector(selectRdfData);

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

  const handleDataSelected = (selectedData) => {
    // console.log('Data selected in App component', selectedData);
  };

  return (
    <div className="container">
      <div className="Extended-Ontology-View">
        Extended Ontology View
        <CytoscapeView rdfOntology={rdfOntology} />
      </div>
      <div className="Embedding-View">
        Embedding View
        <InteractiveScatterPlot data={plotlyData} onDataSelected={handleDataSelected} />
      </div>
      <div className="Feature-Distribution-View">
        Feature Distribution View
        <BarPlotList />
      </div>
      <div className="Fixed-Feature-Distribution-View">
        Fixed Feature Distribution View
        <FixedBarPlotList />
      </div>
    </div>
  );
}
