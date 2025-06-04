// src/components/sidebar/Sidebar.tsx
import { Tabs, Tooltip } from '@mantine/core';
import React from 'react';
import { useSelector } from 'react-redux';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import InteractiveScatterPlot from '../EmbeddingView/InteractiveScatterPlot';
import { selectCsvDataForPlotly } from '../Store/CombinedSlice';
import SidebarTopTabs from './SidebarTopTabs';

export default function Sidebar() {
  // Pull scatterplot data from the store
  const scatterData = useSelector(selectCsvDataForPlotly);

  return (
    <PanelGroup autoSaveId="sidebar-vertical" direction="vertical" style={{ width: '100%', height: '100%' }}>
      {/* Sidebar top */}
      <Panel defaultSize={50} minSize={20} maxSize={80} style={{ display: 'flex', flexDirection: 'column' }}>
        <SidebarTopTabs />
      </Panel>

      {/* Resizer between top and bottom */}
      <PanelResizeHandle
        style={{
          background: 'lightgray',
          cursor: 'row-resize',
          height: '1px',
        }}
      />

      {/* Sidebar bottom */}
      <Panel defaultSize={50} minSize={20} maxSize={80} style={{ display: 'flex', flexDirection: 'column' }}>
        <Tabs defaultValue="embedding" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Tabs.List>
            <Tooltip
              multiline
              w={220}
              opacity={0.7}
              withArrow
              transitionProps={{ duration: 300 }}
              label="Displays an embedding of focus nodes. Each point is one focus node. Their 2-D proximity is driven by how similar the focus nodes are."
            >
              <Tabs.Tab value="embedding">Embedding</Tabs.Tab>
            </Tooltip>
          </Tabs.List>

          <Tabs.Panel value="embedding" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
            <InteractiveScatterPlot data={scatterData} />
          </Tabs.Panel>
        </Tabs>
      </Panel>
    </PanelGroup>
  );
}
