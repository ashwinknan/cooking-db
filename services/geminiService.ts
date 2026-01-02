
import { GoogleGenAI } from "@google/genai";
import { Recipe } from "../types";

// Always use process.env.API_KEY directly for initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseRecipeContent = async (
  content: string,
  existingIngredients: string[]
): Promise<Partial<Recipe>> => {
  // Using gemini-3-pro-preview for high-quality extraction and search capabilities
  const model = "gemini-3-pro-preview";

  const isUrl = content.trim().startsWith('http');

  const prompt = `
    TASK: Systematize the following recipe into a structured JSON for a high-end cooking app database.
    INPUT TYPE: ${isUrl ? 'URL' : 'Text'}
    INPUT: ${content}
    
    CRITICAL INSTRUCTIONS:
    1. ${isUrl ? 'Vist the URL provided and extract the recipe details.' : 'Parse the text provided.'}
    2. SCALE TO 4 SERVINGS: All quantities MUST be scaled to exactly 4 servings. If the original doesn't specify, assume it's for 2 and double it.
    3. LOGICAL DUAL UNITS: Every ingredient must have TWO quantities:
       - 'kitchen': Culinarilly intuitive units. Use 'cloves' for Garlic, 'inches' for Ginger, 'tbsp/tsp' for spices, 'cups' for grains.
       - 'shopping': Marketplace units (grams/ml/pieces). 
    4. INSTRUCTION REWRITING: Each step must be self-contained and explicitly mention the ingredient and the quantity used in that step. 
    5. CANONICAL NAMES: Use base names (e.g., "Garlic", "Ginger", "Coconut"). Existing names in DB: ${existingIngredients.join(", ")}. 
    6. VARIATIONS: List 3-5 common alternative names for this dish.

    JSON STRUCTURE:
    {
      "dishName": "string",
      "variations": ["string"],
      "ingredients": [
        {
          "name": "Canonical Name",
          "kitchen": {"value": number, "unit": "string"},
          "shopping": {"value": number, "unit": "string"}
        }
      ],
      "steps": [
        {"instruction": "String including quantities", "durationMinutes": number}
      ],
      "totalTimeMinutes": number
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Use googleSearch tool to allow the model to fetch URL content if needed
        tools: isUrl ? [{ googleSearch: {} }] : undefined
      }
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse JSON from model response");
    return JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    console.error("Gemini Error:", e);
    throw new Error(`Failed to systematize: ${e.message || "Unknown Error"}`);
  }
};
