'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';
import { TimelineEvent } from '@/lib/agent-dashboard/itinerary-data';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TimelineEvent;
}

export default function TicketModal({ isOpen, onClose, event }: TicketModalProps) {
  if (!isOpen) return null;

  const renderTicketContent = () => {
    if (event.type === 'transport' && event.transport) {
      const { transport } = event;
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center border-b border-gray-300 pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Icon 
                name={transport.mode === 'Flight' ? 'PaperAirplaneIcon' : 'TruckIcon'} 
                className="w-8 h-8 text-gray-700"
              />
              <h3 className="text-2xl font-bold text-gray-900">{transport.mode} Ticket</h3>
            </div>
            <p className="text-sm text-gray-600">{transport.providerName}</p>
            {transport.flightNumber && (
              <p className="text-lg font-mono font-bold text-gray-800 mt-1">{transport.flightNumber}</p>
            )}
          </div>

          {/* Journey Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="neu-pressed p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">From</p>
              <p className="font-bold text-gray-900">{transport.pickupLocation.name}</p>
              <p className="text-xs text-gray-600 mt-1">{transport.pickupLocation.address}</p>
            </div>
            <div className="neu-pressed p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">To</p>
              <p className="font-bold text-gray-900">{transport.dropLocation.name}</p>
              <p className="text-xs text-gray-600 mt-1">{transport.dropLocation.address}</p>
            </div>
          </div>

          {/* Booking Reference */}
          <div className="neu-pressed p-4 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Booking Reference</p>
            <p className="text-xl font-mono font-bold text-gray-900 tracking-wider">
              {transport.ticketStatus.bookingReference}
            </p>
            {transport.ticketStatus.pnr && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">PNR</p>
                <p className="text-lg font-mono font-bold text-gray-800">{transport.ticketStatus.pnr}</p>
              </div>
            )}
            {transport.ticketStatus.seatNumbers && transport.ticketStatus.seatNumbers.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Seats</p>
                <div className="flex gap-2 flex-wrap">
                  {transport.ticketStatus.seatNumbers.map((seat) => (
                    <span key={seat} className="neu-badge text-gray-900">{seat}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Driver Details (for Cab) */}
          {transport.driverDetails && (
            <div className="neu-pressed p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Driver Information</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="UserIcon" className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-900">{transport.driverDetails.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="PhoneIcon" className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800">{transport.driverDetails.contact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="TruckIcon" className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800">{transport.driverDetails.vehicleModel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="IdentificationIcon" className="w-4 h-4 text-gray-600" />
                  <span className="font-mono font-bold text-gray-900">{transport.driverDetails.vehicleNumber}</span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Placeholder */}
          <div className="flex justify-center">
            <div className="neu-pressed p-6 rounded-lg">
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <Icon name="QrCodeIcon" className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">Scan at checkpoint</p>
            </div>
          </div>
        </div>
      );
    }

    if (event.type === 'activity' && event.activity) {
      const { activity } = event;
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center border-b border-gray-300 pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Icon name="SparklesIcon" className="w-8 h-8 text-gray-700" />
              <h3 className="text-2xl font-bold text-gray-900">Entry Pass</h3>
            </div>
            <p className="text-lg font-bold text-gray-800 mt-1">{activity.locationName}</p>
            <p className="text-sm text-gray-600">{activity.activityType}</p>
          </div>

          {/* Activity Details */}
          <div className="neu-pressed p-4 rounded-lg">
            <p className="text-sm text-gray-700 leading-relaxed">{activity.description}</p>
          </div>

          {/* Location */}
          <div className="neu-pressed p-4 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Location</p>
            <p className="font-semibold text-gray-900">{activity.locationName}</p>
            <p className="text-sm text-gray-600 mt-1">{activity.address}</p>
          </div>

          {/* Booking Reference */}
          <div className="neu-pressed p-4 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Booking ID</p>
            <p className="text-xl font-mono font-bold text-gray-900 tracking-wider">
              {activity.ticketReference.bookingId}
            </p>
          </div>

          {/* Entry Fee */}
          <div className="neu-pressed p-4 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Entry Fee</p>
            <p className="text-2xl font-bold text-gray-900">
              {activity.entryFee.currency} {activity.entryFee.amount}
              {activity.entryFee.perPerson && <span className="text-sm text-gray-600"> / person</span>}
            </p>
            {activity.entryFee.includes && (
              <p className="text-xs text-gray-600 mt-1">Includes: {activity.entryFee.includes}</p>
            )}
          </div>

          {/* Guide Details */}
          {activity.guideDetails && (
            <div className="neu-pressed p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Guide Information</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="UserIcon" className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-900">{activity.guideDetails.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="PhoneIcon" className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800">{activity.guideDetails.contact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="StarIcon" className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800">{activity.guideDetails.experience} experience</span>
                </div>
              </div>
            </div>
          )}

          {/* Skipper Details */}
          {activity.skipperDetails && (
            <div className="neu-pressed p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Skipper Information</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="UserIcon" className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-900">{activity.skipperDetails.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="PhoneIcon" className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800">{activity.skipperDetails.contact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="TruckIcon" className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800">Boat: {activity.skipperDetails.boatName}</span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="neu-pressed p-6 rounded-lg">
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <Icon name="QrCodeIcon" className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">Scan at entry</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center neu-modal-overlay" onClick={onClose}>
      <div 
        className="neu-modal max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 neu-button p-2 rounded-full"
          aria-label="Close modal"
        >
          <Icon name="XMarkIcon" className="w-6 h-6 text-gray-700" />
        </button>

        {/* Content */}
        {renderTicketContent()}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button className="flex-1 neu-button py-3 px-6 font-semibold text-gray-900 flex items-center justify-center gap-2">
            <Icon name="ArrowDownTrayIcon" className="w-5 h-5" />
            Download
          </button>
          <button className="flex-1 neu-button py-3 px-6 font-semibold text-gray-900 flex items-center justify-center gap-2">
            <Icon name="ShareIcon" className="w-5 h-5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
