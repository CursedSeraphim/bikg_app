// src/components/main/MainTopTabs.tsx
import { Tabs } from '@mantine/core';
import React from 'react';
import { useSelector } from 'react-redux';
import CytoscapeView from '../Cytoscape/CytoscapeView';
import { selectRdfData } from '../Store/CombinedSlice';

export default function MainTopTabs() {
  const rdfOntology = useSelector(selectRdfData);
  const [cytoscapeLoading, setCytoscapeLoading] = React.useState(true);

  return (
    <Tabs defaultValue="Ontology Node-Link View" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tabs.Tab value="Ontology Node-Link View">Ontology Node-Link View</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="Ontology Node-Link View" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <CytoscapeView rdfOntology={rdfOntology} onLoaded={() => setCytoscapeLoading(false)} />
      </Tabs.Panel>
    </Tabs>
  );
}
