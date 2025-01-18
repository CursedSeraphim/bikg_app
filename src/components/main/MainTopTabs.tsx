// src/components/main/MainTopTabs.tsx
import { Tabs, Tooltip } from '@mantine/core';
import React from 'react';
import { useSelector } from 'react-redux';
import CytoscapeView from '../Cytoscape/CytoscapeView';
import D3NodeLinkView from '../D3NodeLink/D3NodeLinkView';
import { selectRdfData } from '../Store/CombinedSlice';

export default function MainTopTabs() {
  const rdfOntology = useSelector(selectRdfData);
  const [cytoscapeLoading, setCytoscapeLoading] = React.useState(true);

  return (
    <Tabs defaultValue="Ontology Node-Link View" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tooltip
          multiline
          w={220}
          opacity={0.7}
          withArrow
          transitionProps={{ duration: 300 }}
          label="Displays the ontology, SHACL constraints, and violation data as a D3 node-link diagram."
        >
          <Tabs.Tab value="Ontology Node-Link View">Ontology Node-Link View</Tabs.Tab>
        </Tooltip>
        <Tabs.Tab value="old ontology view">old ontology view</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="Ontology Node-Link View" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <D3NodeLinkView rdfOntology={rdfOntology} />
      </Tabs.Panel>

      <Tabs.Panel value="old ontology view" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <CytoscapeView rdfOntology={rdfOntology} onLoaded={() => setCytoscapeLoading(false)} />
      </Tabs.Panel>
    </Tabs>
  );
}
