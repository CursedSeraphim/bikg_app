import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setRdfString, selectRdfData } from './components/Store/RdfSlice';
import { setCsvData, selectCsvDataForPlotly } from './components/Store/CsvSlice';
import { loadNodes } from './components/Store/NodeSlice';
import { loadEdges } from './components/Store/EdgeSlice';
import { loadCytoData } from './components/Store/CytoSlice';
import InteractiveScatterPlot from './components/EmbeddingView/InteractiveScatterPlot';
import BarPlotList from './components/FeatureDistributionView/BarPlotList';
import FixedBarPlotList from './components/FeatureDistributionView/FixedBarPlotList';
import CytoscapeView from './CytoscapeView';

import './styles.css';
import { fetchOntology, fetchCSVFile, fetchJSONFile } from './api';

export function App() {
  const dispatch = useDispatch();
  const plotlyData = useSelector(selectCsvDataForPlotly);
  const rdfOntology = useSelector(selectRdfData);

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

  // Fetch force directed node positions
  React.useEffect(() => {
    fetchCSVFile('force_directed_node_positions.csv')
      .then((data) => {
        dispatch(loadNodes(data));
      })
      .catch((error) => {
        console.error('Failed to fetch CSV file', error);
      });
  }, [dispatch]);

  // Fetch force directed edge vectors
  React.useEffect(() => {
    fetchCSVFile('force_directed_edge_vectors.csv')
      .then((data) => {
        dispatch(loadEdges(data));
      })
      .catch((error) => {
        console.error('Failed to fetch CSV file', error);
      });
  }, [dispatch]);

  // Fetch ex51 study data transformed to Cytoscape JSON
  React.useEffect(() => {
    fetchJSONFile('ex51_cytoscape.json')
      .then((data) => {
        dispatch(loadCytoData(data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, [dispatch]);

  // Fetch ex51 tabular vfiolations data for Plotly
  React.useEffect(() => {
    fetchCSVFile('ex51_violations_metadata.csv')
      .then((data) => {
        const parsedData = JSON.parse(data);
        dispatch(setCsvData(parsedData.data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, [dispatch]);

  const handleDataSelected = (selectedData) => {
    console.log('Data selected in App component', selectedData);
  };

  return (
    <div className="container">
      <div className="Extended-Ontology-View">
        Extended Ontology View
        <CytoscapeView rdfOntology={rdfOntology} />
      </div>
      <div className="Feature-Distribution-View">
        Embedding View
        <InteractiveScatterPlot data={plotlyData} onDataSelected={handleDataSelected} />
      </div>
      <div className="Embedding-View">
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
