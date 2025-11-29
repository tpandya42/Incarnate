import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  // Server
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  
  // CORS
  corsOrigins: string[];
  
  // API Keys
  geminiApiKey: string;
  tripoApiKey: string;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // File Upload
  maxFileSizeMb: number;
  maxFileSizeBytes: number;
  
  // External APIs
  tripoApiBase: string;
}

const getEnvVar = (key: string, defaultValue?: string, required = true): string => {
  const value = process.env[key] || defaultValue;
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
};

const getEnvVarInt = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return parsed;
};

export const config: Config = {
  // Server
  port: getEnvVarInt('PORT', 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map(origin => origin.trim()),
  
  // API Keys - Gemini is optional for now to allow partial testing
  geminiApiKey: getEnvVar('GEMINI_API_KEY', '', false),
  tripoApiKey: getEnvVar('TRIPO_API_KEY'),
  
  // Rate Limiting
  rateLimitWindowMs: getEnvVarInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: getEnvVarInt('RATE_LIMIT_MAX_REQUESTS', 100),
  
  // File Upload
  maxFileSizeMb: getEnvVarInt('MAX_FILE_SIZE_MB', 10),
  maxFileSizeBytes: getEnvVarInt('MAX_FILE_SIZE_MB', 10) * 1024 * 1024,
  
  // External APIs
  tripoApiBase: 'https://api.tripo3d.ai/v2/openapi',
};

export default config;
