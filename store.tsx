import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BUILTIN_FOODS } from './data/foods';
import { recipeToFood } from './lib/calc';
import {
  AuthError,
  consumeAuthRedirect,
  getSession,
  signIn as sbSignIn,
  signOut as sbSignOut,
  signUp as sbSignUp,
  syncConfigured,
  syncOnce,
} from './lib/supabase';
import type { Session } from './lib/supabase';
import {
  DEFAULT_PROFILE,
  defaultState,
  entriesFor,
  entryFromFood,
  live,
  loadState,
  mergeStates,
  normalizeState,
  saveState,
  uid,
} from './lib/state';
import type { AppState, Food, MealSlot, Profile, Recipe } from './lib/types';

export type SyncStatus = 'unconfigured' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error';

interface Actions {
  setProfile: (patch: Partial<Profile>) => void;
  addEntry: (food: Food, date: string, meal: MealSlot, qty: number) => void;
  setEntryQty: (id: string, qty: number) => void;
  removeEntry: (id: string) => void;
  clearMeal: (date: string, meal?: MealSlot) => void;
  loadSample: (kind: '1200' | '1450', date: string) => void;
  copyDay: (from: string, to: string) => number;
  setWater: (date: string, n: number) => void;
  addWeight: (date: string, kg: number) => void;
  removeWeight: (date: string) => void;
  saveCustomFood: (food: Food) => void;
  deleteCustomFood: (id: string) => void;
  saveRecipe: (r: Recipe) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (foodId: string) => void;
  importBackup: (raw: unknown) => void;
  resetAll: () => void;
}

interface Ctx {
  state: AppState;
  foods: Food[];
  favorites: Set<string>;
  actions: Actions;
  toast: (msg: string) => void;
  toastMsg: string | null;
  sync: {
    configured: boolean;
    status: SyncStatus;
    email: string | null;
    lastSync: number | null;
    error: string | null;
    recovery: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<'signed-in' | 'confirm'>;
    signOut: () => Promise<void>;
    syncNow: () => Promise<void>;
    clearRecovery: () => void;
  };
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}

const SAMPLES: Record<'1200' | '1450', [MealSlot, string, number][]> = {
  '1200': [
    ['Breakfast', 'moi-moi-lg', 1],
    ['Breakfast', 'egg-boiled-2', 1],
    ['Lunch', 'chicken-breast', 1],
    ['Lunch', 'efo-riro-light', 1],
    ['Lunch', 'orange', 1],
    ['Dinner', 'croaker-grilled', 1],
    ['Dinner', 'veg-broccoli-peppers', 1],
    ['Snacks', 'pawpaw', 1],
  ],
  '1450': [
    ['Breakfast', 'oats-bowl', 1],
    ['Breakfast', 'yogurt-greek', 1],
    ['Breakfast', 'egg-boiled-2', 0.5],
    ['Lunch', 'chicken-breast', 1],
    ['Lunch', 'plantain-boiled', 1],
    ['Lunch', 'efo-riro-light', 1],
    ['Dinner', 'croaker-grilled', 1],
    ['Dinner', 'okro-light', 1],
    ['Snacks', 'garden-egg', 1],
    ['Snacks', 'protein-shake', 1],
  ],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const [rev, setRev] = useState(0);
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2200);
  }, []);

  // Every user edit goes through here: apply the change and flag that a sync is due.
  const mutate = useCallback((fn: (s: AppState, now: number) => AppState) => {
    setState((s) => fn(s, Date.now()));
    setRev((r) => r + 1);
  }, []);

  // ---------- persistence ----------
  useEffect(() => {
    const t = window.setTimeout(() => saveState(state), 300);
    return () => window.clearTimeout(t);
  }, [state]);
  useEffect(() => {
    const flush = () => saveState(stateRef.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  // ---------- sync ----------
  const syncing = useRef(false);
  const again = useRef(false);

  const runSync = useCallback(async () => {
    if (!syncConfigured || !getSession()) return;
    if (syncing.current) {
      again.current = true;
      return;
    }
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    syncing.current = true;
    setStatus('syncing');
    try {
      const merged = await syncOnce(stateRef.current);
      // Merge into the *current* state so edits made while the request was in flight survive.
      setState((cur) => mergeStates(cur, merged));
      setLastSync(Date.now());
      setError(null);
      setStatus('idle');
    } catch (e) {
      if (e instanceof AuthError) {
        setSession(getSession());
        setError(e.message);
        setStatus(getSession() ? 'error' : 'signed-out');
      } else {
        setError(e instanceof Error ? e.message : 'Sync failed');
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    } finally {
      syncing.current = false;
      if (again.current) {
        again.current = false;
        void runSync();
      }
    }
  }, []);

  // Handle e-mail confirmation / password-recovery links (on load, and if the hash changes in an open tab).
  useEffect(() => {
    const handle = () => {
      const r = consumeAuthRedirect();
      if (r.session) {
        setSession(r.session);
        if (r.type === 'recovery') setRecovery(true);
      }
    };
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  useEffect(() => {
    if (!syncConfigured) setStatus('unconfigured');
    else if (!session) setStatus('signed-out');
    else void runSync();
  }, [session, runSync]);

  // Push soon after the user edits something.
  useEffect(() => {
    if (!session || rev === 0) return;
    const t = window.setTimeout(() => void runSync(), 1500);
    return () => window.clearTimeout(t);
  }, [rev, session, runSync]);

  // Pull when the app comes back to the foreground / network returns.
  useEffect(() => {
    if (!session) return;
    const on = () => {
      if (document.visibilityState === 'visible') void runSync();
    };
    const online = () => void runSync();
    document.addEventListener('visibilitychange', on);
    window.addEventListener('online', online);
    window.addEventListener('focus', on);
    const iv = window.setInterval(on, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', on);
      window.removeEventListener('online', online);
      window.removeEventListener('focus', on);
      window.clearInterval(iv);
    };
  }, [session, runSync]);

  // ---------- derived ----------
  const foods = useMemo<Food[]>(
    () => [
      ...live(state.recipes).map(recipeToFood),
      ...live(state.customFoods).map((f) => ({ ...f, cat: 'Custom' as const })),
      ...BUILTIN_FOODS,
    ],
    [state.recipes, state.customFoods],
  );
  const favorites = useMemo(() => new Set(live(state.favorites).filter((f) => f.on).map((f) => f.id)), [state.favorites]);

  // ---------- actions ----------
  const actions = useMemo<Actions>(() => {
    const byId = (id: string, fs: Food[]) => fs.find((f) => f.id === id);
    return {
      setProfile: (patch) =>
        mutate((s, now) => ({ ...s, profile: { value: { ...s.profile.value, ...patch }, updatedAt: now } })),

      addEntry: (food, date, meal, qty) =>
        mutate((s, now) => {
          const e = entryFromFood(food, date, meal, qty);
          return { ...s, entries: { ...s.entries, [e.id]: { ...e, updatedAt: now } } };
        }),

      setEntryQty: (id, qty) =>
        mutate((s, now) => {
          const e = s.entries[id];
          if (!e) return s;
          return { ...s, entries: { ...s.entries, [id]: { ...e, qty, updatedAt: now } } };
        }),

      removeEntry: (id) =>
        mutate((s, now) => {
          const e = s.entries[id];
          if (!e) return s;
          return { ...s, entries: { ...s.entries, [id]: { ...e, deleted: true, updatedAt: now } } };
        }),

      clearMeal: (date, meal) =>
        mutate((s, now) => {
          const next = { ...s.entries };
          for (const e of entriesFor(s, date)) {
            if (!meal || e.meal === meal) next[e.id] = { ...e, deleted: true, updatedAt: now };
          }
          return { ...s, entries: next };
        }),

      loadSample: (kind, date) =>
        mutate((s, now) => {
          const next = { ...s.entries };
          for (const e of entriesFor(s, date)) next[e.id] = { ...e, deleted: true, updatedAt: now };
          for (const [meal, foodId, qty] of SAMPLES[kind]) {
            const food = byId(foodId, BUILTIN_FOODS);
            if (!food) continue;
            const e = entryFromFood(food, date, meal, qty);
            next[e.id] = { ...e, updatedAt: now };
          }
          return {
            ...s,
            entries: next,
            profile: {
              value: {
                ...s.profile.value,
                calorieMode: kind === '1200' ? 'strict1200' : 'gentle1450',
                macroPreset: 'recovery',
                proteinPct: 35,
                carbsPct: 35,
                fatPct: 30,
              },
              updatedAt: now,
            },
          };
        }),

      copyDay: (from, to) => {
        const n = entriesFor(stateRef.current, from).length;
        if (n === 0) return 0;
        mutate((s, now) => {
          const next = { ...s.entries };
          for (const e of entriesFor(s, from)) {
            const c = { ...e, id: uid('e'), date: to, updatedAt: now };
            next[c.id] = c;
          }
          return { ...s, entries: next };
        });
        return n;
      },

      setWater: (date, n) =>
        mutate((s, now) => ({
          ...s,
          days: { ...s.days, [date]: { date, water: Math.max(0, Math.min(30, n)), updatedAt: now } },
        })),

      addWeight: (date, kg) =>
        mutate((s, now) => {
          const weights = { ...s.weights, [date]: { date, kg, updatedAt: now } };
          // Current weight follows the most recent weigh-in.
          const latest = Object.values(weights)
            .filter((w) => !w.deleted)
            .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
          const profile =
            latest && latest.date === date
              ? { value: { ...s.profile.value, weight: kg }, updatedAt: now }
              : s.profile;
          return { ...s, weights, profile };
        }),

      removeWeight: (date) =>
        mutate((s, now) => {
          const w = s.weights[date];
          if (!w) return s;
          return { ...s, weights: { ...s.weights, [date]: { ...w, deleted: true, updatedAt: now } } };
        }),

      saveCustomFood: (food) =>
        mutate((s, now) => ({ ...s, customFoods: { ...s.customFoods, [food.id]: { ...food, cat: 'Custom', updatedAt: now } } })),

      deleteCustomFood: (id) =>
        mutate((s, now) => {
          const f = s.customFoods[id];
          if (!f) return s;
          return { ...s, customFoods: { ...s.customFoods, [id]: { ...f, deleted: true, updatedAt: now } } };
        }),

      saveRecipe: (r) =>
        mutate((s, now) => ({ ...s, recipes: { ...s.recipes, [r.id]: { ...r, updatedAt: now } } })),

      deleteRecipe: (id) =>
        mutate((s, now) => {
          const r = s.recipes[id];
          if (!r) return s;
          return { ...s, recipes: { ...s.recipes, [id]: { ...r, deleted: true, updatedAt: now } } };
        }),

      toggleFavorite: (foodId) =>
        mutate((s, now) => {
          const cur = s.favorites[foodId];
          const on = !(cur && !cur.deleted && cur.on);
          return { ...s, favorites: { ...s.favorites, [foodId]: { id: foodId, on, updatedAt: now } } };
        }),

      importBackup: (raw) => {
        const incoming = normalizeState(raw);
        mutate((s) => mergeStates(s, incoming));
      },

      resetAll: () =>
        mutate((s, now) => {
          const wipe = <T extends { updatedAt: number }>(c: Record<string, T>) =>
            Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { ...v, deleted: true, updatedAt: now }]));
          const fresh = defaultState();
          return {
            v: 1,
            profile: { value: DEFAULT_PROFILE, updatedAt: now },
            entries: wipe(s.entries) as AppState['entries'],
            customFoods: wipe(s.customFoods) as AppState['customFoods'],
            weights: wipe(s.weights) as AppState['weights'],
            days: wipe(s.days) as AppState['days'],
            favorites: wipe(s.favorites) as AppState['favorites'],
            recipes: Object.fromEntries(
              Object.entries(fresh.recipes).map(([k, v]) => [k, { ...v, updatedAt: now }]),
            ) as AppState['recipes'],
          };
        }),
    };
  }, [mutate]);

  const syncApi = useMemo<Ctx['sync']>(
    () => ({
      configured: syncConfigured,
      status,
      email: session?.user.email ?? null,
      lastSync,
      error,
      recovery,
      signIn: async (email, password) => {
        const s = await sbSignIn(email, password);
        setSession(s);
        setError(null);
      },
      signUp: async (email, password) => {
        const s = await sbSignUp(email, password);
        if (s) {
          setSession(s);
          return 'signed-in';
        }
        return 'confirm';
      },
      signOut: async () => {
        await sbSignOut();
        setSession(null);
        setStatus('signed-out');
      },
      syncNow: runSync,
      clearRecovery: () => setRecovery(false),
    }),
    [status, session, lastSync, error, recovery, runSync],
  );

  const value = useMemo<Ctx>(
    () => ({ state, foods, favorites, actions, toast, toastMsg, sync: syncApi }),
    [state, foods, favorites, actions, toast, toastMsg, syncApi],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

