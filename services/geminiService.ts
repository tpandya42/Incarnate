
import { GoogleGenAI, VideoGenerationReferenceImage, VideoGenerationReferenceType, Type, Modality } from "@google/genai";
import { CritiqueResult, VoiceProfile, MouthData, Viseme } from "../types";

export interface GeneratedImage {
  data: string;
  mimeType: string;
}

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- EXISTING AVATAR FUNCTIONS ---

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
    I need to generate a single character image optimized for 3D model generation.
    
    Character Name: ${name}
    Description: ${description}
    Art Style: ${style}
    Scenario/Vibe: ${scenario}

    ${userImageBase64 ? "CRITICAL INSTRUCTION: The user has provided a reference image containing a specific face/person. The output character MUST bear a strong facial resemblance to this person (maintain likeness, ethnicity, and facial structure) while adapting them into the requested Art Style and costume." : ""}

    Task: Write a highly detailed image generation prompt for a SINGLE character portrait.
    
    CRITICAL REQUIREMENTS for the output prompt:
    1. Single character only - ONE person in the entire image
    2. Front-facing view, full body visible from head to feet
    3. T-pose or A-pose with arms slightly away from the body (for 3D rigging)
    4. Plain solid color background (white, light gray, or dark gray) - NO complex backgrounds
    5. High fidelity, perfect even lighting, 4k resolution, clear details
    6. Clean silhouette with well-defined edges
    7. No text, no watermarks, no UI elements, no multiple views
    8. Focus heavily on the visual aesthetic defined by the style
    ${userImageBase64 ? "9. The face must match the reference image provided." : ""}

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

// 4. Generate Image
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
        aspectRatio: "1:1",  // Square for 3D model generation
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

// 4b. Generate Clean Single-View Image for 3D conversion (DEPRECATED - now using main generateAvatarImage)
export const generateClean3DReadyImage = async (
  characterDescription: string,
  style: string,
  referenceImageBase64?: string
): Promise<GeneratedImage> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-image-preview";

  const prompt = `
    Generate a single, clean character portrait optimized for 3D model generation.
    
    Character: ${characterDescription}
    Style: ${style}
    
    CRITICAL REQUIREMENTS:
    - Single character only, front-facing view
    - Full body visible from head to feet
    - T-pose or A-pose with arms slightly away from body
    - Plain solid color background (white, light gray, or neutral)
    - No text, no watermarks, no UI elements
    - High detail on the character
    - Clean silhouette with clear edges
    - Consistent lighting from front
    - 4K quality, photorealistic details
    ${referenceImageBase64 ? "- Character should resemble the reference image provided" : ""}
  `;

  const contents: any[] = [{ text: prompt }];

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
        aspectRatio: "1:1", 
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

// 5. Generate Video
export const generateAvatarVideo = async (
  referenceImage: GeneratedImage,
  characterName: string,
  backgroundMode: 'STUDIO' | 'IMMERSIVE' | 'GAMEPLAY',
  scenario: string
): Promise<string> => {
  const ai = getAiClient();
  // Using the supported Fast model instead of unavailable Veo 2.0
  const model = "veo-3.1-fast-generate-preview";

  let prompt = "";
  
  if (backgroundMode === 'STUDIO') {
    prompt = `Cinematic 360-degree turntable shot of the character. Smooth camera rotation around the subject. Neutral studio lighting. 4k.`;
  } else if (backgroundMode === 'IMMERSIVE') {
    prompt = `Cinematic 360-degree camera orbit around the character in a ${scenario} environment. Detailed background, atmospheric lighting. 4k.`;
  } else {
    // GAMEPLAY
    prompt = `Video game character showcase. 360-degree rotating camera view of the character in a ${scenario}. Third-person perspective, game engine style.`;
  }

  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Video generation attempt ${attempt}/${MAX_RETRIES}`);
      
      // Use standard image parameter for Fast models
      let operation = await ai.models.generateVideos({
        model,
        prompt: prompt,
        image: {
          imageBytes: referenceImage.data,
          mimeType: referenceImage.mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await delay(5000); 
        operation = await ai.operations.getVideosOperation({ operation });
        
        if (operation.metadata?.state === 'FAILED') {
           const failureMsg = operation.error?.message || "Unknown error";
           throw new Error(`Veo State FAILED: ${failureMsg}`);
        }
      }

      if (operation.error) {
        throw new Error(`Veo Operation Error: ${operation.error.message}`);
      }

      // Try multiple paths to find the video URL
      const generatedVideo = operation.response?.generatedVideos?.[0] as any;
      const downloadLink = generatedVideo?.video?.uri || 
                          generatedVideo?.uri ||
                          (operation.response as any)?.videos?.[0]?.uri;
      
      if (!downloadLink) {
        console.error("Full Veo response:", JSON.stringify(operation.response, null, 2));
        throw new Error("Video URI not found in response");
      }

      return downloadLink;

    } catch (err: any) {
      lastError = err;
      const isInternalError = err.message?.toLowerCase().includes('internal') || err.message?.toLowerCase().includes('server');
      if (attempt < MAX_RETRIES && isInternalError) {
        console.warn(`Video generation failed (Attempt ${attempt}), retrying in 4s...`, err);
        await delay(4000);
        continue;
      }
      break; 
    }
  }

  throw lastError || new Error("Video generation failed after multiple attempts.");
};

// --- NEW VOICE STUDIO FUNCTIONS ---

// Phase 1: Analyze Voice
export const analyzeVoiceProfile = async (audioBase64: string): Promise<VoiceProfile> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";

  const prompt = `
    Analyze the attached voice sample. 
    Extract the pitch range, speech pace, tone, and unique vocal traits.
    Based on these traits, select the best matching TTS voice ID from this list: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].
    
    - Puck: High energy, youthful
    - Charon: Deep, authoritative
    - Kore: Calm, feminine, soft
    - Fenrir: Aggressive, rough
    - Zephyr: Neutral, balanced, friendly

    Return JSON matching the VoiceProfile interface.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType: "audio/wav", // Assuming WAV from recorder, or use generic
          data: audioBase64
        }
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pitch_range: { type: Type.OBJECT, properties: { min_hz: { type: Type.NUMBER }, max_hz: { type: Type.NUMBER } } },
          speech_pace_wpm: { type: Type.NUMBER },
          tone: { type: Type.STRING },
          unique_traits: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommended_voice_id: { type: Type.STRING, enum: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] },
          confidence: { type: Type.NUMBER }
        }
      }
    }
  });

  if (!response.text) throw new Error("Failed to analyze voice.");
  return JSON.parse(response.text) as VoiceProfile;
};

// Phase 2: Synthesis & Visemes
// We need two calls: one for audio, one for viseme timing (since TTS API doesn't return timestamps yet in this SDK version easily).
export const generateSpeech = async (script: string, voiceName: string): Promise<string> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash-preview-tts";

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: script }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  return base64Audio;
};

export const generateVisemes = async (script: string, totalDurationSeconds: number): Promise<Viseme[]> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";

  // Ask Gemini to estimate timing based on the script length
  const prompt = `
    Break down the following text script into a sequence of phonemes/visemes for lip-sync animation.
    The total audio duration is approximately ${totalDurationSeconds} seconds.
    
    Script: "${script}"

    Map each sound to one of these Viseme Shapes:
    A: Wide open (ah) - openness 0.8
    B: Closed lips (b, m, p) - openness 0.0
    C: Partially open (ch, j) - openness 0.3
    D: Mid-open (d, t, n) - openness 0.6
    E: Front vowel (e, i) - openness 0.3
    F: Labiodental (f, v) - openness 0.2
    G: Back (g, k) - openness 0.4

    Return a JSON array of Viseme objects with precise start_time and end_time (in seconds) that fit within the total duration.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            phoneme: { type: Type.STRING },
            viseme_shape: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
            start_time: { type: Type.NUMBER },
            end_time: { type: Type.NUMBER },
            openness: { type: Type.NUMBER }
          }
        }
      }
    }
  });

  if (!response.text) return [];
  return JSON.parse(response.text) as Viseme[];
};

// Phase 3: Mouth Analysis
export const analyzeMouthCoordinates = async (imageBase64: string): Promise<MouthData> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";

  const prompt = `
    Analyze the attached character image. 
    Identify the exact location and dimensions of the character's mouth for a lip-sync overlay.
    Return pixel coordinates assuming the image dimensions.
    Also estimate the "max_open" ratio (0.0 to 1.0) suitable for this art style (e.g. anime might be smaller than realistic).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/png", 
          data: imageBase64
        }
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mouth_center: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } },
          mouth_width_pixels: { type: Type.NUMBER },
          mouth_height_pixels: { type: Type.NUMBER },
          max_open: { type: Type.NUMBER },
          character_type: { type: Type.STRING }
        }
      }
    }
  });

  if (!response.text) throw new Error("Mouth analysis failed");
  return JSON.parse(response.text) as MouthData;
};
