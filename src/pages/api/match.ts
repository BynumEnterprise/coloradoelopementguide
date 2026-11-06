export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret } from '../../lib/cron';
import { sendMailResult, sendMailReplyTo, OWNER_EMAIL } from '../../lib/mail';
import { repliedUrl } from '../../lib/trust-mail';
import { renderMatchConfirm, type MatchVendor } from '../../lib/couple-mail';
import { inquiryVendorEmail, inquiryNoticeEmail, naturalCheck, regionName, type InquiryIn } from '../../lib/outreach';
import { EMAIL_RE, clean, looksLikeSpam, SUBMIT_ERRORS } from '../../lib/inquiry-rules';
import { REGIONS } from '../../lib/taxonomy';

// Multi vendor matcher (/match/, plan S4). One form reaches up to three vendors at once. ceg_match_vendors
// returns a ranked, deliverable candidate list per requested category; we pick one per category where
// possible (round robin by rank) and send each pick through ceg_inquiry_submit, so every existing rule applies:
// one note per vendor per day, five notes per email per day, the site hourly cap, and the delivery modes
// (claimed vendors get the full inquiry with Reply To the couple, unclaimed vendors get the claim notice
// without the couple's details, no address means the owner keeps it). The owner gets one notice for the
// batch and the couple gets ONE confirmation listing every vendor.

export const MATCH_CATEGORIES = ['photographers', 'venues', 'officiants', 'planners', 'florists', 'hair-makeup'];
export const BUDGET_BANDS: Record<string, { label: string; max: number | null }> = {
  'under-3000': { label: 'under $3,000', max: 3000 },
  '3000-6000': { label: '$3,000 to $6,000', max: 6000 },
  '6000-10000': { label: '$6,000 to $10,000', max: 10000 },
  '10000-plus': { label: '$10,000 plus', max: null },
  'not-sure': { label: 'not sure yet', max: null }
};
const MAX_TOTAL = 3;

type Candidate = { slug: string; name: string; category: string; req_category: string; status: string; sub_region: string; rank_in_category: number };

// Round robin across the requested categories by rank: c1#1, c2#1, c3#1, c1#2, c2#2 ...
function orderCandidates(rows: Candidate[], categories: string[]): Candidate[] {
  const byCat = new Map<string, Candidate[]>();
  for (const r of rows) { if (!byCat.has(r.req_category)) byCat.set(r.req_category, []); byCat.get(r.req_category)!.push(r); }
  const cats = categories.filter(c => byCat.has(c));
  const out: Candidate[] = []; const seen = new Set<string>();
  for (let i = 0; i < 6; i++) for (const c of cats) {
    const r = (byCat.get(c) || []).find(x => x.rank_in_category === i + 1);
    if (r && !seen.has(r.slug)) { seen.add(r.slug); out.push(r); }
  }
  return out;
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) body = await request.json();
    else body = Object.fromEntries((await request.formData()).entries());
  } catch { return json({ ok: false, error: 'Could not read the form.' }, 400); }

  // Honeypot: pretend it worked, store nothing.
  if (clean(body.company_site, 200) !== '') return json({ ok: true, sent: [], skipped: [] });
  const elapsed = Number(body.elapsed_ms || 0);
  if (!Number.isFinite(elapsed) || elapsed < 3000) return json({ ok: false, error: 'That was quick. Please read it over and send again.' }, 400);

  const names = clean(body.names, 120).replace(/\s+/g, ' ');
  const email = clean(body.email, 200).toLowerCase();
  const coupleMessage = clean(body.message, 2000);
  const dateRaw = clean(body.wedding_date, 10).toLowerCase();
  const guestsRaw = clean(body.guests, 6);
  const regionRaw = clean(body.region, 40).toLowerCase();
  const budgetRaw = clean(body.budget, 20).toLowerCase();
  const catsRaw = Array.isArray(body.categories) ? body.categories : String(body.categories ?? '').split(',');
  const categories = [...new Set(catsRaw.map(c => clean(c, 30).toLowerCase()).filter(c => MATCH_CATEGORIES.includes(c)))].slice(0, MATCH_CATEGORIES.length);

  if (names.length < 2) return json({ ok: false, error: 'Add your names.' }, 400);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Check your email address.' }, 400);
  if (coupleMessage.length < 20 || coupleMessage.length > 1200) return json({ ok: false, error: 'Your message should be between 20 and 1,200 characters.' }, 400);
  if (!categories.length) return json({ ok: false, error: 'Tick at least one kind of vendor.' }, 400);
  const region = regionRaw && regionRaw !== 'not-sure' ? regionRaw : null;
  if (region && (!(region in REGIONS) || region === 'other-colorado')) return json({ ok: false, error: 'Pick a region from the list.' }, 400);
  let weddingDate: string | null = null;
  if (dateRaw && dateRaw !== 'flexible') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) || isNaN(Date.parse(dateRaw))) return json({ ok: false, error: 'Check the wedding date.' }, 400);
    weddingDate = dateRaw;
  }
  let guests: number | null = null;
  if (guestsRaw) {
    guests = Number(guestsRaw.replace(/[^0-9]/g, ''));
    if (!Number.isInteger(guests) || guests < 1 || guests > 500) return json({ ok: false, error: 'Check the guest count.' }, 400);
  }
  const band = budgetRaw && budgetRaw !== 'not-sure' ? BUDGET_BANDS[budgetRaw] : null;
  if (budgetRaw && !(budgetRaw in BUDGET_BANDS)) return json({ ok: false, error: 'Pick a budget range from the list.' }, 400);

  // What each vendor reads: the couple's words, then the two facts the inquiry form has no field for.
  const context = [region ? `Region: ${regionName(region)}` : 'Region: not decided yet', weddingDate ? '' : 'Date: flexible', band ? `Budget: ${band.label}` : ''].filter(Boolean).join('\n');
  const message = `${coupleMessage}\n\n${context}`.slice(0, 1500);
  const spam = looksLikeSpam(coupleMessage, names);
  const secret = authSecret();

  let rows: Candidate[] = [];
  try {
    rows = await rpc<Candidate[]>('ceg_match_vendors', { p_secret: secret, p_region: region, p_categories: categories, p_budget_max: band?.max ?? null, p_limit: 3 });
  } catch (e) {
    console.error('match candidates failed', e);
    return json({ ok: false, error: 'Something went wrong on our side. Please try again in a minute.' }, 500);
  }
  const ordered = orderCandidates(Array.isArray(rows) ? rows : [], categories);
  if (!ordered.length) return json({ ok: false, error: 'We could not find vendors we can reach for that mix yet. Try another region or add a category.' }, 404);

  // Submit until three have gone out. Pass one takes one vendor per requested category (by rank); pass two
  // fills any open slots from the remaining candidates. A per vendor miss (already asked today) moves on
  // to the next candidate; a per couple or site limit stops the whole batch.
  type Sent = { id: number; mode: string; to: string | null; vendor: any; status: string; req: string };
  const sent: Sent[] = []; const skipped: { slug: string; reason: string }[] = []; const state = { stop: null as string | null };
  const tried = new Set<string>();
  const trySubmit = async (c: Candidate) => {
    tried.add(c.slug);
    let res: any;
    try {
      res = await rpc<any>('ceg_inquiry_submit', { p_secret: secret, p_slug: c.slug, p_names: names, p_email: email,
        p_wedding_date: weddingDate, p_guests: guests, p_message: message, p_spam: spam });
    } catch (e) { console.error('match submit failed', c.slug, e); skipped.push({ slug: c.slug, reason: 'not sent' }); return; }
    if (!res?.ok) {
      if (res?.error === 'email_daily' || res?.error === 'site_hourly') { state.stop = res.error; return; }
      skipped.push({ slug: c.slug, reason: res?.error === 'dup_vendor' ? 'already has your note today' : 'not available' });
      return;
    }
    sent.push({ id: res.id, mode: res.mode, to: res.to, vendor: res.vendor, status: res.status, req: c.req_category });
  };
  const covered = (cat: string) => sent.some(s => s.req === cat);
  for (const c of ordered) {
    if (sent.length >= MAX_TOTAL || state.stop) break;
    if (covered(c.req_category)) continue;
    await trySubmit(c);
  }
  for (const c of ordered) {
    if (sent.length >= MAX_TOTAL || state.stop) break;
    if (tried.has(c.slug)) continue;
    await trySubmit(c);
  }

  if (!sent.length) {
    if (state.stop) return json({ ok: false, error: SUBMIT_ERRORS[state.stop] }, 429);
    return json({ ok: false, error: skipped.every(s => s.reason === 'already has your note today') ? 'You already asked these vendors today. Give them a day or two to reply.' : 'Something went wrong. Please try again.' }, 429);
  }
  const vendorsOut = sent.map(s => ({ slug: s.vendor.slug, name: s.vendor.name, category: s.vendor.category, mode: s.mode === 'account' ? 'account' : 'notice' }));
  // Spam is stored with status spam and nobody is emailed; the couple sees the ordinary success state.
  if (spam || sent.every(s => s.status === 'spam')) return json({ ok: true, sent: vendorsOut, skipped, confirm: false });

  // Deliver to each vendor with the same rules as /api/inquiry.
  const lines: string[] = [];
  for (const s of sent) {
    const v = s.vendor;
    const q: InquiryIn = { slug: v.slug, vendorName: v.name, names, email, weddingDate, guests, message, sub_region: v.sub_region, category: v.category };
    let notified = false; let note = '';
    try {
      if (s.mode === 'account' && s.to) {
        const m = inquiryVendorEmail(q, repliedUrl(s.id));
        const r = await sendMailReplyTo(s.to, email, m.subject, m.text, m.html);
        notified = r.ok; note = r.ok ? `full inquiry emailed to account ${s.to}` : `account email failed (${r.error})`;
      } else if (s.mode === 'notice' && s.to) {
        const m = inquiryNoticeEmail(q);
        const r = await sendMailResult(s.to, m.subject, m.text, m.html);
        notified = r.ok; note = r.ok ? `claim notice emailed to ${s.to}` : `claim notice failed (${r.error})`;
      } else note = 'no deliverable vendor address, kept for the owner';
    } catch (e) { console.error('match delivery failed', e); note = `delivery error: ${String(e).slice(0, 200)}`; }
    try { await rpc('ceg_inquiry_mark', { p_secret: secret, p_id: s.id, p_notified: notified }); } catch (e) { console.error('inquiry mark failed', e); }
    lines.push(`Inquiry ${s.id} for ${v.name} (${v.status}): ${note}.`);
  }

  // Owner notice: one email for the batch. Couple text and names are allowed; only our wording is checked.
  try {
    const subj = `[CEG] Match: ${sent.length} ${sent.length === 1 ? 'inquiry' : 'inquiries'} from ${names}`;
    const text = `${names} <${email}> used /match/ (${region || 'region not decided'}, ${categories.join(', ')}${band ? `, ${band.label}` : ''}) and reached ${sent.length} ${sent.length === 1 ? 'vendor' : 'vendors'}.\n\n${lines.join('\n')}${skipped.length ? `\n\nSkipped: ${skipped.map(s => `${s.slug} (${s.reason})`).join(', ')}` : ''}${state.stop ? `\n\nStopped early: ${state.stop}` : ''}`;
    naturalCheck(text, 'owner match line', [names, email, region || '', ...lines, ...categories, band?.label || '', ...skipped.map(s => s.slug)]);
    await sendMailResult(OWNER_EMAIL, subj, text);
  } catch (e) { console.error('owner notice failed', e); }

  // Couple confirmation: one email for the batch. ceg_inquiry_confirm holds each inquiry's slot so the
  // same inquiry can never be confirmed twice; every slot is marked with the single send's result.
  let confirmed = false;
  try {
    const confirms: { id: number; v: MatchVendor }[] = [];
    for (const s of sent) {
      const c = await rpc<any>('ceg_inquiry_confirm', { p_secret: secret, p_id: s.id });
      if (c?.ok) confirms.push({ id: s.id, v: { slug: c.vendor.slug, name: c.vendor.name, category: c.vendor.category, mode: s.mode, website: c.vendor.website, phone: c.vendor.phone } });
    }
    if (confirms.length) {
      let ok = false;
      try {
        const m = renderMatchConfirm({ vendors: confirms.map(c => c.v), names, email, weddingDate, guests, region, budget: band?.label || null, message: coupleMessage });
        const r = await sendMailResult(email, m.subject, m.text, m.html);
        ok = r.ok; if (!r.ok) console.error('match confirm failed', r.status, r.error);
      } catch (e) { console.error('match confirm render/send error', e); }
      for (const c of confirms) { try { await rpc('ceg_inquiry_confirm_mark', { p_secret: secret, p_id: c.id, p_ok: ok }); } catch (e) { console.error('confirm mark failed', e); } }
      confirmed = ok;
    }
  } catch (e) { console.error('match confirm error', e); }

  return json({ ok: true, sent: vendorsOut, skipped, email, confirm: confirmed, stopped: state.stop });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
