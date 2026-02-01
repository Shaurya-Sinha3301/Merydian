"use client";

import React, { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const WEEKLY_DATA = [
    { name: 'Mon', revenue: 4500 }, { name: 'Tue', revenue: 5200 }, { name: 'Wed', revenue: 3800 },
    { name: 'Thu', revenue: 6100 }, { name: 'Fri', revenue: 7500 }, { name: 'Sat', revenue: 8900 },
    { name: 'Sun', revenue: 7800 },
];

const MONTHLY_DATA = [
    { name: 'Week 1', revenue: 24500 }, { name: 'Week 2', revenue: 28200 },
    { name: 'Week 3', revenue: 26800 }, { name: 'Week 4', revenue: 31100 },
];

const Analytics: React.FC = () => {
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
    const [selectedMonth, setSelectedMonth] = useState('2024-05');

    const data = period === 'week' ? WEEKLY_DATA : MONTHLY_DATA;

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1400px] mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Revenue & Operations</h2>
                    <p className="text-xs text-slate-500 font-medium">Tracking Delhi Hub Performance</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {['week', 'month', 'year'].map((p: any) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-md transition-all ${period === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-slate-800">Revenue Breakdown</h3>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900">${period === 'week' ? '43,800' : '110,600'}</p>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">+12.5% vs Prev Period</p>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Top Tour Revenue</h4>
                        <div className="space-y-4">
                            {[
                                { name: 'Historic Delhi', val: '$22.5k', perc: 45 },
                                { name: 'Delhi Food Walk', val: '$12.8k', perc: 25 },
                                { name: 'Temple Trail', val: '$8.2k', perc: 15 },
                            ].map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                                        <span>{item.name}</span>
                                        <span>{item.val}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${item.perc}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <h4 className="text-[10px] font-bold text-indigo-600 uppercase mb-2">Historical Lookup</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">View detailed tax and service reports for <strong>{new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>.</p>
                        <button className="mt-4 w-full py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700">Export Detailed PDF</button>
                    </div>
                </div>
            </section>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Family-wise Revenue Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Family</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Tour</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Total Revenue</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Sat. Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {[
                                { fam: 'Sharma Family', tour: 'DL-001', rev: '$2,450', sat: '4.8' },
                                { fam: 'Gupta Group', tour: 'DL-001', rev: '$3,820', sat: '4.5' },
                                { fam: 'Patel Family', tour: 'DL-001', rev: '$1,980', sat: '4.2' },
                            ].map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-900">{row.fam}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{row.tour}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-900">{row.rev}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded">{row.sat} / 5</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
