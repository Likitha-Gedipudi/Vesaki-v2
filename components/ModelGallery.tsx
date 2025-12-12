import React, { useRef } from 'react';
import { UserPhoto } from '../types';
import { compressImage } from '../services/geminiService';

interface ModelGalleryProps {
  photos: UserPhoto[];
  selectedPhotoId: string | null;
  onSelect: (id: string) => void;
  onAdd: (photo: UserPhoto) => void;
  onRemove: (id: string) => void;
}

export const ModelGallery: React.FC<ModelGalleryProps> = ({ photos, selectedPhotoId, onSelect, onAdd, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        // Use compressImage to get a size-optimized Data URL (JPEG)
        const dataUrl = await compressImage(file);
        
        const newPhoto: UserPhoto = {
          id: crypto.randomUUID(),
          url: dataUrl,
          createdAt: Date.now(),
        };
        onAdd(newPhoto);
      } catch (err) {
        console.error(err);
        alert("Failed to upload photo.");
      }
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 bg-white">
        <h2 className="font-serif text-xl text-gray-900 mb-1">My Models</h2>
        <p className="text-xs text-gray-500">Select a photo to style</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {photos.length === 0 && (
            <div className="text-center py-10 px-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <span className="material-symbols-outlined">face</span>
                </div>
                <p className="text-sm text-gray-500">Upload a photo of yourself to get started.</p>
            </div>
        )}

        {photos.map((photo) => (
          <div 
            key={photo.id}
            onClick={() => onSelect(photo.id)}
            className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 aspect-[3/4] ${
              selectedPhotoId === photo.id 
                ? 'border-black ring-2 ring-black/10 shadow-lg' 
                : 'border-transparent hover:border-gray-200'
            }`}
          >
            <img 
              src={photo.url} 
              className="w-full h-full object-cover" 
              alt="Model" 
            />
            {selectedPhotoId === photo.id && (
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white drop-shadow-md">check_circle</span>
                </div>
            )}
            
            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
                className="absolute top-2 right-2 bg-white/90 text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
                <span className="material-symbols-outlined text-xs font-bold block">close</span>
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 bg-black text-white rounded-xl font-medium shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-lg">add_a_photo</span>
          Add Photo
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-3 leading-tight">
           Do not upload images of swimwear, lingerie, or sensitive content. Keep it professional.
        </p>
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
        />
      </div>
    </div>
  );
};