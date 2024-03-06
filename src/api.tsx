// api.tsx
export async function fetchCSVFile() {
  const endpoint = `/api/bikg/file/study`;
  const response = await fetch(endpoint);
  const data = await response.json();
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

export async function fetchEdgeCountDict() {
  const endpoint = `/api/bikg/file/edge_count_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchFocusNodeExemplarDict() {
  const endpoint = `/api/bikg/file/focus_node_exemplar_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchExemplarFocusNodeDict() {
  const endpoint = `/api/bikg/file/exemplar_focus_node_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchNamespaces() {
  const endpoint = `/api/bikg/namespaces`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchClasses() {
  const endpoint = `/api/bikg/owl:Class`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchSubClassOfTriples() {
  const endpoint = `/api/bikg/sub-class-of`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchOntologyTree() {
  const endpoint = `/api/bikg/get_ontology_tree`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchNodeFocusNodeCountDict() {
  const endpoint = `/api/bikg/get_node_count_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchViolationExemplarDict() {
  const endpoint = `/api/bikg/get_violation_exemplar_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchTypeViolationDict() {
  const endpoint = `/api/bikg/get_type_violation_dict`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchNodeLabelSet() {
  const endpoint = `/api/bikg/get_node_label_set`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

export async function fetchEdgeLabelSet() {
  const endpoint = `/api/bikg/get_edge_label_set`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}
