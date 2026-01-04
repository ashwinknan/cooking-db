
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
      if (docSnap.exists() && docSnap.data().categories) setCategories(docSnap.data().categories);
    });
    return () => { unsubRecipes(); unsubMeta(); };
  }, [user]);

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

  const updateRecipe = async (r: Recipe) => { await updateDoc(doc(db!, "recipes", r.id), { ...r }); };
  const deleteRecipe = async (id: string) => {
    if (confirm("Remove this recipe?")) {
      const batch = writeBatch(db!);
      recipes.forEach(r => { if (r.pairedWith?.includes(id)) batch.update(doc(db!, "recipes", r.id), { pairedWith: arrayRemove(id) }); });
      batch.delete(doc(db!, "recipes", id));
      await batch.commit();
    }
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

  const handleMergeIngredients = async (oldNames: string[], newName: string) => {
    if (!db) return;
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

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse uppercase tracking-[0.2em]">Initializing Buddy...</div>;

  if (!user) return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <nav className="w-full h-20 px-8 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg rotate-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <span className="font-black text-2xl tracking-tighter text-slate-900">Buddy</span>
        </div>
        <div className="hidden lg:flex gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
           <a href="#itch" className="hover:text-orange-600 transition-colors">The Itch</a>
           <a href="#problems" className="hover:text-orange-600 transition-colors">Operational Problems</a>
           <a href="#story" className="hover:text-orange-600 transition-colors">My Story</a>
        </div>
        <button onClick={loginWithGoogle} className="bg-slate-900 text-white px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl">Start Cooking</button>
      </nav>

      <header className="w-full max-w-6xl mx-auto py-24 px-6 text-center">
        <h1 className="text-6xl md:text-9xl font-black mb-8 tracking-tighter leading-[0.9] text-slate-900">
          Making home <br/><span className="text-orange-600 italic">cooking easier.</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 font-medium mb-14 max-w-3xl mx-auto leading-relaxed">
          I realized that home cooking is not difficult—it's just an operational puzzle that no one solved for you. This is my attempt at a system that bridges that gap.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
           <button onClick={loginWithGoogle} className="w-full sm:w-auto bg-slate-900 text-white px-12 py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all">Build Your System</button>
           <a href="#itch" className="w-full sm:w-auto bg-slate-50 text-slate-400 px-12 py-6 rounded-[2rem] font-black text-xl hover:bg-slate-100 transition-all text-center">See Why</a>
        </div>
      </header>

      <section id="itch" className="max-w-4xl mx-auto py-32 px-6 border-t border-slate-100">
        <div className="flex flex-col items-center text-center">
           <span className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest mb-8">The Philosophy</span>
           <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-10 tracking-tight leading-tight">This is not a recipe app.</h2>
           <div className="space-y-8 text-xl text-slate-600 leading-relaxed font-medium">
              <p>
                People don't choose delivery because they love lukewarm food. They choose it because <strong>cooking presents many more operational challenges than ordering.</strong>
              </p>
              <p>
                I solved this for myself first, and I will continue to. I love cooking—but I realize it is as much an operational problem as it is creative. I have been pursuing this goal for 5 years; I can attest no one has thought about this as much as I have.
              </p>
           </div>
        </div>
      </section>

      <section id="problems" className="w-full bg-slate-900 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-white text-4xl md:text-6xl font-black tracking-tighter mb-6">Solving for Three Itches.</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">We pay for cooks but still order out. It makes no sense. We do it because we feel the process is challenging. Buddy targets the core friction.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] group hover:bg-white/10 transition-all">
              <div className="text-4xl mb-6">🔗</div>
              <h3 className="text-white text-2xl font-black mb-4">Noise Extraction</h3>
              <p className="text-slate-400 leading-relaxed font-medium text-sm">Recipe websites are filled with ad links and too much fluff. Buddy extracts just the operational data—standardized, scaled, and pure.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] group hover:bg-white/10 transition-all">
              <div className="text-4xl mb-6">🗓️</div>
              <h3 className="text-white text-2xl font-black mb-4">Architecting Variety</h3>
              <p className="text-slate-400 leading-relaxed font-medium text-sm">"What to cook?" is the biggest headache. Architecting your week removes decision fatigue, making healthy eating a default state.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] group hover:bg-white/10 transition-all">
              <div className="text-4xl mb-6">📦</div>
              <h3 className="text-white text-2xl font-black mb-4">Precision Procurement</h3>
              <p className="text-slate-400 leading-relaxed font-medium text-sm">Know exactly what to buy and how much based on your architectural plan. No waste, no missing ingredients, just execution.</p>
            </div>
          </div>

          <div className="mt-16 bg-orange-600 rounded-[4rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
             <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                   <h3 className="text-4xl font-black mb-6 tracking-tight leading-tight">Advanced Logistics: <br/>Interleaving Tasks</h3>
                   <p className="text-lg font-medium opacity-90 leading-relaxed">
                     Novice cooks do one thing at a time. Professional kitchens interleave. Our system helps you—or your cook—efficiently handle multiple threads of prep and cooking in parallel, cutting operational time in half.
                   </p>
                </div>
                <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Active Optimization</span>
                   </div>
                   <div className="space-y-4">
                      <div className="h-4 bg-white/20 rounded-full w-3/4"></div>
                      <div className="h-4 bg-white/10 rounded-full w-full"></div>
                      <div className="h-4 bg-white/20 rounded-full w-1/2"></div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      <section id="story" className="max-w-4xl mx-auto py-32 px-6">
        <div className="flex flex-col items-center text-center">
           <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white mb-10 shadow-2xl rotate-3">AK</div>
           <h2 className="text-4xl font-black text-slate-900 mb-10 italic">A Story from Ashwin</h2>
           <div className="space-y-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl text-left border-l-4 border-orange-500 pl-8">
              <p>
                "My point is simple: we pay for cooks but still order outside so much. Why? Because the guidance is missing. We feel it is challenging."
              </p>
              <p>
                "My name is Ashwin Krishnan. This isn't a startup for me—this is just an itch. I solved this for myself first in pursuit of a system that actually works. I believe solving this operational gap is the most important step to a truly healthy life."
              </p>
           </div>
           <div className="mt-14 flex flex-col items-center">
              <span className="font-black text-slate-900 text-lg">Ashwin Krishnan</span>
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] mt-2">Home Chef & Architect</span>
           </div>
        </div>
      </section>
      
      <footer className="w-full py-20 px-6 border-t border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] text-center bg-white">
        © 2025 Buddy • System over Recipes • Built by Ashwin
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="sticky top-0 z-[200] bg-slate-900 text-white shadow-xl h-16 md:h-20 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter hidden xs:block">Buddy</h1>
          </div>
          <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar py-2 px-2">
            {['library', 'cook', 'plan', 'pantry'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                {t === 'library' ? 'Library' : t === 'cook' ? 'Production' : t === 'plan' ? 'Architect' : 'Inventory'}
              </button>
            ))}
          </div>
          <button onClick={logout} className="text-[10px] font-black uppercase text-orange-400 hover:text-orange-300">Logout</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10 flex-1 w-full">
        {activeTab === 'library' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 flex flex-col gap-6">
              <RecipeInput onProcess={handleProcess} isLoading={loading} />
              <div className="bg-white p-4 md:p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                 <div className="flex-1 w-full relative">
                    <input 
                      type="text" placeholder="Search my library..." value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border-none pl-6 pr-4 py-3 rounded-2xl text-sm font-bold outline-none ring-1 ring-slate-200 focus:ring-orange-500 transition-all"
                    />
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="flex-1 md:w-40 bg-slate-50 text-[10px] font-black uppercase p-3 rounded-2xl ring-1 ring-slate-200">
                       <option value="">All Categories</option>
                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterCuisine} onChange={e => setFilterCuisine(e.target.value)} className="flex-1 md:w-40 bg-slate-50 text-[10px] font-black uppercase p-3 rounded-2xl ring-1 ring-slate-200">
                       <option value="">All Cuisines</option>
                       {uniqueCuisines.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
              </div>
              <div className="space-y-4 md:space-y-6">
                {filteredRecipes.length > 0 ? filteredRecipes.map(r => (
                  <RecipeCard key={r.id} recipe={r} onRemove={deleteRecipe} onUpdate={updateRecipe} allRecipes={recipes} categories={categories} onTogglePairing={handleTogglePairing} />
                )) : (
                  <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm font-black uppercase italic">No recipes found matching your filters.</p>
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
              </div>
            </div>
          </div>
        )}
        {activeTab === 'cook' && <CookingOps allRecipes={recipes} />}
        {activeTab === 'plan' && <MealPlanning allRecipes={recipes} />}
        {activeTab === 'pantry' && (
          <div className="max-w-xl mx-auto text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
             <h2 className="text-2xl font-black mb-3 text-slate-900 italic">Inventory Management</h2>
             <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Connecting Pantry to Production</p>
          </div>
        )}
      </main>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default App;
