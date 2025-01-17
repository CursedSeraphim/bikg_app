// src/components/main/MainTopTabs.tsx
import { Tabs, Text } from '@mantine/core';
import React from 'react';

export default function MainTopTabs() {
  return (
    <Tabs defaultValue="overview" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="overview" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <Text>Overview content</Text>
      </Tabs.Panel>
    </Tabs>
  );
}
