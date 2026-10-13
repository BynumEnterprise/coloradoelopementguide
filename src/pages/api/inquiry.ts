export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret } from '../../lib/cron';
import { sendMailResult, MAIL_FROM, OWNER_EMAIL } from '../../lib/mail';
import { repliedUrl } from '../../lib/trust-mail';
import { renderInquiryConfirm } from '../../lib/couple-mail';
import { inquiryVendorEmail, inquiryNoticeEmail, naturalCheck, type InquiryIn } from '../../lib/outreach';

// Couple inquiry from a vendor page ("Check Availability"). Validates, filters spam, rate limits and stores
// through ceg_inquiry_submit, then delivers: full inquiry to a claimed or Featured vendor's account email
// (Reply To the couple), a short claim notice without the couple's details to an unclaimed vendor, or nothing
// but the owner notice when no deliverable address exists. The owner always gets a one line notice.

const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[A-Za-z]{2,}$/;
const URL_COUNT_RE = /(https?:\/\/|www\.)[^\s]+/gi;
const SPAM_RE = /\b(seo|backlinks?|guest posts?|link building|domain authority|crypto|bitcoin|btc|usdt|forex|nft|explainer videos?|promo(tional)? videos?|video ads?|animated videos?|first page (of|on) google|rank(ing)? (higher|on google|your (site|website))|web(site)? traffic|more traffic|increase (your )?traffic|lead generation|marketing services|web design services|virtual assistant|casino|loan offer)\b/i;

// Same as sendMailResult, plus a Reply To of the couple (sendMailResult always replies to the owner inbox).
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

const clean = (s: unknown, max: number) => String(s ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) body = await request.json();
    else body = Object.fromEntries((await request.formData()).entries());
  } catch { return json({ ok: false, error: 'Could not read the form.' }, 400); }

  // Honeypot: pretend it worked, store nothing.
  if (clean(body.company_site, 200) !== '') return json({ ok: true, mode: 'notice' });
  const elapsed = Number(body.elapsed_ms || 0);
  if (!Number.isFinite(elapsed) || elapsed < 3000) return json({ ok: false, error: 'That was quick. Please read it over and send again.' }, 400);

  const slug = clean(body.slug, 120);
  const names = clean(body.names, 120).replace(/\s+/g, ' ');
  const email = clean(body.email, 200).toLowerCase();
  const message = clean(body.message, 2000);
  const dateRaw = clean(body.wedding_date, 10);
  const guestsRaw = clean(body.guests, 6);
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) return json({ ok: false, error: 'Unknown vendor.' }, 400);
  if (names.length < 2) return json({ ok: false, error: 'Add your names.' }, 400);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Check your email address.' }, 400);
  if (message.length < 20 || message.length > 1500) return json({ ok: false, error: 'Your message should be between 20 and 1,500 characters.' }, 400);
  let weddingDate: string | null = null;
  if (dateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) || isNaN(Date.parse(dateRaw))) return json({ ok: false, error: 'Check the wedding date.' }, 400);
    weddingDate = dateRaw;
  }
  let guests: number | null = null;
  if (guestsRaw) {
    guests = Number(guestsRaw.replace(/[^0-9]/g, ''));
    if (!Number.isInteger(guests) || guests < 1 || guests > 500) return json({ ok: false, error: 'Check the guest count.' }, 400);
  }

  const urlCount = (message.match(URL_COUNT_RE) || []).length + (names.match(URL_COUNT_RE) || []).length;
  const spam = urlCount > 2 || SPAM_RE.test(message) || SPAM_RE.test(names) || /https?:\/\//i.test(names);

  const secret = authSecret();
  let res: any;
  try {
    res = await rpc<any>('ceg_inquiry_submit', { p_secret: secret, p_slug: slug, p_names: names, p_email: email,
      p_wedding_date: weddingDate, p_guests: guests, p_message: message, p_spam: spam });
  } catch (e) {
    console.error('inquiry submit failed', e);
    return json({ ok: false, error: 'Something went wrong on our side. Please try again in a minute.' }, 500);
  }
  if (!res?.ok) {
    const msg: Record<string, string> = {
      vendor_not_found: 'This listing is no longer available.',
      dup_vendor: 'You already sent this vendor a note today. Give them a day or two to reply.',
      email_daily: 'You have sent five inquiries today. Please try again tomorrow.',
      site_hourly: 'We are getting a lot of messages right now. Please try again in an hour.'
    };
    return json({ ok: false, error: msg[res?.error] || 'Something went wrong. Please try again.' }, res?.error === 'vendor_not_found' ? 404 : 429);
  }
  // Spam is stored with status spam and nobody is emailed; the couple sees the ordinary confirmation.
  if (res.status === 'spam') return json({ ok: true, mode: 'notice' });

  const v = res.vendor;
  const q: InquiryIn = { slug: v.slug, vendorName: v.name, names, email, weddingDate, guests, message, sub_region: v.sub_region, category: v.category };
  let notified = false; let note = '';
  try {
    if (res.mode === 'account' && res.to) {
      const m = inquiryVendorEmail(q, repliedUrl(res.id));
      const r = await sendReplyTo(res.to, email, m.subject, m.text, m.html);
      notified = r.ok; note = r.ok ? `full inquiry emailed to account ${res.to}` : `account email failed (${r.error})`;
    } else if (res.mode === 'notice' && res.to) {
      const m = inquiryNoticeEmail(q);
      const r = await sendMailResult(res.to, m.subject, m.text, m.html);
      notified = r.ok; note = r.ok ? `claim notice emailed to ${res.to}` : `claim notice failed (${r.error})`;
    } else {
      note = 'no deliverable vendor address, kept for the owner';
    }
  } catch (e) { console.error('inquiry delivery failed', e); note = `delivery error: ${String(e).slice(0, 200)}`; }
  try { await rpc('ceg_inquiry_mark', { p_secret: secret, p_id: res.id, p_notified: notified }); } catch (e) { console.error('inquiry mark failed', e); }

  // Owner notice: one line. Couple text is allowed through naturalCheck; only our wording is checked.
  try {
    const subj = `[CEG] Inquiry ${res.id} for ${v.name}`;
    const line = `Inquiry ${res.id} for ${v.name} (${v.status}) from ${names} <${email}>: ${note}.`;
    naturalCheck(line, 'owner inquiry line', [v.name, names, email, note]);
    await sendMailResult(OWNER_EMAIL, subj, line);
  } catch (e) { console.error('owner notice failed', e); }

  // Couple confirmation: one per inquiry (ceg_inquiry_confirm holds the slot; spam never reaches here).
  let confirmed = false;
  try {
    const c = await rpc<any>('ceg_inquiry_confirm', { p_secret: secret, p_id: res.id });
    if (c?.ok) {
      let ok = false;
      try {
        const m = renderInquiryConfirm({ mode: res.mode, vendor: c.vendor, similar: c.similar || [], names, email, weddingDate, guests, message });
        const r = await sendMailResult(email, m.subject, m.text, m.html);
        ok = r.ok; if (!r.ok) console.error('couple confirm failed', r.status, r.error);
      } catch (e) { console.error('couple confirm render/send error', e); }
      await rpc('ceg_inquiry_confirm_mark', { p_secret: secret, p_id: res.id, p_ok: ok });
      confirmed = ok;
    }
  } catch (e) { console.error('couple confirm error', e); }

  return json({ ok: true, mode: res.mode === 'account' ? 'account' : 'notice', vendor: v.name, email, confirm: confirmed });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
