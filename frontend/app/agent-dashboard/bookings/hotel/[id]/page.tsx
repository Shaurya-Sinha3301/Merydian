"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import Icon from '@/components/ui/AppIcon';
import { apiService, SearchResult } from '@/lib/agent-dashboard/apiService';

export default function HotelDetailsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = params.id as string;
    const groupId = searchParams.get('groupId');

    const [hotel, setHotel] = useState<SearchResult | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        // In a real app, we would fetch by ID. 
        // Here we simulate fetching by searching hotels and finding the match.
        // This is a bit hacky but works for the mock service connection.
        const fetchHotel = async () => {
            const results = await apiService.search({
                type: 'Hotel',
                date: '2026-03-15',
                travelers: 1
            });
            const found = results.find(r => r.id === id);
            if (found) setHotel(found);
        };
        fetchHotel();
    }, [id]);

    if (!hotel) return (
        <div className="flex bg-background h-screen items-center justify-center">
            <div className="animate-spin text-slate-400">
                <Icon name="ArrowPathIcon" size={32} />
            </div>
        </div>
    );

    const handleBook = () => {
        // Redirect back to the booking wizard, skipping to the 'book' step with this hotel selected
        // We need to pass the hotel details back. 
        // Since we don't have a real state manager, we'll assume the user is "Selecting" this hotel.
        // In the wizard, we'd need to handle this "pre-selection". 
        // For simplicity in this demo, we'll go back to the list and let them click "Select" there, 
        // or effectively "Select" it by navigating with a query param if we enhanced the wizard.

        // BETTER APPROACH for Demo: 
        // Navigate to booking wizard with `selectedResultId` param.
        router.push(`/agent-dashboard/bookings/new?type=Hotel&groupId=${groupId}&step=book&selectedId=${hotel.id}`);
    };

    return (
        <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-white">
                <div className="max-w-7xl mx-auto">
                    {/* Hero / Carousel Section */}
                    <div className="relative h-[50vh] w-full bg-slate-900 group">
                        {hotel.images && hotel.images.length > 0 ? (
                            <>
                                <img
                                    src={hotel.images[activeImageIndex]}
                                    alt={hotel.title}
                                    className="w-full h-full object-cover opacity-90"
                                />
                                {/* Carousel Controls */}
                                <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setActiveImageIndex(prev => prev === 0 ? hotel.images!.length - 1 : prev - 1)}
                                        className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50 backdrop-blur-sm transition-all"
                                    >
                                        <Icon name="ChevronLeftIcon" size={24} />
                                    </button>
                                    <button
                                        onClick={() => setActiveImageIndex(prev => prev === hotel.images!.length - 1 ? 0 : prev + 1)}
                                        className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50 backdrop-blur-sm transition-all"
                                    >
                                        <Icon name="ChevronRightIcon" size={24} />
                                    </button>
                                </div>
                                {/* Indicators */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                    {hotel.images.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveImageIndex(idx)}
                                            className={`w-2 h-2 rounded-full transition-all ${idx === activeImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">No Images</div>
                        )}

                        <div className="absolute top-4 left-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 bg-white/90 backdrop-blur-md rounded-full text-slate-900 hover:bg-white transition-all shadow-lg"
                            >
                                <Icon name="ArrowLeftIcon" size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row">
                        {/* Main Content */}
                        <div className="flex-1 p-8 lg:p-12">
                            <div className="mb-6">
                                <span className="text-emerald-600 font-bold tracking-wider text-xs uppercase mb-2 block">
                                    {hotel.subtitle}
                                </span>
                                <h1 className="text-4xl font-bold text-slate-900 mb-2">{hotel.title}</h1>
                                <p className="text-slate-500 flex items-center gap-2 text-lg">
                                    <Icon name="MapPinIcon" size={20} />
                                    {hotel.details.location}
                                </p>
                            </div>

                            <div className="flex items-center gap-6 py-6 border-y border-slate-100 mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                                        <Icon name="StarIcon" size={14} className="fill-current" />
                                        {hotel.details.rating}
                                    </div>
                                    <span className="text-slate-600 text-sm font-medium">Excellent Rating</span>
                                </div>
                            </div>

                            <div className="mb-10">
                                <h2 className="text-xl font-bold text-slate-900 mb-4">About this place</h2>
                                <p className="text-slate-600 leading-relaxed text-lg">
                                    {hotel.description || "Experience luxury and comfort at its finest. This property offers world-class amenities, stunning views, and exceptional service to make your stay unforgettable."}
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-6">Amenities</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                                    {hotel.facilities?.map(facility => (
                                        <div key={facility} className="flex items-center gap-3 text-slate-700">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                <Icon name="CheckIcon" size={14} />
                                            </div>
                                            <span className="font-medium">{facility}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Booking Sidebar */}
                        <div className="lg:w-96 p-8 border-l border-slate-100 bg-slate-50/50 lg:min-h-[50vh]">
                            <div className="sticky top-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: hotel.price.currency, maximumFractionDigits: 0 }).format(hotel.price.amount)}
                                        </p>
                                        <p className="text-slate-400 text-sm font-medium">per night</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Available</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBook}
                                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 mb-4"
                                >
                                    <span>Book Now</span>
                                    <Icon name="ArrowRightIcon" size={16} />
                                </button>

                                <p className="text-center text-xs text-slate-400">
                                    You won't be charged yet
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
