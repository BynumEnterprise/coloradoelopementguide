export const prerender = false;
import type { APIRoute } from 'astro';
import { SB_URL, SB_KEY } from '../../lib/supabase';
import { sendMailResult } from '../../lib/mail';
import { naturalCheck, displayName, POSTAL_ADDRESS, DEMAND_MIN, demandRegionLabel, type RegionDemand } from '../../lib/outreach';
import { rpc } from '../../lib/cron';
import { releasePendingInquiries } from '../../lib/trust-mail';

const j = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// S7 welcome copy. Exported so the reviewer harness can render it against real demand numbers. The couple line quotes the
// regional count only from DEMAND_MIN up; below that (or when the fetch failed) it has no number.
export function renderWelcome(p: { name: string; link: string; subRegion: string | null; demand: RegionDemand | null }) {
  const name = p.name, link = p.link;
  const where = demandRegionLabel(p.subRegion);
  const cv = Math.max(0, Math.floor(Number(p.demand?.couple_visitors) || 0));
  const coupleLine = cv >= DEMAND_MIN
    ? `In the last 30 days, ${cv} couples looked at ${where} vendors on Colorado Elopement Guide. Your ${name} listing is now one they can send an inquiry through, and the inquiry comes straight to this address.`
    : `Couples planning a ${where} elopement browse vendors on Colorado Elopement Guide, and your ${name} listing is now one they can send an inquiry through. The inquiry comes straight to this address.`;

  const subject = `Your ${name} dashboard is ready`;

  const text =
`Hi ${name},

Your listing is claimed and live, and your free vendor dashboard is ready.

${coupleLine}

Your dashboard shows how many couples viewed your page, clicked through to your website and tapped your phone number, with bots filtered out. You can also fix your description, phone and website, add photos and a starting price, and invite a vendor you work with.

This link signs you straight in:
${link}

Once you are in, set a password so you can sign in from any device later. Questions? Just reply to this email.

Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}`;

  const html =
`<!doctype html><html><body style="margin:0;background:#f2ede3;font-family:Georgia,'Times New Roman',serif;color:#1f1d1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 22px;">
    <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a6a4f;margin:0 0 14px;">Colorado Elopement Guide</p>
    <h1 style="font-size:26px;line-height:1.25;margin:0 0 16px;font-weight:400;">Your listing is claimed. <span style="font-style:italic;color:#2f4a3f;">Your dashboard is ready.</span></h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 14px;color:#3a3733;">Hi ${esc(name)}, your listing is live and your free vendor dashboard is waiting.</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 22px;color:#3a3733;">${esc(coupleLine)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="padding:14px 0;border-top:1px solid #e2d9c8;">
        <span style="font-size:16px;color:#1f1d1a;">See your real numbers</span>
        <div style="font-size:14px;line-height:1.6;color:#4a4640;margin-top:4px;">How many couples viewed your page, clicked through to your website, and tapped your phone number. Bot filtered, so it is only real people, never inflated.</div>
      </td></tr>
      <tr><td style="padding:14px 0;border-top:1px solid #e2d9c8;border-bottom:1px solid #e2d9c8;">
        <span style="font-size:16px;color:#1f1d1a;">Keep your listing accurate</span>
        <div style="font-size:14px;line-height:1.6;color:#4a4640;margin-top:4px;">Update your description, phone, and website whenever you like. Changes go live within a few minutes.</div>
      </td></tr>
    </table>

    <div style="text-align:center;margin:30px 0 10px;">
      <a href="${link}" style="display:inline-block;background:#1f1d1a;color:#f7f3ea;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:400;padding:15px 34px;border-radius:999px;">Open My Dashboard</a>
    </div>
    <p style="font-size:13px;line-height:1.6;color:#6b665e;text-align:center;margin:0 0 26px;">This link signs you in. Once inside, set a password so you can return from any device.</p>

    <p style="font-size:15px;line-height:1.6;color:#3a3733;margin:0;">Questions? Just reply to this email.</p>
    <p style="font-size:15px;line-height:1.6;color:#3a3733;margin:16px 0 0;">Ryan<br/>Colorado Elopement Guide<br/><span style="font-size:13px;color:#6b665e;">${esc(POSTAL_ADDRESS)}</span></p>
  </div>
</body></html>`;

  return { subject, text, html };
}

export type WelcomeTarget = { vendorId: number; email: string; token: string; name: string; slug: string; subRegion?: string | null };
export type WelcomeResult = { ok: boolean; sent_to?: string; vendor?: string; id?: string; error?: string; subject?: string; text?: string; pending_inquiries?: unknown };

// Renders, checks and sends the welcome for one provisioned account, then releases inquiries that reached the listing
// before the account existed. Shared by POST below and the queue stage of the crons (src/lib/welcome-queue.ts).
export async function deliverWelcome(secret: string, t: WelcomeTarget, opts: { dry?: boolean } = {}): Promise<WelcomeResult> {
  const name: string = displayName(t.name || '') || 'there';
  const to = t.email;
  if (!to || !t.token) return { ok: false, error: 'missing email or token' };
  const link = `https://coloradoelopementguide.com/vd/${t.token}`;

  // S7: lead with the couples near this vendor. Region from the public view (or the caller), counts from
  // ceg_region_demand (30 days); below DEMAND_MIN, or on any fetch error, the sentence has no number.
  let subRegion: string | null = t.subRegion ?? null; let demand: RegionDemand | null = null;
  try {
    if (subRegion == null) {
      const vr = await fetch(`${SB_URL}/rest/v1/p2_vendors_public?slug=eq.${encodeURIComponent(String(t.slug || ''))}&select=sub_region`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
      const vrows = vr.ok ? await vr.json() : [];
      subRegion = vrows?.[0]?.sub_region ?? null;
    }
    demand = await rpc<RegionDemand>('ceg_region_demand', { p_region: subRegion || 'colorado', p_days: 30 });
  } catch { demand = null; }
  const { subject, text, html } = renderWelcome({ name, link, subRegion, demand });

  // Same gate as every other automated email: dashes, AI tells, exclamation marks, bold, our legal name.
  try {
    naturalCheck(subject, 'welcome subject', [name, t.name || '']);
    naturalCheck(text, 'welcome body', [name, t.name || '']);
    naturalCheck(html.replace(/<[^>]+>/g, ' '), 'welcome html', [name, esc(name), t.name || '']);
    if (/<\s*(b|strong)\b/i.test(html)) throw new Error('welcome html: bold tag');
  } catch (e) { return { ok: false, error: String((e as Error).message || e).slice(0, 200) }; }

  if (opts.dry) return { ok: true, sent_to: to, vendor: name, subject, text };
  const res = await sendMailResult(to, subject, text, html);
  if (!res.ok) return { ok: false, sent_to: to, vendor: name, error: `send ${res.status}: ${String(res.error || '').slice(0, 200)}` };
  // Inquiries that arrived while the listing was unclaimed: full copy to this account, once each.
  let pending: unknown = null;
  try { pending = await releasePendingInquiries(secret, { vendorId: t.vendorId, limit: 10 }); }
  catch (e) { pending = { error: String(e).slice(0, 200) }; }
  return { ok: true, sent_to: to, vendor: name, id: res.id, pending_inquiries: pending };
}

// Sends the vendor a "your listing is claimed, here is your dashboard" email with a one tap login link.
// Cloud tasks no longer call this (they use ceg_task_confirm_claim, and the queue cron sends the welcome);
// it stays for manual and admin use. Secret gated: caller must present the same CEG_AUTH_SECRET the site uses.
// No Featured pitch here (owner directive 5c) and no bold anywhere in the HTML (owner email rules).
export const POST: APIRoute = async ({ request }) => {
  const secretEnv = process.env.CEG_AUTH_SECRET ?? import.meta.env.CEG_AUTH_SECRET;
  let body: any = {};
  try { body = await request.json(); } catch { /* noop */ }
  const vendorId = Number(body.vendor_id);
  const secret = String(body.secret || '');
  const emailOverride = body.email ? String(body.email) : null;

  if (!secretEnv || secret !== secretEnv) return j({ error: 'unauthorized' }, 401);
  if (!vendorId) return j({ error: 'vendor_id required' }, 400);

  // Provision (idempotent) a verified vendor login and get its token.
  const pr = await fetch(`${SB_URL}/rest/v1/rpc/ceg_vendor_provision`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_vendor_id: vendorId, p_email: emailOverride, p_secret: secret })
  });
  if (!pr.ok) { console.error('vendor-welcome provision failed', pr.status, await pr.text()); return j({ error: 'provision failed' }, 502); }
  const prov = await pr.json();
  if (!prov || prov.error) return j({ error: prov?.error || 'provision failed' }, 400);

  const r = await deliverWelcome(secret, { vendorId, email: prov.email, token: prov.token, name: prov.name || '', slug: prov.slug || '' });
  if (!r.ok && !r.sent_to) return j({ error: r.error }, 500);
  return j({ ok: r.ok, sent_to: r.sent_to, vendor: r.vendor, pending_inquiries: r.pending_inquiries ?? null, ...(r.ok ? {} : { error: r.error }) });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
