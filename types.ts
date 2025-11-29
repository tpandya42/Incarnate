
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
