
import React, { useState } from 'react';

interface RecipeInputProps {
  onProcess: (content: string) => Promise<void>;
  isLoading: boolean;
}

export const RecipeInput: React.FC<RecipeInputProps> = ({ onProcess, isLoading }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onProcess(content);
    setContent('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 transition-all hover:shadow-md">
      <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 15h2m-2-3h2m-2-3h2m-2-3h2M9 3.91V2h6v1.91a2 2 0 0 0 .81 1.59l2.19 1.5a2 2 0 0 1 .81 1.63V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.63a2 2 0 0 1 .81-1.63l2.19-1.5A2 2 0 0 0 7 3.91Z"/></svg>
        </span>
        Add Recipe or Link
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-2">Paste recipe text or a URL</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste a link (e.g. https://cooking.com/recipe) or the recipe text itself..."
            className="w-full min-h-[140px] p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none resize-none bg-slate-50"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !content.trim()}
          className="w-full py-3 px-6 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Reading & Systematizing...
            </>
          ) : (
            'Process & Scale to 4 Servings'
          )}
        </button>
      </form>
    </div>
  );
};
