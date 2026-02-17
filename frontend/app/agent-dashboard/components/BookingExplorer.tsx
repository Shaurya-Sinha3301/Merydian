'use client';

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, MapPin, Calendar, Users, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import { apiService, SearchResult } from '@/lib/agent-dashboard/apiService';
import HotelCard from './HotelCard';
import DisruptionAlert from './DisruptionAlert';

interface BookingExplorerProps {
    requestId?: string; // If provided, pre-fill data for this request
    initialLocation?: string;
}

const BookingExplorer: React.FC<BookingExplorerProps> = ({ requestId, initialLocation = "Goa" }) => {
    const [viewMode, setViewMode] = useState<'customer' | 'agent'>('agent');
    const [searchQuery, setSearchQuery] = useState(initialLocation);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDisruption, setShowDisruption] = useState(false);
    const [activeTab, setActiveTab] = useState<'Stays' | 'Flights' | 'Transport'>('Stays');

    useEffect(() => {
        handleSearch();

        // Simulate a disruption alert appearing after 5 seconds to demo the feature
        const timer = setTimeout(() => {
            setShowDisruption(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleSearch = async () => {
        setLoading(true);
        try {
            // In a real app, we'd use activeTab to filter searching
            // For this demo, we'll fetch Hotels when on Stays tab
            const data = await apiService.search({
                type: activeTab === 'Stays' ? 'Hotel' : (activeTab === 'Flights' ? 'Flight' : 'Cab'),
                destination: searchQuery,
                date: '2023-11-15', // Demo date
                travelers: 2,
            });
            setResults(data);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background min-h-screen">
            {/* Header / Control Bar */}
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border pb-4 pt-2 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">Booking Explorer</h2>
                        <p className="text-sm text-muted-foreground">Find and book travel elements for your itinerary</p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center bg-secondary rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setViewMode('customer')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'customer' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Users className="w-4 h-4" /> Customer View
                        </button>
                        <button
                            onClick={() => setViewMode('agent')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'agent' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutDashboard className="w-4 h-4" /> Agent Dashboard
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                            placeholder="Where are you going?"
                        />
                    </div>
                    <div className="relative w-full md:w-48">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="date"
                            defaultValue="2023-11-15"
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        <Search className="w-5 h-5" /> Search
                    </button>
                </div>

                {/* Categories */}
                <div className="flex gap-6 mt-6 border-b border-border px-1">
                    {['Stays', 'Flights', 'Transport'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab as any); handleSearch(); }}
                            className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-8">
                {/* Filter Sidebar */}
                <div className="w-64 hidden lg:block sticky top-32 h-[calc(100vh-10rem)] overflow-y-auto pr-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filters</h3>
                        <span className="text-xs text-primary cursor-pointer">Reset</span>
                    </div>

                    {/* Filter Groups */}
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-medium mb-3">Budget (per night)</h4>
                            <input type="range" className="w-full mb-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>₹1000</span>
                                <span>₹50000+</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium mb-3">Star Rating</h4>
                            <div className="space-y-2">
                                {[5, 4, 3].map(star => (
                                    <label key={star} className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                        <div className="flex text-yellow-500">
                                            {[...Array(star)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium mb-3">Amenities</h4>
                            <div className="space-y-2">
                                {['WiFi', 'Pool', 'Spa', 'Parking', 'Gym'].map(amenity => (
                                    <label key={amenity} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                        {amenity}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="flex-1">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-64 bg-muted animate-pulse rounded-xl"></div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <p className="mb-4 text-sm text-muted-foreground">Found {results.length} results for "{searchQuery}"</p>
                            {results.map(result => {
                                if (result.type === 'Hotel') {
                                    return (
                                        <HotelCard
                                            key={result.id}
                                            hotel={result}
                                            viewMode={viewMode}
                                            onAddToItinerary={(h) => console.log('Add', h)}
                                            onProposeAlternative={(h) => console.log('Propose', h)}
                                        />
                                    );
                                }
                                // Fallback for non-hotel items for now
                                return (
                                    <div key={result.id} className="p-4 border rounded-lg mb-4 bg-card">
                                        <h3 className="font-bold">{result.title}</h3>
                                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {showDisruption && viewMode === 'agent' && (
                <DisruptionAlert
                    onDismiss={() => setShowDisruption(false)}
                    onResolve={() => {
                        setShowDisruption(false);
                        alert("Replacement hotel booked successfully!");
                    }}
                />
            )}
        </div>
    );
};

export default BookingExplorer;
