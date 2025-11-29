
export interface AvatarFormData {
  name: string;
  description: string;
  style: string;
  scenario: string;
  userImage?: string; // Base64 string of user's reference/sketch
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY';
}

export enum AppStep {
  INPUT = 'INPUT',
  OPTIMIZING_PROMPT = 'OPTIMIZING_PROMPT',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  CRITIQUING = 'CRITIQUING', // Agent analyzes the result
  REFINING = 'REFINING',     // Agent improves the prompt
  AWAITING_APPROVAL = 'AWAITING_APPROVAL', // Agent failed to meet threshold, human validation required
  GENERATING_VIDEO = 'GENERATING_VIDEO',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface GenerationLog {
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface CritiqueResult {
  score: number;
  feedback: string;
  suggestions: string;
}

// --- Voice Studio Types ---

export interface VoiceProfile {
  pitch_range: { min_hz: number; max_hz: number };
  speech_pace_wpm: number;
  tone: string;
  unique_traits: string[];
  recommended_voice_id: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  confidence: number;
}

export interface MouthData {
  mouth_center: { x: number; y: number };
  mouth_width_pixels: number;
  mouth_height_pixels: number;
  max_open: number;
  character_type: string;
}

export interface Viseme {
  phoneme: string;
  viseme_shape: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  start_time: number; // in seconds
  end_time: number; // in seconds
  openness: number; // 0.0 to 1.0
}

export interface VoiceSessionData {
  userVoiceBase64?: string;
  voiceProfile?: VoiceProfile;
  script: string;
  generatedAudioBase64?: string;
  visemes?: Viseme[];
  mouthData?: MouthData;
}
