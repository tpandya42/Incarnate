import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/index.js';
import {
  avatarRoutes,
  model3dRoutes,
  voiceRoutes,
  healthRoutes,
} from './routes/index.js';

// ============================================
// Initialize Express App
// ============================================
const app: Application = express();

// ============================================
// Middleware
// ============================================

// CORS Configuration
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request Parsing
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images/audio
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// ============================================
// API Routes
// ============================================
app.use('/api/health', healthRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/model3d', model3dRoutes);
app.use('/api/voice', voiceRoutes);

// ============================================
// Root Endpoint
// ============================================
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Incarnate API',
    version: '1.0.0',
    description: 'AI Avatar Generation Backend',
    endpoints: {
      health: '/api/health',
      avatar: '/api/avatar',
      model3d: '/api/model3d',
      voice: '/api/voice',
    },
  });
});

// ============================================
// 404 Handler
// ============================================
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ============================================
// Error Handler (must be last)
// ============================================
app.use(errorHandler);

// ============================================
// Start Server
// ============================================
const startServer = (): void => {
  app.listen(config.port, () => {
    console.log('');
    console.log('🚀 ================================');
    console.log('   INCARNATE API SERVER');
    console.log('🚀 ================================');
    console.log('');
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Port:        ${config.port}`);
    console.log(`   Gemini:      ${config.geminiApiKey ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   Tripo3D:     ${config.tripoApiKey ? '✓ Configured' : '✗ Missing'}`);
    console.log('');
    console.log('   Endpoints:');
    console.log(`   - Health:    http://localhost:${config.port}/api/health`);
    console.log(`   - Avatar:    http://localhost:${config.port}/api/avatar`);
    console.log(`   - 3D Model:  http://localhost:${config.port}/api/model3d`);
    console.log(`   - Voice:     http://localhost:${config.port}/api/voice`);
    console.log('');
    console.log('🚀 ================================');
    console.log('');
  });
};

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
startServer();

export { app };
