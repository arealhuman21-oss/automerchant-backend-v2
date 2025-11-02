import React from 'react';
import ReactDOM from 'react-dom/client';
// Use the beautiful Tailwind UI as the main production app
import App from './App.old';
// Polaris version available as ./App.js if needed
// import AppBridgeProvider from './AppBridge';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);