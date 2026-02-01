import Icon from '@/components/ui/AppIcon';

interface Constraint {
  type: 'mobility' | 'time' | 'budget' | 'preference';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface ConstraintIndicatorProps {
  constraints: Constraint[];
  compact?: boolean;
}

const ConstraintIndicator = ({ constraints, compact = false }: ConstraintIndicatorProps) => {
  if (constraints.length === 0) {
    return (
      <div className="flex items-center space-x-1.5 text-success">
        <Icon name="CheckCircleIcon" size={16} variant="solid" />
        <span className="text-xs font-medium">No Constraints</span>
      </div>
    );
  }

  const severityConfig = {
    high: {
      icon: 'ExclamationTriangleIcon',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    medium: {
      icon: 'ExclamationCircleIcon',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    low: {
      icon: 'InformationCircleIcon',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  };

  const highestSeverity = constraints.some(c => c.severity === 'high') 
    ? 'high' 
    : constraints.some(c => c.severity === 'medium') 
    ? 'medium' :'low';

  const config = severityConfig[highestSeverity];

  if (compact) {
    return (
      <div className={`flex items-center space-x-1.5 ${config.color}`}>
        <Icon name={config.icon as any} size={16} variant="solid" />
        <span className="text-xs font-medium">{constraints.length} Constraint{constraints.length > 1 ? 's' : ''}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {constraints.map((constraint, index) => {
        const itemConfig = severityConfig[constraint.severity];
        return (
          <div
            key={index}
            className={`flex items-start space-x-2 p-2 rounded-md ${itemConfig.bgColor}`}
          >
            <Icon 
              name={itemConfig.icon as any} 
              size={16} 
              className={`mt-0.5 flex-shrink-0 ${itemConfig.color}`}
              variant="solid"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${itemConfig.color} capitalize`}>
                {constraint.type}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {constraint.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConstraintIndicator;