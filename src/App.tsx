import { AppShell, Header, Navbar } from '@mantine/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import { RdfState, setRdfData, selectRdfData } from './components/Store/RdfSlice';
import { loadNodes, selectNodes } from './components/Store/CSVSlice';
import { loadEdges, selectEdges } from './components/Store/CSVTrajectorySlice';
import ThreeCanvas from './components/WebGLView/ThreeCanvasScatter';

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

export function App() {
  const dispatch = useDispatch();
  // const rdfFileData = useSelector(selectRdfData);
  const nodes = useSelector(selectNodes);
  const edges = useSelector(selectEdges);

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
  }, []);

  // React.useEffect(() => {
  //   fetchRdfFile('omics_model.ttl')
  //     .then((data) => {
  //       dispatch(setRdfData(data));
  //     })
  //     .catch((error) => {
  //       console.error('Failed to fetch RDF file', error);
  //     });
  // }, []);

  return (
    <div>
      nodes: {JSON.stringify(nodes.length)}
      {/* edges: {JSON.stringify(edges.length)} */}
      <ThreeCanvas />
    </div>
  );
}
