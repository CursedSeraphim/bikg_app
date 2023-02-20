import { AppShell, Header, Navbar } from '@mantine/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import { RdfState, setRdfData, selectRdfData } from './components/Store/RdfSlice';
import { loadCSV, selectNodes } from './components/Store/CSVSlice';

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

  React.useEffect(() => {
    fetchCSVFile('force_directed_node_positions.csv')
      .then((data) => {
        dispatch(loadCSV(data));
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
    <AppShell
      padding="md"
      // navbar={
      //   <Navbar width={{ base: 300 }} height="100%" p="xs">
      //     Navbar
      //   </Navbar>
      // }
      // header={
      //   <Header height={60} p="xs">
      //     Header
      //   </Header>
      // }
      styles={(theme) => ({
        main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
      })}
    >
      nodes: {JSON.stringify(nodes.length)}
    </AppShell>
  );
}
