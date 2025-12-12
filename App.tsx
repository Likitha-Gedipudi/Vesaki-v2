import React, { useState, useEffect } from 'react';
import { UserPhoto, GeneratedLook } from './types';
import { ModelGallery } from './components/ModelGallery';
import { FashionStudio } from './components/FashionStudio';

const App: React.FC = () => {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedLook[]>([]);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);

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
    // Close mobile sidebar after selection/add
    setIsLeftSidebarOpen(false);
  };

  const handleRemovePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    safeSaveToStorage('smm_photos', updated);
    if (selectedPhotoId === id) setSelectedPhotoId(null);
  };

  const handleSelectPhoto = (id: string) => {
      setSelectedPhotoId(id);
      setIsLeftSidebarOpen(false); // Close sidebar on mobile on select
  };

  const handleSaveLook = (look: GeneratedLook) => {
      // Keep only last 10 looks to manage storage size better with compression
      const MAX_HISTORY = 10;
      const updated = [look, ...history].slice(0, MAX_HISTORY);
      
      setHistory(updated);
      safeSaveToStorage('smm_history', updated);
  };

  // NEW: Update an existing look (e.g. adding a video URL to it)
  const handleUpdateLook = (updatedLook: GeneratedLook) => {
      const updatedHistory = history.map(look => 
          look.id === updatedLook.id ? updatedLook : look
      );
      setHistory(updatedHistory);
      safeSaveToStorage('smm_history', updatedHistory);
  };

  const handleRemoveLook = (id: string) => {
    const updated = history.filter(l => l.id !== id);
    setHistory(updated);
    safeSaveToStorage('smm_history', updated);
  };

  // NEW: Feature to take a result and make it the new source
  const handlePromoteToModel = (imageUrl: string) => {
      const newPhoto: UserPhoto = {
          id: crypto.randomUUID(),
          url: imageUrl,
          createdAt: Date.now()
      };
      handleAddPhoto(newPhoto);
  };

  // NEW: Hard Reset Function
  const handleHardReset = () => {
      if (window.confirm("WARNING: This will delete ALL photos, generated looks, and history. This action cannot be undone.\n\nAre you sure you want to reset the studio?")) {
          try {
              localStorage.removeItem('smm_photos');
              localStorage.removeItem('smm_history');
              // Clear state
              setPhotos([]);
              setHistory([]);
              setSelectedPhotoId(null);
              // Force sidebar reset
              setIsLeftSidebarOpen(false);
          } catch (e) {
              console.error("Failed to clear storage", e);
              alert("Could not fully clear storage.");
          }
      }
  };

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId);

  return (
    <div className="h-[100dvh] w-full bg-[#FDFDFD] flex flex-col text-gray-900 overflow-hidden font-sans">
      
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 relative">
         <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button 
                onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                className="md:hidden text-gray-500 hover:text-black focus:outline-none"
            >
                <span className="material-symbols-outlined text-2xl">
                    {isLeftSidebarOpen ? 'close' : 'menu'}
                </span>
            </button>

            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-serif font-bold text-xl shadow-lg shadow-gray-200">
                    V
                </div>
                <span className="font-serif font-bold text-xl tracking-tight">Vesaki</span>
            </div>
         </div>

         {/* Right Side Header Actions */}
         <div className="flex items-center gap-2">
            <button 
                onClick={handleHardReset}
                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-100"
                title="Clear all data and start over"
            >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span className="hidden md:inline">Reset Studio</span>
            </button>
         </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
         
         {/* Sidebar: My Models (Responsive) */}
         {/* Desktop: Always visible. Mobile: Absolute with slide animation */}
         <aside 
            className={`
                w-72 bg-white border-r border-gray-100 flex flex-col shrink-0 z-20 
                md:relative md:translate-x-0 md:flex
                fixed inset-y-0 left-0 h-full shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
                ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
         >
            <ModelGallery 
                photos={photos} 
                selectedPhotoId={selectedPhotoId}
                onSelect={handleSelectPhoto}
                onAdd={handleAddPhoto}
                onRemove={handleRemovePhoto}
            />
         </aside>

         {/* Backdrop for mobile sidebar */}
         {isLeftSidebarOpen && (
             <div 
                className="fixed inset-0 bg-black/20 z-10 md:hidden backdrop-blur-sm"
                onClick={() => setIsLeftSidebarOpen(false)}
             ></div>
         )}

         {/* Main Stage: Fashion Studio */}
         <main className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative w-full min-h-0">
            <FashionStudio 
                selectedPhoto={selectedPhoto} 
                onSaveLook={handleSaveLook}
                onUpdateLook={handleUpdateLook}
                onPromoteToModel={handlePromoteToModel}
                history={history}
                onRemoveLook={handleRemoveLook}
            />
         </main>

      </div>
    </div>
  );
};

export default App;