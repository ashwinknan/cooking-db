
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
  const [insufficient, setInsufficient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const runArchitect = async () => {
    setIsProcessing(true);
    setInsufficient(false);
    try {
      const res = await architectMealPlan(allRecipes, days, fridge);
      if (res.insufficientVariety) {
        setInsufficient(true);
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
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm mb-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          Meal Architect
        </h3>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Fridge Inventory (Surplus guidance)</label>
            <textarea 
              value={fridge}
              onChange={e => setFridge(e.target.value)}
              placeholder="e.g. 2 lemons, wilted spinach, chicken breasts..."
              className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none text-sm font-bold text-slate-700 h-24 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase text-slate-400">Planning Window</label>
            <div className="flex gap-2">
              {[1, 3, 5, 7].map(n => (
                <button 
                  key={n}
                  onClick={() => setDays(n)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${days === n ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  {n}D
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={runArchitect}
            disabled={isProcessing || allRecipes.length === 0}
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : 'Architect Weekly Plan'}
          </button>
        </div>
      </div>

      {insufficient && (
        <div className="bg-orange-50 border border-orange-200 p-8 rounded-[2.5rem] mb-8 text-center">
          <p className="text-orange-800 font-bold mb-2">Insufficient Variety</p>
          <p className="text-orange-700 text-xs font-medium leading-relaxed">
            Your database only has {allRecipes.length} recipes. To create a balanced plan for {days} days, please add more dishes to your CMS first.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {plan.map(day => (
          <div key={day.day} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schedule • Day {day.day}</span>
              <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded">PROCESSED</span>
            </div>
            <div className="space-y-3">
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
