export const MAIL_FROM = 'Colorado Elopement Guide <hello@send.coloradoelopementguide.com>';
export const MAIL_REPLY_TO = 'bynumenterprisesbe@gmail.com';
export const OWNER_EMAIL = 'bynumenterprisesbe@gmail.com';

// Every email goes through deliver(). `kind` decides the unsubscribe handling (owner directive 2026-11-09,
// CAN-SPAM and the Gmail and Yahoo bulk sender rules):
//   transactional  login links, claim receipts, the couple's own inquiry or match confirmation, the welcome with the
//                  dashboard link, and every notice to OWNER_EMAIL. Always sent, no unsubscribe footer.
//   inquiry        a couple's inquiry relayed to a vendor account (Reply To the couple). The couple is asking that
//                  vendor for business, so it is delivered even to a suppressed address, with nothing added.
//   lifecycle      drips, activation, monthly report, reply reminders, photo nudge, kit and nurture, saved list,
//                  claim notice to an unclaimed listing.
//   marketing      claim invites and follow ups, referral invites, Featured pitches.
// lifecycle and marketing: checked against p2_suppressions (ceg_is_suppressed) first and skipped when suppressed;
// when the check itself fails the mail is NOT sent (fail closed). Each one carries List-Unsubscribe (signed https
// link plus mailto) with List-Unsubscribe-Post One-Click, and a visible per recipient unsubscribe line unless the
// body already has one of our unsubscribe links.
import { rpc, authSecret } from './cron';
import { makeUnsubUrl, unsubHeaders } from './unsub';

export type MailKind = 'transactional' | 'inquiry' | 'lifecycle' | 'marketing';
export type MailResult = { ok: boolean; status: number; id?: string; error?: string; suppressed?: boolean };
export type DeliverOpts = { kind: MailKind; replyTo?: string; from?: string };

export const isBulkKind = (k: MailKind) => k === 'lifecycle' || k === 'marketing';

const HAS_UNSUB_LINK = /coloradoelopementguide\.com\/api\/(unsub|unsubscribe)\?/;
export const unsubLine = (url: string) => `To stop all email from Colorado Elopement Guide, use this link: ${url}`;

// Adds the visible line to the text and html parts when the body has no unsubscribe link of ours yet.
export function withUnsubFooter(to: string, text: string, html?: string): { text: string; html?: string } {
  if (HAS_UNSUB_LINK.test(text)) return { text, html };
  const url = makeUnsubUrl(to);
  const t = `${text.replace(/\s+$/, '')}\n\n${unsubLine(url)}\n`;
  if (!html) return { text: t, html };
  const href = url.replace(/&/g, '&amp;');
  const p = `<p style="font-size:13px;color:#6b665e">To stop all email from Colorado Elopement Guide, <a href="${href}">unsubscribe here</a>.</p>`;
  const h = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${p}\n</body>`) : `${html}\n${p}`;
  return { text: t, html: h };
}

// True when the address must not get lifecycle or marketing mail. Throws when the check cannot be made.
export async function isSuppressed(email: string): Promise<boolean> {
  const secret = authSecret();
  if (!secret) throw new Error('no CEG_AUTH_SECRET for the suppression check');
  return Boolean(await rpc<boolean>('ceg_is_suppressed', { p_secret: secret, p_email: String(email || '').trim().toLowerCase() }));
}

export async function deliver(to: string, subject: string, text: string, html: string | undefined, opts: DeliverOpts): Promise<MailResult> {
  const bulk = isBulkKind(opts.kind);
  if (bulk) {
    let sup: boolean;
    try { sup = await isSuppressed(to); }
    catch (e) { console.error('MAIL: suppression check failed, not sending', opts.kind, e); return { ok: false, status: 0, error: 'suppression check failed: ' + String(e).slice(0, 200) }; }
    if (sup) return { ok: false, status: 0, suppressed: true, error: 'suppressed' };
  }
  const key = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  if (!key) { console.error('MAIL: no RESEND_API_KEY in env'); return { ok: false, status: 0, error: 'no RESEND_API_KEY' }; }
  try {
    let body: { text: string; html?: string } = { text, html };
    let headers: Record<string, string> | undefined;
    if (bulk) { body = withUnsubFooter(to, text, html); headers = unsubHeaders(to); }
    const payload: Record<string, unknown> = { from: opts.from || MAIL_FROM, to: [to], reply_to: opts.replyTo || MAIL_REPLY_TO, subject, text: body.text };
    if (body.html) payload.html = body.html;
    if (headers) payload.headers = headers;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const rb = await r.text();
    if (!r.ok) { console.error('MAIL: resend error', r.status, rb); return { ok: false, status: r.status, error: rb.slice(0, 300) }; }
    let id: string | undefined;
    try { id = JSON.parse(rb)?.id; } catch { /* noop */ }
    return { ok: true, status: r.status, id };
  } catch (e) { console.error('MAIL: exception', e); return { ok: false, status: 0, error: String(e) }; }
}

// Full detail sender used by the cron jobs (they need the HTTP status and the Resend id). kind is required so
// every call site states what it sends.
export async function sendMailResult(kind: MailKind, to: string, subject: string, text: string, html?: string): Promise<MailResult> {
  return deliver(to, subject, text, html, { kind });
}

// Same with a different Reply To (the couple, for inquiries delivered to a vendor account).
export async function sendMailReplyTo(kind: MailKind, to: string, replyTo: string, subject: string, text: string, html?: string): Promise<MailResult> {
  return deliver(to, subject, text, html, { kind, replyTo });
}

// Boolean form kept for the simple callers.
export async function sendMail(kind: MailKind, to: string, subject: string, text: string, html?: string) {
  return (await sendMailResult(kind, to, subject, text, html)).ok;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Plain text to a minimal HTML part: blank-line paragraphs become <p>, single newlines become <br>,
// and every URL becomes an anchor (bare URLs in a plain text only mail get rewritten by Gmail).
export function textToHtml(text: string): string {
  const paras = text.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  const body = paras.map(p => {
    const lines = p.split('\n').map(line => {
      const parts: string[] = [];
      let last = 0;
      const re = /https?:\/\/[^\s<>"')\]]+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line))) {
        parts.push(esc(line.slice(last, m.index)));
        const url = m[0];
        parts.push(`<a href="${esc(url)}">${esc(url.replace(/^https?:\/\//, ''))}</a>`);
        last = m.index + url.length;
      }
      parts.push(esc(line.slice(last)));
      return parts.join('');
    });
    return `<p>${lines.join('<br>')}</p>`;
  }).join('\n');
  return `<!doctype html><html><body style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#222;max-width:640px">\n${body}\n</body></html>`;
}
