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
  valueClassName?: string; // New prop for custom value color
}

const MetricCard = ({ title, value, subtitle, icon, trend, color, valueClassName }: MetricCardProps) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
  };

  return (
    <div className="bg-card shadow-sm border border-neutral-100 rounded-3xl p-6 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="caption text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className={cn("text-3xl font-semibold mb-1", valueClassName || "text-foreground")}>{value}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          {trend && (
            <div className={`flex items-center space-x-1 mt-2 ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
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

import { cn } from '@/lib/utils';

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
        valueClassName="text-blue-600" // Subtle Blue
      />
      <MetricCard
        title="In Review"
        value={metrics.inReview}
        subtitle="Currently processing"
        icon="ClockIcon"
        color="primary"
        valueClassName="text-foreground"
      />
      <MetricCard
        title="Completion Rate"
        value={`${metrics.completionRate}%`}
        subtitle="This month"
        icon="CheckCircleIcon"
        color="success"
        trend={{ value: '+5.2%', isPositive: true }}
        valueClassName="text-emerald-600" // Subtle Green
      />
      <MetricCard
        title="Revenue Projection"
        value={metrics.revenueProjection}
        subtitle={`Avg margin: ${metrics.marginAverage}`}
        icon="CurrencyDollarIcon"
        color="accent"
        trend={{ value: '+12.4%', isPositive: true }}
        valueClassName="text-blue-600" // Subtle Blue
      />
    </div>
  );
};

export default DashboardMetrics;