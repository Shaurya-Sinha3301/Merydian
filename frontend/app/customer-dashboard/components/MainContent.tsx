'use client';

import { Share2, Download, Edit, Heart, Clock, MapPin, DollarSign, Camera } from 'lucide-react';

interface ItineraryItem {
    time: string;
    title: string;
    type: string;
    icon: string;
    is_new?: boolean;
}

interface DayActivity {
    day: string;
    date: string;
    items: ItineraryItem[];
}

interface ItineraryData {
    destination: string;
    start_date: string;
    end_date: string;
    days: DayActivity[];
    stats: {
        activities: number;
        hotels: number;
        restaurants: number;
        attractions: number;
        total_cost: number;
    };
}

interface MainContentProps {
    itineraryData?: ItineraryData;
}

export default function MainContent({ itineraryData }: MainContentProps) {
    // Default activities if no data provided
    const defaultActivities: DayActivity[] = [
        {
            day: 'Day 1',
            date: 'March 15, 2026',
            items: [
                { time: '09:00 AM', title: 'Raj Ghat', type: 'attraction', icon: '🙏', is_new: false },
                { time: '12:30 PM', title: 'Group Lunch', type: 'restaurant', icon: '🍽️', is_new: false },
                { time: '02:00 PM', title: 'Red Fort', type: 'attraction', icon: '🏰', is_new: false },
                { time: '04:30 PM', title: 'Safdarjung Tomb', type: 'attraction', icon: '🏛️', is_new: false },
                { time: '07:30 PM', title: 'Group Dinner', type: 'restaurant', icon: '🍽️', is_new: false },
            ],
        },
        {
            day: 'Day 2',
            date: 'March 16, 2026',
            items: [
                { time: '09:00 AM', title: 'Humayun Tomb', type: 'attraction', icon: '🏛️', is_new: false },
                { time: '11:00 AM', title: 'Akshardham Temple', type: 'attraction', icon: '🛕', is_new: false },
                { time: '01:00 PM', title: 'Late Group Lunch', type: 'restaurant', icon: '🍽️', is_new: false },
                { time: '03:00 PM', title: 'Purana Qila', type: 'attraction', icon: '🏰', is_new: false },
                { time: '07:30 PM', title: 'Day 2 Dinner', type: 'restaurant', icon: '🍽️', is_new: false },
            ],
        },
    ];

    const activities = itineraryData?.days || defaultActivities;

    return (
        <div className="space-y-6">

            {/* Trip Header */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">Delhi, India</h1>
                            <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">Active</span>
                        </div>
                        <div className="flex items-center gap-4 text-gray-600">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">March 15 - 17, 2026 • 3 days</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">15 locations</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-sm">₹45,000</span>
                            </div>
                        </div>
                    </div>

                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Heart className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-gray-800 transition-all">
                        <Edit className="w-4 h-4" />
                        Edit Trip
                    </button>
                    <button className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all">
                        <Share2 className="w-4 h-4" />
                        Share
                    </button>
                    <button className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all">
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Photo Gallery */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-gray-700" />
                        <h2 className="text-xl font-bold text-gray-900">Trip Photos</h2>
                    </div>
                    <button className="text-sm font-semibold text-gray-900 hover:text-gray-700">View All</button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl overflow-hidden group cursor-pointer">
                            <div className="w-full h-full bg-black/0 group-hover:bg-black/20 transition-all" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Trip Timeline</h2>

                <div className="space-y-8">
                    {activities.map((dayActivity, dayIndex) => (
                        <div key={dayIndex}>
                            {/* Day Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-gray-900 text-white px-3 py-1 rounded-lg font-bold text-sm">
                                    {dayActivity.day}
                                </div>
                                <div className="text-sm text-gray-600">{dayActivity.date}</div>
                            </div>

                            {/* Activities */}
                            <div className="space-y-3 ml-4">
                                {dayActivity.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className={`flex gap-4 group ${item.is_new ? 'animate-pulse bg-green-50 rounded-lg p-2 -ml-2' : ''}`}>
                                        {/* Timeline Line */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl group-hover:bg-gray-200 transition-colors ${item.is_new ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                {item.icon}
                                            </div>
                                            {itemIndex < dayActivity.items.length - 1 && (
                                                <div className="w-0.5 h-8 bg-gray-200 my-1" />
                                            )}
                                        </div>

                                        {/* Activity Details */}
                                        <div className="flex-1 pb-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                        {item.title}
                                                        {item.is_new && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">NEW</span>}
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-0.5">{item.time}</div>
                                                </div>
                                                <span className={`text-xs font-medium px-2 py-1 rounded ${item.type === 'attraction' ? 'bg-green-100 text-green-700' :
                                                    item.type === 'restaurant' ? 'bg-blue-100 text-blue-700' :
                                                        item.type === 'hotel' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {item.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Load More */}
                <div className="mt-6 text-center">
                    <button className="text-gray-900 font-semibold text-sm hover:text-gray-700">
                        Load More Days →
                    </button>
                </div>
            </div>
        </div>
    );
}
