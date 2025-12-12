import React, { useRef } from 'react';
import { UserProfile } from '../types';
import { compressImage } from '../services/geminiService';

interface ProfileModalProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ userProfile, setUserProfile, onClose }) => {
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        // Use compressImage
        const dataUrl = await compressImage(file);
        setUserProfile(prev => ({ ...prev, userImage: dataUrl }));
      } catch (err) {
        console.error(err);
        alert("Failed to upload profile image.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-serif text-xl text-gray-800">Your Style Profile</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
             {/* User Image Upload */}
             <div className="border-b border-gray-100 pb-6 mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">Your Virtual Model</label>
                <div className="flex items-center gap-4">
                    <div 
                        className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500 transition-colors shrink-0"
                        onClick={() => profileInputRef.current?.click()}
                    >
                        {userProfile.userImage ? (
                            <img src={userProfile.userImage} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-gray-400">add_a_photo</span>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">Full-body photo required for Try-On</p>
                        <button 
                            onClick={() => profileInputRef.current?.click()}
                            className="text-purple-600 text-xs font-bold mt-1 hover:underline uppercase tracking-wide"
                        >
                            {userProfile.userImage ? 'Update Photo' : 'Upload Photo'}
                        </button>
                    </div>
                    <input 
                        type="file" 
                        ref={profileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input 
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Body Type</label>
                  <select 
                    value={userProfile.bodyType}
                    onChange={(e) => setUserProfile({...userProfile, bodyType: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  >
                    <option>Athletic</option>
                    <option>Petite</option>
                    <option>Curvy</option>
                    <option>Tall</option>
                    <option>Average</option>
                  </select>
                </div>

                 <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Style Preferences</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {userProfile.stylePreferences.map(pref => (
                        <span key={pref} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                           {pref}
                           <button onClick={() => {
                               setUserProfile(prev => ({...prev, stylePreferences: prev.stylePreferences.filter(p => p !== pref)}))
                           }} className="hover:text-red-500">×</button>
                        </span>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Add preference (e.g. Boho, Grunge)"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    onKeyDown={(e) => {
                        if(e.key === 'Enter') {
                            const val = e.currentTarget.value.trim();
                            if(val) {
                                setUserProfile(prev => ({...prev, stylePreferences: [...prev.stylePreferences, val]}));
                                e.currentTarget.value = '';
                            }
                        }
                    }}
                  />
                </div>
            </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end">
             <button onClick={onClose} className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                Done
             </button>
        </div>
      </div>
    </div>
  );
};