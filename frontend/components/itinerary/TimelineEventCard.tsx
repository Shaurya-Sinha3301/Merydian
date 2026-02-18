'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { TimelineEvent, formatTime, getDisruptionColor, getDisruptionIcon } from '@/lib/agent-dashboard/itinerary-data';
import TicketModal from './TicketModal';

interface TimelineEventCardProps {
  event: TimelineEvent;
  isLast?: boolean;
}

export default function TimelineEventCard({ event, isLast = false }: TimelineEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const getEventIcon = () => {
    if (event.type === 'transport') {
      if (event.transport?.mode === 'Flight') return 'PaperAirplaneIcon';
      if (event.transport?.mode === 'Train') return 'TruckIcon';
      return 'TruckIcon';
    }
    if (event.type === 'activity') return 'SparklesIcon';
    if (event.type === 'accommodation') return 'HomeIcon';
    if (event.type === 'meal') return 'CakeIcon';
    return 'MapPinIcon';
  };

  const getEventColor = () => {
    // If there's a disruption, use disruption colors
    if (event.disruption) {
      if (event.disruption.severity === 'critical') return 'text-red-600 bg-red-50';
      if (event.disruption.severity === 'high') return 'text-orange-600 bg-orange-50';
      if (event.disruption.severity === 'medium') return 'text-yellow-600 bg-yellow-50';
      return 'text-blue-600 bg-blue-50';
    }
    
    // Normal colors
    const colors = {
      transport: 'text-blue-600 bg-blue-50',
      activity: 'text-purple-600 bg-purple-50',
      accommodation: 'text-green-600 bg-green-50',
      meal: 'text-orange-600 bg-orange-50',
    };
    return colors[event.type] || 'text-gray-600 bg-gray-50';
  };

  const getStatusBadge = () => {
    if (event.status === 'delayed') {
      return <span className="neu-badge bg-yellow-100 text-yellow-800 border-yellow-200">⏱️ Delayed</span>;
    }
    if (event.status === 'cancelled') {
      return <span className="neu-badge bg-red-100 text-red-800 border-red-200">❌ Cancelled</span>;
    }
    if (event.status === 'modified') {
      return <span className="neu-badge bg-orange-100 text-orange-800 border-orange-200">🔄 Modified</span>;
    }
    return <span className="neu-badge bg-green-100 text-green-800 border-green-200">✓ Confirmed</span>;
  };

  const hasTicket = () => {
    return (
      (event.type === 'transport' && event.transport?.ticketStatus) ||
      (event.type === 'activity' && event.activity?.ticketReference)
    );
  };

  return (
    <>
      <div className="flex gap-4 relative">
        {/* Timeline Line & Icon */}
        <div className="flex flex-col items-center">
          <div className={`neu-icon-circle w-12 h-12 shrink-0 ${getEventColor()}`}>
            <Icon name={getEventIcon()} className="w-6 h-6" />
          </div>
          {!isLast && <div className="neu-timeline-line flex-1 mt-2 min-h-[60px]" />}
        </div>

        {/* Event Card */}
        <div className="flex-1 pb-8">
          {/* Disruption Alert */}
          {event.disruption && (
            <div className={`neu-card p-4 mb-4 border-l-4 ${
              event.disruption.severity === 'critical' ? 'border-red-500 bg-red-50' :
              event.disruption.severity === 'high' ? 'border-orange-500 bg-orange-50' :
              event.disruption.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <div className="flex items-start gap-3">
                <Icon 
                  name={getDisruptionIcon(event.disruption.type)} 
                  className={`w-5 h-5 mt-0.5 ${
                    event.disruption.severity === 'critical' ? 'text-red-600' :
                    event.disruption.severity === 'high' ? 'text-orange-600' :
                    event.disruption.severity === 'medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">{event.disruption.title}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      event.disruption.severity === 'critical' ? 'bg-red-200 text-red-800' :
                      event.disruption.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                      event.disruption.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {event.disruption.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{event.disruption.description}</p>
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>Impact:</strong> {event.disruption.impact}
                  </p>
                  {event.disruption.suggestedAction && (
                    <p className="text-xs text-gray-700 italic bg-white/50 p-2 rounded">
                      💡 <strong>AI Suggestion:</strong> {event.disruption.suggestedAction}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`neu-card neu-card-hover p-6 cursor-pointer ${
            event.disruption ? 'opacity-75' : ''
          }`} onClick={() => setIsExpanded(!isExpanded)}>
            {/* Time Badge & Status */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="neu-badge">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </div>
                {getStatusBadge()}
              </div>
              <Icon 
                name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} 
                className="w-5 h-5 text-gray-500"
              />
            </div>

            {/* Title & Description */}
            <h4 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h4>
            <p className="text-sm text-gray-600 mb-4">{event.description}</p>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-2">
              <span className="neu-badge capitalize bg-gray-100">{event.type}</span>
              {event.transport && (
                <span className="neu-badge bg-blue-100 text-blue-800">{event.transport.mode}</span>
              )}
              {event.activity && (
                <span className="neu-badge bg-purple-100 text-purple-800">{event.activity.activityType}</span>
              )}
              {event.meal && (
                <span className="neu-badge bg-orange-100 text-orange-800">{event.meal.mealType}</span>
              )}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-6 pt-6 border-t border-gray-300 space-y-4">
                {/* Transport Details */}
                {event.type === 'transport' && event.transport && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="neu-pressed p-4 rounded-lg bg-blue-50">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">From</p>
                        <p className="font-bold text-gray-900">{event.transport.pickupLocation.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{event.transport.pickupLocation.address}</p>
                      </div>
                      <div className="neu-pressed p-4 rounded-lg bg-blue-50">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">To</p>
                        <p className="font-bold text-gray-900">{event.transport.dropLocation.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{event.transport.dropLocation.address}</p>
                      </div>
                    </div>

                    {event.transport.driverDetails && (
                      <div className="neu-pressed p-4 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Driver Information</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Name</p>
                            <p className="font-semibold text-gray-900">{event.transport.driverDetails.name}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Contact</p>
                            <p className="font-semibold text-gray-900">{event.transport.driverDetails.contact}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Vehicle</p>
                            <p className="font-semibold text-gray-900">{event.transport.driverDetails.vehicleModel}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Number</p>
                            <p className="font-mono font-bold text-gray-900">{event.transport.driverDetails.vehicleNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Activity Details */}
                {event.type === 'activity' && event.activity && (
                  <div className="space-y-4">
                    <div className="neu-pressed p-4 rounded-lg bg-purple-50">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Location</p>
                      <p className="font-bold text-gray-900">{event.activity.locationName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.activity.address}</p>
                    </div>

                    <div className="neu-pressed p-4 rounded-lg bg-purple-50">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Entry Fee</p>
                      <p className="text-xl font-bold text-gray-900">
                        {event.activity.entryFee.currency} {event.activity.entryFee.amount}
                        {event.activity.entryFee.perPerson && <span className="text-sm text-gray-600"> / person</span>}
                      </p>
                      {event.activity.entryFee.includes && (
                        <p className="text-xs text-gray-600 mt-1">Includes: {event.activity.entryFee.includes}</p>
                      )}
                    </div>

                    {event.activity.guideDetails && (
                      <div className="neu-pressed p-4 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Guide</p>
                        <p className="font-semibold text-gray-900">{event.activity.guideDetails.name}</p>
                        <p className="text-sm text-gray-600">{event.activity.guideDetails.contact}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Accommodation Details */}
                {event.type === 'accommodation' && event.accommodation && (
                  <div className="space-y-4">
                    <div className="neu-pressed p-4 rounded-lg bg-green-50">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Hotel</p>
                      <p className="font-bold text-gray-900 text-lg">{event.accommodation.hotelName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.accommodation.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="neu-pressed p-4 rounded-lg bg-green-50">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Room Type</p>
                        <p className="font-semibold text-gray-900">{event.accommodation.roomType}</p>
                      </div>
                      <div className="neu-pressed p-4 rounded-lg bg-green-50">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Rooms</p>
                        <p className="font-semibold text-gray-900">{event.accommodation.roomNumbers.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meal Details */}
                {event.type === 'meal' && event.meal && (
                  <div className="space-y-4">
                    <div className="neu-pressed p-4 rounded-lg bg-orange-50">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Restaurant</p>
                      <p className="font-bold text-gray-900">{event.meal.restaurantName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.meal.location}</p>
                    </div>

                    <div className="neu-pressed p-4 rounded-lg bg-orange-50">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Cuisine</p>
                      <p className="font-semibold text-gray-900">{event.meal.cuisine}</p>
                      {event.meal.specialArrangements && (
                        <p className="text-xs text-gray-600 mt-2">✨ {event.meal.specialArrangements}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* View Ticket Button */}
                {hasTicket() && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTicketModal(true);
                    }}
                    className="neu-button w-full py-3 px-6 font-semibold text-gray-900 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100"
                  >
                    <Icon name="TicketIcon" className="w-5 h-5" />
                    View Ticket / Pass
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {showTicketModal && (
        <TicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          event={event}
        />
      )}
    </>
  );
}
