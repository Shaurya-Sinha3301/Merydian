'use client';

import { useEffect, useState, useCallback, RefObject } from 'react';

interface UseCanvasVideoReturn {
  drawFrame: (frameIndex: number) => void;
  isLoading: boolean;
  progress: number;
}

export function useCanvasVideo(
  canvasRef: RefObject<HTMLCanvasElement>
): UseCanvasVideoReturn {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const frameCount = 278;

  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    const currentFrame = (index: number) => {
      const paddedIndex = String(index).padStart(4, '0');
      return `/landing-frames/frame_${paddedIndex}.jpg`;
    };

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      img.onload = () => {
        loadedCount++;
        setProgress(Math.round((loadedCount / frameCount) * 100));
        if (loadedCount === frameCount) {
          setImages(loadedImages);
          setIsLoading(false);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load frame ${i}`);
        loadedCount++;
        setProgress(Math.round((loadedCount / frameCount) * 100));
        if (loadedCount === frameCount) {
          setImages(loadedImages);
          setIsLoading(false);
        }
      };
      loadedImages.push(img);
    }
  }, []);

  const drawFrame = useCallback(
    (frameIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas || images.length === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const index = Math.min(Math.max(0, Math.floor(frameIndex)), images.length - 1);
      const img = images[index];

      if (!img || !img.complete) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const canvasAspect = canvas.width / canvas.height;
      const imgAspect = img.width / img.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (canvasAspect > imgAspect) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    },
    [images, canvasRef]
  );

  return { drawFrame, isLoading, progress };
}
