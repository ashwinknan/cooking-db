
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, ProductionSchedule, MealPlanResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseRecipeContent = async (
  content: string,
  existingIngredients: string[]
): Promise<Partial<Recipe> & { sources?: { uri: string; title: string }[] }> => {
  const model = "gemini-3-pro-preview";

  const systemInstruction = `
    You are a friendly home-cooking assistant.
    1. SCALING: All recipes MUST be scaled for EXACTLY 2 servings.
    2. CUISINE: Identify the cuisine (e.g., Italian, Indian, Mexican).
    3. SERVING INFO: Calculate and provide serving size info (e.g., "1 serving = 300g").
    4. STEP SEPARATION: Separate steps into "pre-start" (e.g. soaking), "prep" (active chopping), and "cooking" (heat/stove).
    5. REALISTIC TIMING: Use home-cook standards for durationMinutes.
    6. INGREDIENT NAMES: STRICTLY use names from the provided "Database ingredients" if they match.
    7. NO AMBIGUITY: Pick one primary ingredient if a recipe says "Oil or Ghee".
    8. JSON: Output valid JSON.
  `;

  const prompt = `Parse this recipe: ${content}. Database ingredients: ${existingIngredients.join(",")}`;

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
                  properties: {
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING }
                  },
                  required: ["value", "unit"]
                },
                shopping: {
                  type: Type.OBJECT,
                  properties: {
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING }
                  },
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
  
  const systemInstruction = `
    You are a friendly Kitchen Helper. Interleave the steps of these dishes to make cooking efficient.
    RESOURCES: ${cooks} cooks, ${burners} burners.
    RULES:
    1. EXCLUDE "pre-start" steps.
    2. Interleave prep and cooking to save time.
    3. Output 'duration' for each step and 'timeOffset' (elapsed mins).
  `;

  const prompt = `
    DISHES: ${selections.map(s => `${s.recipe.dishName} (${s.servings} servings)`).join(", ")}
    RECIPE DATA: ${JSON.stringify(selections.map(s => s.recipe))}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
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
  
  const systemInstruction = `
    You are a Meal Planning Buddy. 
    Suggest a balanced plan using only the recipes provided in the list.
    Try to incorporate ingredients from the "fridge surplus" if mentioned.
  `;

  const prompt = `
    FRIDGE SURPLUS: ${fridgeInventory}
    DURATION: ${durationDays} days.
    DATABASE RECIPES: ${dbRecipes.map(r => `${r.dishName} (${r.category}, ${r.cuisine})`).join(", ")}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || '{"plan":[], "insufficientVariety": false, "missingCount": {}}');
};
