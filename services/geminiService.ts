
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from "../types";

// Function to parse recipe content using Gemini API
export const parseRecipeContent = async (
  content: string,
  existingIngredients: string[]
): Promise<Partial<Recipe> & { sources?: { uri: string; title: string }[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";
  const isUrl = content.trim().startsWith('http');

  const prompt = `
    TASK: Systematize the following recipe into a structured JSON.
    INPUT: ${content}
    
    CRITICAL INSTRUCTIONS:
    1. ${isUrl ? 'Visit this URL and extract ALL recipe details. Be precise with quantities.' : 'Parse the provided text.'}
    2. CATEGORIZATION: Classify the dish as exactly one of: "breakfast", "lunch/dinner", or "evening snack".
    3. SCALE TO 4 SERVINGS: All quantities MUST be scaled to exactly 4 servings. 
    4. DUAL UNITS: Provide 'kitchen' (cloves, cups, tbsp) and 'shopping' (grams, ml, pieces) units.
    5. INSTRUCTION REWRITING: Each step must be self-contained and mention the ingredient + quantity used in that step.
    6. CANONICAL NAMES: Use standard names. Existing DB names: ${existingIngredients.join(", ")}.
    7. VARIATIONS: List 3-5 alternative names for this dish.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dishName: { type: Type.STRING },
            category: { type: Type.STRING, description: "Must be 'breakfast', 'lunch/dinner', or 'evening snack'" },
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
                  durationMinutes: { type: Type.NUMBER }
                },
                required: ["instruction", "durationMinutes"]
              }
            },
            totalTimeMinutes: { type: Type.NUMBER }
          },
          required: ["dishName", "category", "variations", "ingredients", "steps", "totalTimeMinutes"]
        },
        tools: isUrl ? [{ googleSearch: {} }] : undefined
      }
    });

    const text = response.text || "";
    const parsedData = JSON.parse(text);

    const sources: { uri: string; title: string }[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({
            uri: chunk.web.uri,
            title: chunk.web.title || chunk.web.uri
          });
        }
      });
    }

    return { ...parsedData, sources };
  } catch (e: any) {
    console.error("Gemini Error:", e);
    throw new Error(`Systematizer Error: ${e.message || "Failed to read content"}`);
  }
};
