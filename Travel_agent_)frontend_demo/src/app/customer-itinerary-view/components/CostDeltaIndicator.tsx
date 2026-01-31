'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CostDeltaIndicatorProps {
  oldCost: number;
  newCost: number;
  oldDuration?: number;
  newDuration?: number;
  isVisible: boolean;
}

const CostDeltaIndicator = ({
  oldCost,
  newCost,
  oldDuration,
  newDuration,
  isVisible,
}: CostDeltaIndicatorProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, newCost, newDuration]);

  if (!isVisible) return null;

  const costDelta = newCost - oldCost;
  const costPercentChange = ((costDelta / oldCost) * 100).toFixed(1);
  const durationDelta = newDuration && oldDuration ? newDuration - oldDuration : null;

  const isIncrease = costDelta > 0;
  const isDurationIncrease = durationDelta ? durationDelta > 0 : false;

  return (
    <div
      className={`bg-card rounded-lg border-2 ${
        isIncrease ? 'border-warning' : 'border-success'
      } shadow-elevation-3 p-6 transition-smooth ${
        isAnimating ? 'animate-slide-in-from-top' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              isIncrease ? 'bg-warning/10' : 'bg-success/10'
            }`}
          >
            <Icon
              name={isIncrease ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'}
              size={24}
              className={isIncrease ? 'text-warning' : 'text-success'}
              variant="solid"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Cost Impact Analysis</h3>
            <p className="text-sm text-muted-foreground">Changes affect your trip budget</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-muted rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Previous Total</p>
          <p className="text-2xl font-semibold text-foreground">
            ${oldCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">New Total</p>
          <p className="text-2xl font-semibold text-foreground">
            ${newCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between p-4 bg-background rounded-lg">
        <div className="flex items-center space-x-3">
          <Icon
            name={isIncrease ? 'ArrowUpIcon' : 'ArrowDownIcon'}
            size={20}
            className={isIncrease ? 'text-warning' : 'text-success'}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isIncrease ? 'Cost Increase' : 'Cost Savings'}
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.abs(parseFloat(costPercentChange))}% {isIncrease ? 'higher' : 'lower'} than original
            </p>
          </div>
        </div>
        <p className={`text-xl font-semibold ${isIncrease ? 'text-warning' : 'text-success'}`}>
          {isIncrease ? '+' : '-'}$
          {Math.abs(costDelta).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {durationDelta !== null && durationDelta !== 0 && (
        <div className="mt-3 flex items-center space-x-2 p-3 bg-muted rounded-lg">
          <Icon
            name="ClockIcon"
            size={16}
            className={isDurationIncrease ? 'text-warning' : 'text-success'}
          />
          <p className="text-sm text-foreground">
            Duration {isDurationIncrease ? 'increased' : 'decreased'} by{' '}
            <span className="font-semibold">{Math.abs(durationDelta)} day(s)</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default CostDeltaIndicator;