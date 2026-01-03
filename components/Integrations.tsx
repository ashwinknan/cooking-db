import React from 'react';

interface IntegrationsProps {
  userUid: string;
}

export const Integrations: React.FC<IntegrationsProps> = ({ userUid }) => {
  const firebaseConfigSnippet = `
// PASTE THIS INTO YOUR NEW PROJECT'S firebaseConfig.ts
const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.VITE_FIREBASE_APP_ID}"
};
`.trim();

  const consumerCodeSnippet = `
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

// FETCH RECIPES FROM THE CMS
export const getMyRecipes = async () => {
  const q = query(
    collection(db, "recipes"), 
    where("ownerId", "==", "${userUid}")
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
`.trim();

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-slate-100">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">CMS Integration Profile</h2>
          </div>
          <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
            This application serves as your <strong>Headless CMS</strong>. Use the details below to connect any other frontend (Vercel, Mobile, etc.) to your structured recipe data.
          </p>
        </header>

        <section className="space-y-12">
          {/* STEP 1 */}
          <div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
              Firebase Authorized Domains
            </h3>
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
              <p className="text-sm text-slate-600 mb-4">
                Before your second Vercel app can read this data, you must whitelist its domain in the Firebase Console:
              </p>
              <ol className="text-xs space-y-2 text-slate-500 font-bold list-decimal list-inside">
                <li>Go to <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-600 hover:underline">Firebase Console</a></li>
                <li>Build > Authentication > Settings > Authorized Domains</li>
                <li>Add your <strong>new</strong> vercel domain (e.g., <code className="bg-white px-1">my-recipe-reader.vercel.app</code>)</li>
              </ol>
            </div>
          </div>

          {/* STEP 2 */}
          <div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
              Connection Profile
            </h3>
            <p className="text-xs text-slate-400 mb-4 italic">Copy these environment variables to your second Vercel project.</p>
            <div className="relative group">
              <pre className="bg-slate-900 text-slate-100 p-6 rounded-3xl overflow-x-auto text-xs font-mono shadow-inner border border-slate-800">
                {firebaseConfigSnippet}
              </pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(firebaseConfigSnippet);
                  alert("Config copied!");
                }}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase text-slate-400 px-3 py-1.5 rounded-lg transition-all"
              >
                Copy Config
              </button>
            </div>
          </div>

          {/* STEP 3 */}
          <div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px]">3</span>
              Consumer Boilerplate
            </h3>
            <p className="text-xs text-slate-400 mb-4 italic">A standard fetcher function to get your private recipes in your next app.</p>
            <div className="relative group">
              <pre className="bg-slate-900 text-slate-100 p-6 rounded-3xl overflow-x-auto text-xs font-mono shadow-inner border border-slate-800">
                {consumerCodeSnippet}
              </pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(consumerCodeSnippet);
                  alert("Fetcher snippet copied!");
                }}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase text-slate-400 px-3 py-1.5 rounded-lg transition-all"
              >
                Copy Snippet
              </button>
            </div>
          </div>
        </section>

        <footer className="mt-16 pt-10 border-t border-slate-100">
          <div className="flex items-center gap-4 p-6 bg-orange-50 rounded-3xl border border-orange-100">
            <div className="text-orange-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
            </div>
            <div>
              <h4 className="text-sm font-black text-orange-900 uppercase tracking-tight">Access Control Warning</h4>
              <p className="text-xs text-orange-700 font-medium">
                Your recipes are protected by <code>ownerId</code>. Your second app MUST authenticate as you (log in with the same Google account) or you must update your Firebase Rules to allow generic read access if you want it to be public.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
