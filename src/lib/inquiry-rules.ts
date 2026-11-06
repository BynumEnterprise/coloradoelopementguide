// Validation and spam rules shared by every couple inquiry endpoint (/api/inquiry, /api/inquiry-more,
// /api/match). Keep the rules here so the three forms always agree on what a bad message looks like.

export const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[A-Za-z]{2,}$/;
export const URL_COUNT_RE = /(https?:\/\/|www\.)[^\s]+/gi;
export const SPAM_RE = /\b(seo|backlinks?|guest posts?|link building|domain authority|crypto|bitcoin|btc|usdt|forex|nft|explainer videos?|promo(tional)? videos?|video ads?|animated videos?|first page (of|on) google|rank(ing)? (higher|on google|your (site|website))|web(site)? traffic|more traffic|increase (your )?traffic|lead generation|marketing services|web design services|virtual assistant|casino|loan offer)\b/i;
export const SLUG_RE = /^[a-z0-9-]{2,120}$/;

// Normalize a form value: CRLF to LF, strip control characters, trim, cap the length.
export const clean = (s: unknown, max: number) =>
  String(s ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

// Same spam test as /api/inquiry: more than two links, a sales phrase, or a link where the names should be.
export function looksLikeSpam(message: string, names: string): boolean {
  const urlCount = (message.match(URL_COUNT_RE) || []).length + (names.match(URL_COUNT_RE) || []).length;
  return urlCount > 2 || SPAM_RE.test(message) || SPAM_RE.test(names) || /https?:\/\//i.test(names);
}

// Messages from ceg_inquiry_submit's error codes, as the couple should read them.
export const SUBMIT_ERRORS: Record<string, string> = {
  vendor_not_found: 'This listing is no longer available.',
  dup_vendor: 'You already sent this vendor a note today. Give them a day or two to reply.',
  email_daily: 'You have sent five inquiries today. Please try again tomorrow.',
  site_hourly: 'We are getting a lot of messages right now. Please try again in an hour.'
};
