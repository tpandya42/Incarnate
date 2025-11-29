import React from 'react';

interface LoadingOverlayProps {
  message: string;
  subMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, subMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-6 animate-pulse">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-neon-blue/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-neon-blue rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-neon-purple/20 rounded-full blur-md"></div>
      </div>
      <div className="text-center">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
          {message}
        </h3>
        {subMessage && (
          <p className="mt-2 text-gray-400 text-sm max-w-md mx-auto">{subMessage}</p>
        )}
      </div>
    </div>
  );
};
