'use client';

import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface ComparisonActivity {
  id: string;
  name: string;
  location: string;
  time: string;
  cost: number;
  image: string;
  alt: string;
  status: 'unchanged' | 'modified' | 'added' | 'removed';
}

interface ComparisonDay {
  day: number;
  date: string;
  original: ComparisonActivity[];
  modified: ComparisonActivity[];
  costChange: number;
}

interface ComparisonViewProps {
  comparison: ComparisonDay[];
  onClose: () => void;
}

const ComparisonView = ({ comparison, onClose }: ComparisonViewProps) => {
  const totalOriginalCost = comparison.reduce(
    (sum, day) => sum + day.original.reduce((s, a) => s + a.cost, 0),
    0
  );
  const totalModifiedCost = comparison.reduce(
    (sum, day) => sum + day.modified.reduce((s, a) => s + a.cost, 0),
    0
  );
  const totalCostChange = totalModifiedCost - totalOriginalCost;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'bg-success/10 border-success/20 text-success';
      case 'removed':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
      case 'modified':
        return 'bg-warning/10 border-warning/20 text-warning';
      default:
        return 'bg-muted/10 border-border text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
        return 'PlusCircleIcon';
      case 'removed':
        return 'MinusCircleIcon';
      case 'modified':
        return 'PencilSquareIcon';
      default:
        return 'CheckCircleIcon';
    }
  };

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card rounded-lg shadow-elevation-4 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-foreground">Itinerary Comparison</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-muted transition-smooth"
              aria-label="Close comparison"
            >
              <Icon name="XMarkIcon" size={24} className="text-muted-foreground" />
            </button>
          </div>

          {/* Cost Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground mb-1">Original Cost</p>
              <p className="text-xl font-semibold text-foreground data-text">
                ${totalOriginalCost.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10">
              <p className="text-sm text-muted-foreground mb-1">Modified Cost</p>
              <p className="text-xl font-semibold text-primary data-text">
                ${totalModifiedCost.toLocaleString()}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              totalCostChange > 0 ? 'bg-destructive/10' : 'bg-success/10'
            }`}>
              <p className="text-sm text-muted-foreground mb-1">Cost Change</p>
              <p className={`text-xl font-semibold data-text ${
                totalCostChange > 0 ? 'text-destructive' : 'text-success'
              }`}>
                {totalCostChange > 0 ? '+' : ''}${Math.abs(totalCostChange).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {comparison.map((day) => (
              <div key={day.day} className="bg-background rounded-lg border border-border p-4">
                {/* Day Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Day {day.day}</h3>
                    <p className="text-sm text-muted-foreground">{day.date}</p>
                  </div>
                  {day.costChange !== 0 && (
                    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md ${
                      day.costChange > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                    }`}>
                      <Icon
                        name={day.costChange > 0 ? 'ArrowUpIcon' : 'ArrowDownIcon'}
                        size={16}
                        variant="solid"
                      />
                      <span className="text-sm font-semibold data-text">
                        {day.costChange > 0 ? '+' : ''}${Math.abs(day.costChange).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Original */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center space-x-2">
                      <Icon name="DocumentTextIcon" size={16} />
                      <span>Original Itinerary</span>
                    </h4>
                    <div className="space-y-2">
                      {day.original.map((activity) => (
                        <div
                          key={activity.id}
                          className={`p-3 rounded-lg border ${
                            activity.status === 'removed' ?'opacity-50 border-destructive/20 bg-destructive/5' :'border-border'
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                              <AppImage
                                src={activity.image}
                                alt={activity.alt}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-foreground text-sm line-clamp-1 mb-1">
                                {activity.name}
                              </h5>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                                <Icon name="ClockIcon" size={12} />
                                <span>{activity.time}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-foreground data-text">
                                  ${activity.cost}
                                </span>
                                {activity.status === 'removed' && (
                                  <span className="text-xs text-destructive font-medium">Removed</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modified */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3 flex items-center space-x-2">
                      <Icon name="PencilSquareIcon" size={16} />
                      <span>Modified Itinerary</span>
                    </h4>
                    <div className="space-y-2">
                      {day.modified.map((activity) => (
                        <div
                          key={activity.id}
                          className={`p-3 rounded-lg border ${getStatusColor(activity.status)}`}
                        >
                          <div className="flex gap-3">
                            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                              <AppImage
                                src={activity.image}
                                alt={activity.alt}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h5 className="font-medium text-foreground text-sm line-clamp-1">
                                  {activity.name}
                                </h5>
                                {activity.status !== 'unchanged' && (
                                  <Icon
                                    name={getStatusIcon(activity.status) as any}
                                    size={14}
                                    variant="solid"
                                  />
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                                <Icon name="ClockIcon" size={12} />
                                <span>{activity.time}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-foreground data-text">
                                  ${activity.cost}
                                </span>
                                {activity.status !== 'unchanged' && (
                                  <span className="text-xs font-medium capitalize">{activity.status}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon name="InformationCircleIcon" size={16} />
              <span>Review all changes before sending to customer</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-smooth"
            >
              Close Comparison
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;