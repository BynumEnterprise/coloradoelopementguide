// Sunday self audit (S10): turns the json from ceg_cron_self_audit into the plain text report the owner gets.
// Pure function so it can be tested without a database; the endpoint in src/pages/api/cron/audit.ts fetches the data.
import { naturalCheck } from './outreach';

export type AuditData = {
  generated_at: string;
  double_runs: { label: string; a: number; b: number; minutes: number }[];
  releases_week: number; release_cap: number; week_start: string;
  outreach_days: { day: string; rows: number; sent: number }[]; outreach_multi_days: number;
  bounced_7d: number; complained_7d: number; sends_db_estimate_7d: number;
  cron_daily_last_ran: string | null; cron_weekly_last_ran: string | null; cron_audit_last_ran: string | null;
  research_with: number; research_without: number;
  inquiries_undelivered: number; inquiries_held: number;
  claims_open_48h: number; claims_open_48h_recent?: number; claims_open_48h_vendor_claimed: number;
  orphan_sessions: { id: number; label: string; last_seen: string }[];
  pageviews_7d: number; pageviews_bot_7d: number; pageviews_couple_7d: number;
};

export type AuditExtras = { resend_sends_7d: number | null; resend_error?: string };

const DASHES = /[\-‐‑‒–—―]/g;
const hoursAgo = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (Date.now() - t) / 3_600_000 : null;
};
const h = (n: number | null) => (n == null ? 'never recorded' : n < 48 ? `${Math.round(n)} hours ago` : `${Math.round(n / 24)} days ago`);

export function buildAudit(d: AuditData, x: AuditExtras, date: string): { text: string; flags: number; lines: string[] } {
  // Free text from the database (session labels, Resend errors) is rendered first; if naturalCheck rejects the result
  // the report is rebuilt without that text so the owner still gets the ten numbers instead of a failed cron.
  try { return render(d, x, date, false); }
  catch (e) { console.warn('self audit rerendered without free text:', String(e).slice(0, 200)); return render(d, x, date, true); }
}

function render(d: AuditData, x: AuditExtras, date: string, safe: boolean): { text: string; flags: number; lines: string[] } {
  const L: string[] = [];
  const free = (s: string, fallback: string) => (safe ? fallback : String(s ?? '').replace(/[!*]/g, ''));
  let flags = 0;
  const line = (ok: boolean, body: string) => { if (!ok) flags++; L.push(`${ok ? 'PASS' : 'FLAG'} ${body}`); };

  // 1 double runs
  const dr = d.double_runs || [];
  line(dr.length === 0, `Double runs: ${dr.length === 0 ? 'no session label started twice within 30 minutes in 7 days' : `${dr.length} ${dr.length === 1 ? "pair" : "pairs"}, ${dr.slice(0, 3).map(p => `${free(p.label, 'session')} (rows ${p.a} and ${p.b}, ${p.minutes} min apart)`).join('; ')}`}`);
  // 2 releases vs cap
  line(d.releases_week <= d.release_cap, `Releases this Denver week: ${d.releases_week} of cap ${d.release_cap}`);
  // 3 outreach rows per day
  const od = d.outreach_days || [];
  const sent = od.reduce((s, r) => s + (r.sent || 0), 0);
  line(d.outreach_multi_days === 0, `Outreach log: ${od.length} send days in 7 days, ${sent} invites, ${d.outreach_multi_days} day${d.outreach_multi_days === 1 ? '' : 's'} with more than one batch row`);
  // 4 bounce rate
  const sends = x.resend_sends_7d ?? d.sends_db_estimate_7d;
  const src = x.resend_sends_7d != null ? 'Resend log' : 'database estimate';
  const rate = sends > 0 ? (d.bounced_7d / sends) * 100 : 0;
  line(rate <= 3, `Bounce rate: ${d.bounced_7d} bounced of ${sends} sends in 7 days (${src}), ${rate.toFixed(1)} percent${d.complained_7d ? `, ${d.complained_7d} complained or failed` : ''}${x.resend_error ? `, Resend lookup failed: ${free(x.resend_error, 'see the cron log')}` : ''}`);
  // 5 stalled stages
  const dh = hoursAgo(d.cron_daily_last_ran), wh = hoursAgo(d.cron_weekly_last_ran);
  line(dh != null && dh <= 36, `Daily cron last finished: ${h(dh)} (limit 36 hours)`);
  line(wh != null && wh <= 8 * 24, `Weekly cron last finished: ${h(wh)} (limit 8 days)`);
  // 6 research backlog
  line(!(d.research_without > 0 && d.research_with < 25), `Research backlog: ${d.research_without} contactable pending vendors with no paragraph, ${d.research_with} ready to send`);
  // 7 inquiries not delivered
  line(d.inquiries_undelivered === 0, `Inquiries held for claimed vendors: ${d.inquiries_undelivered} not released (${d.inquiries_held} held in total)`);
  // 8 open claims: flag on claims from the last 14 days still open after 48 hours; p2_claims has no closed state, so the
  // older unverified backlog is printed as context rather than flagged every week.
  const recent = d.claims_open_48h_recent ?? d.claims_open_48h;
  line(recent === 0, `Claims open more than 48 hours: ${recent} from the last 14 days, ${d.claims_open_48h} in total${d.claims_open_48h_vendor_claimed ? `, of which ${d.claims_open_48h_vendor_claimed} are for vendors already marked claimed (verify or close them)` : ''}`);
  // 9 orphan sessions
  const os = d.orphan_sessions || [];
  line(os.length === 0, `Orphan sessions: ${os.length}${os.length ? ` (rows ${os.map(o => o.id).join(', ')})` : ''}`);
  // 10 bot share
  const bot = d.pageviews_7d > 0 ? (d.pageviews_bot_7d / d.pageviews_7d) * 100 : 0;
  line(bot <= 50, `Pageviews 7 days: ${d.pageviews_7d} total, ${d.pageviews_bot_7d} flagged bot (${bot.toFixed(0)} percent), ${d.pageviews_couple_7d} couple side`);

  const head = [
    `Colorado Elopement Guide self audit, ${date}`,
    `${flags === 0 ? 'All ten checks pass.' : `${flags} of 10 checks flagged.`} Numbers are read from the database at run time.`,
    ''
  ];
  const tail = ['', flags ? 'Flags are things a session should look at this week. Nothing here changes data on its own.' : 'Nothing needs attention this week.', 'Admin: https://coloradoelopementguide.com/admin'];
  const text = [...head, ...L, ...tail].join('\n').replace(DASHES, ' ').replace(/ {2,}/g, ' ');
  return { text: naturalCheck(text, 'self audit'), flags, lines: L };
}
