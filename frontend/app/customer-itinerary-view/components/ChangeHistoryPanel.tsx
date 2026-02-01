'use client';

import Icon from '@/components/ui/AppIcon';

interface ChangeHistoryItem {
  id: string;
  timestamp: string;
  request: string;
  status: 'accepted' | 'rejected' | 'pending';
  costImpact: number;
}

interface ChangeHistoryPanelProps {
  history: ChangeHistoryItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ChangeHistoryPanel = ({ history, isExpanded, onToggleExpand }: ChangeHistoryPanelProps) => {
  const statusConfig = {
    accepted: {
      label: 'Accepted',
      icon: 'CheckCircleIcon' as const,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    rejected: {
      label: 'Rejected',
      icon: 'XCircleIcon' as const,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    pending: {
      label: 'Pending',
      icon: 'ClockIcon' as const,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  };

  if (history.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border border-border shadow-elevation-2 overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <Icon name="ClockIcon" size={20} className="text-secondary" variant="solid" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-foreground">Change History</h3>
            <p className="text-sm text-muted-foreground">{history.length} modification(s) requested</p>
          </div>
        </div>
        <Icon
          name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
          size={24}
          className="text-muted-foreground"
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border p-6">
          <div className="space-y-4">
            {history.map((item, index) => {
              const config = statusConfig[item.status];
              return (
                <div
                  key={item.id}
                  className="flex items-start space-x-4 p-4 bg-muted rounded-lg"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.bgColor} flex-shrink-0`}>
                    <Icon name={config.icon} size={16} className={config.color} variant="solid" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">{item.request}</p>
                        <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    {item.costImpact !== 0 && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Icon
                          name={item.costImpact > 0 ? 'ArrowUpIcon' : 'ArrowDownIcon'}
                          size={14}
                          className={item.costImpact > 0 ? 'text-warning' : 'text-success'}
                        />
                        <span className={`text-xs font-medium ${item.costImpact > 0 ? 'text-warning' : 'text-success'}`}>
                          {item.costImpact > 0 ? '+' : ''}$
                          {Math.abs(item.costImpact).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeHistoryPanel;