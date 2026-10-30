import React from 'react';
import { DiffDTO, DiffItemDTO } from '@/types/dto';
import { PlusCircle, MinusCircle, Clock, Map, Bed, Car, ArrowRight } from 'lucide-react';

export function DiffViewer({ diff }: { diff: DiffDTO }) {
  if (!diff) return null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Itinerary Changes</h2>
        <div className="text-sm text-gray-500">
          Comparing v{diff.version_a} to v{diff.version_b}
        </div>
      </div>

      {diff.added_activities.length > 0 && (
        <DiffSection title="Added Activities" icon={<PlusCircle className="text-green-500 w-5 h-5" />}>
          {diff.added_activities.map((item, i) => (
            <DiffCard key={i} item={item} type="added" />
          ))}
        </DiffSection>
      )}

      {diff.removed_activities.length > 0 && (
        <DiffSection title="Removed Activities" icon={<MinusCircle className="text-red-500 w-5 h-5" />}>
          {diff.removed_activities.map((item, i) => (
            <DiffCard key={i} item={item} type="removed" />
          ))}
        </DiffSection>
      )}

      {diff.time_changes.length > 0 && (
        <DiffSection title="Time Changes" icon={<Clock className="text-yellow-500 w-5 h-5" />}>
          {diff.time_changes.map((item, i) => (
            <DiffCard key={i} item={item} type="time" />
          ))}
        </DiffSection>
      )}

      {diff.moved_activities.length > 0 && (
        <DiffSection title="Moved Activities" icon={<Map className="text-blue-500 w-5 h-5" />}>
          {diff.moved_activities.map((item, i) => (
            <DiffCard key={i} item={item} type="moved" />
          ))}
        </DiffSection>
      )}

      {diff.hotel_changes.length > 0 && (
        <DiffSection title="Hotel Changes" icon={<Bed className="text-purple-500 w-5 h-5" />}>
          {diff.hotel_changes.map((item, i) => (
            <DiffCard key={i} item={item} type="hotel" />
          ))}
        </DiffSection>
      )}

      {diff.transport_changes.length > 0 && (
        <DiffSection title="Transport Changes" icon={<Car className="text-gray-500 w-5 h-5" />}>
          {diff.transport_changes.map((item, i) => (
            <DiffCard key={i} item={item} type="transport" />
          ))}
        </DiffSection>
      )}
      
      {diff.added_activities.length === 0 && diff.removed_activities.length === 0 && 
       diff.time_changes.length === 0 && diff.moved_activities.length === 0 && 
       diff.hotel_changes.length === 0 && diff.transport_changes.length === 0 && (
         <div className="text-center py-10 text-gray-500">No changes detected between these versions.</div>
       )}
    </div>
  );
}

function DiffSection({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-medium text-gray-800">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function DiffCard({ item, type }: { item: DiffItemDTO, type: 'added' | 'removed' | 'moved' | 'time' | 'hotel' | 'transport' }) {
  const getStyle = () => {
    switch(type) {
      case 'added': return 'border-green-200 bg-green-50/30';
      case 'removed': return 'border-red-200 bg-red-50/30';
      case 'time': return 'border-yellow-200 bg-yellow-50/30';
      case 'moved': return 'border-blue-200 bg-blue-50/30';
      case 'hotel': return 'border-purple-200 bg-purple-50/30';
      case 'transport': return 'border-gray-200 bg-gray-50/30';
      default: return 'border-gray-200';
    }
  };

  const title = item.after?.title || item.before?.title || 'Unknown Activity';

  return (
    <div className={`bp-card rounded-lg p-4 border ${getStyle()}`}>
      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
      
      {type === 'added' && item.after && (
        <div className="text-sm text-green-700">Added to Day {item.after.day || '?'} at {item.after.start_time || '?'}</div>
      )}
      
      {type === 'removed' && item.before && (
        <div className="text-sm text-red-700 line-through decoration-red-300">Was on Day {item.before.day || '?'} at {item.before.start_time || '?'}</div>
      )}
      
      {type === 'time' && item.before && item.after && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="line-through">{item.before.start_time}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-medium text-yellow-700">{item.after.start_time}</span>
        </div>
      )}
      
      {type === 'moved' && item.before && item.after && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Day {item.before.day}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-medium text-blue-700">Day {item.after.day}</span>
        </div>
      )}
      
      {item.reason && (
        <div className="mt-3 text-xs bg-white/60 p-2 rounded text-gray-600 italic">
          &quot;{item.reason}&quot;
        </div>
      )}
    </div>
  );
}
