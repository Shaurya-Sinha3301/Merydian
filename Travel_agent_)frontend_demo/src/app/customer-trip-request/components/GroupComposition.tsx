'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface GroupCompositionProps {
  adults: number;
  children: number;
  seniors: number;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  onSeniorsChange: (value: number) => void;
  error?: string;
}

const GroupComposition = ({
  adults,
  children,
  seniors,
  onAdultsChange,
  onChildrenChange,
  onSeniorsChange,
  error,
}: GroupCompositionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleIncrement = (type: 'adults' | 'children' | 'seniors') => {
    if (!isHydrated) return;
    if (type === 'adults' && adults < 10) onAdultsChange(adults + 1);
    if (type === 'children' && children < 10) onChildrenChange(children + 1);
    if (type === 'seniors' && seniors < 10) onSeniorsChange(seniors + 1);
  };

  const handleDecrement = (type: 'adults' | 'children' | 'seniors') => {
    if (!isHydrated) return;
    if (type === 'adults' && adults > 1) onAdultsChange(adults - 1);
    if (type === 'children' && children > 0) onChildrenChange(children - 1);
    if (type === 'seniors' && seniors > 0) onSeniorsChange(seniors - 1);
  };

  const travelers = [
    {
      type: 'adults' as const,
      label: 'Adults',
      description: 'Ages 18-64',
      icon: 'UserIcon',
      value: adults,
      min: 1,
    },
    {
      type: 'children' as const,
      label: 'Children',
      description: 'Ages 0-17',
      icon: 'UserGroupIcon',
      value: children,
      min: 0,
    },
    {
      type: 'seniors' as const,
      label: 'Seniors',
      description: 'Ages 65+',
      icon: 'UserIcon',
      value: seniors,
      min: 0,
    },
  ];

  const totalTravelers = adults + children + seniors;

  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">
            Group Composition <span className="text-destructive">*</span>
          </label>
          <div className="caption text-xs text-muted-foreground">
            Total: {totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {travelers.map((traveler) => (
            <div key={traveler.type} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon name={traveler.icon as any} size={20} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{traveler.label}</div>
                  <div className="caption text-xs text-muted-foreground">{traveler.description}</div>
                </div>
              </div>
              <div className="text-lg font-semibold text-foreground">{traveler.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Group Composition <span className="text-destructive">*</span>
        </label>
        <div className="caption text-xs text-muted-foreground">
          Total: {totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'}
        </div>
      </div>
      <div className="neu-flat rounded-3xl divide-y divide-border/50">
        {travelers.map((traveler) => (
          <div key={traveler.type} className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl neu-convex">
                <Icon name={traveler.icon as any} size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{traveler.label}</div>
                <div className="caption text-xs text-muted-foreground">{traveler.description}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleDecrement(traveler.type)}
                disabled={traveler.value <= traveler.min}
                className="flex h-10 w-10 items-center justify-center rounded-xl neu-button disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                <Icon name="MinusIcon" size={16} className="text-foreground" />
              </button>
              <div className="w-10 text-center text-lg font-semibold text-foreground">{traveler.value}</div>
              <button
                onClick={() => handleIncrement(traveler.type)}
                disabled={traveler.value >= 10}
                className="flex h-10 w-10 items-center justify-center rounded-xl neu-button disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                <Icon name="PlusIcon" size={16} className="text-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center space-x-1">
          <Icon name="ExclamationCircleIcon" size={16} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default GroupComposition;