
import React, { useState, useMemo } from 'react';
import { StandardizedIngredient } from '../types';

interface IngredientDatabaseProps {
  ingredients: StandardizedIngredient[];
}

export const IngredientDatabase: React.FC<IngredientDatabaseProps> = ({ ingredients }) => {
  const [search, setSearch] = useState('');
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase().trim();
    if (!lower) return ingredients;
    return ingredients.filter(i => i.name.toLowerCase().includes(lower));
  }, [search, ingredients]);

  if (ingredients.length === 0) return null;

  return (
    <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 mb-8 shadow-2xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3">
            <span className="text-orange-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </span>
            Pantry <span className="text-orange-400">Core</span>
          </h2>
          <span className="bg-white/10 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-white/5">
            {ingredients.length} Total
          </span>
        </div>

        <div className="mb-8 relative">
           <input 
             value={search}
             onChange={e => setSearch(e.target.value)}
             placeholder="Filter ingredients..."
             className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold text-sm"
           />
           <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
           </div>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {filtered.sort((a, b) => a.name.localeCompare(b.name)).map((ing) => (
            <div 
              key={ing.name} 
              className={`rounded-2xl border transition-all cursor-pointer ${expandedIngredient === ing.name ? 'bg-white/10 border-orange-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
              onClick={() => setExpandedIngredient(expandedIngredient === ing.name ? null : ing.name)}
            >
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-100">{ing.name}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                   {ing.recipesUsing.length} Recipes
                </span>
              </div>
              
              {expandedIngredient === ing.name && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {ing.recipesUsing.map(r => (
                        <span key={r} className="text-[9px] font-black bg-orange-500/10 text-orange-300 px-3 py-1 rounded-lg border border-orange-500/20">
                          {r}
                        </span>
                      ))}
                   </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest">No Matches Found</div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};
