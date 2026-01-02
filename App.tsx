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

// Fix: Declare aistudio for TypeScript using the expected AIStudio interface name to prevent conflicting property declaration
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

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
        // If not in AI Studio environment, assume keys are handled via process.env
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
      if (currentUser) {
        console.log("Your Admin UID for Firebase Rules:", currentUser.uid);
      }
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
      console.error("Firestore Permission Error (Expected if UID is not set):", err);
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
    if (!db || !user) {
      setError("Database connection not ready.");
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
        timestamp: Date.now(),
        ownerId: user.uid,
        sources: parsed.sources || []
      };
      await addDoc(collection(db, "recipes"), newRecipeData);
      setSuccessMsg(`"${newRecipeData.dishName}" added successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      // Fix: If the request fails with an error message containing "Requested entity was not found.", 
      // reset the key selection state and prompt the user to select a key again via openSelectKey().
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
          setError("API Key issue detected. Key selection reset. Please try again.");
          return;
        }
      }
      setError(err.message || "An error occurred during parsing.");
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
        setError("Permission denied. Ensure your UID is updated in Firebase Rules.");
      }
    }
  };

  const updateRecipe = async (updatedRecipe: Recipe) => {
    if (!db || !user) return;
    try {
      const { id, ...dataToUpdate } = updatedRecipe;
      await updateDoc(doc(db, "recipes", id), dataToUpdate);
    } catch (err) {
      setError("Update failed. Check your Firebase Rules.");
    }
  };

  const handleOpenApiKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Fix: Assume the key selection was successful after triggering openSelectKey() per guidelines to avoid race conditions
      setHasApiKey(true);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-600"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Warming Up Engines...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-12 text-center border border-slate-100">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-xl mx-auto mb-10 rotate-3 transition-transform hover:rotate-0">
             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Cooking Ops</h1>
          <p className="text-slate-400 mb-10 leading-relaxed font-medium">Please sign in to access your personal recipe database.</p>
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
      
      {/* 🛠️ ADMIN SETUP BANNER: ONLY SHOWS IF DB ACCESS IS BLOCKED */}
      {dbStatus !== 'online' && (
        <div className="bg-slate-900 text-white p-6 border-b-4 border-orange-500 shadow-2xl relative z-[60]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-black mb-2 flex items-center gap-3">
              <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span> 
              ACTION REQUIRED: UNLOCK DATABASE
            </h2>
            <p className="text-sm opacity-80 mb-6">
              Your login was successful, but your database is currently locked. To fix this, copy your <strong>Personal UID</strong> below and paste it into the <code>YOUR_UID_HERE</code> section of your Firebase Rules.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="flex-1 w-full text-left">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Your Private Admin UID</p>
                <code className="block bg-black p-4 rounded-xl text-orange-400 font-mono text-sm break-all border border-slate-700 select-all shadow-inner">
                  {user.uid}
                </code>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(user.uid);
                  alert("UID Copied! Now paste this into your Firebase Rules tab in the Google Console.");
                }}
                className="w-full sm:w-auto px-10 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                COPY UID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 API KEY SETUP BANNER */}
      {!hasApiKey && (
        <div className="bg-blue-600 text-white px-4 py-3 text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-4 shadow-xl border-b border-blue-700">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="m16 8-4 4-4-4"/><path d="M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z"/></svg>
            <span>AI Studio API Key required to read recipe URLs</span>
          </div>
          <button 
            onClick={handleOpenApiKey} 
            className="bg-white text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50 font-black uppercase tracking-widest text-[11px] transition-all active:scale-95"
          >
            Select API Key
          </button>
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('database')}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">
              Cooking Ops <span className="text-orange-600">Pro</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-8">
            <button onClick={() => setActiveTab('database')} className={`text-sm font-black transition-all ${activeTab === 'database' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('about')} className={`text-sm font-black transition-all ${activeTab === 'about' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}>Vision</button>
            <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full ring-2 ring-slate-100" alt="Avatar" />
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
                <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 text-red-700 rounded-[2rem] flex items-start gap-5 shadow-sm">
                  <div className="p-2 bg-red-100 rounded-xl text-red-600 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm mb-1 uppercase tracking-tight">Operation Failed</p>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="mb-8 p-6 bg-green-50 border-2 border-green-100 text-green-700 rounded-[2rem] flex items-center gap-5 shadow-sm">
                  <div className="p-2 bg-green-100 rounded-xl text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="text-sm font-black uppercase tracking-tight">{successMsg}</span>
                </div>
              )}

              <div className="space-y-8">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Recipe Library</h2>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-colors ${dbStatus === 'online' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 animate-pulse'}`}></div>
                    {dbStatus === 'online' ? 'Cloud Connected' : 'Sync Locked'}
                  </div>
                </div>
                
                {recipes.length === 0 && !loading && dbStatus === 'online' && (
                  <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Your pantry is empty</h3>
                    <p className="text-slate-400 mt-2 font-medium">Paste a recipe URL or text above to begin.</p>
                  </div>
                )}
                
                {recipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} onRemove={removeRecipe} onUpdate={updateRecipe} />
                ))}
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-28">
                <IngredientDatabase ingredients={masterIngredientsList} />
                
                <div className="mt-8 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">System Diagnostics</h4>
                  <ul className="space-y-5">
                    <li className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Identity Provider</span>
                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">Google Auth</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Storage Cluster</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${dbStatus === 'online' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                        {dbStatus}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">AI Engine</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${hasApiKey ? 'text-blue-600 bg-blue-50' : 'text-slate-300 bg-slate-100'}`}>
                        {hasApiKey ? 'Ready' : 'Waiting'}
                      </span>
                    </li>
                  </ul>
                  {/* Fix: Extract and list URLs from groundingChunks as required by the guidelines */}
                  {recipes.some(r => r.sources?.length) && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Verification Sources</h4>
                      <div className="space-y-2">
                        {Array.from(new Set(recipes.flatMap(r => r.sources || []).map(s => s.uri))).map((uri) => {
                          const source = recipes.flatMap(r => r.sources || []).find(s => s.uri === uri);
                          return (
                            <a key={uri} href={uri} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-blue-600 hover:underline truncate">
                              {source?.title || uri}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
