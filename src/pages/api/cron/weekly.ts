export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret, cronAuthorized, fetchWithTimeout, fireDeployHook, ingestImage, mapLimit, SITE } from '../../../lib/cron';
import { sendMailResult, OWNER_EMAIL } from '../../../lib/mail';
import { REGIONS } from '../../../lib/taxonomy';
import { IMG } from '../../../lib/assets';
import { displayName } from '../../../lib/outreach';
import { runMonthlyReports } from '../../../lib/vendor-report';
import { runCanary } from '../../../lib/canary';

// Weekly P2 automation (Vercel cron, Monday 14:00 UTC):
//   1. release up to 40 queued vendors (balanced across regions, junk names excluded)
//   2. refresh each released vendor's Google Maps rating, review count and photo via DataForSEO + the image ingest function
//   3. fire the Vercel deploy hook so the released vendors go live
//   4. email the owner the KPI digest
//   5. create 3 Pinterest pins when PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID are set
//   6. monthly_reports: first Monday of the month (Denver), the previous month's stats email to each verified vendor account
//   7. canary: money path canary against the hidden synthetic vendor (src/lib/canary.ts); alerts the owner on failure
// Flags for manual runs: ?dry=1 (release count 0, no sends, no pins), ?release=N, ?only=monthly_reports, ?only=canary or ?only=digest (that stage alone; digest also runs the canary so it can report it).

const RELEASE_N = 40;
const DASHES = /[\-‐‑‒–—―]/g;

type Released = { id: number; slug: string; name: string; lat: number | null; lng: number | null; address: string | null; image_url: string | null; place_id: string | null; sub_region: string | null };
type MapsItem = { type?: string; title?: string; place_id?: string; rating?: { value?: number; votes_count?: number } | null; main_image?: string | null };

const norm = (s: string) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

async function mapsLookup(v: Released, login: string, password: string): Promise<MapsItem | null> {
  const task: Record<string, unknown> = {
    keyword: `${v.name} ${v.address || 'Colorado'}`.slice(0, 200),
    language_code: 'en', depth: 3
  };
  if (v.lat != null && v.lng != null) task.location_coordinate = `${v.lat},${v.lng},14z`; else task.location_code = 2840;
  const r = await fetchWithTimeout('https://api.dataforseo.com/v3/serp/google/maps/live/advanced', 40000, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify([task])
  });
  if (!r.ok) throw new Error(`dataforseo ${r.status}`);
  const data: any = await r.json();
  const t = data?.tasks?.[0];
  if (!t || t.status_code !== 20000) throw new Error(`dataforseo task ${t?.status_code} ${t?.status_message || ''}`);
  const items: MapsItem[] = (t.result?.[0]?.items || []).filter((i: MapsItem) => i.type === 'maps_search');
  if (v.place_id) { const hit = items.find(i => i.place_id === v.place_id); if (hit) return hit; }
  const want = norm(v.name);
  return items.find(i => norm(i.title || '') === want) || null;
}

function bigPhoto(url: string | null | undefined): string | null {
  if (!url || !/^https?:\/\//.test(url)) return null;
  return /=w\d+-h\d+-k-no/.test(url) ? url.replace(/=w\d+-h\d+-k-no.*$/, '=w1200-h750-k-no') : `${url}=w1200-h750-k-no`;
}

// Pinterest rotation: 8 guides then 8 region pages, 3 pins per week, index kept in p2_config.pinterest_rotation.
const REGION_SLUGS = ['estes-park', 'summit-county', 'vail-aspen', 'telluride-san-juans', 'colorado-springs', 'boulder', 'denver-foothills', 'northern-colorado'];
const GUIDE_TITLES: Record<string, string> = {
  'estes-park': 'How To Elope In Estes Park And Rocky Mountain National Park',
  'summit-county': 'How To Elope In Breckenridge And Summit County',
  'vail-aspen': 'How To Elope In Vail, Aspen And The Maroon Bells',
  'telluride-san-juans': 'How To Elope In Telluride And The San Juan Mountains',
  'colorado-springs': 'How To Elope At Garden Of The Gods And Pikes Peak',
  'boulder': 'How To Elope In Boulder And The Flatirons',
  'denver-foothills': 'How To Elope In Denver And The Front Range Foothills',
  'northern-colorado': 'How To Elope In Fort Collins And Northern Colorado'
};
const REGION_TITLES: Record<string, string> = {
  'estes-park': 'Estes Park Elopement Vendors: Photographers, Venues And Officiants',
  'summit-county': 'Summit County Elopement Vendors For Small Mountain Weddings',
  'vail-aspen': 'Vail And Aspen Elopement Vendors For Intimate Weddings',
  'telluride-san-juans': 'Telluride Elopement Vendors: Photographers, Venues And Planners',
  'colorado-springs': 'Colorado Springs Elopement Vendors For Small Weddings',
  'boulder': 'Boulder Elopement Vendors: Photographers, Venues And Florists',
  'denver-foothills': 'Denver Elopement Vendors For Micro Weddings',
  'northern-colorado': 'Northern Colorado Elopement Vendors For Small Weddings'
};
const SPOTS: Record<string, string> = {
  'estes-park': 'the designated ceremony sites inside Rocky Mountain National Park and the Peak to Peak overlooks',
  'summit-county': 'Sapphire Point, the Breckenridge overlooks and the lakeside spots around Dillon and Frisco',
  'vail-aspen': 'the Maroon Bells amphitheater, Ashcroft and the Vail Valley meadows',
  'telluride-san-juans': 'the San Sophia overlook, Ouray Box Canon and the high passes of the San Juan Skyway',
  'colorado-springs': 'the ceremony areas at Garden of the Gods, Manitou Springs and the Pikes Peak foothills',
  'boulder': 'Chautauqua, the Sunrise Amphitheater and the Flatirons trails',
  'denver-foothills': 'Red Rocks area overlooks, Golden, Evergreen and Mount Falcon',
  'northern-colorado': 'Horsetooth Reservoir, the Poudre Canyon and the foothills above Fort Collins'
};
function regionLabel(slug: string) { return REGIONS[slug].name.replace(/&/g, 'and').replace(DASHES, ' '); }
function guideDesc(slug: string) {
  return `A planning guide for eloping in ${regionLabel(slug)}: ${SPOTS[slug]}, the permits and rules that apply, how the Colorado marriage license works with no witnesses and no waiting period, the best months and times of day, and where to stay. Written for couples planning a small Colorado wedding.`;
}
function regionDesc(slug: string) {
  return `Colorado Elopement Guide lists ${regionLabel(slug)} elopement vendors in one place: photographers, small venues, officiants, florists, hair and makeup artists and planners who work with couples having a small wedding. Compare a few at once, check ratings and reviews, and reach out directly. Free to browse, with a planning guide for the region alongside.`;
}
export function pinTargets() {
  const out: { title: string; description: string; link: string; image: string }[] = [];
  for (const s of REGION_SLUGS) out.push({ title: GUIDE_TITLES[s], description: guideDesc(s), link: `${SITE}/guides/${s}`, image: `${IMG}/${s}.jpg` });
  for (const s of REGION_SLUGS) out.push({ title: REGION_TITLES[s], description: regionDesc(s), link: `${SITE}/region/${s}`, image: `${IMG}/${s}.jpg` });
  return out;
}

const dedash = (s: string) => s.replace(/https?:\/\/[^\s]+/g, m => `\u0000${Buffer.from(m).toString('base64')}\u0000`)
  .replace(DASHES, ' ').replace(/ {2,}/g, ' ')
  .replace(/\u0000([A-Za-z0-9+/=]+)\u0000/g, (_, b) => Buffer.from(b, 'base64').toString());

function fmtCounts(o: Record<string, number> | null | undefined): string {
  if (!o || !Object.keys(o).length) return 'none';
  return Object.entries(o).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ');
}

const pct = (a: number, b: number) => (b > 0 ? `${a >= b ? 'up' : 'down'} ${Math.round(Math.abs(a - b) / b * 100)} percent` : 'no data for the prior week');
const prettyPath = (p: string) => (p === '/' ? 'home page' : p.replace(/\/$/, '').replace(/^\/(resources|venues|vendor|local|category|guides|region)\//, '').replace(/[\/-]+/g, ' ').trim() || p);

export function buildDigest(d: any, run: Record<string, any>, date: string): string {
  const w = d.week || {};
  const se = (w.site_events || {}) as Record<string, number>;
  const sp = (w.site_events_prev || {}) as Record<string, number>;
  const ev = (k: string) => `${se[k] ?? 0}${sp[k] != null ? ` (prior ${sp[k]})` : ''}`;
  const L: string[] = [];
  L.push(`Colorado Elopement Guide, week ending ${date}`);
  L.push('');
  L.push('TRAFFIC');
  L.push(`Visitors ${w.visitors ?? 0} (prior ${w.visitors_prev ?? 0}, ${pct(w.visitors ?? 0, w.visitors_prev ?? 0)})`);
  L.push(`Pageviews ${w.pageviews ?? 0} (prior ${w.pageviews_prev ?? 0})`);
  const tp = (w.top_pages || []) as { path: string; n: number }[];
  L.push(`Top pages: ${tp.length ? tp.map(p => `${prettyPath(p.path)} ${p.n}`).join('; ') : 'none yet'}`);
  const src = (w.sources || []) as { source: string; n: number }[];
  L.push(`Sources (visits): ${src.length ? src.map(s => `${s.source} ${s.n}`).join(', ') : 'none yet'}`);
  L.push('');
  L.push('COUPLES');
  L.push(`Inquiries ${w.inquiries ?? 0}, delivered ${w.inquiries_delivered ?? 0}, replied ${w.inquiries_replied == null ? 'not tracked yet' : w.inquiries_replied}`);
  L.push(`Inquiry form submits ${ev('inquiry_submitted')}. Website clicks ${ev('vendor_website_click')}. Phone clicks ${ev('vendor_phone_click')}`);
  L.push(`Planner signups ${ev('planner_signup')}, new couple accounts ${w.couples ?? 0}, subscribers ${w.subscribers ?? 0}, nurture emails sent ${w.nurture_sent ?? 0}`);
  L.push('');
  L.push('VENDORS');
  L.push(`Claims ${w.claims ?? 0}, new vendor accounts ${w.vendor_accounts ?? 0} (verified total ${w.vendor_accounts_verified_total ?? 0}), vendor signups on site ${ev('vendor_signup')}`);
  L.push(`Live listings ${w.live_listings ?? 0}, ${w.released_7d ?? 0} went live this week, ${run.released ?? 0} released by this run`);
  L.push(`Featured ${w.featured ?? 0}, founding spots open ${w.founding_left ?? 10} of 10, waitlist ${w.waitlist ?? 0}, Featured checkout clicks ${ev('featured_checkout_click')}, pitches sent ${w.pitches_7d ?? 0}`);
  L.push('');
  L.push('OUTREACH');
  L.push(`Claim invites ${w.outreach_sent ?? 0}, follow ups ${w.followups_sent ?? 0}, contactable left ${w.contactable_left ?? 0}`);
  const lp = w.link_prospects || {};
  L.push(`Link prospects: ${lp.total ?? 0} total, ${lp.sent_7d ?? 0} pitched this week, ${lp.replied ?? 0} replied`);
  if (w.press) L.push(`Press contacts: ${w.press.total ?? 0} total, ${w.press.pitched ?? 0} pitched, ${w.press.replied ?? 0} replied`);
  L.push('');
  const c = run.canary as any;
  const failed = c && Array.isArray(c.checks) ? c.checks.filter((x: any) => !x.ok).map((x: any) => x.name) : [];
  L.push(`Canary: ${!c ? 'not run' : c.error ? `error, ${String(c.error).slice(0, 80)}` : c.pass ? `pass, ${c.checks?.length ?? 0} of ${c.checks?.length ?? 0} checks` : `FAILED on ${failed.join(', ')}`}`);
  L.push(`Maps refresh ${run.ratings_updated ?? 0} ratings, ${run.images_updated ?? 0} photos. Deploy ${run.deploy ? 'fired' : 'not fired'}. Pinterest ${run.pinterest || 'skipped'}`);
  L.push('');
  L.push('THIS WEEK');
  const todo: string[] = [];
  if (c && !c.pass) todo.push('Fix the canary first. A broken inquiry or checkout path costs more than anything else on this list.');
  if ((w.inquiries ?? 0) > 0 && w.inquiries_replied != null && w.inquiries_replied < w.inquiries) todo.push(`${w.inquiries - w.inquiries_replied} inquiries have no vendor reply yet. Nudge those vendors from the admin.`);
  if ((se.featured_checkout_click ?? 0) > (w.featured ?? 0)) todo.push(`${se.featured_checkout_click} Featured checkout clicks did not convert. Send a personal note from the Sales tab.`);
  if ((w.featured ?? 0) === 0 && (w.vendor_accounts_verified_total ?? 0) > 0 && (w.pitches_7d ?? 0) === 0) todo.push(`No Featured customers yet and no pitches this week. Open the Sales tab and send the founding offer to the ${Math.min(5, w.vendor_accounts_verified_total)} claimed vendors with the most views.`);
  if ((w.pageviews ?? 0) < 500) {
    const best = tp.find(p => p.path !== '/' && p.path !== '/thanks');
    todo.push(best ? `Traffic is still small. ${prettyPath(best.path)} leads; link to it from two related guides and pitch it to one link prospect.` : 'Traffic is still small. Push the newest guides to link prospects and Pinterest.');
  }
  if ((lp.sent_7d ?? 0) > 0 && (lp.replied ?? 0) === 0) todo.push('No link replies yet. The 10 day follow up goes out once; then move on.');
  if ((w.contactable_left ?? 0) < 25) todo.push(`Only ${w.contactable_left ?? 0} vendors are ready to invite. Run contact discovery or add supply.`);
  if ((w.claims ?? 0) > 0) todo.push(`${w.claims} new claims. Check each new account finished its profile and photos.`);
  todo.push('Check the admin Traffic tab for what moved.');
  todo.slice(0, 3).forEach((t, i) => L.push(`${i + 1}. ${t}`));
  L.push('');
  L.push(`Admin: ${SITE}/admin`);
  return dedash(L.join('\n'));
}

export const GET: APIRoute = async ({ request }) => {
  if (!cronAuthorized(request)) return json({ error: 'unauthorized' }, 401);
  const secret = authSecret();
  if (!secret) return json({ error: 'CEG_AUTH_SECRET missing' }, 500);
  const url = new URL(request.url);
  const dry = url.searchParams.get('dry') === '1';
  const releaseN = dry ? 0 : Math.max(0, Math.min(RELEASE_N, Number(url.searchParams.get('release') ?? RELEASE_N) || 0));
  const started = Date.now();
  const run: Record<string, any> = { ok: true, ran_at: new Date().toISOString(), dry };
  if (url.searchParams.get('only') === 'monthly_reports') {
    try { run.monthly_reports = await runMonthlyReports(secret, dry, started + 270_000); }
    catch (e) { run.monthly_reports = { error: String(e).slice(0, 300) }; run.ok = false; }
    run.ms = Date.now() - started;
    console.log('CRON weekly', JSON.stringify(run));
    return json(run);
  }

  if (url.searchParams.get('only') === 'canary') {
    try { run.canary = await runCanary(secret, dry); run.ok = !!(run.canary as any).pass; }
    catch (e) { run.canary = { error: String(e).slice(0, 300) }; run.ok = false; }
    run.ms = Date.now() - started;
    console.log('CRON weekly', JSON.stringify(run));
    return json(run);
  }

  if (url.searchParams.get('only') === 'digest') {
    try { run.canary = await runCanary(secret, dry); } catch (e) { run.canary = { error: String(e).slice(0, 300) }; }
    try {
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' });
      const text = buildDigest(await rpc<any>('ceg_cron_digest', { p_secret: secret }), run, date);
      run.digest_words = text.split(/\s+/).length;
      if (!dry) { const res = await sendMailResult(OWNER_EMAIL, `CEG weekly: ${date}`, text); run.digest_sent = res.ok; if (!res.ok) run.digest_error = res.error; }
      else run.digest_preview = text;
    } catch (e) { run.digest_error = String(e).slice(0, 300); run.ok = false; }
    run.ms = Date.now() - started;
    return json(run);
  }

  // 1. Release
  let released: Released[] = [];
  try {
    released = releaseN > 0 ? await rpc<Released[]>('ceg_cron_release', { p_secret: secret, p_n: releaseN }) : [];
    run.released = released.length;
    run.released_ids = released.map(v => v.id);
  } catch (e) { run.release_error = String(e).slice(0, 300); run.ok = false; }

  // 2. Maps refresh for released vendors
  const login = process.env.DATAFORSEO_LOGIN ?? import.meta.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD ?? import.meta.env.DATAFORSEO_PASSWORD;
  run.ratings_updated = 0; run.images_updated = 0; run.maps_unmatched = 0; run.maps_errors = 0;
  if (released.length && login && password) {
    const results = await mapLimit(released, 4, async (v) => {
      if (Date.now() - started > 200_000) return 'skipped_time';
      const hit = await mapsLookup(v, login, password);
      if (!hit) return 'unmatched';
      const out: string[] = [];
      const rating = hit.rating?.value, reviews = hit.rating?.votes_count;
      if (rating != null || reviews != null) {
        await rpc('ceg_cron_set_rating', { p_secret: secret, p_id: v.id, p_rating: rating ?? null, p_reviews: reviews ?? null });
        out.push('rating');
      }
      const src = bigPhoto(hit.main_image);
      if (src) {
        const stored = await ingestImage(v.slug, src);
        if (stored) { await rpc('ceg_cron_set_image', { p_secret: secret, p_id: v.id, p_url: stored }); out.push('image'); }
      }
      return out.join('+') || 'matched_no_data';
    });
    const detail: Record<string, string> = {};
    results.forEach((r, i) => {
      const id = String(released[i].id);
      if (r.status === 'rejected') { run.maps_errors++; detail[id] = 'error: ' + String(r.reason).slice(0, 120); return; }
      detail[id] = r.value;
      if (r.value === 'unmatched') run.maps_unmatched++;
      if (r.value.includes('rating')) run.ratings_updated++;
      if (r.value.includes('image')) run.images_updated++;
    });
    run.maps_detail = detail;
  } else if (released.length) run.maps_skipped = 'DATAFORSEO credentials missing';

  // 3. Deploy hook
  run.deploy = dry ? false : await fireDeployHook();
  // IndexNow: tell Bing and partners about every sitemap URL. Pages from this release go live after the
  // rebuild, so this mostly covers last week's additions; next week's run picks up today's.
  if (!dry) {
    try {
      const sm = await (await fetchWithTimeout(`${SITE}/sitemap-0.xml`, 15000)).text();
      const urlList = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).slice(0, 10000);
      const r = await fetchWithTimeout('https://api.indexnow.org/indexnow', 20000, {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: 'coloradoelopementguide.com', key: '3a4203094b53f1f173f0062193ed4b17',
          keyLocation: `${SITE}/3a4203094b53f1f173f0062193ed4b17.txt`, urlList })
      });
      run.indexnow = { status: r.status, urls: urlList.length };
    } catch (e) { run.indexnow = { error: String(e).slice(0, 200) }; }
  }

  // 7. Canary (runs before the digest so the Monday email reports it; its own owner alert on failure)
  try { run.canary = await runCanary(secret, dry); }
  catch (e) { run.canary = { error: String(e).slice(0, 300) }; }

  // 4. Owner digest (date written without dashes: "Oct 12, 2026")
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' });
  try {
    const digest = await rpc<any>('ceg_cron_digest', { p_secret: secret });
    const regionsSummary = Object.entries(released.reduce((acc: Record<string, number>, v) => { const k = v.sub_region || 'n/a'; acc[k] = (acc[k] || 0) + 1; return acc; }, {}))
      .map(([k, n]) => `${k.replace(DASHES, ' ')} ${n}`).join(', ');
    run.regions = regionsSummary;

    // 5. Pinterest (optional)
    const pToken = process.env.PINTEREST_ACCESS_TOKEN ?? import.meta.env.PINTEREST_ACCESS_TOKEN;
    const pBoard = process.env.PINTEREST_BOARD_ID ?? import.meta.env.PINTEREST_BOARD_ID;
    if (pToken && pBoard && !dry) {
      try {
        const targets = pinTargets();
        const idx = Number(await rpc<string | null>('ceg_cron_config_get', { p_secret: secret, p_key: 'pinterest_rotation' })) || 0;
        const made: string[] = []; const errs: string[] = [];
        for (let k = 0; k < 3; k++) {
          const t = targets[(idx + k) % targets.length];
          const r = await fetchWithTimeout('https://api.pinterest.com/v5/pins', 20000, {
            method: 'POST',
            headers: { Authorization: `Bearer ${pToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ board_id: pBoard, title: t.title.slice(0, 100), description: t.description, link: t.link, alt_text: t.title.slice(0, 500), media_source: { source_type: 'image_url', url: t.image } })
          });
          if (r.ok) made.push(t.link); else errs.push(`${t.link} ${r.status} ${(await r.text()).slice(0, 120)}`);
        }
        await rpc('ceg_cron_config_set', { p_secret: secret, p_key: 'pinterest_rotation', p_value: String((idx + 3) % targets.length) });
        run.pinterest = `${made.length} pins created${errs.length ? `, ${errs.length} failed` : ''}`;
        run.pinterest_detail = { made, errs };
      } catch (e) { run.pinterest = 'error'; run.pinterest_error = String(e).slice(0, 300); }
    } else run.pinterest = dry ? 'skipped (dry)' : 'skipped (no token)';

    const text = buildDigest(digest, run, date);
    run.digest_words = text.split(/\s+/).length;
    if (!dry) {
      const res = await sendMailResult(OWNER_EMAIL, `CEG weekly: ${date}`, text);
      run.digest_sent = res.ok; if (!res.ok) run.digest_error = res.error;
    } else run.digest_preview = text;
  } catch (e) { run.digest_error = String(e).slice(0, 300); run.ok = false; }

  // 6. Monthly vendor stats reports (additive; sends only on the first Monday, stops before the 300s limit)
  try { run.monthly_reports = await runMonthlyReports(secret, dry, started + 270_000); }
  catch (e) { run.monthly_reports = { error: String(e).slice(0, 300) }; }

  run.ms = Date.now() - started;
  console.log('CRON weekly', JSON.stringify(run));
  return json(run);
};
