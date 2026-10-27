import { describe, expect, test } from 'bun:test';
import { INGREDIENTS, makeStarterRecipes } from './data/ingredients';
import { BUILTIN_FOODS } from './data/foods';
import { bmr, macroKcal, project, recipeToFood, recipeTotals, targetMacros, tdee, totalsOf } from './lib/calc';
import { DEFAULT_PROFILE, defaultState, mergeStates, normalizeState } from './lib/state';
import type { AppState, Entry } from './lib/types';

describe('food data', () => {
  test('ids are unique', () => {
    const ids = BUILTIN_FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const ing = INGREDIENTS.map((f) => f.id);
    expect(new Set(ing).size).toBe(ing.length);
  });
  test('calories roughly match macros (4P+4C+9F) within 18% for foods over 60 kcal', () => {
    const bad = BUILTIN_FOODS.filter((f) => f.kcal > 60).filter((f) => Math.abs(macroKcal(f) - f.kcal) / f.kcal > 0.18);
    expect(bad.map((f) => `${f.name}: ${f.kcal} vs ${Math.round(macroKcal(f))}`)).toEqual([]);
  });
  test('ingredients: same check per 100 g', () => {
    const bad = INGREDIENTS.filter((f) => f.kcal > 60).filter((f) => Math.abs(macroKcal(f) - f.kcal) / f.kcal > 0.18);
    expect(bad.map((f) => `${f.name}: ${f.kcal} vs ${Math.round(macroKcal(f))}`)).toEqual([]);
  });
  test('requested foods exist', () => {
    const names = BUILTIN_FOODS.map((f) => f.name.toLowerCase()).join('|');
    for (const w of ['oat swallow', 'twinings pure green tea', 'egusi', 'efo riro', 'okra', 'jollof', 'moi moi', 'pawpaw', 'ugu', 'garden egg'])
      expect(names).toContain(w);
  });
});

describe('energy maths', () => {
  const p = DEFAULT_PROFILE;
  test('Mifflin-St Jeor for 27y F 91kg 160cm = 1614', () => expect(bmr(p)).toBe(1614));
  test('TDEE before / after exercise start', () => {
    expect(tdee(p, '2026-10-15')).toBe(Math.round(1614 * 1.2));
    expect(tdee(p, '2026-11-01')).toBe(Math.round(1614 * 1.32));
  });
  test('1200 kcal macro grams at 35/35/30', () => {
    expect(targetMacros(p)).toEqual({ kcal: 1200, p: 105, c: 105, f: 40 });
  });
  test('projection: 60 kg and 55 kg are reachable, 55 is later, dates are after today', () => {
    const a = project(p, 60, '2026-10-15');
    const b = project(p, 55, '2026-10-15');
    expect(a.reachable && b.reachable).toBe(true);
    expect(a.date! > '2026-10-15').toBe(true);
    expect(b.date! > a.date!).toBe(true);
    // 31 kg at ~0.7-0.85 kg/week should be roughly 9-11 months
    expect(a.weeks).toBeGreaterThan(30);
    expect(a.weeks).toBeLessThan(60);
  });
  test('projection: unreachable when target >= TDEE', () => {
    expect(project({ ...p, calorieMode: 'custom', customCalories: 2400 }, 60, '2026-10-15').reachable).toBe(false);
  });
  test('already at goal', () => expect(project({ ...p, weight: 58 }, 60, '2026-10-15').days).toBe(0));
});

describe('recipes', () => {
  const [veg, chicken] = makeStarterRecipes();
  test('starter recipes use the ingredients the user listed', () => {
    const names = (r: typeof veg) => r.items.map((i) => i.name.toLowerCase()).join('|');
    for (const w of ['ugu', 'lettuce', 'celery', 'spring onion', 'spinach', 'chicken stock', 'palm oil']) expect(names(veg)).toContain(w);
    for (const w of ['chicken', 'cabbage', 'lettuce', 'carrot', 'kidney', 'peas', 'celery', 'onion', 'green pepper', 'red bell', 'ginger', 'maggi', 'salt'])
      expect(names(chicken)).toContain(w);
    expect(names(chicken)).not.toContain('oil'); // the chicken sauce has no oil
    expect(veg.starter && chicken.starter).toBe(true);
  });
  test('totals scale with grams and divide by servings', () => {
    const t = recipeTotals({ items: [{ key: 'a', name: 'x', grams: 200, kcal100: 50, p100: 10, c100: 5, f100: 1 }] });
    expect(t.kcal).toBe(100);
    const f = recipeToFood({ id: 'r', name: 'r', servings: 4, items: [{ key: 'a', name: 'x', grams: 200, kcal100: 50, p100: 10, c100: 5, f100: 1 }] });
    expect(f.kcal).toBe(25);
    expect(f.p).toBe(5);
  });
  test('veg soup and chicken sauce per-portion calories are plausible', () => {
    expect(recipeToFood(veg).kcal).toBeGreaterThan(120);
    expect(recipeToFood(veg).kcal).toBeLessThan(300);
    expect(recipeToFood(chicken).kcal).toBeGreaterThan(150);
    expect(recipeToFood(chicken).kcal).toBeLessThan(350);
  });
});

describe('totals', () => {
  test('qty multiplies and rounds', () => {
    const e = (kcal: number, qty: number): Entry => ({ id: 'x', date: 'd', meal: 'Lunch', foodId: 'f', name: 'n', serving: 's', qty, kcal, p: 10, c: 10, f: 1 });
    const t = totalsOf([e(100, 1.5), e(50, 0.5)]);
    expect(t.kcal).toBe(175);
    expect(t.p).toBe(20);
  });
});

describe('sync merge', () => {
  const base = (): AppState => defaultState();
  const entry = (id: string, kcal: number, updatedAt: number, deleted = false) => ({
    id, date: '2026-10-15', meal: 'Lunch' as const, foodId: 'f', name: 'n', serving: 's', qty: 1, kcal, p: 0, c: 0, f: 0, updatedAt, deleted,
  });
  test('last write wins per record and union of keys', () => {
    const a = base(); const b = base();
    a.entries = { e1: entry('e1', 100, 10), e2: entry('e2', 200, 10) };
    b.entries = { e1: entry('e1', 111, 20), e3: entry('e3', 300, 5) };
    const m = mergeStates(a, b);
    expect(Object.keys(m.entries).sort()).toEqual(['e1', 'e2', 'e3']);
    expect(m.entries.e1.kcal).toBe(111);
  });
  test('a newer delete beats an older edit, and vice versa', () => {
    const a = base(); const b = base();
    a.entries = { e1: entry('e1', 100, 10) };
    b.entries = { e1: entry('e1', 100, 20, true) };
    expect(mergeStates(a, b).entries.e1.deleted).toBe(true);
    expect(mergeStates(b, a).entries.e1.deleted).toBe(true);
    const c = base(); c.entries = { e1: entry('e1', 999, 30) };
    expect(mergeStates(b, c).entries.e1.deleted).toBeFalsy();
  });
  test('merge is commutative and idempotent', () => {
    const a = base(); const b = base();
    a.entries = { e1: entry('e1', 1, 10) }; b.entries = { e1: entry('e1', 2, 20), e2: entry('e2', 3, 1) };
    a.profile = { value: { ...a.profile.value, weight: 90 }, updatedAt: 50 };
    const ab = mergeStates(a, b); const ba = mergeStates(b, a);
    expect(JSON.stringify(ab)).toBe(JSON.stringify(ba));
    expect(JSON.stringify(mergeStates(ab, ab))).toBe(JSON.stringify(ab));
    expect(ab.profile.value.weight).toBe(90);
  });
  test('normalizeState survives garbage', () => {
    expect(normalizeState(null).v).toBe(1);
    expect(normalizeState('nope').profile.value.age).toBe(27);
    expect(normalizeState({ entries: 5, profile: 3 }).entries).toEqual({});
  });
});
