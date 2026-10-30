import React from 'react';
import { TimelineDTO } from '@/types/dto';
import { TimelineDay } from './TimelineDay';
import { EmptyState } from '@/components/ui/EmptyState';
import { Map } from 'lucide-react';

export function Timeline({ itinerary }: { itinerary?: TimelineDTO }) {
  if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
    return <EmptyState title="No Itinerary Found" message="This trip does not have a generated itinerary yet." icon={<Map className="w-8 h-8" />} />;
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      {itinerary.days.map((day) => (
        <TimelineDay key={day.day} dayData={day} />
      ))}
    </div>
  );
}
