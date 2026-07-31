export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect('/thanks?e=invalid', 303);
  // Always store locally (idempotent on lower(email))
  try {
    await fetch(`${SB_URL}/rest/v1/p2_subscribers`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email, source: 'site' })
    });
  } catch { /* noop */ }
  // Forward to Kit when the env key is configured in Vercel
  const key = import.meta.env.KIT_API_KEY;
  if (key) {
    try {
      await fetch('https://api.kit.com/v4/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
        body: JSON.stringify({ email_address: email })
      });
    } catch { /* noop */ }
  }
  return redirect('/thanks', 303);
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
