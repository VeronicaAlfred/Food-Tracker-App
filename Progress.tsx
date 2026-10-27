import { useState } from 'react';
import { Card, H2, NumInput, btnPrimary, inputCls } from '../components/ui';
import { LineChart, Scale, Trash2 } from '../icons';
import { addDays, fmtDate, targetCalories, todayISO, totalsOf } from '../lib/calc';
import { entriesFor, live } from '../lib/state';
import { useApp } from '../store';

export function Progress() {
  const { state, actions, toast } = useApp();
  const p = state.profile.value;
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState(p.weight);

  const weights = live(state.weights).sort((a, b) => (a.date < b.date ? -1 : 1));
  const first = weights[0];
  const last = weights[weights.length - 1];
  const target = targetCalories(p);

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const kcals = days.map((d) => totalsOf(entriesFor(state, d)).kcal);
  const maxK = Math.max(target, ...kcals, 1);
  const logged = kcals.filter((k) => k > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0;

  return (
    <div className="space-y-5">
      <Card>
        <H2 icon={<Scale className="w-5 h-5 text-emerald-600" />}>Weight log</H2>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Date</span>
            <input type="date" className={inputCls} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block w-28">
            <span className="block text-xs font-medium text-slate-600 mb-1">Weight (kg)</span>
            <NumInput value={kg} onCommit={setKg} min={30} max={300} step="0.1" ariaLabel="Weight in kilograms" />
          </label>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              actions.addWeight(date || today, kg);
              toast(`Logged ${kg} kg`);
            }}
          >
            Save weigh-in
          </button>
        </div>

        {weights.length >= 2 ? (
          <WeightChart points={weights.map((w) => ({ date: w.date, kg: w.kg }))} goal={p.goalWeight} />
        ) : (
          <p className="text-sm text-slate-400 italic py-3">Log at least two weigh-ins to see your trend.</p>
        )}

        {first && last && (
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Stat label="First" value={`${first.kg} kg`} />
            <Stat label="Latest" value={`${last.kg} kg`} />
            <Stat label="Change" value={`${last.kg - first.kg > 0 ? '+' : ''}${(last.kg - first.kg).toFixed(1)} kg`} />
          </div>
        )}

        {weights.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            {[...weights].reverse().map((w) => (
              <li key={w.date} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-600">{fmtDate(w.date)}</span>
                <span className="flex items-center gap-2">
                  <strong>{w.kg} kg</strong>
                  <button type="button" className="p-1.5 text-slate-400 hover:text-rose-600" onClick={() => actions.removeWeight(w.date)} aria-label={`Delete weigh-in ${w.date}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <H2 icon={<LineChart className="w-5 h-5 text-teal-600" />} right={<span className="text-xs text-slate-500">Avg {avg ? `${avg} kcal` : 'n/a'} on logged days</span>}>
          Last 7 days
        </H2>
        <div className="relative h-32 flex items-end gap-2 border-b border-slate-200">
          <div className="absolute left-0 right-0 border-t border-dashed border-emerald-500 pointer-events-none" style={{ bottom: `${(target / maxK) * 100}%` }} />
          {days.map((d, i) => {
            const k = kcals[i];
            return (
              <div key={d} className="flex-1 h-full flex items-end">
                <div
                  className={`w-full rounded-t-md ${k === 0 ? 'bg-slate-100' : k > target ? 'bg-rose-400' : 'bg-emerald-500'}`}
                  style={{ height: `${k === 0 ? 2 : Math.max(4, (k / maxK) * 100)}%` }}
                  title={`${fmtDate(d)}: ${k} kcal`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-1.5">
          {days.map((d, i) => (
            <div key={d} className="flex-1 text-center">
              <div className="text-[10px] font-semibold text-slate-600">{kcals[i] || '-'}</div>
              <div className="text-[10px] text-slate-500">{fmtDate(d, { weekday: 'short' })}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Dashed line = your {target.toLocaleString()} kcal target.</p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="font-bold text-slate-900">{value}</div>
    </div>
  );
}

function WeightChart({ points, goal }: { points: { date: string; kg: number }[]; goal: number }) {
  const W = 600;
  const H = 200;
  const pad = { l: 38, r: 12, t: 12, b: 24 };
  const ws = points.map((p) => p.kg);
  const lo = Math.floor(Math.min(...ws, goal) - 1);
  const hi = Math.ceil(Math.max(...ws, goal) + 1);
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime();
  const x = (d: string) => pad.l + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Weight over time">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
            {t}
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="#10b981" strokeDasharray="5 4" />
      <text x={W - pad.r} y={y(goal) - 4} textAnchor="end" fontSize="11" fill="#059669">
        goal {goal} kg
      </text>
      <path d={path} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r="3.5" fill="#0f766e" />
      ))}
      <text x={pad.l} y={H - 6} fontSize="11" fill="#64748b">
        {fmtDate(points[0].date, { day: 'numeric', month: 'short' })}
      </text>
      <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize="11" fill="#64748b">
        {fmtDate(points[points.length - 1].date, { day: 'numeric', month: 'short' })}
      </text>
    </svg>
  );
}
