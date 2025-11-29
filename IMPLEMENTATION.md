# 🔧 Incarnate - Implementation Details

> **Technical deep-dive into the architecture, API integrations, and implementation patterns of the Incarnate avatar generation platform.**

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [API Integration Details](#api-integration-details)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [Error Handling](#error-handling)
7. [Performance Optimizations](#performance-optimizations)
8. [Future Enhancements](#future-enhancements)

---

## 🏛️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│                          (App.tsx)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────┐       ┌─────────────┐
│   Gemini    │       │   Tripo3D   │
│  Services   │       │   Service   │
│  (Multi-AI) │       │  (3D Gen)   │
└─────────────┘       └─────────────┘
    │                         │
    ├─ Prompt Optimization    └─ Image Upload
    ├─ Image Generation          │
    ├─ Video Generation          ├─ Task Creation
    ├─ Critique Loop             ├─ Progress Polling
    └─ Voice Studio              └─ Model Download
```

### Technology Stack Breakdown

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19.2.0 + TypeScript | Component architecture, type safety |
| **Build Tool** | Vite 6.2.0 | Fast HMR, optimized builds |
| **Styling** | Tailwind CSS (inline) | Utility-first styling, glassmorphism effects |
| **AI - Text** | Gemini 3 Pro Preview | Prompt optimization, critique |
| **AI - Image** | Gemini 3 Pro Image Preview | 2K image generation |
| **AI - Video** | Veo 3.1 Fast Generate | 360° video turnarounds |
| **AI - 3D** | Tripo3D API v2.5 | Image-to-3D conversion with PBR |
| **State** | React Hooks (useState, useEffect) | Local component state |
| **Networking** | Fetch API | HTTP requests to APIs |

---

## 🧩 Core Components

### 1. App.tsx - Main Application Logic

**Purpose**: Orchestrates the entire avatar generation pipeline.

**Key Responsibilities**:
- User input collection (name, description, style, reference image)
- Generation phase management
- Real-time progress tracking
- Output display and download handling

**State Variables**:

```typescript
// Form State
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [style, setStyle] = useState('Cyberpunk anime, neon lights, futuristic');
const [referenceImage, setReferenceImage] = useState<string>('');

// Generation State
const [phase, setPhase] = useState<GenerationPhase>('idle');
const [progress, setProgress] = useState(0);
const [logs, setLogs] = useState<GenerationLog[]>([]);
const [error, setError] = useState<string | null>(null);

// Output State
const [avatarImage, setAvatarImage] = useState<GeneratedImage | null>(null);
const [videoUrl, setVideoUrl] = useState<string | null>(null);
const [model3DUrl, setModel3DUrl] = useState<string | null>(null);
const [model3DPreview, setModel3DPreview] = useState<string | null>(null);
const [model3DBase64, setModel3DBase64] = useState<string | null>(null);
```

**Generation Pipeline** (`generateAll` function):

```typescript
Phase 1: Prompt Optimization (Progress: 0-15%)
    ↓
Phase 2: Image Generation (Progress: 15-30%)
    ↓
Phase 3: Video Generation (Progress: 30-60%)
    ↓
Phase 4: 3D Model Generation (Progress: 60-100%)
    ↓
Complete
```

### 2. geminiService.ts - Gemini API Integration

**Key Functions**:

#### `optimizePrompt()`
```typescript
export const optimizePrompt = async (
  name: string,
  description: string,
  style: string,
  scenario: string,
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY',
  userImageBase64?: string
): Promise<string>
```

**Process**:
1. Constructs context-aware prompt based on background mode
2. Injects critical requirements (T-pose, single character, clean background)
3. Handles optional reference image for facial likeness
4. Returns optimized generation prompt

**Background Mode Logic**:
- **STUDIO**: Requests neutral solid background for 3D clarity
- **IMMERSIVE**: Integrates character into detailed scenario environment
- **GAMEPLAY**: Simulates third-person video game perspective

#### `generateAvatarImage()`
```typescript
export const generateAvatarImage = async (
  optimizedPrompt: string, 
  referenceImageBase64?: string
): Promise<GeneratedImage>
```

**Configuration**:
- Model: `gemini-3-pro-image-preview`
- Aspect Ratio: `1:1` (optimal for 3D conversion)
- Image Size: `2K` (2048x2048)
- Response: Base64-encoded image + MIME type

**Multimodal Input**:
```typescript
const contents: any[] = [{ text: optimizedPrompt }];
if (referenceImageBase64) {
  contents.push({
    inlineData: {
      mimeType: 'image/jpeg',
      data: referenceImageBase64
    }
  });
}
```

#### `generateAvatarVideo()`
```typescript
export const generateAvatarVideo = async (
  referenceImage: GeneratedImage,
  characterName: string,
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY',
  scenario: string
): Promise<string>
```

**Process**:
1. Constructs mode-specific video prompt
2. Uses Veo 3.1 Fast with retry logic (max 3 attempts)
3. Polls operation until completion
4. Returns video download URL

**Retry Logic**:
```typescript
const MAX_RETRIES = 3;
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    // Video generation logic
    // ...
    return downloadLink;
  } catch (err) {
    if (attempt < MAX_RETRIES && isInternalError) {
      await delay(4000); // Wait 4s before retry
      continue;
    }
    break;
  }
}
```

#### `critiqueGeneratedImage()`
```typescript
export const critiqueGeneratedImage = async (
  originalBrief: string,
  generatedImage: GeneratedImage
): Promise<CritiqueResult>
```

**Evaluation Criteria**:
1. Accuracy to description (and facial likeness)
2. Consistency of character views
3. Visual quality (clarity, lighting)

**Structured Output**:
```typescript
interface CritiqueResult {
  score: number;        // 0-100
  feedback: string;     // Explanation
  suggestions: string;  // Improvement recommendations
}
```

#### `refinePrompt()`
```typescript
export const refinePrompt = async (
  currentPrompt: string,
  critique: CritiqueResult,
  userFeedback?: string
): Promise<string>
```

**Purpose**: Iteratively improves prompts based on AI critique or human feedback.

### 3. tripoService.ts - Tripo3D API Integration

**API Configuration**:
- Base URL: `https://api.tripo3d.ai/v2/openapi`
- API Key: Embedded (replace with env var in production)
- Proxy: `/tripo-api` in development (configured in Vite)

**Key Functions**:

#### `uploadImageToTripo()`
```typescript
export const uploadImageToTripo = async (
  imageBase64: string, 
  mimeType: string = 'image/png'
): Promise<string>
```

**Process**:
1. Convert base64 to Blob
2. Create FormData with file
3. POST to `/upload` endpoint
4. Return `image_token` for task creation

#### `startImageToModelTask()`
```typescript
export const startImageToModelTask = async (
  imageToken: string,
  options: {
    modelVersion?: string;
    texture?: boolean;
    pbr?: boolean;
    autoSize?: boolean;
  } = {}
): Promise<string>
```

**Default Options**:
```typescript
{
  modelVersion: 'v2.5-20250123',
  texture: true,
  pbr: true,
  autoSize: true
}
```

**Request Body**:
```json
{
  "type": "image_to_model",
  "model_version": "v2.5-20250123",
  "file": {
    "type": "png",
    "file_token": "..."
  },
  "texture": true,
  "pbr": true,
  "auto_size": true
}
```

#### `waitForTaskCompletion()`
```typescript
export const waitForTaskCompletion = async (
  taskId: string,
  onProgress?: (progress: number, status: string) => void,
  maxWaitMs: number = 300000 // 5 minutes
): Promise<TripoTaskStatus['data']>
```

**Polling Strategy**:
- Interval: 3 seconds
- Max Wait: 5 minutes
- Status Handling:
  - `queued`, `running`: Continue polling
  - `success`: Return result
  - `failed`, `banned`, `expired`, `cancelled`, `unknown`: Throw error

#### `generate3DModel()` - Complete Flow
```typescript
export const generate3DModel = async (
  imageBase64: string,
  mimeType: string = 'image/png',
  onProgress?: (message: string, progress: number) => void
): Promise<{
  modelUrl: string;
  modelBase64?: string;
  pbrModelUrl?: string;
  renderedImageUrl?: string;
}>
```

**Complete Pipeline**:

```
1. Upload Image (Progress: 10%)
   ↓
2. Start Task (Progress: 20%)
   ↓
3. Poll for Completion (Progress: 20-90%)
   ↓
4. Download Model Immediately (Progress: 92-98%)
   ↓
5. Convert to Blob URL (Progress: 100%)
   ↓
Return URLs
```

**Critical Implementation Detail**: 
Tripo3D URLs expire in 5 minutes, so models are downloaded immediately and converted to persistent Blob URLs.

---

## 🔄 Data Flow

### Complete User Journey

```
┌──────────────┐
│ User Input   │
│ - Name       │
│ - Description│
│ - Style      │
│ - Ref Image  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ 1. Prompt Optimization   │
│ Gemini 3 Pro             │
│ → Multimodal analysis    │
│ → Inject requirements    │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ 2. Image Generation      │
│ Gemini 3 Pro Image       │
│ → 2K, 1:1 aspect ratio   │
│ → Base64 + MIME type     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ 3. Video Generation      │
│ Veo 3.1 Fast             │
│ → 720p, 16:9             │
│ → 360° turnaround        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ 4. 3D Model Generation   │
│ Tripo3D API              │
│ → Upload → Task → Poll   │
│ → Download GLB + textures│
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Outputs Ready            │
│ - Avatar Image           │
│ - 360° Video             │
│ - 3D Model (GLB)         │
└──────────────────────────┘
```

---

## 🎮 State Management

### React Hooks Strategy

**Local Component State** (App.tsx):
- Simple useState for form inputs
- Phase-based generation tracking
- Logs array for real-time updates

**State Update Patterns**:

```typescript
// Atomic updates
setProgress(30);
setPhase('generating-video');

// Functional updates for arrays
setLogs(prev => [...prev, newLog]);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  };
}, [videoUrl]);
```

**No External State Management**: 
- Small app scope → useState sufficient
- Future scaling → Consider Zustand or React Context

---

## 🛡️ Error Handling

### Multi-Layer Error Strategy

#### 1. API Level Error Handling

**Gemini Service**:
```typescript
try {
  const response = await ai.models.generateContent({...});
  if (!response.text) {
    throw new Error("No content returned");
  }
  return response.text;
} catch (err: any) {
  console.error("Gemini API Error:", err);
  throw new Error(`Generation failed: ${err.message}`);
}
```

**Tripo3D Service**:
```typescript
if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Upload failed: ${response.status} - ${errorText}`);
}

const result = await response.json();
if (result.code !== 0) {
  throw new Error(`API error: code ${result.code}`);
}
```

#### 2. Retry Logic

**Video Generation** (3 attempts):
```typescript
const MAX_RETRIES = 3;
let lastError: any = null;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    // Generation logic
    return downloadLink;
  } catch (err: any) {
    lastError = err;
    const isInternalError = err.message?.toLowerCase().includes('internal');
    if (attempt < MAX_RETRIES && isInternalError) {
      await delay(4000);
      continue;
    }
    break;
  }
}
throw lastError;
```

#### 3. UI-Level Error Handling

**Try-Catch in generateAll()**:
```typescript
try {
  // Phase 1: Image
  // Phase 2: Video (with try-catch for optional failure)
  try {
    const videoUri = await generateAvatarVideo(...);
    // ...
  } catch (videoErr: any) {
    addLog(`⚠️ Video generation skipped: ${videoErr.message}`, 'warning');
  }
  
  // Phase 3: 3D Model (with try-catch for optional failure)
  try {
    const result = await generate3DModel(...);
    // ...
  } catch (err3D: any) {
    addLog(`⚠️ 3D generation failed: ${err3D.message}`, 'warning');
  }
  
} catch (err: any) {
  setError(err.message);
  setPhase('error');
  addLog(`❌ Error: ${err.message}`, 'error');
}
```

**Graceful Degradation**:
- Video failure → Continue to 3D generation
- 3D failure → User still has image + video
- Logs show warnings instead of blocking errors

#### 4. User-Facing Error Messages

```typescript
interface GenerationLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const addLog = (message: string, type: GenerationLog['type'] = 'info') => {
  setLogs(prev => [...prev, { 
    timestamp: new Date().toLocaleTimeString(), 
    message, 
    type 
  }]);
};
```

**Color-Coded Logs**:
- 🔵 `info` → Gray (progress updates)
- ✅ `success` → Green (completed phases)
- ⚠️ `warning` → Yellow (non-critical failures)
- ❌ `error` → Red (critical failures)

---

## ⚡ Performance Optimizations

### 1. Image Handling

**Base64 Optimization**:
```typescript
// Efficient base64 conversion for upload
const reader = new FileReader();
reader.onloadend = () => {
  const base64 = (reader.result as string).split(',')[1]; // Strip data URL prefix
  setReferenceImage(base64);
};
reader.readAsDataURL(file);
```

**Blob URL Management**:
```typescript
// Convert base64 to Blob URL for rendering (more efficient)
const response = await fetch(modelBase64);
const blob = await response.blob();
const localModelUrl = URL.createObjectURL(blob);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  };
}, [videoUrl]);
```

### 2. API Request Optimization

**Polling Strategy**:
- 3-second intervals (balance between responsiveness and API load)
- Exponential backoff for retries (4s delay)
- Timeout after 5 minutes

**Progressive Progress Updates**:
```typescript
// Smooth progress transitions
const adjustedProgress = 20 + (progress * 0.7); // Map 0-100 to 20-90
setProgress(adjustedProgress);
```

### 3. Lazy Loading

**Model Viewer**:
```typescript
{model3DUrl && (
  <div className="aspect-square">
    {model3DPreview ? (
      <img src={model3DPreview} alt="3D Preview" />
    ) : (
      <div className="placeholder">3D Model Ready</div>
    )}
  </div>
)}
```

### 4. Vite Configuration

**Optimized Build**:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/tripo-api': {
        target: 'https://api.tripo3d.ai',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ai-services': ['@google/genai'],
        },
      },
    },
  },
});
```

---

## 🎨 UI/UX Implementation Details

### Design System

**Color Palette**:
```css
Primary: Cyan (#22D3EE) → Purple (#A855F7) gradient
Background: #0a0a0f (near-black)
Surface: rgba(255, 255, 255, 0.02) with backdrop blur
Borders: rgba(255, 255, 255, 0.05)
```

**Glassmorphism Effect**:
```tsx
<div className="bg-white/[0.02] backdrop-blur-xl border border-white/5">
  {/* Content */}
</div>
```

**Animated Backgrounds**:
```tsx
<div className="fixed inset-0 overflow-hidden pointer-events-none">
  <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] 
                  bg-purple-500/10 rounded-full blur-[128px] animate-pulse"></div>
  <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] 
                  bg-cyan-500/10 rounded-full blur-[128px] animate-pulse" 
       style={{animationDelay: '1s'}}></div>
</div>
```

### Progress Indicators

**Phase-Based Progress Bar**:
```tsx
<div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
  <div 
    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 
               rounded-full transition-all duration-500"
    style={{ width: `${progress}%` }}
  />
</div>
```

**Loading States**:
```tsx
{isGenerating && (
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm">
    <div className="w-16 h-16 border-2 border-cyan-500/30 
                    border-t-cyan-500 rounded-full animate-spin"></div>
  </div>
)}
```

### Responsive Layout

**Grid System**:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <div>{/* Input Panel */}</div>
  <div>{/* Output Panel */}</div>
</div>
```

---

## 🔮 Future Enhancements

### Planned Features

#### 1. Voice Studio Integration
**Status**: Partially implemented in `geminiService.ts`

**Components**:
- `analyzeVoiceProfile()`: Extract pitch, pace, tone from audio sample
- `generateSpeech()`: TTS with voice cloning (Gemini 2.5 Flash TTS)
- `generateVisemes()`: Phoneme-based lip-sync data
- `analyzeMouthCoordinates()`: Automatic mouth region detection

**Use Case**: Animated avatars with lip-synced speech

#### 2. Critique Loop UI
**Status**: Functions exist, no UI integration

**Implementation**:
```typescript
// After initial generation
const critique = await critiqueGeneratedImage(prompt, image);
if (critique.score < 70) {
  const refinedPrompt = await refinePrompt(prompt, critique);
  const improvedImage = await generateAvatarImage(refinedPrompt);
}
```

**UI Concept**: 
- Show critique score with visual gauge
- Display suggestions in sidebar
- "Refine & Regenerate" button

#### 3. Multi-View Generation
**Status**: Not implemented

**Concept**: Generate front, side, back views for better 3D reconstruction

**Prompt Template**:
```
"Character turnaround sheet showing:
- Front view (center)
- Side view (left)
- Back view (right)
All views of the same character with consistent proportions and style."
```

#### 4. Batch Generation
**Status**: Not implemented

**Use Case**: Generate multiple variations simultaneously

**Implementation**:
```typescript
const variations = await Promise.all([
  generateAvatarImage(prompt + " variant 1"),
  generateAvatarImage(prompt + " variant 2"),
  generateAvatarImage(prompt + " variant 3"),
]);
```

#### 5. Advanced 3D Features

**Post-Processing**:
- Rigging automation
- Animation presets
- Texture enhancement
- LOD generation

**Tripo3D API Extensions**:
```typescript
interface AdvancedOptions {
  rigging?: boolean;
  animations?: string[];
  lod_levels?: number;
  texture_resolution?: '2K' | '4K';
}
```

#### 6. Cloud Storage Integration

**Problem**: Blob URLs are session-only

**Solution**: Upload to cloud storage (Firebase/S3)
```typescript
const uploadToCloud = async (blob: Blob, filename: string) => {
  const formData = new FormData();
  formData.append('file', blob, filename);
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};
```

#### 7. User Gallery & History

**Database Schema**:
```typescript
interface Generation {
  id: string;
  userId: string;
  name: string;
  description: string;
  style: string;
  imageUrl: string;
  videoUrl?: string;
  modelUrl?: string;
  createdAt: Date;
  metadata: {
    prompt: string;
    critiqueScore?: number;
  };
}
```

#### 8. Real-Time Collaboration

**WebSocket Integration**:
- Share generation sessions
- Live preview for team members
- Comment system on generations

---

## 🧪 Testing Strategy

### Unit Tests

**Example: Prompt Optimization**
```typescript
describe('optimizePrompt', () => {
  it('should inject T-pose requirement for STUDIO mode', async () => {
    const result = await optimizePrompt(
      'Hero', 'Warrior', 'Fantasy', '', 'STUDIO'
    );
    expect(result).toContain('T-pose');
    expect(result).toContain('neutral background');
  });
});
```

### Integration Tests

**Example: Complete Pipeline**
```typescript
describe('Avatar Generation Pipeline', () => {
  it('should generate all assets successfully', async () => {
    const prompt = await optimizePrompt(...);
    const image = await generateAvatarImage(prompt);
    expect(image.data).toBeDefined();
    expect(image.mimeType).toMatch(/image\/(png|jpeg)/);
  });
});
```

### E2E Tests (Cypress)

```typescript
describe('User Journey', () => {
  it('generates avatar from input', () => {
    cy.visit('/');
    cy.get('input[placeholder*="Character Name"]').type('Test Hero');
    cy.get('textarea').type('A brave warrior');
    cy.get('button').contains('Generate').click();
    cy.get('.progress-bar', { timeout: 120000 }).should('have.attr', 'style', 'width: 100%');
    cy.get('img[alt="Generated Avatar"]').should('be.visible');
  });
});
```

---

## 📊 Performance Metrics

### Benchmarks

| Operation | Average Time | Notes |
|-----------|--------------|-------|
| Prompt Optimization | 2-4s | Depends on prompt complexity |
| Image Generation | 8-15s | 2K resolution, 1:1 aspect |
| Video Generation | 45-90s | 720p, 16:9, 5-10s duration |
| 3D Model Generation | 60-180s | Depends on image complexity |
| **Total Pipeline** | **2-5 minutes** | End-to-end with retries |

### API Rate Limits

**Gemini API**:
- Image Generation: 2 RPM (requests per minute)
- Video Generation: 15 RPD (requests per day) on free tier
- Text Models: 15 RPM

**Tripo3D API**:
- Free Tier: 10 generations/day
- Pro Tier: 100+ generations/day

---

## 🔒 Security Best Practices

### API Key Management

**Current Implementation**:
```typescript
// vite.config.ts
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```

**Production Recommendation**:
```typescript
// Use backend proxy
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${userToken}` },
  body: JSON.stringify({ prompt, options }),
});
```

### Input Sanitization

**XSS Prevention**:
```typescript
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .slice(0, 1000); // Max length
};
```

### CORS Configuration

**Development Proxy** (vite.config.ts):
```typescript
proxy: {
  '/tripo-api': {
    target: 'https://api.tripo3d.ai',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/tripo-api/, ''),
  },
}
```

**Production**: Use backend API route to avoid exposing API keys

---

## 📝 Code Quality Standards

### TypeScript Best Practices

**Strict Type Definitions**:
```typescript
// types.ts
export interface GeneratedImage {
  data: string;        // Base64 encoded
  mimeType: string;    // e.g., 'image/png'
}

export type GenerationPhase = 
  | 'idle' 
  | 'generating-image' 
  | 'generating-video' 
  | 'generating-3d' 
  | 'complete' 
  | 'error';
```

**Avoid `any` Types**:
```typescript
// ❌ Bad
const handleError = (err: any) => {...}

// ✅ Good
const handleError = (err: Error | unknown) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  setError(message);
}
```

### Code Organization

**Service Layer Pattern**:
```
services/
├── geminiService.ts    # All Gemini API interactions
└── tripoService.ts     # All Tripo3D API interactions
```

**Component Structure**:
```tsx
// 1. Imports
import React, { useState } from 'react';
import { generateAvatarImage } from './services/geminiService';

// 2. Types/Interfaces
interface Props { ... }

// 3. Component
export const Component: React.FC<Props> = ({ prop }) => {
  // 4. State
  const [state, setState] = useState();
  
  // 5. Effects
  useEffect(() => {...}, []);
  
  // 6. Handlers
  const handleAction = () => {...};
  
  // 7. Render
  return <div>...</div>;
};
```

---

## 🚀 Deployment Guide

### Build Process

```bash
# Install dependencies
npm install

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Output: dist/ folder
```

### Environment Variables

**Production `.env`**:
```env
GEMINI_API_KEY=your_production_key
TRIPO_API_KEY=your_tripo_key
VITE_API_BASE_URL=https://your-backend.com/api
```

### Hosting Options

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

**vercel.json**:
```json
{
  "rewrites": [
    { "source": "/tripo-api/:path*", "destination": "https://api.tripo3d.ai/:path*" }
  ],
  "env": {
    "GEMINI_API_KEY": "@gemini-api-key"
  }
}
```

#### Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

**netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/tripo-api/*"
  to = "https://api.tripo3d.ai/:splat"
  status = 200
```

---

## 📚 Additional Resources

### API Documentation
- [Gemini API Reference](https://ai.google.dev/docs)
- [Veo Video Generation](https://ai.google.dev/docs/veo)
- [Tripo3D API Docs](https://platform.tripo3d.ai/docs)

### Libraries & Tools
- [React 19 Docs](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)

### Inspiration & References
- [AI Avatar Generators](https://leonardo.ai/)
- [3D Character Tools](https://readyplayer.me/)
- [Glassmorphism Design](https://glassmorphism.com/)

---

## 🤝 Contributing Guidelines

### Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/tpandya42/Incarnate.git
   cd Incarnate
   npm install
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow TypeScript best practices
   - Add comments for complex logic
   - Update types.ts if needed

4. **Test Locally**
   ```bash
   npm run dev
   # Test all features manually
   ```

5. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Describe changes clearly
   - Link related issues
   - Add screenshots if UI changes

### Code Review Checklist

- [ ] TypeScript types are strict (no `any`)
- [ ] Error handling implemented
- [ ] Console logs removed (use proper logging)
- [ ] Responsive design tested
- [ ] API keys not hardcoded
- [ ] Comments added for complex logic
- [ ] No breaking changes to existing API

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Video Generation**
   - Free tier: 15 videos/day limit
   - Occasional internal server errors (retry logic implemented)
   - 720p max resolution on Fast model

2. **3D Model Generation**
   - Free tier: 10 models/day
   - URLs expire in 5 minutes (mitigated with immediate download)
   - Complex characters may have artifacts

3. **Browser Compatibility**
   - Best on Chrome/Edge (WebGL support for 3D preview)
   - Safari: Limited video autoplay support
   - Mobile: UI not fully optimized

4. **File Size**
   - 3D models can be 10-50MB
   - Videos 5-20MB
   - May require compression for web deployment

### Workarounds

**Video Timeout**:
```typescript
// Increase polling timeout
const maxWaitMs = 600000; // 10 minutes instead of 5
```

**Model Download Failure**:
```typescript
// Fallback to direct URL
const modelUrl = model3DBase64 || model3DUrl;
```

---

## 📞 Support & Contact

**Issues**: [GitHub Issues](https://github.com/tpandya42/Incarnate/issues)  
**Email**: tanmay.pandya@example.com  
**Discord**: Join our community server

---

<div align="center">
  <p><strong>Built with ❤️ by Tanmay Pandya</strong></p>
  <p>Powered by Gemini 3 Pro • Veo 3.1 • Tripo3D</p>
</div>
