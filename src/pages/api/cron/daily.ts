export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, sleep, authSecret, cronAuthorized, fetchWithTimeout, mapLimit } from '../../../lib/cron';
import { sendMailResult } from '../../../lib/mail';
import { renderV4, renderDrip, renderFollowup, renderActivation, type OutreachVendor, type DripUser, type FollowupVendor, type ActivationUser } from '../../../lib/outreach';

// Daily P2 automation (Vercel cron, 15:00 UTC):
//   1. contact discovery for up to 12 seeded vendors with a website and no email
//   2. up to 25 Template v4 claim invites via Resend, marked sent_v1
//   3. onboarding drips for vendor accounts (one email per user per run)
//   2c. one time activation note (drip step 10) to accounts that existed on 2026-10-12, sent once each
//       vendor is clear of any email from us for 3 days; it runs before the drips so it takes the slot
// Query flags for manual runs: ?dry=1 renders and checks but sends nothing; ?only=discovery|outreach|drips.
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
        const res = await sendMailResult(v.contact_email, mail.subject, mail.text, mail.html);
        if (res.ok) { sentIds.push(v.id); (o.sent as number[]).push(v.id); }
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
        const res = await sendMailResult(v.contact_email, mail.subject, mail.text, mail.html);
        if (res.ok) { doneIds.push(v.id); (f.sent as unknown[]).push({ id: v.id, slug: v.slug, step: v.followups + 1 }); }
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
        const res = await sendMailResult(u.email, mail.subject, mail.text, mail.html);
        if (res.ok) (ac.sent as unknown[]).push({ user: u.user_id, vendor: u.slug, id: res.id });
        else (ac.failed as unknown[]).push({ user: u.user_id, vendor: u.slug, status: res.status, error: res.error });
        await sleep(300);
      }
    } catch (e) { ac.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.activation = ac;
  }

  // 3. Onboarding drips
  if (run('drips')) {
    const dr: Record<string, unknown> = { due: 0, sent: [] as unknown[], failed: [] as unknown[], blocked: [] as unknown[] };
    try {
      const due = await rpc<DripUser[]>('ceg_cron_drip_due', { p_secret: secret });
      dr.due = due.length;
      for (const u of due) {
        if (Date.now() - started > 260_000) { dr.stopped_early = 'time budget'; break; }
        let mail;
        try { mail = renderDrip(u); }
        catch (e) { (dr.blocked as unknown[]).push({ user: u.user_id, step: u.step, reason: String((e as Error).message || e).slice(0, 200) }); continue; }
        if (dry) { (dr.sent as unknown[]).push({ user: u.user_id, step: u.step, to: u.email, subject: mail.subject, text: mail.text }); continue; }
        const res = await sendMailResult(u.email, mail.subject, mail.text, mail.html);
        if (res.ok) {
          try { await rpc('ceg_cron_drip_mark', { p_secret: secret, p_user_id: u.user_id, p_step: u.step }); }
          catch (e) { (dr.failed as unknown[]).push({ user: u.user_id, step: u.step, error: 'sent but mark failed: ' + String(e).slice(0, 200) }); continue; }
          (dr.sent as unknown[]).push({ user: u.user_id, step: u.step, vendor: u.slug });
        } else (dr.failed as unknown[]).push({ user: u.user_id, step: u.step, status: res.status, error: res.error });
        await sleep(300);
      }
    } catch (e) { dr.fatal = String(e).slice(0, 300); summary.ok = false; }
    summary.drips = dr;
  }

  summary.ms = Date.now() - started;
  console.log('CRON daily', JSON.stringify(summary));
  return json(summary);
};
