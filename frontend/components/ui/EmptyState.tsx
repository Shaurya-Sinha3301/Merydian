import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ 
  title = "No data found", 
  message = "There is nothing to display here yet.",
  icon = <FolderOpen className="w-8 h-8" />,
  action 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 w-full min-h-[200px]">
      <div className="p-4 bg-white text-gray-400 rounded-full shadow-sm mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
