import { useRef, useState } from 'react';
import { Card, Field, H2, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { APP_NAME } from '../config';
import { SOURCE_LABELS } from '../data/foods';
import { Cloud, CloudOff, Download, Info, LogOut, RefreshCw, Upload } from '../icons';
import { resetPassword, updatePassword } from '../lib/supabase';
import { todayISO } from '../lib/calc';
import { useApp } from '../store';
import type { SyncStatus } from '../store';

const STATUS_TEXT: Record<SyncStatus, string> = {
  unconfigured: 'Sync is not set up in this build',
  'signed-out': 'Not signed in. Your data is saved on this device only',
  idle: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline. Changes will sync when you reconnect',
  error: 'Last sync failed',
};

export function Settings() {
  const { state, actions, sync, toast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <Account />

      <Card>
        <H2 icon={<Download className="w-5 h-5 text-emerald-600" />}>Backup</H2>
        <p className="text-sm text-slate-600 mb-3">
          Download all your data as a file, or import a backup. Importing merges into what you have; newer edits win.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `recovery-plate-backup-${todayISO()}.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }}
          >
            <Download className="w-4 h-4" /> Export backup
          </button>
          <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                actions.importBackup(JSON.parse(await f.text()));
                toast('Backup imported');
              } catch {
                toast('That file is not a valid backup');
              }
            }}
          />
        </div>
      </Card>

      <Card>
        <H2 icon={<Info className="w-5 h-5 text-slate-500" />}>About the data</H2>
        <p className="text-sm text-slate-600 mb-3">
          Calories come from published Nigerian food tables and USDA data, scaled to common Nigerian portions. Soups and stews swing widely with palm oil, so use Recipes for anything you cook yourself and weigh ingredients raw.
        </p>
        <ul className="text-xs text-slate-600 space-y-1 mb-3">
          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
            <li key={k}>
              <strong className="font-mono">{k}</strong> · {v}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
          {APP_NAME} is a planning aid, not medical advice. Calorie targets below your resting energy needs, especially while recovering from surgery, should be agreed with your surgeon or a registered dietitian.
        </p>
      </Card>

      <Card>
        <H2>Danger zone</H2>
        <button
          type="button"
          className={btnDanger}
          onClick={() => {
            if (confirm('Erase all logs, weights, foods and recipes and reset your profile? If sync is on, this also clears your cloud copy.')) {
              actions.resetAll();
              toast('Everything was reset');
            }
          }}
        >
          Reset all data
        </button>
        {sync.status === 'syncing' && <span className="sr-only">Syncing</span>}
      </Card>
    </div>
  );
}

function Account() {
  const { sync, toast } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPw, setNewPw] = useState('');

  if (!sync.configured) {
    return (
      <Card>
        <H2 icon={<CloudOff className="w-5 h-5 text-slate-400" />}>Cloud sync</H2>
        <p className="text-sm text-slate-600">
          This build was published without Supabase credentials, so your data stays on this device. See the README to switch sync on (set <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> and redeploy).
        </p>
      </Card>
    );
  }

  if (sync.recovery) {
    return (
      <Card>
        <H2 icon={<Cloud className="w-5 h-5 text-emerald-600" />}>Set a new password</H2>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await updatePassword(newPw);
              sync.clearRecovery();
              toast('Password updated');
            } catch (err) {
              setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not update password' });
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="New password (8+ characters)">
            <input className={inputCls} type="password" minLength={8} required value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <button className={btnPrimary} disabled={busy}>Save password</button>
          {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
        </form>
      </Card>
    );
  }

  if (sync.email) {
    return (
      <Card>
        <H2 icon={<Cloud className="w-5 h-5 text-emerald-600" />}>Cloud sync</H2>
        <div className="text-sm text-slate-700">
          Signed in as <strong>{sync.email}</strong>
        </div>
        <div className={`text-sm mt-1 ${sync.status === 'error' ? 'text-rose-700' : 'text-slate-600'}`} data-testid="sync-status">
          {STATUS_TEXT[sync.status]}
          {sync.lastSync && sync.status === 'idle' ? ` · ${new Date(sync.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
        </div>
        {sync.error && sync.status === 'error' && <p className="text-xs text-rose-700 mt-1 break-words">{sync.error}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className={btnPrimary} onClick={() => void sync.syncNow()} disabled={sync.status === 'syncing'}>
            <RefreshCw className="w-4 h-4" /> Sync now
          </button>
          <button type="button" className={btnGhost} onClick={() => void sync.signOut()}>
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <H2 icon={<Cloud className="w-5 h-5 text-emerald-600" />}>Sync across your devices</H2>
      <p className="text-sm text-slate-600 mb-3">
        Sign in to keep your logs, weights, recipes and plan in step between your phone and laptop. The app works offline and syncs when you are back online.
      </p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(null);
          try {
            if (mode === 'forgot') {
              await resetPassword(email);
              setMsg({ ok: true, text: 'If that address has an account, a reset link is on its way.' });
            } else if (mode === 'signup') {
              const r = await sync.signUp(email, password);
              setMsg(r === 'confirm' ? { ok: true, text: 'Check your inbox and confirm your email, then sign in.' } : { ok: true, text: 'Account created and signed in.' });
            } else {
              await sync.signIn(email, password);
            }
          } catch (err) {
            setMsg({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong' });
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Email">
          <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        {mode !== 'forgot' && (
          <Field label="Password">
            <input
              className={inputCls}
              type="password"
              required
              minLength={mode === 'signup' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </Field>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button className={btnPrimary} disabled={busy}>
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
          {mode !== 'signin' && (
            <button type="button" className="text-sm text-emerald-700 font-semibold" onClick={() => { setMode('signin'); setMsg(null); }}>
              Back to sign in
            </button>
          )}
          {mode === 'signin' && (
            <>
              <button type="button" className="text-sm text-emerald-700 font-semibold" onClick={() => { setMode('signup'); setMsg(null); }}>
                Create account
              </button>
              <button type="button" className="text-sm text-slate-500" onClick={() => { setMode('forgot'); setMsg(null); }}>
                Forgot password?
              </button>
            </>
          )}
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`} role="status">{msg.text}</p>}
      </form>
    </Card>
  );
}
