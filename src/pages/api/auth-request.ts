export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';
import { sendMail } from '../../lib/mail';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  if (String(form.get('website_url') || '') !== '') return redirect('/thanks?login=1', 303);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const slugs = String(form.get('slugs') || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect('/my-vendors?e=invalid', 303);
  const secret = process.env.CEG_AUTH_SECRET ?? import.meta.env.CEG_AUTH_SECRET;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/ceg_request_login`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_email: email, p_secret: secret })
  });
  if (!r.ok) { console.error('auth-request rpc failed', r.status, await r.text()); return redirect('/my-vendors?e=srv', 303); }
  const lt = (await r.text()).replace(/"/g, '');
  const link = `https://coloradoelopementguide.com/lt/${lt}${slugs ? `?merge=${encodeURIComponent(slugs)}` : ''}`;
  await sendMail(email, 'Your sign in link for Colorado Elopement Guide',
`Hi,

Tap this link to open your vendor planner. It works once and expires in 30 minutes:

${link}

Your planner keeps every vendor you save, with your own notes and booking status for each one, on any device.

Happy planning,
Colorado Elopement Guide`);
  return redirect('/thanks?login=1', 303);
};
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
