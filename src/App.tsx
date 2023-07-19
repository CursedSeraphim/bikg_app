// App.tsx
import * as React from 'react';
import NewWindow from 'react-new-window';
import { useDispatch, useSelector } from 'react-redux';
import { BarLoader } from 'react-spinners';
import * as LineUpJS from 'lineupjs';
import {
  setRdfString,
  selectRdfData,
  setCsvData,
  selectCsvDataForPlotly,
  selectCsvData,
  setViolations,
  setViolationTypesMap,
  setTypesViolationMap,
} from './components/Store/CombinedSlice';
import InteractiveScatterPlot from './components/EmbeddingView/InteractiveScatterPlot';
import BarPlotList from './components/FeatureDistributionView/BarPlotList';
import FixedBarPlotList from './components/FeatureDistributionView/newFixedBarPlotList';
import CytoscapeView from './CytoscapeView';

import './styles.css';
import { fetchOntology, fetchCSVFile, fetchViolationList, fetchViolationPathNodesDict } from './api';

export function App() {
  const dispatch = useDispatch();
  const plotlyData = useSelector(selectCsvDataForPlotly);
  const rdfOntology = useSelector(selectRdfData);
  const csvData = useSelector(selectCsvData);
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

  const lineupRef = React.useRef<any>();
  React.useEffect(() => {
    if (lineupRef.current) {
      console.log('csvData', csvData);
      const lineup = LineUpJS.asLineUp(lineupRef.current, csvData);
    }
  }, [lineupRef, csvData]);

  return (
    <div className="container">
      <div className="Extended-Ontology-View">
        Extended Ontology View
        <div style={{ display: cytoscapeLoading ? 'none' : 'block' }} className="cytoscape-container">
          <CytoscapeView rdfOntology={rdfOntology} onLoaded={() => setCytoscapeLoading(false)} />
        </div>
        {cytoscapeLoading && <BarLoader color="steelblue" loading />}
      </div>
      <div className="Embedding-View">
        Embedding View
        <InteractiveScatterPlot data={plotlyData} />
      </div>
      <div className="Feature-Distribution-View">
        Feature Distribution View
        <BarPlotList />
      </div>
      <div className="Fixed-Feature-Distribution-View">
        Fixed Feature Distribution View
        <FixedBarPlotList />
      </div>
      <div className="lineup-window">
        <NewWindow>
          <link href="https://unpkg.com/lineupjsx/build/LineUpJSx.css" rel="stylesheet" />
          <script src="https://unpkg.com/lineupjsx/build/LineUpJSx.js" />
          <div className="LineUpParent">
            <div
              style={{
                clear: 'both',
                position: 'absolute',
                top: '1px',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 0,
              }}
              ref={lineupRef}
              id="lineup_view"
            />
          </div>
        </NewWindow>
      </div>
    </div>
  );
}
