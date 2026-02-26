'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Building2,
    Save, Download, Settings, Info, Filter,
    ChevronUp, ChevronDown, Edit2, Trash2, Maximize2, Minimize2, Users
} from 'lucide-react';
import VoyageurAIPanel from './VoyageurAIPanel';

export default function ItineraryBuilderView() {
    const router = useRouter();

    const [aiOpen, setAiOpen] = useState(false);
    const [mapExpanded, setMapExpanded] = useState(false);

    const [projectName, setProjectName] = useState('The Royal Rajasthan Loop');
    const [startDate, setStartDate] = useState('OCT 12, 2024');
    const [duration, setDuration] = useState('14 DAYS');
    const [families] = useState([
        { id: 'ANDERSON_FAM_04', pax: '2A+2C' },
        { id: 'MILLER_FAM_02', pax: '2A' }
    ]);

    const handleSave = () => {
        const builtTrip = {
            id: 'TR-' + Math.floor(Math.random() * 9000 + 1000),
            title: projectName,
            client: families.map(f => f.id.split('_')[0]).join(', '),
            status: 'DRAFT',
            dateRange: `${startDate} – TBD`,
        };
        const existing = JSON.parse(sessionStorage.getItem('builtTrips') || '[]');
        existing.push(builtTrip);
        sessionStorage.setItem('builtTrips', JSON.stringify(existing));
        router.push('/agent-dashboard/itinerary-management');
    };

    return (
        // Root: full height flex column so header + body stack
        <div className="flex-1 flex flex-col min-h-0 bp-grid-bg bg-white">

            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <header className="h-[60px] shrink-0 bg-white border-b border-[var(--bp-border)] px-6 flex justify-between items-center z-40">
                <h1 className="text-sm font-semibold tracking-tight text-stone-900 uppercase flex items-center gap-3">
                    Activity Architect
                    <span className="text-stone-300 font-light hidden sm:inline">/</span>
                    <span className="font-mono text-xs text-stone-500 bg-stone-50 px-2 py-1 tracking-wider border border-stone-200 hidden sm:inline rounded-sm">
                        PROJECT: {projectName.toUpperCase()}
                    </span>
                </h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors px-3 py-1.5 hover:bg-stone-50 border border-transparent hover:border-stone-200 rounded-sm"
                    >
                        <Save className="w-4 h-4" /> Save
                    </button>
                    <div className="p-[1.5px] rounded-sm" style={{ background: 'linear-gradient(135deg, #d4a853, #5a7c5c, #3b6b4a)' }}>
                        <button className="bg-stone-900 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors flex items-center gap-2 rounded-sm">
                            <Download className="w-3.5 h-3.5" /> Export Route
                        </button>
                    </div>
                </div>
            </header>

            {/* ── TWO-COLUMN BODY ─────────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* ── LEFT PANEL: Map (fixed height) + Parameters (scrollable) ── */}
                <aside className="w-[40%] shrink-0 flex flex-col border-r border-[var(--bp-border)] overflow-hidden bg-[#faf9f6]">

                    {/* STICKY MAP — fixed height, never scrolls */}
                    <div className="h-[260px] shrink-0 w-full bg-stone-200 overflow-hidden relative group border-b border-stone-200">
                        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur px-3 py-1.5 border border-stone-200 shadow-sm pointer-events-none rounded-sm">
                            <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest leading-none block">View Mode</span>
                            <span className="text-xs font-bold leading-none">Monument Schematic</span>
                        </div>
                        <button
                            onClick={() => setMapExpanded(true)}
                            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur border border-stone-200 shadow-sm text-stone-500 hover:text-stone-900 transition-all opacity-0 group-hover:opacity-100 rounded-sm"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-full h-full relative">
                            <iframe
                                src="https://www.openstreetmap.org/export/embed.html?bbox=77.10%2C28.50%2C77.30%2C28.70&layer=mapnik&marker=28.52%2C77.18"
                                className="w-full h-[320px] filter sepia-[0.22] saturate-[0.7] brightness-[1.05] scale-105 pointer-events-none"
                                style={{ border: 'none' }}
                                scrolling="no"
                            />
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Qutub Minar marker */}
                                <div className="absolute top-[38%] left-[28%] -translate-x-1/2 -translate-y-1/2">
                                    <div className="w-3.5 h-3.5 bg-white border-2 border-stone-900 rotate-45 shadow" />
                                    <div className="absolute -top-8 -left-10 bg-white px-2 py-0.5 border border-stone-300 whitespace-nowrap shadow z-20 rounded-sm">
                                        <span className="text-[9px] font-bold font-mono text-stone-900">QUTUB MINAR</span>
                                    </div>
                                </div>
                                {/* Red Fort marker */}
                                <div className="absolute top-[54%] left-[66%] -translate-x-1/2 -translate-y-1/2">
                                    <div className="w-3.5 h-3.5 bg-stone-900 border-2 border-white rotate-45 shadow" />
                                    <div className="absolute top-5 -right-6 bg-white px-2 py-0.5 border border-stone-300 whitespace-nowrap shadow rounded-sm">
                                        <span className="text-[9px] font-mono text-stone-500">RED FORT</span>
                                    </div>
                                </div>
                                {/* Route line */}
                                <svg className="absolute inset-0 w-full h-full fill-none" style={{ strokeDasharray: '4 4' }}>
                                    <path d="M 96 100 L 212 138" stroke="#1c1917" strokeWidth="1.5" />
                                </svg>
                            </div>
                        </div>
                        {/* Bottom fade */}
                        <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
                            style={{ background: 'linear-gradient(to top, rgba(250,249,246,0.8), transparent)' }} />
                    </div>

                    {/* SCROLLABLE PARAMETERS */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="p-5 flex flex-col gap-6">

                            {/* Trip Parameters */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200">
                                    <Settings className="w-3.5 h-3.5 text-stone-400" />
                                    <h2 className="text-[10px] font-bold uppercase tracking-widest font-mono text-stone-600">Trip Parameters</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[9px] font-mono text-stone-400 uppercase mb-1.5 tracking-widest">Project Name</label>
                                        <input
                                            type="text" value={projectName}
                                            onChange={e => setProjectName(e.target.value)}
                                            className="w-full bg-white border border-stone-200 text-sm p-2.5 font-medium text-stone-900 focus:border-stone-500 focus:outline-none rounded-sm hover:border-stone-300 transition-colors"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-mono text-stone-400 uppercase mb-1.5 tracking-widest">Start Date</label>
                                            <input
                                                type="text" value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="w-full bg-white border border-stone-200 text-xs p-2.5 font-mono text-stone-900 focus:border-stone-500 focus:outline-none rounded-sm hover:border-stone-300 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-mono text-stone-400 uppercase mb-1.5 tracking-widest">Duration</label>
                                            <input
                                                type="text" value={duration}
                                                onChange={e => setDuration(e.target.value)}
                                                className="w-full bg-white border border-stone-200 text-xs p-2.5 font-mono text-stone-900 focus:border-stone-500 focus:outline-none rounded-sm hover:border-stone-300 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Group Composition */}
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-200">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-stone-400" />
                                        <h2 className="text-[10px] font-bold uppercase tracking-widest font-mono text-stone-600">Group Composition</h2>
                                    </div>
                                    <span className="text-[9px] font-mono text-stone-400 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-sm">MULTI-ID</span>
                                </div>
                                <div className="space-y-2">
                                    {families.map((fam, idx) => (
                                        <div key={idx} className="group flex items-center gap-2 p-2 bg-white border border-stone-200 hover:border-stone-300 transition-all rounded-sm relative overflow-hidden hover:shadow-sm">
                                            {/* Gold→green left accent on hover */}
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                style={{ background: 'linear-gradient(to bottom, #d4a853, #5a7c5c)' }} />
                                            <div className="w-8 h-8 flex items-center justify-center bg-stone-100 border border-stone-200 shrink-0 rounded-sm">
                                                <span className="text-xs font-mono font-bold text-stone-600">{fam.id.charAt(0)}</span>
                                            </div>
                                            <p className="flex-1 text-xs font-mono font-medium text-stone-800 truncate">{fam.id}</p>
                                            <span className="text-[9px] text-stone-400 font-mono shrink-0 bg-stone-50 border border-stone-100 px-1.5 py-0.5 rounded-sm">{fam.pax}</span>
                                        </div>
                                    ))}
                                    <button className="group w-full flex items-center justify-center gap-2 border border-dashed border-stone-300 py-2.5 text-[10px] font-mono uppercase text-stone-400 hover:text-stone-700 hover:border-stone-500 hover:bg-white transition-all rounded-sm mt-1">
                                        <Plus className="w-3.5 h-3.5" /> Add Family ID
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── RIGHT PANEL: Timeline (60%) ─────────────────────────────── */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    {/* Timeline section header (sticky) */}
                    <div className="bg-white border-b border-[var(--bp-border)] px-6 py-3.5 flex justify-between items-center shrink-0">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest font-mono text-stone-600 flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5" /> Monument Timeline
                        </h2>
                        <div className="flex items-center gap-1">
                            <button className="p-1.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors rounded-sm"><Filter className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors rounded-sm"><ChevronUp className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors rounded-sm"><ChevronDown className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>

                    {/* Scrollable days */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-10 bg-[#faf9f6]">

                        {/* ── Day 1 ── */}
                        <div>
                            <div className="flex items-center justify-between mb-5 sticky top-0 bg-[#faf9f6]/98 backdrop-blur py-2.5 border-b border-dashed border-stone-200 z-10">
                                <div className="flex items-center gap-3">
                                    <span className="bg-stone-900 text-white text-[10px] font-bold px-2.5 py-1 font-mono tracking-widest">DAY 01</span>
                                    <span className="text-sm font-semibold text-stone-800">Imperial New Delhi</span>
                                </div>
                                <span className="text-[10px] font-mono text-stone-400 bg-white border border-stone-200 px-2 py-0.5 rounded-sm">OCT 12</span>
                            </div>

                            <div className="ml-4 pl-5 border-l-2 border-stone-200 space-y-4">

                                {/* Card: Qutub Minar */}
                                <div className="group relative flex bg-white border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all overflow-hidden rounded-sm">
                                    <div className="absolute top-0 left-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: 'linear-gradient(to bottom, #d4a853, #5a7c5c)' }} />
                                    <div className="w-[88px] shrink-0 bg-stone-100 relative overflow-hidden border-r border-stone-100" style={{ minHeight: '90px' }}>
                                        <img
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHEfIerhPgoh_W0PbpveI2rCWMElLqzvkFCQHBS1TLUXqfl4x6Rh3GiQ54cGPAxS9yU7D84e6T_LBY_zPElcGSLLtAvR1mnK9oSKqSlerJbbOCS_QXotb0KOVCHicQrsls1eKYTTy1_PfwcrV2VyDg2Lmpn_gnh_3becoYFaIrgg-FGX36CLIPaqOI5qyZX5BpQM2Bpup5nBNpq8KSBGdReZZnTA1VG3aCIOYClr63eaDhB67ZZQEfaT1wB9MiDuiXJQ7oNG4ysWz8"
                                            alt="Qutub Minar"
                                            className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 absolute inset-0"
                                        />
                                        <div className="absolute bottom-0 left-0 w-full bg-black/65 text-white text-[9px] font-mono text-center py-1 tracking-wider z-10">09:00</div>
                                    </div>
                                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest">UNESCO Site</span>
                                                <h4 className="text-sm font-semibold text-stone-900 leading-tight mt-0.5">Qutub Minar Complex</h4>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="text-stone-300 hover:text-stone-700 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button className="text-stone-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end mt-2.5 pt-2 border-t border-stone-50">
                                            <p className="text-[10px] text-stone-500 font-mono">Guided Walk • 2.5 Hours</p>
                                            <span className="text-[9px] font-mono text-stone-300 bg-stone-50 border border-stone-100 px-1.5 py-0.5 rounded-sm">#HISTORICAL</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card: Humayun's Tomb */}
                                <div className="group relative flex bg-white border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all overflow-hidden rounded-sm">
                                    <div className="absolute top-0 left-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: 'linear-gradient(to bottom, #d4a853, #5a7c5c)' }} />
                                    <div className="w-[88px] shrink-0 bg-stone-50 border-r border-stone-100 flex items-center justify-center relative" style={{ minHeight: '90px' }}>
                                        <Building2 className="w-7 h-7 text-stone-200 group-hover:text-stone-300 transition-colors" />
                                        <div className="absolute bottom-0 left-0 w-full bg-black/65 text-white text-[9px] font-mono text-center py-1 tracking-wider">14:00</div>
                                    </div>
                                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest">Landmark</span>
                                                <h4 className="text-sm font-semibold text-stone-900 leading-tight mt-0.5">Humayun's Tomb</h4>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="text-stone-300 hover:text-stone-700 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button className="text-stone-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end mt-2.5 pt-2 border-t border-stone-50">
                                            <p className="text-[10px] text-stone-500 font-mono">Garden Walk • 1.5 Hours</p>
                                            <span className="text-[9px] font-mono text-stone-300 bg-stone-50 border border-stone-100 px-1.5 py-0.5 rounded-sm">#MUGHAL_ARCH</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Add row */}
                                <div className="flex items-center gap-3 border border-dashed border-stone-250 px-4 py-3 bg-white/50 hover:bg-white hover:border-stone-400 transition-all rounded-sm cursor-pointer group">
                                    <Plus className="w-4 h-4 text-stone-300 group-hover:text-stone-600 shrink-0 transition-colors" />
                                    <span className="text-xs text-stone-400 group-hover:text-stone-600 font-mono transition-colors">Add monument or activity...</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Day 2 ── */}
                        <div>
                            <div className="flex items-center justify-between mb-5 sticky top-0 bg-[#faf9f6]/98 backdrop-blur py-2.5 border-b border-dashed border-stone-200 z-10">
                                <div className="flex items-center gap-3">
                                    <span className="bg-stone-900 text-white text-[10px] font-bold px-2.5 py-1 font-mono tracking-widest">DAY 02</span>
                                    <span className="text-sm font-semibold text-stone-800">Old Delhi Heritage</span>
                                </div>
                                <span className="text-[10px] font-mono text-stone-400 bg-white border border-stone-200 px-2 py-0.5 rounded-sm">OCT 13</span>
                            </div>

                            <div className="ml-4 pl-5 border-l-2 border-stone-200 space-y-4">

                                {/* Card: Red Fort */}
                                <div className="group relative flex bg-white border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all overflow-hidden rounded-sm">
                                    <div className="absolute top-0 left-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: 'linear-gradient(to bottom, #d4a853, #5a7c5c)' }} />
                                    <div className="w-[88px] shrink-0 bg-stone-50 border-r border-stone-100 flex items-center justify-center relative" style={{ minHeight: '90px' }}>
                                        <Building2 className="w-7 h-7 text-stone-200 group-hover:text-stone-300 transition-colors" />
                                        <div className="absolute bottom-0 left-0 w-full bg-black/65 text-white text-[9px] font-mono text-center py-1 tracking-wider">09:00</div>
                                    </div>
                                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest">Fortress</span>
                                                <h4 className="text-sm font-semibold text-stone-900 leading-tight mt-0.5">Red Fort Private Tour</h4>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="text-stone-300 hover:text-stone-700 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button className="text-stone-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end mt-2.5 pt-2 border-t border-stone-50">
                                            <p className="text-[10px] text-stone-500 font-mono">Diwan-i-Aam & Museums</p>
                                            <span className="text-[9px] font-mono text-stone-300 bg-stone-50 border border-stone-100 px-1.5 py-0.5 rounded-sm">#ICONIC</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Add row */}
                                <div className="flex items-center gap-3 border border-dashed border-stone-250 px-4 py-3 bg-white/50 hover:bg-white hover:border-stone-400 transition-all rounded-sm cursor-pointer group">
                                    <Plus className="w-4 h-4 text-stone-300 group-hover:text-stone-600 shrink-0 transition-colors" />
                                    <span className="text-xs text-stone-400 group-hover:text-stone-600 font-mono transition-colors">Add monument or activity...</span>
                                </div>
                            </div>
                        </div>

                        {/* Add New Day */}
                        <div>
                            <div className="p-[1.5px] rounded-sm" style={{ background: 'linear-gradient(135deg, #d4a853, #5a7c5c, #3b6b4a)' }}>
                                <button className="w-full bg-[#faf9f6] hover:bg-white transition-colors flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:text-stone-900 rounded-sm">
                                    <Plus className="w-3.5 h-3.5" /> Add New Day
                                </button>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            {/* Voyageur AI (renders as fixed overlay – always at bottom-right) */}
            <VoyageurAIPanel
                open={aiOpen}
                onOpenChange={setAiOpen}
                insightTag="Itinerary Intelligence"
                insightTagColor="bg-stone-900 text-white"
                insightBody={
                    <ul className="space-y-3 mt-1 text-sm">
                        <li className="flex gap-2.5 items-start">
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-emerald-400" />
                            <span className="text-stone-700 leading-relaxed font-mono text-[11px]">
                                Moving <strong className="text-stone-900">Humayun's Tomb</strong> to Day 01 afternoon cuts travel time by ~45 min per current traffic models.
                            </span>
                        </li>
                        <div className="pl-4 mt-1">
                            <button className="bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-stone-900 hover:text-white transition-colors rounded-sm">
                                &gt; Apply Change
                            </button>
                        </div>
                    </ul>
                }
                inputPlaceholder="Query route logic or add monuments..."
                seedMessage="Architect loaded. Ready to optimize sequence, suggest venues, and calculate commute times."
                getAIReply={text => `Analyzing: "${text}". I've mapped the coordinates — would you like me to insert this into Day 02?`}
            />

            {/* Map Expand Modal */}
            {mapExpanded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setMapExpanded(false)}>
                    <div className="relative bg-white shadow-2xl flex flex-col overflow-hidden border border-stone-200 rounded-sm" style={{ width: '80vw', height: '80vh' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 bg-white shrink-0 border-b border-stone-200">
                            <span className="text-xs font-bold text-stone-900 uppercase tracking-widest font-mono">Route Visualization Map</span>
                            <button onClick={() => setMapExpanded(false)} className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors rounded-sm">
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bottom-[-45px] left-0">
                                <iframe
                                    src="https://www.openstreetmap.org/export/embed.html?bbox=77.05%2C28.45%2C77.35%2C28.75&layer=mapnik&marker=28.52%2C77.18"
                                    width="100%" height="100%"
                                    style={{ border: 'none', filter: 'sepia(25%) saturate(70%) brightness(1.05)' }}
                                    title="Route Map Full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
