'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ItineraryView from '@/components/itinerary/ItineraryView';
import itineraryDataFile from '@/lib/agent-dashboard/data/itinerary_data.json';

export default function CustomerItineraryPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const [groupId, setGroupId] = useState<string | null>(null);
  const [itineraryName, setItineraryName] = useState<string>('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    console.log('CustomerItineraryPage - tripId:', tripId);
    
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-900 font-medium mb-2">Loading itinerary...</p>
          <p className="text-sm text-gray-600">Trip ID: {tripId}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Itinerary Not Available</h3>
          <p className="text-sm text-gray-600 mb-4">
            The itinerary for this trip is not yet available. Please check back later or contact your travel agent.
          </p>
          <p className="text-xs text-gray-400 mb-4">Trip ID: {tripId}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-medium hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-teal-500/50"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Itinerary</h1>
                <p className="text-sm text-gray-600">{itineraryName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                </svg>
                <span>Share</span>
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-medium hover:from-teal-600 hover:to-teal-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-teal-500/50">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {groupId && <ItineraryView groupId={groupId} isCustomerView={true} />}
      </div>
    </div>
  );
}
