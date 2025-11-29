
import React, { useRef, useEffect, useState } from 'react';
import { MouthData, Viseme } from '../types';

interface LipsyncPreviewProps {
  imageBase64: string;
  audioBase64: string;
  visemes: Viseme[];
  mouthData: MouthData;
}

export const LipsyncPreview: React.FC<LipsyncPreviewProps> = ({ imageBase64, audioBase64, visemes, mouthData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${imageBase64}`;
    img.onload = () => {
      imageRef.current = img;
      drawFrame(0); // Draw initial static frame
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBase64]);

  const drawFrame = (currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // 1. Draw Character
    // Maintain aspect ratio fit
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // 2. Find current viseme
    const currentViseme = visemes.find(v => currentTime >= v.start_time && currentTime <= v.end_time);
    
    // 3. Draw Mouth Overlay
    // Map image coordinates to canvas coordinates
    const mouthX = x + (mouthData.mouth_center.x * scale);
    const mouthY = y + (mouthData.mouth_center.y * scale);
    const mouthW = mouthData.mouth_width_pixels * scale;
    const mouthH = mouthData.mouth_height_pixels * scale;

    // Calculate openness (default slightly closed if silence)
    const baseOpenness = 0.1;
    const targetOpenness = currentViseme ? currentViseme.openness * mouthData.max_open : baseOpenness;
    
    // Simple Mouth Animation: Dark ellipse that expands vertically
    const currentHeight = mouthH * targetOpenness;

    ctx.fillStyle = "#1a0b0b"; // Dark mouth interior
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY, mouthW / 2, currentHeight / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Optional: Add a small lip color outline
    ctx.strokeStyle = "#d48d8d";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const animate = () => {
    if (audioRef.current) {
      drawFrame(audioRef.current.currentTime);
      if (!audioRef.current.paused) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        drawFrame(0); // Reset
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        cancelAnimationFrame(animationFrameRef.current);
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        animate();
      }
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black border border-gray-800 shadow-2xl">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={600} 
        className="w-full h-auto block"
      />
      
      <audio 
        ref={audioRef} 
        src={`data:audio/mp3;base64,${audioBase64}`} 
        onEnded={() => setIsPlaying(false)}
      />

      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <button 
          onClick={togglePlay}
          className="bg-neon-blue hover:bg-neon-purple text-white font-bold py-2 px-6 rounded-full shadow-lg shadow-neon-blue/30 transition-all flex items-center space-x-2"
        >
          {isPlaying ? (
             <>
               <span className="w-3 h-3 bg-white rounded-sm animate-pulse"></span>
               <span>Pause Animation</span>
             </>
          ) : (
             <>
               <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
               <span>Play Animation</span>
             </>
          )}
        </button>
      </div>
    </div>
  );
};
