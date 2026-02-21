'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export default function NeumorphicDemoPage() {
  const [inputValue, setInputValue] = useState('');
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Neumorphic Design System</h1>
          <p className="text-xl text-gray-600">Black & White Monochrome Soft UI</p>
        </div>

        {/* Buttons Section */}
        <section className="neu-card p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-3 font-semibold">Default Button</p>
              <button className="neu-button px-8 py-4 font-bold text-gray-900 w-full">
                Click Me
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-3 font-semibold">Button with Icon</p>
              <button className="neu-button px-8 py-4 font-bold text-gray-900 w-full flex items-center justify-center gap-2">
                <Icon name="SparklesIcon" className="w-5 h-5" />
                With Icon
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-3 font-semibold">Pressed State</p>
              <button 
                className={`px-8 py-4 font-bold text-gray-900 w-full ${isPressed ? 'neu-pressed' : 'neu-button'}`}
                onMouseDown={() => setIsPressed(true)}
                onMouseUp={() => setIsPressed(false)}
                onMouseLeave={() => setIsPressed(false)}
              >
                Press Me
              </button>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="neu-card p-6">
              <Icon name="HomeIcon" className="w-8 h-8 text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Raised Card</h3>
              <p className="text-gray-600">This card has a raised neumorphic effect with soft shadows.</p>
            </div>
            <div className="neu-card neu-card-hover p-6">
              <Icon name="SparklesIcon" className="w-8 h-8 text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Hover Card</h3>
              <p className="text-gray-600">Hover over this card to see the elevation effect.</p>
            </div>
            <div className="neu-flat p-6 rounded-2xl">
              <Icon name="CakeIcon" className="w-8 h-8 text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Flat Card</h3>
              <p className="text-gray-600">This card has a subtle flat neumorphic style.</p>
            </div>
          </div>
        </section>

        {/* Input Fields Section */}
        <section className="neu-card p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Input Fields</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Text Input</label>
              <input
                type="text"
                placeholder="Enter text..."
                className="neu-input w-full"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Input</label>
              <input
                type="email"
                placeholder="email@example.com"
                className="neu-input w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Textarea</label>
              <textarea
                placeholder="Enter your message..."
                className="neu-input w-full min-h-[120px] resize-none"
              />
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section className="neu-card p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <span className="neu-badge">Default</span>
            <span className="neu-badge">Active</span>
            <span className="neu-badge">Pending</span>
            <span className="neu-badge">Completed</span>
            <span className="neu-badge">Cancelled</span>
          </div>
        </section>

        {/* Icon Circles Section */}
        <section className="neu-card p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Icon Circles</h2>
          <div className="flex flex-wrap gap-6">
            <div className="neu-icon-circle w-16 h-16 text-blue-600">
              <Icon name="TruckIcon" className="w-8 h-8" />
            </div>
            <div className="neu-icon-circle w-16 h-16 text-purple-600">
              <Icon name="SparklesIcon" className="w-8 h-8" />
            </div>
            <div className="neu-icon-circle w-16 h-16 text-green-600">
              <Icon name="HomeIcon" className="w-8 h-8" />
            </div>
            <div className="neu-icon-circle w-16 h-16 text-orange-600">
              <Icon name="CakeIcon" className="w-8 h-8" />
            </div>
            <div className="neu-icon-circle w-16 h-16 text-red-600">
              <Icon name="HeartIcon" className="w-8 h-8" />
            </div>
          </div>
        </section>

        {/* Stats Cards Section */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Stats Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="neu-pressed p-6 rounded-2xl text-center">
              <Icon name="UserGroupIcon" className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-gray-900 mb-1">1,234</p>
              <p className="text-sm text-gray-600 uppercase font-semibold">Total Users</p>
            </div>
            <div className="neu-pressed p-6 rounded-2xl text-center">
              <Icon name="ChartBarIcon" className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-gray-900 mb-1">89%</p>
              <p className="text-sm text-gray-600 uppercase font-semibold">Growth</p>
            </div>
            <div className="neu-pressed p-6 rounded-2xl text-center">
              <Icon name="ClockIcon" className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-gray-900 mb-1">24/7</p>
              <p className="text-sm text-gray-600 uppercase font-semibold">Support</p>
            </div>
            <div className="neu-pressed p-6 rounded-2xl text-center">
              <Icon name="StarIcon" className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-gray-900 mb-1">4.9</p>
              <p className="text-sm text-gray-600 uppercase font-semibold">Rating</p>
            </div>
          </div>
        </section>

        {/* Timeline Demo Section */}
        <section className="neu-card p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Timeline Example</h2>
          <div className="space-y-0">
            {[
              { icon: 'TruckIcon', title: 'Transport', time: '09:00 AM', color: 'text-blue-600' },
              { icon: 'SparklesIcon', title: 'Activity', time: '11:30 AM', color: 'text-purple-600' },
              { icon: 'CakeIcon', title: 'Lunch', time: '01:00 PM', color: 'text-orange-600' },
              { icon: 'HomeIcon', title: 'Check-in', time: '03:00 PM', color: 'text-green-600' },
            ].map((item, index, arr) => (
              <div key={index} className="flex gap-4 relative">
                <div className="flex flex-col items-center">
                  <div className={`neu-icon-circle w-12 h-12 shrink-0 ${item.color}`}>
                    <Icon name={item.icon as any} className="w-6 h-6" />
                  </div>
                  {index < arr.length - 1 && <div className="neu-timeline-line flex-1 mt-2 min-h-[60px]" />}
                </div>
                <div className="flex-1 pb-8">
                  <div className="neu-card p-4">
                    <div className="neu-badge mb-2">{item.time}</div>
                    <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">Sample timeline event description</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Color Palette Section */}
        <section className="neu-card p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#E0E5EC' }}></div>
              <p className="text-sm font-mono text-gray-700">#E0E5EC</p>
              <p className="text-xs text-gray-600">Base</p>
            </div>
            <div className="text-center">
              <div className="w-full h-24 bg-white rounded-lg mb-2 border border-gray-200"></div>
              <p className="text-sm font-mono text-gray-700">#FFFFFF</p>
              <p className="text-xs text-gray-600">Light</p>
            </div>
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#BEBEBE' }}></div>
              <p className="text-sm font-mono text-gray-700">#BEBEBE</p>
              <p className="text-xs text-gray-600">Shadow</p>
            </div>
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#1F1F1F' }}></div>
              <p className="text-sm font-mono text-white">#1F1F1F</p>
              <p className="text-xs text-gray-600">Text</p>
            </div>
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#6B7280' }}></div>
              <p className="text-sm font-mono text-white">#6B7280</p>
              <p className="text-xs text-gray-600">Muted</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-gray-600">
            Neumorphic Design System - Monochrome Black & White Theme
          </p>
        </div>
      </div>
    </div>
  );
}
