// src/components/sidebar/SidebarTopTabs.tsx
import { Tabs, Tooltip } from '@mantine/core';
import React from 'react';
import SettingsTab from '../SettingsTab/SettingsTab';
import KnowledgeGraphTree from '../Treeview/KnowledgeGraphTree';

export default function SidebarTopTabs() {
  return (
    <Tabs orientation="horizontal" defaultValue="tree" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tooltip
          multiline
          w={220}
          opacity={0.7}
          withArrow
          transitionProps={{ duration: 300 }}
          label="A tree view rendering the class hierarchy of the ontology."
        >
          <Tabs.Tab value="tree">Class Tree</Tabs.Tab>
        </Tooltip>
        <Tooltip multiline w={220} opacity={0.7} withArrow transitionProps={{ duration: 300 }} label="Access and modify application settings.">
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tooltip>
      </Tabs.List>

      <Tabs.Panel value="tree" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <KnowledgeGraphTree />
      </Tabs.Panel>

      <Tabs.Panel value="settings" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <SettingsTab />
      </Tabs.Panel>
    </Tabs>
  );
}
