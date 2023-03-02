import { AppShell, Header, Navbar } from '@mantine/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import { RdfState, setRdfData, selectRdfData } from './components/Store/RdfSlice';
import cytoscape from 'cytoscape';
import cytoscapeLasso from 'cytoscape-lasso';
import { TopLevelSpec } from 'vega-lite';
import { loadNodes, selectNodes } from './components/Store/NodeSlice';
import { loadEdges, selectEdges } from './components/Store/EdgeSlice';
import { loadCytoData, selectCytoData } from './components/Store/CytoSlice';
import Vega from './components/Vega/vegaspecprop';
import WebGLView from './components/WebGLView/ThreeCanvasScatter';
import './styles.css';

cytoscape.use(cytoscapeLasso);

async function fetchRdfFile(file_path) {
  const endpoint = `http://localhost:9000/rdf/file/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

async function fetchCSVFile(file_path) {
  const endpoint = `http://localhost:9000/csv/file/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

async function fetchCyFromRDFFile(file_path) {
  const endpoint = `http://localhost:9000/file/${file_path}`;
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

export function App() {
  const dispatch = useDispatch();
  // const nodes = useSelector(selectNodes);
  // const edges = useSelector(selectEdges);
  const cytoData = useSelector(selectCytoData);
  const [cy, setCy] = React.useState(null);
  const [spec, setSpec] = React.useState(null); // Add a new state for the Vega spec

  // const spec = {
  //   data: { url: 'https://vega.github.io/vega-lite/examples/data/cars.json' },
  //   layer: [
  //     {
  //       mark: 'bar',
  //       encoding: {
  //         x: { field: 'Horsepower', type: 'quantitative' },
  //         y: { field: 'Origin', type: 'nominal' },
  //         color: { value: 'green' },
  //       },
  //     },
  //     {
  //       mark: 'bar',
  //       encoding: {
  //         x: { field: 'Acceleration', type: 'quantitative' },
  //         y: { field: 'Origin', type: 'nominal' },
  //         color: { value: 'grey' },
  //       },
  //     },
  //   ],
  // } as TopLevelSpec;

  React.useEffect(() => {
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

    fetchCyFromRDFFile('ex51_cytoscape.json')
      .then((data) => {
        dispatch(loadCytoData(data));
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
        console.log('client running fetchJSONGivenNodes');
        console.log('received:', data);
        setSpec(JSON.parse(data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, []);

  React.useEffect(() => {
    const newCytoData = JSON.parse(JSON.stringify(cytoData));
    if (cy) {
      // Update the cytoData elements and layout
      cy.elements().remove();
      // create a deep copy of the cytoData
      cy.add(newCytoData);
      cy.fit();
      cy.lassoSelectionEnabled(true);
      // cy.layout({ name: 'grid', rows: 1 }).run();
      cy.on('boxend', (event) => {
        // get the selected nodes
        const selectedNodes = cy.nodes(':selected');

        // get the data of the selected nodes
        const selectedData = selectedNodes.map((node) => {
          return node.data();
        });

        // log the selected data to the console
        console.log(selectedData);
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
          name: 'grid',
          rows: 1,
        },
      });
      setCy(newCy);
    }
  }, [cytoData]);

  return (
    <div className="grid-container">
      <div className="grid-item">
        <div id="cy" />
      </div>
      <div className="grid-item">
        <div className="webgl-view">
          <WebGLView />
        </div>
      </div>
      <div className="grid-item">
        {/* if not spec just write "vega spec loading..." */}
        {!spec && <div>vega spec loading...</div>}
        {/* if spec do the following */}
        {spec && <Vega spec={spec} />}
      </div>
      <div className="grid-item">View 4</div>
    </div>
  );
}
