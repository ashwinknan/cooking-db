
import React, { useState } from 'react';
import { Recipe, MealPlanDay } from '../types';
import { architectMealPlan } from '../services/geminiService';

interface MealPlanningProps {
  allRecipes: Recipe[];
}

export const MealPlanning: React.FC<MealPlanningProps> = ({ allRecipes }) => {
  const [fridge, setFridge] = useState('');
  const [days, setDays] = useState(3);
  const [plan, setPlan] = useState<MealPlanDay[]>([]);
  const [insufficient, setInsufficient] = useState<{ variety: boolean; missing: any }>({ variety: false, missing: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const runArchitect = async () => {
    setIsProcessing(true);
    setInsufficient({ variety: false, missing: null });
    try {
      const res = await architectMealPlan(allRecipes, days, fridge);
      if (res.insufficientVariety) {
        setInsufficient({ variety: true, missing: res.missingCount });
      } else {
        setPlan(res.plan);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-24">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm mb-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M19 14c1.49 0 2.87.47 4 1.26V8c0-1.1-.9-2-2-2h-3V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h4.5c-.32-.61-.5-1.29-.5-2 0-2.76 2.24-5 5-5zM10 4h4v2h-4V4z"/></svg>
          Weekly Meal Planner
        </h3>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">What's in your fridge? (I'll try to use it up)</label>
            <textarea 
              value={fridge}
              onChange={e => setFridge(e.target.value)}
              placeholder="e.g. half a bunch of spinach, some tofu..."
              className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none text-sm font-bold text-slate-700 h-24 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase text-slate-400">Planning for how many days?</label>
            <div className="flex gap-2">
              {[1, 3, 7].map(n => (
                <button 
                  key={n}
                  onClick={() => setDays(n)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${days === n ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={runArchitect}
            disabled={isProcessing || allRecipes.length === 0}
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : 'Plan My Week'}
          </button>
        </div>
      </div>

      {insufficient.variety && (
        <div className="bg-orange-50 border border-orange-200 p-8 rounded-[2.5rem] mb-8">
          <p className="text-orange-800 font-black mb-3 flex items-center gap-2 uppercase text-[10px] tracking-widest">
            Need more recipes!
          </p>
          <div className="space-y-4">
             <p className="text-orange-700 text-xs font-medium leading-relaxed">
              I don't have enough variety in your collection yet to make a unique {days}-day plan without repeats. Try adding a few more:
             </p>
             <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/50 p-3 rounded-xl border border-orange-100">
                  <span className="block text-[8px] font-black uppercase text-orange-400">Breakfast</span>
                  <span className="text-lg font-black text-orange-800">+{insufficient.missing?.breakfast || 0}</span>
                </div>
                <div className="bg-white/50 p-3 rounded-xl border border-orange-100">
                  <span className="block text-[8px] font-black uppercase text-orange-400">Lunch/Dinner</span>
                  <span className="text-lg font-black text-orange-800">+{insufficient.missing?.['lunch/dinner'] || 0}</span>
                </div>
                <div className="bg-white/50 p-3 rounded-xl border border-orange-100">
                  <span className="block text-[8px] font-black uppercase text-orange-400">Snack</span>
                  <span className="text-lg font-black text-orange-800">+{insufficient.missing?.['snack'] || 0}</span>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {plan.map(day => (
          <div key={day.day} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Day {day.day}</h5>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black">B</span>
                <p className="text-sm font-bold text-slate-800">{day.breakfast}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black">L</span>
                <p className="text-sm font-bold text-slate-800">{day.lunchDinner}</p>
              </div>
              <div className="flex items-center gap-4 opacity-50">
                <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black">S</span>
                <p className="text-sm font-bold text-slate-800">{day.snack}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
