// src/components/main/MainView.tsx
import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import MainBottomTabs from './MainBottomTabs';
import MainTopTabs from './MainTopTabs';

export default function MainView() {
  return (
    <PanelGroup autoSaveId="main-vertical" direction="vertical" style={{ width: '100%', height: '100%' }}>
      {/* Main top panel */}
      <Panel defaultSize={60} minSize={20} maxSize={80} style={{ display: 'flex', flexDirection: 'column' }}>
        <MainTopTabs />
      </Panel>

      {/* Resizer */}
      <PanelResizeHandle
        style={{
          background: 'lightgray',
          cursor: 'row-resize',
          height: '1px',
        }}
      />

      {/* Main bottom panel */}
      <Panel defaultSize={40} minSize={20} maxSize={80} style={{ display: 'flex', flexDirection: 'column' }}>
        <MainBottomTabs />
      </Panel>
    </PanelGroup>
  );
}
