'use client';

import { useState } from 'react';

interface SuggestChangeModalProps {
  eventTitle?: string;
  eventId?: string;
  dayNumber?: number;
  dayTitle?: string;
  eventTime?: string;
  eventType?: string;
  preselectedAction?: string;
  onClose: () => void;
  onSubmit?: (suggestion: ItinerarySuggestion) => void;
}

export interface ItinerarySuggestion {
  type: 'add' | 'remove' | 'modify' | 'replace' | 'general';
  action: string;
  eventId?: string;
  eventTitle?: string;
  dayNumber?: number;
  dayTitle?: string;
  eventTime?: string;
  eventType?: string;
  details: string;
  preferences?: string[];
  timestamp: string;
}

const SuggestChangeModal = ({
  eventTitle,
  eventId,
  dayNumber,
  dayTitle,
  eventTime,
  eventType,
  preselectedAction,
  onClose,
  onSubmit
}: SuggestChangeModalProps) => {
  const [selectedAction, setSelectedAction] = useState(preselectedAction || '');
  const [details, setDetails] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const actionOptions = [
    { 
      id: 'add-place', 
      label: 'Add a Place', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
        </svg>
      ), 
      type: 'add' as const 
    },
    { 
      id: 'more-adventure', 
      label: 'More Adventurous', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415zM10 9a1 1 0 011 1v.01a1 1 0 11-2 0V10a1 1 0 011-1z" clipRule="evenodd"/>
        </svg>
      ), 
      type: 'modify' as const 
    },
    { 
      id: 'more-relaxing', 
      label: 'More Relaxing', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
        </svg>
      ), 
      type: 'modify' as const 
    },
    { 
      id: 'change-timing', 
      label: 'Change Timing', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
        </svg>
      ), 
      type: 'modify' as const 
    },
    { 
      id: 'replace-activity', 
      label: 'Replace Activity', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
        </svg>
      ), 
      type: 'replace' as const 
    },
    { 
      id: 'add-meal', 
      label: 'Add Meal Stop', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
        </svg>
      ), 
      type: 'add' as const 
    },
    { 
      id: 'more-cultural', 
      label: 'More Cultural', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
        </svg>
      ), 
      type: 'modify' as const 
    },
    { 
      id: 'kid-friendly', 
      label: 'More Kid-Friendly', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
        </svg>
      ), 
      type: 'modify' as const 
    },
    { 
      id: 'other', 
      label: 'Other Suggestion', 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
        </svg>
      ), 
      type: 'general' as const 
    }
  ];

  const preferenceChips = [
    'Budget-friendly',
    'Luxury',
    'Family-friendly',
    'Adventure',
    'Cultural',
    'Nature',
    'Food & Dining',
    'Shopping',
    'Photography',
    'Nightlife'
  ];

  const togglePreference = (pref: string) => {
    setSelectedPreferences(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const handleSubmit = () => {
    if (!selectedAction || !details.trim()) return;

    setIsSubmitting(true);

    const suggestion: ItinerarySuggestion = {
      type: actionOptions.find(a => a.id === selectedAction)?.type || 'general',
      action: selectedAction,
      eventId,
      eventTitle,
      dayNumber,
      dayTitle,
      eventTime,
      eventType,
      details: details.trim(),
      preferences: selectedPreferences,
      timestamp: new Date().toISOString()
    };

    // Store in localStorage for travel agent
    const existingSuggestions = JSON.parse(localStorage.getItem('itinerarySuggestions') || '[]');
    existingSuggestions.push(suggestion);
    localStorage.setItem('itinerarySuggestions', JSON.stringify(existingSuggestions));

    // Call parent callback if provided
    if (onSubmit) {
      onSubmit(suggestion);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 800);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#FDFDFF] rounded-2xl p-8 max-w-md text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#212121] mb-2">Suggestion Sent!</h3>
          <p className="text-sm text-[#212121]/60">
            Your travel agent will review your suggestion and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#FDFDFF] rounded-2xl max-w-2xl w-full my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#212121]/10">
          <div>
            <h2 className="text-2xl font-bold text-[#212121]">Suggest a Change</h2>
            {eventTitle && (
              <p className="text-sm text-[#212121]/60 mt-1">
                {dayNumber && `Day ${dayNumber} • `}{eventTitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#EDEDED] hover:bg-[#E0E0E0] transition-all flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-[#212121]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Context Info */}
          {(dayNumber || eventTime) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Suggestion Context</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    {dayNumber && dayTitle && <p>📅 Day {dayNumber}: {dayTitle}</p>}
                    {eventTime && <p>🕐 {new Date(eventTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>}
                    {eventType && <p>📍 Type: {eventType}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Selection */}
          <div>
            <label className="block text-sm font-semibold text-[#212121] mb-3">
              What would you like to change?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {actionOptions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => setSelectedAction(action.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedAction === action.id
                      ? 'border-[#212121] bg-[#212121] text-[#FDFDFF]'
                      : 'border-[#E0E0E0] bg-[#FDFDFF] text-[#212121] hover:border-[#212121]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={selectedAction === action.id ? 'text-[#FDFDFF]' : 'text-[#212121]'}>
                      {action.icon}
                    </div>
                    <span className="text-sm font-semibold">{action.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-semibold text-[#212121] mb-2">
              Tell us more about your suggestion
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="E.g., 'Add a visit to the local spice market in the morning' or 'Replace this with a more adventurous activity like parasailing'"
              className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:border-[#212121] focus:outline-none resize-none text-[#212121] placeholder:text-[#212121]/40"
              rows={4}
            />
            <p className="text-xs text-[#212121]/50 mt-2">
              💡 Be specific! This helps your travel agent make the perfect changes.
            </p>
          </div>

          {/* Preference Tags */}
          <div>
            <label className="block text-sm font-semibold text-[#212121] mb-3">
              Preferences (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {preferenceChips.map((pref) => (
                <button
                  key={pref}
                  onClick={() => togglePreference(pref)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedPreferences.includes(pref)
                      ? 'bg-[#212121] text-[#FDFDFF]'
                      : 'bg-[#EDEDED] text-[#212121] hover:bg-[#E0E0E0]'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#212121]/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[#EDEDED] text-[#212121] rounded-xl font-semibold hover:bg-[#E0E0E0] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedAction || !details.trim() || isSubmitting}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
              !selectedAction || !details.trim()
                ? 'bg-[#E0E0E0] text-[#212121]/40 cursor-not-allowed'
                : 'bg-[#212121] text-[#FDFDFF] hover:bg-[#212121]/90'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Sending...
              </span>
            ) : (
              'Send Suggestion'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestChangeModal;
