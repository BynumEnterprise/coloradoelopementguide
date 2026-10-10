export const prerender = false;
import type { APIRoute } from 'astro';
import { json, rpc, authSecret } from '../../lib/cron';
import { sendMailResult, OWNER_EMAIL } from '../../lib/mail';

// "Join the waitlist" when all three Featured spots in a category and region are taken.
// Body: { slug, email } from a vendor page, or { token } from the vendor dashboard.
const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[A-Za-z]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ request }) => {
  let b: any = {};
  try { b = await request.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }
  if (String(b.company_site || '') !== '') return json({ ok: true });
  const slug = String(b.slug || '').slice(0, 120);
  const token = UUID_RE.test(String(b.token || '')) ? String(b.token) : null;
  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  if (!token && (!/^[a-z0-9-]{2,120}$/.test(slug) || !EMAIL_RE.test(email))) return json({ ok: false, error: 'Add a valid email address.' }, 400);
  let r: any;
  try {
    r = await rpc<any>('ceg_featured_waitlist_add', { p_secret: authSecret(), p_slug: slug || null, p_token: token, p_email: email || null, p_source: token ? 'dashboard' : 'vendor_page', p_note: null });
  } catch (e) { console.error('waitlist add failed', e); return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500); }
  if (!r?.ok) return json({ ok: false, error: 'We could not find that listing.' }, 404);
  if (r.new) {
    const v = r.vendor;
    await sendMailResult(OWNER_EMAIL, `[CEG] Featured waitlist: ${v.name}`,
      `${v.name} (${v.category}, ${v.sub_region}, ${v.status}) joined the Featured waitlist from the ${token ? 'dashboard' : 'vendor page'}. Contact: ${r.email || 'none given'}. Listing: https://coloradoelopementguide.com/vendor/${v.slug}`);
  }
  return json({ ok: true });
};

export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });
