export const prerender = false;
import type { APIRoute } from 'astro';
import { rpc, authSecret } from '../../lib/cron';
import { sendMail } from '../../lib/mail';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  if (String(form.get('website_url') || '') !== '') return redirect('/thanks', 303);
  const name = String(form.get('name') || '').slice(0, 200);
  const email = String(form.get('email') || '').slice(0, 200);
  const message = String(form.get('message') || '').slice(0, 3000);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect('/contact?e=invalid', 303);
  // ceg_contact_submit (secret gated, S9 2026-11-05) stores the row with vendor_id null and the [CONTACT] prefix.
  // A sender past the 5 per day throttle still lands on the thanks page, but the owner is not emailed again.
  let throttled = false;
  try {
    const r = await rpc<{ ok: boolean; error?: string }>('ceg_contact_submit', { p_secret: authSecret(), p_name: name, p_email: email, p_message: message });
    throttled = !r?.ok && r?.error === 'rate';
  } catch (e) { console.error('contact submit failed', e); }
  if (!throttled) await sendMail('bynumenterprisesbe@gmail.com', `[CEG] Contact form: ${name}`, `From: ${name} <${email}>\n\n${message}`);
  return redirect('/thanks?contact=1', 303);
};
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
