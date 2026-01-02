
import React from 'react';
import { StandardizedIngredient } from '../types';

interface IngredientDatabaseProps {
  ingredients: StandardizedIngredient[];
}

export const IngredientDatabase: React.FC<IngredientDatabaseProps> = ({ ingredients }) => {
  if (ingredients.length === 0) return null;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-orange-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </span>
          Master Pantry List
        </h2>
        <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
          {ingredients.length} Items
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ingredients.sort((a, b) => a.name.localeCompare(b.name)).map((ing) => (
          <div key={ing.name} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="text-sm font-bold text-orange-300">{ing.name}</div>
            <div className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">
              Recipes: {ing.recipesUsing.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
