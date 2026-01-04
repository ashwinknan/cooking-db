
export type RecipeCategory = string; // Now dynamic
export type StepType = 'pre-start' | 'prep' | 'cooking';

export interface Quantity {
  value: number;
  unit: string;
}

export interface Ingredient {
  name: string;
  kitchen: Quantity;
  shopping: Quantity;
}

export interface RecipeStep {
  instruction: string;
  durationMinutes: number;
  type: StepType;
}

export interface Recipe {
  id: string;
  dishName: string;
  category: RecipeCategory;
  cuisine: string;
  variations: string[];
  servings: number;
  servingSizeInfo: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  totalTimeMinutes: number;
  timestamp: number;
  sources?: { uri: string; title: string }[];
  pairedWith?: string[]; // IDs of other recipes
}

export interface StandardizedIngredient {
  name: string;
  recipesUsing: string[];
}

export interface TimelineStep {
  timeOffset: number;
  duration: number;
  action: string;
  involvedRecipes: string[];
  assignees: string[];
  isParallel: boolean;
  type: StepType;
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
  insufficientVariety: boolean;
  missingCount: Record<string, number>;
}
