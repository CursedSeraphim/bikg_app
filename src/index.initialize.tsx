import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { MantineProvider, Navbar, Title } from '@mantine/core';
import { Provider } from 'react-redux';
import { VisynApp, VisynAppProvider, VisynHeader } from 'visyn_core/app';
import { App } from './App';
import store from './components/Store/Store';

ReactDOM.render(
  <React.StrictMode>
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <Provider store={store}>
        <VisynAppProvider appName="app_template">
          <VisynApp
            loginMenu={null}
            navbar={
              <Navbar width={{ base: 300 }} height="100%" p="xs">
                Navbar
              </Navbar>
            }
            header={
              <VisynHeader
                components={{
                  title: (
                    <Title order={3} weight={100} color="white">
                      Boehringer Ingelheim Knowledge Graphs
                    </Title>
                  ),
                }}
              />
            }
            appShellProps={{
              styles: (theme) => ({
                main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
              }),
            }}
          >
            <App />
          </VisynApp>
        </VisynAppProvider>
      </Provider>
    </MantineProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
