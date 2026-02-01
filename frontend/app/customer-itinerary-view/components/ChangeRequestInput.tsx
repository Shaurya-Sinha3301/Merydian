'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ChangeRequestInputProps {
  onSubmitChange: (request: string) => void;
  isProcessing: boolean;
}

const ChangeRequestInput = ({ onSubmitChange, isProcessing }: ChangeRequestInputProps) => {
  const [changeRequest, setChangeRequest] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = [
    "Replace the museum visit with a beach activity",
    "Add more time at the national park",
    "Find a cheaper restaurant option for dinner",
    "Swap Day 2 and Day 3 activities",
    "Remove the shopping mall visit",
    "Add a sunset viewing spot on Day 1",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (changeRequest.trim() && !isProcessing) {
      onSubmitChange(changeRequest.trim());
      setChangeRequest('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChangeRequest(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-elevation-2 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Icon name="ChatBubbleLeftRightIcon" size={20} className="text-accent" variant="solid" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Request Changes</h3>
          <p className="text-sm text-muted-foreground">Describe what you'd like to modify in natural language</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={changeRequest}
            onChange={(e) => setChangeRequest(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Example: Replace the museum visit on Day 2 with a beach activity, or add more time at the national park..."
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-smooth"
            rows={4}
            disabled={isProcessing}
          />
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {changeRequest.length}/500
          </div>
        </div>

        {showSuggestions && changeRequest.length === 0 && (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs font-medium text-foreground mb-2">Suggestion Examples:</p>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 bg-background hover:bg-card rounded-md text-sm text-foreground transition-smooth"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="InformationCircleIcon" size={16} />
            <span>Changes will be processed instantly with cost updates</span>
          </div>
          <button
            type="submit"
            disabled={!changeRequest.trim() || isProcessing}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Icon name="PaperAirplaneIcon" size={18} />
                <span>Submit Request</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangeRequestInput;