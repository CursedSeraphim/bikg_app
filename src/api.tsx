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

export async function fetchOntology() {
  const endpoint = `http://localhost:9000/file/ontology`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}
