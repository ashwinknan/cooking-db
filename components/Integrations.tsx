import React from 'react';

interface IntegrationsProps {
  userUid: string;
}

export const Integrations: React.FC<IntegrationsProps> = ({ userUid }) => {
  const firebaseConfigSnippet = `
const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.VITE_FIREBASE_APP_ID}"
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
            <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Phase 2: Kitchen Planner</h2>
          </div>
          <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
            This app is your <strong>Source of Truth</strong>. Use the data bridge below to feed your upcoming "Operations Optimizer" app.
          </p>
        </header>

        <section className="space-y-10">
          {/* AI PROMPT BLOCK */}
          <div className="bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl">
            <div className="px-6 py-4 bg-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planning App Prompt Payload</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(planningPrompt);
                  alert("Planning Prompt copied!");
                }}
                className="text-[10px] font-black uppercase bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-500 transition-all"
              >
                Copy Bridge Data
              </button>
            </div>
            <pre className="p-6 text-slate-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {planningPrompt}
            </pre>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Testing Tip</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                  Firebase whitelists <code className="bg-white px-1">localhost</code> by default. You can build your new app entirely on your machine before deploying.
                </p>
             </div>
             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Domain Setup</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                  Once you deploy to Vercel, copy the provided URL into <strong>Firebase Auth > Authorized Domains</strong>.
                </p>
             </div>
             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ops Logic</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                  Your "Daily Ops" logic will require sending the full array of selected recipes to Gemini to create the interleaved schedule.
                </p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};
