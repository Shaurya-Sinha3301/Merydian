import { TripRequest } from '@/lib/agent-dashboard/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatisticsPanelProps {
  groups: TripRequest[];
}

const StatisticsPanel = ({ groups }: StatisticsPanelProps) => {
  // Calculate statistics
  const totalRevenue = groups.reduce((sum, group) => {
    const bookingTotal = group.bookings?.reduce((bookingSum, booking) => 
      bookingSum + (booking.details.cost || 0), 0) || 0;
    return sum + bookingTotal;
  }, 0);

  const currentMonth = new Date().getMonth();
  const monthlyData = Array(31).fill(0);
  
  // Simulate daily revenue distribution with more realistic variation
  groups.forEach((group, groupIndex) => {
    const revenue = group.bookings?.reduce((sum, b) => sum + (b.details.cost || 0), 0) || 0;
    const dailyRevenue = revenue / 31;
    
    for (let i = 0; i < 31; i++) {
      // Add some variation to make it look more realistic
      const variation = Math.sin(i / 5) * 0.3 + Math.random() * 0.4;
      monthlyData[i] += dailyRevenue * (0.8 + variation);
    }
  });

  const maxRevenue = Math.max(...monthlyData);
  const minRevenue = Math.min(...monthlyData);
  const avgRevenue = monthlyData.reduce((a, b) => a + b, 0) / monthlyData.length;

  // Generate SVG path for line chart
  const generateLinePath = () => {
    const width = 100;
    const height = 100;
    const points = monthlyData.map((value, index) => {
      const x = (index / (monthlyData.length - 1)) * width;
      const y = height - ((value - minRevenue) / (maxRevenue - minRevenue)) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  // Generate area path (for gradient fill)
  const generateAreaPath = () => {
    const width = 100;
    const height = 100;
    const points = monthlyData.map((value, index) => {
      const x = (index / (monthlyData.length - 1)) * width;
      const y = height - ((value - minRevenue) / (maxRevenue - minRevenue)) * height;
      return `${x},${y}`;
    });
    return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Revenue This Month</h3>
          <select className="text-xs bg-transparent border-none text-muted-foreground cursor-pointer focus:outline-none">
            <option>March</option>
            <option>February</option>
            <option>January</option>
          </select>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-foreground">
            ₹{(totalRevenue / 1000).toFixed(0)}K
          </span>
          <span className="text-sm text-emerald-600 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            +12.4%
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          From total ₹{((totalRevenue * 1.4) / 1000).toFixed(0)}K
        </p>
      </div>

      {/* Line Chart */}
      <div className="relative h-32 mb-2">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeWidth="0.2" className="text-muted/30" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.2" className="text-muted/30" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeWidth="0.2" className="text-muted/30" />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={generateAreaPath()}
            fill="url(#lineGradient)"
            className="transition-all duration-500"
          />

          {/* Line */}
          <path
            d={generateLinePath()}
            fill="none"
            stroke="url(#strokeGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />

          {/* Data points */}
          {monthlyData.map((value, index) => {
            const x = (index / (monthlyData.length - 1)) * 100;
            const y = 100 - ((value - minRevenue) / (maxRevenue - minRevenue)) * 100;
            const isHighlight = index === 14; // Current day
            
            if (isHighlight || index % 5 === 0) {
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHighlight ? "2" : "1"}
                    fill={isHighlight ? "#3b82f6" : "#06b6d4"}
                    className="transition-all duration-300"
                  />
                  {isHighlight && (
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      opacity="0.3"
                    />
                  )}
                </g>
              );
            }
            return null;
          })}
        </svg>

        {/* Hover overlay for interactivity */}
        <div className="absolute inset-0 flex">
          {monthlyData.map((value, index) => (
            <div
              key={index}
              className="flex-1 group relative cursor-pointer"
              title={`Day ${index + 1}: ₹${(value / 1000).toFixed(1)}K`}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                Day {index + 1}: ₹{(value / 1000).toFixed(1)}K
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground mb-6">
        {[3, 7, 15, 17, 20, 24, 27, 31].map((day) => (
          <span key={day} className={day === 15 ? 'text-blue-600 font-medium' : ''}>
            {day}
          </span>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Active Groups</p>
          <p className="text-2xl font-semibold text-foreground">{groups.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Avg. Group Size</p>
          <p className="text-2xl font-semibold text-foreground">
            {Math.round(groups.reduce((sum, g) => 
              sum + g.groupSize.adults + g.groupSize.children + g.groupSize.seniors, 0
            ) / groups.length)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;
