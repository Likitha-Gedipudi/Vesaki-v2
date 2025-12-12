import React, { useState, useEffect } from 'react';
import { UserPhoto, GeneratedLook } from './types';
import { ModelGallery } from './components/ModelGallery';
import { FashionStudio } from './components/FashionStudio';

const App: React.FC = () => {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedLook[]>([]);

  // Load state
  useEffect(() => {
    try {
        const savedPhotos = localStorage.getItem('smm_photos');
        if (savedPhotos) setPhotos(JSON.parse(savedPhotos));
        
        const savedHistory = localStorage.getItem('smm_history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
        console.error("Failed to load from storage", e);
    }
  }, []);

  const safeSaveToStorage = (key: string, data: any[]) => {
      try {
          localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
          if (e instanceof DOMException && e.name === 'QuotaExceededError') {
              console.warn("Storage quota exceeded. Attempting to trim data.");
              // Fallback: Try saving a smaller subset
              if (data.length > 1) {
                  // Keep only the most recent 2 items if full list fails
                  const trimmed = data.slice(0, 2);
                  try {
                       localStorage.setItem(key, JSON.stringify(trimmed));
                  } catch (e2) {
                       // If still fails, clear it to allow app to function in-memory
                       localStorage.removeItem(key);
                       alert("Local storage is full. Your changes will be lost upon refresh unless you delete old items.");
                  }
              }
          }
      }
  };

  const handleAddPhoto = (photo: UserPhoto) => {
    const updated = [photo, ...photos];
    setPhotos(updated);
    safeSaveToStorage('smm_photos', updated);
    // Auto select new photo
    setSelectedPhotoId(photo.id);
  };

  const handleRemovePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    safeSaveToStorage('smm_photos', updated);
    if (selectedPhotoId === id) setSelectedPhotoId(null);
  };

  const handleSaveLook = (look: GeneratedLook) => {
      // Keep only last 5 looks to manage storage size
      const MAX_HISTORY = 5;
      const updated = [look, ...history].slice(0, MAX_HISTORY);
      
      setHistory(updated);
      safeSaveToStorage('smm_history', updated);
  };

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId);

  return (
    <div className="h-screen bg-[#FDFDFD] flex flex-col text-gray-900 overflow-hidden font-sans">
      
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-20">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl shadow-lg shadow-purple-900/20">
                S
            </div>
            <span className="font-serif font-bold text-lg tracking-tight">StyleMix Studio</span>
         </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
         
         {/* Sidebar: My Models */}
         <aside className="w-72 border-r border-gray-100 bg-white flex flex-col shrink-0 z-10 shadow-sm">
            <ModelGallery 
                photos={photos} 
                selectedPhotoId={selectedPhotoId}
                onSelect={setSelectedPhotoId}
                onAdd={handleAddPhoto}
                onRemove={handleRemovePhoto}
            />
         </aside>

         {/* Main Stage: Fashion Studio */}
         <main className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative">
            <FashionStudio 
                selectedPhoto={selectedPhoto} 
                onSaveLook={handleSaveLook}
            />
         </main>

      </div>
    </div>
  );
};

export default App;