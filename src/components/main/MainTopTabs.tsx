// src/components/main/MainTopTabs.tsx
import { Tabs, Tooltip } from '@mantine/core';
import React from 'react';
import { useSelector } from 'react-redux';
import D3ForceGraph from '../D3NodeLink/D3ForceGraph';
import { selectRdfData } from '../Store/CombinedSlice';

export default function MainTopTabs() {
  const rdfOntology = useSelector(selectRdfData);

  return (
    <Tabs defaultValue="Node-Link Diagram" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tooltip
          multiline
          w={220}
          opacity={0.7}
          withArrow
          transitionProps={{ duration: 300 }}
          label="Displays the ontology, SHACL constraints, and violation data as a node-link diagram."
        >
          <Tabs.Tab value="Node-Link Diagram">Node-Link Diagram</Tabs.Tab>
        </Tooltip>
      </Tabs.List>

      <Tabs.Panel value="Node-Link Diagram" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <D3ForceGraph rdfOntology={rdfOntology} />
      </Tabs.Panel>
    </Tabs>
  );
}
