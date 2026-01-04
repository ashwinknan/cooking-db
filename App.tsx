
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
  writeBatch,
  arrayUnion,
  arrayRemove,
  setDoc,
  getDoc
} from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cms' | 'ops' | 'planning' | 'inventory'>('cms');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>(['Breakfast', 'Lunch/Dinner', 'Evening Snack']);
  const [loading, setLoading] = useState(false);

  // Auth State
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
  }, []);

  // Sync Recipes and Categories
  useEffect(() => {
    if (!db || !user) return;
    
    const recipesQ = query(collection(db, "recipes"), orderBy("timestamp", "desc"));
    const unsubRecipes = onSnapshot(recipesQ, (snap) => {
      const list: Recipe[] = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id } as Recipe));
      setRecipes(list);
    });

    const metaRef = doc(db, "metadata", "app_config");
    const unsubMeta = onSnapshot(metaRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().categories) {
        setCategories(docSnap.data().categories);
      }
    });

    return () => { unsubRecipes(); unsubMeta(); };
  }, [user]);

  const masterIngredientsList = useMemo(() => {
    const dbIng: Record<string, StandardizedIngredient> = {};
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
    setLoading(true);
    try {
      const existing = masterIngredientsList.map(i => i.name);
      const res = await parseRecipeContent(content, existing);
      await addDoc(collection(db!, "recipes"), {
        ...res,
        servings: 2,
        timestamp: Date.now(),
        ownerId: user?.uid,
        pairedWith: []
      });
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  const deleteRecipe = async (id: string) => {
    if (confirm("Delete this recipe?")) {
      const batch = writeBatch(db!);
      // Clean up pairings elsewhere
      recipes.forEach(r => {
        if (r.pairedWith?.includes(id)) {
          batch.update(doc(db!, "recipes", r.id), { pairedWith: arrayRemove(id) });
        }
      });
      batch.delete(doc(db!, "recipes", id));
      await batch.commit();
    }
  };

  const updateRecipe = async (r: Recipe) => {
    await updateDoc(doc(db!, "recipes", r.id), { ...r });
  };

  const handleTogglePairing = async (recipeAId: string, recipeBId: string) => {
    if (!db) return;
    const batch = writeBatch(db);
    const recipeA = recipes.find(r => r.id === recipeAId);
    const isAdding = !recipeA?.pairedWith?.includes(recipeBId);

    if (isAdding) {
      batch.update(doc(db, "recipes", recipeAId), { pairedWith: arrayUnion(recipeBId) });
      batch.update(doc(db, "recipes", recipeBId), { pairedWith: arrayUnion(recipeAId) });
    } else {
      batch.update(doc(db, "recipes", recipeAId), { pairedWith: arrayRemove(recipeBId) });
      batch.update(doc(db, "recipes", recipeBId), { pairedWith: arrayRemove(recipeAId) });
    }
    await batch.commit();
  };

  const handleAddCategory = async (newCat: string) => {
    if (!db || categories.includes(newCat)) return;
    const next = [...categories, newCat];
    await setDoc(doc(db, "metadata", "app_config"), { categories: next }, { merge: true });
  };

  const handleMergeIngredients = async (oldNames: string[], newName: string) => {
    if (!db || recipes.length === 0) return;
    const batch = writeBatch(db);
    recipes.forEach(recipe => {
      let changed = false;
      const updatedIngredients = recipe.ingredients.map(ing => {
        if (oldNames.includes(ing.name)) { changed = true; return { ...ing, name: newName }; }
        return ing;
      });
      if (changed) batch.update(doc(db!, "recipes", recipe.id), { ingredients: updatedIngredients });
    });
    await batch.commit();
  };

  const handleRenameIngredient = async (oldName: string, newName: string) => {
    await handleMergeIngredients([oldName], newName);
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">Initializing OS...</div>;

  if (!user) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[2.5rem] text-center shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-black mb-2 tracking-tighter">Cooking <span className="text-orange-500">Ops</span></h1>
        <p className="text-slate-400 mb-8 font-bold text-[10px] uppercase tracking-[0.2em]">Kitchen OS Production</p>
        <button onClick={loginWithGoogle} className="w-full py-4 px-8 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3">
          Login with Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile-Native Responsive Nav */}
      <nav className="sticky top-0 z-[200] bg-slate-900 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-lg font-black tracking-tighter">Ops</h1>
          </div>
          
          <div className="flex gap-1 md:gap-4 overflow-x-auto no-scrollbar">
            {['cms', 'ops', 'planning', 'inventory'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={`px-3 py-1.5 md:px-5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-orange-500 text-white' : 'text-slate-400'}`}
              >
                {tab === 'cms' ? 'Library' : tab === 'ops' ? 'Cooking' : tab === 'planning' ? 'Planning' : 'Items'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {activeTab === 'cms' && (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-10">
            <div className="lg:col-span-8 order-2 lg:order-1">
              <RecipeInput onProcess={handleProcess} isLoading={loading} />
              <div className="space-y-4 md:space-y-8">
                {recipes.map(r => (
                   <RecipeCard 
                     key={r.id} 
                     recipe={r} 
                     onRemove={deleteRecipe} 
                     onUpdate={updateRecipe} 
                     allRecipes={recipes}
                     categories={categories}
                     onTogglePairing={handleTogglePairing}
                   />
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 order-1 lg:order-2">
              <div className="lg:sticky lg:top-28">
                <IngredientDatabase 
                  ingredients={masterIngredientsList} 
                  onMerge={handleMergeIngredients}
                  onRename={handleRenameIngredient}
                />
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mt-6">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Categories Manager</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map(c => <span key={c} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600">{c}</span>)}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      id="newCatInput"
                      placeholder="New Category..." 
                      className="flex-1 bg-slate-50 border-none p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCategory(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('newCatInput') as HTMLInputElement;
                        handleAddCategory(input.value);
                        input.value = '';
                      }}
                      className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ops' && <CookingOps allRecipes={recipes} />}
        {activeTab === 'planning' && <MealPlanning allRecipes={recipes} />}
        {activeTab === 'inventory' && (
          <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <h2 className="text-2xl font-black mb-2">Inventory System</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Phase 3 Integration</p>
          </div>
        )}
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
