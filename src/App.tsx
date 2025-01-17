// src/App.tsx
import React from 'react';
import { Provider } from 'react-redux';
import store from './components/Store/Store';
import { useInitializeData } from './hooks/useInitializeData';
import Layout from './layout/Layout';
import './styles.css';

export function App() {
  // Custom hook to fetch all data on mount
  useInitializeData();

  return (
    <Provider store={store}>
      <Layout />
    </Provider>
  );
}
