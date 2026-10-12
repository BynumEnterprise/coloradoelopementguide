export const prerender = false;
import type { APIRoute } from 'astro';
import { rpc } from '../../lib/cron';

// One click unsubscribe from the couple planning emails: /api/unsubscribe?t=<p2_nurture.unsub_token>.
// GET (the link in the email) and POST (RFC 8058 List-Unsubscribe-Post from Gmail and Yahoo) both unsubscribe.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const page = (title: string, body: string) =>
  new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#f2ede3;font-family:Georgia,'Times New Roman',serif;color:#1f1d1a;">
<div style="max-width:520px;margin:0 auto;padding:80px 22px;text-align:center;">
<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a6a4f;margin:0 0 14px;">Colorado Elopement Guide</p>
<p style="font-size:20px;line-height:1.5;margin:0 0 18px;">${body}</p>
<p style="font-size:14px;color:#6b665e;"><a href="https://coloradoelopementguide.com/" style="color:#2f4a3f;">Back to the site</a></p>
</div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

async function unsub(t: string): Promise<boolean | null> {
  if (!UUID_RE.test(t)) return null;
  try { return Boolean(await rpc<boolean>('ceg_nurture_unsub', { p_token: t })); }
  catch (e) { console.error('nurture unsub failed', e); return false; }
}

export const GET: APIRoute = async ({ url }) => {
  const ok = await unsub(String(url.searchParams.get('t') || '').trim());
  if (ok) return page('Unsubscribed', 'You are unsubscribed from Colorado Elopement Guide planning emails. Your planner and saved vendors are untouched.');
  return page('Unsubscribe', 'We could not match that link. Reply to any of our emails with the word unsubscribe and we will stop them by hand.');
};

export const POST: APIRoute = async ({ url }) => {
  const ok = await unsub(String(url.searchParams.get('t') || '').trim());
  return new Response(ok ? 'unsubscribed' : 'not found', { status: ok ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
};
