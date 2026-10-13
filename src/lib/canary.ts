// Weekly money path canary (stage "canary" of /api/cron/weekly). Exercises the real flows end to end against a
// hidden synthetic vendor (slug zz-ceg-canary, status queued, so it is never built, listed or released) whose
// account is the owner plus address bynumenterprisesbe+canary@gmail.com. Nothing is emailed to any vendor or
// couple: the vendor notice and couple confirmation are rendered (and naturalChecked) but not sent. Every
// synthetic inquiry, event, pageview and site event is deleted at the end. On any failure the owner gets a short
// Resend alert (skipped with dry).
import { rpc, fetchWithTimeout, SITE } from './cron';
import { sendMailResult, OWNER_EMAIL } from './mail';
import { inquiryVendorEmail, FEATURED_LINK } from './outreach';
import { renderInquiryConfirm } from './couple-mail';

export const CANARY_SLUG = 'zz-ceg-canary';
export const CANARY_COUPLE = 'bynumenterprisesbe+canary@gmail.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

type Check = { name: string; ok: boolean; detail?: string };

export async function runCanary(secret: string, dry: boolean) {
  const checks: Check[] = [];
  const step = async (name: string, fn: () => Promise<string | void>) => {
    try { const d = await fn(); checks.push({ name, ok: true, ...(d ? { detail: d } : {}) }); }
    catch (e) { checks.push({ name, ok: false, detail: String((e as any)?.message || e).slice(0, 240) }); }
  };

  let setup: any = null;
  await step('setup', async () => {
    setup = await rpc<any>('ceg_canary_setup', { p_secret: secret });
    if (!setup?.ok) throw new Error('setup returned ' + JSON.stringify(setup));
    await rpc('ceg_canary_cleanup', { p_secret: secret }); // leftovers from an interrupted run
    return `vendor ${setup.vendor_id}`;
  });

  const names = 'Canary Test Couple';
  const message = 'Weekly canary inquiry. We are checking the inquiry path end to end; please ignore.';
  let sub: any = null;
  await step('inquiry_submit', async () => {
    sub = await rpc<any>('ceg_inquiry_submit', { p_secret: secret, p_slug: CANARY_SLUG, p_names: names, p_email: CANARY_COUPLE,
      p_wedding_date: null, p_guests: 2, p_message: message, p_spam: false });
    if (!sub?.ok) throw new Error('submit error ' + (sub?.error || JSON.stringify(sub)));
    if (sub.mode !== 'account' || sub.to !== setup?.account) throw new Error(`routed ${sub.mode} to ${sub.to}`);
    return `inquiry ${sub.id} routed to account`;
  });

  await step('vendor_notice_render', async () => {
    if (!sub?.vendor) throw new Error('no inquiry');
    const v = sub.vendor;
    const m = inquiryVendorEmail({ slug: v.slug, vendorName: v.name, names, email: CANARY_COUPLE, weddingDate: null, guests: 2, message, sub_region: v.sub_region, category: v.category });
    if (!m.text.includes(CANARY_COUPLE) || !m.text.includes(message)) throw new Error('notice body missing couple details');
  });

  await step('inquiry_mark', async () => {
    if (!sub?.id) throw new Error('no inquiry');
    const ok = await rpc<boolean>('ceg_inquiry_mark', { p_secret: secret, p_id: sub.id, p_notified: true });
    if (ok !== true) throw new Error('mark returned ' + String(ok));
  });

  await step('couple_confirm', async () => {
    if (!sub?.id) throw new Error('no inquiry');
    const c = await rpc<any>('ceg_inquiry_confirm', { p_secret: secret, p_id: sub.id });
    if (!c?.ok) throw new Error('confirm slot ' + (c?.error || 'missing'));
    const m = renderInquiryConfirm({ mode: sub.mode, vendor: c.vendor, similar: c.similar || [], names, email: CANARY_COUPLE, weddingDate: null, guests: 2, message });
    await rpc('ceg_inquiry_confirm_mark', { p_secret: secret, p_id: sub.id, p_ok: true });
    const again = await rpc<any>('ceg_inquiry_confirm', { p_secret: secret, p_id: sub.id });
    if (again?.ok) throw new Error('second confirmation was allowed');
    if ((c.similar || []).length < 3) throw new Error(`only ${(c.similar || []).length} similar vendors`);
    return `rendered ${m.text.length} chars, ${c.similar.length} similar`;
  });

  await step('track_beacon', async () => {
    const r = await fetchWithTimeout(`${SITE}/api/track`, 15000, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Origin: SITE, 'Accept-Language': 'en-US' },
      body: JSON.stringify({ k: 'pv', p: '/__canary', s: 'canary' }) });
    const b: any = await r.json().catch(() => null);
    if (r.status !== 200 || !b?.ok) throw new Error(`track ${r.status} ${JSON.stringify(b)}`);
  });

  for (const path of ['/featured', '/vendor-dashboard', '/kit']) {
    await step(`page ${path}`, async () => {
      const r = await fetchWithTimeout(`${SITE}${path}`, 15000, { headers: { 'User-Agent': UA } });
      if (r.status !== 200) throw new Error(`status ${r.status}`);
    });
  }

  await step('stripe_link', async () => {
    const r = await fetchWithTimeout(FEATURED_LINK, 15000, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });

  let cleanup: any = null;
  await step('cleanup', async () => {
    cleanup = await rpc<any>('ceg_canary_cleanup', { p_secret: secret });
    if (Number(cleanup?.leftover) !== 0) throw new Error('leftover rows ' + JSON.stringify(cleanup));
    return JSON.stringify(cleanup.deleted);
  });

  const failed = checks.filter(c => !c.ok);
  const out: Record<string, unknown> = { pass: failed.length === 0, checks, leftover: cleanup?.leftover ?? null };
  if (failed.length && !dry) {
    const text = `The weekly money path canary failed ${failed.length} of ${checks.length} checks.\n\n` +
      failed.map(f => `${f.name}: ${f.detail || 'failed'}`).join('\n') +
      `\n\nRun it again with /api/cron/weekly?only=canary to see the full result.\n\nRyan, this is the automated canary alert from the site.`;
    const r = await sendMailResult(OWNER_EMAIL, '[CEG] Canary failed', text);
    out.alert_sent = r.ok;
  }
  return out;
}
