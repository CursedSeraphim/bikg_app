// api.tsx
export async function fetchCSVFile() {
  const endpoint = `/api/bikg/file/study`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

export async function fetchViolationPathNodesDict() {
  const endpoint = `/api/bikg/violation_path_nodes_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchViolationValueCountsGivenSelection(selectedNodes) {
  // Changed endpoint to use a more appropriate one for fetching bar plot data
  const endpoint = `/api/bikg/plot/bar/violations`;

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

  const data = await response.json();
  return data;
}

export async function fetchBarPlotDataGivenSelection(selectedNodes) {
  // Changed endpoint to use a more appropriate one for fetching bar plot data
  const endpoint = `/api/bikg/plot/bar`;

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

  const data = await response.json();
  return data;
}

export async function fetchSelectedNodesAndValueCountsGivenFeatureCategorySelection(feature, categories) {
  // Changed endpoint to use a more appropriate one for fetching bar plot data
  const endpoint = `/api/bikg/FeatureCategorySelection`;

  // Send a POST request with selectedNodes as part of the body
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      feature,
      categories,
    }),
  });

  const data = await response.json();
  return data;
}

export async function fetchSelectedNodesAndValueCountsGivenViolationSelection(feature, categories) {
  // Changed endpoint to use a more appropriate one for fetching bar plot data
  const endpoint = `/api/bikg/ViolationSelection`;

  // Send a POST request with selectedNodes as part of the body
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      feature,
      categories,
    }),
  });

  const data = await response.json();
  return data;
}

export async function fetchJSONFile(file_path) {
  const endpoint = `/api/bikg/file/json/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

export async function fetchViolationList() {
  const endpoint = `/api/bikg/violation_list`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

export async function fetchOntology() {
  const endpoint = `/api/bikg/file/ontology`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}
