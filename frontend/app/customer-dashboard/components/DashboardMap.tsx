'use client';

import { MapPin, Maximize2 } from 'lucide-react';

export default function DashboardMap() {
    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-700" />
                    <h3 className="font-bold text-gray-900">Trip Map</h3>
                </div>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            {/* Map Container - Using a simple placeholder */}
            <div className="relative w-full h-48 bg-gradient-to-br from-blue-100 to-green-100 rounded-xl overflow-hidden">
                {/* Map Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium">Delhi, India</p>
                        <p className="text-xs text-gray-500">15 locations marked</p>
                    </div>
                </div>

                {/* Location Markers */}
                <div className="absolute top-8 left-12 w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                <div className="absolute top-16 right-16 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                <div className="absolute bottom-12 left-20 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg" />
                <div className="absolute bottom-8 right-12 w-6 h-6 bg-yellow-500 rounded-full border-2 border-white shadow-lg" />
            </div>

            {/* Map Legend */}
            <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-gray-600">Hotels</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-gray-600">Restaurants</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-gray-600">Attractions</span>
                </div>
            </div>
        </div>
    );
}
