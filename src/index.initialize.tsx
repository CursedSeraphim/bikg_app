import { MantineProvider, Title } from '@mantine/core';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import 'regenerator-runtime/runtime';
import { VisynApp, VisynAppProvider, VisynHeader } from 'visyn_core/app';
import { App } from './App';
import { BILogo } from './components/BILogo';
import store from './components/Store/Store';

ReactDOM.render(
  // <React.StrictMode> TODO doesn't work with treebeard due to depreacted finddomnode
  <MantineProvider withGlobalStyles withNormalizeCSS>
    <Provider store={store}>
      <VisynAppProvider appName="app_template">
        <VisynApp
          loginMenu={null}
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
        >
          <App />
        </VisynApp>
      </VisynAppProvider>
    </Provider>
  </MantineProvider>,
  // </React.StrictMode>,
  document.getElementById('root'),
);
