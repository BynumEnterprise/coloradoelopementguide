// Couple emails: the planning kit (sent on subscribe and to new planner accounts) and the nurture sequence
// run by /api/cron/daily (stage "nurture"): day 3 region and season, day 7 permits and the license,
// day 12 vendor team, plus one planner nudge for couples who saved no vendors after 2 days.
// Every body passes naturalCheck and carries the Denver address and a one click unsubscribe link.
import { MAIL_FROM, MAIL_REPLY_TO, textToHtml } from './mail';
import { naturalCheck, POSTAL_ADDRESS, SITE_URL } from './outreach';
import { REGIONS } from './taxonomy';

export const KIT_URL = `${SITE_URL}/kit/colorado-elopement-planning-kit.pdf`;
export type NurtureStep = 'kit' | 'region' | 'permits' | 'vendors' | 'planner_nudge';
export type CoupleMail = { subject: string; text: string; html: string; unsubUrl: string };
export type NurtureRecipient = {
  id: number; email: string; token: string; step: NurtureStep; is_couple?: boolean;
  partner_names?: string | null; region?: string | null; wedding_date?: string | null;
};

export const unsubUrl = (token: string) => `${SITE_URL}/api/unsubscribe?t=${encodeURIComponent(token)}`;

// "Hi Sam and Alex," only when the planner profile has plain names; otherwise "Hi,".
function greeting(names?: string | null): string {
  const n = String(names || '').replace(/\s+/g, ' ').trim();
  if (n && n.length <= 60 && /^[\p{L} .'&,]+$/u.test(n) && !/[\-‐-―]/.test(n)) return `Hi ${n.replace(/\s*&\s*/g, ' and ')},`;
  return 'Hi,';
}

const footer = (token: string) => `Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

You are getting this because you asked for the planning kit or made a planner on coloradoelopementguide.com. Unsubscribe in one click: ${unsubUrl(token)}
`;

// Region guide lines. Wording follows each guide's own description.
const REGION_LINES: Record<string, string> = {
  'estes-park': 'Estes Park and Rocky Mountain National Park: the park permit, every designated ceremony site, and the best months.',
  'summit-county': 'Summit County: Sapphire Point reservations, Loveland Pass, Breckenridge and Frisco.',
  'vail-aspen': 'Vail and Aspen: Maroon Bells Amphitheater reservations, Independence Pass and the Vail Valley.',
  'telluride-san-juans': 'Telluride and the San Juans: Bridal Veil Falls, Alta Lakes, Last Dollar Road and Ridgway State Park.',
  'colorado-springs': 'Colorado Springs and Pikes Peak: the Garden of the Gods wedding areas and rules, state parks and Pikes Peak.',
  'boulder': 'Boulder: Chautauqua lawn rules, Sunrise Amphitheater, Lost Gulch and Eldorado Canyon.',
  'denver-foothills': 'Denver and the foothills: Red Rocks and Denver park permits, Mount Falcon and Guanella Pass.',
  'northern-colorado': 'Northern Colorado: Horsetooth Reservoir, Lory State Park, the Poudre Canyon and Red Feather Lakes.'
};
const REGION_ORDER = ['estes-park', 'summit-county', 'vail-aspen', 'telluride-san-juans', 'colorado-springs', 'boulder', 'denver-foothills', 'northern-colorado'];
const guideUrl = (r: string) => `${SITE_URL}/guides/${r}/`;

function finish(subject: string, body: string, token: string, label: string): CoupleMail {
  const text = `${body.trim()}\n${footer(token)}`;
  naturalCheck(subject, `${label} subject`);
  naturalCheck(text, `${label} body`);
  return { subject, text, html: textToHtml(text), unsubUrl: unsubUrl(token) };
}

export function renderKit(r: { token: string; partner_names?: string | null }): CoupleMail {
  const body = `${greeting(r.partner_names)}

Here is the Colorado Elopement Planning Kit. It is a five page PDF made to print: a twelve month timeline, the marriage license steps, a permits table for the places couples ask about most, the questions to ask every vendor before you sign, and a vendor tracker.

Download the kit:
${KIT_URL}

The same checklist is on the site if you would rather read it on screen:
${SITE_URL}/checklist/

Two things that save couples the most stress. Rocky Mountain National Park takes ceremony permit applications one year ahead of your month, and popular months fill, so if the park is on your list, check it first. And Colorado lets the two of you marry without an officiant or witnesses; the license is $30 in most counties and has to be used within 35 days.

When you start comparing vendors, the free planner keeps your shortlist, quotes, budget and this checklist in one place:
${SITE_URL}/account/

Over the next two weeks I will send three short notes: choosing a region and season, permits and the license, and putting your vendor team together. If that is more than you want, the link at the bottom stops them in one click.

Happy planning,`;
  return finish('Your Colorado elopement planning kit', body, r.token, 'kit');
}

export function renderRegion(r: NurtureRecipient): CoupleMail {
  const mine = r.region && REGION_LINES[r.region] ? r.region : null;
  const lines = REGION_ORDER.filter(k => k !== mine).map(k => `${REGION_LINES[k]}\n${guideUrl(k)}`).join('\n\n');
  const lead = mine
    ? `Your planner says you are looking at ${REGIONS[mine]?.name.replace(/&/g, 'and') || 'one region'}, so start with that guide:\n${guideUrl(mine)}\n\nIf you are still deciding, here are the others.`
    : 'Most Colorado elopements start with two choices: where and when. Each region guide covers the ceremony spots, the permit rules, the closest license office, the best months and a sample day.';
  const body = `${greeting(r.partner_names)}

${lead}

${lines}

On timing: summer brings wildflowers and afternoon thunderstorms, which is why so many couples marry at sunrise. Aspens peak in early to late September in the high country and late September to early October in the foothills. Winter closes some high roads and shortens the day, but it also clears the crowds.
${SITE_URL}/resources/colorado-fall-elopement/
${SITE_URL}/resources/winter-elopement-colorado/

If you want twenty spots side by side with their permit status, this is the page:
${SITE_URL}/resources/best-places-to-elope-in-colorado/

Talk soon,`;
  return finish('Picking your region and season', body, r.token, 'region');
}

export function renderPermits(r: NurtureRecipient): CoupleMail {
  const body = `${greeting(r.partner_names)}

This is the note on paperwork. It is the part couples worry about most, and in Colorado it is simpler than you might think.

The license. Any county clerk in Colorado can issue it and it works anywhere in the state. You both appear with photo ID (or one of you brings a notarized absentee affidavit), it is $30 in most counties, there is no waiting period, and it must be used within 35 days. Afterward the signed certificate goes back to the same clerk within 63 days.
${SITE_URL}/resources/colorado-marriage-license/

Marrying yourselves. Colorado law lets the two of you solemnize your own marriage. No officiant, no witnesses. You both sign as the parties and in the officiant block, then return the certificate. The guide shows exactly how to fill it in.
${SITE_URL}/resources/self-solemnization-colorado/

Rocky Mountain National Park. Any ceremony of two or more people needs a special use permit at one of the designated sites. The fee is $300, applications go in by email one year ahead of your month, and group size runs 10 to 30 depending on the site, counting your photographer and officiant.
${SITE_URL}/resources/rocky-mountain-national-park-wedding-permit/

Elsewhere the rules vary a lot. Garden of the Gods has no fee, Maroon Bells and Sapphire Point book through Recreation.gov, and a small ceremony with no props on most national forest land needs no permit at all. The permits page in your planning kit has the full table:
${SITE_URL}/kit/colorado-elopement-planning-kit.pdf

Best,`;
  return finish('Permits and the marriage license', body, r.token, 'permits');
}

export function renderVendors(r: NurtureRecipient): CoupleMail {
  const body = `${greeting(r.partner_names)}

Last note in this series: putting your vendor team together. The usual booking order is photographer first (good elopement photographers know the permit rules and often help choose the spot), then the location or venue, then an officiant if you want one, then a planner if you want the logistics handled, then flowers and hair and makeup.

Photographers: ${SITE_URL}/category/photographers/
Venues: ${SITE_URL}/category/venues/
Officiants: ${SITE_URL}/category/officiants/
Planners: ${SITE_URL}/category/planners/
Florists: ${SITE_URL}/category/florists/
Hair and makeup: ${SITE_URL}/category/hair-makeup/

Every vendor page has a Check Availability form. Send your date, guest count and a line about what you have in mind; vendors who manage their listing get it straight away and reply to you directly.

Tap the heart on any vendor to save them. They show up in your planner, where you can mark who you contacted, log quotes and keep a budget:
${SITE_URL}/account/

Ask each one the same few questions so the answers are easy to compare: what is included hour by hour, who actually shows up, whether permit and travel fees are extra, and what happens if weather or a road closure stops you. The full list is on page four of the kit.

If you get stuck on anything, reply to this email. It comes to me.

All the best,`;
  return finish('Building your vendor team', body, r.token, 'vendors');
}

export function renderPlannerNudge(r: NurtureRecipient): CoupleMail {
  const body = `${greeting(r.partner_names)}

You set up a planner on Colorado Elopement Guide a couple of days ago, and it does not have any vendors in it yet. Here is the quickest way to get going.

Open one category, look through a few listings, and tap the heart on two or three that feel right. The next time you open your planner they are there, ready for notes on who you contacted, quotes and a budget that adds itself up. Most couples start with photographers, because a good one helps with the spot and the permit too.
${SITE_URL}/category/photographers/

Or start from a region:
${SITE_URL}/vendors/

Your planner is here whenever you want it:
${SITE_URL}/account/

If something on the site did not work the way you expected, reply and tell me. I read every one.

Thanks,`;
  return finish('A quick start for your planner', body, r.token, 'planner_nudge');
}

export function renderNurture(r: NurtureRecipient): CoupleMail {
  switch (r.step) {
    case 'kit': return renderKit(r);
    case 'region': return renderRegion(r);
    case 'permits': return renderPermits(r);
    case 'vendors': return renderVendors(r);
    case 'planner_nudge': return renderPlannerNudge(r);
    default: throw new Error(`unknown nurture step ${String((r as any).step)}`);
  }
}

// Resend send with RFC 8058 one click unsubscribe headers (Gmail and Yahoo bulk sender rules).
export async function sendCoupleMail(to: string, m: CoupleMail): Promise<{ ok: boolean; status: number; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  if (!key) return { ok: false, status: 0, error: 'no RESEND_API_KEY' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM, to: [to], reply_to: MAIL_REPLY_TO, subject: m.subject, text: m.text, html: m.html,
        headers: { 'List-Unsubscribe': `<${m.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
      })
    });
    const body = await r.text();
    if (!r.ok) return { ok: false, status: r.status, error: body.slice(0, 300) };
    let id: string | undefined;
    try { id = JSON.parse(body)?.id; } catch { /* noop */ }
    return { ok: true, status: r.status, id };
  } catch (e) { return { ok: false, status: 0, error: String(e) }; }
}
