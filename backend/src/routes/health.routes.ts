import { Router, Request, Response } from 'express';
import type { ApiResponse } from '../types/index.js';
import { config } from '../config/index.js';

const router = Router();

// ============================================
// GET /api/health
// ============================================
router.get('/', (_req: Request, res: Response): void => {
  const response: ApiResponse<{
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
  }> = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    },
  };

  res.json(response);
});

// ============================================
// GET /api/health/ready
// ============================================
router.get('/ready', (_req: Request, res: Response): void => {
  const services = {
    gemini: !!config.geminiApiKey,
    tripo: !!config.tripoApiKey,
  };

  const allReady = Object.values(services).every(Boolean);

  const response: ApiResponse<{
    ready: boolean;
    services: typeof services;
  }> = {
    success: allReady,
    data: {
      ready: allReady,
      services,
    },
  };

  res.status(allReady ? 200 : 503).json(response);
});

// ============================================
// GET /api/health/live
// ============================================
router.get('/live', (_req: Request, res: Response): void => {
  const response: ApiResponse<{ alive: boolean }> = {
    success: true,
    data: {
      alive: true,
    },
  };

  res.json(response);
});

export default router;
