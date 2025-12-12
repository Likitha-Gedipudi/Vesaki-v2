export interface UserPhoto {
  id: string;
  url: string; // base64 data url
  createdAt: number;
}

export interface GeneratedLook {
  id: string;
  originalPhotoId: string;
  prompt: string;
  resultUrl: string;
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