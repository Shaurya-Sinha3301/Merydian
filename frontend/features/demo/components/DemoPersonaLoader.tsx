'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoService } from '@/services/demo';
import { Users, Loader2, Heart, Backpack, Accessibility } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PERSONAS = [
  { id: 'family_vacation', title: 'Family Vacation', description: '2 adults, 2 kids. Needs kid-friendly pacing and connected rooms.', icon: <Users className="w-6 h-6 text-blue-500" /> },
  { id: 'luxury_couple', title: 'Luxury Couple', description: 'High budget, fine dining, private transfers, exclusive access.', icon: <Heart className="w-6 h-6 text-pink-500" /> },
  { id: 'budget_backpacker', title: 'Budget Backpacker', description: 'Hostels, public transit, free walking tours, very price sensitive.', icon: <Backpack className="w-6 h-6 text-emerald-500" /> },
  { id: 'elderly_travelers', title: 'Elderly Travelers', description: 'Slow pace, no stairs, early dinners, comfortable transport.', icon: <Users className="w-6 h-6 text-purple-500" /> },
  { id: 'accessibility_trip', title: 'Accessibility Trip', description: 'Wheelchair accessible routes, ground floor access, specialized transport.', icon: <Accessibility className="w-6 h-6 text-orange-500" /> },
];

export function DemoPersonaLoader() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth(); // Assume we have a generic login or we just set token

  const loadPersona = async (personaId: string) => {
    try {
      setIsLoading(personaId);
      // 1. Tell backend to seed/load data
      const res = await demoService.loadPersona(personaId);
      
      // 2. Log them in as the customer
      // Assuming demo endpoints return an access token or we mock it for demo
      if (res.access_token) {
         if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', res.access_token);
         }
      }
      
      // 3. Redirect to customer dashboard
      router.push('/customer-dashboard');
      
    } catch (error) {
      console.error('Failed to load persona:', error);
      alert('Failed to load demo persona. Is backend running?');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Select a Demo Persona</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Choose a pre-configured persona to experience the end-to-end optimization workflow. 
          The backend will automatically generate realistic constraints, preferences, and itineraries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PERSONAS.map(persona => (
          <button
            key={persona.id}
            onClick={() => loadPersona(persona.id)}
            disabled={!!isLoading}
            className="flex flex-col text-left bg-white border border-gray-200 rounded-xl p-6 hover:border-emerald-500 hover:shadow-md transition-all group disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden"
          >
            {isLoading === persona.id && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg inline-flex mb-4 group-hover:scale-110 transition-transform">
              {persona.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{persona.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{persona.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
