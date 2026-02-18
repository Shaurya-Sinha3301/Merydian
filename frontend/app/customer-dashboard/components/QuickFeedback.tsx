'use client';

import { Send, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface QuickFeedbackProps {
    onFeedbackSubmit: (message: string) => Promise<void>;
    isLoading?: boolean;
}

export default function QuickFeedback({ onFeedbackSubmit, isLoading = false }: QuickFeedbackProps) {
    const [message, setMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

    const suggestions = [
        "add qutub minar",
        "add india gate",
        "add lotus temple",
        "remove safdarjung tomb"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) return;

        setStatusMessage('');
        setStatusType('');

        try {
            await onFeedbackSubmit(message);
            setStatusType('success');
            setStatusMessage('Itinerary updated!');
            setMessage('');

            // Clear success message after 3 seconds
            setTimeout(() => {
                setStatusMessage('');
                setStatusType('');
            }, 3000);
        } catch (error) {
            setStatusType('error');
            setStatusMessage('Failed to update itinerary');
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setMessage(suggestion);
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-gray-900">Quick Feedback</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g., add red fort"
                        disabled={isLoading}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !message.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Status Message */}
                {statusMessage && (
                    <div className={`text-sm font-medium px-3 py-2 rounded-lg ${statusType === 'success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                        {statusMessage}
                    </div>
                )}

                {/* Suggestions */}
                <div className="space-y-2">
                    <p className="text-xs text-gray-600">Try these:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                disabled={isLoading}
                                className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    💡 Type natural requests like "add [location]" or "remove [location]" to modify your itinerary
                </p>
            </div>
        </div>
    );
}
