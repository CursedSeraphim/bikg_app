// src/components/main/MainBottomTabs.tsx
import { Tabs, Text } from '@mantine/core';
import React from 'react';

export default function MainBottomTabs() {
  return (
    <Tabs defaultValue="lineup" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tabs.Tab value="lineup">Lineup</Tabs.Tab>
        <Tabs.Tab value="aiChat">AI Chat</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="lineup" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <Text>Lineup Content</Text>
      </Tabs.Panel>

      <Tabs.Panel value="aiChat" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <Text>AI Chat Content</Text>
      </Tabs.Panel>
    </Tabs>
  );
}
