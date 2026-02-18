'use client';

import { MessageCircle, Phone, Mail, Clock, Star } from 'lucide-react';

export default function ContactAgent() {
    const agent = {
        name: 'Maria Jonas',
        rating: 4.8,
        responseTime: '< 2 hours',
        workingHours: '10 AM - 06 PM',
        phone: '+1 (0) 567-798',
        email: 'mariajonas@gmail.com',
        company: 'Real Estate LA',
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Your Travel Agent</h3>

            {/* Agent Profile */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    MJ
                </div>
                <div className="flex-1">
                    <div className="font-semibold text-gray-900">{agent.name}</div>
                    <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-gray-600">{agent.rating}</span>
                        <span className="text-xs text-gray-400 ml-1">• Verified</span>
                    </div>
                </div>
            </div>

            {/* Company & Hours */}
            <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Company</span>
                    <span className="text-gray-900 font-medium">{agent.company}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Response Time</span>
                    <span className="text-green-600 font-medium">{agent.responseTime}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">{agent.workingHours}</span>
                </div>
            </div>

            {/* Contact Buttons */}
            <div className="space-y-2">
                <button className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all">
                    <MessageCircle className="w-4 h-4" />
                    Message Agent
                </button>
                <div className="grid grid-cols-2 gap-2">
                    <button className="bg-gray-100 text-gray-900 rounded-lg px-3 py-2 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                        <Phone className="w-4 h-4" />
                        Call
                    </button>
                    <button className="bg-gray-100 text-gray-900 rounded-lg px-3 py-2 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                        <Mail className="w-4 h-4" />
                        Email
                    </button>
                </div>
            </div>
        </div>
    );
}
