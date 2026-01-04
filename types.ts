
export type RecipeCategory = 'breakfast' | 'lunch/dinner' | 'evening snack';

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
  category: RecipeCategory;
  variations: string[];
  servings: number;
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

// --- Production System Types ---

export interface TimelineStep {
  timeOffset: number;
  action: string;
  involvedRecipes: string[];
  assignees: string[];
  isParallel: boolean;
}

export interface MealPlanDay {
  day: number;
  breakfast: string;
  lunchDinner: string;
  snack: string;
}

export interface ProductionSchedule {
  timeline: TimelineStep[];
}

export interface MealPlanResult {
  plan: MealPlanDay[];
}
