export interface Quantity {
  value: number;
  unit: string;
}

export interface Ingredient {
  name: string; // Canonical name
  kitchen: Quantity; // e.g., { value: 1, unit: "cup" }
  shopping: Quantity; // e.g., { value: 125, unit: "grams" }
}

export interface RecipeStep {
  instruction: string; // Will include quantities/ingredients directly
  durationMinutes: number;
}

export interface Recipe {
  id: string;
  dishName: string;
  variations: string[];
  servings: 4;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  totalTimeMinutes: number;
  timestamp: number;
  sources?: { uri: string; title: string }[];
}

export interface StandardizedIngredient {
  name: string;
  recipesUsing: string[];
}
