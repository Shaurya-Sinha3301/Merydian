"use client";

import React from 'react';
import { SearchResult } from '@/lib/agent-dashboard/apiService';
import Icon from '@/components/ui/AppIcon';

interface BookingResultsListProps {
    results: SearchResult[];
    onSelect: (result: SearchResult) => void;
}

export default function BookingResultsList({ results, onSelect }: BookingResultsListProps) {
    if (results.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/60">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="MagnifyingGlassIcon" size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No Results Found</h3>
                <p className="text-slate-500 text-sm mt-1">Try adjusting your search criteria.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {results.map((result) => (
                <div
                    key={result.id}
                    className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer relative overflow-hidden"
                    onClick={() => onSelect(result)}
                >
                    {result.type === 'Hotel' && result.images && result.images.length > 0 ? (
                        // HOTEL CARD LAYOUT
                        <div className="flex flex-col md:flex-row">
                            {/* Image Section */}
                            <div className="w-full md:w-64 h-48 md:h-auto relative">
                                <img
                                    src={result.images[0]}
                                    alt={result.title}
                                    className="w-full h-full object-cover"
                                />
                                {result.details.rating && (
                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-slate-900 flex items-center gap-1 shadow-sm">
                                        <Icon name="StarIcon" size={12} className="text-yellow-500 fill-yellow-500" />
                                        {result.details.rating}
                                    </div>
                                )}
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">{result.title}</h3>
                                            <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                                                <Icon name="MapPinIcon" size={14} />
                                                {result.details.location}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {result.facilities?.slice(0, 3).map(facility => (
                                            <span key={facility} className="px-2 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-md flex items-center gap-1">
                                                <Icon name="CheckCircleIcon" size={12} className="text-emerald-500/70" />
                                                {facility}
                                            </span>
                                        ))}
                                        {(result.facilities?.length || 0) > 3 && (
                                            <span className="px-2 py-1 bg-slate-50 text-slate-400 text-xs font-medium rounded-md">
                                                +{result.facilities!.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase">Price per night</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: result.price.currency, maximumFractionDigits: 0 }).format(result.price.amount)}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">Includes taxes & fees</p>
                                    </div>
                                    <button className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/10 group-hover:bg-indigo-600 group-hover:shadow-indigo-600/20 transition-all active:scale-95">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // DEFAULT / FLIGHT CARD LAYOUT
                        <div className="p-5 flex flex-col md:flex-row gap-6 items-center">
                            {/* Provider Logo / Icon */}
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 font-bold text-xs uppercase tracking-wider text-center p-2 border border-slate-100">
                                    {result.provider}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 text-center md:text-left w-full">
                                <h3 className="font-bold text-lg text-slate-900">{result.title}</h3>
                                <p className="text-slate-500 font-medium text-sm mt-0.5">{result.subtitle}</p>

                                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                                    {result.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-slate-100">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Price & Action */}
                            <div className="flex-shrink-0 text-center md:text-right w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                                <p className="text-2xl font-bold text-slate-900">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: result.price.currency, maximumFractionDigits: 0 }).format(result.price.amount)}
                                </p>
                                <button className="mt-2 w-full md:w-auto px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-lg shadow-slate-900/10 group-hover:bg-indigo-600 group-hover:shadow-indigo-600/20 transition-all active:scale-95">
                                    Select
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
