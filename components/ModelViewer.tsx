import React from 'react';

interface ModelViewerProps {
  modelUrl: string;
  renderedImageUrl?: string;
  onDownload: () => void;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({ modelUrl, renderedImageUrl, onDownload }) => {
  return (
    <div className="flex flex-col h-full">
      {/* 3D Preview Area */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-xl overflow-hidden border border-gray-800">
        {renderedImageUrl ? (
          <img 
            src={renderedImageUrl} 
            alt="3D Model Preview" 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 relative">
                {/* 3D Cube Icon */}
                <svg className="w-full h-full text-neon-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                  <path d="M12 22V12" />
                  <path d="M2 7v10" />
                  <path d="M22 7v10" />
                </svg>
                <div className="absolute inset-0 bg-neon-purple/20 rounded-full blur-xl animate-pulse"></div>
              </div>
              <p className="text-gray-400 text-sm">3D Model Ready</p>
              <p className="text-gray-600 text-xs mt-1">Download to view in your 3D software</p>
            </div>
          </div>
        )}
        
        {/* Overlay Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
          <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-gray-700">
            Format: GLB (PBR Textured)
          </div>
          <button
            onClick={onDownload}
            className="bg-gradient-to-r from-neon-purple to-pink-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50 transition-all flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download 3D Model</span>
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Format</p>
          <p className="text-sm font-bold text-white">GLB</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Textures</p>
          <p className="text-sm font-bold text-neon-blue">PBR</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <p className="text-sm font-bold text-green-400">Ready</p>
        </div>
      </div>
    </div>
  );
};
