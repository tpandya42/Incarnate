// Type definitions for Incarnate Backend

// ============================================
// Avatar Generation Types
// ============================================

export interface GeneratedImage {
  data: string;      // Base64 encoded image
  mimeType: string;  // e.g., 'image/png'
}

export type BackgroundMode = 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY';

export interface OptimizePromptRequest {
  name: string;
  description: string;
  style: string;
  scenario?: string;
  backgroundMode: BackgroundMode;
  referenceImageBase64?: string;
}

export interface GenerateImageRequest {
  prompt: string;
  referenceImageBase64?: string;
}

export interface GenerateVideoRequest {
  imageData: string;
  imageMimeType: string;
  characterName: string;
  backgroundMode: BackgroundMode;
  scenario?: string;
}

export interface CritiqueRequest {
  originalBrief: string;
  imageData: string;
  imageMimeType: string;
}

export interface CritiqueResult {
  score: number;
  feedback: string;
  suggestions: string;
}

export interface RefinePromptRequest {
  currentPrompt: string;
  critique: CritiqueResult;
  userFeedback?: string;
}

// ============================================
// 3D Model Generation Types
// ============================================

export interface Generate3DModelRequest {
  imageBase64: string;
  mimeType?: string;
}

export interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
}

export interface TripoTaskStatus {
  code: number;
  data: {
    task_id: string;
    type: string;
    status: 'queued' | 'running' | 'success' | 'failed' | 'banned' | 'expired' | 'cancelled' | 'unknown';
    input: Record<string, unknown>;
    output: {
      model?: string;
      base_model?: string;
      pbr_model?: string;
      rendered_image?: string;
    };
    progress: number;
    create_time: number;
  };
}

export interface TripoUploadResponse {
  code: number;
  data: {
    image_token: string;
  };
}

export interface Model3DResult {
  taskId: string;
  status: string;
  modelUrl?: string;
  pbrModelUrl?: string;
  renderedImageUrl?: string;
  progress: number;
}

// ============================================
// Voice Studio Types
// ============================================

export interface VoiceProfile {
  pitch_range: { min_hz: number; max_hz: number };
  speech_pace_wpm: number;
  tone: string;
  unique_traits: string[];
  recommended_voice_id: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  confidence: number;
}

export interface AnalyzeVoiceRequest {
  audioBase64: string;
  mimeType?: string;
}

export interface GenerateSpeechRequest {
  script: string;
  voiceName: string;
}

export interface Viseme {
  phoneme: string;
  viseme_shape: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  start_time: number;
  end_time: number;
  openness: number;
}

export interface GenerateVisemesRequest {
  script: string;
  totalDurationSeconds: number;
}

export interface MouthData {
  mouth_center: { x: number; y: number };
  mouth_width_pixels: number;
  mouth_height_pixels: number;
  max_open: number;
  character_type: string;
}

export interface AnalyzeMouthRequest {
  imageBase64: string;
  mimeType?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  services: {
    gemini: boolean;
    tripo: boolean;
  };
}

// ============================================
// Job/Task Types for Async Operations
// ============================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: 'image' | 'video' | '3d-model' | 'voice';
  status: JobStatus;
  progress: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
