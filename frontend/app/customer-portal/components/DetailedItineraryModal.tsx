'use client';

import { useState, useEffect } from 'react';
import ItineraryView from '@/components/itinerary/ItineraryView';
import ReportIssueModal from './ReportIssueModal';
import itineraryDataFile from '@/lib/agent-dashboard/data/itinerary_data.json';

interface DetailedItineraryModalProps {
  tripId: string;
  onClose: () => void;
}

const DetailedItineraryModal = ({ tripId, onClose }: DetailedItineraryModalProps) => {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [itineraryName, setItineraryName] = useState<string>('');
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    console.log('DetailedItineraryModal - tripId:', tripId);
    
    // Find itinerary directly by tripId first
    let itinerary = itineraryDataFile.itineraries.find((itin: any) => itin.groupId === tripId);
    
    // If not found, try to get from mapping
    if (!itinerary) {
      const familyGroupMapStr = sessionStorage.getItem('familyGroupMap');
      if (familyGroupMapStr) {
        const familyGroupMap = JSON.parse(familyGroupMapStr);
        const mappedGroupId = familyGroupMap[tripId];
        console.log('Using mapped groupId:', mappedGroupId);
        itinerary = itineraryDataFile.itineraries.find((itin: any) => itin.groupId === mappedGroupId);
      }
    }
    
    console.log('Available itineraries:', itineraryDataFile.itineraries.map((i: any) => ({ id: i.groupId, name: i.itineraryName })));
    
    if (itinerary) {
      console.log('Found itinerary:', itinerary.itineraryName);
      setGroupId(itinerary.groupId);
      setItineraryName(itinerary.itineraryName);
      setNotFound(false);
    } else {
      console.error('No itinerary found for tripId:', tripId);
      setNotFound(true);
    }
  }, [tripId]);

  if (!groupId && !notFound) {
    return (
      <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-[16px_16px_32px_rgba(0,0,0,0.2),-16px_-16px_32px_rgba(255,255,255,0.9)] max-w-md text-center">
          <div className="w-16 h-16 border-4 border-[#212121] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#212121] mb-2">Loading itinerary...</p>
          <p className="text-sm text-[#212121]/60">Trip ID: {tripId}</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-[#EDEDED] text-[#212121] rounded-xl font-semibold hover:bg-[#E0E0E0] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Check if there was an error loading the itinerary
  if (notFound) {
    return (
      <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#FDFDFF] rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#212121] mb-2">Itinerary Not Available</h3>
          <p className="text-sm text-[#212121]/60 mb-4">
            The itinerary for this trip is not yet available. Please check back later or contact your travel agent.
          </p>
          <p className="text-xs text-[#212121]/40 mb-4">Trip ID: {tripId}</p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#212121] text-[#FDFDFF] rounded-lg font-medium hover:bg-[#212121]/90 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#FDFDFF] rounded-2xl max-w-6xl w-full my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#212121]/10">
          <div>
            <h2 className="text-2xl font-bold text-[#212121]">Trip Itinerary</h2>
            <p className="text-sm text-[#212121]/60 mt-1">{itineraryName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedEvent('General Issue');
                setShowReportIssue(true);
              }}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span>Report Issue</span>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#EDEDED] hover:bg-[#E0E0E0] transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[#212121]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Itinerary Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {groupId && <ItineraryView groupId={groupId} isCustomerView={true} />}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#212121]/10 flex justify-end items-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#212121] text-[#FDFDFF] rounded-lg font-medium hover:bg-[#212121]/90 transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Report Issue Modal */}
      {showReportIssue && (
        <ReportIssueModal
          eventTitle={selectedEvent}
          onClose={() => setShowReportIssue(false)}
        />
      )}
    </div>
  );
};

export default DetailedItineraryModal;
