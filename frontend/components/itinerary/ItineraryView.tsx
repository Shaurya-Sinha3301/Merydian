'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import Image from 'next/image';
import { 
  getItineraryByGroupId, 
  formatDate, 
  hasDisruptions, 
  getDisruptions,
  getDisruptionColor,
  getDisruptionIcon,
  getDefaultImageForEvent
} from '@/lib/agent-dashboard/itinerary-data';
import TimelineEventCard from './TimelineEventCard';
import ImageGalleryModal from './ImageGalleryModal';
import SuggestChangeModal from '@/app/customer-portal/components/SuggestChangeModal';

interface ItineraryViewProps {
  groupId: string;
  isCustomerView?: boolean; // Hide agent-only features when true
}

export default function ItineraryView({ groupId, isCustomerView = false }: ItineraryViewProps) {
  const itinerary = getItineraryByGroupId(groupId);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [showSuggestChange, setShowSuggestChange] = useState(false);
  const [suggestionContext, setSuggestionContext] = useState<{
    eventId: string;
    eventTitle: string;
    eventType?: string;
    eventTime?: string;
    preselectedAction?: string;
  } | null>(null);

  const openGallery = (images: string[], title: string) => {
    // Filter out empty or invalid image URLs
    const validImages = images.filter(img => img && img.trim() !== '');
    if (validImages.length > 0) {
      setGalleryImages(validImages);
      setGalleryTitle(title);
      setShowGallery(true);
    }
  };

  const handleSuggestChange = (eventId: string, eventTitle: string, preselectedAction?: string) => {
    const event = currentDay?.timelineEvents.find(e => e.id === eventId);
    setSuggestionContext({
      eventId,
      eventTitle,
      eventType: event?.type,
      eventTime: event?.startTime,
      preselectedAction
    });
    setShowSuggestChange(true);
  };

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
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      {/* Disruption Alert Banner - Only for agents */}
      {!isCustomerView && hasAnyDisruptions && (
        <div className="bg-black text-white p-6 rounded-2xl">
          <h3 className="text-xl font-bold mb-2">
            {allDisruptions.length} Active Disruption{allDisruptions.length > 1 ? 's' : ''}
          </h3>
          <p className="text-gray-300 mb-4">
            Your itinerary has been affected. Our AI agent can help optimize your schedule.
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowOptimizeModal(true)}
              className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Optimize with AI
            </button>
            <button className="px-6 py-2.5 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors">
              View Issues
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-black text-white p-8 rounded-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">{itinerary.itineraryName}</h2>
            <p className="text-gray-400 text-sm">
              {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
            </p>
          </div>
          <div className="px-4 py-2 bg-white text-black font-bold rounded-lg text-sm">
            {itinerary.totalDays} Days
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {itinerary.days.map((day) => {
            const dayHasDisruptions = day.timelineEvents.some(e => e.disruption);
            return (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`px-6 py-4 whitespace-nowrap transition-all relative rounded-xl min-w-[200px] ${
                  selectedDay === day.dayNumber
                    ? 'bg-white text-black'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {dayHasDisruptions && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
                <div className="text-left">
                  <p className="text-xs uppercase font-semibold opacity-60 mb-1">Day {day.dayNumber}</p>
                  <p className="font-bold text-sm">{day.title}</p>
                  <p className="text-xs opacity-60 mt-1">{formatDate(day.date)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      {currentDay && (
        <div className="space-y-6">
          {/* Day Photo Gallery - Only Activities */}
          {currentDay.timelineEvents.filter(e => e.type === 'activity').length > 0 && (
            <div className="bg-white p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-black">Highlights</h4>
                {currentDay.timelineEvents.filter(e => e.type === 'activity').length > 4 && (
                  <button
                    onClick={() => {
                      const activityEvents = currentDay.timelineEvents.filter(e => e.type === 'activity');
                      const images = activityEvents.map(e => getDefaultImageForEvent(e));
                      openGallery(images, `Day ${currentDay.dayNumber}: ${currentDay.title} - Highlights`);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors"
                  >
                    View All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {currentDay.timelineEvents
                  .filter(e => e.type === 'activity')
                  .slice(0, 4)
                  .map((event, index) => {
                    const imageUrl = getDefaultImageForEvent(event);
                    if (!imageUrl || imageUrl.trim() === '') return null;
                    
                    return (
                      <button
                        key={event.id}
                        onClick={() => {
                          const activityEvents = currentDay.timelineEvents.filter(e => e.type === 'activity');
                          const images = activityEvents.map(e => getDefaultImageForEvent(e));
                          openGallery(images, `Day ${currentDay.dayNumber}: ${currentDay.title} - Highlights`);
                        }}
                        className="relative h-40 rounded-xl overflow-hidden group"
                      >
                        <Image
                          src={imageUrl}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-xs font-bold text-white line-clamp-2">
                            {event.title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Events Timeline */}
          <div className="space-y-0">
            {currentDay.timelineEvents.map((event, index) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                isLast={index === currentDay.timelineEvents.length - 1}
                isCustomerView={isCustomerView}
                dayNumber={currentDay.dayNumber}
                dayTitle={currentDay.title}
                onSuggestChange={isCustomerView ? handleSuggestChange : undefined}
              />
            ))}
          </div>

          {/* Day Summary */}
          <div className="bg-white p-6 rounded-2xl">
            <h4 className="text-lg font-bold text-black mb-4">Day Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-200">
                <p className="text-3xl font-bold text-black">
                  {currentDay.timelineEvents.filter(e => e.type === 'transport').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold mt-2">Transports</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-200">
                <p className="text-3xl font-bold text-black">
                  {currentDay.timelineEvents.filter(e => e.type === 'activity').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold mt-2">Activities</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-200">
                <p className="text-3xl font-bold text-black">
                  {currentDay.timelineEvents.filter(e => e.type === 'meal').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold mt-2">Meals</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-200">
                <p className="text-3xl font-bold text-black">
                  {currentDay.timelineEvents.filter(e => e.type === 'accommodation').length}
                </p>
                <p className="text-xs text-gray-600 uppercase font-semibold mt-2">Stays</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="flex-1 py-4 px-6 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors">
          Download Itinerary
        </button>
        <button className="flex-1 py-4 px-6 bg-white text-black font-semibold rounded-xl border-2 border-black hover:bg-black hover:text-white transition-colors">
          Share with Group
        </button>
        {isCustomerView && (
          <button 
            onClick={() => {
              setSuggestionContext({
                eventId: 'general',
                eventTitle: 'General Suggestion',
                preselectedAction: 'add-place'
              });
              setShowSuggestChange(true);
            }}
            className="flex-1 py-4 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>💡</span>
            <span>Suggest Changes</span>
          </button>
        )}
        {!isCustomerView && hasAnyDisruptions && (
          <button 
            onClick={() => setShowOptimizeModal(true)}
            className="flex-1 py-4 px-6 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            AI Optimize
          </button>
        )}
      </div>

      {/* Optimize Modal - Only for agents */}
      {!isCustomerView && showOptimizeModal && (
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

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        images={galleryImages}
        title={galleryTitle}
      />

      {/* Suggest Change Modal */}
      {isCustomerView && showSuggestChange && suggestionContext && (
        <SuggestChangeModal
          eventId={suggestionContext.eventId}
          eventTitle={suggestionContext.eventTitle}
          eventType={suggestionContext.eventType}
          eventTime={suggestionContext.eventTime}
          dayNumber={currentDay?.dayNumber}
          dayTitle={currentDay?.title}
          preselectedAction={suggestionContext.preselectedAction}
          onClose={() => {
            setShowSuggestChange(false);
            setSuggestionContext(null);
          }}
        />
      )}
    </div>
  );
}
