export async function fetchCSVFile(file_path) {
  const endpoint = `http://localhost:9000/file/csv/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}
export async function fetchJSONFile(file_path) {
  const endpoint = `http://localhost:9000/file/json/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}
export async function fetchJSONGivenNodes(file_path, nodeList) {
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
export async function fetchOntology() {
  const endpoint = `http://localhost:9000/file/ontology`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}
