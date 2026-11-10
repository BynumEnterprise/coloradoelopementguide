// Personal Featured pitch for one claimed vendor, built from their real numbers (ceg_admin_pitch 'prepare').
// Rendered on the server so the admin preview, the Copy button and the sent email are the same text,
// and every version passes naturalCheck before anyone sees it.
import { naturalCheck, displayName, categoryPlural, greetingFor, slotLine, SITE_URL, POSTAL_ADDRESS, featuredLinkFor, FEATURED_CAP, FOUNDING_CAP } from './outreach';
import { textToHtml, deliver, type MailResult } from './mail';

export const PITCH_FROM = 'Ryan at Colorado Elopement Guide <hello@send.coloradoelopementguide.com>';

export type PitchPrep = {
  vendor: { id: number; slug: string; name: string; category: string; sub_region: string | null; status: string };
  account: { email: string; token: string; verified: boolean; unsubscribed: boolean } | null;
  numbers: { views_7d: number; views_30d: number; views_all: number; site_30d: number; phone_30d: number; inquiries_30d: number; inquiries_total: number; category_rank: number; category_count: number };
  slots: { cap: number; open: number; taken: number };
  founding: { cap: number; left: number };
  blocked: string | null;
};

export type Pitch = { to: string; subject: string; text: string; html: string; unsubUrl: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function renderPitch(p: PitchPrep): Pitch {
  const v = p.vendor, n = p.numbers || ({} as PitchPrep['numbers']);
  const to = p.account?.email || '';
  const token = p.account?.token || '';
  const business = displayName(v.name);
  const greeting = greetingFor(to, business);
  const views = Number(n.views_30d) || 0;
  const clicks = (Number(n.site_30d) || 0) + (Number(n.phone_30d) || 0);
  const inq30 = Number(n.inquiries_30d) || 0;
  const rank = Number(n.category_rank) || 0, count = Number(n.category_count) || 0;
  const cats = categoryPlural(v.category);
  const open = Math.max(0, Math.min(FEATURED_CAP, Number(p.slots?.open) || 0));
  const left = Math.max(0, Math.min(FOUNDING_CAP, Number(p.founding?.left) || 0));
  const where = slotLine(open, v.category, v.sub_region || 'other-colorado').replace(/^.*? open for /, '');
  const unsubUrl = `${SITE_URL}/api/unsub?t=${token}`;

  const bits: string[] = [];
  if (views > 0) {
    bits.push(plural(views, 'profile view', 'profile views'));
    if (clicks > 0) bits.push(`${plural(clicks, 'click', 'clicks')} through to your website or phone`);
    if (inq30 > 0) bits.push(plural(inq30, 'inquiry from a couple', 'inquiries from couples'));
  }
  const list = bits.length <= 1 ? (bits[0] || '') : bits.length === 2 ? `${bits[0]} and ${bits[1]}` : `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}`;
  let statLine = views > 0
    ? `In the last 30 days your ${business} page on Colorado Elopement Guide had ${list}.`
    : `${business} is claimed and verified on Colorado Elopement Guide, but your page has not had many views in the last 30 days yet.`;
  if (views > 0 && rank > 0 && count > 0 && rank <= Math.max(10, Math.ceil(count / 2))) {
    statLine += ` That puts you at number ${rank} of ${count} ${cats} on the site by views.`;
  }

  const slotSentence = open === 0
    ? `all ${FEATURED_CAP} Featured spots for ${where} are taken`
    : open === FEATURED_CAP ? `all ${FEATURED_CAP} Featured spots for ${where} are still open`
    : open === 1 ? `only 1 of the ${FEATURED_CAP} Featured spots for ${where} is open` : `${open} of the ${FEATURED_CAP} Featured spots for ${where} are open`;
  const slotPara = open > 0
    ? `Featured is capped at ${FEATURED_CAP} vendors per category in each region, and right now ${slotSentence}. Featured listings sit at the top of your category and region pages and in the homepage rotation, always labeled as Featured, and inquiries still come straight to your email.`
    : `Featured is capped at ${FEATURED_CAP} vendors per category in each region, and right now ${slotSentence}. If you want the next one, reply and I will put you on the waitlist.`;

  const pricePara = left > 0
    ? `It is 40 dollars a month, and the first ${FOUNDING_CAP} Featured vendors keep that price for as long as they stay subscribed. ${left === FOUNDING_CAP ? `All ${FOUNDING_CAP} of those founding spots are still open` : `${left} of those ${FOUNDING_CAP} founding spots are still open`}. The first month is 1 dollar with the code FIRSTMONTH1, there is no contract, and you can cancel anytime.`
    : `It is 40 dollars a month. The first month is 1 dollar with the code FIRSTMONTH1, there is no contract, and you can cancel anytime.`;

  const linkPara = open > 0
    ? `If you want it, check out with the email you use for your dashboard so it switches on by itself:\n${featuredLinkFor(v.slug)}\n\nThe details are here: ${SITE_URL}/featured`
    : `The details are here: ${SITE_URL}/featured`;

  const subject = open > 0 ? `A Featured spot for ${business}` : `${business} and the Featured waitlist`;

  const text = `${greeting}

${statLine}

${slotPara}

${pricePara}

${linkPara}

If it is not a fit right now, just reply and say so. I read every reply.

Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

Prefer no more emails? ${unsubUrl}
`;
  naturalCheck(subject, `pitch subject (${v.slug})`, [v.name, business]);
  naturalCheck(text, `pitch body (${v.slug})`, [v.name, business]);
  return { to, subject, text, html: textToHtml(text), unsubUrl };
}

export type SendResult = MailResult;

// Marketing: suppression check (fail closed), signed List-Unsubscribe plus One-Click headers, sent as Ryan.
export async function sendPitch(p: Pitch): Promise<SendResult> {
  return deliver(p.to, p.subject, p.text, p.html, { kind: 'marketing', from: PITCH_FROM });
}
