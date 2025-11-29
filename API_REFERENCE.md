# 📡 Incarnate API Reference

> Complete API documentation for all services and functions used in the Incarnate avatar generation platform.

## 📋 Table of Contents

1. [Gemini Service API](#gemini-service-api)
2. [Tripo3D Service API](#tripo3d-service-api)
3. [Type Definitions](#type-definitions)
4. [Error Codes](#error-codes)
5. [Rate Limits](#rate-limits)

---

## 🤖 Gemini Service API

**File**: `services/geminiService.ts`

### Configuration

```typescript
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};
```

**Required Environment Variable**: `GEMINI_API_KEY`

---

### Avatar Generation Functions

#### `optimizePrompt()`

Optimizes user input into a detailed prompt for image generation using Gemini 3 Pro.

**Signature**:
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

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Character name |
| `description` | `string` | Yes | Character appearance and personality |
| `style` | `string` | Yes | Art style (e.g., "Cyberpunk anime") |
| `scenario` | `string` | Yes | Scene/environment description |
| `backgroundMode` | `'STUDIO' \| 'IMMERSIVE' \| 'GAMEPLAY'` | Yes | Background rendering mode |
| `userImageBase64` | `string` | No | Base64-encoded reference image |

**Returns**: `Promise<string>` - Optimized prompt text

**Example**:
```typescript
const optimizedPrompt = await optimizePrompt(
  "Nova",
  "Female hacker with neon blue hair and cybernetic implants",
  "Cyberpunk anime, neon lights, futuristic",
  "Standing in a futuristic city",
  "STUDIO",
  "iVBORw0KGgoAAAANSUhEUgAA..." // Optional
);

// Output: "Create a highly detailed character portrait of Nova, a female hacker..."
```

**Models Used**:
- `gemini-3-pro-preview`

**Error Handling**:
```typescript
try {
  const prompt = await optimizePrompt(...);
} catch (error) {
  console.error("Prompt optimization failed:", error.message);
}
```

---

#### `generateAvatarImage()`

Generates a high-quality 2K image using Gemini's image generation model.

**Signature**:
```typescript
export const generateAvatarImage = async (
  optimizedPrompt: string, 
  referenceImageBase64?: string
): Promise<GeneratedImage>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `optimizedPrompt` | `string` | Yes | Detailed generation prompt |
| `referenceImageBase64` | `string` | No | Base64 reference image for likeness |

**Returns**: `Promise<GeneratedImage>`

```typescript
interface GeneratedImage {
  data: string;      // Base64-encoded image
  mimeType: string;  // e.g., "image/png" or "image/jpeg"
}
```

**Configuration**:
```typescript
config: {
  imageConfig: {
    aspectRatio: "1:1",  // Square format for 3D conversion
    imageSize: "2K",     // 2048x2048 pixels
  }
}
```

**Example**:
```typescript
const image = await generateAvatarImage(
  "Ultra-detailed character portrait...",
  "iVBORw0KGgoAAAANSUhEUgAA..." // Optional
);

// Use the image
const imgSrc = `data:${image.mimeType};base64,${image.data}`;
```

**Models Used**:
- `gemini-3-pro-image-preview`

**Error Handling**:
```typescript
try {
  const image = await generateAvatarImage(prompt);
} catch (error) {
  if (error.message.includes("quota")) {
    console.error("API quota exceeded");
  } else {
    console.error("Image generation failed:", error.message);
  }
}
```

---

#### `generateAvatarVideo()`

Creates a 360° turnaround video using Veo 3.1 Fast model.

**Signature**:
```typescript
export const generateAvatarVideo = async (
  referenceImage: GeneratedImage,
  characterName: string,
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY',
  scenario: string
): Promise<string>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `referenceImage` | `GeneratedImage` | Yes | Avatar image from `generateAvatarImage()` |
| `characterName` | `string` | Yes | Character name for video context |
| `backgroundMode` | `'STUDIO' \| 'IMMERSIVE' \| 'GAMEPLAY'` | Yes | Video environment style |
| `scenario` | `string` | Yes | Environment description |

**Returns**: `Promise<string>` - Download URL for video file

**Video Specifications**:
- Resolution: 720p
- Aspect Ratio: 16:9
- Duration: 5-10 seconds (automatic)
- Format: MP4

**Retry Logic**:
- Max Attempts: 3
- Delay Between Retries: 4 seconds
- Retry Conditions: Internal server errors

**Example**:
```typescript
const videoUrl = await generateAvatarVideo(
  image,
  "Nova",
  "STUDIO",
  "Rotating turnaround"
);

// Download video
const response = await fetch(`${videoUrl}&key=${API_KEY}`);
const blob = await response.blob();
const localUrl = URL.createObjectURL(blob);
```

**Models Used**:
- `veo-3.1-fast-generate-preview`

**Background Mode Prompts**:

| Mode | Generated Prompt |
|------|------------------|
| `STUDIO` | "Cinematic 360-degree turntable shot. Smooth camera rotation. Neutral studio lighting. 4k." |
| `IMMERSIVE` | "Cinematic 360-degree camera orbit around the character in a {scenario} environment. Detailed background, atmospheric lighting. 4k." |
| `GAMEPLAY` | "Video game character showcase. 360-degree rotating camera view in {scenario}. Third-person perspective, game engine style." |

**Error Handling**:
```typescript
try {
  const videoUrl = await generateAvatarVideo(...);
} catch (error) {
  if (error.message.includes("FAILED")) {
    console.error("Veo generation failed:", error.message);
  } else if (error.message.includes("internal")) {
    console.error("Server error, retrying...");
  }
}
```

---

#### `critiqueGeneratedImage()`

Uses AI to evaluate image quality against the original brief.

**Signature**:
```typescript
export const critiqueGeneratedImage = async (
  originalBrief: string,
  generatedImage: GeneratedImage
): Promise<CritiqueResult>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `originalBrief` | `string` | Yes | Original user description |
| `generatedImage` | `GeneratedImage` | Yes | Generated avatar image |

**Returns**: `Promise<CritiqueResult>`

```typescript
interface CritiqueResult {
  score: number;        // 0-100 quality score
  feedback: string;     // Human-readable explanation
  suggestions: string;  // Improvement recommendations
}
```

**Evaluation Criteria**:
1. **Accuracy**: Match to original description (40%)
2. **Consistency**: Character view coherence (30%)
3. **Visual Quality**: Clarity, lighting, detail (30%)

**Example**:
```typescript
const critique = await critiqueGeneratedImage(
  "Female hacker with blue hair",
  generatedImage
);

console.log(critique);
// {
//   score: 85,
//   feedback: "Excellent match to description with high visual quality",
//   suggestions: "Consider adding more neon lighting effects"
// }
```

**Models Used**:
- `gemini-3-pro-preview`

**Structured Output Configuration**:
```typescript
config: {
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      suggestions: { type: Type.STRING }
    }
  }
}
```

---

#### `refinePrompt()`

Improves generation prompts based on AI critique or user feedback.

**Signature**:
```typescript
export const refinePrompt = async (
  currentPrompt: string,
  critique: CritiqueResult,
  userFeedback?: string
): Promise<string>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `currentPrompt` | `string` | Yes | Current generation prompt |
| `critique` | `CritiqueResult` | Yes | AI critique from `critiqueGeneratedImage()` |
| `userFeedback` | `string` | No | Optional human feedback (highest priority) |

**Returns**: `Promise<string>` - Refined prompt

**Priority System**:
1. User feedback (if provided) - **HIGHEST PRIORITY**
2. AI critique suggestions
3. Core requirements preservation

**Example**:
```typescript
const refinedPrompt = await refinePrompt(
  "Character portrait of Nova...",
  { score: 70, feedback: "Hair color unclear", suggestions: "Add brighter blue tones" },
  "Make the hair more vibrant" // Optional
);

// Output: Enhanced prompt with improvements
```

**Models Used**:
- `gemini-3-pro-preview`

---

### Voice Studio Functions

> ⚠️ **Status**: Implemented but not integrated in UI

#### `analyzeVoiceProfile()`

Extracts voice characteristics from audio sample.

**Signature**:
```typescript
export const analyzeVoiceProfile = async (
  audioBase64: string
): Promise<VoiceProfile>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audioBase64` | `string` | Yes | Base64-encoded audio (WAV format) |

**Returns**: `Promise<VoiceProfile>`

```typescript
interface VoiceProfile {
  pitch_range: { min_hz: number; max_hz: number };
  speech_pace_wpm: number;
  tone: string;
  unique_traits: string[];
  recommended_voice_id: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  confidence: number;
}
```

**Example**:
```typescript
const profile = await analyzeVoiceProfile(audioBase64);
console.log(profile);
// {
//   pitch_range: { min_hz: 85, max_hz: 255 },
//   speech_pace_wpm: 140,
//   tone: "Energetic and youthful",
//   unique_traits: ["Slight rasp", "Fast-paced"],
//   recommended_voice_id: "Puck",
//   confidence: 0.87
// }
```

---

#### `generateSpeech()`

Generates TTS audio with voice cloning capabilities.

**Signature**:
```typescript
export const generateSpeech = async (
  script: string, 
  voiceName: string
): Promise<string>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `script` | `string` | Yes | Text to synthesize |
| `voiceName` | `string` | Yes | Voice ID: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr' |

**Returns**: `Promise<string>` - Base64-encoded audio

**Example**:
```typescript
const audioBase64 = await generateSpeech(
  "Welcome to the future!",
  "Puck"
);

// Play audio
const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
audio.play();
```

**Models Used**:
- `gemini-2.5-flash-preview-tts`

---

#### `generateVisemes()`

Creates phoneme-based lip-sync data for animation.

**Signature**:
```typescript
export const generateVisemes = async (
  script: string, 
  totalDurationSeconds: number
): Promise<Viseme[]>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `script` | `string` | Yes | Speech text |
| `totalDurationSeconds` | `number` | Yes | Audio duration |

**Returns**: `Promise<Viseme[]>`

```typescript
interface Viseme {
  phoneme: string;
  viseme_shape: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  start_time: number;  // seconds
  end_time: number;    // seconds
  openness: number;    // 0.0 to 1.0
}
```

**Viseme Shapes**:

| Shape | Mouth Position | Phonemes | Openness |
|-------|---------------|----------|----------|
| A | Wide open | ah, aw | 0.8 |
| B | Closed lips | b, m, p | 0.0 |
| C | Partially open | ch, j, sh | 0.3 |
| D | Mid-open | d, t, n | 0.6 |
| E | Front vowel | e, i | 0.3 |
| F | Labiodental | f, v | 0.2 |
| G | Back | g, k | 0.4 |

**Example**:
```typescript
const visemes = await generateVisemes(
  "Hello world",
  1.5 // 1.5 seconds
);

console.log(visemes);
// [
//   { phoneme: "h", viseme_shape: "E", start_time: 0.0, end_time: 0.1, openness: 0.3 },
//   { phoneme: "eh", viseme_shape: "E", start_time: 0.1, end_time: 0.3, openness: 0.3 },
//   ...
// ]
```

---

#### `analyzeMouthCoordinates()`

Detects mouth region in character image for lip-sync overlay.

**Signature**:
```typescript
export const analyzeMouthCoordinates = async (
  imageBase64: string
): Promise<MouthData>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imageBase64` | `string` | Yes | Base64-encoded character image |

**Returns**: `Promise<MouthData>`

```typescript
interface MouthData {
  mouth_center: { x: number; y: number };
  mouth_width_pixels: number;
  mouth_height_pixels: number;
  max_open: number;          // Style-specific (0.0-1.0)
  character_type: string;    // e.g., "anime", "realistic"
}
```

**Example**:
```typescript
const mouthData = await analyzeMouthCoordinates(imageBase64);
console.log(mouthData);
// {
//   mouth_center: { x: 512, y: 768 },
//   mouth_width_pixels: 64,
//   mouth_height_pixels: 32,
//   max_open: 0.7,
//   character_type: "anime"
// }
```

---

## 🧊 Tripo3D Service API

**File**: `services/tripoService.ts`

### Configuration

```typescript
const TRIPO_API_BASE = '/tripo-api/v2/openapi';
const TRIPO_API_KEY = 'tsk_...'; // Replace with environment variable
```

**Development Proxy** (Vite):
```typescript
proxy: {
  '/tripo-api': {
    target: 'https://api.tripo3d.ai',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/tripo-api/, ''),
  },
}
```

---

### Core Functions

#### `uploadImageToTripo()`

Uploads image to Tripo3D and receives a file token.

**Signature**:
```typescript
export const uploadImageToTripo = async (
  imageBase64: string, 
  mimeType: string = 'image/png'
): Promise<string>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imageBase64` | `string` | Yes | Base64-encoded image |
| `mimeType` | `string` | No | Default: 'image/png' |

**Returns**: `Promise<string>` - File token for task creation

**API Endpoint**: `POST /v2/openapi/upload`

**Request Format**: `multipart/form-data`

**Example**:
```typescript
const imageToken = await uploadImageToTripo(
  "iVBORw0KGgoAAAANSUhEUgAA...",
  "image/png"
);

console.log(imageToken); // "tok_abc123..."
```

**Error Handling**:
```typescript
try {
  const token = await uploadImageToTripo(imageBase64);
} catch (error) {
  if (error.message.includes("Upload failed: 413")) {
    console.error("Image too large (max 10MB)");
  } else {
    console.error("Upload error:", error.message);
  }
}
```

---

#### `startImageToModelTask()`

Initiates 3D model generation task.

**Signature**:
```typescript
export const startImageToModelTask = async (
  imageToken: string,
  options?: {
    modelVersion?: string;
    texture?: boolean;
    pbr?: boolean;
    autoSize?: boolean;
  }
): Promise<string>
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `imageToken` | `string` | Yes | - | Token from `uploadImageToTripo()` |
| `options.modelVersion` | `string` | No | `'v2.5-20250123'` | Model version |
| `options.texture` | `boolean` | No | `true` | Include textures |
| `options.pbr` | `boolean` | No | `true` | PBR materials |
| `options.autoSize` | `boolean` | No | `true` | Auto-normalize size |

**Returns**: `Promise<string>` - Task ID

**API Endpoint**: `POST /v2/openapi/task`

**Request Body**:
```json
{
  "type": "image_to_model",
  "model_version": "v2.5-20250123",
  "file": {
    "type": "png",
    "file_token": "tok_abc123..."
  },
  "texture": true,
  "pbr": true,
  "auto_size": true
}
```

**Example**:
```typescript
const taskId = await startImageToModelTask(imageToken, {
  modelVersion: 'v2.5-20250123',
  texture: true,
  pbr: true,
  autoSize: true,
});

console.log(taskId); // "task_xyz789..."
```

---

#### `getTaskStatus()`

Retrieves current status of a generation task.

**Signature**:
```typescript
export const getTaskStatus = async (
  taskId: string
): Promise<TripoTaskStatus['data']>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | `string` | Yes | Task ID from `startImageToModelTask()` |

**Returns**: `Promise<TripoTaskStatus['data']>`

```typescript
interface TaskData {
  task_id: string;
  type: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'banned' | 'expired' | 'cancelled' | 'unknown';
  input: Record<string, any>;
  output: {
    model?: string;           // Base GLB model URL
    base_model?: string;      // Alternative format
    pbr_model?: string;       // PBR-textured model URL (preferred)
    rendered_image?: string;  // Preview render URL
  };
  progress: number;           // 0-100
  create_time: number;        // Unix timestamp
}
```

**API Endpoint**: `GET /v2/openapi/task/{taskId}`

**Example**:
```typescript
const status = await getTaskStatus(taskId);
console.log(status);
// {
//   task_id: "task_xyz789",
//   status: "running",
//   progress: 45,
//   output: {}
// }
```

---

#### `waitForTaskCompletion()`

Polls task status until completion with progress updates.

**Signature**:
```typescript
export const waitForTaskCompletion = async (
  taskId: string,
  onProgress?: (progress: number, status: string) => void,
  maxWaitMs?: number
): Promise<TripoTaskStatus['data']>
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `taskId` | `string` | Yes | - | Task ID |
| `onProgress` | `function` | No | `undefined` | Progress callback |
| `maxWaitMs` | `number` | No | `300000` | Max wait time (5 min) |

**Returns**: `Promise<TripoTaskStatus['data']>` - Final task data

**Polling Configuration**:
- Interval: 3 seconds
- Timeout: 5 minutes (configurable)

**Example**:
```typescript
const result = await waitForTaskCompletion(
  taskId,
  (progress, status) => {
    console.log(`${status}: ${progress}%`);
    updateUI(progress);
  },
  300000 // 5 minutes
);

console.log(result.output.pbr_model); // GLB model URL
```

**Status Handling**:

| Status | Action |
|--------|--------|
| `queued`, `running` | Continue polling |
| `success` | Return result |
| `failed`, `banned`, `expired`, `cancelled`, `unknown` | Throw error |

---

#### `generate3DModel()` - Complete Pipeline

High-level function orchestrating the entire 3D generation workflow.

**Signature**:
```typescript
export const generate3DModel = async (
  imageBase64: string,
  mimeType?: string,
  onProgress?: (message: string, progress: number) => void
): Promise<{
  modelUrl: string;
  modelBase64?: string;
  pbrModelUrl?: string;
  renderedImageUrl?: string;
}>
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `imageBase64` | `string` | Yes | - | Avatar image |
| `mimeType` | `string` | No | `'image/png'` | Image MIME type |
| `onProgress` | `function` | No | `undefined` | Progress callback |

**Returns**: `Promise<ModelResult>`

```typescript
interface ModelResult {
  modelUrl: string;           // Blob URL (persistent in session)
  modelBase64?: string;       // Base64 data URL (backup)
  pbrModelUrl?: string;       // Original Tripo URL (expires in 5min)
  renderedImageUrl?: string;  // Preview image Blob URL
}
```

**Pipeline Stages**:

| Stage | Progress | Description |
|-------|----------|-------------|
| Upload | 10% | Upload image to Tripo3D |
| Create Task | 20% | Initialize generation |
| Generate | 20-90% | Polling with status updates |
| Download | 92% | Fetch model file |
| Convert | 98% | Create Blob URL |
| Complete | 100% | Return URLs |

**Example**:
```typescript
const result = await generate3DModel(
  imageBase64,
  'image/png',
  (message, progress) => {
    console.log(`[${progress}%] ${message}`);
    setProgress(progress);
    addLog(message);
  }
);

// Use model
const modelViewer = document.createElement('model-viewer');
modelViewer.src = result.modelUrl;

// Download model
const link = document.createElement('a');
link.href = result.modelBase64 || result.modelUrl;
link.download = 'avatar-3d-model.glb';
link.click();
```

**Critical Implementation**: 
Models are downloaded immediately and converted to Blob URLs because Tripo3D URLs expire in 5 minutes.

---

## 📚 Type Definitions

**File**: `types.ts`

### Core Types

#### `GeneratedImage`
```typescript
interface GeneratedImage {
  data: string;      // Base64-encoded image data
  mimeType: string;  // e.g., "image/png", "image/jpeg"
}
```

#### `GenerationLog`
```typescript
interface GenerationLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
```

#### `CritiqueResult`
```typescript
interface CritiqueResult {
  score: number;        // 0-100 quality score
  feedback: string;     // Human-readable explanation
  suggestions: string;  // Improvement recommendations
}
```

#### `GenerationPhase`
```typescript
type GenerationPhase = 
  | 'idle' 
  | 'generating-image' 
  | 'generating-video' 
  | 'generating-3d' 
  | 'complete' 
  | 'error';
```

### Voice Studio Types

#### `VoiceProfile`
```typescript
interface VoiceProfile {
  pitch_range: { min_hz: number; max_hz: number };
  speech_pace_wpm: number;
  tone: string;
  unique_traits: string[];
  recommended_voice_id: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  confidence: number;
}
```

#### `Viseme`
```typescript
interface Viseme {
  phoneme: string;
  viseme_shape: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  start_time: number;
  end_time: number;
  openness: number;
}
```

#### `MouthData`
```typescript
interface MouthData {
  mouth_center: { x: number; y: number };
  mouth_width_pixels: number;
  mouth_height_pixels: number;
  max_open: number;
  character_type: string;
}
```

### Tripo3D Types

#### `TripoTaskResponse`
```typescript
interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
}
```

#### `TripoTaskStatus`
```typescript
interface TripoTaskStatus {
  code: number;
  data: {
    task_id: string;
    type: string;
    status: 'queued' | 'running' | 'success' | 'failed' | 'banned' | 'expired' | 'cancelled' | 'unknown';
    input: Record<string, any>;
    output: {
      model?: string;
      base_model?: string;
      pbr_model?: string;
      rendered_image?: string;
    };
    progress: number;
    create_time: number;
  };
}
```

---

## ⚠️ Error Codes

### Gemini API Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 400 | Invalid request | Malformed prompt or config | Validate input parameters |
| 401 | Unauthorized | Invalid API key | Check `GEMINI_API_KEY` |
| 403 | Forbidden | API key lacks permissions | Enable required APIs in console |
| 429 | Rate limit exceeded | Too many requests | Implement exponential backoff |
| 500 | Internal server error | Gemini service issue | Retry with delay |

### Tripo3D API Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 0 | Success | - | - |
| 400 | Invalid parameters | Bad request body | Verify task configuration |
| 401 | Authentication failed | Invalid API key | Update `TRIPO_API_KEY` |
| 413 | File too large | Image > 10MB | Compress image |
| 429 | Rate limit | Quota exceeded | Wait or upgrade plan |
| 500 | Server error | Tripo3D issue | Retry request |

### Application-Level Errors

```typescript
// No image data
throw new Error("No image data found in response");

// Video generation timeout
throw new Error("Video generation failed after multiple attempts.");

// 3D model timeout
throw new Error('Task timed out');

// Download failure
throw new Error(`Download failed: ${response.status}`);
```

---

## 📊 Rate Limits

### Gemini API

| Resource | Free Tier | Rate Limit |
|----------|-----------|------------|
| **Text Models** | ✅ Available | 15 RPM (requests/min) |
| **Image Generation** | ✅ Available | 2 RPM |
| **Video Generation** | ✅ Limited | 15 RPD (requests/day) |
| **TTS** | ✅ Available | 10 RPM |

**Quota Management**:
```typescript
// Implement rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Between image requests
await delay(30000); // 30 seconds = 2 RPM
```

### Tripo3D API

| Plan | Daily Limit | Concurrent Tasks |
|------|-------------|------------------|
| **Free** | 10 generations | 1 |
| **Basic** | 100 generations | 3 |
| **Pro** | 500 generations | 10 |

**URL Expiration**: All URLs expire in **5 minutes** after generation.

---

## 🔐 Security Best Practices

### API Key Storage

**Development**:
```env
# .env.local
GEMINI_API_KEY=AIzaSy...
TRIPO_API_KEY=tsk_...
```

**Production**: Use backend proxy
```typescript
// Instead of direct API calls
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ prompt, options }),
});
```

### Input Validation

```typescript
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .slice(0, 1000)  // Max length
    .replace(/[<>]/g, '');  // Remove HTML tags
};

const validateImageSize = (base64: string): boolean => {
  const sizeInBytes = (base64.length * 3) / 4;
  const maxSize = 10 * 1024 * 1024; // 10MB
  return sizeInBytes < maxSize;
};
```

---

## 📞 Support

**Documentation Issues**: [GitHub Issues](https://github.com/tpandya42/Incarnate/issues)  
**API Questions**: See official documentation
- [Gemini API Docs](https://ai.google.dev/docs)
- [Tripo3D API Docs](https://platform.tripo3d.ai/docs)

---

<div align="center">
  <p><strong>API Reference v1.0</strong></p>
  <p>Last Updated: November 29, 2025</p>
</div>
