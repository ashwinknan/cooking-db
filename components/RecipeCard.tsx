
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, Ingredient, RecipeStep, RecipeCategory } from '../types';

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
       r.variations?.some(v => v.toLowerCase().includes(lower)))
    );
  }, [pairingSearch, allRecipes, recipe.id]);

  const preStartSteps = draft.steps.filter(s => s.type === 'pre-start');
  const activeSteps = draft.steps.filter(s => s.type !== 'pre-start');

  const openCookingMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCookingMode(true);
    setCurrentStepIndex(0);
  };

  const closeCookingMode = () => {
    setIsCookingMode(false);
    setCurrentStepIndex(0);
    setShowIngredientsOverlay(false);
  };

  return (
    <>
      <div className={`bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border transition-all ${isExpanded ? 'border-orange-200 shadow-xl' : 'border-slate-100 shadow-sm'}`}>
        <div 
          className="p-4 md:p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors select-none"
          onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        >
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isEditing ? (
                <input 
                  value={draft.dishName} 
                  onChange={e => setDraft({...draft, dishName: e.target.value})}
                  className="text-lg md:text-xl font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded-lg outline-none w-full md:w-auto"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <h3 className="text-lg md:text-xl font-bold text-slate-800 truncate">{recipe.dishName}</h3>
              )}
              <span className="text-[8px] md:text-[9px] uppercase font-black px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                {recipe.category}
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">
              2 Servings • {recipe.servingSizeInfo}
            </p>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2" onClick={e => e.stopPropagation()}>
            {/* Mobile Cooking Mode Button */}
            {!isEditing && (
              <button 
                onClick={openCookingMode}
                className="md:hidden p-2.5 bg-orange-500 text-white rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
              </button>
            )}
            
            {isExpanded && (
              <button 
                onClick={() => { if (!isEditing) setDraft(recipe); setIsEditing(!isEditing); }}
                className={`p-2 rounded-xl transition-all active:scale-90 ${isEditing ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-orange-600'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
            )}
            <button onClick={() => onRemove(recipe.id)} className="p-2 text-slate-300 hover:text-red-500 active:scale-90 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="p-5 md:p-8 border-t border-slate-50 bg-slate-50/20">
            <div className="mb-8 p-4 bg-white/50 rounded-2xl border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    Perfect Matches
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
                    <span className="text-[10px] font-bold text-slate-300 italic">No pairings defined yet</span>
                  )}
               </div>

               {isEditing && (
                  <div className="relative">
                     <div className="flex items-center bg-white rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-orange-500 overflow-hidden shadow-sm">
                        <div className="pl-4 text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <input 
                          placeholder="Find a recipe to pair with..." 
                          value={pairingSearch}
                          onChange={e => setPairingSearch(e.target.value)}
                          className="w-full p-3 text-[11px] font-bold outline-none bg-transparent"
                        />
                     </div>
                     {availablePairings.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl mt-2 z-20 overflow-hidden">
                           {availablePairings.slice(0, 5).map(r => (
                             <button 
                               key={r.id} 
                               onClick={() => { onTogglePairing(recipe.id, r.id); setPairingSearch(''); }}
                               className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-slate-50 border-b last:border-0"
                             >
                               {r.dishName}
                             </button>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Details & Steps</h4>
              {isEditing && (
                <div className="flex w-full md:w-auto gap-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 md:flex-none px-6 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest">Discard</button>
                  <button onClick={handleSave} className="flex-1 md:flex-none px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">Save Changes</button>
                </div>
              )}
            </div>

            <div className="space-y-10">
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Type</label>
                      <select 
                        value={draft.category} 
                        onChange={e => setDraft({...draft, category: e.target.value})}
                        className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold border-none outline-none ring-1 ring-slate-200 focus:ring-orange-500"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Variations</label>
                      <div className="flex flex-wrap gap-2">
                        {draft.variations?.map((v, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-50 pl-3 pr-1 py-1 rounded-xl border border-slate-200">
                            <input 
                              value={v} 
                              onChange={e => {
                                const vrs = [...draft.variations];
                                vrs[i] = e.target.value;
                                setDraft({...draft, variations: vrs});
                              }} 
                              className="bg-transparent text-[10px] font-bold outline-none w-20" 
                            />
                            <button onClick={() => removeItem('variation', i)} className="text-slate-400 hover:text-red-500">×</button>
                          </div>
                        ))}
                        <button onClick={() => addItem('variation')} className="text-[10px] bg-slate-900 text-white px-4 py-1.5 rounded-xl font-black">Add</button>
                      </div>
                   </div>
                </div>
              )}

              <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
                <div className="lg:col-span-5">
                  <div className="flex items-center justify-between mb-5">
                     <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Ingredients</h4>
                     {isEditing && <button onClick={() => addItem('ingredient')} className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">New</button>}
                  </div>
                  <div className="space-y-2">
                    {(isEditing ? draft.ingredients : recipe.ingredients).map((ing, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        {isEditing ? (
                          <div className="space-y-3">
                             <input value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} className="font-bold text-xs bg-slate-50 px-3 py-2 rounded-xl w-full outline-none" />
                             <div className="flex gap-2">
                                <input type="number" value={ing.kitchen.value} onChange={e => updateIngredient(idx, 'kitchenValue', e.target.value)} className="bg-slate-50 text-[9px] font-black p-2 rounded-lg w-full" placeholder="Qty" />
                                <input value={ing.kitchen.unit} onChange={e => updateIngredient(idx, 'kitchenUnit', e.target.value)} className="bg-slate-50 text-[9px] font-black p-2 rounded-lg w-full" placeholder="Unit" />
                             </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{ing.name}</span>
                            <span className="text-[10px] text-orange-600 font-black">{ing.kitchen.value} {ing.kitchen.unit}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="flex items-center justify-between mb-5">
                     <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Cooking Steps</h4>
                     {isEditing && <button onClick={() => addItem('step')} className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">New Step</button>}
                  </div>
                  <div className="space-y-4">
                    {(isEditing ? draft.steps : recipe.steps).map((step, idx) => (
                      <div key={idx} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 flex items-start gap-4">
                        <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 bg-slate-900 text-white text-[11px] md:text-xs font-black flex items-center justify-center rounded-2xl">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <textarea value={step.instruction} onChange={e => updateStep(idx, 'instruction', e.target.value)} className="w-full bg-slate-50 p-3 rounded-2xl text-xs font-semibold outline-none ring-1 ring-slate-200 focus:ring-orange-500 resize-none min-h-[80px]" />
                          ) : (
                            <p className="text-xs md:text-sm text-slate-700 font-semibold leading-relaxed">{step.instruction}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE COOKING MODAL */}
      {isCookingMode && (
        <div className="fixed inset-0 z-[1000] bg-slate-900 flex flex-col animate-in fade-in zoom-in duration-300">
          <header className="p-6 flex items-center justify-between bg-slate-800 shrink-0">
            <div className="flex flex-col">
              <h2 className="text-white text-lg font-black truncate max-w-[200px]">{recipe.dishName}</h2>
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                {currentStepIndex === 0 ? 'Overview' : `Step ${currentStepIndex} of ${recipe.steps.length}`}
              </p>
            </div>
            <button onClick={closeCookingMode} className="text-slate-400 hover:text-white p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </header>

          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto px-6 py-8">
              {currentStepIndex === 0 ? (
                /* OVERVIEW PAGE */
                <div className="space-y-8 animate-in slide-in-from-right-4">
                   <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700">
                      <h4 className="text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">You'll need</h4>
                      <div className="space-y-3">
                        {recipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex justify-between items-center text-sm font-bold text-slate-100 border-b border-slate-700/50 pb-2 last:border-0">
                             <span>{ing.name}</span>
                             <span className="text-orange-500">{ing.kitchen.value} {ing.kitchen.unit}</span>
                          </div>
                        ))}
                      </div>
                   </div>

                   {recipe.pairedWith && recipe.pairedWith.length > 0 && (
                     <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700">
                        <h4 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Goes Great With</h4>
                        <div className="flex flex-wrap gap-2">
                          {recipe.pairedWith.map(pid => {
                            const found = allRecipes.find(r => r.id === pid);
                            return found ? <span key={pid} className="bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">{found.dishName}</span> : null;
                          })}
                        </div>
                     </div>
                   )}
                </div>
              ) : (
                /* STEP PAGE */
                <div className="h-full flex flex-col justify-center items-center text-center animate-in slide-in-from-right-4">
                  <div className="bg-white rounded-[3rem] p-10 shadow-2xl w-full">
                     <span className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-2xl font-black mb-8 mx-auto shadow-xl">
                       {currentStepIndex}
                     </span>
                     <p className="text-xl font-bold text-slate-800 leading-relaxed">
                       {recipe.steps[currentStepIndex - 1].instruction}
                     </p>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK VIEW INGREDIENTS OVERLAY */}
            {showIngredientsOverlay && (
              <div 
                className="absolute inset-0 bg-slate-900/95 z-[100] p-8 flex flex-col animate-in fade-in slide-in-from-bottom-10"
                onClick={() => setShowIngredientsOverlay(false)}
              >
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-white text-xl font-black">Quick Check</h3>
                    <button className="text-slate-400 p-2">✕</button>
                 </div>
                 <div className="overflow-y-auto space-y-4">
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between text-slate-200 text-lg font-bold border-b border-white/10 pb-3">
                         <span>{ing.name}</span>
                         <span className="text-orange-500">{ing.kitchen.value} {ing.kitchen.unit}</span>
                      </div>
                    ))}
                 </div>
                 <p className="text-slate-500 text-[10px] font-black uppercase text-center mt-auto tracking-[0.3em]">Tap anywhere to return</p>
              </div>
            )}
          </div>

          <footer className="p-6 flex gap-4 bg-slate-800 shrink-0">
             <button 
               onClick={() => setShowIngredientsOverlay(true)}
               className="w-14 h-14 bg-slate-700 text-slate-300 rounded-2xl flex items-center justify-center shadow-lg active:scale-95"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
             </button>
             
             {currentStepIndex > 0 && (
               <button 
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                className="flex-1 bg-slate-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all"
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
               className="flex-[2] bg-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
             >
                {currentStepIndex === 0 ? 'Start Cooking' : currentStepIndex === recipe.steps.length ? 'Finish' : 'Next Step'}
             </button>
          </footer>
        </div>
      )}
    </>
  );
};
