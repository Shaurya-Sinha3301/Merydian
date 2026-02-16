'use client';

export default function FamilyMembers() {
    const members = [
        { name: "Matt Smith", role: "Organizer", age: "35" },
        { name: "Sarah Smith", role: "Adult", age: "33" },
        { name: "Emma Smith", role: "Child", age: "8" },
        { name: "Lucas Smith", role: "Child", age: "5" },
    ];

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Family Members</h3>
                <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Edit</button>
            </div>

            <div className="space-y-4">
                {members.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                                {member.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 leading-tight">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.role} • {member.age} years</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
