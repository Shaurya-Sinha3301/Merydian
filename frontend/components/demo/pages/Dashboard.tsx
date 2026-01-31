"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TripStatus, KPI, Issue } from '@/lib/demo/types';
import { MOCK_FAMILIES } from '@/lib/demo/data';

const KPI_DATA: KPI[] = [
    { label: 'Total Delhi Tours', value: 84, delta: '+8%', isPositive: true },
    { label: 'Active Delhi', value: 10, delta: '+2', isPositive: true },
    { label: 'Families on Trip', value: 34, delta: '-2%', isPositive: false },
    { label: 'Avg Rating', value: '4.9/5', delta: '+0.1', isPositive: true },
];

const ISSUES: Issue[] = [
    { id: '1', severity: 'Critical', description: 'Metro Line Shutdown (Yellow)', familyId: 'fam-3', familyName: 'Gupta Family', timestamp: '5m ago' },
    { id: '2', severity: 'Moderate', description: 'Traffic Delay near CP', familyId: 'fam-2', familyName: 'Patel Family', timestamp: '12m ago' },
];

const Dashboard: React.FC = () => {
    const router = useRouter();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto">
            {/* KPI Strip */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {KPI_DATA.map((kpi, idx) => (
                    <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-[10px] md:text-sm font-medium mb-1">{kpi.label}</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-lg md:text-2xl font-bold text-slate-900">{kpi.value}</h3>
                            <span className={`text-[9px] md:text-xs font-bold px-1.5 py-0.5 rounded-full ${kpi.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {kpi.delta}
                            </span>
                        </div>
                    </div>
                ))}
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800">Delhi Active Families</h2>
                        <div className="flex gap-2">
                            <button className="hidden sm:block px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium">Filters</button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {MOCK_FAMILIES.map((family) => (
                            <div key={family.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                                <div
                                    className="p-4 md:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50"
                                    onClick={() => setExpandedId(expandedId === family.id ? null : family.id)}
                                >
                                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                            <i className={`fas ${family.status === TripStatus.ON_SCHEDULE ? 'fa-check-circle text-green-500' : 'fa-exclamation-triangle text-orange-500'} text-lg md:text-xl`}></i>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-900 truncate text-sm md:text-base">{family.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] md:text-xs text-slate-500 font-medium">{family.size} members</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span className="text-[10px] md:text-xs text-indigo-600 font-bold uppercase">{family.tourId}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden lg:block flex-1">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Status</p>
                                        <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${family.status === TripStatus.ON_SCHEDULE ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                            }`}>
                                            {family.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="hidden sm:block text-right mr-4">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Sentiment</p>
                                            <p className={`text-xs font-bold ${family.sentiment === 'Very Satisfied' ? 'text-green-600' : 'text-slate-600'}`}>{family.sentiment}</p>
                                        </div>
                                        <i className={`fas fa-chevron-${expandedId === family.id ? 'up' : 'down'} text-slate-300 text-xs`}></i>
                                    </div>
                                </div>

                                {expandedId === family.id && (
                                    <div className="px-4 md:px-5 pb-5 pt-2 border-t border-slate-50 bg-slate-50/30">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Today's Mini-Itinerary</p>
                                                    <span className="text-[10px] font-bold text-indigo-600">{family.currentCity} ({family.localTime})</span>
                                                </div>
                                                <div className="space-y-3 relative">
                                                    <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-slate-100"></div>
                                                    {family.itinerary?.[1]?.segments.slice(0, 3).map((seg) => (
                                                        <div key={seg.id} className="flex gap-4 items-start relative z-10">
                                                            <div className={`w-3 h-3 rounded-full mt-1.5 border-2 border-white ${seg.status === 'Completed' ? 'bg-green-500' : seg.status === 'Current' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></div>
                                                            <div className="flex-1">
                                                                <p className="text-xs font-bold text-slate-800">{seg.time} - {seg.activity}</p>
                                                                <p className="text-[10px] text-slate-500">{seg.status}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-end gap-3">
                                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Constraints</p>
                                                    <p className="text-xs text-slate-600 italic">"{family.constraints.soft[0]}"</p>
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); router.push(`/demo/family/${family.id}`); }}
                                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white text-[10px] md:text-xs font-bold rounded-lg hover:bg-indigo-700"
                                                    >
                                                        Full Itinerary
                                                    </button>
                                                    <button className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-[10px] md:text-xs font-bold rounded-lg hover:bg-slate-50">
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
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-fit">
                        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Delhi Alerts</h3>
                            <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                        </div>
                        <div className="p-5 space-y-4">
                            {ISSUES.map((issue) => (
                                <div key={issue.id} className={`p-4 rounded-xl border-l-4 ${issue.severity === 'Critical' ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
                                    <div className="flex justify-between mb-1">
                                        <p className="text-[10px] font-bold uppercase opacity-70">{issue.severity}</p>
                                        <span className="text-[10px] text-slate-400 font-medium">{issue.timestamp}</span>
                                    </div>
                                    <h5 className="text-sm font-bold text-slate-800">{issue.description}</h5>
                                    <p className="text-xs text-slate-500 mt-1">Impact: <span className="font-semibold text-indigo-600">{issue.familyName}</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
