// Tripo3D API Service for 3D Model Generation

// Use proxy in development to avoid CORS issues
const TRIPO_API_BASE = '/tripo-api/v2/openapi';
const TRIPO_API_KEY = 'tsk_52APRVcfr6saUjNTy475Om4Y_-5TuhUaWc2qM-LmWcq';

export interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
}

export interface TripoTaskStatus {
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

export interface TripoUploadResponse {
  code: number;
  data: {
    image_token: string;
  };
}

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload an image to Tripo3D and get a file token
 */
export const uploadImageToTripo = async (imageBase64: string, mimeType: string = 'image/png'): Promise<string> => {
  // Convert base64 to blob
  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  // Create form data
  const formData = new FormData();
  const extension = mimeType.split('/')[1] || 'png';
  formData.append('file', blob, `avatar.${extension}`);

  const response = await fetch(`${TRIPO_API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
  }

  const result: TripoUploadResponse = await response.json();
  
  if (result.code !== 0) {
    throw new Error(`Upload error: code ${result.code}`);
  }

  return result.data.image_token;
};

/**
 * Start an image-to-model generation task
 */
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

  const response = await fetch(`${TRIPO_API_BASE}/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
    },
    body: JSON.stringify({
      type: 'image_to_model',
      model_version: modelVersion,
      file: {
        type: 'png',
        file_token: imageToken,
      },
      texture,
      pbr,
      auto_size: autoSize,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Task creation failed: ${response.status} - ${errorText}`);
  }

  const result: TripoTaskResponse = await response.json();
  
  if (result.code !== 0) {
    throw new Error(`Task creation error: code ${result.code}`);
  }

  return result.data.task_id;
};

/**
 * Get task status
 */
export const getTaskStatus = async (taskId: string): Promise<TripoTaskStatus['data']> => {
  const response = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Get task failed: ${response.status} - ${errorText}`);
  }

  const result: TripoTaskStatus = await response.json();
  
  if (result.code !== 0) {
    throw new Error(`Get task error: code ${result.code}`);
  }

  return result.data;
};

/**
 * Poll for task completion
 */
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

/**
 * Download a file from URL and return as base64
 */
export const downloadAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Complete flow: Generate 3D model from image
 * Returns blob URLs that won't expire (downloaded immediately)
 */
export const generate3DModel = async (
  imageBase64: string,
  mimeType: string = 'image/png',
  onProgress?: (message: string, progress: number) => void
): Promise<{
  modelUrl: string;
  modelBase64?: string;
  pbrModelUrl?: string;
  renderedImageUrl?: string;
}> => {
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

  const modelSourceUrl = result.output.pbr_model || result.output.model || '';
  
  // Step 4: Download the model immediately (URLs expire in 5 minutes)
  onProgress?.('Downloading 3D model...', 92);
  let modelBase64: string | undefined;
  let localModelUrl = modelSourceUrl;
  
  try {
    modelBase64 = await downloadAsBase64(modelSourceUrl);
    // Create a blob URL from the downloaded data
    const response = await fetch(modelBase64);
    const blob = await response.blob();
    localModelUrl = URL.createObjectURL(blob);
    onProgress?.('3D model downloaded!', 98);
  } catch (downloadErr) {
    console.warn('Could not download model immediately, using direct URL:', downloadErr);
    // Fall back to direct URL (may expire)
  }

  // Also download preview image if available
  let localPreviewUrl = result.output.rendered_image;
  if (result.output.rendered_image) {
    try {
      const previewBase64 = await downloadAsBase64(result.output.rendered_image);
      const response = await fetch(previewBase64);
      const blob = await response.blob();
      localPreviewUrl = URL.createObjectURL(blob);
    } catch (e) {
      console.warn('Could not download preview image');
    }
  }

  return {
    modelUrl: localModelUrl,
    modelBase64,
    pbrModelUrl: result.output.pbr_model,
    renderedImageUrl: localPreviewUrl,
  };
};
