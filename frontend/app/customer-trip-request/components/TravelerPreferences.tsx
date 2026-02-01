'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface TravelerPreference {
  id: string;
  name: string;
  type: 'adult' | 'child' | 'senior';
  interests: string[];
  constraints: string[];
  mobilityLevel: string;
  timeLimit: string;
}

interface TravelerPreferencesProps {
  adults: number;
  children: number;
  seniors: number;
  preferences: TravelerPreference[];
  onPreferencesChange: (preferences: TravelerPreference[]) => void;
}

const TravelerPreferences = ({
  adults,
  children,
  seniors,
  preferences,
  onPreferencesChange,
}: TravelerPreferencesProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedTraveler, setExpandedTraveler] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const interestOptions = [
    'Historical Sites',
    'Museums',
    'Nature & Parks',
    'Adventure Activities',
    'Food & Dining',
    'Shopping',
    'Nightlife',
    'Art & Culture',
    'Beach & Water Sports',
    'Photography',
  ];

  const mobilityOptions = [
    { value: 'high', label: 'High Mobility', description: 'Can walk long distances' },
    { value: 'moderate', label: 'Moderate Mobility', description: 'Comfortable with short walks' },
    { value: 'low', label: 'Low Mobility', description: 'Requires wheelchair or assistance' },
  ];

  const timeLimitOptions = [
    { value: 'flexible', label: 'Flexible', description: 'No time constraints' },
    { value: '4-6', label: '4-6 hours/day', description: 'Moderate activity level' },
    { value: '2-4', label: '2-4 hours/day', description: 'Light activity level' },
  ];

  const handleToggleInterest = (travelerId: string, interest: string) => {
    if (!isHydrated) return;
    const updatedPreferences = preferences.map((pref) => {
      if (pref.id === travelerId) {
        const interests = pref.interests.includes(interest)
          ? pref.interests.filter((i) => i !== interest)
          : [...pref.interests, interest];
        return { ...pref, interests };
      }
      return pref;
    });
    onPreferencesChange(updatedPreferences);
  };

  const handleAddConstraint = (travelerId: string, constraint: string) => {
    if (!isHydrated || !constraint.trim()) return;
    const updatedPreferences = preferences.map((pref) => {
      if (pref.id === travelerId && !pref.constraints.includes(constraint)) {
        return { ...pref, constraints: [...pref.constraints, constraint] };
      }
      return pref;
    });
    onPreferencesChange(updatedPreferences);
  };

  const handleRemoveConstraint = (travelerId: string, constraint: string) => {
    if (!isHydrated) return;
    const updatedPreferences = preferences.map((pref) => {
      if (pref.id === travelerId) {
        return { ...pref, constraints: pref.constraints.filter((c) => c !== constraint) };
      }
      return pref;
    });
    onPreferencesChange(updatedPreferences);
  };

  const handleMobilityChange = (travelerId: string, mobility: string) => {
    if (!isHydrated) return;
    const updatedPreferences = preferences.map((pref) => {
      if (pref.id === travelerId) {
        return { ...pref, mobilityLevel: mobility };
      }
      return pref;
    });
    onPreferencesChange(updatedPreferences);
  };

  const handleTimeLimitChange = (travelerId: string, timeLimit: string) => {
    if (!isHydrated) return;
    const updatedPreferences = preferences.map((pref) => {
      if (pref.id === travelerId) {
        return { ...pref, timeLimit };
      }
      return pref;
    });
    onPreferencesChange(updatedPreferences);
  };

  const getTravelerIcon = (type: string) => {
    if (type === 'child') return 'UserGroupIcon';
    return 'UserIcon';
  };

  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">Individual Preferences</label>
        <div className="space-y-3">
          {preferences.map((traveler) => (
            <div key={traveler.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon name={getTravelerIcon(traveler.type) as any} size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{traveler.name}</div>
                    <div className="caption text-xs text-muted-foreground capitalize">{traveler.type}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-foreground">Individual Preferences</label>
      <div className="space-y-3">
        {preferences.map((traveler) => (
          <div key={traveler.id} className="neu-flat rounded-3xl overflow-hidden">
            <button
              onClick={() => setExpandedTraveler(expandedTraveler === traveler.id ? null : traveler.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-smooth"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl neu-convex">
                  <Icon name={getTravelerIcon(traveler.type) as any} size={20} className="text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-foreground">{traveler.name}</div>
                  <div className="caption text-xs text-muted-foreground capitalize">{traveler.type}</div>
                </div>
              </div>
              <Icon
                name={expandedTraveler === traveler.id ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                size={20}
                className="text-muted-foreground"
              />
            </button>

            {expandedTraveler === traveler.id && (
              <div className="p-4 border-t border-border/50 space-y-6">
                {/* Interests */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Interests</div>
                  <div className="flex flex-wrap gap-2">
                    {interestOptions.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => handleToggleInterest(traveler.id, interest)}
                        className={`px-4 py-2 rounded-2xl text-xs font-medium transition-smooth ${
                          traveler.interests.includes(interest)
                            ? 'bg-primary text-primary-foreground shadow-neu-sm'
                            : 'neu-button text-foreground'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Constraints */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Constraints</div>
                  <div className="flex flex-wrap gap-2">
                    {traveler.constraints.map((constraint) => (
                      <div
                        key={constraint}
                        className="flex items-center space-x-1 px-4 py-2 rounded-2xl neu-flat text-warning text-xs font-medium"
                      >
                        <span>{constraint}</span>
                        <button onClick={() => handleRemoveConstraint(traveler.id, constraint)}>
                          <Icon name="XMarkIcon" size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const constraint = prompt('Enter constraint:');
                        if (constraint) handleAddConstraint(traveler.id, constraint);
                      }}
                      className="px-4 py-2 rounded-2xl border-2 border-dashed border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-smooth"
                    >
                      + Add Constraint
                    </button>
                  </div>
                </div>

                {/* Mobility Level */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Mobility Level</div>
                  <div className="space-y-2">
                    {mobilityOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-3 p-3 rounded-2xl neu-button cursor-pointer transition-smooth"
                      >
                        <input
                          type="radio"
                          name={`mobility-${traveler.id}`}
                          value={option.value}
                          checked={traveler.mobilityLevel === option.value}
                          onChange={() => handleMobilityChange(traveler.id, option.value)}
                          className="h-4 w-4 text-primary focus:ring-ring"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{option.label}</div>
                          <div className="caption text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Limit */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Daily Activity Time</div>
                  <div className="space-y-2">
                    {timeLimitOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-3 p-3 rounded-md border border-border hover:bg-muted cursor-pointer transition-smooth"
                      >
                        <input
                          type="radio"
                          name={`time-${traveler.id}`}
                          value={option.value}
                          checked={traveler.timeLimit === option.value}
                          onChange={() => handleTimeLimitChange(traveler.id, option.value)}
                          className="h-4 w-4 text-primary focus:ring-ring"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{option.label}</div>
                          <div className="caption text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TravelerPreferences;