export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret } from '../../lib/cron';
import { sendMailResult, MAIL_FROM, OWNER_EMAIL } from '../../lib/mail';
import { inquiryVendorEmail, inquiryNoticeEmail, naturalCheck, type InquiryIn } from '../../lib/outreach';

// "Ask similar vendors too" (GAP 1.5). After a couple's inquiry succeeds, the AlsoAsk component offers up to
// four similar live vendors. This endpoint copies the stored inquiry to the ones they tick. Proof that the
// caller is the couple: the original vendor slug, the couple email and the exact message must match an
// inquiry stored in the last two hours (ceg_inquiry_more). Each copy runs through ceg_inquiry_submit, so the
// same dup vendor, five per email per day and site hourly limits apply, and delivery follows the same rules
// as /api/inquiry: claimed vendors get the full inquiry with Reply To the couple, unclaimed vendors get the
// claim notice without the couple's details, and the owner gets one notice line for the batch.

const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[A-Za-z]{2,}$/;
const clean = (s: unknown, max: number) => String(s ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

async function sendReplyTo(to: string, replyTo: string, subject: string, text: string, html?: string) {
  const key = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  if (!key) return { ok: false, status: 0, error: 'no RESEND_API_KEY' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], reply_to: replyTo, subject, text, ...(html ? { html } : {}) })
    });
    const body = await r.text();
    return r.ok ? { ok: true, status: r.status } : { ok: false, status: r.status, error: body.slice(0, 300) };
  } catch (e) { return { ok: false, status: 0, error: String(e) }; }
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Could not read the request.' }, 400); }
  const slug = clean(body.slug, 120);
  const email = clean(body.email, 200).toLowerCase();
  const message = clean(body.message, 2000);
  const targets = Array.isArray(body.targets) ? [...new Set(body.targets.map(t => clean(t, 120)))].filter(t => /^[a-z0-9-]{2,120}$/.test(t) && t !== slug).slice(0, 4) : [];
  if (!/^[a-z0-9-]{2,120}$/.test(slug) || !EMAIL_RE.test(email) || message.length < 20) return json({ ok: false, error: 'Could not match your first message.' }, 400);
  if (!targets.length) return json({ ok: false, error: 'Pick at least one vendor.' }, 400);

  const secret = authSecret();
  let res: any;
  try { res = await rpc<any>('ceg_inquiry_more', { p_secret: secret, p_slug: slug, p_email: email, p_message: message, p_targets: targets }); }
  catch (e) { console.error('inquiry-more failed', e); return json({ ok: false, error: 'Something went wrong on our side. Please try again in a minute.' }, 500); }
  if (!res?.ok) {
    const msg: Record<string, string> = {
      not_found: 'We could not match your first message. Send it from each vendor page instead.',
      limit: 'This note has already gone to four more vendors.'
    };
    return json({ ok: false, error: msg[res?.error] || 'Something went wrong. Please try again.' }, res?.error === 'limit' ? 429 : 400);
  }

  const sent: string[] = []; const skipped: { slug: string; error: string }[] = []; const lines: string[] = [];
  for (const r of (res.results || []) as any[]) {
    if (!r.ok) { skipped.push({ slug: r.slug, error: r.error }); continue; }
    const v = r.vendor;
    const q: InquiryIn = { slug: v.slug, vendorName: v.name, names: res.names, email: res.email, weddingDate: res.wedding_date, guests: res.guests, message: res.message, sub_region: v.sub_region, category: v.category };
    let notified = false; let note = '';
    try {
      if (r.mode === 'account' && r.to) {
        const m = inquiryVendorEmail(q);
        const s = await sendReplyTo(r.to, res.email, m.subject, m.text, m.html);
        notified = s.ok; note = s.ok ? `full inquiry emailed to account ${r.to}` : `account email failed (${s.error})`;
      } else if (r.mode === 'notice' && r.to) {
        const m = inquiryNoticeEmail(q);
        const s = await sendMailResult(r.to, m.subject, m.text, m.html);
        notified = s.ok; note = s.ok ? `claim notice emailed to ${r.to}` : `claim notice failed (${s.error})`;
      } else note = 'no deliverable vendor address, kept for the owner';
    } catch (e) { console.error('inquiry-more delivery failed', e); note = `delivery error: ${String(e).slice(0, 200)}`; }
    try { await rpc('ceg_inquiry_mark', { p_secret: secret, p_id: r.id, p_notified: notified }); } catch (e) { console.error('inquiry mark failed', e); }
    sent.push(v.name);
    lines.push(`Inquiry ${r.id} for ${v.name} (${v.status}): ${note}.`);
  }

  if (lines.length) {
    try {
      const subj = `[CEG] Also ask: ${lines.length} more from inquiry ${res.id}`;
      const text = `${res.names} <${res.email}> copied inquiry ${res.id} for ${res.from_vendor} to ${lines.length} more vendors.\n\n${lines.join('\n')}`;
      naturalCheck(text, 'owner also ask line', [res.names, res.email, res.from_vendor, ...lines]);
      await sendMailResult(OWNER_EMAIL, subj, text);
    } catch (e) { console.error('owner notice failed', e); }
  }
  const limitMsg: Record<string, string> = { dup_vendor: 'already has your note today', email_daily: 'daily limit of five notes reached', site_hourly: 'busy right now, try later', not_eligible: 'not available' };
  return json({ ok: true, sent, skipped: skipped.map(s => ({ slug: s.slug, reason: limitMsg[s.error] || 'not sent' })) });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
