// api.tsx
export async function fetchCSVFile() {
  const endpoint = `http://localhost:9000/file/study`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

export async function fetchViolationPathNodesDict() {
  const endpoint = `http://localhost:9000/violation_path_nodes_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchViolationValueCountsGivenSelection(selectedNodes) {
  // Changed endpoint to use a more appropriate one for fetching bar plot data
  const endpoint = `http://localhost:9000/plot/bar/violations`;

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

  const data = await response.json();
  return data;
}

export async function fetchSelectedNodesAndValueCountsGivenFeatureCategorySelection(feature, categories) {
  // Changed endpoint to use a more appropriate one for fetching bar plot data
  const endpoint = `http://localhost:9000/FeatureCategorySelection`;

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
  const endpoint = `http://localhost:9000/ViolationSelection`;

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
  const endpoint = `http://localhost:9000/file/json/${file_path}`;
  const response = await fetch(endpoint);
  const data = await response.text();
  return data;
}

export async function fetchViolationList() {
  const endpoint = `http://localhost:9000/violation_list`;
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

export async function fetchEdgeCountDict() {
  const endpoint = `http://localhost:9000/file/edge_count_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchFocusNodeExemplarDict() {
  const endpoint = `http://localhost:9000/file/focus_node_exemplar_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchExemplarFocusNodeDict() {
  const endpoint = `http://localhost:9000/file/exemplar_focus_node_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchNamespaces() {
  const endpoint = `http://localhost:9000/namespaces`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchClasses() {
  const endpoint = `http://localhost:9000/owl:Class`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchSubClassOfTriples() {
  const endpoint = `http://localhost:9000/sub-class-of`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchOntologyTree() {
  const endpoint = `http://localhost:9000/get_ontology_tree`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchNodeCountDict() {
  const endpoint = `http://localhost:9000/get_node_count_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchViolationExemplarDict() {
  const endpoint = `http://localhost:9000/get_violation_exemplar_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchTypeViolationDict() {
  const endpoint = `http://localhost:9000/get_type_violation_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}
