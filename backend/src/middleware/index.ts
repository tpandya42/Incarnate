import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import type { ApiResponse } from '../types/index.js';

// ============================================
// Validation Middleware
// ============================================

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Validation failed',
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        };
        res.status(400).json(response);
        return;
      }
      next(error);
    }
  };
};

// ============================================
// Error Handler Middleware
// ============================================

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error]', err);

  const response: ApiResponse<null> = {
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  };

  // Determine status code
  let statusCode = 500;
  if (err.message.includes('not found')) statusCode = 404;
  if (err.message.includes('unauthorized') || err.message.includes('Invalid API key')) statusCode = 401;
  if (err.message.includes('forbidden')) statusCode = 403;
  if (err.message.includes('rate limit') || err.message.includes('quota')) statusCode = 429;

  res.status(statusCode).json(response);
};

// ============================================
// Not Found Handler
// ============================================

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse<null> = {
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  };
  res.status(404).json(response);
};

// ============================================
// Async Handler Wrapper
// ============================================

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================
// Request Logger (Custom)
// ============================================

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });
  
  next();
};
