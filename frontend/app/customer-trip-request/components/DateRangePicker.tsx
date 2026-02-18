'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  startError?: string;
  endError?: string;
}

const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startError,
  endError,
}: DateRangePickerProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const today = isHydrated ? new Date().toISOString().split('T')[0] : '2026-01-18';
  const maxDate = isHydrated
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : '2027-01-18';

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHydrated) return;
    onStartDateChange(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHydrated) return;
    onEndDateChange(e.target.value);
  };

  if (!isHydrated) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Start Date <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              readOnly
              className="w-full rounded-md border border-input bg-background px-4 py-3 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            End Date <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              readOnly
              className="w-full rounded-md border border-input bg-background px-4 py-3 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Start Date <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            min={today}
            max={maxDate}
            className={`w-full rounded-2xl neu-input px-4 py-3 pr-10 text-foreground focus:outline-none focus:shadow-neu-inset transition-smooth ${
              startError ? 'border border-destructive' : ''
            }`}
          />
          <Icon
            name="CalendarIcon"
            size={20}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
        {startError && (
          <p className="text-sm text-destructive flex items-center space-x-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            <span>{startError}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          End Date <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            min={startDate || today}
            max={maxDate}
            className={`w-full rounded-2xl neu-input px-4 py-3 pr-10 text-foreground focus:outline-none focus:shadow-neu-inset transition-smooth ${
              endError ? 'border border-destructive' : ''
            }`}
          />
          <Icon
            name="CalendarIcon"
            size={20}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
        {endError && (
          <p className="text-sm text-destructive flex items-center space-x-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            <span>{endError}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default DateRangePicker;