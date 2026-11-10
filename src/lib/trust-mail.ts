// Reply tracking links, the inquiry reply reminder, the photo nudge, and the release of inquiries that arrived
// before a vendor claimed. Every email is gated by naturalCheck.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { authSecret, rpc, sleep } from './cron';
import { textToHtml, sendMailReplyTo } from './mail';
import { naturalCheck, displayName, greetingFor, fmtDateLong, inquiryVendorEmail, tagLinks, SITE_URL, POSTAL_ADDRESS, type RenderedMail, type InquiryIn } from './outreach';

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

If you already answered, open this link and press the button to mark it as replied, and I will not ask again:
${repliedUrl(r.inquiry_id)}

${footer(r.token, 'This is the only reminder for this inquiry.')}`;
  const allow = [r.vendor_name, business, names, r.couple_email];
  naturalCheck(subject, `reply reminder subject (${r.slug})`, allow);
  naturalCheck(text, `reply reminder body (${r.slug})`, allow);
  // UTM: every link here is a token or signed link today (/vd, /api), so tagLinks leaves them as is. It is wired in so
  // a plain site link added later is tagged. Released inquiries are tagged inquiry_released inside inquiryVendorEmail.
  return { subject, text, html: tagLinks(textToHtml(text), 'reply_reminder', 'vendor') };
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
  return { subject, text, html: tagLinks(textToHtml(text), 'photo_nudge', 'vendor') };
}

// ---------- Inquiries that arrived before the vendor had an account ----------
// An inquiry to an unclaimed listing is delivered as a short notice without the couple's details (delivery_mode
// 'notice'), or kept for the owner when there was no address at all ('owner'). When that vendor later claims and
// verifies, nothing used to send them the actual message (inquiry 24 to Pikes Peak Ranch, claimed 2026-10-24, was
// never emailed in full). This sends the full inquiry to the verified account email, Reply To the couple, and flips
// delivery_mode to 'account' so it goes out once. ceg_cron_pending_inquiries selects, ceg_inquiry_release flips
// before the send (true only for the run that changed the row) and undoes the flip when Resend refuses; a good send
// is stamped with ceg_inquiry_mark (delivered_at, vendor_notified). Runs daily from the cron (stage pending_inquiries)
// and from /api/vendor-welcome right after an account is provisioned. Needs the two RPCs in the A4 audit SQL; until
// they exist the stage reports a fatal rpc error and sends nothing.
export type PendingInquiry = {
  id: number; names: string; couple_email: string; wedding_date: string | null; guests: number | null; message: string;
  vendor_id: number; slug: string; vendor_name: string; vendor_status: string; sub_region: string; category: string;
  account_email: string; delivery_mode: string; created_at: string;
};

export async function releasePendingInquiries(secret: string, opts: { vendorId?: number | null; limit?: number; dry?: boolean } = {}): Promise<Record<string, any>> {
  const out: Record<string, any> = { due: 0, sent: [] as unknown[], failed: [] as unknown[], blocked: [] as unknown[], ...(opts.dry ? { would_send: [] as unknown[] } : {}) };
  const rows = (await rpc<PendingInquiry[] | null>('ceg_cron_pending_inquiries', { p_secret: secret, p_vendor_id: opts.vendorId ?? null, p_limit: opts.limit ?? 20 })) || [];
  out.due = rows.length;
  for (const r of rows) {
    const sentAt = r.created_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(r.created_at)) : null;
    const q: InquiryIn = { slug: r.slug, vendorName: r.vendor_name, names: r.names, email: r.couple_email, weddingDate: r.wedding_date, guests: r.guests, message: r.message, sub_region: r.sub_region, category: r.category, sentAt };
    let m: RenderedMail;
    try { m = inquiryVendorEmail(q, repliedUrl(r.id)); }
    catch (e) { out.blocked.push({ inquiry: r.id, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
    if (opts.dry) { out.would_send.push({ inquiry: r.id, vendor: r.slug, to: r.account_email, was: r.delivery_mode, subject: m.subject }); continue; }
    let flipped = false;
    try { flipped = Boolean(await rpc<boolean>('ceg_inquiry_release', { p_secret: secret, p_id: r.id, p_undo: false })); }
    catch (e) { out.failed.push({ inquiry: r.id, error: 'release mark failed, not sent: ' + String(e).slice(0, 200) }); continue; }
    if (!flipped) continue; // another run got it first
    const res = await sendMailReplyTo('inquiry', r.account_email, r.couple_email, m.subject, m.text, m.html);
    if (res.ok) {
      out.sent.push({ inquiry: r.id, vendor: r.slug, to: r.account_email, was: r.delivery_mode, id: res.id });
      try { await rpc('ceg_inquiry_mark', { p_secret: secret, p_id: r.id, p_notified: true }); } catch { /* noop: the flip already stops a resend */ }
    } else {
      out.failed.push({ inquiry: r.id, vendor: r.slug, status: res.status, error: res.error });
      try { await rpc('ceg_inquiry_release', { p_secret: secret, p_id: r.id, p_undo: true }); } catch { /* noop */ }
    }
    await sleep(300);
  }
  return out;
}
