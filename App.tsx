
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, StandardizedIngredient } from './types';
import { RecipeInput } from './components/RecipeInput';
import { RecipeCard } from './components/RecipeCard';
import { IngredientDatabase } from './components/IngredientDatabase';
import { CookingOps } from './components/CookingOps';
import { MealPlanning } from './components/MealPlanning';
import { parseRecipeContent } from './services/geminiService';
import { db, auth, isConfigured, loginWithGoogle, logout } from './firebaseConfig';
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
  setDoc
} from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'library' | 'cook' | 'plan' | 'pantry'>('library');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>(['Breakfast', 'Lunch/Dinner', 'Snack']);
  const [loading, setLoading] = useState(false);
  const [showPantryMobile, setShowPantryMobile] = useState(false);
  const [contactEmail, setContactEmail] = useState('');

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCuisine, setFilterCuisine] = useState('');

  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
  }, []);

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

  const uniqueCuisines = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => { if (r.cuisine) set.add(r.cuisine); });
    return Array.from(set).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        r.dishName.toLowerCase().includes(q) || 
        r.cuisine?.toLowerCase().includes(q) ||
        r.variations?.some(v => v.toLowerCase().includes(q));
      const matchesCategory = !filterCategory || r.category === filterCategory;
      const matchesCuisine = !filterCuisine || r.cuisine === filterCuisine;
      return matchesSearch && matchesCategory && matchesCuisine;
    });
  }, [recipes, searchQuery, filterCategory, filterCuisine]);

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
    if (confirm("Remove this recipe from your collection?")) {
      const batch = writeBatch(db!);
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

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">Setting up your kitchen Buddy...</div>;

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <header className="w-full bg-slate-900 py-20 px-6 text-center text-white rounded-b-[3rem] md:rounded-b-[5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3">
             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter">Cooking <span className="text-orange-500">Buddy</span></h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Your interactive kitchen memory. Save recipes from any link, standardized and ready to cook in a tap.
          </p>
          <button onClick={loginWithGoogle} className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>
            Sign In with Google
          </button>
        </div>
      </header>

      <section className="max-w-4xl mx-auto py-24 px-6 grid md:grid-cols-2 gap-16">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Standardized for You</h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            We don't just "save" recipes. We <strong>standardize</strong> them. Every link you paste is parsed by AI to ensure quantities are consistent, portions are scaled for two, and steps are grouped by activity type. It's the cleanest recipe library you'll ever own.
          </p>
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Operationally Optimized</h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Once your recipes are in Buddy, you can optimize your cooking. Interleave steps from multiple dishes, plan your week based on what's in your fridge, and cook with a mobile-first interface designed for busy hands.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-24 px-6 border-y border-slate-100">
        <div className="max-w-xl mx-auto text-center">
          <h3 className="text-2xl font-black text-slate-900 mb-4">Join our private beta</h3>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-10">We're building the future of home cooking together</p>
          <div className="flex flex-col sm:flex-row gap-4">
             <input 
               type="email" 
               placeholder="your@email.com" 
               value={contactEmail}
               onChange={e => setContactEmail(e.target.value)}
               className="flex-1 bg-slate-50 border border-slate-200 p-5 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-orange-500 font-bold" 
             />
             <button onClick={() => { alert("Thanks! We'll reach out soon."); setContactEmail(''); }} className="bg-slate-900 text-white px-10 py-5 rounded-[1.5rem] font-black hover:bg-black transition-all shadow-xl">Notify Me</button>
          </div>
        </div>
      </section>
      
      <footer className="py-12 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
        © 2025 Cooking Buddy Ops • Standardized with Care
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="sticky top-0 z-[200] bg-slate-900 text-white shadow-xl h-16 md:h-20 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-lg font-black tracking-tighter hidden xs:block">Buddy</h1>
          </div>
          
          <div className="flex gap-1 md:gap-4 overflow-x-auto no-scrollbar py-2 px-2">
            {[
              { id: 'library', label: 'My Recipes' },
              { id: 'cook', label: 'Let\'s Cook' },
              { id: 'plan', label: 'Meal Plan' },
              { id: 'pantry', label: 'Pantry' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-3 py-1.5 md:px-5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
             <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-[10px] font-black text-white truncate max-w-[100px]">{user.displayName || 'Chef'}</span>
                <button onClick={logout} className="text-[8px] font-black uppercase text-orange-400 hover:text-orange-300">Logout</button>
             </div>
             {user.photoURL ? (
               <img src={user.photoURL} alt="Profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-orange-500 shadow-lg cursor-pointer" onClick={logout} title="Logout" />
             ) : (
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs border-2 border-orange-500 cursor-pointer" onClick={logout}>
                 {user.email?.[0].toUpperCase()}
               </div>
             )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10 flex-1 w-full">
        {activeTab === 'library' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 flex flex-col gap-6">
              <RecipeInput onProcess={handleProcess} isLoading={loading} />
              
              {/* SEARCH & FILTER BAR */}
              <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                 <div className="flex-1 w-full relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Search recipes, ingredients, or cuisine..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border-none pl-11 pr-4 py-3 rounded-2xl text-sm font-bold outline-none ring-1 ring-slate-200 focus:ring-orange-500 transition-all"
                    />
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                    <select 
                      value={filterCategory} 
                      onChange={e => setFilterCategory(e.target.value)}
                      className="flex-1 md:w-40 bg-slate-50 text-[10px] font-black uppercase p-3 rounded-2xl ring-1 ring-slate-200 outline-none"
                    >
                       <option value="">All Categories</option>
                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                      value={filterCuisine} 
                      onChange={e => setFilterCuisine(e.target.value)}
                      className="flex-1 md:w-40 bg-slate-50 text-[10px] font-black uppercase p-3 rounded-2xl ring-1 ring-slate-200 outline-none"
                    >
                       <option value="">All Cuisines</option>
                       {uniqueCuisines.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                {filteredRecipes.length > 0 ? (
                  filteredRecipes.map(r => (
                    <RecipeCard 
                      key={r.id} 
                      recipe={r} 
                      onRemove={deleteRecipe} 
                      onUpdate={updateRecipe} 
                      allRecipes={recipes}
                      categories={categories}
                      onTogglePairing={handleTogglePairing}
                    />
                  ))
                ) : (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No recipes found matching your search</p>
                  </div>
                )}
              </div>

              <div className="lg:hidden mt-4 space-y-4">
                 <button 
                   onClick={() => setShowPantryMobile(!showPantryMobile)}
                   className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-between shadow-xl"
                 >
                    <span>Ingredients & Library Setup</span>
                    <svg className={`transition-transform ${showPantryMobile ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                 </button>
                 
                 {showPantryMobile && (
                   <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                     <IngredientDatabase 
                        ingredients={masterIngredientsList} 
                        onMerge={handleMergeIngredients}
                        onRename={handleRenameIngredient}
                      />
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Recipe Categories</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {categories.map(c => <span key={c} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600">{c}</span>)}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            placeholder="Add new category..." 
                            className="flex-1 bg-slate-50 border-none p-3 rounded-xl text-xs font-bold outline-none ring-1 ring-slate-100 focus:ring-orange-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddCategory(e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                   </div>
                 )}
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-28 space-y-6">
                <IngredientDatabase 
                  ingredients={masterIngredientsList} 
                  onMerge={handleMergeIngredients}
                  onRename={handleRenameIngredient}
                />
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Categories</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map(c => <span key={c} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600">{c}</span>)}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      placeholder="Add Category..." 
                      className="flex-1 bg-slate-50 border-none p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCategory(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'cook' && <CookingOps allRecipes={recipes} />}
        {activeTab === 'plan' && <MealPlanning allRecipes={recipes} />}
        {activeTab === 'pantry' && (
          <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <h2 className="text-2xl font-black mb-2 text-slate-900">Pantry Tracker</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">Inventory management coming in Phase 2</p>
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
