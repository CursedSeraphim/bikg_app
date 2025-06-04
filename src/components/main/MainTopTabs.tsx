// src/components/main/MainTopTabs.tsx
import { Tabs, Tooltip } from '@mantine/core';
import React from 'react';
import { useSelector } from 'react-redux';
import CytoscapeView from '../Cytoscape/CytoscapeView';
import D3ForceGraph from '../D3NodeLink/D3ForceGraph';
import { selectRdfData } from '../Store/CombinedSlice';

export default function MainTopTabs() {
  const rdfOntology = useSelector(selectRdfData);
  const [cytoscapeLoading, setCytoscapeLoading] = React.useState(true);

  return (
    <Tabs defaultValue="D3.js NLD View" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tooltip
          multiline
          w={220}
          opacity={0.7}
          withArrow
          transitionProps={{ duration: 300 }}
          label="Displays the ontology, SHACL constraints, and violation data as a D3 node-link diagram."
        >
          <Tabs.Tab value="D3.js NLD View">D3.js NLD View</Tabs.Tab>
        </Tooltip>
        <Tooltip
          multiline
          w={220}
          opacity={0.7}
          withArrow
          transitionProps={{ duration: 300 }}
          label="Displays the ontology, SHACL constraints, and violation data as a Cytoscape node-link diagram."
        >
          <Tabs.Tab value="Cytoscape NLD View">Cytoscape NLD View</Tabs.Tab>
        </Tooltip>
      </Tabs.List>

      <Tabs.Panel value="D3.js NLD View" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <D3ForceGraph rdfOntology={rdfOntology} />
      </Tabs.Panel>

      <Tabs.Panel value="Cytoscape NLD View" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <CytoscapeView rdfOntology={rdfOntology} onLoaded={() => setCytoscapeLoading(false)} />
      </Tabs.Panel>
    </Tabs>
  );
}
