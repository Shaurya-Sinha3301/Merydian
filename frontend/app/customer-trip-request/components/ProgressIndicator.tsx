import Icon from '@/components/ui/AppIcon';

interface ProgressStep {
  id: number;
  label: string;
  description: string;
  icon: string;
}

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator = ({ currentStep, totalSteps }: ProgressIndicatorProps) => {
  const steps: ProgressStep[] = [
    {
      id: 1,
      label: 'Basic Details',
      description: 'Destination & dates',
      icon: 'MapPinIcon',
    },
    {
      id: 2,
      label: 'Budget & Group',
      description: 'Budget range & travelers',
      icon: 'UsersIcon',
    },
    {
      id: 3,
      label: 'Preferences',
      description: 'Individual preferences',
      icon: 'HeartIcon',
    },
    {
      id: 4,
      label: 'Places',
      description: 'Must-visit & avoid',
      icon: 'MapIcon',
    },
  ];

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="neu-flat border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Desktop Progress */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-smooth ${
                        isCompleted
                          ? 'bg-success text-success-foreground shadow-neu-sm'
                          : isCurrent
                          ? 'bg-primary text-primary-foreground shadow-neu-md'
                          : 'neu-flat text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <Icon name="CheckIcon" size={24} variant="solid" />
                      ) : (
                        <Icon name={step.icon as any} size={24} variant={isCurrent ? 'solid' : 'outline'} />
                      )}
                    </div>
                    <div className="ml-3">
                      <div
                        className={`text-sm font-medium ${
                          isCurrent ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="caption text-xs text-muted-foreground">{step.description}</div>
                    </div>
                  </div>
                  {!isLast && (
                    <div className="flex-1 mx-4">
                      <div className="h-1 neu-pressed rounded-full relative overflow-hidden">
                        <div
                          className={`h-full transition-smooth ${
                            isCompleted ? 'bg-success' : 'bg-transparent'
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

        {/* Mobile Progress */}
        <div className="md:hidden space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-neu-sm">
                <Icon name={steps[currentStep - 1].icon as any} size={20} variant="solid" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{steps[currentStep - 1].label}</div>
                <div className="caption text-xs text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </div>
              </div>
            </div>
            <div className="caption text-xs text-muted-foreground">{Math.round(progress)}%</div>
          </div>
          <div className="h-3 neu-pressed rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-smooth"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;