import { Router, Request, Response } from 'express';
import { asyncHandler, validate } from '../middleware/index.js';
import {
  analyzeVoiceSchema,
  generateSpeechSchema,
  generateVisemesSchema,
  analyzeMouthSchema,
} from '../validators/index.js';
import {
  analyzeVoiceProfile,
  generateSpeech,
  generateVisemes,
  analyzeMouthCoordinates,
} from '../services/index.js';
import type { ApiResponse, VoiceProfile, Viseme, MouthData } from '../types/index.js';

const router = Router();

// ============================================
// POST /api/voice/analyze
// ============================================
router.post(
  '/analyze',
  validate(analyzeVoiceSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { audioBase64 } = req.body;

    const profile = await analyzeVoiceProfile(audioBase64);

    const response: ApiResponse<VoiceProfile> = {
      success: true,
      data: profile,
    };

    res.json(response);
  })
);

// ============================================
// POST /api/voice/synthesize
// ============================================
router.post(
  '/synthesize',
  validate(generateSpeechSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { script, voiceName } = req.body;

    const audioBase64 = await generateSpeech(script, voiceName);

    const response: ApiResponse<{ audioBase64: string; mimeType: string }> = {
      success: true,
      data: {
        audioBase64,
        mimeType: 'audio/wav',
      },
    };

    res.json(response);
  })
);

// ============================================
// POST /api/voice/visemes
// ============================================
router.post(
  '/visemes',
  validate(generateVisemesSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { script, totalDurationSeconds } = req.body;

    const visemes = await generateVisemes(script, totalDurationSeconds);

    const response: ApiResponse<Viseme[]> = {
      success: true,
      data: visemes,
    };

    res.json(response);
  })
);

// ============================================
// POST /api/voice/analyze-mouth
// ============================================
router.post(
  '/analyze-mouth',
  validate(analyzeMouthSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { imageBase64 } = req.body;

    const mouthData = await analyzeMouthCoordinates(imageBase64);

    const response: ApiResponse<MouthData> = {
      success: true,
      data: mouthData,
    };

    res.json(response);
  })
);

export default router;
