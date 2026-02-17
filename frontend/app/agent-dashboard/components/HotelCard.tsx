'use client';

import React from 'react';
import { SearchResult } from '@/lib/agent-dashboard/types';
import { MapPin, Star, Wifi, Coffee, Users, Info, AlertTriangle, ArrowRightLeft } from 'lucide-react';

interface HotelCardProps {
    hotel: SearchResult;
    viewMode: 'customer' | 'agent';
    onAddToItinerary: (hotel: SearchResult) => void;
    onProposeAlternative?: (hotel: SearchResult) => void;
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, viewMode, onAddToItinerary, onProposeAlternative }) => {
    const { title, subtitle, details, price, images, facilities, agentMetrics } = hotel;

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row mb-4">
            {/* Image Section */}
            <div className="relative w-full md:w-1/3 h-56 md:h-auto">
                {images && images.length > 0 ? (
                    <img
                        src={images[0]}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                        No Image
                    </div>
                )}
                {hotel.tags.includes('luxury') && (
                    <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full uppercase tracking-wider">
                        Luxury
                    </span>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-foreground">{title}</h3>
                            <p className="text-muted-foreground text-sm">{subtitle}</p>
                        </div>
                        {details.rating && (
                            <div className="flex items-center bg-primary/10 text-primary px-2 py-1 rounded">
                                <Star className="w-4 h-4 fill-current mr-1" />
                                <span className="font-semibold">{details.rating}</span>
                            </div>
                        )}
                    </div>

                    {details.location && (
                        <div className="flex items-center text-muted-foreground mt-2 text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            {details.location}
                        </div>
                    )}

                    {/* Facilities */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {facilities?.slice(0, 4).map((facility, index) => (
                            <span key={index} className="flex items-center text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                                {facility === 'Free WiFi' && <Wifi className="w-3 h-3 mr-1" />}
                                {facility === 'Restaurant' && <Coffee className="w-3 h-3 mr-1" />}
                                {facility}
                            </span>
                        ))}
                        {facilities && facilities.length > 4 && (
                            <span className="text-xs text-muted-foreground flex items-center px-1">+{facilities.length - 4} more</span>
                        )}
                    </div>

                    {/* Agent View - Metrics */}
                    {viewMode === 'agent' && agentMetrics && (
                        <div className="mt-4 p-3 bg-muted/30 border border-dashed border-border rounded-lg text-sm grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-muted-foreground block text-xs">B2B Price</span>
                                <span className="font-semibold text-foreground">₹{agentMetrics.b2bPrice.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs">Projected Commission</span>
                                <span className="font-semibold text-green-600">₹{agentMetrics.commission.toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 flex items-center text-xs text-blue-600 mt-1 cursor-pointer hover:underline">
                                <Info className="w-3 h-3 mr-1" /> View Margin Breakdown
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-border">
                    <div>
                        <p className="text-sm text-muted-foreground">Price for 1 night</p>
                        <div className="flex items-baseline">
                            <span className="text-2xl font-bold text-foreground">₹{price.amount.toLocaleString()}</span>
                            {viewMode === 'agent' && (
                                <span className="ml-2 text-xs text-muted-foreground line-through">₹{(price.amount * 1.1).toFixed(0)}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {viewMode === 'agent' && onProposeAlternative && (
                            <button
                                onClick={() => onProposeAlternative(hotel)}
                                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center"
                            >
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Propose Alt
                            </button>
                        )}
                        <button
                            onClick={() => onAddToItinerary(hotel)}
                            className="px-6 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                        >
                            Add to Itinerary
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HotelCard;
