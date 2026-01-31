'use client';

import Icon from '@/components/ui/AppIcon';

interface ActionButtonsProps {
  hasChanges: boolean;
  onAcceptChanges: () => void;
  onRequestDifferent: () => void;
  onApproveFinal: () => void;
  isProcessing: boolean;
}

const ActionButtons = ({
  hasChanges,
  onAcceptChanges,
  onRequestDifferent,
  onApproveFinal,
  isProcessing,
}: ActionButtonsProps) => {
  return (
    <div className="bg-card rounded-3xl shadow-sm border border-neutral-100 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Icon name="CheckBadgeIcon" size={20} className="text-primary" variant="solid" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Review & Approve</h3>
          <p className="text-sm text-muted-foreground">
            {hasChanges ? 'Review the proposed changes before proceeding' : 'Ready to finalize your itinerary?'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {hasChanges && (
          <>
            <button
              onClick={onAcceptChanges}
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-success text-success-foreground rounded-2xl font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              <Icon name="CheckIcon" size={20} variant="solid" />
              <span>Accept Changes</span>
            </button>

            <button
              onClick={onRequestDifferent}
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-warning text-warning-foreground rounded-2xl font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              <Icon name="ArrowPathIcon" size={20} />
              <span>Request Different Option</span>
            </button>
          </>
        )}

        <button
          onClick={onApproveFinal}
          disabled={isProcessing || hasChanges}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
        >
          <Icon name="CheckBadgeIcon" size={20} variant="solid" />
          <span>Approve Final Itinerary</span>
        </button>
      </div>

      {hasChanges && (
        <div className="mt-4 p-3 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-start space-x-2">
          <Icon name="InformationCircleIcon" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Accepting changes will update your itinerary. You can continue making modifications after acceptance.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;