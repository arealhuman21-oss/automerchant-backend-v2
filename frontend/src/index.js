import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '@shopify/polaris/build/esm/styles.css';
import { AppProvider } from '@shopify/polaris';
import App from './App';
import './index.css';

function AppWrapper() {
  const [colorScheme, setColorScheme] = useState(() => {
    const saved = localStorage.getItem('shopify-color-scheme');
    return saved || 'light';
  });

  useEffect(() => {
    localStorage.setItem('shopify-color-scheme', colorScheme);
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
  }, [colorScheme]);

  return (
    <AppProvider i18n={{}} colorScheme={colorScheme}>
      <App colorScheme={colorScheme} setColorScheme={setColorScheme} />
    </AppProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);