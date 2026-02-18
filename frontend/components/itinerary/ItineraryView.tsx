'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { getItineraryByGroupId, formatDate } from '@/lib/agent-dashboard/itinerary-data';
import TimelineEventCard from './TimelineEventCard';

interface ItineraryViewProps {
  groupId: string;
}

export default function ItineraryView({ groupId }: ItineraryViewProps) {
  const itinerary = getItineraryByGroupId(groupId);
  const [selectedDay, setSelectedDay] = useState(1);

  if (!itinerary) {
    return (
      <div className="neu-card p-8 text-center">
        <Icon name="ExclamationTriangleIcon" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Itinerary Found</h3>
        <p className="text-gray-600">No itinerary data available for group {groupId}</p>
      </div>
    );
  }

  const currentDay = itinerary.days.find(day => day.dayNumber === selectedDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="neu-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{itinerary.itineraryName}</h2>
            <p className="text-gray-600">
              {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
            </p>
          </div>
          <div className="neu-badge text-lg px-4 py-2">
            {itinerary.totalDays} Days
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {itinerary.days.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => setSelectedDay(day.dayNumber)}
              className={`neu-button px-6 py-3 whitespace-nowrap transition-all ${
                selectedDay === day.dayNumber
                  ? 'neu-pressed'
                  : ''
              }`}
            >
              <div className="text-left">
                <p className="text-xs text-gray-600 uppercase font-semibold">Day {day.dayNumber}</p>
                <p className="font-bold text-gray-900">{day.title}</p>
                <p className="text-xs text-gray-500">{formatDate(day.date)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {currentDay && (
        <div className="neu-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <Icon name="ClockIcon" className="w-6 h-6 text-gray-700" />
            <h3 className="text-2xl font-bold text-gray-900">
              Day {currentDay.dayNumber}: {currentDay.title}
            </h3>
          </div>

          {/* Events Timeline */}
          <div className="space-y-0">
            {currentDay.timelineEvents.map((event, index) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                isLast={index === currentDay.timelineEvents.length - 1}
              />
            ))}
          </div>

          {/* Day Summary */}
          <div className="mt-8 pt-8 border-t border-gray-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="neu-pressed p-4 rounded-lg text-center">
                <Icon name="TruckIcon" className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {currentDay.timelineEvents.filter(e => e.type === 'transport').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold">Transports</p>
              </div>
              <div className="neu-pressed p-4 rounded-lg text-center">
                <Icon name="SparklesIcon" className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {currentDay.timelineEvents.filter(e => e.type === 'activity').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold">Activities</p>
              </div>
              <div className="neu-pressed p-4 rounded-lg text-center">
                <Icon name="CakeIcon" className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {currentDay.timelineEvents.filter(e => e.type === 'meal').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold">Meals</p>
              </div>
              <div className="neu-pressed p-4 rounded-lg text-center">
                <Icon name="HomeIcon" className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {currentDay.timelineEvents.filter(e => e.type === 'accommodation').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold">Stays</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="flex-1 neu-button py-4 px-6 font-bold text-gray-900 flex items-center justify-center gap-2">
          <Icon name="ArrowDownTrayIcon" className="w-5 h-5" />
          Download Itinerary
        </button>
        <button className="flex-1 neu-button py-4 px-6 font-bold text-gray-900 flex items-center justify-center gap-2">
          <Icon name="ShareIcon" className="w-5 h-5" />
          Share with Group
        </button>
        <button className="flex-1 neu-button py-4 px-6 font-bold text-gray-900 flex items-center justify-center gap-2">
          <Icon name="AdjustmentsHorizontalIcon" className="w-5 h-5" />
          Optimize
        </button>
      </div>
    </div>
  );
}
