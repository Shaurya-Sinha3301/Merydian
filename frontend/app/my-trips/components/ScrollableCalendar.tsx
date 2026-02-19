'use client';

export default function ScrollableCalendar() {
    const days = [
        {
            day: 1,
            date: "Mar 15",
            activities: [
                "Raj Ghat (Morning)",
                "Group Lunch (12:30 PM)",
                "Red Fort",
                "Safdarjung Tomb",
                "Group Dinner (7:30 PM)"
            ]
        },
        {
            day: 2,
            date: "Mar 16",
            activities: [
                "Humayun Tomb (Morning)",
                "Akshardham Temple",
                "Late Group Lunch (1:00 PM)",
                "Purana Qila",
                "Day 2 Dinner (7:30 PM)"
            ]
        },
        {
            day: 3,
            date: "Mar 17",
            activities: [
                "Farewell Lunch (1:00 PM)",
                "Parikrama (Scenic View)",
                "India Gate",
                "Farewell Dinner (7:30 PM)"
            ]
        },
    ];

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Itinerary Calendar</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {days.map((day) => (
                    <div key={day.day} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <div className="flex-shrink-0 w-16 text-center">
                            <span className="block text-xs font-bold text-gray-500 uppercase">Day</span>
                            <span className="block text-2xl font-black text-gray-900">{day.day}</span>
                            <span className="block text-xs font-medium text-gray-400">{day.date}</span>
                        </div>
                        <div className="flex-1 space-y-2 pt-1">
                            {day.activities.map((activity, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                    <span className="text-sm font-medium text-gray-700">{activity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
