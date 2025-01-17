// src/components/sidebar/Sidebar.tsx
import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import ScatterPlot from '../DummyScatterPlot/DummyScatterPlot';
import SidebarTopTabs from './SidebarTopTabs';

export default function Sidebar() {
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

      {/* Sidebar bottom (ScatterPlot) */}
      <Panel defaultSize={50} minSize={20} maxSize={80} style={{ display: 'flex', flexDirection: 'column' }}>
        <ScatterPlot />
      </Panel>
    </PanelGroup>
  );
}
