
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, StandardizedIngredient, RecipeCategory } from './types';
import { RecipeInput } from './components/RecipeInput';
import { RecipeCard } from './components/RecipeCard';
import { IngredientDatabase } from './components/IngredientDatabase';
import { ProductionSystem } from './components/ProductionSystem';
import { About } from './components/About';
import { Integrations } from './components/Integrations';
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
  deleteDoc
} from 'firebase/firestore';

// Fix: Declare aistudio for TypeScript
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'database' | 'production' | 'about' | 'integrations'>('database');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'error'>('connecting');

  // Check for AI Studio API Key
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
      if (currentUser) {
        setLoginError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login attempt failed:", err);
      if (err.code === 'auth/popup-blocked') {
        setLoginError("Pop-up blocked! Please allow pop-ups for this site in your browser settings.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setLoginError("This domain is not authorized in Firebase. Add this URL to 'Authorized Domains' in your Firebase Auth settings.");
      } else {
        setLoginError(err.message || "Login failed. Please check your console for details.");
      }
    }
  };

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
        const data = doc.data();
        recipesArray.push({ 
          ...data, 
          id: doc.id,
          category: data.category || 'lunch/dinner',
          variations: data.variations || [],
          ingredients: data.ingredients || [],
          steps: data.steps || []
        } as Recipe);
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
    if (!db || !user) {
      setError("Database connection not ready.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const existingNames = masterIngredientsList.map(i => i.name);
      const result = await parseRecipeContent(content, existingNames);
      const newRecipeData = {
        dishName: result.dishName || 'Unknown Dish',
        category: result.category || 'lunch/dinner',
        variations: result.variations || [],
        servings: 4,
        ingredients: result.ingredients || [],
        steps: result.steps || [],
        totalTimeMinutes: result.totalTimeMinutes || 0,
        timestamp: Date.now(),
        ownerId: user.uid,
        sources: result.sources || []
      };
      await addDoc(collection(db, "recipes"), newRecipeData);
      setSuccessMsg(`"${newRecipeData.dishName}" added successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
          setError("API Key issue detected. Key selection reset.");
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
        setError("Permission denied. Access restricted.");
      }
    }
  };

  const updateRecipe = async (updatedRecipe: Recipe): Promise<void> => {
    if (!db || !user) return;
    try {
      const { id, ...dataToUpdate } = updatedRecipe;
      const docRef = doc(db, "recipes", id);
      const payload = JSON.parse(JSON.stringify({
        ...dataToUpdate,
        category: dataToUpdate.category || 'lunch/dinner',
        timestamp: updatedRecipe.timestamp
      }));
      await updateDoc(docRef, payload);
    } catch (err: any) {
      console.error("Critical: Firestore update failed:", err);
      setError("Persistence failure: " + err.message);
      throw err;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Kitchen OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-[3rem] shadow-2xl p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Cooking Ops</h1>
            <p className="text-slate-400 mb-8 leading-relaxed font-medium">Standardize your culinary workflow.</p>
            <button 
              onClick={handleLogin}
              className="w-full py-4 px-6 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 group"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 bg-white rounded-full p-0.5" alt="Google" />
              Authenticate with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 ${activeTab === 'production' ? 'bg-slate-50' : 'bg-slate-50'}`}>
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('database')}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">
              Cooking Ops <span className="text-orange-600">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('database')} 
              className={`text-xs font-black transition-all uppercase tracking-widest px-3 py-1 rounded-lg ${activeTab === 'database' ? 'text-orange-600 bg-orange-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              CMS
            </button>
            <button 
              onClick={() => setActiveTab('production')} 
              className={`text-xs font-black transition-all uppercase tracking-widest px-3 py-1 rounded-lg ${activeTab === 'production' ? 'text-orange-600 bg-orange-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Production
            </button>
            <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border-2 border-slate-100" alt="Avatar" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-10">
        {activeTab === 'about' && <About />}
        {activeTab === 'integrations' && <Integrations userUid={user.uid} />}
        {activeTab === 'production' && <ProductionSystem allRecipes={recipes} />}
        {activeTab === 'database' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-8">
              <RecipeInput onProcess={handleProcessRecipe} isLoading={loading} />
              <div className="space-y-8">
                {recipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} onRemove={removeRecipe} onUpdate={updateRecipe} />
                ))}
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="sticky top-28">
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
