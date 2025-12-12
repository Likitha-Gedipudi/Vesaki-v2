import React, { useState, useRef, useEffect } from 'react';
import { UserPhoto, GeneratedLook } from '../types';
import { generateFashionFromPrompt, generate360Video, compressImage } from '../services/geminiService';

interface FashionStudioProps {
  selectedPhoto: UserPhoto | undefined;
  onSaveLook: (look: GeneratedLook) => void;
  onUpdateLook: (look: GeneratedLook) => void;
  onPromoteToModel: (imageUrl: string) => void;
  onRemoveLook: (id: string) => void;
  history: GeneratedLook[];
}

export const FashionStudio: React.FC<FashionStudioProps> = ({ selectedPhoto, onSaveLook, onUpdateLook, onPromoteToModel, onRemoveLook, history }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Current active look ID (maps to history)
  const [currentLookId, setCurrentLookId] = useState<string | null>(null);
  
  // View Mode: 'photo' or 'video'
  const [viewMode, setViewMode] = useState<'photo' | 'video'>('photo');

  // Video Generation State
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);

  // Input Mode Switch: 'text' or 'image'
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);

  // Derived state from history
  const currentLook = history.find(l => l.id === currentLookId);

  const handleGarmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const dataUrl = await compressImage(e.target.files[0]);
              setGarmentImage(dataUrl);
          } catch (err) {
              alert("Failed to process image");
          }
      }
  };

  const handleGenerate = async () => {
    if (!selectedPhoto) return;
    if (inputMode === 'text' && !prompt.trim()) return;
    if (inputMode === 'image' && !garmentImage) return;

    // SAFETY CHECK
    if (inputMode === 'text') {
        const prohibitedKeywords = [
            'lingerie', 'underwear', 'undergarment', 'bra', 'panty', 'panties', 
            'thong', 'bikini', 'swimsuit', 'swimwear', 'boxers', 'briefs', 'knickers'
        ];
        const lowerPrompt = prompt.toLowerCase();
        if (prohibitedKeywords.some(word => lowerPrompt.includes(word))) {
            alert("We cannot process requests for lingerie or undergarments due to privacy concerns.");
            return;
        }
    }

    setIsGenerating(true);
    setViewMode('photo');
    
    try {
      const { resultUrl } = await generateFashionFromPrompt(
          selectedPhoto.url, 
          prompt, 
          inputMode === 'image' && garmentImage ? garmentImage : undefined
      );
      
      if (resultUrl) {
        const newLook: GeneratedLook = {
            id: crypto.randomUUID(),
            originalPhotoId: selectedPhoto.id,
            prompt: inputMode === 'text' ? prompt : "Custom Garment Try-On",
            garmentImage: inputMode === 'image' && garmentImage ? garmentImage : undefined,
            resultUrl: resultUrl,
            timestamp: Date.now()
        };
        onSaveLook(newLook);
        setCurrentLookId(newLook.id);
      } else {
        alert("The AI couldn't generate a look. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
      if (!currentLook) return;
      
      setIsVideoGenerating(true);
      // Switch to video tab immediately to show loading state there
      setViewMode('video');

      try {
          const vidUrl = await generate360Video(currentLook.resultUrl);
          if (vidUrl) {
              // Update the history object with the new video URL
              const updatedLook = { ...currentLook, videoUrl: vidUrl };
              onUpdateLook(updatedLook);
          } else {
              alert("Failed to generate video.");
              setViewMode('photo'); // Revert
          }
      } catch (e: any) {
          console.error(e);
          alert("Video generation error: " + (e.message || "Unknown error"));
          setViewMode('photo'); // Revert
      } finally {
          setIsVideoGenerating(false);
      }
  };

  const handleHistorySelect = (look: GeneratedLook) => {
      setCurrentLookId(look.id);
      // If the look has a video, user might want to see it, but default to photo. 
      // If they were just watching a video, maybe keep video mode? 
      // Let's reset to photo for clarity.
      setViewMode('photo');
  };

  const handleUseAsSource = () => {
      if (currentLook) {
          onPromoteToModel(currentLook.resultUrl);
          setCurrentLookId(null);
          setPrompt('');
          setGarmentImage(null);
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
    <div className="flex h-full w-full overflow-hidden">
      
      {/* Center Stage */}
      <div className="flex-1 flex flex-col relative bg-gray-50 overflow-hidden min-h-0">
        
        {/* Workspace - Images */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-2 md:p-6 relative w-full overflow-y-auto">
            <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4 relative max-w-5xl">
                
                {/* Original - Hidden on small screens if result exists */}
                <div className={`relative rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white aspect-[3/4] h-full max-h-[80vh] object-contain transition-all duration-500 ${currentLook || isGenerating ? 'hidden md:block w-1/3 opacity-80 hover:opacity-100' : 'max-w-md'}`}>
                    <img src={selectedPhoto.url} className="w-full h-full object-contain" alt="Original" />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md">Original</div>
                </div>

                {/* Arrow */}
                {(currentLook || isGenerating) && (
                    <div className="hidden md:block text-gray-300 shrink-0">
                        <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                    </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                    <div className="w-full md:w-2/3 aspect-[3/4] h-full max-h-[80vh] bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full h-full animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                        <span className="material-symbols-outlined text-5xl text-gray-900 animate-spin mb-4">autorenew</span>
                        <p className="text-gray-500 font-serif animate-pulse">
                            {inputMode === 'text' ? `Designing "${prompt}"...` : "Fitting garment..."}
                        </p>
                    </div>
                )}

                {/* Result Display */}
                {!isGenerating && currentLook && (
                    <div className="w-full md:w-2/3 flex flex-col h-full max-h-[80vh]">
                        
                        {/* Media Tabs / Header */}
                        <div className="flex justify-between items-center mb-2 px-1">
                            {/* Toggle */}
                            <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-100 inline-flex">
                                <button
                                    onClick={() => setViewMode('photo')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                                        viewMode === 'photo' 
                                        ? 'bg-gray-100 text-black shadow-inner' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">image</span>
                                    Photo
                                </button>
                                <button
                                    onClick={() => {
                                        if (currentLook.videoUrl) setViewMode('video');
                                        // If no video, we don't switch, but maybe show tooltip. 
                                        // Actually, let's allow switch if generating so we see loader.
                                        if (isVideoGenerating) setViewMode('video');
                                    }}
                                    disabled={!currentLook.videoUrl && !isVideoGenerating}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                                        viewMode === 'video'
                                        ? 'bg-purple-50 text-purple-700 shadow-inner'
                                        : (currentLook.videoUrl || isVideoGenerating) ? 'text-gray-400 hover:text-purple-600' : 'text-gray-200 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">videocam</span>
                                    360° Video
                                </button>
                            </div>
                            
                            {/* Video Generator Button (Only if no video exists yet) */}
                            {!currentLook.videoUrl && !isVideoGenerating && (
                                <button 
                                    onClick={handleGenerateVideo}
                                    className="text-xs font-bold text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-sm">auto_videocam</span>
                                    Generate Video
                                </button>
                            )}
                        </div>

                        {/* Media Content */}
                        <div className="relative flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden group">
                            
                            {viewMode === 'video' ? (
                                <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
                                    {isVideoGenerating ? (
                                         <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                                            <h3 className="text-sm font-bold text-gray-900">Rendering 360° Video</h3>
                                            <p className="text-xs text-gray-500 mt-1">This takes about a minute...</p>
                                        </div>
                                    ) : currentLook.videoUrl ? (
                                        <video 
                                            src={currentLook.videoUrl} 
                                            className="w-full h-full object-contain bg-black" 
                                            autoPlay 
                                            loop 
                                            controls 
                                            playsInline
                                        />
                                    ) : (
                                        <p className="text-xs text-gray-400">No video generated.</p>
                                    )}
                                </div>
                            ) : (
                                <img src={currentLook.resultUrl} className="w-full h-full object-contain" alt="Generated Look" />
                            )}
                            
                            {/* Actions Overlay (Edit) */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                                <button 
                                    onClick={handleUseAsSource}
                                    className="bg-white/90 hover:bg-white text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border border-white/50"
                                    title="Use this image as the new source to add more items"
                                >
                                    <span className="material-symbols-outlined text-sm">edit_square</span>
                                    Edit
                                </button>
                            </div>

                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                Vesaki AI
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Control Bar */}
        <div className="bg-white p-3 md:p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-gray-50 z-20 relative shrink-0">
            <div className="max-w-3xl mx-auto">
                
                {/* Input Mode Tabs */}
                <div className="flex justify-center mb-4">
                    <div className="bg-gray-100 p-1 rounded-xl flex w-full max-w-[320px] shadow-inner relative">
                        <button 
                            onClick={() => setInputMode('text')}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${inputMode === 'text' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <span className="material-symbols-outlined text-lg">edit_note</span>
                            Text
                        </button>
                        <button 
                            onClick={() => setInputMode('image')}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${inputMode === 'image' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                            Image
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 md:gap-4 items-stretch h-12 md:h-14">
                    {/* Input Area */}
                    <div className="flex-1 relative h-full">
                        {inputMode === 'text' ? (
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                placeholder="Describe the look (e.g. Red silk evening gown)..."
                                className="w-full h-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-4 text-sm md:text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                disabled={isGenerating}
                            />
                        ) : (
                            <div className="flex gap-3 h-full">
                                <div 
                                    onClick={() => garmentInputRef.current?.click()}
                                    className="flex-1 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all h-full bg-gray-50 group"
                                >
                                    {garmentImage ? (
                                        <div className="flex items-center gap-3 px-4 w-full h-full">
                                            <img src={garmentImage} className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-md border border-gray-200 shrink-0" />
                                            <span className="text-xs md:text-sm text-gray-900 truncate flex-1">Image Loaded</span>
                                            <button 
                                                onClick={(e) => {e.stopPropagation(); setGarmentImage(null);}}
                                                className="text-gray-400 hover:text-red-500 p-2"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 text-xs md:text-sm font-medium flex items-center gap-2 group-hover:text-black transition-colors">
                                            <span className="material-symbols-outlined">upload</span>
                                            Upload Reference
                                        </span>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={garmentInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleGarmentUpload}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || (inputMode === 'text' && !prompt.trim()) || (inputMode === 'image' && !garmentImage)}
                        className={`
                            relative overflow-hidden
                            bg-black text-white rounded-xl font-medium shadow-lg 
                            hover:scale-[1.02] active:scale-95 hover:bg-gray-900 
                            disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed 
                            transition-all duration-200 
                            flex items-center justify-center gap-2 
                            shrink-0 h-full px-6
                        `}
                    >
                        {isGenerating ? (
                            <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">auto_awesome</span>
                                <span className="hidden md:inline font-bold tracking-wider text-xs">GENERATE</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer Disclaimer */}
                <p className="text-[10px] text-gray-400 text-center mt-2 md:mt-3">
                    Vesaki AI. Do not generate insensitive content.
                </p>
            </div>
        </div>
      </div>

      {/* Lookbook History (Right Sidebar) */}
      <div className="w-16 md:w-80 bg-white border-l border-gray-100 flex flex-col shrink-0 z-10 transition-all duration-300">
          
          {/* Editorial Header */}
          <div className="p-6 border-b border-gray-100 flex items-baseline justify-between bg-white z-10 relative">
              <div>
                <h3 className="font-serif text-2xl font-medium tracking-tight text-gray-900 hidden md:block">The Edit</h3>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 hidden md:block mt-1">Curated Looks</p>
              </div>
              <span className="material-symbols-outlined md:hidden text-gray-900">auto_awesome_mosaic</span>
              <div className="hidden md:flex items-center gap-1 text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-full">
                  <span>{history.length}</span>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
              {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-center opacity-40 p-4">
                      <span className="material-symbols-outlined text-4xl mb-2 font-light">style</span>
                      <p className="text-sm font-serif hidden md:block">Your collection is empty.</p>
                      <p className="text-xs text-gray-400 hidden md:block mt-1">Create your first look.</p>
                  </div>
              )}
              
              {history.map((look) => (
                  <div 
                    key={look.id} 
                    onClick={() => handleHistorySelect(look)}
                    className="group relative cursor-pointer"
                  >
                      {/* Card */}
                      <div className={`
                        relative aspect-[3/4] rounded-lg overflow-hidden transition-all duration-500 ease-out shadow-sm
                        ${currentLookId === look.id ? 'ring-2 ring-black ring-offset-2 shadow-xl scale-[1.02]' : 'hover:shadow-lg hover:-translate-y-1'}
                      `}>
                          <img 
                            src={look.resultUrl} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            alt="Look"
                          />
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                              <p className="text-white text-xs font-medium line-clamp-2 drop-shadow-md transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                {look.prompt}
                              </p>
                              <p className="text-[10px] text-white/70 mt-1 uppercase tracking-wider">
                                {new Date(look.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                              </p>
                          </div>

                          {/* Active Indicator */}
                          {currentLookId === look.id && (
                              <div className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md shadow-lg z-10 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                  Active
                              </div>
                          )}

                          {/* Video Badge */}
                          {look.videoUrl && (
                               <div className="absolute top-3 right-3 bg-white/20 text-white p-1 rounded-full backdrop-blur-sm z-10" title="Has 360 Video">
                                   <span className="material-symbols-outlined text-sm block">videocam</span>
                               </div>
                          )}
                      </div>

                      {/* Delete Button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onRemoveLook(look.id); }}
                        className="absolute -top-2 -right-2 bg-white text-gray-900 w-6 h-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 hover:text-red-600 flex items-center justify-center z-20 scale-75 group-hover:scale-100"
                        title="Delete Look"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">close</span>
                      </button>
                  </div>
              ))}
              
              {/* Footer Spacer */}
              <div className="h-10"></div>
          </div>
      </div>
    </div>
  );
};