import { WifiOff } from 'lucide-react';
import { Button } from './button';

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-orange-100 rounded-lg shadow-sm w-full h-full min-h-[200px]">
      <div className="p-3 bg-orange-50 text-orange-500 rounded-full mb-4">
        <WifiOff className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">You are offline</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">Please check your internet connection and try again.</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Refresh
        </Button>
      )}
    </div>
  );
}
