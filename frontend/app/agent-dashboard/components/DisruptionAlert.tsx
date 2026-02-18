'use client';

import React from 'react';
import { AlertOctagon, RefreshCw, X } from 'lucide-react';

interface DisruptionAlertProps {
    onDismiss: () => void;
    onResolve: () => void;
}

const DisruptionAlert: React.FC<DisruptionAlertProps> = ({ onDismiss, onResolve }) => {
    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-destructive/10 border border-destructive/20 backdrop-blur-sm shadow-xl rounded-xl p-4 relative overflow-hidden">

                {/* Decorative background pulse */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-destructive/20 blur-xl rounded-full animate-pulse"></div>

                <div className="flex items-start gap-3">
                    <div className="bg-destructive/20 p-2 rounded-lg text-destructive">
                        <AlertOctagon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-foreground">Critical Alert: Hotel Overbooked</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            "Ocean Breeze Resort" has just flagged an overbooking for the dates 14-20 Nov.
                        </p>

                        <div className="mt-3 bg-background/50 rounded-lg p-3 border border-border">
                            <span className="text-xs font-semibold text-primary block mb-2">AI Suggestion:</span>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Upgrade to "Taj Holiday Village"</span>
                            </div>
                            <p className="text-xs text-green-600 mt-1 flex items-center">
                                Matched preferences • No cost to client
                            </p>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={onResolve}
                                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Auto-Book Replacement
                            </button>
                            <button
                                onClick={onDismiss}
                                className="px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm py-2 rounded-lg font-medium transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                    <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DisruptionAlert;
