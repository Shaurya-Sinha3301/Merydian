'use client';

import { useState, useEffect } from 'react';
import { ItinerarySuggestion } from '@/app/customer-portal/components/SuggestChangeModal';

interface CustomerSuggestionsPanelProps {
  groupId?: string;
}

const CustomerSuggestionsPanel = ({ groupId }: CustomerSuggestionsPanelProps) => {
  const [suggestions, setSuggestions] = useState<ItinerarySuggestion[]>([]);
  const [filter, setFilter] = useState<'all' | 'add' | 'remove' | 'modify' | 'replace'>('all');

  useEffect(() => {
    // Load suggestions from localStorage
    const stored = localStorage.getItem('itinerarySuggestions');
    if (stored) {
      const allSuggestions = JSON.parse(stored) as ItinerarySuggestion[];
      setSuggestions(allSuggestions);
    }
  }, []);

  const filteredSuggestions = filter === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.type === filter);

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      'add-place': '➕',
      'remove-event': '➖',
      'more-adventure': '🏔️',
      'more-relaxing': '🧘',
      'change-timing': '⏰',
      'replace-activity': '🔄',
      'add-meal': '🍽️',
      'more-cultural': '🏛️',
      'kid-friendly': '👶',
      'other': '💡'
    };
    return icons[action] || '💡';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'add': 'bg-green-50 border-green-200 text-green-800',
      'remove': 'bg-red-50 border-red-200 text-red-800',
      'modify': 'bg-blue-50 border-blue-200 text-blue-800',
      'replace': 'bg-purple-50 border-purple-200 text-purple-800',
      'general': 'bg-gray-50 border-gray-200 text-gray-800'
    };
    return colors[type] || colors.general;
  };

  const handleDismiss = (index: number) => {
    const updated = suggestions.filter((_, i) => i !== index);
    setSuggestions(updated);
    localStorage.setItem('itinerarySuggestions', JSON.stringify(updated));
  };

  const handleMarkAsImplemented = (index: number) => {
    // In a real app, this would update the backend
    handleDismiss(index);
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Customer Suggestions</h3>
        <p className="text-sm text-gray-600">
          Customer suggestions will appear here when they request changes to their itinerary.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Customer Suggestions</h3>
          <p className="text-sm text-gray-600 mt-1">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} from customers
          </p>
        </div>
        
        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('add')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'add' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Add
          </button>
          <button
            onClick={() => setFilter('modify')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'modify' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Modify
          </button>
          <button
            onClick={() => setFilter('remove')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {filteredSuggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`border-2 rounded-xl p-5 ${getTypeColor(suggestion.type)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-3xl">{getActionIcon(suggestion.action)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-white/70 rounded-lg text-xs font-bold uppercase">
                      {suggestion.type}
                    </span>
                    {suggestion.dayNumber && (
                      <span className="px-3 py-1 bg-white/70 rounded-lg text-xs font-bold">
                        Day {suggestion.dayNumber}
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      {new Date(suggestion.timestamp).toLocaleDateString()} at{' '}
                      {new Date(suggestion.timestamp).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  
                  {suggestion.eventTitle && (
                    <p className="font-bold text-gray-900 mb-2">
                      📍 {suggestion.eventTitle}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-800 mb-3">
                    {suggestion.details}
                  </p>

                  {suggestion.preferences && suggestion.preferences.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {suggestion.preferences.map((pref, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-white/70 rounded-lg text-xs font-medium"
                        >
                          {pref}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Context Info */}
                  {(suggestion.eventTime || suggestion.eventType) && (
                    <div className="text-xs text-gray-600 space-y-1 bg-white/50 p-2 rounded-lg">
                      {suggestion.dayTitle && <p>📅 {suggestion.dayTitle}</p>}
                      {suggestion.eventTime && (
                        <p>
                          🕐 Original Time: {new Date(suggestion.eventTime).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      )}
                      {suggestion.eventType && <p>📍 Type: {suggestion.eventType}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => handleMarkAsImplemented(index)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  ✓ Implemented
                </button>
                <button
                  onClick={() => handleDismiss(index)}
                  className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSuggestions.length === 0 && filter !== 'all' && (
        <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
          <p className="text-gray-600">No {filter} suggestions found.</p>
        </div>
      )}
    </div>
  );
};

export default CustomerSuggestionsPanel;
