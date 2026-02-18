'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { 
  getItineraryByGroupId, 
  formatDate, 
  hasDisruptions, 
  getDisruptions,
  getDisruptionColor,
  getDisruptionIcon
} from '@/lib/agent-dashboard/itinerary-data';
import TimelineEventCard from './TimelineEventCard';

interface ItineraryViewProps {
  groupId: string;
}

export default function ItineraryView({ groupId }: ItineraryViewProps) {
  const itinerary = getItineraryByGroupId(groupId);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

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
  const hasAnyDisruptions = hasDisruptions(itinerary);
  const allDisruptions = getDisruptions(itinerary);

  return (
    <div className="space-y-6">
      {/* Disruption Alert Banner */}
      {hasAnyDisruptions && (
        <div className="neu-card p-6 border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-transparent">
          <div className="flex items-start gap-4">
            <div className="neu-icon-circle w-12 h-12 shrink-0 bg-red-100 text-red-600">
              <Icon name="ExclamationTriangleIcon" className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                ⚠️ {allDisruptions.length} Active Disruption{allDisruptions.length > 1 ? 's' : ''} Detected
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Your itinerary has been affected by delays, cancellations, or other issues. Our AI agent can help optimize your schedule.
              </p>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setShowOptimizeModal(true)}
                  className="neu-button px-6 py-3 font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-lg flex items-center gap-2"
                >
                  <Icon name="SparklesIcon" className="w-5 h-5" />
                  Optimize with AI Agent
                </button>
                <button className="neu-button px-6 py-3 font-semibold text-gray-900 flex items-center gap-2">
                  <Icon name="InformationCircleIcon" className="w-5 h-5" />
                  View All Issues
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="neu-card p-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{itinerary.itineraryName}</h2>
            <p className="text-gray-600 flex items-center gap-2">
              <Icon name="CalendarIcon" className="w-5 h-5" />
              {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
            </p>
          </div>
          <div className="neu-badge text-lg px-4 py-2 bg-blue-100 text-blue-800 border-blue-200">
            {itinerary.totalDays} Days
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {itinerary.days.map((day) => {
            const dayHasDisruptions = day.timelineEvents.some(e => e.disruption);
            return (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`neu-button px-6 py-3 whitespace-nowrap transition-all relative ${
                  selectedDay === day.dayNumber
                    ? 'neu-pressed bg-blue-50'
                    : ''
                }`}
              >
                {dayHasDisruptions && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
                <div className="text-left">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Day {day.dayNumber}</p>
                  <p className="font-bold text-gray-900">{day.title}</p>
                  <p className="text-xs text-gray-500">{formatDate(day.date)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      {currentDay && (
        <div className="neu-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <Icon name="ClockIcon" className="w-6 h-6 text-blue-600" />
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
              <div className="neu-pressed p-4 rounded-lg text-center bg-blue-50">
                <Icon name="TruckIcon" className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {currentDay.timelineEvents.filter(e => e.type === 'transport').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold">Transports</p>
              </div>
              <div className="neu-pressed p-4 rounded-lg text-center bg-purple-50">
                <Icon name="SparklesIcon" className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {currentDay.timelineEvents.filter(e => e.type === 'activity').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold">Activities</p>
              </div>
              <div className="neu-pressed p-4 rounded-lg text-center bg-orange-50">
                <Icon name="CakeIcon" className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {currentDay.timelineEvents.filter(e => e.type === 'meal').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold">Meals</p>
              </div>
              <div className="neu-pressed p-4 rounded-lg text-center bg-green-50">
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
        <button className="flex-1 neu-button py-4 px-6 font-bold text-gray-900 flex items-center justify-center gap-2 hover:bg-gray-50">
          <Icon name="ArrowDownTrayIcon" className="w-5 h-5" />
          Download Itinerary
        </button>
        <button className="flex-1 neu-button py-4 px-6 font-bold text-gray-900 flex items-center justify-center gap-2 hover:bg-gray-50">
          <Icon name="ShareIcon" className="w-5 h-5" />
          Share with Group
        </button>
        {hasAnyDisruptions && (
          <button 
            onClick={() => setShowOptimizeModal(true)}
            className="flex-1 neu-button py-4 px-6 font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg flex items-center justify-center gap-2"
          >
            <Icon name="SparklesIcon" className="w-5 h-5" />
            AI Optimize
          </button>
        )}
      </div>

      {/* Optimize Modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center neu-modal-overlay" onClick={() => setShowOptimizeModal(false)}>
          <div 
            className="neu-modal max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowOptimizeModal(false)}
              className="absolute top-4 right-4 neu-button p-2 rounded-full"
            >
              <Icon name="XMarkIcon" className="w-6 h-6 text-gray-700" />
            </button>

            <div className="text-center mb-8">
              <div className="neu-icon-circle w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Icon name="SparklesIcon" className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Itinerary Optimization</h2>
              <p className="text-gray-600">Let our AI agent analyze and resolve all disruptions</p>
            </div>

            {/* Disruptions List */}
            <div className="space-y-4 mb-8">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Detected Issues:</h3>
              {allDisruptions.map(({ event, dayNumber }) => (
                <div key={event.id} className={`neu-card p-4 border-l-4 ${
                  event.disruption?.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  event.disruption?.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                  event.disruption?.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <Icon 
                      name={getDisruptionIcon(event.disruption?.type || 'delay')} 
                      className={`w-5 h-5 mt-0.5 ${
                        event.disruption?.severity === 'critical' ? 'text-red-600' :
                        event.disruption?.severity === 'high' ? 'text-orange-600' :
                        event.disruption?.severity === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-500">DAY {dayNumber}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          event.disruption?.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          event.disruption?.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                          event.disruption?.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {event.disruption?.severity?.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 mb-1">{event.disruption?.title}</p>
                      <p className="text-sm text-gray-700 mb-2">{event.disruption?.description}</p>
                      <p className="text-xs text-gray-600 italic">💡 {event.disruption?.suggestedAction}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Optimization Options */}
            <div className="space-y-4">
              <button className="w-full neu-button py-4 px-6 font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg flex items-center justify-center gap-2">
                <Icon name="SparklesIcon" className="w-5 h-5" />
                Auto-Optimize Entire Itinerary
              </button>
              <button className="w-full neu-button py-4 px-6 font-semibold text-gray-900 flex items-center justify-center gap-2">
                <Icon name="AdjustmentsHorizontalIcon" className="w-5 h-5" />
                Manual Adjustments
              </button>
              <button className="w-full neu-button py-4 px-6 font-semibold text-gray-900 flex items-center justify-center gap-2">
                <Icon name="ChatBubbleLeftRightIcon" className="w-5 h-5" />
                Chat with AI Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
