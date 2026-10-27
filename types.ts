export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
export const MEAL_SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export type FoodCategory =
  | 'Swallow'
  | 'Soup & Stew'
  | 'Rice & Grains'
  | 'Beans & Legumes'
  | 'Protein'
  | 'Snacks & Street Food'
  | 'Breakfast & Drinks'
  | 'Fruit'
  | 'Vegetable'
  | 'Tea & Beverage'
  | 'Recipe'
  | 'Custom';

/** Where a number came from. EST = estimated from standard composition data, not a lab/label value. */
export type Source = 'GS' | 'FN' | 'AC' | 'SA' | 'TW' | 'USDA' | 'EST';

export interface Food {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  cat: FoodCategory;
  tag?: string;
  iron?: boolean;
  vitC?: boolean;
  fibre?: boolean;
  src?: Source;
}

/** Nutrition per 100 g (or 100 ml) of an ingredient. */
export interface Ingredient {
  id: string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  group: 'Vegetable' | 'Protein' | 'Legume' | 'Grain & Starch' | 'Fat & Seasoning' | 'Liquid' | 'Other';
  iron?: boolean;
  vitC?: boolean;
  fibre?: boolean;
  src?: Source;
}

export interface RecipeItem {
  key: string;
  ingId?: string;
  name: string;
  grams: number;
  kcal100: number;
  p100: number;
  c100: number;
  f100: number;
  iron?: boolean;
  vitC?: boolean;
  fibre?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  items: RecipeItem[];
  notes?: string;
  /** true while the quantities are placeholders the user has not yet replaced */
  starter?: boolean;
}

export interface Profile {
  sex: 'female' | 'male';
  age: number;
  weight: number;
  height: number;
  goalWeight: number;
  /** ISO date when regular exercise starts (activity factor rises from sedentary to light exercise) */
  exerciseStart: string;
  /** Optional ISO date of surgery, for the recovery-stage banner */
  surgeryDate: string;
  calorieMode: 'strict1200' | 'gentle1450' | 'custom';
  customCalories: number;
  macroPreset: 'recovery' | 'balanced' | 'lowcarb' | 'custom';
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface Meta {
  updatedAt: number;
  deleted?: boolean;
}

/** One logged food. Nutrition is snapshotted so history never changes when a recipe or food is edited. */
export interface Entry {
  id: string;
  date: string;
  meal: MealSlot;
  foodId: string;
  name: string;
  serving: string;
  qty: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  iron?: boolean;
  vitC?: boolean;
  fibre?: boolean;
}

export interface WeightLog {
  date: string;
  kg: number;
}

export interface DayMeta {
  date: string;
  water: number;
}

export interface Favorite {
  id: string;
  on: boolean;
}

export type Coll<T> = Record<string, T & Meta>;

export interface AppState {
  v: 1;
  profile: { value: Profile; updatedAt: number };
  entries: Coll<Entry>;
  customFoods: Coll<Food>;
  recipes: Coll<Recipe>;
  weights: Coll<WeightLog>;
  days: Coll<DayMeta>;
  favorites: Coll<Favorite>;
}
