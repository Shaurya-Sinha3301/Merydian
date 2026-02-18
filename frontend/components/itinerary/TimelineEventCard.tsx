'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { TimelineEvent, formatTime } from '@/lib/agent-dashboard/itinerary-data';
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
    const colors = {
      transport: 'text-blue-600',
      activity: 'text-purple-600',
      accommodation: 'text-green-600',
      meal: 'text-orange-600',
    };
    return colors[event.type] || 'text-gray-600';
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
          <div className="neu-card neu-card-hover p-6 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            {/* Time Badge */}
            <div className="flex items-start justify-between mb-3">
              <div className="neu-badge">
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
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
              <span className="neu-badge capitalize">{event.type}</span>
              {event.transport && (
                <span className="neu-badge">{event.transport.mode}</span>
              )}
              {event.activity && (
                <span className="neu-badge">{event.activity.activityType}</span>
              )}
              {event.meal && (
                <span className="neu-badge">{event.meal.mealType}</span>
              )}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-6 pt-6 border-t border-gray-300 space-y-4">
                {/* Transport Details */}
                {event.type === 'transport' && event.transport && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="neu-pressed p-4 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">From</p>
                        <p className="font-bold text-gray-900">{event.transport.pickupLocation.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{event.transport.pickupLocation.address}</p>
                      </div>
                      <div className="neu-pressed p-4 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">To</p>
                        <p className="font-bold text-gray-900">{event.transport.dropLocation.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{event.transport.dropLocation.address}</p>
                      </div>
                    </div>

                    {event.transport.driverDetails && (
                      <div className="neu-pressed p-4 rounded-lg">
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
                    <div className="neu-pressed p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Location</p>
                      <p className="font-bold text-gray-900">{event.activity.locationName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.activity.address}</p>
                    </div>

                    <div className="neu-pressed p-4 rounded-lg">
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
                      <div className="neu-pressed p-4 rounded-lg">
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
                    <div className="neu-pressed p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Hotel</p>
                      <p className="font-bold text-gray-900 text-lg">{event.accommodation.hotelName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.accommodation.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="neu-pressed p-4 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Room Type</p>
                        <p className="font-semibold text-gray-900">{event.accommodation.roomType}</p>
                      </div>
                      <div className="neu-pressed p-4 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Rooms</p>
                        <p className="font-semibold text-gray-900">{event.accommodation.roomNumbers.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meal Details */}
                {event.type === 'meal' && event.meal && (
                  <div className="space-y-4">
                    <div className="neu-pressed p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Restaurant</p>
                      <p className="font-bold text-gray-900">{event.meal.restaurantName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.meal.location}</p>
                    </div>

                    <div className="neu-pressed p-4 rounded-lg">
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
                    className="neu-button w-full py-3 px-6 font-semibold text-gray-900 flex items-center justify-center gap-2"
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
