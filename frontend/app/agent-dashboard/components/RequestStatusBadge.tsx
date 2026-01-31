import Icon from '@/components/ui/AppIcon';

interface RequestStatusBadgeProps {
  status: 'new' | 'in-review' | 'approved' | 'booked';
  size?: 'sm' | 'md';
}

const RequestStatusBadge = ({ status, size = 'md' }: RequestStatusBadgeProps) => {
  const statusConfig = {
    new: {
      label: 'New',
      icon: 'SparklesIcon',
      bgColor: 'bg-warning/10',
      textColor: 'text-warning',
      borderColor: 'border-warning/20',
    },
    'in-review': {
      label: 'In Review',
      icon: 'ClockIcon',
      bgColor: 'bg-primary/10',
      textColor: 'text-primary',
      borderColor: 'border-primary/20',
    },
    approved: {
      label: 'Approved',
      icon: 'CheckCircleIcon',
      bgColor: 'bg-success/10',
      textColor: 'text-success',
      borderColor: 'border-success/20',
    },
    booked: {
      label: 'Booked',
      icon: 'CheckBadgeIcon',
      bgColor: 'bg-accent/10',
      textColor: 'text-accent',
      borderColor: 'border-accent/20',
    },
  };

  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 rounded-2xl ${config.bgColor} ${config.textColor} ${sizeClasses} font-medium shadow-neu-sm`}
    >
      <Icon name={config.icon as any} size={iconSize} variant="solid" />
      <span>{config.label}</span>
    </span>
  );
};

export default RequestStatusBadge;