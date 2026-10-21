'use client';

import { useState, type CSSProperties } from 'react';
import { modules, weekTotal, summaryCsv, type Overview, type Metric } from '@/lib/overview';

export type View = 'overview' | 'activity' | 'services' | 'access';
const views: { id: View; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '▦' },
  { id: 'activity', label: 'Activity', icon: '↗' },
  { id: 'services', label: 'Service status', icon: '◉' },
  { id: 'access', label: 'Access & privacy', icon: '◇' },
];
const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString();
const timestamp = (value: string) => `${new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST`;
const mailReady = (data: Overview | null) => data && Object.values(data.services).every(Boolean);

export function Brand() {
  return <div className="brand"><span className="brandFlower" aria-hidden="true">✿</span><span>Mahila Mitr<small>ADMIN WORKSPACE</small></span></div>;
}
export function StatusBadge({ tone, children }: { tone: 'good' | 'warning' | 'neutral'; children: React.ReactNode }) {
  return <span className={`statusBadge ${tone}`}><span className="statusDot" />{children}</span>;
}
export function OverviewSkeleton() {
  return <div className="statsGrid skeletonGrid" aria-label="Loading service overview" role="status">
    {Array.from({ length: 4 }, (_, i) => <div className="skeletonCard" key={i}><span /><strong /><small /></div>)}
  </div>;
}
function ActivityList({ data, compact = false }: { data: Overview | null; compact?: boolean }) {
  const [filter, setFilter] = useState<Metric | 'all'>('all');
  const items = (data?.activities ?? []).filter(item => filter === 'all' || item.module === filter);
  const visible = compact ? items.slice(0, 6) : items;
  return <section className="panel activityPanel">
    <div className="panelHead"><div><h2>{compact ? 'Latest activity' : 'Service activity'}</h2><p>Latest {compact ? '6 of 30' : '30'} service events · content hidden</p></div>
      {!compact && <label className="filterLabel">Event type<select value={filter} onChange={event => setFilter(event.target.value as Metric | 'all')}><option value="all">All events</option>{modules.map(item => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label>}
    </div>
    {visible.length ? <div className="tableScroll"><table><thead><tr><th scope="col">Event</th><th scope="col">Category</th><th scope="col">Time · IST</th></tr></thead><tbody>{visible.map((item, i) => {
      const meta = modules.find(module => module.key === item.module)!;
      return <tr key={`${item.module}-${item.date}-${i}`}><td><span className="eventName"><span className="eventIcon" style={{ '--event-color': meta.color } as CSSProperties} aria-hidden="true">{meta.icon}</span>{item.kind}</span></td><td><span className="categoryTag">{meta.label}</span></td><td><time dateTime={item.date}>{timestamp(item.date)}</time></td></tr>;
    })}</tbody></table></div> : <div className="emptyState"><span aria-hidden="true">↗</span><h3>{data ? (filter === 'all' ? 'No activity yet' : 'No matching events') : 'Activity unavailable'}</h3><p>{data ? 'Personal details are never shown. Events appear here as the service is used.' : 'Refresh the dashboard to load service events.'}</p></div>}
    <div className="panelFoot">{data?.unavailable.length ? 'Some sources are unavailable; this list may be incomplete.' : 'Event times show record creation, not delivery or read receipts.'}</div>
  </section>;
}
function ActivityChart({ data }: { data: Overview | null }) {
  const values = data?.week.map(day => weekTotal([day])) ?? [];
  const max = Math.max(1, ...values.map(value => value ?? 0));
  const total = data ? weekTotal(data.week) : null;
  return <section className="panel chartPanel"><div className="panelHead"><div><h2>A week in view</h2><p>New records across the service · UTC days</p></div><span className="chartTotal">{number(total)}<small>records</small></span></div>
    {data ? <><div className="chart" role="img" aria-label={data.week.map((day, i) => `${day.date}: ${number(values[i])} new records`).join('; ')}>{data.week.map((day, i) => <div className="chartColumn" key={day.date}><span className="barValue">{number(values[i])}</span><div className="barTrack"><div className={`bar ${i === 6 ? 'today' : ''}`} style={{ height: `${((values[i] ?? 0) / max) * 100}%` }} /></div><span className="barLabel">{new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })}</span></div>)}</div><div className="chartLegend"><span><i /> New records</span><span>Today is still in progress</span></div></> : <div className="emptyState"><h3>Trend unavailable</h3><p>Load service data to view the last seven days.</p></div>}
  </section>;
}
function DownloadButton({ data }: { data: Overview | null }) {
  function download() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([summaryCsv(data)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `mahila-mitr-overview-${data.checkedAt.slice(0, 10)}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button className="button secondary" onClick={download} disabled={!data}><span aria-hidden="true">↓</span> Export summary</button>;
}

export function AdminWorkspace({ email, data, loading, error, onRefresh, onSignOut }: {
  email: string; data: Overview | null; loading: boolean; error: string;
  onRefresh: () => void; onSignOut: () => void;
}) {
  const [view, setView] = useState<View>('overview');
  const status = !data ? 'Awaiting data' : error ? 'Refresh failed' : data.unavailable.length ? 'Partial data' : 'Data loaded';
  const heading = { overview: ['Your service, at a glance.', 'A little clarity for the care you make possible.'],
    activity: ['The moments behind the numbers.', 'Monitor service usage with personal content kept private.'],
    services: ['Keep the essentials running.', 'Configuration checks and practical steps for your service.'],
    access: ['Care starts with trust.', 'Clear boundaries for administrator access and personal data.'] }[view];
  return <div className="appShell"><a className="skipLink" href="#main">Skip to content</a>
    <aside className="sidebar"><Brand /><div className="workspaceLabel">MANAGE YOUR SERVICE</div><nav aria-label="Main navigation">{views.map(item => <button className={`nav ${view === item.id ? 'active' : ''}`} key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}{view === item.id && <b aria-hidden="true">›</b>}</button>)}</nav>
      <div className="sidebarNote"><span aria-hidden="true">✿</span><strong>A space built on trust.</strong><p>Useful service signals.<br />Personal moments stay personal.</p><StatusBadge tone="neutral">Private by design</StatusBadge></div>
      <div className="sidebarBottom"><span className="avatar">{email.charAt(0).toUpperCase() || 'A'}</span><div><strong>Administrator</strong><small title={email}>{email}</small></div><button className="iconButton" aria-label="Sign out" title="Sign out" onClick={onSignOut}>↪</button></div>
    </aside>
    <div className="mainColumn"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{views.find(item => item.id === view)?.label}</strong></div><div className="topbarRight"><StatusBadge tone={data && !error && !data.unavailable.length ? 'good' : 'neutral'}>{loading ? 'Updating…' : status}</StatusBadge><button className="mobileSignout" onClick={onSignOut}>Sign out</button><span className="topbarDate">Mahila Mitr Admin</span></div></header>
    <main id="main" className="dashboard" aria-busy={loading}><div className="pageHead"><div><p className="eyebrow">{view === 'overview' ? 'SERVICE OVERVIEW' : views.find(item => item.id === view)?.label.toUpperCase()}</p><h1>{heading[0]}</h1><p>{heading[1]}</p></div><div className="headActions"><DownloadButton data={data} /><button className="button primary" disabled={loading} onClick={onRefresh}><span className={loading ? 'spinning' : ''} aria-hidden="true">↻</span>{loading ? 'Refreshing…' : 'Refresh data'}</button></div></div>
      {error && <div className="alert" role="alert"><strong>Couldn’t refresh the dashboard.</strong> {error}{data && ' The last successful snapshot is still shown.'}</div>}
      {data?.unavailable.length ? <div className="notice" role="status"><strong>Some data needs attention.</strong> Unavailable: {data.unavailable.join(', ')}. Check the database tables and migrations; unavailable values are shown as —.</div> : null}
      {view === 'overview' && <><div className="sectionLabel"><h2>Community & care</h2><span>Current totals <i>·</i> Last 7 days below</span></div>
        {loading && !data ? <OverviewSkeleton /> : <div className="statsGrid">{[
          { key: 'profiles', label: 'Community profiles', icon: '♧', detail: 'Profiles created', tone: 'plum' },
          { key: 'pairs', label: 'Connected pairs', icon: '↗', detail: 'Shared connections', tone: 'rose' },
          { key: 'logs', label: 'Daily check-ins', icon: '✓', detail: data ? `${number(weekTotal(data.week, 'logs'))} created this week` : 'Waiting for data', tone: 'sage' },
          { key: 'cycles', label: 'Period entries', icon: '◷', detail: data ? `${number(weekTotal(data.week, 'cycles'))} created this week` : 'Waiting for data', tone: 'lilac' },
        ].map(item => <article className={`stat ${item.tone}`} key={item.key}><div className="statTop"><span>{item.label}</span><span className="statIcon" aria-hidden="true">{item.icon}</span></div><strong>{number(data?.counts[item.key as keyof Overview['counts']])}</strong><small>{item.detail}</small></article>)}</div>}
        <div className="middleGrid"><ActivityChart data={data} /><section className="panel attentionPanel"><div className="panelHead"><div><p className="eyebrow">OPERATIONS</p><h2>What needs a little care</h2></div><span className="smallFlower" aria-hidden="true">✿</span></div><div className="checkRow"><span className={`checkIcon ${data && !data.unavailable.length ? 'good' : ''}`}>{data && !data.unavailable.length ? '✓' : '·'}</span><div><strong>Database sources</strong><p>{!data ? 'Waiting for the first successful refresh' : data.unavailable.length ? `${data.unavailable.length} ${data.unavailable.length === 1 ? 'source needs' : 'sources need'} review` : 'All dashboard sources responded'}</p></div></div><div className="checkRow"><span className={`checkIcon ${mailReady(data) ? 'good' : ''}`}>{mailReady(data) ? '✓' : '!'}</span><div><strong>Authentication email</strong><p>{!data ? 'Not checked yet' : mailReady(data) ? 'Configuration present · delivery unverified' : 'Server configuration needs attention'}</p></div></div><div className="checkRow"><span className="checkIcon">◷</span><div><strong>Daily logging reminders</strong><p>Scheduled on the device · delivery unmeasured</p></div></div><button className="textButton" onClick={() => setView('services')}>Review service status <span aria-hidden="true">→</span></button></section></div>
        <div className="lowerGrid"><ActivityList data={data} compact /><section className="panel connectionPanel"><p className="eyebrow">SHARED MOMENTS</p><h2>Small gestures. Stronger connections.</h2><p>A view of the ways people stay in touch through Mahila Mitr.</p><div className="connectionMetric"><span>Private notes</span><strong>{number(data?.counts.notes)}</strong></div><div className="connectionMetric"><span>Date reflections</span><strong>{number(data?.counts.ratings)}</strong></div><button className="textButton" onClick={() => setView('activity')}>Explore activity <span aria-hidden="true">→</span></button></section></div>
      </>}
      {view === 'activity' && <><div className="activitySummary">{modules.map(item => <div key={item.key}><span>{item.label}</span><strong>{number(data?.counts[item.key])}</strong></div>)}</div><ActivityList data={data} /></>}
      {view === 'services' && <div className="serviceGrid"><section className="panel"><div className="panelHead"><div><p className="eyebrow">AUTHENTICATION</p><h2>Email configuration</h2></div><StatusBadge tone={!data ? 'neutral' : mailReady(data) ? 'good' : 'warning'}>{!data ? 'Not checked' : mailReady(data) ? 'Configured' : 'Needs setup'}</StatusBadge></div><p>Each check confirms that a server variable exists. Delivery must be verified with a test sign-in and your email provider’s logs.</p><ul className="configList">{([
        ['emailKey', 'Email provider credential'], ['emailSender', 'Verified sender address'], ['emailHook', 'Signed authentication hook'],
      ] as const).map(([key, label]) => <li key={key}><span>{label}</span><StatusBadge tone={!data ? 'neutral' : data.services[key] ? 'good' : 'warning'}>{!data ? 'Not checked' : data.services[key] ? 'Present' : 'Missing'}</StatusBadge></li>)}</ul><label className="codeLabel" htmlFor="hookUrl">Authentication hook endpoint</label><input id="hookUrl" className="codeBlock" readOnly value={typeof window === 'undefined' ? '/api/auth-email' : `${window.location.origin}/api/auth-email`} onFocus={event => event.target.select()} /><p className="smallPrint">Configure this endpoint in Supabase’s Send Email HTTP Hook, then verify delivery to a test account.</p></section>
        <section className="panel reminderPanel"><p className="eyebrow">MOBILE NOTIFICATIONS</p><h2>A gentle daily check-in.</h2><div className="notificationPreview"><span className="notificationMark" aria-hidden="true">✿</span><div><small>MAHILA MITR <span>8:00 PM</span></small><strong>A moment for you</strong><p>Add your daily check-in.</p></div></div><dl className="detailList"><div><dt>When</dt><dd>Around 8 PM device-local time</dd></div><div><dt>Eligibility</dt><dd>Ongoing period and no daily log for that day</dd></div><div><dt>Stops when</dt><dd>A daily log is saved, the period ends, or the owner signs out</dd></div><div><dt>Scheduling window</dt><dd>30 days ahead, refreshed on device sync</dd></div></dl><p className="smallPrint">Requires the updated mobile app and notification permission. Changes on another device apply after sync. This portal cannot confirm reminder delivery or change device permissions.</p></section>
        <section className="panel fullWidth"><div className="panelHead"><div><p className="eyebrow">DATA SOURCES</p><h2>Source availability</h2></div><span className="subtle">Checked with every refresh</span></div><div className="sourceGrid">{[...modules.map(item => item.label), 'Profiles'].map(label => <div className="sourceItem" key={label}><span>{label}</span><StatusBadge tone={!data ? 'neutral' : data.unavailable.includes(label) ? 'warning' : 'good'}>{!data ? 'Not checked' : data.unavailable.includes(label) ? 'Unavailable' : 'Available'}</StatusBadge></div>)}</div></section></div>}
      {view === 'access' && <div className="serviceGrid"><section className="panel"><p className="eyebrow">YOUR ACCESS</p><h2>A dedicated admin workspace.</h2><p>Every data request verifies your session and the server’s approved administrator list.</p><dl className="detailList"><div><dt>Signed in as</dt><dd className="accountEmail">{email}</dd></div><div><dt>Permission</dt><dd>Read aggregate service activity</dd></div><div><dt>Access changes</dt><dd>Managed through the server admin allowlist</dd></div></dl><button className="button secondary" onClick={onSignOut}>Sign out of this workspace ↪</button></section><section className="panel"><p className="eyebrow">DATA BOUNDARIES</p><h2>See the service. Respect the person.</h2><p>This dashboard contains aggregate totals, daily record counts, and recent event times. Summary exports contain aggregate counts only.</p><ul className="privacyList"><li>Period dates and symptoms stay private.</li><li>Notes, chat messages, and reflections are never displayed.</li><li>Pairing codes and partner identities stay out of this workspace.</li><li>Service credentials remain on the server.</li></ul><StatusBadge tone="neutral">Private by design</StatusBadge></section></div>}
      <footer className="dashboardFooter"><span>✿ Made for a more caring everyday.</span><span>{data ? `Last refreshed ${timestamp(data.checkedAt)}` : 'No service snapshot loaded'}</span></footer>
    </main></div></div>;
}

