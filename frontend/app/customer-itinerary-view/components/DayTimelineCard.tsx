import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface Activity {
  id: string;
  time: string;
  title: string;
  location: string;
  description: string;
  duration: string;
  cost: number;
  image: string;
  alt: string;
  isMustVisit: boolean;
  travelTime?: string;
  highlights: string[];
}

interface DayTimelineCardProps {
  dayNumber: number;
  date: string;
  activities: Activity[];
  totalDayCost: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const DayTimelineCard = ({
  dayNumber,
  date,
  activities,
  totalDayCost,
  isExpanded,
  onToggleExpand,
}: DayTimelineCardProps) => {
  return (
    <div className="bg-card rounded-3xl overflow-hidden transition-all shadow-sm border border-neutral-100 hover:shadow-md">
      <button
        onClick={onToggleExpand}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-lg font-semibold">{dayNumber}</span>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-foreground">Day {dayNumber}</h3>
            <p className="text-sm text-muted-foreground">{date}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-lg font-semibold text-foreground">
              ${totalDayCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <Icon
            name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
            size={24}
            className="text-muted-foreground"
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-100">
          <div className="p-6 space-y-6">
            {activities.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative w-full md:w-48 h-48 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm border border-neutral-100">
                    <AppImage
                      src={activity.image}
                      alt={activity.alt}
                      className="w-full h-full object-cover"
                    />
                    {activity.isMustVisit && (
                      <div className="absolute top-2 right-2 px-3 py-1.5 bg-black text-white rounded-full text-xs font-medium shadow-sm">
                        Must Visit
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Icon name="ClockIcon" size={16} className="text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{activity.time}</span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{activity.duration}</span>
                        </div>
                        <h4 className="text-lg font-semibold text-foreground mb-1">{activity.title}</h4>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Icon name="MapPinIcon" size={14} />
                          <span>{activity.location}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Cost</p>
                        <p className="text-lg font-semibold text-black">
                          ${activity.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-foreground mb-3">{activity.description}</p>

                    {activity.highlights.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Highlights</p>
                        <div className="flex flex-wrap gap-2">
                          {activity.highlights.map((highlight, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-neutral-100 border border-neutral-200 text-foreground text-xs rounded-lg"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {activity.travelTime && index < activities.length - 1 && (
                  <div className="flex items-center space-x-2 mt-4 ml-4 text-sm text-muted-foreground">
                    <Icon name="ArrowDownIcon" size={16} />
                    <span>Travel time: {activity.travelTime}</span>
                  </div>
                )}

                {index < activities.length - 1 && (
                  <div className="border-b border-neutral-100 my-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DayTimelineCard;