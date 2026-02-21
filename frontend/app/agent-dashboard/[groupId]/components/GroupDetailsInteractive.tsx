'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import { Sidebar } from '@/components/ui/Sidebar';
import { Map, MapMarker, MapTileLayer } from '@/components/ui/map';
import { allGroups } from '@/lib/agent-dashboard/data';

export default function GroupDetailsInteractive() {
    const params = useParams();
    const groupId = params.groupId as string;
    const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
    
    // Find the selected group from all groups
    const selectedGroup = allGroups.find(g => g.id === groupId) || allGroups[0];
    
    // Mock data for group details (in real app, fetch by ID)
    const groupDetails = {
        id: selectedGroup.id,
        name: selectedGroup.customerName,
        status: selectedGroup.status === 'booked' ? 'Active' : 'Upcoming',
        dates: `${new Date(selectedGroup.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(selectedGroup.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        destination: selectedGroup.destination,
        totalTravelers: selectedGroup.groupSize.adults + selectedGroup.groupSize.children + selectedGroup.groupSize.seniors,
        satisfactionScore: 88,
        optimizationStatus: 'Optimized',
        families: selectedGroup.families || [],
        nextDestinations: [
            { name: 'First Destination', time: '10:00 AM', date: new Date(selectedGroup.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
            { name: 'Second Destination', time: '2:00 PM', date: new Date(selectedGroup.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
        ],
        coordinates: { lat: 15.2993, lng: 74.1240 } // Default to Goa
    };

    const toggleFamily = (familyId: string) => {
        setExpandedFamilyId(expandedFamilyId === familyId ? null : familyId);
    };

    return (
        <div className="flex bg-background h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <NavigationBreadcrumbs />

                    {/* Groups Navigation Menu */}
                    <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-700">All Groups</h3>
                            <div className="flex gap-2">
                                <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                                    {allGroups.filter(g => g.status === 'booked').length} Active
                                </span>
                                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">
                                    {allGroups.filter(g => g.status === 'approved').length} Upcoming
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {allGroups.map((group) => (
                                <Link
                                    key={group.id}
                                    href={`/agent-dashboard/${group.id}`}
                                    className={`p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                                        group.id === selectedGroup.id
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                            group.id === selectedGroup.id
                                                ? 'bg-slate-700 text-slate-200'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {group.id}
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                            group.status === 'booked'
                                                ? (group.id === selectedGroup.id ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700')
                                                : (group.id === selectedGroup.id ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700')
                                        }`}>
                                            {group.status === 'booked' ? 'Active' : 'Upcoming'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-xs truncate">{group.customerName}</h4>
                                    <p className={`text-[10px] mt-1 truncate ${
                                        group.id === selectedGroup.id ? 'text-slate-300' : 'text-slate-500'
                                    }`}>
                                        {group.destination}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold font-heading text-foreground">{groupDetails.name}</h1>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                                groupDetails.status === 'Active' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-amber-100 text-amber-700'
                            }`}>
                                {groupDetails.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Icon name="CalendarIcon" size={16} />
                                {groupDetails.dates}
                            </span>
                            <span className="flex items-center gap-1">
                                <Icon name="MapPinIcon" size={16} />
                                {groupDetails.destination}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg shadow-sm hover:bg-neutral-50 transition-colors font-medium text-sm">
                            <Icon name="ChatBubbleLeftRightIcon" size={18} />
                            Contact Lead
                        </button>
                        <Link href={`/agent-dashboard/${groupId}/itinerary`} className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg shadow-sm hover:bg-neutral-50 transition-colors font-medium text-sm">
                            <Icon name="ClockIcon" size={18} />
                            View Itinerary
                        </Link>
                        <Link href="/optimizer" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-md hover:bg-primary/90 transition-transform active:scale-95 font-bold text-sm">
                            <Icon name="AdjustmentsHorizontalIcon" size={18} />
                            Optimize Itinerary
                        </Link>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Stats & Families */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Stats Cards (Neuromorphic-ish) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-white rounded-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.05),-4px_-4px_10px_rgba(255,255,255,0.8)] border border-white/50">
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Travelers</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-foreground">{groupDetails.totalTravelers}</span>
                                    <Icon name="UserGroupIcon" className="w-6 h-6 text-primary mb-1" />
                                </div>
                            </div>
                            <div className="p-5 bg-white rounded-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.05),-4px_-4px_10px_rgba(255,255,255,0.8)] border border-white/50">
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Satisfaction</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-emerald-600">{groupDetails.satisfactionScore}%</span>
                                    <Icon name="FaceSmileIcon" className="w-6 h-6 text-emerald-500 mb-1" />
                                </div>
                            </div>
                        </div>

                        {/* Families List */}
                        {groupDetails.families.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-neutral-100 overflow-hidden">
                                <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                                    <h3 className="font-bold text-lg">Families ({groupDetails.families.length})</h3>
                                    <span className="text-xs text-muted-foreground">{groupDetails.totalTravelers} total members</span>
                                </div>
                                <div className="divide-y divide-neutral-50 max-h-[500px] overflow-y-auto">
                                    {groupDetails.families.map((family: any) => (
                                        <div key={family.id} className="transition-colors">
                                            <div 
                                                className="p-4 hover:bg-neutral-50 cursor-pointer group"
                                                onClick={() => toggleFamily(family.id)}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <Icon 
                                                            name={expandedFamilyId === family.id ? "ChevronDownIcon" : "ChevronRightIcon"} 
                                                            size={16} 
                                                            className="text-muted-foreground"
                                                        />
                                                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                            {family.family_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                        {family.members.length} members
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Expanded Member Details */}
                                            {expandedFamilyId === family.id && (
                                                <div className="bg-slate-50 px-4 pb-4">
                                                    <div className="space-y-2">
                                                        {family.members.map((member: any) => (
                                                            <div 
                                                                key={member.id} 
                                                                className="bg-white rounded-lg p-3 border border-slate-200 hover:border-primary/30 transition-colors"
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h4 className="font-semibold text-sm text-foreground">{member.name}</h4>
                                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                                                                member.role === 'Head' 
                                                                                    ? 'bg-indigo-100 text-indigo-700' 
                                                                                    : member.role === 'Child'
                                                                                    ? 'bg-amber-100 text-amber-700'
                                                                                    : 'bg-slate-100 text-slate-600'
                                                                            }`}>
                                                                                {member.role}
                                                                            </span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                                            <div className="flex items-center gap-1">
                                                                                <Icon name="IdentificationIcon" size={12} />
                                                                                <span>{member.id}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <Icon name="CakeIcon" size={12} />
                                                                                <span>{member.age} years</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <Icon name="UserIcon" size={12} />
                                                                                <span>{member.gender}</span>
                                                                            </div>
                                                                            {member.passport_number && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <Icon name="DocumentTextIcon" size={12} />
                                                                                    <span className="font-mono">{member.passport_number}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Insights / Constraints */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Icon name="SparklesIcon" className="text-indigo-600 w-5 h-5" />
                                <h3 className="font-bold text-indigo-900">AI Insights</h3>
                            </div>
                            <p className="text-sm text-indigo-800 leading-relaxed">
                                The optimization model suggests reordering Day 3 activities to reduce travel time by <strong>15%</strong>. Weather forecast for outdoor events is favorable.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Map & Itinerary Preview */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Map View */}
                        <div className="bg-white rounded-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-neutral-100 overflow-hidden h-[400px] relative z-0">
                            <Map
                                center={[groupDetails.coordinates.lat, groupDetails.coordinates.lng]}
                                zoom={12}
                                className="h-full w-full"
                            >
                                <MapTileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution="&copy; OpenStreetMap contributors"
                                />
                                <MapMarker
                                    position={[groupDetails.coordinates.lat, groupDetails.coordinates.lng]}
                                >
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-neutral-100">
                                        <p className="font-bold text-xs text-foreground">{groupDetails.destination}</p>
                                    </div>
                                </MapMarker>
                            </Map>
                        </div>

                        {/* Next Destinations */}
                        <div className="bg-white rounded-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-neutral-100 p-6">
                            <h3 className="font-bold text-lg mb-4">Upcoming Schedule</h3>
                            <div className="space-y-4">
                                {groupDetails.nextDestinations.map((dest, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-100">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm flex-col leading-none">
                                            <span className="text-[10px] uppercase opacity-70 mb-0.5">{dest.date.split(' ')[0]}</span>
                                            <span>{dest.date.split(' ')[1]}</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-foreground">{dest.name}</h4>
                                            <p className="text-sm text-muted-foreground">{dest.time}</p>
                                        </div>
                                        <button className="p-2 text-neutral-400 hover:text-primary transition-colors">
                                            <Icon name="ChevronRightIcon" size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </main>
        </div>
    );
}
