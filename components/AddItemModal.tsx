import React, { useState, useRef } from 'react';
import { analyzeClothingImage, compressImage, fileToGenerativePart } from '../services/geminiService';
import { ClothingItem } from '../types';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: ClothingItem) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onAdd }) => {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzedData, setAnalyzedData] = useState<Partial<ClothingItem> | null>(null);
  const [retailerUrl, setRetailerUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      
      try {
        // Use compressImage for preview (smaller size)
        const dataUrl = await compressImage(file);
        setImagePreview(dataUrl);
        
        // Use raw base64 (already optimized via compressImage inside fileToGenerativePart in updated service) for analysis
        const base64 = await fileToGenerativePart(file);
        
        // Call Gemini to analyze
        const analysis = await analyzeClothingImage(base64);
        setAnalyzedData(analysis);
      } catch (err) {
        console.error(err);
        alert("Failed to analyze image. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = () => {
    if (!imagePreview || !analyzedData) return;

    // Ensure URL has protocol if missing
    let finalUrl = retailerUrl.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const newItem: ClothingItem = {
      id: crypto.randomUUID(),
      imageUrl: imagePreview,
      category: analyzedData.category || 'Accessory',
      description: analyzedData.description || '',
      color: analyzedData.color || '',
      brand: analyzedData.brand || 'Unknown',
      tags: analyzedData.tags || [],
      retailerUrl: finalUrl || undefined,
      price: 0
    };

    onAdd(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-serif text-xl text-gray-800">Add New Item</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* URL Input First */}
          <div className="mb-6">
            <label className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2 block">Retailer Link (Optional)</label>
            <div className="flex gap-2">
                 <input 
                  type="text" 
                  placeholder="Paste product link..."
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={retailerUrl}
                  onChange={(e) => setRetailerUrl(e.target.value)}
                />
            </div>
            {retailerUrl && !imagePreview && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Please upload an image of the product to continue.
                </p>
            )}
          </div>

          {!imagePreview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group ${retailerUrl ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-indigo-500 mb-2">add_a_photo</span>
              <p className="text-sm text-gray-900 font-bold">Upload Image</p>
              <p className="text-xs text-gray-500 mt-1 text-center">Required to analyze style and color</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative rounded-xl overflow-hidden aspect-square shadow-sm border border-gray-100">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                {loading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex flex-col items-center text-white">
                      <span className="material-symbols-outlined animate-spin text-3xl mb-2">autorenew</span>
                      <span className="text-sm font-medium">Analyzing style...</span>
                    </div>
                  </div>
                )}
                {!loading && (
                    <button 
                        onClick={() => { setImagePreview(null); setAnalyzedData(null); }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-gray-600 hover:text-red-500 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                )}
              </div>

              {analyzedData && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Category</label>
                    <p className="text-gray-800 font-medium capitalize">{analyzedData.category}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Description</label>
                    <p className="text-gray-600 text-sm">{analyzedData.description}</p>
                  </div>
                   <div>
                    <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analyzedData.tags?.map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button 
            disabled={!analyzedData}
            onClick={handleSubmit}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:shadow-none hover:bg-gray-800 transition-all"
          >
            Add to Wardrobe
          </button>
        </div>
      </div>
    </div>
  );
};