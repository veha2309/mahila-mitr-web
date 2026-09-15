import { Webhook } from 'standardwebhooks';
import { Resend } from 'resend';

export const runtime = 'nodejs';

type HookPayload = {
  user: { email?: string; new_email?: string };
  email_data: {
    token?: string;
    token_new?: string;
    email_action_type?: string;
  };
};

export async function POST(request: Request) {
  const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!hookSecret || !apiKey || !from) return Response.json({ error: 'Email service unavailable' }, { status: 503 });

  const raw = await request.text();
  let payload: HookPayload;
  try {
    const secret = hookSecret.replace(/^v1,whsec_/, '');
    payload = new Webhook(secret).verify(raw, Object.fromEntries(request.headers)) as HookPayload;
  } catch {
    return Response.json({ error: 'Invalid hook signature' }, { status: 401 });
  }

  const { user, email_data: email } = payload;
  if (!user?.email || !email?.token || !/^\d{6,10}$/.test(email.token)) {
    return Response.json({ error: 'Invalid email event' }, { status: 422 });
  }

  const messages = [{ to: user.email, token: email.token }];
  if (email.email_action_type === 'email_change' && user.new_email && email.token_new && /^\d{6,10}$/.test(email.token_new)) {
    messages.push({ to: user.new_email, token: email.token_new });
  }

  const resend = new Resend(apiKey);
  try {
    for (const message of messages) {
      const { error } = await resend.emails.send({
        from,
        to: [message.to],
        subject: 'Your Mahila Mitr sign-in code',
        text: `Your Mahila Mitr code is ${message.token}. Enter it in the app. If you did not request this, you can ignore this email.`,
      });
      if (error) throw error;
    }
    return Response.json({}, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Email delivery failed' }, { status: 502 });
  }
}
