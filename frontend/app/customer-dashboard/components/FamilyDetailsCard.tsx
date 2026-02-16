'use client';

import { Users, Edit } from 'lucide-react';

interface FamilyMember {
    id: string;
    name: string;
    role: 'Adult' | 'Child';
    age: number;
    avatar?: string;
}

export default function FamilyDetailsCard() {
    const familyMembers: FamilyMember[] = [
        { id: '1', name: 'Matt Smith', role: 'Adult', age: 35 },
        { id: '2', name: 'Sarah Smith', role: 'Adult', age: 33 },
        { id: '3', name: 'Emma Smith', role: 'Child', age: 8 },
        { id: '4', name: 'Lucas Smith', role: 'Child', age: 5 },
    ];

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-700" />
                    <h3 className="font-bold text-gray-900">Family Details</h3>
                </div>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            <div className="space-y-3">
                {familyMembers.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-gray-900' : index === 1 ? 'bg-gray-700' : 'bg-gray-500'
                            }`}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.role} • {member.age} years</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Members</span>
                    <span className="font-bold text-gray-900">{familyMembers.length}</span>
                </div>
            </div>
        </div>
    );
}
