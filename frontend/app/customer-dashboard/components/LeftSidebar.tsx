'use client';

import { Plus, MapPin, Calendar, DollarSign, TrendingDown } from 'lucide-react';
import { useState } from 'react';

export default function LeftSidebar() {
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'upcoming' | 'past'>('active');

    const tripData = {
        destination: 'Paris, France',
        startDate: '2026-03-15',
        endDate: '2026-03-22',
        duration: 7,
        activities: 18,
        hotels: 2,
        restaurants: 12,
        attractions: 6,
        totalCost: 3500,
        estimatedCost: 4200,
        savings: 700,
    };

    return (
        <div className="sticky top-20 h-[calc(100vh-6rem)] flex flex-col gap-6">

            {/* Create New Trip Button */}
            <button className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-md hover:shadow-lg">
                <Plus className="w-5 h-5" />
                Create New Trip
            </button>

            {/* Filter Tabs */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">My Trips</h3>
                <div className="space-y-1">
                    {[
                        { key: 'all', label: 'All Trips', count: 3 },
                        { key: 'active', label: 'Active', count: 1 },
                        { key: 'upcoming', label: 'Upcoming', count: 1 },
                        { key: 'past', label: 'Past', count: 1 },
                    ].map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setActiveFilter(filter.key as any)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${activeFilter === filter.key
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span>{filter.label}</span>
                            <span className="text-xs font-bold">{filter.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Itinerary Overview - Moved from Right Sidebar */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-gray-700" />
                    <h3 className="font-bold text-gray-900">Itinerary Overview</h3>
                </div>

                {/* Trip Info */}
                <div className="space-y-3 mb-4">
                    <div>
                        <div className="text-lg font-bold text-gray-900">{tripData.destination}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {new Date(tripData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -
                                {new Date(tripData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{tripData.duration} days</div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Activities</div>
                        <div className="text-xl font-bold text-gray-900">{tripData.activities}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Hotels</div>
                        <div className="text-xl font-bold text-gray-900">{tripData.hotels}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Restaurants</div>
                        <div className="text-xl font-bold text-gray-900">{tripData.restaurants}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Attractions</div>
                        <div className="text-xl font-bold text-gray-900">{tripData.attractions}</div>
                    </div>
                </div>

                {/* Cost Summary */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total Cost</span>
                        <span className="font-bold text-gray-900">${tripData.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Original Estimate</span>
                        <span className="text-gray-500 line-through">${tripData.estimatedCost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2">
                        <TrendingDown className="w-4 h-4 text-green-600" />
                        <div className="flex-1">
                            <div className="text-xs text-green-700 font-medium">You saved</div>
                            <div className="text-sm font-bold text-green-800">${tripData.savings.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>Trip Progress</span>
                        <span>75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gray-900 h-2 rounded-full" style={{ width: '75%' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
