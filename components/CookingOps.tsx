
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
      r.variations.some(v => v.toLowerCase().includes(lower))
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
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm mb-8">
        <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          Batch Operations Optimizer
        </h3>

        <div className="relative mb-8">
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dish or variation..."
            className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all font-bold"
          />
          {filteredRecipes.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[150]">
              {filteredRecipes.map(r => (
                <button 
                  key={r.id} 
                  onClick={() => handleAdd(r)}
                  className="w-full p-4 text-left hover:bg-orange-50 flex items-center justify-between border-b last:border-0"
                >
                  <span className="font-bold text-slate-700">{r.dishName}</span>
                  <span className="text-[8px] font-black bg-slate-100 px-2 py-1 rounded uppercase tracking-widest">{r.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 mb-8">
          {selectedItems.map(item => (
            <div key={item.recipe.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-800">{item.recipe.dishName}</span>
              <button onClick={() => handleRemove(item.recipe.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-2xl">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block text-center">Cooks</label>
            <input type="number" value={cooks} onChange={e => setCooks(Number(e.target.value))} className="w-full bg-transparent text-center text-xl font-black" />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block text-center">Burners</label>
            <input type="number" value={burners} onChange={e => setBurners(Number(e.target.value))} className="w-full bg-transparent text-center text-xl font-black" />
          </div>
        </div>

        <button 
          onClick={runOptimizer}
          disabled={isProcessing || selectedItems.length === 0}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
        >
          {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : 'Sequence & Interleave Operations'}
        </button>
      </div>

      {timeline.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Optimized Workflow (Active Steps Only)</h4>
          {timeline.map((step, i) => (
            <div key={i} className={`p-6 rounded-[2rem] border transition-all ${step.type === 'cooking' ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black bg-slate-900 text-white px-3 py-1 rounded-full">T+{step.timeOffset}m</span>
                  <span className="text-[9px] font-black text-slate-400">({step.duration}m step)</span>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${step.type === 'cooking' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {step.type}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-snug mb-4">{step.action}</p>
              <div className="flex flex-wrap gap-2">
                {step.involvedRecipes.map(r => (
                  <span key={r} className="text-[8px] font-black text-orange-600 uppercase border border-orange-100 bg-orange-50 px-2 py-0.5 rounded-lg">@{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
