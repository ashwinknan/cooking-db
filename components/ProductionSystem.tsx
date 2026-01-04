
import React, { useState, useMemo } from 'react';
import { Recipe, TimelineStep, MealPlanDay } from '../types';
import { generateProductionTimeline, architectMealPlan } from '../services/geminiService';

interface ProductionSystemProps {
  allRecipes: Recipe[];
}

export const ProductionSystem: React.FC<ProductionSystemProps> = ({ allRecipes }) => {
  const [activeTab, setActiveTab] = useState<'batch' | 'architect' | 'shopping'>('batch');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [cooks, setCooks] = useState(1);
  const [burners, setBurners] = useState(2);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [fridgeInventory, setFridgeInventory] = useState('');
  const [duration, setDuration] = useState(3);
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);

  // Computed: Aggregate Shopping List from selected recipes
  const aggregateShoppingList = useMemo(() => {
    const recipes = allRecipes.filter(r => selectedRecipeIds.includes(r.id));
    const totals: Record<string, { value: number; unit: string }> = {};

    recipes.forEach(r => {
      r.ingredients.forEach(ing => {
        const key = `${ing.name.toLowerCase()}-${ing.shopping.unit.toLowerCase()}`;
        if (!totals[key]) {
          totals[key] = { value: 0, unit: ing.shopping.unit, ...ing };
          (totals[key] as any).displayName = ing.name;
        }
        totals[key].value += ing.shopping.value;
      });
    });

    return Object.values(totals);
  }, [selectedRecipeIds, allRecipes]);

  const handleGenerateTimeline = async () => {
    if (selectedRecipeIds.length === 0) return;
    setIsProcessing(true);
    try {
      const recipes = allRecipes.filter(r => selectedRecipeIds.includes(r.id));
      const res = await generateProductionTimeline(recipes, cooks, burners);
      setTimeline(res.timeline);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchitectPlan = async () => {
    setIsProcessing(true);
    try {
      const res = await architectMealPlan(allRecipes, duration, fridgeInventory);
      setMealPlan(res.plan);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecipe = (id: string) => {
    setSelectedRecipeIds(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-xl mx-auto pb-24 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="bg-slate-900 text-white p-8 rounded-b-[3rem] mb-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full"></div>
        <h2 className="text-3xl font-black tracking-tighter mb-2">Kitchen <span className="text-orange-500">OS</span></h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Active Production Management</p>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Select Operations</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {allRecipes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => toggleRecipe(r.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                      selectedRecipeIds.includes(r.id) 
                        ? 'bg-orange-500 text-white border-orange-600 shadow-lg scale-105' 
                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {r.dishName}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Cooks</label>
                  <input type="number" value={cooks} onChange={e => setCooks(Number(e.target.value))} className="w-full bg-slate-50 p-3 rounded-2xl border-none outline-none font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Burners</label>
                  <input type="number" value={burners} onChange={e => setBurners(Number(e.target.value))} className="w-full bg-slate-50 p-3 rounded-2xl border-none outline-none font-bold text-slate-800" />
                </div>
              </div>

              <button
                disabled={isProcessing || selectedRecipeIds.length === 0}
                onClick={handleGenerateTimeline}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl"
              >
                {isProcessing ? <div className="animate-bounce">🔥</div> : 'Optimize Production'}
              </button>
            </div>

            {timeline.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Timeline Workflow</h4>
                {timeline.map((step, i) => (
                  <div key={i} className={`p-5 rounded-[2rem] border transition-all ${step.isParallel ? 'bg-orange-50 border-orange-200 shadow-md scale-[1.02]' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-1 rounded-lg">T+{step.timeOffset}m</span>
                      <div className="flex gap-1">
                        {step.assignees.map(a => <span key={a} className="text-[8px] font-black uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>)}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-tight mb-2">{step.action}</p>
                    <div className="flex gap-2">
                      {step.involvedRecipes.map(r => <span key={r} className="text-[9px] font-black text-orange-600 uppercase italic">#{r}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'architect' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Fridge Surplus / Inventory</label>
              <textarea 
                value={fridgeInventory}
                onChange={e => setFridgeInventory(e.target.value)}
                placeholder="e.g. half a bunch of kale, 3 chicken breasts, open jar of pesto..."
                className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none text-sm font-bold text-slate-700 resize-none h-32 mb-4"
              />
              <div className="flex items-center gap-4 mb-6">
                 <label className="text-[10px] font-black uppercase text-slate-400">Duration (Days)</label>
                 <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="bg-slate-50 p-2 rounded-xl border-none font-bold">
                   {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
                 </select>
              </div>
              <button
                disabled={isProcessing}
                onClick={handleArchitectPlan}
                className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? <div className="animate-bounce">🎯</div> : 'Architect Meal Plan'}
              </button>
            </div>

            <div className="grid gap-4">
              {mealPlan.map(day => (
                <div key={day.day} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-orange-200 transition-colors">
                  <h5 className="text-xs font-black uppercase text-orange-600 mb-4 tracking-widest">Day {day.day} Production</h5>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black">B</span>
                      <p className="text-sm font-bold text-slate-800">{day.breakfast}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-black text-orange-600">L</span>
                      <p className="text-sm font-bold text-slate-800">{day.lunchDinner}</p>
                    </div>
                    <div className="flex items-center gap-4 opacity-60">
                      <span className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black">S</span>
                      <p className="text-sm font-bold text-slate-800">{day.snack}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="text-xl font-bold mb-1">Master Provision List</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Summed requirements for selected recipes</p>
            </div>
            
            <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100">
              {aggregateShoppingList.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                  No recipes selected for aggregation
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {aggregateShoppingList.map((item: any, i) => (
                    <div key={i} className="flex items-center justify-between p-4 group">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-slate-200 rounded-lg group-hover:border-orange-500 transition-colors cursor-pointer"></div>
                        <span className="text-sm font-bold text-slate-800">{item.displayName}</span>
                      </div>
                      <span className="text-xs font-black bg-slate-50 text-slate-500 px-3 py-1.5 rounded-xl border border-slate-100">
                        {item.value} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] h-20 bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-4 border border-slate-800 z-[100]">
        <button 
          onClick={() => setActiveTab('batch')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'batch' ? 'text-orange-500 scale-110' : 'text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          <span className="text-[8px] font-black uppercase tracking-tighter">Batch</span>
        </button>
        <button 
          onClick={() => setActiveTab('architect')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'architect' ? 'text-orange-500 scale-110' : 'text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          <span className="text-[8px] font-black uppercase tracking-tighter">Architect</span>
        </button>
        <button 
          onClick={() => setActiveTab('shopping')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'shopping' ? 'text-orange-500 scale-110' : 'text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          <span className="text-[8px] font-black uppercase tracking-tighter">Inventory</span>
        </button>
      </div>
    </div>
  );
};
