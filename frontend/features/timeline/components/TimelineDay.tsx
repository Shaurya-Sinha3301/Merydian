import React from 'react';
import { TimelineDayDTO } from '@/types/dto';
import { TimelineActivity } from './TimelineActivity';

export function TimelineDay({ dayData }: { dayData: TimelineDayDTO }) {
  return (
    <div className="mb-10">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md py-3 mb-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Day {dayData.day}</h3>
      </div>
      
      <div className="pl-2">
        {dayData.activities.length === 0 ? (
          <div className="text-sm text-gray-500 italic p-4 border border-dashed rounded-md">No activities planned for this day.</div>
        ) : (
          dayData.activities.map((act) => (
            <TimelineActivity key={act.id} activity={act} />
          ))
        )}
      </div>
    </div>
  );
}
