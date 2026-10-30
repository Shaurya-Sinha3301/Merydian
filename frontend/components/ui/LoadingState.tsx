import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  text?: string;
  className?: string;
}

export function LoadingState({ text = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center w-full min-h-[200px] ${className}`}>
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-4" />
      <p className="text-sm text-gray-500 font-medium animate-pulse">{text}</p>
    </div>
  );
}

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-md ${className}`}></div>
  );
}
