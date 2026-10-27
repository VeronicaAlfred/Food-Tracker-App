import { useMemo, useState } from 'react';
import { FOOD_CATEGORIES } from '../data/foods';
import { macroKcal, totalsOf } from '../lib/calc';
import { entriesFor, live, uid } from '../lib/state';
import { MEAL_SLOTS } from '../lib/types';
import type { Food, MealSlot } from '../lib/types';
import { Plus, Search, Star } from '../icons';
import { useApp } from '../store';
import { Field, Modal, NumInput, btnGhost, btnPrimary, inputCls } from './ui';

const PORTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

export function FoodBadges({ food }: { food: Pick<Food, 'iron' | 'vitC' | 'fibre'> }) {
  return (
    <>
      {food.iron && <span className="px-1.5 py-0.5 text-[10px] rounded bg-rose-100 text-rose-800 font-semibold">Iron</span>}
      {food.vitC && <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-800 font-semibold">Vit C</span>}
      {food.fibre && <span className="px-1.5 py-0.5 text-[10px] rounded bg-teal-100 text-teal-800 font-semibold">Fibre</span>}
    </>
  );
}

type Tab = 'Suggested' | 'All' | Food['cat'];

export function AddFoodSheet({ date, meal: initialMeal, onClose }: { date: string; meal: MealSlot; onClose: () => void }) {
  const { state, foods, favorites, actions, toast } = useApp();
  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [qty, setQty] = useState(1);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('Suggested');
  const [creating, setCreating] = useState(false);

  const recentIds = useMemo(() => {
    const seen: string[] = [];
    const sorted = live(state.entries).sort((a, b) => b.updatedAt - a.updatedAt);
    for (const e of sorted) {
      if (!seen.includes(e.foodId)) seen.push(e.foodId);
      if (seen.length >= 12) break;
    }
    return seen;
  }, [state.entries]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/);
      return foods.filter((f) => {
        const hay = `${f.name} ${f.serving} ${f.tag ?? ''} ${f.cat}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }
    if (tab === 'Suggested') {
      const favs = foods.filter((f) => favorites.has(f.id));
      const rec = recentIds.map((id) => foods.find((f) => f.id === id)).filter((f): f is Food => !!f && !favorites.has(f.id));
      return [...favs, ...rec];
    }
    if (tab === 'All') return foods;
    return foods.filter((f) => f.cat === tab);
  }, [query, tab, foods, favorites, recentIds]);

  const dayTotals = totalsOf(entriesFor(state, date));
  const tabs: Tab[] = ['Suggested', 'All', ...FOOD_CATEGORIES];

  return (
    <Modal title={`Add to ${meal}`} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search: egusi, oat swallow, ugu, twinings…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search foods"
            />
          </div>
          <select className={`${inputCls} !w-auto`} value={meal} onChange={(e) => setMeal(e.target.value as MealSlot)} aria-label="Meal">
            {MEAL_SLOTS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">Portion</span>
          {PORTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setQty(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${qty === p ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {p}x
            </button>
          ))}
        </div>

        {!query && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${tab === t ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                {t === 'Suggested' ? '★ Suggested' : t}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {list.length} {list.length === 1 ? 'food' : 'foods'} · Day total <strong className="text-slate-800">{dayTotals.kcal} kcal</strong>
          </span>
          <button type="button" className="text-emerald-700 font-semibold hover:underline" onClick={() => setCreating(true)}>
            + Create food
          </button>
        </div>

        {list.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-6 text-center">
            {tab === 'Suggested' && !query ? 'Star foods or log a few meals and your favourites and recents will show here.' : 'No matching food. Try another word, or create it.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {list.map((f) => (
              <li key={f.id} className="flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-50">
                <button
                  type="button"
                  className={`p-1.5 rounded-lg shrink-0 ${favorites.has(f.id) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
                  onClick={() => actions.toggleFavorite(f.id)}
                  aria-label={favorites.has(f.id) ? 'Remove from favourites' : 'Add to favourites'}
                >
                  <Star className="w-4 h-4" fill={favorites.has(f.id) ? 'currentColor' : 'none'} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 flex flex-wrap items-center gap-1.5">
                    <span>{f.name}</span>
                    <FoodBadges food={f} />
                  </div>
                  <div className="text-xs text-slate-500">
                    {f.serving} · <strong className="text-slate-700">{Math.round(f.kcal * qty)} kcal</strong> · {Math.round(f.p * qty * 10) / 10}g P · {Math.round(f.c * qty)}g C · {Math.round(f.f * qty * 10) / 10}g F
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 w-9 h-9 grid place-items-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    actions.addEntry(f, date, meal, qty);
                    toast(`Added to ${meal}: ${f.name}`);
                  }}
                  aria-label={`Add ${f.name} to ${meal}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {creating && (
        <FoodForm
          onClose={() => setCreating(false)}
          onSaved={(food) => {
            actions.addEntry(food, date, meal, 1);
            toast(`Saved and added to ${meal}`);
          }}
        />
      )}
    </Modal>
  );
}

export function FoodForm({ existing, onClose, onSaved }: { existing?: Food; onClose: () => void; onSaved?: (f: Food) => void }) {
  const { actions } = useApp();
  const [name, setName] = useState(existing?.name ?? '');
  const [serving, setServing] = useState(existing?.serving ?? '1 serving');
  const [kcal, setKcal] = useState<number>(existing?.kcal ?? 0);
  const [p, setP] = useState<number>(existing?.p ?? 0);
  const [c, setC] = useState<number>(existing?.c ?? 0);
  const [f, setF] = useState<number>(existing?.f ?? 0);
  const [iron, setIron] = useState(!!existing?.iron);
  const [vitC, setVitC] = useState(!!existing?.vitC);
  const [fibre, setFibre] = useState(!!existing?.fibre);

  const fromMacros = Math.round(macroKcal({ p, c, f }));
  const valid = name.trim().length > 0 && kcal >= 0;

  return (
    <Modal title={existing ? 'Edit food' : 'Create food'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          const food: Food = {
            id: existing?.id ?? uid('food'),
            name: name.trim(),
            serving: serving.trim() || '1 serving',
            kcal,
            p,
            c,
            f,
            cat: 'Custom',
            tag: 'My food',
            iron: iron || undefined,
            vitC: vitC || undefined,
            fibre: fibre || undefined,
          };
          actions.saveCustomFood(food);
          onSaved?.(food);
          onClose();
        }}
      >
        <Field label="Food name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pepper soup with catfish" required />
        </Field>
        <Field label="Serving size (what one portion is)">
          <input className={inputCls} value={serving} onChange={(e) => setServing(e.target.value)} placeholder="e.g. 1 bowl (300 g)" />
        </Field>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Field label="Calories (kcal)">
            <NumInput value={kcal} onCommit={setKcal} min={0} />
          </Field>
          <Field label="Protein (g)">
            <NumInput value={p} onCommit={setP} min={0} step="0.1" />
          </Field>
          <Field label="Carbs (g)">
            <NumInput value={c} onCommit={setC} min={0} step="0.1" />
          </Field>
          <Field label="Fat (g)">
            <NumInput value={f} onCommit={setF} min={0} step="0.1" />
          </Field>
        </div>
        <p className="text-[11px] text-slate-500">
          Macros add up to about <strong>{fromMacros} kcal</strong>.{' '}
          {fromMacros > 0 && Math.abs(fromMacros - kcal) > Math.max(30, kcal * 0.15) && (
            <button type="button" className="text-emerald-700 font-semibold underline" onClick={() => setKcal(fromMacros)}>
              Use {fromMacros} kcal
            </button>
          )}
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={iron} onChange={(e) => setIron(e.target.checked)} /> Iron-rich</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={vitC} onChange={(e) => setVitC(e.target.checked)} /> Vitamin C</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={fibre} onChange={(e) => setFibre(e.target.checked)} /> High fibre</label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={!valid}>{existing ? 'Save changes' : 'Save food'}</button>
        </div>
      </form>
    </Modal>
  );
}
