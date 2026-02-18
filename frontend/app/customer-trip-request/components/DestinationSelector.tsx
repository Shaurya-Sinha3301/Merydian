'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface DestinationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const DestinationSelector = ({ value, onChange, error }: DestinationSelectorProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const popularDestinations = [
    { id: 1, name: 'Paris, France', icon: 'MapPinIcon', description: 'City of Light' },
    { id: 2, name: 'Tokyo, Japan', icon: 'MapPinIcon', description: 'Modern metropolis' },
    { id: 3, name: 'New York, USA', icon: 'MapPinIcon', description: 'The Big Apple' },
    { id: 4, name: 'London, UK', icon: 'MapPinIcon', description: 'Historic capital' },
    { id: 5, name: 'Dubai, UAE', icon: 'MapPinIcon', description: 'Luxury destination' },
    { id: 6, name: 'Barcelona, Spain', icon: 'MapPinIcon', description: 'Mediterranean gem' },
  ];

  const filteredDestinations = isHydrated
    ? popularDestinations.filter((dest) =>
      dest.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : popularDestinations;

  const handleSelect = (destination: string) => {
    if (!isHydrated) return;
    setSearchQuery(destination);
    onChange(destination);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHydrated) return;
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowSuggestions(true);
  };

  if (!isHydrated) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Destination <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={value}
            readOnly
            className="w-full rounded-md border border-input bg-background px-4 py-3 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Where would you like to go?"
          />
        </div>
      </div>
    );
  }

  const handleDelhiSelect = () => {
    if (!isHydrated) return;
    onChange('Delhi, India');
    // We can also trigger a custom event or callback if we want to set dates, 
    // but for now let's just set the destination and let the user pick dates 
    // OR we can export a helper to set defaults.
    // Ideally, the parent should handle "applying a full package".
    // For this component, simply selecting Delhi is good.
    setSearchQuery('Delhi, India');
  };

  return (
    <div className="space-y-6">
      {/* Featured Recommendation - Mock Demo */}
      <div
        onClick={handleDelhiSelect}
        className="cursor-pointer group relative overflow-hidden rounded-3xl neu-raised border border-white/20 p-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="absolute top-0 right-0 bg-primary px-4 py-1 rounded-bl-2xl text-xs font-bold text-white uppercase tracking-wider">
          Recommended
        </div>
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-3xl shadow-neu-sm">
            🇮🇳
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">Delhi Cultural Dive</h3>
            <p className="text-sm text-muted-foreground mt-1">
              3-Day Heritage & Food Tour • Matches your history interests
            </p>
            <div className="mt-3 flex gap-2">
              <span className="text-xs bg-muted px-2 py-1 rounded-lg">Red Fort</span>
              <span className="text-xs bg-muted px-2 py-1 rounded-lg">Chandni Chowk</span>
            </div>
            <p className="text-xs text-primary mt-3 font-medium">Click to auto-fill for demo</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Or search for a destination <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            className={`w-full rounded-2xl neu-input px-4 py-3 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-neu-inset transition-smooth ${error ? 'border border-destructive' : ''
              }`}
            placeholder="Where would you like to go?"
          />
          <Icon
            name="MagnifyingGlassIcon"
            size={20}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          {showSuggestions && filteredDestinations.length > 0 && (
            <div className="absolute z-10 mt-2 w-full rounded-2xl neu-raised bg-background">
              <div className="max-h-60 overflow-y-auto p-2">
                {filteredDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => handleSelect(dest.name)}
                    className="w-full flex items-center space-x-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/50 transition-smooth"
                  >
                    <Icon name={dest.icon as any} size={20} className="text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{dest.name}</div>
                      <div className="caption text-xs text-muted-foreground">{dest.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive flex items-center space-x-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default DestinationSelector;