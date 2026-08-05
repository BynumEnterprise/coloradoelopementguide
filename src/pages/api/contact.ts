export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';
import { sendMail } from '../../lib/mail';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  if (String(form.get('website_url') || '') !== '') return redirect('/thanks', 303);
  const name = String(form.get('name') || '').slice(0, 200);
  const email = String(form.get('email') || '').slice(0, 200);
  const message = String(form.get('message') || '').slice(0, 3000);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect('/contact?e=invalid', 303);
  try {
    await fetch(`${SB_URL}/rest/v1/p2_inquiries`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ vendor_id: null, name, email, message: `[CONTACT] ${message}` })
    });
  } catch { /* noop */ }
  await sendMail('bynumenterprisesbe@gmail.com', `[CEG] Contact form: ${name}`, `From: ${name} <${email}>\n\n${message}`);
  return redirect('/thanks?contact=1', 303);
};
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
