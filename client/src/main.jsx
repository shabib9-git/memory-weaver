/**
 * main.jsx — React application entry point.
 *
 * Mounts the root <App> component into the #root div and applies
 * React 18's concurrent rendering via createRoot.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Mount the SPA — React 18 concurrent mode
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
