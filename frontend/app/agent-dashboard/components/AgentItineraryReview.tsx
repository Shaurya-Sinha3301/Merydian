'use client';

import { useState, useEffect } from 'react';
import { apiClient, ItineraryOption } from '@/services/api';
import { CheckCircle, XCircle, Loader2, Eye, DollarSign, Star } from 'lucide-react';

interface AgentItineraryReviewProps {
    eventId: string;
    onApproved?: (optionId: string) => void;
}

export default function AgentItineraryReview({ eventId, onApproved }: AgentItineraryReviewProps) {
    const [options, setOptions] = useState<ItineraryOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [approvedOption, setApprovedOption] = useState<string | null>(null);

    useEffect(() => {
        loadOptions();
    }, [eventId]);

    const loadOptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.getAgentItineraryOptions(eventId);
            setOptions(res.options || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load options');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (optionId: string) => {
        setApproving(optionId);
        setError(null);
        try {
            await apiClient.approveOption(optionId);
            setApprovedOption(optionId);
            onApproved?.(optionId);
            // Refresh to see updated statuses
            await loadOptions();
        } catch (err: any) {
            setError(err.message || 'Approval failed');
        } finally {
            setApproving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading itinerary options...</span>
            </div>
        );
    }

    if (error && options.length === 0) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Itinerary Options for Review</h3>
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {options.map((option) => (
                <div
                    key={option.option_id}
                    className={`
                        border rounded-xl p-5 transition
                        ${option.status === 'APPROVED' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                          option.status === 'REJECTED' ? 'border-red-300 bg-red-50/50 dark:bg-red-900/5 opacity-60' :
                          'border-border hover:shadow-md'}
                    `}
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h4 className="font-medium text-sm">{option.summary}</h4>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    Cost: ₹{option.cost.toFixed(0)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5" />
                                    Satisfaction: {(option.satisfaction * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            option.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            option.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                            {option.status}
                        </span>
                    </div>

                    {/* Show itinerary details preview */}
                    {option.details?.itinerary?.days && (
                        <div className="mt-3 text-xs text-muted-foreground">
                            {option.details.itinerary.days.length} days •{' '}
                            {option.details.itinerary.days.reduce(
                                (sum: number, d: any) => sum + (d.pois?.length || d.activities?.length || 0), 0
                            )} POIs
                            {option.details.type && (
                                <span className="ml-2 italic">({option.details.type})</span>
                            )}
                        </div>
                    )}

                    {/* Approve button for PENDING options */}
                    {option.status === 'PENDING' && (
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => handleApprove(option.option_id)}
                                disabled={!!approving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium"
                            >
                                {approving === option.option_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                Approve & Publish
                            </button>
                        </div>
                    )}

                    {option.status === 'APPROVED' && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            Approved — itinerary published to customers
                        </div>
                    )}
                </div>
            ))}

            {options.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                    No itinerary options found for this event.
                </p>
            )}
        </div>
    );
}
