
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, StandardizedIngredient } from './types';
import { RecipeInput } from './components/RecipeInput';
import { RecipeCard } from './components/RecipeCard';
import { IngredientDatabase } from './components/IngredientDatabase';
import { CookingOps } from './components/CookingOps';
import { MealPlanning } from './components/MealPlanning';
import { parseRecipeContent } from './services/geminiService';
import { db, auth, isConfigured, loginWithGoogle } from './firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cms' | 'ops' | 'planning' | 'inventory'>('cms');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth State
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
  }, []);

  // Sync Recipes
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, "recipes"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const list: Recipe[] = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id } as Recipe));
      setRecipes(list);
    });
  }, [user]);

  const masterIngredientsList = useMemo(() => {
    const dbIng: Record<string, StandardizedIngredient> = {};
    
    // Group exactly by name now, we'll handle normalization via manual merge tools
    recipes.forEach(r => {
      r.ingredients.forEach(i => {
        const name = i.name.trim();
        if (!dbIng[name]) dbIng[name] = { name, recipesUsing: [] };
        if (!dbIng[name].recipesUsing.includes(r.dishName)) dbIng[name].recipesUsing.push(r.dishName);
      });
    });
    return Object.values(dbIng);
  }, [recipes]);

  const handleProcess = async (content: string) => {
    setLoading(true); setError(null);
    try {
      const existing = masterIngredientsList.map(i => i.name);
      const res = await parseRecipeContent(content, existing);
      await addDoc(collection(db!, "recipes"), {
        ...res,
        servings: 2,
        timestamp: Date.now(),
        ownerId: user?.uid
      });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const deleteRecipe = async (id: string) => {
    if (confirm("Delete this recipe?")) await deleteDoc(doc(db!, "recipes", id));
  };

  const updateRecipe = async (r: Recipe) => {
    await updateDoc(doc(db!, "recipes", r.id), { ...r });
  };

  const handleMergeIngredients = async (oldNames: string[], newName: string) => {
    if (!db || recipes.length === 0) return;
    const batch = writeBatch(db);
    let count = 0;

    recipes.forEach(recipe => {
      let changed = false;
      const updatedIngredients = recipe.ingredients.map(ing => {
        if (oldNames.includes(ing.name)) {
          changed = true;
          return { ...ing, name: newName };
        }
        return ing;
      });

      if (changed) {
        const recipeRef = doc(db!, "recipes", recipe.id);
        batch.update(recipeRef, { ingredients: updatedIngredients });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Successfully merged ingredients in ${count} recipes.`);
    }
  };

  const handleRenameIngredient = async (oldName: string, newName: string) => {
    await handleMergeIngredients([oldName], newName);
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase tracking-widest animate-pulse">Initializing OS...</div>;

  if (!user) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[3rem] text-center shadow-2xl">
        <h1 className="text-3xl font-black mb-2">Cooking <span className="text-orange-500">Ops</span></h1>
        <p className="text-slate-400 mb-8 font-bold text-xs uppercase tracking-widest">Authentication Required</p>
        <button onClick={loginWithGoogle} className="w-full py-4 px-8 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3">
          Login with Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <nav className="sticky top-0 z-[200] bg-slate-900 text-white h-20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-lg font-black tracking-tighter hidden sm:block">Cooking <span className="text-orange-400">Ops</span></h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-6">
            <button onClick={() => setActiveTab('cms')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cms' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>CMS</button>
            <button onClick={() => setActiveTab('ops')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ops' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>Cooking Ops</button>
            <button onClick={() => setActiveTab('planning')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'planning' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>Meal Planning</button>
            <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>Inventory</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {activeTab === 'cms' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8">
              <RecipeInput onProcess={handleProcess} isLoading={loading} />
              <div className="space-y-8">
                {recipes.map(r => (
                   <RecipeCard 
                     key={r.id} 
                     recipe={r} 
                     onRemove={deleteRecipe} 
                     onUpdate={updateRecipe} 
                     allRecipes={recipes}
                   />
                ))}
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="sticky top-28">
                <IngredientDatabase 
                  ingredients={masterIngredientsList} 
                  onMerge={handleMergeIngredients}
                  onRename={handleRenameIngredient}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ops' && <CookingOps allRecipes={recipes} />}
        {activeTab === 'planning' && <MealPlanning allRecipes={recipes} />}
        {activeTab === 'inventory' && (
          <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <h2 className="text-2xl font-black mb-2">Inventory System</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Coming Soon • Phase 3</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
