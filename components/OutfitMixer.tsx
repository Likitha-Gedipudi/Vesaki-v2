import React, { useState } from 'react';
import { ClothingItem, UserProfile, Outfit } from '../types';
import { generateOutfitSuggestions, generateTryOn } from '../services/geminiService';

interface OutfitMixerProps {
  wardrobe: ClothingItem[];
  userProfile: UserProfile;
}

export const OutfitMixer: React.FC<OutfitMixerProps> = ({ wardrobe, userProfile }) => {
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedOutfits, setGeneratedOutfits] = useState<Outfit[]>([]);
  
  // Try On State
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [activeOutfitForTryOn, setActiveOutfitForTryOn] = useState<Outfit | null>(null);

  const handleGenerate = async () => {
    if (!occasion.trim() || wardrobe.length < 2) return;
    
    setLoading(true);
    try {
      const suggestions = await generateOutfitSuggestions(wardrobe, userProfile, occasion);
      
      const hydratedOutfits: Outfit[] = suggestions.map((s, idx) => ({
        id: `gen-${idx}-${Date.now()}`,
        name: s.name,
        items: s.itemIds.map(id => wardrobe.find(w => w.id === id)).filter((i): i is ClothingItem => !!i),
        occasion: occasion,
        aiReasoning: s.reasoning
      }));
      
      setGeneratedOutfits(hydratedOutfits);
    } catch (e) {
      console.error(e);
      alert("Something went wrong with the AI stylist.");
    } finally {
      setLoading(false);
    }
  };

  const handleTryOn = async (outfit: Outfit) => {
    if (!userProfile.userImage) {
      alert("Please upload your photo in the Profile settings first!");
      return;
    }

    setTryOnLoading(true);
    setActiveOutfitForTryOn(outfit);
    
    try {
        const result = await generateTryOn(userProfile.userImage, outfit.items);
        if (result) {
            setTryOnImage(result);
        } else {
            alert("Could not generate image. Please try a different photo.");
            setActiveOutfitForTryOn(null);
        }
    } catch (e) {
        console.error(e);
        alert("Virtual Try-On failed. Please try again later.");
        setActiveOutfitForTryOn(null);
    } finally {
        setTryOnLoading(false);
    }
  };

  const closeTryOnModal = () => {
      setTryOnImage(null);
      setActiveOutfitForTryOn(null);
  };

  const canGenerate = occasion.trim().length > 0 && wardrobe.length >= 2;
  
  let buttonText = "Style Me";
  if (loading) buttonText = "Styling...";
  else if (wardrobe.length < 2) buttonText = "Add 2+ Items";
  else if (!occasion.trim()) buttonText = "Enter Occasion";

  return (
    <div className="flex flex-col h-full w-full">
      {/* Search / Action Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-stretch sticky top-0 z-10">
        <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="What's the occasion? (e.g. Date Night, Job Interview)"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 placeholder-gray-400 transition-all"
            />
        </div>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          className={`px-6 py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap
            ${!canGenerate || loading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-white shadow-lg shadow-gray-200 hover:scale-105 active:scale-95'
            }`}
        >
          {loading ? <span className="material-symbols-outlined animate-spin text-lg">autorenew</span> : <span className="material-symbols-outlined text-lg">auto_awesome</span>}
          {buttonText}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 mt-6 overflow-y-auto hide-scrollbar pb-20">
        {generatedOutfits.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 min-h-[400px]">
            <span className="material-symbols-outlined text-8xl mb-4 opacity-10">apparel</span>
            <p className="font-serif text-2xl text-gray-400">Ready to Style</p>
            <p className="text-sm mt-2 max-w-xs text-center">Add items to your closet on the left, then tell us where you're going.</p>
            </div>
        )}

        {generatedOutfits.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {generatedOutfits.map((outfit) => (
                <div key={outfit.id} className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 flex flex-col transition-transform hover:shadow-xl">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="font-serif text-xl text-gray-900">{outfit.name}</h3>
                </div>
                
                <div className="p-4 bg-gray-50/50 flex-1">
                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                         {outfit.items.map((item) => (
                            <div key={item.id} className="min-w-[100px] w-[120px] aspect-[3/4] bg-white rounded-lg p-2 shadow-sm border border-gray-100">
                                <img src={item.imageUrl} className="w-full h-full object-contain" alt={item.category} />
                            </div>
                         ))}
                    </div>
                    <div className="mt-4 bg-purple-50 p-3 rounded-lg border border-purple-100/50">
                        <p className="text-sm text-purple-900 leading-relaxed italic">
                        "{outfit.aiReasoning}"
                        </p>
                    </div>
                </div>

                <div className="p-4 flex gap-3 border-t border-gray-50">
                     <button 
                        onClick={() => handleTryOn(outfit)}
                        className="flex-1 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
                    >
                        <span className="material-symbols-outlined text-sm">checkroom</span>
                        Virtual Try-On
                    </button>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>

      {/* Try On Modal/Overlay */}
      {(tryOnLoading || tryOnImage) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden shadow-2xl relative">
                 <button 
                    onClick={closeTryOnModal}
                    className="absolute top-4 right-4 z-10 bg-black/10 hover:bg-black/20 text-black rounded-full p-2 transition-colors"
                 >
                    <span className="material-symbols-outlined text-xl">close</span>
                 </button>

                 {/* Left: Original Items */}
                 <div className="w-1/3 bg-gray-50 p-6 hidden md:flex flex-col border-r border-gray-100 overflow-y-auto">
                    <h4 className="font-serif text-xl mb-4 text-gray-800">The Look</h4>
                    <div className="space-y-4">
                        {activeOutfitForTryOn?.items.map(item => (
                            <div key={item.id} className="bg-white p-2 rounded-lg shadow-sm flex items-center gap-3">
                                <img src={item.imageUrl} className="w-12 h-12 object-contain" />
                                <div>
                                    <p className="text-xs font-bold text-gray-500">{item.category}</p>
                                    <p className="text-sm truncate w-32">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Right: Result */}
                 <div className="flex-1 flex flex-col relative bg-white">
                    {tryOnLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-6"></div>
                            <h3 className="text-2xl font-serif font-bold text-gray-900">Creating Magic</h3>
                            <p className="text-gray-500 mt-2">Fitting the outfit to your photo...</p>
                        </div>
                    ) : (
                        tryOnImage && (
                            <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                <img src={tryOnImage} alt="Virtual Try On" className="w-full h-full object-contain" />
                                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                                    <h3 className="text-white font-serif text-2xl">{activeOutfitForTryOn?.name}</h3>
                                </div>
                            </div>
                        )
                    )}
                 </div>
              </div>
          </div>
      )}
    </div>
  );
};