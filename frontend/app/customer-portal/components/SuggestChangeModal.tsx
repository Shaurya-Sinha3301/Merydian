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
    { id: 'add-place', label: 'Add a Place', icon: '➕', type: 'add' as const },
    { id: 'more-adventure', label: 'More Adventurous', icon: '🏔️', type: 'modify' as const },
    { id: 'more-relaxing', label: 'More Relaxing', icon: '🧘', type: 'modify' as const },
    { id: 'change-timing', label: 'Change Timing', icon: '⏰', type: 'modify' as const },
    { id: 'replace-activity', label: 'Replace Activity', icon: '🔄', type: 'replace' as const },
    { id: 'add-meal', label: 'Add Meal Stop', icon: '🍽️', type: 'add' as const },
    { id: 'more-cultural', label: 'More Cultural', icon: '🏛️', type: 'modify' as const },
    { id: 'kid-friendly', label: 'More Kid-Friendly', icon: '👶', type: 'modify' as const },
    { id: 'other', label: 'Other Suggestion', icon: '💡', type: 'general' as const }
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
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{action.icon}</span>
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
