// Signed per recipient unsubscribe links (owner directive 2026-11-09: "make sure if people unsubscribe, they are
// unsubscribed"). The link is /api/unsub?e=<email>&t=<sig>, where sig is the first 32 hex characters of
// HMAC SHA256(lowercased email, CEG_AUTH_SECRET). Nobody can unsubscribe someone else without the secret.
// The same URL goes into the List-Unsubscribe header (RFC 8058 one click, Gmail and Yahoo bulk sender rules).
// Legacy token links (/api/unsub?t=<vendor user token>, /api/unsubscribe?t=<p2_nurture.unsub_token>) keep working.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { authSecret, SITE } from './cron';

// No mailto part on purpose: send.coloradoelopementguide.com has no MX or A record (checked 2026-11-09), so a mailto
// unsubscribe there would bounce and be lost. RFC 8058 only needs the https URI; replies saying unsubscribe still reach
// the Reply To inbox, which the daily reply review reads.

export const normEmail = (email: string) => String(email || '').trim().toLowerCase();

export function unsubSig(email: string, secret = authSecret()): string {
  if (!secret) throw new Error('unsub: CEG_AUTH_SECRET missing');
  return createHmac('sha256', secret).update(normEmail(email)).digest('hex').slice(0, 32);
}

export function makeUnsubUrl(email: string): string {
  return `${SITE}/api/unsub?e=${encodeURIComponent(normEmail(email))}&t=${unsubSig(email)}`;
}

export function verifyUnsub(email: string, t: string): boolean {
  const e = normEmail(email);
  if (!e || e.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return false;
  if (!/^[0-9a-f]{32}$/.test(String(t || ''))) return false;
  const secret = authSecret();
  if (!secret) return false;
  const a = Buffer.from(unsubSig(e, secret)), b = Buffer.from(String(t));
  return a.length === b.length && timingSafeEqual(a, b);
}

// RFC 2369 / 8058 headers for Resend's `headers` object.
export function unsubHeaders(email: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${makeUnsubUrl(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
  };
}
