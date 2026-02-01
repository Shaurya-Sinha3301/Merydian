'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ItinerarySegment } from '@/types/operations';

const MOCK_ITINERARY: ItinerarySegment[] = [
  { id: '1', time: '09:00', activity: 'Breakfast at Hotel', location: 'Hilton Singapore', type: 'Meal', status: 'Completed' },
  { id: '2', time: '10:30', activity: 'Merlion Park Sightseeing', location: 'Merlion Park', type: 'POI', status: 'Completed' },
  { id: '3', time: '14:00', activity: 'Hawker Center Lunch', location: 'Maxwell Food Centre', type: 'Meal', status: 'Current' },
  { id: '4', time: '16:00', activity: 'Private Gardens by the Bay Tour', location: 'Gardens by the Bay', type: 'POI', status: 'Planned' },
  { id: '5', time: '19:00', activity: 'Dinner at Marina Bay Sands', location: 'CÉ LA VI', type: 'Meal', status: 'Planned' },
];

export default function FamilyDetail() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'map'>('timeline');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 h-[calc(100vh-64px)] overflow-hidden">
      {/* Left: Summary Panel */}
      <div className="border-r border-slate-200 bg-white p-6 overflow-auto custom-scrollbar flex flex-col gap-8">
        <Link href="/operations" className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-2 mb-2">
          <i className="fas fa-arrow-left"></i> BACK TO DASHBOARD
        </Link>
        
        <section>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold uppercase">RF</div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">The Robinson Family</h2>
              <div className="flex gap-1 mt-1">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded">VIP</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded">ADVENTURE</span>
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Tour ID:</span>
              <span className="text-slate-900 font-bold">TR-102</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Family Size:</span>
              <span className="text-slate-900 font-bold">4 Members (2 Ad, 2 Ch)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Current Status:</span>
              <span className="text-green-600 font-bold">On Schedule</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Preferences & Constraints</h3>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-indigo-600 mb-1">HARD CONSTRAINT</p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">Must visit: Marina Bay Sands Observation Deck, Universal Studios.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-emerald-600 mb-1">SOFT PREFERENCE</p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">Prefer local food markets over fine dining. Avoid late night travel after 10 PM.</p>
            </div>
          </div>
        </section>

        <section className="mt-auto">
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
               <h4 className="text-xs font-bold text-orange-800 mb-2">Internal AI Insight</h4>
               <p className="text-[11px] text-orange-700 leading-normal">High satisfaction on current tour. Family might be open to an premium upgrade for the Sentosa activity tomorrow.</p>
            </div>
        </section>
      </div>

      {/* Center: Itinerary & Workflow */}
      <div className="lg:col-span-2 bg-slate-50 p-8 overflow-auto custom-scrollbar flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Trip Itinerary - Day 4 of 7</h3>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Timeline
              </button>
              <button 
                onClick={() => setActiveTab('map')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Map View
              </button>
            </div>
          </div>

          <div className="space-y-1 relative">
             <div className="absolute left-4 top-4 bottom-4 w-[2px] bg-slate-100"></div>
             {MOCK_ITINERARY.map((segment) => (
               <div key={segment.id} className="relative pl-10 pb-8 flex items-start gap-4">
                 <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 ${
                   segment.status === 'Completed' ? 'bg-green-500 text-white' : 
                   segment.status === 'Current' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                 }`}>
                   <i className={`fas ${
                     segment.type === 'Meal' ? 'fa-utensils' : 
                     segment.type === 'POI' ? 'fa-camera' : 
                     segment.type === 'Bus' ? 'fa-bus' : 'fa-info'
                   } text-[10px]`}></i>
                 </div>
                 <div className="flex-1 bg-white border border-slate-100 p-4 rounded-xl hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{segment.time} • {segment.location}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        segment.status === 'Completed' ? 'bg-green-50 text-green-700' :
                        segment.status === 'Current' ? 'bg-indigo-50 text-indigo-700 animate-pulse' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {segment.status}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-800">{segment.activity}</h5>
                    {segment.status === 'Planned' && (
                      <div className="flex gap-2 mt-3">
                         <button className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-200">Modify</button>
                         <button className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100">Cancel</button>
                      </div>
                    )}
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-magic text-white"></i>
            </div>
            <h3 className="font-bold text-lg">AI Optimization Recommended</h3>
          </div>
          <p className="text-sm text-indigo-100 mb-6">
            Wait times for &quot;Gardens by the Bay&quot; are currently 40m longer than projected. The Decision Agent suggests swapping with the evening Dinner activity to improve satisfaction by 12%.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-60 uppercase mb-2">OPTION 1 (Recommended)</p>
                <p className="text-xs font-bold mb-1">Evening Swap</p>
                <p className="text-[10px] opacity-80 mb-3">Swap POI and Meal. No extra cost. +12% Satisfaction.</p>
                <button className="w-full py-2 bg-white text-indigo-600 text-[10px] font-bold rounded-lg hover:bg-indigo-50 transition-colors">Approve & Apply</button>
             </div>
             <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-60 uppercase mb-2">OPTION 2</p>
                <p className="text-xs font-bold mb-1">Fast Track Upgrade</p>
                <p className="text-[10px] opacity-80 mb-3">Keep schedule. +$45 per person. +5% Satisfaction.</p>
                <button className="w-full py-2 bg-white/10 text-white border border-white/30 text-[10px] font-bold rounded-lg hover:bg-white/20 transition-colors">View Details</button>
             </div>
          </div>
        </div>
      </div>

      {/* Right: Comm & Feedback */}
      <div className="border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
           <h3 className="font-bold text-slate-800">Communication</h3>
           <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded">LIVE</span>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
           <div className="flex justify-center mb-4">
              <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">TODAY</span>
           </div>
           
           <div className="flex flex-col gap-2 max-w-[85%]">
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-700">Hello! We just finished the Merlion Park. We loved it, but it was very crowded.</p>
              </div>
              <span className="text-[9px] text-slate-400 ml-1">Family Robinson • 10:45 AM</span>
           </div>

           <div className="flex flex-col gap-2 max-w-[85%] self-end items-end">
              <div className="bg-indigo-600 p-3 rounded-2xl rounded-tr-none text-white shadow-sm shadow-indigo-100">
                <p className="text-xs">Glad you enjoyed it! I&apos;m monitoring the crowds for the Gardens by the Bay now. Might suggest a quick schedule tweak soon.</p>
              </div>
              <span className="text-[9px] text-slate-400 mr-1">System • 11:00 AM</span>
           </div>

           <div className="flex flex-col gap-2 max-w-[85%]">
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-700">That sounds good, thank you!</p>
              </div>
              <span className="text-[9px] text-slate-400 ml-1">Family Robinson • 11:05 AM</span>
           </div>
        </div>

        <div className="p-4 border-t border-slate-100">
           <div className="flex gap-2">
             <input 
               type="text" 
               placeholder="Type a message..." 
               className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
             />
             <button className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 shadow-md shadow-indigo-100">
               <i className="fas fa-paper-plane text-sm"></i>
             </button>
           </div>
           <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
              <button className="shrink-0 px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-600 rounded-full hover:bg-slate-200 transition-colors">Request Location</button>
              <button className="shrink-0 px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-600 rounded-full hover:bg-slate-200 transition-colors">Send PDF</button>
              <button className="shrink-0 px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-600 rounded-full hover:bg-slate-200 transition-colors">POI Info</button>
           </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Quick Feedback Stats</h4>
           <div className="flex items-center justify-between">
              <div className="flex flex-col">
                 <span className="text-xl font-bold text-slate-900">4.8</span>
                 <span className="text-[9px] text-slate-500">Current Trip Score</span>
              </div>
              <div className="flex gap-1 text-xs text-orange-400">
                 <i className="fas fa-star"></i>
                 <i className="fas fa-star"></i>
                 <i className="fas fa-star"></i>
                 <i className="fas fa-star"></i>
                 <i className="fas fa-star"></i>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
