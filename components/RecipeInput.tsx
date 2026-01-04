
import React, { useState } from 'react';

interface RecipeInputProps {
  onProcess: (content: string) => Promise<void>;
  isLoading: boolean;
}

export const RecipeInput: React.FC<RecipeInputProps> = ({ onProcess, isLoading }) => {
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');
    const containsMultipleLinks = lines.length > 1 && lines.every(l => l.startsWith('http'));

    if (containsMultipleLinks) {
      for (const link of lines) {
        await onProcess(link);
      }
    } else {
      await onProcess(content);
    }
    
    setContent('');
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-orange-100 text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 15h2m-2-3h2m-2-3h2m-2-3h2M9 3.91V2h6v1.91a2 2 0 0 0 .81 1.59l2.19 1.5a2 2 0 0 1 .81 1.63V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.63a2 2 0 0 1 .81-1.63l2.19-1.5A2 2 0 0 0 7 3.91Z"/></svg>
          </span>
          Save New Recipes
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste links from your favorite blogs, or just type out a recipe here..."
          className="w-full min-h-[120px] p-5 rounded-3xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none text-slate-700 font-medium text-sm"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading || !content.trim()}
          className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl active:scale-[0.98]"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              <span>Reading your recipe...</span>
            </div>
          ) : (
            'Magic Import (for 2 people)'
          )}
        </button>
      </form>
      
      <p className="mt-4 text-[9px] text-slate-400 font-black uppercase tracking-widest text-center">
        Scaled for 2 servings • Multiple links? No problem, just paste them on separate lines.
      </p>
    </div>
  );
};
