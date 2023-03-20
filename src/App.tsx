import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import { RdfState, setRdfString, selectRdfData, selectSubClassOrObjectPropertyTuples, selectCytoData } from './components/Store/RdfSlice';
import { setCsvData, selectCsvDataForPlotly } from './components/Store/CsvSlice';
import { loadNodes } from './components/Store/NodeSlice';
import { loadEdges } from './components/Store/EdgeSlice';
import { loadOntology, selectOntology } from './components/Store/OntologySlice';
import { loadCytoData } from './components/Store/CytoSlice';
import InteractiveScatterPlot from './components/EmbeddingView/InteractiveScatterPlot';
import BarPlotSample from './components/FeatureDistributionView/BarPlotSample';
import BarPlotList from './components/FeatureDistributionView/BarPlotList';
import FixedBarPlotList from './components/FeatureDistributionView/FixedBarPlotList';

import Vega from './components/Vega/vegaspecprop';
import './styles.css';

const sampleData = [
  { x: 1, y: 2, _id: '1' },
  { x: 2, y: 3, _id: '2' },
  { x: 3, y: 1, _id: '3' },
  // More data points...
];

cytoscape.use(cytoscapeLasso);
cytoscape.use(coseBilkent);

async function fetchCSVFile(file_path) {
  const endpoint = `http://localhost:9000/file/csv/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

async function fetchJSONFile(file_path) {
  const endpoint = `http://localhost:9000/file/json/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

async function fetchJSONGivenNodes(file_path, nodeList) {
  const endpoint = `http://localhost:9000/VegaRequest/${file_path}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nodes: nodeList }),
  });
  const data = await response.text();
  return data;
}

async function fetchOntologyOld() {
  const endpoint = `http://localhost:9000/file/ontologyold`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

async function fetchOntology() {
  const endpoint = `http://localhost:9000/file/ontology`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

export function App() {
  const dispatch = useDispatch();
  const ontology = useSelector(selectOntology);
  const plotlyData = useSelector(selectCsvDataForPlotly);
  // const cytoData = useSelector(selectCytoData);
  const rdfOntology = useSelector(selectRdfData);
  const [cytoData, setCytoData] = React.useState(null);
  const [cy, setCy] = React.useState(null);
  const [spec, setSpec] = React.useState(null); // Add a new state for the Vega spec

  // TODO check whether it is better to split this into multiple useEffects with their own dependencies
  React.useEffect(() => {
    fetchOntology()
      .then((data) => {
        dispatch(setRdfString(data));
        // wrap rdfOntology such that it is of type RdfState
        const rdfOntologyState: RdfState = {
          rdfString: data,
        };
      })
      .catch((error) => {
        console.error('Failed to fetch ontology', error);
      });

    if (rdfOntology) {
      selectCytoData({ rdf: { rdfString: rdfOntology } })
        .then((data) => {
          setCytoData(data);
          console.log('cytoData has been set:', cytoData);
        })
        .catch((error) => {
          console.error('Failed to generate Cytoscape data:', error);
        });
    }

    fetchOntologyOld()
      .then((data) => {
        dispatch(loadOntology(data));
      })
      .catch((error) => {
        console.error('Failed to fetch ontology', error);
      });

    fetchCSVFile('force_directed_node_positions.csv')
      .then((data) => {
        dispatch(loadNodes(data));
      })
      .catch((error) => {
        console.error('Failed to fetch CSV file', error);
      });

    fetchCSVFile('force_directed_edge_vectors.csv')
      .then((data) => {
        dispatch(loadEdges(data));
      })
      .catch((error) => {
        console.error('Failed to fetch CSV file', error);
      });

    fetchJSONFile('ex51_cytoscape.json')
      .then((data) => {
        dispatch(loadCytoData(data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });

    fetchCSVFile('ex51_violations_metadata.csv')
      .then((data) => {
        const parsedData = JSON.parse(data);
        dispatch(setCsvData(parsedData.data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });

    fetchJSONGivenNodes('ex51_violations_metadata.csv', [
      'http://data.boehringer.com/uuid/Donor/dc6bc9d3-b32e-4c64-abb9-4c59f90a3ff5',
      'http://data.boehringer.com/uuid/TranscriptOmicsSample/sample-EX51-EX51_1630',
      'http://data.boehringer.com/uuid/PrimaryCellSpecimen/b82418e0-6a8d-45aa-b209-75805f860706',
    ])
      .then((data) => {
        setSpec(JSON.parse(data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, []);

  React.useEffect(() => {
    selectCytoData({ rdf: { rdfString: rdfOntology } })
      .then((data) => {
        const newCytoData = data;
        if (cy) {
          // Update the cytoData elements and layout
          cy.elements().remove();
          // create a deep copy of the cytoData
          cy.add(newCytoData);
          cy.lassoSelectionEnabled(true);
          cy.fit();
          cy.layout({ name: 'cose-bilkent', idealEdgeLength: 100, nodeDimensionsIncludeLabels: true }).run();
          cy.on('boxend', (event) => {
            // get the selected nodes
            const selectedNodes = cy.nodes(':selected');

            // get the data of the selected nodes
            const selectedData = selectedNodes.map((node) => {
              return node.data();
            });

            // selectedData is of the shape [{'id': 'node1', 'label': 'Node 1'}, ...]
            // create a node list of ids
            const nodeList = selectedData.map((node) => {
              return node.id;
            });

            // fetch the JSON for the Vega spec
            fetchJSONGivenNodes('ex51_violations_metadata.csv', nodeList)
              .then((data) => {
                setSpec(JSON.parse(data));
              })
              .catch((error) => {
                console.error('Failed to fetch RDF file', error);
              });

            // log the selected data to the console
            // console.log(selectedData);
          });
        } else {
          const newCy = cytoscape({
            container: document.getElementById('cy'), // container to render in

            elements: newCytoData,

            style: [
              // the stylesheet for the graph
              {
                selector: 'node',
                style: {
                  'background-color': '#666',
                  label: 'data(id)',
                },
              },

              {
                selector: 'edge',
                style: {
                  width: 3,
                  'line-color': '#ccc',
                  'target-arrow-color': '#ccc',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                },
              },
            ],

            layout: {
              name: 'cose-bilkent',
              idealEdgeLength: 100,
              nodeDimensionsIncludeLabels: true,
            },
          });
          setCy(newCy);
        }
      })
      .catch((error) => {
        console.error('Failed to generate Cytoscape data:', error);
      });
  }, [rdfOntology]);

  const handleDataSelected = (selectedData) => {
    console.log('Data selected in App component');
  };

  return (
    <div className="grid-container">
      <div className="grid-item">
        <div id="cy" />
        {/* Expanded Ontology View */}
      </div>
      <div className="grid-item">
        {/* if not spec just write "vega spec loading..." */}
        {/* {!spec && <div>vega spec loading...</div>} */}
        {/* if spec do the following */}
        {/* {spec && <Vega spec={spec} />} */}
        {/* <BarPlotSample feature="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" />
        <BarPlotSample feature="http://data.boehringer.com/ontology/omics/hasCellType" /> */}
        <BarPlotList />
      </div>
      <div className="grid-item">
        {/* Embedding View */}
        <InteractiveScatterPlot data={plotlyData} onDataSelected={handleDataSelected} />
        {/* <div className="webgl-view">
          <WebGLView />
        </div> */}
      </div>
      <div className="grid-item">
        <FixedBarPlotList />
      </div>
    </div>
  );
}
