"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import Icon from '@/components/ui/AppIcon';
import { mockRequests } from '@/lib/agent-dashboard/data';
import { TripRequest, Traveler } from '@/lib/agent-dashboard/types';
import { apiService, SearchCriteria, SearchResult } from '@/lib/agent-dashboard/apiService';
import BookingSearchForm from './components/BookingSearchForm';
import BookingResultsList from './components/BookingResultsList';

export default function NewBookingPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const type = searchParams.get('type') || 'Flight';
    const groupId = searchParams.get('groupId');

    const [group, setGroup] = useState<TripRequest | null>(null);
    const [step, setStep] = useState<'search' | 'results' | 'book'>('search');

    // Search State
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);

    // Selection State
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
    const [selectedTravelers, setSelectedTravelers] = useState<string[]>([]);

    useEffect(() => {
        if (groupId) {
            const foundGroup = mockRequests.find(r => r.id === groupId) || null;
            setGroup(foundGroup);
            if (foundGroup && foundGroup.members) {
                setSelectedTravelers(foundGroup.members.map(m => m.id));
            }
        }
    }, [groupId]);

    // Handle pre-selection from Details Page (Simulated)
    useEffect(() => {
        const selectedId = searchParams.get('selectedId');
        const stepParam = searchParams.get('step');

        if (selectedId && stepParam === 'book') {
            const fetchAndSelect = async () => {
                const results = await apiService.search({
                    type: type as any,
                    date: '2026-03-15',
                    travelers: 1
                });
                const found = results.find(r => r.id === selectedId);
                if (found) {
                    setSearchCriteria({
                        type: type as any,
                        date: '2026-03-15',
                        travelers: 1
                    }); // Mock props
                    setSelectedResult(found);
                    setStep('book');
                }
            };
            fetchAndSelect();
        }
    }, [searchParams, type]);

    const handleSearch = async (criteria: SearchCriteria) => {
        setSearchCriteria(criteria);
        setIsLoading(true);
        try {
            const results = await apiService.search(criteria);
            setSearchResults(results);
            setStep('results');
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectResult = (result: SearchResult) => {
        setSelectedResult(result);
        setStep('book');
    };

    const handleTravelerToggle = (travelerId: string) => {
        setSelectedTravelers(prev =>
            prev.includes(travelerId)
                ? prev.filter(id => id !== travelerId)
                : [...prev, travelerId]
        );
    };

    const handleConfirmBooking = () => {
        // Build the booking object conforming to our data model
        const newBooking = {
            id: `BK-${Date.now()}`,
            type: selectedResult?.type,
            status: 'Confirmed',
            details: {
                provider: selectedResult?.provider,
                reservationNumber: `RES-${Math.floor(Math.random() * 10000)}`,
                date: searchCriteria?.date,
                description: selectedResult?.title,
                cost: selectedResult?.price.amount,
                currency: selectedResult?.price.currency,
                location: selectedResult?.details.location
            }
        };

        console.log("Confirming Booking:", {
            group: group?.id,
            booking: newBooking,
            travelers: selectedTravelers
        });

        // In a real app, we would POST this to the backend
        // For now, we just redirect back to the bookings list
        router.push(`/agent-dashboard/bookings?groupId=${groupId}`);
    };

    if (!group) return <div>Loading...</div>;

    return (
        <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                <NavigationBreadcrumbs />

                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                            <span>Step {step === 'search' ? 1 : step === 'results' ? 2 : 3} of 3</span>
                            <span className="text-slate-300">•</span>
                            <span>{step === 'search' ? 'Search' : step === 'results' ? 'Select Option' : 'Confirm Booking'}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">New {type} Booking</h1>
                        <p className="text-slate-500 mt-1">For <span className="font-semibold text-slate-700">{group.customerName}</span></p>
                    </div>

                    {/* Step 1: Search */}
                    {step === 'search' && (
                        <BookingSearchForm
                            type={type}
                            onSearch={handleSearch}
                            isLoading={isLoading}
                        />
                    )}

                    {/* Step 2: Results */}
                    {step === 'results' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {searchResults.length} Results found
                                </h2>
                                <button
                                    onClick={() => setStep('search')}
                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                                >
                                    Modify Search
                                </button>
                            </div>
                            <BookingResultsList
                                results={searchResults}
                                onSelect={handleSelectResult}
                            />
                        </div>
                    )}

                    {/* Step 3: Review & Book */}
                    {step === 'book' && selectedResult && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">

                            {/* Selected Option Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{selectedResult.provider}</h3>
                                        <p className="text-slate-500">{selectedResult.title}</p>
                                    </div>
                                    <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                                        Selected
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-slate-400 font-bold text-xs uppercase">Date</p>
                                        <p className="font-bold text-slate-700">{searchCriteria?.date}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-bold text-xs uppercase">Time</p>
                                        <p className="font-bold text-slate-700">{selectedResult.details.startTime}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-bold text-xs uppercase">Price</p>
                                        <p className="font-bold text-slate-900">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: selectedResult.price.currency, maximumFractionDigits: 0 }).format(selectedResult.price.amount)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Travelers Selection */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Icon name="UsersIcon" size={20} className="text-indigo-600" />
                                    Assign Travelers
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
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 justify-end pt-4">
                                <button
                                    onClick={() => setStep('results')}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleConfirmBooking}
                                    className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <Icon name="CheckIcon" size={20} />
                                    Confirm Booking
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
