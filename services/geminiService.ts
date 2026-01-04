
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
    3. STEP SEPARATION: Separate steps into "pre-start" (overnight soaking), "prep" (active chopping), and "cooking" (stove).
    4. REALISTIC TIMING: Use home-cook standards. Chopping 1 onion = 3m. Cooking a crepe = 2m. 
    5. INGREDIENT NAMES: STRICTLY use names from the provided "Database ingredients" if they match. Do NOT use synonyms like "Urad Dal (Split Black Gram)" if "Urad Dal" is in the database. 
    6. NO AMBIGUITY: Do NOT use "OR" in ingredient names (e.g. "Oil or Ghee"). Pick the primary recommended ingredient.
    7. UNITS: For shopping, prefer mass (grams/kg). Avoid "jars".
    8. NO QUANTITIES IN TEXT: In the "steps", say "Add salt", not "Add 1 tsp salt".
    9. JSON: Output valid JSON.
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
    1. EXCLUDE "pre-start" steps.
    2. Group "prep" tasks.
    3. Start "cooking" as burners allow. 
    4. Provide 'duration' for each step and 'timeOffset' (elapsed mins).
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
    You are a Meal Planning AI. 
    Only use dishes from the provided database.
    If variety is low, specify missing counts per category.
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
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || '{"plan":[], "insufficientVariety": false, "missingCount": {}}');
};
