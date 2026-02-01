'use client';

import { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  type: 'Decision' | 'Booking' | 'Communication' | 'Monitoring';
  status: 'Active' | 'Idle' | 'Error';
  tasksCompleted: number;
  currentTask?: string;
  uptime: string;
  performance: number;
}

const AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'Decision Agent Alpha',
    type: 'Decision',
    status: 'Active',
    tasksCompleted: 142,
    currentTask: 'Optimizing itinerary for Robinson Family',
    uptime: '99.8%',
    performance: 95
  },
  {
    id: 'agent-2',
    name: 'Booking Agent Beta',
    type: 'Booking',
    status: 'Active',
    tasksCompleted: 89,
    currentTask: 'Processing hotel reservation for Chen Family',
    uptime: '99.5%',
    performance: 92
  },
  {
    id: 'agent-3',
    name: 'Communication Agent Gamma',
    type: 'Communication',
    status: 'Idle',
    tasksCompleted: 256,
    uptime: '99.9%',
    performance: 98
  },
  {
    id: 'agent-4',
    name: 'Monitoring Agent Delta',
    type: 'Monitoring',
    status: 'Active',
    tasksCompleted: 1024,
    currentTask: 'Tracking 14 active trips',
    uptime: '100%',
    performance: 97
  },
  {
    id: 'agent-5',
    name: 'Decision Agent Epsilon',
    type: 'Decision',
    status: 'Error',
    tasksCompleted: 67,
    currentTask: 'Connection timeout',
    uptime: '87.2%',
    performance: 45
  }
];

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-700 border-green-200';
      case 'Idle': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Error': return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getTypeIcon = (type: Agent['type']) => {
    switch (type) {
      case 'Decision': return 'fa-brain';
      case 'Booking': return 'fa-calendar-check';
      case 'Communication': return 'fa-comments';
      case 'Monitoring': return 'fa-radar';
    }
  };

  const getTypeColor = (type: Agent['type']) => {
    switch (type) {
      case 'Decision': return 'from-purple-500 to-pink-500';
      case 'Booking': return 'from-blue-500 to-cyan-500';
      case 'Communication': return 'from-green-500 to-emerald-500';
      case 'Monitoring': return 'from-orange-500 to-amber-500';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Agents Dashboard</h1>
          <p className="text-slate-500 mt-1">Monitor and manage autonomous AI agents</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <i className="fas fa-filter mr-2"></i>
            Filter
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <i className="fas fa-plus mr-2"></i>
            Deploy Agent
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Total Agents</span>
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-robot text-indigo-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{AGENTS.length}</h3>
          <p className="text-xs text-slate-500 mt-1">Across 4 categories</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Active Now</span>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-circle-notch fa-spin text-green-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {AGENTS.filter(a => a.status === 'Active').length}
          </h3>
          <p className="text-xs text-green-600 font-medium mt-1">Operating normally</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Tasks Today</span>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-tasks text-blue-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {AGENTS.reduce((sum, a) => sum + a.tasksCompleted, 0)}
          </h3>
          <p className="text-xs text-blue-600 font-medium mt-1">
            <i className="fas fa-arrow-up mr-1"></i>
            +18% vs yesterday
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Avg Performance</span>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-purple-600"></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {Math.round(AGENTS.reduce((sum, a) => sum + a.performance, 0) / AGENTS.length)}%
          </h3>
          <p className="text-xs text-purple-600 font-medium mt-1">Excellent health</p>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {AGENTS.map((agent) => (
          <div 
            key={agent.id} 
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer"
            onClick={() => setSelectedAgent(agent)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTypeColor(agent.type)} flex items-center justify-center text-white`}>
                    <i className={`fas ${getTypeIcon(agent.type)} text-lg`}></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{agent.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{agent.type} Agent</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(agent.status)}`}>
                  {agent.status === 'Active' && <i className="fas fa-circle text-[6px] mr-1 animate-pulse"></i>}
                  {agent.status}
                </div>
              </div>

              {agent.currentTask && (
                <div className="bg-slate-50 p-3 rounded-xl mb-4">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Current Task</p>
                  <p className="text-sm text-slate-700 font-medium">{agent.currentTask}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Tasks</p>
                  <p className="text-lg font-bold text-slate-900">{agent.tasksCompleted}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Uptime</p>
                  <p className="text-lg font-bold text-slate-900">{agent.uptime}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Performance</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-slate-900">{agent.performance}%</p>
                    {agent.performance >= 90 && <i className="fas fa-check-circle text-green-500 text-sm"></i>}
                    {agent.performance < 90 && agent.performance >= 70 && <i className="fas fa-exclamation-circle text-orange-500 text-sm"></i>}
                    {agent.performance < 70 && <i className="fas fa-times-circle text-red-500 text-sm"></i>}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <button className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">
                  View Logs
                </button>
                <button className="flex-1 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                  Configure
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Activity Log */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 mb-4">Recent Agent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
              <i className="fas fa-brain text-xs"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Decision Agent Alpha completed optimization</p>
              <p className="text-xs text-slate-500">Generated 3 itinerary alternatives for Robinson Family • 2 minutes ago</p>
            </div>
            <span className="text-xs font-bold text-green-600">Success</span>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
              <i className="fas fa-calendar-check text-xs"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Booking Agent Beta confirmed reservation</p>
              <p className="text-xs text-slate-500">Hotel booking confirmed for Chen Family • 15 minutes ago</p>
            </div>
            <span className="text-xs font-bold text-green-600">Success</span>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0">
              <i className="fas fa-radar text-xs"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Monitoring Agent Delta detected delay</p>
              <p className="text-xs text-slate-500">Flight delay alert for Gupta Group • 45 minutes ago</p>
            </div>
            <span className="text-xs font-bold text-orange-600">Warning</span>
          </div>
        </div>
      </div>
    </div>
  );
}
