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
                    className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer relative"
                    onClick={() => onSelect(result)}
                >
                    <div className="flex flex-col md:flex-row gap-6 items-center">
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
                </div>
            ))}
        </div>
    );
}
