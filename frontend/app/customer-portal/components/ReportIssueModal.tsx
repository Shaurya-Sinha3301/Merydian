'use client';

import { useState } from 'react';

interface ReportIssueModalProps {
  onClose: () => void;
  eventTitle: string;
}

const ReportIssueModal = ({ onClose, eventTitle }: ReportIssueModalProps) => {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const issueTypes = [
    { value: 'flight_delayed', label: 'Flight Delayed', icon: '✈️' },
    { value: 'flight_cancelled', label: 'Flight Cancelled', icon: '❌' },
    { value: 'road_closed', label: 'Road Closed', icon: '🚧' },
    { value: 'venue_closed', label: 'Venue Closed', icon: '🔒' },
    { value: 'suggestion', label: 'Suggestion', icon: '💡' },
    { value: 'other', label: 'Other Issue', icon: '📝' }
  ];

  const handleSubmit = () => {
    if (!issueType) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 1000);
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-[#FDFDFF] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#212121] mb-2">Issue Reported</h3>
          <p className="text-sm text-[#212121]/60">Your travel agent will be notified and will contact you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[#FDFDFF] rounded-2xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#212121]">Report Issue</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EDEDED] hover:bg-[#E0E0E0] transition-all flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Event Info */}
        <div className="mb-4 p-3 bg-[#EDEDED] rounded-lg">
          <p className="text-sm font-medium text-[#212121]">{eventTitle}</p>
        </div>

        {/* Issue Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#212121] mb-2">Issue Type</label>
          <div className="grid grid-cols-2 gap-2">
            {issueTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setIssueType(type.value)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  issueType === type.value
                    ? 'border-[#212121] bg-[#212121] text-[#FDFDFF]'
                    : 'border-[#EDEDED] bg-[#FDFDFF] text-[#212121] hover:border-[#212121]/30'
                }`}
              >
                <div className="text-lg mb-1">{type.icon}</div>
                <div className="text-xs font-medium">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#212121] mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide additional details..."
            rows={3}
            className="w-full px-3 py-2 bg-[#EDEDED] text-[#212121] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#212121] placeholder:text-[#212121]/40 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#EDEDED] text-[#212121] rounded-lg font-medium hover:bg-[#E0E0E0] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!issueType || isSubmitting}
            className="flex-1 py-2.5 bg-[#212121] text-[#FDFDFF] rounded-lg font-medium hover:bg-[#212121]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportIssueModal;
