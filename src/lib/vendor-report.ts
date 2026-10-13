// Monthly vendor stats report: one plain email per verified vendor account on the first Monday of each month,
// covering the previous Denver calendar month. Data comes from ceg_cron_vendor_reports (one row per account);
// every email is rendered here and gated by naturalCheck. Sends are tracked in p2_vendor_drip with
// step 30 + month index (report_step from the RPC), so no account ever gets the same month twice.
import {
  SITE_URL, POSTAL_ADDRESS, FOUNDING_CAP, naturalCheck, displayName, greetingFor, categoryPlural, slotLine,
  type RenderedMail
} from './outreach';
import { textToHtml, sendMailResult } from './mail';
import { rpc, sleep } from './cron';

export type ReportRow = {
  user_id: string; email: string; token: string; vendor_id: number; name: string; slug: string;
  category: string; sub_region: string | null; vendor_status: string; live_since: string | null;
  month_start: string; report_step: number;
  views: number; website_clicks: number; phone_clicks: number; inquiries: number;
  views_prev: number; prev_complete: boolean;
  category_rank: number; category_count: number; category_avg_views: number | string;
  is_featured: boolean; featured_open: number; founding_left: number;
  has_photo: boolean; has_phone: boolean; has_website: boolean; description_chars: number; gallery_count: number;
  already_sent: boolean; mailed_recently: boolean;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DASHBOARD = `${SITE_URL}/vendor-dashboard`;
const FEATURED_PAGE = `${SITE_URL}/featured`;
export const REPORT_MAX_WORDS = 220;
export const REPORT_CAP = 100;

const n0 = (x: unknown) => Math.max(0, Math.floor(Number(x) || 0));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th';
  return `${n}${s}`;
}
function monthIndex(iso: string): number { const m = /^\d{4}\D(\d{2})/.exec(iso || ''); return m ? Number(m[1]) - 1 : 0; }
// Words a reader sees, URLs excluded.
export const wordCount = (s: string) => s.split(/\s+/).filter(w => w && !/^https?:\/\//.test(w)).length;

// Fixes in the order they matter most to a couple deciding whether to click; the generic ones close the list.
function fixes(r: ReportRow): string[] {
  const out: string[] = [];
  if (!r.has_photo) out.push('Add a cover photo in your dashboard. Listings without one are easy to scroll past.');
  if (n0(r.description_chars) < 300) out.push('Write a fuller description covering who you work with, where you shoot or host, and what a small wedding with you looks like.');
  if (n0(r.gallery_count) < 3) out.push('Add a few gallery photos from real Colorado elopements so couples can see your style.');
  if (!r.has_website) out.push('Add your website so couples can see more of your work.');
  if (!r.has_phone) out.push('Add a phone number. Some couples would rather call than write.');
  out.push('Put the listing badge from your dashboard on your website. It links straight to your page here.');
  out.push(`Share your listing link with recent couples and on your social profiles: ${SITE_URL}/vendor/${r.slug}/`);
  return out;
}

export function renderMonthlyReport(r: ReportRow): RenderedMail {
  const business = displayName(r.name);
  const greeting = greetingFor(r.email, business);
  const mi = monthIndex(r.month_start);
  const month = MONTHS[mi];
  const prevMonth = MONTHS[(mi + 11) % 12];
  const views = n0(r.views), prev = n0(r.views_prev);
  const firstMonth = !!r.live_since && r.live_since >= r.month_start;
  const parts: string[] = [];

  if (views === 0) {
    const f = fixes(r).slice(0, 2);
    const extras: string[] = [];
    const clicks = n0(r.website_clicks) + n0(r.phone_clicks);
    if (clicks) extras.push(plural(clicks, 'click', 'clicks'));
    if (n0(r.inquiries)) extras.push(plural(n0(r.inquiries), 'inquiry', 'inquiries'));
    const before = prev > 0 && r.prev_complete && !firstMonth ? ` In ${prevMonth} it had ${prev}.` : '';
    parts.push(`Your ${business} listing had no profile views in ${month}${extras.length ? `, though it did get ${extras.join(' and ')}` : ''}.${before} The two changes that would help most:`);
    parts.push(`1. ${f[0]}\n2. ${f[1]}`);
  } else {
    parts.push(`Here is how your ${business} listing did in ${month}.`);
    parts.push([
      `Profile views: ${views}`,
      `Website clicks: ${n0(r.website_clicks)}`,
      `Phone clicks: ${n0(r.phone_clicks)}`,
      `Inquiries: ${n0(r.inquiries)}`
    ].join('\n'));
    let mom: string;
    if (firstMonth) mom = `${month} was your first month live, so there is nothing to compare yet.`;
    else if (!r.prev_complete) mom = `Our filtered counts start partway through ${prevMonth}, so next month brings the first fair comparison.`;
    else if (views > prev) mom = `That is up from ${prev} in ${prevMonth}.`;
    else if (views < prev) mom = `That is down from ${prev} in ${prevMonth}.`;
    else mom = `That matches ${prevMonth}.`;
    const avg = (Number(r.category_avg_views) || 0).toFixed(1).replace(/\.0$/, '');
    const rank = `Among ${n0(r.category_count)} ${categoryPlural(r.category)} on the site you ranked ${ordinal(Math.max(1, n0(r.category_rank)))} by views, and the average was ${avg}.`;
    parts.push(`${mom} ${rank}`);
    parts.push(`One thing to try this month: ${fixes(r)[0]}`);
  }

  if (!r.is_featured) {
    const open = n0(r.featured_open);
    const left = Math.min(FOUNDING_CAP, n0(r.founding_left));
    const line = slotLine(open, r.category, r.sub_region || 'other-colorado');
    const slots = open > 0 ? `${line}.` : `All Featured spots for ${line.replace(/^\d+ of \d+ Featured spots open for /, '')} are taken, and there is a waitlist.`;
    const price = left > 0
      ? ` Featured is 40 dollars a month, and the first ${FOUNDING_CAP} Featured vendors keep that price for as long as they stay subscribed (${left} founding ${left === 1 ? 'spot' : 'spots'} left).`
      : ' Featured is 40 dollars a month, cancel anytime.';
    parts.push(`${slots}${price} ${FEATURED_PAGE}`);
  }

  parts.push(`Your full numbers and 30 day chart: ${DASHBOARD}`);
  const subject = `Your ${business} numbers for ${month}`;
  const text = `${greeting}

${parts.join('\n\n')}

Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

Prefer not to get these monthly numbers? ${SITE_URL}/api/unsub?t=${r.token}
`;
  const allow = [r.name, business];
  naturalCheck(subject, `report subject (${r.slug})`, allow);
  naturalCheck(text, `report body (${r.slug})`, allow);
  const words = wordCount(text);
  if (words > REPORT_MAX_WORDS) throw new Error(`report body (${r.slug}) is ${words} words`);
  return { subject, text, html: textToHtml(text) };
}

// First Monday of the month, Denver time.
export function isFirstMondayDenver(d = new Date()): boolean {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short', day: 'numeric' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return p.weekday === 'Mon' && Number(p.day) <= 7;
}

// Weekly cron stage "monthly_reports". Real sends only on the first Monday; dry renders every account on any day.
export async function runMonthlyReports(secret: string, dry: boolean, deadline: number): Promise<Record<string, any>> {
  const s: Record<string, any> = { first_monday: isFirstMondayDenver(), dry };
  if (!dry && !s.first_monday) { s.skipped = 'not the first Monday of the month'; return s; }
  const rows = await rpc<ReportRow[]>('ceg_cron_vendor_reports', { p_secret: secret });
  s.accounts = rows.length; s.month = rows[0]?.month_start ?? null; s.step = rows[0]?.report_step ?? null;
  Object.assign(s, { sent: 0, would_send: 0, skipped_already: 0, skipped_recent: 0, render_errors: 0, send_errors: 0, stopped_for_time: 0 });
  const detail: Record<string, any>[] = []; const errors: string[] = [];
  let samples = 0;
  for (const r of rows) {
    if (r.already_sent) { s.skipped_already++; detail.push({ slug: r.slug, skip: 'already sent' }); continue; }
    if (r.mailed_recently) { s.skipped_recent++; detail.push({ slug: r.slug, skip: 'emailed in last 3 days' }); continue; }
    let m: RenderedMail;
    try { m = renderMonthlyReport(r); } catch (e) { s.render_errors++; errors.push(String(e).slice(0, 200)); continue; }
    const words = wordCount(m.text);
    if (dry) {
      if (s.would_send >= REPORT_CAP) break;
      s.would_send++;
      const d: Record<string, any> = { slug: r.slug, words, subject: m.subject, views: r.views, featured: r.is_featured };
      if (samples < 3) { d.body = m.text.replace(/\?t=[0-9a-f-]+/i, '?t=TOKEN'); samples++; }
      detail.push(d); continue;
    }
    if (s.sent >= REPORT_CAP) break;
    if (Date.now() > deadline) { s.stopped_for_time++; continue; }
    // Mark before sending so a retry or overlapping run can never mail the same month twice.
    try {
      const fresh = await rpc<boolean>('ceg_cron_drip_mark', { p_secret: secret, p_user_id: r.user_id, p_step: r.report_step });
      if (fresh === false) { s.skipped_already++; continue; }
    } catch (e) { errors.push(`mark ${r.slug}: ${String(e).slice(0, 150)}`); continue; }
    const res = await sendMailResult(r.email, m.subject, m.text, m.html);
    if (res.ok) { s.sent++; detail.push({ slug: r.slug, words, id: res.id }); }
    else { s.send_errors++; errors.push(`send ${r.slug}: ${res.status} ${res.error || ''}`.slice(0, 200)); }
    await sleep(300);
  }
  s.detail = detail; if (errors.length) s.errors = errors;
  return s;
}
