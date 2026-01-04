
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
       r.cuisine?.toLowerCase().includes(lower) ||
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
              2 servings • {recipe.servingSizeInfo}
            </p>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2" onClick={e => e.stopPropagation()}>
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
            {/* PAIRS WITH - Sticky to top of card content */}
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
                     {availablePairings.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl mt-2 z-20 overflow-hidden">
                           {availablePairings.slice(0, 5).map(r => (
                             <button 
                               key={r.id} 
                               onClick={() => { onTogglePairing(recipe.id, r.id); setPairingSearch(''); }}
                               className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-slate-50 border-b last:border-0 flex items-center justify-between"
                             >
                               {r.dishName}
                               {draft.pairedWith?.includes(r.id) && <span className="text-orange-500 text-[8px] font-black">LINKED</span>}
                             </button>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Recipe Setup</h4>
              {isEditing && (
                <div className="flex w-full md:w-auto gap-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 md:flex-none px-6 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">Discard</button>
                  <button onClick={handleSave} className="flex-1 md:flex-none px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">Save Buddy</button>
                </div>
              )}
            </div>

            <div className="space-y-10">
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Type</label>
                      <select 
                        value={draft.category} 
                        onChange={e => setDraft({...draft, category: e.target.value})}
                        className="w-full bg-slate-50 p-2.5 rounded-xl text-[10px] font-bold border-none outline-none ring-1 ring-slate-100 focus:ring-orange-500"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Cuisine</label>
                      <input 
                        value={draft.cuisine || ''} 
                        onChange={e => setDraft({...draft, cuisine: e.target.value})}
                        placeholder="e.g. Italian"
                        className="w-full bg-slate-50 p-2.5 rounded-xl text-[10px] font-bold border-none outline-none ring-1 ring-slate-100 focus:ring-orange-500"
                      />
                   </div>
                   <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Serving Note</label>
                      <input 
                        value={draft.servingSizeInfo} 
                        onChange={e => setDraft({...draft, servingSizeInfo: e.target.value})}
                        placeholder="e.g. 1 serving = 300g"
                        className="w-full bg-slate-50 p-2.5 rounded-xl text-[10px] font-bold border-none outline-none ring-1 ring-slate-100 focus:ring-orange-500"
                      />
                   </div>
                </div>
              )}

              <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
                {/* Ingredients Side */}
                <div className="lg:col-span-5">
                  <div className="flex items-center justify-between mb-5">
                     <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Ingredients</h4>
                     {isEditing && <button onClick={() => addItem('ingredient')} className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg transition-all active:scale-90">+ Add</button>}
                  </div>
                  <div className="space-y-2">
                    {(isEditing ? draft.ingredients : recipe.ingredients).map((ing, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        {isEditing ? (
                          <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                <input value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} className="font-bold text-xs bg-slate-50 px-3 py-2 rounded-xl flex-1 outline-none mr-2" />
                                <button onClick={() => removeItem('ingredient', idx)} className="text-slate-300 hover:text-red-500">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                </button>
                             </div>
                             <div className="flex gap-2">
                                <input type="number" value={ing.kitchen.value} onChange={e => updateIngredient(idx, 'kitchenValue', e.target.value)} className="bg-slate-50 text-[9px] font-black p-2 rounded-lg w-full" placeholder="Qty" />
                                <input value={ing.kitchen.unit} onChange={e => updateIngredient(idx, 'kitchenUnit', e.target.value)} className="bg-slate-50 text-[9px] font-black p-2 rounded-lg w-full" placeholder="Unit" />
                             </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{ing.name}</span>
                            <span className="text-[10px] text-orange-600 font-black tracking-tight">{ing.kitchen.value} {ing.kitchen.unit}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Steps Side */}
                <div className="lg:col-span-7">
                  <div className="flex items-center justify-between mb-5">
                     <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Instructions</h4>
                     {isEditing && <button onClick={() => addItem('step')} className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg transition-all active:scale-90">+ New Step</button>}
                  </div>
                  <div className="space-y-4">
                    {(isEditing ? draft.steps : recipe.steps).map((step, idx) => (
                      <div key={idx} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 bg-slate-900 text-white text-[11px] md:text-xs font-black flex items-center justify-center rounded-2xl shadow-lg">{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-4">
                                <textarea value={step.instruction} onChange={e => updateStep(idx, 'instruction', e.target.value)} className="w-full bg-slate-50 p-3 rounded-2xl text-xs font-semibold outline-none ring-1 ring-slate-100 focus:ring-orange-500 resize-none min-h-[80px]" />
                                <div className="flex flex-wrap gap-3 items-center">
                                  <div className="flex-1 min-w-[120px]">
                                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Activity Type</label>
                                    <select 
                                      value={step.type} 
                                      onChange={e => updateStep(idx, 'type', e.target.value)}
                                      className="w-full text-[10px] font-black bg-slate-50 px-3 py-2 rounded-xl outline-none ring-1 ring-slate-100"
                                    >
                                       <option value="prep">Prep Work</option>
                                       <option value="cooking">Cooking/Heat</option>
                                       <option value="pre-start">Advanced/Prerequisite</option>
                                    </select>
                                  </div>
                                  <div className="flex-1 min-w-[80px]">
                                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Minutes</label>
                                    <input 
                                      type="number" 
                                      value={step.durationMinutes} 
                                      onChange={e => updateStep(idx, 'durationMinutes', e.target.value)}
                                      className="w-full text-[10px] font-black bg-slate-50 px-3 py-2 rounded-xl outline-none ring-1 ring-slate-100"
                                    />
                                  </div>
                                  <button onClick={() => removeItem('step', idx)} className="text-red-500 font-black text-[10px] uppercase pt-4 hover:underline transition-all">Remove</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs md:text-sm text-slate-700 font-semibold leading-relaxed mb-3">{step.instruction}</p>
                                <div className="flex items-center gap-2">
                                   <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${step.type === 'cooking' ? 'bg-orange-50 text-orange-600 border-orange-100' : step.type === 'pre-start' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                     {step.type === 'pre-start' ? 'Prerequisite' : step.type}
                                   </span>
                                   <span className="text-[9px] font-black text-slate-300">
                                     ~{step.durationMinutes} mins
                                   </span>
                                </div>
                              </>
                            )}
                          </div>
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
          <header className="p-6 flex items-center justify-between bg-slate-800 shrink-0 border-b border-slate-700/50 shadow-xl">
            <div className="flex flex-col">
              <h2 className="text-white text-lg font-black truncate max-w-[200px] tracking-tight">{recipe.dishName}</h2>
              <p className="text-orange-400 text-[9px] font-black uppercase tracking-[0.2em]">
                {currentStepIndex === 0 ? 'Ingredient Review' : `Step ${currentStepIndex} of ${recipe.steps.length}`}
              </p>
            </div>
            <button onClick={closeCookingMode} className="text-slate-400 hover:text-white p-2 active:scale-90 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </header>

          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto px-6 py-8">
              {currentStepIndex === 0 ? (
                /* OVERVIEW PAGE */
                <div className="space-y-8 animate-in slide-in-from-right-4">
                   <div className="bg-slate-800/80 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl">
                      <h4 className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">Pantry Prep</h4>
                      <div className="space-y-4">
                        {recipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex justify-between items-center text-base font-bold text-slate-100 border-b border-slate-700/50 pb-3 last:border-0">
                             <span className="text-slate-200">{ing.name}</span>
                             <span className="text-orange-500">{ing.kitchen.value} {ing.kitchen.unit}</span>
                          </div>
                        ))}
                      </div>
                   </div>

                   {recipe.pairedWith && recipe.pairedWith.length > 0 && (
                     <div className="bg-slate-800/40 p-6 rounded-[2rem] border border-slate-700">
                        <h4 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Goes Great With</h4>
                        <div className="flex flex-wrap gap-2">
                          {recipe.pairedWith.map(pid => {
                            const found = allRecipes.find(r => r.id === pid);
                            return found ? <span key={pid} className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold">{found.dishName}</span> : null;
                          })}
                        </div>
                     </div>
                   )}
                </div>
              ) : (
                /* STEP PAGE */
                <div className="h-full flex flex-col justify-center items-center text-center animate-in slide-in-from-right-4">
                  <div className="bg-white rounded-[3rem] p-10 shadow-2xl w-full border border-slate-100">
                     <div className="flex flex-col items-center gap-4 mb-10">
                        <div className="w-20 h-20 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-2xl rotate-2">
                          {currentStepIndex}
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${recipe.steps[currentStepIndex-1].type === 'cooking' ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {recipe.steps[currentStepIndex-1].type}
                           </span>
                           <span className="text-[11px] font-black text-slate-400">
                             ~{recipe.steps[currentStepIndex-1].durationMinutes} mins
                           </span>
                        </div>
                     </div>
                     <p className="text-2xl font-bold text-slate-800 leading-snug">
                       {recipe.steps[currentStepIndex - 1].instruction}
                     </p>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK VIEW INGREDIENTS OVERLAY */}
            {showIngredientsOverlay && (
              <div 
                className="absolute inset-0 bg-slate-900/98 z-[100] p-10 flex flex-col animate-in fade-in slide-in-from-bottom-10"
                onClick={() => setShowIngredientsOverlay(false)}
              >
                 <div className="flex items-center justify-between mb-10">
                    <h3 className="text-white text-2xl font-black tracking-tight">Check Quantity</h3>
                    <button className="text-slate-500 p-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                 </div>
                 <div className="overflow-y-auto space-y-5">
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-100 text-xl font-bold border-b border-white/10 pb-4">
                         <span>{ing.name}</span>
                         <span className="text-orange-500">{ing.kitchen.value} {ing.kitchen.unit}</span>
                      </div>
                    ))}
                 </div>
                 <p className="text-slate-500 text-[10px] font-black uppercase text-center mt-auto tracking-[0.4em] py-6 animate-pulse">Tap anywhere to return to steps</p>
              </div>
            )}
          </div>

          <footer className="p-6 flex gap-4 bg-slate-800 shrink-0 border-t border-slate-700/50 shadow-2xl">
             <button 
               onClick={() => setShowIngredientsOverlay(true)}
               className="w-16 h-16 bg-slate-700 text-slate-300 rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all"
               title="Quick Check Ingredients"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
             </button>
             
             {currentStepIndex > 0 && (
               <button 
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                className="flex-1 bg-slate-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
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
               className="flex-[2] bg-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
             >
                {currentStepIndex === 0 ? 'Start Cooking' : currentStepIndex === recipe.steps.length ? 'I\'m Finished' : 'Next Step'}
             </button>
          </footer>
        </div>
      )}
    </>
  );
};
