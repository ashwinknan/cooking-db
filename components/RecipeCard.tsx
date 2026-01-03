
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
  
  // Local state for editing - separate from props
  const [draft, setDraft] = useState<Recipe>(recipe);

  // Sync draft with props ONLY when we aren't editing/saving AND a newer timestamp arrives
  useEffect(() => {
    if (!isEditing && !isSaving) {
      setDraft(recipe);
    }
  }, [recipe.id, recipe.timestamp, isEditing, isSaving]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Create a clean copy of draft to send to parent
      const cleanRecipe = JSON.parse(JSON.stringify(draft));
      await onUpdate(cleanRecipe);
      setIsEditing(false);
    } catch (err) {
      console.error("Save component level error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient | 'kitchenValue' | 'kitchenUnit' | 'shopValue' | 'shopUnit', value: any) => {
    const newIngredients = JSON.parse(JSON.stringify(draft.ingredients));
    if (field === 'name') newIngredients[index].name = value;
    else if (field === 'kitchenValue') newIngredients[index].kitchen.value = Number(value);
    else if (field === 'kitchenUnit') newIngredients[index].kitchen.unit = value;
    else if (field === 'shopValue') newIngredients[index].shopping.value = Number(value);
    else if (field === 'shopUnit') newIngredients[index].shopping.unit = value;
    
    setDraft({ ...draft, ingredients: newIngredients });
  };

  const updateStep = (index: number, field: keyof RecipeStep, value: any) => {
    const newSteps = JSON.parse(JSON.stringify(draft.steps));
    if (field === 'instruction') newSteps[index].instruction = value;
    else if (field === 'durationMinutes') newSteps[index].durationMinutes = Number(value);
    
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

  // When editing, ALWAYS show draft. Otherwise, show prop-derived data.
  const currentCategory = (isEditing || isSaving ? draft.category : recipe.category) || 'lunch/dinner';
  const displayVariations = (isEditing || isSaving ? draft.variations : recipe.variations) || [];
  const displayName = (isEditing || isSaving ? draft.dishName : recipe.dishName);

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border ${isExpanded ? 'border-orange-200 shadow-md' : 'border-slate-100 shadow-sm'} transition-all mb-4`}>
      {/* Header View */}
      <div 
        className="p-4 sm:p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex-1 sm:flex-initial">
              {isEditing ? (
                <input 
                  className="w-full sm:w-auto bg-slate-50 border-b-2 border-orange-200 outline-none px-2 py-0.5 text-xl font-bold rounded"
                  value={draft.dishName}
                  onChange={e => setDraft({...draft, dishName: e.target.value})}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <h3 className="text-xl font-bold text-slate-800">{displayName}</h3>
              )}
            </div>
            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${getCategoryColor(currentCategory)}`}>
              {currentCategory}
            </span>
            {!isExpanded && (
              <div className="hidden sm:flex flex-wrap gap-1">
                {displayVariations.slice(0, 1).map((v, i) => (
                  <span key={i} className="text-[9px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {recipe.ingredients.length} Ingredients • {recipe.steps.length} Steps • {recipe.totalTimeMinutes}m
          </p>
        </div>
        
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isExpanded && (
            <button 
              disabled={isSaving}
              onClick={() => {
                if (!isEditing) setDraft(recipe); // Reset draft to current props when starting to edit
                setIsEditing(!isEditing);
              }}
              className={`p-2 rounded-lg transition-colors ${isEditing ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'} ${isSaving ? 'opacity-50' : ''}`}
            >
              {isEditing ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              )}
            </button>
          )}
          <button 
            disabled={isSaving}
            onClick={() => onRemove(recipe.id)}
            className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="p-6 border-t border-slate-50 bg-slate-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Variations / Also Known As</h4>
              {isEditing ? (
                <input 
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                  value={draft.variations.join(', ')}
                  placeholder="Separate variations with commas..."
                  onChange={e => updateVariations(e.target.value)}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {displayVariations.map((v, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 bg-orange-50 text-orange-600 rounded-md">
                      {v}
                    </span>
                  ))}
                  {displayVariations.length === 0 && <span className="text-[10px] italic text-slate-400">No variations listed</span>}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2 min-w-[140px]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest sm:text-right">Meal Category</h4>
              {isEditing ? (
                <select 
                  value={draft.category || 'lunch/dinner'}
                  onChange={e => setDraft({...draft, category: e.target.value as RecipeCategory})}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch/dinner">Lunch/Dinner</option>
                  <option value="evening snack">Evening Snack</option>
                </select>
              ) : (
                <span className={`text-[10px] font-black uppercase text-center px-4 py-1.5 rounded-xl border ${getCategoryColor(currentCategory)}`}>
                  {currentCategory}
                </span>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ingredients Editor</h4>
              <div className="space-y-3">
                {draft.ingredients.map((ing, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input 
                          className="w-full text-sm font-bold bg-slate-50 p-1 rounded" 
                          value={ing.name} 
                          onChange={e => updateIngredient(idx, 'name', e.target.value)} 
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex gap-1">
                            <input className="w-12 text-xs bg-slate-50 p-1 rounded" type="number" step="any" value={ing.kitchen.value} onChange={e => updateIngredient(idx, 'kitchenValue', e.target.value)} />
                            <input className="w-full text-xs bg-slate-50 p-1 rounded" value={ing.kitchen.unit} onChange={e => updateIngredient(idx, 'kitchenUnit', e.target.value)} />
                          </div>
                          <div className="flex gap-1">
                            <input className="w-12 text-xs bg-slate-50 p-1 rounded" type="number" step="any" value={ing.shopping.value} onChange={e => updateIngredient(idx, 'shopValue', e.target.value)} />
                            <input className="w-full text-xs bg-slate-50 p-1 rounded" value={ing.shopping.unit} onChange={e => updateIngredient(idx, 'shopUnit', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{ing.name}</span>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs text-orange-600 font-medium">
                            <span className="text-slate-400 mr-1 italic">Kitch:</span>
                            {ing.kitchen.value} {ing.kitchen.unit}
                          </span>
                          <span className="text-xs text-blue-600 font-medium">
                            <span className="text-slate-400 mr-1 italic">Shop:</span>
                            {ing.shopping.value} {ing.shopping.unit}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Steps Workflow</h4>
              <div className="space-y-4">
                {draft.steps.map((step, idx) => (
                  <div key={idx} className="group relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-orange-200 transition-all">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-3 w-full">
                        <span className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        {isEditing ? (
                          <div className="flex-1 space-y-2">
                            <textarea 
                              className="w-full text-sm text-slate-700 bg-slate-50 p-2 rounded outline-none" 
                              rows={2}
                              value={step.instruction} 
                              onChange={e => updateStep(idx, 'instruction', e.target.value)} 
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">Time (mins):</span>
                              <input 
                                className="w-16 text-xs bg-slate-50 p-1 rounded" 
                                type="number" 
                                value={step.durationMinutes} 
                                onChange={e => updateStep(idx, 'durationMinutes', e.target.value)} 
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">
                            {step.instruction}
                          </p>
                        )}
                      </div>
                      {!isEditing && (
                        <span className="flex-shrink-0 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                          {step.durationMinutes} min
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {isEditing && (
                <div className="mt-8 flex justify-end">
                  <button 
                    disabled={isSaving}
                    onClick={handleSave}
                    className="px-6 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Persisting...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        Save Changes
                      </>
                    )}
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
