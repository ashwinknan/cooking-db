
import React, { useState, useMemo } from 'react';
import { Recipe, TimelineStep } from '../types';
import { generateProductionTimeline } from '../services/geminiService';

interface CookingOpsProps {
  allRecipes: Recipe[];
}

export const CookingOps: React.FC<CookingOpsProps> = ({ allRecipes }) => {
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ recipe: Recipe; servings: number }[]>([]);
  const [cooks, setCooks] = useState(1);
  const [burners, setBurners] = useState(2);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return [];
    const lower = search.toLowerCase();
    return allRecipes.filter(r => 
      r.dishName.toLowerCase().includes(lower) || 
      r.variations?.some(v => v.toLowerCase().includes(lower))
    ).filter(r => !selectedItems.find(s => s.recipe.id === r.id));
  }, [search, allRecipes, selectedItems]);

  const handleAdd = (recipe: Recipe) => {
    setSelectedItems([...selectedItems, { recipe, servings: 2 }]);
    setSearch('');
  };

  const handleRemove = (id: string) => {
    setSelectedItems(selectedItems.filter(s => s.recipe.id !== id));
  };

  const runOptimizer = async () => {
    if (selectedItems.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await generateProductionTimeline(selectedItems, cooks, burners);
      setTimeline(res.timeline);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm mb-8">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          Let's Cook Together
        </h3>

        <div className="relative mb-6">
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for a dish to cook..."
            className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-sm"
          />
          {filteredRecipes.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[150] overflow-hidden">
              {filteredRecipes.map(r => (
                <button 
                  key={r.id} 
                  onClick={() => handleAdd(r)}
                  className="w-full p-4 text-left hover:bg-orange-50 flex items-center justify-between border-b last:border-0"
                >
                  <span className="font-bold text-slate-700 text-sm">{r.dishName}</span>
                  <span className="text-[8px] font-black bg-slate-100 px-2 py-1 rounded uppercase tracking-widest">{r.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 mb-8">
          {selectedItems.map(item => (
            <div key={item.recipe.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-800 text-sm">{item.recipe.dishName}</span>
              <button onClick={() => handleRemove(item.recipe.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-xl">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block text-center">Hands (Cooks)</label>
            <input type="number" value={cooks} onChange={e => setCooks(Number(e.target.value))} className="w-full bg-transparent text-center text-lg font-black outline-none" />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block text-center">Stovetops</label>
            <input type="number" value={burners} onChange={e => setBurners(Number(e.target.value))} className="w-full bg-transparent text-center text-lg font-black outline-none" />
          </div>
        </div>

        <button 
          onClick={runOptimizer}
          disabled={isProcessing || selectedItems.length === 0}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95"
        >
          {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : 'Mix My Cooking Steps'}
        </button>
      </div>

      {timeline.length > 0 && (
        <div className="space-y-4 px-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Your Smart Workflow</h4>
          {timeline.map((step, i) => (
            <div key={i} className={`p-5 rounded-[2rem] border transition-all ${step.type === 'cooking' ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg">Starts at {step.timeOffset}m</span>
                  <span className="text-[9px] font-black text-slate-400">{step.duration}m long</span>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${step.type === 'cooking' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {step.type}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-snug mb-3">{step.action}</p>
              <div className="flex flex-wrap gap-2">
                {step.involvedRecipes.map(r => (
                  <span key={r} className="text-[8px] font-black text-orange-600 uppercase bg-white border border-orange-100 px-2 py-0.5 rounded-lg">{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
