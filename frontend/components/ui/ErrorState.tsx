import { AlertCircle } from 'lucide-react';
import { Button } from './button'; // Assuming button exists

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message = "An error occurred while loading this data. Please try again.",
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-red-100 rounded-lg shadow-sm w-full h-full min-h-[200px]">
      <div className="p-3 bg-red-50 text-red-500 rounded-full mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="text-gray-700">
          Try Again
        </Button>
      )}
    </div>
  );
}
