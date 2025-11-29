import React, { useState, useEffect, useRef } from 'react';
import { 
  optimizePrompt, 
  generateAvatarImage, 
  generateAvatarVideo, 
  critiqueGeneratedImage,
  refinePrompt,
  GeneratedImage 
} from './services/geminiService';
import { generate3DModel } from './services/tripoService';

// Types
interface GenerationLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

type GenerationPhase = 'idle' | 'generating-image' | 'generating-video' | 'generating-3d' | 'complete' | 'error';

const App: React.FC = () => {
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('Cyberpunk anime, neon lights, futuristic');
  const [referenceImage, setReferenceImage] = useState<string>('');
  const [includeVideo, setIncludeVideo] = useState(false); // Video is optional to save credits
  
  // Generation State
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Output State
  const [avatarImage, setAvatarImage] = useState<GeneratedImage | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [model3DUrl, setModel3DUrl] = useState<string | null>(null);
  const [model3DPreview, setModel3DPreview] = useState<string | null>(null);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: GenerationLog['type'] = 'info') => {
    setLogs(prev => [...prev, { 
      timestamp: new Date().toLocaleTimeString(), 
      message, 
      type 
    }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setReferenceImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAll = async () => {
    if (!name.trim() || !description.trim()) {
      setError('Please enter a name and description');
      return;
    }

    setError(null);
    setLogs([]);
    setPhase('generating-image');
    setProgress(0);
    setAvatarImage(null);
    setVideoUrl(null);
    setModel3DUrl(null);

    try {
      // Phase 1: Generate Avatar Image
      addLog('🎨 Starting avatar generation...', 'info');
      setProgress(5);
      
      addLog('📝 Optimizing prompt with AI...', 'info');
      const optimizedPrompt = await optimizePrompt(
        name, description, style, 
        'Standing in a futuristic environment',
        'STUDIO',
        referenceImage || undefined
      );
      setProgress(15);
      addLog('✅ Prompt optimized', 'success');

      addLog('🖼️ Generating avatar image...', 'info');
      const image = await generateAvatarImage(optimizedPrompt, referenceImage || undefined);
      setAvatarImage(image);
      setProgress(includeVideo ? 30 : 40);
      addLog('✅ Avatar image generated!', 'success');

      // Phase 2: Generate Video (Optional - only if checkbox is checked)
      if (includeVideo) {
        setPhase('generating-video');
        addLog('🎬 Initializing video generation...', 'info');
        
        try {
          const videoUri = await generateAvatarVideo(image, name, 'STUDIO', '');
          addLog('📥 Downloading video...', 'info');
          
          const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
            addLog('✅ Video generated!', 'success');
          } else {
            addLog('⚠️ Video download failed, continuing...', 'warning');
          }
        } catch (videoErr: any) {
          addLog(`⚠️ Video generation skipped: ${videoErr.message}`, 'warning');
        }
        setProgress(60);
      } else {
        addLog('⏭️ Video generation skipped (not selected)', 'info');
        setProgress(40);
      }

      // Phase 3: Generate 3D Model
      const baseProgress = includeVideo ? 60 : 40;
      setPhase('generating-3d');
      addLog('🧊 Starting 3D model generation...', 'info');
      addLog('🔄 Uploading avatar to Tripo3D...', 'info');
      try {
        console.log('[3D Debug] Starting with image mimeType:', image.mimeType, 'data length:', image.data.length);
        const result = await generate3DModel(
          image.data,
          image.mimeType,
          (msg, prog) => {
            addLog(msg, 'info');
            setProgress(baseProgress + (prog * (100 - baseProgress) / 100));
          }
        );
        console.log('[3D Debug] Result:', result);
        setModel3DUrl(result.modelUrl);
        if (result.modelBase64) {
          setModel3DBase64(result.modelBase64);
        }
        if (result.renderedImageUrl) {
          setModel3DPreview(result.renderedImageUrl);
        }
        addLog('✅ 3D model generated!', 'success');
      } catch (err3D: any) {
        console.error('[3D Debug] Error:', err3D);
        addLog(`❌ 3D generation failed: ${err3D.message}`, 'error');
      }

      setProgress(100);
      setPhase('complete');
      addLog('🎉 All assets ready!', 'success');

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setPhase('error');
      addLog(`❌ Error: ${err.message}`, 'error');
    }
  };

  // Store the model base64 for reliable downloads
  const [model3DBase64, setModel3DBase64] = useState<string | null>(null);

  const download3DModel = () => {
    if (!model3DBase64 && !model3DUrl) return;
    try {
      const a = document.createElement('a');
      // Use base64 data URL if available, otherwise use blob URL
      a.href = model3DBase64 || model3DUrl!;
      a.download = `${name || 'avatar'}-3d-model.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed:', e);
      addLog('Download failed - try right-click and save', 'error');
    }
  };

  const reset = () => {
    setPhase('idle');
    setProgress(0);
    setLogs([]);
    setError(null);
    setAvatarImage(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setModel3DUrl(null);
    setModel3DPreview(null);
    setModel3DBase64(null);
  };

  const isGenerating = phase !== 'idle' && phase !== 'complete' && phase !== 'error';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[128px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[128px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Incarnate
              </h1>
              <p className="text-xs text-gray-500">AI Avatar & 3D Model Generator</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Gemini 3</span>
            <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Veo 3.1</span>
            <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Tripo3D</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Panel - Input */}
          <div className="space-y-6">
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full"></span>
                Create Your Avatar
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Character Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isGenerating}
                    placeholder="e.g., Nova, Cipher, Atlas..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Describe your character's appearance, personality, outfit..."
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-all resize-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Art Style</label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    disabled={isGenerating}
                    placeholder="e.g., Cyberpunk, Fantasy, Anime..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Reference Image (Optional)</label>
                  <div 
                    onClick={() => !isGenerating && fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                      disabled={isGenerating}
                    />
                    {referenceImage ? (
                      <div className="flex items-center justify-center gap-3">
                        <img src={`data:image/jpeg;base64,${referenceImage}`} alt="Reference" className="w-16 h-16 rounded-lg object-cover" />
                        <span className="text-sm text-green-400">Reference uploaded</span>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Drop an image or click to upload</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Generation Toggle */}
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                  <input
                    type="checkbox"
                    id="includeVideo"
                    checked={includeVideo}
                    onChange={(e) => setIncludeVideo(e.target.checked)}
                    disabled={isGenerating}
                    className="w-5 h-5 rounded border-gray-600 bg-black/40 text-purple-500 focus:ring-purple-500/25 focus:ring-offset-0"
                  />
                  <label htmlFor="includeVideo" className="flex-1 cursor-pointer">
                    <span className="text-sm text-gray-300">Include 360° Video</span>
                    <p className="text-xs text-gray-500 mt-0.5">Uses additional API credits • Adds ~1 min to generation</p>
                  </label>
                  <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    Optional
                  </span>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={phase === 'complete' || phase === 'error' ? reset : generateAll}
                  disabled={isGenerating}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                    isGenerating 
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : phase === 'complete' || phase === 'error'
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                      : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]'
                  }`}
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </span>
                  ) : phase === 'complete' || phase === 'error' ? (
                    'Start New Generation'
                  ) : includeVideo ? (
                    'Generate Avatar + Video + 3D Model'
                  ) : (
                    'Generate Avatar + 3D Model'
                  )}
                </button>
              </div>
            </div>

            {/* Progress & Logs */}
            {(isGenerating || logs.length > 0) && (
              <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
                {/* Progress Bar */}
                {isGenerating && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>{phase.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Logs */}
                <div className="h-48 overflow-y-auto space-y-1 font-mono text-xs">
                  {logs.map((log, i) => (
                    <div key={i} className={`flex gap-2 ${
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'warning' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      <span className="text-gray-600">[{log.timestamp}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Output */}
          <div className="space-y-6">
            {/* Main Preview */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
              <div className="aspect-square relative bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                {avatarImage ? (
                  <img 
                    src={`data:${avatarImage.mimeType};base64,${avatarImage.data}`}
                    alt="Generated Avatar"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-600">
                    <svg className="w-20 h-20 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                    <p className="text-sm">Your avatar will appear here</p>
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm text-gray-300">{phase.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())}...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Output Grid - Unified sizes */}
            {(videoUrl || model3DUrl) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Video Card */}
                {videoUrl && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                    <div className="aspect-square bg-black flex items-center justify-center">
                      <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                    </div>
                    <div className="p-3 flex items-center justify-between border-t border-white/5">
                      <span className="text-xs text-gray-400">360° Video</span>
                      <a href={videoUrl} download={`${name}-video.mp4`} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                        ↓ Download
                      </a>
                    </div>
                  </div>
                )}

                {/* 3D Model Card */}
                {model3DUrl && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                    <div className="aspect-square bg-gradient-to-br from-purple-900/20 to-black flex items-center justify-center">
                      {model3DPreview ? (
                        <img src={model3DPreview} alt="3D Preview" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center">
                          <svg className="w-16 h-16 text-purple-500/50 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                          </svg>
                          <p className="text-xs text-gray-500">3D Model Ready</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between border-t border-white/5">
                      <span className="text-xs text-gray-400">3D Model (GLB)</span>
                      <button onClick={download3DModel} className="text-xs text-purple-400 hover:text-purple-300 font-medium">
                        ↓ Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-gray-600">
          Powered by Gemini 3 Pro • Veo 3.1 • Tripo3D
        </div>
      </footer>
    </div>
  );
};

export default App;
