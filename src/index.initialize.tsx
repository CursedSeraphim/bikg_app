import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { MantineProvider } from '@mantine/core';
import { Provider } from 'react-redux';
import { VisynApp, VisynAppProvider } from 'visyn_core/app';
import { App } from './App';
import store from './components/Store/Store';

ReactDOM.render(
  <React.StrictMode>
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <VisynAppProvider appName="app_template" store="store">
        <VisynApp loginMenu={null}>Hello app_template!</VisynApp>
      </VisynAppProvider>
    </MantineProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
