export const prerender = false;
import type { APIRoute } from 'astro';
import { rpc, authSecret } from '../../lib/cron';
import { sendMail } from '../../lib/mail';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  if (String(form.get('website_url') || '') !== '') return redirect('/thanks?claim=1', 303); // honeypot
  const slug = String(form.get('vendor_slug') || '');
  const name = String(form.get('name') || '').slice(0, 200);
  const email = String(form.get('email') || '').slice(0, 200);
  const message = String(form.get('message') || '').slice(0, 2000);
  const ref = String(form.get('ref') || '').trim();
  if (!slug || !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect('/claim?e=invalid', 303);
  // M4: a claim that arrived through a referral link ties the listing to the referral (and releases it if still queued).
  if (slug !== '__not_listed__' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    try { await rpc('ceg_referral_attach', { p_ref: ref, p_slug: slug }); } catch { /* the claim still goes through */ }
  }
  // ceg_claim_submit (secret gated, S9 2026-11-05) looks the vendor up, throttles per email and inserts the claim row.
  let vendorId: number | null = null; let vendorName = '';
  try {
    const r = await rpc<{ ok: boolean; error?: string; vendor_id?: number | null; vendor_name?: string }>('ceg_claim_submit',
      { p_secret: authSecret(), p_slug: slug, p_name: name, p_email: email, p_message: message });
    if (!r?.ok) return redirect(r?.error === 'rate' ? '/thanks?claim=1' : '/claim?e=invalid', 303);
    vendorId = r.vendor_id ?? null; vendorName = r.vendor_name ?? '';
  } catch (e) { console.error('claim submit failed', e); return redirect('/claim?e=invalid', 303); }
  await sendMail(email, `We got your claim${vendorName ? ` for ${vendorName}` : ''} | Colorado Elopement Guide`,
`Hi ${name},

Thanks for claiming${vendorName ? ` for ${vendorName}` : ''}. Here's what happens next:

1. We verify your email against the business (usually within 1 business day).
2. You'll get a confirmation, and any corrections you sent go live.
3. Each month we'll send your listing's real click and inquiry counts. That means couples who viewed your page, clicked through to your site, or tapped your phone number. No bots, no inflation.

Nothing to do right now. Questions? Just reply.

Ryan
Colorado Elopement Guide`);
  await sendMail('bynumenterprisesbe@gmail.com', `[CEG] New claim: ${vendorName || 'unlisted business'} by ${name}`,
`Claim received.\nVendor: ${vendorName || '(not listed)'} (id ${vendorId})\nClaimant: ${name} <${email}>\nMessage: ${message || '(none)'}\nReferral: ${ref || '(none)'}\n\nDaily reply-review task will verify domain match, or handle manually.`);
  return redirect('/thanks?claim=1', 303);
};
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
