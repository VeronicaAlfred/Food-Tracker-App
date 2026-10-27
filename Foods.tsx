import { useMemo, useState } from 'react';
import { FoodBadges, FoodForm } from '../components/AddFoodSheet';
import { Card, Field, H2, Modal, NumInput, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { FOOD_CATEGORIES, SOURCE_LABELS } from '../data/foods';
import { INGREDIENTS, newItemFromIngredient } from '../data/ingredients';
import { ChefHat, Pencil, Plus, Search, Star, Trash2 } from '../icons';
import { recipeToFood, recipeTotals, round1 } from '../lib/calc';
import { live, uid } from '../lib/state';
import type { Food, Recipe, RecipeItem } from '../lib/types';
import { useApp } from '../store';

type Sub = 'foods' | 'recipes';

export function Foods() {
  const [sub, setSub] = useState<Sub>('foods');
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
        {(['foods', 'recipes'] as Sub[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSub(s)}
            className={`py-2 rounded-lg text-sm font-semibold ${sub === s ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-600'}`}
          >
            {s === 'foods' ? 'Food database' : 'My recipes'}
          </button>
        ))}
      </div>
      {sub === 'foods' ? <FoodList /> : <RecipeList />}
    </div>
  );
}

// ------------------------------------------------------------------ food database
function FoodList() {
  const { foods, favorites, actions } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const [editing, setEditing] = useState<Food | 'new' | null>(null);

  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return foods.filter((f) => {
      if (cat === '★' && !favorites.has(f.id)) return false;
      if (cat !== 'All' && cat !== '★' && f.cat !== cat) return false;
      if (!words.length) return true;
      const hay = `${f.name} ${f.serving} ${f.tag ?? ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [foods, q, cat, favorites]);

  return (
    <Card>
      <H2
        icon={<Search className="w-5 h-5 text-emerald-600" />}
        right={
          <button type="button" className={`${btnPrimary} !py-1.5`} onClick={() => setEditing('new')}>
            <Plus className="w-4 h-4" /> My food
          </button>
        }
      >
        {foods.length} foods
      </H2>
      <input className={`${inputCls} mb-3`} placeholder="Search foods…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search food database" />
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 mb-1">
        {['All', '★', ...FOOD_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${cat === c ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            {c === '★' ? '★ Favourites' : c}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
        {list.map((f) => (
          <li key={f.id} className="flex items-center gap-2 px-3 py-2.5">
            <button
              type="button"
              className={`p-1.5 rounded-lg shrink-0 ${favorites.has(f.id) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
              onClick={() => actions.toggleFavorite(f.id)}
              aria-label="Toggle favourite"
            >
              <Star className="w-4 h-4" fill={favorites.has(f.id) ? 'currentColor' : 'none'} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 flex flex-wrap items-center gap-1.5">
                <span>{f.name}</span>
                <FoodBadges food={f} />
              </div>
              <div className="text-xs text-slate-500">
                {f.serving} · <strong className="text-slate-700">{f.kcal} kcal</strong> · {f.p}g P · {f.c}g C · {f.f}g F
                {f.src && (
                  <span className="ml-1.5 text-[10px] text-slate-400" title={SOURCE_LABELS[f.src]}>
                    [{f.src}]
                  </span>
                )}
              </div>
            </div>
            {f.cat === 'Custom' && (
              <div className="flex shrink-0">
                <button type="button" className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg" onClick={() => setEditing(f)} aria-label={`Edit ${f.name}`}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  onClick={() => confirm(`Delete "${f.name}"? Past log entries keep their numbers.`) && actions.deleteCustomFood(f.id)}
                  aria-label={`Delete ${f.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-center text-sm text-slate-400 italic">No foods match.</li>}
      </ul>
      <p className="text-[11px] text-slate-400 mt-3">
        Bracketed codes show where a number comes from (hover for the source). EST means an estimate. Real calories vary with oil and portion size, so add your own foods or recipes for what you cook.
      </p>
      {editing && <FoodForm existing={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

// ------------------------------------------------------------------ recipes
function RecipeList() {
  const { state, actions } = useApp();
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);
  const recipes = live(state.recipes);

  return (
    <div className="space-y-4">
      <Card>
        <H2
          icon={<ChefHat className="w-5 h-5 text-emerald-600" />}
          right={
            <button type="button" className={`${btnPrimary} !py-1.5`} onClick={() => setEditing('new')}>
              <Plus className="w-4 h-4" /> New recipe
            </button>
          }
        >
          Recipes (calculated from ingredients)
        </H2>
        <p className="text-sm text-slate-600">
          Add what went into the pot (weigh raw or dry), say how many portions it made, and the app works out calories and macros per portion. Recipes appear in the food picker like any other food.
        </p>
      </Card>
      {recipes.length === 0 && <p className="text-sm text-slate-400 italic text-center py-6">No recipes yet.</p>}
      {recipes.map((r) => {
        const food = recipeToFood(r);
        return (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">{r.name}</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {r.items.length} ingredients · makes {r.servings} {r.servings === 1 ? 'portion' : 'portions'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-extrabold text-emerald-700">{food.kcal} kcal</div>
                <div className="text-[11px] text-slate-500">
                  {food.p}g P · {food.c}g C · {food.f}g F
                </div>
              </div>
            </div>
            {r.starter && (
              <p className="mt-3 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-2.5">
                These quantities are <strong>placeholders</strong>. Open the recipe and enter your real weights and number of portions for accurate numbers.
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button type="button" className={btnGhost} onClick={() => setEditing(r)}>
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button type="button" className={btnDanger} onClick={() => confirm(`Delete "${r.name}"?`) && actions.deleteRecipe(r.id)}>
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </Card>
        );
      })}
      {editing && <RecipeEditor existing={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RecipeEditor({ existing, onClose }: { existing?: Recipe; onClose: () => void }) {
  const { actions, toast } = useApp();
  const [name, setName] = useState(existing?.name ?? '');
  const [servings, setServings] = useState(existing?.servings ?? 4);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [items, setItems] = useState<RecipeItem[]>(existing?.items ?? []);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const draft: Recipe = { id: existing?.id ?? uid('recipe'), name, servings, items, notes, starter: false };
  const totals = recipeTotals(draft);
  const food = recipeToFood(draft);

  const matches = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return INGREDIENTS.filter((i) => words.every((w) => i.name.toLowerCase().includes(w))).slice(0, 8);
  }, [q]);

  const patch = (key: string, p: Partial<RecipeItem>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  return (
    <Modal title={existing ? 'Edit recipe' : 'New recipe'} onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="Recipe name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Efo riro with croaker" />
        </Field>
        <Field label="Portions the pot makes" hint="Per-portion numbers = whole pot ÷ portions.">
          <NumInput value={servings} onCommit={setServings} min={1} max={50} step="0.5" />
        </Field>

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">Ingredients (weigh raw / dry, in grams or ml)</div>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.key} className="rounded-xl border border-slate-200 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    {open === it.key && !it.ingId ? (
                      <input className={inputCls} value={it.name} onChange={(e) => patch(it.key, { name: e.target.value })} aria-label="Ingredient name" />
                    ) : (
                      <div className="text-sm font-semibold text-slate-800 truncate">{it.name}</div>
                    )}
                    <div className="text-[11px] text-slate-500">
                      {Math.round((it.kcal100 * (Number(it.grams) || 0)) / 100)} kcal ·{' '}
                      <button type="button" className="underline text-emerald-700" onClick={() => setOpen(open === it.key ? null : it.key)}>
                        {open === it.key ? 'hide values' : 'edit per-100 g values'}
                      </button>
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <NumInput value={it.grams} onCommit={(n) => patch(it.key, { grams: n })} min={0} step="1" ariaLabel={`Grams of ${it.name}`} />
                  </div>
                  <span className="text-xs text-slate-500">g</span>
                  <button type="button" className="p-1.5 text-slate-400 hover:text-rose-600" onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} aria-label={`Remove ${it.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {open === it.key && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {([['kcal100', 'kcal'], ['p100', 'P g'], ['c100', 'C g'], ['f100', 'F g']] as const).map(([k, label]) => (
                      <Field key={k} label={`${label} /100g`}>
                        <NumInput value={it[k]} onCommit={(n) => patch(it.key, { [k]: n } as Partial<RecipeItem>)} min={0} step="0.1" />
                      </Field>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {items.length === 0 && <li className="text-xs text-slate-400 italic">No ingredients yet. Search below to add some.</li>}
          </ul>
        </div>

        <div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className={`${inputCls} pl-9`} placeholder="Add ingredient: ugu, palm oil, kidney beans…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ingredients" />
          </div>
          {matches.length > 0 && (
            <ul className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {matches.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between gap-2"
                    onClick={() => {
                      setItems((xs) => [...xs, { ...newItemFromIngredient(i.id, 100), key: uid('i') }]);
                      setQ('');
                    }}
                  >
                    <span>{i.name}</span>
                    <span className="text-xs text-slate-500 shrink-0">{i.kcal} kcal/100g</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
            onClick={() => {
              const key = uid('i');
              setItems((xs) => [...xs, { key, name: 'Custom ingredient', grams: 100, kcal100: 0, p100: 0, c100: 0, f100: 0 }]);
              setOpen(key);
            }}
          >
            + Custom ingredient (enter your own values)
          </button>
        </div>

        <Field label="Notes (optional)">
          <textarea className={`${inputCls} min-h-[64px]`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <div>
              <div className="text-xs uppercase font-bold text-emerald-800">Per portion</div>
              <div className="text-xl font-extrabold text-emerald-700" data-testid="recipe-kcal">{food.kcal} kcal</div>
              <div className="text-xs text-emerald-900">
                {food.p}g P · {food.c}g C · {food.f}g F
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase font-bold text-slate-500">Whole pot</div>
              <div className="text-lg font-bold text-slate-800">{Math.round(totals.kcal)} kcal</div>
              <div className="text-xs text-slate-500">
                {round1(totals.p)}g P · {Math.round(totals.c)}g C · {round1(totals.f)}g F · {Math.round(totals.grams)} g raw
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!name.trim() || items.length === 0}
            onClick={() => {
              actions.saveRecipe({ ...draft, name: name.trim() });
              toast('Recipe saved');
              onClose();
            }}
          >
            Save recipe
          </button>
        </div>
      </div>
    </Modal>
  );
}
