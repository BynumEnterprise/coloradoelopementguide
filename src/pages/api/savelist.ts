export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';
import { rpc, authSecret } from '../../lib/cron';
import { sendMail } from '../../lib/mail';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') || '').trim();
  const slugs = String(form.get('slugs') || '').split(',').map(s => s.trim()).filter(s => /^[a-z0-9-]+$/.test(s)).slice(0, 60);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || slugs.length === 0) return redirect('/my-vendors', 303);
  const r = await fetch(`${SB_URL}/rest/v1/p2_vendors_public?slug=in.(${slugs.join(',')})&select=name,slug,category`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  });
  const rows = await r.json();
  const lines = (Array.isArray(rows) ? rows : []).map((v: any) => `${v.name}\nhttps://coloradoelopementguide.com/vendor/${v.slug}`).join('\n\n');
  await sendMail('lifecycle', email, 'Your saved Colorado elopement vendors',
`Hi,

Here is the vendor list you saved on Colorado Elopement Guide:

${lines}

You can keep adding to it any time at https://coloradoelopementguide.com/my-vendors

Happy planning,
Colorado Elopement Guide

If you don't want occasional planning notes, reply "unsubscribe" and we won't email again.`);
  // ceg_subscriber_add (secret gated, S9 2026-11-05): stores the address once, no nurture enrolment.
  try {
    await rpc('ceg_subscriber_add', { p_secret: authSecret(), p_email: email, p_source: 'shortlist' });
  } catch (e) { console.error('subscriber add failed', e); }
  await sendMail('transactional', 'bynumenterprisesbe@gmail.com', '[CEG] Shortlist emailed', `${email} saved ${slugs.length} vendors:\n\n${lines}`);
  return redirect('/thanks?list=1', 303);
};
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
