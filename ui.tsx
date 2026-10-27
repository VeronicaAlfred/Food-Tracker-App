import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from '../icons';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 ${className}`}>{children}</section>;
}

export function H2({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
        {icon}
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Bar({ value, className = 'bg-emerald-600', track = 'bg-slate-200', h = 'h-2.5' }: { value: number; className?: string; track?: string; h?: string }) {
  return (
    <div className={`w-full ${h} ${track} rounded-full overflow-hidden`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-300 ${className}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        className={`relative bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'} max-h-[92dvh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition disabled:opacity-50';
export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold transition';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

/**
 * Number input that stays editable while typing (empty / partial values are allowed) and commits
 * every valid in-range number immediately. Out-of-range text is reverted on blur.
 */
export function NumInput({
  value,
  onCommit,
  min,
  max,
  step,
  className = inputCls,
  ariaLabel,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '');
  useEffect(() => {
    setText((t) => (parseFloat(t) === value ? t : String(value)));
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      className={className}
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = raw.trim() === '' ? NaN : Number(raw);
        if (!Number.isFinite(n)) return;
        if (min !== undefined && n < min) return;
        if (max !== undefined && n > max) return;
        if (n !== value) onCommit(n);
      }}
      onBlur={() => setText(String(value))}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}
