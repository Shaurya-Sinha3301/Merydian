import React from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';

export default function AnalyticsPage() {
    return (
        <div className="flex bg-background h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                <NavigationBreadcrumbs />
                <div className="max-w-7xl mx-auto space-y-6">
                    <h1 className="text-3xl font-bold font-heading text-neutral-900">
                        Data Analytics & Revenue
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-100">
                            <h3 className="text-sm font-semibold text-neutral-500 mb-2">Total Revenue</h3>
                            <p className="text-3xl font-bold text-emerald-600">$0.00</p>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-100">
                            <h3 className="text-sm font-semibold text-neutral-500 mb-2">Active Trips</h3>
                            <p className="text-3xl font-bold text-indigo-600">0</p>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-100">
                            <h3 className="text-sm font-semibold text-neutral-500 mb-2">Pending Requests</h3>
                            <p className="text-3xl font-bold text-amber-600">0</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
