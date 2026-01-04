
import React, { useState, useEffect } from 'react';
import { Recipe, Ingredient, RecipeStep, RecipeCategory } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onRemove: (id: string) => void;
  onUpdate: (updatedRecipe: Recipe) => Promise<void>;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onRemove, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number>(0);
  const [draft, setDraft] = useState<Recipe>(recipe);

  useEffect(() => {
    if (!isEditing && !isSaving) {
      if (recipe.timestamp >= lastSavedTimestamp) {
        setDraft(recipe);
      }
    }
  }, [recipe.id, recipe.timestamp, isEditing, isSaving, lastSavedTimestamp]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    const newTimestamp = Date.now();
    try {
      const payload: Recipe = {
        ...JSON.parse(JSON.stringify(draft)),
        timestamp: newTimestamp
      };
      await onUpdate(payload);
      setLastSavedTimestamp(newTimestamp);
      setIsEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...draft.ingredients];
    const ing = { ...newIngredients[index] };
    if (field === 'name') ing.name = value;
    else if (field === 'kitchenValue') ing.kitchen = { ...ing.kitchen, value: Number(value) };
    else if (field === 'kitchenUnit') ing.kitchen = { ...ing.kitchen, unit: value };
    else if (field === 'shopValue') ing.shopping = { ...ing.shopping, value: Number(value) };
    else if (field === 'shopUnit') ing.shopping = { ...ing.shopping, unit: value };
    newIngredients[index] = ing;
    setDraft({ ...draft, ingredients: newIngredients });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...draft.steps];
    const step = { ...newSteps[index] };
    if (field === 'instruction') step.instruction = value;
    else if (field === 'durationMinutes') step.durationMinutes = Number(value);
    newSteps[index] = step;
    setDraft({ ...draft, steps: newSteps });
  };

  const updateVariations = (val: string) => {
    const variations = val.split(',').map(v => v.trim()).filter(v => v !== "");
    setDraft({ ...draft, variations });
  };

  const getCategoryColor = (cat: RecipeCategory) => {
    switch (cat) {
      case 'breakfast': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'evening snack': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const currentCategory = (isEditing || isSaving ? draft.category : recipe.category) || 'lunch/dinner';
  const displayVariations = (isEditing || isSaving ? draft.variations : recipe.variations) || [];
  const displayName = (isEditing || isSaving ? draft.dishName : recipe.dishName);

  return (
    <div className={`bg-white rounded-[2rem] overflow-hidden border transition-all mb-6 ${isExpanded ? 'border-orange-200 shadow-xl' : 'border-slate-100 shadow-sm'}`}>
      <div 
        className="p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-bold text-slate-800">{displayName}</h3>
            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${getCategoryColor(currentCategory)}`}>
              {currentCategory}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {recipe.ingredients.length} Ingredients • {recipe.steps.length} Steps
            </p>
            {recipe.sources && recipe.sources.length > 0 && (
              <a 
                href={recipe.sources[0].uri} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-tighter flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Source
              </a>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isExpanded && (
            <button 
              disabled={isSaving}
              onClick={() => {
                if (!isEditing) setDraft(recipe);
                setIsEditing(!isEditing);
              }}
              className={`p-2.5 rounded-xl transition-colors ${isEditing ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
          )}
          <button 
            disabled={isSaving}
            onClick={() => onRemove(recipe.id)}
            className="p-2.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-8 border-t border-slate-50 bg-slate-50/20">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-10">
            <div className="flex-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Variations / Also Known As</h4>
              {isEditing ? (
                <input 
                  className="w-full text-sm font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
                  value={draft.variations.join(', ')}
                  placeholder="e.g. Traditional Hummus, Chickpea Dip..."
                  onChange={e => updateVariations(e.target.value)}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {displayVariations.map((v, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-widest font-black px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg">
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="min-w-[160px]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:text-right">Meal Category</h4>
              {isEditing ? (
                <select 
                  value={draft.category}
                  onChange={e => setDraft({...draft, category: e.target.value as RecipeCategory})}
                  className="w-full text-sm font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch/dinner">Lunch/Dinner</option>
                  <option value="evening snack">Evening Snack</option>
                </select>
              ) : (
                <div className={`text-[10px] font-black uppercase text-center px-4 py-2.5 rounded-xl border ${getCategoryColor(currentCategory)}`}>
                  {currentCategory}
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <header className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Ingredients (Scaled to 4)</h4>
                <span className="text-[9px] font-black text-slate-400 uppercase">Kitchen vs Shopping</span>
              </header>
              <div className="space-y-2">
                {draft.ingredients.map((ing, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-hover hover:border-orange-100">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input className="w-full text-sm font-bold bg-slate-50 p-2 rounded-lg" value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-orange-400 uppercase">Kitchen</label>
                            <div className="flex gap-1">
                              <input className="w-14 text-[10px] bg-slate-50 p-1.5 rounded" type="number" step="any" value={ing.kitchen.value} onChange={e => updateIngredient(idx, 'kitchenValue', e.target.value)} />
                              <input className="w-full text-[10px] bg-slate-50 p-1.5 rounded" value={ing.kitchen.unit} onChange={e => updateIngredient(idx, 'kitchenUnit', e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-blue-400 uppercase">Shopping</label>
                            <div className="flex gap-1">
                              <input className="w-14 text-[10px] bg-slate-50 p-1.5 rounded" type="number" step="any" value={ing.shopping.value} onChange={e => updateIngredient(idx, 'shopValue', e.target.value)} />
                              <input className="w-full text-[10px] bg-slate-50 p-1.5 rounded" value={ing.shopping.unit} onChange={e => updateIngredient(idx, 'shopUnit', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">{ing.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-orange-600 font-bold uppercase">{ing.kitchen.value} {ing.kitchen.unit}</span>
                            <span className="text-[9px] text-blue-500 font-medium">{ing.shopping.value} {ing.shopping.unit}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Operations Workflow (Action Cards)</h4>
              <div className="space-y-4">
                {draft.steps.map((step, idx) => (
                  <div key={idx} className="group relative bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-orange-200 transition-all">
                    <div className="absolute -left-3 top-5 w-7 h-7 bg-slate-900 text-white text-[10px] font-black flex items-center justify-center rounded-lg shadow-lg rotate-[-10deg] group-hover:rotate-0 transition-transform">
                      {idx + 1}
                    </div>
                    {isEditing ? (
                      <div className="space-y-3 pl-4">
                        <textarea className="w-full text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-200" rows={3} value={step.instruction} onChange={e => updateStep(idx, 'instruction', e.target.value)} />
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Timing (mins)</span>
                          <input className="w-20 text-xs font-bold bg-slate-50 p-2 rounded-lg" type="number" value={step.durationMinutes} onChange={e => updateStep(idx, 'durationMinutes', e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <div className="pl-6 flex justify-between gap-6">
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{step.instruction}</p>
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Duration</span>
                          <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">{step.durationMinutes}m</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {isEditing && (
                <div className="mt-10 flex justify-end gap-3">
                   <button 
                    disabled={isSaving}
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isSaving}
                    onClick={handleSave}
                    className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Persisting...
                      </>
                    ) : "Commit Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
