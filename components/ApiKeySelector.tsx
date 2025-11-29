import React, { useState, useEffect } from 'react';

// Extend window interface for aistudio properties
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

interface ApiKeySelectorProps {
  onReady: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onReady }) => {
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkKey = async () => {
    // First check if we have an API key from environment (local development)
    if (process.env.API_KEY || process.env.GEMINI_API_KEY) {
      setHasKey(true);
      onReady();
      setChecking(false);
      return;
    }
    
    // Fall back to AI Studio's key selector (for hosted environment)
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
      if (selected) {
        onReady();
      }
    }
    setChecking(false);
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success after opening dialog (race condition mitigation)
        setHasKey(true);
        onReady();
      } catch (e) {
        console.error("Failed to select key", e);
        // If "Requested entity was not found", we might need to reset, but purely client-side we just let them try again.
        setHasKey(false);
      }
    }
  };

  if (checking) return null;

  if (!hasKey) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="bg-gray-850 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-white">API Key Required</h2>
          <p className="text-gray-300 mb-6">
            To generate high-quality 360&deg; videos with Veo, you must select a paid API key associated with a Google Cloud Project.
          </p>
          <div className="space-y-4">
            <button
              onClick={handleSelectKey}
              className="w-full py-3 px-6 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-neon-blue/20"
            >
              Select API Key
            </button>
            <div className="text-center text-xs text-gray-500">
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer"
                className="underline hover:text-white"
              >
                Learn about Billing & API Keys
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};