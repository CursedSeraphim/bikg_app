import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { MantineProvider } from '@mantine/core';
import { Provider } from 'react-redux';
import { App } from './App';
import store from './components/Store/Store';

ReactDOM.render(
  <React.StrictMode>
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <Provider store={store}>
        <App />
      </Provider>
    </MantineProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
