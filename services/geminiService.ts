import { GoogleGenAI } from "@google/genai";
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

    OUTPUT JSON ONLY:
    {
      "dishName": "string",
      "variations": ["string"],
      "ingredients": [
        {"name": "string", "kitchen": {"value": number, "unit": "string"}, "shopping": {"value": number, "unit": "string"}}
      ],
      "steps": [{"instruction": "string", "durationMinutes": number}],
      "totalTimeMinutes": number
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // googleSearch is essential for reading URLs accurately
        tools: isUrl ? [{ googleSearch: {} }] : undefined
      }
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse result. Try pasting the text instead.");
    
    const parsedData = JSON.parse(jsonMatch[0]);

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
