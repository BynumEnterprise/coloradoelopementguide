export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret, fireDeployHook } from '../../lib/cron';
import { sendMailResult, OWNER_EMAIL } from '../../lib/mail';

// Stripe webhook: flips a vendor to Featured on payment and back to claimed when the subscription ends.
// Requires STRIPE_WEBHOOK_SECRET (signing secret of the endpoint in the Stripe dashboard). Without it the
// endpoint answers 503 and changes nothing.

const TOLERANCE_S = 300;

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verify(header: string | null, raw: string, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(',').map(p => p.trim().split('='));
  const t = parts.find(p => p[0] === 't')?.[1];
  const v1s = parts.filter(p => p[0] === 'v1').map(p => p[1]);
  if (!t || !v1s.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_S) return false;
  const expected = await hmacHex(secret, `${t}.${raw}`);
  return v1s.some(v => timingSafeEqual(v, expected));
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);

// Vendor attribution. The dashboard and vendor emails open the payment link with ?client_reference_id=<slug>
// (featuredLinkFor in src/lib/outreach.ts); Stripe copies it onto the Checkout Session. The slug wins over the
// customer email (a vendor often pays with a card email that is not their dashboard email), then email, then name.
// The slug is remembered per Stripe customer so renewals (invoice.paid) and cancellations resolve the same vendor.
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,190}$/;
const cleanSlug = (s: unknown): string | null => (typeof s === 'string' && SLUG_RE.test(s) ? s : null);
async function rpcWithSlug<T>(fn: string, args: Record<string, unknown>, slug: string | null): Promise<T> {
  if (!slug) return rpc<T>(fn, args);
  try { return await rpc<T>(fn, { ...args, p_slug: slug }); }
  catch (e) {
    // Until the p_slug versions of these functions are applied (A4 audit SQL) PostgREST answers 404 PGRST202 for
    // the extra argument. Retry with the old signature so a payment is never dropped.
    if (/PGRST202| 404: /.test(String(e))) return rpc<T>(fn, args);
    throw e;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET ?? import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) return json({ error: 'webhook not configured: STRIPE_WEBHOOK_SECRET missing' }, 503);
  const raw = await request.text();
  if (!(await verify(request.headers.get('stripe-signature'), raw, whSecret))) return json({ error: 'bad signature' }, 400);

  let event: any;
  try { event = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
  const type: string = event?.type || '';
  const obj: any = event?.data?.object || {};
  const secret = authSecret();
  const out: Record<string, unknown> = { received: type, id: event?.id };

  try {
    if (type === 'checkout.session.completed' || type === 'invoice.paid') {
      const email: string = (obj.customer_details?.email || obj.customer_email || '').toLowerCase();
      const name: string = obj.customer_details?.name || obj.customer_name || '';
      const customer = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
      let slug = cleanSlug(obj.client_reference_id);
      if (!slug && customer) slug = cleanSlug(await rpc<string | null>('ceg_cron_config_get', { p_secret: secret, p_key: `stripe_customer_slug:${customer}` }));
      out.slug = slug;
      let until: string | null = null;
      const periodEnd = obj.lines?.data?.find((l: any) => l?.period?.end)?.period?.end;
      if (periodEnd) until = new Date(Number(periodEnd) * 1000).toISOString().slice(0, 10);
      if (!until) until = addDays(new Date(), 35);
      // Slot cap: three Featured per category per region. A new Featured vendor in a full slot is waitlisted, not flipped.
      const guard = await rpcWithSlug<any>('ceg_cron_featured_guard', { p_secret: secret, p_email: email || null, p_name: name || null }, slug);
      if (guard?.full) {
        await rpc('ceg_featured_waitlist_add', { p_secret: secret, p_slug: guard.slug, p_token: null, p_email: email || null, p_source: 'stripe', p_note: `paid while cap full (${type})` });
        out.waitlisted = guard.vendor_id; out.email = email;
        await sendMailResult('transactional', OWNER_EMAIL, `[CEG] Featured cap full, refund or hold: ${name || email}`,
          `Stripe ${type} for ${email || 'unknown email'}${name ? ` (${name})` : ''} matched vendor ${guard.name} (id ${guard.vendor_id}), but all 3 Featured spots for ${guard.category} in ${guard.sub_region} are taken.\nThey were NOT flipped to Featured and are on the waitlist. Refund the payment in Stripe or hold it until a spot opens.`);
        return json(out);
      }
      const vendorId = await rpcWithSlug<number | null>('ceg_cron_set_featured', { p_secret: secret, p_email: email || null, p_name: name || null, p_until: until }, slug);
      out.vendor_id = vendorId; out.featured_until = until; out.email = email;
      // Remember the Stripe customer so a later subscription.deleted (which carries no email) can be resolved.
      if (customer && email) await rpc('ceg_cron_config_set', { p_secret: secret, p_key: `stripe_customer:${customer}`, p_value: email });
      if (customer && slug && vendorId) await rpc('ceg_cron_config_set', { p_secret: secret, p_key: `stripe_customer_slug:${customer}`, p_value: slug });
      if (vendorId) await fireDeployHook();
      await sendMailResult('transactional', OWNER_EMAIL, `[CEG] Featured ${vendorId ? 'activated' : 'payment with no vendor match'}: ${name || email}`,
        `Stripe ${type} for ${email || 'unknown email'}${name ? ` (${name})` : ''}${slug ? `, listing ${slug}` : ''}.\n${vendorId ? `Vendor id ${vendorId} is now featured until ${until}.` : 'No vendor matched this listing, email or name; set Featured by hand in the admin.'}`);
    } else if (type === 'customer.subscription.deleted') {
      const customer = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
      let email: string | null = null;
      if (customer) email = await rpc<string | null>('ceg_cron_config_get', { p_secret: secret, p_key: `stripe_customer:${customer}` });
      const slug = customer ? cleanSlug(await rpc<string | null>('ceg_cron_config_get', { p_secret: secret, p_key: `stripe_customer_slug:${customer}` })) : null;
      const name: string = obj.metadata?.vendor_name || '';
      const vendorId = email || name || slug ? await rpcWithSlug<number | null>('ceg_cron_unset_featured', { p_secret: secret, p_email: email, p_name: name || null }, slug) : null;
      out.vendor_id = vendorId; out.email = email; out.slug = slug;
      if (vendorId) await fireDeployHook();
      await sendMailResult('transactional', OWNER_EMAIL, `[CEG] Featured ended: ${email || customer || 'unknown customer'}`,
        `Stripe subscription ended for ${email || customer || 'an unknown customer'}.\n${vendorId ? `Vendor id ${vendorId} is back to a claimed listing.` : 'No vendor matched; check the admin and unset Featured by hand if needed.'}`);
    } else {
      out.ignored = true;
    }
  } catch (e) {
    console.error('stripe-webhook error', e);
    return json({ ...out, error: String(e).slice(0, 300) }, 500);
  }
  return json(out);
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
