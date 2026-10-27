import type { ReactNode } from 'react';
import { Card, Field, H2, NumInput, inputCls } from '../components/ui';
import { Activity, Award, Dumbbell, Flame, Scale, ShieldAlert, Sliders, TrendingDown } from '../icons';
import {
  activityFactor,
  bmr,
  fmtDate,
  project,
  targetCalories,
  targetMacros,
  tdee,
  todayISO,
  weeklyLoss,
  LIGHT_EXERCISE_FACTOR,
  SEDENTARY_FACTOR,
} from '../lib/calc';
import type { Profile } from '../lib/types';
import { useApp } from '../store';

export function Plan() {
  const { state, actions } = useApp();
  const p = state.profile.value;
  const set = actions.setProfile;
  const today = todayISO();

  const b = bmr(p);
  const t = tdee(p, today);
  const target = targetMacros(p);
  const kcal = targetCalories(p);
  const factor = activityFactor(p, today);
  const exercising = factor === LIGHT_EXERCISE_FACTOR;

  const presets: { id: Profile['macroPreset']; label: string; split: [number, number, number] }[] = [
    { id: 'recovery', label: 'High-protein recovery', split: [35, 35, 30] },
    { id: 'balanced', label: 'Balanced', split: [30, 40, 30] },
    { id: 'lowcarb', label: 'Lower carb', split: [40, 25, 35] },
  ];

  const changeMacro = (type: 'protein' | 'carbs' | 'fat', value: number) => {
    if (type === 'protein') {
      const remaining = 100 - value;
      const newCarbs = Math.round(remaining * 0.55);
      set({ macroPreset: 'custom', proteinPct: value, carbsPct: Math.max(0, newCarbs), fatPct: Math.max(0, remaining - newCarbs) });
    } else if (type === 'carbs') {
      const c = Math.min(value, 100 - p.proteinPct);
      set({ macroPreset: 'custom', carbsPct: c, fatPct: Math.max(0, 100 - p.proteinPct - c) });
    } else {
      const f = Math.min(value, 100 - p.proteinPct);
      set({ macroPreset: 'custom', fatPct: f, carbsPct: Math.max(0, 100 - p.proteinPct - f) });
    }
  };

  const goals = Array.from(new Set([60, 55, p.goalWeight])).sort((a, c) => c - a);
  const now = weeklyLoss(p, today);
  const afterStart = p.exerciseStart ? weeklyLoss(p, p.exerciseStart > today ? p.exerciseStart : today) : now;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<Activity className="w-4 h-4" />} label="Resting BMR" value={`${b.toLocaleString()} kcal`} sub="Burned at complete rest" />
        <Metric icon={<Flame className="w-4 h-4" />} label="Maintenance (TDEE)" value={`${t.toLocaleString()} kcal`} sub={exercising ? `Light exercise (${LIGHT_EXERCISE_FACTOR}x)` : `Sedentary recovery (${SEDENTARY_FACTOR}x)`} />
        <Metric icon={<Scale className="w-4 h-4" />} label="Daily target" value={`${kcal.toLocaleString()} kcal`} sub={`${Math.max(0, t - kcal)} kcal/day deficit`} accent />
        <Metric icon={<TrendingDown className="w-4 h-4" />} label="Pace now" value={`~${now.toFixed(2)} kg/wk`} sub={`~${afterStart.toFixed(2)} kg/wk once exercising`} />
      </section>

      <Card>
        <H2 icon={<Scale className="w-5 h-5 text-emerald-600" />}>1. Profile &amp; goal</H2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Field label="Sex (for BMR formula)">
            <select className={inputCls} value={p.sex} onChange={(e) => set({ sex: e.target.value as Profile['sex'] })}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Age (yrs)">
            <NumInput value={p.age} onCommit={(n) => set({ age: n })} min={18} max={100} />
          </Field>
          <Field label="Weight (kg)">
            <NumInput value={p.weight} onCommit={(n) => set({ weight: n })} min={30} max={300} step="0.1" />
          </Field>
          <Field label="Height (cm)">
            <NumInput value={p.height} onCommit={(n) => set({ height: n })} min={120} max={230} />
          </Field>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Goal weight</div>
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          {[60, 55].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => set({ goalWeight: g })}
              className={`py-2.5 px-4 rounded-xl text-sm font-semibold border ${p.goalWeight === g ? 'bg-emerald-50 border-emerald-600 text-emerald-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {g} kg <span className="text-xs font-normal text-slate-500">(-{Math.max(0, +(p.weight - g).toFixed(1))} kg)</span>
            </button>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">or custom</span>
            <div className="w-24">
              <NumInput value={p.goalWeight} onCommit={(n) => set({ goalWeight: n })} min={35} max={200} step="0.5" ariaLabel="Custom goal weight" />
            </div>
            <span className="text-xs text-slate-500">kg</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Surgery date (for recovery stage)">
            <input type="date" className={inputCls} value={p.surgeryDate} onChange={(e) => set({ surgeryDate: e.target.value })} />
          </Field>
          <Field label="Start of regular exercise" hint={`Activity factor rises from ${SEDENTARY_FACTOR}x to ${LIGHT_EXERCISE_FACTOR}x (2 x 1 hr/week) on this date.`}>
            <input type="date" className={inputCls} value={p.exerciseStart} onChange={(e) => set({ exerciseStart: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card>
        <H2 icon={<Flame className="w-5 h-5 text-amber-500" />}>2. Daily calorie target</H2>
        <div className="space-y-3">
          <ModeCard active={p.calorieMode === 'strict1200'} onClick={() => set({ calorieMode: 'strict1200' })} title="1,200 kcal (your goal)" badge={`-${Math.max(0, t - 1200)} kcal/day`} tone="amber">
            Fastest deficit (~{(Math.max(0, t - 1200) * 7 / 7700).toFixed(2)} kg/wk). Every meal needs to be protein- and iron-dense.
          </ModeCard>
          <ModeCard active={p.calorieMode === 'gentle1450'} onClick={() => set({ calorieMode: 'gentle1450' })} title="1,450 kcal (gentler)" badge={`-${Math.max(0, t - 1450)} kcal/day`} tone="emerald">
            Closer to your BMR; easier on energy and workout recovery (~{(Math.max(0, t - 1450) * 7 / 7700).toFixed(2)} kg/wk).
          </ModeCard>
          <div
            className={`p-3.5 rounded-xl border ${p.calorieMode === 'custom' ? 'bg-teal-50/60 border-teal-600' : 'bg-white border-slate-200'}`}
            onClick={() => p.calorieMode !== 'custom' && set({ calorieMode: 'custom' })}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">Custom</span>
              <span className="text-sm font-bold text-teal-700">{p.customCalories} kcal</span>
            </div>
            <input
              type="range"
              min={1200}
              max={2400}
              step={25}
              value={p.customCalories}
              onChange={(e) => set({ calorieMode: 'custom', customCalories: Number(e.target.value) })}
              className="w-full accent-teal-600"
              aria-label="Custom calories"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>1,200</span>
              <span>BMR {b}</span>
              <span>2,400</span>
            </div>
          </div>
        </div>
        {kcal < b && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">
                {kcal} kcal is below your resting BMR ({b} kcal)
              </strong>
              After an open myomectomy the uterine muscle and abdominal fascia are still remodelling, so every calorie has to count. Aim for 105-125 g of protein a day with iron-rich foods to protect your blood count, hair and energy, especially once you start 1-hour workouts. Please confirm this target with your surgeon or a registered dietitian.
            </div>
          </div>
        )}
      </Card>

      <Card>
        <H2 icon={<Sliders className="w-5 h-5 text-teal-600" />}>3. Macro split</H2>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presets.map((pr) => (
            <button
              key={pr.id}
              type="button"
              onClick={() => set({ macroPreset: pr.id, proteinPct: pr.split[0], carbsPct: pr.split[1], fatPct: pr.split[2] })}
              className={`py-2 px-1.5 rounded-lg text-xs font-semibold border ${p.macroPreset === pr.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
            >
              {pr.label}
              <div className="text-[10px] opacity-85 font-normal">{`${pr.split[0]}P / ${pr.split[1]}C / ${pr.split[2]}F`}</div>
            </button>
          ))}
        </div>
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
          <MacroSlider label={`Protein (${p.proteinPct}%)`} grams={target.p} min={20} max={50} value={p.proteinPct} onChange={(v) => changeMacro('protein', v)} cls="accent-emerald-600 text-emerald-800" />
          <MacroSlider label={`Carbohydrates (${p.carbsPct}%)`} grams={target.c} min={15} max={60} value={p.carbsPct} onChange={(v) => changeMacro('carbs', v)} cls="accent-teal-600 text-teal-800" />
          <MacroSlider label={`Fat (${p.fatPct}%)`} grams={target.f} min={15} max={50} value={p.fatPct} onChange={(v) => changeMacro('fat', v)} cls="accent-amber-500 text-amber-800" />
        </div>
      </Card>

      <Card>
        <H2 icon={<Award className="w-5 h-5 text-emerald-600" />}>4. Goal timeline</H2>
        <p className="text-xs text-slate-500 mb-4">
          Day-by-day estimate at {kcal.toLocaleString()} kcal. BMR is recalculated as weight drops, and activity rises on {p.exerciseStart ? fmtDate(p.exerciseStart) : 'your exercise start date'}. Real progress plateaus, so treat dates as a best case.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pr = project(p, g, today);
            const active = p.goalWeight === g;
            return (
              <button
                type="button"
                key={g}
                onClick={() => set({ goalWeight: g })}
                className={`text-left p-4 rounded-2xl border-2 ${active ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                data-testid={`goal-${g}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900">{g} kg goal</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">-{pr.kgToLose.toFixed(1)} kg</span>
                </div>
                {pr.reachable && pr.date ? (
                  <>
                    <div className="text-2xl font-extrabold text-emerald-700">{pr.days === 0 ? 'Reached' : fmtDate(pr.date)}</div>
                    <p className="text-xs text-slate-600 mt-1">
                      About <strong>{pr.weeks} weeks</strong> ({pr.months} months)
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-rose-700 font-medium">Not reachable at {kcal} kcal. Lower the target or add activity.</p>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 flex items-start gap-2.5">
          <Dumbbell className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            <strong>Starting your two weekly 1-hour sessions:</strong> begin with brisk incline walking, stationary cycling and gentle pelvic-floor / deep-core work before anything that strains the abdomen (heavy sit-ups, deadlifts). Clear the plan with your surgeon first. A 20-25 g protein snack after a session helps recovery and keeps hunger steady.
          </div>
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value, sub, accent }: { icon: ReactNode; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ${accent ? 'border-2 border-emerald-500/80' : 'border border-slate-200/80'}`}>
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`text-xl font-bold mt-2 ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</div>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function ModeCard({ active, onClick, title, badge, tone, children }: { active: boolean; onClick: () => void; title: string; badge: string; tone: 'amber' | 'emerald'; children: ReactNode }) {
  const on = tone === 'amber' ? 'bg-amber-50/60 border-amber-500' : 'bg-emerald-50/70 border-emerald-600';
  const pill = tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
  return (
    <button type="button" onClick={onClick} className={`w-full text-left p-3.5 rounded-xl border ${active ? on : 'bg-white border-slate-200 hover:bg-slate-50'}`} aria-pressed={active}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm text-slate-900">{title}</span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${pill}`}>{badge}</span>
      </div>
      <p className="text-xs text-slate-600 mt-1">{children}</p>
    </button>
  );
}

function MacroSlider({ label, grams, min, max, value, onChange, cls }: { label: string; grams: number; min: number; max: number; value: number; onChange: (v: number) => void; cls: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-1">
        <span className={cls.split(' ')[1]}>{label}</span>
        <span className="font-bold">{grams} g / day</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`w-full ${cls.split(' ')[0]}`} aria-label={label} />
    </div>
  );
}

