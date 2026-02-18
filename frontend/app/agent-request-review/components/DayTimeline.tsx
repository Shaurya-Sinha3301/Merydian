import ItineraryActivity from './ItineraryActivity';

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

interface DayData {
  day: number;
  date: string;
  activities: Activity[];
  totalCost: number;
  totalDuration: string;
}

interface DayTimelineProps {
  dayData: DayData;
  modifiedActivityIds: string[];
  onActivityModify: (activityId: string) => void;
  onActivitySwap: (activityId: string) => void;
  onActivityRemove: (activityId: string) => void;
}

const DayTimeline = ({ 
  dayData, 
  modifiedActivityIds,
  onActivityModify,
  onActivitySwap,
  onActivityRemove 
}: DayTimelineProps) => {
  return (
    <div className="space-y-4">
      {/* Day Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Day {dayData.day}</h3>
            <p className="text-sm text-muted-foreground">{dayData.date}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-foreground data-text">${dayData.totalCost.toFixed(2)}</div>
            <div className="caption text-xs text-muted-foreground">{dayData.totalDuration}</div>
          </div>
        </div>
      </div>

      {/* Activities */}
      <div className="space-y-3">
        {dayData.activities.map((activity) => (
          <ItineraryActivity
            key={activity.id}
            activity={activity}
            isModified={modifiedActivityIds.includes(activity.id)}
            onModify={() => onActivityModify(activity.id)}
            onSwap={() => onActivitySwap(activity.id)}
            onRemove={() => onActivityRemove(activity.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default DayTimeline;