import Icon from '@/components/ui/AppIcon';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color: 'primary' | 'success' | 'warning' | 'accent';
}

const MetricCard = ({ title, value, subtitle, icon, trend, color }: MetricCardProps) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
  };

  return (
    <div className="neu-flat rounded-3xl p-6 transition-smooth hover:shadow-neu-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="caption text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-semibold text-foreground mb-1">{value}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          {trend && (
            <div className={`flex items-center space-x-1 mt-2 ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
              <Icon 
                name={trend.isPositive ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'} 
                size={16} 
                variant="solid"
              />
              <span className="text-xs font-medium">{trend.value}</span>
            </div>
          )}
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl neu-convex ${colorClasses[color]}`}>
          <Icon name={icon as any} size={24} variant="solid" />
        </div>
      </div>
    </div>
  );
};

interface DashboardMetricsProps {
  metrics: {
    pendingRequests: number;
    inReview: number;
    completionRate: number;
    revenueProjection: string;
    marginAverage: string;
  };
}

const DashboardMetrics = ({ metrics }: DashboardMetricsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Pending Requests"
        value={metrics.pendingRequests}
        subtitle="Awaiting review"
        icon="ClipboardDocumentListIcon"
        color="warning"
        trend={{ value: '+3 today', isPositive: true }}
      />
      <MetricCard
        title="In Review"
        value={metrics.inReview}
        subtitle="Currently processing"
        icon="ClockIcon"
        color="primary"
      />
      <MetricCard
        title="Completion Rate"
        value={`${metrics.completionRate}%`}
        subtitle="This month"
        icon="CheckCircleIcon"
        color="success"
        trend={{ value: '+5.2%', isPositive: true }}
      />
      <MetricCard
        title="Revenue Projection"
        value={metrics.revenueProjection}
        subtitle={`Avg margin: ${metrics.marginAverage}`}
        icon="CurrencyDollarIcon"
        color="accent"
        trend={{ value: '+12.4%', isPositive: true }}
      />
    </div>
  );
};

export default DashboardMetrics;