import { useState } from 'react';
import { AddFoodSheet, FoodBadges } from '../components/AddFoodSheet';
import { Bar, Card, H2, btnGhost, btnPrimary } from '../components/ui';
import { Check, ChevronLeft, ChevronRight, Copy, Droplet, Minus, Plus, Sparkles, Trash2, Utensils } from '../icons';
import { WATER_TARGET_GLASSES, addDays, fmtDate, pct, targetCalories, targetMacros, todayISO, totalsOf } from '../lib/calc';
import { entriesFor } from '../lib/state';
import { MEAL_SLOTS } from '../lib/types';
import type { MealSlot } from '../lib/types';
import { useApp } from '../store';

const PORTION_PILLS = [0.5, 1, 1.5, 2];

export function Today({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { state, actions, toast } = useApp();
  const profile = state.profile.value;
  const [adding, setAdding] = useState<MealSlot | null>(null);

  const entries = entriesFor(state, date);
  const totals = totalsOf(entries);
  const target = targetMacros(profile);
  const kcalTarget = targetCalories(profile);
  const delta = kcalTarget - totals.kcal;
  const isToday = date === todayISO();
  const water = state.days[date] && !state.days[date].deleted ? state.days[date].water : 0;

  return (
    <div className="space-y-5">
      {/* Date navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 shadow-sm px-2 py-1.5">
        <button type="button" className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft />
        </button>
        <div className="text-center">
          <div className="font-bold text-slate-900">{isToday ? 'Today' : fmtDate(date, { weekday: 'long' })}</div>
          <div className="text-xs text-slate-500">{fmtDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="flex items-center">
          {!isToday && (
            <button type="button" className="text-xs font-semibold text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50" onClick={() => setDate(todayISO())}>
              Today
            </button>
          )}
          <button type="button" className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Calories + macros */}
      <Card>
        <H2 icon={<Utensils className="w-5 h-5 text-emerald-600" />} right={<span className="text-xs text-slate-500">Target {kcalTarget.toLocaleString()} kcal</span>}>
          Calories &amp; macros
        </H2>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Consumed</span>
              <div className="text-2xl font-extrabold text-slate-900" data-testid="kcal-total">
                {totals.kcal.toLocaleString()} <span className="text-sm font-medium text-slate-500">/ {kcalTarget.toLocaleString()} kcal</span>
              </div>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${delta >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`} data-testid="kcal-delta">
              {delta >= 0 ? `${delta} kcal remaining` : `${Math.abs(delta)} kcal over`}
            </span>
          </div>
          <Bar value={pct(totals.kcal, kcalTarget)} h="h-3.5" className={delta >= 0 ? 'bg-emerald-600' : 'bg-rose-500'} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MacroCard label="Protein" v={totals.p} t={target.p} box="bg-emerald-50/50 border-emerald-200/70 text-emerald-900" bar="bg-emerald-600" track="bg-emerald-200/70" msg={target.p - totals.p > 0 ? `${target.p - totals.p}g left for healing` : 'Target reached'} />
          <MacroCard label="Carbs" v={totals.c} t={target.c} box="bg-teal-50/50 border-teal-200/70 text-teal-900" bar="bg-teal-600" track="bg-teal-200/70" msg={target.c - totals.c >= 0 ? `${target.c - totals.c}g remaining` : `${totals.c - target.c}g over`} />
          <MacroCard label="Fat" v={totals.f} t={target.f} box="bg-amber-50/50 border-amber-200/70 text-amber-900" bar="bg-amber-500" track="bg-amber-200/70" msg={target.f - totals.f >= 0 ? `${target.f - totals.f}g remaining` : `${totals.f - target.f}g over`} />
        </div>
      </Card>

      {/* Meals */}
      <Card>
        <H2
          icon={<Sparkles className="w-5 h-5 text-amber-500" />}
          right={
            entries.length > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50"
                onClick={() => {
                  if (confirm('Clear everything logged on this day?')) actions.clearMeal(date);
                }}
              >
                Clear day
              </button>
            )
          }
        >
          Meals
        </H2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" className={btnGhost} onClick={() => actions.loadSample('1200', date)}>
            <Sparkles className="w-4 h-4 text-amber-600" /> 1,200 kcal sample day
          </button>
          <button type="button" className={btnGhost} onClick={() => actions.loadSample('1450', date)}>
            <Sparkles className="w-4 h-4 text-emerald-600" /> 1,450 kcal sample day
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              const n = actions.copyDay(addDays(date, -1), date);
              toast(n ? `Copied ${n} items from yesterday` : 'Nothing logged yesterday');
            }}
          >
            <Copy className="w-4 h-4" /> Copy yesterday
          </button>
        </div>

        <div className="space-y-4">
          {MEAL_SLOTS.map((slot) => {
            const items = entries.filter((e) => e.meal === slot);
            const t = totalsOf(items);
            return (
              <div key={slot} className="rounded-xl border border-slate-200 bg-white p-3.5" data-testid={`slot-${slot}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-slate-900">
                    {slot} <span className="text-xs font-normal text-slate-500">({t.kcal} kcal · {t.p}g protein)</span>
                  </div>
                  <button type="button" className={`${btnPrimary} !py-1.5 !px-3 !text-xs`} onClick={() => setAdding(slot)}>
                    <Plus className="w-3.5 h-3.5" /> Add food
                  </button>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">Nothing logged for {slot.toLowerCase()} yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {items.map((e) => {
                      const pills = PORTION_PILLS.includes(e.qty) ? PORTION_PILLS : [...PORTION_PILLS, e.qty].sort((a, b) => a - b);
                      return (
                        <li key={e.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-800 flex flex-wrap items-center gap-1.5">
                              <span>{e.name}</span>
                              <FoodBadges food={e} />
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {e.serving} · <strong className="text-slate-700">{Math.round(e.kcal * e.qty)} kcal</strong> ·{' '}
                              <span className="text-emerald-700 font-medium">{Math.round(e.p * e.qty * 10) / 10}g P</span> · {Math.round(e.c * e.qty)}g C · {Math.round(e.f * e.qty * 10) / 10}g F
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {pills.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => actions.setEntryQty(e.id, m)}
                                className={`px-2 py-1 rounded text-[11px] font-semibold ${e.qty === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                {m}x
                              </button>
                            ))}
                            <button type="button" className="p-1.5 ml-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50" onClick={() => actions.removeEntry(e.id)} aria-label={`Remove ${e.name}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Checklist + water */}
      <Card>
        <H2 icon={<Droplet className="w-5 h-5 text-sky-500" />}>Healing checklist</H2>
        <ul className="space-y-2 text-sm">
          <Check3 ok={totals.iron > 0} title="Iron-rich food" desc={`Ugu, beans, spinach, snail, lean meat help rebuild haemoglobin. ${totals.iron} logged.`} />
          <Check3 ok={totals.vitC > 0} title="Vitamin C source" desc={`Citrus, peppers, pawpaw, guava help wound healing and iron absorption. ${totals.vitC} logged.`} />
          <Check3 ok={totals.fibre >= 2} title="Fibre (2+ sources)" desc={`Oats, vegetables, beans keep digestion easy while the abdomen heals. ${totals.fibre} logged.`} />
          <Check3 ok={water >= WATER_TARGET_GLASSES} title={`Water: ${water} of ${WATER_TARGET_GLASSES} glasses (250 ml each)`} desc="About 2.5 litres a day. Tap to track." />
        </ul>
        <div className="flex items-center gap-3 mt-3">
          <button type="button" className={`${btnGhost} !px-3`} onClick={() => actions.setWater(date, water - 1)} aria-label="Remove a glass">
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <Bar value={pct(water, WATER_TARGET_GLASSES)} className="bg-sky-500" track="bg-sky-100" />
          </div>
          <button type="button" className={`${btnGhost} !px-3`} onClick={() => actions.setWater(date, water + 1)} aria-label="Add a glass">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {adding && <AddFoodSheet date={date} meal={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

function MacroCard({ label, v, t, box, bar, track, msg }: { label: string; v: number; t: number; box: string; bar: string; track: string; msg: string }) {
  return (
    <div className={`p-3.5 rounded-xl border ${box}`}>
      <div className="flex justify-between items-center text-xs font-bold mb-1">
        <span className="uppercase">{label}</span>
        <span>
          {v}g / {t}g
        </span>
      </div>
      <Bar value={pct(v, t)} className={bar} track={track} />
      <div className="text-[11px] font-medium mt-1.5">{msg}</div>
    </div>
  );
}

function Check3({ ok, title, desc }: { ok: boolean; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50">
      <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full grid place-items-center ${ok ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-transparent'}`}>
        <Check className="w-3.5 h-3.5" />
      </span>
      <div>
        <div className="font-semibold text-slate-800 text-[13px]">{title}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
    </li>
  );
}
