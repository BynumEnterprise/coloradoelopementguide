export const prerender = false;
import type { APIRoute } from 'astro';
import { rpc, authSecret } from '../../lib/cron';
import { sendMail, OWNER_EMAIL } from '../../lib/mail';
import { renderKit, sendCoupleMail } from '../../lib/couple-mail';

// Planning kit signup (EmailCapture forms). Stores the subscriber and enrolls the address in the couple
// sequence through ceg_subscribe, then emails the kit right away (day 0). Days 3, 7 and 12 are sent by the
// nurture stage of /api/cron/daily. Bots that fill the hidden company_site field get the normal thank you page.
const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[A-Za-z]{2,}$/;

export const POST: APIRoute = async ({ request, redirect }) => {
  let form: FormData;
  try { form = await request.formData(); } catch { return redirect('/thanks?e=invalid', 303); }
  if (String(form.get('company_site') || '').trim() !== '') return redirect('/thanks?kit=1', 303);
  const email = String(form.get('email') || '').trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) return redirect('/thanks?e=invalid', 303);
  const source = String(form.get('source') || 'site').replace(/[^a-z0-9_:\/.-]/gi, '').slice(0, 40) || 'site';

  const secret = authSecret();
  let sub: { ok: boolean; id?: number; token?: string; send_kit?: boolean; error?: string } | null = null;
  try { sub = await rpc('ceg_subscribe', { p_secret: secret, p_email: email, p_source: source }); }
  catch (e) { console.error('subscribe rpc failed', e); }
  if (!sub?.ok || !sub.id || !sub.token) return redirect(sub?.error === 'bad_email' ? '/thanks?e=invalid' : '/thanks?kit=1', 303);

  if (sub.send_kit) {
    try {
      const m = renderKit({ token: sub.token });
      const res = await sendCoupleMail(email, m);
      if (res.ok) await rpc('ceg_nurture_mark', { p_secret: secret, p_id: sub.id, p_step: 'kit', p_via: 'subscribe', p_resend_id: res.id ?? null });
      else console.error('kit send failed', res.status, res.error);
    } catch (e) { console.error('kit send error', e); }
    try { await sendMail(OWNER_EMAIL, '[CEG] New planning kit subscriber', `New planning kit subscriber: ${email} (from ${source}). Stored in p2_subscribers and enrolled in the couple emails.`); } catch { /* noop */ }
  }

  const key = process.env.KIT_API_KEY ?? import.meta.env.KIT_API_KEY;
  if (key) {
    try {
      await fetch('https://api.kit.com/v4/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
        body: JSON.stringify({ email_address: email })
      });
    } catch { /* noop */ }
  }
  return redirect('/thanks?kit=1', 303);
};
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
