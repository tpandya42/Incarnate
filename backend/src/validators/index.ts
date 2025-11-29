import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const backgroundModeSchema = z.enum(['STUDIO', 'IMMERSIVE', 'GAMEPLAY']);

export const base64ImageSchema = z.string().min(100).max(20_000_000); // Max ~15MB base64

// ============================================
// Avatar Generation Schemas
// ============================================

export const optimizePromptSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(2000),
  style: z.string().min(1).max(500),
  scenario: z.string().max(500).optional(),
  backgroundMode: backgroundModeSchema,
  referenceImageBase64: base64ImageSchema.optional(),
});

export const generateImageSchema = z.object({
  prompt: z.string().min(10).max(5000),
  referenceImageBase64: base64ImageSchema.optional(),
});

export const generateVideoSchema = z.object({
  imageData: base64ImageSchema,
  imageMimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/),
  characterName: z.string().min(1).max(100),
  backgroundMode: backgroundModeSchema,
  scenario: z.string().max(500).optional(),
});

export const critiqueSchema = z.object({
  originalBrief: z.string().min(1).max(2000),
  imageData: base64ImageSchema,
  imageMimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/),
});

export const refinePromptSchema = z.object({
  currentPrompt: z.string().min(10).max(5000),
  critique: z.object({
    score: z.number().int().min(0).max(100),
    feedback: z.string(),
    suggestions: z.string(),
  }),
  userFeedback: z.string().max(1000).optional(),
});

// ============================================
// 3D Model Schemas
// ============================================

export const generate3DModelSchema = z.object({
  imageBase64: base64ImageSchema,
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/).optional(),
});

export const taskStatusSchema = z.object({
  taskId: z.string().min(1),
});

// ============================================
// Voice Studio Schemas
// ============================================

export const analyzeVoiceSchema = z.object({
  audioBase64: z.string().min(100).max(50_000_000), // Max ~37MB base64
  mimeType: z.string().regex(/^audio\/(wav|mp3|mpeg|ogg|webm)$/).optional(),
});

export const generateSpeechSchema = z.object({
  script: z.string().min(1).max(5000),
  voiceName: z.enum(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr']),
});

export const generateVisemesSchema = z.object({
  script: z.string().min(1).max(5000),
  totalDurationSeconds: z.number().positive().max(300), // Max 5 minutes
});

export const analyzeMouthSchema = z.object({
  imageBase64: base64ImageSchema,
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/).optional(),
});

// ============================================
// Type Exports
// ============================================

export type OptimizePromptInput = z.infer<typeof optimizePromptSchema>;
export type GenerateImageInput = z.infer<typeof generateImageSchema>;
export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;
export type CritiqueInput = z.infer<typeof critiqueSchema>;
export type RefinePromptInput = z.infer<typeof refinePromptSchema>;
export type Generate3DModelInput = z.infer<typeof generate3DModelSchema>;
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
export type AnalyzeVoiceInput = z.infer<typeof analyzeVoiceSchema>;
export type GenerateSpeechInput = z.infer<typeof generateSpeechSchema>;
export type GenerateVisemesInput = z.infer<typeof generateVisemesSchema>;
export type AnalyzeMouthInput = z.infer<typeof analyzeMouthSchema>;
