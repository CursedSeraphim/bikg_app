// api.tsx
export async function fetchCSVFile() {
  const endpoint = `http://localhost:9000/file/study`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

export async function fetchBarPlotDataGivenSelection(selectedNodes) {
  // Changed endpoint to use a more appropriate one for fetching bar plot data
  const endpoint = `http://localhost:9000/plot/bar`;

  // Send a POST request with selectedNodes as part of the body
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      selectedNodes,
    }),
  });

  // Here I'm assuming that the response from this endpoint will be JSON
  // If that's not the case, please adjust accordingly
  const data = await response.json();
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
