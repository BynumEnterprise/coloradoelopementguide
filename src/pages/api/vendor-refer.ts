export const prerender = false;
import type { APIRoute } from 'astro';
import { rpc, json, fireDeployHook } from '../../lib/cron';
import { sendMailResult } from '../../lib/mail';
import { SITE_URL, POSTAL_ADDRESS, naturalCheck, displayName, greetingFor, tagLinks } from '../../lib/outreach';
import { textToHtml } from '../../lib/mail';

// M4 referral loop. A verified vendor account invites a vendor it works with from the dashboard card. ceg_vendor_refer
// (vendor login token, five a day) writes the p2_referrals row, matches the invitee to a p2_vendors row by name, website
// domain or email domain, and releases a queued match at once (referred vendors are exempt from the weekly release cap).
// Then one plain email goes to the invitee from hello@ in Ryan's voice, through naturalCheck. No Featured mention.
type ReferResult = {
  ok?: boolean; error?: string; token?: string; referrer_name?: string; referrer_slug?: string; referrer_email?: string;
  match?: { id: number; slug: string; name: string; status: string } | null; released?: boolean;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function renderReferral(p: { referrerName: string; referrerPerson: string | null; inviteeName: string; inviteeEmail: string; token: string; matchSlug: string | null }) {
  const referrer = displayName(p.referrerName);
  const invitee = displayName(p.inviteeName);
  const who = p.referrerPerson ? `${p.referrerPerson} at ${referrer}` : referrer;
  const link = p.matchSlug ? `${SITE_URL}/claim/${p.matchSlug}/?ref=${p.token}` : `${SITE_URL}/for-vendors/?ref=${p.token}`;
  const subject = `${referrer} suggested you for Colorado Elopement Guide`;
  const listed = p.matchSlug
    ? `${invitee} already has a free listing there, and your page to claim it is here:`
    : `A free listing for ${invitee} is ready to set up here:`;
  const text = `${greetingFor(p.inviteeEmail, invitee)}

${who} listed with us on Colorado Elopement Guide, a site that helps couples find vendors for small Colorado weddings, and suggested you as someone they work with.

${listed}
${link}

Claiming is free and takes about a minute. You can fix your details, add photos, read couple inquiries, and see how many couples open your page, with bots filtered out. No card and no catch.

${p.matchSlug ? 'If you would rather not be listed at all, reply with the word remove and I will take it down within a business day.' : 'If this is not for you, no reply needed.'}

Thanks,
Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

You are getting this one note because ${referrer} suggested you. Reply unsubscribe and you will not hear from me again.
`;
  const allow = [p.referrerName, referrer, p.inviteeName, invitee, p.referrerPerson || ''];
  naturalCheck(subject, 'referral subject', allow);
  naturalCheck(text, 'referral body', allow);
  return { subject, text, html: tagLinks(textToHtml(text), 'referral', 'vendor'), link };
}

// "Julie" from julie@cielocastlepines.com, when the mailbox is a person; otherwise null.
function personFrom(email: string | undefined, business: string): string | null {
  const g = greetingFor(email || '', business);
  const m = /^Hi ([A-Z][a-z]+),$/.exec(g);
  return m && m[1] !== business ? m[1] : null;
}

export const POST: APIRoute = async ({ request }) => {
  let body: any = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Bad request.' }, 400); }
  const token = String(body.token || '').trim();
  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const website = String(body.website || '').trim().slice(0, 200);
  if (!UUID_RE.test(token)) return json({ ok: false, error: 'Please sign in again.' }, 401);
  if (!name) return json({ ok: false, error: 'Add the vendor name.' }, 400);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  if (website && !/^(https?:\/\/)?[^\s.]+\.[^\s]+$/i.test(website)) return json({ ok: false, error: 'That website address does not look right.' }, 400);

  let r: ReferResult;
  try { r = await rpc<ReferResult>('ceg_vendor_refer', { p_token: token, p_name: name, p_email: email, p_website: website || null }); }
  catch (e) { console.error('vendor-refer rpc', e); return json({ ok: false, error: 'Could not save the invitation. Try again.' }, 502); }
  if (!r || !r.ok || !r.token) return json({ ok: false, error: r?.error || 'Could not save the invitation.' }, 400);

  let mail;
  try {
    mail = renderReferral({ referrerName: r.referrer_name || 'A vendor', referrerPerson: personFrom(r.referrer_email, displayName(r.referrer_name || '')),
      inviteeName: name, inviteeEmail: email, token: r.token, matchSlug: r.match?.slug || null });
  } catch (e) { console.error('vendor-refer render', e); return json({ ok: false, error: 'Saved, but the invitation could not be written. We will send it by hand.' }, 500); }

  const res = await sendMailResult(email, mail.subject, mail.text, mail.html);
  // A queued match was just released: rebuild so its vendor and claim pages exist before the invitee clicks.
  if (r.released) { try { await fireDeployHook(); } catch { /* noop */ } }
  return json({ ok: res.ok, sent: res.ok, listed: !!r.match, vendor: r.match?.name || null, error: res.ok ? undefined : 'Saved, but the email did not go out. We will send it by hand.' }, res.ok ? 200 : 502);
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
