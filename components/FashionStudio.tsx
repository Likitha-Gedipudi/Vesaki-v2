import React, { useState } from 'react';
import { UserPhoto, GeneratedLook } from '../types';
import { generateFashionFromPrompt } from '../services/geminiService';

interface FashionStudioProps {
  selectedPhoto: UserPhoto | undefined;
  onSaveLook: (look: GeneratedLook) => void;
}

export const FashionStudio: React.FC<FashionStudioProps> = ({ selectedPhoto, onSaveLook }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedPhoto || !prompt.trim()) return;

    setIsGenerating(true);
    setCurrentResult(null); // Clear previous result to show loading state effectively if desired, or keep it.
    
    try {
      const resultBase64 = await generateFashionFromPrompt(selectedPhoto.url, prompt);
      
      if (resultBase64) {
        setCurrentResult(resultBase64);
        
        // Save to history
        const newLook: GeneratedLook = {
            id: crypto.randomUUID(),
            originalPhotoId: selectedPhoto.id,
            prompt: prompt,
            resultUrl: resultBase64,
            timestamp: Date.now()
        };
        onSaveLook(newLook);
      } else {
        alert("The AI couldn't generate a look. Please try a different prompt.");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!selectedPhoto) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-300 h-full p-8">
        <div className="max-w-md text-center">
            <span className="material-symbols-outlined text-8xl mb-6 opacity-20">portrait</span>
            <h2 className="text-2xl font-serif text-gray-800 mb-2">Select a Model</h2>
            <p className="text-gray-500">Choose a photo from the left sidebar to start your virtual styling session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
      {/* Workspace */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 items-center justify-center p-4 md:p-8">
        
        {/* Comparison / Result View */}
        <div className="flex-1 w-full h-full flex items-center justify-center gap-4 relative">
            
            {/* Original - Hide on mobile if result exists to save space, or show side-by-side on desktop */}
            <div className={`relative rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50 aspect-[3/4] max-h-full transition-all duration-500 ${currentResult ? 'w-1/3 opacity-80 hover:opacity-100' : 'w-full max-w-md'}`}>
                <img src={selectedPhoto.url} className="w-full h-full object-contain" alt="Original" />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md">Original</div>
            </div>

            {/* Arrow */}
            {currentResult && (
                <div className="text-gray-300">
                    <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                </div>
            )}

            {/* Result */}
            {isGenerating && (
                <div className="w-full md:w-2/3 aspect-[3/4] max-h-full bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full h-full animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                    <span className="material-symbols-outlined text-5xl text-purple-500 animate-spin mb-4">autorenew</span>
                    <p className="text-gray-500 font-serif animate-pulse">Designing "{prompt}"...</p>
                </div>
            )}

            {!isGenerating && currentResult && (
                <div className="w-full md:w-2/3 aspect-[3/4] max-h-full bg-gray-50 rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative group">
                    <img src={currentResult} className="w-full h-full object-contain" alt="Generated Look" />
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        AI Generated
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 md:p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-gray-50 z-10">
        <div className="max-w-3xl mx-auto">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Describe the look</label>
            <div className="flex gap-2 relative">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="e.g. A chic black blazer with ripped jeans and red heels..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-14 py-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                    disabled={isGenerating}
                />
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-black text-white px-6 rounded-lg font-medium shadow-md hover:bg-gray-800 disabled:bg-gray-200 disabled:shadow-none transition-all flex items-center justify-center"
                >
                    {isGenerating ? (
                        <span className="material-symbols-outlined animate-spin">autorenew</span>
                    ) : (
                        <span className="material-symbols-outlined">send</span>
                    )}
                </button>
            </div>
            {/* Quick Prompts */}
            <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar pb-2">
                {['Summer floral dress', 'Business suit navy blue', 'Cyberpunk streetwear', 'Red carpet gown'].map(p => (
                    <button 
                        key={p} 
                        onClick={() => setPrompt(p)}
                        className="whitespace-nowrap px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-full transition-colors"
                    >
                        {p}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};