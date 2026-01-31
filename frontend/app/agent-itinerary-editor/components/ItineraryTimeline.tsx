'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface TimelineActivity {
  id: string;
  name: string;
  location: string;
  startTime: string;
  endTime: string;
  duration: number;
  cost: number;
  category: string;
  description: string;
  image: string;
  alt: string;
  travelTime?: number;
  constraints?: string[];
}

interface DayItinerary {
  day: number;
  date: string;
  activities: TimelineActivity[];
  totalCost: number;
  totalDuration: number;
}

interface ItineraryTimelineProps {
  itinerary: DayItinerary[];
  onActivityEdit: (dayIndex: number, activityId: string) => void;
  onActivityDelete: (dayIndex: number, activityId: string) => void;
  onActivityReorder: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  onTimeAdjust: (dayIndex: number, activityId: string, newStartTime: string) => void;
}

const ItineraryTimeline = ({
  itinerary,
  onActivityEdit,
  onActivityDelete,
  onActivityReorder,
  onTimeAdjust,
}: ItineraryTimelineProps) => {
  const [expandedDays, setExpandedDays] = useState<number[]>([0]);
  const [draggedActivity, setDraggedActivity] = useState<{ dayIndex: number; activityIndex: number } | null>(null);

  const toggleDay = (dayIndex: number) => {
    setExpandedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleDragStart = (dayIndex: number, activityIndex: number) => {
    setDraggedActivity({ dayIndex, activityIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dayIndex: number, targetIndex: number) => {
    if (draggedActivity && draggedActivity.dayIndex === dayIndex) {
      onActivityReorder(dayIndex, draggedActivity.activityIndex, targetIndex);
    }
    setDraggedActivity(null);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      attractions: 'BuildingLibraryIcon',
      dining: 'CakeIcon',
      adventure: 'BoltIcon',
      culture: 'AcademicCapIcon',
      shopping: 'ShoppingBagIcon',
      relaxation: 'SparklesIcon',
    };
    return icons[category] || 'MapPinIcon';
  };

  return (
    <div className="space-y-4">
      {itinerary.map((day, dayIndex) => {
        const isExpanded = expandedDays.includes(dayIndex);

        return (
          <div key={dayIndex} className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Day Header */}
            <button
              onClick={() => toggleDay(dayIndex)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-smooth"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg font-semibold text-primary">Day {day.day}</span>
                </div>
                <div className="text-left">
                  <h3 className="text-base font-semibold text-foreground">{day.date}</h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center space-x-1">
                      <Icon name="ClockIcon" size={14} />
                      <span>{Math.floor(day.totalDuration / 60)}h {day.totalDuration % 60}m</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="CurrencyDollarIcon" size={14} />
                      <span className="data-text">${day.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="MapPinIcon" size={14} />
                      <span>{day.activities.length} activities</span>
                    </div>
                  </div>
                </div>
              </div>
              <Icon
                name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                size={20}
                className="text-muted-foreground"
              />
            </button>

            {/* Activities Timeline */}
            {isExpanded && (
              <div className="p-4 pt-0 space-y-3">
                {day.activities.map((activity, activityIndex) => (
                  <div key={activity.id}>
                    {/* Travel Time Indicator */}
                    {activity.travelTime && activity.travelTime > 0 && (
                      <div className="flex items-center space-x-2 py-2 px-4 mb-2 bg-muted/30 rounded-md">
                        <Icon name="TruckIcon" size={16} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Travel time: {activity.travelTime} minutes
                        </span>
                      </div>
                    )}

                    {/* Activity Card */}
                    <div
                      draggable
                      onDragStart={() => handleDragStart(dayIndex, activityIndex)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(dayIndex, activityIndex)}
                      className="bg-background rounded-lg border border-border p-4 hover:shadow-elevation-2 transition-smooth cursor-move"
                    >
                      <div className="flex gap-4">
                        {/* Activity Image */}
                        <div className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                          <AppImage
                            src={activity.image}
                            alt={activity.alt}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Activity Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center space-x-2">
                              <Icon
                                name={getCategoryIcon(activity.category) as any}
                                size={16}
                                className="text-primary"
                              />
                              <h4 className="font-semibold text-foreground">{activity.name}</h4>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => onActivityEdit(dayIndex, activity.id)}
                                className="p-1.5 rounded-md hover:bg-muted transition-smooth"
                                title="Edit activity"
                              >
                                <Icon name="PencilIcon" size={16} className="text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => onActivityDelete(dayIndex, activity.id)}
                                className="p-1.5 rounded-md hover:bg-destructive/10 transition-smooth"
                                title="Delete activity"
                              >
                                <Icon name="TrashIcon" size={16} className="text-destructive" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-2">
                            <Icon name="MapPinIcon" size={14} />
                            <span>{activity.location}</span>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {activity.description}
                          </p>

                          {/* Time and Cost */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Icon name="ClockIcon" size={14} className="text-muted-foreground" />
                                <input
                                  type="time"
                                  value={activity.startTime}
                                  onChange={(e) => onTimeAdjust(dayIndex, activity.id, e.target.value)}
                                  className="text-sm font-medium text-foreground bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-ring rounded px-1"
                                />
                                <span className="text-sm text-muted-foreground">-</span>
                                <span className="text-sm font-medium text-foreground">{activity.endTime}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Icon name="ClockIcon" size={14} className="text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{activity.duration} min</span>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-primary data-text">
                              ${activity.cost.toLocaleString()}
                            </span>
                          </div>

                          {/* Constraints */}
                          {activity.constraints && activity.constraints.length > 0 && (
                            <div className="mt-2 flex items-center space-x-2">
                              <Icon name="ExclamationTriangleIcon" size={14} className="text-warning" />
                              <div className="flex flex-wrap gap-1">
                                {activity.constraints.map((constraint, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs"
                                  >
                                    {constraint}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Activity Button */}
                <button className="w-full py-3 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-smooth flex items-center justify-center space-x-2 text-muted-foreground hover:text-primary">
                  <Icon name="PlusIcon" size={20} />
                  <span className="text-sm font-medium">Add Activity</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ItineraryTimeline;