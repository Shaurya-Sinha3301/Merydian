'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InterestCard from './InterestCard';
import DotGrid from '@/components/DotGrid';

interface InterestCategory {
    id: string;
    icon: string;
    title: string;
    description: string;
    value: number;
}

export default function PreferencesInteractive() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [interests, setInterests] = useState<InterestCategory[]>([
        {
            id: 'history',
            icon: '🏛️',
            title: 'History & Heritage',
            description: 'Museums, historical sites, ancient ruins, monuments',
            value: 0.5,
        },
        {
            id: 'architecture',
            icon: '🏗️',
            title: 'Architecture & Design',
            description: 'Modern buildings, traditional structures, urban design',
            value: 0.5,
        },
        {
            id: 'food',
            icon: '🍜',
            title: 'Food & Cuisine',
            description: 'Local restaurants, street food, culinary experiences',
            value: 0.5,
        },
        {
            id: 'nature',
            icon: '🌿',
            title: 'Nature & Wildlife',
            description: 'Parks, hiking, beaches, wildlife, natural landscapes',
            value: 0.5,
        },
        {
            id: 'nightlife',
            icon: '🎉',
            title: 'Nightlife & Entertainment',
            description: 'Bars, clubs, live music, theater, concerts',
            value: 0.5,
        },
        {
            id: 'shopping',
            icon: '🛍️',
            title: 'Shopping & Markets',
            description: 'Local markets, boutiques, shopping districts',
            value: 0.5,
        },
        {
            id: 'religious',
            icon: '🕌',
            title: 'Religious & Spiritual',
            description: 'Temples, churches, mosques, spiritual sites',
            value: 0.5,
        },
        {
            id: 'adventure',
            icon: '🧗',
            title: 'Adventure & Sports',
            description: 'Extreme sports, water activities, trekking, adventure',
            value: 0.5,
        },
        {
            id: 'arts',
            icon: '🎨',
            title: 'Arts & Culture',
            description: 'Galleries, cultural events, performances, crafts',
            value: 0.5,
        },
        {
            id: 'wellness',
            icon: '🧘',
            title: 'Relaxation & Wellness',
            description: 'Spas, wellness centers, yoga, peaceful retreats',
            value: 0.5,
        },
        {
            id: 'local_life',
            icon: '🏘️',
            title: 'Local Life & Authentic Experiences',
            description: 'Interact with locals, homestays, community visits',
            value: 0.5,
        },
        {
            id: 'photography',
            icon: '📸',
            title: 'Photography & Scenic Views',
            description: 'Viewpoints, Instagram spots, landscape photography',
            value: 0.5,
        },
    ]);

    const handleInterestChange = (id: string, value: number) => {
        setInterests((prev) =>
            prev.map((interest) =>
                interest.id === id ? { ...interest, value } : interest
            )
        );
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        // Create interest vector object
        const interestVector: Record<string, number> = {};
        interests.forEach((interest) => {
            interestVector[interest.id] = Number(interest.value.toFixed(2));
        });

        console.log('Interest Vector:', interestVector);

        // TODO: Send to backend API
        // await fetch('/api/customer/preferences', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ interest_vector: interestVector }),
        // });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Store in localStorage for now (will be replaced with backend)
        localStorage.setItem('user_preferences', JSON.stringify(interestVector));
        localStorage.setItem('preferences_completed', 'true');

        // Navigate to trip request page to finalize trip details
        router.push('/customer-trip-request');
    };

    const averageInterest = interests.reduce((sum, i) => sum + i.value, 0) / interests.length;

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* DotGrid Background with settings from user's image */}
            <div className="absolute inset-0 z-0">
                <DotGrid
                    dotSize={1}
                    gap={18}
                    baseColor="#000000"
                    activeColor="#111827"
                    proximity={250}
                    shockRadius={330}
                    shockStrength={11}
                    resistance={650}
                    returnDuration={1.2}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12 animate-fade-in-up">
                        <div className="inline-block mb-4">
                            <div className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 shadow-sm">
                                One-Time Setup
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Tell Us Your Travel Interests
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Help us personalize your perfect trip by sharing what excites you most.
                            Adjust the sliders below to indicate your level of interest in each category.
                        </p>
                    </div>

                    {/* Overall Interest Indicator - Neumorphic Design */}
                    <div className="neu-raised bg-white rounded-2xl p-6 mb-8 animate-fade-in-up animate-delay-200 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Profile Completeness</h3>
                                <p className="text-xs text-gray-500">Average interest level across all categories</p>
                            </div>
                            <div className="text-3xl font-bold text-gray-900">
                                {Math.round(averageInterest * 100)}%
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-gray-200 rounded-full h-3 shadow-inner">
                            <div
                                className="bg-gradient-to-r from-gray-800 to-gray-900 h-3 rounded-full transition-all duration-500 shadow-sm"
                                style={{ width: `${averageInterest * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Interest Categories Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {interests.map((interest, index) => (
                            <div
                                key={interest.id}
                                className="animate-fade-in-up"
                                style={{
                                    animationDelay: `${0.1 + index * 0.05}s`,
                                    animationFillMode: 'both',
                                }}
                            >
                                <InterestCard
                                    icon={interest.icon}
                                    title={interest.title}
                                    description={interest.description}
                                    value={interest.value}
                                    onChange={(value) => handleInterestChange(interest.id, value)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons - Neumorphic */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animate-delay-600">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`
                px-8 py-4 bg-gray-900 text-white rounded-xl font-bold
                text-lg shadow-lg hover:shadow-xl
                transform transition-all duration-300
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:bg-gray-800'}
              `}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Saving Preferences...
                                </span>
                            ) : (
                                'Continue to Trip Planning'
                            )}
                        </button>

                        <button
                            onClick={() => {
                                // Reset all to 50%
                                setInterests(prev => prev.map(i => ({ ...i, value: 0.5 })));
                            }}
                            className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                        >
                            Reset All to Default
                        </button>
                    </div>

                    {/* Info Banner - Black/White Theme */}
                    <div className="mt-8 bg-white border border-gray-200 rounded-xl p-4 text-center animate-fade-in-up animate-delay-600 neu-raised">
                        <p className="text-sm text-gray-800">
                            <span className="font-semibold">💡 Pro Tip:</span> You can always update your preferences later from your profile settings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
