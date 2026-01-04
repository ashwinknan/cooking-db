
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, Ingredient, RecipeStep, RecipeCategory } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onRemove: (id: string) => void;
  onUpdate: (updatedRecipe: Recipe) => Promise<void>;
  allRecipes?: Recipe[]; // To support pairing search
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onRemove, onUpdate, allRecipes = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Recipe>(recipe);
  const [pairingSearch, setPairingSearch] = useState('');

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

  const togglePairing = (id: string) => {
    const pairs = draft.pairedWith || [];
    const newPairs = pairs.includes(id) ? pairs.filter(p => p !== id) : [...pairs, id];
    setDraft({ ...draft, pairedWith: newPairs });
  };

  const availablePairings = useMemo(() => {
    if (!pairingSearch.trim()) return [];
    return allRecipes.filter(r => 
      r.id !== recipe.id && 
      (r.dishName.toLowerCase().includes(pairingSearch.toLowerCase()) || 
       r.variations.some(v => v.toLowerCase().includes(pairingSearch.toLowerCase())))
    );
  }, [pairingSearch, allRecipes, recipe.id]);

  const getCategoryColor = (cat: RecipeCategory) => {
    switch (cat) {
      case 'breakfast': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'evening snack': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const preStartSteps = draft.steps.filter(s => s.type === 'pre-start');
  const activeSteps = draft.steps.filter(s => s.type !== 'pre-start');

  return (
    <div className={`bg-white rounded-[2rem] overflow-hidden border transition-all mb-6 ${isExpanded ? 'border-orange-200 shadow-xl' : 'border-slate-100 shadow-sm'}`}>
      <div 
        className="p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            {isEditing ? (
              <input 
                value={draft.dishName} 
                onChange={e => setDraft({...draft, dishName: e.target.value})}
                className="text-xl font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded-lg outline-none"
              />
            ) : (
              <h3 className="text-xl font-bold text-slate-800">{recipe.dishName}</h3>
            )}
            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${getCategoryColor(recipe.category)}`}>
              {recipe.category}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            2 Servings • {recipe.servingSizeInfo}
          </p>
          {recipe.variations?.length > 0 && !isEditing && (
             <div className="flex gap-1 mt-1">
                {recipe.variations.map(v => <span key={v} className="text-[8px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{v}</span>)}
             </div>
          )}
        </div>
        
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isExpanded && (
            <button 
              onClick={() => { if (!isEditing) setDraft(recipe); setIsEditing(!isEditing); }}
              className={`p-2.5 rounded-xl ${isEditing ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
          )}
          <button onClick={() => onRemove(recipe.id)} className="p-2.5 text-slate-300 hover:text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-8 border-t border-slate-50 bg-slate-50/20">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Recipe Configuration</h4>
            {isEditing && (
              <button 
                onClick={handleSave} 
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"
              >
                {isSaving ? "Saving..." : "Commit Changes"}
              </button>
            )}
          </div>

          {isEditing && (
            <div className="mb-8 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
               <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Variations</label>
               <div className="flex flex-wrap gap-2">
                  {draft.variations?.map((v, i) => (
                    <div key={i} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                       <input value={v} onChange={e => {
                          const vrs = [...draft.variations];
                          vrs[i] = e.target.value;
                          setDraft({...draft, variations: vrs});
                       }} className="bg-transparent text-[10px] font-bold outline-none w-24" />
                       <button onClick={() => removeItem('variation', i)} className="text-red-400">×</button>
                    </div>
                  ))}
                  <button onClick={() => addItem('variation')} className="text-[10px] bg-slate-900 text-white px-3 py-1 rounded-lg">+</button>
               </div>
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between mb-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredients</h4>
                 {isEditing && <button onClick={() => addItem('ingredient')} className="text-[10px] font-black text-orange-600">+ Add</button>}
              </div>
              <div className="space-y-3">
                {(isEditing ? draft.ingredients : recipe.ingredients).map((ing, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group">
                    {isEditing ? (
                      <div className="space-y-2">
                         <div className="flex justify-between">
                            <input value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} className="font-bold text-sm bg-slate-50 px-2 py-1 rounded flex-1 mr-2 outline-none" />
                            <button onClick={() => removeItem('ingredient', idx)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                         </div>
                         <div className="flex gap-2">
                            <input type="number" value={ing.kitchen.value} onChange={e => updateIngredient(idx, 'kitchenValue', e.target.value)} className="w-16 bg-slate-50 text-[10px] font-black px-2 py-1 rounded" />
                            <input value={ing.kitchen.unit} onChange={e => updateIngredient(idx, 'kitchenUnit', e.target.value)} className="w-16 bg-slate-50 text-[10px] font-black px-2 py-1 rounded" />
                            <span className="text-[10px] text-slate-300 self-center">|</span>
                            <input type="number" value={ing.shopping.value} onChange={e => updateIngredient(idx, 'shoppingValue', e.target.value)} className="w-16 bg-slate-50 text-[10px] font-black px-2 py-1 rounded" />
                            <input value={ing.shopping.unit} onChange={e => updateIngredient(idx, 'shoppingUnit', e.target.value)} className="w-16 bg-slate-50 text-[10px] font-black px-2 py-1 rounded" />
                         </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">{ing.name}</span>
                        <div className="text-right">
                          <p className="text-[10px] text-orange-600 font-bold">{ing.kitchen.value} {ing.kitchen.unit}</p>
                          <p className="text-[9px] text-blue-500 font-black">{ing.shopping.value} {ing.shopping.unit}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pairs With Section */}
              <div className="mt-10">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pairs With</h4>
                 <div className="flex flex-wrap gap-2 mb-4">
                    {draft.pairedWith?.map(pid => {
                       const found = allRecipes.find(r => r.id === pid);
                       return found ? (
                         <div key={pid} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 border border-orange-100">
                           {found.dishName}
                           {isEditing && <button onClick={() => togglePairing(pid)} className="text-orange-400 hover:text-orange-600">×</button>}
                         </div>
                       ) : null;
                    })}
                 </div>
                 {isEditing && (
                    <div className="relative">
                       <input 
                         placeholder="Search pairs..." 
                         value={pairingSearch}
                         onChange={e => setPairingSearch(e.target.value)}
                         className="w-full bg-white p-3 rounded-xl border border-slate-100 text-[10px] font-bold outline-none focus:border-orange-200"
                       />
                       {availablePairings.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-white border border-slate-100 rounded-xl shadow-xl mt-2 z-10 overflow-hidden">
                             {availablePairings.slice(0, 5).map(r => (
                               <button 
                                 key={r.id} 
                                 onClick={() => { togglePairing(r.id); setPairingSearch(''); }}
                                 className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-slate-50 border-b last:border-0"
                               >
                                 {r.dishName}
                               </button>
                             ))}
                          </div>
                       )}
                    </div>
                 )}
              </div>
            </div>

            <div className="lg:col-span-7">
              {preStartSteps.length > 0 && (
                <div className="mb-8 p-6 bg-yellow-50 rounded-3xl border border-yellow-100">
                  <h5 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3 italic">Pre-Start (Prerequisites)</h5>
                  <div className="space-y-2">
                    {preStartSteps.map((s, i) => (
                      <div key={i} className="text-sm font-medium text-yellow-800 italic">• {s.instruction}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Steps</h4>
                 {isEditing && <button onClick={() => addItem('step')} className="text-[10px] font-black text-orange-600">+ Add</button>}
              </div>
              <div className="space-y-4">
                {(isEditing ? draft.steps : recipe.steps).map((step, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-start gap-4 shadow-sm">
                    <span className="bg-slate-900 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg">{idx + 1}</span>
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                           <textarea 
                             value={step.instruction} 
                             onChange={e => updateStep(idx, 'instruction', e.target.value)} 
                             className="w-full bg-slate-50 p-2 rounded-lg text-sm font-medium outline-none resize-none" 
                           />
                           <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                 <select 
                                   value={step.type} 
                                   onChange={e => updateStep(idx, 'type', e.target.value)}
                                   className="text-[10px] font-black bg-slate-50 px-2 py-1 rounded-lg"
                                 >
                                    <option value="prep">Prep</option>
                                    <option value="cooking">Cooking</option>
                                    <option value="pre-start">Pre-Start</option>
                                 </select>
                                 <input 
                                   type="number" 
                                   value={step.durationMinutes} 
                                   onChange={e => updateStep(idx, 'durationMinutes', e.target.value)}
                                   className="w-16 text-[10px] font-black bg-slate-50 px-2 py-1 rounded-lg"
                                 />
                                 <span className="text-[10px] font-black text-slate-400 self-center uppercase tracking-tighter">Mins</span>
                              </div>
                              <button onClick={() => removeItem('step', idx)} className="text-red-500 text-[10px] font-black uppercase">Remove</button>
                           </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">{step.instruction}</p>
                          <div className="mt-2 flex items-center gap-2">
                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${step.type === 'cooking' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>{step.type}</span>
                             <span className="text-[9px] font-black text-slate-400 tracking-tighter">{step.durationMinutes}m duration</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
