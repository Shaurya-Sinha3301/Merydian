'use client';

import { AlertCircle, Info, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';

interface Alert {
    id: string;
    type: 'info' | 'warning' | 'success';
    title: string;
    message: string;
    time: string;
}

export default function AlertsWidget() {
    const [alerts, setAlerts] = useState<Alert[]>([
        {
            id: '1',
            type: 'success',
            title: 'Itinerary Updated',
            message: 'Your Paris trip itinerary has been optimized',
            time: '5 min ago',
        },
        {
            id: '2',
            type: 'info',
            title: 'Agent Message',
            message: 'Maria sent you a new message about hotel options',
            time: '2 hours ago',
        },
        {
            id: '3',
            type: 'warning',
            title: 'Payment Reminder',
            message: 'Final payment due in 7 days for Tokyo trip',
            time: '1 day ago',
        },
    ]);

    const dismissAlert = (id: string) => {
        setAlerts(alerts.filter(alert => alert.id !== id));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'warning':
                return <AlertCircle className="w-4 h-4 text-orange-600" />;
            default:
                return <Info className="w-4 h-4 text-blue-600" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'warning':
                return 'bg-orange-50 border-orange-200';
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Alerts & Notifications</h3>
                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                    {alerts.length}
                </span>
            </div>

            <div className="space-y-3">
                {alerts.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-500">
                        No new alerts
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-3 rounded-lg border ${getBgColor(alert.type)} relative group`}
                        >
                            <button
                                onClick={() => dismissAlert(alert.id)}
                                className="absolute top-2 right-2 p-1 hover:bg-white/50 rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-3 h-3 text-gray-600" />
                            </button>

                            <div className="flex gap-2">
                                <div className="mt-0.5">{getIcon(alert.type)}</div>
                                <div className="flex-1">
                                    <div className="font-semibold text-sm text-gray-900 mb-0.5">{alert.title}</div>
                                    <div className="text-xs text-gray-600 mb-1">{alert.message}</div>
                                    <div className="text-xs text-gray-500">{alert.time}</div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
