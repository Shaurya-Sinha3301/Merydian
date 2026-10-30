import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.textContent = 'Missing #root';
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <QueryProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryProvider>
    </React.StrictMode>,
  );
}
