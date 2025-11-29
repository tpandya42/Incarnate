
import { GoogleGenAI, VideoGenerationReferenceImage, VideoGenerationReferenceType, Type } from "@google/genai";
import { CritiqueResult } from "../types";

export interface GeneratedImage {
  data: string;
  mimeType: string;
}

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 1. Optimize Prompt (Multimodal: Text + Optional User Image)
export const optimizePrompt = async (
  name: string,
  description: string,
  style: string,
  scenario: string,
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY',
  userImageBase64?: string
): Promise<string> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";
  
  // Construct instructions based on background mode
  let backgroundInstruction = "";
  if (backgroundMode === 'STUDIO') {
    backgroundInstruction = "1. It must ask for a neutral, solid background (dark grey or black) to make it easy for the video model to understand the 3D form.";
  } else if (backgroundMode === 'IMMERSIVE') {
    backgroundInstruction = `1. The character MUST be integrated into the requested scenario: "${scenario}". The background should be highly detailed and match the environment description.`;
  } else if (backgroundMode === 'GAMEPLAY') {
    backgroundInstruction = `1. The image must look like a third-person video game screenshot (gameplay view). The character is in the scenario: "${scenario}". Include environmental details consistent with a game level.`;
  }

  const textPrompt = `
    You are an expert concept artist and prompt engineer.
    I need to generate a character reference sheet for a video generation model.
    
    Character Name: ${name}
    Description: ${description}
    Art Style: ${style}
    Scenario/Vibe: ${scenario}

    ${userImageBase64 ? "CRITICAL INSTRUCTION: The user has provided a reference image containing a specific face/person. The output character MUST bear a strong facial resemblance to this person (maintain likeness, ethnicity, and facial structure) while adapting them into the requested Art Style and costume." : ""}

    Task: Write a highly detailed image generation prompt. 
    The prompt must describe a "Character Turnaround Sheet" featuring the character in a full-body view. 
    It should include a front view, side view, and back view arranged horizontally.
    
    Key requirements for the output prompt:
    ${backgroundInstruction}
    2. It must specify high fidelity, perfect lighting, 4k resolution, and clear details.
    3. Focus heavily on the visual aesthetic defined by the style.
    4. Ensure the character design is consistent across all views.
    ${userImageBase64 ? "5. Emphasize that the face must match the reference image provided." : ""}

    Return ONLY the raw prompt text, no markdown formatting or explanations.
  `;

  const contents: any[] = [{ text: textPrompt }];
  
  if (userImageBase64) {
    contents.push({
      inlineData: {
        mimeType: 'image/jpeg', 
        data: userImageBase64
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: contents,
  });

  return response.text?.trim() || "";
};

// 2. Critique Loop: Analyze generated image against brief
export const critiqueGeneratedImage = async (
  originalBrief: string,
  generatedImage: GeneratedImage
): Promise<CritiqueResult> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";

  const prompt = `
    You are a Senior Art Director. 
    Compare the generated image (attached) with the original brief: "${originalBrief}".
    
    Evaluate 3 criteria:
    1. Accuracy to description (and likeness to face if implied).
    2. Consistency of the character views (front/side/back).
    3. Visual quality (clarity, lighting).

    Provide a JSON response with:
    - score: integer (0-100)
    - feedback: short string explaining the main issue or success.
    - suggestions: specific details to add to the prompt to fix issues.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      { text: prompt },
      { 
        inlineData: {
          mimeType: generatedImage.mimeType,
          data: generatedImage.data
        }
      }
    ],
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
  });

  const text = response.text;
  if (!text) throw new Error("No critique returned");
  return JSON.parse(text) as CritiqueResult;
};

// 3. Refine Prompt based on Critique OR User Feedback
export const refinePrompt = async (
  currentPrompt: string,
  critique: CritiqueResult,
  userFeedback?: string
): Promise<string> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";

  let specificInstructions = `
    Critique of previous output: "${critique.feedback}"
    Suggestions for improvement: "${critique.suggestions}"
  `;

  if (userFeedback) {
    specificInstructions += `\n\nUSER FEEDBACK (HIGHEST PRIORITY): "${userFeedback}"\nMake sure to incorporate this feedback immediately.`;
  }

  const prompt = `
    You are an expert Prompt Engineer.
    
    Current Prompt: "${currentPrompt}"
    
    ${specificInstructions}
    
    Task: Rewrite the current prompt to address the critique/feedback and improve the output quality. 
    Keep the core requirements (Character Turnaround Sheet, background instructions, 4k).
    Enhance the descriptive details based on the suggestions.
    
    Return ONLY the raw new prompt text.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text?.trim() || currentPrompt;
};

// 4. Generate Image (Accepts reference image for direct conditioning)
export const generateAvatarImage = async (
  optimizedPrompt: string, 
  referenceImageBase64?: string
): Promise<GeneratedImage> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-image-preview";

  const contents: any[] = [{ text: optimizedPrompt }];

  if (referenceImageBase64) {
    contents.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: referenceImageBase64
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: contents,
    config: {
      imageConfig: {
        aspectRatio: "16:9", 
        imageSize: "2K",   
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png'
      };
    }
  }

  throw new Error("No image data found in response");
};

// 5. Generate Video (With Retry Logic)
export const generateAvatarVideo = async (
  referenceImage: GeneratedImage,
  characterName: string,
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY',
  scenario: string
): Promise<string> => {
  const ai = getAiClient();
  const model = "veo-3.1-generate-preview";

  const referenceImagesPayload: VideoGenerationReferenceImage[] = [
    {
      image: {
        imageBytes: referenceImage.data,
        mimeType: referenceImage.mimeType,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    }
  ];

  let prompt = "";
  
  if (backgroundMode === 'STUDIO') {
    prompt = `Cinematic 360-degree turntable shot of the character. Smooth camera rotation around the subject. Neutral studio lighting. 4k.`;
  } else if (backgroundMode === 'IMMERSIVE') {
    prompt = `Cinematic 360-degree camera orbit around the character in a ${scenario} environment. Detailed background, atmospheric lighting. 4k.`;
  } else {
    // GAMEPLAY
    prompt = `Video game character showcase. 360-degree rotating camera view of the character in a ${scenario}. Third-person perspective, game engine style.`;
  }

  // Retry Loop
  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Video generation attempt ${attempt}/${MAX_RETRIES}`);
      
      let operation = await ai.models.generateVideos({
        model,
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          referenceImages: referenceImagesPayload,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      // Poll for completion
      while (!operation.done) {
        await delay(5000); // 5s polling interval
        operation = await ai.operations.getVideosOperation({ operation });
        
        if (operation.metadata?.state === 'FAILED') {
           const failureMsg = operation.error?.message || "Unknown error";
           throw new Error(`Veo State FAILED: ${failureMsg}`);
        }
      }

      if (operation.error) {
        throw new Error(`Veo Operation Error: ${operation.error.message}`);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video URI not found in response");

      return downloadLink;

    } catch (err: any) {
      lastError = err;
      const isInternalError = err.message?.toLowerCase().includes('internal') || err.message?.toLowerCase().includes('server');
      
      // Only retry on server/internal errors or specific failure states
      if (attempt < MAX_RETRIES && isInternalError) {
        console.warn(`Video generation failed (Attempt ${attempt}), retrying in 4s...`, err);
        await delay(4000); // Wait before retry
        continue;
      }
      
      // If it's a prompt safety error or max retries reached, break loop
      break; 
    }
  }

  throw lastError || new Error("Video generation failed after multiple attempts.");
};
