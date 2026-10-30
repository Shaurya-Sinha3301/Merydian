import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { feedbackService } from '@/services/feedback';
import { useAppStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';

export function FeedbackPanel({ onJobCreated }: { onJobCreated?: (jobId: string) => void }) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { activeTripId } = useAppStore();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeTripId) return;

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Submit feedback to agent/optimizer
      const res = await feedbackService.submitAgentFeedback(message, activeTripId) as {job_id?: string};
      
      setMessage('');
      
      // If the backend creates a job for optimization, we pass it up
      if (res.job_id && onJobCreated) {
        onJobCreated(res.job_id);
      } else {
        // Fallback or optimistic update if no job returned immediately
        queryClient.invalidateQueries({ queryKey: ['timeline', activeTripId] });
      }
      
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-sm mb-4 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Your dedicated travel agent is reviewing this itinerary. You can request changes or provide feedback below.</p>
        </div>
        
        {/* Mock chat history for the demo */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col items-start max-w-[85%] gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Agent</span>
            <div className="bg-gray-100 text-gray-800 text-sm p-3 rounded-2xl rounded-tl-none">
              Hello! I&apos;ve drafted your initial itinerary. Let me know what you think.
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your feedback or requested changes..."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none h-[80px]"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className="absolute bottom-3 right-3 p-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-400 hover:bg-emerald-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
}
