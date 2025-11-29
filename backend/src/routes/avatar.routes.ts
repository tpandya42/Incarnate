import { Router, Request, Response } from 'express';
import { asyncHandler, validate } from '../middleware/index.js';
import {
  optimizePromptSchema,
  generateImageSchema,
  generateVideoSchema,
  critiqueSchema,
  refinePromptSchema,
} from '../validators/index.js';
import {
  optimizePrompt,
  generateAvatarImage,
  generateAvatarVideo,
  critiqueGeneratedImage,
  refinePrompt,
} from '../services/index.js';
import type { ApiResponse, GeneratedImage, CritiqueResult } from '../types/index.js';

const router = Router();

// ============================================
// POST /api/avatar/optimize-prompt
// ============================================
router.post(
  '/optimize-prompt',
  validate(optimizePromptSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, description, style, scenario, backgroundMode, referenceImageBase64 } = req.body;

    const optimizedPrompt = await optimizePrompt(
      name,
      description,
      style,
      scenario || '',
      backgroundMode,
      referenceImageBase64
    );

    const response: ApiResponse<{ prompt: string }> = {
      success: true,
      data: { prompt: optimizedPrompt },
    };

    res.json(response);
  })
);

// ============================================
// POST /api/avatar/generate-image
// ============================================
router.post(
  '/generate-image',
  validate(generateImageSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { prompt, referenceImageBase64 } = req.body;

    const image = await generateAvatarImage(prompt, referenceImageBase64);

    const response: ApiResponse<GeneratedImage> = {
      success: true,
      data: image,
    };

    res.json(response);
  })
);

// ============================================
// POST /api/avatar/generate-video
// ============================================
router.post(
  '/generate-video',
  validate(generateVideoSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { imageData, imageMimeType, characterName, backgroundMode, scenario } = req.body;

    const referenceImage: GeneratedImage = {
      data: imageData,
      mimeType: imageMimeType,
    };

    const videoUrl = await generateAvatarVideo(
      referenceImage,
      characterName,
      backgroundMode,
      scenario || ''
    );

    const response: ApiResponse<{ videoUrl: string }> = {
      success: true,
      data: { videoUrl },
    };

    res.json(response);
  })
);

// ============================================
// POST /api/avatar/critique
// ============================================
router.post(
  '/critique',
  validate(critiqueSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { originalBrief, imageData, imageMimeType } = req.body;

    const generatedImage: GeneratedImage = {
      data: imageData,
      mimeType: imageMimeType,
    };

    const critique = await critiqueGeneratedImage(originalBrief, generatedImage);

    const response: ApiResponse<CritiqueResult> = {
      success: true,
      data: critique,
    };

    res.json(response);
  })
);

// ============================================
// POST /api/avatar/refine-prompt
// ============================================
router.post(
  '/refine-prompt',
  validate(refinePromptSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { currentPrompt, critique, userFeedback } = req.body;

    const refinedPrompt = await refinePrompt(currentPrompt, critique, userFeedback);

    const response: ApiResponse<{ prompt: string }> = {
      success: true,
      data: { prompt: refinedPrompt },
    };

    res.json(response);
  })
);

export default router;
