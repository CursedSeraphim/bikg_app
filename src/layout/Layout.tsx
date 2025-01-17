// src/layout/Layout.tsx
import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import MainView from '../components/main/MainView';
import Sidebar from '../components/sidebar/Sidebar';

export default function Layout() {
  return (
    <PanelGroup autoSaveId="horizontal-layout" direction="horizontal" style={{ width: '100%', height: '100%' }}>
      {/* Sidebar on the left */}
      <Panel defaultSize={30} minSize={15} maxSize={50} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Sidebar />
      </Panel>

      {/* Resize handle between sidebar and main view */}
      <PanelResizeHandle
        style={{
          background: 'lightgray',
          cursor: 'col-resize',
          width: '4px',
        }}
      />

      {/* Main view */}
      <Panel
        defaultSize={70}
        minSize={50}
        maxSize={85}
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <MainView />
      </Panel>
    </PanelGroup>
  );
}
