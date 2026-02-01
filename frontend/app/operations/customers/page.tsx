'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TripStatus, Family } from '@/types/operations';

const FAMILIES: Family[] = [
  {
    id: 'fam-1',
    name: 'The Robinson Family',
    tourId: 'TR-102',
    tourName: 'Best of Singapore 2024',
    currentCity: 'Singapore',
    localTime: '14:20 SGT',
    nextSegment: 'Dinner at Marina Bay Sands @ 19:00',
    status: TripStatus.ON_SCHEDULE,
    sentiment: 'Very Satisfied',
    size: 4,
    tags: ['VIP', 'Adventure']
  },
  {
    id: 'fam-2',
    name: 'Gupta Group',
    tourId: 'TR-102',
    tourName: 'Best of Singapore 2024',
    currentCity: 'Singapore',
    localTime: '14:20 SGT',
    nextSegment: 'Bus to Sentosa Island @ 15:00',
    status: TripStatus.DELAYED,
    sentiment: 'Neutral',
    size: 6,
    tags: ['Budget-sensitive']
  },
  {
    id: 'fam-3',
    name: 'Chen Family',
    tourId: 'TR-105',
    tourName: 'Tokyo Explorer',
    currentCity: 'Tokyo',
    localTime: '15:20 JST',
    nextSegment: 'Shinkansen to Kyoto @ 16:30',
    status: TripStatus.ISSUE_REPORTED,
    sentiment: 'Unsatisfied',
    size: 3,
    tags: ['First Timers']
  },
  {
    id: 'fam-4',
    name: 'Martinez Family',
    tourId: 'TR-108',
    tourName: 'European Grand Tour',
    currentCity: 'Paris',
    localTime: '09:15 CET',
    nextSegment: 'Louvre Museum Tour @ 10:00',
    status: TripStatus.ON_SCHEDULE,
    sentiment: 'Very Satisfied',
    size: 5,
    tags: ['Culture', 'Photography']
  },
  {
    id: 'fam-5',
    name: 'Kim Family',
    tourId: 'TR-110',
    tourName: 'Seoul & Busan Adventure',
    currentCity: 'Seoul',
    localTime: '18:30 KST',
    nextSegment: 'Traditional Korean Dinner @ 19:30',
    status: TripStatus.ON_SCHEDULE,
    sentiment: 'Very Satisfied',
    size: 3,
    tags: ['Food Lovers']
  }
];

export default function CustomersPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredFamilies = filterStatus === 'all' 
    ? FAMILIES 
    : FAMILIES.filter(f => f.status === filterStatus);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customer Dashboard</h1>
          <p className="text-slate-500 mt-1">Monitor and manage all active customer trips</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value={TripStatus.ON_SCHEDULE}>On Schedule</option>
            <option value={TripStatus.DELAYED}>Delayed</option>
            <option value={TripStatus.ISSUE_REPORTED}>Issues</option>
          </select>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <i className="fas fa-plus mr-2"></i>
            New Trip
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Active Trips</span>
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-route text-indigo-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{FAMILIES.length}</h3>
          <p className="text-xs text-green-600 font-medium mt-1">
            <i className="fas fa-arrow-up mr-1"></i>
            +2 from yesterday
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">On Schedule</span>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {FAMILIES.filter(f => f.status === TripStatus.ON_SCHEDULE).length}
          </h3>
          <p className="text-xs text-slate-500 mt-1">80% success rate</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Issues</span>
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {FAMILIES.filter(f => f.status === TripStatus.ISSUE_REPORTED).length}
          </h3>
          <p className="text-xs text-red-600 font-medium mt-1">Needs attention</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Avg Satisfaction</span>
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-star text-amber-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">4.7/5</h3>
          <p className="text-xs text-green-600 font-medium mt-1">
            <i className="fas fa-arrow-up mr-1"></i>
            +0.3 this week
          </p>
        </div>
      </div>

      {/* Customers List */}
      <div className="space-y-4">
        {filteredFamilies.map((family) => (
          <div key={family.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div 
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50"
              onClick={() => setExpandedId(expandedId === family.id ? null : family.id)}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
                  {family.name.split(' ')[1]?.[0] || family.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{family.name}</h4>
                  <p className="text-sm text-slate-500 font-medium">{family.tourName} • {family.tourId}</p>
                  <div className="flex gap-2 mt-2">
                    {family.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="hidden lg:flex items-center gap-8">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Location</p>
                  <p className="text-sm font-semibold text-slate-700">
                    <i className="fas fa-map-marker-alt text-indigo-600 mr-1"></i>
                    {family.currentCity}
                  </p>
                  <p className="text-xs text-slate-400">{family.localTime}</p>
                </div>

                <div className="max-w-[250px]">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Next Activity</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">{family.nextSegment}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Sentiment</p>
                  <p className="text-sm font-semibold text-slate-700">{family.sentiment}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tight ${
                  family.status === TripStatus.ON_SCHEDULE ? 'bg-green-100 text-green-700' :
                  family.status === TripStatus.DELAYED ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                }`}>
                  {family.status}
                </div>
                <i className={`fas fa-chevron-${expandedId === family.id ? 'up' : 'down'} text-slate-300`}></i>
              </div>
            </div>

            {expandedId === family.id && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <div className="md:col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Today&apos;s Timeline</p>
                    <div className="space-y-3">
                      <div className="flex gap-3 items-start bg-white p-3 rounded-xl">
                        <div className="w-2 bg-green-400 h-full rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">10:00 - Merlion Park Visit</p>
                          <p className="text-xs text-slate-500">Completed • Duration: 1.5 hours</p>
                        </div>
                        <span className="text-xs font-bold text-green-600">✓</span>
                      </div>
                      <div className="flex gap-3 items-start bg-white p-3 rounded-xl border-2 border-indigo-200">
                        <div className="w-2 bg-indigo-500 h-full rounded-full animate-pulse"></div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">14:00 - Hawker Center Lunch</p>
                          <p className="text-xs text-slate-500 italic">In Progress</p>
                        </div>
                        <span className="text-xs font-bold text-indigo-600">●</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end gap-3">
                    <div className="bg-indigo-50 p-3 rounded-xl mb-2">
                      <p className="text-xs font-semibold text-indigo-900 mb-1">
                        <i className="fas fa-robot mr-1"></i>
                        AI Insight
                      </p>
                      <p className="text-xs text-indigo-700">Preference conflict detected in evening activity</p>
                    </div>
                    <div className="flex gap-2">
                      <Link 
                        href={`/operations/family/${family.id}`}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors text-center shadow-lg shadow-indigo-200"
                      >
                        View Details
                      </Link>
                      <button className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredFamilies.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <i className="fas fa-search text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-500 font-medium">No customers found with the selected filter</p>
        </div>
      )}
    </div>
  );
}
