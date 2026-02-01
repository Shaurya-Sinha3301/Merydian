"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MOCK_FAMILIES } from '@/lib/demo/data';
import { ItinerarySegment } from '@/lib/demo/types';

const TransportCard = ({ segment }: { segment: ItinerarySegment }) => {
    const [isOpen, setIsOpen] = useState(false);
    const t = segment.transport;
    if (!t) return null;

    const modeIcons: Record<string, string> = {
        van: 'fa-shuttle-van',
        metro: 'fa-subway',
        bus: 'fa-bus',
        car: 'fa-car',
        flight: 'fa-plane'
    };

    return (
        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white mb-4">
            <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <i className={`fas ${modeIcons[t.mode] || 'fa-route'}`}></i>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{t.departureTime} → {t.arrivalTime}</p>
                        <p className="text-sm font-bold text-slate-900">{segment.activity}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${t.status === 'on_time' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {t.status.replace('_', ' ')}
                    </span>
                    <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-slate-300 text-xs`}></i>
                </div>
            </div>

            {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-50 bg-slate-50/50 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Driver / Service</p>
                        <p className="text-xs font-bold text-slate-800">{t.driverName || 'N/A'}</p>
                        {t.driverPhone && <a href={`tel:${t.driverPhone}`} className="text-[10px] text-indigo-600 font-bold">{t.driverPhone}</a>}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Vehicle / ID</p>
                        <p className="text-xs font-bold text-slate-800">{t.vehicleNumber || t.flightNumber || t.trainNumber || 'TBD'}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const FamilyDetail: React.FC = () => {
    const params = useParams();
    const id = params?.id as string;
    const family = MOCK_FAMILIES.find(f => f.id === id);
    const [maskAadhaar, setMaskAadhaar] = useState(true);

    if (!family) return <div className="p-8">Family not found</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 h-full lg:h-[calc(100vh-64px)] overflow-hidden">
            {/* Left: Summary Panel */}
            <div className="border-r border-slate-200 bg-white p-6 overflow-auto custom-scrollbar flex flex-col gap-6">
                <Link href="/demo" className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-2">
                    <i className="fas fa-arrow-left"></i> BACK
                </Link>

                <section>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">{family.name[0]}</div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{family.name}</h2>
                            <p className="text-xs text-slate-500 font-medium">Tour: {family.tourName}</p>
                        </div>
                    </div>
                    <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase ${family.status === 'On Schedule' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                        {family.status}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Family Members</h3>
                        <button
                            onClick={() => setMaskAadhaar(!maskAadhaar)}
                            className="text-[10px] text-indigo-600 font-bold hover:underline"
                        >
                            {maskAadhaar ? 'Show Aadhaar' : 'Mask Aadhaar'}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {family.members.length > 0 ? family.members.map((m, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold text-slate-800">{m.name}, {m.age} yrs</p>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{m.role}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono mt-1">
                                    ID: {maskAadhaar ? 'XXXX-XXXX-' + m.aadhaarNumber.slice(-4) : m.aadhaarNumber}
                                </p>
                            </div>
                        )) : <p className="text-xs text-slate-400 italic">No member data listed.</p>}
                    </div>
                </section>

                <section className="mt-auto pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Constraints</h4>
                    <div className="space-y-2">
                        {family.constraints.hard.map((c, i) => (
                            <div key={i} className="flex gap-2 items-center text-[11px] text-slate-700">
                                <i className="fas fa-lock text-indigo-400 text-[8px]"></i>
                                <span className="font-semibold">{c}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Center: Full Itinerary Timeline */}
            <div className="lg:col-span-2 bg-slate-50 p-4 md:p-8 overflow-auto custom-scrollbar flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Delhi Tour Itinerary</h3>
                    <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                        7 Days Trip
                    </div>
                </div>

                <div className="space-y-12">
                    {family.itinerary?.map((day) => (
                        <section key={day.dayNumber} className="relative">
                            <div className="flex items-center gap-4 mb-6 sticky top-0 bg-slate-50 py-2 z-20">
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shrink-0">D{day.dayNumber}</div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Day {day.dayNumber}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(day.date).toDateString()}</p>
                                </div>
                                <div className="flex-1 border-t border-slate-200 ml-4"></div>
                            </div>

                            <div className="space-y-4">
                                {day.segments.map((seg) => (
                                    seg.type === 'Transport' ? (
                                        <TransportCard key={seg.id} segment={seg} />
                                    ) : (
                                        <div key={seg.id} className="flex gap-4 items-start pl-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 shrink-0"></div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{seg.time} • {seg.location}</p>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${seg.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-white border border-slate-200 text-slate-400'
                                                        }`}>
                                                        {seg.status}
                                                    </span>
                                                </div>
                                                <h5 className="text-sm font-bold text-slate-800">{seg.activity}</h5>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            {/* Right: Interaction Panel */}
            <div className="border-l border-slate-200 bg-white flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Agent AI Console</h3>
                </div>

                <div className="flex-1 p-6 space-y-6 overflow-auto custom-scrollbar">
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-4 text-white">
                        <h4 className="text-xs font-bold mb-2">Live Re-Optimization</h4>
                        <p className="text-[11px] opacity-80 leading-relaxed mb-4">Traffic data indicates 45m delays. Suggest shifting Red Fort tour by 1 hour.</p>
                        <button className="w-full py-2 bg-white text-indigo-600 text-[10px] font-bold rounded-lg">Apply Suggestion</button>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Recent Communication</h4>
                        <div className="space-y-4">
                            <div className="text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                                <p className="text-slate-700">"Driver reached early. We are waiting at the lounge."</p>
                                <p className="text-[9px] text-slate-400 mt-1">10:45 AM • Customer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FamilyDetail;
