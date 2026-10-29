import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './providers/ThemeProvider';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';

window.addEventListener('error', (event) => {
});

window.addEventListener('unhandledrejection', (event) => {
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.textContent = 'Missing #root';
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <QueryProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}
