import React from 'react';
import { TimelineActivityDTO } from '@/types/dto';
import { MapPin, Clock, AlertTriangle, Car, Plane, Train } from 'lucide-react';

export function TimelineActivity({ activity }: { activity: TimelineActivityDTO }) {
  const isHotel = activity.category.toLowerCase() === 'hotel' || activity.category.toLowerCase() === 'lodging';
  const isTransport = activity.category.toLowerCase() === 'transport' || activity.category.toLowerCase() === 'flight';

  if (isHotel) return <TimelineHotel activity={activity} />;
  if (isTransport) return <TimelineTransport activity={activity} />;

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center min-w-[60px]">
        <div className="text-sm font-semibold text-gray-700">{activity.start_time || '--:--'}</div>
        <div className="flex-1 w-px bg-gray-200 my-2 group-last:hidden"></div>
      </div>
      
      <div className="flex-1 pb-6">
        <div className="bp-card rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-base font-semibold text-gray-900">{activity.title}</h4>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                <span>{activity.location}</span>
                <span className="mx-2">•</span>
                <Clock className="w-3.5 h-3.5 mr-1" />
                <span>{activity.duration_min} min</span>
              </div>
            </div>
            {activity.category && (
              <span className="bp-tag bp-tag-confirmed bg-gray-100 text-gray-700">{activity.category}</span>
            )}
          </div>
          
          {activity.notes && (
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">{activity.notes}</p>
          )}

          {activity.warnings && activity.warnings.length > 0 && (
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded-md text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                {activity.warnings.map((w, i) => <span key={i}>{w}</span>)}
              </div>
            </div>
          )}

          {activity.travel_time_min > 0 && (
            <div className="flex items-center text-xs text-gray-500 mt-2 border-t pt-2 border-gray-100">
              <Car className="w-3 h-3 mr-1" />
              <span>{activity.travel_time_min} min travel</span>
              {activity.travel_mode && <span className="ml-1">via {activity.travel_mode}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineHotel({ activity }: { activity: TimelineActivityDTO }) {
  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center min-w-[60px]">
        <div className="text-sm font-semibold text-indigo-700">{activity.start_time || 'Check-in'}</div>
        <div className="flex-1 w-px bg-indigo-200 my-2 group-last:hidden"></div>
      </div>
      <div className="flex-1 pb-6">
        <div className="bp-card border-indigo-100 bg-indigo-50/30 rounded-xl p-4">
          <h4 className="text-base font-semibold text-indigo-900">{activity.title}</h4>
          <div className="flex items-center text-sm text-indigo-700/70 mt-1">
            <MapPin className="w-3.5 h-3.5 mr-1" />
            <span>{activity.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineTransport({ activity }: { activity: TimelineActivityDTO }) {
  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center min-w-[60px]">
        <div className="text-sm font-semibold text-sky-700">{activity.start_time || 'Depart'}</div>
        <div className="flex-1 w-px bg-sky-200 my-2 group-last:hidden"></div>
      </div>
      <div className="flex-1 pb-6">
        <div className="bp-card border-sky-100 bg-sky-50/30 rounded-xl p-4 flex justify-between items-center">
          <div>
            <h4 className="text-base font-semibold text-sky-900">{activity.title}</h4>
            <div className="text-sm text-sky-700/70 mt-1">{activity.notes || 'Transport segment'}</div>
          </div>
          <div className="p-2 bg-white rounded-full text-sky-500 shadow-sm border border-sky-100">
             {activity.travel_mode?.toLowerCase() === 'flight' ? <Plane className="w-4 h-4" /> : <Train className="w-4 h-4" />}
          </div>
        </div>
      </div>
    </div>
  );
}
