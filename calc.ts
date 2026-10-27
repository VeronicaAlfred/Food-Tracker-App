import type { Entry, Food, Profile, Recipe } from './types';

export const KCAL_PER_KG = 7700;
export const SEDENTARY_FACTOR = 1.2;
export const LIGHT_EXERCISE_FACTOR = 1.32;
export const WATER_TARGET_GLASSES = 10; // 10 x 250 ml = 2.5 L

// ---------- dates (local time, never UTC, so "today" is correct in Lagos) ----------
export const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (iso: string, n: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
export const fmtDate = (iso: string, opts?: Intl.DateTimeFormatOptions) =>
  parseISO(iso).toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });

// ---------- energy ----------
/** Mifflin-St Jeor */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'weight' | 'height'>, weight = p.weight): number {
  const base = 10 * weight + 6.25 * p.height - 5 * p.age;
  return Math.round(base + (p.sex === 'male' ? 5 : -161));
}

export const activityFactor = (p: Profile, onDate: string) =>
  p.exerciseStart && onDate >= p.exerciseStart ? LIGHT_EXERCISE_FACTOR : SEDENTARY_FACTOR;

export const tdee = (p: Profile, onDate: string, weight = p.weight) =>
  Math.round(bmr(p, weight) * activityFactor(p, onDate));

export function targetCalories(p: Profile): number {
  if (p.calorieMode === 'strict1200') return 1200;
  if (p.calorieMode === 'gentle1450') return 1450;
  return p.customCalories;
}

export function targetMacros(p: Profile) {
  const kcal = targetCalories(p);
  return {
    kcal,
    p: Math.round((kcal * (p.proteinPct / 100)) / 4),
    c: Math.round((kcal * (p.carbsPct / 100)) / 4),
    f: Math.round((kcal * (p.fatPct / 100)) / 9),
  };
}

// ---------- projection ----------
export interface Projection {
  reachable: boolean;
  kgToLose: number;
  days: number;
  weeks: number;
  months: number;
  date: string | null;
}

/**
 * Day-by-day simulation: BMR is recalculated as weight falls, and the activity factor
 * switches from sedentary to light exercise on `exerciseStart`. Ignores metabolic adaptation,
 * so treat the date as the best case rather than a promise.
 */
export function project(p: Profile, goal: number, from: string): Projection {
  const kgToLose = Math.max(0, p.weight - goal);
  if (kgToLose === 0) return { reachable: true, kgToLose: 0, days: 0, weeks: 0, months: 0, date: from };
  const target = targetCalories(p);
  let w = p.weight;
  let day = 0;
  const MAX_DAYS = 365 * 4;
  while (w > goal && day < MAX_DAYS) {
    const date = addDays(from, day);
    const deficit = tdee(p, date, w) - target;
    if (deficit <= 0) return { reachable: false, kgToLose, days: 0, weeks: 0, months: 0, date: null };
    w -= deficit / KCAL_PER_KG;
    day += 1;
  }
  if (w > goal) return { reachable: false, kgToLose, days: 0, weeks: 0, months: 0, date: null };
  return {
    reachable: true,
    kgToLose,
    days: day,
    weeks: Math.round(day / 7),
    months: Math.round((day / 30.44) * 10) / 10,
    date: addDays(from, day),
  };
}

export function weeklyLoss(p: Profile, onDate: string): number {
  const deficit = tdee(p, onDate) - targetCalories(p);
  return Math.max(0, (deficit * 7) / KCAL_PER_KG);
}

// ---------- daily totals ----------
export interface Totals {
  kcal: number;
  p: number;
  c: number;
  f: number;
  iron: number;
  vitC: number;
  fibre: number;
}

export function totalsOf(entries: Entry[]): Totals {
  const t: Totals = { kcal: 0, p: 0, c: 0, f: 0, iron: 0, vitC: 0, fibre: 0 };
  for (const e of entries) {
    t.kcal += e.kcal * e.qty;
    t.p += e.p * e.qty;
    t.c += e.c * e.qty;
    t.f += e.f * e.qty;
    if (e.iron) t.iron += 1;
    if (e.vitC) t.vitC += 1;
    if (e.fibre) t.fibre += 1;
  }
  return { ...t, kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) };
}

export const pct = (v: number, target: number) =>
  !target || target <= 0 ? 0 : Math.min(100, Math.round((v / target) * 100));

// ---------- recipes ----------
export interface RecipeTotals {
  kcal: number;
  p: number;
  c: number;
  f: number;
  grams: number;
}

export function recipeTotals(r: Pick<Recipe, 'items'>): RecipeTotals {
  const t: RecipeTotals = { kcal: 0, p: 0, c: 0, f: 0, grams: 0 };
  for (const i of r.items) {
    const k = (Number(i.grams) || 0) / 100;
    t.kcal += i.kcal100 * k;
    t.p += i.p100 * k;
    t.c += i.c100 * k;
    t.f += i.f100 * k;
    t.grams += Number(i.grams) || 0;
  }
  return t;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function recipeToFood(r: Recipe): Food {
  const t = recipeTotals(r);
  const s = Math.max(1, Number(r.servings) || 1);
  return {
    id: `recipe:${r.id}`,
    name: r.name,
    serving: `1 of ${s} portions (~${Math.round(t.grams / s)} g raw)`,
    kcal: Math.round(t.kcal / s),
    p: round1(t.p / s),
    c: round1(t.c / s),
    f: round1(t.f / s),
    cat: 'Recipe',
    tag: r.starter ? 'Placeholder quantities' : 'My recipe',
    iron: r.items.some((i) => i.iron) || undefined,
    vitC: r.items.some((i) => i.vitC) || undefined,
    fibre: r.items.some((i) => i.fibre) || undefined,
  };
}

/** Macro-energy sanity check used by tests: 4P + 4C + 9F should be close to kcal. */
export const macroKcal = (f: { p: number; c: number; f: number }) => 4 * f.p + 4 * f.c + 9 * f.f;
