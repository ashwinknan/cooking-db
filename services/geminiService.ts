
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, ProductionSchedule, MealPlanResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Existing parse function (updated with proper SDK usage)
export const parseRecipeContent = async (
  content: string,
  existingIngredients: string[]
): Promise<Partial<Recipe> & { sources?: { uri: string; title: string }[] }> => {
  const model = "gemini-3-pro-preview";
  const isUrl = content.trim().startsWith('http');

  const systemInstruction = `
    You are a professional Culinary Operations Engineer. 
    Standardize all recipes to 4 servings. Provide Kitchen (volume) and Shopping (weight) units.
    Rewrite instructions as self-contained "Action Cards".
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Parse this into JSON: ${content}. Current pantry: ${existingIngredients.join(",")}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{}");
};

// NEW: Batch Cooking Timeline Generator
export const generateProductionTimeline = async (
  recipes: Recipe[],
  cooks: number,
  burners: number
): Promise<ProductionSchedule> => {
  const model = "gemini-3-pro-preview";
  
  const systemInstruction = `
    You are a Master Kitchen Expeditor. Your task is to interleave the cooking steps of multiple recipes into one efficient timeline.
    CONSTRAINTS:
    - Number of Cooks: ${cooks} (Cannot have more simultaneous active tasks than cooks)
    - Stove Burners: ${burners} (Cannot have more simultaneous tasks using burners than burners)
    
    RULES:
    1. Group prep work (chopping) at the start.
    2. Identify tasks that can run in parallel (e.g., simmering while chopping).
    3. Output a logical flow to minimize total kitchen time.
  `;

  const prompt = `
    RECIPES TO CO-PRODUCE:
    ${recipes.map(r => `Recipe: ${r.dishName}\nSteps: ${JSON.stringify(r.steps)}`).join('\n\n')}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeOffset: { type: Type.NUMBER, description: "Minutes from start" },
                action: { type: Type.STRING },
                involvedRecipes: { type: Type.ARRAY, items: { type: Type.STRING } },
                assignees: { type: Type.ARRAY, items: { type: Type.STRING } },
                isParallel: { type: Type.BOOLEAN }
              },
              required: ["timeOffset", "action", "involvedRecipes", "assignees", "isParallel"]
            }
          }
        },
        required: ["timeline"]
      }
    }
  });

  return JSON.parse(response.text || '{"timeline":[]}');
};

// NEW: Meal Architect Generator
export const architectMealPlan = async (
  dbRecipes: Recipe[],
  durationDays: number,
  fridgeInventory: string
): Promise<MealPlanResult> => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are a Meal Planning AI. Select recipes from the provided database that best utilize the "Surplus Inventory" provided.
    Ensure variety across the ${durationDays} days.
  `;

  const prompt = `
    SURPLUS INVENTORY: ${fridgeInventory}
    AVAILABLE RECIPES: ${dbRecipes.map(r => r.dishName).join(", ")}
    DURATION: ${durationDays} days.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.NUMBER },
                breakfast: { type: Type.STRING },
                lunchDinner: { type: Type.STRING },
                snack: { type: Type.STRING }
              },
              required: ["day", "breakfast", "lunchDinner", "snack"]
            }
          }
        },
        required: ["plan"]
      }
    }
  });

  return JSON.parse(response.text || '{"plan":[]}');
};
