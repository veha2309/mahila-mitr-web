import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let browserInstance: ReturnType<typeof createClient> | undefined;

export function browserClient() {
  if (!url || !publishableKey) throw new Error('Supabase configuration is missing');
  if (typeof window === 'undefined') {
    return createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  browserInstance ??= createClient(url, publishableKey);
  return browserInstance;
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
