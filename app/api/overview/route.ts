import { adminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { modules, recentActivities, weekWindows, type Overview, type Metric } from '@/lib/overview';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  let admin;
  try { admin = await requireAdmin(request); }
  catch { return Response.json({ error: 'Service configuration is missing' }, { status: 503, headers }); }
  if (!admin) return Response.json({ error: 'Admin access required' }, { status: 403, headers });
  try {
    const db = adminClient();
    const windows = weekWindows(new Date());
    const results = await Promise.all(modules.map(async module => {
      const [total, events, days] = await Promise.all([
        db.from(module.table).select('*', { count: 'exact', head: true }),
        db.from(module.table).select('created_at').order('created_at', { ascending: false }).limit(30),
        Promise.all(windows.map(day => db.from(module.table)
          .select('*', { count: 'exact', head: true }).gte('created_at', day.start).lt('created_at', day.end))),
      ]);
      return { module, total, events, days };
    }));
    const profiles = await db.from('profiles').select('*', { count: 'exact', head: true });
    if (results.every(result => result.total.error)) throw new Error('Database unavailable');
    const unavailable: string[] = results.filter(result => result.total.error || result.events.error || result.days.some(day => day.error))
      .map(result => result.module.label);
    if (profiles.error) unavailable.push('Profiles');
    const body: Overview = {
      counts: {
        ...Object.fromEntries(results.map(result => [result.module.key, result.total.error ? null : result.total.count ?? 0])) as Record<Metric, number | null>,
        profiles: profiles.error ? null : profiles.count ?? 0,
      },
      week: windows.map((day, index) => ({ date: day.date,
        counts: Object.fromEntries(results.map(result => [result.module.key,
          result.days[index].error ? null : result.days[index].count ?? 0])) as Record<Metric, number | null> })),
      activities: recentActivities(results.map(result => (result.events.data ?? []).map(row => ({
        kind: result.module.event, module: result.module.key, date: row.created_at as string,
      })))),
      unavailable,
      services: { emailKey: Boolean(process.env.RESEND_API_KEY), emailSender: Boolean(process.env.AUTH_EMAIL_FROM),
        emailHook: Boolean(process.env.SEND_EMAIL_HOOK_SECRET) },
      checkedAt: new Date().toISOString(),
    };
    return Response.json(body, { headers });
  } catch {
    return Response.json({ error: 'Could not load service data. Check the database connection and server configuration.' }, { status: 500, headers });
  }
}
