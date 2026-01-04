
export type RecipeCategory = 'breakfast' | 'lunch/dinner' | 'evening snack';
export type StepType = 'prep' | 'cooking';

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
  type: StepType; // prep vs cooking
}

export interface Recipe {
  id: string;
  dishName: string;
  category: RecipeCategory;
  variations: string[];
  servings: number; // Always 2 by default
  ingredients: Ingredient[];
  steps: RecipeStep[];
  totalTimeMinutes: number;
  timestamp: number;
  sources?: { uri: string; title: string }[];
}

/**
 * Interface for aggregated ingredient information used in the master pantry view.
 */
export interface StandardizedIngredient {
  name: string;
  recipesUsing: string[];
}

export interface TimelineStep {
  timeOffset: number;
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
}
