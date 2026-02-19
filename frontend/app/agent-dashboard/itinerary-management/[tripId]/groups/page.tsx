import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Trip Groups - Voyageur',
    description: 'Manage trip groups and member assignments.',
};

export default function TripGroupsPage() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50 text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center mb-4">
                <span className="text-3xl">👥</span>
            </div>
            <h2 className="text-xl font-bold text-slate-700">Groups Management</h2>
            <p className="text-slate-500 mt-2 max-w-sm">
                Split guests into subgroups, manage room assignments, and coordinate separate activities.
            </p>
            <span className="mt-6 px-4 py-2 rounded-full bg-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider">Coming Soon</span>
        </div>
    );
}
