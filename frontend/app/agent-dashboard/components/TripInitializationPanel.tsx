'use client';

import { useState } from 'react';
import { apiClient, TripWithOptimizationResponse } from '@/services/api';
import { Plus, X, Send, CheckCircle, Loader2, Users, MapPin, Calendar } from 'lucide-react';

interface EmailEntry {
    email: string;
    full_name: string;
    members: number;
    children: number;
}

interface TripInitPanelProps {
    onTripCreated?: (result: TripWithOptimizationResponse) => void;
}

export default function TripInitializationPanel({ onTripCreated }: TripInitPanelProps) {
    const [tripName, setTripName] = useState('');
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [autoApprove, setAutoApprove] = useState(true);
    const [emails, setEmails] = useState<EmailEntry[]>([
        { email: '', full_name: '', members: 2, children: 0 },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<TripWithOptimizationResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const addEmailEntry = () => {
        setEmails([...emails, { email: '', full_name: '', members: 2, children: 0 }]);
    };

    const removeEmailEntry = (index: number) => {
        if (emails.length > 1) {
            setEmails(emails.filter((_, i) => i !== index));
        }
    };

    const updateEmailEntry = (index: number, field: keyof EmailEntry, value: string | number) => {
        const updated = [...emails];
        (updated[index] as any)[field] = value;
        setEmails(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setResult(null);

        const validEmails = emails.filter(e => e.email.trim());
        if (!validEmails.length) {
            setError('Please add at least one traveller email.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiClient.initializeTripWithOptimization({
                trip_name: tripName,
                destination,
                start_date: startDate,
                end_date: endDate,
                traveller_emails: validEmails.map(e => ({
                    email: e.email.trim(),
                    full_name: e.full_name.trim() || undefined,
                    members: e.members,
                    children: e.children,
                })),
                auto_approve: autoApprove,
            });

            setResult(response);
            onTripCreated?.(response);
        } catch (err: any) {
            setError(err.message || 'Failed to initialize trip');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (result) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                        <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                            Trip Initialized Successfully!
                        </h3>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Trip ID</p>
                        <p className="font-mono text-sm">{result.trip_id}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Optimizer</p>
                        <p className="text-sm">{result.optimizer_ran ? 'ML Optimized' : 'Baseline Skeleton'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Families</p>
                        <p className="text-sm">{result.summary.families_registered} registered</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium text-green-600">
                            {result.auto_approved ? 'Auto-Approved & Published' : 'Pending Agent Approval'}
                        </p>
                    </div>
                </div>

                {result.registered_families && result.registered_families.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Registered Travellers</h4>
                        <div className="space-y-1">
                            {result.registered_families.map((rf, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
                                >
                                    <span>{rf.email}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        rf.status === 'created'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    }`}>
                                        {rf.status === 'created' ? 'New Account' : 'Existing'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={() => {
                        setResult(null);
                        setTripName('');
                        setDestination('');
                        setStartDate('');
                        setEndDate('');
                        setEmails([{ email: '', full_name: '', members: 2, children: 0 }]);
                    }}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm"
                >
                    Initialize Another Trip
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Initialize New Trip
            </h3>

            {/* Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Trip Name</label>
                    <input
                        type="text"
                        value={tripName}
                        onChange={e => setTripName(e.target.value)}
                        required
                        placeholder="e.g. Delhi Family Adventure"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Destination</label>
                    <input
                        type="text"
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        required
                        placeholder="e.g. Delhi, India"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Start Date
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> End Date
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800"
                    />
                </div>
            </div>

            {/* Traveller Emails */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                        <Users className="w-4 h-4" /> Traveller Emails
                    </label>
                    <button
                        type="button"
                        onClick={addEmailEntry}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Family
                    </button>
                </div>

                <div className="space-y-3">
                    {emails.map((entry, i) => (
                        <div
                            key={i}
                            className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 relative"
                        >
                            {emails.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeEmailEntry(i)}
                                    className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="email"
                                    value={entry.email}
                                    onChange={e => updateEmailEntry(i, 'email', e.target.value)}
                                    placeholder="Email address"
                                    required
                                    className="px-3 py-1.5 border rounded text-sm dark:bg-slate-700 col-span-1 sm:col-span-2"
                                />
                                <input
                                    type="text"
                                    value={entry.full_name}
                                    onChange={e => updateEmailEntry(i, 'full_name', e.target.value)}
                                    placeholder="Full name (optional)"
                                    className="px-3 py-1.5 border rounded text-sm dark:bg-slate-700"
                                />
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-muted-foreground">Members</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={entry.members}
                                            onChange={e => updateEmailEntry(i, 'members', parseInt(e.target.value) || 1)}
                                            className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-muted-foreground">Children</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={entry.children}
                                            onChange={e => updateEmailEntry(i, 'children', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Auto-approve toggle */}
            <div className="flex items-center gap-2 mb-6">
                <input
                    type="checkbox"
                    id="autoApprove"
                    checked={autoApprove}
                    onChange={e => setAutoApprove(e.target.checked)}
                    className="rounded border-gray-300"
                />
                <label htmlFor="autoApprove" className="text-sm">
                    Auto-approve and publish itinerary to customers
                </label>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition font-medium"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Initializing Trip & Running Optimizer...
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        Initialize Trip with Optimization
                    </>
                )}
            </button>
        </form>
    );
}
