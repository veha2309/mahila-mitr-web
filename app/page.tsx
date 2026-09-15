'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { browserClient } from '@/lib/supabase';

type Overview = {
  counts: { pairs: number; cycles: number; notes: number; ratings: number };
  activities: { kind: string; date: string }[];
  mailConfigured: boolean;
  checkedAt: string;
};
type View = 'overview' | 'email' | 'access';

const stats = [
  { key: 'pairs', label: 'Connected pairs', icon: '↗', tone: 'rose' },
  { key: 'cycles', label: 'Cycle entries', icon: '◷', tone: 'lilac' },
  { key: 'notes', label: 'Notes sent', icon: '✉', tone: 'peach' },
  { key: 'ratings', label: 'Date ratings', icon: '★', tone: 'sage' },
] as const;

export default function AdminPage() {
  const client = useMemo<SupabaseClient | null>(() => {
    try { return browserClient(); } catch { return null; }
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<View>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (nextSession: Session) => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/overview', {
        headers: { Authorization: `Bearer ${nextSession.access_token}` }, cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load dashboard');
      setOverview(body as Overview);
    } catch (reason) {
      setOverview(null); setError(reason instanceof Error ? reason.message : 'Could not load dashboard');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) load(data.session);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) load(nextSession); else setOverview(null);
    });
    return () => data.subscription.unsubscribe();
  }, [client, load]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setLoading(true); setError('');
    const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) { setLoading(false); setError(authError.message); return; }
    setPassword('');
    if (data.session) { setSession(data.session); await load(data.session); }
  }

  async function signOut() {
    await client?.auth.signOut();
    setSession(null); setOverview(null); setView('overview');
  }

  if (!client) return <main className="setup"><div className="setupCard"><div className="mark">✿</div><h1>Admin setup needed</h1><p>Add the public Supabase URL and publishable key to the web app’s environment. See the README for the remaining server secrets.</p></div></main>;

  if (!session) return <main className="loginLayout">
    <section className="loginIntro"><div className="brand"><span className="brandFlower">✿</span><span>Mahila Mitr</span><small>ADMIN</small></div><div><p className="eyebrow">PRIVATE WORKSPACE</p><h1>A clear view of the service.</h1><p>Monitor pairing, cycle activity, thoughtful notes and email readiness from one quiet place.</p></div><div className="loginFooter">Built for the people caring for Mahila Mitr.</div></section>
    <section className="loginFormWrap"><form className="loginForm" onSubmit={signIn}><div className="loginIcon">✿</div><p className="eyebrow">AUTHORIZED ACCESS</p><h2>Welcome back</h2><p>Sign in with your administrator account.</p><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /><button className="primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign in to dashboard'} <span>→</span></button>{error && <p className="formError" role="alert">{error}</p>}<p className="formHelp">Access is limited to approved admin addresses.</p></form></section>
  </main>;

  return <div className="appShell">
    <aside className="sidebar"><div className="brand"><span className="brandFlower">✿</span><span>Mahila Mitr</span><small>ADMIN</small></div><div className="navLabel">WORKSPACE</div><nav aria-label="Main navigation"><button className={view === 'overview' ? 'nav active' : 'nav'} onClick={() => setView('overview')}><span>▦</span> Overview</button><button className={view === 'email' ? 'nav active' : 'nav'} onClick={() => setView('email')}><span>✉</span> Email service</button><button className={view === 'access' ? 'nav active' : 'nav'} onClick={() => setView('access')}><span>◇</span> Access & privacy</button></nav><div className="sidebarBottom"><div className="sideStatus"><span className="statusDot" /> Connected to Supabase</div><button className="signout" onClick={signOut}>Sign out <span>↗</span></button></div></aside>
    <div className="mainColumn"><header className="topbar"><div className="mobileBrand">✿ Mahila Mitr</div><span>Service dashboard</span><div className="adminPill"><span className="avatar">{session.user.email?.charAt(0).toUpperCase() || 'A'}</span><span>{session.user.email}</span></div></header><main className="dashboard">
      {error && <div className="alert" role="alert">{error}</div>}
      {view === 'overview' && <><div className="pageHead"><div><p className="eyebrow">OVERVIEW</p><h1>Good to see you.</h1><p>How Mahila Mitr is doing, without opening anyone’s private content.</p></div><button className="refresh" disabled={loading} onClick={() => load(session)}>{loading ? 'Refreshing…' : '↻ Refresh'}</button></div>
        <div className="statsGrid">{stats.map(item => <article className={`stat ${item.tone}`} key={item.key}><div className="statTop"><span>{item.label}</span><span className="statIcon">{item.icon}</span></div><strong>{overview?.counts[item.key].toLocaleString() ?? '—'}</strong><small>All time</small></article>)}</div>
        <div className="lowerGrid"><section className="panel"><div className="panelHead"><div><p className="eyebrow">ACTIVITY</p><h2>Recent moments</h2></div><span className="subtle">Latest 12 events</span></div>{overview?.activities.length ? <div className="activityList">{overview.activities.map((item, index) => <div className="activity" key={`${item.date}-${index}`}><span className="activityIcon">{item.kind === 'Note sent' ? '✉' : item.kind === 'Date rated' ? '★' : item.kind === 'Cycle logged' ? '◷' : '↗'}</span><span>{item.kind}</span><time dateTime={item.date}>{new Date(item.date).toLocaleString()}</time></div>)}</div> : <p className="empty">No activity to show yet.</p>}</section><section className="panel servicePanel"><p className="eyebrow">SERVICE HEALTH</p><h2>Email delivery</h2><div className={overview?.mailConfigured ? 'health good' : 'health pending'}><span className="statusDot" /><strong>{overview?.mailConfigured ? 'API credentials set' : 'Setup incomplete'}</strong></div><p>Supabase can call the signed mail endpoint. A verified email provider is required for real delivery.</p><button className="textButton" onClick={() => setView('email')}>View email setup →</button><div className="checked">Last checked {overview ? new Date(overview.checkedAt).toLocaleString() : '—'}</div></section></div>
      </>}
      {view === 'email' && <><div className="pageHead"><div><p className="eyebrow">EMAIL SERVICE</p><h1>Send codes with care.</h1><p>The web API sends authentication emails only after verifying Supabase’s signed hook.</p></div></div><div className="guideGrid"><section className="panel"><div className="panelHead"><div><p className="eyebrow">INTEGRATION</p><h2>Delivery path</h2></div></div><div className="flow"><span>Flutter app</span><b>→</b><span>Supabase Auth</span><b>→</b><span>Signed web hook</span><b>→</b><span>Email provider</span></div><p className="subtle">The app still lets Supabase issue and verify one-time codes. This endpoint replaces SMTP delivery.</p><div className="codeLabel">HOOK URL</div><code className="codeBlock">{typeof window !== 'undefined' ? `${window.location.origin}/api/auth-email` : '/api/auth-email'}</code></section><section className="panel"><p className="eyebrow">CONFIGURATION</p><h2>Before going live</h2><ol className="steps"><li>Verify a sending domain with your email provider.</li><li>Set the server-only Resend key, From address and Supabase hook secret on Vercel.</li><li>Configure Supabase’s Send Email HTTP Hook with this API URL and matching secret.</li><li>Send a code to a test account and check provider delivery logs.</li></ol><div className={overview?.mailConfigured ? 'health good' : 'health pending'}><span className="statusDot" /><strong>{overview?.mailConfigured ? 'Environment variables present' : 'Environment variables missing'}</strong></div></section></div></>}
      {view === 'access' && <><div className="pageHead"><div><p className="eyebrow">ACCESS & PRIVACY</p><h1>Respect the private space.</h1><p>Admin access is separate from partner accounts.</p></div></div><div className="guideGrid"><section className="panel"><p className="eyebrow">ADMIN ACCESS</p><h2>Server-verified accounts</h2><p>Every dashboard request checks the Supabase session and compares the email with the server-only admin allowlist. Database service credentials stay on the server.</p><div className="infoRow"><span>Current account</span><strong>{session.user.email}</strong></div></section><section className="panel"><p className="eyebrow">DATA MINIMIZATION</p><h2>Only what’s useful</h2><p>This panel shows totals and event times. It does not display period dates, note text, reflections, pairing codes or partner identities.</p><div className="privacyMark">✿ <span>Private by design</span></div></section></div></>}
    </main></div>
  </div>;
}
