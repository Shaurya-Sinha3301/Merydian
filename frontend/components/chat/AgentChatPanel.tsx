'use client';

import { useState, useRef, useEffect } from 'react';
import { itineraryService, AgentFeedbackResponse } from '@/services/itinerary.service';
import Icon from '@/components/ui/AppIcon';

interface Message {
    id: string;
    type: 'user' | 'agent';
    content: string;
    timestamp: Date;
    metadata?: {
        event_type?: string;
        itinerary_updated?: boolean;
        cost_analysis?: AgentFeedbackResponse['cost_analysis'];
    };
}

interface AgentChatPanelProps {
    tripId?: string;
}

export default function AgentChatPanel({ tripId = 'default_trip' }: AgentChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        setMessages([
            {
                id: '0',
                type: 'agent',
                content: 'Hi! I\'m your AI travel assistant. You can ask me to modify your itinerary, add or remove locations, and I\'ll optimize your trip accordingly.',
                timestamp: new Date(),
            },
        ]);
    }, []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const userInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const response = await itineraryService.submitFeedback(userInput, tripId);

            const agentMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'agent',
                content: response.explanations.join('\n\n'),
                timestamp: new Date(),
                metadata: {
                    event_type: response.event_type,
                    itinerary_updated: response.itinerary_updated,
                    cost_analysis: response.cost_analysis,
                },
            };

            setMessages((prev) => [...prev, agentMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'agent',
                content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCostDelta = (delta: number) => {
        const formatted = `₹${Math.abs(delta).toFixed(2)}`;
        return delta > 0 ? `+${formatted}` : `-${formatted}`;
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center space-x-3 p-4 border-b border-border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon name="ChatBubbleLeftRightIcon" size={20} variant="solid" className="text-primary" />
                </div>
                <div>
                    <h2 className="font-semibold text-foreground">AI Travel Assistant</h2>
                    <p className="text-xs text-muted-foreground">Ask me to modify your itinerary</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${message.type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card border border-border'
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                            {/* Itinerary Update Badge */}
                            {message.metadata?.itinerary_updated && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                    <p className="text-xs flex items-center gap-1.5 text-success">
                                        <Icon name="CheckCircleIcon" size={14} variant="solid" />
                                        <span className="font-medium">Itinerary updated</span>
                                    </p>
                                </div>
                            )}

                            {/* Cost Analysis */}
                            {message.metadata?.cost_analysis && message.metadata.cost_analysis.changes.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Cost Impact:</p>
                                    {message.metadata.cost_analysis.changes.slice(0, 3).map((change, idx) => (
                                        <div key={idx} className="text-xs flex items-center justify-between">
                                            <span className="text-muted-foreground">{change.poi_name}</span>
                                            <span
                                                className={`font-medium ${change.cost_delta > 0 ? 'text-destructive' : 'text-success'
                                                    }`}
                                            >
                                                {formatCostDelta(change.cost_delta)}
                                            </span>
                                        </div>
                                    ))}
                                    {message.metadata.cost_analysis.total_cost_change !== 0 && (
                                        <div className="text-xs flex items-center justify-between pt-1 border-t border-border/30">
                                            <span className="font-medium text-foreground">Total:</span>
                                            <span
                                                className={`font-semibold ${message.metadata.cost_analysis.total_cost_change > 0
                                                    ? 'text-destructive'
                                                    : 'text-success'
                                                    }`}
                                            >
                                                {formatCostDelta(message.metadata.cost_analysis.total_cost_change)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Timestamp */}
                            <p className="text-xs text-muted-foreground/70 mt-1">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="E.g., 'Add Red Fort to our trip'"
                        disabled={isLoading}
                        className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        <Icon name="PaperAirplaneIcon" size={18} variant="solid" />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Try: "Remove Lodhi Gardens", "Add Akshardham Temple", "Show me cheaper options"
                </p>
            </form>
        </div>
    );
}
