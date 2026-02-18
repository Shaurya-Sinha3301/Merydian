import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  duration: string;
  cost: number;
  travelTime: string;
  confidenceScore: number;
  constraintFlags: string[];
  image: string;
  alt: string;
  category: 'attraction' | 'meal' | 'transport' | 'accommodation';
}

interface ItineraryActivityProps {
  activity: Activity;
  isModified: boolean;
  onModify: () => void;
  onSwap: () => void;
  onRemove: () => void;
}

const ItineraryActivity = ({ 
  activity, 
  isModified,
  onModify,
  onSwap,
  onRemove 
}: ItineraryActivityProps) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attraction':
        return 'MapPinIcon';
      case 'meal':
        return 'CakeIcon';
      case 'transport':
        return 'TruckIcon';
      case 'accommodation':
        return 'HomeIcon';
      default:
        return 'MapPinIcon';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'attraction':
        return 'bg-primary/10 text-primary';
      case 'meal':
        return 'bg-accent/10 text-accent';
      case 'transport':
        return 'bg-secondary/10 text-secondary';
      case 'accommodation':
        return 'bg-success/10 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className={`bg-card rounded-lg border transition-smooth ${
      isModified ? 'border-accent shadow-elevation-2' : 'border-border'
    }`}>
      <div className="p-4 space-y-3">
        {/* Activity Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <AppImage
                src={activity.image}
                alt={activity.alt}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="data-text text-xs font-medium text-muted-foreground">{activity.time}</span>
                <span className={`caption text-xs px-2 py-0.5 rounded-full ${getCategoryColor(activity.category)}`}>
                  {activity.category}
                </span>
                {isModified && (
                  <span className="caption text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    Modified
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-1">{activity.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
            </div>
          </div>
        </div>

        {/* Activity Details */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Icon name="ClockIcon" size={14} />
            <span>{activity.duration}</span>
          </div>
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Icon name="CurrencyDollarIcon" size={14} />
            <span className="data-text">${activity.cost.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Icon name="TruckIcon" size={14} />
            <span>{activity.travelTime}</span>
          </div>
          <div className={`flex items-center space-x-1 ${getConfidenceColor(activity.confidenceScore)}`}>
            <Icon name="ChartBarIcon" size={14} />
            <span className="data-text">{activity.confidenceScore}%</span>
          </div>
        </div>

        {/* Constraint Flags */}
        {activity.constraintFlags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activity.constraintFlags.map((flag, idx) => (
              <span key={idx} className="caption text-xs bg-warning/10 text-warning px-2 py-0.5 rounded flex items-center space-x-1">
                <Icon name="ExclamationTriangleIcon" size={12} />
                <span>{flag}</span>
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-2 border-t border-border">
          <button
            onClick={onModify}
            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-smooth"
          >
            <Icon name="PencilIcon" size={14} />
            <span>Modify</span>
          </button>
          <button
            onClick={onSwap}
            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-smooth"
          >
            <Icon name="ArrowsRightLeftIcon" size={14} />
            <span>Swap</span>
          </button>
          <button
            onClick={onRemove}
            className="px-3 py-2 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-smooth"
          >
            <Icon name="TrashIcon" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItineraryActivity;