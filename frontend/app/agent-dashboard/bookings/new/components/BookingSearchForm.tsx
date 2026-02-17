"use client";

import React, { useState, useEffect } from 'react';
import type { SearchCriteria, TripRequest } from '@/lib/agent-dashboard/types';
import Icon from '@/components/ui/AppIcon';

interface BookingSearchFormProps {
    type: string;
    onSearch: (criteria: SearchCriteria) => void;
    isLoading: boolean;
    group?: TripRequest | null;
}

export default function BookingSearchForm({ type, onSearch, isLoading, group }: BookingSearchFormProps) {
    // Prefill with group data
    const getInitialCriteria = (): SearchCriteria => {
        if (group) {
            const totalTravelers = group.groupSize.adults + group.groupSize.children + group.groupSize.seniors;
            return {
                type: type as any,
                destination: group.destination,
                date: group.startDate,
                travelers: totalTravelers,
                class: 'Economy'
            };
        }
        return {
            type: type as any,
            destination: type === 'Hotel' ? 'Goa' : 'Mumbai (BOM)',
            date: new Date().toISOString().split('T')[0],
            travelers: 1,
            class: 'Economy'
        };
    };

    const [criteria, setCriteria] = useState<SearchCriteria>(getInitialCriteria());

    // Update criteria when group changes
    useEffect(() => {
        if (group) {
            const totalTravelers = group.groupSize.adults + group.groupSize.children + group.groupSize.seniors;
            setCriteria(prev => ({
                ...prev,
                destination: group.destination,
                date: group.startDate,
                travelers: totalTravelers
            }));
        }
    }, [group]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(criteria);
    };

    // Check if this is a hotel search
    const isHotelSearch = type === 'Hotel';

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-2 mb-6 text-slate-900 border-b border-slate-100 pb-4">
                <Icon name="MagnifyingGlassIcon" size={20} className="text-indigo-600" />
                <h2 className="text-xl font-bold">Search {type}s</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className={`grid grid-cols-1 ${isHotelSearch ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`}>
                    {/* Origin (Only for non-hotel bookings) */}
                    {!isHotelSearch && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">From</label>
                            <div className="relative">
                                <Icon name="MapPinIcon" size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                    value={criteria.origin || ''}
                                    onChange={e => setCriteria({ ...criteria, origin: e.target.value })}
                                    placeholder="Origin City"
                                />
                            </div>
                        </div>
                    )}

                    {/* Destination / Location */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">{isHotelSearch ? 'Location' : 'To'}</label>
                        <div className="relative">
                            <Icon name="MapPinIcon" size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                value={criteria.destination}
                                onChange={e => setCriteria({ ...criteria, destination: e.target.value })}
                                placeholder={isHotelSearch ? "City or Hotel Name" : "Destination City"}
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">{isHotelSearch ? 'Check-in Date' : 'Date'}</label>
                        <div className="relative">
                            <Icon name="CalendarIcon" size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="date"
                                className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                value={criteria.date}
                                onChange={e => setCriteria({ ...criteria, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Travelers / Guests */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">{isHotelSearch ? 'Guests' : 'Travelers'}</label>
                        <div className="relative">
                            <Icon name="UsersIcon" size={16} className="absolute left-3 top-3 text-slate-400" />
                            <select
                                className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium appearance-none"
                                value={criteria.travelers}
                                onChange={e => setCriteria({ ...criteria, travelers: parseInt(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                    <option key={n} value={n}>{n} {isHotelSearch ? 'Guest' : 'Traveler'}{n > 1 ? 's' : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Icon name="MagnifyingGlassIcon" size={20} />
                                Search {type}s
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
