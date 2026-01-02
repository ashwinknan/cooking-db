
import React, { useState } from 'react';
import { Recipe, Ingredient, RecipeStep } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onRemove: (id: string) => void;
  onUpdate: (updatedRecipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onRemove, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<Recipe>(recipe);

  const handleSave = () => {
    onUpdate(editedRecipe);
    setIsEditing(false);
  };

  const updateIngredient = (index: number, field: keyof Ingredient | 'kitchenValue' | 'kitchenUnit' | 'shopValue' | 'shopUnit', value: any) => {
    const newIngredients = [...editedRecipe.ingredients];
    if (field === 'name') newIngredients[index].name = value;
    else if (field === 'kitchenValue') newIngredients[index].kitchen.value = Number(value);
    else if (field === 'kitchenUnit') newIngredients[index].kitchen.unit = value;
    else if (field === 'shopValue') newIngredients[index].shopping.value = Number(value);
    else if (field === 'shopUnit') newIngredients[index].shopping.unit = value;
    
    setEditedRecipe({ ...editedRecipe, ingredients: newIngredients });
  };

  const updateStep = (index: number, field: keyof RecipeStep, value: any) => {
    const newSteps = [...editedRecipe.steps];
    if (field === 'instruction') newSteps[index].instruction = value;
    else if (field === 'durationMinutes') newSteps[index].durationMinutes = Number(value);
    
    setEditedRecipe({ ...editedRecipe, steps: newSteps });
  };

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border ${isExpanded ? 'border-orange-200 shadow-md' : 'border-slate-100 shadow-sm'} transition-all mb-4`}>
      {/* Header View */}
      <div 
        className="p-4 sm:p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-800">{recipe.dishName}</h3>
            {!isExpanded && (
              <div className="hidden sm:flex flex-wrap gap-1">
                {recipe.variations.slice(0, 2).map((v, i) => (
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
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-lg transition-colors ${isEditing ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
            >
              {isEditing ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              )}
            </button>
          )}
          <button 
            onClick={() => onRemove(recipe.id)}
            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
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
          <div className="flex flex-wrap gap-2 mb-6">
            {recipe.variations.map((v, i) => (
              <span key={i} className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 bg-orange-50 text-orange-600 rounded-md">
                {v}
              </span>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ingredients Editor</h4>
              <div className="space-y-3">
                {editedRecipe.ingredients.map((ing, idx) => (
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
                            <input className="w-12 text-xs bg-slate-50 p-1 rounded" type="number" value={ing.kitchen.value} onChange={e => updateIngredient(idx, 'kitchenValue', e.target.value)} />
                            <input className="w-full text-xs bg-slate-50 p-1 rounded" value={ing.kitchen.unit} onChange={e => updateIngredient(idx, 'kitchenUnit', e.target.value)} />
                          </div>
                          <div className="flex gap-1">
                            <input className="w-12 text-xs bg-slate-50 p-1 rounded" type="number" value={ing.shopping.value} onChange={e => updateIngredient(idx, 'shopValue', e.target.value)} />
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
                {editedRecipe.steps.map((step, idx) => (
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
                    onClick={handleSave}
                    className="px-6 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Save Changes to DB
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
