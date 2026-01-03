
import React from 'react';

interface IntegrationsProps {
  userUid: string;
}

export const Integrations: React.FC<IntegrationsProps> = ({ userUid }) => {
  const firebaseConfigSnippet = `
const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.VITE_FIREBASE_APP_ID || ''}"
};`.trim();

  const typesSnippet = `
export interface Recipe {
  id: string;
  dishName: string;
  variations: string[];
  servings: number;
  ingredients: Array<{
    name: string;
    kitchen: { value: number; unit: string };
    shopping: { value: number; unit: string };
  }>;
  steps: Array<{ instruction: string; durationMinutes: number }>;
  totalTimeMinutes: number;
  ownerId: string;
}`.trim();

  const planningPrompt = `
Act as a world-class senior full-stack engineer. I have a Recipe CMS (Firebase) and I want to build a "Kitchen Planning & Ops" App.

CONNECTION:
${firebaseConfigSnippet}

DATA SCHEMA:
${typesSnippet}

CORE FEATURES TO BUILD:
1. Search/Autocomplete: Fuzzy search across "dishName" and "variations" to select meals.
2. Search by Ingredient: Filter recipes based on partial ingredient name matches.
3. Daily Ops Optimizer:
   - User selects 2-3 dishes.
   - Input: Number of people cooking, number of stoves available.
   - AI Task: Interleave the "steps" of all recipes. Group preps together. Show what happens in parallel.
4. Weekly Meal Planner:
   - 3-7 day grid (Breakfast, Snack, Lunch/Dinner).
   - Logic: Lunch/Dinner = 4 servings. Breakfast/Snack = 2 servings.
   - Inventory Check: Suggest recipes based on "vegetables in fridge" input.

MY UID: ${userUid}
`.trim();

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-slate-100">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-900 text-white p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Developer Bridge</h2>
          </div>
          <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
            This tab is for your <strong>future self</strong>. When you start building your separate Planning App, copy this data to connect to your existing database.
          </p>
        </header>

        <section className="space-y-10">
          <div className="bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl">
            <div className="px-6 py-4 bg-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bridge Payload (Phase 2)</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(planningPrompt);
                  alert("Bridge Prompt copied to clipboard!");
                }}
                className="text-[10px] font-black uppercase bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-500 transition-all"
              >
                Copy for Next App
              </button>
            </div>
            <pre className="p-6 text-slate-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[400px]">
              {planningPrompt}
            </pre>
          </div>

          <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100">
            <h4 className="text-blue-900 font-bold mb-2">Why is this here?</h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              Since you intend to build the <strong>Kitchen Planner</strong> as a separate application, this screen provides the bridge. It exports your current database configuration and schema so the next AI agent can build the operations optimizer with zero friction.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
