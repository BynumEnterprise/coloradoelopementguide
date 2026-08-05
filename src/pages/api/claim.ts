export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';
import { sendMail } from '../../lib/mail';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  if (String(form.get('website_url') || '') !== '') return redirect('/thanks?claim=1', 303); // honeypot
  const slug = String(form.get('vendor_slug') || '');
  const name = String(form.get('name') || '').slice(0, 200);
  const email = String(form.get('email') || '').slice(0, 200);
  const message = String(form.get('message') || '').slice(0, 2000);
  if (!slug || !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect('/claim?e=invalid', 303);
  let vendorId: number | null = null; let vendorName = '';
  if (slug !== '__not_listed__') {
    const r = await fetch(`${SB_URL}/rest/v1/p2_vendors?slug=eq.${encodeURIComponent(slug)}&select=id,name`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    const rows = await r.json();
    vendorId = rows?.[0]?.id ?? null; vendorName = rows?.[0]?.name ?? '';
  }
  await fetch(`${SB_URL}/rest/v1/p2_claims`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ vendor_id: vendorId, claimant_name: name, claimant_email: email, message: slug === '__not_listed__' ? `[NEW LISTING REQUEST] ${message}` : message })
  });
  await sendMail(email, `We got your claim${vendorName ? ` for ${vendorName}` : ''} — Colorado Elopement Guide`,
`Hi ${name},

Thanks -- we received your claim${vendorName ? ` for ${vendorName}` : ''}. Here's what happens next:

1. We verify your email against the business (usually within 1 business day).
2. You'll get a confirmation, and any corrections you sent go live.
3. Each month we'll send your listing's real click and inquiry counts -- couples who viewed your page, clicked through to your site, or tapped your phone number. No bots, no inflation.

Nothing to do right now. Questions? Just reply.

Ryan
Colorado Elopement Guide
Bynum Enterprises LLC, 306 Lost Creek Trl, Greenville, TX 75402`);
  await sendMail('bynumenterprisesbe@gmail.com', `[CEG] New claim: ${vendorName || 'unlisted business'} by ${name}`,
`Claim received.\nVendor: ${vendorName || '(not listed)'} (id ${vendorId})\nClaimant: ${name} <${email}>\nMessage: ${message || '(none)'}\n\nDaily reply-review task will verify domain match, or handle manually.`);
  return redirect('/thanks?claim=1', 303);
};
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
