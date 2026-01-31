'use client';

import { useState } from 'react';
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
  image: string;
  alt: string;
  category: string;
}

interface DayComparison {
  day: number;
  date: string;
  original: Activity[];
  modified: Activity[];
  costDelta: number;
}

interface ComparisonViewProps {
  comparisons: DayComparison[];
  onClose: () => void;
}

const ComparisonView = ({ comparisons, onClose }: ComparisonViewProps) => {
  const [selectedDay, setSelectedDay] = useState(0);

  const currentComparison = comparisons[selectedDay];

  const renderActivityCard = (activity: Activity, isModified: boolean) => (
    <div className={`bg-card rounded-lg border p-3 ${isModified ? 'border-accent' : 'border-border'}`}>
      <div className="flex items-start space-x-3">
        <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          <AppImage
            src={activity.image}
            alt={activity.alt}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="data-text text-xs text-muted-foreground">{activity.time}</span>
            {isModified && (
              <span className="caption text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                Modified
              </span>
            )}
          </div>
          <h5 className="text-sm font-medium text-foreground mb-1">{activity.title}</h5>
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Icon name="ClockIcon" size={12} />
              <span>{activity.duration}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Icon name="CurrencyDollarIcon" size={12} />
              <span className="data-text">${activity.cost.toFixed(2)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative bg-card rounded-lg shadow-elevation-4 max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Itinerary Comparison</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-muted transition-smooth"
            >
              <Icon name="XMarkIcon" size={20} />
            </button>
          </div>

          {/* Day Selector */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            {comparisons.map((comp, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDay(idx)}
                className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-smooth ${
                  selectedDay === idx
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Day {comp.day}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original Itinerary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Original Itinerary</h3>
                <span className="caption text-xs text-muted-foreground">
                  {currentComparison.original.length} activities
                </span>
              </div>
              <div className="space-y-2">
                {currentComparison.original.map((activity) => (
                  <div key={activity.id}>
                    {renderActivityCard(activity, false)}
                  </div>
                ))}
              </div>
            </div>

            {/* Modified Itinerary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Modified Itinerary</h3>
                <div className="flex items-center space-x-2">
                  <span className="caption text-xs text-muted-foreground">
                    {currentComparison.modified.length} activities
                  </span>
                  {currentComparison.costDelta !== 0 && (
                    <span className={`caption text-xs px-2 py-0.5 rounded-full ${
                      currentComparison.costDelta > 0 
                        ? 'bg-destructive/10 text-destructive' :'bg-success/10 text-success'
                    }`}>
                      {currentComparison.costDelta > 0 ? '+' : ''}${currentComparison.costDelta.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {currentComparison.modified.map((activity) => (
                  <div key={activity.id}>
                    {renderActivityCard(activity, true)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;