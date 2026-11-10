export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, sleep, authSecret, cronAuthorized, fetchWithTimeout, mapLimit, fireDeployHook } from '../../../lib/cron';
import { sendMailResult } from '../../../lib/mail';
import { renderV4, renderDrip, renderFollowup, renderActivation, FEATURED_PITCHES_PAUSED, type OutreachVendor, type DripUser, type FollowupVendor, type ActivationUser, type RegionDemand, type VendorDemand } from '../../../lib/outreach';
import { renderNurture, sendCoupleMail, type NurtureRecipient } from '../../../lib/couple-mail';
import { renderReplyReminder, renderPhotoNudge, releasePendingInquiries, type ReplyReminder, type PhotoNudge } from '../../../lib/trust-mail';
import { runQueueStage } from '../../../lib/welcome-queue';

// Daily P2 automation (Vercel cron, 17:00 UTC, moved from 15:00 on 2026-11-09 so the morning Gmail reply review,
// about 14:00 to 15:00 UTC, logs replies and opt outs before anything is sent):
//   1. contact discovery for up to 12 seeded vendors with a website and no email
//   2. up to 25 Template v4 claim invites via Resend, marked sent_v1
//   3. onboarding drips for vendor accounts (one email per user per run)
//   4. couple nurture emails (kit, region, permits, vendors, planner nudge), 50 per Denver day
//   2c. one time activation note (drip step 10) to accounts that existed on 2026-10-12, sent once each
//       vendor is clear of any email from us for 3 days; it runs before the drips so it takes the slot
// Query flags for manual runs: ?dry=1 renders and checks but sends nothing;
//   ?only=featured_rotation|bounces|analytics|discovery|outreach|followups|activation|queue|pending_inquiries|drips|nurture|reply_reminders|photo_nudges;
//   ?force=1 lets featured_rotation run on a day other than Tuesday (manual first run).
//   0. featured_rotation: free Featured trial. Tuesdays (Denver) through p2_config trial_rotation_until, ends the active
//      cohort and starts a new 7 day one (3 per category) via ceg_cron_trial_rotate, then fires the deploy hook. Runs
//      first because it is one cheap RPC that changes what the site shows; on any day it also closes a cohort whose
//      end date has passed (safety net for a missed Tuesday run after the window closes).
//   2d. pending_inquiries: inquiries that arrived before the vendor had an account (delivery_mode notice or owner) are
//      emailed in full to the now verified account and flipped to account mode, once each (src/lib/trust-mail.ts).
//   Drip step 3 (the Featured note) is held: owner directive 5c, no Featured pitches until traffic is up.
// Function duration is raised to 300s in astro.config.mjs (adapter maxDuration).

const DISCOVERY_LIMIT = 12;
const OUTREACH_LIMIT = 25;
const PAGE_TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 ColoradoElopementGuide/1.0';

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JUNK_DOMAIN = /(sentry|wixpress|wix\.com|example\.|w3\.org|schema\.org|squarespace|godaddy|shopify|wordpress|automattic|google\.com|facebook|instagram|mailchimp|hubspot|zendesk|cloudflare|yourdomain|domain\.com|email\.com|test\.com|mysite\.com|latofonts|jquery|placeholder|sentry\.io|\.gov$|\.edu$|\.(png|jpe?g|gif|svg|webp|css|js)$)/i;
const JUNK_LOCAL = /^(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon|postmaster|abuse|privacy|dmca|legal|webmaster|hostmaster|bounce|unsubscribe|notifications?|alerts?|wixpress|example|user|name|email|you|yourname|someone|test|xxx|[0-9a-f]{20,})$/i;
const FREE_PROVIDER = /^(gmail|yahoo|hotmail|outlook|icloud|me|mac|aol|comcast|msn|live|protonmail|proton|pm|ymail|att|verizon|earthlink|q|mail)\.(com|net|me|co)$/i;
const PREFERRED_LOCAL = ['info', 'hello', 'hi', 'contact', 'events', 'weddings', 'bookings', 'booking', 'inquiries', 'inquiry', 'studio', 'sales', 'team', 'office', 'admin', 'mail', 'book', 'say', 'howdy', 'hey'];

type Discovered = { id: number; email: string | null; source?: string; error?: string };

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}

// Cloudflare email obfuscation: data-cfemail="hex" where byte 0 is the xor key.
function decodeCfEmails(html: string): string[] {
  const out: string[] = [];
  const re = /data-cfemail="([0-9a-f]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const hex = m[1]; const key = parseInt(hex.slice(0, 2), 16); let s = '';
    for (let i = 2; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    if (EMAIL_RE.test(s)) out.push(s);
    EMAIL_RE.lastIndex = 0;
  }
  return out;
}

function hostOf(website: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch { return null; }
}

async function fetchPage(url: string): Promise<string> {
  const r = await fetchWithTimeout(url, PAGE_TIMEOUT_MS, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'follow' });
  if (!r.ok) return '';
  const ct = r.headers.get('content-type') || '';
  if (ct && !/html|text|xml/i.test(ct)) return '';
  const text = await r.text();
  return text.slice(0, 1_500_000);
}

function pickEmail(candidates: string[], vendorHost: string | null): { email: string; source: string } | null {
  const seen = new Set<string>();
  const clean = candidates.map(e => e.toLowerCase().replace(/^[^a-z0-9]+/, '').replace(/[.]+$/, '')).filter(e => {
    if (seen.has(e)) return false; seen.add(e);
    const [local, domain] = e.split('@');
    if (!local || !domain || e.length > 80) return false;
    if (JUNK_DOMAIN.test(domain) || JUNK_LOCAL.test(local)) return false;
    if (/^(x|u00|%)/.test(local) || /\.(png|jpe?g|gif|svg|webp)$/i.test(e)) return false;
    return true;
  });
  const rank = (e: string) => { const i = PREFERRED_LOCAL.indexOf(e.split('@')[0]); return i < 0 ? 99 : i; };
  if (vendorHost) {
    const root = vendorHost.split('.').slice(-2).join('.');
    const own = clean.filter(e => { const d = e.split('@')[1]; return d === vendorHost || d.endsWith('.' + root) || d === root; }).sort((a, b) => rank(a) - rank(b));
    if (own.length) return { email: own[0], source: 'own_domain' };
  }
  const personal = clean.filter(e => FREE_PROVIDER.test(e.split('@')[1])).sort((a, b) => rank(a) - rank(b));
  if (personal.length) return { email: personal[0], source: 'personal_provider' };
  return null; // anything else is most likely a web agency or a platform address
}

async function discoverOne(t: { id: number; website: string; domain: string | null }): Promise<Discovered> {
  const host = (t.domain || '').toLowerCase().replace(/^www\./, '') || hostOf(t.website);
  const base = /^https?:\/\//i.test(t.website) ? t.website.replace(/\/+$/, '') : `https://${t.website.replace(/\/+$/, '')}`;
  let origin = base;
  try { origin = new URL(base).origin; } catch { /* keep base */ }
  const pages = [`${origin}/`, `${origin}/contact`, `${origin}/about`];
  const settled = await Promise.allSettled(pages.map(fetchPage));
  const html = settled.map(s => s.status === 'fulfilled' ? s.value : '').join('\n');
  if (!html.trim()) return { id: t.id, email: null, error: 'no pages fetched' };
  const decoded = decodeEntities(html.replace(/mailto:/gi, ' mailto:'));
  const found = [...(decoded.match(EMAIL_RE) || []), ...decodeCfEmails(html)];
  const pick = pickEmail(found, host);
  return pick ? { id: t.id, email: pick.email, source: pick.source } : { id: t.id, email: null };
}

export const GET: APIRoute = async ({ request }) => {
  if (!cronAuthorized(request)) return json({ error: 'unauthorized' }, 401);
  const secret = authSecret();
  if (!secret) return json({ error: 'CEG_AUTH_SECRET missing' }, 500);
  const url = new URL(request.url);
  const dry = url.searchParams.get('dry') === '1';
  const only = url.searchParams.get('only');
  const run = (stage: string) => !only || only === stage;
  const started = Date.now();
  const summary: Record<string, unknown> = { ok: true, ran_at: new Date().toISOString(), dry };

  // 0. Featured trial rotation (?only=featured_rotation, ?force=1 ignores the weekday). Idempotent per Denver date.
  //    On the last Tuesday of the window (today == until) the active cohort is ended and no new one starts, so vendors
  //    revert to their previous status with featured_source cleared and no email (ceg_cron_trial_rotate, _ceg_trial_close).
  //    Any other day: if a cohort is still open past its 7 day end, close it anyway so a missed run cannot leave trial
  //    vendors Featured for free indefinitely.
  if (run('featured_rotation')) {
    const fr: Record<string, unknown> = {};
    try {
      const now = new Date();
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short' }).format(now);
      const force = url.searchParams.get('force') === '1';
      fr.today = today; fr.weekday = weekday;
      const until = await rpc<string | null>('ceg_cron_trial_until', { p_secret: secret });
      fr.until = until;
      const inWindow = !!until && today <= until;
      if ((force || weekday === 'Tue') && inWindow) {
        const end = new Date(today + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + 7);
        const startNew = today < until!;
        const res = await rpc<any>('ceg_cron_trial_rotate', { p_secret: secret, p_cohort_start: today,
          p_cohort_end: startNew ? end.toISOString().slice(0, 10) : null, p_per_category: 3, p_dry: dry });
        fr.result = res;
        if (!dry && res && ((res.started ?? 0) > 0 || (res.ended ?? 0) > 0)) fr.deploy = await fireDeployHook();
      } else {
        fr.skipped = !inWindow ? 'rotation window over' : 'not Tuesday';
        // Safety net: a dry call lists the open cohort; close it when its end date (start + 7) is today or earlier.
        const peek = await rpc<any>('ceg_cron_trial_rotate', { p_secret: secret, p_cohort_start: null, p_cohort_end: null, p_per_category: 3, p_dry: true });
        const open: { cohort_start?: string }[] = Array.isArray(peek?.would_end) ? peek.would_end : [];
        const overdue = open.filter(t => {
          if (!t.cohort_start) return false;
          const e = new Date(String(t.cohort_start).slice(0, 10) + 'T12:00:00Z'); e.setUTCDate(e.getUTCDate() + 7);
          return e.toISOString().slice(0, 10) <= today;
        });
        fr.open_trials = open.length; fr.overdue = overdue.length;
        if (overdue.length) {
          if (dry) fr.would_close = overdue.length;
          else {
            const res = await rpc<any>('ceg_cron_trial_rotate', { p_secret: secret, p_cohort_start: null, p_cohort_end: null, p_per_category: 3, p_dry: false });
            fr.closed = res?.ended ?? 0; fr.closed_list = res?.ended_list ?? [];
            if ((res?.ended ?? 0) > 0) fr.deploy = await fireDeployHook();
          }
        }
      }
    } catch (e) { fr.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.featured_rotation = fr;
  }

  // 0b. Bounces. Resend answers 2xx on accept and reports the bounce later, so we poll the last two pages of the
  //     account's send log and hand bounced, complained and failed recipients to ceg_mail_bounced, which marks the
  //     vendor (outreach_status bounced), the account email (email_bounced_at) and any notice sent in the last 2 days.
  //     Every due list then skips those addresses. Idempotent: the RPC dedupes on the Resend email id.
  if (run('bounces')) {
    const b: Record<string, unknown> = { scanned: 0, bad: 0 };
    try {
      const key = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
      if (!key) throw new Error('no RESEND_API_KEY');
      const since = Date.now() - 4 * 86_400_000;
      const bad: { id: string; to: string; subject: string; last_event: string; created_at: string }[] = [];
      let after = '';
      for (let page = 0; page < 4; page++) {
        const r = await fetchWithTimeout(`https://api.resend.com/emails?limit=100${after ? `&after=${after}` : ''}`, 15_000, { headers: { Authorization: `Bearer ${key}` } });
        if (!r.ok) throw new Error(`resend list ${r.status}`);
        const body: any = await r.json();
        const rows: any[] = Array.isArray(body?.data) ? body.data : [];
        if (!rows.length) break;
        b.scanned = (b.scanned as number) + rows.length;
        for (const m of rows) {
          if (!String(m.from || '').includes('coloradoelopementguide')) continue;
          if (!['bounced', 'complained', 'failed'].includes(m.last_event)) continue;
          const to = Array.isArray(m.to) ? m.to[0] : m.to;
          if (!to) continue;
          bad.push({ id: m.id, to, subject: String(m.subject || '').replace(/;/g, ',').slice(0, 200), last_event: m.last_event, created_at: m.created_at });
        }
        const last = rows[rows.length - 1];
        if (!body.has_more || !last || Date.parse(last.created_at) < since) break;
        after = last.id;
      }
      b.bad = bad.length;
      if (bad.length && !dry) b.result = await rpc('ceg_mail_bounced', { p_secret: secret, p_rows: bad });
      if (dry) b.would_mark = bad.map(x => ({ to: x.to, event: x.last_event, at: x.created_at }));
      // Spam complaints and hard bounces go on the suppression list, which every lifecycle and marketing send and every
      // cron selector checks (owner directive 2026-11-09). A complaint is an unsubscribe in the strongest form.
      // Resend reports a permanent bounce as last_event 'bounced' (soft ones stay 'delivery_delayed'); 'failed' is
      // our side and is not a reason to suppress. ceg_unsubscribe_email is idempotent, so re polling is harmless.
      const sup = new Map<string, { reason: string; source: string }>();
      for (const x of bad) {
        const e = String(x.to).trim().toLowerCase();
        if (x.last_event === 'complained') sup.set(e, { reason: 'complaint', source: 'resend_complaint' });
        else if (x.last_event === 'bounced' && !sup.has(e)) sup.set(e, { reason: 'bounce', source: 'resend_bounce' });
      }
      b.suppress = sup.size;
      if (dry) b.would_suppress = [...sup].map(([e, v]) => ({ to: e, reason: v.reason }));
      else {
        let n = 0; const errs: string[] = [];
        for (const [e, v] of sup) {
          try { await rpc('ceg_unsubscribe_email', { p_secret: secret, p_email: e, p_reason: v.reason, p_source: v.source, p_note: null }); n++; }
          catch (err) { errs.push(`${e}: ${String(err).slice(0, 120)}`); }
        }
        b.suppressed = n; if (errs.length) { b.suppress_errors = errs; summary.ok = false; }
      }
    } catch (e) { b.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.bounces = b;
  }

  // 0c. Analytics hygiene: flag email link scanner hits (one page per session inside the 12 minutes after a send burst)
  //     as bots so the admin Traffic tab and the digest report people, not mail servers.
  if (run('analytics')) {
    const an: Record<string, unknown> = {};
    try { an.scanner_hits_flagged = dry ? 'skipped (dry)' : await rpc<number>('ceg_cron_flag_scanners', { p_secret: secret, p_days: 3 }); }
    catch (e) { an.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.analytics = an;
  }

  // 1. Contact discovery
  if (run('discovery')) {
    const d: Record<string, unknown> = { targets: 0, found: [] as unknown[], no_email: [] as number[], errors: [] as unknown[] };
    try {
      const targets = await rpc<{ id: number; name: string; slug: string; website: string; domain: string | null }[]>('ceg_cron_discovery_targets', { p_secret: secret, p_limit: DISCOVERY_LIMIT });
      d.targets = targets.length;
      const results = await mapLimit(targets, 4, discoverOne);
      const noEmail: number[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i]; const t = targets[i];
        if (r.status === 'rejected') { (d.errors as unknown[]).push({ id: t.id, error: String(r.reason).slice(0, 200) }); noEmail.push(t.id); continue; }
        if (r.value.email) {
          (d.found as unknown[]).push({ id: t.id, slug: t.slug, email: r.value.email, source: r.value.source });
          if (!dry) { try { await rpc('ceg_cron_set_contact', { p_secret: secret, p_id: t.id, p_email: r.value.email }); } catch (e) { (d.errors as unknown[]).push({ id: t.id, error: String(e).slice(0, 200) }); } }
        } else noEmail.push(t.id);
      }
      d.no_email = noEmail;
      if (!dry && noEmail.length) d.marked_no_email = await rpc<number>('ceg_cron_set_no_email', { p_secret: secret, p_ids: noEmail });
    } catch (e) { d.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.discovery = d;
  }

  // 2. Outreach (Template v4)
  if (run('outreach')) {
    const o: Record<string, unknown> = { batch: 0, sent: [] as number[], failed: [] as unknown[], blocked: [] as unknown[], marked: 0 };
    const sentIds: number[] = [];
    const previews: unknown[] = [];
    if (dry) o.preview = previews;
    try {
      const batch = await rpc<OutreachVendor[]>('ceg_cron_outreach_batch', { p_secret: secret, p_limit: OUTREACH_LIMIT });
      o.batch = batch.length;
      for (const v of batch) {
        if (Date.now() - started > 200_000) { o.stopped_early = 'time budget'; break; }
        let mail;
        try { mail = renderV4(v); }
        catch (e) { (o.blocked as unknown[]).push({ id: v.id, slug: v.slug, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
        if (dry) { (o.sent as number[]).push(v.id); previews.push({ to: v.contact_email, subject: mail.subject, text: mail.text }); continue; }
        const res = await sendMailResult('marketing', v.contact_email, mail.subject, mail.text, mail.html);
        if (res.ok) { sentIds.push(v.id); (o.sent as number[]).push(v.id); }
        else if (res.suppressed) ((o.suppressed ??= []) as unknown[]).push(v.id);
        else (o.failed as unknown[]).push({ id: v.id, status: res.status, error: res.error });
        await sleep(300);
      }
    } catch (e) { o.fatal = String(e).slice(0, 300); summary.ok = false; }
    finally {
      if (sentIds.length) {
        try { o.marked = await rpc<number>('ceg_cron_mark_sent', { p_secret: secret, p_ids: sentIds, p_template: 'v4' }); }
        catch (e) { o.mark_error = String(e).slice(0, 300); summary.ok = false; }
      }
    }
    summary.outreach = o;
  }


  // 2b. Follow ups (day 4 and day 10) to invited vendors who never answered
  if (run('followups')) {
    const f: Record<string, unknown> = { batch: 0, sent: [] as unknown[], failed: [] as unknown[], blocked: [] as unknown[], marked: 0 };
    const doneIds: number[] = [];
    try {
      const batch = await rpc<FollowupVendor[]>('ceg_cron_followup_batch', { p_secret: secret, p_limit: 25 });
      f.batch = batch.length;
      for (const v of batch) {
        if (Date.now() - started > 230_000) { f.stopped_early = 'time budget'; break; }
        let mail;
        try { mail = renderFollowup(v); }
        catch (e) { (f.blocked as unknown[]).push({ id: v.id, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
        if (dry) { (f.sent as unknown[]).push({ id: v.id, step: v.followups + 1, subject: mail.subject }); continue; }
        const res = await sendMailResult('marketing', v.contact_email, mail.subject, mail.text, mail.html);
        if (res.ok) { doneIds.push(v.id); (f.sent as unknown[]).push({ id: v.id, slug: v.slug, step: v.followups + 1 }); }
        else if (res.suppressed) ((f.suppressed ??= []) as unknown[]).push(v.id);
        else (f.failed as unknown[]).push({ id: v.id, status: res.status, error: res.error });
        await sleep(300);
      }
    } catch (e) { f.fatal = String(e).slice(0, 300); summary.ok = false; }
    finally {
      if (doneIds.length) {
        try { f.marked = await rpc<number>('ceg_cron_followup_mark', { p_secret: secret, p_ids: doneIds }); }
        catch (e) { f.mark_error = String(e).slice(0, 300); summary.ok = false; }
      }
    }
    summary.followups = f;
  }

  // 2c. Activation note (drip step 10). The row is written before the send so drips stay spaced.
  if (run('activation')) {
    const ac: Record<string, unknown> = { due: 0, sent: [] as unknown[], failed: [] as unknown[], blocked: [] as unknown[] };
    try {
      const due = await rpc<ActivationUser[]>('ceg_cron_activation_due', { p_secret: secret });
      ac.due = due.length;
      let left = 10;
      try { const st = await rpc<{ founding_left: number }>('ceg_public_stats', {}); if (st && typeof st.founding_left === 'number') left = st.founding_left; } catch { /* keep default */ }
      ac.founding_left = left;
      for (const u of due) {
        if (Date.now() - started > 240_000) { ac.stopped_early = 'time budget'; break; }
        let mail;
        try { mail = renderActivation(u, left); }
        catch (e) { (ac.blocked as unknown[]).push({ user: u.user_id, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
        if (dry) { (ac.sent as unknown[]).push({ to: u.email, vendor: u.slug, subject: mail.subject, text: mail.text }); continue; }
        try { await rpc('ceg_cron_drip_mark', { p_secret: secret, p_user_id: u.user_id, p_step: 10 }); }
        catch (e) { (ac.failed as unknown[]).push({ user: u.user_id, error: 'mark failed, not sent: ' + String(e).slice(0, 200) }); continue; }
        const res = await sendMailResult('lifecycle', u.email, mail.subject, mail.text, mail.html);
        if (res.ok) (ac.sent as unknown[]).push({ user: u.user_id, vendor: u.slug, id: res.id });
        else if (res.suppressed) ((ac.suppressed ??= []) as unknown[]).push(u.user_id); // step stays marked: never retried
        else (ac.failed as unknown[]).push({ user: u.user_id, vendor: u.slug, status: res.status, error: res.error });
        await sleep(300);
      }
    } catch (e) { ac.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.activation = ac;
  }

  // 2c2. queue (?only=queue): backup run of the 15 minute queue (src/lib/welcome-queue.ts): Maps lookup for listings added
  //      by the cloud tasks, welcome emails for claims they confirmed, one deploy hook for pending requests.
  if (run('queue')) {
    let qu: Record<string, unknown>;
    try { qu = await runQueueStage(secret, { dry, started, budgetMs: 120_000 }); if (!qu.ok) summary.ok = false; }
    catch (e) { qu = { fatal: String(e).slice(0, 300) }; summary.ok = false; }
    summary.queue = qu;
  }

  // 2d. Inquiries that arrived before the vendor claimed: full copy to the verified account, once each.
  if (run('pending_inquiries')) {
    let pi: Record<string, unknown>;
    try { pi = await releasePendingInquiries(secret, { limit: 20, dry }); }
    catch (e) { pi = { fatal: String(e).slice(0, 300) }; summary.ok = false; }
    summary.pending_inquiries = pi;
  }

  // 3. Onboarding drips
  if (run('drips')) {
    const dr: Record<string, unknown> = { due: 0, sent: [] as unknown[], failed: [] as unknown[], blocked: [] as unknown[] };
    try {
      const due = await rpc<DripUser[]>('ceg_cron_drip_due', { p_secret: secret });
      dr.due = due.length;
      // S7: step 1 quotes the regional couple count (ceg_region_demand, 14 days, cached per region for this run) and
      // step 2 the vendor's own numbers (ceg_vendor_demand, 7 days). A failed fetch renders the copy without numbers.
      const regionCache = new Map<string, RegionDemand | null>();
      const regionDemand = async (sub_region: string | null): Promise<RegionDemand | null> => {
        const key = sub_region || 'colorado';
        if (!regionCache.has(key)) {
          try { regionCache.set(key, await rpc<RegionDemand>('ceg_region_demand', { p_region: key, p_days: 14 })); }
          catch { regionCache.set(key, null); }
        }
        return regionCache.get(key) ?? null;
      };
      const vendorDemand = async (vendor_id: number | undefined): Promise<VendorDemand | null> => {
        if (!vendor_id) return null;
        try { return await rpc<VendorDemand | null>('ceg_vendor_demand', { p_secret: secret, p_vendor_id: vendor_id, p_days: 7 }); } catch { return null; }
      };
      for (const u of due) {
        if (Date.now() - started > 260_000) { dr.stopped_early = 'time budget'; break; }
        // Owner directive 5c (OPERATING-MANUAL): no Featured pitches to vendors until traffic is up. Step 3 is a Featured
        // note with the Stripe link, so it is held here rather than sent. Flip FEATURED_PITCHES_PAUSED in outreach.ts
        // when the owner lifts 5c.
        if (u.step === 3 && FEATURED_PITCHES_PAUSED) { (dr.blocked as unknown[]).push({ user: u.user_id, step: 3, vendor: u.slug, reason: 'held: Featured pitch paused by owner directive 5c' }); continue; }
        let mail;
        try { mail = renderDrip(u, u.step === 1 ? await regionDemand(u.sub_region) : u.step === 2 ? await vendorDemand(u.vendor_id) : null); }
        catch (e) { (dr.blocked as unknown[]).push({ user: u.user_id, step: u.step, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
        if (dry) { (dr.sent as unknown[]).push({ user: u.user_id, step: u.step, to: u.email, subject: mail.subject, text: mail.text }); continue; }
        const res = await sendMailResult('lifecycle', u.email, mail.subject, mail.text, mail.html);
        if (res.ok) {
          try { await rpc('ceg_cron_drip_mark', { p_secret: secret, p_user_id: u.user_id, p_step: u.step }); }
          catch (e) { (dr.failed as unknown[]).push({ user: u.user_id, step: u.step, error: 'sent but mark failed: ' + String(e).slice(0, 200) }); continue; }
          (dr.sent as unknown[]).push({ user: u.user_id, step: u.step, vendor: u.slug });
        } else if (res.suppressed) ((dr.suppressed ??= []) as unknown[]).push({ user: u.user_id, step: u.step });
        else (dr.failed as unknown[]).push({ user: u.user_id, step: u.step, status: res.status, error: res.error });
        await sleep(300);
      }
    } catch (e) { dr.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.drips = dr;
  }

  // 4. Couple nurture (planning kit for new planner accounts, day 3 region, day 7 permits, day 12 vendors,
  //    one planner nudge). Selection, spacing (3 days) and the 50 per Denver day cap live in ceg_cron_nurture_due.
  //    The send row is written first so a crash can never double send; a failed send is unmarked for tomorrow.
  if (run('nurture')) {
    const nu: Record<string, unknown> = { due: 0, sent: [] as unknown[], failed: [] as unknown[], blocked: [] as unknown[] };
    try {
      const due = await rpc<NurtureRecipient[]>('ceg_cron_nurture_due', { p_secret: secret, p_limit: 50 });
      nu.due = due.length;
      for (const r of due) {
        if (Date.now() - started > 280_000) { nu.stopped_early = 'time budget'; break; }
        let mail;
        try { mail = renderNurture(r); }
        catch (e) { (nu.blocked as unknown[]).push({ id: r.id, step: r.step, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
        if (dry) { (nu.sent as unknown[]).push({ id: r.id, to: r.email, step: r.step, subject: mail.subject }); continue; }
        let marked = false;
        try { marked = Boolean(await rpc<boolean>('ceg_nurture_mark', { p_secret: secret, p_id: r.id, p_step: r.step, p_via: 'cron', p_resend_id: null })); }
        catch (e) { (nu.failed as unknown[]).push({ id: r.id, step: r.step, error: 'mark failed, not sent: ' + String(e).slice(0, 200) }); continue; }
        if (!marked) continue;
        const res = await sendCoupleMail(r.email, mail);
        if (res.ok) {
          (nu.sent as unknown[]).push({ id: r.id, step: r.step, resend: res.id });
          if (res.id) { try { await rpc('ceg_nurture_set_resend', { p_secret: secret, p_id: r.id, p_step: r.step, p_resend_id: res.id }); } catch { /* noop */ } }
        } else if (res.suppressed) {
          ((nu.suppressed ??= []) as unknown[]).push({ id: r.id, step: r.step }); // stays marked: never retried
        } else {
          (nu.failed as unknown[]).push({ id: r.id, step: r.step, status: res.status, error: res.error });
          try { await rpc('ceg_nurture_unmark', { p_secret: secret, p_id: r.id, p_step: r.step }); } catch { /* noop */ }
        }
        await sleep(300);
      }
    } catch (e) { nu.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.nurture = nu;
  }

  // 5. Reply reminders (?only=reply_reminders): one gentle note per unreplied inquiry to a claimed or Featured
  //    account two days after delivery, cap 30 a day. Also refreshes the 90 day median reply stats behind the badges.
  //    reminder_sent_at is written before the send and cleared again if the send fails.
  if (run('reply_reminders')) {
    const rr: Record<string, unknown> = { due: 0, sent: [] as unknown[], failed: [] as unknown[], blocked: [] as unknown[] };
    try {
      if (!dry) { try { rr.stats_refreshed = await rpc<number>('ceg_cron_reply_stats_refresh', { p_secret: secret }); } catch (e) { rr.stats_error = String(e).slice(0, 200); } }
      const due = await rpc<ReplyReminder[]>('ceg_cron_reply_reminders_due', { p_secret: secret, p_limit: 30 });
      rr.due = due.length;
      for (const r of due) {
        if (Date.now() - started > 285_000) { rr.stopped_early = 'time budget'; break; }
        let mail;
        try { mail = renderReplyReminder(r); }
        catch (e) { (rr.blocked as unknown[]).push({ inquiry: r.inquiry_id, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
        if (dry) { (rr.sent as unknown[]).push({ inquiry: r.inquiry_id, to: r.email, vendor: r.slug, subject: mail.subject, text: mail.text }); continue; }
        let marked = false;
        try { marked = Boolean(await rpc<boolean>('ceg_cron_reply_reminder_mark', { p_secret: secret, p_id: r.inquiry_id })); }
        catch (e) { (rr.failed as unknown[]).push({ inquiry: r.inquiry_id, error: 'mark failed, not sent: ' + String(e).slice(0, 200) }); continue; }
        if (!marked) continue;
        const res = await sendMailResult('lifecycle', r.email, mail.subject, mail.text, mail.html);
        if (res.ok) (rr.sent as unknown[]).push({ inquiry: r.inquiry_id, vendor: r.slug, id: res.id });
        else if (res.suppressed) ((rr.suppressed ??= []) as unknown[]).push(r.inquiry_id); // stays marked: never retried
        else {
          (rr.failed as unknown[]).push({ inquiry: r.inquiry_id, vendor: r.slug, status: res.status, error: res.error });
          try { await rpc('ceg_cron_reply_reminder_mark', { p_secret: secret, p_id: r.inquiry_id, p_clear: true }); } catch { /* noop */ }
        }
        await sleep(300);
      }
    } catch (e) { rr.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.reply_reminders = rr;
  }

  // 6. Photo nudge (?only=photo_nudges, drip step 40): claimed vendors with no uploaded photos, once per vendor ever,
  //    spaced 3 days from any other drip by ceg_cron_photo_nudge_due. The drip row is written before the send.
  if (run('photo_nudges')) {
    const pn: Record<string, unknown> = { due: 0, sent: [] as unknown[], failed: [] as unknown[], blocked: [] as unknown[] };
    try {
      const due = await rpc<PhotoNudge[]>('ceg_cron_photo_nudge_due', { p_secret: secret });
      pn.due = due.length;
      for (const u of due) {
        if (Date.now() - started > 290_000) { pn.stopped_early = 'time budget'; break; }
        let mail;
        try { mail = renderPhotoNudge(u); }
        catch (e) { (pn.blocked as unknown[]).push({ user: u.user_id, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
        if (dry) { (pn.sent as unknown[]).push({ user: u.user_id, to: u.email, vendor: u.slug, subject: mail.subject, text: mail.text }); continue; }
        try { await rpc('ceg_cron_drip_mark', { p_secret: secret, p_user_id: u.user_id, p_step: 40 }); }
        catch (e) { (pn.failed as unknown[]).push({ user: u.user_id, error: 'mark failed, not sent: ' + String(e).slice(0, 200) }); continue; }
        const res = await sendMailResult('lifecycle', u.email, mail.subject, mail.text, mail.html);
        if (res.ok) (pn.sent as unknown[]).push({ user: u.user_id, vendor: u.slug, id: res.id });
        else if (res.suppressed) ((pn.suppressed ??= []) as unknown[]).push(u.user_id); // stays marked: never retried
        else {
          (pn.failed as unknown[]).push({ user: u.user_id, vendor: u.slug, status: res.status, error: res.error });
          try { await rpc('ceg_cron_drip_unmark', { p_secret: secret, p_user_id: u.user_id, p_step: 40 }); } catch { /* noop */ }
        }
        await sleep(300);
      }
    } catch (e) { pn.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.photo_nudges = pn;
  }

  if (!dry && !only) { try { await rpc('ceg_cron_config_set', { p_secret: secret, p_key: 'cron_daily_last_ran', p_value: String(summary.ran_at) }); } catch { /* noop */ } } // read by the Sunday self audit
  summary.ms = Date.now() - started;
  console.log('CRON daily', JSON.stringify(summary));
  return json(summary);
};
