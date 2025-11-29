import { config } from '../config/index.js';
import type {
  TripoTaskResponse,
  TripoTaskStatus,
  TripoUploadResponse,
  Model3DResult,
} from '../types/index.js';

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// Image Upload
// ============================================

export const uploadImageToTripo = async (
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<string> => {
  console.log('[Tripo] Uploading image, size:', imageBase64.length, 'chars');

  // Convert base64 to buffer
  const buffer = Buffer.from(imageBase64, 'base64');
  console.log('[Tripo] Buffer size:', buffer.length, 'bytes');

  // Create form data with native fetch (Node.js 18+)
  const extension = mimeType.split('/')[1] || 'png';
  const blob = new Blob([buffer], { type: mimeType });
  
  const formData = new FormData();
  formData.append('file', blob, `avatar.${extension}`);

  console.log('[Tripo] Making upload request to:', `${config.tripoApiBase}/upload`);
  
  const response = await fetch(`${config.tripoApiBase}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.tripoApiKey}`,
    },
    body: formData,
  });

  console.log('[Tripo] Upload response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Tripo] Upload error:', errorText);
    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as TripoUploadResponse;
  console.log('[Tripo] Upload result:', result);

  if (result.code !== 0) {
    throw new Error(`Upload error: code ${result.code}`);
  }

  console.log('[Tripo] Image token:', result.data.image_token);
  return result.data.image_token;
};

// ============================================
// Task Creation
// ============================================

export const startImageToModelTask = async (
  imageToken: string,
  options: {
    modelVersion?: string;
    texture?: boolean;
    pbr?: boolean;
    autoSize?: boolean;
  } = {}
): Promise<string> => {
  const {
    modelVersion = 'v2.5-20250123',
    texture = true,
    pbr = true,
    autoSize = true,
  } = options;

  const requestBody = {
    type: 'image_to_model',
    model_version: modelVersion,
    file: {
      type: 'png',
      file_token: imageToken,
    },
    texture,
    pbr,
    auto_size: autoSize,
  };

  console.log('[Tripo] Starting task with body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${config.tripoApiBase}/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.tripoApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[Tripo] Task creation response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Tripo] Task creation error:', errorText);
    throw new Error(`Task creation failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as TripoTaskResponse;
  console.log('[Tripo] Task creation result:', result);

  if (result.code !== 0) {
    throw new Error(`Task creation error: code ${result.code}`);
  }

  console.log('[Tripo] Task ID:', result.data.task_id);
  return result.data.task_id;
};

// ============================================
// Task Status
// ============================================

export const getTaskStatus = async (taskId: string): Promise<TripoTaskStatus['data']> => {
  const response = await fetch(`${config.tripoApiBase}/task/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.tripoApiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Tripo] Get task error:', errorText);
    throw new Error(`Get task failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as TripoTaskStatus;
  console.log('[Tripo] Task status:', result.data.status, 'progress:', result.data.progress);

  if (result.code !== 0) {
    throw new Error(`Get task error: code ${result.code}`);
  }

  return result.data;
};

// ============================================
// Task Polling
// ============================================

export const waitForTaskCompletion = async (
  taskId: string,
  onProgress?: (progress: number, status: string) => void,
  maxWaitMs: number = 300000 // 5 minutes
): Promise<TripoTaskStatus['data']> => {
  const startTime = Date.now();
  const pollInterval = 3000; // 3 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getTaskStatus(taskId);

    if (onProgress) {
      onProgress(status.progress, status.status);
    }

    if (status.status === 'success') {
      return status;
    }

    if (['failed', 'banned', 'expired', 'cancelled', 'unknown'].includes(status.status)) {
      throw new Error(`Task ${status.status}: ${taskId}`);
    }

    await delay(pollInterval);
  }

  throw new Error('Task timed out');
};

// ============================================
// Complete 3D Model Generation Flow
// ============================================

export const generate3DModel = async (
  imageBase64: string,
  mimeType: string = 'image/png',
  onProgress?: (message: string, progress: number) => void
): Promise<Model3DResult> => {
  // Step 1: Upload image
  onProgress?.('Uploading image to Tripo3D...', 10);
  const imageToken = await uploadImageToTripo(imageBase64, mimeType);

  // Step 2: Start generation task
  onProgress?.('Starting 3D model generation...', 20);
  const taskId = await startImageToModelTask(imageToken, {
    modelVersion: 'v2.5-20250123',
    texture: true,
    pbr: true,
    autoSize: true,
  });

  // Step 3: Wait for completion
  const result = await waitForTaskCompletion(taskId, (progress, status) => {
    const adjustedProgress = 20 + (progress * 0.7); // Map 0-100 to 20-90
    onProgress?.(`Generating 3D model (${status})...`, adjustedProgress);
  });

  if (!result.output.model && !result.output.pbr_model) {
    throw new Error('No model URL in response');
  }

  onProgress?.('3D model ready!', 100);

  return {
    taskId,
    status: result.status,
    modelUrl: result.output.pbr_model || result.output.model,
    pbrModelUrl: result.output.pbr_model,
    renderedImageUrl: result.output.rendered_image,
    progress: 100,
  };
};

// ============================================
// Download Helper (for model files)
// ============================================

export const downloadModelFile = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

// ============================================
// Get Model as Base64
// ============================================

export const getModelAsBase64 = async (url: string): Promise<string> => {
  const buffer = await downloadModelFile(url);
  return buffer.toString('base64');
};
