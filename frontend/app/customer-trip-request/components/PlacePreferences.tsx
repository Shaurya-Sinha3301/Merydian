'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface PlacePreferencesProps {
  mustVisit: string[];
  placesToAvoid: string[];
  onMustVisitChange: (places: string[]) => void;
  onPlacesToAvoidChange: (places: string[]) => void;
}

const PlacePreferences = ({
  mustVisit,
  placesToAvoid,
  onMustVisitChange,
  onPlacesToAvoidChange,
}: PlacePreferencesProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [mustVisitInput, setMustVisitInput] = useState('');
  const [avoidInput, setAvoidInput] = useState('');
  const [showMustVisitSuggestions, setShowMustVisitSuggestions] = useState(false);
  const [showAvoidSuggestions, setShowAvoidSuggestions] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const popularPlaces = [
    'Eiffel Tower',
    'Louvre Museum',
    'Notre-Dame Cathedral',
    'Arc de Triomphe',
    'Sacré-Cœur',
    'Versailles Palace',
    'Champs-Élysées',
    'Montmartre',
    'Latin Quarter',
    'Seine River Cruise',
  ];

  const filteredMustVisitSuggestions = isHydrated
    ? popularPlaces.filter(
        (place) =>
          place.toLowerCase().includes(mustVisitInput.toLowerCase()) &&
          !mustVisit.includes(place)
      )
    : [];

  const filteredAvoidSuggestions = isHydrated
    ? popularPlaces.filter(
        (place) =>
          place.toLowerCase().includes(avoidInput.toLowerCase()) &&
          !placesToAvoid.includes(place)
      )
    : [];

  const handleAddMustVisit = (place: string) => {
    if (!isHydrated || !place.trim() || mustVisit.includes(place)) return;
    onMustVisitChange([...mustVisit, place]);
    setMustVisitInput('');
    setShowMustVisitSuggestions(false);
  };

  const handleRemoveMustVisit = (place: string) => {
    if (!isHydrated) return;
    onMustVisitChange(mustVisit.filter((p) => p !== place));
  };

  const handleAddAvoid = (place: string) => {
    if (!isHydrated || !place.trim() || placesToAvoid.includes(place)) return;
    onPlacesToAvoidChange([...placesToAvoid, place]);
    setAvoidInput('');
    setShowAvoidSuggestions(false);
  };

  const handleRemoveAvoid = (place: string) => {
    if (!isHydrated) return;
    onPlacesToAvoidChange(placesToAvoid.filter((p) => p !== place));
  };

  const handleMustVisitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isHydrated) return;
    if (e.key === 'Enter' && mustVisitInput.trim()) {
      e.preventDefault();
      handleAddMustVisit(mustVisitInput.trim());
    }
  };

  const handleAvoidKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isHydrated) return;
    if (e.key === 'Enter' && avoidInput.trim()) {
      e.preventDefault();
      handleAddAvoid(avoidInput.trim());
    }
  };

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        {/* Must Visit */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Must-Visit Places</label>
          <div className="flex flex-wrap gap-2">
            {mustVisit.map((place) => (
              <div
                key={place}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium"
              >
                <Icon name="CheckCircleIcon" size={16} variant="solid" />
                <span>{place}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Places to Avoid */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Places to Avoid</label>
          <div className="flex flex-wrap gap-2">
            {placesToAvoid.map((place) => (
              <div
                key={place}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium"
              >
                <Icon name="XCircleIcon" size={16} variant="solid" />
                <span>{place}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Must Visit */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Must-Visit Places</label>
        <div className="relative">
          <input
            type="text"
            value={mustVisitInput}
            onChange={(e) => {
              setMustVisitInput(e.target.value);
              setShowMustVisitSuggestions(true);
            }}
            onKeyDown={handleMustVisitKeyDown}
            onFocus={() => setShowMustVisitSuggestions(true)}
            placeholder="Add places you definitely want to visit"
            className="w-full rounded-2xl neu-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-neu-inset transition-smooth"
          />
          {showMustVisitSuggestions && filteredMustVisitSuggestions.length > 0 && (
            <div className="absolute z-10 mt-2 w-full rounded-2xl neu-raised">
              <div className="max-h-48 overflow-y-auto p-2">
                {filteredMustVisitSuggestions.map((place) => (
                  <button
                    key={place}
                    onClick={() => handleAddMustVisit(place)}
                    className="w-full flex items-center space-x-2 rounded-xl px-3 py-2 text-left hover:bg-muted/50 transition-smooth"
                  >
                    <Icon name="MapPinIcon" size={16} className="text-success" />
                    <span className="text-sm text-foreground">{place}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {mustVisit.map((place) => (
            <div
              key={place}
              className="flex items-center space-x-2 px-4 py-2 rounded-2xl neu-flat text-success text-sm font-medium"
            >
              <Icon name="CheckCircleIcon" size={16} variant="solid" />
              <span>{place}</span>
              <button onClick={() => handleRemoveMustVisit(place)} className="hover:opacity-70">
                <Icon name="XMarkIcon" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Places to Avoid */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Places to Avoid</label>
        <div className="relative">
          <input
            type="text"
            value={avoidInput}
            onChange={(e) => {
              setAvoidInput(e.target.value);
              setShowAvoidSuggestions(true);
            }}
            onKeyDown={handleAvoidKeyDown}
            onFocus={() => setShowAvoidSuggestions(true)}
            placeholder="Add places you want to skip"
            className="w-full rounded-2xl neu-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-neu-inset transition-smooth"
          />
          {showAvoidSuggestions && filteredAvoidSuggestions.length > 0 && (
            <div className="absolute z-10 mt-2 w-full rounded-2xl neu-raised">
              <div className="max-h-48 overflow-y-auto p-2">
                {filteredAvoidSuggestions.map((place) => (
                  <button
                    key={place}
                    onClick={() => handleAddAvoid(place)}
                    className="w-full flex items-center space-x-2 rounded-xl px-3 py-2 text-left hover:bg-muted/50 transition-smooth"
                  >
                    <Icon name="MapPinIcon" size={16} className="text-destructive" />
                    <span className="text-sm text-foreground">{place}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {placesToAvoid.map((place) => (
            <div
              key={place}
              className="flex items-center space-x-2 px-4 py-2 rounded-2xl neu-flat text-destructive text-sm font-medium"
            >
              <Icon name="XCircleIcon" size={16} variant="solid" />
              <span>{place}</span>
              <button onClick={() => handleRemoveAvoid(place)} className="hover:opacity-70">
                <Icon name="XMarkIcon" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlacePreferences;