
import React, { useState, useMemo } from 'react';
import { StandardizedIngredient } from '../types';

interface IngredientDatabaseProps {
  ingredients: StandardizedIngredient[];
  onMerge: (oldNames: string[], newName: string) => Promise<void>;
  onRename: (oldName: string, newName: string) => Promise<void>;
}

export const IngredientDatabase: React.FC<IngredientDatabaseProps> = ({ ingredients, onMerge, onRename }) => {
  const [search, setSearch] = useState('');
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newNameInput, setNewNameInput] = useState('');

  const filtered = useMemo(() => {
    const lower = search.toLowerCase().trim();
    if (!lower) return ingredients;
    return ingredients.filter(i => i.name.toLowerCase().includes(lower));
  }, [search, ingredients]);

  const handleStartMerge = () => {
    setIsMergeMode(true);
    setSelectedForMerge([]);
  };

  const handleExecuteMerge = async () => {
    if (selectedForMerge.length < 2) return;
    const targetName = prompt("Enter final name for the merged ingredient:", selectedForMerge[0]);
    if (targetName) {
      await onMerge(selectedForMerge, targetName);
      setIsMergeMode(false);
      setSelectedForMerge([]);
    }
  };

  const handleCancelMerge = () => {
    setIsMergeMode(false);
    setSelectedForMerge([]);
  };

  const toggleSelect = (name: string) => {
    setSelectedForMerge(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleStartRename = (name: string) => {
    setEditingName(name);
    setNewNameInput(name);
  };

  const handleSaveRename = async () => {
    if (editingName && newNameInput && editingName !== newNameInput) {
      await onRename(editingName, newNameInput);
    }
    setEditingName(null);
  };

  if (ingredients.length === 0) return null;

  return (
    <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 mb-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black tracking-tighter flex items-center gap-2">
            <span className="text-orange-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </span>
            Pantry <span className="text-orange-400">Core</span>
          </h2>
          <div className="flex gap-2">
            {!isMergeMode ? (
              <button 
                onClick={handleStartMerge}
                className="text-[8px] font-black uppercase bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors border border-white/5"
              >
                Merge
              </button>
            ) : (
              <div className="flex gap-1">
                <button 
                  onClick={handleExecuteMerge}
                  disabled={selectedForMerge.length < 2}
                  className="text-[8px] font-black uppercase bg-orange-600 hover:bg-orange-500 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  Apply
                </button>
                <button 
                  onClick={handleCancelMerge}
                  className="text-[8px] font-black uppercase bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 relative">
           <input 
             value={search}
             onChange={e => setSearch(e.target.value)}
             placeholder="Search ingredients..."
             className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold text-sm"
           />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {filtered.sort((a, b) => a.name.localeCompare(b.name)).map((ing) => (
            <div 
              key={ing.name} 
              className={`rounded-2xl border transition-all cursor-pointer ${
                expandedIngredient === ing.name ? 'bg-white/10 border-orange-500/30' : 
                isMergeMode && selectedForMerge.includes(ing.name) ? 'bg-orange-500/20 border-orange-500/50' :
                'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
              onClick={() => isMergeMode ? toggleSelect(ing.name) : setExpandedIngredient(expandedIngredient === ing.name ? null : ing.name)}
            >
              <div className="p-4 flex items-center justify-between group">
                {editingName === ing.name ? (
                  <div className="flex gap-2 flex-1 mr-4" onClick={e => e.stopPropagation()}>
                    <input 
                      value={newNameInput} 
                      onChange={e => setNewNameInput(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm font-bold flex-1 outline-none focus:border-orange-500"
                    />
                    <button onClick={handleSaveRename} className="text-orange-400 font-black text-xs">OK</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {isMergeMode && (
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedForMerge.includes(ing.name) ? 'bg-orange-500 border-orange-500' : 'border-white/20'}`}>
                        {selectedForMerge.includes(ing.name) && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        )}
                      </div>
                    )}
                    <span className="text-sm font-bold text-slate-100 truncate">{ing.name}</span>
                    {!isMergeMode && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStartRename(ing.name); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity p-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                    )}
                  </div>
                )}
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter shrink-0">
                   {ing.recipesUsing.length} Slots
                </span>
              </div>
              
              {!isMergeMode && expandedIngredient === ing.name && (
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
