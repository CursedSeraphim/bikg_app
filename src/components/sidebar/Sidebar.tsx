// src/components/sidebar/Sidebar.tsx
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
          height: '4px',
        }}
      />

      {/* Sidebar bottom */}
      <Panel defaultSize={50} minSize={20} maxSize={80} style={{ display: 'flex', flexDirection: 'column' }}>
        <InteractiveScatterPlot data={scatterData} />
      </Panel>
    </PanelGroup>
  );
}
