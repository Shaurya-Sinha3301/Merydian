'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface BudgetRangeSliderProps {
  minBudget: number;
  maxBudget: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  error?: string;
}

const BudgetRangeSlider = ({
  minBudget,
  maxBudget,
  onMinChange,
  onMaxChange,
  error,
}: BudgetRangeSliderProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const MIN_VALUE = 500;
  const MAX_VALUE = 50000;
  const STEP = 500;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHydrated) return;
    const value = parseInt(e.target.value);
    if (value <= maxBudget) {
      onMinChange(value);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHydrated) return;
    const value = parseInt(e.target.value);
    if (value >= minBudget) {
      onMaxChange(value);
    }
  };

  const minPercent = ((minBudget - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;
  const maxPercent = ((maxBudget - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;

  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          Budget Range (USD) <span className="text-destructive">*</span>
        </label>
        <div className="bg-muted rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="text-center">
              <div className="caption text-xs text-muted-foreground mb-1">Minimum</div>
              <div className="text-2xl font-semibold text-foreground">{formatCurrency(minBudget)}</div>
            </div>
            <Icon name="ArrowRightIcon" size={20} className="text-muted-foreground" />
            <div className="text-center">
              <div className="caption text-xs text-muted-foreground mb-1">Maximum</div>
              <div className="text-2xl font-semibold text-foreground">{formatCurrency(maxBudget)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-foreground">
        Budget Range (USD) <span className="text-destructive">*</span>
      </label>
      <div className="neu-concave rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center">
            <div className="caption text-xs text-muted-foreground mb-1">Minimum</div>
            <div className="text-2xl font-semibold text-foreground">{formatCurrency(minBudget)}</div>
          </div>
          <Icon name="ArrowRightIcon" size={20} className="text-muted-foreground" />
          <div className="text-center">
            <div className="caption text-xs text-muted-foreground mb-1">Maximum</div>
            <div className="text-2xl font-semibold text-foreground">{formatCurrency(maxBudget)}</div>
          </div>
        </div>

        <div className="relative h-2 mb-8">
          <div className="absolute w-full h-2 neu-pressed rounded-full" />
          <div
            className="absolute h-2 bg-gradient-to-r from-primary to-accent rounded-full"
            style={{
              left: `${minPercent}%`,
              right: `${100 - maxPercent}%`,
            }}
          />
          <input
            type="range"
            min={MIN_VALUE}
            max={MAX_VALUE}
            step={STEP}
            value={minBudget}
            onChange={handleMinChange}
            className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-neu-sm [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-neu-sm"
          />
          <input
            type="range"
            min={MIN_VALUE}
            max={MAX_VALUE}
            step={STEP}
            value={maxBudget}
            onChange={handleMaxChange}
            className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-neu-sm [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-neu-sm"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(MIN_VALUE)}</span>
          <span>{formatCurrency(MAX_VALUE)}</span>
        </div>
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

export default BudgetRangeSlider;