export const prerender = false;
import type { APIRoute } from 'astro';
import { rpc } from '../../lib/cron';

// One click unsubscribe for vendor account reminder emails: /api/unsub?t=<vendor user token>.
const page = (title: string, body: string) =>
  new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#f2ede3;font-family:Georgia,'Times New Roman',serif;color:#1f1d1a;">
<div style="max-width:520px;margin:0 auto;padding:80px 22px;text-align:center;">
<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a6a4f;margin:0 0 14px;">Colorado Elopement Guide</p>
<p style="font-size:20px;line-height:1.5;margin:0 0 18px;">${body}</p>
<p style="font-size:14px;color:#6b665e;"><a href="https://coloradoelopementguide.com/" style="color:#2f4a3f;">Back to the site</a></p>
</div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ url }) => {
  const t = String(url.searchParams.get('t') || '').trim();
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(t)) {
    return page('Unsubscribe', 'That unsubscribe link is not valid. Reply to any of our emails and we will stop the reminders by hand.');
  }
  let ok = false;
  try { ok = Boolean(await rpc<boolean>('ceg_unsub', { p_token: t })); } catch (e) { console.error('unsub rpc failed', e); }
  return ok
    ? page('Unsubscribed', 'You are unsubscribed from Colorado Elopement Guide reminders.')
    : page('Unsubscribe', 'We could not find an account for that link. Reply to any of our emails and we will stop the reminders by hand.');
};
