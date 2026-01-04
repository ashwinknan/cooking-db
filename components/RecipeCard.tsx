
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

  // Mobile Cooking Mode States
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 = overview, 1..n = steps
  const [showIngredientsOverlay, setShowIngredientsOverlay] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isEditing && !isSaving) setDraft(recipe);
  }, [recipe, isEditing, isSaving]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ ...draft, timestamp: Date.now() });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (type: 'ingredient' | 'step' | 'variation') => {
    if (type === 'ingredient') {
      const newIng: Ingredient = { name: 'New Ingredient', kitchen: { value: 0, unit: 'unit' }, shopping: { value: 0, unit: 'g' } };
      setDraft({ ...draft, ingredients: [...draft.ingredients, newIng] });
    } else if (type === 'step') {
      const newStep: RecipeStep = { instruction: 'New Step', durationMinutes: 5, type: 'prep' };
      setDraft({ ...draft, steps: [...draft.steps, newStep] });
    } else {
      setDraft({ ...draft, variations: [...(draft.variations || []), 'New Variation'] });
    }
  };

  const removeItem = (type: 'ingredient' | 'step' | 'variation', index: number) => {
    if (type === 'ingredient') {
      setDraft({ ...draft, ingredients: draft.ingredients.filter((_, i) => i !== index) });
    } else if (type === 'step') {
      setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) });
    } else {
      setDraft({ ...draft, variations: draft.variations.filter((_, i) => i !== index) });
    }
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...draft.ingredients];
    const ing = { ...newIngredients[index] };
    if (field === 'name') ing.name = value;
    else if (field === 'kitchenValue') ing.kitchen.value = Number(value);
    else if (field === 'kitchenUnit') ing.kitchen.unit = value;
    else if (field === 'shoppingValue') ing.shopping.value = Number(value);
    else if (field === 'shoppingUnit') ing.shopping.unit = value;
    newIngredients[index] = ing;
    setDraft({ ...draft, ingredients: newIngredients });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...draft.steps];
    const step = { ...newSteps[index] };
    if (field === 'instruction') step.instruction = value;
    else if (field === 'durationMinutes') step.durationMinutes = Number(value);
    else if (field === 'type') step.type = value;
    newSteps[index] = step as RecipeStep;
    setDraft({ ...draft, steps: newSteps });
  };

  const availablePairings = useMemo(() => {
    if (!pairingSearch.trim()) return [];
    const lower = pairingSearch.toLowerCase();
    return allRecipes.filter(r => 
      r.id !== recipe.id && 
      (r.dishName.toLowerCase().includes(lower) || 
       r.cuisine?.toLowerCase().includes(lower) ||
       r.variations?.some(v => v.toLowerCase().includes(lower)))
    );
  }, [pairingSearch, allRecipes, recipe.id]);

  const openCookingMode = () => {
    setIsCookingMode(true);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
  };

  const closeCookingMode = () => {
    setIsCookingMode(false);
    setCurrentStepIndex(0);
    setShowIngredientsOverlay(false);
  };

  const toggleStepComplete = (idx: number) => {
    const newSet = new Set(completedSteps);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setCompletedSteps(newSet);
  };

  const totalTime = useMemo(() => {
    return recipe.steps.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  }, [recipe.steps]);

  return (
    <>
      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm transition-all">
        {/* Card Header - Mobile triggers Modal, Desktop triggers Expand */}
        <div 
          className="p-4 md:p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors select-none"
          onClick={() => {
            if (window.innerWidth < 768) openCookingMode();
            else if (!isEditing) setIsExpanded(!isExpanded);
          }}
        >
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg md:text-xl font-bold text-slate-800 truncate">{recipe.dishName}</h3>
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
            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">
              {recipe.steps.length} Steps • {totalTime}m Total
            </p>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2" onClick={e => e.stopPropagation()}>
            {/* Desktop Only Edit Button */}
            <div className="hidden md:flex items-center gap-2">
              {isExpanded && (
                <button 
                  onClick={() => { if (!isEditing) setDraft(recipe); setIsEditing(!isEditing); }}
                  className={`p-2 rounded-xl transition-all active:scale-90 ${isEditing ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-orange-600'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
              )}
              <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            {/* Remove button - available on both but more prominent on desktop */}
            <button onClick={() => onRemove(recipe.id)} className="p-2 text-slate-300 hover:text-red-500 active:scale-90 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            
            {/* Mobile indicator that it's clickable */}
            <div className="md:hidden p-1.5 bg-orange-100 text-orange-600 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </div>
          </div>
        </div>

        {/* Desktop-Only Expanded View */}
        <div className="hidden md:block">
          {isExpanded && (
            <div className="p-8 border-t border-slate-50 bg-slate-50/20">
              <div className="mb-8 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 italic">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                      Perfect with...
                    </h4>
                    {!isEditing && (recipe.pairedWith?.length || 0) > 3 && (
                      <button onClick={() => setShowAllPairs(!showAllPairs)} className="text-[10px] font-black text-orange-600 uppercase">
                        {showAllPairs ? 'Show Less' : `+${recipe.pairedWith!.length - 3} more`}
                      </button>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {(showAllPairs || isEditing ? draft.pairedWith : draft.pairedWith?.slice(0, 3))?.map(pid => {
                      const found = allRecipes.find(r => r.id === pid);
                      return found ? (
                        <div key={pid} className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 border border-orange-100 shadow-sm">
                          {found.dishName}
                          {isEditing && (
                            <button onClick={() => onTogglePairing(recipe.id, pid)} className="text-orange-300 hover:text-orange-600 p-0.5 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                          )}
                        </div>
                      ) : null;
                    })}
                    {(!draft.pairedWith || draft.pairedWith.length === 0) && !isEditing && (
                      <span className="text-[10px] font-bold text-slate-300 italic">No pairings established yet</span>
                    )}
                </div>

                {isEditing && (
                    <div className="relative">
                      <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-orange-500 overflow-hidden">
                          <div className="pl-4 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                          </div>
                          <input 
                            placeholder="Search your recipes to establish a link..." 
                            value={pairingSearch}
                            onChange={e => setPairingSearch(e.target.value)}
                            className="w-full p-3 text-[11px] font-bold outline-none bg-transparent"
                          />
                      </div>
                    </div>
                )}
              </div>

              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                   <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Type</label>
                      <select 
                        value={draft.category} 
                        onChange={e => setDraft({...draft, category: e.target.value})}
                        className="w-full bg-slate-50 p-2.5 rounded-xl text-[10px] font-bold border-none outline-none ring-1 ring-slate-100"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Cuisine</label>
                      <input 
                        value={draft.cuisine || ''} 
                        onChange={e => setDraft({...draft, cuisine: e.target.value})}
                        className="w-full bg-slate-50 p-2.5 rounded-xl text-[10px] font-bold border-none outline-none ring-1 ring-slate-100"
                      />
                   </div>
                   <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Serving Note</label>
                      <input 
                        value={draft.servingSizeInfo} 
                        onChange={e => setDraft({...draft, servingSizeInfo: e.target.value})}
                        className="w-full bg-slate-50 p-2.5 rounded-xl text-[10px] font-bold border-none outline-none ring-1 ring-slate-100"
                      />
                   </div>
                </div>
              )}

              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic mb-5">Ingredients</h4>
                  <div className="space-y-2">
                    {(isEditing ? draft.ingredients : recipe.ingredients).map((ing, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{ing.name}</span>
                        <span className="text-[10px] text-orange-600 font-black">{ing.kitchen.value} {ing.kitchen.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-7">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic mb-5">Instructions</h4>
                  <div className="space-y-4">
                    {(isEditing ? draft.steps : recipe.steps).map((step, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex items-start gap-4">
                        <div className="shrink-0 w-8 h-8 bg-slate-900 text-white text-[11px] font-black flex items-center justify-center rounded-xl">{idx + 1}</div>
                        <p className="text-xs md:text-sm text-slate-700 font-semibold leading-relaxed">{step.instruction}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {isEditing && (
                <div className="mt-8 flex justify-end gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">Discard</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">Save Changes</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE COOKING MODAL */}
      {isCookingMode && (
        <div className="fixed inset-0 z-[1000] bg-slate-900 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300 overflow-hidden">
          <header className="px-6 py-5 flex items-center justify-between bg-slate-800 shrink-0 border-b border-slate-700/50">
            <div className="flex flex-col">
              <h2 className="text-white text-base font-black truncate max-w-[200px] tracking-tight">{recipe.dishName}</h2>
              <p className="text-orange-400 text-[9px] font-black uppercase tracking-widest">
                {currentStepIndex === 0 ? 'Getting Started' : `Step ${currentStepIndex} of ${recipe.steps.length}`}
              </p>
            </div>
            <button onClick={closeCookingMode} className="text-slate-400 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </header>

          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto px-6 py-8">
              {currentStepIndex === 0 ? (
                /* OVERVIEW PAGE - CONSOLIDATED INFO */
                <div className="space-y-6 animate-in slide-in-from-right-2">
                   <div className="bg-slate-800/80 p-6 rounded-[2rem] border border-slate-700 shadow-xl">
                      <div className="grid grid-cols-2 gap-4 mb-8 border-b border-slate-700 pb-6">
                         <div>
                            <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Cuisine</span>
                            <span className="text-xs font-black text-white">{recipe.cuisine || 'Home'}</span>
                         </div>
                         <div>
                            <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Category</span>
                            <span className="text-xs font-black text-white">{recipe.category}</span>
                         </div>
                         <div>
                            <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Time</span>
                            <span className="text-xs font-black text-white">{totalTime} mins</span>
                         </div>
                         <div>
                            <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Servings</span>
                            <span className="text-xs font-black text-white">2 people</span>
                         </div>
                         <div className="col-span-2 mt-2">
                            <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Serving Detail</span>
                            <span className="text-[10px] font-bold text-slate-300 italic">{recipe.servingSizeInfo}</span>
                         </div>
                      </div>

                      <h4 className="text-orange-400 text-[9px] font-black uppercase tracking-widest mb-4">Required Ingredients</h4>
                      <div className="space-y-3">
                        {recipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex justify-between items-center text-sm font-bold text-slate-100 border-b border-slate-700/30 pb-2 last:border-0">
                             <span className="text-slate-300">{ing.name}</span>
                             <span className="text-orange-500">{ing.kitchen.value} {ing.kitchen.unit}</span>
                          </div>
                        ))}
                      </div>
                   </div>

                   {recipe.pairedWith && recipe.pairedWith.length > 0 && (
                     <div className="bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-700">
                        <h4 className="text-blue-400 text-[9px] font-black uppercase tracking-widest mb-3">Suggested Sides</h4>
                        <div className="flex flex-wrap gap-2">
                          {recipe.pairedWith.map(pid => {
                            const found = allRecipes.find(r => r.id === pid);
                            return found ? <span key={pid} className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-black">{found.dishName}</span> : null;
                          })}
                        </div>
                     </div>
                   )}
                </div>
              ) : (
                /* STEP PAGE - BETTER PROPORTIONS & MARK DONE */
                <div className="h-full flex flex-col justify-center animate-in slide-in-from-right-2">
                  <div className={`bg-white rounded-[2.5rem] p-8 shadow-2xl border-4 transition-all duration-300 ${completedSteps.has(currentStepIndex - 1) ? 'border-green-400 bg-green-50/10' : 'border-white'}`}>
                     <div className="flex items-center justify-between mb-8">
                        <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">
                          {currentStepIndex}
                        </div>
                        <div className="flex flex-col items-end">
                           <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${recipe.steps[currentStepIndex-1].type === 'cooking' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                              {recipe.steps[currentStepIndex-1].type}
                           </span>
                           <span className="text-[10px] font-black text-slate-400 mt-1">
                             ~{recipe.steps[currentStepIndex-1].durationMinutes} mins
                           </span>
                        </div>
                     </div>
                     
                     <p className="text-lg font-bold text-slate-800 leading-snug mb-10 text-center min-h-[100px] flex items-center justify-center">
                       {recipe.steps[currentStepIndex - 1].instruction}
                     </p>

                     <button 
                       onClick={() => toggleStepComplete(currentStepIndex - 1)}
                       className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-3 ${completedSteps.has(currentStepIndex - 1) ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                     >
                        {completedSteps.has(currentStepIndex - 1) ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            Completed
                          </>
                        ) : 'Mark as Done'}
                     </button>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK VIEW INGREDIENTS OVERLAY */}
            {showIngredientsOverlay && (
              <div 
                className="absolute inset-0 bg-slate-900/98 z-[100] p-8 flex flex-col animate-in fade-in slide-in-from-bottom-10"
                onClick={() => setShowIngredientsOverlay(false)}
              >
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-white text-xl font-black">Check Qty</h3>
                    <button className="text-slate-500 p-2">✕</button>
                 </div>
                 <div className="overflow-y-auto space-y-4">
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-100 text-lg font-bold border-b border-white/10 pb-4">
                         <span>{ing.name}</span>
                         <span className="text-orange-500">{ing.kitchen.value} {ing.kitchen.unit}</span>
                      </div>
                    ))}
                 </div>
                 <p className="text-slate-500 text-[9px] font-black uppercase text-center mt-auto tracking-[0.3em] py-4">Tap anywhere to return</p>
              </div>
            )}
          </div>

          <footer className="p-6 flex gap-3 bg-slate-800 shrink-0 border-t border-slate-700/50">
             <button 
               onClick={() => setShowIngredientsOverlay(true)}
               className="w-14 h-14 bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center shadow-lg active:scale-95"
               title="Quick Quantity Check"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
             </button>
             
             {currentStepIndex > 0 && (
               <button 
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                className="flex-1 bg-slate-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest active:scale-95 shadow-md"
               >
                 Back
               </button>
             )}

             <button 
               onClick={() => {
                 if (currentStepIndex < recipe.steps.length) {
                   setCurrentStepIndex(currentStepIndex + 1);
                 } else {
                   closeCookingMode();
                 }
               }}
               className="flex-[2] bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
             >
                {currentStepIndex === 0 ? 'Start Cooking' : currentStepIndex === recipe.steps.length ? 'Finish' : 'Next Step'}
             </button>
          </footer>
        </div>
      )}
    </>
  );
};
