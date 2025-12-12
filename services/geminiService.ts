import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// NEW: Compress and resize image to avoid localStorage quota limits
export const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Resize to reasonable max width
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Canvas context failed"));
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Return as JPEG with 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

// Modified to use compression if raw file is passed, or just extract base64 if needed
export const fileToGenerativePart = async (file: File): Promise<string> => {
  const dataUrl = await compressImage(file);
  // Remove data url prefix (e.g. "data:image/jpeg;base64,")
  return dataUrl.split(',')[1];
};

// Helper to parse base64 and mime type from data URL
const parseDataUrl = (dataUrl: string) => {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  }
  // Fallback if provided as raw base64 or other format
  return {
      mimeType: 'image/jpeg',
      data: dataUrl
  };
};

/**
 * THE SEMANTIC ANATOMIST ALGORITHM
 * 
 * Handles complex edge cases (e.g. Dress -> Top) by explicitly defining
 * anatomical boundaries before generation.
 */
const refinePromptWithSegmentation = async (userPrompt: string): Promise<string> => {
    // 1. We use the Flash Text model to act as the "Logic Layer"
    const logicModel = "gemini-2.5-flash";

    const systemInstruction = `
    You are an Expert Fashion Image Prompt Engineer. 
    Your goal is to prevent "Semantic Bleed" where a request for a 'Top' accidentally colors the 'Pants' or 'Skirt' because the original image was a Dress.

    Analyze the USER REQUEST and output a STRICT VISUAL INSTRUCTION BLOCK.

    EDGE CASES TO HANDLE:
    1. Dress -> Top: Must explicitly command a waistline cut.
    2. Long Coat -> Short Jacket: Must explicitly command removing lower tails (revealing legs).
    3. Pants -> Skirt: Must remove inner leg seams.
    4. Sleeves: Long -> Short (Generate skin), Short -> Long (Generate fabric).
    5. Tucked vs Untucked: Define waistline visibility.

    Output format: Just the enhanced string instructions to append to the image generator.
    `;

    const analysisPrompt = `
    User Request: "${userPrompt}"

    Task:
    1. Identify the Target Zone (e.g., Upper Body, Lower Body, Feet, Head).
    2. Identify the Preservation Zone (what must NOT change).
    3. Write specific negative constraints for "Monolithic Garments" (Dresses, Jumpsuits, Coats).

    If the user asks for a TOP (shirt, blouse, jacket):
    - explicitly instruct to STOP at the waist.
    - explicitly instruct that the bottom half must remain distinct (even if it was a dress, convert bottom to matching skirt or pants, do not extend top color down).

    Return a concise, powerful prompt addendum starting with "IMPORTANT VISUAL RULES:".
    `;

    try {
        const response = await ai.models.generateContent({
            model: logicModel,
            contents: {
                parts: [
                    { text: systemInstruction },
                    { text: analysisPrompt }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        console.warn("Prompt refinement failed, using raw prompt", e);
        return "";
    }
};

export const generateFashionFromPrompt = async (baseImage: string, promptText: string, garmentImage?: string): Promise<{ resultUrl: string | null }> => {
  // Use stable image model to avoid 403 Permission Denied on restricted models
  const imageModel = "gemini-2.5-flash-image";
  const parts: any[] = [];

  // 1. Process Base Image (The Person)
  let imgData = baseImage;
  let imgMime = "image/jpeg";

  if (baseImage.startsWith('data:')) {
      const parsed = parseDataUrl(baseImage);
      if (parsed) {
          imgData = parsed.data;
          imgMime = parsed.mimeType;
      }
  }

  parts.push({
    inlineData: {
      mimeType: imgMime,
      data: imgData
    }
  });

  // 2. Process Garment Image (Optional) or Text Prompt
  let finalPrompt = "";
  
  // EXECUTE ALGORITHM: Refine prompt for text-based edits to handle segmentation
  let segmentationRules = "";
  if (!garmentImage && promptText) {
      segmentationRules = await refinePromptWithSegmentation(promptText);
  }

  if (garmentImage) {
      // --- IMAGE TO IMAGE TRY-ON MODE ---
      let garmentData = garmentImage;
      let garmentMime = "image/jpeg";
      if (garmentImage.startsWith('data:')) {
          const parsed = parseDataUrl(garmentImage);
          if (parsed) {
              garmentData = parsed.data;
              garmentMime = parsed.mimeType;
          }
      }
      
      parts.push({
          inlineData: {
              mimeType: garmentMime,
              data: garmentData
          }
      });

      finalPrompt = `
        ROLE: Expert High-End Fashion Retoucher and Virtual Try-On Specialist.
        
        TASK: Perform a hyper-realistic virtual try-on. Transfer the garment shown in the SECOND image onto the person shown in the FIRST image.

        STRICT EXECUTION PROTOCOL:
        1. **IDENTITY PRESERVATION (CRITICAL)**: 
           - You MUST preserve the person's face, hair, skin tone, body shape, and pose from the FIRST image exactly. 
           - Do NOT regenerate the face. The output must look like the same person.
        
        2. **GARMENT FIDELITY**:
           - Analyze the SECOND image (the garment). Note its fabric texture, cut, pattern, buttons, zippers, and drape.
           - Apply this exact garment to the person. Do not create a generic version.
        
        3. **PHYSICS & LIGHTING**:
           - The garment must drape naturally over the person's body shape from Image 1.
           - Match the lighting, shadows, and color temperature of the new garment to the environment of Image 1.

        4. **CONTEXT AWARENESS**:
           - If the new item is a TOP: Keep the person's existing pants/skirt unless they clash horribly.
           - If the new item is an ACCESSORY (bag, glasses): Do NOT change the person's clothes. Just add the item.
           - If the new item is a DRESS/FULL SUIT: Replace the entire outfit.

        NEGATIVE CONSTRAINTS:
        - DO NOT turn the image into a cartoon or illustration. Output must be PHOTOREALISTIC.
        - DO NOT change the background.
        - DO NOT change the person's gender or age.

        ${promptText ? `USER OVERRIDE INSTRUCTION: "${promptText}"` : ''}
      `;
  } else {
      // --- TEXT TO IMAGE EDITING MODE (With Semantic Anatomist) ---
      finalPrompt = `
        ROLE: Professional Photo Editor and Stylist.
        
        TASK: Edit the clothing of the person in the input image based on the text description provided below.

        USER REQUEST: "${promptText}"

        ${segmentationRules}

        EXECUTION GUIDELINES:
        1. **IDENTITY LOCK**: 
           - The person's face, hair, features, and body pose must remain 100% IDENTICAL to the source image. 
           - The background must remain 100% IDENTICAL.
           - Only the specific clothing articles mentioned in the request should change.

        2. **SMART REPLACEMENT**:
           - If the user says "wear a red leather jacket", put a red leather jacket OVER the existing top.
           - If the user says "add sunglasses", do NOT change the shirt or pants.
           - If the user says "change pants to jeans", keep the shirt exactly as it is.

        3. **PHOTOREALISM**:
           - The material must look tangible and real.
           - Lighting on the new clothing must match the original photo's lighting direction and intensity.

        NEGATIVE CONSTRAINTS:
        - No cartoons. No distorted faces. No extra limbs.
        - Do not change items that were not targeted by the prompt.

        OUTPUT: A single, high-quality, photorealistic JPEG image.
      `;
  }

  parts.push({ text: finalPrompt });

  // EXECUTE IMAGE GENERATION
  let resultUrl = null;
  try {
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: { parts },
      // Note: We do NOT use tools here to avoid permission issues with the image model
    });

    if (response.candidates && response.candidates[0].content) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
  } catch (error) {
    console.error("Error generating fashion look:", error);
    throw error;
  }
    
  return { resultUrl };
};

export const generate360Video = async (imageUrl: string): Promise<string | null> => {
    // 1. Check API Key (Required for Veo)
    if ((window as any).aistudio) {
        if (!await (window as any).aistudio.hasSelectedApiKey()) {
            await (window as any).aistudio.openSelectKey();
            // Proceed assuming the user selected a key
        }
    }

    // 2. Create fresh instance with the (potentially new) key
    const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 3. Prepare Image Input
    let imgData = imageUrl;
    let imgMime = "image/jpeg";
    if (imageUrl.startsWith('data:')) {
        const parsed = parseDataUrl(imageUrl);
        if (parsed) {
             imgData = parsed.data;
             imgMime = parsed.mimeType;
        }
    }

    try {
        let operation = await veoAi.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: "Cinematic 360 degree rotating camera orbit shot of this person, showing the outfit from all angles, studio fashion lighting, 4k, smooth motion, photorealistic.",
            image: {
                imageBytes: imgData,
                mimeType: imgMime
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16'
            }
        });

        // 4. Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await veoAi.operations.getVideosOperation({operation: operation});
        }

        // 5. Fetch Video Bytes
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) return null;

        const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        return URL.createObjectURL(blob);

    } catch (e: any) {
        console.error("Video generation failed", e);
        if (e.message && e.message.includes("Requested entity was not found") && (window as any).aistudio) {
            // API Key might be invalid or project issue
             await (window as any).aistudio.openSelectKey();
             throw new Error("Please select a valid API Key for Video Generation.");
        }
        throw e;
    }
};

export const analyzeClothingImage = async (base64Image: string): Promise<Partial<ClothingItem>> => {
    let imgData = base64Image;
    let imgMime = "image/jpeg";

    if (base64Image.startsWith('data:')) {
        const parsed = parseDataUrl(base64Image);
        if (parsed) {
            imgData = parsed.data;
            imgMime = parsed.mimeType;
        }
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: imgMime, data: imgData } },
                { text: "Analyze this clothing item image. Extract details into JSON." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING, description: "Category like Shirt, Pants, Dress, Shoes, Accessory" },
                    description: { type: Type.STRING, description: "Short description of the item" },
                    color: { type: Type.STRING, description: "Primary color" },
                    brand: { type: Type.STRING, description: "Brand name if visible, otherwise 'Unknown'" },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 style tags e.g. casual, formal, summer" }
                }
            }
        }
    });

    if (response.text) {
        try {
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Failed to parse JSON", e);
        }
    }
    return {};
};

export const generateOutfitSuggestions = async (wardrobe: ClothingItem[], userProfile: UserProfile, occasion: string): Promise<{name: string, itemIds: string[], reasoning: string}[]> => {
    const wardrobeList = wardrobe.map(item => `- ID: ${item.id}, ${item.color} ${item.category} (${item.description})`).join('\n');
    
    const prompt = `
    Role: Personal Stylist.
    User Profile: Name: ${userProfile.name}, Style: ${userProfile.stylePreferences.join(', ')}.
    Occasion: ${occasion}.
    
    Available Wardrobe:
    ${wardrobeList}
    
    Task: Create up to 3 outfit combinations from the available wardrobe suitable for the occasion.
    Return JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "Creative name for the outfit" },
                        itemIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of IDs of the items used" },
                        reasoning: { type: Type.STRING, description: "Why this works for the occasion" }
                    }
                }
            }
        }
    });

    if (response.text) {
        try {
            return JSON.parse(response.text);
        } catch (e) {
             console.error("Failed to parse JSON", e);
        }
    }
    return [];
};

export const generateTryOn = async (userImage: string, items: ClothingItem[]): Promise<string | null> => {
    const itemsDesc = items.map(i => `${i.color} ${i.description}`).join(', ');
    // Enhanced Prompt for Wardrobe Mixer Try-On
    const prompt = `
    ROLE: Virtual Fitting Room AI.
    TASK: Dress the person in the input image in the following outfit: ${itemsDesc}.
    
    STRICT RULES:
    1. Keep the person's face and body shape EXACTLY the same.
    2. Render the new clothing items photorealistically.
    3. Ensure layers are logical (e.g., jacket over shirt).
    4. Do not change the background.
    `;
    
    // Reuse the logic from generateFashionFromPrompt but with specific items description
    const result = await generateFashionFromPrompt(userImage, prompt);
    return result.resultUrl;
};