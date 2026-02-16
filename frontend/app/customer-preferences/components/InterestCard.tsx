'use client';

import { useState } from 'react';

interface InterestCardProps {
    icon: string;
    title: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
}

export default function InterestCard({ icon, title, description, value, onChange }: InterestCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate background intensity based on interest level
    const getBackgroundOpacity = (val: number) => {
        return Math.max(0.02, val * 0.08);
    };

    return (
        <div
            className={`
        bg-background rounded-2xl p-6 
        transition-all duration-300 ease-out
        ${isHovered ? 'neu-raised scale-[1.02]' : 'neu-flat'}
        border border-gray-200
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Icon and Title */}
            <div className="flex items-start gap-4 mb-4">
                <div
                    className={`
            text-4xl w-14 h-14 flex items-center justify-center rounded-xl
            transition-all duration-300
            ${value > 0.6 ? 'neu-pressed' : 'bg-white shadow-inner'}
          `}
                    style={{
                        backgroundColor: value > 0.6 ? '#E5E7EB' : '#FFFFFF',
                        boxShadow: value > 0.6
                            ? 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)'
                            : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    {icon}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
                    <p className="text-sm text-gray-600 leading-snug">{description}</p>
                </div>
            </div>

            {/* Slider */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Interest Level</span>
                    <span
                        className={`
              text-lg font-bold px-3 py-1 rounded-lg
              ${value < 0.3 ? 'bg-gray-100 text-gray-600' :
                                value < 0.6 ? 'bg-gray-200 text-gray-800' :
                                    'bg-gray-900 text-white'}
              transition-all duration-300
            `}
                    >
                        {Math.round(value * 100)}%
                    </span>
                </div>

                {/* Custom Neumorphic Slider */}
                <div className="relative pt-1">
                    <div className="bg-gray-200 rounded-lg h-2 shadow-inner overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-gray-700 to-gray-900 h-2 transition-all duration-300 shadow-sm"
                            style={{ width: `${value * 100}%` }}
                        />
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={value * 100}
                        onChange={(e) => onChange(Number(e.target.value) / 100)}
                        onMouseDown={() => setIsDragging(true)}
                        onMouseUp={() => setIsDragging(false)}
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-10"
                    />

                    {/* Custom Thumb */}
                    <div
                        className={`
              absolute top-1/2 -translate-y-1/2 pointer-events-none
              w-5 h-5 rounded-full 
              bg-white border-2 border-gray-900
              transition-all duration-200
              ${isDragging || isHovered ? 'scale-125 shadow-lg' : 'shadow-md'}
            `}
                        style={{
                            left: `calc(${value * 100}% - 10px)`,
                        }}
                    />
                </div>

                {/* Visual Indicator */}
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Not Interested</span>
                    <span>Very Interested</span>
                </div>
            </div>
        </div>
    );
}
