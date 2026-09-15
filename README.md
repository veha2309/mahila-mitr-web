# Mahila Mitr Admin

A protected Next.js web dashboard for service activity and a signed API endpoint for Supabase authentication emails. The dashboard displays counts and event times only. It does not return cycle dates, note text, reflections, pairing codes, or partner identities.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the values. Put a **service-role key only in `SUPABASE_SERVICE_ROLE_KEY`**, never in a `NEXT_PUBLIC_` variable.
2. Add the email of a manually created, confirmed Supabase Auth administrator to `ADMIN_EMAILS`. This first version uses Supabase email/password sign-in for administrators; the account must already exist.
3. Run `npm install`, then `npm run dev`. The dashboard is at `http://localhost:3000`.

The admin API verifies the Supabase access token on every request, checks the server-side allowlist, and only then queries aggregate data with the service key. Adding an email to the allowlist does not create its account. Use a dedicated admin account and a strong password.

## Authentication mail API

`POST /api/auth-email` accepts **only signed Supabase Send Email Hook events**. The route verifies the Standard Webhooks signature, then asks Resend to send the one-time code. It does not let browsers choose recipients or content. Set `RESEND_API_KEY`, a From address at a domain verified with Resend, and `SEND_EMAIL_HOOK_SECRET` in Vercel environment variables. In Supabase **Authentication → Auth Hooks**, create a Send Email HTTP Hook pointing to `https://YOUR-DOMAIN/api/auth-email` and use the matching secret. Keep Email sign-in enabled. Supabase Auth still issues and verifies codes; this API replaces SMTP delivery.

Use a preview deployment and a test account first. The endpoint will return 503 until its server environment is configured. Do not paste hook secrets, Resend API keys, or service-role keys into the browser or commit them.

## Vercel

Set this `web-app` directory as the Vercel project's root, add the environment variables for Preview and Production, then deploy. The Flutter app remains under `mobile-app`. A Vercel deployment alone does not configure the Supabase hook or verify the sender domain.
