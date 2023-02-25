import { AppShell, Header, Navbar } from '@mantine/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import { RdfState, setRdfData, selectRdfData } from './components/Store/RdfSlice';
import cytoscape from 'cytoscape';
import { loadNodes, selectNodes } from './components/Store/NodeSlice';
import { loadEdges, selectEdges } from './components/Store/EdgeSlice';
import { loadCytoData, selectCytoData } from './components/Store/CytoSlice';
import MyChart from './components/Vega/vegaspec';
import WebGLView from './components/WebGLView/ThreeCanvasScatter';
import './styles.css';

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

export function App() {
  const dispatch = useDispatch();
  // const nodes = useSelector(selectNodes);
  // const edges = useSelector(selectEdges);
  const cytoData = useSelector(selectCytoData);

  const [cy, setCy] = React.useState(null);

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

    fetchCyFromRDFFile('omics_model_cytoscape.json')
      .then((data) => {
        dispatch(loadCytoData(data));
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
      // cy.layout({ name: 'grid', rows: 1 }).run();
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
    // TODO fix the infinite loop of redux state updates
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
        <MyChart />
      </div>
      <div className="grid-item">View 4</div>
    </div>
  );
}
