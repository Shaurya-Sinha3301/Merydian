'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';

export default function TripCalendar() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(2026, 2, 15)); // March 15, 2026

    // Trip dates for highlighting
    const tripDates = [
        new Date(2026, 2, 15),
        new Date(2026, 2, 16),
        new Date(2026, 2, 17),
        new Date(2026, 2, 18),
        new Date(2026, 2, 19),
        new Date(2026, 2, 20),
        new Date(2026, 2, 21),
        new Date(2026, 2, 22),
    ];

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-gray-900">Calendar</h3>
            </div>

            {/* Shadcn Calendar Component */}
            <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                    tripDays: tripDates,
                }}
                modifiersClassNames={{
                    tripDays: 'bg-gray-900 text-white hover:bg-gray-800 font-bold',
                }}
                className="rounded-lg"
            />

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-900 rounded-sm" />
                    <span className="text-gray-600">Trip Days</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 ring-2 ring-gray-900 rounded-sm" />
                    <span className="text-gray-600">Today</span>
                </div>
            </div>
        </div>
    );
}
