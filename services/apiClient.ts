// API Client for Incarnate Backend
// This service connects the frontend to the Express.js backend

import type { CritiqueResult, VoiceProfile, Viseme, MouthData } from '../types';

const API_BASE = '/api';

// Generic fetch wrapper with error handling
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMessage = data.error?.message || `API Error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data.data as T;
};

// ============================================
// Avatar Generation API
// ============================================

export interface OptimizePromptParams {
  name: string;
  description: string;
  style: string;
  scenario?: string;
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY';
  referenceImageBase64?: string;
}

export const apiOptimizePrompt = async (params: OptimizePromptParams): Promise<string> => {
  const result = await apiRequest<{ optimizedPrompt: string }>('/avatar/optimize-prompt', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return result.optimizedPrompt;
};

export interface GenerateImageParams {
  prompt: string;
  referenceImageBase64?: string;
}

export interface GeneratedImage {
  data: string;
  mimeType: string;
}

export const apiGenerateImage = async (params: GenerateImageParams): Promise<GeneratedImage> => {
  return apiRequest<GeneratedImage>('/avatar/generate-image', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export interface CritiqueParams {
  originalBrief: string;
  imageData: string;
  imageMimeType: string;
}

export const apiCritiqueImage = async (params: CritiqueParams): Promise<CritiqueResult> => {
  return apiRequest<CritiqueResult>('/avatar/critique', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export interface RefinePromptParams {
  currentPrompt: string;
  critique: CritiqueResult;
  userFeedback?: string;
}

export const apiRefinePrompt = async (params: RefinePromptParams): Promise<string> => {
  const result = await apiRequest<{ refinedPrompt: string }>('/avatar/refine-prompt', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return result.refinedPrompt;
};

export interface GenerateVideoParams {
  imageData: string;
  imageMimeType: string;
  characterName: string;
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY';
  scenario?: string;
}

export const apiGenerateVideo = async (params: GenerateVideoParams): Promise<string> => {
  const result = await apiRequest<{ videoUrl: string }>('/avatar/generate-video', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return result.videoUrl;
};

export interface GenerateAllParams extends OptimizePromptParams {
  includeVideo?: boolean;
}

export interface GenerateAllResult {
  optimizedPrompt: string;
  image: GeneratedImage;
  critique: CritiqueResult;
  videoUrl?: string;
}

export const apiGenerateAll = async (params: GenerateAllParams): Promise<GenerateAllResult> => {
  return apiRequest<GenerateAllResult>('/avatar/generate-all', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

// ============================================
// 3D Model Generation API
// ============================================

export interface Generate3DParams {
  imageBase64: string;
  mimeType?: string;
}

export interface Model3DTaskResult {
  taskId: string;
  status: string;
  progress: number;
  modelUrl?: string;
}

export const apiGenerate3DModel = async (params: Generate3DParams): Promise<Model3DTaskResult> => {
  return apiRequest<Model3DTaskResult>('/model3d/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export const apiGet3DModelStatus = async (taskId: string): Promise<Model3DTaskResult> => {
  return apiRequest<Model3DTaskResult>(`/model3d/task/${taskId}`, {
    method: 'GET',
  });
};

export interface DownloadModelParams {
  modelUrl: string;
}

export const apiDownloadModel = async (params: DownloadModelParams): Promise<{ modelData: string }> => {
  return apiRequest<{ modelData: string }>('/model3d/download', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

// ============================================
// Voice Studio API
// ============================================

export interface AnalyzeVoiceParams {
  audioBase64: string;
  mimeType?: string;
}

export const apiAnalyzeVoice = async (params: AnalyzeVoiceParams): Promise<VoiceProfile> => {
  return apiRequest<VoiceProfile>('/voice/analyze', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export interface SynthesizeSpeechParams {
  script: string;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export interface SynthesizedSpeech {
  audioBase64: string;
  mimeType: string;
}

export const apiSynthesizeSpeech = async (params: SynthesizeSpeechParams): Promise<SynthesizedSpeech> => {
  return apiRequest<SynthesizedSpeech>('/voice/synthesize', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export interface GenerateVisemesParams {
  script: string;
  totalDurationSeconds: number;
}

export const apiGenerateVisemes = async (params: GenerateVisemesParams): Promise<Viseme[]> => {
  return apiRequest<Viseme[]>('/voice/visemes', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export interface AnalyzeMouthParams {
  imageBase64: string;
  mimeType?: string;
}

export const apiAnalyzeMouth = async (params: AnalyzeMouthParams): Promise<MouthData> => {
  return apiRequest<MouthData>('/voice/analyze-mouth', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

// ============================================
// Health Check API
// ============================================

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
}

export const apiHealthCheck = async (): Promise<HealthStatus> => {
  return apiRequest<HealthStatus>('/health', {
    method: 'GET',
  });
};

export interface ReadinessStatus {
  ready: boolean;
  services: {
    gemini: boolean;
    tripo: boolean;
  };
}

export const apiReadinessCheck = async (): Promise<ReadinessStatus> => {
  return apiRequest<ReadinessStatus>('/health/ready', {
    method: 'GET',
  });
};
