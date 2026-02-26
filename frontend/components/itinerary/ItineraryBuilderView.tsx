'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Plus, Map, Building2, Calendar,
    Save, Download, Settings, Info, Filter,
    ChevronUp, ChevronDown, Edit2, Trash2, Maximize2, Minimize2, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import VoyageurAIPanel from './VoyageurAIPanel';

export default function ItineraryBuilderView() {
    const router = useRouter();

    // UI states
    const [aiOpen, setAiOpen] = useState(true);
    const [mapExpanded, setMapExpanded] = useState(false);

    // Form states
    const [projectName, setProjectName] = useState('The Royal Rajasthan Loop');
    const [startDate, setStartDate] = useState('OCT 12, 2024');
    const [duration, setDuration] = useState('14 DAYS');
    const [families, setFamilies] = useState([
        { id: 'ANDERSON_FAM_04', pax: '2A+2C' },
        { id: 'MILLER_FAM_02', pax: '2A' }
    ]);

    const handleSave = () => {
        // Here we can mock saving the itinerary to sessionStorage or calling backend
        const builtTrip = {
            id: 'TR-' + Math.floor(Math.random() * 9000 + 1000), // Random 4 digits
            title: projectName,
            client: families.map(f => f.id.split('_')[0]).join(', '),
            status: 'DRAFT',
            dateRange: `${startDate} – TBD`,
        };

        // Let's store in sessionStorage for the Optimizer Window to pick up
        const existingTrips = JSON.parse(sessionStorage.getItem('builtTrips') || '[]');
        existingTrips.push(builtTrip);
        sessionStorage.setItem('builtTrips', JSON.stringify(existingTrips));

        // Navigate back to optimizer window
        router.push('/agent-dashboard/itinerary-management');
    };

    return (
        <div className="flex-1 flex overflow-hidden h-full relative bp-grid-bg bg-white">

            {/* ── LEFT PANEL: Parameters & Composition ──────────────────────── */}
            <aside className="w-[300px] shrink-0 flex flex-col bg-white border-r border-[var(--bp-border)] overflow-hidden">
                <div className="p-6 flex flex-col gap-8 h-full overflow-y-auto scrollbar-hide">
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-widest font-mono text-stone-900 mb-4 flex items-center gap-2">
                            <Settings className="w-4 h-4" /> Trip Parameters
                        </h2>

                        <div className="space-y-5">
                            <div className="group">
                                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1.5">Project Name</label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 text-sm p-2 font-medium text-stone-900 focus:border-stone-900 focus:ring-0 rounded-none placeholder-stone-300 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1.5">Start Date</label>
                                    <input
                                        type="text"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 text-sm p-2 font-mono text-stone-900 focus:border-stone-900 focus:ring-0 rounded-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1.5">Duration</label>
                                    <input
                                        type="text"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 text-sm p-2 font-mono text-stone-900 focus:border-stone-900 focus:ring-0 rounded-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-stone-100">
                                <label className="block text-[10px] font-bold font-mono text-stone-800 uppercase mb-3 flex items-center gap-2">
                                    Group Composition
                                    <span className="text-[9px] font-normal text-stone-400 bg-stone-100 px-1 rounded">MULTI-ID</span>
                                </label>

                                <div className="space-y-2">
                                    {families.map((fam, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-8 h-8 flex items-center justify-center bg-stone-100 border border-stone-200 shrink-0">
                                                <span className="text-xs font-mono font-bold text-stone-600">{fam.id.charAt(0)}</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={fam.id}
                                                readOnly
                                                className="block flex-1 bg-white border border-stone-200 text-xs p-1.5 font-mono text-stone-700 focus:border-stone-900 focus:ring-0 rounded-none"
                                            />
                                            <span className="text-[10px] text-stone-400 font-mono w-10 text-right">{fam.pax}</span>
                                        </div>
                                    ))}
                                    <button className="w-full mt-2 border border-dashed border-stone-300 py-1.5 text-[10px] font-mono uppercase text-stone-500 hover:text-stone-900 hover:border-stone-900 transition-colors">
                                        + Add Family ID
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1.5">Activity Intensity</label>
                                <select className="w-full bg-white border border-stone-200 text-sm p-2 font-mono text-stone-900 focus:border-stone-900 focus:ring-0 rounded-none uppercase">
                                    <option>High (3-4 Sites/Day)</option>
                                    <option>Moderate (2-3 Sites/Day)</option>
                                    <option>Low (1 Site/Day)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Alert Box at the bottom */}
                    <div className="mt-auto border border-amber-200/50 bg-[#fffdf0] p-4 text-amber-900">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 text-amber-500" />
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-tight">Monument Alert</h4>
                                <p className="text-[10px] mt-1 leading-relaxed opacity-80">
                                    Taj Mahal night viewing dates confirmed for Oct 14-16. Requires separate ticket booking per ID.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── MIDDLE PANEL: Timeline ──────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#faf9f6]">
                {/* Header */}
                <div className="bg-white/95 backdrop-blur z-10 border-b border-[var(--bp-border)] px-6 py-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xs font-bold uppercase tracking-widest font-mono text-stone-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Monument Timeline
                    </h2>
                    <div className="flex gap-2">
                        <button className="p-1 hover:bg-stone-100 text-stone-400 transition-colors"><Filter className="w-4 h-4" /></button>
                        <button className="p-1 hover:bg-stone-100 text-stone-400 transition-colors"><ChevronUp className="w-4 h-4" /></button>
                        <button className="p-1 hover:bg-stone-100 text-stone-400 transition-colors"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                </div>

                {/* Timeline content */}
                <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-8 scrollbar-hide">

                    {/* Day 1 */}
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#faf9f6]/95 backdrop-blur z-10 py-2 border-b border-dashed border-stone-200">
                            <div className="flex items-center gap-3">
                                <span className="bg-stone-900 text-white text-xs font-bold px-2 py-1 font-mono">DAY 01</span>
                                <span className="text-sm font-semibold text-stone-800">Imperial New Delhi</span>
                            </div>
                            <span className="text-[10px] font-mono text-stone-400">OCT 12</span>
                        </div>

                        <div className="ml-4 pl-4 border-l border-stone-200 space-y-4">
                            {/* Card 1 */}
                            <div className="group relative flex bg-white border border-stone-200 hover:border-stone-400 transition-all shadow-sm">
                                <div className="w-20 h-24 flex-shrink-0 bg-stone-100 relative overflow-hidden border-r border-stone-100">
                                    <img
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHEfIerhPgoh_W0PbpveI2rCWMElLqzvkFCQHBS1TLUXqfl4x6Rh3GiQ54cGPAxS9yU7D84e6T_LBY_zPElcGSLLtAvR1mnK9oSKqSlerJbbOCS_QXotb0KOVCHicQrsls1eKYTTy1_PfwcrV2VyDg2Lmpn_gnh_3becoYFaIrgg-FGX36CLIPaqOI5qyZX5BpQM2Bpup5nBNpq8KSBGdReZZnTA1VG3aCIOYClr63eaDhB67ZZQEfaT1wB9MiDuiXJQ7oNG4ysWz8"
                                        alt="Qutub Minar"
                                        className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 transition-all duration-500"
                                    />
                                    <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-[9px] font-mono text-center py-0.5 tracking-wider backdrop-blur-sm">
                                        09:00
                                    </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">UNESCO Site</span>
                                            <h4 className="text-sm font-semibold text-stone-900 leading-tight mt-0.5">Qutub Minar Complex</h4>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-stone-400 hover:text-stone-900"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button className="text-stone-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-stone-50">
                                        <p className="text-[10px] text-stone-600 font-mono">Guided Walk • 2.5 Hours</p>
                                        <span className="text-[10px] font-mono font-semibold text-stone-400">#HISTORICAL</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="group relative flex bg-white border border-stone-200 hover:border-stone-400 transition-all shadow-sm">
                                <div className="w-20 h-24 flex-shrink-0 bg-stone-100 relative overflow-hidden border-r border-stone-100">
                                    <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-stone-300 group-hover:bg-stone-100 group-hover:text-stone-400 transition-colors">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-[9px] font-mono text-center py-0.5 tracking-wider backdrop-blur-sm">
                                        14:00
                                    </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">Landmark</span>
                                            <h4 className="text-sm font-semibold text-stone-900 leading-tight mt-0.5">Humayun's Tomb</h4>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-stone-400 hover:text-stone-900"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button className="text-stone-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-stone-50">
                                        <p className="text-[10px] text-stone-600 font-mono">Garden Walk • 1.5 Hours</p>
                                        <span className="text-[10px] font-mono font-semibold text-stone-400">#MUGHAL_ARCH</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add Item Line */}
                            <div className="relative mt-2">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 w-4 h-px border-t border-dashed border-stone-300"></div>
                                <input
                                    className="w-full bg-transparent border-b border-dashed border-stone-300 py-2 pl-0 pr-8 text-sm focus:border-stone-900 focus:ring-0 placeholder-stone-400 transition-colors font-mono"
                                    placeholder="+ Add monument or activity..."
                                    type="text"
                                />
                                <button className="absolute right-0 top-2 text-stone-400 hover:text-stone-900 transition-colors">
                                    <Plus className="w-4 h-4 mt-0.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Day 2 */}
                    <div className="relative pt-4">
                        <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#faf9f6]/95 backdrop-blur z-10 py-2 border-b border-dashed border-stone-200">
                            <div className="flex items-center gap-3">
                                <span className="bg-stone-900 text-white text-xs font-bold px-2 py-1 font-mono">DAY 02</span>
                                <span className="text-sm font-semibold text-stone-800">Old Delhi Heritage</span>
                            </div>
                            <span className="text-[10px] font-mono text-stone-400">OCT 13</span>
                        </div>

                        <div className="ml-4 pl-4 border-l border-stone-200 space-y-4">
                            {/* Card 3 */}
                            <div className="group relative flex bg-white border border-stone-200 hover:border-stone-400 transition-all shadow-sm">
                                <div className="w-20 h-24 flex-shrink-0 bg-stone-100 relative overflow-hidden border-r border-stone-100">
                                    <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-stone-300 group-hover:bg-stone-100 group-hover:text-stone-400 transition-colors">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-[9px] font-mono text-center py-0.5 tracking-wider backdrop-blur-sm">
                                        09:00
                                    </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">Fortress</span>
                                            <h4 className="text-sm font-semibold text-stone-900 leading-tight mt-0.5">Red Fort Private Tour</h4>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-stone-400 hover:text-stone-900"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button className="text-stone-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-stone-50">
                                        <p className="text-[10px] text-stone-600 font-mono">Diwan-i-Aam & Museums</p>
                                        <span className="text-[10px] font-mono font-semibold text-stone-400">#ICONIC</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add Item Line */}
                            <div className="relative mt-2">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 w-4 h-px border-t border-dashed border-stone-300"></div>
                                <input
                                    className="w-full bg-transparent border-b border-dashed border-stone-300 py-2 pl-0 pr-8 text-sm focus:border-stone-900 focus:ring-0 placeholder-stone-400 transition-colors font-mono"
                                    placeholder="+ Add monument or activity..."
                                    type="text"
                                />
                                <button className="absolute right-0 top-2 text-stone-400 hover:text-stone-900 transition-colors">
                                    <Plus className="w-4 h-4 mt-0.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── RIGHT PANEL: Map & Voyageur AI ──────────────────────────────── */}
            <aside className="w-[320px] 2xl:w-[380px] shrink-0 flex flex-col bg-stone-50 relative border-l border-[var(--bp-border)]">

                {/* Fixed Map at the top */}
                <div className="h-[280px] w-full bg-[#faf9f6] border-b border-stone-200 overflow-hidden relative group">
                    <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur text-stone-900 shadow-sm border border-stone-200 px-3 py-1.5 flex flex-col gap-0.5 pointer-events-none">
                        <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest leading-none">View Mode</span>
                        <span className="text-xs font-bold leading-none">Monument Schematic</span>
                    </div>

                    <button
                        onClick={() => setMapExpanded(true)}
                        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur border border-stone-200 shadow-sm text-stone-600 hover:text-stone-900 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>

                    <div className="w-full h-full relative">
                        {/* Interactive map placeholder imitating routing map */}
                        <iframe
                            src="https://www.openstreetmap.org/export/embed.html?bbox=77.10%2C28.50%2C77.30%2C28.70&layer=mapnik&marker=28.52%2C77.18"
                            className="w-full h-[320px] filter sepia-[0.2] saturate-[0.8] brightness-[1.1] scale-105 pointer-events-none"
                            style={{ border: 'none' }}
                            scrolling="no"
                        />
                        {/* Overlay to intercept clicks on iframe and give custom styles */}
                        <div className="absolute inset-0 bg-stone-100/10 pointer-events-auto">
                            {/* Mock markers from HTML logic */}
                            <div className="absolute top-[40%] left-[30%] transform -translate-x-1/2 -translate-y-1/2">
                                <div className="w-3 h-3 bg-white border border-stone-900 rotate-45 shadow-sm"></div>
                                <div className="absolute -top-7 -left-10 bg-white px-2 py-0.5 border border-stone-200 whitespace-nowrap shadow-sm z-20">
                                    <span className="text-[9px] font-bold font-mono text-stone-900">QUTUB MINAR</span>
                                </div>
                            </div>
                            <div className="absolute top-[55%] left-[65%] transform -translate-x-1/2 -translate-y-1/2">
                                <div className="w-3 h-3 bg-stone-900 border border-white rotate-45 shadow-sm"></div>
                                <div className="absolute top-5 -right-6 bg-white px-2 py-0.5 border border-stone-200 whitespace-nowrap shadow-sm">
                                    <span className="text-[9px] font-mono text-stone-500">RED FORT</span>
                                </div>
                            </div>
                            {/* Connection line between points (purely decorative SVG) */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-stone-900 stroke-[1.5] fill-none" style={{ strokeDasharray: '4 4' }}>
                                <path d="M 96 112 L 208 154" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Voyageur AI embedded in panel */}
                <div className="flex-1 relative bg-white">
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
                                        Optimization: Moving <strong className="text-stone-900">Humayun's Tomb</strong> to Day 01 afternoon reduces total travel time in current traffic models by ~45 mins.
                                    </span>
                                </li>
                                <div className="pl-4 mt-1">
                                    <button className="bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-stone-900 hover:text-white transition-colors">
                                        &gt; Apply Change
                                    </button>
                                </div>
                            </ul>
                        }
                        inputPlaceholder="Query route logic or add monuments..."
                        seedMessage="Architect loaded. Ready to optimize sequence, suggest venues, and calculate commute times for Indochina Loop."
                        getAIReply={(text) => `Analyzing request: "${text}". I have mapped the coordinates. Would you like me to insert this into Day 02?`}
                    />
                </div>
            </aside>

            {/* ── TOP HEADER (Absolute overlapping layout to match agent header) ── */}
            <header className="absolute top-0 left-0 right-0 h-[64px] bg-white/95 backdrop-blur-sm border-b border-[var(--bp-border)] px-6 flex justify-between items-center z-50">
                <div className="flex items-center gap-4">
                    <h1 className="text-sm font-semibold tracking-tight text-stone-900 uppercase flex items-center gap-3">
                        Activity Architect
                        <span className="text-stone-300 font-light hidden sm:inline">/</span>
                        <span className="font-mono text-xs text-stone-500 bg-stone-100 px-2 py-1 tracking-wider border border-stone-200 hidden sm:inline">
                            PROJECT: {projectName.toUpperCase()}
                        </span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors"
                    >
                        <Save className="w-4 h-4" /> Save
                    </button>
                    <button className="bg-stone-900 text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-stone-700 transition-colors flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" /> Export Route
                    </button>
                </div>
            </header>

            {/* Push main layout down by header height */}
            <style jsx global>{`
                .flex-1.flex.overflow-hidden.h-full {
                    padding-top: 64px;
                }
            `}</style>

            {/* Map Expand Modal Overlay */}
            {mapExpanded && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setMapExpanded(false)}
                >
                    <div
                        className="relative bg-white shadow-2xl flex flex-col overflow-hidden border border-stone-200"
                        style={{ width: '80vw', height: '80vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur z-10 shrink-0 border-b border-stone-200">
                            <span className="text-xs font-bold text-stone-900 uppercase tracking-widest font-mono">Route Visualization Map</span>
                            <button
                                onClick={() => setMapExpanded(false)}
                                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 w-full bg-stone-100 relative pointer-events-auto overflow-hidden">
                            <div className="absolute top-0 right-0 bottom-[-45px] left-0">
                                <iframe
                                    src="https://www.openstreetmap.org/export/embed.html?bbox=77.05%2C28.45%2C77.35%2C28.75&layer=mapnik&marker=28.52%2C77.18"
                                    width="100%" height="100%"
                                    style={{ border: 'none', filter: 'sepia(30%) saturate(70%) brightness(1.05)' }}
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
