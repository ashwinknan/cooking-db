
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, ProductionSchedule, MealPlanResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseRecipeContent = async (
  content: string,
  existingIngredients: string[]
): Promise<Partial<Recipe> & { sources?: { uri: string; title: string }[] }> => {
  const model = "gemini-3-pro-preview";

  const systemInstruction = `
    You are a professional Culinary Operations Engineer. 
    1. SCALING: All recipes MUST be scaled for EXACTLY 2 servings.
    2. SERVING INFO: Calculate and provide serving size info (e.g., "1 serving = 300g").
    3. STEP SEPARATION: Separate steps into "pre-start" (overnight soaking, marinating), "prep" (active chopping, washing), and "cooking" (stove, oven).
    4. REALISTIC TIMING: Be precise. 
       - Chopping 1 onion: 3 mins. 
       - Cracking 8 eggs: 1 min. 
       - Flipping a crepe: 30 secs. 
       - Cooking a crepe: 2-3 mins total.
       - DO NOT OVERESTIMATE. Use home-cook standards but assume focused activity.
    5. UNITS: For shopping, prefer mass (grams/kg). Avoid "jars" or "boxes".
    6. NO QUANTITIES IN TEXT: In the "steps", say "Add salt", not "Add 1 tsp salt".
    7. JSON: Output valid JSON.
  `;

  const prompt = `Parse this: ${content}. Database ingredients: ${existingIngredients.join(",")}`;

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
        required: ["dishName", "category", "servingSizeInfo", "variations", "ingredients", "steps", "totalTimeMinutes"]
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
    You are a Kitchen Expeditor. Interleave the steps of these dishes.
    RESOURCES: ${cooks} cooks, ${burners} burners.
    RULES:
    1. EXCLUDE "pre-start" steps from the active timeline. They are assumed to be done.
    2. Group "prep" tasks efficiently.
    3. Start "cooking" as burners allow. 
    4. Provide 'duration' for each specific step and 'timeOffset' as elapsed minutes from start.
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
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeOffset: { type: Type.NUMBER },
                duration: { type: Type.NUMBER },
                action: { type: Type.STRING },
                involvedRecipes: { type: Type.ARRAY, items: { type: Type.STRING } },
                assignees: { type: Type.ARRAY, items: { type: Type.STRING } },
                isParallel: { type: Type.BOOLEAN },
                type: { type: Type.STRING }
              },
              required: ["timeOffset", "duration", "action", "involvedRecipes", "assignees", "isParallel", "type"]
            }
          }
        },
        required: ["timeline"]
      }
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
    You are a Meal Planning AI. 
    Only use dishes from the provided database.
    If you cannot fulfill the required variety (${durationDays} days * 3 meals = ${durationDays * 3} slots), specify how many are missing for each category.
  `;

  const prompt = `
    FRIDGE: ${fridgeInventory}
    DURATION: ${durationDays} days.
    DATABASE: ${dbRecipes.map(r => `${r.dishName} (${r.category})`).join(", ")}
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
          },
          insufficientVariety: { type: Type.BOOLEAN },
          missingCount: {
            type: Type.OBJECT,
            properties: {
              breakfast: { type: Type.NUMBER },
              "lunch/dinner": { type: Type.NUMBER },
              "evening snack": { type: Type.NUMBER }
            }
          }
        },
        required: ["plan", "insufficientVariety", "missingCount"]
      }
    }
  });

  return JSON.parse(response.text || '{"plan":[], "insufficientVariety": false, "missingCount": {}}');
};
