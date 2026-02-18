'use client';

import { Send, Bot, User } from 'lucide-react';
import { useState } from 'react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export default function ChatBot() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hello! I\'m your AI travel assistant. How can I help you with your Paris trip?',
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');

    const handleSend = async () => {
        if (!inputText.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');

        try {
            // Import dynamically to avoid SSR issues
            const { apiClient } = await import('@/services/api');

            // Call Agent API
            const response = await apiClient.processAgentFeedback(userMessage.text);

            // Add bot response
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.action_taken ?
                    `${response.action_taken}\n\n${response.explanations.join('\n')}` :
                    "I've processed your request.",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);

        } catch (error) {
            console.error("Chat error:", error);

            // Determine error type and provide appropriate message
            let errorText = "Sorry, I encountered an error processing your request. Please try again.";

            if (error instanceof Error) {
                if (error.message.includes("No active trip")) {
                    errorText = "You don't have an active trip yet. Please initialize a trip first from the My Trips page.";
                } else if (error.message.includes("Session")) {
                    errorText = "I encountered a temporary issue. Please try your request again.";
                }
            }

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: errorText,
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">AI Travel Assistant</h3>
                    <p className="text-xs text-green-600">● Online</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.sender === 'bot' && (
                            <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-gray-600" />
                            </div>
                        )}

                        <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 ${message.sender === 'user'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-900'
                                }`}
                        >
                            <p className="text-sm">{message.text}</p>
                            <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-gray-300' : 'text-gray-500'
                                }`}>
                                {message.timestamp.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>

                        {message.sender === 'user' && (
                            <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <User className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about your trip..."
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <button
                        onClick={handleSend}
                        className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Ask me about attractions, restaurants, or activities in Paris!
                </p>
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
        </div>
    );
}
