import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { MantineProvider, Navbar } from '@mantine/core';
import { Provider } from 'react-redux';
import { VisynApp, VisynAppProvider } from 'visyn_core/app';
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
            appShellProps={{
              styles: (theme) => ({
                main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
              }),
            }}
          >
            {/* Hello app_template! */}
            <App />
          </VisynApp>
        </VisynAppProvider>
      </Provider>
    </MantineProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
