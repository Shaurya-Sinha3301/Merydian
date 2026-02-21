'use client';

import { useState } from 'react';

interface Message {
  id: string;
  sender: 'customer' | 'agent';
  text: string;
  timestamp: string;
}

interface AgentChatModalProps {
  onClose: () => void;
}

const AgentChatModal = ({ onClose }: AgentChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'agent',
      text: 'Hello! I\'m your travel agent. How can I help you today?',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: `m${messages.length + 1}`,
      sender: 'customer',
      text: inputText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputText('');

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: `m${messages.length + 2}`,
        sender: 'agent',
        text: 'Thank you for your message. I\'ll get back to you shortly with more information.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, agentResponse]);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-[#212121]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FDFDFF] rounded-3xl max-w-2xl w-full h-[600px] shadow-[16px_16px_32px_rgba(0,0,0,0.2),-16px_-16px_32px_rgba(255,255,255,0.9)] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#212121]/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#212121] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#FDFDFF]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#212121]">Travel Agent</h3>
              <p className="text-xs text-[#212121]/60">Online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#EDEDED] hover:bg-[#E0E0E0] transition-all flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-[#212121]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] ${
                  message.sender === 'customer'
                    ? 'bg-[#212121] text-[#FDFDFF] shadow-[4px_4px_8px_rgba(0,0,0,0.2)]'
                    : 'bg-[#EDEDED] text-[#212121] shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)]'
                } rounded-2xl p-4`}
              >
                <p className="text-sm mb-1">{message.text}</p>
                <p className={`text-xs ${message.sender === 'customer' ? 'text-[#FDFDFF]/60' : 'text-[#212121]/40'}`}>
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-[#212121]/10">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-[#EDEDED] text-[#212121] rounded-xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] focus:outline-none placeholder:text-[#212121]/40"
            />
            <button
              onClick={handleSendMessage}
              className="w-12 h-12 bg-[#212121] text-[#FDFDFF] rounded-lg hover:bg-[#212121]/90 transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentChatModal;
