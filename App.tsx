import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, StandardizedIngredient } from './types';
import { RecipeInput } from './components/RecipeInput';
import { RecipeCard } from './components/RecipeCard';
import { IngredientDatabase } from './components/IngredientDatabase';
import { About } from './components/About';
import { parseRecipeContent } from './services/geminiService';
import { db, auth, isConfigured, loginWithGoogle, logout } from './firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'database' | 'about'>('database');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'error'>('connecting');

  // Check for AI Studio API Key (Mandatory for Gemini 3 Pro + Google Search)
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  // Handle Auth State
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Sync
  useEffect(() => {
    if (!db || !isConfigured || !user) {
      if (!user) setRecipes([]);
      return;
    }

    setDbStatus('connecting');
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
    });

    return () => unsubscribe();
  }, [user]);

  const masterIngredientsList = useMemo(() => {
    const dbIng: Record<string, StandardizedIngredient> = {};
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        const canonicalName = ing.name.trim();
        if (!dbIng[canonicalName]) {
          dbIng[canonicalName] = { name: canonicalName, recipesUsing: [] };
        }
        if (!dbIng[canonicalName].recipesUsing.includes(recipe.dishName)) {
          dbIng[canonicalName].recipesUsing.push(recipe.dishName);
        }
      });
    });
    return Object.values(dbIng);
  }, [recipes]);

  const handleProcessRecipe = async (content: string) => {
    if (!db || !user) return;
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
        timestamp: Date.now(),
        ownerId: user.uid
      };
      await addDoc(collection(db, "recipes"), newRecipeData);
      setSuccessMsg(`"${newRecipeData.dishName}" saved to cloud library.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const removeRecipe = async (id: string) => {
    if (!db || !user) return;
    if (window.confirm(`Delete this recipe?`)) {
      try {
        await deleteDoc(doc(db, "recipes", id));
      } catch (err) {
        setError("Unauthorized to delete. Check Firestore rules.");
      }
    }
  };

  const updateRecipe = async (updatedRecipe: Recipe) => {
    if (!db || !user) return;
    try {
      const { id, ...dataToUpdate } = updatedRecipe;
      await updateDoc(doc(db, "recipes", id), dataToUpdate);
    } catch (err) {
      setError("Update failed. Check Firestore rules.");
    }
  };

  const handleOpenApiKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-12 text-center border border-slate-100">
          <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-xl mx-auto mb-8 rotate-3">
             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight font-serif text-center">Cooking Ops</h1>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">Please sign in to access your personal database.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full py-4 px-6 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 bg-white rounded-full p-0.5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* 🛠️ SETUP MODE: DISPLAY UID FOR FIRESTORE RULES */}
      {dbStatus !== 'online' && (
        <div className="bg-slate-900 text-white p-6 border-b-4 border-orange-500 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-black mb-2 flex items-center gap-2">
              <span className="text-orange-500 animate-pulse">●</span> 
              ACTION REQUIRED: CONFIGURE DATABASE
            </h2>
            <p className="text-sm opacity-80 mb-6">
              You are logged in, but the database is restricted. Copy your ID below and paste it into your <strong>Firebase Firestore Rules</strong> to unlock your personal systematizer.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="flex-1 w-full">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Your Personal UID</p>
                <code className="block bg-black p-3 rounded-lg text-orange-400 font-mono text-sm break-all border border-slate-700 select-all">
                  {user.uid}
                </code>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(user.uid);
                  alert("UID Copied! Now paste this into your Firebase Rules tab.");
                }}
                className="w-full sm:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-all shadow-lg active:scale-95"
              >
                COPY UID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 AI SETUP: API KEY SELECTION */}
      {!hasApiKey && (
        <div className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-4 shadow-xl border-b border-red-700">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg>
            <span>Gemini Pro API Key required for Reading URLs</span>
          </div>
          <button 
            onClick={handleOpenApiKey} 
            className="bg-white text-red-600 px-4 py-1.5 rounded-full hover:bg-red-50 font-black uppercase tracking-widest text-[11px] transition-colors"
          >
            Select API Key
          </button>
        </div>
      )}

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('database')}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">Cooking Ops <span className="text-orange-600">Pro</span></h1>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8">
            <button onClick={() => setActiveTab('database')} className={`text-sm font-black transition-all ${activeTab === 'database' ? 'text-orange-600 underline decoration-2 underline-offset-8' : 'text-slate-400'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('about')} className={`text-sm font-black transition-all ${activeTab === 'about' ? 'text-orange-600 underline decoration-2 underline-offset-8' : 'text-slate-400'}`}>Vision</button>
            <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border-2 border-slate-100" alt="Avatar" />
              <button onClick={logout} className="text-[10px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {activeTab === 'about' ? <About /> : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8">
              <RecipeInput onProcess={handleProcessRecipe} isLoading={loading} />
              
              {error && (
                <div className="mb-8 p-5 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4">
                  <div className="p-2 bg-red-100 rounded-xl text-red-600 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm mb-1 uppercase tracking-tight">Systematizer Error</p>
                    <p className="text-xs font-medium opacity-80 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="mb-8 p-5 bg-green-50 border-2 border-green-100 text-green-700 rounded-3xl flex items-center gap-4 shadow-sm animate-in fade-in">
                  <div className="p-2 bg-green-100 rounded-xl text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="text-sm font-black uppercase tracking-tight">{successMsg}</span>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Library Operations</h2>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${dbStatus === 'online' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 animate-pulse'}`}></div>
                    {dbStatus === 'online' ? 'Database Online' : 'Database Offline'}
                  </div>
                </div>
                
                {recipes.length === 0 && !loading && dbStatus === 'online' && (
                  <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Your cloud library is empty</h3>
                    <p className="text-slate-400 mt-2 font-medium">Paste a recipe URL or text above to begin.</p>
                  </div>
                )}
                
                {recipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} onRemove={removeRecipe} onUpdate={updateRecipe} />
                ))}
              </div>
            </div>

            <div className="lg:col-span-4">
              <IngredientDatabase ingredients={masterIngredientsList} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;