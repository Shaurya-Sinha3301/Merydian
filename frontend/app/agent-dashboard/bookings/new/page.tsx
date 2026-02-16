"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import Icon from '@/components/ui/AppIcon';
import { mockRequests } from '@/lib/agent-dashboard/data';
import { TripRequest, Traveler } from '@/lib/agent-dashboard/types';

export default function NewBookingPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const type = searchParams.get('type') || 'Flight';
    const groupId = searchParams.get('groupId');

    const [group, setGroup] = useState<TripRequest | null>(null);
    const [selectedTravelers, setSelectedTravelers] = useState<string[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        provider: '',
        reservationNumber: '',
        date: '',
        time: '',
        description: '',
        cost: '',
        currency: 'USD',
        location: '',
        origin: '',
        destination: '',
    });

    useEffect(() => {
        if (groupId) {
            const foundGroup = mockRequests.find(r => r.id === groupId) || null;
            setGroup(foundGroup);
            if (foundGroup && foundGroup.members) {
                // Pre-select all members by default
                setSelectedTravelers(foundGroup.members.map(m => m.id));
            }
        }
    }, [groupId]);

    const handleTravelerToggle = (travelerId: string) => {
        setSelectedTravelers(prev =>
            prev.includes(travelerId)
                ? prev.filter(id => id !== travelerId)
                : [...prev, travelerId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would send data to API
        console.log("Submitting Booking:", {
            type,
            groupId,
            travelers: selectedTravelers,
            details: formData
        });
        // Mock success and redirect
        router.push(`/agent-dashboard/bookings?groupId=${groupId}`);
    };

    if (!group) return <div>Loading...</div>;

    return (
        <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                <NavigationBreadcrumbs />

                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">New {type} Booking</h1>
                        <p className="text-slate-500 mt-1">For <span className="font-semibold text-slate-700">{group.customerName}</span> ({group.id})</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* 1. Travelers Selection */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Icon name="UsersIcon" size={20} className="text-indigo-600" />
                                Select Travelers
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.members?.map((member: Traveler) => (
                                    <div
                                        key={member.id}
                                        onClick={() => handleTravelerToggle(member.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedTravelers.includes(member.id)
                                                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedTravelers.includes(member.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                                            }`}>
                                            {selectedTravelers.includes(member.id) && <Icon name="CheckIcon" size={14} className="text-white" />}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${selectedTravelers.includes(member.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{member.name}</p>
                                            <p className="text-xs text-slate-500">{member.type} • {member.age} yrs</p>
                                        </div>
                                    </div>
                                ))}
                                {(!group.members || group.members.length === 0) && (
                                    <p className="text-slate-400 italic col-span-full">No individual member details available for this group.</p>
                                )}
                            </div>
                        </div>

                        {/* 2. Booking Details */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Icon name={type === 'Flight' ? 'PaperAirplaneIcon' : 'TicketIcon'} size={20} className="text-indigo-600" />
                                {type} Details
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Common Fields */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Provider / Airline</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        placeholder={type === 'Flight' ? 'e.g. Air France' : type === 'Hotel' ? 'e.g. Hilton' : 'Provider Name'}
                                        required
                                        value={formData.provider}
                                        onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Reservation / Ticket #</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        placeholder="XYZ-12345"
                                        value={formData.reservationNumber}
                                        onChange={e => setFormData({ ...formData, reservationNumber: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Time</label>
                                    <input
                                        type="time"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>

                                {/* Type Specific Fields */}
                                {type === 'Flight' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Origin</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                                placeholder="e.g. JFK"
                                                value={formData.origin}
                                                onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Destination</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                                placeholder="e.g. LHR"
                                                value={formData.destination}
                                                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Description / Details</label>
                                    <textarea
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium min-h-[80px]"
                                        placeholder={type === 'Hotel' ? 'e.g. 2x Double Rooms, Sea View' : 'Additional details...'}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Cost</label>
                                    <input
                                        type="number"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        placeholder="0.00"
                                        value={formData.cost}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Currency</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="INR">INR (₹)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 justify-end pt-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
                            >
                                Confirm Booking
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
