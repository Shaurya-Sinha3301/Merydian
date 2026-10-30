import React from 'react';
import { Activity, Clock, Target, CheckCircle2 } from 'lucide-react';

export function LightweightAnalytics() {
  const stats = [
    { label: 'Active Trips', value: '14', icon: <Activity className="w-5 h-5 text-blue-500" /> },
    { label: 'Total Optimizations', value: '82', icon: <Target className="w-5 h-5 text-emerald-500" /> },
    { label: 'Avg. Optimization Time', value: '12.4s', icon: <Clock className="w-5 h-5 text-amber-500" /> },
    { label: 'Approval Rate', value: '94%', icon: <CheckCircle2 className="w-5 h-5 text-purple-500" /> },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Metrics (30 days)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="p-3 bg-white rounded-full shadow-sm">
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm font-medium text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
