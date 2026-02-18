"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import Icon from '@/components/ui/AppIcon';
import { apiService } from '@/lib/agent-dashboard/apiService';
import type { SearchResult } from '@/lib/agent-dashboard/types';

export default function HotelDetailsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = params.id as string;
    const groupId = searchParams.get('groupId');

    const [hotel, setHotel] = useState<SearchResult | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showAllAmenities, setShowAllAmenities] = useState(false);

    useEffect(() => {
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
        router.push(`/agent-dashboard/bookings/new?type=Hotel&groupId=${groupId}&step=book&selectedId=${hotel.id}`);
    };

    const agentMetrics = hotel.agentMetrics || {
        commission: 0,
        markup: 0,
        b2bPrice: hotel.price.amount
    };

    return (
        <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-slate-50">
                <div className="max-w-7xl mx-auto p-6">
                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <Icon name="ArrowLeftIcon" size={20} />
                        <span className="font-medium">Back to results</span>
                    </button>

                    {/* Modern Image Gallery */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6">
                        <div className="relative h-[500px] bg-slate-900">
                            {hotel.images && hotel.images.length > 0 && (
                                <>
                                    <img
                                        src={hotel.images[activeImageIndex]}
                                        alt={hotel.title}
                                        className="w-full h-full object-cover"
                                    />
                                    
                                    {/* Navigation Arrows */}
                                    {hotel.images.length > 1 && (
                                        <>
                                            <button
                                                onClick={() => setActiveImageIndex(prev => prev === 0 ? hotel.images!.length - 1 : prev - 1)}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
                                            >
                                                <Icon name="ChevronLeftIcon" size={24} className="text-slate-900" />
                                            </button>
                                            <button
                                                onClick={() => setActiveImageIndex(prev => prev === hotel.images!.length - 1 ? 0 : prev + 1)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
                                            >
                                                <Icon name="ChevronRightIcon" size={24} className="text-slate-900" />
                                            </button>
                                        </>
                                    )}

                                    {/* Thumbnail Strip */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-md rounded-full px-4 py-2">
                                        {hotel.images.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImageIndex(idx)}
                                                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                                    idx === activeImageIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>

                                    {/* Image Counter */}
                                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                                        {activeImageIndex + 1} / {hotel.images.length}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Hotel Header */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{hotel.title}</h1>
                                        <p className="text-slate-600 flex items-center gap-2">
                                            <Icon name="MapPinIcon" size={18} />
                                            {hotel.details.location}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl">
                                        <Icon name="StarIcon" size={20} className="text-emerald-600 fill-emerald-600" />
                                        <span className="text-2xl font-bold text-emerald-700">{hotel.details.rating}</span>
                                        <span className="text-slate-500 text-sm">/ 5</span>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2">
                                    {hotel.tags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full capitalize">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-900 mb-4">About this property</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    {hotel.description || "Experience luxury and comfort at its finest. This property offers world-class amenities and exceptional service."}
                                </p>
                            </div>

                            {/* Amenities */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-900 mb-6">Amenities</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {(showAllAmenities ? hotel.facilities : hotel.facilities?.slice(0, 9))?.map(facility => (
                                        <div key={facility} className="flex items-center gap-3 text-slate-700">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                                <Icon name="CheckIcon" size={18} className="text-indigo-600" />
                                            </div>
                                            <span className="font-medium">{facility}</span>
                                        </div>
                                    ))}
                                </div>
                                {hotel.facilities && hotel.facilities.length > 9 && (
                                    <button
                                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                                        className="mt-4 text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
                                    >
                                        {showAllAmenities ? 'Show less' : `Show all ${hotel.facilities.length} amenities`}
                                        <Icon name={showAllAmenities ? "ChevronUpIcon" : "ChevronDownIcon"} size={16} />
                                    </button>
                                )}
                            </div>
                            {/* Guest Reviews */}
                            {hotel.tags.length > 0 && (
                                <div className="bg-white rounded-2xl p-6 shadow-sm">
                                    <h2 className="text-xl font-bold text-slate-900 mb-6">Guest Reviews</h2>
                                    <div className="space-y-4">
                                        {/* Mock reviews - in real app, these would come from hotel data */}
                                        {[
                                            { name: "Priya S.", rating: 5, comment: "Absolutely stunning property! The service was impeccable.", date: "2 days ago" },
                                            { name: "Rajesh K.", rating: 4, comment: "Great location and beautiful rooms. Highly recommend!", date: "1 week ago" },
                                            { name: "Sarah J.", rating: 5, comment: "Perfect for a family vacation. Kids loved the pool!", date: "2 weeks ago" }
                                        ].map((review, idx) => (
                                            <div key={idx} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                            {review.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{review.name}</p>
                                                            <p className="text-xs text-slate-500">{review.date}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                                                        <Icon name="StarIcon" size={14} className="text-emerald-600 fill-emerald-600" />
                                                        <span className="text-sm font-bold text-emerald-700">{review.rating}</span>
                                                    </div>
                                                </div>
                                                <p className="text-slate-600 text-sm">{review.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Booking Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6 space-y-4">
                                {/* Price Card */}
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-3xl font-bold text-slate-900">
                                                ₹{hotel.price.amount.toLocaleString()}
                                            </span>
                                            <span className="text-slate-500">/ night</span>
                                        </div>
                                        <p className="text-sm text-emerald-600 font-medium">Includes taxes & fees</p>
                                    </div>

                                    <button
                                        onClick={handleBook}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 mb-4"
                                    >
                                        <span>Book Now</span>
                                        <Icon name="ArrowRightIcon" size={18} />
                                    </button>

                                    <p className="text-center text-xs text-slate-500">
                                        Free cancellation • No prepayment needed
                                    </p>
                                </div>
                                {/* Agent Business Metrics */}
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                                            <Icon name="CurrencyRupeeIcon" size={16} className="text-white" />
                                        </div>
                                        <h3 className="font-bold text-emerald-900">Agent Earnings</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Commission */}
                                        <div className="flex justify-between items-center pb-3 border-b border-emerald-200">
                                            <span className="text-sm text-emerald-700 font-medium">Commission</span>
                                            <span className="text-lg font-bold text-emerald-900">
                                                ₹{agentMetrics.commission.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Cost Price */}
                                        <div className="flex justify-between items-center pb-3 border-b border-emerald-200">
                                            <span className="text-sm text-emerald-700 font-medium">B2B Cost</span>
                                            <span className="text-sm font-semibold text-emerald-800">
                                                ₹{agentMetrics.b2bPrice.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Markup */}
                                        <div className="flex justify-between items-center pb-3 border-b border-emerald-200">
                                            <span className="text-sm text-emerald-700 font-medium">Your Markup</span>
                                            <span className="text-sm font-semibold text-emerald-800">
                                                {agentMetrics.markup}%
                                            </span>
                                        </div>

                                        {/* Selling Price */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-emerald-700 font-medium">Selling Price</span>
                                            <span className="text-lg font-bold text-emerald-900">
                                                ₹{hotel.price.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Profit Highlight */}
                                    <div className="mt-4 p-3 bg-white rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Your Profit</span>
                                            <span className="text-2xl font-bold text-emerald-600">
                                                ₹{agentMetrics.commission.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-emerald-600 mt-1">Per night booking</p>
                                    </div>
                                </div>

                                {/* Quick Info */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-4">Property Highlights</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Icon name="MapPinIcon" size={16} className="text-indigo-600" />
                                            <span className="text-slate-600">Prime location</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Icon name="WifiIcon" size={16} className="text-indigo-600" />
                                            <span className="text-slate-600">Free high-speed WiFi</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Icon name="CheckCircleIcon" size={16} className="text-indigo-600" />
                                            <span className="text-slate-600">Instant confirmation</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
