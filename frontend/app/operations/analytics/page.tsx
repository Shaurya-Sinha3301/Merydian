'use client';

import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

const REVENUE_DATA = [
  { name: 'Mon', revenue: 4500, satisfaction: 4.2 },
  { name: 'Tue', revenue: 5200, satisfaction: 4.5 },
  { name: 'Wed', revenue: 3800, satisfaction: 4.8 },
  { name: 'Thu', revenue: 6100, satisfaction: 4.6 },
  { name: 'Fri', revenue: 7500, satisfaction: 4.9 },
  { name: 'Sat', revenue: 8900, satisfaction: 4.7 },
  { name: 'Sun', revenue: 7800, satisfaction: 4.5 },
];

const SATISFACTION_DIST = [
  { name: '5 Stars', value: 65, color: '#4f46e5' },
  { name: '4 Stars', value: 20, color: '#818cf8' },
  { name: '3 Stars', value: 10, color: '#c7d2fe' },
  { name: '2 Stars', value: 3, color: '#e0e7ff' },
  { name: '1 Star', value: 2, color: '#f1f5f9' },
];

export default function Analytics() {
  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Operational Analytics</h2>
        <div className="flex gap-2">
           <select className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium outline-none shadow-sm">
             <option>Last 30 Days</option>
             <option>This Quarter</option>
             <option>This Year</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="font-bold text-slate-800 mb-6">Revenue Performance ($)</h3>
           <div className="h-[350px]">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
           <h3 className="font-bold text-slate-800 mb-6">Satisfaction Distribution</h3>
           <div className="h-[250px] flex-1">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
             <h4 className="text-slate-500 text-xs font-bold uppercase mb-4">Total Revenue (MTD)</h4>
             <p className="text-3xl font-bold text-slate-900">$142,500</p>
             <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold">
                <i className="fas fa-arrow-up"></i> 12.5% <span className="text-slate-400 font-normal">vs last month</span>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
             <h4 className="text-slate-500 text-xs font-bold uppercase mb-4">New Bookings</h4>
             <p className="text-3xl font-bold text-slate-900">42</p>
             <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold">
                <i className="fas fa-arrow-up"></i> 4 <span className="text-slate-400 font-normal">vs last month</span>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
             <h4 className="text-slate-500 text-xs font-bold uppercase mb-4">Incident Rate</h4>
             <p className="text-3xl font-bold text-slate-900">1.2%</p>
             <div className="flex items-center gap-1 mt-2 text-red-600 text-xs font-bold">
                <i className="fas fa-arrow-up"></i> 0.3% <span className="text-slate-400 font-normal">increase in delays</span>
             </div>
          </div>
      </div>
    </div>
  );
}
