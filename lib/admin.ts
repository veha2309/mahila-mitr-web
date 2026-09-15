import { authVerifier } from './supabase';

export async function requireAdmin(request: Request) {
  const match = /^Bearer (.+)$/i.exec(request.headers.get('authorization') || '');
  if (!match) return null;
  const { data, error } = await authVerifier().auth.getUser(match[1]);
  if (error || !data.user?.email) return null;
  const allowed = (process.env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(data.user.email.toLowerCase())) return null;
  return { id: data.user.id, email: data.user.email };
}
