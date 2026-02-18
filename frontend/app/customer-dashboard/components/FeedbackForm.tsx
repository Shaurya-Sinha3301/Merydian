'use client';

import { Send, Star } from 'lucide-react';
import { useState } from 'react';

export default function FeedbackForm() {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [category, setCategory] = useState('service');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log({ rating, feedback, category });
        // TODO: Submit to API
        alert('Feedback submitted!');
        setRating(0);
        setFeedback('');
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Submit Feedback</h3>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Rating */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Rate Your Experience</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`w-6 h-6 ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                        <option value="service">Service</option>
                        <option value="itinerary">Itinerary</option>
                        <option value="agent">Agent</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                {/* Feedback Text */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Your Feedback</label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                        rows={3}
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
                >
                    <Send className="w-4 h-4" />
                    Submit Feedback
                </button>
            </form>
        </div>
    );
}
