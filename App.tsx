import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { APP_NAME, APP_TAGLINE } from './config';
import { BookOpen, Calendar, Cloud, CloudOff, Heart, Home, LineChart, RefreshCw, Settings as SettingsIcon, Target } from './icons';
import { daysBetween, todayISO } from './lib/calc';
import { AppProvider, useApp } from './store';
import { Foods } from './views/Foods';
import { Plan } from './views/Plan';
import { Progress } from './views/Progress';
import { Settings } from './views/Settings';
import { Today } from './views/Today';

type Tab = 'today' | 'foods' | 'plan' | 'progress' | 'settings';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'today', label: 'Today', icon: <Home className="w-5 h-5" /> },
  { id: 'foods', label: 'Foods', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'plan', label: 'Plan', icon: <Target className="w-5 h-5" /> },
  { id: 'progress', label: 'Progress', icon: <LineChart className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
];

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { state, sync, toastMsg } = useApp();
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState(todayISO());
  const lastToday = useRef(todayISO());
  const p = state.profile.value;

  // Keep "today" correct if the app stays open past midnight.
  useEffect(() => {
    const check = () => {
      const t = todayISO();
      if (t !== lastToday.current) {
        setDate((d) => (d === lastToday.current ? t : d));
        lastToday.current = t;
      }
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  // A password-recovery link should land on the form that handles it.
  useEffect(() => {
    if (sync.recovery) setTab('settings');
  }, [sync.recovery]);

  const weeksPost = p.surgeryDate ? daysBetween(p.surgeryDate, todayISO()) / 7 : null;

  const syncPill = (() => {
    if (!sync.configured) return null;
    const signedIn = !!sync.email;
    const label = !signedIn ? 'Sign in to sync' : sync.status === 'syncing' ? 'Syncing…' : sync.status === 'offline' ? 'Offline' : sync.status === 'error' ? 'Sync error' : 'Synced';
    const Icon = !signedIn || sync.status === 'offline' ? CloudOff : sync.status === 'syncing' ? RefreshCw : Cloud;
    return (
      <button
        type="button"
        onClick={() => setTab('settings')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-medium text-emerald-50 hover:bg-white/20"
        data-testid="sync-pill"
      >
        <Icon className={`w-3.5 h-3.5 ${sync.status === 'syncing' ? 'animate-spin' : ''}`} />
        {label}
      </button>
    );
  })();

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800 pb-28 md:pb-12">
      <header className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white shadow-lg pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-100 mb-1">
                <Heart className="w-3.5 h-3.5 text-amber-300" fill="currentColor" />
                <span className="truncate">{APP_TAGLINE}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{APP_NAME}</h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5">
                {p.age} yrs · {p.height} cm · {p.weight} kg → goal {p.goalWeight} kg
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {syncPill}
              {weeksPost !== null && weeksPost >= 0 && (
                <div className="hidden sm:flex bg-white/10 border border-white/15 rounded-xl px-3 py-2 items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-amber-300" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold">Recovery stage</div>
                    <div className="text-sm font-bold">~{weeksPost.toFixed(1)} weeks post-op</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {weeksPost !== null && weeksPost >= 0 && (
            <div className="sm:hidden mt-2 text-xs text-emerald-100">~{weeksPost.toFixed(1)} weeks post-op</div>
          )}
          <nav className="hidden md:flex gap-1 mt-4" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${tab === t.id ? 'bg-white text-emerald-800' : 'text-emerald-100 hover:bg-white/10'}`}
                aria-current={tab === t.id ? 'page' : undefined}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-5">
        {tab === 'today' && <Today date={date} setDate={setDate} />}
        {tab === 'foods' && <Foods />}
        {tab === 'plan' && <Plan />}
        {tab === 'progress' && <Progress />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${tab === t.id ? 'text-emerald-700' : 'text-slate-500'}`}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {toastMsg && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[60] bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-[90vw]" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
