'use client';

import Link from 'next/link';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

const REVENUE_DATA = [
  { name: 'Mon', revenue: 4500, bookings: 12 },
  { name: 'Tue', revenue: 5200, bookings: 15 },
  { name: 'Wed', revenue: 3800, bookings: 10 },
  { name: 'Thu', revenue: 6100, bookings: 18 },
  { name: 'Fri', revenue: 7500, bookings: 22 },
  { name: 'Sat', revenue: 8900, bookings: 28 },
  { name: 'Sun', revenue: 7800, bookings: 24 },
];

const SATISFACTION_DIST = [
  { name: '5 Stars', value: 65, color: '#4f46e5' },
  { name: '4 Stars', value: 20, color: '#818cf8' },
  { name: '3 Stars', value: 10, color: '#c7d2fe' },
  { name: '2 Stars', value: 3, color: '#e0e7ff' },
  { name: '1 Star', value: 2, color: '#f1f5f9' },
];

const AGENT_PERFORMANCE = [
  { name: 'Decision', tasks: 142, efficiency: 95 },
  { name: 'Booking', tasks: 89, efficiency: 92 },
  { name: 'Communication', tasks: 256, efficiency: 98 },
  { name: 'Monitoring', tasks: 1024, efficiency: 97 },
];

export default function AnalyticsDashboard() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none shadow-sm hover:bg-slate-50 transition-colors">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <i className="fas fa-download mr-2"></i>
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Total Revenue</span>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-dollar-sign text-green-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">$43.8K</h3>
          <p className="text-xs text-green-600 font-medium mt-1">
            <i className="fas fa-arrow-up mr-1"></i>
            +12.5% vs last week
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Active Trips</span>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-route text-blue-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">14</h3>
          <p className="text-xs text-blue-600 font-medium mt-1">
            <i className="fas fa-arrow-up mr-1"></i>
            +2 from yesterday
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Avg Satisfaction</span>
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-star text-amber-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">4.8/5</h3>
          <p className="text-xs text-amber-600 font-medium mt-1">
            <i className="fas fa-arrow-up mr-1"></i>
            +0.2 this week
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">AI Tasks</span>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-robot text-purple-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">1,578</h3>
          <p className="text-xs text-purple-600 font-medium mt-1">
            <i className="fas fa-arrow-up mr-1"></i>
            +18% efficiency
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Revenue & Bookings</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded"></div>
                <span className="text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-violet-400 rounded"></div>
                <span className="text-slate-600">Bookings</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Satisfaction Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6">Satisfaction Distribution</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SATISFACTION_DIST}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {SATISFACTION_DIST.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {SATISFACTION_DIST.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                  <span className="text-slate-500 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800">AI Agent Performance</h3>
          <Link 
            href="/operations/agents"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View All Agents <i className="fas fa-arrow-right ml-1"></i>
          </Link>
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={AGENT_PERFORMANCE}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
              />
              <Bar dataKey="tasks" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/operations/customers"
          className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200 hover:shadow-xl transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-lg mb-1">View All Customers</h4>
              <p className="text-sm text-indigo-100">Manage active trips and families</p>
            </div>
            <i className="fas fa-arrow-right text-2xl group-hover:translate-x-1 transition-transform"></i>
          </div>
        </Link>

        <Link 
          href="/operations/agents"
          className="bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-2xl text-white shadow-lg shadow-purple-200 hover:shadow-xl transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-lg mb-1">Manage AI Agents</h4>
              <p className="text-sm text-purple-100">Monitor and configure agents</p>
            </div>
            <i className="fas fa-arrow-right text-2xl group-hover:translate-x-1 transition-transform"></i>
          </div>
        </Link>
      </div>
    </div>
  );
}
