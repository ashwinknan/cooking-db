
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
  const [draft, setDraft] = useState<Recipe>(recipe);

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

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...draft.ingredients];
    const ing = { ...newIngredients[index] };
    if (field === 'name') ing.name = value;
    else if (field.includes('Value')) (ing as any)[field.replace('Value','')].value = Number(value);
    else (ing as any)[field.replace('Unit','')].unit = value;
    newIngredients[index] = ing;
    setDraft({ ...draft, ingredients: newIngredients });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...draft.steps];
    (newSteps[index] as any)[field] = value;
    setDraft({ ...draft, steps: newSteps });
  };

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
            <h3 className="text-xl font-bold text-slate-800">{recipe.dishName}</h3>
            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${getCategoryColor(recipe.category)}`}>
              {recipe.category}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              2 Servings • {recipe.servingSizeInfo}
            </p>
          </div>
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
          {isEditing && (
            <div className="flex justify-end mb-6">
              <button 
                onClick={handleSave} 
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"
              >
                {isSaving ? "Saving..." : "Commit Changes"}
              </button>
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingredients (Mass Std.)</h4>
              <div className="space-y-2">
                {draft.ingredients.map((ing, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800">{ing.name}</span>
                      <div className="text-right">
                        <p className="text-[10px] text-orange-600 font-bold">{ing.kitchen.value} {ing.kitchen.unit}</p>
                        <p className="text-[9px] text-blue-500 font-black">{ing.shopping.value} {ing.shopping.unit}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              {preStartSteps.length > 0 && (
                <div className="mb-8 p-6 bg-yellow-50 rounded-3xl border border-yellow-100">
                  <h5 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3">Pre-Start (Required Before Hand)</h5>
                  <ul className="space-y-2">
                    {preStartSteps.map((s, i) => (
                      <li key={i} className="text-sm font-medium text-yellow-800 flex items-start gap-2 italic">
                        <span>•</span> {s.instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Active Production Timeline</h4>
              <div className="space-y-4">
                {activeSteps.map((step, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-start gap-4">
                    <span className="bg-slate-900 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{step.instruction}</p>
                      <div className="mt-2 flex items-center gap-2">
                         <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${step.type === 'cooking' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>{step.type}</span>
                         <span className="text-[9px] font-black text-slate-400">{step.durationMinutes}m duration</span>
                      </div>
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
