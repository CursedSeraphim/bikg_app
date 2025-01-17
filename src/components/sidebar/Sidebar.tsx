// src/components/sidebar/Sidebar.tsx
import { Tabs } from '@mantine/core';
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
            <Tabs.Tab value="embedding">Embedding</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="embedding" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
            <InteractiveScatterPlot data={scatterData} />
          </Tabs.Panel>
        </Tabs>
      </Panel>
    </PanelGroup>
  );
}
