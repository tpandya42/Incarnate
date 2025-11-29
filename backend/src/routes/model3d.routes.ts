import { Router, Request, Response } from 'express';
import { asyncHandler, validate } from '../middleware/index.js';
import {
  generate3DModelSchema,
  taskStatusSchema,
} from '../validators/index.js';
import {
  generate3DModel,
  getTaskStatus,
  downloadModelFile,
  getModelAsBase64,
} from '../services/index.js';
import type { ApiResponse, Model3DResult } from '../types/index.js';

const router = Router();

// ============================================
// POST /api/model3d/generate
// ============================================
router.post(
  '/generate',
  validate(generate3DModelSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { imageBase64, mimeType } = req.body;

    const result = await generate3DModel(
      imageBase64,
      mimeType || 'image/png',
      (message, progress) => {
        console.log(`[3D Gen] ${message} - ${progress}%`);
      }
    );

    const response: ApiResponse<Model3DResult> = {
      success: true,
      data: result,
    };

    res.json(response);
  })
);

// ============================================
// GET /api/model3d/status/:taskId
// ============================================
router.get(
  '/status/:taskId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;

    // Validate taskId
    taskStatusSchema.parse({ taskId });

    const status = await getTaskStatus(taskId);

    const response: ApiResponse<typeof status> = {
      success: true,
      data: status,
    };

    res.json(response);
  })
);

// ============================================
// GET /api/model3d/download
// Downloads model and returns as base64 (useful since Tripo URLs expire)
// ============================================
router.get(
  '/download',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing URL parameter',
      });
      return;
    }

    const base64 = await getModelAsBase64(url);

    const response: ApiResponse<{ modelBase64: string; mimeType: string }> = {
      success: true,
      data: {
        modelBase64: base64,
        mimeType: 'model/gltf-binary',
      },
    };

    res.json(response);
  })
);

// ============================================
// GET /api/model3d/download-file
// Downloads model and streams as file
// ============================================
router.get(
  '/download-file',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { url, filename } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing URL parameter',
      });
      return;
    }

    const buffer = await downloadModelFile(url);
    const name = typeof filename === 'string' ? filename : 'model.glb';

    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  })
);

export default router;
