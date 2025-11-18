// src/components/main/MainBottomTabs.tsx
import { Tabs, Tooltip } from '@mantine/core';
import React from 'react';
import LangchainComponent from '../LangChain/LangChainView';
import LineUpView from '../LineUp/LineUpView';

export default function MainBottomTabs() {
  return (
    <Tabs defaultValue="tabularView" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tooltip
          multiline
          w={220}
          opacity={0.7}
          withArrow
          transitionProps={{ duration: 300 }}
          label="A tabular view using LineUp which displays a union of instance and violation report data."
        >
          <Tabs.Tab value="tabularView">Tabular View</Tabs.Tab>
        </Tooltip>
        <Tooltip
          multiline
          w={220}
          opacity={0.7}
          withArrow
          transitionProps={{ duration: 300 }}
          label="An LLM chat interface that uses GPT and function calling to provide a conversational interface. It allows users to ask questions about the dashboard as well as control it using natural language."
        >
          <Tabs.Tab value="aiChat">LLM Chat</Tabs.Tab>
        </Tooltip>
      </Tabs.List>

      <Tabs.Panel value="tabularView" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <LineUpView />
      </Tabs.Panel>

      <Tabs.Panel value="aiChat" pt="xs" style={{ flex: 1, overflow: 'auto' }}>
        <LangchainComponent />
      </Tabs.Panel>
    </Tabs>
  );
}
