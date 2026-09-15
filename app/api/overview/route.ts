import { adminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Activity = { kind: string; date: string };

export async function GET(request: Request) {
  let admin;
  try { admin = await requireAdmin(request); }
  catch { return Response.json({ error: 'Service configuration is missing' }, { status: 503 }); }
  if (!admin) return Response.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const db = adminClient();
    const names = ['links', 'cycles', 'notes', 'date_ratings'] as const;
    const counts = await Promise.all(names.map(async name => {
      const { count, error } = await db.from(name).select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    }));
    const [pairRows, cycleRows, noteRows, ratingRows] = await Promise.all(names.map(async name => {
      const { data, error } = await db.from(name).select('created_at').order('created_at', { ascending: false }).limit(8);
      if (error) throw error;
      return data || [];
    }));
    const activities: Activity[] = [
      ...pairRows.map(row => ({ kind: 'Partner connected', date: row.created_at })),
      ...cycleRows.map(row => ({ kind: 'Cycle logged', date: row.created_at })),
      ...noteRows.map(row => ({ kind: 'Note sent', date: row.created_at })),
      ...ratingRows.map(row => ({ kind: 'Date rated', date: row.created_at })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
    return Response.json({
      counts: { pairs: counts[0], cycles: counts[1], notes: counts[2], ratings: counts[3] },
      activities,
      mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM && process.env.SEND_EMAIL_HOOK_SECRET),
      checkedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not load dashboard data' }, { status: 500 });
  }
}
