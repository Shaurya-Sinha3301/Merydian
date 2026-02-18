'use client';

import { useState } from 'react';
import { TimelineEvent, formatTime } from '@/lib/agent-dashboard/itinerary-data';
import TicketModal from './TicketModal';

interface TimelineEventCardProps {
  event: TimelineEvent;
  isLast?: boolean;
}

export default function TimelineEventCard({ event, isLast = false }: TimelineEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const getStatusBadge = () => {
    if (event.status === 'delayed') {
      return <span className="px-3 py-1.5 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-lg">Delayed</span>;
    }
    if (event.status === 'cancelled') {
      return <span className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-800 rounded-lg">Cancelled</span>;
    }
    if (event.status === 'modified') {
      return <span className="px-3 py-1.5 text-xs font-bold bg-orange-100 text-orange-800 rounded-lg">Modified</span>;
    }
    return <span className="px-3 py-1.5 text-xs font-bold bg-green-100 text-green-800 rounded-lg">Confirmed</span>;
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
        {/* Timeline Line */}
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-black shrink-0" />
          {!isLast && <div className="w-0.5 bg-gray-300 flex-1 mt-2 min-h-[60px]" />}
        </div>

        {/* Event Card */}
        <div className="flex-1 pb-8">
          {/* Disruption Alert */}
          {event.disruption && (
            <div className={`p-5 mb-4 rounded-xl border-l-4 ${
              event.disruption.severity === 'critical' ? 'border-red-600 bg-red-50' :
              event.disruption.severity === 'high' ? 'border-orange-600 bg-orange-50' :
              event.disruption.severity === 'medium' ? 'border-yellow-600 bg-yellow-50' :
              'border-blue-600 bg-blue-50'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-bold text-black text-lg">{event.disruption.title}</p>
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                      event.disruption.severity === 'critical' ? 'bg-red-600 text-white' :
                      event.disruption.severity === 'high' ? 'bg-orange-600 text-white' :
                      event.disruption.severity === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      {event.disruption.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{event.disruption.description}</p>
                  <p className="text-xs text-gray-600 mb-3">
                    <strong>Impact:</strong> {event.disruption.impact}
                  </p>
                  {event.disruption.suggestedAction && (
                    <p className="text-xs text-gray-700 bg-white/70 p-3 rounded-lg">
                      💡 <strong>AI Suggestion:</strong> {event.disruption.suggestedAction}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:border-black transition-colors ${
            event.disruption ? 'opacity-75' : ''
          }`} onClick={() => setIsExpanded(!isExpanded)}>
            {/* Time Badge & Status */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </div>
                {getStatusBadge()}
              </div>
              <span className="text-2xl text-gray-300 font-light">
                {isExpanded ? '−' : '+'}
              </span>
            </div>

            {/* Title & Description */}
            <h4 className="text-xl font-bold text-black mb-2">{event.title}</h4>
            <p className="text-sm text-gray-600 mb-4">{event.description}</p>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-black rounded-lg capitalize">{event.type}</span>
              {event.transport && (
                <span className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-black rounded-lg">{event.transport.mode}</span>
              )}
              {event.activity && (
                <span className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-black rounded-lg">{event.activity.activityType}</span>
              )}
              {event.meal && (
                <span className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-black rounded-lg">{event.meal.mealType}</span>
              )}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                {/* Transport Details */}
                {event.type === 'transport' && event.transport && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">From</p>
                        <p className="font-bold text-black text-lg">{event.transport.pickupLocation.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{event.transport.pickupLocation.address}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">To</p>
                        <p className="font-bold text-black text-lg">{event.transport.dropLocation.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{event.transport.dropLocation.address}</p>
                      </div>
                    </div>

                    {event.transport.driverDetails && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-3">Driver Information</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 text-xs mb-1">Name</p>
                            <p className="font-bold text-black">{event.transport.driverDetails.name}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs mb-1">Contact</p>
                            <p className="font-bold text-black">{event.transport.driverDetails.contact}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs mb-1">Vehicle</p>
                            <p className="font-bold text-black">{event.transport.driverDetails.vehicleModel}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs mb-1">Number</p>
                            <p className="font-mono font-bold text-black">{event.transport.driverDetails.vehicleNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Activity Details */}
                {event.type === 'activity' && event.activity && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-2">Location</p>
                      <p className="font-bold text-black text-lg">{event.activity.locationName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.activity.address}</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-2">Entry Fee</p>
                      <p className="text-2xl font-bold text-black">
                        {event.activity.entryFee.currency} {event.activity.entryFee.amount}
                        {event.activity.entryFee.perPerson && <span className="text-sm text-gray-600"> / person</span>}
                      </p>
                      {event.activity.entryFee.includes && (
                        <p className="text-xs text-gray-600 mt-2">Includes: {event.activity.entryFee.includes}</p>
                      )}
                    </div>

                    {event.activity.guideDetails && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">Guide</p>
                        <p className="font-bold text-black">{event.activity.guideDetails.name}</p>
                        <p className="text-sm text-gray-600">{event.activity.guideDetails.contact}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Accommodation Details */}
                {event.type === 'accommodation' && event.accommodation && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-2">Hotel</p>
                      <p className="font-bold text-black text-xl">{event.accommodation.hotelName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.accommodation.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">Room Type</p>
                        <p className="font-bold text-black">{event.accommodation.roomType}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">Rooms</p>
                        <p className="font-bold text-black">{event.accommodation.roomNumbers.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meal Details */}
                {event.type === 'meal' && event.meal && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-2">Restaurant</p>
                      <p className="font-bold text-black text-lg">{event.meal.restaurantName}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.meal.location}</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-2">Cuisine</p>
                      <p className="font-bold text-black">{event.meal.cuisine}</p>
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
                    className="w-full py-3 px-6 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                  >
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
