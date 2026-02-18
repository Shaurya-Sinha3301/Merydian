'use client';

import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

export default function ItinerarySelectionPage() {
    const router = useRouter();

    const handleSelect = (itineraryId: string) => {
        // Redirect to trip request with pre-filled param
        router.push(`/customer-trip-request?itinerary=${itineraryId}`);
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] p-6 md:p-12">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-gray-900">Choose Your Adventure</h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Select a curated itinerary skeleton to start your journey. We'll personalize it for you in the next step.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">

                    {/* Delhi Grand Tour Card - The Mock Demo */}
                    <div className="group relative bg-white rounded-3xl overflow-hidden shadow-neu-md hover:shadow-neu-lg transition-all duration-300 hover:-translate-y-1 border border-white/50">
                        <div className="absolute top-4 right-4 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full shadow-sm z-10">
                            BEST SELLER
                        </div>

                        {/* Image Placeholder */}
                        <div className="h-48 bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                            <span className="text-6xl filter drop-shadow-lg">🇮🇳</span>
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-end">
                                <span className="text-white font-bold text-lg">New Delhi, India</span>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Delhi Grand Tour</h3>
                                <p className="text-sm text-gray-500 mt-1">3 Days • Cultural Heritage • Food Walk</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Icon name="MapPinIcon" size={16} className="text-primary" />
                                    <span>Red Fort, Qutub Minar, Chandni Chowk</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Icon name="BanknotesIcon" size={16} className="text-green-600" />
                                    <span>Est. $200 - $500 / person</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleSelect('delhi_grand_tour')}
                                    className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>Select & Personalize</span>
                                    <Icon name="ArrowRightIcon" size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mumbai Placeholder */}
                    <div className="group relative bg-white rounded-3xl overflow-hidden shadow-neu-flat opacity-75 hover:opacity-100 transition-all duration-300 border border-white/50 grayscale hover:grayscale-0">
                        <div className="h-48 bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                            <span className="text-6xl">🌊</span>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Mumbai Coastal Vibe</h3>
                                <p className="text-sm text-gray-500 mt-1">3 Days • Modern • Nightlife</p>
                            </div>
                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    disabled
                                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed"
                                >
                                    <span>Coming Soon</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Jaipur Placeholder */}
                    <div className="group relative bg-white rounded-3xl overflow-hidden shadow-neu-flat opacity-75 hover:opacity-100 transition-all duration-300 border border-white/50 grayscale hover:grayscale-0">
                        <div className="h-48 bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center">
                            <span className="text-6xl">🏰</span>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Jaipur Royal Stay</h3>
                                <p className="text-sm text-gray-500 mt-1">4 Days • Palaces • History</p>
                            </div>
                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    disabled
                                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed"
                                >
                                    <span>Coming Soon</span>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
