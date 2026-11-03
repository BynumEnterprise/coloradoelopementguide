export const prerender = false;
import type { APIRoute } from 'astro';
import { rpc, authSecret } from '../../lib/cron';
import { repliedSigOk } from '../../lib/trust-mail';

// "I replied" link from inquiry and reminder emails: /api/inquiry-replied?i=<id>&s=<hmac>.
// GET only shows a confirm page; the mark happens on the POST behind a real button click. There is no auto submit
// on purpose: link scanners that execute JavaScript (Outlook Safe Links, Gmail, corporate proxies) were marking
// inquiries replied two hours after delivery (inquiry 31, 2026-11-02) without any vendor action.
const page = (title: string, body: string) =>
  new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#f2ede3;font-family:Georgia,'Times New Roman',serif;color:#1f1d1a;">
<div style="max-width:520px;margin:0 auto;padding:80px 22px;text-align:center;">
<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a6a4f;margin:0 0 14px;">Colorado Elopement Guide</p>
${body}
<p style="font-size:14px;color:#6b665e;margin-top:28px;"><a href="https://coloradoelopementguide.com/vendor-dashboard" style="color:#2f4a3f;">Open your dashboard</a></p>
</div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const say = (t: string) => `<p style="font-size:20px;line-height:1.5;margin:0 0 18px;">${t}</p>`;

export const GET: APIRoute = async ({ url }) => {
  const i = String(url.searchParams.get('i') || ''), s = String(url.searchParams.get('s') || '');
  if (!repliedSigOk(i, s)) return page('Mark as replied', say('That link is not valid. You can mark the inquiry as replied from your dashboard.'));
  return page('Mark as replied', `${say('Have you written back to this couple? Confirm below and we will stop the reminder for this inquiry.')}
<form id="f" method="post" action="/api/inquiry-replied"><input type="hidden" name="i" value="${i}"><input type="hidden" name="s" value="${s}">
<button type="submit" style="background:#1f1d1a;color:#f2ede3;border:0;border-radius:999px;padding:12px 26px;font:inherit;font-size:15px;cursor:pointer;">Yes, I Replied</button></form>
<p style="font-size:14px;color:#6b665e;margin-top:18px;">Not yet? Just close this page. Nothing is marked until you press the button.</p>`);
};

export const POST: APIRoute = async ({ request }) => {
  let i = '', s = '';
  try { const f = await request.formData(); i = String(f.get('i') || ''); s = String(f.get('s') || ''); } catch { /* invalid */ }
  if (!repliedSigOk(i, s)) return page('Mark as replied', say('That link is not valid. You can mark the inquiry as replied from your dashboard.'));
  try {
    const r = await rpc<any>('ceg_inquiry_replied_link', { p_secret: authSecret(), p_id: Number(i) });
    if (!r?.ok) return page('Mark as replied', say('We could not find that inquiry. It may have been removed.'));
    return page('Marked as replied', say(r.already ? 'This inquiry was already marked as replied. Thank you.' : 'Thank you. The inquiry is marked as replied and you will not get a reminder about it.'));
  } catch (e) {
    console.error('inquiry-replied failed', e);
    return page('Mark as replied', say('Something went wrong on our side. Please use the button in your dashboard instead.'));
  }
};
