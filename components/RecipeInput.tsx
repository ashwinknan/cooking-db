
import React, { useState, useEffect } from 'react';

interface RecipeInputProps {
  onProcess: (content: string) => Promise<void>;
  isLoading: boolean;
}

export const RecipeInput: React.FC<RecipeInputProps> = ({ onProcess, isLoading }) => {
  const [content, setContent] = useState('');
  const [isUrl, setIsUrl] = useState(false);

  useEffect(() => {
    setIsUrl(content.trim().toLowerCase().startsWith('http'));
  }, [content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onProcess(content);
    setContent('');
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <span className={`p-2.5 rounded-2xl transition-colors ${isUrl ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
            {isUrl ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 15h2m-2-3h2m-2-3h2m-2-3h2M9 3.91V2h6v1.91a2 2 0 0 0 .81 1.59l2.19 1.5a2 2 0 0 1 .81 1.63V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.63a2 2 0 0 1 .81-1.63l2.19-1.5A2 2 0 0 0 7 3.91Z"/></svg>
            )}
          </span>
          {isUrl ? 'Parse Recipe Link' : 'Add Recipe Text'}
        </h2>
        {isUrl && (
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
            URL Detected
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste a recipe URL (e.g. foodnetwork.com/...) or raw cooking instructions here..."
            className={`w-full min-h-[140px] p-5 rounded-3xl border transition-all outline-none resize-none text-slate-700 font-medium ${isUrl ? 'border-blue-200 bg-blue-50/30 focus:ring-2 focus:ring-blue-500' : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500'}`}
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !content.trim()}
          className={`w-full py-4 px-6 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-[0.98] ${isUrl ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>{isUrl ? 'Reading Webpage...' : 'Systematizing Text...'}</span>
            </>
          ) : (
            <>
              {isUrl ? 'Extract & Scale Recipe' : 'Process & Scale to 4 Servings'}
            </>
          )}
        </button>
      </form>
      
      <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
        Powered by Gemini 3 Pro • Scaling to 4 Servings
      </p>
    </div>
  );
};
