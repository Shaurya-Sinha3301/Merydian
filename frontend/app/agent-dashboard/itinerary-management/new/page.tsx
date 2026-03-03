'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    X, Plus, Calendar, User, Mail, Users, Trash2, Clock,
    ArrowLeft, CheckCircle, Minus
} from 'lucide-react';
import { Trip } from '@/lib/trips';

interface FamilyInput {
    id: string; // Internal temporary ID
    familyId: string; // The generated FAMxxx ID
    name: string;
    email: string;
    pax: number;
}

interface ItineraryEvent {
    id: string;
    type: 'transport' | 'activity' | 'meal' | 'accommodation';
    title: string;
    time: string;
}

interface ItineraryDay {
    id: string;
    dayNumber: number;
    events: ItineraryEvent[];
}

export default function NewItineraryPage() {
    const router = useRouter();

    // Section 1: Families
    const [families, setFamilies] = useState<FamilyInput[]>([
        { id: 'initial', familyId: generateFamilyId(), name: '', email: '', pax: 1 }
    ]);

    // Section 2: Trip Metadata
    const [tripTitle, setTripTitle] = useState('');
    const [budget, setBudget] = useState('');

    // Section 3: Itinerary Builder
    const [days, setDays] = useState<ItineraryDay[]>([{ id: '1', dayNumber: 1, events: [] }]);

    function generateFamilyId() {
        const randomNum = Math.floor(100 + Math.random() * 900);
        return `FAM${randomNum}`;
    }

    const handleAddFamily = () => {
        setFamilies(prev => [
            ...prev,
            { id: Math.random().toString(36).substring(7), familyId: generateFamilyId(), name: '', email: '', pax: 1 }
        ]);
    };

    const handleUpdateFamily = (id: string, field: keyof FamilyInput, value: string | number) => {
        setFamilies(prev => prev.map(f => {
            if (f.id === id) {
                return { ...f, [field]: value };
            }
            return f;
        }));
    };

    const handleRemoveFamily = (id: string) => {
        if (families.length === 1) return; // Must have at least one family
        setFamilies(prev => prev.filter(f => f.id !== id));
    };

    const handleAddDay = () => {
        setDays(prev => [
            ...prev,
            {
                id: Math.random().toString(36).substring(7),
                dayNumber: prev.length + 1,
                events: []
            }
        ]);
    };

    const handleAddEvent = (dayId: string) => {
        setDays(prev => prev.map(day => {
            if (day.id === dayId) {
                return {
                    ...day,
                    events: [
                        ...day.events,
                        {
                            id: Math.random().toString(36).substring(7),
                            type: 'activity',
                            title: '',
                            time: ''
                        }
                    ]
                };
            }
            return day;
        }));
    };

    const handleUpdateEvent = (dayId: string, eventId: string, field: keyof ItineraryEvent, value: string) => {
        setDays(prev => prev.map(day => {
            if (day.id === dayId) {
                return {
                    ...day,
                    events: day.events.map(ev => {
                        if (ev.id === eventId) {
                            return { ...ev, [field]: value };
                        }
                        return ev;
                    })
                };
            }
            return day;
        }));
    };

    const handleRemoveEvent = (dayId: string, eventId: string) => {
        setDays(prev => prev.map(day => {
            if (day.id === dayId) {
                return {
                    ...day,
                    events: day.events.filter(ev => ev.id !== eventId)
                };
            }
            return day;
        }));
    };

    const handleSave = () => {
        if (!tripTitle.trim() || families.some(f => !f.name.trim() || !f.email.trim())) {
            alert('Please fill in all required fields (Trip Title, Family Names, Emails).');
            return;
        }

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (days.length > 0 ? days.length - 1 : 0));

        const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
        const dateRange = `${formatDate(startDate)} \u2013 ${formatDate(endDate)}`;

        const familyNames = families.map(f => f.name).join(', ');

        const newTrip: Trip = {
            id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
            title: tripTitle,
            client: familyNames,
            status: 'DRAFT',
            dateRange: dateRange,
            budget: budget ? `$${budget} EST` : 'TBD',
            members: [
                { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-6Q-m1Yo1xNKThTwAoqzJHkTjZ2n9DxeX1y5nHORtWJExhyngqZWrGMC9QzHM1popP6riZjuzprWGcMsKyatuQekZVTX6h5pqySZK5D04rI5xRwAuNFDZMxz_ylWQfOuGsBVQ9aV1liKt5Mln7PE6BUhW84bKBhBkC_id19_CpkqmTY6GOxETuIQyKKPRos_Hk3xthcHnAffFzLE-nxUiUSSkB6OzVA7KBYHDnFv2mVAybp3p4GbsmW5vB7YeFtP822R9jT6UGG-K' },
            ]
        };

        // In a real app we'd call the backend API here.
        // For now, we'll store it in localStorage so the dashboard can pick it up.
        try {
            const existingTripsStr = localStorage.getItem('agent_mock_trips') || '[]';
            const existingTrips = JSON.parse(existingTripsStr);
            localStorage.setItem('agent_mock_trips', JSON.stringify([newTrip, ...existingTrips]));
        } catch (e) {
            console.error('Failed to save trip to localStorage', e);
        }

        // Navigate back to dashboard
        router.push('/agent-dashboard/itinerary-management');
    };

    return (
        <div className="flex bg-white h-screen overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-[#faf9f6]">

                {/* Header */}
                <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
                    <div className="max-w-5xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/agent-dashboard/itinerary-management')}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors text-stone-500 hover:text-black shrink-0 border border-stone-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-[300] tracking-[-0.02em] text-black">
                                    Create New Itinerary
                                </h1>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8d7b5b] mt-0.5 flex items-center gap-1.5">
                                    <Users className="w-3 h-3" />
                                    Group Planner
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className="px-6 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#222] transition-colors"
                        >
                            Save &amp; Return
                        </button>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-6 md:px-8 py-8 space-y-10">

                    {/* Section 1: Families */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-black text-stone-900">1</div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-black">Families &amp; Guests</h2>
                        </div>

                        <div className="space-y-4">
                            {families.map((family, index) => (
                                <div key={family.id} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative group">

                                    {families.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveFamily(family.id)}
                                            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            title="Remove Family"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="flex items-center gap-3 mb-5 border-b border-stone-100 pb-3">
                                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5">
                                            <CheckCircle className="w-3 h-3" />
                                            ID: {family.familyId}
                                        </div>
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Family {index + 1}</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 flex items-center gap-1.5">
                                                <User className="w-3 h-3" /> Family Name
                                            </label>
                                            <input
                                                type="text"
                                                value={family.name}
                                                onChange={(e) => handleUpdateFamily(family.id, 'name', e.target.value)}
                                                placeholder="e.g. The Smith Family"
                                                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 flex items-center gap-1.5">
                                                <Mail className="w-3 h-3" /> Primary Email
                                            </label>
                                            <input
                                                type="email"
                                                value={family.email}
                                                onChange={(e) => handleUpdateFamily(family.id, 'email', e.target.value)}
                                                placeholder="contact@example.com"
                                                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">Total Members</label>
                                            <div className="flex items-center border border-stone-200 rounded-md bg-stone-50 h-[38px] w-full max-w-[140px]">
                                                <button
                                                    onClick={() => handleUpdateFamily(family.id, 'pax', Math.max(1, family.pax - 1))}
                                                    className="w-10 h-full flex items-center justify-center hover:bg-stone-200 text-stone-600 transition-colors border-r border-stone-200"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <div className="flex-1 flex items-center justify-center text-sm font-bold text-black">
                                                    {family.pax}
                                                </div>
                                                <button
                                                    onClick={() => handleUpdateFamily(family.id, 'pax', family.pax + 1)}
                                                    className="w-10 h-full flex items-center justify-center hover:bg-stone-200 text-stone-600 transition-colors border-l border-stone-200"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={handleAddFamily}
                                className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-stone-500 hover:text-black hover:border-stone-300 hover:bg-white transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Another Family
                            </button>
                        </div>
                    </section>

                    {/* Section 2: Trip Overview */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-black text-stone-900">2</div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-black">Trip Overview</h2>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">Trip Title</label>
                                <input
                                    type="text"
                                    value={tripTitle}
                                    onChange={(e) => setTripTitle(e.target.value)}
                                    placeholder="e.g. Kyoto Spring Tour"
                                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">Estimated Budget (USD)</label>
                                <input
                                    type="number"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    placeholder="e.g. 5000"
                                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400 transition-colors"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Itinerary */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-black text-stone-900">3</div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-black">Itinerary Builder</h2>
                        </div>

                        <div className="space-y-4">
                            {days.map((day, dIdx) => (
                                <div key={day.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-[#faf9f6] px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-black">
                                            <Calendar className="w-4 h-4 text-stone-400" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Day {day.dayNumber}</span>
                                        </div>
                                        <button
                                            onClick={() => handleAddEvent(day.id)}
                                            className="text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-black transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-md border border-stone-200 shadow-sm"
                                        >
                                            <Plus className="w-3 h-3" /> Event
                                        </button>
                                    </div>

                                    <div className="p-5 space-y-3">
                                        {day.events.length === 0 ? (
                                            <p className="text-xs text-stone-400 italic text-center py-4">No events added for Day {day.dayNumber}.</p>
                                        ) : (
                                            day.events.map((event, eIdx) => (
                                                <div key={event.id} className="flex flex-col md:flex-row items-center gap-3 p-3 bg-stone-50 border border-stone-100 rounded-lg group hover:border-stone-200 transition-colors">
                                                    <select
                                                        value={event.type}
                                                        onChange={(e) => handleUpdateEvent(day.id, event.id, 'type', e.target.value)}
                                                        className="px-3 py-2 bg-white border border-stone-200 rounded-md text-xs font-semibold focus:outline-none w-full md:w-36 text-stone-700"
                                                    >
                                                        <option value="activity">Activity</option>
                                                        <option value="transport">Transport</option>
                                                        <option value="meal">Meal</option>
                                                        <option value="accommodation">Stay</option>
                                                    </select>

                                                    <div className="w-full flex-1">
                                                        <input
                                                            type="text"
                                                            value={event.title}
                                                            onChange={(e) => handleUpdateEvent(day.id, event.id, 'title', e.target.value)}
                                                            placeholder="Event description..."
                                                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-md text-xs focus:outline-none focus:border-stone-400"
                                                        />
                                                    </div>

                                                    <div className="relative w-full md:w-32 flex shrink-0 items-center">
                                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                                            <Clock className="w-3 h-3 text-stone-400" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={event.time}
                                                            onChange={(e) => handleUpdateEvent(day.id, event.id, 'time', e.target.value)}
                                                            placeholder="10:00 AM"
                                                            className="w-full pl-8 pr-3 py-2 bg-white border border-stone-200 rounded-md text-xs focus:outline-none focus:border-stone-400 font-mono tracking-wide placeholder:font-sans"
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={() => handleRemoveEvent(day.id, event.id)}
                                                        className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100 shrink-0"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleAddDay}
                            className="w-full py-4 mt-6 border border-stone-200 bg-white rounded-xl text-[11px] font-bold uppercase tracking-widest text-[#4a647c] hover:bg-stone-50 shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Day
                        </button>
                    </section>
                </div>
            </main>
        </div>
    );
}
