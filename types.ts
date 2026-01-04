
export type RecipeCategory = 'breakfast' | 'lunch/dinner' | 'evening snack';
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
  type: StepType; // pre-start, prep, cooking
}

export interface Recipe {
  id: string;
  dishName: string;
  category: RecipeCategory;
  variations: string[];
  servings: number; // Always 2 by default
  servingSizeInfo: string; // e.g., "1 serving = 350g"
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

export interface TimelineStep {
  timeOffset: number; // Elapsed from start
  duration: number;   // Duration of this specific step
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
  missingCount: Record<RecipeCategory, number>;
}
