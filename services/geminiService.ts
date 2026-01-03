
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from "../types";

// Function to parse recipe content using Gemini API
export const parseRecipeContent = async (
  content: string,
  existingIngredients: string[]
): Promise<Partial<Recipe> & { sources?: { uri: string; title: string }[] }> => {
  // Use a new instance to ensure it picks up the latest key from the selection dialog
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Using gemini-3-pro-preview for high-quality extraction and search capabilities
  const model = "gemini-3-pro-preview";
  const isUrl = content.trim().startsWith('http');

  const prompt = `
    TASK: Systematize the following recipe into a structured JSON.
    INPUT: ${content}
    
    CRITICAL INSTRUCTIONS:
    1. ${isUrl ? 'Visit this URL and extract ALL recipe details. Be precise with quantities.' : 'Parse the provided text.'}
    2. SCALE TO 4 SERVINGS: All quantities MUST be scaled to exactly 4 servings. 
    3. DUAL UNITS: Provide 'kitchen' (cloves, cups, tbsp) and 'shopping' (grams, ml, pieces) units.
    4. INSTRUCTION REWRITING: Each step must be self-contained and mention the ingredient + quantity used in that step.
    5. CANONICAL NAMES: Use standard names. Existing DB names: ${existingIngredients.join(", ")}.
    6. VARIATIONS: List 3-5 alternative names for this dish.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Implementing responseSchema for reliable structured output
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dishName: { type: Type.STRING },
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
          required: ["dishName", "variations", "ingredients", "steps", "totalTimeMinutes"]
        },
        // googleSearch is essential for reading URLs accurately
        tools: isUrl ? [{ googleSearch: {} }] : undefined
      }
    });

    // Access the .text property directly (not a method)
    const text = response.text || "";
    // With responseMimeType and responseSchema, the response is directly parseable
    const parsedData = JSON.parse(text);

    // Fix: Extract grounding URLs from groundingChunks as required by the guidelines for googleSearch
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
