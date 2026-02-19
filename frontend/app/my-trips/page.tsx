'use client';

import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Plus } from 'lucide-react';
import DashboardNavbar from '../customer-dashboard/components/DashboardNavbar';
import Icon from '@/components/ui/AppIcon';

export default function MyTripsPage() {
  const trips = [
    {
      id: 'delhi_2026',
      name: 'Delhi Grand Tour',
      destination: 'Delhi, India',
      dates: 'March 15 - 17, 2026',
      status: 'active',
      image: '/delhi-gate.jpg', // Placeholder or use a gradient
    }
  ];

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <DashboardNavbar />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
            <p className="text-gray-500 mt-1">Manage your upcoming and past adventures</p>
          </div>
          <Link
            href="/itinerary-selection"
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-black transition-colors shadow-lg shadow-gray-900/10"
          >
            <Plus size={18} />
            <span>Plan New Trip</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
              <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-green-700 uppercase tracking-wide">
                  {trip.status}
                </div>
                <div className="flex items-center justify-center h-full text-indigo-300">
                  <Icon name="MapPinIcon" size={48} />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{trip.name}</h3>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <MapPin size={16} />
                  <span>{trip.destination}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Calendar size={16} />
                  <span>{trip.dates}</span>
                </div>
              </div>

              <Link
                href={`/trip/${trip.id}`}
                className="block w-full text-center bg-gray-50 text-gray-900 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 group-hover:bg-gray-900 group-hover:text-white"
              >
                <span>View Trip Details</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}

          {/* Empty State / Add New Card */}
          <Link href="/itinerary-selection" className="border-2 border-dashed border-gray-200 rounded-3xl p-5 flex flex-col items-center justify-center text-center hover:border-gray-300 hover:bg-gray-50 transition-all group min-h-[360px]">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4 group-hover:bg-white group-hover:shadow-md transition-all">
              <Plus size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Plan a New Adventure</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-[200px]">Start planning your next dream trip with our AI assistant</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
