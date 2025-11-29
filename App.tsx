
import React, { useState, useEffect, useRef } from 'react';
import { ApiKeySelector } from './components/ApiKeySelector';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ImageUpload } from './components/ImageUpload';
import { 
  optimizePrompt, 
  generateAvatarImage, 
  generateAvatarVideo, 
  critiqueGeneratedImage,
  refinePrompt,
  GeneratedImage 
} from './services/geminiService';
import { AppStep, AvatarFormData, GenerationLog, CritiqueResult } from './types';

const MAX_REFINEMENT_LOOPS = 3; // Step 5: "If quality plateaus or loops 3x"
const QUALITY_THRESHOLD = 85;

const App: React.FC = () => {
  const [isKeyReady, setIsKeyReady] = useState(false);
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [formData, setFormData] = useState<AvatarFormData>({
    name: '',
    description: '',
    style: 'Cyberpunk 2077, High Tech, Neon',
    scenario: 'Standing in a futuristic laboratory',
    userImage: '',
    backgroundMode: 'STUDIO'
  });
  
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [critique, setCritique] = useState<CritiqueResult | null>(null);
  const [loopCount, setLoopCount] = useState(0);
  const [userFeedback, setUserFeedback] = useState('');

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelected = (base64: string) => {
    setFormData(prev => ({ ...prev, userImage: base64 }));
  };

  // Helper to execute the core generation flow
  // Accepts an optional existing prompt/critique to resume the loop from Step 7
  const executeGenerationLoop = async (initialPrompt?: string, initialFeedback?: string) => {
    setError(null);
    setGeneratedVideoUrl(null);
    if (!initialPrompt) setLogs([]); // Clear logs if starting fresh
    setLoopCount(0);
    setCritique(null);

    try {
      let currentPrompt = initialPrompt || '';

      // STEP 2: Initial Generation
      if (!currentPrompt) {
        setStep(AppStep.OPTIMIZING_PROMPT);
        addLog(`Initializing Avatar Agent...`);
        addLog(`Analyzing ${formData.userImage ? 'multimodal ' : ''}input for ${formData.name}...`);
        
        currentPrompt = await optimizePrompt(
          formData.name, 
          formData.description, 
          formData.style, 
          formData.scenario,
          formData.backgroundMode,
          formData.userImage
        );
        
        setGeneratedPrompt(currentPrompt);
        addLog("Visual blueprint constructed.", 'success');
      } else if (initialFeedback) {
        // Step 7 Entry Point: We have a prompt but user gave feedback
        addLog(`Applying user feedback: "${initialFeedback}"`, 'warning');
        setStep(AppStep.REFINING);
        // Create a mock critique to pass format
        const mockCritique: CritiqueResult = { score: 0, feedback: "User Feedback Loop", suggestions: initialFeedback };
        currentPrompt = await refinePrompt(currentPrompt, mockCritique, initialFeedback);
        setGeneratedPrompt(currentPrompt);
      }

      setStep(AppStep.GENERATING_IMAGE);
      addLog("Generating Concept (V1)...");
      
      // Pass userImage to allow "exact similarity" conditioning
      let currentImage = await generateAvatarImage(currentPrompt, formData.userImage);
      setGeneratedImage(currentImage);
      addLog("Concept V1 generated.", 'info');

      // STEP 3: Critique Loop
      let loops = 0;
      let bestImage = currentImage;
      let bestScore = 0;
      let isSatisfied = false;

      while (loops < MAX_REFINEMENT_LOOPS && !isSatisfied) {
        setStep(AppStep.CRITIQUING);
        addLog(`Agent is critiquing concept (Cycle ${loops + 1})...`, 'warning');
        
        const critiqueResult: CritiqueResult = await critiqueGeneratedImage(formData.description, currentImage);
        setCritique(critiqueResult);
        addLog(`Quality Score: ${critiqueResult.score}/100`, critiqueResult.score > QUALITY_THRESHOLD ? 'success' : 'warning');
        addLog(`Critique: ${critiqueResult.feedback}`);

        // Track best
        if (critiqueResult.score > bestScore) {
          bestScore = critiqueResult.score;
          bestImage = currentImage;
        }

        // STEP 5: Validation
        if (critiqueResult.score >= QUALITY_THRESHOLD) {
          isSatisfied = true;
          addLog("Quality threshold met (>85%).", 'success');
        } else {
          // STEP 4: Improvement
          setStep(AppStep.REFINING);
          addLog("Refining prompt based on critique...", 'info');
          currentPrompt = await refinePrompt(currentPrompt, critiqueResult);
          setGeneratedPrompt(currentPrompt);
          
          setStep(AppStep.GENERATING_IMAGE);
          addLog(`Regenerating Concept (V${loops + 2})...`);
          const nextImage = await generateAvatarImage(currentPrompt, formData.userImage);
          
          // "Compares V2 vs V1" - implicitly done by tracking bestScore/bestImage
          // We display the new image immediately
          currentImage = nextImage;
          setGeneratedImage(currentImage);

          loops++;
          setLoopCount(loops);
        }
      }

      // Restore best image if the last one wasn't the best
      if (currentImage !== bestImage) {
        addLog("Restoring best performing version...", 'success');
        setGeneratedImage(bestImage);
        currentImage = bestImage;
      }

      if (!isSatisfied) {
        addLog("Max refinement loops reached.", 'warning');
        // "Present to user for approval"
        setStep(AppStep.AWAITING_APPROVAL);
        return; 
      }
      
      // STEP 6: Veo Video Generation
      await startVideoGeneration(currentImage);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
      setStep(AppStep.ERROR);
      addLog(`Error: ${err.message}`, 'error');
    }
  };

  const startVideoGeneration = async (image: GeneratedImage) => {
    try {
      setStep(AppStep.GENERATING_VIDEO);
      addLog("Initializing Veo 3.1 360-degree engine...");
      
      const videoUri = await generateAvatarVideo(image, formData.name, formData.backgroundMode, formData.scenario);
      addLog("Video generated. Fetching stream...");
      
      const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error("Video download failed");
      
      const blob = await response.blob();
      const videoObjectUrl = URL.createObjectURL(blob);
      
      setGeneratedVideoUrl(videoObjectUrl);
      addLog("Final asset ready.", 'success');
      setStep(AppStep.COMPLETE);
    } catch (err: any) {
      setError(err.message);
      setStep(AppStep.ERROR);
      addLog(`Video Error: ${err.message}`, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeGenerationLoop();
  };

  // STEP 7: User Feedback Loop
  const handleUserRefine = async () => {
    if (!userFeedback.trim()) return;
    // Re-enter loop with current prompt and user feedback
    await executeGenerationLoop(generatedPrompt, userFeedback);
    setUserFeedback('');
  };

  const handleApprove = async () => {
    if (generatedImage) {
      await startVideoGeneration(generatedImage);
    }
  };

  const reset = () => {
    setStep(AppStep.INPUT);
    setGeneratedImage(null);
    if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
    setGeneratedVideoUrl(null);
    setGeneratedPrompt('');
    setCritique(null);
    setError(null);
    setUserFeedback('');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-neon-purple selection:text-white">
      <ApiKeySelector onReady={() => setIsKeyReady(true)} />
      
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg shadow-lg shadow-neon-blue/20 flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                <path d="M16.5 7.5h-9v9h9v-9z" opacity="0.3" />
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Avatar<span className="text-neon-blue">Crafter</span> 360
            </h1>
          </div>
          <div className="text-xs text-gray-500 border border-gray-800 px-3 py-1 rounded-full">
            Agent Loop v2.0
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center text-white">
              <span className="w-2 h-8 bg-neon-blue rounded-full mr-3"></span>
              Step 1: User Input
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleInputChange}
                  disabled={step !== AppStep.INPUT && step !== AppStep.ERROR}
                  className="w-full bg-gray-850 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea 
                  name="description" value={formData.description} onChange={handleInputChange}
                  disabled={step !== AppStep.INPUT && step !== AppStep.ERROR}
                  rows={3}
                  className="w-full bg-gray-850 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue transition-all resize-none"
                  required
                />
              </div>

              <ImageUpload 
                onImageSelected={handleImageSelected} 
                selectedImage={formData.userImage} 
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Style</label>
                  <input 
                    type="text" name="style" value={formData.style} onChange={handleInputChange}
                    disabled={step !== AppStep.INPUT && step !== AppStep.ERROR}
                    className="w-full bg-gray-850 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Scenario</label>
                  <input 
                    type="text" name="scenario" value={formData.scenario} onChange={handleInputChange}
                    disabled={step !== AppStep.INPUT && step !== AppStep.ERROR}
                    className="w-full bg-gray-850 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Background Mode</label>
                <select
                  name="backgroundMode"
                  value={formData.backgroundMode}
                  onChange={handleInputChange}
                  disabled={step !== AppStep.INPUT && step !== AppStep.ERROR}
                  className="w-full bg-gray-850 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue transition-all text-sm appearance-none"
                >
                  <option value="STUDIO">Studio (Neutral Background)</option>
                  <option value="IMMERSIVE">Immersive (In Scenario)</option>
                  <option value="GAMEPLAY">Gameplay (Game Screenshot)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.backgroundMode === 'STUDIO' && "Best for character turnaround sheets and clean 3D assets."}
                  {formData.backgroundMode === 'IMMERSIVE' && "Places character directly in the scenario environment."}
                  {formData.backgroundMode === 'GAMEPLAY' && "Simulates a third-person game view with the environment."}
                </p>
              </div>

              {step === AppStep.INPUT || step === AppStep.ERROR ? (
                <button 
                  type="submit" 
                  disabled={!isKeyReady}
                  className={`w-full py-4 rounded-lg font-bold text-lg tracking-wide shadow-lg transition-all ${
                    isKeyReady 
                      ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-neon-blue/20 hover:shadow-neon-blue/40 hover:scale-[1.02]' 
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Initiate Agent Loop
                </button>
              ) : (
                <div className="w-full py-4 rounded-lg bg-gray-800 border border-gray-700 text-center text-neon-blue font-medium flex items-center justify-center space-x-2">
                   <span className="w-2 h-2 bg-neon-blue rounded-full animate-pulse"></span>
                   <span>Processing: {step}</span>
                </div>
              )}
            </form>
          </div>

          <div className="bg-black/50 border border-gray-800 rounded-xl p-4 h-72 overflow-hidden flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between mb-2 text-gray-500 uppercase tracking-wider text-[10px]">
              <span>Agent Process Log</span>
              <div className="flex space-x-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {logs.length === 0 && <span className="text-gray-600 italic">Waiting for input...</span>}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-600 select-none">[{log.timestamp}]</span>
                  <span className={`${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 
                    log.type === 'warning' ? 'text-yellow-400' : 'text-neon-blue'
                  }`}>
                    {">"} {log.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1 min-h-[600px] flex flex-col relative overflow-hidden shadow-2xl">
            
            {/* Initial State */}
            {step === AppStep.INPUT && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                <div className="w-24 h-24 mb-4 border-2 border-dashed border-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p>Step 1: Enter character details</p>
              </div>
            )}

            {/* Loading States */}
            {step === AppStep.OPTIMIZING_PROMPT && <LoadingOverlay message="Step 2: Analysis" subMessage="Gemini 3 Pro is integrating your inputs..." />}
            {step === AppStep.CRITIQUING && <LoadingOverlay message="Step 3: Critique Loop" subMessage={`Agent is auditing the output (Cycle ${loopCount + 1})...`} />}
            {step === AppStep.REFINING && <LoadingOverlay message="Step 4: Self-Correction" subMessage="Refining prompt based on critique..." />}
            
            {/* Image Display */}
            {generatedImage && !generatedVideoUrl && (
               <div className="flex-1 flex flex-col relative animate-fade-in">
                 {(step === AppStep.GENERATING_VIDEO) && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20">
                      <LoadingOverlay message="Step 6: Veo 3.1" subMessage="Synthesizing cinematic 360-degree rotation..." />
                   </div>
                 )}
                 <img 
                  src={`data:${generatedImage.mimeType};base64,${generatedImage.data}`} 
                  alt="Draft" 
                  className={`w-full h-full object-contain bg-gray-950 transition-opacity duration-500 ${step === AppStep.REFINING ? 'opacity-50 blur-sm' : 'opacity-100'}`}
                 />
                 
                 {/* Critique Overlay */}
                 {critique && step === AppStep.CRITIQUING && (
                    <div className="absolute bottom-6 left-6 right-6 bg-black/80 backdrop-blur border border-yellow-500/50 p-4 rounded-xl z-10 animate-slide-up">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-yellow-400 font-bold mb-1">Agent Critique</h4>
                          <p className="text-sm text-gray-300">{critique.feedback}</p>
                        </div>
                        <div className="text-2xl font-bold text-white bg-gray-800 px-3 py-1 rounded">
                          {critique.score}
                        </div>
                      </div>
                    </div>
                 )}

                 {/* Step 5: Manual Approval UI if loop fails to meet quality */}
                 {step === AppStep.AWAITING_APPROVAL && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
                     <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl max-w-md text-center shadow-2xl">
                       <h3 className="text-xl font-bold text-white mb-2">Step 5: Validation Required</h3>
                       <p className="text-gray-400 mb-6">
                         The agent completed 3 refinement loops but the quality score ({critique?.score}%) is below threshold.
                         Do you want to proceed with this version or refine manually?
                       </p>
                       <div className="flex space-x-4 justify-center">
                         <button onClick={handleApprove} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                           Approve & Generate Video
                         </button>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
            )}

            {/* Final Video */}
            {generatedVideoUrl && (
              <div className="flex-1 flex flex-col bg-black rounded-xl overflow-hidden relative group">
                <video src={generatedVideoUrl} autoPlay loop muted playsInline controls className="w-full h-full object-contain" />
              </div>
            )}

             {/* Error */}
             {step === AppStep.ERROR && (
              <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-8 text-center">
                 <h3 className="text-xl font-bold mb-2">Generation Failed</h3>
                 <p className="max-w-md text-gray-400 mb-6">{error}</p>
                 <button onClick={reset} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white">Try Again</button>
              </div>
            )}
          </div>

          {/* Post-Completion Actions / Step 7 */}
          {(step === AppStep.COMPLETE || step === AppStep.AWAITING_APPROVAL) && generatedImage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Feedback Loop */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                 <h3 className="text-sm font-medium text-neon-blue mb-3 uppercase tracking-wider flex items-center">
                    <span className="w-2 h-2 bg-neon-blue rounded-full mr-2"></span>
                    Step 7: User Feedback Loop
                 </h3>
                 <div className="space-y-3">
                   <textarea
                     value={userFeedback}
                     onChange={(e) => setUserFeedback(e.target.value)}
                     placeholder="e.g. 'I like it but make the visor BRIGHTER'"
                     className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-blue focus:outline-none resize-none"
                     rows={2}
                   />
                   <button 
                     onClick={handleUserRefine}
                     disabled={!userFeedback.trim()}
                     className="w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm rounded-lg disabled:opacity-50"
                   >
                     Submit Feedback & Refine Avatar
                   </button>
                 </div>
              </div>

              {/* Downloads & Reset */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
                   <div className="space-y-3">
                     <button onClick={reset} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 text-sm">
                       Start Over
                     </button>
                     {generatedVideoUrl && (
                        <a 
                          href={generatedVideoUrl || '#'} 
                          download={`avatar-${formData.name}.mp4`}
                          className="block w-full text-center py-2 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/50 rounded-lg text-sm font-bold"
                        >
                          Download Video
                        </a>
                     )}
                   </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
