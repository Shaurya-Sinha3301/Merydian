'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Save, Download, Settings,
    ChevronUp, ChevronDown, Edit2, Trash2, Maximize2, Minimize2,
    Users, Mail, UserPlus, Clock, X, Calendar, MapPin
} from 'lucide-react';
import VoyageurAIPanel from './VoyageurAIPanel';
import { apiClient } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Family {
    id: string;
    email: string;
    members: number;
    location: string;
}

interface Activity {
    id: string;
    name: string;
    time: string;
    duration: string;
    tag: string;
}

interface Day {
    id: string;
    title: string;
    activities: Activity[];
}

// ─── Predefined Activity Tags ───────────────────────────────────────────────────

const ACTIVITY_TAGS = [
    'HISTORICAL',
    'ACTIVITY',
    'ADVENTURE',
    'FUN',
    'CULTURAL',
    'DINING',
    'NATURE',
    'OTHER',
];

// ─── ID Generators ──────────────────────────────────────────────────────────────

function generateFamilyId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `FAM-${suffix}`;
}

let activityCounter = 0;
function generateActivityId(): string {
    activityCounter++;
    return `ACT-${activityCounter}-${Date.now().toString(36).slice(-4)}`;
}

let dayCounter = 0;
function generateDayId(): string {
    dayCounter++;
    return `DAY-${dayCounter}-${Date.now().toString(36).slice(-4)}`;
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ItineraryBuilderView() {
    const router = useRouter();

    const [aiOpen, setAiOpen] = useState(false);
    const [mapExpanded, setMapExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Trip Parameters — empty by default
    const [projectName, setProjectName] = useState('');
    const [startDate, setStartDate] = useState('');

    // Group Composition — empty by default
    const [families, setFamilies] = useState<Family[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newMembers, setNewMembers] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [addingFamily, setAddingFamily] = useState(false);

    // Activity Timeline — starts with one empty day
    const [days, setDays] = useState<Day[]>([
        { id: 'DAY-INIT-1', title: '', activities: [] },
    ]);
    const [addingActivityDayId, setAddingActivityDayId] = useState<string | null>(null);
    const [newActivityName, setNewActivityName] = useState('');
    const [newActivityTime, setNewActivityTime] = useState('');
    const [newActivityDuration, setNewActivityDuration] = useState('');
    const [newActivityTag, setNewActivityTag] = useState(ACTIVITY_TAGS[0]);

    // Derived duration
    const duration = `${days.length} ${days.length === 1 ? 'Day' : 'Days'}`;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleAddFamily = useCallback(() => {
        if (!newEmail.trim() || !newMembers.trim()) return;
        const memberCount = parseInt(newMembers, 10);
        if (isNaN(memberCount) || memberCount < 1) return;

        const newFamily: Family = {
            id: generateFamilyId(),
            email: newEmail.trim(),
            members: memberCount,
            location: newLocation.trim() || 'Not specified',
        };
        setFamilies(prev => [...prev, newFamily]);
        setNewEmail('');
        setNewMembers('');
        setNewLocation('');
        setAddingFamily(false);
    }, [newEmail, newMembers, newLocation]);

    const handleRemoveFamily = useCallback((famId: string) => {
        setFamilies(prev => prev.filter(f => f.id !== famId));
    }, []);

    const handleAddActivity = useCallback((dayId: string) => {
        if (!newActivityName.trim()) return;
        const newAct: Activity = {
            id: generateActivityId(),
            name: newActivityName.trim(),
            time: newActivityTime || '09:00',
            duration: newActivityDuration || '1 Hour',
            tag: newActivityTag || 'OTHER',
        };
        setDays(prev => prev.map(d =>
            d.id === dayId ? { ...d, activities: [...d.activities, newAct] } : d
        ));
        setNewActivityName('');
        setNewActivityTime('');
        setNewActivityDuration('');
        setNewActivityTag(ACTIVITY_TAGS[0]);
        setAddingActivityDayId(null);
    }, [newActivityName, newActivityTime, newActivityDuration, newActivityTag]);

    const handleRemoveActivity = useCallback((dayId: string, actId: string) => {
        setDays(prev => prev.map(d =>
            d.id === dayId ? { ...d, activities: d.activities.filter(a => a.id !== actId) } : d
        ));
    }, []);

    const handleAddDay = useCallback(() => {
        const newDay: Day = {
            id: generateDayId(),
            title: '',
            activities: [],
        };
        setDays(prev => [...prev, newDay]);
    }, []);

    const handleRemoveDay = useCallback((dayId: string) => {
        setDays(prev => prev.filter(d => d.id !== dayId));
    }, []);

    const handleUpdateDayTitle = useCallback((dayId: string, title: string) => {
        setDays(prev => prev.map(d =>
            d.id === dayId ? { ...d, title } : d
        ));
    }, []);

    const handleSave = async () => {
        if (families.length === 0) {
            alert("Please add at least one family to the trip.");
            return;
        }

        setIsSaving(true);
        try {
            const dest = families[0]?.location || 'Delhi';
            const startDt = startDate ? new Date(startDate) : new Date();
            const endDt = new Date(startDt.getTime() + (days.length * 24 * 60 * 60 * 1000));

            // Build traveller_emails from the families added in the UI.
            // The backend will auto-register these emails, create families,
            // run the optimizer, and auto-approve — all in one call.
            const travellerEmails = families.map(f => ({
                email: f.email,
                full_name: f.email.split('@')[0],
                members: f.members,
                children: 0,
            }));

            const payload = {
                trip_name: projectName || 'Untitled Trip',
                destination: dest,
                start_date: startDt.toISOString().split('T')[0],
                end_date: endDt.toISOString().split('T')[0],
                traveller_emails: travellerEmails,
                num_travellers: families.reduce((acc, f) => acc + f.members, 0),
                auto_approve: true,
            };

            console.log("Calling initializeTripWithOptimization (auto_approve=true)...", payload);
            const optiResult = await apiClient.initializeTripWithOptimization(payload);
            console.log("Initialize with Optimization result:", optiResult);

            if (optiResult.success) {
                router.push('/agent-dashboard/itinerary-management');
            } else {
                alert("Failed to initialize trip: " + (optiResult.message || JSON.stringify(optiResult)));
                setIsSaving(false);
            }
        } catch (error: any) {
            console.error(error);
            alert("An error occurred while saving the itinerary: " + (error.message || "Unknown error"));
            setIsSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bp-grid-bg bg-white overflow-hidden">

            {/* ── HEADER — matches management page style ────────────────────── */}
            <div className="shrink-0 w-full z-10 bg-white/95 backdrop-blur-sm border-b border-[var(--bp-border)]">
                <div className="px-6 md:px-8 py-4 max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-[300] tracking-[-0.02em] text-black leading-tight">
                                Activity Architect
                            </h1>
                            <p className="text-[var(--bp-muted)] mt-1 font-light text-xs tracking-wide">
                                Build &amp; configure group itineraries
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`h-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border px-4 transition-colors ${isSaving
                                    ? 'bg-gray-50 text-gray-400 border-[var(--bp-border)] cursor-not-allowed'
                                    : 'border-[var(--bp-border)] text-[var(--bp-muted)] hover:border-black hover:text-black'
                                    }`}
                            >
                                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button className="h-8 bg-black text-white px-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--bp-sage)] transition-colors">
                                <Download className="w-3.5 h-3.5" /> Export
                            </button>
                        </div>
                    </header>
                </div>
            </div>

            {/* ── TWO-COLUMN BODY ─────────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
                <aside className="w-[40%] shrink-0 flex flex-col border-r border-[var(--bp-border)] overflow-hidden bg-white">

                    {/* STICKY MAP */}
                    <div className="h-[200px] shrink-0 w-full bg-gray-100 overflow-hidden relative group border-b border-[var(--bp-border)]">
                        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur px-3 py-1.5 border border-[var(--bp-border)] pointer-events-none">
                            <span className="bp-label mb-0">View Mode</span>
                            <span className="text-xs font-semibold text-[var(--bp-text)]">Route Schematic</span>
                        </div>
                        <button
                            onClick={() => setMapExpanded(true)}
                            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur border border-[var(--bp-border)] text-[var(--bp-muted)] hover:text-black hover:border-black transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-full h-full relative">
                            <iframe
                                src="https://www.openstreetmap.org/export/embed.html?bbox=77.10%2C28.50%2C77.30%2C28.70&layer=mapnik&marker=28.52%2C77.18"
                                className="w-full h-[260px] filter sepia-[0.22] saturate-[0.7] brightness-[1.05] scale-105 pointer-events-none"
                                style={{ border: 'none' }}
                                scrolling="no"
                            />
                        </div>
                    </div>

                    {/* SCROLLABLE PARAMETERS */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="p-6 flex flex-col gap-6">

                            {/* ── Trip Parameters ──────────────────────────────── */}
                            <section>
                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--bp-border)]">
                                    <Settings className="w-3.5 h-3.5 text-[var(--bp-muted)]" />
                                    <span className="bp-label mb-0">Trip Parameters</span>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="bp-label">Trip Name</label>
                                        <input
                                            type="text" value={projectName}
                                            onChange={e => setProjectName(e.target.value)}
                                            placeholder="Enter trip name..."
                                            className="w-full bg-white border border-[var(--bp-border)] text-sm p-2.5 font-medium text-[var(--bp-text)] placeholder-gray-300 focus:border-black focus:outline-none hover:border-gray-400 transition-colors"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="bp-label">Start Date</label>
                                            <input
                                                type="date" value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="w-full bg-white border border-[var(--bp-border)] text-xs p-2.5 font-mono text-[var(--bp-text)] focus:border-black focus:outline-none hover:border-gray-400 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="bp-label">Duration</label>
                                            <div className="w-full bg-gray-50 border border-[var(--bp-border)] text-xs p-2.5 font-mono font-semibold text-[var(--bp-text)] flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-[var(--bp-muted)]" />
                                                {duration}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ── Group Composition ────────────────────────────── */}
                            <section>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--bp-border)]">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-[var(--bp-muted)]" />
                                        <span className="bp-label mb-0">Group Composition</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-[var(--bp-muted)] bg-gray-100 border border-[var(--bp-border)] px-2 py-0.5 uppercase tracking-widest">
                                        {families.length} {families.length === 1 ? 'Family' : 'Families'}
                                    </span>
                                </div>

                                {/* Family Cards */}
                                <div className="space-y-2">
                                    {families.length === 0 && !addingFamily && (
                                        <div className="border border-dashed border-[var(--bp-border)] p-4 text-center">
                                            <p className="text-xs text-[var(--bp-muted)] font-light">No families added yet</p>
                                        </div>
                                    )}

                                    {families.map((fam) => (
                                        <div key={fam.id} className="bp-card group relative p-3 flex items-center gap-3 overflow-hidden">
                                            {/* Left accent on hover */}
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bp-sage)]" />
                                            <div className="w-9 h-9 flex items-center justify-center bg-gray-100 border border-[var(--bp-border)] shrink-0">
                                                <span className="text-xs font-bold text-[var(--bp-text)]">{fam.email.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[9px] font-bold text-[var(--bp-sage)] bg-[var(--bp-sage)]/10 px-1.5 py-0.5 uppercase tracking-widest border border-[var(--bp-sage)]/20">{fam.id}</span>
                                                </div>
                                                <p className="text-xs text-[var(--bp-text)] truncate font-medium">{fam.email}</p>
                                                <p className="text-[10px] text-[var(--bp-muted)] truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{fam.location}</p>
                                            </div>
                                            <span className="text-[9px] font-bold text-[var(--bp-muted)] bg-gray-100 border border-[var(--bp-border)] px-1.5 py-0.5 uppercase tracking-wider shrink-0">
                                                {fam.members} {fam.members === 1 ? 'Member' : 'Members'}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveFamily(fam.id)}
                                                className="p-1 text-gray-300 hover:text-[var(--bp-red)] transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add Family Form */}
                                    {addingFamily ? (
                                        <div className="border border-black p-4 space-y-3 bg-white">
                                            <div className="flex items-center gap-2 mb-1">
                                                <UserPlus className="w-3.5 h-3.5 text-[var(--bp-muted)]" />
                                                <span className="bp-label mb-0">New Family</span>
                                            </div>
                                            <div>
                                                <label className="bp-label">Family Head Email</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                                                    <input
                                                        type="email"
                                                        value={newEmail}
                                                        onChange={e => setNewEmail(e.target.value)}
                                                        placeholder="e.g. john@family.com"
                                                        className="w-full bg-white border border-[var(--bp-border)] text-xs p-2.5 pl-9 text-[var(--bp-text)] placeholder-gray-300 focus:outline-none focus:border-black transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="bp-label">Number of Members</label>
                                                <div className="relative">
                                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={newMembers}
                                                        onChange={e => setNewMembers(e.target.value)}
                                                        placeholder="e.g. 4"
                                                        className="w-full bg-white border border-[var(--bp-border)] text-xs p-2.5 pl-9 text-[var(--bp-text)] placeholder-gray-300 focus:outline-none focus:border-black transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="bp-label">Initial Location</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                                                    <input
                                                        type="text"
                                                        value={newLocation}
                                                        onChange={e => setNewLocation(e.target.value)}
                                                        placeholder="e.g. New Delhi, India"
                                                        className="w-full bg-white border border-[var(--bp-border)] text-xs p-2.5 pl-9 text-[var(--bp-text)] placeholder-gray-300 focus:outline-none focus:border-black transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={handleAddFamily}
                                                    className="flex-1 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--bp-sage)] transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Add Family
                                                </button>
                                                <button
                                                    onClick={() => { setAddingFamily(false); setNewEmail(''); setNewMembers(''); setNewLocation(''); }}
                                                    className="px-4 py-2 border border-[var(--bp-border)] text-[var(--bp-muted)] text-[10px] font-bold uppercase tracking-widest hover:border-black hover:text-black transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingFamily(true)}
                                            className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--bp-muted)] hover:text-black hover:border-black transition-all mt-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Family
                                        </button>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </aside>

                {/* ── RIGHT PANEL: Activity Timeline ──────────────────────────── */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">

                    {/* Timeline section header (sticky) */}
                    <div className="bg-white border-b border-[var(--bp-border)] px-6 py-3.5 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-3.5 h-3.5 text-[var(--bp-muted)]" />
                            <span className="bp-label mb-0">Activity Timeline</span>
                            <span className="text-[9px] font-bold text-[var(--bp-muted)] bg-gray-100 border border-[var(--bp-border)] px-2 py-0.5 uppercase tracking-widest">
                                {days.length} {days.length === 1 ? 'Day' : 'Days'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="w-7 h-7 flex items-center justify-center border border-transparent hover:border-[var(--bp-border)] text-[var(--bp-muted)] hover:text-black transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                            <button className="w-7 h-7 flex items-center justify-center border border-transparent hover:border-[var(--bp-border)] text-[var(--bp-muted)] hover:text-black transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>

                    {/* Scrollable days */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">

                        {days.map((day, dayIdx) => (
                            <div key={day.id}>
                                {/* Day Header */}
                                <div className="flex items-center justify-between mb-4 sticky top-0 bg-white/98 backdrop-blur py-2.5 border-b border-dashed border-[var(--bp-border)] z-10">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-black text-white text-[10px] font-bold px-2.5 py-1 font-mono tracking-widest">
                                            DAY {String(dayIdx + 1).padStart(2, '0')}
                                        </span>
                                        <input
                                            type="text"
                                            value={day.title}
                                            onChange={e => handleUpdateDayTitle(day.id, e.target.value)}
                                            placeholder="Day title..."
                                            className="text-sm font-semibold text-[var(--bp-text)] bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-none transition-colors px-1 py-0.5 placeholder-gray-300"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {startDate && (
                                            <span className="text-[10px] font-mono text-[var(--bp-muted)] bg-white border border-[var(--bp-border)] px-2 py-0.5">
                                                {(() => {
                                                    const d = new Date(startDate);
                                                    d.setDate(d.getDate() + dayIdx);
                                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
                                                })()}
                                            </span>
                                        )}
                                        {days.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveDay(day.id)}
                                                className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-[var(--bp-red)] transition-colors border border-transparent hover:border-[var(--bp-red)]"
                                                title="Remove day"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="ml-4 pl-5 border-l-2 border-gray-200 space-y-3">

                                    {/* Activity Cards */}
                                    {day.activities.length === 0 && addingActivityDayId !== day.id && (
                                        <div className="border border-dashed border-[var(--bp-border)] p-4 text-center">
                                            <p className="text-xs text-[var(--bp-muted)] font-light">No activities yet</p>
                                        </div>
                                    )}

                                    {day.activities.map((act) => (
                                        <div key={act.id} className="bp-card group relative flex items-center gap-4 p-3.5 overflow-hidden">
                                            {/* Left accent */}
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bp-sage)]" />
                                            {/* Time badge */}
                                            <div className="w-12 h-12 bg-gray-50 border border-[var(--bp-border)] flex flex-col items-center justify-center shrink-0">
                                                <Clock className="w-3 h-3 text-[var(--bp-muted)] mb-0.5" />
                                                <span className="text-[10px] font-bold font-mono text-[var(--bp-text)]">{act.time}</span>
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-[var(--bp-text)] tracking-tight">{act.name}</h4>
                                                <p className="text-[10px] text-[var(--bp-muted)] font-medium uppercase tracking-wider mt-0.5">{act.duration}</p>
                                            </div>
                                            {/* Tag + Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[9px] font-bold text-[var(--bp-muted)] bg-gray-100 border border-[var(--bp-border)] px-2 py-0.5 uppercase tracking-widest">
                                                    #{act.tag}
                                                </span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-black border border-transparent hover:border-[var(--bp-border)] transition-colors">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveActivity(day.id, act.id)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-[var(--bp-red)] border border-transparent hover:border-[var(--bp-red)] transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Activity Form / Button */}
                                    {addingActivityDayId === day.id ? (
                                        <div className="border border-black p-4 space-y-3 bg-white">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Plus className="w-3.5 h-3.5 text-[var(--bp-muted)]" />
                                                    <span className="bp-label mb-0">New Activity</span>
                                                </div>
                                                <button onClick={() => setAddingActivityDayId(null)} className="w-6 h-6 flex items-center justify-center text-[var(--bp-muted)] hover:text-black transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div>
                                                <label className="bp-label">Activity Name</label>
                                                <input
                                                    type="text"
                                                    value={newActivityName}
                                                    onChange={e => setNewActivityName(e.target.value)}
                                                    placeholder="e.g. Taj Mahal Visit"
                                                    className="w-full bg-white border border-[var(--bp-border)] text-xs p-2.5 text-[var(--bp-text)] placeholder-gray-300 focus:outline-none focus:border-black transition-all"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="bp-label">Time</label>
                                                    <input
                                                        type="time"
                                                        value={newActivityTime}
                                                        onChange={e => setNewActivityTime(e.target.value)}
                                                        className="w-full bg-white border border-[var(--bp-border)] text-xs p-2.5 font-mono text-[var(--bp-text)] focus:outline-none focus:border-black transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="bp-label">Duration</label>
                                                    <input
                                                        type="text"
                                                        value={newActivityDuration}
                                                        onChange={e => setNewActivityDuration(e.target.value)}
                                                        placeholder="e.g. 2 Hours"
                                                        className="w-full bg-white border border-[var(--bp-border)] text-xs p-2.5 text-[var(--bp-text)] placeholder-gray-300 focus:outline-none focus:border-black transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="bp-label">Tag</label>
                                                    <select
                                                        value={newActivityTag}
                                                        onChange={e => setNewActivityTag(e.target.value)}
                                                        className="w-full bg-white border border-[var(--bp-border)] text-xs p-2.5 text-[var(--bp-text)] focus:outline-none focus:border-black transition-all appearance-none cursor-pointer"
                                                    >
                                                        {ACTIVITY_TAGS.map(tag => (
                                                            <option key={tag} value={tag}>{tag}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddActivity(day.id)}
                                                className="w-full py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--bp-sage)] transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Activity
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setAddingActivityDayId(day.id);
                                                setNewActivityName('');
                                                setNewActivityTime('');
                                                setNewActivityDuration('');
                                                setNewActivityTag(ACTIVITY_TAGS[0]);
                                            }}
                                            className="w-full flex items-center gap-3 border border-dashed border-gray-300 px-4 py-3 hover:border-black hover:bg-gray-50 transition-all cursor-pointer group"
                                        >
                                            <Plus className="w-4 h-4 text-gray-300 group-hover:text-black shrink-0 transition-colors" />
                                            <span className="text-xs text-[var(--bp-muted)] group-hover:text-black font-mono transition-colors">Add activity...</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add New Day */}
                        <div>
                            <button
                                onClick={handleAddDay}
                                className="w-full bg-black text-white hover:bg-[var(--bp-sage)] transition-colors flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add New Day
                            </button>
                        </div>

                    </div>
                </main>
            </div>

            {/* Voyageur AI */}
            <VoyageurAIPanel
                open={aiOpen}
                onOpenChange={setAiOpen}
                insightTag="Itinerary Intelligence"
                insightTagColor="bg-black text-white"
                insightBody={
                    <ul className="space-y-3 mt-1 text-sm">
                        <li className="flex gap-2.5 items-start">
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-[var(--bp-sage)]" />
                            <span className="text-[var(--bp-text)] leading-relaxed font-mono text-[11px]">
                                Ready to help optimize your itinerary. Add days and activities to get started.
                            </span>
                        </li>
                    </ul>
                }
                inputPlaceholder="Query route logic or add activities..."
                seedMessage="Architect loaded. Ready to optimize sequence, suggest venues, and calculate commute times."
                getAIReply={text => `Analyzing: "${text}". I've mapped the coordinates — would you like me to insert this into the timeline?`}
            />

            {/* Map Expand Modal */}
            {mapExpanded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setMapExpanded(false)}>
                    <div className="relative bg-white shadow-2xl flex flex-col overflow-hidden border border-[var(--bp-border)]" style={{ width: '80vw', height: '80vh' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 bg-white shrink-0 border-b border-[var(--bp-border)]">
                            <span className="bp-label mb-0">Route Visualization Map</span>
                            <button onClick={() => setMapExpanded(false)} className="w-8 h-8 flex items-center justify-center border border-[var(--bp-border)] text-[var(--bp-muted)] hover:border-black hover:text-black transition-colors">
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