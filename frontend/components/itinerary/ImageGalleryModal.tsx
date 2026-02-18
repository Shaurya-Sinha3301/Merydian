'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Icon from '@/components/ui/AppIcon';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
}

export default function ImageGalleryModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title = 'Gallery',
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Don't render if not open or no valid images
  if (!isOpen || !images || images.length === 0) return null;

  // Filter out any empty or invalid image URLs
  const validImages = images.filter(img => img && img.trim() !== '');
  
  // If no valid images after filtering, don't render
  if (validImages.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center neu-modal-overlay"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="relative w-full max-w-6xl mx-4 h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="neu-card p-4 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">
              {currentIndex + 1} of {validImages.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="neu-button p-2 rounded-full hover:bg-gray-100"
          >
            <Icon name="XMarkIcon" className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Main Image */}
        <div className="flex-1 neu-card overflow-hidden relative">
          <Image
            src={validImages[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            fill
            className="object-contain"
            sizes="90vw"
            priority
          />

          {/* Navigation Buttons */}
          {validImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 neu-button p-4 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
              >
                <Icon name="ChevronLeftIcon" className="w-6 h-6 text-gray-900" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 neu-button p-4 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
              >
                <Icon name="ChevronRightIcon" className="w-6 h-6 text-gray-900" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {validImages.length > 1 && (
          <div className="neu-card p-4 mt-4">
            <div className="flex gap-2 overflow-x-auto">
              {validImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative w-20 h-20 shrink-0 rounded-lg overflow-hidden ${
                    index === currentIndex
                      ? 'ring-4 ring-blue-500'
                      : 'opacity-60 hover:opacity-100'
                  } transition-all`}
                >
                  <Image
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
