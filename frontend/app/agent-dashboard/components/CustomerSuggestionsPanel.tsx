'use client';

import { useState, useEffect, useCallback } from 'react';

interface BackendEvent {
  event_id: string;
  event_type: string;
  status: string;
  payload: Record<string, any>;
  created_at: string;
  family_id?: string;
}

interface CustomerSuggestionsPanelProps {
  /** Family UUID — passed to GET /events/?family_id=... */
  groupId?: string;
}

const ACTION_ICONS: Record<string, string> = {
  'add-place': '➕',
  'remove-event': '➖',
  'more-adventure': '🏔️',
  'more-relaxing': '🧘',
  'change-timing': '⏰',
  'replace-activity': '🔄',
  'add-meal': '🍽️',
  'more-cultural': '🏛️',
  'kid-friendly': '👶',
  other: '💡',
};

function deriveType(payload: Record<string, any>): string {
  const msg: string = payload?.message ?? '';
  if (msg.includes('Add a Place') || msg.includes('Add Meal')) return 'add';
  if (msg.includes('Replace')) return 'replace';
  if (msg.includes('More Relaxing') || msg.includes('Change Timing')) return 'modify';
  return 'general';
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    add: 'bg-green-50 border-green-200 text-green-800',
    remove: 'bg-red-50 border-red-200 text-red-800',
    modify: 'bg-blue-50 border-blue-200 text-blue-800',
    replace: 'bg-purple-50 border-purple-200 text-purple-800',
    general: 'bg-gray-50 border-gray-200 text-gray-800',
  };
  return map[type] ?? map.general;
}

const CustomerSuggestionsPanel = ({ groupId }: CustomerSuggestionsPanelProps) => {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'add' | 'remove' | 'modify' | 'replace' | 'general'>('all');

  const loadEvents = useCallback(async () => {
    if (!groupId) {
      setIsLoading(false);
      return;
    }
    try {
      const { apiClient } = await import('@/services/api');
      const data = await apiClient.getFamilyEvents(groupId, 50);
      // Only show feedback-type events
      const feedback = data.filter(
        (e: BackendEvent) =>
          e.event_type === 'feedback_received' ||
          e.event_type === 'preference_update' ||
          e.event_type === 'customer_feedback',
      );
      setEvents(feedback);
      setError(null);
    } catch (err: any) {
      console.error('[CustomerSuggestionsPanel] Failed to fetch events:', err);
      setError('Could not load suggestions from server.');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadEvents();
    // Poll every 30 seconds for new feedback
    const interval = setInterval(loadEvents, 30_000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const handleDismiss = (eventId: string) => {
    // Optimistic removal; the backend event persists but is removed from view
    setEvents(prev => prev.filter(e => e.event_id !== eventId));
  };

  const filtered =
    filter === 'all' ? events : events.filter(e => deriveType(e.payload) === filter);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
        <p className="text-sm text-gray-500 animate-pulse">Loading customer suggestions…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-red-200">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={loadEvents}
          className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Customer Suggestions</h3>
        <p className="text-sm text-gray-600">
          Customer suggestions will appear here when they request changes to their itinerary.
        </p>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Customer Suggestions</h3>
          <p className="text-sm text-gray-600 mt-1">
            {events.length} suggestion{events.length !== 1 ? 's' : ''} from customers
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'add', 'modify', 'remove'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === f
                ? f === 'all' ? 'bg-black text-white'
                  : f === 'add' ? 'bg-green-600 text-white'
                    : f === 'modify' ? 'bg-blue-600 text-white'
                      : 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(event => {
          const type = deriveType(event.payload);
          const msg: string = event.payload?.message ?? '(no message)';
          return (
            <div key={event.event_id} className={`border-2 rounded-xl p-5 ${typeColor(type)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-3xl">{ACTION_ICONS[type] ?? '💡'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-white/70 rounded-lg text-xs font-bold uppercase">{type}</span>
                      <span className="text-xs text-gray-600">
                        {new Date(event.created_at).toLocaleDateString()} at{' '}
                        {new Date(event.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{msg}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleDismiss(event.event_id)}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    ✓ Noted
                  </button>
                  <button
                    onClick={() => handleDismiss(event.event_id)}
                    className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && filter !== 'all' && (
        <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
          <p className="text-gray-600">No {filter} suggestions found.</p>
        </div>
      )}
    </div>
  );
};

export default CustomerSuggestionsPanel;

