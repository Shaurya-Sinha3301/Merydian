import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { router } from './router';

function ErrorFallback({ error, resetErrorBoundary }: import('react-error-boundary').FallbackProps) {
  return (
    <div style={{ padding: 32, color: '#111', background: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
      <p style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        {error instanceof Error ? error.message : String(error)}
      </p>
      <button type="button" onClick={resetErrorBoundary} style={{ padding: '8px 16px', marginTop: 12 }}>
        Try again
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
