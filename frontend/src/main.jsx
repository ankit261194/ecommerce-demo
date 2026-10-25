import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';

// Global fetch and axios interceptor for sub-directory demo deployments (e.g. /ecommerce-demo/)
if (typeof window !== 'undefined') {
  const isDemo = window.location.pathname.includes('/ecommerce-demo');
  if (isDemo) {
    // Intercept native fetch so calls to '/api/...' automatically route to '/ecommerce-demo/api/...'
    const originalFetch = window.fetch;
    window.fetch = function (resource, init) {
      if (typeof resource === 'string' && resource.startsWith('/api/')) {
        resource = '/ecommerce-demo' + resource;
      }
      return originalFetch.call(this, resource, init);
    };

    // Intercept default axios instances
    axios.interceptors.request.use(config => {
      if (config.url && typeof config.url === 'string' && config.url.startsWith('/api/')) {
        config.url = '/ecommerce-demo' + config.url;
      }
      return config;
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA Service Worker for Offline First & Web Push
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] ServiceWorker registered successfully with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('[PWA] ServiceWorker registration failed:', error);
      });
  });
}
