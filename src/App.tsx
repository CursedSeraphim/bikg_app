import { AppShell, Header, Navbar } from '@mantine/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RdfState, setRdfData, selectRdfData } from './components/Store/RdfSlice';

async function fetchRdfFile(file_path) {
  const endpoint = `http://localhost:9000/rdf/file/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

// // fetch rdf file
// fetchRdfFile('omics_model.ttl').then((data) => {
//   console.log(data);
// });

export function App() {
  const dispatch = useDispatch();
  const rdfFileData = useSelector(selectRdfData);

  // https://stackoverflow.com/questions/53070970/infinite-loop-in-useeffect
  // export default function Book({id}) { 
  //   const [book, bookSet] = useState(false) 
  
  //   const loadBookFromServer = useCallback(async () => {
  //     let response = await fetch('api/book/' + id)
  //     response  = await response.json() 
  //     bookSet(response)
  //   }, [id]) // every time id changed, new book will be loaded
  
  //   useEffect(() => {
  //     loadBookFromServer()
  //   }, [loadBookFromServer]) // useEffect will run once and when id changes
  
  
  //   if (!book) return false //first render, when useEffect did't triggered yet we will return false
  
  //   return <div>{JSON.stringify(book)}</div>  
  // }

  React.useEffect(() => {
    fetchRdfFile('omics_model.ttl')
      .then((data) => {
        dispatch(setRdfData(data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, []); // problem here, if I remove dependency array, it will cause infinite loop
  // but if I add dependancy array, it will only fetch once

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
      rdfFileData: {rdfFileData}
    </AppShell>
  );
}
