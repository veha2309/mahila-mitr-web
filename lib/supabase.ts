import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function browserClient() {
  if (!url || !publishableKey) throw new Error('Supabase configuration is missing');
  return createClient(url, publishableKey);
}

export function authVerifier() {
  if (!url || !publishableKey) throw new Error('Supabase configuration is missing');
  return createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function adminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Server configuration is missing');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
