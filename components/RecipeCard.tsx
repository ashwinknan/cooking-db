
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, Ingredient, RecipeStep } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onRemove: (id: string) => void;
  onUpdate: (updatedRecipe: Recipe) => Promise<void>;
  allRecipes: Recipe[];
  categories: string[];
  onTogglePairing: (recipeAId: string, recipeBId: string) => Promise<void>;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  onRemove, 
  onUpdate, 
  allRecipes, 
  categories,
  onTogglePairing
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Recipe>(recipe);
  const [pairingSearch, setPairingSearch] = useState('');
  const [showAllPairs, setShowAllPairs] = useState(false);

  // Mobile/Modal States
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0); 
  const [showIngredientsOverlay, setShowIngredientsOverlay] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => { if (!isEditing && !isSaving) setDraft(recipe); }, [recipe, isEditing, isSaving]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ ...draft, timestamp: Date.now() });
      setIsEditing(false);
    } finally { setIsSaving(false); }
  };

  const openCookingMode = () => {
    setIsCookingMode(true);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
  };

  const totalTime = useMemo(() => recipe.steps.reduce((acc, s) => acc + (s.durationMinutes || 0), 0), [recipe.steps]);

  const toggleStepComplete = (idx: number) => {
    const newSet = new Set(completedSteps);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setCompletedSteps(newSet);
  };

  return (
    <>
      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm transition-all hover:shadow-md">
        <div 
          className="p-5 md:p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
          onClick={() => {
            if (window.innerWidth < 768) openCookingMode();
            else if (!isEditing) setIsExpanded(!isExpanded);
          }}
        >
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-base md:text-xl font-black text-slate-800 tracking-tight">{recipe.dishName}</h3>
              <div className="flex gap-1">
                 <span className="text-[7px] md:text-[8px] uppercase font-black px-2 py-0.5 rounded-full border border-orange-100 bg-orange-50 text-orange-600">
                   {recipe.category}
                 </span>
                 {recipe.cuisine && (
                   <span className="text-[7px] md:text-[8px] uppercase font-black px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                     {recipe.cuisine}
                   </span>
                 )}
              </div>
            </div>
            <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
              {recipe.steps.length} Steps • {totalTime}m
            </p>
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button onClick={() => onRemove(recipe.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            <div className="md:hidden p-1.5 bg-orange-100 text-orange-600 rounded-lg shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </div>
            <div className={`hidden md:block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        {/* Desktop Details */}
        <div className="hidden md:block">
          {isExpanded && (
            <div className="p-8 border-t border-slate-50 bg-slate-50/20">
              <div className="grid grid-cols-12 gap-10">
                 <div className="col-span-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Ingredients</h4>
                    <div className="space-y-2">
                       {recipe.ingredients.map((ing, i) => (
                         <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-xs font-bold">
                            <span>{ing.name}</span>
                            <span className="text-orange-500">{ing.kitchen.value} {ing.kitchen.unit}</span>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="col-span-8">
                    <div className="flex items-center justify-between mb-4">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Process</h4>
                       <button onClick={() => setIsEditing(!isEditing)} className="text-[10px] font-black uppercase text-orange-600">{isEditing ? 'Cancel' : 'Edit'}</button>
                    </div>
                    {isEditing ? (
                      <div className="space-y-4">
                         <input value={draft.dishName} onChange={e => setDraft({...draft, dishName: e.target.value})} className="w-full bg-white p-3 rounded-xl border border-slate-200 font-bold" />
                         <textarea 
                           placeholder="Notes" 
                           value={draft.servingSizeInfo} 
                           onChange={e => setDraft({...draft, servingSizeInfo: e.target.value})}
                           className="w-full bg-white p-3 rounded-xl border border-slate-200 text-xs" 
                         />
                         <button onClick={handleSave} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest">Save</button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recipe.steps.map((s, i) => (
                          <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 items-start">
                             <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                             <p className="text-xs font-medium text-slate-700 leading-relaxed">{s.instruction}</p>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MODAL - TASK FOCUSED INTERFACE */}
      {isCookingMode && (
        <div className="fixed inset-0 z-[1000] bg-slate-900 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
          <header className="px-6 py-6 flex items-center justify-between bg-slate-800 border-b border-slate-700/50 shadow-xl shrink-0">
            <div className="flex flex-col">
              <h2 className="text-white text-base font-black truncate max-w-[200px] tracking-tight">{recipe.dishName}</h2>
              <p className="text-orange-400 text-[9px] font-black uppercase tracking-[0.2em]">
                {currentStepIndex === 0 ? 'Summary' : `Step ${currentStepIndex} of ${recipe.steps.length}`}
              </p>
            </div>
            <button onClick={() => setIsCookingMode(false)} className="text-slate-500 hover:text-white p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-8 relative flex flex-col items-center justify-center">
            {currentStepIndex === 0 ? (
              <div className="w-full max-w-sm h-[450px] animate-in slide-in-from-right-2">
                 <div className="bg-slate-800/80 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl h-full flex flex-col">
                    <div className="grid grid-cols-2 gap-6 mb-8 border-b border-slate-700/50 pb-8 shrink-0">
                       <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Cuisine</span><span className="text-sm font-black text-white">{recipe.cuisine || '-'}</span></div>
                       <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</span><span className="text-sm font-black text-white">{totalTime}m</span></div>
                    </div>
                    
                    <h4 className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2 shrink-0">Ingredients</h4>
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                       {recipe.ingredients.map((ing, i) => (
                         <div key={i} className="flex justify-between items-center text-sm font-bold text-slate-100 border-b border-slate-700/20 pb-3 last:border-0">
                            <span className="text-slate-300">{ing.name}</span>
                            <span className="text-orange-500">{ing.kitchen.value} {ing.kitchen.unit}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            ) : (
              <div className="w-full max-w-sm h-full flex flex-col justify-center animate-in slide-in-from-right-2">
                 {/* FIXED SIZE CARD */}
                 <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-white h-[450px] flex flex-col justify-between overflow-hidden">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-8 shrink-0">
                         <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.2rem] flex items-center justify-center text-2xl font-black shadow-lg rotate-2">{currentStepIndex}</div>
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 tracking-tight">{recipe.steps[currentStepIndex-1].type}</span>
                            <span className="text-[11px] font-black text-slate-400 mt-2">{recipe.steps[currentStepIndex-1].durationMinutes}m</span>
                         </div>
                      </div>
                      
                      {/* INSTRUCTION AREA WITH CONTROLLED FONT AND SCROLL */}
                      <div className="flex-1 overflow-y-auto no-scrollbar pr-1 mb-8">
                        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-800 leading-relaxed">
                          {recipe.steps[currentStepIndex-1].instruction}
                        </p>
                      </div>

                      <button 
                        onClick={() => toggleStepComplete(currentStepIndex-1)}
                        className={`w-full py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 shrink-0 ${completedSteps.has(currentStepIndex-1) ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-slate-900 text-white'}`}
                      >
                        {completedSteps.has(currentStepIndex-1) ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            Task Cleared
                          </>
                        ) : 'Finish Task'}
                      </button>
                    </div>
                 </div>
              </div>
            )}

            {showIngredientsOverlay && (
              <div className="absolute inset-0 bg-slate-900/98 z-[100] p-10 flex flex-col animate-in fade-in slide-in-from-bottom-10" onClick={() => setShowIngredientsOverlay(false)}>
                 <h3 className="text-white text-3xl font-black mb-10 tracking-tighter italic underline decoration-orange-500 underline-offset-8">Ingredients</h3>
                 <div className="space-y-5 overflow-y-auto pr-2 no-scrollbar">
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-100 text-2xl font-bold border-b border-white/5 pb-4">
                         <span className="text-slate-300">{ing.name}</span>
                         <span className="text-orange-500 tracking-tight">{ing.kitchen.value} {ing.kitchen.unit}</span>
                      </div>
                    ))}
                 </div>
                 <p className="mt-auto text-center text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] py-8">Tap anywhere to close</p>
              </div>
            )}
          </div>

          <footer className="p-8 flex gap-4 bg-slate-800 border-t border-slate-700/50 shadow-2xl shrink-0">
             <button onClick={() => setShowIngredientsOverlay(true)} className="w-16 h-16 bg-slate-700 text-slate-300 rounded-[1.5rem] flex items-center justify-center border border-slate-600 shadow-xl active:scale-90 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
             </button>
             {currentStepIndex > 0 && <button onClick={() => setCurrentStepIndex(currentStepIndex-1)} className="flex-1 bg-slate-700 text-white font-black rounded-[1.5rem] text-[11px] uppercase tracking-widest border border-slate-600">Back</button>}
             <button onClick={() => currentStepIndex < recipe.steps.length ? setCurrentStepIndex(currentStepIndex+1) : setIsCookingMode(false)} className="flex-[2] bg-orange-600 text-white font-black rounded-[1.5rem] text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 shadow-orange-500/10 transition-all">
                {currentStepIndex === 0 ? 'Start' : currentStepIndex === recipe.steps.length ? 'Finalize' : 'Next'}
             </button>
          </footer>
        </div>
      )}
    </>
  );
};
