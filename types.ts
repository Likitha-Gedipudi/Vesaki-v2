export interface UserPhoto {
  id: string;
  url: string; // base64 data url
  createdAt: number;
}

export interface GeneratedLook {
  id: string;
  originalPhotoId: string;
  prompt: string;
  garmentImage?: string; // New: Optional reference image for outfit
  resultUrl: string;
  videoUrl?: string; // New: Optional 360 video url
  timestamp: number;
}

export interface ClothingItem {
  id: string;
  imageUrl: string;
  category: string;
  description: string;
  color: string;
  brand: string;
  tags: string[];
  retailerUrl?: string;
  price?: number;
}

export interface Outfit {
  id: string;
  name: string;
  items: ClothingItem[];
  occasion: string;
  aiReasoning: string;
}

export interface UserProfile {
  name: string;
  userImage?: string;
  bodyType?: string;
  stylePreferences: string[];
}