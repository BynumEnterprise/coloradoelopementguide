// Shared logic behind /api/unsub and /api/unsubscribe. Both accept:
//   ?e=<email>&t=<32 hex HMAC>   the signed link in every lifecycle and marketing email (src/lib/unsub.ts)
//   ?t=<uuid>                    legacy links: a vendor user token (/api/unsub) or a p2_nurture.unsub_token
//                                (/api/unsubscribe). Both RPCs resolve the token to its email in the database and
//                                put that address on the suppression list, so it applies to every list, not one.
// Scanner safe (review 2026-11-09): email security scanners open every link in a message within minutes of the send
// (39 percent of October traffic), so GET never unsubscribes. GET checks the link and shows one button, a plain
// HTML form (no JavaScript) that POSTs the same parameters with confirm=1; that POST unsubscribes and shows the done
// page. Any other POST is RFC 8058 one click (body List-Unsubscribe=One-Click from Gmail and Yahoo): it unsubscribes
// immediately and answers 200 with a short text body. A bad or mismatched token never reaches the database.
import { rpc, authSecret } from './cron';
import { verifyUnsub, normEmail } from './unsub';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const escH = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export type UnsubOutcome = { status: 'ok' | 'invalid' | 'not_found' | 'error'; email?: string };

// legacyRpc: 'ceg_unsub' (vendor user token) or 'ceg_nurture_unsub' (nurture token).
export type UnsubParams = { e: string | null; t: string };
export type LegacyRpc = 'ceg_unsub' | 'ceg_nurture_unsub';

// Query string first; a form body (the confirm button) can carry the same fields.
export function unsubParams(url: URL, form?: FormData | null): UnsubParams {
  const pick = (k: string) => url.searchParams.get(k) ?? (form ? (form.get(k) as string | null) : null);
  const e = pick('e');
  return { e: e === null ? null : String(e), t: String(pick('t') || '').trim() };
}

// Shape and signature check only, no database call. Legacy tokens can only be shape checked here.
export function checkUnsub(p: UnsubParams): UnsubOutcome {
  if (p.e !== null) return verifyUnsub(normEmail(p.e), p.t) ? { status: 'ok', email: normEmail(p.e) } : { status: 'invalid' };
  return UUID_RE.test(p.t) ? { status: 'ok' } : { status: 'invalid' };
}

export async function performUnsub(p: UnsubParams, legacyRpc: LegacyRpc, source: 'link' | 'one_click'): Promise<UnsubOutcome> {
  const { e, t } = p;
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

// The GET page: one button that POSTs the same parameters. Only shown for a link that passed checkUnsub.
export function confirmPage(path: string, p: UnsubParams, o: UnsubOutcome): Response {
  if (o.status !== 'ok') return unsubPage(o);
  const qs = new URLSearchParams();
  if (p.e !== null) qs.set('e', normEmail(p.e));
  qs.set('t', p.t);
  const action = escH(`${path}?${qs.toString()}`);
  const hidden = (p.e !== null ? `<input type="hidden" name="e" value="${escH(normEmail(p.e))}">` : '') + `<input type="hidden" name="t" value="${escH(p.t)}"><input type="hidden" name="confirm" value="1">`;
  const who = o.email ? escH(o.email) : 'this address';
  return page('Unsubscribe', `Stop all email from Colorado Elopement Guide to ${who}? Press the button to confirm.</p>
<form method="post" action="${action}" style="margin:0 0 18px;">${hidden}<button type="submit" style="font:inherit;font-size:17px;background:#2f4a3f;color:#fff;border:0;border-radius:6px;padding:12px 28px;cursor:pointer;">Unsubscribe</button></form><p style="font-size:14px;color:#6b665e;margin:0 0 18px;">If you did not mean to open this page, close it and nothing changes.`);
}

export function unsubPage(o: UnsubOutcome): Response {
  if (o.status === 'ok') {
    const who = o.email ? escH(o.email) : 'This address';
    return page('Unsubscribed', `You are unsubscribed. ${who} will get no more email from Colorado Elopement Guide. The only exception is something you ask for yourself, such as a sign in link.`);
  }
  if (o.status === 'error') return page('Unsubscribe', 'Something went wrong on our side and the unsubscribe did not save. Please open the link again in a minute, or reply to any of our emails with the word unsubscribe and we will stop them.', 500);
  if (o.status === 'not_found') return page('Unsubscribe', 'We could not match that link to an address. Reply to any of our emails with the word unsubscribe and we will stop them.', 404);
  return page('Unsubscribe', 'That unsubscribe link is not valid. Reply to any of our emails with the word unsubscribe and we will stop them.', 400);
}

// Route factory used by both endpoints.
export function unsubRoutes(path: '/api/unsub' | '/api/unsubscribe', legacyRpc: LegacyRpc) {
  const GET = async ({ url }: { url: URL }) => { const p = unsubParams(url); return confirmPage(path, p, checkUnsub(p)); };
  const POST = async ({ url, request }: { url: URL; request: Request }) => {
    let form: FormData | null = null;
    try { form = await request.formData(); } catch { form = null; }
    const p = unsubParams(url, form);
    if (form && form.get('confirm') === '1' && form.get('List-Unsubscribe') === null) return unsubPage(await performUnsub(p, legacyRpc, 'link'));
    return oneClickResponse(await performUnsub(p, legacyRpc, 'one_click'));
  };
  return { GET, POST };
}

export function oneClickResponse(o: UnsubOutcome): Response {
  const status = o.status === 'ok' ? 200 : o.status === 'error' ? 500 : o.status === 'not_found' ? 404 : 400;
  return new Response(o.status === 'ok' ? 'unsubscribed' : o.status, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
