// src/components/sidebar/SidebarTopTabs.tsx
import { Tabs } from '@mantine/core';
import React from 'react';
import SettingsTab from '../SettingsTab/SettingsTab';

export default function SidebarTopTabs() {
  return (
    <Tabs orientation="horizontal" defaultValue="tree" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tabs.Tab value="tree">Tree</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="tree" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        {/* Replace with your actual TreeView component */}
        <div>TreeView content goes here.</div>
      </Tabs.Panel>

      <Tabs.Panel value="settings" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <SettingsTab />
      </Tabs.Panel>
    </Tabs>
  );
}
