
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
    2. STEP SEPARATION: Separate steps into "prep" (chopping, washing, organizing) and "cooking" (stove, oven, microwave, flame).
    3. REALISTIC TIMING: Be generous with prep times. Assume a home cook using raw, un-processed ingredients. Chopping 1 onion = 4 mins, 1 tomato = 3 mins, etc.
    4. NO QUANTITIES IN TEXT: In the "steps" instructions, do NOT mention specific amounts (e.g., say "Add salt", not "Add 1 tsp salt").
    5. JSON: Output valid JSON matching the provided schema.
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
                type: { type: Type.STRING }
              },
              required: ["instruction", "durationMinutes", "type"]
            }
          },
          totalTimeMinutes: { type: Type.NUMBER }
        },
        required: ["dishName", "category", "variations", "ingredients", "steps", "totalTimeMinutes"]
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
    OPTIMIZATION:
    - Group all "prep" tasks at the start.
    - Start "cooking" tasks as soon as burners are free.
    - While a dish is simmering/boiling (idle time), assign a cook to another prep task.
    - Output a logical timeline. Use the EXACT instructions from the recipes.
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
                action: { type: Type.STRING },
                involvedRecipes: { type: Type.ARRAY, items: { type: Type.STRING } },
                assignees: { type: Type.ARRAY, items: { type: Type.STRING } },
                isParallel: { type: Type.BOOLEAN },
                type: { type: Type.STRING }
              },
              required: ["timeOffset", "action", "involvedRecipes", "assignees", "isParallel", "type"]
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
    STRICT RULE: Only use dishes from this list: [${dbRecipes.map(r => r.dishName).join(", ")}].
    CRITICAL: If there are fewer than ${durationDays * 2} unique recipes in the database, set "insufficientVariety" to true.
    GUIDANCE: Use the "Fridge Surplus" as a priority to finish ingredients.
  `;

  const prompt = `
    FRIDGE: ${fridgeInventory}
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
          },
          insufficientVariety: { type: Type.BOOLEAN }
        },
        required: ["plan", "insufficientVariety"]
      }
    }
  });

  return JSON.parse(response.text || '{"plan":[], "insufficientVariety": false}');
};
