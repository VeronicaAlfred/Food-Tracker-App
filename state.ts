import { makeStarterRecipes } from '../data/ingredients';
import type { AppState, Coll, Entry, Food, Meta, Profile } from './types';

export const STORAGE_KEY = 'recovery-plate:v1';

export const DEFAULT_PROFILE: Profile = {
  sex: 'female',
  age: 27,
  weight: 91,
  height: 160,
  goalWeight: 60,
  exerciseStart: '2026-11-01',
  surgeryDate: '2026-08-10',
  calorieMode: 'strict1200',
  customCalories: 1200,
  macroPreset: 'recovery',
  proteinPct: 35,
  carbsPct: 35,
  fatPct: 30,
};

export function defaultState(): AppState {
  const recipes: Coll<AppState['recipes'][string]> = {};
  for (const r of makeStarterRecipes()) recipes[r.id] = { ...r, updatedAt: 0 };
  return {
    v: 1,
    profile: { value: DEFAULT_PROFILE, updatedAt: 0 },
    entries: {},
    customFoods: {},
    recipes,
    weights: {},
    days: {},
    favorites: {},
  };
}

export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---------- merge (last-write-wins per record; deletes are tombstones) ----------
function mergeColl<T>(a: Coll<T> | undefined, b: Coll<T> | undefined): Coll<T> {
  const out: Coll<T> = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b ?? {})) {
    const cur = out[k];
    if (!cur || (v as Meta).updatedAt > (cur as Meta).updatedAt) out[k] = v;
  }
  return out;
}

export function mergeStates(a: AppState, b: AppState): AppState {
  return {
    v: 1,
    profile: b.profile && b.profile.updatedAt > a.profile.updatedAt ? b.profile : a.profile,
    entries: mergeColl(a.entries, b.entries),
    customFoods: mergeColl(a.customFoods, b.customFoods),
    recipes: mergeColl(a.recipes, b.recipes),
    weights: mergeColl(a.weights, b.weights),
    days: mergeColl(a.days, b.days),
    favorites: mergeColl(a.favorites, b.favorites),
  };
}

const TOMBSTONE_TTL = 1000 * 60 * 60 * 24 * 120;

/** Drop old tombstones so the synced document stays small. */
export function pruneState(s: AppState): AppState {
  const cutoff = Date.now() - TOMBSTONE_TTL;
  const prune = <T>(c: Coll<T>): Coll<T> => {
    const out: Coll<T> = {};
    for (const [k, v] of Object.entries(c)) {
      if ((v as Meta).deleted && (v as Meta).updatedAt < cutoff) continue;
      out[k] = v;
    }
    return out;
  };
  return {
    ...s,
    entries: prune(s.entries),
    customFoods: prune(s.customFoods),
    recipes: prune(s.recipes),
    weights: prune(s.weights),
    days: prune(s.days),
    favorites: prune(s.favorites),
  };
}

/** Accepts anything from localStorage / imported files / the server and returns a safe AppState. */
export function normalizeState(raw: unknown): AppState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  const obj = <T>(x: T | undefined, fallback: T): T => (x && typeof x === 'object' ? x : fallback);
  const profile =
    r.profile && typeof r.profile === 'object' && r.profile.value
      ? { value: { ...DEFAULT_PROFILE, ...r.profile.value }, updatedAt: Number(r.profile.updatedAt) || 0 }
      : base.profile;
  // Keep starter recipes unless the stored copy overrides them.
  const recipes = { ...base.recipes, ...obj(r.recipes, {}) };
  return {
    v: 1,
    profile,
    entries: obj(r.entries, {}),
    customFoods: obj(r.customFoods, {}),
    recipes,
    weights: obj(r.weights, {}),
    days: obj(r.days, {}),
    favorites: obj(r.favorites, {}),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
  } catch {
    /* corrupted storage: fall through to defaults */
  }
  return defaultState();
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: app keeps working in memory */
  }
}

// ---------- selectors ----------
export const live = <T>(c: Coll<T>): (T & Meta)[] => Object.values(c).filter((x) => !x.deleted);

export const entriesFor = (s: AppState, date: string): (Entry & Meta)[] =>
  live(s.entries).filter((e) => e.date === date);

export function entryFromFood(food: Food, date: string, meal: Entry['meal'], qty: number): Entry {
  return {
    id: uid('e'),
    date,
    meal,
    foodId: food.id,
    name: food.name,
    serving: food.serving,
    qty,
    kcal: food.kcal,
    p: food.p,
    c: food.c,
    f: food.f,
    iron: food.iron,
    vitC: food.vitC,
    fibre: food.fibre,
  };
}
