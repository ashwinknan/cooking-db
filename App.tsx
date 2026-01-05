
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

const MOCK_RECIPES: Recipe[] = [
  {
    id: 'mock-1',
    dishName: 'Spaghetti Aglio e Olio',
    category: 'Lunch/Dinner',
    cuisine: 'Italian',
    variations: ['Add chili flakes', 'Add shrimp'],
    servings: 2,
    servingSizeInfo: 'Generous portion for two people.',
    totalTimeMinutes: 15,
    timestamp: Date.now(),
    ingredients: [
      { name: 'Spaghetti', kitchen: { value: 200, unit: 'g' }, shopping: { value: 500, unit: 'g packet' } },
      { name: 'Garlic', kitchen: { value: 4, unit: 'cloves' }, shopping: { value: 1, unit: 'head' } },
      { name: 'Olive Oil', kitchen: { value: 0.25, unit: 'cup' }, shopping: { value: 1, unit: 'bottle' } },
      { name: 'Parsley', kitchen: { value: 0.5, unit: 'bunch' }, shopping: { value: 1, unit: 'bunch' } }
    ],
    steps: [
      { instruction: 'Boil a large pot of salted water and cook spaghetti until al dente.', durationMinutes: 10, type: 'cooking' },
      { instruction: 'Thinly slice the garlic and chop the parsley.', durationMinutes: 5, type: 'prep' },
      { instruction: 'In a large pan, heat olive oil over medium-low heat. Add garlic and cook until golden.', durationMinutes: 5, type: 'cooking' },
      { instruction: 'Toss pasta with garlic oil and parsley. Serve immediately.', durationMinutes: 2, type: 'prep' }
    ]
  },
  {
    id: 'mock-2',
    dishName: 'Classic Avocado Toast',
    category: 'Breakfast',
    cuisine: 'Modern',
    variations: ['Add poached egg', 'Drizzle sriracha'],
    servings: 2,
    servingSizeInfo: 'Two slices per person.',
    totalTimeMinutes: 10,
    timestamp: Date.now() - 1000,
    ingredients: [
      { name: 'Sourdough Bread', kitchen: { value: 4, unit: 'slices' }, shopping: { value: 1, unit: 'loaf' } },
      { name: 'Avocado', kitchen: { value: 2, unit: 'units' }, shopping: { value: 2, unit: 'units' } },
      { name: 'Lemon', kitchen: { value: 0.5, unit: 'unit' }, shopping: { value: 1, unit: 'unit' } }
    ],
    steps: [
      { instruction: 'Toast the bread slices until golden brown.', durationMinutes: 3, type: 'cooking' },
      { instruction: 'Mash the avocado with lemon juice and salt in a bowl.', durationMinutes: 4, type: 'prep' },
      { instruction: 'Spread avocado on toast and garnish with chili flakes.', durationMinutes: 2, type: 'prep' }
    ]
  },
  {
    id: 'mock-3',
    dishName: 'Greek Salad',
    category: 'Lunch/Dinner',
    cuisine: 'Mediterranean',
    variations: ['Add grilled chicken'],
    servings: 2,
    servingSizeInfo: 'Light fresh meal.',
    totalTimeMinutes: 12,
    timestamp: Date.now() - 2000,
    ingredients: [
      { name: 'Cucumber', kitchen: { value: 1, unit: 'unit' }, shopping: { value: 1, unit: 'unit' } },
      { name: 'Tomato', kitchen: { value: 2, unit: 'units' }, shopping: { value: 1, unit: 'pack' } },
      { name: 'Feta Cheese', kitchen: { value: 100, unit: 'g' }, shopping: { value: 1, unit: 'block' } },
      { name: 'Olives', kitchen: { value: 10, unit: 'units' }, shopping: { value: 1, unit: 'jar' } }
    ],
    steps: [
      { instruction: 'Chop cucumber and tomatoes into bite-sized chunks.', durationMinutes: 5, type: 'prep' },
      { instruction: 'Combine vegetables in a bowl with olives.', durationMinutes: 2, type: 'prep' },
      { instruction: 'Top with cubed feta and a drizzle of olive oil/oregano.', durationMinutes: 2, type: 'prep' }
    ]
  }
];

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'library' | 'cook' | 'plan' | 'pantry'>('library');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>(['Breakfast', 'Lunch/Dinner', 'Snack']);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCuisine, setFilterCuisine] = useState('');

  useEffect(() => {
    if (!auth) { 
      setAuthLoading(false); 
      return; 
    }
    return onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setAuthLoading(false); 
    });
  }, []);

  useEffect(() => {
    if (user && user.uid === 'preview-user') {
      setRecipes(MOCK_RECIPES);
      return;
    }

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
      if (db && user?.uid !== 'preview-user') {
        await addDoc(collection(db!, "recipes"), {
          ...res,
          servings: 2,
          timestamp: Date.now(),
          ownerId: user?.uid,
          pairedWith: []
        });
      } else {
        const newRecipe = { ...res, id: Math.random().toString(), servings: 2, timestamp: Date.now(), pairedWith: [] } as Recipe;
        setRecipes([newRecipe, ...recipes]);
      }
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateRecipe = async (r: Recipe) => { 
    if (db && user?.uid !== 'preview-user') await updateDoc(doc(db!, "recipes", r.id), { ...r }); 
    else setRecipes(recipes.map(recipe => recipe.id === r.id ? r : recipe));
  };
  
  const deleteRecipe = async (id: string) => {
    if (confirm("Remove this recipe?")) {
      if (db && user?.uid !== 'preview-user') {
        const batch = writeBatch(db!);
        recipes.forEach(r => { if (r.pairedWith?.includes(id)) batch.update(doc(db!, "recipes", r.id), { pairedWith: arrayRemove(id) }); });
        batch.delete(doc(db!, "recipes", id));
        await batch.commit();
      } else {
        setRecipes(recipes.filter(r => r.id !== id));
      }
    }
  };

  const handleTogglePairing = async (recipeAId: string, recipeBId: string) => {
    if (!db || user?.uid === 'preview-user') return;
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
    if (!db || user?.uid === 'preview-user') return;
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

  const handleAuthAction = async () => {
    if (!isConfigured) {
      setUser({ uid: 'preview-user', displayName: 'Buddy Preview' });
    } else {
      await loginWithGoogle();
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-white text-slate-900 font-black animate-pulse">BUDDY...</div>;

  if (!user) return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <nav className="w-full h-20 px-8 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg rotate-3">
             <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <span className="font-black text-3xl tracking-tighter text-slate-900">Buddy</span>
        </div>
        <div className="hidden md:flex gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
           <a href="#problems" className="hover:text-orange-600 transition-colors">The Problems</a>
           <a href="#story" className="hover:text-orange-600 transition-colors">My Story</a>
        </div>
        <button onClick={handleAuthAction} className="bg-slate-900 text-white px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl">
          {isConfigured ? 'Get Started' : 'Preview Access'}
        </button>
      </nav>

      <header className="w-full max-w-6xl mx-auto py-24 md:py-32 px-6 text-center">
        <h1 className="text-6xl md:text-9xl font-black mb-8 tracking-tighter leading-[0.9] text-slate-900">
          Making home <br/><span className="text-orange-600 italic">cooking easier.</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 font-medium mb-14 max-w-3xl mx-auto leading-relaxed">
          Buddy is a tool I built because I realized home cooking isn't actually that hard—we just needed a better way to handle the boring parts like planning and shopping.
        </p>
        <button onClick={handleAuthAction} className="bg-slate-900 text-white px-12 py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all">Start using Buddy</button>
      </header>

      <section id="problems" className="w-full bg-slate-50 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black text-center mb-20 tracking-tighter">The things I set out to fix.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="text-4xl mb-6">🔗</div>
              <h3 className="text-2xl font-black mb-4">Reading recipes</h3>
              <p className="text-slate-500 font-medium leading-relaxed text-sm">Recipe websites are noisy. Buddy reads the link and gives you just the facts—standardized and easy to follow.</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="text-4xl mb-6">🗓️</div>
              <h3 className="text-2xl font-black mb-4">Planning the week</h3>
              <p className="text-slate-500 font-medium leading-relaxed text-sm">"What should we cook tonight?" is a constant headache. Deciding once for the whole week makes everything easier.</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="text-4xl mb-6">🛒</div>
              <h3 className="text-2xl font-black mb-4">Knowing what to buy</h3>
              <p className="text-slate-500 font-medium leading-relaxed text-sm">Buddy creates a shopping list based on your plan. No more guessing or wasting ingredients.</p>
            </div>
          </div>
          
          <div className="mt-12 bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl">
             <h3 className="text-3xl font-black mb-6 italic text-orange-500">A more efficient kitchen.</h3>
             <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-3xl">
               Most people struggle to do multiple things at once in the kitchen. Buddy helps you see all your steps clearly, making the whole process feel much more manageable.
             </p>
          </div>
        </div>
      </section>

      <section id="story" className="max-w-4xl mx-auto py-32 px-6">
        <h2 className="text-4xl font-black text-slate-900 mb-12 italic text-center">My Story</h2>
        <div className="space-y-8 text-xl text-slate-600 leading-relaxed font-medium">
          <p>
            I love cooking. But I realize that cooking can be quite a mess to manage. <strong>I have been pursuing this goal for 5 years</strong>, trying to figure out how to make it feel less like a chore.
          </p>
          <p>
            It makes no sense that we often order food even when we want to cook at home. We do it because starting the process feels like too much work.
          </p>
          <p>
            Buddy is my attempt at a system that makes it easier to navigate food. It’s the tool I wanted for myself.
          </p>
        </div>
        <div className="mt-16 flex flex-col items-center">
           <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-xl mb-4">AK</div>
           <span className="font-black text-slate-900 text-lg">Ashwin Krishnan</span>
        </div>
      </section>
      
      <footer className="w-full py-20 border-t border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] text-center">
        © 2025 Buddy • Built by Ashwin
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="sticky top-0 z-[200] bg-slate-900 text-white shadow-2xl h-16 md:h-20 shrink-0 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-2xl font-black tracking-tighter hidden xs:block">Buddy</h1>
          </div>
          <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar py-2 px-2">
            {[
              { id: 'library', label: 'Library' },
              { id: 'cook', label: 'Production' },
              { id: 'plan', label: 'Architect' },
              { id: 'pantry', label: 'Inventory' }
            ].map((t) => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id as any)} 
                className={`px-4 py-2.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                  activeTab === t.id 
                    ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)]' 
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={logout} className="text-[10px] font-black uppercase text-orange-400 hover:text-orange-300 ml-2">Logout</button>
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
                  <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 px-6">
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
          <div className="max-w-xl mx-auto text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 px-10">
             <h2 className="text-2xl font-black mb-3 text-slate-900 italic">Inventory</h2>
             <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Tracking your essentials</p>
          </div>
        )}
      </main>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default App;
