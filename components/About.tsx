
import React from 'react';

export const About: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-4xl font-bold text-slate-800 mb-8 font-serif leading-tight">
          Solving the <span className="text-orange-600">"Cooking Ops"</span> Problem
        </h2>
        
        <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
          <p>
            This project was born out of a deeply personal frustration. For years, I navigated the chaotic world of digital recipes—a landscape of inconsistent units, vague instructions, and non-standardized quantities. I realized that my struggle wasn't just about cooking; it was an <strong>operational failure</strong>.
          </p>

          <p>
            I have always been fascinated by cooking because it represents the ultimate intersection of two worlds: 
            <span className="text-orange-600 font-semibold italic underline decoration-orange-200 underline-offset-4"> the creative and the operational.</span>
          </p>

          <p>
            As a creative act, cooking is pure expression. But as an operational process, it is a sequence of logic that can be optimized, standardized, and scaled. I built this systematizer after multiple iterations to solve this specific problem for myself: 
            <strong>How do we strip away the ambiguity of a "pinch" or "handful" and replace it with precise, scaled, and actionable data?</strong>
          </p>

          <div className="bg-slate-900 text-slate-100 p-8 my-10 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-600/20 transition-all duration-700"></div>
            <p className="font-serif text-2xl leading-snug italic relative z-10">
              "The goal is simple: to create a standardized language for the kitchen so that the focus remains on the craft, while the operations run like code."
            </p>
          </div>

          <p>
            Every recipe you see here has been transformed through this lens. Quantities are scaled for a standard family size of four. Ingredients are mapped to canonical forms to prevent database bloat—garlic cloves don't compete with garlic heads; it's all just <strong>Garlic</strong>. 
          </p>

          <p>
            Instructions are rewritten as self-contained "Action Cards," complete with timing and precise measurements so the cook never has to scroll back up. 
          </p>

          <p>
            I am sharing this vision with anyone who wants to treat their kitchen with the same rigor they apply to their most important projects. This isn't just a recipe list; it's a <strong>Cooking Ops</strong> framework.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg rotate-3">
            VB
          </div>
          <div>
            <p className="font-bold text-slate-800">Standardized by Design</p>
            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Cooking Ops Architecture</p>
          </div>
        </div>
      </div>
    </div>
  );
};
