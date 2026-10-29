import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { router } from './router';
import { Button } from './ui/Button';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-16">
      <h1 className="display text-5xl">
        Something <span className="mark mark-magenta">broke</span>.
      </h1>
      <p className="mt-4 text-ink-2">{error instanceof Error ? error.message : String(error)}</p>
      <div className="mt-6">
        <Button onClick={resetErrorBoundary}>Try again</Button>
      </div>
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
