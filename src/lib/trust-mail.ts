// Reply tracking links, the inquiry reply reminder and the photo nudge. Every email is gated by naturalCheck.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { authSecret } from './cron';
import { textToHtml } from './mail';
import { naturalCheck, displayName, greetingFor, fmtDateLong, SITE_URL, POSTAL_ADDRESS, type RenderedMail } from './outreach';

// Signed "I replied" link: /api/inquiry-replied?i=<id>&s=<hmac>. The secret never leaves the server.
export function repliedSig(id: number | string): string {
  return createHmac('sha256', authSecret()).update(`replied:${id}`).digest('hex').slice(0, 32);
}
export function repliedSigOk(id: string, sig: string): boolean {
  if (!/^\d{1,12}$/.test(id) || !/^[0-9a-f]{32}$/.test(sig) || !authSecret()) return false;
  const a = Buffer.from(repliedSig(id)), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const repliedUrl = (id: number | string) => `${SITE_URL}/api/inquiry-replied?i=${id}&s=${repliedSig(id)}`;

const footer = (token: string, why: string) => `Thanks,
Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

${why} Stop these reminders here:
${SITE_URL}/api/unsub?t=${token}
`;

export type ReplyReminder = {
  inquiry_id: number; created_at: string; names: string; couple_email: string; wedding_date: string | null;
  vendor_name: string; slug: string; category: string; email: string; token: string;
};

export function renderReplyReminder(r: ReplyReminder): RenderedMail {
  const business = displayName(r.vendor_name);
  const names = String(r.names || 'A couple').trim();
  const when = fmtDateLong(r.wedding_date);
  const days = Math.max(2, Math.floor((Date.now() - Date.parse(r.created_at)) / 86_400_000));
  const subject = `Did you get a chance to answer ${names}?`;
  const text = `${greetingFor(r.email, business)}

${days === 2 ? "Two" : days} days ago ${names} asked about ${business} through Colorado Elopement Guide${when ? `, for a wedding on ${when}` : ''}. I have not seen a reply marked yet, so this is a small nudge in case the email got buried.

You can write back to them at ${r.couple_email}. Their message is also in your dashboard, and this link signs you in:
${SITE_URL}/vd/${r.token}

If you already answered, this link marks it as replied and I will not ask again:
${repliedUrl(r.inquiry_id)}

${footer(r.token, 'This is the only reminder for this inquiry.')}`;
  const allow = [r.vendor_name, business, names, r.couple_email];
  naturalCheck(subject, `reply reminder subject (${r.slug})`, allow);
  naturalCheck(text, `reply reminder body (${r.slug})`, allow);
  return { subject, text, html: textToHtml(text) };
}

export type PhotoNudge = { user_id: string; email: string; token: string; vendor_name: string; slug: string; category: string; sub_region: string | null };

export function renderPhotoNudge(u: PhotoNudge): RenderedMail {
  const business = displayName(u.vendor_name);
  const subject = `Your own photos on the ${business} listing`;
  const text = `${greetingFor(u.email, business)}

Your ${business} page on Colorado Elopement Guide still shows a photo we picked, not one you chose. Couples judge a listing in a second, and your own work tells them far more than whatever we found.

You can add a cover photo and a small gallery from your dashboard. This link signs you straight in:
${SITE_URL}/vd/${u.token}

Pick the few shots you would want a couple to see first. It takes a couple of minutes.

${footer(u.token, 'This is a one time note about photos.')}`;
  const allow = [u.vendor_name, business];
  naturalCheck(subject, `photo nudge subject (${u.slug})`, allow);
  naturalCheck(text, `photo nudge body (${u.slug})`, allow);
  return { subject, text, html: textToHtml(text) };
}
