
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, StandardizedIngredient } from './types';
import { RecipeInput } from './components/RecipeInput';
import { RecipeCard } from './components/RecipeCard';
import { IngredientDatabase } from './components/IngredientDatabase';
import { About } from './components/About';
import { parseRecipeContent } from './services/geminiService';
import { db, isConfigured } from './firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'database' | 'about'>('database');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'error'>('connecting');

  // Firestore Real-time Sync
  useEffect(() => {
    if (!db || !isConfigured) {
      setDbStatus('error');
      return;
    }

    const q = query(collection(db, "recipes"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recipesArray: Recipe[] = [];
      querySnapshot.forEach((doc) => {
        recipesArray.push({ ...doc.data(), id: doc.id } as Recipe);
      });
      setRecipes(recipesArray);
      setDbStatus('online');
      setError(null);
    }, (err) => {
      console.error("Firestore Error:", err);
      setDbStatus('error');
      setError("Database Connection Error: Ensure Cloud Firestore is enabled in your Firebase Console and your Security Rules allow access.");
    });

    return () => unsubscribe();
  }, []);

  const masterIngredientsList = useMemo(() => {
    const dbIng: Record<string, StandardizedIngredient> = {};
    
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        const canonicalName = ing.name.trim();
        if (!dbIng[canonicalName]) {
          dbIng[canonicalName] = {
            name: canonicalName,
            recipesUsing: []
          };
        }
        
        if (!dbIng[canonicalName].recipesUsing.includes(recipe.dishName)) {
          dbIng[canonicalName].recipesUsing.push(recipe.dishName);
        }
      });
    });
    
    return Object.values(dbIng);
  }, [recipes]);

  const handleProcessRecipe = async (content: string) => {
    if (!db) {
      setError("Database not configured. Please add your Firebase credentials.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const existingNames = masterIngredientsList.map(i => i.name);
      const parsed = await parseRecipeContent(content, existingNames);
      
      const newRecipeData = {
        dishName: parsed.dishName || 'Unknown Dish',
        variations: parsed.variations || [],
        servings: 4,
        ingredients: parsed.ingredients || [],
        steps: parsed.steps || [],
        totalTimeMinutes: parsed.totalTimeMinutes || 0,
        timestamp: Date.now()
      };

      await addDoc(collection(db, "recipes"), newRecipeData);
      setSuccessMsg(`"${newRecipeData.dishName}" added to Cloud DB!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "An error occurred while processing the recipe.");
    } finally {
      setLoading(false);
    }
  };

  const removeRecipe = async (id: string) => {
    if (!db) return;
    const recipeToRemove = recipes.find(r => r.id === id);
    if (window.confirm(`Are you sure you want to delete "${recipeToRemove?.dishName}" from Cloud Storage?`)) {
      try {
        await deleteDoc(doc(db, "recipes", id));
        setSuccessMsg("Recipe deleted.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        setError("Could not delete recipe.");
      }
    }
  };

  const updateRecipe = async (updatedRecipe: Recipe) => {
    if (!db) return;
    try {
      const recipeRef = doc(db, "recipes", updatedRecipe.id);
      const { id, ...dataToUpdate } = updatedRecipe;
      await updateDoc(recipeRef, dataToUpdate);
      setSuccessMsg(`"${updatedRecipe.dishName}" updated in Cloud DB.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError("Failed to update the database.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('database')}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Cooking Ops <span className="text-orange-600">Pro</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 mr-4 px-3 py-1 bg-slate-100 rounded-full">
              <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500' : dbStatus === 'connecting' ? 'bg-orange-400 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {dbStatus === 'online' ? 'Cloud Online' : dbStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
            <button 
              onClick={() => setActiveTab('database')}
              className={`text-sm font-semibold transition-all ${activeTab === 'database' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`text-sm font-semibold transition-all ${activeTab === 'about' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              The Vision
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isConfigured && activeTab === 'database' && (
          <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-3xl border border-orange-100 shadow-xl text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Production DB Connection Required</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              To use Cooking Ops Pro in production, you must link your Firebase project. 
              Once deployed to Vercel, ensure your Environment Variables are mapped to your Firestore instance.
            </p>
            <div className="text-left bg-slate-50 p-6 rounded-2xl text-xs space-y-2 border border-slate-100">
              <p className="font-bold text-slate-400 uppercase tracking-widest mb-2">Checklist:</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span> 1. Enable Firestore Database (Cloud Mode)</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span> 2. Set Vercel Environment Variables</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span> 3. Re-deploy to production</p>
            </div>
          </div>
        )}

        {isConfigured && activeTab === 'about' ? (
          <About />
        ) : isConfigured && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <RecipeInput onProcess={handleProcessRecipe} isLoading={loading} />
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span className="text-sm font-medium">{successMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Database (Live)</h2>
                </div>
                
                {recipes.length === 0 && !loading && !error && dbStatus === 'online' && (
                  <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Database is empty</h3>
                    <p className="text-sm text-slate-400 mt-2">Add your first recipe to populate the production cloud database.</p>
                  </div>
                )}
                
                {recipes.map(recipe => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    onRemove={removeRecipe}
                    onUpdate={updateRecipe}
                  />
                ))}
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-8">
                 <IngredientDatabase ingredients={masterIngredientsList} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
