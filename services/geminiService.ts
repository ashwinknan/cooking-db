
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, ProductionSchedule, MealPlanResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseRecipeContent = async (
  content: string,
  existingIngredients: string[]
): Promise<Partial<Recipe> & { sources?: { uri: string; title: string }[] }> => {
  const model = "gemini-3-pro-preview";

  const systemInstruction = `
    You are a professional kitchen operations analyst.
    1. MISSION: Standardize raw recipe data into a clean, operational format.
    2. SCALING: Scale ingredients precisely for EXACTLY 2 servings.
    3. CUISINE: Identify the primary cuisine (e.g., Indian, Italian, Mediterranean).
    4. STEPS: Separate into "pre-start" (advanced prep), "prep" (active knife work/assembly), and "cooking" (heat/stoves).
    5. INGREDIENTS: Use the provided "Database ingredients" names if a close match exists to avoid duplicates.
    6. OUTPUT: Strict JSON only.
  `;

  const prompt = `Parse this content: ${content}. Database ingredients for mapping: ${existingIngredients.join(",")}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dishName: { type: Type.STRING },
          category: { type: Type.STRING },
          cuisine: { type: Type.STRING },
          servingSizeInfo: { type: Type.STRING },
          variations: { type: Type.ARRAY, items: { type: Type.STRING } },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                kitchen: {
                  type: Type.OBJECT,
                  properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } },
                  required: ["value", "unit"]
                },
                shopping: {
                  type: Type.OBJECT,
                  properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } },
                  required: ["value", "unit"]
                }
              },
              required: ["name", "kitchen", "shopping"]
            }
          },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                instruction: { type: Type.STRING },
                durationMinutes: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ["pre-start", "prep", "cooking"] }
              },
              required: ["instruction", "durationMinutes", "type"]
            }
          },
          totalTimeMinutes: { type: Type.NUMBER }
        },
        required: ["dishName", "category", "cuisine", "servingSizeInfo", "variations", "ingredients", "steps", "totalTimeMinutes"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateProductionTimeline = async (
  selections: { recipe: Recipe; servings: number }[],
  cooks: number,
  burners: number
): Promise<ProductionSchedule> => {
  const model = "gemini-3-pro-preview";
  const prompt = `Interleave steps for: ${selections.map(s => s.recipe.dishName).join(", ")}. Resources: ${cooks} cooks, ${burners} burners.`;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: "Create an efficient, interleaved kitchen production schedule. Exclude pre-start steps. Return JSON.",
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '{"timeline":[]}');
};

export const architectMealPlan = async (
  dbRecipes: Recipe[],
  durationDays: number,
  fridgeInventory: string
): Promise<MealPlanResult> => {
  const model = "gemini-3-flash-preview";
  const prompt = `Plan for ${durationDays} days using these recipes: ${dbRecipes.map(r => r.dishName).join(", ")}. Fridge: ${fridgeInventory}`;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: "Architect a meal plan. Return JSON.",
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '{"plan":[]}');
};
