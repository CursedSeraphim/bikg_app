import 'regenerator-runtime/runtime';
import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { MantineProvider, Navbar, Title } from '@mantine/core';
import { Provider } from 'react-redux';
import { VisynApp, VisynAppProvider, VisynHeader } from 'visyn_core/app';
import { App } from './App';
import store from './components/Store/Store';
import Treeview from './components/Treeview/Treeview';
import { BILogo } from './components/BILogo';

// const consoleWarn = console.log;
// const SUPPRESSED_WARNINGS = ['WARN: unrecognized GUI edit: selections'];

// console.log = function filterWarnings(msg, ...args) {
//   if (!SUPPRESSED_WARNINGS.some((entry) => msg.includes(entry))) {
//     consoleWarn(msg, ...args);
//   }
// };

ReactDOM.render(
  // <React.StrictMode> TODO doesn't work with treebeard due to depreacted finddomnode
  <MantineProvider withGlobalStyles withNormalizeCSS>
    <Provider store={store}>
      <VisynAppProvider appName="app_template">
        <VisynApp
          loginMenu={null}
          navbar={
            <Navbar width={{ base: 250 }} height="100%" p="xs" style={{ border: '1px solid lightgrey' }}>
              {/* Navbar <br />
                To be filled with settings, potentially an ontology tree view browser, etc */}
              <div className="treebeard-container">
                Tree View
                <Treeview />
              </div>
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
                logo: <BILogo color="white" />,
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
  </MantineProvider>,
  // </React.StrictMode>,
  document.getElementById('root'),
);
