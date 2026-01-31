'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

type TripStatus = 'draft' | 'submitted' | 'in-review' | 'approved';

interface ProgressStep {
  label: string;
  path: string;
  status: TripStatus;
  icon: string;
}

interface CustomerProgressIndicatorProps {
  currentStatus?: TripStatus;
  className?: string;
}

const CustomerProgressIndicator = ({
  currentStatus = 'draft',
  className = ''
}: CustomerProgressIndicatorProps) => {
  const pathname = usePathname();

  const steps: ProgressStep[] = [
    {
      label: 'Create Request',
      path: '/customer-trip-request',
      status: 'draft',
      icon: 'DocumentTextIcon',
    },
    {
      label: 'Review Itinerary',
      path: '/customer-itinerary-view',
      status: 'approved',
      icon: 'MapIcon',
    },
  ];

  const statusOrder: TripStatus[] = ['draft', 'submitted', 'in-review', 'approved'];
  const currentStatusIndex = statusOrder.indexOf(currentStatus);

  const getStepStatus = (step: ProgressStep, index: number): 'completed' | 'current' | 'upcoming' => {
    const stepStatusIndex = statusOrder.indexOf(step.status);

    if (stepStatusIndex < currentStatusIndex) return 'completed';
    if (pathname === step.path) return 'current';
    if (stepStatusIndex <= currentStatusIndex) return 'current';
    return 'upcoming';
  };

  const isStepAccessible = (step: ProgressStep): boolean => {
    const stepStatusIndex = statusOrder.indexOf(step.status);
    return stepStatusIndex <= currentStatusIndex;
  };

  const getStatusLabel = (status: TripStatus): string => {
    const labels: Record<TripStatus, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      'in-review': 'In Review',
      approved: 'Approved',
    };
    return labels[status];
  };

  return (
    <div className={`bg-white/80 backdrop-blur-md border-b border-neutral-200 z-40 ${className}`}>
      {/* Desktop Progress Indicator */}
      <div className="hidden md:block mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(step, index);
            const isAccessible = isStepAccessible(step);
            const isLast = index === steps.length - 1;

            return (
              <div key={step.path} className="flex items-center flex-1">
                <div className="flex items-center">
                  {isAccessible ? (
                    <Link
                      href={step.path}
                      className={`flex items-center space-x-3 rounded-2xl px-4 py-2 transition-all duration-300 ${stepStatus === 'current' ? 'bg-primary text-primary-foreground shadow-md shadow-neutral-300 ring-2 ring-primary/10'
                          : stepStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-muted-foreground hover:bg-neutral-50'
                        }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stepStatus === 'current' ? 'bg-white/20' :
                          stepStatus === 'completed' ? 'bg-emerald-200/50' : 'bg-white border border-neutral-200 shadow-sm'
                        }`}>
                        <Icon
                          name={stepStatus === 'completed' ? 'CheckIcon' : (step.icon as any)}
                          size={20}
                          variant={stepStatus === 'current' ? 'solid' : 'outline'}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{step.label}</span>
                        <span className="caption text-xs opacity-75">
                          {stepStatus === 'completed' ? 'Completed' : getStatusLabel(currentStatus)}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center space-x-3 rounded-2xl px-4 py-2 opacity-50 cursor-not-allowed">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-100">
                        <Icon name={step.icon as any} size={20} variant="outline" className="text-neutral-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground">{step.label}</span>
                        <span className="caption text-xs text-muted-foreground opacity-75">Not available</span>
                      </div>
                    </div>
                  )}
                </div>

                {!isLast && (
                  <div className="flex-1 mx-4">
                    <div className="h-1 neu-pressed rounded-full relative overflow-hidden">
                      <div
                        className={`h-full transition-smooth ${stepStatus === 'completed' ? 'bg-success' : 'bg-transparent'
                          }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Progress Indicator */}
      <div className="md:hidden px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-neu-sm ${currentStatus === 'approved' ? 'bg-success' : 'bg-primary'
              }`}>
              <Icon
                name={currentStatus === 'approved' ? 'CheckIcon' : 'ClockIcon'}
                size={20}
                className="text-white"
                variant="solid"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">Trip Status</span>
              <span className="caption text-xs text-muted-foreground">{getStatusLabel(currentStatus)}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            {steps.map((step) => {
              const isAccessible = isStepAccessible(step);
              const stepStatus = getStepStatus(step, 0);

              return isAccessible ? (
                <Link
                  key={step.path}
                  href={step.path}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-smooth ${pathname === step.path
                      ? 'bg-primary text-primary-foreground shadow-neu-sm'
                      : 'neu-button text-muted-foreground'
                    }`}
                >
                  <Icon name={step.icon as any} size={20} variant={pathname === step.path ? 'solid' : 'outline'} />
                </Link>
              ) : (
                <div
                  key={step.path}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl neu-pressed text-muted-foreground cursor-not-allowed opacity-50"
                >
                  <Icon name={step.icon as any} size={20} variant="outline" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProgressIndicator;