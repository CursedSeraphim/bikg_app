import { MantineProvider, Title } from '@mantine/core';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import 'regenerator-runtime/runtime';
import { VisynApp, VisynAppProvider, VisynHeader } from 'visyn_core/app';
import { App } from './App';
import { AppNameElement } from './components/AppName';
import { BILogo } from './components/BILogo';
import store from './components/Store/Store';
import { MANTINE_HEADER_COLOR } from './constants';

ReactDOM.render(
  // <React.StrictMode> TODO doesn't work with treebeard due to depreacted finddomnode
  <MantineProvider
    withGlobalStyles
    withNormalizeCSS
    theme={{
      primaryColor: 'dark',
      globalStyles: () => ({
        ':root': {
          '--mantine-header-color': MANTINE_HEADER_COLOR,
        },
      }),
    }}
  >
    <Provider store={store}>
      <VisynAppProvider appName="app_template">
        <VisynApp
          loginMenu={null}
          header={
            <VisynHeader
              backgroundColor={MANTINE_HEADER_COLOR}
              components={{
                title: (
                  <Title order={3} weight={100} color="white">
                    <AppNameElement />
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
