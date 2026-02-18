'use client';

import { Share2, Download, Heart, Clock, MapPin, Users } from 'lucide-react';

interface TripHeaderProps {
    tripId: string;
}

export default function TripHeader({ tripId }: TripHeaderProps) {
    // Mock data - in production, fetch based on tripId
    const tripData = {
        name: 'Delhi Grand Tour',
        destination: 'Delhi, India',
        dates: 'March 15 - 17, 2026',
        duration: '3 days',
        locations: 15,
        travelers: 4,
        status: 'active'
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-gray-900">{tripData.name}</h1>
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${tripData.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                            {tripData.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{tripData.destination}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{tripData.dates} • {tripData.duration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">{tripData.travelers} travelers</span>
                        </div>
                    </div>
                </div>

                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Heart className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button className="bg-gray-900 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-black transition-all">
                    <Share2 className="w-4 h-4" />
                    Share Trip
                </button>
                <button className="bg-gray-100 text-gray-900 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all">
                    <Download className="w-4 h-4" />
                    Export PDF
                </button>
            </div>
        </div>
    );
}
