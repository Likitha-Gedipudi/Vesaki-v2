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

export const generateFashionFromPrompt = async (baseImage: string, promptText: string): Promise<string | null> => {
  const model = "gemini-2.5-flash-image";
  const parts: any[] = [];

  // 1. Process Base Image
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

  // 2. Construct Prompt
  const prompt = `
    The user has provided an image of a person.
    Task: Generate a new photorealistic image of this SAME person, but changing their outfit.
    
    Outfit Request: ${promptText}
    
    Requirements:
    - Preserve the person's identity, face, hair, body shape, and pose exactly.
    - Only change the clothing to match the request.
    - Maintain the lighting and style of the original photo.
    - High quality, fashion photography style.
  `;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
    });

    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating fashion look:", error);
    throw error;
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
    const prompt = `Generate a photorealistic image of the person in the input image wearing this outfit: ${itemsDesc}. Preserve the person's identity and pose exactly.`;
    
    // Reuse the logic from generateFashionFromPrompt but with specific items description
    return generateFashionFromPrompt(userImage, prompt);
};