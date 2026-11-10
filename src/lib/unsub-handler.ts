// Shared logic behind /api/unsub and /api/unsubscribe. Both accept:
//   ?e=<email>&t=<32 hex HMAC>   the signed link in every lifecycle and marketing email (src/lib/unsub.ts)
//   ?t=<uuid>                    legacy links: a vendor user token (/api/unsub) or a p2_nurture.unsub_token
//                                (/api/unsubscribe). Both RPCs resolve the token to its email in the database and
//                                put that address on the suppression list, so it applies to every list, not one.
// GET performs the unsubscribe and shows a plain page (many mail apps just open the link). POST is RFC 8058 one
// click (body List-Unsubscribe=One-Click) and answers 200 with a short text body.
import { rpc, authSecret } from './cron';
import { verifyUnsub, normEmail } from './unsub';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const escH = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export type UnsubOutcome = { status: 'ok' | 'invalid' | 'not_found' | 'error'; email?: string };

// legacyRpc: 'ceg_unsub' (vendor user token) or 'ceg_nurture_unsub' (nurture token).
export async function performUnsub(url: URL, legacyRpc: 'ceg_unsub' | 'ceg_nurture_unsub', source: 'link' | 'one_click'): Promise<UnsubOutcome> {
  const e = url.searchParams.get('e');
  const t = String(url.searchParams.get('t') || '').trim();
  if (e !== null) {
    const email = normEmail(e);
    if (!verifyUnsub(email, t)) return { status: 'invalid' };
    try {
      const r = await rpc<{ ok?: boolean } | null>('ceg_unsubscribe_email', { p_secret: authSecret(), p_email: email, p_reason: 'unsubscribe', p_source: source, p_note: null });
      return r?.ok ? { status: 'ok', email } : { status: 'error' };
    } catch (err) { console.error('unsub: ceg_unsubscribe_email failed', err); return { status: 'error' }; }
  }
  if (!UUID_RE.test(t)) return { status: 'invalid' };
  try {
    const ok = Boolean(await rpc<boolean>(legacyRpc, { p_token: t }));
    return ok ? { status: 'ok' } : { status: 'not_found' };
  } catch (err) { console.error('unsub: legacy rpc failed', legacyRpc, err); return { status: 'error' }; }
}

const page = (title: string, body: string, status = 200) =>
  new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#f2ede3;font-family:Georgia,'Times New Roman',serif;color:#1f1d1a;">
<div style="max-width:520px;margin:0 auto;padding:80px 22px;text-align:center;">
<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a6a4f;margin:0 0 14px;">Colorado Elopement Guide</p>
<p style="font-size:20px;line-height:1.5;margin:0 0 18px;">${body}</p>
<p style="font-size:14px;color:#6b665e;"><a href="https://coloradoelopementguide.com/" style="color:#2f4a3f;">Back to the site</a></p>
</div></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export function unsubPage(o: UnsubOutcome): Response {
  if (o.status === 'ok') {
    const who = o.email ? escH(o.email) : 'This address';
    return page('Unsubscribed', `You are unsubscribed. ${who} will get no more email from Colorado Elopement Guide. The only exception is something you ask for yourself, such as a sign in link.`);
  }
  if (o.status === 'error') return page('Unsubscribe', 'Something went wrong on our side and the unsubscribe did not save. Please open the link again in a minute, or reply to any of our emails with the word unsubscribe and we will stop them.', 500);
  if (o.status === 'not_found') return page('Unsubscribe', 'We could not match that link to an address. Reply to any of our emails with the word unsubscribe and we will stop them.', 404);
  return page('Unsubscribe', 'That unsubscribe link is not valid. Reply to any of our emails with the word unsubscribe and we will stop them.', 400);
}

export function oneClickResponse(o: UnsubOutcome): Response {
  const status = o.status === 'ok' ? 200 : o.status === 'error' ? 500 : o.status === 'not_found' ? 404 : 400;
  return new Response(o.status === 'ok' ? 'unsubscribed' : o.status, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
