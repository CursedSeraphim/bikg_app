import { AppShell, Header, Navbar } from '@mantine/core';
import * as React from 'react';

export function App() {
  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 300 }} height="100%" p="xs">
          Navbar
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          Header
        </Header>
      }
      styles={(theme) => ({
        main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
      })}
    >
      Content
    </AppShell>
  );
}
