'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: 'customer' | 'agent';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

interface AgentChatModalProps {
  onClose: () => void;
}

const EnhancedAgentChatModal = ({ onClose }: AgentChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'agent',
      text: '👋 Hi! I\'m your AI travel assistant. I can help you with bookings, itinerary changes, or any questions about your trip!',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      suggestions: ['Reschedule my lunch', 'Find better hotel', 'Delay activities', 'Check weather']
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (text?: string) => {
    const messageText = text || inputText;
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: `m${messages.length + 1}`,
      sender: 'customer',
      text: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI thinking and response
    setTimeout(() => {
      setIsTyping(false);
      
      // Context-aware responses
      let responseText = '';
      let responseSuggestions: string[] = [];

      if (messageText.toLowerCase().includes('reschedule') || messageText.toLowerCase().includes('lunch')) {
        responseText = '🍽️ I can help you reschedule your lunch reservation. I see you have a booking at "Coastal Spice" at 1:00 PM. Would you like to move it to 2:00 PM or 3:00 PM?';
        responseSuggestions = ['Move to 2:00 PM', 'Move to 3:00 PM', 'Cancel reservation'];
      } else if (messageText.toLowerCase().includes('hotel') || messageText.toLowerCase().includes('accommodation')) {
        responseText = '🏨 I found 3 premium hotels near your current location with availability. Would you like to see options with better amenities or closer to your activities?';
        responseSuggestions = ['Show better amenities', 'Show closer options', 'Keep current hotel'];
      } else if (messageText.toLowerCase().includes('delay') || messageText.toLowerCase().includes('activities')) {
        responseText = '⏰ I can adjust your activity schedule. Which activities would you like to delay? I\'ll make sure everything still fits in your itinerary.';
        responseSuggestions = ['Delay beach visit', 'Delay museum tour', 'Delay all activities'];
      } else if (messageText.toLowerCase().includes('weather')) {
        responseText = '🌤️ The weather looks great! Sunny with temperatures around 28°C. Perfect for your beach activities. I\'ll send you an alert if anything changes.';
        responseSuggestions = ['View 7-day forecast', 'Set weather alerts', 'Suggest indoor alternatives'];
      } else {
        responseText = '✨ I\'m analyzing your request. I can help you modify bookings, adjust your itinerary, or provide recommendations. What would you like to do?';
        responseSuggestions = ['Modify booking', 'Change itinerary', 'Get recommendations', 'Report an issue'];
      }

      const agentResponse: Message = {
        id: `m${messages.length + 2}`,
        sender: 'agent',
        text: responseText,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        suggestions: responseSuggestions
      };
      setMessages((prev) => [...prev, agentResponse]);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[700px] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header with AI Glow */}
        <div className="relative bg-gradient-to-r from-teal-500 to-teal-600 p-6">
          {/* Animated Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-500 opacity-50 animate-pulse"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* AI Avatar with Animation */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-teal-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                </div>
                {/* Pulse Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-75"></div>
                {/* Online Indicator */}
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              
              <div className="text-white">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">AI Travel Assistant</h3>
                  {/* AI Badge */}
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    AI
                  </span>
                </div>
                <p className="text-sm text-white/90">Always here to help ✨</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex items-center justify-center text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-gray-50 to-teal-50/30">
          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] ${
                    message.sender === 'customer'
                      ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                      : 'bg-white text-gray-900 shadow-lg border border-gray-100'
                  } rounded-2xl p-4 animate-slide-in`}
                >
                  <p className="text-sm leading-relaxed mb-1">{message.text}</p>
                  <p className={`text-xs ${message.sender === 'customer' ? 'text-white/70' : 'text-gray-400'}`}>
                    {message.timestamp}
                  </p>
                </div>
              </div>
              
              {/* Smart Suggestion Chips */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 ml-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion)}
                      className="px-4 py-2 bg-white hover:bg-teal-50 text-gray-700 hover:text-teal-600 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md border border-gray-200 hover:border-teal-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-gray-100">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            <button
              onClick={() => handleSendMessage('What\'s my next activity?')}
              className="px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg text-xs font-medium hover:bg-teal-100 transition-all whitespace-nowrap"
            >
              📅 Next activity
            </button>
            <button
              onClick={() => handleSendMessage('Show my bookings')}
              className="px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg text-xs font-medium hover:bg-teal-100 transition-all whitespace-nowrap"
            >
              🎫 My bookings
            </button>
            <button
              onClick={() => handleSendMessage('Any updates?')}
              className="px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg text-xs font-medium hover:bg-teal-100 transition-all whitespace-nowrap"
            >
              🔔 Updates
            </button>
          </div>

          {/* Input Field */}
          <div className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about your trip..."
              className="flex-1 px-5 py-3 bg-gray-100 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-gray-400 transition-all"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center shadow-lg hover:shadow-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slide-in {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EnhancedAgentChatModal;
