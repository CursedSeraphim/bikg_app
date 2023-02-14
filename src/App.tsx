import { AppShell, Header, Navbar } from '@mantine/core';
import * as React from 'react';

async function fetchRdfFile(file_path) {
  const endpoint = `http://localhost:9000/rdf/file/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

// fetch rdf file
fetchRdfFile('omics_model.ttl').then((data) => {
  console.log(data);
});

export function App() {
  const [rdfFileData, setRdfFileData] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchRdfFile('omics_model.ttl')
      .then((data) => {
        setRdfFileData(data);
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, []);

  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 300 }} height="100%" p="xs">
          Navbar
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          Header
        </Header>
      }
      styles={(theme) => ({
        main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
      })}
    >
      {rdfFileData ? <pre>{rdfFileData}</pre> : <p>Loading RDF file...</p>}
    </AppShell>
  );
}
