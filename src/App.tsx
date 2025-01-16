// App.tsx
import { AppShell, MantineProvider, Tabs, Text, Title } from '@mantine/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { VisynHeader } from 'visyn_core/app';
import { BILogo } from './components/BILogo';
import InteractiveScatterPlot from './components/EmbeddingView/InteractiveScatterPlot';
import LangchainComponent from './components/LangChain/LangChainView';
import SettingsTab from './components/SettingsTab/SettingsTab';
import {
  selectCsvDataForPlotly,
  selectRdfData,
  setCumulativeNumberViolationsPerNode,
  setEdgeCountDict,
  setEdgeLabels,
  setNamespaces,
  setNodeLabels,
  setOntologyTree,
  setRdfString,
  setSubClassOfTriples,
  setTypesViolationMap,
  setViolationTypesMap,
} from './components/Store/CombinedSlice';
import Treeview from './components/Treeview/Treeview';

import { AppDispatch } from './components/Store/Store';

import {
  fetchEdgeCountDict,
  fetchEdgeLabelSet,
  fetchNamespaces,
  fetchNodeFocusNodeCountDict,
  fetchNodeLabelSet,
  fetchOntology,
  fetchOntologyTree,
  fetchSubClassOfTriples,
  fetchViolationPathNodesDict,
} from './api';
import { fetchAndInitializeData } from './components/Store/thunks';
import './styles.css';

export function App() {
  const dispatch: AppDispatch = useDispatch();
  const rdfOntology = useSelector(selectRdfData);
  const [cytoscapeLoading, setCytoscapeLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('bottomTab1'); // Track active tab
  const plotlyData = useSelector(selectCsvDataForPlotly);
  const MemoizedScatterPlot = React.memo(InteractiveScatterPlot);
  const MemoizedLangChain = React.memo(LangchainComponent);
  const MemoizedTreeView = React.memo(Treeview);
  const MemoizedSettingsTab = React.memo(SettingsTab);

  // Fetch sub-class-of triples and print
  React.useEffect(() => {
    fetchSubClassOfTriples()
      .then((data) => {
        dispatch(setSubClassOfTriples(data));
      })
      .catch((error) => {
        console.error('Failed to fetch sub-class-of triples', error);
      });
  }, [dispatch]);

  // Retrieve and display the ontology tree
  React.useEffect(() => {
    fetchOntologyTree()
      .then((data) => {
        dispatch(setOntologyTree(data));
      })
      .catch((fetchError) => {
        console.error('Error retrieving ontology tree', fetchError);
      });
  }, [dispatch]);

  React.useEffect(() => {
    fetchNodeLabelSet()
      .then((data) => {
        dispatch(setNodeLabels(data));
      })
      .catch((fetchError) => {
        console.error('Error retrieving node label set', fetchError);
      });
  }, [dispatch]);

  React.useEffect(() => {
    fetchEdgeLabelSet()
      .then((data) => {
        dispatch(setEdgeLabels(data));
      })
      .catch((fetchError) => {
        console.error('Error retrieving edge label set', fetchError);
      });
  }, [dispatch]);

  // Fetch node count dict
  React.useEffect(() => {
    fetchNodeFocusNodeCountDict()
      .then((nodeFocusNodeCountDict) => {
        const updatedObject = Object.keys(nodeFocusNodeCountDict).reduce((acc, key) => {
          const { count } = nodeFocusNodeCountDict[key];
          const cumulativeCount = nodeFocusNodeCountDict[key].cumulative_count;
          // eslint-disable-next-line no-param-reassign
          acc[key] = {
            cumulativeViolations: cumulativeCount,
            cumulativeSelected: 0,
            violations: count,
          };
          return acc;
        }, {});
        dispatch(setCumulativeNumberViolationsPerNode(updatedObject));
      })
      .catch((error) => {
        console.error('Failed to fetch edge count dictionary', error);
      });
  });

  // Fetch prefix->namespace dictionary and print
  React.useEffect(() => {
    fetchNamespaces()
      .then((data) => {
        dispatch(setNamespaces(data));
      })
      .catch((error) => {
        console.error('Failed to fetch edge count dictionary', error);
      });
  }, [dispatch]);

  // Fetch edge count dictionary and print
  React.useEffect(() => {
    fetchEdgeCountDict()
      .then((data) => {
        dispatch(setEdgeCountDict(data));
      })
      .catch((error) => {
        console.error('Failed to fetch edge count dictionary', error);
      });
  }, [dispatch]);

  // Fetch ontology
  React.useEffect(() => {
    fetchOntology()
      .then((data) => {
        dispatch(setRdfString(data));
      })
      .catch((error) => {
        console.error('Failed to fetch ontology', error);
      });
  }, [dispatch]);

  React.useEffect(() => {
    fetchViolationPathNodesDict()
      .then((data) => {
        dispatch(setViolationTypesMap(data.property_class_d));
        dispatch(setTypesViolationMap(data.class_property_d));
      })
      .catch((error) => {
        console.error('Failed to fetch violation path nodes dictionary', error);
      });
  }, [dispatch]);

  React.useEffect(() => {
    dispatch(fetchAndInitializeData());
  }, [dispatch]);

  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={{ colorScheme: 'light' }}>
      <AppShell
        padding="md"
        header={
          <VisynHeader
            components={{
              title: (
                <Title order={3} weight={100} color="white">
                  Boehringer Ingelheim Knowledge Graphs
                </Title>
              ),
              logo: <BILogo color="white" />,
            }}
          />
        }
      >
        <PanelGroup autoSaveId="sideResize" direction="horizontal" style={{ width: '100%', height: '100%' }}>
          <Panel defaultSize={70} style={{ padding: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Tabs orientation="horizontal" defaultValue="tab1" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Tabs.List>
                <Tabs.Tab value="tab1">Tree</Tabs.Tab>
                <Tabs.Tab value="tab2">Settings</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="tab1" pt="xs" style={{ flex: 1, overflow: 'hidden' }}>
                text
              </Tabs.Panel>
              <Tabs.Panel value="tab2" pt="xs" style={{ flex: 1, overflow: 'hidden' }}>
                text
              </Tabs.Panel>
            </Tabs>
          </Panel>
          <PanelResizeHandle style={{ background: 'black', cursor: 'row-resize' }} />
          <Panel defaultSize={70} style={{ padding: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <PanelGroup autoSaveId="mainResize" direction="vertical" style={{ height: '100%' }}>
              <Panel defaultSize={70} style={{ padding: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Tabs defaultValue="mainTab1" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Tabs.List>
                    <Tabs.Tab value="mainTab1">Overview</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="mainTab1" pt="xs" style={{ flex: 1, overflow: 'hidden' }}>
                    text
                  </Tabs.Panel>

                  <Tabs.Panel value="mainTab2" pt="xs" style={{ flex: 1, overflow: 'hidden' }}>
                    <Text>Main Reports Content</Text>
                  </Tabs.Panel>
                </Tabs>
              </Panel>

              <PanelResizeHandle style={{ background: 'black', cursor: 'row-resize' }} />

              <Panel style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column' }}>
                <Tabs
                  defaultValue="bottomTab1"
                  value={activeTab} // Controlled tab value
                  onTabChange={(value) => setActiveTab(value)} // Update activeTab on change
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <Tabs.List>
                    <Tabs.Tab value="bottomTab1">Embedding View</Tabs.Tab>
                    <Tabs.Tab value="bottomTab2">Lineup</Tabs.Tab>
                    <Tabs.Tab value="bottomTab3">AI Chat</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="bottomTab1" pt="xs" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {activeTab === 'bottomTab1' && (
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <MemoizedScatterPlot data={plotlyData} />
                      </div>
                    )}
                  </Tabs.Panel>

                  <Tabs.Panel value="bottomTab2" pt="xs" style={{ flex: 1, overflow: 'hidden' }}>
                    <Text>Lineup Content</Text>
                  </Tabs.Panel>

                  <Tabs.Panel value="bottomTab3" pt="xs" style={{ flex: 1, overflow: 'hidden' }}>
                    <Text>AI Chat Content</Text>
                  </Tabs.Panel>
                </Tabs>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </AppShell>
    </MantineProvider>
  );
}
