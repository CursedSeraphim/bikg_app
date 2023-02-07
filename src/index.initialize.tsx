import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { MantineProvider } from '@mantine/core';
import { App } from './App';

ReactDOM.render(
  <React.StrictMode>
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <App />
    </MantineProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
