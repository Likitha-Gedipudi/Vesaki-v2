import React from 'react';
import { ClothingItem } from '../types';

interface WardrobeGridProps {
  items: ClothingItem[];
  onRemove: (id: string) => void;
}

export const WardrobeGrid: React.FC<WardrobeGridProps> = ({ items, onRemove }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4 text-center">
        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">checkroom</span>
        <p className="font-serif text-lg text-gray-500">Closet is empty</p>
        <p className="text-xs mt-1">Add items to start styling</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-1">
      {items.map((item) => (
        <div key={item.id} className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100">
          <div className="aspect-[3/4] overflow-hidden bg-gray-50 relative">
            <img 
              src={item.imageUrl} 
              alt={item.description} 
              className="w-full h-full object-cover mix-blend-multiply" 
            />
            
            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
               <div className="flex justify-end">
                   <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                    className="bg-white text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50"
                    title="Remove item"
                  >
                    <span className="material-symbols-outlined text-xs font-bold block">close</span>
                  </button>
               </div>
               
               {item.retailerUrl && (
                 <div className="flex justify-end">
                   <a 
                    href={item.retailerUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-white text-indigo-600 p-1 rounded-full shadow-sm hover:bg-indigo-50"
                    title="Visit Retailer"
                    onClick={(e) => e.stopPropagation()}
                   >
                     <span className="material-symbols-outlined text-xs block">link</span>
                   </a>
                 </div>
               )}
            </div>
          </div>
          
          <div className="p-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{item.category}</div>
            <p className="text-xs font-medium text-gray-900 truncate">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};