'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { browserClient } from '@/lib/supabase';
import type { Overview } from '@/lib/overview';
import { AdminWorkspace, Brand, StatusBadge } from './admin-workspace';

export default function AdminPage() {
  const client = useMemo<SupabaseClient | null>(() => {
    try { return browserClient(); } catch { return null; }
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const currentUser = useRef<string | null>(null);

  const load = useCallback(async (nextSession: Session) => {
    const id = ++requestId.current;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/overview', {
        headers: { Authorization: `Bearer ${nextSession.access_token}` }, cache: 'no-store',
      });
      const body = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) setOverview(null);
        throw new Error(body.error || 'Could not load dashboard');
      }
      setOverview(body as Overview);
    } catch (reason) {
      if (id === requestId.current) setError(reason instanceof Error ? reason.message : 'Could not load dashboard');
    } finally { if (id === requestId.current) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;
    let authEventReceived = false;
    function update(nextSession: Session | null) {
      if (!active) return;
      requestId.current++;
      if (currentUser.current !== (nextSession?.user.id ?? null)) {
        setOverview(null); setError('');
      }
      currentUser.current = nextSession?.user.id ?? null;
      setSession(nextSession); setCheckingSession(false); setLoading(false);
    }
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEventReceived) return;
      update(data.session);
      if (sessionError) setError(sessionError.message);
    }).catch(() => { if (active && !authEventReceived) { update(null); setError('Could not restore your session. Please sign in again.'); } });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true; update(nextSession);
    });
    return () => { active = false; requestId.current++; data.subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => { if (session) void load(session); }, [session, load]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setLoading(true); setError('');
    try {
      const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.');
      setLoading(false);
    }
  }
  async function signOut() {
    try {
      const result = await client?.auth.signOut();
      if (result?.error) throw result.error;
      requestId.current++; setSession(null); setOverview(null); setError('');
    } catch { setError('Could not sign out. Please try again.'); }
  }

  if (!client) return <main className="setup"><section className="setupCard"><Brand /><StatusBadge tone="warning">Configuration needed</StatusBadge><h1>Let’s connect your workspace.</h1><p>Add the public Supabase URL and publishable key to the web app’s environment. The README covers the server configuration.</p><code>NEXT_PUBLIC_SUPABASE_URL<br />NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code></section></main>;
  if (checkingSession) return <main className="setup"><div className="setupCard" role="status"><Brand /><p>Opening your workspace…</p></div></main>;
  if (!session) return <main className="loginLayout"><section className="loginIntro"><Brand /><div className="loginStory"><p className="eyebrow">THE CARE BEHIND THE CARE</p><h1>A little clarity.<br />A lot of care.</h1><p>A thoughtful workspace for the people keeping Mahila Mitr connected, supported, and running smoothly.</p><div className="loginIllustration" aria-hidden="true"><div className="orbit orbitOne" /><div className="orbit orbitTwo" /><span className="illustrationFlower">✿</span><span className="floatingPetal petalOne">✧</span><span className="floatingPetal petalTwo">✧</span><div className="illustrationNote"><span>✓</span><div>Small signals.<strong>Meaningful care.</strong></div></div></div></div><p className="loginFooter">Private moments stay personal. Always.</p></section>
    <section className="loginFormWrap"><form className="loginForm" onSubmit={signIn} aria-busy={loading}><span className="loginIcon" aria-hidden="true">◇</span><p className="eyebrow">ADMINISTRATOR SIGN IN</p><h2>Welcome to your workspace.</h2><p>Sign in with your approved admin account.</p><label htmlFor="email">Email address</label><input id="email" type="email" placeholder="you@example.com" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} disabled={loading} required /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={loading} required /><button className="button primary loginButton" disabled={loading}>{loading ? 'Signing in…' : 'Open workspace'}<span aria-hidden="true">→</span></button>{error && <p className="alert" role="alert">{error}</p>}<p className="formHelp">◇ Access is limited to approved administrators.<br />Need access? Contact your service administrator.</p></form><span className="loginCopyright">MAHILA MITR · ADMIN PORTAL</span></section></main>;
  return <AdminWorkspace email={session.user.email ?? 'Administrator'} data={overview} loading={loading} error={error} onRefresh={() => void load(session)} onSignOut={() => void signOut()} />;
}
