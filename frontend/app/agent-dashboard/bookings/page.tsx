"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import Icon from '@/components/ui/AppIcon';
import { mockRequests } from '@/lib/agent-dashboard/data';
import { TripRequest, Booking } from '@/lib/agent-dashboard/types';

export default function BookingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialGroupId = searchParams.get('groupId');

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || (mockRequests.length > 0 ? mockRequests[0].id : null));
    const [selectedGroup, setSelectedGroup] = useState<TripRequest | null>(null);
    const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsNewBookingOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleNewBooking = (type: string) => {
        if (selectedGroupId) {
            router.push(`/agent-dashboard/bookings/new?type=${type}&groupId=${selectedGroupId}`);
        }
    };

    useEffect(() => {
        if (selectedGroupId) {
            const group = mockRequests.find(r => r.id === selectedGroupId) || null;
            setSelectedGroup(group);
        }
    }, [selectedGroupId]);

    const handleGroupSelect = (groupId: string) => {
        setSelectedGroupId(groupId);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Confirmed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'Flight': return 'PaperAirplaneIcon';
            case 'Hotel': return 'HomeModernIcon';
            case 'Train': return 'TicketIcon'; // Placeholder if TrainIcon not available
            case 'Cab': return 'TruckIcon'; // Placeholder
            default: return 'TicketIcon';
        }
    };

    return (
        <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                <NavigationBreadcrumbs />

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bookings Management</h1>
                        <p className="text-slate-500 mt-1">Manage flights, hotels, and transport for your groups.</p>
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsNewBookingOpen(!isNewBookingOpen)}
                            className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Icon name="PlusIcon" size={20} />
                            <span>New Booking</span>
                            <Icon name="ChevronDownIcon" size={16} className={`transition-transform duration-200 ${isNewBookingOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isNewBookingOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-1">
                                    {['Flight', 'Hotel', 'Train', 'Bus', 'Metro', 'Cab'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => handleNewBooking(type)}
                                            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            <Icon name={getIconForType(type)} size={16} className="text-slate-400" />
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100%-8rem)]">

                    {/* Groups List Sidebar */}
                    <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                            <h2 className="font-bold text-slate-700">Active Groups</h2>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-1">
                            {mockRequests.map(group => (
                                <div
                                    key={group.id}
                                    onClick={() => handleGroupSelect(group.id)}
                                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border ${selectedGroupId === group.id
                                        ? 'bg-slate-900 text-white shadow-md border-slate-900'
                                        : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-600'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${selectedGroupId === group.id ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {group.id}
                                        </span>
                                        <span className={`text-xs ${selectedGroupId === group.id ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {new Date(group.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-sm truncate">{group.customerName}</h3>
                                    <p className={`text-xs mt-1 truncate ${selectedGroupId === group.id ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {group.destination}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2">
                        {selectedGroup ? (
                            <>
                                {/* Selected Group Header */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">{selectedGroup.customerName}</h2>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Icon name="MapPinIcon" size={16} />
                                                    {selectedGroup.destination}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Icon name="CalendarIcon" size={16} />
                                                    {new Date(selectedGroup.startDate).toLocaleDateString()} - {new Date(selectedGroup.endDate).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Icon name="UsersIcon" size={16} />
                                                    {selectedGroup.groupSize.adults + selectedGroup.groupSize.children + selectedGroup.groupSize.seniors} Travelers
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Bookings</p>
                                            <p className="text-3xl font-bold text-slate-900">{selectedGroup.bookings?.length || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Cards */}
                                <div className="space-y-4">
                                    {!selectedGroup.bookings || selectedGroup.bookings.length === 0 ? (
                                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Icon name="TicketIcon" size={32} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-700">No Bookings Yet</h3>
                                            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Start adding flights, hotels, and other reservations for this group.</p>
                                            <button className="mt-4 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors">
                                                Add First Booking
                                            </button>
                                        </div>
                                    ) : (
                                        selectedGroup.bookings.map((booking: Booking) => (
                                            <div key={booking.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow group">
                                                <div className="flex flex-col md:flex-row gap-6">
                                                    {/* Icon / Type */}
                                                    <div className="flex-shrink-0">
                                                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                            <Icon name={getIconForType(booking.type)} size={24} />
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <h3 className="font-bold text-lg text-slate-900">{booking.details.provider}</h3>
                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(booking.status)}`}>
                                                                        {booking.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-slate-600 font-medium">{booking.details.description}</p>
                                                                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-500">
                                                                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                        <Icon name="HashtagIcon" size={14} />
                                                                        {booking.details.reservationNumber}
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                        <Icon name="CalendarIcon" size={14} />
                                                                        {booking.details.date} {booking.details.time && `• ${booking.details.time}`}
                                                                    </span>
                                                                    {booking.details.location && (
                                                                        <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                            <Icon name="MapPinIcon" size={14} />
                                                                            {booking.details.location}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex flex-col justify-between h-full">
                                                                <p className="text-lg font-bold text-slate-900">
                                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.details.currency }).format(booking.details.cost)}
                                                                </p>
                                                                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors" title="Edit">
                                                                        <Icon name="PencilIcon" size={16} />
                                                                    </button>
                                                                    <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                                                                        <Icon name="TrashIcon" size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <p>Select a group to manage bookings</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
